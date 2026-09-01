import talentData from './content/talents.json';

/**
 * The talent catalog, scraped from the wiki's `Talents` page.
 *
 * A talent holds ranks, bought one whole rank at a time, and each rank makes
 * `floor(rank * spPerRank)` SP available to spend on that talent's own
 * subtalents, one subtalent rank per SP. So a subtalent rank is not a talent
 * rank: the talent's rank count is whatever its subtalents have spent rounded
 * *up* to the cheapest rank that could afford it, since a rank is bought whole
 * or not at all. A subtalent's numbers are written against `SR` (its own
 * current rank), so everything structured here is per-rank and has to be
 * multiplied by the invested rank to mean anything.
 */
export interface TalentModifier {
  /** The calculator stat this changes; see `TalentStat`. */
  stat: TalentStat;
  /** For `elementAtk`, which element's attack power moves. */
  element?: string | null;
  direction: 'increase' | 'reduce';
  /** Amount per subtalent rank. */
  perRank: number;
  unit: 'flat' | 'percent';
  /** The wiki's own phrase for what changes, kept for display and auditing. */
  subject: string;
  /** Whether the change lands on you or on the target you hit. */
  appliesTo: 'self' | 'enemy';
  /** Weapon types the change is scoped to; absent means it always applies. */
  weapons?: string[];
  /** Subtypes the wiki singles out, e.g. Rifle for a Gun-scoped bonus. */
  weaponSubtypes?: string[];
  /** True when the wiki gates the effect on a stance, facing, or time of day. */
  conditional: boolean;
}

export type TalentStat =
  | 'hit' | 'critical' | 'criticalDamage' | 'criticalChance' | 'power' | 'scaledWeaponAtk'
  | 'battleWeight' | 'maxBattleWeight' | 'closeRangeHitPenalty' | 'attackRange' | 'farshotRange'
  | 'maxFp' | 'fpRegen' | 'fpCost' | 'fp' | 'hp'
  | 'armor' | 'magicArmor' | 'elementAtk' | 'statusInfliction' | 'skillPool'
  | 'durabilityConsumption' | 'itemBelt' | 'carryingCapacity';

/** An Adaptation rank: any weapon of this type up to `SR * rarityPerRank` Rarity. */
export interface TalentWeaponAccess {
  weaponType: string;
  rarityPerRank: number;
}

export interface SubtalentRecord {
  /** `"blade-expertise/reliability"`. */
  id: string;
  name: string;
  maxSr: number;
  effect: string;
  weaponAccess?: TalentWeaponAccess;
  weapons?: string[];
  weaponSubtypes?: string[];
  modifiers: TalentModifier[];
  links: string[];
}

export interface TalentRecord {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  spPerRank: number;
  maxRanks: number;
  maxSp: number;
  subtalents: SubtalentRecord[];
}

export const TALENTS = talentData.talents as TalentRecord[];
export const TALENT_CATEGORIES = talentData.categories as Array<{ id: string; name: string }>;
export const TALENT_BUDGET = talentData.budget as {
  pointsFromLevels: number;
  legendExtensionPoints: number;
  maxRanksPerTalent: number;
};

export const TALENT_PROVENANCE = {
  source: talentData.source,
  scraped: talentData.scraped,
  confidence: talentData.confidence,
};

/** Ranks invested in each subtalent, keyed by subtalent id. */
export type TalentAllocation = Record<string, number>;

const TALENT_BY_ID = new Map(TALENTS.map(talent => [talent.id, talent]));
const SUBTALENT_BY_ID = new Map(
  TALENTS.flatMap(talent => talent.subtalents.map(sub => [sub.id, { talent, sub }] as const)),
);

export function talentById(id: string): TalentRecord | undefined {
  return TALENT_BY_ID.get(id);
}

export function subtalentById(id: string): SubtalentRecord | undefined {
  return SUBTALENT_BY_ID.get(id)?.sub;
}

/** The rank actually in force: what was allocated, clamped to the subtalent's cap. */
function effectiveRank(id: string, allocation: TalentAllocation): number {
  const entry = SUBTALENT_BY_ID.get(id);
  if (!entry) return 0;
  const rank = allocation[id] ?? 0;
  if (!Number.isFinite(rank) || rank <= 0) return 0;
  return Math.min(Math.floor(rank), entry.sub.maxSr);
}

/**
 * Subpoints spent per talent, in both units.
 *
 * A subtalent rank costs one SP, so the SP a talent's subtalents have consumed
 * is just their ranks summed. The talent's own rank count is not that sum: a
 * rank is bought whole, and a rank buys `spPerRank` SP of subtalent spending,
 * so the rank count is the fewest whole ranks that could afford the SP spent,
 * `ceil(sp / spPerRank)`. Anything over the talent's `maxRanks` is
 * over-allocated and reported rather than silently trimmed.
 */
export function talentSpending(allocation: TalentAllocation): {
  perTalent: Array<{ talent: TalentRecord; ranks: number; sp: number; overAllocated: boolean }>;
  /** Ranks bought across every talent: the figure the point budget bounds. */
  totalRanks: number;
  /** What those ranks cost in SP. Per-talent, so it is not one rate. */
  totalSp: number;
} {
  const spByTalent = new Map<string, number>();
  for (const id of Object.keys(allocation)) {
    const entry = SUBTALENT_BY_ID.get(id);
    if (!entry) continue;
    const rank = effectiveRank(id, allocation);
    if (rank > 0) spByTalent.set(entry.talent.id, (spByTalent.get(entry.talent.id) ?? 0) + rank);
  }
  const perTalent = [...spByTalent].map(([talentId, sp]) => {
    const talent = TALENT_BY_ID.get(talentId)!;
    const ranks = talent.spPerRank > 0 ? Math.ceil(sp / talent.spPerRank) : sp;
    return { talent, ranks, sp, overAllocated: ranks > talent.maxRanks };
  });
  return {
    perTalent,
    totalRanks: perTalent.reduce((sum, entry) => sum + entry.ranks, 0),
    totalSp: perTalent.reduce((sum, entry) => sum + entry.sp, 0),
  };
}

/**
 * The highest weapon Rarity each Adaptation rank unlocks, by weapon type.
 *
 * This is access a class roster does not grant: Adaptation lets a character
 * equip any weapon of its type at or below the cap regardless of class, so it is
 * checked alongside `mainClassAllowsWeaponType`, not instead of it, and it is
 * the main class alone that grants a weapon for free.
 */
export function weaponRarityUnlocks(allocation: TalentAllocation): Record<string, number> {
  const unlocks: Record<string, number> = {};
  for (const { sub } of SUBTALENT_BY_ID.values()) {
    if (!sub.weaponAccess) continue;
    const rank = effectiveRank(sub.id, allocation);
    if (rank <= 0) continue;
    const cap = rank * sub.weaponAccess.rarityPerRank;
    const type = sub.weaponAccess.weaponType;
    unlocks[type] = Math.max(unlocks[type] ?? 0, cap);
  }
  return unlocks;
}

/**
 * Whether talents alone let this character equip a weapon of the given type and
 * rarity. False only means talents do not grant it; the class may still.
 */
export function talentsAllowWeapon(
  weaponType: string | null | undefined,
  rarity: number,
  allocation: TalentAllocation,
): boolean {
  if (!weaponType) return false;
  return rarity <= (weaponRarityUnlocks(allocation)[weaponType] ?? 0);
}

export interface TalentModifierOptions {
  /** Restrict to modifiers that apply to this weapon type; omit for unscoped only. */
  weaponType?: string | null;
  /** Include modifiers the wiki gates on a stance, facing, or time of day. */
  includeConditional?: boolean;
}

/** A modifier applies when it is unscoped, or scoped to the weapon in hand. */
function inScope(modifier: TalentModifier, weaponType?: string | null): boolean {
  if (!modifier.weapons?.length) return true;
  return weaponType ? modifier.weapons.includes(weaponType) : false;
}

/**
 * Every modifier in force for an allocation, with its per-rank amount already
 * multiplied by the invested rank.
 *
 * Enemy-facing effects (Dizzy's FP drain) are excluded: they are not a bonus to
 * this character's sheet. Conditional ones are excluded unless asked for, so a
 * displayed total never quietly assumes a stance the build may not be in.
 */
export function talentModifiers(
  allocation: TalentAllocation,
  options: TalentModifierOptions = {},
): Array<TalentModifier & { rank: number; total: number; subtalent: SubtalentRecord; talent: TalentRecord }> {
  const applied = [];
  for (const { talent, sub } of SUBTALENT_BY_ID.values()) {
    const rank = effectiveRank(sub.id, allocation);
    if (rank <= 0) continue;
    for (const modifier of sub.modifiers) {
      if (modifier.appliesTo !== 'self') continue;
      if (modifier.conditional && !options.includeConditional) continue;
      if (!inScope(modifier, options.weaponType)) continue;
      const signed = modifier.direction === 'reduce' ? -1 : 1;
      applied.push({ ...modifier, rank, total: signed * modifier.perRank * rank, subtalent: sub, talent });
    }
  }
  return applied;
}

/**
 * Modifier totals per stat, signed so a reduction is negative.
 *
 * Flat and percent modifiers are summed separately because they are not
 * interchangeable: `hit` is flat points, `fpCost` is a percentage discount.
 */
export function talentStatTotals(
  allocation: TalentAllocation,
  options: TalentModifierOptions = {},
): { flat: Partial<Record<TalentStat, number>>; percent: Partial<Record<TalentStat, number>> } {
  const flat: Partial<Record<TalentStat, number>> = {};
  const percent: Partial<Record<TalentStat, number>> = {};
  for (const modifier of talentModifiers(allocation, options)) {
    const bucket = modifier.unit === 'percent' ? percent : flat;
    bucket[modifier.stat] = (bucket[modifier.stat] ?? 0) + modifier.total;
  }
  return { flat, percent };
}
