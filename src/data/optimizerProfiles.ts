import profileData from './content/optimizer-profiles.json';
import type { OptimizationReferenceProfile } from '../types';
import { ALL_WEAPONS } from './weapons';

const mutationTypes: Record<number, string> = { 1: 'Dagger', 2: 'Fist', 3: 'Sword', 4: 'Axe', 5: 'Spear', 6: 'Tome', 7: 'Bow', 8: 'Gun' };

export const OPTIMIZER_REFERENCE_PROFILES = (profileData.profiles as OptimizationReferenceProfile[]).map(profile => {
  const weapon = ALL_WEAPONS.find(item => item.name === profile.weapon.name);
  const mutation = weapon && weapon.weaponType !== profile.weapon.effectiveType && mutationTypes[weapon.rarity] === profile.weapon.effectiveType
    ? 'Mutation'
    : undefined;
  const dataGaps = [...(profile.dataGaps ?? [])];
  if (!weapon) dataGaps.push(`Canonical weapon data is unavailable for ${profile.weapon.name}.`);
  if (weapon && weapon.weaponType !== profile.weapon.effectiveType && !mutation) {
    dataGaps.push(`The supplied effective type ${profile.weapon.effectiveType} is not represented by the canonical ${weapon.weaponType} record.`);
  }
  return {
    ...profile,
    provenance: profile.provenance ?? 'Community-supplied popular build example',
    confidence: profile.enabled ? 'community' : 'unavailable',
    canonicalWeaponId: weapon?.id,
    requiredWeaponEnchantment: mutation,
    dataGaps,
  };
});
export const ENABLED_OPTIMIZER_REFERENCE_PROFILES = OPTIMIZER_REFERENCE_PROFILES.filter(profile => profile.enabled);
export const OPTIMIZER_REFERENCE_PROFILE_BY_ID = Object.fromEntries(
  OPTIMIZER_REFERENCE_PROFILES.map(profile => [profile.id, profile]),
) as Record<string, OptimizationReferenceProfile>;
