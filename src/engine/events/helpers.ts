import type { EventContext } from '../core/EventSystem';
import type { HeroData } from '../core/types';

export function stableHero(ctx: EventContext, filter?: (h: HeroData) => boolean): HeroData | null {
  const pool = filter ? ctx.api.heroes().filter(filter) : [...ctx.api.heroes()];
  if (pool.length === 0) return null;
  return pool[ctx.api.turn % pool.length] ?? null;
}

export function nameOf(hero: HeroData | null): string {
  return hero ? hero.callsign : 'someone on the roster';
}

export function secretText(hero: HeroData | null): string {
  if (!hero?.secret) return 'a private matter';
  switch (hero.secret) {
    case 'payroll':
      return 'a second paycheque nobody signed off on';
    case 'substance':
      return 'a substance problem the clinic log quietly closed';
    case 'informant':
      return 'two years of talking to an investigator';
    case 'faction':
      return 'a subscription to a group that meets in a unit';
    case 'imposter':
      return 'a power that tests negative on every scanner the city owns';
  }
}
