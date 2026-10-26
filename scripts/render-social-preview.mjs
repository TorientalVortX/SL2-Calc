// Screenshots the production build (`npm run build` first) into the 1200x630 link-preview image.
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const out = process.argv[2] ?? 'public/social-preview.png';
const buildFile = process.argv[3] ?? 'scripts/social-preview-build.json';
// Laid out at desktop width, then scaled down: below 1240px the columns unpin and stack.
const width = 1680;

const draft = await readFile(buildFile, 'utf8');
const server = await preview({ preview: { host: '127.0.0.1', port: 4199, strictPort: true, open: false }, logLevel: 'error' });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width, height: Math.round(width * 630 / 1200) },
    deviceScaleFactor: 1200 / width,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    serviceWorkers: 'block',
  });
  await context.addInitScript(value => localStorage.setItem('sl2:aether:draft:v1', value), draft);
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4199/');
  await page.getByRole('button', { name: 'Templates' }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: out });
  console.log(`Wrote ${out}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
