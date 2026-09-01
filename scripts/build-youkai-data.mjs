/**
 * Turns the scraped Youkai tables into the calculator's Youkai dataset.
 *
 *   wiki-data/raw/youkai.json  ->  src/data/content/youkai.json
 *
 * Two things this file resolves that the wiki leaves as prose:
 *
 * 1. **Skill slots.** Every Youkai lists exactly three skills, always in the
 *    order Evoke-Active, Evoke-Passive, Main. Sync-Mind grants the first at
 *    rank 1 and the second at rank 2; the third only arrives through Install.
 *    Position therefore carries meaning, so it is recorded explicitly rather
 *    than left implicit in array order.
 *
 * 2. **Level.** Stats are published at level 1 and level 60 and skill costs as a
 *    range across that span. The calculator models Youkai at level 60, so the
 *    level 60 stat line and the top of each cost range are what ship; the level 1
 *    line is kept alongside purely as provenance.
 *
 *   node scripts/build-youkai-data.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN = path.resolve('wiki-data/raw/youkai.json');
const OUT = path.resolve('src/data/content/youkai.json');

/** Slot names by position, per the Evoke-Active / Evoke-Passive / Main hierarchy. */
const SLOTS = ['evoke-active', 'evoke-passive', 'main'];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Pulls "Label: value" out of a skill's metadata line. */
const field = (meta, label) => {
  const match = new RegExp(`${label}:\\s*([^,]+)`, 'i').exec(meta);
  return match ? match[1].trim() : null;
};

/**
 * FP cost at level 60.
 *
 * The wiki writes a scaling cost as "5 - 29 FP" (level 1 to level 60) and a flat
 * cost as "15 FP". Either way the level 60 figure is the last number before "FP".
 * Note the wiki's own caveat that a Youkai casting its own skill pays half; that
 * halving is a usage rule, so the listed cost is what gets stored.
 */
function parseCost(meta) {
  const match = /Cost:\s*([\d\s\-–/]+)FP/i.exec(meta);
  if (!match) return null;
  // Filter the empty segments a trailing separator leaves behind before
  // converting: Number('') is 0, which would read as a free skill.
  const numbers = match[1].split(/[\s\-–/]+/).filter(Boolean).map(Number).filter(Number.isFinite);
  return numbers.length ? numbers[numbers.length - 1] : null;
}

/** Lowercases the wiki's stat keys to the calculator's `StatKey` spelling. */
function statRecord(stats) {
  return Object.fromEntries(Object.entries(stats ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
}

const raw = JSON.parse(await readFile(IN, 'utf8'));
const youkai = [];
const ids = new Set();
const warnings = [];

for (const entry of raw) {
  if (entry.skills.length !== SLOTS.length) {
    warnings.push(`${entry.name}: ${entry.skills.length} skills, expected ${SLOTS.length}, so slots would be wrong`);
    continue;
  }

  let id = slug(entry.name);
  if (ids.has(id)) {
    warnings.push(`${entry.name}: duplicate id "${id}"`);
    continue;
  }
  ids.add(id);

  youkai.push({
    id,
    name: entry.name,
    // Ascension replaces the original contract rather than creating a second
    // contract. Keeping that family link in the generated data lets every
    // consumer enforce the rule without relying on display-name parsing.
    baseFormId: /\s\(Ascended\)$/i.test(entry.name) ? id.replace(/-ascended$/, '') : null,
    // "Avian Youkai" -> "Avian", which is what the Affinity skills key off.
    race: entry.type.replace(/\s*Youkai\s*$/i, '').trim(),
    stats: statRecord(entry.statsLv60),
    statsLv1: statRecord(entry.statsLv1),
    skills: entry.skills.map((skill, index) => {
      const meta = skill.meta ?? '';
      const passive = /^passive/i.test(meta.trim());
      return {
        slot: SLOTS[index],
        name: skill.name,
        passive,
        fp: passive ? null : parseCost(meta),
        momentum: passive ? null : Number(/(\d+)\s*M\b/.exec(meta)?.[1] ?? '') || null,
        range: field(meta, 'Range'),
        area: field(meta, 'Area'),
        target: field(meta, 'Target'),
        domain: field(meta, 'Domain'),
        description: skill.description ?? '',
      };
    }),
  });
}

youkai.sort((a, b) => a.race.localeCompare(b.race) || a.name.localeCompare(b.name));
await writeFile(OUT, `${JSON.stringify({ youkai }, null, 2)}\n`, 'utf8');

const races = [...new Set(youkai.map((y) => y.race))];
const actives = youkai.flatMap((y) => y.skills).filter((s) => !s.passive);
console.log(`${youkai.length} youkai across ${races.length} races -> ${path.relative(process.cwd(), OUT)}`);
console.log(`  races: ${races.join(', ')}`);
console.log(`  ${actives.length} active skills, ${actives.filter((s) => s.fp == null).length} without a parsed FP cost`);
for (const warning of warnings) console.warn(`  ! ${warning}`);
