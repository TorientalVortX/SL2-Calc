import { useEffect, useState } from 'react';
import type { Skill, SkillText } from '../../types';
import { loadSkillText, mergeSkillRanks, skillById, summaryAtRank } from '../../domain/skills';
import { COPY_SPELLS, copyCooldownLabel, copySpellCapacity, copySpellRank, hasSpellthief, normalizeSpellthiefState, type CopySpellAction } from '../../domain/spellthief';
import { SectionHead } from '../ui/Panel';
import { Modal } from '../ui/Modal';
import type { Builder } from '../state/useBuilder';
import './copy-spells.css';

export function CopySpells({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sourceClass, setSourceClass] = useState('all');
  const [texts, setTexts] = useState<Map<string, SkillText>>(new Map());
  const [textError, setTextError] = useState(false);
  const state = normalizeSpellthiefState(build.spellthief, build);
  const cap = copySpellCapacity(build);
  const relevant = hasSpellthief(build) || state.cards.length > 0;
  useEffect(() => {
    if (!relevant) return;
    let live = true;
    loadSkillText().then(data => { if (live) setTexts(data); }).catch(() => { if (live) setTextError(true); });
    return () => { live = false; };
  }, [relevant]);
  if (!relevant) return null;
  const change = (id: string, action: CopySpellAction) => dispatch({ type: 'copy-spell', id, action });
  const oldest = state.equipped.length >= cap && cap ? skillById(state.equipped[0])?.name : null;
  const overload = Math.min(5, Math.max(0, mergeSkillRanks(build.skillRanks)['overload-copy'] ?? 0)) * 2;
  const visible = COPY_SPELLS.filter(skill => {
    const info = texts.get(skill.id);
    const excel = /Excel Crash/i.test(JSON.stringify(info ?? {}));
    return (filter !== 'cards' || state.cards.includes(skill.id))
      && (filter !== 'excel' || excel)
      && (filter !== 'support' || skill.category === 'Support')
      && (sourceClass === 'all' || skill.classes.includes(sourceClass))
      && `${skill.name} ${skill.classes.join(' ')} ${info?.description ?? ''} ${info?.extras.map(e => e.join(' ')).join(' ') ?? ''}`.toLowerCase().includes(query.trim().toLowerCase());
  });

  const row = (skill: Skill, library: boolean) => {
    const info = texts.get(skill.id);
    const rank = copySpellRank(build, skill.id);
    const prepared = state.equipped.includes(skill.id);
    const owned = state.cards.includes(skill.id);
    const fp = skill.fpByRank?.[Math.min(rank, skill.fpByRank.length) - 1];
    return <div className={`copy-spell entry ${prepared ? 'is-taken' : ''}`} key={skill.id}>
      <div className="entry__main">
        <details>
          <summary className="entry__name">{skill.name} <span className="chip">R{rank} max</span>{prepared && <span className="chip">Copy</span>}{/Excel Crash/i.test(JSON.stringify(info ?? {})) && <span className="chip">Excel</span>}{/requires? a Rank [A-D] Invocation/i.test(info?.description ?? '') && <span className="chip">Invocation</span>}</summary>
          <div className="copy-spell__description">
            <p>{summaryAtRank(skill, rank)}</p>
            <p>{info?.description ?? 'Loading spell details…'}</p>
            {info?.restriction && <p>Restriction: {info.restriction}</p>}
            {info?.flags.length ? <p>Target / rules: {info.flags.join(' · ')}</p> : null}
            {info?.extras.length ? <dl>{info.extras.map(([label, value], i) => <div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
            <p>Source: {skill.classes.join(', ')}. This card uses maximum rank {rank}; source requirements and conditional bonuses still apply.</p>
            {info?.url && <a href={info.url} target="_blank" rel="noreferrer">Spell reference</a>}
          </div>
        </details>
        <div className="entry__sub">{fp != null ? `${fp} FP · ` : ''}{skill.momentum != null ? `${skill.momentum} Momentum · ` : ''}{copyCooldownLabel(info?.cooldown)} · 0 slots</div>
      </div>
      <div className="copy-spell__actions">
        {prepared ? <button className="btn btn--ghost" onClick={() => change(skill.id, 'unprepare')} aria-label={`Unprepare ${skill.name}`}>To cards</button>
          : <button className="btn btn--ghost" disabled={!cap} onClick={() => change(skill.id, owned ? 'prepare' : 'steal')} aria-label={`${owned ? 'Prepare' : 'Steal'} ${skill.name}`} title={oldest ? `Replaces oldest copy: ${oldest}` : undefined}>{owned ? 'Prepare' : 'Steal'}{oldest ? ' ↔' : ''}</button>}
        {library && !owned && <button className="btn btn--ghost" onClick={() => change(skill.id, 'store')} aria-label={`Add ${skill.name} card`}>Save card</button>}
        {library && owned && !prepared && <button className="btn btn--ghost btn--danger" onClick={() => change(skill.id, 'forget')} aria-label={`Remove ${skill.name} card`}>Remove</button>}
      </div>
    </div>;
  };

  return <section className="section copy-spells" aria-label="Spellthief copy spells">
    <SectionHead aside={`${state.equipped.length} / ${cap} copies`}>Stolen spells</SectionHead>
    <p className="hint">Prepare copies from your spell cards. No class points or Skill Pool slots.</p>
    {!cap && <p className="hint">Choose Spellthief and learn Spell Snatch to prepare copies. Your reserve cards are kept.</p>}
    {state.equipped.length ? state.equipped.map(id => row(skillById(id)!, false)) : <p className="hint">No copies prepared.</p>}
    <button className="btn btn--ghost" onClick={() => setOpen(true)}>Open spell library · {state.cards.length} cards</button>
    {open && <Modal title="Spellthief · Spell library" onClose={() => setOpen(false)} wide>
      <div className="copy-library">
        <SectionHead aside={`${state.equipped.length} / ${cap} copies`}>Cards & copies</SectionHead>
        <p className="hint">Record a spell after Spell Snatch succeeds. Bosses and Youkai Evokes cannot be copied.</p>
        <p className="hint">Copies use maximum rank and at least a 3 round cooldown. Unequipping returns the card. Leaving Spellthief clears prepared copies.</p>
        {oldest && <p className="hint" role="status">The next copy replaces {oldest}. Its card stays in reserve.</p>}
        {overload > 0 && <p className="hint">Overload Copy: +{overload} Power to Copy spells. This is separate from elemental ATK.</p>}
        <div className="filters copy-library__filters">
          <input className="search" type="search" aria-label="Search copy spells" placeholder="Search name, effect or domain…" value={query} onChange={e => setQuery(e.target.value)} />
          <select className="search" aria-label="Filter copy spells" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All supported spells</option><option value="cards">My cards</option><option value="excel">Excel Crash</option><option value="support">Support</option>
          </select>
          <select className="search" aria-label="Copy spell source class" value={sourceClass} onChange={e => setSourceClass(e.target.value)}>
            <option value="all">All source classes</option>
            {[...new Set(COPY_SPELLS.flatMap(s => s.classes))].sort().map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        {textError && <p role="alert" className="hint">Spell descriptions could not load. Reopen the calculator to retry.</p>}
        <div className="stack--tight">{visible.length ? visible.map(skill => row(skill, true)) : <p className="hint">No spells match this filter.</p>}</div>
        <p className="hint">{COPY_SPELLS.length} class spells are listed. Monster-only spells are not included. Prepared copies do not apply cast effects, charge use, or temporary buffs to your stats.</p>
      </div>
    </Modal>}
  </section>;
}
