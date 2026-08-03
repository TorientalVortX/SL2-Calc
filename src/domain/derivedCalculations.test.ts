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
