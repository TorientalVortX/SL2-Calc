import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { RAMP_OUTLINE, RAMP_SOLID } from '../rampClasses';
import type { RampName } from '../tokens';

export type ButtonVariant = 'solid' | 'neutral' | 'ghost' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-sm',
  sm: 'px-3 py-2',
  md: 'px-4 py-2',
  lg: 'px-5 py-3 font-semibold',
  icon: 'p-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `solid`/`outline` colour themselves from `tone`; `neutral`/`ghost` ignore it. */
  variant?: ButtonVariant;
  tone?: RampName;
  size?: ButtonSize;
  radius?: 'md' | 'lg';
  /** Guarantees a 44px touch target on mobile. */
  tapTarget?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

/**
 * The app's button. Note that `index.css` already gives every `<button>` a ripple,
 * a transition and an active-scale, so this only owns colour, size and radius.
 *
 * Defaults to `type="button"` — none of the app's buttons submit a form, and the
 * implicit `type="submit"` has bitten this codebase before.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'neutral',
    tone = 'info',
    size = 'md',
    radius = 'md',
    tapTarget = false,
    fullWidth = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  const variantClasses =
    variant === 'solid' ? RAMP_SOLID[tone]
    : variant === 'outline' ? RAMP_OUTLINE[tone]
    : variant === 'ghost' ? 'hover:bg-surface-control'
    : 'bg-surface-control hover:bg-surface-elevated';

  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'flex items-center justify-center gap-2',
        radius === 'lg' ? 'rounded-lg' : 'rounded',
        SIZES[size],
        variantClasses,
        fullWidth && 'w-full',
        tapTarget && 'tap-target',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
