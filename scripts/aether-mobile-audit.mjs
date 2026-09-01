/**
 * Walks the Aether Codex at a phone viewport (Galaxy S25, 360x780 CSS px) and
 * reports the things that only go wrong there: horizontal overflow, tap targets
 * too small for a thumb, text below a readable size, and dialogs wider than the
 * screen they open on.
 *
 * Usage: node scripts/aether-mobile-audit.mjs [--url=...] [--width=360] [--height=780] [--shots=dir]
 *
 * Complements `aether-smoke.mjs`, which renders one desktop view over CDP. This
 * one drives its own Playwright Chromium so it can emulate touch and a phone DPR.
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const flag = (name, fallback) => {
  const found = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const pageUrl = flag('url', 'http://127.0.0.1:5199/');
const width = Number(flag('width', 360));
const height = Number(flag('height', 780));
const shotDir = flag('shots', 'mobile-audit');
const only = flag('only', null);
/* Same tour with a mouse and a desktop viewport, to check a phone fix did not
   land on the layout it was fenced away from. */
const desktop = process.argv.includes('--desktop');

/** Minimum comfortable thumb target. Below this we note it; below 28 loudly. */
const TAP_MIN = 36;
const TEXT_MIN = 10;

await mkdir(shotDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...(desktop ? {} : devices['Galaxy S9+']),
  viewport: { width, height },
  screen: { width, height },
  deviceScaleFactor: desktop ? 1 : 3,
  isMobile: !desktop,
  hasTouch: !desktop,
  // Skips the overture, which is motion and nothing else, and keeps shots stable.
  reducedMotion: 'reduce',
});

const consoleErrors = [];
const page = await context.newPage();

/*
 * `isMobile` and `hasTouch` do not move the `pointer` and `hover` media features,
 * which is what a stylesheet actually asks when it wants to know whether it is
 * talking to a thumb. A real S25 reports coarse-and-hoverless, so say so.
 */
const cdp = await context.newCDPSession(page);
if (!desktop) await cdp.send('Emulation.setEmulatedMedia', {
  features: [
    { name: 'pointer', value: 'coarse' },
    { name: 'hover', value: 'none' },
    { name: 'any-pointer', value: 'coarse' },
    // Restated because this call replaces the whole feature list, and dropping it
    // would put the overture back in front of every screenshot.
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ],
});
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => consoleErrors.push(String(error)));

await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForSelector('.shell', { timeout: 15000 });
await page.waitForTimeout(800);

/* ----------------------------------------------------------------- probes */

const overflowProbe = viewportWidth => {
  const offenders = [];
  const seen = new Set();
  for (const node of document.querySelectorAll('body *')) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const over = Math.round(rect.right - viewportWidth);
    const under = Math.round(rect.left);
    if (over <= 1 && under >= -1) continue;
    const className = typeof node.className === 'string' ? node.className.trim() : '';
    const label = node.tagName.toLowerCase() + (className ? '.' + className.split(/\s+/).slice(0, 3).join('.') : '');
    const key = label + ':' + over + ':' + under;
    if (seen.has(key)) continue;
    seen.add(key);
    offenders.push({
      label,
      over,
      under,
      width: Math.round(rect.width),
      scrollWidth: node.scrollWidth,
      text: (node.textContent || '').trim().slice(0, 44),
    });
  }
  return {
    docScroll: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
    offenders: offenders.sort((a, b) => (b.over - a.over) || (a.under - b.under)).slice(0, 14),
  };
};

const tapProbe = tapMin => {
  const selector = 'button, a[href], select, input:not([type=hidden]), textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
  const small = [];
  for (const node of document.querySelectorAll(selector)) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.height >= tapMin && rect.width >= tapMin) continue;
    const className = typeof node.className === 'string' ? node.className.trim() : '';
    const label = node.tagName.toLowerCase() + (className ? '.' + className.split(/\s+/).slice(0, 2).join('.') : '');
    small.push({
      label,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      text: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 26),
    });
  }
  const byKey = new Map();
  for (const entry of small) {
    const key = entry.label + '|' + entry.w + 'x' + entry.h;
    const seen = byKey.get(key);
    if (seen) seen.count += 1;
    else byKey.set(key, { ...entry, count: 1 });
  }
  return [...byKey.values()].sort((a, b) => (a.h * a.w) - (b.h * b.w)).slice(0, 16);
};

const textProbe = textMin => {
  const tiny = new Map();
  for (const node of document.querySelectorAll('body *')) {
    if (!node.childNodes.length) continue;
    const direct = [...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim());
    if (!direct) continue;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    // A node inside a hidden ancestor still computes its own display, so ask the
    // layout instead of the cascade.
    if (!node.getClientRects().length) continue;
    const size = parseFloat(style.fontSize);
    if (size >= textMin) continue;
    const className = typeof node.className === 'string' ? node.className.trim() : '';
    const label = node.tagName.toLowerCase() + (className ? '.' + className.split(/\s+/)[0] : '');
    const key = label + '|' + size;
    const seen = tiny.get(key);
    if (seen) seen.count += 1;
    else tiny.set(key, { label, size, count: 1, text: node.textContent.trim().slice(0, 22) });
  }
  return [...tiny.values()].sort((a, b) => a.size - b.size).slice(0, 12);
};

const findings = [];
const record = (view, kind, detail) => findings.push({ view, kind, detail });

async function audit(view, { shot = true } = {}) {
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(overflowProbe, width);
  const taps = await page.evaluate(tapProbe, TAP_MIN);
  const text = await page.evaluate(textProbe, TEXT_MIN);

  console.log(`\n=== ${view} ===`);
  console.log(`  page h-scroll: ${overflow.docScroll}px`);
  if (overflow.offenders.length) {
    console.log('  overflowing:');
    for (const entry of overflow.offenders) {
      console.log(`    ${entry.label} w=${entry.width} over=${entry.over} left=${entry.under} scrollW=${entry.scrollWidth} "${entry.text}"`);
    }
  }
  if (taps.length) {
    console.log('  small targets:');
    for (const entry of taps) console.log(`    ${entry.label} ${entry.w}x${entry.h} x${entry.count} "${entry.text}"`);
  }
  if (text.length) {
    console.log('  tiny text:');
    for (const entry of text) console.log(`    ${entry.label} ${entry.size}px x${entry.count} "${entry.text}"`);
  }
  if (overflow.docScroll > 1) record(view, 'h-scroll', `${overflow.docScroll}px`);
  for (const entry of overflow.offenders) record(view, 'overflow', `${entry.label} over=${entry.over} left=${entry.under}`);
  for (const entry of taps.filter(entry => entry.h < 28 || entry.w < 20)) record(view, 'tap', `${entry.label} ${entry.w}x${entry.h} x${entry.count}`);
  for (const entry of text) record(view, 'text', `${entry.label} ${entry.size}px x${entry.count}`);

  if (shot) await page.screenshot({ path: path.join(shotDir, `${view}.png`) });
  return overflow;
}

/* ------------------------------------------------------------------ tour */

const tap = async (locator, label) => {
  try {
    await locator.first().scrollIntoViewIfNeeded({ timeout: 2000 });
    await locator.first().click({ timeout: 4000 });
    await page.waitForTimeout(400);
    return true;
  } catch {
    console.log(`  ! could not tap ${label}`);
    return false;
  }
};

const closeModal = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
};

const want = name => !only || name.includes(only);

if (want('masthead')) await audit('01-masthead-top');

// The whole page, scrolled through: where stacked-column problems show up.
if (want('scroll')) {
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`\n  document height: ${pageHeight}px (${(pageHeight / height).toFixed(1)} screens)`);
  for (const [index, fraction] of [0.25, 0.5, 0.75, 0.98].entries()) {
    await page.evaluate(f => window.scrollTo(0, document.documentElement.scrollHeight * f), fraction);
    await page.waitForTimeout(350);
    await audit(`02-scroll-${index + 1}`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

// The loadout sheets: gear, skills, traits, racials, youkai.
if (want('loadout')) {
  for (const sheet of ['Gear', 'Skills', 'Traits', 'Racials', 'Youkai']) {
    const tab = page.locator('button').filter({ hasText: new RegExp(`^\\s*${sheet}`, 'i') });
    if (await tap(tab, `${sheet} tab`)) await audit(`03-loadout-${sheet.toLowerCase()}`);
  }
}

// The armory: the widest dialog, and a two-pane one.
if (want('armory')) {
  await tap(page.locator('button').filter({ hasText: /^\s*Gear/i }), 'Gear tab');
  const slotRow = page.locator('.slot, .slotrow, .gear__row, .sheet__row').first();
  if (await tap(slotRow, 'gear slot row')) {
    await audit('04-armory');
    await closeModal();
  }
}

// Dialogs from the masthead.
if (want('dialogs')) {
  for (const [label, name] of [['Templates', 'templates'], ['Builds', 'saves'], ['Advanced', 'advanced'], ['Import', 'transfer']]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const button = page.locator('.masthead button').filter({ hasText: new RegExp(`^\\s*${label}`, 'i') });
    if (await tap(button, label)) {
      await audit(`05-dialog-${name}`);
      await closeModal();
    }
  }
}

// A stat card and a readout card: the two a phone user opens most.
if (want('cards')) {
  await page.evaluate(() => window.scrollTo(0, 0));
  if (await tap(page.locator('.stat__name').first(), 'stat name')) {
    await audit('06-card-stat');
    await closeModal();
  }
  if (await tap(page.locator('.readout--open').first(), 'readout row')) {
    await audit('07-card-readout');
    await closeModal();
  }
}

console.log('\n================ summary ================');
const grouped = new Map();
for (const finding of findings) {
  const key = `${finding.kind}: ${finding.detail}`;
  grouped.set(key, (grouped.get(key) ?? 0) + 1);
}
for (const [key, count] of [...grouped.entries()].sort()) console.log(`  ${key} (${count} view${count > 1 ? 's' : ''})`);
console.log(`\nconsole errors: ${consoleErrors.length ? '' : 'none'}`);
for (const line of new Set(consoleErrors)) console.log('  ', line);
console.log(`\nshots: ${shotDir}`);

await writeFile(path.join(shotDir, 'findings.json'), JSON.stringify({ findings, consoleErrors }, null, 2));
await browser.close();
