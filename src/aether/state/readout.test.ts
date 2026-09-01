import { describe, expect, it } from 'vitest';
import { evaluateBuild } from '../../domain/buildEvaluation';
import { normalizeBuildState } from '../../domain/buildPersistence';
import { TEMPLATE_BUILDS } from '../../data/constants';
import { buildReducer, createDefaultBuild, investedCaps, TEMPLATES } from './build';
import { STAT_HARD_CAP, STAT_KEYS } from './build';
import {
  ELEMENT_FOR_STAT,
  baseCritical,
  baseHit,
  critDamageBonus,
  elementAdjustment,
  elementalRows,
  formatReadout,
  formatScaled,
  readoutGroups,
  statBreakdown,
} from './readout';

const soldier = TEMPLATES.find(template => template.id === 'soldier')!;

describe('readout derivations', () => {
  it('derives Hit and Critical from the stat terms the wiki states', () => {
    const evaluation = evaluateBuild(soldier.build);
    // 2 Hit per scaled SKI; 0.5 per scaled SKI and 1 per scaled LUC for Critical.
    expect(baseHit(evaluation)).toBe(Math.floor(evaluation.scaledStats.ski * 2));
    expect(baseCritical(evaluation)).toBe(
      Math.floor(evaluation.scaledStats.ski / 2) + Math.floor(evaluation.scaledStats.luc),
    );
    expect(critDamageBonus(evaluation)).toBe(Math.floor(evaluation.scaledStats.gui));
  });

  /*
   * The whole point of flooring each Critical term separately: equipping a weapon
   * must not make the number jump. `calculateWeaponSlot` adds the same two terms
   * to the weapon's own critical, so the gearless figure has to be composed the
   * same way or the two readouts disagree by a rounding step.
   */
  it('keeps the gearless Critical consistent with the weapon path', () => {
    const armed = buildReducer(soldier.build, {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Engraved Katana',
    });
    const bare = evaluateBuild(soldier.build);
    const withWeapon = evaluateBuild(armed);
    const weaponOwnCritical = withWeapon.primaryWeapon!.critical - baseCritical(bare);
    // What is left after removing the character's share is the weapon's own, which
    // must be a whole number. A fractional remainder would mean double rounding.
    expect(Number.isInteger(weaponOwnCritical)).toBe(true);
    expect(withWeapon.primaryWeapon!.hit).toBe(
      baseHit(bare) + (withWeapon.primaryWeapon!.hit - baseHit(bare)),
    );
  });

  it('reports every derived value the panel promises', () => {
    const keys = readoutGroups(evaluateBuild(soldier.build)).flatMap(group => group.rows.map(row => row.key));
    for (const key of [
      'maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'evade', 'criticalEvade',
      'statusResistance', 'hit', 'critical', 'statusInfliction', 'initiative',
      'flanking', 'skillPool', 'youkaiCap', 'battleWeight', 'encumbrance',
    ]) {
      expect(keys).toContain(key);
    }
  });

  it('marks the weapon-dependent rows as partial while unarmed', () => {
    const partial = readoutGroups(evaluateBuild(soldier.build))
      .flatMap(group => group.rows)
      .filter(row => row.partial)
      .map(row => row.key);
    // Weight is always partial: only the weapon and torso have a published one.
    expect(partial.sort()).toEqual(['battleWeight', 'critDamage', 'critical', 'hit']);
  });

  it('drops the partial marks and adds Power once a weapon is equipped', () => {
    const armed = buildReducer(soldier.build, {
      type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Engraved Katana',
    });
    const rows = readoutGroups(evaluateBuild(armed)).flatMap(group => group.rows);
    const partial = rows.filter(row => row.partial).map(row => row.key);
    expect(partial).toEqual(['battleWeight']);
    expect(rows.map(row => row.key)).toContain('power');
    // The rail must show the evaluation's own figures, not the gearless fallback.
    const evaluation = evaluateBuild(armed);
    expect(rows.find(row => row.key === 'hit')?.value).toBe(evaluation.primaryWeapon!.hit);
    expect(rows.find(row => row.key === 'critical')?.value).toBe(evaluation.primaryWeapon!.critical);
  });

  it('lists all ten elements with an attack, a resistance and the stat behind it', () => {
    const rows = elementalRows(evaluateBuild(soldier.build));
    expect(rows).toHaveLength(10);
    expect(rows.map(row => row.element)).toContain('Sound');
    expect(rows.every(row => Number.isFinite(row.attack) && Number.isFinite(row.resistance))).toBe(true);
    // The card offers this stat as a route, so it has to be a key and not a label.
    expect(rows.every(row => STAT_KEYS.includes(row.stat))).toBe(true);
    expect(rows.find(row => row.element === 'Wind')?.stat).toBe('cel');
  });

  it('formats percentages and trims whole scaled values', () => {
    expect(formatReadout(27, 'percent')).toBe('27%');
    expect(formatReadout(4, 'signed-percent')).toBe('+4%');
    expect(formatReadout(-4, 'signed-percent')).toBe('-4%');
    expect(formatScaled(60)).toBe('60');
    expect(formatScaled(60.24)).toBe('60.2');
  });
});

describe('what a derived row says it reads', () => {
  const armed = buildReducer(soldier.build, {
    type: 'equip-weapon', which: 'primaryWeapon', weaponName: 'Engraved Katana',
  });
  const allRows = [
    ...readoutGroups(evaluateBuild(soldier.build)).flatMap(group => group.rows),
    ...readoutGroups(evaluateBuild(armed)).flatMap(group => group.rows),
  ];

  /*
   * The card lists a row's stats from `stats`, and the same card prints `hint` as
   * the formula. Two hand-written descriptions of one formula drift, and the way
   * they drift is silent: a row goes on claiming SKI in prose after its stats list
   * has moved on. So the abbreviations in the prose and the list have to match.
   */
  it('names in prose exactly the stats it lists', () => {
    const abbreviations = new Set(STAT_KEYS.map(stat => stat.toUpperCase()));
    for (const row of allRows) {
      const named = new Set(
        (row.hint.match(/[A-Z]{3}/g) ?? []).filter(token => abbreviations.has(token)),
      );
      expect([...named].sort(), `${row.key} prose`).toEqual(
        row.stats.map(stat => stat.toUpperCase()).sort(),
      );
    }
  });

  it('gives every dagger row the footnote that explains it', () => {
    for (const row of allRows) {
      expect(Boolean(row.note), `${row.key} note`).toBe(Boolean(row.partial));
    }
    // And the rail builds one footnote out of them, so there are only ever two.
    const notes = new Set(allRows.filter(row => row.partial).map(row => row.note));
    expect(notes.size).toBe(2);
  });

  it('summarises a manual element adjustment, and says nothing when there is none', () => {
    expect(elementAdjustment(soldier.build, 'Fire')).toBe('');
    const adjusted = {
      ...soldier.build,
      elementalATKAdjustments: { ...soldier.build.elementalATKAdjustments, Fire: 12 },
      elementalRESAdjustments: { ...soldier.build.elementalRESAdjustments, Fire: -5 },
    };
    expect(elementAdjustment(adjusted, 'Fire')).toBe('+12 ATK, -5% RES');
  });
});

describe('stat breakdown', () => {
  it('splits a stat into parts that add back up to its raw total', () => {
    const evaluation = evaluateBuild(soldier.build);
    for (const stat of ['str', 'wil', 'ski', 'apt'] as const) {
      const parts = statBreakdown(soldier.build, evaluation, stat);
      expect(parts.floor + parts.invested + parts.other).toBe(parts.raw);
      // The floor is read off the cap, so the two must still describe one ceiling.
      expect(parts.floor + parts.cap).toBe(STAT_HARD_CAP);
      expect(parts.invested).toBe(soldier.build.addedStats[stat]);
      expect(parts.returns).toBeCloseTo(parts.scaled - parts.raw, 10);
    }
  });

  it('reports what diminishing returns take off a heavily invested stat', () => {
    const heavy = buildReducer(createDefaultBuild(), { type: 'stat', stat: 'str', value: 76 });
    const parts = statBreakdown(heavy, evaluateBuild(heavy), 'str');
    // Well past the soft cap, so scaled must sit below raw rather than at it.
    expect(parts.raw).toBeGreaterThan(60);
    expect(parts.returns).toBeLessThan(0);
    expect(parts.scaled).toBeLessThan(parts.raw);
  });

  it('names the element each stat powers, and only for the ten that power one', () => {
    expect(ELEMENT_FOR_STAT.str).toBe('Fire');
    expect(ELEMENT_FOR_STAT.san).toBe('Sound');
    // WIL and APT feed no element; the card must not invent one for them.
    expect(ELEMENT_FOR_STAT.wil).toBeUndefined();
    expect(ELEMENT_FOR_STAT.apt).toBeUndefined();
    expect(Object.keys(ELEMENT_FOR_STAT)).toHaveLength(10);
  });
});

describe('build reducer', () => {
  it('loads a template at exactly its point budget', () => {
    const evaluation = evaluateBuild(soldier.build);
    expect(evaluation.pointsSpent).toBe(evaluation.pointBudget);
    expect(evaluation.pointBudget).toBe(240);
  });

  it('matches the raw template spread from the dataset', () => {
    const source = (TEMPLATE_BUILDS as Record<string, { stats: Record<string, number> }>).soldier;
    expect(soldier.build.addedStats).toMatchObject(source.stats);
  });

  it('clamps an invested stat to its hard-cap headroom', () => {
    const build = createDefaultBuild();
    const next = buildReducer(build, { type: 'stat', stat: 'str', value: 999 });
    expect(next.addedStats.str).toBe(investedCaps(build).str);
    // Imperialist grants 4 STR, so the ceiling is the 80 cap less that line.
    expect(next.addedStats.str).toBe(76);
  });

  it('re-clamps allocation when a subrace raises the racial line', () => {
    let build = createDefaultBuild();
    build = buildReducer(build, { type: 'stat', stat: 'def', value: 76 });
    expect(build.addedStats.def).toBe(76);
    // Chataran has a DEF line of 8, so 76 no longer fits under the cap.
    const moved = buildReducer(build, { type: 'subrace', subrace: 'Chataran' });
    expect(moved.addedStats.def).toBe(72);
  });

  it('mirrors the sub class when monoclass is switched on', () => {
    let build = createDefaultBuild();
    build = buildReducer(build, { type: 'class', slot: 'sub', className: 'Mage' });
    expect(build.subClass).toBe('Mage');
    build = buildReducer(build, { type: 'monoclass', enabled: true });
    expect(build.subClass).toBe('Soldier');
  });

  it('drops skill ranks a new class pair can no longer reach', () => {
    let build = createDefaultBuild();
    build = buildReducer(build, { type: 'skill-rank', slot: 'main', skillId: 'execute', rank: 3 });
    expect(build.skillRanks.main.execute).toBe(3);
    build = buildReducer(build, { type: 'class', slot: 'main', className: 'Mage' });
    expect(build.skillRanks.main.execute).toBeUndefined();
  });

  it('collapses to one family when Destiny is switched on', () => {
    let build = createDefaultBuild();
    build = buildReducer(build, { type: 'class', slot: 'sub', className: 'Mage' });
    build = buildReducer(build, { type: 'field', patch: { destiny: true } });
    expect(build.subClass).toBe(build.mainClass);
  });

  it('round-trips a template through the shared build file format', () => {
    const restored = normalizeBuildState(JSON.parse(JSON.stringify(soldier.build)));
    expect(evaluateBuild(restored).derived.maxHP).toBe(evaluateBuild(soldier.build).derived.maxHP);
  });
});
