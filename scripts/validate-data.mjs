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
const weaponTypes = new Set();
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
    if (typeof weapon?.weaponType === 'string') weaponTypes.add(weapon.weaponType);
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
    if (weapon?.optimizationPolicy !== undefined) {
      const policy = weapon.optimizationPolicy;
      if (!isRecord(policy)) fail(`${location}.optimizationPolicy`, 'expected an object');
      else {
        if (!['allowed', 'explicit-opt-in'].includes(policy.automaticRecommendation)) fail(`${location}.optimizationPolicy.automaticRecommendation`, 'expected allowed or explicit-opt-in');
        if (typeof policy.restriction !== 'string' || !policy.restriction.trim()) fail(`${location}.optimizationPolicy.restriction`, 'expected a non-empty string');
        if (policy.optInTerms !== undefined && (!Array.isArray(policy.optInTerms) || policy.optInTerms.some((term) => typeof term !== 'string' || !term.trim()))) fail(`${location}.optimizationPolicy.optInTerms`, 'expected non-empty strings');
      }
    }
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

/*
 * Hands, shields, legs and accessories.
 *
 * Names are the key a build equips by, and they share a namespace with armour
 * (`GEAR` and `ARMORS` are looked up the same way), so a duplicate across
 * either would make one item unreachable.
 */
const GEAR_GROUPS = ['Hands', 'Shield', 'Legs', 'Accessory'];
const gearData = await readJson('gear.json');
const gearIds = new Set();
let gearCount = 0;
for (const group of GEAR_GROUPS) {
  const records = gearData[group];
  if (!Array.isArray(records)) {
    fail(`gear.json.${group}`, 'expected an array');
    continue;
  }
  records.forEach((item, index) => {
    const location = `gear.json.${group}[${index}]`;
    gearCount += 1;
    if (!item?.id || typeof item.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
    else if (gearIds.has(item.id)) fail(`${location}.id`, `duplicate gear ID "${item.id}"`);
    else gearIds.add(item.id);
    if (!item?.name || typeof item.name !== 'string') fail(`${location}.name`, 'expected a non-empty string');
    else if (armorNames.has(item.name)) fail(`${location}.name`, `name "${item.name}" collides with an armour`);
    else armorNames.add(item.name);
    if (typeof item?.rarity !== 'number' || !Number.isFinite(item.rarity)) fail(`${location}.rarity`, 'expected a finite number');
    if (item?.slot !== (group === 'Legs' ? 4 : group === 'Accessory' ? 5 : 3)) {
      fail(`${location}.slot`, `slot ${String(item?.slot)} does not match group ${group}`);
    }
    // The effect text is the whole record for these slots; an item without any
    // has nothing to contribute and should have been dropped at build time.
    if (!Array.isArray(item?.specialEffects) || !item.specialEffects.length) {
      fail(`${location}.specialEffects`, 'expected at least one effect line');
    }
    if (typeof item?.details !== 'string' || !item.details.trim()) fail(`${location}.details`, 'expected non-empty effect text');
  });
}

/*
 * Equipment sets. Members are names the calculator equips by, so a member that
 * matches nothing is a set piece nobody can wear; a threshold above the member
 * count is one that can never trigger.
 */
const itemSets = await readJson('item-sets.json');
let setCount = 0;
for (const [name, set] of Object.entries(itemSets)) {
  const at = `item-sets.json.${name}`;
  setCount += 1;
  if (!Array.isArray(set.members) || set.members.length === 0) {
    fail(`${at}.members`, 'expected at least one member');
  } else {
    // `armorNames` has absorbed the gear names above, so it covers slots 2-6.
    for (const member of set.members) {
      if (!armorNames.has(member) && !weaponNames.has(member)) {
        fail(`${at}.members`, `no equippable item named "${member}"`);
      }
    }
  }
  if (!Array.isArray(set.thresholds)) {
    fail(`${at}.thresholds`, 'expected an array');
  } else {
    for (const threshold of set.thresholds) {
      if (!Number.isInteger(threshold.count) || threshold.count < 2) {
        fail(`${at}.thresholds`, `implausible piece count ${String(threshold.count)}`);
      }
      if (typeof threshold.description !== 'string' || !threshold.description.trim()) {
        fail(`${at}.thresholds`, 'expected description text');
      }
    }
  }
  if (!set.thresholds.length && !set.note) fail(at, 'has neither thresholds nor a note');
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

const statusCatalog = await readJson('statuses.json');
if (statusCatalog.schemaVersion !== 1) fail('statuses.json.schemaVersion', 'only schema version 1 is supported');
const statusIds = new Set();
for (const [index, status] of (statusCatalog.statuses ?? []).entries()) {
  const location = `statuses.json.statuses[${index}] (${status?.name ?? 'unnamed'})`;
  if (!status?.id || typeof status.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
  else if (statusIds.has(status.id)) fail(`${location}.id`, `duplicate status ID "${status.id}"`);
  else statusIds.add(status.id);
  if (!status?.name || typeof status.name !== 'string') fail(`${location}.name`, 'expected a name');
  if (!status?.category || typeof status.category !== 'string') fail(`${location}.category`, 'expected a category');
  if (!Array.isArray(status.immuneRaces)) fail(`${location}.immuneRaces`, 'expected an array');
  // Immunities must reference races the calculator actually models; anything
  // else belongs in `otherImmune`, where it stays visible as prose.
  else for (const race of status.immuneRaces) {
    if (!races.races?.[race] && !races.subraces?.[race]) fail(`${location}.immuneRaces`, `unknown race "${race}"`);
  }
  if (status.recoveryImmunityRounds !== undefined && (!Number.isInteger(status.recoveryImmunityRounds) || status.recoveryImmunityRounds <= 0)) {
    fail(`${location}.recoveryImmunityRounds`, 'expected a positive integer when present');
  }
  if (typeof status.protectionIgnoring !== 'boolean') fail(`${location}.protectionIgnoring`, 'expected a boolean');
  if (typeof status.perRound !== 'boolean') fail(`${location}.perRound`, 'expected a boolean');
}

const talentCatalog = await readJson('talents.json');
if (talentCatalog.schemaVersion !== 1) fail('talents.json.schemaVersion', 'only schema version 1 is supported');
const TALENT_STATS = new Set([
  'hit', 'critical', 'criticalDamage', 'criticalChance', 'power', 'scaledWeaponAtk',
  'battleWeight', 'maxBattleWeight', 'closeRangeHitPenalty', 'attackRange', 'farshotRange',
  'maxFp', 'fpRegen', 'fpCost', 'fp', 'hp',
  'armor', 'magicArmor', 'elementAtk', 'statusInfliction', 'skillPool',
  'durabilityConsumption', 'itemBelt', 'carryingCapacity',
]);
const talentCategoryIds = new Set((talentCatalog.categories ?? []).map((category) => category.id));
const talentIds = new Set();
const subtalentIds = new Set();
for (const [index, talent] of (talentCatalog.talents ?? []).entries()) {
  const location = `talents.json.talents[${index}] (${talent?.name ?? 'unnamed'})`;
  if (!talent?.id || typeof talent.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
  else if (talentIds.has(talent.id)) fail(`${location}.id`, `duplicate talent ID "${talent.id}"`);
  else talentIds.add(talent.id);
  if (!talentCategoryIds.has(talent?.categoryId)) fail(`${location}.categoryId`, `unknown category "${talent?.categoryId}"`);
  for (const key of ['spPerRank', 'maxRanks', 'maxSp']) {
    if (typeof talent?.[key] !== 'number' || !Number.isFinite(talent[key]) || talent[key] <= 0) fail(`${location}.${key}`, 'expected a positive number');
  }
  // The wiki states max SP as SP per rank times max ranks; a mismatch means one
  // of the two tables it is read from moved.
  if (Math.abs(talent.spPerRank * talent.maxRanks - talent.maxSp) > 1e-6) fail(`${location}.maxSp`, `expected ${talent.spPerRank} x ${talent.maxRanks}, got ${talent.maxSp}`);
  if (!Array.isArray(talent?.subtalents) || !talent.subtalents.length) fail(`${location}.subtalents`, 'expected at least one subtalent');
  for (const [subIndex, sub] of (talent.subtalents ?? []).entries()) {
    const subLocation = `${location}.subtalents[${subIndex}] (${sub?.name ?? 'unnamed'})`;
    if (!sub?.id || typeof sub.id !== 'string') fail(`${subLocation}.id`, 'expected a stable ID');
    else if (subtalentIds.has(sub.id)) fail(`${subLocation}.id`, `duplicate subtalent ID "${sub.id}"`);
    else subtalentIds.add(sub.id);
    if (!Number.isInteger(sub?.maxSr) || sub.maxSr <= 0) fail(`${subLocation}.maxSr`, 'expected a positive integer');
    if (typeof sub?.effect !== 'string' || !sub.effect.trim()) fail(`${subLocation}.effect`, 'expected the wiki effect text');
    // A weapon a talent unlocks must be a type the calculator actually stocks,
    // or the unlock silently grants access to nothing.
    if (sub?.weaponAccess !== undefined) {
      if (!weaponTypes.has(sub.weaponAccess?.weaponType)) fail(`${subLocation}.weaponAccess.weaponType`, `unknown weapon type "${sub.weaponAccess?.weaponType}"`);
      if (typeof sub.weaponAccess?.rarityPerRank !== 'number' || sub.weaponAccess.rarityPerRank <= 0) fail(`${subLocation}.weaponAccess.rarityPerRank`, 'expected a positive number');
    }
    for (const type of sub?.weapons ?? []) if (!weaponTypes.has(type)) fail(`${subLocation}.weapons`, `unknown weapon type "${type}"`);
    if (!Array.isArray(sub?.modifiers)) fail(`${subLocation}.modifiers`, 'expected an array');
    for (const [modIndex, modifier] of (sub.modifiers ?? []).entries()) {
      const modLocation = `${subLocation}.modifiers[${modIndex}]`;
      if (!TALENT_STATS.has(modifier?.stat)) fail(`${modLocation}.stat`, `unsupported stat "${modifier?.stat}"`);
      if (!['increase', 'reduce'].includes(modifier?.direction)) fail(`${modLocation}.direction`, 'expected increase or reduce');
      if (!['flat', 'percent'].includes(modifier?.unit)) fail(`${modLocation}.unit`, 'expected flat or percent');
      if (!['self', 'enemy'].includes(modifier?.appliesTo)) fail(`${modLocation}.appliesTo`, 'expected self or enemy');
      if (typeof modifier?.perRank !== 'number' || !Number.isFinite(modifier.perRank) || modifier.perRank <= 0) fail(`${modLocation}.perRank`, 'expected a positive number');
      if (typeof modifier?.conditional !== 'boolean') fail(`${modLocation}.conditional`, 'expected a boolean');
      for (const type of modifier?.weapons ?? []) if (!weaponTypes.has(type)) fail(`${modLocation}.weapons`, `unknown weapon type "${type}"`);
    }
  }
}
for (const key of ['pointsFromLevels', 'legendExtensionPoints', 'maxRanksPerTalent']) {
  if (!Number.isInteger(talentCatalog.budget?.[key]) || talentCatalog.budget[key] <= 0) fail(`talents.json.budget.${key}`, 'expected a positive integer');
}

const optimizerKnowledge = await readJson('optimizer-knowledge.json');
if (optimizerKnowledge.schemaVersion !== 1) fail('optimizer-knowledge.json.schemaVersion', 'only schema version 1 is supported');
for (const [index, archetype] of (optimizerKnowledge.archetypes ?? []).entries()) {
  const location = `optimizer-knowledge.json.archetypes[${index}]`;
  if (!archetype?.id || typeof archetype.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
  if (!['tank', 'evade', 'bruiser', 'hybrid', 'glass'].includes(archetype?.defensePlan)) fail(`${location}.defensePlan`, 'unsupported defense plan');
}
for (const [index, evidence] of (optimizerKnowledge.classPairEvidence ?? []).entries()) {
  const location = `optimizer-knowledge.json.classPairEvidence[${index}]`;
  if (!classes.classes?.[evidence.mainClass]) fail(`${location}.mainClass`, `unknown class "${evidence.mainClass}"`);
  if (!classes.classes?.[evidence.subClass]) fail(`${location}.subClass`, `unknown class "${evidence.subClass}"`);
  if (!profileIds.has(evidence.profileId)) fail(`${location}.profileId`, `unknown profile "${evidence.profileId}"`);
  if (!Array.isArray(evidence.tags) || evidence.tags.some((tag) => typeof tag !== 'string')) fail(`${location}.tags`, 'expected an array of strings');
}
for (const [index, rule] of (optimizerKnowledge.rules ?? []).entries()) {
  const location = `optimizer-knowledge.json.rules[${index}]`;
  if (!rule?.id || typeof rule.id !== 'string') fail(`${location}.id`, 'expected a stable ID');
  if (!rule?.statement || typeof rule.statement !== 'string') fail(`${location}.statement`, 'expected a statement');
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

/*
 * Skills are generated by scripts/build-skill-data.mjs, so these checks guard
 * against a bad regeneration rather than a typo: ids must stay unique because
 * saved builds key their ranks by id, and every per-rank array has to cover the
 * skill's ranks or a lookup silently returns nothing.
 */
const SKILL_CATEGORIES = new Set(['Offensive', 'Defensive', 'Support', 'Utility', 'Passive', 'Innate', 'Formation']);
const SKILL_SOURCES = new Set(['weapon', 'element', 'stat', 'flat', 'heal']);
const ELEMENT_KEYS = new Set(['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound']);
/** Matches `SkillEffect['kind']` in src/types.ts. */
const SKILL_EFFECT_KINDS = new Set(['stat', 'derived', 'element']);

const skillData = await readJson('skills.json');
const skillText = await readJson('skills-text.json');
const skillIds = new Set();
const textIds = new Set(Array.isArray(skillText.text) ? skillText.text.map((entry) => entry.id) : []);

if (!Array.isArray(skillData.skills)) fail('skills.json.skills', 'expected an array');
else for (const [index, skill] of skillData.skills.entries()) {
  const at = `skills.json[${index}] (${skill?.name ?? 'unnamed'})`;
  if (!skill?.id || typeof skill.id !== 'string') fail(`${at}.id`, 'expected a stable ID');
  else if (skillIds.has(skill.id)) fail(`${at}.id`, `duplicate skill ID "${skill.id}"`);
  else skillIds.add(skill.id);
  if (!skill?.name) fail(`${at}.name`, 'expected a non-empty string');
  if (!SKILL_CATEGORIES.has(skill?.category)) fail(`${at}.category`, `unsupported category "${skill?.category}"`);
  if (!Number.isInteger(skill?.maxRank) || skill.maxRank < 1) fail(`${at}.maxRank`, 'expected a positive integer');
  if (!Array.isArray(skill?.classes) || skill.classes.length === 0) fail(`${at}.classes`, 'expected at least one class');
  else for (const className of skill.classes) {
    if (!classes.classes[className]) fail(`${at}.classes`, `unknown class "${className}"`);
  }
  if (skill?.fpByRank != null && (!Array.isArray(skill.fpByRank) || skill.fpByRank.length < skill.maxRank)) {
    fail(`${at}.fpByRank`, `expected null or at least ${skill.maxRank} entries`);
  }
  for (const [termIndex, term] of (skill?.scaling ?? []).entries()) {
    const termAt = `${at}.scaling[${termIndex}]`;
    if (!SKILL_SOURCES.has(term?.source)) fail(`${termAt}.source`, `unsupported source "${term?.source}"`);
    if (term?.element != null && !ELEMENT_KEYS.has(term.element)) fail(`${termAt}.element`, `unknown element "${term.element}"`);
    if (!Array.isArray(term?.percentByRank) || term.percentByRank.length < skill.maxRank) {
      fail(`${termAt}.percentByRank`, `expected at least ${skill.maxRank} entries`);
    }
  }
  for (const [effectIndex, effect] of (skill?.effects ?? []).entries()) {
    const effectAt = `${at}.effects[${effectIndex}]`;
    if (!SKILL_EFFECT_KINDS.has(effect?.kind)) fail(`${effectAt}.kind`, `expected one of ${[...SKILL_EFFECT_KINDS].map((k) => `"${k}"`).join(', ')}`);
    if (effect?.kind === 'stat' && !STAT_KEYS.has(effect.key)) fail(`${effectAt}.key`, `unknown stat "${effect.key}"`);
    // An element effect is a flat addition to one element's attack, so its key
    // has to be an element the calculator actually tracks.
    if (effect?.kind === 'element' && !ELEMENT_KEYS.has(effect.key)) fail(`${effectAt}.key`, `unknown element "${effect.key}"`);
    if (effect?.applies !== 'always' && effect?.applies !== 'conditional') fail(`${effectAt}.applies`, 'expected "always" or "conditional"');
    if (!Array.isArray(effect?.valueByRank) || effect.valueByRank.length < skill.maxRank) {
      fail(`${effectAt}.valueByRank`, `expected at least ${skill.maxRank} entries`);
    }
  }
  if (!textIds.has(skill?.id)) fail(`${at}.id`, 'has no matching entry in skills-text.json');
}

/*
 * Prerequisites are checked after every id is known, because they point both
 * ways through an alphabetically sorted list: Install requires Sync-Mind,
 * which sorts after it.
 */
for (const [index, skill] of (skillData.skills ?? []).entries()) {
  for (const [requireIndex, requirement] of (skill?.requires ?? []).entries()) {
    const at = `skills.json[${index}] (${skill?.name ?? 'unnamed'}).requires[${requireIndex}]`;
    if (!skillIds.has(requirement?.id)) fail(`${at}.id`, `unknown skill "${requirement?.id}"`);
    if (requirement?.id === skill.id) fail(`${at}.id`, 'a skill cannot require itself');
    if (!Number.isInteger(requirement?.rank) || requirement.rank < 1) fail(`${at}.rank`, 'expected a rank of at least 1');
  }
}

/*
 * Youkai skills are positional: slot 0 is the Evoke-Active, slot 1 the
 * Evoke-Passive and slot 2 the Main skill, which is what Sync-Mind and Install
 * key off. A Youkai with the wrong number or order of skills would hand the
 * player the wrong abilities, so the shape is checked rather than trusted.
 */
const YOUKAI_SLOTS = ['evoke-active', 'evoke-passive', 'main'];
const youkaiData = await readJson('youkai.json');
const youkaiIds = new Set();
const ascendedYoukai = [];
const affinitySkills = new Set(skillData.skills.filter((skill) => skill.id.startsWith('affinity-')).map((skill) => skill.id));

if (!Array.isArray(youkaiData.youkai)) fail('youkai.json.youkai', 'expected an array');
else for (const [index, youkai] of youkaiData.youkai.entries()) {
  const at = `youkai.json[${index}] (${youkai?.name ?? 'unnamed'})`;
  if (!youkai?.id || typeof youkai.id !== 'string') fail(`${at}.id`, 'expected a stable ID');
  else if (youkaiIds.has(youkai.id)) fail(`${at}.id`, `duplicate youkai ID "${youkai.id}"`);
  else youkaiIds.add(youkai.id);
  if (youkai?.baseFormId !== null && typeof youkai?.baseFormId !== 'string') {
    fail(`${at}.baseFormId`, 'expected a base Youkai id or null');
  } else if (youkai?.baseFormId) ascendedYoukai.push({ at, youkai });
  if (!youkai?.race) fail(`${at}.race`, 'expected a race');
  // Every race needs its Affinity skill, or its growth bonus can never apply.
  else if (!affinitySkills.has(`affinity-${youkai.race.toLowerCase()}`)) {
    fail(`${at}.race`, `no Affinity skill exists for race "${youkai.race}"`);
  }
  validateStatRecord(youkai?.stats, `${at}.stats`, true);
  validateStatRecord(youkai?.statsLv1, `${at}.statsLv1`, true);

  if (!Array.isArray(youkai?.skills) || youkai.skills.length !== YOUKAI_SLOTS.length) {
    fail(`${at}.skills`, `expected exactly ${YOUKAI_SLOTS.length} skills`);
    continue;
  }
  youkai.skills.forEach((skill, slotIndex) => {
    const skillAt = `${at}.skills[${slotIndex}]`;
    if (skill?.slot !== YOUKAI_SLOTS[slotIndex]) fail(`${skillAt}.slot`, `expected "${YOUKAI_SLOTS[slotIndex]}"`);
    if (!skill?.name) fail(`${skillAt}.name`, 'expected a non-empty string');
    if (typeof skill?.passive !== 'boolean') fail(`${skillAt}.passive`, 'expected a boolean');
    if (!skill?.passive && (typeof skill?.fp !== 'number' || skill.fp <= 0)) {
      fail(`${skillAt}.fp`, 'an active skill needs a positive FP cost');
    }
  });
}
for (const { at, youkai } of ascendedYoukai) {
  const base = youkaiData.youkai.find((candidate) => candidate?.id === youkai.baseFormId);
  if (!base) fail(`${at}.baseFormId`, `unknown base Youkai "${youkai.baseFormId}"`);
  else if (base.race !== youkai.race) fail(`${at}.baseFormId`, 'ascended and base forms must share a race');
  if (base?.baseFormId) fail(`${at}.baseFormId`, 'an ascended form cannot point at another ascended form');
}

/*
 * Racial skills carry no rank or numeric effect by design: the wiki writes
 * their effects as prose. What must hold is that every skill points at subraces
 * the calculator can actually select, or it would never be shown to anyone.
 */
const racialData = await readJson('racial-skills.json');
const racialIds = new Set();
const knownSubraces = new Set(Object.keys(races.subraces));

if (!Array.isArray(racialData.racialSkills)) fail('racial-skills.json.racialSkills', 'expected an array');
else for (const [index, skill] of racialData.racialSkills.entries()) {
  const at = `racial-skills.json[${index}] (${skill?.name ?? 'unnamed'})`;
  if (!skill?.id) fail(`${at}.id`, 'expected a stable ID');
  else if (racialIds.has(skill.id)) fail(`${at}.id`, `duplicate racial skill ID "${skill.id}"`);
  else racialIds.add(skill.id);
  if (!skill?.name) fail(`${at}.name`, 'expected a non-empty string');
  if (typeof skill?.passive !== 'boolean') fail(`${at}.passive`, 'expected a boolean');
  if (!Array.isArray(skill?.subraces)) fail(`${at}.subraces`, 'expected an array');
  else for (const subrace of skill.subraces) {
    if (!knownSubraces.has(subrace)) fail(`${at}.subraces`, `unknown subrace "${subrace}"`);
  }
}

/*
 * Armour materials and enchantments are parsed out of wiki prose, so the risk is
 * a mis-read number rather than a missing one. Bounds catch the obvious failures:
 * a stray decimal or a weapon value leaking into the armour column.
 */
const armorModifiers = await readJson('armor-modifiers.json');
const ARMOR_CHANNELS = new Set([
  'armor', 'magicArmor', 'evade', 'weight', 'hp', 'hpPercent', 'fp',
  'statusResistance', 'critical', 'criticalEvade',
]);
const ARMOR_MAPS = new Set(['stats', 'resistances', 'elementalAttack']);

/**
 * The item kinds a material can be applied to.
 *
 * `other` is the hands/legs/accessory profile. It is a separate kind because a
 * material does something different there than it does on armour, and the wiki
 * states the three separately.
 */
const MATERIAL_KINDS = new Set(['weapon', 'armor', 'other']);

/** Body slots an enchantment can state a separate effect for. Torso is flattened. */
const ENCHANT_SLOTS = new Set(['Hands', 'Legs', 'Accessory', 'Head', 'Feet']);

for (const [group, records] of Object.entries({ materials: armorModifiers.materials, enchantments: armorModifiers.enchantments })) {
  if (!isRecord(records)) { fail(`armor-modifiers.json.${group}`, 'expected an object'); continue; }
  for (const [name, effect] of Object.entries(records)) {
    const at = `armor-modifiers.json.${group}.${name}`;
    if (!isRecord(effect)) { fail(at, 'expected an object'); continue; }
    validateEffectChannels(effect, at, true);
  }
}

/**
 * Checks one effect bag: the numeric channels, the stat/resistance maps and the
 * metadata keys. `allowNested` permits the `other` profile, which carries the
 * same channels one level down and so is validated by the same rules.
 */
function validateEffectChannels(effect, at, allowNested) {
    for (const [key, value] of Object.entries(effect)) {
      if (key === 'other' && allowNested) {
        if (!isRecord(value)) { fail(`${at}.other`, 'expected an object'); continue; }
        if (!Object.keys(value).length) fail(`${at}.other`, 'expected at least one channel');
        validateEffectChannels(value, `${at}.other`, false);
        continue;
      }
      /*
       * Per-slot enchantment effects. The torso is flattened onto the record and
       * every other legal slot sits here, because one enchantment can grant a
       * different magnitude per slot.
       */
      if (key === 'bySlot' && allowNested) {
        if (!isRecord(value)) { fail(`${at}.bySlot`, 'expected an object'); continue; }
        for (const [slot, effect] of Object.entries(value)) {
          if (!ENCHANT_SLOTS.has(slot)) fail(`${at}.bySlot`, `unknown slot "${slot}"`);
          if (!isRecord(effect)) { fail(`${at}.bySlot.${slot}`, 'expected an object'); continue; }
          if (!Object.keys(effect).length) fail(`${at}.bySlot.${slot}`, 'expected at least one channel');
          validateEffectChannels(effect, `${at}.bySlot.${slot}`, false);
        }
        continue;
      }
      if (key === 'slots') {
        if (!Array.isArray(value) || !value.length) fail(`${at}.slots`, 'expected a non-empty array');
        continue;
      }
      if (key === 'appliesTo') {
        if (!Array.isArray(value) || !value.length) fail(`${at}.appliesTo`, 'expected a non-empty array');
        else for (const kind of value) {
          if (!MATERIAL_KINDS.has(kind)) fail(`${at}.appliesTo`, `unknown item kind "${kind}"`);
        }
        continue;
      }
      if (key === 'description') {
        if (typeof value !== 'string' || !value.trim()) fail(`${at}.description`, 'expected non-empty wiki text');
        continue;
      }
      if (key === 'weightMod') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 5) {
          fail(`${at}.weightMod`, `implausible multiplier ${value}`);
        }
        continue;
      }
      if (ARMOR_CHANNELS.has(key)) {
        if (!Number.isInteger(value)) fail(`${at}.${key}`, 'expected an integer');
        else if (Math.abs(value) > 200) fail(`${at}.${key}`, `implausible value ${value}`);
        continue;
      }
      if (ARMOR_MAPS.has(key)) {
        if (!isRecord(value)) { fail(`${at}.${key}`, 'expected an object'); continue; }
        for (const [inner, amount] of Object.entries(value)) {
          if (key === 'stats' && !STAT_KEYS.has(inner)) fail(`${at}.stats`, `unknown stat "${inner}"`);
          if (!Number.isInteger(amount) || Math.abs(amount) > 100) fail(`${at}.${key}.${inner}`, `implausible value ${amount}`);
        }
        continue;
      }
      fail(`${at}.${key}`, 'unsupported channel');
    }
}

const manifest = JSON.parse(await readFile(path.join(root, 'src', 'data', 'game-data.json'), 'utf8'));
if (manifest.schemaVersion !== 1) fail('game-data.json.schemaVersion', 'only schema version 1 is supported');
if (!/^\d{4}\.\d{2}\.\d{2}$/.test(manifest.dataVersion ?? '')) fail('game-data.json.dataVersion', 'expected YYYY.MM.DD');
if (!Array.isArray(manifest.changes) || manifest.changes.length === 0) fail('game-data.json.changes', 'expected at least one player-facing change');

/*
 * The app version lives in app-release.json, which `buildPersistence` reads for
 * APP_VERSION, and again in package.json, which the bundler and any release
 * tooling read. Nothing in the build makes them agree, so they are checked here:
 * a badge reading one version while package.json says another is the kind of
 * thing nobody notices until it is in a screenshot.
 */
const release = JSON.parse(await readFile(path.join(root, 'src', 'data', 'app-release.json'), 'utf8'));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (release.schemaVersion !== 1) fail('app-release.json.schemaVersion', 'only schema version 1 is supported');
if (!/^\d+\.\d+\.\d+$/.test(release.version ?? '')) fail('app-release.json.version', 'expected MAJOR.MINOR.PATCH');
if (!/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt ?? '')) fail('app-release.json.releasedAt', 'expected YYYY-MM-DD');
if (!release.headline) fail('app-release.json.headline', 'expected a one-line summary for the version badge');
if (!Array.isArray(release.notes) || release.notes.length === 0) fail('app-release.json.notes', 'expected at least one release note');
if (release.version !== pkg.version) fail('app-release.json.version', `is ${release.version} but package.json says ${pkg.version}`);

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`App v${release.version} · data ${manifest.dataVersion}`);
console.log(`Data valid: ${weaponCount} weapons, ${armorCount} armors, ${gearCount} gear items, ${setCount} equipment sets, ${skillIds.size} skills, ${racialIds.size} racial skills, ${Object.keys(armorModifiers.materials).length} armor materials, ${Object.keys(armorModifiers.enchantments).length} armor enchantments, ${youkaiIds.size} youkai, ${Object.keys(races.subraces).length} subraces, ${Object.keys(classes.classes).length} classes, ${optimizerProfiles.profiles.length} optimizer profiles (${optimizerProfiles.profiles.filter((profile) => profile.enabled).length} enabled), ${statusIds.size} status effects, ${talentIds.size} talents (${subtalentIds.size} subtalents), and ${optimizerKnowledge.classPairEvidence.length} optimizer evidence records.`);
