import type { Dispatch, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { APP_VERSION, GAME_DATA_MANIFEST } from './domain/buildPersistence';
import { soundManager } from './utilities/SoundManager';

/**
 * Title, version badge and the settings popover (retro mode, UI sounds, intro).
 */
export interface AppHeaderProps {
  /** The command deck renders its own brand mark, so the title is suppressed there. */
  showTitle?: boolean;
  showSettings: boolean;
  /** These accept updater functions — the settings toggles use `v => !v`. */
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  uiSounds: boolean;
  setUiSounds: Dispatch<SetStateAction<boolean>>;
  showIntroOnStartup: boolean;
  setShowIntroOnStartup: Dispatch<SetStateAction<boolean>>;
  setShowChanges: Dispatch<SetStateAction<boolean>>;
}

export default function AppHeader({
  showTitle = true,
  showSettings,
  setShowSettings,
  uiSounds,
  setUiSounds,
  showIntroOnStartup,
  setShowIntroOnStartup,
  setShowChanges,
}: AppHeaderProps) {
  return (
      <div className={showTitle
        ? 'flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-2'
        : 'flex items-center gap-2'}>
        {showTitle && <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`text-xl sm:text-2xl md:text-3xl font-display font-bold text-gradient `}
        >
          SL2 Calculator Suite
        </motion.h1>}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <button onClick={() => setShowChanges(true)} className="text-xs sm:text-sm text-content-secondary px-3 py-1 rounded-full bg-surface-raised border border-edge-subtle hover:border-ai-ring" title="View data changes">v{APP_VERSION} · Data {GAME_DATA_MANIFEST.dataVersion}</button>
          <button
            onClick={() => setShowSettings(v => !v)}
            className="rounded-7 border border-edge px-3 py-1 text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content sound-click sound-hover"
            title="Settings"
          >
            Settings
          </button>
        </motion.div>
        {showSettings && (
          <>
            {/* Backdrop overlay to close settings when clicking outside */}
            <div
              className="fixed inset-0 bg-black/50 z-10"
              onClick={() => setShowSettings(false)}
            />
            <div className="absolute right-4 top-4 bg-surface-raised border border-edge-subtle rounded-lg p-3 shadow-xl w-64 z-20" role="dialog" aria-modal="true" aria-labelledby="settings-title">
              <div className="flex items-center justify-between mb-2">
                <div id="settings-title" className="text-sm font-semibold">Settings</div>
                <button
                  autoFocus
                  aria-label="Close settings"
                  className="rounded-6 border border-edge px-2 py-1 text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content sound-click sound-hover"
                  onClick={() => setShowSettings(false)}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between mb-2">
              <div className="text-sm">Show Intro on Startup</div>
              <input
                type="checkbox"
                checked={showIntroOnStartup}
                onChange={(e) => setShowIntroOnStartup(e.target.checked)}
              />
              </div>
              <div className="flex items-center justify-between mb-2">
              <div className="text-sm">Enable UI Sounds</div>
              <input
                type="checkbox"
                checked={uiSounds}
                onChange={(e) => setUiSounds(e.target.checked)}
              />
              </div>
              <div className="flex flex-wrap gap-2">
              <button className="rounded-6 border border-edge px-2 py-1 text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content sound-click" onClick={() => soundManager.play('click')}>Test Click</button>
              <button className="rounded-6 border border-edge px-2 py-1 text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content sound-click" onClick={() => soundManager.play('hover')}>Test Hover</button>
              </div>
            </div>
          </>
        )}
      </div>
  );
}
