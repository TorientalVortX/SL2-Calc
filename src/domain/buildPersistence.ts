import LZString from 'lz-string';
import manifestJson from '../data/game-data.json';
import { ARMORS } from '../data/armors';
import { CLASSES, CLASS_HIERARCHY } from '../data/classes';
import { FOODS, HISTORY } from '../data/bonuses';
import { RACES, SUBRACES } from '../data/races';
import type {
  BuildData,
  BuildFileV1,
  BuildState,
  ElementalRecord,
  GameDataManifest,
  SaveSlotV1,
  SharePayloadV1,
  StampRecord,
  StatRecord,
} from '../types';

export const APP_VERSION = '0.6.0';
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

function baseClassFor(className: string): string {
  return Object.entries(CLASS_HIERARCHY).find(([, value]) => value.name === className || value.subClasses.includes(className))?.[0] ?? 'Soldier';
}

export function normalizeBuildState(value: unknown): BuildState {
  if (!isRecord(value)) throw new Error('Build data must be an object.');
  const race = typeof value.race === 'string' && RACES[value.race] ? value.race : null;
  const subrace = typeof value.subrace === 'string' && SUBRACES[value.subrace] ? value.subrace : null;
  const mainClass = typeof value.mainClass === 'string' && CLASSES[value.mainClass] ? value.mainClass : null;
  const subClass = typeof value.subClass === 'string' && CLASSES[value.subClass] ? value.subClass : null;
  if (!race || !subrace || !mainClass || !subClass) throw new Error('Build references an unknown race, subrace, or class.');
  const equipment = isRecord(value.equipment) ? value.equipment : {};
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
    risingGame: typeof value.risingGame === 'number' ? value.risingGame : 0,
    redtailFortuneLevel: typeof value.redtailFortuneLevel === 'number' ? value.redtailFortuneLevel : 1,
    redtailDiceColor: value.redtailDiceColor === 'green' || value.redtailDiceColor === 'yellow' ? value.redtailDiceColor : 'red',
    karakuriYoukai: typeof value.karakuriYoukai === 'string' ? value.karakuriYoukai : 'None',
    fortitude: Boolean(value.fortitude),
    painTolerance: typeof value.painTolerance === 'number' ? value.painTolerance : 0,
    warwalk: Boolean(value.warwalk),
    endurance: Boolean(value.endurance),
    luminaryElement: Boolean(value.luminaryElement),
    persistenceOfNormalcy: Boolean(value.persistenceOfNormalcy),
    powerOfNormalcy: Boolean(value.powerOfNormalcy),
    mainClassPassive: typeof value.mainClassPassive === 'number' ? value.mainClassPassive : 0,
    subClassPassive: typeof value.subClassPassive === 'number' ? value.subClassPassive : 0,
    elementalATKAdjustments: numericRecord(value.elementalATKAdjustments, ZERO_ELEMENTS),
    elementalRESAdjustments: numericRecord(value.elementalRESAdjustments, ZERO_ELEMENTS),
    equipment: {
      armorName,
      armorConditionalBonuses: isRecord(equipment.armorConditionalBonuses) ? Object.fromEntries(Object.entries(equipment.armorConditionalBonuses).map(([key, enabled]) => [key, Boolean(enabled)])) : {},
      // Both were previously dropped on load, so a saved build silently came
      // back with its torso upgrades reset.
      armorUpgradePoints: isRecord(equipment.armorUpgradePoints)
        ? {
          armor: Number(equipment.armorUpgradePoints.armor) || 0,
          magicArmor: Number(equipment.armorUpgradePoints.magicArmor) || 0,
          evade: Number(equipment.armorUpgradePoints.evade) || 0,
          durability: Number(equipment.armorUpgradePoints.durability) || 0,
        }
        : undefined,
      armorMaterial: typeof equipment.armorMaterial === 'string' ? equipment.armorMaterial : undefined,
      armorEnchantment: typeof equipment.armorEnchantment === 'string' ? equipment.armorEnchantment : undefined,
      primaryWeapon: isRecord(equipment.primaryWeapon) ? equipment.primaryWeapon as unknown as BuildState['equipment']['primaryWeapon'] : undefined,
    },
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
