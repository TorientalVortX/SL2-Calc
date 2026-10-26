import type {
  BuildEvaluation,
  BuildState,
  DerivedSource,
  ElementKey,
  ElementalRecord,
  ResistKey,
  SkillRanks,
  StatKey,
  StatRecord,
  WeaponConfig,
} from '../types';
import {
  NO_HANDS_UPGRADE_POINTS,
  NO_LEGS_UPGRADE_POINTS,
  PHYSICAL_KEYS,
  equippedSlot3,
  resolveArmorUpgradePoints,
  resolveUpgradePoints,
} from '../types';
import { RACES, RACE_RESISTANCES, SUBRACES } from '../data/races';
import { CLASSES, CLASS_HIERARCHY } from '../data/classes';
import { ASTROLOGY_PLANETS, FOODS, HISTORY, LEGEND_EXTEND, PLANET_ELEMENTS } from '../data/bonuses';
import { isShield } from '../data/gear';
import { ARMORS } from '../data/armors';
import { armorMaterialModifier, armorQualityModifier, otherMaterialModifier } from './armorMaterials';
import { armorEnchantmentEffect, enchantmentEffectForSlot } from './armorEnchantments';
import modifierData from '../data/content/weapon-modifiers.json';
import { calculateDiminishingReturns, calculateRisingGameBonus, calculateYoukaiCap } from './calculations';
import { mergeSkillRanks, skillBonuses, skillsForClassSlots, type SkillBonuses } from './skills';
import { installedBaseStats, installedAffinityStats } from './youkai';
import { youkaiNumericBonuses } from './youkaiBonuses';
import { itemBonuses } from './itemEffects';
import { setPiecesEquipped } from './itemSets';
import { traitStatBonuses, traitById } from './traits';
import { talentEffects } from './talents';
import { effectiveWeaponTypes, findWeaponByName } from './equipment';
import { activeMixtureBonuses, complexMutationChance } from './chemist';
import {
  calculateArmorConditionals,
  calculateCurrentHealth,
  calculateElementalAttack,
  calculateElementalResistance,
  calculateMaxFocus,
  calculateMaxHealth,
  calculateRedtailFortune,
} from './derivedCalculations';
import { calculateWeaponSlot, scaledStatContribution, type WeaponEnchantment, type WeaponModifier } from './weaponCalculation';
import { effectiveScaling } from './weaponScaling';
import {
  EVADE_PER_CEL, FLANKING_BASE, FLANKING_PER_GUI, HIT_PER_SKI, attackerHit, targetEvade,
} from './hitEvade';

export const STAT_KEYS: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

function compactSources(sources: DerivedSource[]): DerivedSource[] {
  return sources.filter(source => source.value !== 0);
}

function sumSources(sources: DerivedSource[], channel: DerivedSource['channel']): number {
  return sources.reduce((total, source) => (source.channel === channel ? total + source.value : total), 0);
}
export const ELEMENT_KEYS: ElementKey[] = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

const EMPTY_SKILL_BONUSES: SkillBonuses = { stats: {}, buffStats: {}, derived: {}, elemental: {}, elementalResistance: {} };
const EMPTY_RANKS: SkillRanks = {};

function hasAnyKey(record: Record<string, unknown> | undefined): boolean {
  if (!record) return false;
  for (const _key in record) return true;
  return false;
}

const emptyStats = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });
const emptyElements = (): ElementalRecord => ({ Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 });

export function getBaseClass(className: string): string {
  return Object.entries(CLASS_HIERARCHY).find(([, family]) => family.name === className || family.subClasses.includes(className))?.[0] ?? className;
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

interface GearBonus {
  evade: number;
  hp: number;
  fp: number;
  armor: number;
  magicArmor: number;
  critical: number;
  criticalEvade: number;
  statusResistance: number;
  stats: Partial<StatRecord>;
  resistances: Partial<Record<ResistKey, number>>;
}

const NO_GEAR_BONUS: GearBonus = Object.freeze({
  evade: 0, hp: 0, fp: 0, armor: 0, magicArmor: 0, critical: 0, criticalEvade: 0,
  statusResistance: 0, stats: Object.freeze({}), resistances: Object.freeze({}),
}) as GearBonus;

const GEAR_ENCHANT_SLOTS = ['Hands', 'Legs', 'Accessory', 'Accessory'] as const;

function sumGearModifiers(slots: Array<{ itemName: string | null; material?: string; enchantment?: string } | undefined>): GearBonus {
  const total: GearBonus = {
    evade: 0, hp: 0, fp: 0, armor: 0, magicArmor: 0, critical: 0, criticalEvade: 0,
    statusResistance: 0, stats: {}, resistances: {},
  };
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (!slot?.itemName) continue;
    const sources = [
      otherMaterialModifier(slot.material),
      enchantmentEffectForSlot(slot.enchantment, GEAR_ENCHANT_SLOTS[index]),
    ];
    for (const source of sources) {
      total.evade += source.evade;
      total.hp += source.hp;
      total.fp += source.fp;
      total.armor += source.armor;
      total.magicArmor += source.magicArmor;
      total.critical += source.critical;
      total.criticalEvade += source.criticalEvade;
      total.statusResistance += (source as { statusResistance?: number }).statusResistance ?? 0;
      for (const [stat, value] of Object.entries(source.stats)) {
        total.stats[stat as StatKey] = (total.stats[stat as StatKey] ?? 0) + (value ?? 0);
      }
      for (const [element, value] of Object.entries(source.resistances)) {
        total.resistances[element as ElementKey] = (total.resistances[element as ElementKey] ?? 0) + (value ?? 0);
      }
    }
  }
  return total;
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

export function evaluateWeaponSlot(config: WeaponConfig, stats: StatRecord, extraCritChance = 0, traitIds: string[] = []) {
  const materials = modifierData.materials as Record<string, WeaponModifier>;
  const parts = modifierData.parts as Record<string, WeaponModifier>;
  const enchantments = modifierData.enchantments as Record<string, WeaponEnchantment>;
  const material = materials[config.material] ?? materials.None;
  const selectedParts = [config.part1, config.part2, config.part3].map(part => parts[part] ?? parts.None);
  const enchantment = enchantments[config.enchantment] ?? enchantments.None;
  const scaling = effectiveScaling(config, traitIds);
  const scalingContribution = scaledStatContribution(stats, scaling);
  // The STR-primary critical bonus reads the listed percentage, not the SWA-multiplied one.
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
    effectiveWeaponTypes: effectiveWeaponTypes(config),
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

function evaluateWeapon(config: WeaponConfig | undefined, stats: StatRecord, extraCritChance: number, traitIds: string[] = []): BuildEvaluation['primaryWeapon'] {
  if (!config) return undefined;
  const result = evaluateWeaponSlot(config, stats, extraCritChance, traitIds);
  return {
    power: result.power,
    swa: result.swa,
    hit: Number.parseInt(result.hit, 10),
    critical: Number.parseInt(result.crit, 10),
    criticalDamage: result.critDamageMod,
    weight: result.weight,
  };
}

export function evaluateBuild(build: BuildState, includeStatSources = false): BuildEvaluation {
  const mixtureBonuses = activeMixtureBonuses(build);
  const subrace = SUBRACES[build.subrace] ?? emptyStats();
  const race = RACES[build.race];
  const mainClass = CLASSES[build.mainClass] ?? emptyStats();
  const monoclassModifier = build.mainClass === build.subClass ? 2 : 1;
  const history = HISTORY[build.history] ?? HISTORY.None ?? { stats: {}, description: '' };
  const food = FOODS[build.food] ?? FOODS.None ?? { stats: {}, hp: 0, fp: 0, description: '' };
  const astrologyStat = build.astrology ? ASTROLOGY_PLANETS[build.astrology] : undefined;
  const hasSkillRanks = hasAnyKey(build.skillRanks?.main) || hasAnyKey(build.skillRanks?.sub);
  const mergedSkillRanks = hasSkillRanks ? mergeSkillRanks(build.skillRanks) : EMPTY_RANKS;
  const youkaiBonuses = youkaiNumericBonuses(build, mergedSkillRanks);
  // The wiki states these four skills' effects only as prose, so they are computed by hand from rank.
  const rising = calculateRisingGameBonus(build.hpPercent, mergedSkillRanks['rising-game'] ?? 0);
  const painToleranceRank = mergedSkillRanks['pain-tolerance'] ?? 0;
  const hasFortitude = (mergedSkillRanks.fortitude ?? 0) >= 1;
  const hasEndurance = (mergedSkillRanks.endurance ?? 0) >= 1;
  const availableSkills = hasSkillRanks ? skillsForClassSlots(build.mainClass, build.subClass) : [];
  const skillWeaponSubtype = findWeaponByName(build.equipment.primaryWeapon?.selectedWeaponName)?.subtype;
  const skillWeaponTypes = [...effectiveWeaponTypes(build.equipment.primaryWeapon), ...(skillWeaponSubtype ? [skillWeaponSubtype] : [])];
  const skillContext = { inputs: build.skillInputs, ranks: mergedSkillRanks };
  let skills = hasSkillRanks
    ? skillBonuses(availableSkills, mergedSkillRanks, build.skillConditionals, skillWeaponTypes, skillContext)
    : EMPTY_SKILL_BONUSES;
  const karakuri = karakuriBonus(build);
  // History traits are skipped inside `traitStatBonuses`; the `history` field already grants them.
  const traits = traitStatBonuses(build.traits ?? []);
  // Grip talents are resolved from the equipped weapon below, so they are zeroed here to avoid counting twice.
  const talents = { ...talentEffects({ ...build, talents: { ...build.talents,
    'two-hand/full-swing': 0, 'two-hand/steady': 0 } }, effectiveWeaponTypes(build.equipment.primaryWeapon)) };
  const armor = build.equipment.armorName ? ARMORS[build.equipment.armorName] ?? null : null;
  const armorConditional = calculateArmorConditionals(armor, build.equipment.armorConditionalBonuses);
  const armorMaterial = armorMaterialModifier(build.equipment.armorMaterial);
  const armorQuality = armorQualityModifier(build.equipment.armorQuality);
  const armorEnchant = armorEnchantmentEffect(build.equipment.armorEnchantment);
  const dragonKingPieces = setPiecesEquipped(build.equipment, 'Dragon King');
  const dragonQueenPieces = setPiecesEquipped(build.equipment, 'Dragon Queen');

  const usingOffHand = equippedSlot3(build.equipment) === 'offHandWeapon';
  const equippedHands = usingOffHand ? undefined : build.equipment.hands;
  const gearSlots = equippedHands || build.equipment.legs || build.equipment.accessory1 || build.equipment.accessory2
    ? [equippedHands, build.equipment.legs, build.equipment.accessory1, build.equipment.accessory2]
    : undefined;
  const items = itemBonuses({
    weaponName: build.equipment.primaryWeapon?.selectedWeaponName,
    armorName: build.equipment.armorName,
    weaponPoints: build.equipment.primaryWeapon ? resolveUpgradePoints(build.equipment.primaryWeapon) : undefined,
    armorPoints: resolveArmorUpgradePoints(build.equipment),
    gear: gearSlots,
    conditionals: {
      ...build.equipment.armorConditionalBonuses,
      ...(build.equipment.itemConditionalBonuses ?? {}),
    },
    rolls: build.equipment.itemRolls,
  });
  const gearBonus = gearSlots ? sumGearModifiers(gearSlots) : NO_GEAR_BONUS;

  // Accessory upgrade points buy Fortune and Greed (drop rates), so only hands and legs matter here.
  const handsPoints = usingOffHand ? NO_HANDS_UPGRADE_POINTS : build.equipment.hands?.upgradePoints ?? NO_HANDS_UPGRADE_POINTS;
  const legsPoints = build.equipment.legs?.upgradePoints ?? NO_LEGS_UPGRADE_POINTS;

  const weaponBonus = weaponStatBonus(build.equipment.primaryWeapon);
  const leBonus: Partial<StatRecord> = {};
  for (const [key, enabled] of Object.entries(build.legendExtend)) {
    const stat = LEGEND_EXTEND[key]?.stat;
    if (enabled && stat) leBonus[stat] = (leBonus[stat] ?? 0) + 1;
  }

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

  const aptDragon = 0;
  // Only owned APT counts toward the every-6 threshold; bonus APT (traits, gear) raises the stat but not the threshold.
  const investedApt = (build.addedStats.apt ?? 0) + (astrologyStat === 'apt' ? 1 : 0);
  const scaledApt = calculateDiminishingReturns({
    racialStat: baseFor('apt'),
    addedStat: investedApt,
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

  const pointsSpent = STAT_KEYS.reduce((sum, stat) => sum + build.addedStats[stat], 0);
  const bothBase = Boolean(CLASS_HIERARCHY[build.mainClass]?.baseClass && CLASS_HIERARCHY[build.subClass]?.baseClass);
  const normalcyHP = build.persistenceOfNormalcy && bothBase ? (build.mainClass === build.subClass ? 200 : 100) : 0;
  const spiritVitals = Math.max(0, Math.min(5, Math.floor(build.whiteSpiritCount ?? 0))) * 3;
  const crystalVitals = Math.max(0, Math.min(45, Math.floor(build.crystalCount ?? 0)));
  let maxHP = calculateMaxHealth({
    vit: scaledStats.vit,
    san: scaledStats.san,
    strengthHpBase: baseFor('str') + build.addedStats.str + (history.stats.str ?? 0) + (astrologyStat === 'str' ? 1 : 0),
    pointsSpent,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    giantGene: build.giantGene,
    fortitude: hasFortitude,
    painToleranceRank,
    warwalk: build.warwalk,
    endurance: hasEndurance,
    customHP: build.customHP + (food.hp ?? 0) + (history.hp ?? 0) + spiritVitals + crystalVitals,
    equipmentHP: (armor?.statBonuses?.hp ?? 0) + armorConditional.hp + armorMaterial.hp + armorEnchant.hp
      + (items.derived.hp ?? 0) + legsPoints.hp + gearBonus.hp,
    normalcyHP,
    lich: build.subrace === 'Lich',
  });
  if (food.hpPercent) maxHP = Math.floor(maxHP * (1 + food.hpPercent / 100));
  if (history.hpPercent) maxHP = Math.floor(maxHP * (1 + history.hpPercent / 100));
  if (armorEnchant.hpPercent) maxHP = Math.floor(maxHP * (1 + armorEnchant.hpPercent / 100));
  maxHP += mixtureBonuses.maxHP ?? 0;
  if (skills.derived.hpPercent) maxHP = Math.floor(maxHP * (1 + skills.derived.hpPercent / 100));
  let fp = calculateMaxFocus({
    wil: scaledStats.wil,
    san: scaledStats.san,
    fai: scaledStats.fai,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    warwalk: build.warwalk,
    customFP: build.customFP + (food.fp ?? 0) + (history.fp ?? 0) + spiritVitals + crystalVitals,
    equipmentFP: (armor?.statBonuses?.fp ?? 0) + armorConditional.fp + armorMaterial.fp + armorEnchant.fp
      + (items.derived.fp ?? 0) + handsPoints.fp + gearBonus.fp + (skills.derived.fp ?? 0),
    talentFP: talents.maxFp,
    lich: build.subrace === 'Lich',
  });
  if (food.fpPercent) fp = Math.floor(fp * (1 + food.fpPercent / 100));
  if (history.fpPercent) fp = Math.floor(fp * (1 + history.fpPercent / 100));

  const fpSources: DerivedSource[] = compactSources([
    { label: 'Scaled WIL', value: Math.floor(scaledStats.wil * 5), channel: 'base' },
    { label: 'Scaled SAN', value: Math.floor(scaledStats.san * 2), channel: 'base' },
    { label: 'Scaled FAI', value: Math.floor(scaledStats.fai * 3), channel: 'base' },
    { label: 'Crystals', value: crystalVitals, channel: 'base' },
    { label: 'White Spirits', value: spiritVitals, channel: 'base' },
    { label: 'Food, history and manual FP', value: build.customFP + (food.fp ?? 0) + (history.fp ?? 0), channel: 'base' },
    { label: 'Torso', value: (armor?.statBonuses?.fp ?? 0) + armorConditional.fp + armorMaterial.fp + armorEnchant.fp, channel: 'base' },
    { label: 'Item effects', value: items.derived.fp ?? 0, channel: 'base' },
    { label: 'Hands upgrades', value: handsPoints.fp, channel: 'base' },
    ...((gearSlots ?? []).flatMap(slot => slot?.itemName ? [{ label: `${slot.itemName}: ${slot.material ?? 'None'} material`, value: otherMaterialModifier(slot.material).fp, channel: 'base' as const }] : [])),
    { label: 'Gear enchantments', value: gearBonus.fp - (gearSlots ?? []).reduce((sum, slot) => sum + (slot?.itemName ? otherMaterialModifier(slot.material).fp : 0), 0), channel: 'base' },
    { label: 'Skills', value: skills.derived.fp ?? 0, channel: 'base' },
    { label: 'Talents (Capacity: Depth)', value: talents.maxFp, channel: 'base' },
  ]);
  const remainingFP = fp - fpSources.reduce((sum, source) => sum + source.value, 0);
  if (remainingFP) fpSources.push({ label: 'Racial, Warwalk and percentage modifiers', value: remainingFP, channel: 'base' });

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

  const armorPoints = resolveArmorUpgradePoints(build.equipment);
  const weaponConfig = build.equipment.primaryWeapon;
  const weaponBase = evaluateWeapon(weaponConfig ? { ...weaponConfig, twoHandedSkillRank: 0 } : undefined, scaledStats, armorConditional.critical, build.traits);
  const gripTypes = effectiveWeaponTypes(weaponConfig);
  const gripAllowed = !usingOffHand && !isShield(equippedHands?.itemName);
  const fullSwingRank = build.talents?.['two-hand/full-swing'] ?? weaponConfig?.twoHandedSkillRank ?? 0;
  const steadyRank = build.talents?.['two-hand/steady'] ?? weaponConfig?.twoHandedSkillRank ?? 0;
  if (weaponBase && gripAllowed) {
    if (gripTypes.some(type => ['Sword', 'Axe', 'Spear', 'Polearm'].includes(type)))
      talents.scaledWeaponAtk += fullSwingRank * 2 * (weaponBase.weight >= 20 ? 2 : 1);
    if (gripTypes.includes('Gun')) {
      const rifle = findWeaponByName(weaponConfig?.selectedWeaponName)?.subtype?.toLowerCase() === 'rifle';
      talents.hit += steadyRank * 2 * (rifle ? 2 : 1);
    }
  }
  const flanking = FLANKING_BASE + FLANKING_PER_GUI * scaledStats.gui;
  // Weapon Hit already includes 2x scaled SKI. Hand Hit is base per the Hit sheet; skill, item and Redtail Hit are capped bonus.
  const skiHit = Math.floor(scaledStats.ski * HIT_PER_SKI);
  const hitSources: DerivedSource[] = compactSources([
    { label: 'Scaled SKI', value: skiHit, channel: 'base', stat: 'ski' },
    { label: 'Weapon accuracy', value: (weaponBase?.hit ?? skiHit) - skiHit, channel: 'base' },
    { label: 'Hands upgrades', value: handsPoints.hit, channel: 'base' },
    { label: 'Skills', value: skills.derived.hit ?? 0, channel: 'bonus' },
    { label: 'Item effects', value: items.derived.hit ?? 0, channel: 'bonus' },
    { label: 'Redtail fortune', value: fortune.hit, channel: 'bonus' },
    { label: 'Talents', value: talents.hit, channel: 'bonus' },
  ]);
  const hitBaseSources = sumSources(hitSources, 'base');
  const hitBonusSources = sumSources(hitSources, 'bonus');
  // The Hit workbook hard-codes the frontal (Smite) term at 15, i.e. rank 5; pass the build's real value instead.
  const attack = attackerHit({
    baseHit: hitBaseSources,
    hitBuffs: hitBonusSources,
    honorHitBonus: talents.frontalHit,
    flanking,
  });

  // The wiki describes skill Power/Hit/Critical as weapon modifiers; added after evaluation so they skip scaling.
  const primaryWeapon = weaponBase && {
    ...weaponBase,
    power: weaponBase.power + (skills.derived.power ?? 0) + (items.derived.power ?? 0) + youkaiBonuses.weaponPower + talents.power,
    // Full Swing and Tactics raise Scaled Weapon ATK, not the weapon's printed Power.
    swa: weaponBase.swa + talents.scaledWeaponAtk + (skills.derived.swa ?? 0)
      + (skills.derived.power ?? 0) + (items.derived.power ?? 0) + youkaiBonuses.weaponPower + talents.power,
    hit: Math.floor(attack.byTier.base),
    critical: weaponBase.critical + (skills.derived.critical ?? 0) + (items.derived.critical ?? 0) + fortune.critical + talents.critical,
    criticalDamage: weaponBase.criticalDamage + talents.criticalDamagePercent + (skills.derived.criticalDamage ?? 0),
    weight: Math.max(0, weaponBase.weight - talents.weaponWeightReduction),
  };
  // Per the community Evade page and Hit/Evade workbook: printed item Evade, materials, upgrades and Dodger are
  // uncapped base; passive buffs and item effects (e.g. Sarasha Gi's +12) are bonus, capped at +50.
  const evadeSources: DerivedSource[] = compactSources([
    { label: 'Scaled CEL', value: Math.floor(scaledStats.cel * EVADE_PER_CEL), channel: 'base', stat: 'cel' },
    { label: 'Base Evade override', value: build.baseEvade, channel: 'base' },
    { label: 'Torso', value: armor?.evade ?? 0, channel: 'base' },
    { label: 'Torso upgrades', value: armorPoints.evade, channel: 'base' },
    { label: 'Torso material', value: armorMaterial.evade, channel: 'base' },
    { label: 'Torso enchantment', value: armorEnchant.evade, channel: 'base' },
    { label: 'Torso quality', value: armorQuality.evade, channel: 'base' },
    { label: 'Legs upgrades', value: legsPoints.evade, channel: 'base' },
    { label: 'Gear materials and enchantments', value: gearBonus.evade, channel: 'base' },
    { label: 'Skills', value: (skills.derived.evade ?? 0) - (skills.derived.evadeBonus ?? 0), channel: 'base' },
    { label: 'Active skills', value: skills.derived.evadeBonus ?? 0, channel: 'bonus' },
    { label: 'Giant Gene', value: build.giantGene ? -10 : 0, channel: 'base' },
    { label: 'Bonus Evade override', value: build.bonusEvade, channel: 'bonus' },
    { label: 'Torso conditional effects', value: armorConditional.evade, channel: 'bonus' },
    { label: 'Item effects', value: items.derived.evade ?? 0, channel: 'bonus' },
    { label: 'Redtail fortune', value: fortune.evade, channel: 'bonus' },
    { label: 'Youkai base Evade', value: youkaiBonuses.derived.evadeBase, channel: 'base' },
    { label: 'Youkai', value: youkaiBonuses.derived.evade, channel: 'bonus' },
    { label: 'Active mixture effects', value: mixtureBonuses.evade ?? 0, channel: 'bonus' },
  ]);
  const evadeBaseSources = sumSources(evadeSources, 'base');
  const evadeBonusSources = sumSources(evadeSources, 'bonus');
  const ownEvade = targetEvade({ baseEvade: evadeBaseSources, evadeBuffs: evadeBonusSources });

  const battleWeight = Math.floor(scaledStats.str) + 5 + talents.maxBattleWeight + (skills.derived.battleWeight ?? 0);
  const armorWeight = Math.floor(((armor?.weight ?? 0) + armorMaterial.weight + armorEnchant.weight + armorQuality.weight) * armorEnchant.weightMod);
  const equipmentLoad = (primaryWeapon?.weight ?? 0) + armorWeight;
  const statusResistance = Math.floor((Math.floor(scaledStats.san * 2 + scaledStats.fai)
    + armorEnchant.statusResistance + (skills.derived.statusResistance ?? 0) + gearBonus.statusResistance
    + (mixtureBonuses.statusResistance ?? 0)) * (1 + ((mixtureBonuses.statusResistancePercent ?? 0) + (skills.derived.statusResistancePercent ?? 0)) / 100));
  const mutagenPotency = mixtureBonuses.mutagenPotency ?? 0;
  const derived = {
    maxHP,
    currentHP: calculateCurrentHealth(maxHP, build.hpPercent),
    fp,
    physicalDefense: Math.floor(scaledStats.def * 0.9) + (skills.derived.physicalDefense ?? 0) + (skills.derived.defensiveKnowledge ?? 0),
    magicalDefense: Math.floor(scaledStats.res * 0.9) + (skills.derived.magicalDefense ?? 0),
    evade: Math.floor(ownEvade.total),
    evadeBase: Math.floor(ownEvade.preBonus),
    evadeBonus: Math.floor(ownEvade.bonusEvade),
    evadeBonusWasted: Math.max(0, Math.floor(evadeBonusSources - ownEvade.bonusEvade)),
    criticalEvade: Math.floor(scaledStats.fai + scaledStats.luc) + armorMaterial.criticalEvade + armorEnchant.criticalEvade + fortune.criticalEvade + (skills.derived.criticalEvade ?? 0) + youkaiBonuses.derived.criticalEvade + gearBonus.criticalEvade,
    statusInfliction: Math.floor(
      (Math.floor(scaledStats.ski * 2 + scaledStats.wil) + (skills.derived.statusInfliction ?? 0))
      * (1 + talents.statusInflictionPercent / 100),
    ),
    statusResistance,
    mutagenPotency,
    complexMutationChance: complexMutationChance(mutagenPotency, statusResistance,
      build.mainClass === 'Shapeshifter' || build.subClass === 'Shapeshifter',
      build.race === 'Chimera' || build.subrace === 'Chimera'),
    initiative: racialFor('cel') + build.addedStats.cel + build.customBaseStats.cel + (astrologyStat === 'cel' ? 1 : 0),
    // Install preserves FAI, so this stays on the subrace line.
    youkaiCap: calculateYoukaiCap((subrace.fai ?? 0) + build.customBaseStats.fai + build.addedStats.fai + (leBonus.fai ?? 0) + (astrologyStat === 'fai' ? 1 : 0)),
    flanking: Math.floor(flanking),
    hitTiers: {
      base: Math.floor(attack.byTier.base),
      front: Math.floor(attack.byTier.front),
      flank1: Math.floor(attack.byTier.flank1),
      flank2: Math.floor(attack.byTier.flank2),
    },
    hitBase: Math.floor(attack.preBonus),
    hitBonusSources,
    hitBonusApplied: Math.floor(attack.bonusHit),
    hitBonusWasted: Math.max(0, Math.floor(hitBonusSources - attack.bonusHit)),
    honorHeadroom: Math.floor(attack.honorHeadroom),
    frontalHitBonus: talents.frontalHit,
    skillPool: build.traits?.includes('undeniable-innovator') ? 99 : 11 + Math.floor(scaledStats.gui / 5) + Math.floor(scaledStats.ski / 5) + Math.floor(scaledStats.wil / 10) + (race?.human || subrace.human ? 2 : 0) + talents.skillPool + (skills.derived.skillPool ?? 0),
    battleWeight,
    armor: (armor?.armor ?? 0) + armorPoints.armor + armorMaterial.armor + armorEnchant.armor + armorQuality.armor + (items.derived.armor ?? 0) + gearBonus.armor + talents.armor + (skills.derived.armor ?? 0),
    magicArmor: (armor?.magicArmor ?? 0) + armorPoints.magicArmor + armorMaterial.magicArmor + armorEnchant.magicArmor + armorQuality.magicArmor + (items.derived.magicArmor ?? 0) + gearBonus.magicArmor + talents.magicArmor + (skills.derived.magicArmor ?? 0),
    // Mixes base and bonus Evade; never feed it back as a base input or bonus Evade escapes the +50 cap.
    armorEvade: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorQuality.evade + armorConditional.evade + (items.derived.evade ?? 0),
    armorEvadeBase: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorQuality.evade,
    armorWeight,
    equipmentLoad,
    battleWeightRemaining: battleWeight - equipmentLoad,
    encumbrance: Math.floor(scaledStats.str + scaledStats.vit) + 5 + (build.subrace === 'Dullahan' ? 30 : 0) + (build.subrace.includes('Mechanation') ? 20 : 0),
    luckStatusPercent: fortune.luckStatusPercent + youkaiBonuses.derived.luckStatusPercent,
  };

  const statSources: BuildEvaluation['statSources'] = includeStatSources
    ? Object.fromEntries(STAT_KEYS.map(stat => [stat, [] as Array<{ label: string; value: number }>])) as NonNullable<BuildEvaluation['statSources']>
    : undefined;
  if (statSources) {
    const add = (label: string, values: Partial<StatRecord>) => {
      for (const stat of STAT_KEYS) {
        const value = values[stat] ?? 0;
        if (value) statSources[stat].push({ label, value });
      }
    };
    const line = (fn: (stat: StatKey) => number) => Object.fromEntries(STAT_KEYS.map(stat => [stat, fn(stat)]));
    add(`${build.mainClass}${monoclassModifier === 2 ? ' (monoclass)' : ''}`, line(stat => (mainClass[stat] ?? 0) * monoclassModifier));
    add('Manual stat adjustments', build.customStats);
    add('Karakuri binding', karakuri);
    add('Installed Youkai: racial stat replacement', line(stat => racialFor(stat) - (subrace[stat] ?? 0)));
    add(`Food: ${build.food}`, food.stats);
    add('Stamps', build.stamps);
    add('Sanguine Crest', line(stat => build.sanguineCrest && ['str', 'wil', 'ski', 'cel', 'def'].includes(stat) && ['Oni', 'Vampire'].includes(build.subrace) ? 2 : 0));
    add('Power of Normalcy', line(stat => build.powerOfNormalcy && stat !== 'apt' && CLASS_HIERARCHY[build.mainClass]?.baseClass && CLASS_HIERARCHY[build.subClass]?.baseClass ? (monoclassModifier === 2 ? 8 : 4) : 0));
    add('Rising Game', rising);
    add(`Torso: ${build.equipment.armorName}`, armor?.statBonuses ?? {});
    add(`Torso conditional bonuses: ${build.equipment.armorName}`, armorConditional.stats);
    add(`Weapon enchantment: ${build.equipment.primaryWeapon?.enchantment}`, weaponBonus);
    add(`Torso material: ${build.equipment.armorMaterial}`, armorMaterial.stats);
    add(`Torso enchantment: ${build.equipment.armorEnchantment}`, armorEnchant.stats);
    const conditionals = { ...build.equipment.armorConditionalBonuses, ...build.equipment.itemConditionalBonuses };
    add(`Weapon: ${build.equipment.primaryWeapon?.selectedWeaponName}`, itemBonuses({
      weaponName: build.equipment.primaryWeapon?.selectedWeaponName,
      weaponPoints: build.equipment.primaryWeapon ? resolveUpgradePoints(build.equipment.primaryWeapon) : undefined,
      conditionals, rolls: build.equipment.itemRolls,
    }).stats);
    add(`Torso effects: ${build.equipment.armorName}`, itemBonuses({
      armorName: build.equipment.armorName, armorPoints: resolveArmorUpgradePoints(build.equipment), conditionals, rolls: build.equipment.itemRolls,
    }).stats);
    gearSlots?.forEach((slot, index) => {
      if (!slot?.itemName) return;
      const label = `${['Hands', 'Legs', 'Accessory 1', 'Accessory 2'][index]}: ${slot.itemName}`;
      add(label, itemBonuses({ gear: [slot], conditionals, rolls: build.equipment.itemRolls }).stats);
      add(`${label} / ${slot.material}`, otherMaterialModifier(slot.material).stats);
      add(`${label} / ${slot.enchantment}`, enchantmentEffectForSlot(slot.enchantment, GEAR_ENCHANT_SLOTS[index]).stats);
    });
    for (const id of build.traits ?? []) add(`Trait: ${traitById(id)?.name ?? id}`, traitStatBonuses([id]));
    for (const skill of skillsForClassSlots(build.mainClass, build.subClass)) {
      if (mergedSkillRanks[skill.id]) add(`Skill: ${skill.name}`, skillBonuses([skill], mergedSkillRanks, build.skillConditionals, skillWeaponTypes, { ...skillContext, scaledStats }).stats);
    }
    add('Youkai bonuses', youkaiBonuses.stats);
    add('Installed Affinity (max +1)', installedAffinity);
    add('Dragon King set', { str: dragonKingPieces * 3 });
    add('Dragon Queen set', { wil: dragonQueenPieces * 3 });
    add('Aptitude bonus (owned scaled APT / 6)', line(stat => stat === 'apt' ? 0 : aptitudeBonus));
    add('Stat buffs', build.statBuffs ?? {});
    add('Item status buffs', line(stat => items.derived[`buff:${stat}`] ?? 0));
    add('Evolution Drought base stats', mixtureBonuses.baseStats ?? {});
    add('Active mixture effects', mixtureBonuses.stats ?? {});
    if (build.hpPercent <= 50) {
      const instinct = Math.floor(scaledStats.san * 0.1 + 1) * (build.hpPercent <= 25 ? 2 : 1);
      if (build.felidaeInstinct && ['Felidae', 'Grimalkin'].includes(build.subrace)) add('Felidae Instinct', { ski: instinct, cel: instinct, gui: instinct, luc: instinct });
      if (build.lupineInstinct && build.subrace === 'Lupine') add('Lupine Instinct', { str: instinct, wil: instinct, def: instinct, res: instinct });
    }
  }

  return {
    ...(statSources ? { statSources } : {}),
    rawStats,
    scaledStats,
    maxInvestedStats,
    pointsSpent,
    pointBudget: Math.max(0, build.characterLevel * 4),
    derived,
    elementalAttack,
    elementalResistance,
    physicalResistance,
    sources: { hit: hitSources, evade: evadeSources, fp: fpSources },
    primaryWeapon,
  };
}
