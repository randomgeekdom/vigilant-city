import type { EventSpec } from '../core/EventSystem';
import { PACK_ROSTER } from './packRoster';
import { PACK_CITY } from './packCity';
import { PACK_PRESS } from './packPress';

export const ALL_EVENTS: readonly EventSpec[] = [...PACK_ROSTER, ...PACK_CITY, ...PACK_PRESS];

export const EVENT_PACKS = [
  { key: 'roster', label: 'Roster', count: PACK_ROSTER.length },
  { key: 'city', label: 'City', count: PACK_CITY.length },
  { key: 'press', label: 'Press', count: PACK_PRESS.length },
] as const;
