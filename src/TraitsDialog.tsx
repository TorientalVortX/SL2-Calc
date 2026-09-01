import { useMemo, useState } from 'react';
import { cx } from './design';
import DeckDialog from './DeckDialog';
import { DeckLabel } from './CommandDeck';
import {
  TRAIT_CATEGORIES,
  traitById,
  traitCost,
  traitEligibility,
  traitPointBudget,
  traitPointsSpent,
  traitsByCategory,
  uncheckedRequirements,
  type Trait,
} from './domain/traits';
import type { StatRecord } from './types';

export interface TraitsDialogProps {
  onClose: () => void;
  /** Trait ids currently taken. */
  taken: string[];
  onChange: (next: string[]) => void;
  characterLevel: number;
  /** The build's current History value; History is chosen here, not in the rail. */
  history: string;
  onHistoryChange: (history: string) => void;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  /**
   * Base stat totals. Requirements are checked against these, not the scaled
   * stats; the wiki is explicit that APT and item bonuses do not count.
   */
  baseStats: Partial<StatRecord>;
}

/**
 * Traits.
 *
 * Multiple traits are active at once, bought against a point budget, so this is
 * a set of toggles rather than a single select. Traits whose requirements the
 * build does not meet stay visible but cannot be taken, with the shortfall
 * spelled out: knowing a trait needs 15 WIL is more useful than hiding it.
 */
export default function TraitsDialog({
  onClose,
  taken,
  onChange,
  characterLevel,
  history,
  onHistoryChange,
  race,
  subrace,
  mainClass,
  subClass,
  baseStats,
}: TraitsDialogProps) {
  const [category, setCategory] = useState<string>(TRAIT_CATEGORIES[0] ?? 'General');
  const [showIneligible, setShowIneligible] = useState(true);

  const budget = traitPointBudget(characterLevel);
  const spent = traitPointsSpent(taken, race);
  const remaining = budget - spent;
  const groups = useMemo(() => traitsByCategory(), []);
  const build = { baseStats, race, subrace, mainClass, subClass, taken };

  /*
   * History is single-select (the wiki allows only one at a time), and is
   * applied through the build's `history` field rather than the trait list,
   * because that field carries HP and percentage effects beyond the flat stats.
   */
  const isTakenTrait = (trait: Trait) =>
    trait.historyKey ? history === trait.historyKey : taken.includes(trait.id);

  const toggle = (trait: Trait) => {
    if (trait.historyKey) {
      onHistoryChange(history === trait.historyKey ? 'None' : trait.historyKey);
      return;
    }
    if (taken.includes(trait.id)) {
      onChange(taken.filter(id => id !== trait.id));
      return;
    }
    // Never let a build overspend; the budget is the whole point of the screen.
    if (traitCost(trait, race) > remaining) return;
    onChange([...taken, trait.id]);
  };

  const active = groups.find(group => group.category === category);
  const visible = (active?.traits ?? []).filter(
    trait => showIneligible || traitEligibility(trait, build).eligible || isTakenTrait(trait),
  );

  return (
    <DeckDialog
      title="Traits"
      onClose={onClose}
      maxWidth="max-w-[900px]"
      bare
      headerAside={
        <div className="flex shrink-0 gap-0.5 overflow-x-auto rounded-8 border border-edge bg-surface-raised p-[3px]">
          {groups.map(group => {
            const count = group.traits.filter(isTakenTrait).length;
            return (
              <button
                key={group.category}
                type="button"
                aria-pressed={category === group.category}
                onClick={() => setCategory(group.category)}
                className={cx(
                  'flex items-baseline gap-1.5 rounded-6 px-2.5 py-2 text-11 font-semibold transition-colors',
                  category === group.category ? 'bg-info-bg text-content' : 'text-content-muted hover:text-content-secondary',
                )}
              >
                {group.category}
                {count > 0 && <span className="font-mono text-10 text-info">{count}</span>}
              </button>
            );
          })}
        </div>
      }
      headerActions={
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-11 text-content-faint transition-colors hover:text-negative"
        >
          Reset
        </button>
      }
    >
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-edge-subtle px-5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <span className="text-13 font-semibold text-content-bright">
            {spent} / {budget} trait points · {remaining} left
          </span>
          <label className="flex cursor-pointer items-center gap-1.5 font-mono text-10 text-content-faint">
            <input type="checkbox" checked={showIneligible} onChange={e => setShowIneligible(e.target.checked)} />
            Show traits you do not qualify for
          </label>
        </div>
        <div className="h-[5px] overflow-hidden rounded-3 bg-surface-elevated">
          <div
            className="h-full rounded-3 bg-info-solid transition-[width] duration-150"
            style={{ width: `${budget > 0 ? Math.min(100, (spent / budget) * 100) : 0}%` }}
          />
        </div>
        {/* Stated once, because it is the rule players most often get wrong. */}
        <span className="text-10 leading-relaxed text-content-ghost">
          Requirements read your base stat totals, so APT and item bonuses do not count toward them.
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-4">
        <DeckLabel>{category} · {visible.length} traits</DeckLabel>
        {visible.map(trait => {
          const isTaken = isTakenTrait(trait);
          const { eligible, reasons } = traitEligibility(trait, build);
          const unchecked = uncheckedRequirements(trait);
          const cost = traitCost(trait, race);
          const affordable = cost <= remaining;
          const disabled = !isTaken && (!eligible || !affordable);
          return (
            <button
              key={trait.id}
              type="button"
              onClick={() => toggle(trait)}
              disabled={disabled}
              aria-pressed={isTaken}
              className={cx(
                // shrink-0: without it the flex column compresses every row to fit,
                // clipping names and hiding the effect text entirely.
                'flex shrink-0 flex-col gap-1 rounded-9 border p-2.5 text-left transition-colors',
                isTaken ? 'border-info bg-info-bg/30'
                  : disabled ? 'cursor-not-allowed border-edge bg-surface-bar opacity-55'
                    : 'border-edge bg-surface-bar hover:border-edge-emphasis',
              )}
            >
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-12 font-semibold text-content-bright">{trait.name}</span>
                <span className="font-mono text-10 text-content-faint">
                  {cost === 0 ? 'free' : `${cost} pt`}
                  {trait.group && ` · ${trait.group}`}
                  {trait.historyKey && ' · only one at a time'}
                </span>
              </span>
              <span className="text-11 leading-relaxed text-content-muted">{trait.effect}</span>
              {/* The wiki's own wording, kept visible even once the build qualifies.
                  Otherwise a met requirement vanishes and there is no way to see
                  what is holding the trait in place. */}
              {trait.requirements.raw && (
                <span className="font-mono text-10 text-content-ghost">Requires {trait.requirements.raw}</span>
              )}
              {unchecked.length > 0 && (
                <span className="font-mono text-10 text-content-ghost">
                  Not checked here: {unchecked.join(', ')}
                </span>
              )}
              {!eligible && (
                <span className="font-mono text-10 text-caution">{reasons.join(' · ')}</span>
              )}
              {eligible && !affordable && !isTaken && (
                <span className="font-mono text-10 text-content-ghost">Not enough trait points</span>
              )}
              {trait.handModelled && isTaken && (
                <span className="font-mono text-10 text-content-ghost">
                  Its stats come from the History control, so they are not added twice.
                </span>
              )}
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-9 border border-edge bg-surface-bar p-4 text-12 text-content-faint">
            No {category} traits match this build.
          </p>
        )}
      </div>
    </DeckDialog>
  );
}

export { traitById };
