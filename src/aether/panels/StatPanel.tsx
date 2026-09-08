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

/**
 * Attribute allocation.
 *
 * Each row is one tab stop, and the arrow keys spend points rather than moving
 * between rows: the same shape as a console character sheet, and the reason the
 * steppers inside a row are taken out of the tab order. Vertical movement still
 * works from anywhere in the grid.
 *
 * The bar under each stat is stacked, not a single fill: the hatched part is the
 * floor the character already has from race, and the solid part is what has been
 * invested on top. Both are measured against the hard cap of 80, so the gap at
 * the right edge is exactly how much more the stat can take.
 *
 * The value column reports raw or scaled points, switched in the header and
 * remembered between visits. Both figures answer questions a build asks
 * constantly (raw is what the cap allows, scaled is what the formulas read), and
 * the tooltip that used to be the only place the other one appeared could not be
 * reached at all on a touch screen. Every row also opens a **card** carrying both
 * figures, their provenance and what the stat does; the sheet owns that card,
 * because the derived rail opens it too.
 */
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
    // The keys the hint line under the grid advertises: the card, and the unit the
    // value column is in. `Enter` and `Space` have no other meaning on a row.
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
    /*
     * Step by a whole grid row. The grid is one column on a narrow viewport and
     * two on a wide one, so the stride is read off the live computed style rather
     * than assumed: moving down by one item in two-column mode would jump
     * sideways instead.
     */
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
      // Sized by its content; the page is what scrolls in this column.
      scroll={false}
      meta={
        <>
          <ViewSwitch view={view} onPick={onView} />
          <span>{evaluation.pointsSpent} / {evaluation.pointBudget}</span>
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
            // The sign follows the number actually on screen, so the count-up
            // through zero never renders as "−0".
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

      {/* One caption block per grid column; the second is hidden while single-column. */}
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

      <p className="hint hint--keys" style={{ marginTop: 7, fontSize: 10.5 }}>
        <span className="keycap">Tab</span> move · <span className="keycap">←</span>
        <span className="keycap">→</span> spend · <span className="keycap">Shift</span> ×10 ·
        <span className="keycap">Home</span>/<span className="keycap">End</span> empty or fill ·
        <span className="keycap">I</span> card · <span className="keycap">R</span> raw/scaled · drag a bar to set it
      </p>
    </Panel>
  );
}

/**
 * The unit the value column is in.
 *
 * In the panel header rather than beside each number, because it is one question
 * about all twelve rows at once: twelve switches would be twelve ways to end up
 * comparing a raw figure against a scaled one.
 */
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

      {/*
        * The name opens the card. Out of the tab order like the steppers beside it,
        * so the row stays one tab stop: the keyboard reaches the same card with I.
        */}
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
