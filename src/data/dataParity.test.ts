import { describe, expect, it } from 'vitest';
import { WEAPONS } from './weapons';
import { ARMORS } from './armors';
import { ENABLED_OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILES } from './optimizerProfiles';

describe('canonical data migration', () => {
  it('retains the current equipment records without duplicate names', () => {
    expect(WEAPONS).toHaveLength(311);
    expect(Object.keys(ARMORS)).toHaveLength(63);
    expect(new Set(WEAPONS.map((weapon) => weapon.name)).size).toBe(WEAPONS.length);
    expect(new Set(Object.keys(ARMORS)).size).toBe(Object.keys(ARMORS).length);
  });

  it('retains the supplied optimizer examples and clearly separates unavailable references', () => {
    expect(OPTIMIZER_REFERENCE_PROFILES).toHaveLength(8);
    expect(ENABLED_OPTIMIZER_REFERENCE_PROFILES).toHaveLength(7);
    expect(OPTIMIZER_REFERENCE_PROFILES.find(profile => profile.id === 'redtail-chemist-monk')?.unavailableReason).toMatch(/Chemist/);
  });
});
