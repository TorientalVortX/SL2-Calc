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

/**
 * The Redtail dice.
 *
 * All three colours share one shape, which is why they share one function. The
 * wiki writes it as "1x (+1x 10 Scaled SAN, max. 5x) per your Fortune Level",
 * with a penalty branch: "if your Fortune Level is one, you instead suffer -5
 * (plus -5 per 10 Scaled SAN)".
 *
 * Two readings had to be fixed to make this computable:
 *
 * - The 5x cap is stated on the bonus and not restated on the penalty. It is
 *   applied to both, since the multiplier is one quantity and an uncapped
 *   penalty against a capped bonus is the less likely reading.
 * - Green improves the *chance* to apply and avoid luck-based statuses, which is
 *   not the flat `statusInfliction` / `statusResistance` the calculator tracks.
 *   It is returned on its own field rather than folded into those, so a green
 *   Redtail does not silently inflate two unrelated numbers.
 */
export interface RedtailFortune {
  /** Red: added to weapon Hit and Critical. */
  hit: number;
  critical: number;
  /** Yellow: added to Evade and Critical Evade. */
  evade: number;
  criticalEvade: number;
  /** Green: percentage points on luck-based status apply/avoid chance. */
  luckStatusPercent: number;
  /** The 1x–5x SAN multiplier, reported so the UI can explain the number. */
  multiplier: number;
}

export const NO_REDTAIL_FORTUNE: RedtailFortune = {
  hit: 0, critical: 0, evade: 0, criticalEvade: 0, luckStatusPercent: 0, multiplier: 0,
};

export function calculateRedtailFortune(input: {
  subrace: string;
  diceColor: 'red' | 'green' | 'yellow';
  fortuneLevel: number;
  scaledSan: number;
}): RedtailFortune {
  if (input.subrace !== 'Redtail') return NO_REDTAIL_FORTUNE;
  const level = Math.max(1, Math.min(6, Math.floor(input.fortuneLevel || 1)));
  const multiplier = Math.min(5, 1 + Math.floor(Math.max(0, input.scaledSan) / 10));
  // Fortune Level 1 is the bad roll: the same multiplier, applied as -5 a step.
  const value = level === 1 ? -5 * multiplier : multiplier * level;
  if (input.diceColor === 'green') return { ...NO_REDTAIL_FORTUNE, luckStatusPercent: value, multiplier };
  if (input.diceColor === 'yellow') return { ...NO_REDTAIL_FORTUNE, evade: value, criticalEvade: value, multiplier };
  return { ...NO_REDTAIL_FORTUNE, hit: value, critical: value, multiplier };
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
  /*
   * Never negative. A large enough debuff or manual override (a post-softcap VIT
   * buff of -400, say) drove this below zero, and a negative Max HP is not a
   * quantity: every readout downstream, current HP included, then reported
   * nonsense rather than a very fragile character.
   */
  return Math.max(0, hp);
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
  /** Max FP from talents (Capacity's Depth), kept apart from equipment's share. */
  talentFP?: number;
  lich: boolean;
}

export function calculateMaxFocus(input: FocusInput): number {
  let willFP = Math.floor(input.wil * 5);
  if (input.homunculi) willFP += Math.floor(input.wil);
  let fp = willFP + Math.floor(input.san * 2) + Math.floor(input.fai * 3);
  if (input.warwalk) fp += 30;
  fp += input.customFP + input.equipmentFP + (input.talentFP ?? 0);
  if (input.lich) fp = Math.floor(fp * (1 + (50 + Math.floor(input.san / 2)) / 100));
  // Floored for the same reason as Max HP.
  return Math.max(0, fp);
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
