import { useCallback, useEffect, useState } from 'react';
import type { StatKey } from '../types';
import { Backdrop } from './ui/Backdrop';
import { Masthead, type DialogName } from './ui/Masthead';
import { SectionNav } from './ui/SectionNav';
import { AetherIntro, type IntroMode } from './intro/AetherIntro';
import { IdentityPanel } from './panels/IdentityPanel';
import { ClassPanel } from './panels/ClassPanel';
import { StatPanel } from './panels/StatPanel';
import { LoadoutPanel } from './panels/LoadoutPanel';
import { AttributesRail } from './panels/AttributesRail';
import {
  ChangesDialog,
  SavesDialog,
  SharedBuildDialog,
  ShortcutsDialog,
  TemplatesDialog,
  TransferDialog,
} from './dialogs/Dialogs';
import { AdvancedDialog, type AdvancedSection } from './dialogs/AdvancedDialog';
import { StatCard } from './dialogs/StatCard';
import { play } from './state/audio';
import { readStatView, writeStatView, type StatView } from './state/statView';
import { useBuilder } from './state/useBuilder';

/**
 * The sheet.
 *
 * Three columns, each owning its own scroll: identity and class on the left, the
 * attribute spread and the loadout in the middle, every derived value on the
 * right. The shell itself never scrolls on a desktop viewport, which is what
 * keeps the readout on the right visible while points are being spent on the
 * left: the whole point of laying it out this way.
 */
const SEEN_KEY = 'sl2:aether:intro:v1';

/**
 * Which cut of the intro to play, if any.
 *
 * The full overture is a first-visit thing. It is a pleasure once and a toll
 * every morning after, so a returning visitor gets a second-and-a-half flare of
 * the crest instead, and anyone who has asked for reduced motion gets neither,
 * since the sequence is motion and nothing else.
 */
function initialIntro(): IntroMode | null {
  if (typeof window === 'undefined') return null;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  try {
    return localStorage.getItem(SEEN_KEY) ? 'short' : 'full';
  } catch {
    return 'full';
  }
}

export function AetherApp() {
  const builder = useBuilder();
  const [dialog, setDialog] = useState<DialogName>(null);
  // Which section the Advanced dialog opens on. Kept beside the dialog name rather
  // than inside the dialog so the readout rail can aim at the adjusters directly.
  const [advancedSection, setAdvancedSection] = useState<AdvancedSection>('legend');
  const [intro, setIntro] = useState<IntroMode | null>(initialIntro);
  /*
   * The attribute card, and whether the sheet is reporting raw or scaled totals.
   *
   * Both live here rather than in the attribute panel because the derived rail
   * reaches for them too: a card that says Max HP is ten times scaled VIT offers
   * VIT as a route, and a panel cannot open another panel's dialog.
   */
  const [statCard, setStatCard] = useState<StatKey | null>(null);
  const [statView, setStatView] = useState<StatView>(readStatView);
  // Drives the staggered arrival of the panels, once and only once.
  const [revealing, setRevealing] = useState(false);

  const finishIntro = useCallback(() => {
    setIntro(null);
    setRevealing(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch { /* private browsing; the overture simply plays again next time */ }
    // Long enough for the staggered panel animations to finish, after which the
    // delays must come off or every later re-render would replay them.
    window.setTimeout(() => setRevealing(false), 1200);
  }, []);

  const replayIntro = useCallback(() => setIntro('full'), []);

  const pickStatView = useCallback((next: StatView) => {
    setStatView(current => {
      if (current !== next) play('select');
      writeStatView(next);
      return next;
    });
  }, []);

  // Stable, so `Modal`'s mount effect is not re-run; see the note in `Modal`.
  const closeStatCard = useCallback(() => setStatCard(null), []);

  const openAdvanced = useCallback((section: AdvancedSection) => {
    setAdvancedSection(section);
    setDialog('advanced');
  }, []);

  // Menu-style shortcuts. Ignored while a field has focus, so typing a build
  // name never opens a dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement;
      // While the curtain is up every key belongs to it, not to the sheet behind.
      if (intro || typing || event.metaKey || event.ctrlKey || event.altKey) return;
      /*
       * A dialog a panel owns itself (a Youkai card, an attribute card) is not in
       * `dialog`, so without this the menu keys would fire behind it and stack a
       * second dialog on top of it. Dialogs this component owns are excluded so
       * their own key still toggles them shut.
       */
      if (!dialog && document.querySelector('.scrim')) return;

      if (event.key === 'Escape' && dialog) {
        setDialog(null);
        return;
      }
      const shortcuts: Record<string, DialogName> = {
        t: 'templates',
        b: 'saves',
        e: 'transfer',
        a: 'advanced',
        '?': 'shortcuts',
      };
      const next = shortcuts[event.key.toLowerCase()];
      if (next) {
        event.preventDefault();
        setDialog(current => (current === next ? null : next));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, intro]);

  return (
    <>
      <Backdrop />

      <div className={`shell ${revealing ? 'is-revealing' : ''}`} aria-hidden={intro ? true : undefined}>
        <Masthead builder={builder} onOpen={setDialog} onReplayIntro={replayIntro} />

        {/* Shown only once the columns stack; see the note in SectionNav. */}
        <SectionNav />

        <div className="shell__body">
          <div className="column column--left">
            <IdentityPanel builder={builder} />
            <ClassPanel builder={builder} />
          </div>

          <div className="column column--center">
            <StatPanel
              builder={builder}
              view={statView}
              onView={pickStatView}
              onInspectStat={setStatCard}
            />
            <LoadoutPanel builder={builder} />
          </div>

          <div className="column column--right">
            <AttributesRail
              builder={builder}
              onInspectStat={setStatCard}
              onAdjustElements={() => openAdvanced('elements')}
            />
          </div>
        </div>
      </div>

      {dialog === 'templates' ? <TemplatesDialog builder={builder} onClose={() => setDialog(null)} /> : null}
      {dialog === 'saves' ? <SavesDialog builder={builder} onClose={() => setDialog(null)} /> : null}
      {dialog === 'transfer' ? <TransferDialog builder={builder} onClose={() => setDialog(null)} /> : null}
      {dialog === 'advanced' ? (
        <AdvancedDialog builder={builder} section={advancedSection} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
      {statCard ? (
        <StatCard
          builder={builder}
          stat={statCard}
          view={statView}
          onView={pickStatView}
          onSelect={setStatCard}
          onClose={closeStatCard}
        />
      ) : null}
      {dialog === 'changes' ? <ChangesDialog onClose={() => setDialog(null)} /> : null}

      {/*
        * Offered once the overture is out of the way: a dialog behind the curtain
        * would be dismissed by the same keypress that skips the intro.
        */}
      {!intro && builder.pendingShare ? (
        <SharedBuildDialog builder={builder} onClose={() => setDialog(null)} />
      ) : null}

      {builder.notice ? (
        <div key={builder.notice.id} className={`notice notice--${builder.notice.tone}`} role="status">
          {builder.notice.text}
        </div>
      ) : null}

      {/* Mounted over a sheet that is already built, so entering costs nothing. */}
      {intro ? <AetherIntro mode={intro} onDone={finishIntro} /> : null}
    </>
  );
}
