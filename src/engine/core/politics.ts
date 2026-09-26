import type { Random } from './Random';
import type { HeroData } from './types';
import { CELL_DEFS, cellForOrigin, type CellId } from '../data/cells';
import { ORGANIZATION_TEMPLATES, type OrganizationData } from '../data/organizations';
import type { IdAllocator } from './CharacterFactory';

/**
 * Metapolitics, both layers.
 *
 * Internally, a hero's PowerOrigin decides which cell they are sympathetic to,
 * and how you spend them moves that sympathy. Externally, organisations press
 * on you, and a cell inside your roster makes you legible to its rival outside.
 */

export interface SympathyShift {
  heroId: string;
  cell: CellId;
  delta: number;
  reason: string;
}

/** Cells recruit by action, not by argument. */
export function driftSympathy(
  hero: HeroData,
  delta: number,
  reason: string,
  out: SympathyShift[],
): void {
  const before = hero.politics.sympathy;
  hero.politics.sympathy = Math.max(-100, Math.min(100, before + delta));
  if (hero.politics.sympathy !== before) {
    out.push({ heroId: hero.id, cell: hero.politics.leaning, delta: hero.politics.sympathy - before, reason });
  }
}

export function sympathyForOrigin(origin: HeroData['powers'][number]['origin']): CellId {
  return cellForOrigin(origin);
}

export function createOrganizations(
  rng: Random,
  allocateId: IdAllocator,
  count: number,
): OrganizationData[] {
  const chosen = rng.shuffle(ORGANIZATION_TEMPLATES).slice(0, count);
  return chosen.map((t) => ({
    id: allocateId('org'),
    name: t.name,
    ideology: t.ideology,
    agenda: t.agenda,
    power: rng.int(20, 60),
    standing: rng.int(-40, 20),
    escalation: 0,
    active: true,
  }));
}

/**
 * Ideology warps the approach modifiers on open incidents. An Ascendant-aligned
 * trouble spot is a much harder job for a Choir hero, and easier for their own.
 */
export function ideologyModifier(organizations: readonly OrganizationData[], hero: HeroData, approach: string): number {
  let mod = 0;
  for (const org of organizations) {
    if (!org.active) continue;
    if (org.ideology === hero.politics.leaning) {
      // A sympathetic organisation on the scene helps your people.
      if (approach === 'diplomatic' || approach === 'tactical') mod += 2;
    } else {
      // An opposed one obstructs, but is easier to just hit.
      if (approach === 'lethal' || approach === 'swift') mod += 1;
      if (approach === 'diplomatic') mod -= 2;
    }
  }
  return mod;
}

/** Cells and organisations feed each other. Shared ideology means defection risk. */
export function courtOrganization(org: OrganizationData, hero: HeroData, rng: Random): SympathyShift | null {
  const out: SympathyShift[] = [];
  if (org.ideology === hero.politics.leaning) {
    driftSympathy(hero, rng.int(4, 9), `${org.name} made their case, and it landed.`, out);
    org.standing = Math.min(100, org.standing + rng.int(3, 8));
  } else {
    driftSympathy(hero, -rng.int(2, 6), `${org.name} made their case, and it did not land.`, out);
    org.standing = Math.max(-100, org.standing - rng.int(2, 6));
  }
  return out[0] ?? null;
}

export function suppressOrganization(org: OrganizationData, rng: Random): string {
  org.power = Math.max(0, org.power - rng.int(8, 18));
  org.standing = Math.max(-100, org.standing - rng.int(10, 20));
  if (org.power <= 0) {
    org.active = false;
    return `${org.name} is finished. For now.`;
  }
  return `You moved against ${org.name}. It is quieter, and angrier.`;
}

/**
 * A hero whose sympathy has collapsed against their own cell stops turning up.
 * This is the internal cost of running a lopsided roster.
 */
export function fractureRisk(hero: HeroData, rng: Random): boolean {
  return hero.politics.sympathy <= -50 && rng.chance(0.2);
}

export function cellLabel(cell: CellId): string {
  return CELL_DEFS[cell].label;
}
