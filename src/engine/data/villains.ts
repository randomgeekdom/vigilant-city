import type { CellId } from './cells';

/**
 * Villains are not weather. They are the other board.
 *
 * The city is not decaying — nothing in the background makes anyone worse off.
 * A villain gets stronger for exactly one reason: **you were busy somewhere
 * else.** Attention is the only scarce thing in this game, and it has a price
 * everywhere it is not spent.
 *
 * That is the whole design. There is no passive growth and no rising tide, so
 * the equilibrium falls out of arithmetic rather than a difficulty slider:
 * each turn the villain you attend loses 35 and every villain you did not
 * gains 6, so the city is holdable at up to six of them at once. Seven is the
 * cliff. New villains keep arriving, so holding the line means periodically
 * choosing somebody to finish off — which is itself an act of neglect.
 */

/** How much attention costs everyone you did not spend it on, per turn. */
export const DIVERTED_GROWTH = 6;

/** Chance a new villain walks into the city on a given turn. */
export const NEW_VILLAIN_CHANCE = 0.18;

/** Success on a villain's own work knocks them back. */
export const INFLUENCE_ON_SUCCESS = -35;
/** Failure is publicity. They gain from you struggling in front of everyone. */
export const INFLUENCE_ON_FAILURE = 10;
/** A villain with backing behind them is worth more, so the same attention buys less. */
export const BACKED_PENALTY = 5;

/** Going after them in person beats catching them at the scene of their latest crime. */
export const HUNT_MULTIPLIER = 1.4;

export const MAX_INFLUENCE = 100;

export interface VillainTierDef {
  tier: number;
  label: string;
  /** At or above this influence. */
  threshold: number;
  /** What being at this tier means for the city. */
  effect: string;
}

export const VILLAIN_TIERS: readonly VillainTierDef[] = [
  {
    tier: 1,
    label: 'Nuisance',
    threshold: 0,
    effect: 'A problem the city copes with. Barely worth the name.',
  },
  {
    tier: 2,
    label: 'Notable',
    threshold: 40,
    effect: 'Seeding their own trouble. They no longer wait for the city to make work for them.',
  },
  {
    tier: 3,
    label: 'Severe',
    threshold: 70,
    effect: 'Their incidents arrive harder, and they have started noticing the roster by name.',
  },
  {
    tier: 4,
    label: 'Imminent',
    threshold: MAX_INFLUENCE,
    effect: 'There is no version of this where you keep the city.',
  },
];

export function tierForInfluence(influence: number): VillainTierDef {
  let current = VILLAIN_TIERS[0]!;
  for (const t of VILLAIN_TIERS) {
    if (influence >= t.threshold) current = t;
  }
  return current;
}

/** How far a success actually pushes a villain back. Backed villains are tougher. */
export function knockback(backedBy: CellId | null): number {
  return INFLUENCE_ON_SUCCESS - (backedBy ? BACKED_PENALTY : 0);
}
