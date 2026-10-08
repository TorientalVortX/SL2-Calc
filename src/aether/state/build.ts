/**
 * Build model for the Aether Codex character builder.
 *
 * Everything numeric here is delegated: `evaluateBuild` owns the stat scaling and
 * every derived value, `skills`/`traits` own the legality rules, and
 * `buildPersistence` owns the file format. This module is only the set of legal
 * edits a player can make from the character sheet, plus the pruning each edit
 * drags in behind it.
 *
 * The pruning is the reason these are not plain `setState` calls. Changing a class
 * can orphan skill ranks that are no longer reachable, and changing a race can
 * orphan a subrace: leaving either in place produces a build the game would reject
 * while the sheet still reads as valid.
 */
import type { ArmorQuality, ArmorUpgradePoints, BuildState, StatKey, WeaponConfig } from '../../types';
import { evaluateBuild } from '../../domain/buildEvaluation';
import { normalizeBuildState } from '../../domain/buildPersistence';
import { traitById } from '../../domain/traits';
import { changeCopySpell, settleSpellthief, type CopySpellAction } from '../../domain/spellthief';
import { planMixture, removePlannedMixture, toggleMixtureEffect } from '../../domain/chemist';
import { CLASSES, CLASS_HIERARCHY } from '../../data/classes';
import { RACES, SUBRACES } from '../../data/races';
import { TEMPLATE_BUILDS } from '../../data/constants';
import {
  destinyAllowsClassPair,
  setSkillRankForClassSlots,
  skillsForClassSlots,
} from '../../domain/skills';
import { contractYoukai, emptyYoukaiState, normalizeYoukaiState } from '../../domain/youkai';
import { setSubtalentRank } from '../../domain/talents';
import {
  clearEquipment,
  equipArmor,
  equipGear,
  equipOffHandWeapon,
  equipPrimaryWeapon,
  patchArmorUpgrade,
  patchGear,
  patchWeapon,
  type GearSlotId,
} from './equipment';

export const STAT_KEYS: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

/** Long names for the twelve stats, matching the wiki's `statInfo` titles. */
export const STAT_NAMES: Record<StatKey, string> = {
  str: 'Strength', wil: 'Will', ski: 'Skill', cel: 'Celerity',
  def: 'Defense', res: 'Resistance', vit: 'Vitality', fai: 'Faith',
  luc: 'Luck', gui: 'Guile', san: 'Sanctity', apt: 'Aptitude',
};

/** The hard ceiling on a single stat's base total, enforced by `evaluateBuild`. */
export const STAT_HARD_CAP = 80;

export type ClassSlot = 'main' | 'sub';

/**
 * The loadout sheets, named where both the panel and the status can see them.
 *
 * The panel owns the tab strip, but a legality problem has to say which sheet it
 * belongs to, and that is decided where the violations are collected.
 */
export type LoadoutSheet = 'gear' | 'skills' | 'mixtures' | 'traits' | 'talents' | 'racials' | 'youkai';

/* --------------------------------------------------------------- construction */

export function createDefaultBuild(): BuildState {
  return normalizeBuildState({
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Soldier',
    subClass: 'Soldier',
    characterLevel: 60,
  });
}

export interface TemplateEntry {
  id: string;
  name: string;
  description: string;
  reasoning: string;
  build: BuildState;
}

/**
 * The starting templates, read from `rules.json` rather than restated here.
 *
 * The dataset stores the spread under `stats`, which is the `addedStats` field of
 * a build; the points the character has invested, not their totals.
 */
export const TEMPLATES: TemplateEntry[] = Object.entries(
  TEMPLATE_BUILDS as Record<string, Record<string, unknown>>,
).map(([id, template]) => ({
  id,
  name: String(template.name ?? id),
  description: String(template.description ?? ''),
  reasoning: String(template.reasoning ?? ''),
  build: normalizeBuildState({ ...template, addedStats: template.stats }),
}));

/* ---------------------------------------------------------------- class model */

export interface ClassFamily {
  base: string;
  /** The base class plus every promotion available from it. */
  members: string[];
}

export const CLASS_FAMILIES: ClassFamily[] = Object.entries(CLASS_HIERARCHY).map(([base, family]) => ({
  base,
  members: [family.name, ...family.subClasses],
}));

export function familyOf(className: string): ClassFamily {
  return CLASS_FAMILIES.find(family => family.members.includes(className)) ?? CLASS_FAMILIES[0];
}

export function subracesFor(race: string): string[] {
  return Object.entries(SUBRACES)
    .filter(([, config]) => (config.allowedRaces ?? []).includes(race))
    .map(([name]) => name);
}

export const RACE_NAMES = Object.keys(RACES);

/* -------------------------------------------------------------------- actions */

export type BuildAction =
  | { type: 'replace'; build: BuildState }
  | { type: 'template'; id: string }
  | { type: 'reset' }
  | { type: 'race'; race: string }
  | { type: 'subrace'; subrace: string }
  | { type: 'class'; slot: ClassSlot; className: string }
  | { type: 'monoclass'; enabled: boolean }
  | { type: 'stat'; stat: StatKey; value: number }
  | { type: 'stat-delta'; stat: StatKey; delta: number }
  | { type: 'stats-clear' }
  | { type: 'level'; level: number }
  | { type: 'skill-rank'; slot: ClassSlot; skillId: string; rank: number }
  | { type: 'skills-clear' }
  | { type: 'mixture-plan-add'; name: string }
  | { type: 'mixture-plan-remove'; index: number }
  | { type: 'mixture-plan-clear' }
  | { type: 'mixture-effect-toggle'; name: string; effect: string }
  | { type: 'copy-spell'; id: string; action: CopySpellAction }
  | { type: 'trait'; id: string; taken: boolean }
  | { type: 'traits-clear' }
  | { type: 'subtalent-rank'; subtalentId: string; rank: number }
  | { type: 'talent-conditional'; subtalentId: string; on: boolean }
  | { type: 'talents-clear' }
  | { type: 'equip-weapon'; which: 'primaryWeapon' | 'offHandWeapon'; weaponName: string | null }
  | { type: 'equip-armor'; armorName: string | null }
  | { type: 'equip-gear'; slot: GearSlotId; itemName: string | null }
  | { type: 'weapon-patch'; which: 'primaryWeapon' | 'offHandWeapon'; patch: Partial<WeaponConfig> }
  | { type: 'armor-patch'; patch: { armorMaterial?: string; armorEnchantment?: string; armorQuality?: ArmorQuality } }
  | { type: 'armor-upgrade'; patch: Partial<ArmorUpgradePoints> }
  | { type: 'gear-patch'; slot: GearSlotId; patch: Partial<{ material: string; enchantment: string; upgradePoints: Record<string, number> }> }
  | { type: 'armor-conditional'; key: string; on: boolean }
  | { type: 'item-conditional'; key: string; on: boolean }
  | { type: 'item-roll'; key: string; value: number }
  | { type: 'equipment-clear' }
  | { type: 'youkai-contract'; id: string; contracted: boolean }
  | { type: 'youkai-install'; id: string | null }
  | { type: 'youkai-clear' }
  | { type: 'field'; patch: Partial<BuildState> };

/** The per-stat ceiling on invested points, as `evaluateBuild` computes it. */
export function investedCaps(build: BuildState): Record<StatKey, number> {
  return evaluateBuild(build).maxInvestedStats;
}

/**
 * Drops skill ranks the new class pair can no longer reach.
 *
 * Kept as a filter over the reachable pool rather than a wholesale reset so a
 * player retuning one slot does not lose the other slot's sheet.
 */
function pruneSkills(build: BuildState): BuildState {
  const reachable = new Set(skillsForClassSlots(build.mainClass, build.subClass).map(skill => skill.id));
  const filter = (ranks: Record<string, number>) =>
    Object.fromEntries(Object.entries(ranks).filter(([id]) => reachable.has(id)));
  return {
    ...build,
    skillRanks: { main: filter(build.skillRanks.main), sub: filter(build.skillRanks.sub) },
  };
}

/** Updates the class-family selections after a class change. */
function settleClasses(build: BuildState): BuildState {
  const next: BuildState = {
    ...build,
    selectedMainBaseClass: familyOf(build.mainClass).base,
    selectedSubBaseClass: familyOf(build.subClass).base,
  };
  return settleSpellthief(pruneSkills(next));
}

export function buildReducer(build: BuildState, action: BuildAction): BuildState {
  switch (action.type) {
    case 'replace':
      return settleSpellthief(action.build);

    case 'template': {
      const template = TEMPLATES.find(entry => entry.id === action.id);
      return template ? template.build : build;
    }

    case 'reset':
      return createDefaultBuild();

    case 'race': {
      if (!RACES[action.race]) return build;
      const allowed = subracesFor(action.race);
      const subrace = allowed.includes(build.subrace) ? build.subrace : allowed[0] ?? build.subrace;
      return clampAllStats({ ...build, race: action.race, subrace });
    }

    case 'subrace':
      if (!SUBRACES[action.subrace]) return build;
      return clampAllStats({ ...build, subrace: action.subrace });

    case 'class': {
      if (!CLASSES[action.className]) return build;
      const monoclass = build.mainClass === build.subClass;
      let next: BuildState = action.slot === 'main'
        ? { ...build, mainClass: action.className, ...(monoclass ? { subClass: action.className } : {}) }
        : { ...build, subClass: action.className };
      // Destiny confines a character to one family, so a pair that breaks it is
      // resolved by pulling the other slot along rather than saving an illegal build.
      if (next.destiny && !destinyAllowsClassPair(next.mainClass, next.subClass)) {
        next = action.slot === 'main'
          ? { ...next, subClass: action.className }
          : { ...next, mainClass: action.className };
      }
      return settleClasses(next);
    }

    case 'monoclass':
      return settleClasses(action.enabled
        ? { ...build, subClass: build.mainClass }
        : build);

    case 'stat': {
      const cap = investedCaps(build)[action.stat];
      const value = Math.max(0, Math.min(Math.floor(action.value), cap));
      return { ...build, addedStats: { ...build.addedStats, [action.stat]: value } };
    }

    case 'stat-delta': {
      const cap = investedCaps(build)[action.stat];
      const value = Math.max(0, Math.min(build.addedStats[action.stat] + action.delta, cap));
      return { ...build, addedStats: { ...build.addedStats, [action.stat]: value } };
    }

    case 'stats-clear':
      return {
        ...build,
        addedStats: STAT_KEYS.reduce(
          (record, stat) => ({ ...record, [stat]: 0 }),
          {} as BuildState['addedStats'],
        ),
      };

    case 'level': {
      const level = Math.max(1, Math.min(Math.floor(action.level), 60));
      return clampAllStats({ ...build, characterLevel: level });
    }

    case 'skill-rank':
      return settleSpellthief({
        ...build,
        skillRanks: setSkillRankForClassSlots(
          build.mainClass,
          build.subClass,
          build.skillRanks,
          action.slot,
          action.skillId,
          action.rank,
        ),
      });

    case 'skills-clear':
      return settleSpellthief({ ...build, skillRanks: { main: {}, sub: {} } });

    case 'mixture-plan-add':
      return planMixture(build, action.name);

    case 'mixture-plan-remove':
      return removePlannedMixture(build, action.index);

    case 'mixture-plan-clear':
      return { ...build, mixturePlan: [], activeMixtureEffects: [] };

    case 'mixture-effect-toggle':
      return toggleMixtureEffect(build, action.name, action.effect);

    case 'copy-spell':
      return changeCopySpell(build, action.id, action.action);

    case 'trait': {
      const trait = traitById(action.id);
      if (trait?.historyKey) {
        return {
          ...build,
          history: action.taken ? trait.historyKey : 'None',
          traits: (build.traits ?? []).filter(id => !traitById(id)?.historyKey),
        };
      }
      const taken = new Set(build.traits ?? []);
      if (action.taken) taken.add(action.id);
      else taken.delete(action.id);
      return { ...build, traits: [...taken] };
    }
    case 'subtalent-rank': {
      const talents = setSubtalentRank(build.talents, action.subtalentId, action.rank);
      // A subtalent dropped to zero takes its conditional switch with it, or the
      // switch would still be on when the rank came back.
      const conditionals = { ...(build.talentConditionals ?? {}) };
      if (!talents[action.subtalentId]) delete conditionals[action.subtalentId];
      return { ...build, talents, talentConditionals: conditionals };
    }
    case 'talent-conditional': {
      const conditionals = { ...(build.talentConditionals ?? {}) };
      if (action.on) conditionals[action.subtalentId] = true;
      else delete conditionals[action.subtalentId];
      return { ...build, talentConditionals: conditionals };
    }
    case 'talents-clear':
      return { ...build, talents: {}, talentConditionals: {} };

    case 'traits-clear':
      return { ...build, traits: [], history: 'None' };

    /*
     * Equipment. Each case delegates the slot rules to `state/equipment.ts` and
     * only re-clamps stats afterwards, because a piece granting a stat raises the
     * non-allocated floor and so lowers how much may be invested on top of it.
     */
    case 'equip-weapon':
      return clampAllStats({
        ...build,
        equipment: action.which === 'primaryWeapon'
          ? equipPrimaryWeapon(build.equipment, action.weaponName)
          : equipOffHandWeapon(build.equipment, action.weaponName),
      });

    case 'equip-armor':
      return clampAllStats({ ...build, equipment: equipArmor(build.equipment, action.armorName) });

    case 'equip-gear':
      return clampAllStats({ ...build, equipment: equipGear(build.equipment, action.slot, action.itemName) });

    case 'weapon-patch':
      return clampAllStats({ ...build, equipment: patchWeapon(build.equipment, action.which, action.patch) });

    case 'armor-patch':
      return clampAllStats({ ...build, equipment: { ...build.equipment, ...action.patch } });

    case 'armor-upgrade':
      return clampAllStats({ ...build, equipment: patchArmorUpgrade(build.equipment, action.patch) });

    case 'gear-patch':
      return clampAllStats({ ...build, equipment: patchGear(build.equipment, action.slot, action.patch) });

    case 'armor-conditional':
      return clampAllStats({
        ...build,
        equipment: {
          ...build.equipment,
          armorConditionalBonuses: { ...build.equipment.armorConditionalBonuses, [action.key]: action.on },
        },
      });

    case 'item-conditional':
      return clampAllStats({
        ...build,
        equipment: {
          ...build.equipment,
          itemConditionalBonuses: { ...(build.equipment.itemConditionalBonuses ?? {}), [action.key]: action.on },
        },
      });

    case 'item-roll':
      return clampAllStats({
        ...build,
        equipment: {
          ...build.equipment,
          itemRolls: { ...(build.equipment.itemRolls ?? {}), [action.key]: action.value },
        },
      });

    case 'equipment-clear':
      return clampAllStats({ ...build, equipment: clearEquipment() });

    /*
     * Youkai. Contracting goes through `contractYoukai` rather than pushing onto
     * the list, because a family holds one form at a time: taking an ascended
     * Youkai replaces the base it grew from, and carries the install across if
     * that base was the one installed.
     */
    case 'youkai-contract': {
      const youkai = action.contracted
        ? contractYoukai(build.youkai, action.id)
        : normalizeYoukaiState({
          contracted: build.youkai.contracted.filter(id => id !== action.id),
          // Releasing the installed Youkai has to clear the install with it.
          installed: build.youkai.installed === action.id ? null : build.youkai.installed,
        });
      return clampAllStats({ ...build, youkai });
    }

    case 'youkai-install':
      return clampAllStats({
        ...build,
        youkai: normalizeYoukaiState({ ...build.youkai, installed: action.id }),
      });

    case 'youkai-clear':
      return clampAllStats({ ...build, youkai: emptyYoukaiState() });

    case 'field': {
      const next = { ...build, ...action.patch };
      // Turning Destiny on can invalidate the current pair; collapse to monoclass
      // on the main class's family, which is always legal.
      if (next.destiny && !destinyAllowsClassPair(next.mainClass, next.subClass)) {
        return settleClasses({ ...next, subClass: next.mainClass });
      }
      return settleSpellthief(next);
    }

    default:
      return build;
  }
}

/**
 * Re-clamps every invested stat against its cap.
 *
 * Needed after any edit that changes the non-allocated part of a stat: a subrace
 * with a higher racial line lowers how much may be invested on top of it, and the
 * points already there would otherwise sit above the hard cap.
 */
function clampAllStats(build: BuildState): BuildState {
  const caps = investedCaps(build);
  const addedStats = { ...build.addedStats };
  let changed = false;
  for (const stat of STAT_KEYS) {
    const clamped = Math.max(0, Math.min(addedStats[stat], caps[stat]));
    if (clamped !== addedStats[stat]) {
      addedStats[stat] = clamped;
      changed = true;
    }
  }
  return changed ? { ...build, addedStats } : build;
}
