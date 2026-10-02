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
 * back before the night is out, one power heavier, growing faster than they did
 * and measurably harder to shift for having been let go. Permanent and
 * expensive, or cheaper and repeating.
 *
 * The other half of that sentence is `bossBill`: a boss who is never attended
 * stops being a police problem and becomes a workload, and the longer they are
 * left the louder it gets. Everything below that punishes the player who turns
 * up; that one punishes the player who does not.
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
   * rather than an optional extra. Set by the power that grew them into a boss;
   * every power after it stacks on top, one step per escape.
   */
  resistance: number;
  /**
   * The same multiplier for a direct confrontation, and deliberately much
   * closer to 1. A hunt costs a whole night and is the player's one real tool
   * against escalation, so it has to stay an answer. If resistance applied here
   * at full strength, a boss would be a wall rather than a threat and focusing
   * would stop being the best strategy. Stacks as well, but far more gently,
   * because it is the only lever the player has here.
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
 * threshold that made them a boss, so the transition does not re-trigger, and
 * above anything one night of hunting can take off them, so it always takes
 * two. What does not survive is their work — a contained boss's incidents stay
 * on the board, because the city is still dealing with them.
 *
 * The number is chosen against the strongest hunt in the game rather than left
 * where the knockback fix happened to drop it. A hunt is
 * `1.4 x 30 x 0.8–0.95` = 33.6–39.9, so 40 left a returned boss one hunt from
 * zero at the top of that range and the non-lethal branch was free: two nights
 * to finish a boss, no standing spent, and nothing to show for it but a longer
 * power list. 45 is the smallest figure that survives the worst case — no single
 * night can finish them, whatever they happen to be carrying — and it is still
 * ten under the threshold, so they come back as the notable they were before
 * they were a problem at all.
 *
 * Its one real worth is unchanged: it is the branch which does not cost the
 * city's standing, which is a genuine reason to take it when the roster cannot
 * afford the other one. What it costs now is nights. It is not a way to win the
 * same fight twice.
 */
export const BOSS_RETURN_INFLUENCE = 45;

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
 * The bill for leaving a boss alone, and what it is paid in.
 *
 * Influence past the threshold buys a unit every `BOSS_BILL_STEP` points, to a
 * ceiling of `MAX_BILL_UNITS` — capped for the same reason `MAX_ESCAPE_GROWTH`
 * is: a boss nobody attends must not accelerate for ever either. Fifteen is the
 * span from a boss to a Severe one, so the units land where the tiers do rather
 * than at arbitrary points inside a band.
 *
 * Each unit then adds `BILL_SEEDING_STEP` to how often they seed their own work,
 * so a boss at the ceiling spreads it at 0.8 against an ordinary notable's 0.3.
 * A fifth of the base per unit is what it takes to double a neglected boss's
 * output without making one the loudest thing on the board.
 */
export const BOSS_BILL_STEP = 15;
export const MAX_BILL_UNITS = 2;
export const BILL_SEEDING_STEP = 0.2;

/**
 * Executing somebody the city knew by name costs the whole roster standing, per
 * hero. It has to be a price rather than a formality, and it has to stay well
 * inside one night's worth of the other drain — three points of debt per hero is
 * the whole budget a run has, so this cannot be a second floor.
 */
export const BOSS_DEATH_TRUST_COST = 1;

/**
 * What one failed containment buys them. Bounded, because a boss that can be
 * contained over and over must not grow without limit. The cap is on growth
 * only: past it the containments still cost them resistance, which is a
 * multiplier rather than a rate, so it can keep stepping without running away.
 */
export const BOSS_ESCAPE_GROWTH = 1;
export const MAX_ESCAPE_GROWTH = 2;

/**
 * What one failed containment costs them on knockback, by route. Steep at the
 * scene and gentle in a hunt, and the difference between the two numbers is the
 * whole point of them: by the time a boss has worked through the list, tidying
 * up after them is not a slower route to the same place, it is no route at all,
 * so the one thing that keeps working is the one the player already has to pay a
 * full night for. Gentleness on the hunt side is not leniency, it is the reason
 * a boss is a threat rather than a wall.
 */
export const BOSS_RESISTANCE_STEP = 0.9;
export const BOSS_HUNT_RESISTANCE_STEP = 0.97;

export function activeBosses(villains: readonly VillainData[]): VillainData[] {
  return villains.filter((v) => v.boss !== null && v.status === 'active');
}

/**
 * How many times this one has got away: one power to begin with and one for
 * being a boss, and every power after those is one it took off a containment.
 * Growth and resistance both read this, so the two halves of "harder every time
 * it escapes" cannot drift apart.
 */
export function bossEscapes(villain: VillainData): number {
  return Math.max(0, villain.powers.length - 2);
}

/** Extra influence per unattended turn. Ordinary villains consolidate at the run's diverted growth alone. */
export function bossGrowth(villain: VillainData): number {
  if (villain.boss === null) return 0;
  const def = BOSS_POWER_DEFS[villain.boss];
  return def.growth + Math.min(MAX_ESCAPE_GROWTH, bossEscapes(villain)) * BOSS_ESCAPE_GROWTH;
}

/**
 * Multiplier on knockback. 1 for an ordinary villain, whatever route you take.
 *
 * Reads the whole power list, not just the one that grew them into a boss. A
 * returned boss has to be measurably harder to move than the one that got away
 * last time, or the power list is decoration and so is the escalation record the
 * player is shown. The first power sets what they are and each one after it
 * takes a step out of both multipliers.
 */
export function bossResistance(villain: VillainData, isHunt: boolean): number {
  if (villain.boss === null) return 1;
  const def = BOSS_POWER_DEFS[villain.boss];
  const step = isHunt ? BOSS_HUNT_RESISTANCE_STEP : BOSS_RESISTANCE_STEP;
  return (isHunt ? def.huntResistance : def.resistance) * step ** bossEscapes(villain);
}

/**
 * What a boss has run up by being left alone, in units.
 *
 * The escalation above is charged to the player who *engages* a boss: it costs
 * the next hunt, and the next hunt is the player's own one tool against a boss.
 * It cannot punish neglect, because the attentive player is the one who pays it.
 * This is the other axis, and it is the one the design's own sentence asks for —
 * a boss is a bill for attention you did not spend.
 *
 * Influence past the threshold is the record of that neglect, so it is what the
 * bill reads. Nothing is stored and no turn has to be counted: a villain only
 * ever goes up by diversion, and an engaged boss is knocked back before the board
 * is ticked, so the bill falls the moment somebody goes and gets them. A run
 * that stops attending a boss sees the bill rise; a run that hunts one never
 * lets it leave zero.
 *
 * Zero at the threshold, which is deliberate. The city has just noticed this
 * person; nothing has been let run yet, and the bill is for what comes after.
 */
export function bossBill(villain: VillainData): number {
  if (villain.boss === null) return 0;
  const past = villain.influence - BOSS_THRESHOLD;
  if (past <= 0) return 0;
  return Math.min(MAX_BILL_UNITS, Math.floor(past / BOSS_BILL_STEP));
}

/**
 * How often they seed work of their own, given they are past Nuisance.
 *
 * The bill is paid in work rather than in standing, and that routing is the
 * point rather than a convenience. Seeding more is the one thing a neglected boss
 * can do that an ordinary villain cannot, it costs the player nothing directly,
 * and it lands on the existing trust clock through work nobody got to — an extra
 * crime expires into the same bleed as any other, so it cannot become a second
 * floor. It also cuts both ways honestly: more work on the board is more work a
 * focused player can get to, so the charge widens the gap between the strategies
 * instead of ending runs everywhere at once.
 *
 * Measured against the alternative — a direct trust charge for the same bill —
 * the direct charge buys six times the raw units and moves the strategy gap by
 * nothing, while flipping most aimless runs from conquest to trust. Work is the
 * channel that pays for neglect without collapsing the two clocks §11.1 rests
 * on.
 */
export function bossSeedChance(villain: VillainData): number {
  if (villain.boss === null) return ORDINARY_SEED_CHANCE;
  return BOSS_SEED_CHANCE + bossBill(villain) * BILL_SEEDING_STEP;
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


