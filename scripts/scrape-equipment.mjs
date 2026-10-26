// Usage: node scripts/scrape-equipment.mjs [--discover] [--refresh]  -> wiki-data/equipment/
// The wiki has no equipment categories; index pages are found by what transcludes the three table templates.
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WIKI = 'https://sl2.miraheze.org';
const OUT = path.resolve('wiki-data/equipment');
const RAW = path.resolve('wiki-data/raw');
const CACHE = path.resolve('.wiki-cache');

const DISCOVER_ONLY = process.argv.includes('--discover');
const REFRESH = process.argv.includes('--refresh');

/** The API caps `titles` at 50 for anonymous callers. */
const BATCH = 50;

const TABLE_TEMPLATES = {
  'Template:WeaponTable': 'weapon',
  'Template:ArmorTable': 'armor',
  'Template:AccessoryTable': 'accessory',
};

// Several non-equipment pages transclude `AccessoryTable` (materials, catalysts, star graphs); "Item List New" aggregates all.
const SLOTS = {
  // Slot 1, and optionally slot 3 as a secondary weapon.
  Swords: { slot: 1, kind: 'Weapon', group: 'Sword' },
  Axes: { slot: 1, kind: 'Weapon', group: 'Axe' },
  Polearms: { slot: 1, kind: 'Weapon', group: 'Polearm' },
  Guns: { slot: 1, kind: 'Weapon', group: 'Gun' },
  Fists: { slot: 1, kind: 'Weapon', group: 'Fist' },
  Bows: { slot: 1, kind: 'Weapon', group: 'Bow' },
  Daggers: { slot: 1, kind: 'Weapon', group: 'Dagger' },
  Tomes: { slot: 1, kind: 'Weapon', group: 'Tome' },
  Unarmored: { slot: 2, kind: 'Armor', group: 'Unarmored' },
  'Light Armor': { slot: 2, kind: 'Armor', group: 'Light' },
  'Heavy Armor': { slot: 2, kind: 'Armor', group: 'Heavy' },
  // Slot 3. Shields are a subtype of Hands, on their own page.
  Hands: { slot: 3, kind: 'Hands', group: 'Hands' },
  Shields: { slot: 3, kind: 'Hands', group: 'Shield' },
  Legs: { slot: 4, kind: 'Legs', group: 'Legs' },
  Accessories: { slot: 5, kind: 'Accessory', group: 'Accessory' },
};

// Material effects are `Weapon:`, `Armor:` and `Other:` clauses; `Other:` is the hands/legs/accessory profile.
// "Item Materials" is skipped: it transcludes these four pages, so it would duplicate every material.
const MATERIAL_PAGES = {
  Hard: 'Hard',
  Wood: 'Woods',
  Pages: 'Chapters',
  Cloth: 'Cloth',
};

/** Catalysts apply enchantments; the slots they accept are named per catalyst. */
const CATALYST_PAGES = ['Catalysts'];

const SLOT_LABELS = {
  1: 'Slot 1: Primary weapon (or slot 3 as a secondary)',
  2: 'Slot 2: Armor',
  3: 'Slot 3: Hands',
  4: 'Slot 4: Legs',
  5: 'Slots 5 & 6: Accessories',
};

// Cloudflare parks headless Chromium on an endless "Just a moment..." page; headed without the
// automation flag passes, and the clearance cookie is persisted.
await mkdir(CACHE, { recursive: true });
const STATE = path.join(CACHE, 'cf-state.json');
const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  storageState: await readFile(STATE, 'utf8').then(JSON.parse).catch(() => undefined),
});
const page = await context.newPage();

async function clearChallenge() {
  if (!/Just a moment|Checking your connection/i.test(await page.title())) return true;
  try {
    await page.waitForFunction(() => !/Just a moment|Checking your connection/i.test(document.title), { timeout: 40000 });
    await context.storageState({ path: STATE });
    return true;
  } catch {
    return false;
  }
}

let blockedUntil = 0;

// Navigating rather than fetching gets past Cloudflare; the JSON is rendered into a `<pre>`.
async function api(params, cacheKey) {
  const file = path.join(CACHE, `api-${createHash('sha1').update(cacheKey).digest('hex').slice(0, 16)}.json`);
  if (!REFRESH) {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch {
      /* not cached */
    }
  }

  const query = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const url = `${WIKI}/w/api.php?${query}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = blockedUntil - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const status = response?.status() ?? 0;
    // A 429 here is usually just the challenge being served; it clears itself.
    if (!(await clearChallenge())) {
      const backoff = 30000 * 2 ** attempt;
      blockedUntil = Math.max(blockedUntil, Date.now() + backoff);
      console.warn(`  … challenge did not clear (status ${status}), backing off ${Math.round(backoff / 1000)}s`);
      continue;
    }
    const body = await page.evaluate(() => document.body.innerText);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error(`API returned non-JSON (status ${status}): ${body.slice(0, 200)}`);
    }
    await writeFile(file, JSON.stringify(parsed), 'utf8');
    await page.waitForTimeout(400);
    return parsed;
  }
  throw new Error('Gave up: the wiki is rate limiting every request.');
}

async function discover() {
  const found = new Map();
  for (const [template, shape] of Object.entries(TABLE_TEMPLATES)) {
    const data = await api(
      { action: 'query', prop: 'transcludedin', titles: template, tilimit: '500', tinamespace: '0' },
      `ti:${template}`,
    );
    const pages = data.query?.pages?.[0]?.transcludedin ?? [];
    console.log(`  ${template} -> ${pages.length} pages`);
    for (const { title } of pages) {
      // "Item List New" repeats every table; scraping it duplicates every item without a slot.
      if (title === 'Item List New') continue;
      found.set(title, shape);
    }
  }
  return found;
}

async function fetchWikitext(titles) {
  const pages = new Map();
  for (let i = 0; i < titles.length; i += BATCH) {
    const slice = titles.slice(i, i + BATCH);
    console.log(`  wikitext ${i + 1}-${i + slice.length} of ${titles.length}`);
    const data = await api(
      { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: slice.join('|') },
      `wikitext:${slice.join('|')}`,
    );
    for (const entry of data.query?.pages ?? []) {
      if (entry.missing) continue;
      const content = entry.revisions?.[0]?.slots?.main?.content;
      if (content) pages.set(entry.title, content);
    }
  }
  return pages;
}

const plain = (text) =>
  String(text ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Renderers drop punctuation rather than replace it: "Boulder's Ring" anchors as `boulders-ring`, unlike `slug`.
const anchor = (s) =>
  String(s).toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

/** `<!-- Magic Armor -->` and `<!-- Crit Dmg -->` collapse to one lookup key. */
const key = (label) => label.toLowerCase().replace(/[^a-z0-9]/g, '');

// The wiki spells some columns two ways ("Crit Dmg"/"Critical Damage", "Subtype"/"Sub Type").
const COLUMNS = {
  rarity: 'rarity',
  name: 'name',
  range: 'range',
  power: 'power',
  accuracy: 'accuracy',
  critrate: 'critRate',
  criticalrate: 'critRate',
  critdmg: 'critDamage',
  criticaldamage: 'critDamage',
  critdamage: 'critDamage',
  weight: 'weight',
  scaling: 'scaling',
  armor: 'armor',
  magicarmor: 'magicArmor',
  evade: 'evade',
  details: 'details',
  location: 'location',
};

const SHAPE_FIELDS = {
  weapon: ['rarity', 'name', 'range', 'power', 'accuracy', 'critRate', 'critDamage', 'weight', 'scaling', 'details', 'location'],
  armor: ['rarity', 'name', 'armor', 'magicArmor', 'evade', 'weight', 'details', 'location'],
  accessory: ['rarity', 'name', 'details', 'location'],
};

const NUMERIC = new Set(['rarity', 'range', 'power', 'accuracy', 'critRate', 'critDamage', 'weight', 'armor', 'magicArmor', 'evade']);

const num = (raw) => {
  const match = /-?\d+(?:\.\d+)?/.exec(String(raw ?? ''));
  return match ? Number(match[0]) : null;
};

// Each cell starts with an HTML comment naming its column, the only reliable delimiter (a bare `|` splits links).
// The pipe after a comment sometimes sits on the next line.
function parseRows(wikitext) {
  // Rows are everything outside the <noinclude> blocks (prose and header on top, table close at the bottom).
  const body = wikitext.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '');

  const rows = [];
  for (const chunk of body.split(/^\s*\|-\s*$/m).slice(1)) {
    const fields = {};
    const unknown = [];
    for (const [, label, value] of chunk.matchAll(/<!--\s*([^>]*?)\s*-->\s*\|?([\s\S]*?)(?=<!--|$)/g)) {
      const field = COLUMNS[key(label)];
      if (!field) {
        if (label.trim()) unknown.push(label.trim());
        continue;
      }
      fields[field] = value.trim();
    }
    // A chunk with no name is a stray separator, not an item.
    if (!fields.name?.trim()) continue;
    rows.push({ fields, unknown });
  }
  return rows;
}

/** A line that is nothing but italics, the wiki's flavour text. */
const ITALIC_ONLY = /^\s*(?:<i>[\s\S]*<\/i>|''[\s\S]*'')\s*$/i;

// Only explicitly labelled parts (`'''Material:''' Cloth`) are lifted out; `raw` keeps the original.
function parseDetails(raw) {
  const text = String(raw ?? '').trim();
  const out = { material: '', damageType: '', subtype: '', effects: [], flavour: '', raw: text };
  if (!text) return out;

  const LABELS = [
    [/^material$/, 'material'],
    [/^damagetype$/, 'damageType'],
    [/^subtype$/, 'subtype'],
  ];

  for (const line of text.split(/<br\s*\/?>/i)) {
    if (!line.trim()) continue;
    if (ITALIC_ONLY.test(line)) {
      const flavour = plain(line);
      if (flavour) out.flavour += (out.flavour ? ' ' : '') + flavour;
      continue;
    }
    const stripped = plain(line);
    if (!stripped) continue;

    const labelled = /^([A-Za-z ]{3,14}):\s*(.+)$/.exec(stripped);
    const field = labelled && LABELS.find(([re]) => re.test(key(labelled[1])))?.[1];
    if (field && !out[field]) {
      out[field] = labelled[2].trim();
      continue;
    }
    out.effects.push(stripped);
  }
  return out;
}

// An unlabelled line belongs to the clause above ("Reduces the cost of Aquarian domain spells by 2").
// Bold labels not in `labels` (`'''On Battle Start:'''`) do not split.
function parseClauses(raw, labels) {
  const text = String(raw ?? '').trim();
  const out = { flavour: '', raw: text };

  const body = text.replace(/<i>([\s\S]*?)<\/i>\s*$/i, (_, f) => {
    out.flavour = plain(f);
    return '';
  });

  // Some catalysts fold a sub-label into the bold span (`'''Enchant Info: Weapon:'''`).
  const pattern = new RegExp(`'''\\s*(${labels.join('|')})\\s*:?\\s*([^']*?)'''\\s*:?`, 'gi');
  const marks = [...body.matchAll(pattern)];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    const value = plain(`${marks[i][2] ?? ''} ${body.slice(start, end)}`);
    const field = key(marks[i][1]);
    out[field] = out[field] ? `${out[field]} ${value}` : value;
  }
  return out;
}

// `all` applies in every role on top of the material's own clauses; `macabre` is an element tag carried by Remains.
const parseMaterial = (raw) => parseClauses(raw, ['Weapon', 'Armor', 'Other', 'All', 'Macabre']);

const parseCatalyst = (raw) => parseClauses(raw, ['Can Enchant', 'Enchant Info']);

const parseLocation = (raw) =>
  String(raw ?? '')
    .split('\n')
    .map((line) => plain(line.replace(/^\s*\*+\s*/, '')))
    .filter(Boolean);

console.log('→ discovering equipment index pages');
const discovered = await discover();

const scrapeable = [...discovered].filter(([title]) => SLOTS[title]);
const materialPages = [...discovered].map(([t]) => t).filter((t) => MATERIAL_PAGES[t]);
const catalystPages = [...discovered].map(([t]) => t).filter((t) => CATALYST_PAGES.includes(t));
const unmapped = [...discovered]
  .map(([title]) => title)
  .filter((t) => !SLOTS[t] && !MATERIAL_PAGES[t] && !CATALYST_PAGES.includes(t));

console.log(
  `\n${scrapeable.length} equipment pages, ${materialPages.length} material pages, ` +
    `${catalystPages.length} catalyst pages, ${unmapped.length} other`,
);
if (unmapped.length) console.log(`  neither a slot nor a modifier, skipped: ${unmapped.join(', ')}`);

if (DISCOVER_ONLY) {
  for (const [title, shape] of scrapeable) {
    const { slot, kind, group } = SLOTS[title];
    console.log(`  slot ${slot}  ${kind.padEnd(9)} ${group.padEnd(10)} ${title} (${shape} table)`);
  }
  await browser.close();
  process.exit(0);
}

const missing = Object.keys(SLOTS).filter((title) => !discovered.has(title));
if (missing.length) console.warn(`  ! expected pages that no longer transclude a table template: ${missing.join(', ')}`);

console.log('\n→ fetching wikitext');
const wikitext = await fetchWikitext([
  ...scrapeable.map(([title]) => title),
  ...materialPages,
  ...catalystPages,
]);
console.log(`  ${wikitext.size} pages returned content`);

const pages = [];
const items = [];
const problems = [];

for (const [title, shape] of scrapeable) {
  const content = wikitext.get(title);
  if (!content) {
    problems.push({ page: title, note: 'page returned no content' });
    continue;
  }
  const { slot, kind, group } = SLOTS[title];
  const rows = parseRows(content);
  const expected = SHAPE_FIELDS[shape];

  const parsed = rows.map(({ fields, unknown }) => {
    const item = {
      id: `${kind.toLowerCase()}:${slug(group)}:${slug(plain(fields.name))}`,
      name: plain(fields.name),
      slot,
      kind,
      group,
      page: title,
    };
    for (const field of expected) {
      if (field === 'name' || field === 'details' || field === 'location') continue;
      const raw = fields[field];
      // A blank cell (null) is the wiki leaving it out; an absent column stays undefined.
      if (raw === undefined) continue;
      item[field] = NUMERIC.has(field) ? num(raw) : plain(raw);
    }
    item.details = parseDetails(fields.details);
    item.location = parseLocation(fields.location);

    if (unknown.length) problems.push({ page: title, item: item.name, note: `unrecognised column(s): ${unknown.join(', ')}` });
    for (const field of expected) {
      if (fields[field] === undefined) problems.push({ page: title, item: item.name, note: `missing column: ${field}` });
    }
    return item;
  });

  const intro = plain((content.split(/^==/m)[0] ?? '').replace(/<noinclude>/i, ''));

  pages.push({ title, shape, slot, kind, group, intro, items: parsed });
  items.push(...parsed);
  console.log(`  ${String(parsed.length).padStart(4)}  ${title}`);
}

function parseModifierPage(title, parse) {
  const content = wikitext.get(title);
  if (!content) {
    problems.push({ page: title, note: 'page returned no content' });
    return [];
  }
  return parseRows(content).map(({ fields }) => ({
    name: plain(fields.name),
    rarity: num(fields.rarity),
    page: title,
    ...parse(fields.details),
    location: parseLocation(fields.location),
  }));
}

const otherColumn = (m) =>
  [m.other, m.all ? `_All:_ ${m.all}` : ''].filter(Boolean).join(' ') || '—';

const materials = [];
for (const title of materialPages) {
  const rows = parseModifierPage(title, parseMaterial).map((m) => ({
    id: `material:${slug(MATERIAL_PAGES[title])}:${slug(m.name)}`,
    materialClass: MATERIAL_PAGES[title],
    ...m,
    // Without the `All:` clause, a consumer that reads only `other` would miss those materials.
    appliesToAll: Boolean(m.all),
  }));
  materials.push(...rows);
  const withOther = rows.filter((m) => m.other || m.all).length;
  console.log(`  ${String(rows.length).padStart(4)}  ${title} (${withOther} state an Other/All profile)`);
}

const catalysts = [];
for (const title of catalystPages) {
  const rows = parseModifierPage(title, parseCatalyst).map((c) => ({
    id: `catalyst:${slug(c.name)}`,
    ...c,
    /** Slots this catalyst will enchant, as written ("Weapons, Legs"). */
    slots: (c.canenchant ?? '')
      .split(/,|\band\b/)
      .map((s) => s.trim())
      .filter(Boolean),
    enchantInfo: c.enchantinfo ?? '',
  }));
  catalysts.push(...rows);
  console.log(`  ${String(rows.length).padStart(4)}  ${title}`);
}

for (const m of materials) {
  if (!m.other && !m.all) problems.push({ page: m.page, item: m.name, note: 'no Other/All profile stated' });
}
for (const c of catalysts) {
  // A catalyst with neither clause is a remover ("wipes away any beneficial enchantments"), not a parse miss.
  if (!c.slots.length && c.enchantInfo) {
    problems.push({ page: c.page, item: c.name, note: 'has Enchant Info but no Can Enchant slots' });
  }
}

await mkdir(OUT, { recursive: true });
await mkdir(RAW, { recursive: true });

const scrapedAt = new Date().toISOString().slice(0, 10);
const sourceUrl = (title) => `${WIKI}/wiki/${title.replace(/ /g, '_')}`;

const frontmatter = (obj) =>
  ['---', ...Object.entries(obj).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`), '---'].join('\n');

// Some accessory effect texts run to several hundred words; `raw` in the JSON sidecar is never abbreviated.
function summarise(text, max = 90) {
  const s = String(text ?? '').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')} …`;
}

const TABLE_COLUMNS = {
  weapon: [
    ['Rarity', (i) => i.rarity], ['Name', (i) => `[${i.name}](#${anchor(i.name)})`], ['Range', (i) => i.range],
    ['Power', (i) => i.power], ['Accuracy', (i) => i.accuracy], ['Crit', (i) => i.critRate],
    ['Crit Dmg', (i) => i.critDamage], ['Weight', (i) => i.weight], ['Scaling', (i) => i.scaling],
  ],
  armor: [
    ['Rarity', (i) => i.rarity], ['Name', (i) => `[${i.name}](#${anchor(i.name)})`], ['Armor', (i) => i.armor],
    ['Magic Armor', (i) => i.magicArmor], ['Evade', (i) => i.evade], ['Weight', (i) => i.weight],
    ['Material', (i) => i.details.material],
  ],
  accessory: [
    ['Rarity', (i) => i.rarity], ['Name', (i) => `[${i.name}](#${anchor(i.name)})`],
    ['Material', (i) => i.details.material],
    ['Effects (abbreviated)', (i) => summarise(i.details.effects.join(' '))],
  ],
};

for (const p of pages) {
  const columns = TABLE_COLUMNS[p.shape];
  const sorted = [...p.items].sort((a, b) => a.name.localeCompare(b.name));

  const body = [
    frontmatter({
      title: p.title,
      slot: String(p.slot),
      kind: p.kind,
      group: p.group,
      item_count: String(p.items.length),
      source: sourceUrl(p.title),
      scraped: scrapedAt,
      confidence: 'strong',
    }),
    `# ${p.title}`,
    '',
    `**${SLOT_LABELS[p.slot]}.** ${p.items.length} items.`,
    '',
    p.intro,
    '',
    '## Quick reference',
    '',
    ...(p.shape === 'accessory'
      ? ['Effect text is abbreviated here to keep the table scannable; follow an item\'s name for the full text.', '']
      : []),
    `| ${columns.map(([h]) => h).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...sorted.map((i) => `| ${columns.map(([, read]) => cell(read(i) ?? '—') || '—').join(' | ')} |`),
    '',
    '## Items',
    '',
    ...sorted.flatMap((i) => {
      const facts = [
        ['Rarity', i.rarity == null ? '' : `${i.rarity}★`],
        ['Range', i.range], ['Power', i.power], ['Accuracy', i.accuracy == null ? '' : `${i.accuracy}%`],
        ['Critical rate', i.critRate == null ? '' : `${i.critRate}%`],
        ['Critical damage', i.critDamage == null ? '' : `${i.critDamage}%`],
        ['Armor', i.armor], ['Magic armor', i.magicArmor], ['Evade', i.evade],
        ['Weight', i.weight], ['Scaling', i.scaling],
        ['Material', i.details.material], ['Damage type', i.details.damageType], ['Subtype', i.details.subtype],
      ].filter(([, v]) => v != null && v !== '');
      return [
        `### ${i.name}`,
        '',
        ...facts.map(([k, v]) => `- **${k}:** ${v}`),
        '',
        ...(i.details.effects.length ? [...i.details.effects.map((e) => `- ${e}`), ''] : []),
        ...(i.details.flavour ? [`_${i.details.flavour}_`, ''] : []),
        ...(i.location.length ? [`**Found:** ${i.location.join(', ')}`, ''] : []),
      ];
    }),
    `[Wiki page](${sourceUrl(p.title)})`,
  ].join('\n');

  await writeFile(path.join(OUT, `${slug(p.title)}.md`), body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', 'utf8');
}

const byClass = new Map();
for (const m of materials) {
  if (!byClass.has(m.materialClass)) byClass.set(m.materialClass, []);
  byClass.get(m.materialClass).push(m);
}

await writeFile(
  path.join(OUT, 'materials.md'),
  [
    frontmatter({
      title: 'Item materials',
      material_count: String(materials.length),
      scraped: scrapedAt,
      confidence: 'strong',
    }),
    '# Item materials',
    '',
    `${materials.length} materials in ${byClass.size} classes. A material changes what a piece of`,
    'equipment does, and **what it changes depends on the kind of equipment it is applied to**.',
    'The wiki states that as up to three profiles per material:',
    '',
    '| Profile | Applies to |',
    '| --- | --- |',
    '| `Weapon` | Slot 1, and slot 3 when it holds an off-hand weapon |',
    '| `Armor` | Slot 2 |',
    '| `Other` | **Slots 3–6: hands, legs and accessories** |',
    '',
    'A material may also carry an `All` clause: an extra effect that applies in every one',
    'of those roles, **on top of** its own profiles. Those are shown below as _All:_.',
    '',
    'Equipment belongs to one material class and **cannot take a material of another class**.',
    '',
    ...[...byClass.entries()].flatMap(([cls, list]) => {
      const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
      return [
        `## ${cls}`,
        '',
        `${sorted.length} materials.`,
        '',
        '| Rarity | Material | Weapon | Armor | Other (slots 3–6) |',
        '| --- | --- | --- | --- | --- |',
        ...sorted.map(
          (m) =>
            `| ${m.rarity ?? '—'} | ${cell(m.name)} | ${cell(m.weapon) || '—'} | ${cell(m.armor) || '—'} | ${cell(otherColumn(m))} |`,
        ),
        '',
      ];
    }),
    '## Notes',
    '',
    '- `Macabre` on a Remains material is its element tag, not a slot profile.',
    '- "No effect." is the wiki stating the material does nothing in that role. It is not a blank.',
    `- Source pages: ${materialPages.map((t) => `[${t}](${sourceUrl(t)})`).join(', ')}.`,
  ].join('\n') + '\n',
  'utf8',
);

if (catalysts.length) {
  const sorted = [...catalysts].sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    path.join(OUT, 'catalysts.md'),
    [
      frontmatter({
        title: 'Catalysts',
        catalyst_count: String(catalysts.length),
        source: sourceUrl('Catalysts'),
        scraped: scrapedAt,
        confidence: 'strong',
      }),
      '# Catalysts',
      '',
      `${catalysts.length} catalysts. A catalyst is what applies an enchantment to a piece of`,
      'equipment, and each one names the slots it will accept, which is how an enchantment',
      'ends up restricted to, say, Torso and Hands.',
      '',
      '| Rarity | Catalyst | Can enchant | Effect |',
      '| --- | --- | --- | --- |',
      ...sorted.map(
        (c) =>
          `| ${c.rarity ?? '—'} | [${cell(c.name)}](#${anchor(c.name)}) | ${cell(c.slots.join(', ')) || '—'} | ${
            cell(summarise(c.enchantInfo, 70)) || '—'
          } |`,
      ),
      '',
      '## Catalysts',
      '',
      ...sorted.flatMap((c) => [
        `### ${c.name}`,
        '',
        `- **Rarity:** ${c.rarity == null ? '—' : `${c.rarity}★`}`,
        `- **Can enchant:** ${c.slots.join(', ') || '—'}`,
        '',
        c.enchantInfo || '_No enchantment text on the wiki._',
        '',
        ...(c.flavour ? [`_${c.flavour}_`, ''] : []),
        ...(c.location.length ? [`**Found:** ${c.location.join(', ')}`, ''] : []),
      ]),
      `[Wiki page](${sourceUrl('Catalysts')})`,
    ].join('\n') + '\n',
    'utf8',
  );
}

const bySlot = new Map();
for (const p of pages) {
  if (!bySlot.has(p.slot)) bySlot.set(p.slot, []);
  bySlot.get(p.slot).push(p);
}

await writeFile(
  path.join(OUT, '_index.md'),
  [
    frontmatter({
      title: 'Equipment',
      item_count: String(items.length),
      page_count: String(pages.length),
      scraped: scrapedAt,
      confidence: 'strong',
    }),
    '# Equipment',
    '',
    `${items.length} items across ${pages.length} wiki pages. A character has six equipment slots:`,
    '',
    '| Slot | Holds |',
    '| --- | --- |',
    '| 1 | Primary weapon |',
    '| 2 | Armor |',
    '| 3 | Hands, or a secondary weapon instead |',
    '| 4 | Legs |',
    '| 5, 6 | Accessories (two, but never two of the same one) |',
    '',
    ...[...bySlot.entries()]
      .sort((a, b) => a[0] - b[0])
      .flatMap(([slot, group]) => [
        `## ${SLOT_LABELS[slot]}`,
        '',
        '| Page | Group | Items |',
        '| --- | --- | --- |',
        ...group
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((p) => `| [${cell(p.title)}](${slug(p.title)}.md) | ${cell(p.group)} | ${p.items.length} |`),
        '',
      ]),
    '## Modifiers',
    '',
    '| Page | What it covers |',
    '| --- | --- |',
    `| [Item materials](materials.md) | ${materials.length} materials. Their \`Other\` profile is what a material does on slots 3–6. |`,
    `| [Catalysts](catalysts.md) | ${catalysts.length} catalysts: what applies an enchantment, and the slots each one accepts. |`,
    '',
    '## Notes',
    '',
    '- Slot 3 takes either a Hands item or a second weapon, so the weapon pages feed slots 1 and 3 both.',
    '- Shields are Hands equipment; every shield also grants the Guard skill.',
    '- `UL` in an item effect is the item\'s upgrade level.',
    '- Values are transcribed from the wiki without interpretation. A blank field means',
    '  the wiki left that cell blank, not that the value is zero.',
    ...(unmapped.length
      ? [`- These pages use the same table templates but are not equipment slots, so they are not scraped: ${unmapped.join(', ')}.`]
      : []),
  ].join('\n') + '\n',
  'utf8',
);

await writeFile(path.join(RAW, 'equipment.json'), JSON.stringify(items, null, 2), 'utf8');
await writeFile(path.join(RAW, 'item-materials.json'), JSON.stringify(materials, null, 2), 'utf8');
await writeFile(path.join(RAW, 'catalysts.json'), JSON.stringify(catalysts, null, 2), 'utf8');

console.log(`\n✓ ${items.length} items across ${pages.length} pages → ${path.relative(process.cwd(), OUT)}`);
for (const [slot, group] of [...bySlot.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  slot ${slot}: ${group.reduce((n, p) => n + p.items.length, 0)} items (${group.map((p) => p.group).join(', ')})`);
}
console.log(`  ${materials.length} materials in ${byClass.size} classes, ${catalysts.length} catalysts`);
console.log(`  raw/equipment.json, raw/item-materials.json, raw/catalysts.json`);

if (problems.length) {
  console.warn(`\n${problems.length} rows did not parse cleanly:`);
  const counts = new Map();
  for (const p of problems) {
    const label = `${p.page}: ${p.note}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  for (const [label, count] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.warn(`  ${String(count).padStart(4)}×  ${label}`);
  }
} else {
  console.log('\nEvery row matched its table shape.');
}

await browser.close();
