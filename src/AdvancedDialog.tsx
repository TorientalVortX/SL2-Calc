import { useState } from 'react';
import { cx } from './design';
import DeckDialog, { DialogField, DialogNumber, DialogSection } from './DeckDialog';
import type { GameWorld, StatKey, StatRecord } from './types';

/** Advanced overrides, grouped so the dialog takes two props instead of twenty-two. */
export interface AdvancedValues {
  characterLevel: number;
  astrology: string;
  hpPercent: number;
  customHP: number;
  customFP: number;
  baseEvade: number;
  bonusEvade: number;
  customStats: StatRecord;
  customBaseStats: StatRecord;
  statBuffs: StatRecord;
  world: GameWorld;
  legendExtend: Record<string, boolean>;
}

export interface AdvancedSetters {
  characterLevel: (v: number) => void;
  astrology: (v: string) => void;
  hpPercent: (v: number) => void;
  customHP: (v: number) => void;
  customFP: (v: number) => void;
  baseEvade: (v: number) => void;
  bonusEvade: (v: number) => void;
  customStats: (v: StatRecord | ((prev: StatRecord) => StatRecord)) => void;
  customBaseStats: (v: StatRecord | ((prev: StatRecord) => StatRecord)) => void;
  statBuffs: (v: StatRecord | ((prev: StatRecord) => StatRecord)) => void;
  world: (v: GameWorld) => void;
}

/** Which section the dialog opens on: the rail's chips each target their own. */
export type AdvancedSectionId = 'character' | 'custom';

export interface AdvancedDialogProps {
  onClose: () => void;
  v: AdvancedValues;
  set: AdvancedSetters;
  /** Both re-validate stat caps after changing, so they stay in the parent. */
  onCustomBaseStatChange: (stat: StatKey, value: number) => void;
  initialSection?: AdvancedSectionId;
}

const SECTIONS = [
  { id: 'character', label: 'Character' },
  { id: 'custom', label: 'Custom stats' },
];

/**
 * Advanced overrides: level, custom HP/FP, evade, dragon bonuses and custom stats.
 *
 * Legend Extend, Astrology and the elemental adjusters were split out into their
 * own dialogs; see `BuildDialogs.tsx`.
 *
 * `showCustomStats` was only ever read here, so it moved in as local state
 * rather than staying lifted in the parent.
 */
export default function AdvancedDialog({
  onClose,
  v,
  set,
  onCustomBaseStatChange: handleCustomBaseStatChange,
  initialSection,
}: AdvancedDialogProps) {
  const [showCustomStats, setShowCustomStats] = useState(initialSection === 'custom');

  return (
    <DeckDialog
      title="Advanced Options"
      onClose={onClose}
      sections={SECTIONS}
      initialSection={initialSection}
    >
      <DialogSection id="character" title="Character">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <DialogField label="Level (1–60)" hint={`Available points: ${v.characterLevel * 4}`}>
            <DialogNumber value={v.characterLevel} min={1} max={60} onChange={set.characterLevel} />
          </DialogField>
          <DialogField label="Current HP %">
            <DialogNumber value={v.hpPercent} min={0} max={100} onChange={set.hpPercent} />
          </DialogField>
          <DialogField label="Custom HP">
            <DialogNumber value={v.customHP} onChange={set.customHP} />
          </DialogField>
          <DialogField label="Custom FP">
            <DialogNumber value={v.customFP} onChange={set.customFP} />
          </DialogField>
          <DialogField label="Base Evade">
            <DialogNumber value={v.baseEvade} onChange={set.baseEvade} />
          </DialogField>
          <DialogField label="Bonus Evade" hint="Capped at 50">
            <DialogNumber value={v.bonusEvade} min={0} max={50} onChange={set.bonusEvade} />
          </DialogField>
          {/*
            * G6 and Korvara are separate worlds. The calculator reads this for one
            * thing so far: G6 raises every upgrade ceiling by one.
            */}
          <DialogField label="World" hint="G6 grants +1 to every upgrade cap">
            <select
              aria-label="Game world"
              value={v.world}
              onChange={event => set.world(event.target.value as GameWorld)}
              className={cx(
                'h-[30px] rounded-6 border border-edge bg-surface-bar px-2 text-12 text-content',
                'outline-none focus:border-edge-emphasis',
              )}
            >
              <option value="Korvara">Korvara</option>
              <option value="G6">G6</option>
            </select>
          </DialogField>
        </div>
      </DialogSection>

      <DialogSection
        id="custom"
        title="Custom stats"
        hint="Flat modifiers applied on top of the build, pre-class base overrides, and post-softcap buffs."
      >
        <button
          type="button"
          onClick={() => setShowCustomStats(value => !value)}
          aria-expanded={showCustomStats}
          className={cx(
            'self-start rounded-8 border border-edge px-3 py-1.5 text-12 text-content-secondary',
            'transition-colors hover:border-edge-emphasis hover:text-content',
          )}
        >
          {showCustomStats ? 'Hide' : 'Show'} custom stat modifiers
        </button>

        {showCustomStats && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-11 font-medium text-content-muted">Flat bonuses</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-12">
                {(Object.keys(v.customStats) as StatKey[]).map(stat => (
                  <DialogField key={stat} label={stat.toUpperCase()}>
                    <DialogNumber
                      aria-label={`Custom ${stat.toUpperCase()} bonus`}
                      value={v.customStats[stat]}
                      onChange={next => set.customStats(prev => ({ ...prev, [stat]: next }))}
                    />
                  </DialogField>
                ))}
              </div>
            </div>
            {/*
              * Separate from "Flat bonuses" on purpose. That channel is spent
              * before diminishing returns, so a build sitting past its softcap
              * keeps only a fraction of it: right for a stat an item grants,
              * wrong for a buff. This one lands after, so +10 SAN from Nerhaven
              * reads as +10 no matter how deep past the cap the build is.
              */}
            <div className="flex flex-col gap-2">
              <span className="text-11 font-medium text-content-muted">Buffs (post-softcap)</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-12">
                {(Object.keys(v.statBuffs) as StatKey[]).map(stat => (
                  <DialogField key={stat} label={stat.toUpperCase()}>
                    <DialogNumber
                      aria-label={`${stat.toUpperCase()} buff`}
                      value={v.statBuffs[stat]}
                      min={-99}
                      max={99}
                      onChange={next => set.statBuffs(prev => ({ ...prev, [stat]: next }))}
                    />
                  </DialogField>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-11 font-medium text-content-muted">Base stats (pre-class)</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-12">
                {(Object.keys(v.customBaseStats) as StatKey[]).map(stat => (
                  <DialogField key={stat} label={stat.toUpperCase()}>
                    <DialogNumber
                      aria-label={`Custom base ${stat.toUpperCase()}`}
                      value={v.customBaseStats[stat]}
                      onChange={next => handleCustomBaseStatChange(stat, next)}
                    />
                  </DialogField>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogSection>

    </DeckDialog>
  );
}
