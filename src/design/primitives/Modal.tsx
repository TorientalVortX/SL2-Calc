import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { cx } from '../cx';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MAX_WIDTHS = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** `id` of the element naming this dialog, for `aria-labelledby`. */
  labelledBy?: string;
  /** Focus moves back here after closing: usually the button that opened the dialog. */
  returnFocusTo?: RefObject<HTMLElement | null>;
  /** Selector, resolved inside the dialog, for the element to focus on open. */
  initialFocus?: string;
  maxWidth?: keyof typeof MAX_WIDTHS;
  /** Tailwind z-index class for the backdrop. Dialogs that stack pass a higher one. */
  zIndexClassName?: string;
  padding?: 'sm' | 'responsive';
  className?: string;
  children?: ReactNode;
}

/**
 * Accessible modal dialog: backdrop, scroll lock, Escape to close, Tab cycling inside
 * the dialog, and focus returned to the trigger on close.
 *
 * Lifted verbatim from ClassFamilyPicker, which had the only correct implementation:
 * the six dialogs still inline in SL2Calculator each reimplement a subset of this.
 */
export default function Modal({
  open,
  onClose,
  labelledBy,
  returnFocusTo,
  initialFocus = '[data-autofocus="true"]',
  maxWidth = '6xl',
  zIndexClassName = 'z-[80]',
  padding = 'responsive',
  className,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Held in refs so identity changes in the caller do not tear down the listeners.
  const onCloseRef = useRef(onClose);
  const initialFocusRef = useRef(initialFocus);
  onCloseRef.current = onClose;
  initialFocusRef.current = initialFocus;

  const requestClose = () => {
    onCloseRef.current();
    requestAnimationFrame(() => returnFocusTo?.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() =>
      dialogRef.current?.querySelector<HTMLElement>(initialFocusRef.current)?.focus(),
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        returnFocusTo?.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
    // `returnFocusTo` is a stable ref object; only `open` should re-run this.
  }, [open, returnFocusTo]);

  if (!open) return null;

  return (
    <div
      className={cx(
        'fixed inset-0 flex items-center justify-center bg-black/75',
        zIndexClassName,
        padding === 'sm' ? 'p-2 sm:p-4' : 'p-2 sm:p-6',
      )}
      onMouseDown={event => event.target === event.currentTarget && requestClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          'w-full max-h-[94vh] overflow-y-auto rounded-xl border border-edge bg-surface-base shadow-2xl',
          MAX_WIDTHS[maxWidth],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface ModalBarProps {
  tone?: 'raised' | 'blurred' | 'sunken';
  padding?: 'md' | 'responsive';
  className?: string;
  children?: ReactNode;
}

const BAR_TONES = {
  raised: 'bg-surface-raised',
  blurred: 'bg-surface-base/95 backdrop-blur',
  sunken: 'bg-surface-sunken/95 backdrop-blur',
} as const;

/** Sticky dialog header: title block on the left, close button on the right. */
export function ModalHeader({
  tone = 'blurred',
  padding = 'md',
  className,
  children,
}: ModalBarProps) {
  return (
    <div
      className={cx(
        'sticky top-0 z-10 flex items-center justify-between border-b border-edge-subtle',
        BAR_TONES[tone],
        padding === 'responsive' ? 'p-3 sm:p-4 md:p-6' : 'px-4 py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Sticky dialog footer, for a summary strip or confirm/cancel actions. */
export function ModalFooter({
  tone = 'sunken',
  padding = 'md',
  className,
  children,
}: ModalBarProps) {
  return (
    <div
      className={cx(
        'sticky bottom-0 border-t border-edge-subtle',
        BAR_TONES[tone],
        padding === 'responsive' ? 'p-3 sm:p-4 md:p-6' : 'px-4 py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
