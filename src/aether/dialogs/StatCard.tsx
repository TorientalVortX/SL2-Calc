import { useMemo, type ReactNode } from 'react';
import { evaluateBuild } from '../../domain/buildEvaluation';
import type { StatKey } from '../../types';
import { elementInk, statInk } from '../../data/colors';
import { STAT_INFO } from '../../data/stats';
import { Modal } from '../ui/Modal';
import { SectionHead } from '../ui/Panel';
import { StatTrack } from '../ui/StatTrack';
import { play } from '../state/audio';
import { STAT_HARD_CAP, STAT_KEYS, STAT_NAMES } from '../state/build';
import { ELEMENT_FOR_STAT, formatScaled, statBreakdown } from '../state/readout';
import { STAT_VIEW_LABEL, type StatView } from '../state/statView';
import type { Builder } from '../state/useBuilder';

/**
 * One attribute's card: what it is, what it does, and where its number came from.
 *
 * The row's `title` tooltip said most of this already, and on a touch screen it
 * said none of it; there is no hover, so a third of the sheet's explanation was
 * unreachable on the device most likely to need it. So it is a dialog: reachable
 * by tap, by **I** on a focused row, and it carries the controls too rather than
 * only prose. A player who opens it to read what SAN does can spend into it and
 * step through the other eleven without going back to the grid.
 *
 * The Raw / Scaled switch is here as well as in the panel header on purpose. The
 * question "is that before or after diminishing returns" is asked at the moment
 * the number is being read, which is exactly when this card is open.
 */
interface StatCardProps {
  builder: Builder;
  stat: StatKey;
  view: StatView;
  onView: (view: StatView) => void;
  /** Steps to another attribute without closing, for the prev/next controls. */
  onSelect: (stat: StatKey) => void;
  onClose: () => void;
}

export function StatCard({ builder, stat, view, onView, onSelect, onClose }: StatCardProps) {
  const { build, evaluation, dispatch } = builder;
  const sources = useMemo(() => evaluateBuild(build, true).statSources!, [build]);
  const info = STAT_INFO[stat];
  const parts = statBreakdown(build, evaluation, stat);
  const element = ELEMENT_FOR_STAT[stat];
  const color = statInk(stat);
  const headroom = parts.cap - parts.invested;

  const index = STAT_KEYS.indexOf(stat);
  const previous = STAT_KEYS[(index - 1 + STAT_KEYS.length) % STAT_KEYS.length];
  const next = STAT_KEYS[(index + 1) % STAT_KEYS.length];

  const set = (value: number) => dispatch({ type: 'stat', stat, value });
  const step = (delta: number) => {
    play('move');
    dispatch({ type: 'stat-delta', stat, delta });
  };
  const walk = (to: StatKey) => { play('move'); onSelect(to); };

  return (
    <Modal
      title={info?.title ?? STAT_NAMES[stat]}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => walk(previous)}>
            &lsaquo; {STAT_NAMES[previous]}
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={() => walk(next)}>
            {STAT_NAMES[next]} &rsaquo;
          </button>
        </>
      }
    >
      <div className="inline" style={{ gap: 5, marginBottom: 11 }}>
        <span className="chip chip--gold">
          <span className="statcard__gem" style={{ color }} />
          {stat.toUpperCase()}
        </span>
        {element ? (
          <span className="chip" style={{ color: elementInk(element) }}>
            {element} · {evaluation.elementalAttack[element]} ATK
          </span>
        ) : null}
        {headroom > 0
          ? <span className="chip">{headroom} more allowed</span>
          : <span className="chip chip--gold">At the {STAT_HARD_CAP} cap</span>}
      </div>

      {/*
        * The two figures side by side, each also being the switch for the grid
        * behind. Showing both here and one there is not an inconsistency: the card
        * is where one number is read closely, and the grid is where twelve are
        * compared, which needs them all in the same unit.
        */}
      <div className="figures" role="radiogroup" aria-label="Which total the attribute grid shows">
        <Figure
          label="Raw"
          value={parts.raw}
          active={view === 'raw'}
          note={`Measured against the ${STAT_HARD_CAP} cap`}
          onPick={() => onView('raw')}
        />
        <Figure
          label="Scaled"
          value={parts.scaled}
          active={view === 'scaled'}
          note="What the formulas read"
          onPick={() => onView('scaled')}
        />
      </div>
      <p className="hint statcard__returns">
        {parts.returns < -0.05
          ? `Diminishing returns take ${formatScaled(-parts.returns)} off the raw total. Points above the soft cap buy less than a whole point each. `
          : 'Nothing lost to diminishing returns yet: every point here is still worth a whole point. '}
        The grid is showing <strong>{STAT_VIEW_LABEL[view].toLowerCase()}</strong> totals.
      </p>

      <div className="section">
        <SectionHead aside={`${parts.invested} of ${parts.cap} allowed`}>Allocation</SectionHead>
        <StatTrack
          slider
          className="stat__track--lg"
          label={`${STAT_NAMES[stat]} points`}
          floor={parts.floor}
          invested={parts.invested}
          color={color}
          onSet={set}
        />
        <div className="statcard__alloc">
          <span className="stat__stepper">
            <button
              type="button"
              className="step"
              disabled={parts.invested <= 0}
              onClick={() => step(-10)}
              aria-label={`Lower ${STAT_NAMES[stat]} by ten`}
            >
              −10
            </button>
            <button
              type="button"
              className="step"
              disabled={parts.invested <= 0}
              onClick={() => step(-1)}
              aria-label={`Lower ${STAT_NAMES[stat]}`}
            >
              −
            </button>
            <input
              type="number"
              className={`stat__input ${parts.invested >= parts.cap ? 'is-capped' : ''}`}
              value={parts.invested}
              min={0}
              max={parts.cap}
              aria-label={`${STAT_NAMES[stat]} points`}
              onChange={event => set(Number(event.target.value) || 0)}
            />
            <button
              type="button"
              className="step"
              disabled={headroom <= 0}
              onClick={() => step(1)}
              aria-label={`Raise ${STAT_NAMES[stat]}`}
            >
              +
            </button>
            <button
              type="button"
              className="step"
              disabled={headroom <= 0}
              onClick={() => step(10)}
              aria-label={`Raise ${STAT_NAMES[stat]} by ten`}
            >
              +10
            </button>
          </span>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            disabled={parts.invested <= 0}
            onClick={() => { play('back'); set(0); }}
          >
            Empty
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            disabled={headroom <= 0}
            onClick={() => { play('select'); set(parts.cap); }}
          >
            Fill
          </button>
        </div>
      </div>

      <div className="section">
        <SectionHead>Where the number comes from</SectionHead>
        <div>
          <Part
            label="Racial line and bonuses"
            value={parts.floor}
            hint="Subrace line and pre-cap changes from base corrections, Legend Extend, history, and star sign."
          />
          <Part label="Points invested" value={parts.invested} hint="Spent from the level pool." />
          <details key={stat} className="statcard__sources">
            <summary className="readout" style={{ cursor: 'pointer' }}>
              <span className="readout__label">Class, gear and elsewhere</span>
              <span className="readout__value">{parts.other > 0 ? '+' : ''}{formatScaled(parts.other)}</span>
            </summary>
            <div style={{ paddingLeft: 16 }}>
              {sources[stat].length ? sources[stat].map((source, index) => (
                <Part key={index} label={source.label} value={source.value} signed hint={source.label} />
              )) : <p className="hint">No additional sources for this stat.</p>}
            </div>
          </details>
          <Part label="Raw total" value={parts.raw} strong hint="Sum of the lines above." />
          <Part
            label="Scaled"
            value={parts.scaled}
            strong
            hint="Raw total after diminishing returns. Used by scaled-stat formulas."
          />
        </div>
      </div>

      {info?.effects?.length ? (
        <div className="section">
          <SectionHead aside={`${info.effects.length}`}>What it does</SectionHead>
          <ul className="statcard__effects">
            {info.effects.map(effect => <li key={effect}>{effect}</li>)}
          </ul>
        </div>
      ) : null}

      {info?.description ? (
        <div className="section">
          <SectionHead>About</SectionHead>
          <div className="statcard__prose">
            {info.description.split(/\n+/).filter(Boolean).map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/** One of the two headline figures, which doubles as the grid's unit switch. */
function Figure({
  label,
  value,
  note,
  active,
  onPick,
}: {
  label: string;
  value: number;
  note: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`figure ${active ? 'is-active' : ''}`}
      title={`Show ${label.toLowerCase()} totals in the attribute grid`}
      onClick={() => { play('select'); onPick(); }}
    >
      <span className="eyebrow">{label}</span>
      <span className="figure__value">{formatScaled(value)}</span>
      <span className="figure__note">{note}</span>
    </button>
  );
}

/** A line of the breakdown. Uses the rail's readout row so the two read alike. */
function Part({
  label,
  value,
  hint,
  signed,
  strong,
}: {
  label: string;
  value: number;
  hint: string;
  signed?: boolean;
  strong?: boolean;
}): ReactNode {
  const shown = formatScaled(value);
  return (
    <div className={`readout ${strong ? 'readout--strong' : ''}`} title={hint}>
      <span className="readout__label">{label}</span>
      <span className="readout__value">{signed && value > 0 ? `+${shown}` : shown}</span>
    </div>
  );
}
