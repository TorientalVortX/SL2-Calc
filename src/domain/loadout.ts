import type { BuildState } from '../types';
import { hasDuplicateAccessory } from '../types';
import { mergeSkillRanks, skillById, skillPoolSpends, skillsForClassSlots } from './skills';
import { TRAITS, traitCheckTarget, traitEligibility, traitPointBudget, traitPointsSpent } from './traits';
import { TALENT_BUDGET, talentSpending } from '../data/talents';
import { conflictingYoukaiFamilies, youkaiById } from './youkai';

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

/** Ranks, not SP: the wiki's 60 from levels plus 5 from Legend Extension, unscaled by level. */
export const TALENT_POINT_BUDGET = TALENT_BUDGET.pointsFromLevels + TALENT_BUDGET.legendExtensionPoints;

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

export function skillViolations(build: BuildState): string[] {
  const problems: string[] = [];
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
    for (const requirement of skill.requires ?? []) {
      if ((merged[requirement.id] ?? 0) >= requirement.rank) continue;
      const name = skillById(requirement.id)?.name ?? requirement.id;
      problems.push(`${skill.name} needs ${name} at rank ${requirement.rank}.`);
    }
  }
  return problems;
}

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
    if ((mergeSkillRanks(build.skillRanks).install ?? 0) < 1) problems.push('Install is set but the Install skill is unranked.');
  }
  return problems;
}

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
