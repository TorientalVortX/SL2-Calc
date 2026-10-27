export type StatKey = 'str' | 'wil' | 'ski' | 'cel' | 'def' | 'res' | 'vit' | 'fai' | 'luc' | 'gui' | 'san' | 'apt';
export type StampKey = 'str' | 'wil' | 'ski' | 'cel' | 'vit' | 'fai';
export type ElementKey = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Dark' | 'Water' | 'Light' | 'Lightning' | 'Acid' | 'Sound';
export type DamageType = 'Slash' | 'Pierce' | 'Blunt' | 'Fire' | 'Ice' | 'Lightning' | 'Wind' | 'Earth' | 'Water' | 'Dark' | 'Light' | 'Acid' | 'Sound' | 'Magical' | 'Darkness' | 'Hellfire';
export type GameWorld = 'G6' | 'Korvara';

export type WeaponType = 'Sword' | 'Axe' | 'Bow' | 'Dagger' | 'Fist' | 'Gun' | 'Katana' | 'Polearm' | 'Staff' | 'Tome' | 'Spear' | 'Shield' | 'Tool';

export type StatRecord = Record<StatKey, number>;
export type StampRecord = Record<StampKey, number>;
export type ElementalRecord = Record<ElementKey, number>;

/** Resisted like elements (Half-Plate: '+5% Pierce and Slash Resistance') but with no matching ATK. */
export type PhysicalKey = 'Blunt' | 'Pierce' | 'Slash';
export const PHYSICAL_KEYS: PhysicalKey[] = ['Blunt', 'Pierce', 'Slash'];
export type PhysicalRecord = Record<PhysicalKey, number>;

export type ResistKey = ElementKey | PhysicalKey;

export interface GameDataManifest {
  schemaVersion: 1;
  dataVersion: string;
  updatedAt: string;
  changes: string[];
}

export interface AppRelease {
  schemaVersion: 1;
  version: string;
  releasedAt: string;
  headline: string;
  notes: string[];
}

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

/** `Formation` is a Tactician-only category that exists on exactly one skill. */
export type SkillCategory =
  | 'Offensive'
  | 'Defensive'
  | 'Support'
  | 'Utility'
  | 'Passive'
  | 'Innate'
  | 'Formation';

/** An `element` term with a null `element` is real but unattributable damage (Darkness,
 *  equipment-dependent Elemental) and must never be scored as a known element. */
export interface SkillScalingTerm {
  source: 'weapon' | 'element' | 'stat' | 'flat' | 'heal';
  label: string;
  percentByRank: number[];
  element?: ElementKey | null;
  alternateElement?: ElementKey | null;
  stat?: StatKey;
  unmodelled?: string;
}

/** Most SL2 skill bonuses are situational; only `always` effects count without the user opting in. */
export interface SkillEffect {
  unmodelled?: string;
  round?: 'floor';
  target?: 'enemy' | 'summon';
  statMode?: 'buff' | 'class';
  condition?: string;
  input?: string;
  rankSource?: string;
  scaledStat?: { stat: StatKey; percent: number };
  elementInput?: string;
  weapons?: string[];
  kind: 'stat' | 'derived' | 'element' | 'elementResistance';
  /** A `StatKey` for `stat`, an `ElementKey` for `element`, otherwise a derived channel such as `hit`. */
  key: string;
  valueByRank: number[];
  applies: 'always' | 'conditional';
}

export interface Skill {
  id: string;
  name: string;
  classes: string[];
  category: SkillCategory;
  maxRank: number;
  /** Index 0 is rank 1; null when the skill costs no FP. */
  fpByRank: number[] | null;
  momentum: number | null;
  scaling: SkillScalingTerm[] | null;
  effects: SkillEffect[];
  requires?: Array<{ id: string; rank: number }>;
  /** `BuildData` models this skill as its own field, so its effects are skipped to avoid double counting. */
  handModelled?: boolean;
  /** Restores HP; on the curated list in wiki-data/healing-skills.json. */
  healing?: boolean;
  /** The skill's damage is a basic attack ("performs a basic attack on the target"), with these changes. */
  basicAttack?: BasicAttackProfile;
  inputs?: Array<{ key: string; label: string; min: number; max: number; default: number; maxByRank?: number[]; maxRankSource?: string; choices?: Array<{ value: number; label: string }> }>;
  battleNote?: string;
  battleRules?: Array<{ description: string; url: string }>;
}

export interface BasicAttackProfile {
  hitByRank?: number[];
  criticalByRank?: number[];
  /** Added to the attack after damage modifiers and before the crit. */
  bonusDamageByRank?: number[];
  /** Bonus damage equal to this share of the user's missing HP (Ether Invitation). */
  missingHpPercent?: number;
  /** The attack deals this share of its normal damage (Quick and Wild). */
  damagePercent?: number;
  damageClass?: 'magical';
  type?: ElementKey | PhysicalKey;
  /** Separate on-hit bonus damage with its own class and type (Snake Shot's Acid). */
  rider?: { bonusByRank: number[] | null; damageClass: 'physical' | 'magical'; type: ElementKey | PhysicalKey; ignores: 'none' | 'armor' | 'protection' };
}

export interface SkillText {
  id: string;
  range: string | null;
  target: string | null;
  cooldown: string | null;
  restriction: string | null;
  flags: string[];
  powerRaw: string | null;
  extras: Array<[string, string]>;
  description: string;
  url: string;
  /** Set when the entry was transcribed from wiki source rather than scraped. */
  transcribed?: boolean;
}

/** An absent id means rank 0. */
export type SkillRanks = Record<string, number>;

export interface SpellthiefState {
  cards: string[];
  /** Oldest prepared first. */
  equipped: string[];
}

/** Keyed by `skillId:index` into that skill's `effects` array. */
export type SkillConditionals = Record<string, boolean>;

/** No rank or effect fields: the wiki describes racial skills only in prose. */
export interface RacialSkill {
  id: string;
  name: string;
  /** The race as the wiki writes it, e.g. "Any Human" or "Felidae, Grimalkin". */
  grantedTo: string;
  /** Calculator subraces this applies to, with wiki race groups expanded. */
  subraces: string[];
  passive: boolean;
  fp: string | null;
  momentum: string | null;
  range: string | null;
  target: string | null;
  description: string;
}

/** Sync-Mind grants `evoke-active` at rank 1 and `evoke-passive` at rank 2;
 *  `main` reaches the Summoner only through Install. */
export type YoukaiSlot = 'evoke-active' | 'evoke-passive' | 'main';

export interface YoukaiSkill {
  slot: YoukaiSlot;
  name: string;
  passive: boolean;
  /** FP at Youkai level 60. Null for passives. A Youkai casting it pays half. */
  fp: number | null;
  momentum: number | null;
  range: string | null;
  area: string | null;
  target: string | null;
  /** Mercalan, Aquarian and so on, where the wiki lists one. */
  domain: string | null;
  description: string;
}

export interface Youkai {
  id: string;
  name: string;
  /** The contract this ascended form replaces, or null for an ordinary form. */
  baseFormId: string | null;
  /** Avian, Beast, Dragon, Fairy, Mystic, Night or Plant, what Affinity keys off. */
  race: string;
  /** Stats at level 60, the level the calculator models. */
  stats: Partial<StatRecord>;
  statsLv1: Partial<StatRecord>;
  skills: YoukaiSkill[];
}

export interface YoukaiState {
  contracted: string[];
  /** Only one Youkai can be installed at a time. */
  installed: string | null;
}

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

export interface HistoryBonus {
  stats: Partial<StatRecord>;
  hp?: number;
  fp?: number;
  hpPercent?: number;
  fpPercent?: number;
  evade?: number;
  description: string;
}

export interface BuildData {
  buildName: string;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  selectedMainBaseClass?: string;
  selectedSubBaseClass?: string;
  totalPoints: number;
  characterLevel: number;
  food: string;
  history: string;
  addedStats: StatRecord;
  customStats: StatRecord;
  customBaseStats: StatRecord;
  /** G6 raises every upgrade ceiling by one. Absent on older builds, which resolve to `DEFAULT_WORLD`. */
  world?: GameWorld;
  /** Temporary buffs applied after diminishing returns; `customStats` goes through the softcap. */
  statBuffs?: StatRecord;
  stamps: StampRecord;
  legendExtend: Record<string, boolean>;
  astrology: string;
  customHP: number;
  whiteSpiritCount?: number;
  crystalCount?: number;
  customFP: number;
  baseEvade: number;
  bonusEvade: number;
  giantGene: boolean;
  /** @deprecated Counted from equipped Dragon King pieces (`domain/itemSets.ts`); parsed but ignored. */
  dragonKing: number;
  /** @deprecated As `dragonKing`, for the Dragon Queen set. */
  dragonQueen: number;
  hpPercent: number;
  sanguineCrest: boolean;
  felidaeInstinct: boolean;
  lupineInstinct: boolean;
  redtailFortuneLevel: number;
  redtailDiceColor: 'red' | 'green' | 'yellow';
  karakuriYoukai: string;
  warwalk: boolean;
  luminaryElement: boolean;
  persistenceOfNormalcy: boolean;
  powerOfNormalcy: boolean;
  /** Both class slots must share a base-class family; the build gets 50 skill points instead of 35. */
  destiny: boolean;
  /** Classes reached by both slots share their ranks. */
  skillRanks: Record<'main' | 'sub', SkillRanks>;
  mixturePlan?: string[];
  activeMixtureEffects?: string[];
  /** Copy spells are separate from learned ranks and never spend class points. */
  spellthief?: SpellthiefState;
  skillConditionals: SkillConditionals;
  skillInputs?: Record<string, number>;
  youkai: YoukaiState;
  traits: string[];
  /** Keyed by `talent/subtalent`; a talent's rank is the sum of its subtalent ranks. */
  talents?: Record<string, number>;
  talentConditionals?: Record<string, boolean>;
  /** Taken traits whose battle-state bonus is switched on, by trait id. */
  traitConditionals?: Record<string, boolean>;
  elementalATKAdjustments: ElementalRecord;
  elementalRESAdjustments: ElementalRecord;
  version: string;
}

export interface WeaponUpgradePoints {
  power: number;
  critical: number;
  accuracy: number;
  durability: number;
}

export const BASE_DURABILITY = 30;

export const NO_UPGRADE_POINTS: WeaponUpgradePoints = {
  power: 0, critical: 0, accuracy: 0, durability: 0,
};

export function upgradePointsSpent(points: WeaponUpgradePoints): number {
  return points.power + points.critical + points.accuracy + points.durability;
}

export function resolveUpgradePoints(config: {
  upgradePoints?: WeaponUpgradePoints;
  upgradeLevel?: number;
}): WeaponUpgradePoints {
  if (config.upgradePoints) return config.upgradePoints;
  const level = config.upgradeLevel ?? 0;
  return { power: level, critical: level, accuracy: level, durability: 0 };
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
  /** @deprecated Superseded by `upgradePoints`; migrated on read, never written. */
  upgradeLevel: number;
  /** Uncapped: the game imposes no spend budget. */
  upgradePoints: WeaponUpgradePoints;
  /** @deprecated No upgrade budget exists; ignored on read, never written. */
  upgradeBudget?: number;
  rarity: number;
  powerQuality: boolean;
  critQuality: boolean;
  hitQuality: boolean;
  weightPlus: boolean;
  weightMinus: boolean;
  sentimentality: boolean;
  twoHandedSkillRank: number;
  /** Percent of each scaled stat folded into weapon attack. */
  customScaling: StatRecord;
}

export interface WeaponConfig extends WeaponSlotConfig {
  comparisonMode?: boolean;
  /** Comparison "Slot B", not an off-hand; a real second weapon is `BuildEquipmentState.offHandWeapon`. */
  secondaryWeapon?: WeaponSlotConfig;
}

/** Each point is +1 of its stat; unlike weapon and armour, these slots have no durability track. */
export interface HandsUpgradePoints {
  /** Applies to the main weapon, not to the hands piece. */
  hit: number;
  fp: number;
}

export interface LegsUpgradePoints {
  hp: number;
  evade: number;
}

/** Fortune lowers the chance of dropping items or murai on defeat; Greed raises murai drops.
 *  Both stack across the two accessory slots and are non-combat. */
export interface AccessoryUpgradePoints {
  fortune: number;
  greed: number;
}

export const NO_HANDS_UPGRADE_POINTS: HandsUpgradePoints = { hit: 0, fp: 0 };
export const NO_LEGS_UPGRADE_POINTS: LegsUpgradePoints = { hp: 0, evade: 0 };
export const NO_ACCESSORY_UPGRADE_POINTS: AccessoryUpgradePoints = { fortune: 0, greed: 0 };

/** The crystal a Tetra item is aligned to; absent means Fire, the wiki's default. */
export type TetraAlignment = 'Fire' | 'Ice' | 'Earth' | 'Wind';
export const TETRA_ALIGNMENTS: TetraAlignment[] = ['Fire', 'Ice', 'Earth', 'Wind'];

/** `material` resolves through the material's `Other` profile, not its armour one. */
export interface GearSlotState<Points> {
  itemName: string | null;
  material?: string;
  enchantment?: string;
  tetra?: TetraAlignment;
  upgradePoints: Points;
}

export type HandsSlotState = GearSlotState<HandsUpgradePoints>;
export type LegsSlotState = GearSlotState<LegsUpgradePoints>;
export type AccessorySlotState = GearSlotState<AccessoryUpgradePoints>;

/** Also the slot's UL for item effect text. */
export function gearPointsSpent<Points extends object>(points: Points): number {
  return Object.values(points).reduce<number>((total, value) => total + (Number(value) || 0), 0);
}

/** `lightweight` and `heavy` are mutually exclusive and cancel, as on weapons. */
export interface ArmorQuality {
  /** Solid: +2 Armor. */
  solid: boolean;
  /** Polished: +2 Magic Armor. */
  polished: boolean;
  /** Good Fit: +4 Evade. */
  goodFit: boolean;
  /** Lightweight: -2 Weight. */
  lightweight: boolean;
  /** Heavy: +2 Weight. */
  heavy: boolean;
}

export const NO_ARMOR_QUALITY: ArmorQuality = {
  solid: false, polished: false, goodFit: false, lightweight: false, heavy: false,
};

/** A torso has no durability, so no durability track. */
export interface ArmorUpgradePoints {
  armor: number;
  magicArmor: number;
  evade: number;
}

export const NO_ARMOR_UPGRADE_POINTS: ArmorUpgradePoints = {
  armor: 0, magicArmor: 0, evade: 0,
};

export function armorPointsSpent(points: ArmorUpgradePoints): number {
  return points.armor + points.magicArmor + points.evade;
}

export function resolveArmorUpgradePoints(
  equipment: { armorUpgradePoints?: ArmorUpgradePoints } | undefined,
): ArmorUpgradePoints {
  return equipment?.armorUpgradePoints ?? NO_ARMOR_UPGRADE_POINTS;
}

export interface BuildEquipmentState {
  armorName: string | null;
  armorConditionalBonuses: Record<string, boolean>;
  /** Opt-in per-item effects, keyed by `itemName:index`. */
  itemConditionalBonuses?: Record<string, boolean>;
  /** Rolled value of each ranged effect ("+2-4 CEL" is per-item RNG), keyed by `itemRollKey`.
   *  Absent means the bottom of the range. */
  itemRolls?: Record<string, number>;
  primaryWeapon?: WeaponConfig;
  armorUpgradePoints?: ArmorUpgradePoints;
  armorQuality?: ArmorQuality;
  armorMaterial?: string;
  armorEnchantment?: string;
  /** @deprecated No budget exists; parsed from older files and ignored. */
  armorUpgradeBudget?: number;

  /** Slot 3 holds a hands piece or an off-hand weapon, never both; see `equippedSlot3`. */
  hands?: HandsSlotState;
  offHandWeapon?: WeaponSlotConfig;
  /** Slot 4. */
  legs?: LegsSlotState;
  /** Slots 5 and 6. The same accessory may not be equipped in both. */
  accessory1?: AccessorySlotState;
  accessory2?: AccessorySlotState;
}

export interface GearLoadout {
  hands?: HandsSlotState;
  offHandWeapon?: WeaponSlotConfig;
  legs?: LegsSlotState;
  accessory1?: AccessorySlotState;
  accessory2?: AccessorySlotState;
  itemRolls?: Record<string, number>;
}

export const EMPTY_GEAR_LOADOUT: GearLoadout = {};

export type Slot3Mode = 'hands' | 'offHandWeapon' | 'empty';

/** An off-hand weapon wins if both are set: equipping it displaces the hands piece. */
export function equippedSlot3(equipment: BuildEquipmentState | undefined): Slot3Mode {
  if (equipment?.offHandWeapon) return 'offHandWeapon';
  if (equipment?.hands?.itemName) return 'hands';
  return 'empty';
}

/** The game forbids the same accessory (by name) in both slots. */
export function hasDuplicateAccessory(equipment: BuildEquipmentState | undefined): boolean {
  const first = equipment?.accessory1?.itemName;
  const second = equipment?.accessory2?.itemName;
  return Boolean(first && second && first === second);
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

export interface DerivedSource {
  label: string;
  value: number;
  /** `base` is uncapped; `bonus` competes for the +50 ceiling. */
  channel: 'base' | 'bonus';
  stat?: StatKey;
}

export interface DerivedSources {
  fp: DerivedSource[];
  hit: DerivedSource[];
  evade: DerivedSource[];
}

export interface BuildEvaluation {
  statSources?: Record<StatKey, Array<{ label: string; value: number }>>;
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
    /** Evade the +50 bonus cap does not govern: item statlines, upgrades, Dodger. */
    evadeBase: number;
    /** Evade the cap does govern, after the ceiling: buffs and item effects. */
    evadeBonus: number;
    /** Bonus Evade bought but discarded by the +50 cap. */
    evadeBonusWasted: number;
    criticalEvade: number;
    statusInfliction: number;
    statusResistance: number;
    mutagenPotency: number;
    complexMutationChance: number;
    initiative: number;
    youkaiCap: number;
    flanking: number;
    /** Attacker Hit by positional tier; `base` is the weapon's own Hit figure. */
    hitTiers: { base: number; front: number; flank1: number; flank2: number };
    /** The uncapped Hit channel: weapon Accuracy, 2x scaled SKI, and Hand Hit. */
    hitBase: number;
    /** Bonus Hit sources before the +50 cap, so more can be added to them. */
    hitBonusSources: number;
    /** Bonus Hit after the cap. */
    hitBonusApplied: number;
    /** Bonus Hit bought but discarded by the cap. */
    hitBonusWasted: number;
    /** Bonus Hit the cap leaves for Honor on a frontal attack. */
    honorHeadroom: number;
    /** Chivalry's Smite at its actual rank, before the cap. */
    frontalHitBonus: number;
    skillPool: number;
    battleWeight: number;
    armor: number;
    magicArmor: number;
    /** Torso and gear Evade across both channels: a diagnostic, not a model input. */
    armorEvade: number;
    /** The torso share of the uncapped channel, safe to feed back into the model. */
    armorEvadeBase: number;
    armorWeight: number;
    equipmentLoad: number;
    battleWeightRemaining: number;
    encumbrance: number;
    /** Percentage points on the chance to apply and avoid luck-based statuses (Redtail green dice). */
    luckStatusPercent: number;
  };
  elementalAttack: ElementalRecord;
  elementalResistance: ElementalRecord;
  physicalResistance: PhysicalRecord;
  sources: DerivedSources;
  primaryWeapon?: {
    power: number;
    /** Scaled Weapon Attack (Power + stat scaling), what skill and spell coefficients are stated against. */
    swa: number;
    hit: number;
    critical: number;
    criticalDamage: number;
    weight: number;
  };
}

export interface RaceConfig {
  human?: boolean;
  homunculi?: boolean;
}

export interface SubraceConfig extends Stats {
  allowedRaces?: string[];
}

export interface ClassConfig extends Omit<Stats, 'human' | 'homunculi'> {
  validWeapons?: string[];
}

export interface ClassHierarchy {
  name: string;
  baseClass: boolean;
  subClasses: string[];
}

export interface LegendExtendConfig {
  stat: StatKey;
  name: string;
  color: string;
}

export interface StatInfo {
  title: string;
  description: string;
  effects: string[];
  notes?: string;
}

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
  apt?: number;
}

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

/** Also the keys of `gear.json`. */
export type GearGroup = 'Hands' | 'Shield' | 'Legs' | 'Accessory';

/** Not an `Armor`: the wiki gives these slots no Armor, Magic Armor, Evade or Weight columns. */
export interface GearItem {
  /** Stable data reference; display names may change without breaking future files. */
  id: string;
  name: string;
  /** 3 for hands and shields, 4 for legs, 5 for either accessory slot. */
  slot: number;
  rarity: number;
  /** Crafting material class. Decides which materials the piece accepts. */
  material?: string;
  /** Every effect line joined, which is what the effect parser reads. */
  details: string;
  /** The same effects, one line per wiki bullet, for display. */
  specialEffects: string[];
  flavour?: string;
}

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
