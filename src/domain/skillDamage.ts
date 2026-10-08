/**
 * Converts ranked skills into the damage-profile shape the optimizer scores.
 *
 * The optimizer already models an attack as "x% of Scaled Weapon ATK plus y% of
 * one element's ATK" (`OptimizationDamageSkill`), which is exactly how the wiki
 * writes a skill's Power. That correspondence is the whole reason this file is
 * thin: it reads the per-rank percentages the build step already resolved and
 * hands them over, rather than reinterpreting anything.
 *
 * Terms the calculator cannot attribute are dropped from the scored total, never
 * guessed at. `unscoredTerms` reports them so a caller can say so out loud.
 */
import type { BuildEvaluation, ElementKey, OptimizationDamageSkill, Skill, SkillRanks } from '../types';
import { skillById, valueAtRank } from './skills';

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

/*
 * Re-exported rather than defined here: merging ranks is a property of the skill
 * sheet, not of damage, and `skills.ts` needs it to charge the shared point
 * budget. Kept on this path because callers already import it from here.
 */
export { mergeSkillRanks } from './skills';

export interface SkillDamageEntry extends OptimizationDamageSkill {
  skillId: string;
  rank: number;
  /**
   * Damage the wiki lists that the model leaves out. An element the calculator
   * has no key for, a flat bonus, or a stat term. Present so the caller can warn
   * that the modelled number is a floor, not the whole skill.
   */
  unscoredTerms: string[];
}

/**
 * Builds a damage entry for one skill at one rank.
 *
 * Returns null when the skill deals no modellable damage: a passive, a heal, or
 * a Power field that was prose rather than a formula.
 */
export function skillDamageAtRank(skill: Skill, rank: number): SkillDamageEntry | null {
  if (rank < 1 || !skill.scaling) return null;

  let swaPercent = 0;
  let element: ElementKey | null = null;
  let elementalAttackPercent = 0;
  const unscoredTerms: string[] = [];

  for (const term of skill.scaling) {
    const percent = valueAtRank(term.percentByRank, rank);
    if (percent == null) continue;

    if (term.source === 'weapon') {
      swaPercent += percent;
      continue;
    }

    if (term.source === 'element') {
      // A null element means a damage type with no calculator key (Darkness) or
      // one that depends on the equipped tome (Elemental). Either way it cannot
      // be scored against a specific elemental attack.
      if (!term.element) {
        unscoredTerms.push(`${percent}% ${term.label}`);
        continue;
      }
      // The model carries a single element. A second one is real damage, so it
      // is reported rather than folded into the first element's percentage.
      if (element && element !== term.element) {
        unscoredTerms.push(`${percent}% ${term.label}`);
        continue;
      }
      element = term.element;
      elementalAttackPercent += percent;
      continue;
    }

    // Flat damage, healing and raw stat terms have no percentage-of-attack
    // meaning in this model.
    unscoredTerms.push(`${percent}${term.source === 'stat' ? '%' : ''} ${term.label}`);
  }

  if (swaPercent === 0 && elementalAttackPercent === 0) return null;

  return {
    skillId: skill.id,
    rank,
    label: `${skill.name} (rank ${rank})`,
    swaPercent,
    element,
    elementalAttackPercent,
    weight: 1,
    unscoredTerms,
  };
}

/**
 * Damage entries for every ranked skill in a build, strongest first.
 *
 * `ranks` covers one class slot; pass both slots merged if a build should be
 * scored on everything it can cast.
 */
export function skillDamageProfile(ranks: SkillRanks): SkillDamageEntry[] {
  const entries: SkillDamageEntry[] = [];
  for (const [id, rank] of Object.entries(ranks)) {
    const skill = skillById(id);
    if (!skill) continue;
    const entry = skillDamageAtRank(skill, Math.min(rank, skill.maxRank));
    if (entry) entries.push(entry);
  }
  return entries.sort(
    (a, b) => b.swaPercent + b.elementalAttackPercent - (a.swaPercent + a.elementalAttackPercent),
  );
}
