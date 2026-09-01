import { useMemo, useState, type KeyboardEvent } from 'react';
import type { StatKey } from '../../types';
import { ELEMENT_COLORS, onDark } from '../../data/colors';
import { play } from '../state/audio';
import { Panel, SectionHead } from '../ui/Panel';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ReadoutCard, type RailEntry } from '../dialogs/ReadoutCard';
import { useListNavigation } from '../hooks/useListNavigation';
import { elementAdjustment, elementalRows, formatReadout, readoutGroups } from '../state/readout';
import type { Builder } from '../state/useBuilder';

/**
 * Every derived value, recomputed from the one evaluation the sheet shares.
 *
 * A dagger marks a number that is not the whole story: Hit and Critical before a
 * weapon is equipped, and the weight load, which can only count the two slots the
 * wiki gives a weight. The footnote appears only when a marked row is on screen,
 * so it does not sit there explaining nothing, and its text comes off the rows
 * themselves so the footnote and each row's card cannot say different things.
 *
 * Every line is also a button onto its **card**: the formula behind the figure,
 * and the attributes it reads as routes to those attributes' own cards. The row
 * tooltips carried the formulas before, which is to say they carried them on a
 * desktop and nowhere else, and a tooltip that tells you Max HP is ten times
 * scaled VIT cannot then take you to VIT.
 */
export function AttributesRail({
  builder,
  onInspectStat,
  onAdjustElements,
}: {
  builder: Builder;
  /** Opens an attribute's card, which the sheet owns rather than this panel. */
  onInspectStat: (stat: StatKey) => void;
  /** Route to the manual ATK/RES adjusters, which live in the Advanced dialog. */
  onAdjustElements?: () => void;
}) {
  const { build, evaluation } = builder;
  const groups = useMemo(() => readoutGroups(evaluation), [evaluation]);
  const elements = useMemo(() => elementalRows(evaluation), [evaluation]);

  /*
   * Both kinds of line in one flat list, in the order they are on screen. The card
   * steps through this, so its prev/next walks the rail as it reads rather than
   * stopping at the boundary between the readouts and the elements.
   */
  const entries = useMemo<RailEntry[]>(() => [
    ...groups.flatMap(group => group.rows.map((row): RailEntry => ({
      kind: 'readout', key: row.key, label: row.label, group: group.title, row,
    }))),
    ...elements.map((row): RailEntry => ({
      kind: 'element', key: `element:${row.element}`, label: row.element, row,
    })),
  ], [groups, elements]);

  const notes = useMemo(
    () => [...new Set(groups.flatMap(group => group.rows).filter(row => row.partial).map(row => row.note))]
      .filter((note): note is string => Boolean(note)),
    [groups],
  );

  const [inspecting, setInspecting] = useState<string | null>(null);
  const entry = entries.find(candidate => candidate.key === inspecting);
  const onListKeys = useListNavigation();

  /** The card's key on a focused row, so the mouse is not the only way in. */
  const onRowKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key.toLowerCase() !== 'i') return;
    const key = (event.target as HTMLElement).dataset?.entry;
    if (!key) return;
    event.preventDefault();
    play('select');
    setInspecting(key);
  };

  const open = (key: string) => { play('select'); setInspecting(key); };

  return (
    <Panel
      id="panel-derived"
      title="Derived"
      meta={<span className="num">live</span>}
    >
      <div onKeyDown={event => { onListKeys(event); onRowKeys(event); }}>
        {groups.map(group => (
          <div className="section" key={group.key}>
            <SectionHead>{group.title}</SectionHead>
            <div>
              {group.rows.map(row => (
                <button
                  type="button"
                  className="readout readout--open"
                  key={row.key}
                  data-nav
                  data-entry={row.key}
                  title={`${row.hint}\nOpen the card: click, or press I.`}
                  onClick={() => open(row.key)}
                >
                  <span className="readout__label">
                    {row.label}
                    {row.partial ? <sup>†</sup> : null}
                  </span>
                  <span className={`readout__value ${row.warn ? 'is-warn' : ''}`}>
                    <AnimatedNumber
                      value={row.value}
                      format={value => formatReadout(Math.round(value), row.format)}
                    />
                    {row.format === 'ratio' ? (
                      <span className="readout__of">/{row.secondary}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="section">
          <SectionHead
            aside={onAdjustElements ? (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                title="Add a flat ATK or RES adjustment per element"
                onClick={() => { play('select'); onAdjustElements(); }}
              >
                Adjust
              </button>
            ) : undefined}
          >
            Elements
          </SectionHead>
          <div className="element-head">
            <span />
            <span>Element</span>
            <span>ATK</span>
            <span>RES</span>
          </div>
          <div className="elements">
            {elements.map(row => {
              const adjusted = elementAdjustment(build, row.element);
              return (
                <button
                  type="button"
                  className="element element--open"
                  key={row.element}
                  data-nav
                  data-entry={`element:${row.element}`}
                  style={{ color: onDark(ELEMENT_COLORS[row.element]) }}
                  title={[
                    `${row.element} attack scales from ${row.stat.toUpperCase()}.`,
                    'Resistance is a percentage, from SAN and your race.',
                    adjusted ? `Includes your manual adjustment: ${adjusted}.` : '',
                    'Open the card: click, or press I.',
                  ].filter(Boolean).join(' ')}
                  onClick={() => open(`element:${row.element}`)}
                >
                  <span className="element__gem" />
                  <span className="element__name">
                    {row.element}
                    {adjusted ? <span className="element__flag" title="Manually adjusted">±</span> : null}
                  </span>
                  <AnimatedNumber
                    className={`element__num ${row.attack === 0 ? 'is-zero' : ''}`}
                    value={row.attack}
                  />
                  <AnimatedNumber
                    className={`element__num ${row.resistance === 0 ? 'is-zero' : ''} ${row.resistance < 0 ? 'is-negative' : ''}`}
                    value={row.resistance}
                    format={value => `${Math.round(value)}%`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {notes.length ? (
        <p className="hint" style={{ marginTop: 12 }}>
          <sup style={{ color: 'var(--gold-500)' }}>†</sup> {notes.join(' ')}
        </p>
      ) : null}

      <p className="hint hint--keys" style={{ marginTop: 7, fontSize: 10.5 }}>
        <span className="keycap">Tab</span> or <span className="keycap">↑</span>
        <span className="keycap">↓</span> move · <span className="keycap">Enter</span> or{' '}
        <span className="keycap">I</span> opens the card behind any figure
      </p>

      {entry ? (
        <ReadoutCard
          entry={entry}
          entries={entries}
          build={build}
          evaluation={evaluation}
          onSelect={setInspecting}
          onClose={() => setInspecting(null)}
          // Replaces this card rather than stacking over it: one figure is being
          // read at a time, and the attribute card is where that trail leads.
          onInspectStat={stat => { setInspecting(null); onInspectStat(stat); }}
          onAdjust={onAdjustElements}
        />
      ) : null}
    </Panel>
  );
}
