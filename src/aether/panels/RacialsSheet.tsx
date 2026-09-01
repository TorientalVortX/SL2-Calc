import type { BuildState } from '../../types';
import { modelledControl, racialSkillsFor } from '../../domain/racialSkills';
import { SectionHead } from '../ui/Panel';
import { SelectField, Toggle } from '../ui/controls';
import type { Builder } from '../state/useBuilder';

const KARAKURI_TYPES = ['None', 'Avian', 'Beast', 'Dragon', 'Fairy', 'Mystic', 'Night', 'Plant'];
const DICE_COLORS: Array<{ value: 'red' | 'green' | 'yellow'; label: string }> = [
  { value: 'red', label: 'Red: Hit & Critical' },
  { value: 'green', label: 'Green: luck status chance' },
  { value: 'yellow', label: 'Yellow: Evade & Crit Evade' },
];

/**
 * Racial skills for the chosen subrace.
 *
 * Almost none of the 101 racial skills carry a parseable number (their effects
 * are conditional prose), so this sheet is honest about the split: the handful
 * the calculator models get a live control, and the rest are listed as reference
 * rather than given a toggle that would do nothing. An empty list is a real
 * answer for a subrace with no racial skills, not a filter that is too strict.
 */
export function RacialsSheet({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const skills = racialSkillsFor(build.subrace);

  const patch = (change: Partial<BuildState>) => dispatch({ type: 'field', patch: change });

  const modelled = skills.filter(skill => modelledControl(skill));
  const reference = skills.filter(skill => !modelledControl(skill));
  const hasRedtail = modelled.some(skill => modelledControl(skill)?.kind === 'redtail');
  const hasKarakuri = modelled.some(skill => modelledControl(skill)?.kind === 'karakuri');

  return (
    <>
      <div className="section">
        <SectionHead aside={build.subrace}>Modelled by the calculator</SectionHead>

        {modelled.length === 0 ? (
          <div className="hint" style={{ padding: '4px 9px' }}>
            None of this subrace’s racial skills change a number the calculator tracks.
          </div>
        ) : null}

        <div className="stack--tight">
          {modelled
            .filter(skill => modelledControl(skill)?.kind === 'toggle')
            .map(skill => {
              const control = modelledControl(skill)!;
              const field = control.field as 'felidaeInstinct' | 'lupineInstinct' | 'sanguineCrest';
              return (
                <Toggle
                  key={skill.id}
                  on={Boolean(build[field])}
                  hint={control.hint}
                  onChange={value => patch({ [field]: value } as Partial<BuildState>)}
                >
                  {skill.name} <span className="dim" style={{ fontSize: 11 }}>({control.hint})</span>
                </Toggle>
              );
            })}
        </div>

        {hasRedtail ? (
          <div className="grid-2" style={{ marginTop: 6 }}>
            <SelectField
              label="Dice showing"
              value={build.redtailDiceColor}
              options={DICE_COLORS}
              onChange={value => patch({ redtailDiceColor: value as BuildState['redtailDiceColor'] })}
            />
            <SelectField
              label="Fortune level"
              value={String(build.redtailFortuneLevel)}
              options={[1, 2, 3, 4, 5, 6].map(level => ({
                value: String(level),
                label: level === 1 ? '1 (penalty)' : String(level),
              }))}
              onChange={value => patch({ redtailFortuneLevel: Number(value) })}
              title="The multiplier rises by one per 10 scaled SAN, to a maximum of five."
            />
          </div>
        ) : null}

        {hasKarakuri ? (
          <div style={{ marginTop: 6 }}>
            <SelectField
              label="Karakuri body"
              value={build.karakuriYoukai}
              options={KARAKURI_TYPES.map(type => ({ value: type, label: type }))}
              onChange={value => patch({ karakuriYoukai: value })}
              title="The Youkai type sets stat offsets and a paired elemental resistance."
            />
          </div>
        ) : null}
      </div>

      <div className="section">
        <SectionHead aside={`${reference.length}`}>Reference</SectionHead>
        {reference.length === 0 ? (
          <div className="hint" style={{ padding: '4px 9px' }}>
            {skills.length === 0
              ? `${build.subrace} has no racial skills.`
              : 'Every racial skill for this subrace has a control above.'}
          </div>
        ) : (
          reference.map(skill => (
            <div className="entry" key={skill.id} tabIndex={0} data-nav>
              <div className="entry__main">
                <div className="entry__name">
                  {skill.name}
                  <span className="chip">{skill.passive ? 'passive' : 'active'}</span>
                  {skill.fp ? <span className="chip">{skill.fp} FP</span> : null}
                </div>
                <div className="entry__sub">{skill.description}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="divider" />

      <div className="section">
        <SectionHead>Universal options</SectionHead>
        <div className="stack--tight">
          <Toggle on={build.luminaryElement} onChange={value => patch({ luminaryElement: value })}
            hint="Your star sign's element scales from raw WIL instead of its own stat; every other element loses its WIL share.">
            Luminary Element
          </Toggle>
          <Toggle on={build.warwalk} onChange={value => patch({ warwalk: value })} hint="+30 Max HP and +30 Max FP.">
            Warwalk
          </Toggle>
          <Toggle on={build.giantGene} onChange={value => patch({ giantGene: value })} hint="+10% Max HP, −10 Evade.">
            Giant Gene
          </Toggle>
          <Toggle on={build.powerOfNormalcy} onChange={value => patch({ powerOfNormalcy: value })}
            hint="Base classes only: +4 to every stat but APT, doubled when monoclassed.">
            Power of Normalcy
          </Toggle>
          <Toggle on={build.persistenceOfNormalcy} onChange={value => patch({ persistenceOfNormalcy: value })}
            hint="Base classes only: +100 Max HP, doubled when monoclassed.">
            Persistence of Normalcy
          </Toggle>
        </div>

        <div className="grid-2" style={{ marginTop: 8 }}>
          <label className="field">
            <span className="field__label">Current HP %</span>
            <input
              className="input num"
              type="number"
              min={1}
              max={100}
              value={build.hpPercent}
              onChange={event => patch({ hpPercent: Math.max(1, Math.min(100, Number(event.target.value) || 0)) })}
            />
          </label>
          <div className="field">
            <span className="field__label">Why it matters</span>
            <span className="hint">
              Instinct and Rising Game read missing HP, so the sheet needs to know where you are standing.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
