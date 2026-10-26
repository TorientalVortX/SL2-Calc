// Usage: node scripts/build-trait-data.mjs [--report]  -> src/data/content/traits.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN = path.resolve('wiki-data/mechanics/traits.md');
const RACES_IN = path.resolve('src/data/content/races.json');
const OUT = path.resolve('src/data/content/traits.json');
const REPORT = process.argv.includes('--report');

const STATS = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];
const STAT_PATTERN = STATS.join('|');

// The wiki writes "15 FAI", "80+ VIT" or "15 Base STR"; every requirement reads base totals.
// Built per call because `g` regexes carry `lastIndex`.
const statMinimum = (flags) => new RegExp(`(\\d+)\\s*\\+?\\s*(?:Base\\s+)?(${STAT_PATTERN})\\b`, flags);

const HISTORY_KEY_FIXES = { 'History: Myrmidon': 'Myrmdon' };

// An unknown race makes a requirement silently unsatisfiable, hiding the trait from its race.
const raceData = JSON.parse(await readFile(RACES_IN, 'utf8'));
const KNOWN_RACES = new Set([...Object.keys(raceData.races), ...Object.keys(raceData.subraces)]);

const RACE_ALIASES = {
  'Standard Mechanation': 'Mechanation STANDARD',
  'Cabal Mechanation': 'Mechanation CABAL',
  'Agile Mechanation': 'Mechanation AGILE',
  'Raid Mechanation': 'Mechanation RAID',
};

const RACE_EXPANSIONS = {
  Mechanation: ['Mechanation STANDARD', 'Mechanation CABAL', 'Mechanation AGILE', 'Mechanation RAID'],
};

function resolveRace(name) {
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (RACE_EXPANSIONS[cleaned]) return RACE_EXPANSIONS[cleaned];
  const aliased = RACE_ALIASES[cleaned] ?? cleaned;
  return KNOWN_RACES.has(aliased) ? [aliased] : [];
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Racial Traits subsections are the only thing saying which races a trait belongs to.
function taggedRows(markdown) {
  const rows = [];
  let section = null;
  let subsection = null;
  for (const line of markdown.split('\n')) {
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) { section = h2[1].trim(); subsection = null; continue; }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) { subsection = h3[1].trim(); continue; }
    if (!line.startsWith('| ')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2 || cells[0] === 'Name' || /^-+$/.test(cells[0])) continue;
    rows.push({ section, subsection, cells });
  }
  return rows;
}

function parseStatBonuses(effect) {
  const bonuses = {};
  const pattern = new RegExp(`([+-]\\d+)\\s*(${STAT_PATTERN})\\b`, 'gi');
  for (const match of effect.matchAll(pattern)) {
    const key = match[2].toLowerCase();
    bonuses[key] = (bonuses[key] ?? 0) + Number(match[1]);
  }
  return bonuses;
}

const unresolvedRaces = [];

// "Oni Heritage Trait" is satisfied by either Red or Blue.
const TRAIT_PREREQ_ALIASES = {
  'Fast Healing': ['Fast Healer'],
  'Oni Heritage': ['Oni Heritage (Red)', 'Oni Heritage (Blue)'],
};

// Stat minimums use base totals: the wiki says APT and item bonuses do not count.
function parseRequirements(text) {
  const requirement = {
    stats: {},
    races: [],
    excludedRaces: [],
    classes: [],
    traitNames: [],
    talents: [],
    naturalSkin: false,
    alternatives: [],
    raw: !text || /^none$/i.test(text) ? '' : text,
  };
  if (!text || /^none$/i.test(text)) return requirement;

  for (const match of text.matchAll(statMinimum('gi'))) {
    requirement.stats[match[2].toLowerCase()] = Number(match[1]);
  }

  // Ghost Entertainer wants "10 SAN or 7+ Ranks in Spiritualism"; an alternative is not a minimum.
  for (const segment of text.split(/\s*,\s*/)) {
    if (!/\s+or\s+/i.test(segment)) continue;
    const sides = segment.split(/\s+or\s+/i).map((s) => s.trim());
    const eachSideUnderstood = sides.every((side) => (
      statMinimum('i').test(side) || resolveRace(side.replace(/\s+Race\b.*$/, '')).length > 0
    ));
    if (eachSideUnderstood) continue;
    for (const match of segment.matchAll(statMinimum('gi'))) {
      delete requirement.stats[match[2].toLowerCase()];
    }
    requirement.alternatives.push(segment);
  }

  const clauses = text.split(/\s*,\s*|\s+or\s+/i).map((c) => c.trim()).filter(Boolean);
  // The list form says "Race" only on the last entry ("Zeran, Reaper or Apertaurus Race").
  const listsRaces = clauses.some((clause) => /\bRace\b/.test(clause));

  for (const clause of clauses) {
    if (/\bNatural Skin\b/i.test(clause)) requirement.naturalSkin = true;

    // "Non-Glykin Race ..." is an exclusion, not a requirement.
    const excluded = /\bNon-([A-Z][A-Za-z' ]*?)\s+Race\b/.exec(clause);
    if (excluded) {
      requirement.excludedRaces.push(...resolveRace(excluded[1]));
      continue;
    }

    // "Human Race", "Muridae Race", and the bare entries of an "or" list.
    const named = /^([A-Z][A-Za-z' ]*?)(?:\s+Race\b.*)?$/.exec(clause);
    if (named && (/\bRace\b/.test(clause) || listsRaces)) {
      const resolved = resolveRace(named[1]);
      if (resolved.length) {
        requirement.races.push(...resolved);
        continue;
      }
      // "Race" naming nothing known is a data mismatch, reported loudly.
      if (/\bRace\b/.test(clause) && !/\bNatural Skin\b/i.test(clause)) {
        unresolvedRaces.push(clause);
      }
    }

    // "Divine Eyes Trait (Human Only)" states the race in an aside.
    const only = /\(([A-Z][A-Za-z' ]*?)\s+Only\)/i.exec(clause);
    if (only) requirement.races.push(...resolveRace(only[1]));

    // "Detainment Talent Rank 1+", "Ninja Training talent"
    const talent = /^([A-Z][A-Za-z' ]*?)\s+[Tt]alent\b(?:\s*Rank\s*(\d+))?/.exec(clause);
    if (talent) {
      requirement.talents.push({ name: talent[1].trim(), rank: talent[2] ? Number(talent[2]) : 1 });
      continue;
    }

    // "Fasting Vampire Trait", "Disaster Realised trait"
    const trait = /^([A-Z][A-Za-z'()\- ]*?)\s+[Tt]rait\b/.exec(clause);
    if (trait) requirement.traitNames.push(trait[1].trim());

    const className = /^([A-Z][A-Za-z' ]*?)\s+Class\b/.exec(clause);
    if (className) requirement.classes.push(className[1].trim());
  }

  requirement.races = [...new Set(requirement.races)];
  requirement.excludedRaces = [...new Set(requirement.excludedRaces)];
  requirement.classes = [...new Set(requirement.classes)];
  return requirement;
}

const rows = taggedRows(await readFile(IN, 'utf8'));
const traits = [];
const ids = new Set();

for (const { section, subsection, cells } of rows) {
  const [name, effect = '', requirements = ''] = cells;
  if (!name) continue;
  let id = slug(name);
  if (ids.has(id)) id = `${id}-${slug(section ?? 'x')}`;
  ids.add(id);

  const category = (section ?? 'Traits').replace(/\s*Traits?$/i, '');
  traits.push({
    id,
    name,
    category,
  // History traits apply through the build's `history` field; `historyKey` is that field's value.
    ...(category === 'History'
      ? {
        handModelled: true,
        historyKey: (HISTORY_KEY_FIXES[name] ?? name.replace(/^History:\s*/, '')),
      }
      : {}),
    // Blood Binding traits are the Karakuri body, already applied from `karakuriYoukai`.
    ...(id.startsWith('blood-binding-') ? { handModelled: true } : {}),
    group: subsection ?? null,
    effect,
    statBonuses: parseStatBonuses(effect),
    requirements: parseRequirements(requirements),
  });
}

// An unresolved prerequisite would silently un-gate the trait, so it is reported.
const idByName = new Map(traits.map((t) => [t.name.toLowerCase(), t.id]));
const unresolvedTraits = [];
for (const trait of traits) {
  const { traitNames, ...rest } = trait.requirements;
  const resolved = [];
  for (const name of traitNames) {
    const candidates = TRAIT_PREREQ_ALIASES[name] ?? [name];
    const anyOf = candidates.map((c) => idByName.get(c.toLowerCase())).filter(Boolean);
    if (anyOf.length) resolved.push({ label: name, anyOf });
    else unresolvedTraits.push(`${trait.name}: "${name}"`);
  }
  trait.requirements = { ...rest, traits: resolved };
}

// A racial trait with no race gate shows for every race; a prerequisite chain counts as a gate.
const ungatedRacials = traits.filter((t) => (
  t.category === 'Racial'
  && !t.requirements.races.length
  && !t.requirements.traits.length
  && !t.requirements.excludedRaces.length
));

traits.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
await writeFile(OUT, `${JSON.stringify({ traits })}\n`, 'utf8');

const withStats = traits.filter((t) => Object.keys(t.statBonuses).length);
const withReq = traits.filter((t) => Object.keys(t.requirements.stats).length || t.requirements.races.length);
const byCategory = traits.reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + 1 }), {});
console.log(`${traits.length} traits -> ${path.relative(process.cwd(), OUT)} (${Math.round(Buffer.byteLength(JSON.stringify(traits)) / 1024)}KB)`);
console.log(`  ${withStats.length} grant a flat stat bonus, ${withReq.length} carry a checkable requirement`);
console.log(`  ${Object.entries(byCategory).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`  ${traits.filter((t) => t.requirements.traits.length).length} gated behind another trait, ${traits.filter((t) => t.requirements.talents.length).length} behind a talent`);
for (const clause of new Set(unresolvedRaces)) console.warn(`  ! race clause matches no known race: "${clause}"`);
for (const miss of unresolvedTraits) console.warn(`  ! prerequisite trait not found: ${miss}`);
for (const trait of ungatedRacials) console.warn(`  ! racial trait with no race gate: ${trait.name} (${trait.requirements.raw})`);
if (REPORT) {
  for (const trait of withStats.slice(0, 12)) {
    console.log(`  ${trait.name.padEnd(24)} ${JSON.stringify(trait.statBonuses)}  req ${JSON.stringify(trait.requirements.stats)}`);
  }
}
