import { describe, expect, it } from 'vitest';
import { evaluateBuild } from '../../domain/buildEvaluation';
import { youkaiRaceBaseStats } from '../../domain/youkai';
import { buildReducer, createDefaultBuild } from './build';

const summoner = () => buildReducer(createDefaultBuild(), {
  type: 'class', slot: 'main', className: 'Summoner',
});

const contract = (build: ReturnType<typeof createDefaultBuild>, id: string) =>
  buildReducer(build, { type: 'youkai-contract', id, contracted: true });

describe('youkai contracts', () => {
  it('contracts and releases by id', () => {
    let build = contract(summoner(), 'suzaku');
    expect(build.youkai.contracted).toContain('suzaku');
    build = buildReducer(build, { type: 'youkai-contract', id: 'suzaku', contracted: false });
    expect(build.youkai.contracted).not.toContain('suzaku');
  });

  it('replaces a base form with its ascended form', () => {
    let build = contract(summoner(), 'suzaku');
    build = contract(build, 'suzaku-ascended');
    expect(build.youkai.contracted).toEqual(['suzaku-ascended']);
  });

  it('never downgrades an ascended contract back to its base', () => {
    let build = contract(summoner(), 'suzaku-ascended');
    build = contract(build, 'suzaku');
    expect(build.youkai.contracted).toEqual(['suzaku-ascended']);
  });

  it('carries the install across an ascension', () => {
    let build = contract(summoner(), 'suzaku');
    build = buildReducer(build, { type: 'youkai-install', id: 'suzaku' });
    expect(build.youkai.installed).toBe('suzaku');
    build = contract(build, 'suzaku-ascended');
    expect(build.youkai.installed).toBe('suzaku-ascended');
  });

  it('clears the install when the installed youkai is released', () => {
    let build = contract(summoner(), 'byakko');
    build = buildReducer(build, { type: 'youkai-install', id: 'byakko' });
    build = buildReducer(build, { type: 'youkai-contract', id: 'byakko', contracted: false });
    expect(build.youkai.contracted).toEqual([]);
    expect(build.youkai.installed).toBeNull();
  });

  it('refuses to install a youkai that is not contracted', () => {
    const build = buildReducer(summoner(), { type: 'youkai-install', id: 'byakko' });
    expect(build.youkai.installed).toBeNull();
  });

  it('releases everything at once', () => {
    let build = contract(contract(summoner(), 'suzaku'), 'byakko');
    expect(build.youkai.contracted).toHaveLength(2);
    build = buildReducer(build, { type: 'youkai-clear' });
    expect(build.youkai).toEqual({ contracted: [], installed: null });
  });
});

describe('install', () => {
  it('substitutes the race line, and only once Install is ranked', () => {
    let build = contract(summoner(), 'byakko');
    build = buildReducer(build, { type: 'youkai-install', id: 'byakko' });
    const beastLine = youkaiRaceBaseStats('Beast')!;
    const evaluation = evaluateBuild(build);
    expect(beastLine.str).toBeDefined();
    expect(evaluation.rawStats.str).not.toBe(evaluateBuild(summoner()).rawStats.str);
  });

  it('leaves FAI, SAN and APT on the character', () => {
    let build = contract(summoner(), 'byakko');
    build = buildReducer(build, { type: 'youkai-install', id: 'byakko' });
    const line = youkaiRaceBaseStats('Beast')!;
    for (const stat of ['fai', 'san', 'apt'] as const) {
      const installed = evaluateBuild(build).rawStats[stat];
      const bare = evaluateBuild(summoner()).rawStats[stat];
      expect(installed).toBe(bare);
      expect(line[stat] === undefined || installed === bare).toBe(true);
    }
  });
});
