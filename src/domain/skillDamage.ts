// Splits a skill's Power formula into weapon, element and stat terms for the skill card.
import type { BuildEvaluation, ElementKey, Skill } from '../types';
import { valueAtRank } from './skills';

export interface SkillFormulaTerm {
  label: string;
  coefficient: number;
  sourceValue: number | null;
  amount: number | null;
  flat: boolean;
  reason?: string;
}

export function skillFormulaBreakdown(
  skill: Skill,
  rank: number,
  evaluation: Pick<BuildEvaluation, 'scaledStats' | 'elementalAttack' | 'primaryWeapon'>,
  elements: Partial<Record<number, ElementKey>> = {},
  powerRaw?: string | null,
) {
  if (rank < 1 || !skill.scaling?.length) return null;
  if (skill.category !== 'Offensive' && powerRaw?.trim().startsWith('+')) return null;
  const terms = skill.scaling.map((term, index): SkillFormulaTerm => {
    const coefficient = valueAtRank(term.percentByRank, Math.min(rank, skill.maxRank)) ?? 0;
    const flat = term.source === 'flat' || term.source === 'heal';
    let label = term.label;
    let sourceValue: number | null = null;
    let reason: string | undefined;
    if (flat) sourceValue = coefficient;
    else if (term.source === 'weapon') {
      sourceValue = evaluation.primaryWeapon?.swa ?? null;
      if (sourceValue === null) reason = 'Equip a main-hand weapon.';
    } else if (term.source === 'stat') {
      if (term.stat) {
        sourceValue = evaluation.scaledStats[term.stat];
        label = `Scaled ${term.stat.toUpperCase()}`;
      } else reason = 'No attribute is specified.';
    } else if (term.source === 'element') {
      const selected = elements[index];
      const element = term.alternateElement
        ? (selected === term.element || selected === term.alternateElement ? selected : null)
        : term.element ?? selected;
      if (element && element in evaluation.elementalAttack) {
        sourceValue = evaluation.elementalAttack[element];
        label = `${element} ATK`;
      } else reason = 'Choose the element used by this skill.';
    }
    return { label, coefficient, sourceValue, amount: sourceValue === null ? null : flat ? sourceValue : sourceValue * coefficient / 100, flat, reason };
  });
  return {
    terms,
    subtotal: terms.reduce((sum, term) => sum + (term.amount ?? 0), 0),
    complete: terms.every(term => term.amount !== null),
  };
}
