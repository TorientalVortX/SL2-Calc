import type { BuildEvaluation, BuildState, StatRecord } from '../types';
import { mergeSkillRanks, valueAtRank } from './skills';

export interface ParryOption {
  id: string;
  name: string;
  reductionPercent: number;
  /** Activation chance in percent for this build, or null when it depends on battle state the build can't know. */
  chance: number | null;
  chanceRule: string;
  appliesTo: string;
}

interface ParryRule {
  id: string;
  name: string;
  reductionPercent: number;
  chance: (stats: StatRecord, rank: number) => number | null;
  chanceRule: string;
  appliesTo: string;
}

// From each skill's wiki text; "only one parry takes effect at a time".
const PARRY_RULES: ParryRule[] = [
  { id: 'stalemate', name: 'Stalemate', reductionPercent: 50, chance: (s, rank) => s.def / 2 + (valueAtRank([5, 10, 15, 20, 25], rank) ?? 0), chanceRule: 'Half of scaled DEF + 5/10/15/20/25%', appliesTo: 'Sword, Axe, Spear and monster weapons; not spells' },
  { id: 'eviter', name: 'Eviter', reductionPercent: 50, chance: () => null, chanceRule: 'Parrying weapon durability (unbreakable = 40) + 5/10/15/20/25%', appliesTo: 'Sword, Axe, Spear and monster weapons; not spells' },
  { id: 'know-no-pain', name: 'Know No Pain', reductionPercent: 50, chance: s => 25 + s.def / 2, chanceRule: '25% + half of scaled DEF, in Matador Stance', appliesTo: 'Monster and non-ranged weapons, facing the attacker; not spells' },
  { id: 'bullet-barrier', name: 'Bullet Barrier', reductionPercent: 50, chance: s => 25 + s.gui / 2, chanceRule: '25% + half of scaled GUI, in Desperado Stance with a Gun', appliesTo: 'Guns and Bows; not spells' },
  { id: 'false-target', name: 'False Target', reductionPercent: 35, chance: s => 25 + Math.max(s.cel / 4, s.def / 2), chanceRule: '25% + higher of 25% CEL and 50% DEF (+15% under Genpo)', appliesTo: 'Physical damage' },
  { id: 'ice-point-guard', name: 'Ice Point Guard', reductionPercent: 30, chance: s => 30 + s.ski / 2, chanceRule: '30% + half of scaled SKI', appliesTo: 'Martial weapon attacks and skills' },
  { id: 'ring-of-pearls', name: 'Ring of Pearls', reductionPercent: 25, chance: s => 30 + s.ski / 2, chanceRule: '30% + half of scaled SKI', appliesTo: 'Swords, Axes, Spears and Fists' },
  { id: 'power-to-the-people', name: 'Power to the People', reductionPercent: 35, chance: () => null, chanceRule: '15% per Shadow Mosh in 1 Range, +25% for its owner', appliesTo: 'Enemy damage (50% reduction if the attacker is Confused)' },
];

/** The parry skills this build has ranked, with chances from its scaled stats. */
export function parryOptions(build: BuildState, evaluation: Pick<BuildEvaluation, 'scaledStats'>): ParryOption[] {
  const ranks = mergeSkillRanks(build.skillRanks);
  return PARRY_RULES.flatMap(rule => {
    const rank = ranks[rule.id] ?? 0;
    if (!rank) return [];
    const { chance, ...rest } = rule;
    return [{ ...rest, chance: chance(evaluation.scaledStats, rank) }];
  });
}

/** Situational chance bonuses the build owns: Yomidori and Mighty Wall. */
export function parryChanceBonuses(build: BuildState): Array<{ name: string; percent: number }> {
  const ranks = mergeSkillRanks(build.skillRanks);
  const bonuses = [
    { name: 'Yomidori (attacker already hit you this turn)', percent: valueAtRank([4, 7, 10], ranks.yomidori ?? 0) ?? 0 },
    { name: 'Mighty Wall (active)', percent: valueAtRank([3, 4, 5], ranks['mighty-wall'] ?? 0) ?? 0 },
  ];
  return bonuses.filter(bonus => bonus.percent > 0);
}
