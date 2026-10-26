// Usage: node scripts/build-race-data.mjs  -> src/data/content/racial-skills.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN_SKILLS = path.resolve('wiki-data/raw/racial-skills.json');
const IN_RACES = path.resolve('wiki-data/raw/races.json');
const OUT = path.resolve('src/data/content/racial-skills.json');
const CONTENT_RACES = path.resolve('src/data/content/races.json');

// Mechanation's four loadouts share one wiki page; Youkai types have no race page (see youkai.json).
const SUBRACE_TO_WIKI = {
  'Mechanation STANDARD': 'Mechanation',
  'Mechanation CABAL': 'Mechanation',
  'Mechanation AGILE': 'Mechanation',
  'Mechanation RAID': 'Mechanation',
};
const NO_RACE_PAGE = new Set(['Avian', 'Mystic', 'Plant', 'Night', 'Dragon', 'Beast', 'Fairy']);

const skills = JSON.parse(await readFile(IN_SKILLS, 'utf8'));
const races = JSON.parse(await readFile(IN_RACES, 'utf8'));
const subraces = Object.keys(JSON.parse(await readFile(CONTENT_RACES, 'utf8')).subraces);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const wikiToSubraces = new Map();
const unmatched = [];
for (const subrace of subraces) {
  if (NO_RACE_PAGE.has(subrace)) continue;
  const wiki = SUBRACE_TO_WIKI[subrace] ?? subrace;
  if (!races.some((race) => race.name === wiki)) {
    unmatched.push(subrace);
    continue;
  }
  if (!wikiToSubraces.has(wiki)) wikiToSubraces.set(wiki, []);
  wikiToSubraces.get(wiki).push(subrace);
}

const ids = new Set();
const records = [];
for (const skill of skills) {
  let id = slug(skill.name);
  if (ids.has(id)) id = `${id}-${slug(skill.races[0] ?? 'x')}`;
  ids.add(id);

  const forSubraces = [...new Set(skill.races.flatMap((race) => wikiToSubraces.get(race) ?? []))];
  records.push({
    id,
    name: skill.name,
    /** As written on the wiki, e.g. "Any Human": shown so the source stays legible. */
    grantedTo: skill.race,
    subraces: forSubraces,
    passive: skill.passive,
    fp: skill.fp ?? null,
    momentum: skill.momentum ?? null,
    range: skill.range ?? null,
    target: skill.target ?? null,
    description: skill.description ?? '',
  });
}

records.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(OUT, `${JSON.stringify({ racialSkills: records })}\n`, 'utf8');

const covered = new Set(records.flatMap((r) => r.subraces));
const bare = subraces.filter((s) => !covered.has(s) && !NO_RACE_PAGE.has(s));
console.log(`${records.length} racial skills -> ${path.relative(process.cwd(), OUT)} (${Math.round(Buffer.byteLength(JSON.stringify(records)) / 1024)}KB)`);
console.log(`  ${covered.size} of ${subraces.length} subraces have at least one skill`);
if (unmatched.length) console.log(`  no wiki race page: ${unmatched.join(', ')}`);
if (bare.length) console.log(`  matched a page but no skills: ${bare.join(', ')}`);
