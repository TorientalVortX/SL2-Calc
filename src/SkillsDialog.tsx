import { useEffect, useState } from 'react';
import { cx } from './design';
import DeckDialog from './DeckDialog';
import { DeckLabel } from './CommandDeck';
import { holdHandlers, useHoldRepeat } from './useHoldRepeat';
import {
  inertReason,
  isEffectModelled,
  SKILL_POINT_COST_PER_RANK,
  SKILL_POINTS_PER_CLASS,
  SKILL_POINTS_PER_CLASS_DESTINY,
  conditionalKey,
  signedAmount,
  destinyAllowsClassPair,
  effectAtRank,
  fpCostAtRank,
  groupSkills,
  loadSkillText,
  resetSkillRanksForClassSlot,
  setSkillRankForClassSlots,
  skillPointBudget,
  skillPointsSpent,
  skillPoolSpends,
  skillPoolsForClass,
  skillRanksForClassSlot,
  skillsForClassTree,
  summaryAtRank,
  type Skill,
  type SkillPoolSpend,
  type SkillRanks,
  type SkillText,
} from './domain/skills';

/** Which class slot's skills are on screen. */
type Slot = 'main' | 'sub';

export interface SkillsDialogProps {
  onClose: () => void;
  mainClass: string;
  subClass: string;
  /** Ranks per slot; skills reached by both slots form one shared sheet. */
  ranks: Record<Slot, SkillRanks>;
  onRanksChange: (ranks: Record<Slot, SkillRanks>) => void;
  /** Situational skill bonuses the user has switched on, keyed by `skillId:index`. */
  conditionals: Record<string, boolean>;
  onConditionalsChange: (next: Record<string, boolean>) => void;
  /** Destiny: 50 points instead of 35, at the cost of every tree but one. */
  destiny: boolean;
  budgetContext?: import('./domain/skills').SkillBudgetContext;
  onDestinyChange: (next: boolean) => void;
}

/** One pip per rank, filled up to the rank taken. */
function Pips({ rank, maxRank, small = false }: { rank: number; maxRank: number; small?: boolean }) {
  return (
    <span className="flex shrink-0 gap-[3px]">
      {Array.from({ length: maxRank }, (_, index) => (
        <span
          key={index}
          className={cx(
            'rounded-2',
            small ? 'h-3 w-[5px]' : 'h-3.5 w-[6px]',
            index < rank ? 'bg-info-solid' : 'bg-surface-control',
          )}
        />
      ))}
    </span>
  );
}

/** A selectable skill row: name, current effect, pips, rank. */
function SkillRow({
  skill,
  rank,
  selected,
  onSelect,
  small = false,
}: {
  skill: Skill;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  small?: boolean;
}) {
  const now = summaryAtRank(skill, rank);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-9 border p-2.5 text-left transition-colors',
        selected
          ? 'border-info bg-info-bg/30'
          : 'border-edge bg-surface-bar hover:border-edge-emphasis',
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cx('flex items-center gap-1.5 truncate font-semibold text-content-bright', small ? 'text-12' : 'text-13')}>
          {skill.name}
          {/* Marks the few skills that actually move a build stat, so the rest
              are visibly abilities rather than passive bonuses. */}
          {!inertReason(skill) && (
            <span title="Grants a bonus the calculator applies" className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
          )}
        </span>
        <span className="truncate font-mono text-11 text-content-ghost">{now}</span>
      </span>
      <Pips rank={rank} maxRank={skill.maxRank} small={small} />
      <span className="shrink-0 font-mono text-11 text-content-faint">{rank}/{skill.maxRank}</span>
    </button>
  );
}

/**
 * One class's skills, headed by the class they belong to.
 *
 * Each pool is its own section because a promoted class and its base class are
 * separate sources (a Ghost's sheet is not a Duelist's), and a flat list left no
 * way to tell which class a skill came from.
 */
function SkillPoolSection({
  pool,
  ranks,
  selectedId,
  onSelect,
}: {
  /** Carries its own budget: points are per class and do not pool across them. */
  pool: SkillPoolSpend;
  ranks: SkillRanks;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1 border-b border-edge-subtle pb-1.5">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="flex items-baseline gap-2">
            <span className="text-12 font-semibold text-content-bright">{pool.className}</span>
            <span className="text-10 uppercase tracking-wide text-content-ghost">
              {pool.role === 'base' ? 'Base class' : 'Class'}
            </span>
          </span>
          <span className={cx('font-mono text-10', pool.overspent ? 'text-negative' : 'text-content-faint')}>
            {pool.spent} / {pool.budget} · {pool.skills.length} skills
          </span>
        </div>
        <div className="h-[4px] overflow-hidden rounded-3 bg-surface-elevated">
          <div
            className={cx('h-full rounded-3 transition-[width] duration-150', pool.overspent ? 'bg-negative' : 'bg-info-solid')}
            style={{ width: `${Math.min(100, (pool.spent / Math.max(1, pool.budget)) * 100)}%` }}
          />
        </div>
      </div>
      {groupSkills(pool.skills).map(group => (
        <div key={group.category} className="flex flex-col gap-1.5">
          <DeckLabel>{group.category}</DeckLabel>
          {group.items.map(skill => (
            <SkillRow
              key={skill.id}
              skill={skill}
              rank={ranks[skill.id] ?? 0}
              selected={selectedId === skill.id}
              onSelect={() => onSelect(skill.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** The detail rail's rank stepper: press-and-hold like every other stepper. */
function RankStep({ label, glyph, disabled, onRepeat }: { label: string; glyph: string; disabled: boolean; onRepeat: () => void }) {
  const { start, stop } = useHoldRepeat(onRepeat);
  const handlers = disabled ? {} : holdHandlers(onRepeat, start, stop);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      {...handlers}
      className={cx(
        'grid h-[30px] w-[30px] shrink-0 select-none place-items-center rounded-7 text-17 transition-colors',
        disabled
          ? 'cursor-not-allowed bg-surface-control text-content-ghost opacity-50'
          : 'bg-surface-control text-content-secondary hover:bg-surface-active hover:text-content',
      )}
    >
      {glyph}
    </button>
  );
}

/**
 * Class skills.
 *
 * Built to the mockup's Skills modal: a slot switcher in the header, a budget bar,
 * a categorised list on the left and a detail rail on the right.
 *
 * The bar tracks all distinct class pools in the build. A base class reached by
 * both slots is one shared pool, so its spend and ranks stay visible on either
 * tab.
 */
export default function SkillsDialog({
  onClose,
  mainClass,
  subClass,
  ranks,
  onRanksChange,
  conditionals,
  onConditionalsChange,
  destiny,
  onDestinyChange,
  budgetContext = {},
}: SkillsDialogProps) {
  const [slot, setSlot] = useState<Slot>('main');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState<Map<string, SkillText> | null>(null);

  // Descriptions are three times the size of the mechanics, so they are fetched
  // when the dialog first opens rather than shipped in the main bundle.
  useEffect(() => {
    let live = true;
    loadSkillText().then(loaded => { if (live) setText(loaded); });
    return () => { live = false; };
  }, []);

  const className = slot === 'main' ? mainClass : subClass;
  // Pools stay separate: a promoted class and its base class are distinct sources,
  // and merging them hid which class a skill actually came from.
  const pools = skillPoolsForClass(className);
  const skills = skillsForClassTree(className);
  const slotRanks = skillRanksForClassSlot(mainClass, subClass, ranks, slot);
  /*
   * Each class has its own allowance, so the header reports the build's pools
   * rather than one number. A single spent/budget pair would hide the case that
   * matters: full in one class and untouched in another.
   */
  const allPools = skillPoolSpends(mainClass, subClass, ranks, destiny, budgetContext);
  const perClass = skillPointBudget(destiny);
  const spent = allPools.reduce((sum, pool) => sum + pool.spent, 0);
  const budget = allPools.reduce((sum, pool) => sum + pool.budget, 0);
  const spentPct = Math.min(100, (spent / Math.max(1, budget)) * 100);
  const overspent = allPools.some(pool => pool.overspent);
  const destinyBroken = destiny && !destinyAllowsClassPair(mainClass, subClass);
  /* Only the active slot's pools are shown, but each keeps its build-wide spend
     so the shared base class reads the same from either sheet. */
  const spendByClass = new Map(allPools.map(pool => [pool.className, pool]));

  /*
   * Only the active slot's classes are listed. The other slot is one click away
   * in the header switcher, and repeating it below duplicated that control while
   * making the sheet twice as long to scroll.
   */
  const selected = skills.find(skill => skill.id === selectedId) ?? null;
  const selectedRank = selected ? slotRanks[selected.id] ?? 0 : 0;

  const setRank = (next: number) => {
    if (!selected) return;
    const clamped = Math.max(0, Math.min(selected.maxRank, next));
    onRanksChange(setSkillRankForClassSlots(mainClass, subClass, ranks, slot, selected.id, clamped));
  };

  const detail = selected ? effectAtRank(selected, selectedRank) : null;
  const selectedText = selected ? text?.get(selected.id) ?? null : null;

  return (
    <DeckDialog
      title="Skills"
      onClose={onClose}
      maxWidth="max-w-[860px]"
      bare
      headerAside={
        <div className="flex shrink-0 gap-0.5 rounded-8 border border-edge bg-surface-raised p-[3px]">
          {([['main', 'Main', mainClass], ['sub', 'Sub', subClass]] as const).map(([id, label, cls]) => {
            const active = slot === id;
            const visibleRanks = skillRanksForClassSlot(mainClass, subClass, ranks, id);
            const count = skillPointsSpent(skillsForClassTree(cls), visibleRanks);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => { setSlot(id); setSelectedId(null); }}
                className={cx(
                  'flex items-baseline gap-1.5 rounded-6 px-2.5 py-2 text-11 font-semibold transition-colors',
                  active ? 'bg-info-bg text-content' : 'text-content-muted hover:text-content-secondary',
                )}
              >
                {label} · {cls}
                <span className="font-mono text-10 text-content-faint">{count}</span>
              </button>
            );
          })}
        </div>
      }
      headerActions={
        <button
          type="button"
          onClick={() => onRanksChange(resetSkillRanksForClassSlot(mainClass, subClass, ranks, slot))}
          className="text-11 text-content-faint transition-colors hover:text-negative"
        >
          Reset
        </button>
      }
    >
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-edge-subtle px-5 py-3">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="flex items-baseline gap-2.5">
            <span className="text-13 font-semibold text-content-bright">{className}</span>
            <button
              type="button"
              aria-pressed={destiny}
              onClick={() => onDestinyChange(!destiny)}
              title={`Destiny: ${SKILL_POINTS_PER_CLASS_DESTINY} points per class instead of ${SKILL_POINTS_PER_CLASS}, but both classes must share a base class.`}
              className={cx(
                'rounded-6 px-2 py-1 text-10 font-semibold uppercase tracking-wide transition-colors',
                destiny
                  ? 'bg-info-bg text-content'
                  : 'bg-surface-control text-content-faint hover:text-content-secondary',
              )}
            >
              Destiny
            </button>
          </span>
          <span className={cx('font-mono text-11', overspent ? 'text-negative' : 'text-content-muted')}>
            {spent} / {budget} points · {allPools.length} class pools
          </span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-3 bg-surface-elevated">
          <div
            className={cx('h-full rounded-3 transition-[width] duration-150', overspent ? 'bg-negative' : 'bg-info-solid')}
            style={{ width: `${spentPct}%` }}
          />
        </div>
        {destinyBroken && (
          <p className="text-10 leading-relaxed text-negative">
            Destiny confines the build to one class tree, but {mainClass} and {subClass} come from different ones.
          </p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_316px]">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto border-edge-subtle p-4 md:border-r">
          {pools.length === 0 ? (
            <p className="rounded-9 border border-edge bg-surface-bar p-4 text-12 leading-relaxed text-content-faint">
              The wiki lists no skills for {className || 'this class'}.
            </p>
          ) : (
            pools.map(pool => (
              <SkillPoolSection
                key={pool.className}
                pool={spendByClass.get(pool.className) ?? { ...pool, budget: perClass, spent: 0, overspent: false }}
                ranks={slotRanks}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))
          )}

        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-surface-sunken p-4">
          {!selected ? (
            <p className="text-11 leading-relaxed text-content-faint">
              Select a skill to see its description, rank effects and cost.
            </p>
          ) : (
            <>
              <div className="flex flex-col">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="text-17 font-bold leading-tight text-content">{selected.name}</span>
                  <DeckLabel>{selected.category}</DeckLabel>
                </div>
                <p className="mt-2 text-12 leading-relaxed text-content-muted">
                  {selectedText?.description ?? (text ? '' : 'Loading…')}
                </p>
                <div className="mt-2.5 flex items-baseline gap-2.5">
                  <DeckLabel className="text-info">{slot === 'main' ? 'Main class' : 'Sub class'}</DeckLabel>
                  {/* The class that actually owns the skill, which for a promoted
                      slot is often the base class rather than the slot's class. */}
                  <span className="font-mono text-10 text-content-faint">{selected.classes.join(', ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-10 text-content-faint">
                {fpCostAtRank(selected, Math.max(1, selectedRank)) != null && (
                  <span>{fpCostAtRank(selected, Math.max(1, selectedRank))} FP</span>
                )}
                {selected.momentum != null && <span>{selected.momentum} M</span>}
                {selectedText?.range && <span>Range {selectedText.range}</span>}
                {selectedText?.target && <span>{selectedText.target}</span>}
                {selectedText?.cooldown && <span>CD {selectedText.cooldown}</span>}
                {selectedText?.restriction && <span className="text-warning">{selectedText.restriction}</span>}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-10 border border-edge-muted bg-surface-bar p-3">
                <span className="text-11 text-content-muted">Rank</span>
                <div className="flex items-center gap-2.5">
                  <RankStep
                    label={`Lower ${selected.name} rank`}
                    glyph="−"
                    disabled={selectedRank === 0}
                    onRepeat={() => setRank(selectedRank - 1)}
                  />
                  <span className="min-w-[44px] text-center font-mono text-15 font-bold text-content">
                    {selectedRank}/{selected.maxRank}
                  </span>
                  <RankStep
                    label={`Raise ${selected.name} rank`}
                    glyph="+"
                    disabled={selectedRank >= selected.maxRank}
                    onRepeat={() => setRank(selectedRank + 1)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-px overflow-hidden rounded-10 border border-edge-subtle bg-edge-subtle">
                <div className="flex items-baseline justify-between gap-2.5 bg-surface-bar px-3 py-2.5">
                  <span className="text-12 text-content-muted">At this rank</span>
                  <span className="font-mono text-13 font-bold text-content">{detail?.now ?? '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2.5 bg-surface-bar px-3 py-2.5">
                  <span className="text-12 text-content-muted">Next rank</span>
                  <span className="font-mono text-13 font-bold text-positive">{detail?.next ?? 'Max'}</span>
                </div>
              </div>

              {/* Says plainly why a ranked skill left the stat block unchanged.
                  Most skills are abilities, not passive bonuses, and a rank pip
                  alone gives no clue which kind you are looking at. */}
              {inertReason(selected) && (
                <p className="rounded-8 border border-edge bg-surface-bar p-2.5 text-11 leading-relaxed text-content-faint">
                  <span className="text-content-muted">Does not change your stats.</span>{' '}
                  {inertReason(selected)}
                </p>
              )}

              {/* Situational bonuses are off until the user says the condition
                  holds, since most SL2 skill bonuses need a weapon, a position or a
                  buff window the calculator cannot see. */}
              {selected.effects.some(effect => effect.applies === 'conditional') && (
                <div className="flex flex-col gap-1.5">
                  <DeckLabel>Situational bonuses</DeckLabel>
                  {selected.effects.map((effect, index) => {
                    if (effect.applies !== 'conditional') return null;
                    const key = conditionalKey(selected.id, index);
                    const value = effect.valueByRank[Math.min(Math.max(1, selectedRank), effect.valueByRank.length) - 1];
                    const modelled = isEffectModelled(effect);
                    return (
                      <label
                        key={key}
                        title={modelled ? undefined : 'The calculator has no field for this bonus, so it is shown but not applied.'}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-8 border border-edge bg-surface-bar px-2.5 py-2 text-11 text-content-muted"
                      >
                        <span>
                          {signedAmount(value)} {effect.key}
                          {!modelled && <span className="ml-1.5 text-content-ghost">· not applied</span>}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(conditionals[key])}
                          disabled={selectedRank < 1 || !modelled}
                          onChange={event =>
                            onConditionalsChange({ ...conditionals, [key]: event.target.checked })
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedText?.extras?.length ? (
                <div className="flex flex-col gap-1">
                  <DeckLabel>Wiki notes</DeckLabel>
                  {selectedText.extras.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2 text-11 text-content-faint">
                      <span>{label}</span>
                      <span className="text-right font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="text-11 leading-relaxed text-content-ghost">
                {SKILL_POINT_COST_PER_RANK} point{SKILL_POINT_COST_PER_RANK === 1 ? '' : 's'} per rank.
                Ranks are stored per class slot, so switching slots keeps each sheet.
              </p>
            </>
          )}
        </div>
      </div>
    </DeckDialog>
  );
}
