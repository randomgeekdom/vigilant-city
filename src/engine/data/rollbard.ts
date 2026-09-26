import './rng-bridge';
import { startSeeded, stopSeeded } from './rng-bridge';
import { Random } from '../core/Random';
import { CityNameGenerator, NameRoller, NameGenerator, Gender } from '@randomgeekdom/rollbard';

const cityNames = CityNameGenerator.Get();
const civilianNames = NameRoller.Get();
const fantasyNames = NameGenerator.Get();

export type Sex = 'female' | 'male';

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

export function rollFantasyName(rng: Random, sex: Sex): string {
  return withRollbard(rng, () => fantasyNames.GenerateName(genderFor(sex)));
}

export function rollCityName(rng: Random): string {
  return withRollbard(rng, () => cityNames.Generate());
}

const AGENCY_FORMS = [
  'The {adj} {noun}',
  '{adj} {noun}',
  'The {noun} of {city}',
  '{city} {noun}',
] as const;

const AGENCY_ADJECTIVES = [
  'Vigilant', 'Night', 'Aegis', 'Sentinel', 'Ward', 'Lantern', 'Bastion', 'Halcyon', 'Watch', 'Iron',
] as const;

const AGENCY_NOUNS = [
  'Initiative', 'Agency', 'Authority', 'Bureau', 'Directorate', 'Guard', 'Corps', 'Commission', 'Covenant', 'Registry',
] as const;

export function rollAgencyName(rng: Random, city: string): string {
  const form = rng.pick(AGENCY_FORMS);
  const adj = rng.pick(AGENCY_ADJECTIVES);
  const noun = rng.pick(AGENCY_NOUNS);
  return form.replace('{adj}', adj).replace('{noun}', noun).replace('{city}', city);
}
