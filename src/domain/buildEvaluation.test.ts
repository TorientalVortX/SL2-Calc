import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { SUBRACES } from '../data/races';
import { ARMORS } from '../data/armors';
import { HISTORY } from '../data/bonuses';

function baseBuild() {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Evaluation fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Mage', characterLevel: 10, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

describe('shared build evaluation', () => {
  it('uses current level points and main-class-only stats with monoclass doubling', () => {
    const multiclass = evaluateBuild(baseBuild());
    const monoBuild = baseBuild();
    monoBuild.subClass = 'Soldier';
    const monoclass = evaluateBuild(monoBuild);
    expect(multiclass.pointBudget).toBe(40);
    expect(monoclass.rawStats.str - multiclass.rawStats.str).toBe(2);
    expect(monoclass.rawStats.ski - multiclass.rawStats.ski).toBe(1);
    expect(monoclass.rawStats.vit - multiclass.rawStats.vit).toBe(2);
  });

  it('applies APT, history, astrology, equipment, and derived values in one evaluation', () => {
    const build = baseBuild();
    build.addedStats.apt = 12;
    build.addedStats.cel = 8;
    build.history = 'Warrior';
    build.astrology = 'Mars';
    build.baseEvade = 10;
    build.equipment.armorName = "Dragon King's Armor";
    const result = evaluateBuild(build);
    expect(result.scaledStats.apt).toBeGreaterThan(0);
    expect(result.scaledStats.str).toBeGreaterThan(result.rawStats.str - 3);
    expect(result.derived.evade).toBe(Math.floor(result.scaledStats.cel * 2) + 10 - 8);
    expect(result.derived.armor).toBe(7);
    expect(result.derived.magicArmor).toBe(0);
    expect(result.derived.armorEvade).toBe(-8);
    expect(result.derived.armorWeight).toBe(24);
    expect(result.derived.equipmentLoad).toBe(24);
    expect(result.derived.battleWeightRemaining).toBe(result.derived.battleWeight - 24);
    expect(result.derived.maxHP).toBeGreaterThan(0);
    expect(result.elementalAttack.Fire).toBeTypeOf('number');
    expect(result.elementalResistance.Fire).toBeTypeOf('number');
  });

  it('respects pre-cap bonuses when reporting maximum investment', () => {
    const build = baseBuild();
    build.customBaseStats.str = 10;
    build.history = 'Warrior';
    const result = evaluateBuild(build);
    expect(result.maxInvestedStats.str).toBe(80 - SUBRACES.Imperialist.str - 10 - (HISTORY.Warrior.stats.str ?? 0));
    expect(result.maxInvestedStats.str).toBeLessThan(80);
  });

  it('shares the low-health instinct thresholds and affected stats', () => {
    const build = baseBuild();
    build.subrace = 'Felidae';
    build.felidaeInstinct = true;
    build.hpPercent = 25;
    const withoutInstinct = { ...build, felidaeInstinct: false };
    const baseline = evaluateBuild(withoutInstinct);
    const result = evaluateBuild(build);
    const expectedBonus = Math.floor(baseline.scaledStats.san * 0.1 + 1) * 2;
    expect(result.scaledStats.ski - baseline.scaledStats.ski).toBe(expectedBonus);
    expect(result.scaledStats.cel - baseline.scaledStats.cel).toBe(expectedBonus);
    expect(result.scaledStats.gui - baseline.scaledStats.gui).toBe(expectedBonus);
    expect(result.scaledStats.luc - baseline.scaledStats.luc).toBe(expectedBonus);
    expect(result.scaledStats.str).toBe(baseline.scaledStats.str);
  });
});

describe('armour upgrade points', () => {
  it('raises armour, magic armour and evade, and defaults to none', () => {
    const withArmor = baseBuild();
    withArmor.equipment.armorName = Object.values(ARMORS)[0]?.name ?? null;

    const before = evaluateBuild(withArmor);
    const after = evaluateBuild({
      ...withArmor,
      equipment: {
        ...withArmor.equipment,
        armorUpgradePoints: { armor: 2, magicArmor: 1, evade: 3, durability: 4 },
      },
    });

    expect(after.derived.armor - before.derived.armor).toBe(2);
    expect(after.derived.magicArmor - before.derived.magicArmor).toBe(1);
    expect(after.derived.evade - before.derived.evade).toBe(3);
    // Durability is not a derived build stat, so it must not leak into evade etc.
    expect(after.derived.armorWeight).toBe(before.derived.armorWeight);
  });

  it('leaves builds saved before the feature untouched', () => {
    const build = baseBuild();
    build.equipment.armorName = Object.values(ARMORS)[0]?.name ?? null;
    const legacy = evaluateBuild(build);
    const explicitNone = evaluateBuild({
      ...build,
      equipment: { ...build.equipment, armorUpgradePoints: { armor: 0, magicArmor: 0, evade: 0, durability: 0 } },
    });
    expect(explicitNone.derived).toEqual(legacy.derived);
  });
});
