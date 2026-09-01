import { useMemo, useState } from 'react';
import { cx } from './design';
import DeckDialog from './DeckDialog';
import { DeckLabel } from './CommandDeck';
import {
  YOUKAI,
  YOUKAI_RACES,
  affinityRank,
  canInstall,
  ascendedYoukaiFor,
  contractYoukai,
  evokedSlots,
  grantedYoukaiSkills,
  youkaiById,
  youkaiStats,
  YOUKAI_SLOT_LABEL,
  YOUKAI_SLOT_SOURCE,
  type Youkai,
} from './domain/youkai';
import type { SkillRanks, StatKey, YoukaiState } from './types';

export interface YoukaiDialogProps {
  onClose: () => void;
  state: YoukaiState;
  onChange: (next: YoukaiState) => void;
  /** Merged skill ranks: Sync-Mind, Install and the Affinity skills are read from here. */
  ranks: SkillRanks;
  /** How many Youkai this build may contract, from the build's Faith. */
  youkaiCap: number;
}

const STAT_ORDER: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san'];

/* The slot vocabulary lives in `domain/youkai` so the Aether sheet names the
   slots identically rather than restating them. */
const SLOT_LABEL = YOUKAI_SLOT_LABEL;
const SLOT_SOURCE = YOUKAI_SLOT_SOURCE;

/**
 * Youkai contracts for Summoner builds.
 *
 * The screen is built around the one rule that is easy to get wrong: which of a
 * Youkai's three skills the Summoner actually holds. Sync-Mind lends the two
 * Evoke slots across every contract, while the Main skill needs that Youkai to be
 * installed, so each skill row states its own source rather than leaving the
 * player to work out the hierarchy.
 */
export default function YoukaiDialog({ onClose, state, onChange, ranks, youkaiCap }: YoukaiDialogProps) {
  const [race, setRace] = useState<string>(YOUKAI_RACES[0]);
  const [selectedId, setSelectedId] = useState<string | null>(state.contracted[0] ?? null);

  const syncMind = ranks['sync-mind'] ?? 0;
  const evoked = new Set(evokedSlots(syncMind));
  const installable = canInstall(state, ranks);
  const granted = useMemo(() => grantedYoukaiSkills(state, ranks), [state, ranks]);

  const selected = youkaiById(selectedId) ?? null;
  const atCap = state.contracted.length >= youkaiCap;

  const toggleContract = (youkai: Youkai) => {
    const has = state.contracted.includes(youkai.id);
    if (has) {
      onChange({
        contracted: state.contracted.filter(id => id !== youkai.id),
        // Releasing the installed Youkai must clear the install, or the build
        // would keep wearing a body it no longer has a contract for.
        installed: state.installed === youkai.id ? null : state.installed,
      });
    } else {
      const familyContract = state.contracted.find(id => {
        const current = youkaiById(id);
        return current?.id === youkai.baseFormId || current?.baseFormId === youkai.id;
      });
      if (!atCap || familyContract) onChange(contractYoukai(state, youkai.id));
    }
  };

  const toggleInstall = (youkai: Youkai) => {
    onChange({ ...state, installed: state.installed === youkai.id ? null : youkai.id });
  };

  return (
    <DeckDialog
      title="Youkai"
      onClose={onClose}
      maxWidth="max-w-[900px]"
      bare
      headerAside={
        <div className="flex shrink-0 gap-0.5 overflow-x-auto rounded-8 border border-edge bg-surface-raised p-[3px]">
          {YOUKAI_RACES.map(name => (
            <button
              key={name}
              type="button"
              aria-pressed={race === name}
              onClick={() => setRace(name)}
              className={cx(
                'rounded-6 px-2.5 py-2 text-11 font-semibold transition-colors',
                race === name ? 'bg-info-bg text-content' : 'text-content-muted hover:text-content-secondary',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      }
      headerActions={
        <button
          type="button"
          onClick={() => onChange({ contracted: [], installed: null })}
          className="text-11 text-content-faint transition-colors hover:text-negative"
        >
          Reset
        </button>
      }
    >
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-edge-subtle px-5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <span className="text-13 font-semibold text-content-bright">
            {state.contracted.length} / {youkaiCap} contracted
          </span>
          <span className="font-mono text-11 text-content-muted">
            {syncMind > 0
              ? `Sync-Mind ${syncMind} · ${[...evoked].map(slot => SLOT_LABEL[slot]).join(' + ')} on every contract`
              : 'Sync-Mind 0 · no evoked skills'}
          </span>
        </div>
        {state.installed && (
          <span className="font-mono text-11 text-caution-strong">
            Installed: {youkaiById(state.installed)?.name}. Base stats replaced except FAI, SAN and APT; Affinity capped at +1
          </span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_330px]">
        <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto border-edge-subtle p-4 md:border-r">
          <DeckLabel>
            {race} · Affinity rank {affinityRank(race, ranks)}
          </DeckLabel>
          {YOUKAI.filter(youkai => youkai.race === race).map(youkai => {
            const contracted = state.contracted.includes(youkai.id);
            const installed = state.installed === youkai.id;
            const stats = youkaiStats(youkai, ranks, installed);
            const ascended = ascendedYoukaiFor(youkai);
            const blockedByAscended = !youkai.baseFormId && Boolean(ascended && state.contracted.includes(ascended.id));
            const familyContract = state.contracted.find(id => {
              const current = youkaiById(id);
              return current?.id === youkai.baseFormId || current?.baseFormId === youkai.id;
            });
            const replacesFamily = Boolean(youkai.baseFormId && familyContract);
            return (
              <div
                key={youkai.id}
                className={cx(
                  'flex flex-col gap-2 rounded-9 border p-2.5 transition-colors',
                  selectedId === youkai.id ? 'border-info bg-info-bg/30' : 'border-edge bg-surface-bar',
                )}
              >
                <button type="button" onClick={() => setSelectedId(youkai.id)} className="flex items-center justify-between gap-3 text-left">
                  <span className="truncate text-13 font-semibold text-content-bright">{youkai.name}</span>
                  <span className="shrink-0 font-mono text-10 text-content-faint">
                    {(['str', 'wil', 'ski', 'cel'] as StatKey[]).map(stat => stats[stat] ?? 0).join('/')}
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleContract(youkai)}
                    disabled={!contracted && ((atCap && !replacesFamily) || blockedByAscended)}
                    title={blockedByAscended ? `${ascended?.name} already replaces this contract.` : undefined}
                    className={cx(
                      'rounded-6 px-2.5 py-1.5 text-11 font-semibold transition-colors',
                      contracted
                        ? 'bg-info-bg text-content'
                        : (atCap && !replacesFamily) || blockedByAscended
                          ? 'cursor-not-allowed bg-surface-control text-content-ghost opacity-50'
                          : 'bg-surface-control text-content-secondary hover:bg-surface-active',
                    )}
                  >
                    {contracted ? 'Contracted' : blockedByAscended ? 'Ascended' : replacesFamily ? 'Ascend' : atCap ? 'At cap' : 'Contract'}
                  </button>
                  {contracted && (
                    <button
                      type="button"
                      onClick={() => toggleInstall(youkai)}
                      disabled={!installable}
                      title={installable ? undefined : 'Requires the Install skill at rank 1 or higher.'}
                      className={cx(
                        'rounded-6 px-2.5 py-1.5 text-11 font-semibold transition-colors',
                        installed
                          ? 'bg-caution-bg text-caution-strong'
                          : installable
                            ? 'bg-surface-control text-content-secondary hover:bg-surface-active'
                            : 'cursor-not-allowed bg-surface-control text-content-ghost opacity-50',
                      )}
                    >
                      {installed ? 'Installed' : 'Install'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-surface-sunken p-4">
          {!selected ? (
            <p className="text-11 leading-relaxed text-content-faint">
              Select a Youkai to see its stats and skills.
            </p>
          ) : (
            <>
              <div>
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="text-17 font-bold leading-tight text-content">{selected.name}</span>
                  <DeckLabel>{selected.race}</DeckLabel>
                </div>
                <p className="mt-1 font-mono text-10 text-content-faint">
                  Level 60{affinityRank(selected.race, ranks, state.installed === selected.id) > 0
                    ? ` · Affinity +${affinityRank(selected.race, ranks, state.installed === selected.id)}`
                    : ''}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-x-3 gap-y-1 font-mono text-11">
                {STAT_ORDER.map(stat => {
                  const value = youkaiStats(selected, ranks, state.installed === selected.id)[stat] ?? 0;
                  return (
                    <div key={stat} className="flex justify-between gap-1">
                      <span className="uppercase text-content-ghost">{stat}</span>
                      <span className={value > 0 ? 'text-content' : 'text-content-ghost'}>{value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2">
                <DeckLabel>Skills</DeckLabel>
                {selected.skills.map(skill => {
                  const held = granted.some(g => g.youkaiId === selected.id && g.name === skill.name);
                  // What the slot requires, not what the build currently has: an
                  // Evoke-Passive is still a Sync-Mind 2 skill when Sync-Mind
                  // sits at rank 1, and saying "Install only" would send the
                  // player after the wrong skill.
                  const source = SLOT_SOURCE[skill.slot];
                  return (
                    <div
                      key={skill.name}
                      className={cx(
                        'flex flex-col gap-1 rounded-8 border p-2.5',
                        held ? 'border-info bg-info-bg/20' : 'border-edge bg-surface-bar',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-12 font-semibold text-content-bright">{skill.name}</span>
                        <span className="shrink-0 font-mono text-10 text-content-faint">{SLOT_LABEL[skill.slot]}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2.5 font-mono text-10 text-content-faint">
                        {skill.passive ? <span>Passive</span> : <span>{skill.fp} FP</span>}
                        {skill.momentum != null && <span>{skill.momentum} M</span>}
                        {skill.range && <span>Range {skill.range}</span>}
                        {skill.area && <span>{skill.area}</span>}
                        {skill.domain && <span>{skill.domain}</span>}
                      </div>
                      <p className="text-11 leading-relaxed text-content-muted">{skill.description}</p>
                      <span className={cx('font-mono text-10', held ? 'text-info' : 'text-content-ghost')}>
                        {held ? `You have this · ${source}` : source}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-11 leading-relaxed text-content-ghost">
                A Youkai casting its own skill pays half the listed FP. Costs shown are at Youkai level 60.
              </p>
            </>
          )}
        </div>
      </div>
    </DeckDialog>
  );
}
