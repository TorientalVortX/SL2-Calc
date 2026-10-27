import type { BuildState, WeaponConfig } from '../types';
import { NO_UPGRADE_POINTS, equippedSlot3 } from '../types';
import { isShield } from '../data/gear';
import { emptyStats } from './evaluation/shared';
import { mixtureEffectKey, normalizeActiveMixtureEffects } from './chemist';

/** Skill effects scoped to this type only reach the unarmed weapon (Empty Palm's "when using their bare fists"). */
export const UNARMED_TYPE = 'Unarmed';

export const MIXED_MARTIAL_ARTS = 'mixed-martial-arts';

const TENDRIL_TONIC = mixtureEffectKey('Tendril Tonic', 'Tendril Tonic');

type UnarmedSource = Pick<BuildState, 'traits' | 'activeMixtureEffects' | 'mixturePlan'>;

export interface UnarmedWeapon {
  name: string;
  types: string[];
  damageType: string;
  config: WeaponConfig;
}

// Not on the wiki. Reported from play by a Martial Artist with Empty Palm 5: 25 Power, 120 Accuracy,
// 5% (110%) Critical, 100% STR. Power and Accuracy less Empty Palm's +15; Critical matches the Unstable Tendril.
const BARE_FISTS: WeaponConfig = {
  selectedWeaponName: null,
  weaponType: 'Fist',
  basePower: 10,
  baseCrit: 5,
  baseHit: 105,
  baseWeight: 0,
  baseCritDamage: 110,
  material: 'None',
  part1: 'None',
  part2: 'None',
  part3: 'None',
  enchantment: 'None',
  upgradeLevel: 0,
  upgradePoints: NO_UPGRADE_POINTS,
  rarity: 0,
  powerQuality: false,
  critQuality: false,
  hitQuality: false,
  weightPlus: false,
  weightMinus: false,
  sentimentality: false,
  twoHandedSkillRank: 0,
  customScaling: { ...emptyStats(), str: 100 },
};

// Tendril Tonic's tooltip on the Mixture List: Medium Fist, also a Whip, Chaos scaling.
const UNSTABLE_TENDRIL: WeaponConfig = {
  ...BARE_FISTS,
  baseHit: 85,
  customScaling: { ...emptyStats(), str: 40, apt: 70 },
};

// Karakuri weapon traits replace the fists with the same weapon under an extra type.
const REPLACEMENTS: Array<{ trait: string; name: string; type: string; damageType: string }> = [
  { trait: 'hidden-blade', name: 'Hidden Blade', type: 'Sword', damageType: 'Slash' },
  { trait: 'hidden-barrage', name: 'Hidden Barrage', type: 'Gun', damageType: 'Blunt' },
];

export function tendrilTonicActive(build: Pick<UnarmedSource, 'activeMixtureEffects' | 'mixturePlan'>): boolean {
  return normalizeActiveMixtureEffects(build.activeMixtureEffects, build.mixturePlan).includes(TENDRIL_TONIC);
}

/** Tendril Tonic replaces whatever unarmed weapon you had while it lasts. */
export function unarmedWeapon(build: Partial<UnarmedSource> = {}): UnarmedWeapon {
  if (tendrilTonicActive(build)) {
    return { name: 'Unstable Tendril', types: ['Fist', 'Whip', UNARMED_TYPE], damageType: 'Blunt', config: UNSTABLE_TENDRIL };
  }
  const replacement = REPLACEMENTS.find(entry => build.traits?.includes(entry.trait));
  return {
    name: replacement?.name ?? 'Bare Fists',
    types: replacement ? ['Fist', replacement.type, UNARMED_TYPE] : ['Fist', UNARMED_TYPE],
    damageType: replacement?.damageType ?? 'Blunt',
    config: BARE_FISTS,
  };
}

/** Mixed Martial Arts, or the Unstable Tendril on its own, keeps the unarmed weapon usable beside a held one, unless a sub-weapon or shield takes the Hands slot. */
export function unarmedBesideWeapon(build: Pick<BuildState, 'equipment'> & Partial<UnarmedSource>, ranks: Record<string, number>): boolean {
  if (!build.equipment.primaryWeapon) return false;
  if ((ranks[MIXED_MARTIAL_ARTS] ?? 0) < 1 && !tendrilTonicActive(build)) return false;
  if (equippedSlot3(build.equipment) === 'offHandWeapon') return false;
  return !isShield(build.equipment.hands?.itemName);
}
