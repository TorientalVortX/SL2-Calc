import { describe, expect, it, vi } from 'vitest';
import { readStatView, writeStatView, STAT_VIEW_LABEL } from './statView';

describe('stat view preference', () => {
  it('falls back to scaled when storage cannot be read', () => {
    // No `localStorage` in the test environment at all, which is the same shape of
    // failure as a browser refusing it in private mode.
    expect(readStatView()).toBe('scaled');
    expect(() => writeStatView('raw')).not.toThrow();
  });

  it('reads back a stored choice, and only the two it knows', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    });
    try {
      writeStatView('raw');
      expect(readStatView()).toBe('raw');
      writeStatView('scaled');
      expect(readStatView()).toBe('scaled');
      // Anything else stored under the key is not a view; scaled is the default.
      store.set([...store.keys()][0], 'sideways');
      expect(readStatView()).toBe('scaled');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('labels both views for the switch and the column caption', () => {
    expect(STAT_VIEW_LABEL).toEqual({ raw: 'Raw', scaled: 'Scaled' });
  });
});
