/** On `<html>` rather than a context, so it reaches the reload background and native `color-scheme`. */
import { inkVars } from '../../data/colors';

export type Theme = 'dark' | 'light';

/* Also read by the inline bootstrap in `index.html`; change both together. */
const KEY = 'sl2:aether:theme:v1';

/** What the mobile browser paints its own chrome, per theme. */
const CHROME: Record<Theme, string> = { dark: '#05070b', light: '#dcd6c8' };

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    // Private browsing refuses the read.
    return 'dark';
  }
}

export function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch { /* lasts the session only */ }
}

/** Only `light` sets the attribute. Sets the stat inks too, so `main.tsx` calls it before first render. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  for (const [name, value] of Object.entries(inkVars(theme))) {
    root.style.setProperty(name, value);
  }

  const chrome = document.querySelector('meta[name="theme-color"]');
  if (chrome) chrome.setAttribute('content', CHROME[theme]);
}

export const THEME_LABEL: Record<Theme, string> = { dark: 'Dark', light: 'Light' };
export const THEME_MARK: Record<Theme, string> = { dark: '☽', light: '☼' };

export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}
