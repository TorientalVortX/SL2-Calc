export type StatKey = 'str' | 'wil' | 'ski' | 'cel' | 'def' | 'res' | 'vit' | 'fai' | 'luc' | 'gui' | 'san' | 'apt';
export type StampKey = 'str' | 'wil' | 'ski' | 'cel' | 'vit' | 'fai';
export type ElementKey = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Dark' | 'Water' | 'Light' | 'Lightning' | 'Acid' | 'Sound';
export type DamageType = 'Slash' | 'Pierce' | 'Blunt' | 'Fire' | 'Ice' | 'Lightning' | 'Wind' | 'Earth' | 'Water' | 'Dark' | 'Light' | 'Acid' | 'Sound' | 'Magical' | 'Darkness' | 'Hellfire';
/**
 * Which of the game's two worlds a build lives in.
 *
 * Not an item property: G6 and Korvara are separate worlds with separate content
 * and, in places, separate rules. Lives here rather than beside the upgrade caps
 * that read it, because `types` is the base module every other one imports.
 */
export type GameWorld = 'G6' | 'Korvara';

export type WeaponType = 'Sword' | 'Axe' | 'Bow' | 'Dagger' | 'Fist' | 'Gun' | 'Katana' | 'Polearm' | 'Staff' | 'Tome' | 'Spear' | 'Shield' | 'Tool';

export type StatRecord = Record<StatKey, number>;
export type StampRecord = Record<StampKey, number>;
export type ElementalRecord = Record<ElementKey, number>;

/**
 * Damage types that are resisted but are not elements.
 *
 * The game writes them exactly like elemental resistance (Half-Plate is '+5%
 * Pierce and Slash Resistance'), so items, materials and enchantments all state
 * them the same way. They are kept apart from `ElementKey` because nothing has
 * a Pierce ATK to pair with them.
 */
export type PhysicalKey = 'Blunt' | 'Pierce' | 'Slash';
export const PHYSICAL_KEYS: PhysicalKey[] = ['Blunt', 'Pierce', 'Slash'];
export type PhysicalRecord = Record<PhysicalKey, number>;

/** Anything that can carry a resistance percentage. */
export type ResistKey = ElementKey | PhysicalKey;

export interface GameDataManifest {
  schemaVersion: 1;
  dataVersion: string;
  updatedAt: string;
  changes: string[];
}

/**
 * The application's own release, which moves independently of the game data.
 *
 * Two versions are on screen together because they answer different questions:
 * `dataVersion` says how current the wiki-derived numbers are, and this says what
 * the app itself can do. A build can be stale against either one.
 */
export interface AppRelease {
  schemaVersion: 1;
  version: string;
  releasedAt: string;
  /** One line for the version badge, above the itemised notes. */
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

/* ------------------------------------------------------------------- skills */

/**
 * Skill categories as the wiki groups them. `Formation` is a Tactician-only
 * grouping that exists on exactly one skill.
 */
export type SkillCategory =
  | 'Offensive'
  | 'Defensive'
  | 'Support'
  | 'Utility'
  | 'Passive'
  | 'Innate'
  | 'Formation';

/**
 * One additive term of a skill's damage formula, resolved per rank.
 *
 * `percentByRank` is indexed from 0 for rank 1. A term whose `source` is
 * `element` with a null `element` is real damage the calculator cannot
 * attribute, either a damage type it has no key for (Darkness) or one that
 * depends on equipment (Elemental), and must never be scored as a known element.
 */
export interface SkillScalingTerm {
  source: 'weapon' | 'element' | 'stat' | 'flat' | 'heal';
  label: string;
  percentByRank: number[];
  element?: ElementKey | null;
  alternateElement?: ElementKey | null;
  stat?: StatKey;
  /** Set when the wiki names a damage source the calculator does not model. */
  unmodelled?: string;
}

/**
 * A bonus a skill grants, resolved per rank.
 *
 * `applies` is the important field. Most SL2 skill bonuses are situational
 * (gated on a weapon, a position, or a buff window), and are marked
 * `conditional` so they only count when the user opts in. Only `always` effects
 * are added to a build automatically.
 */
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
  /**
   * A `StatKey` for `stat`, an `ElementKey` for `element`, otherwise a derived
   * channel such as `hit`.
   */
  key: string;
  valueByRank: number[];
  applies: 'always' | 'conditional';
}

/** A skill's mechanical data. Display text lives in `SkillText`, loaded separately. */
export interface Skill {
  id: string;
  name: string;
  classes: string[];
  category: SkillCategory;
  maxRank: number;
  /** FP cost indexed from 0 for rank 1, or null when the skill costs no FP. */
  fpByRank: number[] | null;
  momentum: number | null;
  scaling: SkillScalingTerm[] | null;
  effects: SkillEffect[];
  /**
   * Skills that must already be ranked before this one can be taken.
   *
   * Install requires Sync-Mind rank 1, which requires The Contract rank 1, so a
   * Summoner does not choose Sync-Mind so much as pay for it on the way to
   * anything worth having. Absent when the skill has no prerequisite.
   */
  requires?: Array<{ id: string; rank: number }>;
  /**
   * True when `BuildData` already models this skill as its own field (Pain
   * Tolerance, Rising Game, …). Its effects are skipped here to avoid counting
   * the same bonus twice.
   */
  handModelled?: boolean;
  inputs?: Array<{ key: string; label: string; min: number; max: number; default: number; maxByRank?: number[]; maxRankSource?: string; choices?: Array<{ value: number; label: string }> }>;
  battleNote?: string;
  battleRules?: Array<{ description: string; url: string }>;
}

/** Prose and reference fields for a skill, fetched on demand by the Skills dialog. */
export interface SkillText {
  id: string;
  range: string | null;
  target: string | null;
  cooldown: string | null;
  restriction: string | null;
  flags: string[];
  /** The wiki's original Power string, kept so unparsed formulas stay visible. */
  powerRaw: string | null;
  extras: Array<[string, string]>;
  description: string;
  url: string;
  /** Set when the entry was transcribed from wiki source rather than scraped. */
  transcribed?: boolean;
}

/** Ranks taken, keyed by skill id. An absent id means rank 0. */
export type SkillRanks = Record<string, number>;

/** Spell cards owned and copies prepared, oldest prepared first. */
export interface SpellthiefState {
  cards: string[];
  equipped: string[];
}

/**
 * Conditional skill effects the user has switched on, keyed by `skillId:index` into
 * that skill's `effects` array: the same opt-in shape armor conditionals use.
 */
export type SkillConditionals = Record<string, boolean>;

/**
 * A skill granted by a race.
 *
 * There is deliberately no rank or effect field: the wiki gives racial skills
 * neither, describing what they do in prose instead. See `domain/racialSkills.ts`.
 */
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

/* ------------------------------------------------------------------- youkai */

/**
 * Which of a Youkai's three skills this is.
 *
 * The order is a hierarchy, not a list: Sync-Mind grants `evoke-active` at rank 1
 * and `evoke-passive` at rank 2, so a Summoner holds both themselves. `main` is
 * the Youkai's own skill and reaches the Summoner only through Install.
 */
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
  /** Level 1 stats, kept as provenance for the level 60 line. */
  statsLv1: Partial<StatRecord>;
  skills: YoukaiSkill[];
}

/** The Youkai a Summoner has contracted, and which one is currently installed. */
export interface YoukaiState {
  /** Contracted Youkai ids. Bounded in the UI by the build's Youkai cap. */
  contracted: string[];
  /** Id of the installed Youkai, or null. Only one can be installed at a time. */
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

/** The serialised shape of a build: what import and export round-trip. */
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
  /**
   * Which of the game's two worlds this build is played in.
   *
   * G6 and Korvara are separate worlds with separate content and, in places,
   * separate rules. The wiki writes trait effects as "G6: … Korvara: …" and marks
   * items "G6 Only". The calculator reads it for one thing so far: G6 raises every
   * upgrade ceiling by one.
   *
   * Absent on builds saved before the field existed, which resolve to
   * `DEFAULT_WORLD`.
   */
  world?: GameWorld;
  /**
   * Stat gains that land *after* diminishing returns, rather than being
   * allocated points the softcap can eat.
   *
   * `customStats` is a flat bonus on the allocation, so it goes through the
   * softcap with everything else. That is right for a stat an item grants and
   * wrong for a combat buff: the same reason the Felidae and Lupine Instinct
   * bonuses are added to `scaledStats` directly. Anything the game hands you as
   * a temporary status (a Nerhaven buff, a borrowed stat line) belongs here,
   * where 10 points is 10 points no matter how deep past the cap the build sits.
   *
   * Absent on builds saved before the channel existed.
   */
  statBuffs?: StatRecord;
  stamps: StampRecord;
  legendExtend: Record<string, boolean>;
  astrology: string; // Now stores single planet name
  customHP: number;
  whiteSpiritCount?: number;
  crystalCount?: number;
  customFP: number;
  baseEvade: number;
  bonusEvade: number;
  giantGene: boolean;
  /**
   * @deprecated Counted from the equipped Dragon King pieces instead; see
   * `domain/itemSets.ts`. Still parsed so builds saved while it was a manual
   * field keep loading, but the stored number is ignored: it could claim four
   * pieces when only three exist, and never checked that any were worn.
   */
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
  /*
   * Rising Game, Pain Tolerance, Fortitude and Endurance used to live here as
   * their own fields with their own Talents controls. They are class skills, so
   * their rank now comes from `skillRanks` and there is one place to set them.
   * Builds saved with the old fields are migrated on load.
   */
  warwalk: boolean;
  luminaryElement: boolean;
  persistenceOfNormalcy: boolean;
  powerOfNormalcy: boolean;
  /**
   * Destiny: trades every class tree but one for a larger skill budget.
   *
   * Both class slots must then sit in the same base-class family, and the build
   * has 50 skill points rather than 35. See `domain/skills.ts`.
   */
  destiny: boolean;
  /** Skill-rank storage per slot; classes reached by both slots share their ranks. */
  skillRanks: Record<'main' | 'sub', SkillRanks>;
  mixturePlan?: string[];
  activeMixtureEffects?: string[];
  /** Copy spells are separate from learned ranks and never spend class points. */
  spellthief?: SpellthiefState;
  /** Situational skill bonuses the user has confirmed apply to this build. */
  skillConditionals: SkillConditionals;
  skillInputs?: Record<string, number>;
  /** Contracted Youkai and the installed one, for Summoner builds. */
  youkai: YoukaiState;
  /** Trait ids the character has bought, bounded by the trait point budget. */
  traits: string[];
  /**
   * Ranks invested in each subtalent, keyed by `talent/subtalent` id.
   *
   * A talent's rank is the number of subpoints spent inside it, so this record
   * is the whole allocation. There is no separate per-talent number to keep in
   * step with it. Absent on builds saved before talents were modelled, which is
   * every build written before the wiki documented them.
   */
  talents?: Record<string, number>;
  /**
   * Conditional subtalents the user has confirmed apply to this build.
   *
   * The same opt-in as `skillConditionals`, for the same reason: Smite's Hit is
   * real but only when attacking from the front, and a sheet that counts it by
   * default reports a number the character usually does not have.
   */
  talentConditionals?: Record<string, boolean>;
  elementalATKAdjustments: ElementalRecord;
  elementalRESAdjustments: ElementalRecord;
  version: string; // For future compatibility
}

/**
 * Upgrade points replace the old blanket upgrade level: rather than one number
 * lifting power, crit and hit together, the same budget is spent per channel.
 */
export interface WeaponUpgradePoints {
  power: number;
  critical: number;
  accuracy: number;
  durability: number;
}

/** The base durability weapons start from. */
export const BASE_DURABILITY = 30;

export const NO_UPGRADE_POINTS: WeaponUpgradePoints = {
  power: 0, critical: 0, accuracy: 0, durability: 0,
};

/** Total points spent across all four channels. */
export function upgradePointsSpent(points: WeaponUpgradePoints): number {
  return points.power + points.critical + points.accuracy + points.durability;
}

/**
 * Read upgrade points off a config that may predate them.
 *
 * A legacy `upgradeLevel: L` raised power, crit and hit by L each, so it maps to
 * L in each of those channels: the weapon's stats are unchanged by the
 * migration.
 */
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
  /**
   * @deprecated Superseded by `upgradePoints`. Retained so build files written
   * before upgrade points still load; migrated on read, never written.
   */
  upgradeLevel: number;
  /** Points spent per channel. Uncapped: the game imposes no spend budget. */
  upgradePoints: WeaponUpgradePoints;
  /**
   * @deprecated There is no upgrade budget. Kept only so build files written
   * while one existed still parse; ignored on read, never written.
   */
  upgradeBudget?: number;
  rarity: number;
  powerQuality: boolean;
  critQuality: boolean;
  hitQuality: boolean;
  weightPlus: boolean;
  weightMinus: boolean;
  sentimentality: boolean;
  twoHandedSkillRank: number;
  /** Percent of each scaled stat folded into weapon attack. APT included: a
   *  forthcoming weapon scales off it, and excluding it made that unrepresentable. */
  customScaling: StatRecord;
}

export interface WeaponConfig extends WeaponSlotConfig {
  comparisonMode?: boolean;
  /**
   * The "Slot B" weapon of the side-by-side comparison, **not** an off-hand.
   * It is a what-if against the same character and is never equipped alongside
   * the primary. A real second weapon lives in `BuildEquipmentState.offHandWeapon`.
   */
  secondaryWeapon?: WeaponSlotConfig;
}

/* --------------------------------------------- hands, legs and accessories */

/**
 * Upgrade tracks for the slots that are neither weapon nor armour.
 *
 * Each track is worth **+1 of its stat per point**, the same rate as the weapon
 * and armour tracks, and each starts at 0. Unlike weapons and armour these slots
 * have **no durability track**: durability is a weapon and armour concept.
 *
 * See `optimizer-knowledge/03-equipment/slot-upgrade-tracks.md`.
 */
export interface HandsUpgradePoints {
  /** Applies to the main weapon, not to the hands piece. */
  hit: number;
  fp: number;
}

export interface LegsUpgradePoints {
  hp: number;
  evade: number;
}

/**
 * Fortune reduces the chance of dropping items or murai on defeat; Greed
 * increases murai dropped by monsters. Both stack across the two accessory
 * slots. Neither is a combat stat, so they never move a damage or survivability
 * number. They are modelled so the slot round-trips, not because they scale.
 */
export interface AccessoryUpgradePoints {
  fortune: number;
  greed: number;
}

export const NO_HANDS_UPGRADE_POINTS: HandsUpgradePoints = { hit: 0, fp: 0 };
export const NO_LEGS_UPGRADE_POINTS: LegsUpgradePoints = { hp: 0, evade: 0 };
export const NO_ACCESSORY_UPGRADE_POINTS: AccessoryUpgradePoints = { fortune: 0, greed: 0 };

/**
 * One of the four non-weapon, non-armour slots.
 *
 * `material` resolves through the material's `Other` profile rather than its
 * armour one; see `domain/armorMaterials.ts`.
 */
export interface GearSlotState<Points> {
  /** Item name as the equipment data spells it, or null for an empty slot. */
  itemName: string | null;
  material?: string;
  enchantment?: string;
  upgradePoints: Points;
}

export type HandsSlotState = GearSlotState<HandsUpgradePoints>;
export type LegsSlotState = GearSlotState<LegsUpgradePoints>;
export type AccessorySlotState = GearSlotState<AccessoryUpgradePoints>;

/** Total points spent on a slot, which is also its UL for item effect text. */
export function gearPointsSpent<Points extends object>(points: Points): number {
  return Object.values(points).reduce<number>((total, value) => total + (Number(value) || 0), 0);
}

/** Armour's equivalent of `WeaponUpgradePoints`, spent from the same size budget. */
/**
 * Quality tags a torso can carry, mirroring the weapon ones.
 *
 * Independent booleans rather than a single choice, which is the shape the weapon
 * qualities already use. The calculator does not claim to know how many tags one
 * item may carry, and modelling them separately lets a build describe whatever it
 * actually has. `lightweight` and `heavy` are the one genuinely exclusive pair: an
 * item cannot be both, so they cancel exactly as the weapon's do.
 */
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

/**
 * Torso upgrade channels.
 *
 * Three, not four: a torso has no durability at all. Weapons do, which is why
 * `WeaponUpgradePoints` carries one and this does not; the two tracks are not the
 * same shape and were never meant to be.
 */
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

/** Build files written before armour upgrades simply have none. */
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
  /**
   * Chosen value for each effect the wiki states as a range, keyed by
   * `itemRollKey`.
   *
   * A range like "+2-4 CEL" is per-item RNG: the copy the player owns rolled
   * somewhere in it when it dropped. The calculator cannot know which, so the
   * build records it. An absent entry means the bottom of the range.
   */
  itemRolls?: Record<string, number>;
  primaryWeapon?: WeaponConfig;
  /** Points spent on the equipped torso. Absent on builds saved before the feature. */
  armorUpgradePoints?: ArmorUpgradePoints;
  /** Quality tags on the torso. Absent on builds saved before they existed. */
  armorQuality?: ArmorQuality;
  /** Crafting material for the torso. See `domain/armorMaterials.ts`. */
  armorMaterial?: string;
  /** Enchantment on the torso. See `domain/armorEnchantments.ts`. */
  armorEnchantment?: string;
  /** @deprecated No budget exists; parsed from older files and ignored. */
  armorUpgradeBudget?: number;

  /*
   * Slots 3-6. Every one is optional so that builds saved before they existed
   * still parse; an absent slot means empty, which is also its default.
   */

  /**
   * Slot 3, when it holds a hands piece.
   *
   * Slot 3 is exclusive: it takes a hands item **or** an off-hand weapon, never
   * both. `equippedSlot3` resolves which one a build is actually using.
   */
  hands?: HandsSlotState;
  /** Slot 3, when it holds a second weapon instead of a hands piece. */
  offHandWeapon?: WeaponSlotConfig;
  /** Slot 4. */
  legs?: LegsSlotState;
  /** Slots 5 and 6. The same accessory may not be equipped in both. */
  accessory1?: AccessorySlotState;
  accessory2?: AccessorySlotState;
}

/**
 * Just the slot 3-6 part of a build's equipment.
 *
 * Split out so the UI can hold and replace all four slots as one value; it is
 * spread straight into `BuildEquipmentState`, so the two cannot drift.
 */
export interface GearLoadout {
  hands?: HandsSlotState;
  offHandWeapon?: WeaponSlotConfig;
  legs?: LegsSlotState;
  accessory1?: AccessorySlotState;
  accessory2?: AccessorySlotState;
  itemRolls?: Record<string, number>;
}

export const EMPTY_GEAR_LOADOUT: GearLoadout = {};

/** What slot 3 currently holds. */
export type Slot3Mode = 'hands' | 'offHandWeapon' | 'empty';

/**
 * Resolves slot 3, which can only hold one thing.
 *
 * An off-hand weapon wins when both are somehow set: equipping a second weapon
 * is what displaces the hands piece, so a build carrying both is a stale hands
 * entry left behind by the switch rather than two occupied slots.
 */
export function equippedSlot3(equipment: BuildEquipmentState | undefined): Slot3Mode {
  if (equipment?.offHandWeapon) return 'offHandWeapon';
  if (equipment?.hands?.itemName) return 'hands';
  return 'empty';
}

/**
 * Whether the two accessory slots hold the same item, which the game forbids.
 *
 * Compared by name because that is the identity the rule uses: two different
 * Magician's Rings are still the same accessory.
 */
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

export interface OptimizationResult {
  candidates: OptimizationCandidate[];
  pointBudget: number;
  evaluatedClassPairs: number;
  durationMs: number;
  engine?: 'legacy' | 'v2' | 'ai';
  evaluatedCandidates?: number;
  ai?: AiOptimizationMetadata;
}

export type OptimizationMetric = StatKey
  | 'maxHP' | 'fp' | 'physicalDefense' | 'magicalDefense' | 'evade'
  | 'armor' | 'magicArmor' | 'equipmentLoad' | 'battleWeightRemaining'
  | 'criticalEvade' | 'statusInfliction' | 'statusResistance'
  | 'initiative' | 'youkaiCap' | 'flanking' | 'skillPool' | 'luckStatusPercent'
  | 'battleWeight' | 'encumbrance' | 'weaponPower' | 'weaponHit'
  | 'weaponCritical' | 'weaponCriticalDamage' | 'weaponSwa'
  | 'fireAttack' | 'iceAttack' | 'windAttack' | 'earthAttack' | 'darkAttack'
  | 'waterAttack' | 'lightAttack' | 'lightningAttack' | 'acidAttack' | 'soundAttack';

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
    scaling: Partial<StatRecord>;
  };
  scaledStatTargets: Partial<StatRecord>;
  priorityStats: StatKey[];
  notes: string;
  provenance?: string;
  confidence?: 'verified' | 'community' | 'historical' | 'unavailable';
  canonicalWeaponId?: string;
  requiredWeaponEnchantment?: string;
  dataGaps?: string[];
}

export type OptimizationDefensePlan = 'auto' | 'tank' | 'evade' | 'bruiser' | 'hybrid' | 'glass';
export type OptimizationExtraPackage = 'auto' | 'critical' | 'faith' | 'sanctity' | 'none';
export type OptimizationSearchDepth = 'standard' | 'deep';
export type ArmorConditionalPolicy = 'baseline' | 'verified-current';

/**
 * Which body a build's stats are judged in.
 *
 * Install replaces the racial stat line, but only for the 2–4 rounds it lasts.
 * `baseline` ranks the character as themselves and treats Install as upside:
 * the right default, because allocating for the installed body strands the
 * stats the Youkai supplies and leaves the character worse off the rest of the
 * time. `installed` is for a build that exists to burst inside that window.
 */
export type InstallPolicy = 'baseline' | 'installed';

export interface OptimizationDefenseContract {
  minimumEvade?: number;
  preferredEvade?: number;
  reliableBonusEvade?: number;
  minimumScaledDefense?: number;
  minimumScaledResistance?: number;
  minimumArmor?: number;
  minimumMagicArmor?: number;
  requirePartialBattleWeight?: boolean;
  armorConditionalPolicy?: ArmorConditionalPolicy;
}

export interface OptimizationDefenseScenario {
  plan: OptimizationDefensePlan;
  baselineEvade: number;
  reliableEvade: number;
  configuredEvade: number;
  minimumEvade?: number;
  preferredEvade?: number;
  reliableBonusEvade: number;
  scaledDefense: number;
  scaledResistance: number;
  armor: number;
  magicArmor: number;
  armorEvade: number;
  equipmentLoad: number;
  battleWeightCapacity: number;
  battleWeightRemaining: number;
  meetsMinimum: boolean;
  reachesPreferred: boolean;
  failures: string[];
  assumptions: string[];
}

export interface OptimizationEquipmentLocks {
  /** Pins the main slot. Only meaningful when `searchMainClass` is on. */
  mainClass?: string;
  subClass?: string;
  weaponName?: string;
  weaponType?: string;
  armorName?: string;
  armorType?: Armor['type'];
}

/**
 * Which chosen-content axes the search may rewrite.
 *
 * Off means "keep exactly what the build already has", which is the right
 * default for anything the user has hand-picked and does not want reshuffled.
 */
export interface OptimizationLoadoutAxes {
  traits: boolean;
  skills: boolean;
  youkai: boolean;
}

/** What the search settled on for the chosen-content axes, for display. */
export interface OptimizationLoadoutSummary {
  traits: Array<{ id: string; name: string }>;
  /** `pool` is the class whose allowance the rank was charged to. */
  skills: Array<{ id: string; name: string; rank: number; maxRank: number; pool: string }>;
  contracted: Array<{
    id: string;
    name: string;
    race: string;
    installed: boolean;
    source: 'existing' | 'added' | 'ascended-upgrade';
    reasons: YoukaiSelectionReason[];
  }>;
  traitPointsSpent: number;
  traitPointBudget: number;
  /**
   * One entry per class the build reaches, each with its own allowance.
   *
   * Skill points do not pool across classes, so a single spent/budget pair would
   * hide the case that matters: full in one class and untouched in another.
   */
  skillPools: Array<{ className: string; spent: number; budget: number }>;
  skillPointsSpent: number;
  skillPointBudget: number;
  youkaiCap: number;
  destiny: boolean;
  /**
   * Distinct Youkai races on the roster, and whether the build can swap between
   * them mid-fight via Chaotic Form. A swapping build wears every race it holds.
   */
  youkaiRaces: string[];
  canSwapInstall: boolean;
  /** Set when a Youkai is installed, describing that temporary body. */
  install?: {
    youkaiName: string;
    policy: InstallPolicy;
    /** Rounds the transformation lasts at the build's Install rank. */
    durationRounds: number;
    /**
     * Scaled stats in each body, so the gap between them is visible.
     *
     * The gap is the point: an allocation tuned for the installed line strands
     * every point the Youkai would have supplied.
     */
    baselineStats: StatRecord;
    installedStats: StatRecord;
    baselineMaxHP: number;
    installedMaxHP: number;
  };
}

export interface YoukaiSelectionReason {
  skillName: string;
  access: 'sync-mind-active' | 'sync-mind-passive' | 'install-main' | 'chaotic-form' | 'ascended-upgrade';
  summary: string;
  basis: 'modeled' | 'build-fit' | 'intent' | 'rule';
  condition?: string;
  uncertain?: boolean;
}

export interface OptimizationObjectives {
  offense: number;
  accuracy: number;
  durability: number;
  sustain: number;
  utility: number;
  guideFit: number;
  profileFit: number;
  /**
   * Aggregate PvP gauntlet score against the community opponent statlines.
   * Present only when the request runs the gauntlet, so every build in one
   * search either has it or none do: dominance comparisons stay well-formed.
   */
  pvp?: number;
}

export interface OptimizationDamageSkill {
  label: string;
  swaPercent: number;
  element: ElementKey | null;
  elementalAttackPercent: number;
  weight: number;
}

export interface OptimizationDamageProfile {
  skills: OptimizationDamageSkill[];
}

export interface OptimizationDamageReport {
  weightedScore: number;
  skills: Array<OptimizationDamageSkill & {
    weaponPowerContribution: number;
    elementalAttack: number;
    elementalContribution: number;
    modeledTotal: number;
  }>;
  caveat: string;
}

/**
 * A community reference profile read as an opponent rather than a template.
 *
 * Every number is derived from the profile's scaled stat targets through the
 * calculator's own formulas, so the formulas are calculator-verified, but the
 * inputs are community-transcribed screenshots, and the statline inherits that
 * `community` confidence. Fields the transcription cannot support (gear Evade,
 * flat Armor, the opponent's skills) are absent and reported as caveats rather
 * than guessed.
 */
export interface OpponentStatline {
  profileId: string;
  name: string;
  archetype: string;
  /** `floor(2 × scaled CEL)`: no gear, skill, or bonus Evade is known. */
  evadeFloor: number;
  /** The floor plus the +50 bonus-Evade cap: what a buffed opponent may show. */
  evadeCeiling: number;
  physicalDefense: number;
  magicalDefense: number;
  criticalEvade: number;
  statusInfliction: number;
  statusResistance: number;
  /** VIT/SAN terms plus level-60 allocated points; STR and gear HP unknown. */
  hpFloor: number;
  /** `floor(2 × scaled SKI)` + canonical weapon Accuracy. Absent when the profile's weapon has no canonical record. */
  hit?: number;
  /** Weapon Power plus the profile's stated scaling contribution, a SWA stand-in. */
  swaProxy: number;
  /**
   * Statuses this opponent's subrace cannot be inflicted with, from the wiki's
   * status catalog. The generic infliction margin cannot see these; they exist
   * so a status build's pilot (and the AI planner) can check the plan's key
   * status against each opponent before trusting the margin.
   */
  statusImmunities: string[];
  caveats: string[];
}

/** One candidate-vs-opponent row of the PvP gauntlet. */
export interface GauntletMatchup {
  opponentId: string;
  opponentName: string;
  /** Hit − Evade per the community hit model, bounded 0–100. */
  hitChanceVsReliable: number;
  /** The same margin against the opponent's +50-buffed Evade ceiling. */
  hitChanceVsCeiling: number;
  /** Modeled damage after the opponent's percentage mitigation; flat Armor is unknown. */
  damagePerHit: number;
  /** `damagePerHit × hitChanceVsCeiling%`: output weighted by landing it. */
  effectiveDamage: number;
  /** Absent when the opponent's weapon record (and so their Hit) is unknown. */
  incomingHitChance?: number;
  incomingDamagePerHit?: number;
  /** Landed opponent hits this build's HP absorbs. */
  hitsSurvived?: number;
  statusInflictChance: number;
  statusAvoidChance: number;
  /** 0–1 blend of the offense, defense, and status margins above. */
  score: number;
}

/**
 * How a candidate performs against the community reference builds as opponents.
 *
 * This is the check the plain objectives cannot make: a build can clear every
 * static floor and still be unable to hit, hurt, or survive what players
 * actually field. Scores rank candidates within one search; they are not
 * win-rate predictions.
 */
export interface OptimizationGauntletReport {
  opponents: GauntletMatchup[];
  /** Mean matchup score, 0–1. */
  aggregateScore: number;
  weakestOpponentId?: string;
  caveat: string;
}

export interface AptitudeOptimizationReport {
  scaledAptitude: number;
  globalStatBonus: number;
  globalStatsAffected: number;
  investedPoints: number;
  retainedBreakpointInvestment: number;
  redundantInvestedPoints: number;
  nextScaledBreakpoint: number;
  pointsToNextBonus: number | null;
  nextBreakpointRawStatGain: number | null;
  nextBreakpointScaledStatGain: number | null;
  nextBreakpointRawEfficient: boolean | null;
  nextBreakpointScaledEfficient: boolean | null;
  efficientBreakpoint: boolean;
  summary: string;
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

/**
 * One named source feeding a derived figure.
 *
 * `evaluateBuild` sums a dozen sources into each of Hit and Evade, and used to
 * report only the totals, so a readout could say what a number *was* but not
 * where it came from, and the base/bonus split in particular was invisible.
 * Naming the sources is the only way a screen can explain a capped figure: "you
 * are at +50 Bonus Evade" is not actionable without knowing which effects are
 * competing for it.
 *
 * Zero-valued sources are omitted, so a list is only as long as the build makes it.
 */
export interface DerivedSource {
  /** What the reader recognises it as, e.g. `Torso upgrades`. */
  label: string;
  value: number;
  /**
   * Which channel it lands in.
   *
   * `base` is uncapped; `bonus` competes for the +50 ceiling. See
   * `domain/hitEvade.ts` and the knowledge base entry for the assignments.
   */
  channel: 'base' | 'bonus';
  /** The attribute it reads, when it is a stat term, a route to that card. */
  stat?: StatKey;
}

/** Itemised provenance for the derived figures that sum many sources. */
export interface DerivedSources {
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
    /**
     * The frontal Hit bonus the build owns before the cap: Chivalry's Smite at
     * its actual rank. `honorHeadroom` is what the cap lets it keep.
     */
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
    /**
     * Percentage points on the chance to apply and avoid luck-based statuses.
     *
     * Currently only the Redtail's green dice moves this. It is deliberately not
     * `statusInfliction` / `statusResistance`: those are flat status power, and
     * this is a chance modifier on one category of status.
     */
    luckStatusPercent: number;
  };
  elementalAttack: ElementalRecord;
  elementalResistance: ElementalRecord;
  /** Blunt / Pierce / Slash, from armour, materials, enchantments and items. */
  physicalResistance: PhysicalRecord;
  /** Where Hit and Evade come from, itemised. */
  sources: DerivedSources;
  primaryWeapon?: {
    /** The weapon's own Power; its description window, plus what is applied to it. */
    power: number;
    /**
     * Scaled Weapon Attack: `Power + stat scaling`.
     *
     * The quantity every skill and spell coefficient is stated against. Distinct
     * from `power`, which carries no stat scaling at all.
     */
    swa: number;
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
  addedStats: StatRecord;
  /*
   * Chosen content. Absent on a candidate from an engine that does not search
   * these axes, in which case applying the patch leaves the build's own alone.
   */
  traits?: string[];
  skillRanks?: Record<'main' | 'sub', SkillRanks>;
  youkai?: YoukaiState;
  equipment?: BuildEquipmentState;
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
  objectives?: OptimizationObjectives;
  evidence?: string[];
  tradeoffs?: string[];
  confidence?: 'high' | 'medium' | 'low';
  aptitudeReport?: AptitudeOptimizationReport;
  defenseScenario?: OptimizationDefenseScenario;
  damageReport?: OptimizationDamageReport;
  gauntletReport?: OptimizationGauntletReport;
  loadout?: OptimizationLoadoutSummary;
}

export interface OptimizationRequest {
  build: BuildState;
  preset: OptimizationPreset;
  constraints: OptimizationConstraint[];
  /** When set, every candidate must keep this class in the primary/main slot. */
  primaryClass?: string;
  /** Optional curated evidence. It may seed exploration and break close ties, but never overrides modeled performance. */
  referenceProfileId?: string;
  searchClasses: boolean;
  /**
   * Whether the main slot may change too.
   *
   * Off by default: every engine before this one treated the main class as a
   * fixed character choice, and a search that silently reclasses you is not what
   * "optimize my Shapeshifter" means. Turned on, both slots are searched and the
   * pair is chosen together.
   */
  searchMainClass?: boolean;
  /** Chosen-content axes the search may rewrite. Absent means none of them. */
  searchLoadout?: Partial<OptimizationLoadoutAxes>;
  /** Which body the stats are ranked in. Defaults to `baseline`. */
  installPolicy?: InstallPolicy;
  resultLimit?: number;
  engine?: 'legacy' | 'v2';
  locks?: OptimizationEquipmentLocks;
  defensePlan?: OptimizationDefensePlan;
  defenseContract?: OptimizationDefenseContract;
  extraPackage?: OptimizationExtraPackage;
  searchDepth?: OptimizationSearchDepth;
  intent?: string;
  damageProfile?: OptimizationDamageProfile;
  /**
   * Score candidates against the community reference builds as opponents.
   * Defaults to on for the `pvp` preset and off otherwise.
   */
  pvpGauntlet?: boolean;
  /**
   * Counter-build mode: restrict the gauntlet to these opponent profile ids. A
   * non-empty list turns the gauntlet on under any goal preset: "beat this
   * build" is a valid ask regardless of the archetype being optimized. Unknown
   * ids are ignored; a list that matches nothing falls back to the full roster.
   */
  gauntletOpponentIds?: string[];
}

export type AiOptimizationMode = 'standard' | 'deep';

export interface AiOptimizationRequest {
  build: BuildState;
  presetId: string;
  constraints: OptimizationConstraint[];
  locks: OptimizationEquipmentLocks;
  defensePlan: OptimizationDefensePlan;
  defenseContract?: OptimizationDefenseContract;
  extraPackage: OptimizationExtraPackage;
  referenceProfileId?: string;
  intent: string;
  mode: AiOptimizationMode;
  previousResponseId?: string;
  /** Whether the user permitted the main slot to change. */
  searchMainClass?: boolean;
  /** Chosen-content axes the user permitted the search to rewrite. */
  searchLoadout?: Partial<OptimizationLoadoutAxes>;
  /** Counter-build mode: the user's selected gauntlet opponents, passed through verbatim. */
  gauntletOpponentIds?: string[];
}

export interface AiOptimizationMetadata {
  model: string;
  responseId?: string;
  toolRounds: number;
  exactEvaluations: number;
  fallback: boolean;
  phase: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  knowledge: {
    loaded: boolean;
    sourceCount: number;
    sources: string[];
    characters: number;
    liveWebAccess: false;
  };
  summary?: string;
}

export interface AiOptimizationResponse {
  result: OptimizationResult;
  clarification?: string;
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

/** The explanatory text a stat's info panel shows. */
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
  /** Present for the weapons that scale off Aptitude. */
  apt?: number;
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

export interface WeaponOptimizationPolicy {
  automaticRecommendation: 'allowed' | 'explicit-opt-in';
  restriction: string;
  optInTerms?: string[];
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
  /** Conservative optimizer handling for restrictions not represented by numeric weapon stats. */
  optimizationPolicy?: WeaponOptimizationPolicy;
  description: string;
  location: string[];
}

/**
 * Armor interface for equipment system
 */
/** The slot-3-to-6 groups, which is also how `gear.json` is keyed. */
export type GearGroup = 'Hands' | 'Shield' | 'Legs' | 'Accessory';

/**
 * A hands, shield, legs or accessory item.
 *
 * Deliberately not an `Armor`: the wiki gives these slots no Armor, Magic Armor,
 * Evade or Weight columns, so there is nothing to fill those fields with.
 * Everything one of these items does is stated in prose and resolved through
 * `domain/itemEffects.ts`, which is why `specialEffects` is the substance of the
 * record rather than a footnote to it.
 */
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
