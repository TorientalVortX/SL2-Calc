import type { OptimizationReferenceProfile, StatKey, Weapon, WeaponConfig } from '../types';
import { ALL_WEAPONS } from '../data/weapons';

const SCALING_STATS: Exclude<StatKey, 'apt'>[] = [
  'str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san',
];

const mutationTypes: Record<number, string> = {
  1: 'Dagger', 2: 'Fist', 3: 'Sword', 4: 'Axe', 5: 'Spear', 6: 'Tome', 7: 'Bow', 8: 'Gun',
};

export function findWeaponByName(name?: string | null): Weapon | undefined {
  if (!name) return undefined;
  return ALL_WEAPONS.find(weapon => weapon.name === name);
}

export function scalingForWeapon(weapon: Weapon, override?: OptimizationReferenceProfile['weapon']['scaling']): WeaponConfig['customScaling'] {
  const first = weapon.scaling[0] ?? { type: 'Basic' as const };
  return Object.fromEntries(SCALING_STATS.map(stat => [stat, override?.[stat] ?? first[stat] ?? 0])) as WeaponConfig['customScaling'];
}

export function weaponToConfig(weapon: Weapon, options: {
  effectiveType?: string;
  scalingOverride?: OptimizationReferenceProfile['weapon']['scaling'];
  requiredEnchantment?: string;
} = {}): WeaponConfig {
  const derivedMutation = options.effectiveType && options.effectiveType !== weapon.weaponType && mutationTypes[weapon.rarity] === options.effectiveType
    ? 'Mutation'
    : undefined;
  return {
    selectedWeaponName: weapon.name,
    weaponType: weapon.weaponType,
    basePower: weapon.power,
    baseCrit: weapon.critical,
    baseHit: weapon.accuracy,
    baseWeight: weapon.weight,
    baseCritDamage: weapon.criticalDamage,
    material: 'None',
    part1: 'None',
    part2: 'None',
    part3: 'None',
    enchantment: options.requiredEnchantment ?? derivedMutation ?? 'None',
    upgradeLevel: 0,
    rarity: weapon.rarity,
    powerQuality: false,
    critQuality: false,
    hitQuality: false,
    weightPlus: false,
    weightMinus: false,
    sentimentality: false,
    twoHandedSkillRank: 0,
    customScaling: scalingForWeapon(weapon, options.scalingOverride),
  };
}

export function configForReferenceWeapon(profile?: OptimizationReferenceProfile): WeaponConfig | undefined {
  if (!profile) return undefined;
  const weapon = findWeaponByName(profile.weapon.name);
  if (!weapon) return undefined;
  return weaponToConfig(weapon, {
    effectiveType: profile.weapon.effectiveType,
    scalingOverride: profile.weapon.scaling,
    requiredEnchantment: profile.requiredWeaponEnchantment,
  });
}

export function effectiveWeaponType(config?: WeaponConfig): string | undefined {
  if (!config) return undefined;
  if (config.enchantment === 'Mutation' && config.rarity < 9) return mutationTypes[config.rarity] ?? config.weaponType;
  return config.weaponType;
}
