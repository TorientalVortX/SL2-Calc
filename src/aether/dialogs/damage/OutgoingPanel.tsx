import { useMemo, useState } from 'react';
import type { ElementKey, PhysicalKey } from '../../../types';
import { PHYSICAL_KEYS } from '../../../types';
import { ELEMENT_KEYS } from '../../../domain/buildEvaluation';
import { NO_HIT, type DamageClass, type DamageType, type IncomingHit } from '../../../domain/damage';
import { findWeaponByName } from '../../../domain/equipment';
import {
  OPEN_TARGET, attackBase, critDamageFor, defaultDamage, expectedOutgoing, outgoingDamage, powerMultiplier, riderFor, targetAfterSets, weaponFor,
  type FlatBonus, type Hand, type Target,
} from '../../../domain/outgoing';
import { SKILLS, mergeSkillRanks, skillById } from '../../../domain/skills';
import { setAttackEffects } from '../../../domain/itemEffects';
import { equippedSets } from '../../../domain/itemSets';
import { skillFormulaBreakdown } from '../../../domain/skillDamage';
import { unarmedWeapon } from '../../../domain/unarmed';
import { SectionHead } from '../../ui/Panel';
import { NumberField, SelectField, Stepper, Toggle } from '../../ui/controls';
import type { Builder } from '../../state/useBuilder';
import { CLASS_OPTIONS, OutcomeGrid, STEPS_HINT, StepRows, TYPE_OPTIONS, percent, tenth } from './shared';

const LIGHTNING_CRITICAL_PERCENT = 25;
const NO_BONUS: FlatBonus = { amount: 0, ignores: 'none' };
const HAND_LABEL: Record<Hand, string> = { main: 'Main', off: 'Off', unarmed: 'Unarmed' };

const IGNORE_OPTIONS: Array<{ value: FlatBonus['ignores']; label: string }> = [
  { value: 'none', label: 'Normal' },
  { value: 'armor', label: 'Armor-ignoring' },
  { value: 'protection', label: 'Protection-ignoring' },
];

function asDamageType(type: string | undefined): DamageType {
  if (type === 'Darkness') return 'Dark';
  if ((PHYSICAL_KEYS as readonly string[]).includes(type ?? '')) return type as PhysicalKey;
  return (ELEMENT_KEYS as readonly string[]).includes(type ?? '') ? type as ElementKey : null;
}

export function OutgoingPanel({ builder, initialSkillId }: { builder: Builder; initialSkillId?: string }) {
  const { build, evaluation } = builder;
  const fists = unarmedWeapon(build);
  const [handChoice, setHand] = useState<Hand>('main');
  const weaponNameOf = (which: Hand) => (which === 'off'
    ? build.equipment.offHandWeapon?.selectedWeaponName
    : which === 'main' ? build.equipment.primaryWeapon?.selectedWeaponName ?? fists.name : fists.name) ?? 'none';
  const weaponTypeOf = (which: Hand) => {
    const held = which === 'off' ? build.equipment.offHandWeapon : which === 'main' ? build.equipment.primaryWeapon : undefined;
    return asDamageType(held ? findWeaponByName(held.selectedWeaponName)?.damageType : fists.damageType);
  };
  const ranks = useMemo(() => mergeSkillRanks(build.skillRanks), [build.skillRanks]);
  const attacks = useMemo(
    () => SKILLS.filter(skill => (ranks[skill.id] ?? 0) > 0 && !(skill.healing && skill.category !== 'Offensive') && (skill.basicAttack
      || (skill.scaling?.some(term => term.source === 'weapon' || term.source === 'element')
        && skillFormulaBreakdown(skill, ranks[skill.id], evaluation)))),
    [ranks, evaluation],
  );

  const [skillId, setSkillId] = useState(initialSkillId ?? '');
  const skill = skillId ? skillById(skillId) ?? null : null;
  const rank = skill ? ranks[skill.id] ?? 1 : 0;
  // Only a basic attack, or a skill that performs one, picks between held weapons; Mixed Martial Arts lends any skill the unarmed weapon.
  const handsFor = (attack: typeof skill): Hand[] => [
    'main',
    ...(evaluation.offHandWeapon && (!attack || attack.basicAttack) ? ['off' as const] : []),
    ...(evaluation.unarmedWeapon && attack ? ['unarmed' as const] : []),
  ];
  const hands = handsFor(skill);
  const attackHand: Hand = hands.includes(handChoice) ? handChoice : 'main';
  const weapon = weaponFor(evaluation, attackHand);
  const weaponType = weaponTypeOf(attackHand);
  const [elements, setElements] = useState<Partial<Record<number, ElementKey>>>({});
  const [hit, setHit] = useState<IncomingHit>(() => ({
    ...NO_HIT, amount: 0, critDamagePercent: critDamageFor(skill, evaluation, attackHand), ...defaultDamage(skill, {}, weaponType),
  }));
  const [percents, setPercents] = useState<number[]>([]);
  const [lightning, setLightning] = useState(false);
  const [flat, setFlat] = useState<FlatBonus>(() => riderFor(skill, rank) ?? NO_BONUS);
  const [target, setTarget] = useState<Target>(OPEN_TARGET);
  const [greatAccuracy, setGreatAccuracy] = useState(false);
  const [ignoresEvasion, setIgnoresEvasion] = useState(false);
  const set = (patch: Partial<IncomingHit>) => setHit(current => ({ ...current, ...patch }));
  const aim = (patch: Partial<Target>) => setTarget(current => ({ ...current, ...patch }));

  const pickAttack = (id: string) => {
    setSkillId(id);
    setElements({});
    const next = id ? skillById(id) ?? null : null;
    const nextHand: Hand = handsFor(next).includes(handChoice) ? handChoice : 'main';
    set({ ...defaultDamage(next, {}, weaponTypeOf(nextHand)), critDamagePercent: critDamageFor(next, evaluation, nextHand) });
    setFlat(riderFor(next, next ? ranks[next.id] ?? 1 : 0) ?? NO_BONUS);
  };
  const pickHand = (next: Hand) => {
    setHand(next);
    set({ ...defaultDamage(skill, elements, weaponTypeOf(next)), critDamagePercent: critDamageFor(skill, evaluation, next) });
  };
  const pickElement = (index: number, element: ElementKey) => {
    const next = { ...elements, [index]: element };
    setElements(next);
    set({ type: defaultDamage(skill, next, weaponType).type });
  };
  const ownResistance = (type: DamageType) => (!type ? 0 : (PHYSICAL_KEYS as readonly string[]).includes(type)
    ? evaluation.physicalResistance[type as PhysicalKey]
    : evaluation.elementalResistance[type as ElementKey]);
  const copyOwnDefenses = () => {
    const { physicalDefense, magicalDefense, armor, magicArmor, evade, criticalEvade } = evaluation.derived;
    setTarget({
      physicalDefense, magicalDefense, armor, magicArmor, evade, criticalEvade,
      resistance: ownResistance(hit.type),
      bonusResistance: ownResistance(flat.type ?? null),
    });
  };

  const base = attackBase(skill, rank, evaluation, elements, attackHand);
  const fromSets = setAttackEffects(equippedSets(build.equipment));
  const setDamagePercents = fromSets.flatMap(effect => (effect.damagePercent ? [effect.damagePercent] : []));
  const allPercents = [...percents, ...(lightning ? [LIGHTNING_CRITICAL_PERCENT] : []), ...setDamagePercents];
  const attackerHit = (weapon?.hit ?? 0) + base.hit;
  const attackerCritical = (weapon?.critical ?? 0) + base.critical;
  const seenTarget = targetAfterSets(target, fromSets, hit.type, flat.type ?? null);
  const dealt = outgoingDamage(hit, base, allPercents, flat, seenTarget);
  const expected = expectedOutgoing(hit, base, allPercents, flat, seenTarget, {
    hit: attackerHit, critical: attackerCritical, greatAccuracy, ignoresEvasion,
  });
  const riderType = flat.type && flat.type !== hit.type ? flat.type : null;
  const choosable = (skill?.scaling ?? []).flatMap((term, index) => (term.source === 'element' && (term.alternateElement || !term.element)
    ? [{ index, choices: term.alternateElement ? [term.element!, term.alternateElement] : ELEMENT_KEYS }]
    : []));

  return (
    <>
      <div className="section">
        <SectionHead aside={base.complete ? tenth(base.amount) : 'incomplete'}>Attack</SectionHead>
        <div className="grid-fields">
          <SelectField
            label="Attack"
            value={skillId}
            options={[
              { value: '', label: 'Basic attack' },
              ...attacks.map(option => ({ value: option.id, label: `${option.name} · R${ranks[option.id]}` })),
            ]}
            onChange={pickAttack}
          />
          {hands.length > 1 ? (
            <SelectField
              label="Hand"
              value={attackHand}
              options={hands.map(option => ({ value: option, label: `${HAND_LABEL[option]} · ${weaponNameOf(option)}` }))}
              onChange={value => pickHand(value as Hand)}
            />
          ) : null}
          {choosable.map(({ index, choices }) => (
            <SelectField
              key={index}
              label="Element"
              value={elements[index] ?? ''}
              options={[{ value: '', label: 'Choose' }, ...choices.map(element => ({ value: element, label: element }))]}
              onChange={value => pickElement(index, value as ElementKey)}
            />
          ))}
        </div>
        {base.terms.map(term => (
          <div className="provenance__row" key={term.label}>
            <span>{term.label} <span className="dim">{term.detail}</span></span>
            <span>{term.amount === null ? '—' : tenth(term.amount)}</span>
          </div>
        ))}
        {base.hit || base.critical ? (
          <p className="hint">
            {[base.hit ? `Hit ${base.hit > 0 ? '+' : ''}${base.hit}` : '', base.critical ? `Critical +${base.critical}` : ''].filter(Boolean).join(' · ')} from the skill.
          </p>
        ) : null}
      </div>

      <div className="grid-fields">
        <SelectField label="Class" value={hit.damageClass} options={CLASS_OPTIONS} onChange={value => set({ damageClass: value as DamageClass })} />
        <SelectField label="Type" value={hit.type ?? ''} options={TYPE_OPTIONS} onChange={value => set({ type: (value || null) as DamageType })} />
        <NumberField
          label="Crit damage %"
          value={hit.critDamagePercent}
          min={100}
          max={1000}
          onChange={critDamagePercent => set({ critDamagePercent })}
          hint={skill && !skill.basicAttack ? 'Skills and spells crit at 125%.' : 'Weapon crit damage plus scaled GUI.'}
        />
      </div>
      <div className="inline" style={{ gap: 12, flexWrap: 'wrap', margin: '10px 0' }}>
        <Toggle on={hit.armorIgnoring} onChange={armorIgnoring => set({ armorIgnoring })}>Ignores Armor</Toggle>
        <span className="inline" style={{ gap: 6 }}>
          <span className="field__label">Hits</span>
          <Stepper label="Hits" value={hit.hits} min={1} max={20} onChange={hits => set({ hits })} />
        </span>
      </div>

      <div className="section">
        <SectionHead aside={`×${powerMultiplier(allPercents).toFixed(3)}`}>Damage modifiers</SectionHead>
        <div className="grid-fields">
          {percents.map((value, index) => (
            <NumberField
              key={index}
              label={`Modifier ${index + 1} %`}
              value={value}
              min={-100}
              max={1000}
              onChange={next => setPercents(list => list.map((entry, at) => (at === index ? next : entry)))}
            />
          ))}
        </div>
        <div className="inline" style={{ gap: 12, flexWrap: 'wrap', margin: '6px 0' }}>
          <button type="button" className="btn btn--ghost" onClick={() => setPercents(list => [...list, 10])}>Add modifier</button>
          {percents.length ? (
            <button type="button" className="btn btn--ghost" onClick={() => setPercents(list => list.slice(0, -1))}>Remove last</button>
          ) : null}
          <Toggle on={lightning} onChange={setLightning}>Lightning Critical (+25%)</Toggle>
        </div>
        <p className="hint">Each modifier multiplies: +15% and +10% make ×1.265. Use them for effects like Damage Amplified, spell-school Power or race bonuses.</p>
        {fromSets.length ? (
          <p className="hint">
            From your sets: {fromSets.map(effect => (effect.damagePercent
              ? `${effect.label} +${effect.damagePercent}% damage`
              : `${effect.label} ignores up to ${effect.resistanceIgnored!.percent}% ${effect.resistanceIgnored!.types.join('/')} resistance`)).join('; ')}.
          </p>
        ) : null}
      </div>

      <div className="section">
        <SectionHead>Bonus damage</SectionHead>
        <div className="grid-fields">
          <NumberField label="Bonus per hit" value={flat.amount} max={9999} onChange={amount => setFlat(current => ({ ...current, amount }))} />
          <SelectField
            label="Bonus ignores"
            value={flat.ignores}
            options={IGNORE_OPTIONS}
            onChange={ignores => setFlat(current => ({ ...current, ignores: ignores as FlatBonus['ignores'] }))}
          />
        </div>
        <p className="hint">
          {flat.type ? `${flat.damageClass === 'magical' ? 'Magic' : 'Physical'} ${flat.type} damage from the skill. ` : ''}
          On-hit bonus damage, such as Tetra Dragon Fang’s 30. It is not raised by crits or damage modifiers.
        </p>
      </div>

      <div className="section">
        <SectionHead aside={<button type="button" className="btn btn--ghost" onClick={copyOwnDefenses}>Use my defenses</button>}>Target</SectionHead>
        <div className="grid-fields">
          <NumberField label="Physical Defense %" value={target.physicalDefense} max={100} onChange={physicalDefense => aim({ physicalDefense })} />
          <NumberField label="Magical Defense %" value={target.magicalDefense} max={100} onChange={magicalDefense => aim({ magicalDefense })} />
          <NumberField label="Armor" value={target.armor} max={999} onChange={armor => aim({ armor })} />
          <NumberField label="Magic Armor" value={target.magicArmor} max={999} onChange={magicArmor => aim({ magicArmor })} />
          <NumberField label={`${hit.type ?? 'Type'} resistance %`} value={target.resistance} min={-200} max={100} onChange={resistance => aim({ resistance })} />
          {riderType ? (
            <NumberField label={`${riderType} resistance %`} value={target.bonusResistance} min={-200} max={100} onChange={bonusResistance => aim({ bonusResistance })} />
          ) : null}
          <NumberField label="Evade" value={target.evade} max={999} onChange={evade => aim({ evade })} />
          <NumberField label="Critical Evade" value={target.criticalEvade} max={999} onChange={criticalEvade => aim({ criticalEvade })} />
        </div>
      </div>

      <OutcomeGrid hit={hit} parry={false} onChange={outcomes => set({ outcomes })} />

      <div className="figures">
        <div className="figure figure--static is-active">
          <span className="eyebrow">Dealt</span>
          <span className="figure__value">{dealt.dealt}</span>
          <span className="figure__note">{tenth(dealt.perHit)} per hit before defenses</span>
        </div>
        <div className="figure figure--static">
          <span className="eyebrow">Expected per attack</span>
          <span className="figure__value">{tenth(expected.expected)}</span>
          <span className="figure__note">With Hit {attackerHit} and Critical {attackerCritical}</span>
        </div>
      </div>

      <div className="section">
        <SectionHead>Expected</SectionHead>
        <div className="inline" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <Toggle on={greatAccuracy} onChange={setGreatAccuracy}>Great Accuracy</Toggle>
          <Toggle on={ignoresEvasion} onChange={setIgnoresEvasion}>Ignores Evasion</Toggle>
        </div>
        <p className="hint">
          Each hit against {target.evade} Evade: {percent(expected.hitChance)} lands, {percent(expected.glanceChance)} glances, {percent(expected.evadeChance)} evaded; {tenth(expected.critChance)}% crit.
        </p>
      </div>

      <div className="section">
        <SectionHead>Steps</SectionHead>
        <StepRows steps={dealt.main.steps} instances={dealt.main.instances} damageClass={hit.damageClass} start="Attack" />
        {dealt.bonus ? (
          <>
            <StepRows
              steps={dealt.bonus.steps}
              instances={dealt.bonus.instances}
              damageClass={flat.ignores === 'protection' ? 'protection-ignoring' : flat.damageClass ?? hit.damageClass}
              label="Bonus"
              start="Bonus damage"
            />
          </>
        ) : null}
        <p className="hint" style={{ marginTop: 8 }}>{STEPS_HINT}</p>
      </div>
    </>
  );
}
