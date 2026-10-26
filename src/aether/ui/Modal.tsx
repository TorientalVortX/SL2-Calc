import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Corners } from './Panel';
import { play } from '../state/audio';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  flush?: boolean;
}

export function Modal({ title, onClose, children, footer, wide, flush }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  // Held in a ref so callers' inline-arrow `onClose` doesn't re-run the mount effect and steal focus.
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    const focusable = ref.current?.querySelectorAll<HTMLElement>(
      'button, summary, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
        'button:not(:disabled), summary, [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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

  // Portalled: a fixed scrim inside a scroll-owning panel lays out against that panel, not the viewport.
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
