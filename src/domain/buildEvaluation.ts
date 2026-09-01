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
import { CLASSES, CLASS_HIERARCHY, CLASS_PASSIVES } from '../data/classes';
import { ASTROLOGY_PLANETS, FOODS, HISTORY, LEGEND_EXTEND, PLANET_ELEMENTS } from '../data/bonuses';
import { ARMORS } from '../data/armors';
import { armorMaterialModifier, armorQualityModifier, otherMaterialModifier } from './armorMaterials';
import { armorEnchantmentEffect, enchantmentEffectForSlot } from './armorEnchantments';
import modifierData from '../data/content/weapon-modifiers.json';
import { calculateDiminishingReturns, calculateRisingGameBonus, calculateYoukaiCap } from './calculations';
import { skillBonuses, skillsForClassSlots, type SkillBonuses } from './skills';
import { mergeSkillRanks } from './skillDamage';
import { installedBaseStats } from './youkai';
import { youkaiNumericBonuses } from './youkaiOptimization';
import { itemBonuses } from './itemEffects';
import { setPiecesEquipped } from './itemSets';
import { traitStatBonuses } from './traits';
import { talentEffects } from './talents';
import { effectiveWeaponType } from './equipment';
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

/**
 * Drops the sources a build does not have.
 *
 * A list padded with zeroes is a worse explanation than a short one: the reader
 * has to scan fifteen rows to find the three that matter. Written as a filter on
 * a full literal rather than conditional pushes so the set of possible sources
 * stays readable in one place.
 */
function compactSources(sources: DerivedSource[]): DerivedSource[] {
  return sources.filter(source => source.value !== 0);
}

/** The one place a source list becomes a number, so list and total cannot drift. */
function sumSources(sources: DerivedSource[], channel: DerivedSource['channel']): number {
  return sources.reduce((total, source) => (source.channel === channel ? total + source.value : total), 0);
}
export const ELEMENT_KEYS: ElementKey[] = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

/*
 * `evaluateBuild` runs on the order of a hundred thousand times per optimizer
 * search, and the overwhelming majority of those builds have no skills ranked and
 * nothing installed. These shared constants and the allocation-free emptiness
 * check keep that common case free of per-call garbage.
 */
const EMPTY_SKILL_BONUSES: SkillBonuses = { stats: {}, derived: {}, elemental: {} };
const EMPTY_RANKS: SkillRanks = {};

/** True when a record has at least one key, without allocating a key array. */
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

/**
 * What the hands, legs and accessory slots add through their material and
 * enchantment, summed across every filled slot.
 *
 * Shaped like the armour modifiers so the totals drop into the same places they
 * do, rather than each slot being threaded through separately.
 */
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

/*
 * Shared and frozen because the overwhelming majority of builds the optimizer
 * evaluates have nothing in slots 3-6, and this path must not allocate for them.
 */
const NO_GEAR_BONUS: GearBonus = Object.freeze({
  evade: 0, hp: 0, fp: 0, armor: 0, magicArmor: 0, critical: 0, criticalEvade: 0,
  statusResistance: 0, stats: Object.freeze({}), resistances: Object.freeze({}),
}) as GearBonus;

/** Which enchantment profile each slot of `gearSlots` reads. */
const GEAR_ENCHANT_SLOTS = ['Hands', 'Legs', 'Accessory', 'Accessory'] as const;

function sumGearModifiers(slots: Array<{ itemName: string | null; material?: string; enchantment?: string } | undefined>): GearBonus {
  const total: GearBonus = {
    evade: 0, hp: 0, fp: 0, armor: 0, magicArmor: 0, critical: 0, criticalEvade: 0,
    statusResistance: 0, stats: {}, resistances: {},
  };
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (!slot?.itemName) continue;
    // A material on one of these slots resolves through its `Other` profile, and
    // an enchantment through the profile for this slot specifically.
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
      // Only the enchantment shape carries this one; a material never does.
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

/**
 * Full weapon slot result for a config. Every field `calculateWeaponSlot`
 * produces, not just the handful the build evaluation keeps.
 *
 * Exported so the Weapon workspace can render its result table from exactly the
 * same input assembly the build evaluation uses, rather than rebuilding it.
 */
export function evaluateWeaponSlot(config: WeaponConfig, stats: StatRecord, extraCritChance = 0, traitIds: string[] = []) {
  const materials = modifierData.materials as Record<string, WeaponModifier>;
  const parts = modifierData.parts as Record<string, WeaponModifier>;
  const enchantments = modifierData.enchantments as Record<string, WeaponEnchantment>;
  const material = materials[config.material] ?? materials.None;
  const selectedParts = [config.part1, config.part2, config.part3].map(part => parts[part] ?? parts.None);
  const enchantment = enchantments[config.enchantment] ?? enchantments.None;
  /*
   * The scaling actually in play, not the weapon's printed tags: an enchantment,
   * a part or a trait can rewrite them. See `domain/weaponScaling.ts`.
   */
  const scaling = effectiveScaling(config, traitIds);
  const scalingContribution = scaledStatContribution(stats, scaling);
  // Not routed through `scaledStatContribution`: the STR-primary critical bonus
  // reads the listed percentage, not the SWA-multiplied one.
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

export function evaluateBuild(build: BuildState): BuildEvaluation {
  const subrace = SUBRACES[build.subrace] ?? emptyStats();
  const race = RACES[build.race];
  const mainClass = CLASSES[build.mainClass] ?? emptyStats();
  const monoclassModifier = build.mainClass === build.subClass ? 2 : 1;
  const history = HISTORY[build.history] ?? HISTORY.None ?? { stats: {}, description: '' };
  const food = FOODS[build.food] ?? FOODS.None ?? { stats: {}, hp: 0, fp: 0, description: '' };
  const astrologyStat = build.astrology ? ASTROLOGY_PLANETS[build.astrology] : undefined;
  const passives = combinedPassiveBonus(build);
  /*
   * Skill bonuses come from both class slots. Only effects the dataset marks
   * `always`, plus situational ones the user has switched on, are counted.
   */
  const hasSkillRanks = hasAnyKey(build.skillRanks?.main) || hasAnyKey(build.skillRanks?.sub);
  const mergedSkillRanks = hasSkillRanks ? mergeSkillRanks(build.skillRanks) : EMPTY_RANKS;
  const youkaiBonuses = youkaiNumericBonuses(build, mergedSkillRanks);
  /*
   * Four class skills carry effects the wiki states as prose rather than a
   * parseable bonus, so they are computed by hand from their rank rather than
   * through `skillBonuses`. Their rank is the one in the Skills sheet. They used
   * to have their own controls under Talents, which meant the same skill could be
   * set to two different ranks in two places.
   */
  const rising = calculateRisingGameBonus(build.hpPercent, mergedSkillRanks['rising-game'] ?? 0);
  const painToleranceRank = mergedSkillRanks['pain-tolerance'] ?? 0;
  const hasFortitude = (mergedSkillRanks.fortitude ?? 0) >= 1;
  const hasEndurance = (mergedSkillRanks.endurance ?? 0) >= 1;
  const skills = hasSkillRanks
    ? skillBonuses(skillsForClassSlots(build.mainClass, build.subClass), mergedSkillRanks, build.skillConditionals)
    : EMPTY_SKILL_BONUSES;
  const karakuri = karakuriBonus(build);
  /* Traits the build has bought. History traits are skipped inside
     `traitStatBonuses` because the `history` field already grants them. */
  const traits = traitStatBonuses(build.traits ?? []);
  /*
   * Talents, scoped to the weapon actually in hand: Blade Expertise's Hit is
   * worth nothing to an axe build. Conditional subtalents count only once the
   * build has confirmed them, the same opt-in `skillConditionals` uses.
   */
  const talents = talentEffects(build, effectiveWeaponType(build.equipment.primaryWeapon));
  const armor = build.equipment.armorName ? ARMORS[build.equipment.armorName] ?? null : null;
  const armorConditional = calculateArmorConditionals(armor, build.equipment.armorConditionalBonuses);
  /*
   * Hoisted above `additionFor`: materials and enchantments grant stats as well
   * as armour values, so they have to be known before the stat totals are built.
   */
  const armorMaterial = armorMaterialModifier(build.equipment.armorMaterial);
  const armorQuality = armorQualityModifier(build.equipment.armorQuality);
  const armorEnchant = armorEnchantmentEffect(build.equipment.armorEnchantment);
  /*
   * Per-item effects, several of which scale with UL (the upgrade points spent
   * on that piece), so they cannot be resolved until the upgrade spend is known.
   */
  /*
   * Slots 3 to 6. Slot 3 is exclusive: a build using an off-hand weapon has no
   * hands piece, so the hands entry is skipped rather than both being counted.
   */
  /*
   * Dragon King and Dragon Queen, counted from what is equipped.
   *
   * Both were a number the user typed into Advanced, which could claim four
   * pieces when only three King and two Queen items exist and never checked that
   * any of them were worn. Now that sets know their own membership the count is
   * simply read off the loadout.
   */
  const dragonKingPieces = setPiecesEquipped(build.equipment, 'Dragon King');
  const dragonQueenPieces = setPiecesEquipped(build.equipment, 'Dragon Queen');

  const usingOffHand = equippedSlot3(build.equipment) === 'offHandWeapon';
  const equippedHands = usingOffHand ? undefined : build.equipment.hands;
  /*
   * Left undefined when the build has nothing in slots 3-6, which is the case for
   * almost every build the optimizer evaluates. Allocating the array regardless
   * put four-element garbage on the hot path.
   */
  const gearSlots = equippedHands || build.equipment.legs || build.equipment.accessory1 || build.equipment.accessory2
    ? [equippedHands, build.equipment.legs, build.equipment.accessory1, build.equipment.accessory2]
    : undefined;
  const items = itemBonuses({
    weaponName: build.equipment.primaryWeapon?.selectedWeaponName,
    armorName: build.equipment.armorName,
    weaponPoints: build.equipment.primaryWeapon ? resolveUpgradePoints(build.equipment.primaryWeapon) : undefined,
    armorPoints: resolveArmorUpgradePoints(build.equipment),
    gear: gearSlots,
    // Armor item effects share the armor conditional controls. Weapon item
    // effects retain their separate optional map for forward compatibility.
    conditionals: {
      ...build.equipment.armorConditionalBonuses,
      ...(build.equipment.itemConditionalBonuses ?? {}),
    },
    rolls: build.equipment.itemRolls,
  });
  /*
   * What the four slots add beyond their item effects: the crafting material,
   * resolved through its `Other` profile rather than its armour one, and the
   * enchantment, resolved per slot. Accessories take a material but the wiki
   * gives them no enchantment slot of their own, so only hands and legs are
   * enchanted here.
   */
  const gearBonus = gearSlots ? sumGearModifiers(gearSlots) : NO_GEAR_BONUS;

  /*
   * Upgrade tracks. Each point is worth +1 of its stat, and these slots have no
   * durability track. Hands buys Hit on the main weapon and Max FP; legs buys
   * Max HP and Evade. Accessory points go to Fortune and Greed, which are drop
   * rate qualities rather than combat stats and so move nothing here.
   */
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
    // Deliberately the true subrace line, not the installed one: Install is a
    // combat transformation, while this cap governs how many points a player may
    // allocate, which they do out of combat, as themselves.
    const preCap = (subrace[stat] ?? 0) + (build.customBaseStats[stat] ?? 0) + (leBonus[stat] ?? 0) + (history.stats[stat] ?? 0) + (astrologyStat === stat ? 1 : 0);
    maxInvestedStats[stat] = Math.max(0, 80 - preCap);
  }

  /*
   * Install replaces the Summoner's racial base stats with the Youkai's, so the
   * subrace line is substituted rather than added to. FAI, SAN and APT are absent
   * from the override and keep their original values, as Install specifies.
   */
  const installedStats = build.youkai?.installed ? installedBaseStats(build.youkai, mergedSkillRanks) : null;
  const racialFor = (stat: StatKey) => installedStats?.[stat] ?? subrace[stat] ?? 0;
  const baseFor = (stat: StatKey) => racialFor(stat) + (build.customBaseStats[stat] ?? 0) + karakuri[stat] + (leBonus[stat] ?? 0);
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
      + (armor?.statBonuses?.[stat] ?? 0) + (armorConditional.stats[stat] ?? 0) + (weaponBonus[stat] ?? 0)
      + (armorMaterial.stats[stat] ?? 0) + (armorEnchant.stats[stat] ?? 0) + (items.stats[stat] ?? 0)
      + (gearBonus.stats[stat] ?? 0)
      + (traits[stat] ?? 0)
      + (skills.stats[stat] ?? 0)
      + (youkaiBonuses.stats[stat] ?? 0);
  };

  const aptDragon = 0;
  /*
   * APT that counts toward the "every 6 grants +1 to every other stat" rule.
   *
   * Only APT the character actually owns: the racial line, points spent on it,
   * the class's per-level share, a custom base and the astrology pick. Bonus APT
   * (from a trait or a piece of equipment) raises the stat but does **not** push
   * the threshold, so `Bands of the Chimera` cannot hand a build sitting at 35
   * APT a free +1 to all twelve.
   *
   * Deliberately not `additionFor('apt')`, which folds in every bonus source in
   * the game and was what made that happen.
   */
  // `baseFor` already carries the custom base and Legend Extend, so this is only
  // the allocated share: points spent, plus the astrology pick.
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

  /*
   * Post-softcap buffs, applied before anything reads the stat line.
   *
   * Deliberately outside `calculateDiminishingReturns`: these are statuses, not
   * allocation, so the softcap does not get to shave them. They also do not feed
   * the aptitude threshold, which is computed above from owned APT only.
   */
  if (build.statBuffs) {
    for (const stat of STAT_KEYS) {
      const buff = build.statBuffs[stat] ?? 0;
      if (!buff) continue;
      scaledStats[stat] += buff;
      rawStats[stat] += buff;
    }
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

  /*
   * The Redtail's dice scale off Scaled SAN, so they are resolved once the stat
   * block is final and then spent into Hit/Critical, Evade/Critical Evade, or
   * the luck-status channel depending on the colour showing.
   */
  const fortune = calculateRedtailFortune({
    subrace: build.subrace,
    diceColor: build.redtailDiceColor,
    fortuneLevel: build.redtailFortuneLevel,
    scaledSan: scaledStats.san,
  });

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
    fortitude: hasFortitude,
    painToleranceRank,
    warwalk: build.warwalk,
    endurance: hasEndurance,
    customHP: build.customHP + (food.hp ?? 0) + (history.hp ?? 0),
    equipmentHP: (armor?.statBonuses?.hp ?? 0) + armorConditional.hp + armorMaterial.hp + armorEnchant.hp
      + (items.derived.hp ?? 0) + legsPoints.hp + gearBonus.hp,
    normalcyHP,
    lich: build.subrace === 'Lich',
  });
  if (food.hpPercent) maxHP = Math.floor(maxHP * (1 + food.hpPercent / 100));
  if (history.hpPercent) maxHP = Math.floor(maxHP * (1 + history.hpPercent / 100));
  if (armorEnchant.hpPercent) maxHP = Math.floor(maxHP * (1 + armorEnchant.hpPercent / 100));
  let fp = calculateMaxFocus({
    wil: scaledStats.wil,
    san: scaledStats.san,
    fai: scaledStats.fai,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    warwalk: build.warwalk,
    customFP: build.customFP + (food.fp ?? 0) + (history.fp ?? 0),
    equipmentFP: (armor?.statBonuses?.fp ?? 0) + armorConditional.fp + armorMaterial.fp + armorEnchant.fp
      + (items.derived.fp ?? 0) + handsPoints.fp + gearBonus.fp,
    talentFP: talents.maxFp,
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
      manualAdjustment: build.elementalATKAdjustments[element]
        + (armorMaterial.elementalAttack[element] ?? 0) + (armorEnchant.elementalAttack[element] ?? 0)
        + (items.elementalAttack[element] ?? 0)
        // Flat elemental attack from ranked skills: the Evoker's Galren,
        // Kraken, Nerhaven and Redgull, and Call Storm's Water bonus.
        + (skills.elemental[element] ?? 0)
        // And from the elemental talents' Potency line.
        + (talents.elementalAttack[element] ?? 0),
      subrace: build.subrace,
      characterLevel: build.characterLevel,
    });
    elementalResistance[element] = calculateElementalResistance({
      element,
      san: scaledStats.san,
      manualAdjustment: build.elementalRESAdjustments[element],
      raceAdjustment: raceResistance[element] + (youkaiBonuses.elementalResistance[element] ?? 0),
      armorAdjustment: (armor?.resistances?.[element] ?? 0)
        + (armorMaterial.resistances[element] ?? 0) + (armorEnchant.resistances[element] ?? 0)
        + (gearBonus.resistances[element] ?? 0) + (items.resistances[element] ?? 0),
    });
  }

  /*
   * Blunt / Pierce / Slash. Resisted like an element and written like one, so
   * every source states them the same way: the armour's own map, its material
   * and enchantment, whatever slots 3-6 add, and item text such as Half-Plate's
   * "+5% Pierce and Slash Resistance".
   *
   * Unlike the elemental version there is no race, Youkai or San term: nothing
   * grants physical resistance except equipment.
   */
  const physicalResistance = { Blunt: 0, Pierce: 0, Slash: 0 };
  for (const type of PHYSICAL_KEYS) {
    physicalResistance[type] = (armor?.resistances?.[type] ?? 0)
      + (armorMaterial.resistances[type] ?? 0)
      + (armorEnchant.resistances[type] ?? 0)
      + (gearBonus.resistances[type] ?? 0)
      + (items.resistances[type] ?? 0)
      + (youkaiBonuses.physicalResistance[type] ?? 0);
  }

  const armorPoints = resolveArmorUpgradePoints(build.equipment);
  const weaponBase = evaluateWeapon(build.equipment.primaryWeapon, scaledStats, armorConditional.critical, build.traits);
  /*
   * Attacker Hit at each positional tier.
   *
   * `primaryWeapon.hit` is the base tier (no Honor, no flanking), which is what
   * it has always reported. The tiers are what makes the Flanking stat mean
   * anything: it was computed, displayed and scored, but nothing ever converted
   * it into Hit.
   */
  const flanking = FLANKING_BASE + FLANKING_PER_GUI * scaledStats.gui;
  /*
   * `weaponBase.hit` is already `2 x scaled SKI + weapon Accuracy`, so it is the
   * base channel whole. Hand Hit joins it there; the sheet puts it in base, and
   * it is already gated on having no off-hand equipped. Skill, item and Redtail
   * Hit are buffs, so they go through the capped bonus channel.
   */
  /*
   * The weapon's Hit arrives already composed (`2 x scaled SKI` folded into its
   * Accuracy by `calculateWeaponSlot`), so the two terms are reported separately
   * here and the weapon line carries only what is left. Splitting them any other
   * way would double-count SKI.
   */
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
  /*
   * Smite is the model's frontal bonus, not a second one beside it. The Hit
   * workbook hard-codes that term at 15 (Smite at rank 5) because it predates
   * the wiki documenting talents, so the build's real rank is passed instead of
   * being added to the general channel where it would land on tiers the target
   * is not being faced from and stack against the term it already is.
   */
  const attack = attackerHit({
    baseHit: hitBaseSources,
    hitBuffs: hitBonusSources,
    honorHitBonus: talents.frontalHit,
    flanking,
  });

  /*
   * Skill bonuses to Power, Hit and Critical land on the weapon rather than the
   * character, because that is what the wiki describes them as modifying. Added
   * after the weapon is evaluated so they do not feed back into its scaling.
   */
  const primaryWeapon = weaponBase && {
    ...weaponBase,
    power: weaponBase.power + (skills.derived.power ?? 0) + (items.derived.power ?? 0) + youkaiBonuses.weaponPower + talents.power,
    // Two-Hand's Full Swing and Astrology's Tactics raise Scaled Weapon ATK
    // rather than the weapon's printed Power, which is a different term.
    swa: weaponBase.swa + talents.scaledWeaponAtk,
    // The base tier: no Honor, no flanking, the same thing this field has always
    // reported, but with the bonus sources now passed through the +50 cap.
    hit: Math.floor(attack.byTier.base),
    critical: weaponBase.critical + (skills.derived.critical ?? 0) + (items.derived.critical ?? 0) + fortune.critical + talents.critical,
    // Critical Damage is a percentage, and the talent states percentage points.
    criticalDamage: weaponBase.criticalDamage + talents.criticalDamagePercent,
    // Balance sheds weight from the weapon itself, never below nothing.
    weight: Math.max(0, weaponBase.weight - talents.weaponWeightReduction),
  };
  /*
   * Evade, split into the channel the +50 cap governs and the channel it does not.
   *
   * These used to be one uncapped sum, which let a build report Evade no
   * character can reach. The split follows what the community Evade page and the
   * Hit/Evade workbook agree on: an item's own printed Evade, a material or
   * enchantment that alters that statline, upgrade points (Equipment Extras),
   * and Dodger are *base* and uncapped; a passive Evade buff or an item *effect*
   * (Sarasha Gi's +12 is the wiki's own example) is *bonus* and capped.
   *
   * See `domain/hitEvade.ts` for the ordering, and the knowledge base entry for
   * which assignments are sourced versus inferred.
   */
  /*
   * Itemised rather than summed inline, so a readout can name what it is showing.
   * `sumSources` is the only thing that turns these back into a number, which is
   * what keeps the list and the total from drifting apart.
   */
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
    { label: 'Skills', value: skills.derived.evade ?? 0, channel: 'base' },
    { label: 'Giant Gene', value: build.giantGene ? -10 : 0, channel: 'base' },
    { label: 'Bonus Evade override', value: build.bonusEvade, channel: 'bonus' },
    { label: 'Torso conditional effects', value: armorConditional.evade, channel: 'bonus' },
    { label: 'Item effects', value: items.derived.evade ?? 0, channel: 'bonus' },
    { label: 'Redtail fortune', value: fortune.evade, channel: 'bonus' },
    { label: 'Youkai', value: youkaiBonuses.derived.evade, channel: 'bonus' },
  ]);
  const evadeBaseSources = sumSources(evadeSources, 'base');
  const evadeBonusSources = sumSources(evadeSources, 'bonus');
  const ownEvade = targetEvade({ baseEvade: evadeBaseSources, evadeBuffs: evadeBonusSources });

  // Packrat's Hauler raises the carrying cap; the Balance talents lighten the
  // weapon instead, which `primaryWeapon.weight` already reflects.
  const battleWeight = Math.floor(scaledStats.str) + 5 + talents.maxBattleWeight;
  const armorWeight = Math.floor(((armor?.weight ?? 0) + armorMaterial.weight + armorEnchant.weight + armorQuality.weight) * armorEnchant.weightMod);
  const equipmentLoad = (primaryWeapon?.weight ?? 0) + armorWeight;
  const derived = {
    maxHP,
    currentHP: calculateCurrentHealth(maxHP, build.hpPercent),
    fp,
    physicalDefense: Math.floor(scaledStats.def * 0.9),
    magicalDefense: Math.floor(scaledStats.res * 0.9),
    evade: Math.floor(ownEvade.total),
    /** The uncapped channel, reported so the split is visible rather than implied. */
    evadeBase: Math.floor(ownEvade.preBonus),
    /** The capped channel, after the +50 ceiling. */
    evadeBonus: Math.floor(ownEvade.bonusEvade),
    /** Bonus Evade the build has bought but the cap is throwing away. */
    evadeBonusWasted: Math.max(0, Math.floor(evadeBonusSources - ownEvade.bonusEvade)),
    criticalEvade: Math.floor(scaledStats.fai + scaledStats.luc) + armorMaterial.criticalEvade + armorEnchant.criticalEvade + fortune.criticalEvade + (skills.derived.criticalEvade ?? 0) + youkaiBonuses.derived.criticalEvade + gearBonus.criticalEvade,
    // Whimsy is a percentage of the whole figure rather than flat points, so it
    // multiplies the total instead of joining the sum.
    statusInfliction: Math.floor(
      (Math.floor(scaledStats.ski * 2 + scaledStats.wil) + (skills.derived.statusInfliction ?? 0))
      * (1 + talents.statusInflictionPercent / 100),
    ),
    statusResistance: Math.floor(scaledStats.san * 2 + scaledStats.fai)
      + armorEnchant.statusResistance + (skills.derived.statusResistance ?? 0) + gearBonus.statusResistance,
    initiative: racialFor('cel') + build.addedStats.cel + build.customBaseStats.cel + (astrologyStat === 'cel' ? 1 : 0),
    // FAI is one of the stats Install preserves, so this stays on the subrace line.
    youkaiCap: calculateYoukaiCap((subrace.fai ?? 0) + build.customBaseStats.fai + build.addedStats.fai + (leBonus.fai ?? 0) + (astrologyStat === 'fai' ? 1 : 0)),
    flanking: Math.floor(flanking),
    /** Attacker Hit by positional tier. `hitTiers.base` matches the weapon's Hit. */
    hitTiers: {
      base: Math.floor(attack.byTier.base),
      front: Math.floor(attack.byTier.front),
      flank1: Math.floor(attack.byTier.flank1),
      flank2: Math.floor(attack.byTier.flank2),
    },
    /** The uncapped Hit channel: weapon Accuracy, 2x scaled SKI, and Hand Hit. */
    hitBase: Math.floor(attack.preBonus),
    /** Bonus Hit sources before the cap, so the figure stays composable. */
    hitBonusSources,
    /** Bonus Hit after the +50 cap. */
    hitBonusApplied: Math.floor(attack.bonusHit),
    /** Bonus Hit the cap is throwing away. */
    hitBonusWasted: Math.max(0, Math.floor(hitBonusSources - attack.bonusHit)),
    /** Bonus Hit the cap leaves for Honor on a frontal attack. */
    honorHeadroom: Math.floor(attack.honorHeadroom),
    frontalHitBonus: talents.frontalHit,
    skillPool: 11 + Math.floor(scaledStats.gui / 5) + Math.floor(scaledStats.ski / 5) + Math.floor(scaledStats.wil / 10) + (race?.human || subrace.human ? 2 : 0) + talents.skillPool,
    battleWeight,
    armor: (armor?.armor ?? 0) + armorPoints.armor + armorMaterial.armor + armorEnchant.armor + armorQuality.armor + (items.derived.armor ?? 0) + gearBonus.armor + talents.armor,
    magicArmor: (armor?.magicArmor ?? 0) + armorPoints.magicArmor + armorMaterial.magicArmor + armorEnchant.magicArmor + armorQuality.magicArmor + (items.derived.magicArmor ?? 0) + gearBonus.magicArmor + talents.magicArmor,
    /*
     * Everything the torso and gear contribute, across both channels: a
     * diagnostic of "what is the equipment worth", not a channel figure. It
     * deliberately mixes base and bonus, so it must never be fed back into the
     * model as a base input: doing that smuggles bonus Evade past the +50 cap.
     * Use `evadeBase` / `evadeBonus` for that.
     */
    armorEvade: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorQuality.evade + armorConditional.evade + (items.derived.evade ?? 0),
    /** The torso and gear share of the uncapped channel, safe to model with. */
    armorEvadeBase: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorQuality.evade,
    armorWeight,
    equipmentLoad,
    battleWeightRemaining: battleWeight - equipmentLoad,
    encumbrance: Math.floor(scaledStats.str + scaledStats.vit) + 5 + (build.subrace === 'Dullahan' ? 30 : 0) + (build.subrace.includes('Mechanation') ? 20 : 0),
    luckStatusPercent: fortune.luckStatusPercent + youkaiBonuses.derived.luckStatusPercent,
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
    physicalResistance,
    sources: { hit: hitSources, evade: evadeSources },
    primaryWeapon,
  };
}

export function metricValue(evaluation: BuildEvaluation, metric: import('../types').OptimizationMetric): number {
  if (STAT_KEYS.includes(metric as StatKey)) return evaluation.scaledStats[metric as StatKey];
  if (metric === 'weaponPower') return evaluation.primaryWeapon?.power ?? 0;
  if (metric === 'weaponSwa') return evaluation.primaryWeapon?.swa ?? 0;
  if (metric === 'weaponHit') return evaluation.primaryWeapon?.hit ?? 0;
  if (metric === 'weaponCritical') return evaluation.primaryWeapon?.critical ?? 0;
  if (metric === 'weaponCriticalDamage') return evaluation.primaryWeapon?.criticalDamage ?? 0;
  const elementalMetrics = {
    fireAttack: 'Fire', iceAttack: 'Ice', windAttack: 'Wind', earthAttack: 'Earth', darkAttack: 'Dark',
    waterAttack: 'Water', lightAttack: 'Light', lightningAttack: 'Lightning', acidAttack: 'Acid', soundAttack: 'Sound',
  } as const;
  if (metric in elementalMetrics) return evaluation.elementalAttack[elementalMetrics[metric as keyof typeof elementalMetrics]];
  // `derived` is no longer uniformly numeric (`hitTiers` is a record), so the
  // fallback checks rather than trusting the index.
  const value = evaluation.derived[metric as keyof BuildEvaluation['derived']];
  return typeof value === 'number' ? value : 0;
}
