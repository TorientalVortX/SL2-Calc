import type {
  BuildEvaluation,
  BuildState,
  ElementKey,
  ElementalRecord,
  StatKey,
  StatRecord,
  WeaponConfig,
} from '../types';
import { resolveArmorUpgradePoints, resolveUpgradePoints } from '../types';
import { RACES, RACE_RESISTANCES, SUBRACES } from '../data/races';
import { CLASSES, CLASS_HIERARCHY, CLASS_PASSIVES } from '../data/classes';
import { ASTROLOGY_PLANETS, FOODS, HISTORY, LEGEND_EXTEND, PLANET_ELEMENTS } from '../data/bonuses';
import { ARMORS } from '../data/armors';
import { armorMaterialModifier } from './armorMaterials';
import { armorEnchantmentEffect } from './armorEnchantments';
import modifierData from '../data/content/weapon-modifiers.json';
import { calculateDiminishingReturns, calculateRisingGameBonus, calculateYoukaiCap } from './calculations';
import {
  calculateArmorConditionals,
  calculateCurrentHealth,
  calculateElementalAttack,
  calculateElementalResistance,
  calculateMaxFocus,
  calculateMaxHealth,
} from './derivedCalculations';
import { calculateWeaponSlot, type WeaponEnchantment, type WeaponModifier } from './weaponCalculation';

export const STAT_KEYS: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];
export const ELEMENT_KEYS: ElementKey[] = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

const emptyStats = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });
const emptyElements = (): ElementalRecord => ({ Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 });

export function getBaseClass(className: string): string {
  return Object.entries(CLASS_HIERARCHY).find(([, family]) => family.name === className || family.subClasses.includes(className))?.[0] ?? className;
}

export function clampPassiveRank(className: string, rank: number): number {
  const passive = CLASS_PASSIVES[className] ?? CLASS_PASSIVES[getBaseClass(className)];
  return Math.max(0, Math.min(Math.floor(rank || 0), passive?.maxRank ?? 0));
}

function passiveBonus(className: string, rank: number): Partial<StatRecord> {
  const own = CLASS_PASSIVES[className];
  const base = getBaseClass(className);
  const passive = own ?? (base !== className ? CLASS_PASSIVES[base] : undefined);
  const clamped = clampPassiveRank(className, rank);
  const result: Partial<StatRecord> = {};
  if (passive) {
    for (const [key, value] of Object.entries(passive.stats)) result[key as StatKey] = (value ?? 0) * clamped;
  }
  if (className === 'Dark Bard' && clamped >= 7) result.str = (result.str ?? 0) + clamped - 6;
  return result;
}

function combinedPassiveBonus(build: BuildState): Partial<StatRecord> {
  const main = passiveBonus(build.mainClass, build.mainClassPassive);
  const sub = passiveBonus(build.subClass, build.subClassPassive);
  const result: Partial<StatRecord> = { ...main };
  const sharedBase = getBaseClass(build.mainClass) === getBaseClass(build.subClass) ? getBaseClass(build.mainClass) : null;
  const bothInheritShared = sharedBase
    && sharedBase !== build.mainClass
    && sharedBase !== build.subClass
    && !CLASS_PASSIVES[build.mainClass]
    && !CLASS_PASSIVES[build.subClass];
  for (const stat of STAT_KEYS) {
    let value = sub[stat] ?? 0;
    if (bothInheritShared) value -= (CLASS_PASSIVES[sharedBase!]?.stats[stat] ?? 0) * clampPassiveRank(build.subClass, build.subClassPassive);
    result[stat] = (result[stat] ?? 0) + value;
  }
  return result;
}

function karakuriBonus(build: BuildState): StatRecord {
  const result = emptyStats();
  if (build.subrace !== 'Karakuri') return result;
  const values: Record<string, Partial<StatRecord>> = {
    Avian: { wil: -3, cel: 2, def: -2, gui: 3 },
    Beast: { ski: 3, res: -3, luc: 2, gui: -2 },
    Dragon: { str: 3, cel: -3, def: 2, res: -2 },
    Fairy: { str: -3, wil: -2, cel: 3, luc: 2 },
    Mystic: { str: -3, wil: 3, ski: 2, res: -2 },
    Night: { def: -3, res: 3, fai: -2, gui: 2 },
    Plant: { def: 3, vit: 2, luc: -2, gui: -3 },
  };
  return { ...result, ...(values[build.karakuriYoukai] ?? {}) };
}

function weaponStatBonus(config?: WeaponConfig): Partial<StatRecord> {
  if (!config) return {};
  if (config.enchantment === 'Jeweled') return { fai: 2 };
  if (config.enchantment === 'Exorcism') return { fai: 2, san: 2 };
  if (config.enchantment === 'Demonic' || config.enchantment === 'Tainted') return { str: 3 };
  return {};
}

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

/**
 * Full weapon slot result for a config — every field `calculateWeaponSlot`
 * produces, not just the handful the build evaluation keeps.
 *
 * Exported so the Weapon workspace can render its result table from exactly the
 * same input assembly the build evaluation uses, rather than rebuilding it.
 */
export function evaluateWeaponSlot(config: WeaponConfig, stats: StatRecord, extraCritChance = 0) {
  const materials = modifierData.materials as Record<string, WeaponModifier>;
  const parts = modifierData.parts as Record<string, WeaponModifier>;
  const enchantments = modifierData.enchantments as Record<string, WeaponEnchantment>;
  const material = materials[config.material] ?? materials.None;
  const selectedParts = [config.part1, config.part2, config.part3].map(part => parts[part] ?? parts.None);
  const enchantment = enchantments[config.enchantment] ?? enchantments.None;
  const scaling = config.customScaling;
  const scalingContribution = Math.floor(STAT_KEYS.reduce((sum, stat) => sum + stats[stat] * (scaling[stat] ?? 0) / 100, 0));
  const strScalingContribution = Math.floor(stats.str * (scaling.str ?? 0) / 100);
  const maxScaling = Math.max(...STAT_KEYS.map(stat => scaling[stat] ?? 0));
  const hasPrimaryStrScaling = (scaling.str ?? 0) > 0 && scaling.str === maxScaling;
  const mutationTypes: Record<number, string> = { 1: 'Dagger', 2: 'Fist', 3: 'Sword', 4: 'Axe', 5: 'Spear', 6: 'Tome', 7: 'Bow', 8: 'Gun' };
  const effectiveWeaponType = config.enchantment === 'Mutation' && config.rarity < 9 ? mutationTypes[config.rarity] ?? config.weaponType : config.weaponType;
  const rarityDiff = config.enchantment === 'Rebellion' && config.rarity < 9 ? 9 - config.rarity : 0;
  const result = calculateWeaponSlot({
    stats,
    weaponType: config.weaponType,
    effectiveWeaponType,
    basePower: config.basePower,
    baseCrit: config.baseCrit,
    baseHit: config.baseHit,
    baseWeight: config.baseWeight,
    baseCritDamage: config.baseCritDamage,
    material,
    parts: selectedParts,
    enchantmentName: config.enchantment,
    enchantment,
    upgradePoints: resolveUpgradePoints(config),
    rarity: config.rarity,
    powerQuality: config.powerQuality,
    critQuality: config.critQuality,
    hitQuality: config.hitQuality,
    weightPlus: config.weightPlus,
    weightMinus: config.weightMinus,
    sentimentality: config.sentimentality,
    twoHandedSkillRank: config.twoHandedSkillRank,
    scalingContribution,
    strScalingContribution,
    hasPrimaryStrScaling,
    enchantmentPowerBonus: Math.floor(rarityDiff * 1.5),
    enchantmentHitBonus: -Math.floor(rarityDiff * 1.5),
    extraCritChance,
  });
  return result;
}

function evaluateWeapon(config: WeaponConfig | undefined, stats: StatRecord, extraCritChance: number): BuildEvaluation['primaryWeapon'] {
  if (!config) return undefined;
  const result = evaluateWeaponSlot(config, stats, extraCritChance);
  return {
    power: result.power,
    hit: Number.parseInt(result.hit, 10),
    critical: Number.parseInt(result.crit, 10),
    criticalDamage: result.critDamageMod,
    weight: result.weight,
  };
}

export function evaluateBuild(build: BuildState): BuildEvaluation {
  const subrace = SUBRACES[build.subrace] ?? emptyStats();
  const race = RACES[build.race];
  const mainClass = CLASSES[build.mainClass] ?? emptyStats();
  const monoclassModifier = build.mainClass === build.subClass ? 2 : 1;
  const history = HISTORY[build.history] ?? HISTORY.None ?? { stats: {}, description: '' };
  const food = FOODS[build.food] ?? FOODS.None ?? { stats: {}, hp: 0, fp: 0, description: '' };
  const astrologyStat = build.astrology ? ASTROLOGY_PLANETS[build.astrology] : undefined;
  const rising = calculateRisingGameBonus(build.hpPercent, build.risingGame);
  const passives = combinedPassiveBonus(build);
  const karakuri = karakuriBonus(build);
  const armor = build.equipment.armorName ? ARMORS[build.equipment.armorName] ?? null : null;
  const armorConditional = calculateArmorConditionals(armor, build.equipment.armorConditionalBonuses);
  const weaponBonus = weaponStatBonus(build.equipment.primaryWeapon);
  const leBonus: Partial<StatRecord> = {};
  for (const [key, enabled] of Object.entries(build.legendExtend)) {
    const stat = LEGEND_EXTEND[key]?.stat;
    if (enabled && stat) leBonus[stat] = (leBonus[stat] ?? 0) + 1;
  }

  const maxInvestedStats = emptyStats();
  for (const stat of STAT_KEYS) {
    const preCap = (subrace[stat] ?? 0) + (build.customBaseStats[stat] ?? 0) + (leBonus[stat] ?? 0) + (history.stats[stat] ?? 0) + (astrologyStat === stat ? 1 : 0);
    maxInvestedStats[stat] = Math.max(0, 80 - preCap);
  }

  const baseFor = (stat: StatKey) => (subrace[stat] ?? 0) + (build.customBaseStats[stat] ?? 0) + karakuri[stat] + (leBonus[stat] ?? 0);
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
      + (history.stats[stat] ?? 0) + stamp + sanguine + normalcy + (rising[stat] ?? 0) + (passives[stat] ?? 0)
      + (armor?.statBonuses?.[stat] ?? 0) + (armorConditional.stats[stat] ?? 0) + (weaponBonus[stat] ?? 0);
  };

  const aptDragon = 0;
  const scaledApt = calculateDiminishingReturns({
    racialStat: baseFor('apt'),
    addedStat: additionFor('apt'),
    classStat: mainClass.apt ?? 0,
    customStat: build.customStats.apt ?? 0,
    aptitudeBonus: 0,
    monoclassModifier,
    dragonBonus: aptDragon,
  });
  const aptitudeBonus = Math.max(0, Math.floor(scaledApt / 6));
  const rawStats = emptyStats();
  const scaledStats = emptyStats();
  for (const stat of STAT_KEYS) {
    const dragonBonus = stat === 'str' ? build.dragonKing * 3 : stat === 'wil' ? build.dragonQueen * 3 : 0;
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
  if (build.dragonKing > 0) scaledStats.str = Math.floor(scaledStats.str * (1 + 0.05 * build.dragonKing));
  if (build.dragonQueen > 0) scaledStats.wil = Math.floor(scaledStats.wil * (1 + 0.05 * build.dragonQueen));

  const pointsSpent = STAT_KEYS.reduce((sum, stat) => sum + build.addedStats[stat], 0);
  const bothBase = Boolean(CLASS_HIERARCHY[build.mainClass]?.baseClass && CLASS_HIERARCHY[build.subClass]?.baseClass);
  const normalcyHP = build.persistenceOfNormalcy && bothBase ? (build.mainClass === build.subClass ? 200 : 100) : 0;
  let maxHP = calculateMaxHealth({
    vit: scaledStats.vit,
    san: scaledStats.san,
    strengthHpBase: baseFor('str') + build.addedStats.str + (history.stats.str ?? 0) + (astrologyStat === 'str' ? 1 : 0),
    pointsSpent,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    giantGene: build.giantGene,
    fortitude: build.fortitude,
    painToleranceRank: build.painTolerance,
    warwalk: build.warwalk,
    endurance: build.endurance,
    customHP: build.customHP + (food.hp ?? 0) + (history.hp ?? 0),
    equipmentHP: (armor?.statBonuses?.hp ?? 0) + armorConditional.hp,
    normalcyHP,
    lich: build.subrace === 'Lich',
  });
  if (food.hpPercent) maxHP = Math.floor(maxHP * (1 + food.hpPercent / 100));
  if (history.hpPercent) maxHP = Math.floor(maxHP * (1 + history.hpPercent / 100));
  let fp = calculateMaxFocus({
    wil: scaledStats.wil,
    san: scaledStats.san,
    fai: scaledStats.fai,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    warwalk: build.warwalk,
    customFP: build.customFP + (food.fp ?? 0) + (history.fp ?? 0),
    equipmentFP: (armor?.statBonuses?.fp ?? 0) + armorConditional.fp,
    lich: build.subrace === 'Lich',
  });
  if (food.fpPercent) fp = Math.floor(fp * (1 + food.fpPercent / 100));
  if (history.fpPercent) fp = Math.floor(fp * (1 + history.fpPercent / 100));

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
      manualAdjustment: build.elementalATKAdjustments[element],
      subrace: build.subrace,
      characterLevel: build.characterLevel,
    });
    elementalResistance[element] = calculateElementalResistance({
      element,
      san: scaledStats.san,
      manualAdjustment: build.elementalRESAdjustments[element],
      raceAdjustment: raceResistance[element],
      armorAdjustment: armor?.resistances?.[element] ?? 0,
    });
  }

  const armorPoints = resolveArmorUpgradePoints(build.equipment);
  const armorMaterial = armorMaterialModifier(build.equipment.armorMaterial);
  const armorEnchant = armorEnchantmentEffect(build.equipment.armorEnchantment);
  const primaryWeapon = evaluateWeapon(build.equipment.primaryWeapon, scaledStats, armorConditional.critical);
  const battleWeight = Math.floor(scaledStats.str) + 5;
  const armorWeight = Math.floor(((armor?.weight ?? 0) + armorMaterial.weight + armorEnchant.weight) * armorEnchant.weightMod);
  const equipmentLoad = (primaryWeapon?.weight ?? 0) + armorWeight;
  const derived = {
    maxHP,
    currentHP: calculateCurrentHealth(maxHP, build.hpPercent),
    fp,
    physicalDefense: Math.floor(scaledStats.def * 0.9),
    magicalDefense: Math.floor(scaledStats.res * 0.9),
    evade: Math.floor(scaledStats.cel * 2) + build.baseEvade + Math.min(build.bonusEvade, 50) + (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorConditional.evade - (build.giantGene ? 10 : 0),
    criticalEvade: Math.floor(scaledStats.fai + scaledStats.luc),
    statusInfliction: Math.floor(scaledStats.ski * 2 + scaledStats.wil),
    statusResistance: Math.floor(scaledStats.san * 2 + scaledStats.fai),
    initiative: (subrace.cel ?? 0) + build.addedStats.cel + build.customBaseStats.cel + (astrologyStat === 'cel' ? 1 : 0),
    youkaiCap: calculateYoukaiCap((subrace.fai ?? 0) + build.customBaseStats.fai + build.addedStats.fai + (leBonus.fai ?? 0) + (astrologyStat === 'fai' ? 1 : 0)),
    flanking: Math.floor(5 + scaledStats.gui / 2),
    skillPool: 11 + Math.floor(scaledStats.gui / 5) + Math.floor(scaledStats.ski / 5) + Math.floor(scaledStats.wil / 10) + (race?.human || subrace.human ? 2 : 0),
    battleWeight,
    armor: (armor?.armor ?? 0) + armorPoints.armor + armorMaterial.armor + armorEnchant.armor,
    magicArmor: (armor?.magicArmor ?? 0) + armorPoints.magicArmor + armorMaterial.magicArmor + armorEnchant.magicArmor,
    armorEvade: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorConditional.evade,
    armorWeight,
    equipmentLoad,
    battleWeightRemaining: battleWeight - equipmentLoad,
    encumbrance: Math.floor(scaledStats.str + scaledStats.vit) + 5 + (build.subrace === 'Dullahan' ? 30 : 0) + (build.subrace.includes('Mechanation') ? 20 : 0),
  };

  return {
    rawStats,
    scaledStats,
    maxInvestedStats,
    pointsSpent,
    pointBudget: Math.max(0, build.characterLevel * 4),
    derived,
    elementalAttack,
    elementalResistance,
    primaryWeapon,
  };
}

export function metricValue(evaluation: BuildEvaluation, metric: import('../types').OptimizationMetric): number {
  if (STAT_KEYS.includes(metric as StatKey)) return evaluation.scaledStats[metric as StatKey];
  if (metric === 'weaponPower') return evaluation.primaryWeapon?.power ?? 0;
  if (metric === 'weaponHit') return evaluation.primaryWeapon?.hit ?? 0;
  if (metric === 'weaponCritical') return evaluation.primaryWeapon?.critical ?? 0;
  if (metric === 'weaponCriticalDamage') return evaluation.primaryWeapon?.criticalDamage ?? 0;
  const elementalMetrics = {
    fireAttack: 'Fire', iceAttack: 'Ice', windAttack: 'Wind', earthAttack: 'Earth', darkAttack: 'Dark',
    waterAttack: 'Water', lightAttack: 'Light', lightningAttack: 'Lightning', acidAttack: 'Acid', soundAttack: 'Sound',
  } as const;
  if (metric in elementalMetrics) return evaluation.elementalAttack[elementalMetrics[metric as keyof typeof elementalMetrics]];
  return evaluation.derived[metric as keyof BuildEvaluation['derived']];
}
