import { describe, expect, it } from 'vitest';
import { NO_HIT, guardedEvade, incomingDamage } from './damage';

const zero = { Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 };
const defender = {
  derived: { physicalDefense: 27, magicalDefense: 40, armor: 45, magicArmor: 12 },
  elementalResistance: { ...zero, Fire: 20, Dark: -25 },
  physicalResistance: { Blunt: 0, Pierce: 0, Slash: 10 },
};

describe('incoming damage', () => {
  it('multiplies the percentage reductions, then subtracts Armor', () => {
    const result = incomingDamage({ ...NO_HIT, amount: 200, type: 'Slash' }, defender);
    // 200 × 0.73 × 0.90 − 45 = 86.4
    expect(result.taken).toBe(86);
    expect(result.steps.map(step => step.label)).toEqual(['Incoming', 'Physical Defense', 'Slash resistance', 'Armor']);
  });

  it('uses Magical Defense and Magic Armor for magical hits', () => {
    // 200 × 0.60 × 0.80 (Fire) − 12 = 84
    expect(incomingDamage({ ...NO_HIT, amount: 200, damageClass: 'magical', type: 'Fire' }, defender).taken).toBe(84);
  });

  it('treats a negative resistance as a weakness', () => {
    // 200 × 0.60 × 1.25 − 12 = 138
    expect(incomingDamage({ ...NO_HIT, amount: 200, damageClass: 'magical', type: 'Dark' }, defender).taken).toBe(138);
  });

  it('applies the critical multiplier before any reduction', () => {
    // 200 × 1.5 × 0.73 − 45 = 174
    expect(incomingDamage({ ...NO_HIT, amount: 200, critical: true }, defender).taken).toBe(174);
  });

  it('adds 10% reduction per Momentum spent on Guard', () => {
    // 200 × 0.73 × 0.70 − 45 = 57.2
    expect(incomingDamage({ ...NO_HIT, amount: 200, guardMomentum: 3 }, defender).taken).toBe(57);
    expect(guardedEvade(40, 3)).toBe(28);
    // Confirmed in game: the Evade cost is a share of current Evade, so 6 Momentum is −60%.
    expect(guardedEvade(50, 6)).toBe(20);
  });

  it('skips Armor for armor-ignoring hits and everything for protection-ignoring ones', () => {
    expect(incomingDamage({ ...NO_HIT, amount: 200, armorIgnoring: true }, defender).taken).toBe(146);
    expect(incomingDamage({ ...NO_HIT, amount: 200, damageClass: 'protection-ignoring', type: 'Fire', guardMomentum: 3 }, defender).taken).toBe(200);
  });

  it('spends Armor as one pool across the hits of a multi-hit attack', () => {
    const bare = { ...defender, derived: { ...defender.derived, physicalDefense: 0, armor: 20 } };
    // The developer's example: 20 Armor against 30 damage over two hits takes 0, then 10.
    const result = incomingDamage({ ...NO_HIT, amount: 15, hits: 2 }, bare);
    expect(result.instances).toEqual([{ absorbed: 15, taken: 0 }, { absorbed: 5, taken: 10 }]);
    expect(result.taken).toBe(10);
    // Once the pool is spent, later hits land in full.
    expect(incomingDamage({ ...NO_HIT, amount: 15, hits: 3 }, bare).instances.map(hit => hit.taken)).toEqual([0, 10, 15]);
    expect(incomingDamage({ ...NO_HIT, amount: 15, hits: 2, armorIgnoring: true }, bare).taken).toBe(30);
  });

  it('never goes below zero', () => {
    expect(incomingDamage({ ...NO_HIT, amount: 30 }, defender).taken).toBe(0);
    expect(incomingDamage({ ...NO_HIT, amount: 500, guardMomentum: 12 }, defender).taken).toBe(0);
  });
});
