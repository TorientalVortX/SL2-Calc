import armorData from '../data/content/armor-modifiers.json';
import type { ElementKey, ResistKey, StatKey } from '../types';

export interface ArmorEnchantmentEffect {
  armor: number;
  magicArmor: number;
  evade: number;
  hp: number;
  hpPercent: number;
  fp: number;
  statusResistance: number;
  critical: number;
  criticalEvade: number;
  stats: Partial<Record<StatKey, number>>;
  resistances: Partial<Record<ResistKey, number>>;
  elementalAttack: Partial<Record<ElementKey, number>>;
  slots: string[];
  /** Flat weight added before the multiplier. */
  weight: number;
  weightMod: number;
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

export const ARMOR_ENCHANTMENT_OVERRIDES: Partial<Record<string, Partial<ArmorEnchantmentEffect>>> =
  armorData.enchantments as Record<string, Partial<ArmorEnchantmentEffect>>;

export const ARMOR_ENCHANTMENT_NAMES = [
  'None',
  ...Object.entries(ARMOR_ENCHANTMENT_OVERRIDES)
    .filter(([, effect]) => effect?.slots?.some((slot) => slot.toLowerCase() === 'torso'))
    .map(([name]) => name),
];

export const ARMOR_ENCHANTMENTS_MODELLED = Object.keys(ARMOR_ENCHANTMENT_OVERRIDES).length > 0;

export function armorEnchantmentEffect(name: string | null | undefined): ArmorEnchantmentEffect {
  if (!name || name === 'None') return NO_ARMOR_ENCHANTMENT;
  const override = ARMOR_ENCHANTMENT_OVERRIDES[name];

  // Imported legacy builds can carry a weapon-only enchantment; keep the string, never apply it.
  if (!override?.slots?.some((slot) => slot.toLowerCase() === 'torso')) {
    return NO_ARMOR_ENCHANTMENT;
  }

  return { ...NO_ARMOR_ENCHANTMENT, ...override };
}

export type EnchantSlot = 'Hands' | 'Legs' | 'Accessory';

export function enchantmentNamesForSlot(slot: EnchantSlot): string[] {
  return [
    'None',
    ...Object.entries(ARMOR_ENCHANTMENT_OVERRIDES)
      .filter(([, effect]) => effect?.slots?.some((legal) => legal.toLowerCase() === slot.toLowerCase()))
      .map(([name]) => name),
  ];
}

/** Never falls back to torso values: the wiki gives per-slot magnitudes (Warding is +5 on armour, +3 on legs). */
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
