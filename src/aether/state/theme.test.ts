import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, otherTheme, readTheme, writeTheme, THEME_LABEL, THEME_MARK } from './theme';

/** A `localStorage` stand-in, since the test environment has none. */
function stubStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  });
  return store;
}

describe('theme preference', () => {
  it('falls back to dark when storage cannot be read', () => {
    // No `localStorage` at all here, which is the same shape of failure as a
    // browser refusing it in private mode.
    expect(readTheme()).toBe('dark');
    expect(() => writeTheme('light')).not.toThrow();
  });

  it('reads back a stored choice, and only the two it knows', () => {
    const store = stubStorage();
    try {
      writeTheme('light');
      expect(readTheme()).toBe('light');
      writeTheme('dark');
      expect(readTheme()).toBe('dark');
      // Anything else under the key is not a theme, and dark is the default.
      store.set([...store.keys()][0], 'sepia');
      expect(readTheme()).toBe('dark');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('stores under the key the pre-paint bootstrap in index.html reads', () => {
    const store = stubStorage();
    try {
      writeTheme('light');
      expect([...store.keys()]).toEqual(['sl2:aether:theme:v1']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('names and marks both themes, and can find the other one', () => {
    expect(THEME_LABEL).toEqual({ dark: 'Dark', light: 'Light' });
    expect(Object.keys(THEME_MARK)).toEqual(['dark', 'light']);
    expect(THEME_MARK.dark).not.toBe(THEME_MARK.light);
    expect(otherTheme('dark')).toBe('light');
    expect(otherTheme('light')).toBe('dark');
  });
});

/**
 * The document, stubbed.
 *
 * The project's suite runs in plain node with no DOM, and pulling in jsdom for
 * four assertions would be a dependency for the sake of one function. This is the
 * whole surface `applyTheme` touches, which is also the whole of what is worth
 * asserting about it: which attribute it sets, which properties it publishes, and
 * that a page without the meta tag does not take it down.
 */
function stubDocument(withMeta = true) {
  const attributes = new Map<string, string>();
  const properties = new Map<string, string>();
  const meta = {
    content: '#05070b',
    getAttribute: () => meta.content,
    setAttribute: (_name: string, value: string) => { meta.content = value; },
  };
  vi.stubGlobal('document', {
    documentElement: {
      setAttribute: (name: string, value: string) => { attributes.set(name, value); },
      removeAttribute: (name: string) => { attributes.delete(name); },
      getAttribute: (name: string) => attributes.get(name) ?? null,
      style: { setProperty: (name: string, value: string) => { properties.set(name, value); } },
    },
    querySelector: (selector: string) =>
      (withMeta && selector === 'meta[name="theme-color"]' ? meta : null),
  });
  return { attributes, properties, meta };
}

describe('applying a theme to the document', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('marks only the light theme, so dark needs no attribute to be correct', () => {
    const { attributes } = stubDocument();
    applyTheme('light');
    expect(attributes.get('data-theme')).toBe('light');
    applyTheme('dark');
    expect(attributes.has('data-theme')).toBe(false);
  });

  it('publishes an ink for every stat and element, per theme', () => {
    const { properties } = stubDocument();
    applyTheme('dark');
    // A sample of each family; `colors.test.ts` asserts the full set and its
    // contrast. What matters here is that `applyTheme` is what publishes them.
    expect(properties.get('--ink-stat-str')).toBe('#ef4444');
    expect(properties.get('--ink-el-fire')).toBe('#ef4444');
    expect(properties.get('--ink-stat-wil')).toBe('#ffffff');
    expect(properties.size).toBe(22);

    applyTheme('light');
    expect(properties.get('--ink-stat-str')).toBe('#c63131');
    expect(properties.get('--ink-el-fire')).toBe('#c63131');
    expect(properties.get('--ink-stat-wil')).toBe('#1f232b');
  });

  it('moves the phone chrome with the theme', () => {
    const { meta } = stubDocument();
    applyTheme('light');
    expect(meta.content).toBe('#dcd6c8');
    applyTheme('dark');
    expect(meta.content).toBe('#05070b');
  });

  it('does not mind the meta tag being absent', () => {
    const { attributes } = stubDocument(false);
    expect(() => applyTheme('light')).not.toThrow();
    expect(attributes.get('data-theme')).toBe('light');
  });
});
