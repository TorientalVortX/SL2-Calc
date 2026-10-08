import { describe, expect, it } from 'vitest';
import { createDefaultBuild } from '../aether/state/build';
import { statBreakdown } from '../aether/state/readout';
import { evaluateBuild, STAT_KEYS } from './buildEvaluation';
import { effectiveWeaponTypes, findWeaponByName, weaponToConfig } from './equipment';
import { classSkillPointBudget, skillPoolSpends } from './skills';
import { talentEffects } from './talents';
import { SUBRACES } from '../data/races';
import { gearEffects, itemConditionalKey } from './itemEffects';
import { equipGear } from '../aether/state/equipment';

describe('live calculator reports', () => {
  it('counts both Howling Handshot types for grip and talents without duplicating a modifier', () => {
    const build = createDefaultBuild();
    const weapon = weaponToConfig(findWeaponByName('Howling Handshot')!);
    build.equipment.primaryWeapon = weapon;
    expect(effectiveWeaponTypes(weapon)).toEqual(['Bow', 'Sword']);
    const baseline = evaluateBuild(build);
    weapon.twoHandedSkillRank = 3;
    expect(evaluateBuild(build).primaryWeapon!.power - baseline.primaryWeapon!.power).toBe(12);
    expect(talentEffects({ talents: { 'blade-expertise/reliability': 5 } }, effectiveWeaponTypes(weapon)).hit).toBe(7.5);
    expect(talentEffects({ talents: { 'blade-expertise/reliability': 5 } }, ['Sword', 'Dagger']).hit).toBe(7.5);
  });

  it('adds Human and class-family skill allowances, including Destiny', () => {
    const human = { race: 'Human', subrace: 'Imperialist', traits: ['arcanic-study'] };
    expect(classSkillPointBudget('Mage', false, human)).toBe(38);
    expect(classSkillPointBudget('Soldier', false, human)).toBe(37);
    expect(classSkillPointBudget('Mage', true, human)).toBe(53);
    expect(classSkillPointBudget('Mage', false, { race: 'Serpentkind', traits: ['arcanic-study'] })).toBe(36);
    const pools = skillPoolSpends('Mage', 'Soldier', { main: {}, sub: {} }, false, human);
    expect(pools.find(pool => pool.className === 'Mage')!.budget).toBe(38);
  });

  it('applies Keyshot only to bows, including dual-type bows', () => {
    const build = createDefaultBuild();
    build.mainClass = 'Archer'; build.subClass = 'Archer';
    for (const [name, bonus] of [['Howling Handshot', 15], ['Longsword', 0]] as const) {
      build.equipment.primaryWeapon = weaponToConfig(findWeaponByName(name)!);
      build.skillRanks = { main: {}, sub: {} };
      const before = evaluateBuild(build).primaryWeapon!.critical;
      build.skillRanks.main.keyshot = 3;
      expect(evaluateBuild(build).primaryWeapon!.critical - before).toBe(bonus);
    }
  });

  it('adds the confirmed Talvyd Wind ATK at every rank only when enabled', () => {
    const build = createDefaultBuild();
    build.mainClass = 'Mage'; build.subClass = 'Mage';
    for (const rank of [1, 2, 3]) {
      build.skillRanks = { main: { talvyd: rank }, sub: {} };
      build.skillConditionals = {};
      const before = evaluateBuild(build).elementalAttack.Wind;
      build.skillConditionals = { 'talvyd:2': true };
      expect(evaluateBuild(build).elementalAttack.Wind - before).toBe([7, 9, 11][rank - 1]);
    }
  });

  it('makes the Bradan Glove critical bonus opt-in', () => {
    const build = createDefaultBuild();
    build.equipment.primaryWeapon = weaponToConfig(findWeaponByName('Longsword')!);
    build.equipment = equipGear(build.equipment, 'hands', 'Bradan Glove');
    const index = gearEffects('Bradan Glove').findIndex(effect => effect.effects.some(value => value.key === 'critical'));
    expect(gearEffects('Bradan Glove')[index].applies).toBe('conditional');
    const before = evaluateBuild(build).primaryWeapon!.critical;
    build.equipment.itemConditionalBonuses = { [itemConditionalKey('Bradan Glove', index)]: true };
    expect(evaluateBuild(build).primaryWeapon!.critical - before).toBe(50);
  });

  it('gives Hyattr its base 4 APT and reconciles named stat sources', () => {
    expect(SUBRACES.Hyattr.apt).toBe(4);
    const build = createDefaultBuild();
    build.race = 'Serpentkind'; build.subrace = 'Hyattr';
    build.addedStats.apt = 14; build.addedStats.ski = 12;
    build.history = 'Warrior'; build.astrology = 'Mars';
    build.customStats.ski = 2; build.statBuffs = { ...build.customStats, ski: 3 };
    build.equipment.armorName = "Dragon King's Armor";
    build.equipment = equipGear(build.equipment, 'accessory1', 'Bands of the Chimera');
    const evaluation = evaluateBuild(build, true);
    for (const stat of STAT_KEYS) {
      const sum = evaluation.statSources![stat].reduce((total, source) => total + source.value, 0);
      expect(sum, stat).toBeCloseTo(statBreakdown(build, evaluation, stat).other);
    }
    expect(evaluation.statSources!.ski.map(source => source.label)).toContain('Manual stat adjustments');
  });
});
