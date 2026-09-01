/**
 * Turns the scraped race corpus into the calculator's racial skill dataset.
 *
 *   wiki-data/raw/racial-skills.json  ->  src/data/content/racial-skills.json
 *
 * Racial skills differ from class skills in a way that shapes everything here:
 * none of the 101 carry a rank or a parseable numeric bonus. Their effects are
 * written as conditional prose ("while at 50% HP or less, they gain a bonus to
 * SKI, CEL, LUC and GUI equal to 1 + 10% of your Scaled SAN"), so there is
 * nothing to derive without inventing numbers. They are therefore carried as
 * reference text, and only the handful the calculator already models by hand
 * become live toggles; see `MODELLED` in src/domain/racialSkills.ts.
 *
 *   node scripts/build-race-data.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN_SKILLS = path.resolve('wiki-data/raw/racial-skills.json');
const IN_RACES = path.resolve('wiki-data/raw/races.json');
const OUT = path.resolve('src/data/content/racial-skills.json');
const CONTENT_RACES = path.resolve('src/data/content/races.json');

/**
 * Calculator subrace -> wiki race page, where the two names differ.
 *
 * Mechanation's four loadouts share one wiki page. The Youkai "subraces" are
 * Youkai types rather than playable races and have no race page at all; they are
 * covered by `youkai.json` instead.
 */
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

/** Wiki race name -> the calculator subraces it covers. */
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

  // Expand the wiki's races into the subraces a build can actually select.
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
