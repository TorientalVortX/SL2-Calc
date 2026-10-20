import { describe, expect, it } from 'vitest';
import { normalizeBuildState, createBuildFile, parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { findWeaponByName, weaponToConfig } from './equipment';
import { effectsForSlot } from '../aether/state/equipment';
import { GEAR_BY_GROUP } from '../data/gear';

function fixture() {
  const b = normalizeBuildState({ race: 'Other', subrace: 'Redtail', mainClass: 'Shapeshifter', subClass: 'Shinobi', characterLevel: 60 });
  b.equipment.primaryWeapon = weaponToConfig(findWeaponByName('Salamander Sword')!);
  b.equipment.primaryWeapon.enchantment = 'Arcane';
  return b;
}

describe('SS/Shinobi corrections', () => {
  it('sets Innovator pool to99 without changing the ordinary pool', () => {
    const b = fixture(); const normal = evaluateBuild(b).derived.skillPool;
    b.traits = ['undeniable-innovator'];
    expect(evaluateBuild(b).derived.skillPool).toBe(99);
    b.traits = []; expect(evaluateBuild(b).derived.skillPool).toBe(normal);
  });
  it('models Numa as a zero-default status slider, persists it, and removes it when unequipped', () => {
    const b = fixture(); b.addedStats.str = 60;
    b.equipment.accessory1 = { itemName: 'Numa', upgradePoints: { fortune: 0, greed: 0 } };
    const before = evaluateBuild(b);
    const control = effectsForSlot(b.equipment, 'accessory1')[0].rolls[0];
    expect(control).toMatchObject({ label: 'Boon of Numa level', current: 0 });
    b.equipment.itemRolls = { [control.key]: 20 };
    const after = evaluateBuild(b);
    expect(after.scaledStats.str - before.scaledStats.str).toBe(20);
    expect(after.rawStats.str - before.rawStats.str).toBe(20);
    expect(after.derived.hitTiers.base).toBe(before.derived.hitTiers.base);
    const restored = parseBuildFile(JSON.stringify(createBuildFile('Numa', b))).build;
    expect(evaluateBuild(restored).scaledStats.str).toBe(after.scaledStats.str);
    b.equipment.accessory1 = undefined;
    expect(evaluateBuild(b).scaledStats.str).toBe(before.scaledStats.str);
  });
  it('applies Full Swing once without a manual toggle and blocks it with a shield or subweapon', () => {
    const b = fixture(); b.equipment.primaryWeapon!.baseWeight = 20;
    const plain = evaluateBuild(b).primaryWeapon!;
    b.talents = { 'two-hand/full-swing': 5 };
    const active = evaluateBuild(b).primaryWeapon!;
    expect(active.swa - plain.swa).toBe(20);
    expect(active.power).toBe(plain.power);
    b.equipment.primaryWeapon!.twoHandedSkillRank = 5;
    b.talentConditionals = { 'two-hand/full-swing': true };
    expect(evaluateBuild(b).primaryWeapon!.swa).toBe(active.swa);
    b.equipment.hands = { itemName: GEAR_BY_GROUP.Shield[0].name, upgradePoints: { hit: 0, fp: 0 } };
    const blocked = evaluateBuild(b).primaryWeapon!.swa;
    b.talents = {}; b.equipment.primaryWeapon!.twoHandedSkillRank = 0;
    expect(evaluateBuild(b).primaryWeapon!.swa).toBe(blocked);
    b.equipment.hands = undefined;
    b.equipment.offHandWeapon = weaponToConfig(findWeaponByName('Longsword')!);
    const dual = evaluateBuild(b).primaryWeapon!.swa;
    b.talents = { 'two-hand/full-swing': 5 };
    expect(evaluateBuild(b).primaryWeapon!.swa).toBe(dual);
  });
  it('shows the real40FP difference from Depth25 and three Redthread materials15', () => {
    const b = fixture(); const plain = evaluateBuild(b).derived.fp;
    b.talents = { 'capacity/depth': 5 };
    b.equipment.hands = { itemName: 'Bands of Skill', material: 'Redthread', upgradePoints: { hit: 0, fp: 0 } };
    b.equipment.legs = { itemName: "Souji's Waraji", material: 'Redthread', upgradePoints: { hp: 0, evade: 0 } };
    b.equipment.accessory1 = { itemName: 'Numa', material: 'Redthread', upgradePoints: { fortune: 0, greed: 0 } };
    const result = evaluateBuild(b);
    expect(result.derived.fp - plain).toBe(65); // Bands of Skill also grants25FP.
    expect(result.sources.fp.reduce((sum, s) => sum + s.value, 0)).toBe(result.derived.fp);
    expect(result.sources.fp.find(s => s.label === 'Talents (Capacity: Depth)')?.value).toBe(25);
    expect(result.sources.fp.filter(s => s.label.endsWith('Redthread material')).reduce((sum,s) => sum+s.value,0)).toBe(15);
  });
});
