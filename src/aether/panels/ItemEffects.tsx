import { Toggle } from '../ui/controls';
import type { GrantedSkill, SlotEffect } from '../state/equipment';
import type { Builder } from '../state/useBuilder';

function useItemConditionals(builder: Builder): Record<string, boolean> {
  const { equipment } = builder.build;
  return { ...equipment.armorConditionalBonuses, ...(equipment.itemConditionalBonuses ?? {}) };
}

function Rolls({ builder, entry }: { builder: Builder; entry: SlotEffect }) {
  return (
    <>
      {entry.rolls.map(roll => (
        <div className="roll" key={roll.key}>
          <span className="roll__label">{roll.label}</span>
          <input
            className="roll__range"
            type="range"
            min={roll.min}
            max={roll.max}
            value={roll.current}
            aria-label={roll.label}
            onChange={event => builder.dispatch({ type: 'item-roll', key: roll.key, value: Number(event.target.value) })}
          />
          <span className="num roll__value">{roll.current}</span>
        </div>
      ))}
    </>
  );
}

export function EffectRow({ builder, entry }: { builder: Builder; entry: SlotEffect }) {
  const conditionals = useItemConditionals(builder);
  const { effect } = entry;
  return (
    <div className="effect">
      {effect.applies === 'conditional' ? (
        <Toggle
          on={Boolean(conditionals[entry.conditionalKey])}
          onChange={on => builder.dispatch({ type: 'item-conditional', key: entry.conditionalKey, on })}
          hint="Enable this when the condition applies."
        >
          {effect.description}
        </Toggle>
      ) : (
        <div className="effect__static">
          <span className={`chip ${effect.applies === 'always' ? 'chip--good' : ''}`}>
            {effect.effects.some(value => value.controlLabel) ? 'battle state' : effect.applies === 'always' ? 'active' : 'text'}
          </span>
          <span>{effect.description}</span>
        </div>
      )}
      <Rolls builder={builder} entry={entry} />
    </div>
  );
}

export function GrantedSkillCard({ builder, skill, source }: { builder: Builder; skill: GrantedSkill; source?: string }) {
  const conditionals = useItemConditionals(builder);
  return (
    <div className="granted">
      <div className="granted__head">
        <span className="granted__name">{skill.name}</span>
        {skill.cost ? <span className="chip">{skill.cost}</span> : null}
        {source ? <span className="chip chip--gold granted__source">{source}</span> : null}
      </div>
      {skill.parts.map(entry => (
        <div className="granted__part" key={entry.conditionalKey}>
          <p className="granted__text">{entry.effect.description}</p>
          {entry.effect.applies === 'conditional' ? (
            <Toggle
              on={Boolean(conditionals[entry.conditionalKey])}
              onChange={on => builder.dispatch({ type: 'item-conditional', key: entry.conditionalKey, on })}
              hint={`Switch on while ${skill.name} is in effect.`}
            >
              {skill.name} active
            </Toggle>
          ) : null}
          <Rolls builder={builder} entry={entry} />
        </div>
      ))}
    </div>
  );
}
