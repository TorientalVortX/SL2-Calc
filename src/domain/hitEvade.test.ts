import { describe, expect, it } from 'vitest';
import {
  BONUS_EVADE_CAP,
  BONUS_HIT_CAP,
  MAXIMUM_HIT_CHANCE,
  MINIMUM_HIT_CHANCE,
  attackerHit,
  hitChance,
  instanceOdds,
  targetEvade,
} from './hitEvade';

/*
 * The community workbook's default column, which is the one worked example the
 * model can be checked against end to end. A copy is in `reference/hitEvade/`.
 *
 * Attacker: scaled SKI 1, scaled GUI 1, weapon Hit 80.
 * Target:   scaled CEL 1, Unarmored, no armour Evade.
 *
 * The sheet reports base Hit 82, base Evade 7, and hit chances of 75 / 90 / 77.75
 * / 80.5 for base / front / flank-1 / flank-2. Every number below is read off the
 * sheet rather than derived here, so this test fails if the ordering drifts.
 */
const SHEET_ATTACKER = {
  // 2 x scaled SKI (2) + weapon Hit (80). One weapon is off, so no Hand Hit.
  baseHit: 2 * 1 + 80,
  // FLANKING_BASE 5 + 0.5 x scaled GUI 1.
  flanking: 5 + 0.5 * 1,
};
// 2 x scaled CEL (2) + armour Evade (0) + Legs Evade (5).
const SHEET_TARGET = { baseEvade: 2 * 1 + 0 + 5 };

describe('the community sheet worked example', () => {
  it('reproduces its base Hit and Evade', () => {
    expect(attackerHit(SHEET_ATTACKER).preBonus).toBe(82);
    expect(targetEvade(SHEET_TARGET).total).toBe(7);
  });

  it('reproduces its four hit chances', () => {
    const hit = attackerHit(SHEET_ATTACKER);
    const evade = targetEvade(SHEET_TARGET).total;

    expect(hitChance(hit.byTier.base, evade)).toBe(75);
    expect(hitChance(hit.byTier.front, evade)).toBe(90);
    expect(hitChance(hit.byTier.flank1, evade)).toBeCloseTo(77.75);
    expect(hitChance(hit.byTier.flank2, evade)).toBeCloseTo(80.5);
  });

  it('reproduces its single-instance odds table', () => {
    const odds = instanceOdds(75, 1);
    expect(odds.anyHit).toBeCloseTo(0.75);
    expect(odds.anyGlance).toBeCloseTo(0.9375);
    expect(odds.halfHit).toBeCloseTo(0.75);
    expect(odds.halfGlance).toBeCloseTo(0.9375);
    expect(odds.allHit).toBeCloseTo(0.75);
    expect(odds.allGlance).toBeCloseTo(0.9375);

    // The flank-1 row, whose numbers are the least round in the sheet.
    const flank = instanceOdds(77.75, 1);
    expect(flank.anyHit).toBeCloseTo(0.7775);
    expect(flank.anyGlance).toBeCloseTo(0.95049375);
  });
});

describe('attacker Hit ordering', () => {
  /*
   * The bonus multiplier reads the pre-bonus total, never the running total, so
   * Bonus Hit cannot compound on itself. Getting this backwards inflates every
   * build carrying a bonus multiplier.
   */
  it('takes the bonus multiplier off the pre-bonus total', () => {
    const result = attackerHit({ ...SHEET_ATTACKER, bonusMultiplier: 0.5 });
    expect(result.bonusHit).toBe(41);
    expect(result.byTier.base).toBe(123);
  });

  it('caps bonus Hit at fifty however large the sources are', () => {
    const result = attackerHit({ ...SHEET_ATTACKER, hitBuffs: 500 });
    expect(result.bonusHit).toBe(BONUS_HIT_CAP);
  });

  /*
   * Honor is paid out of the remaining cap rather than added on top of it, so a
   * build already at +50 Bonus Hit gains nothing from attacking frontally.
   */
  it('pays Honor out of the remaining bonus cap', () => {
    const roomy = attackerHit(SHEET_ATTACKER);
    expect(roomy.honorHeadroom).toBe(15);
    expect(roomy.byTier.front - roomy.byTier.base).toBe(15);

    const partial = attackerHit({ ...SHEET_ATTACKER, hitBuffs: 40 });
    expect(partial.honorHeadroom).toBe(10);

    const full = attackerHit({ ...SHEET_ATTACKER, hitBuffs: 50 });
    expect(full.honorHeadroom).toBe(0);
    expect(full.byTier.front).toBe(full.byTier.base);
  });

  it('halves the total for a broken weapon, before the bonus channel', () => {
    expect(attackerHit({ ...SHEET_ATTACKER, brokenWeapon: true }).preBonus).toBe(41);
  });

  it('adds the field modifier to base, outside the bonus cap', () => {
    // 20 field Hit on top of an already-capped bonus channel still lands whole.
    const capped = attackerHit({ ...SHEET_ATTACKER, hitBuffs: 500, fieldModifier: 20 });
    const withoutField = attackerHit({ ...SHEET_ATTACKER, hitBuffs: 500 });
    expect(capped.byTier.base - withoutField.byTier.base).toBe(20);
  });

  it('subtracts Fear after the cap, and lets Bravery shrink it', () => {
    const feared = attackerHit({ ...SHEET_ATTACKER, feared: true });
    expect(attackerHit(SHEET_ATTACKER).byTier.base - feared.byTier.base).toBe(15);

    const brave = attackerHit({ ...SHEET_ATTACKER, feared: true, fearResistance: 0.48 });
    expect(attackerHit(SHEET_ATTACKER).byTier.base - brave.byTier.base).toBeCloseTo(7.8);
  });

  it('clamps Fear resistance to Bravery s maximum', () => {
    const overcapped = attackerHit({ ...SHEET_ATTACKER, feared: true, fearResistance: 5 });
    const maxed = attackerHit({ ...SHEET_ATTACKER, feared: true, fearResistance: 0.48 });
    expect(overcapped.byTier.base).toBe(maxed.byTier.base);
  });

  /*
   * Flanking had no consequence at all before this: the stat was computed,
   * displayed and scored, but nothing converted it into Hit.
   */
  it('grants half the Flanking stat per condition met', () => {
    const result = attackerHit({ ...SHEET_ATTACKER, flanking: 20 });
    expect(result.byTier.flank1 - result.byTier.base).toBe(10);
    expect(result.byTier.flank2 - result.byTier.base).toBe(20);
  });
});

describe('target Evade ordering', () => {
  it('caps bonus Evade at fifty', () => {
    expect(targetEvade({ ...SHEET_TARGET, evadeBuffs: 500 }).bonusEvade).toBe(BONUS_EVADE_CAP);
  });

  /*
   * Field Evade is a *bonus* modifier: unlike field Hit, which is base and
   * uncapped. The sheet is explicit about the asymmetry.
   */
  it('counts field Evade toward the cap, unlike field Hit', () => {
    expect(targetEvade({ ...SHEET_TARGET, evadeBuffs: 45, fieldBuffs: 45 }).bonusEvade)
      .toBe(BONUS_EVADE_CAP);
  });

  it('takes the bonus multiplier off base Evade only', () => {
    const result = targetEvade({ baseEvade: 100, bonusMultiplier: 0.25 });
    expect(result.bonusEvade).toBe(25);
    expect(result.total).toBe(125);
  });

  it('applies Knocked Down as a multiplier scaled by torso class', () => {
    const unarmored = targetEvade({ baseEvade: 100, knockedDown: true, armorType: 'Unarmored' });
    const light = targetEvade({ baseEvade: 100, knockedDown: true, armorType: 'Light' });
    const heavy = targetEvade({ baseEvade: 100, knockedDown: true, armorType: 'Heavy' });

    expect(unarmored.total).toBeCloseTo(88);
    expect(light.total).toBeCloseTo(75);
    expect(heavy.total).toBeCloseTo(63);
  });

  it('ignores Knocked Down with no torso class to read a penalty from', () => {
    expect(targetEvade({ baseEvade: 100, knockedDown: true }).total).toBe(100);
  });
});

describe('resolution', () => {
  it('floors the hit chance at five', () => {
    expect(hitChance(10, 900)).toBe(MINIMUM_HIT_CHANCE);
  });

  it('caps at seventy-five while Blind, and at a hundred otherwise', () => {
    expect(hitChance(200, 0, true)).toBe(75);
    expect(hitChance(200, 0, false)).toBe(MAXIMUM_HIT_CHANCE);
  });

  /*
   * The workbook's Hit-versus-Evade cell can read 160 against a low-Evade target,
   * because it only clamps where it converts a chance into a probability. That is
   * a margin, not a chance. The caller shows the raw difference beside it.
   */
  it('never reports more than certainty', () => {
    expect(hitChance(100, -500)).toBe(MAXIMUM_HIT_CHANCE);
    expect(hitChance(101, 0)).toBe(MAXIMUM_HIT_CHANCE);
    expect(hitChance(100, 0)).toBe(MAXIMUM_HIT_CHANCE);
    expect(hitChance(99, 0)).toBe(99);
  });

  it('does not let the Blind cap raise a low chance', () => {
    expect(hitChance(40, 0, true)).toBe(40);
  });
});

describe('multi-instance odds', () => {
  /*
   * Two instances at 50%: one or more lands 75% of the time, both land 25%, and
   * "half or more" is the same as "one or more" because half of two is one.
   */
  it('spreads across instances', () => {
    const odds = instanceOdds(50, 2);
    expect(odds.anyHit).toBeCloseTo(0.75);
    expect(odds.allHit).toBeCloseTo(0.25);
    expect(odds.halfHit).toBeCloseTo(0.75);
  });

  it('gives every instance a second roll for a glance', () => {
    // 2 instances, 4 glance rolls: 1 - 0.5^4.
    expect(instanceOdds(50, 2).anyGlance).toBeCloseTo(0.9375);
  });

  it('never exceeds certainty and never drops below zero', () => {
    for (const chance of [-50, 0, 50, 100, 500]) {
      for (const instances of [1, 2, 6]) {
        for (const value of Object.values(instanceOdds(chance, instances))) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  /*
   * The source workbook writes this threshold as `BINOMDIST((n/2) - 1, ...)`, and
   * Excel truncates that argument, so at three instances it reports the odds of
   * *one* hit under a column labelled "Half+". Rounding up is a deliberate
   * divergence, and it agrees with the sheet everywhere the sheet is right.
   */
  it('rounds the half-or-more threshold up at odd instance counts', () => {
    // 2 of 3 at 50%: three ways to get exactly two, one way to get three.
    expect(instanceOdds(50, 3).halfHit).toBeCloseTo(0.5);
    expect(instanceOdds(50, 3).halfHit).toBeLessThan(instanceOdds(50, 3).anyHit);
    // 3 of 5 at 50% is symmetric about the middle.
    expect(instanceOdds(50, 5).halfHit).toBeCloseTo(0.5);
  });

  it('still agrees with the sheet at even counts and at one', () => {
    // n=1 and n=2 both need one hit, which is what the sheet computes.
    expect(instanceOdds(50, 1).halfHit).toBeCloseTo(instanceOdds(50, 1).anyHit);
    expect(instanceOdds(50, 2).halfHit).toBeCloseTo(0.75);
    // n=4 needs two, matching `BINOMDIST(1, 4, p)`.
    expect(instanceOdds(50, 4).halfHit).toBeCloseTo(0.6875);
  });

  it('never reports half-or-more as more likely than any', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const odds = instanceOdds(40, n);
      expect(odds.halfHit, `n=${n}`).toBeLessThanOrEqual(odds.anyHit + 1e-9);
      expect(odds.allHit, `n=${n}`).toBeLessThanOrEqual(odds.halfHit + 1e-9);
    }
  });

  it('treats a zero or fractional instance count as one', () => {
    expect(instanceOdds(60, 0)).toEqual(instanceOdds(60, 1));
  });

  it('stays exact for the larger instance counts a Gun can reach', () => {
    const odds = instanceOdds(100, 8);
    expect(odds.allHit).toBe(1);
    expect(odds.halfHit).toBeCloseTo(1);
  });
});
