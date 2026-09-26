export const APPROACHES = ['diplomatic', 'lethal', 'stealthy', 'swift', 'tactical'] as const;

export type Approach = (typeof APPROACHES)[number];

export const APPROACH_DEFS: Record<Approach, { label: string; blurb: string }> = {
  diplomatic: { label: 'Diplomatic', blurb: 'Talk it out.' },
  lethal: { label: 'Lethal', blurb: 'When in doubt, kill them.' },
  stealthy: { label: 'Stealthy', blurb: 'Try not to be seen.' },
  swift: { label: 'Swift', blurb: 'Be quick.' },
  tactical: { label: 'Tactical', blurb: 'Use your wits.' },
};
