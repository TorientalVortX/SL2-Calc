import { describe, expect, it } from 'vitest';
import { WEAPONS } from './weapons';
import { ARMORS } from './armors';

describe('canonical data migration', () => {
  it('retains the current equipment records without duplicate names', () => {
    // 338 from the wiki plus Tsukikage, which build-weapon-data.mjs keeps.
    expect(WEAPONS).toHaveLength(339);
    // All 73 wiki armours; its "Embroidered Elemenetalist's Gi" is kept under the correct spelling.
    expect(Object.keys(ARMORS)).toHaveLength(73);
    expect(new Set(WEAPONS.map((weapon) => weapon.name)).size).toBe(WEAPONS.length);
    expect(new Set(Object.keys(ARMORS)).size).toBe(Object.keys(ARMORS).length);
  });
});
