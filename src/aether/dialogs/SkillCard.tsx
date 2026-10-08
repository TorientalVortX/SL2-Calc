import { useEffect, useState } from 'react';
import type { BuildEvaluation, ElementKey, Skill, SkillText } from '../../types';
import { skillFormulaBreakdown } from '../../domain/skillDamage';
import { ELEMENT_KEYS } from '../../domain/buildEvaluation';
import { formatScaled } from '../state/readout';
import {
  fpCostAtRank, loadSkillText, skillById, summaryAtRank,
} from '../../domain/skills';
import { Modal } from '../ui/Modal';
import { SectionHead } from '../ui/Panel';
import { Stepper } from '../ui/controls';
import type { Builder } from '../state/useBuilder';
import { SkillEffects } from '../panels/SkillEffects';

interface SkillCardProps {
  skill: Skill;
  evaluation: BuildEvaluation;
  builder: Builder;
  rank: number;
  onRank: (rank: number) => void;
  onClose: () => void;
}

export function SkillCard({ skill, evaluation, builder, rank, onRank, onClose }: SkillCardProps) {
  const [text, setText] = useState<SkillText | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [elements, setElements] = useState<Partial<Record<number, ElementKey>>>({});
  const shownRank = Math.max(1, rank);
  const formula = text ? skillFormulaBreakdown(skill, shownRank, evaluation, elements, text.powerRaw) : null;

  useEffect(() => {
    let live = true;
    setText(null);
    setLoading(true);
    setFailed(false);
    loadSkillText().then(entries => {
      if (live) { setText(entries.get(skill.id) ?? null); setLoading(false); }
    }).catch(() => {
      if (live) { setFailed(true); setLoading(false); }
    });
    return () => { live = false; };
  }, [skill.id, attempt]);

  const facts: Array<[string, string]> = [];
  const fp = fpCostAtRank(skill, shownRank);
  if (fp != null) facts.push(['FP', String(fp)]);
  if (skill.momentum != null) facts.push(['Momentum', String(skill.momentum)]);
  if (text?.range) facts.push(['Range', text.range]);
  if (text?.target) facts.push(['Target', text.target]);
  if (text?.cooldown) facts.push(['Cooldown', text.cooldown]);
  if (text?.restriction) facts.push(['Restriction', text.restriction]);

  return (
    <Modal title={skill.name} onClose={onClose}>
      <article className="skill-card">
        <div className="inline" style={{ flexWrap: 'wrap' }}>
          <span className="chip">{skill.category}</span>
          <span className="hint">{skill.classes.join(' / ')}</span>
        </div>

        <div className="skill-card__rank">
          <span className="field__label">Rank / {skill.maxRank}</span>
          <Stepper label={`${skill.name} rank`} value={rank} min={0} max={skill.maxRank} onChange={onRank} />
        </div>
        {rank === 0 && <p className="hint">Not learned. Costs and effects below show rank 1.</p>}

        {loading && <p className="hint" role="status">Loading skill description…</p>}
        {failed && <div role="alert">
          <p className="hint">Skill description could not load.</p>
          <button type="button" className="btn btn--ghost" onClick={() => setAttempt(value => value + 1)}>Retry</button>
        </div>}
        {!loading && !failed && !text && <p className="hint">No wiki description is saved for this skill.</p>}
        {text?.description && <p className="skill-card__prose">{text.description}</p>}

        {text?.powerRaw && <section className="section">
          <SectionHead>Power · wiki formula</SectionHead>
          <p className="skill-card__power num">{text.powerRaw}</p>
        </section>}

        {formula && <section className="section skill-card__calculation">
          <SectionHead aside={`Rank ${shownRank}`}>Power</SectionHead>
          {skill.scaling?.map((term, index) => {
            if (term.source !== 'element' || (term.element && !term.alternateElement)) return null;
            const choices = term.alternateElement
              ? [term.element, term.alternateElement].filter((element): element is ElementKey => element !== null && element !== undefined)
              : ELEMENT_KEYS;
            return <label key={index} className="field">
              <span className="field__label">{term.label} source</span>
              <select className="select" aria-label={`${term.label} source`} value={elements[index] ?? ''}
                onChange={event => setElements(current => ({ ...current, [index]: event.target.value ? event.target.value as ElementKey : undefined }))}>
                <option value="">Choose element</option>
                {choices.map(element => <option key={element} value={element}>{element} ATK · {formatScaled(evaluation.elementalAttack[element])}</option>)}
              </select>
            </label>;
          })}
          <dl className="skill-card__facts">
            {formula.terms.map((term, index) => <div key={index}>
              <dt>{term.label}</dt>
              <dd className="num">{term.amount === null ? term.reason : term.flat
                ? formatScaled(term.amount)
                : `${term.coefficient}% × ${formatScaled(term.sourceValue!)} = ${formatScaled(term.amount)}`}</dd>
            </div>)}
            <div className="skill-card__total">
              <dt>{formula.complete ? 'Total' : 'Subtotal'}</dt>
              <dd className="num">{formatScaled(formula.subtotal)}</dd>
            </div>
          </dl>
          <p className="hint">Before defenses and criticals. Extra effects aren’t included.</p>
        </section>}

        {facts.length > 0 && <dl className="skill-card__facts">
          {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>}
        {text?.flags.length ? <p className="hint skill-card__prose">{text.flags.join(' · ')}</p> : null}

        {skill.requires?.length ? <section className="section">
          <SectionHead>Prerequisites</SectionHead>
          {skill.requires.map(requirement => <p className="hint" key={requirement.id}>
            {skillById(requirement.id)?.name ?? requirement.id} · Rank {requirement.rank}
          </p>)}
        </section> : null}

        <section className="section">
          <SectionHead>Rank effects and costs</SectionHead>
          <table className="skill-card__ranks">
            <thead><tr><th scope="col">Rank</th><th scope="col">Effects / FP{formula ? ' / Power' : ''}</th></tr></thead>
            <tbody>{Array.from({ length: skill.maxRank }, (_, index) => {
              const rowRank = index + 1;
              const rowFormula = formula ? skillFormulaBreakdown(skill, rowRank, evaluation, elements, text?.powerRaw) : null;
              return <tr key={rowRank} className={rowRank === rank ? 'is-current' : undefined}>
                <th scope="row" className="num">{rowRank}{rowRank === rank ? ' · Current' : ''}</th>
                <td>{summaryAtRank(skill, rowRank)}{rowFormula && <div className="skill-card__rank-power num">
                  {rowFormula.complete ? 'Power' : 'Subtotal'}: {formatScaled(rowFormula.subtotal)}
                </div>}</td>
              </tr>;
            })}</tbody>
          </table>
        </section>

        {skill.effects.length > 0 && !skill.handModelled && <section className="section">
          <SectionHead>Build bonuses</SectionHead>
          <SkillEffects skill={skill} rank={rank} builder={builder} details />
        </section>}

        {text?.extras.length ? <section className="section">
          <SectionHead>Wiki notes</SectionHead>
          <dl className="skill-card__facts">{text.extras.map(([label, value], index) =>
            <div key={index}><dt>{label}</dt><dd>{value}</dd></div>,
          )}</dl>
        </section> : null}
        {skill.battleRules?.map(rule => <section className="section" key={rule.url}>
          <SectionHead>Status effect</SectionHead>
          <p className="skill-card__prose">{rule.description}</p>
          <a className="skill-card__source" href={rule.url} target="_blank" rel="noreferrer">Read on the wiki</a>
        </section>)}
        {text?.url && <a className="skill-card__source" href={text.url} target="_blank" rel="noreferrer">Read on the wiki</a>}
      </article>
    </Modal>
  );
}
