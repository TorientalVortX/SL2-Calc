export function formatScaledStat(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function formatScaled(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatStatValue(value: number, view: 'raw' | 'scaled'): string {
  return view === 'raw' ? String(Math.round(value)) : formatScaledStat(value);
}
