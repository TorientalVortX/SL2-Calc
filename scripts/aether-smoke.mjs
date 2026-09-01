/**
 * Renders the Aether Codex page in an already-running Chromium/Edge instance
 * over CDP, reports console errors, and writes a screenshot.
 *
 * Usage: node scripts/aether-smoke.mjs [cdpPort] [out.png] [width] [height] [--click=selector]
 *
 * Kept alongside `browser-smoke.mjs`, which does the same job for the original
 * calculator. Both assume the browser was started with --remote-debugging-port.
 */
import { writeFile } from 'node:fs/promises';

const port = process.argv[2] ?? '9224';
const screenshotPath = process.argv[3] ?? 'aether.png';
const width = Number(process.argv[4] ?? 1600);
const height = Number(process.argv[5] ?? 1000);
const clicks = process.argv.filter(argument => argument.startsWith('--click=')).map(argument => argument.slice(8));
// `--select=Race::Kaelensia` drives a labelled <select> and fires React's onChange.
const selects = process.argv.filter(argument => argument.startsWith('--select=')).map(argument => argument.slice(9));
const keys = process.argv.filter(argument => argument.startsWith('--key=')).map(argument => argument.slice(6));

const urlArgument = process.argv.find(argument => argument.startsWith('--url='));
const pageUrl = urlArgument ? urlArgument.slice(6) : 'http://127.0.0.1:5199/';

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
// Prefer a tab already on the page. Otherwise open one: an internal page such as
// edge://newtab refuses a CDP attach, so navigating an existing tab is not a
// reliable fallback.
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

socket.addEventListener('close', event => {
  console.log(`socket closed: ${event.code} ${event.reason || '(no reason)'}`);
  for (const operation of pending.values()) operation.reject(new Error('CDP socket closed'));
  pending.clear();
});
socket.addEventListener('error', () => console.log('socket error'));

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
await request('Page.navigate', { url: pageUrl });
await wait(4000);

for (const selector of clicks) {
  await request('Runtime.evaluate', {
    expression: `(() => {
      const byText = ${JSON.stringify(selector)}.startsWith('text=');
      if (byText) {
        const wanted = ${JSON.stringify(selector)}.slice(5).toLowerCase();
        const node = [...document.querySelectorAll('button, .tab, .row, .card, .entry')]
          .find(element => element.innerText.trim().toLowerCase().startsWith(wanted));
        node?.click();
        return Boolean(node);
      }
      const node = document.querySelector(${JSON.stringify(selector)});
      node?.click();
      return Boolean(node);
    })()`,
    returnByValue: true,
  }).then(result => console.log(`click ${selector} -> ${result.result.value}`));
  await wait(500);
}

for (const pair of selects) {
  const [label, value] = pair.split('::');
  await request('Runtime.evaluate', {
    expression: `(() => {
      const field = [...document.querySelectorAll('.field')]
        .find(node => node.querySelector('.field__label')?.textContent.trim().toLowerCase() === ${JSON.stringify(label)}.toLowerCase());
      const select = field?.querySelector('select');
      if (!select) return false;
      // React tracks the DOM value, so it ignores a plain assignment; go through
      // the native setter and dispatch the event it listens for.
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(select, ${JSON.stringify(value)});
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return select.value === ${JSON.stringify(value)};
    })()`,
    returnByValue: true,
  }).then(result => console.log(`select ${pair} -> ${result.result.value}`));
  await wait(500);
}

// `--scroll=.panel__body::400` scrolls a panel's own scroll region.
for (const pair of process.argv.filter(argument => argument.startsWith('--scroll=')).map(argument => argument.slice(9))) {
  const [selector, top] = pair.split('::');
  await request('Runtime.evaluate', {
    expression: `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return false;
      node.scrollTop = ${Number(top) || 0};
      return node.scrollTop;
    })()`,
    returnByValue: true,
  }).then(result => console.log(`scroll ${pair} -> ${result.result.value}`));
  await wait(350);
}

for (const key of keys) {
  await request('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0 });
  await request('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
  await wait(400);
}

const readback = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    panels: document.querySelectorAll('.panel').length,
    stats: document.querySelectorAll('.stat').length,
    readouts: document.querySelectorAll('.readout').length,
    elements: document.querySelectorAll('.element').length,
    remaining: document.querySelector('.pool__value')?.textContent ?? null,
    hp: [...document.querySelectorAll('.readout')].find(r => r.textContent.includes('Max HP'))?.textContent ?? null,
    scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  })`,
  returnByValue: true,
});
console.log('state:', readback.result.value);

const shot = await request('Page.captureScreenshot', { format: 'png' });
await writeFile(screenshotPath, Buffer.from(shot.data, 'base64'));
console.log(`screenshot: ${screenshotPath}`);

if (diagnostics.filter(Boolean).length) {
  console.log('errors:');
  for (const line of diagnostics.filter(Boolean)) console.log('  ', line);
  process.exitCode = 1;
} else {
  console.log('errors: none');
}

socket.close();
