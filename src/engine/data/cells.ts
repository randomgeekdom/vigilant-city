import { POWER_ORIGINS, type PowerOrigin } from './origins';

/**
 * Metapolitical cells. Each is what a hero believes *because of* where their
 * power came from, so origin is the fault line: you can see a hero's politics
 * from their power sheet.
 */
export const CELL_IDS = ['exiles', 'ascendants', 'choir', 'registry'] as const;

export type CellId = (typeof CELL_IDS)[number];

export interface CellDef {
  label: string;
  creed: string;
  sees: string;
  /** The origin a hero must have to lean this way. */
  origin: PowerOrigin;
}

export const CELL_DEFS: Record<CellId, CellDef> = {
  exiles: {
    label: 'The Exiles',
    creed: 'Nobody from here belongs. Protect the stranger, even when it costs you.',
    sees: 'outsiders, and the danger of being one',
    origin: 'alien',
  },
  ascendants: {
    label: 'The Ascendants',
    creed: 'The next generation is owed the city. We are that generation.',
    sees: 'the next generation, inheritance',
    origin: 'genetic',
  },
  choir: {
    label: 'The Choir',
    creed: 'The old bargains still hold. The divine does not renegotiate.',
    sees: 'the sacred, and the old bargains',
    origin: 'supernatural',
  },
  registry: {
    label: 'The Registry',
    creed: 'Powers must be accounted for. The public deserves a list.',
    sees: 'the rational, and the accountable',
    origin: 'technological',
  },
};

export const ORIGIN_TO_CELL: Record<PowerOrigin, CellId> = {
  alien: 'exiles',
  genetic: 'ascendants',
  supernatural: 'choir',
  technological: 'registry',
};

export function cellForOrigin(origin: PowerOrigin): CellId {
  return ORIGIN_TO_CELL[origin];
}

/** The origin a cell expects to find in its members. */
export const CELL_ORIGIN: Record<CellId, PowerOrigin> = POWER_ORIGINS.reduce(
  (acc, o) => {
    acc[ORIGIN_TO_CELL[o]] = o;
    return acc;
  },
  {} as Record<CellId, PowerOrigin>,
);
