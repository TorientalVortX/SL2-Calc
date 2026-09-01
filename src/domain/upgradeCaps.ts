import type { Armor, ArmorUpgradePoints, GameWorld, WeaponUpgradePoints } from '../types';

/**
 * Per-channel ceilings on upgrade investment.
 *
 * Upgrade points used to be bounded only by being non-negative, which let a
 * build show numbers no real item can reach, and hid the fact that the ceiling
 * is not the same for every item. Armour is the clear case: the Evade a torso
 * can gain from upgrades depends on its class, so Unarmored and Heavy are not
 * interchangeable at the same spend.
 *
 * `null` means "no ceiling is recorded for this channel", not "unlimited in the
 * game". A channel with no sourced number is left alone rather than guessed at,
 * so the UI shows a spend with no cap instead of a cap that is wrong. Filling one
 * in is a one-line change to the table below.
 */
export type UpgradeCapTable<Points> = { [K in keyof Points]: number | null };

/**
 * What a torso can buy in each channel, per armour class.
 *
 * Sourced from play; the wiki dumps carry no upgrade ceilings at all. The three
 * classes trade the same total across different channels (16 points each), which
 * is why Heavy's Evade ceiling could not be interpolated from the other two when
 * only the Evade column was known: the pattern is a rotation, not a slope.
 *
 * | Class      | Armor | Magic Armor | Evade |
 * | ---------- | ----- | ----------- | ----- |
 * | Heavy      | 8     | 5           | 3     |
 * | Light      | 5     | 7           | 4     |
 * | Unarmored  | 3     | 5           | 8     |
 *
 * Three channels, because a torso has no durability: unlike a weapon, which has
 * all four.
 */
const ARMOR_CAPS: Record<Armor['type'], Pick<ArmorUpgradePoints, 'armor' | 'magicArmor' | 'evade'>> = {
  Heavy: { armor: 8, magicArmor: 5, evade: 3 },
  Light: { armor: 5, magicArmor: 7, evade: 4 },
  Unarmored: { armor: 3, magicArmor: 5, evade: 8 },
};

/**
 * The default world.
 *
 * Korvara, which is the stricter of the two: G6 raises every ceiling by one, so
 * defaulting there would let a Korvara build quietly hold a spend it cannot have.
 * A G6 player sees a ceiling one too low and flips the toggle; the reverse mistake
 * is silent. One line to change if the balance of players is the other way.
 */
export const DEFAULT_WORLD: GameWorld = 'Korvara';

/** G6 raises every recorded ceiling by one. */
const G6_CEILING_BONUS = 1;

function withWorldBonus(limit: number | null, world: GameWorld): number | null {
  if (limit === null) return null;
  return world === 'G6' ? limit + G6_CEILING_BONUS : limit;
}

/**
 * What a weapon can buy in each channel.
 *
 * Five apiece, the same across every weapon type: unlike armour, which trades a
 * fixed total across its channels by class.
 */
const WEAPON_CAPS: WeaponUpgradePoints = {
  power: 5,
  critical: 5,
  accuracy: 5,
  durability: 5,
};

export function armorUpgradeCaps(
  armorType: Armor['type'] | undefined,
  world: GameWorld = DEFAULT_WORLD,
): UpgradeCapTable<ArmorUpgradePoints> {
  // No armour class means no recorded ceiling: an unknown torso is not capped
  // against a guess at which class it belongs to.
  const caps = armorType ? ARMOR_CAPS[armorType] : undefined;
  return {
    armor: withWorldBonus(caps?.armor ?? null, world),
    magicArmor: withWorldBonus(caps?.magicArmor ?? null, world),
    evade: withWorldBonus(caps?.evade ?? null, world),
  };
}

export function weaponUpgradeCaps(world: GameWorld = DEFAULT_WORLD): UpgradeCapTable<WeaponUpgradePoints> {
  return {
    power: withWorldBonus(WEAPON_CAPS.power, world),
    critical: withWorldBonus(WEAPON_CAPS.critical, world),
    accuracy: withWorldBonus(WEAPON_CAPS.accuracy, world),
    durability: withWorldBonus(WEAPON_CAPS.durability, world),
  };
}

/**
 * Clamps a spend into `[0, cap]`, or just to non-negative when there is no cap.
 *
 * A non-finite input lands on zero rather than propagating: these values come
 * from number inputs, and an emptied field parses as `NaN`. `Math.max(0, NaN)` is
 * `NaN`, which would then be stored on the build and travel into every derived
 * figure that reads the slot.
 */
export function clampUpgradePoint(value: number, cap: number | null): number {
  if (!Number.isFinite(value)) return 0;
  const floored = Math.max(0, Math.floor(value));
  return cap === null ? floored : Math.min(floored, cap);
}

/** `"3 / 5"` when a cap is recorded, `"3"` when none is. */
export function formatUpgradeSpend(value: number, cap: number | null): string {
  return cap === null ? String(value) : `${value} / ${cap}`;
}
