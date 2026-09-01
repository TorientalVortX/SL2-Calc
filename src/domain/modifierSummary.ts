import type { ElementKey, ResistKey, StatKey } from '../types';
import { armorMaterialModifier } from './armorMaterials';
import { armorEnchantmentEffect } from './armorEnchantments';

/**
 * What a material or an enchantment actually does, as readable parts.
 *
 * The armoury let you pick both from dropdowns and then showed nothing about
 * either: the numbers moved in the rail three panels away, so choosing between
 * Breezecloth and Tannin meant picking one, reading the rail, picking the other
 * and reading it again. This turns the modifier record into the same list of parts
 * the item's own effects are already shown as.
 *
 * Both records are summarised by one function because they are near-identical
 * shapes; the enchantment simply has a few fields a material never carries. Any
 * field left at its neutral value is omitted, so the list is only as long as the
 * modifier is interesting.
 */

/** One readable part of a modifier. */
export interface ModifierPart {
  label: string;
  /** Pre-formatted and signed, e.g. `+2`, `-10%`, `x1.5`. */
  value: string;
  /**
   * Whether this reads as a gain or a cost to the wearer.
   *
   * Weight is the inversion worth encoding: more of it is worse, so `+2 WT` is a
   * cost while `-2 WT` is a gain. Everything else follows its sign.
   */
  tone: 'good' | 'bad';
}

/** The union of what a material and an enchantment can carry. */
export interface SummarisableModifier {
  armor?: number;
  magicArmor?: number;
  evade?: number;
  weight?: number;
  weightMod?: number;
  hp?: number;
  hpPercent?: number;
  fp?: number;
  critical?: number;
  criticalEvade?: number;
  statusResistance?: number;
  stats?: Partial<Record<StatKey, number>>;
  resistances?: Partial<Record<ResistKey, number>>;
  elementalAttack?: Partial<Record<ElementKey, number>>;
  description?: string;
}

const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

/** Flat channels, in the order they read most naturally on an item card. */
const FLAT_FIELDS: Array<[keyof SummarisableModifier, string]> = [
  ['armor', 'Armor'],
  ['magicArmor', 'M. Armor'],
  ['evade', 'Evade'],
  ['critical', 'Critical'],
  ['criticalEvade', 'Crit Evade'],
  ['hp', 'HP'],
  ['fp', 'FP'],
  ['statusResistance', 'Status Res.'],
];

export function summarizeModifier(modifier: SummarisableModifier | undefined): ModifierPart[] {
  if (!modifier) return [];
  const parts: ModifierPart[] = [];
  const add = (label: string, amount: number, format = signed, invert = false) => {
    if (!amount) return;
    parts.push({ label, value: format(amount), tone: (amount > 0) !== invert ? 'good' : 'bad' });
  };

  for (const [field, label] of FLAT_FIELDS) add(label, (modifier[field] as number | undefined) ?? 0);
  add('Max HP', modifier.hpPercent ?? 0, value => `${signed(value)}%`);

  for (const [stat, amount] of Object.entries(modifier.stats ?? {})) {
    add(stat.toUpperCase(), amount ?? 0);
  }
  for (const [type, amount] of Object.entries(modifier.resistances ?? {})) {
    add(`${type} Res.`, amount ?? 0, value => `${signed(value)}%`);
  }
  for (const [element, amount] of Object.entries(modifier.elementalAttack ?? {})) {
    add(`${element} ATK`, amount ?? 0);
  }

  // Weight last, and inverted: carrying more of it is the cost, not the gain.
  add('Weight', modifier.weight ?? 0, signed, true);
  const weightMod = modifier.weightMod ?? 1;
  if (weightMod !== 1) {
    parts.push({ label: 'Weight', value: `x${weightMod}`, tone: weightMod > 1 ? 'bad' : 'good' });
  }

  return parts;
}

/** The parts a torso material contributes, plus whether anything is modelled. */
export function summarizeArmorMaterial(name: string | null | undefined): ModifierPart[] {
  if (!name || name === 'None') return [];
  return summarizeModifier(armorMaterialModifier(name));
}

export interface EnchantmentSummary {
  parts: ModifierPart[];
  /**
   * The wiki's own wording, kept for enchantments whose mechanic is prose-only.
   *
   * An enchantment with no numeric parts and no description is one the dataset
   * knows the name of but nothing else: worth saying so rather than rendering an
   * empty row that reads as "does nothing".
   */
  description: string;
}

export function summarizeArmorEnchantment(name: string | null | undefined): EnchantmentSummary {
  if (!name || name === 'None') return { parts: [], description: '' };
  const effect = armorEnchantmentEffect(name);
  return { parts: summarizeModifier(effect), description: effect.description };
}

/** The weapon-side records, which carry a different set of channels. */
export interface SummarisableWeaponModifier {
  power?: number;
  crit?: number;
  hit?: number;
  weight?: number;
  critMod?: number;
  weightMod?: number;
}

/**
 * A weapon material, part or enchantment's numeric effect.
 *
 * Separate from `summarizeModifier` because the weapon records genuinely are a
 * different shape (`crit` and `critMod` are weapon-only, and there is no armour or
 * resistance channel), and collapsing the two would mean a union where half the
 * fields are always absent.
 */
export function summarizeWeaponModifier(modifier: SummarisableWeaponModifier | undefined): ModifierPart[] {
  if (!modifier) return [];
  const parts: ModifierPart[] = [];
  const add = (label: string, amount: number, format = signed, invert = false) => {
    if (!amount) return;
    parts.push({ label, value: format(amount), tone: (amount > 0) !== invert ? 'good' : 'bad' });
  };

  add('Power', modifier.power ?? 0);
  add('Critical', modifier.crit ?? 0);
  add('Hit', modifier.hit ?? 0);
  add('Crit Damage', modifier.critMod ?? 0, value => `${signed(value)}%`);
  add('Weight', modifier.weight ?? 0, signed, true);
  const weightMod = modifier.weightMod ?? 1;
  if (weightMod !== 1) {
    parts.push({ label: 'Weight', value: `x${weightMod}`, tone: weightMod > 1 ? 'bad' : 'good' });
  }
  return parts;
}
