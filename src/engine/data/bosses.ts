import type { VillainData } from '../core/types';


/**
 * A villain that outgrew the job.
 *
 * Nobody authors these. A villain is procedurally named and procedurally weak,
 * and it earns a name worth remembering the only way anything in this game
 * does: it was left alone. **A boss is a bill for attention you did not spend.**
 * The gate is influence, and influence only ever rises through diversion, so
 * there is still no tide in the background and nothing gets worse on its own.
 * If you never let anybody slide, you will never meet one.
 *
 * The name is the one the name generator gave them on their first night. The
 * player remembers it because they watched that number climb for forty turns
 * while they were busy somewhere else, which is worth more than anything an
 * author could have picked for them.
 *
 * What a boss changes is cost, in both directions. They consolidate faster than
 * the board can afford, and attention does not come off them the way it comes
 * off everyone else. The extra power is not flavour: it is the *reason* for
 * both numbers, and it is what the player is reading when they work out who to
 * leave alone.
 *
 * The end is a fork, because nobody with this much influence is stopped by
 * doing the job properly. Kill them and they are gone for good, and the city
 * finds out that its guardians executed somebody it knew by name — the whole
 * roster pays for that, out of the only resource that ends runs. Contain them
 * and you have bought nothing: a boss does not stay contained, and they are
 * back before the night is out, one power heavier, growing faster than they did.
 * Permanent and expensive, or free and repeating.
 */

export const BOSS_POWERS = [
  'TimeManipulation',
  'Shapeshifting',
  'EnergyManipulation',
  'Invisibility',
  'Precognition',
  'Telekinesis',
  'SuperStrength',
] as const;

export type BossPower = (typeof BOSS_POWERS)[number];

export interface BossPowerDef {
  /** One line. What the player reads off them when deciding who to leave alone. */
  tell: string;
  /** Added to the run's diverted growth on every turn they are left unattended. */
  growth: number;
  /**
   * Multiplier on knockback for work you mop up at the scene. This is the number
   * that matters most and it is deliberately severe: cleaning up after a boss
   * should barely touch them, so that going and getting them is the only answer
   * rather than an optional extra.
   */
  resistance: number;
  /**
   * The same multiplier for a direct confrontation, and deliberately much
   * closer to 1. A hunt costs a whole night and is the player's one real tool
   * against escalation, so it has to stay an answer. If resistance applied here
   * at full strength, a boss would be a wall rather than a threat and focusing
   * would stop being the best strategy.
   */
  huntResistance: number;
}

export const BOSS_POWER_DEFS: Record<BossPower, BossPowerDef> = {
  TimeManipulation: {
    tell: 'They are always slightly ahead of you, and being ahead is the whole trick.',
    growth: 1,
    resistance: 0.5,
    huntResistance: 0.9,
  },
  Shapeshifting: {
    tell: 'Nobody has hit the same person twice.',
    growth: 1,
    resistance: 0.6,
    huntResistance: 0.85,
  },
  EnergyManipulation: {
    tell: 'They have stopped containing it.',
    growth: 1,
    resistance: 0.6,
    huntResistance: 0.85,
  },
  Invisibility: {
    tell: 'The work gets done and the city cannot say by whom.',
    growth: 1,
    resistance: 0.55,
    huntResistance: 0.9,
  },
  Precognition: {
    tell: 'They knew you were coming and had already chosen where to be.',
    growth: 1,
    resistance: 0.6,
    huntResistance: 0.85,
  },
  Telekinesis: {
    tell: 'They move the city out from under anyone who tries to hold them.',
    growth: 1,
    resistance: 0.65,
    huntResistance: 0.8,
  },
  SuperStrength: {
    tell: 'Nothing you have done to them has taken, and they would like you to keep trying.',
    growth: 1,
    resistance: 0.5,
    huntResistance: 0.95,
  },
};

/**
 * Influence at which a villain stops being a problem and becomes something you
 * have to go and get. Sits between Notable (40) and Severe (70), so a boss is
 * always a tier you can see coming rather than a surprise.
 */
export const BOSS_THRESHOLD = 55;

/**
 * How many at once. A run should have faces in it, not a bestiary, and a board
 * where everything has grown is no more readable than a board of numbers.
 */
export const MAX_ACTIVE_BOSSES = 2;

/**
 * Containment hands back the threat but not the position: they return below the
 * threshold that made them a boss, so the transition does not re-trigger. What
 * does not survive is their work — a contained boss's incidents stay on the
 * board, because the city is still dealing with them.
 *
 * Its one real worth is that it is the branch which does not cost the city's
 * standing, which is a genuine reason to take it when the roster cannot afford
 * the other one. It is not a way to win the same fight twice.
 *
 * Note the number is smaller than a hunt's knockback (1.4 x 35 x 0.8-0.95 =
 * 39.2-46.6), so in practice a returned boss is one hunt from zero again. The
 * comment used to claim the dent you put in survives, and it does not. TODO.
 */
export const BOSS_RETURN_INFLUENCE = 40;

/**
 * Chance a notable villain seeds their own work on a turn nobody attended to them.
 */
export const ORDINARY_SEED_CHANCE = 0.3;

/**
 * A boss seeds their own work more insistently than an ordinary notable
 * villain. Kept modest on purpose: every extra piece of work is another crime
 * that can go unattended, and unattended crimes are the whole trust clock, so a
 * large seeding bonus does not make a boss harder to fight, it makes the city
 * stop believing in the roster sooner.
 */
export const BOSS_SEED_CHANCE = 0.4;

/**
 * Executing somebody the city knew by name costs the whole roster standing, per
 * hero. It has to be a price rather than a formality, and it has to stay well
 * inside one night's worth of the other drain — three points of debt per hero is
 * the whole budget a run has, so this cannot be a second floor.
 */
export const BOSS_DEATH_TRUST_COST = 1;

/**
 * What one failed containment buys them. Bounded, because a boss that can be
 * contained over and over must not grow without limit — past the cap the
 * containments stop making them stronger and only the power list records them.
 */
export const BOSS_ESCAPE_GROWTH = 1;
export const MAX_ESCAPE_GROWTH = 2;

export function activeBosses(villains: readonly VillainData[]): VillainData[] {
  return villains.filter((v) => v.boss !== null && v.status === 'active');
}


/** Extra influence per unattended turn. Ordinary villains consolidate at the run's diverted growth alone. */
export function bossGrowth(villain: VillainData): number {
  if (villain.boss === null) return 0;
  const def = BOSS_POWER_DEFS[villain.boss];
  // One power to begin with and one for being a boss; every power after those is
  // one they took off a containment, and the powers array is the only record.
  const escapes = Math.min(MAX_ESCAPE_GROWTH, Math.max(0, villain.powers.length - 2));
  return def.growth + escapes * BOSS_ESCAPE_GROWTH;
}

/** Multiplier on knockback. 1 for an ordinary villain, whatever route you take. */
export function bossResistance(villain: VillainData, isHunt: boolean): number {
  if (villain.boss === null) return 1;
  const def = BOSS_POWER_DEFS[villain.boss];
  return isHunt ? def.huntResistance : def.resistance;
}

/** How often they seed work of their own, given they are past Nuisance. */
export function bossSeedChance(villain: VillainData): number {
  return villain.boss === null ? ORDINARY_SEED_CHANCE : BOSS_SEED_CHANCE;
}

/**
 * Boss powers this villain does not already hold. Empty once they have worked
 * through the whole set, which is the only thing standing between a long run and
 * a boss whose power list re-picks the same entry for ever. Callers treat empty
 * as "nothing left to give", not as an error: a boss with every power is a
 * legitimate endpoint, and repeating one of them would make the list lie about
 * how much they have escalated.
 */
export function availableBossPowers(villain: VillainData): readonly BossPower[] {
  return BOSS_POWERS.filter((p) => !villain.powers.some((x) => x.powerSet === p));
}


