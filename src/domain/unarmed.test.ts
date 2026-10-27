import { describe, expect, it } from 'vitest';
import type { BuildState } from '../types';
import { buildReducer, createDefaultBuild } from '../aether/state/build';
import { evaluateBuild } from './buildEvaluation';
import { attackBase } from './outgoing';
import { unarmedWeapon } from './unarmed';

function martialArtist(ranks: Record<string, number> = {}, traits: string[] = []): BuildState {
  const build = buildReducer(createDefaultBuild(), { type: 'class', slot: 'main', className: 'Martial Artist' });
  return { ...build, traits, skillRanks: { main: ranks, sub: {} } };
}

const holding = (build: BuildState) => buildReducer(build, { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Engraved Katana' });

const wearing = (build: BuildState, slot: 'hands' | 'legs', itemName: string): BuildState => ({
  ...build,
  equipment: { ...build.equipment, [slot]: { itemName, upgradePoints: {} } },
} as BuildState);

describe('unarmed weapon', () => {
  it('fights with Bare Fists when the main hand is empty', () => {
    const evaluation = evaluateBuild(martialArtist());
    const scaled = evaluation.scaledStats;
    expect(evaluation.primaryWeapon).toMatchObject({
      power: 10,
      criticalDamage: 110 + Math.floor(scaled.gui),
      weight: 0,
    });
    expect(evaluation.primaryWeapon!.swa).toBe(10 + Math.floor(scaled.str * 1.5));
    expect(evaluation.unarmedWeapon).toBeUndefined();
  });

  it('gives Empty Palm to the fists only', () => {
    const bare = evaluateBuild(martialArtist()).primaryWeapon!;
    const palm = evaluateBuild(martialArtist({ 'empty-palm': 5 })).primaryWeapon!;
    expect(palm.power - bare.power).toBe(15);
    expect(palm.critical - bare.critical).toBe(15);
    const katana = evaluateBuild(holding(martialArtist())).primaryWeapon!;
    expect(evaluateBuild(holding(martialArtist({ 'empty-palm': 5 }))).primaryWeapon!.power).toBe(katana.power);
  });

  it('adds unarmed Power to basic attacks only, and never to a held weapon', () => {
    const shoes = (build: BuildState) => wearing(build, 'legs', 'Kickboxing Shoes Plus');
    const fists = evaluateBuild(shoes(martialArtist()));
    expect(fists.primaryWeapon!.basicAttackPower).toBe(5);
    expect(attackBase(null, 0, fists).amount).toBe(fists.primaryWeapon!.swa + 5);
    const katana = evaluateBuild(holding(martialArtist())).primaryWeapon!;
    expect(evaluateBuild(shoes(holding(martialArtist()))).primaryWeapon).toMatchObject({ power: katana.power, swa: katana.swa });
  });

  it('turns the fists Magical with Arcane Tattoo (Fist), leaving a held weapon alone', () => {
    const plain = evaluateBuild(martialArtist()).primaryWeapon!;
    const inked = evaluateBuild(martialArtist({}, ['arcane-tattoo-fist']));
    const { str, wil } = inked.scaledStats;
    expect(inked.primaryWeapon!.swa).toBe(10 + Math.floor((str * 70 + wil * 40) * 1.5 / 100));
    expect(inked.primaryWeapon!.swa).not.toBe(plain.swa);
    const katana = evaluateBuild(holding(martialArtist())).primaryWeapon!;
    expect(evaluateBuild(holding(martialArtist({}, ['arcane-tattoo-fist']))).primaryWeapon!.swa).toBe(katana.swa);
  });

  it('keeps the fists beside a weapon through Mixed Martial Arts, unless a sub-weapon or shield is held', () => {
    const ready = holding(martialArtist({ 'mixed-martial-arts': 1, 'empty-palm': 5 }));
    const evaluation = evaluateBuild(ready);
    expect(evaluation.unarmedWeapon).toMatchObject({ power: 25, weight: 0 });
    expect(attackBase(null, 0, evaluation, {}, 'unarmed').amount).toBe(evaluation.unarmedWeapon!.swa);
    expect(evaluateBuild(holding(martialArtist())).unarmedWeapon).toBeUndefined();
    expect(evaluateBuild(wearing(ready, 'hands', 'Metal Buckler')).unarmedWeapon).toBeUndefined();
    const dualWield = buildReducer(ready, { type: 'equip-weapon', which: 'offHandWeapon', weaponName: 'Engraved Katana' });
    expect(evaluateBuild(dualWield).unarmedWeapon).toBeUndefined();
  });

  it('becomes a Sword or Gun as well with the Karakuri weapon traits', () => {
    expect(unarmedWeapon(['hidden-blade'])).toMatchObject({ name: 'Hidden Blade', types: ['Fist', 'Sword', 'Unarmed'] });
    expect(unarmedWeapon(['hidden-barrage']).types).toContain('Gun');
    expect(unarmedWeapon().name).toBe('Bare Fists');
  });
});
