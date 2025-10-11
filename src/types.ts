/**
 * Type definitions for the SL2 Calculator
 * Contains all TypeScript interfaces, types, and type aliases used throughout the application
 */

// Basic stat and element type definitions
export type StatKey = 'str' | 'wil' | 'ski' | 'cel' | 'def' | 'res' | 'vit' | 'fai' | 'luc' | 'gui' | 'san' | 'apt';
export type StampKey = 'str' | 'wil' | 'ski' | 'cel' | 'vit' | 'fai';
export type ElementKey = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Dark' | 'Water' | 'Light' | 'Lightning' | 'Acid' | 'Sound';
export type DamageType = 'Slash' | 'Pierce' | 'Blunt' | 'Fire' | 'Ice' | 'Lightning' | 'Wind' | 'Earth' | 'Water' | 'Dark' | 'Light' | 'Acid' | 'Sound' | 'Magical';
export type WeaponType = 'Sword' | 'Axe' | 'Bow' | 'Dagger' | 'Fist' | 'Gun' | 'Katana' | 'Polearm' | 'Staff' | 'Tome' | 'Spear' | 'Shield' | 'Tool';

// Record types for easier typing
export type StatRecord = Record<StatKey, number>;
export type StampRecord = Record<StampKey, number>;
export type ElementalRecord = Record<ElementKey, number>;

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
  stats: StatRecord;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  score: number;
  allocatedStats: StatRecord;
  totalPoints: number;
  reasoning: string[];
  warnings: string[];
  analysis: Record<string, string>;
}

/**
 * Optimization parameters interface
 */
export interface OptimizationParams {
  customWeights?: any;
  mainClass: string;
  subClass: string;
  race: string;
  subrace: string;
  buildType: string;
  targetLevel: number;
  targetStats?: Partial<StatRecord>;
  optimizationMode?: 'weights' | 'targets';
  baseEvade?: number;
  bonusEvade?: number;
  customHP?: number;
  customFP?: number;
  prioritizeWeaponScaling?: boolean;
  allowedRaces?: string[];
  allowedSubraces?: string[];
  allowedMainClasses?: string[];
  allowedSubClasses?: string[];
  prioritizeDefense?: boolean;
  prioritizeHealth?: boolean;
  prioritizeEvade?: boolean;
  minStatRequirements?: Partial<StatRecord>;
  maxStatLimits?: Partial<StatRecord>;
  includeLegendExtend?: boolean;
  includeStamps?: boolean;
  includeFood?: boolean;
  weaponType?: string;
  legendExtend?: Record<string, boolean>;
  astrology?: string;
  history?: string;
  includeCustomStats?: boolean;
  customStats?: Partial<StatRecord>;
  customBaseStats?: Partial<StatRecord>;
  mainClassPassive?: number;
  subClassPassive?: number;
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