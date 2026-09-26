import type { HeroData } from '../core/types';

/**
 * The city keeps score.
 *
 * A villain reaching 100 is not the only way to lose Vigilant. Every hero's
 * reputation is the city's opinion of that hero, and the roster's trust is the
 * city's opinion of all of them at once: the sum.
 *
 * Nothing new feeds it. It moves for the three reasons it has always moved for
 * — work answered (up or down), a cover blown, and crimes nobody showed up for
 * — and the floor is what makes those consequences cost something at the end.
 * So this is not a second resource and not a second decay. It is the existing
 * arithmetic given a losing condition, which is the piece §11 was missing.
 *
 * The sum is the point. A roster can bleed out while every individual hero
 * still looks acceptable, and a single spectacular hero cannot carry a city
 * that has stopped believing in the rest of them.
 */

/**
 * How much goodwill the city expects from each guardian it is relying on.
 * Negative, because goodwill is a debt: the city starts out willing to give
 * you the benefit of the doubt and only asks for it back after you fail.
 *
 * Scales with the roster, so a bigger roster has to earn its keep rather than
 * inheriting the credit for four people.
 */
export const TRUST_FLOOR_PER_HERO = -3;

/** Above the floor by this much and the city is still with you. */
export const TRUST_MARGIN = 6;

/** The one way to lose the city that is not a villain taking it. */
export const TRUST_LOST =
  'The city stopped believing in its guardians. Vigilant was stood down and nobody put anything in its place.';

export function rosterTrust(heroes: readonly HeroData[]): number {
  let total = 0;
  for (const hero of heroes) total += hero.reputation;
  return total;
}

export function trustFloor(rosterSize: number): number {
  return TRUST_FLOOR_PER_HERO * Math.max(1, rosterSize);
}

export type TrustVerdict = 'held' | 'slipping' | 'failing';

export function trustVerdict(trust: number, floor: number): TrustVerdict {
  if (trust < floor) return 'failing';
  if (trust < floor + TRUST_MARGIN) return 'slipping';
  return 'held';
}

/**
 * Meter geometry, kept with the rules so the UI cannot disagree with the model:
 * the bar is full at the margin above the floor, and empty once the floor is
 * gone. The number beside it is the honest one; the bar is only for reading
 * distance at a glance.
 */
export const TRUST_HEADROOM = 24;
export const TRUST_SLACK = 6;

export function trustFill(trust: number, floor: number): number {
  const span = TRUST_HEADROOM + TRUST_SLACK;
  const pct = ((trust - (floor - TRUST_SLACK)) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
