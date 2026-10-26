import { useCallback, useEffect, useState } from 'react';
import PwaUpdatePrompt from '../PwaUpdatePrompt';
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

const SEEN_KEY = 'sl2:aether:intro:v1';

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
  const [advancedSection, setAdvancedSection] = useState<AdvancedSection>('legend');
  const [intro, setIntro] = useState<IntroMode | null>(initialIntro);
  const [statCard, setStatCard] = useState<StatKey | null>(null);
  const [statView, setStatView] = useState<StatView>(readStatView);
  const [revealing, setRevealing] = useState(false);

  const finishIntro = useCallback(() => {
    setIntro(null);
    setRevealing(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch { /* private browsing */ }
    // Clears the stagger delays once the panel animations end, or every re-render replays them.
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

  // Stable, so `Modal`'s mount effect is not re-run.
  const closeStatCard = useCallback(() => setStatCard(null), []);

  const openAdvanced = useCallback((section: AdvancedSection) => {
    setAdvancedSection(section);
    setDialog('advanced');
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement;
      if (intro || typing || event.metaKey || event.ctrlKey || event.altKey) return;
      // Panel-owned dialogs aren't in `dialog`; without this the menu keys stack a second one behind them.
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

      {/* Held until the intro ends, or the keypress that skips it would dismiss this too. */}
      {!intro && builder.pendingShare ? (
        <SharedBuildDialog builder={builder} onClose={() => setDialog(null)} />
      ) : null}

      {builder.notice ? (
        <div key={builder.notice.id} className={`notice notice--${builder.notice.tone}`} role="status">
          {builder.notice.text}
        </div>
      ) : null}

      <PwaUpdatePrompt beforeRefresh={builder.flushDraft} />

      {intro ? <AetherIntro mode={intro} onDone={finishIntro} /> : null}
    </>
  );
}
