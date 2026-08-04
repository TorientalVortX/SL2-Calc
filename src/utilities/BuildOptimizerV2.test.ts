import { describe, expect, it } from 'vitest';
import type { BuildState, OptimizationRequest } from '../types';
import { parseBuildFile } from '../domain/buildPersistence';
import { ARMORS } from '../data/armors';
import { findWeaponByName } from '../domain/equipment';
import { ENABLED_OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILE_BY_ID } from '../data/optimizerProfiles';
import { OPTIMIZATION_PRESETS } from './StatOptimizer';
import { optimizeBuildV2, validateV2Candidate } from './BuildOptimizerV2';

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

  it('uses an applicable profile APT target instead of universally enforcing 48', () => {
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
    expect(Math.floor(candidate.evaluation.scaledStats.apt)).not.toBe(48);
    expect(candidate.feasible).toBe(true);
    expect(candidate.guideValidation.checks.find(check => check.id === 'aptitude')?.summary).toContain(profile.name);
  });

  it('recovers represented popular subclass/weapon evidence in the top three and reports missing items', () => {
    for (const profile of ENABLED_OPTIMIZER_REFERENCE_PROFILES) {
      const build = baseBuild(2);
      build.race = profile.race;
      build.subrace = profile.subrace;
      build.mainClass = profile.primaryClass;
      build.subClass = profile.secondaryClass;
      const result = optimizeBuildV2(request(build, { referenceProfileId: profile.id }));
      if (!profile.canonicalWeaponId) {
        expect(profile.dataGaps?.some(gap => gap.includes(profile.weapon.name)), profile.id).toBe(true);
        continue;
      }
      expect(result.candidates.some(candidate => candidate.patch.subClass === profile.secondaryClass
        && candidate.patch.equipment?.primaryWeapon?.selectedWeaponName === profile.weapon.name), profile.id).toBe(true);
    }
  });
});
