import type {
  BuildEvaluation,
  GauntletMatchup,
  OpponentStatline,
  OptimizationDamageReport,
  OptimizationGauntletReport,
  StatRecord,
} from '../types';
import { ALL_WEAPONS } from '../data/weapons';
import { ENABLED_OPTIMIZER_REFERENCE_PROFILES } from '../data/optimizerProfiles';
import { statusImmunitiesForSubrace } from '../data/statuses';
import { scaledStatContribution } from './weaponCalculation';

/*
 * The community reference profiles, read as opponents instead of templates.
 *
 * The profiles carry scaled stat targets transcribed from build screenshots.
 * Used as templates they can only say "look like this build"; used as opponents
 * they answer the question the optimizer is actually asked in PvP: can the
 * candidate hit, hurt, and survive what players field. Every derived number
 * below uses the calculator's own formulas (see
 * optimizer-knowledge/01-core-mechanics/calculator-model-and-public-comparison.md),
 * so the arithmetic is calculator-verified while the inputs stay `community`.
 *
 * What the transcription cannot support is left out and declared: the opponents'
 * gear Evade, flat Armor, skills, traits, and rotations are unknown, which is why
 * Evade is a floor-to-ceiling band and HP is a floor.
 */

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clampChance = (value: number) => Math.max(0, Math.min(100, value));

/** The +50 cap on ordinary bonus Evade, per the calculator and the wiki. */
const BONUS_EVADE_CAP = 50;
/** Allocated points at the level-60 planning default every profile uses. */
const LEVEL_60_POINTS = 240;

/*
 * Normalizers for the 0–1 matchup blend. Ranking scales, not game facts: they
 * put post-mitigation damage and hits-survived on the same footing as the
 * bounded chance terms so no single margin swamps the blend.
 */
const DAMAGE_SCALE = 150;
const HITS_SURVIVED_SCALE = 8;

function target(targets: Partial<StatRecord>, stat: keyof StatRecord): number {
  return targets[stat] ?? 0;
}

function buildStatline(profile: (typeof ENABLED_OPTIMIZER_REFERENCE_PROFILES)[number]): OpponentStatline {
  const targets = profile.scaledStatTargets;
  const caveats: string[] = [
    'Derived from community screenshot stat targets; gear, skills, traits, and rotations are unknown.',
  ];
  const weapon = profile.canonicalWeaponId ? ALL_WEAPONS.find(item => item.id === profile.canonicalWeaponId) : undefined;
  /*
   * The scaling contribution mirrors `evaluateWeaponSlot`: each scaling stat
   * contributes its scaled value times the stated percentage. Without a
   * canonical record the weapon's own Power and Accuracy are unknown, so Hit is
   * omitted entirely rather than invented, and the SWA proxy is scaling only.
   */
  const scalingContribution = scaledStatContribution(
    Object.fromEntries(Object.keys(profile.weapon.scaling).map(stat => [stat, target(targets, stat as keyof StatRecord)])),
    profile.weapon.scaling,
  );
  if (!weapon) caveats.push(`No canonical record for ${profile.weapon.name}; Hit is unknown and the SWA proxy omits weapon Power.`);
  /*
   * From the status catalog, keyed by subrace, e.g. a Salamandra opponent
   * cannot be Burned. The generic infliction margin cannot honour these, so
   * they are surfaced for the reader instead of silently ignored.
   */
  const statusImmunities = statusImmunitiesForSubrace(profile.subrace);
  if (statusImmunities.length) caveats.push(`${profile.subrace} cannot be inflicted with ${statusImmunities.join(', ')}; the generic status margin does not model this.`);
  return {
    profileId: profile.id,
    name: profile.name,
    archetype: profile.archetype,
    evadeFloor: Math.floor(2 * target(targets, 'cel')),
    evadeCeiling: Math.floor(2 * target(targets, 'cel')) + BONUS_EVADE_CAP,
    physicalDefense: Math.floor(0.9 * target(targets, 'def')),
    magicalDefense: Math.floor(0.9 * target(targets, 'res')),
    criticalEvade: Math.floor(target(targets, 'fai') + target(targets, 'luc')),
    statusInfliction: Math.floor(2 * target(targets, 'ski') + target(targets, 'wil')),
    statusResistance: Math.floor(2 * target(targets, 'san') + target(targets, 'fai')),
    hpFloor: Math.floor(10 * target(targets, 'vit')) + Math.floor(2 * target(targets, 'san')) + LEVEL_60_POINTS,
    hit: weapon ? Math.floor(2 * target(targets, 'ski')) + weapon.accuracy : undefined,
    swaProxy: (weapon?.power ?? 0) + scalingContribution,
    statusImmunities,
    caveats,
  };
}

export const OPPONENT_STATLINES: OpponentStatline[] = ENABLED_OPTIMIZER_REFERENCE_PROFILES.map(buildStatline);

/**
 * The roster a request's id filter selects.
 *
 * Unknown ids are dropped rather than erroring (a profile can be disabled or
 * renamed after a request was saved), and a filter that matches nothing falls
 * back to the full roster, because "score against no one" is never what a
 * counter-build request meant.
 */
export function opponentsForIds(ids?: string[]): OpponentStatline[] {
  if (!ids?.length) return OPPONENT_STATLINES;
  const wanted = new Set(ids);
  const selected = OPPONENT_STATLINES.filter(opponent => wanted.has(opponent.profileId));
  return selected.length ? selected : OPPONENT_STATLINES;
}

export const GAUNTLET_CAVEAT = 'Gauntlet margins use the community hit model (Hit − Evade) and percentage mitigation only; '
  + 'opponent gear, flat Armor, skills, and rotations are not transcribed. Scores rank candidates within one search and are not win-rate predictions.';

/**
 * The candidate's modeled damage into one opponent's percentage mitigation.
 *
 * Each contracted skill keeps its own split: the SWA share is reduced by the
 * opponent's physical defense, the elemental share by their magical defense and
 * the SAN-derived elemental resistance the statline can support. Flat Armor and
 * Magic Armor are unknown and deliberately not estimated, so this is a ceiling
 * on a per-hit basis. The caveat says so.
 */
function damageInto(opponent: OpponentStatline, evaluation: BuildEvaluation, damageReport?: OptimizationDamageReport): number {
  const physicalFactor = 1 - opponent.physicalDefense / 100;
  const magicalFactor = 1 - opponent.magicalDefense / 100;
  if (!damageReport?.skills.length) return (evaluation.primaryWeapon?.power ?? 0) * physicalFactor;
  /*
   * SAN grants floor(SAN/6)% resistance to the eight common elements; Sound and
   * Acid are outside it. The opponent's per-element gear resists are unknown.
   */
  const sanTargets = OPPONENT_PROFILE_SAN.get(opponent.profileId) ?? 0;
  const sanResist = Math.floor(sanTargets / 6) / 100;
  let weightTotal = 0;
  let total = 0;
  for (const skill of damageReport.skills) {
    const weight = Math.max(0, skill.weight);
    const elementalFactor = skill.element === 'Sound' || skill.element === 'Acid'
      ? magicalFactor
      : magicalFactor * (1 - sanResist);
    total += (skill.weaponPowerContribution * physicalFactor + skill.elementalContribution * elementalFactor) * weight;
    weightTotal += weight;
  }
  return total / Math.max(1, weightTotal);
}

/*
 * Scaled SAN per opponent, kept beside the statlines because elemental
 * resistance needs it but the statline's public fields already carry SAN only
 * inside status resistance.
 */
const OPPONENT_PROFILE_SAN = new Map(
  ENABLED_OPTIMIZER_REFERENCE_PROFILES.map(profile => [profile.id, profile.scaledStatTargets.san ?? 0]),
);

function matchup(opponent: OpponentStatline, evaluation: BuildEvaluation, damageReport?: OptimizationDamageReport): GauntletMatchup {
  const candidateHit = evaluation.primaryWeapon?.hit ?? 0;
  const hitChanceVsReliable = clampChance(candidateHit - opponent.evadeFloor);
  const hitChanceVsCeiling = clampChance(candidateHit - opponent.evadeCeiling);
  const damagePerHit = damageInto(opponent, evaluation, damageReport);
  const effectiveDamage = damagePerHit * hitChanceVsCeiling / 100;
  const statusInflictChance = clampChance(evaluation.derived.statusInfliction - opponent.statusResistance);
  const statusAvoidChance = 100 - clampChance(opponent.statusInfliction - evaluation.derived.statusResistance);

  let incomingHitChance: number | undefined;
  let incomingDamagePerHit: number | undefined;
  let hitsSurvived: number | undefined;
  if (opponent.hit !== undefined) {
    incomingHitChance = clampChance(opponent.hit - evaluation.derived.evade);
    /*
     * The profiles are weapon builds, so their SWA proxy is treated as physical
     * damage into the candidate's physical defense. A caster opponent would need
     * a transcribed rotation before this could say anything else.
     */
    incomingDamagePerHit = opponent.swaProxy * (1 - evaluation.derived.physicalDefense / 100);
    hitsSurvived = evaluation.derived.maxHP / Math.max(1, incomingDamagePerHit);
  }

  /*
   * Offense wants both landing and hurting, so the two are multiplied rather
   * than averaged: 100% hit chance into zero damage is worth nothing, and so is
   * the reverse. Defense blends not-being-hit with absorbing what does land.
   * Status stays mostly defensive: every build must avoid statuses, only status
   * builds need to inflict them.
   */
  const offense = (hitChanceVsCeiling / 100) * clamp01(damagePerHit / DAMAGE_SCALE);
  const defense = incomingHitChance !== undefined && hitsSurvived !== undefined
    ? (1 - incomingHitChance / 100) * 0.6 + clamp01(hitsSurvived / HITS_SURVIVED_SCALE) * 0.4
    : clamp01((evaluation.derived.physicalDefense + evaluation.derived.magicalDefense) / 100);
  const status = statusAvoidChance / 100 * 0.7 + statusInflictChance / 100 * 0.3;
  const score = clamp01(offense * 0.4 + defense * 0.4 + status * 0.2);

  return {
    opponentId: opponent.profileId,
    opponentName: opponent.name,
    hitChanceVsReliable,
    hitChanceVsCeiling,
    damagePerHit,
    effectiveDamage,
    incomingHitChance,
    incomingDamagePerHit,
    hitsSurvived,
    statusInflictChance,
    statusAvoidChance,
    score,
  };
}

/**
 * Scores one build evaluation against the whole opponent roster.
 *
 * The evaluation should be the *reliable* scenario the defense contract already
 * ranks with (unverified conditionals and configured bonus Evade excluded), so
 * the gauntlet cannot be passed by numbers the build only sometimes has.
 */
export function evaluateGauntlet(
  evaluation: BuildEvaluation,
  damageReport?: OptimizationDamageReport,
  opponents: OpponentStatline[] = OPPONENT_STATLINES,
): OptimizationGauntletReport {
  const rows = opponents.map(opponent => matchup(opponent, evaluation, damageReport));
  const aggregateScore = rows.length ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : 0;
  const weakest = rows.reduce<GauntletMatchup | undefined>(
    (worst, row) => (!worst || row.score < worst.score ? row : worst),
    undefined,
  );
  return {
    opponents: rows,
    aggregateScore,
    weakestOpponentId: weakest?.opponentId,
    caveat: GAUNTLET_CAVEAT,
  };
}
