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
import { readFile } from 'node:fs/promises';

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

await step('skill details show wiki text and allow rank changes by touch', async () => {
  const { text } = JSON.parse(await readFile(new URL('../src/data/content/skills-text.json', import.meta.url), 'utf8'));
  const reference = text.find(skill => skill.id === 'execute');
  await jump('Loadout');
  await page.locator('#panel-loadout .tab').filter({ hasText: /^skills/i }).tap();
  const details = page.getByRole('button', { name: 'Read Execute details', exact: true });
  const row = details.locator('xpath=ancestor::div[contains(@class,"entry--skill")]');
  const before = await row.locator('.rank-value').innerText();
  await details.tap();
  const dialog = page.getByRole('dialog', { name: 'Execute', exact: true });
  await dialog.locator('.skill-card__prose').first().waitFor();
  if (await dialog.locator('.skill-card__prose').first().textContent() !== reference.description) throw new Error('wiki description differs');
  if (await dialog.locator('.skill-card__power').textContent() !== reference.powerRaw) throw new Error('wiki power formula differs');
  if (await dialog.locator('.skill-card__ranks tbody tr').count() !== 5) throw new Error('rank table is incomplete');
  const rankOnePower = Number(await dialog.locator('.skill-card__total dd').innerText());
  if (!(rankOnePower > 0)) throw new Error('skill power did not use the equipped weapon');
  const modal = await dialog.boundingBox();
  if (modal.x < 0 || modal.x + modal.width > width + 1) throw new Error('skill card exceeds viewport');
  await dialog.getByRole('button', { name: 'Execute rank up', exact: true }).tap();
  if (await dialog.locator('.skill-card__ranks .is-current th').innerText() !== '1 · Current') throw new Error('rank did not update');
  await dialog.getByRole('button', { name: 'Execute rank up', exact: true }).tap();
  const rankTwoPower = Number(await dialog.locator('.skill-card__total dd').innerText());
  if (Math.abs(rankTwoPower - rankOnePower * 120 / 110) > 0.02) throw new Error('skill power did not update with rank');
  await dialog.getByRole('button', { name: 'Execute rank down', exact: true }).tap();
  await dialog.getByRole('button', { name: 'Execute rank down', exact: true }).tap();
  await dialog.getByRole('button', { name: /Close/ }).tap();
  if (await row.locator('.rank-value').innerText() !== before) throw new Error('opening details changed the skill rank');
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

await step('History is selected in Traits and only one stays selected', async () => {
  if (await page.locator('#panel-identity').getByLabel('History', { exact: true }).count()) throw new Error('History is still in Identity');
  await jump('Loadout');
  await page.locator('#panel-loadout .tab').filter({ hasText: /^traits/i }).tap();
  await page.getByRole('searchbox', { name: 'Search traits', exact: true }).fill('History:');
  const warrior = page.getByRole('checkbox', { name: 'History: Warrior', exact: true });
  const assassin = page.getByRole('checkbox', { name: 'History: Assassin', exact: true });
  await warrior.tap();
  if (await warrior.getAttribute('aria-checked') !== 'true') throw new Error('History was not selected');
  await assassin.tap();
  if (await warrior.getAttribute('aria-checked') !== 'false' || await assassin.getAttribute('aria-checked') !== 'true') throw new Error('History selection did not replace the previous choice');
  await assassin.tap();
  if (await assassin.getAttribute('aria-checked') !== 'false') throw new Error('History was not cleared');
});

await step('Aria has one toggle that applies and removes its bonuses', async () => {
  await page.evaluate(() => {
    const file = JSON.parse(localStorage.getItem('sl2:aether:draft:v1'));
    file.build.mainClass = 'Bard';
    file.build.subClass = 'Bard';
    file.build.skillRanks = { main: { 'aria-of-agility': 5 }, sub: {} };
    file.build.skillConditionals = {};
    localStorage.setItem('sl2:aether:draft:v1', JSON.stringify(file));
  });
  await page.reload();
  await page.waitForSelector('.shell');
  await jump('Loadout');
  await page.locator('#panel-loadout .tab').filter({ hasText: /^skills/i }).tap();
  await page.getByRole('button', { name: 'Read Aria of Agility details', exact: true }).tap();
  const dialog = page.getByRole('dialog', { name: 'Aria of Agility', exact: true });
  const toggle = dialog.getByRole('switch');
  if (await toggle.count() !== 1) throw new Error('song has more than one toggle');
  const evade = page.locator('[data-entry="evade"] .readout__value');
  const before = Number(await evade.innerText());
  await toggle.tap();
  await page.waitForTimeout(400);
  if (await toggle.getAttribute('aria-checked') !== 'true') throw new Error('song did not activate');
  if (Number(await evade.innerText()) - before !== 14) throw new Error('CEL and Evade bonuses were not applied together');
  const box = await dialog.boundingBox();
  if (box.x < 0 || box.x + box.width > width + 1) throw new Error('song card exceeds viewport');
  await toggle.tap();
  await page.waitForTimeout(400);
  if (Number(await evade.innerText()) !== before) throw new Error('song bonuses were not removed');
  await dialog.getByRole('button', { name: /Close/ }).tap();
});

await step('crystals and White Spirits change HP and FP and survive reload', async () => {
  const hp = page.locator('[data-entry="maxHP"] .readout__value');
  const fp = page.locator('[data-entry="fp"] .readout__value');
  const read = async locator => Number((await locator.innerText()).replaceAll(',', ''));
  const beforeHP = await read(hp);
  const beforeFP = await read(fp);
  await jump('Identity');
  await page.getByRole('spinbutton', { name: /^Crystals/ }).fill('45');
  await jump('Loadout');
  await page.locator('#panel-loadout .tab').filter({ hasText: /^talents/i }).tap();
  await page.getByRole('spinbutton', { name: /^White Spirits/ }).fill('5');
  await page.waitForTimeout(500);
  if (await read(hp) - beforeHP !== 60 || await read(fp) - beforeFP !== 60) throw new Error('HP/FP bonuses did not apply');
  if (!await page.getByText('Black Spirits', { exact: true }).count() || !await page.getByText('TBA', { exact: true }).count()) throw new Error('Black Spirits placeholder is missing');
  await hp.tap();
  if (await page.getByText('Live, from this build', { exact: true }).count()) throw new Error('redundant readout note remains');
  await page.getByRole('dialog').getByRole('button', { name: /Close/ }).tap();
  await page.reload();
  await page.waitForSelector('.shell');
  if (await page.getByRole('spinbutton', { name: /^Crystals/ }).inputValue() !== '45') throw new Error('crystals did not persist');
  await jump('Loadout');
  await page.locator('#panel-loadout .tab').filter({ hasText: /^talents/i }).tap();
  if (await page.getByRole('spinbutton', { name: /^White Spirits/ }).inputValue() !== '5') throw new Error('spirits did not persist');
});

await step('nothing scrolls sideways', async () => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) throw new Error(`page scrolls ${over}px sideways`);
});

console.log(`\nconsole errors: ${problems.length ? '' : 'none'}`);
for (const line of new Set(problems)) console.log('  ', line);

await browser.close();
if (failures || problems.length) process.exitCode = 1;
