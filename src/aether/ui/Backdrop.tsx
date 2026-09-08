import { useEffect, useRef } from 'react';
import type { Theme } from '../state/theme';

/**
 * Ambient depth behind the sheet: a few very large, slowly drifting light pools
 * and a scatter of motes rising through them.
 *
 * Deliberately canvas 2D rather than WebGL. Everything here is low-frequency,
 * which 2D composites just as well, and it removes the context-loss and
 * shader-compile failure paths: the layer either draws or silently does not, and
 * the CSS wash underneath carries the mood either way.
 *
 * Costs are kept flat: the light pools render into a quarter-resolution buffer
 * that is upscaled, the mote count scales with viewport area, and the whole loop
 * stops when the tab is hidden.
 *
 * Both themes draw the same three pools and the same dust on the same paths;
 * what changes is the direction of the light. On ink the layer is additive and
 * the pools glow. On vellum additive is invisible — nothing brightens an
 * off-white page — so the pools composite normally in muted tints and read as
 * faint colour in the paper, and the dust goes from cream motes to warm specks.
 */

interface Mote {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
}

interface Pool {
  hue: string;
  radius: number;
  cx: number;
  cy: number;
  /** Elliptical drift, so no two pools ever share a path. */
  ax: number;
  ay: number;
  rate: number;
  offset: number;
}

/**
 * The three pools' paths, shared by both themes: only the hue and the strength
 * of each stop differ, so the motion is identical whichever is in force.
 */
const PATHS: Omit<Pool, 'hue'>[] = [
  { radius: 0.62, cx: 0.28, cy: 0.22, ax: 0.1, ay: 0.06, rate: 0.019, offset: 0 },
  { radius: 0.5, cx: 0.76, cy: 0.68, ax: 0.08, ay: 0.09, rate: 0.014, offset: 2.1 },
  { radius: 0.44, cx: 0.52, cy: 0.9, ax: 0.12, ay: 0.05, rate: 0.023, offset: 4.4 },
];

interface Palette {
  /** The three pool hues, in the order of `PATHS`. */
  hues: [string, string, string];
  /** Pool alpha at the centre and at the 45% stop. */
  core: number;
  mid: number;
  /** How the pools stack: additive on ink, ordinary layering on vellum. */
  composite: GlobalCompositeOperation;
  /** The dust. */
  mote: string;
  moteAlpha: number;
}

const PALETTES: Record<Theme, Palette> = {
  dark: {
    hues: ['rgba(70, 110, 165,', 'rgba(150, 116, 56,', 'rgba(58, 126, 148,'],
    core: 0.2,
    mid: 0.06,
    composite: 'lighter',
    mote: '222, 208, 172',
    moteAlpha: 1,
  },
  light: {
    // Deeper and cooler than they look: over vellum at these alphas they read as
    // a tint in the paper rather than as three coloured lamps.
    hues: ['rgba(78, 108, 158,', 'rgba(158, 122, 58,', 'rgba(62, 122, 142,'],
    core: 0.13,
    mid: 0.045,
    composite: 'source-over',
    mote: '118, 94, 52',
    // Dust that darkens has to be quieter than dust that glows, or it reads as
    // dirt on the page.
    moteAlpha: 0.5,
  },
};

const FRAME_INTERVAL = 1000 / 30;

interface BackdropProps {
  theme: Theme;
}

export function Backdrop({ theme }: BackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const palette = PALETTES[theme];
    const pools: Pool[] = PATHS.map((path, index) => ({ ...path, hue: palette.hues[index] }));

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const glow = document.createElement('canvas');
    const glowContext = glow.getContext('2d');
    if (!glowContext) return;

    let motes: Mote[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;

    const resize = () => {
      // The effect is deliberately soft, so a 2K display does not need a
      // 4K-class canvas behind the sheet.
      const ratio = Math.min(window.devicePixelRatio || 1, 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      glow.width = Math.max(1, Math.floor(width / 4));
      glow.height = Math.max(1, Math.floor(height / 4));

      const count = Math.round(Math.min(88, (width * height) / 26000));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.5 + Math.random() * 1.5,
        speed: 3 + Math.random() * 11,
        drift: (Math.random() - 0.5) * 7,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.16 + Math.random() * 0.4,
      }));
    };

    const drawPools = (time: number) => {
      const gw = glow.width;
      const gh = glow.height;
      glowContext.clearRect(0, 0, gw, gh);
      glowContext.globalCompositeOperation = palette.composite;
      for (const pool of pools) {
        const t = time * pool.rate + pool.offset;
        const x = (pool.cx + Math.cos(t) * pool.ax) * gw;
        const y = (pool.cy + Math.sin(t * 0.8) * pool.ay) * gh;
        const r = pool.radius * Math.max(gw, gh);
        const gradient = glowContext.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `${pool.hue} ${palette.core})`);
        gradient.addColorStop(0.45, `${pool.hue} ${palette.mid})`);
        gradient.addColorStop(1, `${pool.hue} 0)`);
        glowContext.fillStyle = gradient;
        glowContext.fillRect(0, 0, gw, gh);
      }
      glowContext.globalCompositeOperation = 'source-over';
    };

    let last = performance.now();
    const render = (now: number) => {
      if (!running) return;
      if (!reduced && now - last < FRAME_INTERVAL) {
        frame = requestAnimationFrame(render);
        return;
      }
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = now / 1000;

      context.clearRect(0, 0, width, height);
      drawPools(time);
      context.imageSmoothingEnabled = true;
      context.drawImage(glow, 0, 0, width, height);

      context.globalCompositeOperation = palette.composite;
      for (const mote of motes) {
        if (!reduced) {
          mote.y -= mote.speed * delta;
          mote.x += Math.sin(time * 0.3 + mote.phase) * mote.drift * delta;
          if (mote.y < -8) {
            mote.y = height + 8;
            mote.x = Math.random() * width;
          }
        }
        // Slow twinkle, offset per mote so the field never pulses in unison.
        const twinkle = 0.55 + 0.45 * Math.sin(time * 0.9 + mote.phase);
        const alpha = mote.alpha * twinkle * palette.moteAlpha;
        const gradient = context.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.radius * 4);
        gradient.addColorStop(0, `rgba(${palette.mote}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${palette.mote}, 0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(mote.x, mote.y, mote.radius * 4, 0, Math.PI * 2);
        context.fill();
      }
      context.globalCompositeOperation = 'source-over';

      if (reduced) return; // One frame is enough when motion is unwanted.
      frame = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // A theme change rebuilds the loop, which reshuffles the dust. That is a
    // deliberate, once-in-a-session action and the field is 88 unnamed specks.
  }, [theme]);

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__wash" />
      <canvas ref={canvasRef} className="backdrop__canvas" />
      <div className="backdrop__weave" />
      <div className="backdrop__vignette" />
    </div>
  );
}
