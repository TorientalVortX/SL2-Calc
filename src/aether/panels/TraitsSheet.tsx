import { useMemo, useState } from 'react';
import type { StatKey } from '../../types';
import {
  type Trait,
  traitCheckTarget,
  traitCost,
  traitEligibility,
  historyTraitFor,
  traitsByCategory,
  uncheckedRequirements,
} from '../../domain/traits';
import { SectionHead } from '../ui/Panel';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';

/**
 * The trait sheet.
 *
 * Requirements are read off base stats (racial line plus invested points, with
 * no APT or equipment), which is the rule the wiki states and the same one
 * `traitCheckTarget` gives the optimizer. A trait already taken is never hidden
 * when its requirement stops being met: it stays visible and marked, because
 * moving a point out of STR is exactly how a build breaks, and the sheet has to
 * show that rather than quietly drop the row.
 */
export function TraitsSheet({ builder }: { builder: Builder }) {
  const { build, status, dispatch } = builder;
  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const onKeys = useListNavigation(1);

  const target = useMemo(() => traitCheckTarget(build), [build]);
  const taken = useMemo(() => {
    const ids = new Set(build.traits ?? []);
    const history = historyTraitFor(build.history);
    if (history) ids.add(history.id);
    return ids;
  }, [build.traits, build.history]);
  const needle = query.trim().toLowerCase();
  const remaining = status.traitsBudget - status.traitsSpent;

  const groups = useMemo(() => traitsByCategory().map(group => ({
    category: group.category,
    traits: group.traits.filter(trait => {
      if (trait.handModelled && !trait.historyKey) return false;
      if (needle && !trait.name.toLowerCase().includes(needle) && !trait.effect.toLowerCase().includes(needle)) return false;
      if (!availableOnly) return true;
      return taken.has(trait.id) || traitEligibility(trait, target).eligible;
    }),
  })).filter(group => group.traits.length > 0), [needle, availableOnly, taken, target]);

  const toggle = (trait: Trait, eligible: boolean) => {
    const isTaken = taken.has(trait.id);
    if (!isTaken && !eligible) {
      play('deny');
      return;
    }
    play(isTaken ? 'back' : 'select');
    dispatch({ type: 'trait', id: trait.id, taken: !isTaken });
  };

  return (
    <>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search traits…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Search traits"
        />
        <span className={`chip ${remaining < 0 ? 'chip--alert' : 'chip--gold'}`}>
          {remaining} left
        </span>
        <button
          type="button"
          className={`btn btn--ghost btn--icon ${availableOnly ? 'is-active' : ''}`}
          onClick={() => { play('select'); setAvailableOnly(value => !value); }}
        >
          Available
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--danger"
          onClick={() => { play('back'); dispatch({ type: 'traits-clear' }); }}
        >
          Reset
        </button>
      </div>

      <div onKeyDown={onKeys}>
        {groups.length === 0 ? (
          <div className="empty">
            <span className="eyebrow">Nothing to show</span>
            <span>No trait matches those filters at this stat spread.</span>
          </div>
        ) : groups.map(group => (
          <div className="section" key={group.category}>
            <SectionHead aside={group.category === 'History' ? 'Choose one' : `${group.traits.length}`}>{group.category}</SectionHead>
            {group.traits.map(trait => {
              const { eligible, reasons } = traitEligibility(trait, target);
              const isTaken = taken.has(trait.id);
              const unchecked = uncheckedRequirements(trait);
              const cost = traitCost(trait, build.race);
              return (
                <div
                  key={trait.id}
                  className={`entry ${isTaken ? 'is-taken' : ''} ${!eligible && !isTaken ? 'is-blocked' : ''}`}
                  data-nav
                  tabIndex={0}
                  role="checkbox"
                  aria-checked={isTaken}
                  aria-label={trait.name}
                  title={[trait.effect, trait.requirements.raw && `Requires: ${trait.requirements.raw}`]
                    .filter(Boolean).join('\n\n')}
                  onClick={() => toggle(trait, eligible)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggle(trait, eligible);
                    }
                  }}
                >
                  <div className="entry__main">
                    <div className="entry__name">
                      {trait.name}
                      {statChips(trait)}
                      {unchecked.length ? <span className="chip" title={`Not verified: ${unchecked.join('; ')}`}>unverified</span> : null}
                    </div>
                    <div className="entry__sub">
                      {!eligible && !isTaken ? reasons.join(' · ') : trait.effect}
                    </div>
                  </div>
                  <div className="entry__rank">
                    <span className="chip">{cost === 0 ? 'free' : `${cost} pt`}</span>
                    <span className="toggle__mark" style={isTaken ? { borderColor: 'var(--gold-200)' } : undefined}>
                      {isTaken ? <span style={{ position: 'absolute', inset: 2, background: 'var(--gold-200)' }} /> : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/** The stat grant a trait carries, shown inline so the list is comparable. */
function statChips(trait: Trait) {
  const entries = Object.entries(trait.statBonuses) as Array<[StatKey, number]>;
  if (!entries.length) return null;
  return (
    <span className="chip chip--gold">
      {entries.map(([stat, value]) => `${stat.toUpperCase()} ${value > 0 ? '+' : ''}${value}`).join(' ')}
    </span>
  );
}
