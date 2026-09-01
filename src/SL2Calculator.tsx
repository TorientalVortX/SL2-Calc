/** The classic calculator shell. Superseded by `src/aether`, kept for /classic.html. */

import { useState } from 'react';
import { motion } from 'framer-motion';
import IntroOverlay from './IntroOverlay';
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
import SkillsDialog from './SkillsDialog';
import YoukaiDialog from './YoukaiDialog';
import RacialsDialog from './RacialsDialog';
import TraitsDialog from './TraitsDialog';
import { traitPointBudget, traitPointsSpent } from './domain/traits';
import { hasRacialSkills, racialSkillsFor } from './domain/racialSkills';
import { mergeSkillRanks } from './domain/skillDamage';
import AdvancedDialog from './AdvancedDialog';
import HitChanceDialog from './HitChanceDialog';
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
import GearDeck, { asDeckSlot, asStoredSlot, type GearSlotKey } from './GearDeck';
import LoadoutRail, { type LoadoutSlot } from './LoadoutRail';
import ShareCard, { ShareFormatRail } from './ScreenshotDeck';
import AllocationPanel from './AllocationPanel';
import { FOODS, HISTORY } from './data/bonuses';
import { SUBRACES } from './data/races';
import {
  APP_RELEASE,
  APP_VERSION,
  GAME_DATA_MANIFEST,
} from './domain/buildPersistence';

import type { WeaponConfig } from './types';
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
    customBaseStats, customFP, customHP, customStats, statBuffs, setStatBuffs, world, setWorld,
    armorQuality, setArmorQuality,
    deleteSave, discardDraft, displayStats, downloadBuild,
    draftTimestamp, duplicateSave,
    elementalATKAdjustments, elementalRESAdjustments, elements,
    equippedArmor, exportBuild, felidaeInstinct, food,
    foodBonus, getAvailableSubraces, getRaceResistances,
    getWeaponStatBonus, giantGene,
    handleCustomBaseStatChange, handleHistoryChange, handleLegendExtendToggle, handleRaceChange,
    handleSubraceChange, history, historyBonus, hpPercent,
    importBuild, inputRefs, isOnline,
    konamiActive, leBonus, legendExtend, loadNamedSave,
    loadTemplate, luminaryElement, lupineInstinct, mainClass,
    monoclassModifier, notice, optimizerUndo,
    pendingSharedBuild, persistenceOfNormalcy, powerOfNormalcy,
    race, redtailDiceColor, redtailFortuneLevel,
    removeStat, resetStats, restoreDraft, sanguineCrest, saveSlots, screenshotRef,
    selectedMainBaseClass, selectedSubBaseClass, setActiveTab,
    setArmorConditionalBonuses, setAstrology, setBaseEvade, setBonusEvade,
    setBuildName, setCharacterLevel, setCustomBaseStats, setCustomFP,
    setCustomHP, setCustomStats,
    setEquippedArmor, setFelidaeInstinct, setFood,
    setGiantGene, setHpPercent,
    setLuminaryElement, setLupineInstinct, setMainClass,
    setNotice, setPersistenceOfNormalcy, setPowerOfNormalcy,
    setRedtailDiceColor, setRedtailFortuneLevel,
    setSanguineCrest, setSelectedMainBaseClass, setSelectedSubBaseClass,
    setShowChanges, setShowFood, setShowImportExport,
    setShowIntro, setShowIntroOnStartup, setShowRawStats,
    setShowSettings, setShowStamps,
    setShowTalents, setStamps, setSubClass, karakuriYoukai, setKarakuriYoukai,
    setUiSounds, setWarwalk, setWeaponConfig, shareBuild,
    showChanges, showFood, showImportExport,
    showIntro, showIntroOnStartup, showRawStats,
    showSettings, showStamps,
    showTalents, skillRanks, setSkillRanks, skillConditionals, setSkillConditionals,
    destiny, setDestiny, traits, setTraits,
    youkai, setYoukai, youkaiCap,
    stamps, stats, subClass,
    subrace, takeScreenshot, totalPoints,
    uiSounds, undoOptimization, updateActiveSave, warwalk,
    weaponConfig,
    armorUpgradePoints, setArmorUpgradePoints, armorMaterial, setArmorMaterial,
    armorEnchantment, setArmorEnchantment,
    armorClassFilter, setArmorClassFilter,
    gearLoadout, setGearLoadout, slot3Mode, setSlot3Mode,
    buildEvaluationWithoutArmor,
    shareFormat, setShareFormat, buildCode,
    showMainClassDropdown, setShowMainClassDropdown, showSubClassDropdown, setShowSubClassDropdown,
    getBaseClass,
  } = useCalculatorState();
  /** Which of the six slots the Gear tab is showing. */
  const [gearSlot, setGearSlot] = useState<LoadoutSlot>('hands');

  /*
   * The rail's chips are separate destinations, so each opens its own dialog
   * rather than one "Advanced Options" modal scrolled to a section: a dialog
   * titled "Advanced Options" is a poor answer to a button marked "Astrology".
   */
  type BuildDialog = 'character' | 'custom' | 'legend' | 'astrology' | 'elemental' | 'hitChance';
  const [buildDialog, setBuildDialog] = useState<BuildDialog | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showYoukai, setShowYoukai] = useState(false);
  const [showRacials, setShowRacials] = useState(false);
  const [showTraits, setShowTraits] = useState(false);
  const racialValues = { felidaeInstinct, lupineInstinct, sanguineCrest, redtailFortuneLevel, redtailDiceColor, karakuriYoukai };
  const racialSetters = {
    felidaeInstinct: setFelidaeInstinct,
    lupineInstinct: setLupineInstinct,
    sanguineCrest: setSanguineCrest,
    redtailFortuneLevel: setRedtailFortuneLevel,
    redtailDiceColor: setRedtailDiceColor,
    karakuriYoukai: setKarakuriYoukai,
  };
  // Youkai belong to Summoner and its promotions, so the entry point only shows
  // when a class slot actually descends from Summoner.
  const isSummoner = getBaseClass(mainClass) === 'Summoner' || getBaseClass(subClass) === 'Summoner';
  /*
   * Base stat totals for trait requirements: the racial line plus what has been
   * invested. Deliberately not `rawStats`, which folds in equipment: the wiki
   * warns that APT and item bonuses do not count toward trait requirements.
   */
  const traitBaseStats = Object.fromEntries(
    (Object.keys(addedStats) as Array<keyof typeof addedStats>).map(stat => [
      stat,
      (SUBRACES[subrace]?.[stat] ?? 0) + addedStats[stat] + customBaseStats[stat],
    ]),
  );
  const mergedRanks = mergeSkillRanks(skillRanks);
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
      <PwaUpdatePrompt />
      {/* The Konami easter egg used to be gated behind retro mode. It is its own
          feature, so it survives retro's removal, just without the CRT dressing. */}
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
          Offline mode. Calculations and local saves still work.
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
            <div className="flex items-center justify-between gap-3"><h2 id="changes-title" className="text-xl font-bold text-ai-soft">What's New</h2><button onClick={() => setShowChanges(false)} aria-label="Close changes" className="text-2xl">×</button></div>
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-content-muted">Version {APP_VERSION}</p>
              <p className="mt-1 text-sm text-content-muted">{APP_RELEASE.headline}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-content-bright">{APP_RELEASE.notes.map((note) => <li key={note}>{note}</li>)}</ul>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-content-muted">Game data {GAME_DATA_MANIFEST.dataVersion}</p>
              <p className="mt-1 text-sm text-content-muted">Updated {GAME_DATA_MANIFEST.updatedAt}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-content-bright">{GAME_DATA_MANIFEST.changes.map((change) => <li key={change}>{change}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      <div className={cx('relative z-10', isMobile ? 'h-full' : 'mx-auto w-full max-w-[1340px]', showIntro ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
          {/* Stat Calculator Tab: "command deck" layout (design variant 1a) */}
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
              onOpenSkills={() => setShowSkills(true)}
              onOpenYoukai={() => setShowYoukai(true)}
              onOpenRacials={() => setShowRacials(true)}
              racials={hasRacialSkills(subrace)}
              summoner={isSummoner}
              onOpenDialog={setBuildDialog}
              characterLevel={characterLevel}
              totalPoints={characterLevel * 4}
              pointsSpent={characterLevel * 4 - totalPoints}
              addedStats={addedStats}
              displayStats={displayStats}
              showRawStats={showRawStats}
              buildEvaluation={buildEvaluation}
              onAddStat={addStat}
              onRemoveStat={removeStat}
            >
              {/*
                * Mobile stacks what the desktop puts in three columns: the slot
                * picker first, then the deck for whichever slot is selected.
                */}
              {activeTab === 'equipment' && (
                <>
                  <LoadoutRail
                    active={gearSlot}
                    onSelect={setGearSlot}
                    gear={gearLoadout}
                    onGearChange={setGearLoadout}
                    slot3Mode={slot3Mode}
                    onSlot3ModeChange={setSlot3Mode}
                    weapon={weaponConfig}
                    armorName={equippedArmor?.name ?? null}
                    evaluation={buildEvaluation}
                  />
                  {gearSlot === 'weapon' ? (
                    <WeaponDeck
                      config={weaponConfig}
                      onChange={setWeaponConfig}
                      stats={stats}
                      extraCritChance={conditionalCriticalBonus}
                      title="Slot 1 · Primary weapon"
                      traitIds={traits}
                      world={world}
                    />
                  ) : gearSlot === 'armor' ? (
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
                        quality={armorQuality}
                        onQualityChange={setArmorQuality}
                        world={world}
                        before={buildEvaluationWithoutArmor}
                        after={buildEvaluation}
                      />
                    </>
                  ) : gearSlot === 'hands' && slot3Mode === 'offHandWeapon' ? (
                    <WeaponDeck
                      config={gearLoadout.offHandWeapon as WeaponConfig | undefined}
                      onChange={next => setGearLoadout({ ...gearLoadout, offHandWeapon: next, hands: undefined })}
                      stats={stats}
                      extraCritChance={conditionalCriticalBonus}
                      allowComparison={false}
                      title="Slot 3 · Off-hand weapon"
                      traitIds={traits}
                      world={world}
                    />
                  ) : (
                    <GearDeck
                      slot={gearSlot as GearSlotKey}
                      value={asDeckSlot(gearLoadout[gearSlot as GearSlotKey])}
                      onChange={next => setGearLoadout({ ...gearLoadout, [gearSlot]: asStoredSlot(next) })}
                      rolls={gearLoadout.itemRolls ?? {}}
                      onRollsChange={next => setGearLoadout({ ...gearLoadout, itemRolls: next })}
                      conditionals={armorConditionalBonuses}
                      onConditionalChange={(key, enabled) =>
                        setArmorConditionalBonuses(prev => ({ ...prev, [key]: enabled }))}
                      unavailableName={
                        gearSlot === 'accessory1' ? gearLoadout.accessory2?.itemName
                          : gearSlot === 'accessory2' ? gearLoadout.accessory1?.itemName
                            : null
                      }
                    />
                  )}
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
              /* The equipment rail carries six named slots, not a class filter;
                 168px truncated every one of them to 'Emp'. */
              leftWidth='wide'
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
                    {/* The way to the Aether Codex, which is the front door at
                        `/`. One build file and one share link format serve both,
                        so this shell links forward even though the Codex does not
                        link back. */}
                    <a
                      href="/"
                      title="Aether Codex: the character sheet, with the same builds"
                      className="rounded-7 border border-edge px-3 py-1.5 text-12 font-medium text-content-muted transition-colors hover:border-edge-emphasis hover:text-content-secondary"
                    >
                      Aether ↗
                    </a>
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
              left={activeTab === 'equipment' ? (
                <>
                {gearSlot === 'armor' && (
                  <ArmorClassRail
                    selectedType={armorClassFilter}
                    onSelectType={setArmorClassFilter}
                  />
                )}
                <LoadoutRail
                  active={gearSlot}
                  onSelect={setGearSlot}
                  gear={gearLoadout}
                  onGearChange={setGearLoadout}
                  slot3Mode={slot3Mode}
                  onSlot3ModeChange={setSlot3Mode}
                  weapon={weaponConfig}
                  armorName={equippedArmor?.name ?? null}
                  evaluation={buildEvaluation}
                  equipment={currentBuild.equipment}
                />
                </>
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
                  onOpenTalents={() => setShowTalents(true)}
                onOpenSkills={() => setShowSkills(true)}
                  onOpenYoukai={() => setShowYoukai(true)}
                  onOpenRacials={() => setShowRacials(true)}
                  onOpenTraits={() => setShowTraits(true)}
                  traitsSpent={traitPointsSpent(traits, race)}
                  traitsBudget={traitPointBudget(characterLevel)}
                  racials={hasRacialSkills(subrace)}
                  racialCount={racialSkillsFor(subrace).length}
                  summoner={isSummoner}
                  youkaiContracted={youkai.contracted.length}
                  youkaiCap={youkaiCap}
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
                                    {activeTab === 'equipment' && (
              <motion.div
                key={gearSlot}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/*
                  * One workspace, six slots. Each tile routes to the deck that
                  * already knows how to edit that kind of thing, so the weapon
                  * and armour screens are reused rather than reimplemented.
                  */}
                {gearSlot === 'weapon' ? (
                  <WeaponDeck
                    config={weaponConfig}
                    onChange={setWeaponConfig}
                    stats={stats}
                    extraCritChance={conditionalCriticalBonus}
                    title="Slot 1 · Primary weapon"
                  />
                ) : gearSlot === 'armor' ? (
                  <ArmorTable
                    selectedType={armorClassFilter}
                    equippedArmor={equippedArmor}
                    onEquip={(armor) => {
                      setEquippedArmor(armor);
                      // Conditional bonuses belong to the previous piece.
                      setArmorConditionalBonuses({});
                    }}
                  />
                ) : gearSlot === 'hands' && slot3Mode === 'offHandWeapon' ? (
                  /*
                   * The off-hand runs through the same deck as the primary, minus
                   * the comparison: comparing is a what-if about the weapon the
                   * build is designed around, and two comparison panels would read
                   * as two more equipped weapons.
                   */
                  <WeaponDeck
                    config={gearLoadout.offHandWeapon as WeaponConfig | undefined}
                    onChange={next => setGearLoadout({ ...gearLoadout, offHandWeapon: next, hands: undefined })}
                    stats={stats}
                    extraCritChance={conditionalCriticalBonus}
                    allowComparison={false}
                    title="Slot 3 · Off-hand weapon"
                  />
                ) : (
                  <GearDeck
                    slot={gearSlot as GearSlotKey}
                    value={asDeckSlot(gearLoadout[gearSlot as GearSlotKey])}
                    onChange={next => setGearLoadout({ ...gearLoadout, [gearSlot]: asStoredSlot(next) })}
                    rolls={gearLoadout.itemRolls ?? {}}
                    onRollsChange={next => setGearLoadout({ ...gearLoadout, itemRolls: next })}
                    conditionals={armorConditionalBonuses}
                    onConditionalChange={(key, enabled) =>
                      setArmorConditionalBonuses(prev => ({ ...prev, [key]: enabled }))}
                    unavailableName={
                      gearSlot === 'accessory1' ? gearLoadout.accessory2?.itemName
                        : gearSlot === 'accessory2' ? gearLoadout.accessory1?.itemName
                          : null
                    }
                  />
                )}
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
                  <Disclosure summary="Legacy screenshot sheet with the full stat and element breakdown">
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
              ) : activeTab === 'equipment' ? (
                /*
                  * Whichever result panel the selected slot has. Slots 3-6 keep
                  * their numbers inside the GearDeck itself, so they add nothing
                  * here rather than showing an empty rail.
                  */
                gearSlot === 'weapon' || (gearSlot === 'hands' && slot3Mode === 'offHandWeapon') ? (
                  <WeaponResultRail
                    config={gearSlot === 'weapon' ? weaponConfig : (gearLoadout.offHandWeapon as WeaponConfig | undefined)}
                    stats={stats}
                    extraCritChance={conditionalCriticalBonus}
                    traitIds={traits}
                  />
                ) : gearSlot === 'armor' ? (
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
                    quality={armorQuality}
                    onQualityChange={setArmorQuality}
                    world={world}
                    before={buildEvaluationWithoutArmor}
                    after={buildEvaluation}
                  />
                ) : undefined
              ) : activeTab === 'stats' ? (
                <ResultRail
                  buildEvaluation={buildEvaluation}
                  elements={elements}
                  calculateElementalATK={calculateElementalATK}
                  calculateElementalRES={calculateElementalRES}
                  elementalATKAdjustments={elementalATKAdjustments}
                  elementalRESAdjustments={elementalRESAdjustments}
                  onAdjustElemental={() => setBuildDialog('elemental')}
                  onOpenHitChance={() => setBuildDialog('hitChance')}
                />
              ) : undefined}
            />
          )}

          {/* Dialogs are app-wide: gating them on the Stats tab left the
              header's Import / Export button opening nothing elsewhere. */}

          {showTalents && (
            <TalentsDialog
              onClose={() => setShowTalents(false)}
              t={{ giantGene, warwalk, luminaryElement, persistenceOfNormalcy, powerOfNormalcy }}
              set={{
                giantGene: setGiantGene,
                warwalk: setWarwalk,
                luminaryElement: setLuminaryElement,
                persistenceOfNormalcy: setPersistenceOfNormalcy,
                powerOfNormalcy: setPowerOfNormalcy,
              }}
              mainClass={mainClass}
              subClass={subClass}
              astrology={astrology}
            />
          )}

          {(buildDialog === 'character' || buildDialog === 'custom') && (
            <AdvancedDialog
              onClose={() => setBuildDialog(null)}
              v={{
                characterLevel, astrology, hpPercent, customHP, customFP,
                baseEvade, bonusEvade,
                customStats, customBaseStats, statBuffs, world, legendExtend,
              }}
              set={{
                characterLevel: setCharacterLevel,
                astrology: setAstrology,
                hpPercent: setHpPercent,
                customHP: setCustomHP,
                customFP: setCustomFP,
                baseEvade: setBaseEvade,
                bonusEvade: setBonusEvade,
                customStats: setCustomStats,
                customBaseStats: setCustomBaseStats,
                statBuffs: setStatBuffs,
                world: setWorld,
              }}
              onCustomBaseStatChange={handleCustomBaseStatChange}
              initialSection={buildDialog}
            />
          )}

          {showSkills && (
            <SkillsDialog
              onClose={() => setShowSkills(false)}
              mainClass={mainClass}
              subClass={subClass}
              ranks={skillRanks}
              onRanksChange={setSkillRanks}
              conditionals={skillConditionals}
              onConditionalsChange={setSkillConditionals}
              destiny={destiny}
              onDestinyChange={setDestiny}
            />
          )}

          {showTraits && (
            <TraitsDialog
              onClose={() => setShowTraits(false)}
              taken={traits}
              onChange={setTraits}
              characterLevel={characterLevel}
              history={history}
              onHistoryChange={handleHistoryChange}
              race={race}
              subrace={subrace}
              mainClass={mainClass}
              subClass={subClass}
              baseStats={traitBaseStats}
            />
          )}

          {showRacials && (
            <RacialsDialog
              onClose={() => setShowRacials(false)}
              subrace={subrace}
              values={racialValues}
              set={racialSetters}
              hpPercent={hpPercent}
            />
          )}

          {showYoukai && (
            <YoukaiDialog
              onClose={() => setShowYoukai(false)}
              state={youkai}
              onChange={setYoukai}
              ranks={mergedRanks}
              youkaiCap={youkaiCap}
            />
          )}

          {buildDialog === 'hitChance' && (
            <HitChanceDialog
              onClose={() => setBuildDialog(null)}
              buildEvaluation={buildEvaluation}
              armorType={equippedArmor?.type}
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
