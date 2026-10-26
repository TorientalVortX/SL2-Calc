import { useEffect, useState } from 'react';
import { play } from '../state/audio';

/** Hidden above 1240px by CSS, so the layout and its navigation share one breakpoint. */
const SECTIONS = [
  { id: 'panel-identity', label: 'Identity' },
  { id: 'panel-class', label: 'Class' },
  { id: 'panel-attributes', label: 'Attributes' },
  { id: 'panel-loadout', label: 'Loadout' },
  { id: 'panel-derived', label: 'Derived' },
] as const;

export function SectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const panels = SECTIONS
      .map(section => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);
    if (!panels.length) return;

    // Topmost intersecting panel wins; "most visible" makes the marker jump backwards.
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: 0 },
    );
    for (const panel of panels) observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const jump = (id: string) => {
    play('move');
    const node = document.getElementById(id);
    if (!node) return;
    // The root's overflow propagates to the viewport, so `body.scrollTop` is a no-op;
    // only `window.scrollTo` moves the page.
    const scroller = scrollParent(node);
    const offset = (document.querySelector('.sectionnav')?.getBoundingClientRect().height ?? 0) + 6;
    const top = node.getBoundingClientRect().top - offset;
    // Chromium declines a smooth scroll outright under prefers-reduced-motion.
    const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    if (scroller) scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + top), behavior });
    else window.scrollTo({ top: Math.max(0, window.scrollY + top), behavior });
    setActive(id);
  };

  return (
    <nav className="sectionnav" aria-label="Sheet sections">
      {SECTIONS.map(section => (
        <button
          key={section.id}
          type="button"
          className={`sectionnav__item ${active === section.id ? 'is-active' : ''}`}
          aria-current={active === section.id ? 'true' : undefined}
          onClick={() => jump(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

/** `body` and the root are excluded: `body` reports an overflow it does not own. */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let current = node.parentElement; current; current = current.parentElement) {
    if (current === document.body || current === document.documentElement) break;
    const overflow = getComputedStyle(current).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay')
      && current.scrollHeight > current.clientHeight) return current;
  }
  return null;
}
