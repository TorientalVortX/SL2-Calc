/**
 * Youkai: contracts, Affinity growth, Sync-Mind evoking and Install.
 *
 * The three Summoner skills that make Youkai mean anything mechanically all
 * resolve here, because each one reads both a skill rank and the contracted
 * Youkai and neither module owns the answer alone:
 *
 * - **Affinity: <race>** raises every stat of that race's Youkai by its rank.
 * - **Sync-Mind** lends the Summoner their Youkai's skills: the Evoke-Active at
 *   rank 1, the Evoke-Passive at rank 2. Those are the Summoner's own to use.
 * - **Install** swaps the Summoner into a Youkai's body. Its base stats replace
 *   the Summoner's own, its third skill becomes available, and Affinity growth
 *   is capped at +1 while installed.
 *
 * Youkai are modelled at level 60. See `scripts/build-youkai-data.mjs`.
 */
import type { SkillRanks, StatKey, StatRecord, Youkai, YoukaiSkill, YoukaiState } from '../types';
import content from '../data/content/youkai.json';
import { SUBRACES } from '../data/races';

/*
 * Declared here rather than imported from `buildEvaluation`, which imports this
 * module for Install and would otherwise form a cycle.
 */
const STAT_KEYS: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

export type { Youkai, YoukaiSkill, YoukaiState };

export const YOUKAI = content.youkai as Youkai[];

const BY_ID = new Map(YOUKAI.map(youkai => [youkai.id, youkai]));
const ASCENDED_BY_BASE = new Map(
  YOUKAI.filter(youkai => youkai.baseFormId).map(youkai => [youkai.baseFormId!, youkai]),
);

/** Youkai races, in the order the wiki groups them. */
export const YOUKAI_RACES = [...new Set(YOUKAI.map(youkai => youkai.race))].sort();

/**
 * The base stat line of a Youkai race: Avian, Beast, Dragon and the rest.
 *
 * These are ordinary subrace lines in the calculator's own race data, on the
 * same scale as Redtail or Imperialist. Install swaps one for another, so this
 * is the line it substitutes.
 *
 * Only the stat fields are taken; a subrace record also carries flags such as
 * `allowedRaces` that mean nothing here.
 */
export function youkaiRaceBaseStats(race: string): Partial<StatRecord> | null {
  const line = SUBRACES[race];
  if (!line) return null;
  const stats: Partial<StatRecord> = {};
  for (const stat of STAT_KEYS) {
    const value = line[stat];
    if (typeof value === 'number') stats[stat] = value;
  }
  return stats;
}

/**
 * Stats Install does NOT overwrite.
 *
 * Install replaces the Summoner's racial base stats with the Youkai's "excluding
 * FAI, SAN, and APT": the three that describe the Summoner rather than the body
 * they are wearing.
 */
export const INSTALL_PRESERVED_STATS: StatKey[] = ['fai', 'san', 'apt'];

/** Affinity growth is clamped to this while installed. */
const INSTALLED_AFFINITY_CAP = 1;

export function youkaiById(id: string | null | undefined): Youkai | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The one-contract family shared by an ordinary and ascended form. */
export function youkaiFamilyId(youkaiOrId: Youkai | string): string {
  const youkai = typeof youkaiOrId === 'string' ? youkaiById(youkaiOrId) : youkaiOrId;
  return youkai?.baseFormId ?? youkai?.id ?? String(youkaiOrId);
}

export function ascendedYoukaiFor(youkaiOrId: Youkai | string): Youkai | undefined {
  return ASCENDED_BY_BASE.get(youkaiFamilyId(youkaiOrId));
}

/**
 * Canonicalizes contracts from UI, persistence, and optimizer candidates.
 * Unknown ids are dropped and an ascended form always replaces its base. If the
 * base was installed, the install follows the upgrade.
 */
export function normalizeYoukaiState(state: YoukaiState): YoukaiState {
  const known = [...new Set(state.contracted)].filter(id => Boolean(youkaiById(id)));
  const ascendedFamilies = new Map<string, string>();
  for (const id of known) {
    const youkai = youkaiById(id)!;
    if (youkai.baseFormId) ascendedFamilies.set(youkai.baseFormId, id);
  }
  const contracted = known.filter(id => {
    const youkai = youkaiById(id)!;
    return Boolean(youkai.baseFormId) || !ascendedFamilies.has(youkai.id);
  });
  let installed = contracted.includes(state.installed ?? '') ? state.installed : null;
  if (!installed && state.installed) installed = ascendedFamilies.get(youkaiFamilyId(state.installed)) ?? null;
  return { contracted, installed };
}

/** Adds or upgrades one contract while preserving the one-form-per-family rule. */
export function contractYoukai(state: YoukaiState, id: string): YoukaiState {
  const youkai = youkaiById(id);
  if (!youkai) return normalizeYoukaiState(state);
  const current = normalizeYoukaiState(state);
  const family = youkaiFamilyId(youkai);
  const existing = current.contracted.find(contracted => youkaiFamilyId(contracted) === family);
  if (existing === id) return current;
  // An ordinary form never downgrades an ascended contract.
  if (!youkai.baseFormId && existing && youkaiById(existing)?.baseFormId) return current;
  const contracted = current.contracted.filter(contractedId => youkaiFamilyId(contractedId) !== family);
  const installed = existing && current.installed === existing ? id : current.installed;
  return normalizeYoukaiState({ contracted: [...contracted, id], installed });
}

/** Upgrades every contracted base that has an ascended representative. */
export function preferAscendedYoukaiState(state: YoukaiState): YoukaiState {
  let current = normalizeYoukaiState(state);
  for (const id of [...current.contracted]) {
    const ascended = ascendedYoukaiFor(id);
    if (ascended) current = contractYoukai(current, ascended.id);
  }
  return current;
}

export function conflictingYoukaiFamilies(state: YoukaiState): string[] {
  const seen = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const id of state.contracted) {
    const youkai = youkaiById(id);
    if (!youkai) continue;
    const family = youkaiFamilyId(youkai);
    if (seen.has(family) && seen.get(family) !== id) conflicts.add(family);
    else seen.set(family, id);
  }
  return [...conflicts];
}

export function youkaiByRace(race: string): Youkai[] {
  return YOUKAI.filter(youkai => youkai.race === race);
}

/** The skill id of the Affinity skill covering a Youkai race. */
export function affinitySkillId(race: string): string {
  return `affinity-${race.toLowerCase()}`;
}

/**
 * Rank of the Affinity skill for a race, as it applies to that race's Youkai.
 *
 * While installed the bonus is capped at +1, per Install's own wording.
 */
export function affinityRank(race: string, ranks: SkillRanks, installed = false): number {
  const rank = ranks[affinitySkillId(race)] ?? 0;
  return installed ? Math.min(rank, INSTALLED_AFFINITY_CAP) : rank;
}

/**
 * Applies Affinity growth to a Youkai stat line.
 *
 * Affinity "passively increases all of their statistics based on Rank", so the
 * rank is added to every stat the Youkai actually has. A stat the wiki lists as
 * 0 is left at 0 rather than lifted, since the Youkai has no such aptitude.
 */
function withAffinity(line: Partial<StatRecord>, bonus: number): Partial<StatRecord> {
  if (bonus === 0) return { ...line };
  return Object.fromEntries(
    Object.entries(line).map(([stat, value]) => [stat, (value ?? 0) > 0 ? (value ?? 0) + bonus : value]),
  ) as Partial<StatRecord>;
}

/**
 * A Youkai's level 60 stats with its Affinity growth applied.
 *
 * This is the summon itself, what fights beside you. Install does *not* use
 * this line; see `installedBaseStats`.
 */
export function youkaiStats(youkai: Youkai, ranks: SkillRanks, installed = false): Partial<StatRecord> {
  return withAffinity(youkai.stats, affinityRank(youkai.race, ranks, installed));
}

/* ---------------------------------------------------------------- sync-mind */

/** Slots Sync-Mind lends the Summoner at a given rank. Rank 0 lends nothing. */
export function evokedSlots(syncMindRank: number): YoukaiSkill['slot'][] {
  if (syncMindRank >= 2) return ['evoke-active', 'evoke-passive'];
  if (syncMindRank >= 1) return ['evoke-active'];
  return [];
}

/** How each skill slot is named in the game, for display in either front end. */
export const YOUKAI_SLOT_LABEL: Record<YoukaiSkill['slot'], string> = {
  'evoke-active': 'Evoke-Active',
  'evoke-passive': 'Evoke-Passive',
  main: 'Main',
};

/**
 * What each slot requires before the Summoner holds the skill themselves.
 *
 * Stated as the requirement rather than as the build's current state: an
 * Evoke-Passive is a Sync-Mind 2 skill whether or not Sync-Mind is there yet, and
 * labelling it "Install only" would send the player after the wrong skill.
 */
export const YOUKAI_SLOT_SOURCE: Record<YoukaiSkill['slot'], string> = {
  'evoke-active': 'Sync-Mind 1',
  'evoke-passive': 'Sync-Mind 2',
  main: 'Install only',
};

export interface GrantedYoukaiSkill extends YoukaiSkill {
  youkaiId: string;
  youkaiName: string;
  /** Why the Summoner has this skill. */
  via: 'sync-mind' | 'install';
}

/**
 * Every Youkai skill the Summoner personally has.
 *
 * Sync-Mind covers the evoke slots on all contracted Youkai at once: evoking is
 * a property of the contract, not of one summon. Install adds the third skill,
 * but only for the Youkai currently installed.
 */
export function grantedYoukaiSkills(state: YoukaiState, ranks: SkillRanks): GrantedYoukaiSkill[] {
  const slots = new Set(evokedSlots(ranks['sync-mind'] ?? 0));
  const granted: GrantedYoukaiSkill[] = [];

  for (const id of state.contracted) {
    const youkai = youkaiById(id);
    if (!youkai) continue;
    const isInstalled = state.installed === id;
    for (const skill of youkai.skills) {
      const viaSync = slots.has(skill.slot);
      // Install grants the whole set, which only adds the Main skill in practice
      // because Sync-Mind already covers the other two at rank 2.
      const viaInstall = isInstalled;
      if (!viaSync && !viaInstall) continue;
      granted.push({
        ...skill,
        youkaiId: youkai.id,
        youkaiName: youkai.name,
        via: viaSync ? 'sync-mind' : 'install',
      });
    }
  }
  return granted;
}

/* ------------------------------------------------------------------ install */

/**
 * Base stats to use while installed, or null when nothing is installed.
 *
 * Returns a full override rather than a bonus: Install *replaces* the Summoner's
 * racial base stats, so the caller substitutes these instead of adding them.
 * FAI, SAN and APT are absent from the result and must keep their original values.
 *
 * The line substituted is the **race's**, not the creature's: install Seiryuu
 * and you get the Dragon line, exactly as any Dragon would give you. A Youkai's
 * own stats stay its own; they are what it fights with as a summon, and they
 * are on a completely different scale. Byakko's level 60 STR is 56 against a
 * Redtail's 3, so substituting that made Install a +53 racial swing that also
 * dragged the diminishing-returns soft cap up with it.
 *
 * Affinity still applies, capped at +1, because Install says so outright:
 * "Affinity statistical boosts are effective for you (max +1)."
 */
export function installedBaseStats(
  state: YoukaiState,
  ranks: SkillRanks,
): Partial<StatRecord> | null {
  const youkai = youkaiById(state.installed);
  if (!youkai || !state.contracted.includes(youkai.id)) return null;
  const line = youkaiRaceBaseStats(youkai.race);
  if (!line) return null;
  const stats = withAffinity(line, affinityRank(youkai.race, ranks, true));
  const daisangenIds = ['chun', 'haku', 'hatsu'];
  const hasDaisangen = daisangenIds.every(id => state.contracted.includes(id))
    && ((ranks['sync-mind'] ?? 0) >= 2 || daisangenIds.includes(youkai.id));
  if (hasDaisangen && youkai.race === 'Dragon') {
    for (const stat of STAT_KEYS) {
      if (stat !== 'vit' && typeof stats[stat] === 'number' && (stats[stat] ?? 0) > 0) stats[stat] = (stats[stat] ?? 0) + 2;
    }
  }
  for (const stat of INSTALL_PRESERVED_STATS) delete stats[stat];
  return stats;
}

/** Whether a build can install: it needs the Install skill and a contracted Youkai. */
export function canInstall(state: YoukaiState, ranks: SkillRanks): boolean {
  return (ranks.install ?? 0) >= 1 && state.contracted.length > 0;
}

/** An empty Youkai state, for new builds and non-Summoners. */
export function emptyYoukaiState(): YoukaiState {
  return { contracted: [], installed: null };
}
