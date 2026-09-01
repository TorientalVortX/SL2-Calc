import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';

export interface DeckDialogSection {
  id: string;
  label: string;
}

export interface DeckDialogProps {
  title: string;
  onClose: () => void;
  /** Optional jump links rendered under the header. */
  sections?: DeckDialogSection[];
  /** Scrolled into view on open: how the rail's chips deep-link into a dialog. */
  initialSection?: string;
  /** Overrides the 1100px default; the mockup sizes each dialog to its content. */
  maxWidth?: string;
  /** Rendered in the header beside the title. The skills slot switcher sits here. */
  headerAside?: ReactNode;
  /** Trailing header controls, before the close button. */
  headerActions?: ReactNode;
  /** Skips the padded scrolling body so the caller can lay out its own panes. */
  bare?: boolean;
  children: ReactNode;
}

/**
 * The command deck's modal shell.
 *
 * Both the talents and advanced dialogs carried their own copy of a legacy
 * modal: rounded-lg panels, a hand-rolled close glyph, no deck tokens and no
 * keyboard handling. One shell now owns the chrome and the behaviour.
 */
export default function DeckDialog({
  title,
  onClose,
  sections,
  initialSection,
  maxWidth = 'max-w-[1100px]',
  headerAside,
  headerActions,
  bare = false,
  children,
}: DeckDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  /* Focus must land somewhere inside on open and go back where it came from. */
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    panelRef.current?.focus();
    const opener = openerRef.current;
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Deep-link: scroll the requested section into view once the body is mounted.
  useEffect(() => {
    if (!initialSection) return;
    const target = bodyRef.current?.querySelector(`#${CSS.escape(initialSection)}`);
    target?.scrollIntoView({ block: 'start' });
  }, [initialSection]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-void/80 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        className={cx(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[14px]',
          maxWidth,
          'border border-edge-muted bg-surface-base shadow-2xl outline-none',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-edge-subtle bg-surface-bar px-5 py-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <h2 id={titleId} className="shrink-0 text-15 font-bold tracking-tight text-content">
              {title}
            </h2>
            {headerAside}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {headerActions}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
            className={cx(
              'rounded-7 p-1.5 text-content-muted transition-colors hover:bg-surface-raised hover:text-content',
            )}
          >
            <X size={17} aria-hidden="true" />
          </button>
          </div>
        </div>

        {sections && sections.length > 0 && (
          <nav
            aria-label={`${title} sections`}
            className="flex shrink-0 flex-wrap gap-1.5 border-b border-edge-subtle bg-surface-sunken px-5 py-2"
          >
            {sections.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => bodyRef.current
                  ?.querySelector(`#${CSS.escape(section.id)}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="rounded-full border border-edge px-3 py-1 text-11 text-content-muted transition-colors hover:border-edge-emphasis hover:text-content"
              >
                {section.label}
              </button>
            ))}
          </nav>
        )}

        <div
          ref={bodyRef}
          className={cx(
            'flex min-h-0 flex-1 flex-col',
            bare ? 'overflow-hidden' : 'gap-6 overflow-y-auto p-5',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** A titled block inside a dialog, addressable by the section nav. */
export function DialogSection({
  id,
  title,
  hint,
  children,
}: { id: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-2 flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <DeckLabel>{title}</DeckLabel>
        {hint && <p className="text-11 leading-relaxed text-content-ghost">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Label above a control, matching the rail's field treatment. */
export function DialogField({
  label,
  hint,
  children,
  className,
}: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-11 font-medium text-content-muted">{label}</span>
      {children}
      {hint && <span className="text-10 leading-relaxed text-content-ghost">{hint}</span>}
    </label>
  );
}

/** The deck's numeric input. */
export function DialogNumber({
  value,
  onChange,
  min,
  max,
  ...rest
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={event => {
        const next = Number(event.target.value);
        const lower = min === undefined ? next : Math.max(min, next);
        onChange(max === undefined ? lower : Math.min(max, lower));
      }}
      className={cx(
        'w-full rounded-7 border border-edge bg-surface-bar px-2 py-1.5',
        'font-mono text-13 text-content transition-colors',
        'hover:border-edge-strong focus:border-edge-emphasis focus:outline-none',
      )}
      {...rest}
    />
  );
}
