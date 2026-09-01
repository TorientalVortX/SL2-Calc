import { Corners } from './Panel';
import { play } from '../state/audio';
import { GAME_DATA_MANIFEST } from '../../domain/buildPersistence';
import type { Builder } from '../state/useBuilder';

export type DialogName = 'templates' | 'saves' | 'transfer' | 'advanced' | 'shortcuts' | 'changes' | null;

interface MastheadProps {
  builder: Builder;
  onOpen: (dialog: DialogName) => void;
  onReplayIntro: () => void;
}

/** The application crest: a faceted diamond, drawn rather than imported. */
function Crest() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <defs>
        <linearGradient id="crest-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6ecd2" />
          <stop offset="55%" stopColor="#c0a262" />
          <stop offset="100%" stopColor="#6f5a31" />
        </linearGradient>
      </defs>
      <path d="M16 2 L28 16 L16 30 L4 16 Z" fill="none" stroke="url(#crest-gold)" strokeWidth="1.2" />
      <path d="M16 7 L23.5 16 L16 25 L8.5 16 Z" fill="none" stroke="url(#crest-gold)" strokeWidth="0.8" opacity="0.7" />
      <path d="M16 11.5 L19.5 16 L16 20.5 L12.5 16 Z" fill="url(#crest-gold)" opacity="0.85" />
      <path d="M4 16 H1 M28 16 H31" stroke="url(#crest-gold)" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

export function Masthead({ builder, onOpen, onReplayIntro }: MastheadProps) {
  const { build, buildName, setBuildName, evaluation, sound, setSound, version } = builder;
  const remaining = evaluation.pointBudget - evaluation.pointsSpent;

  return (
    <header className="masthead">
      <Corners />
      {/* The crest is also the way back to the opening sequence. */}
      <button
        type="button"
        className="masthead__mark"
        title="Replay the opening"
        aria-label="Replay the opening sequence"
        onClick={() => { play('confirm'); onReplayIntro(); }}
      >
        <Crest />
      </button>

      <span className="masthead__titles">
        <span className="masthead__title">Aether Codex</span>
        {/* The version is a route, not a label; the release and data notes are behind it. */}
        <button
          type="button"
          className="masthead__subtitle masthead__subtitle--link"
          title="What's new in this version and dataset"
          onClick={() => { play('select'); onOpen('changes'); }}
        >
          Sigrogana Legend 2 · Character Sheet · v{version} · Data {GAME_DATA_MANIFEST.dataVersion}
        </button>
      </span>

      <input
        className="masthead__name"
        value={buildName}
        onChange={event => setBuildName(event.target.value)}
        aria-label="Build name"
        spellCheck={false}
      />

      <span className="inline masthead__chips" style={{ gap: 5 }}>
        <span className="chip chip--gold">{build.mainClass}</span>
        <span className="chip">{build.mainClass === build.subClass ? 'Monoclass' : build.subClass}</span>
        <span className={`chip ${remaining < 0 ? 'chip--alert' : remaining === 0 ? 'chip--good' : ''}`}>
          {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} unspent`}
        </span>
      </span>

      <div className="masthead__actions">
        <button type="button" className="btn" onClick={() => { play('select'); onOpen('templates'); }}>
          Templates
        </button>
        <button type="button" className="btn" onClick={() => { play('select'); onOpen('saves'); }}>
          Builds
        </button>
        <button
          type="button"
          className="btn"
          title="Legend Extend, base-stat corrections, stamps, vitals and the elemental adjusters"
          onClick={() => { play('select'); onOpen('advanced'); }}
        >
          Advanced
        </button>
        <button type="button" className="btn btn--primary" onClick={() => { play('select'); onOpen('transfer'); }}>
          Import / Export
        </button>

        <span className="masthead__divider" />

        {/* The sheet is keyboard-first and said so only in its README until now. */}
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
          onClick={() => { play('select'); onOpen('shortcuts'); }}
        >
          <span className="keycap">?</span>
        </button>

        <button
          type="button"
          className={`btn btn--ghost btn--icon ${sound ? 'is-active' : ''}`}
          aria-pressed={sound}
          title={sound ? 'Menu sounds on' : 'Menu sounds off'}
          onClick={() => setSound(!sound)}
        >
          {sound ? '♪ On' : '♪ Off'}
        </button>
      </div>
    </header>
  );
}
