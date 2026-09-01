import type { StatKey, WeaponConfig } from '../types';
import { SCALING_STATS } from './equipment';

/**
 * Effects that rewrite a weapon's scaling tags.
 *
 * Scaling used to be read straight off weapon data and the manual override, so
 * every effect that *changes* a tag was silently ignored: a `Mundane` weapon
 * returned byte-identical SWA to an unenchanted one, despite Mundane's whole
 * purpose being to strip its scaling. That mattered more once the SWA multiplier
 * landed, because the multiplier magnifies whatever the tags say.
 *
 * ## Percentage points, not relative percentages
 *
 * The wiki states these as "-10% main stat scaling", "-30% Main Stat, +40% WIL",
 * "+15% STR scaling". Read as percentage *points* against a scale where a plain
 * weapon is `100% STR` and Finesse is `70% STR / 30% SKI`: Alterated turns a
 * Finesse weapon's 70 into 60, not into 63. A relative reading would make the
 * Magical tag's "-30%" nearly harmless on a low-scaling weapon and brutal on a
 * high one, which is not how any of the surrounding numbers behave.
 *
 * ## The main stat
 *
 * "Main scaling stat" is the one with the highest percentage. Ties resolve in
 * `SCALING_STATS` order so the result is deterministic; a real weapon does not
 * have two equal-highest tags.
 */

/** A named tag transform, in the order the rules are applied. */
export type ScalingTag = 'Mundane' | 'Alterated' | 'Magical' | 'ShortBody' | 'MasteryOfWeaponArts';

/** Enchantments that grant the Alterated tag as a side effect of their real effect. */
const ALTERATED_ENCHANTMENTS = new Set(['Arcane', 'Envenomed', 'Enflamed']);

/** The part that repoints a weapon's primary scaling at STR. */
const SHORT_BODY_PART = 'Short Body';

/** Trait ids that rewrite scaling. */
const MASTERY_TRAIT = 'mastery-of-weapon-arts';
/**
 * Arcane Tattoo (Fist) grants the Magical tag, but only to the *unarmed* weapon,
 * and the calculator models no unarmed weapon (there is no `Basic Fists` in the
 * 339-weapon dataset). The transform exists because it is the same machinery, and
 * fires the moment an unarmed weapon is added; it cannot fire today.
 */
const ARCANE_TATTOO_FIST_TRAIT = 'arcane-tattoo-fist';

/**
 * What to call each tag in the interface.
 *
 * Named by the *source* the reader chose rather than the internal tag: nobody
 * picks "Alterated", they pick the Arcane enchantment and get it as a side effect.
 * `Alterated` is shared by three enchantments, so it stays generic.
 */
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

/** The stat carrying the highest percentage, or null when nothing scales. */
export function mainScalingStat(scaling: Partial<ScalingTable>): StatKey | null {
  let best: StatKey | null = null;
  for (const stat of SCALING_STATS) {
    const value = scaling[stat] ?? 0;
    if (value <= 0) continue;
    if (best === null || value > (scaling[best] ?? 0)) best = stat;
  }
  return best;
}

/** Which tags an equipped configuration and trait list produce. */
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

/**
 * Takes points off the main stat, floored at zero.
 *
 * These tags *reduce* a weapon's main scaling; they do not grant a negative tag.
 * Letting the subtraction run past zero would make the stat actively harmful: a
 * 5% STR weapon under Alterated would start losing SWA for every point of STR,
 * which is not what "-10% main stat scaling" says. Unreachable from weapon data
 * alone (the lowest main scaling in the dataset is 40%) but reachable through the
 * manual scaling override, which is exactly where a guard earns its place.
 */
function reduceMain(scaling: ScalingTable, points: number): void {
  const main = mainScalingStat(scaling);
  if (main) scaling[main] = Math.max(0, scaling[main] - points);
}

/**
 * Applies scaling tags to a table, in a fixed order.
 *
 * The order is load-bearing wherever two rules read "the main stat": Short Body
 * moves it, so it goes first; Mundane can remove it entirely, so it goes before
 * anything that reduces it; and Mastery is last because it asks whether the main
 * stat is STR *after* everything else has had its say.
 */
export function applyScalingTags(base: Partial<ScalingTable>, tags: ScalingTag[]): ScalingTable {
  const scaling: ScalingTable = { ...emptyScaling(), ...base };

  if (tags.includes('ShortBody')) {
    // The primary tag is repointed at STR rather than duplicated: the part changes
    // which stat the weapon reads, it does not add a second scaling source.
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
    // +15% STR scaling." Asked after the other tags, since they can move the main
    // stat onto or off STR.
    if (mainScalingStat(scaling) !== 'str') scaling.str += 15;
  }

  return scaling;
}

/**
 * A weapon's scaling as actually used, after every tag-rewriting effect.
 *
 * The single entry point, so the weapon workspace, the build evaluation and the
 * optimizer cannot disagree about what a Mundane weapon scales off.
 */
export function effectiveScaling(config: WeaponConfig, traitIds: string[] = []): ScalingTable {
  return applyScalingTags(config.customScaling, scalingTagsFor(config, traitIds));
}
