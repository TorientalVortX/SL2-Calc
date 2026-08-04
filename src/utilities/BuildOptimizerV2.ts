import type {
  Armor,
  BuildEvaluation,
  BuildGuideValidation,
  BuildState,
  OptimizationCandidate,
  OptimizationConstraint,
  OptimizationDefensePlan,
  OptimizationExtraPackage,
  OptimizationMetric,
  OptimizationObjectives,
  OptimizationReferenceProfile,
  OptimizationRequest,
  OptimizationResult,
  StatKey,
  StatRecord,
  Weapon,
} from '../types';
import { ARMORS } from '../data/armors';
import { CLASSES } from '../data/classes';
import { ALL_WEAPONS } from '../data/weapons';
import { CLASS_PAIR_EVIDENCE } from '../data/optimizerKnowledge';
import { OPTIMIZER_REFERENCE_PROFILE_BY_ID } from '../data/optimizerProfiles';
import { clampPassiveRank, evaluateBuild, getBaseClass, metricValue, STAT_KEYS } from '../domain/buildEvaluation';
import { validateBuildAgainstGuide } from '../domain/buildGuide';
import { effectiveWeaponType, findWeaponByName, weaponToConfig } from '../domain/equipment';
import type { OptimizationControl, OptimizationProgress } from './StatOptimizer';

const emptyStats = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });

const metricScale: Record<OptimizationMetric, number> = {
  str: 60, wil: 60, ski: 60, cel: 60, def: 60, res: 60, vit: 60, fai: 60, luc: 60, gui: 60, san: 60, apt: 48,
  maxHP: 900, fp: 450, physicalDefense: 50, magicalDefense: 50, evade: 200, criticalEvade: 100,
  statusInfliction: 170, statusResistance: 170, initiative: 60, youkaiCap: 12, flanking: 40,
  skillPool: 40, battleWeight: 70, encumbrance: 130, weaponPower: 100, weaponHit: 200,
  weaponCritical: 120, weaponCriticalDamage: 220,
};

interface SearchSeed {
  subClass: string;
  weapon: Weapon;
  preScore: number;
  evidence: string[];
}

interface ScoredBuild {
  build: BuildState;
  evaluation: BuildEvaluation;
  objectives: OptimizationObjectives;
  deficits: Partial<Record<OptimizationMetric, number>>;
  deficitCount: number;
  deficitTotal: number;
  scalar: number;
  evidence: string[];
}

interface SearchBudget {
  seedLimit: number;
  beamWidth: number;
  armorsPerSeed: number;
  refinePasses: number;
}

const budgets: Record<'standard' | 'deep', SearchBudget> = {
  standard: { seedLimit: 24, beamWidth: 6, armorsPerSeed: 2, refinePasses: 2 },
  deep: { seedLimit: 48, beamWidth: 10, armorsPerSeed: 3, refinePasses: 4 },
};

function referenceProfile(request: OptimizationRequest): OptimizationReferenceProfile | undefined {
  const profile = request.referenceProfileId ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[request.referenceProfileId] : undefined;
  return profile?.enabled ? profile : undefined;
}

function normalizeCategory(type: string): string {
  return ({ Sword: 'Swords', Axe: 'Axes', Bow: 'Bows', Dagger: 'Daggers', Fist: 'Fist', Gun: 'Guns', Polearm: 'Spears', Spear: 'Spears', Tome: 'Tomes' } as Record<string, string>)[type] ?? type;
}

function weaponCandidates(request: OptimizationRequest): Weapon[] {
  const locked = request.locks?.weaponName ? findWeaponByName(request.locks.weaponName) : undefined;
  if (locked) return [locked];
  const type = request.locks?.weaponType;
  return ALL_WEAPONS.filter(weapon => !type || weapon.weaponType === type).sort((a, b) => a.id.localeCompare(b.id));
}

function armorCandidates(request: OptimizationRequest): Armor[] {
  if (request.locks?.armorName) {
    const armor = ARMORS[request.locks.armorName];
    return armor ? [armor] : [];
  }
  return Object.values(ARMORS)
    .filter(armor => !request.locks?.armorType || armor.type === request.locks.armorType)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function subClassCandidates(request: OptimizationRequest): string[] {
  if (request.locks?.subClass && CLASSES[request.locks.subClass]) return [request.locks.subClass];
  return request.searchClasses ? Object.keys(CLASSES).sort() : [request.build.subClass];
}

function buildCandidate(request: OptimizationRequest, subClass: string, weapon: Weapon, allocation: StatRecord, armorName: string | null): BuildState {
  const profile = referenceProfile(request);
  const useProfileWeapon = profile?.weapon.name === weapon.name;
  const locks = request.locks;
  const lockedCurrentWeapon = locks?.weaponName === request.build.equipment.primaryWeapon?.selectedWeaponName
    && locks?.weaponName === weapon.name
    ? request.build.equipment.primaryWeapon
    : undefined;
  const lockedCurrentArmor = locks?.armorName === request.build.equipment.armorName && locks?.armorName === armorName;
  return {
    ...request.build,
    mainClass: request.build.mainClass,
    subClass,
    selectedMainBaseClass: getBaseClass(request.build.mainClass),
    selectedSubBaseClass: getBaseClass(subClass),
    mainClassPassive: clampPassiveRank(request.build.mainClass, request.assumedMainPassiveRank),
    subClassPassive: request.build.mainClass === subClass ? 0 : clampPassiveRank(subClass, request.assumedSubPassiveRank),
    addedStats: allocation,
    equipment: {
      armorName,
      armorConditionalBonuses: lockedCurrentArmor ? { ...request.build.equipment.armorConditionalBonuses } : {},
      primaryWeapon: lockedCurrentWeapon ? { ...lockedCurrentWeapon, customScaling: { ...lockedCurrentWeapon.customScaling } } : weaponToConfig(weapon, useProfileWeapon ? {
        effectiveType: profile.weapon.effectiveType,
        scalingOverride: profile.weapon.scaling,
        requiredEnchantment: profile.requiredWeaponEnchantment,
      } : {}),
    },
  };
}

function constraintState(evaluation: BuildEvaluation, constraints: OptimizationConstraint[]) {
  const deficits: Partial<Record<OptimizationMetric, number>> = {};
  let deficitTotal = 0;
  for (const constraint of constraints) {
    const deficit = Math.max(0, constraint.minimum - metricValue(evaluation, constraint.metric));
    if (deficit > 0) {
      deficits[constraint.metric] = deficit;
      deficitTotal += deficit / Math.max(1, constraint.minimum, metricScale[constraint.metric]);
    }
  }
  return { deficits, deficitCount: Object.keys(deficits).length, deficitTotal };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function profileFit(evaluation: BuildEvaluation, profile?: OptimizationReferenceProfile): number {
  if (!profile) return 0;
  const targets = Object.entries(profile.scaledStatTargets).filter((entry): entry is [StatKey, number] => typeof entry[1] === 'number' && entry[1] > 0);
  if (!targets.length) return 0;
  const priority = new Set(profile.priorityStats);
  let weightTotal = 0;
  let score = 0;
  for (const [stat, target] of targets) {
    const weight = priority.has(stat) ? 2 : 0.5;
    weightTotal += weight;
    score += clamp01(1 - Math.abs(evaluation.scaledStats[stat] - target) / Math.max(10, target)) * weight;
  }
  return score / weightTotal;
}

function guideFit(evaluation: BuildEvaluation, profile?: OptimizationReferenceProfile): number {
  const aptTarget = profile?.scaledStatTargets.apt ?? 48;
  const skiTarget = profile?.scaledStatTargets.ski ?? 57;
  const vitTarget = profile?.scaledStatTargets.vit ?? 35;
  const apt = clamp01(1 - Math.abs(evaluation.scaledStats.apt - aptTarget) / Math.max(10, aptTarget));
  const ski = clamp01(evaluation.scaledStats.ski / Math.max(1, skiTarget));
  const vit = clamp01(evaluation.rawStats.vit / Math.max(1, vitTarget));
  return (apt + ski + vit) / 3;
}

function objectiveState(evaluation: BuildEvaluation, request: OptimizationRequest, profile?: OptimizationReferenceProfile): OptimizationObjectives {
  const weapon = evaluation.primaryWeapon;
  const plan: OptimizationDefensePlan = request.defensePlan ?? 'auto';
  const extra: OptimizationExtraPackage = request.extraPackage ?? 'auto';
  const offense = clamp01(((weapon?.power ?? 0) / 120 + (weapon?.criticalDamage ?? 0) / 260) / 2);
  const accuracy = clamp01(((weapon?.hit ?? 0) / 220 + evaluation.scaledStats.ski / 70) / 2);
  const tank = (evaluation.derived.maxHP / 1000 + evaluation.derived.physicalDefense / 60 + evaluation.derived.magicalDefense / 60) / 3;
  const evade = (evaluation.derived.evade / 210 + evaluation.derived.initiative / 70) / 2;
  const durability = clamp01(plan === 'evade' ? evade : plan === 'tank' ? tank : (tank + evade) / 2);
  const sustain = clamp01((evaluation.derived.fp / 450 + evaluation.derived.statusResistance / 180 + evaluation.derived.skillPool / 45) / 3);
  const criticalUtility = ((weapon?.critical ?? 0) / 130 + evaluation.scaledStats.luc / 65 + evaluation.scaledStats.gui / 65) / 3;
  const faithUtility = (evaluation.scaledStats.fai / 65 + evaluation.derived.youkaiCap / 12 + evaluation.derived.fp / 450) / 3;
  const sanctityUtility = (evaluation.scaledStats.san / 65 + evaluation.derived.statusResistance / 180) / 2;
  const generalUtility = (evaluation.derived.statusInfliction / 180 + evaluation.derived.skillPool / 45 + evaluation.derived.flanking / 45) / 3;
  const utility = clamp01(extra === 'critical' ? criticalUtility : extra === 'faith' ? faithUtility : extra === 'sanctity' ? sanctityUtility : generalUtility);
  return { offense, accuracy, durability, sustain, utility, guideFit: guideFit(evaluation, profile), profileFit: profileFit(evaluation, profile) };
}

function presetUtility(evaluation: BuildEvaluation, request: OptimizationRequest): number {
  return Object.entries(request.preset.metricWeights).reduce((sum, [metric, weight]) => {
    return sum + metricValue(evaluation, metric as OptimizationMetric) / metricScale[metric as OptimizationMetric] * (weight ?? 0) / 10;
  }, 0);
}

function scoreBuild(build: BuildState, request: OptimizationRequest, evidence: string[] = []): ScoredBuild {
  const evaluation = evaluateBuild(build);
  const profile = referenceProfile(request);
  const constraints = constraintState(evaluation, request.constraints);
  const objectives = objectiveState(evaluation, request, profile);
  const pairBonus = profile && build.subClass === profile.secondaryClass ? 0.35 : 0;
  const evidenceBonus = CLASS_PAIR_EVIDENCE[`${build.mainClass}::${build.subClass}`] ? 0.08 : 0;
  const profileWeight = profile ? 7 : 0;
  const scalar = -constraints.deficitCount * 100 - constraints.deficitTotal * 20
    + presetUtility(evaluation, request)
    + objectives.offense * 1.5 + objectives.accuracy * 1.5 + objectives.durability * 1.5
    + objectives.sustain + objectives.utility + objectives.guideFit * (profile ? 2.5 : 1.25) + objectives.profileFit * profileWeight
    + pairBonus + evidenceBonus;
  return { build, evaluation, objectives, ...constraints, scalar, evidence };
}

function dominates(a: ScoredBuild, b: ScoredBuild): boolean {
  if (a.deficitCount > b.deficitCount || a.deficitTotal > b.deficitTotal + 1e-9) return false;
  const aValues = Object.values(a.objectives);
  const bValues = Object.values(b.objectives);
  const noWorse = aValues.every((value, index) => value + 1e-9 >= bValues[index]);
  const better = a.deficitCount < b.deficitCount || a.deficitTotal + 1e-9 < b.deficitTotal
    || aValues.some((value, index) => value > bValues[index] + 1e-9);
  return noWorse && better;
}

function selectPareto(items: ScoredBuild[], limit: number): ScoredBuild[] {
  const frontier = items.filter((item, index) => !items.some((other, otherIndex) => otherIndex !== index && dominates(other, item)));
  const pool = frontier.length >= limit ? frontier : [...frontier, ...items.filter(item => !frontier.includes(item))];
  return pool.sort((a, b) => b.scalar - a.scalar || allocationKey(a.build.addedStats).localeCompare(allocationKey(b.build.addedStats))).slice(0, limit);
}

function allocationKey(allocation: StatRecord): string {
  return STAT_KEYS.map(stat => allocation[stat]).join(',');
}

function seedPreScore(request: OptimizationRequest, subClass: string, weapon: Weapon): SearchSeed {
  const profile = referenceProfile(request);
  const config = weaponToConfig(weapon, profile?.weapon.name === weapon.name ? {
    effectiveType: profile.weapon.effectiveType,
    scalingOverride: profile.weapon.scaling,
    requiredEnchantment: profile.requiredWeaponEnchantment,
  } : {});
  const category = normalizeCategory(effectiveWeaponType(config) ?? weapon.weaponType);
  const mainAccess = CLASSES[request.build.mainClass]?.validWeapons?.includes(category) ?? false;
  const subAccess = CLASSES[subClass]?.validWeapons?.includes(category) ?? false;
  const compatibility = request.preset.classCompatibility?.[subClass] ?? 5;
  const scaling = Object.values(config.customScaling);
  const scalingFocus = scaling.length ? Math.max(...scaling) / 100 : 0;
  let preScore = compatibility / 10 + weapon.power / 100 + weapon.accuracy / 200 + weapon.critical / 140 + scalingFocus;
  const evidence: string[] = [];
  if (mainAccess || subAccess) {
    preScore += mainAccess ? 0.5 : 0.25;
    evidence.push(`${category} access is present in structured class data.`);
  }
  const pairEvidence = CLASS_PAIR_EVIDENCE[`${request.build.mainClass}::${subClass}`];
  if (pairEvidence) {
    preScore += 0.45;
    evidence.push(`Community profile supports ${request.build.mainClass} / ${subClass}.`);
  }
  if (profile) {
    if (subClass === profile.secondaryClass) preScore += 3;
    if (weapon.name === profile.weapon.name) preScore += 3;
  }
  return { subClass, weapon, preScore, evidence };
}

function enumerateSeeds(request: OptimizationRequest, limit: number): SearchSeed[] {
  const seeds = subClassCandidates(request).flatMap(subClass => weaponCandidates(request).map(weapon => seedPreScore(request, subClass, weapon)));
  seeds.sort((a, b) => b.preScore - a.preScore || a.subClass.localeCompare(b.subClass) || a.weapon.id.localeCompare(b.weapon.id));
  const selected = seeds.slice(0, limit);
  const profile = referenceProfile(request);
  if (profile) {
    const profileSeed = seeds.find(seed => seed.subClass === profile.secondaryClass && seed.weapon.name === profile.weapon.name);
    if (profileSeed && !selected.includes(profileSeed)) selected[selected.length - 1] = profileSeed;
  }
  return selected;
}

function allocateWithBeam(request: OptimizationRequest, seed: SearchSeed, width: number, isCancelled?: () => boolean): ScoredBuild {
  const initial = scoreBuild(buildCandidate(request, seed.subClass, seed.weapon, emptyStats(), null), request, seed.evidence);
  let beam = [initial];
  const budget = initial.evaluation.pointBudget;
  for (let point = 0; point < budget; point++) {
    if (isCancelled?.()) break;
    const expanded: ScoredBuild[] = [];
    const seen = new Set<string>();
    for (const item of beam) {
      for (const stat of STAT_KEYS) {
        if (item.build.addedStats[stat] >= item.evaluation.maxInvestedStats[stat]) continue;
        const allocation = { ...item.build.addedStats, [stat]: item.build.addedStats[stat] + 1 };
        const key = allocationKey(allocation);
        if (seen.has(key)) continue;
        seen.add(key);
        expanded.push(scoreBuild(buildCandidate(request, seed.subClass, seed.weapon, allocation, null), request, seed.evidence));
      }
    }
    if (!expanded.length) break;
    beam = selectPareto(expanded, width);
  }
  return beam.sort((a, b) => b.scalar - a.scalar)[0];
}

function refineStats(request: OptimizationRequest, initial: ScoredBuild, passes: number): ScoredBuild {
  let current = initial;
  for (let pass = 0; pass < passes; pass++) {
    let best = current;
    for (const from of STAT_KEYS) {
      if (current.build.addedStats[from] <= 0) continue;
      for (const to of STAT_KEYS) {
        if (to === from || current.build.addedStats[to] >= current.evaluation.maxInvestedStats[to]) continue;
        const allocation = { ...current.build.addedStats, [from]: current.build.addedStats[from] - 1, [to]: current.build.addedStats[to] + 1 };
        const build = { ...current.build, addedStats: allocation };
        const candidate = scoreBuild(build, request, current.evidence);
        if (candidate.scalar > best.scalar + 1e-9) best = candidate;
      }
    }
    if (best === current) break;
    current = best;
  }
  return current;
}

function evaluateArmors(request: OptimizationRequest, item: ScoredBuild, limit: number): ScoredBuild[] {
  const choices = armorCandidates(request);
  if (!choices.length) return [item];
  return choices.map(armor => scoreBuild({
    ...item.build,
    equipment: {
      ...item.build.equipment,
      armorName: armor.name,
      armorConditionalBonuses: request.locks?.armorName === armor.name && request.build.equipment.armorName === armor.name
        ? { ...request.build.equipment.armorConditionalBonuses }
        : {},
    },
  }, request, [...item.evidence, request.locks?.armorName === armor.name
    ? `${armor.name} preserved the current verified conditional selections.`
    : `${armor.name} was evaluated with conditional bonuses disabled.`]))
    .sort((a, b) => b.scalar - a.scalar || (a.build.equipment.armorName ?? '').localeCompare(b.build.equipment.armorName ?? ''))
    .slice(0, limit);
}

function conditionalGuideValidation(item: ScoredBuild, request: OptimizationRequest): BuildGuideValidation {
  const validation = validateBuildAgainstGuide(item.build, item.evaluation, request.preset);
  const profile = referenceProfile(request);
  const target = profile?.scaledStatTargets.apt;
  if (!profile || typeof target !== 'number' || target === 48) return validation;
  const checks = validation.checks.map(check => check.id !== 'aptitude' ? check : {
    ...check,
    status: Math.floor(item.evaluation.scaledStats.apt) === Math.floor(target) ? 'pass' as const : 'fail' as const,
    summary: `Applicable reference target from ${profile.name}: scaled APT ${Math.floor(target)}; candidate ${Math.floor(item.evaluation.scaledStats.apt)}. The generic 48-APT guide target is conditional.`,
    basis: 'assumption' as const,
  });
  return {
    ...validation,
    checks,
    passed: checks.filter(check => check.status === 'pass').length,
    failed: checks.filter(check => check.status === 'fail').length,
    requiresVerification: checks.filter(check => check.status === 'verify').length,
    supportedDeficit: 1 - item.objectives.guideFit,
  };
}

function tradeoffsFor(item: ScoredBuild): string[] {
  const ordered = Object.entries(item.objectives).sort((a, b) => a[1] - b[1]);
  return ordered.slice(0, 2).map(([name, value]) => `${name} is the weaker modeled dimension (${Math.round(value * 100)}%).`);
}

function toCandidate(item: ScoredBuild, request: OptimizationRequest, index: number): OptimizationCandidate {
  const profile = referenceProfile(request);
  const guideValidation = conditionalGuideValidation(item, request);
  const weaponName = item.build.equipment.primaryWeapon?.selectedWeaponName ?? 'Unknown weapon';
  const armorName = item.build.equipment.armorName ?? 'No torso';
  const warnings = [...(profile?.dataGaps ?? [])];
  if (!CLASS_PAIR_EVIDENCE[`${item.build.mainClass}::${item.build.subClass}`]) warnings.push('Class-skill synergy is not represented by verified structured data.');
  return {
    id: `v2::${item.build.mainClass}::${item.build.subClass}::${weaponName}::${armorName}::${index}`,
    patch: {
      mainClass: item.build.mainClass,
      subClass: item.build.subClass,
      selectedMainBaseClass: getBaseClass(item.build.mainClass),
      selectedSubBaseClass: getBaseClass(item.build.subClass),
      mainClassPassive: item.build.mainClassPassive,
      subClassPassive: item.build.subClassPassive,
      addedStats: { ...item.build.addedStats },
      equipment: { ...item.build.equipment, armorConditionalBonuses: { ...item.build.equipment.armorConditionalBonuses } },
    },
    evaluation: item.evaluation,
    score: item.scalar,
    constraintDeficits: item.deficits,
    feasible: item.deficitCount === 0,
    guideValidation,
    objectives: item.objectives,
    evidence: item.evidence,
    tradeoffs: tradeoffsFor(item),
    confidence: profile && item.build.subClass === profile.secondaryClass && weaponName === profile.weapon.name ? 'high' : item.evidence.length ? 'medium' : 'low',
    reasoning: [
      `Keeps ${request.build.race} / ${request.build.subrace} and primary ${request.build.mainClass} fixed.`,
      `Pairs ${item.build.mainClass} with ${item.build.subClass}, using ${weaponName} and ${armorName}.`,
      `Uses ${item.evaluation.pointsSpent}/${item.evaluation.pointBudget} invested points and satisfies ${Object.keys(request.preset.metricWeights).length} preset dimensions.`,
      ...(profile ? [`Uses ${profile.name} as community evidence without forcing an exact copy.`] : []),
    ],
    warnings,
  };
}

function selectDiverse(items: ScoredBuild[], limit: number): ScoredBuild[] {
  const remaining = [...items].sort((a, b) => b.scalar - a.scalar);
  const selected: ScoredBuild[] = [];
  while (remaining.length && selected.length < limit) {
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const weapon = candidate.build.equipment.primaryWeapon;
      const armor = candidate.build.equipment.armorName ? ARMORS[candidate.build.equipment.armorName] : undefined;
      const similarity = selected.reduce((penalty, chosen) => {
        const chosenWeapon = chosen.build.equipment.primaryWeapon;
        const chosenArmor = chosen.build.equipment.armorName ? ARMORS[chosen.build.equipment.armorName] : undefined;
        return Math.max(penalty,
          (candidate.build.subClass === chosen.build.subClass ? 0.3 : 0)
          + (effectiveWeaponType(weapon) === effectiveWeaponType(chosenWeapon) ? 0.2 : 0)
          + (armor?.type === chosenArmor?.type ? 0.1 : 0));
      }, 0);
      const adjusted = candidate.scalar - similarity;
      if (adjusted > bestAdjusted) { bestAdjusted = adjusted; bestIndex = index; }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}

export function validateV2Candidate(candidate: OptimizationCandidate, request: OptimizationRequest): string[] {
  const errors: string[] = [];
  if (candidate.patch.mainClass !== request.build.mainClass) errors.push('The fixed main class changed.');
  if (candidate.evaluation.pointsSpent > candidate.evaluation.pointBudget) errors.push('The point budget was exceeded.');
  if (request.locks?.subClass && candidate.patch.subClass !== request.locks.subClass) errors.push('The subclass lock changed.');
  const equipment = candidate.patch.equipment;
  const weaponName = equipment?.primaryWeapon?.selectedWeaponName;
  const armorName = equipment?.armorName;
  if (!weaponName || !findWeaponByName(weaponName)) errors.push('The weapon is not canonical.');
  if (!armorName || !ARMORS[armorName]) errors.push('The armor is not canonical.');
  if (request.locks?.weaponName && weaponName !== request.locks.weaponName) errors.push('The weapon lock changed.');
  if (request.locks?.armorName && armorName !== request.locks.armorName) errors.push('The armor lock changed.');
  if (request.locks?.weaponType && equipment?.primaryWeapon?.weaponType !== request.locks.weaponType) errors.push('The weapon-type lock changed.');
  if (request.locks?.armorType && armorName && ARMORS[armorName]?.type !== request.locks.armorType) errors.push('The armor-type lock changed.');
  if (STAT_KEYS.some(stat => candidate.patch.addedStats[stat] < 0 || candidate.patch.addedStats[stat] > candidate.evaluation.maxInvestedStats[stat])) errors.push('A stat allocation is outside its valid range.');
  return errors;
}

export function optimizeBuildV2(request: OptimizationRequest, control: OptimizationControl = {}): OptimizationResult {
  const started = performance.now();
  const budget = budgets[request.searchDepth ?? 'standard'];
  const seeds = enumerateSeeds(request, budget.seedLimit);
  const finalists: ScoredBuild[] = [];
  seeds.forEach((seed, index) => {
    if (control.isCancelled?.()) return;
    const allocation = allocateWithBeam(request, seed, budget.beamWidth, control.isCancelled);
    const refined = refineStats(request, allocation, budget.refinePasses);
    finalists.push(...evaluateArmors(request, refined, budget.armorsPerSeed));
    const progress: OptimizationProgress = { completed: index + 1, total: seeds.length, message: `V2: ${seed.subClass} / ${seed.weapon.name}` };
    control.onProgress?.(progress);
  });
  const ranked = finalists.sort((a, b) => b.scalar - a.scalar);
  const selected = selectDiverse(ranked, Math.max(1, request.resultLimit ?? 3));
  const profile = referenceProfile(request);
  if (profile && findWeaponByName(profile.weapon.name)) {
    const profileItem = ranked.find(item => item.build.subClass === profile.secondaryClass
      && item.build.equipment.primaryWeapon?.selectedWeaponName === profile.weapon.name);
    if (profileItem && !selected.includes(profileItem)) selected[selected.length - 1] = profileItem;
  }
  const candidates = selected.map((item, index) => toCandidate(item, request, index));
  for (const candidate of candidates) {
    const errors = validateV2Candidate(candidate, request);
    if (errors.length) throw new Error(`V2 produced an invalid candidate: ${errors.join(' ')}`);
  }
  return {
    candidates,
    pointBudget: request.build.characterLevel * 4,
    evaluatedClassPairs: subClassCandidates(request).length,
    evaluatedCandidates: seeds.length,
    durationMs: performance.now() - started,
    engine: 'v2',
  };
}

export class BuildOptimizerV2 {
  constructor(private readonly request: OptimizationRequest) {}
  optimize(control?: OptimizationControl): OptimizationResult { return optimizeBuildV2(this.request, control); }
}
