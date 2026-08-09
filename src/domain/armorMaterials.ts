import modifierData from '../data/content/weapon-modifiers.json';

/**
 * Armour materials.
 *
 * SL2 crafts armour from the same materials as weapons, so the *names* are
 * shared and read straight from `weapon-modifiers.json` — duplicating the list
 * would let the two drift apart.
 *
 * What is *not* shared is the effect. A weapon material moves power / crit / hit
 * / weight; an armour material moves armour / magic armour / evade / weight.
 * Those values are not in the repo and are not derivable from the weapon table,
 * so `ARMOR_MATERIAL_MODIFIERS` starts empty and every material resolves to no
 * change. The build records which material was chosen — that part is real and is
 * saved, shared and screenshotted — and the moment true values are filled in
 * here they flow into `evaluateBuild` with no other edit.
 *
 * Populate an entry as, for example:
 *   'Folded Steel': { armor: 2, magicArmor: 0, evade: -1, weight: 1 },
 */
export interface ArmorMaterialModifier {
  armor: number;
  magicArmor: number;
  evade: number;
  weight: number;
}

export const NO_ARMOR_MATERIAL: ArmorMaterialModifier = {
  armor: 0, magicArmor: 0, evade: 0, weight: 0,
};

/** Grouped exactly as the weapon picker groups them. */
export const ARMOR_MATERIAL_CATEGORIES = modifierData.materialCategories as Record<string, string[]>;

export const ARMOR_MATERIAL_NAMES = Object.values(ARMOR_MATERIAL_CATEGORIES).flat();

/**
 * Known armour-side effects, keyed by material name.
 *
 * Deliberately empty: see the note above. Anything absent resolves to
 * `NO_ARMOR_MATERIAL`, so an unfilled table cannot silently alter a build.
 */
export const ARMOR_MATERIAL_MODIFIERS: Partial<Record<string, ArmorMaterialModifier>> = {};

/** Whether any material has real values yet — drives the UI's "not modelled" note. */
export const ARMOR_MATERIALS_MODELLED = Object.keys(ARMOR_MATERIAL_MODIFIERS).length > 0;

export function armorMaterialModifier(name: string | null | undefined): ArmorMaterialModifier {
  if (!name || name === 'None') return NO_ARMOR_MATERIAL;
  return ARMOR_MATERIAL_MODIFIERS[name] ?? NO_ARMOR_MATERIAL;
}
