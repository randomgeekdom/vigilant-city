export const DIFFICULTY_LEVELS = ['easy', 'average', 'difficult', 'backbreaking'] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_DEFS: Record<DifficultyLevel, { label: string; roll: number }> = {
  easy: { label: 'Easy', roll: 5 },
  average: { label: 'Average', roll: 10 },
  difficult: { label: 'Difficult', roll: 15 },
  backbreaking: { label: 'Backbreaking', roll: 20 },
};

export function difficultyRoll(level: DifficultyLevel): number {
  return DIFFICULTY_DEFS[level].roll;
}

export function difficultyModifier(level: DifficultyLevel): number {
  return Math.floor(DIFFICULTY_DEFS[level].roll / 5);
}
