import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { validateBuildAgainstGuide } from './buildGuide';
import { OPTIMIZATION_PRESETS } from '../utilities/StatOptimizer';

function buildAtLevel(level: number) {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Guide fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Soldier', characterLevel: level, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

describe('SL2BuildInfo validation', () => {
  it('enforces supported endgame targets and keeps unsupported checks explicit', () => {
    const build = buildAtLevel(60);
    const evaluation = evaluateBuild(build);
    evaluation.scaledStats.apt = 48.8;
    evaluation.scaledStats.ski = 57;
    evaluation.rawStats.vit = 35;
    evaluation.derived.evade = 195;

    const result = validateBuildAgainstGuide(build, evaluation, OPTIMIZATION_PRESETS.evade);
    expect(result.checks.find(check => check.id === 'aptitude')?.status).toBe('pass');
    expect(result.checks.find(check => check.id === 'accuracy')?.status).toBe('pass');
    expect(result.checks.find(check => check.id === 'vitality')).toMatchObject({ status: 'pass', basis: 'assumption' });
    expect(result.checks.find(check => check.id === 'defense')?.status).toBe('pass');
    expect(result.checks.find(check => check.id === 'casting')?.status).toBe('verify');
    expect(result.requiresVerification).toBeGreaterThan(0);
  });

  it('does not invent a lower-level target curve', () => {
    const build = buildAtLevel(20);
    const result = validateBuildAgainstGuide(build, evaluateBuild(build), OPTIMIZATION_PRESETS.hybrid);
    expect(result.checks.find(check => check.id === 'endgame-targets')?.summary).toMatch(/no documented leveling curve/i);
    expect(result.checks.some(check => check.id === 'aptitude')).toBe(false);
  });

  it('labels the tank scaled-stat interpretation as an assumption', () => {
    const build = buildAtLevel(60);
    const evaluation = evaluateBuild(build);
    evaluation.scaledStats.def = 45;
    evaluation.scaledStats.res = 45;
    const result = validateBuildAgainstGuide(build, evaluation, OPTIMIZATION_PRESETS.tank);
    expect(result.checks.find(check => check.id === 'defense')).toMatchObject({ status: 'pass', basis: 'assumption' });
    expect(result.checks.find(check => check.id === 'defense')?.summary).toMatch(/^ASSUMPTION:/);
  });
});
