import { Random } from './Random';
import { CharacterFactory, IncidentFactory } from './CharacterFactory';
import { APPROACHES, type Approach } from '../data/approaches';
import {
  activeBosses,
  BOSS_DEATH_TRUST_COST,
  BOSS_POWER_DEFS,
  BOSS_RETURN_INFLUENCE,
  BOSS_THRESHOLD,
  bossGrowth,
  bossResistance,
  bossSeedChance,
  MAX_ACTIVE_BOSSES,
} from '../data/bosses';
import {
  DEFAULT_THREAT,
  difficultyModifier,
  difficultyRoll,
  divertedGrowth,
  type DifficultyLevel,
  type ThreatLevel,
} from '../data/difficulty';
import { DISTRICT_LABELS, DISTRICTS } from '../data/districts';
import { INCIDENT_TYPE_DEFS } from '../data/incidentTypes';
import { ORIGIN_DEFS } from '../data/origins';
import { POWER_SET_DEFS } from '../data/powersets';
import { rosterTrust, TRUST_LOST, trustFloor as requiredTrust, trustMargin as marginFromFloor, trustVerdict, type TrustVerdict } from '../data/reputation';
import { CELL_DEFS } from '../data/cells';
import type { OrganizationData } from '../data/organizations';
import {
  HUNT_MULTIPLIER,
  INFLUENCE_ON_FAILURE,
  knockback,
  MAX_INFLUENCE,
  NEW_VILLAIN_CHANCE,
  tierForInfluence,
} from '../data/villains';
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
  /**
   * Which city to play. Optional only so the harness can start a run without
   * naming one; the UI always asks, because the point of the setting is that
   * the player picks it.
   */
  threat?: ThreatLevel;
  seed?: number;
}

export interface NewGameResult {
  session: GameSession;
  snapshot: CitySnapshot;
}

interface SessionState {
  turn: number;
  threat: ThreatLevel;
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
      threat: opts.threat ?? DEFAULT_THREAT,
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
      threat: snap.threat,
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

  /** Which city this run is in. Fixed at new game; the player chose it, not the dice. */
  get threat(): ThreatLevel {
    return this.state.threat;
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

  /** The city's opinion of the whole roster, summed. Derived, never stored. */
  get trust(): number {
    return rosterTrust(this.state.heroRoster);
  }

  /** What the city needs to keep believing in us. Rises with the roster it is relying on. */
  get trustFloor(): number {
    return requiredTrust(this.state.heroRoster.length, this.state.threat);
  }

  get trustState(): TrustVerdict {
    return trustVerdict(this.trust, this.trustFloor, this.state.heroRoster.length);
  }

  /** How far the city is from stopping believing in us. The number the floor is played against. */
  get trustMargin(): number {
    return marginFromFloor(this.trust, this.trustFloor);
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

    const collateral = this.collateral(player.id);
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

  /**
   * The prototype's "Patrol". It costs a full turn: every open incident ticks,
   * every unattended villain grows, and only then do you get the new work. Going
   * looking for trouble is a real decision with a real price.
   */
  patrol(): void {
    if (this.state.over) return;
    const player = this.playerHero;
    if (player) this.collateral(player.id);
    this.state.turn += 1;
    this.spawnIncidents(1, 2);
    this.cullBrokenHeroes();
    this.topUpRoster();
    this.checkTerminalState();
  }

  /**
   * Everything that happens because the player spent a turn on one thing:
   * other incidents age, unattended villains consolidate, and anyone who has
   * taken too much starts leaving.
   */
  private collateral(playerHeroId: string): CollateralResolution[] {
    const expired = this.tickRemaining(playerHeroId);
    this.tickBoard();
    return expired;
  }

  /**
   * Nobody in the background makes anyone worse off. A notable villain stops
   * waiting for the city to make work for them; a boss does not wait at all, and
   * anyone who got away from the last containment comes back before you have
   * finished the night.
   */
  private tickBoard(): void {
    this.returnContainedBosses();
    for (const villain of this.state.villains) {
      if (villain.status !== 'active') continue;
      const tier = tierForInfluence(villain.influence);
      if (tier.tier === 1) continue;
      if (this.rng.chance(bossSeedChance(villain))) {
        this.state.incidents.push(this.incidentFactory.createIncident(villain.id));
        this.note(`${villain.alias} is seeding trouble in ${DISTRICT_LABELS[this.rng.pick(DISTRICTS)]}.`);
      }
    }

    if (this.rng.chance(NEW_VILLAIN_CHANCE)) {
      this.introduceVillain();
    }
  }

  /**
   * A boss is not something you contain. They are back at the threshold with
   * another power on them, and every time it costs more to leave them there
   * than the last. This is why the non-lethal branch is a stall and not a
   * strategy: the turn you spent on it bought the roster nothing.
   */
  private returnContainedBosses(): void {
    for (const villain of this.state.villains) {
      if (villain.status !== 'escaped') continue;
      const power = this.characters.addPower(villain);
      villain.influence = BOSS_RETURN_INFLUENCE;
      villain.status = 'active';
      this.note(
        power === null
          ? `${villain.alias} was never holding, and there is nothing left to teach them.`
          : `${villain.alias} was never holding. They are back at ${BOSS_RETURN_INFLUENCE} and ` +
            `they have added ${POWER_SET_DEFS[power].displayName.toLowerCase()} to it.`,
      );
    }
  }

  private introduceVillain(): VillainData {
    const org = this.state.organizations.length > 0 ? this.rng.pick(this.state.organizations) : null;
    const villain = this.characters.createVillain(this.rng, org?.ideology ?? null);
    this.state.villains.push(villain);
    this.note(
      org
        ? `${villain.alias} has moved into the city, and ${org.name} is behind them.`
        : `${villain.alias} has moved into the city.`,
    );
    return villain;
  }

  /**
   * Stopping one crime is what lets another villain get stronger. Attention is
   * spent whether or not the work succeeded, so this runs on every resolution.
   * The price of inattention is the run's threat level; the cause of it is not
   * negotiable, which is the whole point.
   */
  private divertAttention(fromVillainId: string): void {
    const growth = divertedGrowth(this.state.threat);
    for (const villain of this.state.villains) {
      if (villain.status !== 'active' || villain.id === fromVillainId) continue;
      this.raiseInfluence(villain, growth + bossGrowth(villain));
    }
  }

  private raiseInfluence(villain: VillainData, delta: number): void {
    const before = tierForInfluence(villain.influence);
    villain.influence = Math.max(0, Math.min(MAX_INFLUENCE, villain.influence + delta));
    const after = tierForInfluence(villain.influence);
    if (after.tier !== before.tier) {
      if (after.tier > before.tier) {
        this.note(`${villain.alias} is now ${after.label}. ${after.effect}`);
      }
      if (after.tier >= 4) {
        this.state.over = true;
        this.state.overReason = `${villain.alias} is beyond stopping. Vigilant answers to them now.`;
        return;
      }
    }
    // Checked outside the tier change because a boss crosses 55 mid-band: one
    // diverted turn is enough and the tier never moves.
    this.growIntoBoss(villain);
  }

  /**
   * The only way a boss comes into existence. Gated on influence, and influence
   * only rises through diversion, so this is always the player's own unattended
   * work coming back — never a background tide.
   */
  private growIntoBoss(villain: VillainData): void {
    if (villain.status !== 'active' || villain.boss !== null) return;
    if (villain.influence < BOSS_THRESHOLD) return;
    if (activeBosses(this.state.villains).length >= MAX_ACTIVE_BOSSES) return;
    const power = this.characters.promoteToBoss(villain);
    this.note(
      `${villain.alias} is not a problem any more. ${BOSS_POWER_DEFS[power].tell}`,
    );
  }

  /**
   * Go after someone directly instead of waiting for their next crime.
   *
   * Without this, a villain who is closest to taking the city but has no open
   * incident is completely unreachable — the player watches their influence
   * climb and can do nothing. Hunting costs a turn like anything else, so the
   * pacing rule still holds and hunting is itself a choice about what to neglect.
   */
  huntVillain(villainId: string, first: Approach, second: Approach): ResolutionReport {
    if (this.state.over) throw new Error('run is over');
    if (first === second) throw new Error('must choose two different approaches');
    const villain = this.requireVillain(villainId);
    if (villain.status !== 'active') throw new Error(`${villain.alias} is no longer working`);
    const player = this.playerHero;
    if (!player) throw new Error('no player hero');

    const incident = this.synthesizeHunt(villain);
    const approaches: [Approach, Approach] = [first, second];
    const report = this.resolveIncidentFor(incident, player, approaches, true);
    this.state.resolvedIncidentIds.push(incident.id);
    this.state.turn += 1;
    report.collateral = this.collateral(player.id);

    this.state.alerts = this.buildAlerts(report);
    this.cullBrokenHeroes();
    this.topUpRoster();
    this.checkTerminalState();
    return report;
  }

  /** A confrontation with a named villain, dressed as an incident so it uses the same machinery. */
  private synthesizeHunt(villain: VillainData): IncidentData {
    const tier = tierForInfluence(villain.influence);
    // The closer they are to winning, the worse the confrontation is — but a
    // hunt has to stay winnable, or the player is punished for acting.
    const difficulty: DifficultyLevel =
      tier.tier >= 3 ? 'difficult' : tier.tier >= 2 ? 'average' : 'easy';
    const approachModifiers = {} as Record<Approach, number>;
    for (const a of APPROACHES) approachModifiers[a] = 0;
    return {
      id: this.allocateId('hunt'),
      type: 'murder',
      description: `A confrontation with ${villain.alias}, who has stopped waiting to be ambushed.`,
      district: this.rng.pick(DISTRICTS),
      timeToResolve: 1,
      difficulty,
      approachModifiers,
      villainId: villain.id,
    };
  }

  /**
   * Once someone is stopped, their outstanding work stops too. Without this the
   * board fills with incidents whose culprit no longer exists: they age, other
   * heroes burn turns on them, and resolving one applies no pressure to anyone.
   */
  private clearVillainWork(villainId: string): void {
    this.state.incidents = this.state.incidents.filter((i) => i.villainId !== villainId);
  }

  private requireVillain(villainId: string): VillainData {
    const villain = this.state.villains.find((v) => v.id === villainId);
    if (!villain) throw new Error(`no villain ${villainId}`);
    return villain;
  }

  private villainBehind(incident: IncidentData): VillainData | null {
    return this.state.villains.find((v) => v.id === incident.villainId && v.status === 'active') ?? null;
  }

  /**
   * Success knocks them back. Failure is publicity. Either way it was their turn.
   * A direct confrontation is worth more than cleaning up their latest crime,
   * because it took the whole night rather than one incident.
   */
  private applyVillainPressure(
    incident: IncidentData,
    resolved: boolean,
    usedLethal: boolean,
    isHunt: boolean,
  ): ResolutionReport['villain'] {
    const villain = this.villainBehind(incident);
    if (!villain) return null;

    if (!resolved) {
      this.raiseInfluence(villain, INFLUENCE_ON_FAILURE);
      this.divertAttention(villain.id);
      return null;
    }

    const knock = knockback(villain.backedBy) * (isHunt ? HUNT_MULTIPLIER : 1) * bossResistance(villain, isHunt);
    this.raiseInfluence(villain, knock);
    this.divertAttention(villain.id);
    if (villain.influence <= 0) return this.settleVillain(villain, usedLethal);
    // Still out there, and thinner than an hour ago. The report has to be able
    // to say so, or a pushback reads like a win.
    return { alias: villain.alias, outcome: 'pushed-back', boss: villain.boss !== null, influence: villain.influence };
  }

  /**
   * A villain at zero has an end, and for a boss it is a fork. Nobody with this
   * much influence is stopped by doing the job properly, so the player chooses
   * between the two available answers and both of them cost something.
   */
  private settleVillain(villain: VillainData, usedLethal: boolean): ResolutionReport['villain'] {
    const result = { alias: villain.alias, boss: villain.boss !== null, influence: villain.influence };

    if (villain.boss === null) {
      villain.status = usedLethal ? 'dead' : 'imprisoned';
      this.clearVillainWork(villain.id);
      return { ...result, outcome: usedLethal ? 'killed' : 'imprisoned' };
    }

    if (usedLethal) {
      villain.status = 'dead';
      this.clearVillainWork(villain.id);
      // The city knew that name. Executing somebody it knew is not a clean
      // night's work, and every guardian on the roster carries a piece of it.
      for (const hero of this.state.heroRoster) hero.reputation -= BOSS_DEATH_TRUST_COST;
      this.note(`${villain.alias} is dead, and the city watched us do it. The whole roster carries that.`);
      return { ...result, outcome: 'killed' };
    }

    // Their work deliberately stays on the board. They are back within the hour,
    // so the city is still dealing with what they did, and taking them off their
    // own incidents would make containment a reward: you would clear the board
    // and get the same villain back. This is what makes the fork a fork.
    villain.status = 'escaped';
    this.note(`${villain.alias} is contained for the night. That is not the same as being stopped.`);
    return { ...result, outcome: 'escaped' };
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
    isHunt = false,
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
      const result = this.applyVillainPressure(incident, true, usedLethal, isHunt);
      villain = result;
      const behind = this.villainBehind(incident);
      this.note(
        result === null
          ? `${hero.alias} stopped the ${INCIDENT_TYPE_DEFS[incident.type].label.toLowerCase()} in ${DISTRICT_LABELS[incident.district]}.`
          : result.outcome === 'killed'
            ? `${hero.alias} put ${result.alias} down for good.`
            : result.outcome === 'escaped'
              ? `${hero.alias} took ${result.alias} off the board. For tonight.`
              : behind
                ? `${hero.alias} pushed ${behind.alias} back during the ${INCIDENT_TYPE_DEFS[incident.type].label.toLowerCase()} in ${DISTRICT_LABELS[incident.district]}.`
                : `${hero.alias} stopped the ${INCIDENT_TYPE_DEFS[incident.type].label.toLowerCase()} in ${DISTRICT_LABELS[incident.district]}.`,
      );
    } else {
      this.applyVillainPressure(incident, false, usedLethal, isHunt);
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

  /**
   * The city only generates work it has a culprit for, so a villain is created
   * when there is nobody left to blame. Backed villains appear from the start,
   * which is what gives organisations a presence on the board.
   */
  private spawnIncidents(min: number, max: number): void {
    const count = this.rng.int(min, max);
    for (let i = 0; i < count; i += 1) {
      const active = this.state.villains.filter((v) => v.status === 'active');
      let villain = active.length > 0 ? this.rng.pick(active) : undefined;
      if (!villain) {
        const org = this.state.organizations.length > 0 ? this.rng.pick(this.state.organizations) : null;
        villain = this.characters.createVillain(this.rng, org?.ideology ?? null);
        this.state.villains.push(villain);
      }
      this.state.incidents.push(this.incidentFactory.createIncident(villain.id));
    }
  }

  private checkTerminalState(): void {
    // First cause wins. A villain can reach Imminent part-way through a
    // resolution that also finished the roster's trust, and the run has to be
    // reported as the loss it actually was rather than having its ending
    // overwritten by whichever check happens to run last.
    if (this.state.over) return;
    if (this.state.heroRoster.length === 0) {
      this.state.over = true;
      this.state.overReason = 'No hero remains. Vigilant falls.';
      return;
    }
    // The other way to lose the city: not one villain taking it, but the city
    // deciding it never wanted a guardian. The sum can go under while every
    // individual hero still looks like they are coping.
    if (this.trust < this.trustFloor) {
      this.state.over = true;
      this.state.overReason = TRUST_LOST;
      this.note(TRUST_LOST);
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
      threat: this.state.threat,
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
