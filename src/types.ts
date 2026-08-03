/**
 * Type definitions for the SL2 Calculator
 * Contains all TypeScript interfaces, types, and type aliases used throughout the application
 */

// Basic stat and element type definitions
export type StatKey = 'str' | 'wil' | 'ski' | 'cel' | 'def' | 'res' | 'vit' | 'fai' | 'luc' | 'gui' | 'san' | 'apt';
export type StampKey = 'str' | 'wil' | 'ski' | 'cel' | 'vit' | 'fai';
export type ElementKey = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Dark' | 'Water' | 'Light' | 'Lightning' | 'Acid' | 'Sound';
export type DamageType = 'Slash' | 'Pierce' | 'Blunt' | 'Fire' | 'Ice' | 'Lightning' | 'Wind' | 'Earth' | 'Water' | 'Dark' | 'Light' | 'Acid' | 'Sound' | 'Magical' | 'Darkness' | 'Hellfire';
export type WeaponType = 'Sword' | 'Axe' | 'Bow' | 'Dagger' | 'Fist' | 'Gun' | 'Katana' | 'Polearm' | 'Staff' | 'Tome' | 'Spear' | 'Shield' | 'Tool';

// Record types for easier typing
export type StatRecord = Record<StatKey, number>;
export type StampRecord = Record<StampKey, number>;
export type ElementalRecord = Record<ElementKey, number>;

export interface GameDataManifest {
  schemaVersion: 1;
  dataVersion: string;
  updatedAt: string;
  changes: string[];
}

/**
 * Base stats interface with optional race flags
 */
export interface Stats {
  str: number;
  wil: number;
  ski: number;
  cel: number;
  def: number;
  res: number;
  vit: number;
  fai: number;
  luc: number;
  gui: number;
  san: number;
  apt: number;
  human?: boolean;
  homunculi?: boolean;
}

/**
 * Class passive ability configuration
 */
export interface ClassPassive {
  stats: Partial<StatRecord>;
  fpCost?: number;
  maxRank?: number;
  description?: string;
}

/**
 * Food bonus configuration
 */
export interface FoodBonus {
  hp: number;
  fp: number;
  stats: Partial<StatRecord>;
  healthCap?: number;
  focusCap?: number;
  hpPercent?: number;
  fpPercent?: number;
  description: string;
}

/**
 * History bonus configuration
 */
export interface HistoryBonus {
  stats: Partial<StatRecord>;
  hp?: number;
  fp?: number;
  hpPercent?: number;
  fpPercent?: number;
  evade?: number;
  description: string;
}

/**
 * Interface for build data that can be exported/imported
 */
export interface BuildData {
  buildName: string;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  selectedMainBaseClass?: string; // Added for hierarchical class selection
  selectedSubBaseClass?: string;  // Added for hierarchical class selection
  totalPoints: number;
  characterLevel: number;
  food: string;
  history: string;
  addedStats: StatRecord;
  customStats: StatRecord;
  customBaseStats: StatRecord;
  stamps: StampRecord;
  legendExtend: Record<string, boolean>;
  astrology: string; // Now stores single planet name
  customHP: number;
  customFP: number;
  baseEvade: number;
  bonusEvade: number;
  giantGene: boolean;
  dragonKing: number;
  dragonQueen: number;
  hpPercent: number;
  sanguineCrest: boolean;
  felidaeInstinct: boolean;
  lupineInstinct: boolean;
  risingGame: number;
  redtailFortuneLevel: number;
  redtailDiceColor: 'red' | 'green' | 'yellow';
  karakuriYoukai: string;
  fortitude: boolean;
  painTolerance: number;
  warwalk: boolean;
  endurance: boolean;
  luminaryElement: boolean;
  persistenceOfNormalcy: boolean;
  powerOfNormalcy: boolean;
  mainClassPassive: number;
  subClassPassive: number;
  elementalATKAdjustments: ElementalRecord;
  elementalRESAdjustments: ElementalRecord;
  version: string; // For future compatibility
}

export interface WeaponSlotConfig {
  selectedWeaponName: string | null;
  weaponType: string;
  basePower: number;
  baseCrit: number;
  baseHit: number;
  baseWeight: number;
  baseCritDamage: number;
  material: string;
  part1: string;
  part2: string;
  part3: string;
  enchantment: string;
  upgradeLevel: number;
  rarity: number;
  powerQuality: boolean;
  critQuality: boolean;
  hitQuality: boolean;
  weightPlus: boolean;
  weightMinus: boolean;
  sentimentality: boolean;
  twoHandedSkillRank: number;
  customScaling: Omit<StatRecord, 'apt'>;
}

export interface WeaponConfig extends WeaponSlotConfig {
  comparisonMode?: boolean;
  secondaryWeapon?: WeaponSlotConfig;
}

export interface BuildEquipmentState {
  armorName: string | null;
  armorConditionalBonuses: Record<string, boolean>;
  primaryWeapon?: WeaponConfig;
}

export type BuildState = Omit<BuildData, 'buildName' | 'totalPoints' | 'version'> & {
  equipment: BuildEquipmentState;
};

export interface BuildFileV1 {
  schemaVersion: 1;
  appVersion: string;
  dataVersion: string;
  exportedAt: string;
  buildName: string;
  build: BuildState;
}

export interface SharePayloadV1 {
  schemaVersion: 1;
  dataVersion: string;
  buildName: string;
  build: BuildState;
}

export interface SaveSlotV1 {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  build: BuildState;
}

/**
 * Build type configuration for stat optimization
 */
export interface BuildType {
  name: string;
  description: string;
  statPriorities: Record<StatKey, number>; // 0-10 priority score
  statThresholds: Partial<Record<StatKey, { min?: number; ideal?: number; max?: number }>>;
  weaponTypes?: string[];
  classCompatibility?: Record<string, number>; // Class compatibility score 0-10
}

/**
 * Optimization result interface
 */
export interface OptimizationResult {
  candidates: OptimizationCandidate[];
  pointBudget: number;
  evaluatedClassPairs: number;
  durationMs: number;
}

export type OptimizationMetric = StatKey
  | 'maxHP' | 'fp' | 'physicalDefense' | 'magicalDefense' | 'evade'
  | 'criticalEvade' | 'statusInfliction' | 'statusResistance'
  | 'initiative' | 'youkaiCap' | 'flanking' | 'skillPool'
  | 'battleWeight' | 'encumbrance' | 'weaponPower' | 'weaponHit'
  | 'weaponCritical' | 'weaponCriticalDamage';

export interface OptimizationConstraint {
  metric: OptimizationMetric;
  minimum: number;
}

export interface OptimizationPreset {
  id: string;
  name: string;
  description: string;
  metricWeights: Partial<Record<OptimizationMetric, number>>;
  classCompatibility?: Record<string, number>;
}

export interface OptimizationReferenceProfile {
  id: string;
  name: string;
  enabled: boolean;
  unavailableReason?: string;
  race: string;
  subrace: string;
  primaryClass: string;
  secondaryClass: string;
  karakuriYoukai?: string;
  archetype: string;
  weapon: {
    name: string;
    effectiveType: string;
    scaling: Partial<Omit<StatRecord, 'apt'>>;
  };
  scaledStatTargets: Partial<StatRecord>;
  priorityStats: StatKey[];
  notes: string;
}

export type BuildGuideCheckStatus = 'pass' | 'fail' | 'verify';
export type BuildGuideCheckBasis = 'document' | 'assumption' | 'calculator-data';

export interface BuildGuideCheck {
  id: string;
  label: string;
  status: BuildGuideCheckStatus;
  summary: string;
  basis: BuildGuideCheckBasis;
}

export interface BuildGuideValidation {
  checks: BuildGuideCheck[];
  passed: number;
  failed: number;
  requiresVerification: number;
  /** Normalized numeric shortfall used only to rank otherwise comparable candidates. */
  supportedDeficit: number;
}

export interface BuildEvaluation {
  rawStats: StatRecord;
  scaledStats: StatRecord;
  maxInvestedStats: StatRecord;
  pointsSpent: number;
  pointBudget: number;
  derived: {
    maxHP: number;
    currentHP: number;
    fp: number;
    physicalDefense: number;
    magicalDefense: number;
    evade: number;
    criticalEvade: number;
    statusInfliction: number;
    statusResistance: number;
    initiative: number;
    youkaiCap: number;
    flanking: number;
    skillPool: number;
    battleWeight: number;
    encumbrance: number;
  };
  elementalAttack: ElementalRecord;
  elementalResistance: ElementalRecord;
  primaryWeapon?: {
    power: number;
    hit: number;
    critical: number;
    criticalDamage: number;
    weight: number;
  };
}

export interface OptimizationBuildPatch {
  mainClass: string;
  subClass: string;
  selectedMainBaseClass: string;
  selectedSubBaseClass: string;
  mainClassPassive: number;
  subClassPassive: number;
  addedStats: StatRecord;
}

export interface OptimizationCandidate {
  id: string;
  patch: OptimizationBuildPatch;
  evaluation: BuildEvaluation;
  score: number;
  constraintDeficits: Partial<Record<OptimizationMetric, number>>;
  feasible: boolean;
  guideValidation: BuildGuideValidation;
  reasoning: string[];
  warnings: string[];
}

export interface OptimizationRequest {
  build: BuildState;
  preset: OptimizationPreset;
  constraints: OptimizationConstraint[];
  /** When set, every candidate must keep this class in the primary/main slot. */
  primaryClass?: string;
  /** Optional curated soft prior for class pairing and final scaled-stat shape. */
  referenceProfileId?: string;
  searchClasses: boolean;
  assumedMainPassiveRank: number;
  assumedSubPassiveRank: number;
  resultLimit?: number;
}

/**
 * Race configuration interface
 */
export interface RaceConfig {
  human?: boolean;
  homunculi?: boolean;
}

/**
 * Subrace configuration interface
 */
export interface SubraceConfig extends Stats {
  allowedRaces?: string[];
}

/**
 * Class configuration interface
 */
export interface ClassConfig extends Omit<Stats, 'human' | 'homunculi'> {
  validWeapons?: string[];
}

/**
 * Class hierarchy configuration
 */
export interface ClassHierarchy {
  name: string;
  baseClass: boolean;
  subClasses: string[];
}

/**
 * Legend extend configuration
 */
export interface LegendExtendConfig {
  stat: StatKey;
  name: string;
  color: string;
}

/**
 * Stat information for UI display
 */
export interface StatInfo {
  title: string;
  description: string;
  effects: string[];
  notes?: string;
}



/**
 * Weapon scaling type configuration
 */
export interface WeaponScaling {
  type:
  | "Basic" 
  | "Finesse" 
  | "Cunning" 
  | "Vampiric" 
  | "Cold" 
  | "Earthen" 
  | "Darkness" 
  | "Spiritual" 
  | "Aquatic" 
  | "Electrical" 
  | "Sylphid" 
  | "Replica" 
  | "Dextria-Lightning" 
  | "Dextria-Sound" 
  | "Dextria-Fire" 
  | "Dextria-Water" 
  | "Dextria-Wind"
  | "Dextria-Light" 
  | "Dextria-Earth" 
  | "Dextria-Ice" 
  | "Dextria-Dark"
  | "Magical" 
  | "Tool" 
  | "Faithful" 
  | "Flamelit" 
  | "Precision" 
  | "Firearms" 
  | "Darkness, Faithful" 
  | "Cold, Tool" 
  | "Electrical, Tool";
  
  str?: number;
  wil?: number;
  ski?: number;
  cel?: number;
  def?: number;
  res?: number;
  vit?: number;
  fai?: number;
  luc?: number;
  gui?: number;
  san?: number;
}

/**
 * Weapon special effect or skill
 */
export interface WeaponSpecial {
  name: string;
  type: 'OnHit' | 'OnCrit' | 'Passive' | 'PotentialSkill' | 'GrantsSkill' | 'SpecialStrike' | 'AfterAttack' | 'OnBattleStart' | 'OnNewRound' | 'OnAttack' | 'OnEvadeAttack' | 'SetBonus';
  description: string;
  cooldown?: number;
  fpCost?: number;
  momentumCost?: number;
  triggerRate?: string;
  effect?: string;
}

/**
 * Complete weapon data structure
 */
export interface Weapon {
  /** Stable data reference; display names may change without breaking future files. */
  id: string;
  name: string;
  rarity: number;
  weaponType: WeaponType;
  subtype?: string;
  range: number;
  power: number;
  accuracy: number;
  critical: number;
  criticalDamage: number;
  weight: number;
  damageType: DamageType;
  scaling: WeaponScaling[];
  rounds?: number;
  material?: string;
  enchantment?: string;
  specials?: WeaponSpecial[];
  description: string;
  location: string[];
}

/**
 * Armor interface for equipment system
 */
export interface Armor {
  /** Stable data reference; display names may change without breaking future files. */
  id: string;
  name: string;
  armor: number;
  magicArmor: number;
  evade: number;
  weight: number;
  type: 'Heavy' | 'Light' | 'Unarmored';
  details?: string;
  statBonuses?: {
    str?: number;
    wil?: number;
    ski?: number;
    cel?: number;
    def?: number;
    res?: number;
    vit?: number;
    fai?: number;
    luc?: number;
    gui?: number;
    san?: number;
    apt?: number;
    hp?: number;
    fp?: number;
    [key: string]: number | undefined;
  };
  resistances?: {
    [element: string]: number;
  };
  specialEffects?: string[];
  conditionalBonuses?: {
    [key: string]: {
      str?: number;
      wil?: number;
      ski?: number;
      cel?: number;
      def?: number;
      res?: number;
      vit?: number;
      fai?: number;
      luc?: number;
      gui?: number;
      san?: number;
      apt?: number;
      hp?: number;
      fp?: number;
      evade?: number;
      critical?: number;
      special?: string;
      condition: string;
    };
  };
  rarity: number;
}
