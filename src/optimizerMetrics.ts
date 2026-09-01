import type { OptimizationMetric } from './types';

/**
 * Human labels for every optimizer metric.
 *
 * Shared by the controls rail (the hard-minimums metric picker) and the results
 * column (unmet-minimum messages), so it lives outside both.
 */
export const metricLabels: Record<OptimizationMetric, string> = {
  str: 'Scaled STR', wil: 'Scaled WIL', ski: 'Scaled SKI', cel: 'Scaled CEL', def: 'Scaled DEF', res: 'Scaled RES',
  vit: 'Scaled VIT', fai: 'Scaled FAI', luc: 'Scaled LUC', gui: 'Scaled GUI', san: 'Scaled SAN', apt: 'Scaled APT',
  maxHP: 'Max HP', fp: 'FP', physicalDefense: 'Physical Defense', magicalDefense: 'Magical Defense', evade: 'Evade',
  armor: 'Torso Armor', magicArmor: 'Torso Magic Armor', equipmentLoad: 'Weapon + Torso Weight', battleWeightRemaining: 'Partial Battle Weight Remaining',
  criticalEvade: 'Critical Evade', statusInfliction: 'Status Infliction', statusResistance: 'Status Resistance',
  initiative: 'Initiative', youkaiCap: 'Youkai Cap', flanking: 'Flanking', skillPool: 'Skill Pool',
  luckStatusPercent: 'Luck-Status Chance %',
  battleWeight: 'Battle Weight', encumbrance: 'Encumbrance', weaponPower: 'Weapon Power', weaponHit: 'Weapon Hit',
  weaponCritical: 'Weapon Critical', weaponCriticalDamage: 'Critical Damage',
  weaponSwa: 'Scaled Weapon Attack',
  fireAttack: 'Fire ATK', iceAttack: 'Ice ATK', windAttack: 'Wind ATK', earthAttack: 'Earth ATK', darkAttack: 'Dark ATK',
  waterAttack: 'Water ATK', lightAttack: 'Light ATK', lightningAttack: 'Lightning ATK', acidAttack: 'Acid ATK', soundAttack: 'Sound ATK',
};

export const metricKeys = Object.keys(metricLabels) as OptimizationMetric[];

/** How a weapon or torso slot is constrained during the search. */
export type ItemLockMode = 'all' | 'current' | 'type';
