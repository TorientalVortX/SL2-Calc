import { describe, expect, it } from 'vitest';
import type { TetraAlignment } from '../types';
import {
  armorEffects,
  armorUL,
  exclusiveRivals,
  gearEffects,
  itemBonuses,
  itemConditionalKey,
  itemRollKey,
  onHitRiders,
  setAttackEffects,
  setHealingBonuses,
  valueAtUL,
  weaponEffects,
  weaponUL,
} from './itemEffects';
import { skillById } from './skills';
import { evaluateBuild } from './buildEvaluation';
import { buildReducer, createDefaultBuild } from '../aether/state/build';

describe('UL resolution', () => {
  it('sums every upgrade channel', () => {
    // Wiki: "Upgrade points spent on that piece".
    expect(weaponUL({ power: 5, critical: 5, accuracy: 5, durability: 0 })).toBe(15);
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
  it('uses earned Salamander Power, defaults to zero and clamps to 0?100', () => {
    const value = weaponEffects('Salamander Sword')[0].effects[0];
    expect(value).toMatchObject({ base: 0, rollMax: 100 });
    expect(itemBonuses({ weaponName: 'Salamander Sword', conditionals: { [itemConditionalKey('Salamander Sword', 0)]: true } }).derived.power ?? 0).toBe(0);
    for (const [selected, expected] of [[0, 0], [15, 15], [42, 42], [100, 100], [-5, 0], [150, 100]]) {
      expect(itemBonuses({ weaponName: 'Salamander Sword', rolls: { [itemRollKey('Salamander Sword', 0, 0)]: selected } }).derived.power ?? 0).toBe(expected);
    }
  });
  it('parses a UL-scaled weapon passive', () => {
    // Blind Bright: "Increases Light ATK by UL/2. (Doesn't stack.)"
    const effects = weaponEffects('Blind Bright');
    const scaled = effects.flatMap(e => e.effects).find(e => e.key === 'Light');
    expect(scaled).toMatchObject({ kind: 'elementalAttack', base: 0, ulMultiplier: 0.5 });
  });

  it('reads percent and basic-attack wordings into their own channels', () => {
    const derived = (name: string) => itemBonuses({ gear: [undefined, undefined, { itemName: name }] }).derived;
    expect(derived('Ring of Thorns Plus')).toMatchObject({ hpPercent: -7, basicAttackPower: 10, critical: 10, criticalEvade: -10 });
    expect(derived('Ring of Thorns Plus').power).toBeUndefined();
    expect(derived('Archery Gloves')).toMatchObject({ 'basicAttackPower:Bow': 2 });
    expect(derived("Rogue's Work Gloves")).toMatchObject({ criticalDamage: 10 });
    expect(itemBonuses({ gear: [undefined, undefined, { itemName: 'Grimalkin Hat' }] }).elementalAttack.Dark).toBe(5);
    // "+10 Critical Damage" is flat damage on a crit; "+10% Critical Damage" is the modifier.
    expect(itemBonuses({ weaponName: 'Guillotine' }).derived).toEqual({ criticalFlatDamage: 10 });
    expect(weaponEffects('Moonlight Mercy').flatMap(e => e.effects)).toEqual([expect.objectContaining({ key: 'criticalFlatDamage', ulMultiplier: 1 })]);
    // "UL*2% maximum HP" revives a youkai; it is not your HP.
    expect(itemBonuses({ weaponName: 'Bell of No Rest' }).derived.hpPercent).toBeUndefined();
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

  it('does not read "N armor-ignoring damage" as an Armor bonus', () => {
    expect(gearEffects('Tetra Dragon Fang').flatMap(effect => effect.effects).map(value => value.key)).not.toContain('armor');
    expect(weaponEffects('Creeping Darkness').flatMap(effect => effect.effects)).toEqual([]);
  });

  it('makes a buff that lasts some rounds opt-in', () => {
    expect(gearEffects('Heart of the Lion')[0].applies).toBe('conditional');
    const shields = gearEffects('Metallic Magic Gauntlet').filter(effect => effect.effects.length);
    expect(shields.map(effect => effect.applies)).toEqual(['conditional', 'conditional', 'conditional']);
  });

  it('switches off the gauntlet’s other shields when one is switched on', () => {
    expect(exclusiveRivals(itemConditionalKey('Metallic Magic Gauntlet', 5))).toEqual([
      itemConditionalKey('Metallic Magic Gauntlet', 2), itemConditionalKey('Metallic Magic Gauntlet', 8),
    ]);
    expect(exclusiveRivals(itemConditionalKey('Heart of the Lion', 0))).toEqual([]);
  });

  it('gives every channel of a shared-magnitude list its bonus', () => {
    const values = (effects: ReturnType<typeof gearEffects>) => effects.flatMap(effect => effect.effects).map(value => [value.key, value.base]);
    expect(values(gearEffects('Heart of the Lion'))).toEqual([['str', 2], ['wil', 2], ['def', 2], ['res', 2]]);
    expect(values(weaponEffects('Sunken Silk Bow').slice(0, 1))).toEqual([['power', 5], ['hit', 5], ['critical', 5]]);
    expect(values(weaponEffects('Hankyu').slice(1, 2))).toEqual([['evade', 10], ['criticalEvade', 10]]);
  });

  it('keys each line by its text, keeping repeated lines apart', () => {
    const lines = gearEffects('Metallic Magic Gauntlet');
    const keys = lines.map((_, index) => itemConditionalKey('Metallic Magic Gauntlet', index));
    expect(new Set(keys).size).toBe(lines.length);
    expect(keys.every(key => key.startsWith('Metallic Magic Gauntlet#'))).toBe(true);
  });

  it('scales Unassuming Adventurer 3+ HP and FP with the pieces worn', () => {
    const set = (pieces: number) => itemBonuses({ sets: [{ name: 'Unassuming Adventurer', pieces }] }).derived;
    expect(set(2)).toEqual({});
    expect(set(3)).toEqual({ hp: 30, fp: 30 });
    expect(set(4)).toEqual({ hp: 40, fp: 40 });
  });

  it('raises healing by 15% from Church Faithful 2+, for the skills on the healing list', () => {
    expect(setHealingBonuses([{ name: 'Church Faithful', pieces: 1 }])).toEqual([]);
    expect(setHealingBonuses([{ name: 'Church Faithful', pieces: 2 }])).toEqual([{ label: 'Church Faithful 2+', percent: 15 }]);
    expect(['graft', 'healing-discharge', 'reihou', 'dhessence'].map(id => skillById(id)?.healing)).toEqual([true, true, true, true]);
    expect(['cleanse-body', 'healing-aqua', 'nature-s-bounty'].map(id => skillById(id)?.healing)).toEqual([undefined, undefined, undefined]);
  });

  it('turns Unassuming Adventurer 5+ and Gunsmoke Spiritual 3+ into damage effects once reached', () => {
    expect(setAttackEffects([{ name: 'Unassuming Adventurer', pieces: 4 }])).toEqual([]);
    expect(setAttackEffects([{ name: 'Unassuming Adventurer', pieces: 5 }])).toEqual([{ label: 'Unassuming Adventurer 5+', damagePercent: 15 }]);
    expect(setAttackEffects([{ name: 'Gunsmoke Spiritual', pieces: 3 }])).toEqual([
      { label: 'Gunsmoke Spiritual 3+', resistanceIgnored: { types: ['Dark', 'Light'], percent: 10 } },
    ]);
  });

  it('returns nothing for an unknown item', () => {
    expect(weaponEffects('Not A Weapon')).toEqual([]);
    expect(armorEffects(null)).toEqual([]);
  });
});

describe('Tetra items', () => {
  const fang = (tetra?: TetraAlignment) => itemBonuses({ gear: [{ itemName: 'Tetra Dragon Fang', upgradePoints: {}, tetra }] });

  it('defaults to the Fire crystal, as the wiki writes them', () => {
    expect(fang()).toMatchObject({ stats: { str: 3 }, elementalAttack: { Fire: 3 } });
  });

  it('moves the stat and element to the chosen crystal', () => {
    expect(fang('Ice')).toMatchObject({ stats: { ski: 3 }, elementalAttack: { Ice: 3 } });
    expect(fang('Wind').stats).toEqual({ cel: 3 });
    const gauntlet = itemBonuses({ gear: [{ itemName: 'Tetra Gauntlet', upgradePoints: {}, tetra: 'Earth' }] });
    expect(gauntlet.resistances).toEqual({ Earth: 10 });
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
    // Hankyu: "When you are two-handing this weapon, it gains +10 Power…"
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
    expect(itemBonuses({})).toEqual({ stats: {}, setStats: {}, derived: {}, elementalAttack: {}, resistances: {} });
  });
});

describe('spell-school Power', () => {
  const equip = (slot: 'primaryWeapon' | 'offHandWeapon', build = createDefaultBuild()) => buildReducer(build, { type: 'equip-weapon', which: slot, weaponName: 'Burngada' });

  it('gives a held staff its full Power and an off-hand one half', () => {
    expect(evaluateBuild(equip('primaryWeapon')).spellPower).toEqual({ Nerifian: { percent: 10, flat: 0 } });
    expect(evaluateBuild(equip('offHandWeapon', equip('primaryWeapon'))).spellPower).toEqual({ Nerifian: { percent: 15, flat: 0 } });
  });

  it('reads flat Power for every school a trinket lists', () => {
    expect(itemBonuses({ gear: [undefined, undefined, { itemName: 'Prism Jewel' }] }).derived).toMatchObject({
      'spellFlatPower:Aquarian': 2, 'spellFlatPower:Isespian': 2, 'spellFlatPower:Sylphid': 2,
    });
  });
});

describe('on-hit riders', () => {
  it('reads a weapon’s Elemental ATK rider and a gear rider only for its weapon type', () => {
    expect(onHitRiders({ weaponName: 'Icebreaker' }, ['Axe'])).toEqual([
      expect.objectContaining({ source: 'Icebreaker', amount: 0, atkPercent: 50, type: 'Ice', damageClass: 'magical', ignores: 'armor' }),
    ]);
    const bracers = { gear: [{ itemName: 'Burning Bracers' }] };
    expect(onHitRiders(bracers, ['Fist'])).toEqual([expect.objectContaining({ amount: 15, type: 'Fire' })]);
    expect(onHitRiders(bracers, ['Sword'])).toEqual([]);
  });

  it('resolves UL on the weapon', () => {
    const points = { power: 3, critical: 2, accuracy: 0, durability: 0 };
    expect(onHitRiders({ weaponName: 'Hooked Twinblade', weaponPoints: points }, [])[0]).toMatchObject({ amount: 5, type: 'Pierce', damageClass: 'physical' });
  });
});
