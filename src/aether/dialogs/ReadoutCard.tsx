import type { BuildEvaluation, BuildState, StatKey } from '../../types';
import { elementInk, statInk } from '../../data/colors';
import { STAT_INFO } from '../../data/stats';
import { Modal } from '../ui/Modal';
import { SectionHead } from '../ui/Panel';
import { play } from '../state/audio';
import { STAT_NAMES } from '../state/build';
import { HIT_TIERS, HIT_TIER_HINT, HIT_TIER_LABEL } from '../../domain/hitEvade';
import {
  elementAdjustment,
  formatReadout,
  formatScaled,
  type ElementalRow,
  type ReadoutRow,
} from '../state/readout';

export type RailEntry =
  | { kind: 'readout'; key: string; label: string; group: string; row: ReadoutRow }
  | { kind: 'element'; key: string; label: string; row: ElementalRow };

interface ReadoutCardProps {
  entry: RailEntry;
  entries: RailEntry[];
  build: BuildState;
  evaluation: BuildEvaluation;
  onSelect: (key: string) => void;
  onClose: () => void;
  onInspectStat: (stat: StatKey) => void;
  onAdjust?: () => void;
}

export function ReadoutCard({
  entry,
  entries,
  build,
  evaluation,
  onSelect,
  onClose,
  onInspectStat,
  onAdjust,
}: ReadoutCardProps) {
  const index = entries.findIndex(candidate => candidate.key === entry.key);
  const previous = entries[(index - 1 + entries.length) % entries.length];
  const next = entries[(index + 1) % entries.length];
  const walk = (to: RailEntry) => { play('move'); onSelect(to.key); };

  return (
    <Modal
      title={entry.kind === 'element' ? `${entry.label} element` : entry.label}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => walk(previous)}>
            &lsaquo; {previous.label}
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={() => walk(next)}>
            {next.label} &rsaquo;
          </button>
        </>
      }
    >
      {entry.kind === 'readout'
        ? <ReadoutBody entry={entry} evaluation={evaluation} onInspectStat={onInspectStat} />
        : (
          <ElementBody
            entry={entry}
            build={build}
            evaluation={evaluation}
            onInspectStat={onInspectStat}
            onAdjust={onAdjust}
          />
        )}
    </Modal>
  );
}

function ReadoutBody({
  entry,
  evaluation,
  onInspectStat,
}: {
  entry: Extract<RailEntry, { kind: 'readout' }>;
  evaluation: BuildEvaluation;
  onInspectStat: (stat: StatKey) => void;
}) {
  const { row } = entry;
  const ratio = row.format === 'ratio';
  const capacity = row.secondary ?? 0;
  const spare = capacity - row.value;

  return (
    <>
      <div className="inline" style={{ gap: 5, marginBottom: 11 }}>
        <span className="chip chip--gold">{entry.group}</span>
        {row.partial ? <span className="chip">Partial</span> : null}
        {row.warn ? <span className="chip chip--alert">Over capacity</span> : null}
      </div>

      <div className={`figures ${ratio ? '' : 'figures--one'}`}>
        <div className="figure figure--static is-active">
          <span className="eyebrow">{ratio ? 'Carried' : 'Current'}</span>
          <span className="figure__value">{formatReadout(row.value, ratio ? 'integer' : row.format)}</span>
          {(ratio || row.partial) && <span className="figure__note">
            {ratio
              ? (row.partial ? 'Partial count, see below' : 'Counted')
              : 'Character contribution only'}
          </span>}
        </div>
        {ratio ? (
          <div className="figure figure--static">
            <span className="eyebrow">Capacity</span>
            <span className="figure__value">{capacity}</span>
            <span className="figure__note">
              {spare >= 0 ? `${spare} spare` : `${-spare} over`}
            </span>
          </div>
        ) : null}
      </div>

      <p className="hint statcard__returns">{row.hint}</p>

      {row.warn ? (
        <div className="warnings" style={{ marginTop: 9 }}>
          {-spare} over capacity. The wiki puts the penalty at −2 Hit and −2 Evade for every excess
          point; the calculator reports the overage but does not apply it, so every figure in the
          rail is still an unpenalised one. Drop a piece or raise STR.
        </div>
      ) : null}

      {row.note ? (
        <p className="hint" style={{ marginTop: 8 }}>
          <sup style={{ color: 'var(--gold-500)' }}>†</sup> {row.note}
        </p>
      ) : null}

      <Provenance evaluation={evaluation} rowKey={entry.kind === 'readout' ? entry.row.key : ''} />

      {row.key === 'fp' && <div className="section">
        <SectionHead>FP contributions</SectionHead>
        {evaluation.sources.fp.map(source => <div className="provenance__row" key={source.label}>
          <span>{source.label}</span><span>{signed(source.value)}</span>
        </div>)}
      </div>}
      <Sources
        stats={row.stats}
        evaluation={evaluation}
        onInspectStat={onInspectStat}
        empty="No attribute feeds this one. It comes from what you have equipped."
      />
    </>
  );
}

const PROVENANCE_ROWS: Record<string, {
  key: 'hit' | 'evade';
  channels: Array<'base' | 'bonus'>;
  tiers?: boolean;
}> = {
  hit: { key: 'hit', channels: ['base', 'bonus'], tiers: true },
  hitBonus: { key: 'hit', channels: ['bonus'] },
  evade: { key: 'evade', channels: ['base', 'bonus'] },
  evadeBonus: { key: 'evade', channels: ['bonus'] },
};

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

/** Bonus sources share a +50 ceiling; base sources are uncapped. */
function Provenance({ evaluation, rowKey }: { evaluation: BuildEvaluation; rowKey: string }) {
  const config = PROVENANCE_ROWS[rowKey];
  if (!config) return null;
  const sources = evaluation.sources[config.key];
  if (!sources.length) return null;

  const base = config.channels.includes('base') ? sources.filter(source => source.channel === 'base') : [];
  const bonus = config.channels.includes('bonus') ? sources.filter(source => source.channel === 'bonus') : [];
  const bonusBought = bonus.reduce((total, source) => total + source.value, 0);
  const bonusApplied = config.key === 'evade'
    ? evaluation.derived.evadeBonus
    : evaluation.derived.hitBonusApplied;
  const wasted = config.key === 'evade'
    ? evaluation.derived.evadeBonusWasted
    : evaluation.derived.hitBonusWasted;

  const rows = (list: typeof sources, total: number, totalLabel: string) => (
    <div className="provenance">
      {list.map(source => (
        <div className="provenance__row" key={source.label}>
          <span className="provenance__label">{source.label}</span>
          <span className={`provenance__value${source.value < 0 ? ' provenance__value--negative' : ''}`}>
            {signed(source.value)}
          </span>
        </div>
      ))}
      <div className="provenance__row provenance__row--total">
        <span className="provenance__label">{totalLabel}</span>
        <span className="provenance__value">{total}</span>
      </div>
    </div>
  );

  return (
    <>
      {base.length > 0 && (
        <div className="section">
          <SectionHead aside="uncapped">Base sources</SectionHead>
          {rows(base, base.reduce((total, source) => total + source.value, 0), 'Base total')}
        </div>
      )}

      {config.tiers && (
        <div className="section">
          <SectionHead aside="by position">Positional Hit</SectionHead>
          <p className="hint" style={{ padding: '0 2px 7px' }}>
            Half the Flanking stat per condition met, and Honor out of whatever the bonus ceiling
            has left. A build already at the ceiling gains nothing from a frontal attack.
          </p>
          <div className="provenance">
            {HIT_TIERS.map(tier => (
              <div className="provenance__row" key={tier}>
                <span className="provenance__label" title={HIT_TIER_HINT[tier]}>{HIT_TIER_LABEL[tier]}</span>
                <span className="provenance__value">{evaluation.derived.hitTiers[tier]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bonus.length > 0 && (
        <div className="section">
          <SectionHead aside="capped at 50">Bonus sources</SectionHead>
          {rows(bonus, bonusApplied, 'Applied after cap')}
          {wasted > 0 && (
            <p className="provenance__capped">
              {bonusBought} bought, {bonusApplied} applied. The +50 cap is discarding {wasted}.
              These effects share one ceiling, so anything above it is paid for and never used.
            </p>
          )}
        </div>
      )}
    </>
  );
}

function ElementBody({
  entry,
  build,
  evaluation,
  onInspectStat,
  onAdjust,
}: {
  entry: Extract<RailEntry, { kind: 'element' }>;
  build: BuildState;
  evaluation: BuildEvaluation;
  onInspectStat: (stat: StatKey) => void;
  onAdjust?: () => void;
}) {
  const { row } = entry;
  const adjusted = elementAdjustment(build, row.element);
  const color = elementInk(row.element);

  return (
    <>
      <div className="inline" style={{ gap: 5, marginBottom: 11 }}>
        <span className="chip chip--gold" style={{ color }}>
          <span className="statcard__gem" style={{ color }} />
          {row.element}
        </span>
        <span className="chip">Scales from {row.stat.toUpperCase()}</span>
        {adjusted ? <span className="chip chip--gold">Adjusted {adjusted}</span> : null}
      </div>

      <div className="figures">
        <div className="figure figure--static is-active">
          <span className="eyebrow">Attack</span>
          <span className="figure__value">{row.attack}</span>
          <span className="figure__note">Added to {row.element} damage you deal</span>
        </div>
        <div className="figure figure--static">
          <span className="eyebrow">Resistance</span>
          <span className="figure__value">{row.resistance}%</span>
          <span className="figure__note">Taken off {row.element} damage you take</span>
        </div>
      </div>

      <p className="hint statcard__returns">
        {row.element} attack is one point per scaled {row.stat.toUpperCase()}. Resistance is a
        percentage, from SAN and from your race. Several races are outright weak to one element
        and strong against another.
        {adjusted ? ` Both figures include your manual adjustment: ${adjusted}.` : ''}
      </p>

      <Sources
        stats={row.stat === 'san' ? ['san'] : [row.stat, 'san']}
        evaluation={evaluation}
        onInspectStat={onInspectStat}
        empty=""
      />

      {onAdjust ? (
        <div className="section">
          <SectionHead>Corrections</SectionHead>
          <p className="hint" style={{ padding: '0 2px 7px' }}>
            For a flat ATK or RES the calculator has no field for: a buff, a consumable, an item
            it does not model.
          </p>
          <div className="inline">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => { play('select'); onAdjust(); }}
            >
              Adjust {row.element} ATK / RES
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Sources({
  stats,
  evaluation,
  onInspectStat,
  empty,
}: {
  stats: StatKey[];
  evaluation: BuildEvaluation;
  onInspectStat: (stat: StatKey) => void;
  empty: string;
}) {
  if (!stats.length) {
    return empty ? <p className="hint" style={{ marginTop: 10 }}>{empty}</p> : null;
  }
  return (
    <div className="section">
      <SectionHead aside="scaled">Reads from</SectionHead>
      <div className="sources">
        {stats.map(stat => {
          const color = statInk(stat);
          return (
            <button
              key={stat}
              type="button"
              className="source"
              title={STAT_INFO[stat]?.title ?? STAT_NAMES[stat]}
              onClick={() => { play('select'); onInspectStat(stat); }}
            >
              <span className="stat__gem" style={{ color }} />
              <span className="source__abbr">{stat}</span>
              <span className="source__name">{STAT_NAMES[stat]}</span>
              <span className="source__value">{formatScaled(evaluation.scaledStats[stat])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
