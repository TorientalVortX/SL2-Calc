import { describe, expect, it } from 'vitest';
import type { BuildState, OptimizationRequest } from '../types';
import { parseBuildFile } from '../domain/buildPersistence';
import { ARMORS } from '../data/armors';
import { findWeaponByName } from '../domain/equipment';
import { OPTIMIZER_REFERENCE_PROFILE_BY_ID } from '../data/optimizerProfiles';
import { OPTIMIZATION_PRESETS } from './StatOptimizer';
import { analyzeAptitudeAllocation, candidateMechanicallyDominates, optimizeBuildV2, validateV2Candidate } from './BuildOptimizerV2';

function baseBuild(level = 3): BuildState {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'V2 fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Soldier', characterLevel: level, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

function request(build = baseBuild(), overrides: Partial<OptimizationRequest> = {}): OptimizationRequest {
  return {
    build,
    preset: OPTIMIZATION_PRESETS.hybrid,
    constraints: [],
    primaryClass: build.mainClass,
    searchClasses: true,
    assumedMainPassiveRank: 3,
    assumedSubPassiveRank: 3,
    resultLimit: 3,
    engine: 'v2',
    defensePlan: 'hybrid',
    extraPackage: 'none',
    searchDepth: 'standard',
    ...overrides,
  };
}

describe('build optimizer V2', () => {
  it('is deterministic, preserves fixed character choices, and returns canonical equipment', () => {
    const build = baseBuild(2);
    const first = optimizeBuildV2(request(build));
    const second = optimizeBuildV2(request(build));
    expect(first.candidates.map(candidate => candidate.patch)).toEqual(second.candidates.map(candidate => candidate.patch));
    expect(first.candidates).toHaveLength(3);
    for (const candidate of first.candidates) {
      expect(candidate.patch.mainClass).toBe(build.mainClass);
      expect(candidate.evaluation.pointsSpent).toBe(candidate.evaluation.pointBudget);
      expect(findWeaponByName(candidate.patch.equipment?.primaryWeapon?.selectedWeaponName)).toBeTruthy();
      expect(ARMORS[candidate.patch.equipment?.armorName ?? '']).toBeTruthy();
      expect(validateV2Candidate(candidate, request(build))).toEqual([]);
    }
  });

  it('enforces subclass, weapon, armor, and category locks', () => {
    const build = baseBuild(2);
    const locked = request(build, {
      locks: { subClass: 'Ghost', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    });
    const candidate = optimizeBuildV2(locked).candidates[0];
    expect(candidate.patch.subClass).toBe('Ghost');
    expect(candidate.patch.equipment?.primaryWeapon?.selectedWeaponName).toBe('Spine Leash');
    expect(candidate.patch.equipment?.armorName).toBe('Breastplate');
    expect(Object.values(candidate.patch.equipment?.armorConditionalBonuses ?? {})).not.toContain(true);
  });

  it('evaluates APT by exact global-bonus breakpoints instead of a profile screenshot target', () => {
    const profile = OPTIMIZER_REFERENCE_PROFILE_BY_ID['amalgama-shapeshifter-ghost'];
    const build = baseBuild(60);
    build.race = profile.race;
    build.subrace = profile.subrace;
    build.mainClass = profile.primaryClass;
    build.subClass = profile.secondaryClass;
    const result = optimizeBuildV2(request(build, {
      referenceProfileId: profile.id,
      searchClasses: false,
      locks: { subClass: profile.secondaryClass, weaponName: profile.weapon.name, armorName: 'Breastplate' },
    }));
    const candidate = result.candidates[0];
    expect(candidate.feasible).toBe(true);
    expect(candidate.aptitudeReport?.globalStatBonus).toBe(Math.floor(candidate.evaluation.scaledStats.apt / 6));
    expect(candidate.aptitudeReport?.redundantInvestedPoints).toBe(0);
    expect(candidate.guideValidation.checks.find(check => check.id === 'aptitude')?.summary).toContain('breakpoint');
    expect(candidate.guideValidation.checks.find(check => check.id === 'aptitude')?.summary).not.toContain(profile.name);
  });

  it('identifies stranded APT investment exactly', () => {
    const build = baseBuild(60);
    const startingBonus = Math.floor(analyzeAptitudeAllocation(build).scaledAptitude / 6);
    let breakpoint = 0;
    for (let aptitude = 1; aptitude <= 80; aptitude++) {
      build.addedStats.apt = aptitude;
      if (Math.floor(analyzeAptitudeAllocation(build).scaledAptitude / 6) > startingBonus) { breakpoint = aptitude; break; }
    }
    expect(breakpoint).toBeGreaterThan(0);
    build.addedStats.apt = breakpoint + 2;
    const report = analyzeAptitudeAllocation(build);
    expect(report.retainedBreakpointInvestment).toBe(breakpoint);
    expect(report.redundantInvestedPoints).toBe(2);
    expect(report.efficientBreakpoint).toBe(false);
  });

  it('returns a mechanically non-dominated frontier even when reference evidence is selected', () => {
    const profile = OPTIMIZER_REFERENCE_PROFILE_BY_ID['amalgama-ghost-black-knight'];
    const build = baseBuild(10);
    build.race = profile.race;
    build.subrace = profile.subrace;
    build.mainClass = profile.primaryClass;
    const result = optimizeBuildV2(request(build, { referenceProfileId: profile.id }));
    for (const candidate of result.candidates) {
      expect(candidate.aptitudeReport?.redundantInvestedPoints).toBe(0);
      expect(result.candidates.some(other => other.id !== candidate.id && candidateMechanicallyDominates(other, candidate))).toBe(false);
    }
  });

  it('treats an Evade plan as a reliable minimum and saturates at the preferred target', () => {
    const build = baseBuild(60);
    build.bonusEvade = 50;
    const evadeRequest = request(build, {
      preset: OPTIMIZATION_PRESETS.evade,
      defensePlan: 'evade',
      defenseContract: { minimumEvade: 140, preferredEvade: 150, reliableBonusEvade: 20, requirePartialBattleWeight: true },
    });
    const result = optimizeBuildV2(evadeRequest);
    for (const candidate of result.candidates) {
      expect(candidate.defenseScenario?.reliableBonusEvade).toBe(20);
      expect(candidate.defenseScenario?.reliableEvade).toBeGreaterThanOrEqual(140);
      expect(candidate.defenseScenario?.configuredEvade).toBeGreaterThanOrEqual(candidate.defenseScenario?.reliableEvade ?? 0);
      expect(candidate.defenseScenario?.battleWeightRemaining).toBeGreaterThanOrEqual(0);
      expect(candidate.feasible).toBe(true);
    }
  }, 15_000);

  it('scores native torso defenses and excludes unverified armor conditionals', () => {
    const conditionalArmor = Object.values(ARMORS).find(armor => Object.values(armor.conditionalBonuses ?? {}).some(bonus => (bonus.evade ?? 0) > 0));
    expect(conditionalArmor).toBeTruthy();
    const conditionalKey = Object.keys(conditionalArmor?.conditionalBonuses ?? {})[0];
    const build = baseBuild(10);
    build.equipment.armorName = conditionalArmor?.name ?? null;
    build.equipment.armorConditionalBonuses = { [conditionalKey]: true };
    const shared = {
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: conditionalArmor?.name },
      defensePlan: 'evade' as const,
      preset: OPTIMIZATION_PRESETS.evade,
      searchClasses: false,
    };
    const baseline = optimizeBuildV2(request(build, { ...shared, defenseContract: { minimumEvade: 0, preferredEvade: 200, armorConditionalPolicy: 'baseline' } })).candidates[0];
    const verified = optimizeBuildV2(request(build, { ...shared, defenseContract: { minimumEvade: 0, preferredEvade: 200, armorConditionalPolicy: 'verified-current' } })).candidates[0];
    expect(baseline.defenseScenario?.armor).toBe(conditionalArmor?.armor);
    expect(baseline.defenseScenario?.magicArmor).toBe(conditionalArmor?.magicArmor);
    expect(verified.defenseScenario?.reliableEvade).toBeGreaterThan(baseline.defenseScenario?.reliableEvade ?? 0);
  });
});
