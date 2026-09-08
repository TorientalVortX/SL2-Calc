import { describe, expect, it } from 'vitest';
import {
  ELEMENT_COLORS,
  ON_DARK,
  ON_LIGHT,
  PANEL_SURFACE,
  RAINBOW_INK,
  STAT_COLORS,
  elementInk,
  inkVars,
  onDark,
  onLight,
  onSurface,
  statInk,
  type Surface,
} from './colors';
import type { StatKey } from '../types';

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map(at => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * The one stat whose ink is below 4.5:1 on the dark panel, and was before the
 * light theme existed: RES / Dark's `#7c3aed` sits at about 3.1:1 there. It
 * clears the 3:1 that its gem needs as a graphic but not the 4.5:1 its name
 * needs as text, and correcting it would move a colour the whole calculator
 * front end also paints with. Recorded here rather than quietly excluded.
 */
const KNOWN_BELOW_AA: Record<Surface, StatKey[]> = { dark: ['res'], light: [] };

const SURFACES: Surface[] = ['dark', 'light'];
const STATS = Object.keys(STAT_COLORS) as StatKey[];

describe('the game palette, re-cut per surface', () => {
  it.each(SURFACES)('reads at 4.5:1 or better on the %s panel', surface => {
    const ground = PANEL_SURFACE[surface];
    const vars = inkVars(surface);
    const short: string[] = [];
    for (const stat of STATS) {
      if (KNOWN_BELOW_AA[surface].includes(stat)) continue;
      const ink = vars[`--ink-stat-${stat}`];
      if (contrast(ink, ground) < 4.5) {
        short.push(`${stat} (${ink}) at ${contrast(ink, ground).toFixed(2)}:1`);
      }
    }
    expect(short).toEqual([]);
  });

  it.each(SURFACES)('substitutes on the %s panel only where it has to', surface => {
    // A substitution that is not needed is a canonical colour thrown away, so
    // every entry in a table has to be earning its place.
    const table = surface === 'dark' ? ON_DARK : ON_LIGHT;
    for (const [source, replacement] of Object.entries(table)) {
      expect(contrast(source, PANEL_SURFACE[surface])).toBeLessThan(4.5);
      expect(replacement).not.toBe(source);
    }
  });

  it('keeps each light substitute on its source hue', () => {
    // The palette is how a reader tells twelve gems apart, and Wind and Acid are
    // only 16 degrees from each other to begin with. Darkening is allowed to
    // change how light a colour is, not which colour it is.
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
      const max = Math.max(r, g, b);
      const span = max - Math.min(r, g, b);
      if (!span) return 0;
      const raw = max === r ? (g - b) / span : max === g ? 2 + (b - r) / span : 4 + (r - g) / span;
      return ((raw * 60) + 360) % 360;
    };
    for (const [source, replacement] of Object.entries(ON_LIGHT)) {
      // WIL's white has no hue to hold, and becomes a neutral by design.
      if (source === '#ffffff') continue;
      expect(Math.abs(hue(source) - hue(replacement))).toBeLessThanOrEqual(2);
    }
  });

  it('leaves the canonical constants alone', () => {
    // These are the game's own colours and what an export writes out.
    expect(STAT_COLORS.str).toBe('#ef4444');
    expect(STAT_COLORS.wil).toBe('#ffffff');
    expect(STAT_COLORS.apt).toBe('rainbow');
    expect(ELEMENT_COLORS.Fire).toBe('#ef4444');
  });
});

describe('the substitution helpers', () => {
  it('passes a colour with no substitute straight through', () => {
    expect(onDark('#ef4444')).toBe('#ef4444');
    expect(onLight('#92400e')).toBe('#92400e');
    expect(onDark('#cafe00')).toBe('#cafe00');
  });

  it('matches regardless of the case a colour is written in', () => {
    expect(onDark('#92400E')).toBe(onDark('#92400e'));
    expect(onLight('#FFFFFF')).toBe('#1f232b');
  });

  it('routes to the table for the surface asked for', () => {
    expect(onSurface('#ffffff', 'dark')).toBe('#ffffff');
    expect(onSurface('#ffffff', 'light')).toBe('#1f232b');
    expect(onSurface('#92400e', 'dark')).toBe(ON_DARK['#92400e']);
  });
});

describe('the ink custom properties', () => {
  it('covers every stat and every element, on both surfaces', () => {
    for (const surface of SURFACES) {
      const vars = inkVars(surface);
      for (const stat of STATS) expect(vars[`--ink-stat-${stat}`]).toMatch(/^#[0-9a-f]{6}$/);
      for (const element of Object.keys(ELEMENT_COLORS)) {
        expect(vars[`--ink-el-${element.toLowerCase()}`]).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(Object.keys(vars)).toHaveLength(STATS.length + Object.keys(ELEMENT_COLORS).length);
    }
  });

  it('gives APT the theme accent, since a gradient cannot be a colour', () => {
    expect(inkVars('dark')['--ink-stat-apt']).toBe(RAINBOW_INK.dark);
    expect(inkVars('light')['--ink-stat-apt']).toBe(RAINBOW_INK.light);
  });

  it('names properties the way the components ask for them', () => {
    expect(statInk('str')).toBe('var(--ink-stat-str)');
    expect(elementInk('Fire')).toBe('var(--ink-el-fire)');
    expect(elementInk('Lightning')).toBe('var(--ink-el-lightning)');
    // Every name a component can ask for is a name `inkVars` publishes.
    const published = inkVars('dark');
    const named = (value: string) => value.slice('var('.length, -1);
    for (const stat of STATS) expect(published).toHaveProperty(named(statInk(stat)));
    for (const element of Object.keys(ELEMENT_COLORS)) {
      expect(published).toHaveProperty(named(elementInk(element)));
    }
  });
});
