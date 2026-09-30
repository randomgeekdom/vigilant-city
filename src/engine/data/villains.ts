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
 * the equilibrium falls out of arithmetic: each turn the villain you attend
 * loses 30 and every villain you did not gains 5, so the city is holdable at up
 * to seven of them at once — seven is exactly break-even — and eight is the cliff.
 * New villains keep arriving, so holding the line means periodically choosing
 * somebody to finish off — which is itself an act of neglect.
 *
 * The 30 is `INFLUENCE_ON_SUCCESS` less `BACKED_PENALTY`, and it is the number
 * in play rather than an edge case: every villain in a run arrives with an
 * organisation behind them, so the unbacked 35 is the base the rule is written
 * against and not a figure the player ever meets. The penalty is a deduction.
 * A backed villain is worth more, so the same attention buys less of them —
 * which is the whole rule, and the one that is easiest to write backwards.
 *
 * That 5 is the one number in here the player gets to choose, through the run's
 * threat level in `difficulty.ts`. What the setting moves is the *magnitude* of
 * inattention, never its cause: a harder city is not a city that decays, it is a
 * city where the same night of attention buys less. The claim above survives it
 * intact, and the equilibrium cliff moves with the number rather than going away.
 */

/** Chance a new villain walks into the city on a given turn. */
export const NEW_VILLAIN_CHANCE = 0.18;

/** Success on a villain's own work knocks them back. */
export const INFLUENCE_ON_SUCCESS = -35;
/** Failure is publicity. They gain from you struggling in front of everyone. */
export const INFLUENCE_ON_FAILURE = 10;
/** A villain with backing behind them is worth more, so the same attention buys less: 5 off the pushback. */
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
  return INFLUENCE_ON_SUCCESS + (backedBy ? BACKED_PENALTY : 0);
}
