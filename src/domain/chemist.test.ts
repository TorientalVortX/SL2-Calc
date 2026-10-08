import { describe, expect, it } from 'vitest';
import { buildReducer, createDefaultBuild } from '../aether/state/build';
import { createBuildFile, parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { MIXTURES, complexMutationChance, mixtureDamageBreakdown, mixtureEffectBonus, mixtureEffectKey, mixtureFlaskCapacity, normalizeMixturePlan } from './chemist';

describe('Chemist mixture planning', () => {
  it('uses Chemist level and the scaled stat for each mixture type', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Chemist' });
    const evaluation = evaluateBuild(build);
    const recipe = (name: string) => MIXTURES.find(mixture => mixture.name === name)!;
    const warming = mixtureDamageBreakdown(recipe('Warming Brew'), build, evaluation)!;
    expect(warming).toMatchObject({ classLevel: 35, stat: 'gui', baseDamage: 30, element: 'Water', elementRatio: 50 });
    expect(warming.total).toBe(35 + evaluation.scaledStats.gui + 30 + evaluation.elementalAttack.Water * 0.5);
    expect(mixtureDamageBreakdown(recipe('Rust Bringer'), build, evaluation)?.total).toBe(warming.total);
    expect(mixtureDamageBreakdown(recipe('Hot Gravy'), build, evaluation)?.stat).toBe('def');
    expect(mixtureDamageBreakdown(recipe('Mellified Confection'), build, evaluation)?.stat).toBe('fai');
    expect(mixtureDamageBreakdown(recipe('Crimson Brew'), build, evaluation)?.stat).toBe('apt');
    expect(mixtureDamageBreakdown(recipe('Warming Brew'), { ...build, destiny: true }, evaluation)?.total)
      .toBe(warming.total + 15);
    expect(mixtureDamageBreakdown(recipe('Gunflame Perfume'), build, evaluation)).toBeNull();
    expect(mixtureDamageBreakdown(recipe('Unholy Dye'), build, evaluation)?.element).toBe('Dark');
  });

  it('keeps all fifteen Cocktail recipes distinct', () => {
    expect(MIXTURES).toHaveLength(60);
    const cocktails = MIXTURES.filter(mixture => mixture.type === 'Cocktail');
    expect(new Set(cocktails.map(mixture => mixture.chemicals.join(''))).size).toBe(15);
    expect(cocktails.find(mixture => mixture.name === 'Rust Bringer')?.chemicals).toEqual(['B', 'D']);
    expect(cocktails.find(mixture => mixture.name === 'Unholy Dye')?.chemicals).toEqual(['B', 'E']);
    expect(MIXTURES.find(mixture => mixture.name === 'Exploding Flask')).toMatchObject({
      baseDamage: 100,
      element: 'Fire',
      elementRatio: 50,
      mistEfficacy: null,
    });
    const ape = MIXTURES.find(mixture => mixture.name === 'Evolution Drought (Ape)');
    expect(ape?.effects.find(effect => effect.name === 'Evolution Drought (Ape)')?.description)
      .toContain('+30 Mutagen Potency');
    expect(ape?.effects.find(effect => effect.name === 'Lingering Damage (Earth)')?.description)
      .toContain('every round equal to LV');
    expect(ape?.effects.find(effect => effect.name === '(Primate Swing)')?.description)
      .toContain('100% Scaled Weapon Attack');
    expect(MIXTURES.find(mixture => mixture.name === 'Aureating Unction')?.effects
      .find(effect => effect.name === 'Glittering Aureate')?.description)
      .toContain('Decreases the Hit of attackers by LV');
    expect(MIXTURES.reduce((count, mixture) => count + mixture.effects.length, 0)).toBeGreaterThan(150);
    expect(MIXTURES.flatMap(mixture => mixture.effects).every(effect => effect.name && effect.description)).toBe(true);
  });

  it('uses Create Mixture rank for capacity and saves repeated planned recipes', () => {
    let build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Chemist' });
    expect(mixtureFlaskCapacity(build)).toBe(0);
    build = buildReducer(build, { type: 'skill-rank', slot: 'main', skillId: 'create-mixture', rank: 2 });
    expect(mixtureFlaskCapacity(build)).toBe(4);
    build = buildReducer(build, { type: 'mixture-plan-add', name: 'Exploding Flask' });
    build = buildReducer(build, { type: 'mixture-plan-add', name: 'Exploding Flask' });
    for (let index = 0; index < 5; index++) {
      build = buildReducer(build, { type: 'mixture-plan-add', name: 'Unholy Dye' });
    }
    const saved = parseBuildFile(JSON.stringify(createBuildFile('Chemist', build)));
    expect(saved.build.mixturePlan).toEqual([
      'Exploding Flask', 'Exploding Flask', 'Unholy Dye', 'Unholy Dye', 'Unholy Dye',
    ]);
    build = buildReducer(build, { type: 'mixture-plan-remove', index: 1 });
    expect(build.mixturePlan).toEqual(['Exploding Flask', 'Unholy Dye', 'Unholy Dye', 'Unholy Dye']);
    expect(normalizeMixturePlan(['Exploding Flask', 'not a mixture'])).toEqual(['Exploding Flask']);
  });

  it('keeps self-applied effects with planned mixtures across save and removal', () => {
    const name = 'Evolution Drought (Ape)';
    const key = mixtureEffectKey(name, name);
    let build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Chemist' });
    build = buildReducer(build, { type: 'mixture-effect-toggle', name, effect: name });
    expect(build.activeMixtureEffects).toEqual([]);
    build = buildReducer(build, { type: 'mixture-plan-add', name });
    build = buildReducer(build, { type: 'mixture-plan-add', name });
    const before = evaluateBuild(build);
    build = buildReducer(build, { type: 'mixture-effect-toggle', name, effect: name });
    const after = evaluateBuild(build);
    expect(after.scaledStats.str - before.scaledStats.str).toBe(3);
    expect(mixtureEffectBonus(name, name)?.baseStats).toEqual({ str: 3, vit: 3, gui: -3 });
    expect(mixtureEffectBonus(name, name)?.stats).toBeUndefined();
    expect(after.scaledStats.vit - before.scaledStats.vit).toBe(3);
    expect(after.scaledStats.gui - before.scaledStats.gui).toBe(-3);
    expect(after.physicalResistance.Slash - before.physicalResistance.Slash).toBe(10);
    expect(after.elementalResistance.Fire - before.elementalResistance.Fire).toBe(-15);
    expect(after.derived.maxHP).toBeGreaterThan(before.derived.maxHP);
    expect(after.derived.mutagenPotency).toBe(30);
    const highStrength = { ...build, addedStats: { ...build.addedStats, str: 60 } };
    const highStrengthWithApe = evaluateBuild(highStrength);
    const highStrengthWithoutApe = evaluateBuild({ ...highStrength, activeMixtureEffects: [] });
    expect(highStrengthWithApe.rawStats.str - highStrengthWithoutApe.rawStats.str).toBe(3);
    expect(highStrengthWithApe.scaledStats.str - highStrengthWithoutApe.scaledStats.str).toBe(3);
    expect(highStrengthWithApe.maxInvestedStats.str).toBe(highStrengthWithoutApe.maxInvestedStats.str);
    expect(parseBuildFile(JSON.stringify(createBuildFile('Chemist', build))).build.activeMixtureEffects).toEqual([key]);
    build = buildReducer(build, { type: 'mixture-plan-remove', index: 0 });
    expect(build.activeMixtureEffects).toEqual([key]);
    build = buildReducer(build, { type: 'mixture-plan-remove', index: 0 });
    expect(build.activeMixtureEffects).toEqual([]);
  });

  it('applies ally mixture bonuses to the sheet', () => {
    let build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Chemist' });
    const base = evaluateBuild(build);
    build = buildReducer(build, { type: 'mixture-plan-add', name: 'Instant Freeze' });
    build = buildReducer(build, { type: 'mixture-plan-add', name: 'Amrita' });
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Instant Freeze', effect: 'Ice Armor' });
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Amrita', effect: 'Amrita' });
    const applied = evaluateBuild(build);
    expect(applied.scaledStats.def - base.scaledStats.def).toBe(10);
    expect(applied.elementalResistance.Ice - base.elementalResistance.Ice).toBe(25);
    expect(applied.elementalResistance.Fire - base.elementalResistance.Fire).toBe(-25);
    expect(applied.derived.maxHP - base.derived.maxHP).toBe(50);
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Instant Freeze', effect: 'Frozen' });
    expect(build.activeMixtureEffects).toHaveLength(2);
  });

  it('uses the selected Radical Gene stage and applies status resistance changes', () => {
    let build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Chemist' });
    build = buildReducer(build, { type: 'mixture-plan-add', name: 'Radical Gene' });
    build = buildReducer(build, { type: 'mixture-plan-add', name: 'Metabolic Stabilizer' });
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Radical Gene', effect: 'Silk Spinner' });
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Radical Gene', effect: 'Radical Cocoon' });
    expect(build.activeMixtureEffects).toEqual([mixtureEffectKey('Radical Gene', 'Radical Cocoon')]);
    const cocoon = evaluateBuild(build);
    expect(cocoon.derived.mutagenPotency).toBe(20);
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Metabolic Stabilizer', effect: 'Status Resistance Lowered' });
    expect(evaluateBuild(build).derived.statusResistance).toBe(Math.floor(cocoon.derived.statusResistance * 0.75));
  });

  it('adds cumulative Mutagen Potency and shows the Shapeshifter mutation risk', () => {
    let build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Shapeshifter' });
    build = buildReducer(build, { type: 'class', slot: 'sub', className: 'Chemist' });
    for (const name of ['Evolution Drought (Ape)', 'Tendril Tonic', 'Metabolic Stabilizer']) {
      build = buildReducer(build, { type: 'mixture-plan-add', name });
    }
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Evolution Drought (Ape)', effect: 'Evolution Drought (Ape)' });
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Tendril Tonic', effect: 'Tendril Tonic' });
    const two = evaluateBuild(build);
    expect(two.derived.mutagenPotency).toBe(55); // 30 + 15 + 10 for the second effect
    expect(two.derived.complexMutationChance).toBe(complexMutationChance(55, two.derived.statusResistance, true, false));
    build = buildReducer(build, { type: 'mixture-effect-toggle', name: 'Metabolic Stabilizer', effect: 'Status Resistance Lowered' });
    const three = evaluateBuild(build);
    expect(three.derived.mutagenPotency).toBe(65); // third effect has no intrinsic Potency
    expect(three.derived.complexMutationChance).toBe(complexMutationChance(65, three.derived.statusResistance, true, false));
    expect(complexMutationChance(40, 30, false, false)).toBe(50);
    expect(complexMutationChance(40, 30, true, false)).toBe(35);
    expect(complexMutationChance(40, 30, true, true)).toBe(20);
  });
});
