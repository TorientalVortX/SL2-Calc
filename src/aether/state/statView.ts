/**
 * Whether the attribute grid reports raw or scaled points.
 *
 * These are two different questions and both are asked constantly. **Raw** is the
 * total the sheet has assembled, and the number the hard cap is measured against.
 * **Scaled** is what the game's formulas actually read, after diminishing returns
 * have taken their share above the soft cap. A tooltip was the wrong home for
 * either of them (it cannot be reached at all on a touch screen), so the grid
 * switches between them and remembers which was asked for.
 */
export type StatView = 'raw' | 'scaled';

const KEY = 'sl2:aether:statview:v1';

export function readStatView(): StatView {
  try {
    return localStorage.getItem(KEY) === 'raw' ? 'raw' : 'scaled';
  } catch {
    // Private browsing refuses the read. Scaled is the sheet's default reading.
    return 'scaled';
  }
}

export function writeStatView(view: StatView): void {
  try {
    localStorage.setItem(KEY, view);
  } catch { /* the choice simply lasts the session instead */ }
}

/** The caption the value column carries, and the label on its switch. */
export const STAT_VIEW_LABEL: Record<StatView, string> = { raw: 'Raw', scaled: 'Scaled' };
