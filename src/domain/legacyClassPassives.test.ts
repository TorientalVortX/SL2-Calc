import { describe, expect, it } from 'vitest';
import { normalizeBuildState, encodeSharePayload, decodeSharePayload, createBuildFile, parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { skillBonuses, skillById, skillsForClassSlots } from './skills';

const fixture = {
  race: 'Homunculi', subrace: 'Amalgama', mainClass: 'Ghost', subClass: 'Black Knight',
  mainClassPassive: 5, subClassPassive: 6,
};

describe('legacy class-passive imports', () => {
  it('migrates sliders into skills and never exports the obsolete fields', () => {
    const build = normalizeBuildState(fixture);
    expect(build.skillRanks).toEqual({ main: { 'anti-curse': 5 }, sub: { 'iron-wall': 5 } });
    expect(build).not.toHaveProperty('mainClassPassive');
    expect(build).not.toHaveProperty('subClassPassive');
    expect(decodeSharePayload(encodeSharePayload('Migrated', build)).build).toEqual(build);
    expect(parseBuildFile(JSON.stringify(createBuildFile('Migrated', build))).build).toEqual(build);
  });

  it('counts Iron Wall and Anti-Curse once when both old and new controls were saved', () => {
    const ranks = { main: { 'anti-curse': 5 }, sub: { 'iron-wall': 5 } };
    const build = normalizeBuildState({ ...fixture, skillRanks: ranks });
    const withoutSkills = normalizeBuildState({ ...fixture, mainClassPassive: 0, subClassPassive: 0 });
    const actual = evaluateBuild(build).rawStats;
    const baseline = evaluateBuild(withoutSkills).rawStats;
    expect(actual.def - baseline.def).toBe(6);
    expect(actual.res - baseline.res).toBe(5);
    // Even an unnormalized object cannot reactivate the deleted calculation path.
    expect(evaluateBuild({ ...build, ...fixture }).rawStats).toEqual(actual);
  });

  it('keeps explicit skill choices, including zero and choices in the other slot', () => {
    const build = normalizeBuildState({
      ...fixture, skillRanks: { main: { 'anti-curse': 0, 'iron-wall': 2 }, sub: {} },
    });
    expect(build.skillRanks).toEqual({ main: { 'iron-wall': 2 }, sub: {} });
  });

  it('does not resurrect a migrated bonus after the skill is removed and saved', () => {
    const build = normalizeBuildState(fixture);
    build.skillRanks = { main: {}, sub: {} };
    expect(decodeSharePayload(encodeSharePayload('Reset', build)).build.skillRanks)
      .toEqual({ main: {}, sub: {} });
  });

  it('only migrates a class\'s own skill and merges monoclass sliders at the highest rank', () => {
    const build = normalizeBuildState({
      ...fixture, mainClass: 'Curate', subClass: 'Priest', mainClassPassive: 3, subClassPassive: 6,
    });
    expect(build.skillRanks).toEqual({ main: {}, sub: { piety: 5 } });
    const sameClass = normalizeBuildState({
      ...fixture, mainClass: 'Ghost', subClass: 'Ghost', mainClassPassive: 2, subClassPassive: 5,
    });
    expect(sameClass.skillRanks).toEqual({ main: { 'anti-curse': 5 }, sub: {} });
  });

  it.each([Number.NaN, Infinity, -1, '5', null])('ignores invalid legacy ranks: %s', rank => {
    expect(normalizeBuildState({ ...fixture, mainClassPassive: rank, subClassPassive: rank }).skillRanks)
      .toEqual({ main: {}, sub: {} });
  });

  it('does not recreate the obsolete Bard SAN bonus without a corresponding skill', () => {
    expect(normalizeBuildState({ ...fixture, mainClass: 'Bard', mainClassPassive: 6, subClassPassive: 0 }).skillRanks)
      .toEqual({ main: {}, sub: {} });
  });
});

describe('class stat skills are the sole source of innate bonuses', () => {
  it.each([
    ['Dark Bard', 'dark-bard-s-pledge', 3, { san: 3, str: 3 }],
    ['Lantern Bearer', 'warding-light', 5, { res: 6 }],
    ['Magic Gunner', 'exposure-tolerance', 3, { cel: 3, res: 3 }],
    ['Solblader', 'illuminating-sol', 3, { fai: 3, gui: 3 }],
    ['Priest', 'piety', 5, { fai: 6 }],
  ] as const)('%s applies its stat skill without a conditional toggle', (className, id, rank, expected) => {
    expect(skillById(id)?.maxRank).toBe(rank);
    const bonuses = skillBonuses(skillsForClassSlots(className, className), { [id]: rank }, {});
    expect(bonuses.stats).toEqual(expected);
    const migrated = normalizeBuildState({ ...fixture, mainClass: className, mainClassPassive: 6, subClassPassive: 0 });
    expect(migrated.skillRanks.main[id]).toBe(rank);
  });
});
