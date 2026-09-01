import type { ReactNode } from 'react';
import { play } from '../state/audio';

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  hint?: string;
  disabled?: boolean;
}

/** A diamond checkbox. The mark fills and glows when the option is on. */
export function Toggle({ on, onChange, children, hint, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={hint}
      className={`toggle ${on ? 'is-on' : ''}`}
      onClick={() => {
        play(on ? 'back' : 'select');
        onChange(!on);
      }}
    >
      <span className="toggle__mark" />
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
    </button>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (value: string) => void;
  title?: string;
}

export function SelectField({ label, value, options, onChange, title }: SelectFieldProps) {
  return (
    <label className="field" title={title}>
      <span className="field__label">{label}</span>
      <select
        className="select"
        value={value}
        onChange={event => {
          play('select');
          onChange(event.target.value);
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface GroupedSelectProps {
  label: string;
  value: string;
  /** Rendered as `<optgroup>`s, which is how the modifier data is already keyed. */
  groups: Array<{ label: string; options: string[] }>;
  onChange: (value: string) => void;
  title?: string;
}

/** A select whose options come pre-grouped, for materials, parts and the like. */
export function GroupedSelect({ label, value, groups, onChange, title }: GroupedSelectProps) {
  // A saved build can name a material the current dataset no longer groups; it is
  // added back so selecting something else is a choice rather than a silent reset.
  const known = groups.some(group => group.options.includes(value));
  return (
    <label className="field" title={title}>
      <span className="field__label">{label}</span>
      <select
        className="select"
        value={value}
        onChange={event => {
          play('select');
          onChange(event.target.value);
        }}
      >
        {known ? null : <option value={value}>{value} (not in data)</option>}
        {groups.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map(option => <option key={option} value={option}>{option}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

/** A −/value/+ control for small bounded numbers such as passive ranks. */
export function Stepper({ value, min, max, onChange, label }: StepperProps) {
  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next === value) {
      play('deny');
      return;
    }
    play('move');
    onChange(next);
  };
  return (
    <span className="stat__stepper" role="group" aria-label={label}>
      <button type="button" className="step" onClick={() => step(-1)} disabled={value <= min} aria-label={`${label} down`}>−</button>
      <span className="num" style={{ minWidth: 26, textAlign: 'center', fontSize: 13 }}>{value}</span>
      <button type="button" className="step" onClick={() => step(1)} disabled={value >= max} aria-label={`${label} up`}>+</button>
    </span>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  title?: string;
  /** Shown under the field, for a cap or a unit the label cannot carry. */
  hint?: string;
}

/**
 * A labelled number field for the open-ended overrides.
 *
 * Committed on change but clamped rather than rejected, and an empty field reads
 * as the minimum instead of NaN. These are correction fields, and a build that
 * silently took `NaN` for its custom HP would poison every derived figure.
 */
export function NumberField({ label, value, onChange, min = 0, max, title, hint }: NumberFieldProps) {
  return (
    <label className="field" title={title}>
      <span className="field__label">{label}</span>
      <input
        className="input"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={event => {
          const parsed = Number(event.target.value);
          const next = Number.isFinite(parsed) ? parsed : min;
          onChange(Math.max(min, max === undefined ? next : Math.min(max, next)));
        }}
      />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}
