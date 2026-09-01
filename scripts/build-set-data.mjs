/**
 * Builds the equipment set bonuses the calculator applies.
 *
 *   wiki-data/raw/equipment.json  ->  src/data/content/item-sets.json
 *
 * A set is a group of items that grant extra bonuses once enough of them are
 * worn together, at thresholds the wiki writes as `2+:`, `3+:`, `5+:`.
 *
 * Two things make this parseable. Every member repeats the *whole* threshold
 * table, so the bonuses can be read from whichever member states them most
 * completely rather than stitched together. And membership is stated on the item
 * rather than in a set index, so the members fall out of the same pass.
 *
 * The wiki scrape is the only complete source: `armors.json` keeps the set name
 * but truncates the thresholds ("Set: Unassuming Adventurer."), and sets span
 * weapons, armour and slots 3-6 alike.
 *
 *   node scripts/build-set-data.mjs
 *   node scripts/build-set-data.mjs --report   # show every threshold parsed
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const OUT = path.resolve('src/data/content/item-sets.json');
const REPORT = process.argv.includes('--report');

/*
 * The wiki writes the set line at least three ways:
 *
 *   '''Set:''' Unassuming Adventurer
 *   <u>Set: '''Gunsmoke Spiritual'''</u>
 *   Set: Black-Forged Pact.
 *
 * so the markup is stripped before the name is read rather than trying to spell
 * every variant in one pattern.
 */
const SET_NAME = /Set:\s*([^<.\n]+)/i;

/**
 * Trims a captured set name back to just the name.
 *
 * The leading quotes go first: the wiki writes `Set:''' Like a Dragon`, closing
 * the bold on the label itself, so a cut that looked for markup found it at
 * position zero and returned nothing.
 */
function setNameOf(captured) {
  const cleaned = String(captured).replace(/^\s*'+\s*/, '');
  const cut = cleaned.search(/'''|\s+\d+\s*\+|\s+[-–—]\s/);
  return strip(cut === -1 ? cleaned : cleaned.slice(0, cut)).replace(/\s*[-–—:]\s*$/, '');
}

/**
 * `2+ …` up to the next threshold or the end of the text.
 *
 * Run against stripped text, because the separator is written at least three
 * ways (`2+:`, `'''2+:'''`, `'''2+''' -`), and the markup sits in different
 * places in each. Stripping first turns all of them into `2+` followed by a
 * colon or a dash, which is one pattern instead of three.
 */
const THRESHOLD = /(\d+)\s*\+\s*[:\-–—]?\s*([\s\S]*?)(?=\d+\s*\+\s*[:\-–—]|$)/g;

const strip = (text) => String(text ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/'''?/g, '')
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Every item the calculator can actually equip, from all three of its sources.
 *
 * Membership cannot come from the wiki scrape alone. `Tsukikage` names the
 * Hayabusa set in the calculator's own weapon data but is absent from the
 * scraped Swords page, so a scrape-only pass records a two-piece set with one
 * member. A set that could never activate. Thresholds still come from the
 * scrape, which is the only place that states them in full.
 */
async function appDataItems() {
  const all = [];
  const armors = JSON.parse(await readFile(path.resolve('src/data/armors.json'), 'utf8'));
  for (const list of Object.values(armors)) {
    for (const armor of list) all.push({ name: armor.name, kind: 'Armor', text: armor.details ?? '' });
  }

  const contentDir = path.resolve('src/data/content');
  for (const file of (await readdir(contentDir)).filter((f) => /^weapons-.+\.json$/.test(f))) {
    for (const weapon of JSON.parse(await readFile(path.join(contentDir, file), 'utf8'))) {
      const text = [weapon.description, ...(weapon.specials ?? []).map((s) => s.description)].filter(Boolean).join(' ');
      all.push({ name: weapon.name, kind: 'Weapon', text });
    }
  }
  return all;
}

const items = JSON.parse(await readFile(SOURCE, 'utf8'));

/** setName -> { members, thresholds } */
const sets = new Map();
const problems = [];

for (const item of items) {
  const raw = item.details?.raw ?? '';
  if (!/Set:/i.test(raw)) continue;

  const name = setNameOf(SET_NAME.exec(raw)?.[1] ?? '');
  if (!name) { problems.push(`${item.name}: names a set but the name did not parse`); continue; }

  if (!sets.has(name)) sets.set(name, { name, members: [], thresholds: new Map() });
  const set = sets.get(name);
  if (!set.members.some((member) => member.name === item.name)) {
    set.members.push({ name: item.name, kind: item.kind });
  }

  /*
   * Thresholds are read from the part of the text after the set line, so an
   * item that happens to mention a number earlier does not contribute one.
   *
   * The flavour sentence is dropped first. It is the trailing italic, and
   * without removing it the last threshold swallows it. When the wiki wraps the
   * table in `<small>` that block is used on its own, which is tighter still.
   */
  const afterSet = raw.slice(raw.search(SET_NAME)).replace(/<i>[\s\S]*?<\/i>\s*$/i, '');
  const table = /<small>([\s\S]*?)(?:<\/small>|$)/i.exec(afterSet)?.[1] ?? afterSet;
  const plain = strip(table);

  THRESHOLD.lastIndex = 0;
  for (const match of plain.matchAll(THRESHOLD)) {
    const count = Number(match[1]);
    const description = match[2].trim();
    if (!description) continue;
    /*
     * Members disagree in how much they quote (some cut the table short), so
     * the longest description for a threshold wins rather than the first seen.
     */
    const existing = set.thresholds.get(count);
    if (!existing || description.length > existing.length) set.thresholds.set(count, description);
  }

  /*
   * Not every set is a threshold table. Dragon King and Dragon Queen state one
   * rule that scales with how many pieces are worn ("Increases total Strength by
   * 5% … for each Dragon King item equipped") with no `2+` anywhere. Kept as
   * prose so the bonus is at least shown rather than dropped for not fitting.
   */
  if (!/\d+\s*\+/.test(plain) && plain && (!set.note || plain.length > set.note.length)) {
    set.note = plain;
  }
}

/*
 * Second pass: members the wiki scrape could not see.
 *
 * The calculator equips weapons and armour from its own data, which sometimes
 * carries an item the scraped page does not: `Tsukikage` names Hayabusa there
 * but is absent from the scraped Swords page, leaving a two-piece set with one
 * member and no way to ever complete it.
 *
 * These only ever *join* a set that the wiki already defined. Their text is
 * stored flattened, with none of the breaks that bound a name, so letting them
 * introduce names produced entries like "Dragon King Increases total Strength
 * by 5%…". Matching against known names instead keeps that impossible.
 */
for (const item of await appDataItems()) {
  if (!/Set:/i.test(item.text)) continue;
  const named = [...sets.keys()].find((name) => item.text.toLowerCase().includes(name.toLowerCase()));
  if (!named) { problems.push(`${item.name}: names a set the wiki data does not define`); continue; }
  const set = sets.get(named);
  if (!set.members.some((member) => member.name === item.name)) {
    set.members.push({ name: item.name, kind: item.kind });
  }
}

/*
 * Members the calculator has no item for.
 *
 * The wiki lists pieces the app's own data does not carry, "Yin (Gilded)",
 * "Dragon Gi", and counting them inflates a set's size, so a threshold looks
 * reachable when the last piece cannot be equipped at all. They are dropped and
 * named in the report rather than quietly left in.
 */
const equippable = new Set([
  ...(await appDataItems()).map((item) => item.name),
  ...Object.values(JSON.parse(await readFile(path.resolve('src/data/content/gear.json'), 'utf8')))
    .flat()
    .map((item) => item.name),
]);

for (const set of sets.values()) {
  const missing = set.members.filter((member) => !equippable.has(member.name));
  for (const member of missing) problems.push(`${set.name}: drops "${member.name}", which the calculator has no such item for`);
  set.members = set.members.filter((member) => equippable.has(member.name));
}

const output = {};
for (const [name, set] of [...sets].sort(([a], [b]) => a.localeCompare(b))) {
  const thresholds = [...set.thresholds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([count, description]) => ({ count, description }));

  if (!thresholds.length && !set.note) problems.push(`${name}: ${set.members.length} members but no bonus text parsed`);
  /*
   * A threshold asking for more pieces than the set has is unreachable, which
   * usually means the wiki lists a member this scrape did not pick up.
   */
  for (const threshold of thresholds) {
    if (threshold.count > set.members.length) {
      problems.push(`${name}: needs ${threshold.count} but only ${set.members.length} members are known`);
    }
  }

  output[name] = {
    members: set.members.map((member) => member.name).sort(),
    thresholds,
    // Prose for a set whose bonus is not a threshold table.
    ...(set.note && !thresholds.length ? { note: set.note } : {}),
  };
}

await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const totalMembers = Object.values(output).reduce((n, set) => n + set.members.length, 0);
console.log(`${Object.keys(output).length} sets, ${totalMembers} member items -> ${path.relative(process.cwd(), OUT)}`);
for (const [name, set] of Object.entries(output)) {
  console.log(`  ${name}: ${set.members.length} members, thresholds ${set.thresholds.map((t) => `${t.count}+`).join(' ') || '(none)'}`);
}
if (problems.length) {
  console.warn(`\n${problems.length} to check:`);
  for (const line of problems) console.warn(`  ! ${line}`);
}
if (REPORT) {
  for (const [name, set] of Object.entries(output)) {
    console.log(`\n${name}`);
    for (const threshold of set.thresholds) console.log(`  ${threshold.count}+ : ${threshold.description}`);
  }
}
