import { describe, expect, it } from 'vitest';
import { NO_ARMOR_QUALITY } from '../types';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import {
  ARMOR_MATERIALS_MODELLED,
  ARMOR_MATERIAL_CATEGORIES,
  ARMOR_QUALITY_TAGS,
  ARMOR_MATERIAL_MODIFIERS,
  ARMOR_MATERIAL_NAMES,
  OTHER_MATERIALS_MODELLED,
  OTHER_MATERIAL_CATEGORIES,
  OTHER_MATERIAL_NAMES,
  NO_ARMOR_MATERIAL,
  armorMaterialModifier,
  armorQualityModifier,
  otherMaterialModifier,
} from './armorMaterials';
import {
  ARMOR_ENCHANTMENT_NAMES,
  ARMOR_ENCHANTMENTS_MODELLED,
  armorEnchantmentEffect,
} from './armorEnchantments';

function armoredBuild() {
  const build = parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Armor fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Mage', characterLevel: 60, food: 'None', history: 'None', hpPercent: 100,
  })).build;
  build.equipment.armorName = 'Breastplate';
  return build;
}

describe('armour materials', () => {
  it('is populated from the wiki rather than empty', () => {
    expect(ARMOR_MATERIALS_MODELLED).toBe(true);
  });

  it('reads the Armor segment, not the Weapon one', () => {
    // Boulder's wiki row is "Weapon: +10 Power, +10 Critical, -5 Accuracy, +25
    // Weight / Armor: +7 Armor, +7 Magic Armor, -10 Evade, +25 Weight".
    const boulder = armorMaterialModifier('Boulder');
    expect(boulder).toMatchObject({ armor: 7, magicArmor: 7, evade: -10, weight: 25 });
    // The weapon-side Power and Critical must not leak across.
    expect(boulder.critical).toBe(0);
  });

  it('captures resistances alongside the armour values', () => {
    // "Armor: +1 Armor, +1 Weight, +5% Ice Resistance"
    expect(armorMaterialModifier('Arctic Gold')).toMatchObject({
      armor: 1, weight: 1, resistances: { Ice: 5 },
    });
  });

  it('offers the Cloth family, which is armour-only', () => {
    // Cloth never appeared before: the list was derived from the weapon table and
    // no cloth material can be crafted into a weapon.
    expect(ARMOR_MATERIAL_CATEGORIES.Cloth?.length).toBe(22);
    expect(ARMOR_MATERIAL_NAMES).toContain('Demonsilk');
    expect(ARMOR_MATERIAL_NAMES).toContain('Chainmail Section');
  });

  it('drops Chapter materials, which craft books rather than armour', () => {
    expect(ARMOR_MATERIAL_CATEGORIES.Chapters).toBeUndefined();
    expect(ARMOR_MATERIAL_NAMES).not.toContain('Paper');
    expect(ARMOR_MATERIAL_NAMES).not.toContain('Sheet Music');
    expect(ARMOR_MATERIAL_NAMES).not.toContain('Aquarian Page');
  });

  it('keeps the hands/legs/accessory profile out of the armour one', () => {
    // The `other` profile is nested on the generated record. Reading the armour
    // side must drop it rather than carry a stray copy of the other values.
    expect(armorMaterialModifier('Arctic Gold')).not.toHaveProperty('other');
    expect(Object.values(ARMOR_MATERIAL_MODIFIERS).every(m => !(m && 'other' in m))).toBe(true);
  });
});

describe('hands, legs and accessory materials', () => {
  it('is populated from the wiki rather than empty', () => {
    expect(OTHER_MATERIALS_MODELLED).toBe(true);
  });

  it('reads the Other segment, not the Armor one', () => {
    // Arctic Gold is "Armor: +1 Armor, +1 Weight, +5% Ice Resistance" but only
    // "Other: +5% Ice Resistance", so a pair of boots gets the resistance alone.
    const arcticGold = otherMaterialModifier('Arctic Gold');
    expect(arcticGold.resistances).toEqual({ Ice: 5 });
    expect(arcticGold.armor).toBe(0);
    expect(arcticGold.weight).toBe(0);
  });

  it('resolves to nothing for a material the wiki gives no Other clause', () => {
    // Boulder is a heavy armour material: "Other: No effect." Borrowing its
    // armour values would invent +7 Armor on a ring.
    expect(otherMaterialModifier('Boulder')).toBe(NO_ARMOR_MATERIAL);
    expect(OTHER_MATERIAL_NAMES).not.toContain('Boulder');
  });

  it('reaches paper accessories, which armour materials do not', () => {
    // The Chapters family crafts tomes and paper accessories such as the
    // Protective Charm, so it appears here but never in the armour list.
    expect(ARMOR_MATERIAL_CATEGORIES.Chapters).toBeUndefined();
    expect(OTHER_MATERIAL_CATEGORIES.Chapters?.length).toBeGreaterThan(0);
  });

  it('is a strictly different list from the armour one', () => {
    expect(OTHER_MATERIAL_NAMES).not.toEqual(ARMOR_MATERIAL_NAMES);
    // Cloth reaches both, so the two lists overlap without being equal.
    expect(OTHER_MATERIAL_NAMES).toContain('Demonsilk');
  });

  it('lists every offered material with a real modifier', () => {
    // Nothing in the picker should silently resolve to no change.
    for (const name of ARMOR_MATERIAL_NAMES) {
      expect(ARMOR_MATERIAL_MODIFIERS[name], `${name} is offered but has no modifier`).toBeDefined();
    }
  });

  it('resolves an unknown or absent material to no change', () => {
    expect(armorMaterialModifier(null)).toMatchObject({ armor: 0, weight: 0 });
    expect(armorMaterialModifier('None')).toMatchObject({ armor: 0, weight: 0 });
    expect(armorMaterialModifier('Not A Material')).toMatchObject({ armor: 0, weight: 0 });
  });
});

describe('armour enchantments', () => {
  it('is populated from the wiki rather than empty', () => {
    expect(ARMOR_ENCHANTMENTS_MODELLED).toBe(true);
  });

  it('reads flat HP and FP grants', () => {
    expect(armorEnchantmentEffect('Leviathan')).toMatchObject({ hp: 60, slots: ['Torso'] });
    expect(armorEnchantmentEffect('Tannin')).toMatchObject({ fp: 60, slots: ['Torso'] });
  });

  it('reads a stat and an elemental attack from one line', () => {
    // "Increases STR by 2 and Fire ATK by 3."
    expect(armorEnchantmentEffect('Fireheart')).toMatchObject({
      stats: { str: 2 }, elementalAttack: { Fire: 3 },
    });
  });

  it('takes the torso figure when a bonus differs per slot', () => {
    // Warding is "Armor: +5 Resistance. Legs: +3 Resistance". Those are
    // alternatives, not a sum, so it must be 5 rather than 8.
    expect(armorEnchantmentEffect('Warding').stats).toEqual({ res: 5 });
  });

  it('offers exactly the wiki enchantments that can go on a torso', () => {
    expect(ARMOR_ENCHANTMENT_NAMES).toEqual([
      'None',
      'Tannin', 'Leviathan', 'Fireheart', 'Iceheart', 'Geoheart', 'Windheart',
      'Aquaheart', 'Thunderheart', 'Darkheart', 'Acidheart', 'Magic Pocket',
      'Warding', 'Winged', 'Boneheart', 'Sweet-Smelling', 'Gigantic', 'Mutation',
      'Flock', 'Volcanic', 'Solid', 'Camouflage', 'Maddening',
    ]);
  });

  it('keeps weapon-only enchantments out of torso calculations', () => {
    expect(ARMOR_ENCHANTMENT_NAMES).not.toContain('Feather');
    expect(armorEnchantmentEffect('Feather')).toEqual(armorEnchantmentEffect('None'));
  });

  it('models shared armor effects from their armor-side wiki text', () => {
    expect(armorEnchantmentEffect('Gigantic')).toMatchObject({
      hpPercent: 10, evade: -10, weightMod: 1.5, slots: ['Torso'],
    });
    expect(armorEnchantmentEffect('Mutation')).toMatchObject({
      weightMod: 1.25, slots: ['Torso'],
    });
  });

  it('does not count conditional bonuses as permanent', () => {
    expect(armorEnchantmentEffect('Camouflage')).toMatchObject({
      stats: { cel: 3 }, evade: 0,
    });
  });

  it('keeps legal prose-only enchantments in the data set', () => {
    expect(armorEnchantmentEffect('Magic Pocket')).toMatchObject({
      slots: ['Torso', 'Legs'],
    });
    expect(armorEnchantmentEffect('Magic Pocket').description).toContain('Item Belt Slot');
  });
});

describe('armour effects reach the build', () => {
  it('raises armour and weight from the material', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).derived;
    build.equipment.armorMaterial = 'Boulder';
    const after = evaluateBuild(build).derived;
    expect(after.armor - before.armor).toBe(7);
    expect(after.magicArmor - before.magicArmor).toBe(7);
    expect(after.evade - before.evade).toBe(-10);
    expect(after.armorWeight).toBeGreaterThan(before.armorWeight);
  });

  it('raises max HP from an enchantment', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).derived.maxHP;
    build.equipment.armorEnchantment = 'Leviathan';
    expect(evaluateBuild(build).derived.maxHP).toBe(before + 60);
  });

  it('raises max FP from an enchantment', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).derived.fp;
    build.equipment.armorEnchantment = 'Tannin';
    expect(evaluateBuild(build).derived.fp).toBe(before + 60);
  });

  it('feeds an enchantment stat bonus into the stat totals', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).rawStats.str;
    build.equipment.armorEnchantment = 'Fireheart';
    expect(evaluateBuild(build).rawStats.str).toBe(before + 2);
  });

  it('applies Gigantic torso HP, Evade, and weight modifiers', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).derived;
    build.equipment.armorEnchantment = 'Gigantic';
    const after = evaluateBuild(build).derived;
    expect(after.maxHP).toBe(Math.floor(before.maxHP * 1.1));
    expect(after.evade).toBe(before.evade - 10);
    expect(after.armorWeight).toBe(Math.floor(before.armorWeight * 1.5));
  });

  it('applies Warding status resistance as well as RES', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).derived.statusResistance;
    build.equipment.armorEnchantment = 'Warding';
    // RES affects magical defense; the separate "Both" clause adds status resistance.
    expect(evaluateBuild(build).derived.statusResistance).toBe(before + 10);
  });

  it('feeds a material resistance into elemental resistance', () => {
    const build = armoredBuild();
    const before = evaluateBuild(build).elementalResistance.Ice;
    build.equipment.armorMaterial = 'Arctic Gold';
    expect(evaluateBuild(build).elementalResistance.Ice).toBe(before + 5);
  });

  it('changes nothing when no material or enchantment is set', () => {
    const build = armoredBuild();
    const plain = evaluateBuild(build).derived;
    build.equipment.armorMaterial = 'None';
    build.equipment.armorEnchantment = 'None';
    expect(evaluateBuild(build).derived).toEqual(plain);
  });
});

describe('torso quality tags', () => {
  /*
   * The armour equivalent of the weapon quality flags, and modelled the same way:
   * independent booleans, with Lightweight and Heavy as the one exclusive pair.
   */
  it('grants each tag its stated bonus', () => {
    expect(armorQualityModifier({ ...NO_ARMOR_QUALITY, solid: true }).armor).toBe(2);
    expect(armorQualityModifier({ ...NO_ARMOR_QUALITY, polished: true }).magicArmor).toBe(2);
    expect(armorQualityModifier({ ...NO_ARMOR_QUALITY, goodFit: true }).evade).toBe(4);
    expect(armorQualityModifier({ ...NO_ARMOR_QUALITY, lightweight: true }).weight).toBe(-2);
    expect(armorQualityModifier({ ...NO_ARMOR_QUALITY, heavy: true }).weight).toBe(2);
  });

  it('cancels Lightweight against Heavy', () => {
    expect(armorQualityModifier({ ...NO_ARMOR_QUALITY, lightweight: true, heavy: true }).weight).toBe(0);
  });

  it('stacks tags that are not the weight pair', () => {
    const both = armorQualityModifier({ ...NO_ARMOR_QUALITY, solid: true, polished: true, goodFit: true });
    expect(both).toMatchObject({ armor: 2, magicArmor: 2, evade: 4, weight: 0 });
  });

  it('is neutral with no tags and with none supplied', () => {
    expect(armorQualityModifier(NO_ARMOR_QUALITY)).toMatchObject({ armor: 0, magicArmor: 0, evade: 0, weight: 0 });
    expect(armorQualityModifier(undefined)).toMatchObject({ armor: 0, magicArmor: 0, evade: 0, weight: 0 });
  });

  it('lists every tag for the interface exactly once', () => {
    const keys = ARMOR_QUALITY_TAGS.map(tag => tag.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(Object.keys(NO_ARMOR_QUALITY).sort());
  });
});
