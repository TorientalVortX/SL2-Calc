/**
 * The six equipment slots, as the character sheet works with them.
 *
 * The build already carries a complete `equipment` object that `evaluateBuild`
 * consumes; nothing here computes a bonus. What this module owns is the shape of
 * a legal *edit*, which slot accepts what, and the two rules the game imposes
 * that a naive setter would break:
 *
 * - **Slot 3 is exclusive.** It holds a hands piece or an off-hand weapon, never
 *   both. `equippedSlot3` resolves a build that somehow has both, but writing
 *   both is how that state gets created, so the setters clear the other side.
 * - **An accessory cannot be worn twice.** Equipping one that is already in the
 *   other accessory slot moves it rather than duplicating it.
 */
import type {
  AccessorySlotState,
  ArmorUpgradePoints,
  BuildEquipmentState,
  GearItem,
  HandsSlotState,
  LegsSlotState,
  Weapon,
  WeaponConfig,
  WeaponSlotConfig,
} from '../../types';
import {
  NO_ACCESSORY_UPGRADE_POINTS,
  NO_ARMOR_UPGRADE_POINTS,
  NO_HANDS_UPGRADE_POINTS,
  NO_LEGS_UPGRADE_POINTS,
  equippedSlot3,
  gearPointsSpent,
  resolveArmorUpgradePoints,
  resolveUpgradePoints,
} from '../../types';
import { ARMORS } from '../../data/armors';
import { GEAR_BY_GROUP, SLOT3_GEAR, gearByName, isShield } from '../../data/gear';
import { ALL_WEAPONS, WEAPONS_BY_TYPE } from '../../data/weapons';
import { CLASSES } from '../../data/classes';
import { findWeaponByName, mainClassAllowsWeaponType, subClassOnlyWeaponType, weaponToConfig } from '../../domain/equipment';
import { talentWeaponUnlocks, talentsUnlockWeapon, type TalentInput } from '../../domain/talents';
import { armorEffects, gearEffects, itemConditionalKey, itemRollKey, weaponEffects, type ItemEffect } from '../../domain/itemEffects';
import { activeSets } from '../../domain/itemSets';

export type SlotId = 'primaryWeapon' | 'armor' | 'slot3' | 'legs' | 'accessory1' | 'accessory2';

/** The four slots whose state is a `GearSlotState`. */
export type GearSlotId = 'hands' | 'legs' | 'accessory1' | 'accessory2';

export interface SlotDescriptor {
  id: SlotId;
  label: string;
  hint: string;
}

/** The mark for each slot is drawn by `ui/SlotGlyph`, keyed on the same id. */
export const SLOTS: SlotDescriptor[] = [
  { id: 'primaryWeapon', label: 'Main Hand', hint: 'The weapon every damage number is measured through.' },
  { id: 'slot3', label: 'Off Hand', hint: 'A hands piece or a second weapon, never both.' },
  { id: 'armor', label: 'Torso', hint: 'Armor, Magic Armor, Evade and most of your weight.' },
  { id: 'legs', label: 'Legs', hint: 'Upgrades buy Max HP and Evade.' },
  { id: 'accessory1', label: 'Accessory I', hint: 'Upgrades buy Fortune and Greed.' },
  { id: 'accessory2', label: 'Accessory II', hint: 'The same accessory cannot be worn twice.' },
];

/* ------------------------------------------------------------------ reading */

export interface SlotSummary {
  /** Equipped item name, or null when the slot is empty. */
  name: string | null;
  /** Second line: type, material and enchantment, whatever the slot has. */
  detail: string;
  /** Upgrade points spent on this piece, which is also its UL for effect text. */
  ul: number;
  /** Only weapons and torso armour have a published weight. */
  weight: number | null;
  /** How many effect lines the item carries, for the row's counter. */
  effects: number;
  /** True when slot 3 is holding a weapon rather than a hands piece. */
  offHand?: boolean;
}

export function slotSummary(equipment: BuildEquipmentState, slot: SlotId): SlotSummary {
  switch (slot) {
    case 'primaryWeapon': {
      const config = equipment.primaryWeapon;
      if (!config?.selectedWeaponName) return empty();
      const points = resolveUpgradePoints(config);
      return {
        name: config.selectedWeaponName,
        detail: [config.weaponType, modifierLabel(config.material), modifierLabel(config.enchantment)]
          .filter(Boolean).join(' · '),
        ul: points.power + points.critical + points.accuracy + points.durability,
        weight: config.baseWeight,
        effects: weaponEffects(config.selectedWeaponName).length,
      };
    }
    case 'armor': {
      const armor = equipment.armorName ? ARMORS[equipment.armorName] : null;
      if (!armor) return empty();
      const points = resolveArmorUpgradePoints(equipment);
      return {
        name: armor.name,
        detail: [armor.type, modifierLabel(equipment.armorMaterial), modifierLabel(equipment.armorEnchantment)]
          .filter(Boolean).join(' · '),
        ul: points.armor + points.magicArmor + points.evade,
        weight: armor.weight,
        effects: armorEffects(armor.name).length,
      };
    }
    case 'slot3': {
      if (equippedSlot3(equipment) === 'offHandWeapon') {
        const config = equipment.offHandWeapon!;
        return {
          name: config.selectedWeaponName,
          detail: [config.weaponType, modifierLabel(config.material), modifierLabel(config.enchantment)]
            .filter(Boolean).join(' · '),
          ul: 0,
          weight: config.baseWeight,
          effects: 0,
          offHand: true,
        };
      }
      return gearSummary(equipment.hands, name => (isShield(name) ? 'Shield' : 'Hands'));
    }
    case 'legs':
      return gearSummary(equipment.legs, () => 'Legs');
    default:
      return gearSummary(equipment[slot], () => 'Accessory');
  }
}

function empty(): SlotSummary {
  return { name: null, detail: '', ul: 0, weight: null, effects: 0 };
}

function gearSummary(
  state: { itemName: string | null; material?: string; enchantment?: string; upgradePoints: object } | undefined,
  group: (name: string) => string,
): SlotSummary {
  if (!state?.itemName) return empty();
  return {
    name: state.itemName,
    detail: [group(state.itemName), modifierLabel(state.material), modifierLabel(state.enchantment)]
      .filter(Boolean).join(' · '),
    ul: gearPointsSpent(state.upgradePoints),
    weight: null,
    effects: gearEffects(state.itemName).length,
  };
}

/** "None" and an absent value both mean nothing applied, and neither is worth a chip. */
function modifierLabel(value: string | undefined): string {
  return !value || value === 'None' ? '' : value;
}

/* ---------------------------------------------------------------- item lists */

export interface ItemChoice {
  name: string;
  /** Heading this item sits under in the browser. */
  group: string;
  /** One line of numbers or effect text, for the row. */
  detail: string;
  /** Set when the build's classes cannot use it; the row is shown but marked. */
  restriction?: string;
  /** Set when a talent, rather than a class, is what makes this legal. */
  unlockedBy?: string;
}

/**
 * Every weapon, with the ones this build cannot equip marked.
 *
 * Two gates, not one. The **main class's** roster is the free one: a subclass
 * grants skills, not proficiency, so its weapon list buys nothing here. The
 * other is an Adaptation talent, which opens a type up to a Rarity ceiling
 * whatever the classes say. That ceiling is per weapon rather than per type,
 * which is why the check sits inside the map: Adaptation 2 makes a Rarity 4
 * sword legal and a Rarity 5 one still out of reach.
 */
export function weaponChoices(
  mainClass: string,
  subClass: string,
  build?: TalentInput,
): ItemChoice[] {
  const unlocks = build ? talentWeaponUnlocks(build) : {};
  return Object.entries(WEAPONS_BY_TYPE).flatMap(([type, weapons]) => {
    const allowed = mainClassAllowsWeaponType(type, CLASSES[mainClass]);
    // Named separately so a refusal can explain itself: picking a subclass for
    // its weapons is the mistake this message exists to correct.
    const fromSubClass = subClassOnlyWeaponType(type, CLASSES[mainClass], CLASSES[subClass]);
    const unlockedRarity = unlocks[type] ?? 0;
    return weapons.map(weapon => {
      const byTalent = weapon.rarity <= unlockedRarity;
      const restriction = allowed || byTalent
        ? undefined
        : unlockedRarity > 0
          ? `Adaptation opens ${type.toLowerCase()}s to Rarity ${unlockedRarity}; this one is Rarity ${weapon.rarity}`
          : fromSubClass
            ? `${type}s come from ${subClass}, and a subclass grants no weapons, so only ${mainClass}'s list is free`
            : `${mainClass} cannot wield ${type.toLowerCase()}s`;
      return {
        name: weapon.name,
        group: type,
        detail: `PWR ${weapon.power} · HIT ${weapon.accuracy} · CRT ${weapon.critical} · WT ${weapon.weight} · ${scalingLabel(weapon)}`,
        ...(restriction ? { restriction } : {}),
        // Named so the row can say why a weapon its classes refuse is legal.
        ...(!allowed && byTalent ? { unlockedBy: 'Adaptation' } : {}),
      };
    });
  });
}

/** A weapon's combined scaling, written the way the class cards write stat lines. */
function scalingLabel(weapon: Weapon): string {
  const combined = new Map<string, number>();
  for (const entry of weapon.scaling) {
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value !== 'number' || !value) continue;
      combined.set(key.toUpperCase(), (combined.get(key.toUpperCase()) ?? 0) + value);
    }
  }
  if (!combined.size) return 'no scaling';
  return [...combined].map(([stat, value]) => `${stat} ${value}%`).join(' ');
}

export function armorChoices(): ItemChoice[] {
  return Object.values(ARMORS).map(armor => ({
    name: armor.name,
    group: armor.type,
    detail: `ARM ${armor.armor} · M.ARM ${armor.magicArmor} · EVA ${armor.evade} · WT ${armor.weight}`,
  }));
}

function gearChoices(items: GearItem[], group: (item: GearItem) => string): ItemChoice[] {
  return items.map(item => ({
    name: item.name,
    group: group(item),
    detail: item.specialEffects[0] ?? item.flavour ?? 'No effect listed',
  }));
}

export function choicesForSlot(
  slot: SlotId,
  mode: Slot3Choice,
  build: { mainClass: string; subClass: string } & TalentInput,
): ItemChoice[] {
  switch (slot) {
    case 'primaryWeapon':
      return weaponChoices(build.mainClass, build.subClass, build);
    case 'armor':
      return armorChoices();
    case 'slot3':
      return mode === 'offHandWeapon'
        ? weaponChoices(build.mainClass, build.subClass, build)
        : gearChoices(SLOT3_GEAR, item => (isShield(item.name) ? 'Shield' : 'Hands'));
    case 'legs':
      return gearChoices(GEAR_BY_GROUP.Legs, () => 'Legs');
    default:
      return gearChoices(GEAR_BY_GROUP.Accessory, () => 'Accessory');
  }
}

export type Slot3Choice = 'hands' | 'offHandWeapon';

/* ---------------------------------------------------------------- equipping */

export function equipPrimaryWeapon(equipment: BuildEquipmentState, weaponName: string | null): BuildEquipmentState {
  if (!weaponName) return { ...equipment, primaryWeapon: undefined };
  const weapon = findWeaponByName(weaponName);
  if (!weapon) return equipment;
  return { ...equipment, primaryWeapon: weaponToConfig(weapon) };
}

/**
 * Puts a weapon in slot 3, displacing whatever hands piece was there.
 *
 * The hands entry is removed rather than kept alongside: a build holding both is
 * exactly the stale state `equippedSlot3` has to disambiguate, and leaving it
 * would silently drop the hands piece's bonuses while still showing it equipped.
 */
export function equipOffHandWeapon(equipment: BuildEquipmentState, weaponName: string | null): BuildEquipmentState {
  if (!weaponName) return { ...equipment, offHandWeapon: undefined };
  const weapon = findWeaponByName(weaponName);
  if (!weapon) return equipment;
  const config: WeaponSlotConfig = weaponToConfig(weapon);
  return { ...equipment, offHandWeapon: config, hands: undefined };
}

export function equipArmor(equipment: BuildEquipmentState, armorName: string | null): BuildEquipmentState {
  if (!armorName || !ARMORS[armorName]) {
    return { ...equipment, armorName: null, armorConditionalBonuses: {} };
  }
  // Conditionals are keyed per armour, so carrying the previous piece's toggles
  // over would switch on conditions the new piece does not have.
  return { ...equipment, armorName, armorConditionalBonuses: {} };
}

const ZERO_POINTS: Record<GearSlotId, object> = {
  hands: NO_HANDS_UPGRADE_POINTS,
  legs: NO_LEGS_UPGRADE_POINTS,
  accessory1: NO_ACCESSORY_UPGRADE_POINTS,
  accessory2: NO_ACCESSORY_UPGRADE_POINTS,
};

export function equipGear(
  equipment: BuildEquipmentState,
  slot: GearSlotId,
  itemName: string | null,
): BuildEquipmentState {
  if (!itemName || !gearByName(itemName)) {
    return { ...equipment, [slot]: undefined };
  }
  const next: BuildEquipmentState = {
    ...equipment,
    [slot]: { itemName, upgradePoints: { ...ZERO_POINTS[slot] } } as HandsSlotState | LegsSlotState | AccessorySlotState,
  };
  // Slot 3 exclusivity, from the other direction.
  if (slot === 'hands') next.offHandWeapon = undefined;
  // An accessory worn in the other slot moves here rather than being duplicated.
  if (slot === 'accessory1' && next.accessory2?.itemName === itemName) next.accessory2 = undefined;
  if (slot === 'accessory2' && next.accessory1?.itemName === itemName) next.accessory1 = undefined;
  return next;
}

export function patchGear(
  equipment: BuildEquipmentState,
  slot: GearSlotId,
  patch: Partial<{ material: string; enchantment: string; upgradePoints: Record<string, number> }>,
): BuildEquipmentState {
  const current = equipment[slot];
  if (!current) return equipment;
  return {
    ...equipment,
    [slot]: {
      ...current,
      ...patch,
      upgradePoints: { ...current.upgradePoints, ...(patch.upgradePoints ?? {}) },
    },
  };
}

export function patchWeapon(
  equipment: BuildEquipmentState,
  which: 'primaryWeapon' | 'offHandWeapon',
  patch: Partial<WeaponConfig>,
): BuildEquipmentState {
  const current = equipment[which];
  if (!current) return equipment;
  return { ...equipment, [which]: { ...current, ...patch } };
}

export function patchArmorUpgrade(
  equipment: BuildEquipmentState,
  patch: Partial<ArmorUpgradePoints>,
): BuildEquipmentState {
  return {
    ...equipment,
    armorUpgradePoints: { ...resolveArmorUpgradePoints(equipment), ...patch },
  };
}

/** Empties every slot, leaving the character's own stats untouched. */
export function clearEquipment(): BuildEquipmentState {
  return { armorName: null, armorConditionalBonuses: {} };
}

/* ------------------------------------------------------- effects and rolls */

export interface SlotEffect {
  effect: ItemEffect;
  index: number;
  itemName: string;
  conditionalKey: string;
  rolls: Array<{ key: string; label: string; min: number; max: number; current: number }>;
}

/**
 * Effect lines for whatever is in a slot, with the keys their toggles and rolls
 * are stored under.
 *
 * A ranged value ("+2-4 CEL") is per-item RNG the calculator cannot know, so each
 * one becomes its own control keyed down to the value rather than the line. A
 * single line can state two independent ranges.
 */
export function effectsForSlot(equipment: BuildEquipmentState, slot: SlotId): SlotEffect[] {
  const summary = slotSummary(equipment, slot);
  if (!summary.name) return [];
  const effects = slot === 'primaryWeapon'
    ? weaponEffects(summary.name)
    : slot === 'armor'
      ? armorEffects(summary.name)
      : summary.offHand ? [] : gearEffects(summary.name);
  const rolls = equipment.itemRolls ?? {};

  return effects.map((effect, index) => ({
    effect,
    index,
    itemName: summary.name!,
    conditionalKey: itemConditionalKey(summary.name!, index),
    rolls: effect.effects.flatMap((value, valueIndex) => {
      if (value.rollMax === undefined) return [];
      const key = itemRollKey(summary.name!, index, valueIndex);
      return [{
        key,
        label: `${value.key.toUpperCase()} ${value.base}–${value.rollMax}`,
        min: value.base,
        max: value.rollMax,
        current: rolls[key] ?? value.base,
      }];
    }),
  }));
}

/* ---------------------------------------------------------------- overview */

export interface EquipmentOverview {
  /** Weapon plus torso: the only two slots the wiki gives a weight. */
  load: number;
  capacity: number;
  overWeight: boolean;
  sets: ReturnType<typeof activeSets>;
  duplicateAccessory: boolean;
  /** Slot 3 holds a weapon, whose own stats the evaluator does not yet model. */
  unmodelledOffHand: boolean;
  restrictedWeapon: string | null;
  /**
   * The restricted weapon is one the *subclass* lists, which grants nothing.
   * Set so the note can say that rather than leaving the player to wonder why a
   * weapon their class browser showed is refused.
   */
  restrictedBySubClassOnly: boolean;
}

export function equipmentOverview(
  equipment: BuildEquipmentState,
  battleWeight: number,
  equipmentLoad: number,
  build: { mainClass: string; subClass: string } & TalentInput,
): EquipmentOverview {
  const weaponType = equipment.primaryWeapon?.weaponType;
  /*
   * The main class's roster, then an Adaptation rank; a restriction is only
   * real once both have said no. The subclass is deliberately absent from the
   * first check: its weapon list is not proficiency.
   */
  const allowed = mainClassAllowsWeaponType(weaponType, CLASSES[build.mainClass])
    || talentsUnlockWeapon(build, weaponType, equipment.primaryWeapon?.rarity ?? 0);
  return {
    load: equipmentLoad,
    capacity: battleWeight,
    overWeight: equipmentLoad > battleWeight,
    sets: activeSets(equipment),
    duplicateAccessory: Boolean(
      equipment.accessory1?.itemName
      && equipment.accessory1.itemName === equipment.accessory2?.itemName,
    ),
    unmodelledOffHand: equippedSlot3(equipment) === 'offHandWeapon',
    restrictedWeapon: allowed || !weaponType ? null : weaponType,
    restrictedBySubClassOnly: !allowed
      && subClassOnlyWeaponType(weaponType, CLASSES[build.mainClass], CLASSES[build.subClass]),
  };
}

export { ALL_WEAPONS, NO_ARMOR_UPGRADE_POINTS };
