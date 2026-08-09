/**
 * Color constants for SL2 Calculator
 * Contains color mappings for stats and elements
 */

import type { StatKey } from '../types';

// Stat color mapping based on SL2 themes
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
 * stat's hue identity — DEF stays an amber-brown rather than lifting into LUC's
 * orange, so the two remain distinguishable.
 *
 * The source constants above are deliberately untouched: they are the game's
 * canonical colours and are still correct on light surfaces and in exports.
 * Specified by the Turn 1 design document.
 */
export const ON_DARK: Record<string, string> = {
  '#92400e': '#b5762e', // DEF  / Earth  — brown
  '#1e40af': '#4f7ce8', // VIT  / Water  — deep blue
  '#6b7280': '#9aa6bf', // SAN  / Sound  — grey
};

/** Map a canonical colour to the variant safe to render on a dark panel. */
export function onDark(color: string): string {
  return ON_DARK[color.toLowerCase()] ?? color;
}