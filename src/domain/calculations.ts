import type { StatKey, StatRecord } from '../types';

export interface DiminishingReturnsInput {
  racialStat: number;
  addedStat: number;
  classStat: number;
  customStat: number;
  aptitudeBonus: number;
  monoclassModifier?: number;
  dragonBonus?: number;
}

export function calculateDiminishingReturns({
  racialStat,
  addedStat,
  classStat,
  customStat,
  aptitudeBonus,
  monoclassModifier = 1,
  dragonBonus = 0,
}: DiminishingReturnsInput): number {
  const softCap = racialStat + 40 + dragonBonus;
  let total = racialStat + addedStat + classStat * monoclassModifier + customStat + aptitudeBonus;

  if (dragonBonus > 0) total += Math.floor(total * 0.05 * (dragonBonus / 3));
  if (total <= softCap) return total;

  let effective = softCap;
  let remaining = total - softCap;
  let multiplier = 0.9;
  while (remaining > 3) {
    remaining -= 3;
    effective += 3 * multiplier;
    multiplier = Math.max(0.1, multiplier - 0.08);
  }
  return effective + remaining * multiplier;
}

export function calculateRisingGameBonus(hpPercent: number, rank: number): Partial<StatRecord> {
  if (hpPercent > 100) return { str: 0, wil: 0, ski: 0, cel: 0, res: 0, luc: 0 };
  const caps = [0, 2, 3, 4, 5, 6];
  const bonus = Math.min(Math.floor((100 - hpPercent) / 15), caps[rank] ?? 0);
  return { str: bonus, wil: bonus, ski: bonus, cel: bonus, res: bonus, luc: bonus };
}

export function calculateYoukaiCap(baseFaith: number): number {
  return Math.floor(baseFaith / 5) + 5;
}

export function clampAddedStatsToHardCap(
  racialStats: Partial<StatRecord>,
  addedStats: StatRecord,
  customBaseStats: Partial<StatRecord> = {},
  preCapBonuses: Partial<StatRecord> = {},
  hardCap = 80,
): StatRecord {
  return (Object.keys(addedStats) as StatKey[]).reduce<StatRecord>((result, stat) => {
    const nonAllocated = (racialStats[stat] ?? 0) + (customBaseStats[stat] ?? 0) + (preCapBonuses[stat] ?? 0);
    result[stat] = Math.max(0, Math.min(addedStats[stat], hardCap - nonAllocated));
    return result;
  }, { ...addedStats });
}
