import type { Approach } from './approaches';

export const INCIDENT_TYPES = [
  'kidnapping',
  'murder',
  'rampage',
  'robbery',
  'hostage',
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

/**
 * Ranges are a direct port of the Blazor prototype's `Random.Next` calls.
 * Note .NET `Next(n)` yields 0..n-1 and `Next(a,b)` yields a..b-1, so those
 * are translated to inclusive `[min, max]` here. Do not "tidy" these numbers:
 * the shape of each distribution is the design.
 */
export interface IncidentTypeDef {
  label: string;
  description: string;
  timeToResolve: readonly [number, number];
  approachBias: Record<Approach, readonly [number, number]>;
}

export const INCIDENT_TYPE_DEFS: Record<IncidentType, IncidentTypeDef> = {
  kidnapping: {
    label: 'Kidnapping',
    description: 'A child has been kidnapped and the parents are desperate to find them.',
    timeToResolve: [6, 7],
    approachBias: {
      diplomatic: [0, 1],
      lethal: [-1, 6],
      stealthy: [0, 1],
      swift: [-8, -5],
      tactical: [0, 3],
    },
  },
  murder: {
    label: 'Murder',
    description: 'Someone has been murdered. Their death needs to be investigated.',
    timeToResolve: [6, 7],
    approachBias: {
      diplomatic: [0, 1],
      lethal: [-5, -3],
      stealthy: [0, 3],
      swift: [-2, 0],
      tactical: [0, 1],
    },
  },
  rampage: {
    label: 'Rampage',
    description: 'Someone is on a rampage and is causing chaos in the streets.',
    timeToResolve: [1, 1],
    approachBias: {
      diplomatic: [-7, 9],
      lethal: [-1, 2],
      stealthy: [-8, 3],
      swift: [0, 1],
      tactical: [0, 3],
    },
  },
  robbery: {
    label: 'Robbery',
    description: 'A robbery is occurring and the perpetrators are heavily armed.',
    timeToResolve: [1, 1],
    approachBias: {
      diplomatic: [-9, -1],
      lethal: [0, 2],
      stealthy: [-5, 1],
      swift: [5, 7],
      tactical: [-2, 1],
    },
  },
  hostage: {
    label: 'Hostage Situation',
    description: 'There is a hostage situation currently in progress.',
    timeToResolve: [1, 1],
    approachBias: {
      diplomatic: [0, 3],
      lethal: [-3, 3],
      stealthy: [0, 8],
      swift: [-5, 4],
      tactical: [0, 9],
    },
  },
};
