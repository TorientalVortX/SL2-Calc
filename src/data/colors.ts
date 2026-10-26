import type { StatKey } from '../types';

/** Each stat's colour, taken from the element it is associated with in game. */
export const STAT_COLORS: Record<StatKey, string> = {
  'str': '#ef4444',     // Red - Fire element
  'wil': '#ffffff',     // White
  'ski': '#06b6d4',     // Cyan - Ice element
  'cel': '#34d399',     // Mint Green - Wind element
  'def': '#92400e',     // Brown - Earth element
  'res': '#7c3aed',     // Purple - Dark element
  'vit': '#1e40af',     // Deep Blue - Water element
  'fai': '#fbbf24',     // Yellow - Light element
  'luc': '#f97316',     // Orange - Lightning element
  'gui': '#22c55e',     // Sketchy Green - Acid element
  'san': '#6b7280',     // Grey - Sound element
  'apt': 'rainbow'
};

export const ELEMENT_COLORS: Record<string, string> = {
  'Fire': '#ef4444',
  'Ice': '#06b6d4',
  'Wind': '#34d399',
  'Earth': '#92400e',
  'Dark': '#7c3aed',
  'Water': '#1e40af',
  'Light': '#fbbf24',
  'Lightning': '#f97316',
  'Acid': '#22c55e',
  'Sound': '#6b7280'
};

/** Substitutes for colours that fail WCAG AA (4.5:1) as text on the dark panels. */
export const ON_DARK: Record<string, string> = {
  '#92400e': '#b5762e', // DEF  / Earth  brown
  '#1e40af': '#4f7ce8', // VIT  / Water  deep blue
  '#6b7280': '#9aa6bf', // SAN  / Sound  grey
  '#7c3aed': '#9864f1', // RES  / Dark   purple, hue held at 262°
};

export function onDark(color: string): string {
  return ON_DARK[color.toLowerCase()] ?? color;
}

/** The same for the light theme's vellum panels; each keeps its source hue, darkened to clear 4.5:1. */
export const ON_LIGHT: Record<string, string> = {
  '#ffffff': '#1f232b', // WIL  / --      the neutral axis, far end
  '#ef4444': '#c63131', // STR  / Fire      red
  '#06b6d4': '#007488', // SKI  / Ice       cyan
  '#34d399': '#197856', // CEL  / Wind      mint
  '#fbbf24': '#85640d', // FAI  / Light     yellow
  '#f97316': '#ae4c07', // LUC  / Lightning orange
  '#22c55e': '#107a37', // GUI  / Acid      green
  '#6b7280': '#5b6270', // SAN  / Sound     grey
};

export type Surface = 'dark' | 'light';

/** The darkest/lightest point of each theme's panel gradient, where contrast is worst. */
export const PANEL_SURFACE: Record<Surface, string> = { dark: '#121826', light: '#f1ece2' };

export function onLight(color: string): string {
  return ON_LIGHT[color.toLowerCase()] ?? color;
}

export function onSurface(color: string, surface: Surface): string {
  return surface === 'light' ? onLight(color) : onDark(color);
}

/** APT's `'rainbow'` gradient cannot be a `color`, so it is painted in each theme's `--gold-300`. */
export const RAINBOW_INK: Record<Surface, string> = { dark: '#d8c088', light: '#855f26' };

export function inkVars(surface: Surface): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [stat, color] of Object.entries(STAT_COLORS)) {
    vars[`--ink-stat-${stat}`] = color === 'rainbow' ? RAINBOW_INK[surface] : onSurface(color, surface);
  }
  for (const [element, color] of Object.entries(ELEMENT_COLORS)) {
    vars[`--ink-el-${element.toLowerCase()}`] = onSurface(color, surface);
  }
  return vars;
}

export function statInk(stat: StatKey): string {
  return `var(--ink-stat-${stat})`;
}

export function elementInk(element: string): string {
  return `var(--ink-el-${element.toLowerCase()})`;
}