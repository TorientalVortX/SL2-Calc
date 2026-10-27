import { describe, expect, it } from 'vitest';
import type { BuildState } from '../types';
import { createDefaultBuild } from '../aether/state/build';
import { parryChanceBonuses, parryOptions } from './parry';

const stats = { str: 0, wil: 0, ski: 40, cel: 20, def: 30, res: 0, vit: 0, fai: 0, luc: 0, gui: 24, san: 0, apt: 0 };

function withRanks(main: Record<string, number>): BuildState {
  return { ...createDefaultBuild(), skillRanks: { main, sub: {} } };
}

describe('parry skills', () => {
  it('lists only the parry skills the build has ranked', () => {
    expect(parryOptions(withRanks({}), { scaledStats: stats })).toEqual([]);
    expect(parryOptions(withRanks({ stalemate: 3, 'bullet-barrier': 1 }), { scaledStats: stats }).map(option => option.id))
      .toEqual(['stalemate', 'bullet-barrier']);
  });

  it('computes each chance from the wiki formula', () => {
    const options = parryOptions(withRanks({ stalemate: 3, 'false-target': 1, 'ring-of-pearls': 2, eviter: 2 }), { scaledStats: stats });
    const chance = (id: string) => options.find(option => option.id === id)?.chance;
    expect(chance('stalemate')).toBe(15 + 15);
    expect(chance('false-target')).toBe(25 + 15);
    expect(chance('ring-of-pearls')).toBe(30 + 20);
    expect(chance('eviter')).toBeNull();
  });

  it('offers the shields of an equipped Magical Gauntlet', () => {
    const build = { ...withRanks({}), equipment: { ...withRanks({}).equipment, hands: { itemName: 'Metallic Magic Gauntlet', upgradePoints: {} } } };
    const options = parryOptions(build as BuildState, { scaledStats: { ...stats, res: 16 } });
    expect(options.map(option => [option.id, option.chance, option.reductionPercent])).toEqual([
      ['magic-shield', 25 + 30 / 4 + 16 / 4, 25],
      ['metallic-aegis', 25 + 15, 35],
      ['magical-aegis', 25 + 8, 35],
    ]);
    expect(options.find(option => option.id === 'metallic-aegis')?.classes).toEqual(['physical']);
  });

  it('reports Yomidori and Mighty Wall bonuses at their ranks', () => {
    expect(parryChanceBonuses(withRanks({ yomidori: 2, 'mighty-wall': 3 }))).toEqual([
      { name: 'Yomidori (attacker already hit you this turn)', percent: 7 },
      { name: 'Mighty Wall (active)', percent: 5 },
    ]);
  });
});
