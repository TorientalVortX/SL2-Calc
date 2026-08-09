import { describe, expect, it } from 'vitest';
import { calculateWeaponSlot, type WeaponSlotInput } from './weaponCalculation';
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
