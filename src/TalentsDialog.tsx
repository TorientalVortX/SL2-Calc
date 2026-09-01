import type { ReactNode } from 'react';
import { CLASS_HIERARCHY } from './data/classes';
import { PLANET_ELEMENTS } from './data/bonuses';
import { cx } from './design';
import DeckDialog, { DialogSection } from './DeckDialog';

/** The talent toggles, grouped so the dialog takes two props instead of twenty-eight. */
export interface TalentValues {
  giantGene: boolean;
  warwalk: boolean;
  luminaryElement: boolean;
  persistenceOfNormalcy: boolean;
  powerOfNormalcy: boolean;
}

export interface TalentSetters {
  giantGene: (v: boolean) => void;
  warwalk: (v: boolean) => void;
  luminaryElement: (v: boolean) => void;
  persistenceOfNormalcy: (v: boolean) => void;
  powerOfNormalcy: (v: boolean) => void;
}

export interface TalentsDialogProps {
  onClose: () => void;
  /** Current talent values. */
  t: TalentValues;
  /** Setter for each talent value. */
  set: TalentSetters;
  mainClass: string;
  subClass: string;
  astrology: string;
}

/** A talent row: checkbox, name, live status, and the rule underneath. */
function Talent({
  checked,
  onChange,
  name,
  status,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  name: string;
  status?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer gap-2.5 rounded-8 border p-2.5 transition-colors',
        checked ? 'border-info bg-info-bg/30' : 'border-edge bg-surface-bar hover:border-edge-emphasis',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-info-solid"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2 text-12 font-semibold text-content-bright">
          {name}
          {status}
        </span>
        {hint && <span className="text-10 leading-relaxed text-content-ghost">{hint}</span>}
      </span>
    </label>
  );
}

/** "✓ …" / "✗ …" line shown next to an enabled talent. */
function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={cx('text-10 font-medium', ok ? 'text-positive' : 'text-caution')}>
      {ok ? '✓' : '✗'} {children}
    </span>
  );
}

/** Both normalcy talents key off the same base-class test. */
function normalcy(mainClass: string, subClass: string) {
  const isBase = (name: string) =>
    Object.values(CLASS_HIERARCHY).some(data => data.name === name && data.baseClass);
  const bothBase = isBase(mainClass) && isBase(subClass);
  return { bothBase, same: mainClass === subClass };
}

/**
 * Race and class talent toggles.
 *
 * The fourteen talent values stay as individual `useState`s in the parent (they
 * feed the stat calculation from ~46 other call sites), and are only grouped at
 * this boundary, so the dialog gets a small signature without disturbing the
 * calculation path.
 */
export default function TalentsDialog({
  onClose,
  t,
  set,
  mainClass,
  subClass,
  astrology,
}: TalentsDialogProps) {
  const { bothBase, same } = normalcy(mainClass, subClass);


  return (
    <DeckDialog
      title="Talents & Traits"
      onClose={onClose}
      sections={[
        { id: 'vitality', label: 'Vitality' },
        { id: 'class-talents', label: 'Class' },
      ]}
    >
      {/* Rising Game, Pain Tolerance, Fortitude and Endurance used to sit here.
          They are class skills, so they are ranked in the Skills sheet instead.
          Keeping a second set of controls meant one skill could hold two
          different ranks depending on which screen you opened. */}
      <DialogSection id="vitality" title="Vitality">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Talent checked={t.giantGene} onChange={set.giantGene} name="Giant Gene" hint="+10% HP, −10 Evade" />
          <Talent checked={t.warwalk} onChange={set.warwalk} name="Warwalk" hint="+30 HP / FP" />
        </div>
      </DialogSection>

      <DialogSection id="class-talents" title="Class talents">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Talent
            checked={t.luminaryElement}
            onChange={set.luminaryElement}
            name="Luminary Element"
            status={t.luminaryElement && astrology
              ? <Status ok>WIL → {PLANET_ELEMENTS[astrology]} ATK (1:1)</Status>
              : undefined}
            hint="WIL no longer raises all elements; it raises your Starsign's element by 1 per raw WIL, ignoring diminishing returns."
          />
          <Talent
            checked={t.persistenceOfNormalcy}
            onChange={set.persistenceOfNormalcy}
            name="Persistence of Normalcy"
            status={t.persistenceOfNormalcy
              ? bothBase
                ? <Status ok>{same ? '+200 HP (same base classes)' : '+100 HP (both base classes)'}</Status>
                : <Status ok={false}>Requires both classes to be base classes</Status>
              : undefined}
          />
          <Talent
            checked={t.powerOfNormalcy}
            onChange={set.powerOfNormalcy}
            name="Power of Normalcy"
            status={t.powerOfNormalcy
              ? bothBase
                ? <Status ok>{same ? '+8 all stats (same base classes)' : '+4 all stats (both base classes)'}</Status>
                : <Status ok={false}>Requires both classes to be base classes</Status>
              : undefined}
          />
        </div>
      </DialogSection>

    </DeckDialog>
  );
}
