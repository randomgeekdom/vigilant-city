/**
 * Two tables, four names each, and they are not the same thing.
 *
 * `DifficultyLevel` belongs to a single piece of work. It is the number a hero
 * rolls against to stop one incident, picked at random by `IncidentFactory`,
 * recorded on the incident and shown on the board so the player can see what
 * they are walking into. It has been the only difficulty in this game since the
 * port, and it is deliberately left alone.
 *
 * `ThreatLevel` belongs to the whole run and is chosen before the first night.
 * It never touches the dice. It moves exactly two numbers, and both of them are
 * about what the city asks of you rather than what the work is like:
 *
 *  - **What attention costs.** Every villain you did not attend gains
 *    `divertedGrowth` a turn. On Average that is 5 against a live knockback of 30,
 *    which is the arithmetic that holds the city steady at up to seven villains at
 *    once (§10.1) — seven is exactly break-even and eight is the cliff. Raise it and
 *    the same night of attention buys less.
 *  - **How much debt the city will carry.** The trust floor is an allowance of
 *    goodwill per guardian, and crimes nobody showed up for are very nearly the
 *    only thing that spends it (§11.1). A generous city forgives a long run of
 *    bad nights; an unforgiving one ends the run the first time nobody turns up.
 *
 * Read that second one carefully, because the numbers run the way they do for a
 * reason and the table below is not a mistake. The floor is negative: a hard
 * city does not have a *deeper* allowance, it has a **shallower** one, and
 * `trustFloorPerHero` climbs towards zero as the city gets harder. A run is lost
 * when trust goes under the floor, so more room below zero is more run, not
 * less. The playtest is what settled it: the first pass at this table ran the
 * floor the intuitive way round, and Easy died of lost confidence in twelve
 * turns while Average ran a hundred.
 *
 * A third axis was available and was left alone on purpose. Making the incidents
 * themselves harder would be a hit-point slider wearing a costume: it would not
 * change what the game asks the player to do, only how often the dice agreed.
 * Nobody reaches a better decision because their target number went from 10 to
 * 15.
 *
 * Note also what is *not* here. A harder city is not a city that decays — there
 * is still no tide and nothing in the background gets worse on its own. Every
 * point a villain gains is a point they gained because the player was busy
 * somewhere else. The setting changes what attention buys and how long the city
 * will put up with you, which are the only two things it was ever going to be
 * able to change without breaking the design.
 */

export const DIFFICULTY_LEVELS = ['easy', 'average', 'difficult', 'backbreaking'] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_DEFS: Record<DifficultyLevel, { label: string; roll: number }> = {
  easy: { label: 'Easy', roll: 5 },
  average: { label: 'Average', roll: 10 },
  difficult: { label: 'Difficult', roll: 15 },
  backbreaking: { label: 'Backbreaking', roll: 20 },
};

export function difficultyRoll(level: DifficultyLevel): number {
  return DIFFICULTY_DEFS[level].roll;
}

export function difficultyModifier(level: DifficultyLevel): number {
  return Math.floor(DIFFICULTY_DEFS[level].roll / 5);
}

export const THREAT_LEVELS = ['easy', 'average', 'difficult', 'backbreaking'] as const;

export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export interface ThreatDef {
  label: string;
  /** One line the player reads before committing a run to it. Numbers included: this is a deal. */
  blurb: string;
  /** What a turn of attention costs everyone it was not spent on. */
  divertedGrowth: number;
  /** How much debt the city will carry per guardian before it stops believing in them. */
  trustFloorPerHero: number;
}

export const THREAT_DEFS: Record<ThreatLevel, ThreatDef> = {
  easy: {
    label: 'Easy',
    blurb:
      'Patient, and your attention goes a long way. Unattended villains gain 4 a turn; the city carries 6 points of debt per guardian.',
    divertedGrowth: 4,
    trustFloorPerHero: -6,
  },
  average: {
    label: 'Average',
    blurb:
      'The city as it was always meant to be played. Unattended villains gain 5 a turn; the city carries 3 points of debt per guardian.',
    divertedGrowth: 5,
    trustFloorPerHero: -3,
  },
  difficult: {
    label: 'Difficult',
    blurb:
      'Attention buys less, and the city is quicker to give up on you. Unattended villains gain 6 a turn; the city carries 2 points of debt per guardian.',
    divertedGrowth: 6,
    trustFloorPerHero: -2,
  },
  backbreaking: {
    label: 'Backbreaking',
    blurb:
      'Nothing is spare and nothing is forgiven. Unattended villains gain 8 a turn; the city carries 1 point of debt per guardian.',
    divertedGrowth: 8,
    trustFloorPerHero: -1,
  },
};

export const DEFAULT_THREAT: ThreatLevel = 'average';

export function divertedGrowth(level: ThreatLevel): number {
  return THREAT_DEFS[level].divertedGrowth;
}

export function trustFloorPerHero(level: ThreatLevel): number {
  return THREAT_DEFS[level].trustFloorPerHero;
}
