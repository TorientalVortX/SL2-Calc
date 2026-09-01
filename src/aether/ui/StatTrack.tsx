import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { play } from '../state/audio';
import { STAT_HARD_CAP } from '../state/build';

interface StatTrackProps {
  /** What the character already has before any point is spent. */
  floor: number;
  invested: number;
  /** The stat's element colour; the fill and its glow are `currentColor`. */
  color: string;
  onSet: (invested: number) => void;
  /**
   * Makes the track a real control: focusable, arrow-key operable and announced
   * as a slider. The attribute row does not want this (the row itself is the tab
   * stop there and owns the same keys), but the stat card has no other stepper to
   * inherit them from.
   */
  slider?: boolean;
  label?: string;
  className?: string;
}

/**
 * The stacked allocation bar, and the drag surface that sets it.
 *
 * Two parts rather than one fill: the hatched span is the floor the character
 * already has, and the solid span is what has been invested on top. Both are
 * measured against the hard cap of 80, so the gap at the right edge is exactly
 * how much more the stat can take.
 *
 * Shared by the attribute row and the stat card so the pointer arithmetic (which
 * has to subtract the floor before it can report an invested value) exists once.
 */
export function StatTrack({ floor, invested, color, onSet, slider, label, className = '' }: StatTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const cap = STAT_HARD_CAP - floor;

  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const value = Math.round(fraction * STAT_HARD_CAP) - floor;
    if (value !== invested) play('move');
    onSet(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!slider) return;
    const key = event.key.toLowerCase();
    const size = event.shiftKey ? 10 : 1;
    if (key === 'arrowleft' || key === 'arrowright') {
      event.preventDefault();
      play('move');
      onSet(invested + (key === 'arrowleft' ? -size : size));
      return;
    }
    if (key === 'home' || key === 'end') {
      event.preventDefault();
      play('select');
      onSet(key === 'home' ? 0 : cap);
    }
  };

  return (
    <div
      className={`stat__track ${className}`}
      ref={trackRef}
      style={{ color }}
      tabIndex={slider ? 0 : undefined}
      role={slider ? 'slider' : undefined}
      aria-label={slider ? label : undefined}
      aria-valuemin={slider ? 0 : undefined}
      aria-valuemax={slider ? cap : undefined}
      aria-valuenow={slider ? invested : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={event => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromPointer(event);
      }}
      onPointerMove={event => { if (dragging.current) setFromPointer(event); }}
      onPointerUp={event => {
        dragging.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <span className="stat__base" style={{ width: `${(floor / STAT_HARD_CAP) * 100}%` }} />
      <span
        className="stat__fill"
        style={{
          left: `${(floor / STAT_HARD_CAP) * 100}%`,
          width: `${(Math.max(0, invested) / STAT_HARD_CAP) * 100}%`,
        }}
      />
    </div>
  );
}
