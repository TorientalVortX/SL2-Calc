/**
 * Extracts per-item effects from weapon `specials` and armour `details`.
 *
 *   src/data/content/weapons-*.json  \
 *   src/data/armors.json             /  ->  src/data/content/item-effects.json
 *
 * Items describe their effects in prose, and many scale with **UL**: the upgrade
 * points spent on that piece. "Increases Light ATK by UL/2" is worth nothing on
 * a fresh weapon and +7 on a fully upgraded one, so the value cannot be a
 * constant; it is stored as `base + UL * ulMultiplier` and resolved against the
 * build's own upgrade spend at evaluation time.
 *
 * Effects are classified into three groups, and only the first changes a build
 * on its own:
 *
 *   always:      an unconditional passive bonus ("+3 STR")
 *   conditional: quantified but gated ("+10 Critical when attacking from behind")
 *   reference:   real but unmodellable ("Vampiric (10%)", "Attacks in a 3-wide line")
 *
 *   node scripts/build-item-effects.mjs
 *   node scripts/build-item-effects.mjs --report
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONTENT = path.resolve('src/data/content');
const ARMORS = path.resolve('src/data/armors.json');
/** Hands, shields, legs and accessories, equipment slots 3 to 6. */
const GEAR = path.join(CONTENT, 'gear.json');
const OUT = path.join(CONTENT, 'item-effects.json');
const REPORT = process.argv.includes('--report');

const STATS = {
  str: 'str', wil: 'wil', ski: 'ski', cel: 'cel', def: 'def', res: 'res',
  vit: 'vit', fai: 'fai', luc: 'luc', gui: 'gui', san: 'san', apt: 'apt',
};
/**
 * Derived channels the calculator can actually place a bonus on.
 *
 * `hp` and `fp` are here because slots 3-6 depend on them: the hands upgrade
 * track is Max FP and the legs track is Max HP, and a great many accessories
 * read "+25 FP". Both spellings the data uses map to the same channel, longest
 * first so "maximum HP" is not read as a bare "HP".
 */
const DERIVED = {
  power: 'power', hit: 'hit', critical: 'critical', 'critical evade': 'criticalEvade',
  evade: 'evade', armor: 'armor', 'magic armor': 'magicArmor', weight: 'weight',
  'maximum hp': 'hp', 'maximum fp': 'fp', 'max hp': 'hp', 'max fp': 'fp', hp: 'hp', fp: 'fp',
};
const ELEMENTS = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
/**
 * Damage types that are not elements but are resisted the same way.
 *
 * Half-Plate's '+5% Pierce and Slash Resistance' and the Chainmail Section
 * material read exactly like an elemental resistance, so they share the
 * pattern. They only diverge in which record they land in.
 */
const PHYSICAL = ['Blunt', 'Pierce', 'Slash'];
const RESIST_TYPES = [...ELEMENTS, ...PHYSICAL];

/** Wording that gates an effect on something the calculator cannot see. */
const CONDITION = /\b(when|while|if|against|versus|vs\.?|from behind|per|each|chance|after|spells?|on (?:hit|crit|attack)|chance to)\b/i;

/* ------------------------------------------------------------------ values */

/**
 * Reads a magnitude that may be a plain number or a UL expression.
 *
 * Returns `{ base, ulMultiplier }` so "UL/2" and "1+UL" and "+3" all share one
 * shape: the value at evaluation time is `base + UL * ulMultiplier`.
 */
function parseMagnitude(text) {
  const cleaned = String(text).replace(/[()]/g, '').trim();
  // "1+UL", a flat part plus a UL part.
  const combined = /^([+-]?\d+)\s*\+\s*UL\b/i.exec(cleaned);
  if (combined) return { base: Number(combined[1]), ulMultiplier: 1 };
  /*
   * A range: "+1-3 DEF", "+2-4 CEL".
   *
   * This is per-item RNG (the copy you own rolled somewhere in the range when
   * it dropped and keeps that value), so neither end is "the" answer. Both are
   * recorded and the build picks the roll it actually has; `base` is the floor
   * and the default, so an unconfigured build is understated rather than
   * overstated.
   *
   * Must be tried before the plain-number case. Without it "+1-3" reads as the
   * number -3, turning each of these bonuses into a penalty.
   */
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

/**
 * Wording that makes an HP or FP number something other than a bonus to the
 * maximum.
 *
 * Two kinds, both common in this data:
 *
 *   Regeneration. "Recover 2 HP each Round", "Restores 1 + UL HP and FP" move
 *   current HP, not max HP.
 *
 *   Costs. "Sheath Sword's FP cost is increased to 25 FP" is what a skill
 *   spends, not what the item grants.
 *
 * Read as channel bonuses either would quietly raise a build's maximum, so an
 * hp/fp magnitude governed by one of these is dropped. Only hp and fp need the
 * guard: nothing restores Armor or costs Power.
 */
const RECOVERY = /\b(?:recovers?|recovered|restores?|restored|heals?|healed|regains?|drains?|loses?|lost|costs?|sacrifices?)\b/i;

/**
 * The cost line of a skill an item grants, which is not a bonus either.
 *
 * Many hands and accessory items grant a skill and state its price the way the
 * wiki always does ("3M, 15 FP, 1 Round CD" or "2 Momentum, 30 FP"), so the FP
 * figure sits directly after a momentum cost. Read as a channel that becomes
 * +15 max FP for merely owning the item.
 */
const SKILL_COST = /\d+\s*(?:M|Momentum)\b[\s,]*$/i;

/** How far back to look for the verb governing a magnitude. */
const RECOVERY_LOOKBACK = 40;

/**
 * Whether the match at `index` is a heal rather than a bonus.
 *
 * Looks back a short distance rather than using a lookbehind, because a single
 * verb governs several magnitudes: in "restores 10 HP and 10 FP to both you and
 * the target" the second number is just as much a heal as the first, but only
 * the first sits directly after the verb.
 */
function isRecovery(text, index, channel, end = index) {
  if (channel.key !== 'hp' && channel.key !== 'fp') return false;
  const before = text.slice(Math.max(0, index - RECOVERY_LOOKBACK), index);
  // A sentence break ends the verb's reach, so "+50 HP. Recover 3 HP" keeps its
  // first magnitude.
  const clause = before.split(/[.;!?]/).pop() ?? before;
  if (RECOVERY.test(clause) || SKILL_COST.test(clause)) return true;
  // "cost" can also trail the magnitude: "+5 FP cost." raises what a skill
  // spends. Only the words immediately after count, so a later sentence
  // mentioning a cost does not disqualify an earlier bonus.
  return /^\s*cost/i.test(text.slice(end, end + 12));
}

/**
 * Flat elemental resistance, which the wiki writes several ways at once:
 *
 *   10% Lightning Resistance
 *   10-30% Darkness Resistance          (a rolled range)
 *   10% Light and Dark Resistance       (two elements, one magnitude)
 *   8-15% Fire, Ice, Lightning and Wind Resistance
 *
 * One magnitude can cover a list of elements, so the element run is captured
 * whole and split afterwards rather than trying to express the list in the
 * pattern. `Dark` and `Darkness` are the same element under two names.
 */
const RESISTANCE = new RegExp(
  String.raw`([+-]?\d+)(?:\s*-\s*(\d+))?%\s*((?:${RESIST_TYPES.join('|')}|Darkness)(?:\s*(?:,|and)\s*(?:${RESIST_TYPES.join('|')}|Darkness))*)\s+Resist`,
  'gi',
);

/**
 * The canonical element for a name the data spells differently.
 *
 * The wiki writes "Darkness" and the calculator's `ElementKey` is "Dark". Both
 * the parsed text and the curated `armors.json` map use both spellings, so
 * everything is normalised through here before the two are compared.
 */
function canonicalElement(name) {
  const trimmed = String(name).trim();
  if (/^darkness$/i.test(trimmed)) return 'Dark';
  return RESIST_TYPES.find((type) => type.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

/**
 * "+1 to all stats": a magnitude with no channel beside it.
 *
 * Bands of the Chimera is the plain case: its siblings all name a stat ("+1-4
 * STR") and parse, while it says "all stats" and parsed to nothing at all.
 *
 * `DEBUFF_SUBJECT` is why this is not just a pattern. Giant Slayer reads
 * "…enemies … suffer -5 to all stats", a penalty aimed at someone else; read as
 * the wearer's own bonus it would take 5 off every stat the player has. The same
 * shape of mistake as reading a heal as max HP, so it is guarded the same way.
 */
const ALL_STATS = /([+-]?\d+)\s*(?:to\s+)?all\s+stats\b/gi;
const DEBUFF_SUBJECT = /\b(suffers?|inflicts?|reduces?|lowers?|drains?)\b/i;

/** Every "all stats" bonus in one description, expanded to the twelve stats. */
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

/** Every elemental resistance stated in one description. */
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

/** Maps a matched channel word to its `{ kind, key }`. */
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

/** "Increases X by N" and "+N X", the two orders the data uses. */
const PATTERNS = [
  // Green-Scale Tunic states a variable bonus whose ceiling is UL. This comes
  // first so the intermediate "0.5 Evade" conversion rate is not mistaken for
  // the bonus itself.
  new RegExp(String.raw`Increases?\s+(?:your\s+)?(${CHANNELS})\b[\s\S]*?\b(?:up\s+to\s+)?(?:a\s+)?maximum\s+(?:of\s+)?\(?(${MAGNITUDE})\)?`, 'gi'),
  // Allow a targeting phrase between the channel and magnitude: for example,
  // "Increases Evade against enemies within 1 Range by UL."
  new RegExp(String.raw`Increases?\s+(?:your\s+)?(${CHANNELS})\b[^.!?]*?\bby\s+\(?(${MAGNITUDE})\)?`, 'gi'),
  new RegExp(String.raw`\(?(${MAGNITUDE})\)?\s+(${CHANNELS})\b`, 'gi'),
];

/**
 * Every stat bonus stated in one effect description.
 *
 * Both orders are tried; a description matched by the first is not re-scanned by
 * the second, so "Increases STR by 3" is not also read as "3 STR".
 */
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

/** Builds one record, or null when nothing quantified could be read. */
function toRecord(name, description, alwaysEligible) {
  /*
   * A magnitude of zero that does not scale can never change anything. These
   * come from prose that happens to contain a number ("if you are reduced to 0
   * HP"), and would otherwise surface as a toggle that does nothing when used.
   */
  const effects = [...parseEffects(description), ...parseResistances(description), ...parseAllStats(description)]
    .filter((value) => value.base !== 0 || value.ulMultiplier !== 0 || value.rollMax);
  /*
   * A trailing chance clause is a separate effect from a passive magnitude
   * before the comma.  Armor of Eyes is the important example:
   *
   *   "Increases Hit by UL/2, UL% chance to reduce critical damage."
   *
   * The old whole-description check saw `chance` and incorrectly gated the Hit
   * bonus too.  Keep the full prose for display, but classify the numeric bonus
   * from the clause that actually contains it.
   */
  const magnitudeClause = description
    // A disabling exception does not make a normally-active bonus opt-in.
    .replace(/,\s*except when\b[^.]*\.?/gi, '.')
    // Chance clauses after the passive magnitude describe a different effect.
    .replace(/\bUL%\s+chance\b.*$/i, '');
  const conditional = CONDITION.test(magnitudeClause) || /for \d+ attacks? this round/i.test(description);
  return {
    name,
    description: description.replace(/\s+/g, ' ').trim(),
    // Reference entries keep their text but carry no numbers.
    applies: !effects.length ? 'reference' : (conditional || !alwaysEligible) ? 'conditional' : 'always',
    effects,
  };
}

function valueSignature(value) {
  return `${value.kind}:${value.key}:${value.base}:${value.ulMultiplier}:${value.rollMax ?? ''}`;
}

/** Numeric armor fields already consumed by the structured armor evaluator. */
function structuredArmorSignatures(armor) {
  const signatures = new Set();
  /*
   * Built through `valueSignature` rather than by hand. The two formats have to
   * agree exactly or nothing dedupes, and they silently drifted apart once the
   * signature grew a field for rolled ranges.
   */
  const signature = (kind, key, base) => valueSignature({ kind, key, base, ulMultiplier: 0 });
  for (const [key, value] of Object.entries(armor.statBonuses ?? {})) {
    if (typeof value !== 'number') continue;
    if (STATS[key]) signatures.add(signature('stat', key, value));
    /*
     * `statBonuses` carries hp and fp alongside the twelve stats, and the
     * evaluator already adds those to equipment HP/FP. Now that hp and fp are
     * parseable channels, an armour stating "+10 HP" in its details as well
     * would be counted twice unless the structured value is registered here too.
     */
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
    /*
     * Resistances are suppressed by element rather than by value.
     *
     * `armors.json` already carries a curated resistance map that the evaluator
     * applies, and the details text repeats it, so parsing the text too would
     * double every one. Matching on value alone would not be enough: Cloak of
     * Many Colors is curated at 12% while its text reads "8-15%", so the numbers
     * disagree even though they describe the same bonus.
     */
    return !(value.kind === 'resistance' && structuredElements.has(value.key));
  });
  return effects.length ? { ...record, effects } : { ...record, applies: 'reference', effects: [] };
}

/* ------------------------------------------------------------------- build */

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
    // Elements the curated map already covers for this piece.
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
      // `specialEffects` summarizes `details`; do not offer the same magnitude
      // twice under two labels, which would let it be enabled twice.
      const effects = record.effects.filter((value) => !detailValues.has(valueSignature(value)));
      records.push(effects.length ? { ...record, effects } : { ...record, applies: 'reference', effects: [] });
    }
    if (records.length) armors[armor.name] = records;
  }
}

/*
 * Hands, shields, legs and accessories.
 *
 * Unlike armour these carry no structured stat columns to de-duplicate against
 * (the wiki gives them none), so every effect comes from the prose. Each item's
 * lines are read individually rather than as one joined description: they are
 * separate bullet points on the wiki, and one being conditional ("On Hit: …")
 * should not make the flat "+2 SKI" beside it conditional too.
 */
const gear = {};
for (const list of Object.values(JSON.parse(await readFile(GEAR, 'utf8')))) {
  for (const item of list) {
    const records = [];
    const seen = new Set();
    for (const line of item.specialEffects ?? []) {
      const record = toRecord(item.name, line, true);
      if (!record.effects.length && !record.description) continue;
      // Two lines can state the same bonus; offering it twice would let the same
      // magnitude be enabled twice.
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
