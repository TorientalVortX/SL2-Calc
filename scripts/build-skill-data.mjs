/**
 * Turns the scraped wiki corpus into the calculator's skill dataset.
 *
 *   wiki-data/raw/skills.json  ->  src/data/content/skills.json
 *
 * The wiki writes its numbers as prose ("100/110/120% Scaled WPN ATK",
 * "13/15/17/19/21 FP"). Parsing that at runtime would put string handling in the
 * damage path, so every value is resolved to arrays indexed by rank here, at
 * build time, and the app only ever reads numbers.
 *
 *   node scripts/build-skill-data.mjs           # write the dataset
 *   node scripts/build-skill-data.mjs --report  # also print what did not parse
 *
 * Parsing is deliberately conservative: anything this script cannot read with
 * confidence is left out of the structured fields and preserved verbatim in
 * `powerRaw` / `extras`, so an unrecognised format shows up as a missing effect
 * rather than a wrong number.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN = path.resolve('wiki-data/raw/skills.json');
/** Mechanics: read by the damage and stat paths, so it loads with the app. */
const OUT = path.resolve('src/data/content/skills.json');
/** Prose: only the Skills dialog needs it, so it is fetched on demand. */
const OUT_TEXT = path.resolve('src/data/content/skills-text.json');
const REPORT = process.argv.includes('--report');

/* ------------------------------------------------------------------ tokens */

/** Elements the calculator models. `ElementKey` in src/types.ts. */
const ELEMENTS = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
const STATS = ['str', 'wil', 'cel', 'ski', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

/**
 * Damage sources the wiki names but the calculator has no element for.
 * "Darkness" is a distinct damage type in game and must NOT be folded into
 * "Dark". It is recorded with a null element so it never scores as Dark.
 */
const UNMODELLED_SOURCES = ['Darkness', 'Elemental', 'Rage Energy', 'Max HP'];

/* ------------------------------------------------------------------ numbers */

/**
 * Reads a per-rank number list.
 *
 * The wiki uses "/" between ranks and is inconsistent about "%" placement and
 * stray separators ("100/120//180%", "50/60/70/80/90/%"). A single value means
 * the skill uses it at every rank, so it is broadcast to `maxRank` entries.
 * Returns null when nothing numeric is present.
 */
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
  // A list longer than maxRank means the wiki and the infobox disagree; keep the
  // wiki's list rather than silently truncating a real value.
  if (values.length >= ranks) return values;
  // Short list: the last value carries to the remaining ranks.
  return Array.from({ length: ranks }, (_, i) => values[Math.min(i, values.length - 1)]);
}

/**
 * Applies a rank list's leading sign to the values behind it.
 *
 * The wiki states the sign once at the front: "-2/4/6" is -2/-4/-6, and
 * "+10/20/30" is all positive. Read literally, the first form yields a penalty
 * at rank 1 that turns into a bonus at rank 2, which is how Frailty of Credwa
 * and Noshka's Famine came out backwards.
 *
 * Only applied when no later entry carries its own sign, so a genuinely mixed
 * list is left exactly as written.
 */
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

/* -------------------------------------------------------------------- power */

/**
 * Splits a power string into its additive terms.
 *
 * The wiki separates terms with "+", "," or "&". All mean "and also". Slashes
 * inside a term are rank separators, not term separators, so the split has to
 * happen before any per-rank parsing.
 */
function splitTerms(power) {
  return power
    .replace(/\s+/g, ' ')
    .split(/\s*[+,&]\s*/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/**
 * Classifies one power term and pulls out its per-rank percentages.
 *
 * Returns null when the term carries no recognisable damage source, which is
 * common: many "Power" fields describe an effect ("Knockdown enemy") rather
 * than a formula.
 */
function parseTerm(term, maxRank) {
  const numbers = /[\d.]+(?:\s*[%]?\s*\/+\s*[\d.]*%?)*/.exec(term);
  const percentByRank = numbers ? parseRankList(numbers[0], maxRank) : null;
  const text = term.toLowerCase();

  // Weapon attack, across every spelling the wiki uses.
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

  // A raw stat contribution, e.g. "100% STR".
  const statMatch = new RegExp(`\\b(${STATS.join('|')})\\b`).exec(text);
  if (statMatch && percentByRank && /%/.test(term)) {
    return { source: 'stat', stat: statMatch[1], label: statMatch[1].toUpperCase(), percentByRank };
  }

  // Flat damage added on top of the scaled terms. Recorded for completeness; it
  // has no percentage, so it never feeds the percentage-based optimizer model.
  if (/\b(base|bonus)\s*(dmg|damage)\b/.test(text) && percentByRank && !/%/.test(term)) {
    return { source: 'flat', label: /base/.test(text) ? 'Base damage' : 'Bonus damage', percentByRank };
  }

  // Healing, so a support skill's numbers are not silently dropped. Never damage.
  if (/\bheal\b/.test(text) && percentByRank && !/%/.test(term)) {
    return { source: 'heal', label: 'Heal', percentByRank };
  }

  return null;
}

/** Structured scaling for a skill, or null when the power field is not a formula. */
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

/* ------------------------------------------------------------------ effects */

/**
 * Extras whose value is a straightforward per-rank bonus to something the
 * calculator already tracks. Everything outside this table stays unmodelled:
 * the long tail of 290-odd extra labels is mostly prose, and guessing at it
 * would put invented numbers into the stat totals.
 */
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

/**
 * Words the wiki uses for each stat, in bonus labels like "Wil Bonus" or
 * "STR/SKI Bonus". Both the abbreviation and the full name appear.
 *
 * "Defense" and "Resistance" read like derived values but the skills carrying
 * them say plainly that they raise the stat (Iron Wall "passively increases
 * your DEF"), and "Skill" is the SKI stat, as Honed Shot's "increases SKI
 * passively" confirms.
 */
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

/**
 * Words that frame a label as a modifier rather than a raw quantity, and which
 * direction it moves in.
 *
 * The distinction carries weight. "Hit Penalty: 25/20/15" is a real, parseable
 * -25/-20/-15 to Hit; reading it as a bonus would invert six skills.
 */
const FRAMING = /\b(bonus|boost|increase[sd]?|penalty|penalties|reduction|reduce[sd]?)\b/g;
const NEGATIVE_FRAMING = /\b(penalty|penalties|reduction|reduce[sd]?)\b/;

/**
 * Channels a label may name when it carries no framing word at all.
 *
 * Narrower than `DERIVED_BARE` on purpose. An unframed "DEF/RES" or "STR/WIL" is
 * unambiguous, but an unframed "Damage" is the damage the skill deals, not a
 * bonus to a damage channel, so `damage` is deliberately absent here while
 * remaining valid in "Damage Bonus".
 */
/**
 * Elemental attack labels: "Fire ATK Bonus", "Water ATK Increase", the bare
 * "Dark ATK" inside "Hit/Evade/Dark ATK".
 *
 * A flat addition to one element's attack, which is exactly what the damage
 * model multiplies a skill's elemental percentage against, so these are worth
 * having. Deliberately keyed by the calculator's `ElementKey` spelling.
 *
 * "Elem ATK" is absent: Install Element Boost's element depends on the installed
 * Youkai, so there is no single element to credit.
 */
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

/**
 * Reads a label into the channels it moves, and the direction.
 *
 * The wiki writes these many ways: "Wil Bonus", "STR/WIL Bonus", "SKI and CEL
 * Bonus", "Power/Hit/Critical Bonus", "Bonus Hit", "Hit Penalty", and sometimes
 * with no framing word at all ("DEF/RES", "STR/WIL"). They are all a list of
 * channels, so the framing is stripped and what remains must match the
 * whitelists entirely.
 *
 * Rejecting the whole label on any unrecognised token is what keeps this honest:
 * "Bonus Stats" never says which stats, "Elemental Resistance Bonus" names a
 * channel with no single field, and "Shell Power" is a mechanic the calculator
 * does not model. All contribute nothing rather than a guess.
 */
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

/** Derived channels named without the word "bonus" attached, e.g. "Bonus Hit". */
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

/**
 * Reads a "Required" extra into the skills it depends on.
 *
 * The wiki writes these as "<Skill Name> rank N", occasionally two separated by
 * a comma ("Spark Drive rank 1, Overcharge rank 1"). Names are resolved to ids
 * after the whole corpus is read, because an id is only known once duplicate
 * names have been disambiguated.
 */
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

/**
 * Skills whose effect the calculator computes with a bespoke rule.
 *
 * The wiki states these as prose rather than a parseable bonus (Rising Game
 * scales with how much HP is missing, the rest change max HP by a percentage or a
 * per-rank amount), so `evaluateBuild` reads their rank directly. They are marked
 * here so `skillBonuses` skips them and the same bonus is not applied twice.
 */
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

/**
 * Wording that makes a bonus situational rather than permanent: a stance, a
 * weapon requirement, a timed buff, a reaction to being hit.
 */
const CONDITION_MARKERS = new RegExp(
  [
    /\b(when|while|if|upon|after|against|unless|during)\b/, // timing and triggers
    /\bfor \d+ rounds?\b|\bnext attack\b|\bfor that attack\b/, // timed buffs
    /\bequipped\b|\bwith \w+ weapons?\b|\bat least\b|\bthat have\b/, // gear requirements
    /\b(sword|axe|bow|dagger|fist|gun|spear|tome|shield|katana|polearm|staff)s?\b/, // named weapon types
    /\bper \w+\b/, // scales with something unmodelled
  ].map((r) => r.source).join('|'),
  'i',
);

/** Wording that marks a bonus as permanently applied. */
const PASSIVE_MARKERS = /\bpassively (increases|grants|boosts)\b|\bincreases your (base )?\w+\b/i;

/**
 * Decides whether a skill's bonus is always on or situational.
 *
 * This defaults to `conditional`, because most bonuses on the wiki are gated on
 * something the calculator cannot see (position, a prepared shot, a weapon type,
 * a buff window). Only an explicit passive phrasing with no conditional wording
 * earns `always`; those are the ones safe to add straight into a build's totals.
 * Conditional bonuses still ship with their numbers. They are opt-in toggles,
 * exactly like the existing armor conditional bonuses.
 */
function classifyEffect(description, category) {
  /*
   * A "if at max Rank, X is further increased by +1" clause does not make the
   * bonus situational: the per-rank list already carries it, which is why these
   * skills read +1/2/3/4/6 rather than +1/2/3/4/5. Stripping it first stops an
   * otherwise permanent passive being written off as conditional.
   */
  const text = String(description ?? '').replace(/\b(if\s+)?at max rank[^.]*\.?/gi, ' ');
  const passiveClass = category === 'Passive' || category === 'Innate';
  const conditional = CONDITION_MARKERS.test(text);
  return {
    /** Stat bonuses trust the label, which names the stat outright. */
    stat: passiveClass && !conditional ? 'always' : 'conditional',
    /** Derived channels need the prose to say the bonus is permanent. */
    derived: passiveClass && !conditional && PASSIVE_MARKERS.test(text) ? 'always' : 'conditional',
    /*
     * Elemental attack takes the same strict rule. Every skill currently
     * carrying one is a cast buff that lasts a few rounds (the Evoker's four
     * elementals, Blotch), so they ship as opt-in toggles rather than being
     * folded into a build's permanent totals.
     */
    element: passiveClass && !conditional && PASSIVE_MARKERS.test(text) ? 'always' : 'conditional',
  };
}

/**
 * Conservative per-rank effects for a skill.
 *
 * Only two shapes are trusted: an extra whose label maps to a tracked derived
 * stat, and an explicit "+N STAT" in an extra value. Anything else is left for
 * a human to read in `extras`.
 */
function parseEffects(extras, maxRank, applies, description = '') {
  const effects = [];
  for (const [rawLabel, value] of extras ?? []) {
    if (!value) continue;
    const label = rawLabel.trim().toLowerCase();

    /*
     * A bare "Stat Bonus" does not say which stats it raises, but the skills
     * carrying it spell them out in the body ("Stat Bonuses: DEF, RES, VIT").
     * Only the stat names the calculator knows are taken; anything else in that
     * list, such as Armor or Scaled Weapon Attack, is left alone.
     */
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
      // Only a purely numeric value is a flat bonus. Any prose makes it
      // conditional ("+1/2/3 per square" scales with distance and "5/10/15 +
      // 50% caster's Scaled LUC" has a second term), and applying either as a
      // flat bonus would overstate the build.
      /*
       * A percentage is a different quantity from a flat elemental bonus ("Dark
       * ATK: 10/20/30/40/50%" scales the element, it does not add to it), and
       * the calculator has nowhere to put the former. Rejected rather than
       * added as if it were flat.
       */
      if (channels.some((channel) => channel.kind === 'element') && value.includes('%')) continue;
      if (/^[+\-\d/.\s%]+$/.test(value.trim())) {
        const valueByRank = applyLeadingSign(value, parseRankList(value, maxRank));
        if (valueByRank) {
          for (const { sign, ...channel } of channels) {
            /*
             * A penalty is usually written unsigned ("Hit Penalty: 25/20/15"),
             * so the sign comes from the label. When the wiki already wrote the
             * minus, `Math.abs` stops the two negatives cancelling.
             */
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

/* -------------------------------------------------------------------- build */

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const raw = JSON.parse(await readFile(IN, 'utf8'));
/*
 * The wiki documents a class the calculator does not implement (Chemist). Its
 * skills are dropped rather than shipped pointing at a class that cannot be
 * selected, and reported below so the gap stays visible.
 */
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

  const maxRank = parseInteger(entry.maxRank) ?? 1;
  const { scaling, unparsed } = parsePower(entry.power, maxRank);
  const applies = classifyEffect(entry.description, entry.type);
  const effects = parseEffects(entry.extras, maxRank, applies, entry.description);

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
  report.effects += effects.length;

  skills.push({
    id,
    name: entry.name,
    classes: known,
    category: entry.type,
    maxRank,
    fpByRank: parseRankList(entry.fp, maxRank),
    momentum: parseInteger(entry.momentum),
    scaling,
    effects,
    // Resolved to ids below, once every name is known.
    requiresRaw: parseRequirements(entry.extras),
    ...(HAND_MODELLED.has(entry.name) ? { handModelled: true } : {}),
    // Display-only fields; split out below.
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
  });
}

/*
 * Second pass: turn required skill *names* into ids.
 *
 * Deferred to here because an id is only settled once duplicate names have been
 * disambiguated with a class suffix. A name that resolves to more than one skill
 * is left unresolved and reported rather than guessed at: a prerequisite
 * pointing at the wrong skill would reject legal builds.
 */
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

skills.sort((a, b) => a.name.localeCompare(b.name));
const text = skills.map((s) => s.text);
for (const s of skills) delete s.text;

// Written minified: this is generated data nobody hand-edits, and the mechanics
// file is parsed on every page load.
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
