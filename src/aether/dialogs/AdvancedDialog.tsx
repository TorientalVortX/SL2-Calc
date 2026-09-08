import { useState } from 'react';
import type { BuildState, ElementKey, GameWorld, StampKey } from '../../types';
import { elementInk } from '../../data/colors';
import { LEGEND_EXTEND } from '../../data/bonuses';
import { ELEMENT_KEYS } from '../../domain/buildEvaluation';
import { Modal } from '../ui/Modal';
import { SectionHead } from '../ui/Panel';
import { NumberField, SelectField } from '../ui/controls';
import { play } from '../state/audio';
import { STAT_KEYS, STAT_NAMES } from '../state/build';
import { DEFAULT_WORLD } from '../../domain/upgradeCaps';
import type { Builder } from '../state/useBuilder';

/**
 * The overrides that are not choices.
 *
 * Everything here is already part of a build and already feeds `evaluateBuild`:
 * Legend Extend, base-stat corrections, stamps, the vitals fudge factors and the
 * elemental adjusters. The sheet used to hold none of them, which meant a build
 * imported from the original calculator could read differently here with nothing
 * on screen to explain why. They live in one dialog rather than on the sheet
 * because none of them is part of ordinary play: you set them once, from a
 * character the game has already told you about.
 *
 * Sections rather than one long scroll, so the rail's element rows can open the
 * dialog directly on the adjusters they point at.
 */
export type AdvancedSection = 'legend' | 'base' | 'vitals' | 'elements';

const SECTIONS: Array<{ id: AdvancedSection; label: string }> = [
  { id: 'legend', label: 'Legend Extend' },
  { id: 'base', label: 'Base stats' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'elements', label: 'Elements' },
];

const STAMP_KEYS: StampKey[] = ['str', 'wil', 'ski', 'cel', 'vit', 'fai'];

interface AdvancedDialogProps {
  builder: Builder;
  section: AdvancedSection;
  onClose: () => void;
}

const EMPTY_BUFFS = { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };

export function AdvancedDialog({ builder, section: initial, onClose }: AdvancedDialogProps) {
  const { build, dispatch } = builder;
  const [section, setSection] = useState<AdvancedSection>(initial);

  const patch = (fields: Partial<BuildState>) => dispatch({ type: 'field', patch: fields });

  const legendActive = Object.values(build.legendExtend).filter(Boolean).length;
  const baseOverrides = STAT_KEYS.filter(stat => (build.customBaseStats[stat] ?? 0) !== 0).length;
  const buffCount = STAT_KEYS.filter(stat => (build.statBuffs?.[stat] ?? 0) !== 0).length;
  const stampCount = STAMP_KEYS.reduce((total, stat) => total + (build.stamps[stat] ?? 0), 0);
  const elementAdjusted = ELEMENT_KEYS.filter(element =>
    (build.elementalATKAdjustments[element] ?? 0) !== 0 || (build.elementalRESAdjustments[element] ?? 0) !== 0).length;

  const counts: Record<AdvancedSection, string> = {
    legend: String(legendActive),
    base: String(baseOverrides + stampCount + buffCount),
    vitals: String([build.customHP, build.customFP, build.baseEvade, build.bonusEvade].filter(Boolean).length),
    elements: String(elementAdjusted),
  };

  return (
    <Modal title="Advanced" onClose={onClose} wide>
      <div className="tabs" style={{ marginBottom: 11 }}>
        {SECTIONS.map(entry => (
          <button
            key={entry.id}
            type="button"
            className={`tab ${section === entry.id ? 'is-active' : ''}`}
            onClick={() => { play('select'); setSection(entry.id); }}
          >
            {entry.label}
            {counts[entry.id] !== '0' ? <span className="tab__count">{counts[entry.id]}</span> : null}
          </button>
        ))}
      </div>

      {section === 'legend' ? (
        <>
          <SectionHead aside={`${legendActive} active`}>Legend Extend</SectionHead>
          <p className="hint" style={{ padding: '0 2px 8px' }}>
            Each grants +1 to its stat <em>before</em> diminishing returns, so one is worth more than a
            point spent from the pool.
          </p>
          <div className="le-grid">
            {Object.keys(LEGEND_EXTEND).map(key => {
              // Undefined until first toggled, and React drops an attribute set to
              // undefined, so aria-checked must be coerced or it never ships.
              const on = Boolean(build.legendExtend[key]);
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={`le ${on ? 'is-on' : ''}`}
                  onClick={() => {
                    play(on ? 'back' : 'select');
                    patch({ legendExtend: { ...build.legendExtend, [key]: !on } });
                  }}
                >
                  <span className="le__bar" style={{ background: LEGEND_EXTEND[key].color }} />
                  {LEGEND_EXTEND[key].name}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {section === 'base' ? (
        <>
          <SectionHead aside={baseOverrides ? `${baseOverrides} set` : undefined}>
            Base stat corrections
          </SectionHead>
          <p className="hint" style={{ padding: '0 2px 8px' }}>
            Added to the racial line before scaling and before the invested cap, for anything the
            calculator has no field for. Leave at zero unless you are matching a character in-game.
          </p>
          <div className="grid-fields">
            {STAT_KEYS.map(stat => (
              <NumberField
                key={stat}
                label={stat.toUpperCase()}
                title={STAT_NAMES[stat]}
                value={build.customBaseStats[stat] ?? 0}
                min={-99}
                max={99}
                onChange={value => patch({ customBaseStats: { ...build.customBaseStats, [stat]: value } })}
              />
            ))}
          </div>

          <div className="section">
            <SectionHead aside={buffCount ? `${buffCount} set` : undefined}>Buffs</SectionHead>
            <p className="hint" style={{ padding: '0 2px 8px' }}>
              Added after diminishing returns, so ten points read as ten however far past the soft
              cap the stat already is. This is where a combat buff belongs (a Nerhaven stat gain, a
              borrowed stat line), as opposed to the corrections above, which the soft cap shaves.
            </p>
            <div className="grid-fields">
              {STAT_KEYS.map(stat => (
                <NumberField
                  key={stat}
                  label={stat.toUpperCase()}
                  title={STAT_NAMES[stat]}
                  value={build.statBuffs?.[stat] ?? 0}
                  min={-99}
                  max={99}
                  onChange={value => patch({
                    statBuffs: { ...(build.statBuffs ?? EMPTY_BUFFS), [stat]: value },
                  })}
                />
              ))}
            </div>
          </div>

          <div className="section">
            <SectionHead aside={stampCount ? `${stampCount} total` : undefined}>Stat stamps</SectionHead>
            <p className="hint" style={{ padding: '0 2px 8px' }}>
              Stamps raise a stat's base line the same way a racial point does. Six stats can carry
              them, up to ten each.
            </p>
            <div className="grid-fields">
              {STAMP_KEYS.map(stat => (
                <NumberField
                  key={stat}
                  label={stat.toUpperCase()}
                  title={STAT_NAMES[stat]}
                  value={build.stamps[stat] ?? 0}
                  min={0}
                  max={10}
                  onChange={value => patch({ stamps: { ...build.stamps, [stat]: value } })}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {section === 'vitals' ? (
        <>
          <SectionHead>Vitals and evade</SectionHead>
          <p className="hint" style={{ padding: '0 2px 8px' }}>
            Flat additions on top of everything the sheet already computes, for HP, FP or Evade from
            a source the calculator does not model.
          </p>
          <div className="grid-fields">
            <NumberField
              label="Custom HP"
              value={build.customHP}
              min={-9999}
              max={9999}
              onChange={customHP => patch({ customHP })}
              hint="Added to Max HP"
            />
            <NumberField
              label="Custom FP"
              value={build.customFP}
              min={-9999}
              max={9999}
              onChange={customFP => patch({ customFP })}
              hint="Added to Max FP"
            />
            <NumberField
              label="Base Evade"
              value={build.baseEvade}
              min={-99}
              max={999}
              onChange={baseEvade => patch({ baseEvade })}
              hint="Uncapped"
            />
            <NumberField
              label="Bonus Evade"
              value={build.bonusEvade}
              min={0}
              max={50}
              onChange={bonusEvade => patch({ bonusEvade })}
              hint="Capped at 50 by the game"
            />
            <NumberField
              label="Current HP %"
              value={build.hpPercent}
              min={0}
              max={100}
              onChange={hpPercent => patch({ hpPercent })}
              hint="Drives HP-threshold effects"
            />
          </div>

          {/*
            * G6 and Korvara are separate worlds with separate content and, in
            * places, separate rules. The calculator reads this for one thing so
            * far: G6 raises every equipment upgrade ceiling by one.
            */}
          <div className="section">
            <SectionHead>World</SectionHead>
            <p className="hint" style={{ padding: '0 2px 8px' }}>
              G6 grants +1 to every weapon and torso upgrade ceiling. Korvara is the
              default, since it is the stricter of the two.
            </p>
            <SelectField
              label="World"
              value={build.world ?? DEFAULT_WORLD}
              options={[{ value: 'Korvara', label: 'Korvara' }, { value: 'G6', label: 'G6' }]}
              onChange={world => patch({ world: world as GameWorld })}
            />
          </div>
        </>
      ) : null}

      {section === 'elements' ? (
        <>
          <SectionHead aside={elementAdjusted ? `${elementAdjusted} adjusted` : undefined}>
            Elemental ATK and RES
          </SectionHead>
          <p className="hint" style={{ padding: '0 2px 8px' }}>
            Added to the computed figures in the rail. Resistance is a percentage; attack is flat.
          </p>
          <div>
            {ELEMENT_KEYS.map(element => (
              <ElementAdjuster
                key={element}
                element={element}
                attack={build.elementalATKAdjustments[element] ?? 0}
                resistance={build.elementalRESAdjustments[element] ?? 0}
                onAttack={value => patch({
                  elementalATKAdjustments: { ...build.elementalATKAdjustments, [element]: value },
                })}
                onResistance={value => patch({
                  elementalRESAdjustments: { ...build.elementalRESAdjustments, [element]: value },
                })}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--danger"
            style={{ marginTop: 9 }}
            onClick={() => {
              play('back');
              const zeroed = Object.fromEntries(ELEMENT_KEYS.map(element => [element, 0]));
              patch({
                elementalATKAdjustments: zeroed as Record<ElementKey, number>,
                elementalRESAdjustments: zeroed as Record<ElementKey, number>,
              });
            }}
          >
            Clear every adjustment
          </button>
        </>
      ) : null}
    </Modal>
  );
}

interface ElementAdjusterProps {
  element: ElementKey;
  attack: number;
  resistance: number;
  onAttack: (value: number) => void;
  onResistance: (value: number) => void;
}

/** One element's two adjusters, signed so a penalty reads as a penalty. */
function ElementAdjuster({ element, attack, resistance, onAttack, onResistance }: ElementAdjusterProps) {
  const colour = elementInk(element);
  return (
    <div className="eladjust" style={{ color: colour }}>
      <span className="element__gem" style={{ background: colour }} />
      <span className="eladjust__name">{element}</span>
      <span className="eladjust__group">
        <span className="eladjust__tag">ATK</span>
        <Signed value={attack} onChange={onAttack} label={`${element} attack adjustment`} />
      </span>
      <span className="eladjust__group">
        <span className="eladjust__tag">RES</span>
        <Signed value={resistance} onChange={onResistance} label={`${element} resistance adjustment`} suffix="%" />
      </span>
    </div>
  );
}

/**
 * A signed −/value/+ control.
 *
 * Separate from `Stepper`, which is for bounded ranks and disables at its ends;
 * an adjustment runs either way from zero and its sign is the point, so the value
 * is typed as well as stepped.
 */
function Signed({
  value,
  onChange,
  label,
  suffix = '',
}: { value: number; onChange: (value: number) => void; label: string; suffix?: string }) {
  const step = (delta: number) => {
    play('move');
    onChange(Math.max(-999, Math.min(999, value + delta)));
  };
  return (
    <span className="stat__stepper" role="group" aria-label={label}>
      <button type="button" className="step" onClick={() => step(-1)} aria-label={`${label} down`}>−</button>
      <input
        className="stat__input"
        type="number"
        value={value}
        aria-label={label}
        style={{ width: 52 }}
        onChange={event => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? Math.max(-999, Math.min(999, parsed)) : 0);
        }}
      />
      {suffix ? <span className="eladjust__tag">{suffix}</span> : null}
      <button type="button" className="step" onClick={() => step(1)} aria-label={`${label} up`}>+</button>
    </span>
  );
}
