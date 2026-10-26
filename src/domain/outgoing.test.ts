import { describe, expect, it } from 'vitest';
import { NO_HIT } from './damage';
import { OPEN_TARGET, attackBase, defaultDamage, expectedOutgoing, outgoingDamage, powerMultiplier } from './outgoing';
import { skillById } from './skills';

const attacker = {
  scaledStats: { str: 40, wil: 20, ski: 30, cel: 10, def: 10, res: 10, vit: 10, fai: 0, luc: 10, gui: 28, san: 0, apt: 0 },
  elementalAttack: { Fire: 50, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 40, Sound: 0 },
  primaryWeapon: { power: 16, swa: 120, hit: 200, critical: 90, criticalDamage: 128, weight: 3 },
};
const target = { ...OPEN_TARGET, physicalDefense: 20, magicalDefense: 30, armor: 10, magicArmor: 5, resistance: 25 };
const slash = { ...NO_HIT, damageClass: 'physical' as const, type: 'Slash' as const, critDamagePercent: 128 };
const none = { amount: 0, ignores: 'none' as const };

describe('outgoing damage', () => {
  it('uses Scaled Weapon Attack for a basic attack', () => {
    expect(attackBase(null, 0, attacker).amount).toBe(120);
  });

  it('adds a spell’s SWA and Elemental ATK terms', () => {
    const acidRain = skillById('acid-rain')!;
    // Rank 1: 90% Acid ATK + 100% SWA.
    expect(attackBase(acidRain, 1, attacker).amount).toBeCloseTo(0.9 * 40 + 120);
    expect(defaultDamage(acidRain, {}, 'Slash')).toEqual({ damageClass: 'magical', type: 'Acid' });
    expect(defaultDamage(null, {}, 'Slash')).toEqual({ damageClass: 'physical', type: 'Slash' });
  });

  it('multiplies damage percentages together', () => {
    expect(powerMultiplier([15, 10])).toBeCloseTo(1.15 * 1.1);
    expect(powerMultiplier([])).toBe(1);
  });

  it('runs the hit through the target’s defenses', () => {
    // 120 × 1.15 = 138; × 0.80 (DEF 20%) × 0.75 (Slash 25%) − 10 = 72.8.
    const result = outgoingDamage(slash, 120, [15], none, target);
    expect(result.perHit).toBeCloseTo(138);
    expect(result.dealt).toBe(Math.floor(138 * 0.8 * 0.75 - 10));
  });

  it('crits the attack but not its flat bonus damage', () => {
    const open = { ...OPEN_TARGET };
    const crit = { ...slash, outcomes: [{ result: 'hit' as const, parried: false, critical: true }] };
    const result = outgoingDamage(crit, 100, [], { amount: 30, ignores: 'none' }, open);
    expect(result.main.taken).toBe(128);
    expect(result.bonus?.taken).toBe(30);
    expect(result.dealt).toBe(158);
  });

  it('lets bonus damage skip Armor, or every defense, as its text says', () => {
    const armorIgnoring = outgoingDamage(slash, 0, [], { amount: 30, ignores: 'armor' }, target);
    expect(armorIgnoring.bonus?.taken).toBe(Math.floor(30 * 0.8 * 0.75));
    expect(outgoingDamage(slash, 0, [], { amount: 30, ignores: 'protection' }, target).bonus?.taken).toBe(30);
  });

  it('takes crit chance from Critical against the target’s Critical Evade', () => {
    const odds = { hit: 200, critical: 90, greatAccuracy: false, ignoresEvasion: true };
    const expected = expectedOutgoing(slash, 100, [], none, { ...OPEN_TARGET, criticalEvade: 40 }, odds);
    expect(expected.critChance).toBe(50);
    // Always hits: half the time 100, half the time 128.
    expect(expected.expected).toBeCloseTo(114);
  });
});
