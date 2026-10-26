import type { Armor } from '../types';

// Transcribed from the community Hit/Evade workbook (reference/hitEvade/hit-evade-sheet.xlsx).
// The wiki states none of this ordering; every step matches the sheet's cell formulas.

export const HIT_PER_SKI = 2;
export const EVADE_PER_CEL = 2;
export const FLANKING_BASE = 5;
export const FLANKING_PER_GUI = 0.5;
export const FLANKING_PER_CONDITION = 0.5;
/** Chivalry's Smite at subtalent rank 5 (3 Hit a rank); the workbook hard-codes it. */
export const HONOR_HIT_BONUS = 15;
export const BONUS_HIT_CAP = 50;
export const BONUS_EVADE_CAP = 50;
export const BLIND_HIT_CAP = 75;
export const MINIMUM_HIT_CHANCE = 5;
/** The workbook has no ceiling, so its cell can read 160: a margin, not a chance. */
export const MAXIMUM_HIT_CHANCE = 100;
export const FEAR_HIT_PENALTY = 15;
/** Bravery's ceiling on Fear resistance. */
export const MAX_FEAR_RESISTANCE = 0.48;
export const KNOCKED_DOWN_EVADE_PENALTY: Record<Armor['type'], number> = {
  Unarmored: 0.12,
  Light: 0.25,
  Heavy: 0.37,
};

export interface AttackerHitInput {
  baseHit: number;
  /** Per the sheet, field Hit stacks into base and is uncapped, unlike field Evade. */
  fieldModifier?: number;
  brokenWeapon?: boolean;
  baseMultiplier?: number;
  bonusMultiplier?: number;
  hitBuffs?: number;
  /** Defaults to the workbook's 15 (Smite at max subtalent rank). */
  honorHitBonus?: number;
  hitDebuffs?: number;
  /** Feared *by the attack target*. */
  feared?: boolean;
  fearResistance?: number;
  flanking: number;
}

export interface TargetEvadeInput {
  baseEvade: number;
  /** Guard and terrain apply here. */
  baseMultiplier?: number;
  bonusMultiplier?: number;
  evadeBuffs?: number;
  evadeDebuffs?: number;
  /** Field Evade counts toward the bonus cap, unlike field Hit. */
  fieldBuffs?: number;
  fieldDebuffs?: number;
  knockedDown?: boolean;
  armorType?: Armor['type'];
}

export type HitTier = 'base' | 'front' | 'flank1' | 'flank2';

export const HIT_TIERS: HitTier[] = ['base', 'front', 'flank1', 'flank2'];

export const HIT_TIER_LABEL: Record<HitTier, string> = {
  base: 'Base',
  front: 'Front (Honor)',
  flank1: 'Flanked',
  flank2: 'Flanked + ally adjacent',
};

export const HIT_TIER_HINT: Record<HitTier, string> = {
  base: 'Attacking a target who is not flanked, from a tile that is not directly in front of them.',
  front: 'Attacking from the tile the target faces, which Honor pays for out of the remaining Bonus Hit cap.',
  flank1: 'Behind the target, or from the side while an ally is within 1 Range.',
  flank2: 'Behind the target and an ally within 1 Range: both flanking conditions.',
};

export interface AttackerHit {
  preBonus: number;
  bonusHit: number;
  honorHeadroom: number;
  byTier: Record<HitTier, number>;
}

export interface TargetEvade {
  preBonus: number;
  bonusEvade: number;
  total: number;
}

export function applyBonusCap(bonus: number, cap: number): number {
  return Math.min(bonus, cap);
}

export function attackerHit(input: AttackerHitInput): AttackerHit {
  const afterField = input.baseHit + (input.fieldModifier ?? 0);
  const afterBroken = input.brokenWeapon ? afterField - afterField / 2 : afterField;
  const preBonus = afterBroken * (input.baseMultiplier ?? 1);

  const fearPenalty = input.feared
    ? FEAR_HIT_PENALTY * (1 - Math.max(0, Math.min(MAX_FEAR_RESISTANCE, input.fearResistance ?? 0)))
    : 0;
  // Fear is subtracted after the cap, so a large buff total cannot absorb it.
  const cappedBonus = applyBonusCap(
    preBonus * (input.bonusMultiplier ?? 0) + (input.hitBuffs ?? 0) - (input.hitDebuffs ?? 0),
    BONUS_HIT_CAP,
  );
  const bonusHit = cappedBonus - fearPenalty;
  const rolling = preBonus + bonusHit;

  // Per the sheet, Honor is paid out of the remaining bonus cap, not on top of it.
  const honor = input.honorHitBonus ?? HONOR_HIT_BONUS;
  const honorHeadroom = Math.max(0, Math.min(BONUS_HIT_CAP - cappedBonus, honor));
  const flankBonus = (conditions: number) => conditions * FLANKING_PER_CONDITION * input.flanking;

  return {
    preBonus,
    bonusHit,
    honorHeadroom,
    byTier: {
      base: rolling,
      front: rolling + honorHeadroom,
      flank1: rolling + flankBonus(1),
      flank2: rolling + flankBonus(2),
    },
  };
}

export function targetEvade(input: TargetEvadeInput): TargetEvade {
  const knockdown = input.knockedDown && input.armorType
    ? KNOCKED_DOWN_EVADE_PENALTY[input.armorType]
    : 0;
  // Per the sheet, Knocked Down reduces the base multiplier rather than subtracting a flat amount.
  const preBonus = input.baseEvade * ((input.baseMultiplier ?? 1) - knockdown);
  const bonusEvade = applyBonusCap(
    preBonus * (input.bonusMultiplier ?? 0)
      + (input.evadeBuffs ?? 0) - (input.evadeDebuffs ?? 0)
      + (input.fieldBuffs ?? 0) - (input.fieldDebuffs ?? 0),
    BONUS_EVADE_CAP,
  );
  return { preBonus, bonusEvade, total: preBonus + bonusEvade };
}

export function hitChance(hit: number, evade: number, blind = false): number {
  const raw = hit - evade;
  const ceiling = blind ? BLIND_HIT_CAP : MAXIMUM_HIT_CHANCE;
  return Math.max(MINIMUM_HIT_CHANCE, Math.min(raw, ceiling));
}

export interface InstanceOdds {
  anyHit: number;
  anyGlance: number;
  halfHit: number;
  halfGlance: number;
  allHit: number;
  allGlance: number;
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const step = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= step; i += 1) result = result * (n - step + i) / i;
  return result;
}

function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let total = 0;
  for (let i = 0; i <= Math.floor(k); i += 1) {
    total += choose(n, i) * p ** i * (1 - p) ** (n - i);
  }
  return total;
}

/** A miss rerolls for a glance, so glance odds use 2n trials. */
export function instanceOdds(chancePercent: number, instances = 1): InstanceOdds {
  const p = Math.max(0, Math.min(1, chancePercent / 100));
  const n = Math.max(1, Math.floor(instances));
  // Deliberately diverges from the workbook, whose truncated BINOMDIST((n/2)-1) asks for 1 of 3 as "Half+".
  const threshold = Math.ceil(n / 2);
  return {
    anyHit: 1 - (1 - p) ** n,
    anyGlance: 1 - (1 - p) ** (n * 2),
    halfHit: 1 - binomialCdf(threshold - 1, n, p),
    halfGlance: 1 - binomialCdf(threshold - 1, n * 2, p),
    allHit: p ** n,
    allGlance: (1 - (1 - p) ** 2) ** n,
  };
}
