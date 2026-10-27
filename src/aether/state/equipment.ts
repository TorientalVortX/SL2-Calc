import { effectiveWeaponTypes } from '../../domain/equipment';
/** Slot 3 holds a hands piece or an off-hand weapon, never both; an accessory cannot be worn twice. */
import type {
  AccessorySlotState,
  ArmorUpgradePoints,
  BuildEquipmentState,
  GearItem,
  HandsSlotState,
  LegsSlotState,
  TetraAlignment,
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
import { armorEffects, gearEffects, itemConditionalKey, itemRollKey, setEffects, weaponEffects, type ItemEffect } from '../../domain/itemEffects';
import { activeSets } from '../../domain/itemSets';

export type SlotId = 'primaryWeapon' | 'armor' | 'slot3' | 'legs' | 'accessory1' | 'accessory2';

export type GearSlotId = 'hands' | 'legs' | 'accessory1' | 'accessory2';

export interface SlotDescriptor {
  id: SlotId;
  label: string;
  hint: string;
}

export const SLOTS: SlotDescriptor[] = [
  { id: 'primaryWeapon', label: 'Main Hand', hint: 'The weapon every damage number is measured through.' },
  { id: 'slot3', label: 'Off Hand', hint: 'A hands piece or a second weapon, never both.' },
  { id: 'armor', label: 'Torso', hint: 'Armor, Magic Armor, Evade and most of your weight.' },
  { id: 'legs', label: 'Legs', hint: 'Upgrades buy Max HP and Evade.' },
  { id: 'accessory1', label: 'Accessory I', hint: 'Upgrades buy Fortune and Greed.' },
  { id: 'accessory2', label: 'Accessory II', hint: 'The same accessory cannot be worn twice.' },
];

export interface SlotSummary {
  name: string | null;
  detail: string;
  /** Also the item's UL for effect text. */
  ul: number;
  /** Only weapons and torso armour have a published weight. */
  weight: number | null;
  effects: number;
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

function modifierLabel(value: string | undefined): string {
  return !value || value === 'None' ? '' : value;
}

export interface ItemChoice {
  name: string;
  group: string;
  detail: string;
  restriction?: string;
  unlockedBy?: string;
}

/** Only the main class grants proficiency; Adaptation opens a type up to a per-weapon Rarity ceiling. */
export function weaponChoices(
  mainClass: string,
  subClass: string,
  build?: TalentInput,
): ItemChoice[] {
  const unlocks = build ? talentWeaponUnlocks(build) : {};
  return Object.entries(WEAPONS_BY_TYPE).flatMap(([type, weapons]) => {
    const allowed = mainClassAllowsWeaponType(type, CLASSES[mainClass]);
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
        ...(!allowed && byTalent ? { unlockedBy: 'Adaptation' } : {}),
      };
    });
  });
}

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

export function equipPrimaryWeapon(equipment: BuildEquipmentState, weaponName: string | null): BuildEquipmentState {
  if (!weaponName) return { ...equipment, primaryWeapon: undefined };
  const weapon = findWeaponByName(weaponName);
  if (!weapon) return equipment;
  return { ...equipment, primaryWeapon: weaponToConfig(weapon) };
}

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
  // Conditionals are keyed per armour, so the previous piece's toggles must not carry over.
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
  if (slot === 'hands') next.offHandWeapon = undefined;
  if (slot === 'accessory1' && next.accessory2?.itemName === itemName) next.accessory2 = undefined;
  if (slot === 'accessory2' && next.accessory1?.itemName === itemName) next.accessory1 = undefined;
  return next;
}

export function patchGear(
  equipment: BuildEquipmentState,
  slot: GearSlotId,
  patch: Partial<{ material: string; enchantment: string; tetra: TetraAlignment; upgradePoints: Record<string, number> }>,
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

export function clearEquipment(): BuildEquipmentState {
  return { armorName: null, armorConditionalBonuses: {} };
}

export interface SlotEffect {
  effect: ItemEffect;
  index: number;
  itemName: string;
  conditionalKey: string;
  rolls: Array<{ key: string; label: string; min: number; max: number; current: number }>;
}

/** Ranged values are per-item RNG, so each becomes its own control; one line can carry two ranges. */
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
        label: value.controlLabel ?? `${value.key.toUpperCase()} ${value.base}–${value.rollMax}`,
        min: value.base,
        max: value.rollMax,
        current: rolls[key] ?? value.base,
      }];
    }),
  }));
}

export interface GrantedSkill {
  name: string;
  cost: string | null;
  /** The item, or the set, that grants it. */
  itemName: string;
  slot: SlotId | 'set';
  /** Set when the skill's text was split out of one longer line; `parts` then only carry its switches. */
  text?: string;
  parts: SlotEffect[];
}

export type EffectGroup = { kind: 'effect'; entry: SlotEffect } | { kind: 'skill'; skill: GrantedSkill };

/** Gathers each granted skill's header, cost and text lines into one entry; other effects stay as they are. */
export function groupSlotEffects(entries: SlotEffect[], slot: SlotId): EffectGroup[] {
  const groups: EffectGroup[] = [];
  for (const entry of entries) {
    const name = entry.effect.grants;
    if (!name) {
      groups.push({ kind: 'effect', entry });
      continue;
    }
    if (entry.effect.skills) {
      entry.effect.skills.forEach((skill, index) => groups.push({
        kind: 'skill',
        skill: { ...skill, itemName: entry.itemName, slot, parts: index === 0 ? [entry] : [] },
      }));
      continue;
    }
    const last = groups[groups.length - 1];
    const open = last?.kind === 'skill' && last.skill.name === name && entry.effect.role !== 'skill' ? last.skill : null;
    const skill = open ?? { name, cost: null, itemName: entry.itemName, slot, parts: [] };
    if (!open) groups.push({ kind: 'skill', skill });
    if (entry.effect.role === 'cost') skill.cost = entry.effect.description;
    else if (entry.effect.role !== 'skill') skill.parts.push(entry);
  }
  return groups;
}

export function grantedSkills(equipment: BuildEquipmentState): GrantedSkill[] {
  const fromItems = SLOTS.flatMap(({ id }) => groupSlotEffects(effectsForSlot(equipment, id), id)
    .flatMap(group => (group.kind === 'skill' ? [group.skill] : [])));
  const fromSets = setBonuses(equipment).flatMap(set => set.thresholds
    .filter(threshold => threshold.reached && threshold.entry.effect.grants)
    .map((threshold): GrantedSkill => ({
      name: threshold.entry.effect.grants!,
      cost: null,
      itemName: `${set.name} ${threshold.count}+`,
      slot: 'set',
      text: threshold.entry.effect.description,
      parts: [],
    })));
  return [...fromItems, ...fromSets];
}

export interface SetBonus {
  name: string;
  equipped: number;
  total: number;
  thresholds: Array<{ count: number; reached: boolean; entry: SlotEffect }>;
  note?: string;
}

/** Every set with a piece on, each threshold as an effect line so it can show and switch like an item's. */
export function setBonuses(equipment: BuildEquipmentState): SetBonus[] {
  return activeSets(equipment).map(set => ({
    name: set.name,
    equipped: set.equipped,
    total: set.total,
    ...(set.note ? { note: set.note } : {}),
    thresholds: setEffects(set.name).map((effect, index) => ({
      count: effect.count ?? 0,
      reached: (effect.count ?? 0) <= set.equipped,
      entry: { effect, index, itemName: set.name, conditionalKey: itemConditionalKey(set.name, index), rolls: [] },
    })),
  }));
}

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
  restrictedBySubClassOnly: boolean;
}

export function equipmentOverview(
  equipment: BuildEquipmentState,
  battleWeight: number,
  equipmentLoad: number,
  build: { mainClass: string; subClass: string } & TalentInput,
): EquipmentOverview {
  const weaponType = equipment.primaryWeapon?.weaponType;
  // The subclass is deliberately absent: its weapon list is not proficiency.
  const allowed = effectiveWeaponTypes(equipment.primaryWeapon).some(type => mainClassAllowsWeaponType(type, CLASSES[build.mainClass])
    || talentsUnlockWeapon(build, type, equipment.primaryWeapon?.rarity ?? 0));
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
