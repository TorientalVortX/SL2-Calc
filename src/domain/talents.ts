import type { ElementKey } from '../types';
import {
  TALENTS,
  talentModifiers,
  talentsAllowWeapon,
  weaponRarityUnlocks,
  type TalentAllocation,
  type TalentModifier,
} from '../data/talents';

export interface TalentInput {
  talents?: TalentAllocation;
  talentConditionals?: Record<string, boolean>;
}

/** The wiki names one element differently from the calculator's element keys. */
const ELEMENT_ALIASES: Record<string, ElementKey> = {
  Fire: 'Fire', Ice: 'Ice', Wind: 'Wind', Earth: 'Earth', Water: 'Water',
  Light: 'Light', Lightning: 'Lightning', Sound: 'Sound', Acid: 'Acid',
  Darkness: 'Dark',
};

export interface TalentEffects {
  hit: number;
  /** Chivalry's Smite; kept out of `hit` because the Hit model's front tier already pays it. */
  frontalHit: number;
  critical: number;
  criticalDamagePercent: number;
  power: number;
  scaledWeaponAtk: number;
  weaponWeightReduction: number;
  attackRange: number;
  maxFp: number;
  fpRegen: number;
  fpCostDiscounts: Record<string, number>;
  armor: number;
  magicArmor: number;
  skillPool: number;
  statusInflictionPercent: number;
  maxBattleWeight: number;
  elementalAttack: Partial<Record<ElementKey, number>>;
}

export const NO_TALENT_EFFECTS: TalentEffects = {
  hit: 0, frontalHit: 0, critical: 0, criticalDamagePercent: 0, power: 0, scaledWeaponAtk: 0,
  weaponWeightReduction: 0, attackRange: 0, maxFp: 0, fpRegen: 0, fpCostDiscounts: {},
  armor: 0, magicArmor: 0, skillPool: 0, statusInflictionPercent: 0, maxBattleWeight: 0,
  elementalAttack: {},
};

function hasAllocation(allocation: TalentAllocation | undefined): boolean {
  if (!allocation) return false;
  for (const key in allocation) if (allocation[key] > 0) return true;
  return false;
}

/** A Mutation enchantment writes Polearm as `Spear`. */
function normalizeWeaponType(weaponType?: string | null): string | null {
  if (!weaponType) return null;
  return weaponType === 'Spear' ? 'Polearm' : weaponType;
}

function isFrontalHit(stat: string, effect: string): boolean {
  return stat === 'hit' && /\bfrom (?:their|the) front\b/i.test(effect);
}

export function isFrontalHitSubtalent(
  subtalent: { effect: string; modifiers: Array<{ stat: string; conditional: boolean }> },
): boolean {
  const conditional = subtalent.modifiers.filter(modifier => modifier.conditional);
  return conditional.length > 0
    && conditional.every(modifier => isFrontalHit(modifier.stat, subtalent.effect));
}

export function activeTalentModifiers(
  build: TalentInput,
  rawWeaponType?: string | string[] | null,
): Array<TalentModifier & { rank: number; total: number; subtalentId: string; frontal: boolean }> {
  const allocation = build.talents;
  if (!hasAllocation(allocation)) return [];
  const weaponType = Array.isArray(rawWeaponType) ? rawWeaponType.map(type => normalizeWeaponType(type)!) : normalizeWeaponType(rawWeaponType);
  const confirmed = build.talentConditionals ?? {};
  const unconditional = talentModifiers(allocation!, { weaponType });
  const conditional = talentModifiers(allocation!, { weaponType, includeConditional: true })
    .filter(modifier => modifier.conditional
      && (confirmed[modifier.subtalent.id] || isFrontalHit(modifier.stat, modifier.subtalent.effect)));
  return [...unconditional, ...conditional].map(modifier => ({
    ...modifier,
    subtalentId: modifier.subtalent.id,
    frontal: isFrontalHit(modifier.stat, modifier.subtalent.effect),
  }));
}

export function talentEffects(build: TalentInput, weaponType?: string | string[] | null): TalentEffects {
  const modifiers = activeTalentModifiers(build, weaponType);
  if (!modifiers.length) return NO_TALENT_EFFECTS;

  const effects: TalentEffects = { ...NO_TALENT_EFFECTS, elementalAttack: {}, fpCostDiscounts: {} };
  for (const modifier of modifiers) {
    const { total } = modifier;
    if (modifier.frontal) {
      effects.frontalHit += total;
      continue;
    }
    switch (modifier.stat) {
      case 'hit': effects.hit += total; break;
      case 'critical': effects.critical += total; break;
      case 'criticalDamage': effects.criticalDamagePercent += total; break;
      case 'power': effects.power += total; break;
      case 'scaledWeaponAtk': effects.scaledWeaponAtk += total; break;
      // `total` is negative for a reduction.
      case 'battleWeight': effects.weaponWeightReduction += -total; break;
      case 'maxBattleWeight': effects.maxBattleWeight += total; break;
      case 'attackRange': effects.attackRange += total; break;
      case 'maxFp': effects.maxFp += total; break;
      case 'fpRegen': effects.fpRegen += total; break;
      case 'fpCost': {
        const scope = modifier.subject.replace(/\s+(?:spell|skill) FP costs?$/i, '');
        effects.fpCostDiscounts[scope] = Math.max(effects.fpCostDiscounts[scope] ?? 0, -total);
        break;
      }
      case 'armor': effects.armor += total; break;
      case 'magicArmor': effects.magicArmor += total; break;
      case 'skillPool': effects.skillPool += total; break;
      case 'statusInfliction': effects.statusInflictionPercent += total; break;
      case 'elementAtk': {
        const element = modifier.element ? ELEMENT_ALIASES[modifier.element] : undefined;
        if (element) effects.elementalAttack[element] = (effects.elementalAttack[element] ?? 0) + total;
        break;
      }
      default: break;
    }
  }
  return effects;
}

/** Adaptation is a rarity cap, not a blanket unlock: Rank 2 opens Rarity 4 and nothing above. */
export function talentsUnlockWeapon(
  build: TalentInput,
  weaponType: string | null | undefined,
  rarity: number,
): boolean {
  if (!hasAllocation(build.talents)) return false;
  return talentsAllowWeapon(weaponType, rarity, build.talents!);
}

export function talentWeaponUnlocks(build: TalentInput): Record<string, number> {
  if (!hasAllocation(build.talents)) return {};
  return weaponRarityUnlocks(build.talents!);
}

export function setSubtalentRank(
  allocation: TalentAllocation | undefined,
  subtalentId: string,
  rank: number,
): TalentAllocation {
  const next = { ...(allocation ?? {}) };
  const subtalent = TALENTS.flatMap(talent => talent.subtalents).find(entry => entry.id === subtalentId);
  if (!subtalent) return next;
  const clamped = Math.max(0, Math.min(Math.floor(rank), subtalent.maxSr));
  if (clamped === 0) delete next[subtalentId];
  else next[subtalentId] = clamped;
  return next;
}
