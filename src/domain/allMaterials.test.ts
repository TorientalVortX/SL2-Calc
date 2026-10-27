import { describe, expect, it } from 'vitest';
import type { BuildState } from '../types';
import { buildReducer, createDefaultBuild } from '../aether/state/build';
import { GEAR_BY_GROUP } from '../data/gear';
import { evaluateBuild } from './buildEvaluation';
import { ARMOR_MATERIAL_NAMES, OTHER_MATERIAL_NAMES } from './armorMaterials';

const gloves = GEAR_BY_GROUP.Hands[0].name;
const accessory = GEAR_BY_GROUP.Accessory[0].name;

function withGloves(patch: { material?: string; enchantment?: string }): BuildState {
  const build = buildReducer(createDefaultBuild(), { type: 'equip-gear', slot: 'hands', itemName: gloves });
  return buildReducer(build, { type: 'gear-patch', slot: 'hands', patch });
}

describe('material All: clauses', () => {
  it('applies Webbing\'s +3 Acid ATK on gloves, not only on a torso', () => {
    const plain = evaluateBuild(withGloves({ material: 'None' })).elementalAttack.Acid;
    expect(evaluateBuild(withGloves({ material: 'Webbing' })).elementalAttack.Acid).toBe(plain + 3);
  });

  it('applies Rainbowbark\'s five-element ATK on a torso, a weapon and an accessory', () => {
    const base = createDefaultBuild();
    const fireOf = (build: BuildState) => evaluateBuild(build).elementalAttack;
    const before = fireOf(base);

    const torso = buildReducer(buildReducer(base, { type: 'equip-armor', armorName: 'Jerkin of Fortune' }), { type: 'armor-patch', patch: { armorMaterial: 'Rainbowbark' } });
    const torsoPlain = buildReducer(base, { type: 'equip-armor', armorName: 'Jerkin of Fortune' });
    expect(fireOf(torso).Lightning).toBe(fireOf(torsoPlain).Lightning + 1);

    const weapon = buildReducer(buildReducer(base, { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Longsword' }),
      { type: 'weapon-patch', which: 'primaryWeapon', patch: { material: 'Rainbowbark' } });
    const weaponPlain = buildReducer(base, { type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Longsword' });
    expect(fireOf(weapon).Fire).toBe(fireOf(weaponPlain).Fire + 1);
    expect(evaluateBuild(weapon).derived.maxHP).toBe(evaluateBuild(weaponPlain).derived.maxHP + 15);
    expect(evaluateBuild(weapon).derived.fp).toBe(evaluateBuild(weaponPlain).derived.fp + 15);
    expect(evaluateBuild(weapon).sources.fp.find(source => source.label === 'Weapon material')?.value).toBe(15);

    const worn = buildReducer(buildReducer(base, { type: 'equip-gear', slot: 'accessory1', itemName: accessory }),
      { type: 'gear-patch', slot: 'accessory1', patch: { material: 'Rainbowbark' } });
    expect(fireOf(worn).Earth).toBe(before.Earth + 1);
  });

  it('keeps a material out of roles its class has no equipment for', () => {
    expect(OTHER_MATERIAL_NAMES).toContain('Fine Art');
    expect(ARMOR_MATERIAL_NAMES).not.toContain('Fine Art');
    expect(OTHER_MATERIAL_NAMES).toContain('Webbing');
  });
});

describe('glove enchantments', () => {
  it('applies elemental ATK from heart enchantments', () => {
    const plain = evaluateBuild(withGloves({ enchantment: 'None' }));
    const fireheart = evaluateBuild(withGloves({ enchantment: 'Fireheart' }));
    // Fireheart is +2 STR and +3 Fire ATK, and STR also feeds Fire ATK.
    const strGain = fireheart.scaledStats.str - plain.scaledStats.str;
    expect(fireheart.elementalAttack.Fire - plain.elementalAttack.Fire).toBe(3 + strGain);
    expect(evaluateBuild(withGloves({ enchantment: 'Envenomed' })).elementalAttack.Acid).toBe(plain.elementalAttack.Acid + 2);
  });
});
