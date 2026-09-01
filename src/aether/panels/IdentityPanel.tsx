import { useMemo } from 'react';
import type { StatKey } from '../../types';
import { SUBRACES } from '../../data/races';
import { ASTROLOGY_PLANETS, FOODS, HISTORY, PLANET_ELEMENTS } from '../../data/bonuses';
import { STAT_COLORS, onDark } from '../../data/colors';
import { Panel } from '../ui/Panel';
import { SelectField } from '../ui/controls';
import { RACE_NAMES, STAT_KEYS, subracesFor } from '../state/build';
import type { Builder } from '../state/useBuilder';

const LEVELS = Array.from({ length: 60 }, (_, index) => 60 - index);

/**
 * Who the character is, before any points are spent.
 *
 * Race and subrace set the stat floor every allocation sits on top of, so this
 * panel sits above the class browser rather than beside it: changing a subrace
 * re-clamps the whole sheet, and the ordering makes that cause visible.
 */
export function IdentityPanel({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;

  const allowedSubraces = useMemo(() => subracesFor(build.race), [build.race]);
  const racialLine = SUBRACES[build.subrace];

  return (
    <Panel
      id="panel-identity"
      title="Identity"
      scroll={false}
      meta={<span className="num">Lv {build.characterLevel}</span>}
    >
      <div className="stack">
        <div className="grid-2">
          <SelectField
            label="Race"
            value={build.race}
            options={RACE_NAMES.map(name => ({ value: name, label: name }))}
            onChange={race => dispatch({ type: 'race', race })}
          />
          <SelectField
            label="Subrace"
            value={build.subrace}
            options={allowedSubraces.map(name => ({ value: name, label: name }))}
            onChange={subrace => dispatch({ type: 'subrace', subrace })}
          />
        </div>

        <div className="grid-2">
          <SelectField
            label="Level"
            value={String(build.characterLevel)}
            options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
            onChange={level => dispatch({ type: 'level', level: Number(level) })}
            title="Each level grants 4 attribute points and one trait point every third level."
          />
          <SelectField
            label="History"
            value={build.history}
            options={Object.keys(HISTORY).map(name => ({ value: name, label: name }))}
            onChange={history => dispatch({ type: 'field', patch: { history } })}
            title={HISTORY[build.history]?.description ?? ''}
          />
        </div>

        <div className="grid-2">
          <SelectField
            label="Star Sign"
            value={build.astrology}
            options={[
              { value: '', label: 'None' },
              ...Object.keys(ASTROLOGY_PLANETS).map(planet => ({
                value: planet,
                label: `${planet} · ${ASTROLOGY_PLANETS[planet].toUpperCase()}`,
              })),
            ]}
            onChange={astrology => dispatch({ type: 'field', patch: { astrology } })}
            title="A planet grants +1 to its stat and +2 to its element's attack."
          />
          <SelectField
            label="Meal"
            value={build.food}
            options={Object.keys(FOODS).map(name => ({ value: name, label: name }))}
            onChange={food => dispatch({ type: 'field', patch: { food } })}
            title={FOODS[build.food]?.description ?? ''}
          />
        </div>

        <div className="divider" />

        <div className="inline" style={{ gap: 4 }}>
          <span className="eyebrow" style={{ marginRight: 4 }}>Racial line</span>
          {STAT_KEYS.filter(stat => (racialLine?.[stat] ?? 0) !== 0).map(stat => (
            <span key={stat} className="chip" style={{ color: tint(stat) }}>
              {stat.toUpperCase()} {racialLine?.[stat]}
            </span>
          ))}
          {build.astrology ? (
            <span className="chip chip--gold">
              {PLANET_ELEMENTS[build.astrology]} +2
            </span>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function tint(stat: StatKey): string {
  const color = STAT_COLORS[stat];
  return color === 'rainbow' ? 'var(--gold-200)' : onDark(color);
}
