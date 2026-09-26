import { Random } from './Random';
import { CharacterFactory, IncidentFactory } from './CharacterFactory';
import { APPROACHES, type Approach } from '../data/approaches';
import { difficultyModifier, difficultyRoll } from '../data/difficulty';
import { DISTRICT_LABELS } from '../data/districts';
import { INCIDENT_TYPE_DEFS } from '../data/incidentTypes';
import { ORIGIN_DEFS } from '../data/origins';
import { POWER_SET_DEFS } from '../data/powersets';
import { CELL_DEFS } from '../data/cells';
import type { OrganizationData } from '../data/organizations';
import {
  damageTies,
  disclose as discloseHero,
  exposurePressure,
  rollExposure,
  willStandDown,
} from './identity';
import {
  cellLabel,
  courtOrganization,
  createOrganizations,
  driftSympathy,
  fractureRisk,
  ideologyModifier,
  suppressOrganization,
  type SympathyShift,
} from './politics';
import {
  SNAPSHOT_VERSION,
  type CitySnapshot,
  type CollateralResolution,
  type HeroData,
  type IdentityEvent,
  type IncidentData,
  type ManifestationData,
  type PowerData,
  type ResolutionReport,
  type VillainData,
} from './types';

export interface NewGameOptions {
  realName: string;
  alias: string;
  powerSet: import('../data/powersets').PowerSet;
  origin: import('../data/origins').PowerOrigin;
  seed?: number;
}

export interface NewGameResult {
  session: GameSession;
  snapshot: CitySnapshot;
}

interface SessionState {
  turn: number;
  playerHeroId: string;
  heroRoster: HeroData[];
  villains: VillainData[];
  incidents: IncidentData[];
  organizations: OrganizationData[];
  alerts: string[];
  history: string[];
  resolvedIncidentIds: string[];
  over: boolean;
  overReason: string | null;
}

const HISTORY_LIMIT = 200;

/**
 * The whole game in one rule: you resolve exactly one incident per turn, and
 * resolving it ticks every other open incident's timer down by one. So every
 * personal action is also a step of the clock for everything you did not
 * choose. Nothing is free.
 */
export class GameSession {
  private readonly rng: Random;
  private readonly state: SessionState;
  private readonly seedValue: number;
  private idCounter: number;

  private constructor(state: SessionState, seed: number, rngState: number, idCounter: number) {
    this.state = state;
    this.seedValue = seed;
    this.rng = new Random(seed);
    this.rng.state = rngState;
    this.idCounter = idCounter;
  }

  static newGame(opts: NewGameOptions): NewGameResult {
    const seed = opts.seed ?? (Date.now() & 0x7fffffff);
    const rng = new Random(seed);
    const state: SessionState = {
      turn: 0,
      playerHeroId: '',
      heroRoster: [],
      villains: [],
      incidents: [],
      organizations: [],
      alerts: [],
      history: [],
      resolvedIncidentIds: [],
      over: false,
      overReason: null,
    };
    const session = new GameSession(state, seed, rng.state, 0);
    const player = session.characters.createHero(opts.realName, opts.alias, opts.powerSet, opts.origin);
    state.playerHeroId = player.id;
    state.heroRoster.push(player);
    state.organizations = createOrganizations(rng, (p) => session.allocateId(p), rng.int(2, 3));
    session.topUpRoster();
    session.spawnIncidents(2, 3);
    return { session, snapshot: session.snapshot() };
  }

  static fromSnapshot(snap: CitySnapshot): GameSession {
    if (snap.version !== SNAPSHOT_VERSION) {
      throw new Error(`save version ${snap.version} is not supported (expected ${SNAPSHOT_VERSION})`);
    }
    const state: SessionState = {
      turn: snap.turn,
      playerHeroId: snap.playerHeroId,
      heroRoster: structuredClone(snap.heroes),
      villains: structuredClone(snap.villains),
      incidents: structuredClone(snap.incidents),
      organizations: structuredClone(snap.organizations ?? []),
      alerts: snap.alerts.slice(),
      history: snap.history.slice(),
      resolvedIncidentIds: snap.resolvedIncidentIds.slice(),
      over: snap.over,
      overReason: snap.overReason,
    };
    return new GameSession(state, snap.seed, snap.rngState, snap.idCounter);
  }

  private allocateId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}_${this.idCounter.toString(36)}`;
  }

  /** Factories always wrap the session RNG, never a local one, or determinism breaks. */
  private get characters(): CharacterFactory {
    return new CharacterFactory(this.rng, (p) => this.allocateId(p));
  }

  private get incidentFactory(): IncidentFactory {
    return new IncidentFactory(this.rng, (p) => this.allocateId(p));
  }

  // ---------- reads ----------

  get playerHero(): HeroData | null {
    return this.state.heroRoster.find((h) => h.id === this.state.playerHeroId) ?? null;
  }

  get allHeroes(): readonly HeroData[] {
    return this.state.heroRoster;
  }

  get openIncidents(): readonly IncidentData[] {
    return this.state.incidents;
  }

  get villains(): readonly VillainData[] {
    return this.state.villains;
  }

  get turn(): number {
    return this.state.turn;
  }

  get isOver(): boolean {
    return this.state.over;
  }

  get overReason(): string | null {
    return this.state.overReason;
  }

  get alerts(): readonly string[] {
    return this.state.alerts;
  }

  get history(): readonly string[] {
    return this.state.history;
  }

  // ---------- the core action ----------

  /**
   * The player picks ONE incident and TWO of the five approaches. Everything
   * else is collateral: their timers tick, and anything hitting zero is
   * resolved by whoever is left standing.
   */
  resolvePlayerIncident(incidentId: string, first: Approach, second: Approach): ResolutionReport {
    if (this.state.over) throw new Error('run is over');
    if (first === second) throw new Error('must choose two different approaches');

    const incident = this.state.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error(`no open incident ${incidentId}`);
    const player = this.playerHero;
    if (!player) throw new Error('no player hero');

    const approaches: [Approach, Approach] = [first, second];
    const report = this.resolveIncidentFor(incident, player, approaches);

    this.state.incidents = this.state.incidents.filter((i) => i.id !== incidentId);
    this.state.resolvedIncidentIds.push(incidentId);
    this.state.turn += 1;

    const collateral = this.tickRemaining(player.id);
    report.collateral = collateral;

    this.state.alerts = this.buildAlerts(report);
    this.cullBrokenHeroes();
    this.topUpRoster();
    this.checkTerminalState();
    return report;
  }

  /**
   * Heroes quit. Being blown, or being ground down badly enough, means a hero
   * stops answering the phone. The player never quits — they inherit instead.
   */
  private cullBrokenHeroes(): void {
    for (const hero of [...this.state.heroRoster]) {
      if (hero.id === this.state.playerHeroId) continue;
      if (!willStandDown(hero, this.rng)) continue;
      this.state.heroRoster = this.state.heroRoster.filter((h) => h.id !== hero.id);
      this.note(
        hero.identity.exposed && !hero.identity.disclosed
          ? `${hero.alias} quit. There is no version of this where they can go back to being ${hero.realName}.`
          : `${hero.alias} quit. Nobody is holding them together any more.`,
      );
    }
  }

  /** The prototype's "Patrol": put fresh work on the board. */
  patrol(): void {
    if (this.state.over) return;
    this.spawnIncidents(1, 2);
  }

  // ---------- metapolitics and identity (player actions) ----------

  get organizations(): readonly OrganizationData[] {
    return this.state.organizations;
  }

  /**
   * Take the mask off on purpose. Costs reputation now, buys legitimacy forever,
   * and retires the whole secrecy problem for this hero.
   */
  disclose(heroId: string): string {
    const hero = this.requireHero(heroId);
    const event = discloseHero(hero);
    this.note(event.detail);
    return event.detail;
  }

  courtOrganization(orgId: string, heroId: string): string {
    const org = this.requireOrganization(orgId);
    const hero = this.requireHero(heroId);
    const shift = courtOrganization(org, hero, this.rng);
    const verb = org.ideology === hero.politics.leaning ? 'listened' : 'ignored';
    this.note(
      `${hero.alias} ${verb} to ${org.name}. ${CELL_DEFS[org.ideology].label} favour ` +
        `${shift ? (shift.delta > 0 ? 'rose' : 'fell') : 'held'}.`,
    );
    return shift ? `${cellLabel(hero.politics.leaning)} sympathy ${shift.delta > 0 ? '+' : ''}${shift.delta}.` : 'Nothing moved.';
  }

  suppressOrganization(orgId: string): string {
    const org = this.requireOrganization(orgId);
    const line = suppressOrganization(org, this.rng);
    this.note(line);
    return line;
  }

  private requireHero(heroId: string): HeroData {
    const hero = this.state.heroRoster.find((h) => h.id === heroId);
    if (!hero) throw new Error(`no hero ${heroId}`);
    return hero;
  }

  private requireOrganization(orgId: string): OrganizationData {
    const org = this.state.organizations.find((o) => o.id === orgId);
    if (!org) throw new Error(`no organisation ${orgId}`);
    return org;
  }

  // ---------- resolution ----------

  private resolveIncidentFor(
    incident: IncidentData,
    hero: HeroData,
    approaches: readonly Approach[],
  ): ResolutionReport {
    const target = difficultyRoll(incident.difficulty);
    const known = this.findManifestation(hero, incident, approaches);
    const usedLethal = approaches.includes('lethal');

    let modifier = incident.approachModifiers[approaches[0]!] + incident.approachModifiers[approaches[1]!];
    // Ideology warps the job: a sympathetic organisation on the scene helps,
    // an opposed one gets in the way but is easier to simply hit.
    modifier += ideologyModifier(this.state.organizations, hero, approaches[0]!);
    modifier += ideologyModifier(this.state.organizations, hero, approaches[1]!);
    let levelled = false;

    if (known) {
      // Proven capability: reliable.
      modifier += difficultyModifier(incident.difficulty);
    } else if (this.rng.int(1, 20) >= target) {
      // They have done this before, they just have not managed it as a hero yet.
      modifier += difficultyModifier(incident.difficulty);
      levelled = this.characters.grantManifestation(
        hero,
        this.rng.pick(approaches),
        hero.powers[0]?.powerSet ?? 'SuperStrength',
        hero.powers[0]?.origin ?? 'genetic',
        incident.difficulty,
      );
    } else {
      modifier -= difficultyModifier(incident.difficulty);
    }

    const roll = this.rng.int(1, 20);
    const resolved = roll + modifier >= target;
    const reputationDelta = resolved ? (target % 5) + 1 : -((target % 5) + 1);
    hero.reputation += reputationDelta;

    let consequence: string | null = null;
    let died = false;
    let villain: ResolutionReport['villain'] = null;
    let identityEvent: IdentityEvent | null = null;

    if (resolved) {
      const defeated = this.surfaceVillain();
      const killed = usedLethal;
      defeated.status = killed ? 'dead' : 'imprisoned';
      villain = { alias: defeated.alias, killed };
      this.note(
        `${hero.alias} ${killed ? 'put down' : 'stopped'} ${defeated.alias} during the ` +
          `${INCIDENT_TYPE_DEFS[incident.type].label.toLowerCase()} in ${DISTRICT_LABELS[incident.district]}.`,
      );
    } else {
      const result = this.applySevereConsequence(hero);
      consequence = result.message;
      died = result.died;
    }

    // Being seen is the price of the work. Lethal work is seen more than anything.
    const pressure = exposurePressure({ usedLethal, resolved, difficulty: incident.difficulty, secrecy: hero.identity.secrecy });
    if (!died) {
      identityEvent = rollExposure(hero, pressure, this.rng);
      if (identityEvent) this.note(identityEvent.detail);
      // Cells notice which of their people you keep putting in the grinder.
      this.driftPolitics(hero, resolved, usedLethal);
      if (this.rng.chance(0.08)) {
        const tie = damageTies(hero, this.rng);
        this.note(tie.detail);
      }
    }

    return {
      incidentId: incident.id,
      incidentType: incident.type,
      district: incident.district,
      actorHeroId: hero.id,
      approaches: [approaches[0]!, approaches[1]!],
      modifier,
      roll,
      target,
      resolved,
      levelled,
      reputationDelta,
      consequence,
      died,
      villain,
      collateral: [],
      identityEvent,
    };
  }

  /**
   * Cells recruit through conduct. A hero kept on jobs their cell approves of
   * drifts toward it; one used as a blunt instrument drifts away.
   */
  private driftPolitics(hero: HeroData, resolved: boolean, usedLethal: boolean): void {
    const shifts: SympathyShift[] = [];
    const approves = hero.politics.leaning === 'choir' ? !usedLethal : hero.politics.leaning === 'registry' ? !usedLethal : usedLethal;
    const delta = (resolved ? 1 : -1) * (approves ? 4 : -3);
    driftSympathy(hero, delta, 'drift', shifts);
    for (const s of shifts) {
      if (Math.abs(s.delta) >= 4) this.note(`${hero.alias} is drifting ${s.delta > 0 ? 'toward' : 'away from'} their politics.`);
    }
    if (fractureRisk(hero, this.rng)) {
      hero.morale -= 10;
      this.note(`${hero.alias} has stopped speaking for ${cellLabel(hero.politics.leaning)}.`);
    }
  }

  private findManifestation(
    hero: HeroData,
    incident: IncidentData,
    approaches: readonly Approach[],
  ): ManifestationData | null {
    const powerSet = hero.powers[0]?.powerSet;
    if (!powerSet) return null;
    return (
      hero.manifestations.find(
        (m) =>
          approaches.includes(m.approach) &&
          m.powerSet === powerSet &&
          m.difficulty === incident.difficulty,
      ) ?? null
    );
  }

  /**
   * The prototype's ladder: a failing hero first unlearns a manifestation, then
   * loses a power, then dies. Failure costs capability, not health.
   */
  private applySevereConsequence(hero: HeroData): { message: string; died: boolean } {
    if (hero.manifestations.length > 0) {
      const m = this.rng.pick(hero.manifestations);
      hero.manifestations = hero.manifestations.filter((x) => x !== m);
      return { message: `${hero.alias} can no longer pull off ${m.name}.`, died: false };
    }
    if (hero.powers.length > 0) {
      const p = this.rng.pick(hero.powers);
      hero.powers = hero.powers.filter((x) => x !== p);
      return {
        message: `${hero.alias} has lost ${ORIGIN_DEFS[p.origin].label.toLowerCase()} ${POWER_SET_DEFS[p.powerSet].displayName.toLowerCase()}.`,
        died: false,
      };
    }
    const wasPlayer = hero.id === this.state.playerHeroId;
    this.state.heroRoster = this.state.heroRoster.filter((h) => h.id !== hero.id);
    if (wasPlayer) this.inheritAnotherHero();
    return { message: `${hero.alias} was killed.`, died: true };
  }

  /**
   * Resolving the player's incident costs the world a turn: every other open
   * incident loses one tick, and anything expiring is auto-resolved by a single
   * free hero (nobody handles two in one tick).
   */
  private tickRemaining(playerHeroId: string): CollateralResolution[] {
    const out: CollateralResolution[] = [];
    const busy = new Set<string>([playerHeroId]);
    const expiring = [...this.state.incidents];

    for (const incident of expiring) {
      incident.timeToResolve -= 1;
      if (incident.timeToResolve > 0) continue;

      const free = this.state.heroRoster.filter((h) => !busy.has(h.id));
      const roll = this.rng.int(1, 100);
      const threshold = 100 - Math.min(this.state.heroRoster.length, 3);
      const chosen = free.length > 0 && roll < threshold ? this.rng.pick(free) : null;

      if (chosen) {
        busy.add(chosen.id);
        const approaches = this.rng.shuffle(APPROACHES).slice(0, 2) as [Approach, Approach];
        const report = this.resolveIncidentFor(incident, chosen, approaches);
        out.push({
          incidentId: incident.id,
          incidentType: incident.type,
          district: incident.district,
          heroId: chosen.id,
          resolved: report.resolved,
          roll: report.roll,
          target: report.target,
          consequence: report.consequence,
        });
        this.note(
          `${chosen.alias} answered the ${INCIDENT_TYPE_DEFS[incident.type].label.toLowerCase()} in ` +
            `${DISTRICT_LABELS[incident.district]} while you were busy.`,
        );
      } else {
        if (this.state.heroRoster.length < 4) {
          const relief = this.characters.createGeneratedHero();
          this.state.heroRoster.push(relief);
          this.note(`${relief.alias} came to Vigilant. The city needed the help.`);
        } else {
          for (const h of this.state.heroRoster) h.reputation -= 1;
        }
        out.push({
          incidentId: incident.id,
          incidentType: incident.type,
          district: incident.district,
          heroId: null,
          resolved: false,
          roll: 0,
          target: 0,
          consequence: 'Nobody answered. The whole city noticed.',
        });
      }

      this.state.incidents = this.state.incidents.filter((i) => i.id !== incident.id);
      this.state.resolvedIncidentIds.push(incident.id);
    }

    return out;
  }

  // ---------- roster ----------

  private surfaceVillain(): VillainData {
    const active = this.state.villains.find((v) => v.status === 'active');
    if (active) return active;
    const villain = this.characters.createVillain();
    this.state.villains.push(villain);
    return villain;
  }

  private topUpRoster(): void {
    while (this.state.heroRoster.length < 3) {
      this.state.heroRoster.push(this.characters.createGeneratedHero());
    }
  }

  private inheritAnotherHero(): void {
    const heir = this.state.heroRoster[0];
    if (!heir) {
      this.state.over = true;
      this.state.overReason = 'Your hero died with no one left to inherit. Vigilant falls.';
      return;
    }
    this.state.playerHeroId = heir.id;
    this.note(`The city has nobody else. You are now ${heir.alias}.`);
  }

  private spawnIncidents(min: number, max: number): void {
    const count = this.rng.int(min, max);
    for (let i = 0; i < count; i += 1) {
      this.state.incidents.push(this.incidentFactory.createIncident());
    }
  }

  private checkTerminalState(): void {
    if (this.state.heroRoster.length === 0) {
      this.state.over = true;
      this.state.overReason = 'No hero remains. Vigilant falls.';
    }
  }

  private buildAlerts(report: ResolutionReport): string[] {
    const lines: string[] = [];
    const who = this.state.heroRoster.find((h) => h.id === report.actorHeroId)?.alias ?? 'Your hero';
    lines.push(
      report.resolved
        ? `${who} succeeded.`
        : `${who} failed. ${report.consequence ?? ''}`.trim(),
    );
    for (const c of report.collateral) {
      const hero = c.heroId ? this.state.heroRoster.find((h) => h.id === c.heroId) : null;
      lines.push(
        hero
          ? `${hero.alias} ${c.resolved ? 'handled' : 'struggled with'} the ${INCIDENT_TYPE_DEFS[c.incidentType].label.toLowerCase()}.`
          : `The ${INCIDENT_TYPE_DEFS[c.incidentType].label.toLowerCase()} went unattended.`,
      );
    }
    return lines;
  }

  private note(line: string): void {
    this.state.history.unshift(line);
    if (this.state.history.length > HISTORY_LIMIT) this.state.history.length = HISTORY_LIMIT;
  }

  // ---------- persistence ----------

  snapshot(): CitySnapshot {
    return {
      version: SNAPSHOT_VERSION,
      seed: this.seedValue,
      rngState: this.rng.state,
      idCounter: this.idCounter,
      turn: this.state.turn,
      playerHeroId: this.state.playerHeroId,
      heroes: structuredClone(this.state.heroRoster),
      villains: structuredClone(this.state.villains),
      incidents: structuredClone(this.state.incidents),
      organizations: structuredClone(this.state.organizations),
      alerts: this.state.alerts.slice(),
      history: this.state.history.slice(),
      resolvedIncidentIds: this.state.resolvedIncidentIds.slice(),
      over: this.state.over,
      overReason: this.state.overReason,
    };
  }
}

export type { PowerData };
