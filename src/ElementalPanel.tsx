import type { ReactElement } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ELEMENT_COLORS, onDark } from './data/colors';
import { cx } from './design';
import { holdHandlers, useHoldRepeat } from './useHoldRepeat';
import type { ElementKey, StatRecord } from './types';

/** Elemental ATK and RES per element, with the manual adjusters and race resistances. */
export interface ElementalPanelProps {
  /** `rail` is the narrow right column of the command deck; `wide` is full width. */
  layout?: 'wide' | 'rail';
  elements: string[];
  subrace: string;
  elementalATKAdjustments: Record<string, number>;
  elementalRESAdjustments: Record<string, number>;
  raceResistances: Record<ElementKey, number>;
  characterLevel: number;
  stats: StatRecord;
  calculateElementalATK: (element: string) => number;
  calculateElementalRES: (element: string) => number;
  adjustElementalATK: (element: ElementKey, delta: number) => void;
  adjustElementalRES: (element: ElementKey, delta: number) => void;
}

/** The deck's 22px stepper: smaller than the allocator's, to fit ten cards. */
function Step({
  label,
  icon,
  onClick,
}: { label: string; icon: ReactElement; onClick: () => void }) {
  const { start, stop } = useHoldRepeat(onClick);
  return (
    <button
      type="button"
      {...holdHandlers(onClick, start, stop)}
      aria-label={label}
      title={label}
      className={cx(
        'flex h-[22px] w-[22px] shrink-0 select-none items-center justify-center rounded-6',
        'bg-surface-control text-content-muted transition-colors',
        'hover:bg-surface-active hover:text-content',
      )}
    >
      {icon}
    </button>
  );
}

/** ATK or RES: stepper, value, stepper. */
function AdjustRow({
  label,
  value,
  suffix = '',
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value: number;
  suffix?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-faint">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Step label={decreaseLabel} icon={<Minus size={11} aria-hidden="true" />} onClick={onDecrease} />
        <span className="min-w-[34px] text-center font-mono text-13 font-semibold text-content">
          {value}{suffix}
        </span>
        <Step label={increaseLabel} icon={<Plus size={11} aria-hidden="true" />} onClick={onIncrease} />
      </div>
    </div>
  );
}

export default function ElementalPanel({
  layout = 'wide',
  elements,
  subrace,
  elementalATKAdjustments,
  elementalRESAdjustments,
  raceResistances,
  characterLevel,
  stats,
  calculateElementalATK,
  calculateElementalRES,
  adjustElementalATK,
  adjustElementalRES,
}: ElementalPanelProps) {
  return (
    // Both call sites label this from the outside, so it carries no heading.
    <div className="flex flex-col gap-2.5">
      <div className={layout === 'rail'
        ? 'grid grid-cols-2 gap-2'
        : 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}>
        {elements.map(elem => {
          const colour = onDark(ELEMENT_COLORS[elem]);
          const atkAdjust = elementalATKAdjustments[elem as ElementKey];
          const resAdjust = elementalRESAdjustments[elem as ElementKey];
          const raceRes = raceResistances[elem as ElementKey];
          const hasNotes = atkAdjust !== 0 || resAdjust !== 0 || raceRes !== 0
            || (subrace === 'Umbral' && elem === 'Dark')
            || (subrace === 'Theno' && elem === 'Sound');

          return (
            <div
              key={elem}
              className={cx(
                'flex flex-col gap-2 rounded-9 border border-edge-muted bg-surface-bar p-2.5',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-[3px] rounded-2" style={{ background: colour }} />
                <span className="text-12 font-semibold" style={{ color: colour }}>{elem}</span>
              </div>

              <AdjustRow
                label="ATK"
                value={calculateElementalATK(elem)}
                onDecrease={() => adjustElementalATK(elem as ElementKey, -1)}
                onIncrease={() => adjustElementalATK(elem as ElementKey, 1)}
                decreaseLabel={`Decrease ${elem} ATK`}
                increaseLabel={`Increase ${elem} ATK`}
              />
              <AdjustRow
                label="RES"
                value={calculateElementalRES(elem)}
                suffix="%"
                onDecrease={() => adjustElementalRES(elem as ElementKey, -1)}
                onIncrease={() => adjustElementalRES(elem as ElementKey, 1)}
                decreaseLabel={`Decrease ${elem} RES`}
                increaseLabel={`Increase ${elem} RES`}
              />

              {hasNotes && (
                <div className="flex flex-col gap-0.5 border-t border-edge-faint pt-1.5 text-10 leading-relaxed text-content-ghost">
                  {atkAdjust !== 0 && (
                    <span className="text-content-muted">Manual ATK {atkAdjust > 0 ? '+' : ''}{atkAdjust}</span>
                  )}
                  {resAdjust !== 0 && (
                    <span className="text-content-muted">Manual RES {resAdjust > 0 ? '+' : ''}{resAdjust}</span>
                  )}
                  {raceRes !== 0 && (
                    <span className={raceRes > 0 ? 'text-positive' : 'text-negative'}>
                      Race RES {raceRes > 0 ? '+' : ''}{raceRes}%
                      {(subrace === 'Umbral' || subrace === 'Papilion')
                        && (elem === 'Dark' || elem === 'Light' || elem === 'Wind' || elem === 'Earth')
                        && <span className="text-content-ghost"> (scales with SAN)</span>}
                    </span>
                  )}
                  {subrace === 'Umbral' && elem === 'Dark' && (
                    <span>Race ATK +{Math.min(15, Math.floor(characterLevel / 2))} (level/2, max 15)</span>
                  )}
                  {subrace === 'Theno' && elem === 'Sound' && (
                    <span>Race ATK base = level {characterLevel} (ignores stat scaling)</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Poison resistance is a separate track from Acid. */}
        {(subrace === 'Wyverntouched' || subrace === 'Naga') && (
          <div className="flex flex-col gap-2 rounded-9 border border-positive/40 bg-surface-bar p-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-[3px] rounded-2 bg-positive" />
              <span className="text-12 font-semibold text-positive">Poison</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-faint">ATK</span>
              <span className="font-mono text-13 text-content-ghost">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-faint">RES</span>
              <span className="font-mono text-13 font-semibold text-positive">
                {subrace === 'Wyverntouched' ? stats.san * 2 : stats.san}%
              </span>
            </div>
            <div className="border-t border-edge-faint pt-1.5 text-10 leading-relaxed text-content-ghost">
              Race RES {subrace === 'Wyverntouched' ? 'SAN × 2' : 'SAN × 1'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
