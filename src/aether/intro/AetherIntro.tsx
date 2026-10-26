import { useCallback, useEffect, useRef, useState } from 'react';
import { CREST, pathData } from './crest';
import type { IntroScene } from './scene';
import { play, playSwell } from '../state/audio';

export type IntroMode = 'full' | 'short';

interface Timeline {
  /** The swarm's gather sweep, in ms. */
  gatherFrom: number;
  gatherTo: number;
  sigilAt: number;
  flashAt: number;
  titleAt: number;
  promptAt: number;
  autoAt: number;
  exitMs: number;
}

const TIMELINES: Record<IntroMode, Timeline> = {
  full: {
    gatherFrom: 450, gatherTo: 3600,
    sigilAt: 2850, flashAt: 4050, titleAt: 4250, promptAt: 5500,
    autoAt: 7900, exitMs: 1050,
  },
  short: {
    gatherFrom: 0, gatherTo: 450,
    sigilAt: 0, flashAt: 450, titleAt: 360, promptAt: Infinity,
    autoAt: 1000, exitMs: 550,
  },
};

const TITLE = 'AETHER CODEX';

export function AetherIntro({ mode, onDone }: { mode: IntroMode; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crestRef = useRef<SVGSVGElement>(null);
  const [act, setAct] = useState(0);
  const [exiting, setExiting] = useState(false);
  const enterRef = useRef<() => void>(() => undefined);

  const timeline = TIMELINES[mode];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    // Three (~600KB) loads on demand. The timeline reads elapsed time, so a late swarm
    // simply appears where it should already be.
    let scene: IntroScene | null = null;
    let disposed = false;

    // Measured so the stylesheet stays in charge of the crest's size and position.
    const measureCrest = () => {
      const rect = crestRef.current?.getBoundingClientRect();
      if (!rect?.width) return;
      scene?.setCrestRect({
        size: rect.width,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      });
    };

    void import('./scene').then(({ createIntroScene }) => {
      const canvas = canvasRef.current;
      if (disposed || !canvas) return;
      scene = createIntroScene(canvas);
      measureCrest();
    });

    const start = performance.now();
    let frame = 0;
    let exitStart: number | null = null;
    let flashed = false;
    let currentAct = 0;
    let stopSwell: (() => void) | null = null;

    if (mode === 'full') stopSwell = playSwell(timeline.flashAt / 1000);

    const beginExit = () => {
      if (exitStart !== null) return;
      exitStart = performance.now();
      stopSwell?.();
      stopSwell = null;
      setExiting(true);
    };
    enterRef.current = beginExit;

    const loop = (now: number) => {
      const elapsed = now - start;

      const next = elapsed >= timeline.promptAt ? 4
        : elapsed >= timeline.titleAt ? 3
          : elapsed >= timeline.sigilAt ? 2
            : elapsed >= timeline.gatherFrom ? 1
              : 0;
      if (next !== currentAct) {
        currentAct = next;
        setAct(next);
      }

      if (!flashed && elapsed >= timeline.flashAt) {
        flashed = true;
        play('sigil');
      }

      const gather = clamp01((elapsed - timeline.gatherFrom) / (timeline.gatherTo - timeline.gatherFrom));

      let burst = 0;
      if (exitStart !== null) {
        burst = clamp01((now - exitStart) / timeline.exitMs);
        if (burst >= 1) {
          disposed = true;
          scene?.dispose();
          onDone();
          return;
        }
      } else if (elapsed >= timeline.autoAt) {
        beginExit();
      }

      scene?.setProgress(gather, burst);
      scene?.render(elapsed / 1000);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    const onResize = () => {
      scene?.resize();
      measureCrest();
    };
    window.addEventListener('resize', onResize);

    return () => {
      // Set first: the dynamic import may still be in flight and must not build a scene after unmount.
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      stopSwell?.();
      scene?.dispose();
    };
    // The timeline is fixed for a given mode, and the loop owns its own lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const enter = useCallback(() => enterRef.current(), []);
  useEffect(() => {
    const onKey = () => enter();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enter]);

  return (
    <div
      className={`intro ${exiting ? 'is-exiting' : ''}`}
      data-act={act}
      onClick={enter}
      role="presentation"
    >
      <canvas ref={canvasRef} className="intro__canvas" />
      <div className="intro__bloom" />

      <div className="intro__stage">
        <svg ref={crestRef} className="intro__crest" viewBox="-1.45 -1.45 2.9 2.9" aria-hidden="true">
          <defs>
            <linearGradient id="intro-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8f0d8" />
              <stop offset="50%" stopColor="#d8c088" />
              <stop offset="100%" stopColor="#8a6f3c" />
            </linearGradient>
          </defs>
          {CREST.map((line, index) => (
            <path
              key={index}
              d={pathData(line)}
              pathLength={1}
              style={{ ['--layer' as string]: line.layer }}
            />
          ))}
        </svg>

        <div className="intro__flash" />

        {/* Kept clear of the crest, which is centred on the viewport because the swarm is. */}
        <div className="intro__text">
        <h1 className="intro__title" aria-label={TITLE}>
          {[...TITLE].map((character, index) => (
            <span
              key={index}
              className="intro__char"
              style={{ ['--index' as string]: index }}
              aria-hidden="true"
            >
              {character === ' ' ? ' ' : character}
            </span>
          ))}
        </h1>

        <p className="intro__subtitle">Sigrogana Legend 2 · Character Sheet</p>

        <p className="intro__prompt">Press any key to begin</p>
        </div>
      </div>

      <button
        type="button"
        className="intro__skip"
        onClick={event => { event.stopPropagation(); enter(); }}
      >
        Skip
      </button>
    </div>
  );
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
