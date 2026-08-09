import { describe, expect, it } from 'vitest';
import { inferOptimizationIntentContract } from './optimizationIntent';

describe('optimizer intent contract parsing', () => {
  it('extracts stronger Youkai requirements and exact mixed elemental formulas', () => {
    const contract = inferOptimizationIntentContract('We need to support having at least 8 youkai. Skills use either 250% Fire attack or 100% SWA + 150% Fire Attack.');
    expect(contract.constraints).toContainEqual({ metric: 'youkaiCap', minimum: 8 });
    expect(contract.damageProfile?.skills).toEqual([
      { label: '250% Fire ATK', swaPercent: 0, element: 'Fire', elementalAttackPercent: 250, weight: 1 },
      { label: '100% SWA + 150% Fire ATK', swaPercent: 100, element: 'Fire', elementalAttackPercent: 150, weight: 1 },
    ]);
  });

  it('extracts explicit critical minimums without treating qualitative critical language as a number', () => {
    expect(inferOptimizationIntentContract('at least 80% critical chance').constraints).toContainEqual({ metric: 'weaponCritical', minimum: 80 });
    expect(inferOptimizationIntentContract('focus on critical chance but not critical damage').constraints).toEqual([]);
  });
});
