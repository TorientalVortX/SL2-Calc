import { ELEMENT_COLORS, onDark } from './data/colors';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import type { BuildEvaluation, ElementKey } from './types';

/** Elemental ATK bars scale against the strongest element in play. */
function atkScale(values: number[]): number {
  return Math.max(10, ...values);
}

function StatCell({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-9 border border-edge-muted bg-surface-bar px-3 py-2.5">
      <div className="text-11 font-medium text-content-muted">{label}</div>
      <div className={cx('mt-1 font-mono text-17 font-bold tracking-tight-value', tone ?? 'text-content')}>
        {value}
      </div>
    </div>
  );
}

/** A chip for the compact utility row. */
function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex items-baseline gap-1.5 rounded-full border border-edge px-2.5 py-1">
      <span className="text-11 text-content-muted">{label}</span>
      <span className="font-mono text-12 font-semibold text-content">{value}</span>
    </span>
  );
}

export interface ResultRailProps {
  buildEvaluation: BuildEvaluation;
  elements: string[];
  calculateElementalATK: (element: string) => number;
  calculateElementalRES: (element: string) => number;
  /** Max HP is the bar's full extent; current HP fills it. */
  currentHP?: number;
  /** Manual overrides, so a tuned element can be marked as such. */
  elementalATKAdjustments?: Record<string, number>;
  elementalRESAdjustments?: Record<string, number>;
  /** Opens the advanced dialog on its elemental section. */
  onAdjustElemental?: () => void;
  /** Opens the Hit-versus-Evade screen. */
  onOpenHitChance?: () => void;
}

/**
 * The Stats tab's right rail: everything the allocation changes.
 *
 * Ordered as the mockup does: HP and FP as headline readouts with fill bars,
 * then Defense, Offense, Elemental ATK, and Utility as chips.
 */
export default function ResultRail({
  buildEvaluation,
  elements,
  calculateElementalATK,
  calculateElementalRES,
  elementalATKAdjustments,
  elementalRESAdjustments,
  onAdjustElemental,
  onOpenHitChance,
}: ResultRailProps) {
  const d = buildEvaluation.derived;
  const atkValues = elements.map(calculateElementalATK);
  const scale = atkScale(atkValues);
  const hpPct = d.maxHP > 0 ? Math.min(100, (d.currentHP / d.maxHP) * 100) : 0;

  return (
    <>
      {/* HP / FP */}
      <div className="grid grid-cols-2 gap-2">
        {([
          ['HP', d.currentHP === d.maxHP ? d.maxHP : `${d.currentHP}`, hpPct, 'bg-positive', 'text-positive'],
          ['FP', d.fp, 100, 'bg-info', 'text-info'],
        ] as const).map(([label, value, pct, barTone, textTone]) => (
          <div key={label} className="rounded-9 border border-edge-muted bg-surface-bar p-3">
            <div className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">
              {label}
            </div>
            <div className={cx('mt-1 font-mono text-26 font-bold tracking-tight-value', textTone)}>{value}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-control">
              <div className={cx('h-full rounded-full', barTone)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <DeckLabel>Defense</DeckLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Phys. Def" value={`${d.physicalDefense}%`} tone="text-magic" />
          <StatCell label="Mag. Def" value={`${d.magicalDefense}%`} tone="text-magic" />
          <StatCell label="Evade" value={d.evade} tone="text-caution" />
          <StatCell label="Crit Evade" value={d.criticalEvade} tone="text-highlight" />
        </div>
      </section>

      {/*
        * Bonus Hit and Bonus Evade are each capped at 50, and the cap is easy to
        * cross without noticing: the number simply stops moving. Surfaced here
        * because it is actionable: those points can go somewhere else.
        */}
      {(d.evadeBonusWasted > 0 || d.hitBonusWasted > 0) && (
        <p className="rounded-7 border border-caution/40 bg-caution-bg px-3 py-2 text-11 leading-relaxed text-caution-soft">
          {[
            d.evadeBonusWasted > 0 ? `${d.evadeBonusWasted} Evade` : null,
            d.hitBonusWasted > 0 ? `${d.hitBonusWasted} Hit` : null,
          ].filter(Boolean).join(' and ')} is being discarded by the +50 bonus cap.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <DeckLabel>Offense</DeckLabel>
          {onOpenHitChance && (
            <button
              type="button"
              onClick={onOpenHitChance}
              title="Hit chance against a target you describe"
              className="font-condensed text-10 font-medium uppercase tracking-tag text-content-ghost transition-colors hover:text-content-secondary"
            >
              Hit chance
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Hit" value={buildEvaluation.primaryWeapon?.hit ?? 0} />
          <StatCell label="Critical" value={buildEvaluation.primaryWeapon?.critical ?? 0} />
          <StatCell label="Status Inflict" value={d.statusInfliction} tone="text-positive" />
          <StatCell label="Status Resist" value={d.statusResistance} tone="text-info" />
        </div>
        {/*
          * Flanking used to be a number with no consequence. These are what it
          * buys, so the GUI behind it is legible without opening the dialog.
          */}
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Front" value={d.hitTiers.front} />
          <Chip label="Flanked" value={d.hitTiers.flank1} />
          <Chip label="Flanked +ally" value={d.hitTiers.flank2} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <DeckLabel>Elemental ATK</DeckLabel>
          {onAdjustElemental ? (
            <button
              type="button"
              onClick={onAdjustElemental}
              title="Manually adjust elemental ATK and RES"
              className="font-condensed text-10 font-medium uppercase tracking-tag text-content-ghost transition-colors hover:text-content-secondary"
            >
              ATK · RES · Adjust
            </button>
          ) : (
            <span className="font-condensed text-10 font-medium uppercase tracking-tag text-content-ghost">
              ATK · RES
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {elements.map(element => {
            const atk = calculateElementalATK(element);
            const res = calculateElementalRES(element);
            const colour = onDark(ELEMENT_COLORS[element as ElementKey] ?? '#9aa6bf');
            // A manual override is invisible in the total, so mark the row.
            const tuned = Boolean(elementalATKAdjustments?.[element]) || Boolean(elementalRESAdjustments?.[element]);
            return (
              <div key={element} className="grid grid-cols-[62px_1fr_30px_34px] items-center gap-2">
                <span className="flex min-w-0 items-baseline gap-1">
                  <span className="truncate text-11 font-medium" style={{ color: colour }}>{element}</span>
                  {tuned && (
                    <span
                      className="shrink-0 text-10 text-content-ghost"
                      title={`Manually adjusted: ATK ${elementalATKAdjustments?.[element] ?? 0}, RES ${elementalRESAdjustments?.[element] ?? 0}`}
                    >
                      ±
                    </span>
                  )}
                </span>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-control">
                  <div
                    className="h-full rounded-full transition-[width] duration-150"
                    style={{ background: colour, width: `${Math.max(0, Math.min(100, (atk / scale) * 100))}%` }}
                  />
                </div>
                <span className="text-right font-mono text-12 font-semibold text-content">{atk}</span>
                <span className="text-right font-mono text-11 text-content-ghost">{res}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/*
        * Blunt / Pierce / Slash. Shown only when something grants one, because
        * unlike the elements these are all zero on most builds. Nothing but
        * equipment gives physical resistance, so an always-visible row of
        * zeroes would be noise.
        */}
      {Object.values(buildEvaluation.physicalResistance).some(value => value !== 0) && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Physical resistance</DeckLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(buildEvaluation.physicalResistance)
              .filter(([, value]) => value !== 0)
              .map(([type, value]) => <Chip key={type} label={type} value={`${value > 0 ? '+' : ''}${value}%`} />)}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <DeckLabel>Utility</DeckLabel>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Initiative" value={d.initiative} />
          <Chip label="Flanking" value={d.flanking} />
          <Chip label="Skill Pool" value={d.skillPool} />
          <Chip label="Youkai Cap" value={d.youkaiCap} />
          <Chip label="Battle Wt." value={`${d.equipmentLoad}/${d.battleWeight}`} />
          <Chip label="Encumbrance" value={`0/${d.encumbrance}`} />
        </div>
      </section>
    </>
  );
}
