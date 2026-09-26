import type { CitySnapshot } from './types';

/** Saves are stored as JSON text; a truncated or corrupt file must not crash boot. */
export function parseSave(raw: string | null): CitySnapshot | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CitySnapshot;
  } catch {
    return null;
  }
}
