export const POWER_SETS = [
  'ArmoredBody',
  'CombatMaster',
  'EnergyManipulation',
  'Flight',
  'Invisibility',
  'Precognition',
  'Shapeshifting',
  'SizeManipulation',
  'SuperSenses',
  'SuperSpeed',
  'SuperStrength',
  'Technopathy',
  'Telekinesis',
  'Telepathy',
  'Teleportation',
  'TimeManipulation',
] as const;

export type PowerSet = (typeof POWER_SETS)[number];

export interface PowerSetDef {
  displayName: string;
  prefixes: readonly string[];
}

export const POWER_SET_DEFS: Record<PowerSet, PowerSetDef> = {
  ArmoredBody: { displayName: 'Armored Body', prefixes: ['Armored', 'Iron', 'Steel'] },
  CombatMaster: { displayName: 'Combat Mastery', prefixes: ['Combat', 'Fight'] },
  EnergyManipulation: { displayName: 'Energy Manipulation', prefixes: ['Energy', 'Laser', 'Light'] },
  Flight: { displayName: 'Flight', prefixes: ['Flying', 'Glide', 'Kite'] },
  Invisibility: { displayName: 'Invisibility', prefixes: ['Clear', 'Glass', 'Invisible', 'Transparent'] },
  Precognition: { displayName: 'Precognition', prefixes: ['Precognition', 'Predict', 'Psychic'] },
  Shapeshifting: { displayName: 'Shapeshifting', prefixes: ['Animal', 'Beast', 'Creature'] },
  SizeManipulation: { displayName: 'Size Manipulation', prefixes: ['Big', 'Giant', 'Tiny'] },
  SuperSenses: { displayName: 'Super Senses', prefixes: ['Alert', 'Sense'] },
  SuperSpeed: { displayName: 'Super Speed', prefixes: ['Fast', 'Movement', 'Quick', 'Rapid'] },
  SuperStrength: { displayName: 'Super Strength', prefixes: ['Might', 'Mighty', 'Power', 'Strong'] },
  Technopathy: { displayName: 'Technopathy', prefixes: ['Tech', 'Techno'] },
  Telekinesis: { displayName: 'Telekinesis', prefixes: ['Kinetic', 'Lift', 'Throw'] },
  Telepathy: { displayName: 'Telepathy', prefixes: ['Mind', 'Thought'] },
  Teleportation: { displayName: 'Teleportation', prefixes: ['Blink', 'Teleport', 'Warp'] },
  TimeManipulation: { displayName: 'Time Manipulation', prefixes: ['Chrono', 'Time'] },
};

const SUFFIXES = [
  'Man', 'Woman', 'Girl', 'Boy', 'Child', 'Kid', 'Person',
  'Master', 'Mistress', 'Knight', 'Warrior', 'Lord', 'Lady',
] as const;

export function makeAlias(powerSet: PowerSet, realName: string, pick: <T>(arr: readonly T[]) => T): string {
  const prefix = pick(POWER_SET_DEFS[powerSet].prefixes);
  const parts = realName.trim().split(/\s+/).filter((p) => p.length > 0);
  const seeded = parts.length > 0 ? pick(parts) : undefined;
  return `${prefix} ${seeded ?? pick(SUFFIXES)}`;
}
