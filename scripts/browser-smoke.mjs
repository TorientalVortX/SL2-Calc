import { writeFile } from 'node:fs/promises';

const port = process.argv[2] ?? '9224';
const screenshotPath = process.argv[3];
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 1000);
const verifyOffline = process.argv.includes('--offline');
const inspectOptimizer = process.argv.includes('--optimizer');
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const target = targets.find((candidate) => candidate.type === 'page' && candidate.url.includes('127.0.0.1'));
if (!target) throw new Error('Calculator browser target was not found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;
const diagnostics = [];

const request = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const operation = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) operation?.reject(new Error(message.error.message));
    else operation?.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') {
    diagnostics.push(message.params.exceptionDetails.text, message.params.exceptionDetails.exception?.description ?? '');
  } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    diagnostics.push(...message.params.args.map((argument) => argument.value ?? argument.description));
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
await request('Runtime.enable');
await request('Page.enable');
await request('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 500 });
await request('Page.reload', { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 6000));
await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find((button) => button.innerText.includes('Skip Intro'))?.click()` });
await new Promise((resolve) => setTimeout(resolve, 750));

for (const [label, expected] of [['Weapon', 'Weapon Calculator'], ['Armor', 'Armor Calculator'], ['Screen', 'Screenshot Mode'], ['Stats', 'Private build optimizer experiment']]) {
  await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('[role="tab"]')].find((button) => button.innerText.trim() === ${JSON.stringify(label)})?.click()` });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const workspace = await request('Runtime.evaluate', { expression: `document.getElementById('root')?.innerText.includes(${JSON.stringify(expected)})`, returnByValue: true });
  console.log(`workspace:${label}=${Boolean(workspace.result.value)}`);
  if (!workspace.result.value) process.exitCode = 1;
}

await request('Runtime.evaluate', { expression: `document.querySelector('button[aria-label^="Choose Main Class"]')?.click()` });
await new Promise((resolve) => setTimeout(resolve, 300));
let dialogState = await request('Runtime.evaluate', { expression: `Boolean(document.querySelector('[role="dialog"]'))`, returnByValue: true });
console.log(`class-dialog:open=${Boolean(dialogState.result.value)}`);
if (!dialogState.result.value) process.exitCode = 1;
await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('[data-class-choice="true"]')].find((button) => button.innerText.trim() === 'Arbalest')?.click()` });
await request('Runtime.evaluate', { expression: `document.querySelector('button[aria-label^="Choose Sub Class"]')?.click()` });
await new Promise((resolve) => setTimeout(resolve, 200));
await request('Runtime.evaluate', { expression: `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))` });
await new Promise((resolve) => setTimeout(resolve, 200));
dialogState = await request('Runtime.evaluate', { expression: `JSON.stringify({ closed: !document.querySelector('[role="dialog"]'), focusReturned: document.activeElement?.getAttribute('aria-label')?.startsWith('Choose Sub Class') })`, returnByValue: true });
console.log(`class-dialog:keyboard=${dialogState.result.value}`);
const keyboardState = JSON.parse(dialogState.result.value);
if (!keyboardState.closed || !keyboardState.focusReturned) process.exitCode = 1;

await request('Runtime.evaluate', { expression: `document.querySelector('button[aria-label^="Choose Main Class"]')?.click()` });
await new Promise((resolve) => setTimeout(resolve, 200));
await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('[data-class-choice="true"]')].find((button) => button.innerText.trim() === 'Ghost')?.click()` });
await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('[role="tab"]')].find((button) => button.innerText.trim() === 'Stats')?.click()` });
await new Promise((resolve) => setTimeout(resolve, 300));

await request('Runtime.evaluate', { expression: `(() => {
  const select = [...document.querySelectorAll('label')].find((label) => label.innerText.includes('Reference evidence'))?.querySelector('select');
  if (!select) return false;
  select.value = 'amalgama-ghost-black-knight';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()` });
await new Promise((resolve) => setTimeout(resolve, 200));
const profileState = await request('Runtime.evaluate', { expression: `JSON.stringify({
  selected: [...document.querySelectorAll('label')].find((label) => label.innerText.includes('Reference evidence'))?.querySelector('select')?.value === 'amalgama-ghost-black-knight',
  fixedMain: document.querySelector('[aria-labelledby="optimizer-title"]')?.innerText.includes('main class Ghost'),
  engineChoices: [...document.querySelectorAll('[role="radio"]')].map((button) => button.innerText.trim())
})`, returnByValue: true });
console.log(`optimizer:profile=${profileState.result.value}`);
const profile = JSON.parse(profileState.result.value);
if (!profile.selected || !profile.fixedMain || profile.engineChoices.length !== 3) process.exitCode = 1;

await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('[role="radio"]')].find((button) => button.innerText.includes('V2 search'))?.click()` });
await new Promise((resolve) => setTimeout(resolve, 300));
await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find((button) => button.innerText.includes('Run V2 optimizer'))?.click()` });
for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const finished = await request('Runtime.evaluate', { expression: `document.body.innerText.includes('Apply primary build') || Boolean(document.querySelector('[role="alert"]'))`, returnByValue: true });
  if (finished.result.value) break;
}
const optimizerState = await request('Runtime.evaluate', { expression: `JSON.stringify({ result: document.body.innerText.includes('Apply primary build'), validated: document.body.innerText.includes('Validated candidate'), equipment: document.body.innerText.includes('Primary weapon') && document.body.innerText.includes('Torso'), aptitude: document.body.innerText.includes('APT breakpoint efficiency') && document.body.innerText.includes('stranded'), oldTab: [...document.querySelectorAll('[role="tab"]')].some((tab) => tab.innerText.includes('Optimizer')) })`, returnByValue: true });
console.log(`optimizer=${optimizerState.result.value}`);
const optimizer = JSON.parse(optimizerState.result.value);
if (!optimizer.result || !optimizer.validated || !optimizer.equipment || !optimizer.aptitude || optimizer.oldTab) process.exitCode = 1;
await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find((button) => button.innerText.includes('Apply primary build'))?.click()` });
await new Promise((resolve) => setTimeout(resolve, 300));
const undoState = await request('Runtime.evaluate', { expression: `document.body.innerText.includes('Undo optimizer')`, returnByValue: true });
console.log(`optimizer:undo=${Boolean(undoState.result.value)}`);
if (!undoState.result.value) process.exitCode = 1;
const result = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    title: document.title,
    rootText: document.getElementById('root')?.innerText.slice(0, 1000),
    rootHtml: document.getElementById('root')?.innerHTML.slice(0, 1000),
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    serviceWorker: Boolean(navigator.serviceWorker?.controller)
  })`,
  returnByValue: true,
});

console.log(result.result.value);
if (inspectOptimizer) {
  await request('Runtime.evaluate', { expression: `document.getElementById('optimizer-title')?.scrollIntoView({ block: 'start' })` });
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (screenshotPath) {
  const screenshot = await request('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
}
if (verifyOffline) {
  await request('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await request('Network.enable');
  await request('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await request('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const offlineResult = await request('Runtime.evaluate', {
    expression: `JSON.stringify({ title: document.title, rootText: document.getElementById('root')?.innerText.slice(0, 120), controlled: Boolean(navigator.serviceWorker?.controller) })`,
    returnByValue: true,
  });
  console.log(`offline=${offlineResult.result.value}`);
  const offlineState = JSON.parse(offlineResult.result.value);
  if (!offlineState.controlled || !offlineState.rootText?.includes('SL2 Calculator Suite')) process.exitCode = 1;
  await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find((button) => button.innerText.includes('Skip Intro'))?.click()` });
  await new Promise((resolve) => setTimeout(resolve, 750));
  for (const [label, expected] of [['Weapon', 'Weapon Calculator'], ['Armor', 'Armor Calculator'], ['Screen', 'Screenshot Mode'], ['Stats', 'Private build optimizer experiment']]) {
    await request('Runtime.evaluate', { expression: `[...document.querySelectorAll('[role="tab"]')].find((button) => button.innerText.trim() === ${JSON.stringify(label)})?.click()` });
    await new Promise((resolve) => setTimeout(resolve, 750));
    const workspace = await request('Runtime.evaluate', { expression: `document.getElementById('root')?.innerText.includes(${JSON.stringify(expected)})`, returnByValue: true });
    console.log(`offline-workspace:${label}=${Boolean(workspace.result.value)}`);
    if (!workspace.result.value) process.exitCode = 1;
  }
}
if (diagnostics.length) {
  console.error(diagnostics.join('\n'));
  process.exitCode = 1;
}
socket.close();
