/**
 * Captures the opening cinematic at a list of timestamps.
 *
 * The intro is a timeline, so a single screenshot says almost nothing about it.
 * This clears the "already seen" flag, reloads, and grabs a frame at each
 * requested moment measured from the reload, which is the only way to review an
 * animation without watching it.
 *
 * Usage:
 *   node scripts/aether-intro-shots.mjs <port> <outDir> <url> [ms,ms,ms...]
 */
import { mkdir, writeFile } from 'node:fs/promises';

const port = process.argv[2] ?? '9224';
const outDir = process.argv[3] ?? '.';
const pageUrl = process.argv[4] ?? 'http://127.0.0.1:5230/';
const marks = (process.argv[5] ?? '700,2000,3200,4400,6000')
  .split(',').map(Number).filter(Number.isFinite).sort((a, b) => a - b);
const width = Number(process.argv[6] ?? 1600);
const height = Number(process.argv[7] ?? 1000);

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const target = targets.find(candidate => candidate.type === 'page' && candidate.url.includes('aether'))
  ?? await (await fetch(`http://127.0.0.1:${port}/json/new?${pageUrl}`, { method: 'PUT' })).json();
if (!target?.webSocketDebuggerUrl) throw new Error('Could not obtain a CDP page target.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;
const diagnostics = [];

const request = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

socket.addEventListener('close', () => {
  for (const operation of pending.values()) operation.reject(new Error('CDP socket closed'));
  pending.clear();
});
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const operation = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) operation?.reject(new Error(message.error.message));
    else operation?.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') {
    diagnostics.push(message.params.exceptionDetails.text ?? '', message.params.exceptionDetails.exception?.description ?? '');
  } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    diagnostics.push(...message.params.args.map(argument => argument.value ?? argument.description ?? ''));
  }
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

await request('Runtime.enable');
await request('Page.enable');
await request('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

// Land on the page first so the origin exists, then clear the seen-flag so the
// full overture plays rather than the short returning-visitor cut.
await request('Page.navigate', { url: pageUrl });
await wait(2500);
// `--keep-seen` leaves the flag in place, which is how the short returning-visitor
// cut gets reviewed.
if (!process.argv.includes('--keep-seen')) {
  await request('Runtime.evaluate', { expression: 'localStorage.removeItem("sl2:aether:intro:v1")' });
}

await mkdir(outDir, { recursive: true });

const reloadAt = Date.now();
await request('Page.reload', { ignoreCache: false });

for (const mark of marks) {
  const due = reloadAt + mark;
  const remaining = due - Date.now();
  if (remaining > 0) await wait(remaining);
  const shot = await request('Page.captureScreenshot', { format: 'png' });
  const path = `${outDir}/t-${String(mark).padStart(5, '0')}.png`;
  await writeFile(path, Buffer.from(shot.data, 'base64'));
  console.log(`captured ${mark}ms -> ${path}`);
}

// And the unveiling: enter, then catch the sheet arriving behind the curtain.
await request('Runtime.evaluate', { expression: 'document.querySelector(".intro")?.click()' });
for (const offset of [220, 700, 1500]) {
  await wait(offset === 220 ? 220 : 480);
  const shot = await request('Page.captureScreenshot', { format: 'png' });
  const path = `${outDir}/exit-${String(offset).padStart(4, '0')}.png`;
  await writeFile(path, Buffer.from(shot.data, 'base64'));
  console.log(`captured exit+${offset}ms -> ${path}`);
}

const state = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    introGone: !document.querySelector('.intro'),
    panels: document.querySelectorAll('.panel').length,
    seen: localStorage.getItem('sl2:aether:intro:v1'),
  })`,
  returnByValue: true,
});
console.log('state:', state.result.value);

if (diagnostics.filter(Boolean).length) {
  console.log('errors:');
  for (const line of diagnostics.filter(Boolean)) console.log('  ', line);
  process.exitCode = 1;
} else {
  console.log('errors: none');
}

socket.close();
