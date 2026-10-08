import type { Skill } from '../../types';
import { conditionalKey, isEffectModelled, mergeSkillRanks, setSkillEffectsActive, skillEffectKey, skillEffectValue, skillInputValue } from '../../domain/skills';
import { formatScaled } from '../state/readout';
import type { Builder } from '../state/useBuilder';
import { NumberField, SelectField, Toggle } from '../ui/controls';

const names: Record<string, string> = {
  hit: 'Hit', evade: 'Evade', critical: 'Critical', criticalDamage: 'Crit Damage',
  criticalEvade: 'Crit Evade', power: 'Power', swa: 'Scaled Weapon ATK',
  physicalDefense: 'Phys. Def', magicalDefense: 'Mag. Def', armor: 'Armor', magicArmor: 'Magic Armor',
  statusInfliction: 'Status Infliction', statusResistance: 'Status Resistance',
  fp: 'Max FP', skillPool: 'Skill Pool', battleWeight: 'Battle Weight',
  statusResistancePercent: 'Status Resistance', hpPercent: 'Max HP', defensiveKnowledge: 'Phys. Def',
};

export function SkillEffects({ skill, rank, builder, details = false }: { skill: Skill; rank: number; builder: Builder; details?: boolean }) {
  const { build, dispatch, evaluation } = builder;
  const context = { inputs: build.skillInputs, ranks: mergeSkillRanks(build.skillRanks), scaledStats: evaluation.scaledStats };
  const shownRank = Math.max(1, rank);
  const groups = new Map<string, Array<{ index: number; effect: Skill['effects'][number] }>>();
  skill.effects.forEach((effect, index) => {
    if (skill.handModelled || effect.applies !== 'conditional' || !isEffectModelled(effect)) return;
    const group = effect.condition ?? 'Active';
    groups.set(group, [...(groups.get(group) ?? []), { effect, index }]);
  });
  const label = (effect: Skill['effects'][number]) => {
    const value = skillEffectValue(skill, effect, shownRank, context);
    const amount = `${value >= 0 ? '+' : ''}${formatScaled(value)}`;
    const effectKey = skillEffectKey(skill, effect, shownRank, context);
    if (!effectKey) return 'Choose element';
    const key = effect.kind === 'stat' ? effectKey.toUpperCase()
      : effect.kind === 'element' ? `${effectKey} ATK`
      : effect.kind === 'elementResistance' ? `${effectKey} Resist` : names[effectKey] ?? effectKey;
    return `${amount}${effect.kind === 'elementResistance' || ['criticalDamage', 'physicalDefense', 'magicalDefense', 'defensiveKnowledge', 'statusResistancePercent', 'hpPercent'].includes(effect.key) ? '%' : ''} ${key}`;
  };
  const summary = (entries: Array<{ effect: Skill['effects'][number] }>) => {
    const stats = entries.filter(({ effect }) => effect.kind === 'stat');
    const elements = entries.filter(({ effect }) => effect.kind === 'element' || effect.kind === 'elementResistance');
    const uniform = (list: typeof entries) => list.every(({ effect }) => skillEffectValue(skill, effect, shownRank, context) === skillEffectValue(skill, list[0].effect, shownRank, context));
    if (stats.length >= 11 && stats.length === entries.length && uniform(stats)) {
      return `${label(stats[0].effect).split(' ')[0]} ${stats.length === 12 ? 'all stats' : 'all stats except VIT'}`;
    }
    const parts = elements.length === 10 && uniform(elements)
      ? [`${label(elements[0].effect).split(' ')[0]} all ${elements[0].effect.kind === 'element' ? 'Elemental ATK' : 'Elemental Resist'}`, ...entries.filter(entry => !elements.includes(entry)).map(({ effect }) => label(effect))]
      : entries.map(({ effect }) => label(effect));
    return parts.join(', ');
  };
  return <div className="skill-effects">
    {[...groups].map(([group, entries]) => <div key={group} className="skill-effects__group">
      <Toggle on={entries.every(({ index }) => Boolean(build.skillConditionals[conditionalKey(skill.id, index)]))}
        disabled={rank === 0}
        onChange={on => dispatch({ type: 'field', patch: { skillConditionals: setSkillEffectsActive(build.skillConditionals, skill, group, on) } })}
        hint="Apply while active.">
        <span>{group}</span><span className="skill-effects__values num">{summary(entries)}</span>
      </Toggle>
    </div>)}
    {groups.size > 0 && (rank > 0 || details) && skill.inputs?.map(input => {
      const limitRank = input.maxRankSource ? context.ranks[input.maxRankSource] ?? 0 : shownRank;
      const max = input.maxByRank?.[Math.max(0, Math.min(limitRank, input.maxByRank.length) - 1)] ?? input.max;
      if (input.choices) return <SelectField key={input.key} label={input.label}
        value={String(skillInputValue(skill, input.key, shownRank, context))}
        options={input.choices.map(choice => ({ value: String(choice.value), label: choice.label }))}
        onChange={value => dispatch({ type: 'field', patch: { skillInputs: { ...build.skillInputs, [`${skill.id}:${input.key}`]: Number(value) } } })} />;
      return <NumberField key={input.key} label={input.label}
        value={skillInputValue(skill, input.key, shownRank, context)} min={input.min} max={limitRank === 0 ? 0 : max}
        onChange={value => dispatch({ type: 'field', patch: { skillInputs: { ...build.skillInputs, [`${skill.id}:${input.key}`]: value } } })} />;
    })}
    {details && skill.effects.map((effect, index) => {
      if (effect.target || effect.unmodelled) return <p key={index} className="hint">{effect.target === 'enemy' ? 'Enemy effect' : effect.target === 'summon' ? 'Youkai effect' : effect.unmodelled}: {label(effect)}</p>;
      if (!isEffectModelled(effect)) return <p key={index} className="hint">{label(effect)} · Not calculated.</p>;
      if (effect.applies === 'always' && !skill.handModelled) return <p key={index} className="hint">{label(effect)} · While learned{effect.weapons?.length ? ` with ${effect.weapons.join(' / ')}` : ''}.</p>;
      return null;
    })}
    {details && skill.battleNote && <p className="hint">{skill.battleNote}</p>}
  </div>;
}
