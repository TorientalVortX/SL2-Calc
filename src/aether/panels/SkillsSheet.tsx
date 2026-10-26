import { useMemo, useState } from 'react';
import type { Skill } from '../../types';
import {
  groupSkills,
  inertReason,
  mergeSkillRanks,
  skillsForClassTree,
  summaryAtRank,
} from '../../domain/skills';
import { SectionHead } from '../ui/Panel';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';
import { CopySpells } from './CopySpells';
import { SkillCard } from '../dialogs/SkillCard';
import { DamageDialog } from '../dialogs/DamageDialog';
import { SkillEffects } from './SkillEffects';
import { GrantedSkillCard } from './ItemEffects';
import { SLOTS, grantedSkills } from '../state/equipment';

/** Points don't pool across classes; `setSkillRankForClassSlots` mirrors a rank when both slots' trees reach it. */
export function SkillsSheet({ builder }: { builder: Builder }) {
  const { build, status, dispatch } = builder;
  const [query, setQuery] = useState('');
  const [takenOnly, setTakenOnly] = useState(false);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [simulating, setSimulating] = useState<Skill | null>(null);
  const onKeys = useListNavigation(1);

  const ranks = useMemo(() => mergeSkillRanks(build.skillRanks), [build.skillRanks]);
  const mainTree = useMemo(
    () => new Set(skillsForClassTree(build.mainClass).map(skill => skill.id)),
    [build.mainClass],
  );

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
  const granted = useMemo(() => grantedSkills(build.equipment), [build.equipment])
    .filter(skill => !needle || skill.name.toLowerCase().includes(needle) || skill.itemName.toLowerCase().includes(needle));

  return (
    <>
      <CopySpells builder={builder} />
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

      {granted.length ? (
        <div className="section">
          <SectionHead aside={`${granted.length} · no points`}>From equipment</SectionHead>
          <div className="stack--tight">
            {granted.map(skill => (
              <GrantedSkillCard
                key={`${skill.slot}:${skill.name}`}
                builder={builder}
                skill={skill}
                source={`${SLOTS.find(slot => slot.id === skill.slot)?.label} · ${skill.itemName}`}
              />
            ))}
          </div>
        </div>
      ) : null}

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
                        builder={builder}
                        onDetails={() => { play('select'); setSelected(skill); }}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
      {selected && (
        <SkillCard
          key={selected.id}
          skill={selected}
          evaluation={builder.evaluation}
          builder={builder}
          rank={ranks[selected.id] ?? 0}
          onRank={rank => setRank(selected, rank)}
          onClose={() => setSelected(null)}
          onSimulate={() => { setSelected(null); setSimulating(selected); }}
        />
      )}
      {simulating && <DamageDialog builder={builder} initialSkillId={simulating.id} onClose={() => setSimulating(null)} />}
    </>
  );
}

interface SkillRowProps {
  skill: Skill;
  rank: number;
  onRank: (skill: Skill, rank: number) => void;
  builder: Builder;
  onDetails: () => void;
}

function SkillRow({ skill, rank, onRank, builder, onDetails }: SkillRowProps) {
  const inert = inertReason(skill);
  const summary = rank > 0 ? summaryAtRank(skill, rank) : summaryAtRank(skill, 1);
  return (
    <>
    <div
      className={`entry entry--skill ${rank > 0 ? 'is-taken' : ''}`}
      data-nav
      tabIndex={0}
      role="group"
      aria-label={`${skill.name}, rank ${rank} of ${skill.maxRank}`}
      title={inert ? `Not applied to your stats: ${inert}` : undefined}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key.toLowerCase() === 'i') {
          event.preventDefault();
          onDetails();
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onRank(skill, rank >= skill.maxRank ? 0 : rank + 1);
        }
      }}
    >
      <div className="entry__main">
        <div className="entry__name">
          {skill.name}
          <button type="button" className="skill-details" aria-label={`Read ${skill.name} details`} onClick={onDetails}>
            Details
          </button>
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

    {rank > 0 && <div className="situational"><SkillEffects skill={skill} rank={rank} builder={builder} /></div>}
    </>
  );
}
