/** Shared by the SVG crest and the swarm's targets. Crest within ±1, ring ±1.24; frame about ±1.4. */

export type Point = readonly [x: number, y: number];

export interface Polyline {
  points: Point[];
  closed: boolean;
  /** Stroke stagger group; lower layers draw first. */
  layer: number;
}

const diamond = (halfWidth: number, halfHeight: number, layer: number): Polyline => ({
  points: [[0, -halfHeight], [halfWidth, 0], [0, halfHeight], [-halfWidth, 0]],
  closed: true,
  layer,
});

function circle(radius: number, layer: number, segments = 96): Polyline {
  return {
    points: Array.from({ length: segments }, (_, index) => {
      const angle = (index / segments) * Math.PI * 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius] as Point;
    }),
    closed: true,
    layer,
  };
}

function ringTicks(inner: number, outer: number, layer: number): Polyline[] {
  return Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    const length = index % 3 === 0 ? outer : inner + (outer - inner) * 0.45;
    return {
      points: [
        [Math.cos(angle) * inner, Math.sin(angle) * inner],
        [Math.cos(angle) * length, Math.sin(angle) * length],
      ] as Point[],
      closed: false,
      layer,
    };
  });
}

export const CREST: Polyline[] = [
  circle(1.24, 0),
  ...ringTicks(1.1, 1.24, 0),
  diamond(0.62, 1, 1),
  { points: [[-0.62, 0], [-1.02, 0]], closed: false, layer: 1 },
  { points: [[0.62, 0], [1.02, 0]], closed: false, layer: 1 },
  diamond(0.38, 0.62, 2),
  diamond(0.15, 0.24, 3),
];

export const CREST_LAYERS = Math.max(...CREST.map(line => line.layer)) + 1;

export function pathData(line: Polyline): string {
  const [first, ...rest] = line.points;
  const move = `M ${first[0].toFixed(4)} ${first[1].toFixed(4)}`;
  const lines = rest.map(point => `L ${point[0].toFixed(4)} ${point[1].toFixed(4)}`).join(' ');
  return `${move} ${lines}${line.closed ? ' Z' : ''}`;
}

/** Spaced by arc length; a fixed count per segment would crowd the core and starve the ring. */
export function sampleCrest(count: number): Float32Array {
  const segments: Array<{ a: Point; b: Point; length: number }> = [];
  let total = 0;

  for (const line of CREST) {
    const points = line.closed ? [...line.points, line.points[0]] : line.points;
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length <= 0) continue;
      segments.push({ a, b, length });
      total += length;
    }
  }

  const result = new Float32Array(count * 3);
  let cursor = 0;
  let walked = 0;
  const step = total / count;

  for (let index = 0; index < count; index += 1) {
    const target = index * step;
    while (cursor < segments.length - 1 && walked + segments[cursor].length < target) {
      walked += segments[cursor].length;
      cursor += 1;
    }
    const segment = segments[cursor];
    const along = segment.length === 0 ? 0 : (target - walked) / segment.length;
    result[index * 3] = segment.a[0] + (segment.b[0] - segment.a[0]) * along;
    result[index * 3 + 1] = segment.a[1] + (segment.b[1] - segment.a[1]) * along;
    result[index * 3 + 2] = 0;
  }
  return result;
}
