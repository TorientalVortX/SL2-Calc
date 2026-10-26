// Youkai are modelled at level 60; data from `scripts/build-youkai-data.mjs`.
import type { SkillRanks, StatKey, StatRecord, Youkai, YoukaiSkill, YoukaiState } from '../types';
import content from '../data/content/youkai.json';
import { SUBRACES } from '../data/races';

// Not imported from `buildEvaluation`, which imports this module: that would be a cycle.
const STAT_KEYS: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

export type { Youkai, YoukaiSkill, YoukaiState };

export const YOUKAI = content.youkai as Youkai[];

const BY_ID = new Map(YOUKAI.map(youkai => [youkai.id, youkai]));
const ASCENDED_BY_BASE = new Map(
  YOUKAI.filter(youkai => youkai.baseFormId).map(youkai => [youkai.baseFormId!, youkai]),
);

export const YOUKAI_RACES = [...new Set(YOUKAI.map(youkai => youkai.race))].sort();

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

/** Install replaces racial base stats "excluding FAI, SAN, and APT". */
export const INSTALL_PRESERVED_STATS: StatKey[] = ['fai', 'san', 'apt'];

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

/** An ascended form replaces its base, and an installed base follows the upgrade. */
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

export function affinitySkillId(race: string): string {
  return `affinity-${race.toLowerCase()}`;
}

/** Capped at +1 while installed, per Install's own wording. */
export function affinityRank(race: string, ranks: SkillRanks, installed = false): number {
  const rank = ranks[affinitySkillId(race)] ?? 0;
  return installed ? Math.min(rank, INSTALLED_AFFINITY_CAP) : rank;
}

/** A stat the wiki lists as 0 stays 0. */
function withAffinity(line: Partial<StatRecord>, bonus: number): Partial<StatRecord> {
  if (bonus === 0) return { ...line };
  return Object.fromEntries(
    Object.entries(line).map(([stat, value]) => [stat, (value ?? 0) > 0 ? (value ?? 0) + bonus : value]),
  ) as Partial<StatRecord>;
}

/** The summon's own line; Install uses the race line instead. */
export function youkaiStats(youkai: Youkai, ranks: SkillRanks, installed = false): Partial<StatRecord> {
  return withAffinity(youkai.stats, affinityRank(youkai.race, ranks, installed));
}

export function evokedSlots(syncMindRank: number): YoukaiSkill['slot'][] {
  if (syncMindRank >= 2) return ['evoke-active', 'evoke-passive'];
  if (syncMindRank >= 1) return ['evoke-active'];
  return [];
}

export const YOUKAI_SLOT_LABEL: Record<YoukaiSkill['slot'], string> = {
  'evoke-active': 'Evoke-Active',
  'evoke-passive': 'Evoke-Passive',
  main: 'Main',
};

export const YOUKAI_SLOT_SOURCE: Record<YoukaiSkill['slot'], string> = {
  'evoke-active': 'Sync-Mind 1',
  'evoke-passive': 'Sync-Mind 2',
  main: 'Install only',
};

export interface GrantedYoukaiSkill extends YoukaiSkill {
  youkaiId: string;
  youkaiName: string;
  via: 'sync-mind' | 'install';
}

/** Sync-Mind covers the evoke slots of every contracted Youkai; Install adds only the installed one's. */
export function grantedYoukaiSkills(state: YoukaiState, ranks: SkillRanks): GrantedYoukaiSkill[] {
  const slots = new Set(evokedSlots(ranks['sync-mind'] ?? 0));
  const granted: GrantedYoukaiSkill[] = [];

  for (const id of state.contracted) {
    const youkai = youkaiById(id);
    if (!youkai) continue;
    const isInstalled = state.installed === id;
    for (const skill of youkai.skills) {
      const viaSync = slots.has(skill.slot);
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

/** Install substitutes the Youkai's race line (Seiryuu gives the Dragon line), not the creature's own stats. */
export function installedBaseStats(
  state: YoukaiState,
  ranks: SkillRanks,
): Partial<StatRecord> | null {
  const youkai = youkaiById(state.installed);
  if (!youkai || !state.contracted.includes(youkai.id)) return null;
  const line = youkaiRaceBaseStats(youkai.race);
  if (!line) return null;
  const stats = { ...line };
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

/** Up to +1 to every stat, FAI/SAN/APT and zero-valued ones included; kept apart so it can't move soft caps or trait checks. */
export function installedAffinityStats(state: YoukaiState, ranks: SkillRanks): Partial<StatRecord> {
  const youkai = youkaiById(state.installed);
  if (!youkai || !state.contracted.includes(youkai.id)) return {};
  const bonus = affinityRank(youkai.race, ranks, true);
  if (!bonus) return {};
  return Object.fromEntries(STAT_KEYS.map(stat => [stat, bonus])) as Partial<StatRecord>;
}

export function canInstall(state: YoukaiState, ranks: SkillRanks): boolean {
  return (ranks.install ?? 0) >= 1 && state.contracted.length > 0;
}

export function emptyYoukaiState(): YoukaiState {
  return { contracted: [], installed: null };
}
