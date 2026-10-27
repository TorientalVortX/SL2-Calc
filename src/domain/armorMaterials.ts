import armorData from '../data/content/armor-modifiers.json';
import type { ArmorQuality, ElementKey, ResistKey, StatKey } from '../types';

// Material names are shared with weapons (read from weapon-modifiers.json); effects come from the wiki's Item Materials table.
export interface ArmorMaterialModifier {
  armor: number;
  magicArmor: number;
  evade: number;
  weight: number;
  hp: number;
  fp: number;
  critical: number;
  criticalEvade: number;
  stats: Partial<Record<StatKey, number>>;
  resistances: Partial<Record<ResistKey, number>>;
  elementalAttack: Partial<Record<ElementKey, number>>;
}

export const NO_ARMOR_MATERIAL: ArmorMaterialModifier = {
  armor: 0, magicArmor: 0, evade: 0, weight: 0, hp: 0, fp: 0,
  critical: 0, criticalEvade: 0, stats: {}, resistances: {}, elementalAttack: {},
};

/** `other` is the wiki's name for the hands/legs/accessory role, which has its own effects. */
export type MaterialRole = 'weapon' | 'armor' | 'other';

interface WikiMaterial extends Partial<ArmorMaterialModifier> {
  appliesTo: MaterialRole[];
  other?: Partial<ArmorMaterialModifier>;
  /** What the material's `All:` clause adds on a weapon; Power, Hit and Critical come from weapon-modifiers.json. */
  weapon?: Partial<ArmorMaterialModifier>;
}

const WIKI_MATERIALS = armorData.materials as Record<string, WikiMaterial>;

function profileFor(material: WikiMaterial, role: 'armor' | 'other'): Partial<ArmorMaterialModifier> {
  const { appliesTo: _appliesTo, other, weapon: _weapon, ...armor } = material;
  return role === 'other' ? (other ?? {}) : armor;
}

export function weaponMaterialExtras(name: string | null | undefined): ArmorMaterialModifier {
  return complete((name && WIKI_MATERIALS[name]?.weapon) || {});
}

function categoriesFor(role: MaterialRole): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(armorData.categories as Record<string, string[]>)
      .map(([section, names]) => [section, names.filter(name => WIKI_MATERIALS[name]?.appliesTo.includes(role))])
      .filter(([, names]) => names.length > 0),
  );
}

function modifiersFor(role: 'armor' | 'other'): Partial<Record<string, ArmorMaterialModifier>> {
  return Object.fromEntries(
    Object.entries(WIKI_MATERIALS)
      .filter(([, material]) => material.appliesTo.includes(role))
      .map(([name, material]) => [name, complete(profileFor(material, role))]),
  );
}

export const ARMOR_MATERIAL_CATEGORIES: Record<string, string[]> = categoriesFor('armor');

export const ARMOR_MATERIAL_NAMES = Object.values(ARMOR_MATERIAL_CATEGORIES).flat();

export const OTHER_MATERIAL_CATEGORIES: Record<string, string[]> = categoriesFor('other');

export const OTHER_MATERIAL_NAMES = Object.values(OTHER_MATERIAL_CATEGORIES).flat();

function complete(partial: Partial<ArmorMaterialModifier>): ArmorMaterialModifier {
  return { ...NO_ARMOR_MATERIAL, ...partial };
}

export const ARMOR_MATERIAL_MODIFIERS: Partial<Record<string, ArmorMaterialModifier>> = modifiersFor('armor');

export const OTHER_MATERIAL_MODIFIERS: Partial<Record<string, ArmorMaterialModifier>> = modifiersFor('other');

export const ARMOR_MATERIALS_MODELLED = Object.keys(ARMOR_MATERIAL_MODIFIERS).length > 0;

export const OTHER_MATERIALS_MODELLED = Object.keys(OTHER_MATERIAL_MODIFIERS).length > 0;

export function armorMaterialModifier(name: string | null | undefined): ArmorMaterialModifier {
  if (!name || name === 'None') return NO_ARMOR_MATERIAL;
  return ARMOR_MATERIAL_MODIFIERS[name] ?? NO_ARMOR_MATERIAL;
}

/** No fallback to the armour profile: a material with no wiki `Other` clause does nothing on these slots. */
export function otherMaterialModifier(name: string | null | undefined): ArmorMaterialModifier {
  if (!name || name === 'None') return NO_ARMOR_MATERIAL;
  return OTHER_MATERIAL_MODIFIERS[name] ?? NO_ARMOR_MATERIAL;
}

export function armorQualityModifier(quality: ArmorQuality | undefined): ArmorMaterialModifier {
  if (!quality) return NO_ARMOR_MATERIAL;
  const weight = quality.lightweight === quality.heavy ? 0 : quality.heavy ? 2 : -2;
  return {
    ...NO_ARMOR_MATERIAL,
    armor: quality.solid ? 2 : 0,
    magicArmor: quality.polished ? 2 : 0,
    evade: quality.goodFit ? 4 : 0,
    weight,
  };
}

export const ARMOR_QUALITY_TAGS: Array<{ key: keyof ArmorQuality; label: string; hint: string }> = [
  { key: 'solid', label: 'Solid', hint: '+2 Armor' },
  { key: 'polished', label: 'Polished', hint: '+2 Magic Armor' },
  { key: 'goodFit', label: 'Good Fit', hint: '+4 Evade' },
  { key: 'lightweight', label: 'Lightweight', hint: '−2 Weight' },
  { key: 'heavy', label: 'Heavy', hint: '+2 Weight' },
];
