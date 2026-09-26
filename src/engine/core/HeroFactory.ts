import type { HeroData, HeroStatus, SecretKind } from './types';
import { Random } from './Random';
import { rollCivilianName, type Sex } from '../data/rollbard';

export interface ChronicleEntry {
  turn: number;
  kind: string;
  text: string;
}

export class Chronicle {
  private _entries: ChronicleEntry[] = [];

  constructor(entries?: ChronicleEntry[]) {
    if (entries) this._entries = [...entries];
  }

  get entries(): readonly ChronicleEntry[] {
    return this._entries;
  }

  add(turn: number, kind: string, text: string): void {
    this._entries.push({ turn, kind, text });
    if (this._entries.length > 400) this._entries.shift();
  }

  recent(count: number): ChronicleEntry[] {
    return this._entries.slice(-count).reverse();
  }

  serialize(): ChronicleEntry[] {
    return [...this._entries];
  }
}

export const ARCHETYPES = ['brute', 'speedster', 'mystic', 'tech', 'psy', 'blade'] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const HERO_STATUSES: readonly HeroStatus[] = ['active', 'injured', 'retired', 'lost'];

export const HERO_CALLSIGNS = [
  'Nightjar', 'Ironhold', 'Cinder', 'Longwatch', 'Quicksilver', 'Rook', 'Saltgrave', 'Holloway',
  'Vermillion', 'Glasswing', 'Marrow', 'Tidebreak', 'Ashfall', 'Palewatch', 'Sunder', 'Thornhand',
  'Blue Hour', 'Gravewire', 'Hearth', 'Lantern', 'Mothlight', 'Nine Volt', 'Ossuary', 'Pilgrim',
  'Anvil', 'Brightwater', 'Coldfront', 'Duskline', 'Emberfall', 'Flintlock', 'Greywing', 'Hush',
] as const;

export const HERO_QUIRKS = [
  'Cannot be seen while indoors',
  'Insomniac',
  'Cannot say a lie',
  'Photographic memory for faces',
  'Badly homesick',
  'Talks to the building',
  'Mild pyrokinesis',
  'Faints at altitude',
  'Perfect pitch',
  'Cannot cross running water',
  'Reads too fast to follow instructions',
  'Smug about awards',
  'Night terrors',
  'Vegetarian, strictly',
  'Cannot be photographed',
  'Allergic to press',
] as const;

export const HERO_SECRETS: readonly SecretKind[] = ['payroll', 'substance', 'informant', 'faction', 'imposter'];

export function makeHero(
  rng: Random,
  index: number,
  opts: { archetype?: Archetype; status?: HeroStatus; takenCallsigns?: readonly string[] } = {},
): HeroData {
  const sex: Sex = rng.chance(0.5) ? 'female' : 'male';
  return {
    id: `hero_${index}`,
    name: rollCivilianName(rng, sex),
    callsign: uniqueCallsignFor(rng, opts.takenCallsigns ?? []),
    archetype: opts.archetype ?? rng.pick(ARCHETYPES),
    age: rng.int(19, 47),
    condition: rng.int(62, 96),
    morale: rng.int(52, 88),
    fame: rng.int(14, 62),
    quirks: rng.shuffle(HERO_QUIRKS).slice(0, rng.int(1, 3)),
    status: opts.status ?? 'active',
    secret: null,
    secretPressure: 0,
    missions: 0,
    deployedTo: null,
  };
}

export function uniqueCallsignFor(rng: Random, existing: readonly string[]): string {
  const used = new Set(existing);
  const free = HERO_CALLSIGNS.filter((c) => !used.has(c));
  return free.length > 0 ? rng.pick(free) : rng.pick(HERO_CALLSIGNS);
}
