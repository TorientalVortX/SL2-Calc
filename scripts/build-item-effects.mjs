// Usage: node scripts/build-item-effects.mjs [--report]  -> src/data/content/item-effects.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONTENT = path.resolve('src/data/content');
const ARMORS = path.resolve('src/data/armors.json');
const GEAR = path.join(CONTENT, 'gear.json');
const OUT = path.join(CONTENT, 'item-effects.json');
const REPORT = process.argv.includes('--report');

const STATS = {
  str: 'str', wil: 'wil', ski: 'ski', cel: 'cel', def: 'def', res: 'res',
  vit: 'vit', fai: 'fai', luc: 'luc', gui: 'gui', san: 'san', apt: 'apt',
};
// Longest spelling first so "maximum HP" is not read as a bare "HP".
const DERIVED = {
  power: 'power', hit: 'hit', critical: 'critical', 'critical evade': 'criticalEvade',
  evade: 'evade', armor: 'armor', 'magic armor': 'magicArmor', weight: 'weight',
  'maximum hp': 'hp', 'maximum fp': 'fp', 'max hp': 'hp', 'max fp': 'fp', hp: 'hp', fp: 'fp',
};
const ELEMENTS = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
// Physical types the wiki writes like elemental resistances (Half-Plate: '+5% Pierce and Slash Resistance').
const PHYSICAL = ['Blunt', 'Pierce', 'Slash'];
const RESIST_TYPES = [...ELEMENTS, ...PHYSICAL];

const CONDITION = /\b(when|while|if|against|versus|vs\.?|from behind|per|each|chance|after|spells?|on (?:hit|crit|attack)|chance to)\b/i;

// UL is the upgrade points spent on the piece; a value resolves to `base + UL * ulMultiplier`.
function parseMagnitude(text) {
  const cleaned = String(text).replace(/[()]/g, '').trim();
  // "1+UL", a flat part plus a UL part.
  const combined = /^([+-]?\d+)\s*\+\s*UL\b/i.exec(cleaned);
  if (combined) return { base: Number(combined[1]), ulMultiplier: 1 };
  // Ranges ("+2-4 CEL") are per-item rolls, so `base` is the floor.
  // Must precede the plain number or "+1-3" reads as -3.
  const range = /^([+-]?\d+)\s*-\s*(\d+)$/.exec(cleaned);
  if (range) return { base: Number(range[1]), ulMultiplier: 0, rollMax: Number(range[2]) };
  const ul = /^UL\s*([*/])\s*(\d+)$/i.exec(cleaned);
  if (ul) return { base: 0, ulMultiplier: ul[1] === '/' ? 1 / Number(ul[2]) : Number(ul[2]) };
  if (/^UL$/i.test(cleaned)) return { base: 0, ulMultiplier: 1 };
  const flat = /^([+-]?\d+)$/.exec(cleaned);
  if (flat) return { base: Number(flat[1]), ulMultiplier: 0 };
  return null;
}

const CHANNEL_NAMES = [
  ...Object.keys(DERIVED).sort((a, b) => b.length - a.length),
  ...Object.keys(STATS),
  ...ELEMENTS.map((e) => `${e} ATK`),
];

// Regeneration ("Recover 2 HP each Round") and costs ("FP cost is increased to 25 FP") are not max HP/FP.
const RECOVERY = /\b(?:recovers?|recovered|restores?|restored|heals?|healed|regains?|drains?|loses?|lost|costs?|sacrifices?)\b/i;

// A granted skill's cost line ("3M, 15 FP, 1 Round CD") is not a max FP bonus.
const SKILL_COST = /\d+\s*(?:M|Momentum)\b[\s,]*$/i;

const RECOVERY_LOOKBACK = 40;

// One verb governs several magnitudes ("restores 10 HP and 10 FP"), so look back rather than use a lookbehind.
function isRecovery(text, index, channel, end = index) {
  if (channel.key !== 'hp' && channel.key !== 'fp') return false;
  const before = text.slice(Math.max(0, index - RECOVERY_LOOKBACK), index);
  // A sentence break ends the verb's reach: "+50 HP. Recover 3 HP" keeps its first magnitude.
  const clause = before.split(/[.;!?]/).pop() ?? before;
  if (RECOVERY.test(clause) || SKILL_COST.test(clause)) return true;
  // A trailing "cost" ("+5 FP cost.") raises what a skill spends; only the words right after count.
  return /^\s*cost/i.test(text.slice(end, end + 12));
}

// One magnitude can cover an element list ("8-15% Fire, Ice, Lightning and Wind Resistance"),
// so the run is split afterwards. Dark and Darkness are the same element.
const RESISTANCE = new RegExp(
  String.raw`([+-]?\d+)(?:\s*-\s*(\d+))?%\s*((?:${RESIST_TYPES.join('|')}|Darkness)(?:\s*(?:,|and)\s*(?:${RESIST_TYPES.join('|')}|Darkness))*)\s+Resist`,
  'gi',
);

// The wiki writes "Darkness"; the calculator's ElementKey is "Dark".
function canonicalElement(name) {
  const trimmed = String(name).trim();
  if (/^darkness$/i.test(trimmed)) return 'Dark';
  return RESIST_TYPES.find((type) => type.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

// "+1 to all stats" (Bands of the Chimera). DEBUFF_SUBJECT skips penalties aimed at enemies (Giant Slayer).
const ALL_STATS = /([+-]?\d+)\s*(?:to\s+)?all\s+stats\b/gi;
const DEBUFF_SUBJECT = /\b(suffers?|inflicts?|reduces?|lowers?|drains?)\b/i;

function parseAllStats(text) {
  const values = [];
  for (const match of String(text).matchAll(ALL_STATS)) {
    const before = String(text).slice(Math.max(0, match.index - 60), match.index);
    if (DEBUFF_SUBJECT.test(before.split(/[.;!?]/).pop() ?? before)) continue;
    const magnitude = parseMagnitude(match[1]);
    if (!magnitude) continue;
    for (const key of Object.values(STATS)) values.push({ kind: 'stat', key, ...magnitude });
  }
  return values;
}

function parseResistances(text) {
  const values = [];
  for (const match of String(text).matchAll(RESISTANCE)) {
    const [, low, high, elementRun] = match;
    const magnitude = { base: Number(low), ulMultiplier: 0, ...(high ? { rollMax: Number(high) } : {}) };
    for (const word of elementRun.split(/\s*(?:,|and)\s*/)) {
      const element = canonicalElement(word);
      if (element) values.push({ kind: 'resistance', key: element, ...magnitude });
    }
  }
  return values;
}

function resolveChannel(word) {
  const lower = word.toLowerCase().trim();
  const element = ELEMENTS.find((e) => lower === `${e.toLowerCase()} atk`);
  if (element) return { kind: 'elementalAttack', key: element };
  if (DERIVED[lower]) return { kind: 'derived', key: DERIVED[lower] };
  if (STATS[lower]) return { kind: 'stat', key: STATS[lower] };
  return null;
}

// The range alternative precedes the bare number so "+1-3" is read whole.
const MAGNITUDE = String.raw`[+-]?\d+\s*\+\s*UL|UL\s*[*/]\s*\d+|UL|[+-]?\d+\s*-\s*\d+|[+-]?\d+`;
const CHANNELS = CHANNEL_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

// "Increases X by N" and "+N X", the two orders the wiki uses.
const PATTERNS = [
  // Green-Scale Tunic's ceiling is UL; match it first so its "0.5 Evade" conversion rate is not the bonus.
  new RegExp(String.raw`Increases?\s+(?:your\s+)?(${CHANNELS})\b[\s\S]*?\b(?:up\s+to\s+)?(?:a\s+)?maximum\s+(?:of\s+)?\(?(${MAGNITUDE})\)?`, 'gi'),
  // Allows a targeting phrase: "Increases Evade against enemies within 1 Range by UL."
  new RegExp(String.raw`Increases?\s+(?:your\s+)?(${CHANNELS})\b[^.!?]*?\bby\s+\(?(${MAGNITUDE})\)?`, 'gi'),
  new RegExp(String.raw`\(?(${MAGNITUDE})\)?\s+(${CHANNELS})\b`, 'gi'),
];

// A description matched by the first order is not re-scanned by the second.
function parseEffects(text) {
  // A shared magnitude may be written after both channels ("STR and WIL by
  // 2") or before slash-separated channels ("+5 Evade/Armor").
  const shared = [];
  const increasePair = new RegExp(String.raw`Increases?\s+(?:your\s+)?(${CHANNELS})\s+(?:and|/)\s+(${CHANNELS})\s+by\s+\(?(${MAGNITUDE})\)?`, 'gi');
  for (const match of text.matchAll(increasePair)) {
    const magnitude = parseMagnitude(match[3]);
    for (const word of [match[1], match[2]]) {
      const channel = resolveChannel(word);
      if (channel && magnitude) shared.push({ ...channel, ...magnitude });
    }
  }
  const prefixPair = new RegExp(String.raw`\(?(${MAGNITUDE})\)?\s+(${CHANNELS})\s*/\s*(${CHANNELS})\b`, 'gi');
  for (const match of text.matchAll(prefixPair)) {
    const magnitude = parseMagnitude(match[1]);
    for (const word of [match[2], match[3]]) {
      const channel = resolveChannel(word);
      if (channel && magnitude && !isRecovery(text, match.index, channel, match.index + match[0].length)) shared.push({ ...channel, ...magnitude });
    }
  }
  if (shared.length) return shared;

  for (const [index, pattern] of PATTERNS.entries()) {
    pattern.lastIndex = 0;
    const found = [];
    for (const match of text.matchAll(pattern)) {
      const [channelWord, magnitudeWord] = index < 2 ? [match[1], match[2]] : [match[2], match[1]];
      const channel = resolveChannel(channelWord);
      const magnitude = parseMagnitude(magnitudeWord);
      if (channel && magnitude && !isRecovery(text, match.index, channel, match.index + match[0].length)) found.push({ ...channel, ...magnitude });
    }
    if (found.length) return found;
  }
  return [];
}

function toRecord(name, description, alwaysEligible) {
  if (name === 'Numa' && /On Battle Start/.test(description)) {
    return { name: 'Boon of Numa',
      description: 'After the curse expires, select your current Boon level. Grants STR equal to level and HP regeneration equal to half level. Hit bonus only applies against Sludge (full level) or Muddy (25%). Level falls with unused Momentum and Cursed/Doomed equipment. Set 0 before Boon activates.',
      applies: 'always',
      effects: [{ kind: 'buffStat', key: 'str', base: 0, rollMax: 100, controlLabel: 'Boon of Numa level', ulMultiplier: 0 }] };
  }

  // Salamander's cap and per-trigger increments are not standing bonuses.
  // A battle-state slider records earned Power, defaulting to zero.
  if (name === 'Power Stacking' && /Salamander Sword/.test(description)) {
    return {
      name: 'Earned Salamander Power',
      description: description.replace(/\s+/g, ' ').trim(),
      applies: 'always',
      effects: [{ kind: 'derived', key: 'power', base: 0, rollMax: 100, controlLabel: 'Earned Salamander Power', ulMultiplier: 0 }],
    };
  }
  // Zero non-scaling magnitudes come from incidental numbers ("if you are reduced to 0 HP").
  const effects = [...parseEffects(description), ...parseResistances(description), ...parseAllStats(description)]
    .filter((value) => value.base !== 0 || value.ulMultiplier !== 0 || value.rollMax);
  // A trailing chance clause is a separate effect (Armor of Eyes: "Increases Hit by UL/2, UL% chance to ...").
  const magnitudeClause = description
    // A disabling exception does not make a normally-active bonus opt-in.
    .replace(/,\s*except when\b[^.]*\.?/gi, '.')
    .replace(/\bUL%\s+chance\b.*$/i, '');
  const conditional = CONDITION.test(magnitudeClause) || /for \d+ attacks? this round/i.test(description);
  return {
    name,
    description: description.replace(/\s+/g, ' ').trim(),
    applies: !effects.length ? 'reference' : (conditional || !alwaysEligible) ? 'conditional' : 'always',
    effects,
  };
}

function valueSignature(value) {
  return `${value.kind}:${value.key}:${value.base}:${value.ulMultiplier}:${value.rollMax ?? ''}`;
}

function structuredArmorSignatures(armor) {
  const signatures = new Set();
  // Must match `valueSignature` exactly or nothing dedupes.
  const signature = (kind, key, base) => valueSignature({ kind, key, base, ulMultiplier: 0 });
  for (const [key, value] of Object.entries(armor.statBonuses ?? {})) {
    if (typeof value !== 'number') continue;
    if (STATS[key]) signatures.add(signature('stat', key, value));
    // The evaluator already adds statBonuses hp/fp; register them so "+10 HP" in details is not counted twice.
    else if (DERIVED[key]) signatures.add(signature('derived', DERIVED[key], value));
  }
  for (const bonus of Object.values(armor.conditionalBonuses ?? {})) {
    for (const [key, value] of Object.entries(bonus)) {
      if (typeof value !== 'number') continue;
      if (STATS[key]) signatures.add(signature('stat', key, value));
      else if (DERIVED[key]) signatures.add(signature('derived', DERIVED[key], value));
    }
  }
  return signatures;
}

function withoutStructuredDuplicates(record, structured, structuredElements = new Set()) {
  const effects = record.effects.filter((value) => {
    if (structured.has(valueSignature(value))) return false;
    // Suppress by element, not value: curated values differ from the text (Cloak of Many Colors 12% vs "8-15%").
    return !(value.kind === 'resistance' && structuredElements.has(value.key));
  });
  return effects.length ? { ...record, effects } : { ...record, applies: 'reference', effects: [] };
}

const weapons = {};
for (const file of (await readdir(CONTENT)).filter((f) => /^weapons-.+\.json$/.test(f))) {
  for (const weapon of JSON.parse(await readFile(path.join(CONTENT, file), 'utf8'))) {
    const records = (weapon.specials ?? [])
      // Only a Passive is a standing bonus; the rest fire on a trigger.
      .map((special) => toRecord(special.name ?? special.type, special.description ?? '', special.type === 'Passive'))
      .filter((record) => record.effects.length || record.description);
    if (records.length) weapons[weapon.name] = records;
  }
}

const armors = {};
for (const list of Object.values(JSON.parse(await readFile(ARMORS, 'utf8')))) {
  for (const armor of list) {
    const records = [];
    const structured = structuredArmorSignatures(armor);
    const structuredElements = new Set(
      Object.keys(armor.resistances ?? {}).map(canonicalElement).filter(Boolean),
    );
    const detail = armor.details
      ? withoutStructuredDuplicates(toRecord(armor.name, armor.details, true), structured, structuredElements)
      : null;
    if (detail) records.push(detail);
    const detailValues = new Set(detail?.effects.map(valueSignature) ?? []);
    for (const special of armor.specialEffects ?? []) {
      const record = withoutStructuredDuplicates(toRecord(special, special, false), structured, structuredElements);
      // `specialEffects` summarizes `details`; do not offer the same magnitude twice.
      const effects = record.effects.filter((value) => !detailValues.has(valueSignature(value)));
      records.push(effects.length ? { ...record, effects } : { ...record, applies: 'reference', effects: [] });
    }
    if (records.length) armors[armor.name] = records;
  }
}

// Read lines separately: they are separate wiki bullets, and an "On Hit:" line must not gate the others.
const gear = {};
for (const list of Object.values(JSON.parse(await readFile(GEAR, 'utf8')))) {
  for (const item of list) {
    const records = [];
    const seen = new Set();
    for (const line of item.specialEffects ?? []) {
      const record = toRecord(item.name, line, true);
      if (!record.effects.length && !record.description) continue;
      // Two lines can state the same bonus; offer it once.
      const fresh = record.effects.filter((value) => !seen.has(valueSignature(value)));
      for (const value of fresh) seen.add(valueSignature(value));
      records.push(fresh.length ? { ...record, effects: fresh } : { ...record, applies: 'reference', effects: [] });
    }
    if (records.length) gear[item.name] = records;
  }
}

await writeFile(OUT, `${JSON.stringify({ weapons, armors, gear }, null, 2)}\n`, 'utf8');

const all = [...Object.values(weapons).flat(), ...Object.values(armors).flat(), ...Object.values(gear).flat()];
const byApplies = all.reduce((acc, r) => ({ ...acc, [r.applies]: (acc[r.applies] ?? 0) + 1 }), {});
const ulScaled = all.filter((r) => r.effects.some((e) => e.ulMultiplier !== 0));
console.log(`${all.length} item effects -> ${path.relative(process.cwd(), OUT)}`);
console.log(`  always ${byApplies.always ?? 0}, conditional ${byApplies.conditional ?? 0}, reference ${byApplies.reference ?? 0}`);
console.log(`  ${ulScaled.length} scale with UL`);
if (REPORT) {
  for (const record of ulScaled.slice(0, 20)) {
    console.log(`  UL  ${record.name}: ${record.effects.map((e) => `${e.key} ${e.base}+${e.ulMultiplier}·UL`).join(', ')}`);
  }
}
