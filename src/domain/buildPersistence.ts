import LZString from 'lz-string';
import { z } from 'zod';
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
  SaveSlotV1,
  SharePayloadV1,
  SkillRanks,
  StampRecord,
  StatRecord,
  WeaponUpgradePoints,
  YoukaiState,
} from '../types';
import {
  NO_ACCESSORY_UPGRADE_POINTS,
  NO_HANDS_UPGRADE_POINTS,
  NO_LEGS_UPGRADE_POINTS,
  resolveUpgradePoints,
} from '../types';
import { emptyYoukaiState, normalizeYoukaiState, youkaiById } from './youkai';
import { traitById } from './traits';
import { subtalentById } from '../data/talents';

/**
 * Talent ranks from a saved build.
 *
 * Unknown subtalent ids are dropped and every rank is clamped to that
 * subtalent's own cap, for the reason armour upgrades are clamped here: a build
 * saved against an older catalog can carry a rank the wiki no longer allows, and
 * it would otherwise feed that figure straight into every derived value.
 */
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
/** Read from `app-release.json` so the notes and the badge can never disagree. */
export const APP_VERSION = APP_RELEASE.version;
export const GAME_DATA_MANIFEST = manifestJson as GameDataManifest;
export const STORAGE_KEYS = {
  preferences: 'sl2:prefs:v1',
  draft: 'sl2:draft:v1',
  saves: 'sl2:saves:v1',
} as const;

export interface UserPreferences {
  showIntro: boolean;
  uiSounds: boolean;
}

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.preferences);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isRecord(parsed)) return {
        showIntro: parsed.showIntro !== false,
        uiSounds: parsed.uiSounds !== false,
      };
    }
    return {
      showIntro: localStorage.getItem('sl2_skip_intro') !== '1',
      uiSounds: localStorage.getItem('sl2_ui_sounds') !== '0',
    };
  } catch {
    return { showIntro: true, uiSounds: true };
  }
}

export function savePreferences(preferences: UserPreferences): void {
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
}

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

/**
 * Skill ranks from an untrusted source, keyed by skill id.
 *
 * The set of ids is open (it grows whenever the wiki dataset is regenerated), so
 * unknown ids are kept rather than dropped: a build saved on a newer dataset
 * should survive a round trip through an older one. Ranks are clamped to
 * non-negative integers; `skillBonuses` bounds them against each skill's maxRank.
 */
const skillRankRecord = (value: unknown): SkillRanks => {
  if (!isRecord(value)) return {};
  const result: SkillRanks = {};
  for (const [id, rank] of Object.entries(value)) {
    const numeric = Math.floor(Number(rank));
    if (Number.isFinite(numeric) && numeric > 0) result[id] = numeric;
  }
  return result;
};

/**
 * Carries the four class skills that used to be Talents controls into the skill
 * sheet, so a build saved before the move keeps the ranks it was built with.
 *
 * `painTolerance` was stored as the HP it granted rather than a rank, which is
 * why it is divided back down. An existing rank always wins: a build saved after
 * the move has already recorded the truth.
 */
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

/**
 * Youkai contracts from an untrusted source.
 *
 * Ids are validated against the dataset, since an unknown Youkai cannot be shown
 * or scored: unlike skill ids, there is no meaningful way to carry it forward.
 * An installed Youkai that is not contracted is dropped rather than silently
 * granting its stats.
 */
const youkaiState = (value: unknown): YoukaiState => {
  if (!isRecord(value)) return emptyYoukaiState();
  const contracted = Array.isArray(value.contracted)
    ? [...new Set(value.contracted.filter((id): id is string => typeof id === 'string' && Boolean(youkaiById(id))))]
    : [];
  const installed = typeof value.installed === 'string' ? value.installed : null;
  return normalizeYoukaiState({ contracted, installed });
};

/*
 * A weapon slot from an untrusted source.
 *
 * Both weapon slots used to be handed to the calculator verbatim,
 * `isRecord(value) ? value as unknown as WeaponConfig`, so a truncated save or a
 * hand-edited share link could put a string in `basePower` and have the damage
 * formulas add it to a number, or omit `baseCritDamage` and have them read
 * undefined. Every field is coerced individually against the defaults
 * `weaponToConfig` builds, for the reason `gearSlot` gives below: it keeps a
 * malformed file from injecting channels the calculator never defined. Each
 * coercion is the same rule the rest of this file uses by hand: `z.string()
 * .catch(x)` is `typeof v === 'string' ? v : x`, and `transform(Boolean)` is
 * `Boolean(v)`, so what loads is unchanged for any build the app itself wrote.
 *
 * An absent field reads as its default rather than failing the whole build,
 * which is what lets a weapon saved before a field existed still load.
 */
const savedNumber = (fallback: number) => z.number().catch(fallback);
const savedName = (fallback: string) => z.string().catch(fallback);
// `.catch` is what covers an absent key: an unknown schema rejects `undefined`
// outright, so without it a weapon saved before a flag existed fails to parse.
const savedFlag = z.unknown().transform(Boolean).catch(false);

const weaponSlotShape = {
  selectedWeaponName: z.string().nullable().catch(null),
  weaponType: savedName(''),
  basePower: savedNumber(0),
  baseCrit: savedNumber(0),
  baseHit: savedNumber(0),
  baseWeight: savedNumber(0),
  baseCritDamage: savedNumber(0),
  material: savedName('None'),
  part1: savedName('None'),
  part2: savedName('None'),
  part3: savedName('None'),
  enchantment: savedName('None'),
  /*
   * These two are read together, never defaulted apart. `resolveUpgradePoints`
   * maps a legacy `upgradeLevel` into the three channels only when no explicit
   * points were saved, so filling `upgradePoints` in with zeroes here would
   * silently strip the upgrades off every build written before it existed.
   */
  upgradeLevel: savedNumber(0),
  upgradePoints: z.object({
    power: savedNumber(0),
    critical: savedNumber(0),
    accuracy: savedNumber(0),
    durability: savedNumber(0),
  }).optional().catch(undefined),
  rarity: savedNumber(0),
  powerQuality: savedFlag,
  critQuality: savedFlag,
  hitQuality: savedFlag,
  weightPlus: savedFlag,
  weightMinus: savedFlag,
  sentimentality: savedFlag,
  twoHandedSkillRank: savedNumber(0),
  customScaling: z.unknown().transform(value => numericRecord(value, ZERO_STATS)).catch(() => ({ ...ZERO_STATS })),
} as const;

/** Consumes a legacy `upgradeLevel` on read, which is the only thing that reads it. */
const withResolvedUpgrades = <T extends { upgradeLevel: number; upgradePoints?: WeaponUpgradePoints }>(config: T) =>
  ({ ...config, upgradeLevel: 0, upgradePoints: resolveUpgradePoints(config) });

const weaponSlotSchema = z.object(weaponSlotShape).transform(withResolvedUpgrades);

const weaponConfigSchema = z.object({
  ...weaponSlotShape,
  comparisonMode: z.boolean().optional().catch(undefined),
  /** "Slot B" of the side-by-side comparison, not an off-hand. */
  secondaryWeapon: weaponSlotSchema.optional().catch(undefined),
}).transform(withResolvedUpgrades);

function savedWeapon<Output>(schema: { safeParse: (value: unknown) => { success: true; data: Output } | { success: false } }, value: unknown): Output | undefined {
  if (!isRecord(value)) return undefined;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function baseClassFor(className: string): string {
  return Object.entries(CLASS_HIERARCHY).find(([, value]) => value.name === className || value.subClasses.includes(className))?.[0] ?? 'Soldier';
}

/**
 * Holds a loaded torso spend inside what its armour class allows.
 *
 * The ceilings depend on the torso, so an unknown or absent armour name leaves
 * every channel uncapped: clamping against a class the build does not wear would
 * be worse than not clamping at all.
 */
function clampArmorUpgradePoints(points: ArmorUpgradePoints, armorName: string | null, world: GameWorld): ArmorUpgradePoints {
  const caps = armorUpgradeCaps(armorName ? ARMORS[armorName]?.type : undefined, world);
  return {
    armor: clampUpgradePoint(points.armor, caps.armor),
    magicArmor: clampUpgradePoint(points.magicArmor, caps.magicArmor),
    evade: clampUpgradePoint(points.evade, caps.evade),
  };
}

/** Applies the weapon ceilings to a parsed slot, leaving an empty slot empty. */
function withWeaponCeilings<T extends { upgradePoints: WeaponUpgradePoints } | undefined>(config: T, world: GameWorld): T {
  if (!config) return config;
  return { ...config, upgradePoints: clampWeaponUpgradePoints(config.upgradePoints, world) };
}

/** The weapon equivalent. Every channel has a ceiling, so none is left open. */
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
  // Read before equipment, because the upgrade ceilings depend on it.
  const world: GameWorld = value.world === 'G6' || value.world === 'Korvara' ? value.world : DEFAULT_WORLD;
  const armorName = typeof equipment.armorName === 'string' && ARMORS[equipment.armorName] ? equipment.armorName : null;

  return {
    race,
    subrace,
    mainClass,
    subClass,
    selectedMainBaseClass: typeof value.selectedMainBaseClass === 'string' ? value.selectedMainBaseClass : baseClassFor(mainClass),
    selectedSubBaseClass: typeof value.selectedSubBaseClass === 'string' ? value.selectedSubBaseClass : baseClassFor(subClass),
    characterLevel: typeof value.characterLevel === 'number' ? value.characterLevel : 60,
    food: typeof value.food === 'string' && FOODS[value.food] ? value.food : 'None',
    history: typeof value.history === 'string' && HISTORY[value.history] ? value.history : 'None',
    addedStats: numericRecord(value.addedStats, ZERO_STATS),
    customStats: numericRecord(value.customStats, ZERO_STATS),
    customBaseStats: numericRecord(value.customBaseStats, ZERO_STATS),
    statBuffs: numericRecord(value.statBuffs, ZERO_STATS),
    world,
    stamps: numericRecord(value.stamps, ZERO_STAMPS),
    legendExtend: isRecord(value.legendExtend) ? Object.fromEntries(Object.entries(value.legendExtend).map(([key, enabled]) => [key, Boolean(enabled)])) : {},
    astrology: typeof value.astrology === 'string' ? value.astrology : '',
    customHP: typeof value.customHP === 'number' ? value.customHP : 0,
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
    mainClassPassive: typeof value.mainClassPassive === 'number' ? value.mainClassPassive : 0,
    subClassPassive: typeof value.subClassPassive === 'number' ? value.subClassPassive : 0,
    // Builds saved before Destiny existed were built against the 35-point
    // budget and two free trees, which is exactly Destiny off.
    destiny: Boolean(value.destiny),
    skillRanks: {
      main: migrateTalentSkills(
        skillRankRecord((value.skillRanks as Record<string, unknown> | undefined)?.main),
        value,
      ),
      sub: skillRankRecord((value.skillRanks as Record<string, unknown> | undefined)?.sub),
    },
    skillConditionals: isRecord(value.skillConditionals)
      ? Object.fromEntries(Object.entries(value.skillConditionals).map(([key, on]) => [key, Boolean(on)]))
      : {},
    youkai: youkaiState(value.youkai),
    // Unknown ids are dropped: a trait that no longer exists cannot be shown or scored.
    traits: Array.isArray(value.traits)
      ? [...new Set(value.traits.filter((id): id is string => typeof id === 'string' && Boolean(traitById(id))))]
      : [],
    talents: talentAllocation(value.talents),
    talentConditionals: isRecord(value.talentConditionals)
      ? Object.fromEntries(Object.entries(value.talentConditionals).map(([key, on]) => [key, Boolean(on)]))
      : {},
    elementalATKAdjustments: numericRecord(value.elementalATKAdjustments, ZERO_ELEMENTS),
    elementalRESAdjustments: numericRecord(value.elementalRESAdjustments, ZERO_ELEMENTS),
    equipment: {
      armorName,
      armorConditionalBonuses: isRecord(equipment.armorConditionalBonuses) ? Object.fromEntries(Object.entries(equipment.armorConditionalBonuses).map(([key, enabled]) => [key, Boolean(enabled)])) : {},
      /*
       * Both were previously dropped on load, so a saved build silently came
       * back with its torso upgrades reset.
       *
       * Clamped against the armour class's ceilings, not merely coerced. Every
       * build saved before those ceilings existed can hold a spend no torso can
       * reach, and the deck only clamps on edit, so without this a stale build
       * would keep an illegal figure and quietly feed it to every derived value.
       * A channel with no recorded ceiling is still bounded below at zero.
       */
      armorUpgradePoints: isRecord(equipment.armorUpgradePoints)
        ? clampArmorUpgradePoints({
          armor: Number(equipment.armorUpgradePoints.armor) || 0,
          magicArmor: Number(equipment.armorUpgradePoints.magicArmor) || 0,
          evade: Number(equipment.armorUpgradePoints.evade) || 0,
        }, armorName, world)
        : undefined,
      // Ranged item rolls. Coerced to finite numbers; the resolver clamps each
      // into its own range, so a stale or hand-edited value cannot escape it.
      itemRolls: isRecord(equipment.itemRolls)
        ? Object.fromEntries(
          Object.entries(equipment.itemRolls)
            .filter(([, value]) => Number.isFinite(Number(value)))
            .map(([key, value]) => [key, Number(value)]),
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
      // Weapon spends are clamped for the same reason torso spends are: the decks
      // only clamp on edit, so a build saved before the ceilings existed would
      // otherwise keep a spend no weapon can reach.
      primaryWeapon: withWeaponCeilings(savedWeapon(weaponConfigSchema, equipment.primaryWeapon), world),
      // Slots 3-6. Absent on any build saved before they existed, which reads as
      // empty rather than as a parse failure.
      hands: gearSlot(equipment.hands, NO_HANDS_UPGRADE_POINTS),
      offHandWeapon: withWeaponCeilings(savedWeapon(weaponSlotSchema, equipment.offHandWeapon), world),
      legs: gearSlot(equipment.legs, NO_LEGS_UPGRADE_POINTS),
      accessory1: gearSlot(equipment.accessory1, NO_ACCESSORY_UPGRADE_POINTS),
      accessory2: gearSlot(equipment.accessory2, NO_ACCESSORY_UPGRADE_POINTS),
    },
  };
}

/**
 * Reads one hands, legs or accessory slot off a saved build.
 *
 * `zero` supplies the track names, so each slot only ever reads its own two. A
 * legs entry cannot come back carrying a stray `hit`. Tracks are coerced
 * individually rather than by spreading the saved object, which is what keeps a
 * hand-edited or truncated file from injecting unknown channels.
 *
 * Every field is read back. The torso upgrades were once dropped here and builds
 * silently reloaded with their points reset; these must not repeat that.
 */
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

export function loadRecoveryDraft(): BuildFileV1 | null {
  const value = localStorage.getItem(STORAGE_KEYS.draft);
  return value ? parseBuildFile(value) : null;
}

export function saveRecoveryDraft(buildName: string, build: BuildState): void {
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(createBuildFile(buildName, build)));
}

export function discardRecoveryDraft(): void {
  localStorage.removeItem(STORAGE_KEYS.draft);
}

export function loadSaveSlots(): SaveSlotV1[] {
  const value = localStorage.getItem(STORAGE_KEYS.saves);
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('Saved build list is corrupted.');
  return parsed.filter(isRecord).map((slot) => ({
    id: String(slot.id),
    name: String(slot.name),
    createdAt: String(slot.createdAt),
    updatedAt: String(slot.updatedAt),
    build: normalizeBuildState(slot.build),
  }));
}

export function persistSaveSlots(slots: SaveSlotV1[]): void {
  localStorage.setItem(STORAGE_KEYS.saves, JSON.stringify(slots));
}
