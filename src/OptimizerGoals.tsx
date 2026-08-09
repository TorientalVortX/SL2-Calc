import { OPTIMIZATION_PRESETS } from './utilities/StatOptimizer';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import type { OptimizerState } from './useOptimizer';

export interface OptimizerGoalsProps {
  o: OptimizerState;
}

/**
 * "Optimize for" — the Optimizer tab's left rail.
 *
 * The mockup shows five goals; they map onto the engine's existing presets, so
 * choosing one sets `presetId` rather than introducing a parallel concept.
 */
export default function OptimizerGoals({ o }: OptimizerGoalsProps) {
  const presets = Object.values(OPTIMIZATION_PRESETS);

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

      <p className="text-11 leading-relaxed text-content-faint">
        Allocation is scored against the live DR curve with the current equipment.
        Hard minimums and defence requirements are applied before ranking.
      </p>
    </>
  );
}
