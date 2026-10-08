import { describe, expect, it } from 'vitest';
import { createBuildFile, decodeSharePayload, encodeSharePayload, parseBuildFile } from './buildPersistence';

const legacy = {
  version: '0.5.0', buildName: 'Legacy Zero HP', race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Soldier',
  characterLevel: 60, food: 'None', history: 'None', hpPercent: 0,
};

const ZERO_SCALING = { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };

/** A whole weapon slot as the app writes one, for the round trips that must be verbatim. */
const weaponSlot = (overrides: Record<string, unknown> = {}) => ({
  selectedWeaponName: 'Longsword', weaponType: 'Sword', basePower: 8, baseCrit: 5, baseHit: 80,
  baseWeight: 10, baseCritDamage: 100, material: 'None', part1: 'None', part2: 'None', part3: 'None',
  enchantment: 'None', upgradeLevel: 0,
  upgradePoints: { power: 2, critical: 0, accuracy: 1, durability: 0 },
  rarity: 1, powerQuality: false, critQuality: false, hitQuality: false,
  weightPlus: false, weightMinus: false, sentimentality: false, twoHandedSkillRank: 0,
  customScaling: { ...ZERO_SCALING },
  ...overrides,
});

describe('build persistence', () => {
  it('preserves crystals and White Spirits in files and share links', () => {
    const build = parseBuildFile(JSON.stringify({ ...legacy, crystalCount: 45, whiteSpiritCount: 5 })).build;
    const restored = parseBuildFile(JSON.stringify(createBuildFile('Counts', build))).build;
    expect(restored).toMatchObject({ crystalCount: 45, whiteSpiritCount: 5 });
    expect(decodeSharePayload(encodeSharePayload('Counts', build)).build).toMatchObject({ crystalCount: 45, whiteSpiritCount: 5 });
  });

  it('clamps counts and defaults old builds to zero', () => {
    expect(parseBuildFile(JSON.stringify(legacy)).build).toMatchObject({ crystalCount: 0, whiteSpiritCount: 0 });
    expect(parseBuildFile(JSON.stringify({ ...legacy, crystalCount: 99, whiteSpiritCount: 9 })).build).toMatchObject({ crystalCount: 45, whiteSpiritCount: 5 });
    expect(parseBuildFile(JSON.stringify({ ...legacy, crystalCount: -1, whiteSpiritCount: -1 })).build).toMatchObject({ crystalCount: 0, whiteSpiritCount: 0 });
  });
  it('migrates v0.5 builds without replacing valid zeroes', () => {
    const migrated = parseBuildFile(JSON.stringify(legacy));
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.build.hpPercent).toBe(0);
    expect(migrated.build.equipment.armorName).toBeNull();
  });

  it('round trips new build files transactionally', () => {
    const migrated = parseBuildFile(JSON.stringify(legacy));
    const file = createBuildFile('Round Trip', migrated.build);
    expect(parseBuildFile(JSON.stringify(file))).toEqual(file);
  });

  it('round trips compressed URL payloads', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    const decoded = decodeSharePayload(encodeSharePayload('Shared', build));
    expect(decoded.buildName).toBe('Shared');
    expect(decoded.build).toEqual(build);
  });

  it('round trips the hands, legs and accessory slots', () => {
    // The torso upgrades were once dropped on load, so a saved build came back
    // with its points silently reset. These four slots must not repeat that.
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.hands = {
      itemName: 'Archery Gloves', material: 'Demonsilk', enchantment: 'Fireheart',
      upgradePoints: { hit: 3, fp: 2 },
    };
    build.equipment.legs = {
      itemName: 'Boots of Initiative', upgradePoints: { hp: 4, evade: 1 },
    };
    build.equipment.accessory1 = { itemName: 'Blue Seal', upgradePoints: { fortune: 2, greed: 5 } };

    const reloaded = parseBuildFile(JSON.stringify(createBuildFile('Geared', build))).build;
    expect(reloaded.equipment.hands).toEqual(build.equipment.hands);
    expect(reloaded.equipment.legs?.upgradePoints).toEqual({ hp: 4, evade: 1 });
    expect(reloaded.equipment.accessory1?.upgradePoints).toEqual({ fortune: 2, greed: 5 });
    // An untouched slot stays absent rather than materialising as empty.
    expect(reloaded.equipment.accessory2).toBeUndefined();
  });

  it('round trips the rolls chosen for ranged item bonuses', () => {
    // "+2-4 CEL" is per-item RNG, so which roll the player owns is part of the
    // build. Losing it on save would silently reset the item to its floor.
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.accessory1 = { itemName: 'Bunny Ears', upgradePoints: { fortune: 0, greed: 0 } };
    build.equipment.itemRolls = { 'Bunny Ears:0:0': 4 };

    const reloaded = parseBuildFile(JSON.stringify(createBuildFile('Rolled', build))).build;
    expect(reloaded.equipment.itemRolls).toEqual({ 'Bunny Ears:0:0': 4 });
  });

  it('reads only the tracks a slot owns', () => {
    // A hand-edited or cross-pasted file must not inject another slot's tracks:
    // legs has no `hit`, and a missing or non-numeric track reads as 0, not NaN.
    // Written as a v1 file because the v0.5 branch discards equipment wholesale.
    const v1 = createBuildFile('Tracks', parseBuildFile(JSON.stringify(legacy)).build);
    const tampered = {
      ...v1,
      build: {
        ...v1.build,
        equipment: {
          ...v1.build.equipment,
          legs: { itemName: 'Bladed Soles', upgradePoints: { hp: 2, hit: 9, nonsense: 'x' } },
        },
      },
    };
    const build = parseBuildFile(JSON.stringify(tampered)).build;
    expect(build.equipment.legs?.upgradePoints).toEqual({ hp: 2, evade: 0 });
  });

  it('rejects unknown core references before changing UI state', () => {
    expect(() => parseBuildFile(JSON.stringify({ ...legacy, race: 'Missing Race' }))).toThrow(/unknown race/i);
  });

  it('rejects malformed, future, tampered, and oversized payloads with actionable errors', () => {
    expect(() => parseBuildFile('{broken')).toThrow();
    expect(() => parseBuildFile(JSON.stringify({ schemaVersion: 2, build: legacy }))).toThrow(/unsupported build schema/i);
    expect(() => decodeSharePayload('not-a-valid-compressed-build')).toThrow(/invalid|unsupported/i);
    expect(() => decodeSharePayload('x'.repeat(20_001))).toThrow(/too large/i);
  });

  it('preserves armor equipment in new-format round trips', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.armorName = 'Breastplate';
    const roundTrip = parseBuildFile(JSON.stringify(createBuildFile('Equipped', build)));
    expect(roundTrip.build.equipment.armorName).toBe('Breastplate');
  });

  it('round trips an off-hand weapon in slot 3 and drops a non-object one', () => {
    // Slot 3's other half. The hands piece is covered above; the off-hand
    // weapon travels as a whole weapon config and must come back verbatim.
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.offHandWeapon = weaponSlot() as typeof build.equipment.offHandWeapon;
    const reloaded = parseBuildFile(JSON.stringify(createBuildFile('Dual', build))).build;
    expect(reloaded.equipment.offHandWeapon).toEqual(build.equipment.offHandWeapon);

    // A hand-edited scalar must read as an empty slot, not crash or leak through.
    const tampered = JSON.parse(JSON.stringify(createBuildFile('Dual', build))) as { build: { equipment: Record<string, unknown> } };
    tampered.build.equipment.offHandWeapon = 'Longsword';
    expect(parseBuildFile(JSON.stringify(tampered)).build.equipment.offHandWeapon).toBeUndefined();
  });

  it('coerces a tampered weapon field instead of feeding it to the damage formulas', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    // What a hand-edited share link or a truncated save can carry. Every one of
    // these used to reach weaponCalculation as-is, because both weapon slots
    // were cast rather than read.
    build.equipment.primaryWeapon = weaponSlot({
      basePower: 'lots', baseCrit: null, baseHit: Number.NaN, rarity: {},
      material: 42, powerQuality: 'yes', selectedWeaponName: 7,
    }) as typeof build.equipment.primaryWeapon;
    const weapon = parseBuildFile(JSON.stringify(createBuildFile('Tampered', build))).build.equipment.primaryWeapon;
    expect(weapon?.basePower).toBe(0);
    expect(weapon?.baseCrit).toBe(0);
    expect(weapon?.baseHit).toBe(0);
    expect(weapon?.rarity).toBe(0);
    expect(weapon?.material).toBe('None');
    expect(weapon?.selectedWeaponName).toBeNull();
    // `Boolean('yes')`, which is what this file's own flag readers do.
    expect(weapon?.powerQuality).toBe(true);
  });

  it('drops weapon channels the calculator never defined', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.primaryWeapon = weaponSlot({ inventedChannel: 99 }) as typeof build.equipment.primaryWeapon;
    const weapon = parseBuildFile(JSON.stringify(createBuildFile('Injected', build))).build.equipment.primaryWeapon;
    expect(weapon).toBeDefined();
    expect(weapon && 'inventedChannel' in weapon).toBe(false);
  });

  it('completes a weapon saved before a field existed rather than loading it undefined', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    const { baseCritDamage: _dropped, sentimentality: _also, ...partial } = weaponSlot();
    build.equipment.primaryWeapon = partial as typeof build.equipment.primaryWeapon;
    const weapon = parseBuildFile(JSON.stringify(createBuildFile('Partial', build))).build.equipment.primaryWeapon;
    expect(weapon?.baseCritDamage).toBe(0);
    expect(weapon?.sentimentality).toBe(false);
    expect(weapon?.basePower).toBe(8);
  });

  it('keeps a legacy upgradeLevel worth of upgrades when no channels were saved', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    const { upgradePoints: _absent, ...beforeChannels } = weaponSlot({ upgradeLevel: 4 });
    build.equipment.primaryWeapon = beforeChannels as typeof build.equipment.primaryWeapon;
    const weapon = parseBuildFile(JSON.stringify(createBuildFile('Legacy upgrades', build))).build.equipment.primaryWeapon;
    // The old uniform level raised power, crit and hit by 4 each and durability
    // by none; filling the channels in with zeroes would have erased all of it.
    expect(weapon?.upgradePoints).toEqual({ power: 4, critical: 4, accuracy: 4, durability: 0 });
  });

  it('round trips the comparison slot and drops a non-object one', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.primaryWeapon = weaponSlot({
      comparisonMode: true,
      secondaryWeapon: weaponSlot({ selectedWeaponName: 'Dagger', weaponType: 'Dagger' }),
    }) as typeof build.equipment.primaryWeapon;
    const reloaded = parseBuildFile(JSON.stringify(createBuildFile('Compared', build))).build;
    expect(reloaded.equipment.primaryWeapon).toEqual(build.equipment.primaryWeapon);

    build.equipment.primaryWeapon = weaponSlot({ secondaryWeapon: 'Dagger' }) as typeof build.equipment.primaryWeapon;
    const dropped = parseBuildFile(JSON.stringify(createBuildFile('Compared', build))).build;
    expect(dropped.equipment.primaryWeapon?.secondaryWeapon).toBeUndefined();
  });

  it('round trips the second accessory slot independently of the first', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.accessory1 = { itemName: 'Blue Seal', upgradePoints: { fortune: 1, greed: 0 } };
    build.equipment.accessory2 = { itemName: 'Bunny Ears', material: 'Snakescale', upgradePoints: { fortune: 0, greed: 3 } };
    const reloaded = parseBuildFile(JSON.stringify(createBuildFile('Two Rings', build))).build;
    expect(reloaded.equipment.accessory1?.itemName).toBe('Blue Seal');
    expect(reloaded.equipment.accessory2).toEqual(build.equipment.accessory2);
  });

  it('round trips torso material, enchantment and upgrade points', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.armorName = 'Breastplate';
    build.equipment.armorMaterial = 'Coral';
    build.equipment.armorEnchantment = 'Fortune';
    build.equipment.armorUpgradePoints = { armor: 3, magicArmor: 2, evade: 0 };
    const reloaded = parseBuildFile(JSON.stringify(createBuildFile('Torso', build))).build;
    expect(reloaded.equipment.armorMaterial).toBe('Coral');
    expect(reloaded.equipment.armorEnchantment).toBe('Fortune');
    expect(reloaded.equipment.armorUpgradePoints).toEqual({ armor: 3, magicArmor: 2, evade: 0 });
  });

  it('shares a fully loaded six-slot build as a URL within the size caps', () => {
    // The share-link cap was sized before slots 3-6 existed; a full loadout
    // with materials, enchantments and rolls must still fit.
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.armorName = 'Breastplate';
    build.equipment.armorMaterial = 'Coral';
    build.equipment.armorEnchantment = 'Fortune';
    build.equipment.armorUpgradePoints = { armor: 3, magicArmor: 2, evade: 1 };
    build.equipment.hands = { itemName: 'Archery Gloves', material: 'Demonsilk', enchantment: 'Fireheart', upgradePoints: { hit: 3, fp: 2 } };
    build.equipment.legs = { itemName: 'Boots of Initiative', material: 'Snakescale', enchantment: 'Fortune', upgradePoints: { hp: 4, evade: 1 } };
    build.equipment.accessory1 = { itemName: 'Blue Seal', upgradePoints: { fortune: 2, greed: 5 } };
    build.equipment.accessory2 = { itemName: 'Bunny Ears', upgradePoints: { fortune: 0, greed: 0 } };
    build.equipment.itemRolls = { 'Bunny Ears:0:0': 4 };

    const encoded = encodeSharePayload('Full Loadout', build);
    expect(encoded.length).toBeLessThan(20_000);
    const decoded = decodeSharePayload(encoded);
    expect(decoded.build.equipment).toEqual(build.equipment);
  });
});

describe('post-softcap stat buffs', () => {
  it('round-trips through the file and the share link', () => {
    const { build } = parseBuildFile(JSON.stringify({
      version: '0.5.0', race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
      characterLevel: 10, food: 'None', history: 'None', hpPercent: 100,
      statBuffs: { str: 4, san: 10 },
    }));
    expect(build.statBuffs?.str).toBe(4);
    expect(build.statBuffs?.san).toBe(10);
    expect(build.statBuffs?.cel).toBe(0);

    const file = parseBuildFile(JSON.stringify(createBuildFile('Buffed', build))).build;
    expect(file.statBuffs).toEqual(build.statBuffs);
    expect(decodeSharePayload(encodeSharePayload('Buffed', build)).build.statBuffs).toEqual(build.statBuffs);
  });

  it('defaults to zeros on a build saved before the channel existed', () => {
    const { build } = parseBuildFile(JSON.stringify({
      version: '0.5.0', race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
      characterLevel: 10, food: 'None', history: 'None', hpPercent: 100,
    }));
    expect(build.statBuffs).toEqual({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });
  });
});

describe('upgrade ceilings on load', () => {
  /*
   * Every build saved before the ceilings existed can hold a spend no item can
   * reach, and the decks only clamp on edit, so a stale build would otherwise
   * keep an illegal figure and feed it to every derived value.
   */
  function loaded(build: Record<string, unknown>) {
    return parseBuildFile(JSON.stringify({
      schemaVersion: 1,
      build: {
        race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
        characterLevel: 60, food: 'None', history: 'None', hpPercent: 100,
        ...build,
      },
    })).build;
  }

  const overspentWeapon = {
    selectedWeaponName: 'Longsword', weaponType: 'Sword',
    basePower: 5, baseCrit: 5, baseHit: 80, baseWeight: 6, baseCritDamage: 110,
    material: 'None', part1: 'None', part2: 'None', part3: 'None',
    enchantment: 'None', rarity: 1,
    upgradePoints: { power: 40, critical: 40, accuracy: 40, durability: 40 },
    powerQuality: false, critQuality: false, hitQuality: false,
    weightPlus: false, weightMinus: false, sentimentality: false, twoHandedSkillRank: 0,
    customScaling: { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  };

  it('holds an over-cap torso spend inside its armour class', () => {
    const points = loaded({
      equipment: {
        armorName: 'Sarashi Gi', armorConditionalBonuses: {},
        armorUpgradePoints: { armor: 40, magicArmor: 40, evade: 40 },
      },
    }).equipment.armorUpgradePoints;
    // Unarmored in Korvara, the default world: 3 / 5 / 8.
    expect(points).toMatchObject({ armor: 3, magicArmor: 5, evade: 8 });
  });

  it('raises those ceilings by one for a G6 build', () => {
    const points = loaded({
      world: 'G6',
      equipment: {
        armorName: 'Sarashi Gi', armorConditionalBonuses: {},
        armorUpgradePoints: { armor: 40, magicArmor: 40, evade: 40 },
      },
    }).equipment.armorUpgradePoints;
    expect(points).toMatchObject({ armor: 4, magicArmor: 6, evade: 9 });
  });

  it('holds an over-cap weapon spend at five', () => {
    const weapon = loaded({
      equipment: { armorName: null, armorConditionalBonuses: {}, primaryWeapon: overspentWeapon },
    }).equipment.primaryWeapon;
    expect(weapon?.upgradePoints).toEqual({ power: 5, critical: 5, accuracy: 5, durability: 5 });
  });

  it('clamps the off-hand weapon too', () => {
    const offHand = loaded({
      world: 'G6',
      equipment: { armorName: null, armorConditionalBonuses: {}, offHandWeapon: overspentWeapon },
    }).equipment.offHandWeapon;
    expect(offHand?.upgradePoints).toEqual({ power: 6, critical: 6, accuracy: 6, durability: 6 });
  });

  it('has no torso durability channel to carry at all', () => {
    const points = loaded({
      equipment: {
        armorName: 'Sarashi Gi', armorConditionalBonuses: {},
        armorUpgradePoints: { armor: 1, magicArmor: 1, evade: 1, durability: 40 },
      },
    }).equipment.armorUpgradePoints;
    // A torso has no durability track, so a saved one is dropped rather than kept.
    expect(points).toEqual({ armor: 1, magicArmor: 1, evade: 1 });
  });

  it('leaves a legal spend untouched', () => {
    const points = loaded({
      equipment: {
        armorName: 'Sarashi Gi', armorConditionalBonuses: {},
        armorUpgradePoints: { armor: 2, magicArmor: 3, evade: 5 },
      },
    }).equipment.armorUpgradePoints;
    expect(points).toMatchObject({ armor: 2, magicArmor: 3, evade: 5 });
  });

  it('clamps no torso channel when none is equipped', () => {
    const points = loaded({
      equipment: {
        armorName: null, armorConditionalBonuses: {},
        armorUpgradePoints: { armor: 40, magicArmor: 40, evade: 40 },
      },
    }).equipment.armorUpgradePoints;
    expect(points).toMatchObject({ armor: 40, magicArmor: 40, evade: 40 });
  });

  it('bounds a negative spend at zero', () => {
    const points = loaded({
      equipment: {
        armorName: 'Sarashi Gi', armorConditionalBonuses: {},
        armorUpgradePoints: { armor: -5, magicArmor: -5, evade: -5 },
      },
    }).equipment.armorUpgradePoints;
    expect(points).toMatchObject({ armor: 0, magicArmor: 0, evade: 0 });
  });
});

describe('the world field', () => {
  function world(value: unknown) {
    return parseBuildFile(JSON.stringify({
      schemaVersion: 1,
      build: {
        race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
        characterLevel: 60, food: 'None', history: 'None', hpPercent: 100, world: value,
      },
    })).build.world;
  }

  it('round-trips both worlds', () => {
    expect(world('G6')).toBe('G6');
    expect(world('Korvara')).toBe('Korvara');
  });

  it('falls back to the default for anything else', () => {
    expect(world(undefined)).toBe('Korvara');
    expect(world('Atlantis')).toBe('Korvara');
    expect(world(6)).toBe('Korvara');
  });

  it('survives a share link', () => {
    const build = parseBuildFile(JSON.stringify({
      schemaVersion: 1,
      build: {
        race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
        characterLevel: 60, food: 'None', history: 'None', hpPercent: 100, world: 'G6',
      },
    })).build;
    expect(decodeSharePayload(encodeSharePayload('w', build)).build.world).toBe('G6');
  });
});

describe('torso quality tags through persistence', () => {
  function loaded(armorQuality: unknown) {
    return parseBuildFile(JSON.stringify({
      schemaVersion: 1,
      build: {
        race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
        characterLevel: 60, food: 'None', history: 'None', hpPercent: 100,
        equipment: { armorName: 'Sarashi Gi', armorConditionalBonuses: {}, armorQuality },
      },
    })).build.equipment.armorQuality;
  }

  it('round-trips the tags', () => {
    expect(loaded({ solid: true, polished: false, goodFit: true, lightweight: true, heavy: false }))
      .toEqual({ solid: true, polished: false, goodFit: true, lightweight: true, heavy: false });
  });

  it('coerces junk to a definite false rather than carrying it', () => {
    expect(loaded({ solid: 'yes', polished: null, goodFit: 1, lightweight: 0, bogus: true }))
      .toEqual({ solid: true, polished: false, goodFit: true, lightweight: false, heavy: false });
  });

  it('is absent on a build saved before the field existed', () => {
    expect(loaded(undefined)).toBeUndefined();
  });

  it('survives a share link', () => {
    const build = parseBuildFile(JSON.stringify({
      schemaVersion: 1,
      build: {
        race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Mage',
        characterLevel: 60, food: 'None', history: 'None', hpPercent: 100,
        equipment: {
          armorName: 'Sarashi Gi', armorConditionalBonuses: {},
          armorQuality: { solid: true, polished: false, goodFit: false, lightweight: false, heavy: true },
        },
      },
    })).build;
    expect(decodeSharePayload(encodeSharePayload('q', build)).build.equipment.armorQuality)
      .toMatchObject({ solid: true, heavy: true });
  });
});
