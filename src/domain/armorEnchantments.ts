import armorData from '../data/content/armor-modifiers.json';
import type { ElementKey, ResistKey, StatKey } from '../types';

/**
 * Torso enchantments generated from the wiki's enchantment table.
 *
 * Weapon enchantments are deliberately not reused here: most cannot legally be
 * put on a torso, even when their modifier shape happens to look compatible.
 * Prose-only and conditional enchantments stay in the data so the picker remains
 * complete, but only always-on numeric effects are added to build totals.
 */
export interface ArmorEnchantmentEffect {
  armor: number;
  magicArmor: number;
  evade: number;
  hp: number;
  /** Percentage maximum-HP modifier, e.g. Gigantic's +10%. */
  hpPercent: number;
  fp: number;
  statusResistance: number;
  critical: number;
  criticalEvade: number;
  stats: Partial<Record<StatKey, number>>;
  resistances: Partial<Record<ResistKey, number>>;
  elementalAttack: Partial<Record<ElementKey, number>>;
  /** Body slots the wiki says this can go on. */
  slots: string[];
  /** Flat weight added before the multiplier. */
  weight: number;
  /** Multiplier applied to the item's total weight. */
  weightMod: number;
  /** Original wiki effect text, retained when its mechanic is prose-only. */
  description: string;
}

export const NO_ARMOR_ENCHANTMENT: ArmorEnchantmentEffect = {
  armor: 0,
  magicArmor: 0,
  evade: 0,
  weight: 0,
  weightMod: 1,
  hp: 0,
  hpPercent: 0,
  fp: 0,
  statusResistance: 0,
  critical: 0,
  criticalEvade: 0,
  stats: {},
  resistances: {},
  elementalAttack: {},
  slots: [],
  description: '',
};

/** Wiki enchantments keyed by name, including records with prose-only effects. */
export const ARMOR_ENCHANTMENT_OVERRIDES: Partial<Record<string, Partial<ArmorEnchantmentEffect>>> =
  armorData.enchantments as Record<string, Partial<ArmorEnchantmentEffect>>;

/** Legal torso enchantments in wiki order, plus the calculator's empty choice. */
export const ARMOR_ENCHANTMENT_NAMES = [
  'None',
  ...Object.entries(ARMOR_ENCHANTMENT_OVERRIDES)
    .filter(([, effect]) => effect?.slots?.some((slot) => slot.toLowerCase() === 'torso'))
    .map(([name]) => name),
];

/** Whether the generated armor-enchantment table is available. */
export const ARMOR_ENCHANTMENTS_MODELLED = Object.keys(ARMOR_ENCHANTMENT_OVERRIDES).length > 0;

export function armorEnchantmentEffect(name: string | null | undefined): ArmorEnchantmentEffect {
  if (!name || name === 'None') return NO_ARMOR_ENCHANTMENT;
  const override = ARMOR_ENCHANTMENT_OVERRIDES[name];

  // Imported legacy builds can contain a weapon-only enchantment. Preserve the
  // saved string, but never apply it to torso calculations.
  if (!override?.slots?.some((slot) => slot.toLowerCase() === 'torso')) {
    return NO_ARMOR_ENCHANTMENT;
  }

  return { ...NO_ARMOR_ENCHANTMENT, ...override };
}

/** The slots other than the torso that an enchantment can state its own effect for. */
export type EnchantSlot = 'Hands' | 'Legs' | 'Accessory';

/** Enchantments legal on `slot`, in wiki order, plus the calculator's empty choice. */
export function enchantmentNamesForSlot(slot: EnchantSlot): string[] {
  return [
    'None',
    ...Object.entries(ARMOR_ENCHANTMENT_OVERRIDES)
      .filter(([, effect]) => effect?.slots?.some((legal) => legal.toLowerCase() === slot.toLowerCase()))
      .map(([name]) => name),
  ];
}

/**
 * The effect of an enchantment on a hands, legs or accessory piece.
 *
 * Deliberately never falls back to the torso values. One enchantment can state a
 * different magnitude per slot (Warding is +5 Resistance on armour but +3 on
 * legs), so borrowing the torso figure would overstate every other slot. An
 * enchantment legal here that says nothing specific resolves to no effect.
 */
export function enchantmentEffectForSlot(
  name: string | null | undefined,
  slot: EnchantSlot,
): ArmorEnchantmentEffect {
  if (!name || name === 'None') return NO_ARMOR_ENCHANTMENT;
  const override = ARMOR_ENCHANTMENT_OVERRIDES[name];
  if (!override?.slots?.some((legal) => legal.toLowerCase() === slot.toLowerCase())) {
    return NO_ARMOR_ENCHANTMENT;
  }
  const perSlot = (override as { bySlot?: Partial<Record<EnchantSlot, Partial<ArmorEnchantmentEffect>>> }).bySlot;
  return { ...NO_ARMOR_ENCHANTMENT, ...(perSlot?.[slot] ?? {}) };
}
