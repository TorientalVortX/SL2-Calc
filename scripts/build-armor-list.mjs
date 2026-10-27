// Usage: node scripts/build-armor-list.mjs  -> src/data/armors.json
// Torso armour comes from the wiki dump; wiki-data/armor-overlay.json holds only what the dump
// can't give us (structured bonuses, reworded details, short effect labels) and renames.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const OVERLAY = path.resolve('wiki-data/armor-overlay.json');
const OUT = path.resolve('src/data/armors.json');

const GROUPS = ['Heavy', 'Light', 'Unarmored'];
const FIELD_ORDER = ['id', 'name', 'armor', 'magicArmor', 'evade', 'weight', 'details', 'statBonuses', 'resistances', 'specialEffects', 'conditionalBonuses', 'rarity'];

const raw = JSON.parse(await readFile(SOURCE, 'utf8')).filter((item) => item.kind === 'Armor');
const overlay = JSON.parse(await readFile(OVERLAY, 'utf8'));

function baseArmor(item, renames) {
  const rename = renames[item.id] ?? {};
  return {
    id: rename.id ?? item.id,
    name: rename.name ?? item.name,
    armor: item.armor,
    magicArmor: item.magicArmor,
    evade: item.evade,
    weight: item.weight,
    details: (item.details?.effects ?? []).join(' '),
    rarity: item.rarity,
  };
}

function withOverlay(base, fields = {}) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return Object.fromEntries(FIELD_ORDER.filter((key) => key in merged).map((key) => [key, merged[key]]));
}

const armors = Object.fromEntries(GROUPS.map((group) => [group, []]));
const unknownGroups = [];
for (const item of raw) {
  if (!armors[item.group]) { unknownGroups.push(`${item.name} (${item.group})`); continue; }
  const base = baseArmor(item, overlay.renames);
  armors[item.group].push(withOverlay(base, overlay.armors[base.id]));
}
for (const list of Object.values(armors)) list.sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name));

const produced = new Set(Object.values(armors).flat().map((armor) => armor.id));
const staleOverlay = Object.keys(overlay.armors).filter((id) => !produced.has(id));

await writeFile(OUT, `${JSON.stringify(armors, null, 2)}\n`, 'utf8');
console.log(`${produced.size} armors -> ${path.relative(process.cwd(), OUT)}`);
for (const group of GROUPS) console.log(`  ${group.padEnd(10)} ${armors[group].length}`);
if (unknownGroups.length) console.warn(`  ! skipped, unknown group: ${unknownGroups.join(', ')}`);
if (staleOverlay.length) console.warn(`  ! overlay entries with no wiki armour: ${staleOverlay.join(', ')}`);
