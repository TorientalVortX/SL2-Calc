// Usage: node scripts/build-gear-data.mjs [--report]  -> src/data/content/gear.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const OUT = path.resolve('src/data/content/gear.json');
const REPORT = process.argv.includes('--report');

// Shields are their own wiki page and all grant Guard; they still occupy slot 3.
const GROUPS = {
  Hands: { group: 'Hands', slot: 3 },
  // The Shields page states "All shields are made of Metal" once instead of per row.
  Shield: { group: 'Shield', slot: 3, defaultMaterial: 'Metal' },
  Legs: { group: 'Legs', slot: 4 },
  Accessory: { group: 'Accessory', slot: 5 },
};

const items = JSON.parse(await readFile(SOURCE, 'utf8'));

const gear = { Hands: [], Shield: [], Legs: [], Accessory: [] };
const dropped = [];
const seen = new Map();
const collisions = [];

for (const item of items) {
  const mapped = GROUPS[item.group];
  if (!mapped) continue;

  const effects = item.details?.effects ?? [];
  if (!effects.length) {
    dropped.push(`${item.name} (${mapped.group}): no effect text`);
    continue;
  }

  if (seen.has(item.name)) collisions.push(`${item.name}: ${seen.get(item.name)} and ${mapped.group}`);
  else seen.set(item.name, mapped.group);

  gear[mapped.group].push({
    id: item.id,
    name: item.name,
    slot: mapped.slot,
    rarity: item.rarity ?? 1,
    // Material class decides which materials the piece takes and which class effects it meets.
    ...((item.details.material || mapped.defaultMaterial)
      ? { material: item.details.material || mapped.defaultMaterial }
      : {}),
    details: effects.join(' '),
    specialEffects: effects,
    ...(item.details.flavour ? { flavour: item.details.flavour } : {}),
  });
}

for (const list of Object.values(gear)) list.sort((a, b) => a.name.localeCompare(b.name));

await writeFile(OUT, `${JSON.stringify(gear, null, 2)}\n`, 'utf8');

const total = Object.values(gear).reduce((n, list) => n + list.length, 0);
console.log(`${total} gear items -> ${path.relative(process.cwd(), OUT)}`);
for (const [group, list] of Object.entries(gear)) {
  const withMaterial = list.filter((i) => i.material).length;
  console.log(`  ${group.padEnd(10)} ${String(list.length).padStart(3)} items, ${withMaterial} with a material`);
}
console.log(`  dropped ${dropped.length} with no effect text`);
if (collisions.length) {
  console.warn(`  ! ${collisions.length} name collision(s); one of each pair is unreachable by name:`);
  for (const line of collisions) console.warn(`    ${line}`);
}
if (REPORT) for (const line of dropped) console.log(`  - ${line}`);
