import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { equipmentViolations } from './loadout';
import { enchantmentEffectForSlot, armorEnchantmentEffect } from './armorEnchantments';
import { NO_HANDS_UPGRADE_POINTS, NO_LEGS_UPGRADE_POINTS, NO_ACCESSORY_UPGRADE_POINTS } from '../types';
import { findWeaponByName, weaponToConfig } from './equipment';
import { itemRollKey } from './itemEffects';
import { GEAR } from '../data/gear';
import { ITEM_SETS, activeSets } from './itemSets';

function build() {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Gear fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Mage', characterLevel: 60, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

/** The hands Hit track lands on the main weapon, so one has to be equipped. */
function armedBuild() {
  const state = build();
  const weapon = findWeaponByName('Longsword');
  if (!weapon) throw new Error('fixture weapon missing');
  state.equipment.primaryWeapon = weaponToConfig(weapon, {});
  return state;
}

describe('gear fixtures', () => {
  it('names only items that exist', () => {
    /*
     * Every item these tests equip, checked against the real data.
     *
     * Nothing else here fails when a name is wrong: upgrade points, materials
     * and enchantments all resolve against the slot rather than the item, so a
     * typo or a name lifted from a mockup passes silently while testing much
     * less than it appears to. Three of these were placeholders before this
     * check existed.
     */
    const equipped = [
      'Blue Seal', 'Bunny Ears', 'Ring of Focus', 'Ring of Life', 'Blood Jewel',
      'Bands of the Crocodile', 'Magic Gauntlet', 'Archery Gloves',
      'Boots of Initiative', "Magician's Ring", "Warrior's Ring", 'Indignant Idol',
      'Ring of Focus', 'Green Gloves', "Gunfighter's Boots", 'Dragon King Gauntlet', 'Bands of the Chimera',
    ];
    expect(equipped.filter(name => !GEAR[name])).toEqual([]);
  });
});

describe('slot 3-6 item effects', () => {
  it('applies an accessory stat bonus', () => {
    // Blue Seal is "+2 FAI" and nothing else.
    const state = build();
    const before = evaluateBuild(state).rawStats.fai;
    state.equipment.accessory1 = { itemName: 'Blue Seal', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(evaluateBuild(state).rawStats.fai).toBe(before + 2);
  });

  it('applies both accessory slots independently', () => {
    const state = build();
    const before = evaluateBuild(state).rawStats;
    state.equipment.accessory1 = { itemName: 'Blue Seal', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.accessory2 = { itemName: 'Bunny Ears', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    const after = evaluateBuild(state).rawStats;
    expect(after.fai).toBe(before.fai + 2);
    expect(after.cel).toBeGreaterThan(before.cel);
  });

  it('raises max FP from an accessory that grants it', () => {
    // Ring of Focus is "+40 FP". This is the channel that did not exist before.
    const state = build();
    const before = evaluateBuild(state).derived.fp;
    state.equipment.accessory1 = { itemName: 'Ring of Focus', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(evaluateBuild(state).derived.fp).toBe(before + 40);
  });

  it('raises max HP from an accessory that grants it', () => {
    const state = build();
    const before = evaluateBuild(state).derived.maxHP;
    state.equipment.accessory1 = { itemName: 'Ring of Life', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(evaluateBuild(state).derived.maxHP).toBe(before + 40);
  });

  it('does not read regeneration as a bonus to the maximum', () => {
    // Blood Jewel is "Recover 2 HP each Round", healing, not +2 max HP.
    const state = build();
    const before = evaluateBuild(state).derived.maxHP;
    state.equipment.accessory1 = { itemName: 'Blood Jewel', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(evaluateBuild(state).derived.maxHP).toBe(before);
  });

  it('defaults a ranged bonus to the bottom of its range, never a penalty', () => {
    /*
     * Bunny Ears is "+2-4 CEL": per-item RNG, so an unconfigured build takes the
     * floor rather than assuming a good roll. The upper bound used to be read as
     * the number -4, so equipping a bonus *lowered* the stat by 4.
     */
    const state = build();
    const before = evaluateBuild(state).rawStats.cel;
    state.equipment.accessory1 = { itemName: 'Bunny Ears', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(evaluateBuild(state).rawStats.cel).toBe(before + 2);
  });

  it('uses the roll the build says it has', () => {
    const state = build();
    const before = evaluateBuild(state).rawStats.cel;
    state.equipment.accessory1 = { itemName: 'Bunny Ears', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.itemRolls = { [itemRollKey('Bunny Ears', 0, 0)]: 4 };
    expect(evaluateBuild(state).rawStats.cel).toBe(before + 4);
  });

  it('holds a roll inside its range', () => {
    // A hand-edited or stale file cannot claim a roll the item cannot have.
    const state = build();
    const before = evaluateBuild(state).rawStats.cel;
    state.equipment.accessory1 = { itemName: 'Bunny Ears', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.itemRolls = { [itemRollKey('Bunny Ears', 0, 0)]: 99 };
    expect(evaluateBuild(state).rawStats.cel).toBe(before + 4);
    state.equipment.itemRolls = { [itemRollKey('Bunny Ears', 0, 0)]: -5 };
    expect(evaluateBuild(state).rawStats.cel).toBe(before + 2);
  });

  it('rolls each value in a two-range effect separately', () => {
    // Bands of the Crocodile is "+1-3 WIL, +1-2 DEF" in one line.
    const state = build();
    const before = evaluateBuild(state).rawStats;
    state.equipment.hands = { itemName: 'Bands of the Crocodile', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    state.equipment.itemRolls = {
      [itemRollKey('Bands of the Crocodile', 0, 0)]: 3,
      [itemRollKey('Bands of the Crocodile', 0, 1)]: 1,
    };
    const after = evaluateBuild(state).rawStats;
    expect(after.wil).toBe(before.wil + 3);
    expect(after.def).toBe(before.def + 1);
  });

  it('does not read a granted skill’s FP cost as bonus FP', () => {
    // Magic Gauntlet grants a skill costing "3 Momentum, 5 FP".
    const state = build();
    const before = evaluateBuild(state).derived.fp;
    state.equipment.hands = { itemName: 'Magic Gauntlet', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    expect(evaluateBuild(state).derived.fp).toBe(before);
  });
});

describe('slot 3-6 upgrade tracks', () => {
  it('spends hands points on main-weapon Hit and max FP', () => {
    const state = armedBuild();
    state.equipment.hands = { itemName: 'Archery Gloves', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    const before = evaluateBuild(state);
    state.equipment.hands = { itemName: 'Archery Gloves', upgradePoints: { hit: 4, fp: 3 } };
    const after = evaluateBuild(state);
    // One point is worth +1, the same rate as the weapon and armour tracks.
    expect((after.primaryWeapon?.hit ?? 0) - (before.primaryWeapon?.hit ?? 0)).toBe(4);
    expect(after.derived.fp - before.derived.fp).toBe(3);
  });

  it('spends legs points on max HP and Evade', () => {
    const state = build();
    state.equipment.legs = { itemName: 'Boots of Initiative', upgradePoints: NO_LEGS_UPGRADE_POINTS };
    const before = evaluateBuild(state).derived;
    state.equipment.legs = { itemName: 'Boots of Initiative', upgradePoints: { hp: 6, evade: 2 } };
    const after = evaluateBuild(state).derived;
    expect(after.maxHP - before.maxHP).toBe(6);
    expect(after.evade - before.evade).toBe(2);
  });

  it('ignores an off-hand build’s stale hands entry', () => {
    /*
     * Equipping a second weapon displaces the hands piece. A hands entry left
     * behind by that switch must contribute nothing at all (not its upgrade
     * points and not its item effects), so the build reads exactly as if slot 3
     * had never held a hands piece.
     */
    const empty = evaluateBuild(armedBuild());

    const stale = armedBuild();
    stale.equipment.hands = { itemName: 'Archery Gloves', upgradePoints: { hit: 5, fp: 5 } };
    stale.equipment.offHandWeapon = { selectedWeaponName: 'Dagger' } as never;
    const withOffHand = evaluateBuild(stale);

    expect(withOffHand.primaryWeapon?.hit).toBe(empty.primaryWeapon?.hit);
    expect(withOffHand.derived.fp).toBe(empty.derived.fp);
    // Archery Gloves also grants +2 SKI; that must be gone too.
    expect(withOffHand.rawStats.ski).toBe(empty.rawStats.ski);
  });
});

describe('slot 3-6 materials and enchantments', () => {
  it('uses the material’s Other profile, not its armour one', () => {
    // Arctic Gold is "+1 Armor, +1 Weight, +5% Ice Resistance" on a torso but
    // only the resistance on a pair of boots.
    const state = build();
    state.equipment.legs = { itemName: 'Boots of Initiative', upgradePoints: NO_LEGS_UPGRADE_POINTS };
    const before = evaluateBuild(state).derived;
    state.equipment.legs.material = 'Arctic Gold';
    const after = evaluateBuild(state).derived;
    expect(after.armor).toBe(before.armor);
    expect(after.evade).toBe(before.evade);
  });

  it('feeds a material’s Other resistance into elemental resistance', () => {
    // Arctic Gold's Other profile is "+5% Ice Resistance" and nothing else.
    const state = build();
    state.equipment.legs = { itemName: 'Boots of Initiative', upgradePoints: NO_LEGS_UPGRADE_POINTS };
    const before = evaluateBuild(state).elementalResistance.Ice;
    state.equipment.legs.material = 'Arctic Gold';
    expect(evaluateBuild(state).elementalResistance.Ice).toBe(before + 5);
  });

  it('feeds a slot enchantment’s stats and status resistance into the build', () => {
    // Warding on legs is "+3 Resistance" plus the shared "+10% Status Effect
    // Resistance". Both must reach the totals, at the legs magnitude.
    const state = build();
    state.equipment.legs = { itemName: 'Boots of Initiative', upgradePoints: NO_LEGS_UPGRADE_POINTS };
    const before = evaluateBuild(state);
    state.equipment.legs.enchantment = 'Warding';
    const after = evaluateBuild(state);
    expect(after.rawStats.res).toBe(before.rawStats.res + 3);
    expect(after.derived.statusResistance).toBe(before.derived.statusResistance + 10);
  });

  it('reads an enchantment at the slot it is on', () => {
    // Warding is "Armor: +5 Resistance. Legs: +3 Resistance." The legs figure
    // must not borrow the torso one.
    expect(armorEnchantmentEffect('Warding').stats.res).toBe(5);
    expect(enchantmentEffectForSlot('Warding', 'Legs').stats.res).toBe(3);
  });

  it('refuses an enchantment that is not legal on the slot', () => {
    // Leviathan is torso-only; putting it on legs must resolve to nothing.
    expect(enchantmentEffectForSlot('Leviathan', 'Legs').hp).toBe(0);
  });
});

describe('item elemental resistance', () => {
  it('applies a resistance stated in a gear item’s own text', () => {
    // Indignant Idol is "-10% Light Resistance": a penalty, and the only place
    // it is written is the prose, since these slots have no resistance column.
    const state = build();
    const before = evaluateBuild(state).elementalResistance.Light;
    state.equipment.accessory1 = { itemName: 'Indignant Idol', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(evaluateBuild(state).elementalResistance.Light).toBe(before - 10);
  });

  it('does not double an armour whose resistance is already curated', () => {
    /*
     * Blackheart carries `resistances: { Light: 10 }` in armors.json *and*
     * repeats "10% Light Resistance" in its details. Reading both would grant
     * 20%. The armour text is deliberately not parsed for resistances.
     */
    const state = build();
    const before = evaluateBuild(state).elementalResistance.Light;
    state.equipment.armorName = 'Blackheart';
    expect(evaluateBuild(state).elementalResistance.Light).toBe(before + 10);
  });

  it('applies a curated resistance that was keyed with the wiki’s spelling', () => {
    // Brightray Plate was keyed "Darkness" rather than the canonical "Dark",
    // so its 10% never reached the build at all.
    const state = build();
    const before = evaluateBuild(state).elementalResistance.Dark;
    state.equipment.armorName = 'Brightray Plate';
    expect(evaluateBuild(state).elementalResistance.Dark).toBe(before + 10);
  });
});

describe('equipment sets', () => {
  it('counts pieces across every slot, not just one', () => {
    /*
     * Unassuming Adventurer spans armour, hands, legs and both accessories, so a
     * count that looked at one slot's data could never reach its thresholds.
     */
    const state = build();
    state.equipment.armorName = 'Roughspun Tunic';
    state.equipment.accessory1 = { itemName: 'Ring of Focus', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.accessory2 = { itemName: 'Ring of Life', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };

    const [set] = activeSets(state.equipment);
    expect(set.name).toBe('Unassuming Adventurer');
    expect(set.equipped).toBe(3);
    expect(set.active.map(t => t.count)).toEqual([2, 3]);
    expect(set.upcoming.map(t => t.count)).toEqual([5]);
  });

  it('reports a set the build has only one piece of', () => {
    // One piece grants nothing, but showing the next threshold is the point.
    const state = build();
    state.equipment.accessory1 = { itemName: 'Ring of Focus', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    const [set] = activeSets(state.equipment);
    expect(set.equipped).toBe(1);
    expect(set.active).toEqual([]);
    expect(set.upcoming[0].count).toBe(2);
  });

  it('does not count a stale hands piece when an off-hand weapon is equipped', () => {
    // Slot 3 holds one thing; counting both would complete a set the player
    // is not wearing.
    const state = build();
    state.equipment.armorName = 'Roughspun Tunic';
    state.equipment.hands = { itemName: 'Green Gloves', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    expect(activeSets(state.equipment)[0].equipped).toBe(2);

    state.equipment.offHandWeapon = { selectedWeaponName: 'Dagger' } as never;
    expect(activeSets(state.equipment)[0].equipped).toBe(1);
  });

  it('keeps a per-piece set rule that has no thresholds', () => {
    // Dragon King scales with how many pieces are worn rather than stepping.
    const dragonKing = ITEM_SETS['Dragon King'];
    expect(dragonKing.thresholds).toEqual([]);
    expect(dragonKing.note).toMatch(/for each Dragon King item equipped/i);
  });
});

describe('aptitude threshold', () => {
  /**
   * 31 invested APT scales to 35. One short of the 36 that grants the next "+1
   * to every other stat" tier. Any bonus APT lands exactly on the boundary,
   * which is what makes this the case worth testing.
   */
  const onBoundary = () => {
    const state = build();
    state.addedStats.apt = 31;
    return state;
  };

  it('does not let equipment APT push the every-6 threshold', () => {
    /*
     * Bands of the Chimera grants +1 to all stats, APT included. That +1 must
     * raise APT without buying a tier: the wearer should gain the item's own +1
     * STR and nothing more. Counting it granted a second +1 to all twelve.
     */
    const state = onBoundary();
    const before = evaluateBuild(state).rawStats.str;
    state.equipment.hands = { itemName: 'Bands of the Chimera', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    expect(evaluateBuild(state).rawStats.str).toBe(before + 1);
  });

  it('still grants the tier for APT the character actually invested', () => {
    // The rule itself is intact. One more spent point does cross the boundary.
    const state = onBoundary();
    const before = evaluateBuild(state).rawStats.str;
    state.addedStats.apt = 32;
    expect(evaluateBuild(state).rawStats.str).toBe(before + 1);
  });
});

describe('all-stats bonuses', () => {
  it('expands "+1 to all stats" across the twelve stats', () => {
    /*
     * Bands of the Chimera says "all stats" where its siblings name one
     * ("+1-4 STR"), so it parsed to nothing and the item did nothing.
     */
    const state = build();
    const before = evaluateBuild(state).rawStats;
    state.equipment.hands = { itemName: 'Bands of the Chimera', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    const after = evaluateBuild(state).rawStats;
    for (const stat of Object.keys(before) as Array<keyof typeof before>) {
      expect(after[stat] - before[stat]).toBe(1);
    }
  });
});

describe('physical resistance', () => {
  it('applies Blunt, Pierce and Slash from armour', () => {
    // Half-Plate is "+5% Pierce and Slash Resistance", curated as both.
    const state = build();
    const before = evaluateBuild(state).physicalResistance;
    expect(before).toEqual({ Blunt: 0, Pierce: 0, Slash: 0 });
    state.equipment.armorName = 'Half-Plate';
    expect(evaluateBuild(state).physicalResistance).toMatchObject({ Pierce: 5, Slash: 5 });
  });

  it('applies it from a gear item’s text', () => {
    // Gunfighter's Boots states "8% Pierce Resistance" in prose only.
    const state = build();
    state.equipment.legs = { itemName: "Gunfighter's Boots", upgradePoints: NO_LEGS_UPGRADE_POINTS };
    expect(evaluateBuild(state).physicalResistance.Pierce).toBe(8);
  });

  it('applies it from a material', () => {
    // Chainmail Section is "+5% Slash Resistance" on both its Armor and Other
    // profiles, so it counts on a torso and on a pair of boots alike.
    const state = build();
    state.equipment.armorName = 'Breastplate';
    state.equipment.armorMaterial = 'Chainmail Section';
    expect(evaluateBuild(state).physicalResistance.Slash).toBe(5);
  });
});

describe('dragon sets', () => {
  it('counts Dragon King pieces from the loadout rather than a typed number', () => {
    const state = build();
    const before = evaluateBuild(state);
    state.equipment.armorName = "Dragon King's Armor";
    state.equipment.hands = { itemName: 'Dragon King Gauntlet', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    const after = evaluateBuild(state);
    /*
     * Two pieces: +3 to the raw stat each, and +5% each on the scaled total.
     *
     * The scaled figure is derived from the racial line rather than from
     * `rawStats`, so the multiplier is the only thing that moves it, and at a
     * low STR the floor can swallow it entirely, which is why this asserts the
     * formula rather than merely that the number went up.
     */
    expect(after.rawStats.str - before.rawStats.str).toBe(6);
    expect(after.scaledStats.str).toBe(Math.floor(before.scaledStats.str * 1.1));
  });

  it('ignores the legacy typed count', () => {
    // A build saved while Dragon King was a manual field must not keep paying
    // out for pieces it is not wearing.
    const state = build();
    const before = evaluateBuild(state).rawStats.str;
    state.dragonKing = 4;
    expect(evaluateBuild(state).rawStats.str).toBe(before);
  });
});

describe('equipment legality', () => {
  it('accepts a normally filled loadout', () => {
    const state = build();
    state.equipment.hands = { itemName: 'Archery Gloves', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    state.equipment.accessory1 = { itemName: 'Blue Seal', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.accessory2 = { itemName: 'Bunny Ears', upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(equipmentViolations(state)).toEqual([]);
  });

  it('rejects the same accessory in both slots', () => {
    const state = build();
    state.equipment.accessory1 = { itemName: "Magician's Ring", upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.accessory2 = { itemName: "Magician's Ring", upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(equipmentViolations(state)).toHaveLength(1);
    expect(equipmentViolations(state)[0]).toMatch(/cannot be equipped twice/i);
  });

  it('allows two different accessories', () => {
    const state = build();
    state.equipment.accessory1 = { itemName: "Magician's Ring", upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    state.equipment.accessory2 = { itemName: "Warrior's Ring", upgradePoints: NO_ACCESSORY_UPGRADE_POINTS };
    expect(equipmentViolations(state)).toEqual([]);
  });

  it('rejects slot 3 holding a hands piece and an off-hand weapon at once', () => {
    const state = build();
    state.equipment.hands = { itemName: 'Archery Gloves', upgradePoints: NO_HANDS_UPGRADE_POINTS };
    state.equipment.offHandWeapon = { selectedWeaponName: 'Dagger' } as never;
    expect(equipmentViolations(state)[0]).toMatch(/one or the other/i);
  });
});
