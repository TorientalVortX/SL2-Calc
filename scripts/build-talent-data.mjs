/**
 * Turns the scraped talent catalog into the calculator's talent dataset.
 *
 *   wiki-data/raw/talents.json  ->  src/data/content/talents.json
 *                               ->  optimizer-knowledge/01-core-mechanics/talents-catalog.md
 *
 * Every subtalent keeps its wiki text verbatim. On top of that, two kinds of
 * claim are lifted into structured fields, because both change what a build can
 * legally equip or how its numbers come out:
 *
 *   weaponAccess  "Allows you to equip any Sword weapon with a Rarity equal to
 *                  or less than SR * 2". The Adaptation subtalents, which are
 *                  the only way to reach a weapon your class cannot use.
 *   modifiers     "increases Hit by SR * 1.5". A per-rank change to a stat the
 *                  calculator models, with the weapon types it is scoped to and
 *                  whether it fires unconditionally.
 *
 * Anything whose subject does not resolve to a stat the calculator models stays
 * prose only; `--report` lists those so a wiki rewrite surfaces instead of
 * silently dropping numbers.
 *
 *   node scripts/build-talent-data.mjs
 *   node scripts/build-talent-data.mjs --report
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN = path.resolve('wiki-data/raw/talents.json');
const OUT = path.resolve('src/data/content/talents.json');
const KNOWLEDGE_OUT = path.resolve('optimizer-knowledge/01-core-mechanics/talents-catalog.md');
const REPORT = process.argv.includes('--report');

const raw = JSON.parse(await readFile(IN, 'utf8'));

const kebab = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ------------------------------------------------------------ weapon scope */

/**
 * Weapon words the wiki uses, mapped to the calculator's `weaponType` values.
 * Subtypes (Rifle, Shortbow, Shuriken…) resolve to their parent type and are
 * also recorded separately, because a talent that doubles for Rifles still
 * applies to every Gun.
 */
const WEAPON_WORDS = [
  ['Swords', 'Sword'], ['Sword', 'Sword'],
  ['Daggers', 'Dagger'], ['Dagger', 'Dagger'],
  ['Axes', 'Axe'], ['Axe', 'Axe'],
  ['Polearms', 'Polearm'], ['Polearm', 'Polearm'],
  ['Spears', 'Polearm'], ['Spear', 'Polearm'],
  ['Shortbows', 'Bow'], ['Shortbow', 'Bow'],
  ['Crossbows', 'Bow'], ['Crossbow', 'Bow'],
  ['Bows', 'Bow'], ['Bow', 'Bow'],
  ['Fists', 'Fist'], ['Fist', 'Fist'],
  ['Rifles', 'Gun'], ['Rifle', 'Gun'],
  ['Handguns', 'Gun'], ['Handgun', 'Gun'],
  ['Shotguns', 'Gun'], ['Shotgun', 'Gun'],
  ['Guns', 'Gun'], ['Gun', 'Gun'],
  ['Tomes', 'Tome'], ['Tome', 'Tome'],
  ['Shuriken', 'Dagger'],
  // Katana is stocked under both swords and daggers, so it widens to both
  // rather than picking one and quietly excluding half the weapons it names.
  ['Katanas', 'Sword'], ['Katana', 'Sword'], ['Katanas', 'Dagger'], ['Katana', 'Dagger'],
];

/** Words that name a weapon subtype rather than a whole type. */
const SUBTYPE_WORDS = new Set(['Shortbow', 'Crossbow', 'Rifle', 'Handgun', 'Shotgun', 'Shuriken', 'Katana', 'Spear']);

/** The weapon types and subtypes a fragment of effect text mentions. */
function weaponScope(text) {
  const types = new Set();
  const subtypes = new Set();
  for (const [word, type] of WEAPON_WORDS) {
    if (!new RegExp(`\\b${word}\\b`).test(text)) continue;
    types.add(type);
    const singular = word.replace(/s$/, '');
    if (SUBTYPE_WORDS.has(singular)) subtypes.add(singular);
  }
  return { weapons: [...types].sort(), weaponSubtypes: [...subtypes].sort() };
}

/* ----------------------------------------------------------- stat resolver */

/**
 * Ordered subject-phrase → stat key rules. Order is load-bearing: "maximum
 * Battle Weight" is a carrying cap, plain "Battle Weight" is the weapon's, and
 * "Critical Damage" must be tested before "Critical".
 */
const STAT_RULES = [
  [/close-range Hit penalty/i, ['closeRangeHitPenalty']],
  [/maximum Battle Weight/i, ['maxBattleWeight']],
  [/Battle Weight/i, ['battleWeight']],
  [/Critical Damage/i, ['criticalDamage']],
  [/chance of .*criticals?/i, ['criticalChance']],
  [/\bCritical\b/i, ['critical']],
  [/Scaled Weapon ATK/i, ['scaledWeaponAtk']],
  [/\b(Fire|Ice|Earth|Wind|Water|Darkness|Light|Lightning|Sound|Acid)\s+ATK\b/i, ['elementAtk']],
  [/\bHit\b/i, ['hit']],
  // Farshot is a range band, not the weapon's reach: pushing the penalty out
  // does not let you attack further, so it gets its own key.
  [/range before Farshot/i, ['farshotRange']],
  [/attack range/i, ['attackRange']],
  [/maximum FP/i, ['maxFp']],
  [/FP Regeneration/i, ['fpRegen']],
  [/FP costs?/i, ['fpCost']],
  [/Skill Pool/i, ['skillPool']],
  [/Status Infliction/i, ['statusInfliction']],
  [/Armor and Magic Armor/i, ['armor', 'magicArmor']],
  [/Magic Armor/i, ['magicArmor']],
  [/\bArmor\b/i, ['armor']],
  [/Durability consumption/i, ['durabilityConsumption']],
  [/\bPower\b/i, ['power']],
  [/Item Belt/i, ['itemBelt']],
  [/carrying capacity/i, ['carryingCapacity']],
  // Bare FP and HP are only the pools themselves. Anchored, so a subject that
  // merely mentions them ("campfire HP/FP recovery") stays prose.
  [/^(?:your |target's |the target's )?FP$/i, ['fp']],
  [/^(?:your )?HP$/i, ['hp']],
];

/** The element named in an elemental-ATK subject, e.g. `Fire ATK` → `Fire`. */
const elementIn = (subject) => subject.match(/\b(Fire|Ice|Earth|Wind|Water|Darkness|Light|Lightning|Sound|Acid)\s+ATK\b/i)?.[1] ?? null;

function resolveStats(subject) {
  for (const [pattern, keys] of STAT_RULES) if (pattern.test(subject)) return keys;
  return null;
}

const INCREASE = /^(increas|rais|boost|improv|add|gain|grant|restor|recover)/i;

/* ------------------------------------------------------- effect extraction */

/**
 * `"Allows you to equip any Sword weapon with a Rarity equal to or less than SR * 2"`
 *
 * The Adaptation subtalents are the game's only rarity unlock, so this is
 * matched exactly rather than inferred: at rank SR the character may equip any
 * weapon of that type whose Rarity is at most `SR * rarityPerRank`.
 */
function parseWeaponAccess(effect) {
  const match = effect.match(
    /Allows you to equip any ([A-Za-z]+)(?: weapon)? with (?:a )?Rarity equal to or less than SR\s*\*\s*(\d+(?:\.\d+)?)/i,
  );
  if (!match) return null;
  const { weapons } = weaponScope(match[1]);
  if (weapons.length !== 1) return null;
  return { weaponType: weapons[0], rarityPerRank: Number(match[2]) };
}

/**
 * Phrases that make an effect situational: a stance, a facing, a time of day.
 * A weapon scope ("For Bow weapons:") is not one of these: it narrows which
 * weapons the bonus covers, but the bonus always applies to those weapons.
 */
const CONDITION_WORDS =
  /\b(without|while|when|whenever|if|during|against|doubled|at night|in battle|once per|after|per round|equipped|from their front|in [A-Z][a-z]+ dungeons)\b/i;

/**
 * Per-rank stat changes stated as `... by [up to] SR [* n][%]`.
 *
 * Two shapes appear: `<verb> <subject> by SR * n` and, for resources,
 * `<verb> SR * n <stat>` ("gain SR * 1 Armor"). A bare `SR` means one per rank.
 */
function parseModifiers(effect) {
  const found = [];
  const unmapped = [];

  const record = (verb, rawSubject, amount, percent, phrase) => {
    const subject = rawSubject.replace(/^(?:the|a|an)\s+/i, '').trim();
    const stats = resolveStats(subject);
    if (!stats) {
      unmapped.push(phrase);
      return;
    }
    const scope = weaponScope(effect);
    for (const stat of stats) {
      found.push({
        stat,
        ...(stat === 'elementAtk' ? { element: elementIn(subject) } : {}),
        direction: INCREASE.test(verb) ? 'increase' : 'reduce',
        perRank: amount,
        unit: percent ? 'percent' : 'flat',
        subject,
        // Dizzy drains the *target's* FP; a build must not credit that to its own.
        appliesTo: /\btarget'?s?\b|\benem(y|ies)'?s?\b/i.test(subject) ? 'enemy' : 'self',
        ...(scope.weapons.length ? { weapons: scope.weapons } : {}),
        ...(scope.weaponSubtypes.length ? { weaponSubtypes: scope.weaponSubtypes } : {}),
        conditional: CONDITION_WORDS.test(effect),
      });
    }
  };

  // `<verb> <subject> by SR * n`. The subject may not itself contain "by", or a
  // clause whose verb precedes its subject ("Power increases by SR * 1") would
  // be swallowed whole as one nonsense subject.
  const byPattern =
    /(increas\w*|rais\w*|boost\w*|improv\w*|add\w*|gain\w*|grant\w*|restor\w*|recover\w*|reduc\w*|decreas\w*|lower\w*)\s+((?:(?!\bby\b)[^.;:])+?)\s+by\s+(?:up to\s+)?SR(?:\s*\*\s*(\d+(?:\.\d+)?))?\s*(%?)/gi;
  /*
   * Spans this pattern consumed, so the conjunction pass below cannot re-read a
   * clause already banked. "increases Armor and Magic Armor by SR * 1" resolves
   * to both stats from one match; without this the trailing "and Magic Armor by
   * SR * 1" matched a second time and Magic Armor was counted twice.
   */
  const claimed = [];
  for (const match of effect.matchAll(byPattern)) {
    claimed.push([match.index, match.index + match[0].length]);
    record(match[1], match[2], match[3] === undefined ? 1 : Number(match[3]), Boolean(match[4]), match[0]);
  }

  // `<subject> increases by SR * n`: the same claim with the verb after its
  // subject, which the wiki uses when a condition leads the sentence.
  const subjectFirstPattern =
    /([A-Za-z][A-Za-z' ]*?)\s+(increases?|decreases?|reduces?|lowers?)\s+by\s+(?:up to\s+)?SR(?:\s*\*\s*(\d+(?:\.\d+)?))?\s*(%?)/gi;
  for (const match of effect.matchAll(subjectFirstPattern)) {
    record(match[2], match[1], match[3] === undefined ? 1 : Number(match[3]), Boolean(match[4]), match[0]);
  }

  // `… and <subject> by SR * n`: a second claim sharing the first clause's
  // verb ("increases Critical by SR * 1.5 and Critical Damage by SR * 0.5%").
  // A subject that starts with its own verb is already covered above.
  const conjunctionPattern =
    /\band\s+((?:(?!\bby\b)[^.;:])+?)\s+by\s+(?:up to\s+)?SR(?:\s*\*\s*(\d+(?:\.\d+)?))?\s*(%?)/gi;
  for (const match of effect.matchAll(conjunctionPattern)) {
    if (claimed.some(([start, end]) => match.index >= start && match.index < end)) continue;
    if (/^(increas|rais|boost|improv|add|gain|grant|restor|recover|reduc|decreas|lower)/i.test(match[1])) continue;
    const inheritedVerb = effect
      .slice(0, match.index)
      .match(/(increas\w*|rais\w*|boost\w*|improv\w*|add\w*|gain\w*|grant\w*|restor\w*|recover\w*|reduc\w*|decreas\w*|lower\w*)(?![\s\S]*\b(?:increas|rais|boost|improv|add|gain|grant|restor|recover|reduc|decreas|lower)\w*)/i);
    if (!inheritedVerb) continue;
    record(inheritedVerb[1], match[1], match[2] === undefined ? 1 : Number(match[2]), Boolean(match[3]), match[0]);
  }

  const resourcePattern =
    /(gain|recover|restore)s?\s+SR\s*\*\s*(\d+(?:\.\d+)?)\s*(%?)\s+([A-Za-z][A-Za-z ]*?)(?=\s+(?:when|until|while|per|from|for)\b|[.,;]|$)/gi;
  for (const match of effect.matchAll(resourcePattern)) {
    record(match[1], match[4], Number(match[2]), Boolean(match[3]), match[0]);
  }

  return { modifiers: found, unmapped };
}

/* -------------------------------------------------------------------- build */

const unmappedReport = [];

const categories = raw.categories.map(category => ({
  id: kebab(category.title),
  name: category.title,
}));

const talents = raw.categories.flatMap(category =>
  category.talents.map(talent => {
    const talentId = kebab(talent.name);
    return {
      id: talentId,
      name: talent.name,
      category: category.title,
      categoryId: kebab(category.title),
      spPerRank: talent.spPerRank,
      maxRanks: talent.maxRanks,
      maxSp: talent.maxSp,
      subtalents: talent.subtalents.map(sub => {
        const { modifiers, unmapped } = parseModifiers(sub.effect);
        const weaponAccess = parseWeaponAccess(sub.effect);
        const scope = weaponScope(sub.effect);
        for (const phrase of unmapped) unmappedReport.push(`${talent.name} / ${sub.name}: ${phrase}`);
        return {
          id: `${talentId}/${kebab(sub.name)}`,
          name: sub.name,
          maxSr: sub.maxSr,
          effect: sub.effect,
          ...(weaponAccess ? { weaponAccess } : {}),
          ...(scope.weapons.length ? { weapons: scope.weapons } : {}),
          ...(scope.weaponSubtypes.length ? { weaponSubtypes: scope.weaponSubtypes } : {}),
          modifiers,
          links: sub.links,
        };
      }),
    };
  }),
);

/*
 * The intro states the budget in prose. It is pulled out here so the calculator
 * can cap talent spending without a second source: 60 points from levels, plus
 * 5 from Legend Extension, and at most 10 ranks in any one talent.
 */
const budget = {
  pointsFromLevels: Number(raw.intro.match(/maximum equal to (\d+)/i)?.[1] ?? 60),
  legendExtensionPoints: Number(raw.intro.match(/plus (\d+) through Legend Extension/i)?.[1] ?? 5),
  maxRanksPerTalent: Number(raw.intro.match(/maximum of (\d+) points can be placed in a talent/i)?.[1] ?? 10),
};

const payload = {
  schemaVersion: 1,
  source: raw.source,
  scraped: raw.scraped,
  confidence: 'community',
  budget,
  categories,
  talents,
};
await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

/* -------------------------------------------------- knowledge base markdown */

const subtalents = talents.flatMap(talent => talent.subtalents.map(sub => ({ talent, sub })));
const access = subtalents.filter(entry => entry.sub.weaponAccess);
const withModifiers = subtalents.filter(entry => entry.sub.modifiers.length);
const unconditional = withModifiers.filter(entry => entry.sub.modifiers.some(mod => !mod.conditional));

const knowledge = [
  '# Talent catalog',
  '',
  `Generated by \`scripts/build-talent-data.mjs\` from the scraped wiki catalog. Edit the script or rescrape, not this file. Scraped: ${raw.scraped}. Source: [Talents](${raw.source}). Confidence: \`community\`.`,
  '',
  '## Budget',
  '',
  `- ${budget.pointsFromLevels + budget.legendExtensionPoints} ranks to spend in total (${budget.pointsFromLevels} from levels plus ${budget.legendExtensionPoints} from Legend Extension). The calculator budgets the full figure rather than the level's share, because a sheet is used to plan a finished character.`,
  `- At most ${budget.maxRanksPerTalent} ranks in any one talent; a rank grants one subpoint and costs that talent's SP per Rank.`,
  '- Ranks and SP are different units. The budget bounds **ranks**; SP is what those ranks bill at a rate that differs per talent, so an SP total is not comparable to the pool.',
  '- Subpoints are spent inside the talent that granted them and cannot be moved without a Fruit of Talentlessness.',
  '',
  '## What this supports',
  '',
  '- Weapon access beyond a class roster: an Adaptation rank unlocks any weapon of its type up to a Rarity cap.',
  '- Per-rank stat modifiers (Hit, Critical, Power, Battle Weight, FP and elemental ATK) with the weapon types they cover.',
  '- Whether a modifier is unconditional or fires only in a stance, facing, or time of day.',
  '',
  '## What this does not support',
  '',
  '- Interactions between talents and skills: the wiki states none.',
  '- Non-combat subtalents (Cooking, Security, Harvest…) are carried as prose only; they have no calculator effect.',
  '- Do not infer a number for a subtalent whose text is qualitative ("based on SR").',
  '',
  '## Weapon access (Adaptation)',
  '',
  '| Talent | Subtalent | Weapon | Max rarity |',
  '| --- | --- | --- | --- |',
  ...access.map(({ talent, sub }) =>
    `| ${talent.name} | ${sub.name} | ${sub.weaponAccess.weaponType} | SR × ${sub.weaponAccess.rarityPerRank} (${sub.maxSr * sub.weaponAccess.rarityPerRank} at SR ${sub.maxSr}) |`),
  '',
  '## Unconditional combat modifiers',
  '',
  '| Talent | Subtalent | Max SR | Effect |',
  '| --- | --- | --- | --- |',
  ...unconditional.map(({ talent, sub }) => `| ${talent.name} | ${sub.name} | ${sub.maxSr} | ${sub.effect.replace(/\|/g, '\\|')} |`),
  '',
  ...raw.categories.map(category => [
    `## ${category.title}`,
    '',
    ...talents.filter(talent => talent.category === category.title).flatMap(talent => [
      `### ${talent.name}: ${talent.spPerRank} SP/rank, max ${talent.maxRanks} ranks (${talent.maxSp} SP)`,
      '',
      '| Subtalent | Max SR | Effect |',
      '| --- | --- | --- |',
      ...talent.subtalents.map(sub => `| ${sub.name} | ${sub.maxSr} | ${sub.effect.replace(/\|/g, '\\|')} |`),
      '',
    ]),
  ].join('\n')),
].join('\n');
await writeFile(KNOWLEDGE_OUT, `${knowledge}\n`, 'utf8');

console.log(`Wrote ${path.relative(process.cwd(), OUT)}: ${talents.length} talents, ${subtalents.length} subtalents.`);
console.log(`  ${access.length} weapon-access unlocks, ${withModifiers.length} subtalents with parsed modifiers.`);
console.log(`Wrote ${path.relative(process.cwd(), KNOWLEDGE_OUT)}.`);

if (REPORT) {
  console.log(`\n${unmappedReport.length} per-rank phrases left as prose (no stat the calculator models):`);
  for (const line of unmappedReport) console.log(`  - ${line}`);
}
