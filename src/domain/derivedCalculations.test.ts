import { describe, expect, it } from 'vitest';
import { calculateArmorConditionals, calculateCurrentHealth, calculateElementalAttack, calculateElementalResistance, calculateMaxFocus, calculateMaxHealth } from './derivedCalculations';
import type { Armor, StatRecord } from '../types';

const stats: StatRecord = { str: 40, wil: 24, ski: 10, cel: 10, def: 10, res: 10, vit: 30, fai: 10, luc: 10, gui: 10, san: 12, apt: 0 };

describe('derived character calculations', () => {
  it('calculates HP and current HP in a deterministic order', () => {
    const maximum = calculateMaxHealth({ vit: 30, san: 12, strengthHpBase: 20, pointsSpent: 100, homunculi: false, giantGene: true, fortitude: true, painToleranceRank: 2, warwalk: true, endurance: true, customHP: 5, equipmentHP: 10, normalcyHP: 0, lich: false });
    expect(maximum).toBe(745);
    expect(calculateCurrentHealth(maximum, 125)).toBe(931);
  });

  it('calculates homunculi and Lich FP modifiers', () => {
    expect(calculateMaxFocus({ wil: 20, san: 10, fai: 10, homunculi: true, warwalk: false, customFP: 0, equipmentFP: 0, lich: true })).toBe(263);
  });

  it('collects only enabled armor conditionals', () => {
    const armor = { id: 'armor:test', name: 'Test', armor: 0, magicArmor: 0, evade: 0, weight: 0, type: 'Light', rarity: 1, conditionalBonuses: { stance: { str: 3, evade: 5, hp: 20, condition: 'Testing' } } } satisfies Armor;
    expect(calculateArmorConditionals(armor, { stance: true })).toEqual({ stats: { str: 3 }, evade: 5, critical: 0, hp: 20, fp: 0 });
  });

  it('handles normal, Luminary, racial, and resistance elemental rules', () => {
    expect(calculateElementalAttack({ element: 'Fire', stats, rawWill: 30, luminaryElement: false, starsignElement: null, matchingPlanet: false, manualAdjustment: 0, subrace: 'Imperialist', characterLevel: 60 })).toBe(46);
    expect(calculateElementalAttack({ element: 'Fire', stats, rawWill: 30, luminaryElement: true, starsignElement: 'Fire', matchingPlanet: true, manualAdjustment: 1, subrace: 'Imperialist', characterLevel: 60 })).toBe(33);
    expect(calculateElementalResistance({ element: 'Fire', san: 12, manualAdjustment: 1, raceAdjustment: -5, armorAdjustment: 4 })).toBe(2);
  });
});

describe('vitals cannot go negative', () => {
  /*
   * Reachable through a large enough debuff or manual override: a post-softcap
   * VIT buff of -400 drove Max HP to about -3900, and every readout downstream
   * (current HP included) then reported a nonsense quantity rather than a very
   * fragile character.
   */
  const health = {
    vit: -400, san: 0, strengthHpBase: 0, pointsSpent: 0, homunculi: false, giantGene: false,
    fortitude: false, painToleranceRank: 0, warwalk: false, endurance: false,
    customHP: 0, equipmentHP: 0, normalcyHP: 0, lich: false,
  };

  it('floors Max HP at zero', () => {
    expect(calculateMaxHealth(health)).toBe(0);
  });

  it('floors Max HP against a negative manual override too', () => {
    expect(calculateMaxHealth({ ...health, vit: 10, customHP: -9999 })).toBe(0);
  });

  it('still reports a real figure for an ordinary build', () => {
    expect(calculateMaxHealth({ ...health, vit: 40 })).toBeGreaterThan(0);
  });

  it('floors Max FP at zero', () => {
    expect(calculateMaxFocus({
      wil: -400, san: 0, fai: 0, homunculi: false, warwalk: false,
      customFP: 0, equipmentFP: 0, lich: false,
    })).toBe(0);
  });

  it('leaves current HP at zero when Max HP is', () => {
    expect(calculateCurrentHealth(calculateMaxHealth(health), 100)).toBe(0);
  });
});
