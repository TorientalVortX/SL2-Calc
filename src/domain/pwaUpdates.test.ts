import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchForPwaUpdates } from './pwaUpdates';
function surfaces() {
  const win = Object.assign(new EventTarget(), { navigator: { onLine: true }, setInterval, clearInterval });
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  return { win, doc };
}
afterEach(() => vi.useRealTimers());
describe('PWA update checks', () => {
  it('checks on registration, focus, online and a minute interval, then cleans up', async () => {
    vi.useFakeTimers(); const { win, doc } = surfaces(); const update = vi.fn().mockResolvedValue(undefined);
    const stop = watchForPwaUpdates({ update }, win as unknown as Window, doc as unknown as Document);
    await Promise.resolve(); expect(update).toHaveBeenCalledTimes(1);
    win.dispatchEvent(new Event('focus')); await Promise.resolve();
    win.dispatchEvent(new Event('online')); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60_000); expect(update).toHaveBeenCalledTimes(4);
    stop(); win.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(60_000);
    expect(update).toHaveBeenCalledTimes(4);
  });
  it('waits while offline or hidden and survives a failed update', async () => {
    vi.useFakeTimers(); const { win, doc } = surfaces(); win.navigator.onLine = false;
    const update = vi.fn().mockRejectedValue(new Error('network'));
    const stop = watchForPwaUpdates({ update }, win as unknown as Window, doc as unknown as Document);
    expect(update).not.toHaveBeenCalled(); win.navigator.onLine = true; doc.visibilityState = 'hidden';
    win.dispatchEvent(new Event('online')); expect(update).not.toHaveBeenCalled();
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange')); await Promise.resolve();
    win.dispatchEvent(new Event('focus')); await Promise.resolve(); expect(update).toHaveBeenCalledTimes(2); stop();
  });
});
