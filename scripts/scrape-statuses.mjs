/**
 * Scrapes the SL2 wiki's status-effect catalog into `wiki-data/`.
 *
 * The wiki keeps per-status content on one hub page (`Status Effects`) as
 * sortable wikitables grouped by category, rather than one page per status the
 * way skills and classes work. So this fetches a single page of wikitext
 * through the MediaWiki API (via a real browser, because Cloudflare rejects
 * bare HTTP; see scrape-races.mjs for the pattern this borrows) and parses the
 * tables into rows.
 *
 *   node scripts/scrape-statuses.mjs             # normal run, cache honoured
 *   node scripts/scrape-statuses.mjs --refresh   # ignore the cache
 *
 * Outputs:
 *   wiki-data/raw/statuses.json         parsed rows, one per status
 *   wiki-data/mechanics/status-effects.md  human-readable summary
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WIKI = 'https://sl2.miraheze.org';
const PAGE_TITLE = 'Status Effects';
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

/** Strips wiki markup down to plain text: links, bold/italic, templates. */
function plain(text) {
  return text
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every `[[link]]` target in a fragment, for cross-referencing. */
function linksIn(text) {
  return [...text.matchAll(/\[\[([^\]|]*)(?:\|[^\]]*)?\]\]/g)].map(match => match[1].trim());
}

/**
 * Parses `== Section ==` headings and the wikitable rows inside each.
 *
 * Rows are `|-` separated; the header row uses `!`. A row's cells arrive as
 * `| Name || Description || Notes` (sometimes with the cells on their own
 * lines), so cells are re-joined per row before splitting on `||`.
 */
function parseSections(wikitext) {
  const sections = [];
  let current = { title: 'Introduction', body: [] };
  for (const line of wikitext.split('\n')) {
    const heading = line.match(/^==+\s*(.*?)\s*==+$/);
    if (heading) {
      sections.push(current);
      current = { title: heading[1], body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);

  return sections.map(section => {
    const body = section.body.join('\n');
    const rows = [];
    // The page's last table is unterminated in the source wikitext, so a
    // table runs to its `|}` or to the end of the section.
    for (const tableMatch of body.matchAll(/\{\|[\s\S]*?(?:\|\}|$)/g)) {
      const rowChunks = tableMatch[0].split(/^\|-.*$/m).slice(1);
      for (const chunk of rowChunks) {
        const cellText = chunk
          .split('\n')
          .filter(line => line.startsWith('|') && !line.startsWith('|}'))
          .map(line => line.slice(1))
          .join(' ');
        const cells = cellText.split('||').map(cell => cell.trim());
        if (cells.length < 2 || !plain(cells[0])) continue;
        rows.push({
          name: plain(cells[0]),
          description: plain(cells[1] ?? ''),
          notes: plain(cells[2] ?? ''),
          links: linksIn(`${cells[0]} ${cells[1] ?? ''} ${cells[2] ?? ''}`),
        });
      }
    }
    const intro = plain(body.split('{|')[0] ?? '');
    return { title: section.title, intro, rows };
  }).filter(section => section.rows.length || section.intro);
}

/* --------------------------------------------------------------------- run */

console.log(`Fetching "${PAGE_TITLE}" wikitext…`);
const data = await api(
  { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: PAGE_TITLE },
  `wikitext:${PAGE_TITLE}`,
);
const entry = (data.query?.pages ?? []).find(item => !item.missing);
const wikitext = entry?.revisions?.[0]?.slots?.main?.content;
if (!wikitext) throw new Error(`The wiki has no "${PAGE_TITLE}" page.`);

const scraped = new Date().toISOString().slice(0, 10);
const sections = parseSections(wikitext);
const statusCount = sections.reduce((sum, section) => sum + section.rows.length, 0);
console.log(`Parsed ${statusCount} statuses across ${sections.filter(section => section.rows.length).length} categories.`);

await mkdir(RAW, { recursive: true });
await mkdir(MECHANICS, { recursive: true });

await writeFile(path.join(RAW, 'statuses.json'), JSON.stringify({
  source: `${WIKI}/wiki/${PAGE_TITLE.replace(/ /g, '_')}`,
  scraped,
  wikitext,
  sections,
}, null, 2), 'utf8');

const markdown = [
  '---',
  `title: "${PAGE_TITLE}"`,
  `source: "${WIKI}/wiki/${PAGE_TITLE.replace(/ /g, '_')}"`,
  `scraped: "${scraped}"`,
  'confidence: "strong"',
  '---',
  `# ${PAGE_TITLE}`,
  '',
  ...sections.flatMap(section => [
    `## ${section.title}`,
    '',
    ...(section.intro ? [section.intro, ''] : []),
    ...(section.rows.length ? [
      '| Status | Description | Notes |',
      '| --- | --- | --- |',
      ...section.rows.map(row => `| ${row.name} | ${row.description} | ${row.notes} |`),
      '',
    ] : []),
  ]),
  `[Wiki page](${WIKI}/wiki/${PAGE_TITLE.replace(/ /g, '_')})`,
  '',
].join('\n');
await writeFile(path.join(MECHANICS, 'status-effects.md'), markdown, 'utf8');

console.log(`Wrote wiki-data/raw/statuses.json and wiki-data/mechanics/status-effects.md (${statusCount} statuses).`);
await browser.close();
