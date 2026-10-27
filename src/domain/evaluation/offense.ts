import type { DerivedSource, StatRecord, WeaponConfig, WeaponLine } from '../../types';
import { resolveUpgradePoints } from '../../types';
import { isShield } from '../../data/gear';
import modifierData from '../../data/content/weapon-modifiers.json';
import { effectiveWeaponTypes, findWeaponByName } from '../equipment';
import { calculateWeaponSlot, scaledStatContribution, type WeaponEnchantment, type WeaponModifier } from '../weaponCalculation';
import { effectiveScaling } from '../weaponScaling';
import { FLANKING_BASE, FLANKING_PER_GUI, HIT_PER_SKI, attackerHit } from '../hitEvade';
import { skillBonuses } from '../skills';
import type { TalentEffects } from '../talents';
import type { EvaluationInputs } from './inputs';
import type { StatsResult } from './stats';
import { STAT_KEYS, compactSources, sumSources } from './shared';

export function evaluateWeaponSlot(config: WeaponConfig, stats: StatRecord, extraCritChance = 0, traitIds: string[] = [], unarmed = false) {
  const materials = modifierData.materials as Record<string, WeaponModifier>;
  const parts = modifierData.parts as Record<string, WeaponModifier>;
  const enchantments = modifierData.enchantments as Record<string, WeaponEnchantment>;
  const material = materials[config.material] ?? materials.None;
  const selectedParts = [config.part1, config.part2, config.part3].map(part => parts[part] ?? parts.None);
  const enchantment = enchantments[config.enchantment] ?? enchantments.None;
  const scaling = effectiveScaling(config, traitIds, unarmed);
  const scalingContribution = scaledStatContribution(stats, scaling);
  // The STR-primary critical bonus reads the listed percentage, not the SWA-multiplied one.
  const strScalingContribution = Math.floor(stats.str * (scaling.str ?? 0) / 100);
  const maxScaling = Math.max(...STAT_KEYS.map(stat => scaling[stat] ?? 0));
  const hasPrimaryStrScaling = (scaling.str ?? 0) > 0 && scaling.str === maxScaling;
  const mutationTypes: Record<number, string> = { 1: 'Dagger', 2: 'Fist', 3: 'Sword', 4: 'Axe', 5: 'Spear', 6: 'Tome', 7: 'Bow', 8: 'Gun' };
  const effectiveWeaponType = config.enchantment === 'Mutation' && config.rarity < 9 ? mutationTypes[config.rarity] ?? config.weaponType : config.weaponType;
  const rarityDiff = config.enchantment === 'Rebellion' && config.rarity < 9 ? 9 - config.rarity : 0;
  return calculateWeaponSlot({
    stats,
    weaponType: config.weaponType,
    effectiveWeaponType,
    effectiveWeaponTypes: effectiveWeaponTypes(config),
    basePower: config.basePower,
    baseCrit: config.baseCrit,
    baseHit: config.baseHit,
    baseWeight: config.baseWeight,
    baseCritDamage: config.baseCritDamage,
    material,
    parts: selectedParts,
    enchantmentName: config.enchantment,
    enchantment,
    upgradePoints: resolveUpgradePoints(config),
    rarity: config.rarity,
    powerQuality: config.powerQuality,
    critQuality: config.critQuality,
    hitQuality: config.hitQuality,
    weightPlus: config.weightPlus,
    weightMinus: config.weightMinus,
    sentimentality: config.sentimentality,
    twoHandedSkillRank: config.twoHandedSkillRank,
    scalingContribution,
    strScalingContribution,
    hasPrimaryStrScaling,
    enchantmentPowerBonus: Math.floor(rarityDiff * 1.5),
    enchantmentHitBonus: -Math.floor(rarityDiff * 1.5),
    extraCritChance,
  });
}

function evaluateWeapon(config: WeaponConfig, stats: StatRecord, extraCritChance: number, traitIds: string[] = [], unarmed = false): WeaponLine {
  const result = evaluateWeaponSlot(config, stats, extraCritChance, traitIds, unarmed);
  return {
    power: result.power,
    swa: result.swa,
    hit: Number.parseInt(result.hit, 10),
    critical: Number.parseInt(result.crit, 10),
    criticalDamage: result.critDamageMod,
    weight: result.weight,
  };
}

export type OffenseResult = ReturnType<typeof resolveOffense>;

export function resolveOffense(inputs: EvaluationInputs, stats: StatsResult) {
  const { build, armorConditional, usingOffHand, equippedHands, talents, handsPoints, items, youkaiBonuses, offHandWeapon: offHandConfig, offHandItems, mainWeaponItems } = inputs;
  const { unarmed, unarmedBeside, unarmedTalents } = inputs;
  const { scaledStats, skills, fortune } = stats;

  const weaponConfig = build.equipment.primaryWeapon;
  const weaponBase = weaponConfig
    ? evaluateWeapon({ ...weaponConfig, twoHandedSkillRank: 0 }, scaledStats, armorConditional.critical, build.traits)
    : evaluateWeapon(unarmed.config, scaledStats, armorConditional.critical, build.traits, true);
  const unarmedPower = items.derived.unarmedPower ?? 0;

  const gripTypes = effectiveWeaponTypes(weaponConfig);
  const gripAllowed = !usingOffHand && !isShield(equippedHands?.itemName);
  const fullSwingRank = build.talents?.['two-hand/full-swing'] ?? weaponConfig?.twoHandedSkillRank ?? 0;
  const steadyRank = build.talents?.['two-hand/steady'] ?? weaponConfig?.twoHandedSkillRank ?? 0;
  const grip = { scaledWeaponAtk: 0, hit: 0 };
  if (weaponBase && gripAllowed) {
    if (gripTypes.some(type => ['Sword', 'Axe', 'Spear', 'Polearm'].includes(type)))
      grip.scaledWeaponAtk += fullSwingRank * 2 * (weaponBase.weight >= 20 ? 2 : 1);
    if (gripTypes.includes('Gun')) {
      const rifle = findWeaponByName(weaponConfig?.selectedWeaponName)?.subtype?.toLowerCase() === 'rifle';
      grip.hit += steadyRank * 2 * (rifle ? 2 : 1);
    }
  }

  const flanking = FLANKING_BASE + FLANKING_PER_GUI * scaledStats.gui;
  // Weapon Hit already includes 2x scaled SKI. Hand Hit is base per the Hit sheet; skill, item and Redtail Hit are capped bonus.
  const skiHit = Math.floor(scaledStats.ski * HIT_PER_SKI);
  const hitSources: DerivedSource[] = compactSources([
    { label: 'Scaled SKI', value: skiHit, channel: 'base', stat: 'ski' },
    { label: 'Weapon accuracy', value: (weaponBase?.hit ?? skiHit) - skiHit, channel: 'base' },
    { label: 'Hands upgrades', value: handsPoints.hit, channel: 'base' },
    { label: 'Skills', value: skills.derived.hit ?? 0, channel: 'bonus' },
    { label: 'Item effects', value: items.derived.hit ?? 0, channel: 'bonus' },
    { label: 'Redtail fortune', value: fortune.hit, channel: 'bonus' },
    { label: 'Talents', value: talents.hit + grip.hit, channel: 'bonus' },
  ]);
  const hitBonusSources = sumSources(hitSources, 'bonus');
  // The Hit workbook hard-codes the frontal (Smite) term at 15, i.e. rank 5; pass the build's real value instead.
  const attack = attackerHit({
    baseHit: sumSources(hitSources, 'base'),
    hitBuffs: hitBonusSources,
    honorHitBonus: talents.frontalHit,
    flanking,
  });

  // The wiki describes skill Power/Hit/Critical as weapon modifiers; added after evaluation so they skip scaling.
  const primaryWeapon: WeaponLine = {
    ...weaponBase,
    power: weaponBase.power + (skills.derived.power ?? 0) + (items.derived.power ?? 0) + youkaiBonuses.weaponPower + talents.power,
    // Full Swing and Tactics raise Scaled Weapon ATK, not the weapon's printed Power.
    swa: weaponBase.swa + (talents.scaledWeaponAtk + grip.scaledWeaponAtk) + (skills.derived.swa ?? 0)
      + (skills.derived.power ?? 0) + (items.derived.power ?? 0) + youkaiBonuses.weaponPower + talents.power,
    hit: Math.floor(attack.byTier.base),
    critical: weaponBase.critical + (skills.derived.critical ?? 0) + (items.derived.critical ?? 0) + fortune.critical + talents.critical,
    criticalDamage: weaponBase.criticalDamage + talents.criticalDamagePercent + (skills.derived.criticalDamage ?? 0),
    weight: Math.max(0, weaponBase.weight - talents.weaponWeightReduction),
    ...(!weaponConfig && unarmedPower ? { basicAttackPower: unarmedPower } : {}),
  };

  const secondaryLine = (base: WeaponLine, skill: Record<string, number>, item: (key: string) => number, talent: TalentEffects): WeaponLine => ({
    ...base,
    power: base.power + (skill.power ?? 0) + item('power') + youkaiBonuses.weaponPower + talent.power,
    swa: base.swa + talent.scaledWeaponAtk + (skill.swa ?? 0)
      + (skill.power ?? 0) + item('power') + youkaiBonuses.weaponPower + talent.power,
    hit: Math.floor(attackerHit({
      baseHit: base.hit,
      hitBuffs: (skill.hit ?? 0) + item('hit') + fortune.hit + talent.hit,
      honorHitBonus: talent.frontalHit,
      flanking,
    }).byTier.base),
    critical: base.critical + (skill.critical ?? 0) + item('critical') + fortune.critical + talent.critical,
    criticalDamage: base.criticalDamage + talent.criticalDamagePercent + (skill.criticalDamage ?? 0),
    weight: Math.max(0, base.weight - talent.weaponWeightReduction),
  });
  const heldWeaponItems = (key: string) => (items.derived[key] ?? 0) - (mainWeaponItems.derived[key] ?? 0);

  // The off-hand is its own weapon: general bonuses reach it, the main weapon's own effects don't.
  const offHandWeapon = offHandConfig
    ? secondaryLine(
      evaluateWeapon(offHandConfig, scaledStats, armorConditional.critical, build.traits),
      skills.derived,
      key => heldWeaponItems(key) + (offHandItems.derived[key] ?? 0),
      talents,
    )
    : undefined;

  const unarmedSkills = unarmedBeside && inputs.hasSkillRanks
    ? skillBonuses(inputs.availableSkills, inputs.mergedSkillRanks, build.skillConditionals, unarmed.types, { ...inputs.skillContext, scaledStats }).derived
    : {};
  const unarmedWeapon = unarmedBeside
    ? {
      ...secondaryLine(evaluateWeapon(unarmed.config, scaledStats, armorConditional.critical, build.traits, true), unarmedSkills, heldWeaponItems, unarmedTalents),
      ...(unarmedPower ? { basicAttackPower: unarmedPower } : {}),
    }
    : undefined;

  return { primaryWeapon, offHandWeapon, unarmedWeapon, hitSources, hitBonusSources, attack, flanking };
}
