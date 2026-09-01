import type { ElementKey } from '../types';
import {
  TALENTS,
  talentModifiers,
  talentsAllowWeapon,
  weaponRarityUnlocks,
  type TalentAllocation,
  type TalentModifier,
} from '../data/talents';

/**
 * Talents, bound to one build.
 *
 * `data/talents.ts` is the catalog and knows nothing about a character;
 * everything here answers a question about *this* build: what its allocation
 * unlocks, what it adds to the sheet, and what it costs.
 *
 * Two rules shape the whole file:
 *
 *   A talent is scoped to the weapon in hand. Blade Expertise's Hit is worth
 *   nothing to an axe build, so every weapon-scoped modifier is filtered against
 *   the equipped weapon rather than summed blindly.
 *
 *   A conditional talent is off until the build says otherwise. Smite only fires
 *   when attacking from the front; counting it by default would put Hit on the
 *   sheet that the character does not have most of the time. These follow the
 *   same opt-in shape as `skillConditionals`.
 */
export interface TalentInput {
  talents?: TalentAllocation;
  /** Conditional subtalents the user has confirmed apply, keyed by subtalent id. */
  talentConditionals?: Record<string, boolean>;
}

/** The wiki names one element differently from the calculator's element keys. */
const ELEMENT_ALIASES: Record<string, ElementKey> = {
  Fire: 'Fire', Ice: 'Ice', Wind: 'Wind', Earth: 'Earth', Water: 'Water',
  Light: 'Light', Lightning: 'Lightning', Sound: 'Sound', Acid: 'Acid',
  Darkness: 'Dark',
};

/**
 * What a build's talents are worth, already multiplied out by rank and filtered
 * to the weapon in hand.
 *
 * Percent-based entries stay percentages: a caller applies them to the figure
 * they modify, because a discount on FP costs and a flat +Hit are not the same
 * kind of number and summing them would be nonsense.
 */
export interface TalentEffects {
  /** Flat Hit. A talent bonus is a buff, so it belongs in the capped channel. */
  hit: number;
  /**
   * Hit that only exists when attacking a target from their front: Chivalry's
   * Smite, and nothing else in the catalog.
   *
   * Kept out of `hit` because the Hit model already has a place for a frontal
   * bonus: the `front` tier, where it is paid out of whatever the +50 cap has
   * left. Feeding it into the general channel instead would credit it to the
   * base and flanked tiers, where the character is by definition not in front of
   * the target, and would then land *beside* the model's own frontal term rather
   * than being it, which is how the same bonus came to be counted twice.
   */
  frontalHit: number;
  critical: number;
  criticalDamagePercent: number;
  power: number;
  scaledWeaponAtk: number;
  /** Battle Weight the equipped weapon sheds. Never takes a weapon below zero. */
  weaponWeightReduction: number;
  /** Extra reach on the equipped weapon, in tiles. */
  attackRange: number;
  maxFp: number;
  fpRegen: number;
  /** Discount on the FP cost of the spell schools the talents cover, as a percent. */
  fpCostPercent: number;
  armor: number;
  magicArmor: number;
  skillPool: number;
  statusInflictionPercent: number;
  maxBattleWeight: number;
  elementalAttack: Partial<Record<ElementKey, number>>;
}

export const NO_TALENT_EFFECTS: TalentEffects = {
  hit: 0, frontalHit: 0, critical: 0, criticalDamagePercent: 0, power: 0, scaledWeaponAtk: 0,
  weaponWeightReduction: 0, attackRange: 0, maxFp: 0, fpRegen: 0, fpCostPercent: 0,
  armor: 0, magicArmor: 0, skillPool: 0, statusInflictionPercent: 0, maxBattleWeight: 0,
  elementalAttack: {},
};

/** True when nothing is allocated, which is the case for almost every build. */
function hasAllocation(allocation: TalentAllocation | undefined): boolean {
  if (!allocation) return false;
  for (const key in allocation) if (allocation[key] > 0) return true;
  return false;
}

/**
 * A Mutation enchantment reports the type it turned into, and it writes Polearm
 * as `Spear`. Both vocabularies mean one weapon type to a talent.
 */
function normalizeWeaponType(weaponType?: string | null): string | null {
  if (!weaponType) return null;
  return weaponType === 'Spear' ? 'Polearm' : weaponType;
}

/**
 * A Hit bonus the wiki gates on attacking from the target's front.
 *
 * Read off the effect text rather than pinned to a subtalent id, so a second one
 * the wiki adds later is routed the same way instead of silently joining the
 * general Hit channel.
 */
function isFrontalHit(stat: string, effect: string): boolean {
  return stat === 'hit' && /\bfrom (?:their|the) front\b/i.test(effect);
}

/**
 * Whether a subtalent's only effect is the frontal Hit bonus.
 *
 * The sheet asks so it can leave off the "count this" switch every other
 * conditional carries: this one is counted on the frontal tier already, and a
 * switch would suggest it is being withheld.
 */
export function isFrontalHitSubtalent(
  subtalent: { effect: string; modifiers: Array<{ stat: string; conditional: boolean }> },
): boolean {
  const conditional = subtalent.modifiers.filter(modifier => modifier.conditional);
  return conditional.length > 0
    && conditional.every(modifier => isFrontalHit(modifier.stat, subtalent.effect));
}

/**
 * Every modifier this build actually gets, unconditional plus the conditional
 * ones it has switched on.
 *
 * Two passes rather than one because `talentModifiers` decides conditionality
 * for the whole call: the unconditional pass is unfiltered, and the conditional
 * pass is then narrowed to the subtalents the build confirmed.
 */
export function activeTalentModifiers(
  build: TalentInput,
  rawWeaponType?: string | null,
): Array<TalentModifier & { rank: number; total: number; subtalentId: string; frontal: boolean }> {
  const allocation = build.talents;
  if (!hasAllocation(allocation)) return [];
  const weaponType = normalizeWeaponType(rawWeaponType);
  const confirmed = build.talentConditionals ?? {};
  const unconditional = talentModifiers(allocation!, { weaponType });
  /*
   * A frontal Hit bonus needs no confirmation: the `front` tier it feeds *is*
   * the condition, so gating it on a switch would hide it from the one tier
   * where it always applies.
   */
  const conditional = talentModifiers(allocation!, { weaponType, includeConditional: true })
    .filter(modifier => modifier.conditional
      && (confirmed[modifier.subtalent.id] || isFrontalHit(modifier.stat, modifier.subtalent.effect)));
  return [...unconditional, ...conditional].map(modifier => ({
    ...modifier,
    subtalentId: modifier.subtalent.id,
    frontal: isFrontalHit(modifier.stat, modifier.subtalent.effect),
  }));
}

export function talentEffects(build: TalentInput, weaponType?: string | null): TalentEffects {
  const modifiers = activeTalentModifiers(build, weaponType);
  if (!modifiers.length) return NO_TALENT_EFFECTS;

  const effects: TalentEffects = { ...NO_TALENT_EFFECTS, elementalAttack: {} };
  for (const modifier of modifiers) {
    const { total } = modifier;
    if (modifier.frontal) {
      effects.frontalHit += total;
      continue;
    }
    switch (modifier.stat) {
      case 'hit': effects.hit += total; break;
      case 'critical': effects.critical += total; break;
      case 'criticalDamage': effects.criticalDamagePercent += total; break;
      case 'power': effects.power += total; break;
      case 'scaledWeaponAtk': effects.scaledWeaponAtk += total; break;
      // Reported positive: it is an amount of weight removed, and the caller
      // subtracts it. `total` is already negative for a reduction.
      case 'battleWeight': effects.weaponWeightReduction += -total; break;
      case 'maxBattleWeight': effects.maxBattleWeight += total; break;
      case 'attackRange': effects.attackRange += total; break;
      case 'maxFp': effects.maxFp += total; break;
      case 'fpRegen': effects.fpRegen += total; break;
      case 'fpCost': effects.fpCostPercent += -total; break;
      case 'armor': effects.armor += total; break;
      case 'magicArmor': effects.magicArmor += total; break;
      case 'skillPool': effects.skillPool += total; break;
      case 'statusInfliction': effects.statusInflictionPercent += total; break;
      case 'elementAtk': {
        const element = modifier.element ? ELEMENT_ALIASES[modifier.element] : undefined;
        if (element) effects.elementalAttack[element] = (effects.elementalAttack[element] ?? 0) + total;
        break;
      }
      // Everything else (Farshot range, durability wear, the item belt, HP and
      // FP the character hands out or drains) has no place on the stat sheet
      // and stays readable on the talent itself.
      default: break;
    }
  }
  return effects;
}

/**
 * Whether the build may equip this weapon, given its classes already refused it.
 *
 * Adaptation is the game's only route to a weapon outside a class roster, and it
 * is a rarity cap rather than a blanket unlock, so a Rank 2 Adaptation opens
 * Rarity 4 and nothing above it.
 */
export function talentsUnlockWeapon(
  build: TalentInput,
  weaponType: string | null | undefined,
  rarity: number,
): boolean {
  if (!hasAllocation(build.talents)) return false;
  return talentsAllowWeapon(weaponType, rarity, build.talents!);
}

/** The rarity ceiling talents open per weapon type; empty when none are taken. */
export function talentWeaponUnlocks(build: TalentInput): Record<string, number> {
  if (!hasAllocation(build.talents)) return {};
  return weaponRarityUnlocks(build.talents!);
}

/** Ranks dropped to zero are removed, so an allocation never carries dead keys. */
export function setSubtalentRank(
  allocation: TalentAllocation | undefined,
  subtalentId: string,
  rank: number,
): TalentAllocation {
  const next = { ...(allocation ?? {}) };
  const subtalent = TALENTS.flatMap(talent => talent.subtalents).find(entry => entry.id === subtalentId);
  if (!subtalent) return next;
  const clamped = Math.max(0, Math.min(Math.floor(rank), subtalent.maxSr));
  if (clamped === 0) delete next[subtalentId];
  else next[subtalentId] = clamped;
  return next;
}
