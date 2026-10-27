import type { BuildState, ElementKey, ElementalRecord, StatRecord } from '../../types';
import { PHYSICAL_KEYS } from '../../types';
import { PLANET_ELEMENTS } from '../../data/bonuses';
import { RACE_RESISTANCES } from '../../data/races';
import { calculateElementalAttack, calculateElementalResistance } from '../derivedCalculations';
import type { EvaluationInputs } from './inputs';
import type { StatsResult } from './stats';
import { ELEMENT_KEYS, emptyElements } from './shared';

function raceResistances(build: BuildState, stats: StatRecord): ElementalRecord {
  const base = { ...emptyElements(), ...(RACE_RESISTANCES[build.subrace] ?? {}) };
  if (build.subrace === 'Umbral') return { ...emptyElements(), Dark: Math.floor(Math.max(0, 25 - stats.san)), Light: Math.floor(Math.min(0, -25 + stats.san)) };
  if (build.subrace === 'Papilion') return { ...emptyElements(), Wind: Math.floor(Math.max(0, 30 - stats.san)), Earth: Math.floor(Math.min(0, -30 + stats.san)) };
  if (build.subrace === 'Vampire') return build.sanguineCrest ? { ...emptyElements(), Dark: 25, Light: -25 } : emptyElements();
  if (build.subrace === 'Karakuri') {
    const pairs: Record<string, [ElementKey, ElementKey]> = {
      Avian: ['Wind', 'Lightning'], Beast: ['Lightning', 'Fire'], Dragon: ['Fire', 'Wind'], Fairy: ['Light', 'Dark'],
      Mystic: ['Ice', 'Earth'], Night: ['Dark', 'Light'], Plant: ['Earth', 'Ice'],
    };
    const pair = pairs[build.karakuriYoukai];
    return pair ? { ...emptyElements(), [pair[0]]: 15, [pair[1]]: -15 } : emptyElements();
  }
  return base;
}

export function resolveElements(inputs: EvaluationInputs, stats: StatsResult) {
  const { build, armor, armorMaterial, armorEnchant, items, talents, mixtureBonuses, youkaiBonuses, gearBonus, weaponMaterial } = inputs;
  const { scaledStats, rawStats, skills } = stats;

  const raceResistance = raceResistances(build, scaledStats);
  const elementalAttack = emptyElements();
  const elementalResistance = emptyElements();
  const starsignElement = build.astrology ? PLANET_ELEMENTS[build.astrology] as ElementKey : null;
  for (const element of ELEMENT_KEYS) {
    elementalAttack[element] = calculateElementalAttack({
      element,
      stats: scaledStats,
      rawWill: rawStats.wil,
      luminaryElement: build.luminaryElement,
      starsignElement,
      matchingPlanet: Boolean(build.astrology && starsignElement === element),
      manualAdjustment: build.elementalATKAdjustments[element]
        + (armorMaterial.elementalAttack[element] ?? 0) + (armorEnchant.elementalAttack[element] ?? 0)
        + (items.elementalAttack[element] ?? 0)
        + (gearBonus.elementalAttack[element] ?? 0) + (weaponMaterial.elementalAttack[element] ?? 0)
        + (skills.elemental[element] ?? 0)
        + (talents.elementalAttack[element] ?? 0)
        + (mixtureBonuses.elementalAttack?.[element] ?? 0),
      subrace: build.subrace,
      characterLevel: build.characterLevel,
    });
    elementalResistance[element] = calculateElementalResistance({
      element,
      san: scaledStats.san,
      manualAdjustment: build.elementalRESAdjustments[element] + (skills.elementalResistance[element] ?? 0),
      raceAdjustment: raceResistance[element] + (youkaiBonuses.elementalResistance[element] ?? 0)
        + (mixtureBonuses.elementalResistance?.[element] ?? 0),
      armorAdjustment: (armor?.resistances?.[element] ?? 0)
        + (armorMaterial.resistances[element] ?? 0) + (armorEnchant.resistances[element] ?? 0)
        + (gearBonus.resistances[element] ?? 0) + (items.resistances[element] ?? 0),
    });
  }

  const physicalResistance = { Blunt: 0, Pierce: 0, Slash: 0 };
  for (const type of PHYSICAL_KEYS) {
    physicalResistance[type] = (armor?.resistances?.[type] ?? 0)
      + (armorMaterial.resistances[type] ?? 0)
      + (armorEnchant.resistances[type] ?? 0)
      + (gearBonus.resistances[type] ?? 0)
      + (items.resistances[type] ?? 0)
      + (youkaiBonuses.physicalResistance[type] ?? 0)
      + (mixtureBonuses.physicalResistance?.[type] ?? 0);
  }

  return { elementalAttack, elementalResistance, physicalResistance };
}
