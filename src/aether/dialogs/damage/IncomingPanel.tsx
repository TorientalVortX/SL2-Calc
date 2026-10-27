import { useState } from 'react';
import {
  NO_HIT, expectedDamage, guardedEvade, incomingDamage,
  type DamageClass, type DamageType, type IncomingHit,
} from '../../../domain/damage';
import { parryChanceBonuses, parryOptions } from '../../../domain/parry';
import { VERSUS_RACES } from '../../../domain/itemEffects';
import { SectionHead } from '../../ui/Panel';
import { NumberField, SelectField, Stepper, Toggle } from '../../ui/controls';
import type { Builder } from '../../state/useBuilder';
import { CLASS_OPTIONS, OutcomeGrid, STEPS_HINT, StepRows, TYPE_OPTIONS, percent, tenth } from './shared';

export function IncomingPanel({ builder }: { builder: Builder }) {
  const { build, evaluation } = builder;
  const [hit, setHit] = useState<IncomingHit>(NO_HIT);
  const [parryId, setParryId] = useState('');
  const [customReduction, setCustomReduction] = useState(50);
  const [chanceOverride, setChanceOverride] = useState<number | null>(null);
  const [zugzwang, setZugzwang] = useState(false);
  const [attackerHit, setAttackerHit] = useState(150);
  const [critChance, setCritChance] = useState(0);
  const [greatAccuracy, setGreatAccuracy] = useState(false);
  const [ignoresEvasion, setIgnoresEvasion] = useState(false);
  const [attackerRace, setAttackerRace] = useState('');
  const set = (patch: Partial<IncomingHit>) => setHit(current => ({ ...current, ...patch }));

  const parries = parryOptions(build, evaluation);
  const bonuses = parryChanceBonuses(build);
  const parry = parries.find(option => option.id === parryId);
  const parryFits = !parry?.classes || parry.classes.includes(hit.damageClass);
  const baseReduction = !parryFits ? 0 : parry ? parry.reductionPercent : parryId === 'custom' ? customReduction : 0;
  const parryReductionPercent = zugzwang ? baseReduction / 2 : baseReduction;
  const parryChance = parryId && parryFits ? (chanceOverride ?? parry?.chance ?? 0) : 0;
  const pickParry = (id: string) => { setParryId(id); setChanceOverride(null); };

  const versusReductions = evaluation.damageTakenVersus
    .filter(bonus => bonus.targets.includes(attackerRace))
    .map(bonus => ({ label: `${bonus.source} vs ${attackerRace}`, percent: bonus.percent }));
  const resolved = { ...hit, parryReductionPercent, versusReductions };
  const { steps, instances, taken } = incomingDamage(resolved, evaluation);
  const evade = guardedEvade(evaluation.derived.evade, hit.guardMomentum);
  const expected = expectedDamage(resolved, evaluation, {
    attackerHit, defenderEvade: evade, greatAccuracy, ignoresEvasion, parryChancePercent: parryChance, critChancePercent: critChance,
  });
  const maxHP = evaluation.derived.maxHP;

  return (
    <>
      <div className="grid-fields">
        <NumberField label="Damage per hit" value={hit.amount} max={99999} onChange={amount => set({ amount })} />
        <SelectField label="Class" value={hit.damageClass} options={CLASS_OPTIONS} onChange={value => set({ damageClass: value as DamageClass })} />
        <SelectField label="Type" value={hit.type ?? ''} options={TYPE_OPTIONS} onChange={value => set({ type: (value || null) as DamageType })} />
        <NumberField label="Other reduction %" value={hit.otherReductionPercent} max={100} onChange={otherReductionPercent => set({ otherReductionPercent })} />
        <NumberField label="Crit damage %" value={hit.critDamagePercent} min={100} max={1000} onChange={critDamagePercent => set({ critDamagePercent })} />
        <SelectField
          label="Attacker race"
          value={attackerRace}
          options={[{ value: '', label: 'Any' }, ...VERSUS_RACES.map(race => ({ value: race, label: race }))]}
          onChange={setAttackerRace}
        />
      </div>
      {versusReductions.length ? (
        <p className="hint">From your gear: {versusReductions.map(reduction => `${reduction.label} −${reduction.percent}%`).join('; ')}.</p>
      ) : null}
      <div className="toggle-row">
        <span className="inline" style={{ gap: 6 }}>
          <span className="field__label">Hits</span>
          <Stepper label="Hits" value={hit.hits} min={1} max={20} onChange={hits => set({ hits })} />
        </span>
        <Toggle on={hit.armorIgnoring} onChange={armorIgnoring => set({ armorIgnoring })}>Ignores Armor</Toggle>
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
            <NumberField label="Parry chance %" value={tenth(parryChance)} max={100} onChange={setChanceOverride} />
          ) : null}
        </div>
        {parryId ? (
          <>
            <div className="toggle-row">
              <Toggle on={zugzwang} onChange={setZugzwang}>Attacker has Zugzwang (parry reduction halved)</Toggle>
            </div>
            {parry ? <p className="hint">−{parry.reductionPercent}% when it fires. Chance: {parry.chanceRule}. Parries {parry.appliesTo}.</p> : null}
            {parryFits ? null : <p className="hint">{parry?.name} can’t parry {hit.damageClass} damage.</p>}
            {bonuses.length ? <p className="hint">Add when it applies: {bonuses.map(bonus => `${bonus.name} +${bonus.percent}%`).join(', ')}.</p> : null}
          </>
        ) : null}
      </div>

      <div className="section">
        <SectionHead>Attacker</SectionHead>
        <div className="grid-fields">
          <NumberField label="Attacker Hit" value={attackerHit} max={999} onChange={setAttackerHit} />
          <NumberField label="Attacker Crit %" value={critChance} max={100} onChange={setCritChance} />
        </div>
        <div className="toggle-row">
          <Toggle on={greatAccuracy} onChange={setGreatAccuracy}>Great Accuracy</Toggle>
          <Toggle on={ignoresEvasion} onChange={setIgnoresEvasion}>Ignores Evasion</Toggle>
        </div>
      </div>

      <OutcomeGrid hit={hit} parry={Boolean(parryId)} onChange={outcomes => set({ outcomes })} />

      <div className="figures">
        <div className="figure figure--static is-active">
          <span className="eyebrow">Taken</span>
          <span className="figure__value">{taken}</span>
          <span className="figure__note">{maxHP - taken} of {maxHP} HP left</span>
        </div>
        <div className="figure figure--static">
          <span className="eyebrow">Expected per attack</span>
          <span className="figure__value">{tenth(expected.expected)}</span>
          <span className="figure__note">
            {expected.expected > 0 ? `About ${Math.ceil(maxHP / expected.expected)} attacks to down` : 'Never lands'}
          </span>
        </div>
      </div>

      <p className="hint">
        Each hit against {evade} Evade: {percent(expected.hitChance)} lands, {percent(expected.glanceChance)} glances, {percent(expected.evadeChance)} evaded
        {critChance ? `; ${critChance}% crit` : ''}
        {parryId ? `; ${tenth(parryChance)}% parried when it connects` : ''}.
      </p>

      <div className="section">
        <SectionHead>Steps</SectionHead>
        <StepRows steps={steps} instances={instances} damageClass={hit.damageClass} />
        <p className="hint" style={{ marginTop: 8 }}>{STEPS_HINT}</p>
      </div>
    </>
  );
}
