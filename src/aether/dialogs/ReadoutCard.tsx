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

/**
 * One entry of the derived rail, as the card can open it.
 *
 * The rail holds two kinds of line and both were hover-only, so both are here
 * rather than only the twenty that were easier. They share a card because they
 * answer the same question (what is this number, and what moves it), and the
 * difference between them is which figures the top of the card carries.
 */
export type RailEntry =
  | { kind: 'readout'; key: string; label: string; group: string; row: ReadoutRow }
  | { kind: 'element'; key: string; label: string; row: ElementalRow };

interface ReadoutCardProps {
  entry: RailEntry;
  /** Every rail entry in rail order, for stepping through them. */
  entries: RailEntry[];
  build: BuildState;
  evaluation: BuildEvaluation;
  onSelect: (key: string) => void;
  onClose: () => void;
  /** Opens the attribute card for a stat this value reads from. */
  onInspectStat: (stat: StatKey) => void;
  /** Routes to the manual ATK / RES adjusters in the Advanced dialog. */
  onAdjust?: () => void;
}

/**
 * A derived value's card: the figure, the formula behind it, and the attributes
 * it reads.
 *
 * The rail's `title` tooltips carried the formulas, which meant they carried them
 * on a desktop and nowhere else. They also dead-ended: knowing Max HP is ten times
 * scaled VIT is the moment you want to be looking at VIT, and a tooltip cannot
 * take you there. So every stat named here is a button through to that attribute's
 * card, and taking one closes this card rather than stacking a second dialog over
 * it. One thing is being read at a time.
 */
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
          {/*
            * A partial figure means two different things depending on the row: a
            * character-side term a weapon adds to, or (for the one ratio row) a
            * load counted over some of the slots. The dagger note under the
            * formula is what says which, so this only has to not contradict it.
            */}
          <span className="figure__note">
            {ratio
              ? (row.partial ? 'Partial count, see below' : 'Counted')
              : (row.partial ? 'Character contribution only' : 'Live, from this build')}
          </span>
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

      <Sources
        stats={row.stats}
        evaluation={evaluation}
        onInspectStat={onInspectStat}
        empty="No attribute feeds this one. It comes from what you have equipped."
      />
    </>
  );
}

/**
 * Which rail rows carry an itemised source list, and which channels each shows.
 *
 * A total row shows both channels, because the split is what explains the total.
 * A bonus row shows only its own: listing base sources under "Bonus Evade" reads
 * as a claim that scaled CEL is part of Bonus Evade, which it is not.
 */
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

/**
 * Where a derived figure comes from, source by source.
 *
 * Two lists rather than one, because the split is the thing worth seeing: base
 * sources are uncapped, and bonus sources compete for a shared +50 ceiling. A
 * build at that ceiling is choosing between the effects in the second list
 * whether it knows it or not, so they are shown together with what the cap is
 * discarding.
 *
 * `evaluateBuild` guarantees these reconcile (a test holds the itemised sums
 * against the reported figures), so the totals here are the same numbers the rail
 * shows rather than a second calculation of them.
 */
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
          {/* Wrapped, so the button is its own width rather than the section's. */}
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

/** The attributes a figure reads, each a route to that attribute's own card. */
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
