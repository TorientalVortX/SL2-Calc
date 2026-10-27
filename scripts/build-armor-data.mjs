// Usage: node scripts/build-armor-data.mjs [--report]  -> src/data/content/armor-modifiers.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// scrape-wiki.mjs collapses the <br>s in a Details cell; scrape-equipment.mjs keeps
// weapon/armor/other as separate fields, so materials come from its JSON.
const MATERIALS_JSON = path.resolve('wiki-data/raw/item-materials.json');
const ENCHANTS_MD = path.resolve('wiki-data/mechanics/enchantments.md');
const OUT = path.resolve('src/data/content/armor-modifiers.json');
const REPORT = process.argv.includes('--report');

const ELEMENTS = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
const ELEMENTS_BY_LENGTH = [...ELEMENTS].sort((a, b) => b.length - a.length);
// Resisted like elements but not elements: Canvas Square is '+5% Pierce Resistance'.
const PHYSICAL = ['Blunt', 'Pierce', 'Slash'];
const RESIST_TYPES = [...ELEMENTS, ...PHYSICAL];
const STAT_WORDS = {
  strength: 'str', str: 'str', will: 'wil', wil: 'wil', celerity: 'cel', cel: 'cel',
  skill: 'ski', ski: 'ski', defense: 'def', def: 'def', resistance: 'res', res: 'res',
  vitality: 'vit', vit: 'vit', faith: 'fai', fai: 'fai', luck: 'luc', luc: 'luc',
  guile: 'gui', gui: 'gui', sanctity: 'san', san: 'san', aptitude: 'apt', apt: 'apt',
};

function tableRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| '))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3 && cells[1] && cells[1] !== 'Name' && !/^-+$/.test(cells[1]));
}

// "No effect." is the wiki explicitly saying so, which differs from an absent clause.
const hasEffect = (text) => Boolean(text) && !/^no effect/i.test(text);

// Magic armour is matched and removed first so "+1 Magic Armor" is never read as "+1 Armor".
function parseArmorEffects(text) {
  const effects = {
    armor: 0, magicArmor: 0, evade: 0, weight: 0, weightMod: 1, hp: 0, hpPercent: 0, fp: 0,
    statusResistance: 0,
    critical: 0, criticalEvade: 0, stats: {}, resistances: {}, elementalAttack: {},
  };
  let found = false;
  // Per-slot amounts are alternatives, not a sum (Warding: "Armor: +5 Resistance. Legs: +3 Resistance").
  let rest = /(?:^|\.)\s*(?:Armor|Torso)\s*:/i.test(text)
    ? (/(?:^|\.)\s*(?:Armor|Torso)\s*:\s*([^.]*)/i.exec(text)?.[1] ?? text)
    : text;

  const take = (pattern, apply) => {
    rest = rest.replace(pattern, (...args) => {
      apply(...args);
      found = true;
      return ' ';
    });
  };

  // Longest unit names first so they win the match.
  take(/([+-]\s*\d+)\s*Magic Armor\b/gi, (_, n) => { effects.magicArmor += Number(n.replace(/\s/g, '')); });
  take(/([+-]\s*\d+)\s*Armor\b/gi, (_, n) => { effects.armor += Number(n.replace(/\s/g, '')); });
  // Critical Evade before Evade, and before Critical, so the longer name wins.
  take(/([+-]\s*\d+)\s*Critical Evade\b/gi, (_, n) => { effects.criticalEvade += Number(n.replace(/\s/g, '')); });
  take(/([+-]\s*\d+)\s*Critical\b/gi, (_, n) => { effects.critical += Number(n.replace(/\s/g, '')); });
  take(/([+-]\s*\d+)\s*Evade\b/gi, (_, n) => { effects.evade += Number(n.replace(/\s/g, '')); });
  // Elemental attack, written "+3 Fire ATK", "+1 Fire, Ice and Wind ATK" or "Fire ATK by 3"; there is no "Pierce ATK".
  const element = `(?:${ELEMENTS_BY_LENGTH.join('|')})`;
  take(new RegExp(`([+-]\\s*\\d+)\\s*(${element}(?:\\s*,\\s*${element})*,?\\s+and\\s+${element})\\s*ATK\\b`, 'gi'), (_, n, list) => {
    for (const name of list.match(new RegExp(element, 'gi'))) {
      const key = ELEMENTS.find((e) => e.toLowerCase() === name.toLowerCase());
      effects.elementalAttack[key] = (effects.elementalAttack[key] ?? 0) + Number(n.replace(/\s/g, ''));
    }
  });
  take(new RegExp(`([+-]\\s*\\d+)\\s*(${ELEMENTS.join('|')})\\s*ATK\\b`, 'gi'), (_, n, element) => {
    const key = ELEMENTS.find((e) => e.toLowerCase() === element.toLowerCase());
    effects.elementalAttack[key] = (effects.elementalAttack[key] ?? 0) + Number(n.replace(/\s/g, ''));
  });
  take(new RegExp(`(${ELEMENTS.join('|')})\\s*ATK\\s+by\\s+(\\d+)`, 'gi'), (_, element, n) => {
    const key = ELEMENTS.find((e) => e.toLowerCase() === element.toLowerCase());
    effects.elementalAttack[key] = (effects.elementalAttack[key] ?? 0) + Number(n);
  });
  take(/([+-]\s*\d+)\s*Weight\b/gi, (_, n) => { effects.weight += Number(n.replace(/\s/g, '')); });
  take(/([+-]\s*\d+)%\s*Weight(?:\s+Increase)?\b/gi, (_, n) => {
    effects.weightMod *= 1 + Number(n.replace(/\s/g, '')) / 100;
  });
  take(/([+-]\s*\d+)%\s*(?:Max(?:imum)?\s*)?HP\b/gi, (_, n) => {
    effects.hpPercent += Number(n.replace(/\s/g, ''));
  });
  take(/([+-]\s*\d+)%\s*Status(?:\s+Effect)?\s+Resist(?:ance)?\b/gi, (_, n) => {
    effects.statusResistance += Number(n.replace(/\s/g, ''));
  });
  take(/([+-]\s*\d+)\s*(?:Max(?:imum)?\s*)?HP\b/gi, (_, n) => { effects.hp += Number(n.replace(/\s/g, '')); });
  take(/([+-]\s*\d+)\s*(?:Max(?:imum)?\s*)?FP\b/gi, (_, n) => { effects.fp += Number(n.replace(/\s/g, '')); });
  // Resistance covers the physical types too: "+5% Pierce Resistance".
  take(new RegExp(`([+-]\\s*\\d+)%\\s*(${RESIST_TYPES.join('|')})\\s*Resistance\\b`, 'gi'), (_, n, type) => {
    const key = RESIST_TYPES.find((e) => e.toLowerCase() === type.toLowerCase());
    effects.resistances[key] = (effects.resistances[key] ?? 0) + Number(n.replace(/\s/g, ''));
  });
  // Prose form: "Increases maximum HP by 60", "Increases STR by 2".
  take(/Increases?\s+(?:your\s+)?max(?:imum)?\s*HP\s+by\s+(\d+)/gi, (_, n) => { effects.hp += Number(n); });
  take(/Increases?\s+(?:your\s+)?max(?:imum)?\s*FP\s+by\s+(\d+)/gi, (_, n) => { effects.fp += Number(n); });
  take(new RegExp(`Increases?\\s+(${Object.keys(STAT_WORDS).join('|')})\\s+by\\s+(\\d+)`, 'gi'), (_, word, n) => {
    const key = STAT_WORDS[word.toLowerCase()];
    effects.stats[key] = (effects.stats[key] ?? 0) + Number(n);
  });
  take(new RegExp(`([+-]\\s*\\d+)\\s+(${Object.keys(STAT_WORDS).join('|')})\\b`, 'gi'), (_, n, word) => {
    const key = STAT_WORDS[word.toLowerCase()];
    effects.stats[key] = (effects.stats[key] ?? 0) + Number(n.replace(/\s/g, ''));
  });

  return found ? effects : null;
}

function compact(effects) {
  const out = {};
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'number' && value !== 0 && !(key === 'weightMod' && value === 1)) out[key] = value;
    else if (value && typeof value === 'object' && Object.keys(value).length) out[key] = value;
  }
  return out;
}

// The wiki labels the torso "Armor" or "Torso"; a `Both:` clause applies to every slot.
const SLOT_LABELS = {
  Torso: ['armor', 'torso'],
  Hands: ['hands'],
  Legs: ['legs'],
  Accessory: ['accessory'],
  Head: ['head'],
  Feet: ['feet'],
};

// Per-slot clauses are alternatives, not a sum, so other slots' clauses are dropped.
function slotEnchantText(info, slot) {
  const labels = SLOT_LABELS[slot];
  if (!labels) return '';

  const marker = /(^|[.!?)])\s*(Weapon|Armor|Torso|Hands|Legs|Head|Feet|Accessory|Both):\s*/gim;
  const matches = [...info.matchAll(marker)];
  let selected = info;

  if (matches.length) {
    const pieces = [];
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const label = match[2].toLowerCase();
      if (!labels.includes(label) && label !== 'both') continue;
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? info.length;
      pieces.push(info.slice(start, end));
    }
    // Another slot is named but this one is not: the enchantment says nothing here.
    if (!pieces.length) return '';
    selected = pieces.join('. ');
  }

  return selected
    .split(/(?<=[.!?])\s+/)
    .filter((clause) => !/^(?:after|at|being|every|on|sneak\b|stepping|when|while)\b/i.test(clause.trim()))
    .join(' ')
    .trim();
}

function canonicalSlot(slot) {
  const lower = slot.toLowerCase();
  return Object.keys(SLOT_LABELS).find((name) => SLOT_LABELS[name].includes(lower)) ?? null;
}

const materialRecords = JSON.parse(await readFile(MATERIALS_JSON, 'utf8'));
const materials = {};
const categories = {};
const unparsedMaterials = [];
const dropped = [];

// A class supports a role when any of its materials states that role (Chapters has no Armor, Cloth no Weapon).
const classRoles = {};
for (const record of materialRecords) {
  for (const role of ['weapon', 'armor', 'other']) {
    if (hasEffect(record[role])) (classRoles[record.materialClass] ??= new Set()).add(role);
  }
}

for (const record of materialRecords) {
  const { name, materialClass: section } = record;
  // `All:` applies in every role the material's class supports, alongside the material's own profile (confirmed in game).
  const roleText = (role) => {
    const own = record[role];
    if (hasEffect(own)) return [own, record.all].filter(Boolean).join('. ');
    return hasEffect(record.all) && classRoles[section]?.has(role) ? record.all : null;
  };
  const weaponText = roleText('weapon');
  const armorText = roleText('armor');
  const otherText = roleText('other');

  // No effect in any role means a raw drop (Cotton, Iron Ore, Ash Wood), not craftable gear.
  if (!hasEffect(weaponText) && !hasEffect(armorText) && !hasEffect(otherText)) {
    dropped.push(`${name} (${section})`);
    continue;
  }

  const appliesTo = [
    ...(hasEffect(weaponText) ? ['weapon'] : []),
    ...(hasEffect(armorText) ? ['armor'] : []),
    ...(hasEffect(otherText) ? ['other'] : []),
  ];
  (categories[section] ??= []).push(name);

  const profile = (text, label) => {
    if (!hasEffect(text)) return null;
    const parsed = parseArmorEffects(text);
    if (parsed) return compact(parsed);
    unparsedMaterials.push(`${name} (${label}): ${text.slice(0, 70)}`);
    return null;
  };

  const armorEffects = profile(armorText, 'armor') ?? {};
  const otherEffects = profile(otherText, 'other');
  // Weapon Power/Hit/Critical live in weapon-modifiers.json; only what `All:` adds on a weapon is kept here.
  const weaponEffects = appliesTo.includes('weapon') && hasEffect(record.all) ? compact(parseArmorEffects(record.all) ?? {}) : null;

  materials[name] = {
    appliesTo,
    ...armorEffects,
    ...(otherEffects && Object.keys(otherEffects).length ? { other: otherEffects } : {}),
    ...(weaponEffects && Object.keys(weaponEffects).length ? { weapon: weaponEffects } : {}),
  };
}

const enchantRows = tableRows(await readFile(ENCHANTS_MD, 'utf8'));
const enchantments = {};
const unparsedEnchantments = [];

for (const cells of enchantRows) {
  const name = cells[1];
  const details = cells[3] ?? '';
  const slotMatch = /Can Enchant:\s*([^]*?)Enchant Info:/i.exec(details);
  const infoMatch = /Enchant Info:\s*([\s\S]*)/i.exec(details);
  if (!slotMatch || !infoMatch) { unparsedEnchantments.push(`${name} (no Can Enchant / Enchant Info)`); continue; }

  const slots = slotMatch[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  const armorSlots = slots.filter((slot) => /torso|legs|hands|head|feet|accessory/i.test(slot));
  if (!armorSlots.length) continue;

  const sourceText = infoMatch[1].trim();

  const bySlot = {};
  for (const slot of armorSlots) {
    const canonical = canonicalSlot(slot);
    if (!canonical) continue;
    const text = slotEnchantText(sourceText, canonical);
    const parsed = text ? parseArmorEffects(text) : null;
    if (!parsed) continue;
    const effect = compact(parsed);
    if (Object.keys(effect).length) bySlot[canonical] = effect;
  }

  const torso = bySlot.Torso ?? null;
  if (armorSlots.some((slot) => /^torso$/i.test(slot)) && !torso) {
    unparsedEnchantments.push(`${name}: ${sourceText.slice(0, 70)}`);
  }
  const others = Object.fromEntries(Object.entries(bySlot).filter(([slot]) => slot !== 'Torso'));

  // Keep prose-only and conditional enchantments: the picker needs their slot legality.
  enchantments[name] = {
    slots: armorSlots,
    description: sourceText,
    ...(torso ?? {}),
    ...(Object.keys(others).length ? { bySlot: others } : {}),
  };
}

await writeFile(OUT, `${JSON.stringify({ materials, categories, enchantments }, null, 2)}\n`, 'utf8');

const withEffect = Object.values(materials).filter((m) => Object.keys(m).length).length;
console.log(`${Object.keys(materials).length} materials (${withEffect} with an armour effect), ${Object.keys(enchantments).length} armour enchantments`);
console.log(`  -> ${path.relative(process.cwd(), OUT)}`);
console.log(`  ${unparsedMaterials.length} materials and ${unparsedEnchantments.length} enchantments did not parse`);
console.log(`  dropped ${dropped.length} that craft neither weapons nor armour`);
for (const [section, names] of Object.entries(categories)) {
  const on = (kind) => names.filter((name) => materials[name].appliesTo.includes(kind)).length;
  console.log(
    `  ${section.padEnd(9)} ${String(names.length).padStart(3)} materials: ` +
      `${on('weapon')} on weapons, ${on('armor')} on armour, ${on('other')} on hands/legs/accessories`,
  );
}
if (REPORT) {
  for (const line of unparsedMaterials) console.log(`  ! material ${line}`);
  for (const line of unparsedEnchantments) console.log(`  ! enchantment ${line}`);
}
