import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from '../cx';
import { fieldClasses, type FieldStyleProps } from './fieldStyles';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    FieldStyleProps {
  children?: ReactNode;
}

/**
 * Native select. Options should carry `className="bg-surface-raised"` where the OS
 * renders the popup with the page background.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    tone = 'raised',
    fieldSize = 'lg',
    radius,
    ring,
    fullWidth,
    tapTarget,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cx(
        fieldClasses({ tone, fieldSize, radius, ring, fullWidth, tapTarget}),
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export default Select;
