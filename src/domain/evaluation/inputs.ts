import type { BuildState, ElementKey, ResistKey, SkillRanks, StatKey, StatRecord, WeaponConfig } from '../../types';
import {
  NO_HANDS_UPGRADE_POINTS,
  NO_LEGS_UPGRADE_POINTS,
  equippedSlot3,
  resolveArmorUpgradePoints,
  resolveUpgradePoints,
} from '../../types';
import { RACES, SUBRACES } from '../../data/races';
import { CLASSES } from '../../data/classes';
import { ASTROLOGY_PLANETS, FOODS, HISTORY, LEGEND_EXTEND } from '../../data/bonuses';
import { ARMORS } from '../../data/armors';
import { armorMaterialModifier, armorQualityModifier, otherMaterialModifier, weaponMaterialExtras } from '../armorMaterials';
import { armorEnchantmentEffect, enchantmentEffectForSlot } from '../armorEnchantments';
import { calculateRisingGameBonus } from '../calculations';
import { mergeSkillRanks, skillBonuses, skillsForClassSlots, type SkillBonuses } from '../skills';
import { youkaiNumericBonuses } from '../youkaiBonuses';
import { itemBonuses } from '../itemEffects';
import { setPiecesEquipped } from '../itemSets';
import { traitStatBonuses } from '../traits';
import { boostedClassStats, classArmorApplies } from '../classArmor';
import { talentEffects } from '../talents';
import { effectiveWeaponTypes, findWeaponByName } from '../equipment';
import { activeMixtureBonuses } from '../chemist';
import { calculateArmorConditionals } from '../derivedCalculations';
import { emptyStats } from './shared';
import { equippedSets } from '../itemSets';

const EMPTY_SKILL_BONUSES: SkillBonuses = { stats: {}, buffStats: {}, derived: {}, elemental: {}, elementalResistance: {} };
const EMPTY_RANKS: SkillRanks = {};

function hasAnyKey(record: Record<string, unknown> | undefined): boolean {
  if (!record) return false;
  for (const _key in record) return true;
  return false;
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
  elementalAttack: Partial<Record<ElementKey, number>>;
}

const NO_GEAR_BONUS: GearBonus = Object.freeze({
  evade: 0, hp: 0, fp: 0, armor: 0, magicArmor: 0, critical: 0, criticalEvade: 0,
  statusResistance: 0, stats: Object.freeze({}), resistances: Object.freeze({}), elementalAttack: Object.freeze({}),
}) as GearBonus;

export const GEAR_ENCHANT_SLOTS = ['Hands', 'Legs', 'Accessory', 'Accessory'] as const;

type GearSlotInput = { itemName: string | null; material?: string; enchantment?: string } | undefined;

function sumGearModifiers(slots: GearSlotInput[]): GearBonus {
  const total: GearBonus = {
    evade: 0, hp: 0, fp: 0, armor: 0, magicArmor: 0, critical: 0, criticalEvade: 0,
    statusResistance: 0, stats: {}, resistances: {}, elementalAttack: {},
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
      for (const [element, value] of Object.entries(source.elementalAttack)) {
        total.elementalAttack[element as ElementKey] = (total.elementalAttack[element as ElementKey] ?? 0) + (value ?? 0);
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

export type EvaluationInputs = ReturnType<typeof gatherInputs>;

/** Everything the build contributes before any stat is scaled. */
export function gatherInputs(build: BuildState) {
  const mixtureBonuses = activeMixtureBonuses(build);
  const subrace = SUBRACES[build.subrace] ?? emptyStats();
  const race = RACES[build.race];
  const classStats = CLASSES[build.mainClass] ?? emptyStats();
  const mainClass = classArmorApplies(build.equipment.armorName, build.mainClass) ? boostedClassStats(classStats) : classStats;
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
  const initialSkills = hasSkillRanks
    ? skillBonuses(availableSkills, mergedSkillRanks, build.skillConditionals, skillWeaponTypes, skillContext)
    : EMPTY_SKILL_BONUSES;
  const karakuri = karakuriBonus(build);
  // History traits are skipped inside `traitStatBonuses`; the `history` field already grants them.
  const traits = traitStatBonuses(build.traits ?? [], build.traitConditionals);
  // Grip talents are resolved from the equipped weapon in the offense stage, so they are zeroed here.
  const talents = talentEffects({ ...build, talents: { ...build.talents,
    'two-hand/full-swing': 0, 'two-hand/steady': 0 } }, effectiveWeaponTypes(build.equipment.primaryWeapon));
  const armor = build.equipment.armorName ? ARMORS[build.equipment.armorName] ?? null : null;
  const armorConditional = calculateArmorConditionals(armor, build.equipment.armorConditionalBonuses);
  const armorMaterial = armorMaterialModifier(build.equipment.armorMaterial);
  const armorQuality = armorQualityModifier(build.equipment.armorQuality);
  const armorEnchant = armorEnchantmentEffect(build.equipment.armorEnchantment);
  const armorPoints = resolveArmorUpgradePoints(build.equipment);
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
    armorPoints,
    gear: gearSlots,
    conditionals: {
      ...build.equipment.armorConditionalBonuses,
      ...(build.equipment.itemConditionalBonuses ?? {}),
    },
    rolls: build.equipment.itemRolls,
    level: build.characterLevel,
    sets: equippedSets(build.equipment),
  });
  const gearBonus = gearSlots ? sumGearModifiers(gearSlots) : NO_GEAR_BONUS;

  // Accessory upgrade points buy Fortune and Greed (drop rates), so only hands and legs matter here.
  const handsPoints = usingOffHand ? NO_HANDS_UPGRADE_POINTS : build.equipment.hands?.upgradePoints ?? NO_HANDS_UPGRADE_POINTS;
  const legsPoints = build.equipment.legs?.upgradePoints ?? NO_LEGS_UPGRADE_POINTS;

  const weaponBonus = weaponStatBonus(build.equipment.primaryWeapon);
  const weaponMaterial = weaponMaterialExtras(build.equipment.primaryWeapon?.material);
  const leBonus: Partial<StatRecord> = {};
  for (const [key, enabled] of Object.entries(build.legendExtend)) {
    const stat = LEGEND_EXTEND[key]?.stat;
    if (enabled && stat) leBonus[stat] = (leBonus[stat] ?? 0) + 1;
  }

  return {
    build, mixtureBonuses, subrace, race, mainClass, monoclassModifier, history, food, astrologyStat,
    hasSkillRanks, mergedSkillRanks, youkaiBonuses, rising, painToleranceRank, hasFortitude, hasEndurance,
    availableSkills, skillWeaponTypes, skillContext, initialSkills, karakuri, traits, talents,
    armor, armorConditional, armorMaterial, armorQuality, armorEnchant, armorPoints, dragonKingPieces, dragonQueenPieces,
    usingOffHand, equippedHands, gearSlots, items, gearBonus, handsPoints, legsPoints, weaponBonus, weaponMaterial, leBonus,
  };
}
