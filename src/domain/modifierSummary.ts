import type { ElementKey, ResistKey, StatKey } from '../types';
import { armorMaterialModifier } from './armorMaterials';
import { armorEnchantmentEffect } from './armorEnchantments';

export interface ModifierPart {
  label: string;
  value: string;
  tone: 'good' | 'bad';
}

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

  add('Weight', modifier.weight ?? 0, signed, true);
  const weightMod = modifier.weightMod ?? 1;
  if (weightMod !== 1) {
    parts.push({ label: 'Weight', value: `x${weightMod}`, tone: weightMod > 1 ? 'bad' : 'good' });
  }

  return parts;
}

export function summarizeArmorMaterial(name: string | null | undefined): ModifierPart[] {
  if (!name || name === 'None') return [];
  return summarizeModifier(armorMaterialModifier(name));
}

export interface EnchantmentSummary {
  parts: ModifierPart[];
  description: string;
}

export function summarizeArmorEnchantment(name: string | null | undefined): EnchantmentSummary {
  if (!name || name === 'None') return { parts: [], description: '' };
  const effect = armorEnchantmentEffect(name);
  return { parts: summarizeModifier(effect), description: effect.description };
}

export interface SummarisableWeaponModifier {
  power?: number;
  crit?: number;
  hit?: number;
  weight?: number;
  critMod?: number;
  weightMod?: number;
}

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
