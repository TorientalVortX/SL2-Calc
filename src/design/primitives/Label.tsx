import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export type LabelSize = 'xs' | 'sm' | 'responsive';
export type LabelTone = 'default' | 'secondary' | 'muted';

const SIZES: Record<LabelSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  /** Grows on wider viewports: the pattern used across the stat editors. */
  responsive: 'text-xs sm:text-sm',
};

const TONES: Record<LabelTone, string> = {
  default: '',
  secondary: 'text-content-secondary',
  muted: 'text-content-muted',
};

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  size?: LabelSize;
  tone?: LabelTone;
  /** Bottom margin: `tight` = mb-1, `loose` = mb-2, `none` for inline use. */
  spacing?: 'none' | 'tight' | 'loose';
  weight?: 'medium' | 'normal';
  children?: ReactNode;
}

/** Field label. Defaults reproduce `block text-xs font-medium mb-1`, the most
 *  common label in the app. */
export default function Label({
  size = 'xs',
  tone = 'default',
  spacing = 'tight',
  weight = 'medium',
  className,
  children,
  ...rest
}: LabelProps) {
  return (
    <label
      className={cx(
        'block',
        SIZES[size],
        TONES[tone],
        weight === 'medium' && 'font-medium',
        spacing === 'tight' && 'mb-1',
        spacing === 'loose' && 'mb-2',
        className,
      )}
      {...rest}
    >
      {children}
    </label>
  );
}
