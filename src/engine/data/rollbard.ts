import './rng-bridge';
import { startSeeded, stopSeeded } from './rng-bridge';
import { Random } from '../core/Random';
import { NameRoller, Gender } from '@randomgeekdom/rollbard';

const civilianNames = NameRoller.Get();

export type Sex = 'female' | 'male';

/**
 * Rollbard reads Math.random, so every call is routed through the session's
 * seeded stream. Without this, hero names would break save/load determinism.
 */
export function withRollbard<T>(rng: Random, fn: () => T): T {
  startSeeded(() => rng.next());
  try {
    return fn();
  } finally {
    stopSeeded();
  }
}

function genderFor(sex: Sex): Gender {
  return sex === 'female' ? Gender.Female : Gender.Male;
}

export function rollCivilianName(rng: Random, sex: Sex): string {
  return withRollbard(rng, () => {
    const first = civilianNames.GenerateFirstName(genderFor(sex));
    const last = civilianNames.GenerateLastName();
    return `${first} ${last}`;
  });
}

export function rollAnyCivilianName(rng: Random): string {
  return rollCivilianName(rng, rng.next() < 0.5 ? 'female' : 'male');
}

/** Villains are people from the same city as everyone else, so they roll from the same real-name pool. */
export function rollVillainName(rng: Random): string {
  return rollAnyCivilianName(rng);
}
