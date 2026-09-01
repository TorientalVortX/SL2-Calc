import { cx } from './design';
import DeckDialog from './DeckDialog';
import { DeckLabel } from './CommandDeck';
import { modelledControl, racialSkillsFor, type RacialSkill } from './domain/racialSkills';

/** The build fields the racial toggles drive, grouped so this takes two props. */
export interface RacialValues {
  felidaeInstinct: boolean;
  lupineInstinct: boolean;
  sanguineCrest: boolean;
  redtailFortuneLevel: number;
  redtailDiceColor: 'red' | 'green' | 'yellow';
  karakuriYoukai: string;
}

export interface RacialSetters {
  felidaeInstinct: (v: boolean) => void;
  lupineInstinct: (v: boolean) => void;
  sanguineCrest: (v: boolean) => void;
  redtailFortuneLevel: (v: number) => void;
  redtailDiceColor: (v: 'red' | 'green' | 'yellow') => void;
  karakuriYoukai: (v: string) => void;
}

export interface RacialsDialogProps {
  onClose: () => void;
  subrace: string;
  values: RacialValues;
  set: RacialSetters;
  /** Shown alongside Instinct, which only applies below half HP. */
  hpPercent: number;
}

const KARAKURI_YOUKAI = ['None', 'Avian', 'Beast', 'Dragon', 'Fairy', 'Mystic', 'Night', 'Plant'];
const DICE = ['red', 'green', 'yellow'] as const;

const field = 'w-full rounded-7 border border-edge bg-surface-control px-2.5 py-2 text-12 text-content';

/**
 * Racial skills for the build's subrace.
 *
 * Every skill the race grants is listed, but only those the calculator actually
 * models carry a control. The rest are reference text: the wiki describes their
 * effects in prose with no numbers to read, so a toggle would do nothing and
 * imply otherwise.
 */
export default function RacialsDialog({ onClose, subrace, values, set, hpPercent }: RacialsDialogProps) {
  const skills = racialSkillsFor(subrace);
  const modelled = skills.filter(skill => modelledControl(skill));
  const reference = skills.filter(skill => !modelledControl(skill));

  const control = (skill: RacialSkill) => {
    const info = modelledControl(skill);
    if (!info) return null;

    if (info.kind === 'redtail') {
      // The three dice skills share one colour choice and one level.
      if (skill.id !== `${values.redtailDiceColor}-dice` && !DICE.some(d => skill.id === `${d}-dice`)) return null;
      const colour = skill.id.replace('-dice', '') as typeof DICE[number];
      const active = values.redtailDiceColor === colour;
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => set.redtailDiceColor(colour)}
            aria-pressed={active}
            className={cx(
              'rounded-6 px-2.5 py-1.5 text-11 font-semibold transition-colors',
              active ? 'bg-info-bg text-content' : 'bg-surface-control text-content-secondary hover:bg-surface-active',
            )}
          >
            {active ? 'Selected' : 'Select this die'}
          </button>
          {active && (
            <label className="flex items-center gap-2 text-11 text-content-muted">
              Fortune level
              <input
                type="number"
                min={1}
                max={6}
                value={values.redtailFortuneLevel}
                onChange={e => set.redtailFortuneLevel(Number(e.target.value))}
                className="w-16 rounded-6 border border-edge bg-surface-control px-2 py-1 text-center font-mono text-11"
              />
            </label>
          )}
        </div>
      );
    }

    if (info.kind === 'karakuri') {
      return (
        <label className="flex items-center gap-2 text-11 text-content-muted">
          Youkai type
          <select
            className={cx(field, 'w-40')}
            value={values.karakuriYoukai}
            onChange={e => set.karakuriYoukai(e.target.value)}
          >
            {KARAKURI_YOUKAI.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      );
    }

    const key = info.field as 'felidaeInstinct' | 'lupineInstinct' | 'sanguineCrest';
    const on = values[key];
    return (
      <label className="flex cursor-pointer items-center gap-2 text-11 text-content-muted">
        <input type="checkbox" checked={on} onChange={e => set[key](e.target.checked)} />
        Active
        {key !== 'sanguineCrest' && hpPercent > 50 && (
          <span className="text-content-ghost">· only below 50% HP (currently {hpPercent}%)</span>
        )}
      </label>
    );
  };

  const Skill = ({ skill, withControl }: { skill: RacialSkill; withControl: boolean }) => (
    <div className="flex flex-col gap-1.5 rounded-9 border border-edge bg-surface-bar p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-12 font-semibold text-content-bright">{skill.name}</span>
        <span className="font-mono text-10 text-content-faint">
          {skill.passive ? 'Passive' : 'Active'}
          {skill.fp && ` · ${skill.fp} FP`}
          {skill.momentum && ` · ${skill.momentum} M`}
          {skill.range && ` · Range ${skill.range}`}
          {` · ${skill.grantedTo}`}
        </span>
      </div>
      <p className="text-11 leading-relaxed text-content-muted">{skill.description || '—'}</p>
      {withControl && (
        <span className="font-mono text-10 text-info/80">
          Applied: {modelledControl(skill)?.hint}
        </span>
      )}
      {withControl ? control(skill) : (
        <span className="font-mono text-10 text-content-ghost">Reference only, no calculator effect</span>
      )}
    </div>
  );

  return (
    <DeckDialog title="Racials" onClose={onClose} maxWidth="max-w-[760px]" bare>
      <div className="flex shrink-0 items-baseline justify-between gap-2.5 border-b border-edge-subtle px-5 py-3">
        <span className="text-13 font-semibold text-content-bright">{subrace}</span>
        <span className="font-mono text-11 text-content-muted">
          {skills.length} racial skill{skills.length === 1 ? '' : 's'} · {modelled.length} affect the build
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {modelled.length > 0 && (
          <div className="flex flex-col gap-2">
            <DeckLabel>Applied to this build</DeckLabel>
            {modelled.map(skill => <Skill key={skill.id} skill={skill} withControl />)}
          </div>
        )}

        {reference.length > 0 && (
          <div className="flex flex-col gap-2">
            <DeckLabel className="text-content-ghost">Reference</DeckLabel>
            <p className="text-11 leading-relaxed text-content-faint">
              {/* Said once here rather than repeated on every card. */}
              The wiki describes these in prose with no numbers to read, so they are
              listed for reference rather than modelled.
            </p>
            {reference.map(skill => <Skill key={skill.id} skill={skill} withControl={false} />)}
          </div>
        )}

        {skills.length === 0 && (
          <p className="rounded-9 border border-edge bg-surface-bar p-4 text-12 text-content-faint">
            The wiki lists no racial skills for {subrace}.
          </p>
        )}
      </div>
    </DeckDialog>
  );
}
