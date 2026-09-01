import { describe, expect, it } from 'vitest';
import {
  armorEffects,
  armorUL,
  itemBonuses,
  itemConditionalKey,
  valueAtUL,
  weaponEffects,
  weaponUL,
} from './itemEffects';

describe('UL resolution', () => {
  it('sums every upgrade channel', () => {
    // "Upgrade points spent on that piece", so all channels count.
    expect(weaponUL({ power: 5, critical: 5, accuracy: 5, durability: 0 })).toBe(15);
    // Three channels on a torso: it has no durability track.
    expect(armorUL({ armor: 3, magicArmor: 2, evade: 1 })).toBe(6);
  });

  it('is zero for an unupgraded or missing piece', () => {
    expect(weaponUL(undefined)).toBe(0);
    expect(armorUL({ armor: 0, magicArmor: 0, evade: 0 })).toBe(0);
  });
});

describe('UL-scaled magnitudes', () => {
  it('resolves "UL/2" against the spend and floors it', () => {
    const half = { kind: 'derived' as const, key: 'hit', base: 0, ulMultiplier: 0.5 };
    expect(valueAtUL(half, 0)).toBe(0);
    expect(valueAtUL(half, 15)).toBe(7); // 7.5 floored
    expect(valueAtUL(half, 4)).toBe(2);
  });

  it('resolves a flat bonus independently of UL', () => {
    const flat = { kind: 'stat' as const, key: 'str', base: 3, ulMultiplier: 0 };
    expect(valueAtUL(flat, 0)).toBe(3);
    expect(valueAtUL(flat, 30)).toBe(3);
  });

  it('resolves a combined "1+UL" magnitude', () => {
    const combined = { kind: 'derived' as const, key: 'power', base: 1, ulMultiplier: 1 };
    expect(valueAtUL(combined, 6)).toBe(7);
  });
});

describe('item effect data', () => {
  it('parses a UL-scaled weapon passive', () => {
    // Blind Bright: "Increases Light ATK by UL/2. (Doesn't stack.)"
    const effects = weaponEffects('Blind Bright');
    const scaled = effects.flatMap(e => e.effects).find(e => e.key === 'Light');
    expect(scaled).toMatchObject({ kind: 'elementalAttack', base: 0, ulMultiplier: 0.5 });
  });

  it('keeps unmodellable effects as reference with no numbers', () => {
    const gorger = weaponEffects('Gorger');
    expect(gorger.length).toBeGreaterThan(0);
    const vampiric = gorger.find(e => /vampiric/i.test(e.description));
    expect(vampiric?.applies).toBe('reference');
    expect(vampiric?.effects).toEqual([]);
  });

  it('reads an armour effect that scales with UL', () => {
    // Armor of Eyes: "Increases Hit by UL/2, UL% chance to reduce critical damage."
    const effects = armorEffects('Armor of Eyes');
    const hit = effects.flatMap(e => e.effects).find(e => e.key === 'hit');
    expect(hit).toMatchObject({ base: 0, ulMultiplier: 0.5 });
    expect(effects.find(e => e.effects.includes(hit!))?.applies).toBe('always');
  });

  it('parses the other stat-facing armor UL formulas as conditionals', () => {
    const cases = [
      ['In-Fighter Gi', 'evade', 1],
      ['Green-Scale Tunic', 'evade', 1],
      ['Turtle Shell', 'criticalEvade', 1],
    ] as const;
    for (const [name, key, multiplier] of cases) {
      const effect = armorEffects(name).find(entry => entry.effects.some(value => value.key === key));
      expect(effect, `${name} ${key}`).toBeDefined();
      expect(effect?.applies).toBe('conditional');
      expect(effect?.effects.find(value => value.key === key)?.ulMultiplier).toBe(multiplier);
    }
  });

  it('keeps shared armor magnitudes on every named channel', () => {
    const irisgold = armorEffects('Irisgold').flatMap(effect => effect.effects);
    expect(irisgold).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'stat', key: 'str', base: 2 }),
      expect.objectContaining({ kind: 'stat', key: 'wil', base: 2 }),
    ]));
    const mermanmail = armorEffects('Mermanmail').flatMap(effect => effect.effects);
    expect(mermanmail).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'derived', key: 'evade', base: 5 }),
      expect.objectContaining({ kind: 'derived', key: 'armor', base: 5 }),
    ]));
  });

  it('does not duplicate armor magnitudes already handled by structured data', () => {
    expect(armorEffects('Blackheart').flatMap(effect => effect.effects)).toEqual([]);
    expect(armorEffects('Sarashi Gi').flatMap(effect => effect.effects)).toEqual([]);
  });

  it('returns nothing for an unknown item', () => {
    expect(weaponEffects('Not A Weapon')).toEqual([]);
    expect(armorEffects(null)).toEqual([]);
  });
});

describe('summing item bonuses', () => {
  it('scales a weapon bonus with its upgrade spend', () => {
    const at0 = itemBonuses({
      weaponName: 'Blind Bright',
      weaponPoints: { power: 0, critical: 0, accuracy: 0, durability: 0 },
    });
    const at12 = itemBonuses({
      weaponName: 'Blind Bright',
      weaponPoints: { power: 6, critical: 6, accuracy: 0, durability: 0 },
    });
    expect(at0.elementalAttack.Light ?? 0).toBe(0);
    expect(at12.elementalAttack.Light).toBe(6); // UL 12, UL/2
  });

  it('applies Armor of Eyes Hit without gating it on its separate chance effect', () => {
    const bonuses = itemBonuses({
      armorName: 'Armor of Eyes',
      // A fully upgraded Unarmored torso in Korvara: 3 + 5 + 8.
      armorPoints: { armor: 3, magicArmor: 5, evade: 8 },
    });
    expect(bonuses.derived.hit).toBe(8); // UL 16, UL/2
  });

  it('leaves conditional effects out until switched on', () => {
    // Hankyu's "When you are two-handing this weapon, it gains +10 Power…" is
    // quantified, but gated on how it is held.
    const weapon = ['Hankyu', 'Baphomet Offering', 'Nighthunt']
      .map(name => ({ name, effects: weaponEffects(name) }))
      .find(entry => entry.effects.some(e => e.applies === 'conditional' && e.effects.length));
    expect(weapon, 'expected at least one conditional item effect in the dataset').toBeDefined();

    const index = weapon!.effects.findIndex(e => e.applies === 'conditional' && e.effects.length);
    const channel = weapon!.effects[index].effects[0];
    const points = { power: 6, critical: 6, accuracy: 0, durability: 0 };

    const off = itemBonuses({ weaponName: weapon!.name, weaponPoints: points });
    const on = itemBonuses({
      weaponName: weapon!.name,
      weaponPoints: points,
      conditionals: { [itemConditionalKey(weapon!.name, index)]: true },
    });

    const read = (bonuses: ReturnType<typeof itemBonuses>) =>
      channel.kind === 'stat' ? bonuses.stats[channel.key as 'str'] ?? 0
        : channel.kind === 'elementalAttack' ? bonuses.elementalAttack[channel.key as 'Fire'] ?? 0
          : bonuses.derived[channel.key] ?? 0;
    expect(read(on)).toBeGreaterThan(read(off));
  });

  it('allocates nothing for a build with no equipment', () => {
    expect(itemBonuses({})).toEqual({ stats: {}, derived: {}, elementalAttack: {}, resistances: {} });
  });
});
