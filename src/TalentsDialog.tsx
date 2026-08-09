import type { ReactNode } from 'react';
import { CLASS_HIERARCHY } from './data/classes';
import { PLANET_ELEMENTS } from './data/bonuses';
import { cx } from './design';
import DeckDialog, { DialogField, DialogNumber, DialogSection } from './DeckDialog';
import type { StatRecord } from './types';

/** The talent toggles, grouped so the dialog takes two props instead of twenty-eight. */
export interface TalentValues {
  giantGene: boolean;
  sanguineCrest: boolean;
  felidaeInstinct: boolean;
  lupineInstinct: boolean;
  risingGame: number;
  redtailFortuneLevel: number;
  redtailDiceColor: 'red' | 'green' | 'yellow';
  fortitude: boolean;
  painTolerance: number;
  warwalk: boolean;
  endurance: boolean;
  luminaryElement: boolean;
  persistenceOfNormalcy: boolean;
  powerOfNormalcy: boolean;
}

export interface TalentSetters {
  giantGene: (v: boolean) => void;
  sanguineCrest: (v: boolean) => void;
  felidaeInstinct: (v: boolean) => void;
  lupineInstinct: (v: boolean) => void;
  risingGame: (v: number) => void;
  redtailFortuneLevel: (v: number) => void;
  redtailDiceColor: (v: 'red' | 'green' | 'yellow') => void;
  fortitude: (v: boolean) => void;
  painTolerance: (v: number) => void;
  warwalk: (v: boolean) => void;
  endurance: (v: boolean) => void;
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
  subrace: string;
  mainClass: string;
  subClass: string;
  astrology: string;
  hpPercent: number;
  hasGhost: boolean;
  hasFortitude: boolean;
  hasEndurance: boolean;
  /** Scaled stats, read for the talent effect previews. */
  stats: StatRecord;
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
 * The fourteen talent values stay as individual `useState`s in the parent — they
 * feed the stat calculation from ~46 other call sites — and are only grouped at
 * this boundary, so the dialog gets a small signature without disturbing the
 * calculation path.
 */
export default function TalentsDialog({
  onClose,
  t,
  set,
  subrace,
  mainClass,
  subClass,
  astrology,
  hpPercent,
  hasGhost,
  hasFortitude,
  hasEndurance,
  stats,
}: TalentsDialogProps) {
  const { bothBase, same } = normalcy(mainClass, subClass);
  const sanMultiplier = 1 + Math.min(Math.floor(stats.san / 10), 5);
  const isKaelensia = subrace === 'Felidae' || subrace === 'Grimalkin';
  const hasRaceTalent = isKaelensia || subrace === 'Lupine' || subrace === 'Oni' || subrace === 'Vampire';
  const instinctActive = hpPercent <= 50;

  const diceEffect = () => {
    const penalty = 5 + Math.min(Math.floor(stats.san / 10), 5) * 5;
    const bonus = t.redtailFortuneLevel * sanMultiplier;
    const sign = t.redtailFortuneLevel === 1 ? `−${penalty}` : `+${bonus}`;
    if (t.redtailDiceColor === 'red') return { tone: 'text-negative', label: 'Red', effect: `${sign} Hit / Critical` };
    if (t.redtailDiceColor === 'green') return { tone: 'text-positive', label: 'Green', effect: `${sign}% Status inflict / resist` };
    return { tone: 'text-caution', label: 'Yellow', effect: `${sign} Evade / Critical Evade` };
  };
  const dice = diceEffect();

  return (
    <DeckDialog
      title="Talents & Traits"
      onClose={onClose}
      sections={[
        { id: 'vitality', label: 'Vitality' },
        { id: 'class-talents', label: 'Class' },
        ...(hasRaceTalent || subrace === 'Redtail' ? [{ id: 'race-talents', label: 'Race' }] : []),
      ]}
    >
      <DialogSection id="vitality" title="Vitality">
        {hasGhost && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DialogField label="Rising Game rank (0–5)" hint="Bonus stats when HP is low">
              <DialogNumber value={t.risingGame} min={0} max={5} onChange={set.risingGame} />
            </DialogField>
            <DialogField label="Pain Tolerance HP" hint="+10 HP per rank">
              <DialogNumber value={t.painTolerance} min={0} step={10} onChange={set.painTolerance} />
            </DialogField>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {hasFortitude && (
            <Talent checked={t.fortitude} onChange={set.fortitude} name="Fortitude" hint="+10% HP" />
          )}
          {hasEndurance && (
            <Talent checked={t.endurance} onChange={set.endurance} name="Endurance" hint="+15% HP" />
          )}
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

      {(hasRaceTalent || subrace === 'Redtail') && (
        <DialogSection id="race-talents" title={`${subrace} talents`}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {isKaelensia && (
              <Talent
                checked={t.felidaeInstinct}
                onChange={set.felidaeInstinct}
                name="Instinct"
                status={t.felidaeInstinct && instinctActive
                  ? <Status ok>Active {hpPercent <= 25 && '(×2)'}</Status>
                  : undefined}
                hint="SKI / CEL / LUC / GUI at ≤50% HP"
              />
            )}
            {subrace === 'Lupine' && (
              <Talent
                checked={t.lupineInstinct}
                onChange={set.lupineInstinct}
                name="Lupine Instinct"
                status={t.lupineInstinct && instinctActive
                  ? <Status ok>Active {hpPercent <= 25 && '(×2)'}</Status>
                  : undefined}
                hint="STR / WIL / DEF / RES at ≤50% HP"
              />
            )}
            {(subrace === 'Oni' || subrace === 'Vampire') && (
              <Talent
                checked={t.sanguineCrest}
                onChange={set.sanguineCrest}
                name="Sanguine Crest"
                hint="+2 STR / WIL / SKI / CEL / DEF"
              />
            )}
          </div>

          {subrace === 'Redtail' && (
            <div className="flex flex-col gap-2.5 rounded-9 border border-edge-muted bg-surface-bar p-3">
              <span className="text-12 font-semibold text-content-bright">Fox God&apos;s Blessing</span>
              <p className="text-10 leading-relaxed text-content-ghost">
                Every round in battle, glowing spirits appear around the Redtail (1–6), becoming your
                Fortune Level. Dice colour determines the effect. Bonuses scale with SAN
                (+1× per 10 scaled SAN, max 5×).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <DialogField label="Fortune Level (1–6)">
                  <DialogNumber value={t.redtailFortuneLevel} min={1} max={6} onChange={set.redtailFortuneLevel} />
                </DialogField>
                <DialogField label="Dice colour">
                  <select
                    value={t.redtailDiceColor}
                    onChange={event => set.redtailDiceColor(event.target.value as 'red' | 'green' | 'yellow')}
                    className={cx(
                      'w-full rounded-7 border border-edge bg-surface-bar px-2 py-1.5 text-12 text-content-bright',
                      'transition-colors hover:border-edge-strong focus:border-edge-emphasis focus:outline-none',
                    )}
                  >
                    <option value="red">Red dice</option>
                    <option value="green">Green dice</option>
                    <option value="yellow">Yellow dice</option>
                  </select>
                </DialogField>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-11">
                <span className={cx('font-semibold', dice.tone)}>{dice.label} dice</span>
                <span className="text-content-secondary">{dice.effect}</span>
                <span className="font-mono text-10 text-content-ghost">SAN multiplier {sanMultiplier}×</span>
              </div>
            </div>
          )}
        </DialogSection>
      )}
    </DeckDialog>
  );
}
