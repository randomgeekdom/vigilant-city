export const POWER_ORIGINS = ['alien', 'genetic', 'supernatural', 'technological'] as const;

export type PowerOrigin = (typeof POWER_ORIGINS)[number];

export const ORIGIN_DEFS: Record<PowerOrigin, { label: string; blurb: string }> = {
  alien: {
    label: 'Alien',
    blurb:
      'Your powers were either granted to you by an alien from another world, universe, or dimension. Or, perhaps, you are that alien being yourself.',
  },
  genetic: {
    label: 'Genetic',
    blurb: 'You were born this way. Something unknown within your DNA has caused you to have special abilities.',
  },
  supernatural: {
    label: 'Supernatural',
    blurb: 'Your powers are granted to you by sorcery, myth, or the divine/demonic.',
  },
  technological: {
    label: 'Technological',
    blurb:
      'Science has granted you abilities beyond what is normal. You wear a piece of technology or have made it a part of your body.',
  },
};
