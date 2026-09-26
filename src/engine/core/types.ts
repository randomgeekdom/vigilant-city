import type { Approach } from '../data/approaches';
import type { CellId } from '../data/cells';
import type { DifficultyLevel } from '../data/difficulty';
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

export type VillainStatus = 'active' | 'imprisoned' | 'dead';

export type VillainData = CharacterData & { status: VillainStatus };

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
}

export interface CitySnapshot {
  version: number;
  seed: number;
  rngState: number;
  /** Monotonic, snapshotted so ids stay unique and deterministic across loads. */
  idCounter: number;
  turn: number;
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
  villain: { alias: string; killed: boolean } | null;
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

export const SNAPSHOT_VERSION = 2;
