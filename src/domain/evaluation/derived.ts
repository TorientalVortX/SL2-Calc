import { calculateCurrentHealth } from '../derivedCalculations';
import { calculateYoukaiCap } from '../calculations';
import { complexMutationChance } from '../chemist';
import type { EvaluationInputs } from './inputs';
import type { StatsResult } from './stats';
import type { VitalsResult } from './vitals';
import type { OffenseResult } from './offense';
import type { DefenseResult } from './defense';

export function resolveDerived(inputs: EvaluationInputs, stats: StatsResult, vitals: VitalsResult, offense: OffenseResult, defense: DefenseResult) {
  const {
    build, race, subrace, astrologyStat, leBonus, talents, armor, armorPoints, armorMaterial, armorEnchant, armorQuality,
    armorConditional, items, gearBonus, mixtureBonuses, youkaiBonuses,
  } = inputs;
  const { scaledStats, skills, fortune, racialFor } = stats;
  const { maxHP, fp } = vitals;
  const { primaryWeapon, attack, flanking, hitBonusSources } = offense;
  const { ownEvade, evadeBonusSources } = defense;

  const battleWeight = Math.floor(scaledStats.str) + 5 + talents.maxBattleWeight + (skills.derived.battleWeight ?? 0);
  const armorWeight = Math.floor(((armor?.weight ?? 0) + armorMaterial.weight + armorEnchant.weight + armorQuality.weight) * armorEnchant.weightMod);
  const equipmentLoad = (primaryWeapon?.weight ?? 0) + armorWeight;
  const statusResistance = Math.floor((Math.floor(scaledStats.san * 2 + scaledStats.fai)
    + armorEnchant.statusResistance + (skills.derived.statusResistance ?? 0) + gearBonus.statusResistance
    + (mixtureBonuses.statusResistance ?? 0)) * (1 + ((mixtureBonuses.statusResistancePercent ?? 0) + (skills.derived.statusResistancePercent ?? 0)) / 100));
  const mutagenPotency = mixtureBonuses.mutagenPotency ?? 0;

  return {
    maxHP,
    currentHP: calculateCurrentHealth(maxHP, build.hpPercent),
    fp,
    physicalDefense: Math.floor(scaledStats.def * 0.9) + (skills.derived.physicalDefense ?? 0) + (skills.derived.defensiveKnowledge ?? 0),
    magicalDefense: Math.floor(scaledStats.res * 0.9) + (skills.derived.magicalDefense ?? 0),
    evade: Math.floor(ownEvade.total),
    evadeBase: Math.floor(ownEvade.preBonus),
    evadeBonus: Math.floor(ownEvade.bonusEvade),
    evadeBonusWasted: Math.max(0, Math.floor(evadeBonusSources - ownEvade.bonusEvade)),
    criticalEvade: Math.floor(scaledStats.fai + scaledStats.luc) + armorMaterial.criticalEvade + armorEnchant.criticalEvade + fortune.criticalEvade + (skills.derived.criticalEvade ?? 0) + youkaiBonuses.derived.criticalEvade + gearBonus.criticalEvade,
    statusInfliction: Math.floor(
      (Math.floor(scaledStats.ski * 2 + scaledStats.wil) + (skills.derived.statusInfliction ?? 0))
      * (1 + talents.statusInflictionPercent / 100),
    ),
    statusResistance,
    mutagenPotency,
    complexMutationChance: complexMutationChance(mutagenPotency, statusResistance,
      build.mainClass === 'Shapeshifter' || build.subClass === 'Shapeshifter',
      build.race === 'Chimera' || build.subrace === 'Chimera'),
    initiative: racialFor('cel') + build.addedStats.cel + build.customBaseStats.cel + (astrologyStat === 'cel' ? 1 : 0),
    // Install preserves FAI, so this stays on the subrace line.
    youkaiCap: calculateYoukaiCap((subrace.fai ?? 0) + build.customBaseStats.fai + build.addedStats.fai + (leBonus.fai ?? 0) + (astrologyStat === 'fai' ? 1 : 0)),
    flanking: Math.floor(flanking),
    hitTiers: {
      base: Math.floor(attack.byTier.base),
      front: Math.floor(attack.byTier.front),
      flank1: Math.floor(attack.byTier.flank1),
      flank2: Math.floor(attack.byTier.flank2),
    },
    hitBase: Math.floor(attack.preBonus),
    hitBonusSources,
    hitBonusApplied: Math.floor(attack.bonusHit),
    hitBonusWasted: Math.max(0, Math.floor(hitBonusSources - attack.bonusHit)),
    honorHeadroom: Math.floor(attack.honorHeadroom),
    frontalHitBonus: talents.frontalHit,
    skillPool: build.traits?.includes('undeniable-innovator') ? 99 : 11 + Math.floor(scaledStats.gui / 5) + Math.floor(scaledStats.ski / 5) + Math.floor(scaledStats.wil / 10) + (race?.human || subrace.human ? 2 : 0) + talents.skillPool + (skills.derived.skillPool ?? 0),
    battleWeight,
    armor: (armor?.armor ?? 0) + armorPoints.armor + armorMaterial.armor + armorEnchant.armor + armorQuality.armor + (items.derived.armor ?? 0) + gearBonus.armor + talents.armor + (skills.derived.armor ?? 0),
    magicArmor: (armor?.magicArmor ?? 0) + armorPoints.magicArmor + armorMaterial.magicArmor + armorEnchant.magicArmor + armorQuality.magicArmor + (items.derived.magicArmor ?? 0) + gearBonus.magicArmor + talents.magicArmor + (skills.derived.magicArmor ?? 0),
    // Mixes base and bonus Evade; never feed it back as a base input or bonus Evade escapes the +50 cap.
    armorEvade: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorQuality.evade + armorConditional.evade + (items.derived.evade ?? 0),
    armorEvadeBase: (armor?.evade ?? 0) + armorPoints.evade + armorMaterial.evade + armorEnchant.evade + armorQuality.evade,
    armorWeight,
    equipmentLoad,
    battleWeightRemaining: battleWeight - equipmentLoad,
    encumbrance: Math.floor(scaledStats.str + scaledStats.vit) + 5 + (build.subrace === 'Dullahan' ? 30 : 0) + (build.subrace.includes('Mechanation') ? 20 : 0),
    luckStatusPercent: fortune.luckStatusPercent + youkaiBonuses.derived.luckStatusPercent,
  };
}
