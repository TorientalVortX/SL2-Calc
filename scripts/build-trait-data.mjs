/**
 * Turns the scraped Traits page into the calculator's trait dataset.
 *
 *   wiki-data/mechanics/traits.md  ->  src/data/content/traits.json
 *
 * The wiki lists traits as Name / Effect / Requirements across six sections, and
 * gives no per-trait point cost; the only cost rule it states is that a Human's
 * History trait is free. Everything else is one point.
 *
 * Requirements matter mechanically: "Traits with stat point requirements
 * reference your base total. Bonuses from APT or items will not contribute!",
 * so they are parsed into structured minimums the calculator can check against
 * base stats rather than scaled ones.
 *
 *   node scripts/build-trait-data.mjs
 *   node scripts/build-trait-data.mjs --report
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN = path.resolve('wiki-data/mechanics/traits.md');
const RACES_IN = path.resolve('src/data/content/races.json');
const OUT = path.resolve('src/data/content/traits.json');
const REPORT = process.argv.includes('--report');

const STATS = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];
const STAT_PATTERN = STATS.join('|');

/**
 * A stat minimum, in each of the three shapes the wiki writes: "15 FAI",
 * "80+ VIT", "15 Base STR". Built fresh per call because `g` regexes carry a
 * `lastIndex` across uses. "Base" is redundant rather than a separate rule;
 * every trait requirement reads base totals.
 */
const statMinimum = (flags) => new RegExp(`(\\d+)\\s*\\+?\\s*(?:Base\\s+)?(${STAT_PATTERN})\\b`, flags);

/** The calculator spells one history differently from the wiki. */
const HISTORY_KEY_FIXES = { 'History: Myrmidon': 'Myrmdon' };

/*
 * Race names are resolved against the calculator's own race data rather than
 * trusted as written, because the wiki's phrasing does not always match it. A
 * requirement naming a race the calculator has never heard of is silently
 * unsatisfiable, which is worse than no requirement at all. It hides the trait
 * from the race that should have it.
 */
const raceData = JSON.parse(await readFile(RACES_IN, 'utf8'));
const KNOWN_RACES = new Set([...Object.keys(raceData.races), ...Object.keys(raceData.subraces)]);

/** Wiki spellings the calculator's race list writes differently. */
const RACE_ALIASES = {
  'Standard Mechanation': 'Mechanation STANDARD',
  'Cabal Mechanation': 'Mechanation CABAL',
  'Agile Mechanation': 'Mechanation AGILE',
  'Raid Mechanation': 'Mechanation RAID',
};

/** Wiki names covering several of the calculator's races at once. */
const RACE_EXPANSIONS = {
  Mechanation: ['Mechanation STANDARD', 'Mechanation CABAL', 'Mechanation AGILE', 'Mechanation RAID'],
};

/** A wiki race name as the calculator's races are spelled, or [] if unknown. */
function resolveRace(name) {
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (RACE_EXPANSIONS[cleaned]) return RACE_EXPANSIONS[cleaned];
  const aliased = RACE_ALIASES[cleaned] ?? cleaned;
  return KNOWN_RACES.has(aliased) ? [aliased] : [];
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Rows tagged with the `##` section and `###` subsection they sit under.
 *
 * The Racial Traits section subdivides by race group, and that subsection is the
 * only thing saying which races a racial trait belongs to.
 */
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

/**
 * Flat stat bonuses stated in an effect, e.g. History traits' "+2 SKI, +1 LUC".
 *
 * Only the plain "+N STAT" form is read. Anything conditional or expressed as
 * prose is left for the player to read, rather than guessed at.
 */
function parseStatBonuses(effect) {
  const bonuses = {};
  const pattern = new RegExp(`([+-]\\d+)\\s*(${STAT_PATTERN})\\b`, 'gi');
  for (const match of effect.matchAll(pattern)) {
    const key = match[2].toLowerCase();
    bonuses[key] = (bonuses[key] ?? 0) + Number(match[1]);
  }
  return bonuses;
}

/** Race clauses naming something absent from the calculator's race data. */
const unresolvedRaces = [];

/**
 * Prerequisite trait names the wiki writes differently from the trait itself.
 *
 * A name mapping to several traits is satisfied by any one of them: "Oni
 * Heritage Trait" is the pair of Red and Blue, of which a character picks one.
 */
const TRAIT_PREREQ_ALIASES = {
  'Fast Healing': ['Fast Healer'],
  'Oni Heritage': ['Oni Heritage (Red)', 'Oni Heritage (Blue)'],
};

/**
 * Structured requirements: stat minimums, races, classes, and prerequisites.
 *
 * Stat minimums are checked against base totals, per the wiki's own warning that
 * APT and item bonuses do not count toward them.
 *
 * The requirements column is a comma-and-"or" list of independent clauses, so it
 * is split into clauses first and each one classified. Reading the column with
 * one regex per requirement kind was the earlier approach and it lost every
 * clause that did not come first: "Lupine, Felidae, Grimalkin or Shaitan Race"
 * kept only the last two races, and a race stated as "(Human Only)" or implied
 * by a prerequisite trait produced no race requirement at all, which is how the
 * Human eyes traits came to show as available to every race.
 */
function parseRequirements(text) {
  const requirement = {
    stats: {},
    races: [],
    excludedRaces: [],
    classes: [],
    /** Prerequisite trait *names*; resolved to ids once every trait is known. */
    traitNames: [],
    /** Talent prerequisites, which the calculator does not model: display only. */
    talents: [],
    /** "Race with Natural Skin", likewise unmodelled and display only. */
    naturalSkin: false,
    /** Either-or clauses with a branch the calculator cannot check: display only. */
    alternatives: [],
    /* Empty rather than the wiki's "None", so the trait screen can print `raw`
     * as-is without checking for a word that means "nothing to print". */
    raw: !text || /^none$/i.test(text) ? '' : text,
  };
  if (!text || /^none$/i.test(text)) return requirement;

  // Only the plainest of the three shapes used to parse, so every trait written
  // the other two ways imposed no minimum at all and never locked.
  for (const match of text.matchAll(statMinimum('gi'))) {
    requirement.stats[match[2].toLowerCase()] = Number(match[1]);
  }

  /*
   * A stat minimum offered as one of several alternatives is not a minimum.
   * Ghost Entertainer wants "10 SAN or 7+ Ranks in Spiritualism", and talent
   * ranks are not modelled here, so enforcing the SAN half alone would lock a
   * build that qualifies through the other half. The whole clause moves to the
   * display-only list instead.
   */
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
  /*
   * A bare race name only counts as one when some clause said "Race". The list
   * form drops the word from every entry but the last ("Zeran, Reaper or
   * Apertaurus Race"). Without that guard, any capitalised word that happens to
   * match a race name would become a requirement.
   */
  const listsRaces = clauses.some((clause) => /\bRace\b/.test(clause));

  for (const clause of clauses) {
    if (/\bNatural Skin\b/i.test(clause)) requirement.naturalSkin = true;

    // "Non-Corrupted Race with Natural Skin", "Non-Glykin Race ..." are
    // exclusions, and were previously read as a *requirement* for the named race.
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
      // A clause that says "Race" but names nothing the calculator knows is a
      // data mismatch, not an absent requirement, so it is reported loudly.
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
  /*
     * A History trait is chosen in the Traits modal but applied through the
     * build's existing `history` field, which carries HP and percentage effects
     * beyond the flat stats parsed here. `historyKey` is that field's value: the
     * trait name without its prefix, bridging one spelling difference in the
     * calculator's own data.
     */
    ...(category === 'History'
      ? {
        handModelled: true,
        historyKey: (HISTORY_KEY_FIXES[name] ?? name.replace(/^History:\s*/, '')),
      }
      : {}),
    /*
     * The seven Blood Binding traits *are* the Karakuri body choice, which the
     * calculator already applies from the build's `karakuriYoukai` field. Their
     * effect text repeats those same stat offsets, so without this the offsets
     * land twice, once from the body, once from the trait.
     */
    ...(id.startsWith('blood-binding-') ? { handModelled: true } : {}),
    /** Race group for a racial trait, from the subsection heading. */
    group: subsection ?? null,
    effect,
    statBonuses: parseStatBonuses(effect),
    requirements: parseRequirements(requirements),
  });
}

/*
 * Prerequisite traits are stated by name and stored as ids, which needs every
 * trait parsed first. A name that resolves to nothing is reported rather than
 * dropped: an unresolved prerequisite would silently un-gate the trait.
 */
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

/*
 * A racial trait with no race requirement is the failure this parser exists to
 * prevent. It shows up as available to every race. Prerequisite chains count as
 * a gate, since the trait they depend on carries the race requirement.
 */
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
