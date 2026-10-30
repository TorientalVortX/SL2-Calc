import { useCallback, type KeyboardEvent } from 'react';
import type { StatKey } from '../../types';
import { statInk } from '../../data/colors';
import { STAT_INFO } from '../../data/stats';
import { Panel } from '../ui/Panel';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { StatTrack } from '../ui/StatTrack';
import { play } from '../state/audio';
import { STAT_HARD_CAP, STAT_KEYS, STAT_NAMES } from '../state/build';
import { formatScaled, statBreakdown } from '../state/readout';
import { STAT_VIEW_LABEL, type StatView } from '../state/statView';
import type { Builder } from '../state/useBuilder';

/** Bars measure against the hard cap of 80; the hatched part is the racial floor. */
export function StatPanel({
  builder,
  view,
  onView,
  onInspectStat,
}: {
  builder: Builder;
  view: StatView;
  onView: (view: StatView) => void;
  onInspectStat: (stat: StatKey) => void;
}) {
  const { build, evaluation, dispatch } = builder;
  const remaining = evaluation.pointBudget - evaluation.pointsSpent;
  const over = remaining < 0;
  const spentFraction = Math.min(1.4, evaluation.pointsSpent / Math.max(1, evaluation.pointBudget));

  const onGridKeys = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    const stat = (event.target as HTMLElement).dataset?.stat as StatKey | undefined;

    if (stat && (key === 'arrowleft' || key === 'a' || key === 'arrowright' || key === 'd')) {
      event.preventDefault();
      const size = event.shiftKey ? 10 : 1;
      const delta = key === 'arrowleft' || key === 'a' ? -size : size;
      play('move');
      dispatch({ type: 'stat-delta', stat, delta });
      return;
    }
    if (stat && (key === 'home' || key === 'end')) {
      event.preventDefault();
      play('select');
      dispatch({
        type: 'stat',
        stat,
        value: key === 'home' ? 0 : evaluation.maxInvestedStats[stat],
      });
      return;
    }
    if (stat && (key === 'i' || key === 'enter' || key === ' ')) {
      event.preventDefault();
      play('select');
      onInspectStat(stat);
      return;
    }
    if (key === 'r') {
      event.preventDefault();
      onView(view === 'raw' ? 'scaled' : 'raw');
      return;
    }
    if (key !== 'arrowup' && key !== 'w' && key !== 'arrowdown' && key !== 's') return;

    const rows = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-nav]')];
    const index = rows.findIndex(row => row === document.activeElement);
    if (index < 0) return;
    // One column or two depending on viewport, so the stride is read off the live style.
    const columns = getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').length;
    const stride = Math.max(1, columns);
    const next = index + (key === 'arrowup' || key === 'w' ? -stride : stride);
    if (next < 0 || next >= rows.length) return;
    event.preventDefault();
    rows[next].focus();
    play('move');
  }, [dispatch, evaluation.maxInvestedStats, onInspectStat, onView, view]);

  return (
    <Panel
      id="panel-attributes"
      title="Attributes"
      scroll={false}
      meta={
        <>
          <ViewSwitch view={view} onPick={onView} />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => { play('back'); dispatch({ type: 'stats-clear' }); }}
          >
            Clear
          </button>
        </>
      }
    >
      <div className={`pool ${over ? 'is-over' : ''} ${remaining === 0 ? 'is-spent' : ''}`}>
        <div>
          <div className="eyebrow">{over ? 'Over-allocated' : 'Points remaining'}</div>
          <AnimatedNumber
            value={Math.abs(remaining)}
            className="pool__value"
            // Signed off the displayed number, so the count-up through zero never renders "−0".
            format={value => {
              const shown = Math.round(value);
              return over && shown > 0 ? `−${shown}` : String(shown);
            }}
          />
        </div>
        <div className="pool__meter">
          <i style={{ width: `${Math.min(100, spentFraction * 100)}%` }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="eyebrow">Budget</div>
          <div className="num" style={{ fontSize: 15, color: 'var(--text-2)' }}>
            {evaluation.pointBudget}
          </div>
        </div>
      </div>

      {over ? (
        <div className="warnings">
          This spread spends {Math.abs(remaining)} more point{Math.abs(remaining) === 1 ? '' : 's'} than
          level {build.characterLevel} grants. Reduce a stat or raise the level.
        </div>
      ) : null}

      <div className="stat-head-row" aria-hidden="true">
        <StatHead view={view} />
        <StatHead view={view} second />
      </div>

      <div className="stat-grid" onKeyDown={onGridKeys}>
        {STAT_KEYS.map(stat => (
          <StatRow
            key={stat}
            stat={stat}
            builder={builder}
            view={view}
            onInspect={() => { play('select'); onInspectStat(stat); }}
          />
        ))}
      </div>
    </Panel>
  );
}

function ViewSwitch({ view, onPick }: { view: StatView; onPick: (view: StatView) => void }) {
  return (
    <span className="tabs tabs--mini" role="radiogroup" aria-label="Attribute totals">
      {(['scaled', 'raw'] as StatView[]).map(option => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={view === option}
          className={`tab ${view === option ? 'is-active' : ''}`}
          title={option === 'raw'
            ? 'Show the totals the 80 cap is measured against (R)'
            : 'Show the totals the game’s formulas read, after diminishing returns (R)'}
          onClick={() => onPick(option)}
        >
          {STAT_VIEW_LABEL[option]}
        </button>
      ))}
    </span>
  );
}

function StatHead({ view, second }: { view: StatView; second?: boolean }) {
  return (
    <div className={`stat-head ${second ? 'stat-head--second' : ''}`}>
      <span />
      <span>Attribute</span>
      <span>Points</span>
      <span>Allocation vs. cap {STAT_HARD_CAP}</span>
      <span>{STAT_VIEW_LABEL[view]}</span>
    </div>
  );
}

function StatRow({
  stat,
  builder,
  view,
  onInspect,
}: {
  stat: StatKey;
  builder: Builder;
  view: StatView;
  onInspect: () => void;
}) {
  const { build, evaluation, dispatch } = builder;
  const parts = statBreakdown(build, evaluation, stat);
  const { cap, floor, invested } = parts;
  const shown = view === 'raw' ? parts.raw : parts.scaled;
  const color = statInk(stat);

  const title = [
    STAT_INFO[stat]?.title ?? STAT_NAMES[stat],
    `Racial and bonus floor: ${floor}`,
    `Invested: ${invested} of a possible ${cap}`,
    `Raw total: ${formatScaled(parts.raw)} → scaled ${formatScaled(parts.scaled)}`,
    'Open the card for what it does: tap the name, or press I.',
  ].join('\n');

  return (
    <div
      className="stat"
      data-nav
      data-stat={stat}
      tabIndex={0}
      role="group"
      aria-label={`${STAT_NAMES[stat]}, ${invested} of ${cap} invested`}
      title={title}
    >
      <span className="stat__gem" style={{ color }} />

      {/* Out of the tab order so the row stays one tab stop; I opens the same card. */}
      <button
        type="button"
        tabIndex={-1}
        className="stat__name"
        aria-label={`About ${STAT_NAMES[stat]}`}
        onClick={onInspect}
      >
        <span className="stat__abbr">{stat}</span>
        <span className="stat__full">{STAT_NAMES[stat]}</span>
      </button>

      <span className="stat__stepper">
        <button
          type="button"
          tabIndex={-1}
          className="step"
          disabled={invested <= 0}
          aria-label={`Lower ${STAT_NAMES[stat]}`}
          onClick={() => { play('move'); dispatch({ type: 'stat-delta', stat, delta: -1 }); }}
        >
          −
        </button>
        <input
          type="number"
          tabIndex={-1}
          className={`stat__input ${invested >= cap ? 'is-capped' : ''}`}
          value={invested}
          min={0}
          max={cap}
          aria-label={`${STAT_NAMES[stat]} points`}
          onChange={event => dispatch({ type: 'stat', stat, value: Number(event.target.value) || 0 })}
        />
        <button
          type="button"
          tabIndex={-1}
          className="step"
          disabled={invested >= cap}
          aria-label={`Raise ${STAT_NAMES[stat]}`}
          onClick={() => { play('move'); dispatch({ type: 'stat-delta', stat, delta: 1 }); }}
        >
          +
        </button>
      </span>

      <StatTrack
        floor={floor}
        invested={invested}
        color={color}
        onSet={value => dispatch({ type: 'stat', stat, value })}
      />

      <span className={`stat__scaled ${view === 'raw' ? 'is-raw' : ''}`}>
        <AnimatedNumber value={Math.round(shown * 10) / 10} format={formatScaled} />
      </span>
    </div>
  );
}
