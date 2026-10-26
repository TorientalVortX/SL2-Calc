import { useMemo, useState } from 'react';
import { Panel } from '../ui/Panel';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';
import { SkillsSheet } from './SkillsSheet';
import { Mixtures } from './Mixtures';
import { TraitsSheet } from './TraitsSheet';
import { TalentsSheet } from './TalentsSheet';
import { RacialsSheet } from './RacialsSheet';
import { GearSheet } from './GearSheet';
import { YoukaiSheet } from './YoukaiSheet';
import { SLOTS, slotSummary } from '../state/equipment';
import { mixtureFlaskCapacity } from '../../domain/chemist';
import type { LoadoutSheet } from '../state/build';

type Sheet = LoadoutSheet;

export function LoadoutPanel({ builder }: { builder: Builder }) {
  const [picked, setSheet] = useState<Sheet>('gear');
  const { status, build, evaluation } = builder;
  const hasChemist = build.mainClass === 'Chemist' || build.subClass === 'Chemist';
  const sheet: Sheet = !hasChemist && picked === 'mixtures' ? 'skills' : picked;

  const youkaiCap = evaluation.derived.youkaiCap;

  const counts = useMemo(() => ({
    gear: `${SLOTS.filter(descriptor => slotSummary(build.equipment, descriptor.id).name).length}/${SLOTS.length}`,
    skills: `${status.skillsSpent}/${status.skillsBudget}`,
    mixtures: `${build.mixturePlan?.length ?? 0}/${mixtureFlaskCapacity(build)}`,
    traits: `${status.traitsSpent}/${status.traitsBudget}`,
    talents: `${status.talentsSpent}/${status.talentsBudget}`,
    racials: String(build.subrace),
    youkai: `${build.youkai.contracted.length}/${youkaiCap}`,
  }), [status, build, youkaiCap]);

  const overSkills = status.skillPools.some(pool => pool.overspent);
  const overMixtures = (build.mixturePlan?.length ?? 0) > mixtureFlaskCapacity(build);
  const overTraits = status.traitsSpent > status.traitsBudget;
  const overTalents = status.talentsSpent > status.talentsBudget;
  const overYoukai = build.youkai.contracted.length > youkaiCap;

  return (
    <Panel
      id="panel-loadout"
      title="Loadout"
      scroll={false}
      meta={
        <div className="tabs">
          {(['gear', 'skills', ...(hasChemist ? ['mixtures' as const] : []), 'traits', 'talents', 'racials', 'youkai'] as Sheet[]).map(entry => (
            <button
              key={entry}
              type="button"
              className={`tab ${sheet === entry ? 'is-active' : ''}`}
              onClick={() => { play('select'); setSheet(entry); }}
              style={
                (entry === 'skills' && overSkills)
                  || (entry === 'mixtures' && overMixtures)
                  || (entry === 'traits' && overTraits)
                  || (entry === 'talents' && overTalents)
                  || (entry === 'youkai' && overYoukai)
                  ? { color: 'var(--alert)' }
                  : undefined
              }
            >
              {entry}
              <span className="tab__count">{counts[entry]}</span>
            </button>
          ))}
        </div>
      }
    >
      {status.violations.length ? (
        <div className="warnings">
          {status.violations.slice(0, 4).map(problem => (
            <button
              type="button"
              className="warnings__jump"
              key={problem.text}
              onClick={() => { play('select'); setSheet(problem.sheet); }}
            >
              {problem.text}
              <span className="warnings__to">{problem.sheet} →</span>
            </button>
          ))}
          {status.violations.length > 4 ? <div>…and {status.violations.length - 4} more.</div> : null}
        </div>
      ) : null}

      {sheet === 'gear' ? <GearSheet builder={builder} /> : null}
      {sheet === 'skills' ? <SkillsSheet builder={builder} /> : null}
      {sheet === 'mixtures' ? <Mixtures builder={builder} /> : null}
      {sheet === 'traits' ? <TraitsSheet builder={builder} /> : null}
      {sheet === 'talents' ? <TalentsSheet builder={builder} /> : null}
      {sheet === 'racials' ? <RacialsSheet builder={builder} /> : null}
      {sheet === 'youkai' ? <YoukaiSheet builder={builder} /> : null}
    </Panel>
  );
}
