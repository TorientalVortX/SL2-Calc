import { useRef, useState, type ReactNode } from 'react';
import { Minus, Plus, Settings2 } from 'lucide-react';
import { STAT_COLORS, onDark } from './data/colors';
import { STAT_INFO } from './data/stats';
import { FOODS, HISTORY } from './data/bonuses';
import { RACES, SUBRACES } from './data/races';
import { CLASS_HIERARCHY } from './data/classes';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import { holdHandlers, useHoldRepeat } from './useHoldRepeat';
import type { BuildEvaluation, SaveSlotV1, StatKey, StatRecord } from './types';

/** Variant 1c's five destinations, in the mockup's order. */
export const MOBILE_TABS = ['stats', 'weapon', 'armor', 'optimizer', 'screenshot'] as const;
export type MobileTab = (typeof MOBILE_TABS)[number];

const TAB_LABELS: Record<MobileTab, string> = {
  stats: 'Stats',
  weapon: 'Weapon',
  armor: 'Armor',
  optimizer: 'Optimizer',
  screenshot: 'Share',
};

const STAT_ORDER: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];

/** Rainbow is APT's own treatment in the design — a real gradient, not a flat hue. */
const RAINBOW = 'linear-gradient(90deg,#ef4444,#f59e0b,#facc15,#4ade80,#22d3ee,#8b8dff,#c084fc)';

function statColour(stat: StatKey): { flat: string; isRainbow: boolean } {
  const raw = STAT_COLORS[stat];
  return raw === 'rainbow' ? { flat: '#e6ebf5', isRainbow: true } : { flat: onDark(raw), isRainbow: false };
}

const SELECT = 'h-[44px] w-full rounded-8 border border-edge bg-surface-raised px-2 text-13 text-content-bright outline-none transition-colors focus:border-edge-emphasis';

/**
 * Horizontal swipe between tabs.
 *
 * Fires only when the gesture is decisively horizontal and long enough, so it
 * never steals a vertical scroll. It also bails if the touch began inside an
 * element that scrolls horizontally itself — nothing does today, but a future
 * wide table shouldn't have its pan hijacked.
 */
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_DOMINANCE = 1.5;

function useTabSwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number; inScroller: boolean } | null>(null);

  return {
    onTouchStart: (event: React.TouchEvent) => {
      if (event.touches.length !== 1) { start.current = null; return; }
      const touch = event.touches[0];
      let node = event.target as HTMLElement | null;
      let inScroller = false;
      while (node && node !== event.currentTarget) {
        if (node.scrollWidth > node.clientWidth + 1) { inScroller = true; break; }
        node = node.parentElement;
      }
      start.current = { x: touch.clientX, y: touch.clientY, inScroller };
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const from = start.current;
      start.current = null;
      if (!from || from.inScroller) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return;
      onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

/** 44px touch target — the mockup's mobile stepper, and the WCAG minimum. */
function TouchStep({ label, icon, onRepeat }: { label: string; icon: ReactNode; onRepeat: () => void }) {
  const { start, stop } = useHoldRepeat(onRepeat);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...holdHandlers(onRepeat, start, stop)}
      className="grid h-[44px] w-[44px] shrink-0 select-none place-items-center rounded-10 bg-surface-control text-content-secondary transition-colors active:bg-surface-active active:text-content"
    >
      {icon}
    </button>
  );
}

export interface MobileDeckProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;

  buildName: string;
  onBuildNameChange: (name: string) => void;
  race: string;
  subrace: string;
  availableSubraces: string[];
  onRaceChange: (race: string) => void;
  onSubraceChange: (subrace: string) => void;
  mainClass: string;
  subClass: string;
  onMainClassChange: (name: string) => void;
  onSubClassChange: (name: string) => void;
  food: string;
  onFoodChange: (food: string) => void;
  history: string;
  onHistoryChange: (history: string) => void;

  saveSlots: SaveSlotV1[];
  onCreateSave: () => void;
  onLoadSave: (slot: SaveSlotV1) => void;
  onDeleteSave: (slot: SaveSlotV1) => void;
  onOpenSettings: () => void;
  /** Talents and the four advanced dialogs, unreachable on mobile until now. */
  onOpenTalents: () => void;
  onOpenDialog: (section: 'character' | 'custom' | 'legend' | 'astrology' | 'elemental') => void;

  characterLevel: number;
  totalPoints: number;
  pointsSpent: number;
  addedStats: StatRecord;
  displayStats: StatRecord;
  buildEvaluation: BuildEvaluation;
  onAddStat: (stat: StatKey) => void;
  onRemoveStat: (stat: StatKey) => void;


  /** Per-tab body, supplied by the parent so both shells share one source. */
  children: ReactNode;
}

/**
 * Variant 1c — the mobile companion.
 *
 * A fixed header carries what you always need (identity, points, the five
 * headline readouts), the body scrolls, and a five-up bar sits at the bottom.
 * The desktop deck's three columns cannot survive 390px, so this is a distinct
 * shell rather than a reflow — but every control drives the same state.
 */
export default function MobileDeck({
  activeTab, onTabChange,
  buildName, onBuildNameChange,
  race, subrace, availableSubraces, onRaceChange, onSubraceChange,
  mainClass, subClass, onMainClassChange, onSubClassChange,
  food, onFoodChange, history, onHistoryChange,
  saveSlots, onCreateSave, onLoadSave, onDeleteSave, onOpenSettings, onOpenTalents, onOpenDialog,
  characterLevel, totalPoints, pointsSpent,
  addedStats, displayStats, buildEvaluation,
  onAddStat, onRemoveStat,
  children,
}: MobileDeckProps) {
  const [identityOpen, setIdentityOpen] = useState(false);
  // Rows expand in place; the design never opens a modal for a stat description.
  const [openStat, setOpenStat] = useState<StatKey | null>(null);
  const remaining = totalPoints - pointsSpent;
  const spentPct = totalPoints > 0 ? Math.min(100, (pointsSpent / totalPoints) * 100) : 0;
  const d = buildEvaluation.derived;

  const classOptions = Object.values(CLASS_HIERARCHY);

  // Swipe left for the next tab, right for the previous. Ends are hard stops
  // rather than wrapping, so the gesture matches the bar's visible order.
  const swipe = useTabSwipe(direction => {
    const index = MOBILE_TABS.indexOf(activeTab);
    const next = MOBILE_TABS[index + direction];
    if (next) onTabChange(next);
  });

  return (
    <div className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-surface-base">
      <header className="z-30 flex w-full shrink-0 flex-col gap-3 overflow-hidden border-b border-edge-subtle bg-surface-bar px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setIdentityOpen(open => !open)}
            aria-expanded={identityOpen}
            className="flex min-w-0 flex-1 items-center justify-between gap-2.5 text-left"
          >
            <span className="truncate text-15 font-bold text-content">{buildName || 'Untitled Build'}</span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-edge px-2.5 py-1.5 text-11 font-medium text-content-muted">
              {subrace} {mainClass}
              <span className="text-content-faint">{identityOpen ? '▴' : '▾'}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-8 border border-edge text-content-muted transition-colors active:bg-surface-raised"
          >
            <Settings2 size={15} aria-hidden="true" />
          </button>
        </div>

        {identityOpen && (
          <div className="grid grid-cols-2 gap-2 rounded-10 border border-edge-muted bg-surface-sunken p-3">
            <label className="col-span-2 flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">Build name</span>
              <input
                value={buildName}
                onChange={event => onBuildNameChange(event.target.value)}
                placeholder="Untitled Build"
                aria-label="Build name"
                className="h-[44px] w-full rounded-8 border border-edge bg-surface-raised px-2.5 text-13 font-semibold text-content outline-none focus:border-edge-emphasis"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">Race</span>
              <select value={race} onChange={e => onRaceChange(e.target.value)} className={SELECT}>
                {Object.keys(RACES).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">Subrace</span>
              <select value={subrace} onChange={e => onSubraceChange(e.target.value)} className={SELECT}>
                {availableSubraces.map(name => <option key={name} value={name}>{SUBRACES[name] ? name : name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">Main class</span>
              <select value={mainClass} onChange={e => onMainClassChange(e.target.value)} className={SELECT}>
                {classOptions.map(group => (
                  <optgroup key={group.name} label={group.name}>
                    <option value={group.name}>{group.name}</option>
                    {group.subClasses.map(name => <option key={name} value={name}>{name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">Sub class</span>
              <select value={subClass} onChange={e => onSubClassChange(e.target.value)} className={SELECT}>
                {classOptions.map(group => (
                  <optgroup key={group.name} label={group.name}>
                    <option value={group.name}>{group.name}</option>
                    {group.subClasses.map(name => <option key={name} value={name}>{name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">Food</span>
              <select value={food} onChange={e => onFoodChange(e.target.value)} className={SELECT}>
                {Object.keys(FOODS).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-10 font-medium text-content-muted">History</span>
              <select value={history} onChange={e => onHistoryChange(e.target.value)} className={SELECT}>
                {Object.keys(HISTORY).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>

            {mainClass === subClass && (
              <p className="col-span-2 text-11 leading-relaxed text-info-soft">
                Monoclass: main and sub are the same, so the class bonus is doubled.
              </p>
            )}

            <div className="col-span-2 flex flex-col gap-2 border-t border-edge-muted pt-3">
              <DeckLabel>Advanced</DeckLabel>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['Talents', onOpenTalents],
                  ['Legend Extend', () => onOpenDialog('legend')],
                  ['Astrology', () => onOpenDialog('astrology')],
                  ['Elemental', () => onOpenDialog('elemental')],
                  ['Advanced', () => onOpenDialog('character')],
                ] as const).map(([label, open]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={open}
                    className="min-h-9 rounded-full border border-edge px-3 text-11 text-content-secondary active:bg-surface-raised active:text-content"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-2 border-t border-edge-muted pt-3">
              <div className="flex items-center justify-between gap-2.5">
                <DeckLabel>Saved builds</DeckLabel>
                <button
                  type="button"
                  onClick={onCreateSave}
                  className="grid min-h-9 place-items-center rounded-7 bg-info-bg px-3 text-12 font-semibold text-content"
                >
                  Save current
                </button>
              </div>
              {saveSlots.length === 0 ? (
                <p className="text-11 text-content-faint">No saved builds yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {saveSlots.map(slot => (
                    <div
                      key={slot.id}
                      className="flex min-h-[46px] items-center justify-between gap-2.5 rounded-9 border border-edge bg-surface-raised px-2.5 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => onLoadSave(slot)}
                        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                      >
                        <span className="truncate text-12 font-semibold text-content-bright">{slot.name}</span>
                        <span className="truncate font-mono text-10 text-content-ghost">
                          {new Date(slot.updatedAt).toLocaleDateString()}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete saved build ${slot.name}`}
                        onClick={() => onDeleteSave(slot)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-6 text-content-faint active:bg-surface-active active:text-negative"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <DeckLabel>Points remaining</DeckLabel>
            <span className={cx('font-mono text-17 font-bold', remaining === 0 ? 'text-content' : 'text-info')}>
              {remaining}
            </span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-3 bg-surface-elevated">
            <div
              className="h-full rounded-3 bg-info-solid transition-[width] duration-150"
              style={{ width: `${spentPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-px overflow-hidden rounded-8 bg-edge-subtle">
          {([
            ['HP', d.maxHP, 'text-positive'],
            ['FP', d.fp, 'text-info'],
            ['Evade', d.evade, 'text-content-bright'],
            ['Hit', buildEvaluation.primaryWeapon?.hit ?? 0, 'text-content-bright'],
            ['Lv', characterLevel, 'text-content-bright'],
          ] as const).map(([label, value, tone]) => (
            <div key={label} className="bg-surface-base px-1.5 py-2 text-center">
              <div className="font-condensed text-9 font-semibold uppercase tracking-tag text-content-faint">{label}</div>
              <div className={cx('mt-1 font-mono text-15 font-bold', tone)}>{value}</div>
            </div>
          ))}
        </div>
      </header>

      <main {...swipe} className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-x-none">
        {activeTab === 'stats' ? (
          <div className="flex flex-col">
            {STAT_ORDER.map(stat => {
              const { flat, isRainbow } = statColour(stat);
              const invested = addedStats[stat] ?? 0;
              const total = Math.floor(displayStats[stat] ?? 0);
              const pct = (value: number) => `${Math.max(0, Math.min(100, (value / 80) * 100))}%`;
              return (
                <div key={stat} className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-b border-edge-faint px-3.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenStat(current => (current === stat ? null : stat))}
                    aria-expanded={openStat === stat}
                    className="flex min-w-0 flex-col gap-1.5 text-left"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="text-13 font-semibold" style={{ color: flat }}>{stat.toUpperCase()}</span>
                      <span
                        className="font-mono text-17 font-bold tracking-tight-value"
                        style={isRainbow
                          ? { backgroundImage: RAINBOW, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
                          : { color: flat }}
                      >
                        {total}
                      </span>
                      <span className="font-mono text-10 text-content-ghost">
                        {invested > 0 ? `+${invested} inv` : 'base'}
                      </span>
                    </span>
                    <span className="flex h-[5px] overflow-hidden rounded-3 bg-surface-control">
                      <span className="h-full" style={{ background: isRainbow ? RAINBOW : flat, width: pct(total - invested) }} />
                      <span className="h-full opacity-55" style={{ background: isRainbow ? RAINBOW : flat, width: pct(invested) }} />
                    </span>
                  </button>
                  <span className="flex items-center gap-1">
                    <TouchStep
                      label={`Remove a point from ${stat.toUpperCase()}`}
                      icon={<Minus size={16} aria-hidden="true" />}
                      onRepeat={() => onRemoveStat(stat)}
                    />
                    <span className="w-8 text-center font-mono text-13 font-semibold text-content">{invested}</span>
                    <TouchStep
                      label={`Add a point to ${stat.toUpperCase()}`}
                      icon={<Plus size={16} aria-hidden="true" />}
                      onRepeat={() => onAddStat(stat)}
                    />
                  </span>
                  {openStat === stat && STAT_INFO[stat] && (
                    <div className="col-span-2 flex flex-col gap-2 rounded-9 border border-edge-muted bg-surface-sunken p-3">
                      <span className="text-12 font-semibold text-content-bright">{STAT_INFO[stat].title}</span>
                      <p className="text-11 leading-relaxed text-content-muted">{STAT_INFO[stat].description}</p>
                      {STAT_INFO[stat].effects.length > 0 && (
                        <ul className="flex flex-col gap-1">
                          {STAT_INFO[stat].effects.map(effect => (
                            <li key={effect} className="flex gap-1.5 text-11 leading-relaxed text-content-secondary">
                              <span className="text-content-ghost">▪</span>{effect}
                            </li>
                          ))}
                        </ul>
                      )}
                      {STAT_INFO[stat].notes && (
                        <p className="text-10 leading-relaxed text-content-ghost">{STAT_INFO[stat].notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 p-3.5">{children}</div>
        )}
      </main>

      <nav
        aria-label="Calculator workspaces"
        role="tablist"
        className="z-30 grid w-full shrink-0 grid-cols-5 overflow-hidden border-t border-edge-subtle bg-surface-bar"
      >
        {MOBILE_TABS.map(tab => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(tab)}
              className={cx(
                'grid min-h-[52px] select-none place-items-center px-1 pb-1 text-center text-10 leading-tight transition-colors',
                selected ? 'font-bold text-info' : 'font-medium text-content-muted',
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
