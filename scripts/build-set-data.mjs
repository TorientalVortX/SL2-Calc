// Usage: node scripts/build-set-data.mjs [--report]  -> src/data/content/item-sets.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const OUT = path.resolve('src/data/content/item-sets.json');
const REPORT = process.argv.includes('--report');

// The wiki writes the set line several ways ("'''Set:''' X", "<u>Set: '''X'''</u>", "Set: X."), so markup is stripped first.
const SET_NAME = /Set:\s*([^<.\n]+)/i;

// The wiki writes `Set:''' Like a Dragon`, closing the bold on the label, so leading quotes go first.
function setNameOf(captured) {
  const cleaned = String(captured).replace(/^\s*'+\s*/, '');
  const cut = cleaned.search(/'''|\s+\d+\s*\+|\s+[-–—]\s/);
  return strip(cut === -1 ? cleaned : cleaned.slice(0, cut)).replace(/\s*[-–—:]\s*$/, '');
}

// The separator is written `2+:`, `'''2+:'''` or `'''2+''' -`; run against stripped text.
const THRESHOLD = /(\d+)\s*\+\s*[:\-–—]?\s*([\s\S]*?)(?=\d+\s*\+\s*[:\-–—]|$)/g;

const strip = (text) => String(text ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/'''?/g, '')
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

// `Tsukikage` names the Hayabusa set in the weapon data but is absent from the scraped Swords page.
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

  // The trailing italic flavour sentence is dropped, or the last threshold swallows it.
  const afterSet = raw.slice(raw.search(SET_NAME)).replace(/<i>[\s\S]*?<\/i>\s*$/i, '');
  const table = /<small>([\s\S]*?)(?:<\/small>|$)/i.exec(afterSet)?.[1] ?? afterSet;
  const plain = strip(table);

  THRESHOLD.lastIndex = 0;
  for (const match of plain.matchAll(THRESHOLD)) {
    const count = Number(match[1]);
    const description = match[2].trim();
    if (!description) continue;
    // Members quote the table to different lengths, so the longest description wins.
    const existing = set.thresholds.get(count);
    if (!existing || description.length > existing.length) set.thresholds.set(count, description);
  }

  // Dragon King/Queen state one per-piece scaling rule with no `2+`; kept as prose.
  if (!/\d+\s*\+/.test(plain) && plain && (!set.note || plain.length > set.note.length)) {
    set.note = plain;
  }
}

// Calculator-only members may only join sets the wiki defined; their flattened text
// otherwise yields names like "Dragon King Increases total Strength by 5%".
for (const item of await appDataItems()) {
  if (!/Set:/i.test(item.text)) continue;
  const named = [...sets.keys()].find((name) => item.text.toLowerCase().includes(name.toLowerCase()));
  if (!named) { problems.push(`${item.name}: names a set the wiki data does not define`); continue; }
  const set = sets.get(named);
  if (!set.members.some((member) => member.name === item.name)) {
    set.members.push({ name: item.name, kind: item.kind });
  }
}

// Wiki members the app has no item for ("Yin (Gilded)", "Dragon Gi") are dropped so thresholds stay honest.
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
  // Usually means the wiki lists a member this scrape did not pick up.
  for (const threshold of thresholds) {
    if (threshold.count > set.members.length) {
      problems.push(`${name}: needs ${threshold.count} but only ${set.members.length} members are known`);
    }
  }

  output[name] = {
    members: set.members.map((member) => member.name).sort(),
    thresholds,
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
