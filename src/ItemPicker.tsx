import { useMemo, useState } from 'react';
import { cx } from './design';

/**
 * Searching and browsing for the app's equipment lists.
 *
 * Every slot had the same problem in a different shape: a few hundred items
 * whose whole value is in prose, offered through a control that shows one line
 * at a time. Weapons had 311 in a dropdown, accessories 115, and neither could
 * answer "which one gives FP" without opening each in turn.
 *
 * `matches` is the piece worth sharing even where the list itself is not; the
 * armour table keeps its sortable numeric columns and only borrows the filter.
 */

/** One row of a picker. */
export interface PickerRow {
  /** Stable identity, and what `onPick` returns. */
  id: string;
  name: string;
  /** Shown right-aligned, when the item has a rarity. */
  rarity?: number;
  /** Small right-aligned chip, a material, a damage type. */
  tag?: string;
  /** The line under the name: what it does, or its headline numbers. */
  detail?: string;
  /** Matched by search but never displayed, e.g. a weapon's scaling stats. */
  keywords?: string;
  disabled?: boolean;
  /** Replaces `detail` when disabled, to say why. */
  disabledNote?: string;
}

/** Whether `row` matches `query`, across everything the row carries. */
export function matches(row: Pick<PickerRow, 'name' | 'tag' | 'detail' | 'keywords'>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.name, row.tag, row.detail, row.keywords]
    .some(field => field?.toLowerCase().includes(needle));
}

export interface SearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Announced to screen readers and used to size the placeholder. */
  label: string;
  count: number;
  total: number;
  /** Rendered to the right of the field, for a sort toggle. */
  children?: React.ReactNode;
}

/** The search input and its result count, shared by every equipment list. */
export function SearchField({ value, onChange, label, count, total, children }: SearchFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={`Search ${total} by name, effect or material`}
          aria-label={`Search ${label}`}
          className="min-w-0 flex-1 rounded-7 border border-edge bg-surface-bar px-2 py-1.5 text-12 text-content-bright placeholder:text-content-ghost focus:border-edge-emphasis focus:outline-none"
        />
        {children}
      </div>
      {value.trim() !== '' && (
        <p className="text-11 text-content-faint" aria-live="polite">{count} of {total} shown.</p>
      )}
    </div>
  );
}

export interface ItemPickerProps {
  rows: PickerRow[];
  /** Id of the equipped row, or null. */
  selected: string | null;
  onPick: (id: string | null) => void;
  label: string;
  /** Offer a row that clears the slot. Weapons in slot 1 cannot be emptied here. */
  emptyLabel?: string | null;
  /** Sort options beyond A–Z, cycled by the toggle. */
  extraSorts?: Array<{ key: string; label: string; compare: (a: PickerRow, b: PickerRow) => number }>;
}

const BY_NAME = (a: PickerRow, b: PickerRow) => a.name.localeCompare(b.name);
/* Rarity descending: ascending would open on a wall of 1★ basics. */
const BY_RARITY = (a: PickerRow, b: PickerRow) => (b.rarity ?? 0) - (a.rarity ?? 0) || BY_NAME(a, b);

export default function ItemPicker({
  rows,
  selected,
  onPick,
  label,
  emptyLabel = '— Empty —',
  extraSorts = [],
}: ItemPickerProps) {
  const [query, setQuery] = useState('');
  const [sortIndex, setSortIndex] = useState(0);

  const sorts = useMemo(() => [
    { key: 'name', label: 'A–Z', compare: BY_NAME },
    ...(rows.some(row => row.rarity !== undefined) ? [{ key: 'rarity', label: 'Rarity', compare: BY_RARITY }] : []),
    ...extraSorts,
  ], [rows, extraSorts]);

  const sort = sorts[sortIndex % sorts.length];

  const visible = useMemo(
    () => rows.filter(row => matches(row, query)).sort(sort.compare),
    [rows, query, sort],
  );

  return (
    <div className="flex flex-col gap-2">
      <SearchField value={query} onChange={setQuery} label={label} count={visible.length} total={rows.length}>
        {sorts.length > 1 && (
          <button
            type="button"
            onClick={() => setSortIndex(current => (current + 1) % sorts.length)}
            aria-label={`Sort by ${sorts[(sortIndex + 1) % sorts.length].label}`}
            className="shrink-0 rounded-7 border border-edge bg-surface-bar px-2 py-1.5 font-mono text-11 text-content-muted hover:border-edge-strong hover:text-content"
          >
            {sort.label}
          </button>
        )}
      </SearchField>

      <div className="max-h-72 overflow-y-auto rounded-9 border border-edge">
        {emptyLabel && (
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-pressed={!selected}
            className={cx(
              'flex w-full items-center border-b border-edge-faint px-2.5 py-2 text-left text-12 transition-colors',
              selected ? 'text-content-faint hover:bg-surface-active' : 'bg-surface-active text-content-bright',
            )}
          >
            {emptyLabel}
          </button>
        )}
        {visible.map(row => (
          <button
            key={row.id}
            type="button"
            disabled={row.disabled}
            aria-pressed={row.id === selected}
            onClick={() => onPick(row.id)}
            className={cx(
              'flex w-full flex-col gap-0.5 border-b border-edge-faint px-2.5 py-2 text-left transition-colors last:border-b-0',
              row.id === selected ? 'bg-info-bg/30' : 'hover:bg-surface-active',
              row.disabled && 'opacity-40',
            )}
          >
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 text-12 font-semibold text-content-bright">{row.name}</span>
              {row.tag && (
                <span className="shrink-0 rounded-6 bg-surface-control px-1.5 py-0.5 text-9 text-content-faint">{row.tag}</span>
              )}
              {row.rarity !== undefined && (
                <span className="shrink-0 font-mono text-10 text-content-ghost">{row.rarity}★</span>
              )}
            </span>
            {(row.disabled ? row.disabledNote : row.detail) && (
              <span className="line-clamp-2 text-10 leading-snug text-content-muted">
                {row.disabled ? row.disabledNote : row.detail}
              </span>
            )}
          </button>
        ))}
        {visible.length === 0 && (
          <p className="px-2.5 py-3 text-11 text-content-faint">Nothing matches “{query}”.</p>
        )}
      </div>
    </div>
  );
}
