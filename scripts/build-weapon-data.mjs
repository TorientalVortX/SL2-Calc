/**
 * Builds the slot-1 weapon records the calculator loads.
 *
 *   wiki-data/raw/equipment.json  ->  src/data/content/weapons-<group>.json
 *
 *   node scripts/build-weapon-data.mjs
 *   node scripts/build-weapon-data.mjs --report          # what changed, and why
 *   node scripts/build-weapon-data.mjs --regen-specials  # rebuild specials too
 *
 * Every other data family already had a builder (armour, gear, skills, races,
 * statuses), and the weapon files were the one set still maintained by hand.
 * They had drifted a long way from the wiki by the time this was written: 28
 * weapons missing outright, of which 16 were guns, so no gun above rank 7
 * existed in the calculator at all.
 *
 * # Why this merges instead of overwriting
 *
 * A straight regeneration would be a regression, because the scrape is not a
 * superset of what is already here. Two things live only in the hand-written
 * files:
 *
 *   - **Damage types.** 86 weapons have a blank Damage Type cell, because the
 *     wiki states it once in the page's prose ("almost all deal Pierce Damage")
 *     rather than on every row. The curated files carry the real value.
 *   - **Structured specials.** The wiki writes a weapon's abilities as one
 *     `<br>`-separated run of prose. The curated records split that into typed
 *     entries with the momentum and FP costs pulled out.
 *
 * So the wiki wins on everything it actually states (the numeric columns,
 * scaling, subtype, rounds, location), and the curated record is kept for the
 * fields the wiki leaves blank. Specials are generated only for weapons that do
 * not already have them, unless `--regen-specials` says otherwise.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = path.resolve('wiki-data/raw/equipment.json');
const CONTENT = path.resolve('src/data/content');
const REPORT = process.argv.includes('--report');
const REGEN_SPECIALS = process.argv.includes('--regen-specials');

/** Scraped `group` -> the `weapons-<name>.json` it is written to. */
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

/**
 * The damage type to assume when both the wiki cell and the curated record are
 * blank.
 *
 * These are not guesses; each is the sentence the wiki puts in that page's prose
 * instead of repeating itself on every row. Tomes are deliberately absent: their
 * prose says they "come in a variety of elements", which is not a default, so a
 * blank tome is reported rather than filled in.
 */
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

/** Scaling families the `WeaponScaling` union accepts. */
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

/* -------------------------------------------------------------------- text */

/** Strips the wiki's inline markup down to readable prose. */
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

/* ----------------------------------------------------------------- scaling */

/**
 * Turns `"Darkness 70% GUI 40% RES"` into `[{ type: 'Darkness', gui: 70, res: 40 }]`.
 *
 * The head of the string is the scaling family, and several weapons list more
 * than one: "Electrical, Dextria-Lightning 50% WIL, 70% LUC". **The percentages
 * that follow are the total across those families, not one set per family**: no
 * scaling string on the wiki names the same stat twice, and the curated records
 * that split a weapon per family always sum back to exactly these figures.
 *
 * So this returns a single entry carrying the total, which is the right answer
 * for `scalingForWeapon`; it sums every entry. The first family is taken as the
 * record's type, which keeps `type` inside the union `WeaponScaling` declares.
 * Where a curated record already splits the total across its families, the
 * caller keeps that richer form; see `reconcileScaling`.
 *
 * Returns null when the string does not reduce cleanly, so the caller can fall
 * back to the curated record rather than emit a half-parsed one. Dynamic Tome is
 * the live case: the wiki writes its second stat as a literal `?`.
 */
function parseScaling(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const head = text.split(/\s*\d/)[0].trim();
  const family = head.split(',')[0].trim();
  const type = SCALING_ALIASES[family] ?? family;
  if (!SCALING_TYPES.has(type)) return null;

  const tail = text.slice(head.length).trim();
  // Every remaining token must be an `N% STAT` pair; anything else means the
  // row says something this parser does not understand.
  if (!/^(?:,?\s*\d+\s*%\s*[A-Za-z]{3}\s*)+$/.test(tail)) return null;

  const scaling = { type };
  for (const [, amount, stat] of tail.matchAll(/(\d+)\s*%\s*([A-Za-z]{3})/g)) {
    const key = stat.toLowerCase();
    if (!STATS.has(key)) return null;
    scaling[key] = Number(amount);
  }
  return Object.keys(scaling).length > 1 ? [scaling] : null;
}

/** Totals a scaling array the way `scalingForWeapon` does, for comparison. */
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

/**
 * Chooses between the wiki's scaling and the curated record's.
 *
 * 32 weapons are written in the curated files as several entries, one per
 * scaling family, Amplifyia is `Electrical 25% WIL / 35% LUC` plus
 * `Dextria-Lightning 25% WIL / 35% LUC`. That split is real information the wiki
 * does not carry, since the wiki only ever states the combined figure, so
 * flattening those to the single entry parsed here would throw it away for no
 * gain: both forms sum to the same thing and summing is all the calculator does.
 *
 * The curated form is therefore kept whenever it agrees with the wiki's total.
 * When the two disagree the wiki wins, because that is the whole point of a
 * scrape-driven build, but it is reported rather than applied quietly, since a
 * disagreement is as likely to be a curated correction as a stale figure.
 */
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

/* ---------------------------------------------------------------- specials */

/**
 * The labels the wiki puts in front of a named ability, and the `WeaponSpecial`
 * type each one becomes.
 *
 * The markup is inconsistent about these: most are underlined and bolded
 * (`<u>Potential Skill: '''Muddle'''</u>`) but some are written plainly
 * (`Grants Skill: Crusader Charge`), so the tags are optional in the pattern.
 */
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

/** Lines the caller has already turned into their own fields. */
const CONSUMED = /^\s*(?:Damage Type|Rounds|Subtype)\s*:/i;

/**
 * Reads the momentum and FP an ability costs.
 *
 * The wiki writes this two ways: on its own italic line under the name
 * (`<i>3 Momentum, 30 FP</i>`) or folded into the description's first clause
 * (`3M / 10 FP`). Both forms are searched, and a cost is only reported when the
 * text actually states one.
 */
function parseCost(text) {
  const cost = {};
  const momentum = /(\d+)\s*(?:M\b|Momentum)/i.exec(text);
  const fp = /(\d+)\s*FP\b/i.exec(text);
  if (momentum) cost.momentumCost = Number(momentum[1]);
  if (fp) cost.fpCost = Number(fp[1]);
  return cost;
}

/**
 * Splits a Details cell into typed `WeaponSpecial` records.
 *
 * The cell is one `<br>`-separated run holding three different kinds of thing:
 * the labelled fields the caller has already taken, free prose describing an
 * always-on effect, and named abilities introduced by a marker line. A marker
 * opens a new special and everything up to the next marker is its description.
 * Prose that appears before any marker is a passive.
 *
 * The closing italic sentence is the weapon's flavour text and is handled by the
 * caller, so it is dropped here rather than becoming a special.
 */
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

    // The italic line directly under a marker is that ability's cost.
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

/* -------------------------------------------------------------------- main */

const raw = JSON.parse(await readFile(SOURCE, 'utf8'));
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

    /*
     * `Rounds: N` is an effect line rather than a column, so it is read out of
     * the effects list. Weapons that fire once do not state it.
     */
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

    /*
     * A blank numeric cell is the wiki declining to state a value, not a zero,
     * but the record has to carry a number for the calculator to work with.
     *
     * The report fires on the wiki cell being blank rather than on the fallback
     * being taken, and that distinction matters: once a run has written its
     * stand-in, the next run reads that back as the curated value and could no
     * longer tell it apart from a figure the wiki actually states. Keying off
     * the source means the warning survives every rebuild.
     */
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
      ...(previous?.optimizationPolicy ? { optimizationPolicy: previous.optimizationPolicy } : {}),
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

  /*
   * A curated weapon the scrape did not return is kept rather than deleted. It
   * is far more likely to be a page rename or a row the parser skipped than
   * proof the weapon left the game, and dropping it would break any saved build
   * that references it.
   */
  for (const leftover of curated.values()) {
    built.push(leftover);
    changes.orphaned.push(`${group}: ${leftover.name}`);
  }

  built.sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name));
  await writeFile(file, `${JSON.stringify(built, null, 2)}\n`, 'utf8');
  total += built.length;
  console.log(`  ${String(built.length).padStart(3)}  weapons-${filename}.json`);
}

/* ------------------------------------------------------------------ report */

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
