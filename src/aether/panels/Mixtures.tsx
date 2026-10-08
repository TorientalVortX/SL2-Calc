import { useMemo, useState } from 'react';
import { MAX_MIXTURE_FLASKS, MIXTURES, mixtureDamageBreakdown, mixtureEffectBonus, mixtureEffectKey, mixtureFlaskCapacity } from '../../domain/chemist';
import { SectionHead } from '../ui/Panel';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';

const types = ['All', 'Cocktail', 'Balm', 'Medicine', 'Mutagen'] as const;
const chemicals = ['Any', 'A', 'B', 'C', 'D', 'E'] as const;
type MixtureType = (typeof types)[number];
type Chemical = (typeof chemicals)[number];

function sheetBonusText(name: string, effect: string): string {
  const bonus = mixtureEffectBonus(name, effect);
  if (!bonus) return '';
  return [
    ...Object.entries(bonus.baseStats ?? {}).map(([stat, amount]) => `Base ${stat.toUpperCase()} ${amount > 0 ? '+' : ''}${amount}`),
    ...Object.entries(bonus.stats ?? {}).map(([stat, amount]) => `${stat.toUpperCase()} ${amount > 0 ? '+' : ''}${amount}`),
    ...Object.entries(bonus.elementalAttack ?? {}).map(([element, amount]) => `${element} ATK ${amount > 0 ? '+' : ''}${amount}`),
    ...Object.entries(bonus.elementalResistance ?? {}).map(([element, amount]) => `${element} Res ${amount > 0 ? '+' : ''}${amount}%`),
    ...Object.entries(bonus.physicalResistance ?? {}).map(([type, amount]) => `${type} Res ${amount > 0 ? '+' : ''}${amount}%`),
    ...(bonus.maxHP ? [`Max HP +${bonus.maxHP}`] : []),
    ...(bonus.evade ? [`Evade +${bonus.evade}`] : []),
    ...(bonus.mutagenPotency ? [`Mutagen Potency +${bonus.mutagenPotency}`] : []),
    ...(bonus.statusResistance ? [`Status Res +${bonus.statusResistance}`] : []),
    ...(bonus.statusResistancePercent ? [`Status Res ${bonus.statusResistancePercent}%`] : []),
  ].join(' · ');
}

export function Mixtures({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const { mainClass, subClass } = build;
  const [type, setType] = useState<MixtureType>('All');
  const [first, setFirst] = useState<Chemical>('Any');
  const [second, setSecond] = useState<Chemical>('Any');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const mixtures = MIXTURES;
  const plan = build.mixturePlan ?? [];
  const activeEffects = new Set(build.activeMixtureEffects ?? []);
  const capacity = mixtureFlaskCapacity(build);
  const visible = useMemo(() => mixtures.filter(mixture => {
    if (type !== 'All' && mixture.type !== type) return false;
    if (first !== 'Any' && second !== 'Any') {
      if (mixture.chemicals.join('') !== [first, second].sort().join('')) return false;
    } else if (first !== 'Any' && !mixture.chemicals.includes(first)) return false;
    else if (second !== 'Any' && !mixture.chemicals.includes(second)) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${mixture.name} ${mixture.description} ${mixture.effects.map(effect => `${effect.name} ${effect.description}`).join(' ')}`
      .toLowerCase().includes(needle);
  }), [first, mixtures, query, second, type]);
  const active = visible.find(mixture => mixture.name === selected) ?? visible[0];
  const exactRecipe = type !== 'All' && first !== 'Any' && second !== 'Any' && !query.trim();
  const damage = active ? mixtureDamageBreakdown(active, build, builder.evaluation) : null;

  if (mainClass !== 'Chemist' && subClass !== 'Chemist') return null;

  return (
    <section className="section mixtures" aria-label="Chemist mixtures">
      <SectionHead aside={`${plan.length} / ${capacity}`}>Planned flasks</SectionHead>
      <p className="hint">Create Mixture grants 2 + rank reusable flasks.</p>
      {plan.length ? (
        <>
          <div className="mixtures__plan">
            {plan.map((name, index) => {
              const mixture = mixtures.find(entry => entry.name === name);
              const activeCount = mixture?.effects.filter(effect => activeEffects.has(mixtureEffectKey(name, effect.name))).length ?? 0;
              return (
                <div className="mixtures__plan-row" key={`${name}-${index}`}>
                  <span className="num">{index + 1}</span>
                  <span>{name}</span>
                  <span className="dim">{activeCount ? `${activeCount} active` : mixture?.chemicals.join(' + ')}</span>
                  <button type="button" className="btn btn--ghost btn--danger" onClick={() => { dispatch({ type: 'mixture-plan-remove', index }); play('back'); }} aria-label={`Remove ${name} from flask ${index + 1}`}>Remove</button>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn--ghost btn--danger mixtures__clear" onClick={() => { dispatch({ type: 'mixture-plan-clear' }); play('back'); }}>Clear plan</button>
        </>
      ) : <p className="hint">Select a recipe to fill a flask.</p>}
      {plan.length > capacity ? <p className="hint">{plan.length - capacity} planned {plan.length - capacity === 1 ? 'flask exceeds' : 'flasks exceed'} the current Create Mixture rank.</p> : null}
      <SectionHead aside={`${visible.length} / ${mixtures.length}`}>Mixing table</SectionHead>
      <div className="mixtures__picker">
        <label className="mixtures__field">
          <span className="eyebrow">Base</span>
          <select className="select" value={type} onChange={event => { setType(event.target.value as MixtureType); setSelected(null); play('select'); }}>
            {types.map(entry => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="mixtures__field">
          <span className="eyebrow">Chemical 1</span>
          <select className="select" value={first} onChange={event => { setFirst(event.target.value as Chemical); setSelected(null); play('select'); }}>
            {chemicals.map(entry => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="mixtures__field">
          <span className="eyebrow">Chemical 2</span>
          <select className="select" value={second} onChange={event => { setSecond(event.target.value as Chemical); setSelected(null); play('select'); }}>
            {chemicals.map(entry => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </label>
      </div>
      <input
        className="search mixtures__search"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search names and effects…"
        aria-label="Search mixture names and effects"
      />
      {active ? (
        <div className="mixtures__layout">
          <div className="list mixtures__list" aria-label="Matching mixtures">
            {visible.map(mixture => (
              <button
                type="button"
                key={mixture.name}
                className={`row ${active.name === mixture.name ? 'is-selected' : ''}`}
                onClick={() => { setSelected(mixture.name); play('select'); }}
                aria-current={active.name === mixture.name ? 'true' : undefined}
              >
                <span className="row__label">{mixture.name}</span>
                <span className="row__note">{mixture.chemicals.join(' + ')}</span>
              </button>
            ))}
          </div>
          <article className="mixtures__detail" aria-live="polite">
            <div className="mixtures__title">{active.name}{active.effects.length ? <span className="chip">{active.effects.length} effects</span> : null}</div>
            <div className="dim">{active.type} · {active.chemicals.join(' + ')}</div>
            <button
              type="button"
              className="btn btn--ghost mixtures__add"
              disabled={plan.length >= MAX_MIXTURE_FLASKS}
              onClick={() => { dispatch({ type: 'mixture-plan-add', name: active.name }); play('select'); }}
            >
              Add to planned flasks
            </button>
            <div className="mixtures__facts">
              {active.baseDamage !== null ? (
                <span>Damage: {active.baseDamage}{active.element && active.element !== 'N/A' ? ` + ${active.elementRatio}% ${active.element} ATK` : ''}</span>
              ) : <span>Damage: N/A</span>}
              <span>Ally damage: {active.allyMultiplier !== null ? `${active.allyMultiplier}%${active.kickback ? ' kickback' : ''}` : 'N/A'}</span>
              <span>Mist efficacy: {active.mistEfficacy !== null ? `${active.mistEfficacy}%` : 'N/A'}</span>
              {active.mistDuration !== null ? <span>Mist duration: {active.mistDuration} rounds</span> : null}
              {active.mistSize ? <span>Mist area: {active.mistSize}</span> : null}
              <span>Coat efficacy: {active.coatEfficacy !== null ? `${active.coatEfficacy}%` : 'N/A'}</span>
            </div>
            {damage ? (
              <div className="mixtures__damage">
                <span className="eyebrow">Current sheet</span>
                <span className="num">{Number(damage.total.toFixed(2))} estimated direct damage</span>
                <span className="dim">{damage.classLevel} Chemist level + {Number(damage.scaledStat.toFixed(2))} scaled {damage.stat.toUpperCase()} + {damage.baseDamage} base + {Number(damage.elementalDamage.toFixed(2))} ({damage.elementRatio}% of {damage.elementalAttack} {damage.element} ATK)</span>
                <span className="dim">Uses the wiki's common scaling. Efficacy, defenses, and recipe effects can change the result.</span>
              </div>
            ) : null}
            <p>{active.description}</p>
            {active.effects.length ? (
              <div className="mixtures__effects">
                <SectionHead aside={active.effects.length}>Effects and granted skills</SectionHead>
                <p className="hint">Only effects with calculated sheet bonuses have switches.</p>
                {!plan.includes(active.name) ? <p className="hint">Plan this mixture to apply its sheet bonuses.</p> : null}
                {active.effects.map((effect, index) => (
                  <details className="mixtures__effect" key={`${active.name}:${effect.name}:${index}`} open={index === 0}>
                    <summary>{effect.name}{activeEffects.has(mixtureEffectKey(active.name, effect.name)) ? <span className="chip mixtures__active-chip">Active</span> : null}</summary>
                    <p>{effect.description}</p>
                    {plan.includes(active.name) && mixtureEffectBonus(active.name, effect.name) ? (
                      <div className="mixtures__effect-application">
                        <label className="mixtures__effect-toggle">
                          <input
                            type="checkbox"
                            checked={activeEffects.has(mixtureEffectKey(active.name, effect.name))}
                            onChange={() => { dispatch({ type: 'mixture-effect-toggle', name: active.name, effect: effect.name }); play('select'); }}
                          />
                          Apply sheet bonuses
                        </label>
                        <span className="dim">{sheetBonusText(active.name, effect.name)}</span>
                      </div>
                    ) : null}
                  </details>
                ))}
              </div>
            ) : null}
            <a href={active.source} target="_blank" rel="noreferrer">Mixture List on the wiki</a>
          </article>
        </div>
      ) : <p className="hint">{exactRecipe ? 'The wiki has no mixture for this recipe.' : 'No mixtures match these filters.'}</p>}
    </section>
  );
}
