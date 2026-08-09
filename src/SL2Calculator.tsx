/**
 * SL2 Calculator - Extended Version
 * Added features: Class Passives, Rising Game, Instinct, Subrace support
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import IntroOverlay from './IntroOverlay';
import SparkleBackground from './SparkleBackground';
import FoxRain from './FoxRain';
import PwaUpdatePrompt from './PwaUpdatePrompt';
import OptimizerGoals from './OptimizerGoals';
import OptimizerControls from './OptimizerControls';
import OptimizerResults from './OptimizerResults';
import { useOptimizer } from './useOptimizer';
import type { StampKey } from './types';


// Import data constants
import ScreenshotView from './ScreenshotView';
import TalentsDialog from './TalentsDialog';
import AdvancedDialog from './AdvancedDialog';
import { AstrologyDialog, ElementalDialog, LegendExtendDialog } from './BuildDialogs';
import ImportExportDialog from './ImportExportDialog';
import AppHeader from './AppHeader';
import TabNav from './TabNav';
import CommandDeck, { Disclosure } from './CommandDeck';
import MobileDeck, { type MobileTab } from './MobileDeck';
import { MOBILE_QUERY, useMediaQuery } from './useMediaQuery';
import BuildRail from './BuildRail';
import ClassFamilyPicker from './ClassFamilyPicker';
import ResultRail from './ResultRail';
import WeaponDeck, { WeaponResultRail } from './WeaponDeck';
import { ArmorClassRail, ArmorTable, ArmorDetailRail } from './ArmorDeck';
import ShareCard, { ShareFormatRail } from './ScreenshotDeck';
import AllocationPanel from './AllocationPanel';
import { FOODS, HISTORY } from './data/bonuses';
import {
  GAME_DATA_MANIFEST,
} from './domain/buildPersistence';

import { cx } from './design';
import { useCalculatorState } from './useCalculatorState';

/**
 * Composition only: pulls everything from useCalculatorState and lays it out.
 */
export default function SL2Calculator() {
  const {
    ELEMENT_EMOJI_LABELS, acceptSharedBuild, activeSaveId, activeTab,
    addStat, addedStats, adjustElementalATK, adjustElementalRES,
    applyOptimizationCandidate, armorBonus, armorConditionalBonuses, astroBonus,
    astrology, baseEvade, bonusEvade, buildEvaluation,
    buildName, calculateElementalATK, calculateElementalRES, calculateHP,
    calculateMP, calculateMaxHP, characterLevel, clearShareLink,
    commitStatValue, conditionalArmorBonus, conditionalCriticalBonus, conditionalEvadeBonus,
    copyBuildToClipboard, copyShareLink, createSaveSlot, currentBuild,
    customBaseStats, customFP, customHP, customStats,
    deleteSave, discardDraft, displayStats, downloadBuild,
    draftTimestamp, dragonKing, dragonQueen, duplicateSave,
    elementalATKAdjustments, elementalRESAdjustments, elements, endurance,
    equippedArmor, exportBuild, felidaeInstinct, food,
    foodBonus, fortitude, getAvailableSubraces, getRaceResistances,
    getWeaponStatBonus, giantGene,
    handleCustomBaseStatChange, handleHistoryChange, handleLegendExtendToggle, handleRaceChange,
    handleSubraceChange, hasEndurance, hasFortitude,
    hasGhost, history, historyBonus, hpPercent,
    importBuild, inputRefs, isOnline,
    konamiActive, leBonus, legendExtend, loadNamedSave,
    loadTemplate, luminaryElement, lupineInstinct, mainClass,
    monoclassModifier, notice, optimizerUndo,
    painTolerance, pendingSharedBuild, persistenceOfNormalcy, powerOfNormalcy,
    race, redtailDiceColor, redtailFortuneLevel,
    removeStat, resetStats, restoreDraft, risingGame, sanguineCrest, saveSlots, screenshotRef,
    selectedMainBaseClass, selectedSubBaseClass, setActiveTab,
    setArmorConditionalBonuses, setAstrology, setBaseEvade, setBonusEvade,
    setBuildName, setCharacterLevel, setCustomBaseStats, setCustomFP,
    setCustomHP, setCustomStats, setDragonKing, setDragonQueen,
    setEndurance, setEquippedArmor, setFelidaeInstinct, setFood,
    setFortitude, setGiantGene, setHpPercent,
    setLuminaryElement, setLupineInstinct, setMainClass,
    setNotice, setPainTolerance, setPersistenceOfNormalcy, setPowerOfNormalcy,
    setRedtailDiceColor, setRedtailFortuneLevel, setRisingGame,
    setSanguineCrest, setSelectedMainBaseClass, setSelectedSubBaseClass,
    setShowChanges, setShowFood, setShowImportExport,
    setShowIntro, setShowIntroOnStartup, setShowRawStats,
    setShowSettings, setShowStamps,
    setShowTalents, setStamps, setSubClass,
    setUiSounds, setWarwalk, setWeaponConfig, shareBuild,
    showChanges, showFood, showImportExport,
    showIntro, showIntroOnStartup, showRawStats,
    showSettings, showStamps,
    showTalents, stamps, stats, subClass,
    subrace, takeScreenshot, totalPoints,
    uiSounds, undoOptimization, updateActiveSave, warwalk,
    weaponConfig,
    armorUpgradePoints, setArmorUpgradePoints, armorMaterial, setArmorMaterial,
    armorEnchantment, setArmorEnchantment,
    armorClassFilter, setArmorClassFilter,
    buildEvaluationWithoutArmor,
    shareFormat, setShareFormat, buildCode,
    showMainClassDropdown, setShowMainClassDropdown, showSubClassDropdown, setShowSubClassDropdown,
    getBaseClass,
  } = useCalculatorState();

  /*
   * The rail's chips are separate destinations, so each opens its own dialog
   * rather than one "Advanced Options" modal scrolled to a section — a dialog
   * titled "Advanced Options" is a poor answer to a button marked "Astrology".
   */
  type BuildDialog = 'character' | 'custom' | 'legend' | 'astrology' | 'elemental';
  const [buildDialog, setBuildDialog] = useState<BuildDialog | null>(null);
  const elementalProps = {
    elements,
    subrace,
    elementalATKAdjustments,
    elementalRESAdjustments,
    raceResistances: getRaceResistances(),
    characterLevel,
    stats,
    calculateElementalATK,
    calculateElementalRES,
    adjustElementalATK,
    adjustElementalRES,
  };

  /*
   * Below 1024px the deck's three columns cannot hold, so variant 1c renders
   * instead. Exclusive, not CSS-hidden: both shells carry tabs and form controls,
   * and two copies in the DOM would duplicate every id and role.
   */
  const isMobile = useMediaQuery(MOBILE_QUERY);

  // One optimizer instance shared by the goal rail and the results pane.
  const optimizer = useOptimizer({
    build: currentBuild,
    currentEvaluation: buildEvaluation,
    onApply: applyOptimizationCandidate,
    canUndo: optimizerUndo !== null,
    onUndo: undoOptimization,
  });

  return (
    <div className={cx('relative', isMobile ? 'h-[100dvh] overflow-hidden' : 'min-h-screen p-2 sm:p-4 md:p-6 lg:p-8')}>
      <SparkleBackground />
      <PwaUpdatePrompt />
      {/* The Konami easter egg used to be gated behind retro mode. It is its own
          feature, so it survives retro's removal — just without the CRT dressing. */}
      {konamiActive && !showIntro && (
        <>
          <div className="fixed top-4 left-0 right-0 z-50 flex justify-center">
            <div className="rounded-full border border-positive/50 bg-surface-base/95 px-4 py-2 text-12 font-semibold text-positive shadow-xl">
              Konami Mode: 30 Lives!
            </div>
          </div>
          <FoxRain active={true} />
        </>
      )}
      {showIntro && <IntroOverlay onFinish={() => setShowIntro(false)} enableSounds={uiSounds} />}
      {!isOnline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[80] rounded-full border border-caution-ring/50 bg-caution-bg/95 px-4 py-2 text-xs text-caution-strong shadow-xl" role="status">
          Offline mode — calculations and local saves remain available
        </div>
      )}
      {notice && (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-md z-[90] rounded-lg border px-4 py-3 shadow-2xl ${notice.type === 'error' ? 'bg-negative-bg border-negative-ring text-negative-strong' : notice.type === 'success' ? 'bg-positive-bg border-positive-ring text-positive-strong' : 'bg-surface-base border-info-ring text-info-strong'}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm">{notice.message}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss notification" className="shrink-0 text-lg leading-none">×</button>
          </div>
        </div>
      )}
      {pendingSharedBuild && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="shared-build-title" onClick={clearShareLink}>
          <div className={`w-full max-w-lg rounded-xl border border-highlight-ring/40 bg-surface-sunken p-5 shadow-2xl `} onClick={(event) => event.stopPropagation()}>
            <h2 id="shared-build-title" className="text-xl font-bold text-highlight-soft">Shared Build Found</h2>
            <p className="mt-3 text-sm text-content-secondary">Loading this link will replace the current recovery draft, but it will not overwrite a named save.</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-base p-4 text-sm">
              <div><dt className="text-content-muted">Name</dt><dd>{pendingSharedBuild.buildName}</dd></div>
              <div><dt className="text-content-muted">Data</dt><dd>{pendingSharedBuild.dataVersion}</dd></div>
              <div><dt className="text-content-muted">Race</dt><dd>{pendingSharedBuild.build.subrace}</dd></div>
              <div><dt className="text-content-muted">Classes</dt><dd>{pendingSharedBuild.build.mainClass} / {pendingSharedBuild.build.subClass}</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button autoFocus onClick={clearShareLink} className="rounded border border-edge px-4 py-2">Cancel & Clean URL</button>
              <button onClick={acceptSharedBuild} className="rounded bg-highlight-hover px-4 py-2 font-semibold text-white">Load Shared Build</button>
            </div>
          </div>
        </div>
      )}
      {showChanges && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="changes-title" onClick={() => setShowChanges(false)}>
          <div className={`w-full max-w-xl rounded-xl border border-ai-ring/40 bg-surface-sunken p-5 shadow-2xl `} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3"><h2 id="changes-title" className="text-xl font-bold text-ai-soft">What Changed?</h2><button onClick={() => setShowChanges(false)} aria-label="Close changes" className="text-2xl">×</button></div>
            <p className="mt-2 text-sm text-content-muted">Game data {GAME_DATA_MANIFEST.dataVersion} · Updated {GAME_DATA_MANIFEST.updatedAt}</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-content-bright">{GAME_DATA_MANIFEST.changes.map((change) => <li key={change}>{change}</li>)}</ul>
          </div>
        </div>
      )}
      <div className={cx('relative z-10', isMobile ? 'h-full' : 'mx-auto w-full max-w-[1340px]', showIntro ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
          {/* Stat Calculator Tab — "command deck" layout (design variant 1a) */}
          {/* One shell for every tab: the header and tab bar must not unmount
              when the workspace changes. Only the columns vary. */}
          {isMobile ? (
            <MobileDeck
              activeTab={activeTab as MobileTab}
              onTabChange={setActiveTab}
              buildName={buildName}
              onBuildNameChange={setBuildName}
              race={race}
              subrace={subrace}
              availableSubraces={getAvailableSubraces()}
              onRaceChange={handleRaceChange}
              onSubraceChange={handleSubraceChange}
              mainClass={mainClass}
              subClass={subClass}
              onMainClassChange={setMainClass}
              onSubClassChange={setSubClass}
              food={food}
              onFoodChange={setFood}
              history={history}
              onHistoryChange={handleHistoryChange}
              saveSlots={saveSlots}
              onCreateSave={createSaveSlot}
              onLoadSave={loadNamedSave}
              onDeleteSave={deleteSave}
              onOpenSettings={() => setShowImportExport(true)}
              onOpenTalents={() => setShowTalents(true)}
              onOpenDialog={setBuildDialog}
              characterLevel={characterLevel}
              totalPoints={characterLevel * 4}
              pointsSpent={characterLevel * 4 - totalPoints}
              addedStats={addedStats}
              displayStats={displayStats}
              buildEvaluation={buildEvaluation}
              onAddStat={addStat}
              onRemoveStat={removeStat}
            >
              {activeTab === 'weapon' && (
                <>
                  <WeaponDeck
                    config={weaponConfig}
                    onChange={setWeaponConfig}
                    stats={stats}
                    extraCritChance={conditionalCriticalBonus}
                  />
                  <WeaponResultRail config={weaponConfig} stats={stats} extraCritChance={conditionalCriticalBonus} />
                </>
              )}
              {activeTab === 'armor' && (
                <>
                  <ArmorClassRail selectedType={armorClassFilter} onSelectType={setArmorClassFilter} />
                  <ArmorTable
                    layout="cards"
                    selectedType={armorClassFilter}
                    equippedArmor={equippedArmor}
                    onEquip={(armor) => { setEquippedArmor(armor); setArmorConditionalBonuses({}); }}
                  />
                  <ArmorDetailRail
                    armor={equippedArmor}
                    points={armorUpgradePoints}
                    onPointsChange={setArmorUpgradePoints}
                    conditionalStates={armorConditionalBonuses}
                    onConditionalChange={(key, enabled) =>
                      setArmorConditionalBonuses(prev => ({ ...prev, [key]: enabled }))}
                    material={armorMaterial}
                    onMaterialChange={setArmorMaterial}
                    enchantment={armorEnchantment}
                    onEnchantmentChange={setArmorEnchantment}
                    before={buildEvaluationWithoutArmor}
                    after={buildEvaluation}
                  />
                </>
              )}
              {activeTab === 'optimizer' && (
                <>
                  <OptimizerGoals o={optimizer} />
                  <OptimizerResults
                    o={optimizer}
                    build={currentBuild}
                    currentEvaluation={buildEvaluation}
                    onApply={applyOptimizationCandidate}
                    canUndo={optimizerUndo !== null}
                    onUndo={undoOptimization}
                  />
                  <OptimizerControls o={optimizer} build={currentBuild} />
                </>
              )}
              {activeTab === 'screenshot' && (
                <>
                  <ShareFormatRail
                    format={shareFormat}
                    onFormatChange={setShareFormat}
                    onDownload={takeScreenshot}
                    onCopyCode={() => { void navigator.clipboard?.writeText(buildCode); }}
                  />
                  <ShareCard
                    cardRef={screenshotRef}
                    format={shareFormat}
                    buildName={buildName}
                    race={race}
                    subrace={subrace}
                    mainClass={mainClass}
                    subClass={subClass}
                    characterLevel={characterLevel}
                    stats={stats}
                    addedStats={addedStats}
                    buildEvaluation={buildEvaluation}
                    equippedArmor={equippedArmor}
                    weaponConfig={weaponConfig}
                    buildCode={buildCode}
                  />
                </>
              )}
            </MobileDeck>
          ) : (
            <CommandDeck
              leftWidth={activeTab === 'armor' ? 'narrow' : 'wide'}
              rightWidth={activeTab === 'screenshot' ? 'narrow' : 'wide'}
              brand={
                    <>
                      <span className="shrink-0 font-sans text-15 font-bold tracking-tight text-content">
                        SL2 <span className="text-info">Calculator</span>
                      </span>
                      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
                    </>
              }
              actions={
                  <>
                    {/* The mockup puts Import / Export in the header bar; without it
                        the saves dialog has no route now the left rail is rebuilt. */}
                    <button
                      type="button"
                      onClick={() => setShowImportExport(true)}
                      className="rounded-7 border border-edge px-3 py-1.5 text-12 font-medium text-content-muted transition-colors hover:border-edge-emphasis hover:text-content-secondary"
                    >
                      Import / Export
                    </button>
                    <AppHeader
                      showTitle={false}
                      showSettings={showSettings}
                      setShowSettings={setShowSettings}
                      uiSounds={uiSounds}
                      setUiSounds={setUiSounds}
                      showIntroOnStartup={showIntroOnStartup}
                      setShowIntroOnStartup={setShowIntroOnStartup}
                      setShowChanges={setShowChanges}
                    />
                  </>
              }
              left={activeTab === 'armor' ? (
                <ArmorClassRail
                  selectedType={armorClassFilter}
                  onSelectType={setArmorClassFilter}
                />
              ) : activeTab === 'stats' ? (
                <BuildRail
                  browseMain={
                    <ClassFamilyPicker
                      label="Main Class"
                      selectedClass={mainClass}
                      open={showMainClassDropdown}
                      onOpenChange={setShowMainClassDropdown}
                      onSelect={(name) => { setMainClass(name); setSelectedMainBaseClass(getBaseClass(name)); }}
                    />
                  }
                  browseSub={
                    <ClassFamilyPicker
                      label="Sub Class"
                      selectedClass={subClass}
                      open={showSubClassDropdown}
                      onOpenChange={setShowSubClassDropdown}
                      onSelect={(name) => { setSubClass(name); setSelectedSubBaseClass(getBaseClass(name)); }}
                    />
                  }
                  buildName={buildName}
                  onBuildNameChange={setBuildName}
                  race={race}
                  subrace={subrace}
                  availableSubraces={getAvailableSubraces()}
                  onRaceChange={handleRaceChange}
                  onSubraceChange={handleSubraceChange}
                  selectedMainBaseClass={selectedMainBaseClass}
                  selectedSubBaseClass={selectedSubBaseClass}
                  mainClass={mainClass}
                  subClass={subClass}
                  onMainBaseChange={(base: string) => { setSelectedMainBaseClass(base); setMainClass(base); }}
                  onSubBaseChange={(base: string) => { setSelectedSubBaseClass(base); setSubClass(base); }}
                  onMainClassChange={setMainClass}
                  onSubClassChange={setSubClass}
                  food={food}
                  onFoodChange={setFood}
                  history={history}
                  onHistoryChange={handleHistoryChange}
                  onOpenTalents={() => setShowTalents(true)}
                  onOpenAdvanced={setBuildDialog}
                  onOpenSaves={() => setShowImportExport(true)}
                  saveSlots={saveSlots}
                  onCreateSave={createSaveSlot}
                  onLoadSave={loadNamedSave}
                  onDeleteSave={deleteSave}
                  onLoadTemplate={loadTemplate}
                  onResetPoints={resetStats}
                />

              ) : activeTab === 'optimizer' ? (
                <>
                  <OptimizerGoals o={optimizer} />
                  <OptimizerControls o={optimizer} build={currentBuild} />
                </>
              ) : undefined}
              center={
                <>
                  {activeTab === 'stats' && (
                    <>
                    <>
                      <AllocationPanel
                        b={{
                          race, subrace, mainClass, monoclassModifier,
                          addedStats, customStats, customBaseStats, stats, displayStats,
                          totalPoints, showRawStats, luminaryElement, astrology,
                          leBonus, astroBonus, foodBonus, historyBonus,
                        }}
                        on={{
                          addStat,
                          removeStat,
                          commitStatValue,
                        }}
                        inputRefs={inputRefs}
                        characterLevel={characterLevel}
                        setCharacterLevel={setCharacterLevel}
                        showRawStats={showRawStats}
                        setShowRawStats={setShowRawStats}
                      />

                    </>
                    </>
                  )}
            {activeTab === 'weapon' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <WeaponDeck
                  config={weaponConfig}
                  onChange={setWeaponConfig}
                  stats={stats}
                  extraCritChance={conditionalCriticalBonus}
                />
              </motion.div>
            )}
            {activeTab === 'armor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ArmorTable
                  selectedType={armorClassFilter}
                  equippedArmor={equippedArmor}
                  onEquip={(armor) => {
                    setEquippedArmor(armor);
                    // Conditional bonuses belong to the previous piece.
                    setArmorConditionalBonuses({});
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'screenshot' && (
              <>
                <ShareCard
                  cardRef={screenshotRef}
                  format={shareFormat}
                  buildName={buildName}
                  race={race}
                  subrace={subrace}
                  mainClass={mainClass}
                  subClass={subClass}
                  characterLevel={characterLevel}
                  stats={stats}
                  addedStats={addedStats}
                  buildEvaluation={buildEvaluation}
                  equippedArmor={equippedArmor}
                  weaponConfig={weaponConfig}
                  buildCode={buildCode}
                />
                <div className="mt-4">
                  <Disclosure summary="Legacy screenshot sheet — full stat and element breakdown">
              <ScreenshotView
                screenshotRef={screenshotRef}
                takeScreenshot={takeScreenshot}
                buildName={buildName}
                characterLevel={characterLevel}
                subrace={subrace}
                mainClass={mainClass}
                subClass={subClass}
                stats={stats}
                addedStats={addedStats}
                elements={elements}
                buildEvaluation={buildEvaluation}
                equippedArmor={equippedArmor}
                weaponConfig={weaponConfig}
                armorBonus={armorBonus}
                armorConditionalBonuses={armorConditionalBonuses}
                conditionalArmorBonus={conditionalArmorBonus}
                conditionalCriticalBonus={conditionalCriticalBonus}
                conditionalEvadeBonus={conditionalEvadeBonus}
                food={food}
                history={history}
                activeTab={activeTab}
                elementEmojiLabels={ELEMENT_EMOJI_LABELS}
                getWeaponStatBonus={getWeaponStatBonus}
                calculateMaxHP={calculateMaxHP}
                calculateHP={calculateHP}
                calculateMP={calculateMP}
                calculateElementalATK={calculateElementalATK}
                calculateElementalRES={calculateElementalRES}
              />
                  </Disclosure>
                </div>
              </>
            )}
                  {activeTab === 'optimizer' && (
                    <OptimizerResults
                      o={optimizer}
                      build={currentBuild}
                      currentEvaluation={buildEvaluation}
                      onApply={applyOptimizationCandidate}
                      canUndo={optimizerUndo !== null}
                      onUndo={undoOptimization}
                    />
                  )}
                </>
              }
              right={activeTab === 'screenshot' ? (
                <ShareFormatRail
                  format={shareFormat}
                  onFormatChange={setShareFormat}
                  onDownload={takeScreenshot}
                  onCopyCode={() => { void navigator.clipboard?.writeText(buildCode); }}
                />
              ) : activeTab === 'armor' ? (
                <ArmorDetailRail
                  armor={equippedArmor}
                  points={armorUpgradePoints}
                  onPointsChange={setArmorUpgradePoints}
                  conditionalStates={armorConditionalBonuses}
                  material={armorMaterial}
                  onMaterialChange={setArmorMaterial}
                  enchantment={armorEnchantment}
                  onEnchantmentChange={setArmorEnchantment}
                  onConditionalChange={(key, enabled) =>
                    setArmorConditionalBonuses(prev => ({ ...prev, [key]: enabled }))}
                  before={buildEvaluationWithoutArmor}
                  after={buildEvaluation}
                />
              ) : activeTab === 'weapon' ? (
                <WeaponResultRail
                  config={weaponConfig}
                  stats={stats}
                  extraCritChance={conditionalCriticalBonus}
                />
              ) : activeTab === 'stats' ? (
                <ResultRail
                  buildEvaluation={buildEvaluation}
                  elements={elements}
                  calculateElementalATK={calculateElementalATK}
                  calculateElementalRES={calculateElementalRES}
                  elementalATKAdjustments={elementalATKAdjustments}
                  elementalRESAdjustments={elementalRESAdjustments}
                  onAdjustElemental={() => setBuildDialog('elemental')}
                />
              ) : undefined}
            />
          )}

          {/* Dialogs are app-wide: gating them on the Stats tab left the
              header's Import / Export button opening nothing elsewhere. */}

          {showTalents && (
            <TalentsDialog
              onClose={() => setShowTalents(false)}
              t={{
                giantGene, sanguineCrest, felidaeInstinct, lupineInstinct, risingGame,
                redtailFortuneLevel, redtailDiceColor, fortitude, painTolerance, warwalk,
                endurance, luminaryElement, persistenceOfNormalcy, powerOfNormalcy,
              }}
              set={{
                giantGene: setGiantGene,
                sanguineCrest: setSanguineCrest,
                felidaeInstinct: setFelidaeInstinct,
                lupineInstinct: setLupineInstinct,
                risingGame: setRisingGame,
                redtailFortuneLevel: setRedtailFortuneLevel,
                redtailDiceColor: setRedtailDiceColor,
                fortitude: setFortitude,
                painTolerance: setPainTolerance,
                warwalk: setWarwalk,
                endurance: setEndurance,
                luminaryElement: setLuminaryElement,
                persistenceOfNormalcy: setPersistenceOfNormalcy,
                powerOfNormalcy: setPowerOfNormalcy,
              }}
              subrace={subrace}
              mainClass={mainClass}
              subClass={subClass}
              astrology={astrology}
              hpPercent={hpPercent}
              hasGhost={hasGhost}
              hasFortitude={hasFortitude}
              hasEndurance={hasEndurance}
              stats={stats}
            />
          )}

          {(buildDialog === 'character' || buildDialog === 'custom') && (
            <AdvancedDialog
              onClose={() => setBuildDialog(null)}
              v={{
                characterLevel, astrology, hpPercent, customHP, customFP,
                baseEvade, bonusEvade, dragonKing, dragonQueen,
                customStats, customBaseStats, legendExtend,
              }}
              set={{
                characterLevel: setCharacterLevel,
                astrology: setAstrology,
                hpPercent: setHpPercent,
                customHP: setCustomHP,
                customFP: setCustomFP,
                baseEvade: setBaseEvade,
                bonusEvade: setBonusEvade,
                dragonKing: setDragonKing,
                dragonQueen: setDragonQueen,
                customStats: setCustomStats,
                customBaseStats: setCustomBaseStats,
              }}
              onCustomBaseStatChange={handleCustomBaseStatChange}
              initialSection={buildDialog}
            />
          )}

          {buildDialog === 'legend' && (
            <LegendExtendDialog
              onClose={() => setBuildDialog(null)}
              legendExtend={legendExtend}
              onToggle={handleLegendExtendToggle}
            />
          )}

          {buildDialog === 'astrology' && (
            <AstrologyDialog
              onClose={() => setBuildDialog(null)}
              astrology={astrology}
              onChange={setAstrology}
            />
          )}

          {buildDialog === 'elemental' && (
            <ElementalDialog
              onClose={() => setBuildDialog(null)}
              elemental={elementalProps}
            />
          )}

          {/* Import/Export Section */}
          {showImportExport && (
            <ImportExportDialog
              onClose={() => setShowImportExport(false)}
              on={{
                exportBuild,
                downloadBuild,
                importBuild,
                loadTemplate,
                copyBuildToClipboard,
                copyShareLink,
                shareBuild,
                createSaveSlot,
                updateActiveSave,
                loadNamedSave,
                duplicateSave,
                deleteSave,
                restoreDraft,
                discardDraft,
              }}
              buildName={buildName}
              onBuildNameChange={setBuildName}
              saveSlots={saveSlots}
              activeSaveId={activeSaveId}
              draftTimestamp={draftTimestamp}
            />
          )}





        {/* Food Bonuses Modal */}
        {showFood && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowFood(false)}
          >
            <div
              className={`bg-surface-raised rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto `}
              onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-surface-raised border-b border-edge-subtle p-3 sm:p-4 md:p-6 flex justify-between items-center">
                <h2 className={`text-lg sm:text-xl md:text-2xl font-bold `}>{'Food Bonuses'}</h2>
                <button
                  onClick={() => setShowFood(false)}
                  className={`p-2 hover:bg-surface-control rounded-full transition-colors `}
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {Object.keys(FOODS).map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        setFood(f);
                        setShowFood(false);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base tap-target  ${
                        food === f ? 'bg-positive-hover' : 'bg-surface-elevated hover:bg-surface-active'
                      }`}
                    >
                      {f}
                      {f !== 'None' && (
                        <span className="text-xs block text-content-secondary truncate">
                          {Object.entries(FOODS[f]).filter(([_, v]) => v > 0).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History & Stamps Modal */}
        {showStamps && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowStamps(false)}
          >
            <div
              className={`bg-surface-raised rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto `}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-surface-raised border-b border-edge-subtle p-3 sm:p-4 md:p-6 flex justify-between items-center">
                <h2 className={`text-lg sm:text-xl md:text-2xl font-bold `}>{'History & Stamps'}</h2>
                <button
                  onClick={() => setShowStamps(false)}
                  className={`p-2 hover:bg-surface-control rounded-full transition-colors `}
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="p-3 sm:p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Character History</label>
                  <select
                    value={history}
                    onChange={(e) => handleHistoryChange(e.target.value)}
                    className={`w-full bg-surface-control border border-edge rounded px-3 py-2 text-sm sm:text-base tap-target `}
                  >
                    {Object.keys(HISTORY).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Stat Stamps</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                    {(Object.keys(stamps) as StampKey[]).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs sm:text-sm mb-1 capitalize">{stat.toUpperCase()}</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={stamps[stat]}
                          onChange={(e) => setStamps(prev => ({ ...prev, [stat]: Number(e.target.value) }))}
                          className="w-full bg-surface-control border border-edge rounded px-2 py-1 text-sm tap-target"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
