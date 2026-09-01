import { ASTROLOGY_PLANETS, LEGEND_EXTEND, PLANET_ELEMENTS } from './data/bonuses';
import { cx } from './design';
import DeckDialog, { DialogSection } from './DeckDialog';
import ElementalPanel, { type ElementalPanelProps } from './ElementalPanel';

/**
 * The build dialogs that were once sections of one "Advanced Options" modal.
 *
 * Each is now its own dialog with its own title, because the rail advertises
 * them as separate destinations: "Legend Extend" opening a dialog headed
 * "Advanced Options" and scrolled somewhere made the label a lie.
 */

export interface LegendExtendDialogProps {
  onClose: () => void;
  legendExtend: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function LegendExtendDialog({ onClose, legendExtend, onToggle }: LegendExtendDialogProps) {
  const active = Object.values(legendExtend).filter(Boolean).length;
  return (
    <DeckDialog title="Legend Extend" onClose={onClose}>
      <DialogSection
        id="legend"
        title={`Legend Extend · ${active} active`}
        hint="Each grants +1 to its stat before diminishing returns, so they are worth more than a raw point."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.keys(LEGEND_EXTEND).map(key => {
            // `legendExtend[key]` is undefined until first toggled, and React
            // omits attributes set to undefined, so this must be coerced or the
            // button ships with no aria-pressed at all.
            const on = Boolean(legendExtend[key]);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                aria-pressed={on}
                className={cx(
                  'flex items-center gap-2 rounded-8 border px-2.5 py-2 text-left text-12 transition-colors',
                  on
                    ? 'border-info bg-info-bg/40 text-content'
                    : 'border-edge bg-surface-bar text-content-secondary hover:border-edge-emphasis',
                )}
              >
                <span
                  className="h-3.5 w-[3px] shrink-0 rounded-2"
                  style={{ background: LEGEND_EXTEND[key].color }}
                />
                {LEGEND_EXTEND[key].name}
              </button>
            );
          })}
        </div>
      </DialogSection>
    </DeckDialog>
  );
}

export interface AstrologyDialogProps {
  onClose: () => void;
  astrology: string;
  onChange: (planet: string) => void;
}

export function AstrologyDialog({ onClose, astrology, onChange }: AstrologyDialogProps) {
  const options: Array<[value: string, label: string, stat: string, element: string]> = [
    ['', 'None', '', ''],
    ...Object.keys(ASTROLOGY_PLANETS).map(planet => [
      planet,
      planet,
      ASTROLOGY_PLANETS[planet].toUpperCase(),
      PLANET_ELEMENTS[planet],
    ] as [string, string, string, string]),
  ];

  return (
    <DeckDialog title="Astrology" onClose={onClose}>
      <DialogSection
        id="astrology"
        title="Planet sign"
        hint="Your starsign grants +1 to its stat and +2 to its element's ATK. Luminary Element, in Talents, redirects WIL into this element."
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {options.map(([value, label, stat, element]) => {
            const on = astrology === value;
            return (
              <label
                key={label}
                className={cx(
                  'flex cursor-pointer items-center gap-2 rounded-8 border px-2.5 py-2 transition-colors',
                  on ? 'border-info bg-info-bg/40' : 'border-edge bg-surface-bar hover:border-edge-emphasis',
                )}
              >
                <input
                  type="radio"
                  name="astrology"
                  checked={on}
                  onChange={() => onChange(value)}
                  className="h-3.5 w-3.5 shrink-0 accent-info-solid"
                />
                <span className="text-12 font-medium text-content-bright">{label}</span>
                {stat && (
                  <span className="ml-auto font-mono text-10 text-content-ghost">{stat} · {element}</span>
                )}
              </label>
            );
          })}
        </div>
      </DialogSection>
    </DeckDialog>
  );
}

export interface ElementalDialogProps {
  onClose: () => void;
  elemental: Omit<ElementalPanelProps, 'layout'>;
}

export function ElementalDialog({ onClose, elemental }: ElementalDialogProps) {
  return (
    <DeckDialog title="Elemental ATK & RES" onClose={onClose}>
      <DialogSection
        id="elemental"
        title="Manual adjustments"
        hint="Stacked on top of the calculated values and clamped to ±99. Use them for boosts the calculator does not model. They save with the build."
      >
        <ElementalPanel {...elemental} layout="wide" />
      </DialogSection>
    </DeckDialog>
  );
}
