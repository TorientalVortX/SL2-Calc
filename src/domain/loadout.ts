/**
 * Legality checks for the chosen parts of a build: traits, talents, skill ranks,
 * Youkai contracts and equipment slots. Each returns the problems it finds, or an
 * empty list when the build is legal.
 */
import type { BuildState } from '../types';
import { hasDuplicateAccessory } from '../types';
import { mergeSkillRanks, skillById, skillPoolSpends, skillsForClassSlots } from './skills';
import { TRAITS, traitCheckTarget, traitEligibility, traitPointBudget, traitPointsSpent } from './traits';
import { TALENT_BUDGET, talentSpending } from '../data/talents';
import { conflictingYoukaiFamilies, youkaiById } from './youkai';

/* ------------------------------------------------------------------- traits */

/**
 * Why a build's trait list is not legal, or an empty list when it is.
 *
 * Requirements read base stats, so moving a point out of STR can retroactively
 * disqualify a trait taken when STR was higher.
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
