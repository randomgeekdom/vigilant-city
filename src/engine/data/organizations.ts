import type { CellId } from './cells';

/**
 * External organisations. These are not in your roster — they have their own
 * people, their own ideology, and their own agenda, and they want the same
 * incidents you do.
 */
export interface OrganizationTemplate {
  name: string;
  ideology: CellId;
  agenda: string;
}

export const ORGANIZATION_TEMPLATES: readonly OrganizationTemplate[] = [
  // Exiles
  { name: 'The Diaspora', ideology: 'exiles', agenda: 'Secure landing rights for those who arrive from elsewhere.' },
  { name: 'First Contact', ideology: 'exiles', agenda: 'Stop the city closing itself off to the outside world.' },
  { name: 'The Landing', ideology: 'exiles', agenda: 'Prove the city would rather serve outsiders than its own.' },
  // Ascendants
  { name: 'The Inheritance', ideology: 'ascendants', agenda: 'Hand power to those born with it, permanently.' },
  { name: 'Bloodline', ideology: 'ascendants', agenda: 'End mask-wearing. Everyone should act openly, by birthright.' },
  { name: 'The Progeny', ideology: 'ascendants', agenda: 'Prepare the next generation to take the city outright.' },
  // Choir
  { name: 'The Congregation', ideology: 'choir', agenda: 'Return the city to the faith that made its heroes.' },
  { name: 'The Litany', ideology: 'choir', agenda: 'Every power granted is a debt. The city must pay it.' },
  { name: 'Seraphim', ideology: 'choir', agenda: 'The divine is owed public worship, one way or another.' },
  // Registry
  { name: 'Bureau of Compliance', ideology: 'registry', agenda: 'Register every powered individual in the city.' },
  { name: 'Civic Order', ideology: 'registry', agenda: 'Legislation first. A mask is a licence and a licence is a law.' },
  { name: 'The Mandate', ideology: 'registry', agenda: 'Accountability, transparency, and an audit of the roster.' },
];

export interface OrganizationData {
  id: string;
  name: string;
  ideology: CellId;
  agenda: string;
  /** 0-100, how capable they are. */
  power: number;
  /** -100..100, how they regard you. */
  standing: number;
  /** Turns spent escalating. */
  escalation: number;
  active: boolean;
}
