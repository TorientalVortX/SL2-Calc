import { describe, expect, it } from 'vitest';
import { NO_HIT } from './damage';
import { OPEN_TARGET, attackBase, critDamageFor, defaultDamage, expectedOutgoing, outgoingDamage, powerMultiplier, riderFor, targetAfterSets } from './outgoing';
import { skillById } from './skills';

const attacker = {
  scaledStats: { str: 40, wil: 20, ski: 30, cel: 10, def: 10, res: 10, vit: 10, fai: 0, luc: 10, gui: 28, san: 0, apt: 0 },
  elementalAttack: { Fire: 50, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 40, Sound: 0 },
  primaryWeapon: { power: 16, swa: 120, hit: 200, critical: 90, criticalDamage: 128, weight: 3 },
};
const target = { ...OPEN_TARGET, physicalDefense: 20, magicalDefense: 30, armor: 10, magicArmor: 5, resistance: 25 };
const slash = { ...NO_HIT, damageClass: 'physical' as const, type: 'Slash' as const, critDamagePercent: 128 };
const none = { amount: 0, ignores: 'none' as const };
const plain = (amount: number) => ({ amount, bonus: 0 });

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

  it('crits basic attacks at weapon crit damage plus GUI, and skills at a flat 125%', () => {
    expect(critDamageFor(null, attacker)).toBe(128);
    expect(critDamageFor(skillById('chaos-onslaught')!, attacker)).toBe(125);
  });

  it('treats a skill that performs a basic attack as one, crit included', () => {
    const cutthroat = skillById('cutthroat')!;
    expect(attackBase(cutthroat, 1, attacker)).toMatchObject({ amount: 120, bonus: 0, hit: -20 });
    expect(critDamageFor(cutthroat, attacker)).toBe(128);
    expect(skillById('shinken')?.basicAttack).toBeUndefined();
  });

  it('reads each basic-attack skill’s bonus damage, Hit, Critical and damage share', () => {
    expect(attackBase(skillById('geldoren')!, 3, attacker).bonus).toBe(6);
    expect(attackBase(skillById('wazabane')!, 2, attacker)).toMatchObject({ hit: 7, critical: 7 });
    expect(attackBase(skillById('quick-and-wild')!, 1, attacker).amount).toBe(24);
    const wounded = { ...attacker, derived: { maxHP: 300, currentHP: 100 } };
    expect(attackBase(skillById('ether-invitation')!, 1, wounded).bonus).toBe(40);
    expect(defaultDamage(skillById('l-au-dela')!, {}, 'Slash')).toEqual({ damageClass: 'physical', type: 'Dark' });
    expect(defaultDamage(skillById('ki-blast')!, {}, 'Blunt')).toEqual({ damageClass: 'magical', type: 'Blunt' });
  });

  it('adds skill bonus damage after modifiers and before the crit', () => {
    const crit = { ...slash, outcomes: [{ result: 'hit' as const, parried: false, critical: true }] };
    // (100 × 1.1 + 10) × 1.28 = 153.6
    expect(outgoingDamage(crit, { amount: 100, bonus: 10 }, [10], none, { ...OPEN_TARGET }).dealt).toBe(153);
  });

  it('gives a rider its own class, type and resistance', () => {
    const rider = riderFor(skillById('snake-shot')!, 2)!;
    expect(rider).toEqual({ amount: 10, ignores: 'armor', damageClass: 'magical', type: 'Acid' });
    const result = outgoingDamage(slash, plain(0), [], rider, { ...target, bonusResistance: 50 });
    // 10 × 0.70 (Magical Defense 30%) × 0.50 (Acid 50%), Magic Armor skipped.
    expect(result.bonus?.taken).toBe(Math.floor(10 * 0.7 * 0.5));
  });

  it('lets set effects ignore part of a resistance but never a weakness', () => {
    const gunsmoke = [{ label: 'Gunsmoke Spiritual 3+', resistanceIgnored: { types: ['Dark', 'Light'], percent: 10 } }];
    expect(targetAfterSets({ ...target, resistance: 25 }, gunsmoke, 'Dark', null).resistance).toBe(15);
    expect(targetAfterSets({ ...target, resistance: 5 }, gunsmoke, 'Light', null).resistance).toBe(0);
    expect(targetAfterSets({ ...target, resistance: -20 }, gunsmoke, 'Dark', null).resistance).toBe(-20);
    expect(targetAfterSets({ ...target, resistance: 25 }, gunsmoke, 'Fire', null).resistance).toBe(25);
  });

  it('attacks with the chosen hand’s weapon', () => {
    const dual = { ...attacker, offHandWeapon: { power: 10, swa: 70, hit: 180, critical: 60, criticalDamage: 140, weight: 4 } };
    expect(attackBase(null, 0, dual, {}, 'off').amount).toBe(70);
    expect(attackBase(null, 0, dual, {}, 'main').amount).toBe(120);
    expect(critDamageFor(null, dual, 'off')).toBe(140);
    expect(critDamageFor(skillById('cutthroat')!, dual, 'off')).toBe(140);
    expect(attackBase(null, 0, attacker, {}, 'off').complete).toBe(false);
  });

  it('adds both weapons’ Power for Straight Cannon', () => {
    const cannon = skillById('straight-cannon')!;
    const dual = { ...attacker, offHandWeapon: { power: 10, swa: 70, hit: 180, critical: 60, criticalDamage: 140, weight: 4 } };
    expect(attackBase(cannon, 1, dual)).toMatchObject({ amount: 16 + 10, complete: true });
    expect(attackBase(cannon, 1, attacker).complete).toBe(false);
  });

  it('multiplies damage percentages together', () => {
    expect(powerMultiplier([15, 10])).toBeCloseTo(1.15 * 1.1);
    expect(powerMultiplier([])).toBe(1);
  });

  it('runs the hit through the target’s defenses', () => {
    // 120 × 1.15 = 138; × 0.80 (DEF 20%) × 0.75 (Slash 25%) − 10 = 72.8.
    const result = outgoingDamage(slash, plain(120), [15], none, target);
    expect(result.perHit).toBeCloseTo(138);
    expect(result.dealt).toBe(Math.floor(138 * 0.8 * 0.75 - 10));
  });

  it('crits the attack but not its flat bonus damage', () => {
    const open = { ...OPEN_TARGET };
    const crit = { ...slash, outcomes: [{ result: 'hit' as const, parried: false, critical: true }] };
    const result = outgoingDamage(crit, plain(100), [], { amount: 30, ignores: 'none' }, open);
    expect(result.main.taken).toBe(128);
    expect(result.bonus?.taken).toBe(30);
    expect(result.dealt).toBe(158);
  });

  it('lets bonus damage skip Armor, or every defense, as its text says', () => {
    const armorIgnoring = outgoingDamage(slash, plain(0), [], { amount: 30, ignores: 'armor' }, target);
    expect(armorIgnoring.bonus?.taken).toBe(Math.floor(30 * 0.8 * 0.75));
    expect(outgoingDamage(slash, plain(0), [], { amount: 30, ignores: 'protection' }, target).bonus?.taken).toBe(30);
  });

  it('takes crit chance from Critical against the target’s Critical Evade', () => {
    const odds = { hit: 200, critical: 90, greatAccuracy: false, ignoresEvasion: true };
    const expected = expectedOutgoing(slash, plain(100), [], none, { ...OPEN_TARGET, criticalEvade: 40 }, odds);
    expect(expected.critChance).toBe(50);
    // Always hits: half the time 100, half the time 128.
    expect(expected.expected).toBeCloseTo(114);
  });
});
