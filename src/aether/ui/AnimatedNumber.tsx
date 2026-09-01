import { useEffect, useRef, useState } from 'react';

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts from the previous value to the new one.
 *
 * Every derived stat on the sheet updates on every keystroke, so this runs on a
 * single rAF per value and holds the tween in a ref rather than in state: the
 * component re-renders with the interpolated number, but nothing above it does.
 * A tween already in flight is retargeted rather than restarted, which is what
 * keeps a held arrow key from stuttering.
 */
export function useAnimatedNumber(target: number, duration = 380): number {
  const [display, setDisplay] = useState(target);
  const frame = useRef(0);
  const from = useRef(target);
  const start = useRef(0);

  useEffect(() => {
    if (REDUCED || from.current === target) {
      from.current = target;
      setDisplay(target);
      return;
    }
    start.current = performance.now();
    const origin = from.current;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start.current) / duration);
      // Ease-out cubic: fast arrival, soft landing.
      const eased = 1 - (1 - progress) ** 3;
      const value = origin + (target - origin) * eased;
      from.current = value;
      setDisplay(value);
      if (progress < 1) frame.current = requestAnimationFrame(step);
      else from.current = target;
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return display;
}

interface AnimatedNumberProps {
  value: number;
  /**
   * Turns the tweened number into its final string, e.g. adding a `%` or keeping
   * a decimal. It receives the interpolated value, so a formatter decides its own
   * precision; without one the number is shown as a rounded integer.
   */
  format?: (value: number) => string;
  className?: string;
}

/** A number that counts to its new value and flashes gold as it settles. */
export function AnimatedNumber({ value, format, className = '' }: AnimatedNumberProps) {
  const animated = useAnimatedNumber(value);
  const [flash, setFlash] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 760);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <span className={`${className} ${flash ? 'is-changed' : ''}`}>
      {format ? format(animated) : Math.round(animated)}
    </span>
  );
}
