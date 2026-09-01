import { useCallback, useEffect, useRef, useState } from 'react';
import { CREST, pathData } from './crest';
import type { IntroScene } from './scene';
import { play, playSwell } from '../state/audio';

/**
 * The opening cinematic.
 *
 * Structure, and why it is shaped this way: the whole sequence is one rAF clock
 * reading a table of act boundaries, not a chain of `setTimeout`s. That makes
 * skipping, replaying and the short returning-visitor cut the same code path
 * (each is just a different table), and it means the WebGL swarm and the DOM
 * typography can never drift out of step, because both are driven from the one
 * elapsed time.
 *
 * React state changes at most five times over the whole run, at act boundaries.
 * Everything continuous happens in the loop: the swarm through shader uniforms,
 * the type and the crest through CSS animations keyed to those act classes.
 */

export type IntroMode = 'full' | 'short';

interface Timeline {
  /** The swarm's gather sweep, in ms. */
  gatherFrom: number;
  gatherTo: number;
  /** When the crest strokes begin drawing. */
  sigilAt: number;
  /** When the crest lands: the flash and the chord. */
  flashAt: number;
  titleAt: number;
  promptAt: number;
  /** When it enters on its own, if nothing is pressed. */
  autoAt: number;
  /** How long the outward burst and fade take. */
  exitMs: number;
}

const TIMELINES: Record<IntroMode, Timeline> = {
  // First visit: the whole overture.
  full: {
    gatherFrom: 450, gatherTo: 3600,
    sigilAt: 2850, flashAt: 4050, titleAt: 4250, promptAt: 5500,
    autoAt: 7900, exitMs: 1050,
  },
  /*
   * Every visit after: the crest snaps together, flares, and the sheet opens.
   * A seven-second overture is a pleasure once and a toll thereafter, so this
   * one is short enough to read as a page transition rather than as a wait,
   * and there is no prompt, because it never pauses for one.
   */
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

  // The page must not scroll behind the curtain. It leaves a live scrollbar
  // down the side of an otherwise full-bleed cinematic.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    /*
     * Three is loaded on demand, which keeps about 600KB off the sheet's critical
     * path and out of the download entirely for anyone who has asked for reduced
     * motion, since they never mount this component.
     *
     * The timeline does not wait for it. Every value is derived from elapsed time
     * rather than accumulated frame by frame, so a swarm that arrives 200ms late
     * simply appears at the position it should already be in, and the first act
     * is a dark screen regardless.
     */
    let scene: IntroScene | null = null;
    let disposed = false;

    // Measured rather than derived, so the stylesheet stays in charge of how big
    // the crest is and where it sits.
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

      // Acts only ever move forward, and each transition is one React render.
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
      // Set before disposing: the dynamic import may still be in flight, and its
      // callback must not build a scene for a component that is already gone.
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      stopSwell?.();
      scene?.dispose();
    };
    // The timeline is fixed for a given mode, and the loop owns its own lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Any key, any click. The intro is a curtain, not a gate.
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

        {/* Placed clear of the crest rather than flowing beneath it: the crest is
            centred on the viewport, because the swarm that forms it is. */}
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
