// Usage: node scripts/build-skill-data.mjs [--report]  -> src/data/content/skills.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyBattleEffects } from './skill-battle-effects.mjs';

const IN = path.resolve('wiki-data/raw/skills.json');
// Mechanics load with the app; prose is fetched on demand by the Skills dialog.
const OUT = path.resolve('src/data/content/skills.json');
const OUT_TEXT = path.resolve('src/data/content/skills-text.json');
const REPORT = process.argv.includes('--report');

// Mirrors `ElementKey` in src/types.ts.
const ELEMENTS = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
const STATS = ['str', 'wil', 'cel', 'ski', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

// The wiki is inconsistent about "%" and separators ("100/120//180%", "50/60/70/80/90/%").
// A single value applies to every rank.
function parseRankList(text, maxRank) {
  if (text == null) return null;
  const parts = String(text)
    .split('/')
    .map((part) => part.replace(/[^\d.-]/g, '').trim())
    .filter((part) => part !== '' && part !== '-' && /\d/.test(part));
  if (!parts.length) return null;

  const values = parts.map(Number).filter((n) => Number.isFinite(n));
  if (!values.length) return null;

  const ranks = Math.max(1, maxRank || values.length);
  if (values.length === 1) return Array.from({ length: ranks }, () => values[0]);
  // Longer than maxRank means the wiki and infobox disagree; keep the wiki's list.
  if (values.length >= ranks) return values;
  return Array.from({ length: ranks }, (_, i) => values[Math.min(i, values.length - 1)]);
}

// The wiki states the sign once: "-2/4/6" is -2/-4/-6. Left alone when a later entry has its own sign.
function applyLeadingSign(raw, values) {
  if (!values) return values;
  const parts = String(raw).split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2 || !parts[0].startsWith('-')) return values;
  if (parts.slice(1).some((part) => /^[+-]/.test(part))) return values;
  return values.map((n) => -Math.abs(n));
}

const parseInteger = (text) => {
  const match = /-?\d+/.exec(String(text ?? ''));
  return match ? Number(match[0]) : null;
};

// Terms split on "+", "," or "&"; slashes inside a term are rank separators.
function splitTerms(power) {
  return power
    .replace(/\s+/g, ' ')
    .split(/\s*[+,&]\s*/)
    .map((term) => term.trim())
    .filter(Boolean);
}

// Many "Power" fields describe an effect ("Knockdown enemy") rather than a formula.
function parseTerm(term, maxRank) {
  const numbers = /[\d.]+(?:\s*[%]?\s*\/+\s*[\d.]*%?)*/.exec(term);
  const percentByRank = numbers ? parseRankList(numbers[0], maxRank) : null;
  const text = term.toLowerCase();

  if (/scaled\s*(wpn|weapon)|weapon\s*scaled/.test(text)) {
    return percentByRank ? { source: 'weapon', label: 'Scaled Weapon ATK', percentByRank } : null;
  }

  // Elemental attack. "Darkness" is checked before "Dark" so the longer name wins.
  const elementMatch = /\b(darkness|fire|ice|lightning|wind|earth|water|dark|light|acid|sound)\b\s*(?:\/\s*(darkness|fire|ice|lightning|wind|earth|water|dark|light|acid|sound))?\s*(?:atk|attack)/.exec(text);
  if (elementMatch && percentByRank) {
    const name = (s) => s && s[0].toUpperCase() + s.slice(1);
    const primary = name(elementMatch[1]);
    const alternate = name(elementMatch[2]);
    const known = ELEMENTS.includes(primary);
    return {
      source: 'element',
      element: known ? primary : null,
      label: `${primary}${alternate ? `/${alternate}` : ''} ATK`,
      alternateElement: alternate && ELEMENTS.includes(alternate) ? alternate : null,
      percentByRank,
      ...(known ? {} : { unmodelled: primary }),
    };
  }

  // Generic "Elemental ATK": real, but the element depends on equipment.
  if (/\belemental\s*(atk|attack)/.test(text) && percentByRank) {
    return { source: 'element', element: null, label: 'Elemental ATK', percentByRank, unmodelled: 'Elemental' };
  }

  const statMatch = new RegExp(`\\b(${STATS.join('|')})\\b`).exec(text);
  if (statMatch && percentByRank && /%/.test(term)) {
    return { source: 'stat', stat: statMatch[1], label: statMatch[1].toUpperCase(), percentByRank };
  }

  if (/\b(base|bonus)\s*(dmg|damage)\b/.test(text) && percentByRank && !/%/.test(term)) {
    return { source: 'flat', label: /base/.test(text) ? 'Base damage' : 'Bonus damage', percentByRank };
  }

  if (/\bheal\b/.test(text) && percentByRank && !/%/.test(term)) {
    return { source: 'heal', label: 'Heal', percentByRank };
  }

  return null;
}

function parsePower(power, maxRank) {
  if (!power || /^-+$/.test(power.trim())) return { scaling: null, unparsed: [] };
  const terms = [];
  const unparsed = [];
  for (const term of splitTerms(power)) {
    const parsed = parseTerm(term, maxRank);
    if (parsed) terms.push(parsed);
    else if (/\d/.test(term)) unparsed.push(term);
  }
  return { scaling: terms.length ? terms : null, unparsed };
}

// The ~290 other extra labels are mostly prose and stay unmodelled.
const DERIVED_EFFECTS = {
  'hit bonus': 'hit',
  'critical bonus': 'critical',
  'evade bonus': 'evade',
  'move bonus': 'move',
  'damage bonus': 'damageBonus',
  'power bonus': 'power',
  'critical evade bonus': 'criticalEvade',
  'status infliction bonus': 'statusInfliction',
  'status resistance bonus': 'statusResistance',
};

// "Defense"/"Resistance" raise the stat (Iron Wall "passively increases your DEF"); "Skill" is SKI.
const STAT_WORDS = {
  str: 'str', strength: 'str',
  wil: 'wil', will: 'wil',
  cel: 'cel', celerity: 'cel',
  ski: 'ski', skill: 'ski',
  def: 'def', defense: 'def',
  res: 'res', resistance: 'res',
  vit: 'vit', vitality: 'vit',
  fai: 'fai', faith: 'fai',
  luc: 'luc', luck: 'luc',
  gui: 'gui', guile: 'gui',
  san: 'san', sanctity: 'san',
  apt: 'apt', aptitude: 'apt',
};

// "Hit Penalty: 25/20/15" is -25/-20/-15 to Hit; reading it as a bonus inverts six skills.
const FRAMING = /\b(bonus|boost|increase[sd]?|penalty|penalties|reduction|reduce[sd]?)\b/g;
const NEGATIVE_FRAMING = /\b(penalty|penalties|reduction|reduce[sd]?)\b/;

// "Elem ATK" is absent: Install Element Boost's element depends on the installed Youkai.
const ELEMENT_ATK = Object.fromEntries(
  ELEMENTS.map((element) => [`${element.toLowerCase()} atk`, element]),
);

const UNFRAMED_CHANNELS = {
  hit: 'hit',
  critical: 'critical',
  crit: 'critical',
  evade: 'evade',
  evasion: 'evade',
  'critical evade': 'criticalEvade',
  'status infliction': 'statusInfliction',
  'status resistance': 'statusResistance',
};

// Any unrecognised token rejects the whole label ("Bonus Stats", "Elemental Resistance Bonus", "Shell Power").
function parseBonusLabel(label) {
  const cleaned = label.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[:.]/g, ' ');
  const framed = FRAMING.test(cleaned);
  FRAMING.lastIndex = 0;
  const sign = NEGATIVE_FRAMING.test(cleaned) ? -1 : 1;

  const tokens = cleaned
    .replace(FRAMING, ' ')
    .split(/[/,]|\band\b/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!tokens.length) return null;

  const effects = [];
  for (const token of tokens) {
    if (STAT_WORDS[token]) effects.push({ kind: 'stat', key: STAT_WORDS[token], sign });
    else if (ELEMENT_ATK[token]) effects.push({ kind: 'element', key: ELEMENT_ATK[token], sign });
    else if (framed && DERIVED_EFFECTS[`${token} bonus`]) effects.push({ kind: 'derived', key: DERIVED_EFFECTS[`${token} bonus`], sign });
    else if (framed && DERIVED_BARE[token]) effects.push({ kind: 'derived', key: DERIVED_BARE[token], sign });
    else if (!framed && UNFRAMED_CHANNELS[token]) effects.push({ kind: 'derived', key: UNFRAMED_CHANNELS[token], sign });
    else return null;
  }
  return effects;
}

const DERIVED_BARE = {
  hit: 'hit',
  critical: 'critical',
  crit: 'critical',
  evade: 'evade',
  evasion: 'evade',
  power: 'power',
  move: 'move',
  damage: 'damageBonus',
  'critical evade': 'criticalEvade',
  'status infliction': 'statusInfliction',
  'status resistance': 'statusResistance',
};

// The wiki writes "<Skill Name> rank N", sometimes two separated by a comma.
function parseRequirements(extras) {
  const required = [];
  for (const [label, value] of extras ?? []) {
    if (!/^required/i.test(label) || !value) continue;
    for (const clause of String(value).split(',')) {
      const match = /^\s*(.+?)\s+rank\s+(\d+)\s*$/i.exec(clause);
      if (match) required.push({ name: match[1].trim(), rank: Number(match[2]) });
    }
  }
  return required;
}

// Computed by bespoke rules in `evaluateBuild`; marked so `skillBonuses` does not apply them twice.
const HAND_MODELLED = new Set([
  'Pain Tolerance',
  'Rising Game',
  'Fortitude',
  'Warwalk',
  'Endurance',
  'Luminary Element',
  'Persistence of Normalcy',
  'Power of Normalcy',
]);

// These pages pair permanent stat bonuses with conditional side effects that must not make them toggles.
const PERMANENT_STAT_SKILLS = new Set([
  "Dark Bard's Pledge", 'Exposure Tolerance', 'Illuminating Sol', 'Warding Light',
]);
// No rank headings on these pages; the bonus tables and Piety's rank-five capstone establish the caps.
const STAT_SKILL_RANK_CAPS = { Piety: 5, 'Illuminating Sol': 3 };

const CONDITION_MARKERS = new RegExp(
  [
    /\b(when|while|if|upon|after|against|unless|during)\b/,
    /\bfor \d+ rounds?\b|\bnext attack\b|\bfor that attack\b/,
    /\bequipped\b|\bwith \w+ weapons?\b|\bat least\b|\bthat have\b/,
    /\b(sword|axe|bow|dagger|fist|gun|spear|tome|shield|katana|polearm|staff)s?\b/,
    /\bper \w+\b/, // scales with something unmodelled
  ].map((r) => r.source).join('|'),
  'i',
);

const PASSIVE_MARKERS = /\bpassively (increases|grants|boosts)\b|\bincreases your (base )?\w+\b/i;

// Defaults to conditional: only explicit passive phrasing with no conditional wording earns `always`.
function classifyEffect(description, category) {
  // "If at max Rank, X is further increased by +1" is already in the per-rank list (+1/2/3/4/6).
  const text = String(description ?? '').replace(/\b(if\s+)?at max rank[^.]*\.?/gi, ' ');
  const passiveClass = category === 'Passive' || category === 'Innate';
  const conditional = CONDITION_MARKERS.test(text);
  return {
    stat: passiveClass && !conditional ? 'always' : 'conditional',
    derived: passiveClass && !conditional && PASSIVE_MARKERS.test(text) ? 'always' : 'conditional',
    // Every elemental ATK skill today is a timed cast buff (the Evoker's four elementals, Blotch).
    element: passiveClass && !conditional && PASSIVE_MARKERS.test(text) ? 'always' : 'conditional',
  };
}

function parseEffects(extras, maxRank, applies, description = '') {
  const effects = [];
  for (const [rawLabel, value] of extras ?? []) {
    if (!value) continue;
    const label = rawLabel.trim().toLowerCase();

    // A bare "Stat Bonus" names its stats in the body ("Stat Bonuses: DEF, RES, VIT").
    if (label === 'stat bonus' && /^[+\-\d/.\s%]+$/.test(value.trim())) {
      const named = /stat bonuses?:\s*([^.\n]+)/i.exec(description)?.[1] ?? '';
      const stats = named
        .split(/[,/]/)
        .map((part) => part.trim().toLowerCase())
        .filter((part) => STATS.includes(part));
      const valueByRank = applyLeadingSign(value, parseRankList(value, maxRank));
      if (valueByRank) for (const stat of new Set(stats)) effects.push({ kind: 'stat', key: stat, valueByRank, applies: applies.stat });
      continue;
    }

    const channels = parseBonusLabel(rawLabel);
    if (channels) {
      // Prose makes a value conditional ("+1/2/3 per square"); a % elemental value ("Dark ATK: 10/20/30/40/50%")
      // scales the element and has nowhere to go.
      if (channels.some((channel) => channel.kind === 'element') && value.includes('%')) continue;
      if (/^[+\-\d/.\s%]+$/.test(value.trim())) {
        const valueByRank = applyLeadingSign(value, parseRankList(value, maxRank));
        if (valueByRank) {
          for (const { sign, ...channel } of channels) {
            // Penalties are usually unsigned ("Hit Penalty: 25/20/15"); `Math.abs` covers the ones that are not.
            const signed = sign < 0 ? valueByRank.map((n) => -Math.abs(n)) : valueByRank;
            effects.push({ ...channel, valueByRank: signed, applies: applies[channel.kind] });
          }
        }
      }
      continue;
    }
    const statMatch = new RegExp(`^\\+?\\s*([\\d/]+)\\s*(${STATS.join('|')})\\b`, 'i').exec(value.trim());
    if (statMatch) {
      const valueByRank = applyLeadingSign(statMatch[1], parseRankList(statMatch[1], maxRank));
      if (valueByRank) effects.push({ kind: 'stat', key: statMatch[2].toLowerCase(), valueByRank, applies: applies.stat });
    }
  }
  return effects;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const raw = JSON.parse(await readFile(IN, 'utf8'));
const KNOWN_CLASSES = new Set(
  Object.keys(JSON.parse(await readFile(path.resolve('src/data/content/classes.json'), 'utf8')).classes),
);
const skills = [];
const skippedClasses = new Map();
const seenIds = new Set();
const report = { noPower: 0, unparsedTerms: [], unmodelledSources: new Map(), effects: 0 };

for (const entry of raw) {
  const classes = entry.class.split(/,\s*/).filter(Boolean);
  const known = classes.filter((name) => KNOWN_CLASSES.has(name));
  if (!known.length) {
    for (const name of classes) skippedClasses.set(name, (skippedClasses.get(name) ?? 0) + 1);
    continue;
  }

  const maxRank = STAT_SKILL_RANK_CAPS[entry.name] ?? parseInteger(entry.maxRank) ?? 1;
  const { scaling, unparsed } = parsePower(entry.power, maxRank);
  const applies = classifyEffect(entry.description, entry.type);
  const effects = parseEffects(entry.extras, maxRank, applies, entry.description);
  if (PERMANENT_STAT_SKILLS.has(entry.name)) {
    for (const effect of effects) if (effect.kind === 'stat') effect.applies = 'always';
  }

  let id = slug(entry.name);
  if (seenIds.has(id)) id = `${id}-${slug(known[0])}`;
  seenIds.add(id);

  for (const term of scaling ?? []) {
    if (term.unmodelled) {
      report.unmodelledSources.set(term.unmodelled, (report.unmodelledSources.get(term.unmodelled) ?? 0) + 1);
    }
  }
  if (unparsed.length) report.unparsedTerms.push({ name: entry.name, power: entry.power, unparsed });
  if (!scaling && entry.power && !/^-+$/.test(entry.power)) report.noPower += 1;

  const skill = {
    id,
    name: entry.name,
    classes: known,
    category: entry.type,
    maxRank,
    fpByRank: parseRankList(entry.fp, maxRank),
    momentum: parseInteger(entry.momentum),
    scaling,
    effects,
    requiresRaw: parseRequirements(entry.extras),
    ...(HAND_MODELLED.has(entry.name) ? { handModelled: true } : {}),
    text: {
      id,
      range: entry.range || null,
      target: entry.target || null,
      cooldown: entry.cooldown || null,
      restriction: entry.restriction || null,
      flags: entry.flags ?? [],
      powerRaw: entry.power && !/^-+$/.test(entry.power) ? entry.power : null,
      extras: entry.extras ?? [],
      description: entry.description ?? '',
      url: entry.url,
      ...(entry.transcribed ? { transcribed: true } : {}),
    },
  };
  applyBattleEffects(skill);
  report.effects += skill.effects.length;
  skills.push(skill);
}

// Ambiguous names stay unresolved: a wrong prerequisite would reject legal builds.
const idsByName = new Map();
for (const skill of skills) {
  const key = skill.name.toLowerCase();
  if (!idsByName.has(key)) idsByName.set(key, []);
  idsByName.get(key).push(skill.id);
}
const unresolvedRequirements = [];
for (const skill of skills) {
  const resolved = [];
  for (const { name, rank } of skill.requiresRaw) {
    const matches = idsByName.get(name.toLowerCase()) ?? [];
    if (matches.length === 1) resolved.push({ id: matches[0], rank });
    else unresolvedRequirements.push(`${skill.name} requires "${name}" (${matches.length} matches)`);
  }
  delete skill.requiresRaw;
  if (resolved.length) skill.requires = resolved;
}

// Live report confirmed by the project owner: Wind ATK is 7/9/11.
// Append so saved CEL/Move conditional keys remain stable.
skills.find(skill => skill.id === 'talvyd').effects.push(
  { kind: 'element', key: 'Wind', valueByRank: [7, 9, 11], applies: 'conditional' },
);

// Weapon-scoped passive: the wiki lists this in an extra field.
skills.find(skill => skill.id === 'keyshot').effects = [
  { kind: 'derived', key: 'critical', valueByRank: [5, 10, 15], applies: 'always', weapons: ['Bow'] },
];

skills.sort((a, b) => a.name.localeCompare(b.name));
const text = skills.map((s) => s.text);
for (const s of skills) delete s.text;

await writeFile(OUT, `${JSON.stringify({ skills })}\n`, 'utf8');
await writeFile(OUT_TEXT, `${JSON.stringify({ text })}\n`, 'utf8');

const withScaling = skills.filter((s) => s.scaling).length;
const withFp = skills.filter((s) => s.fpByRank).length;
const kb = (file, data) => `${path.relative(process.cwd(), file)} (${Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024)}KB)`;
console.log(`${skills.length} skills -> ${kb(OUT, { skills })} + ${kb(OUT_TEXT, { text })}`);
console.log(`  ${withScaling} with parsed damage scaling, ${withFp} with FP costs, ${report.effects} parsed effects`);
console.log(`  ${report.noPower} power fields were prose, not formulas`);
console.log(`  ${skills.filter((s) => s.requires).length} skills have a prerequisite`
  + `${unresolvedRequirements.length ? `, ${unresolvedRequirements.length} unresolved` : ''}`);
for (const item of unresolvedRequirements) console.log(`    unresolved: ${item}`);
for (const [name, count] of skippedClasses) {
  console.log(`  skipped ${count} skills for "${name}": the calculator has no such class`);
}

if (REPORT) {
  console.log('\nUnmodelled damage sources (recorded, never scored as an element):');
  for (const [name, count] of [...report.unmodelledSources].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${name}`);
  }
  console.log(`\nTerms carrying numbers this script did not classify (${report.unparsedTerms.length}):`);
  for (const item of report.unparsedTerms.slice(0, 40)) {
    console.log(`  ${item.name}: ${item.unparsed.join(' | ')}`);
  }
}
