import type { Random } from './Random';
import { CIVILIAN_JOBS, CIVILIAN_TIES } from '../data/civilian';
import { POWER_ORIGINS, type PowerOrigin } from '../data/origins';
import { POWER_SETS, makeAlias, POWER_SET_DEFS, type PowerSet } from '../data/powersets';
import { APPROACH_DEFS, APPROACHES, type Approach } from '../data/approaches';
import { DIFFICULTY_LEVELS, DIFFICULTY_DEFS, type DifficultyLevel } from '../data/difficulty';
import { DISTRICT_LABELS, DISTRICTS } from '../data/districts';
import { INCIDENT_TYPE_DEFS, INCIDENT_TYPES } from '../data/incidentTypes';
import { rollAnyCivilianName, rollVillainName } from '../data/rollbard';
import type {
  HeroData,
  IncidentData,
  ManifestationData,
  SecretIdentityData,
  VillainData,
} from './types';

const FIRST_NAMES = [
  'Marcus', 'Ines', 'Tobias', 'Yuki', 'Rashid', 'Delphine', 'Amos', 'Priya', 'Casimir', 'Noor',
  'Everett', 'Saoirse', 'Dmitri', 'Amara', 'Lars', 'Beatriz', 'Oyelaran', 'Sunniva', 'Kai', 'Fenna',
  'Idris', 'Mireille', 'Zoltan', 'Nadia', 'Emeka', 'Solveig', 'Rafael', 'Thandi', 'Aurelio', 'Marek',
] as const;

const LAST_NAMES = [
  'Okonkwo', 'Vasquez', 'Lindqvist', 'Nakamura', 'Bell', 'Ferreira', 'Halvorsen', 'Duarte',
  'Kowalczyk', 'Amari', 'Brandt', 'Oyelowo', 'Petrov', 'Sandoval', 'Whitlock', 'Rahimi',
  'Delacroix', 'Bergstrom', 'Castellanos', 'Novak', 'Ashworth', 'Farkas', 'Diarra', 'Mbeki',
] as const;

/** Fallback register used when the seeded rollbard bridge is unavailable. */
function fallbackName(rng: Random): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

/** Rollbard reaches into Math.random, so a failure there must not kill a run. */
function safeName(rng: Random, attempt: () => string): string {
  try {
    const name = attempt();
    return name.trim().length > 0 ? name : fallbackName(rng);
  } catch {
    return fallbackName(rng);
  }
}

export type IdAllocator = (prefix: string) => string;

export function manifestationName(powerSet: PowerSet, approach: Approach): string {
  return `${POWER_SET_DEFS[powerSet].displayName} (${APPROACH_DEFS[approach].label})`;
}

export class CharacterFactory {
  constructor(
    private readonly rng: Random,
    private readonly allocateId: IdAllocator,
  ) {}

  createIdentity(rng: Random = this.rng): SecretIdentityData {
    return {
      civilianJob: rng.pick(CIVILIAN_JOBS),
      civilianTies: [rng.pick(CIVILIAN_TIES)],
      secrecy: rng.int(55, 85),
      exposed: false,
    };
  }

  createHero(realName: string, alias: string, powerSet: PowerSet, origin: PowerOrigin): HeroData {
    return {
      id: this.allocateId('hero'),
      realName,
      alias,
      powerLevel: 1,
      powers: [{ powerSet, origin }],
      manifestations: [],
      reputation: 0,
      identity: this.createIdentity(),
    };
  }

  createGeneratedHero(rng: Random = this.rng): HeroData {
    const realName = safeName(rng, () => rollAnyCivilianName(rng));
    const powerSet = rng.pick(POWER_SETS);
    const origin = rng.pick(POWER_ORIGINS);
    return this.createHero(realName, makeAlias(powerSet, realName, (a) => rng.pick(a)), powerSet, origin);
  }

  createVillain(rng: Random = this.rng): VillainData {
    const realName = safeName(rng, () => rollVillainName(rng));
    const powerSet = rng.pick(POWER_SETS);
    const origin = rng.pick(POWER_ORIGINS);
    return {
      id: this.allocateId('vill'),
      realName,
      alias: makeAlias(powerSet, realName, (a) => rng.pick(a)),
      powerLevel: rng.int(1, 4),
      powers: [{ powerSet, origin }],
      manifestations: [],
      status: 'active',
    };
  }

  grantManifestation(
    hero: HeroData,
    approach: Approach,
    powerSet: PowerSet,
    origin: PowerOrigin,
    difficulty: DifficultyLevel,
  ): boolean {
    const already = hero.manifestations.some(
      (m) => m.approach === approach && m.powerSet === powerSet && m.origin === origin && m.difficulty === difficulty,
    );
    if (already) return false;
    hero.manifestations.push({
      name: manifestationName(powerSet, approach),
      approach,
      origin,
      powerSet,
      difficulty,
    });
    return true;
  }
}

export class IncidentFactory {
  constructor(
    private readonly rng: Random,
    private readonly allocateId: IdAllocator,
  ) {}

  createIncident(rng: Random = this.rng): IncidentData {
    const type = rng.pick(INCIDENT_TYPES);
    const def = INCIDENT_TYPE_DEFS[type];
    const approachModifiers = {} as Record<Approach, number>;
    for (const approach of APPROACHES) {
      const [min, max] = def.approachBias[approach];
      approachModifiers[approach] = rng.int(min, max);
    }
    const [dMin, dMax] = def.timeToResolve;
    return {
      id: this.allocateId('inc'),
      type,
      description: def.description,
      district: rng.pick(DISTRICTS),
      timeToResolve: rng.int(dMin, dMax),
      difficulty: rng.pick(DIFFICULTY_LEVELS),
      approachModifiers,
    };
  }

  static describe(incident: IncidentData): string {
    return `${INCIDENT_TYPE_DEFS[incident.type].label} in ${DISTRICT_LABELS[incident.district]} (${DIFFICULTY_DEFS[incident.difficulty].label})`;
  }
}
