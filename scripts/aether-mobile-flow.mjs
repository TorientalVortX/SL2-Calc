/**
 * Drives the Aether Codex with a thumb at a phone viewport and asserts the flows
 * a phone user actually needs: get to a panel, spend a point, equip something,
 * open a card, and close a dialog.
 *
 * Where `aether-mobile-audit.mjs` measures the layout, this one uses it: several
 * of the fixes it covers were unreachable rather than merely cramped, which a
 * geometry report alone does not catch.
 *
 * Usage: node scripts/aether-mobile-flow.mjs [--url=...] [--width=360] [--height=780]
 */
import { chromium, devices } from 'playwright';

const flag = (name, fallback) => {
  const found = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const pageUrl = flag('url', 'http://127.0.0.1:5199/');
const width = Number(flag('width', 360));
const height = Number(flag('height', 780));

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['Galaxy S9+'],
  viewport: { width, height },
  screen: { width, height },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});

const page = await context.newPage();
const problems = [];
page.on('pageerror', error => problems.push(`page error: ${error}`));
page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });

// Playwright's `isMobile` does not move the pointer/hover media features, and the
// sheet asks them before it hides its keyboard prose. A real S25 answers coarse.
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', {
  features: [
    { name: 'pointer', value: 'coarse' },
    { name: 'hover', value: 'none' },
    { name: 'any-pointer', value: 'coarse' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ],
});

await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForSelector('.shell', { timeout: 15000 });
await page.waitForTimeout(700);

let failures = 0;
const step = async (label, body) => {
  try {
    await body();
    console.log(`  ok    ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${label}\n          ${String(error).split('\n')[0]}`);
  }
};

const jump = async section => {
  await page.locator('.sectionnav__item', { hasText: section }).tap();
  await page.waitForTimeout(900);
};

console.log(`Aether, ${width}x${height}, touch:\n`);

await step('the section strip parks a panel below itself, not under it', async () => {
  await jump('Attributes');
  const box = await page.locator('#panel-attributes').boundingBox();
  if (box.y < 0 || box.y > 200) throw new Error(`panel landed at y=${Math.round(box.y)}`);
});

await step('a stepper is hittable and spends a point', async () => {
  const row = page.locator('.stat').filter({ has: page.locator('.stat__abbr', { hasText: 'STR' }) }).first();
  const plus = row.locator('.step').nth(1);
  const box = await plus.boundingBox();
  if (box.width < 28 || box.height < 28) throw new Error(`stepper is ${Math.round(box.width)}x${Math.round(box.height)}`);
  await plus.tap();
  await page.waitForTimeout(250);
  const value = await row.locator('.stat__input').inputValue();
  if (value !== '1') throw new Error(`input reads ${value}`);
});

await step('the allocation track is wide enough to aim at, and sets a value', async () => {
  const row = page.locator('.stat').filter({ has: page.locator('.stat__abbr', { hasText: 'STR' }) }).first();
  const box = await row.locator('.stat__track').boundingBox();
  if (box.width < 200) throw new Error(`track is only ${Math.round(box.width)}px wide`);
  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.waitForTimeout(300);
  const value = Number(await row.locator('.stat__input').inputValue());
  if (!(value > 20)) throw new Error(`tapping half way set ${value}`);
});

await step('a weapon can be equipped end to end', async () => {
  await jump('Loadout');
  await page.locator('button').filter({ hasText: /^\s*gear/i }).first().tap();
  await page.waitForTimeout(400);
  await page.locator('.slot').first().tap();
  await page.waitForTimeout(600);
  await page.locator('.scrim .entry').first().tap();
  await page.waitForTimeout(500);
  await page.locator('.scrim button').filter({ hasText: /^Done/i }).tap();
  await page.waitForTimeout(500);
  const text = await page.locator('.slot').first().innerText();
  if (/empty/i.test(text)) throw new Error(`slot still reads "${text.replace(/\n/g, ' ')}"`);
});

await step('a stat card opens and closes by touch', async () => {
  await jump('Attributes');
  await page.locator('.stat__name').first().tap();
  await page.waitForTimeout(500);
  if (!await page.locator('.scrim').count()) throw new Error('card did not open');
  await page.locator('.scrim button').filter({ hasText: /Close/i }).first().tap();
  await page.waitForTimeout(400);
  if (await page.locator('.scrim').count()) throw new Error('card did not close');
});

/* Every dialog, checked for the one failure a phone cannot recover from: a Close
   button off the side of the screen, on a device with no Esc key. */
for (const [label, name] of [['Templates', 'templates'], ['Builds', 'saved builds'], ['Advanced', 'advanced'], ['Import', 'import / export']]) {
  await step(`the ${name} dialog fits the screen and closes by touch`, async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.locator('.masthead button').filter({ hasText: new RegExp(`^\\s*${label}`, 'i') }).tap();
    await page.waitForTimeout(500);
    const modal = await page.locator('.scrim .modal').boundingBox();
    if (modal.x < 0 || modal.x + modal.width > width + 1) {
      throw new Error(`modal spans ${Math.round(modal.x)}..${Math.round(modal.x + modal.width)} of ${width}`);
    }
    const close = page.locator('.scrim button').filter({ hasText: /Close/i }).first();
    const box = await close.boundingBox();
    if (box.x < 0 || box.x + box.width > width + 1) throw new Error(`Close sits at x=${Math.round(box.x)}`);
    await close.tap();
    await page.waitForTimeout(400);
    if (await page.locator('.scrim').count()) throw new Error('dialog did not close');
  });
}

await step('nothing scrolls sideways', async () => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) throw new Error(`page scrolls ${over}px sideways`);
});

console.log(`\nconsole errors: ${problems.length ? '' : 'none'}`);
for (const line of new Set(problems)) console.log('  ', line);

await browser.close();
if (failures || problems.length) process.exitCode = 1;
