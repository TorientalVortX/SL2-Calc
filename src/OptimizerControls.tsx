import { Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './design';
import { DeckLabel, DeckSection } from './CommandDeck';
import { metricKeys, metricLabels, type ItemLockMode } from './optimizerMetrics';
import { getBaseClass as baseClassLabel } from './domain/buildEvaluation';
import { buildSkillPools, skillPointBudget } from './domain/skills';
import { traitPointBudget } from './domain/traits';
import { FEATURES } from './featureFlags';
import type { OptimizerState } from './useOptimizer';
import type {
  AiOptimizationMode,
  BuildState,
  OptimizationDefensePlan,
  OptimizationExtraPackage,
  OptimizationMetric,
} from './types';

/*
 * Rail primitives.
 *
 * The engine controls used to be a full-width panel folded into a disclosure,
 * which fit the 268px rail badly. These are sized for it instead: 232px of usable
 * width, labels above controls, numerics right-aligned in a fixed 58px box.
 *
 * Per the style guide the optimizer carries no accent beyond the periwinkle
 * `info`; the AI section deliberately does *not* get its own hue.
 */

const CONTROL = cx(
  'w-full rounded-7 border border-edge bg-surface-bar px-2 py-1.5 text-12 text-content-bright',
  'transition-colors hover:border-edge-strong focus:border-edge-emphasis focus:outline-none',
  'disabled:cursor-not-allowed disabled:text-content-ghost',
);

/** Label above a control. Renders a `<label>` so the text names the field. */
function RailField({
  label,
  hint,
  children,
  className,
}: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <DeckLabel>{label}</DeckLabel>
      {children}
      {hint && <span className="text-10 leading-relaxed text-content-ghost">{hint}</span>}
    </label>
  );
}

function RailSelect({
  value,
  onChange,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select value={value} onChange={onChange} className={CONTROL} {...rest}>
      {children}
    </select>
  );
}

/** Label left, small numeric box right: the rail's compact numeric row. */
function RailNumber({
  label,
  value,
  onChange,
  min = 0,
  max,
}: { label: string; value: number; onChange: (next: number) => void; min?: number; max?: number }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 text-11 leading-tight text-content-muted">{label}</span>
      <input
        type="number"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={event => {
          const next = Number(event.target.value);
          onChange(Math.max(min, max === undefined ? next : Math.min(max, next)));
        }}
        className={cx(
          'w-[58px] shrink-0 rounded-6 border border-edge bg-surface-base px-1.5 py-1',
          'text-center font-mono text-12 text-content transition-colors',
          'hover:border-edge-strong focus:border-edge-emphasis focus:outline-none',
        )}
      />
    </label>
  );
}

function RailCheck({
  checked,
  onChange,
  disabled,
  children,
}: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={cx('flex items-start gap-2', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-info-solid"
      />
      <span className="text-11 leading-relaxed text-content-muted">{children}</span>
    </label>
  );
}

const ALL_ENGINES = [
  ['ai', 'AI planner', 'Terra / Sol with exact tools'],
  ['v2', 'V2 search', 'Pareto beam over equipment'],
  ['legacy', 'Legacy', 'Original comparison baseline'],
] as const;

const ENGINES = ALL_ENGINES.filter(([value]) => FEATURES.aiPlanner || value !== 'ai');

export interface OptimizerControlsProps {
  o: OptimizerState;
  build: BuildState;
}

/**
 * Engine, search scope, defence contract and hard minimums: the Optimizer tab's
 * left rail, below the goal list.
 *
 * The mockup shows none of this (its allocator is a simple greedy one), so the
 * *layout language* is borrowed rather than the content: micro-label sections,
 * neutral chrome, mono numerals.
 */
export default function OptimizerControls({ o, build }: OptimizerControlsProps) {
  const evadePlan = o.defensePlan === 'evade';
  const tankPlan = o.defensePlan === 'tank';
  // Contracting is a Summoner-tree activity, so the Youkai axis is only offered
  // to a build that has one: the same rule the Youkai screen itself uses.
  const isSummoner = baseClassLabel(build.mainClass) === 'Summoner' || baseClassLabel(build.subClass) === 'Summoner';
  // Two promotions of one base class reach three classes, not two: the shared
  // base has its own allowance.
  const skillPoolCount = buildSkillPools(build.mainClass, build.subClass).length;

  return (
    <div className="flex flex-col gap-[18px]" aria-labelledby="optimizer-title">
      <div className="flex flex-col gap-1 border-t border-edge-subtle pt-4">
        <DeckLabel className="text-content-secondary">
          <span id="optimizer-title">Engine</span>
        </DeckLabel>
        <p className="text-10 leading-relaxed text-content-ghost">
          Fixed: {build.race} / {build.subrace} · main class {build.mainClass} · level {build.characterLevel}.
          The {FEATURES.aiPlanner ? 'planner' : 'search'} proposes; the calculator enforces stats, locks and point limits.
        </p>
      </div>

      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Optimizer engine">
        {ENGINES.map(([value, label, description]) => {
          const selected = o.engine === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => o.setEngine(value)}
              className={cx(
                'flex flex-col gap-0.5 rounded-8 border px-2.5 py-2 text-left transition-colors',
                selected ? 'border-info bg-info-bg/40' : 'border-edge bg-surface-bar hover:border-edge-emphasis',
              )}
            >
              <span className={cx('text-12 font-semibold', selected ? 'text-content' : 'text-content-bright')}>
                {label}
              </span>
              <span className="text-10 leading-relaxed text-content-faint">{description}</span>
            </button>
          );
        })}
      </div>

      {FEATURES.aiPlanner && o.engine === 'ai' && (
        <DeckSection label="Brief">
          <textarea
            value={o.intent}
            onChange={event => o.setIntent(event.target.value)}
            rows={4}
            aria-label="Describe the build you want"
            placeholder="A durable Ghost build that crits without losing accuracy…"
            className={cx(CONTROL, 'resize-y leading-relaxed')}
          />
          <RailField label="Depth">
            <RailSelect value={o.aiMode} onChange={event => o.setAiMode(event.target.value as AiOptimizationMode)}>
              <option value="standard">Standard · Terra</option>
              <option value="deep">Deep · Sol</option>
            </RailSelect>
          </RailField>
          <p className={cx('text-10 leading-relaxed', o.aiHealth?.keyConfigured ? 'text-positive' : 'text-caution')}>
            {o.aiHealth
              ? o.aiHealth.keyConfigured
                ? `Service ready · ${o.aiMode === 'deep' ? o.aiHealth.deepModel : o.aiHealth.standardModel}`
                : 'Service ready · API key missing, V2 fallback active'
              : 'Local AI service not detected · browser fallback active'}
          </p>
          {o.previousResponseId && (
            <p className="text-10 text-content-faint">Follow-up context active.</p>
          )}
        </DeckSection>
      )}

      <DeckSection label="Search scope">
        <RailCheck checked={o.searchClasses} onChange={o.setSearchClasses}>
          Search secondary classes
        </RailCheck>

        <RailCheck checked={o.searchMainClass} onChange={o.setSearchMainClass}>
          Search the main class too
          <span className="mt-0.5 block text-10 text-content-ghost">
            {o.searchMainClass
              ? 'Both slots are chosen together as a pair.'
              : `Main class stays ${build.mainClass}.`}
          </span>
        </RailCheck>

        {build.destiny && (
          <p className="text-10 leading-relaxed text-content-ghost">
            Destiny is on, so both slots are confined to the {baseClassLabel(build.mainClass)} tree.
          </p>
        )}

        <RailField label="Weapon">
          <RailSelect value={o.weaponLockMode} onChange={event => o.setWeaponLockMode(event.target.value as ItemLockMode)}>
            <option value="all">All canonical weapons</option>
            <option value="current" disabled={!build.equipment.primaryWeapon?.selectedWeaponName}>Lock current weapon</option>
            <option value="type" disabled={!build.equipment.primaryWeapon}>Lock current type</option>
          </RailSelect>
        </RailField>

        <RailField label="Torso">
          <RailSelect value={o.armorLockMode} onChange={event => o.setArmorLockMode(event.target.value as ItemLockMode)}>
            <option value="all">All torso armor</option>
            <option value="current" disabled={!build.equipment.armorName}>Lock current torso</option>
            <option value="type" disabled={!build.equipment.armorName}>Lock current type</option>
          </RailSelect>
        </RailField>

      </DeckSection>

      <DeckSection label="Chosen content">
        <p className="text-10 leading-relaxed text-content-ghost">
          Off by default: each of these replaces picks you made by hand on another screen.
        </p>

        <RailCheck checked={o.searchTraits} onChange={o.setSearchTraits}>
          Choose traits
          <span className="mt-0.5 block text-10 text-content-ghost">
            {traitPointBudget(build.characterLevel)} points. Only the handful of traits the wiki
            states as a flat stat bonus can be scored; the rest are prose.
          </span>
        </RailCheck>

        <RailCheck checked={o.searchSkills} onChange={o.setSearchSkills}>
          Choose skill ranks
          <span className="mt-0.5 block text-10 text-content-ghost">
            {skillPointBudget(build.destiny)} base points, plus Human and class-trait bonuses, in each of the {skillPoolCount} classes this
            build reaches{build.destiny ? ', under Destiny' : ''}, and they do not pool. Scores a skill
            through its stat bonuses and its damage formula, so skills the wiki writes as
            &ldquo;based on Rank&rdquo; cannot be valued.
          </span>
        </RailCheck>

        <RailCheck checked={o.searchYoukai} onChange={o.setSearchYoukai} disabled={!isSummoner}>
          Choose Youkai and Install
          <span className="mt-0.5 block text-10 text-content-ghost">
            {!isSummoner
              ? 'Needs a Summoner class in one of the two slots.'
              : o.searchSkills
                ? 'Contracts up to your Youkai cap, and weighs Install, which replaces your racial stat line.'
                : 'Contracts up to your Youkai cap. Install also needs a rank in the Install skill, so enable skill ranks above unless you already have one.'}
          </span>
        </RailCheck>
      </DeckSection>

      <DeckSection label="Defence contract">
        <p className="text-10 leading-relaxed text-content-ghost">
          Checked against reliable conditions before damage or utility can win the ranking.
        </p>

        <RailField label="Plan">
          <RailSelect value={o.defensePlan} onChange={event => o.setDefensePlan(event.target.value as OptimizationDefensePlan)}>
            <option value="auto">Infer from request</option>
            <option value="tank">Tank / non-evade</option>
            <option value="evade">Evade</option>
            <option value="bruiser">Bruiser</option>
            <option value="hybrid">Hybrid</option>
            <option value="glass">Intentional glass</option>
          </RailSelect>
        </RailField>

        <RailField label="Extra stats">
          <RailSelect value={o.extraPackage} onChange={event => o.setExtraPackage(event.target.value as OptimizationExtraPackage)}>
            <option value="auto">Infer from request</option>
            <option value="critical">Critical</option>
            <option value="faith">Faith</option>
            <option value="sanctity">Sanctity</option>
            <option value="none">None</option>
          </RailSelect>
        </RailField>

        <div className="flex flex-col gap-1.5">
          {evadePlan && (
            <>
              <RailNumber label="Minimum reliable Evade" value={o.minimumEvade} onChange={o.setMinimumEvade} />
              <RailNumber label="Preferred Evade" value={o.preferredEvade} onChange={o.setPreferredEvade} min={o.minimumEvade} />
              <RailNumber label="Reliable bonus Evade" value={o.reliableBonusEvade} onChange={o.setReliableBonusEvade} max={50} />
            </>
          )}
          {tankPlan && (
            <>
              <RailNumber label="Minimum scaled DEF" value={o.minimumDefense} onChange={o.setMinimumDefense} />
              <RailNumber label="Minimum scaled RES" value={o.minimumResistance} onChange={o.setMinimumResistance} />
            </>
          )}
          <RailNumber label="Minimum torso Armor" value={o.minimumArmor} onChange={o.setMinimumArmor} />
          <RailNumber label="Minimum Magic Armor" value={o.minimumMagicArmor} onChange={o.setMinimumMagicArmor} />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <RailCheck checked={o.requirePartialBattleWeight} onChange={o.setRequirePartialBattleWeight}>
            Require weapon + torso within Battle Weight
          </RailCheck>
          <RailCheck
            checked={o.useVerifiedArmorConditionals}
            disabled={o.armorLockMode !== 'current'}
            onChange={o.setUseVerifiedArmorConditionals}
          >
            Use verified conditionals on the locked torso
          </RailCheck>
        </div>
      </DeckSection>

      <DeckSection
        label="Hard minimums"
        trailing={
          <button
            type="button"
            onClick={o.addConstraint}
            className="flex items-center gap-1 rounded-6 px-1.5 py-0.5 text-10 text-content-ghost transition-colors hover:bg-surface-raised hover:text-content-secondary"
          >
            <Plus size={11} aria-hidden="true" /> Add
          </button>
        }
      >
        <p className="text-10 leading-relaxed text-content-ghost">
          These override soft guide and profile preferences.
        </p>
        {o.constraints.length === 0 ? (
          <p className="text-11 text-content-faint">None set.</p>
        ) : (
          o.constraints.map((constraint, index) => (
            <div key={`${constraint.metric}-${index}`} className="flex flex-col gap-1.5 rounded-8 border border-edge-muted bg-surface-bar p-2">
              <RailSelect
                aria-label={`Hard minimum ${index + 1} metric`}
                value={constraint.metric}
                onChange={event => o.setConstraints(items => items.map((item, i) =>
                  i === index ? { ...item, metric: event.target.value as OptimizationMetric } : item))}
              >
                {metricKeys.map(metric => <option key={metric} value={metric}>{metricLabels[metric]}</option>)}
              </RailSelect>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  aria-label={`Minimum ${metricLabels[constraint.metric]}`}
                  value={constraint.minimum}
                  onChange={event => o.setConstraints(items => items.map((item, i) =>
                    i === index ? { ...item, minimum: Number(event.target.value) } : item))}
                  className={cx(
                    'min-w-0 flex-1 rounded-6 border border-edge bg-surface-base px-1.5 py-1',
                    'text-center font-mono text-12 text-content transition-colors',
                    'hover:border-edge-strong focus:border-edge-emphasis focus:outline-none',
                  )}
                />
                <button
                  type="button"
                  aria-label={`Remove ${metricLabels[constraint.metric]} minimum`}
                  onClick={() => o.setConstraints(items => items.filter((_, i) => i !== index))}
                  className="rounded-6 p-1 text-content-ghost transition-colors hover:bg-surface-raised hover:text-negative"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </DeckSection>

      <DeckSection>
        <RailField
          label="Reference evidence"
          hint="Used only as a tie-break. It never overrides a mathematically stronger candidate, and unselected references do not bias the search."
        >
          <RailSelect
            aria-label="Reference evidence"
            value={o.referenceProfileId}
            onChange={event => o.setReferenceProfileId(event.target.value)}
          >
            <option value="">None</option>
            {o.applicableProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </RailSelect>
        </RailField>

        {o.selectedReferenceProfile && (
          <div className="flex flex-col gap-1.5 rounded-8 border border-edge-muted bg-surface-bar p-2.5">
            <span className="text-12 font-semibold text-content-bright">{o.selectedReferenceProfile.archetype}</span>
            <span className="text-10 leading-relaxed text-content-faint">
              {o.selectedReferenceProfile.name} · {o.selectedReferenceProfile.weapon.name} → {o.selectedReferenceProfile.weapon.effectiveType}
            </span>
            <div className="flex flex-wrap gap-1">
              {o.selectedReferenceProfile.priorityStats.map(stat => (
                <span key={stat} className="flex items-baseline gap-1 rounded-6 bg-surface-base px-1.5 py-0.5">
                  <span className="text-9 font-medium text-content-faint">{stat.toUpperCase()}</span>
                  <span className="font-mono text-10 font-semibold text-content-secondary">
                    {o.selectedReferenceProfile?.scaledStatTargets[stat]}
                  </span>
                </span>
              ))}
            </div>
            {o.selectedReferenceProfile.dataGaps?.map(gap => (
              <p key={gap} className="text-10 leading-relaxed text-caution">{gap}</p>
            ))}
          </div>
        )}
      </DeckSection>
    </div>
  );
}
