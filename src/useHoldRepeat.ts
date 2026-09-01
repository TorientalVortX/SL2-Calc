import { useCallback, useEffect, useRef } from 'react';

/**
 * Press-and-hold repeat, as the design's `holdDec` / `holdInc` / `stopHold` imply.
 * Fires once immediately, then accelerates while held.
 *
 * Extracted from `AllocationPanel` so every stepper in the app behaves the same
 * way: the elemental and upgrade-point steppers were click-once, which made them
 * feel broken next to the allocator's.
 */
export function useHoldRepeat(action: () => void) {
  const timer = useRef<number | null>(null);
  const delay = useRef(320);
  const actionRef = useRef(action);
  actionRef.current = action;

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    delay.current = 320;
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    window.removeEventListener('blur', stop);
  }, []);

  const start = useCallback(() => {
    // Starting twice would leave the first timer running with nothing able to
    // clear it, so an in-flight repeat always wins.
    if (timer.current !== null) return;
    actionRef.current();
    /*
     * Release is watched on the window, not the button. A stepper that reaches
     * its limit mid-hold becomes disabled and stops firing mouseup, and the
     * pointer can leave the button entirely: in both cases a button-bound
     * listener never fires and the repeat runs forever, driving whatever the
     * action closes over next.
     */
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    const tick = () => {
      actionRef.current();
      delay.current = Math.max(40, delay.current * 0.75);
      timer.current = window.setTimeout(tick, delay.current);
    };
    timer.current = window.setTimeout(tick, delay.current);
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

/**
 * The event handlers a hold-to-repeat stepper needs.
 *
 * Hold is driven by mousedown, which a keyboard never fires. `detail === 0` marks
 * a click synthesised by Enter/Space (or `.click()`), so the click handler adds
 * keyboard activation without double-firing for mouse users.
 */
export function holdHandlers(action: () => void, start: () => void, stop: () => void) {
  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onClick: (event: { detail: number }) => { if (event.detail === 0) action(); },
  };
}
