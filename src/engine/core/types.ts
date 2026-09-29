import type { Approach } from '../data/approaches';
import type { BossPower } from '../data/bosses';
import type { CellId } from '../data/cells';
import type { DifficultyLevel, ThreatLevel } from '../data/difficulty';
import type { District } from '../data/districts';
import type { IncidentType } from '../data/incidentTypes';
import type { PowerOrigin } from '../data/origins';
import type { PowerSet } from '../data/powersets';
import type { OrganizationData } from '../data/organizations';

export interface PowerData {
  powerSet: PowerSet;
  origin: PowerOrigin;
}

export interface ManifestationData {
  name: string;
  approach: Approach;
  origin: PowerOrigin;
  powerSet: PowerSet;
  difficulty: DifficultyLevel;
}

export type VillainStatus = 'active' | 'imprisoned' | 'escaped' | 'dead';

/** How a resolution left a villain. One discriminant, not three booleans that can disagree. */
export type VillainOutcome = 'killed' | 'imprisoned' | 'escaped' | 'pushed-back';

export interface VillainData extends CharacterData {
  status: VillainStatus;
  /** 0-100. Grows every turn this villain is left unattended. The real clock. */
  influence: number;
  /** The cell, if any, standing behind them. They consolidate faster. */
  backedBy: CellId | null;
  /** The power that grew them into a boss, or null. Set by neglect, never at spawn. */
  boss: BossPower | null;
}

export interface CharacterData {
  id: string;
  realName: string;
  alias: string;
  powerLevel: number;
  powers: PowerData[];
  manifestations: ManifestationData[];
}

/** The Clark Kent problem, as mechanics. */
export interface SecretIdentityData {
  civilianJob: string;
  civilianTies: string[];
  /** 0 = fully exposed, 100 = mask is solid. */
  secrecy: number;
  exposed: boolean;
  /** The hero chose to go public. Permanent, and deliberately not the same as being caught. */
  disclosed: boolean;
  /** Civilian casualties or scandals. At 100, the civilian life is gone for good. */
  tieDamage: number;
}

export interface HeroPolitics {
  /** Derived from origin — a hero cannot choose this, only act on it. */
  leaning: CellId;
  /** -100..100. Positive = bought into the cell. Negative = at odds with it. */
  sympathy: number;
}

export interface HeroData extends CharacterData {
  reputation: number;
  morale: number;
  identity: SecretIdentityData;
  politics: HeroPolitics;
}

export interface IncidentData {
  id: string;
  type: IncidentType;
  description: string;
  district: District;
  timeToResolve: number;
  difficulty: DifficultyLevel;
  approachModifiers: Record<Approach, number>;
  /** Who is behind this. Attending it pushes them back; ignoring it feeds them. */
  villainId: string;
}

export interface CitySnapshot {
  version: number;
  seed: number;
  rngState: number;
  /** Monotonic, snapshotted so ids stay unique and deterministic across loads. */
  idCounter: number;
  turn: number;
  /**
   * Which city this run is in. Chosen once at new game and never re-rolled, so
   * it has to survive a load: a save that came back on a different threat level
   * would be a run the player did not agree to finish.
   */
  threat: ThreatLevel;
  playerHeroId: string;
  heroes: HeroData[];
  villains: VillainData[];
  incidents: IncidentData[];
  organizations: OrganizationData[];
  alerts: string[];
  history: string[];
  resolvedIncidentIds: string[];
  over: boolean;
  overReason: string | null;
}

export interface ResolutionReport {
  incidentId: string;
  incidentType: IncidentType;
  district: District;
  actorHeroId: string;
  approaches: [Approach, Approach];
  modifier: number;
  roll: number;
  target: number;
  resolved: boolean;
  levelled: boolean;
  reputationDelta: number;
  consequence: string | null;
  died: boolean;
  villain: { alias: string; outcome: VillainOutcome; boss: boolean; influence: number } | null;
  collateral: CollateralResolution[];
  /** Set when this resolution put a civilian life at risk or destroyed it. */
  identityEvent: IdentityEvent | null;
}

export interface IdentityEvent {
  heroId: string;
  kind: 'exposed' | 'tie-damaged' | 'disclosed';
  detail: string;
}

export interface CollateralResolution {
  incidentId: string;
  incidentType: IncidentType;
  district: District;
  heroId: string | null;
  resolved: boolean;
  roll: number;
  target: number;
  consequence: string | null;
}

/**
 * v5: a run picks how hard the city is before the first night, and that choice
 * scales the price of diverted attention and the trust floor, so it is part of
 * the save rather than a UI preference. v4 is the boss release; those files no
 * longer load, and there is still no migration between versions.
 */
export const SNAPSHOT_VERSION = 5;
