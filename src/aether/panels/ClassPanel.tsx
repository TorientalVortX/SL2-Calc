import { useEffect, useMemo, useState } from 'react';
import type { StatKey } from '../../types';
import { CLASSES } from '../../data/classes';
import { destinyAllowsClassPair } from '../../domain/skills';
import { Panel, SectionHead } from '../ui/Panel';
import { Stepper, Toggle } from '../ui/controls';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import {
  CLASS_FAMILIES,
  STAT_KEYS,
  classPassiveMaxRank,
  classPassiveOf,
  familyOf,
  type ClassSlot,
} from '../state/build';
import type { Builder } from '../state/useBuilder';

/**
 * Class selection for both slots.
 *
 * The two slots share one browser rather than getting a column each: a character
 * has nine families and at most five classes in any of them, and splitting that
 * twice over would cost more space than the comparison is worth. The active slot
 * is a tab, and the browser retargets.
 */
export function ClassPanel({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const monoclass = build.mainClass === build.subClass;

  const [slot, setSlot] = useState<ClassSlot>('main');
  const activeClass = slot === 'main' ? build.mainClass : build.subClass;
  const [family, setFamily] = useState(() => familyOf(activeClass).base);

  // Follow the slot's own family when the tab or the class changes, so the
  // browser always opens on what is actually equipped.
  useEffect(() => setFamily(familyOf(activeClass).base), [activeClass]);

  const onFamilyKeys = useListNavigation(1);
  const onClassKeys = useListNavigation(2);

  /*
   * The base class and its promotions, kept apart.
   *
   * `members` lists the base first and the promotions after, but rendering all
   * five as one grid gave no clue which was which, and the distinction decides
   * what a build can reach: promotions inherit the base's skill pool, and Power
   * of Normalcy applies only while both slots are base classes.
   */
  const { base, promotions } = useMemo(() => {
    const entry = CLASS_FAMILIES.find(item => item.base === family);
    return { base: entry?.base ?? family, promotions: entry?.members.slice(1) ?? [] };
  }, [family]);

  const passiveRank = slot === 'main' ? build.mainClassPassive : build.subClassPassive;
  const passive = classPassiveOf(activeClass);
  const passiveMax = classPassiveMaxRank(activeClass);

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
          hint="Setting both slots to the same class applies its per-level stat bonus twice."
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

      {passive ? (
        <div className="section">
          <SectionHead aside={`Max ${passiveMax}`}>{activeClass} passive</SectionHead>
          <div className="inline" style={{ justifyContent: 'space-between' }}>
            <span className="hint" style={{ flex: 1 }}>{passive.description}</span>
            <Stepper
              label={`${activeClass} passive rank`}
              value={passiveRank}
              min={0}
              max={passiveMax}
              onChange={rank => dispatch({ type: 'passive', slot, rank })}
            />
          </div>
        </div>
      ) : null}
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

/**
 * One selectable class.
 *
 * The base card runs full width and the promotions sit in a grid beneath it, so
 * the shape of the section states the hierarchy before any label does.
 */
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
        {/* Only the base card is badged. The promotions sit under their own
            heading and behind a branch bar, so a chip on each would be repeating
            the section back at itself, and it was squeezing "Demon Hunter" onto
            two lines in a half-width card. */}
        {tier === 'base' ? <span className="chip chip--gold">Base</span> : null}
      </span>
      <span className="card__meta">{statLine(className)}</span>
      <span className="card__desc">{weapons}</span>
    </button>
  );
}

/** A class's per-level stat grant, written the way the wiki lists it. */
function statLine(className: string): string {
  const config = CLASSES[className];
  if (!config) return '—';
  const parts = STAT_KEYS
    .filter(stat => (config[stat as StatKey] ?? 0) !== 0)
    .map(stat => `${stat.toUpperCase()} +${config[stat as StatKey]}`);
  return parts.length ? parts.join('  ') : 'No stat grant';
}
