import type { BuildState, ElementKey, PhysicalKey, SkillRanks, StatKey, Youkai } from '../types';
import { effectiveWeaponType } from './equipment';
import { mergeSkillRanks } from './skills';
import { normalizeYoukaiState, youkaiById } from './youkai';

export interface YoukaiNumericBonuses {
  stats: Partial<Record<StatKey, number>>;
  derived: { evadeBase: number; evade: number; criticalEvade: number; luckStatusPercent: number; hpRegeneration: number };
  elementalResistance: Partial<Record<ElementKey, number>>;
  /** Blunt / Pierce / Slash, which a couple of Install skills grant. */
  physicalResistance: Partial<Record<PhysicalKey, number>>;
  weaponPower: number;
}

const emptyNumeric = (): YoukaiNumericBonuses => ({
  stats: {}, derived: { evadeBase: 0, evade: 0, criticalEvade: 0, luckStatusPercent: 0, hpRegeneration: 0 },
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
  // Korvara rule confirmed by the user: Skitterscale is base Evade. The +10
  // creature-only version does not apply to an installed player.
  Skitterscale: [{ kind: 'stat', key: 'def', value: 2 }, { kind: 'derived', key: 'evadeBase', value: 5 }],
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
