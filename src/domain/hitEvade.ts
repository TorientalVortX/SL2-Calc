import type { Armor } from '../types';

/**
 * Hit versus Evade.
 *
 * Transcribed from the community Hit/Evade workbook's cell formulas; see
 * `optimizer-knowledge/01-core-mechanics/hit-and-evade-model.md` and the copy at
 * `reference/hitEvade/hit-evade-sheet.xlsx`. The ordering is the whole point: the
 * wiki states none of it, and every step below is one the sheet is explicit about
 * and that changes the answer if moved.
 *
 * Two orderings in particular are easy to get wrong, and both are covered by
 * tests that reproduce the sheet's own worked example:
 *
 * - The bonus multiplier reads the **pre-bonus** running total, so Bonus Hit and
 *   Bonus Evade never compound on themselves.
 * - Honor is paid out of whatever Bonus Hit headroom the cap leaves, not added on
 *   top of the cap.
 */

/** Per-scaled-point and per-slot constants, all named by the sheet. */
export const HIT_PER_SKI = 2;
export const EVADE_PER_CEL = 2;
export const FLANKING_BASE = 5;
export const FLANKING_PER_GUI = 0.5;
/** Share of the Flanking stat granted per positional condition met. */
export const FLANKING_PER_CONDITION = 0.5;
/**
 * The frontal Hit bonus at its maximum, which is Chivalry's Smite at subtalent
 * rank 5, 3 Hit a rank. The workbook hard-codes the 15 because it predates the
 * wiki documenting talents; `evaluateBuild` passes the build's real rank now.
 */
export const HONOR_HIT_BONUS = 15;
export const BONUS_HIT_CAP = 50;
export const BONUS_EVADE_CAP = 50;
export const BLIND_HIT_CAP = 75;
export const MINIMUM_HIT_CHANCE = 5;
/**
 * The ceiling on a final hit chance.
 *
 * The workbook has no explicit one. It clamps only where it converts a chance into
 * a probability (`MIN(1, chance/100)`), so its Hit-versus-Evade cell can read 160
 * against a low-Evade target. That is a *margin*, not a chance, and showing it as
 * "160%" invites the reader to think there is something above certainty to buy.
 * The margin is reported separately, so nothing is lost by capping the chance.
 */
export const MAXIMUM_HIT_CHANCE = 100;
export const FEAR_HIT_PENALTY = 15;
/** Bravery's ceiling on how much of the Fear penalty can be shrugged off. */
export const MAX_FEAR_RESISTANCE = 0.48;
/** Evade lost to being Knocked Down, as a fraction, by torso class. */
export const KNOCKED_DOWN_EVADE_PENALTY: Record<Armor['type'], number> = {
  Unarmored: 0.12,
  Light: 0.25,
  Heavy: 0.37,
};

export interface AttackerHitInput {
  /** `2 x scaled SKI + weapon Hit`, plus anything else that raises *base* Hit. */
  baseHit: number;
  /**
   * Field-object Hit, as a net figure.
   *
   * Added to base and exempt from the bonus cap; the sheet is explicit that
   * field Hit stacks additively and is not capped, unlike field Evade.
   */
  fieldModifier?: number;
  /** Halves the running total. */
  brokenWeapon?: boolean;
  /** Multiplier on base Hit; 1 is default. Close Shot is the stated use. */
  baseMultiplier?: number;
  /** Fraction of the pre-bonus total granted as Bonus Hit; 0 is default. */
  bonusMultiplier?: number;
  /** Flat Bonus Hit sources, excluding Honor. May exceed the cap; it is applied. */
  hitBuffs?: number;
  /**
   * The frontal Hit bonus this attacker actually has, before the cap.
   *
   * The workbook writes it as a flat 15, which is Chivalry's Smite at its
   * maximum subtalent rank. The source table says as much with "(max SR)". A
   * character with fewer ranks has less of it and one without the talent has
   * none, so a caller that knows the build passes its real figure. Defaults to
   * the workbook's max-rank value for callers that do not model talents.
   */
  honorHitBonus?: number;
  hitDebuffs?: number;
  /** Feared *by the attack target*, which costs Hit. */
  feared?: boolean;
  /** Bravery's reduction of the Fear penalty, as a fraction. */
  fearResistance?: number;
  /** `FLANKING_BASE + FLANKING_PER_GUI x scaled GUI`. */
  flanking: number;
}

export interface TargetEvadeInput {
  /** `2 x scaled CEL + armour Evade + legs upgrades`, plus other *base* Evade. */
  baseEvade: number;
  /** Multiplier on base Evade; 1 is default. Guard and terrain apply here. */
  baseMultiplier?: number;
  /** Fraction of base Evade granted as Bonus Evade; 0 is default. */
  bonusMultiplier?: number;
  evadeBuffs?: number;
  evadeDebuffs?: number;
  /** Field Evade: a *bonus* modifier that does count toward the cap. */
  fieldBuffs?: number;
  fieldDebuffs?: number;
  knockedDown?: boolean;
  /** Torso class, which sets the Knocked Down penalty. */
  armorType?: Armor['type'];
}

/** Which positional bonuses an attack collects. */
export type HitTier = 'base' | 'front' | 'flank1' | 'flank2';

export const HIT_TIERS: HitTier[] = ['base', 'front', 'flank1', 'flank2'];

export const HIT_TIER_LABEL: Record<HitTier, string> = {
  base: 'Base',
  front: 'Front (Honor)',
  flank1: 'Flanked',
  flank2: 'Flanked + ally adjacent',
};

export const HIT_TIER_HINT: Record<HitTier, string> = {
  base: 'Attacking a target who is not flanked, from a tile that is not directly in front of them.',
  front: 'Attacking from the tile the target faces, which Honor pays for out of the remaining Bonus Hit cap.',
  flank1: 'Behind the target, or from the side while an ally is within 1 Range.',
  flank2: 'Behind the target and an ally within 1 Range: both flanking conditions.',
};

export interface AttackerHit {
  /** Base Hit after the field modifier, broken weapon and the base multiplier. */
  preBonus: number;
  /** Bonus Hit actually applied, after the cap and the Fear penalty. */
  bonusHit: number;
  /** Bonus Hit headroom Honor can still be paid out of. */
  honorHeadroom: number;
  /** Hit at each positional tier, before the target's Evade. */
  byTier: Record<HitTier, number>;
}

export interface TargetEvade {
  /** Base Evade after its multiplier; the figure Bonus Evade is computed from. */
  preBonus: number;
  bonusEvade: number;
  total: number;
}

/**
 * Caps the bonus channel.
 *
 * Both Hit and Evade have a base channel that is uncapped and a bonus channel
 * capped at 50. The calculator used to add every source into one uncapped total,
 * which let a build show Evade no character can actually reach.
 */
export function applyBonusCap(bonus: number, cap: number): number {
  return Math.min(bonus, cap);
}

export function attackerHit(input: AttackerHitInput): AttackerHit {
  const afterField = input.baseHit + (input.fieldModifier ?? 0);
  const afterBroken = input.brokenWeapon ? afterField - afterField / 2 : afterField;
  const preBonus = afterBroken * (input.baseMultiplier ?? 1);

  const fearPenalty = input.feared
    ? FEAR_HIT_PENALTY * (1 - Math.max(0, Math.min(MAX_FEAR_RESISTANCE, input.fearResistance ?? 0)))
    : 0;
  /*
   * The cap governs the bonus *sources*; Fear is subtracted afterwards. Folding
   * the penalty in before the cap would let a build with a large buff total
   * absorb Fear for free, since the cap would clip the sum either way.
   */
  const cappedBonus = applyBonusCap(
    preBonus * (input.bonusMultiplier ?? 0) + (input.hitBuffs ?? 0) - (input.hitDebuffs ?? 0),
    BONUS_HIT_CAP,
  );
  const bonusHit = cappedBonus - fearPenalty;
  const rolling = preBonus + bonusHit;

  // Honor spends what the cap has left, so a build already at +50 gains nothing.
  const honor = input.honorHitBonus ?? HONOR_HIT_BONUS;
  const honorHeadroom = Math.max(0, Math.min(BONUS_HIT_CAP - cappedBonus, honor));
  const flankBonus = (conditions: number) => conditions * FLANKING_PER_CONDITION * input.flanking;

  return {
    preBonus,
    bonusHit,
    honorHeadroom,
    byTier: {
      base: rolling,
      front: rolling + honorHeadroom,
      flank1: rolling + flankBonus(1),
      flank2: rolling + flankBonus(2),
    },
  };
}

export function targetEvade(input: TargetEvadeInput): TargetEvade {
  const knockdown = input.knockedDown && input.armorType
    ? KNOCKED_DOWN_EVADE_PENALTY[input.armorType]
    : 0;
  // Knocked Down lands on the base multiplier, per the sheet, rather than as a
  // flat subtraction, so it scales with how much Evade there was to lose.
  const preBonus = input.baseEvade * ((input.baseMultiplier ?? 1) - knockdown);
  const bonusEvade = applyBonusCap(
    preBonus * (input.bonusMultiplier ?? 0)
      + (input.evadeBuffs ?? 0) - (input.evadeDebuffs ?? 0)
      + (input.fieldBuffs ?? 0) - (input.fieldDebuffs ?? 0),
    BONUS_EVADE_CAP,
  );
  return { preBonus, bonusEvade, total: preBonus + bonusEvade };
}

/**
 * `Hit − Evade` as a percentage, bounded.
 *
 * Floored at 5, capped at 75 while the attacker is Blind, and at 100 otherwise.
 * The unbounded difference is what the caller should show alongside it; that is
 * the number that keeps moving once a bound is reached.
 */
export function hitChance(hit: number, evade: number, blind = false): number {
  const raw = hit - evade;
  const ceiling = blind ? BLIND_HIT_CAP : MAXIMUM_HIT_CHANCE;
  return Math.max(MINIMUM_HIT_CHANCE, Math.min(raw, ceiling));
}

export interface InstanceOdds {
  /** At least one instance lands cleanly. */
  anyHit: number;
  /** At least one instance lands or glances. */
  anyGlance: number;
  /** Half or more land cleanly. */
  halfHit: number;
  /** Half or more land or glance. */
  halfGlance: number;
  allHit: number;
  allGlance: number;
}

/**
 * `n choose k`.
 *
 * Built up multiplicatively rather than from factorials so the intermediates stay
 * small: instance counts are tiny, but `21!` is already past exact integers.
 */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const step = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= step; i += 1) result = result * (n - step + i) / i;
  return result;
}

/** `P(X <= k)` for `X ~ Binomial(n, p)`. */
function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let total = 0;
  for (let i = 0; i <= Math.floor(k); i += 1) {
    total += choose(n, i) * p ** i * (1 - p) ** (n - i);
  }
  return total;
}

/**
 * Odds across `instances` rolls at a given hit chance.
 *
 * A miss rolls a second time for a glancing blow, which is why every glance
 * figure uses `2n` trials rather than `n`: two chances per instance.
 *
 * Basic Fist attacks are 2 instances; Guns are one per round.
 *
 * **Deliberate divergence from the source workbook**, at odd instance counts. The
 * sheet writes the "half or more" threshold as `BINOMDIST((n/2) - 1, ...)`, and
 * Excel truncates that first argument to an integer, so at three instances it
 * asks for `P(X > 0)`, reporting the odds of *one* hit under a column labelled
 * "Half+". Three instances need two. `Math.ceil(n / 2)` is used instead, which
 * agrees with the sheet at every even count and at one, and fixes the odd ones.
 */
export function instanceOdds(chancePercent: number, instances = 1): InstanceOdds {
  const p = Math.max(0, Math.min(1, chancePercent / 100));
  const n = Math.max(1, Math.floor(instances));
  // "Half or more" of an odd count rounds up: 2 of 3, 3 of 5.
  const threshold = Math.ceil(n / 2);
  return {
    anyHit: 1 - (1 - p) ** n,
    anyGlance: 1 - (1 - p) ** (n * 2),
    halfHit: 1 - binomialCdf(threshold - 1, n, p),
    halfGlance: 1 - binomialCdf(threshold - 1, n * 2, p),
    allHit: p ** n,
    allGlance: (1 - (1 - p) ** 2) ** n,
  };
}
