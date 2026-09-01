import type {
  BuildState,
  ElementKey,
  OptimizationConstraint,
  OptimizationDefensePlan,
  OptimizationExtraPackage,
  OptimizationMetric,
  OptimizationPreset,
  SkillRanks,
  StatKey,
  Youkai,
  YoukaiSelectionReason,
  PhysicalKey,
} from '../types';
import { effectiveWeaponType } from './equipment';
import { mergeSkillRanks } from './skills';
import { YOUKAI, normalizeYoukaiState, youkaiById, youkaiFamilyId } from './youkai';

type Role =
  | 'damage' | 'healing' | 'control' | 'mobility' | 'defense' | 'evade'
  | 'sustain' | 'status-defense' | 'terrain' | 'spellcasting' | 'basic-attack'
  | 'summon-support' | 'elemental-defense';

interface SkillFit {
  summary: string;
  keys: string[];
  roles?: Role[];
  elements?: ElementKey[];
  weapons?: string[];
  intents?: string[];
  metrics?: OptimizationMetric[];
  defensePlans?: OptimizationDefensePlan[];
  requiresYoukai?: string[];
  condition?: string;
  /** Exact effects are scored by evaluateBuild, so they always establish value. */
  modeled?: boolean;
  stackable?: boolean;
  uncertain?: boolean;
}

interface YoukaiFitProfile {
  active: SkillFit;
  passive: SkillFit;
  main: SkillFit;
}

const fit = (summary: string, keys: string[], options: Omit<SkillFit, 'summary' | 'keys'> = {}): SkillFit => ({
  summary, keys, ...options,
});

/**
 * Curated mechanical intent for each unique contract family. Ascended forms use
 * their base profile because their granted kits are the same; the family rule
 * still prefers the ascended data row and its stronger summon stat line.
 */
export const YOUKAI_FIT_PROFILES: Record<string, YoukaiFitProfile> = {
  apus: {
    active: fit('Light damage supports a Light-focused Evoke kit.', ['damage:Light'], { roles: ['damage'], elements: ['Light'] }),
    passive: fit('Fortune Feather provides broad elemental damage protection.', ['defense:fortune-feather'], { roles: ['elemental-defense'], intents: ['elemental defense', 'resistance', 'survivability'] }),
    main: fit('Floating trades Wind defense for strong Earth resistance.', ['install:floating'], { roles: ['elemental-defense'], elements: ['Earth'], condition: 'Installed; includes a Wind weakness.', modeled: true }),
  },
  hippogriph: {
    active: fit('Mare Wing adds Wind area damage and Air Shaft terrain.', ['damage:Wind', 'terrain:air-shaft'], { roles: ['damage', 'terrain'], elements: ['Wind'], intents: ['airborne', 'air shaft'] }),
    passive: fit('Talon Claw grants +5 Power to Fist attacks.', ['weapon:Fist'], { roles: ['basic-attack'], weapons: ['Fist'], modeled: true }),
    main: fit('Gryphon Hoof supports an Airborne anti-Earth game plan.', ['install:airborne-earth'], { roles: ['elemental-defense', 'mobility'], intents: ['airborne'], condition: 'Only while Airborne.' }),
  },
  'snow-crow': {
    active: fit('Cresyr supplies Ice damage and rewards Ice weakness.', ['damage:Ice'], { roles: ['damage'], elements: ['Ice'] }),
    passive: fit('Snowfall creates Ice Sheets for terrain control.', ['terrain:ice-sheets'], { roles: ['terrain', 'control'], intents: ['ice sheet', 'terrain', 'control'] }),
    main: fit('Ice Armor supplies temporary DEF and Ice resistance.', ['install:ice-armor'], { roles: ['defense', 'elemental-defense'], elements: ['Ice'], condition: 'Activated buff with a Fire weakness.' }),
  },
  suzaku: {
    active: fit("Lord's Flame gives an accurate Fire Evoke attack.", ['damage:Fire'], { roles: ['damage'], elements: ['Fire'] }),
    passive: fit('Seal of the South grants +2 WIL.', ['stat:wil'], { modeled: true }),
    main: fit('Burning Strikes adds level-based Fire damage to basic attacks.', ['install:burning-strikes'], { roles: ['basic-attack', 'damage'], elements: ['Fire'], intents: ['basic attack'] }),
  },
  byakko: {
    active: fit('Thunder Claw converts Lightning ATK into physical damage.', ['damage:Lightning'], { roles: ['damage'], elements: ['Lightning'] }),
    passive: fit('Seal of the West grants +2 STR.', ['stat:str'], { modeled: true }),
    main: fit('Roar supplies a temporary STR buff and Fear pressure.', ['install:roar'], { roles: ['control', 'basic-attack'], intents: ['strength', 'fear', 'basic attack'] }),
  },
  firefox: {
    active: fit('Seeker Flame adds armor-ignoring Fire area pressure.', ['damage:Fire', 'control:seeker-flame'], { roles: ['damage', 'control'], elements: ['Fire'] }),
    passive: fit('Firefall creates Fire-ATK-scaled Cinders while moving.', ['terrain:cinders'], { roles: ['terrain', 'damage'], elements: ['Fire'], intents: ['cinder', 'terrain'] }),
    main: fit('Firebody helps Fire damage pierce resistance.', ['install:fire-pierce'], { roles: ['damage'], elements: ['Fire'] }),
  },
  kerberos: {
    active: fit('Underworld Drain combines Dark area damage with healing.', ['damage:Dark', 'sustain:drain'], { roles: ['damage', 'healing', 'sustain'], elements: ['Dark'], intents: ['healing', 'drain', 'sustain'] }),
    passive: fit('Stalwart Guardian reduces redirected and reflected damage.', ['defense:redirect'], { roles: ['defense'], intents: ['redirect', 'reflect', 'guard'] }),
    main: fit('Guard Dog redirects damage away from nearby allies.', ['install:guard-dog'], { roles: ['defense'], defensePlans: ['tank'], intents: ['protect allies', 'guard'] }),
  },
  kilkenny: {
    active: fit("Cat's Claw deals fixed Slash magic damage and drains FP.", ['control:fp-drain'], { roles: ['damage', 'control'], intents: ['fp drain', 'resource denial'] }),
    passive: fit('Anti-Beast adds damage against Beast-family enemies.', ['matchup:beast'], { roles: ['damage'], intents: ['beast', 'lupine', 'felidae', 'grimalkin'], condition: 'Only against listed races.' }),
    main: fit('Tough Fur trades Water defense for Slash resistance.', ['install:slash-resist'], { roles: ['defense'], intents: ['slash resistance'], condition: 'Installed; includes a Water weakness.' }),
  },
  chun: {
    active: fit('Fire Jet adds line Fire damage and Cinder terrain.', ['damage:Fire', 'terrain:cinders'], { roles: ['damage', 'terrain'], elements: ['Fire'] }),
    passive: fit('Completes Daisangen with Haku and Hatsu to strengthen Dragon Youkai.', ['package:daisangen'], { roles: ['summon-support'], requiresYoukai: ['chun', 'haku', 'hatsu'], modeled: true }),
    main: fit('Fire Scale supplies Fire immunity with an Ice weakness.', ['install:fire-scale'], { roles: ['elemental-defense'], elements: ['Fire'], condition: 'Installed; includes an Ice weakness.' }),
  },
  genbu: {
    active: fit('Sea Sweep supplies Water/Ice area control with push and pull.', ['damage:Water', 'damage:Ice', 'control:forced-move'], { roles: ['damage', 'control'], elements: ['Water', 'Ice'] }),
    passive: fit('Seal of the North grants +2 DEF.', ['stat:def'], { modeled: true }),
    main: fit('Great Tortoise supports a heavy defensive Install.', ['install:great-tortoise'], { roles: ['defense'], defensePlans: ['tank', 'bruiser', 'hybrid'] }),
  },
  haku: {
    active: fit('Ice Jet adds line Ice damage and Ice Sheet terrain.', ['damage:Ice', 'terrain:ice-sheets'], { roles: ['damage', 'terrain'], elements: ['Ice'] }),
    passive: fit('Completes Daisangen with Chun and Hatsu to strengthen Dragon Youkai.', ['package:daisangen'], { roles: ['summon-support'], requiresYoukai: ['chun', 'haku', 'hatsu'], modeled: true }),
    main: fit('Ice Scale supplies Ice immunity with a Fire weakness.', ['install:ice-scale'], { roles: ['elemental-defense'], elements: ['Ice'], condition: 'Installed; includes a Fire weakness.' }),
  },
  hatsu: {
    active: fit('Acid Jet adds line Acid damage and lowers enemy DEF/RES.', ['damage:Acid', 'control:def-res-down'], { roles: ['damage', 'control'], elements: ['Acid'], intents: ['debuff', 'defense reduction'] }),
    passive: fit('Completes Daisangen with Chun and Haku to strengthen Dragon Youkai.', ['package:daisangen'], { roles: ['summon-support'], requiresYoukai: ['chun', 'haku', 'hatsu'], modeled: true }),
    main: fit('Acid Scale supplies Acid immunity with a Water weakness.', ['install:acid-scale'], { roles: ['elemental-defense'], elements: ['Acid'], condition: 'Installed; includes a Water weakness.' }),
  },
  jhunn: {
    active: fit('Flame Jetwing combines Fire line damage, movement, and Cinders.', ['damage:Fire', 'mobility:line', 'terrain:cinders'], { roles: ['damage', 'mobility', 'terrain'], elements: ['Fire'] }),
    passive: fit('Lightweight Body reduces Battle Weight.', ['utility:battle-weight'], { roles: ['mobility'], intents: ['battle weight', 'lightweight'] }),
    main: fit('Fire Scale supplies Fire immunity with an Ice weakness.', ['install:fire-scale'], { roles: ['elemental-defense'], elements: ['Fire'], condition: 'Installed; includes an Ice weakness.' }),
  },
  seiryuu: {
    active: fit('Hunter Wind supplies Wind damage and Hunted damage amplification.', ['damage:Wind', 'control:hunted'], { roles: ['damage', 'control'], elements: ['Wind'], intents: ['hunted', 'damage amplification'] }),
    passive: fit('Seal of the East grants +2 CEL.', ['stat:cel'], { modeled: true }),
    main: fit('Dragonscale grants +5 DEF and +10 Critical Evade.', ['install:dragonscale'], { roles: ['defense'], modeled: true }),
  },
  asrai: {
    active: fit('Paraeta combines Water damage with self-healing.', ['damage:Water', 'sustain:heal'], { roles: ['damage', 'healing', 'sustain'], elements: ['Water'], intents: ['healing', 'sustain'] }),
    passive: fit('Fairy Ring adds stackable luck-status resistance.', ['status:fairy-ring'], { roles: ['status-defense'], metrics: ['luckStatusPercent'], modeled: true, stackable: true }),
    main: fit('Aquae Crista trades Fire defense for strong Water resistance.', ['install:water-resist'], { roles: ['elemental-defense'], elements: ['Water'], condition: 'Installed; includes a Fire weakness.', modeled: true }),
  },
  izabe: {
    active: fit('Fairy Lance supplies long-range Light line damage.', ['damage:Light'], { roles: ['damage'], elements: ['Light'] }),
    passive: fit('Fairy Ring adds stackable luck-status resistance.', ['status:fairy-ring'], { roles: ['status-defense'], metrics: ['luckStatusPercent'], modeled: true, stackable: true }),
    main: fit('Radiant Roa supports nearby allies with FAI and RES.', ['install:radiant-roa'], { roles: ['defense', 'summon-support'], intents: ['support', 'allies', 'faith'] }),
  },
  'kasa-obake': {
    active: fit('Umbrella Flap adds close Wind area damage and Aero Shift terrain.', ['damage:Wind', 'terrain:aero-shift'], { roles: ['damage', 'terrain'], elements: ['Wind'] }),
    passive: fit('Disturbing Presence penalizes nearby enemy Hit, Evade, and Critical.', ['control:disturbing-presence'], { roles: ['control', 'defense'], intents: ['close range', 'debuff', 'control'] }),
    main: fit('Mysterious Rainhat supplies anti-Water and rain protection.', ['install:rain-defense'], { roles: ['elemental-defense'], elements: ['Water'], intents: ['rain'] }),
  },
  wawa: {
    active: fit('Black Rose supplies Dark damage with Charm or Blind control.', ['damage:Dark', 'control:charm-blind'], { roles: ['damage', 'control'], elements: ['Dark'], intents: ['charm', 'blind', 'control'] }),
    passive: fit('Fairy Ring adds stackable luck-status resistance.', ['status:fairy-ring'], { roles: ['status-defense'], metrics: ['luckStatusPercent'], modeled: true, stackable: true }),
    main: fit('Bad Juju provides conditional recurring FP theft.', ['install:fp-theft'], { roles: ['sustain', 'control'], intents: ['fp', 'resource denial'], condition: 'Chance-based and requires a nearby enemy.' }),
  },
  carbuncle: {
    active: fit('Ruby Beam adds Earth damage and Blind pressure.', ['damage:Earth', 'control:blind'], { roles: ['damage', 'control'], elements: ['Earth'], intents: ['blind'] }),
    passive: fit('Positive Thinker grants +10% Dark resistance.', ['resistance:Dark'], { roles: ['elemental-defense'], elements: ['Dark'], modeled: true }),
    main: fit('777 rewards an exact seven-contract roster.', ['package:777'], { roles: ['summon-support'], intents: ['777', 'seven contracts'], condition: 'Exactly seven contracts while Carbuncle is installed.' }),
  },
  'fire-elemental': {
    active: fit('Burst of Fire supplies Fire damage and Nerhaven setup.', ['damage:Fire', 'buff:nerhaven'], { roles: ['damage', 'basic-attack'], elements: ['Fire'] }),
    passive: fit('Barrier of Fire protects against Wood weapons.', ['matchup:wood-weapon'], { roles: ['defense'], intents: ['wood weapon'], condition: 'Only against Wood weapons.' }),
    main: fit('Elemental of Fire supports Fire resistance and weapon damage.', ['install:fire-elemental'], { roles: ['elemental-defense', 'basic-attack'], elements: ['Fire'] }),
  },
  'phase-python': {
    active: fit('Phase Fang adds a basic attack, Poison, and repositioning.', ['basic:phase-fang', 'control:poison', 'mobility:teleport'], { roles: ['basic-attack', 'control', 'mobility'], intents: ['poison', 'backstab', 'teleport'] }),
    passive: fit('Vile Mastery provides Poison resistance.', ['status:poison-resist'], { roles: ['status-defense'], intents: ['poison resistance', 'poison'] }),
    main: fit('Slither Mastery supplies teleport movement and Immobilize escape.', ['install:slither'], { roles: ['mobility', 'status-defense'], intents: ['teleport', 'immobilize', 'mobility'] }),
  },
  'sazae-oni': {
    active: fit('Whirlpool supplies accurate Water area damage and grouping.', ['damage:Water', 'control:pull'], { roles: ['damage', 'control'], elements: ['Water'] }),
    passive: fit('Painful Accuracy grants +2 SKI and improves Kicks.', ['stat:ski'], { modeled: true }),
    main: fit('Seafarer grants Water immunity.', ['install:water-immunity'], { roles: ['elemental-defense'], elements: ['Water'] }),
  },
  terrasque: {
    active: fit('Shatter Beam deals Earth damage and lowers enemy DEF/RES.', ['damage:Earth', 'control:def-res-down'], { roles: ['damage', 'control'], elements: ['Earth'], intents: ['debuff', 'defense reduction'] }),
    passive: fit('Skitterscale grants +5 Evade and +2 DEF.', ['stat:def', 'derived:evade'], { roles: ['defense', 'evade'], modeled: true }),
    main: fit('Regrowth provides recurring HP recovery.', ['install:regrowth'], { roles: ['sustain', 'healing'], intents: ['regeneration', 'healing', 'sustain'] }),
  },
  'wind-elemental': {
    active: fit('Burst of Wind supplies Wind damage and Talvyd setup.', ['damage:Wind', 'buff:talvyd'], { roles: ['damage', 'evade'], elements: ['Wind'] }),
    passive: fit('Barrier of Wind adds Evade against ranged weapons.', ['matchup:ranged-weapon'], { roles: ['evade', 'defense'], defensePlans: ['evade'], intents: ['ranged defense'], condition: 'Only against ranged weapons.' }),
    main: fit('Elemental of Wind supplies Wind resistance and +10 Evade.', ['install:wind-elemental'], { roles: ['elemental-defense', 'evade'], elements: ['Wind'], modeled: true }),
  },
  'drowned-woman': {
    active: fit('Drown supplies Water damage.', ['damage:Water'], { roles: ['damage'], elements: ['Water'] }),
    passive: fit('Ghost Sea grants Burn immunity and Ghost typing.', ['status:burn-immunity', 'race:ghost'], { roles: ['status-defense'], intents: ['burn immunity', 'ghost race', 'ghost'] }),
    main: fit('Ammendum supplies broad physical resistance with a Dark weakness.', ['install:physical-resist'], { roles: ['defense'], defensePlans: ['tank', 'bruiser', 'hybrid'], condition: 'Installed; includes a Dark weakness.' }),
  },
  lilu: {
    active: fit('Wink supplies Charm control.', ['control:charm'], { roles: ['control'], intents: ['charm', 'control'] }),
    passive: fit('Nightshade grants +2 DEF and +2 RES.', ['passive:nightshade'], { roles: ['defense'], modeled: true }),
    main: fit('Embrace supports a Charm-and-Grapple control plan.', ['install:grapple'], { roles: ['control', 'mobility'], intents: ['charm', 'grapple'] }),
  },
  nacht: {
    active: fit('Ichor Veil converts HP into an allied defensive shield.', ['support:ichor-veil'], { roles: ['defense', 'summon-support'], intents: ['shield', 'protect allies', 'support'] }),
    passive: fit('Bloodstained Night creates a battlefield effect on defeat.', ['terrain:bloodstained-night'], { roles: ['terrain'], intents: ['blood', 'night'], condition: 'Only after the owner is defeated.' }),
    main: fit('Midnight Ruler rewards night or Darkness-tile play.', ['install:midnight-ruler'], { roles: ['sustain', 'damage'], elements: ['Dark'], intents: ['night', 'darkness tile'], condition: 'Requires night or a Darkness tile.' }),
  },
  yukionna: {
    active: fit('Frostbite combines Ice damage with Ice-Sheet punishment.', ['damage:Ice', 'package:ice-sheets'], { roles: ['damage', 'terrain'], elements: ['Ice'], intents: ['ice sheet'] }),
    passive: fit('Snowshoes removes the movement penalty from Ice Sheets.', ['package:ice-sheets'], { roles: ['mobility', 'terrain'], intents: ['ice sheet'], requiresYoukai: ['snow-crow', 'yukionna'] }),
    main: fit('Snow Crest reflects Ice damage but creates a Fire weakness.', ['install:snow-crest'], { roles: ['elemental-defense'], elements: ['Ice'], condition: 'Installed; includes a Fire weakness.' }),
  },
  'jack-o-lantern': {
    active: fit("Fire Wall supplies Fire damage and Fear pressure.", ['damage:Fire', 'control:fear'], { roles: ['damage', 'control'], elements: ['Fire'], intents: ['fear'] }),
    passive: fit('Sinister Regrowth provides +5 HP regeneration.', ['sustain:hp-regeneration'], { roles: ['sustain', 'healing'], intents: ['regeneration', 'healing', 'sustain'], modeled: true }),
    main: fit('Autumn Animation trades Fire defense for Earth and Water resistance.', ['install:autumn-animation'], { roles: ['elemental-defense'], elements: ['Earth', 'Water'], condition: 'Installed; includes a Fire weakness.', modeled: true }),
  },
  orbello: {
    active: fit('Deathtouch supplies mixed Ice/Dark spell damage.', ['damage:Ice', 'damage:Dark'], { roles: ['damage', 'spellcasting'], elements: ['Ice', 'Dark'], weapons: ['Tome'] }),
    passive: fit('Nightshade grants +2 DEF and +2 RES.', ['passive:nightshade'], { roles: ['defense'], modeled: true }),
    main: fit('Chain Cast rewards repeated spellcasting with Power and FP efficiency.', ['install:chain-cast'], { roles: ['spellcasting', 'sustain', 'damage'], weapons: ['Tome'], intents: ['spell', 'caster', 'fp efficiency'] }),
  },
  'vampiric-legume': {
    active: fit('Ingrain deliberately enables Immobilized interactions.', ['package:ingrain-synthesis'], { roles: ['terrain', 'control'], intents: ['immobilize', 'ingrain'] }),
    passive: fit('Synthesis turns self-Immobilize into area drain and healing.', ['package:ingrain-synthesis'], { roles: ['damage', 'healing', 'sustain'], intents: ['immobilize', 'drain', 'healing'], requiresYoukai: ['vampiric-legume'] }),
    main: fit('Demon Plant supplies Dark resistance and damage-based healing.', ['install:demon-plant'], { roles: ['elemental-defense', 'healing', 'sustain'], elements: ['Dark'], condition: 'Installed; includes a Light weakness.', modeled: true }),
  },
};

export interface YoukaiOptimizationContext {
  intent?: string;
  defensePlan?: OptimizationDefensePlan;
  extraPackage?: OptimizationExtraPackage;
  preset?: OptimizationPreset;
  constraints?: OptimizationConstraint[];
  damageElements?: ElementKey[];
}

export interface YoukaiNumericBonuses {
  stats: Partial<Record<StatKey, number>>;
  derived: { evade: number; criticalEvade: number; luckStatusPercent: number; hpRegeneration: number };
  elementalResistance: Partial<Record<ElementKey, number>>;
  /** Blunt / Pierce / Slash, which a couple of Install skills grant. */
  physicalResistance: Partial<Record<PhysicalKey, number>>;
  weaponPower: number;
}

const emptyNumeric = (): YoukaiNumericBonuses => ({
  stats: {}, derived: { evade: 0, criticalEvade: 0, luckStatusPercent: 0, hpRegeneration: 0 },
  elementalResistance: {}, physicalResistance: {}, weaponPower: 0,
});

type NumericEffect =
  | { kind: 'stat'; key: StatKey; value: number }
  | { kind: 'derived'; key: keyof YoukaiNumericBonuses['derived']; value: number }
  | { kind: 'resistance'; key: ElementKey; value: number }
  | { kind: 'physicalResistance'; key: PhysicalKey; value: number }
  | { kind: 'weaponPower'; value: number; weapon: string };

const NUMERIC_EFFECTS: Record<string, NumericEffect[]> = {
  'Seal of the South': [{ kind: 'stat', key: 'wil', value: 2 }],
  'Seal of the South+': [{ kind: 'stat', key: 'wil', value: 2 }],
  'Seal of the West': [{ kind: 'stat', key: 'str', value: 2 }],
  'Seal of the North': [{ kind: 'stat', key: 'def', value: 2 }],
  'Seal of the North+': [{ kind: 'stat', key: 'def', value: 2 }],
  'Seal of the East': [{ kind: 'stat', key: 'cel', value: 2 }],
  'Seal of the East+': [{ kind: 'stat', key: 'cel', value: 2 }],
  'Painful Accuracy': [{ kind: 'stat', key: 'ski', value: 2 }],
  Skitterscale: [{ kind: 'stat', key: 'def', value: 2 }, { kind: 'derived', key: 'evade', value: 5 }],
  Nightshade: [{ kind: 'stat', key: 'def', value: 2 }, { kind: 'stat', key: 'res', value: 2 }],
  'Fairy Ring': [{ kind: 'derived', key: 'luckStatusPercent', value: 10 }],
  'Positive Thinker': [{ kind: 'resistance', key: 'Dark', value: 10 }],
  'Sinister Regrowth': [{ kind: 'derived', key: 'hpRegeneration', value: 5 }],
  'Talon Claw': [{ kind: 'weaponPower', value: 5, weapon: 'Fist' }],
  Floating: [{ kind: 'resistance', key: 'Earth', value: 25 }, { kind: 'resistance', key: 'Wind', value: -25 }],
  Dragonscale: [{ kind: 'stat', key: 'def', value: 5 }, { kind: 'derived', key: 'criticalEvade', value: 10 }],
  'Aquae Crista': [{ kind: 'resistance', key: 'Water', value: 50 }, { kind: 'resistance', key: 'Fire', value: -25 }],
  'Elemental of Wind': [{ kind: 'resistance', key: 'Wind', value: 15 }, { kind: 'derived', key: 'evade', value: 10 }],
  'Autumn Animation': [
    { kind: 'resistance', key: 'Earth', value: 15 }, { kind: 'resistance', key: 'Water', value: 15 },
    { kind: 'resistance', key: 'Fire', value: -15 },
  ],
  'Demon Plant': [{ kind: 'resistance', key: 'Dark', value: 25 }, { kind: 'resistance', key: 'Light', value: -25 }],

  /*
   * Install skills that trade one resistance for another.
   *
   * Each of these states a stronger effect for the Youkai itself ("If the owner
   * of this skill is Kasa-Obake, they instead are immune to Water damage"), but
   * an Installed Summoner is never that Youkai, so the base figure is the one
   * that applies here. Drowned Woman says so outright: 50% for itself, "only 25%
   * for non-Drowned Woman units", which is every build this models.
   */
  'Tough Fur': [
    { kind: 'physicalResistance', key: 'Slash', value: 25 },
    { kind: 'resistance', key: 'Water', value: -25 },
  ],
  'Mysterious Rainhat': [{ kind: 'resistance', key: 'Water', value: 15 }],
  'Elemental of Fire': [{ kind: 'resistance', key: 'Fire', value: 15 }],
  'Ammendum, Sin, and Purpose': [
    { kind: 'physicalResistance', key: 'Slash', value: 25 },
    { kind: 'physicalResistance', key: 'Blunt', value: 25 },
    { kind: 'physicalResistance', key: 'Pierce', value: 25 },
    { kind: 'resistance', key: 'Dark', value: -25 },
  ],
};

function accessibleSlots(build: BuildState, youkai: Youkai, ranks: SkillRanks): Set<string> {
  const slots = new Set<string>();
  const syncMind = ranks['sync-mind'] ?? 0;
  if (syncMind >= 1) slots.add('evoke-active');
  if (syncMind >= 2) slots.add('evoke-passive');
  if (build.youkai.installed === youkai.id) slots.add('main');
  return slots;
}

/** Exact, unconditional Youkai bonuses that fit existing calculator channels. */
export function youkaiNumericBonuses(build: BuildState, ranks = mergeSkillRanks(build.skillRanks)): YoukaiNumericBonuses {
  const result = emptyNumeric();
  const state = normalizeYoukaiState(build.youkai);
  const seen = new Set<string>();
  const weapon = effectiveWeaponType(build.equipment.primaryWeapon);
  for (const id of state.contracted) {
    const youkai = youkaiById(id);
    if (!youkai) continue;
    const slots = accessibleSlots({ ...build, youkai: state }, youkai, ranks);
    for (const skill of youkai.skills) {
      if (!slots.has(skill.slot)) continue;
      // Only Fairy Ring explicitly stacks multiple copies.
      if (seen.has(skill.name) && skill.name !== 'Fairy Ring') continue;
      seen.add(skill.name);
      for (const effect of NUMERIC_EFFECTS[skill.name] ?? []) {
        if (effect.kind === 'stat') result.stats[effect.key] = (result.stats[effect.key] ?? 0) + effect.value;
        if (effect.kind === 'derived') result.derived[effect.key] += effect.value;
        if (effect.kind === 'resistance') result.elementalResistance[effect.key] = (result.elementalResistance[effect.key] ?? 0) + effect.value;
        if (effect.kind === 'physicalResistance') result.physicalResistance[effect.key] = (result.physicalResistance[effect.key] ?? 0) + effect.value;
        if (effect.kind === 'weaponPower' && weapon === effect.weapon) result.weaponPower += effect.value;
      }
    }
  }
  return result;
}

function profileFor(youkai: Youkai): YoukaiFitProfile | undefined {
  return YOUKAI_FIT_PROFILES[youkaiFamilyId(youkai)];
}

function contextText(context: YoukaiOptimizationContext): string {
  return `${context.intent ?? ''} ${context.extraPackage ?? ''} ${context.defensePlan ?? ''}`.toLocaleLowerCase();
}

function hasEvidence(fitProfile: SkillFit, build: BuildState, context: YoukaiOptimizationContext): { basis: YoukaiSelectionReason['basis']; condition?: string } | null {
  if (fitProfile.weapons?.length && !fitProfile.weapons.includes(effectiveWeaponType(build.equipment.primaryWeapon) ?? '')) return null;
  if (fitProfile.modeled) return { basis: 'modeled', condition: fitProfile.condition };
  const text = contextText(context);
  if (fitProfile.weapons?.includes(effectiveWeaponType(build.equipment.primaryWeapon) ?? '')) return { basis: 'build-fit', condition: fitProfile.condition };
  if (fitProfile.elements?.some(element => context.damageElements?.includes(element))) return { basis: 'build-fit', condition: fitProfile.condition };
  if (fitProfile.intents?.some(term => text.includes(term))) return { basis: 'intent', condition: fitProfile.condition };
  if (fitProfile.defensePlans?.includes(context.defensePlan ?? 'auto')) return { basis: 'build-fit', condition: fitProfile.condition };
  if (fitProfile.metrics?.some(metric => context.constraints?.some(item => item.metric === metric)
    || (context.preset?.metricWeights[metric] ?? 0) > 0)) return { basis: 'build-fit', condition: fitProfile.condition };
  const roles = new Set(fitProfile.roles ?? []);
  if (roles.has('evade') && (context.defensePlan === 'evade' || context.constraints?.some(item => item.metric === 'evade'))) {
    return { basis: 'build-fit', condition: fitProfile.condition };
  }
  if (roles.has('defense') && ['tank', 'bruiser', 'hybrid'].includes(context.defensePlan ?? '')) {
    return { basis: 'build-fit', condition: fitProfile.condition };
  }
  if (roles.has('spellcasting') && effectiveWeaponType(build.equipment.primaryWeapon) === 'Tome') return { basis: 'build-fit', condition: fitProfile.condition };
  return null;
}

export interface YoukaiRosterFit {
  score: number;
  reasons: Map<string, YoukaiSelectionReason[]>;
}

/**
 * Evidence-backed qualitative value, capped at 0.25 so prose can only break
 * close ties. `existingContracts` are deliberately not justified by the model.
 */
export function evaluateYoukaiRosterFit(
  build: BuildState,
  context: YoukaiOptimizationContext,
  existingContracts: ReadonlySet<string> = new Set(),
): YoukaiRosterFit {
  const state = normalizeYoukaiState(build.youkai);
  const ranks = mergeSkillRanks(build.skillRanks);
  const reasons = new Map<string, YoukaiSelectionReason[]>();
  const used = new Set<string>();
  let evidenceCount = 0;
  for (const id of state.contracted) {
    if (existingContracts.has(id)) continue;
    const youkai = youkaiById(id);
    const profile = youkai && profileFor(youkai);
    if (!youkai || !profile) continue;
    const slots = accessibleSlots({ ...build, youkai: state }, youkai, ranks);
    const entries: Array<{ slot: 'evoke-active' | 'evoke-passive' | 'main'; fit: SkillFit; access: YoukaiSelectionReason['access'] }> = [
      { slot: 'evoke-active', fit: profile.active, access: 'sync-mind-active' },
      { slot: 'evoke-passive', fit: profile.passive, access: 'sync-mind-passive' },
      { slot: 'main', fit: profile.main, access: 'install-main' },
    ];
    const selected: YoukaiSelectionReason[] = [];
    for (const entry of entries) {
      const chaotic = entry.slot === 'main' && (ranks['chaotic-form'] ?? 0) >= 1;
      if (!slots.has(entry.slot) && !chaotic) continue;
      if (entry.fit.requiresYoukai?.some(required => !state.contracted.some(contracted => youkaiFamilyId(contracted) === required))) continue;
      const evidence = hasEvidence(entry.fit, build, context);
      if (!evidence) continue;
      const newKeys = entry.fit.keys.filter(key => entry.fit.stackable || !used.has(key));
      const sharedPackage = Boolean(entry.fit.requiresYoukai?.length);
      if (!newKeys.length && !sharedPackage) continue;
      for (const key of newKeys) used.add(key);
      evidenceCount += newKeys.length;
      selected.push({
        skillName: youkai.skills.find(skill => skill.slot === entry.slot)?.name ?? entry.fit.summary,
        access: chaotic && !slots.has('main') ? 'chaotic-form' : entry.access,
        summary: entry.fit.summary,
        basis: evidence.basis,
        condition: evidence.condition,
        uncertain: entry.fit.uncertain,
      });
    }
    if (build.youkai.installed === id && !selected.some(reason => reason.access === 'install-main')) {
      selected.push({
        skillName: 'Install', access: 'install-main', basis: 'modeled',
        summary: `${youkai.name} supplies the selected ${youkai.race} Install body.`,
      });
      evidenceCount += 1;
    }
    if (selected.length) reasons.set(id, selected);
  }
  return { score: Math.min(0.25, evidenceCount * 0.04), reasons };
}

export function missingYoukaiOptimizationProfiles(): string[] {
  return YOUKAI.flatMap(youkai => profileFor(youkai) ? [] : [youkai.id]);
}
