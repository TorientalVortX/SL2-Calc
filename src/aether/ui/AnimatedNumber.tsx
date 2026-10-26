import { useEffect, useRef, useState } from 'react';

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Retargets an in-flight tween rather than restarting it, so a held arrow key does not stutter. */
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
  format?: (value: number) => string;
  className?: string;
}

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
