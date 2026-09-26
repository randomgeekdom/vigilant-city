import './rng-bridge';
import { startSeeded, stopSeeded } from './rng-bridge';
import { Random } from '../core/Random';
import { NameRoller, NameGenerator, Gender } from '@randomgeekdom/rollbard';

const civilianNames = NameRoller.Get();
const fantasyNames = NameGenerator.Get();

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

/** Villains get a stranger register than the city's respectable citizens. */
export function rollVillainName(rng: Random): string {
  return withRollbard(rng, () => fantasyNames.GenerateName(genderFor(rng.next() < 0.5 ? 'female' : 'male')));
}
