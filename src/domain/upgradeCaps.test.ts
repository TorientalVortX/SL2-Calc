import { describe, expect, it } from 'vitest';
import { DEFAULT_WORLD, armorUpgradeCaps, clampUpgradePoint, formatUpgradeSpend, weaponUpgradeCaps } from './upgradeCaps';

describe('armour upgrade caps', () => {
  it('caps every channel per armour class', () => {
    expect(armorUpgradeCaps('Heavy')).toMatchObject({ armor: 8, magicArmor: 5, evade: 3 });
    expect(armorUpgradeCaps('Light')).toMatchObject({ armor: 5, magicArmor: 7, evade: 4 });
    expect(armorUpgradeCaps('Unarmored')).toMatchObject({ armor: 3, magicArmor: 5, evade: 8 });
  });

  it('gives every class the same total to spend', () => {
    for (const type of ['Heavy', 'Light', 'Unarmored'] as const) {
      const caps = armorUpgradeCaps(type);
      expect(caps.armor! + caps.magicArmor! + caps.evade!, type).toBe(16);
    }
  });

  it('has no durability channel', () => {
    expect(Object.keys(armorUpgradeCaps('Heavy')).sort()).toEqual(['armor', 'evade', 'magicArmor']);
  });

  it('caps nothing when the armour class is unknown', () => {
    expect(armorUpgradeCaps(undefined, 'G6')).toEqual({ armor: null, magicArmor: null, evade: null });
  });
});

describe('weapon upgrade caps', () => {
  it('caps every channel at five', () => {
    expect(weaponUpgradeCaps('Korvara')).toEqual({ power: 5, critical: 5, accuracy: 5, durability: 5 });
  });

  it('leaves no weapon channel open', () => {
    for (const [channel, cap] of Object.entries(weaponUpgradeCaps())) {
      expect(cap, channel).not.toBeNull();
    }
  });
});

describe('the world bonus', () => {
  it('raises every recorded armour ceiling by one in G6', () => {
    expect(armorUpgradeCaps('Unarmored', 'G6')).toMatchObject({ armor: 4, magicArmor: 6, evade: 9 });
    expect(armorUpgradeCaps('Heavy', 'G6')).toMatchObject({ armor: 9, magicArmor: 6, evade: 4 });
  });

  it('raises every weapon ceiling by one in G6', () => {
    expect(weaponUpgradeCaps('G6')).toEqual({ power: 6, critical: 6, accuracy: 6, durability: 6 });
  });

  it('leaves Korvara at the base ceilings', () => {
    expect(armorUpgradeCaps('Light', 'Korvara')).toMatchObject({ armor: 5, magicArmor: 7, evade: 4 });
    expect(weaponUpgradeCaps('Korvara').power).toBe(5);
  });

  it('defaults to the stricter world', () => {
    expect(DEFAULT_WORLD).toBe('Korvara');
    expect(armorUpgradeCaps('Light')).toEqual(armorUpgradeCaps('Light', 'Korvara'));
    expect(weaponUpgradeCaps()).toEqual(weaponUpgradeCaps('Korvara'));
  });

  it('never raises a channel that has no ceiling', () => {
    expect(armorUpgradeCaps(undefined, 'G6').armor).toBeNull();
  });
});

describe('spending against a cap', () => {
  it('clamps to the cap and to zero', () => {
    expect(clampUpgradePoint(12, 8)).toBe(8);
    expect(clampUpgradePoint(-3, 8)).toBe(0);
    expect(clampUpgradePoint(5, 8)).toBe(5);
  });

  it('only bounds below when there is no cap', () => {
    expect(clampUpgradePoint(99, null)).toBe(99);
    expect(clampUpgradePoint(-1, null)).toBe(0);
  });

  // An emptied number input parses as NaN.
  it('lands a non-finite input on zero rather than propagating it', () => {
    expect(clampUpgradePoint(Number.NaN, 8)).toBe(0);
    expect(clampUpgradePoint(Number.NaN, null)).toBe(0);
    expect(clampUpgradePoint(Number.POSITIVE_INFINITY, 8)).toBe(0);
  });

  it('shows the cap only when one is recorded', () => {
    expect(formatUpgradeSpend(3, 8)).toBe('3 / 8');
    expect(formatUpgradeSpend(3, null)).toBe('3');
  });
});
