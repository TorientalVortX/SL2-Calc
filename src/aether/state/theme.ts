/**
 * Which of the two themes the sheet is painted in.
 *
 * The Codex is a dark interface by design and stays one by default: that is the
 * look the whole gold-on-ink vocabulary was drawn for, and every reader who has
 * ever opened it has opened it dark. The light variation exists for the rooms the
 * dark one is wrong in — a bright office, a projector, a printout read off the
 * screen — and it is a deliberate choice rather than a guess made from the OS,
 * which is why `prefers-color-scheme` is not consulted here.
 *
 * The choice is written to the document element rather than to a React context so
 * that it also reaches the two things outside the tree: the `<html>` background
 * that shows through during a reload, and the `color-scheme` that decides what a
 * native scrollbar or date picker looks like.
 */
import { inkVars } from '../../data/colors';

export type Theme = 'dark' | 'light';

/* Also read by the inline bootstrap in `index.html`, which sets the attribute
   before the stylesheet parses. Change one and change the other. */
const KEY = 'sl2:aether:theme:v1';

/** What the mobile browser paints its own chrome, per theme. */
const CHROME: Record<Theme, string> = { dark: '#05070b', light: '#dcd6c8' };

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    // Private browsing refuses the read. Dark is the sheet's own look.
    return 'dark';
  }
}

export function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch { /* the choice simply lasts the session instead */ }
}

/**
 * Put the theme on the document.
 *
 * Only `light` sets the attribute; the dark theme is the bare `:root`, so there
 * is no state in which the stylesheet is waiting for an attribute to arrive
 * before it knows what to paint.
 *
 * The twelve stat and ten element inks are set here too rather than in the
 * stylesheet, so the game's palette and its two contrast-safe re-cuts stay in
 * `data/colors.ts` where they are documented and tested. `main.tsx` calls this
 * before the first render for that reason: an ink that arrives a frame late is a
 * row of colourless gems on arrival.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  for (const [name, value] of Object.entries(inkVars(theme))) {
    root.style.setProperty(name, value);
  }

  // The band a phone paints above the page, which is nobody's idea of chrome
  // until it is the wrong colour.
  const chrome = document.querySelector('meta[name="theme-color"]');
  if (chrome) chrome.setAttribute('content', CHROME[theme]);
}

/** The theme's name and its mark, for a switch that reports which one is in
    force. The title beside it says what pressing will do. */
export const THEME_LABEL: Record<Theme, string> = { dark: 'Dark', light: 'Light' };
export const THEME_MARK: Record<Theme, string> = { dark: '☽', light: '☼' };

/** The other theme, which is all a two-state toggle ever needs. */
export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}
