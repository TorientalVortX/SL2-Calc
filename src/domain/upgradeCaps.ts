import type { Armor, ArmorUpgradePoints, GameWorld, WeaponUpgradePoints } from '../types';

/** `null` means no ceiling is recorded for the channel, not unlimited in the game. */
export type UpgradeCapTable<Points> = { [K in keyof Points]: number | null };

// Sourced from play; the wiki has no upgrade ceilings. Each class spreads the same 16 points differently.
const ARMOR_CAPS: Record<Armor['type'], Pick<ArmorUpgradePoints, 'armor' | 'magicArmor' | 'evade'>> = {
  Heavy: { armor: 8, magicArmor: 5, evade: 3 },
  Light: { armor: 5, magicArmor: 7, evade: 4 },
  Unarmored: { armor: 3, magicArmor: 5, evade: 8 },
};

/** Korvara is the stricter world (G6 raises every ceiling by one), so defaulting to it never overstates. */
export const DEFAULT_WORLD: GameWorld = 'Korvara';

const G6_CEILING_BONUS = 1;

function withWorldBonus(limit: number | null, world: GameWorld): number | null {
  if (limit === null) return null;
  return world === 'G6' ? limit + G6_CEILING_BONUS : limit;
}

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

/** An emptied number input parses as `NaN`, which `Math.max(0, NaN)` would propagate. */
export function clampUpgradePoint(value: number, cap: number | null): number {
  if (!Number.isFinite(value)) return 0;
  const floored = Math.max(0, Math.floor(value));
  return cap === null ? floored : Math.min(floored, cap);
}

export function formatUpgradeSpend(value: number, cap: number | null): string {
  return cap === null ? String(value) : `${value} / ${cap}`;
}
