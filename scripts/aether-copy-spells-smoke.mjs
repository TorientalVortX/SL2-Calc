import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const artifactDir = 'outputs/spellthief-ui';
await fs.mkdir(artifactDir, { recursive: true });
const file = {
 schemaVersion: 1, appVersion: '0.8.0', dataVersion: '2026.08.14', buildName: 'Copy spell UI check',
 build: { race: 'Other', subrace: 'Redtail', mainClass: 'Shapeshifter', subClass: 'Spellthief', characterLevel: 60,
  skillRanks: { main: {}, sub: { 'spell-snatch': 5 } }, spellthief: { cards: [], equipped: [] } },
};
const errors = [];
try {
 for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 950 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(data => {
   if (!localStorage.getItem('copy-smoke-seeded')) {
    localStorage.setItem('sl2:aether:draft:v1', JSON.stringify(data));
    localStorage.setItem('copy-smoke-seeded', 'yes');
   }
  }, file);
  await page.goto('http://127.0.0.1:5199/');
  await page.locator('#panel-loadout .tab').filter({ hasText: /^skills/i }).click();
  await page.getByRole('button', { name: /Open spell library/ }).click();
  assert.equal(await page.getByRole('button', { name: /kit/i }).count(), 0);
  assert.equal(await page.getByRole('option', { name: /Ice.*Wind/i }).count(), 0);
  for (const name of ['Libegrande', 'Ring of Pearls', 'Water Wall', 'Phoenix', 'Acid Rain', 'Invigoration']) {
   await page.getByLabel('Search copy spells').fill(name);
   await page.getByRole('button', { name: `Steal ${name}`, exact: true }).click();
  }
  assert.match(await page.getByRole('dialog').innerText(), /6 \/ 6 copies/);
  await page.getByLabel('Filter copy spells').selectOption('all');
  await page.getByLabel('Search copy spells').fill('Graft');
  await page.getByRole('button', { name: 'Steal Graft', exact: true }).click();
  await page.getByLabel('Filter copy spells').selectOption('cards');
  await page.getByLabel('Search copy spells').fill('Libegrande');
  assert.equal(await page.getByRole('button', { name: 'Prepare Libegrande', exact: true }).count(), 1);
  await page.getByLabel('Search copy spells').fill('Ice Jet');
  assert.match(await page.getByRole('dialog').innerText(), /No spells match/);
  await page.getByLabel('Search copy spells').fill('');
  await page.getByLabel('Copy spell source class').selectOption('Evoker');
  assert.equal(await page.locator('.copy-library summary').count(), 1);
  await page.locator('.copy-library summary').filter({ hasText: 'Libegrande' }).click();
  assert.match(await page.locator('.copy-library').innerText(), /maximum rank 3/);
  await page.getByLabel('Copy spell source class').selectOption('all');
  await page.getByRole('dialog').screenshot({ path: `${artifactDir}/library-${width}.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
   const saved = JSON.parse(localStorage.getItem('sl2:aether:draft:v1') ?? '{}');
   return saved.build?.spellthief?.equipped?.length === 6 && saved.build.spellthief.equipped.includes('graft');
  });
  await page.reload();
  await page.locator('#panel-loadout .tab').filter({ hasText: /^skills/i }).click();
  assert.match(await page.getByRole('region', { name: 'Spellthief copy spells' }).innerText(), /6 \/ 6 copies/);
  await page.getByRole('region', { name: 'Spellthief copy spells' }).screenshot({ path: `${artifactDir}/prepared-${width}.png` });
  await page.close();
 }
 assert.deepEqual(errors, []);
 console.log('PASS: desktop/mobile general library, max ranks, class filtering, replacement, Evoke exclusion, persistence, screenshots, no page errors or horizontal overflow.');
} finally { await browser.close(); }
