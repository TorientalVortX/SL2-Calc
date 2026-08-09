import { useEffect, useRef, useState } from 'react';
import { Check, LayoutGrid, X } from 'lucide-react';
import { CLASSES, CLASS_HIERARCHY } from './data/classes';
import { getBaseClass, STAT_KEYS } from './domain/buildEvaluation';
import { STAT_COLORS, onDark } from './data/colors';
import { cx, Modal, ModalFooter, ModalHeader } from './design';
import { DeckLabel } from './CommandDeck';
import type { StatKey } from './types';

interface ClassFamilyPickerProps {
  label: string;
  selectedClass: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (className: string) => void;
}

/**
 * Browse every class family with its stat bonuses and valid weapons.
 *
 * The mockup's left rail picks classes with two plain selects, which is faster
 * but shows none of that detail — so this is kept as a "browse" affordance
 * beside them rather than dropped. Restyled to the deck's language: surface
 * tokens, condensed micro-labels, mono numerals.
 */
export default function ClassFamilyPicker({
  label,
  selectedClass,
  open,
  onOpenChange,
  onSelect,
}: ClassFamilyPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [highlightedClass, setHighlightedClass] = useState(selectedClass);

  // Focus trapping, scroll lock, Escape and focus restoration live in <Modal>;
  // this only resets the preview row each time the dialog opens.
  useEffect(() => {
    if (open) setHighlightedClass(selectedClass);
  }, [open, selectedClass]);

  const close = () => {
    onOpenChange(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectedBase = getBaseClass(selectedClass);
  const details = CLASSES[highlightedClass] ?? CLASSES[selectedClass];
  const titleId = `${label.replace(/\s+/g, '-').toLowerCase()}-dialog-title`;
  const bonuses = STAT_KEYS.filter(stat => (details?.[stat] ?? 0) !== 0);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Choose ${label}: ${selectedClass}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(true)}
        title="Browse classes with their bonuses"
        className={cx(
          'flex items-center gap-1 rounded-6 px-1.5 py-0.5 text-10 text-content-ghost transition-colors',
          'hover:bg-surface-raised hover:text-content-secondary',
        )}
      >
        <LayoutGrid size={11} aria-hidden="true" />
        Browse
      </button>

      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        labelledBy={titleId}
        returnFocusTo={triggerRef}
        initialFocus='[data-class-choice="true"]'
        maxWidth="6xl"
      >
        <ModalHeader>
          <div>
            <h2 id={titleId} className="text-15 font-semibold text-content">Choose {label}</h2>
            <p className="text-11 text-content-faint">Pick a base class or one of its promotions.</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close class picker"
            className="grid h-7 w-7 place-items-center rounded-6 text-content-muted hover:bg-surface-raised hover:text-content"
          >
            <X size={16} />
          </button>
        </ModalHeader>

        <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CLASS_HIERARCHY).map(([baseName, family]) => {
            const isCurrentFamily = selectedBase === baseName;
            return (
              <section
                key={baseName}
                className={cx(
                  'rounded-9 border p-3 transition-colors',
                  isCurrentFamily ? 'border-info bg-info-bg/25' : 'border-edge bg-surface-bar',
                )}
              >
                <DeckLabel className={isCurrentFamily ? 'text-info-soft' : undefined}>{baseName}</DeckLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[baseName, ...family.subClasses].map(className => {
                    const selected = selectedClass === className;
                    return (
                      <button
                        key={className}
                        type="button"
                        data-class-choice="true"
                        onMouseEnter={() => setHighlightedClass(className)}
                        onFocus={() => setHighlightedClass(className)}
                        onClick={() => { onSelect(className); close(); }}
                        className={cx(
                          'flex items-center gap-1.5 rounded-7 border px-2.5 py-1.5 text-12 transition-colors',
                          selected
                            ? 'border-info bg-info-bg text-content'
                            : 'border-edge bg-surface-base text-content-bright hover:border-edge-emphasis',
                        )}
                      >
                        {selected && <Check size={12} aria-hidden="true" />}
                        {className}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <ModalFooter>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <strong className="shrink-0 text-13 font-semibold text-info">{highlightedClass}</strong>

            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <DeckLabel>Stats</DeckLabel>
              {bonuses.length === 0 ? (
                <span className="text-11 text-content-faint">No class stat bonuses</span>
              ) : (
                bonuses.map(stat => {
                  const key = stat as StatKey;
                  const raw = STAT_COLORS[key];
                  const value = details[key];
                  return (
                    <span key={key} className="flex items-baseline gap-1 rounded-6 bg-surface-base px-1.5 py-0.5">
                      <span
                        className="font-condensed text-10 font-semibold uppercase tracking-tag"
                        style={{ color: raw === 'rainbow' ? '#e6ebf5' : onDark(raw) }}
                      >
                        {key.toUpperCase()}
                      </span>
                      <span className={cx('font-mono text-11 font-semibold', value > 0 ? 'text-positive' : 'text-negative')}>
                        {value > 0 ? '+' : ''}{value}
                      </span>
                    </span>
                  );
                })
              )}
            </div>

            <div className="flex min-w-0 items-baseline gap-1.5">
              <DeckLabel>Weapons</DeckLabel>
              <span className="truncate text-11 text-content-muted">
                {details?.validWeapons?.join(', ') || 'None listed'}
              </span>
            </div>
          </div>
        </ModalFooter>
      </Modal>
    </>
  );
}
