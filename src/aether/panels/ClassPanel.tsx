import { useMemo, useState } from 'react';
import type { StatKey } from '../../types';
import { CLASSES } from '../../data/classes';
import { destinyAllowsClassPair } from '../../domain/skills';
import { Panel, SectionHead } from '../ui/Panel';
import { Toggle } from '../ui/controls';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import {
  CLASS_FAMILIES,
  STAT_KEYS,
  familyOf,
  type ClassSlot,
} from '../state/build';
import type { Builder } from '../state/useBuilder';

export function ClassPanel({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const monoclass = build.mainClass === build.subClass;

  const [slot, setSlot] = useState<ClassSlot>('main');
  const activeClass = slot === 'main' ? build.mainClass : build.subClass;
  // A browsed family lasts until the slot's class changes, then falls back to that class's family.
  const [browsed, setBrowsed] = useState<{ forClass: string; family: string } | null>(null);
  const family = browsed?.forClass === activeClass ? browsed.family : familyOf(activeClass).base;
  const setFamily = (next: string) => setBrowsed({ forClass: activeClass, family: next });

  const onFamilyKeys = useListNavigation(1);
  const onClassKeys = useListNavigation(2);

  // Promotions inherit the base's skill pool, and Power of Normalcy applies only while both slots are base classes.
  const { base, promotions } = useMemo(() => {
    const entry = CLASS_FAMILIES.find(item => item.base === family);
    return { base: entry?.base ?? family, promotions: entry?.members.slice(1) ?? [] };
  }, [family]);


  const chooseClass = (className: string) => {
    if (className === activeClass) return;
    play('confirm');
    dispatch({ type: 'class', slot, className });
  };

  return (
    <Panel
      id="panel-class"
      title="Class"
      meta={
        <div className="tabs">
          {(['main', 'sub'] as ClassSlot[]).map(entry => (
            <button
              key={entry}
              type="button"
              className={`tab ${slot === entry ? 'is-active' : ''}`}
              onClick={() => { play('select'); setSlot(entry); }}
            >
              {entry === 'main' ? 'Main' : 'Sub'}
              <span className="tab__count">{entry === 'main' ? build.mainClass : build.subClass}</span>
            </button>
          ))}
        </div>
      }
    >
      <div className="stack--tight">
        <Toggle
          on={monoclass}
          onChange={enabled => dispatch({ type: 'monoclass', enabled })}
          hint="Using the same class in both slots doubles its per-level stat bonus."
        >
          Monoclass <span className="dim" style={{ fontSize: 11 }}>(class bonus applies twice)</span>
        </Toggle>
        <Toggle
          on={build.destiny}
          onChange={destiny => dispatch({ type: 'field', patch: { destiny } })}
          hint="Destiny raises each class's skill allowance from 35 to 50, but confines both slots to one family."
        >
          Destiny <span className="dim" style={{ fontSize: 11 }}>(50 skill points, one family)</span>
        </Toggle>
      </div>

      <div className="section">
        <SectionHead aside={`${CLASS_FAMILIES.length} lines`}>Base class</SectionHead>
        <div className="list" onKeyDown={onFamilyKeys}>
          {CLASS_FAMILIES.map(entry => {
            const holdsActive = entry.members.includes(activeClass);
            const locked = build.destiny
              && slot === 'sub'
              && !entry.members.includes(build.mainClass);
            return (
              <button
                key={entry.base}
                type="button"
                data-nav
                disabled={locked}
                className={`row ${family === entry.base ? 'is-selected' : ''} ${locked ? 'is-disabled' : ''}`}
                onClick={() => { play('move'); setFamily(entry.base); }}
                title={locked ? 'Destiny confines both slots to the main class’s family.' : undefined}
              >
                <span className="row__label">{entry.base}</span>
                {holdsActive ? <span className="chip chip--gold">Equipped</span> : null}
                <span className="row__note">+{entry.members.length - 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="section" onKeyDown={onClassKeys}>
        <SectionHead aside={slot === 'main' ? 'Main slot' : 'Sub slot'}>{family} line</SectionHead>

        <ClassCard
          className={base}
          tier="base"
          builder={builder}
          slot={slot}
          activeClass={activeClass}
          onChoose={chooseClass}
        />

        <div className="eyebrow" style={{ padding: '8px 0 3px', fontSize: 9 }}>
          Promotions <span className="dim">{promotions.length}</span>
        </div>
        <div className="grid-2">
          {promotions.map(className => (
            <ClassCard
              key={className}
              className={className}
              tier="promoted"
              builder={builder}
              slot={slot}
              activeClass={activeClass}
              onChoose={chooseClass}
            />
          ))}
        </div>
      </div>

    </Panel>
  );
}

interface ClassCardProps {
  className: string;
  tier: 'base' | 'promoted';
  builder: Builder;
  slot: ClassSlot;
  activeClass: string;
  onChoose: (className: string) => void;
}

function ClassCard({ className, tier, builder, slot, activeClass, onChoose }: ClassCardProps) {
  const { build } = builder;
  const config = CLASSES[className];
  const selected = className === activeClass;
  const illegal = build.destiny && !destinyAllowsClassPair(
    slot === 'main' ? className : build.mainClass,
    slot === 'main' ? build.subClass : className,
  );
  const weapons = config?.validWeapons?.length ? config.validWeapons.join(' · ') : 'No weapon restriction';

  return (
    <button
      type="button"
      data-nav
      disabled={illegal}
      className={`card card--${tier} ${selected ? 'is-selected' : ''} ${illegal ? 'is-disabled' : ''}`}
      onClick={() => onChoose(className)}
      title={`${className}\n${statLine(className)}\nWeapons: ${weapons}`}
    >
      <span className="card__head">
        <span className="card__name">{className}</span>
        {tier === 'base' ? <span className="chip chip--gold">Base</span> : null}
      </span>
      <span className="card__meta">{statLine(className)}</span>
      <span className="card__desc">{weapons}</span>
    </button>
  );
}

function statLine(className: string): string {
  const config = CLASSES[className];
  if (!config) return '—';
  const parts = STAT_KEYS
    .filter(stat => (config[stat as StatKey] ?? 0) !== 0)
    .map(stat => `${stat.toUpperCase()} +${config[stat as StatKey]}`);
  return parts.length ? parts.join('  ') : 'No stat grant';
}
