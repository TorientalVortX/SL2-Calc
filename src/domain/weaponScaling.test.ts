import { describe, expect, it } from 'vitest';
import { applyScalingTags, effectiveScaling, mainScalingStat, scalingTagsFor } from './weaponScaling';
import { evaluateWeaponSlot } from './buildEvaluation';
import { weaponToConfig, findWeaponByName } from './equipment';
import type { StatRecord, WeaponConfig } from '../types';

/** Finesse: the common two-tag shape, 70% main / 30% secondary. */
const FINESSE = { str: 70, ski: 30 };
/** Basic: one tag at 100%. */
const BASIC = { str: 100 };
/** A weapon whose main stat is not STR, for the Mastery rule. */
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
  /*
   * "Removes all scaling tags from the weapon, except for purely negative ones."
   * The calculator used to ignore this outright, so a Mundane weapon returned
   * exactly the same SWA as an unenchanted one.
   */
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
  /*
   * Percentage points, not a relative cut: a Finesse weapon's 70 becomes 60, not
   * 63. See the module docstring for why.
   */
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

  /*
   * A reduction floors at zero rather than inverting the stat. Unreachable from
   * weapon data (the lowest main scaling in the dataset is 40%) but reachable
   * through the manual scaling override.
   */
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

  /*
   * Its only source is Arcane Tattoo (Fist), which enhances the *unarmed* weapon.
   * No unarmed weapon exists in the dataset, so the tag is unreachable in
   * practice. The transform is here so it works the moment one is added.
   */
  it('is granted by the Arcane Tattoo (Fist) trait', () => {
    expect(scalingTagsFor({ enchantment: 'None', part1: 'None', part2: 'None', part3: 'None' }, ['arcane-tattoo-fist']))
      .toContain('Magical');
  });
});

describe('Short Body', () => {
  /*
   * "Gains Shortbow weapon type and primary scaling stat is changed to STR."
   * Repointed, not duplicated: the part changes which stat is read.
   */
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

  /*
   * The reachable case: Crossbow and Howling Handshot are the dataset's two
   * SKI-primary bows, and Short Body is a bow part.
   */
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

  /*
   * Asked last, so it reads the main stat *after* the other tags have moved it.
   * Short Body makes a SKI weapon STR-primary, which disqualifies it from Mastery.
   */
  it('reads the main stat after Short Body has moved it', () => {
    const result = applyScalingTags({ ski: 100 }, ['ShortBody', 'MasteryOfWeaponArts']);
    expect(result.str).toBe(100);
  });

  it('applies once Mundane has removed the STR tag', () => {
    // Nothing scales after Mundane, so the main stat is not STR and Mastery pays.
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
