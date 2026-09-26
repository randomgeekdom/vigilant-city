export const CIVILIAN_JOBS = [
  'ER nurse',
  'secondary school teacher',
  'city bus mechanic',
  'night-shift security guard',
  'forensic technician',
  'line cook',
  'structural engineer',
  'paramedic',
  'court stenographer',
  'tax auditor',
  'radio host',
  'archivist',
  'long-haul trucker',
  'childminder',
  'bike courier',
  'pharmacy technician',
  'crane operator',
  'probation officer',
  'market trader',
  'vet tech',
] as const;

export const CIVILIAN_TIES = [
  'a partner who works nights',
  'a nine-year-old daughter',
  'a widowed mother',
  'a mentee at the dojo',
  'a roommate who notices everything',
  'a football team that needs you on Saturdays',
  'a patient list of forty names',
  'a sister-in-law who does not believe in masks',
  'a landlord who asks too many questions',
  'a chess club that meets Thursdays',
  'a foster placement, currently failing',
  'a bandmate who writes lyrics about the city',
  'a debt you cannot explain',
  'a dog that waits by the door',
  'a mentor who signed your apprenticeship',
  'a side business the city has no record of',
] as const;

export type CivilianJob = (typeof CIVILIAN_JOBS)[number];
export type CivilianTie = (typeof CIVILIAN_TIES)[number];
