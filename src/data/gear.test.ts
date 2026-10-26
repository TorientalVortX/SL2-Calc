import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_BY_GROUP, SLOT3_GEAR, gearByName, isShield } from './gear';
import { ARMORS } from './armors';
import itemEffects from './content/item-effects.json';

describe('gear data', () => {
  it('loads every slot 3-6 group', () => {
    expect(GEAR_BY_GROUP.Hands.length).toBe(48);
    expect(GEAR_BY_GROUP.Shield.length).toBe(20);
    expect(GEAR_BY_GROUP.Legs.length).toBe(42);
    expect(GEAR_BY_GROUP.Accessory.length).toBe(115);
    expect(Object.keys(GEAR).length).toBe(225);
  });

  it('assigns each group the slot it occupies', () => {
    expect(GEAR_BY_GROUP.Hands.every(i => i.slot === 3)).toBe(true);
    expect(GEAR_BY_GROUP.Shield.every(i => i.slot === 3)).toBe(true);
    expect(GEAR_BY_GROUP.Legs.every(i => i.slot === 4)).toBe(true);
    expect(GEAR_BY_GROUP.Accessory.every(i => i.slot === 5)).toBe(true);
  });

  it('offers hands and shields together for slot 3', () => {
    expect(SLOT3_GEAR.length).toBe(68);
    expect(isShield('Metal Shield')).toBe(true);
    expect(isShield('Archery Gloves')).toBe(false);
  });

  it('never collides with an armour name', () => {
    const shared = Object.keys(GEAR).filter(name => name in ARMORS);
    expect(shared).toEqual([]);
  });

  it('carries a material on every item, defaulting shields to Metal', () => {
    // The Shields page states the material once for the whole page.
    expect(GEAR_BY_GROUP.Shield.every(i => i.material)).toBe(true);
    expect(gearByName('Metal Shield')?.material).toBe('Metal');
    expect(gearByName('Blue Iron Shield')?.material).toBe('Iron');
  });

  it('resolves effect text into applicable bonuses', () => {
    const gearEffects = (itemEffects as { gear: Record<string, Array<{ applies: string }>> }).gear;
    expect(gearEffects['Archery Gloves']?.[0]).toMatchObject({ applies: 'always' });
    const always = Object.values(gearEffects).flat().filter(r => r.applies === 'always');
    expect(always.length).toBeGreaterThan(100);
  });

  it('keeps flavour text out of the effect lines', () => {
    const gloves = gearByName('Archery Gloves');
    expect(gloves?.specialEffects.some(line => /made for archery/i.test(line))).toBe(false);
    expect(gloves?.flavour).toMatch(/archery/i);
  });
});
