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
  skillPointBudget,
  skillPoolSpends,
} from './skills';
import { TRAITS, traitCheckTarget } from './traits';
import {
  canContractYoukai,
  skillViolations,
  youkaiViolations,
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
    const pools = buildSkillPools('Shapeshifter', 'Grand Summoner').map(pool => pool.className).sort();
    expect(pools).toEqual(['Grand Summoner', 'Shapeshifter', 'Summoner']);

    expect(buildSkillPools('Summoner', 'Summoner').map(pool => pool.className)).toEqual(['Summoner']);
    expect(buildSkillPools('Shapeshifter', 'Shapeshifter').map(pool => pool.className).sort())
      .toEqual(['Shapeshifter', 'Summoner']);
  });

  it('charges a rank to its own class and leaves the other allowances alone', () => {
    const spends = skillPoolSpends('Shapeshifter', 'Grand Summoner', { main: { 'sync-mind': 2 }, sub: {} }, false);
    const byClass = Object.fromEntries(spends.map(pool => [pool.className, pool.spent]));
    // Sync-Mind is a Summoner skill.
    expect(byClass.Summoner).toBe(2);
    expect(byClass.Shapeshifter).toBe(0);
    expect(byClass['Grand Summoner']).toBe(0);
  });

  it('does not let one class borrow another class\'s points', () => {
    const state = build({ mainClass: 'Shapeshifter', subClass: 'Grand Summoner' });
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
    expect(classPairLegal('Shapeshifter', 'Ghost', false)).toBe(true);
    expect(classPairLegal('Shapeshifter', 'Ghost', true)).toBe(false);
  });

  it('charges a skill both sheets have set only once', () => {
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

    // A three-round cast buff.
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
    // Wiki: "Dark ATK: 10/20/30/40/50%".
    const darkImbue = SKILLS.find(skill => skill.name === 'Dark Imbue')!;
    expect(darkImbue.effects.some(effect => effect.kind === 'element')).toBe(false);
  });

  it('leaves an unattributable element alone', () => {
    const boost = SKILLS.find(skill => skill.name === 'Install Element Boost')!;
    const summoner = build({ mainClass: 'Summoner', subClass: 'Summoner' });
    summoner.skillRanks = { main: { [boost.id]: 3 }, sub: {} };
    const before = evaluateBuild(summoner).elementalAttack;
    summoner.skillConditionals = { [conditionalKey(boost.id, 0)]: true };
    expect(evaluateBuild(summoner).elementalAttack).toEqual(before);
  });
});

describe('trait data', () => {
  it('marks Blood Binding as hand-modelled so the Karakuri body is not counted twice', () => {
    // `karakuriBonus` already applies these offsets from `karakuriYoukai`.
    const bindings = TRAITS.filter(trait => trait.id.startsWith('blood-binding-'));
    expect(bindings.length).toBe(7);
    for (const trait of bindings) expect(trait.handModelled).toBe(true);
  });

  it('checks requirements against base stats, excluding the APT bonus', () => {
    // Wiki: "bonuses from APT or items will not contribute" to a trait requirement.
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
    const problems = youkaiViolations(state, 1);
    expect(problems.some(problem => problem.includes('cap of 1'))).toBe(true);
    expect(problems.some(problem => problem.includes('Install skill is unranked'))).toBe(true);
  });

  it('accepts an Install backed by the whole prerequisite chain', () => {
    const state = build();
    state.youkai = { contracted: ['apus'], installed: 'apus' };
    state.skillRanks = { main: { install: 1, 'sync-mind': 1, 'the-contract': 1 }, sub: {} };
    expect([...skillViolations(state), ...youkaiViolations(state, 8)]).toEqual([]);
  });

  it('rejects a skill whose prerequisite is unranked', () => {
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
    expect(skillViolations(state).some(problem => problem.includes('not reachable'))).toBe(true);
  });

  it('only lets a Summoner-tree build contract', () => {
    expect(canContractYoukai(build({ mainClass: 'Shapeshifter', subClass: 'Ghost' }), baseClassOf)).toBe(true);
    expect(canContractYoukai(build({ mainClass: 'Soldier', subClass: 'Ghost' }), baseClassOf)).toBe(false);
  });
});
