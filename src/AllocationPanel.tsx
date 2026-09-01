import { useState, type MutableRefObject } from 'react';
import { useHoldRepeat } from './useHoldRepeat';
import { SUBRACES } from './data/races';
import { CLASSES } from './data/classes';
import { PLANET_ELEMENTS } from './data/bonuses';
import { ELEMENT_COLORS, STAT_COLORS, onDark } from './data/colors';
import { STAT_INFO } from './data/stats';
import type { StatKey, StatRecord } from './types';
import { formatScaledStat, formatStatValue } from './statFormat';

type BonusTable = { stats: Partial<StatRecord> };

/**
 * The build values and actions the allocator needs.
 *
 * These lived in `StatAllocator.tsx`, which was the pre-deck allocator; the
 * component is gone and only its shapes were still in use.
 */
export interface StatAllocatorBuild {
  race: string;
  subrace: string;
  mainClass: string;
  monoclassModifier: number;
  addedStats: StatRecord;
  customStats: StatRecord;
  customBaseStats: StatRecord;
  stats: StatRecord;
  displayStats: StatRecord;
  totalPoints: number;
  showRawStats: boolean;
  luminaryElement: boolean;
  astrology: string;
  leBonus: Partial<StatRecord>;
  astroBonus: Partial<StatRecord>;
  foodBonus: BonusTable;
  historyBonus: BonusTable;
}

export interface StatAllocatorActions {
  addStat: (stat: StatKey) => void;
  removeStat: (stat: StatKey) => void;
  commitStatValue: (stat: StatKey, input: HTMLInputElement) => void;
}


/** The twelve stats in canonical order, with the labels the design shows. */
const STATS: Array<[abbr: string, key: StatKey]> = [
  ['STR', 'str'], ['WIL', 'wil'], ['SKI', 'ski'], ['CEL', 'cel'],
  ['DEF', 'def'], ['RES', 'res'], ['VIT', 'vit'], ['FAI', 'fai'],
  ['LUC', 'luc'], ['GUI', 'gui'], ['SAN', 'san'], ['APT', 'apt'],
];

const RAINBOW =
  'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)';

/** Widest value the composition bar scales against, so bars are comparable across stats. */
const BAR_SCALE = 80;

/** Resolve a stat's colour for rendering on the deck's near-black surfaces. */
function statColor(stat: StatKey, b: StatAllocatorBuild): string {
  if (stat === 'wil' && b.luminaryElement && b.astrology && PLANET_ELEMENTS[b.astrology]) {
    const element = ELEMENT_COLORS[PLANET_ELEMENTS[b.astrology]];
    if (element) return element;
  }
  const raw = STAT_COLORS[stat];
  return raw === 'rainbow' ? '#e6ebf5' : onDark(raw);
}

function Stepper({ label, title, onRepeat }: { label: string; title: string; onRepeat: () => void }) {
  const { start, stop } = useHoldRepeat(onRepeat);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      // Hold-to-repeat is driven by mousedown, which a keyboard never fires.
      // `detail === 0` marks a click synthesised by Enter/Space (or .click()),
      // so this adds keyboard activation without double-firing for mouse users.
      onClick={event => { if (event.detail === 0) onRepeat(); }}
      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-6 bg-surface-control text-16 font-medium text-content-muted select-none hover:bg-surface-active hover:text-content"
    >
      {label}
    </button>
  );
}

export interface AllocationPanelProps {
  b: StatAllocatorBuild;
  on: StatAllocatorActions;
  inputRefs: MutableRefObject<Record<string, HTMLInputElement>>;
  characterLevel: number;
  setCharacterLevel: (level: number) => void;
  showRawStats: boolean;
  setShowRawStats: (raw: boolean) => void;
}

/**
 * The command deck's centre column, built to the Turn 1 design.
 *
 * Points-remaining meter, inline level stepper, and a four-column allocation
 * table (Stat / Composition / Invested / Scaled) where each row shows how the
 * value is composed (base, invested, bonuses) as three tiers of the stat's own
 * colour rather than only its final number.
 */
export default function AllocationPanel({
  b,
  on,
  inputRefs,
  characterLevel,
  setCharacterLevel,
  showRawStats,
  setShowRawStats,
}: AllocationPanelProps) {
  const [expanded, setExpanded] = useState<StatKey | null>(null);
  const maxPoints = characterLevel * 4;
  const spent = Math.max(0, maxPoints - b.totalPoints);
  const spentPct = maxPoints > 0 ? Math.min(100, (spent / maxPoints) * 100) : 0;

  return (
    <div >
      {/* Points remaining + level */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[180px] flex-1">
          <div className="font-condensed text-10 font-semibold uppercase tracking-label text-content-ghost">
            Points remaining
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-26 font-bold tracking-tight-value text-content">{b.totalPoints}</span>
            <span className="font-mono text-12 text-content-faint">/ {maxPoints}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-control">
            <div
              className="h-full rounded-full bg-info transition-[width] duration-150"
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <div className="mt-1 font-mono text-11 text-content-ghost">{spent} allocated</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-condensed text-10 font-semibold uppercase tracking-label text-content-ghost">
              Level
            </span>
            <div className="flex items-center gap-1.5">
              <Stepper label="−" title="Decrease level" onRepeat={() => setCharacterLevel(Math.max(1, characterLevel - 1))} />
              <span className="w-8 text-center font-mono text-13 font-medium text-content">{characterLevel}</span>
              <Stepper label="+" title="Increase level" onRepeat={() => setCharacterLevel(Math.min(60, characterLevel + 1))} />
            </div>
          </div>

          <div className="flex rounded-7 border border-edge-muted p-0.5">
            {([['True (DR)', false], ['Raw', true]] as const).map(([label, raw]) => (
              <button
                key={label}
                type="button"
                onClick={() => setShowRawStats(raw)}
                className={`rounded-6 px-3 py-1.5 text-12 font-medium transition-colors ${
                  showRawStats === raw
                    ? 'bg-info-bg text-content'
                    : 'text-content-muted hover:text-content-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[92px_1fr_128px_116px] border-b border-edge-faint bg-surface-sunken px-5 py-2.5">
        <div className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">Stat</div>
        <div className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">Composition</div>
        <div className="text-center font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">Invested</div>
        <div className="text-right font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">Scaled</div>
      </div>

      <div className="flex flex-col">
        {STATS.map(([abbr, key]) => (
          <AllocationRow
            key={key}
            abbr={abbr}
            statKey={key}
            b={b}
            on={on}
            inputRefs={inputRefs}
            open={expanded === key}
            onToggle={() => setExpanded(prev => (prev === key ? null : key))}
          />
        ))}
      </div>
    </div>
  );
}

interface AllocationRowProps {
  abbr: string;
  statKey: StatKey;
  b: StatAllocatorBuild;
  on: StatAllocatorActions;
  inputRefs: MutableRefObject<Record<string, HTMLInputElement>>;
  open: boolean;
  onToggle: () => void;
}

function AllocationRow({ abbr, statKey, b, on, inputRefs, open, onToggle }: AllocationRowProps) {
  const colour = statColor(statKey, b);
  const info = STAT_INFO[statKey];
  const isRainbow = STAT_COLORS[statKey] === 'rainbow';

  const subraceBase = SUBRACES[b.subrace]?.[statKey] ?? 0;
  const classBase = (CLASSES[b.mainClass]?.[statKey] ?? 0) * b.monoclassModifier;
  const customBase = b.customBaseStats[statKey];
  const base = subraceBase + classBase + customBase;
  const invested = b.addedStats[statKey];
  const bonuses =
    (b.leBonus[statKey] ?? 0) +
    (b.astroBonus[statKey] ?? 0) +
    (b.foodBonus.stats[statKey] ?? 0) +
    (b.historyBonus.stats[statKey] ?? 0) +
    b.customStats[statKey];

  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / BAR_SCALE) * 100))}%`;
  const total = b.displayStats[statKey];

  const breakdown = [
    `base ${base}`,
    invested ? `+${invested} inv` : null,
    bonuses ? `${bonuses > 0 ? '+' : ''}${bonuses} bonus` : null,
  ].filter(Boolean).join('  ');

  return (
    <div className="border-b border-edge-faint">
      <div className="grid h-[46px] grid-cols-[92px_1fr_128px_116px] items-center px-5 hover:bg-surface-sunken">
        <button
          type="button"
          onClick={onToggle}
          title="Click for detailed info"
          className="flex select-none items-center gap-2 text-left"
        >
          <span className="h-4 w-[3px] shrink-0 rounded-2" style={{ background: isRainbow ? undefined : colour, backgroundImage: isRainbow ? RAINBOW : undefined }} />
          <span className="text-13 font-semibold" style={{ color: colour }}>{abbr}</span>
          <span className="text-11 text-content-ghost">{open ? '▾' : '▸'}</span>
        </button>

        <div className="flex items-center gap-2.5 pr-[18px]">
          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-control">
            <div className="h-full transition-[width] duration-150" style={{ background: colour, width: pct(base) }} />
            <div className="h-full opacity-55 transition-[width] duration-150" style={{ background: colour, width: pct(invested) }} />
            <div className="h-full opacity-[0.22] transition-[width] duration-150" style={{ background: colour, width: pct(Math.max(0, bonuses)) }} />
          </div>
          <span className="min-w-[118px] font-mono text-11 tracking-tight text-content-faint">{breakdown}</span>
        </div>

        <div className="flex items-center justify-center gap-[3px]">
          <Stepper label="−" title="Remove 1 point" onRepeat={() => on.removeStat(statKey)} />
          <input
            ref={el => { if (el) inputRefs.current[statKey] = el; }}
            defaultValue={invested}
            key={`${statKey}-${invested}`}
            onBlur={e => on.commitStatValue(statKey, e.target)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            aria-label={`${abbr} invested points`}
            className="h-[26px] w-[46px] rounded-6 border border-edge-muted bg-surface-bar text-center font-mono text-13 font-medium text-content outline-none focus:border-edge-emphasis"
          />
          <Stepper label="+" title="Add 1 point" onRepeat={() => on.addStat(statKey)} />
        </div>

        <div className="flex items-baseline justify-end gap-1.5">
          <span
            className="font-mono text-21 font-bold tracking-tight-value"
            style={isRainbow
              ? { backgroundImage: RAINBOW, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }
              : { color: colour }}
          >
            {formatStatValue(total, b.showRawStats ? 'raw' : 'scaled')}
          </span>
          <span className="min-w-[34px] font-mono text-11 text-content-ghost">
            {invested ? `+${invested}` : '·'}
          </span>
        </div>
      </div>

      {open && (
        <div className="bg-surface-sunken px-5 pb-4 pt-1">
          {info && (
            <>
              <h4 className="text-13 font-semibold" style={{ color: colour }}>{info.title}</h4>
              {/* The source text uses blank lines as paragraph breaks. */}
              {info.description.split('\n\n').map(paragraph => (
                <p key={paragraph.slice(0, 24)} className="mt-1.5 text-12 leading-relaxed text-content-secondary">
                  {paragraph}
                </p>
              ))}
              {info.effects.length > 0 && (
                <ul className="mt-2.5 flex flex-col gap-1">
                  {info.effects.map(effect => (
                    <li key={effect} className="flex gap-2 font-mono text-11 leading-relaxed text-content-secondary">
                      <span style={{ color: colour }}>•</span>
                      {effect}
                    </li>
                  ))}
                </ul>
              )}
              {info.notes && <p className="mt-2 text-11 italic text-content-faint">{info.notes}</p>}
            </>
          )}
          <p className="mt-3 font-mono text-11 text-content-ghost">
            Subrace {subraceBase} · Class {classBase}
            {customBase !== 0 && ` · Custom ${customBase}`}
            {invested !== 0 && ` · Invested ${invested}`}
            {bonuses !== 0 && ` · Bonuses ${bonuses > 0 ? '+' : ''}${bonuses}`}
            {` · ${b.showRawStats ? 'Raw' : 'After DR'} ${formatScaledStat(total)}`}
          </p>
        </div>
      )}
    </div>
  );
}
