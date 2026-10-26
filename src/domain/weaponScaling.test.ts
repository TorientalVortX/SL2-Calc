import { describe, expect, it } from 'vitest';
import { applyScalingTags, effectiveScaling, mainScalingStat, scalingTagsFor } from './weaponScaling';
import { evaluateWeaponSlot } from './buildEvaluation';
import { weaponToConfig, findWeaponByName } from './equipment';
import type { StatRecord, WeaponConfig } from '../types';

const FINESSE = { str: 70, ski: 30 };
const BASIC = { str: 100 };
const GUILE = { gui: 70, ski: 30 };

const stats: StatRecord = {
  str: 60, wil: 60, ski: 40, cel: 0, def: 0, res: 0,
  vit: 0, fai: 0, luc: 0, gui: 60, san: 0, apt: 0,
};

function config(over: Partial<WeaponConfig> = {}): WeaponConfig {
  return { ...weaponToConfig(findWeaponByName('Longsword')!), ...over };
}

describe('the main scaling stat', () => {
  it('is the highest tag', () => {
    expect(mainScalingStat(FINESSE)).toBe('str');
    expect(mainScalingStat(GUILE)).toBe('gui');
  });

  it('is null when nothing scales', () => {
    expect(mainScalingStat({})).toBeNull();
    expect(mainScalingStat({ str: 0 })).toBeNull();
  });

  it('ignores negative tags when picking the main stat', () => {
    expect(mainScalingStat({ str: -50, ski: 30 })).toBe('ski');
  });
});

describe('Mundane', () => {
  // "Removes all scaling tags from the weapon, except for purely negative ones."
  it('strips every positive tag', () => {
    const result = applyScalingTags(FINESSE, ['Mundane']);
    expect(result.str).toBe(0);
    expect(result.ski).toBe(0);
  });

  it('keeps a purely negative tag', () => {
    const result = applyScalingTags({ str: 70, vit: -20 }, ['Mundane']);
    expect(result.str).toBe(0);
    expect(result.vit).toBe(-20);
  });

  it('drops the weapon to Power alone in the evaluation', () => {
    const plain = evaluateWeaponSlot(config(), stats);
    const mundane = evaluateWeaponSlot(config({ enchantment: 'Mundane' }), stats);

    expect(mundane.swa).toBe(mundane.power);
    expect(plain.swa).toBeGreaterThan(plain.power);
  });
});

describe('Alterated', () => {
  // Percentage points, not a relative cut: 70 becomes 60, not 63.
  it('takes ten points off the main stat only', () => {
    const result = applyScalingTags(FINESSE, ['Alterated']);
    expect(result.str).toBe(60);
    expect(result.ski).toBe(30);
  });

  it('is granted by each enchantment that states it', () => {
    for (const enchantment of ['Arcane', 'Envenomed', 'Enflamed']) {
      expect(scalingTagsFor({ enchantment, part1: 'None', part2: 'None', part3: 'None' }), enchantment)
        .toContain('Alterated');
    }
  });

  // Unreachable from weapon data (lowest main scaling is 40%) but reachable via the manual override.
  it('floors the reduction at zero instead of going negative', () => {
    expect(applyScalingTags({ str: 5 }, ['Alterated']).str).toBe(0);
    expect(applyScalingTags({ str: 20 }, ['Magical']).str).toBe(0);
    expect(applyScalingTags({ str: 40 }, ['Alterated']).str).toBe(30);
  });

  it('lowers SWA through the evaluation', () => {
    const plain = evaluateWeaponSlot(config(), stats);
    const arcane = evaluateWeaponSlot(config({ enchantment: 'Arcane' }), stats);
    expect(arcane.swa).toBeLessThan(plain.swa);
  });
});

describe('Magical', () => {
  it('takes thirty points off the main stat and adds forty WIL', () => {
    const result = applyScalingTags(BASIC, ['Magical']);
    expect(result.str).toBe(70);
    expect(result.wil).toBe(40);
  });

  // Arcane Tattoo (Fist) enhances the unarmed weapon, which the dataset doesn't have yet.
  it('is granted by the Arcane Tattoo (Fist) trait', () => {
    expect(scalingTagsFor({ enchantment: 'None', part1: 'None', part2: 'None', part3: 'None' }, ['arcane-tattoo-fist']))
      .toContain('Magical');
  });
});

describe('Short Body', () => {
  // "Gains Shortbow weapon type and primary scaling stat is changed to STR."
  it('moves the primary tag onto STR', () => {
    const result = applyScalingTags({ ski: 100 }, ['ShortBody']);
    expect(result.str).toBe(100);
    expect(result.ski).toBe(0);
  });

  it('leaves the secondary tag where it is', () => {
    const result = applyScalingTags(GUILE, ['ShortBody']);
    expect(result.str).toBe(70);
    expect(result.gui).toBe(0);
    expect(result.ski).toBe(30);
  });

  // Crossbow and Howling Handshot are the dataset's two SKI-primary bows.
  it('repoints a real SKI-primary bow onto STR', () => {
    const crossbow = findWeaponByName('Crossbow')!;
    const printed = effectiveScaling(weaponToConfig(crossbow));
    const shortened = effectiveScaling({ ...weaponToConfig(crossbow), part1: 'Short Body' });

    expect(printed.ski).toBeGreaterThan(0);
    expect(shortened.ski).toBe(0);
    expect(shortened.str).toBe(printed.ski);
  });

  it('is a no-op on a weapon already scaling off STR', () => {
    expect(applyScalingTags(BASIC, ['ShortBody'])).toMatchObject({ str: 100 });
  });

  it('is picked up from any of the three part slots', () => {
    expect(scalingTagsFor({ enchantment: 'None', part1: 'None', part2: 'Short Body', part3: 'None' }))
      .toContain('ShortBody');
  });
});

describe('Mastery of Weapon Arts', () => {
  it('adds STR scaling to a weapon that is not STR-primary', () => {
    const result = applyScalingTags(GUILE, ['MasteryOfWeaponArts']);
    expect(result.str).toBe(15);
    expect(result.gui).toBe(70);
  });

  it('does nothing to a weapon already STR-primary', () => {
    expect(applyScalingTags(BASIC, ['MasteryOfWeaponArts']).str).toBe(100);
  });

  it('reads the main stat after Short Body has moved it', () => {
    const result = applyScalingTags({ ski: 100 }, ['ShortBody', 'MasteryOfWeaponArts']);
    expect(result.str).toBe(100);
  });

  it('applies once Mundane has removed the STR tag', () => {
    const result = applyScalingTags(BASIC, ['Mundane', 'MasteryOfWeaponArts']);
    expect(result.str).toBe(15);
  });
});

describe('tags in combination', () => {
  it('stacks Alterated onto a Short Body repoint', () => {
    const result = applyScalingTags({ ski: 100 }, ['ShortBody', 'Alterated']);
    expect(result.str).toBe(90);
  });

  it('applies Mundane before Alterated, leaving nothing to reduce', () => {
    const result = applyScalingTags(FINESSE, ['Mundane', 'Alterated']);
    expect(result.str).toBe(0);
    expect(result.ski).toBe(0);
  });

  it('leaves an untagged weapon exactly as printed', () => {
    const printed = { ...findWeaponByName('Longsword')! };
    const result = effectiveScaling(config());
    expect(result.str).toBe(100);
    expect(printed.name).toBe('Longsword');
  });
});
