import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild, metricValue } from './buildEvaluation';
import { metricKeys } from '../optimizerMetrics';
import { SUBRACES } from '../data/races';
import { ARMORS } from '../data/armors';
import { HISTORY } from '../data/bonuses';
import { findWeaponByName, weaponToConfig } from './equipment';

/**
 * The fixture with a weapon in hand.
 *
 * `baseBuild` goes through the legacy-payload branch of `parseBuildFile`, which
 * hardcodes empty equipment: correct, since v0.5 files predate it, but it means
 * any assertion about `primaryWeapon` is vacuous unless the weapon is added here.
 */
function armedBuild() {
  const build = baseBuild();
  build.equipment.primaryWeapon = weaponToConfig(findWeaponByName('Longsword')!);
  return build;
}

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
    /*
     * Dragon King's Armor is one piece of the Dragon King set, which is now
     * counted from the loadout rather than from a number typed into Advanced.
     * Equipping it therefore adds its +3 raw STR on its own; before, the armour
     * contributed nothing at all unless the count was also filled in by hand.
     */
    const bare = evaluateBuild({ ...build, equipment: { ...build.equipment, armorName: null } });
    expect(result.rawStats.str - bare.rawStats.str).toBe(3);
    expect(result.scaledStats.str).toBeGreaterThan(result.rawStats.str - 6);
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
        armorUpgradePoints: { armor: 2, magicArmor: 1, evade: 3 },
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
      equipment: { ...build.equipment, armorUpgradePoints: { armor: 0, magicArmor: 0, evade: 0 } },
    });
    expect(explicitNone.derived).toEqual(legacy.derived);
  });

  it('applies enabled UL-scaled armor conditionals at the armor spend', () => {
    const build = baseBuild();
    build.equipment.armorName = 'In-Fighter Gi';
    // UL 9 across the three torso channels; the effect scales at UL/2, so 4.
    build.equipment.armorUpgradePoints = { armor: 2, magicArmor: 3, evade: 4 };
    const baseline = evaluateBuild(build);
    build.equipment.armorConditionalBonuses['In-Fighter Gi:0'] = true;
    const active = evaluateBuild(build);
    expect(active.derived.evade - baseline.derived.evade).toBe(9);
    expect(active.derived.armorEvade - baseline.derived.armorEvade).toBe(9);
  });

  it('applies every channel of a shared conditional armor magnitude once', () => {
    const build = baseBuild();
    build.equipment.armorName = 'Mermanmail';
    const baseline = evaluateBuild(build);
    build.equipment.armorConditionalBonuses['Mermanmail:1'] = true;
    const active = evaluateBuild(build);
    expect(active.derived.evade - baseline.derived.evade).toBe(5);
    expect(active.derived.armor - baseline.derived.armor).toBe(5);
  });
});

describe('post-softcap stat buffs', () => {
  /*
   * `customStats` is spent before diminishing returns, so a build parked past
   * its softcap keeps only a fraction of it. That is right for a stat an item
   * grants and wrong for a buff. There was no channel that behaved like a status
   * effect, so builds around borrowed stats could not be measured at all.
   */
  it('lands whole, where the pre-softcap channel does not', () => {
    const past = baseBuild();
    // Far enough past the softcap that a point buys well under a whole point.
    past.addedStats.san = 60;

    const plain = evaluateBuild(past);
    const buffed = evaluateBuild({ ...past, statBuffs: { ...past.customStats, san: 10 } });
    const custom = evaluateBuild({ ...past, customStats: { ...past.customStats, san: 10 } });

    expect(buffed.scaledStats.san - plain.scaledStats.san).toBe(10);
    expect(custom.scaledStats.san - plain.scaledStats.san).toBeLessThan(10);
  });

  it('raises the raw line by the same amount', () => {
    const build = baseBuild();
    const plain = evaluateBuild(build);
    const buffed = evaluateBuild({ ...build, statBuffs: { ...build.customStats, cel: 7 } });
    expect(buffed.rawStats.cel - plain.rawStats.cel).toBe(7);
  });

  /*
   * Bonus APT raises the stat but must not push the "+1 to everything per 6 APT"
   * threshold: the same rule the evaluation already applies to APT from a trait
   * or a piece of equipment.
   */
  it('does not let buffed APT buy the aptitude threshold', () => {
    const build = baseBuild();
    const plain = evaluateBuild(build);
    const buffed = evaluateBuild({ ...build, statBuffs: { ...build.customStats, apt: 24 } });

    expect(buffed.scaledStats.apt - plain.scaledStats.apt).toBe(24);
    expect(buffed.scaledStats.str).toBe(plain.scaledStats.str);
  });

  it('flows into everything that reads the stat line', () => {
    const build = baseBuild();
    const plain = evaluateBuild(build);
    const buffed = evaluateBuild({ ...build, statBuffs: { ...build.customStats, vit: 10 } });
    // 10 HP per scaled VIT.
    expect(buffed.derived.maxHP - plain.derived.maxHP).toBe(100);
  });

  it('is absent on builds saved before the channel existed', () => {
    const build = baseBuild();
    expect(evaluateBuild({ ...build, statBuffs: undefined })).toEqual(evaluateBuild(build));
  });
});

describe('Evade base and bonus channels', () => {
  /*
   * The community Evade page names Sarashi Gi's +12 as a passive Evade buff that
   * "counts toward the +50 cap", and Dodger / Equipment Extras as base Evade that
   * does not. Every source used to land in one uncapped sum, so a build could
   * report Evade no character can reach.
   */
  function gi(bonusEvade: number) {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    build.equipment.armorConditionalBonuses = { dualWielding: true };
    build.bonusEvade = bonusEvade;
    return evaluateBuild(build);
  }

  it('caps the two bonus sources together rather than each alone', () => {
    const result = gi(45);
    // 45 manual + 12 from the Gi is 57 bought, 50 allowed.
    expect(result.derived.evadeBonus).toBe(50);
    expect(result.derived.evadeBonusWasted).toBe(7);
  });

  it('leaves the bonus channel alone below the cap', () => {
    const result = gi(10);
    expect(result.derived.evadeBonus).toBe(22);
    expect(result.derived.evadeBonusWasted).toBe(0);
  });

  it('reports a total that is exactly base plus the capped bonus', () => {
    const result = gi(45);
    expect(result.derived.evade).toBe(result.derived.evadeBase + result.derived.evadeBonus);
  });

  it('does not let the bonus cap touch base Evade', () => {
    const build = baseBuild();
    build.baseEvade = 400;
    const result = evaluateBuild(build);
    expect(result.derived.evadeBase).toBeGreaterThan(400);
    expect(result.derived.evade).toBe(result.derived.evadeBase);
  });

  it('keeps CEL in the uncapped channel', () => {
    const low = baseBuild();
    const high = baseBuild();
    high.addedStats.cel = 20;
    const gain = evaluateBuild(high).derived.evadeBase - evaluateBuild(low).derived.evadeBase;
    expect(gain).toBeGreaterThan(0);
    expect(evaluateBuild(high).derived.evadeBonus).toBe(evaluateBuild(low).derived.evadeBonus);
  });
});

describe('Hit tiers', () => {
  function armed() {
    const build = baseBuild();
    build.addedStats.ski = 20;
    build.addedStats.gui = 20;
    return evaluateBuild(build);
  }

  /** The same build, with Chivalry's Smite bought to the given rank. */
  function smiting(rank: number) {
    const build = baseBuild();
    build.addedStats.ski = 20;
    build.addedStats.gui = 20;
    build.talents = { 'chivalry/smite': rank };
    return evaluateBuild(build).derived;
  }

  /*
   * Flanking was computed, displayed and scored as a metric, but nothing ever
   * converted it into Hit, so the GUI behind it had no modelled consequence.
   */
  it('turns the Flanking stat into Hit at half per condition', () => {
    const result = armed();
    const flanking = result.derived.flanking;
    expect(result.derived.hitTiers.flank1 - result.derived.hitTiers.base)
      .toBe(Math.floor(result.derived.hitTiers.base + flanking * 0.5) - result.derived.hitTiers.base);
    expect(result.derived.hitTiers.flank2 - result.derived.hitTiers.base)
      .toBeGreaterThan(result.derived.hitTiers.flank1 - result.derived.hitTiers.base);
  });

  it('scales flanking Hit with GUI', () => {
    const low = baseBuild();
    const high = baseBuild();
    high.addedStats.gui = 40;
    const lowGain = evaluateBuild(low).derived.hitTiers.flank2 - evaluateBuild(low).derived.hitTiers.base;
    const highGain = evaluateBuild(high).derived.hitTiers.flank2 - evaluateBuild(high).derived.hitTiers.base;
    expect(highGain).toBeGreaterThan(lowGain);
  });

  /*
   * Armed deliberately. `baseBuild` parses a legacy payload, and that path drops
   * equipment entirely, so this assertion behind an `if (result.primaryWeapon)`
   * never ran, and neither did the SWA-versus-Power one below it.
   */
  it('reports the base tier as the weapon Hit figure', () => {
    const result = evaluateBuild(armedBuild());
    expect(result.primaryWeapon).toBeDefined();
    expect(result.derived.hitTiers.base).toBe(result.primaryWeapon?.hit);
  });

  /*
   * The workbook's flat "Honor Hit bonus (max SR) 15" is Chivalry's Smite at
   * rank 5: 3 Hit a rank, gated on attacking from the target's front. It was
   * hard-coded because the wiki had not documented talents yet, which meant
   * every build got it whether or not it had bought the talent, and a build
   * that had bought it collected the same bonus twice.
   */
  it('gives no frontal bonus to a build without the talent that grants it', () => {
    expect(armed().derived.frontalHitBonus).toBe(0);
    expect(armed().derived.honorHeadroom).toBe(0);
    expect(armed().derived.hitTiers.front).toBe(armed().derived.hitTiers.base);
  });

  it('pays the frontal bonus from the actual Smite rank', () => {
    expect(smiting(5).frontalHitBonus).toBe(15);
    expect(smiting(5).hitTiers.front - smiting(5).hitTiers.base).toBe(15);
    expect(smiting(2).frontalHitBonus).toBe(6);
    expect(smiting(2).hitTiers.front - smiting(2).hitTiers.base).toBe(6);
  });

  it('keeps the frontal bonus off every tier the target is not being faced from', () => {
    const bare = armed().derived;
    const withSmite = smiting(5);
    // Base and both flanked tiers are positions Smite does not cover, so the
    // frontal tier is the only one that may move, and the general bonus
    // channel, which feeds all four, must not see it at all.
    expect(withSmite.hitTiers.base).toBe(bare.hitTiers.base);
    expect(withSmite.hitTiers.flank1).toBe(bare.hitTiers.flank1);
    expect(withSmite.hitTiers.flank2).toBe(bare.hitTiers.flank2);
    expect(withSmite.hitBonusSources).toBe(bare.hitBonusSources);
  });
});

describe('metric resolution', () => {
  /*
   * `derived` stopped being uniformly numeric when `hitTiers` was added, so the
   * `metricValue` fallback now type-checks rather than trusting the index. This
   * pins that every metric the optimizer can be given still resolves to a real
   * number: a metric that silently returned 0 would read as a build scoring
   * nothing on it rather than as a wiring mistake.
   */
  it('resolves every optimization metric to a finite number', () => {
    const evaluation = evaluateBuild(baseBuild());
    for (const metric of metricKeys) {
      const value = metricValue(evaluation, metric);
      expect(Number.isFinite(value), `${metric} did not resolve to a number`).toBe(true);
    }
  });

  it('resolves the SWA metric to the weapon SWA, distinct from Power', () => {
    const evaluation = evaluateBuild(armedBuild());
    expect(evaluation.primaryWeapon).toBeDefined();
    expect(metricValue(evaluation, 'weaponSwa')).toBe(evaluation.primaryWeapon?.swa);
    expect(metricValue(evaluation, 'weaponPower')).toBe(evaluation.primaryWeapon?.power);
    // The point of the split: with stat scaling in play they cannot be equal.
    expect(metricValue(evaluation, 'weaponSwa')).toBeGreaterThan(metricValue(evaluation, 'weaponPower'));
  });
});

describe('itemised Hit and Evade sources', () => {
  /*
   * The property that makes a breakdown trustworthy: the named parts add up to
   * the figure being explained. A breakdown that nearly reconciles is worse than
   * none, because it invites the reader to trust it.
   */
  function reconciles(build: ReturnType<typeof baseBuild>) {
    const evaluation = evaluateBuild(build);
    const sum = (channel: 'base' | 'bonus', key: 'hit' | 'evade') => evaluation.sources[key]
      .filter(source => source.channel === channel)
      .reduce((total, source) => total + source.value, 0);
    return { evaluation, sum };
  }

  it('reconciles the Evade channels with the reported figures', () => {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    build.equipment.armorConditionalBonuses = { dualWielding: true };
    build.addedStats.cel = 25;
    build.bonusEvade = 8;
    const { evaluation, sum } = reconciles(build);

    expect(sum('base', 'evade')).toBe(evaluation.derived.evadeBase);
    expect(sum('bonus', 'evade')).toBe(evaluation.derived.evadeBonus);
    expect(evaluation.derived.evade).toBe(evaluation.derived.evadeBase + evaluation.derived.evadeBonus);
  });

  it('reconciles the Hit channels with the reported figures', () => {
    const build = baseBuild();
    build.addedStats.ski = 30;
    const { evaluation, sum } = reconciles(build);

    expect(sum('base', 'evade') + sum('bonus', 'evade')).toBe(evaluation.derived.evade);
    expect(sum('base', 'hit')).toBe(evaluation.derived.hitBase);
    expect(sum('bonus', 'hit')).toBe(evaluation.derived.hitBonusSources);
  });

  /*
   * When the cap bites, the bonus sources deliberately over-sum the applied
   * figure; that difference is the whole point of showing them.
   */
  it('lets the bonus list exceed what the cap applies', () => {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    build.equipment.armorConditionalBonuses = { dualWielding: true };
    build.bonusEvade = 45;
    const { evaluation, sum } = reconciles(build);

    expect(sum('bonus', 'evade')).toBe(57);
    expect(evaluation.derived.evadeBonus).toBe(50);
    expect(evaluation.derived.evadeBonusWasted).toBe(7);
  });

  it('names SKI and the weapon separately without double-counting it', () => {
    const build = baseBuild();
    build.addedStats.ski = 30;
    const evaluation = evaluateBuild(build);
    const ski = evaluation.sources.hit.find(source => source.stat === 'ski');

    expect(ski?.value).toBe(Math.floor(evaluation.scaledStats.ski * 2));
    expect(evaluation.derived.hitBase).toBe(
      evaluation.sources.hit.filter(s => s.channel === 'base').reduce((t, s) => t + s.value, 0),
    );
  });

  it('omits the sources a build does not have', () => {
    const evaluation = evaluateBuild(baseBuild());
    expect(evaluation.sources.evade.every(source => source.value !== 0)).toBe(true);
    expect(evaluation.sources.hit.every(source => source.value !== 0)).toBe(true);
  });

  it('reports the Giant Gene penalty as a negative base source', () => {
    const build = baseBuild();
    build.giantGene = true;
    const gene = evaluateBuild(build).sources.evade.find(source => source.label === 'Giant Gene');
    expect(gene?.value).toBe(-10);
    expect(gene?.channel).toBe('base');
  });
});

describe('armorEvade is a diagnostic, not a model input', () => {
  /*
   * `armorEvade` deliberately mixes channels: it answers "what is the equipment
   * worth". Feeding it back in as *base* Evade smuggles conditional and item
   * effects past the +50 bonus cap, which is exactly what the Hit-chance screen
   * did when it seeded its mirrored target from the wrong field.
   */
  function withConditionalGi() {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    build.equipment.armorConditionalBonuses = { dualWielding: true };
    return evaluateBuild(build);
  }

  it('keeps the conditional effect out of the base-only figure', () => {
    const result = withConditionalGi();
    expect(result.derived.armorEvade).toBeGreaterThan(result.derived.armorEvadeBase);
    expect(result.derived.armorEvade - result.derived.armorEvadeBase).toBe(12);
  });

  it('reports a base figure that is genuinely in the base channel', () => {
    const result = withConditionalGi();
    const torsoBase = result.sources.evade
      .filter(source => source.channel === 'base' && source.label !== 'Scaled CEL')
      .reduce((total, source) => total + source.value, 0);
    expect(result.derived.armorEvadeBase).toBe(torsoBase);
  });

  it('agrees with armorEvade when nothing conditional is switched on', () => {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    const result = evaluateBuild(build);
    expect(result.derived.armorEvadeBase).toBe(result.derived.armorEvade);
  });
});

describe('torso quality tags in the evaluation', () => {
  function withQuality(quality: Partial<Record<string, boolean>>) {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    const plain = evaluateBuild(build);
    const tagged = evaluateBuild({
      ...build,
      equipment: {
        ...build.equipment,
        armorQuality: { solid: false, polished: false, goodFit: false, lightweight: false, heavy: false, ...quality },
      },
    });
    return { plain, tagged };
  }

  it('adds Solid to Armor and Polished to Magic Armor', () => {
    const { plain, tagged } = withQuality({ solid: true, polished: true });
    expect(tagged.derived.armor - plain.derived.armor).toBe(2);
    expect(tagged.derived.magicArmor - plain.derived.magicArmor).toBe(2);
  });

  /*
   * Good Fit is part of the torso's own statline, so it lands in the uncapped base
   * channel rather than competing with buffs for the +50 bonus ceiling.
   */
  it('puts Good Fit in the uncapped Evade channel', () => {
    const { plain, tagged } = withQuality({ goodFit: true });
    expect(tagged.derived.evadeBase - plain.derived.evadeBase).toBe(4);
    expect(tagged.derived.evadeBonus).toBe(plain.derived.evadeBonus);
    expect(tagged.sources.evade.find(source => source.label === 'Torso quality')?.value).toBe(4);
  });

  it('moves torso weight both ways', () => {
    expect(withQuality({ lightweight: true }).tagged.derived.armorWeight)
      .toBe(withQuality({}).plain.derived.armorWeight - 2);
    expect(withQuality({ heavy: true }).tagged.derived.armorWeight)
      .toBe(withQuality({}).plain.derived.armorWeight + 2);
  });

  it('cancels the weight pair', () => {
    const { plain, tagged } = withQuality({ lightweight: true, heavy: true });
    expect(tagged.derived.armorWeight).toBe(plain.derived.armorWeight);
  });

  it('reaches the torso-only Evade figures', () => {
    const { plain, tagged } = withQuality({ goodFit: true });
    expect(tagged.derived.armorEvade - plain.derived.armorEvade).toBe(4);
    expect(tagged.derived.armorEvadeBase - plain.derived.armorEvadeBase).toBe(4);
  });

  it('changes nothing on a build that carries no tags', () => {
    const build = baseBuild();
    build.equipment.armorName = 'Sarashi Gi';
    const untagged = evaluateBuild(build);
    const explicit = evaluateBuild({
      ...build,
      equipment: { ...build.equipment, armorQuality: { solid: false, polished: false, goodFit: false, lightweight: false, heavy: false } },
    });
    expect(explicit.derived).toEqual(untagged.derived);
  });
});
