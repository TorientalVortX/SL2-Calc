import { useMemo, useState } from 'react';
import type { SkillRanks, StatKey, Youkai, YoukaiSkill } from '../../types';
import { STAT_COLORS, onDark } from '../../data/colors';
import { getBaseClass } from '../../domain/buildEvaluation';
import { canContractYoukai } from '../../domain/loadout';
import { mergeSkillRanks, skillById } from '../../domain/skills';
import {
  YOUKAI,
  YOUKAI_RACES,
  YOUKAI_SLOT_LABEL,
  YOUKAI_SLOT_SOURCE,
  affinityRank,
  affinitySkillId,
  ascendedYoukaiFor,
  canInstall,
  evokedSlots,
  grantedYoukaiSkills,
  youkaiById,
  youkaiRaceBaseStats,
  youkaiStats,
} from '../../domain/youkai';
import { SectionHead } from '../ui/Panel';
import { Modal } from '../ui/Modal';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import { STAT_KEYS } from '../state/build';
import type { Builder } from '../state/useBuilder';

/**
 * Youkai contracts and Install.
 *
 * Two rules shape the sheet, and both come from the domain rather than from here:
 *
 * - **One form per family.** An ascended Youkai replaces the base it grew from,
 *   so contracting either resolves through `contractYoukai` instead of being
 *   pushed onto the list.
 * - **Install substitutes the race's base stat line, not the creature's.** A
 *   Byakko's own level 60 STR is 56 against a Redtail's 3; using it would make
 *   Install a fifty-point racial swing. The preview below shows the line that is
 *   actually applied.
 *
 * Contracting is a Summoner-tree activity. A build with no Summoner slot keeps
 * whatever contracts it already had (they are not deleted), but cannot add more.
 */
export function YoukaiSheet({ builder }: { builder: Builder }) {
  const { build, evaluation, dispatch } = builder;
  const [query, setQuery] = useState('');
  const [race, setRace] = useState<string | null>(null);
  // Which Youkai's skill card is open. A dialog rather than a third column: the
  // three skills carry full rules text, and the sheet already owns its width.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const onKeys = useListNavigation(1);

  const ranks = useMemo(() => mergeSkillRanks(build.skillRanks), [build.skillRanks]);
  const contracted = build.youkai.contracted;
  const cap = evaluation.derived.youkaiCap;
  const allowed = canContractYoukai(build, getBaseClass);
  const installable = canInstall(build.youkai, ranks);

  const granted = useMemo(() => grantedYoukaiSkills(build.youkai, ranks), [build.youkai, ranks]);
  const syncMind = ranks['sync-mind'] ?? 0;

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => YOUKAI.filter(youkai => {
    if (race && youkai.race !== race) return false;
    if (!needle) return true;
    return youkai.name.toLowerCase().includes(needle) || youkai.race.toLowerCase().includes(needle);
  }), [race, needle]);

  const byRace = useMemo(() => {
    const map = new Map<string, Youkai[]>();
    for (const youkai of visible) {
      const list = map.get(youkai.race) ?? [];
      list.push(youkai);
      map.set(youkai.race, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  const toggle = (youkai: Youkai) => {
    const has = contracted.includes(youkai.id);
    if (!has && !allowed) { play('deny'); return; }
    if (!has && contracted.length >= cap) { play('deny'); return; }
    play(has ? 'back' : 'select');
    dispatch({ type: 'youkai-contract', id: youkai.id, contracted: !has });
  };

  return (
    <>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search Youkai…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Search Youkai"
        />
        <span className={`chip ${contracted.length > cap ? 'chip--alert' : 'chip--gold'}`}>
          {contracted.length}/{cap} contracted
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--danger"
          onClick={() => { play('back'); dispatch({ type: 'youkai-clear' }); }}
        >
          Release all
        </button>
      </div>

      {!allowed ? (
        <div className="warnings">
          Contracting is a Summoner activity. Set the main or sub class to Summoner or one of its
          promotions to take new contracts. Existing ones are kept.
        </div>
      ) : null}

      {/* Cap and legality problems are surfaced once, by the panel above every sheet. */}

      <div className="inline" style={{ gap: 4, paddingBottom: 8 }}>
        <button
          type="button"
          className={`btn btn--ghost btn--icon ${race === null ? 'is-active' : ''}`}
          onClick={() => { play('move'); setRace(null); }}
        >
          All
        </button>
        {YOUKAI_RACES.map(name => (
          <button
            key={name}
            type="button"
            className={`btn btn--ghost btn--icon ${race === name ? 'is-active' : ''}`}
            onClick={() => { play('move'); setRace(race === name ? null : name); }}
            title={`Affinity: ${skillById(affinitySkillId(name))?.name ?? affinitySkillId(name)}`}
          >
            {name}
            {affinityRank(name, ranks) > 0 ? (
              <span className="num" style={{ color: 'var(--gold-300)' }}> {affinityRank(name, ranks)}</span>
            ) : null}
          </button>
        ))}
      </div>

      {contracted.length ? (
        <div className="section">
          <SectionHead aside={installable ? 'Install ready' : 'Install needs rank 1'}>Contracted</SectionHead>
          <div className="stack--tight">
            {contracted.map(id => {
              const youkai = youkaiById(id);
              if (!youkai) return null;
              const installed = build.youkai.installed === id;
              return (
                <div className={`entry ${installed ? 'is-taken' : ''}`} key={id}>
                  <div className="entry__main">
                    <div className="entry__name">
                      {youkai.name}
                      <span className="chip">{youkai.race}</span>
                      {youkai.baseFormId ? <span className="chip chip--gold">ascended</span> : null}
                    </div>
                    <div className="entry__sub">{statSummary(youkaiStats(youkai, ranks))}</div>
                  </div>
                  <div className="entry__rank">
                    <button
                      type="button"
                      className="step"
                      aria-label={`Skills of ${youkai.name}`}
                      title={`${youkai.name}'s three skills`}
                      onClick={() => { play('select'); setInspecting(youkai.id); }}
                    >
                      ?
                    </button>
                    <button
                      type="button"
                      className={`btn btn--ghost btn--icon ${installed ? 'is-active' : ''}`}
                      disabled={!installable}
                      title={installable
                        ? 'Install replaces your racial base stats with this Youkai’s race line.'
                        : 'Install requires rank 1 in the Install skill and a contracted Youkai.'}
                      onClick={() => {
                        play(installed ? 'back' : 'confirm');
                        dispatch({ type: 'youkai-install', id: installed ? null : id });
                      }}
                    >
                      {installed ? 'Installed' : 'Install'}
                    </button>
                    <button
                      type="button"
                      className="step"
                      aria-label={`Release ${youkai.name}`}
                      onClick={() => { play('back'); dispatch({ type: 'youkai-contract', id, contracted: false }); }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {build.youkai.installed ? <InstallPreview builder={builder} /> : null}

          <div className="hint" style={{ marginTop: 6 }}>
            Sync-Mind rank {syncMind} lends {syncMind >= 2 ? 'both evoke slots' : syncMind >= 1 ? 'the active evoke slot' : 'no evoke slots'}
            {' '}across every contract, and Install adds the Main skill of whichever Youkai is worn.
          </div>
        </div>
      ) : null}

      {/*
        * What the Summoner personally holds, as opposed to what is contracted.
        * This is the question the contract list cannot answer: Sync-Mind decides
        * which slots come across, so two identical rosters can grant nothing and
        * six skills. Kept above the roster because it is the sheet's payload.
        */}
      {contracted.length ? (
        <div className="section">
          <SectionHead aside={`${granted.length}`}>Skills you hold</SectionHead>
          {granted.length === 0 ? (
            <div className="empty">
              <span className="eyebrow">Nothing granted</span>
              <span>
                Contracts alone grant no skills. Take Sync-Mind rank 1 for every contract's
                Evoke-Active, rank 2 for its Evoke-Passive, or Install a Youkai for its Main skill.
              </span>
            </div>
          ) : (
            <div className="stack--tight">
              {granted.map(skill => (
                <SkillCard
                  key={`${skill.youkaiId}-${skill.name}`}
                  skill={skill}
                  held
                  attribution={`${skill.youkaiName} · via ${skill.via === 'install' ? 'Install' : 'Sync-Mind'}`}
                  onOpenYoukai={() => { play('select'); setInspecting(skill.youkaiId); }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="section" onKeyDown={onKeys}>
        <SectionHead aside={`${visible.length} of ${YOUKAI.length}`}>Roster</SectionHead>
        {byRace.length === 0 ? (
          <div className="empty">
            <span className="eyebrow">No match</span>
            <span>No Youkai matches those filters.</span>
          </div>
        ) : byRace.map(([raceName, list]) => (
          <div key={raceName} className="stack--tight" style={{ marginBottom: 6 }}>
            <div className="eyebrow" style={{ padding: '4px 9px 1px', fontSize: 9 }}>
              {raceName} <span className="dim">{list.length}</span>
            </div>
            {list.map(youkai => {
              const has = contracted.includes(youkai.id);
              /*
               * `ascendedYoukaiFor` resolves the *family's* ascended form, so
               * asking it about an already-ascended Youkai returns that Youkai
               * itself. Only a base form can be said to ascend into something.
               */
              const ascended = youkai.baseFormId ? undefined : ascendedYoukaiFor(youkai.id);
              const full = !has && contracted.length >= cap;
              /*
               * A focusable group rather than one big button, because the row now
               * carries two actions: contracting, and opening the skill card. A
               * button cannot nest a button, and the skills are the reason most
               * players open this sheet at all.
               */
              return (
                <div
                  key={youkai.id}
                  data-nav
                  tabIndex={0}
                  role="button"
                  aria-pressed={has}
                  aria-label={`${youkai.name}, ${youkai.race}${has ? ', contracted' : ''}`}
                  className={`entry ${has ? 'is-taken' : ''} ${(!allowed && !has) || full ? 'is-blocked' : ''}`}
                  title={[
                    `${youkai.name} (${youkai.race})`,
                    statSummary(youkaiStats(youkai, ranks)),
                    ascended ? `Ascends into ${ascended.name}, which replaces this contract.` : '',
                    full ? `Your Youkai cap is ${cap}.` : '',
                  ].filter(Boolean).join('\n')}
                  onClick={() => toggle(youkai)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggle(youkai);
                    }
                    // The key the row advertises in its tooltip, so the skill card
                    // can be opened without leaving the keyboard for the mouse.
                    if (event.key.toLowerCase() === 'i') {
                      event.preventDefault();
                      play('select');
                      setInspecting(youkai.id);
                    }
                  }}
                >
                  <span className="entry__main">
                    <span className="entry__name">
                      {youkai.name}
                      {youkai.baseFormId ? <span className="chip chip--gold">ascended</span> : null}
                      {ascended ? <span className="chip">ascends</span> : null}
                    </span>
                    <span className="entry__sub">{statSummary(youkaiStats(youkai, ranks))}</span>
                  </span>
                  <span className="entry__rank">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="step"
                      aria-label={`Skills of ${youkai.name}`}
                      title={`${youkai.name}'s three skills, or press I`}
                      onClick={event => {
                        // The row toggles a contract; inspecting must not.
                        event.stopPropagation();
                        play('select');
                        setInspecting(youkai.id);
                      }}
                    >
                      ?
                    </button>
                    <span className="toggle__mark" style={has ? { borderColor: 'var(--gold-200)' } : undefined}>
                      {has ? <span style={{ position: 'absolute', inset: 2, background: 'var(--gold-200)' }} /> : null}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {inspecting ? (
        <YoukaiCard
          youkai={youkaiById(inspecting)}
          ranks={ranks}
          installed={build.youkai.installed === inspecting}
          contracted={contracted.includes(inspecting)}
          syncMind={syncMind}
          onClose={() => setInspecting(null)}
        />
      ) : null}
    </>
  );
}

/**
 * One Youkai skill, stated in full.
 *
 * Youkai skills are the only skills in the game a character can hold without the
 * skill sheet knowing about them, so every card names its own source: which
 * Youkai it came from and what lent it, otherwise a Summoner reading the sheet
 * cannot tell an Evoke they have from one they merely could have.
 */
function SkillCard({
  skill,
  held,
  attribution,
  onOpenYoukai,
}: {
  skill: YoukaiSkill;
  held: boolean;
  attribution: string;
  onOpenYoukai?: () => void;
}) {
  const facts = [
    skill.passive ? 'Passive' : skill.fp != null ? `${skill.fp} FP` : null,
    skill.momentum != null ? `${skill.momentum} M` : null,
    skill.range ? `Range ${skill.range}` : null,
    skill.area,
    skill.target,
    skill.domain,
  ].filter(Boolean) as string[];

  return (
    <div className={`yskill ${held ? 'is-held' : ''}`}>
      <div className="yskill__head">
        <span className="yskill__name">{skill.name}</span>
        <span className="chip">{YOUKAI_SLOT_LABEL[skill.slot]}</span>
        <span className="spacer" />
        {onOpenYoukai ? (
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onOpenYoukai}
            title="Open this Youkai's full card"
          >
            {attribution}
          </button>
        ) : (
          <span className="yskill__source">{attribution}</span>
        )}
      </div>
      {facts.length ? <div className="yskill__facts">{facts.map(fact => <span key={fact}>{fact}</span>)}</div> : null}
      <p className="yskill__text">{skill.description}</p>
    </div>
  );
}

/**
 * A single Youkai's card: its stat line and all three of its skills.
 *
 * Every skill is listed, held or not, with the requirement that would grant it.
 * Hiding the ungranted two would answer "what do I have" while destroying the
 * more useful question: what a rank of Sync-Mind or an Install would buy.
 */
function YoukaiCard({
  youkai,
  ranks,
  installed,
  contracted,
  syncMind,
  onClose,
}: {
  youkai: Youkai | undefined;
  ranks: SkillRanks;
  installed: boolean;
  contracted: boolean;
  syncMind: number;
  onClose: () => void;
}) {
  if (!youkai) return null;

  const evoked = new Set(evokedSlots(syncMind));
  const affinity = affinityRank(youkai.race, ranks, installed);
  const stats = youkaiStats(youkai, ranks, installed);

  return (
    <Modal title={`${youkai.name} (${youkai.race})`} onClose={onClose}>
      <div className="inline" style={{ gap: 5, marginBottom: 9, flexWrap: 'wrap' }}>
        <span className="chip chip--gold">Level 60</span>
        {affinity > 0 ? <span className="chip">Affinity +{affinity}</span> : null}
        {contracted ? <span className="chip chip--good">Contracted</span> : <span className="chip">Not contracted</span>}
        {installed ? <span className="chip chip--gold">Installed</span> : null}
        {youkai.baseFormId ? <span className="chip chip--gold">Ascended form</span> : null}
      </div>

      <SectionHead aside={`Sync-Mind ${syncMind}`}>Stat line</SectionHead>
      <div className="ystats">
        {STAT_KEYS.map(stat => (
          <span className="ystats__cell" key={stat}>
            <span className="dim">{stat.toUpperCase()}</span>
            <span className="num" style={(stats[stat] ?? 0) > 0 ? { color: tint(stat) } : undefined}>
              {stats[stat] ?? 0}
            </span>
          </span>
        ))}
      </div>

      <div className="section">
        <SectionHead aside={`${youkai.skills.length}`}>Skills</SectionHead>
        <div className="stack--tight">
          {youkai.skills.map(skill => {
            /*
             * Held is a live fact about this build; the source beside it is the
             * standing requirement. They differ exactly when a rank is missing,
             * which is the case worth reading.
             */
            const held = evoked.has(skill.slot) || installed;
            return (
              <SkillCard
                key={skill.name}
                skill={skill}
                held={held}
                attribution={held ? `You have this · ${YOUKAI_SLOT_SOURCE[skill.slot]}` : YOUKAI_SLOT_SOURCE[skill.slot]}
              />
            );
          })}
        </div>
      </div>

      <p className="hint" style={{ marginTop: 9 }}>
        A Youkai casting its own skill pays half the listed FP. Costs are quoted at Youkai level 60.
      </p>
    </Modal>
  );
}

/**
 * What Install actually substitutes.
 *
 * Shown because the swap is easy to misread: it is the *race's* base line, with
 * FAI, SAN and APT preserved from the character, not the summon's own stats.
 */
function InstallPreview({ builder }: { builder: Builder }) {
  const { build } = builder;
  const youkai = youkaiById(build.youkai.installed);
  const line = youkai ? youkaiRaceBaseStats(youkai.race) : null;
  if (!youkai || !line) return null;

  return (
    <div className="install">
      <span className="eyebrow">Installed · {youkai.race} line</span>
      <div className="inline" style={{ gap: 4, marginTop: 4 }}>
        {STAT_KEYS.filter(stat => (line[stat] ?? 0) !== 0).map(stat => (
          <span key={stat} className="chip" style={{ color: tint(stat) }}>
            {stat.toUpperCase()} {line[stat]}
          </span>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 5 }}>
        Replaces your racial base stats. FAI, SAN and APT keep the character’s own values, and
        Affinity adds at most +1 while installed.
      </p>
    </div>
  );
}

/** A compact stat line for a Youkai row: the stats it actually has. */
function statSummary(stats: Partial<Record<StatKey, number>>): string {
  const parts = STAT_KEYS
    .filter(stat => (stats[stat] ?? 0) > 0)
    .map(stat => `${stat.toUpperCase()} ${stats[stat]}`);
  return parts.length ? parts.join(' · ') : 'No stat line published';
}

function tint(stat: StatKey): string {
  const color = STAT_COLORS[stat];
  return color === 'rainbow' ? 'var(--gold-200)' : onDark(color);
}
