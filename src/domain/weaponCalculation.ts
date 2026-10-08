import { BASE_DURABILITY, type StatRecord, type WeaponUpgradePoints } from '../types';

/**
 * What a weapon's stated scaling percentage is actually worth in the SWA sum.
 *
 * A weapon that reads `70% STR / 40% SKI` does not contribute `0.70 * STR`; it
 * contributes `1.05 * STR`. The listed percentages are multiplied by this before
 * they are applied, so the pair above behaves as 105% / 60%. Reported from play:
 * a build whose scaling summed to a projected 99 SWA was reading well under its
 * real value because the calculator applied the listed percentage verbatim.
 *
 * Applied to the summed scaling that feeds Power only. The STR-primary critical
 * bonus (+0.4 Critical per scaled STR point) is a separate rule that reads the
 * unmultiplied contribution, so it is not routed through this.
 */
export const SWA_SCALING_MULTIPLIER = 1.5;

/**
 * A weapon's scaling contribution to Power, from a stat line and a scaling table.
 *
 * The single place the multiplier is applied, so the weapon workspace, the build
 * evaluation and the opponent gauntlet's SWA proxy cannot drift apart.
 */
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
  /** Spent per channel; the old uniform `upgradeLevel` migrates into this. */
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

  /*
   * Power is the weapon's own number. Everything printed in its description
   * window, plus what has been applied to it. Stat scaling is deliberately NOT
   * in here: `SWA = Power + scaling`, and the two were the same field until it
   * was pointed out that they are not the same quantity. Skill and spell
   * coefficients are stated against SWA, so conflating them mispriced every
   * percentage-of-SWA effect.
   */
  const weaponPowerBeforeGrip = input.basePower + input.material.power + sum('power') + input.enchantment.power + qualityPower + sentimentality + upgrade.power + input.enchantmentPowerBonus;
  const weaponCritical = input.baseCrit + input.material.crit + sum('crit') + input.enchantment.crit + qualityCrit + sentimentality + upgrade.critical;
  const baseWeaponAccuracy = input.baseHit + input.material.hit + sum('hit') + input.enchantment.hit + qualityHit + sentimentality + upgrade.accuracy + input.enchantmentHitBonus;
  let totalWeight = Math.floor((input.baseWeight + input.material.weight + sum('weight') + input.enchantment.weight + weightAdjustment) * input.enchantment.weightMod);
  if (input.enchantmentName === 'Gigantic') totalWeight = Math.max(2, totalWeight);
  // Weight-reducing modifiers stack (Fated alone is -3), and a negative total
  // would hand the build battle weight back rather than merely costing none.
  totalWeight = Math.max(0, totalWeight);

  let twoHandedPowerBonus = 0;
  let twoHandedHitBonus = 0;
  if (input.twoHandedSkillRank > 0) {
    const baseBonus = input.twoHandedSkillRank * 2;
    // Weapon data says `Polearm` where a class list and the Mutation table say
    // `Spear`. Both spellings reach here, so both have to be named or every spear
    // silently loses the bonus swords and axes get.
    if ((input.effectiveWeaponTypes ?? [input.effectiveWeaponType]).some(type => TWO_HANDED_POWER_TYPES.has(type))) twoHandedPowerBonus = totalWeight >= 20 ? baseBonus * 2 : baseBonus;
    if ((input.effectiveWeaponTypes ?? [input.effectiveWeaponType]).includes('Gun')) twoHandedHitBonus = baseBonus;
  }

  // The two-handed grip is a Power bonus, so it lands before scaling is added.
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
    // Weapon data carries no durability, so it starts from a constant and is
    // raised only by upgrade points.
    durability: BASE_DURABILITY + upgrade.durability,
    critDamageMod,
    swa,
    critSwa: Math.floor(swa * (critDamageMod / 100)),
    twoHandedPowerBonus,
    twoHandedHitBonus,
  };
}
