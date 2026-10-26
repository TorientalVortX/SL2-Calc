import type { StatKey } from '../../types';
import { CLASS_HIERARCHY } from '../../data/classes';
import { calculateDiminishingReturns } from '../calculations';
import { skillBonuses } from '../skills';
import { installedAffinityStats, installedBaseStats } from '../youkai';
import { calculateRedtailFortune } from '../derivedCalculations';
import type { EvaluationInputs } from './inputs';
import { STAT_KEYS, emptyStats } from './shared';

export type StatsResult = ReturnType<typeof resolveStats>;

export function resolveStats(inputs: EvaluationInputs) {
  const {
    build, subrace, mainClass, monoclassModifier, history, food, astrologyStat, mergedSkillRanks, mixtureBonuses,
    karakuri, leBonus, rising, armor, armorConditional, weaponBonus, armorMaterial, armorEnchant, items, gearBonus,
    traits, youkaiBonuses, dragonKingPieces, dragonQueenPieces, hasSkillRanks, availableSkills, skillWeaponTypes, skillContext,
  } = inputs;
  let skills = inputs.initialSkills;

  const maxInvestedStats = emptyStats();
  for (const stat of STAT_KEYS) {
    // True subrace, not installed: Install is a combat transformation and doesn't move the allocation cap.
    const preCap = (subrace[stat] ?? 0) + (build.customBaseStats[stat] ?? 0) + (leBonus[stat] ?? 0) + (history.stats[stat] ?? 0) + (astrologyStat === stat ? 1 : 0);
    maxInvestedStats[stat] = Math.max(0, 80 - preCap);
  }

  // Install replaces racial base stats with the Youkai's; FAI, SAN and APT keep their originals.
  const installedStats = build.youkai?.installed ? installedBaseStats(build.youkai, mergedSkillRanks) : null;
  const installedAffinity = build.youkai ? installedAffinityStats(build.youkai, mergedSkillRanks) : {};
  const racialFor = (stat: StatKey) => installedStats?.[stat] ?? subrace[stat] ?? 0;
  const baseFor = (stat: StatKey) => racialFor(stat) + (build.customBaseStats[stat] ?? 0) + karakuri[stat] + (leBonus[stat] ?? 0) + (mixtureBonuses.baseStats?.[stat] ?? 0);
  const additionFor = (stat: StatKey) => {
    const stamp = stat in build.stamps ? build.stamps[stat as keyof typeof build.stamps] ?? 0 : 0;
    const sanguine = build.sanguineCrest && ['str', 'wil', 'ski', 'cel', 'def'].includes(stat) && (build.subrace === 'Oni' || build.subrace === 'Vampire') ? 2 : 0;
    let normalcy = 0;
    if (build.powerOfNormalcy && stat !== 'apt') {
      const mainBase = CLASS_HIERARCHY[build.mainClass]?.baseClass;
      const subBase = CLASS_HIERARCHY[build.subClass]?.baseClass;
      if (mainBase && subBase) normalcy = build.mainClass === build.subClass ? 8 : 4;
    }
    return (build.addedStats[stat] ?? 0) + (astrologyStat === stat ? 1 : 0) + (food.stats[stat] ?? 0)
      + (history.stats[stat] ?? 0) + stamp + sanguine + normalcy + (rising[stat] ?? 0)
      + (armor?.statBonuses?.[stat] ?? 0) + (armorConditional.stats[stat] ?? 0) + (weaponBonus[stat] ?? 0)
      + (armorMaterial.stats[stat] ?? 0) + (armorEnchant.stats[stat] ?? 0) + (items.stats[stat] ?? 0)
      + (gearBonus.stats[stat] ?? 0)
      + (traits[stat] ?? 0)
      + (skills.stats[stat] ?? 0) - (skills.buffStats[stat] ?? 0)
      + (youkaiBonuses.stats[stat] ?? 0) + (installedAffinity[stat] ?? 0);
  };

  // Only owned APT counts toward the every-6 threshold; bonus APT (traits, gear) raises the stat but not the threshold.
  const investedApt = (build.addedStats.apt ?? 0) + (astrologyStat === 'apt' ? 1 : 0);
  const scaledApt = calculateDiminishingReturns({
    racialStat: baseFor('apt'),
    addedStat: investedApt,
    classStat: mainClass.apt ?? 0,
    customStat: build.customStats.apt ?? 0,
    aptitudeBonus: 0,
    monoclassModifier,
    dragonBonus: 0,
  });
  const aptitudeBonus = Math.max(0, Math.floor(scaledApt / 6));
  const rawStats = emptyStats();
  const scaledStats = emptyStats();
  for (const stat of STAT_KEYS) {
    const dragonBonus = stat === 'str' ? dragonKingPieces * 3 : stat === 'wil' ? dragonQueenPieces * 3 : 0;
    const aptBonus = stat === 'apt' ? 0 : aptitudeBonus;
    rawStats[stat] = baseFor(stat) + additionFor(stat) + (mainClass[stat] ?? 0) * monoclassModifier + (build.customStats[stat] ?? 0) + dragonBonus + aptBonus;
    scaledStats[stat] = calculateDiminishingReturns({
      racialStat: baseFor(stat),
      addedStat: additionFor(stat),
      classStat: mainClass[stat] ?? 0,
      customStat: build.customStats[stat] ?? 0,
      aptitudeBonus: aptBonus,
      monoclassModifier,
      dragonBonus,
    });
  }

  // Status buffs apply after the softcap and don't feed the aptitude threshold.
  if (build.statBuffs) {
    for (const stat of STAT_KEYS) {
      const buff = build.statBuffs[stat] ?? 0;
      if (!buff) continue;
      scaledStats[stat] += buff;
      rawStats[stat] += buff;
    }
  }
  for (const stat of STAT_KEYS) {
    const bonus = (mixtureBonuses.stats?.[stat] ?? 0) + (skills.buffStats[stat] ?? 0) + (items.derived[`buff:${stat}`] ?? 0);
    scaledStats[stat] += bonus;
    rawStats[stat] += bonus;
  }
  if (hasSkillRanks) {
    const resolved = skillBonuses(availableSkills, mergedSkillRanks, build.skillConditionals, skillWeaponTypes, { ...skillContext, scaledStats });
    for (const stat of STAT_KEYS) {
      const delta = (resolved.buffStats[stat] ?? 0) - (skills.buffStats[stat] ?? 0);
      scaledStats[stat] += delta;
      rawStats[stat] += delta;
    }
    skills = skillBonuses(availableSkills, mergedSkillRanks, build.skillConditionals, skillWeaponTypes, { ...skillContext, scaledStats });
  }

  if (build.hpPercent <= 50) {
    const baseInstinct = Math.floor(scaledStats.san * 0.1 + 1);
    const instinctBonus = build.hpPercent <= 25 ? baseInstinct * 2 : baseInstinct;
    if (build.felidaeInstinct && (build.subrace === 'Felidae' || build.subrace === 'Grimalkin')) {
      for (const stat of ['ski', 'cel', 'gui', 'luc'] as const) {
        scaledStats[stat] += instinctBonus;
        rawStats[stat] += instinctBonus;
      }
    }
    if (build.lupineInstinct && build.subrace === 'Lupine') {
      for (const stat of ['str', 'wil', 'def', 'res'] as const) {
        scaledStats[stat] += instinctBonus;
        rawStats[stat] += instinctBonus;
      }
    }
  }
  if (dragonKingPieces > 0) scaledStats.str = Math.floor(scaledStats.str * (1 + 0.05 * dragonKingPieces));
  if (dragonQueenPieces > 0) scaledStats.wil = Math.floor(scaledStats.wil * (1 + 0.05 * dragonQueenPieces));
  if (hasSkillRanks) skills = skillBonuses(availableSkills, mergedSkillRanks, build.skillConditionals, skillWeaponTypes, { ...skillContext, scaledStats });

  const fortune = calculateRedtailFortune({
    subrace: build.subrace,
    diceColor: build.redtailDiceColor,
    fortuneLevel: build.redtailFortuneLevel,
    scaledSan: scaledStats.san,
  });

  return { maxInvestedStats, installedAffinity, racialFor, baseFor, aptitudeBonus, rawStats, scaledStats, skills, fortune };
}
