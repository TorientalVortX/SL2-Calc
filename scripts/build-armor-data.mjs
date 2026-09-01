/**
 * Extracts armour effects for materials and enchantments from the scraped wiki.
 *
 *   wiki-data/mechanics/item-materials.md  \
 *   wiki-data/mechanics/enchantments.md    /  ->  src/data/content/armor-modifiers.json
 *
 * These two tables are why `ARMOR_MATERIAL_MODIFIERS` and
 * `ARMOR_ENCHANTMENT_OVERRIDES` could stay empty until now: the calculator knew
 * the *names* of materials and enchantments from the weapon table but not what
 * either does to armour, and the weapon values do not transfer.
 *
 * The wiki states them plainly, which is what makes this parseable at all:
 *
 *   Weapon: +6 Critical, +8 Weight
 *   Armor: +2 Armor, +1 Magic Armor, +6 Evade, +8 Weight
 *   Other: No effect.
 *
 * Only the `Armor:` segment is read. Anything outside the patterns below is left
 * out rather than guessed, and reported at the end so the gap stays visible.
 *
 *   node scripts/build-armor-data.mjs
 *   node scripts/build-armor-data.mjs --report   # list what did not parse
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/*
 * Materials come from the equipment scraper's JSON rather than the mechanics
 * markdown. `scrape-wiki.mjs` collapses the `<br>`s inside a Details cell, so
 * that page reads "+8 WeightArmor: +2 Armor" with the clause boundaries run
 * together and has to be split with lookaheads. `scrape-equipment.mjs` keeps the
 * breaks and hands over `weapon`, `armor` and `other` as separate fields.
 */
const MATERIALS_JSON = path.resolve('wiki-data/raw/item-materials.json');
const ENCHANTS_MD = path.resolve('wiki-data/mechanics/enchantments.md');
const OUT = path.resolve('src/data/content/armor-modifiers.json');
const REPORT = process.argv.includes('--report');

const ELEMENTS = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
/*
 * Resisted like an element, written like one, but not one. Canvas Square is
 * '+5% Pierce Resistance'; without these three the material simply lost it.
 */
const PHYSICAL = ['Blunt', 'Pierce', 'Slash'];
const RESIST_TYPES = [...ELEMENTS, ...PHYSICAL];
const STAT_WORDS = {
  strength: 'str', str: 'str', will: 'wil', wil: 'wil', celerity: 'cel', cel: 'cel',
  skill: 'ski', ski: 'ski', defense: 'def', def: 'def', resistance: 'res', res: 'res',
  vitality: 'vit', vit: 'vit', faith: 'fai', fai: 'fai', luck: 'luc', luc: 'luc',
  guile: 'gui', gui: 'gui', sanctity: 'san', san: 'san', aptitude: 'apt', apt: 'apt',
};

/** Rows of a markdown table, minus the header and separator lines. */
function tableRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| '))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3 && cells[1] && cells[1] !== 'Name' && !/^-+$/.test(cells[1]));
}

/**
 * Whether a clause states a real effect.
 *
 * "No effect." is the wiki explicitly saying the material does nothing in that
 * role, which is different from the clause being absent.
 */
const hasEffect = (text) => Boolean(text) && !/^no effect/i.test(text);

/**
 * Reads the armour effects out of a details blob.
 *
 * Matches are anchored on the unit word, so "+1 Magic Armor" is never read as
 * "+1 Armor": magic armour is checked first and its text removed before the
 * plain armour pattern runs.
 */
function parseArmorEffects(text) {
  const effects = {
    armor: 0, magicArmor: 0, evade: 0, weight: 0, weightMod: 1, hp: 0, hpPercent: 0, fp: 0,
    statusResistance: 0,
    critical: 0, criticalEvade: 0, stats: {}, resistances: {}, elementalAttack: {},
  };
  let found = false;
  /*
   * Some enchantments give a different amount per slot: Warding is "Armor: +5
   * Resistance. Legs: +3 Resistance". Those are alternatives, not a sum, so the
   * torso figure is taken and the other slot's clause dropped. Summing them
   * would overstate the bonus on every slot.
   */
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
  // Elemental attack, written either "+3 Fire ATK" or "Fire ATK by 3".
  // Attack is elemental only. There is no "Pierce ATK".
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

/** Drops the zeroed channels so the emitted record only carries real values. */
function compact(effects) {
  const out = {};
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'number' && value !== 0 && !(key === 'weightMod' && value === 1)) out[key] = value;
    else if (value && typeof value === 'object' && Object.keys(value).length) out[key] = value;
  }
  return out;
}

/**
 * Returns the always-on part of an enchantment for a torso.
 *
 * The source often puts weapon, armor and shared effects in one run-on string.
 * Only `Armor`/`Torso` and `Both` segments apply here. Conditional sentences are
 * removed so effects such as Camouflage's Sneak-only Evade are never treated as
 * permanent calculator stats.
 */
/**
 * The labels an enchantment uses for each body slot.
 *
 * `Both` is not a slot but a shared clause, so it belongs to every one. The wiki
 * writes the torso as either "Armor" or "Torso" depending on the enchantment.
 */
const SLOT_LABELS = {
  Torso: ['armor', 'torso'],
  Hands: ['hands'],
  Legs: ['legs'],
  Accessory: ['accessory'],
  Head: ['head'],
  Feet: ['feet'],
};

/**
 * The part of an enchantment's text that applies to one slot.
 *
 * A single enchantment often states a different magnitude per slot: Warding is
 * "Armor: +5 Resistance. Legs: +3 Resistance.", so reading the torso figure and
 * using it everywhere would overstate the bonus on every other slot. Clauses for
 * other slots are dropped rather than summed, and conditional sentences are
 * removed so nothing gated is treated as a standing bonus.
 */
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
    /*
     * No clause names this slot, but some clause names another. The enchantment
     * is legal here and simply says nothing about it, which is not the same as
     * the whole text applying.
     */
    if (!pieces.length) return '';
    selected = pieces.join('. ');
  }

  return selected
    .split(/(?<=[.!?])\s+/)
    .filter((clause) => !/^(?:after|at|being|every|on|sneak\b|stepping|when|while)\b/i.test(clause.trim()))
    .join(' ')
    .trim();
}

/** Canonical slot name for a label the wiki wrote, or null if unrecognised. */
function canonicalSlot(slot) {
  const lower = slot.toLowerCase();
  return Object.keys(SLOT_LABELS).find((name) => SLOT_LABELS[name].includes(lower)) ?? null;
}

/* --------------------------------------------------------------- materials */

const materialRecords = JSON.parse(await readFile(MATERIALS_JSON, 'utf8'));
const materials = {};
const categories = {};
const unparsedMaterials = [];
const dropped = [];

for (const record of materialRecords) {
  const { name, materialClass: section } = record;
  /*
   * `All:` supplements the profiles a material already has; it never grants a new
   * role. Two failure modes to avoid, one on each side:
   *
   *   Treating it as a replacement wiped Aureate's "Armor: -3 Armor, -3 Magic
   *   Armor" and left it with nothing.
   *
   *   Letting it stand in for a missing profile put Fine Art into the armour
   *   material picker. Fine Art is a Chapter material with no `Armor:` clause,
   *   because chapters craft tomes.
   *
   * So the role comes from the material's own clause, and `All` is appended to
   * whichever roles that gives it.
   */
  const roleText = (text) => (hasEffect(text) ? [text, record.all].filter(Boolean).join('. ') : null);
  const weaponText = roleText(record.weapon);
  const armorText = roleText(record.armor);
  const otherText = roleText(record.other);

  /*
   * A material with no effect in any of the three roles is not craftable gear at
   * all: plain Cotton, Iron Ore and Ash Wood exist only as raw drops. Listing
   * them in a gear picker is noise, so they are dropped.
   */
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

  /** Parses one profile, recording anything the patterns could not read. */
  const profile = (text, label) => {
    if (!hasEffect(text)) return null;
    const parsed = parseArmorEffects(text);
    if (parsed) return compact(parsed);
    unparsedMaterials.push(`${name} (${label}): ${text.slice(0, 70)}`);
    return null;
  };

  /*
   * The armour profile stays flattened onto the record, which is the shape every
   * existing consumer reads. The hands/legs/accessory profile is nested under
   * `other` so adding it cannot change how armour is resolved.
   */
  const armorEffects = profile(armorText, 'armor') ?? {};
  const otherEffects = profile(otherText, 'other');

  materials[name] = {
    appliesTo,
    ...armorEffects,
    ...(otherEffects && Object.keys(otherEffects).length ? { other: otherEffects } : {}),
  };
}

/* ------------------------------------------------------------ enchantments */

const enchantRows = tableRows(await readFile(ENCHANTS_MD, 'utf8'));
const enchantments = {};
const unparsedEnchantments = [];

for (const cells of enchantRows) {
  const name = cells[1];
  // Name/Catalyst/Details/Location are distinct columns. Keeping this scoped to
  // Details prevents acquisition locations from leaking into effect text.
  const details = cells[3] ?? '';
  const slotMatch = /Can Enchant:\s*([^]*?)Enchant Info:/i.exec(details);
  const infoMatch = /Enchant Info:\s*([\s\S]*)/i.exec(details);
  if (!slotMatch || !infoMatch) { unparsedEnchantments.push(`${name} (no Can Enchant / Enchant Info)`); continue; }

  const slots = slotMatch[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  // Armour enchantments are the ones that can go on a body slot at all.
  const armorSlots = slots.filter((slot) => /torso|legs|hands|head|feet|accessory/i.test(slot));
  if (!armorSlots.length) continue;

  const sourceText = infoMatch[1].trim();

  /*
   * Every legal slot is resolved separately. The torso stays flattened onto the
   * record because that is the shape every existing consumer reads; the rest go
   * under `bySlot`, so adding them cannot change how a torso resolves.
   */
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

  // Keep every legal body-slot enchantment, including prose-only and
  // conditional effects. The picker needs legality data even when a mechanic
  // does not yet map to one of the calculator's numeric channels.
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
