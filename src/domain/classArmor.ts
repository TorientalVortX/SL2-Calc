import type { ClassConfig, StatKey } from '../types';
import { CLASS_HIERARCHY } from '../data/classes';

// "If your main class is a Mage class, the stat bonuses it gives you are increased by 50% (min. 1 if >0)."
const CLASS_ARMOR: Record<string, string> = {
  "Caster's Cape": 'Mage',
  "Farmer's Shirt": 'Martial Artist',
  "Healer's Shroud": 'Curate',
};

export function classArmorApplies(armorName: string | null | undefined, mainClass: string): boolean {
  const family = armorName ? CLASS_ARMOR[armorName] : undefined;
  if (!family) return false;
  return family === mainClass || Boolean(CLASS_HIERARCHY[family]?.subClasses.includes(mainClass));
}

export function boostedClassStats<Stats extends Partial<ClassConfig>>(stats: Stats): Stats {
  const boosted = { ...stats };
  for (const [stat, value] of Object.entries(stats)) {
    if (typeof value === 'number' && value > 0) (boosted as Record<StatKey, number>)[stat as StatKey] = value + Math.max(1, Math.floor(value / 2));
  }
  return boosted;
}
