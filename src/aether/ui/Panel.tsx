import type { ReactNode } from 'react';

/** The four gold corner brackets every framed surface carries. */
export function Corners() {
  return (
    <>
      <span className="corner corner--tl" />
      <span className="corner corner--tr" />
      <span className="corner corner--bl" />
      <span className="corner corner--br" />
    </>
  );
}

interface PanelProps {
  title: string;
  /** Anchor for the narrow-viewport section nav to jump to. */
  id?: string;
  /** Rendered at the right of the title bar: counters, tabs, small actions. */
  meta?: ReactNode;
  children: ReactNode;
  /** Panels own their scroll region so the shell itself never scrolls. */
  scroll?: boolean;
  className?: string;
}

export function Panel({ title, id, meta, children, scroll = true, className = '' }: PanelProps) {
  return (
    <section className={`panel enter ${className}`} id={id}>
      <Corners />
      <header className="panel__head">
        <h2 className="panel__title">{title}</h2>
        {meta ? <div className="panel__meta">{meta}</div> : null}
      </header>
      <div className={`panel__body ${scroll ? 'scroll' : ''}`}>{children}</div>
    </section>
  );
}

export function SectionHead({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="section__head">
      <span className="eyebrow">{children}</span>
      {aside ? <span className="num" style={{ fontSize: 11, color: 'var(--text-4)' }}>{aside}</span> : null}
    </div>
  );
}
