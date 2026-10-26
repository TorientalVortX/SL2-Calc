export type StatView = 'raw' | 'scaled';

const KEY = 'sl2:aether:statview:v1';

export function readStatView(): StatView {
  try {
    return localStorage.getItem(KEY) === 'raw' ? 'raw' : 'scaled';
  } catch {
    // Private browsing refuses the read.
    return 'scaled';
  }
}

export function writeStatView(view: StatView): void {
  try {
    localStorage.setItem(KEY, view);
  } catch { /* lasts the session only */ }
}

export const STAT_VIEW_LABEL: Record<StatView, string> = { raw: 'Raw', scaled: 'Scaled' };
