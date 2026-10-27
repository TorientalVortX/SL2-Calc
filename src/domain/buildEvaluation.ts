import type { BuildEvaluation, BuildState } from '../types';
import { CLASS_HIERARCHY } from '../data/classes';
import { gatherInputs } from './evaluation/inputs';
import { resolveStats } from './evaluation/stats';
import { resolveVitals } from './evaluation/vitals';
import { resolveElements } from './evaluation/elements';
import { resolveOffense } from './evaluation/offense';
import { resolveEvade } from './evaluation/defense';
import { resolveDerived } from './evaluation/derived';
import { statProvenance } from './evaluation/provenance';

export { STAT_KEYS, ELEMENT_KEYS } from './evaluation/shared';
export { evaluateWeaponSlot } from './evaluation/offense';

export function getBaseClass(className: string): string {
  return Object.entries(CLASS_HIERARCHY).find(([, family]) => family.name === className || family.subClasses.includes(className))?.[0] ?? className;
}

export function evaluateBuild(build: BuildState, includeStatSources = false): BuildEvaluation {
  const inputs = gatherInputs(build);
  const stats = resolveStats(inputs);
  const vitals = resolveVitals(inputs, stats);
  const elements = resolveElements(inputs, stats);
  const offense = resolveOffense(inputs, stats);
  const defense = resolveEvade(inputs, stats);
  const derived = resolveDerived(inputs, stats, vitals, offense, defense);

  return {
    ...(includeStatSources ? { statSources: statProvenance(inputs, stats) } : {}),
    rawStats: stats.rawStats,
    scaledStats: stats.scaledStats,
    maxInvestedStats: stats.maxInvestedStats,
    pointsSpent: vitals.pointsSpent,
    pointBudget: Math.max(0, build.characterLevel * 4),
    derived,
    elementalAttack: elements.elementalAttack,
    elementalResistance: elements.elementalResistance,
    physicalResistance: elements.physicalResistance,
    sources: { hit: offense.hitSources, evade: defense.evadeSources, fp: vitals.fpSources },
    primaryWeapon: offense.primaryWeapon,
    offHandWeapon: offense.offHandWeapon,
    unarmedWeapon: offense.unarmedWeapon,
    spellPower: spellPowerBySchool(inputs.items.derived),
  };
}

function spellPowerBySchool(derived: Record<string, number>): BuildEvaluation['spellPower'] {
  const bySchool: BuildEvaluation['spellPower'] = {};
  for (const [key, amount] of Object.entries(derived)) {
    const [kind, school] = key.split(':');
    if (!school || (kind !== 'spellPower' && kind !== 'spellFlatPower')) continue;
    const entry = bySchool[school] ?? { percent: 0, flat: 0 };
    if (kind === 'spellPower') entry.percent += amount;
    else entry.flat += amount;
    bySchool[school] = entry;
  }
  return bySchool;
}
