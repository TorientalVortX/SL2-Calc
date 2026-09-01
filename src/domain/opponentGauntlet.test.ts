import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { evaluateDamageProfile } from '../utilities/BuildOptimizerV2';
import { ENABLED_OPTIMIZER_REFERENCE_PROFILES } from '../data/optimizerProfiles';
import { OPPONENT_STATLINES, evaluateGauntlet, opponentsForIds } from './opponentGauntlet';
import { SWA_SCALING_MULTIPLIER } from './weaponCalculation';

function evaluatedBuild(level = 60) {
  const { build } = parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Gauntlet fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Soldier', characterLevel: level, food: 'None', history: 'None', hpPercent: 100,
  }));
  return evaluateBuild(build);
}

describe('opponent statlines', () => {
  it('covers every enabled reference profile', () => {
    expect(OPPONENT_STATLINES.map(opponent => opponent.profileId).sort())
      .toEqual(ENABLED_OPTIMIZER_REFERENCE_PROFILES.map(profile => profile.id).sort());
  });

  it('derives the Salamandra Bonder/Monk statline with the calculator formulas', () => {
    const opponent = OPPONENT_STATLINES.find(item => item.profileId === 'sal-am-bonder-monk');
    expect(opponent).toBeTruthy();
    // Targets: cel 14, def 50, res 50, fai 9, luc 9, ski 54, wil 17, san 6, vit 40.
    expect(opponent?.evadeFloor).toBe(28);
    expect(opponent?.evadeCeiling).toBe(78);
    expect(opponent?.physicalDefense).toBe(45);
    expect(opponent?.magicalDefense).toBe(45);
    expect(opponent?.criticalEvade).toBe(18);
    expect(opponent?.statusInfliction).toBe(125);
    expect(opponent?.statusResistance).toBe(21);
    expect(opponent?.hpFloor).toBe(400 + 12 + 240);
    // Tricky Yoyo is canonical (80 Accuracy, 2 Power, Finesse 70 STR / 30 SKI),
    // so Hit folds in its Accuracy and the SWA proxy its Power. The listed
    // percentages carry the SWA multiplier, so Finesse behaves as 105% / 45%.
    expect(opponent?.hit).toBe(2 * 54 + 80);
    expect(opponent?.swaProxy).toBe(2 + Math.floor(61 * 0.7 * SWA_SCALING_MULTIPLIER + 54 * 0.3 * SWA_SCALING_MULTIPLIER));
    expect(opponent?.caveats.some(caveat => caveat.includes('Tricky Yoyo'))).toBe(false);
  });

  it('surfaces subrace status immunities from the catalog', () => {
    // Salamandra cannot be Burned: the one immunity in the current roster.
    const salamandra = OPPONENT_STATLINES.find(item => item.profileId === 'sal-am-bonder-monk');
    expect(salamandra?.statusImmunities).toContain('Burn');
    expect(salamandra?.caveats.some(caveat => caveat.includes('Burn'))).toBe(true);
    const noImmunities = OPPONENT_STATLINES.find(item => item.profileId === 'amalgama-ghost-black-knight');
    expect(noImmunities?.statusImmunities).toEqual([]);
  });

  it('includes weapon Accuracy in Hit only when the weapon record is canonical', () => {
    const withWeapon = OPPONENT_STATLINES.find(item => item.profileId === 'amalgama-ghost-black-knight');
    // Dynaxis exists canonically, so Hit = floor(2 × 75 SKI) + its Accuracy.
    expect(withWeapon?.hit).toBeGreaterThanOrEqual(150);
  });
});

describe('opponentsForIds', () => {
  it('filters to known ids and never selects an empty roster', () => {
    expect(opponentsForIds()).toEqual(OPPONENT_STATLINES);
    expect(opponentsForIds([])).toEqual(OPPONENT_STATLINES);
    const one = opponentsForIds(['amalgama-ghost-black-knight']);
    expect(one.map(opponent => opponent.profileId)).toEqual(['amalgama-ghost-black-knight']);
    // Unknown ids are dropped; a filter matching nothing falls back to everyone.
    expect(opponentsForIds(['amalgama-ghost-black-knight', 'not-a-profile']).map(opponent => opponent.profileId))
      .toEqual(['amalgama-ghost-black-knight']);
    expect(opponentsForIds(['not-a-profile'])).toEqual(OPPONENT_STATLINES);
  });
});

describe('evaluateGauntlet', () => {
  it('produces bounded per-opponent margins and a mean aggregate', () => {
    const evaluation = evaluatedBuild();
    const report = evaluateGauntlet(evaluation);
    expect(report.opponents).toHaveLength(OPPONENT_STATLINES.length);
    for (const row of report.opponents) {
      expect(row.hitChanceVsReliable).toBeGreaterThanOrEqual(0);
      expect(row.hitChanceVsReliable).toBeLessThanOrEqual(100);
      expect(row.hitChanceVsCeiling).toBeLessThanOrEqual(row.hitChanceVsReliable);
      expect(row.statusAvoidChance).toBeGreaterThanOrEqual(0);
      expect(row.statusAvoidChance).toBeLessThanOrEqual(100);
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(1);
      expect(row.damagePerHit).toBeGreaterThanOrEqual(0);
    }
    const mean = report.opponents.reduce((sum, row) => sum + row.score, 0) / report.opponents.length;
    expect(report.aggregateScore).toBeCloseTo(mean, 10);
    const weakest = report.opponents.reduce((worst, row) => (row.score < worst.score ? row : worst));
    expect(report.weakestOpponentId).toBe(weakest.opponentId);
    expect(report.caveat).toContain('not win-rate predictions');
  });

  it('reports incoming pressure only for opponents whose weapon is canonical', () => {
    const report = evaluateGauntlet(evaluatedBuild());
    // Hissei is the one profile weapon the wiki has no row for, so it is what
    // still exercises the unknown-weapon path.
    const unknownWeapon = report.opponents.find(row => row.opponentId === 'karakuri-dragon-kensei-bonder');
    expect(unknownWeapon?.incomingHitChance).toBeUndefined();
    expect(unknownWeapon?.hitsSurvived).toBeUndefined();
    const knownWeapon = report.opponents.find(row => row.opponentId === 'amalgama-ghost-black-knight');
    expect(knownWeapon?.incomingHitChance).toBeGreaterThanOrEqual(0);
    expect(knownWeapon?.hitsSurvived).toBeGreaterThan(0);
  });

  it('reduces a damage contract by the opponent mitigation', () => {
    const evaluation = evaluatedBuild();
    const damageReport = evaluateDamageProfile(evaluation, {
      skills: [{ label: 'Basic swing', swaPercent: 100, element: null, elementalAttackPercent: 0, weight: 1 }],
    });
    const report = evaluateGauntlet(evaluation, damageReport);
    const tanky = report.opponents.find(row => row.opponentId === 'sal-am-bonder-monk');
    // 45% physical defense: the per-hit number must be the modeled total after
    // mitigation, never the raw contract value.
    expect(tanky?.damagePerHit).toBeCloseTo((damageReport?.weightedScore ?? 0) * 0.55, 6);
  });
});
