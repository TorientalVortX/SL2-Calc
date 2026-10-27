import LZString from 'lz-string';
import { migrateLegacyClassPassives } from './legacyClassPassives';
import { normalizeSpellthiefState } from './spellthief';
import { normalizeActiveMixtureEffects, normalizeMixturePlan } from './chemist';
import manifestJson from '../data/game-data.json';
import releaseJson from '../data/app-release.json';
import { ARMORS } from '../data/armors';
import { DEFAULT_WORLD, armorUpgradeCaps, clampUpgradePoint, weaponUpgradeCaps } from './upgradeCaps';
import { CLASSES, CLASS_HIERARCHY } from '../data/classes';
import { FOODS, HISTORY } from '../data/bonuses';
import { RACES, SUBRACES } from '../data/races';
import type {
  ArmorUpgradePoints,
  BuildData,
  GameWorld,
  AppRelease,
  BuildFileV1,
  BuildState,
  ElementalRecord,
  GameDataManifest,
  GearSlotState,
  SharePayloadV1,
  SkillRanks,
  StampRecord,
  StatRecord,
  WeaponConfig,
  WeaponSlotConfig,
  WeaponUpgradePoints,
  YoukaiState,
} from '../types';
import {
  NO_ACCESSORY_UPGRADE_POINTS,
  NO_HANDS_UPGRADE_POINTS,
  NO_LEGS_UPGRADE_POINTS,
  TETRA_ALIGNMENTS,
  resolveUpgradePoints,
} from '../types';
import { emptyYoukaiState, normalizeYoukaiState, youkaiById } from './youkai';
import { traitById } from './traits';
import { migrateItemKey } from './itemEffects';
import { subtalentById } from '../data/talents';

function talentAllocation(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const allocation: Record<string, number> = {};
  for (const [id, rank] of Object.entries(value)) {
    const subtalent = subtalentById(id);
    if (!subtalent) continue;
    const clamped = Math.max(0, Math.min(Math.floor(Number(rank) || 0), subtalent.maxSr));
    if (clamped > 0) allocation[id] = clamped;
  }
  return allocation;
}

export const APP_RELEASE = releaseJson as AppRelease;
export const APP_VERSION = APP_RELEASE.version;
export const GAME_DATA_MANIFEST = manifestJson as GameDataManifest;

const MAX_SHARE_LENGTH = 20_000;
const MAX_DECOMPRESSED_LENGTH = 100_000;
const ZERO_STATS: StatRecord = { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
const ZERO_STAMPS: StampRecord = { str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 };
const ZERO_ELEMENTS: ElementalRecord = { Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const numericRecord = <T extends Record<string, number>>(value: unknown, defaults: T): T => {
  if (!isRecord(value)) return { ...defaults };
  return Object.keys(defaults).reduce<T>((result, key) => {
    const candidate = value[key];
    result[key as keyof T] = (typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : defaults[key]) as T[keyof T];
    return result;
  }, { ...defaults });
};

// Unknown ids are kept so a build saved on a newer dataset survives a round trip through an older one.
const skillRankRecord = (value: unknown): SkillRanks => {
  if (!isRecord(value)) return {};
  const result: SkillRanks = {};
  for (const [id, rank] of Object.entries(value)) {
    const numeric = Math.floor(Number(rank));
    if (Number.isFinite(numeric) && numeric > 0) result[id] = numeric;
  }
  return result;
};

// Older saves stored these as Talents fields; `painTolerance` was the HP granted, not a rank.
const migrateTalentSkills = (ranks: SkillRanks, value: Record<string, unknown>): SkillRanks => {
  const legacy: Array<[string, number]> = [
    ['rising-game', Math.floor(Number(value.risingGame) || 0)],
    ['pain-tolerance', Math.floor((Number(value.painTolerance) || 0) / 10)],
    ['fortitude', value.fortitude ? 1 : 0],
    ['endurance', value.endurance ? 1 : 0],
  ];
  const migrated = { ...ranks };
  for (const [id, rank] of legacy) {
    if (rank > 0 && migrated[id] == null) migrated[id] = rank;
  }
  return migrated;
};

const youkaiState = (value: unknown): YoukaiState => {
  if (!isRecord(value)) return emptyYoukaiState();
  const contracted = Array.isArray(value.contracted)
    ? [...new Set(value.contracted.filter((id): id is string => typeof id === 'string' && Boolean(youkaiById(id))))]
    : [];
  const installed = typeof value.installed === 'string' ? value.installed : null;
  return normalizeYoukaiState({ contracted, installed });
};

const savedNumber = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const savedName = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);

// Left undefined when absent so `resolveUpgradePoints` can map a legacy `upgradeLevel`.
function savedUpgradePoints(value: unknown): WeaponUpgradePoints | undefined {
  if (!isRecord(value)) return undefined;
  return {
    power: savedNumber(value.power, 0),
    critical: savedNumber(value.critical, 0),
    accuracy: savedNumber(value.accuracy, 0),
    durability: savedNumber(value.durability, 0),
  };
}

function savedWeaponSlot(value: unknown): WeaponSlotConfig | undefined {
  if (!isRecord(value)) return undefined;
  const slot = {
    selectedWeaponName: typeof value.selectedWeaponName === 'string' ? value.selectedWeaponName : null,
    weaponType: savedName(value.weaponType, ''),
    basePower: savedNumber(value.basePower, 0),
    baseCrit: savedNumber(value.baseCrit, 0),
    baseHit: savedNumber(value.baseHit, 0),
    baseWeight: savedNumber(value.baseWeight, 0),
    baseCritDamage: savedNumber(value.baseCritDamage, 0),
    material: savedName(value.material, 'None'),
    part1: savedName(value.part1, 'None'),
    part2: savedName(value.part2, 'None'),
    part3: savedName(value.part3, 'None'),
    enchantment: savedName(value.enchantment, 'None'),
    upgradeLevel: savedNumber(value.upgradeLevel, 0),
    upgradePoints: savedUpgradePoints(value.upgradePoints),
    rarity: savedNumber(value.rarity, 0),
    powerQuality: Boolean(value.powerQuality),
    critQuality: Boolean(value.critQuality),
    hitQuality: Boolean(value.hitQuality),
    weightPlus: Boolean(value.weightPlus),
    weightMinus: Boolean(value.weightMinus),
    sentimentality: Boolean(value.sentimentality),
    twoHandedSkillRank: savedNumber(value.twoHandedSkillRank, 0),
    customScaling: numericRecord(value.customScaling, ZERO_STATS),
  };
  return { ...slot, upgradeLevel: 0, upgradePoints: resolveUpgradePoints(slot) };
}

function savedWeaponConfig(value: unknown): WeaponConfig | undefined {
  const slot = savedWeaponSlot(value);
  if (!slot || !isRecord(value)) return undefined;
  return {
    ...slot,
    comparisonMode: typeof value.comparisonMode === 'boolean' ? value.comparisonMode : undefined,
    // Comparison "Slot B", not an off-hand.
    secondaryWeapon: savedWeaponSlot(value.secondaryWeapon),
  };
}

function baseClassFor(className: string): string {
  return Object.entries(CLASS_HIERARCHY).find(([, value]) => value.name === className || value.subClasses.includes(className))?.[0] ?? 'Soldier';
}

function clampArmorUpgradePoints(points: ArmorUpgradePoints, armorName: string | null, world: GameWorld): ArmorUpgradePoints {
  const caps = armorUpgradeCaps(armorName ? ARMORS[armorName]?.type : undefined, world);
  return {
    armor: clampUpgradePoint(points.armor, caps.armor),
    magicArmor: clampUpgradePoint(points.magicArmor, caps.magicArmor),
    evade: clampUpgradePoint(points.evade, caps.evade),
  };
}

function withWeaponCeilings<T extends { upgradePoints: WeaponUpgradePoints } | undefined>(config: T, world: GameWorld): T {
  if (!config) return config;
  return { ...config, upgradePoints: clampWeaponUpgradePoints(config.upgradePoints, world) };
}

function clampWeaponUpgradePoints(points: WeaponUpgradePoints, world: GameWorld): WeaponUpgradePoints {
  const caps = weaponUpgradeCaps(world);
  return {
    power: clampUpgradePoint(points.power, caps.power),
    critical: clampUpgradePoint(points.critical, caps.critical),
    accuracy: clampUpgradePoint(points.accuracy, caps.accuracy),
    durability: clampUpgradePoint(points.durability, caps.durability),
  };
}

export function normalizeBuildState(value: unknown): BuildState {
  if (!isRecord(value)) throw new Error('Build data must be an object.');
  const race = typeof value.race === 'string' && RACES[value.race] ? value.race : null;
  const subrace = typeof value.subrace === 'string' && SUBRACES[value.subrace] ? value.subrace : null;
  const mainClass = typeof value.mainClass === 'string' && CLASSES[value.mainClass] ? value.mainClass : null;
  const subClass = typeof value.subClass === 'string' && CLASSES[value.subClass] ? value.subClass : null;
  if (!race || !subrace || !mainClass || !subClass) throw new Error('Build references an unknown race, subrace, or class.');
  const equipment = isRecord(value.equipment) ? value.equipment : {};
  const world: GameWorld = value.world === 'G6' || value.world === 'Korvara' ? value.world : DEFAULT_WORLD;
  const armorName = typeof equipment.armorName === 'string' && ARMORS[equipment.armorName] ? equipment.armorName : null;
  const savedHistory = Array.isArray(value.traits)
    ? value.traits.map(id => typeof id === 'string' ? traitById(id)?.historyKey : undefined).find(Boolean)
    : undefined;

  const build: BuildState = {
    race,
    subrace,
    mainClass,
    subClass,
    selectedMainBaseClass: typeof value.selectedMainBaseClass === 'string' ? value.selectedMainBaseClass : baseClassFor(mainClass),
    selectedSubBaseClass: typeof value.selectedSubBaseClass === 'string' ? value.selectedSubBaseClass : baseClassFor(subClass),
    characterLevel: typeof value.characterLevel === 'number' ? value.characterLevel : 60,
    food: typeof value.food === 'string' && FOODS[value.food] ? value.food : 'None',
    history: typeof value.history === 'string' && HISTORY[value.history] ? value.history : savedHistory ?? 'None',
    addedStats: numericRecord(value.addedStats, ZERO_STATS),
    customStats: numericRecord(value.customStats, ZERO_STATS),
    customBaseStats: numericRecord(value.customBaseStats, ZERO_STATS),
    statBuffs: numericRecord(value.statBuffs, ZERO_STATS),
    world,
    stamps: numericRecord(value.stamps, ZERO_STAMPS),
    legendExtend: isRecord(value.legendExtend) ? Object.fromEntries(Object.entries(value.legendExtend).map(([key, enabled]) => [key, Boolean(enabled)])) : {},
    astrology: typeof value.astrology === 'string' ? value.astrology : '',
    customHP: typeof value.customHP === 'number' ? value.customHP : 0,
    whiteSpiritCount: typeof value.whiteSpiritCount === 'number' && Number.isFinite(value.whiteSpiritCount)
      ? Math.max(0, Math.min(5, Math.floor(value.whiteSpiritCount))) : 0,
    crystalCount: typeof value.crystalCount === 'number' && Number.isFinite(value.crystalCount)
      ? Math.max(0, Math.min(45, Math.floor(value.crystalCount))) : 0,
    customFP: typeof value.customFP === 'number' ? value.customFP : 0,
    baseEvade: typeof value.baseEvade === 'number' ? value.baseEvade : 0,
    bonusEvade: typeof value.bonusEvade === 'number' ? value.bonusEvade : 0,
    giantGene: Boolean(value.giantGene),
    dragonKing: typeof value.dragonKing === 'number' ? value.dragonKing : 0,
    dragonQueen: typeof value.dragonQueen === 'number' ? value.dragonQueen : 0,
    hpPercent: typeof value.hpPercent === 'number' ? value.hpPercent : 100,
    sanguineCrest: Boolean(value.sanguineCrest),
    felidaeInstinct: Boolean(value.felidaeInstinct),
    lupineInstinct: Boolean(value.lupineInstinct),
    redtailFortuneLevel: typeof value.redtailFortuneLevel === 'number' ? value.redtailFortuneLevel : 1,
    redtailDiceColor: value.redtailDiceColor === 'green' || value.redtailDiceColor === 'yellow' ? value.redtailDiceColor : 'red',
    karakuriYoukai: typeof value.karakuriYoukai === 'string' ? value.karakuriYoukai : 'None',
    warwalk: Boolean(value.warwalk),
    luminaryElement: Boolean(value.luminaryElement),
    persistenceOfNormalcy: Boolean(value.persistenceOfNormalcy),
    powerOfNormalcy: Boolean(value.powerOfNormalcy),
    // Pre-Destiny saves used the 35-point budget and two free trees, which is Destiny off.
    destiny: Boolean(value.destiny),
    skillRanks: migrateLegacyClassPassives(value, {
      main: migrateTalentSkills(
        skillRankRecord((value.skillRanks as Record<string, unknown> | undefined)?.main),
        value,
      ),
      sub: skillRankRecord((value.skillRanks as Record<string, unknown> | undefined)?.sub),
    }),
    mixturePlan: normalizeMixturePlan(value.mixturePlan),
    activeMixtureEffects: normalizeActiveMixtureEffects(value.activeMixtureEffects, value.mixturePlan),
    skillConditionals: isRecord(value.skillConditionals)
      ? Object.fromEntries(Object.entries(value.skillConditionals).map(([key, on]) => [key, Boolean(on)]))
      : {},
    skillInputs: isRecord(value.skillInputs)
      ? Object.fromEntries(Object.entries(value.skillInputs).filter(([, amount]) => typeof amount === 'number' && Number.isFinite(amount)).map(([key, amount]) => [key, Math.max(0, Math.floor(amount as number))]))
      : {},
    youkai: youkaiState(value.youkai),
    traits: Array.isArray(value.traits)
      ? [...new Set(value.traits.filter((id): id is string => typeof id === 'string' && Boolean(traitById(id)) && !traitById(id)?.historyKey))]
      : [],
    talents: talentAllocation(value.talents),
    talentConditionals: isRecord(value.talentConditionals)
      ? Object.fromEntries(Object.entries(value.talentConditionals).map(([key, on]) => [key, Boolean(on)]))
      : {},
    traitConditionals: isRecord(value.traitConditionals)
      ? Object.fromEntries(Object.entries(value.traitConditionals).filter(([id, on]) => on && traitById(id)).map(([id]) => [id, true]))
      : {},
    elementalATKAdjustments: numericRecord(value.elementalATKAdjustments, ZERO_ELEMENTS),
    elementalRESAdjustments: numericRecord(value.elementalRESAdjustments, ZERO_ELEMENTS),
    equipment: {
      armorName,
      armorConditionalBonuses: isRecord(equipment.armorConditionalBonuses) ? Object.fromEntries(Object.entries(equipment.armorConditionalBonuses).map(([key, enabled]) => [migrateItemKey(key), Boolean(enabled)])) : {},
      armorUpgradePoints: isRecord(equipment.armorUpgradePoints)
        ? clampArmorUpgradePoints({
          armor: Number(equipment.armorUpgradePoints.armor) || 0,
          magicArmor: Number(equipment.armorUpgradePoints.magicArmor) || 0,
          evade: Number(equipment.armorUpgradePoints.evade) || 0,
        }, armorName, world)
        : undefined,
      itemConditionalBonuses: isRecord(equipment.itemConditionalBonuses)
        ? Object.fromEntries(Object.entries(equipment.itemConditionalBonuses).filter(([, on]) => on).map(([key]) => [migrateItemKey(key), true]))
        : undefined,
      itemRolls: isRecord(equipment.itemRolls)
        ? Object.fromEntries(
          Object.entries(equipment.itemRolls)
            .filter(([, value]) => Number.isFinite(Number(value)))
            .map(([key, value]) => [migrateItemKey(key), Number(value)]),
        )
        : undefined,
      armorQuality: isRecord(equipment.armorQuality)
        ? {
          solid: Boolean(equipment.armorQuality.solid),
          polished: Boolean(equipment.armorQuality.polished),
          goodFit: Boolean(equipment.armorQuality.goodFit),
          lightweight: Boolean(equipment.armorQuality.lightweight),
          heavy: Boolean(equipment.armorQuality.heavy),
        }
        : undefined,
      armorMaterial: typeof equipment.armorMaterial === 'string' ? equipment.armorMaterial : undefined,
      armorEnchantment: typeof equipment.armorEnchantment === 'string' ? equipment.armorEnchantment : undefined,
      primaryWeapon: withWeaponCeilings(savedWeaponConfig(equipment.primaryWeapon), world),
      hands: gearSlot(equipment.hands, NO_HANDS_UPGRADE_POINTS),
      offHandWeapon: withWeaponCeilings(savedWeaponSlot(equipment.offHandWeapon), world),
      legs: gearSlot(equipment.legs, NO_LEGS_UPGRADE_POINTS),
      accessory1: gearSlot(equipment.accessory1, NO_ACCESSORY_UPGRADE_POINTS),
      accessory2: gearSlot(equipment.accessory2, NO_ACCESSORY_UPGRADE_POINTS),
    },
  };
  return { ...build, spellthief: normalizeSpellthiefState(value.spellthief, build) };
}

function gearSlot<Points extends object>(
  value: unknown,
  zero: Points,
): GearSlotState<Points> | undefined {
  if (!isRecord(value)) return undefined;
  const saved = isRecord(value.upgradePoints) ? value.upgradePoints : {};
  const upgradePoints = Object.fromEntries(
    Object.keys(zero).map(track => [track, Number(saved[track]) || 0]),
  ) as Points;
  return {
    itemName: typeof value.itemName === 'string' ? value.itemName : null,
    material: typeof value.material === 'string' ? value.material : undefined,
    enchantment: typeof value.enchantment === 'string' ? value.enchantment : undefined,
    tetra: TETRA_ALIGNMENTS.find(alignment => alignment === value.tetra),
    upgradePoints,
  };
}

export function createBuildFile(buildName: string, build: BuildState): BuildFileV1 {
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    dataVersion: GAME_DATA_MANIFEST.dataVersion,
    exportedAt: new Date().toISOString(),
    buildName: buildName.trim() || 'My Build',
    build: normalizeBuildState(build),
  };
}

export function parseBuildFile(text: string): BuildFileV1 {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error('Build file must contain a JSON object.');
  if (parsed.schemaVersion === 1 && isRecord(parsed.build)) {
    return {
      schemaVersion: 1,
      appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : APP_VERSION,
      dataVersion: typeof parsed.dataVersion === 'string' ? parsed.dataVersion : GAME_DATA_MANIFEST.dataVersion,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      buildName: typeof parsed.buildName === 'string' ? parsed.buildName : 'Imported Build',
      build: normalizeBuildState(parsed.build),
    };
  }
  if ('schemaVersion' in parsed) {
    throw new Error(`Unsupported build schema version "${String(parsed.schemaVersion)}". Export JSON from a compatible calculator version instead.`);
  }
  const legacy = parsed as unknown as Partial<BuildData> & Record<string, unknown>;
  return createBuildFile(typeof legacy.buildName === 'string' ? legacy.buildName : 'Imported v0.5 Build', normalizeBuildState({
    ...legacy,
    equipment: { armorName: null, armorConditionalBonuses: {} },
  }));
}

export function encodeSharePayload(buildName: string, build: BuildState): string {
  const payload: SharePayloadV1 = { schemaVersion: 1, dataVersion: GAME_DATA_MANIFEST.dataVersion, buildName: buildName.trim() || 'Shared Build', build: normalizeBuildState(build) };
  const json = JSON.stringify(payload);
  if (json.length > MAX_DECOMPRESSED_LENGTH) throw new Error('This build is too large to share as a URL. Export JSON instead.');
  const encoded = LZString.compressToEncodedURIComponent(json);
  if (encoded.length > MAX_SHARE_LENGTH) throw new Error('This build is too large to share as a URL. Export JSON instead.');
  return encoded;
}

export function decodeSharePayload(encoded: string): SharePayloadV1 {
  if (!encoded || encoded.length > MAX_SHARE_LENGTH) throw new Error('Shared build link is empty or too large.');
  const json = LZString.decompressFromEncodedURIComponent(encoded);
  if (!json || json.length > MAX_DECOMPRESSED_LENGTH) throw new Error('Shared build link is invalid or too large.');
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.build)) throw new Error('Unsupported shared build format.');
  return { schemaVersion: 1, dataVersion: String(parsed.dataVersion ?? ''), buildName: String(parsed.buildName ?? 'Shared Build'), build: normalizeBuildState(parsed.build) };
}
