import { useState, type ReactNode } from 'react';
import { cx } from './design';

/**
 * The "command deck" layout from the Turn 1 design (variant 1a).
 *
 * Allocation sits in the middle; everything it changes is pinned to the right;
 * everything that defines the character is pinned to the left. The design
 * specifies a fixed 1340px shell with a 268px / 1fr / 330px grid: reproduced
 * here as a max-width so narrow viewports collapse to a single column instead of
 * scrolling horizontally (the design's own 1c covers the mobile treatment).
 */
export interface CommandDeckProps {
  /** Logo and workspace tabs: the left half of the 52px bar. */
  brand: ReactNode;
  /** Version, import/export and settings, the right half of the bar. */
  actions: ReactNode;
  /** Omitted on tabs that do not use a rail, the grid collapses to suit. */
  left?: ReactNode;
  /** Armor's class filter is narrower than the stats identity rail. */
  leftWidth?: 'wide' | 'narrow';
  center: ReactNode;
  right?: ReactNode;
  /** The export/screenshot rail is 300px in the design, not the usual 330px. */
  rightWidth?: 'wide' | 'narrow';
  className?: string;
}

/** Explicit class strings so Tailwind's scanner can see every grid variant. */
const GRID = {
  both: 'xl:grid-cols-[268px_1fr_330px]',
  bothNarrow: 'xl:grid-cols-[168px_1fr_330px]',
  leftOnly: 'xl:grid-cols-[268px_1fr]',
  leftOnlyNarrow: 'xl:grid-cols-[168px_1fr]',
  rightOnly: 'xl:grid-cols-[1fr_330px]',
  rightOnlyNarrow: 'xl:grid-cols-[1fr_300px]',
  none: '',
} as const;

export default function CommandDeck({
  brand,
  actions,
  left,
  leftWidth = 'wide',
  center,
  right,
  rightWidth = 'wide',
  className,
}: CommandDeckProps) {
  return (
    <div
      className={cx(
        'mx-auto w-full max-w-[1340px] overflow-hidden rounded-[14px]',
        'border border-edge-muted bg-surface-base',
        className,
      )}
    >
      <div className="flex h-[52px] items-center justify-between gap-4 border-b border-edge-subtle bg-surface-bar px-5">
        <div className="flex min-w-0 items-center gap-6">{brand}</div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      <div
        className={cx(
          'grid items-stretch grid-cols-1',
          left && right
            ? (leftWidth === 'narrow' ? GRID.bothNarrow : GRID.both)
            : left
              ? (leftWidth === 'narrow' ? GRID.leftOnlyNarrow : GRID.leftOnly)
              : right ? (rightWidth === 'narrow' ? GRID.rightOnlyNarrow : GRID.rightOnly) : GRID.none,
        )}
      >
        {left && (
          <div className="flex flex-col gap-[18px] border-edge-subtle bg-surface-sunken p-[18px] xl:border-r">
            {left}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-5 p-[18px]">{center}</div>
        {right && (
          <div className="flex flex-col gap-[18px] border-t border-edge-subtle p-[18px] xl:border-l xl:border-t-0">
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

export interface DeckSectionProps {
  /** Uppercase, tracked micro-label: the design's dominant heading treatment. */
  label?: ReactNode;
  /** Optional value shown opposite the label. */
  trailing?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A labelled group inside a deck column. */
export function DeckSection({ label, trailing, children, className }: DeckSectionProps) {
  return (
    <section className={cx('flex flex-col gap-2.5', className)}>
      {(label !== undefined || trailing !== undefined) && (
        <div className="flex items-baseline justify-between gap-2">
          {label !== undefined && <DeckLabel>{label}</DeckLabel>}
          {trailing}
        </div>
      )}
      {children}
    </section>
  );
}

/** The uppercase tracked label used throughout the design. */
export function DeckLabel({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'font-condensed text-10 font-semibold uppercase tracking-label text-content-faint',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Collapsible section that does not mount its children until opened.
 *
 * A plain `<details>` keeps its contents in the DOM while closed, so any child
 * with mount-time side effects runs immediately, which is how the legacy weapon
 * calculator silently overwrote the shared weapon config just by being nested.
 */
export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-9 border border-edge bg-surface-bar p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 text-left text-11 font-medium text-content-muted hover:text-content-secondary"
      >
        <span className="text-content-ghost">{open ? '▾' : '▸'}</span>
        {summary}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** A bordered card within a column: used for the right rail's result groups. */
export function DeckCard({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-9 border border-edge-muted bg-surface-bar p-2.5', className)}>
      {children}
    </div>
  );
}
