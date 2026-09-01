/**
 * Scrapes race and racial-skill data from the SL2 wiki into `wiki-data/races/`.
 *
 * Unlike `scrape-wiki.mjs`, which renders one browser page per article, this goes
 * through the MediaWiki API and asks for up to 50 pages of wikitext per request.
 * A full race sweep costs a handful of requests rather than a hundred, which
 * matters because the wiki sits behind Cloudflare and starts issuing 429
 * challenges under load.
 *
 * The API is still reached through a real browser: Cloudflare rejects bare HTTP
 * requests outright because they cannot solve its JavaScript challenge.
 *
 *   node scripts/scrape-races.mjs --discover   # list candidate pages, ~3 requests
 *   node scripts/scrape-races.mjs              # full run
 *   node scripts/scrape-races.mjs --refresh    # ignore the cache
 *
 * Wikitext rather than rendered HTML is deliberate: a race's numbers live in its
 * infobox template parameters, which is exactly what the source gives us, and it
 * avoids a second request per page to expand them.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WIKI = 'https://sl2.miraheze.org';
const OUT = path.resolve('wiki-data/races');
const RAW = path.resolve('wiki-data/raw');
const CACHE = path.resolve('.wiki-cache');

const DISCOVER_ONLY = process.argv.includes('--discover');
const REFRESH = process.argv.includes('--refresh');

/** Requests per batch. The API caps `titles` at 50 for anonymous callers. */
const BATCH = 50;

/**
 * Subraces the calculator already models, used as a fallback fetch list when
 * category discovery comes up short. Mechanation's four loadouts share one page.
 */
const KNOWN_SUBRACES = [
  'Imperialist', 'Chataran', 'Karatynn', 'Onigan', 'Tannite', 'Lispoolian', 'Hyoyan',
  'Alstalsian', 'Dormehan', 'Telegradian', 'Geladynian', 'Meiaquarise', 'Duyuein',
  'Lupine', 'Leporidae', 'Corbie', 'Phenex', 'Heron', 'Felidae', 'Grimalkin', 'Muridae',
  'Umbral', 'Shaitan', 'Oracle', 'Papilion', 'Theno',
  'Vampire', 'Elf', 'Wild Elf', 'Zeran', 'Lich', 'Reaper', 'Apertaurus', 'Oni',
  'Glykin', 'Wyverntouched', 'Hyattr', 'Naga',
  'Mechanation', 'Redtail', 'Omina', 'Doriad', 'Dullahan', 'Karakuri',
  'Salamandra', 'Amalgama', 'Chimera',
];

/** Race group pages, which usually carry the shared racial skills. */
const RACE_GROUPS = ['Human', 'Homunculi', 'Serpentkind', 'Corrupted', 'Kaelensia', 'Ancients', 'Races', 'Race'];

/* ------------------------------------------------------------------ browser */

/*
 * Headed, with the automation flag off.
 *
 * Cloudflare fingerprints headless Chromium and parks it on an unsolvable "Just
 * a moment..." interstitial forever. A headed browser without the automation
 * marker solves the challenge normally and is issued a clearance cookie, which is
 * persisted so later runs start already cleared.
 */
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

/** Waits out a Cloudflare interstitial, returning true once real content shows. */
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

/**
 * Calls the MediaWiki API and returns parsed JSON.
 *
 * Navigating rather than fetching is what gets past Cloudflare; the response is
 * JSON rendered into a `<pre>`, so the text content is the payload.
 */
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

/* ----------------------------------------------------------------- discover */

/** Category members, or an empty list when the category does not exist. */
async function categoryMembers(category) {
  const data = await api(
    { action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmlimit: '500' },
    `cat:${category}`,
  );
  return (data.query?.categorymembers ?? []).map((entry) => entry.title);
}

async function discover() {
  const found = new Map();
  for (const category of ['Races', 'Race', 'Racial Skills', 'Racial skills']) {
    const members = await categoryMembers(category);
    if (members.length) console.log(`  Category:${category} -> ${members.length} pages`);
    for (const title of members) found.set(title, `Category:${category}`);
  }

  // Whatever the categories miss, the calculator's own roster covers.
  for (const title of [...RACE_GROUPS, ...KNOWN_SUBRACES]) {
    if (!found.has(title)) found.set(title, 'known roster');
  }
  return found;
}

/* -------------------------------------------------------------------- fetch */

/** Wikitext for many pages at once, keyed by title. Missing pages are skipped. */
async function fetchWikitext(titles) {
  const pages = new Map();
  for (let i = 0; i < titles.length; i += BATCH) {
    const slice = titles.slice(i, i + BATCH);
    console.log(`  wikitext ${i + 1}-${i + slice.length} of ${titles.length}`);
    const data = await api(
      {
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        titles: slice.join('|'),
      },
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

/* ------------------------------------------------------------------- parse */

/**
 * Pulls `{{Template|key = value|...}}` blocks out of wikitext.
 *
 * Brace depth is tracked so a template nested inside a parameter does not end the
 * outer one early.
 */
function parseTemplates(wikitext) {
  const templates = [];
  for (let i = 0; i < wikitext.length - 1; i++) {
    if (wikitext[i] !== '{' || wikitext[i + 1] !== '{') continue;
    let depth = 0;
    let end = i;
    for (let j = i; j < wikitext.length - 1; j++) {
      if (wikitext[j] === '{' && wikitext[j + 1] === '{') { depth++; j++; }
      else if (wikitext[j] === '}' && wikitext[j + 1] === '}') {
        depth--;
        j++;
        if (depth === 0) { end = j + 1; break; }
      }
    }
    if (end <= i) continue;
    const body = wikitext.slice(i + 2, end - 2);
    // Split on top-level pipes only.
    const parts = [];
    let buffer = '';
    let nest = 0;
    for (let k = 0; k < body.length; k++) {
      const two = body.slice(k, k + 2);
      if (two === '{{' || two === '[[') { nest++; buffer += two; k++; continue; }
      if (two === '}}' || two === ']]') { nest--; buffer += two; k++; continue; }
      if (body[k] === '|' && nest === 0) { parts.push(buffer); buffer = ''; continue; }
      buffer += body[k];
    }
    parts.push(buffer);

    const name = parts.shift()?.trim() ?? '';
    const params = {};
    let positional = 0;
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) params[String(++positional)] = part.trim();
      else params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
    templates.push({ name, params });
    i = end - 1;
  }
  return templates;
}

/** Strips wiki markup down to readable prose. */
const plain = (text) => String(text ?? '')
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/'''?/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/* -------------------------------------------------------------------- main */

const discovered = await discover();
console.log(`\n${discovered.size} candidate pages`);

if (DISCOVER_ONLY) {
  const bySource = {};
  for (const [title, source] of discovered) (bySource[source] ??= []).push(title);
  for (const [source, titles] of Object.entries(bySource)) {
    console.log(`\n${source} (${titles.length}):\n  ${titles.join(', ')}`);
  }
  await browser.close();
  process.exit(0);
}

const wikitext = await fetchWikitext([...discovered.keys()]);
console.log(`\n${wikitext.size} pages returned content`);

await mkdir(OUT, { recursive: true });
await mkdir(RAW, { recursive: true });

const records = [];
for (const [title, content] of wikitext) {
  const templates = parseTemplates(content);
  records.push({
    title,
    templates: templates.map((t) => ({ name: t.name, params: t.params })),
    // Section headings give a quick read on what each page actually documents.
    sections: [...content.matchAll(/^==+\s*(.+?)\s*==+$/gm)].map((m) => m[1].trim()),
    wikitext: content,
  });
}

await writeFile(path.join(RAW, 'races-wikitext.json'), JSON.stringify(records, null, 2), 'utf8');

/* ------------------------------------------------------------------- emit */

const STAT_ORDER = ['STR', 'WIL', 'SKI', 'CEL', 'DEF', 'RES', 'VIT', 'FAI', 'LUC', 'GUI', 'SAN', 'APT'];

/**
 * Base stats from a race page's `==Stats==` wikitable.
 *
 * The table is a header row of stat names followed by a `'''Base'''` row of
 * numbers, so the two are zipped rather than matched by position alone.
 */
function parseStats(wikitext) {
  const row = /\|\s*'''Base'''\s*\|\|([^\n]+)/.exec(wikitext);
  if (!row) return null;
  const values = row[1].split('||').map((cell) => Number(cell.trim().replace(/[^\d-]/g, '')));
  const header = /!\s*!!([^\n]+)/.exec(wikitext);
  const names = header ? header[1].split('!!').map((cell) => cell.trim().toUpperCase()) : STAT_ORDER;
  const stats = {};
  names.forEach((name, index) => {
    if (STAT_ORDER.includes(name) && Number.isFinite(values[index])) stats[name.toLowerCase()] = values[index];
  });
  return Object.keys(stats).length ? stats : null;
}

const skillTitles = new Set(await categoryMembers('Racial skills'));

/*
 * Race pages, by structure rather than by category alone.
 *
 * `Category:Races` is missing at least one real race (Lupine), so a page also
 * counts as a race when it carries a group navbox and a base stat table and is
 * not itself a skill, which is what every race page looks like.
 */
const raceTitles = new Set(await categoryMembers('Races'));
for (const record of records) {
  if (skillTitles.has(record.title) || raceTitles.has(record.title)) continue;
  const hasGroupNav = record.templates.some((t) => /LL$/.test(t.name));
  if (hasGroupNav && /\|\s*'''Base'''\s*\|\|/.test(record.wikitext)) {
    raceTitles.add(record.title);
    console.log(`  + ${record.title} looks like a race but is not in Category:Races`);
  }
}

/*
 * Race groups, read from the navbox each race page transcludes: a page carrying
 * `{{HumansLL}}` is a Human. Skill pages transclude the same navbox, so the
 * members are filtered back down to pages that are actually races.
 */
const GROUP_TEMPLATES = {
  HumansLL: 'Human',
  KaelensiaLL: 'Kaelensia',
  CorruptedLL: 'Corrupted',
  SerpentkindLL: 'Serpentkind',
  AncientsLL: 'Ancients',
  HomunculiLL: 'Homunculi',
  OtherLL: 'Other Races',
};

/** Group name -> the races in it, excluding the group's own index page. */
const groupMembers = new Map();
for (const record of records) {
  if (!raceTitles.has(record.title)) continue;
  for (const template of record.templates) {
    const group = GROUP_TEMPLATES[template.name];
    if (!group || record.title === group) continue;
    if (!groupMembers.has(group)) groupMembers.set(group, []);
    groupMembers.get(group).push(record.title);
  }
}

/**
 * Turns a skill's race field into the races it actually applies to.
 *
 * The wiki writes three shapes here and only the first was being handled:
 * a single race ("Lupine"), several at once ("Felidae, Grimalkin"), and a whole
 * group ("Any Human", "All Homunculi"), which every race in that group gets.
 */
function resolveRaces(raceText) {
  const resolved = new Set();
  for (const part of String(raceText).split(/,|\/|\band\b/)) {
    const name = part.trim().replace(/^(any|all)\s+/i, '').trim();
    if (!name) continue;
    // "Any Human" and "All Homunculi" name a group; singular/plural both appear.
    const group = [...groupMembers.keys()].find(
      (g) => g.toLowerCase() === name.toLowerCase() || `${g.toLowerCase()}s` === name.toLowerCase(),
    );
    if (group) for (const member of groupMembers.get(group)) resolved.add(member);
    else resolved.add(name);
  }
  return [...resolved];
}

const races = [];
const racialSkills = [];

for (const record of records) {
  const box = record.templates.find((t) => t.name === 'Passivebox' || t.name === 'RaceSkillbox');

  if (skillTitles.has(record.title) && box) {
    // `sourcetext` on an active skill, `spec1text` on a passive, both naming the race.
    const race = plain(box.params.sourcetext ?? box.params.spec1text ?? '');
    racialSkills.push({
      name: box.params.sname ?? record.title,
      title: record.title,
      /** As written on the wiki, e.g. "Any Human" or "Felidae, Grimalkin". */
      race,
      /** Every race that actually gets it, with groups expanded. */
      races: resolveRaces(race),
      passive: box.name === 'Passivebox',
      maxRank: box.params.maxrank ? Number(box.params.maxrank) : null,
      fp: box.params.fpcost ?? null,
      momentum: box.params.mocost ?? null,
      range: box.params.range ?? null,
      target: box.params.ttype ?? null,
      // Everything else the box carries, so nothing is silently dropped.
      extras: Object.entries(box.params)
        .filter(([key]) => !/^(sname|stype|sourcetext|maxrank|fpcost|mocost|range|ttype|ttype_image|spec\d+(text)?)$/.test(key))
        .map(([key, value]) => [key, plain(value)]),
      description: plain(record.wikitext.replace(/\{\{[\s\S]*?\}\}/g, '').split('\n').find((line) => line.trim().length > 40) ?? ''),
    });
    continue;
  }

  if (raceTitles.has(record.title)) {
    const stats = parseStats(record.wikitext);
    races.push({
      name: record.title,
      stats,
      description: plain(record.wikitext.split('\n').find((line) => line.trim().length > 40) ?? ''),
      sections: record.sections,
    });
  }
}

const byRace = new Map();
for (const skill of racialSkills) {
  for (const race of skill.races.length ? skill.races : ['Unassigned']) {
    if (!byRace.has(race)) byRace.set(race, []);
    byRace.get(race).push(skill);
  }
}
// A group's own index page lists everything its members share.
for (const [group, members] of groupMembers) {
  const shared = racialSkills.filter((s) => s.races.length && members.every((m) => s.races.includes(m)));
  if (shared.length) byRace.set(group, shared);
}

await writeFile(path.join(RAW, 'races.json'), JSON.stringify(races, null, 2), 'utf8');
await writeFile(path.join(RAW, 'racial-skills.json'), JSON.stringify(racialSkills, null, 2), 'utf8');

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').trim();
const scrapedAt = new Date().toISOString().slice(0, 10);

for (const race of races.sort((a, b) => a.name.localeCompare(b.name))) {
  const skills = byRace.get(race.name) ?? [];
  await writeFile(
    path.join(OUT, `${race.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`),
    [
      '---',
      `title: ${JSON.stringify(race.name)}`,
      `skill_count: "${skills.length}"`,
      `source: "${WIKI}/wiki/${race.name.replace(/ /g, '_')}"`,
      `scraped: "${scrapedAt}"`,
      'confidence: "strong"',
      '---',
      `# ${race.name}`,
      '',
      race.description,
      '',
      '## Base stats',
      '',
      race.stats
        ? [`| ${STAT_ORDER.join(' | ')} |`, `| ${STAT_ORDER.map(() => '---').join(' | ')} |`,
          `| ${STAT_ORDER.map((s) => race.stats[s.toLowerCase()] ?? '—').join(' | ')} |`].join('\n')
        : '_No base stat table on the wiki page._',
      '',
      '## Racial skills',
      '',
      skills.length
        ? [
          '| Skill | Kind | Granted to | Max Rank | FP | Momentum | Range |',
          '| --- | --- | --- | --- | --- | --- | --- |',
          ...skills.map((s) => `| ${cell(s.name)} | ${s.passive ? 'Passive' : 'Active'} | ${cell(s.race)} | ${cell(s.maxRank) || '—'} | ${cell(s.fp) || '—'} | ${cell(s.momentum) || '—'} | ${cell(s.range) || '—'} |`),
          '',
          ...skills.flatMap((s) => [`### ${s.name}`, '', s.description || '_No description._', '',
            ...s.extras.filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`), '']),
        ].join('\n')
        : '_No skills in Category:Racial skills name this race._',
      '',
      `[Wiki page](${WIKI}/wiki/${race.name.replace(/ /g, '_')})`,
    ].join('\n') + '\n',
    'utf8',
  );
}

console.log(`\n${races.length} races, ${racialSkills.length} racial skills`);
console.log(`  ${races.filter((r) => r.stats).length} races with a parsed base stat line`);
console.log(`  ${racialSkills.filter((s) => !s.race).length} skills without a race attribution`);
console.log(`  -> ${path.relative(process.cwd(), OUT)}/*.md, raw/races.json, raw/racial-skills.json`);

// A survey of what came back, so the next pass can parse against real shapes
// rather than a guess at the template names.
const templateCounts = {};
for (const record of records) {
  for (const template of record.templates) templateCounts[template.name] = (templateCounts[template.name] ?? 0) + 1;
}
console.log('\nTemplates seen (most common first):');
for (const [name, count] of Object.entries(templateCounts).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(count).padStart(3)}  ${name}`);
}
console.log(`\nRaw wikitext -> ${path.relative(process.cwd(), path.join(RAW, 'races-wikitext.json'))}`);
console.log('Inspect the template shapes above, then extend this script to emit wiki-data/races/*.md.');

await browser.close();
