import { describe, expect, it } from 'vitest';
import { scalingForWeapon } from './equipment';
import { ALL_WEAPONS } from '../data/weapons';
import type { Weapon } from '../types';

const byName = (name: string): Weapon => {
  const weapon = ALL_WEAPONS.find(candidate => candidate.name === name);
  if (!weapon) throw new Error(`fixture weapon "${name}" is missing from the data set`);
  return weapon;
};

describe('scalingForWeapon', () => {
  it('sums every scaling entry rather than reading only the first', () => {
    // Amplifyia scales two ways at once; the game adds them.
    const amplifyia = byName('Amplifyia');
    expect(amplifyia.scaling.length).toBe(2);

    const scaling = scalingForWeapon(amplifyia);
    expect(scaling.wil).toBe(50); // 25 + 25
    expect(scaling.luc).toBe(70); // 35 + 35
  });

  it('handles a weapon whose entries scale different stats', () => {
    // Blind Bright: Finesse (STR 40 / SKI 30) plus Faithful (FAI 40).
    const scaling = scalingForWeapon(byName('Blind Bright'));
    expect(scaling.str).toBe(40);
    expect(scaling.ski).toBe(30);
    expect(scaling.fai).toBe(40);
  });

  it('leaves single-entry weapons untouched', () => {
    const scaling = scalingForWeapon(byName('Ampeol'));
    expect(scaling.wil).toBe(100);
    expect(scaling.str).toBe(0);
  });

  it('always returns all twelve stats, APT included', () => {
    const scaling = scalingForWeapon(byName('Ampeol'));
    expect(Object.keys(scaling).sort()).toEqual(
      ['apt', 'cel', 'def', 'fai', 'gui', 'luc', 'res', 'san', 'ski', 'str', 'vit', 'wil'],
    );
  });

  it('lets an explicit override replace a stat instead of adding to it', () => {
    const scaling = scalingForWeapon(byName('Amplifyia'), { wil: 10 });
    expect(scaling.wil).toBe(10);
    // Stats the override does not mention still come from the summed entries.
    expect(scaling.luc).toBe(70);
  });

  it('agrees with the data for every multi-entry weapon', () => {
    const multi = ALL_WEAPONS.filter(weapon => weapon.scaling.length > 1);
    expect(multi.length).toBeGreaterThan(0);

    for (const weapon of multi) {
      const scaling = scalingForWeapon(weapon);
      for (const stat of ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san'] as const) {
        const expected = weapon.scaling.reduce((sum, entry) => sum + (entry[stat] ?? 0), 0);
        expect(scaling[stat], `${weapon.name} ${stat}`).toBe(expected);
      }
    }
  });
});
