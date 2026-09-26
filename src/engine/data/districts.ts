export const DISTRICTS = [
  'ArtsDistrict',
  'BlueCoast',
  'CollegePark',
  'Downtown',
  'GreenHills',
  'MedicalDistrict',
  'Midtown',
  'OldTown',
  'Riverside',
] as const;

export type District = (typeof DISTRICTS)[number];

export const DISTRICT_LABELS: Record<District, string> = {
  ArtsDistrict: 'Arts District',
  BlueCoast: 'Blue Coast',
  CollegePark: 'College Park',
  Downtown: 'Downtown',
  GreenHills: 'Green Hills',
  MedicalDistrict: 'Medical District',
  Midtown: 'Midtown',
  OldTown: 'Old Town',
  Riverside: 'Riverside',
};
