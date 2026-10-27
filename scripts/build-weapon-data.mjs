// Usage: node scripts/build-weapon-data.mjs [--report] [--regen-specials]  -> src/data/content/weapons-<group>.json
// Merges into the curated files: the wiki leaves 86 Damage Type cells blank and has no structured specials.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { patchedEquipment } from './wiki-patches.mjs';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const CONTENT = path.resolve('src/data/content');
const REPORT = process.argv.includes('--report');
const REGEN_SPECIALS = process.argv.includes('--regen-specials');

const FILES = {
  Sword: 'swords',
  Axe: 'axes',
  Polearm: 'polearms',
  Gun: 'guns',
  Fist: 'fists',
  Bow: 'bows',
  Dagger: 'daggers',
  Tome: 'tomes',
};

// Each is the sentence the wiki states once in that page's prose. Tomes "come in a variety of elements", so none.
const DEFAULT_DAMAGE = {
  Bow: 'Pierce',
  Fist: 'Blunt',
  Polearm: 'Pierce',
  Sword: 'Slash',
  Axe: 'Slash',
  Gun: 'Pierce',
};

/** Fists are Blunt "with the Claws subtype usually dealing Slash instead". */
const SUBTYPE_DAMAGE = { Claw: 'Slash', Claws: 'Slash' };

/** The wiki misspells one scaling family on some rows. */
const SCALING_ALIASES = { Slyphid: 'Sylphid' };

const SCALING_TYPES = new Set([
  'Basic', 'Finesse', 'Cunning', 'Vampiric', 'Cold', 'Earthen', 'Darkness', 'Spiritual',
  'Aquatic', 'Electrical', 'Sylphid', 'Replica', 'Magical', 'Tool', 'Faithful', 'Flamelit',
  'Precision', 'Firearms',
  'Dextria-Lightning', 'Dextria-Sound', 'Dextria-Fire', 'Dextria-Water', 'Dextria-Wind',
  'Dextria-Light', 'Dextria-Earth', 'Dextria-Ice', 'Dextria-Dark',
]);

const STATS = new Set(['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san']);

const problems = [];
const note = (name, message) => problems.push(`${name}: ${message}`);

const plain = (text) =>
  String(text ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Percentages after several families are the total across them ("Electrical, Dextria-Lightning 50% WIL, 70% LUC").
// Null when the string does not reduce; Dynamic Tome writes its second stat as a literal `?`.
function parseScaling(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const head = text.split(/\s*\d/)[0].trim();
  const family = head.split(',')[0].trim();
  const type = SCALING_ALIASES[family] ?? family;
  if (!SCALING_TYPES.has(type)) return null;

  const tail = text.slice(head.length).trim();
  if (!/^(?:,?\s*\d+\s*%\s*[A-Za-z]{3}\s*)+$/.test(tail)) return null;

  const scaling = { type };
  for (const [, amount, stat] of tail.matchAll(/(\d+)\s*%\s*([A-Za-z]{3})/g)) {
    const key = stat.toLowerCase();
    if (!STATS.has(key)) return null;
    scaling[key] = Number(amount);
  }
  return Object.keys(scaling).length > 1 ? [scaling] : null;
}

function scalingTotals(entries) {
  const totals = {};
  for (const entry of entries ?? []) {
    for (const [key, amount] of Object.entries(entry)) {
      if (key !== 'type') totals[key] = (totals[key] ?? 0) + amount;
    }
  }
  return totals;
}

const sameTotals = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => (a[key] ?? 0) === (b[key] ?? 0));
};

// Curated per-family splits (Amplifyia) are kept when they sum to the wiki's total;
// a disagreement takes the wiki value and is reported.
function reconcileScaling(name, wiki, curated) {
  if (!wiki) return curated ?? null;
  if (!curated?.length) return wiki;

  const curatedTotals = scalingTotals(curated);
  const wikiTotals = scalingTotals(wiki);
  if (sameTotals(curatedTotals, wikiTotals)) return curated;

  const show = (totals) =>
    Object.entries(totals).map(([stat, amount]) => `${amount}% ${stat.toUpperCase()}`).join(' ') || 'nothing';
  note(name, `scaling disagrees: curated ${show(curatedTotals)}, wiki ${show(wikiTotals)}; took the wiki`);
  return wiki;
}

// Labels are usually `<u>Potential Skill: '''Muddle'''</u>` but sometimes plain (`Grants Skill: Crusader Charge`).
const SPECIAL_LABELS = {
  'potential skill': 'PotentialSkill',
  'grants skill': 'GrantsSkill',
  'grants attack': 'GrantsSkill',
  'grants spell': 'GrantsSkill',
  'special strike': 'SpecialStrike',
  set: 'SetBonus',
};

const LABELLED = new RegExp(
  `^(?:<u>)?\\s*(?:''')?\\s*(${Object.keys(SPECIAL_LABELS).join('|')})\\s*:?\\s*(?:''')?\\s*:?\\s*(.*?)\\s*(?:''')?\\s*(?:</u>)?$`,
  'i',
);

/** `<u>'''Double Dao'''</u>`: a named ability with no label in front of it. */
const BARE = /^<u>\s*'''\s*(.+?)\s*'''\s*<\/u>$/;

const CONSUMED = /^\s*(?:Damage Type|Rounds|Subtype)\s*:/i;

// The wiki writes costs on an italic line (`<i>3 Momentum, 30 FP</i>`) or in the first clause (`3M / 10 FP`).
function parseCost(text) {
  const cost = {};
  const momentum = /(\d+)\s*(?:M\b|Momentum)/i.exec(text);
  const fp = /(\d+)\s*FP\b/i.exec(text);
  if (momentum) cost.momentumCost = Number(momentum[1]);
  if (fp) cost.fpCost = Number(fp[1]);
  return cost;
}

// Prose before any marker is a passive; the closing italic flavour sentence is handled by the caller.
function parseSpecials(raw) {
  const text = String(raw ?? '').replace(/<i>[\s\S]*?<\/i>\s*$/i, '');
  const specials = [];
  const passives = [];
  let current = null;

  const close = () => {
    if (!current) return;
    const description = current.lines.join(' ').trim();
    if (description || current.type === 'SetBonus') {
      specials.push({
        name: current.name,
        type: current.type,
        description: description || current.name,
        ...parseCost(current.cost || description),
      });
    }
    current = null;
  };

  for (const segment of text.split(/<br\s*\/?>/i)) {
    const line = segment.trim();
    if (!line || CONSUMED.test(plain(line))) continue;

    const bare = BARE.exec(line);
    const labelled = bare ? null : LABELLED.exec(line);

    if (bare || (labelled && labelled[2])) {
      close();
      const name = plain(bare ? bare[1] : labelled[2]);
      // A "Set:" marker names the set; the bonus lines follow underneath it.
      const type = bare ? 'GrantsSkill' : SPECIAL_LABELS[labelled[1].toLowerCase()];
      current = { name: type === 'SetBonus' ? `${name} Set` : name, type, lines: [], cost: '' };
      continue;
    }

    const prose = plain(line);
    if (!prose) continue;

    if (current && !current.lines.length && /^<i>/i.test(line) && /momentum|FP/i.test(prose)) {
      current.cost = prose;
      continue;
    }
    if (current) current.lines.push(prose);
    else passives.push(prose);
  }
  close();

  return [
    ...passives.map((description) => ({ name: 'Passive', type: 'Passive', description })),
    ...specials,
  ];
}

const raw = await patchedEquipment(JSON.parse(await readFile(SOURCE, 'utf8')));
const weapons = raw.filter((item) => item.kind === 'Weapon' && FILES[item.group]);

const changes = { added: [], statChanged: [], orphaned: [] };
let total = 0;

for (const [group, filename] of Object.entries(FILES)) {
  const file = path.join(CONTENT, `weapons-${filename}.json`);
  const curated = new Map(JSON.parse(await readFile(file, 'utf8')).map((w) => [w.name, w]));
  const rows = weapons.filter((item) => item.group === group);
  const built = [];

  for (const item of rows) {
    const previous = curated.get(item.name);
    curated.delete(item.name);

    // `Rounds: N` is an effect line rather than a column; single-shot weapons omit it.
    const rounds = item.details.effects
      .map((effect) => /^Rounds:\s*(\d+)/i.exec(effect)?.[1])
      .find(Boolean);

    const subtype = item.details.subtype || previous?.subtype;
    const damageType =
      item.details.damageType ||
      previous?.damageType ||
      SUBTYPE_DAMAGE[subtype] ||
      DEFAULT_DAMAGE[group];
    if (!damageType) note(item.name, 'no damage type on the wiki, in the curated record, or by group');

    const parsed = parseScaling(item.scaling);
    if (!parsed && !previous?.scaling?.length) note(item.name, `unparseable scaling "${item.scaling}" and no curated fallback`);
    else if (!parsed) note(item.name, `unparseable scaling "${item.scaling}"; kept the curated record`);
    const scaling = reconcileScaling(item.name, parsed, previous?.scaling);

    const specials = REGEN_SPECIALS || !previous?.specials?.length
      ? parseSpecials(item.details.raw)
      : previous.specials;

    // Report on the blank wiki cell, not the fallback: a previous run's stand-in reads back as curated.
    const stat = (field, column) => {
      if (item[column] != null) return item[column];
      const fallback = previous?.[field] ?? 0;
      note(item.name, `wiki states no ${field}; using ${fallback}`);
      return fallback;
    };

    const weapon = {
      id: item.id,
      name: item.name,
      rarity: stat('rarity', 'rarity'),
      weaponType: group,
      ...(subtype ? { subtype } : {}),
      range: stat('range', 'range'),
      power: stat('power', 'power'),
      accuracy: stat('accuracy', 'accuracy'),
      critical: stat('critical', 'critRate'),
      criticalDamage: stat('criticalDamage', 'critDamage'),
      weight: stat('weight', 'weight'),
      damageType: damageType ?? 'Slash',
      ...(rounds ? { rounds: Number(rounds) } : {}),
      scaling,
      ...(specials.length ? { specials } : {}),
      description: item.details.flavour || previous?.description || '',
      location: item.location.length ? item.location : (previous?.location ?? []),
    };

    if (!previous) changes.added.push(`${group}: ${item.name}`);
    else {
      const moved = ['rarity', 'range', 'power', 'accuracy', 'critical', 'criticalDamage', 'weight']
        .filter((key) => previous[key] !== weapon[key])
        .map((key) => `${key} ${previous[key]}→${weapon[key]}`);
      if (moved.length) changes.statChanged.push(`${group}: ${item.name} (${moved.join(', ')})`);
    }
    built.push(weapon);
  }

  // A curated weapon missing from the scrape is kept: likely a rename, and saved builds reference it.
  for (const leftover of curated.values()) {
    built.push(leftover);
    changes.orphaned.push(`${group}: ${leftover.name}`);
  }

  built.sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name));
  await writeFile(file, `${JSON.stringify(built, null, 2)}\n`, 'utf8');
  total += built.length;
  console.log(`  ${String(built.length).padStart(3)}  weapons-${filename}.json`);
}

console.log(`\n✓ ${total} weapons across ${Object.keys(FILES).length} files`);
console.log(`  ${changes.added.length} added, ${changes.statChanged.length} restated, ${changes.orphaned.length} kept without a wiki row`);

if (REPORT) {
  const section = (title, list) => {
    if (!list.length) return;
    console.log(`\n${title} (${list.length}):`);
    for (const line of list) console.log(`  ${line}`);
  };
  section('Added from the wiki', changes.added);
  section('Stats restated from the wiki', changes.statChanged);
  section('Kept, but no longer on the wiki', changes.orphaned);
}

if (problems.length) {
  console.warn(`\n${problems.length} rows needed a fallback:`);
  for (const problem of problems) console.warn(`  ${problem}`);
}
