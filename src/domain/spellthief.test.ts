import { describe, expect, it } from 'vitest';
import { buildReducer, createDefaultBuild } from '../aether/state/build';
import { createBuildFile, decodeSharePayload, encodeSharePayload, normalizeBuildState, parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import { skillById, skillPoolSpends } from './skills';
import { COPY_SPELL_IDS, changeCopySpell, copyCooldownLabel, copySpellCapacity, copySpellRank, normalizeSpellthiefState, settleSpellthief } from './spellthief';

const build = (rank = 5) => normalizeBuildState({ ...createDefaultBuild(), mainClass: 'Shapeshifter', subClass: 'Spellthief', skillRanks: { main: {}, sub: { 'spell-snatch': rank } } });

describe('Spellthief copies', () => {
  it('uses actual spell entries, excluding Youkai Evokes and non-spell skills', () => {
    for (const id of COPY_SPELL_IDS) expect(skillById(id), id).toBeDefined();
    const b = build();
    for (const id of ['chaos-onslaught', 'ice-jet', 'paraeta', 'burst-of-wind', 'haku', 'spell-snatch', 'dodger', 'unknown']) {
      expect(changeCopySpell(b, id, 'steal')).toBe(b);
    }
    expect(normalizeSpellthiefState({ cards: ['chaos-onslaught', 'ice-jet', 42, 'libegrande', 'libegrande'], equipped: ['chaos-onslaught', 'ice-jet', 'libegrande'] }, b))
      .toEqual({ cards: ['libegrande'], equipped: ['libegrande'] });
  });
  it('offers spells across classes, elements and roles, without a build-specific kit', () => {
    for (const id of ['phoenix', 'ring-of-pearls', 'water-wall', 'acid-rain', 'aero-of-kindness', 'sear', 'earthbound-fog', 'invigoration', 'fulgur-of-flight']) {
      expect(changeCopySpell(build(), id, 'steal').spellthief?.equipped).toEqual([id]);
    }
    // Previously included as a spell, but the source identifies it as a Spear skill.
    expect(changeCopySpell(build(), 'solar-lance', 'steal').spellthief?.equipped).toEqual([]);
  });
  it('gates copies by class, rank and legal Destiny pairing', () => {
    expect(copySpellCapacity(build(0))).toBe(0);
    expect(copySpellCapacity(build(1))).toBe(2);
    expect(copySpellCapacity(build(5))).toBe(6);
    expect(copySpellCapacity({ ...build(), subClass: 'Grand Summoner' })).toBe(0);
    expect(copySpellCapacity({ ...build(), destiny: true })).toBe(0);
    expect(changeCopySpell(build(0), 'blink', 'steal').spellthief?.equipped).toEqual([]);
  });
  it('replaces the oldest copy at capacity, retaining cards without duplicate copies', () => {
    let b = build(1);
    for (const id of ['blink', 'talvyd', 'kraken']) b = changeCopySpell(b, id, 'steal');
    expect(b.spellthief).toEqual({ cards: ['blink', 'talvyd', 'kraken'], equipped: ['talvyd', 'kraken'] });
    expect(changeCopySpell(b, 'talvyd', 'steal').spellthief).toEqual(b.spellthief);
    b = changeCopySpell(b, 'blink', 'prepare');
    expect(b.spellthief?.equipped).toEqual(['kraken', 'blink']);
  });
  it('stores, unprepares and removes cards independently from class skills', () => {
    let b = changeCopySpell(build(), 'blink', 'store');
    expect(b.spellthief?.equipped).toEqual([]);
    b = changeCopySpell(b, 'blink', 'prepare');
    b = changeCopySpell(b, 'blink', 'unprepare');
    expect(b.spellthief).toEqual({ cards: ['blink'], equipped: [] });
    b = changeCopySpell(b, 'blink', 'forget');
    expect(b.spellthief).toEqual({ cards: [], equipped: [] });
    expect(changeCopySpell(b, 'kraken', 'prepare')).toBe(b);
  });
  it('does not invent learned ranks, class spending or permanent buffs', () => {
    const b = build();
    const next = changeCopySpell(b, 'kraken', 'steal');
    expect(next.skillRanks).toEqual(b.skillRanks);
    expect(skillPoolSpends(next.mainClass, next.subClass, next.skillRanks, next.destiny))
      .toEqual(skillPoolSpends(b.mainClass, b.subClass, b.skillRanks, b.destiny));
    expect(evaluateBuild(next)).toEqual(evaluateBuild(b));
    expect(copySpellRank(next, 'kraken')).toBe(3);
    const mage = { ...b, mainClass: 'Mage', skillRanks: { main: { kraken: 2 }, sub: { 'spell-snatch': 5 } } };
    expect(copySpellRank(mage, 'kraken')).toBe(3);
    expect(copySpellRank({ ...mage, mainClass: 'Shapeshifter' }, 'kraken')).toBe(3);
    expect(copySpellRank({ ...b, mainClass: 'Rogue', destiny: true }, 'kraken')).toBe(3);
    expect(copySpellRank({ ...b, destiny: true }, 'kraken')).toBe(3);
    expect(copySpellRank(b, 'phoenix')).toBe(5);
    expect(copySpellRank(b, 'water-wall')).toBe(1);
    expect(copySpellRank(b, 'ice-jet')).toBe(0);
  });
  it('prunes prepared slots on rank/class changes, keeping the card collection', () => {
    let b = build();
    for (const id of ['blink', 'talvyd', 'kraken']) b = buildReducer(b, { type: 'copy-spell', id, action: 'steal' });
    b = buildReducer(b, { type: 'skill-rank', slot: 'sub', skillId: 'spell-snatch', rank: 1 });
    expect(b.spellthief?.equipped).toEqual(['talvyd', 'kraken']);
    b = buildReducer(b, { type: 'class', slot: 'sub', className: 'Grand Summoner' });
    expect(b.spellthief).toEqual({ cards: ['blink', 'talvyd', 'kraken'], equipped: [] });
    expect(buildReducer(build(), { type: 'skills-clear' }).spellthief?.equipped).toEqual([]);
  });
  it('round trips files and share links, including reserve cards and copy order', () => {
    let b = changeCopySpell(build(), 'blink', 'store');
    b = changeCopySpell(b, 'libegrande', 'steal');
    b = changeCopySpell(b, 'talvyd', 'steal');
    const file = createBuildFile('Spellthief', b);
    expect(parseBuildFile(JSON.stringify(file)).build).toEqual(b);
    expect(decodeSharePayload(encodeSharePayload('Spellthief', b)).build).toEqual(b);
    const { spellthief: _, ...old } = b;
    expect(normalizeBuildState(old).spellthief).toEqual({ cards: [], equipped: [] });
  });
  it('normalizes capacity on imported or replaced builds', () => {
    const b = build(1);
    b.spellthief = { cards: [], equipped: ['blink', 'talvyd', 'kraken'] };
    expect(settleSpellthief(b).spellthief?.equipped).toEqual(['talvyd', 'kraken']);
    expect(buildReducer(b, { type: 'replace', build: { ...b, subClass: 'Mage' } }).spellthief?.equipped).toEqual([]);
  });
  it('keeps longer or special cooldown restrictions while enforcing the copy minimum', () => {
    expect(copyCooldownLabel(null)).toBe('3 rounds');
    expect(copyCooldownLabel('1 Round')).toBe('3 rounds');
    expect(copyCooldownLabel('5 rounds')).toBe('5 rounds');
    expect(copyCooldownLabel('Once per battle')).toBe('Once per battle; at least 3 rounds');
  });
});
