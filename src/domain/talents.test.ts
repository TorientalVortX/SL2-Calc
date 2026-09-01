import { describe, expect, it } from 'vitest';
import type { BuildState } from '../types';
import { createDefaultBuild } from '../aether/state/build';
import { evaluateBuild } from './buildEvaluation';
import { normalizeBuildState, createBuildFile, parseBuildFile } from './buildPersistence';
import { TALENT_POINT_BUDGET, talentViolations } from './loadout';
import { findWeaponByName, weaponToConfig } from './equipment';
import { TALENTS, talentSpending } from '../data/talents';
import {
  NO_TALENT_EFFECTS,
  activeTalentModifiers,
  setSubtalentRank,
  talentEffects,
  talentWeaponUnlocks,
  talentsUnlockWeapon,
} from './talents';

/** A build holding the named weapon, so weapon-scoped talents have something to scope to. */
function buildWith(weaponName: string | null, talents: Record<string, number> = {}): BuildState {
  const base = createDefaultBuild();
  const weapon = weaponName ? findWeaponByName(weaponName) : null;
  return {
    ...base,
    talents,
    equipment: {
      ...base.equipment,
      primaryWeapon: weapon ? weaponToConfig(weapon) : undefined,
    },
  };
}

describe('talent effects', () => {
  it('is inert for a build with no allocation', () => {
    expect(talentEffects({})).toBe(NO_TALENT_EFFECTS);
    expect(talentEffects({ talents: {} })).toBe(NO_TALENT_EFFECTS);
    expect(activeTalentModifiers({ talents: { 'capacity/depth': 0 } })).toEqual([]);
  });

  it('scopes a weapon talent to the weapon in hand', () => {
    const talents = { 'blade-expertise/reliability': 5 };
    expect(talentEffects({ talents }, 'Sword').hit).toBe(7.5);
    expect(talentEffects({ talents }, 'Dagger').hit).toBe(7.5);
    expect(talentEffects({ talents }, 'Axe').hit).toBe(0);
    expect(talentEffects({ talents }, null).hit).toBe(0);
  });

  it('reads a Mutation weapon by the type it turned into', () => {
    // Mutation writes Polearm as "Spear"; both name one weapon type to a talent.
    const talents = { 'polearm-expertise/balance': 4 };
    expect(talentEffects({ talents }, 'Spear').weaponWeightReduction).toBe(6);
    expect(talentEffects({ talents }, 'Polearm').weaponWeightReduction).toBe(6);
  });

  it('holds conditional subtalents back until the build confirms them', () => {
    // Steady is conditional on carrying nothing in the off-hand, which the sheet
    // cannot see, so it waits for the build to say so.
    const talents = { 'two-hand/steady': 5 };
    expect(talentEffects({ talents }, 'Gun').hit).toBe(0);
    expect(talentEffects({ talents, talentConditionals: { 'two-hand/steady': true } }, 'Gun').hit).toBe(10);
    // A confirmation on a talent with no rank buys nothing.
    expect(talentEffects({ talents: {}, talentConditionals: { 'two-hand/steady': true } }, 'Gun').hit).toBe(0);
  });

  /*
   * Smite is the Hit model's own frontal term, not a buff beside it. It is
   * reported separately so `evaluateBuild` can pay it into the `front` tier,
   * where the workbook already had it hard-coded at Smite's max rank.
   */
  it('reports a frontal Hit bonus apart from the general Hit channel', () => {
    const effects = talentEffects({ talents: { 'chivalry/smite': 5 } });
    expect(effects.frontalHit).toBe(15);
    expect(effects.hit).toBe(0);
  });

  it('needs no confirmation for a frontal bonus, since the tier is the condition', () => {
    const talents = { 'chivalry/smite': 4 };
    expect(talentEffects({ talents }).frontalHit).toBe(12);
    expect(talentEffects({ talents, talentConditionals: { 'chivalry/smite': true } }).frontalHit).toBe(12);
  });

  it('separates flat totals from the percentages they are not comparable with', () => {
    const effects = talentEffects({ talents: { 'capacity/depth': 5, 'pyromancy/efficiency': 4 } });
    expect(effects.maxFp).toBe(25);
    // Reported as a positive discount rather than a negative cost.
    expect(effects.fpCostPercent).toBe(12);
  });

  it('maps the wiki element names onto the calculator keys', () => {
    expect(talentEffects({ talents: { 'altermancy/potency': 3 } }).elementalAttack).toEqual({ Dark: 3 });
    expect(talentEffects({ talents: { 'pyromancy/potency': 2 } }).elementalAttack).toEqual({ Fire: 2 });
  });
});

describe('talent weapon access', () => {
  it('opens a weapon type to a rarity ceiling regardless of class', () => {
    const build = { talents: { 'marksmanship/adaptation': 3 } };
    expect(talentWeaponUnlocks(build)).toEqual({ Gun: 6 });
    expect(talentsUnlockWeapon(build, 'Gun', 6)).toBe(true);
    expect(talentsUnlockWeapon(build, 'Gun', 7)).toBe(false);
    expect(talentsUnlockWeapon(build, 'Sword', 1)).toBe(false);
  });

  it('unlocks nothing without an allocation', () => {
    expect(talentWeaponUnlocks({})).toEqual({});
    expect(talentsUnlockWeapon({}, 'Gun', 1)).toBe(false);
  });
});

describe('evaluateBuild with talents', () => {
  it('changes nothing for a build that has spent no talent points', () => {
    const plain = evaluateBuild(buildWith('Longsword'));
    const empty = evaluateBuild(buildWith('Longsword', {}));
    expect(empty.derived).toEqual(plain.derived);
    expect(empty.primaryWeapon).toEqual(plain.primaryWeapon);
  });

  it('puts talent Hit in the capped bonus channel, not the base one', () => {
    const before = evaluateBuild(buildWith('Longsword'));
    const after = evaluateBuild(buildWith('Longsword', { 'blade-expertise/reliability': 4 }));
    expect(after.derived.hitBase).toBe(before.derived.hitBase);
    expect(after.derived.hitBonusSources - before.derived.hitBonusSources).toBe(6);
    expect(after.sources.hit.some(source => source.label === 'Talents' && source.channel === 'bonus')).toBe(true);
  });

  it('does not credit a sword talent to an axe build', () => {
    const axe = evaluateBuild(buildWith('Battle Axe', { 'blade-expertise/reliability': 4 }));
    const bare = evaluateBuild(buildWith('Battle Axe'));
    expect(axe.derived.hitBonusSources).toBe(bare.derived.hitBonusSources);
  });

  it('adds Capacity to Max FP', () => {
    const before = evaluateBuild(buildWith(null));
    const after = evaluateBuild(buildWith(null, { 'capacity/depth': 5 }));
    expect(after.derived.fp - before.derived.fp).toBe(25);
  });

  it('lightens the weapon rather than raising the carrying cap', () => {
    const before = evaluateBuild(buildWith('Longsword'));
    const after = evaluateBuild(buildWith('Longsword', { 'blade-expertise/balance': 4 }));
    expect(before.primaryWeapon!.weight - after.primaryWeapon!.weight).toBe(6);
    expect(after.derived.battleWeight).toBe(before.derived.battleWeight);
    expect(before.derived.equipmentLoad - after.derived.equipmentLoad).toBe(6);
  });

  it('raises the carrying cap for Packrat, which is the other half of that trade', () => {
    const before = evaluateBuild(buildWith('Longsword'));
    const after = evaluateBuild(buildWith('Longsword', { 'packrat/hauler': 5 }));
    expect(after.derived.battleWeight - before.derived.battleWeight).toBe(10);
  });

  it('never takes a weapon below no weight at all', () => {
    const light = findWeaponByName('Longsword')!;
    const build = buildWith('Longsword', { 'blade-expertise/balance': 5 });
    build.equipment.primaryWeapon = { ...weaponToConfig(light), baseWeight: 1 };
    expect(evaluateBuild(build).primaryWeapon!.weight).toBe(0);
  });

  it('adds elemental Potency to the element it names and no other', () => {
    const before = evaluateBuild(buildWith(null));
    const after = evaluateBuild(buildWith(null, { 'cryomancy/potency': 5 }));
    expect(after.elementalAttack.Ice - before.elementalAttack.Ice).toBe(5);
    expect(after.elementalAttack.Fire).toBe(before.elementalAttack.Fire);
  });

  it('multiplies Status Infliction rather than adding to it', () => {
    const before = evaluateBuild(buildWith(null));
    const after = evaluateBuild(buildWith(null, { 'enchantment/whimsy': 5 }));
    expect(after.derived.statusInfliction).toBe(Math.floor(before.derived.statusInfliction * 1.1));
  });

  it('leaves a conditional talent out of the numbers until it is confirmed', () => {
    const gun = 'Handgun (Enhanced)';
    const off = evaluateBuild(buildWith(gun, { 'two-hand/steady': 5 }));
    const on = evaluateBuild({
      ...buildWith(gun, { 'two-hand/steady': 5 }),
      talentConditionals: { 'two-hand/steady': true },
    });
    const bare = evaluateBuild(buildWith(gun));
    expect(off.derived.hitBonusSources).toBe(bare.derived.hitBonusSources);
    expect(on.derived.hitBonusSources - bare.derived.hitBonusSources).toBe(10);
  });

  /*
   * The bug this pins: the Hit workbook hard-codes a flat 15 frontal bonus,
   * which is Smite at max rank. Routing the talent through the general Hit
   * channel as well meant a build that bought Smite collected it twice on a
   * frontal attack, and collected it at all on tiers where it does not apply.
   */
  it('pays Smite into the frontal tier only, and exactly once', () => {
    const bare = evaluateBuild(buildWith('Longsword')).derived;
    const smiting = evaluateBuild(buildWith('Longsword', { 'chivalry/smite': 5 })).derived;
    expect(bare.frontalHitBonus).toBe(0);
    expect(smiting.frontalHitBonus).toBe(15);
    expect(smiting.hitBonusSources).toBe(bare.hitBonusSources);
    expect(smiting.hitTiers.base).toBe(bare.hitTiers.base);
    expect(smiting.hitTiers.front - smiting.hitTiers.base).toBe(15);
  });
});

describe('the talent budget', () => {
  it('is a flat 65 ranks, whatever the level or Legend Extend say', () => {
    expect(TALENT_POINT_BUDGET).toBe(65);
  });

  it('counts ranks rather than the SP those ranks cost', () => {
    // Chivalry bills 2 SP a rank and Capacity 1, so the same 5 ranks cost
    // different SP depending on which talent they are spent in.
    const cheap = talentSpending({ 'capacity/depth': 5 });
    const dear = talentSpending({ 'chivalry/honor': 5, 'chivalry/smite': 5 });
    expect(cheap.totalRanks).toBe(dear.totalRanks);
    expect(cheap.totalSp).toBe(5);
    expect(dear.totalSp).toBe(10);
  });

  it('reports an overspend and a talent past its rank cap separately', () => {
    const build = createDefaultBuild();
    expect(talentViolations({ ...build, talents: { 'capacity/depth': 5 } })).toEqual([]);
    // Capacity's subtalents can hold 13 points between them at 1 SP a rank,
    // past the 10 ranks the talent itself caps out at.
    const over = talentViolations({
      ...build,
      talents: {
        'capacity/depth': 5,
        'capacity/absorption': 3,
        'capacity/recycle': 5,
      },
    });
    expect(over).toEqual(['Capacity holds 13 ranks against its cap of 10.']);
  });

  it('flags a build past 65 ranks in ranks, not SP', () => {
    const build = createDefaultBuild();
    /*
     * One subtalent from each of enough talents to pass 65, filled to its own
     * cap, which differs per subtalent, so the allocation is accumulated rather
     * than assumed. Spread across talents on purpose: this has to be the budget
     * complaining, not a single talent's ten-rank cap.
     */
    const allocation: Record<string, number> = {};
    let ranks = 0;
    for (const talent of TALENTS) {
      if (ranks > TALENT_POINT_BUDGET) break;
      const first = talent.subtalents[0];
      allocation[first.id] = first.maxSr;
      ranks += Math.ceil(first.maxSr / talent.spPerRank);
    }
    const problems = talentViolations({ ...build, talents: allocation });
    expect(ranks).toBeGreaterThan(TALENT_POINT_BUDGET);
    expect(problems).toEqual([`Talents use ${ranks} ranks against a budget of 65.`]);
  });
});

describe('talent persistence', () => {
  it('round-trips an allocation and its conditional switches through a build file', () => {
    const build = {
      ...createDefaultBuild(),
      talents: { 'chivalry/smite': 3 },
      talentConditionals: { 'chivalry/smite': true },
    };
    const restored = parseBuildFile(JSON.stringify(createBuildFile('Talented', build))).build;
    expect(restored.talents).toEqual({ 'chivalry/smite': 3 });
    expect(restored.talentConditionals).toEqual({ 'chivalry/smite': true });
  });

  it('drops unknown subtalents and clamps a rank past its cap', () => {
    const restored = normalizeBuildState({
      ...createDefaultBuild(),
      talents: { 'capacity/depth': 99, 'not-a-talent/nope': 4, 'chivalry/smite': 0 },
    });
    expect(restored.talents).toEqual({ 'capacity/depth': 5 });
  });

  it('gives a build saved before talents existed an empty allocation', () => {
    const legacy = { ...createDefaultBuild() } as Partial<BuildState>;
    delete legacy.talents;
    delete legacy.talentConditionals;
    const restored = normalizeBuildState(legacy);
    expect(restored.talents).toEqual({});
    expect(evaluateBuild(restored as BuildState).derived.fp).toBe(evaluateBuild(createDefaultBuild()).derived.fp);
  });
});

describe('setSubtalentRank', () => {
  it('clamps to the subtalent cap and removes a rank dropped to zero', () => {
    expect(setSubtalentRank({}, 'capacity/depth', 99)).toEqual({ 'capacity/depth': 5 });
    expect(setSubtalentRank({ 'capacity/depth': 3 }, 'capacity/depth', 0)).toEqual({});
    expect(setSubtalentRank({ 'capacity/depth': 3 }, 'capacity/depth', -2)).toEqual({});
  });

  it('ignores an id the catalog does not have', () => {
    expect(setSubtalentRank({ 'capacity/depth': 3 }, 'nope/nope', 4)).toEqual({ 'capacity/depth': 3 });
  });
});
