import statusData from './content/statuses.json';

/** Durations and per-skill infliction chances are not on the wiki's status page, so are not here. */
export interface StatusEffectRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  notes: string;
  immuneRaces: string[];
  /** Immune monster races the calculator does not model. */
  otherImmune?: string[];
  /** Rounds of immunity granted after the status ends, when stated. */
  recoveryImmunityRounds?: number;
  /** For Hexes: the status this one locks against being cured. */
  preventsCureOf?: string;
  protectionIgnoring: boolean;
  perRound: boolean;
  links: string[];
}

export const STATUS_EFFECTS = statusData.statuses as StatusEffectRecord[];

export const STATUS_EFFECT_PROVENANCE = {
  source: statusData.source,
  scraped: statusData.scraped,
  confidence: statusData.confidence,
};

const BY_ID = new Map(STATUS_EFFECTS.map(status => [status.id, status]));

export function statusEffectById(id: string): StatusEffectRecord | undefined {
  return BY_ID.get(id);
}

export function statusImmunitiesForSubrace(subrace: string): string[] {
  return STATUS_EFFECTS.filter(status => status.immuneRaces.includes(subrace)).map(status => status.name);
}
