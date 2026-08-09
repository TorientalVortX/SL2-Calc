import { AlertTriangle, CheckCircle2, Play, ShieldCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { STAT_KEYS, metricValue } from './domain/buildEvaluation';
import { STAT_COLORS, onDark } from './data/colors';
import { cx } from './design';
import { DeckLabel, DeckSection } from './CommandDeck';
import { metricLabels } from './optimizerMetrics';
import type { OptimizerState } from './useOptimizer';
import { OPTIMIZATION_PRESETS } from './utilities/StatOptimizer';
import type { BuildEvaluation, BuildState, OptimizationCandidate, OptimizationMetric, StatKey } from './types';

/** Headline numbers shown as chips on each candidate card, per the mockup. */
const CHIP_METRICS = [
  ['Power', 'weaponPower'],
  ['Crit', 'weaponCritical'],
  ['Hit', 'weaponHit'],
  ['HP', 'maxHP'],
  ['Evade', 'evade'],
] as const;

/**
 * The headline number on each card is the *goal metric's* value, not the engine's
 * internal score — in the mockup "#1 67" matches that card's own "Power 67" chip.
 * The goal metric is whichever the selected preset weights most heavily.
 */
function goalMetricOf(presetId: string): OptimizationMetric {
  const weights = OPTIMIZATION_PRESETS[presetId]?.metricWeights ?? {};
  let best: OptimizationMetric = 'weaponPower';
  let bestWeight = -Infinity;
  for (const [metric, weight] of Object.entries(weights)) {
    if ((weight ?? 0) > bestWeight) { bestWeight = weight ?? 0; best = metric as OptimizationMetric; }
  }
  return best;
}

/** Scale the delta bars against the highest scaled stat in play. */
function barScale(evaluation: BuildEvaluation, proposed?: BuildEvaluation): number {
  const values = STAT_KEYS.flatMap(s => [
    evaluation.scaledStats[s] ?? 0,
    proposed?.scaledStats[s] ?? 0,
  ]);
  return Math.max(40, ...values);
}

/**
 * A bordered detail block. `tone` tints only the border and the icon — per the
 * style guide the optimizer carries no accent hue beyond the periwinkle `info`,
 * so semantic colour here is limited to pass/fail signalling.
 */
function DetailCard({
  title,
  tone = 'neutral',
  icon,
  children,
}: { title: ReactNode; tone?: 'neutral' | 'positive' | 'caution' | 'negative'; icon?: ReactNode; children: ReactNode }) {
  const border = {
    neutral: 'border-edge-muted',
    positive: 'border-positive/40',
    caution: 'border-caution/40',
    negative: 'border-negative/40',
  }[tone];
  return (
    <div className={cx('flex flex-col gap-2 rounded-9 border bg-surface-bar p-3', border)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <DeckLabel>{title}</DeckLabel>
      </div>
      {children}
    </div>
  );
}

/** Label + value, the design's metric chip. */
function Chip({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <span className="flex items-baseline gap-1.5 rounded-6 bg-surface-base px-2 py-1">
      <span className="text-10 font-medium text-content-faint">{label}</span>
      <span className="font-mono text-11 font-semibold text-content-secondary">{value}</span>
    </span>
  );
}

/** A labelled readout used for the equipment row. */
function Slot({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-8 border border-edge-muted bg-surface-bar px-2.5 py-2">
      <DeckLabel>{label}</DeckLabel>
      <span className="text-12 font-semibold text-content-bright">{value}</span>
    </div>
  );
}

export interface OptimizerResultsProps {
  o: OptimizerState;
  build: BuildState;
  currentEvaluation: BuildEvaluation;
  onApply: (candidate: OptimizationCandidate) => void;
  canUndo: boolean;
  onUndo: () => void;
}

/**
 * Ranked allocations and the current-vs-proposed comparison — the Optimizer
 * tab's centre column, laid out to the mockup.
 */
export default function OptimizerResults({
  o,
  build,
  currentEvaluation,
  onApply,
  canUndo,
  onUndo,
}: OptimizerResultsProps) {
  const candidates = o.result?.candidates ?? [];
  const picked = candidates[o.selectedIndex];
  const pickName = picked
    ? o.selectedIndex === 0 ? 'primary allocation' : `alternative ${o.selectedIndex}`
    : 'selection';
  const scale = barScale(currentEvaluation, picked?.evaluation);
  const goalMetric = goalMetricOf(o.presetId);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={o.running ? o.cancel : o.run}
          className={cx(
            'flex items-center gap-2 rounded-8 px-4 py-2.5 text-13 font-semibold text-content transition-colors',
            o.running ? 'bg-negative-solid hover:bg-negative-hover' : 'bg-info-bg hover:bg-info-edge',
          )}
        >
          {o.running
            ? <><X size={16} /> Cancel</>
            : <><Play size={16} /> Run {o.engine === 'v2' ? 'V2' : 'legacy'} optimizer</>}
        </button>
        {o.progress && (
          <span className="font-mono text-11 text-content-faint">
            {o.progress.message}{o.progress.total > 1 ? ` · ${o.progress.completed}/${o.progress.total}` : ''}
          </span>
        )}
        {o.error && <span role="alert" className="text-11 text-caution-soft">{o.error}</span>}
        {canUndo && (
          <button type="button" onClick={onUndo} className="ml-auto rounded-7 border border-edge px-3 py-2 text-12 text-content-muted hover:border-edge-emphasis">
            Undo optimizer
          </button>
        )}
      </div>

      {/* Ranked allocations */}
      <section className="flex flex-col gap-2.5">
        <DeckLabel>Ranked allocations</DeckLabel>
        {candidates.length === 0 ? (
          <p className="rounded-11 border border-edge bg-surface-bar p-4 text-12 text-content-faint">
            Run the optimizer to see ranked allocations for the selected goal.
          </p>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-3">
            {candidates.map((candidate, index) => {
              const selected = index === o.selectedIndex;
              return (
                <div
                  key={candidate.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => o.setSelectedIndex(index)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.setSelectedIndex(index); } }}
                  className={cx(
                    'flex cursor-pointer flex-col gap-2.5 rounded-11 border p-3.5 transition-colors',
                    selected ? 'border-info bg-info-bg/30' : 'border-edge bg-surface-bar hover:border-edge-emphasis',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-11 font-bold text-info">#{index + 1}</span>
                    <span className="font-mono text-20 font-bold tracking-tight-value text-content">
                      {Math.round(metricValue(candidate.evaluation, goalMetric))}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-13 font-semibold leading-tight text-content-bright">
                      {candidate.patch.mainClass} / {candidate.patch.subClass}
                    </span>
                    <span className="text-11 leading-relaxed text-content-faint">
                      {candidate.reasoning[0] ?? (candidate.feasible ? 'Meets all hard constraints.' : 'Closest feasible allocation.')}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {CHIP_METRICS.map(([label, metric]) => (
                      <span key={label} className="flex items-baseline gap-1.5 rounded-6 bg-surface-base px-1.5 py-1">
                        <span className="text-10 font-medium text-content-faint">{label}</span>
                        <span className="font-mono text-11 font-semibold text-content-secondary">
                          {Math.round(metricValue(candidate.evaluation, metric))}
                        </span>
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onApply(candidate); }}
                    className="rounded-8 bg-info-bg py-2 text-center text-12 font-semibold text-content transition-colors hover:bg-info-edge"
                  >
                    Apply
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {picked && (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {picked.feasible
              ? <CheckCircle2 size={15} className="text-positive" aria-hidden="true" />
              : <AlertTriangle size={15} className="text-caution" aria-hidden="true" />}
            <span className="text-13 font-semibold text-content-bright">
              {picked.feasible ? 'Validated candidate' : 'Closest constrained candidate'}
            </span>
            <span className="font-mono text-11 text-content-faint">
              {picked.confidence ? `${picked.confidence} confidence · ` : ''}
              {o.result?.engine ?? 'legacy'} engine · {Math.round(o.result?.durationMs ?? 0)} ms
            </span>
          </div>

          {!picked.feasible && Object.keys(picked.constraintDeficits).length > 0 && (
            <DetailCard title="Unmet hard minimums" tone="caution">
              {Object.entries(picked.constraintDeficits).map(([metric, deficit]) => (
                <p key={metric} className="text-12 text-caution">
                  {metricLabels[metric as OptimizationMetric]} is short by {Number(deficit).toFixed(1)}.
                </p>
              ))}
            </DetailCard>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <Slot label="Classes" value={`${picked.patch.mainClass} / ${picked.patch.subClass}`} />
            <Slot
              label="Primary weapon"
              value={picked.patch.equipment?.primaryWeapon?.selectedWeaponName
                ?? build.equipment.primaryWeapon?.selectedWeaponName ?? 'None'}
            />
            <Slot label="Torso" value={picked.patch.equipment?.armorName ?? build.equipment.armorName ?? 'None'} />
          </div>
        </div>
      )}

      {/* Current build vs selection */}
      {picked && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <DeckLabel>Current build vs {pickName}</DeckLabel>
            <span className="font-condensed text-10 font-medium uppercase tracking-tag text-content-ghost">
              Invested · Scaled
            </span>
          </div>

          <div className="grid gap-x-7 md:grid-cols-2">
            {STAT_KEYS.map(stat => {
              const key = stat as StatKey;
              const fromInv = build.addedStats[key];
              const toInv = picked.patch.addedStats[key];
              const fromScaled = Math.floor(currentEvaluation.scaledStats[key]);
              const toScaled = Math.floor(picked.evaluation.scaledStats[key]);
              const delta = toInv - fromInv;
              const colour = STAT_COLORS[key] === 'rainbow' ? '#e6ebf5' : onDark(STAT_COLORS[key]);
              const pct = (v: number) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;

              return (
                <div
                  key={key}
                  className="grid grid-cols-[46px_1fr_78px_52px_82px] items-center gap-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-[3px] rounded-2" style={{ background: colour }} />
                    <span className="text-12 font-semibold text-content-secondary">{key.toUpperCase()}</span>
                  </div>

                  <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-control">
                    <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ background: colour, width: pct(toScaled) }} />
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ background: colour, width: pct(fromScaled) }} />
                  </div>

                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="font-mono text-12 font-medium text-content-ghost">{fromInv}</span>
                    <span className="text-10 text-edge-strong">→</span>
                    <span className="font-mono text-13 font-bold text-content">{toInv}</span>
                  </div>

                  <span className={cx(
                    'text-right font-mono text-12 font-semibold',
                    delta > 0 ? 'text-positive' : delta < 0 ? 'text-negative' : 'text-content-ghost',
                  )}>
                    {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                  </span>

                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="font-mono text-11 text-content-ghost">{fromScaled}</span>
                    <span className="text-10 text-edge-strong">→</span>
                    <span className="font-mono text-12 font-semibold text-content-secondary">{toScaled}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onApply(picked)}
            className="self-start rounded-8 bg-info-bg px-4 py-3 text-13 font-semibold text-content transition-colors hover:bg-info-edge"
          >
            Apply {pickName} to the build
          </button>
        </section>
      )}

      {picked && (
        <DeckSection label="Why this allocation">
          {picked.objectives && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(picked.objectives).map(([name, value]) => (
                <div key={name} className="flex flex-col gap-1.5 rounded-8 border border-edge-muted bg-surface-bar px-2.5 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-10 capitalize text-content-faint">{name.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-mono text-11 font-semibold text-content-secondary">{Math.round(value * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-control">
                    <div
                      className="h-full rounded-full bg-info-solid"
                      style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {picked.damageReport && (
            <DetailCard title="Requested attack formulas">
              <div className="grid gap-2 md:grid-cols-2">
                {picked.damageReport.skills.map((skill, index) => (
                  <div key={`${skill.label}-${index}`} className="rounded-8 bg-surface-base p-2">
                    <span className="text-12 font-semibold text-content-bright">{skill.label}</span>
                    <p className="mt-0.5 text-11 leading-relaxed text-content-muted">
                      {skill.swaPercent}% SWA ({skill.weaponPowerContribution.toFixed(1)})
                      {skill.element ? ` + ${skill.elementalAttackPercent}% ${skill.element} ATK ${skill.elementalAttack} (${skill.elementalContribution.toFixed(1)})` : ''}
                      {' = '}
                      <span className="font-mono font-semibold text-content">{skill.modeledTotal.toFixed(1)}</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-10 leading-relaxed text-content-ghost">
                Weighted coefficient score {picked.damageReport.weightedScore.toFixed(1)}. {picked.damageReport.caveat}
              </p>
            </DetailCard>
          )}

          {picked.aptitudeReport && (
            <DetailCard
              title="APT breakpoint efficiency"
              tone={picked.aptitudeReport.efficientBreakpoint ? 'neutral' : 'caution'}
            >
              <p className="text-12 leading-relaxed text-content-secondary">{picked.aptitudeReport.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="Global bonus" value={`+${picked.aptitudeReport.globalStatBonus}`} />
                <Chip label="Invested" value={picked.aptitudeReport.investedPoints} />
                <Chip label="Stranded" value={picked.aptitudeReport.redundantInvestedPoints} />
                <Chip label="Next breakpoint" value={picked.aptitudeReport.pointsToNextBonus ?? 'unreachable'} />
                {picked.aptitudeReport.nextBreakpointRawStatGain !== null && (
                  <Chip label="Raw return" value={`+${picked.aptitudeReport.nextBreakpointRawStatGain}`} />
                )}
                {picked.aptitudeReport.nextBreakpointScaledStatGain !== null && (
                  <Chip label="Scaled return" value={`+${picked.aptitudeReport.nextBreakpointScaledStatGain.toFixed(2)}`} />
                )}
              </div>
            </DetailCard>
          )}

          {picked.defenseScenario && (
            <DetailCard
              title="Reliable defense scenario"
              tone={picked.defenseScenario.meetsMinimum ? 'positive' : 'negative'}
            >
              <div className="flex flex-wrap gap-1.5">
                <Chip label="Evade" value={Math.floor(picked.defenseScenario.reliableEvade)} />
                <Chip label="Baseline" value={Math.floor(picked.defenseScenario.baselineEvade)} />
                <Chip label="DEF / RES" value={`${Math.floor(picked.defenseScenario.scaledDefense)} / ${Math.floor(picked.defenseScenario.scaledResistance)}`} />
                <Chip label="Armor / M.Armor" value={`${picked.defenseScenario.armor} / ${picked.defenseScenario.magicArmor}`} />
                <Chip label="Armor Evade" value={`${picked.defenseScenario.armorEvade >= 0 ? '+' : ''}${picked.defenseScenario.armorEvade}`} />
                <Chip label="Partial load" value={`${picked.defenseScenario.equipmentLoad} / ${picked.defenseScenario.battleWeightCapacity}`} />
              </div>
              {picked.defenseScenario.failures.map(failure => (
                <p key={failure} className="text-11 text-negative">{failure}</p>
              ))}
              {picked.defenseScenario.assumptions.map(assumption => (
                <p key={assumption} className="text-10 leading-relaxed text-content-ghost">{assumption}</p>
              ))}
            </DetailCard>
          )}

          <div className="grid gap-2 lg:grid-cols-2">
            <DetailCard title="Reasoning and evidence">
              <ul className="list-disc pl-4 text-12 leading-relaxed text-content-secondary">
                {picked.reasoning.map(reason => <li key={reason}>{reason}</li>)}
              </ul>
              {picked.evidence?.map(item => (
                <p key={item} className="text-10 leading-relaxed text-content-faint">Evidence: {item}</p>
              ))}
            </DetailCard>
            <DetailCard title="Tradeoffs and verification">
              {picked.tradeoffs?.map(item => (
                <p key={item} className="text-12 leading-relaxed text-caution">{item}</p>
              ))}
              {picked.warnings.map(warning => (
                <p key={warning} className="text-12 leading-relaxed text-content-muted">{warning}</p>
              ))}
              {!picked.tradeoffs?.length && !picked.warnings.length && (
                <p className="text-12 text-content-faint">None reported.</p>
              )}
            </DetailCard>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-content-faint" aria-hidden="true" />
            <span className="text-11 text-content-faint">
              Validation · {picked.guideValidation.passed} pass · {picked.guideValidation.failed} fail
              · {picked.guideValidation.requiresVerification} require verification.
            </span>
          </div>
        </DeckSection>
      )}
    </div>
  );
}
