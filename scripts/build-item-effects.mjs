// Usage: node scripts/build-item-effects.mjs [--report]  -> src/data/content/item-effects.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONTENT = path.resolve('src/data/content');
const ARMORS = path.resolve('src/data/armors.json');
const GEAR = path.join(CONTENT, 'gear.json');
const SETS = path.join(CONTENT, 'item-sets.json');
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
  // "30 armor-ignoring damage" is not an Armor bonus.
  new RegExp(String.raw`\(?(${MAGNITUDE})\)?\s+(${CHANNELS})\b(?!-)`, 'gi'),
];

const LIST_SEPARATOR = String.raw`\s*(?:,\s*and|,|and|/)\s*`;
const CHANNEL_LIST = String.raw`(${CHANNELS})((?:${LIST_SEPARATOR}(?:${CHANNELS})\b)+)`;
// One magnitude shared by a channel list: "STR and WIL by 2", "+5 Evade/Armor", "+2 STR, WIL, DEF, and RES".
const SHARED_LISTS = [
  { pattern: String.raw`Increases?\s+(?:your\s+)?${CHANNEL_LIST}\s+by\s+\(?(${MAGNITUDE})\)?`, magnitude: 3, first: 1 },
  { pattern: String.raw`\(?(${MAGNITUDE})\)?\s+${CHANNEL_LIST}\b(?!-)`, magnitude: 1, first: 2 },
];

// "+1 max per 20 STR" is a rate, not a bonus.
const isRate = (text, index) => /\bper\s*$/i.test(text.slice(Math.max(0, index - 6), index));

// A description matched by the first order is not re-scanned by the second.
function parseEffects(text) {
  const shared = [];
  const covered = [];
  for (const { pattern, magnitude: at, first } of SHARED_LISTS) {
    for (const match of text.matchAll(new RegExp(pattern, 'gi'))) {
      if (isRate(text, match.index)) continue;
      const magnitude = parseMagnitude(match[at]);
      const words = [match[first], ...match[first + 1].split(new RegExp(LIST_SEPARATOR)).filter(Boolean)];
      for (const word of words) {
        const channel = resolveChannel(word);
        if (channel && magnitude && !isRecovery(text, match.index, channel, match.index + match[0].length)) shared.push({ ...channel, ...magnitude });
      }
      covered.push([match.index, match.index + match[0].length]);
    }
  }
  const inList = (index) => covered.some(([start, end]) => index >= start && index < end);

  for (const [index, pattern] of PATTERNS.entries()) {
    pattern.lastIndex = 0;
    const found = [];
    for (const match of text.matchAll(pattern)) {
      if (inList(match.index) || isRate(text, match.index)) continue;
      const [channelWord, magnitudeWord] = index < 2 ? [match[1], match[2]] : [match[2], match[1]];
      const channel = resolveChannel(channelWord);
      const magnitude = parseMagnitude(magnitudeWord);
      if (channel && magnitude && !isRecovery(text, match.index, channel, match.index + match[0].length)) found.push({ ...channel, ...magnitude });
    }
    if (found.length) return [...shared, ...found];
  }
  return shared;
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
  // Tetra lines name Fire's pairing (Fire, STR); the calculator remaps them to the chosen crystal.
  const tetra = /\(Tetra\)/.test(description);
  // Set text copied onto a member ("Set: Church Faithful 2+ - +3 Light ATK") is applied by the set, not per item.
  const ownText = description.replace(/\bSet:\s[\s\S]*$/, '').replace(/^\s*\d\+\s*[-:][\s\S]*$/, '');
  const text = tetra ? ownText.replace(/\bElemental ATK\b/, 'Fire ATK').replace(/(\d+)\s+Stat\b/, '$1 STR') : ownText;
  // Zero non-scaling magnitudes come from incidental numbers ("if you are reduced to 0 HP").
  const effects = [...parseEffects(text), ...parseResistances(text), ...parseAllStats(text)]
    .filter((value) => value.base !== 0 || value.ulMultiplier !== 0 || value.rollMax)
    .map((value) => (tetra ? { ...value, tetra: true } : value));
  // A trailing chance clause is a separate effect (Armor of Eyes: "Increases Hit by UL/2, UL% chance to ...").
  const magnitudeClause = ownText
    // A disabling exception does not make a normally-active bonus opt-in.
    .replace(/,\s*except when\b[^.]*\.?/gi, '.')
    .replace(/\bUL%\s+chance\b.*$/i, '');
  // A buff that lasts N rounds was switched on in battle; it is not a standing bonus.
  const conditional = CONDITION.test(magnitudeClause) || /for \d+ (?:attacks? this round|rounds?)\b/i.test(ownText);
  return {
    name,
    description: description.replace(/\s+/g, ' ').trim(),
    applies: !effects.length ? 'reference' : (conditional || !alwaysEligible) ? 'conditional' : 'always',
    effects,
    ...(effects.length && /\bends? (?:that|other) effects?\b/i.test(description) ? { exclusive: true } : {}),
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

const SKILL_HEADER = /^\*?\s*Grants (?:Skill:\s*([^.]+?)\.?|([^.]+?) skill)$/i;
const SKILL_COST_LINE = /^(?:Passive|\d+\+?\s*(?:M|Momentum|FP)\b[^.]*)$/i;

// A granted skill is written as "Grants Skill: X", an optional cost line, then its text; Kenpo adds a "Furinkazan:" line.
function skillRoles(lines) {
  let skill = null;
  let stage = null;
  return lines.map((line) => {
    const header = SKILL_HEADER.exec(line.trim());
    if (header) {
      skill = (header[1] ?? header[2]).trim();
      stage = 'header';
      return { grants: skill, role: 'skill' };
    }
    if (skill && stage === 'header' && SKILL_COST_LINE.test(line.trim())) {
      stage = 'cost';
      return { grants: skill, role: 'cost' };
    }
    if (skill && (stage === 'header' || stage === 'cost')) {
      stage = 'text';
      return { grants: skill };
    }
    if (skill && stage === 'text' && /^Furinkazan:/i.test(line.trim())) return { grants: skill };
    skill = null;
    return {};
  });
}

// Granted skills whose effect on the user the text parser cannot read; switched on while the skill is in effect.
const SKILL_MODELS = {
  // "Cruel Commander LV X (X = your level + 20) ... causes your STR to become equal to its LV."
  'Contract of Blood': [{ kind: 'setStat', key: 'str', base: 20, ulMultiplier: 0, perLevel: 1 }],
  // "Increases the user's STR by 2 (+1 per 5 character levels)."
  "Lion's Roar": [{ kind: 'buffStat', key: 'str', base: 2, ulMultiplier: 0, perLevel: 0.2 }],
  // "Boosts the SKI and LUC of all party members ... by Atlaua's Abaniko's UL/2 (min. 1)."
  'Luckiness Dance': [
    { kind: 'buffStat', key: 'ski', base: 0, ulMultiplier: 0.5, min: 1 },
    { kind: 'buffStat', key: 'luc', base: 0, ulMultiplier: 0.5, min: 1 },
  ],
  // Spun Weapon, which Spin Up grants: "weapon gains +5 Power"; the unspun +5 Hit is not modelled.
  'Spin Up': [{ kind: 'derived', key: 'power', base: 5, ulMultiplier: 0 }],
};

function withSkillModel(record) {
  const model = SKILL_MODELS[record.grants];
  if (!model || record.role) return record;
  return { ...record, applies: 'conditional', effects: model };
}

// Headers and cost lines carry no bonus: "10 FP / 2M" is what the skill spends.
function withSkillRole(record, tag) {
  if (!tag.grants) return record;
  return withSkillModel(tag.role ? { ...record, applies: 'reference', effects: [], ...tag } : { ...record, ...tag });
}

// Gear writes each skill in full, so a weapon that only names one ("Grants skill: Guard.") can borrow it.
const SKILL_LIBRARY = new Map();
for (const item of Object.values(JSON.parse(await readFile(GEAR, 'utf8'))).flat()) {
  const lines = item.specialEffects ?? [];
  const found = new Map();
  skillRoles(lines).forEach((tag, index) => {
    if (!tag.grants) return;
    const known = found.get(tag.grants) ?? { cost: null, text: [] };
    if (tag.role === 'cost') known.cost = lines[index];
    else if (!tag.role) known.text.push(lines[index]);
    found.set(tag.grants, known);
  });
  for (const [name, known] of found) if (!SKILL_LIBRARY.has(name)) SKILL_LIBRARY.set(name, known);
}

const COST = String.raw`\d+\+?\s*M\b(?:\s*[,/]\s*\d+\s*FP)?(?:\s*[,.]\s*\d+\s*[Rr]ounds?\s*(?:CD|Cooldown))?`;
const SKILL_SEGMENT = new RegExp(String.raw`(?:^|(?<=[.)]\s+))\(?([A-Z][A-Za-z' ]{1,30}?):\s*(${COST})[.,]?\s*`, 'g');

// Weapon specials write skills as "Grants Skill: X (cost) - text", "X: cost. text" (one or several), or "cost text".
function weaponSkills(name, description) {
  const text = description.trim();
  const inline = /^Grants Skill:\s*([^(]+?)\s*\(([^)]*)\)\s*-\s*([\s\S]*)$/i.exec(text);
  if (inline) return [{ name: inline[1].trim(), cost: inline[2].trim(), text: inline[3].trim() }];
  const named = /^Grants skill:\s*([^.(]+?)\.\s*([\s\S]*)$/i.exec(text);
  if (named) {
    const known = SKILL_LIBRARY.get(named[1].trim());
    return [{ name: named[1].trim(), cost: known?.cost ?? null, text: [...(known?.text ?? []), named[2]].filter(Boolean).join(' ') }];
  }
  const leadingCost = new RegExp(String.raw`^(${COST})\s+([\s\S]*)$`).exec(text);
  if (leadingCost) return [{ name, cost: leadingCost[1], text: leadingCost[2] }];
  const headers = [...text.matchAll(SKILL_SEGMENT)];
  if (!headers.length) return [{ name, cost: null, text }];
  const segments = headers.map((match, index) => ({
    // One segment is this special's own skill; the wiki sometimes labels it with a sibling's name (Tsukikage).
    name: headers.length === 1 ? name : match[1].trim(),
    cost: match[2].trim().replace(/\.\s*/g, ', '),
    text: text.slice(match.index + match[0].length, headers[index + 1]?.index ?? text.length).trim(),
  }));
  if (text.startsWith('(')) segments[segments.length - 1].text = segments[segments.length - 1].text.replace(/\)$/, '');
  return segments;
}

const weapons = {};
for (const file of (await readdir(CONTENT)).filter((f) => /^weapons-.+\.json$/.test(f))) {
  for (const weapon of JSON.parse(await readFile(path.join(CONTENT, file), 'utf8'))) {
    const records = (weapon.specials ?? [])
      // Only a Passive is a standing bonus; the rest fire on a trigger.
      .map((special) => {
        const record = toRecord(special.name ?? special.type, special.description ?? '', special.type === 'Passive');
        if (special.type !== 'GrantsSkill') return record;
        const skills = weaponSkills(special.name, special.description ?? '');
        // Parse the skills' own text: the special's cost ("3M / 10 FP") is not a bonus.
        const parsed = toRecord(record.name, skills.map((skill) => skill.text).join(' '), false);
        return withSkillModel({ ...record, applies: parsed.applies, effects: parsed.effects, grants: skills[0].name, skills });
      })
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
    const roles = skillRoles(armor.specialEffects ?? []);
    // A granted skill's lines are also in `details`; show them once, on the skill.
    const detailText = (armor.specialEffects ?? [])
      .filter((_, index) => roles[index].grants)
      .reduce((text, line) => text.replace(line, ''), armor.details ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const detail = detailText
      ? withoutStructuredDuplicates(toRecord(armor.name, detailText, true), structured, structuredElements)
      : null;
    if (detail) records.push(detail);
    const detailValues = new Set(detail?.effects.map(valueSignature) ?? []);
    for (const [index, special] of (armor.specialEffects ?? []).entries()) {
      const record = withSkillRole(withoutStructuredDuplicates(toRecord(special, special, false), structured, structuredElements), roles[index]);
      // `specialEffects` summarizes `details`; do not offer the same magnitude twice.
      const effects = record.effects.filter((value) => !detailValues.has(valueSignature(value)));
      records.push(effects.length ? { ...record, effects } : { ...record, applies: 'reference', effects: [] });
    }
    if (records.length) armors[armor.name] = records;
  }
}

// Set wording the line parser can't carry: a bonus per piece equipped, damage dealt, resistance
// ignored, and a skill the set grants ("Grants access to the Double Dao skill", "Gain Cast Off Flexing Skill").
const PER_PIECE = /\+\((\d+) x total number of this set's items? equipped\) ((?:HP|FP)(?: and (?:HP|FP))?)/i;
const DAMAGE_DEALT = /\+(\d+)% damage dealt/i;
const RESISTANCE_IGNORED = /(\w+) and (\w+) damage you deal ignores up to (\d+)% of elemental resistance/i;
const SET_SKILL = /Grants access to the ([\w' ]+?) skill|Gain ([\w' ]+?) Skill\b/;

function setRecord(name, description) {
  const record = toRecord(name, description, true);
  const perPiece = PER_PIECE.exec(description);
  if (perPiece) {
    const effects = perPiece[2].split(/\s+and\s+/).map((channel) => ({ kind: 'derived', key: channel.toLowerCase(), base: 0, ulMultiplier: 0, perPiece: Number(perPiece[1]) }));
    return { ...record, applies: 'always', effects };
  }
  const damage = DAMAGE_DEALT.exec(description);
  const ignored = RESISTANCE_IGNORED.exec(description);
  const skill = SET_SKILL.exec(description);
  return {
    ...record,
    ...(damage ? { damagePercent: Number(damage[1]) } : {}),
    ...(ignored ? { resistanceIgnored: { types: [ignored[1], ignored[2]].map((type) => canonicalElement(type) ?? type), percent: Number(ignored[3]) } } : {}),
    ...(skill ? { grants: (skill[1] ?? skill[2]).trim() } : {}),
  };
}

// Read lines separately: they are separate wiki bullets, and an "On Hit:" line must not gate the others.
const gear = {};
for (const list of Object.values(JSON.parse(await readFile(GEAR, 'utf8')))) {
  for (const item of list) {
    const records = [];
    const seen = new Set();
    const roles = skillRoles(item.specialEffects ?? []);
    for (const [index, line] of (item.specialEffects ?? []).entries()) {
      const record = withSkillRole(toRecord(item.name, line, true), roles[index]);
      if (!record.effects.length && !record.description) continue;
      // Two lines can state the same bonus; offer it once.
      const fresh = record.effects.filter((value) => !seen.has(valueSignature(value)));
      for (const value of fresh) seen.add(valueSignature(value));
      records.push(fresh.length ? { ...record, effects: fresh } : { ...record, applies: 'reference', effects: [] });
    }
    if (records.length) gear[item.name] = records;
  }
}

// A reached threshold applies by piece count, so only its situational parts need a switch.
const sets = {};
for (const [name, set] of Object.entries(JSON.parse(await readFile(SETS, 'utf8')))) {
  const records = set.thresholds.map((threshold) => ({ ...setRecord(name, threshold.description), count: threshold.count }));
  if (records.length) sets[name] = records;
}

await writeFile(OUT, `${JSON.stringify({ weapons, armors, gear, sets }, null, 2)}\n`, 'utf8');

const all = [...Object.values(weapons).flat(), ...Object.values(armors).flat(), ...Object.values(gear).flat(), ...Object.values(sets).flat()];
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
