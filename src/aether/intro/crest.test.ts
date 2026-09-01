import { describe, expect, it } from 'vitest';
import { CREST, CREST_LAYERS, pathData, sampleCrest } from './crest';

describe('crest geometry', () => {
  it('produces a valid SVG path for every polyline', () => {
    for (const line of CREST) {
      const data = pathData(line);
      expect(data.startsWith('M ')).toBe(true);
      expect(data.includes('NaN')).toBe(false);
      // A closed polyline has to actually close, or the stroke animation leaves a
      // visible gap where the ring should meet itself.
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

  /*
   * The reason sampling walks arc length rather than taking a fixed count per
   * segment: the core diamond is a fraction of the ring's length, so a per-segment
   * split would crowd it and starve the ring. The swarm would settle as a bright
   * blob inside a faint circle instead of as an even mark.
   */
  it('spaces points evenly along the whole mark', () => {
    const count = 4000;
    const points = sampleCrest(count);
    const gaps: number[] = [];
    for (let index = 0; index < count - 1; index += 1) {
      const dx = points[(index + 1) * 3] - points[index * 3];
      const dy = points[(index + 1) * 3 + 1] - points[index * 3 + 1];
      gaps.push(Math.hypot(dx, dy));
    }
    // Most steps are one even stride; the outliers are the jumps between
    // disconnected pieces, of which there are only as many as there are pieces.
    const stride = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    const outliers = gaps.filter(gap => gap > stride * 4).length;
    expect(stride).toBeGreaterThan(0);
    expect(outliers).toBeLessThanOrEqual(CREST.length);
  });

  it('keeps every point inside the viewBox the intro draws it in', () => {
    const points = sampleCrest(3000);
    // The SVG uses -1.45..1.45; anything outside would be clipped off the mark.
    for (let index = 0; index < points.length; index += 3) {
      expect(Math.abs(points[index])).toBeLessThanOrEqual(1.45);
      expect(Math.abs(points[index + 1])).toBeLessThanOrEqual(1.45);
    }
  });
});
