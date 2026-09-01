/**
 * Scrapes the SL2 wiki's talent catalog into `wiki-data/`.
 *
 * Like statuses, the whole catalog lives on one hub page (`Talents`) rather
 * than one page per talent. The page is laid out as `== Category ==` sections,
 * each opening with a sortable summary table (talent, SP per rank, max ranks,
 * max SP) and then one `=== Talent ===` subsection per talent whose wikitable
 * lists its subtalents (name, max SR, effect).
 *
 * The wikitext is fetched through the MediaWiki API driven by a real browser,
 * because Cloudflare rejects bare HTTP requests; see scrape-races.mjs for the
 * pattern this borrows.
 *
 *   node scripts/scrape-talents.mjs             # normal run, cache honoured
 *   node scripts/scrape-talents.mjs --refresh   # ignore the cache
 *
 * Outputs:
 *   wiki-data/raw/talents.json          parsed categories → talents → subtalents
 *   wiki-data/mechanics/talents.md      human-readable summary
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WIKI = 'https://sl2.miraheze.org';
const PAGE_TITLE = 'Talents';
const RAW = path.resolve('wiki-data/raw');
const MECHANICS = path.resolve('wiki-data/mechanics');
const CACHE = path.resolve('.wiki-cache');
const REFRESH = process.argv.includes('--refresh');

/* ------------------------------------------------------------------ browser */

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
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!(await clearChallenge())) {
      const backoff = 30000 * 2 ** attempt;
      console.warn(`  … challenge did not clear (status ${response?.status() ?? 0}), backing off ${Math.round(backoff / 1000)}s`);
      await page.waitForTimeout(backoff);
      continue;
    }
    const body = await page.evaluate(() => document.body.innerText);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error(`API returned non-JSON: ${body.slice(0, 200)}`);
    }
    await writeFile(file, JSON.stringify(parsed), 'utf8');
    await page.waitForTimeout(400);
    return parsed;
  }
  throw new Error('Gave up: the wiki is rate limiting every request.');
}

/* ------------------------------------------------------------------- parse */

/** Strips wiki markup down to plain text: links, bold/italic, templates, HTML. */
function plain(text) {
  return String(text ?? '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/__[A-Z]+__/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every `[[link]]` target in a fragment, for cross-referencing. */
function linksIn(text) {
  return [...String(text ?? '').matchAll(/\[\[([^\]|]*)(?:\|[^\]]*)?\]\]/g)].map(match => match[1].trim());
}

/**
 * `| style="text-align: center;" | 5` → `5`.
 *
 * A wikitable cell is `attributes | content`. Attributes never contain a bare
 * `|`, so the first `|` splits them off, but only when the head actually looks
 * like attributes, or an effect containing a piped `[[link|text]]` would be
 * truncated.
 */
function cellContent(text) {
  const split = text.indexOf('|');
  if (split !== -1) {
    const head = text.slice(0, split);
    if (/=/.test(head) && !head.includes('[[')) return text.slice(split + 1).trim();
  }
  return text.trim();
}

/**
 * Splits one wikitable into rows of raw cell strings.
 *
 * Rows are separated by `|-`; within a row each cell is either its own `|` line
 * or one of several joined by `||`. A line that starts with neither `|` nor `!`
 * continues the previous cell.
 */
function tableRows(table) {
  const rows = [];
  let current = null;
  for (const line of table.split('\n')) {
    const trimmed = line.trim();
    if (/^\|[-+}]/.test(trimmed) || trimmed.startsWith('{|')) {
      if (current?.length) rows.push(current);
      current = trimmed.startsWith('|-') ? [] : null;
      continue;
    }
    if (trimmed.startsWith('!')) continue; // header row
    if (trimmed.startsWith('|')) {
      if (!current) current = [];
      current.push(...trimmed.slice(1).split('||').map(cell => cell.trim()));
    } else if (current?.length && trimmed) {
      current[current.length - 1] += ` ${trimmed}`;
    }
  }
  if (current?.length) rows.push(current);
  return rows.map(row => row.map(cellContent));
}

/** Every `{| ... |}` table in a chunk of wikitext, in document order. */
function tablesIn(body) {
  return [...body.matchAll(/\{\|[\s\S]*?(?:\n\|\}|$)/g)].map(match => match[0]);
}

const number = (text) => {
  const match = plain(text).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

/**
 * Walks the page into `== Category ==` → `=== Talent ===` sections.
 *
 * Everything before the first heading is the page intro; a category's own body
 * (before its first talent) holds the summary table.
 */
function splitSections(wikitext) {
  const intro = [];
  const categories = [];
  let category = null;
  let talent = null;

  for (const line of wikitext.split('\n')) {
    const heading = line.match(/^(==+)\s*(.*?)\s*\1\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2];
      if (level === 2) {
        category = { title, body: [], talents: [] };
        categories.push(category);
        talent = null;
      } else if (level === 3 && category) {
        talent = { title, body: [] };
        category.talents.push(talent);
      } else if (talent) {
        talent.body.push(line);
      }
      continue;
    }
    if (talent) talent.body.push(line);
    else if (category) category.body.push(line);
    else intro.push(line);
  }

  return { intro: intro.join('\n'), categories };
}

/** `'''Cost:''' 1.5 SP per Rank · '''Maximum Ranks:''' 10 · '''Maximum SP:''' 15` */
function parseCostLine(body) {
  const text = plain(body.split('{|')[0] ?? '');
  return {
    spPerRank: number(text.match(/Cost:\s*([\d.]+)/)?.[1]),
    maxRanks: number(text.match(/Maximum Ranks:\s*(\d+)/)?.[1]),
    maxSp: number(text.match(/Maximum SP:\s*([\d.]+)/)?.[1]),
  };
}

function parseCatalog(wikitext) {
  const { intro, categories } = splitSections(wikitext);

  const parsed = categories.map(category => {
    const categoryBody = category.body.join('\n');
    // The category's summary table repeats each talent's cost; kept so the
    // per-talent cost line can be cross-checked rather than trusted blindly.
    const summary = tablesIn(categoryBody).flatMap(tableRows)
      .filter(row => row.length >= 4 && plain(row[0]))
      .map(row => ({
        talent: plain(row[0]),
        spPerRank: number(row[1]),
        maxRanks: number(row[2]),
        maxSp: number(row[3]),
      }));

    const talents = category.talents.map(entry => {
      const body = entry.body.join('\n');
      const cost = parseCostLine(body);
      const subtalents = tablesIn(body).flatMap(tableRows)
        .filter(row => row.length >= 3 && plain(row[0]))
        .map(row => ({
          name: plain(row[0]),
          maxSr: number(row[1]),
          effect: plain(row[2]),
          links: linksIn(row[2]),
        }));
      return {
        name: entry.title,
        category: category.title,
        ...cost,
        subtalents,
        intro: plain(body.split('{|')[0] ?? '').replace(/^Cost:.*?Maximum SP:\s*[\d.]+\s*/, '').trim(),
      };
    });

    return { title: category.title, intro: plain(categoryBody.split('{|')[0] ?? ''), summary, talents };
  }).filter(category => category.talents.length || category.summary.length);

  return { intro: plain(intro), categories: parsed };
}

/* --------------------------------------------------------------------- run */

console.log(`Fetching "${PAGE_TITLE}" wikitext…`);
const data = await api(
  { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: PAGE_TITLE },
  `talents-wikitext:${PAGE_TITLE}`,
);
const entry = (data.query?.pages ?? []).find(item => !item.missing);
const wikitext = entry?.revisions?.[0]?.slots?.main?.content;
if (!wikitext) throw new Error(`The wiki has no "${PAGE_TITLE}" page.`);

const scraped = new Date().toISOString().slice(0, 10);
const source = `${WIKI}/wiki/${PAGE_TITLE.replace(/ /g, '_')}`;
const { intro, categories } = parseCatalog(wikitext);

const talents = categories.flatMap(category => category.talents);
const subtalentCount = talents.reduce((sum, talent) => sum + talent.subtalents.length, 0);
console.log(`Parsed ${talents.length} talents (${subtalentCount} subtalents) across ${categories.length} categories.`);

// A talent with no subtalents, or a cost the summary table disagrees with, means
// the page layout moved under us: surface it rather than shipping a hole.
for (const category of categories) {
  const summaryByName = new Map(category.summary.map(row => [row.talent, row]));
  for (const talent of category.talents) {
    if (!talent.subtalents.length) console.warn(`  ! ${talent.name}: no subtalents parsed`);
    const row = summaryByName.get(talent.name);
    if (row && row.spPerRank !== talent.spPerRank) {
      console.warn(`  ! ${talent.name}: cost line says ${talent.spPerRank} SP, summary table says ${row.spPerRank}`);
    }
    if (!row) console.warn(`  ! ${talent.name}: missing from the ${category.title} summary table`);
  }
}

await mkdir(RAW, { recursive: true });
await mkdir(MECHANICS, { recursive: true });

await writeFile(
  path.join(RAW, 'talents.json'),
  `${JSON.stringify({ source, scraped, intro, wikitext, categories }, null, 2)}\n`,
  'utf8',
);

const markdown = [
  '---',
  `title: "${PAGE_TITLE}"`,
  `source: "${source}"`,
  `scraped: "${scraped}"`,
  'confidence: "strong"',
  '---',
  `# ${PAGE_TITLE}`,
  '',
  intro,
  '',
  ...categories.flatMap(category => [
    `## ${category.title}`,
    '',
    '| Talent | SP per Rank | Max Ranks | Max SP |',
    '| --- | --- | --- | --- |',
    ...category.summary.map(row => `| ${row.talent} | ${row.spPerRank ?? '—'} | ${row.maxRanks ?? '—'} | ${row.maxSp ?? '—'} |`),
    '',
    ...category.talents.flatMap(talent => [
      `### ${talent.name}`,
      '',
      `**Cost:** ${talent.spPerRank ?? '—'} SP per Rank · **Maximum Ranks:** ${talent.maxRanks ?? '—'} · **Maximum SP:** ${talent.maxSp ?? '—'}`,
      '',
      '| Subtalent | Max SR | Effect |',
      '| --- | --- | --- |',
      ...talent.subtalents.map(sub => `| ${sub.name} | ${sub.maxSr ?? '—'} | ${sub.effect.replace(/\|/g, '\\|')} |`),
      '',
    ]),
  ]),
  `[Wiki page](${source})`,
  '',
].join('\n');
await writeFile(path.join(MECHANICS, 'talents.md'), markdown, 'utf8');

console.log(`Wrote wiki-data/raw/talents.json and wiki-data/mechanics/talents.md (${talents.length} talents).`);
await browser.close();
