/**
 * Scrapes the Sigrogana Legend 2 wiki (https://sl2.miraheze.org) into the
 * markdown corpus under `wiki-data/`.
 *
 * The wiki is the source of truth for skill numbers, class stat bonuses and
 * Youkai stats, none of which live in the calculator's own data files. Pages
 * are rendered in a real browser rather than fetched, so MediaWiki templates
 * (which supply most infobox values) are expanded before we read them.
 *
 *   node scripts/scrape-wiki.mjs            # full run
 *   node scripts/scrape-wiki.mjs --limit 5  # first 5 skills only, for a smoke test
 *   node scripts/scrape-wiki.mjs --refresh  # ignore the cache and refetch every page
 *
 * Fetched pages are cached under `.wiki-cache/` (gitignored), so iterating on the
 * markdown formatting costs no requests. Delete that directory or pass `--refresh`
 * to pick up wiki edits.
 *
 * Output is deterministic: rerunning overwrites `wiki-data/` in place so the
 * diff shows exactly what changed on the wiki since the last scrape.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WIKI = 'https://sl2.miraheze.org';
const OUT = path.resolve('wiki-data');
const CACHE = path.resolve('.wiki-cache');

/**
 * The wiki sits behind Cloudflare and starts returning 429 challenges if it is
 * hit too hard. A full run is ~1000 pages. Keep concurrency low, space requests
 * out, and cache every page so reruns cost nothing.
 */
const CONCURRENCY = 3;
const REQUEST_DELAY_MS = 250;

const argLimit = process.argv.indexOf('--limit');
const LIMIT = argLimit === -1 ? Infinity : Number(process.argv[argLimit + 1]);
const REFRESH = process.argv.includes('--refresh');

/* ------------------------------------------------------------------ utils */

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const wikiUrl = (title) => `${WIKI}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

/** Escapes the characters that would break a value inside a markdown table cell. */
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

// Note: article links are filtered by MediaWiki namespace prefix, not by "contains
// a colon", real skills are titled things like "Affinity: Fairy". The regex lives
// inside each in-page function, since those are serialised into the browser.

/**
 * Runs `worker(item, index, slot)` over `items` with at most `size` in flight.
 * `slot` is stable for the lifetime of a lane, so callers can bind one browser
 * page per lane. Two workers must never share a page or their navigations
 * abort each other.
 */
async function pool(items, worker, size = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async (_, slot) => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await worker(items[i], i, slot);
      }
    }),
  );
  return results;
}

/* --------------------------------------------------- in-page DOM extractor */

/**
 * Runs inside the browser. Returns a normalised view of one wiki article:
 * the infobox as label/value pairs, and the body as an ordered block list.
 *
 * Kept as a single function so it can be passed to page.evaluate() whole.
 */
function extractArticle() {
  const root = document.querySelector('#mw-content-text .mw-parser-output');
  if (!root) return null;

  const clean = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  // --- infobox -------------------------------------------------------------
  const box = root.querySelector('table.wikia-infobox');
  const infobox = { title: '', fields: [], flags: [], notes: [] };
  if (box) {
    const rows = [...box.querySelectorAll('tr')];
    // The title cell leads with an icon. When that image is a redlink the wiki
    // renders its alt text ("File:Gen_active.png") into the cell, so read the
    // bolded name and only fall back to the whole cell.
    infobox.title =
      clean(rows[0]?.querySelector('b')) ||
      clean(rows[0]).replace(/^File:\S+\.(png|webp|jpg|gif)\s*/i, '');
    for (const row of rows.slice(1)) {
      const cells = [...row.querySelectorAll('th,td')];
      if (!cells.length) continue;
      if (cells.every((c) => !clean(c) && !c.querySelector('img'))) continue;

      if (cells.length >= 2) {
        const label = clean(cells[0]);
        // The cost row has an empty label and stacks "3 M" / "13/15 FP" divs.
        const divs = [...cells[1].querySelectorAll('div')];
        const value = divs.length > 1 ? divs.map(clean).filter(Boolean).join(' | ') : clean(cells[1]);
        if (!label && !value) continue;
        if (!label) infobox.notes.push(value);
        else infobox.fields.push([label, value]);
      } else {
        // Single-cell rows are either icon flags ("Enemy Only") or italic
        // restrictions ("Sword only").
        const text = clean(cells[0]);
        if (!text) continue;
        if (cells[0].querySelector('i')) infobox.notes.push(text);
        else infobox.flags.push(text);
      }
    }
  }

  // --- body ----------------------------------------------------------------
  const blocks = [];
  const skip = (el) =>
    el.classList.contains('navbox') ||
    el.classList.contains('wikia-infobox') ||
    el.id === 'toc' ||
    el.classList.contains('toc') ||
    el.querySelector?.('#toc') != null;

  const walk = (parent) => {
    for (const el of parent.children) {
      const tag = el.tagName.toLowerCase();
      if (skip(el)) continue;

      if (/^h[1-6]$/.test(tag)) {
        const t = clean(el);
        if (t && t !== 'Contents') blocks.push({ type: 'heading', level: Number(tag[1]), text: t });
      } else if (tag === 'p') {
        const t = clean(el);
        if (t) blocks.push({ type: 'para', text: t });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = [...el.querySelectorAll(':scope > li')].map(clean).filter(Boolean);
        if (items.length) blocks.push({ type: 'list', ordered: tag === 'ol', items });
      } else if (tag === 'table') {
        const rows = [...el.querySelectorAll('tr')]
          .map((r) => [...r.querySelectorAll('th,td')].map(clean))
          .filter((r) => r.some(Boolean));
        if (rows.length > 1) blocks.push({ type: 'table', rows });
      } else if (tag === 'div' || tag === 'section') {
        // Modern MediaWiki wraps each section in a div; recurse for its content.
        walk(el);
      } else if (tag === 'dl') {
        const items = [...el.querySelectorAll('dd,dt')].map(clean).filter(Boolean);
        if (items.length) blocks.push({ type: 'list', ordered: false, items });
      }
    }
  };
  walk(root);

  // --- skill navbox (class pages carry the authoritative skill roster) ------
  // Declared inline because this function is serialised into the page.
  const NS = /^(File|Image|Template|Category|Help|Special|User|Talk|Project|MediaWiki|Module|Portal)(_talk)?:/i;
  const navSkills = [];
  for (const nav of root.querySelectorAll('table.navbox')) {
    if (!/Skills/i.test(clean(nav.querySelector('tr')))) continue;
    for (const row of nav.querySelectorAll('tr')) {
      const th = row.querySelector('th');
      const td = row.querySelector('td');
      if (!th || !td) continue;
      const category = clean(th);
      if (!category || /^v\s|·/.test(category)) continue;
      for (const a of td.querySelectorAll('a')) {
        const href = a.getAttribute('href') ?? '';
        if (!href.startsWith('/wiki/') || NS.test(href.slice(6))) continue;
        // A redlink points at the edit form: the navbox names the skill but the
        // wiki has no page for it. Record it as a gap rather than trying to load it.
        const missing = href.includes('redlink=1') || a.classList.contains('new');
        const title = decodeURIComponent(href.slice(6).split('?')[0]).replace(/_/g, ' ');
        navSkills.push({ category, name: clean(a), title, missing });
      }
    }
  }

  return { infobox, blocks, navSkills, url: location.href };
}

/* ------------------------------------------------------- markdown renderer */

function blocksToMarkdown(blocks, baseLevel = 2) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'heading') {
      out.push(`${'#'.repeat(Math.min(6, baseLevel + b.level - 2))} ${b.text}`);
    } else if (b.type === 'para') {
      out.push(b.text);
    } else if (b.type === 'list') {
      out.push(b.items.map((it, i) => (b.ordered ? `${i + 1}. ${it}` : `- ${it}`)).join('\n'));
    } else if (b.type === 'table') {
      const width = Math.max(...b.rows.map((r) => r.length));
      const pad = (r) => Array.from({ length: width }, (_, i) => cell(r[i]));
      const [head, ...body] = b.rows;
      out.push(
        [
          `| ${pad(head).join(' | ')} |`,
          `| ${Array(width).fill('---').join(' | ')} |`,
          ...body.map((r) => `| ${pad(r).join(' | ')} |`),
        ].join('\n'),
      );
    }
  }
  return out.join('\n\n');
}

function frontmatter(obj) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${JSON.stringify(String(item))}`);
    } else {
      lines.push(`${k}: ${JSON.stringify(String(v))}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/* ------------------------------------------------------------- field reads */

const field = (info, name) => info.fields.find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] ?? '';

/**
 * Splits the cost note ("3 M | 13/15/17/19/21 FP") into momentum and the
 * per-rank FP list. Ranks are 1-indexed by position.
 */
function parseCost(notes) {
  const joined = notes.join(' | ');
  const momentum = joined.match(/(\d+(?:\s*\/\s*\d+)*)\s*M(?![a-z])/i)?.[1]?.replace(/\s+/g, '') ?? '';
  const fp = joined.match(/(\d+(?:\s*\/\s*\d+)*)\s*FP/i)?.[1]?.replace(/\s+/g, '') ?? '';
  return { momentum, fp };
}

const STATS = ['STR', 'WIL', 'CEL', 'SKI', 'DEF', 'RES', 'VIT', 'LUC', 'FAI', 'GUI', 'SAN', 'APT'];

/**
 * Canonical skill category. The wiki writes the same category several ways
 * ("Utility" / "Utility Skill") and occasionally qualifies it ("Support / Spell",
 * "Passive (Hidden)"); the calculator wants one stable key, so the original text
 * is preserved separately as `typeRaw`.
 */
const CANONICAL_TYPES = ['Offensive', 'Defensive', 'Support', 'Utility', 'Passive', 'Innate'];
function normaliseType(raw) {
  if (!raw) return '';
  const base = raw.replace(/\s*\(.*?\)\s*/g, '').split('/')[0].replace(/\s*Skill$/i, '').trim();
  return CANONICAL_TYPES.find((t) => t.toLowerCase() === base.toLowerCase()) ?? base;
}

/**
 * Runs inside the browser. The Youkai page is one big table per Youkai type,
 * with stat lines and a run of skills packed into single cells; this pulls it
 * apart into per-Youkai records.
 */
function extractYoukai() {
  const root = document.querySelector('#mw-content-text .mw-parser-output');
  if (!root) return null;
  const clean = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const parseStats = (td) => {
    const out = {};
    for (const [, stat, value] of clean(td).matchAll(/\b([A-Z]{3}):\s*(-?\d+)/g)) out[stat] = Number(value);
    return out;
  };

  const groups = [];
  for (const table of root.querySelectorAll('table.wikitable')) {
    // The type name is the nearest heading before the table. MediaWiki wraps
    // each heading in a div, so check the element itself and its descendants.
    let type = '';
    let node = table.previousElementSibling ?? table.parentElement;
    while (node && node !== root && !type) {
      const h = /^h[1-6]$/i.test(node.tagName) ? node : node.querySelector('h1,h2,h3,h4');
      if (h) type = clean(h);
      node = node.previousElementSibling ?? node.parentElement;
    }

    const entries = [];
    for (const row of table.querySelectorAll('tbody > tr')) {
      const tds = [...row.querySelectorAll('td')];
      if (tds.length < 4) continue;

      // Each skill starts at a <b> heading; the text after it up to the next
      // <b> is that skill's cost line plus its italic description.
      const skills = [];
      const cellNodes = [...tds[3].childNodes];
      let current = null;
      const flush = () => { if (current) skills.push(current); };
      const consume = (nodes) => {
        for (const n of nodes) {
          if (n.nodeType === 1 && n.tagName === 'B') {
            flush();
            current = { name: clean(n).replace(/:$/, ''), meta: '', description: '' };
          } else if (n.nodeType === 1 && n.tagName === 'P') {
            consume([...n.childNodes]);
          } else if (current) {
            const text = (n.textContent ?? '').replace(/\s+/g, ' ').trim();
            if (!text) continue;
            if (n.nodeType === 1 && n.tagName === 'I') current.description += (current.description ? ' ' : '') + text;
            else current.meta += (current.meta ? ' ' : '') + text;
          }
        }
      };
      consume(cellNodes);
      flush();

      entries.push({
        name: clean(tds[0]),
        statsLv1: parseStats(tds[1]),
        statsLv60: parseStats(tds[2]),
        skills,
      });
    }
    if (entries.length) groups.push({ type: type || 'Youkai', entries });
  }

  const intro = [...root.querySelectorAll(':scope > p')].map(clean).filter(Boolean).slice(0, 3);
  return { groups, intro, url: location.href };
}

/* ------------------------------------------------------------- supplements */

/**
 * Skills transcribed by hand from the wiki's page source.
 *
 * These fill in pages the scraper could not read. They are merged only when the
 * scrape did not produce the skill itself, so once a page becomes readable the
 * live values win and the entry here becomes dead weight that can be deleted.
 *
 * The Affinity family is one `Passivebox` template per Youkai race, identical
 * apart from the race name.
 */
const YOUKAI_RACES = ['Avian', 'Beast', 'Dragon', 'Fairy', 'Mystic', 'Night', 'Plant'];

const SUPPLEMENTS = YOUKAI_RACES.map((race) => ({
  title: `Affinity: ${race}`,
  transcribed: true,
  infobox: {
    title: `Affinity: ${race}`,
    fields: [
      ['Type', 'Innate'],
      ['Max Rank', '5'],
      ['Class', 'Summoner'],
      ['Required', 'The Contract rank 1'],
      ['Stat Bonus', '+1/2/3/4/5'],
    ],
    flags: [],
    notes: [],
  },
  blocks: [
    {
      type: 'para',
      text: `Shows a particular compatibility with ${race}-race Youkai, passively increasing all of their statistics based on Rank.`,
    },
  ],
  navSkills: [],
  url: `${WIKI}/wiki/Affinity:_${race}`,
}));

/* ------------------------------------------------------------------ scrape */

async function scrape() {
  await mkdir(CACHE, { recursive: true });
  const STATE = path.join(CACHE, 'cf-state.json');

  /*
   * Headed, with the automation marker off.
   *
   * The wiki sits behind a Cloudflare challenge. Headless Chromium is
   * fingerprinted and parked on "Just a moment..." indefinitely, which reads as a
   * permanent 429 even though nothing is actually banned: a headed browser solves
   * the challenge in seconds. Leave the window alone while it runs; dismissing it
   * cancels the only thing that can clear the challenge.
   *
   * The resulting clearance cookie is persisted so later runs start cleared.
   */
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: await readFile(STATE, 'utf8').then(JSON.parse).catch(() => undefined),
  });
  const pages = await Promise.all(Array.from({ length: CONCURRENCY }, () => context.newPage()));
  const cachePath = (key) =>
    path.join(CACHE, `${createHash('sha1').update(key).digest('hex').slice(0, 16)}.json`);

  let blockedUntil = 0;

  /**
   * Fetches one page and runs `extract` on it, going through the on-disk cache.
   *
   * A 429 means Cloudflare has started challenging us; every lane pauses until
   * `blockedUntil` passes so we back off as a whole rather than each retrying
   * into the same wall.
   */
  const fetchPage = async (title, slot, extract, cacheKey) => {
    const file = cachePath(cacheKey);
    if (!REFRESH) {
      try {
        return JSON.parse(await readFile(file, 'utf8'));
      } catch {
        /* not cached yet */
      }
    }

    const page = pages[slot];
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
      const waitFor = blockedUntil - Date.now();
      if (waitFor > 0) await page.waitForTimeout(waitFor);
      try {
        const response = await page.goto(wikiUrl(title), { waitUntil: 'domcontentloaded', timeout: 60000 });
        /*
         * Cloudflare answers with 429 and an interstitial that has no article
         * markup. That status alone means nothing (the challenge clears itself a
         * few seconds later in a headed browser), so wait for the title to change
         * rather than reading the status and giving up. Only a challenge that
         * never resolves counts as blocked, and even then it is "try later",
         * never "this page is missing", which would poison the cache.
         */
        if (/Just a moment|Checking your connection/i.test(await page.title())) {
          const cleared = await page
            .waitForFunction(() => !/Just a moment|Checking your connection/i.test(document.title), { timeout: 40000 })
            .then(() => true, () => false);
          if (!cleared) {
            const backoff = 30000 * 2 ** attempt;
            blockedUntil = Math.max(blockedUntil, Date.now() + backoff);
            console.warn(`  … challenge did not clear (status ${response?.status()}), backing off ${Math.round(backoff / 1000)}s`);
            continue;
          }
          await context.storageState({ path: STATE });
        }
        const data = await page.evaluate(extract);
        if (data) {
          const record = { title, ...data };
          await writeFile(file, JSON.stringify(record), 'utf8');
          await page.waitForTimeout(REQUEST_DELAY_MS);
          return record;
        }
        // A real "page does not exist": cache the miss so we do not refetch it.
        await writeFile(file, 'null', 'utf8');
        await page.waitForTimeout(REQUEST_DELAY_MS);
        return null;
      } catch (err) {
        lastErr = err;
        await page.waitForTimeout(1000 * (attempt + 1));
      }
    }
    throw lastErr ?? new Error(`gave up on ${title}`);
  };

  /** Loads one article on the page owned by `slot`. */
  const visit = (title, slot = 0) => fetchPage(title, slot, extractArticle, `article:${title}`);

  // 1. Class roster, straight off the Classes index.
  console.log('→ class roster');
  const roster = (await fetchPage('Classes', 0, () => {
    const NS = /^(File|Image|Template|Category|Help|Special|User|Talk|Project|MediaWiki|Module|Portal)(_talk)?:/i;
    const seen = new Map();
    for (const a of document.querySelectorAll('#mw-content-text a[href^="/wiki/"]')) {
      const href = a.getAttribute('href');
      if (NS.test(href.slice(6)) || href.includes('?')) continue;
      const title = decodeURIComponent(href.slice(6)).replace(/_/g, ' ');
      const name = a.textContent.trim();
      if (name && !seen.has(title)) seen.set(title, name);
    }
    return { entries: [...seen.entries()].map(([title, name]) => ({ title, name })) };
  }, 'roster:Classes')).entries;

  const KNOWN_BASES = ['Archer', 'Chemist', 'Curate', 'Duelist', 'Mage', 'Bard', 'Martial Artist', 'Rogue', 'Soldier', 'Summoner'];
  const classTitles = roster.filter((r) => r.title !== 'Classes').map((r) => r.title);

  // 2. Class pages.
  console.log(`→ ${classTitles.length} candidate class pages`);
  const classDocs = (
    await pool(classTitles, async (t, _i, slot) => {
      try {
        return await visit(t, slot);
      } catch (err) {
        console.warn(`  ! ${t}: ${err.message}`);
        return null;
      }
    })
  ).filter((d) => d && /Class/i.test(field(d.infobox, 'Type')));
  console.log(`  kept ${classDocs.length} class pages`);

  // 3. Every skill referenced by any class navbox.
  const skillIndex = new Map(); // title -> {title, name, categories:Set, classes:Set}
  const gaps = []; // navbox entries the wiki has no page for
  for (const doc of classDocs) {
    const className = doc.infobox.title || doc.title;
    for (const s of doc.navSkills) {
      if (s.missing) {
        gaps.push({ class: className, category: s.category, name: s.name });
        continue;
      }
      if (!skillIndex.has(s.title)) {
        skillIndex.set(s.title, { title: s.title, name: s.name, categories: new Set(), classes: new Set() });
      }
      const entry = skillIndex.get(s.title);
      entry.categories.add(s.category);
      entry.classes.add(className);
    }
  }
  console.log(`  ${gaps.length} navbox entries have no wiki page (recorded as gaps)`);
  const skillTitles = [...skillIndex.keys()].slice(0, LIMIT);
  console.log(`→ ${skillTitles.length} skill pages`);
  const skillDocs = (await pool(skillTitles, async (t, i, slot) => {
    if (i % 50 === 0) console.log(`  skills ${i}/${skillTitles.length}`);
    try {
      return await visit(t, slot);
    } catch (err) {
      console.warn(`  ! ${t}: ${err.message}`);
      return null;
    }
  })).filter(Boolean);

  // Fill in anything the wiki would not serve. Live pages always take priority.
  const scraped = new Set(skillDocs.map((d) => d.title));
  const filled = SUPPLEMENTS.filter((s) => !scraped.has(s.title));
  if (filled.length) {
    console.log(`  + ${filled.length} skills from hand-transcribed page source`);
    skillDocs.push(...filled);
  }

  // 4. Youkai + core mechanics reference pages.
  console.log('→ youkai + mechanics');
  const MECHANICS = [
    'Stat', 'Damage', 'Protection', 'Hit', 'Evade', 'Critical', 'Critical Evade',
    'Status Infliction', 'Status Resistance', 'Attack Range', 'Move', 'Momentum',
    'Battle Weight', 'Hit Points', 'Focus Points', 'Aptitude', 'Traits', 'Talents',
    'Enchantments', 'Races', 'Item Materials', 'Weapon Parts',
  ];
  const mechDocs = await pool(MECHANICS, async (t, _i, slot) => {
    try {
      return await visit(t, slot);
    } catch (err) {
      console.warn(`  ! ${t}: ${err.message}`);
      return null;
    }
  });

  const youkai = await fetchPage('Youkai', 0, extractYoukai, 'youkai:Youkai');
  if (!youkai) throw new Error('Could not read the Youkai page');
  console.log(`  ${youkai.groups.reduce((n, g) => n + g.entries.length, 0)} youkai in ${youkai.groups.length} groups`);

  await browser.close();
  return { classDocs, skillDocs, skillIndex, gaps, youkai, mechDocs: mechDocs.filter(Boolean), KNOWN_BASES };
}

/* ------------------------------------------------------------------- write */

async function write(rel, body) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', 'utf8');
}

async function emit(data) {
  const { classDocs, skillDocs, skillIndex, gaps, youkai, mechDocs, KNOWN_BASES } = data;
  const scrapedAt = new Date().toISOString().slice(0, 10);
  /*
   * Clear only the directories this script owns.
   *
   * Removing all of `wiki-data/` would take other scrapers' output with it:
   * `scrape-races.mjs` writes `races/` and its own `raw/` files into the same
   * tree, and a `--limit` smoke run here would silently destroy a full race
   * scrape.
   */
  for (const owned of ['classes', 'skills', 'youkai', 'mechanics']) {
    await rm(path.join(OUT, owned), { recursive: true, force: true });
  }
  for (const owned of ['raw/classes.json', 'raw/skills.json', 'raw/youkai.json']) {
    await rm(path.join(OUT, owned), { force: true });
  }

  // ---- skills ------------------------------------------------------------
  const skillsByClass = new Map();
  const skillRows = [];

  for (const doc of skillDocs) {
    const info = doc.infobox;
    const meta = skillIndex.get(doc.title);
    // File the skill under every class that can reach it: the one its infobox
    // names, plus any class whose navbox lists it. The two disagree often enough
    // that trusting either alone leaves holes in a class roster.
    const owners = [
      ...new Set([
        ...(field(info, 'Class') || '').split(/,\s*/).filter(Boolean),
        ...(meta?.classes ?? []),
      ]),
    ];
    const cls = owners.join(', ');
    const typeRaw = field(info, 'Type') || [...(meta?.categories ?? [])][0] || '';
    const type = normaliseType(typeRaw);
    const { momentum, fp } = parseCost(info.notes);
    const restriction = info.notes.filter((n) => !/\bFP\b|\bM\b/.test(n)).join('; ');

    const rec = {
      name: info.title || meta?.name || doc.title,
      title: doc.title,
      class: cls,
      type,
      typeRaw: typeRaw === type ? '' : typeRaw,
      maxRank: field(info, 'Max Rank'),
      fp,
      momentum,
      range: field(info, 'Range'),
      power: field(info, 'Power'),
      target: field(info, 'Target'),
      cooldown: field(info, 'Cooldown'),
      restriction,
      transcribed: doc.transcribed === true,
      flags: info.flags,
      extras: info.fields.filter(
        ([k]) => !['type', 'max rank', 'class', 'range', 'power', 'target', 'cooldown'].includes(k.toLowerCase()),
      ),
      description: doc.blocks,
      url: doc.url,
    };

    for (const c of owners.length ? owners : ['Unknown']) {
      if (!skillsByClass.has(c)) skillsByClass.set(c, []);
      skillsByClass.get(c).push(rec);
    }
    skillRows.push(rec);
  }

  const CATEGORY_ORDER = ['Offensive', 'Defensive', 'Support', 'Utility', 'Passive', 'Innate'];
  const byCategory = (a, b) => {
    const d = CATEGORY_ORDER.indexOf(a.type) - CATEGORY_ORDER.indexOf(b.type);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  };

  for (const [cls, skills] of skillsByClass) {
    skills.sort(byCategory);
    const body = [
      frontmatter({
        title: `${cls} Skills`,
        class: cls,
        skill_count: String(skills.length),
        source: `${WIKI}/wiki/${cls.replace(/ /g, '_')}`,
        scraped: scrapedAt,
        confidence: 'strong',
      }),
      `# ${cls} Skills`,
      '',
      `Every skill the wiki lists for **${cls}**, with its cost and scaling values.`,
      'Slash-separated numbers are per rank, rank 1 first.',
      '',
      '## Quick reference',
      '',
      '| Skill | Type | Max Rank | FP (per rank) | Momentum | Range | Power | Cooldown |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...skills.map(
        (s) =>
          `| [${cell(s.name)}](#${slug(s.name)}) | ${cell(s.type)} | ${cell(s.maxRank) || '—'} | ${cell(s.fp) || '—'} | ${cell(s.momentum) || '—'} | ${cell(s.range) || '—'} | ${cell(s.power) || '—'} | ${cell(s.cooldown) || '—'} |`,
      ),
      '',
      '## Skills',
      '',
      ...skills.map((s) => {
        const facts = [
          ['Type', s.type + (s.typeRaw ? ` _(wiki: ${s.typeRaw})_` : '')],
          ['Max rank', s.maxRank],
          ['FP cost', s.fp],
          ['Momentum', s.momentum],
          ['Range', s.range],
          ['Power', s.power],
          ['Target', s.target],
          ['Cooldown', s.cooldown],
          ['Restriction', s.restriction],
          ['Flags', s.flags.join(', ')],
          ...s.extras,
        ].filter(([, v]) => v);
        return [
          `### ${s.name}`,
          '',
          ...facts.map(([k, v]) => `- **${k}:** ${v}`),
          '',
          blocksToMarkdown(s.description, 4),
          '',
          s.transcribed
            ? `_Transcribed from the wiki page source; this page could not be fetched._ [Wiki page](${s.url})`
            : `[Wiki page](${s.url})`,
          '',
        ].join('\n');
      }),
    ].join('\n');
    await write(`skills/${slug(cls)}.md`, body);
  }

  // Master skill index.
  skillRows.sort((a, b) => a.class.localeCompare(b.class) || byCategory(a, b));
  await write(
    'skills/_index.md',
    [
      frontmatter({
        title: 'All skills',
        skill_count: String(skillRows.length),
        scraped: scrapedAt,
        confidence: 'strong',
      }),
      '# All skills',
      '',
      `${skillRows.length} skills across ${skillsByClass.size} classes. Full details live in the per-class file linked in each row.`,
      '',
      '| Skill | Class | Type | Max Rank | FP | Momentum | Range | Power |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...skillRows.map(
        (s) =>
          `| ${cell(s.name)} | [${cell(s.class)}](${slug(s.class.split(/,\s*/)[0])}.md) | ${cell(s.type)} | ${cell(s.maxRank) || '—'} | ${cell(s.fp) || '—'} | ${cell(s.momentum) || '—'} | ${cell(s.range) || '—'} | ${cell(s.power) || '—'} |`,
      ),
    ].join('\n'),
  );

  // ---- classes -----------------------------------------------------------
  const classRows = [];
  for (const doc of classDocs) {
    const info = doc.infobox;
    const name = info.title || doc.title;
    const type = field(info, 'Type');
    const weapons = field(info, 'Weapons');
    const move = field(info, 'Move');
    const bonuses = STATS.map((s) => [s, field(info, s)]).filter(([, v]) => v && v !== '--');
    const skills = (skillsByClass.get(name) ?? []).slice().sort(byCategory);

    classRows.push({ name, type, weapons, move, bonuses, skillCount: skills.length });

    const body = [
      frontmatter({
        title: name,
        type,
        weapons,
        move,
        source: doc.url,
        scraped: scrapedAt,
        confidence: 'strong',
      }),
      `# ${name}`,
      '',
      '## At a glance',
      '',
      `- **Type:** ${type || '—'}`,
      `- **Weapons:** ${weapons || '—'}`,
      `- **Move:** ${move || '—'}`,
      `- **Skills:** ${skills.length}`,
      '',
      '## Stat bonuses per level',
      '',
      bonuses.length
        ? ['| Stat | Bonus |', '| --- | --- |', ...bonuses.map(([s, v]) => `| ${s} | ${v} |`)].join('\n')
        : 'This class grants no per-level stat bonuses.',
      '',
      '## Skills',
      '',
      skills.length
        ? [
            '| Skill | Type | Max Rank | FP | Momentum |',
            '| --- | --- | --- | --- | --- |',
            ...skills.map(
              (s) =>
                `| ${cell(s.name)} | ${cell(s.type)} | ${cell(s.maxRank) || '—'} | ${cell(s.fp) || '—'} | ${cell(s.momentum) || '—'} |`,
            ),
            '',
            `Full values: [skills/${slug(name)}.md](../skills/${slug(name)}.md)`,
          ].join('\n')
        : 'No skills listed on the wiki for this class.',
      '',
      '## Wiki notes',
      '',
      blocksToMarkdown(doc.blocks, 3),
      '',
      `[Wiki page](${doc.url})`,
    ].join('\n');
    await write(`classes/${slug(name)}.md`, body);
  }

  classRows.sort((a, b) => a.name.localeCompare(b.name));
  await write(
    'classes/_index.md',
    [
      frontmatter({ title: 'All classes', class_count: String(classRows.length), scraped: scrapedAt, confidence: 'strong' }),
      '# All classes',
      '',
      '| Class | Type | Weapons | Move | Stat bonuses / level | Skills |',
      '| --- | --- | --- | --- | --- | --- |',
      ...classRows.map(
        (c) =>
          `| [${cell(c.name)}](${slug(c.name)}.md) | ${cell(c.type)} | ${cell(c.weapons) || '—'} | ${cell(c.move) || '—'} | ${cell(c.bonuses.map(([s, v]) => `${s} ${v}`).join(', ')) || '—'} | ${c.skillCount} |`,
      ),
      '',
      '## Base classes and their promotions',
      '',
      ...KNOWN_BASES.filter((b) => classRows.some((c) => c.name === b)).map((b) => `- **${b}**`),
    ].join('\n'),
  );

  // ---- youkai ------------------------------------------------------------
  const allYoukai = [];
  for (const group of youkai.groups) {
    const body = [
      frontmatter({
        title: group.type,
        youkai_count: String(group.entries.length),
        source: youkai.url,
        scraped: scrapedAt,
        confidence: 'strong',
      }),
      `# ${group.type}`,
      '',
      `${group.entries.length} Youkai. Stats are shown at level 1 and level 60; a Summoner's Youkai`,
      'scales between the two with its own level.',
      '',
      ...group.entries.flatMap((y) => {
        allYoukai.push({ ...y, type: group.type });
        const stats = STATS.filter((s) => s in y.statsLv1 || s in y.statsLv60);
        return [
          `## ${y.name}`,
          '',
          stats.length
            ? [
                `| Level | ${stats.join(' | ')} |`,
                `| --- | ${stats.map(() => '---').join(' | ')} |`,
                `| 1 | ${stats.map((s) => y.statsLv1[s] ?? '—').join(' | ')} |`,
                `| 60 | ${stats.map((s) => y.statsLv60[s] ?? '—').join(' | ')} |`,
              ].join('\n')
            : '_No stat line on the wiki._',
          '',
          `### Skills (${y.skills.length})`,
          '',
          ...y.skills.flatMap((sk) => [
            `**${sk.name}** (${sk.meta || 'Passive'})`,
            '',
            sk.description || '_No description on the wiki._',
            '',
          ]),
        ];
      }),
      `[Wiki page](${youkai.url})`,
    ].join('\n');
    await write(`youkai/${slug(group.type)}.md`, body);
  }

  await write(
    'youkai/_index.md',
    [
      frontmatter({
        title: 'Youkai',
        youkai_count: String(allYoukai.length),
        source: youkai.url,
        scraped: scrapedAt,
        confidence: 'strong',
      }),
      '# Youkai',
      '',
      'Creatures a Summoner can contract. **Skills used by Youkai cost half the listed FP.**',
      'Full stat lines and skill text are in the per-type file linked in each row.',
      '',
      ...youkai.intro.map((t) => t),
      '',
      '| Youkai | Type | STR/WIL/CEL/SKI @60 | Skills |',
      '| --- | --- | --- | --- |',
      ...allYoukai.map(
        (y) =>
          `| [${cell(y.name)}](${slug(y.type)}.md#${slug(y.name)}) | ${cell(y.type)} | ${['STR', 'WIL', 'CEL', 'SKI'].map((s) => y.statsLv60[s] ?? '—').join('/')} | ${y.skills.map((s) => cell(s.name)).join(', ')} |`,
      ),
      '',
      '## By type',
      '',
      ...youkai.groups.map((g) => `- [${g.type}](${slug(g.type)}.md): ${g.entries.length} Youkai`),
    ].join('\n'),
  );
  await write('raw/youkai.json', JSON.stringify(allYoukai, null, 2));

  // ---- coverage / known gaps --------------------------------------------
  const gapsByClass = new Map();
  for (const g of gaps) {
    if (!gapsByClass.has(g.class)) gapsByClass.set(g.class, []);
    gapsByClass.get(g.class).push(g);
  }
  await write(
    'COVERAGE.md',
    [
      frontmatter({ title: 'Coverage and known gaps', scraped: scrapedAt }),
      '# Coverage and known gaps',
      '',
      `Scraped ${classRows.length} classes, ${skillRows.length} skills and ${allYoukai.length} Youkai on ${scrapedAt}.`,
      '',
      '## Skills the wiki names but does not document',
      '',
      gapsByClass.size
        ? [
            'These skills appear in a class navigation box, but the linked wiki page does not exist,',
            'so no values could be scraped. **Do not treat these classes as fully covered**. The',
            'calculator has no numbers for the skills below.',
            '',
            '| Class | Category | Skill |',
            '| --- | --- | --- |',
            ...[...gapsByClass.entries()]
              .sort()
              .flatMap(([cls, list]) => list.map((g) => `| ${cell(cls)} | ${cell(g.category)} | ${cell(g.name)} |`)),
          ].join('\n')
        : 'None. Every skill named in a class navbox has a wiki page.',
      '',
      '## Skills per class',
      '',
      '| Class | Skills scraped | Undocumented |',
      '| --- | --- | --- |',
      ...classRows.map(
        (c) => `| ${cell(c.name)} | ${c.skillCount} | ${(gapsByClass.get(c.name) ?? []).length} |`,
      ),
      '',
      '## Fields left blank',
      '',
      'A blank cost or power field means the wiki infobox left it blank. For Passive and Innate',
      'skills that is expected, since they have no FP cost. A handful of active skills also genuinely',
      'cost 0 FP (for example the Magic Gunner Shell skills, which cost only momentum).',
    ].join('\n'),
  );

  // ---- mechanics ---------------------------------------------------------
  for (const doc of mechDocs) {
    await write(
      `mechanics/${slug(doc.title)}.md`,
      [
        frontmatter({ title: doc.title, source: doc.url, scraped: scrapedAt, confidence: 'strong' }),
        `# ${doc.title}`,
        '',
        doc.infobox.fields.length
          ? ['| Field | Value |', '| --- | --- |', ...doc.infobox.fields.map(([k, v]) => `| ${cell(k)} | ${cell(v)} |`), ''].join('\n')
          : '',
        blocksToMarkdown(doc.blocks, 2),
        '',
        `[Wiki page](${doc.url})`,
      ].join('\n'),
    );
  }

  // ---- machine-readable sidecar -----------------------------------------
  await write(
    'raw/skills.json',
    JSON.stringify(
      skillRows.map(({ description, ...rest }) => ({
        ...rest,
        description: description.filter((b) => b.type === 'para').map((b) => b.text).join('\n\n'),
      })),
      null,
      2,
    ),
  );
  await write('raw/classes.json', JSON.stringify(classRows, null, 2));

  // ---- README ------------------------------------------------------------
  await write(
    'README.md',
    [
      `# SL2 wiki data`,
      '',
      `Scraped from the [Sigrogana Legend 2 Wiki](${WIKI}/wiki/Sigrogana_Legend_2_Wiki) on **${scrapedAt}**`,
      'by `scripts/scrape-wiki.mjs`. Regenerate with `npm run scrape:wiki`; the script rewrites',
      'this whole directory, so `git diff` shows exactly what changed on the wiki.',
      '',
      'These files are the reference values the calculator should agree with. Unlike',
      '`optimizer-knowledge/` (personal notes, evidence-only), everything here is transcribed',
      'from the wiki without interpretation.',
      '',
      '## Layout',
      '',
      `- \`classes/\`: one file per class, type, weapons, move, per-level stat bonuses, skill roster. Start at [\`classes/_index.md\`](classes/_index.md).`,
      `- \`skills/\`: one file per class listing every skill with FP cost, momentum, range, power and full description. Start at [\`skills/_index.md\`](skills/_index.md).`,
      `- \`youkai/\`: one file per Youkai type, each Youkai with level 1 / level 60 stat lines and full skill text. Start at [\`youkai/_index.md\`](youkai/_index.md).`,
      `- \`mechanics/\`: stat, damage, hit/evade, critical and other formula pages.`,
      `- \`races/\`: one file per race, base stats and racial skills. Written by \`scripts/scrape-races.mjs\`.`,
      `- \`equipment/\`: one file per equipment kind (weapons, armor, hands, legs, accessories) with every item's stats, effects and drop locations, plus item materials and catalysts. Written by \`scripts/scrape-equipment.mjs\`. Start at [\`equipment/_index.md\`](equipment/_index.md).`,
      `- \`raw/\`: the same class, skill, Youkai, race, equipment, material and catalyst records as JSON, for importing into calculator data files.`,
      `- [\`COVERAGE.md\`](COVERAGE.md): what the wiki does **not** document. Read this before trusting a class to be complete.`,
      '',
      '## Reading the numbers',
      '',
      'Slash-separated values are **per skill rank, rank 1 first**. `13/15/17/19/21 FP` means',
      'rank 1 costs 13 FP and rank 5 costs 21 FP. A single value applies at every rank.',
      '',
      '| Field | Meaning |',
      '| --- | --- |',
      '| Max Rank | Highest rank the skill can reach |',
      '| FP | Focus Point cost |',
      '| Momentum | Momentum spent to use the skill |',
      '| Range | Tiles between user and target |',
      '| Power | Damage scaling, usually a % of Scaled Weapon Attack |',
      '| Target | Shape and size of the affected area |',
      '| Cooldown | Rounds before the skill can be reused |',
      '',
      '## Caveats',
      '',
      '- The wiki lags the game on recent patches; treat values as strong, not verified.',
      '- Blank fields mean the wiki infobox left them blank, not that the value is zero.',
      '- Skills shared by several classes are filed under each class that lists them.',
      '- Skill categories are normalised to Offensive / Defensive / Support / Utility / Passive / Innate.',
      '  Where the wiki wrote something else, the original is shown next to the category.',
      '- Some classes are only partly documented on the wiki. See [`COVERAGE.md`](COVERAGE.md).',
    ].join('\n'),
  );

  console.log(`\n✓ ${classDocs.length} classes, ${skillRows.length} skills → ${OUT}`);
}

const data = await scrape();
await emit(data);
