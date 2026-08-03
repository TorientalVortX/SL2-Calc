import profileData from './content/optimizer-profiles.json';
import type { OptimizationReferenceProfile } from '../types';

export const OPTIMIZER_REFERENCE_PROFILES = profileData.profiles as OptimizationReferenceProfile[];
export const ENABLED_OPTIMIZER_REFERENCE_PROFILES = OPTIMIZER_REFERENCE_PROFILES.filter(profile => profile.enabled);
export const OPTIMIZER_REFERENCE_PROFILE_BY_ID = Object.fromEntries(
  OPTIMIZER_REFERENCE_PROFILES.map(profile => [profile.id, profile]),
) as Record<string, OptimizationReferenceProfile>;
