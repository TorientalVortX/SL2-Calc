import { PHYSICAL_KEYS } from '../../../types';
import { ELEMENT_KEYS } from '../../../domain/buildEvaluation';
import type { DamageClass, DamageInstance, DamageStep, HitOutcome, HitResult, IncomingHit } from '../../../domain/damage';
import { SectionHead } from '../../ui/Panel';
import { SelectField } from '../../ui/controls';

export const CLASS_OPTIONS: Array<{ value: DamageClass; label: string }> = [
  { value: 'physical', label: 'Physical' },
  { value: 'magical', label: 'Magical' },
  { value: 'protection-ignoring', label: 'Protection-ignoring' },
];

export const TYPE_OPTIONS = [
  { value: '', label: 'None' },
  ...PHYSICAL_KEYS.map(type => ({ value: type, label: type })),
  ...ELEMENT_KEYS.map(element => ({ value: element, label: element })),
];

const RESULT_OPTIONS: Array<{ value: HitResult; label: string }> = [
  { value: 'hit', label: 'Landed' },
  { value: 'glance', label: 'Glancing' },
  { value: 'evaded', label: 'Evaded' },
];

export const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;
export const tenth = (value: number) => Math.round(value * 10) / 10;

export function outcomesFor(hit: IncomingHit): HitOutcome[] {
  return Array.from({ length: hit.hits }, (_, index): HitOutcome => hit.outcomes[index] ?? { result: 'hit', parried: false, critical: false });
}

function OutcomeCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="hint" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function OutcomeGrid({ hit, onChange, parry }: { hit: IncomingHit; onChange: (outcomes: HitOutcome[]) => void; parry: boolean }) {
  const outcomes = outcomesFor(hit);
  const update = (index: number, patch: Partial<HitOutcome>) =>
    onChange(outcomes.map((outcome, at) => (at === index ? { ...outcome, ...patch } : outcome)));
  return (
    <div className="section">
      <SectionHead>Outcome</SectionHead>
      <div className="grid-fields">
        {outcomes.map((outcome, index) => (
          <div key={index}>
            <SelectField
              label={`Hit ${index + 1}`}
              value={outcome.result}
              options={RESULT_OPTIONS}
              onChange={value => update(index, { result: value as HitResult })}
            />
            {outcome.result !== 'evaded' ? (
              <div className="inline" style={{ gap: 10, flexWrap: 'nowrap', marginTop: 4 }}>
                <OutcomeCheck label="Crit" checked={outcome.critical} onChange={critical => update(index, { critical })} />
                {parry ? <OutcomeCheck label="Parried" checked={outcome.parried} onChange={parried => update(index, { parried })} /> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function stepValue(factor?: number, flat?: number): string {
  if (flat !== undefined) return `−${tenth(flat)}`;
  return factor === undefined ? '' : `×${factor.toFixed(2)}`;
}

function instanceNote(instance: DamageInstance, armorName: string): string {
  if (instance.result === 'evaded') return 'evaded';
  const parts = [instance.critical ? 'critical' : '', instance.result === 'glance' ? 'glancing' : '', instance.parried ? 'parried' : '',
    instance.absorbed ? `−${tenth(instance.absorbed)} ${armorName}` : `${armorName} spent`];
  return parts.filter(Boolean).join(', ');
}

export function StepRows({ steps, instances, damageClass, label = 'Hit', start }: {
  steps: DamageStep[];
  instances: DamageInstance[];
  damageClass: DamageClass;
  label?: string;
  /** Renames the first step, which `incomingDamage` calls "Incoming". */
  start?: string;
}) {
  const armorName = damageClass === 'magical' ? 'Magic Armor' : 'Armor';
  return (
    <>
      {steps.map((step, index) => (
        <div className="provenance__row" key={step.label}>
          <span>{index === 0 && start ? start : step.label} <span className="dim">{stepValue(step.factor, step.flat)}</span></span>
          <span>{tenth(step.total)}</span>
        </div>
      ))}
      {instances.length > 1 || instances[0].result === 'evaded' ? instances.map((instance, index) => (
        <div className="provenance__row" key={index}>
          <span>{label} {index + 1} <span className="dim">{instanceNote(instance, armorName)}</span></span>
          <span>{instance.taken}</span>
        </div>
      )) : null}
    </>
  );
}

export const STEPS_HINT = 'Percentage reductions, crits, glancing (−60%) and parries multiply together, then Armor or Magic Armor is subtracted. Armor is one pool per attack, used up hit by hit. Each hit is rounded down.';
