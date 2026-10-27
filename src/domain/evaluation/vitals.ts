import type { DerivedSource } from '../../types';
import { CLASS_HIERARCHY } from '../../data/classes';
import { otherMaterialModifier } from '../armorMaterials';
import { calculateMaxFocus, calculateMaxHealth } from '../derivedCalculations';
import type { EvaluationInputs } from './inputs';
import type { StatsResult } from './stats';
import { STAT_KEYS, compactSources } from './shared';

export type VitalsResult = ReturnType<typeof resolveVitals>;

export function resolveVitals(inputs: EvaluationInputs, stats: StatsResult) {
  const {
    build, race, subrace, history, food, astrologyStat, hasFortitude, hasEndurance, painToleranceRank, armor,
    armorConditional, armorMaterial, armorEnchant, items, legsPoints, handsPoints, gearBonus, gearSlots, mixtureBonuses, talents, weaponMaterial,
  } = inputs;
  const { scaledStats, skills, baseFor } = stats;

  const pointsSpent = STAT_KEYS.reduce((sum, stat) => sum + build.addedStats[stat], 0);
  const bothBase = Boolean(CLASS_HIERARCHY[build.mainClass]?.baseClass && CLASS_HIERARCHY[build.subClass]?.baseClass);
  const normalcyHP = build.persistenceOfNormalcy && bothBase ? (build.mainClass === build.subClass ? 200 : 100) : 0;
  const spiritVitals = Math.max(0, Math.min(5, Math.floor(build.whiteSpiritCount ?? 0))) * 3;
  const crystalVitals = Math.max(0, Math.min(45, Math.floor(build.crystalCount ?? 0)));
  let maxHP = calculateMaxHealth({
    vit: scaledStats.vit,
    san: scaledStats.san,
    strengthHpBase: baseFor('str') + build.addedStats.str + (history.stats.str ?? 0) + (astrologyStat === 'str' ? 1 : 0),
    pointsSpent,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    giantGene: build.giantGene,
    fortitude: hasFortitude,
    painToleranceRank,
    warwalk: build.warwalk,
    endurance: hasEndurance,
    customHP: build.customHP + (food.hp ?? 0) + (history.hp ?? 0) + spiritVitals + crystalVitals,
    equipmentHP: (armor?.statBonuses?.hp ?? 0) + armorConditional.hp + armorMaterial.hp + armorEnchant.hp
      + (items.derived.hp ?? 0) + legsPoints.hp + gearBonus.hp + weaponMaterial.hp,
    normalcyHP,
    lich: build.subrace === 'Lich',
  });
  if (food.hpPercent) maxHP = Math.floor(maxHP * (1 + food.hpPercent / 100));
  if (history.hpPercent) maxHP = Math.floor(maxHP * (1 + history.hpPercent / 100));
  if (armorEnchant.hpPercent) maxHP = Math.floor(maxHP * (1 + armorEnchant.hpPercent / 100));
  maxHP += mixtureBonuses.maxHP ?? 0;
  if (skills.derived.hpPercent) maxHP = Math.floor(maxHP * (1 + skills.derived.hpPercent / 100));
  let fp = calculateMaxFocus({
    wil: scaledStats.wil,
    san: scaledStats.san,
    fai: scaledStats.fai,
    homunculi: Boolean(race?.homunculi || subrace.homunculi),
    warwalk: build.warwalk,
    customFP: build.customFP + (food.fp ?? 0) + (history.fp ?? 0) + spiritVitals + crystalVitals,
    equipmentFP: (armor?.statBonuses?.fp ?? 0) + armorConditional.fp + armorMaterial.fp + armorEnchant.fp
      + (items.derived.fp ?? 0) + handsPoints.fp + gearBonus.fp + (skills.derived.fp ?? 0) + weaponMaterial.fp,
    talentFP: talents.maxFp,
    lich: build.subrace === 'Lich',
  });
  if (food.fpPercent) fp = Math.floor(fp * (1 + food.fpPercent / 100));
  if (history.fpPercent) fp = Math.floor(fp * (1 + history.fpPercent / 100));

  const fpSources: DerivedSource[] = compactSources([
    { label: 'Scaled WIL', value: Math.floor(scaledStats.wil * 5), channel: 'base' },
    { label: 'Scaled SAN', value: Math.floor(scaledStats.san * 2), channel: 'base' },
    { label: 'Scaled FAI', value: Math.floor(scaledStats.fai * 3), channel: 'base' },
    { label: 'Crystals', value: crystalVitals, channel: 'base' },
    { label: 'White Spirits', value: spiritVitals, channel: 'base' },
    { label: 'Food, history and manual FP', value: build.customFP + (food.fp ?? 0) + (history.fp ?? 0), channel: 'base' },
    { label: 'Torso', value: (armor?.statBonuses?.fp ?? 0) + armorConditional.fp + armorMaterial.fp + armorEnchant.fp, channel: 'base' },
    { label: 'Weapon material', value: weaponMaterial.fp, channel: 'base' },
    { label: 'Item effects', value: items.derived.fp ?? 0, channel: 'base' },
    { label: 'Hands upgrades', value: handsPoints.fp, channel: 'base' },
    ...((gearSlots ?? []).flatMap(slot => slot?.itemName ? [{ label: `${slot.itemName}: ${slot.material ?? 'None'} material`, value: otherMaterialModifier(slot.material).fp, channel: 'base' as const }] : [])),
    { label: 'Gear enchantments', value: gearBonus.fp - (gearSlots ?? []).reduce((sum, slot) => sum + (slot?.itemName ? otherMaterialModifier(slot.material).fp : 0), 0), channel: 'base' },
    { label: 'Skills', value: skills.derived.fp ?? 0, channel: 'base' },
    { label: 'Talents (Capacity: Depth)', value: talents.maxFp, channel: 'base' },
  ]);
  const remainingFP = fp - fpSources.reduce((sum, source) => sum + source.value, 0);
  if (remainingFP) fpSources.push({ label: 'Racial, Warwalk and percentage modifiers', value: remainingFP, channel: 'base' });

  return { pointsSpent, maxHP, fp, fpSources };
}
