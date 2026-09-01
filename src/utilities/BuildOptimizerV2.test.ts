import { describe, expect, it } from 'vitest';
import type { BuildState, OptimizationRequest } from '../types';
import { parseBuildFile } from '../domain/buildPersistence';
import { ARMORS } from '../data/armors';
import { findWeaponByName } from '../domain/equipment';
import { OPTIMIZER_REFERENCE_PROFILE_BY_ID } from '../data/optimizerProfiles';
import { evaluateBuild, getBaseClass } from '../domain/buildEvaluation';
import {
  SKILL_POINTS_PER_CLASS,
  SKILL_POINTS_PER_CLASS_DESTINY,
  buildSkillPools,
  skillsForClassSlots,
} from '../domain/skills';
import { traitById, traitCheckTarget, traitEligibility } from '../domain/traits';
import { OPTIMIZATION_PRESETS } from './StatOptimizer';
import { analyzeAptitudeAllocation, candidateMechanicallyDominates, evaluateDamageProfile, optimizeBuildV2, validateV2Candidate, criticalMultiplier, objectiveState, weaponAccessFit, weaponOptimizationEligibility } from './BuildOptimizerV2';

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
  /*
   * Two full optimizer searches in one test, which takes anywhere from 1.3s to
   * 2.9s on the same machine depending on load. Against vitest's 5s default that
   * passes alone and intermittently times out inside the full suite, where it
   * competes with the other files. The work is genuinely this size, so the
   * timeout is raised rather than the coverage cut.
   */
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
  }, 30_000);

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

  it('requires explicit opt-in before recommending Devil\'s Tome', () => {
    const weapon = findWeaponByName("Devil's Tome");
    expect(weapon).toBeTruthy();
    const build = baseBuild(2);
    build.mainClass = 'Shapeshifter';
    build.subClass = 'Shapeshifter';
    const flexible = request(build, { intent: 'Make a flexible multi-element Shapeshifter.' });
    expect(weaponOptimizationEligibility(weapon!, flexible)).toMatchObject({ eligible: false, explicitOptIn: false });
    expect(weaponOptimizationEligibility(weapon!, { ...flexible, intent: 'Make a Nerifian Shapeshifter.' })).toMatchObject({ eligible: true, explicitOptIn: true });
    expect(weaponOptimizationEligibility(weapon!, { ...flexible, locks: { weaponName: "Devil's Tome" } })).toMatchObject({ eligible: true, explicitOptIn: true });
    const automatic = optimizeBuildV2({ ...flexible, searchClasses: false, locks: { weaponType: 'Tome' } });
    expect(automatic.candidates.every(candidate => candidate.patch.equipment?.primaryWeapon?.selectedWeaponName !== "Devil's Tome")).toBe(true);
  });

  it('honors a locked Devil\'s Tome but reports its spell-domain restriction', () => {
    const build = baseBuild(2);
    build.mainClass = 'Shapeshifter';
    build.subClass = 'Shapeshifter';
    const locked = request(build, {
      intent: 'Use my locked weapon.', searchClasses: false,
      locks: { subClass: 'Shapeshifter', weaponName: "Devil's Tome", armorName: 'Breastplate' },
    });
    const candidate = optimizeBuildV2(locked).candidates[0];
    expect(candidate.patch.equipment?.primaryWeapon?.selectedWeaponName).toBe("Devil's Tome");
    expect(candidate.warnings.some(warning => warning.includes('Nerifian domain'))).toBe(true);
    expect(validateV2Candidate(candidate, locked)).toEqual([]);
  });

  it('runs the opponent gauntlet for the pvp preset and only then', () => {
    const build = baseBuild(2);
    const shared = request(build, {
      searchClasses: false,
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    });
    const plain = optimizeBuildV2(shared).candidates[0];
    expect(plain.gauntletReport).toBeUndefined();
    expect(plain.objectives?.pvp).toBeUndefined();

    const pvp = optimizeBuildV2({ ...shared, preset: OPTIMIZATION_PRESETS.pvp }).candidates[0];
    expect(pvp.gauntletReport).toBeTruthy();
    expect(pvp.objectives?.pvp).toBe(pvp.gauntletReport?.aggregateScore);
    expect(pvp.gauntletReport?.aggregateScore).toBeGreaterThanOrEqual(0);
    expect(pvp.gauntletReport?.aggregateScore).toBeLessThanOrEqual(1);
    // One row per enabled community profile, each a bounded matchup.
    expect(pvp.gauntletReport?.opponents.length).toBeGreaterThanOrEqual(7);
    for (const row of pvp.gauntletReport?.opponents ?? []) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(1);
    }
    expect(pvp.reasoning.some(reason => reason.includes('community opponent statlines'))).toBe(true);
  }, 15_000);

  it('runs a counter-build gauntlet against named opponents under any preset', () => {
    const build = baseBuild(2);
    const counter = request(build, {
      searchClasses: false,
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: 'Breastplate' },
      gauntletOpponentIds: ['amalgama-ghost-black-knight'],
    });
    // Hybrid preset, not pvp: naming targets is itself the gauntlet opt-in.
    const candidate = optimizeBuildV2(counter).candidates[0];
    expect(candidate.gauntletReport?.opponents.map(row => row.opponentId)).toEqual(['amalgama-ghost-black-knight']);
    expect(candidate.objectives?.pvp).toBe(candidate.gauntletReport?.aggregateScore);
    expect(candidate.gauntletReport?.weakestOpponentId).toBe('amalgama-ghost-black-knight');
  }, 15_000);

  it('allocates against supplied SWA and elemental attack formulas', () => {
    const build = baseBuild(60);
    build.mainClass = 'Shapeshifter';
    build.subClass = 'Shinobi';
    const damageProfile = {
      skills: [
        { label: 'Pure fire skill', swaPercent: 0, element: 'Fire' as const, elementalAttackPercent: 250, weight: 1 },
        { label: 'Mixed fire skill', swaPercent: 100, element: 'Fire' as const, elementalAttackPercent: 150, weight: 1 },
      ],
    };
    const shared = request(build, {
      preset: OPTIMIZATION_PRESETS.evade, searchClasses: false, extraPackage: 'critical',
      locks: { subClass: 'Shinobi', weaponName: "Devil's Tome", armorName: 'Embroidered Flamedance Gi' },
      constraints: [{ metric: 'youkaiCap', minimum: 8 }, { metric: 'weaponCritical', minimum: 80 }],
      defensePlan: 'evade', defenseContract: { minimumEvade: 150, preferredEvade: 200, reliableBonusEvade: 50 },
      intent: "Use Devil's Tome for a Nerifian fire build.",
    });
    const generic = optimizeBuildV2(shared).candidates[0];
    const formula = optimizeBuildV2({ ...shared, damageProfile }).candidates[0];
    const genericDamage = evaluateDamageProfile(generic.evaluation, damageProfile);
    expect(formula.damageReport?.skills.map(skill => skill.modeledTotal)).toHaveLength(2);
    expect(formula.damageReport?.weightedScore).toBeGreaterThanOrEqual(genericDamage?.weightedScore ?? 0);
    expect(formula.evaluation.elementalAttack.Fire).toBeGreaterThanOrEqual(generic.evaluation.elementalAttack.Fire);
    expect(formula.reasoning.some(reason => reason.includes('youkaiCap ≥ 8'))).toBe(true);
  }, 15_000);

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
    expect(candidate.aptitudeReport?.globalStatBonus).toBeGreaterThanOrEqual(8);
    expect(candidate.aptitudeReport?.globalStatsAffected).toBe(11);
    expect(candidate.aptitudeReport?.redundantInvestedPoints).toBe(0);
    expect([null, 11]).toContain(candidate.aptitudeReport?.nextBreakpointRawStatGain);
    if (candidate.aptitudeReport?.nextBreakpointScaledStatGain !== null) expect(candidate.aptitudeReport?.nextBreakpointScaledStatGain).toBeGreaterThan(0);
    expect(candidate.aptitudeReport?.nextBreakpointScaledEfficient).not.toBe(true);
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
  }, 30_000);

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
    // Budgets here cover a full optimizer search competing with the rest of the
    // suite for cores, not the search in isolation.
  }, 45_000);

  it('uses the defense contract reliable bonus independently of the current calculator bonus', () => {
    const build = baseBuild(10);
    build.bonusEvade = 0;
    const candidate = optimizeBuildV2(request(build, {
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: 'Breastplate' }, searchClasses: false,
      defensePlan: 'evade', defenseContract: { minimumEvade: 0, preferredEvade: 200, reliableBonusEvade: 50 },
    })).candidates[0];
    expect(candidate.defenseScenario?.reliableBonusEvade).toBe(50);
    expect(candidate.defenseScenario?.reliableEvade).toBe((candidate.defenseScenario?.baselineEvade ?? 0) + 50);
    expect(candidate.defenseScenario?.configuredEvade).toBe(candidate.defenseScenario?.baselineEvade);
  });

  it('leaves traits, skills and Youkai alone when no loadout axis is requested', () => {
    const build = baseBuild(60);
    build.mainClass = 'Shapeshifter';
    build.subClass = 'Grand Summoner';
    const candidate = optimizeBuildV2(request(build, {
      searchClasses: false,
      locks: { subClass: 'Grand Summoner', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    })).candidates[0];
    expect(candidate.loadout?.traits).toEqual([]);
    expect(candidate.loadout?.skills).toEqual([]);
    expect(candidate.loadout?.contracted).toEqual([]);
  }, 30_000);

  it('buys a stat-bearing trait its race qualifies for, within budget', () => {
    // Oni Heritage is one of the three traits the wiki states as a flat stat
    // bonus rather than prose, so it is one of the few the model can value.
    const build = baseBuild(60);
    build.race = 'Oni';
    build.subrace = 'Oni';
    const optimizerRequest = request(build, {
      searchClasses: false,
      searchLoadout: { traits: true },
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    });
    const candidate = optimizeBuildV2(optimizerRequest).candidates[0];
    const loadout = candidate.loadout!;
    expect(loadout.traits.map(trait => trait.id)).toContain('oni-heritage-red');
    expect(loadout.traitPointsSpent).toBeLessThanOrEqual(loadout.traitPointBudget);
    expect(candidate.patch.traits).toHaveLength(loadout.traits.length);
    expect(validateV2Candidate(candidate, optimizerRequest)).toEqual([]);
  }, 60_000);

  it('keeps every bought trait eligible under the allocation it finally settles on', () => {
    // The guard that matters: requirements read base stats, and the stat pass
    // that runs after the loadout pass is free to move them.
    const build = baseBuild(60);
    build.race = 'Oni';
    build.subrace = 'Oni';
    const candidate = optimizeBuildV2(request(build, {
      searchClasses: false,
      searchLoadout: { traits: true },
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    })).candidates[0];
    const target = traitCheckTarget({ ...build, addedStats: candidate.patch.addedStats });
    for (const taken of candidate.loadout!.traits) {
      expect(traitEligibility(traitById(taken.id)!, target).eligible).toBe(true);
    }
  }, 60_000);

  it('ranks only skills the class pair can reach, inside the Destiny-aware budget', () => {
    const build = baseBuild(60);
    build.mainClass = 'Shapeshifter';
    build.subClass = 'Grand Summoner';
    const shared = {
      searchClasses: false,
      searchLoadout: { skills: true },
      locks: { subClass: 'Grand Summoner', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    };
    // Three allowances, not one pool: Shapeshifter, Grand Summoner, and the
    // Summoner base they share.
    const poolCount = buildSkillPools('Shapeshifter', 'Grand Summoner').length;
    expect(poolCount).toBe(3);

    const plain = optimizeBuildV2(request(build, shared)).candidates[0];
    expect(plain.loadout?.skillPools).toHaveLength(poolCount);
    expect(plain.loadout?.skillPointBudget).toBe(poolCount * SKILL_POINTS_PER_CLASS);
    expect(plain.loadout?.skillPointsSpent).toBeGreaterThan(0);
    for (const pool of plain.loadout!.skillPools) {
      expect(pool.budget).toBe(SKILL_POINTS_PER_CLASS);
      expect(pool.spent).toBeLessThanOrEqual(SKILL_POINTS_PER_CLASS);
    }

    // Both slots are Summoner promotions, so the pair is Destiny-legal and every
    // allowance widens. Spend does not have to rise with it: the model can only
    // value the ~30% of skills the wiki states numerically, so a wider budget
    // buys more only when there is more it can score.
    const destined = optimizeBuildV2(request({ ...build, destiny: true }, shared)).candidates[0];
    expect(destined.loadout?.skillPointBudget).toBe(poolCount * SKILL_POINTS_PER_CLASS_DESTINY);
    for (const pool of destined.loadout!.skillPools) {
      expect(pool.budget).toBe(SKILL_POINTS_PER_CLASS_DESTINY);
      expect(pool.spent).toBeLessThanOrEqual(SKILL_POINTS_PER_CLASS_DESTINY);
    }

    const pool = skillsForClassSlots('Shapeshifter', 'Grand Summoner');
    const reachable = new Map(pool.map(skill => [skill.id, skill.maxRank]));
    for (const skill of destined.loadout!.skills) {
      expect(reachable.has(skill.id)).toBe(true);
      expect(skill.rank).toBeLessThanOrEqual(reachable.get(skill.id)!);
    }
  }, 120_000);

  it('refuses a cross-tree pair under Destiny', () => {
    const build = baseBuild(20);
    build.mainClass = 'Shapeshifter';
    build.subClass = 'Grand Summoner';
    build.destiny = true;
    const result = optimizeBuildV2(request(build, { searchClasses: true, searchMainClass: true }));
    for (const candidate of result.candidates) {
      expect(getBaseClass(candidate.patch.mainClass)).toBe(getBaseClass(candidate.patch.subClass));
    }
  }, 60_000);

  it('searches the main slot only when asked to', () => {
    const build = baseBuild(6);
    build.mainClass = 'Soldier';
    build.subClass = 'Soldier';
    const fixed = optimizeBuildV2(request(build, { searchClasses: true }));
    for (const candidate of fixed.candidates) expect(candidate.patch.mainClass).toBe('Soldier');

    const searched = optimizeBuildV2(request(build, { searchClasses: true, searchMainClass: true }));
    for (const candidate of searched.candidates) {
      expect(validateV2Candidate(candidate, request(build, { searchClasses: true, searchMainClass: true }))).toEqual([]);
    }
    expect(searched.evaluatedClassPairs).toBeGreaterThan(fixed.evaluatedClassPairs);
  }, 60_000);

  it('contracts and installs Youkai for a Summoner within the cap', () => {
    const build = baseBuild(60);
    build.mainClass = 'Grand Summoner';
    build.subClass = 'Shapeshifter';
    const candidate = optimizeBuildV2(request(build, {
      searchClasses: false,
      searchLoadout: { skills: true, youkai: true },
      constraints: [{ metric: 'youkaiCap', minimum: 4 }],
      locks: { subClass: 'Shapeshifter', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    })).candidates[0];
    const loadout = candidate.loadout!;
    expect(loadout.contracted.length).toBeGreaterThan(0);
    expect(loadout.contracted.length).toBeLessThanOrEqual(loadout.youkaiCap);
    // Install without a rank in the Install skill is not a legal build.
    const installed = loadout.contracted.filter(youkai => youkai.installed);
    expect(installed.length).toBeLessThanOrEqual(1);
    if (installed.length) {
      const ranks = candidate.patch.skillRanks!;
      expect(Math.max(ranks.main.install ?? 0, ranks.sub.install ?? 0)).toBeGreaterThanOrEqual(1);
    }
    for (const youkai of loadout.contracted.filter(youkai => youkai.source !== 'existing')) {
      expect(youkai.reasons.length, `${youkai.name} should have a selection reason`).toBeGreaterThan(0);
    }
    const families = loadout.contracted.map(youkai => youkai.id.replace(/-ascended$/, ''));
    expect(new Set(families).size).toBe(families.length);
  }, 120_000);

  it('allocates for the character, not the borrowed body', () => {
    /*
     * Install lasts 2–4 rounds and replaces the racial stat line, so ranking a
     * build inside it tells the stat search that everything the Youkai supplies
     * is already handled. It once spent nothing on VIT for exactly that reason
     * and produced a build with a third less HP than one that ignored Install
     * entirely: better for two rounds, worse for the rest of the fight.
     */
    const build = baseBuild(60);
    build.subrace = 'Redtail';
    build.mainClass = 'Grand Summoner';
    build.subClass = 'Shapeshifter';
    // Equipment is locked so the run is about the allocation, not a full
    // weapon-and-torso sweep at level 60.
    const shared = {
      searchClasses: false,
      locks: { subClass: 'Shapeshifter', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    };

    const ignoringYoukai = optimizeBuildV2(request(build, shared)).candidates[0];
    const withYoukai = optimizeBuildV2(request(build, {
      ...shared,
      searchLoadout: { skills: true, youkai: true },
    })).candidates[0];

    const install = withYoukai.loadout?.install;
    expect(install).toBeDefined();
    expect(install!.policy).toBe('baseline');
    expect(install!.durationRounds).toBeGreaterThanOrEqual(2);
    expect(install!.durationRounds).toBeLessThanOrEqual(4);
    // Install is upside, so the borrowed body must be the stronger of the two.
    expect(install!.installedMaxHP).toBeGreaterThan(install!.baselineMaxHP);

    // The candidate's own evaluation is the character as themselves, and it must
    // not be sacrificed to chase the installed numbers.
    expect(withYoukai.evaluation.derived.maxHP).toBe(install!.baselineMaxHP);
    expect(withYoukai.evaluation.derived.maxHP)
      .toBeGreaterThan(ignoringYoukai.evaluation.derived.maxHP * 0.9);
    expect(withYoukai.patch.addedStats.vit).toBeGreaterThan(0);
  }, 180_000);

  it('never contracts Youkai for a build with no Summoner slot', () => {
    const build = baseBuild(60);
    const candidate = optimizeBuildV2(request(build, {
      searchClasses: false,
      searchLoadout: { traits: true, skills: true, youkai: true },
      locks: { subClass: 'Soldier', weaponName: 'Spine Leash', armorName: 'Breastplate' },
    })).candidates[0];
    expect(candidate.loadout?.contracted).toEqual([]);
  }, 60_000);

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

describe('weapon access fit', () => {
  /*
   * Reported: a Firebird search kept returning a Tamaki Shuriken. Firebird can
   * only hold Spears, but a sub-class that allows Daggers made the dagger legal
   * to equip, and access was only ever a small bonus, never a cost, so nothing
   * in the score objected.
   */
  it('charges for a weapon the main class cannot hold', () => {
    const spear = weaponAccessFit('Firebird', 'Dancer', 'Polearm');
    const dagger = weaponAccessFit('Firebird', 'Dancer', 'Dagger');

    expect(spear.penalty).toBe(0);
    expect(spear.reason).toBeUndefined();
    expect(dagger.penalty).toBeGreaterThan(0);
    expect(dagger.reason).toContain('Firebird');
  });

  it('charges far more when neither slot can hold it', () => {
    const subOnly = weaponAccessFit('Firebird', 'Dancer', 'Dagger');
    const neither = weaponAccessFit('Firebird', 'Kensei', 'Dagger');

    expect(neither.penalty).toBeGreaterThan(subOnly.penalty);
    expect(neither.reason).toContain('Neither');
  });

  it('accepts both spellings of a spear', () => {
    expect(weaponAccessFit('Firebird', 'Firebird', 'Polearm').penalty).toBe(0);
    expect(weaponAccessFit('Firebird', 'Firebird', 'Spear').penalty).toBe(0);
  });

  it('restricts nothing when neither class states a list', () => {
    expect(weaponAccessFit('Nonexistent', 'Nonexistent', 'Dagger').penalty).toBe(0);
  });
});

describe('expected critical value', () => {
  /*
   * Reported: the optimizer would GUI-max and buy no LUC. GUI is `+1% critical
   * damage per point`, and the offense score used to add that modifier straight
   * in, so GUI paid out with no way to land a critical. Rate and damage are
   * multiplied now, so neither is worth anything alone.
   */
  it('pays nothing for critical damage with no critical rate', () => {
    expect(criticalMultiplier({ critical: 0, criticalDamage: 300 })).toBe(1);
  });

  it('pays nothing for critical rate with no bonus damage', () => {
    expect(criticalMultiplier({ critical: 100, criticalDamage: 100 })).toBe(1);
    expect(criticalMultiplier({ critical: 100, criticalDamage: 60 })).toBe(1);
  });

  it('pays for the two together', () => {
    // Half the hits critical, each for 80% more than a normal hit.
    expect(criticalMultiplier({ critical: 50, criticalDamage: 180 })).toBeCloseTo(1.4);
  });

  it('ranks a critical build over a guile-only one at equal power', () => {
    const guileOnly = criticalMultiplier({ critical: 8, criticalDamage: 185 });
    const critBuild = criticalMultiplier({ critical: 60, criticalDamage: 150 });
    expect(critBuild).toBeGreaterThan(guileOnly);
  });

  it('treats a critical rate over 100 as certain rather than compounding', () => {
    expect(criticalMultiplier({ critical: 400, criticalDamage: 200 })).toBe(2);
  });

  it('is neutral with no weapon', () => {
    expect(criticalMultiplier(undefined)).toBe(1);
  });
});

describe('positioning credit', () => {
  /*
   * The optimizer scored the base Hit tier only, so a build that only works from a
   * flank got no credit for it: the Flanking stat and the GUI behind it were
   * invisible to the search. Credited now, but at a weight that cannot buy away
   * guaranteed Hit, since flanking depends on where the character is standing.
   */
  const objectivesFor = (evaluation: ReturnType<typeof evaluateBuild>) => objectiveState(evaluation, request());

  function evaluated(gui: number) {
    const base = baseBuild(60);
    base.addedStats.gui = gui;
    base.addedStats.ski = 20;
    return evaluateBuild(base);
  }

  it('rewards the Flanking stat through the accuracy objective', () => {
    const lean = objectivesFor(evaluated(0));
    const flanker = objectivesFor(evaluated(60));
    expect(flanker.accuracy).toBeGreaterThan(lean.accuracy);
  });

  it('keeps the credit small enough not to outbid guaranteed Hit', () => {
    const flanker = objectivesFor(evaluated(60));
    const noFlank = objectivesFor(evaluated(0));
    // The whole positioning term is worth at most 0.15 of the accuracy objective.
    expect(flanker.accuracy - noFlank.accuracy).toBeLessThanOrEqual(0.16);
  });

  it('scores a weaponless build on its character-side Hit rather than zero', () => {
    const bare = evaluateBuild(baseBuild(60));
    expect(bare.primaryWeapon).toBeUndefined();
    expect(objectivesFor(bare).accuracy).toBeGreaterThan(0);
  });
});
