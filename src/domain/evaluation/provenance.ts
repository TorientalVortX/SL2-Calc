import type { BuildEvaluation, StatKey, StatRecord } from '../../types';
import { resolveArmorUpgradePoints, resolveUpgradePoints } from '../../types';
import { CLASS_HIERARCHY } from '../../data/classes';
import { otherMaterialModifier } from '../armorMaterials';
import { enchantmentEffectForSlot } from '../armorEnchantments';
import { itemBonuses } from '../itemEffects';
import { skillBonuses, skillsForClassSlots } from '../skills';
import { sanguineCrestStats, traitById, traitStatBonuses } from '../traits';
import { equippedSets } from '../itemSets';
import { classArmorApplies } from '../classArmor';
import { GEAR_ENCHANT_SLOTS, type EvaluationInputs } from './inputs';
import type { StatsResult } from './stats';
import { STAT_KEYS } from './shared';

/** Each stat's named contributions, for the stat card. */
export function statProvenance(inputs: EvaluationInputs, stats: StatsResult): NonNullable<BuildEvaluation['statSources']> {
  const {
    build, mainClass, monoclassModifier, karakuri, subrace, food, rising, armor, armorConditional, weaponBonus, armorMaterial,
    armorEnchant, gearSlots, mergedSkillRanks, skillWeaponTypes, skillContext, youkaiBonuses, dragonKingPieces,
    dragonQueenPieces, items, mixtureBonuses,
  } = inputs;
  const { racialFor, scaledStats, installedAffinity, aptitudeBonus } = stats;

  const statSources = Object.fromEntries(STAT_KEYS.map(stat => [stat, [] as Array<{ label: string; value: number }>])) as NonNullable<BuildEvaluation['statSources']>;
  const add = (label: string, values: Partial<StatRecord>) => {
    for (const stat of STAT_KEYS) {
      const value = values[stat] ?? 0;
      if (value) statSources[stat].push({ label, value });
    }
  };
  const line = (fn: (stat: StatKey) => number) => Object.fromEntries(STAT_KEYS.map(stat => [stat, fn(stat)]));
  const classBoost = classArmorApplies(build.equipment.armorName, build.mainClass) ? ` (+50% from ${build.equipment.armorName})` : '';
  add(`${build.mainClass}${monoclassModifier === 2 ? ' (monoclass)' : ''}${classBoost}`, line(stat => (mainClass[stat] ?? 0) * monoclassModifier));
  add('Manual stat adjustments', build.customStats);
  add('Karakuri binding', karakuri);
  add('Installed Youkai: racial stat replacement', line(stat => racialFor(stat) - (subrace[stat] ?? 0)));
  add(`Food: ${build.food}`, food.stats);
  add('Stamps', build.stamps);
  add('Sanguine Crest', sanguineCrestStats(build));
  add('Power of Normalcy', line(stat => build.powerOfNormalcy && stat !== 'apt' && CLASS_HIERARCHY[build.mainClass]?.baseClass && CLASS_HIERARCHY[build.subClass]?.baseClass ? (monoclassModifier === 2 ? 8 : 4) : 0));
  add('Rising Game', rising);
  add(`Torso: ${build.equipment.armorName}`, armor?.statBonuses ?? {});
  add(`Torso conditional bonuses: ${build.equipment.armorName}`, armorConditional.stats);
  add(`Weapon enchantment: ${build.equipment.primaryWeapon?.enchantment}`, weaponBonus);
  add(`Torso material: ${build.equipment.armorMaterial}`, armorMaterial.stats);
  add(`Torso enchantment: ${build.equipment.armorEnchantment}`, armorEnchant.stats);
  const conditionals = { ...build.equipment.armorConditionalBonuses, ...build.equipment.itemConditionalBonuses };
  add(`Weapon: ${build.equipment.primaryWeapon?.selectedWeaponName}`, itemBonuses({
    weaponName: build.equipment.primaryWeapon?.selectedWeaponName,
    weaponPoints: build.equipment.primaryWeapon ? resolveUpgradePoints(build.equipment.primaryWeapon) : undefined,
    conditionals, rolls: build.equipment.itemRolls, level: build.characterLevel,
  }).stats);
  add(`Torso effects: ${build.equipment.armorName}`, itemBonuses({
    armorName: build.equipment.armorName, armorPoints: resolveArmorUpgradePoints(build.equipment), conditionals, rolls: build.equipment.itemRolls, level: build.characterLevel,
  }).stats);
  gearSlots?.forEach((slot, index) => {
    if (!slot?.itemName) return;
    const label = `${['Hands', 'Legs', 'Accessory 1', 'Accessory 2'][index]}: ${slot.itemName}`;
    add(label, itemBonuses({ gear: [slot], conditionals, rolls: build.equipment.itemRolls, level: build.characterLevel }).stats);
    add(`${label} / ${slot.material}`, otherMaterialModifier(slot.material).stats);
    add(`${label} / ${slot.enchantment}`, enchantmentEffectForSlot(slot.enchantment, GEAR_ENCHANT_SLOTS[index]).stats);
  });
  for (const set of equippedSets(build.equipment)) {
    add(`Set: ${set.name} ${set.pieces}`, itemBonuses({ sets: [set], conditionals, level: build.characterLevel }).stats);
  }
  for (const id of build.traits ?? []) add(`Trait: ${traitById(id)?.name ?? id}`, traitStatBonuses([id], build.traitConditionals));
  for (const skill of skillsForClassSlots(build.mainClass, build.subClass)) {
    if (mergedSkillRanks[skill.id]) add(`Skill: ${skill.name}`, skillBonuses([skill], mergedSkillRanks, build.skillConditionals, skillWeaponTypes, { ...skillContext, scaledStats }).stats);
  }
  add('Youkai bonuses', youkaiBonuses.stats);
  add('Installed Affinity (max +1)', installedAffinity);
  add('Dragon King set', { str: dragonKingPieces * 3 });
  add('Dragon Queen set', { wil: dragonQueenPieces * 3 });
  add('Aptitude bonus (owned scaled APT / 6)', line(stat => stat === 'apt' ? 0 : aptitudeBonus));
  add('Stat buffs', build.statBuffs ?? {});
  add('Item status buffs', line(stat => items.derived[`buff:${stat}`] ?? 0));
  add('Evolution Drought base stats', mixtureBonuses.baseStats ?? {});
  add('Active mixture effects', mixtureBonuses.stats ?? {});
  if (build.hpPercent <= 50) {
    const instinct = Math.floor(scaledStats.san * 0.1 + 1) * (build.hpPercent <= 25 ? 2 : 1);
    if (build.felidaeInstinct && ['Felidae', 'Grimalkin'].includes(build.subrace)) add('Felidae Instinct', { ski: instinct, cel: instinct, gui: instinct, luc: instinct });
    if (build.lupineInstinct && build.subrace === 'Lupine') add('Lupine Instinct', { str: instinct, wil: instinct, def: instinct, res: instinct });
  }
  return statSources;
}
