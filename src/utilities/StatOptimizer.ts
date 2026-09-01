import type {
  BuildEvaluation,
  BuildState,
  OptimizationCandidate,
  OptimizationMetric,
  OptimizationPreset,
  OptimizationRequest,
  OptimizationResult,
  StatKey,
  StatRecord,
} from '../types';
import { CLASSES } from '../data/classes';
import { BUILD_TYPES } from '../data/stats';
import { OPTIMIZER_REFERENCE_PROFILE_BY_ID } from '../data/optimizerProfiles';
import { evaluateBuild, getBaseClass, clampPassiveRank, metricValue, STAT_KEYS } from '../domain/buildEvaluation';
import { scoreBuildGuideBaselines, validateBuildAgainstGuide } from '../domain/buildGuide';

const emptyStats = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });

const metricScale: Record<OptimizationMetric, number> = {
  str: 60, wil: 60, ski: 60, cel: 60, def: 60, res: 60, vit: 60, fai: 60, luc: 60, gui: 60, san: 60, apt: 42,
  maxHP: 900, fp: 450, physicalDefense: 50, magicalDefense: 50, evade: 130, criticalEvade: 100,
  armor: 10, magicArmor: 10, equipmentLoad: 50, battleWeightRemaining: 50,
  statusInfliction: 170, statusResistance: 170, initiative: 60, youkaiCap: 12, flanking: 40,
  luckStatusPercent: 30,
  skillPool: 40, battleWeight: 70, encumbrance: 130, weaponHit: 200,
  /*
   * Power and SWA are scaled apart because they are different magnitudes now.
   * Measured on a level-60 build: base Power tops out at 30 in the data and ~42
   * with upgrades and a power quality, while SWA reaches ~96 on a plain weapon at
   * full scaling investment and ~120 on the strongest. One shared scale of 100 was
   * calibrated for the old conflated field, and left Power saturating near zero
   * while SWA could never score above a third.
   */
  weaponPower: 50, weaponSwa: 120,
  weaponCritical: 120, weaponCriticalDamage: 220,
  fireAttack: 100, iceAttack: 100, windAttack: 100, earthAttack: 100, darkAttack: 100,
  waterAttack: 100, lightAttack: 100, lightningAttack: 100, acidAttack: 100, soundAttack: 100,
};

const compatibilityFor = (id: string) => BUILD_TYPES[id]?.classCompatibility ?? {};

export const OPTIMIZATION_PRESETS: Record<string, OptimizationPreset> = {
  hybrid: {
    id: 'hybrid', name: 'Balanced Hybrid', description: 'Balanced weapon reliability, durability, and utility.',
    metricWeights: { weaponSwa: 6, weaponHit: 5, maxHP: 5, fp: 3, physicalDefense: 4, magicalDefense: 4, armor: 2, magicArmor: 2, evade: 3, skillPool: 2 },
    classCompatibility: compatibilityFor('hybrid'),
  },
  tank: {
    id: 'tank', name: 'Defense Tank', description: 'Prioritizes HP, physical and magical defense, and status resilience.',
    metricWeights: { maxHP: 9, physicalDefense: 10, magicalDefense: 10, armor: 7, magicArmor: 7, statusResistance: 6, criticalEvade: 4, weaponHit: 3 },
    classCompatibility: compatibilityFor('tank'),
  },
  evade: {
    id: 'evade', name: 'Evade', description: 'Prioritizes Evade, initiative, Hit, and reliable offense.',
    metricWeights: { evade: 10, initiative: 5, weaponHit: 7, weaponSwa: 5, weaponCritical: 5, maxHP: 3 },
    classCompatibility: compatibilityFor('evade'),
  },
  glass_cannon: {
    id: 'glass_cannon', name: 'Glass Cannon', description: 'Maximizes weapon output, Hit, and critical pressure.',
    metricWeights: { weaponSwa: 10, weaponHit: 8, weaponCritical: 8, weaponCriticalDamage: 6, statusInfliction: 3, fp: 3 },
    classCompatibility: compatibilityFor('glass_cannon'),
  },
  support: {
    id: 'support', name: 'Support / Healer', description: 'Prioritizes FP, skill capacity, status reliability, and survival.',
    metricWeights: { fp: 10, skillPool: 7, statusResistance: 8, statusInfliction: 5, maxHP: 5, magicalDefense: 4, youkaiCap: 3 },
    classCompatibility: compatibilityFor('support'),
  },
  critical: {
    id: 'critical', name: 'Critical Focus', description: 'Prioritizes critical chance, critical damage, Hit, and weapon power.',
    metricWeights: { weaponCritical: 10, weaponCriticalDamage: 9, weaponHit: 7, weaponSwa: 7, evade: 3 },
    classCompatibility: compatibilityFor('critical'),
  },
  /*
   * The one preset whose score is not content-agnostic: choosing it turns on
   * the opponent gauntlet in V2, so candidates are additionally ranked on their
   * margins into the community reference builds read as opponents. The weights
   * here still matter (they steer the legacy engine and the preset-utility
   * term), but the gauntlet is what makes this goal mean "against players".
   */
  pvp: {
    id: 'pvp', name: 'PvP Gauntlet', description: 'Practical duel performance, scored against the community reference builds as opponents.',
    metricWeights: { weaponHit: 8, evade: 6, weaponSwa: 6, statusResistance: 6, maxHP: 5, physicalDefense: 4, magicalDefense: 4, criticalEvade: 4, fp: 3 },
    classCompatibility: compatibilityFor('pvp'),
  },
};

interface ScoredEvaluation {
  evaluation: BuildEvaluation;
  utility: number;
  deficitTotal: number;
  deficitCount: number;
  deficits: Partial<Record<OptimizationMetric, number>>;
  guideScore: ReturnType<typeof scoreBuildGuideBaselines>;
}

interface PairSeed {
  mainClass: string;
  subClass: string;
  mainRank: number;
  subRank: number;
  preScore: number;
}

export interface OptimizationProgress {
  completed: number;
  total: number;
  message: string;
}

export interface OptimizationControl {
  isCancelled?: () => boolean;
  onProgress?: (progress: OptimizationProgress) => void;
}

function buildForPair(request: OptimizationRequest, mainClass: string, subClass: string, allocation: StatRecord): BuildState {
  const mainRank = clampPassiveRank(mainClass, request.assumedMainPassiveRank);
  const subRank = mainClass === subClass ? 0 : clampPassiveRank(subClass, request.assumedSubPassiveRank);
  return {
    ...request.build,
    mainClass,
    subClass,
    selectedMainBaseClass: getBaseClass(mainClass),
    selectedSubBaseClass: getBaseClass(subClass),
    mainClassPassive: mainRank,
    subClassPassive: subRank,
    addedStats: allocation,
  };
}

function referenceProfileFor(request: OptimizationRequest) {
  const profile = request.referenceProfileId ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[request.referenceProfileId] : undefined;
  return profile?.enabled ? profile : undefined;
}

function scoreEvaluation(evaluation: BuildEvaluation, request: OptimizationRequest, mainClass: string, subClass: string): ScoredEvaluation {
  let utility = 0;
  for (const [metric, weight] of Object.entries(request.preset.metricWeights)) {
    utility += metricValue(evaluation, metric as OptimizationMetric) / metricScale[metric as OptimizationMetric] * (weight ?? 0);
  }
  const profile = referenceProfileFor(request);
  if (profile) {
    const priorityStats = new Set(profile.priorityStats);
    for (const [stat, target] of Object.entries(profile.scaledStatTargets)) {
      if (typeof target !== 'number' || target <= 0) continue;
      const progress = Math.min(evaluation.scaledStats[stat as StatKey], target) / target;
      utility += progress * (priorityStats.has(stat as StatKey) ? 2.5 : 0.35);
    }
    if (mainClass === profile.primaryClass) utility += 2;
    if (subClass === profile.secondaryClass) utility += 6;
  }
  const deficits: Partial<Record<OptimizationMetric, number>> = {};
  let deficitTotal = 0;
  let deficitCount = 0;
  for (const constraint of request.constraints) {
    const deficit = Math.max(0, constraint.minimum - metricValue(evaluation, constraint.metric));
    if (deficit > 0) {
      deficits[constraint.metric] = deficit;
      deficitTotal += deficit / Math.max(1, constraint.minimum, metricScale[constraint.metric]);
      deficitCount++;
    }
  }
  const guideBuild = buildForPair(request, mainClass, subClass, emptyStats());
  const guideScore = scoreBuildGuideBaselines(guideBuild, evaluation, request.preset);
  return { evaluation, utility, deficitTotal, deficitCount, deficits, guideScore };
}

function betterScore(a: ScoredEvaluation, b: ScoredEvaluation): boolean {
  if (a.deficitCount !== b.deficitCount) return a.deficitCount < b.deficitCount;
  if (Math.abs(a.deficitTotal - b.deficitTotal) > 1e-9) return a.deficitTotal < b.deficitTotal;
  if (a.guideScore.failed !== b.guideScore.failed) return a.guideScore.failed < b.guideScore.failed;
  if (Math.abs(a.guideScore.supportedDeficit - b.guideScore.supportedDeficit) > 1e-9) return a.guideScore.supportedDeficit < b.guideScore.supportedDeficit;
  return a.utility > b.utility + 1e-9;
}

export function normalizeWeaponCategory(weaponType?: string): string | null {
  if (!weaponType) return null;
  return ({ Sword: 'Swords', Axe: 'Axes', Bow: 'Bows', Dagger: 'Daggers', Fist: 'Fist', Gun: 'Guns', Polearm: 'Spears', Spear: 'Spears', Tome: 'Tomes' } as Record<string, string>)[weaponType] ?? null;
}

function classPrior(mainClass: string, subClass: string, request: OptimizationRequest, baseline: BuildEvaluation): number {
  const compatibility = request.preset.classCompatibility ?? {};
  let score = ((compatibility[mainClass] ?? 5) * 0.025) + ((compatibility[subClass] ?? 5) * 0.01);
  const weaponCategory = normalizeWeaponCategory(request.build.equipment.primaryWeapon?.weaponType);
  if (weaponCategory) {
    if (CLASSES[mainClass]?.validWeapons?.includes(weaponCategory)) score += 0.35;
    if (CLASSES[subClass]?.validWeapons?.includes(weaponCategory)) score += 0.15;
  }
  for (const [metric, weight] of Object.entries(request.preset.metricWeights)) {
    score += metricValue(baseline, metric as OptimizationMetric) / metricScale[metric as OptimizationMetric] * (weight ?? 0);
  }
  const profile = referenceProfileFor(request);
  if (profile) {
    if (mainClass === profile.primaryClass) score += 5;
    if (subClass === profile.secondaryClass) score += 10;
  }
  return score;
}

function enumeratePairs(request: OptimizationRequest): PairSeed[] {
  const lockedPrimaryClass = request.primaryClass && CLASSES[request.primaryClass] ? request.primaryClass : null;
  const classes = lockedPrimaryClass
    ? [lockedPrimaryClass]
    : request.searchClasses ? Object.keys(CLASSES).sort() : [request.build.mainClass];
  const subClasses = request.searchClasses ? Object.keys(CLASSES).sort() : [request.build.subClass];
  const seeds: PairSeed[] = [];
  for (const mainClass of classes) {
    for (const subClass of subClasses) {
      const mainRank = clampPassiveRank(mainClass, request.assumedMainPassiveRank);
      const subRank = mainClass === subClass ? 0 : clampPassiveRank(subClass, request.assumedSubPassiveRank);
      const baselineBuild = buildForPair(request, mainClass, subClass, emptyStats());
      const baseline = evaluateBuild(baselineBuild);
      seeds.push({ mainClass, subClass, mainRank, subRank, preScore: classPrior(mainClass, subClass, request, baseline) });
    }
  }
  return seeds.sort((a, b) => b.preScore - a.preScore || a.mainClass.localeCompare(b.mainClass) || a.subClass.localeCompare(b.subClass));
}

function allocateForPair(request: OptimizationRequest, seed: PairSeed): { build: BuildState; scored: ScoredEvaluation } {
  const allocation = emptyStats();
  let build = buildForPair(request, seed.mainClass, seed.subClass, allocation);
  let evaluation = evaluateBuild(build);
  const budget = evaluation.pointBudget;
  for (let point = 0; point < budget; point++) {
    let bestStat: StatKey | null = null;
    let best: ScoredEvaluation | null = null;
    for (const stat of STAT_KEYS) {
      if (allocation[stat] >= evaluation.maxInvestedStats[stat]) continue;
      const candidateAllocation = { ...allocation, [stat]: allocation[stat] + 1 };
      const candidateBuild = buildForPair(request, seed.mainClass, seed.subClass, candidateAllocation);
      const scored = scoreEvaluation(evaluateBuild(candidateBuild), request, seed.mainClass, seed.subClass);
      if (!best || betterScore(scored, best) || (!betterScore(best, scored) && stat.localeCompare(bestStat ?? stat) < 0)) {
        best = scored;
        bestStat = stat;
      }
    }
    if (!bestStat || !best) break;
    allocation[bestStat]++;
    evaluation = best.evaluation;
    build = buildForPair(request, seed.mainClass, seed.subClass, allocation);
  }
  return { build, scored: scoreEvaluation(evaluation, request, seed.mainClass, seed.subClass) };
}

function refine(request: OptimizationRequest, item: { build: BuildState; scored: ScoredEvaluation }): { build: BuildState; scored: ScoredEvaluation } {
  let build = item.build;
  let scored = item.scored;
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    outer: for (const from of STAT_KEYS) {
      if (build.addedStats[from] <= 0) continue;
      for (const to of STAT_KEYS) {
        if (from === to || build.addedStats[to] >= scored.evaluation.maxInvestedStats[to]) continue;
        const allocation = { ...build.addedStats, [from]: build.addedStats[from] - 1, [to]: build.addedStats[to] + 1 };
        const candidateBuild = { ...build, addedStats: allocation };
        const candidate = scoreEvaluation(evaluateBuild(candidateBuild), request, build.mainClass, build.subClass);
        if (betterScore(candidate, scored)) {
          build = candidateBuild;
          scored = candidate;
          improved = true;
          break outer;
        }
      }
    }
    if (!improved) break;
  }
  return { build, scored };
}

function candidateFrom(request: OptimizationRequest, item: { build: BuildState; scored: ScoredEvaluation }, index: number): OptimizationCandidate {
  const { build, scored } = item;
  const guideValidation = validateBuildAgainstGuide(build, scored.evaluation, request.preset);
  const weighted = Object.entries(request.preset.metricWeights)
    .map(([metric, weight]) => ({ metric: metric as OptimizationMetric, weight: weight ?? 0, value: metricValue(scored.evaluation, metric as OptimizationMetric) }))
    .sort((a, b) => b.weight - a.weight || b.value - a.value)
    .slice(0, 3);
  const weaponCategory = normalizeWeaponCategory(build.equipment.primaryWeapon?.weaponType);
  const warnings: string[] = [];
  const profile = referenceProfileFor(request);
  if (scored.deficitCount) warnings.push(`${scored.deficitCount} minimum constraint${scored.deficitCount === 1 ? '' : 's'} could not be met.`);
  // Main class only: a subclass's weapon list grants no proficiency, so a
  // category present there alone is still one this build cannot hold for free.
  if (weaponCategory && !CLASSES[build.mainClass]?.validWeapons?.includes(weaponCategory)) {
    warnings.push(`The equipped ${weaponCategory} category is not listed for ${build.mainClass}, and only the main class grants weapons.`);
  }
  if (profile && (request.build.race !== profile.race || request.build.subrace !== profile.subrace)) {
    warnings.push(`Reference profile used ${profile.race} / ${profile.subrace}; this result keeps the current ${request.build.race} / ${request.build.subrace}.`);
  }
  if (guideValidation.failed) {
    warnings.push(`${guideValidation.failed} supported SL2BuildInfo baseline check${guideValidation.failed === 1 ? '' : 's'} did not pass.`);
  }
  return {
    id: `${build.mainClass}::${build.subClass}::${index}`,
    patch: {
      mainClass: build.mainClass,
      subClass: build.subClass,
      selectedMainBaseClass: getBaseClass(build.mainClass),
      selectedSubBaseClass: getBaseClass(build.subClass),
      mainClassPassive: build.mainClassPassive,
      subClassPassive: build.subClassPassive,
      addedStats: { ...build.addedStats },
    },
    evaluation: scored.evaluation,
    score: scored.utility,
    constraintDeficits: scored.deficits,
    feasible: scored.deficitCount === 0,
    guideValidation,
    reasoning: [
      `Uses ${build.mainClass} / ${build.subClass} with ${scored.evaluation.pointsSpent}/${scored.evaluation.pointBudget} invested points.`,
      ...(request.primaryClass ? [`Keeps ${request.primaryClass} in the primary class slot.`] : []),
      ...(profile ? [`Uses “${profile.name}” as a soft stat-shape and ${profile.primaryClass} / ${profile.secondaryClass} pairing prior. Class skills are not directly simulated.`] : []),
      `SL2BuildInfo validation: ${guideValidation.passed} pass, ${guideValidation.failed} fail, ${guideValidation.requiresVerification} require verification.`,
      ...weighted.map(item => `${item.metric}: ${Math.round(item.value)} (preset priority ${item.weight}/10).`),
      'Class scoring uses structured stats, passives, weapon access, and preset compatibility; class skill behavior is not modeled.',
    ],
    warnings,
  };
}

function rankItems(a: { build: BuildState; scored: ScoredEvaluation }, b: { build: BuildState; scored: ScoredEvaluation }): number {
  if (a.scored.deficitCount !== b.scored.deficitCount) return a.scored.deficitCount - b.scored.deficitCount;
  if (Math.abs(a.scored.deficitTotal - b.scored.deficitTotal) > 1e-9) return a.scored.deficitTotal - b.scored.deficitTotal;
  if (a.scored.guideScore.failed !== b.scored.guideScore.failed) return a.scored.guideScore.failed - b.scored.guideScore.failed;
  if (Math.abs(a.scored.guideScore.supportedDeficit - b.scored.guideScore.supportedDeficit) > 1e-9) return a.scored.guideScore.supportedDeficit - b.scored.guideScore.supportedDeficit;
  if (Math.abs(a.scored.utility - b.scored.utility) > 1e-9) return b.scored.utility - a.scored.utility;
  return a.build.mainClass.localeCompare(b.build.mainClass) || a.build.subClass.localeCompare(b.build.subClass);
}

export function optimizeBuild(request: OptimizationRequest, control: OptimizationControl = {}): OptimizationResult {
  const started = performance.now();
  const allPairs = enumeratePairs(request);
  // Full allocation is expensive because it uses the exact build evaluator. A deterministic
  // class-only pass narrows the 1,600 ordered pairs before exact marginal allocation.
  const finalists = allPairs.slice(0, request.searchClasses ? (request.primaryClass ? allPairs.length : 36) : 1);
  const results: Array<{ build: BuildState; scored: ScoredEvaluation }> = [];
  finalists.forEach((seed, index) => {
    if (control.isCancelled?.()) return;
    results.push(allocateForPair(request, seed));
    control.onProgress?.({ completed: index + 1, total: finalists.length, message: `Evaluating ${seed.mainClass} / ${seed.subClass}` });
  });
  results.sort(rankItems);
  const refineCount = Math.min(12, results.length);
  for (let index = 0; index < refineCount; index++) {
    if (control.isCancelled?.()) break;
    results[index] = refine(request, results[index]);
  }
  results.sort(rankItems);
  const limit = Math.max(1, request.resultLimit ?? 3);
  return {
    candidates: results.slice(0, limit).map((item, index) => candidateFrom(request, item, index)),
    pointBudget: request.build.characterLevel * 4,
    evaluatedClassPairs: allPairs.length,
    durationMs: performance.now() - started,
  };
}

export class StatOptimizer {
  constructor(private readonly request: OptimizationRequest) {}
  optimize(control?: OptimizationControl): OptimizationResult {
    return optimizeBuild(this.request, control);
  }
}
