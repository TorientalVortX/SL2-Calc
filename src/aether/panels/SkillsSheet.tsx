import { useMemo, useState } from 'react';
import type { Skill, SkillConditionals } from '../../types';
import {
  conditionalKey,
  groupSkills,
  inertReason,
  isEffectModelled,
  mergeSkillRanks,
  signedAmount,
  skillsForClassTree,
  summaryAtRank,
} from '../../domain/skills';
import { SectionHead } from '../ui/Panel';
import { Toggle } from '../ui/controls';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';

/**
 * The skill sheet, one section per class the build can spend points in.
 *
 * Points do not pool across classes, so each section carries its own allowance
 * and its own overspend state. A build can be within its total and still
 * illegal, and showing only a total would hide that.
 *
 * A skill is charged to exactly one class (`skillPoolClassFor`), and written to
 * whichever slot's tree reaches it; `setSkillRankForClassSlots` mirrors the rank
 * when both slots do, which is what makes a shared base class read as one sheet.
 */
export function SkillsSheet({ builder }: { builder: Builder }) {
  const { build, status, dispatch } = builder;
  const [query, setQuery] = useState('');
  const [takenOnly, setTakenOnly] = useState(false);
  const onKeys = useListNavigation(1);

  const ranks = useMemo(() => mergeSkillRanks(build.skillRanks), [build.skillRanks]);
  const mainTree = useMemo(
    () => new Set(skillsForClassTree(build.mainClass).map(skill => skill.id)),
    [build.mainClass],
  );

  const setConditional = (key: string, on: boolean) => {
    play(on ? 'select' : 'back');
    dispatch({ type: 'field', patch: { skillConditionals: { ...build.skillConditionals, [key]: on } } });
  };

  const setRank = (skill: Skill, rank: number) => {
    const next = Math.max(0, Math.min(rank, skill.maxRank));
    if (next === (ranks[skill.id] ?? 0)) {
      play('deny');
      return;
    }
    play(next > (ranks[skill.id] ?? 0) ? 'select' : 'back');
    dispatch({
      type: 'skill-rank',
      slot: mainTree.has(skill.id) ? 'main' : 'sub',
      skillId: skill.id,
      rank: next,
    });
  };

  const needle = query.trim().toLowerCase();

  return (
    <>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search skills…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Search skills"
        />
        <button
          type="button"
          className={`btn btn--ghost btn--icon ${takenOnly ? 'is-active' : ''}`}
          onClick={() => { play('select'); setTakenOnly(value => !value); }}
        >
          Ranked only
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--danger"
          onClick={() => { play('back'); dispatch({ type: 'skills-clear' }); }}
        >
          Reset
        </button>
      </div>

      <div onKeyDown={onKeys}>
        {status.skillPools.map(pool => {
          const visible = pool.skills.filter(skill => {
            if (takenOnly && !(ranks[skill.id] ?? 0)) return false;
            if (!needle) return true;
            return skill.name.toLowerCase().includes(needle)
              || skill.category.toLowerCase().includes(needle);
          });

          return (
            <div className="section" key={pool.className}>
              <SectionHead
                aside={`${pool.spent} / ${pool.budget} pts`}
              >
                <span style={pool.overspent ? { color: 'var(--alert)' } : undefined}>
                  {pool.className}
                  {pool.role === 'base' ? ' · base' : ''}
                </span>
              </SectionHead>

              {visible.length === 0 ? (
                <div className="hint" style={{ padding: '6px 9px' }}>
                  {takenOnly ? 'Nothing ranked in this tree.' : 'No skill matches that search.'}
                </div>
              ) : (
                groupSkills(visible).map(group => (
                  <div key={group.category} className="stack--tight" style={{ marginBottom: 6 }}>
                    <div className="eyebrow" style={{ padding: '4px 9px 1px', fontSize: 9 }}>
                      {group.category}
                    </div>
                    {group.items.map(skill => (
                      <SkillRow
                        key={skill.id}
                        skill={skill}
                        rank={ranks[skill.id] ?? 0}
                        onRank={setRank}
                        conditionals={build.skillConditionals}
                        onConditional={setConditional}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

interface SkillRowProps {
  skill: Skill;
  rank: number;
  onRank: (skill: Skill, rank: number) => void;
  conditionals: SkillConditionals;
  onConditional: (key: string, on: boolean) => void;
}

function SkillRow({ skill, rank, onRank, conditionals, onConditional }: SkillRowProps) {
  const inert = inertReason(skill);
  const summary = rank > 0 ? summaryAtRank(skill, rank) : summaryAtRank(skill, 1);
  /*
   * Situational bonuses only exist once the skill is ranked, and only matter for
   * effects the calculator can actually apply. The rest are shown by
   * `summaryAtRank` as text and would be a switch that does nothing.
   */
  const situational = rank > 0
    ? skill.effects
      .map((effect, index) => ({ effect, index }))
      .filter(entry => entry.effect.applies === 'conditional' && isEffectModelled(entry.effect))
    : [];

  return (
    <>
    <div
      className={`entry ${rank > 0 ? 'is-taken' : ''}`}
      data-nav
      tabIndex={0}
      role="group"
      aria-label={`${skill.name}, rank ${rank} of ${skill.maxRank}`}
      title={inert ? `Not applied to your stats: ${inert}` : undefined}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onRank(skill, rank >= skill.maxRank ? 0 : rank + 1);
        }
      }}
    >
      <div className="entry__main">
        <div className="entry__name">
          {skill.name}
          {inert ? <span className="chip" title={inert}>ref</span> : null}
          {skill.requires?.length ? <span className="chip" title="Has prerequisites">req</span> : null}
        </div>
        <div className="entry__sub">{rank > 0 ? summary : `Rank 1: ${summary}`}</div>
      </div>

      <div className="entry__rank">
        <button
          type="button"
          tabIndex={-1}
          className="step"
          disabled={rank <= 0}
          aria-label={`Lower ${skill.name}`}
          onClick={() => onRank(skill, rank - 1)}
        >
          −
        </button>
        <span className="rank-pips" aria-hidden="true">
          {Array.from({ length: skill.maxRank }, (_, index) => (
            <span key={index} className={`rank-pip ${index < rank ? 'is-on' : ''}`} />
          ))}
        </span>
        <span className="rank-value">{rank}/{skill.maxRank}</span>
        <button
          type="button"
          tabIndex={-1}
          className="step"
          disabled={rank >= skill.maxRank}
          aria-label={`Raise ${skill.name}`}
          onClick={() => onRank(skill, rank + 1)}
        >
          +
        </button>
      </div>
    </div>

    {/*
      * Off until the player says the condition holds. Most SL2 skill bonuses need
      * a weapon, a position or a buff window the calculator cannot see, so opting
      * in is the only honest default, and until now the sheet had no switch at
      * all, which silently pinned every one of them to off.
      */}
    {situational.length ? (
      <div className="situational">
        {situational.map(({ effect, index }) => {
          const key = conditionalKey(skill.id, index);
          const value = effect.valueByRank[Math.min(rank, effect.valueByRank.length) - 1];
          return (
            <Toggle
              key={key}
              on={Boolean(conditionals[key])}
              onChange={on => onConditional(key, on)}
              hint={`Counts ${signedAmount(value)} ${effect.key} only while the skill's condition holds.`}
            >
              <span className="situational__label">
                When it applies: <span className="num">{signedAmount(value)} {effect.key}</span>
              </span>
            </Toggle>
          );
        })}
      </div>
    ) : null}
    </>
  );
}
