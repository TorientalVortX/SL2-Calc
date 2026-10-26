import { useState } from 'react';
import { PHYSICAL_KEYS } from '../../types';
import { ELEMENT_KEYS } from '../../domain/buildEvaluation';
import {
  NO_HIT, expectedDamage, guardedEvade, incomingDamage,
  type DamageClass, type DamageInstance, type DamageType, type HitResult, type IncomingHit,
} from '../../domain/damage';
import { parryChanceBonuses, parryOptions } from '../../domain/parry';
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

const RESULT_OPTIONS: Array<{ value: HitResult; label: string }> = [
  { value: 'hit', label: 'Landed' },
  { value: 'glance', label: 'Glancing' },
  { value: 'evaded', label: 'Evaded' },
];

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;

function stepValue(factor?: number, flat?: number): string {
  if (flat !== undefined) return `−${Math.round(flat * 10) / 10}`;
  return factor === undefined ? '' : `×${factor.toFixed(2)}`;
}

function instanceNote(instance: DamageInstance, armorName: string): string {
  if (instance.result === 'evaded') return 'evaded';
  const parts = [instance.result === 'glance' ? 'glancing' : '', instance.parried ? 'parried' : '',
    instance.absorbed ? `−${Math.round(instance.absorbed * 10) / 10} ${armorName}` : `${armorName} spent`];
  return parts.filter(Boolean).join(', ');
}

export function DamageDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
  const { build, evaluation } = builder;
  const [hit, setHit] = useState<IncomingHit>(NO_HIT);
  const [parryId, setParryId] = useState('');
  const [customReduction, setCustomReduction] = useState(50);
  const [chanceOverride, setChanceOverride] = useState<number | null>(null);
  const [zugzwang, setZugzwang] = useState(false);
  const [attackerHit, setAttackerHit] = useState(150);
  const [greatAccuracy, setGreatAccuracy] = useState(false);
  const [ignoresEvasion, setIgnoresEvasion] = useState(false);
  const set = (patch: Partial<IncomingHit>) => setHit(current => ({ ...current, ...patch }));

  const parries = parryOptions(build, evaluation);
  const bonuses = parryChanceBonuses(build);
  const parry = parries.find(option => option.id === parryId);
  const baseReduction = parry ? parry.reductionPercent : parryId === 'custom' ? customReduction : 0;
  const parryReductionPercent = zugzwang ? baseReduction / 2 : baseReduction;
  const parryChance = parryId ? (chanceOverride ?? parry?.chance ?? 0) : 0;
  const pickParry = (id: string) => { setParryId(id); setChanceOverride(null); };

  const outcomes = Array.from({ length: hit.hits }, (_, index) => hit.outcomes[index] ?? { result: 'hit' as const, parried: false });
  const setOutcome = (index: number, patch: Partial<(typeof outcomes)[number]>) =>
    set({ outcomes: outcomes.map((outcome, at) => (at === index ? { ...outcome, ...patch } : outcome)) });

  const resolved = { ...hit, parryReductionPercent };
  const { steps, instances, taken } = incomingDamage(resolved, evaluation);
  const evade = guardedEvade(evaluation.derived.evade, hit.guardMomentum);
  const expected = expectedDamage(resolved, evaluation, {
    attackerHit, defenderEvade: evade, greatAccuracy, ignoresEvasion, parryChancePercent: parryChance,
  });
  const maxHP = evaluation.derived.maxHP;
  const armorName = hit.damageClass === 'magical' ? 'Magic Armor' : 'Armor';

  return (
    <Modal title="Incoming damage" onClose={onClose}>
      <div className="grid-fields">
        <NumberField label="Damage per hit" value={hit.amount} max={99999} onChange={amount => set({ amount })} />
        <SelectField label="Class" value={hit.damageClass} options={CLASS_OPTIONS} onChange={value => set({ damageClass: value as DamageClass })} />
        <SelectField label="Type" value={hit.type ?? ''} options={TYPE_OPTIONS} onChange={value => set({ type: (value || null) as DamageType })} />
        <NumberField label="Other reduction %" value={hit.otherReductionPercent} max={100} onChange={otherReductionPercent => set({ otherReductionPercent })} />
      </div>
      <div className="inline" style={{ gap: 12, flexWrap: 'wrap', margin: '10px 0' }}>
        <Toggle on={hit.critical} onChange={critical => set({ critical })}>Critical</Toggle>
        {hit.critical ? (
          <NumberField label="Crit damage %" value={hit.critDamagePercent} min={100} max={1000} onChange={critDamagePercent => set({ critDamagePercent })} />
        ) : null}
        <Toggle on={hit.armorIgnoring} onChange={armorIgnoring => set({ armorIgnoring })}>Ignores Armor</Toggle>
        <span className="inline" style={{ gap: 6 }}>
          <span className="field__label">Hits</span>
          <Stepper label="Hits" value={hit.hits} min={1} max={20} onChange={hits => set({ hits })} />
        </span>
      </div>

      <div className="section">
        <SectionHead>Defense</SectionHead>
        <div className="inline" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className="inline" style={{ gap: 6 }}>
            <span className="field__label">Guard Momentum</span>
            <Stepper label="Guard Momentum" value={hit.guardMomentum} min={0} max={10} onChange={guardMomentum => set({ guardMomentum })} />
          </span>
          {hit.guardMomentum > 0 ? <span className="hint">Evade while guarding: {evade}</span> : null}
        </div>
        <div className="grid-fields">
          <SelectField
            label="Parry skill"
            value={parryId}
            options={[
              { value: '', label: parries.length ? 'None' : 'None ranked' },
              ...parries.map(option => ({ value: option.id, label: option.name })),
              { value: 'custom', label: 'Custom' },
            ]}
            onChange={pickParry}
          />
          {parryId === 'custom' ? (
            <NumberField label="Parry reduction %" value={customReduction} max={100} onChange={setCustomReduction} />
          ) : null}
          {parryId ? (
            <NumberField label="Parry chance %" value={Math.round(parryChance * 10) / 10} max={100} onChange={setChanceOverride} />
          ) : null}
        </div>
        {parryId ? (
          <>
            <Toggle on={zugzwang} onChange={setZugzwang}>Attacker has Zugzwang (parry reduction halved)</Toggle>
            {parry ? <p className="hint">−{parry.reductionPercent}% when it fires. Chance: {parry.chanceRule}. Parries {parry.appliesTo}.</p> : null}
            {bonuses.length ? <p className="hint">Add when it applies: {bonuses.map(bonus => `${bonus.name} +${bonus.percent}%`).join(', ')}.</p> : null}
          </>
        ) : null}
      </div>

      <div className="section">
        <SectionHead>Outcome</SectionHead>
        <div className="grid-fields">
          {outcomes.map((outcome, index) => (
            <div key={index}>
              <SelectField
                label={`Hit ${index + 1}`}
                value={outcome.result}
                options={RESULT_OPTIONS}
                onChange={value => setOutcome(index, { result: value as HitResult })}
              />
              {parryId && outcome.result !== 'evaded' ? (
                <label className="hint" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={outcome.parried} onChange={event => setOutcome(index, { parried: event.target.checked })} />
                  Parried
                </label>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="figures">
        <div className="figure figure--static is-active">
          <span className="eyebrow">Taken</span>
          <span className="figure__value">{taken}</span>
          <span className="figure__note">{maxHP - taken} of {maxHP} HP left</span>
        </div>
        <div className="figure figure--static">
          <span className="eyebrow">Expected per attack</span>
          <span className="figure__value">{Math.round(expected.expected * 10) / 10}</span>
          <span className="figure__note">
            {expected.expected > 0 ? `About ${Math.ceil(maxHP / expected.expected)} attacks to down` : 'Never lands'}
          </span>
        </div>
      </div>

      <div className="section">
        <SectionHead>Expected</SectionHead>
        <div className="inline" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <NumberField label="Attacker Hit" value={attackerHit} max={999} onChange={setAttackerHit} />
          <Toggle on={greatAccuracy} onChange={setGreatAccuracy}>Great Accuracy</Toggle>
          <Toggle on={ignoresEvasion} onChange={setIgnoresEvasion}>Ignores Evasion</Toggle>
        </div>
        <p className="hint">
          Each hit against {evade} Evade: {percent(expected.hitChance)} lands, {percent(expected.glanceChance)} glances, {percent(expected.evadeChance)} evaded
          {parryId ? `; ${Math.round(parryChance * 10) / 10}% parried when it connects` : ''}.
        </p>
      </div>

      <div className="section">
        <SectionHead>Steps</SectionHead>
        {steps.map(step => (
          <div className="provenance__row" key={step.label}>
            <span>{step.label} <span className="dim">{stepValue(step.factor, step.flat)}</span></span>
            <span>{Math.round(step.total * 10) / 10}</span>
          </div>
        ))}
        {instances.length > 1 || instances[0].result !== 'hit' || instances[0].parried ? instances.map((instance, index) => (
          <div className="provenance__row" key={index}>
            <span>Hit {index + 1} <span className="dim">{instanceNote(instance, armorName)}</span></span>
            <span>{instance.taken}</span>
          </div>
        )) : null}
        <p className="hint" style={{ marginTop: 8 }}>
          Percentage reductions, glancing (−60%) and parries multiply together, then Armor or Magic Armor is subtracted. Armor is one pool per attack, used up hit by hit. Each hit is rounded down.
        </p>
      </div>
    </Modal>
  );
}
