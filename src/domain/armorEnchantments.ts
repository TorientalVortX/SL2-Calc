import modifierData from '../data/content/weapon-modifiers.json';

/**
 * Armour enchantments.
 *
 * Enchantments are applied to armour as well as weapons, and the list is the
 * same, so the names are read from `weapon-modifiers.json` rather than
 * duplicated — see `armorMaterials.ts` for the same reasoning.
 *
 * Two parts of the shared table genuinely transfer: `weight` and `weightMod`.
 * They describe the enchantment's effect on the *item*, not on attack maths, so
 * Feather halving a torso's weight is the same mechanic as Feather halving a
 * sword's. Those are applied.
 *
 * `power` / `crit` / `hit` do not transfer — an armour enchantment moves armour,
 * magic armour and evade instead, and those values are not in the repo. They come
 * from `ARMOR_ENCHANTMENT_OVERRIDES`, which starts empty so nothing is invented.
 */
export interface ArmorEnchantmentEffect {
  armor: number;
  magicArmor: number;
  evade: number;
  /** Flat weight added before the multiplier. */
  weight: number;
  /** Multiplier applied to the item's total weight. */
  weightMod: number;
}

export const NO_ARMOR_ENCHANTMENT: ArmorEnchantmentEffect = {
  armor: 0, magicArmor: 0, evade: 0, weight: 0, weightMod: 1,
};

interface WeaponEnchantment { weight: number; weightMod: number }

const SHARED = modifierData.enchantments as Record<string, WeaponEnchantment>;

export const ARMOR_ENCHANTMENT_NAMES = Object.keys(SHARED);

/**
 * Armour-specific effects, keyed by enchantment name.
 *
 * Deliberately empty. Populate as, for example:
 *   Runed: { armor: 0, magicArmor: 3, evade: 0 },
 */
export const ARMOR_ENCHANTMENT_OVERRIDES: Partial<
  Record<string, Pick<ArmorEnchantmentEffect, 'armor' | 'magicArmor' | 'evade'>>
> = {};

/** Whether armour-side stat effects have been supplied yet. */
export const ARMOR_ENCHANTMENTS_MODELLED = Object.keys(ARMOR_ENCHANTMENT_OVERRIDES).length > 0;

export function armorEnchantmentEffect(name: string | null | undefined): ArmorEnchantmentEffect {
  if (!name || name === 'None') return NO_ARMOR_ENCHANTMENT;
  const shared = SHARED[name];
  const override = ARMOR_ENCHANTMENT_OVERRIDES[name];
  return {
    armor: override?.armor ?? 0,
    magicArmor: override?.magicArmor ?? 0,
    evade: override?.evade ?? 0,
    weight: shared?.weight ?? 0,
    weightMod: shared?.weightMod ?? 1,
  };
}
