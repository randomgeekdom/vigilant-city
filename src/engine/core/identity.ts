import type { HeroData, IdentityEvent } from './types';
import type { Random } from './Random';

/**
 * Secret identity as mechanics.
 *
 * Every hero has a civilian life that resolution puts at risk. The cost of
 * being seen is not an abstract "scandal" number — it is a job, and it is
 * specific people who were relying on that hero being someone else.
 */

export interface ExposureInput {
  usedLethal: boolean;
  resolved: boolean;
  difficulty: DifficultyLevelLike;
  /** Hero was already bleeding out of secrecy. */
  secrecy: number;
}

type DifficultyLevelLike = 'easy' | 'average' | 'difficult' | 'backbreaking';

/** How much attention this particular night attracted. 0 means nobody noticed. */
export function exposurePressure(input: ExposureInput): number {
  if (input.usedLethal) return 45;
  if (!input.resolved) return 30;
  switch (input.difficulty) {
    case 'easy':
      return 8;
    case 'average':
      return 15;
    case 'difficult':
      return 25;
    case 'backbreaking':
      return 35;
  }
}

export function rollExposure(hero: HeroData, pressure: number, rng: Random): IdentityEvent | null {
  if (hero.identity.exposed || hero.identity.disclosed) return null;
  // Low secrecy means the mask was already thin, so the same attention lands harder.
  const fragility = (100 - hero.identity.secrecy) / 100;
  const chance = (pressure * (0.5 + fragility)) / 100;
  if (!rng.chance(chance)) {
    hero.identity.secrecy = Math.max(0, hero.identity.secrecy - Math.round(pressure / 3));
    return null;
  }
  return expose(hero, rng);
}

export function expose(hero: HeroData, rng: Random): IdentityEvent {
  hero.identity.exposed = true;
  hero.identity.secrecy = 0;
  hero.morale -= 20;
  hero.reputation -= 5;
  const job = hero.identity.civilianJob;
  return {
    heroId: hero.id,
    kind: 'exposed',
    detail:
      `${hero.alias} was photographed. ${hero.realName}, ${job}, is no longer a secret. ` +
      `Whoever was relying on ${hero.alias === hero.realName ? 'them' : 'that'} being someone else is not.`,
  };
}

/** Civilian harm. Damages the ties before it damages the cover. */
export function damageTies(hero: HeroData, rng: Random): IdentityEvent {
  const damage = rng.int(1, 2);
  hero.identity.tieDamage = Math.min(100, hero.identity.tieDamage + damage * 20);
  hero.morale -= 5;
  if (hero.identity.tieDamage >= 100) {
    hero.morale -= 20;
    return {
      heroId: hero.id,
      kind: 'tie-damaged',
      detail: `${hero.alias} broke something that mattered in a civilian life that no longer exists.`,
    };
  }
  return {
    heroId: hero.id,
    kind: 'tie-damaged',
    detail: `${hero.alias} put a civilian at risk: ${hero.identity.civilianTies.join('; ')}.`,
  };
}

/**
 * Going public on purpose. A large one-off hit, then a permanent legitimacy
 * bonus: a disclosed hero can never be blown, and is trusted for it.
 */
export function disclose(hero: HeroData): IdentityEvent {
  hero.identity.disclosed = true;
  hero.identity.exposed = false;
  hero.identity.secrecy = 100;
  hero.identity.tieDamage = 0;
  hero.reputation -= 15;
  hero.morale += 10;
  return {
    heroId: hero.id,
    kind: 'disclosed',
    detail: `${hero.alias} took off the mask on purpose. ${hero.realName} is public now. The city will judge them for a while, and then it will trust them.`,
  };
}

/** Some heroes simply refuse to keep going once the cover is gone. */
export function willStandDown(hero: HeroData, rng: Random): boolean {
  if (hero.identity.exposed && !hero.identity.disclosed) return rng.chance(0.35);
  if (hero.morale <= -30) return rng.chance(0.25);
  return false;
}
