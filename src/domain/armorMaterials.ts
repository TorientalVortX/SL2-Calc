import armorData from '../data/content/armor-modifiers.json';
import type { ArmorQuality, ElementKey, ResistKey, StatKey } from '../types';

/**
 * Armour materials.
 *
 * SL2 crafts armour from the same materials as weapons, so the *names* are
 * shared and read from `weapon-modifiers.json`: duplicating the list would let
 * the two drift apart.
 *
 * What is not shared is the effect. A weapon material moves power / crit / hit /
 * weight; an armour material moves armour / magic armour / evade / weight, and
 * often a resistance or a stat besides. Those values now come from the wiki's
 * Item Materials table, extracted by `scripts/build-armor-data.mjs` from the
 * `Armor:` segment of each material's entry. Anything the wiki does not state
 * plainly is simply absent, so an unmodelled material still resolves to no change.
 */
export interface ArmorMaterialModifier {
  armor: number;
  magicArmor: number;
  evade: number;
  weight: number;
  /** Flat max HP / FP, as several materials grant. */
  hp: number;
  fp: number;
  critical: number;
  criticalEvade: number;
  stats: Partial<Record<StatKey, number>>;
  /** Percentage resistance: elemental and physical alike, keyed by type. */
  resistances: Partial<Record<ResistKey, number>>;
  elementalAttack: Partial<Record<ElementKey, number>>;
}

export const NO_ARMOR_MATERIAL: ArmorMaterialModifier = {
  armor: 0, magicArmor: 0, evade: 0, weight: 0, hp: 0, fp: 0,
  critical: 0, criticalEvade: 0, stats: {}, resistances: {}, elementalAttack: {},
};

/**
 * The roles a material can be crafted into.
 *
 * `other` is the wiki's own name for the hands, legs and accessory role. A
 * material does something different there than it does on armour (Arctic Gold
 * is `+1 Armor, +1 Weight, +5% Ice Resistance` on a torso but only the
 * resistance on a pair of boots), so the two are never interchangeable.
 */
export type MaterialRole = 'weapon' | 'armor' | 'other';

interface WikiMaterial extends Partial<ArmorMaterialModifier> {
  /** Which item kinds the wiki says this material can be crafted into. */
  appliesTo: MaterialRole[];
  /** The hands/legs/accessory profile, when the wiki states one. */
  other?: Partial<ArmorMaterialModifier>;
}

const WIKI_MATERIALS = armorData.materials as Record<string, WikiMaterial>;

/**
 * Splits one material record into the profile for `role`.
 *
 * The armour profile is flattened onto the record and the `other` profile is
 * nested, so reading the armour one means dropping `other`: otherwise every
 * armour modifier carries a stray copy of the hands/legs/accessory values.
 */
function profileFor(material: WikiMaterial, role: 'armor' | 'other'): Partial<ArmorMaterialModifier> {
  const { appliesTo: _appliesTo, other, ...armor } = material;
  return role === 'other' ? (other ?? {}) : armor;
}

/** Materials usable in `role`, grouped as the wiki groups them. */
function categoriesFor(role: MaterialRole): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(armorData.categories as Record<string, string[]>)
      .map(([section, names]) => [section, names.filter(name => WIKI_MATERIALS[name]?.appliesTo.includes(role))])
      .filter(([, names]) => names.length > 0),
  );
}

/** Effects for `role`, keyed by material name. */
function modifiersFor(role: 'armor' | 'other'): Partial<Record<string, ArmorMaterialModifier>> {
  return Object.fromEntries(
    Object.entries(WIKI_MATERIALS)
      .filter(([, material]) => material.appliesTo.includes(role))
      .map(([name, material]) => [name, complete(profileFor(material, role))]),
  );
}

/**
 * Materials grouped as the wiki groups them, filtered to those usable on armour.
 *
 * Previously this reused the weapon picker's categories, which had two problems:
 * it offered Chapter materials (those craft books, and the wiki gives them no
 * armour effect at all) while omitting the entire Cloth family, which is
 * armour-only and so never appeared in a weapon-derived list.
 */
export const ARMOR_MATERIAL_CATEGORIES: Record<string, string[]> = categoriesFor('armor');

export const ARMOR_MATERIAL_NAMES = Object.values(ARMOR_MATERIAL_CATEGORIES).flat();

/**
 * Materials usable on hands, legs and accessories.
 *
 * A separate list from the armour one: the Chapter family reaches paper
 * accessories but no armour, and plenty of materials the wiki gives an armour
 * effect say "Other: No effect." and so are absent here.
 */
export const OTHER_MATERIAL_CATEGORIES: Record<string, string[]> = categoriesFor('other');

export const OTHER_MATERIAL_NAMES = Object.values(OTHER_MATERIAL_CATEGORIES).flat();

/** Fills the sparse generated record out to a complete modifier. */
function complete(partial: Partial<ArmorMaterialModifier>): ArmorMaterialModifier {
  return { ...NO_ARMOR_MATERIAL, ...partial };
}

/**
 * Armour-side effects, keyed by material name.
 *
 * Sourced from the wiki. A material the table does not cover (or one the wiki
 * marks "No effect" for armour) resolves to `NO_ARMOR_MATERIAL`.
 */
export const ARMOR_MATERIAL_MODIFIERS: Partial<Record<string, ArmorMaterialModifier>> = modifiersFor('armor');

/** The same, for the hands/legs/accessory slots. */
export const OTHER_MATERIAL_MODIFIERS: Partial<Record<string, ArmorMaterialModifier>> = modifiersFor('other');

/** Whether any material has real values yet: drives the UI's "not modelled" note. */
export const ARMOR_MATERIALS_MODELLED = Object.keys(ARMOR_MATERIAL_MODIFIERS).length > 0;

export const OTHER_MATERIALS_MODELLED = Object.keys(OTHER_MATERIAL_MODIFIERS).length > 0;

export function armorMaterialModifier(name: string | null | undefined): ArmorMaterialModifier {
  if (!name || name === 'None') return NO_ARMOR_MATERIAL;
  return ARMOR_MATERIAL_MODIFIERS[name] ?? NO_ARMOR_MATERIAL;
}

/**
 * The effect of `name` when crafted into a hands, legs or accessory piece.
 *
 * Deliberately not a fallback to the armour profile: a material with no `Other`
 * clause does nothing on these slots, and borrowing its armour values would
 * invent armour and evade that the slot cannot have.
 */
export function otherMaterialModifier(name: string | null | undefined): ArmorMaterialModifier {
  if (!name || name === 'None') return NO_ARMOR_MATERIAL;
  return OTHER_MATERIAL_MODIFIERS[name] ?? NO_ARMOR_MATERIAL;
}

/**
 * What a torso's quality tags are worth.
 *
 * Shaped as an `ArmorMaterialModifier` so it can be summed alongside the material
 * and enchantment rather than handled as a special case, and so the armoury can
 * summarise it with the same function it uses for those.
 *
 * Weight follows the weapon rule exactly: the two tags cancel when both are set,
 * because an item cannot be simultaneously lightweight and heavy.
 */
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

/** The tags, with the labels and hints the armoury shows. */
export const ARMOR_QUALITY_TAGS: Array<{ key: keyof ArmorQuality; label: string; hint: string }> = [
  { key: 'solid', label: 'Solid', hint: '+2 Armor' },
  { key: 'polished', label: 'Polished', hint: '+2 Magic Armor' },
  { key: 'goodFit', label: 'Good Fit', hint: '+4 Evade' },
  { key: 'lightweight', label: 'Lightweight', hint: '−2 Weight' },
  { key: 'heavy', label: 'Heavy', hint: '+2 Weight' },
];
