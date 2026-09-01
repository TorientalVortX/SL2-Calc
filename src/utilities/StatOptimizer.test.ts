import { describe, expect, it } from 'vitest';
import type { OptimizationPreset, StatRecord, WeaponConfig } from '../types';
import { parseBuildFile } from '../domain/buildPersistence';
import { OPTIMIZATION_PRESETS, normalizeWeaponCategory, optimizeBuild } from './StatOptimizer';
import { CLASSES } from '../data/classes';
import { ENABLED_OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILE_BY_ID } from '../data/optimizerProfiles';

const zeroScaling = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });

function baseBuild(level = 3) {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Optimizer fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Soldier', characterLevel: level, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

function weapon(scaling: StatRecord): WeaponConfig {
  return {
    selectedWeaponName: null, weaponType: 'Sword', basePower: 0, baseCrit: 0, baseHit: 80, baseWeight: 10,
    baseCritDamage: 150, material: 'None', part1: 'None', part2: 'None', part3: 'None', enchantment: 'None',
    upgradeLevel: 0, upgradePoints: { power: 0, critical: 0, accuracy: 0, durability: 0 }, upgradeBudget: 5, rarity: 10, powerQuality: false, critQuality: false, hitQuality: false, weightPlus: false,
    weightMinus: false, sentimentality: false, twoHandedSkillRank: 0, customScaling: scaling,
  };
}

/*
 * Weighted on SWA, not Power. Power is the weapon's own number and carries no
 * stat scaling, so it cannot respond to which stat a weapon scales off, SWA is
 * the metric that can.
 */
const powerPreset: OptimizationPreset = { id: 'power', name: 'Power', description: '', metricWeights: { weaponSwa: 10 } };
const rawPowerPreset: OptimizationPreset = { id: 'raw-power', name: 'Raw Power', description: '', metricWeights: { weaponPower: 10 } };

describe('deterministic stat optimizer', () => {
  it('returns a repeatable exact-budget allocation', () => {
    const request = { build: baseBuild(), preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], searchClasses: false, assumedMainPassiveRank: 0, assumedSubPassiveRank: 0, resultLimit: 3 };
    const first = optimizeBuild(request);
    const second = optimizeBuild(request);
    expect(first.candidates[0].patch).toEqual(second.candidates[0].patch);
    expect(first.candidates[0].evaluation.pointsSpent).toBe(12);
    expect(Object.entries(first.candidates[0].patch.addedStats).every(([stat, value]) => value <= first.candidates[0].evaluation.maxInvestedStats[stat as keyof StatRecord])).toBe(true);
  });

  it('reports exact deficits for infeasible minimums', () => {
    const result = optimizeBuild({ build: baseBuild(), preset: OPTIMIZATION_PRESETS.tank, constraints: [{ metric: 'maxHP', minimum: 99999 }], searchClasses: false, assumedMainPassiveRank: 0, assumedSubPassiveRank: 0 });
    expect(result.candidates[0].feasible).toBe(false);
    expect(result.candidates[0].constraintDeficits.maxHP).toBeGreaterThan(0);
  });

  it('responds to configured weapon scaling', () => {
    const strBuild = baseBuild(5);
    strBuild.equipment.primaryWeapon = weapon({ ...zeroScaling(), str: 100 });
    const wilBuild = baseBuild(5);
    wilBuild.equipment.primaryWeapon = weapon({ ...zeroScaling(), wil: 100 });
    const common = { preset: powerPreset, constraints: [], searchClasses: false, assumedMainPassiveRank: 0, assumedSubPassiveRank: 0 };
    const str = optimizeBuild({ ...common, build: strBuild }).candidates[0].patch.addedStats;
    const wil = optimizeBuild({ ...common, build: wilBuild }).candidates[0].patch.addedStats;
    expect(str.str).toBeGreaterThan(str.wil);
    expect(wil.wil).toBeGreaterThan(wil.str);
  });

  /*
   * The other half of `SWA = Power + scaling`: Power on its own must be blind to
   * scaling. The two used to be one field, which is what let a stat the weapon
   * does not scale off show up as weapon Power.
   */
  it('does not let weapon Power respond to scaling', () => {
    const strBuild = baseBuild(5);
    strBuild.equipment.primaryWeapon = weapon({ ...zeroScaling(), str: 100 });
    const wilBuild = baseBuild(5);
    wilBuild.equipment.primaryWeapon = weapon({ ...zeroScaling(), wil: 100 });
    const common = { preset: rawPowerPreset, constraints: [], searchClasses: false, assumedMainPassiveRank: 0, assumedSubPassiveRank: 0 };
    const str = optimizeBuild({ ...common, build: strBuild }).candidates[0];
    const wil = optimizeBuild({ ...common, build: wilBuild }).candidates[0];

    expect(str.evaluation.primaryWeapon?.power).toBe(wil.evaluation.primaryWeapon?.power);
    expect(str.evaluation.primaryWeapon?.swa).not.toBe(str.evaluation.primaryWeapon?.power);
  });

  it('returns three stable unique class candidates and normalizes polearms', () => {
    const result = optimizeBuild({ build: baseBuild(1), preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], searchClasses: true, assumedMainPassiveRank: 99, assumedSubPassiveRank: 99, resultLimit: 3 });
    expect(new Set(result.candidates.map(candidate => `${candidate.patch.mainClass}/${candidate.patch.subClass}`)).size).toBe(3);
    expect(result.evaluatedClassPairs).toBe(Object.keys(CLASSES).length ** 2);
    expect(normalizeWeaponCategory('Polearm')).toBe('Spears');
    expect(result.candidates.every(candidate => candidate.patch.mainClassPassive <= 99 && candidate.patch.subClassPassive <= 99)).toBe(true);
  });

  it('locks a user-selected primary class while comparing secondary classes', () => {
    const result = optimizeBuild({
      build: baseBuild(1), preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], primaryClass: 'Ghost',
      searchClasses: true, assumedMainPassiveRank: 5, assumedSubPassiveRank: 5, resultLimit: 3,
    });
    expect(result.evaluatedClassPairs).toBe(Object.keys(CLASSES).length);
    expect(result.candidates.every(candidate => candidate.patch.mainClass === 'Ghost')).toBe(true);
    expect(result.candidates[0].reasoning).toContain('Keeps Ghost in the primary class slot.');
  });

  it('promotes the curated class pairing for a selected reference profile', () => {
    const profile = OPTIMIZER_REFERENCE_PROFILE_BY_ID['amalgama-ghost-black-knight'];
    const build = baseBuild(2);
    build.race = profile.race;
    build.subrace = profile.subrace;
    build.mainClass = profile.primaryClass;
    const result = optimizeBuild({
      build, preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], primaryClass: profile.primaryClass,
      referenceProfileId: profile.id, searchClasses: true, assumedMainPassiveRank: 5, assumedSubPassiveRank: 5, resultLimit: 3,
    });
    expect(result.candidates[0].patch.mainClass).toBe('Ghost');
    expect(result.candidates[0].patch.subClass).toBe('Black Knight');
    expect(result.candidates[0].reasoning.some(reason => reason.includes(profile.name))).toBe(true);
  });

  it('uses reference targets as soft allocation guidance', () => {
    const profile = OPTIMIZER_REFERENCE_PROFILE_BY_ID['mechanation-spellthief-magic-gunner'];
    const build = baseBuild(10);
    build.race = profile.race;
    build.subrace = profile.subrace;
    build.mainClass = profile.primaryClass;
    build.subClass = profile.secondaryClass;
    const common = { build, preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], primaryClass: profile.primaryClass, searchClasses: false, assumedMainPassiveRank: 0, assumedSubPassiveRank: 0 };
    const withoutProfile = optimizeBuild(common).candidates[0].patch.addedStats;
    const withProfile = optimizeBuild({ ...common, referenceProfileId: profile.id }).candidates[0].patch.addedStats;
    const priorityTotal = (stats: StatRecord) => profile.priorityStats.reduce((sum, stat) => sum + stats[stat], 0);
    expect(priorityTotal(withProfile)).toBeGreaterThan(priorityTotal(withoutProfile));
  });

  it('treats the supported SL2BuildInfo endgame baselines as ranking requirements', () => {
    const result = optimizeBuild({
      build: baseBuild(60), preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], searchClasses: false,
      assumedMainPassiveRank: 0, assumedSubPassiveRank: 0,
    });
    const candidate = result.candidates[0];
    expect(Math.floor(candidate.evaluation.scaledStats.apt)).toBe(48);
    expect(Math.floor(candidate.evaluation.scaledStats.ski)).toBeGreaterThanOrEqual(57);
    expect(Math.floor(candidate.evaluation.rawStats.vit)).toBeGreaterThanOrEqual(35);
    expect(candidate.guideValidation.failed).toBe(0);
  });

  it('keeps every enabled community profile runnable as a deterministic regression fixture', () => {
    for (const profile of ENABLED_OPTIMIZER_REFERENCE_PROFILES) {
      const build = baseBuild(1);
      build.race = profile.race;
      build.subrace = profile.subrace;
      build.mainClass = profile.primaryClass;
      build.subClass = profile.secondaryClass;
      build.karakuriYoukai = profile.karakuriYoukai ?? 'None';
      const result = optimizeBuild({
        build, preset: OPTIMIZATION_PRESETS.hybrid, constraints: [], primaryClass: profile.primaryClass,
        referenceProfileId: profile.id, searchClasses: false, assumedMainPassiveRank: 3, assumedSubPassiveRank: 3,
      });
      expect(result.candidates[0].evaluation.pointsSpent, profile.id).toBe(4);
      expect(result.candidates[0].patch.mainClass, profile.id).toBe(profile.primaryClass);
      expect(result.candidates[0].patch.subClass, profile.id).toBe(profile.secondaryClass);
    }
  });
});

describe('preset damage weights', () => {
  /*
   * Regression guard. `weaponPower` used to mean SWA, so every damage preset was
   * written against it. Splitting the two silently made those presets reward the
   * weapon's printed Power and stop rewarding the stat it scales off: the
   * `glass_cannon` preset put zero points into STR on a 100% STR weapon.
   */
  it('weights SWA rather than raw Power for damage', () => {
    for (const preset of Object.values(OPTIMIZATION_PRESETS)) {
      const weights = preset.metricWeights as Record<string, number | undefined>;
      expect(weights.weaponPower ?? 0, `${preset.id} should weight weaponSwa, not weaponPower`).toBe(0);
    }
  });

  it('has at least one preset that rewards scaling investment', () => {
    const damage = Object.values(OPTIMIZATION_PRESETS)
      .filter(preset => (preset.metricWeights as Record<string, number | undefined>).weaponSwa);
    expect(damage.length).toBeGreaterThan(0);
  });

  /*
   * The concrete symptom, end to end: a damage preset on a 100% STR weapon has to
   * buy STR.
   */
  it('invests in the scaling stat under the glass cannon preset', () => {
    const build = baseBuild(20);
    build.equipment.primaryWeapon = weapon({ ...zeroScaling(), str: 100 });
    const result = optimizeBuild({
      build, preset: OPTIMIZATION_PRESETS.glass_cannon, constraints: [],
      searchClasses: false, assumedMainPassiveRank: 0, assumedSubPassiveRank: 0, resultLimit: 1,
    });
    expect(result.candidates[0].patch.addedStats.str).toBeGreaterThan(0);
  });
});
