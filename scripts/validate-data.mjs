import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const contentDirectory = path.join(root, 'src', 'data', 'content');
const errors = [];
const STAT_KEYS = new Set(['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt']);
const SCALING_KEYS = new Set([...STAT_KEYS].filter((key) => key !== 'apt'));

const fail = (location, message) => errors.push(`${location}: ${message}`);
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const readJson = async (filename) => JSON.parse(await readFile(path.join(contentDirectory, filename), 'utf8'));

function validateStatRecord(value, location, partial = false, allowedExtras = new Set()) {
  if (!isRecord(value)) return fail(location, 'expected an object');
  if (!partial) {
    for (const key of STAT_KEYS) if (typeof value[key] !== 'number') fail(`${location}.${key}`, 'expected a number');
  }
  for (const [key, amount] of Object.entries(value)) {
    if (!STAT_KEYS.has(key) && !allowedExtras.has(key)) fail(`${location}.${key}`, 'unsupported stat key');
    if (allowedExtras.has(key)) continue;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) fail(`${location}.${key}`, 'expected a finite number');
  }
}

const files = await readdir(contentDirectory);
const weaponFiles = files.filter((name) => /^weapons-.+\.json$/.test(name));
const weaponNames = new Set();
const weaponIds = new Set();
let weaponCount = 0;
for (const filename of weaponFiles) {
  const records = await readJson(filename);
  if (!Array.isArray(records)) {
    fail(filename, 'expected a weapon array');
    continue;
  }
  records.forEach((weapon, index) => {
    const location = `${filename}[${index}]`;
    weaponCount += 1;
    if (!weapon?.id || typeof weapon.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
    else if (weaponIds.has(weapon.id)) fail(`${location}.id`, `duplicate weapon ID "${weapon.id}"`);
    else weaponIds.add(weapon.id);
    if (!weapon?.name || typeof weapon.name !== 'string') fail(`${location}.name`, 'expected a non-empty string');
    else if (weaponNames.has(weapon.name)) fail(`${location}.name`, `duplicate weapon name "${weapon.name}"`);
    else weaponNames.add(weapon.name);
    for (const key of ['rarity', 'range', 'power', 'accuracy', 'critical', 'criticalDamage', 'weight']) {
      if (typeof weapon?.[key] !== 'number' || !Number.isFinite(weapon[key])) fail(`${location}.${key}`, 'expected a finite number');
    }
    if (!Array.isArray(weapon?.scaling) || weapon.scaling.length === 0) fail(`${location}.scaling`, 'expected at least one scaling record');
    else weapon.scaling.forEach((scaling, scalingIndex) => {
      for (const [key, amount] of Object.entries(scaling)) {
        if (key === 'type') continue;
        if (!SCALING_KEYS.has(key)) fail(`${location}.scaling[${scalingIndex}].${key}`, 'unsupported scaling key');
        if (typeof amount !== 'number' || amount < 0) fail(`${location}.scaling[${scalingIndex}].${key}`, 'expected a non-negative number');
      }
    });
  });
}

const armorData = JSON.parse(await readFile(path.join(root, 'src', 'data', 'armors.json'), 'utf8'));
const armorNames = new Set();
const armorIds = new Set();
let armorCount = 0;
for (const [type, records] of Object.entries(armorData)) {
  if (!Array.isArray(records)) {
    fail(`armors.json.${type}`, 'expected an array');
    continue;
  }
  records.forEach((armor, index) => {
    const location = `armors.json.${type}[${index}]`;
    armorCount += 1;
    if (!armor?.id || typeof armor.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
    else if (armorIds.has(armor.id)) fail(`${location}.id`, `duplicate armor ID "${armor.id}"`);
    else armorIds.add(armor.id);
    if (!armor?.name || typeof armor.name !== 'string') fail(`${location}.name`, 'expected a non-empty string');
    else if (armorNames.has(armor.name)) fail(`${location}.name`, `duplicate armor name "${armor.name}"`);
    else armorNames.add(armor.name);
    for (const key of ['armor', 'magicArmor', 'evade', 'weight', 'rarity']) {
      if (typeof armor?.[key] !== 'number' || !Number.isFinite(armor[key])) fail(`${location}.${key}`, 'expected a finite number');
    }
  });
}

const races = await readJson('races.json');
for (const [name, record] of Object.entries(races.subraces ?? {})) {
  validateStatRecord(record, `races.json.subraces.${name}`, false, new Set(['allowedRaces']));
  for (const allowedRace of record.allowedRaces ?? []) {
    if (!races.races?.[allowedRace]) fail(`races.json.subraces.${name}.allowedRaces`, `unknown race "${allowedRace}"`);
  }
}

const classes = await readJson('classes.json');
for (const [name, record] of Object.entries(classes.classes ?? {})) validateStatRecord(record, `classes.json.classes.${name}`, false, new Set(['validWeapons']));
for (const [baseName, hierarchy] of Object.entries(classes.hierarchy ?? {})) {
  if (!classes.classes?.[baseName]) fail(`classes.json.hierarchy.${baseName}`, 'base class has no class record');
  for (const subclass of hierarchy.subClasses ?? []) {
    if (!classes.classes?.[subclass]) fail(`classes.json.hierarchy.${baseName}.subClasses`, `unknown class "${subclass}"`);
  }
}
for (const [name, passive] of Object.entries(classes.passives ?? {})) {
  if (!classes.classes?.[name]) fail(`classes.json.passives.${name}`, 'passive references an unknown class');
  validateStatRecord(passive.stats, `classes.json.passives.${name}.stats`, true);
}

const optimizerProfiles = await readJson('optimizer-profiles.json');
if (optimizerProfiles.schemaVersion !== 1) fail('optimizer-profiles.json.schemaVersion', 'only schema version 1 is supported');
const profileIds = new Set();
for (const [index, profile] of (optimizerProfiles.profiles ?? []).entries()) {
  const location = `optimizer-profiles.json.profiles[${index}]`;
  if (!profile?.id || typeof profile.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
  else if (profileIds.has(profile.id)) fail(`${location}.id`, `duplicate profile ID "${profile.id}"`);
  else profileIds.add(profile.id);
  if (!races.races?.[profile.race]) fail(`${location}.race`, `unknown race "${profile.race}"`);
  if (!races.subraces?.[profile.subrace]) fail(`${location}.subrace`, `unknown subrace "${profile.subrace}"`);
  else if (Array.isArray(races.subraces[profile.subrace].allowedRaces) && !races.subraces[profile.subrace].allowedRaces.includes(profile.race)) fail(`${location}.race`, `subrace "${profile.subrace}" does not allow race "${profile.race}"`);
  if (!classes.classes?.[profile.primaryClass] && profile.enabled !== false) fail(`${location}.primaryClass`, `unknown enabled primary class "${profile.primaryClass}"`);
  if (!classes.classes?.[profile.secondaryClass]) fail(`${location}.secondaryClass`, `unknown secondary class "${profile.secondaryClass}"`);
  if (profile.enabled === false && !profile.unavailableReason) fail(`${location}.unavailableReason`, 'disabled profiles must explain why they are unavailable');
  validateStatRecord(profile.scaledStatTargets, `${location}.scaledStatTargets`, true);
  if (!Array.isArray(profile.priorityStats)) fail(`${location}.priorityStats`, 'expected an array');
  else for (const stat of profile.priorityStats) if (!STAT_KEYS.has(stat)) fail(`${location}.priorityStats`, `unsupported stat key "${stat}"`);
  if (!isRecord(profile.weapon?.scaling)) fail(`${location}.weapon.scaling`, 'expected an object');
  else for (const [stat, amount] of Object.entries(profile.weapon.scaling)) {
    if (!SCALING_KEYS.has(stat)) fail(`${location}.weapon.scaling.${stat}`, 'unsupported scaling key');
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) fail(`${location}.weapon.scaling.${stat}`, 'expected a non-negative finite number');
  }
}

const bonuses = await readJson('bonuses.json');
for (const [name, food] of Object.entries(bonuses.foods ?? {})) validateStatRecord(food.stats, `bonuses.json.foods.${name}.stats`, true);
for (const [name, history] of Object.entries(bonuses.history ?? {})) validateStatRecord(history.stats, `bonuses.json.history.${name}.stats`, true);

const weaponModifiers = await readJson('weapon-modifiers.json');
for (const [group, names] of Object.entries(weaponModifiers.materialCategories ?? {})) {
  if (!Array.isArray(names)) fail(`weapon-modifiers.json.materialCategories.${group}`, 'expected an array');
  else for (const name of names) if (!weaponModifiers.materials?.[name]) fail(`weapon-modifiers.json.materialCategories.${group}`, `unknown material "${name}"`);
}
for (const [group, names] of Object.entries(weaponModifiers.partCategories ?? {})) {
  if (!Array.isArray(names)) fail(`weapon-modifiers.json.partCategories.${group}`, 'expected an array');
  else for (const name of names) if (!weaponModifiers.parts?.[name]) fail(`weapon-modifiers.json.partCategories.${group}`, `unknown part "${name}"`);
}
for (const [section, records] of Object.entries({ materials: weaponModifiers.materials, parts: weaponModifiers.parts, enchantments: weaponModifiers.enchantments })) {
  if (!isRecord(records)) {
    fail(`weapon-modifiers.json.${section}`, 'expected an object');
    continue;
  }
  for (const [name, modifier] of Object.entries(records)) {
    if (!isRecord(modifier)) fail(`weapon-modifiers.json.${section}.${name}`, 'expected an object');
    else for (const [field, amount] of Object.entries(modifier)) if (typeof amount !== 'number' || !Number.isFinite(amount)) fail(`weapon-modifiers.json.${section}.${name}.${field}`, 'expected a finite number');
  }
}
for (const [weaponType, scaling] of Object.entries(weaponModifiers.defaultScaling ?? {})) {
  validateStatRecord(scaling, `weapon-modifiers.json.defaultScaling.${weaponType}`, true);
}

const stats = await readJson('stats.json');
for (const key of STAT_KEYS) if (!stats.statInfo?.[key]) fail(`stats.json.statInfo.${key}`, 'missing stat information');

const manifest = JSON.parse(await readFile(path.join(root, 'src', 'data', 'game-data.json'), 'utf8'));
if (manifest.schemaVersion !== 1) fail('game-data.json.schemaVersion', 'only schema version 1 is supported');
if (!/^\d{4}\.\d{2}\.\d{2}$/.test(manifest.dataVersion ?? '')) fail('game-data.json.dataVersion', 'expected YYYY.MM.DD');
if (!Array.isArray(manifest.changes) || manifest.changes.length === 0) fail('game-data.json.changes', 'expected at least one player-facing change');

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`Data valid: ${weaponCount} weapons, ${armorCount} armors, ${Object.keys(races.subraces).length} subraces, ${Object.keys(classes.classes).length} classes, ${optimizerProfiles.profiles.length} optimizer profiles (${optimizerProfiles.profiles.filter((profile) => profile.enabled).length} enabled).`);
