import { type StatKey, type Weapon, type WeaponConfig } from '../types';
import { ALL_WEAPONS } from '../data/weapons';

export const SCALING_STATS: StatKey[] = [
  'str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt',
];

const mutationTypes: Record<number, string> = {
  1: 'Dagger', 2: 'Fist', 3: 'Sword', 4: 'Axe', 5: 'Spear', 6: 'Tome', 7: 'Bow', 8: 'Gun',
};

export function findWeaponByName(name?: string | null): Weapon | undefined {
  if (!name) return undefined;
  return ALL_WEAPONS.find(weapon => weapon.name === name);
}

/** The game adds every scaling entry together (Amplifyia's two WIL 25 / LUC 35 entries are WIL 50 / LUC 70). */
export function scalingForWeapon(weapon: Weapon): WeaponConfig['customScaling'] {
  const combined = weapon.scaling.reduce<Partial<Record<StatKey, number>>>((total, entry) => {
    for (const stat of SCALING_STATS) total[stat] = (total[stat] ?? 0) + (entry[stat] ?? 0);
    return total;
  }, {});
  return Object.fromEntries(
    SCALING_STATS.map(stat => [stat, combined[stat] ?? 0]),
  ) as WeaponConfig['customScaling'];
}

export function weaponToConfig(weapon: Weapon): WeaponConfig {
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
    enchantment: 'None',
    upgradeLevel: 0,
    upgradePoints: { power: 0, critical: 0, accuracy: 0, durability: 0 },
    rarity: weapon.rarity,
    powerQuality: false,
    critQuality: false,
    hitQuality: false,
    weightPlus: false,
    weightMinus: false,
    sentimentality: false,
    twoHandedSkillRank: 0,
    customScaling: scalingForWeapon(weapon),
  };
}

export function effectiveWeaponType(config?: WeaponConfig): string | undefined {
  if (!config) return undefined;
  if (config.enchantment === 'Mutation' && config.rarity < 9) return mutationTypes[config.rarity] ?? config.weaponType;
  return config.weaponType;
}

/** Mutation replaces the original identity rather than adding to it. */
export function effectiveWeaponTypes(config?: WeaponConfig): string[] {
  const primary = effectiveWeaponType(config);
  if (!primary) return [];
  if (config?.enchantment === 'Mutation' && config.rarity < 9) return [primary];
  const weapon = findWeaponByName(config?.selectedWeaponName);
  const extra = (weapon?.specials ?? []).flatMap(special =>
    [...special.description.matchAll(/also qualifies as an? (\w+) weapon/gi)].map(match => match[1]));
  return [...new Set([primary, ...extra])];
}

/** Maps weapon-data types onto the class `validWeapons` vocabulary (`Polearm` is `Spears` there). */
export function weaponCategory(weaponType?: string | null): string | null {
  if (!weaponType) return null;
  return ({
    Sword: 'Swords', Axe: 'Axes', Bow: 'Bows', Dagger: 'Daggers', Fist: 'Fist',
    Gun: 'Guns', Polearm: 'Spears', Spear: 'Spears', Tome: 'Tomes',
  } as Record<string, string>)[weaponType] ?? null;
}

/** Only the main class grants weapon proficiency; a subclass supplies skills, not weapons. */
export function mainClassAllowsWeaponType(
  weaponType: string | null | undefined,
  mainClass: { validWeapons?: string[] } | undefined,
): boolean {
  const category = weaponCategory(weaponType);
  if (!category) return true;
  const list = mainClass?.validWeapons;
  if (!list?.length) return true;
  return list.includes(category);
}

export function subClassOnlyWeaponType(
  weaponType: string | null | undefined,
  mainClass: { validWeapons?: string[] } | undefined,
  subClass: { validWeapons?: string[] } | undefined,
): boolean {
  const category = weaponCategory(weaponType);
  if (!category) return false;
  return Boolean(subClass?.validWeapons?.includes(category))
    && !mainClassAllowsWeaponType(weaponType, mainClass);
}
