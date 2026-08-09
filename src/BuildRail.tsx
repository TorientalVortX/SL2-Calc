import { X } from 'lucide-react';
import { RACES, SUBRACES } from './data/races';
import { CLASS_HIERARCHY } from './data/classes';
import { FOODS, HISTORY } from './data/bonuses';
import { TEMPLATE_BUILDS } from './data/constants';
import { STAT_COLORS, onDark } from './data/colors';
import type { ReactNode } from 'react';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import type { SaveSlotV1, StatKey } from './types';

const field = 'w-full rounded-7 border border-edge bg-surface-raised px-3 py-2 text-13 text-content outline-none focus:border-edge-emphasis';

/** Base classes, and the promotions available under each. */
const BASE_CLASSES = Object.values(CLASS_HIERARCHY)
  .filter(entry => entry.baseClass)
  .map(entry => entry.name);

function promotionsFor(base: string): string[] {
  return CLASS_HIERARCHY[base]?.subClasses ?? [];
}

/**
 * The stat that most *distinguishes* a template, shown as its badge.
 *
 * Not simply the highest: every template invests heavily in SKI and VIT, so the
 * largest absolute value badges Rogue as SKI. Measuring each stat against its
 * mean across all templates picks out what is actually characteristic —
 * STR / WIL / LUC — which is what the mockup shows.
 */
const TEMPLATE_MEANS: Record<string, number> = (() => {
  const templates = Object.values(TEMPLATE_BUILDS) as Array<{ stats: Record<string, number> }>;
  const totals: Record<string, number> = {};
  for (const template of templates) {
    for (const [stat, value] of Object.entries(template.stats)) {
      totals[stat] = (totals[stat] ?? 0) + value;
    }
  }
  for (const stat of Object.keys(totals)) totals[stat] /= templates.length || 1;
  return totals;
})();

function headlineStat(stats: Record<string, number>): StatKey {
  const ranked = Object.entries(stats)
    .map(([stat, value]) => [stat, value - (TEMPLATE_MEANS[stat] ?? 0)] as const)
    .sort((a, b) => b[1] - a[1]);
  return (ranked[0]?.[0] ?? 'str') as StatKey;
}

interface ClassSlotProps {
  label: string;
  base: string;
  value: string;
  onBaseChange: (base: string) => void;
  onValueChange: (value: string) => void;
  /** The "Browse" trigger, which opens the full class picker. */
  browse?: ReactNode;
}

/**
 * A class slot: pick the base class, then optionally a promotion under it.
 * The mockup nests the promotion select beneath its base with an elbow rule.
 */
function ClassSlot({ label, base, value, onBaseChange, onValueChange, browse }: ClassSlotProps) {
  const promotions = promotionsFor(base);
  return (
    <div className="flex flex-col gap-1.5 rounded-9 border border-edge-muted bg-surface-bar p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <DeckLabel>{label}</DeckLabel>
        <span className="flex items-baseline gap-1.5">
          <span className="text-10 text-content-ghost">Base class</span>
          {browse}
        </span>
      </div>
      <select className={field} value={base} onChange={e => onBaseChange(e.target.value)}>
        {BASE_CLASSES.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <div className="flex items-center gap-1.5 pl-2">
        <span className="mb-1.5 h-2.5 w-2.5 shrink-0 border-b border-l border-edge-strong" />
        <select className={cx(field, 'flex-1 text-12')} value={value} onChange={e => onValueChange(e.target.value)}>
          <option value={base}>{base} — no promotion</option>
          {promotions.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
    </div>
  );
}

export interface BuildRailProps {
  /** Class-picker triggers, rendered inside each class slot's header. */
  browseMain?: ReactNode;
  browseSub?: ReactNode;
  buildName: string;
  onBuildNameChange: (name: string) => void;
  race: string;
  subrace: string;
  availableSubraces: string[];
  onRaceChange: (race: string) => void;
  onSubraceChange: (subrace: string) => void;
  selectedMainBaseClass: string;
  selectedSubBaseClass: string;
  mainClass: string;
  subClass: string;
  onMainBaseChange: (base: string) => void;
  onSubBaseChange: (base: string) => void;
  onMainClassChange: (name: string) => void;
  onSubClassChange: (name: string) => void;
  food: string;
  onFoodChange: (food: string) => void;
  history: string;
  onHistoryChange: (history: string) => void;
  onOpenTalents: () => void;
  /** Takes the section to land on, so each chip opens where it says it does. */
  onOpenAdvanced: (section: 'character' | 'custom' | 'legend' | 'astrology' | 'elemental') => void;
  onOpenSaves: () => void;
  saveSlots: SaveSlotV1[];
  onCreateSave: () => void;
  onLoadSave: (slot: SaveSlotV1) => void;
  onDeleteSave: (slot: SaveSlotV1) => void;
  onLoadTemplate: (key: string) => void;
  onResetPoints: () => void;
}

/**
 * The Stats tab's left rail: everything that defines the character, in the
 * order the mockup puts it — build, identity, classes, modifiers, saves.
 */
export default function BuildRail({
  buildName,
  onBuildNameChange,
  race,
  subrace,
  availableSubraces,
  onRaceChange,
  onSubraceChange,
  selectedMainBaseClass,
  selectedSubBaseClass,
  mainClass,
  subClass,
  onMainBaseChange,
  onSubBaseChange,
  onMainClassChange,
  onSubClassChange,
  food,
  onFoodChange,
  history,
  onHistoryChange,
  onOpenTalents,
  onOpenAdvanced,
  onOpenSaves,
  saveSlots,
  onCreateSave,
  onLoadSave,
  onDeleteSave,
  onLoadTemplate,
  browseMain,
  browseSub,
  onResetPoints,
}: BuildRailProps) {
  const monoclass = mainClass === subClass;

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <DeckLabel>Build</DeckLabel>
        <input
          value={buildName}
          onChange={e => onBuildNameChange(e.target.value)}
          placeholder="Untitled Build"
          aria-label="Build name"
          className={cx(field, 'font-semibold')}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <DeckLabel>Identity</DeckLabel>
        <label className="flex flex-col gap-1.5">
          <span className="text-11 font-medium text-content-muted">Race</span>
          <select className={field} value={race} onChange={e => onRaceChange(e.target.value)}>
            {Object.keys(RACES).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-11 font-medium text-content-muted">Subrace</span>
          <select className={field} value={subrace} onChange={e => onSubraceChange(e.target.value)}>
            {availableSubraces.map(name => (
              <option key={name} value={name}>{SUBRACES[name] ? name : name}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="flex flex-col gap-2.5">
        <ClassSlot
          label="Main class"
          base={selectedMainBaseClass}
          value={mainClass}
          onBaseChange={onMainBaseChange}
          onValueChange={onMainClassChange}
          browse={browseMain}
        />
        <ClassSlot
          label="Sub class"
          base={selectedSubBaseClass}
          value={subClass}
          onBaseChange={onSubBaseChange}
          onValueChange={onSubClassChange}
          browse={browseSub}
        />
        {monoclass && (
          <p className="rounded-7 border border-edge-muted bg-surface-bar px-3 py-2 text-11 text-info-soft">
            Monoclass — class bonuses count twice.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2.5">
        <DeckLabel>Modifiers</DeckLabel>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-11 font-medium text-content-muted">Food</span>
            <select className={field} value={food} onChange={e => onFoodChange(e.target.value)}>
              {Object.keys(FOODS).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-11 font-medium text-content-muted">History</span>
            <select className={field} value={history} onChange={e => onHistoryChange(e.target.value)}>
              {Object.keys(HISTORY).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['Talents', onOpenTalents],
            ['Legend Extend', () => onOpenAdvanced('legend')],
            ['Astrology', () => onOpenAdvanced('astrology')],
            ['Elemental', () => onOpenAdvanced('elemental')],
            ['Advanced', () => onOpenAdvanced('character')],
          ] as const).map(([label, action]) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="rounded-full border border-edge px-3 py-1.5 text-12 text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <DeckLabel>Saved builds</DeckLabel>
          <button
            type="button"
            onClick={onCreateSave}
            className="rounded-6 bg-info-bg px-2.5 py-1 text-11 font-semibold text-content hover:bg-info-edge"
          >
            Save
          </button>
        </div>
        {saveSlots.length === 0 ? (
          <p className="text-11 text-content-faint">No saved builds yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {saveSlots.slice(0, 4).map(slot => (
              <div
                key={slot.id}
                className="group flex items-stretch overflow-hidden rounded-7 border border-edge bg-surface-bar transition-colors hover:border-edge-emphasis"
              >
                <button
                  type="button"
                  onClick={() => onLoadSave(slot)}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-left text-12 text-content-bright"
                >
                  {slot.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete saved build ${slot.name}`}
                  title="Delete this saved build"
                  onClick={() => onDeleteSave(slot)}
                  className="shrink-0 px-2 text-content-ghost transition-colors hover:bg-surface-raised hover:text-negative"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
            {saveSlots.length > 4 && (
              <button type="button" onClick={onOpenSaves} className="text-left text-11 text-info hover:text-info-soft">
                {saveSlots.length - 4} more…
              </button>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <DeckLabel>Templates</DeckLabel>
        <div className="flex flex-col gap-1">
          {Object.entries(TEMPLATE_BUILDS).map(([key, template]) => {
            const stat = headlineStat(template.stats as Record<string, number>);
            const raw = STAT_COLORS[stat];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onLoadTemplate(key)}
                title={template.description}
                className="flex items-center justify-between gap-2 rounded-7 border border-edge bg-surface-bar px-3 py-2 text-left hover:border-edge-emphasis"
              >
                <span className="truncate text-12 text-content-bright">{template.name}</span>
                <span
                  className="shrink-0 font-condensed text-10 font-semibold uppercase tracking-tag"
                  style={{ color: raw === 'rainbow' ? '#e6ebf5' : onDark(raw) }}
                >
                  {stat.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={onResetPoints}
        className="mt-auto text-center text-12 text-content-muted transition-colors hover:text-negative-soft"
      >
        Reset all points
      </button>
    </>
  );
}
