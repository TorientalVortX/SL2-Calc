import { describe, expect, it } from 'vitest';
import type { BuildState } from '../../types';
import { buildReducer, createDefaultBuild } from '../../aether/state/build';
import { gatherInputs } from './inputs';
import { resolveStats } from './stats';
import { resolveVitals } from './vitals';
import { resolveOffense } from './offense';
import { resolveEvade } from './defense';

function soldierWith(weaponName: string, fullSwing: number): BuildState {
  let build = createDefaultBuild();
  build = buildReducer(build, { type: 'equip-weapon', which: 'primaryWeapon', weaponName });
  return buildReducer(build, { type: 'subtalent-rank', subtalentId: 'two-hand/full-swing', rank: fullSwing });
}

function stages(build: BuildState) {
  const inputs = gatherInputs(build);
  const stats = resolveStats(inputs);
  return { inputs, stats, vitals: resolveVitals(inputs, stats), offense: resolveOffense(inputs, stats), defense: resolveEvade(inputs, stats) };
}

describe('evaluation stages', () => {
  it('caps bonus Evade at +50 and reports the rest as wasted', () => {
    const { defense } = stages({ ...createDefaultBuild(), bonusEvade: 80 });
    expect(defense.evadeBonusSources).toBe(80);
    expect(defense.ownEvade.bonusEvade).toBe(50);
  });

  it('doubles Full Swing on a 20+ weight weapon and drops it with a shield in hand', () => {
    const swa = (build: BuildState) => stages(build).offense.primaryWeapon!.swa;
    expect(swa(soldierWith('Nelten', 3)) - swa(soldierWith('Nelten', 0))).toBe(12);
    expect(swa(soldierWith('Longsword', 3)) - swa(soldierWith('Longsword', 0))).toBe(6);

    const shielded = buildReducer(soldierWith('Nelten', 3), { type: 'equip-gear', slot: 'hands', itemName: 'Beastfoe Shield' });
    const shieldedBase = buildReducer(soldierWith('Nelten', 0), { type: 'equip-gear', slot: 'hands', itemName: 'Beastfoe Shield' });
    expect(swa(shielded)).toBe(swa(shieldedBase));
  });

  it('adds stat buffs after diminishing returns, at face value', () => {
    const base = createDefaultBuild();
    const plain = stages({ ...base, addedStats: { ...base.addedStats, str: 60 } }).stats.scaledStats.str;
    const buffed = stages({ ...base, addedStats: { ...base.addedStats, str: 60 }, statBuffs: { ...base.addedStats, str: 10 } }).stats.scaledStats.str;
    expect(buffed - plain).toBeCloseTo(10);
  });

  it('counts crystals once toward both Max HP and Max FP', () => {
    const without = stages(createDefaultBuild()).vitals;
    const with45 = stages({ ...createDefaultBuild(), crystalCount: 45 }).vitals;
    expect(with45.maxHP - without.maxHP).toBe(45);
    expect(with45.fp - without.fp).toBe(45);
    expect(with45.fpSources.find(source => source.label === 'Crystals')?.value).toBe(45);
  });
});
