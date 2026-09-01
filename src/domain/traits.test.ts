import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import {
  TRAITS,
  traitById,
  traitCost,
  traitEligibility,
  traitPointBudget,
  traitPointsSpent,
  traitStatBonuses,
  traitsByCategory,
  uncheckedRequirements,
} from './traits';

const build = (over: Record<string, unknown> = {}) => parseBuildFile(JSON.stringify({
  version: '0.5.0', buildName: 'Trait fixture', race: 'Human', subrace: 'Imperialist',
  mainClass: 'Soldier', subClass: 'Mage', characterLevel: 60, food: 'None', history: 'None',
  hpPercent: 100, ...over,
})).build;

const noStats = { baseStats: {}, race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage' };

describe('trait point budget', () => {
  it('is one point plus one every three levels, plus the always-on extension bonus', () => {
    expect(traitPointBudget(1)).toBe(4);
    expect(traitPointBudget(3)).toBe(5);
  });

  it('reaches 24 at max level with the legend extension bonus', () => {
    expect(traitPointBudget(60)).toBe(24);
  });
});

describe('trait cost', () => {
  it('is one point for an ordinary trait', () => {
    const general = TRAITS.find(t => t.category === 'General')!;
    expect(traitCost(general, 'Human')).toBe(1);
  });

  it('is free for a Human History trait', () => {
    const history = TRAITS.find(t => t.category === 'History')!;
    expect(traitCost(history, 'Human')).toBe(0);
    expect(traitCost(history, 'Kaelensia')).toBe(1);
  });

  it('sums only the traits actually taken', () => {
    const general = TRAITS.filter(t => t.category === 'General').slice(0, 3).map(t => t.id);
    expect(traitPointsSpent(general, 'Kaelensia')).toBe(3);
    expect(traitPointsSpent([...general, 'not-a-trait'], 'Kaelensia')).toBe(3);
  });
});

describe('trait eligibility', () => {
  it('checks stat minimums against the base total supplied', () => {
    const gated = TRAITS.find(t => Object.keys(t.requirements.stats).length === 1)!;
    const [stat, minimum] = Object.entries(gated.requirements.stats)[0] as [string, number];
    expect(traitEligibility(gated, noStats).eligible).toBe(false);
    const met = { ...noStats, baseStats: { [stat]: minimum } };
    expect(traitEligibility(gated, met).eligible).toBe(true);
  });

  it('reports the shortfall rather than just failing', () => {
    const gated = TRAITS.find(t => Object.keys(t.requirements.stats).length === 1)!;
    const [stat, minimum] = Object.entries(gated.requirements.stats)[0] as [string, number];
    const { reasons } = traitEligibility(gated, { ...noStats, baseStats: { [stat]: minimum - 1 } });
    expect(reasons[0]).toContain(String(minimum));
  });

  it('checks a race requirement against race and subrace', () => {
    const racial = TRAITS.find(t => (
      t.requirements.races.length === 1
      && !Object.keys(t.requirements.stats).length
      && !t.requirements.traits.length
    ))!;
    const required = racial.requirements.races[0];
    expect(traitEligibility(racial, noStats).eligible).toBe(false);
    expect(traitEligibility(racial, { ...noStats, subrace: required }).eligible).toBe(true);
  });

  it('passes a trait with no requirements', () => {
    const free = TRAITS.find(t => (
      !Object.keys(t.requirements.stats).length
      && !t.requirements.races.length
      && !t.requirements.excludedRaces.length
      && !t.requirements.classes.length
      && !t.requirements.traits.length
    ))!;
    expect(traitEligibility(free, noStats).eligible).toBe(true);
  });

  /*
   * The Human eyes chain names its race only in an aside, "(Human Only)", and
   * its prerequisite trait rather than a "Human Race" clause. Read literally
   * that is no requirement at all, which put Human traits on every race.
   */
  it('gates a racial trait whose race is stated as an aside', () => {
    const divineEyes = traitById('divine-eyes')!;
    expect(divineEyes.requirements.races).toEqual(['Human']);
    const redtail = { ...noStats, race: 'Other', subrace: 'Redtail', taken: ['eyes-of-elimination'] };
    expect(traitEligibility(divineEyes, redtail).eligible).toBe(false);
  });

  it('leaves no racial trait open to every race', () => {
    const ungated = TRAITS.filter(t => (
      t.category === 'Racial'
      && !t.requirements.races.length
      && !t.requirements.excludedRaces.length
      && !t.requirements.traits.length
    ));
    expect(ungated.map(t => t.id)).toEqual([]);
  });

  it('requires a prerequisite trait to be taken', () => {
    const divineEyes = traitById('divine-eyes')!;
    const human = { ...noStats, taken: [] as string[] };
    expect(traitEligibility(divineEyes, human).reasons).toContain('Requires the Eyes of Elimination trait');
    expect(traitEligibility(divineEyes, { ...human, taken: ['eyes-of-elimination'] }).eligible).toBe(true);
  });

  it('accepts any one of a prerequisite stated as a pair', () => {
    const deadlyDuo = traitById('deadly-duo')!;
    const oni = { ...noStats, race: 'Ancients', subrace: 'Oni' };
    expect(traitEligibility(deadlyDuo, { ...oni, taken: ['oni-heritage-blue'] }).eligible).toBe(true);
    expect(traitEligibility(deadlyDuo, { ...oni, taken: ['oni-heritage-red'] }).eligible).toBe(true);
    expect(traitEligibility(deadlyDuo, oni).eligible).toBe(false);
  });

  /* "Lupine, Felidae, Grimalkin or Shaitan Race": the comma entries were lost. */
  it('keeps every race of a comma-separated list', () => {
    const sharpClaws = traitById('sharp-claws')!;
    expect(sharpClaws.requirements.races).toEqual(['Lupine', 'Felidae', 'Grimalkin', 'Shaitan']);
    expect(traitEligibility(sharpClaws, { ...noStats, subrace: 'Lupine' }).eligible).toBe(true);
  });

  /* "Non-Corrupted Race" was read as *requiring* Corrupted. */
  it('reads a Non-X race clause as an exclusion', () => {
    const lovelyFace = traitById('lovely-face')!;
    const stats = { wil: 10, gui: 15 };
    expect(traitEligibility(lovelyFace, { ...noStats, baseStats: stats }).eligible).toBe(true);
    const shaitan = { ...noStats, baseStats: stats, race: 'Corrupted', subrace: 'Shaitan' };
    expect(traitEligibility(lovelyFace, shaitan).eligible).toBe(false);
  });

  /* The wiki writes "Agile Mechanation"; the calculator's race is "Mechanation AGILE". */
  it('resolves race names to the calculator’s own spelling', () => {
    const booster = traitById('agile-accel-booster')!;
    expect(traitEligibility(booster, { ...noStats, race: 'Other', subrace: 'Mechanation AGILE' }).eligible).toBe(true);
  });
});

/*
 * The wiki states a stat minimum in three shapes. Only "15 FAI" used to parse,
 * so every trait written the other two ways carried no requirement at all and
 * never locked: Undeniable Toughness offered itself to a 1 VIT character.
 */
describe('stat minimums, however the wiki writes them', () => {
  it.each([
    ['80+ VIT, 30+ STR, 30+ WIL', 'undeniable-toughness', { vit: 80, str: 30, wil: 30 }],
    ['15 Base STR', 'monster-hunter', { str: 15 }],
    ['15 FAI, 15 WIL, 15 APT', 'weapon-telepathy', { fai: 15, wil: 15, apt: 15 }],
  ])('reads %s', (_raw, id, expected) => {
    expect(traitById(id)!.requirements.stats).toEqual(expected);
  });

  it('locks a trait whose minimum the build does not meet', () => {
    const toughness = traitById('undeniable-toughness')!;
    expect(traitEligibility(toughness, { ...noStats, baseStats: { vit: 79, str: 30, wil: 30 } }).reasons)
      .toEqual(['VIT 79/80']);
    expect(traitEligibility(toughness, { ...noStats, baseStats: { vit: 80, str: 30, wil: 30 } }).eligible).toBe(true);
  });

  it('leaves no trait stating a stat it does not check', () => {
    const stated = /(\d+)\s*\+?\s*(?:Base\s+)?(str|wil|ski|cel|def|res|vit|fai|luc|gui|san|apt)\b/gi;
    const missed = TRAITS.filter(trait => {
      // An either-or clause is exempt: its stat half is deliberately not enforced.
      const raw = trait.requirements.alternatives.reduce((text, clause) => text.replace(clause, ''), trait.requirements.raw);
      return [...raw.matchAll(stated)].some(m => trait.requirements.stats[m[2].toLowerCase() as 'str'] === undefined);
    });
    expect(missed.map(t => t.id)).toEqual([]);
  });

  /*
   * The other direction: a minimum offered as one of several alternatives is not
   * a minimum, and enforcing the half the build models would lock out a
   * character who qualifies through the half it does not.
   */
  it('does not enforce a stat offered as an alternative', () => {
    const entertainer = traitById('ghost-entertainer')!;
    expect(entertainer.requirements.raw).toContain('or');
    expect(entertainer.requirements.stats).toEqual({});
    expect(traitEligibility(entertainer, noStats).eligible).toBe(true);
    expect(uncheckedRequirements(entertainer)).toContain('10 SAN or 7+ Ranks in Spiritualism');
  });

  it('still enforces a minimum that merely sits beside an unmodelled gate', () => {
    const resilience = traitById('poison-resilience')!;
    expect(resilience.requirements.stats).toEqual({ vit: 20 });
    expect(traitEligibility(resilience, noStats).eligible).toBe(false);
  });
});

describe('trait stat bonuses', () => {
  it('sums flat bonuses from the taken traits', () => {
    const withStats = TRAITS.filter(t => !t.handModelled && Object.keys(t.statBonuses).length).slice(0, 3);
    const total = traitStatBonuses(withStats.map(t => t.id));
    // Summed, not compared per trait: some traits carry a penalty, so a total
    // can legitimately be lower than any one contributor.
    const expected: Record<string, number> = {};
    for (const trait of withStats) {
      for (const [stat, value] of Object.entries(trait.statBonuses)) {
        expected[stat] = (expected[stat] ?? 0) + (value ?? 0);
      }
    }
    expect(total).toEqual(expected);
  });

  it('skips History traits, which the history control already grants', () => {
    const history = TRAITS.find(t => t.category === 'History' && Object.keys(t.statBonuses).length)!;
    expect(history.handModelled).toBe(true);
    expect(traitStatBonuses([history.id])).toEqual({});
  });

  it('feeds a taken trait into the build stats', () => {
    const trait = TRAITS.find(t => !t.handModelled && Object.keys(t.statBonuses).length === 1)!;
    const [stat, value] = Object.entries(trait.statBonuses)[0] as [string, number];
    const base = build();
    const before = evaluateBuild(base).rawStats[stat as 'str'];
    base.traits = [trait.id];
    expect(evaluateBuild(base).rawStats[stat as 'str']).toBe(before + value);
  });
});

describe('trait persistence', () => {
  it('round-trips taken traits and drops unknown ids', () => {
    const known = TRAITS[0].id;
    const restored = parseBuildFile(JSON.stringify({
      ...build(), version: '0.5.0', buildName: 'x', traits: [known, 'not-a-trait', known],
    })).build;
    expect(restored.traits).toEqual([known]);
  });

  it('defaults to no traits', () => {
    expect(build().traits).toEqual([]);
  });
});

describe('trait grouping', () => {
  it('groups every trait into a non-empty category', () => {
    const groups = traitsByCategory();
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.reduce((n, g) => n + g.traits.length, 0)).toBe(TRAITS.length);
  });

  it('gives every trait a stable id', () => {
    const ids = TRAITS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(traitById(ids[0])).toBeDefined();
  });
});
