import { describe, expect, it } from 'vitest';
import { equippedSlot3, resolveUpgradePoints } from '../../types';
import { evaluateBuild } from '../../domain/buildEvaluation';
import { mainClassAllowsWeaponType, subClassOnlyWeaponType, weaponCategory } from '../../domain/equipment';
import { CLASSES } from '../../data/classes';
import { GEAR_BY_GROUP } from '../../data/gear';
import { WEAPONS_BY_TYPE } from '../../data/weapons';
import { itemConditionalKey } from '../../domain/itemEffects';
import { buildReducer, createDefaultBuild } from './build';
import { SLOTS, effectsForSlot, equipmentOverview, grantedSkills, setBonuses, slotSummary, weaponChoices } from './equipment';

const armed = () => buildReducer(createDefaultBuild(), {
  type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Engraved Katana',
});

describe('weapon categories', () => {
  it('translates between the weapon and class vocabularies', () => {
    expect(weaponCategory('Polearm')).toBe('Spears');
    expect(weaponCategory('Fist')).toBe('Fist');
    expect(weaponCategory('Sword')).toBe('Swords');
    expect(weaponCategory(undefined)).toBeNull();
  });

  // A subclass grants skills, not weapons; Adaptation talents are the other route.
  it('gates a weapon on the main class alone', () => {
    expect(mainClassAllowsWeaponType('Sword', CLASSES.Soldier)).toBe(true);
    expect(mainClassAllowsWeaponType('Tome', CLASSES.Soldier)).toBe(false);
    expect(mainClassAllowsWeaponType('Tome', CLASSES.Mage)).toBe(true);
  });

  it('names a weapon the subclass lists and the main class does not', () => {
    expect(subClassOnlyWeaponType('Tome', CLASSES.Soldier, CLASSES.Mage)).toBe(true);
    expect(subClassOnlyWeaponType('Sword', CLASSES.Soldier, CLASSES.Mage)).toBe(false);
    expect(subClassOnlyWeaponType('Tome', CLASSES.Soldier, CLASSES.Soldier)).toBe(false);
  });

  it('treats an unstated restriction as no restriction', () => {
    expect(mainClassAllowsWeaponType('Sword', undefined)).toBe(true);
  });
});

describe('equipping', () => {
  it('builds a full weapon config from the item name alone', () => {
    const build = armed();
    const config = build.equipment.primaryWeapon!;
    expect(config.selectedWeaponName).toBe('Engraved Katana');
    expect(config.weaponType).toBe('Sword');
    expect(config.customScaling.str).toBeGreaterThan(0);
    expect(resolveUpgradePoints(config)).toEqual({ power: 0, critical: 0, accuracy: 0, durability: 0 });
  });

  it('feeds the evaluator, which reports Power and weight', () => {
    const evaluation = evaluateBuild(armed());
    expect(evaluation.primaryWeapon).toBeDefined();
    expect(evaluation.primaryWeapon!.power).toBeGreaterThan(0);
    expect(evaluation.derived.equipmentLoad).toBe(evaluation.primaryWeapon!.weight);
  });

  it('raises Power when upgrade points are spent', () => {
    const base = evaluateBuild(armed()).primaryWeapon!.power;
    const upgraded = buildReducer(armed(), {
      type: 'weapon-patch',
      which: 'primaryWeapon',
      patch: { upgradePoints: { power: 5, critical: 0, accuracy: 0, durability: 0 } },
    });
    expect(evaluateBuild(upgraded).primaryWeapon!.power).toBe(base + 5);
  });

  it('unequips to an empty slot rather than a stale config', () => {
    const build = buildReducer(armed(), {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: null,
    });
    expect(build.equipment.primaryWeapon).toBeUndefined();
    expect(evaluateBuild(build).primaryWeapon).toBeUndefined();
  });
});

describe('slot 3 exclusivity', () => {
  it('displaces the hands piece when a weapon goes in', () => {
    let build = buildReducer(createDefaultBuild(), {
      type: 'equip-gear', slot: 'hands', itemName: firstGearName('hands'),
    });
    expect(build.equipment.hands?.itemName).toBe(firstGearName('hands'));
    build = buildReducer(build, {
      type: 'equip-weapon', which: 'offHandWeapon', weaponName: 'Engraved Katana',
    });
    expect(equippedSlot3(build.equipment)).toBe('offHandWeapon');
    expect(build.equipment.hands).toBeUndefined();
  });

  it('displaces the weapon when a hands piece goes in', () => {
    let build = buildReducer(createDefaultBuild(), {
      type: 'equip-weapon', which: 'offHandWeapon', weaponName: 'Engraved Katana',
    });
    build = buildReducer(build, { type: 'equip-gear', slot: 'hands', itemName: firstGearName('hands') });
    expect(build.equipment.offHandWeapon).toBeUndefined();
    expect(equippedSlot3(build.equipment)).toBe('hands');
  });
});

describe('accessories', () => {
  it('moves an accessory rather than wearing it twice', () => {
    const item = firstGearName('accessory');
    let build = buildReducer(createDefaultBuild(), { type: 'equip-gear', slot: 'accessory2', itemName: item });
    build = buildReducer(build, { type: 'equip-gear', slot: 'accessory1', itemName: item });
    expect(build.equipment.accessory1?.itemName).toBe(item);
    expect(build.equipment.accessory2).toBeUndefined();
  });
});

describe('slot summaries and overview', () => {
  it('reports every slot, empty by default', () => {
    const build = createDefaultBuild();
    for (const descriptor of SLOTS) {
      expect(slotSummary(build.equipment, descriptor.id).name).toBeNull();
    }
  });

  it('summarises an equipped weapon with its upgrade level', () => {
    const build = buildReducer(armed(), {
      type: 'weapon-patch',
      which: 'primaryWeapon',
      patch: { upgradePoints: { power: 3, critical: 2, accuracy: 0, durability: 1 } },
    });
    const summary = slotSummary(build.equipment, 'primaryWeapon');
    expect(summary.name).toBe('Engraved Katana');
    expect(summary.ul).toBe(6);
    expect(summary.detail).toContain('Sword');
  });

  it('flags a weapon the main class cannot wield', () => {
    const build = buildReducer(createDefaultBuild(), {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: firstWeaponOfType('Tome'),
    });
    const evaluation = evaluateBuild(build);
    const overview = equipmentOverview(
      build.equipment, evaluation.derived.battleWeight, evaluation.derived.equipmentLoad, build,
    );
    expect(overview.restrictedWeapon).toBe('Tome');
  });

  it('does not let a subclass legalise a weapon the main class lacks', () => {
    const armedWithTome = buildReducer(createDefaultBuild(), {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: firstWeaponOfType('Tome'),
    });
    const build = buildReducer(armedWithTome, { type: 'class', slot: 'sub', className: 'Mage' });
    const evaluation = evaluateBuild(build);
    const overview = equipmentOverview(
      build.equipment, evaluation.derived.battleWeight, evaluation.derived.equipmentLoad, build,
    );
    expect(build.mainClass).toBe('Soldier');
    expect(overview.restrictedWeapon).toBe('Tome');
    expect(overview.restrictedBySubClassOnly).toBe(true);
    const tomeRow = weaponChoices(build.mainClass, build.subClass, build).find(choice => choice.group === 'Tome');
    expect(tomeRow?.restriction).toContain('a subclass grants no weapons');
  });

  it('names only the main class when no slot lists the weapon', () => {
    const build = buildReducer(createDefaultBuild(), {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: firstWeaponOfType('Tome'),
    });
    const evaluation = evaluateBuild(build);
    const overview = equipmentOverview(
      build.equipment, evaluation.derived.battleWeight, evaluation.derived.equipmentLoad, build,
    );
    expect(overview.restrictedBySubClassOnly).toBe(false);
    expect(weaponChoices(build.mainClass, build.subClass, build)
      .find(choice => choice.group === 'Tome')?.restriction).toBe('Soldier cannot wield tomes');
  });

  it('clears that flag once an Adaptation rank covers the weapon', () => {
    const armedWithTome = buildReducer(createDefaultBuild(), {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: firstWeaponOfType('Tome'),
    });
    // Fluency's Adaptation opens Tomes to Rarity SR x 2.
    const build = buildReducer(armedWithTome, {
      type: 'subtalent-rank', subtalentId: 'fluency/adaptation', rank: 5,
    });
    const evaluation = evaluateBuild(build);
    const overview = equipmentOverview(
      build.equipment, evaluation.derived.battleWeight, evaluation.derived.equipmentLoad, build,
    );
    expect(overview.restrictedWeapon).toBeNull();
  });

  it('opens a weapon list by rarity rather than wholesale', () => {
    const soldier = { mainClass: 'Soldier', subClass: 'Soldier' };
    const blocked = weaponChoices(soldier.mainClass, soldier.subClass, {});
    const opened = weaponChoices(soldier.mainClass, soldier.subClass, { talents: { 'fluency/adaptation': 1 } });
    const tomes = (list: ReturnType<typeof weaponChoices>) => list.filter(choice => choice.group === 'Tome');
    expect(tomes(blocked).every(choice => choice.restriction)).toBe(true);
    const legal = tomes(opened).filter(choice => !choice.restriction);
    expect(legal.length).toBeGreaterThan(0);
    expect(legal.length).toBeLessThan(tomes(opened).length);
    expect(legal.every(choice => choice.unlockedBy === 'Adaptation')).toBe(true);
    expect(tomes(opened).find(choice => choice.restriction)?.restriction).toContain('Adaptation opens tomes to Rarity 2');
  });

  it('reports the weight load against capacity', () => {
    const build = armed();
    const evaluation = evaluateBuild(build);
    const overview = equipmentOverview(
      build.equipment, evaluation.derived.battleWeight, evaluation.derived.equipmentLoad, build,
    );
    expect(overview.capacity).toBe(evaluation.derived.battleWeight);
    expect(overview.load).toBe(evaluation.derived.equipmentLoad);
    expect(overview.overWeight).toBe(false);
  });
});

describe('item effects', () => {
  it('exposes effect lines with stable conditional keys', () => {
    const effects = effectsForSlot(armed().equipment, 'primaryWeapon');
    for (const entry of effects) {
      expect(entry.conditionalKey).toMatch(/^Engraved Katana#[0-9a-z]+$/);
      for (const roll of entry.rolls) expect(roll.max).toBeGreaterThanOrEqual(roll.min);
    }
  });

  it('applies a conditional item effect only once switched on', () => {
    const build = armed();
    const conditional = effectsForSlot(build.equipment, 'primaryWeapon')
      .find(entry => entry.effect.applies === 'conditional');
    if (!conditional) return;
    const before = evaluateBuild(build);
    const after = evaluateBuild(buildReducer(build, {
      type: 'item-conditional', key: conditional.conditionalKey, on: true,
    }));
    expect(JSON.stringify(after.scaledStats) !== JSON.stringify(before.scaledStats)
      || after.primaryWeapon!.power !== before.primaryWeapon!.power).toBe(true);
  });
});

describe('Magical Gauntlet shields', () => {
  it('keeps only one shield active at a time', () => {
    let build = buildReducer(createDefaultBuild(), { type: 'equip-gear', slot: 'hands', itemName: 'Metallic Magic Gauntlet' });
    const def = () => evaluateBuild(build).scaledStats.def;
    const base = def();
    build = buildReducer(build, { type: 'item-conditional', key: itemConditionalKey('Metallic Magic Gauntlet', 2), on: true });
    build = buildReducer(build, { type: 'item-conditional', key: itemConditionalKey('Metallic Magic Gauntlet', 5), on: true });
    expect(build.equipment.itemConditionalBonuses).toMatchObject({ [itemConditionalKey('Metallic Magic Gauntlet', 2)]: false, [itemConditionalKey('Metallic Magic Gauntlet', 5)]: true });
    expect(def()).toBe(base + 8);
  });
});

describe('granted skills', () => {
  it('gathers each skill’s name, cost and text from the equipped items', () => {
    let build = buildReducer(createDefaultBuild(), { type: 'equip-gear', slot: 'hands', itemName: 'Metallic Magic Gauntlet' });
    build = buildReducer(build, { type: 'equip-gear', slot: 'accessory1', itemName: 'Ash-Kissed Malas' });
    const skills = grantedSkills(build.equipment);
    expect(skills.map(skill => [skill.name, skill.cost, skill.slot])).toEqual([
      ['Magic Shield', '3 Momentum, 5 FP', 'slot3'],
      ['Metallic Aegis', '3 Momentum, 5 FP', 'slot3'],
      ['Magical Aegis', '3 Momentum, 5 FP', 'slot3'],
      ['Goren Bakudan', '3M, 15 FP, 1 Round CD', 'accessory1'],
    ]);
    expect(skills[1].parts.map(part => part.conditionalKey)).toEqual([itemConditionalKey('Metallic Magic Gauntlet', 5)]);
    expect(skills[3].parts.map(part => part.effect.description)[1]).toBe('Furinkazan: Gain 1 Fire Mark.');
  });

  it('splits a weapon special that grants two skills, with each cost on its own', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Tricky Yoyo' });
    expect(grantedSkills(build.equipment).map(skill => [skill.name, skill.cost])).toEqual([
      ['Walk The Dog', '3M, 10 FP, 1 round CD'],
      ['Elevator', '1M'],
    ]);
  });

  it('fills a weapon skill that only names itself from the item that describes it', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Boxing Glove' });
    const [guard] = grantedSkills(build.equipment);
    expect(guard.name).toBe('Guard');
    expect(guard.text).toMatch(/^Raise your shield.*Schwarz Sturm gauge\.$/);
  });

  it('describes the skills torso armour grants', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-armor', armorName: 'Cruel Commander' });
    const [contract] = grantedSkills(build.equipment);
    expect([contract.name, contract.cost]).toEqual(['Contract of Blood', '3 Momentum, 0 FP']);
    expect(contract.parts[0].effect.description).toMatch(/^Targets 1 of your Youkai/);
  });

  it('leaves an item’s other effects out of its skills', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-gear', slot: 'accessory1', itemName: 'Ash-Kissed Malas' });
    const other = effectsForSlot(build.equipment, 'accessory1').filter(entry => !entry.effect.grants);
    expect(other.map(entry => entry.effect.description)).toEqual(['+2 STR']);
  });
});

describe('granted skills in use', () => {
  const on = (build: ReturnType<typeof createDefaultBuild>, key: string) => buildReducer(build, { type: 'item-conditional', key, on: true });

  it('sets STR to level + 20 while Contract of Blood is in effect', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-armor', armorName: 'Cruel Commander' });
    const active = evaluateBuild(on(build, itemConditionalKey('Cruel Commander', 2)));
    expect(active.scaledStats.str).toBe(build.characterLevel + 20);
    expect(active.rawStats.str).toBe(build.characterLevel + 20);
  });

  it('adds Lion’s Roar’s STR, growing with character level', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-gear', slot: 'hands', itemName: 'Lion Shield' });
    const before = evaluateBuild(build).scaledStats.str;
    expect(evaluateBuild(on(build, itemConditionalKey('Lion Shield', 3))).scaledStats.str).toBe(before + 2 + Math.floor(build.characterLevel / 5));
  });

  it('gives Luckiness Dance at least 1 SKI and LUC before any upgrades', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-weapon', which: 'primaryWeapon', weaponName: "Atlaua's Abaniko" });
    const before = evaluateBuild(build).scaledStats;
    const after = evaluateBuild(on(build, itemConditionalKey("Atlaua's Abaniko", 1))).scaledStats;
    expect([after.ski - before.ski, after.luc - before.luc]).toEqual([1, 1]);
  });

  it('does not read a skill’s cost or a "per 20 STR" rate as a bonus', () => {
    const build = buildReducer(createDefaultBuild(), { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Holy Word' });
    expect(effectsForSlot(build.equipment, 'primaryWeapon').flatMap(entry => entry.effect.effects)).toEqual([]);
  });
});

describe('set bonuses', () => {
  const wear = (build: ReturnType<typeof createDefaultBuild>, ...actions: Parameters<typeof buildReducer>[1][]) => actions.reduce(buildReducer, build);

  it('applies a reached threshold without a switch, and nothing below it', () => {
    const one = wear(createDefaultBuild(), { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Konosekai' });
    const both = wear(one, { type: 'equip-weapon', which: 'offHandWeapon', weaponName: 'Mugendai' });
    const [lone, paired] = [evaluateBuild(one), evaluateBuild(both)];
    expect(paired.scaledStats.wil - lone.scaledStats.wil).toBe(3);
    expect(paired.scaledStats.cel - lone.scaledStats.cel).toBe(3);
    expect(paired.elementalResistance.Sound - lone.elementalResistance.Sound).toBe(15);
  });

  it('puts a situational threshold behind a switch that only shows once reached', () => {
    let build = wear(createDefaultBuild(),
      { type: 'equip-gear', slot: 'accessory1', itemName: 'Crucifix' },
      { type: 'equip-gear', slot: 'accessory2', itemName: 'Halo' },
      { type: 'equip-gear', slot: 'legs', itemName: 'Sanctified Shoes' });
    const church = setBonuses(build.equipment).find(set => set.name === 'Church Faithful')!;
    const versus = church.thresholds.find(threshold => threshold.count === 3)!;
    expect(versus.reached).toBe(true);
    expect(versus.entry.effect.applies).toBe('conditional');
    const before = evaluateBuild(build).derived.evade;
    build = buildReducer(build, { type: 'item-conditional', key: versus.entry.conditionalKey, on: true });
    expect(evaluateBuild(build).derived.evade).toBeGreaterThan(before);
  });

  it('lists a set’s skill with the item-granted ones once the set reaches it', () => {
    const build = wear(createDefaultBuild(),
      { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Yin' },
      { type: 'equip-weapon', which: 'offHandWeapon', weaponName: 'Yang' });
    const doubleDao = grantedSkills(build.equipment).filter(skill => skill.slot === 'set');
    expect(doubleDao.map(skill => [skill.name, skill.itemName])).toEqual([['Double Dao', 'Gunsmoke Spiritual 2+']]);
  });
});

describe('class torso pieces', () => {
  const as = (mainClass: string, armorName: string | null) => {
    const build = buildReducer({ ...createDefaultBuild(), mainClass, subClass: 'Soldier' }, { type: 'equip-armor', armorName });
    return evaluateBuild(build).rawStats;
  };

  it('raises a Mage class’s stat bonuses by half, at least 1 each', () => {
    const bare = as('Evoker', null);
    const caped = as('Evoker', "Caster's Cape");
    // Evoker gives WIL 3, SKI 2, CEL 2, LUC 1.
    expect([caped.wil - bare.wil, caped.ski - bare.ski, caped.cel - bare.cel, caped.luc - bare.luc, caped.str - bare.str]).toEqual([1, 1, 1, 1, 0]);
  });

  it('does nothing for a class outside its family', () => {
    expect(as('Monk', "Caster's Cape")).toEqual(as('Monk', null));
    expect(as('Monk', "Farmer's Shirt").def - as('Monk', null).def).toBe(1);
  });
});

describe('clearing', () => {
  it('empties every slot without touching the character', () => {
    let build = armed();
    build = buildReducer(build, { type: 'equip-armor', armorName: 'Half-Plate' });
    build = buildReducer(build, { type: 'equipment-clear' });
    expect(build.equipment.primaryWeapon).toBeUndefined();
    expect(build.equipment.armorName).toBeNull();
    expect(build.addedStats).toEqual(createDefaultBuild().addedStats);
  });
});

function firstGearName(group: 'hands' | 'accessory'): string {
  return group === 'hands' ? GEAR_BY_GROUP.Hands[0].name : GEAR_BY_GROUP.Accessory[0].name;
}

function firstWeaponOfType(type: string): string {
  return (WEAPONS_BY_TYPE as Record<string, Array<{ name: string }>>)[type][0].name;
}

describe('Salamander battle Power control', () => {
  it('exposes a zero-default slider and applies a selected partial stack', () => {
    let b = buildReducer(createDefaultBuild(), { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Salamander Sword' });
    const initial = evaluateBuild(b).primaryWeapon!.swa;
    const control = effectsForSlot(b.equipment, 'primaryWeapon')[0].rolls[0];
    expect(control).toMatchObject({ label: 'Earned Salamander Power', min: 0, max: 100, current: 0 });
    b = buildReducer(b, { type: 'item-roll', key: control.key, value: 35 });
    expect(evaluateBuild(b).primaryWeapon!.swa).toBe(initial + 35);
    expect(effectsForSlot(b.equipment, 'primaryWeapon')[0].rolls[0].current).toBe(35);
  });
});
