import { useState } from 'react';
import { PHYSICAL_KEYS } from '../../types';
import { ELEMENT_KEYS } from '../../domain/buildEvaluation';
import { NO_HIT, guardedEvade, incomingDamage, type DamageClass, type DamageType, type IncomingHit } from '../../domain/damage';
import { Modal } from '../ui/Modal';
import { SectionHead } from '../ui/Panel';
import { NumberField, SelectField, Stepper, Toggle } from '../ui/controls';
import type { Builder } from '../state/useBuilder';

const CLASS_OPTIONS: Array<{ value: DamageClass; label: string }> = [
  { value: 'physical', label: 'Physical' },
  { value: 'magical', label: 'Magical' },
  { value: 'protection-ignoring', label: 'Protection-ignoring' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'None' },
  ...PHYSICAL_KEYS.map(type => ({ value: type, label: type })),
  ...ELEMENT_KEYS.map(element => ({ value: element, label: element })),
];

function stepValue(factor?: number, flat?: number): string {
  if (flat !== undefined) return `−${flat}`;
  return factor === undefined ? '' : `×${factor.toFixed(2)}`;
}

export function DamageDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
  const { evaluation } = builder;
  const [hit, setHit] = useState<IncomingHit>(NO_HIT);
  const set = (patch: Partial<IncomingHit>) => setHit(current => ({ ...current, ...patch }));

  const { steps, instances, taken } = incomingDamage(hit, evaluation);
  const maxHP = evaluation.derived.maxHP;
  const armorName = hit.damageClass === 'magical' ? 'Magic Armor' : 'Armor';
  const attacksToDown = taken > 0 ? Math.ceil(maxHP / taken) : null;

  return (
    <Modal title="Incoming damage" onClose={onClose}>
      <div className="grid-fields">
        <NumberField label="Damage per hit" value={hit.amount} max={99999} onChange={amount => set({ amount })} />
        <SelectField
          label="Class"
          value={hit.damageClass}
          options={CLASS_OPTIONS}
          onChange={value => set({ damageClass: value as DamageClass })}
        />
        <SelectField
          label="Type"
          value={hit.type ?? ''}
          options={TYPE_OPTIONS}
          onChange={value => set({ type: (value || null) as DamageType })}
        />
        <NumberField
          label="Other reduction %"
          value={hit.otherReductionPercent}
          max={100}
          onChange={otherReductionPercent => set({ otherReductionPercent })}
        />
      </div>

      <div className="inline" style={{ gap: 12, flexWrap: 'wrap', margin: '10px 0' }}>
        <Toggle on={hit.critical} onChange={critical => set({ critical })}>Critical</Toggle>
        {hit.critical ? (
          <NumberField
            label="Crit damage %"
            value={hit.critDamagePercent}
            min={100}
            max={1000}
            onChange={critDamagePercent => set({ critDamagePercent })}
          />
        ) : null}
        <Toggle on={hit.armorIgnoring} onChange={armorIgnoring => set({ armorIgnoring })}>Ignores Armor</Toggle>
        <span className="inline" style={{ gap: 6 }}>
          <span className="field__label">Hits</span>
          <Stepper label="Hits" value={hit.hits} min={1} max={20} onChange={hits => set({ hits })} />
        </span>
        <span className="inline" style={{ gap: 6 }}>
          <span className="field__label">Guard Momentum</span>
          <Stepper label="Guard Momentum" value={hit.guardMomentum} min={0} max={10} onChange={guardMomentum => set({ guardMomentum })} />
        </span>
      </div>

      <div className="figures">
        <div className="figure figure--static is-active">
          <span className="eyebrow">Taken</span>
          <span className="figure__value">{taken}</span>
          <span className="figure__note">{maxHP - taken} of {maxHP} HP left</span>
        </div>
        <div className="figure figure--static">
          <span className="eyebrow">Attacks to down</span>
          <span className="figure__value">{attacksToDown ?? '–'}</span>
          {hit.guardMomentum > 0 ? (
            <span className="figure__note">Evade while guarding: {guardedEvade(evaluation.derived.evade, hit.guardMomentum)}</span>
          ) : null}
        </div>
      </div>

      <div className="section">
        <SectionHead>Steps</SectionHead>
        {steps.map(step => (
          <div className="provenance__row" key={step.label}>
            <span>{step.label} <span className="dim">{stepValue(step.factor, step.flat)}</span></span>
            <span>{Math.round(step.total * 10) / 10}</span>
          </div>
        ))}
        {instances.length > 1 ? instances.map((instance, index) => (
          <div className="provenance__row" key={index}>
            <span>Hit {index + 1} <span className="dim">{instance.absorbed ? `−${Math.round(instance.absorbed * 10) / 10} ${armorName}` : `${armorName} spent`}</span></span>
            <span>{instance.taken}</span>
          </div>
        )) : null}
        <p className="hint" style={{ marginTop: 8 }}>
          Percentage reductions multiply together, then Armor or Magic Armor is subtracted. Armor is one pool per attack, used up hit by hit. Each hit is rounded down.
        </p>
      </div>
    </Modal>
  );
}
