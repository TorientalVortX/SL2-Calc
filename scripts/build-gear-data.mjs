/**
 * Builds the hands, legs and accessory item records the calculator loads.
 *
 *   wiki-data/raw/equipment.json  ->  src/data/content/gear.json
 *
 * These are equipment slots 3 to 6. They are kept apart from `armors.json`
 * because they are a different kind of thing: the wiki gives them **no Armor,
 * Magic Armor, Evade or Weight columns at all**, so there is nothing to put in an
 * armour record. Everything one of these items does is written in prose, which
 * `build-item-effects.mjs` turns into numbers afterwards.
 *
 * That is also why this script does not try to parse magnitudes itself. It keeps
 * each item's effect lines as the wiki wrote them and leaves the reading of
 * "+2 SKI" or "UL/2" to the one place that already knows how.
 *
 *   node scripts/build-gear-data.mjs
 *   node scripts/build-gear-data.mjs --report   # list what was dropped and why
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const OUT = path.resolve('src/data/content/gear.json');
const REPORT = process.argv.includes('--report');

/**
 * Scraped `group` -> the group the calculator files it under.
 *
 * Shields stay separate from the rest of Hands because they are their own wiki
 * page and every one of them grants the Guard skill, which is worth being able
 * to filter on. Both still occupy slot 3.
 */
const GROUPS = {
  Hands: { group: 'Hands', slot: 3 },
  /*
   * The Shields page states the material once for the whole page ("All shields
   * are made of Metal") instead of repeating it on every row, so only one of
   * the twenty carries its own. `defaultMaterial` fills the rest in. A row that
   * does state one still wins: Blue Iron Shield is specifically Iron.
   */
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
  /*
   * An item with no effect line has nothing to contribute and nothing to show:
   * these slots carry no stat columns, so effect text is the entire record.
   */
  if (!effects.length) {
    dropped.push(`${item.name} (${mapped.group}): no effect text`);
    continue;
  }

  /*
   * Names are the key the calculator equips by, matching `ARMORS`. A collision
   * would make one of the two unreachable, so it is reported rather than left to
   * overwrite silently.
   */
  if (seen.has(item.name)) collisions.push(`${item.name}: ${seen.get(item.name)} and ${mapped.group}`);
  else seen.set(item.name, mapped.group);

  gear[mapped.group].push({
    id: item.id,
    name: item.name,
    slot: mapped.slot,
    rarity: item.rarity ?? 1,
    // The crafting material class, which decides what materials the piece takes
    // and which class effects it satisfies (Void Assassin's Voidveil wants Cloth).
    ...((item.details.material || mapped.defaultMaterial)
      ? { material: item.details.material || mapped.defaultMaterial }
      : {}),
    // Joined for the effect parser, which reads one description per item, and
    // kept line-by-line for display.
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
