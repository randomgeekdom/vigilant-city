import type { Approach } from '../data/approaches';
import type { DifficultyLevel } from '../data/difficulty';
import type { District } from '../data/districts';
import type { IncidentType } from '../data/incidentTypes';
import type { PowerOrigin } from '../data/origins';
import type { PowerSet } from '../data/powersets';

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
}

export interface HeroData extends CharacterData {
  reputation: number;
  identity: SecretIdentityData;
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
