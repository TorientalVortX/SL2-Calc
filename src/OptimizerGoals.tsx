import { OPTIMIZATION_PRESETS } from './utilities/StatOptimizer';
import { OPPONENT_STATLINES } from './domain/opponentGauntlet';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import { FEATURES } from './featureFlags';
import type { OptimizerState } from './useOptimizer';

export interface OptimizerGoalsProps {
  o: OptimizerState;
}

/**
 * "Optimize for": the Optimizer tab's left rail.
 *
 * The mockup shows five goals; they map onto the engine's existing presets, so
 * choosing one sets `presetId` rather than introducing a parallel concept.
 */
export default function OptimizerGoals({ o }: OptimizerGoalsProps) {
  // PvP is the one goal that pulls in the opponent gauntlet, so gating the
  // feature means dropping the goal itself rather than only its target list.
  const presets = Object.values(OPTIMIZATION_PRESETS)
    .filter(preset => FEATURES.pvpGauntlet || preset.id !== 'pvp');

  return (
    <>
      <DeckLabel>Optimize for</DeckLabel>

      <div className="flex flex-col gap-2">
        {presets.map(preset => {
          const selected = o.presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => o.setPresetId(preset.id)}
              aria-pressed={selected}
              className={cx(
                'flex flex-col gap-1 rounded-9 border px-3 py-2.5 text-left transition-colors',
                selected
                  ? 'border-info bg-info-bg/40'
                  : 'border-edge bg-surface-bar hover:border-edge-emphasis',
              )}
            >
              <span className={cx('text-13 font-semibold', selected ? 'text-content' : 'text-content-bright')}>
                {preset.name}
              </span>
              <span className="text-11 leading-relaxed text-content-faint">{preset.description}</span>
            </button>
          );
        })}
      </div>

      {FEATURES.pvpGauntlet && (o.presetId === 'pvp' || o.gauntletOpponentIds.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <DeckLabel>Counter targets</DeckLabel>
          <p className="text-10 leading-relaxed text-content-ghost">
            {o.gauntletOpponentIds.length
              ? 'Candidates are scored against the checked opponents only, alongside whichever goal you picked above.'
              : 'None checked: the PvP goal scores against the whole community roster.'}
          </p>
          {OPPONENT_STATLINES.map(opponent => {
            const checked = o.gauntletOpponentIds.includes(opponent.profileId);
            return (
              <label key={opponent.profileId} className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => o.setGauntletOpponentIds(ids => checked
                    ? ids.filter(id => id !== opponent.profileId)
                    : [...ids, opponent.profileId])}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-info-solid"
                />
                <span className="text-11 leading-relaxed text-content-muted">
                  {opponent.name}
                  <span className="mt-0.5 block text-10 text-content-ghost">{opponent.archetype}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <p className="text-11 leading-relaxed text-content-faint">
        Allocation is scored against the live DR curve with the current equipment.
        Hard minimums and defence requirements are applied before ranking.
      </p>
    </>
  );
}
