import { useEffect, useState } from 'react';
import { play } from '../state/audio';

/**
 * Wayfinding for the stacked layout.
 *
 * On a desktop viewport the three columns are pinned and every panel is either on
 * screen or one short scroll away, so there is nothing to navigate. Below 1240px
 * the columns unpin and stack, and below 860px they become one column: at which
 * point the derived readout sits underneath a loadout sheet that can run to nine
 * hundred rows. Spending an attribute point and seeing what it did became two
 * long scrolls apart.
 *
 * So: a sticky strip that jumps to any panel and says which one you are in. It is
 * deliberately not a tab bar; the sheet stays one continuous document, because
 * hiding the attributes to show the readout would trade one problem for the same
 * problem in the other direction.
 *
 * Hidden above 1240px by CSS rather than by a media query hook, so the layout and
 * its navigation cannot disagree about where the breakpoint is.
 */
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

    /*
     * The topmost panel still intersecting the band below the sticky headers wins.
     * Picking "most visible" instead makes the marker jump backwards when a tall
     * panel scrolls past a short one.
     */
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
    /*
     * Scrolled by arithmetic rather than by `scrollIntoView`, so the panel parks
     * below the sticky strip instead of underneath it.
     *
     * The page scrolls through the viewport here: `body` carries `overflow-y:
     * auto`, which the root propagates to the viewport, so `body` reports an
     * overflow it does not own, and writing `body.scrollTop` is silently a no-op.
     * `window.scrollTo` is the only thing that moves it.
     */
    const scroller = scrollParent(node);
    const offset = (document.querySelector('.sectionnav')?.getBoundingClientRect().height ?? 0) + 6;
    const top = node.getBoundingClientRect().top - offset;
    /*
     * `smooth` is asked for only when motion is welcome. Chromium treats a smooth
     * scroll as motion and, under `prefers-reduced-motion: reduce`, declines it
     * outright rather than jumping, which would leave the strip doing nothing at
     * all for the visitors who most need a way to get around.
     */
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

/**
 * The nearest ancestor that actually scrolls, or null for the page itself.
 *
 * `body` and the root are deliberately not candidates: with the root's overflow
 * propagated to the viewport, `body` reports `scrollHeight > clientHeight` while
 * owning no scroll of its own, and treating it as the scroller loses the jump.
 */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let current = node.parentElement; current; current = current.parentElement) {
    if (current === document.body || current === document.documentElement) break;
    const overflow = getComputedStyle(current).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay')
      && current.scrollHeight > current.clientHeight) return current;
  }
  return null;
}
