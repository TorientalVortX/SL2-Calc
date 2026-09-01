import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Corners } from './Panel';
import { play } from '../state/audio';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Two-column dialogs (the armory) need more than the reading-width default. */
  wide?: boolean;
  /** Replaces the body's own scrolling when the content manages its own panes. */
  flush?: boolean;
}

/**
 * A framed dialog with Escape-to-close and a focus trap.
 *
 * The trap is a plain Tab wrap over the dialog's focusable elements rather than
 * an inert-based one: the sheet behind stays rendered, and this keeps keyboard
 * focus from walking back into it while the dialog is open.
 */
export function Modal({ title, onClose, children, footer, wide, flush }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  /*
   * The live `onClose`, held in a ref so the effect below can run on mount alone.
   *
   * It used to depend on `onClose`, which every caller writes as an inline arrow:
   * a new identity on each render of the sheet. So the effect tore down and set
   * up again after every keystroke, and its opening `focus()` fired each time:
   * focus jumped back to the Close button whenever a dialog changed the build,
   * which made the number fields in Advanced impossible to type into and the stat
   * card's slider impossible to hold.
   */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    const focusable = ref.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        play('back');
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreTo.current?.focus?.();
    };
    // Mount only: this sets the opening focus and restores it on the way out.
  }, []);

  /*
   * Portalled to the body rather than rendered in place.
   *
   * The armory opens from inside a panel that owns a scroll region, and a
   * `position: fixed` scrim nested in one is laid out against that ancestor
   * instead of the viewport: the dialog came out half-height and pinned to the
   * bottom of the panel. A portal removes the question entirely, and is what a
   * modal wants regardless of where it is opened from.
   */
  return createPortal(
    <div
      className="scrim"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          play('back');
          onClose();
        }
      }}
    >
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <Corners />
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <div className="spacer" />
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => { play('back'); onClose(); }}>
            Close <span className="keycap">Esc</span>
          </button>
        </header>
        <div className={flush ? 'modal__body modal__body--flush' : 'modal__body scroll'}>{children}</div>
        {footer ? <footer className="modal__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
