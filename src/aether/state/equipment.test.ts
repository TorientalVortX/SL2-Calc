import { describe, expect, it } from 'vitest';
import { equippedSlot3, resolveUpgradePoints } from '../../types';
import { evaluateBuild } from '../../domain/buildEvaluation';
import { mainClassAllowsWeaponType, subClassOnlyWeaponType, weaponCategory } from '../../domain/equipment';
import { CLASSES } from '../../data/classes';
import { GEAR_BY_GROUP } from '../../data/gear';
import { WEAPONS_BY_TYPE } from '../../data/weapons';
import { buildReducer, createDefaultBuild } from './build';
import { SLOTS, effectsForSlot, equipmentOverview, slotSummary, weaponChoices } from './equipment';

const armed = () => buildReducer(createDefaultBuild(), {
  type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Engraved Katana',
});

describe('weapon categories', () => {
  it('translates between the weapon and class vocabularies', () => {
    // The two lists disagree on three of the eight names; these are those three.
    expect(weaponCategory('Polearm')).toBe('Spears');
    expect(weaponCategory('Fist')).toBe('Fist');
    expect(weaponCategory('Sword')).toBe('Swords');
    expect(weaponCategory(undefined)).toBeNull();
  });

  /*
   * Only the main class grants weapons. A subclass supplies skills, so a Mage
   * subclass does not put a Tome in a Soldier's hands. The route to one is an
   * Adaptation talent, checked separately and capped by rarity.
   */
  it('gates a weapon on the main class alone', () => {
    expect(mainClassAllowsWeaponType('Sword', CLASSES.Soldier)).toBe(true);
    expect(mainClassAllowsWeaponType('Tome', CLASSES.Soldier)).toBe(false);
    expect(mainClassAllowsWeaponType('Tome', CLASSES.Mage)).toBe(true);
  });

  it('names a weapon the subclass lists and the main class does not', () => {
    expect(subClassOnlyWeaponType('Tome', CLASSES.Soldier, CLASSES.Mage)).toBe(true);
    // Already free from the main class, so there is nothing to explain.
    expect(subClassOnlyWeaponType('Sword', CLASSES.Soldier, CLASSES.Mage)).toBe(false);
    // On neither list: refused, but not because of the subclass.
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
    // Scaling comes from the item, summed across every entry it lists.
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
    // The hands entry is removed, not merely shadowed: otherwise unequipping the
    // weapon would silently bring back a piece the player never re-equipped.
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
    // A Soldier reaches Swords, Axes and Spears, never a Tome.
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
    // Mage lists Tomes and Soldier does not. Under the old "either slot" rule
    // this read as legal; a subclass grants skills, not proficiency.
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
    // And the refusal knows to explain itself, rather than looking like a bug.
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
    // Fluency's Adaptation opens Tomes to Rarity SR x 2 whatever the classes say.
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
    // One rank reaches Rarity 2, and no further: the ceiling is the point.
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
      expect(entry.conditionalKey).toBe(`Engraved Katana:${entry.index}`);
      for (const roll of entry.rolls) expect(roll.max).toBeGreaterThanOrEqual(roll.min);
    }
  });

  it('applies a conditional item effect only once switched on', () => {
    const build = armed();
    const conditional = effectsForSlot(build.equipment, 'primaryWeapon')
      .find(entry => entry.effect.applies === 'conditional');
    if (!conditional) return; // This weapon states none; nothing to assert.
    const before = evaluateBuild(build);
    const after = evaluateBuild(buildReducer(build, {
      type: 'item-conditional', key: conditional.conditionalKey, on: true,
    }));
    expect(JSON.stringify(after.scaledStats) !== JSON.stringify(before.scaledStats)
      || after.primaryWeapon!.power !== before.primaryWeapon!.power).toBe(true);
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

/* The gear dataset is generated, so tests name items by position rather than by a
   hard-coded string that a regeneration could rename out from under them. */
function firstGearName(group: 'hands' | 'accessory'): string {
  return group === 'hands' ? GEAR_BY_GROUP.Hands[0].name : GEAR_BY_GROUP.Accessory[0].name;
}

function firstWeaponOfType(type: string): string {
  return (WEAPONS_BY_TYPE as Record<string, Array<{ name: string }>>)[type][0].name;
}
