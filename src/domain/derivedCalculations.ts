import type { Armor, ElementKey, StatKey, StatRecord } from '../types';

const STAT_KEYS = new Set<StatKey>(['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt']);

export function calculateArmorConditionals(
  armor: Armor | null,
  enabled: Record<string, boolean>,
): { stats: Partial<StatRecord>; evade: number; critical: number; hp: number; fp: number } {
  const result = { stats: {} as Partial<StatRecord>, evade: 0, critical: 0, hp: 0, fp: 0 };
  for (const [key, bonus] of Object.entries(armor?.conditionalBonuses ?? {})) {
    if (!enabled[key]) continue;
    for (const [field, value] of Object.entries(bonus)) {
      if (typeof value !== 'number') continue;
      if (field === 'evade' || field === 'critical' || field === 'hp' || field === 'fp') result[field] += value;
      else if (STAT_KEYS.has(field as StatKey)) result.stats[field as StatKey] = (result.stats[field as StatKey] ?? 0) + value;
    }
  }
  return result;
}

export interface HealthInput {
  vit: number;
  san: number;
  strengthHpBase: number;
  pointsSpent: number;
  homunculi: boolean;
  giantGene: boolean;
  fortitude: boolean;
  painToleranceRank: number;
  warwalk: boolean;
  endurance: boolean;
  customHP: number;
  equipmentHP: number;
  normalcyHP: number;
  lich: boolean;
}

export function calculateMaxHealth(input: HealthInput): number {
  let vitalityHP = Math.floor(input.vit * 10);
  if (input.homunculi) vitalityHP -= Math.floor(input.vit / 2);
  let hp = vitalityHP + Math.floor(input.san * 2) + input.strengthHpBase * 3 + input.pointsSpent;
  if (input.giantGene) hp = Math.floor(hp * 1.1);
  if (input.fortitude) hp += Math.floor(hp * 0.1);
  hp += input.painToleranceRank * 10;
  if (input.warwalk) hp += 30;
  if (input.endurance) hp = Math.floor(hp * 1.15);
  hp += input.customHP + input.equipmentHP + input.normalcyHP;
  if (input.lich) hp = Math.floor(hp * (1 - Math.max(0, 30 - Math.floor(input.san / 2)) / 100));
  return hp;
}

export function calculateCurrentHealth(maxHP: number, hpPercent: number): number {
  return Math.floor(maxHP * Math.max(0, hpPercent) / 100);
}

export interface FocusInput {
  wil: number;
  san: number;
  fai: number;
  homunculi: boolean;
  warwalk: boolean;
  customFP: number;
  equipmentFP: number;
  lich: boolean;
}

export function calculateMaxFocus(input: FocusInput): number {
  let willFP = Math.floor(input.wil * 5);
  if (input.homunculi) willFP += Math.floor(input.wil);
  let fp = willFP + Math.floor(input.san * 2) + Math.floor(input.fai * 3);
  if (input.warwalk) fp += 30;
  fp += input.customFP + input.equipmentFP;
  if (input.lich) fp = Math.floor(fp * (1 + (50 + Math.floor(input.san / 2)) / 100));
  return fp;
}

const ELEMENT_STATS: Record<ElementKey, StatKey> = {
  Fire: 'str', Ice: 'ski', Wind: 'cel', Earth: 'def', Dark: 'res',
  Water: 'vit', Light: 'fai', Lightning: 'luc', Acid: 'gui', Sound: 'san',
};

export function calculateElementalAttack(input: {
  element: ElementKey;
  stats: StatRecord;
  rawWill: number;
  luminaryElement: boolean;
  starsignElement: ElementKey | null;
  matchingPlanet: boolean;
  manualAdjustment: number;
  subrace: string;
  characterLevel: number;
}): number {
  const planetBonus = input.matchingPlanet ? 2 : 0;
  if (input.subrace === 'Theno' && input.element === 'Sound') {
    return Math.floor(input.characterLevel + planetBonus + input.manualAdjustment);
  }
  const isLuminaryElement = input.luminaryElement && input.starsignElement === input.element;
  const statBonus = isLuminaryElement ? 0 : input.stats[ELEMENT_STATS[input.element]];
  const willBonus = isLuminaryElement
    ? input.rawWill
    : (!input.luminaryElement && input.element !== 'Sound' && input.element !== 'Acid' ? Math.floor(input.stats.wil / 4) : 0);
  const raceBonus = input.subrace === 'Umbral' && input.element === 'Dark' ? Math.min(15, Math.floor(input.characterLevel / 2)) : 0;
  return Math.floor(statBonus + willBonus + planetBonus + input.manualAdjustment + raceBonus);
}

export function calculateElementalResistance(input: {
  element: ElementKey;
  san: number;
  manualAdjustment: number;
  raceAdjustment: number;
  armorAdjustment: number;
}): number {
  const sanityResistance = input.element === 'Sound' || input.element === 'Acid' ? 0 : Math.floor(input.san / 6);
  return Math.floor(sanityResistance + input.manualAdjustment + input.raceAdjustment + input.armorAdjustment);
}
