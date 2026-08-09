import { describe, expect, it } from 'vitest';
import { calculateDiminishingReturns, calculateRisingGameBonus, calculateYoukaiCap, clampAddedStatsToHardCap } from './calculations';

describe('stat calculations', () => {
  it('keeps totals below the soft cap unchanged', () => {
    expect(calculateDiminishingReturns({ racialStat: 4, addedStat: 20, classStat: 2, customStat: 0, aptitudeBonus: 6, monoclassModifier: 2 })).toBe(34);
  });

  it('applies diminishing returns above racial base plus forty', () => {
    expect(calculateDiminishingReturns({ racialStat: 4, addedStat: 50, classStat: 0, customStat: 0, aptitudeBonus: 0 })).toBeCloseTo(52.04, 2);
  });

  it('does not make Rising Game negative above full HP', () => {
    expect(calculateRisingGameBonus(125, 5).str).toBe(0);
  });

  it('caps Rising Game by rank', () => {
    expect(calculateRisingGameBonus(1, 2).str).toBe(3);
  });

  it('calculates Youkai capacity from pre-scaling faith', () => {
    expect(calculateYoukaiCap(24)).toBe(9);
  });

  it('returns excess allocated points when the hard cap changes', () => {
    const stats = { str: 75, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
    expect(clampAddedStatsToHardCap({ str: 8 }, stats).str).toBe(72);
  });
});
