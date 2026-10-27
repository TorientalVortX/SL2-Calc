// Usage: npm run data:diff [ref]   (ref defaults to HEAD)
// Equips every item, trait and set one at a time on the showcase character with its gear removed, in
// the working tree and at `ref`, and lists what each one adds that moved. The bare build is reported
// once, so a change to it doesn't repeat on every line. Run it after regenerating data.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const ref = process.argv[2] ?? 'HEAD';
const here = process.cwd();
const BASE_BUILD = path.join(here, 'scripts', 'social-preview-build.json');

async function snapshot(root) {
  const server = await createServer({
    root, configFile: false, logLevel: 'error', appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true },
  });
  try {
    const load = (file) => server.ssrLoadModule(`/src/${file}`);
    const { buildReducer } = await load('aether/state/build.ts');
    const { effectsForSlot } = await load('aether/state/equipment.ts');
    const { evaluateBuild } = await load('domain/buildEvaluation.ts');
    const { parseBuildFile } = await load('domain/buildPersistence.ts');
    const { ALL_WEAPONS } = await load('data/weapons.ts');
    const { ARMORS } = await load('data/armors.ts');
    const { GEAR_BY_GROUP } = await load('data/gear.ts');
    const { TRAITS } = await load('domain/traits.ts');
    const { ITEM_SETS } = await load('domain/itemSets.ts');

    const base = buildReducer(parseBuildFile(readFileSync(BASE_BUILD, 'utf8')).build, { type: 'equipment-clear' });
    const switchesOn = (build, slot) => effectsForSlot(build.equipment, slot)
      .filter((entry) => entry.effect.applies === 'conditional')
      .reduce((next, entry) => buildReducer(next, { type: 'item-conditional', key: entry.conditionalKey, on: true }), build);
    const read = (build) => {
      const e = evaluateBuild(build);
      const pick = (record, keys) => Object.fromEntries(keys.map((key) => [key, record?.[key]]));
      return {
        ...Object.fromEntries(Object.entries(e.scaledStats).map(([key, value]) => [key, Math.round(value * 100) / 100])),
        ...pick(e.derived, ['maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'armor', 'magicArmor', 'evade', 'criticalEvade']),
        ...Object.fromEntries(Object.entries(e.elementalAttack).map(([key, value]) => [`${key} ATK`, value])),
        ...Object.fromEntries(Object.entries({ ...e.elementalResistance, ...e.physicalResistance }).map(([key, value]) => [`${key} RES`, value])),
        ...Object.fromEntries(Object.entries(pick(e.primaryWeapon, ['power', 'swa', 'hit', 'critical', 'criticalDamage'])).map(([key, value]) => [`weapon ${key}`, value])),
      };
    };

    const gearSlot = { Hands: 'hands', Shield: 'hands', Legs: 'legs', Accessory: 'accessory1' };
    const slotOfGear = { hands: 'slot3', legs: 'legs', accessory1: 'accessory1', accessory2: 'accessory2' };
    const scenarios = {};
    const bare = read(base);
    const added = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [
      key, typeof value === 'number' && typeof bare[key] === 'number' ? Math.round((value - bare[key]) * 100) / 100 : value,
    ]));
    const run = (label, build) => { try { scenarios[label] = added(read(build)); } catch (error) { scenarios[label] = { error: String(error.message ?? error) }; } };
    scenarios['bare build'] = bare;

    for (const weapon of ALL_WEAPONS) {
      run(`weapon: ${weapon.name}`, switchesOn(buildReducer(base, { type: 'equip-weapon', which: 'primaryWeapon', weaponName: weapon.name }), 'primaryWeapon'));
    }
    for (const name of Object.keys(ARMORS)) {
      run(`armor: ${name}`, switchesOn(buildReducer(base, { type: 'equip-armor', armorName: name }), 'armor'));
    }
    for (const [group, items] of Object.entries(GEAR_BY_GROUP)) {
      for (const item of items) {
        const slot = gearSlot[group];
        run(`gear: ${item.name}`, switchesOn(buildReducer(base, { type: 'equip-gear', slot, itemName: item.name }), slotOfGear[slot]));
      }
    }
    for (const trait of TRAITS) {
      if (trait.historyKey) continue;
      const taken = buildReducer(base, { type: 'trait', id: trait.id, taken: true });
      run(`trait: ${trait.name}`, trait.situationalStatBonuses ? buildReducer(taken, { type: 'trait-conditional', id: trait.id, on: true }) : taken);
    }
    for (const [name, set] of Object.entries(ITEM_SETS)) {
      let build = base;
      let weapons = 0;
      let accessories = 0;
      for (const member of set.members) {
        if (ALL_WEAPONS.some((weapon) => weapon.name === member)) {
          build = buildReducer(build, { type: 'equip-weapon', which: weapons++ ? 'offHandWeapon' : 'primaryWeapon', weaponName: member });
        } else if (ARMORS[member]) {
          build = buildReducer(build, { type: 'equip-armor', armorName: member });
        } else {
          const group = Object.entries(GEAR_BY_GROUP).find(([, items]) => items.some((item) => item.name === member))?.[0];
          const slot = group === 'Accessory' ? (accessories++ ? 'accessory2' : 'accessory1') : gearSlot[group];
          if (slot) build = buildReducer(build, { type: 'equip-gear', slot, itemName: member });
        }
      }
      run(`set: ${name}`, build);
    }
    return scenarios;
  } finally {
    await server.close();
  }
}

const worktree = mkdtempSync(path.join(tmpdir(), 'sl2-data-diff-'));
try {
  execFileSync('git', ['worktree', 'add', '--detach', '--force', worktree, ref], { stdio: 'ignore' });
  symlinkSync(path.join(here, 'node_modules'), path.join(worktree, 'node_modules'), 'junction');
  const before = await snapshot(worktree);
  const after = await snapshot(here);

  const signed = (value, label) => (value === undefined ? '—' : label !== 'bare build' && typeof value === 'number' && value > 0 ? `+${value}` : String(value));
  const lines = [];
  for (const label of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[label];
    const b = after[label];
    if (!a) { lines.push(`+ ${label} (new)`); continue; }
    if (!b) { lines.push(`- ${label} (gone)`); continue; }
    const moved = Object.keys({ ...a, ...b })
      .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
      .map((key) => `${key} ${signed(a[key], label)} → ${signed(b[key], label)}`);
    if (moved.length) lines.push(`~ ${label}: ${moved.join(', ')}`);
  }
  const failed = Object.entries(after).filter(([, value]) => value.error);
  console.log(`${Object.keys(after).length} scenarios against ${ref}; ${lines.length} changed.`);
  for (const [label, value] of failed) console.log(`! ${label}: ${value.error}`);
  for (const line of lines) console.log(line);
} finally {
  execFileSync('git', ['worktree', 'remove', '--force', worktree], { stdio: 'ignore' });
  rmSync(worktree, { recursive: true, force: true });
}
