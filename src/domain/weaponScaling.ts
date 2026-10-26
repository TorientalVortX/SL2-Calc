import type { StatKey, WeaponConfig } from '../types';
import { SCALING_STATS } from './equipment';

// The wiki's "-10% main stat scaling" etc. are percentage points: Alterated turns Finesse's 70 STR into 60, not 63.
export type ScalingTag = 'Mundane' | 'Alterated' | 'Magical' | 'ShortBody' | 'MasteryOfWeaponArts';

const ALTERATED_ENCHANTMENTS = new Set(['Arcane', 'Envenomed', 'Enflamed']);

const SHORT_BODY_PART = 'Short Body';

const MASTERY_TRAIT = 'mastery-of-weapon-arts';
/** Grants Magical only to the unarmed weapon, which the dataset doesn't include, so it can't fire yet. */
const ARCANE_TATTOO_FIST_TRAIT = 'arcane-tattoo-fist';

export const SCALING_TAG_LABEL: Record<ScalingTag, string> = {
  Mundane: 'the Mundane enchantment',
  Alterated: 'an Alterated enchantment',
  Magical: 'the Magical tag',
  ShortBody: 'the Short Body part',
  MasteryOfWeaponArts: 'Mastery of Weapon Arts',
};

export type ScalingTable = Record<StatKey, number>;

function emptyScaling(): ScalingTable {
  return Object.fromEntries(SCALING_STATS.map(stat => [stat, 0])) as ScalingTable;
}

/** Ties resolve in `SCALING_STATS` order. */
export function mainScalingStat(scaling: Partial<ScalingTable>): StatKey | null {
  let best: StatKey | null = null;
  for (const stat of SCALING_STATS) {
    const value = scaling[stat] ?? 0;
    if (value <= 0) continue;
    if (best === null || value > (scaling[best] ?? 0)) best = stat;
  }
  return best;
}

export function scalingTagsFor(config: Pick<WeaponConfig, 'enchantment' | 'part1' | 'part2' | 'part3'>, traitIds: string[] = []): ScalingTag[] {
  const tags: ScalingTag[] = [];
  const parts = [config.part1, config.part2, config.part3];
  if (parts.includes(SHORT_BODY_PART)) tags.push('ShortBody');
  if (config.enchantment === 'Mundane') tags.push('Mundane');
  else if (ALTERATED_ENCHANTMENTS.has(config.enchantment)) tags.push('Alterated');
  if (traitIds.includes(ARCANE_TATTOO_FIST_TRAIT)) tags.push('Magical');
  if (traitIds.includes(MASTERY_TRAIT)) tags.push('MasteryOfWeaponArts');
  return tags;
}

function reduceMain(scaling: ScalingTable, points: number): void {
  const main = mainScalingStat(scaling);
  if (main) scaling[main] = Math.max(0, scaling[main] - points);
}

/** Order matters: Short Body moves the main stat, Mundane may remove it, Mastery checks for STR last. */
export function applyScalingTags(base: Partial<ScalingTable>, tags: ScalingTag[]): ScalingTable {
  const scaling: ScalingTable = { ...emptyScaling(), ...base };

  if (tags.includes('ShortBody')) {
    const main = mainScalingStat(scaling);
    if (main && main !== 'str') {
      scaling.str += scaling[main];
      scaling[main] = 0;
    }
  }

  if (tags.includes('Mundane')) {
    // "Removes all scaling tags from the weapon, except for purely negative ones."
    for (const stat of SCALING_STATS) if (scaling[stat] > 0) scaling[stat] = 0;
  }

  if (tags.includes('Alterated')) reduceMain(scaling, 10);

  if (tags.includes('Magical')) {
    reduceMain(scaling, 30);
    scaling.wil += 40;
  }

  if (tags.includes('MasteryOfWeaponArts')) {
    // "All weapons you use that do not have STR as their main scaling stat gain
    // +15% STR scaling."
    if (mainScalingStat(scaling) !== 'str') scaling.str += 15;
  }

  return scaling;
}

export function effectiveScaling(config: WeaponConfig, traitIds: string[] = []): ScalingTable {
  return applyScalingTags(config.customScaling, scalingTagsFor(config, traitIds));
}
