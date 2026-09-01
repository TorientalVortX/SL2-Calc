/**
 * How a stat value is written out.
 *
 * Scaled stats are fractional (`calculateDiminishingReturns` returns `effective
 * + remaining * multiplier`), and flooring them threw the fraction away at
 * exactly the point it mattered most. A scaled 44.8 and a scaled 44.0 both
 * render as "44", so there was no way to see how hard the softcap was biting,
 * or to work out the breakpoints that depend on the fraction: +1 Hit or Evade
 * per point, HP per point of VIT, the +0.4 Critical a STR-primary weapon
 * grants.
 *
 * Raw stats are whole numbers by construction, so they keep the plain integer
 * form rather than gaining a pointless `.0`.
 */

/** One decimal, always. The scaled column reads as a column. */
export function formatScaledStat(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** One decimal only when there is a fraction to show. */
export function formatScaled(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Whole for the raw view, one decimal for the scaled view. */
export function formatStatValue(value: number, view: 'raw' | 'scaled'): string {
  return view === 'raw' ? String(Math.round(value)) : formatScaledStat(value);
}
