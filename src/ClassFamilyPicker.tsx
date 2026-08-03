import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { CLASSES, CLASS_HIERARCHY } from './data/classes';
import { getBaseClass, STAT_KEYS } from './domain/buildEvaluation';

interface ClassFamilyPickerProps {
  label: string;
  selectedClass: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (className: string) => void;
  retroMode?: boolean;
}

export default function ClassFamilyPicker({ label, selectedClass, open, onOpenChange, onSelect, retroMode = false }: ClassFamilyPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [highlightedClass, setHighlightedClass] = useState(selectedClass);

  useEffect(() => {
    if (!open) return;
    setHighlightedClass(selectedClass);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('[data-class-choice="true"]')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange, selectedClass]);

  const close = () => {
    onOpenChange(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const selectedBase = getBaseClass(selectedClass);
  const details = CLASSES[highlightedClass] ?? CLASSES[selectedClass];

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Choose ${label}: ${selectedClass}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(true)}
        className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-left hover:bg-gray-600 flex justify-between items-center text-sm md:text-base tap-target ${retroMode ? 'font-retro glow-border sound-click sound-hover' : ''}`}
      >
        <span className="min-w-0">
          <span className="block text-white truncate">{selectedClass}</span>
          {selectedClass !== selectedBase && <span className="block text-xs text-gray-400 truncate">{selectedBase} promotion</span>}
        </span>
        <ChevronDown size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/75 p-2 sm:p-6 flex items-center justify-center" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${label.replace(/\s+/g, '-').toLowerCase()}-dialog-title`}
            className={`w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-xl border border-gray-600 bg-gray-900 shadow-2xl ${retroMode ? 'font-retro glow-border' : ''}`}
          >
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div>
                <h2 id={`${label.replace(/\s+/g, '-').toLowerCase()}-dialog-title`} className="text-xl font-bold text-white">Choose {label}</h2>
                <p className="text-xs text-gray-400">Choose a base class or one of its promotions.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close class picker" className="p-2 rounded hover:bg-gray-700"><X size={20} /></button>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(CLASS_HIERARCHY).map(([baseName, family]) => (
                <section key={baseName} className={`rounded-lg border p-3 ${selectedBase === baseName ? 'border-green-500 bg-green-950/25' : 'border-gray-700 bg-gray-800/70'}`}>
                  <h3 className="font-bold text-red-300 mb-2">{baseName}</h3>
                  <div className="flex flex-wrap gap-2">
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
                          className={`px-3 py-2 rounded-md text-sm border flex items-center gap-1.5 ${selected ? 'bg-blue-700 border-blue-400 text-white' : 'bg-gray-900 border-gray-600 text-gray-200 hover:border-blue-400 hover:bg-gray-700'}`}
                        >
                          {selected && <Check size={14} aria-hidden="true" />}
                          {className}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="sticky bottom-0 border-t border-gray-700 bg-gray-950/95 backdrop-blur px-4 py-3">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm">
                <strong className="text-blue-300">{highlightedClass}</strong>
                <span className="text-gray-300">
                  Stats: {STAT_KEYS.filter(stat => (details?.[stat] ?? 0) !== 0).map(stat => `${stat.toUpperCase()} ${details[stat] > 0 ? '+' : ''}${details[stat]}`).join(', ') || 'No class stat bonuses'}
                </span>
                <span className="text-gray-400">Weapons: {details?.validWeapons?.join(', ') || 'None listed'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
