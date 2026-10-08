/**
 * The parts of a build that are chosen rather than allocated: traits, skill
 * ranks, and Youkai contracts.
 *
 * The stat optimizer searches a continuous-ish space (240 points across twelve
 * stats), and can hill-climb it one point at a time. These three axes are not
 * like that. Each is a bounded knapsack against its own budget, with its own
 * legality rules, and the items interact: Affinity is worthless without a
 * contracted Youkai of that race, Install is worthless without the Install
 * skill, and a trait's requirements are read off base stats the stat search is
 * free to move underneath it.
 *
 * So this module does not score anything. It enumerates the legal moves and asks
 * the caller (which owns the objective) whether a move is an improvement. That
 * keeps every "is this build better" judgement in one place in the optimizer,
 * and keeps every "is this build legal" judgement here.
 */
import type {
  BuildState,
  OptimizationLoadoutAxes,
  OptimizationLoadoutSummary,
  Skill,
  SkillRanks,
  YoukaiState,
} from '../types';
import { hasDuplicateAccessory } from '../types';
import type { YoukaiOptimizationContext } from './youkaiOptimization';
import { evaluateYoukaiRosterFit } from './youkaiOptimization';
import {
  SKILL_POINT_COST_PER_RANK,
  buildSkillPointBudget,
  buildSkillPointsSpent,
  buildSkillPools,
  mergeSkillRanks,
  skillById,
  skillPointBudget,
  classSkillPointBudget,
  skillPoolSpends,
  skillsForClassSlots,
  skillsForClassTree,
} from './skills';
import { TRAITS, traitCheckTarget, traitCost, traitEligibility, traitPointBudget, traitPointsSpent } from './traits';
import { TALENT_BUDGET, talentSpending } from '../data/talents';
import {
  YOUKAI,
  ascendedYoukaiFor,
  conflictingYoukaiFamilies,
  contractYoukai,
  normalizeYoukaiState,
  preferAscendedYoukaiState,
  youkaiById,
} from './youkai';

export interface Loadout {
  traits: string[];
  skillRanks: Record<'main' | 'sub', SkillRanks>;
  youkai: YoukaiState;
}

/** Which axes the search may rewrite. An axis left out keeps the build's own. */
export type LoadoutAxes = OptimizationLoadoutAxes;

export const ALL_LOADOUT_AXES: LoadoutAxes = { traits: true, skills: true, youkai: true };
export const NO_LOADOUT_AXES: LoadoutAxes = { traits: false, skills: false, youkai: false };

export function resolveLoadoutAxes(axes: Partial<LoadoutAxes> | undefined): LoadoutAxes {
  return { ...NO_LOADOUT_AXES, ...axes };
}

export function anyLoadoutAxis(axes: LoadoutAxes): boolean {
  return axes.traits || axes.skills || axes.youkai;
}

/**
 * How much of a build the loadout search is allowed to spend.
 *
 * `youkaiCap` comes from the caller because it is a derived stat: the optimizer
 * has already evaluated the build and knows it, and recomputing it here would
 * mean this module depending on the evaluation it is being scored by.
 */
export interface LoadoutBudget {
  traitPoints: number;
  /**
   * Points each reachable class has of its own.
   *
   * Not a total: skill points do not pool across classes, so the search has to
   * check the allowance belonging to the skill it is about to buy.
   */
  skillPointsPerClass: number;
  youkaiCap: number;
}

export function emptyLoadout(): Loadout {
  return { traits: [], skillRanks: { main: {}, sub: {} }, youkai: { contracted: [], installed: null } };
}

export function loadoutOf(build: BuildState): Loadout {
  return {
    traits: [...(build.traits ?? [])],
    skillRanks: { main: { ...build.skillRanks.main }, sub: { ...build.skillRanks.sub } },
    youkai: normalizeYoukaiState({ contracted: [...build.youkai.contracted], installed: build.youkai.installed }),
  };
}

export function withLoadout(build: BuildState, loadout: Loadout): BuildState {
  return { ...build, traits: loadout.traits, skillRanks: loadout.skillRanks, youkai: loadout.youkai };
}

export function loadoutBudget(build: BuildState, youkaiCap: number): LoadoutBudget {
  return {
    traitPoints: traitPointBudget(build.characterLevel),
    skillPointsPerClass: skillPointBudget(build.destiny),
    youkaiCap: Math.max(0, Math.floor(youkaiCap)),
  };
}

/* ------------------------------------------------------------------- traits */

/** Traits this build could legally buy, given the stat allocation it has now. */
export function eligibleTraits(build: BuildState): string[] {
  const target = traitCheckTarget(build);
  return TRAITS.filter(trait => (
    // History is chosen through the build's `history` field, which carries HP
    // and percentage effects the trait row does not. Buying it here would apply
    // half the trait and double-count nothing useful.
    !trait.historyKey && !trait.handModelled && traitEligibility(trait, target).eligible
  )).map(trait => trait.id);
}

/**
 * Why a build's trait list is not legal, or an empty list when it is.
 *
 * Run after the stat search settles, because that is exactly when it can be
 * violated: requirements read base stats, and moving a point out of STR can
 * retroactively disqualify a trait bought when STR was higher.
 */
export function traitViolations(build: BuildState, budget = traitPointBudget(build.characterLevel)): string[] {
  const target = traitCheckTarget(build);
  const problems: string[] = [];
  const spent = traitPointsSpent(build.traits ?? [], build.race, build.history);
  if (spent > budget) problems.push(`Traits cost ${spent} points against a budget of ${budget}.`);
  for (const id of build.traits ?? []) {
    const trait = TRAITS.find(item => item.id === id);
    if (!trait) {
      problems.push(`Trait "${id}" is not in the trait data.`);
      continue;
    }
    const { eligible, reasons } = traitEligibility(trait, target);
    if (!eligible) problems.push(`${trait.name} is no longer met: ${reasons.join(', ')}.`);
  }
  return problems;
}

/* ------------------------------------------------------------------ talents */

/**
 * The ranks a build has to spend across all talents.
 *
 * A flat 65 (the wiki's 60 from levels plus the 5 Legend Extension adds), and
 * deliberately not scaled by level or by whether Legend Extend is switched on.
 * The sheet is used to plan a finished character, so budgeting against a level
 * 20 pool would refuse allocations the build is being planned towards.
 *
 * The unit is **ranks**, not SP. A rank costs SP at a rate that differs per
 * talent, so the SP bill is a separate figure and is not what this bounds.
 */
export const TALENT_POINT_BUDGET = TALENT_BUDGET.pointsFromLevels + TALENT_BUDGET.legendExtensionPoints;

/**
 * Why a build's talent allocation is not legal, or an empty list when it is.
 *
 * Two separate rules, and a build can break either alone: total ranks against
 * the 65 the character has, and the per-talent cap of ten. Subtalent ranks are
 * already clamped on the way in, so a rank over its own cap cannot get here.
 */
export function talentViolations(build: BuildState): string[] {
  const problems: string[] = [];
  const { perTalent, totalRanks } = talentSpending(build.talents ?? {});
  if (totalRanks > TALENT_POINT_BUDGET) {
    problems.push(`Talents use ${totalRanks} ranks against a budget of ${TALENT_POINT_BUDGET}.`);
  }
  for (const entry of perTalent) {
    if (entry.overAllocated) {
      problems.push(`${entry.talent.name} holds ${entry.ranks} ranks against its cap of ${entry.talent.maxRanks}.`);
    }
  }
  return problems;
}

/* ------------------------------------------------------------------- skills */

/**
 * The slot a chosen skill is recorded against.
 *
 * The point budget is shared, but the sheet is not: a skill goes on the main
 * sheet when the main class tree can reach it, and on the sub sheet otherwise.
 * That keeps the Skills dialog showing each skill under a class that actually
 * has it.
 */
function slotForSkill(mainTree: Set<string>, skillId: string): 'main' | 'sub' {
  return mainTree.has(skillId) ? 'main' : 'sub';
}

export function skillViolations(build: BuildState): string[] {
  const problems: string[] = [];
  // Checked per class, not in total: 40 points across two 35-point classes is
  // within the overall 70 and still illegal if 40 of it landed on one of them.
  for (const pool of skillPoolSpends(build.mainClass, build.subClass, build.skillRanks, build.destiny, build)) {
    if (pool.overspent) problems.push(`${pool.className} skills cost ${pool.spent} points against its ${pool.budget}.`);
  }
  const pool = skillsForClassSlots(build.mainClass, build.subClass);
  const reachable = new Map(pool.map(skill => [skill.id, skill]));
  const merged = mergeSkillRanks(build.skillRanks);
  for (const [id, rank] of Object.entries(merged)) {
    if (rank <= 0) continue;
    const skill = reachable.get(id);
    if (!skill) {
      problems.push(`Skill "${id}" is not reachable from ${build.mainClass} / ${build.subClass}.`);
      continue;
    }
    // Install requires Sync-Mind rank 1, which requires The Contract rank 1.
    // A build holding Install without them is not a build the game allows.
    for (const requirement of skill.requires ?? []) {
      if ((merged[requirement.id] ?? 0) >= requirement.rank) continue;
      const name = skillById(requirement.id)?.name ?? requirement.id;
      problems.push(`${skill.name} needs ${name} at rank ${requirement.rank}.`);
    }
  }
  return problems;
}

/**
 * A rank purchase, with every prerequisite it drags in behind it.
 *
 * Returns null when the chain cannot be completed: a prerequisite outside the
 * build's class pools, or one that would not fit its class's allowance.
 *
 * Prerequisites are bought together with the skill for the same reason Install
 * is bought together with its contract: a rank in The Contract buys nothing on
 * its own, so a search that only ever takes improving single steps would never
 * climb the chain to the skill that does pay.
 */
const REACHABLE_CACHE = new Map<string, Map<string, Skill>>();

/** Reachable skills by id, memoised: the search asks for this thousands of times. */
function reachableSkills(mainClass: string, subClass: string): Map<string, Skill> {
  const key = `${mainClass} ${subClass}`;
  let cached = REACHABLE_CACHE.get(key);
  if (!cached) {
    cached = new Map(skillsForClassSlots(mainClass, subClass).map(skill => [skill.id, skill]));
    REACHABLE_CACHE.set(key, cached);
  }
  return cached;
}

export function withPrerequisites(
  ranks: Record<'main' | 'sub', SkillRanks>,
  skillId: string,
  rank: number,
  context: { race?: string; subrace?: string; traits?: string[]; mainClass: string; subClass: string; destiny: boolean; slotFor: (id: string) => 'main' | 'sub' },
): Record<'main' | 'sub', SkillRanks> | null {
  const reachable = reachableSkills(context.mainClass, context.subClass);
  let next = { main: { ...ranks.main }, sub: { ...ranks.sub } };
  const pending: Array<{ id: string; rank: number }> = [{ id: skillId, rank }];
  const seen = new Set<string>();

  while (pending.length) {
    const item = pending.pop()!;
    const skill = reachable.get(item.id);
    if (!skill || item.rank > skill.maxRank) return null;
    const merged = mergeSkillRanks(next);
    if ((merged[item.id] ?? 0) >= item.rank) continue;
    // Guards a cycle in the data rather than an expected case.
    if (seen.has(item.id)) return null;
    seen.add(item.id);
    const slot = context.slotFor(item.id);
    next = { ...next, [slot]: { ...next[slot], [item.id]: item.rank } };
    for (const requirement of skill.requires ?? []) pending.push({ ...requirement });
  }

  const spends = skillPoolSpends(context.mainClass, context.subClass, next, context.destiny, context);
  return spends.some(pool => pool.overspent) ? null : next;
}

/* ------------------------------------------------------------------- youkai */

/**
 * Whether this build can contract Youkai at all.
 *
 * Contracting is a Summoner-tree activity, so a build with no Summoner slot
 * keeps whatever it already had rather than being handed summons it cannot use.
 */
export function canContractYoukai(build: BuildState, baseClassOf: (name: string) => string): boolean {
  return baseClassOf(build.mainClass) === 'Summoner' || baseClassOf(build.subClass) === 'Summoner';
}

export function youkaiViolations(build: BuildState, youkaiCap: number): string[] {
  const problems: string[] = [];
  const cap = Math.max(0, Math.floor(youkaiCap));
  if (build.youkai.contracted.length > cap) {
    problems.push(`${build.youkai.contracted.length} Youkai are contracted against a cap of ${cap}.`);
  }
  for (const id of build.youkai.contracted) {
    if (!youkaiById(id)) problems.push(`Youkai "${id}" is not in the Youkai data.`);
  }
  for (const family of conflictingYoukaiFamilies(build.youkai)) {
    problems.push(`Youkai contract family "${family}" contains both its base and ascended forms.`);
  }
  const installed = build.youkai.installed;
  if (installed) {
    if (!build.youkai.contracted.includes(installed)) problems.push('The installed Youkai is not contracted.');
    // Install is a Summoner skill; without a rank in it the body swap does not
    // happen, and `evaluateBuild` would be substituting stats the build has not
    // paid for.
    if ((mergeSkillRanks(build.skillRanks).install ?? 0) < 1) problems.push('Install is set but the Install skill is unranked.');
  }
  return problems;
}

/* ------------------------------------------------------------------- search */

/** A scoring function over a whole loadout. Higher is better. */
export type LoadoutScore = (loadout: Loadout) => number;

export interface LoadoutSearchOptions {
  axes: LoadoutAxes;
  budget: LoadoutBudget;
  /** Alternating passes over the three axes. Two is usually enough to settle. */
  passes?: number;
  baseClassOf: (name: string) => string;
  isCancelled?: () => boolean;
}

const EPSILON = 1e-9;

/**
 * Greedily buys the best affordable improvement on each axis, in turn, until a
 * whole pass finds nothing.
 *
 * Greedy rather than exhaustive because the joint space is not searchable: 24
 * trait points over ~200 traits, 50 skill points over ~60 skills at up to five
 * ranks each, and up to a dozen contracts out of 35 Youkai multiply out past any
 * budget worth spending on a build planner. The alternating passes are what
 * recover most of the interaction a joint search would find: a Youkai contracted
 * in pass one makes its Affinity skill worth buying in pass two.
 */
export function optimizeLoadout(build: BuildState, score: LoadoutScore, options: LoadoutSearchOptions): Loadout {
  const { axes, budget, baseClassOf } = options;
  const passes = options.passes ?? 2;
  let current = loadoutOf(build);
  if (axes.youkai) current = { ...current, youkai: preferAscendedYoukaiState(current.youkai) };
  let currentScore = score(current);

  const traitPool = axes.traits ? eligibleTraits(build) : [];
  const skillPool = axes.skills ? skillsForClassSlots(build.mainClass, build.subClass) : [];
  const mainTree = new Set(skillsForClassTree(build.mainClass).map(skill => skill.id));
  const youkaiPool = axes.youkai && canContractYoukai(build, baseClassOf) ? YOUKAI : [];

  for (let pass = 0; pass < passes; pass++) {
    if (options.isCancelled?.()) break;
    const passStart = currentScore;

    if (traitPool.length) {
      const result = buyTraits(build, current, currentScore, score, traitPool, budget.traitPoints, options.isCancelled);
      current = result.loadout;
      currentScore = result.score;
    }

    if (skillPool.length) {
      const result = buySkills(current, currentScore, score, skillPool, mainTree, build, options.isCancelled);
      current = result.loadout;
      currentScore = result.score;
    }

    if (youkaiPool.length) {
      /*
       * Install needs a rank in the Install skill, which is a skill-axis
       * purchase. With the skill axis off the search may still Install using a
       * rank the build already has, but it may not quietly spend from a budget
       * the user did not open; an axis left off means "keep what I chose".
       */
      const canRankInstall = axes.skills
        && skillsForClassSlots(build.mainClass, build.subClass).some(skill => skill.id === INSTALL_SKILL_ID);
      const canRankSyncMind = axes.skills
        && skillsForClassSlots(build.mainClass, build.subClass).some(skill => skill.id === 'sync-mind');
      const result = buyYoukai(current, currentScore, score, {
        cap: budget.youkaiCap,
        skillPointsPerClass: budget.skillPointsPerClass,
        canRankInstall,
        canRankSyncMind,
        installSlot: slotForSkill(mainTree, INSTALL_SKILL_ID),
        syncMindSlot: slotForSkill(mainTree, 'sync-mind'),
        build,
        isCancelled: options.isCancelled,
      });
      current = result.loadout;
      currentScore = result.score;
    }

    if (currentScore <= passStart + EPSILON) break;
  }

  return current;
}

interface Step {
  loadout: Loadout;
  score: number;
}

function buyTraits(
  build: BuildState,
  start: Loadout,
  startScore: number,
  score: LoadoutScore,
  pool: string[],
  budget: number,
  isCancelled?: () => boolean,
): Step {
  let current = start;
  let currentScore = startScore;

  for (;;) {
    if (isCancelled?.()) break;
    const spent = traitPointsSpent(current.traits, build.race, build.history);
    let best: Step | null = null;
    for (const id of pool) {
      if (current.traits.includes(id)) continue;
      const trait = TRAITS.find(item => item.id === id);
      if (!trait || spent + traitCost(trait, build.race) > budget) continue;
      const candidate: Loadout = { ...current, traits: [...current.traits, id] };
      const value = score(candidate);
      if (value > (best?.score ?? currentScore) + EPSILON) best = { loadout: candidate, score: value };
    }
    if (!best) break;
    current = best.loadout;
    currentScore = best.score;
  }

  return { loadout: current, score: currentScore };
}

function buySkills(
  start: Loadout,
  startScore: number,
  score: LoadoutScore,
  pool: ReturnType<typeof skillsForClassSlots>,
  mainTree: Set<string>,
  build: BuildState,
  isCancelled?: () => boolean,
): Step {
  let current = start;
  let currentScore = startScore;
  // Which class's allowance each skill is charged to. Fixed for the run, so it
  // is resolved once rather than per purchase.
  const poolOf = new Map<string, string>();
  for (const classPool of buildSkillPools(build.mainClass, build.subClass)) {
    for (const skill of classPool.skills) poolOf.set(skill.id, classPool.className);
  }

  for (;;) {
    if (isCancelled?.()) break;
    const spentByPool = new Map(
      skillPoolSpends(build.mainClass, build.subClass, current.skillRanks, build.destiny, { ...build, traits: current.traits })
        .map(entry => [entry.className, entry.spent]),
    );
    if ([...spentByPool.entries()].every(([name, spent]) => spent + SKILL_POINT_COST_PER_RANK > classSkillPointBudget(name, build.destiny, { ...build, traits: current.traits }))) break;
    const merged = mergeSkillRanks(current.skillRanks);
    let best: Step | null = null;

    for (const skill of pool) {
      const rank = merged[skill.id] ?? 0;
      if (rank >= skill.maxRank) continue;
      // Room is checked in the skill's own class, not across the build.
      const owner = poolOf.get(skill.id);
      if (!owner || (spentByPool.get(owner) ?? 0) + SKILL_POINT_COST_PER_RANK > classSkillPointBudget(owner, build.destiny, { ...build, traits: current.traits })) continue;
      /*
       * Only 46 of 951 skills have a prerequisite, and resolving the chain means
       * re-pricing every pool. The overwhelmingly common case is a plain rank
       * bump, so it skips straight past all of that.
       */
      const slot = slotForSkill(mainTree, skill.id);
      const skillRanks = skill.requires?.length
        ? withPrerequisites(current.skillRanks, skill.id, rank + 1, {
          ...build,
          traits: current.traits,
          mainClass: build.mainClass,
          subClass: build.subClass,
          destiny: build.destiny,
          slotFor: id => slotForSkill(mainTree, id),
        })
        : { ...current.skillRanks, [slot]: { ...current.skillRanks[slot], [skill.id]: rank + 1 } };
      if (!skillRanks) continue;
      const candidate: Loadout = { ...current, skillRanks };
      const value = score(candidate);
      if (value > (best?.score ?? currentScore) + EPSILON) best = { loadout: candidate, score: value };
    }

    if (!best) break;
    current = best.loadout;
    currentScore = best.score;
  }

  return { loadout: current, score: currentScore };
}

const INSTALL_SKILL_ID = 'install';
const CHAOTIC_FORM_SKILL_ID = 'chaotic-form';

/**
 * Whether the build can change bodies mid-fight.
 *
 * Chaotic Form installs a Youkai the moment you use its Evoke skill, so a
 * Shapeshifter does not have one Install; it has every race it contracted,
 * swappable at will. That inverts what a good roster looks like, which is why
 * the tie-break below asks this question.
 */
export function canSwapInstall(build: BuildState): boolean {
  return (mergeSkillRanks(build.skillRanks)[CHAOTIC_FORM_SKILL_ID] ?? 0) >= 1;
}

/**
 * Ranks two equally-scoring contracts, since the calculator cannot separate them
 * on numbers alone.
 *
 * A contract that is not installed moves nothing the model tracks (Evoke skills
 * are prose with no parsed values), so every candidate ties, and the fill would
 * otherwise take whatever came first in the data file. These two rules are
 * stated preferences rather than measured value, and they point in opposite
 * directions on purpose:
 *
 * - A build that can swap installs wants **breadth**. Each new race is another
 *   body to shift into, and several Shapeshifter skills are gated on the race
 *   currently worn.
 * - Any other Summoner installs once and stays there, so it wants **depth**:
 *   Youkai sharing a race, because one Affinity rank lifts all of them.
 */
interface YoukaiOptions {
  cap: number;
  skillPointsPerClass: number;
  canRankInstall: boolean;
  canRankSyncMind: boolean;
  installSlot: 'main' | 'sub';
  syncMindSlot: 'main' | 'sub';
  build: BuildState;
  isCancelled?: () => boolean;
}

/** Contract, wear, and pay for the Install skill, as one indivisible move. */
function installMove(current: Loadout, youkaiId: string, options: YoukaiOptions): Loadout | null {
  const youkai = contractYoukai(current.youkai, youkaiId);
  if (youkai.contracted.length > options.cap) return null;

  let skillRanks = current.skillRanks;
  if ((mergeSkillRanks(skillRanks)[INSTALL_SKILL_ID] ?? 0) < 1) {
    // No rank and no permission to buy one: Install is simply unavailable here.
    if (!options.canRankInstall) return null;
    /*
     * Buys the whole chain (Install needs Sync-Mind rank 1, which needs The
     * Contract rank 1) out of the Summoner allowance those three share, rather
     * than an Install rank the build could not legally hold.
     */
    const withChain = withPrerequisites(skillRanks, INSTALL_SKILL_ID, 1, {
      ...options.build,
      traits: current.traits,
      mainClass: options.build.mainClass,
      subClass: options.build.subClass,
      destiny: options.build.destiny,
      slotFor: () => options.installSlot,
    });
    if (!withChain) return null;
    skillRanks = withChain;
  }

  return { ...current, skillRanks, youkai: { contracted: youkai.contracted, installed: youkaiId } };
}

/**
 * Contracts Youkai, and decides which one to wear.
 *
 * Install is bought as one indivisible move (contract, wear it, and rank the
 * Install skill that permits it) for the same reason the stat search buys APT
 * in whole breakpoints. Taken a step at a time none of the three pays anything:
 * a contract on its own moves no number the calculator tracks, an unranked
 * Install does nothing, and Install with nothing contracted does nothing. A
 * greedy search that only ever takes improving single steps can therefore never
 * reach the combination, which is the largest stat swing a Summoner has.
 *
 * The plain contract loop that follows exists because contracts are free: they
 * cost no budget, only cap space. Filling the rest of the roster with the best
 * non-worsening picks is what a player would do, and the ones the calculator
 * cannot separate are exactly the ones whose value is in Evoke skills it has no
 * numbers for.
 */
function withSyncMind(current: Loadout, rank: 1 | 2, options: YoukaiOptions): Loadout | null {
  if ((mergeSkillRanks(current.skillRanks)['sync-mind'] ?? 0) >= rank) return current;
  if (!options.canRankSyncMind) return null;
  const skillRanks = withPrerequisites(current.skillRanks, 'sync-mind', rank, {
    ...options.build,
    traits: current.traits,
    mainClass: options.build.mainClass,
    subClass: options.build.subClass,
    destiny: options.build.destiny,
    slotFor: () => options.syncMindSlot,
  });
  return skillRanks ? { ...current, skillRanks } : null;
}

const YOUKAI_PACKAGES = [
  ['chun', 'haku', 'hatsu'],
  ['snow-crow', 'yukionna'],
] as const;

function loadoutKey(loadout: Loadout): string {
  const ranks = mergeSkillRanks(loadout.skillRanks);
  return `${[...loadout.youkai.contracted].sort().join(',')}|${loadout.youkai.installed ?? ''}|${ranks['sync-mind'] ?? 0}|${ranks.install ?? 0}`;
}

function youkaiNeighbors(current: Loadout, options: YoukaiOptions): Loadout[] {
  const neighbors: Loadout[] = [];
  for (const rank of [1, 2] as const) {
    const ranked = withSyncMind(current, rank, options);
    if (ranked && loadoutKey(ranked) !== loadoutKey(current)) neighbors.push(ranked);
  }

  // Only the ascended representative is offered for a family that has one.
  const pool = YOUKAI.filter(youkai => !ascendedYoukaiFor(youkai) || Boolean(youkai.baseFormId));
  for (const youkai of pool) {
    const contracted = contractYoukai(current.youkai, youkai.id);
    if (contracted.contracted.length <= options.cap && contracted.contracted.join('|') !== current.youkai.contracted.join('|')) {
      const plain = { ...current, youkai: contracted };
      neighbors.push(plain);
      for (const rank of [1, 2] as const) {
        const ranked = withSyncMind(plain, rank, options);
        if (ranked) neighbors.push(ranked);
      }
    }
    const installed = installMove(current, youkai.id, options);
    if (installed && loadoutKey(installed) !== loadoutKey(current)) neighbors.push(installed);
  }

  for (const ids of YOUKAI_PACKAGES) {
    let state = current.youkai;
    for (const id of ids) state = contractYoukai(state, id);
    if (state.contracted.length > options.cap || state.contracted.join('|') === current.youkai.contracted.join('|')) continue;
    const packaged = withSyncMind({ ...current, youkai: state }, 2, options);
    if (packaged) neighbors.push(packaged);
  }
  return neighbors;
}

/**
 * Bounded beam over contract families and access packages. Only improving moves
 * enter the beam, so unused cap stays empty and every addition has a reason in
 * the same score used to choose it.
 */
function buyYoukai(start: Loadout, startScore: number, score: LoadoutScore, options: YoukaiOptions): Step {
  const width = 48;
  let beam: Step[] = [{ loadout: start, score: startScore }];
  let best = beam[0];
  const seen = new Set([loadoutKey(start)]);
  const maxDepth = Math.max(2, options.cap - start.youkai.contracted.length + 4);
  for (let depth = 0; depth < maxDepth && !options.isCancelled?.(); depth++) {
    const next: Step[] = [];
    for (const state of beam) {
      for (const candidate of youkaiNeighbors(state.loadout, options)) {
        const key = loadoutKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        const value = score(candidate);
        if (value <= state.score + EPSILON) continue;
        const step = { loadout: candidate, score: value };
        next.push(step);
        if (value > best.score + EPSILON || (Math.abs(value - best.score) <= EPSILON && key < loadoutKey(best.loadout))) best = step;
      }
    }
    if (!next.length) break;
    next.sort((a, b) => b.score - a.score || loadoutKey(a.loadout).localeCompare(loadoutKey(b.loadout)));
    beam = next.slice(0, width);
  }
  return best;
}

/**
 * Everything wrong with how a build has filled its six equipment slots.
 *
 * Both rules are ones the game enforces and a build file cannot express on its
 * own, so they are checked rather than assumed:
 *
 *   Slot 3 holds a hands piece **or** an off-hand weapon, never both.
 *
 *   The two accessory slots may not hold the same accessory. Identity is the
 *   item, not the kind: two different rings are fine, two Magician's Rings are
 *   not.
 */
export function equipmentViolations(build: BuildState): string[] {
  const problems: string[] = [];
  const equipment = build.equipment;

  if (equipment.offHandWeapon && equipment.hands?.itemName) {
    problems.push(
      `Slot 3 holds both an off-hand weapon and ${equipment.hands.itemName}. It can take one or the other.`,
    );
  }
  if (hasDuplicateAccessory(equipment)) {
    problems.push(`Both accessory slots hold ${equipment.accessory1?.itemName}. The same accessory cannot be equipped twice.`);
  }
  return problems;
}

/** Everything wrong with a build's loadout, for candidate validation. */
export function loadoutViolations(build: BuildState, youkaiCap: number): string[] {
  return [
    ...traitViolations(build),
    ...skillViolations(build),
    ...talentViolations(build),
    ...youkaiViolations(build, youkaiCap),
    ...equipmentViolations(build),
  ];
}

/** A compact description of what the search chose, for the results panel. */
export type LoadoutSummary = OptimizationLoadoutSummary;

export function summarizeLoadout(
  build: BuildState,
  youkaiCap: number,
  options: { originalYoukai?: YoukaiState; optimizationContext?: YoukaiOptimizationContext } = {},
): LoadoutSummary {
  const merged = mergeSkillRanks(build.skillRanks);
  const pools = skillPoolSpends(build.mainClass, build.subClass, build.skillRanks, build.destiny, build);
  const original = normalizeYoukaiState(options.originalYoukai ?? build.youkai);
  const originalIds = new Set(original.contracted);
  const rosterFit = evaluateYoukaiRosterFit(build, options.optimizationContext ?? {}, originalIds);
  return {
    traits: (build.traits ?? []).flatMap(id => {
      const trait = TRAITS.find(item => item.id === id);
      return trait ? [{ id, name: trait.name }] : [];
    }),
    skills: pools
      .flatMap(pool => pool.skills
        .filter(skill => (merged[skill.id] ?? 0) > 0)
        .map(skill => ({
          id: skill.id,
          name: skill.name,
          rank: merged[skill.id] ?? 0,
          maxRank: skill.maxRank,
          pool: pool.className,
        })))
      .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name)),
    contracted: build.youkai.contracted.flatMap(id => {
      const youkai = youkaiById(id);
      const originalFamily = original.contracted.find(originalId => {
        const originalYoukai = youkaiById(originalId);
        return originalYoukai && youkai && (originalYoukai.baseFormId ?? originalYoukai.id) === (youkai.baseFormId ?? youkai.id);
      });
      const source = originalIds.has(id) ? 'existing' as const
        : originalFamily ? 'ascended-upgrade' as const
          : 'added' as const;
      const reasons = source === 'existing' ? [] : [...(rosterFit.reasons.get(id) ?? [])];
      if (source === 'ascended-upgrade') reasons.unshift({
        skillName: 'Ascension', access: 'ascended-upgrade', basis: 'rule',
        summary: `${youkai?.name ?? id} replaces the existing base-form contract without using another slot.`,
      });
      return youkai
        ? [{ id, name: youkai.name, race: youkai.race, installed: build.youkai.installed === id, source, reasons }]
        : [];
    }),
    traitPointsSpent: traitPointsSpent(build.traits ?? [], build.race, build.history),
    traitPointBudget: traitPointBudget(build.characterLevel),
    skillPools: pools.map(pool => ({ className: pool.className, spent: pool.spent, budget: pool.budget })),
    skillPointsSpent: buildSkillPointsSpent(build.mainClass, build.subClass, build.skillRanks),
    skillPointBudget: buildSkillPointBudget(build.mainClass, build.subClass, build.destiny, build),
    youkaiCap: Math.max(0, Math.floor(youkaiCap)),
    destiny: build.destiny,
    youkaiRaces: [...new Set(build.youkai.contracted.flatMap(id => {
      const youkai = youkaiById(id);
      return youkai ? [youkai.race] : [];
    }))].sort(),
    canSwapInstall: canSwapInstall(build),
  };
}
