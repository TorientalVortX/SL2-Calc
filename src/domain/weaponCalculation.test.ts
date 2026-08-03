import { describe, expect, it } from 'vitest';
import { calculateWeaponSlot, type WeaponSlotInput } from './weaponCalculation';

const zeroModifier = { power: 0, crit: 0, hit: 0, weight: 0 };
const input: WeaponSlotInput = {
  stats: { str: 40, wil: 0, ski: 50, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 20, gui: 15, san: 0, apt: 0 },
  weaponType: 'Sword', effectiveWeaponType: 'Sword', basePower: 10, baseCrit: 5, baseHit: 80,
  baseWeight: 18, baseCritDamage: 125, material: zeroModifier, parts: [zeroModifier, zeroModifier, zeroModifier],
  enchantmentName: 'None', enchantment: { ...zeroModifier, critMod: 0, weightMod: 1 }, upgradeLevel: 0,
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
