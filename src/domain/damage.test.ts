import { describe, expect, it } from 'vitest';
import { NO_HIT, expectedDamage, guardedEvade, incomingDamage, rollOdds, type HitOutcome } from './damage';

const zero = { Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 };
const defender = {
  derived: { physicalDefense: 27, magicalDefense: 40, armor: 45, magicArmor: 12 },
  elementalResistance: { ...zero, Fire: 20, Dark: -25 },
  physicalResistance: { Blunt: 0, Pierce: 0, Slash: 10 },
};

const outcomes = (...list: Array<[HitOutcome['result'], boolean?, boolean?]>): HitOutcome[] =>
  list.map(([result, parried = false, critical = false]) => ({ result, parried, critical }));

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

  it('applies the critical multiplier before Armor', () => {
    // 200 × 0.73 × 1.5 − 45 = 174
    const result = incomingDamage({ ...NO_HIT, amount: 200, outcomes: outcomes(['hit', false, true]) }, defender);
    expect(result.taken).toBe(174);
    expect(result.steps.map(step => step.label)).toEqual(['Incoming', 'Physical Defense', 'Critical', 'Armor']);
  });

  it('rolls crits per hit, so only the critical hits of an attack are multiplied', () => {
    const open = { ...defender, derived: { ...defender.derived, physicalDefense: 0, armor: 0 } };
    const result = incomingDamage({ ...NO_HIT, amount: 100, hits: 3, outcomes: outcomes(['hit'], ['hit', false, true], ['glance', false, true]) }, open);
    expect(result.instances.map(instance => instance.taken)).toEqual([100, 150, 60]);
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
    expect(result.instances.map(({ absorbed, taken }) => ({ absorbed, taken }))).toEqual([{ absorbed: 15, taken: 0 }, { absorbed: 5, taken: 10 }]);
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


describe('glancing blows and parries', () => {
  it('takes 60% less from a glancing blow', () => {
    // 200 × 0.73 × 0.40 − 45 = 13.4
    expect(incomingDamage({ ...NO_HIT, amount: 200, outcomes: outcomes(['glance']) }, defender).taken).toBe(13);
  });

  it('multiplies a parry with the other reductions, and with a glance', () => {
    // 200 × 0.73 × 0.50 − 45 = 28
    expect(incomingDamage({ ...NO_HIT, amount: 200, parryReductionPercent: 50, outcomes: outcomes(['hit', true]) }, defender).taken).toBe(28);
    // 400 × 0.73 × 0.40 × 0.50 − 45 = 13.4
    expect(incomingDamage({ ...NO_HIT, amount: 400, parryReductionPercent: 50, outcomes: outcomes(['glance', true]) }, defender).taken).toBe(13);
  });

  it('leaves the Armor pool untouched for an evaded hit', () => {
    // The second hit gets the whole pool: 200 × 0.73 − 45 = 101.
    const result = incomingDamage({ ...NO_HIT, amount: 200, hits: 2, outcomes: outcomes(['evaded'], ['hit']) }, defender);
    expect(result.instances.map(instance => instance.taken)).toEqual([0, 101]);
  });
});

describe('expected damage', () => {
  const open = { ...defender, derived: { physicalDefense: 0, magicalDefense: 0, armor: 0, magicArmor: 0 } };
  const odds = { attackerHit: 100, defenderEvade: 50, greatAccuracy: false, ignoresEvasion: false, parryChancePercent: 0, critChancePercent: 0 };

  it('splits each hit into hit, glance and evade from Hit against Evade', () => {
    // 50% to hit; a miss rerolls, so 25% glance and 25% evaded.
    expect(rollOdds(odds)).toEqual({ hit: 0.5, glance: 0.25, evaded: 0.25 });
    expect(rollOdds({ ...odds, greatAccuracy: true })).toEqual({ hit: 0.5, glance: 0.5, evaded: 0 });
    // 0.5 × 100 + 0.25 × 40 = 60
    expect(expectedDamage({ ...NO_HIT, amount: 100 }, open, odds).expected).toBeCloseTo(60);
  });

  it('matches the set-outcome damage when every hit is certain to land', () => {
    const hit = { ...NO_HIT, amount: 50, hits: 3 };
    const certain = { ...odds, ignoresEvasion: true };
    expect(expectedDamage(hit, defender, certain).expected).toBeCloseTo(incomingDamage(hit, defender).taken);
  });

  it('agrees with enumerating every outcome of a multi-hit attack', () => {
    const hit = { ...NO_HIT, amount: 60, hits: 3, parryReductionPercent: 50 };
    const chances = { ...odds, parryChancePercent: 40, critChancePercent: 25 };
    const rolls = rollOdds(chances);
    const choices: Array<[HitOutcome, number]> = [[{ result: 'evaded', parried: false, critical: false }, rolls.evaded]];
    for (const result of ['hit', 'glance'] as const) {
      for (const [parried, parryOdds] of [[false, 0.6], [true, 0.4]] as const) {
        for (const [critical, critOdds] of [[false, 0.75], [true, 0.25]] as const) {
          choices.push([{ result, parried, critical }, rolls[result] * parryOdds * critOdds]);
        }
      }
    }
    let brute = 0;
    for (const a of choices) for (const b of choices) for (const c of choices) {
      brute += a[1] * b[1] * c[1] * incomingDamage({ ...hit, outcomes: [a[0], b[0], c[0]] }, defender).taken;
    }
    expect(expectedDamage(hit, defender, chances).expected).toBeCloseTo(brute, 9);
  });
});
