import { describe, expect, it } from 'vitest';
import {
  summarizeArmorEnchantment,
  summarizeArmorMaterial,
  summarizeModifier,
  summarizeWeaponModifier,
} from './modifierSummary';

const text = (parts: Array<{ label: string; value: string }>) => parts.map(part => `${part.value} ${part.label}`);

describe('summarising a torso material', () => {
  /*
   * The pair from the reported screenshot: both were chosen from a dropdown that
   * said nothing about either, so comparing them meant reading the rail three
   * panels away twice.
   */
  it('reads out Breezecloth', () => {
    expect(text(summarizeArmorMaterial('Breezecloth'))).toEqual(['+5 Evade', '+5% Wind Res.', '-2 Weight']);
  });

  it('reads out a material that costs weight', () => {
    expect(text(summarizeArmorMaterial('Arctic Gold'))).toEqual(['+1 Armor', '+5% Ice Res.', '+1 Weight']);
  });

  it('is empty for no material', () => {
    expect(summarizeArmorMaterial('None')).toEqual([]);
    expect(summarizeArmorMaterial(null)).toEqual([]);
    expect(summarizeArmorMaterial(undefined)).toEqual([]);
  });

  /*
   * Distinct from "nothing chosen": a material the dataset knows but which carries
   * no numbers on a torso. The interface says so rather than rendering a blank.
   */
  it('is empty for a material with no modelled torso effect', () => {
    expect(summarizeArmorMaterial('Cloth')).toEqual([]);
  });
});

describe('summarising a torso enchantment', () => {
  it('reads out Tannin, numbers and prose', () => {
    const summary = summarizeArmorEnchantment('Tannin');
    expect(text(summary.parts)).toEqual(['+60 FP']);
    expect(summary.description).toContain('60');
  });

  it('reads out a multiplier and a percentage together', () => {
    const summary = summarizeArmorEnchantment('Gigantic');
    expect(text(summary.parts)).toEqual(['-10 Evade', '+10% Max HP', 'x1.5 Weight']);
  });

  it('reads out stat grants', () => {
    expect(text(summarizeArmorEnchantment('Winged').parts)).toEqual(['+2 SAN', '+2 CEL']);
  });

  it('is empty for no enchantment', () => {
    expect(summarizeArmorEnchantment('None')).toEqual({ parts: [], description: '' });
  });
});

describe('which way a part reads', () => {
  /*
   * Weight is the one inversion: carrying more of it is the cost. Everything else
   * follows its sign, so a negative Evade reads as bad and a positive one as good.
   */
  it('treats less weight as a gain and more as a cost', () => {
    expect(summarizeModifier({ weight: -2 })[0].tone).toBe('good');
    expect(summarizeModifier({ weight: 2 })[0].tone).toBe('bad');
    expect(summarizeModifier({ weightMod: 1.5 })[0].tone).toBe('bad');
    expect(summarizeModifier({ weightMod: 0.5 })[0].tone).toBe('good');
  });

  it('follows the sign everywhere else', () => {
    expect(summarizeModifier({ evade: 5 })[0].tone).toBe('good');
    expect(summarizeModifier({ evade: -5 })[0].tone).toBe('bad');
  });

  it('omits a channel sitting at its neutral value', () => {
    expect(summarizeModifier({ armor: 0, evade: 0, weightMod: 1 })).toEqual([]);
  });

  it('is empty for nothing at all', () => {
    expect(summarizeModifier(undefined)).toEqual([]);
    expect(summarizeModifier({})).toEqual([]);
  });
});

describe('summarising a weapon modifier', () => {
  it('reads out the weapon channels', () => {
    expect(text(summarizeWeaponModifier({ power: 3, crit: 3, hit: 3, weight: -3 })))
      .toEqual(['+3 Power', '+3 Critical', '+3 Hit', '-3 Weight']);
  });

  it('marks the critical modifier as a percentage', () => {
    expect(text(summarizeWeaponModifier({ critMod: 5 }))).toEqual(['+5% Crit Damage']);
  });

  it('shows a weight multiplier as a multiplier', () => {
    expect(text(summarizeWeaponModifier({ weightMod: 1.25 }))).toEqual(['x1.25 Weight']);
  });

  it('is empty for an unmodified record', () => {
    expect(summarizeWeaponModifier({ power: 0, crit: 0, hit: 0, weight: 0, weightMod: 1 })).toEqual([]);
  });
});
