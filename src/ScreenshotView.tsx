import { type RefObject } from 'react';
import { WeaponResultRail } from './WeaponDeck';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { SUBRACES } from './data/races';
import { APP_VERSION } from './domain/buildPersistence';
import { ELEMENT_COLORS, STAT_COLORS, onDark } from './data/colors';
import type {
  Armor,
  BuildEvaluation,
  ElementKey,
  StatKey,
  StatRecord,
  WeaponConfig,
} from './types';


/**
 * Screenshot Mode — a read-only presentation of the whole build, laid out for
 * capture by html2canvas.
 *
 * Extracted verbatim from SL2Calculator. It performs no state mutation of its
 * own: every value arrives as a prop, which is what made it the safest of the
 * monolith's blocks to lift out first.
 */
export interface ScreenshotViewProps {
  screenshotRef: RefObject<HTMLDivElement>;
  takeScreenshot: () => Promise<void>;
  buildName: string;
  characterLevel: number;
  subrace: string;
  mainClass: string;
  subClass: string;
  stats: StatRecord;
  addedStats: StatRecord;
  elements: string[];
  buildEvaluation: BuildEvaluation;
  equippedArmor: Armor | null;
  weaponConfig: WeaponConfig | undefined;
  armorBonus: Partial<StatRecord>;
  /** Which of the equipped armour's conditional bonuses are currently toggled on. */
  armorConditionalBonuses: Record<string, boolean>;
  conditionalArmorBonus: Partial<StatRecord>;
  conditionalCriticalBonus: number;
  conditionalEvadeBonus: number;
  food: string;
  history: string;
  activeTab: string;
  elementEmojiLabels: Record<string, string>;
  getWeaponStatBonus: () => Partial<StatRecord>;
  calculateMaxHP: () => number;
  calculateHP: () => number;
  calculateMP: () => number;
  calculateElementalATK: (element: string) => number;
  calculateElementalRES: (element: string) => number;
}

export default function ScreenshotView({
  screenshotRef,
  takeScreenshot,
  buildName,
  characterLevel,
  subrace,
  mainClass,
  subClass,
  stats,
  addedStats,
  elements,
  buildEvaluation,
  equippedArmor,
  weaponConfig,
  armorBonus,
  armorConditionalBonuses,
  conditionalArmorBonus,
  conditionalCriticalBonus,
  conditionalEvadeBonus,
  food,
  history,
  activeTab,
  elementEmojiLabels: ELEMENT_EMOJI_LABELS,
  getWeaponStatBonus,
  calculateMaxHP,
  calculateHP,
  calculateMP,
  calculateElementalATK,
  calculateElementalRES,
}: ScreenshotViewProps) {
  return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Screenshot Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold text-ai font-display`}>Screenshot Mode</h2>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={takeScreenshot}
                className="sound-click sound-hover flex items-center gap-2 rounded-8 bg-info-bg px-6 py-3 font-semibold text-content transition-colors hover:bg-info-edge"
              >
                <Camera size={20} />
                Save Screenshot
              </motion.button>
            </div>

            {/* Screenshot Content */}
            <div ref={screenshotRef} className={`glass-effect rounded-lg p-8 space-y-6`}>
              {/* Build Header */}
              <div className={`border-b border-edge-subtle pb-4 `}>
                <h1 className={`text-3xl font-bold mb-3 font-display text-gradient`}>{buildName || 'Unnamed Build'}</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-content-muted">Race: </span>
                    <span className="font-semibold">{subrace}</span>
                  </div>
                  <div>
                    <span className="text-content-muted">Main Class: </span>
                    <span className="font-semibold">{mainClass}</span>
                  </div>
                  <div>
                    <span className="text-content-muted">Sub Class: </span>
                    <span className="font-semibold">{subClass}</span>
                  </div>
                  <div>
                    <span className="text-content-muted">Level: </span>
                    <span className="font-semibold">{characterLevel}</span>
                  </div>
                </div>
              </div>

              {/* Stats Display */}
              <div>
                <h3 className={`text-xl font-bold mb-4 text-info`}>Character Stats</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(stats).map(([stat, value]) => (
                    <div key={stat} className={`bg-surface-control rounded-lg p-3`}>
                      <div className="text-xs text-content-muted uppercase tracking-wide mb-1">{stat}</div>
                      <div
                        className="text-xl font-bold"
                        style={{
                          color: STAT_COLORS[stat as StatKey] === 'rainbow'
                            ? '#e6ebf5'
                            : onDark(STAT_COLORS[stat as StatKey])
                        }}
                      >
                        {value}
                      </div>
                      <div className="text-xs text-content-faint mt-0.5">
                        {SUBRACES[subrace]?.[stat as StatKey] || 0} + {addedStats[stat as StatKey]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Derived Stats */}
              <div>
                <h3 className={`text-xl font-bold mb-4 text-positive`}>Combat Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">HP</div>
                    <div className="text-lg font-bold text-negative">
                      {calculateHP()} / {calculateMaxHP()}
                    </div>
                  </div>
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">FP</div>
                    <div className="text-lg font-bold text-info">{calculateMP()}</div>
                  </div>
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Phys. Def</div>
                    <div className="text-lg font-bold text-magic">{buildEvaluation.derived.physicalDefense}%</div>
                  </div>
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Mag. Def</div>
                    <div className="text-lg font-bold text-magic">{buildEvaluation.derived.magicalDefense}%</div>
                  </div>
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Evade</div>
                    <div className="text-lg font-bold text-caution">
                      {buildEvaluation.derived.evade}
                    </div>
                  </div>
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Crit Evade</div>
                    <div className="text-lg font-bold text-highlight">
                      {buildEvaluation.derived.criticalEvade}
                    </div>
                  </div>
                  <div className={`bg-surface-control rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Status Inflict</div>
                    <div className="text-lg font-bold text-positive">
                      {buildEvaluation.derived.statusInfliction}%
                    </div>
                  </div>
                  <div className="bg-surface-control rounded-lg p-3">
                    <div className="text-xs text-content-muted">Status Resist</div>
                    <div className="text-lg font-bold text-info">
                      {buildEvaluation.derived.statusResistance}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Elemental Stats */}
              <div>
                <h3 className={`text-xl font-bold mb-4 text-equip`}>Elemental ATK & RES</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3 element-grid">
                  {elements.map(elem => {
                    const elemKey = elem as ElementKey;
                    return (
                      <div key={elem} className={`bg-surface-control rounded-lg p-3`}>
                        <div
                          className="text-sm font-semibold mb-2 element-label"
                          style={{ color: onDark(ELEMENT_COLORS[elemKey]) }}
                          title={elem}
                          aria-label={elem}
                        >
                          {activeTab === 'screenshot' ? (ELEMENT_EMOJI_LABELS[elem] || elem) : elem}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-content-muted">ATK:</span>
                          <span className="font-semibold">{calculateElementalATK(elem)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-content-muted">RES:</span>
                          <span className="font-semibold">{calculateElementalRES(elem)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Equipment Bonuses Applied */}
              <div>
                <h3 className={`text-xl font-bold mb-4 text-caution`}>Equipment Bonuses</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {(['str','wil','ski','cel','def','res','vit','fai','luc','gui','san','apt'] as StatKey[]).map((stat) => {
                    const armorBase = armorBonus[stat] || 0;
                    const armorConditional = conditionalArmorBonus[stat] || 0;
                    const weaponBonus = getWeaponStatBonus()[stat] || 0;
                    const total = armorBase + armorConditional + weaponBonus;
                    if (total === 0) return null;
                    return (
                      <div key={stat} className={`bg-surface-control rounded-lg p-3`}>
                        <div className="text-xs text-content-muted uppercase tracking-wide mb-1">{stat}</div>
                        <div className="text-lg font-bold text-caution-soft">+{total}</div>
                        <div className="text-xs text-content-faint mt-0.5">Armor: +{armorBase}{armorConditional ? `, +${armorConditional} cond.` : ''}{weaponBonus ? `, Weapon: +${weaponBonus}` : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weapon Information */}
              <div>
                <h3 className={`text-xl font-bold mb-4 text-caution`}>Weapon Stats</h3>
                {/* Selected Weapon Summary (for screenshot clarity) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className={`bg-surface-raised rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Selected Weapon</div>
                    <div className="text-sm font-bold text-white">
                      {weaponConfig?.selectedWeaponName || 'None selected'}
                    </div>
                  </div>
                  <div className={`bg-surface-raised rounded-lg p-3`}>
                    <div className="text-xs text-content-muted">Type</div>
                    <div className="text-sm font-bold text-white">
                      {weaponConfig?.weaponType || '—'}
                    </div>
                  </div>
                </div>
                <div className={`bg-surface-control rounded-lg p-4`}>
                  <div className="flex flex-col gap-3">
                    <WeaponResultRail stats={stats} config={weaponConfig} extraCritChance={conditionalCriticalBonus} />
                  </div>
                </div>
              </div>

              {/* Conditional Bonus Sources */}
              {(conditionalCriticalBonus > 0 || conditionalEvadeBonus > 0) && (
                <div>
                  <h3 className={`text-xl font-bold mb-4 text-magic`}>Bonus Sources</h3>
                  <div className={`bg-surface-control rounded-lg p-4 space-y-3`}>
                    {conditionalCriticalBonus > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-caution-soft">Critical Chance: +{conditionalCriticalBonus}</div>
                        <div className="text-xs text-content-secondary mt-1">Source{equippedArmor ? `: ${equippedArmor.name}` : ''}</div>
                        <div className="text-xs text-content-muted mt-1 space-y-1">
                          {Object.entries(equippedArmor?.conditionalBonuses || {})
                            .filter(([key, bonus]) => armorConditionalBonuses[key] && (bonus as any).critical)
                            .map(([key, bonus]) => (
                              <div key={`crit-${key}`}>• {(bonus as any).condition}</div>
                            ))}
                        </div>
                      </div>
                    )}

                    {conditionalEvadeBonus > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-positive-soft">Evade: +{conditionalEvadeBonus}</div>
                        <div className="text-xs text-content-secondary mt-1">Source{equippedArmor ? `: ${equippedArmor.name}` : ''}</div>
                        <div className="text-xs text-content-muted mt-1 space-y-1">
                          {Object.entries(equippedArmor?.conditionalBonuses || {})
                            .filter(([key, bonus]) => armorConditionalBonuses[key] && (bonus as any).evade)
                            .map(([key, bonus]) => (
                              <div key={`evade-${key}`}>• {(bonus as any).condition}</div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Armor Information */}
              <div>
                <h3 className={`text-xl font-bold mb-4 text-equip`}>Armor Stats</h3>
                <div className={`bg-surface-control rounded-lg p-4`}>
                  {equippedArmor ? (
                    <div className="space-y-4">
                      {/* Basic Armor Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Armor Name</div>
                          <div className="text-sm font-bold text-white">{equippedArmor.name}</div>
                        </div>
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Type</div>
                          <div className="text-sm font-bold text-white">{equippedArmor.type}</div>
                        </div>
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Rarity</div>
                          <div className="text-sm font-bold text-caution">{'★'.repeat(equippedArmor.rarity)}</div>
                        </div>
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Weight</div>
                          <div className="text-sm font-bold text-negative">{equippedArmor.weight}</div>
                        </div>
                      </div>

                      {/* Armor Properties */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Physical Armor</div>
                          <div className="text-lg font-bold text-equip">{equippedArmor.armor}</div>
                        </div>
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Magic Armor</div>
                          <div className="text-lg font-bold text-info">{equippedArmor.magicArmor}</div>
                        </div>
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted">Evade</div>
                          <div className="text-lg font-bold text-caution">{equippedArmor.evade}</div>
                        </div>
                      </div>

                      {/* Stat Bonuses */}
                      {equippedArmor.statBonuses && Object.keys(equippedArmor.statBonuses).length > 0 && (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                          {Object.entries(equippedArmor.statBonuses).map(([stat, value]) => {
                            if (value === undefined || value === 0) return null;
                            const statKey = stat as StatKey;
                            const color = STAT_COLORS[statKey] === 'rainbow' ? '#e6ebf5' : onDark(STAT_COLORS[statKey]);
                            return (
                              <div key={stat} className={`bg-surface-raised rounded-lg p-3`}>
                                <div className="text-xs text-content-muted uppercase tracking-wide">{stat}</div>
                                <div className="text-sm font-bold" style={{ color }}>+{value}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Special Effects */}
                      {equippedArmor.specialEffects && equippedArmor.specialEffects.length > 0 && (
                        <div className={`bg-surface-raised rounded-lg p-3`}>
                          <div className="text-xs text-content-muted mb-2">Special Effects</div>
                          <div className="space-y-1">
                            {equippedArmor.specialEffects.map((effect, index) => (
                              <div key={index} className="text-xs text-magic-soft">• {effect}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`text-center py-4 text-content-muted`}>
                      <div className="text-sm">No armor equipped</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Build Notes */}
              <div className="border-t border-edge-subtle pt-4 text-xs text-content-muted">
                <div>Generated by SL2 Calculator Suite v{APP_VERSION}</div>
                <div>Date: {new Date().toLocaleDateString()}</div>
                {history !== 'None' && <div>History: {history}</div>}
                {food !== 'None' && <div>Food: {food}</div>}
              </div>
            </div>
          </motion.div>
  );
}
