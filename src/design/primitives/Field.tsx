import type { ReactNode } from 'react';
import { cx } from '../cx';
import { RAMP_TEXT_SOFT } from '../rampClasses';
import type { RampName } from '../tokens';

export type FieldLabelTone = RampName | 'default' | 'secondary' | 'muted';

export interface FieldProps {
  label: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Text size for the label. */
  size?: 'xs' | 'sm';
  labelTone?: FieldLabelTone;
  /** The control: an `<Input>`, `<Select>`, `<Textarea>` or anything else. */
  children: ReactNode;
  className?: string;
}

function labelToneClass(tone: FieldLabelTone): string {
  if (tone === 'default') return '';
  if (tone === 'secondary') return 'text-content-secondary';
  if (tone === 'muted') return 'text-content-muted';
  return RAMP_TEXT_SOFT[tone];
}

/**
 * A label, a control and an optional hint, as one `<label>` element, so clicking the
 * text focuses the control without needing matching `id`/`htmlFor` pairs.
 *
 * Use `<Label>` directly instead when the control cannot be nested (e.g. a custom
 * dialog trigger that is itself a button).
 */
export default function Field({
  label,
  hint,
  size = 'xs',
  labelTone = 'muted',
  children,
  className,
}: FieldProps) {
  return (
    <label className={cx('block', size === 'xs' ? 'text-xs' : 'text-sm', className)}>
      <span className={cx('block mb-1', labelToneClass(labelTone))}>{label}</span>
      {children}
      {hint !== undefined && hint !== '' && (
        <span className="block text-xs text-content-faint mt-1">{hint}</span>
      )}
    </label>
  );
}
