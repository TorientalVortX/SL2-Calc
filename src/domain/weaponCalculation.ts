import { BASE_DURABILITY, type StatRecord, type WeaponUpgradePoints } from '../types';

// Reported from play: listed scaling is worth 1.5x in the SWA sum (70% STR acts as 105%).
// The STR-primary critical bonus reads the unmultiplied contribution.
export const SWA_SCALING_MULTIPLIER = 1.5;

export function scaledStatContribution(
  stats: Partial<Record<keyof StatRecord, number>>,
  scaling: Partial<Record<keyof StatRecord, number>>,
): number {
  let total = 0;
  for (const [stat, percent] of Object.entries(scaling)) {
    if (!percent) continue;
    total += (stats[stat as keyof StatRecord] ?? 0) * percent * SWA_SCALING_MULTIPLIER / 100;
  }
  return Math.floor(total);
}

export interface WeaponModifier {
  power: number;
  crit: number;
  hit: number;
  weight: number;
}

export interface WeaponEnchantment extends WeaponModifier {
  critMod: number;
  weightMod: number;
}

export interface WeaponSlotInput {
  stats: StatRecord;
  weaponType: string;
  effectiveWeaponType: string;
  effectiveWeaponTypes?: string[];
  basePower: number;
  baseCrit: number;
  baseHit: number;
  baseWeight: number;
  baseCritDamage: number;
  material: WeaponModifier;
  parts: WeaponModifier[];
  enchantmentName: string;
  enchantment: WeaponEnchantment;
  upgradePoints: WeaponUpgradePoints;
  rarity: number;
  powerQuality: boolean;
  critQuality: boolean;
  hitQuality: boolean;
  weightPlus: boolean;
  weightMinus: boolean;
  sentimentality: boolean;
  twoHandedSkillRank: number;
  scalingContribution: number;
  strScalingContribution: number;
  hasPrimaryStrScaling: boolean;
  enchantmentPowerBonus: number;
  enchantmentHitBonus: number;
  extraCritChance?: number;
}

const TWO_HANDED_POWER_TYPES = new Set(['Sword', 'Axe', 'Spear', 'Polearm']);

export function calculateWeaponSlot(input: WeaponSlotInput) {
  const sum = (key: keyof WeaponModifier) => input.parts.reduce((total, part) => total + part[key], 0);
  const qualityPower = input.powerQuality ? 2 : 0;
  const qualityCrit = input.critQuality ? 4 : 0;
  const qualityHit = input.hitQuality ? 4 : 0;
  const sentimentality = input.sentimentality ? 2 : 0;
  const weightAdjustment = input.weightPlus === input.weightMinus ? 0 : input.weightPlus ? 2 : -2;

  const upgrade = input.upgradePoints;

  // Power excludes stat scaling: SWA = Power + scaling, and skill coefficients are stated against SWA.
  const weaponPowerBeforeGrip = input.basePower + input.material.power + sum('power') + input.enchantment.power + qualityPower + sentimentality + upgrade.power + input.enchantmentPowerBonus;
  const weaponCritical = input.baseCrit + input.material.crit + sum('crit') + input.enchantment.crit + qualityCrit + sentimentality + upgrade.critical;
  const baseWeaponAccuracy = input.baseHit + input.material.hit + sum('hit') + input.enchantment.hit + qualityHit + sentimentality + upgrade.accuracy + input.enchantmentHitBonus;
  let totalWeight = Math.floor((input.baseWeight + input.material.weight + sum('weight') + input.enchantment.weight + weightAdjustment) * input.enchantment.weightMod);
  if (input.enchantmentName === 'Gigantic') totalWeight = Math.max(2, totalWeight);
  totalWeight = Math.max(0, totalWeight);

  let twoHandedPowerBonus = 0;
  let twoHandedHitBonus = 0;
  if (input.twoHandedSkillRank > 0) {
    const baseBonus = input.twoHandedSkillRank * 2;
    // Weapon data says `Polearm` where class lists and the Mutation table say `Spear`.
    if ((input.effectiveWeaponTypes ?? [input.effectiveWeaponType]).some(type => TWO_HANDED_POWER_TYPES.has(type))) twoHandedPowerBonus = totalWeight >= 20 ? baseBonus * 2 : baseBonus;
    if ((input.effectiveWeaponTypes ?? [input.effectiveWeaponType]).includes('Gun')) twoHandedHitBonus = baseBonus;
  }

  const power = weaponPowerBeforeGrip + twoHandedPowerBonus;
  const swa = power + input.scalingContribution;
  const weaponAccuracy = baseWeaponAccuracy + twoHandedHitBonus;
  const strScaledCrit = input.hasPrimaryStrScaling ? Math.floor(input.strScalingContribution * 0.4) : 0;
  const weaponCriticalWithStr = weaponCritical + strScaledCrit;
  const critValue = weaponCriticalWithStr + Math.floor(input.stats.ski / 2) + Math.floor(input.stats.luc) + (input.extraCritChance ?? 0);
  const critDamageMod = input.baseCritDamage + Math.floor(input.stats.gui) + input.enchantment.critMod;

  return {
    power,
    weaponCritical: weaponCriticalWithStr,
    crit: `${critValue}%`,
    weaponAccuracy,
    hit: `${Math.floor(input.stats.ski * 2) + weaponAccuracy}%`,
    weight: totalWeight,
    // Weapon data carries no durability.
    durability: BASE_DURABILITY + upgrade.durability,
    critDamageMod,
    swa,
    critSwa: Math.floor(swa * (critDamageMod / 100)),
    twoHandedPowerBonus,
    twoHandedHitBonus,
  };
}
