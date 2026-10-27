import type { DerivedSource } from '../../types';
import { EVADE_PER_CEL, targetEvade } from '../hitEvade';
import type { EvaluationInputs } from './inputs';
import type { StatsResult } from './stats';
import { compactSources, sumSources } from './shared';

export type DefenseResult = ReturnType<typeof resolveEvade>;

// Per the community Evade page and Hit/Evade workbook: printed item Evade, materials, upgrades and Dodger are
// uncapped base; passive buffs and item effects (e.g. Sarasha Gi's +12) are bonus, capped at +50.
export function resolveEvade(inputs: EvaluationInputs, stats: StatsResult) {
  const {
    build, armor, armorPoints, armorMaterial, armorEnchant, armorQuality, armorConditional, legsPoints,
    gearBonus, items, youkaiBonuses, mixtureBonuses,
  } = inputs;
  const { scaledStats, skills, fortune } = stats;

  const evadeSources: DerivedSource[] = compactSources([
    { label: 'Scaled CEL', value: Math.floor(scaledStats.cel * EVADE_PER_CEL), channel: 'base', stat: 'cel' },
    { label: 'Base Evade override', value: build.baseEvade, channel: 'base' },
    { label: 'Torso', value: armor?.evade ?? 0, channel: 'base' },
    { label: 'Torso upgrades', value: armorPoints.evade, channel: 'base' },
    { label: 'Torso material', value: armorMaterial.evade, channel: 'base' },
    { label: 'Torso enchantment', value: armorEnchant.evade, channel: 'base' },
    { label: 'Torso quality', value: armorQuality.evade, channel: 'base' },
    { label: 'Legs upgrades', value: legsPoints.evade, channel: 'base' },
    { label: 'Gear materials and enchantments', value: gearBonus.evade, channel: 'base' },
    { label: 'Skills', value: (skills.derived.evade ?? 0) - (skills.derived.evadeBonus ?? 0), channel: 'base' },
    { label: 'Active skills', value: skills.derived.evadeBonus ?? 0, channel: 'bonus' },
    { label: 'Giant Gene', value: build.giantGene ? -10 : 0, channel: 'base' },
    { label: 'Bonus Evade override', value: build.bonusEvade, channel: 'bonus' },
    { label: 'Torso conditional effects', value: armorConditional.evade, channel: 'bonus' },
    { label: 'Item effects', value: items.derived.evade ?? 0, channel: 'bonus' },
    { label: 'Redtail fortune', value: fortune.evade, channel: 'bonus' },
    { label: 'Youkai', value: youkaiBonuses.derived.evade, channel: 'bonus' },
    { label: 'Active mixture effects', value: mixtureBonuses.evade ?? 0, channel: 'bonus' },
  ]);
  const evadeBonusSources = sumSources(evadeSources, 'bonus');
  const ownEvade = targetEvade({ baseEvade: sumSources(evadeSources, 'base'), evadeBuffs: evadeBonusSources });

  return { evadeSources, evadeBonusSources, ownEvade };
}
