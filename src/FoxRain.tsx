import React, { useMemo } from 'react';

interface FoxRainProps {
  active: boolean;
  density?: number; // approximate number of foxes
}

export default function FoxRain({ active, density = 36 }: FoxRainProps) {
  const items = useMemo(() => {
    const count = density;
    const arr = Array.from({ length: count }).map((_, i) => {
      const x = Math.random() * 100; // percent across screen
      const delay = Math.random() * 5; // seconds
      const dur = 6 + Math.random() * 6; // 6-12s
      const scale = 0.75 + Math.random() * 0.75; // 0.75-1.5
      return { id: i, x, delay, dur, scale };
    });
    return arr;
  }, [density, active]);

  if (!active) return null;

  return (
    <div className="fox-rain">
      {items.map(item => (
        <div
          key={item.id}
          className="fox-emoji"
          style={{
            left: `${item.x}%`,
            animationDuration: `${item.dur}s`,
            animationDelay: `${item.delay}s`,
            transform: `translateY(-10vh) scale(${item.scale})`,
          }}
        >
          <span role="img" aria-label="fox">🦊</span>
        </div>
      ))}
    </div>
  );
}
