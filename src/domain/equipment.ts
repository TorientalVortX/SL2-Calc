import { type OptimizationReferenceProfile, type StatKey, type Weapon, type WeaponConfig } from '../types';
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

/**
 * A weapon's scaling, summed across **every** entry.
 *
 * `scaling` is an array because a weapon can scale several ways at once, and the
 * game adds them together. Reading only `scaling[0]` silently halved anything
 * with two entries: 43 of the 53 tomes, and 32 weapons overall. Amplifyia is
 * `[{Electrical, wil 25, luc 35}, {Dextria-Lightning, wil 25, luc 35}]`, which is
 * WIL 50 / LUC 70, not WIL 25 / LUC 35.
 *
 * An explicit `override` (a reference profile's stated scaling) still replaces
 * the stat outright rather than adding to it.
 */
export function scalingForWeapon(weapon: Weapon, override?: OptimizationReferenceProfile['weapon']['scaling']): WeaponConfig['customScaling'] {
  const combined = weapon.scaling.reduce<Partial<Record<StatKey, number>>>((total, entry) => {
    for (const stat of SCALING_STATS) total[stat] = (total[stat] ?? 0) + (entry[stat] ?? 0);
    return total;
  }, {});
  return Object.fromEntries(
    SCALING_STATS.map(stat => [stat, override?.[stat] ?? combined[stat] ?? 0]),
  ) as WeaponConfig['customScaling'];
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
    upgradePoints: { power: 0, critical: 0, accuracy: 0, durability: 0 },
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

/**
 * The category name a class's `validWeapons` list uses for a weapon type.
 *
 * The two vocabularies do not match: weapon data says `Polearm`, a class says
 * `Spears`, and `Fist` is the one entry that is already singular on both sides.
 * Returns null for a type no class list names.
 */
export function weaponCategory(weaponType?: string | null): string | null {
  if (!weaponType) return null;
  return ({
    Sword: 'Swords', Axe: 'Axes', Bow: 'Bows', Dagger: 'Daggers', Fist: 'Fist',
    Gun: 'Guns', Polearm: 'Spears', Spear: 'Spears', Tome: 'Tomes',
  } as Record<string, string>)[weaponType] ?? null;
}

/**
 * Whether the **main** class can wield a weapon type.
 *
 * Only the main class grants weapons for free. A subclass supplies skills, not
 * proficiency, so a Polearm listed under an Evoker subclass is no more
 * equippable than one no class lists at all: the route to anything outside the
 * main roster is an Adaptation talent, which `domain/talents.ts` checks
 * separately and which is capped by rarity rather than opening a type outright.
 *
 * A class with no `validWeapons` list restricts nothing, which is why an unknown
 * or unlisted category reads as allowed rather than blocked; the restriction has
 * to be stated to apply.
 */
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

/**
 * Whether the subclass is the only slot listing this weapon.
 *
 * Worth knowing solely to explain a refusal: a player who picked Evoker for its
 * polearms needs to be told that the pick does not carry the weapon with it,
 * rather than being shown a restriction that looks like a bug.
 */
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
