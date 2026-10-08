import type {
  Armor,
  AptitudeOptimizationReport,
  BuildEvaluation,
  BuildGuideValidation,
  BuildState,
  ElementKey,
  OptimizationCandidate,
  OptimizationConstraint,
  OptimizationDefensePlan,
  OptimizationDefenseContract,
  OptimizationDefenseScenario,
  OptimizationDamageProfile,
  OptimizationDamageReport,
  OptimizationExtraPackage,
  OptimizationGauntletReport,
  OptimizationLoadoutSummary,
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
import { evaluateBuild, getBaseClass, metricValue, STAT_KEYS } from '../domain/buildEvaluation';
import { validateBuildAgainstGuide } from '../domain/buildGuide';
import { effectiveWeaponType, findWeaponByName, weaponToConfig } from '../domain/equipment';
import { effectiveScaling } from '../domain/weaponScaling';
import { classPairLegal, mergeSkillRanks } from '../domain/skills';
import { skillDamageProfile } from '../domain/skillDamage';
import { evaluateGauntlet, opponentsForIds } from '../domain/opponentGauntlet';
import {
  anyLoadoutAxis,
  loadoutBudget,
  loadoutViolations,
  optimizeLoadout,
  resolveLoadoutAxes,
  summarizeLoadout,
  withLoadout,
} from '../domain/loadout';
import type { OptimizationControl, OptimizationProgress } from './StatOptimizer';
import { evaluateYoukaiRosterFit, type YoukaiOptimizationContext } from '../domain/youkaiOptimization';

const emptyStats = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });

const metricScale: Record<OptimizationMetric, number> = {
  str: 60, wil: 60, ski: 60, cel: 60, def: 60, res: 60, vit: 60, fai: 60, luc: 60, gui: 60, san: 60, apt: 48,
  maxHP: 900, fp: 450, physicalDefense: 50, magicalDefense: 50, evade: 200, criticalEvade: 100,
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

const ELEMENT_METRICS: Partial<Record<OptimizationMetric, ElementKey>> = {
  fireAttack: 'Fire', iceAttack: 'Ice', windAttack: 'Wind', earthAttack: 'Earth', darkAttack: 'Dark',
  waterAttack: 'Water', lightAttack: 'Light', lightningAttack: 'Lightning', acidAttack: 'Acid', soundAttack: 'Sound',
};

function youkaiOptimizationContext(request: OptimizationRequest): YoukaiOptimizationContext {
  const intent = (request.intent ?? '').toLocaleLowerCase();
  const elements = new Set<ElementKey>(request.damageProfile?.skills.flatMap(skill => skill.element ? [skill.element] : []) ?? []);
  for (const constraint of request.constraints) {
    const element = ELEMENT_METRICS[constraint.metric];
    if (element) elements.add(element);
  }
  for (const element of Object.values(ELEMENT_METRICS)) if (element && intent.includes(element.toLocaleLowerCase())) elements.add(element);
  return {
    intent: request.intent,
    defensePlan: request.defensePlan,
    extraPackage: request.extraPackage,
    preset: request.preset,
    constraints: request.constraints,
    damageElements: [...elements],
  };
}

interface ClassPair {
  mainClass: string;
  subClass: string;
}

interface SearchSeed {
  mainClass: string;
  subClass: string;
  weapon: Weapon;
  preScore: number;
  evidence: string[];
}

interface ScoredBuild {
  build: BuildState;
  /** The build as itself. The scenario every objective is judged in. */
  evaluation: BuildEvaluation;
  /** The same build wearing its installed Youkai, when it has one. */
  installedEvaluation?: BuildEvaluation;
  objectives: OptimizationObjectives;
  deficits: Partial<Record<OptimizationMetric, number>>;
  deficitCount: number;
  deficitTotal: number;
  scalar: number;
  evidence: string[];
  defenseScenario: OptimizationDefenseScenario;
  damageReport?: OptimizationDamageReport;
  gauntletReport?: OptimizationGauntletReport;
  /** Loadout rules this build breaks: over budget, ineligible, uncontracted. */
  violations: string[];
}

interface SearchBudget {
  seedLimit: number;
  beamWidth: number;
  armorsPerSeed: number;
  refinePasses: number;
  /**
   * Class pairs carried from the cheap pair pre-score into weapon enumeration.
   *
   * Searching the main slot as well as the sub takes the pair space from ~40 to
   * ~1600, and pairing every one of those with every weapon before ranking would
   * dominate the run. Pairs are ranked on class data alone first, and only the
   * survivors are crossed with the weapon list.
   */
  pairLimit: number;
  /**
   * Finalists that get a loadout search.
   *
   * Choosing traits, skills and Youkai costs thousands of evaluations per build,
   * so it is spent on the builds that could actually be returned rather than on
   * every seed's finalist.
   */
  loadoutFinalists: number;
}

const budgets: Record<'standard' | 'deep', SearchBudget> = {
  standard: { seedLimit: 24, beamWidth: 6, armorsPerSeed: 2, refinePasses: 2, pairLimit: 12, loadoutFinalists: 6 },
  deep: { seedLimit: 48, beamWidth: 10, armorsPerSeed: 3, refinePasses: 4, pairLimit: 24, loadoutFinalists: 12 },
};

function referenceProfile(request: OptimizationRequest): OptimizationReferenceProfile | undefined {
  const profile = request.referenceProfileId ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[request.referenceProfileId] : undefined;
  return profile?.enabled ? profile : undefined;
}

function normalizeCategory(type: string): string {
  return ({ Sword: 'Swords', Axe: 'Axes', Bow: 'Bows', Dagger: 'Daggers', Fist: 'Fist', Gun: 'Guns', Polearm: 'Spears', Spear: 'Spears', Tome: 'Tomes' } as Record<string, string>)[type] ?? type;
}

export interface WeaponOptimizationEligibility {
  eligible: boolean;
  explicitOptIn: boolean;
  restriction?: string;
}

export function weaponOptimizationEligibility(weapon: Weapon, request: OptimizationRequest): WeaponOptimizationEligibility {
  const policy = weapon.optimizationPolicy;
  if (!policy || policy.automaticRecommendation === 'allowed') return { eligible: true, explicitOptIn: false };
  const isExactLock = request.locks?.weaponName === weapon.name;
  const intent = (request.intent ?? '').toLocaleLowerCase();
  const explicitOptIn = isExactLock || (policy.optInTerms ?? []).some(term => intent.includes(term.toLocaleLowerCase()));
  return { eligible: explicitOptIn, explicitOptIn, restriction: policy.restriction };
}

function weaponCandidates(request: OptimizationRequest): Weapon[] {
  const locked = request.locks?.weaponName ? findWeaponByName(request.locks.weaponName) : undefined;
  if (locked) return [locked];
  const type = request.locks?.weaponType;
  return ALL_WEAPONS
    .filter(weapon => (!type || weapon.weaponType === type) && weaponOptimizationEligibility(weapon, request).eligible)
    .sort((a, b) => a.id.localeCompare(b.id));
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

function mainClassCandidates(request: OptimizationRequest): string[] {
  if (request.locks?.mainClass && CLASSES[request.locks.mainClass]) return [request.locks.mainClass];
  return request.searchMainClass ? Object.keys(CLASSES).sort() : [request.build.mainClass];
}

/**
 * Legal class pairs for this request.
 *
 * Destiny is enforced here rather than penalised in scoring: a cross-tree pair
 * under Destiny is not a worse build, it is not a build the character can have.
 */
function classPairCandidates(request: OptimizationRequest): ClassPair[] {
  const pairs: ClassPair[] = [];
  for (const mainClass of mainClassCandidates(request)) {
    for (const subClass of subClassCandidates(request)) {
      if (!classPairLegal(mainClass, subClass, request.build.destiny)) continue;
      pairs.push({ mainClass, subClass });
    }
  }
  /*
   * A Destiny build whose current pair is cross-tree has no legal pair at all
   * once both slots are pinned. Returning nothing would produce zero candidates
   * and no explanation, so the build's own pair is kept and the illegality is
   * reported as a candidate warning instead.
   */
  return pairs.length ? pairs : [{ mainClass: request.build.mainClass, subClass: request.build.subClass }];
}

function buildCandidate(request: OptimizationRequest, pair: ClassPair, weapon: Weapon, allocation: StatRecord, armorName: string | null): BuildState {
  const profile = referenceProfile(request);
  const useProfileWeapon = profile?.weapon.name === weapon.name;
  const locks = request.locks;
  const lockedCurrentWeapon = locks?.weaponName === request.build.equipment.primaryWeapon?.selectedWeaponName
    && locks?.weaponName === weapon.name
    ? request.build.equipment.primaryWeapon
    : undefined;
  const lockedCurrentArmor = locks?.armorName === request.build.equipment.armorName && locks?.armorName === armorName;
  const { mainClass, subClass } = pair;
  return {
    ...request.build,
    mainClass,
    subClass,
    selectedMainBaseClass: getBaseClass(mainClass),
    selectedSubBaseClass: getBaseClass(subClass),
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

/**
 * Power a build is expected to land with, per hit, once criticals are priced in.
 *
 * `criticalDamage` is a modifier (150 means a critical deals 150%), so the bonus
 * over a normal hit is `(modifier - 100)`, and it is only collected on the
 * fraction of hits that critical. A build with no critical rate gets exactly its
 * Power, however high GUI has pushed the modifier.
 */
export function criticalMultiplier(weapon?: { critical: number; criticalDamage: number }): number {
  if (!weapon) return 1;
  const rate = clamp01(weapon.critical / 100);
  const bonus = Math.max(0, weapon.criticalDamage - 100) / 100;
  return 1 + rate * bonus;
}

/**
 * Denominator for the expected-hit offense score.
 *
 * Set so a strong weapon carrying a real critical build lands near the top of
 * the range rather than saturating it: ~120 Power at a ~60% rate and a 185%
 * modifier is ~181 expected, which reads as 0.9 rather than 1.0. Saturating
 * would flatten the gradient the beam search climbs.
 */
const EXPECTED_HIT_SCALE = 200;

/** A critical build worth a full utility score: roughly +60% expected damage. */
const CRITICAL_UTILITY_SCALE = 0.6;

/**
 * How badly a weapon fits the class slots that have to swing it.
 *
 * `validWeapons` was only ever a small *bonus* in the seed pre-score, which made
 * it a tiebreaker rather than a constraint, so the search would hand a Firebird
 * (Spears only) a dagger, because the sub-class happened to allow daggers and
 * the dagger scored better on the stats it was mispricing. The main class is
 * where the doubled monoclass stat line and the primary kit live, so a weapon it
 * cannot hold is close to always wrong, and one *neither* slot can hold is not a
 * build at all.
 *
 * A penalty rather than a filter: the beam has to be able to pass through a
 * poorly-armed intermediate, and a locked weapon must still be searchable.
 */
const WEAPON_ACCESS_PENALTY = { none: 6, subOnly: 1.5, main: 0 };

export function weaponAccessFit(mainClass: string, subClass: string, weaponType?: string | null): {
  penalty: number;
  reason?: string;
} {
  if (!weaponType) return { penalty: 0 };
  const category = normalizeCategory(weaponType);
  const mainList = CLASSES[mainClass]?.validWeapons;
  const subList = CLASSES[subClass]?.validWeapons;
  // An absent list restricts nothing; the restriction has to be stated to apply.
  if (!mainList?.length && !subList?.length) return { penalty: 0 };
  if (mainList?.includes(category)) return { penalty: WEAPON_ACCESS_PENALTY.main };
  if (subList?.includes(category)) {
    return {
      penalty: WEAPON_ACCESS_PENALTY.subOnly,
      reason: `${category} is available to ${subClass} but not to ${mainClass}, so the main class's kit cannot use this weapon.`,
    };
  }
  return {
    penalty: WEAPON_ACCESS_PENALTY.none,
    reason: `Neither ${mainClass} nor ${subClass} can equip ${category}.`,
  };
}

function effectiveDefenseContract(request: OptimizationRequest): OptimizationDefenseContract {
  const plan = request.defensePlan ?? 'auto';
  const defaults: OptimizationDefenseContract = {
    ...(plan === 'evade' ? { minimumEvade: 195, preferredEvade: 200, reliableBonusEvade: 0 } : {}),
    ...(plan === 'tank' ? { minimumScaledDefense: 45, minimumScaledResistance: 45 } : {}),
    requirePartialBattleWeight: true,
    armorConditionalPolicy: 'baseline',
  };
  return { ...defaults, ...request.defenseContract };
}

function defenseScenarioFor(build: BuildState, configured: BuildEvaluation, request: OptimizationRequest): { scenario: OptimizationDefenseScenario; reliable: BuildEvaluation } {
  const contract = effectiveDefenseContract(request);
  const configuredBonusEvade = Math.max(0, Math.min(build.bonusEvade, 50));
  const hasEnabledArmorConditionals = Object.values(build.equipment.armorConditionalBonuses).some(Boolean);
  const baseline = hasEnabledArmorConditionals
    ? evaluateBuild({ ...build, bonusEvade: 0, equipment: { ...build.equipment, armorConditionalBonuses: {} } })
    : { ...configured, derived: { ...configured.derived, evade: configured.derived.evade - configuredBonusEvade } };
  const preserveConditionals = contract.armorConditionalPolicy === 'verified-current'
    && request.locks?.armorName === build.equipment.armorName
    && request.build.equipment.armorName === build.equipment.armorName;
  const reliableBonusEvade = Math.max(0, Math.min(contract.reliableBonusEvade ?? 0, 50));
  const reliableBase = preserveConditionals
    ? { ...configured, derived: { ...configured.derived, evade: configured.derived.evade - configuredBonusEvade } }
    : baseline;
  const reliable = { ...reliableBase, derived: { ...reliableBase.derived, evade: reliableBase.derived.evade + reliableBonusEvade } };
  const failures: string[] = [];
  if (contract.minimumEvade !== undefined && reliable.derived.evade < contract.minimumEvade) failures.push(`Reliable Evade ${reliable.derived.evade} is below ${contract.minimumEvade}.`);
  if (contract.minimumScaledDefense !== undefined && reliable.scaledStats.def < contract.minimumScaledDefense) failures.push(`Scaled DEF ${Math.floor(reliable.scaledStats.def)} is below ${contract.minimumScaledDefense}.`);
  if (contract.minimumScaledResistance !== undefined && reliable.scaledStats.res < contract.minimumScaledResistance) failures.push(`Scaled RES ${Math.floor(reliable.scaledStats.res)} is below ${contract.minimumScaledResistance}.`);
  if (contract.minimumArmor !== undefined && reliable.derived.armor < contract.minimumArmor) failures.push(`Torso Armor ${reliable.derived.armor} is below ${contract.minimumArmor}.`);
  if (contract.minimumMagicArmor !== undefined && reliable.derived.magicArmor < contract.minimumMagicArmor) failures.push(`Torso Magic Armor ${reliable.derived.magicArmor} is below ${contract.minimumMagicArmor}.`);
  if (contract.requirePartialBattleWeight && reliable.derived.battleWeightRemaining < 0) failures.push(`Weapon and torso exceed Battle Weight by ${Math.abs(reliable.derived.battleWeightRemaining)}.`);
  return {
    reliable,
    scenario: {
      plan: request.defensePlan ?? 'auto',
      baselineEvade: baseline.derived.evade,
      reliableEvade: reliable.derived.evade,
      configuredEvade: configured.derived.evade,
      minimumEvade: contract.minimumEvade,
      preferredEvade: contract.preferredEvade,
      reliableBonusEvade,
      scaledDefense: reliable.scaledStats.def,
      scaledResistance: reliable.scaledStats.res,
      armor: reliable.derived.armor,
      magicArmor: reliable.derived.magicArmor,
      armorEvade: reliable.derived.armorEvade,
      equipmentLoad: reliable.derived.equipmentLoad,
      battleWeightCapacity: reliable.derived.battleWeight,
      battleWeightRemaining: reliable.derived.battleWeightRemaining,
      meetsMinimum: failures.length === 0,
      reachesPreferred: contract.preferredEvade === undefined || reliable.derived.evade >= contract.preferredEvade,
      failures,
      assumptions: [
        `${reliableBonusEvade} bonus Evade explicitly supplied by the defense contract is treated as reliable; the calculator's separate configured bonus is reported independently.`,
        preserveConditionals ? 'The locked current torso uses the user-verified active conditionals.' : 'Armor conditional effects are excluded from the reliable scenario.',
        'Equipment load covers the primary weapon and torso only; other slots remain unmodeled.',
      ],
    },
  };
}

function profileFit(evaluation: BuildEvaluation, profile?: OptimizationReferenceProfile): number {
  if (!profile) return 0;
  const targets = Object.entries(profile.scaledStatTargets).filter((entry): entry is [StatKey, number] => entry[0] !== 'apt' && typeof entry[1] === 'number' && entry[1] > 0);
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
  const skiTarget = profile?.scaledStatTargets.ski ?? 57;
  const vitTarget = profile?.scaledStatTargets.vit ?? 35;
  const ski = clamp01(evaluation.scaledStats.ski / Math.max(1, skiTarget));
  const vit = clamp01(evaluation.rawStats.vit / Math.max(1, vitTarget));
  return (ski + vit) / 2;
}

export function evaluateDamageProfile(evaluation: BuildEvaluation, profile?: OptimizationDamageProfile): OptimizationDamageReport | undefined {
  if (!profile?.skills.length) return undefined;
  const skills = profile.skills.map(skill => {
    // `swaPercent` is a percentage of Scaled Weapon Attack, so it reads `swa`.
    // Reading `power` here dropped the stat scaling out of every coefficient.
    const weaponPowerContribution = (evaluation.primaryWeapon?.swa ?? 0) * skill.swaPercent / 100;
    const elementalAttack = skill.element ? evaluation.elementalAttack[skill.element] : 0;
    const elementalContribution = elementalAttack * skill.elementalAttackPercent / 100;
    return { ...skill, weaponPowerContribution, elementalAttack, elementalContribution, modeledTotal: weaponPowerContribution + elementalContribution };
  });
  const weightTotal = skills.reduce((sum, skill) => sum + Math.max(0, skill.weight), 0);
  const weightedScore = skills.reduce((sum, skill) => sum + skill.modeledTotal * Math.max(0, skill.weight), 0) / Math.max(1, weightTotal);
  return {
    weightedScore,
    skills,
    caveat: 'Coefficient score before enemy defenses, skill-specific flat modifiers, criticals, and unverified class effects; it is used for relative stat allocation only.',
  };
}

/** How many of a build's own attacks are folded into the offense score. */
const SCORED_SKILL_COUNT = 4;

/**
 * The attacks a candidate is scored on.
 *
 * An explicitly supplied profile wins outright. It is a contract (the user
 * typed a formula, or the agent translated one out of their prose), and quietly
 * blending the build's other skills into it would score something they did not
 * ask about.
 *
 * With no such contract, the build is scored on the skills it has actually
 * ranked, strongest first. This is what makes the skill axis mean anything: a
 * rank bought in a 250%-Fire-ATK skill has to show up in the offense number, or
 * the loadout search has no reason to buy it.
 */
function damageProfileFor(build: BuildState, request: OptimizationRequest): OptimizationDamageProfile | undefined {
  if (request.damageProfile?.skills.length) return request.damageProfile;
  /*
   * Checked before merging: the stat beam scores hundreds of thousands of builds
   * that have no ranks at all, and merging two empty records for every one of
   * them allocates its way through the whole search.
   */
  if (!hasAnyRank(build.skillRanks.main) && !hasAnyRank(build.skillRanks.sub)) return undefined;
  const ranked = skillDamageProfile(mergeSkillRanks(build.skillRanks));
  if (!ranked.length) return undefined;
  return { skills: ranked.slice(0, SCORED_SKILL_COUNT) };
}

/**
 * Exported for tests: the objective vector is where the search's priorities live,
 * and asserting on it directly is far cheaper than inferring them from a full run.
 */
export function objectiveState(evaluation: BuildEvaluation, request: OptimizationRequest, profile?: OptimizationReferenceProfile, damageProfile?: OptimizationDamageProfile): OptimizationObjectives {
  const weapon = evaluation.primaryWeapon;
  const plan: OptimizationDefensePlan = request.defensePlan ?? 'auto';
  const extra: OptimizationExtraPackage = request.extraPackage ?? 'auto';
  const damageReport = evaluateDamageProfile(evaluation, damageProfile);
  /*
   * Offense from Power and criticals *multiplied*, not added.
   *
   * The additive form this replaces gave half the offense score to the critical
   * damage modifier on its own, and that modifier is `+1% per scaled GUI`. So
   * pouring points into GUI raised the offense number without the build ever
   * having to be able to land a critical, and the search took the deal: it would
   * GUI-max and buy no LUC at all, because LUC only pays through crit *rate*,
   * which nothing scored. Multiplying them means neither half is worth anything
   * without the other, which is how criticals actually work.
   */
  const offense = damageReport
    ? clamp01(damageReport.weightedScore / 300)
    : clamp01((weapon?.swa ?? 0) * criticalMultiplier(weapon) / EXPECTED_HIT_SCALE);
  /*
   * Accuracy is the Hit a build can always count on, plus a discounted credit for
   * what positioning adds.
   *
   * The base tier is what it lands with no flank and no frontal attack, so that is
   * the guaranteed figure and it carries the weight. Flanking is real value (it is
   * what the Flanking stat and the GUI behind it buy), but it depends on where the
   * character is standing, so it can only break ties, never pay for giving up
   * guaranteed Hit. Same reasoning and roughly the same weight as
   * `INSTALL_UPSIDE_WEIGHT`.
   *
   * Reads `hitTiers.base` rather than `weapon.hit` so a weaponless build still
   * scores its character-side Hit instead of zero.
   */
  const guaranteedHit = evaluation.derived.hitTiers.base;
  const positioningUpside = Math.max(0, evaluation.derived.hitTiers.flank2 - guaranteedHit);
  const accuracy = clamp01(
    (guaranteedHit / 220 + evaluation.scaledStats.ski / 70) / 2
    + clamp01(positioningUpside / POSITIONING_SCALE) * POSITIONING_WEIGHT,
  );
  const contract = effectiveDefenseContract(request);
  const tank = (clamp01(evaluation.derived.maxHP / 1000) + clamp01(evaluation.derived.physicalDefense / 50) + clamp01(evaluation.derived.magicalDefense / 50)
    + clamp01(evaluation.derived.armor / 10) + clamp01(evaluation.derived.magicArmor / 10)) / 5;
  const evadeTarget = contract.preferredEvade ?? contract.minimumEvade ?? 200;
  const evade = clamp01(evaluation.derived.evade / Math.max(1, evadeTarget));
  const evadeDurability = evade * 0.75 + clamp01(evaluation.derived.initiative / 60) * 0.1 + tank * 0.15;
  const durability = clamp01(plan === 'evade' ? evadeDurability : plan === 'tank' ? tank : plan === 'glass' ? tank * 0.4 : (tank + evade) / 2);
  const sustain = clamp01((evaluation.derived.fp / 450 + evaluation.derived.statusResistance / 180 + evaluation.derived.skillPool / 45) / 3);
  // Same rule as `offense`: the critical package is worth what the two halves are
  // worth together. Summing rate, LUC and GUI let a GUI-only build claim a third
  // of it while never critting.
  const criticalUtility = clamp01((criticalMultiplier(weapon) - 1) / CRITICAL_UTILITY_SCALE);
  const faithUtility = (evaluation.scaledStats.fai / 65 + evaluation.derived.youkaiCap / 12 + evaluation.derived.fp / 450) / 3;
  const sanctityUtility = (evaluation.scaledStats.san / 65 + evaluation.derived.statusResistance / 180) / 2;
  const generalUtility = (evaluation.derived.statusInfliction / 180 + evaluation.derived.skillPool / 45 + evaluation.derived.flanking / 45) / 3;
  const utility = clamp01(extra === 'critical' ? criticalUtility : extra === 'faith' ? faithUtility : extra === 'sanctity' ? sanctityUtility : generalUtility);
  return { offense, accuracy, durability, sustain, utility, guideFit: guideFit(evaluation, profile), profileFit: profileFit(evaluation, profile) };
}

function presetUtility(evaluation: BuildEvaluation, request: OptimizationRequest): number {
  return Object.entries(request.preset.metricWeights).reduce((sum, [metric, weight]) => {
    const typedMetric = metric as OptimizationMetric;
    const scale = typedMetric === 'evade' ? effectiveDefenseContract(request).preferredEvade ?? metricScale.evade : metricScale[typedMetric];
    return sum + clamp01(metricValue(evaluation, typedMetric) / Math.max(1, scale)) * (weight ?? 0) / 10;
  }, 0);
}

/**
 * How much a strong Install body is worth, relative to the objectives.
 *
 * Small on purpose. Install is real value and the search should prefer the best
 * body among otherwise-equal builds, but it lasts 2–4 rounds, so it must not be
 * able to buy a worse allocation. At this weight it breaks ties; it cannot pay
 * for stranding a stat the way scoring the installed body directly did.
 */
const INSTALL_UPSIDE_WEIGHT = 0.4;

/**
 * Flanking Hit worth a full positioning credit.
 *
 * `flank2` adds the whole Flanking stat, which is `5 + half of scaled GUI`, so a
 * GUI-heavy build reaches the mid-thirties and a build that ignores GUI sits at 5.
 * Scaled to 35 so the credit tracks that spread rather than saturating instantly.
 */
const POSITIONING_SCALE = 35;

/**
 * How much the positioning credit is worth against guaranteed Hit.
 *
 * Deliberately small. Flanking is conditional on where the character is standing,
 * so at this weight it ranks a flanking build above an otherwise-equal one without
 * ever making it worth trading away Hit that always applies.
 */
const POSITIONING_WEIGHT = 0.15;

/** Install's duration in rounds at a given rank, per the wiki's `Bonus Duration`. */
function installDurationRounds(installRank: number): number {
  return 2 + Math.max(0, Math.min(2, installRank - 1));
}

/**
 * The build as it spends most of its time.
 *
 * Install swaps the racial stat line for a Youkai's, which is the single largest
 * swing a Summoner has, and it lasts two to four rounds. Ranking the character
 * in that body tells the stat search that every stat the Youkai supplies is
 * already handled, so it spends nothing there and the character is left worse
 * off for the rest of the fight. Judging them as themselves and treating Install
 * as upside is the same rule the defense contract applies to unverified armor
 * conditionals, and for the same reason.
 */
function baselineBuild(build: BuildState): BuildState {
  if (!build.youkai.installed) return build;
  return { ...build, youkai: { ...build.youkai, installed: null } };
}

/**
 * Whether this search scores candidates against the community opponent roster.
 *
 * Request-level, never per-build: dominance compares objective vectors
 * elementwise, so either every build in a search carries the pvp objective or
 * none does.
 */
function gauntletEnabled(request: OptimizationRequest): boolean {
  // Naming counter-build targets is itself the opt-in: "beat this build" is a
  // valid ask under any goal preset, not only the PvP one.
  return request.pvpGauntlet ?? (request.preset.id === 'pvp' || (request.gauntletOpponentIds?.length ?? 0) > 0);
}

/**
 * The gauntlet's share of the scalar. Sized with the other major objectives:
 * below the offense term a damage contract earns, because a supplied formula is
 * an explicit ask, but above the generic terms: when the user chose the PvP
 * goal, performance into real opponents is the point.
 */
const PVP_GAUNTLET_WEIGHT = 2.5;

function scoreBuild(build: BuildState, request: OptimizationRequest, evidence: string[] = []): ScoredBuild {
  const rankInstalled = (request.installPolicy ?? 'baseline') === 'installed';
  const ranked = rankInstalled ? build : baselineBuild(build);
  const evaluation = evaluateBuild(ranked);
  const installedEvaluation = build.youkai.installed && !rankInstalled ? evaluateBuild(build) : undefined;
  const { scenario: defenseScenario, reliable } = defenseScenarioFor(ranked, evaluation, request);
  const profile = referenceProfile(request);
  const constraints = constraintState(reliable, request.constraints);
  const contract = effectiveDefenseContract(request);
  const contractDeficits: Partial<Record<OptimizationMetric, number>> = {};
  if (contract.minimumEvade !== undefined && reliable.derived.evade < contract.minimumEvade) contractDeficits.evade = contract.minimumEvade - reliable.derived.evade;
  if (contract.minimumScaledDefense !== undefined && reliable.scaledStats.def < contract.minimumScaledDefense) contractDeficits.def = contract.minimumScaledDefense - reliable.scaledStats.def;
  if (contract.minimumScaledResistance !== undefined && reliable.scaledStats.res < contract.minimumScaledResistance) contractDeficits.res = contract.minimumScaledResistance - reliable.scaledStats.res;
  if (contract.minimumArmor !== undefined && reliable.derived.armor < contract.minimumArmor) contractDeficits.armor = contract.minimumArmor - reliable.derived.armor;
  if (contract.minimumMagicArmor !== undefined && reliable.derived.magicArmor < contract.minimumMagicArmor) contractDeficits.magicArmor = contract.minimumMagicArmor - reliable.derived.magicArmor;
  if (contract.requirePartialBattleWeight && reliable.derived.battleWeightRemaining < 0) contractDeficits.battleWeightRemaining = -reliable.derived.battleWeightRemaining;
  const deficits = { ...constraints.deficits, ...contractDeficits };
  const deficitCount = Object.keys(deficits).length;
  const deficitTotal = Object.entries(deficits).reduce((sum, [metric, value]) => sum + (value ?? 0) / Math.max(1, metricScale[metric as OptimizationMetric]), 0);
  const damageProfile = damageProfileFor(build, request);
  const damageReport = evaluateDamageProfile(reliable, damageProfile);
  /*
   * Scored from the reliable evaluation, same as every other objective: the
   * gauntlet must not be passable with conditional Evade or an Install body the
   * build only sometimes has.
   */
  const gauntletReport = gauntletEnabled(request)
    ? evaluateGauntlet(reliable, damageReport, opponentsForIds(request.gauntletOpponentIds))
    : undefined;
  const objectives: OptimizationObjectives = {
    ...objectiveState(reliable, request, profile, damageProfile),
    ...(gauntletReport ? { pvp: gauntletReport.aggregateScore } : {}),
  };
  const pairBonus = profile && build.subClass === profile.secondaryClass ? 0.05 : 0;
  const evidenceBonus = CLASS_PAIR_EVIDENCE[`${build.mainClass}::${build.subClass}`] ? 0.08 : 0;
  const profileWeight = profile ? 0.35 : 0;
  /*
   * An over-budget or now-ineligible loadout is treated exactly like a violated
   * hard minimum, and for the same reason: it is not a worse build, it is not a
   * legal one. Scoring it this way rather than filtering keeps the search able
   * to pass *through* an illegal intermediate on its way somewhere better.
   */
  const violations = hasLoadout(build) ? loadoutViolations(build, evaluation.derived.youkaiCap) : EMPTY_VIOLATIONS;
  /*
   * Install's contribution: how much stronger the borrowed body is, as a
   * fraction of a whole stat line, at a weight that can only break ties.
   */
  const installUpside = installedEvaluation
    ? clamp01(STAT_KEYS.reduce(
      (sum, stat) => sum + Math.max(0, installedEvaluation.scaledStats[stat] - evaluation.scaledStats[stat]),
      0,
    ) / 200) * INSTALL_UPSIDE_WEIGHT
    : 0;
  const axes = resolveLoadoutAxes(request.searchLoadout);
  const youkaiFit = axes.youkai
    ? evaluateYoukaiRosterFit(build, youkaiOptimizationContext(request), new Set(request.build.youkai.contracted)).score
    : 0;
  /*
   * Priced here and not only in the seed pre-score. The pre-score decides which
   * seeds are worth exploring; the scalar decides which build is returned, so a
   * weapon the classes cannot use has to cost something at both stages or it
   * comes back anyway.
   */
  const access = weaponAccessFit(build.mainClass, build.subClass, build.equipment.primaryWeapon?.weaponType);
  const accessEvidence = access.reason ? [...evidence, access.reason] : evidence;
  const scalar = -deficitCount * 100 - deficitTotal * 20 - violations.length * 100 - access.penalty
    + presetUtility(reliable, request)
    + objectives.offense * (damageReport ? 4 : 1.5) + objectives.accuracy * 1.5 + objectives.durability * 1.5
    + objectives.sustain + objectives.utility + objectives.guideFit * 1.25 + objectives.profileFit * profileWeight
    + (objectives.pvp ?? 0) * PVP_GAUNTLET_WEIGHT
    + pairBonus + evidenceBonus + installUpside + youkaiFit;
  return { build, evaluation, installedEvaluation, objectives, deficits, deficitCount, deficitTotal, scalar, evidence: accessEvidence, defenseScenario, damageReport, gauntletReport, violations };
}

const EMPTY_VIOLATIONS: string[] = [];

/**
 * Whether a build has any chosen content at all.
 *
 * The stat beam evaluates on the order of a hundred thousand builds whose
 * loadout never changes, and most of those have no traits, skills or contracts
 * to be illegal. Checking that first keeps the legality pass off the hot path.
 */
function hasLoadout(build: BuildState): boolean {
  return (build.traits?.length ?? 0) > 0
    || build.youkai.contracted.length > 0
    || hasAnyRank(build.skillRanks.main)
    || hasAnyRank(build.skillRanks.sub);
}

function hasAnyRank(ranks: Record<string, number> | undefined): boolean {
  if (!ranks) return false;
  for (const id in ranks) if (ranks[id] > 0) return true;
  return false;
}

function dominates(a: ScoredBuild, b: ScoredBuild): boolean {
  if (a.deficitCount > b.deficitCount || a.deficitTotal > b.deficitTotal + 1e-9) return false;
  const aValues = mechanicalObjectiveValues(a.objectives);
  const bValues = mechanicalObjectiveValues(b.objectives);
  const noWorse = aValues.every((value, index) => value + 1e-9 >= bValues[index]);
  const better = a.deficitCount < b.deficitCount || a.deficitTotal + 1e-9 < b.deficitTotal
    || aValues.some((value, index) => value > bValues[index] + 1e-9);
  return noWorse && better;
}

function mechanicalObjectiveValues(objectives: OptimizationObjectives): number[] {
  const values = [objectives.offense, objectives.accuracy, objectives.durability, objectives.sustain, objectives.utility, objectives.guideFit];
  // Present on every build of a gauntlet search and on none of a plain one, so
  // the vectors being compared always have matching lengths.
  if (objectives.pvp !== undefined) values.push(objectives.pvp);
  return values;
}

function selectPareto(items: ScoredBuild[], limit: number): ScoredBuild[] {
  const frontier = items.filter((item, index) => !items.some((other, otherIndex) => otherIndex !== index && dominates(other, item)));
  const pool = frontier.length >= limit ? frontier : [...frontier, ...items.filter(item => !frontier.includes(item))];
  return pool.sort((a, b) => b.scalar - a.scalar || allocationKey(a.build.addedStats).localeCompare(allocationKey(b.build.addedStats))).slice(0, limit);
}

function allocationKey(allocation: StatRecord): string {
  return STAT_KEYS.map(stat => allocation[stat]).join(',');
}

function uniqueAllocations(items: ScoredBuild[]): ScoredBuild[] {
  const unique = new Map<string, ScoredBuild>();
  for (const item of items) {
    const key = allocationKey(item.build.addedStats);
    const existing = unique.get(key);
    if (!existing || item.scalar > existing.scalar) unique.set(key, item);
  }
  return [...unique.values()];
}

function pointsToNextAptitudeBonus(build: BuildState, evaluation: BuildEvaluation): number | null {
  const currentBonus = aptitudeBonus(evaluation);
  const invested = build.addedStats.apt;
  for (let aptitude = invested + 1; aptitude <= evaluation.maxInvestedStats.apt; aptitude++) {
    if (aptitudeBonus(evaluateBuild(buildWithAptitude(build, aptitude))) > currentBonus) return aptitude - invested;
  }
  return null;
}

/**
 * Ranks a class pair on class data alone, before any weapon is considered.
 *
 * Cheap on purpose. This is the filter that makes searching both class slots
 * affordable, so it may only look at things that do not require evaluating a
 * build: the preset's compatibility table, the stat lines the classes grant, and
 * the curated pair evidence.
 */
function pairPreScore(request: OptimizationRequest, pair: ClassPair): number {
  const profile = referenceProfile(request);
  const main = CLASSES[pair.mainClass];
  const sub = CLASSES[pair.subClass];
  const compatibility = ((request.preset.classCompatibility?.[pair.mainClass] ?? 5)
    + (request.preset.classCompatibility?.[pair.subClass] ?? 5)) / 2;
  /*
   * The main slot's class stats are doubled on a monoclass build and are the
   * only ones that count at all, so a pair is weighted toward the main class's
   * fit with the preset's priority metrics via its raw stat total.
   */
  const mainStatWeight = STAT_KEYS.reduce((sum, stat) => sum + (main?.[stat] ?? 0), 0) / 12;
  const subStatWeight = STAT_KEYS.reduce((sum, stat) => sum + (sub?.[stat] ?? 0), 0) / 24;
  let score = compatibility / 10 + mainStatWeight + subStatWeight;
  if (pair.mainClass === request.build.mainClass) score += 0.4;
  if (pair.subClass === request.build.subClass) score += 0.1;
  if (CLASS_PAIR_EVIDENCE[`${pair.mainClass}::${pair.subClass}`]) score += 0.3;
  if (profile) {
    if (pair.mainClass === profile.primaryClass) score += 0.2;
    if (pair.subClass === profile.secondaryClass) score += 0.25;
  }
  return score;
}

function seedPreScore(request: OptimizationRequest, pair: ClassPair, weapon: Weapon): SearchSeed {
  const profile = referenceProfile(request);
  const config = weaponToConfig(weapon, profile?.weapon.name === weapon.name ? {
    effectiveType: profile.weapon.effectiveType,
    scalingOverride: profile.weapon.scaling,
    requiredEnchantment: profile.requiredWeaponEnchantment,
  } : {});
  const category = normalizeCategory(effectiveWeaponType(config) ?? weapon.weaponType);
  const mainAccess = CLASSES[pair.mainClass]?.validWeapons?.includes(category) ?? false;
  const subAccess = CLASSES[pair.subClass]?.validWeapons?.includes(category) ?? false;
  /*
   * Effective, not printed. A required enchantment can rewrite the tags (Mundane
   * strips them outright), and ranking a seed on tags the weapon will not actually
   * use is the same class of mistake as scoring Power where SWA was meant.
   */
  const scaling = Object.values(effectiveScaling(config));
  const scalingFocus = scaling.length ? Math.max(0, ...scaling) / 100 : 0;
  let preScore = pairPreScore(request, pair) + weapon.power / 100 + weapon.accuracy / 200 + weapon.critical / 140 + scalingFocus;
  const evidence: string[] = [];
  const weaponEligibility = weaponOptimizationEligibility(weapon, request);
  if (weaponEligibility.restriction) evidence.push(`${weapon.name} was explicitly opted into despite its restriction: ${weaponEligibility.restriction}`);
  if (mainAccess || subAccess) {
    preScore += mainAccess ? 0.5 : 0.25;
    evidence.push(`${category} access is present in structured class data.`);
  }
  /*
   * And the other direction. Rewarding access without charging for its absence
   * made a weapon no class could hold only 0.5 worse than one both could, which
   * any mispriced stat could out-earn.
   */
  preScore -= weaponAccessFit(pair.mainClass, pair.subClass, effectiveWeaponType(config) ?? weapon.weaponType).penalty;
  if (CLASS_PAIR_EVIDENCE[`${pair.mainClass}::${pair.subClass}`]) {
    evidence.push(`Community profile supports ${pair.mainClass} / ${pair.subClass}.`);
  }
  if (profile && weapon.name === profile.weapon.name) preScore += 0.25;
  return { mainClass: pair.mainClass, subClass: pair.subClass, weapon, preScore, evidence };
}

/**
 * Seeds, in two stages: rank class pairs, then cross the survivors with weapons.
 *
 * One stage would mean `pairs × weapons` seed pre-scores, which is fine for the
 * ~40 sub-class-only pairs the search used to have and is not fine for the ~1600
 * a two-slot search produces.
 */
function enumerateSeeds(request: OptimizationRequest, budget: SearchBudget): SearchSeed[] {
  const pairs = classPairCandidates(request)
    .map(pair => ({ pair, score: pairPreScore(request, pair) }))
    .sort((a, b) => b.score - a.score
      || a.pair.mainClass.localeCompare(b.pair.mainClass)
      || a.pair.subClass.localeCompare(b.pair.subClass))
    .slice(0, budget.pairLimit)
    .map(entry => entry.pair);

  const weapons = weaponCandidates(request);
  const seeds = pairs.flatMap(pair => weapons.map(weapon => seedPreScore(request, pair, weapon)));
  seeds.sort((a, b) => b.preScore - a.preScore
    || a.mainClass.localeCompare(b.mainClass)
    || a.subClass.localeCompare(b.subClass)
    || a.weapon.id.localeCompare(b.weapon.id));
  const selected = seeds.slice(0, budget.seedLimit);
  const profile = referenceProfile(request);
  if (profile) {
    const profileSeed = seeds.find(seed => seed.subClass === profile.secondaryClass && seed.weapon.name === profile.weapon.name);
    if (profileSeed && !selected.includes(profileSeed)) selected[selected.length - 1] = profileSeed;
  }
  return selected;
}

function allocateWithBeam(request: OptimizationRequest, seed: SearchSeed, width: number, isCancelled?: () => boolean): ScoredBuild {
  const pair: ClassPair = { mainClass: seed.mainClass, subClass: seed.subClass };
  const initial = scoreBuild(buildCandidate(request, pair, seed.weapon, emptyStats(), null), request, seed.evidence);
  const budget = initial.evaluation.pointBudget;
  const beamsBySpend = Array.from({ length: budget + 1 }, () => [] as ScoredBuild[]);
  beamsBySpend[0] = [initial];
  let furthestBeam = [initial];
  const aptitudeCostByInvestment = new Map<number, number | null>();

  for (let spent = 0; spent <= budget; spent++) {
    if (isCancelled?.()) break;
    if (!beamsBySpend[spent].length) continue;
    const beam = selectPareto(uniqueAllocations(beamsBySpend[spent]), width);
    furthestBeam = beam;
    if (spent === budget) continue;

    for (const item of beam) {
      for (const stat of STAT_KEYS) {
        if (stat === 'apt') continue;
        if (item.build.addedStats[stat] >= item.evaluation.maxInvestedStats[stat]) continue;
        const allocation = { ...item.build.addedStats, [stat]: item.build.addedStats[stat] + 1 };
        beamsBySpend[spent + 1].push(scoreBuild(buildCandidate(request, pair, seed.weapon, allocation, null), request, seed.evidence));
      }

      // APT is discontinuous: intermediate points have no value until the next
      // scaled multiple of six. Treat the whole breakpoint as one search move so
      // Pareto pruning cannot discard the investment before its global payoff.
      const investedAptitude = item.build.addedStats.apt;
      let aptitudeCost = aptitudeCostByInvestment.get(investedAptitude);
      if (!aptitudeCostByInvestment.has(investedAptitude)) {
        aptitudeCost = pointsToNextAptitudeBonus(item.build, item.evaluation);
        aptitudeCostByInvestment.set(investedAptitude, aptitudeCost);
      }
      if (aptitudeCost && spent + aptitudeCost <= budget) {
        const allocation = { ...item.build.addedStats, apt: investedAptitude + aptitudeCost };
        beamsBySpend[spent + aptitudeCost].push(scoreBuild(buildCandidate(request, pair, seed.weapon, allocation, null), request, seed.evidence));
      }
    }
  }
  return furthestBeam.sort((a, b) => b.scalar - a.scalar)[0];
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

function aptitudeBonus(evaluation: BuildEvaluation): number {
  return Math.max(0, Math.floor(evaluation.scaledStats.apt / 6));
}

function buildWithAptitude(build: BuildState, investedAptitude: number): BuildState {
  return { ...build, addedStats: { ...build.addedStats, apt: investedAptitude } };
}

function fundAptitudeBreakpoint(request: OptimizationRequest, current: ScoredBuild, cost: number): ScoredBuild | null {
  let funding = current;
  for (let point = 0; point < cost; point++) {
    let leastCostlyRemoval: ScoredBuild | null = null;
    for (const from of STAT_KEYS) {
      if (from === 'apt' || funding.build.addedStats[from] <= 0) continue;
      const allocation = { ...funding.build.addedStats, [from]: funding.build.addedStats[from] - 1 };
      const candidate = scoreBuild({ ...funding.build, addedStats: allocation }, request, current.evidence);
      if (!leastCostlyRemoval || candidate.scalar > leastCostlyRemoval.scalar + 1e-9) leastCostlyRemoval = candidate;
    }
    if (!leastCostlyRemoval) return null;
    funding = leastCostlyRemoval;
  }
  const allocation = { ...funding.build.addedStats, apt: current.build.addedStats.apt + cost };
  return scoreBuild({ ...funding.build, addedStats: allocation }, request, current.evidence);
}

function redistributeAptitudeInvestment(request: OptimizationRequest, current: ScoredBuild, targetAptitude: number): ScoredBuild | null {
  const released = current.build.addedStats.apt - targetAptitude;
  if (released <= 0) return null;
  let redistributed = scoreBuild(buildWithAptitude(current.build, targetAptitude), request, current.evidence);
  for (let point = 0; point < released; point++) {
    let bestAddition: ScoredBuild | null = null;
    for (const to of STAT_KEYS) {
      if (to === 'apt' || redistributed.build.addedStats[to] >= redistributed.evaluation.maxInvestedStats[to]) continue;
      const allocation = { ...redistributed.build.addedStats, [to]: redistributed.build.addedStats[to] + 1 };
      const candidate = scoreBuild({ ...redistributed.build, addedStats: allocation }, request, current.evidence);
      if (!bestAddition || candidate.scalar > bestAddition.scalar + 1e-9) bestAddition = candidate;
    }
    if (!bestAddition) return null;
    redistributed = bestAddition;
  }
  return redistributed;
}

export function analyzeAptitudeAllocation(build: BuildState, evaluation = evaluateBuild(build)): AptitudeOptimizationReport {
  const investedPoints = build.addedStats.apt;
  const globalStatBonus = aptitudeBonus(evaluation);
  const globalStatsAffected = STAT_KEYS.length - 1;
  let retainedBreakpointInvestment = investedPoints;
  for (let aptitude = investedPoints - 1; aptitude >= 0; aptitude--) {
    if (aptitudeBonus(evaluateBuild(buildWithAptitude(build, aptitude))) !== globalStatBonus) break;
    retainedBreakpointInvestment = aptitude;
  }

  let pointsToNextBonus: number | null = null;
  let nextEvaluation: BuildEvaluation | null = null;
  for (let aptitude = investedPoints + 1; aptitude <= evaluation.maxInvestedStats.apt; aptitude++) {
    const evaluated = evaluateBuild(buildWithAptitude(build, aptitude));
    if (aptitudeBonus(evaluated) > globalStatBonus) {
      pointsToNextBonus = aptitude - investedPoints;
      nextEvaluation = evaluated;
      break;
    }
  }
  const redundantInvestedPoints = investedPoints - retainedBreakpointInvestment;
  const nextScaledBreakpoint = (globalStatBonus + 1) * 6;
  const efficientBreakpoint = redundantInvestedPoints === 0;
  const nextBreakpointRawStatGain = nextEvaluation ? globalStatsAffected : null;
  const nextBreakpointScaledStatGain = nextEvaluation
    ? STAT_KEYS.filter(stat => stat !== 'apt').reduce((sum, stat) => sum + Math.max(0, nextEvaluation.scaledStats[stat] - evaluation.scaledStats[stat]), 0)
    : null;
  const nextBreakpointRawEfficient = pointsToNextBonus === null ? null : pointsToNextBonus <= globalStatsAffected;
  const nextBreakpointScaledEfficient = pointsToNextBonus === null || nextBreakpointScaledStatGain === null
    ? null
    : pointsToNextBonus <= nextBreakpointScaledStatGain + 1e-9;
  const next = pointsToNextBonus === null
    ? 'the next bonus is unreachable at the current cap'
    : `the next +1 global bonus costs ${pointsToNextBonus} invested point${pointsToNextBonus === 1 ? '' : 's'} for +${globalStatsAffected} raw stats (${nextBreakpointScaledStatGain?.toFixed(2)} effective scaled-stat total) before build-specific priorities`;
  return {
    scaledAptitude: evaluation.scaledStats.apt,
    globalStatBonus,
    globalStatsAffected,
    investedPoints,
    retainedBreakpointInvestment,
    redundantInvestedPoints,
    nextScaledBreakpoint,
    pointsToNextBonus,
    nextBreakpointRawStatGain,
    nextBreakpointScaledStatGain,
    nextBreakpointRawEfficient,
    nextBreakpointScaledEfficient,
    efficientBreakpoint,
    summary: `Scaled APT ${evaluation.scaledStats.apt.toFixed(2)} provides +${globalStatBonus} to all ${globalStatsAffected} non-APT stats; ${redundantInvestedPoints ? `${redundantInvestedPoints} invested point${redundantInvestedPoints === 1 ? ' is' : 's are'} above the retained breakpoint` : 'no invested points are stranded above the retained breakpoint'}, and ${next}.`,
  };
}

function refineAptitudeBreakpoints(request: OptimizationRequest, initial: ScoredBuild, maxSteps: number): ScoredBuild {
  let current = initial;
  for (let step = 0; step < maxSteps; step++) {
    let best = current;
    const report = analyzeAptitudeAllocation(current.build, current.evaluation);

    if (report.pointsToNextBonus && current.build.addedStats.apt + report.pointsToNextBonus <= current.evaluation.maxInvestedStats.apt) {
      const candidate = fundAptitudeBreakpoint(request, current, report.pointsToNextBonus);
      // When the breakpoint returns at least as much effective scaled-stat value
      // as it costs, preserve that globally efficient purchase even if a narrow
      // archetype score would rather concentrate every point in one stat. Explicit
      // user constraints still take precedence over this efficiency rule.
      const preservesConstraints = candidate
        && candidate.deficitCount <= current.deficitCount
        && candidate.deficitTotal <= current.deficitTotal + 1e-9;
      if (candidate && ((report.nextBreakpointScaledEfficient && preservesConstraints) || candidate.scalar > best.scalar + 1e-9)) best = candidate;
    }

    const currentMinimum = report.retainedBreakpointInvestment;
    if (currentMinimum > 0) {
      const lowerEvaluation = evaluateBuild(buildWithAptitude(current.build, currentMinimum - 1));
      const lowerBonus = aptitudeBonus(lowerEvaluation);
      let lowerMinimum = currentMinimum - 1;
      for (let aptitude = currentMinimum - 2; aptitude >= 0; aptitude--) {
        if (aptitudeBonus(evaluateBuild(buildWithAptitude(current.build, aptitude))) !== lowerBonus) break;
        lowerMinimum = aptitude;
      }
      const candidate = redistributeAptitudeInvestment(request, current, lowerMinimum);
      const loweredReport = candidate ? analyzeAptitudeAllocation(candidate.build, candidate.evaluation) : null;
      if (candidate && loweredReport?.nextBreakpointScaledEfficient !== true && candidate.scalar > best.scalar + 1e-9) best = candidate;
    }

    if (best === current) break;
    current = refineStats(request, best, 1);
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
  const aptitude = analyzeAptitudeAllocation(item.build, item.evaluation);
  let checks = validation.checks.map(check => check.id !== 'aptitude' ? check : {
    ...check,
    status: aptitude.efficientBreakpoint ? 'pass' as const : 'fail' as const,
    summary: `${aptitude.summary} The 48-scaled-APT guide is reported as historical planning evidence, not imposed as a mathematical target.`,
    basis: 'calculator-data' as const,
  });
  if (request.defensePlan === 'evade' || request.defensePlan === 'tank') {
    checks = checks.filter(check => check.id !== 'defense');
    checks.push({
      id: 'defense',
      label: request.defensePlan === 'evade' ? 'Reliable Evade defense' : 'Reliable mitigation defense',
      status: item.defenseScenario.meetsMinimum ? 'pass' : 'fail',
      basis: 'calculator-data',
      summary: request.defensePlan === 'evade'
        ? `Reliable Evade ${Math.floor(item.defenseScenario.reliableEvade)}; minimum ${item.defenseScenario.minimumEvade ?? 'not set'}, preferred ${item.defenseScenario.preferredEvade ?? 'not set'}. Baseline without configured bonus Evade is ${Math.floor(item.defenseScenario.baselineEvade)}.`
        : `Reliable scaled DEF/RES ${Math.floor(item.defenseScenario.scaledDefense)}/${Math.floor(item.defenseScenario.scaledResistance)} with torso Armor/Magic Armor ${item.defenseScenario.armor}/${item.defenseScenario.magicArmor}.`,
    });
  }
  return {
    ...validation,
    checks,
    passed: checks.filter(check => check.status === 'pass').length,
    failed: checks.filter(check => check.status === 'fail').length,
    requiresVerification: checks.filter(check => check.status === 'verify').length,
    supportedDeficit: 1 - item.objectives.guideFit,
  };
}

/** Adds the two-body comparison to a loadout summary, when one is installed. */
function installSummary(
  item: ScoredBuild,
  request: OptimizationRequest,
  loadout: OptimizationLoadoutSummary,
): OptimizationLoadoutSummary {
  const installed = loadout.contracted.find(youkai => youkai.installed);
  if (!installed || !item.installedEvaluation) return loadout;
  return {
    ...loadout,
    install: {
      youkaiName: installed.name,
      policy: request.installPolicy ?? 'baseline',
      durationRounds: installDurationRounds(mergeSkillRanks(item.build.skillRanks).install ?? 0),
      baselineStats: item.evaluation.scaledStats,
      installedStats: item.installedEvaluation.scaledStats,
      baselineMaxHP: item.evaluation.derived.maxHP,
      installedMaxHP: item.installedEvaluation.derived.maxHP,
    },
  };
}

/** One line per loadout axis the search was allowed to touch. */
function loadoutReasoning(loadout: OptimizationLoadoutSummary, request: OptimizationRequest): string[] {
  const axes = resolveLoadoutAxes(request.searchLoadout);
  const lines: string[] = [];
  if (axes.traits) {
    lines.push(`Spends ${loadout.traitPointsSpent}/${loadout.traitPointBudget} trait points on ${loadout.traits.length
      ? loadout.traits.map(trait => trait.name).join(', ')
      : 'no traits, because none improved the modeled result'}.`);
  }
  if (axes.skills) {
    const perPool = loadout.skillPools.map(pool => `${pool.className} ${pool.spent}/${pool.budget}`).join(', ');
    const top = loadout.skills.slice(0, 5).map(skill => `${skill.name} R${skill.rank}`).join(', ');
    lines.push(`Spends ${loadout.skillPointsSpent} skill points${loadout.destiny ? ' under Destiny' : ''} across separate per-class allowances (${perPool})${top ? `, led by ${top}${loadout.skills.length > 5 ? `, and ${loadout.skills.length - 5} more` : ''}` : ''}.`);
  }
  if (axes.youkai && loadout.contracted.length) {
    const installed = loadout.contracted.find(youkai => youkai.installed);
    lines.push(`Contracts ${loadout.contracted.length}/${loadout.youkaiCap} Youkai (${loadout.contracted.map(youkai => youkai.name).join(', ')})${installed ? `, installing ${installed.name}` : ' with no Install'}.`);
    const added = loadout.contracted.filter(youkai => youkai.source !== 'existing');
    lines.push(`${added.length} contract${added.length === 1 ? '' : 's'} were selected by evidence-backed kit fit; ${loadout.contracted.length - added.length} existing user selection${loadout.contracted.length - added.length === 1 ? ' was' : 's were'} preserved.`);
    if (loadout.contracted.length < loadout.youkaiCap) lines.push('Unused Youkai capacity remains open because no further contract had a positive supported reason.');
  }
  if (loadout.install) {
    const { install } = loadout;
    lines.push(install.policy === 'baseline'
      ? `Stats are allocated for the character's own body and Install is treated as ${install.durationRounds}-round upside: ${install.baselineMaxHP} HP as themselves, ${install.installedMaxHP} HP wearing ${install.youkaiName}.`
      : `Stats are allocated for the installed ${install.youkaiName} body, which lasts ${install.durationRounds} rounds. Outside that window the build has ${install.baselineMaxHP} HP rather than ${install.installedMaxHP}.`);
  }
  return lines;
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
  const warnings = [...(profile?.dataGaps ?? []), ...item.defenseScenario.failures, ...item.violations];
  const selectedWeapon = findWeaponByName(weaponName);
  const weaponRestriction = selectedWeapon ? weaponOptimizationEligibility(selectedWeapon, request).restriction : undefined;
  if (weaponRestriction) warnings.push(`${weaponName} restriction: ${weaponRestriction}`);
  if (request.build.destiny && !classPairLegal(item.build.mainClass, item.build.subClass, true)) {
    warnings.push(`Destiny allows only one class tree, but ${item.build.mainClass} and ${item.build.subClass} are from different ones.`);
  }
  if ((request.installPolicy ?? 'baseline') === 'installed' && item.installedEvaluation) {
    warnings.push('Stats are ranked in the installed body. Outside its 2–4 round window this build is weaker than one allocated for the character themselves.');
  }
  const loadout = installSummary(item, request, summarizeLoadout(item.build, item.evaluation.derived.youkaiCap, {
    originalYoukai: request.build.youkai,
    optimizationContext: youkaiOptimizationContext(request),
  }));
  return {
    id: `v2::${item.build.mainClass}::${item.build.subClass}::${weaponName}::${armorName}::${index}`,
    patch: {
      mainClass: item.build.mainClass,
      subClass: item.build.subClass,
      selectedMainBaseClass: getBaseClass(item.build.mainClass),
      selectedSubBaseClass: getBaseClass(item.build.subClass),
      addedStats: { ...item.build.addedStats },
      traits: [...item.build.traits],
      skillRanks: { main: { ...item.build.skillRanks.main }, sub: { ...item.build.skillRanks.sub } },
      youkai: { contracted: [...item.build.youkai.contracted], installed: item.build.youkai.installed },
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
    aptitudeReport: analyzeAptitudeAllocation(item.build, item.evaluation),
    defenseScenario: item.defenseScenario,
    damageReport: item.damageReport,
    gauntletReport: item.gauntletReport,
    loadout,
    reasoning: [
      request.searchMainClass
        ? `Keeps ${request.build.race} / ${request.build.subrace} fixed and searched both class slots.`
        : `Keeps ${request.build.race} / ${request.build.subrace} and primary ${request.build.mainClass} fixed.`,
      `Pairs ${item.build.mainClass} with ${item.build.subClass}, using ${weaponName} and ${armorName}.`,
      ...loadoutReasoning(loadout, request),
      `Uses ${item.evaluation.pointsSpent}/${item.evaluation.pointBudget} invested points and satisfies ${Object.keys(request.preset.metricWeights).length} preset dimensions.`,
      ...(request.constraints.length ? [`Hard minimums evaluated: ${request.constraints.map(constraint => `${constraint.metric} ≥ ${constraint.minimum}`).join(', ')}.`] : []),
      `Defense is ranked from the reliable scenario: ${Math.floor(item.defenseScenario.reliableEvade)} Evade, ${Math.floor(item.defenseScenario.scaledDefense)}/${Math.floor(item.defenseScenario.scaledResistance)} scaled DEF/RES, and ${item.defenseScenario.armor}/${item.defenseScenario.magicArmor} torso Armor/Magic Armor.`,
      ...(item.gauntletReport ? [
        `Ranked against ${item.gauntletReport.opponents.length} community opponent statlines (gauntlet ${Math.round(item.gauntletReport.aggregateScore * 100)}%); the weakest matchup is ${item.gauntletReport.opponents.find(row => row.opponentId === item.gauntletReport?.weakestOpponentId)?.opponentName ?? 'unknown'}.`,
      ] : []),
      ...(profile ? [`Considered ${profile.name} only as exploration evidence and a close-result tie-breaker.`] : []),
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
  // Only a violation when the main slot was not up for search: with
  // `searchMainClass` on, changing it is the point.
  if (!request.searchMainClass && candidate.patch.mainClass !== request.build.mainClass) errors.push('The fixed main class changed.');
  if (request.locks?.mainClass && candidate.patch.mainClass !== request.locks.mainClass) errors.push('The main-class lock changed.');
  if (candidate.evaluation.pointsSpent > candidate.evaluation.pointBudget) errors.push('The point budget was exceeded.');
  if (request.locks?.subClass && candidate.patch.subClass !== request.locks.subClass) errors.push('The subclass lock changed.');
  /*
   * Destiny legality is checked against the pair the candidate actually
   * proposes. A build that was already cross-tree under Destiny keeps its own
   * pair (see `classPairCandidates`) and is reported through warnings, so this
   * only fires when the search itself produced an illegal pair.
   */
  if (request.build.destiny
    && !classPairLegal(candidate.patch.mainClass, candidate.patch.subClass, true)
    && classPairLegal(request.build.mainClass, request.build.subClass, true)) {
    errors.push('Destiny confines the build to one class tree, but the pair spans two.');
  }
  const axes = resolveLoadoutAxes(request.searchLoadout);
  if (anyLoadoutAxis(axes)) {
    const proposed: BuildState = {
      ...request.build,
      mainClass: candidate.patch.mainClass,
      subClass: candidate.patch.subClass,
      addedStats: candidate.patch.addedStats,
      traits: candidate.patch.traits ?? request.build.traits,
      skillRanks: candidate.patch.skillRanks ?? request.build.skillRanks,
      youkai: candidate.patch.youkai ?? request.build.youkai,
    };
    errors.push(...loadoutViolations(proposed, candidate.evaluation.derived.youkaiCap));
  }
  const equipment = candidate.patch.equipment;
  const weaponName = equipment?.primaryWeapon?.selectedWeaponName;
  const armorName = equipment?.armorName;
  const weapon = weaponName ? findWeaponByName(weaponName) : undefined;
  if (!weapon) errors.push('The weapon is not canonical.');
  else if (!weaponOptimizationEligibility(weapon, request).eligible) errors.push(`${weapon.name} requires explicit opt-in because its casting restriction is not compatible with a general build search.`);
  if (!armorName || !ARMORS[armorName]) errors.push('The armor is not canonical.');
  if (request.locks?.weaponName && weaponName !== request.locks.weaponName) errors.push('The weapon lock changed.');
  if (request.locks?.armorName && armorName !== request.locks.armorName) errors.push('The armor lock changed.');
  if (request.locks?.weaponType && equipment?.primaryWeapon?.weaponType !== request.locks.weaponType) errors.push('The weapon-type lock changed.');
  if (request.locks?.armorType && armorName && ARMORS[armorName]?.type !== request.locks.armorType) errors.push('The armor-type lock changed.');
  if (STAT_KEYS.some(stat => candidate.patch.addedStats[stat] < 0 || candidate.patch.addedStats[stat] > candidate.evaluation.maxInvestedStats[stat])) errors.push('A stat allocation is outside its valid range.');
  return errors;
}

export function candidateMechanicallyDominates(a: OptimizationCandidate, b: OptimizationCandidate): boolean {
  if (!a.objectives || !b.objectives) return false;
  if (Object.keys(a.constraintDeficits).length > Object.keys(b.constraintDeficits).length) return false;
  const aValues = mechanicalObjectiveValues(a.objectives);
  const bValues = mechanicalObjectiveValues(b.objectives);
  return aValues.every((value, index) => value + 1e-9 >= bValues[index])
    && (Object.keys(a.constraintDeficits).length < Object.keys(b.constraintDeficits).length
      || aValues.some((value, index) => value > bValues[index] + 1e-9));
}

/**
 * Chooses traits, skill ranks and Youkai for a build whose stats are settled,
 * then re-settles the stats around what it chose.
 *
 * The two searches are alternated rather than joined because they are different
 * shapes: stats are 240 interchangeable points and hill-climb well, while the
 * loadout is three budgeted knapsacks whose items only make sense as whole
 * units. Alternating recovers most of the interaction (a Youkai contracted on
 * the loadout pass makes FAI worth more on the stat pass that follows) at a
 * fraction of the cost of searching them together.
 */
function refineLoadout(request: OptimizationRequest, item: ScoredBuild, budget: SearchBudget, isCancelled?: () => boolean): ScoredBuild {
  const axes = resolveLoadoutAxes(request.searchLoadout);
  if (!anyLoadoutAxis(axes)) return item;

  let current = item;
  for (let pass = 0; pass < 2; pass++) {
    if (isCancelled?.()) break;
    const base = current.build;
    const chosen = optimizeLoadout(
      base,
      loadout => scoreBuild(withLoadout(base, loadout), request, current.evidence).scalar,
      {
        axes,
        budget: loadoutBudget(base, current.evaluation.derived.youkaiCap),
        baseClassOf: getBaseClass,
        isCancelled,
      },
    );
    const withChoices = scoreBuild(withLoadout(base, chosen), request, current.evidence);
    /*
     * Re-refining is not optional. Install rewrites the racial stat line and
     * traits move base stats, so the allocation that was optimal a moment ago
     * usually is not any more, and a trait bought against the old allocation
     * can be left ineligible by the new one, which `scoreBuild` will now see.
     */
    const resettled = refineAptitudeBreakpoints(request, refineStats(request, withChoices, budget.refinePasses), budget.refinePasses * 2);
    if (resettled.scalar <= current.scalar + 1e-9) break;
    current = resettled;
  }
  return current;
}

export function optimizeBuildV2(request: OptimizationRequest, control: OptimizationControl = {}): OptimizationResult {
  const started = performance.now();
  const budget = budgets[request.searchDepth ?? 'standard'];
  const seeds = enumerateSeeds(request, budget);
  const finalists: ScoredBuild[] = [];
  seeds.forEach((seed, index) => {
    if (control.isCancelled?.()) return;
    const allocation = allocateWithBeam(request, seed, budget.beamWidth, control.isCancelled);
    const refined = refineAptitudeBreakpoints(request, refineStats(request, allocation, budget.refinePasses), budget.refinePasses * 4);
    const armored = evaluateArmors(request, refined, budget.armorsPerSeed);
    finalists.push(...armored.map(item => refineAptitudeBreakpoints(request, refineStats(request, item, 1), budget.refinePasses * 2)));
    const progress: OptimizationProgress = { completed: index + 1, total: seeds.length, message: `V2: ${seed.mainClass} / ${seed.subClass} · ${seed.weapon.name}` };
    control.onProgress?.(progress);
  });

  /*
   * The loadout search costs thousands of evaluations a build, so it is spent on
   * the builds that could plausibly be returned rather than on every finalist.
   * Ranking first and re-ranking after is what keeps that affordable.
   */
  const preRanked = finalists.sort((a, b) => b.scalar - a.scalar);
  const withLoadouts = preRanked.map((item, index) => (
    index < budget.loadoutFinalists && !control.isCancelled?.()
      ? refineLoadout(request, item, budget, control.isCancelled)
      : item
  ));

  const ranked = withLoadouts.sort((a, b) => b.scalar - a.scalar);
  const limit = Math.max(1, request.resultLimit ?? 3);
  const frontier = ranked.filter((item, index) => !ranked.some((other, otherIndex) => otherIndex !== index && dominates(other, item)));
  const selectionPool = frontier.length >= limit ? frontier : [...frontier, ...ranked.filter(item => !frontier.includes(item))];
  const selected = selectDiverse(selectionPool, limit);
  const candidates = selected.map((item, index) => toCandidate(item, request, index));
  for (const candidate of candidates) {
    const errors = validateV2Candidate(candidate, request);
    if (errors.length) throw new Error(`V2 produced an invalid candidate: ${errors.join(' ')}`);
  }
  return {
    candidates,
    pointBudget: request.build.characterLevel * 4,
    evaluatedClassPairs: classPairCandidates(request).length,
    evaluatedCandidates: seeds.length,
    durationMs: performance.now() - started,
    engine: 'v2',
  };
}

export class BuildOptimizerV2 {
  constructor(private readonly request: OptimizationRequest) {}
  optimize(control?: OptimizationControl): OptimizationResult { return optimizeBuildV2(this.request, control); }
}
