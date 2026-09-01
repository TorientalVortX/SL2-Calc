import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../cx';
import { RAMP_TEXT } from '../rampClasses';
import type { RampName } from '../tokens';

export interface StatRowProps {
  label: ReactNode;
  value: ReactNode;
  /** Colour of the value. Omit for white. */
  tone?: RampName;
  /** For per-stat colours that come from data rather than the token set. */
  valueStyle?: CSSProperties;
  size?: 'xs' | 'sm';
  /** Extra classes on the value only: for colours outside the role ramps. */
  valueClassName?: string;
  className?: string;
}

/** `Label ............ value` on one line. The densest repeated shape in the app. */
export default function StatRow({
  label,
  value,
  tone,
  valueStyle,
  size = 'sm',
  valueClassName,
  className,
}: StatRowProps) {
  const text = size === 'xs' ? 'text-xs' : 'text-sm';
  return (
    <div className={cx('flex justify-between items-center', className)}>
      <span className={cx(text, 'font-medium text-content-secondary')}>{label}</span>
      <span
        className={cx(text, 'font-bold', tone && RAMP_TEXT[tone], valueClassName)}
        style={valueStyle}
      >
        {value}
      </span>
    </div>
  );
}
