export type HeroStatus = 'active' | 'injured' | 'retired' | 'lost';
export type SecretKind = 'payroll' | 'substance' | 'informant' | 'faction' | 'imposter';
export type DistrictKind = 'financial' | 'industrial' | 'residential' | 'docks' | 'civic';
export type IncidentKind = 'crime' | 'disaster' | 'public' | 'supervillain' | 'mundane';
export type LogKind = 'turn' | 'hero' | 'city' | 'crisis' | 'press' | 'good' | 'bad' | 'secret';

export const DISTRICT_KINDS: readonly DistrictKind[] = [
  'financial',
  'industrial',
  'residential',
  'docks',
  'civic',
];

export const INCIDENT_KINDS: readonly IncidentKind[] = [
  'crime',
  'disaster',
  'public',
  'supervillain',
  'mundane',
];

export interface HeroData {
  id: string;
  name: string;
  callsign: string;
  archetype: string;
  age: number;
  condition: number;
  morale: number;
  fame: number;
  quirks: string[];
  status: HeroStatus;
  secret: SecretKind | null;
  secretPressure: number;
  missions: number;
  deployedTo: string | null;
}

export interface DistrictData {
  id: string;
  name: string;
  kind: DistrictKind;
  population: number;
  unrest: number;
  security: number;
}

export interface IncidentData {
  id: string;
  kind: IncidentKind;
  districtId: string;
  severity: number;
  turnsLeft: number;
  resolved: boolean;
  outcome: 'good' | 'bad' | '';
  resolution: string;
}

export interface Resources {
  funding: number;
  trust: number;
  intel: number;
}

export interface PendingChoice {
  label: string;
  hint: string;
  enabled: boolean;
  disabledReason: string;
}

export interface PendingEvent {
  id: string;
  title: string;
  text: string;
  choices: PendingChoice[];
}

export interface Stats {
  incidentsHandled: number;
  incidentsFailed: number;
  heroesLost: number;
  scandals: number;
}

export interface GameSnapshot {
  version: number;
  seed: number;
  rngState: number;
  turn: number;
  month: number;
  year: number;
  agencyName: string;
  cityName: string;
  directorName: string;
  resources: Resources;
  heroes: HeroData[];
  districts: DistrictData[];
  incidents: IncidentData[];
  chronicle: { turn: number; kind: string; text: string }[];
  flags: Record<string, number>;
  stats: Stats;
  pending: PendingEvent | null;
}

export const SNAPSHOT_VERSION = 1;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTHS_PRETTY = MONTHS.map((m) => m.slice(0, 3));
