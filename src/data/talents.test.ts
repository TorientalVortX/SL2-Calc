import { describe, expect, it } from 'vitest';
import {
  TALENTS,
  TALENT_BUDGET,
  TALENT_CATEGORIES,
  TALENT_PROVENANCE,
  subtalentById,
  talentById,
  talentModifiers,
  talentSpending,
  talentStatTotals,
  talentsAllowWeapon,
  weaponRarityUnlocks,
} from './talents';

describe('talent catalog', () => {
  it('carries the full scraped catalog with provenance', () => {
    // 40 talents in 6 categories as of the 2026-08-31 scrape; the floor guards
    // against the parser silently dropping a section of the hub page.
    expect(TALENTS.length).toBeGreaterThanOrEqual(40);
    expect(TALENT_CATEGORIES.length).toBe(6);
    expect(TALENTS.flatMap(talent => talent.subtalents).length).toBeGreaterThanOrEqual(135);
    expect(TALENT_PROVENANCE.source).toContain('sl2.miraheze.org');
    expect(TALENT_PROVENANCE.confidence).toBe('community');
  });

  it('states the talent budget the wiki gives in prose', () => {
    expect(TALENT_BUDGET).toEqual({ pointsFromLevels: 60, legendExtensionPoints: 5, maxRanksPerTalent: 10 });
  });

  it('keeps every talent costed', () => {
    for (const talent of TALENTS) {
      expect(talent.spPerRank, talent.name).toBeGreaterThan(0);
      expect(talent.maxSp, talent.name).toBeCloseTo(talent.spPerRank * talent.maxRanks, 5);
      expect(talent.subtalents.length, talent.name).toBeGreaterThan(0);
    }
  });
});

describe('weapon access', () => {
  it('reads an Adaptation rank as a rarity cap for its weapon type', () => {
    const adaptation = subtalentById('blade-expertise/adaptation');
    expect(adaptation?.weaponAccess).toEqual({ weaponType: 'Sword', rarityPerRank: 2 });
    expect(weaponRarityUnlocks({ 'blade-expertise/adaptation': 3 })).toEqual({ Sword: 6 });
  });

  it('covers each weapon type the game gates behind a class roster', () => {
    const full = Object.fromEntries(
      TALENTS.flatMap(talent => talent.subtalents)
        .filter(sub => sub.weaponAccess)
        .map(sub => [sub.id, sub.maxSr]),
    );
    expect(weaponRarityUnlocks(full)).toEqual({
      Sword: 10, Axe: 10, Polearm: 10, Bow: 10, Fist: 10, Gun: 10, Tome: 10,
    });
  });

  it('clamps an over-invested rank to the subtalent cap', () => {
    expect(weaponRarityUnlocks({ 'marksmanship/adaptation': 99 })).toEqual({ Gun: 10 });
    expect(talentsAllowWeapon('Gun', 10, { 'marksmanship/adaptation': 99 })).toBe(true);
  });

  it('answers only for what talents grant, not what a class already allows', () => {
    const allocation = { 'archery/adaptation': 2 };
    expect(talentsAllowWeapon('Bow', 4, allocation)).toBe(true);
    expect(talentsAllowWeapon('Bow', 5, allocation)).toBe(false);
    expect(talentsAllowWeapon('Sword', 1, allocation)).toBe(false);
    expect(talentsAllowWeapon(null, 1, allocation)).toBe(false);
  });
});

describe('talent modifiers', () => {
  it('scales a hit bonus by rank and scopes it to its weapon types', () => {
    const allocation = { 'blade-expertise/reliability': 4 };
    expect(talentStatTotals(allocation, { weaponType: 'Sword' }).flat.hit).toBe(6);
    expect(talentStatTotals(allocation, { weaponType: 'Dagger' }).flat.hit).toBe(6);
    // Scoped to blades, so an axe build gets nothing from it.
    expect(talentStatTotals(allocation, { weaponType: 'Axe' }).flat.hit).toBeUndefined();
    // And with no weapon named, only unscoped modifiers count.
    expect(talentStatTotals(allocation).flat.hit).toBeUndefined();
  });

  it('signs reductions negative and keeps percentages apart from flat points', () => {
    const totals = talentStatTotals({ 'blade-expertise/reliability': 5, 'blade-expertise/balance': 5 }, { weaponType: 'Sword' });
    expect(totals.flat.hit).toBe(7.5);
    expect(totals.flat.battleWeight).toBe(-7.5);
    expect(totals.percent.durabilityConsumption).toBe(-25);
  });

  it('reads focus bonuses off the Capacity talent', () => {
    const totals = talentStatTotals({ 'capacity/depth': 5, 'capacity/absorption': 3 });
    expect(totals.flat.maxFp).toBe(25);
    expect(totals.flat.fpRegen).toBe(3);
    expect(talentStatTotals({ 'pyromancy/efficiency': 5 }).percent.fpCost).toBe(-15);
  });

  it('withholds conditional bonuses unless they are asked for', () => {
    // Smite only counts when attacking an enemy from the front.
    const allocation = { 'chivalry/smite': 5 };
    expect(talentStatTotals(allocation).flat.hit).toBeUndefined();
    expect(talentStatTotals(allocation, { includeConditional: true }).flat.hit).toBe(15);
  });

  it('excludes effects that land on the target rather than the character', () => {
    // Dizzy drains the enemy's FP; it must never read as the build's own FP.
    const applied = talentModifiers({ 'unarmed-combat/dizzy': 5 }, { weaponType: 'Fist', includeConditional: true });
    expect(applied).toEqual([]);
    expect(subtalentById('unarmed-combat/dizzy')?.modifiers[0].appliesTo).toBe('enemy');
  });

  it('reports every modifier with the subtalent it came from', () => {
    const applied = talentModifiers({ 'capacity/depth': 2 });
    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({ stat: 'maxFp', rank: 2, total: 10, perRank: 5 });
    expect(applied[0].talent.name).toBe('Capacity');
    expect(applied[0].subtalent.name).toBe('Depth');
  });
});

describe('talent spending', () => {
  it('bills subpoints at the parent talent rate', () => {
    const { perTalent, totalRanks, totalSp } = talentSpending({
      'blade-expertise/reliability': 5,
      'blade-expertise/balance': 5,
      'capacity/depth': 5,
    });
    // Fifteen ranks against the point budget; 10 blade subpoints at 1.5 SP and
    // 5 Capacity subpoints at 1 SP against the bill. The two units differ.
    expect(totalRanks).toBe(15);
    expect(totalSp).toBe(20);
    expect(perTalent.find(entry => entry.talent.id === 'blade-expertise')).toMatchObject({ ranks: 10, sp: 15, overAllocated: false });
    expect(perTalent.find(entry => entry.talent.id === 'capacity')).toMatchObject({ ranks: 5, sp: 5 });
  });

  it('flags a talent pushed past its rank cap instead of trimming it', () => {
    const { perTalent } = talentSpending({
      'blade-expertise/reliability': 5,
      'blade-expertise/balance': 5,
      'blade-expertise/adaptation': 5,
    });
    expect(perTalent[0]).toMatchObject({ ranks: 15, overAllocated: true });
  });

  it('ignores ids the catalog does not know', () => {
    expect(talentSpending({ 'not-a-talent/nope': 5 })).toEqual({ perTalent: [], totalRanks: 0, totalSp: 0 });
    expect(talentById('not-a-talent')).toBeUndefined();
  });
});
