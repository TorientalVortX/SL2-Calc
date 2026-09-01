import { describe, expect, it } from 'vitest';
import type { BuildState } from '../types';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { calculateRedtailFortune } from './derivedCalculations';
import {
  SKILLS,
  SKILL_POINTS_PER_CLASS,
  SKILL_POINTS_PER_CLASS_DESTINY,
  buildSkillPools,
  classPairLegal,
  conditionalKey,
  destinyAllowsClassPair,
  mergeSkillRanks,
  skillPointBudget,
  skillPoolSpends,
} from './skills';
import { TRAITS, traitCheckTarget } from './traits';
import { youkaiById } from './youkai';
import {
  canContractYoukai,
  canSwapInstall,
  eligibleTraits,
  loadoutBudget,
  loadoutOf,
  loadoutViolations,
  optimizeLoadout,
  resolveLoadoutAxes,
  skillViolations,
  summarizeLoadout,
  withLoadout,
} from './loadout';

function build(overrides: Record<string, unknown> = {}): BuildState {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'loadout fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Summoner', subClass: 'Summoner', characterLevel: 60,
    food: 'None', history: 'None', hpPercent: 100, ...overrides,
  })).build;
}

const baseClassOf = (name: string) => (
  ['Grand Summoner', 'Bonder', 'Shapeshifter'].includes(name) ? 'Summoner'
    : ['Ghost', 'Kensei', 'Firebird'].includes(name) ? 'Duelist'
      : name
);

describe('skill point pools', () => {
  it('gives every reachable class its own allowance, base class included', () => {
    // Two promotions of one base reach three classes: the two promotions and the
    // Summoner base they share, which is granted once rather than twice.
    const pools = buildSkillPools('Shapeshifter', 'Grand Summoner').map(pool => pool.className).sort();
    expect(pools).toEqual(['Grand Summoner', 'Shapeshifter', 'Summoner']);

    // A monoclass build reaches its own class and its base, and no more.
    expect(buildSkillPools('Summoner', 'Summoner').map(pool => pool.className)).toEqual(['Summoner']);
    expect(buildSkillPools('Shapeshifter', 'Shapeshifter').map(pool => pool.className).sort())
      .toEqual(['Shapeshifter', 'Summoner']);
  });

  it('charges a rank to its own class and leaves the other allowances alone', () => {
    const spends = skillPoolSpends('Shapeshifter', 'Grand Summoner', { main: { 'sync-mind': 2 }, sub: {} }, false);
    const byClass = Object.fromEntries(spends.map(pool => [pool.className, pool.spent]));
    // Sync-Mind is a Summoner skill, so it costs the Summoner allowance even
    // though neither slot *is* Summoner.
    expect(byClass.Summoner).toBe(2);
    expect(byClass.Shapeshifter).toBe(0);
    expect(byClass['Grand Summoner']).toBe(0);
  });

  it('does not let one class borrow another class\'s points', () => {
    const state = build({ mainClass: 'Shapeshifter', subClass: 'Grand Summoner' });
    // Well inside the 105 points the build has in total, and still illegal:
    // it all lands on one 35-point class.
    state.skillRanks = { main: {}, sub: {} };
    for (const skill of buildSkillPools('Shapeshifter', 'Grand Summoner')
      .find(pool => pool.className === 'Shapeshifter')!.skills) {
      state.skillRanks.main[skill.id] = skill.maxRank;
    }
    const shapeshifter = skillPoolSpends(state.mainClass, state.subClass, state.skillRanks, false)
      .find(pool => pool.className === 'Shapeshifter')!;
    if (shapeshifter.spent > SKILL_POINTS_PER_CLASS) {
      expect(skillViolations(state).some(problem => problem.includes('Shapeshifter skills cost'))).toBe(true);
    }
  });

  it('trades every other class tree for fifteen more points in each class', () => {
    expect(skillPointBudget(false)).toBe(SKILL_POINTS_PER_CLASS);
    expect(skillPointBudget(true)).toBe(SKILL_POINTS_PER_CLASS_DESTINY);
    expect(SKILL_POINTS_PER_CLASS_DESTINY).toBeGreaterThan(SKILL_POINTS_PER_CLASS);
  });

  it('confines both class slots to one base-class family', () => {
    expect(destinyAllowsClassPair('Shapeshifter', 'Grand Summoner')).toBe(true);
    expect(destinyAllowsClassPair('Summoner', 'Bonder')).toBe(true);
    expect(destinyAllowsClassPair('Shapeshifter', 'Ghost')).toBe(false);
    // Without Destiny every pair is legal, including the cross-tree one.
    expect(classPairLegal('Shapeshifter', 'Ghost', false)).toBe(true);
    expect(classPairLegal('Shapeshifter', 'Ghost', true)).toBe(false);
  });

  it('charges a skill both sheets have set only once', () => {
    // A monoclass build keeps two sheets over one class; the higher rank is what
    // the character has, and it is paid for once.
    const ranks = { main: { 'sync-mind': 2 }, sub: { 'sync-mind': 2 } };
    const spends = skillPoolSpends('Summoner', 'Summoner', ranks, false);
    expect(spends).toHaveLength(1);
    expect(spends[0].spent).toBe(2);
  });
});

describe('redtail dice', () => {
  const fortune = (over: Partial<Parameters<typeof calculateRedtailFortune>[0]> = {}) =>
    calculateRedtailFortune({ subrace: 'Redtail', diceColor: 'red', fortuneLevel: 3, scaledSan: 0, ...over });

  it('does nothing for a subrace that has no dice', () => {
    expect(fortune({ subrace: 'Imperialist' })).toMatchObject({ hit: 0, critical: 0, evade: 0, multiplier: 0 });
  });

  it('scales by one multiple per ten scaled SAN, capped at five', () => {
    expect(fortune({ scaledSan: 0 }).multiplier).toBe(1);
    expect(fortune({ scaledSan: 25 }).multiplier).toBe(3);
    expect(fortune({ scaledSan: 100 }).multiplier).toBe(5);
  });

  it('pays each colour into its own channel', () => {
    expect(fortune({ diceColor: 'red', fortuneLevel: 4, scaledSan: 20 }))
      .toMatchObject({ hit: 12, critical: 12, evade: 0, luckStatusPercent: 0 });
    expect(fortune({ diceColor: 'yellow', fortuneLevel: 4, scaledSan: 20 }))
      .toMatchObject({ evade: 12, criticalEvade: 12, hit: 0 });
    expect(fortune({ diceColor: 'green', fortuneLevel: 4, scaledSan: 20 }))
      .toMatchObject({ luckStatusPercent: 12, hit: 0, evade: 0 });
  });

  it('turns into a penalty at Fortune Level one', () => {
    expect(fortune({ fortuneLevel: 1, scaledSan: 20 }))
      .toMatchObject({ hit: -15, critical: -15 });
  });

  it('reaches the evaluated build rather than being stored and ignored', () => {
    const neutral = build({ subrace: 'Redtail', redtailDiceColor: 'yellow', redtailFortuneLevel: 1 });
    const lucky = { ...neutral, redtailFortuneLevel: 6 };
    expect(evaluateBuild(lucky).derived.evade).toBeGreaterThan(evaluateBuild(neutral).derived.evade);
  });
});

describe('elemental attack from skills', () => {
  it('parses a flat per-rank elemental bonus and reaches the build', () => {
    const nerhaven = SKILLS.find(skill => skill.name === 'Nerhaven')!;
    const effect = nerhaven.effects.find(item => item.kind === 'element')!;
    expect(effect).toMatchObject({ kind: 'element', key: 'Fire' });
    expect(effect.valueByRank).toEqual([7, 9, 11]);

    // A three-round cast buff, so it is opt-in rather than folded into the
    // build's permanent totals.
    expect(effect.applies).toBe('conditional');

    const evoker = build({ mainClass: 'Evoker', subClass: 'Evoker' });
    evoker.skillRanks = { main: { [nerhaven.id]: 3 }, sub: {} };
    const off = evaluateBuild(evoker).elementalAttack.Fire;
    const on = evaluateBuild({
      ...evoker,
      skillConditionals: { [conditionalKey(nerhaven.id, nerhaven.effects.indexOf(effect))]: true },
    }).elementalAttack.Fire;
    expect(on - off).toBe(11);
  });

  it('refuses a percentage where the model wants a flat bonus', () => {
    // "Dark ATK: 10/20/30/40/50%" scales the element rather than adding to it,
    // and the calculator has nowhere to put that.
    const darkImbue = SKILLS.find(skill => skill.name === 'Dark Imbue')!;
    expect(darkImbue.effects.some(effect => effect.kind === 'element')).toBe(false);
  });

  it('leaves an unattributable element alone', () => {
    // Install Element Boost's element depends on the installed Youkai, so there
    // is no single element to credit.
    const boost = SKILLS.find(skill => skill.name === 'Install Element Boost')!;
    expect(boost.effects).toEqual([]);
  });
});

describe('trait data', () => {
  it('marks Blood Binding as hand-modelled so the Karakuri body is not counted twice', () => {
    // Each Blood Binding trait restates the stat offsets `karakuriBonus` already
    // applies from the build's `karakuriYoukai` field.
    const bindings = TRAITS.filter(trait => trait.id.startsWith('blood-binding-'));
    expect(bindings.length).toBe(7);
    for (const trait of bindings) expect(trait.handModelled).toBe(true);
  });

  it('checks requirements against base stats, excluding the APT bonus', () => {
    // The wiki is explicit that "bonuses from APT or items will not contribute"
    // to a trait requirement, so investing in APT must not unlock traits.
    const plain = build();
    plain.addedStats.str = 40;
    const aptitude = { ...plain, addedStats: { ...plain.addedStats, apt: 40 } };

    expect(traitCheckTarget(aptitude).baseStats.str).toBe(traitCheckTarget(plain).baseStats.str);
    expect(evaluateBuild(aptitude).rawStats.str).toBeGreaterThan(evaluateBuild(plain).rawStats.str);
  });
});

describe('loadout legality', () => {
  it('reports an over-cap Youkai roster and an unsupported Install', () => {
    const state = build();
    state.youkai = { contracted: ['apus', 'byakko', 'suzaku'], installed: 'byakko' };
    const problems = loadoutViolations(state, 1);
    expect(problems.some(problem => problem.includes('cap of 1'))).toBe(true);
    expect(problems.some(problem => problem.includes('Install skill is unranked'))).toBe(true);
  });

  it('accepts an Install backed by the whole prerequisite chain', () => {
    const state = build();
    state.youkai = { contracted: ['apus'], installed: 'apus' };
    state.skillRanks = { main: { install: 1, 'sync-mind': 1, 'the-contract': 1 }, sub: {} };
    expect(loadoutViolations(state, 8)).toEqual([]);
  });

  it('rejects a skill whose prerequisite is unranked', () => {
    // Install requires Sync-Mind rank 1, which requires The Contract rank 1.
    // Holding Install alone is not a build the game allows.
    const state = build();
    state.youkai = { contracted: ['apus'], installed: 'apus' };
    state.skillRanks = { main: { install: 1 }, sub: {} };
    expect(skillViolations(state)).toEqual(['Install needs Sync-Mind at rank 1.']);

    state.skillRanks = { main: { install: 1, 'sync-mind': 1 }, sub: {} };
    expect(skillViolations(state)).toEqual(['Sync-Mind needs The Contract at rank 1.']);
  });

  it('rejects a skill the class pair cannot reach and a spend over budget', () => {
    const state = build({ mainClass: 'Soldier', subClass: 'Soldier' });
    state.skillRanks = { main: { 'sync-mind': 2 }, sub: {} };
    expect(loadoutViolations(state, 0).some(problem => problem.includes('not reachable'))).toBe(true);
  });

  it('only lets a Summoner-tree build contract', () => {
    expect(canContractYoukai(build({ mainClass: 'Shapeshifter', subClass: 'Ghost' }), baseClassOf)).toBe(true);
    expect(canContractYoukai(build({ mainClass: 'Soldier', subClass: 'Ghost' }), baseClassOf)).toBe(false);
  });

  it('offers only traits the build currently qualifies for', () => {
    const oni = build();
    oni.subrace = 'Oni';
    const human = build();
    expect(eligibleTraits(oni)).toContain('oni-heritage-red');
    expect(eligibleTraits(human)).not.toContain('oni-heritage-red');
    // History traits are applied through the build's `history` field, so buying
    // one here would apply half of it.
    expect(eligibleTraits(human).some(id => id.startsWith('history-'))).toBe(false);
  });
});

describe('loadout search', () => {
  it('keeps every axis untouched when none is enabled', () => {
    const state = build();
    const chosen = optimizeLoadout(state, () => 1, {
      axes: resolveLoadoutAxes(undefined),
      budget: loadoutBudget(state, 8),
      baseClassOf,
    });
    expect(chosen).toEqual(loadoutOf(state));
  });

  it('buys Install as one move, because no step of it pays on its own', () => {
    // A contract alone moves no number, an unranked Install does nothing, and
    // Install with nothing contracted does nothing. Only the combination scores,
    // so a search that took improving single steps could never reach it.
    const state = build();
    const score = (loadout: ReturnType<typeof loadoutOf>) =>
      evaluateBuild(withLoadout(state, loadout)).scaledStats.ski;

    const chosen = optimizeLoadout(state, score, {
      axes: { traits: false, skills: true, youkai: true },
      budget: loadoutBudget(state, 4),
      baseClassOf,
    });

    expect(chosen.youkai.installed).not.toBeNull();
    expect(chosen.youkai.contracted).toContain(chosen.youkai.installed);
    expect(chosen.skillRanks.main.install ?? chosen.skillRanks.sub.install).toBeGreaterThanOrEqual(1);
    expect(score(chosen)).toBeGreaterThan(score(loadoutOf(state)));
    // The whole chain, not just Install: Sync-Mind and The Contract come with it.
    expect(loadoutViolations(withLoadout(state, chosen), 4)).toEqual([]);
    const ranks = mergeSkillRanks(chosen.skillRanks);
    expect(ranks['sync-mind']).toBeGreaterThanOrEqual(1);
    expect(ranks['the-contract']).toBeGreaterThanOrEqual(1);
  });

  it('only treats Chaotic Form as available when it is actually ranked', () => {
    // Chaotic Form installs whoever you Evoke, so a Shapeshifter wears every
    // race it holds, breadth. A plain Summoner installs once and wants depth.
    const shifter = build({ mainClass: 'Shapeshifter', subClass: 'Grand Summoner' });
    const plain = build({ mainClass: 'Grand Summoner', subClass: 'Grand Summoner' });
    expect(canSwapInstall(shifter)).toBe(false);
    expect(canSwapInstall(plain)).toBe(false);
    shifter.skillRanks.main['chaotic-form'] = 1;
    expect(canSwapInstall(shifter)).toBe(true);

    const chosen = optimizeLoadout(
      shifter,
      loadout => evaluateBuild(withLoadout(shifter, loadout)).scaledStats.str,
      { axes: { traits: false, skills: true, youkai: true }, budget: loadoutBudget(shifter, 6), baseClassOf },
    );
    const races = new Set(chosen.youkai.contracted.map(id => youkaiById(id)!.race));
    expect(chosen.youkai.contracted.length).toBeGreaterThan(1);
    expect(races.size).toBeGreaterThan(1);
    expect(summarizeLoadout(withLoadout(shifter, chosen), 6).canSwapInstall).toBe(true);
  });

  it('uses unique ascended contract families and leaves unsupported capacity open', () => {
    const state = build();
    const chosen = optimizeLoadout(
      state,
      loadout => {
        const evaluation = evaluateBuild(withLoadout(state, loadout));
        return evaluation.scaledStats.str + evaluation.scaledStats.ski + evaluation.scaledStats.def;
      },
      { axes: { traits: false, skills: true, youkai: true }, budget: loadoutBudget(state, 12), baseClassOf },
    );
    const families = chosen.youkai.contracted.map(id => youkaiById(id)!.baseFormId ?? id);
    expect(new Set(families).size).toBe(families.length);
    expect(chosen.youkai.contracted).toContain('byakko-ascended');
    expect(chosen.youkai.contracted).not.toContain('byakko');
    expect(chosen.youkai.contracted.length).toBeLessThan(12);
  });

  it('preserves existing contracts while adding only improving choices', () => {
    const state = build();
    state.youkai = { contracted: ['apus'], installed: null };
    const chosen = optimizeLoadout(
      state,
      loadout => evaluateBuild(withLoadout(state, loadout)).scaledStats.ski,
      { axes: { traits: false, skills: true, youkai: true }, budget: loadoutBudget(state, 8), baseClassOf },
    );
    expect(chosen.youkai.contracted).toContain('apus');
  });

  it('will not spend skill points on Install when the skill axis is off', () => {
    // An axis left off means "keep what I chose". Buying the Install rank anyway
    // would spend from a budget the user never opened.
    const state = build();
    const chosen = optimizeLoadout(
      state,
      loadout => evaluateBuild(withLoadout(state, loadout)).scaledStats.ski,
      { axes: { traits: false, skills: false, youkai: true }, budget: loadoutBudget(state, 4), baseClassOf },
    );
    expect(chosen.youkai.installed).toBeNull();
    expect(chosen.skillRanks).toEqual(loadoutOf(state).skillRanks);
  });

  it('installs on an existing Install rank even with the skill axis off', () => {
    const state = build();
    state.skillRanks = { main: { install: 1 }, sub: {} };
    const chosen = optimizeLoadout(
      state,
      loadout => evaluateBuild(withLoadout(state, loadout)).scaledStats.ski,
      { axes: { traits: false, skills: false, youkai: true }, budget: loadoutBudget(state, 4), baseClassOf },
    );
    expect(chosen.youkai.installed).not.toBeNull();
    expect(chosen.skillRanks).toEqual(loadoutOf(state).skillRanks);
  });

  it('never exceeds the Youkai cap it is given', () => {
    const state = build();
    const chosen = optimizeLoadout(state, loadout => evaluateBuild(withLoadout(state, loadout)).scaledStats.str, {
      axes: { traits: false, skills: false, youkai: true },
      budget: loadoutBudget(state, 3),
      baseClassOf,
    });
    expect(chosen.youkai.contracted.length).toBeLessThanOrEqual(3);
    expect(loadoutViolations(withLoadout(state, chosen), 3)).toEqual([]);
  });

  it('summarizes each class\'s allowance separately', () => {
    const state = build({ destiny: true, mainClass: 'Summoner', subClass: 'Grand Summoner' });
    state.skillRanks = { main: { 'sync-mind': 2 }, sub: {} };
    const summary = summarizeLoadout(state, 6);
    expect(summary.destiny).toBe(true);
    expect(summary.skillPointsSpent).toBe(2);
    // Two classes at the Destiny allowance each, reported per class and summed.
    expect(summary.skillPools.map(pool => pool.className).sort()).toEqual(['Grand Summoner', 'Summoner']);
    expect(summary.skillPools.every(pool => pool.budget === SKILL_POINTS_PER_CLASS_DESTINY)).toBe(true);
    expect(summary.skillPointBudget).toBe(2 * SKILL_POINTS_PER_CLASS_DESTINY);
    expect(summary.skillPools.find(pool => pool.className === 'Summoner')?.spent).toBe(2);
    expect(summary.skillPools.find(pool => pool.className === 'Grand Summoner')?.spent).toBe(0);
    expect(summary.skills).toEqual([
      { id: 'sync-mind', name: 'Sync-Mind', rank: 2, maxRank: 2, pool: 'Summoner' },
    ]);
  });
});
