import statusData from './content/statuses.json';

/**
 * One status effect from the wiki's catalog page.
 *
 * Descriptions and notes are community prose kept verbatim; the structured
 * fields carry only what the text states plainly. Durations and per-skill
 * infliction chances are not in the source and so are not here.
 */
export interface StatusEffectRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  notes: string;
  /** Canonical calculator races the wiki says cannot be inflicted with this. */
  immuneRaces: string[];
  /** Immune monster races the calculator does not model, kept as prose. */
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

/** Names of the statuses this subrace cannot be inflicted with. */
export function statusImmunitiesForSubrace(subrace: string): string[] {
  return STATUS_EFFECTS.filter(status => status.immuneRaces.includes(subrace)).map(status => status.name);
}
