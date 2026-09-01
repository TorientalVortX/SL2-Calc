import { describe, expect, it } from 'vitest';
import { SWA_SCALING_MULTIPLIER, calculateWeaponSlot, scaledStatContribution, type WeaponSlotInput } from './weaponCalculation';
import { resolveUpgradePoints, upgradePointsSpent } from '../types';

const zeroModifier = { power: 0, crit: 0, hit: 0, weight: 0 };
const input: WeaponSlotInput = {
  stats: { str: 40, wil: 0, ski: 50, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 20, gui: 15, san: 0, apt: 0 },
  weaponType: 'Sword', effectiveWeaponType: 'Sword', basePower: 10, baseCrit: 5, baseHit: 80,
  baseWeight: 18, baseCritDamage: 125, material: zeroModifier, parts: [zeroModifier, zeroModifier, zeroModifier],
  enchantmentName: 'None', enchantment: { ...zeroModifier, critMod: 0, weightMod: 1 }, upgradePoints: { power: 0, critical: 0, accuracy: 0, durability: 0 },
  rarity: 10, powerQuality: false, critQuality: false, hitQuality: false, weightPlus: true, weightMinus: false,
  sentimentality: false, twoHandedSkillRank: 3, scalingContribution: 40, strScalingContribution: 40,
  hasPrimaryStrScaling: true, enchantmentPowerBonus: 0, enchantmentHitBonus: 0, extraCritChance: 4,
};

describe('weapon slot calculation', () => {
  it('uses the same weight and external critical rules for every slot', () => {
    const first = calculateWeaponSlot(input);
    const second = calculateWeaponSlot({ ...input });
    expect(second).toEqual(first);
    expect(first.weight).toBe(20);
    expect(first.crit).toBe('70%');
  });

  it('doubles two-handed power at twenty weight', () => {
    expect(calculateWeaponSlot(input).twoHandedPowerBonus).toBe(12);
  });

  /*
   * Regression: spears were the one two-handed type that never paid out. Weapon
   * data spells the type `Polearm` while the two-handed rule was written against
   * `Spear`, so swords and axes worked and every spear silently scored zero.
   */
  it('pays the two-handed power bonus to both spellings of a spear', () => {
    const polearm = calculateWeaponSlot({ ...input, weaponType: 'Polearm', effectiveWeaponType: 'Polearm' });
    const spear = calculateWeaponSlot({ ...input, weaponType: 'Spear', effectiveWeaponType: 'Spear' });
    const sword = calculateWeaponSlot(input);

    expect(polearm.twoHandedPowerBonus).toBe(sword.twoHandedPowerBonus);
    expect(spear.twoHandedPowerBonus).toBe(sword.twoHandedPowerBonus);
  });

  it('leaves types with no two-handed power rule alone', () => {
    const dagger = calculateWeaponSlot({ ...input, weaponType: 'Dagger', effectiveWeaponType: 'Dagger' });
    expect(dagger.twoHandedPowerBonus).toBe(0);
  });

  /*
   * Regression: Fated reads "all weapon parameters improve by 3", and improving
   * Weight means lowering it. It was stored as +3 and made its weapon heavier.
   */
  it('never reports negative weight once reducers stack', () => {
    const light = calculateWeaponSlot({
      ...input,
      baseWeight: 2,
      weightPlus: false,
      weightMinus: true,
      enchantmentName: 'Fated',
      enchantment: { power: 3, crit: 3, hit: 3, weight: -3, critMod: 0, weightMod: 1 },
    });
    expect(light.weight).toBe(0);
  });
});

describe('SWA is not Power', () => {
  /*
   * `SWA = Power + Stat Percentages * 1.5`. Power and SWA were the same field,
   * which meant stat scaling was reported as the weapon's own Power and every
   * percentage-of-SWA coefficient was applied to the wrong quantity.
   */
  it('reports Power without stat scaling and SWA with it', () => {
    const result = calculateWeaponSlot(input);
    expect(result.swa).toBe(result.power + input.scalingContribution);
    expect(result.swa).toBeGreaterThan(result.power);
  });

  it('leaves Power untouched when only the scaling changes', () => {
    const scaled = calculateWeaponSlot({ ...input, scalingContribution: 90 });
    const unscaled = calculateWeaponSlot({ ...input, scalingContribution: 0 });

    expect(scaled.power).toBe(unscaled.power);
    expect(scaled.swa - unscaled.swa).toBe(90);
    expect(unscaled.swa).toBe(unscaled.power);
  });

  it('counts the two-handed grip as Power, so scaling stacks on top of it', () => {
    const gripped = calculateWeaponSlot(input);
    const ungripped = calculateWeaponSlot({ ...input, twoHandedSkillRank: 0 });

    expect(gripped.power - ungripped.power).toBe(gripped.twoHandedPowerBonus);
    expect(gripped.swa - ungripped.swa).toBe(gripped.twoHandedPowerBonus);
  });

  it('takes critical SWA off SWA rather than off Power', () => {
    const result = calculateWeaponSlot(input);
    expect(result.critSwa).toBe(Math.floor(result.swa * result.critDamageMod / 100));
  });
});

describe('SWA stat scaling', () => {
  /*
   * The listed percentages are not what lands in the SWA sum: a weapon that
   * reads 70% / 40% behaves as 105% / 60%.
   */
  it('multiplies the listed scaling percentages', () => {
    const stats = { str: 60, ski: 40 };
    expect(scaledStatContribution(stats, { str: 70, ski: 40 })).toBe(Math.floor(60 * 1.05 + 40 * 0.6));
    expect(SWA_SCALING_MULTIPLIER).toBe(1.5);
  });

  it('treats a 100% tag as 150% of the stat', () => {
    expect(scaledStatContribution({ str: 50 }, { str: 100 })).toBe(75);
  });

  it('ignores stats the weapon does not scale off', () => {
    expect(scaledStatContribution({ str: 50, gui: 99 }, { str: 100, gui: 0 })).toBe(75);
  });
});

describe('weapon upgrade points', () => {
  it('spends each channel independently', () => {
    const base = calculateWeaponSlot(input);
    const upgraded = calculateWeaponSlot({
      ...input,
      upgradePoints: { power: 2, critical: 3, accuracy: 4, durability: 1 },
    });

    expect(upgraded.power - base.power).toBe(2);
    expect(upgraded.weaponCritical - base.weaponCritical).toBe(3);
    expect(upgraded.weaponAccuracy - base.weaponAccuracy).toBe(4);
    expect(upgraded.durability - base.durability).toBe(1);
  });

  it('reproduces the legacy blanket upgrade level exactly', () => {
    // `upgradeLevel: N` used to add N to power, crit and hit alike. The migration
    // maps it to N in each of those channels, so an existing build's stats must
    // come out identical.
    const migrated = calculateWeaponSlot({
      ...input,
      upgradePoints: { power: 3, critical: 3, accuracy: 3, durability: 0 },
    });
    const base = calculateWeaponSlot(input);

    expect(migrated.power).toBe(base.power + 3);
    expect(migrated.weaponCritical).toBe(base.weaponCritical + 3);
    expect(migrated.weaponAccuracy).toBe(base.weaponAccuracy + 3);
    expect(migrated.durability).toBe(base.durability);
  });
});

describe('upgrade point migration helpers', () => {
  it('maps a legacy upgradeLevel into the three stat channels', () => {
    expect(resolveUpgradePoints({ upgradeLevel: 4 }))
      .toEqual({ power: 4, critical: 4, accuracy: 4, durability: 0 });
  });

  it('prefers explicit points over the legacy level', () => {
    const points = { power: 1, critical: 0, accuracy: 2, durability: 0 };
    expect(resolveUpgradePoints({ upgradeLevel: 9, upgradePoints: points })).toBe(points);
  });

  it('ignores an upgrade budget left in an older build file', () => {
    // Budgets were removed; a file that still carries one must load unchanged
    // rather than having its points clamped to it.
    const points = { power: 6, critical: 4, accuracy: 3, durability: 2 };
    const legacy = { upgradePoints: points, upgradeBudget: 5 };
    expect(resolveUpgradePoints(legacy)).toBe(points);
    expect(upgradePointsSpent(resolveUpgradePoints(legacy))).toBe(15);
  });
});
