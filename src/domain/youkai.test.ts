import { describe, expect, it } from 'vitest';
import { parseBuildFile } from './buildPersistence';
import { evaluateBuild } from './buildEvaluation';
import {
  INSTALL_PRESERVED_STATS,
  YOUKAI,
  affinityRank,
  canInstall,
  evokedSlots,
  grantedYoukaiSkills,
  installedBaseStats,
  conflictingYoukaiFamilies,
  contractYoukai,
  normalizeYoukaiState,
  youkaiById,
  youkaiRaceBaseStats,
  youkaiStats,
} from './youkai';
import { evaluateYoukaiRosterFit, missingYoukaiOptimizationProfiles, youkaiNumericBonuses } from './youkaiOptimization';
import { findWeaponByName, weaponToConfig } from './equipment';

function summonerBuild() {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Summoner fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Summoner', subClass: 'Mage', characterLevel: 10, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

describe('youkai dataset', () => {
  it('gives every youkai three slotted skills in hierarchy order', () => {
    expect(YOUKAI).toHaveLength(35);
    for (const youkai of YOUKAI) {
      expect(youkai.skills.map(skill => skill.slot)).toEqual(['evoke-active', 'evoke-passive', 'main']);
      // The Evoke-Active is always a usable skill and the Evoke-Passive always a passive.
      expect(youkai.skills[0].passive).toBe(false);
      expect(youkai.skills[1].passive).toBe(true);
    }
  });

  it('carries the wiki values for a representative youkai', () => {
    const byakko = youkaiById('byakko')!;
    expect(byakko.race).toBe('Beast');
    // Level 60 line from the wiki's Beast Youkai table.
    expect(byakko.stats.str).toBe(56);
    expect(byakko.stats.luc).toBe(43);
    // "Cost: 4-28 FP / 3M" resolves to the level 60 end of the range.
    expect(byakko.skills[0]).toMatchObject({ name: 'Thunder Claw', fp: 28, momentum: 3 });
    expect(byakko.skills[2]).toMatchObject({ name: 'Roar', fp: 15 });
  });

  it('links every ascended form to a valid same-race base contract', () => {
    const ascended = YOUKAI.filter(youkai => youkai.baseFormId);
    expect(ascended.map(youkai => youkai.id).sort()).toEqual([
      'byakko-ascended', 'genbu-ascended', 'seiryuu-ascended', 'suzaku-ascended',
    ]);
    for (const youkai of ascended) expect(youkaiById(youkai.baseFormId)?.race).toBe(youkai.race);
  });

  it('has optimization metadata for every Youkai kit', () => {
    expect(missingYoukaiOptimizationProfiles()).toEqual([]);
  });
});

describe('contract families', () => {
  it('keeps the ascended form regardless of input order and transfers Install', () => {
    expect(normalizeYoukaiState({ contracted: ['byakko-ascended', 'byakko'], installed: 'byakko' }))
      .toEqual({ contracted: ['byakko-ascended'], installed: 'byakko-ascended' });
    expect(normalizeYoukaiState({ contracted: ['byakko', 'byakko-ascended'], installed: 'byakko' }))
      .toEqual({ contracted: ['byakko-ascended'], installed: 'byakko-ascended' });
    expect(conflictingYoukaiFamilies({ contracted: ['byakko', 'byakko-ascended'], installed: null })).toEqual(['byakko']);
  });

  it('upgrades a contract without spending another slot and never downgrades it', () => {
    const upgraded = contractYoukai({ contracted: ['byakko'], installed: 'byakko' }, 'byakko-ascended');
    expect(upgraded).toEqual({ contracted: ['byakko-ascended'], installed: 'byakko-ascended' });
    expect(contractYoukai(upgraded, 'byakko')).toEqual(upgraded);
  });
});

describe('youkai optimization effects', () => {
  it('gates actives and passives at the real Sync-Mind ranks', () => {
    const build = summonerBuild();
    build.youkai = { contracted: ['sazae-oni'], installed: null };
    build.skillRanks = { main: { 'sync-mind': 1 }, sub: {} };
    expect(youkaiNumericBonuses(build).stats.ski).toBeUndefined();
    build.skillRanks.main['sync-mind'] = 2;
    expect(youkaiNumericBonuses(build).stats.ski).toBe(2);
  });

  it('grants physical resistance from an Installed Youkai', () => {
    /*
     * Tough Fur is a `main` skill, so it reaches the Summoner only through
     * Install, and it trades: +25% Slash for -25% Water.
     */
    const build = summonerBuild();
    build.youkai = { contracted: ['kilkenny'], installed: null };
    expect(youkaiNumericBonuses(build).physicalResistance.Slash).toBeUndefined();

    build.youkai = { contracted: ['kilkenny'], installed: 'kilkenny' };
    const bonuses = youkaiNumericBonuses(build);
    expect(bonuses.physicalResistance.Slash).toBe(25);
    expect(bonuses.elementalResistance.Water).toBe(-25);
  });

  it('takes the non-self figure for an Install that is stronger on the Youkai itself', () => {
    /*
     * Drowned Woman grants "50% Slash, Blunt, and Pierce resistance … (Only 25%
     * for non-Drowned Woman units)". An Installed Summoner is never a Drowned
     * Woman, so 25% is the figure that applies to any build here.
     */
    const build = summonerBuild();
    build.youkai = { contracted: ['drowned-woman'], installed: 'drowned-woman' };
    const bonuses = youkaiNumericBonuses(build);
    expect(bonuses.physicalResistance).toMatchObject({ Slash: 25, Blunt: 25, Pierce: 25 });
    expect(bonuses.elementalResistance.Dark).toBe(-25);
  });

  it('applies Fist-only Talon Claw and does not invent the bonus for another weapon', () => {
    const build = summonerBuild();
    build.youkai = { contracted: ['hippogriph'], installed: null };
    build.skillRanks = { main: { 'sync-mind': 2 }, sub: {} };
    build.equipment.primaryWeapon = weaponToConfig(findWeaponByName("Brawler's Glove")!);
    expect(youkaiNumericBonuses(build).weaponPower).toBe(5);
    build.equipment.primaryWeapon = weaponToConfig(findWeaponByName('Spine Leash')!);
    expect(youkaiNumericBonuses(build).weaponPower).toBe(0);
  });

  it('does not stack ordinary duplicate passives but does stack Fairy Ring', () => {
    const build = summonerBuild();
    build.skillRanks = { main: { 'sync-mind': 2 }, sub: {} };
    build.youkai = { contracted: ['lilu', 'orbello', 'asrai', 'izabe'], installed: null };
    const bonuses = youkaiNumericBonuses(build);
    expect(bonuses.stats.def).toBe(2);
    expect(bonuses.stats.res).toBe(2);
    expect(bonuses.derived.luckStatusPercent).toBe(20);
  });

  it('requires evidence for situational skills', () => {
    const build = summonerBuild();
    build.youkai = { contracted: ['hippogriph'], installed: null };
    build.skillRanks = { main: { 'sync-mind': 2 }, sub: {} };
    const none = evaluateYoukaiRosterFit(build, {}, new Set());
    expect(none.reasons.get('hippogriph')).toBeUndefined();
    build.equipment.primaryWeapon = weaponToConfig(findWeaponByName("Brawler's Glove")!);
    const fist = evaluateYoukaiRosterFit(build, {}, new Set());
    expect(fist.reasons.get('hippogriph')?.some(reason => reason.skillName === 'Talon Claw')).toBe(true);
  });
});

describe('affinity growth', () => {
  it('adds its rank to every stat the youkai has, leaving zeroes alone', () => {
    const byakko = youkaiById('byakko')!;
    const stats = youkaiStats(byakko, { 'affinity-beast': 3 });
    expect(stats.str).toBe(59);
    expect(stats.luc).toBe(46);
    // Byakko has no FAI aptitude; a zero stays zero rather than being lifted.
    expect(stats.fai).toBe(0);
  });

  it('ignores the affinity for a different race', () => {
    const byakko = youkaiById('byakko')!;
    expect(youkaiStats(byakko, { 'affinity-avian': 5 }).str).toBe(byakko.stats.str);
  });

  it('caps growth at +1 while installed', () => {
    expect(affinityRank('Beast', { 'affinity-beast': 5 })).toBe(5);
    expect(affinityRank('Beast', { 'affinity-beast': 5 }, true)).toBe(1);
  });
});

describe('sync-mind', () => {
  it('lends the evoke slots by rank', () => {
    expect(evokedSlots(0)).toEqual([]);
    expect(evokedSlots(1)).toEqual(['evoke-active']);
    expect(evokedSlots(2)).toEqual(['evoke-active', 'evoke-passive']);
  });

  it('grants the first two skills of every contract at max rank, but never the main skill', () => {
    const state = { contracted: ['byakko', 'apus'], installed: null };
    const granted = grantedYoukaiSkills(state, { 'sync-mind': 2 });
    expect(granted).toHaveLength(4);
    expect(granted.every(skill => skill.via === 'sync-mind')).toBe(true);
    expect(granted.some(skill => skill.slot === 'main')).toBe(false);
    expect(granted.filter(skill => skill.youkaiId === 'byakko').map(s => s.name))
      .toEqual(['Thunder Claw', 'Seal of the West']);
  });

  it('grants only the evoke-active at rank 1', () => {
    const granted = grantedYoukaiSkills({ contracted: ['byakko'], installed: null }, { 'sync-mind': 1 });
    expect(granted.map(skill => skill.slot)).toEqual(['evoke-active']);
  });

  it('grants nothing without sync-mind or a contract', () => {
    expect(grantedYoukaiSkills({ contracted: ['byakko'], installed: null }, {})).toEqual([]);
    expect(grantedYoukaiSkills({ contracted: [], installed: null }, { 'sync-mind': 2 })).toEqual([]);
  });
});

describe('install', () => {
  it('adds the main skill on top of the evoked pair', () => {
    const state = { contracted: ['byakko'], installed: 'byakko' };
    const granted = grantedYoukaiSkills(state, { 'sync-mind': 2, install: 1 });
    expect(granted.map(skill => skill.name)).toEqual(['Thunder Claw', 'Seal of the West', 'Roar']);
    expect(granted.find(skill => skill.slot === 'main')?.via).toBe('install');
  });

  it('replaces base stats except FAI, SAN and APT', () => {
    const stats = installedBaseStats({ contracted: ['byakko'], installed: 'byakko' }, {})!;
    /*
     * The Beast race line, not Byakko's own numbers. Install swaps one racial
     * line for another, so the substituted stats sit on the same scale as the
     * subrace line they displace: 9 STR, against Byakko's level 60 STR of 56.
     */
    expect(stats).toEqual({ ...youkaiRaceBaseStats('Beast'), fai: undefined, san: undefined, apt: undefined });
    expect(stats.str).toBe(9);
    for (const preserved of INSTALL_PRESERVED_STATS) expect(stats[preserved]).toBeUndefined();
  });

  it('gives every Youkai of a race the same body', () => {
    // The race is what you wear. Which Dragon you installed changes the skills
    // you gain, not the stat line.
    const dragons = YOUKAI.filter(youkai => youkai.race === 'Dragon').map(youkai => youkai.id);
    expect(dragons.length).toBeGreaterThan(1);
    const lines = dragons.map(id => installedBaseStats({ contracted: [id], installed: id }, {}));
    for (const line of lines) expect(line).toEqual(lines[0]);
  });

  it('applies Affinity to the installed racial line, capped at +1', () => {
    const plain = installedBaseStats({ contracted: ['byakko'], installed: 'byakko' }, {})!;
    const affine = installedBaseStats({ contracted: ['byakko'], installed: 'byakko' }, { 'affinity-beast': 5 })!;
    expect(affine.str).toBe((plain.str ?? 0) + 1);
  });

  it('applies the complete Daisangen package to an installed Dragon', () => {
    const plain = installedBaseStats({ contracted: ['chun'], installed: 'chun' }, { 'sync-mind': 2 })!;
    const complete = installedBaseStats({ contracted: ['chun', 'haku', 'hatsu'], installed: 'chun' }, { 'sync-mind': 2 })!;
    expect(complete.str).toBe((plain.str ?? 0) + 2);
    expect(complete.vit).toBe(plain.vit);
  });

  it('keeps the summon on its level 60 line', () => {
    // Install reads the racial base; the Youkai fighting beside you does not.
    expect(youkaiStats(youkaiById('byakko')!, {}).str).toBe(56);
  });

  it('installs nothing for an uncontracted or unknown youkai', () => {
    expect(installedBaseStats({ contracted: [], installed: 'byakko' }, {})).toBeNull();
    expect(installedBaseStats({ contracted: ['byakko'], installed: 'nope' }, {})).toBeNull();
  });

  it('needs the Install skill and a contract', () => {
    expect(canInstall({ contracted: ['byakko'], installed: null }, {})).toBe(false);
    expect(canInstall({ contracted: [], installed: null }, { install: 1 })).toBe(false);
    expect(canInstall({ contracted: ['byakko'], installed: null }, { install: 1 })).toBe(true);
  });

  it('rewrites the build stats it replaces and leaves the preserved ones alone', () => {
    const build = summonerBuild();
    const before = evaluateBuild(build);
    build.youkai = { contracted: ['byakko'], installed: 'byakko' };
    const after = evaluateBuild(build);

    // Byakko's STR base of 56 dwarfs any subrace line, so the installed build
    // must be visibly stronger, and its HP follows from the new VIT.
    expect(after.rawStats.str).toBeGreaterThan(before.rawStats.str);
    expect(after.derived.maxHP).toBeGreaterThan(before.derived.maxHP);
    // FAI is preserved, so the Youkai cap cannot move.
    expect(after.derived.youkaiCap).toBe(before.derived.youkaiCap);
  });

  it('leaves the allocation cap on the real subrace, since installing is a combat state', () => {
    const build = summonerBuild();
    const before = evaluateBuild(build);
    build.youkai = { contracted: ['byakko'], installed: 'byakko' };
    expect(evaluateBuild(build).maxInvestedStats).toEqual(before.maxInvestedStats);
  });
});

describe('youkai persistence', () => {
  it('round-trips contracts and the installed youkai', () => {
    const build = summonerBuild();
    build.youkai = { contracted: ['byakko', 'apus'], installed: 'apus' };
    const restored = parseBuildFile(JSON.stringify({ ...build, version: '0.5.0', buildName: 'x' })).build;
    expect(restored.youkai).toEqual(build.youkai);
  });

  it('drops unknown ids and an install without a matching contract', () => {
    const restored = parseBuildFile(JSON.stringify({
      version: '0.5.0', buildName: 'x', race: 'Human', subrace: 'Imperialist',
      mainClass: 'Summoner', subClass: 'Mage', characterLevel: 10,
      youkai: { contracted: ['byakko', 'not-a-youkai', 'byakko'], installed: 'apus' },
    })).build;
    expect(restored.youkai).toEqual({ contracted: ['byakko'], installed: null });
  });

  it('normalizes an imported base and ascended conflict in favor of ascension', () => {
    const restored = parseBuildFile(JSON.stringify({
      version: '0.5.0', buildName: 'x', race: 'Human', subrace: 'Imperialist',
      mainClass: 'Summoner', subClass: 'Mage', characterLevel: 10,
      youkai: { contracted: ['suzaku', 'suzaku-ascended'], installed: 'suzaku' },
    })).build;
    expect(restored.youkai).toEqual({ contracted: ['suzaku-ascended'], installed: 'suzaku-ascended' });
  });

  it('defaults to an empty state', () => {
    expect(summonerBuild().youkai).toEqual({ contracted: [], installed: null });
  });
});
