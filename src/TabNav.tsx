import { motion } from 'framer-motion';

/**
 * The four workspace tabs. Its only dependency is the active tab and a setter,
 * which is why it lifts out cleanly ahead of the layout work.
 */
export type WorkspaceTab = 'stats' | 'equipment' | 'optimizer' | 'screenshot';

export interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: WorkspaceTab) => void;
}

export default function TabNav({ activeTab, onTabChange: setActiveTab }: TabNavProps) {
  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex gap-0.5 sm:gap-1 md:gap-2 mb-4 md:mb-6 border-b border-edge-subtle overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Calculator workspaces"
      >
        <motion.button
          role="tab"
          aria-selected={activeTab === 'stats'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('stats')}
          className={`sound-click sound-hover flex-1 min-w-[80px] sm:min-w-0 px-2 sm:px-3 md:px-6 py-2 md:py-3 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm md:text-base tap-target rounded-t-lg  ${
            activeTab === 'stats'
              ? 'border-b-2 border-info-edge text-info bg-surface-raised shadow-lg'
              : 'text-content-muted hover:text-content-bright hover:bg-surface-raised'
          }`}
        >
          Stats
        </motion.button>
        <motion.button
          role="tab"
          aria-selected={activeTab === 'equipment'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('equipment')}
          className={`sound-click sound-hover flex-1 min-w-[80px] sm:min-w-0 px-2 sm:px-3 md:px-6 py-2 md:py-3 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm md:text-base tap-target rounded-t-lg  ${
            activeTab === 'equipment'
              ? 'border-b-2 border-equip-ring text-equip bg-surface-raised shadow-lg'
              : 'text-content-muted hover:text-content-bright hover:bg-surface-raised'
          }`}
        >
          Equipment
        </motion.button>
        <motion.button
          role="tab"
          aria-selected={activeTab === 'optimizer'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('optimizer')}
          className={`sound-click sound-hover flex-1 min-w-[80px] sm:min-w-0 px-2 sm:px-3 md:px-6 py-2 md:py-3 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm md:text-base tap-target rounded-t-lg  ${
            activeTab === 'optimizer'
              ? 'border-b-2 border-ai-edge text-ai bg-surface-raised shadow-lg'
              : 'text-content-muted hover:text-content-bright hover:bg-surface-raised'
          }`}
        >
          Optimizer
        </motion.button>
        <motion.button
          role="tab"
          aria-selected={activeTab === 'screenshot'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('screenshot')}
          className={`sound-click sound-hover flex-1 min-w-[80px] sm:min-w-0 px-2 sm:px-3 md:px-6 py-2 md:py-3 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm md:text-base tap-target rounded-t-lg  ${
            activeTab === 'screenshot'
              ? 'border-b-2 border-ai-edge text-ai bg-surface-raised shadow-lg'
              : 'text-content-muted hover:text-content-bright hover:bg-surface-raised'
          }`}
        >
          Screenshot
        </motion.button>
      </motion.div>
  );
}
