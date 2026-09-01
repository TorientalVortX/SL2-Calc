import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { mergeSkillRanks, skillDamageAtRank, skillDamageProfile } from './skillDamage';
import {
  SKILLS,
  fpCostAtRank,
  skillBonuses,
  skillById,
  inertReason,
  resetSkillRanksForClassSlot,
  setSkillRankForClassSlots,
  skillPoolsForClass,
  skillRanksForClassSlot,
  skillsForClassSlots,
  skillsForClass,
  skillsForClassTree,
  valueAtRank,
} from './skills';

function baseBuild() {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Skill fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Ghost', subClass: 'Rogue', characterLevel: 10, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

describe('skill dataset', () => {
  it('carries the wiki values for a representative skill', () => {
    const skill = skillById('sanguine-star');
    expect(skill).toBeDefined();
    expect(skill?.classes).toEqual(['Ghost']);
    expect(skill?.category).toBe('Offensive');
    expect(skill?.maxRank).toBe(5);
    // "13/15/17/19/21 FP" and "100/110/120/130/140% Scaled WPN ATK" on the wiki.
    expect(skill?.fpByRank).toEqual([13, 15, 17, 19, 21]);
    expect(skill?.momentum).toBe(3);
    expect(skill?.scaling).toEqual([
      { source: 'weapon', label: 'Scaled Weapon ATK', percentByRank: [100, 110, 120, 130, 140] },
    ]);
  });

  it('gives every skill per-rank arrays that cover its ranks', () => {
    for (const skill of SKILLS) {
      if (skill.fpByRank) expect(skill.fpByRank.length).toBeGreaterThanOrEqual(skill.maxRank);
      for (const term of skill.scaling ?? []) {
        expect(term.percentByRank.length).toBeGreaterThanOrEqual(skill.maxRank);
      }
    }
  });

  it('never assigns an element the calculator cannot score', () => {
    // Darkness and generic "Elemental" damage are real but unattributable; they
    // must stay null rather than being folded into Dark.
    for (const skill of SKILLS) {
      for (const term of skill.scaling ?? []) {
        if (term.unmodelled) expect(term.element ?? null).toBeNull();
      }
    }
  });

  it('reads per-rank values one-indexed and clamps past the last rank', () => {
    expect(valueAtRank([10, 20, 30], 1)).toBe(10);
    expect(valueAtRank([10, 20, 30], 3)).toBe(30);
    expect(valueAtRank([10, 20, 30], 9)).toBe(30);
    expect(valueAtRank([10, 20, 30], 0)).toBeNull();
    expect(valueAtRank(null, 1)).toBeNull();
  });

  it('keeps a promoted class and its base class in separate pools', () => {
    const pools = skillPoolsForClass('Ghost');
    expect(pools.map(pool => [pool.className, pool.role])).toEqual([['Ghost', 'class'], ['Duelist', 'base']]);
    // A skill belongs to exactly one pool, so no row can appear twice.
    expect(pools[0].skills.every(skill => skill.classes.includes('Ghost'))).toBe(true);
    expect(pools[1].skills.every(skill => !skill.classes.includes('Ghost'))).toBe(true);
    const ids = pools.flatMap(pool => pool.skills.map(skill => skill.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives a base class a single pool', () => {
    const pools = skillPoolsForClass('Duelist');
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({ className: 'Duelist', role: 'class' });
  });

  it('never mixes one class slot into another slot pool', () => {
    // Ghost promotes from Duelist; Soldier is unrelated and must not appear.
    const ghostIds = new Set(skillPoolsForClass('Ghost').flatMap(pool => pool.skills.map(s => s.id)));
    const soldierIds = skillPoolsForClass('Soldier').flatMap(pool => pool.skills.map(s => s.id));
    expect(soldierIds.some(id => ghostIds.has(id))).toBe(false);
  });

  it('covers the same skills as the flat tree used by the calculations', () => {
    for (const className of ['Ghost', 'Duelist', 'Summoner', 'Grand Summoner']) {
      const pooled = skillPoolsForClass(className).flatMap(pool => pool.skills.map(s => s.id)).sort();
      const flat = skillsForClassTree(className).map(s => s.id).sort();
      expect(pooled).toEqual(flat);
    }
  });

  it('includes the base class sheet in a promoted class tree', () => {
    const own = skillsForClass('Ghost');
    const tree = skillsForClassTree('Ghost');
    expect(tree.length).toBeGreaterThan(own.length);
    expect(tree.some(skill => skill.classes.includes('Duelist'))).toBe(true);
    expect(new Set(tree.map(skill => skill.id)).size).toBe(tree.length);
  });

  it('shows and edits a shared base-class rank from either class tab', () => {
    const classes = ['Shapeshifter', 'Grand Summoner'] as const;
    const ranks = {
      main: { install: 3, 'alteration-fixation': 1 },
      sub: { 'absorb-ether': 1 },
    };

    const subVisible = skillRanksForClassSlot(...classes, ranks, 'sub');
    expect(subVisible.install).toBe(3);
    expect(subVisible['alteration-fixation']).toBeUndefined();

    const changed = setSkillRankForClassSlots(...classes, ranks, 'sub', 'install', 2);
    expect(changed.main.install).toBe(2);
    expect(changed.sub.install).toBe(2);
    expect(changed.main['alteration-fixation']).toBe(1);
    expect(changed.sub['absorb-ether']).toBe(1);
  });

  it('resets shared base-class ranks without erasing the other promotion', () => {
    const ranks = {
      main: { install: 3, 'alteration-fixation': 1 },
      sub: { install: 3, 'absorb-ether': 1 },
    };
    const reset = resetSkillRanksForClassSlot('Shapeshifter', 'Grand Summoner', ranks, 'main');

    expect(reset.main).toEqual({});
    expect(reset.sub).toEqual({ 'absorb-ether': 1 });
  });
});

describe('skill bonuses', () => {
  it('applies always-on effects and ignores situational ones until enabled', () => {
    const dodger = skillById('dodger');
    expect(dodger?.effects[0]?.applies).toBe('always');

    const backstab = skillById('backstab');
    // Backstab needs a dagger and a position behind the target, so it must not
    // count on its own.
    expect(backstab?.effects.every(effect => effect.applies === 'conditional')).toBe(true);

    const skills = [dodger!, backstab!];
    const ranks = { dodger: 1, backstab: 3 };
    expect(skillBonuses(skills, ranks).derived).toEqual({ evade: 5 });

    const key = `backstab:${backstab!.effects.findIndex(e => e.key === 'critical')}`;
    expect(skillBonuses(skills, ranks, { [key]: true }).derived.critical).toBe(6);
  });

  it('counts a shared skill once when both slots reach it', () => {
    // A monoclass build has the same class twice, and any two classes promoted
    // from one base share that base's skills. Concatenating the two trees would
    // apply every shared bonus twice.
    const mono = skillsForClassSlots('Rogue', 'Rogue');
    expect(new Set(mono.map(s => s.id)).size).toBe(mono.length);
    const shared = skillsForClassSlots('Ghost', 'Kensei');
    expect(new Set(shared.map(s => s.id)).size).toBe(shared.length);
    expect(shared.some(s => s.classes.includes('Duelist'))).toBe(true);
  });

  it('applies an always-on bonus once on a monoclass build', () => {
    const mono = baseBuild();
    mono.mainClass = 'Rogue';
    mono.subClass = 'Rogue';
    const before = evaluateBuild(mono).derived.evade;
    mono.skillRanks = { main: { dodger: 1 }, sub: { dodger: 1 } };
    expect(evaluateBuild(mono).derived.evade).toBe(before + 5);
  });

  it('reads a "<stat> Bonus" label as the stat it names', () => {
    // "Defense Bonus" and "Wil Bonus" are stats, not derived channels, and both
    // skills say they raise them passively.
    expect(skillById('iron-wall')!.effects).toEqual([
      { kind: 'stat', key: 'def', valueByRank: [1, 2, 3, 4, 6], applies: 'always' },
    ]);
    expect(skillById('spiritual-domination')!.effects).toEqual([
      { kind: 'stat', key: 'wil', valueByRank: [1, 2, 3, 4, 6], applies: 'always' },
    ]);
    // A multi-stat label splits into one effect per stat.
    expect(skillById('discipline')!.effects.map(e => e.key)).toEqual(['ski', 'cel']);
  });

  it('treats an "at max rank" clause as part of the rank list, not a condition', () => {
    // These read +1/2/3/4/6 precisely because rank 5 already includes the bonus,
    // so the clause must not demote the whole skill to situational.
    for (const id of ['honed-shot', 'pure-genius', 'spiritual-domination']) {
      expect(skillById(id)!.effects[0]).toMatchObject({ applies: 'always', valueByRank: [1, 2, 3, 4, 6] });
    }
  });

  it('keeps a timed buff situational even when it names stats', () => {
    // Invigoration lasts 3 rounds, so its STR/WIL bonus is not permanent.
    const invigoration = skillById('invigoration')!;
    expect(invigoration.effects.map(e => e.key)).toEqual(['str', 'wil']);
    expect(invigoration.effects.every(e => e.applies === 'conditional')).toBe(true);
  });

  it('feeds an always-on stat bonus through to the build', () => {
    const build = baseBuild();
    build.mainClass = 'Evoker';
    build.subClass = 'Mage';
    const before = evaluateBuild(build).rawStats.wil;
    build.skillRanks = { main: { 'spiritual-domination': 5 }, sub: {} };
    expect(evaluateBuild(build).rawStats.wil).toBe(before + 6);
  });

  it('reads the stats a Wild Shape names in its own text', () => {
    const bear = skillById('wild-shape-bear')!;
    expect(bear.effects.map(effect => effect.key).sort()).toEqual(['def', 'res', 'vit']);
    expect(bear.effects.every(effect => effect.valueByRank[0] === 3)).toBe(true);
  });

  it('explains why a skill leaves the stat block alone', () => {
    // An attack: its numbers are damage, not a passive bonus.
    expect(inertReason(skillById('sanguine-star')!)).toMatch(/damage it deals/);
    // A bonus the calculator does track.
    expect(inertReason(skillById('dodger')!)).toBeNull();
  });

  it('counts nothing for a skill left at rank 0', () => {
    const dodger = skillById('dodger')!;
    expect(skillBonuses([dodger], {}).derived).toEqual({});
  });

  it('skips skills the build already models as their own field', () => {
    const handModelled = SKILLS.filter(skill => skill.handModelled && skill.effects.length);
    for (const skill of handModelled) {
      const ranks = { [skill.id]: skill.maxRank };
      const conditionals = Object.fromEntries(skill.effects.map((_, i) => [`${skill.id}:${i}`, true]));
      expect(skillBonuses([skill], ranks, conditionals)).toEqual({ stats: {}, derived: {} });
    }
  });

  it('feeds an always-on evade bonus through to the build evaluation', () => {
    const build = baseBuild();
    const before = evaluateBuild(build).derived.evade;
    build.skillRanks = { main: {}, sub: { dodger: 1 } };
    expect(evaluateBuild(build).derived.evade).toBe(before + 5);
  });
});

describe('skill damage', () => {
  it('splits a formula into weapon and elemental percentages', () => {
    const skill = skillById('sanguine-star')!;
    const entry = skillDamageAtRank(skill, 3);
    expect(entry).toMatchObject({ swaPercent: 120, elementalAttackPercent: 0, element: null });
    expect(entry?.unscoredTerms).toEqual([]);
  });

  it('reports damage it cannot attribute instead of scoring it', () => {
    const unattributable = SKILLS.find(skill => skill.scaling?.some(term => term.unmodelled));
    expect(unattributable).toBeDefined();
    const entry = skillDamageAtRank(unattributable!, 1);
    if (entry) expect(entry.unscoredTerms.length).toBeGreaterThan(0);
  });

  it('returns nothing for a skill that deals no modellable damage', () => {
    expect(skillDamageAtRank(skillById('dodger')!, 1)).toBeNull();
    expect(skillDamageAtRank(skillById('sanguine-star')!, 0)).toBeNull();
  });

  it('orders a profile by total scaling and skips unknown ids', () => {
    const profile = skillDamageProfile({ 'sanguine-star': 5, 'not-a-skill': 3, dodger: 1 });
    expect(profile.map(entry => entry.skillId)).toEqual(['sanguine-star']);
    expect(profile[0].swaPercent).toBe(140);
  });

  it('merges both class slots, keeping the higher rank', () => {
    expect(mergeSkillRanks({ main: { a: 2, b: 1 }, sub: { a: 4, c: 3 } })).toEqual({ a: 4, b: 1, c: 3 });
  });
});

describe('class skills moved off the Talents sheet', () => {
  const ghostBuild = () => {
    const build = baseBuild();
    build.mainClass = 'Ghost';
    build.subClass = 'Soldier';
    return build;
  };

  it('drives Pain Tolerance from its skill rank', () => {
    const build = ghostBuild();
    const before = evaluateBuild(build).derived.maxHP;
    build.skillRanks = { main: { 'pain-tolerance': 3 }, sub: {} };
    expect(evaluateBuild(build).derived.maxHP).toBe(before + 30);
  });

  it('drives Rising Game from its skill rank', () => {
    const build = ghostBuild();
    build.hpPercent = 25;
    const before = evaluateBuild(build).rawStats.str;
    build.skillRanks = { main: { 'rising-game': 5 }, sub: {} };
    expect(evaluateBuild(build).rawStats.str).toBeGreaterThan(before);
  });

  it('drives Fortitude and Endurance from their skill ranks', () => {
    const build = ghostBuild();
    const before = evaluateBuild(build).derived.maxHP;
    build.skillRanks = { main: { fortitude: 1 }, sub: {} };
    expect(evaluateBuild(build).derived.maxHP).toBeGreaterThan(before);
  });

  it('migrates a build saved with the old Talents fields', () => {
    const restored = parseBuildFile(JSON.stringify({
      version: '0.5.0', buildName: 'legacy', race: 'Human', subrace: 'Imperialist',
      mainClass: 'Ghost', subClass: 'Soldier', characterLevel: 10,
      // painTolerance was stored as granted HP, not as a rank.
      risingGame: 4, painTolerance: 30, fortitude: true, endurance: false,
    })).build;
    expect(restored.skillRanks.main).toMatchObject({
      'rising-game': 4,
      'pain-tolerance': 3,
      fortitude: 1,
    });
    expect(restored.skillRanks.main.endurance).toBeUndefined();
  });

  it('lets an explicit rank win over the legacy field', () => {
    const restored = parseBuildFile(JSON.stringify({
      version: '0.5.0', buildName: 'x', race: 'Human', subrace: 'Imperialist',
      mainClass: 'Ghost', subClass: 'Soldier', characterLevel: 10,
      risingGame: 4, skillRanks: { main: { 'rising-game': 2 }, sub: {} },
    })).build;
    expect(restored.skillRanks.main['rising-game']).toBe(2);
  });
});

describe('skill persistence', () => {
  it('round-trips ranks and conditionals through a build file', () => {
    const build = baseBuild();
    build.skillRanks = { main: { 'sanguine-star': 4 }, sub: { dodger: 1 } };
    build.skillConditionals = { 'backstab:0': true };
    const restored = parseBuildFile(JSON.stringify({ ...build, version: '0.5.0', buildName: 'x' })).build;
    expect(restored.skillRanks).toEqual(build.skillRanks);
    expect(restored.skillConditionals).toEqual(build.skillConditionals);
  });

  it('defaults missing skill data and drops non-positive ranks', () => {
    const restored = parseBuildFile(JSON.stringify({
      version: '0.5.0', buildName: 'x', race: 'Human', subrace: 'Imperialist',
      mainClass: 'Ghost', subClass: 'Rogue', characterLevel: 10,
      skillRanks: { main: { good: 2, zero: 0, negative: -1, junk: 'x' } },
    })).build;
    expect(restored.skillRanks).toEqual({ main: { good: 2 }, sub: {} });
    expect(restored.skillConditionals).toEqual({});
  });
});

describe('skill cost lookups', () => {
  it('returns the FP for a rank and null when a skill has no FP cost', () => {
    expect(fpCostAtRank(skillById('sanguine-star')!, 1)).toBe(13);
    expect(fpCostAtRank(skillById('sanguine-star')!, 5)).toBe(21);
    expect(fpCostAtRank(skillById('dodger')!, 1)).toBeNull();
  });
});
