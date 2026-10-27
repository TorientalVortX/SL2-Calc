import { describe, expect, it } from 'vitest';
import { evaluateBuild } from '../../domain/buildEvaluation';
import { buildReducer, createDefaultBuild, STAT_KEYS, TEMPLATES } from './build';
import { buildCardModel } from './buildCard';
import { formatReadout, formatScaled, readoutGroups } from './readout';

const counts = { skillsSpent: 12, skillsBudget: 70, traitsSpent: 3, traitsBudget: 24, talentsSpent: 10, talentsBudget: 65 };

function armed() {
  let build = TEMPLATES.find(template => template.id === 'soldier')!.build;
  build = buildReducer(build, { type: 'class', slot: 'sub', className: 'Black Knight' });
  return buildReducer(build, { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Dynaxis' });
}

describe('build card model', () => {
  it('reads every figure from the same readouts the sheet shows', () => {
    const build = armed();
    const evaluation = evaluateBuild(build);
    const model = buildCardModel(build, evaluation, 'Card fixture', counts);
    const rows = readoutGroups(evaluation).flatMap(group => group.rows);
    const hp = rows.find(row => row.key === 'maxHP')!;

    expect(model.stats.map(stat => stat.key)).toEqual(STAT_KEYS);
    expect(model.stats[0].value).toBe(formatScaled(evaluation.scaledStats.str));
    expect(model.derived[0]).toEqual({ label: hp.label, value: formatReadout(hp.value, hp.format) });
    expect(model.derived.map(row => row.label)).toContain('SWA');
  });

  it('names the class pair, the origin and all six slots', () => {
    const build = armed();
    const model = buildCardModel(build, evaluateBuild(build), 'Card fixture', counts);
    expect(model.classes).toBe(`${build.mainClass} / Black Knight`);
    expect(model.origin).toBe(`${build.race} · ${build.subrace} · Lv ${build.characterLevel}`);
    expect(model.gear).toHaveLength(6);
    expect(model.gear[0]).toMatchObject({ label: 'Main Hand', name: 'Dynaxis' });
    expect(model.gear.slice(1).every(slot => slot.name === 'Empty')).toBe(true);
    expect(model.counts).toBe('Skills 12/70 · Traits 3/24 · Talents 10/65');
  });

  it('marks a monoclass and falls back to a placeholder name', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'monoclass', enabled: true });
    expect(build.subClass).toBe(build.mainClass);
    const model = buildCardModel(build, evaluateBuild(build), '   ', counts);
    expect(model.name).toBe('Untitled Build');
    expect(model.classes).toBe(`${build.mainClass} (Monoclass)`);
  });

  it('reads the bare fists in full with the main hand empty', () => {
    const build = createDefaultBuild();
    const evaluation = evaluateBuild(build);
    const model = buildCardModel(build, evaluation, 'Unarmed', counts);
    expect(model.derived.find(row => row.label === 'Hit')?.value).toBe(`${evaluation.primaryWeapon!.hit}%`);
  });
});
