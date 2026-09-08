import type { StatKey } from '../types';

/** Each stat's colour, taken from the element it is associated with in game. */
export const STAT_COLORS: Record<StatKey, string> = {
  'str': '#ef4444',     // Red - Fire element
  'wil': '#ffffff',     // White - Mental strength
  'ski': '#06b6d4',     // Cyan - Ice element
  'cel': '#34d399',     // Mint Green - Wind element
  'def': '#92400e',     // Brown - Earth element
  'res': '#7c3aed',     // Purple - Dark element
  'vit': '#1e40af',     // Deep Blue - Water element
  'fai': '#fbbf24',     // Yellow - Light element
  'luc': '#f97316',     // Orange - Lightning element
  'gui': '#22c55e',     // Sketchy Green - Acid element
  'san': '#6b7280',     // Grey - Sound element
  'apt': 'rainbow'      // Rainbow - Special gradient
};

// Element color mapping for Luminary Element aesthetic
export const ELEMENT_COLORS: Record<string, string> = {
  'Fire': '#ef4444',      // Red - matches STR
  'Ice': '#06b6d4',       // Cyan - matches SKI
  'Wind': '#34d399',      // Mint Green - matches CEL
  'Earth': '#92400e',     // Brown - matches DEF
  'Dark': '#7c3aed',      // Purple - matches RES
  'Water': '#1e40af',     // Deep Blue - matches VIT
  'Light': '#fbbf24',     // Yellow - matches FAI
  'Lightning': '#f97316', // Orange - matches LUC
  'Acid': '#22c55e',      // Green - matches GUI
  'Sound': '#6b7280'      // Grey - matches SAN
};

/**
 * Render-time substitutions for values that fail WCAG AA (4.5:1) as text on the
 * near-black panel surfaces.
 *
 * Nine of the twelve stat colours clear 4.5:1 on `surface.raised` (#121826) and
 * render at their source value. These three do not. Each substitute keeps the
 * stat's hue identity: DEF stays an amber-brown rather than lifting into LUC's
 * orange, so the two remain distinguishable.
 *
 * The source constants above are deliberately untouched: they are the game's
 * canonical colours and are still correct on light surfaces and in exports.
 * Specified by the Turn 1 design document.
 */
export const ON_DARK: Record<string, string> = {
  '#92400e': '#b5762e', // DEF  / Earth  brown
  '#1e40af': '#4f7ce8', // VIT  / Water  deep blue
  '#6b7280': '#9aa6bf', // SAN  / Sound  grey
};

/** Map a canonical colour to the variant safe to render on a dark panel. */
export function onDark(color: string): string {
  return ON_DARK[color.toLowerCase()] ?? color;
}

/**
 * The same substitution for the light theme's vellum panels (about #f1ece2 at
 * their darkest, which is the worst case for dark ink).
 *
 * Eight of the twelve need one here, and they are almost exactly the eight the
 * dark theme did not: a palette tuned to glow on near-black is a palette of pale
 * colours. Each substitute is its source hue held to the degree and darkened
 * until it clears 4.5:1, so Wind stays 158° and Acid stays 142° — the same 16°
 * apart that tells them from each other on the dark sheet.
 *
 * The two that are not a darkening:
 *
 *   WIL  is `#ffffff`, which is not a colour on paper at all. It becomes the far
 *        end of the neutral axis rather than a grey, both because that is what
 *        white means when the page is white, and because a mid grey would be
 *        indistinguishable from SAN, which is already one.
 *   APT  has no colour of its own (it renders as a gradient) and the sheet paints
 *        it with the theme's gold. See `RAINBOW_INK`.
 *
 * DEF, RES and VIT are absent because they need nothing: the game's own brown,
 * purple and deep blue clear 4.5:1 on vellum as they are.
 */
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

/** Which theme's panels a colour is about to be painted on. */
export type Surface = 'dark' | 'light';

/**
 * The surface each substitution table is measured against: the point of that
 * theme's panel gradient least kind to its own ink. `colors.test.ts` holds both
 * tables to 4.5:1 here.
 */
export const PANEL_SURFACE: Record<Surface, string> = { dark: '#121826', light: '#f1ece2' };

/** Map a canonical colour to the variant safe to render on a light panel. */
export function onLight(color: string): string {
  return ON_LIGHT[color.toLowerCase()] ?? color;
}

/** Map a canonical colour to the variant safe on either surface. */
export function onSurface(color: string, surface: Surface): string {
  return surface === 'light' ? onLight(color) : onDark(color);
}

/**
 * APT's stand-in. It is the one stat whose colour is `'rainbow'`, and a gradient
 * cannot be a `color`, so the sheet paints it in the accent instead: each
 * theme's own `--gold-300`, which is also what every other bronze mark on the
 * page is drawn in.
 */
export const RAINBOW_INK: Record<Surface, string> = { dark: '#d8c088', light: '#855f26' };

/*
 * The Aether sheet reads these through custom properties rather than being told
 * the theme.
 *
 * Twelve gems and ten element rows are scattered across five components, three of
 * them four props deep, and threading a `theme` down to each of them would put
 * the same argument in twenty signatures to answer one question that the document
 * already knows the answer to. `applyTheme` publishes the answers once, and the
 * components ask for `var(--ink-stat-str)`.
 */

/** Every ink custom property for a surface, ready to set on the root element. */
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

/** The property a stat's gem and figures are painted with. */
export function statInk(stat: StatKey): string {
  return `var(--ink-stat-${stat})`;
}

/** The property an element's gem and row are painted with. */
export function elementInk(element: string): string {
  return `var(--ink-el-${element.toLowerCase()})`;
}