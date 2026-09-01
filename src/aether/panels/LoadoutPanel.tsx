import { useMemo, useState } from 'react';
import { Panel } from '../ui/Panel';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';
import { SkillsSheet } from './SkillsSheet';
import { TraitsSheet } from './TraitsSheet';
import { TalentsSheet } from './TalentsSheet';
import { RacialsSheet } from './RacialsSheet';
import { GearSheet } from './GearSheet';
import { YoukaiSheet } from './YoukaiSheet';
import { SLOTS, slotSummary } from '../state/equipment';
import type { LoadoutSheet } from '../state/build';

type Sheet = LoadoutSheet;

/**
 * Skills, traits and racials, sharing one framed sheet.
 *
 * They are tabs rather than three panels because only one is ever being edited,
 * and each needs the full width of the column for its rows. The alternative was
 * three cramped lists that all needed scrolling anyway.
 */
export function LoadoutPanel({ builder }: { builder: Builder }) {
  const [sheet, setSheet] = useState<Sheet>('gear');
  const { status, build, evaluation } = builder;

  const youkaiCap = evaluation.derived.youkaiCap;

  const counts = useMemo(() => ({
    gear: `${SLOTS.filter(descriptor => slotSummary(build.equipment, descriptor.id).name).length}/${SLOTS.length}`,
    skills: `${status.skillsSpent}/${status.skillsBudget}`,
    traits: `${status.traitsSpent}/${status.traitsBudget}`,
    talents: `${status.talentsSpent}/${status.talentsBudget}`,
    racials: String(build.subrace),
    youkai: `${build.youkai.contracted.length}/${youkaiCap}`,
  }), [status, build.subrace, build.equipment, build.youkai.contracted.length, youkaiCap]);

  const overSkills = status.skillPools.some(pool => pool.overspent);
  const overTraits = status.traitsSpent > status.traitsBudget;
  const overTalents = status.talentsSpent > status.talentsBudget;
  const overYoukai = build.youkai.contracted.length > youkaiCap;

  return (
    <Panel
      id="panel-loadout"
      title="Loadout"
      // The sheets here are open-ended (900 skills, 339 weapons), so the panel
      // grows and the page scrolls, rather than a list scrolling inside a frame.
      scroll={false}
      meta={
        <div className="tabs">
          {(['gear', 'skills', 'traits', 'talents', 'racials', 'youkai'] as Sheet[]).map(entry => (
            <button
              key={entry}
              type="button"
              className={`tab ${sheet === entry ? 'is-active' : ''}`}
              onClick={() => { play('select'); setSheet(entry); }}
              style={
                (entry === 'skills' && overSkills)
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
      {/*
        * Each problem is a route to the sheet that can fix it. Printing them as
        * prose left the reader to work out that "Soldier skills cost 38 points"
        * meant the Skills tab, and then to find it themselves.
        */}
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
      {sheet === 'traits' ? <TraitsSheet builder={builder} /> : null}
      {sheet === 'talents' ? <TalentsSheet builder={builder} /> : null}
      {sheet === 'racials' ? <RacialsSheet builder={builder} /> : null}
      {sheet === 'youkai' ? <YoukaiSheet builder={builder} /> : null}
    </Panel>
  );
}
