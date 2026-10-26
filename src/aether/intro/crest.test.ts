import { describe, expect, it } from 'vitest';
import { CREST, CREST_LAYERS, pathData, sampleCrest } from './crest';

describe('crest geometry', () => {
  it('produces a valid SVG path for every polyline', () => {
    for (const line of CREST) {
      const data = pathData(line);
      expect(data.startsWith('M ')).toBe(true);
      expect(data.includes('NaN')).toBe(false);
      expect(data.endsWith(' Z')).toBe(line.closed);
    }
  });

  it('numbers its draw layers contiguously from zero', () => {
    const layers = new Set(CREST.map(line => line.layer));
    expect(CREST_LAYERS).toBe(layers.size);
    for (let layer = 0; layer < CREST_LAYERS; layer += 1) {
      expect(layers.has(layer)).toBe(true);
    }
  });

  it('samples the requested number of points', () => {
    const points = sampleCrest(5000);
    expect(points).toHaveLength(15000);
    expect([...points].every(Number.isFinite)).toBe(true);
  });

  it('spaces points evenly along the whole mark', () => {
    const count = 4000;
    const points = sampleCrest(count);
    const gaps: number[] = [];
    for (let index = 0; index < count - 1; index += 1) {
      const dx = points[(index + 1) * 3] - points[index * 3];
      const dy = points[(index + 1) * 3 + 1] - points[index * 3 + 1];
      gaps.push(Math.hypot(dx, dy));
    }
    // Outliers are the jumps between disconnected pieces.
    const stride = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    const outliers = gaps.filter(gap => gap > stride * 4).length;
    expect(stride).toBeGreaterThan(0);
    expect(outliers).toBeLessThanOrEqual(CREST.length);
  });

  it('keeps every point inside the viewBox the intro draws it in', () => {
    const points = sampleCrest(3000);
    // The intro SVG viewBox spans -1.45..1.45.
    for (let index = 0; index < points.length; index += 3) {
      expect(Math.abs(points[index])).toBeLessThanOrEqual(1.45);
      expect(Math.abs(points[index + 1])).toBeLessThanOrEqual(1.45);
    }
  });
});
