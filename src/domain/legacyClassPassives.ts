import { skillById } from './skills';
import type { SkillRanks } from '../types';

// Import-only compatibility for the removed class-panel sliders. All live
// bonuses now come from skills. Bard's obsolete SAN slider has no corresponding
// skill in the current catalog and must not recreate an unsupported bonus.
const LEGACY_SKILLS: Record<string, string> = {
  Arbalest: 'honed-shot',
  'Black Knight': 'iron-wall',
  Bonder: 'symbol-of-trust',
  'Dark Bard': 'dark-bard-s-pledge',
  Engineer: 'pure-genius',
  Evoker: 'spiritual-domination',
  Ghost: 'anti-curse',
  Hexer: 'walk-in-darkness',
  Kensei: 'peerless',
  'Lantern Bearer': 'warding-light',
  'Magic Gunner': 'exposure-tolerance',
  Monk: 'discipline',
  Priest: 'piety',
  Solblader: 'illuminating-sol',
  Tactician: 'always-learning',
  'Void Assassin': 'black-and-blue',
};

export function migrateLegacyClassPassives(
  value: Record<string, unknown>,
  ranks: { main: SkillRanks; sub: SkillRanks },
): { main: SkillRanks; sub: SkillRanks } {
  const result = { main: { ...ranks.main }, sub: { ...ranks.sub } };
  const raw = value.skillRanks as Record<string, Record<string, unknown> | undefined> | undefined;
  for (const slot of ['main', 'sub'] as const) {
    const className = String(value[`${slot}Class`] ?? '');
    const id = LEGACY_SKILLS[className];
    const skill = id ? skillById(id) : undefined;
    const saved = value[`${slot}ClassPassive`];
    if (!skill || typeof saved !== 'number' || !Number.isFinite(saved) || saved <= 0) continue;
    // A selected skill (even an explicit zero) is authoritative in either slot.
    if (Object.prototype.hasOwnProperty.call(raw?.main ?? {}, id)
      || Object.prototype.hasOwnProperty.call(raw?.sub ?? {}, id)) continue;
    // The old +6 sliders represented rank-five skills with a capstone +1.
    const rank = Math.min(skill.maxRank, Math.floor(saved));
    if (rank <= 0) continue;
    const existingSlot = result.main[id] ? 'main' : result.sub[id] ? 'sub' : slot;
    result[existingSlot][id] = Math.max(result[existingSlot][id] ?? 0, rank);
  }
  return result;
}
