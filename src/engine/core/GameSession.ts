import { Random } from './Random';
import { Chronicle, makeHero } from './HeroFactory';
import type { Archetype } from './HeroFactory';
import { EventRegistry, type SessionApi } from './EventSystem';
import { ALL_EVENTS } from '../events';
import { rollAgencyName, rollCityName, rollCivilianName } from '../data/rollbard';
import {
  SNAPSHOT_VERSION,
  MONTHS,
  DISTRICT_KINDS,
  INCIDENT_KINDS,
  type DistrictData,
  type GameSnapshot,
  type HeroData,
  type IncidentData,
  type IncidentKind,
  type LogKind,
  type PendingEvent,
  type Resources,
  type SecretKind,
  type Stats,
} from './types';

const RESOURCE_BOUNDS = {
  funding: [0, 500],
  trust: [0, 100],
  intel: [0, 100],
} as const satisfies Record<keyof Resources, readonly [number, number]>;

const DISTRICT_PREFIX = [
  'Old', 'New', 'Lower', 'Upper', 'North', 'South', 'Iron', 'Salt', 'Black', 'Saint', 'Little', 'Great',
] as const;

const INCIDENT_TITLES: Record<IncidentKind, readonly string[]> = {
  crime: ['Armed robbery', 'Warehouse fire, suspicious origin', 'Shakedown on the docks', 'Armoured car job', 'Warehouse arson'],
  disaster: ['Chemical spill', 'Structural failure', 'Subway derailment', 'Gas main rupture', 'Bridge collapse'],
  public: ['Crowd surge at a rally', 'Hospital overload', 'Stampede outside a venue', 'Heatwave emergency', 'Blackout downtown'],
  supervillain: ['Costumed nuisance', 'Aerial threat over the docks', 'Rooftop pursuit', 'Sabotage at a substation', 'Bank siege'],
  mundane: ['Traffic pile-up', 'Lost child', 'Cat in a substation', 'Elevator entrapment', 'Flooded underpass'],
};

const ARCHETYPE_ADVANTAGE: Record<IncidentKind, readonly Archetype[]> = {
  crime: ['blade', 'speedster'],
  disaster: ['brute', 'tech'],
  public: ['mystic', 'psy'],
  supervillain: ['brute', 'blade'],
  mundane: ['speedster', 'tech'],
};

const SECRET_LABEL: Record<SecretKind, string> = {
  payroll: 'double paycheque',
  substance: 'substance problem',
  informant: 'history as an informant',
  faction: 'membership in a metapolitical cell',
  imposter: 'powers that are not entirely theirs',
};

export interface NewGameOptions {
  seed: number;
  agencyName: string;
  cityName: string;
  directorName: string;
  rosterSize: number;
}

export class GameSession implements SessionApi {
  readonly rng: Random;
  private readonly events: EventRegistry;
  private readonly chronicle: Chronicle;
  private snap: GameSnapshot;

  private constructor(snap: GameSnapshot) {
    this.snap = snap;
    this.rng = new Random(snap.seed);
    this.rng.state = snap.rngState;
    this.events = new EventRegistry(ALL_EVENTS);
    this.chronicle = new Chronicle(snap.chronicle);
  }

  static NewGame(opts: NewGameOptions): GameSession {
    const rng = new Random(opts.seed);
    const cityName = opts.cityName.trim() || rollCityName(rng);
    const agencyName = opts.agencyName.trim() || rollAgencyName(rng, cityName);
    const directorName = opts.directorName.trim() || rollCivilianName(rng, 'female');

    const districts: DistrictData[] = [];
    const usedNames = new Set<string>();
    const districtCount = rng.int(4, 5);
    for (let i = 0; i < districtCount; i++) {
      const base = rollCityName(rng);
      const name = usedNames.has(base) ? `${base} ${rng.pick(DISTRICT_PREFIX)}` : base;
      usedNames.add(name);
      districts.push({
        id: `district_${i + 1}`,
        name,
        kind: rng.pick(DISTRICT_KINDS),
        population: rng.int(40, 340) * 1000,
        unrest: rng.int(6, 24),
        security: rng.int(45, 80),
      });
    }

    const heroes: HeroData[] = [];
    for (let i = 0; i < opts.rosterSize; i++) {
      heroes.push(makeHero(rng, i + 1, { takenCallsigns: heroes.map((h) => h.callsign) }));
    }

    const snap: GameSnapshot = {
      version: SNAPSHOT_VERSION,
      seed: opts.seed,
      rngState: rng.state,
      turn: 0,
      month: 0,
      year: 2031,
      agencyName,
      cityName,
      directorName,
      resources: { funding: 120, trust: 58, intel: 40 },
      heroes,
      districts,
      incidents: [],
      chronicle: [],
      flags: {},
      stats: { incidentsHandled: 0, incidentsFailed: 0, heroesLost: 0, scandals: 0 },
      pending: null,
    };

    const session = new GameSession(snap);
    session.log(`${agencyName} opens its doors over ${cityName}.`, 'turn');
    session.log(`${heroes.length} names on the roster. First night on watch.`, 'hero');
    return session;
  }

  static Load(raw: string): GameSession {
    const parsed = JSON.parse(raw) as GameSnapshot;
    if (parsed.version !== SNAPSHOT_VERSION) {
      throw new Error(`save version ${parsed.version} not supported (expected ${SNAPSHOT_VERSION})`);
    }
    return new GameSession(parsed);
  }

  Save(): string {
    this.snap.rngState = this.rng.state;
    this.snap.chronicle = this.chronicle.serialize();
    return JSON.stringify(this.snap);
  }

  get pending(): PendingEvent | null {
    return this.snap.pending;
  }

  get isOver(): boolean {
    return this.snap.resources.trust <= 0 || this.deployable().length === 0;
  }

  get overReason(): string {
    if (this.snap.resources.trust <= 0) {
      return 'The city stopped believing in you. Funding is withdrawn and the agency is dissolved.';
    }
    if (this.deployable().length === 0) {
      return 'No one is left on the roster who can still answer a call.';
    }
    return '';
  }

  dateLabel(): string {
    return `${MONTHS[this.snap.month] ?? 'Month'} ${this.snap.year}`;
  }

  get agencyName(): string {
    return this.snap.agencyName;
  }

  get cityName(): string {
    return this.snap.cityName;
  }

  get directorName(): string {
    return this.snap.directorName;
  }

  logEntries(count: number) {
    return this.chronicle.recent(count);
  }

  log(text: string, kind: LogKind = 'turn'): void {
    this.chronicle.add(this.snap.turn, kind, text);
  }

  get turn(): number {
    return this.snap.turn;
  }

  stats(): Readonly<Stats> {
    return this.snap.stats;
  }

  flags(): Readonly<Record<string, number>> {
    return this.snap.flags;
  }

  res(): Readonly<Resources> {
    return this.snap.resources;
  }

  adjust(patch: Partial<Resources>): void {
    for (const key of Object.keys(patch) as (keyof Resources)[]) {
      const delta = patch[key];
      if (delta === undefined) continue;
      const bounds = RESOURCE_BOUNDS[key];
      this.snap.resources[key] = clamp(this.snap.resources[key] + delta, bounds[0], bounds[1]);
    }
  }

  heroes(): readonly HeroData[] {
    return this.snap.heroes;
  }

  heroById(id: string): HeroData | undefined {
    return this.snap.heroes.find((h) => h.id === id);
  }

  available(): HeroData[] {
    return this.snap.heroes.filter((h) => h.status === 'active' && h.deployedTo === null);
  }

  deployable(): HeroData[] {
    return this.snap.heroes.filter((h) => h.status === 'active');
  }

  districts(): readonly DistrictData[] {
    return this.snap.districts;
  }

  district(id: string): DistrictData | undefined {
    return this.snap.districts.find((d) => d.id === id);
  }

  adjustDistrict(id: string, patch: Partial<Omit<DistrictData, 'id'>>): void {
    const d = this.district(id);
    if (!d) return;
    Object.assign(d, patch);
    d.unrest = clamp(d.unrest, 0, 100);
    d.security = clamp(d.security, 0, 100);
  }

  worstDistrict(): DistrictData {
    let worst = this.snap.districts[0];
    for (const d of this.snap.districts) {
      if (!worst || d.unrest > worst.unrest) worst = d;
    }
    if (!worst) throw new Error('session has no districts');
    return worst;
  }

  incidents(): readonly IncidentData[] {
    return this.snap.incidents;
  }

  openIncidents(): IncidentData[] {
    return this.snap.incidents.filter((i) => !i.resolved);
  }

  setPending(p: PendingEvent | null): void {
    this.snap.pending = p;
  }

  flag(key: string): number {
    return this.snap.flags[key] ?? 0;
  }

  bumpFlag(key: string, amount: number): number {
    const next = (this.snap.flags[key] ?? 0) + amount;
    this.snap.flags[key] = next;
    return next;
  }

  stat<K extends keyof Stats>(key: K, amount: number): void {
    this.snap.stats[key] += amount;
  }

  setStatus(id: string, status: HeroData['status']): void {
    const hero = this.heroById(id);
    if (!hero) return;
    hero.status = status;
    if (status !== 'active') hero.deployedTo = null;
  }

  adjustHero(id: string, patch: Partial<Omit<HeroData, 'id'>>): void {
    const hero = this.heroById(id);
    if (!hero) return;
    Object.assign(hero, patch);
    hero.condition = clamp(hero.condition, 0, 100);
    hero.morale = clamp(hero.morale, 0, 100);
    hero.fame = clamp(hero.fame, 0, 100);
    hero.secretPressure = clamp(hero.secretPressure, 0, 100);
  }

  setSecret(id: string, secret: SecretKind | null): void {
    const hero = this.heroById(id);
    if (!hero) return;
    hero.secret = secret;
    hero.secretPressure = 0;
  }

  resolveIncident(id: string, resolution: string, good: boolean): void {
    const incident = this.snap.incidents.find((i) => i.id === id);
    if (!incident || incident.resolved) return;
    incident.resolved = true;
    incident.outcome = good ? 'good' : 'bad';
    incident.resolution = resolution;
    const district = this.district(incident.districtId);
    if (district) {
      if (good) {
        district.unrest = clamp(district.unrest - incident.severity * 1.5, 0, 100);
        district.security = clamp(district.security + 2, 0, 100);
      } else {
        district.unrest = clamp(district.unrest + incident.severity * 2, 0, 100);
        district.security = clamp(district.security - 3, 0, 100);
      }
    }
    this.stat(good ? 'incidentsHandled' : 'incidentsFailed', 1);
    this.log(resolution, good ? 'good' : 'bad');
  }

  canDeploy(heroId: string, incidentId: string): boolean {
    const hero = this.heroById(heroId);
    const incident = this.snap.incidents.find((i) => i.id === incidentId);
    if (!hero || !incident) return false;
    return hero.status === 'active' && hero.deployedTo === null && !incident.resolved;
  }

  teamOn(incidentId: string): HeroData[] {
    return this.snap.heroes.filter((h) => h.deployedTo === incidentId);
  }

  deploy(heroId: string, incidentId: string): boolean {
    if (!this.canDeploy(heroId, incidentId)) return false;
    const hero = this.heroById(heroId);
    const incident = this.snap.incidents.find((i) => i.id === incidentId);
    if (!hero || !incident) return false;
    hero.deployedTo = incident.id;
    hero.morale = clamp(hero.morale - 3, 0, 100);
    const district = this.district(incident.districtId);
    this.log(`${hero.callsign} deploys to ${district?.name ?? 'the field'} — ${incident.kind}.`, 'hero');
    return true;
  }

  recall(heroId: string): boolean {
    const hero = this.heroById(heroId);
    if (!hero || hero.deployedTo === null) return false;
    hero.deployedTo = null;
    hero.morale = clamp(hero.morale - 6, 0, 100);
    this.adjust({ trust: -1 });
    this.log(`${hero.callsign} pulled off the job. The press notices the empty street.`, 'hero');
    return true;
  }

  canRest(heroId: string): boolean {
    const hero = this.heroById(heroId);
    return !!hero && hero.status === 'active' && hero.deployedTo === null && this.snap.resources.funding >= 8;
  }

  rest(heroId: string): boolean {
    if (!this.canRest(heroId)) return false;
    const hero = this.heroById(heroId);
    if (!hero) return false;
    hero.status = 'injured';
    this.adjust({ funding: -8 });
    this.log(`${hero.callsign} is stood down for recovery.`, 'hero');
    return true;
  }

  canRecruit(): boolean {
    return this.snap.resources.funding >= 45 && this.snap.heroes.filter((h) => h.status === 'active').length < 6;
  }

  recruit(): boolean {
    if (!this.canRecruit()) return false;
    this.adjust({ funding: -45 });
    const hero = makeHero(this.rng, this.snap.heroes.length + 1, {
      takenCallsigns: this.snap.heroes.map((h) => h.callsign),
    });
    this.snap.heroes.push(hero);
    this.log(`${hero.callsign} signs on. Out of the paycheque, into the rain.`, 'hero');
    return true;
  }

  standDownStruggling(): boolean {
    for (const hero of this.snap.heroes) {
      if (hero.deployedTo !== null) continue;
      if (hero.status === 'active' && (hero.condition < 55 || hero.morale < 40)) {
        hero.status = 'injured';
        this.log(`${hero.callsign} takes a leave of absence.`, 'hero');
      }
    }
    return true;
  }

  revealSecret(heroId: string): boolean {
    const hero = this.heroById(heroId);
    if (!hero || !hero.secret) return false;
    const label = SECRET_LABEL[hero.secret];
    hero.secret = null;
    hero.secretPressure = 0;
    this.adjust({ trust: -9, funding: 4 });
    this.stat('scandals', 1);
    this.log(`${hero.callsign}'s ${label} runs in the papers. Trust falls.`, 'secret');
    return true;
  }

  Advance(): void {
    if (this.snap.pending || this.isOver) return;
    this.snap.turn += 1;
    this.snap.month += 1;
    if (this.snap.month >= 12) {
      this.snap.month = 0;
      this.snap.year += 1;
    }

    this.spawnIncidents();
    this.tickIncidents();
    this.economy();
    this.heroDrift();
    this.secrets();
    this.rollEvent();

    this.log(`— ${this.dateLabel()} —`, 'turn');
  }

  Choose(index: number): void {
    const pending = this.snap.pending;
    if (!pending) return;
    const spec = this.events.byId(pending.id);
    const choice = spec.choices[index];
    this.snap.pending = null;
    if (!choice) return;
    if (choice.when && !choice.when({ api: this })) return;
    choice.effect({ api: this });
  }

  private spawnIncidents(): void {
    const open = this.openIncidents().length;
    const rate = 0.8 + this.avgUnrest() / 50 - open * 0.14;
    const count = this.rng.chance(rate) ? (this.rng.chance(0.25) ? 2 : 1) : 0;
    for (let i = 0; i < count; i++) {
      const district = this.rng.pick(this.snap.districts);
      const kind = this.rng.pick(INCIDENT_KINDS);
      const severity = clamp(Math.round(this.rng.gauss(district.unrest / 12 + 1.5, 1.4)), 1, 10);
      const titles = INCIDENT_TITLES[kind];
      const id = `incident_${this.snap.turn}_${this.snap.incidents.length + 1}`;
      this.snap.incidents.push({
        id,
        kind,
        districtId: district.id,
        severity,
        turnsLeft: clamp(2 + Math.round(severity / 4), 1, 4),
        resolved: false,
        outcome: '',
        resolution: '',
      });
      this.log(
        `Call in ${district.name}: ${this.rng.pick(titles)} (severity ${severity}).`,
        severity >= 7 ? 'crisis' : 'city',
      );
    }
  }

  private tickIncidents(): void {
    for (const incident of this.snap.incidents) {
      if (incident.resolved) continue;
      incident.turnsLeft -= 1;
      const team = this.teamOn(incident.id);
      if (team.length > 0) {
        const wear = Math.max(1, Math.round((2 + incident.severity) / team.length));
        for (const hero of team) hero.condition = clamp(hero.condition - wear, 0, 100);
      }
      if (incident.turnsLeft > 0) continue;
      if (team.length > 0) this.resolveDeployed(incident, team);
      else this.expireIncident(incident);
    }
  }

  private resolveDeployed(incident: IncidentData, team: HeroData[]): void {
    const lead = [...team].sort((a, b) => b.condition - a.condition)[0];
    if (!lead) return;
    const advantage = ARCHETYPE_ADVANTAGE[incident.kind].includes(lead.archetype as Archetype) ? 0.12 : 0;
    const support = Math.min(0.18, (team.length - 1) * 0.07);
    const p = clamp(0.42 + (lead.condition - incident.severity * 5) / 150 + lead.morale / 200 + advantage + support, 0.15, 0.95);
    const where = this.district(incident.districtId)?.name ?? 'the district';
    for (const hero of team) hero.missions += 1;
    this.releaseIncident(incident.id);
    if (this.rng.chance(p)) {
      for (const hero of team) {
        const share = hero === lead ? 1.2 : 0.7;
        hero.fame = clamp(hero.fame + incident.severity * share, 0, 100);
        hero.morale = clamp(hero.morale + 4, 0, 100);
      }
      this.adjust({ trust: incident.severity * 0.45, funding: 3 });
      const who = team.length > 1 ? `${lead.callsign} and ${team.length - 1} more` : lead.callsign;
      this.resolveIncident(incident.id, `${who} closed it out in ${where}. The city saw.`, true);
    } else {
      for (const hero of team) {
        hero.condition = clamp(hero.condition - incident.severity, 0, 100);
        hero.morale = clamp(hero.morale - 5, 0, 100);
      }
      this.adjust({ trust: -incident.severity * 0.3, intel: 1 });
      const who = team.length > 1 ? `${lead.callsign}'s team` : lead.callsign;
      this.resolveIncident(
        incident.id,
        `${who} could not hold ${where}. It got worse before it got better.`,
        false,
      );
    }
    for (const hero of team) {
      if (hero.condition > 0) continue;
      this.setStatus(hero.id, 'lost');
      this.stat('heroesLost', 1);
      this.adjust({ trust: -12 });
      this.log(`${hero.callsign} is gone. You do not use that word in front of the press.`, 'bad');
    }
  }

  private releaseIncident(incidentId: string): void {
    for (const hero of this.snap.heroes) {
      if (hero.deployedTo === incidentId) hero.deployedTo = null;
    }
  }

  private expireIncident(incident: IncidentData): void {
    const where = this.district(incident.districtId)?.name ?? 'the district';
    this.adjustDistrict(incident.districtId, {
      unrest: (this.district(incident.districtId)?.unrest ?? 0) + incident.severity * 2.5,
      security: (this.district(incident.districtId)?.security ?? 0) - 4,
    });
    this.adjust({ trust: -incident.severity * 0.6 });
    this.resolveIncident(incident.id, `Nobody answered in ${where}. It is on every channel by morning.`, false);
  }

  private economy(): void {
    const active = this.snap.heroes.filter((h) => h.status === 'active').length;
    const payroll = active * 5 + this.snap.districts.length * 3;
    const open = this.openIncidents().length;
    const security = this.snap.districts.reduce((sum, d) => sum + d.security, 0);
    const income = 26 + security * 0.07;
    this.adjust({ funding: income - payroll - open * 2, intel: active > 0 ? 1 : 0 });

    const target = clamp(52 - this.avgUnrest() * 0.5 + this.avgFame() * 0.2 - open * 1.5, 0, 100);
    const trust = this.snap.resources.trust;
    this.adjust({ trust: (target - trust) * 0.08 });
  }

  private heroDrift(): void {
    for (const hero of this.snap.heroes) {
      if (hero.status === 'lost') continue;
      const resting = hero.deployedTo === null;
      const regen = hero.status === 'injured' ? 12 : resting ? 6 : 2;
      hero.condition = clamp(hero.condition + regen - (hero.age > 40 ? 1 : 0), 0, 100);
      const moraleTarget = clamp(46 + hero.fame * 0.25 - (resting ? 0 : 9), 0, 100);
      hero.morale = clamp(hero.morale + (moraleTarget - hero.morale) * 0.12, 0, 100);
      hero.fame = clamp(hero.fame + (resting ? 0.35 : -0.15), 0, 100);
    }
  }

  private secrets(): void {
    for (const hero of this.snap.heroes) {
      if (hero.status === 'lost') continue;
      if (!hero.secret) {
        if (this.rng.chance(0.05)) {
          const secret = this.rng.pick(['payroll', 'substance', 'informant', 'faction', 'imposter'] as const);
          hero.secret = secret;
          this.log(`A file on ${hero.callsign} just got thicker.`, 'secret');
        }
        continue;
      }
      hero.secretPressure = clamp(hero.secretPressure + 4 + hero.fame * 0.05, 0, 100);
    }
  }

  private rollEvent(): void {
    const spec = this.events.roll(this);
    if (!spec) return;
    if (spec.choices.length > 0) {
      this.snap.pending = this.events.buildPending(spec, this);
      return;
    }
    spec.effect?.({ api: this });
  }

  private avgUnrest(): number {
    if (this.snap.districts.length === 0) return 0;
    return this.snap.districts.reduce((s, d) => s + d.unrest, 0) / this.snap.districts.length;
  }

  private avgFame(): number {
    const active = this.snap.heroes.filter((h) => h.status !== 'lost');
    if (active.length === 0) return 0;
    return active.reduce((s, h) => s + h.fame, 0) / active.length;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
