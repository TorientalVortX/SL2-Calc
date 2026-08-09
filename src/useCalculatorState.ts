/**
 * SL2 Calculator - Extended Version
 * Added features: Class Passives, Rising Game, Instinct, Subrace support
 */

import { useState, useRef, useEffect } from 'react';
import type {
  StatKey,
  ElementKey,
  StatRecord,
  StampRecord,
  ElementalRecord,
  ClassPassive,
  BuildState,
  SaveSlotV1,
  SharePayloadV1,
  OptimizationCandidate,
  Armor,
  ArmorUpgradePoints,
  WeaponConfig
} from './types';


// Import data constants
import { RACES, SUBRACES, RACE_RESISTANCES } from './data/races';
import { CLASSES, CLASS_PASSIVES, CLASS_HIERARCHY } from './data/classes';
import { FOODS, HISTORY, LEGEND_EXTEND, ASTROLOGY_PLANETS } from './data/bonuses';
import { MAX_POINTS, TEMPLATE_BUILDS } from './data/constants';
import { ARMORS } from './data/armors';
import { NO_ARMOR_UPGRADE_POINTS } from './types';
import { soundManager } from './utilities/SoundManager';
import { calculateArmorConditionals } from './domain/derivedCalculations';
import { evaluateBuild } from './domain/buildEvaluation';
import {
  createBuildFile,
  decodeSharePayload,
  discardRecoveryDraft,
  encodeSharePayload,
  loadRecoveryDraft,
  loadPreferences,
  loadSaveSlots,
  parseBuildFile,
  persistSaveSlots,
  saveRecoveryDraft,
  savePreferences,
} from './domain/buildPersistence';


/**
 * All of the calculator's state, derived values and handlers.
 *
 * This is SL2Calculator's former component body, moved verbatim and unchanged —
 * same hooks in the same order, same closures, same effects. Nothing here was
 * rewritten; the only addition is the return object at the end.
 *
 * Splitting it out leaves SL2Calculator as pure composition, so layout work
 * happens in a file of JSX rather than one with twelve hundred lines of state
 * above it. It is deliberately NOT a reducer: converting seventy-two useState
 * calls would change update semantics, and nothing here needs that.
 */
export function useCalculatorState() {
  const initialPreferences = useRef(loadPreferences()).current;
  const [showIntroOnStartup, setShowIntroOnStartup] = useState(initialPreferences.showIntro);
  const [showIntro, setShowIntro] = useState(initialPreferences.showIntro);
  const [uiSounds, setUiSounds] = useState(initialPreferences.uiSounds);

  useEffect(() => {
    try { savePreferences({ showIntro: showIntroOnStartup, uiSounds }); } catch {}
  }, [showIntroOnStartup, uiSounds]);
  const [showSettings, setShowSettings] = useState(false);
  // Konami easter egg state.
  const [konamiActive, setKonamiActive] = useState(false);
  const konamiIndexRef = useRef(0);

  // Listen for the Konami code once the intro is out of the way.
  useEffect(() => {
    if (showIntro) return;
    const sequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','Enter'];
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        konamiIndexRef.current = 0;
        return;
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expected = sequence[konamiIndexRef.current];
      if (key === expected) {
        konamiIndexRef.current++;
        if (konamiIndexRef.current === sequence.length) {
          konamiIndexRef.current = 0;
          setKonamiActive(prev => !prev);
          try {
            if (uiSounds) {
              soundManager.play('click');
              setTimeout(() => soundManager.play('click'), 120);
              setTimeout(() => soundManager.play('click'), 240);
            }
          } catch {}
        }
      } else {
        konamiIndexRef.current = 0;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showIntro, uiSounds]);
  // Get first race and first subrace on initial load
  const firstRace = Object.keys(RACES)[0];
  const firstSubrace = Object.keys(SUBRACES).find(subraceKey => {
    const subrace = SUBRACES[subraceKey];
    if (!subrace.allowedRaces) return true;
    return subrace.allowedRaces.includes(firstRace);
  }) || firstRace;
  const firstClass = Object.keys(CLASSES)[0];

  const [race, setRace] = useState(firstRace);
  const [subrace, setSubrace] = useState(firstSubrace);
  const [mainClass, setMainClass] = useState(firstClass);
  const [subClass, setSubClass] = useState(firstClass);

  // POE-style class selection states
  const [selectedMainBaseClass, setSelectedMainBaseClass] = useState('Soldier');
  const [selectedSubBaseClass, setSelectedSubBaseClass] = useState('Soldier');
  const [showMainClassDropdown, setShowMainClassDropdown] = useState(false);
  const [showSubClassDropdown, setShowSubClassDropdown] = useState(false);

  const [characterLevel, setCharacterLevel] = useState(60);
  const [food, setFood] = useState('None');
  const [history, setHistory] = useState('None');

  const [addedStats, setAddedStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });
  const pointsSpent = Object.values(addedStats).reduce((sum, value) => sum + value, 0);
  const totalPoints = Math.max(0, characterLevel * 4 - pointsSpent);

  const [customStats, setCustomStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [customBaseStats, setCustomBaseStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [stamps, setStamps] = useState<StampRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0
  });

  const [legendExtend, setLegendExtend] = useState<Record<string, boolean>>({});
  const [astrology, setAstrology] = useState<string>(''); // Now stores the selected planet name or empty string
  const [customHP, setCustomHP] = useState(0);
  const [customFP, setCustomFP] = useState(0);
  const [baseEvade, setBaseEvade] = useState(0);
  const [bonusEvade, setBonusEvade] = useState(0);
  const [giantGene, setGiantGene] = useState(false);
  const [dragonKing, setDragonKing] = useState(0);
  const [dragonQueen, setDragonQueen] = useState(0);
  const [hpPercent, setHpPercent] = useState(100);
  const [sanguineCrest, setSanguineCrest] = useState(false);
  const [felidaeInstinct, setFelidaeInstinct] = useState(false);
  const [lupineInstinct, setLupineInstinct] = useState(false);
  const [risingGame, setRisingGame] = useState(0);
  const [redtailFortuneLevel, setRedtailFortuneLevel] = useState(1);
  const [redtailDiceColor, setRedtailDiceColor] = useState<'red' | 'green' | 'yellow'>('red');
  const [karakuriYoukai, setKarakuriYoukai] = useState<string>('None');
  const [fortitude, setFortitude] = useState(false);
  const [painTolerance, setPainTolerance] = useState(0);
  const [warwalk, setWarwalk] = useState(false);
  const [endurance, setEndurance] = useState(false);
  const [luminaryElement, setLuminaryElement] = useState(false);
  const [persistenceOfNormalcy, setPersistenceOfNormalcy] = useState(false);
  const [powerOfNormalcy, setPowerOfNormalcy] = useState(false);

  // Class passive ranks
  const [mainClassPassive, setMainClassPassive] = useState(0);
  const [subClassPassive, setSubClassPassive] = useState(0);

  // Elemental adjustments
  const [elementalATKAdjustments, setElementalATKAdjustments] = useState<ElementalRecord>({
    Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
  });

  const [elementalRESAdjustments, setElementalRESAdjustments] = useState<ElementalRecord>({
    Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
  });

  // Equipment state
  const [equippedArmor, setEquippedArmor] = useState<Armor | null>(null);
  const [armorConditionalBonuses, setArmorConditionalBonuses] = useState<Record<string, boolean>>({});
  const [armorUpgradePoints, setArmorUpgradePoints] = useState<ArmorUpgradePoints>(NO_ARMOR_UPGRADE_POINTS);
  const [armorMaterial, setArmorMaterial] = useState('None');
  const [armorEnchantment, setArmorEnchantment] = useState('None');
  const [armorClassFilter, setArmorClassFilter] = useState<string>('Heavy');
  const [shareFormat, setShareFormat] = useState<'summary' | 'full' | 'code'>('summary');
  // Persisted weapon configuration for screenshot mode
  const [weaponConfig, setWeaponConfig] = useState<WeaponConfig | undefined>(undefined);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [showTalents, setShowTalents] = useState(false);
  const [showRawStats, setShowRawStats] = useState(false);

  // Import/Export state
  const [showImportExport, setShowImportExport] = useState(false);
  const [buildName, setBuildName] = useState('My Build');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [saveSlots, setSaveSlots] = useState<SaveSlotV1[]>(() => {
    try { return loadSaveSlots(); } catch { return []; }
  });
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(() => {
    try { return loadRecoveryDraft()?.exportedAt ?? null; } catch { return null; }
  });
  const [pendingSharedBuild, setPendingSharedBuild] = useState<SharePayloadV1 | null>(null);
  const [showChanges, setShowChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!showSettings && !showImportExport && !showChanges && !pendingSharedBuild) return;
    const closeTopDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (pendingSharedBuild) clearShareLink();
      else if (showChanges) setShowChanges(false);
      else if (showImportExport) setShowImportExport(false);
      else setShowSettings(false);
    };
    document.addEventListener('keydown', closeTopDialog);
    return () => document.removeEventListener('keydown', closeTopDialog);
  }, [showSettings, showImportExport, showChanges, pendingSharedBuild]);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'stats' | 'weapon' | 'armor' | 'optimizer' | 'screenshot'>('stats');

  // Screenshot ref
  const screenshotRef = useRef<HTMLDivElement>(null);

  const [optimizerUndo, setOptimizerUndo] = useState<Pick<BuildState, 'mainClass' | 'subClass' | 'selectedMainBaseClass' | 'selectedSubBaseClass' | 'mainClassPassive' | 'subClassPassive' | 'addedStats' | 'equipment'> | null>(null);

  // Stat info modal state
  const [showStatInfo, setShowStatInfo] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string>('');

  const monoclassModifier = mainClass === subClass ? 2 : 1;

  const getCurrentBuildState = (): BuildState => ({
    race, subrace, mainClass, subClass, selectedMainBaseClass, selectedSubBaseClass,
    characterLevel, food, history, addedStats, customStats, customBaseStats, stamps,
    legendExtend, astrology, customHP, customFP, baseEvade, bonusEvade, giantGene,
    dragonKing, dragonQueen, hpPercent, sanguineCrest, felidaeInstinct, lupineInstinct,
    risingGame, redtailFortuneLevel, redtailDiceColor, karakuriYoukai, fortitude,
    painTolerance, warwalk, endurance, luminaryElement, persistenceOfNormalcy,
    powerOfNormalcy, mainClassPassive, subClassPassive, elementalATKAdjustments,
    elementalRESAdjustments,
    equipment: {
      armorName: equippedArmor?.name ?? null,
      armorConditionalBonuses,
      armorUpgradePoints,
      armorMaterial,
      armorEnchantment,
      primaryWeapon: weaponConfig,
    },
  });

  const applyBuildState = (build: BuildState): void => {
    setRace(build.race);
    setSubrace(build.subrace);
    setMainClass(build.mainClass);
    setSubClass(build.subClass);
    setSelectedMainBaseClass(build.selectedMainBaseClass ?? 'Soldier');
    setSelectedSubBaseClass(build.selectedSubBaseClass ?? 'Soldier');
    setCharacterLevel(build.characterLevel);
    setFood(build.food);
    setHistory(build.history);
    setAddedStats(build.addedStats);
    setCustomStats(build.customStats);
    setCustomBaseStats(build.customBaseStats);
    setStamps(build.stamps);
    setLegendExtend(build.legendExtend);
    setAstrology(build.astrology);
    setCustomHP(build.customHP);
    setCustomFP(build.customFP);
    setBaseEvade(build.baseEvade);
    setBonusEvade(build.bonusEvade);
    setGiantGene(build.giantGene);
    setDragonKing(build.dragonKing);
    setDragonQueen(build.dragonQueen);
    setHpPercent(build.hpPercent);
    setSanguineCrest(build.sanguineCrest);
    setFelidaeInstinct(build.felidaeInstinct);
    setLupineInstinct(build.lupineInstinct);
    setRisingGame(build.risingGame);
    setRedtailFortuneLevel(build.redtailFortuneLevel);
    setRedtailDiceColor(build.redtailDiceColor);
    setKarakuriYoukai(build.karakuriYoukai);
    setFortitude(build.fortitude);
    setPainTolerance(build.painTolerance);
    setWarwalk(build.warwalk);
    setEndurance(build.endurance);
    setLuminaryElement(build.luminaryElement);
    setPersistenceOfNormalcy(build.persistenceOfNormalcy);
    setPowerOfNormalcy(build.powerOfNormalcy);
    setMainClassPassive(build.mainClassPassive);
    setSubClassPassive(build.subClassPassive);
    setElementalATKAdjustments(build.elementalATKAdjustments);
    setElementalRESAdjustments(build.elementalRESAdjustments);
    setEquippedArmor(build.equipment.armorName ? ARMORS[build.equipment.armorName] ?? null : null);
    setArmorConditionalBonuses(build.equipment.armorConditionalBonuses);
    setArmorUpgradePoints(build.equipment.armorUpgradePoints ?? NO_ARMOR_UPGRADE_POINTS);
    setArmorMaterial(build.equipment.armorMaterial ?? 'None');
    setArmorEnchantment(build.equipment.armorEnchantment ?? 'None');
    setWeaponConfig(build.equipment.primaryWeapon);
  };

  const downloadBuild = (name: string, build: BuildState): void => {
    const jsonString = JSON.stringify(createBuildFile(name, build), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/[^a-zA-Z0-9]/g, '_') || 'SL2'}_build.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice({ type: 'success', message: 'Build JSON downloaded.' });
  };

  const exportBuild = (name: string = 'My Build'): void => downloadBuild(name, getCurrentBuildState());

  const importBuild = (jsonString: string): boolean => {
    try {
      const file = parseBuildFile(jsonString);
      applyBuildState(file.build);
      setBuildName(file.buildName);
      setActiveSaveId(null);
      setNotice({ type: 'success', message: `Imported ${file.buildName}.` });
      return true;
    } catch (error) {
      console.error('Failed to import build:', error);
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Build import failed.' });
      return false;
    }
  };

  const serializedDraft = JSON.stringify(getCurrentBuildState());
  const initialDraftSnapshot = useRef(serializedDraft);
  const [draftWriteEnabled, setDraftWriteEnabled] = useState(() => !draftTimestamp);
  useEffect(() => {
    if (!draftWriteEnabled) {
      if (serializedDraft !== initialDraftSnapshot.current) setDraftWriteEnabled(true);
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        saveRecoveryDraft(buildName, JSON.parse(serializedDraft) as BuildState);
        setDraftTimestamp(new Date().toISOString());
      } catch (error) {
        setNotice({ type: 'error', message: error instanceof Error ? `Draft could not be saved: ${error.message}` : 'Draft could not be saved.' });
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [serializedDraft, buildName, draftWriteEnabled]);

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.hash.slice(1)).get('build');
    if (!encoded) return;
    try { setPendingSharedBuild(decodeSharePayload(encoded)); }
    catch (error) { setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Shared build link is invalid.' }); }
  }, []);

  const loadTemplate = (templateKey: string): void => {
    const template = TEMPLATE_BUILDS[templateKey as keyof typeof TEMPLATE_BUILDS];
    if (!template) {
      console.error('Template not found:', templateKey);
      return;
    }

    setRace(template.race);
    setSubrace(template.subrace);
    setMainClass(template.mainClass);
    setSubClass(template.subClass);

    setSelectedMainBaseClass((template as any).selectedMainBaseClass || template.mainClass);
    setSelectedSubBaseClass((template as any).selectedSubBaseClass || template.subClass);

    setCharacterLevel(60);
    setFood('None');
    setHistory(template.history || 'None');

    setAddedStats(template.stats);

    setCustomStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setCustomBaseStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setStamps({ str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
    setLegendExtend({});
    setAstrology('');

    setCustomHP(0);
    setCustomFP(0);
    setBaseEvade(0);
    setBonusEvade(0);
    setGiantGene(false);
    setDragonKing(0);
    setDragonQueen(0);
    setHpPercent(100);
    setSanguineCrest(false);
    setFelidaeInstinct(false);
    setLupineInstinct(false);
    setRisingGame(0);
    setRedtailFortuneLevel(1);
    setRedtailDiceColor('red');
    setKarakuriYoukai('None');
    setFortitude(false);
    setPainTolerance(0);
    setWarwalk(false);
    setEndurance(false);
    setLuminaryElement(false);
    setPersistenceOfNormalcy(false);
    setPowerOfNormalcy(false);
    setMainClassPassive(0);
    setSubClassPassive(0);

    setElementalATKAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });
    setElementalRESAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });

  };

  const copyBuildToClipboard = async (name: string = 'My Build'): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(createBuildFile(name, getCurrentBuildState()), null, 2));
      setNotice({ type: 'success', message: 'Build JSON copied to the clipboard.' });
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setNotice({ type: 'error', message: 'Clipboard access failed. Download the JSON instead.' });
      return false;
    }
  };

  const copyShareLink = async (): Promise<void> => {
    try {
      const encoded = encodeSharePayload(buildName, getCurrentBuildState());
      const url = new URL(window.location.href);
      url.hash = new URLSearchParams({ build: encoded }).toString();
      await navigator.clipboard.writeText(url.toString());
      setNotice({ type: 'success', message: 'Private build link copied. No build data was uploaded.' });
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not create a share link.' });
    }
  };

  const shareBuild = async (): Promise<void> => {
    try {
      const url = new URL(window.location.href);
      url.hash = new URLSearchParams({ build: encodeSharePayload(buildName, getCurrentBuildState()) }).toString();
      const canShare = 'share' in navigator && typeof navigator.share === 'function';
      if (canShare) await navigator.share({ title: `${buildName} - SL2 Calculator`, url: url.toString() });
      else await navigator.clipboard.writeText(url.toString());
      setNotice({ type: 'success', message: canShare ? 'Build shared.' : 'Build link copied.' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setNotice({ type: 'error', message: 'Could not share this build.' });
    }
  };

  const clearShareLink = (): void => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setPendingSharedBuild(null);
  };

  const acceptSharedBuild = (): void => {
    if (!pendingSharedBuild) return;
    applyBuildState(pendingSharedBuild.build);
    setBuildName(pendingSharedBuild.buildName);
    setActiveSaveId(null);
    clearShareLink();
    setNotice({ type: 'success', message: `Loaded shared build ${pendingSharedBuild.buildName}.` });
  };

  const commitSaveSlots = (next: SaveSlotV1[]): void => {
    try {
      persistSaveSlots(next);
      setSaveSlots(next);
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? `Saves could not be stored: ${error.message}` : 'Saves could not be stored.' });
    }
  };

  const createSaveSlot = (): void => {
    const now = new Date().toISOString();
    const slot: SaveSlotV1 = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: buildName.trim() || 'Untitled Build',
      createdAt: now,
      updatedAt: now,
      build: getCurrentBuildState(),
    };
    commitSaveSlots([slot, ...saveSlots]);
    setActiveSaveId(slot.id);
    setNotice({ type: 'success', message: `Saved ${slot.name}.` });
  };

  const updateActiveSave = (): void => {
    if (!activeSaveId) return setNotice({ type: 'info', message: 'Load or create a named save first.' });
    const now = new Date().toISOString();
    commitSaveSlots(saveSlots.map((slot) => slot.id === activeSaveId ? { ...slot, name: buildName.trim() || slot.name, updatedAt: now, build: getCurrentBuildState() } : slot));
    setNotice({ type: 'success', message: 'Named save updated explicitly.' });
  };

  const loadNamedSave = (slot: SaveSlotV1): void => {
    applyBuildState(slot.build);
    setBuildName(slot.name);
    setActiveSaveId(slot.id);
    setNotice({ type: 'success', message: `Loaded ${slot.name}. Edits remain in the recovery draft until Update Save.` });
  };

  const duplicateSave = (slot: SaveSlotV1): void => {
    const now = new Date().toISOString();
    const copy = { ...slot, id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: `${slot.name} Copy`, createdAt: now, updatedAt: now };
    commitSaveSlots([copy, ...saveSlots]);
    setNotice({ type: 'success', message: `Duplicated ${slot.name}.` });
  };

  const deleteSave = (slot: SaveSlotV1): void => {
    if (!window.confirm(`Delete the named save "${slot.name}"?`)) return;
    commitSaveSlots(saveSlots.filter((candidate) => candidate.id !== slot.id));
    if (activeSaveId === slot.id) setActiveSaveId(null);
    setNotice({ type: 'success', message: `Deleted ${slot.name}.` });
  };

  const restoreDraft = (): void => {
    try {
      const draft = loadRecoveryDraft();
      if (!draft) return setNotice({ type: 'info', message: 'No recovery draft is available.' });
      applyBuildState(draft.build);
      setBuildName(draft.buildName);
      setDraftWriteEnabled(true);
      setActiveSaveId(null);
      setNotice({ type: 'success', message: `Recovery draft restored from ${new Date(draft.exportedAt).toLocaleString()}.` });
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Recovery draft could not be restored.' });
    }
  };

  const discardDraft = (): void => {
    discardRecoveryDraft();
    setDraftTimestamp(null);
    setDraftWriteEnabled(true);
    setNotice({ type: 'success', message: 'Recovery draft discarded. Current values were not changed.' });
  };

  const getAvailableSubraces = (): string[] => {
    return Object.keys(SUBRACES).filter(subraceKey => {
      const subrace = SUBRACES[subraceKey];
      if (!subrace.allowedRaces) return true;
      return subrace.allowedRaces.includes(race);
    });
  };

  /**
   * Handle race change - auto-select the base race subrace and reset if not available, then validate stat caps
   */
  const handleRaceChange = (newRace: string): void => {
    setRace(newRace);

    let finalSubrace = subrace;

    // Auto-select the base race as subrace if it exists
    if (SUBRACES[newRace]) {
      setSubrace(newRace);
      finalSubrace = newRace;
    } else {
      // Find available subraces for this race
      const availableSubraces = Object.keys(SUBRACES).filter(subraceKey => {
        const subrace = SUBRACES[subraceKey];
        if (!subrace.allowedRaces) return true;
        return subrace.allowedRaces.includes(newRace);
      });

      // If current subrace is not available for the new race, reset to first available
      if (!availableSubraces.includes(subrace)) {
        const newSubrace = availableSubraces[0] || newRace;
        setSubrace(newSubrace);
        finalSubrace = newSubrace;
      }
    }

    const adjustedStats = validateStatCaps(finalSubrace, customBaseStats, legendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  const handleSubraceChange = (newSubrace: string): void => {
    setSubrace(newSubrace);

    if (newSubrace !== 'Oni' && newSubrace !== 'Vampire') {
      setSanguineCrest(false);
    }

    if (newSubrace !== 'Karakuri') {
      setKarakuriYoukai('None');
    }

    const adjustedStats = validateStatCaps(newSubrace, customBaseStats, legendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Validate and adjust stats to ensure they don't exceed hard caps (80 total)
   * Returns adjusted addedStats that respect the hard cap: race base + custom base + manual points + LE bonus + history bonus ≤ 80
   */
  const validateStatCaps = (
    newSubrace: string = subrace,
    newCustomBaseStats: StatRecord = customBaseStats,
    newLegendExtend: Record<string, boolean> = legendExtend,
    currentAddedStats: StatRecord = addedStats,
    newHistory: string = history
  ): StatRecord => {
    const adjustedStats = { ...currentAddedStats };

    const newLeBonus: Partial<StatRecord> = {};
    Object.entries(newLegendExtend).forEach(([key, enabled]) => {
      if (enabled) {
        const statKey = key.toLowerCase() as StatKey;
        if (statKey in adjustedStats) {
          newLeBonus[statKey] = (newLeBonus[statKey] || 0) + 1;
        }
      }
    });

    const newHistoryBonus = HISTORY[newHistory];

    Object.keys(adjustedStats).forEach(statKey => {
      const stat = statKey as StatKey;
      const subraceData = SUBRACES[newSubrace];
      const raceBase = subraceData?.[stat] || 0;
      const customBase = newCustomBaseStats[stat] || 0;
      const legendExtendBonus = newLeBonus[stat] || 0;
      const historyBonus = newHistoryBonus?.stats[stat] || 0;
      const manualPoints = adjustedStats[stat];

      const total = raceBase + customBase + manualPoints + legendExtendBonus + historyBonus;

      if (total > 80) {
        const excess = total - 80;
        const newManualPoints = Math.max(0, manualPoints - excess);
        const pointsRemoved = manualPoints - newManualPoints;

        adjustedStats[stat] = newManualPoints;

        const inputElement = inputRefs.current[stat];
        if (inputElement) {
          inputElement.value = newManualPoints.toString();
        }

        console.log(`Stat ${stat.toUpperCase()} capped: ${manualPoints} → ${newManualPoints} (${pointsRemoved} points freed)`);
      }
    });

    return adjustedStats;
  };

  const handleCustomBaseStatChange = (stat: StatKey, value: number): void => {
    const newCustomBaseStats = { ...customBaseStats, [stat]: value };
    setCustomBaseStats(newCustomBaseStats);

    const adjustedStats = validateStatCaps(subrace, newCustomBaseStats, legendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Handle Legend Extend toggle with validation
   */
  const handleLegendExtendToggle = (key: string): void => {
    const newLegendExtend = { ...legendExtend, [key]: !legendExtend[key] };
    setLegendExtend(newLegendExtend);

    // Validate and adjust manual stats to ensure they don't exceed hard caps
    const adjustedStats = validateStatCaps(subrace, customBaseStats, newLegendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Handle history changes and validate stat caps
   */
  const handleHistoryChange = (newHistory: string): void => {
    setHistory(newHistory);

    // Validate and adjust manual stats to ensure they don't exceed hard caps
    const adjustedStats = validateStatCaps(subrace, customBaseStats, legendExtend, addedStats, newHistory);
    setAddedStats(adjustedStats);
  };

  const getLEBonus = (): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    Object.keys(LEGEND_EXTEND).forEach(key => {
      const stat = LEGEND_EXTEND[key].stat;
      bonuses[stat] = legendExtend[key] ? 1 : 0;
    });
    return bonuses;
  };

  const getAstrologyBonus = (): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    if (astrology && ASTROLOGY_PLANETS[astrology]) {
      const stat = ASTROLOGY_PLANETS[astrology];
      bonuses[stat] = 1; // Planet signs give +1 to the associated stat
    }
    return bonuses;
  };

  // Helper function to get the base class for any given class
  const getBaseClass = (className: string): string => {
    // Check if the class is already a base class
    if (CLASS_HIERARCHY[className]?.baseClass) {
      return className;
    }

    // Find which base class this promotion class belongs to
    for (const [baseClassName, classData] of Object.entries(CLASS_HIERARCHY)) {
      if (classData.baseClass && classData.subClasses.includes(className)) {
        return baseClassName;
      }
    }

    // If not found in hierarchy, assume it's the class itself
    return className;
  };

  // Helper function to check if a class has access to a passive (either its own or inherited)
  const hasClassPassive = (className: string): boolean => {
    // Check if class has its own passive
    if (CLASS_PASSIVES[className]) return true;

    // Check if class can inherit a passive from its base class
    const baseClass = getBaseClass(className);
    return baseClass !== className && CLASS_PASSIVES[baseClass] !== undefined;
  };

  // Get the passive for a class (either its own or inherited from base class)
  const getClassPassiveData = (className: string): ClassPassive | undefined => {
    // Check for class's own passive first
    if (CLASS_PASSIVES[className]) return CLASS_PASSIVES[className];

    // Check for base class passive
    const baseClass = getBaseClass(className);
    if (baseClass !== className && CLASS_PASSIVES[baseClass]) {
      return CLASS_PASSIVES[baseClass];
    }

    return undefined;
  };

  const leBonus = getLEBonus();
  const astroBonus = getAstrologyBonus();
  const foodBonus = FOODS[food];
  const historyBonus = HISTORY[history];

  // Calculate armor bonuses
  const armorBonus: Partial<StatRecord> = {};
  if (equippedArmor?.statBonuses) {
    Object.entries(equippedArmor.statBonuses).forEach(([stat, value]) => {
      if (value && stat in {str: 1, wil: 1, ski: 1, cel: 1, def: 1, res: 1, vit: 1, fai: 1, luc: 1, gui: 1, san: 1, apt: 1}) {
        armorBonus[stat as StatKey] = value;
      }
    });
  }

  const conditionalArmor = calculateArmorConditionals(equippedArmor, armorConditionalBonuses);
  const conditionalArmorBonus = conditionalArmor.stats;
  const conditionalEvadeBonus = conditionalArmor.evade;
  const conditionalCriticalBonus = conditionalArmor.critical;

  // Weapon enchantment-derived stat bonuses (equipment influencing stats)
  const getWeaponStatBonus = (): Partial<StatRecord> => {
    const bonus: Partial<StatRecord> = {};
    const ench = weaponConfig?.enchantment;
    switch (ench) {
      case 'Jeweled':
        bonus.fai = (bonus.fai || 0) + 2;
        break;
      case 'Exorcism':
        bonus.fai = (bonus.fai || 0) + 2;
        bonus.san = (bonus.san || 0) + 2;
        break;
      case 'Demonic':
      case 'Tainted':
        bonus.str = (bonus.str || 0) + 3;
        break;
      default:
        break;
    }
    return bonus;
  };

  const currentBuild = getCurrentBuildState();
  const buildEvaluation = evaluateBuild(currentBuild);
  // Shareable build code. Encoding throws when the build exceeds the URL budget,
  // which is a normal outcome rather than an error 2014 the card says so.
  let buildCode = '';
  try { buildCode = encodeSharePayload(buildName, currentBuild); } catch { buildCode = ''; }
  // Baseline with no torso equipped, so the Armor tab can show before → after.
  const buildEvaluationWithoutArmor = evaluateBuild({
    ...currentBuild,
    equipment: {
      ...currentBuild.equipment,
      armorName: null,
      armorUpgradePoints: NO_ARMOR_UPGRADE_POINTS,
      armorMaterial: 'None',
      armorEnchantment: 'None',
    },
  });
  const stats: StatRecord = buildEvaluation.scaledStats;
  const rawStats: StatRecord = buildEvaluation.rawStats;

  // Choose which stats to display
  const displayStats = showRawStats ? rawStats : stats;

  const calculateMaxHP = (): number => buildEvaluation.derived.maxHP;

  const calculateHP = (): number => {
    return buildEvaluation.derived.currentHP;
  };

  const calculateMP = (): number => buildEvaluation.derived.fp;

  const calculateElementalATK = (element: string): number => buildEvaluation.elementalAttack[element as ElementKey];

  const calculateElementalRES = (element: string): number => buildEvaluation.elementalResistance[element as ElementKey];

  // Get race-based elemental resistances for the current subrace
  const getRaceResistances = (): ElementalRecord => {
    // Default resistances from the basic table
    const baseResistances = RACE_RESISTANCES[subrace] || {
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0,
      Light: 0, Lightning: 0, Acid: 0, Sound: 0
    };

    // Handle special races with SAN-scaled resistances
    if (subrace === 'Umbral') {
      const sanReduction = stats.san;
      return {
        Fire: 0, Ice: 0, Wind: 0, Earth: 0, Water: 0, Lightning: 0, Acid: 0, Sound: 0,
        Dark: Math.floor(Math.max(0, 25 - sanReduction)),    // 25% Dark resistance, reduced by SAN
        Light: Math.floor(Math.min(0, -25 + sanReduction))   // 25% Light weakness, reduced by SAN (less negative)
      };
    }

    if (subrace === 'Papilion') {
      const sanReduction = stats.san;
      return {
        Fire: 0, Ice: 0, Water: 0, Lightning: 0, Acid: 0, Sound: 0, Dark: 0, Light: 0,
        Wind: Math.floor(Math.max(0, 30 - sanReduction)),    // 30% Wind resistance, reduced by SAN
        Earth: Math.floor(Math.min(0, -30 + sanReduction))   // 30% Earth weakness, reduced by SAN (less negative)
      };
    }

    // Handle Vampire with Sanguine Crest conditional resistances
    if (subrace === 'Vampire') {
      if (sanguineCrest) {
        return {
          Fire: 0, Ice: 0, Wind: 0, Earth: 0, Water: 0, Lightning: 0, Acid: 0, Sound: 0,
          Dark: 25,    // 25% Dark resistance when Sanguine Crest is active
          Light: -25   // 25% Light weakness when Sanguine Crest is active
        };
      } else {
        return {
          Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0,
          Light: 0, Lightning: 0, Acid: 0, Sound: 0
        };
      }
    }

    // Handle Karakuri youkai resistances
    if (subrace === 'Karakuri') {
      const base = { Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 };

      switch (karakuriYoukai) {
        case 'Avian':
          return { ...base, Wind: 15, Lightning: -15 };
        case 'Beast':
          return { ...base, Lightning: 15, Fire: -15 };
        case 'Dragon':
          return { ...base, Fire: 15, Wind: -15 };
        case 'Fairy':
          return { ...base, Light: 15, Dark: -15 };
        case 'Mystic':
          return { ...base, Ice: 15, Earth: -15 };
        case 'Night':
          return { ...base, Dark: 15, Light: -15 };
        case 'Plant':
          return { ...base, Earth: 15, Ice: -15 };
        default:
          return base;
      }
    }

    // Handle Wyverntouched - poison resistance displayed separately
    if (subrace === 'Wyverntouched') {
      // No modifications to elemental resistances needed
      // Poison resistance is handled in separate UI section
      return baseResistances;
    }

    // Handle Naga - poison resistance displayed separately
    if (subrace === 'Naga') {
      // No modifications to elemental resistances needed
      // Poison resistance is handled in separate UI section
      return baseResistances;
    }

    // Return the base resistances for other races
    return baseResistances;
  };

  const youkaiCap = buildEvaluation.derived.youkaiCap;

  const addStat = (statName: StatKey): void => {
    // Comprehensive validation before adding
    const currentValue = addedStats[statName];
    const availablePoints = totalPoints;

    // Calculate hard cap: race base + custom base + manual points + LE bonus + history bonus ≤ 80
    // Class stats do NOT count toward the hard cap
    const subraceData = SUBRACES[subrace];
    const raceBase = subraceData?.[statName] || 0;
    const customBase = customBaseStats[statName];
    const legendExtendBonus = leBonus[statName] || 0;
    const currentHistoryBonus = historyBonus.stats[statName] || 0;

    const totalBase = raceBase + customBase;
    const currentTotal = totalBase + currentValue + legendExtendBonus + currentHistoryBonus;
    const wouldExceedHardCap = currentTotal >= 80;

    // Only add if we have points available, current value is valid, and we haven't hit hard cap
    if (availablePoints > 0 && currentValue >= 0 && currentValue < MAX_POINTS && !wouldExceedHardCap) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] + 1 }));

      // Update any input field that might be showing this stat
      const inputElement = inputRefs.current[statName];
      if (inputElement) {
        inputElement.value = (currentValue + 1).toString();
      }
    }
  };

  const removeStat = (statName: StatKey): void => {
    // Comprehensive validation before removing
    const currentValue = addedStats[statName];
    const currentTotal = totalPoints;

    // Only remove if current value is positive and total won't exceed max
    if (currentValue > 0 && currentTotal < MAX_POINTS) {
      setAddedStats(prev => ({ ...prev, [statName]: Math.max(0, prev[statName] - 1) }));

      // Update any input field that might be showing this stat
      const inputElement = inputRefs.current[statName];
      if (inputElement) {
        inputElement.value = Math.max(0, currentValue - 1).toString();
      }
    }
  };

  const resetStats = (): void => {
    setAddedStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setCustomStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setCustomBaseStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setLegendExtend({});
    setAstrology('');
    setCustomHP(0);
    setCustomFP(0);
    setBaseEvade(0);
    setBonusEvade(0);
    setGiantGene(false);
    setDragonKing(0);
    setDragonQueen(0);
    setFood('None');
    setHistory('None');
    setSubrace('Human'); // Reset to base Human race
    setStamps({ str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
    setSanguineCrest(false);
    setFelidaeInstinct(false);
    setLupineInstinct(false);
    setRisingGame(0);
    setRedtailFortuneLevel(1);
    setRedtailDiceColor('red');
    setFortitude(false);
    setPainTolerance(0);
    setWarwalk(false);
    setEndurance(false);
    setPersistenceOfNormalcy(false);
    setPowerOfNormalcy(false);
    setMainClassPassive(0);
    setSubClassPassive(0);

    // Reset elemental adjustments
    setElementalATKAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });
    setElementalRESAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });
  };

  // Elemental adjustment functions
  const adjustElementalATK = (element: ElementKey, change: number): void => {
    setElementalATKAdjustments(prev => ({
      ...prev,
      [element]: Math.max(-99, Math.min(99, prev[element] + change))
    }));
  };

  const adjustElementalRES = (element: ElementKey, change: number): void => {
    setElementalRESAdjustments(prev => ({
      ...prev,
      [element]: Math.max(-99, Math.min(99, prev[element] + change))
    }));
  };

  // Uncontrolled input approach - no React state management for input values
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  const commitStatValue = (statKey: StatKey, inputElement: HTMLInputElement) => {
    const value = inputElement.value;
    let targetPoints = parseInt(value) || 0;

    // Calculate hard cap: race base + custom base + manual points + LE bonus + history bonus + astrology bonus ≤ 80
    // Class stats do NOT count toward the hard cap
    const subraceData = SUBRACES[subrace];
    const raceBase = subraceData?.[statKey] || 0;
    const customBase = customBaseStats[statKey];
    const legendExtendBonus = leBonus[statKey] || 0;
    const currentHistoryBonus = historyBonus.stats[statKey] || 0;
    const currentAstrologyBonus = astroBonus[statKey] || 0;

    const totalBase = raceBase + customBase;
    const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus - currentAstrologyBonus;

    // Aggressive validation - clamp to valid range immediately, including dynamic hard cap
    targetPoints = Math.max(0, Math.min(MAX_POINTS, Math.min(maxAllowedManualPoints, targetPoints)));

    const currentPoints = addedStats[statKey];

    // Additional safety check - ensure we're not in an invalid state
    const totalUsedPoints = Object.values(addedStats).reduce((sum, val) => sum + val, 0) - currentPoints;
    const maxAllowableForThisStat = MAX_POINTS - totalUsedPoints;
    targetPoints = Math.min(targetPoints, maxAllowableForThisStat);

    // Calculate final difference after all validations
    const actualDifference = targetPoints - currentPoints;

    if (actualDifference !== 0) {
      if (actualDifference > 0) {
        // Adding points - strictly validate available points
        const availablePoints = totalPoints;
        const pointsToAdd = Math.min(actualDifference, availablePoints);

        // Only proceed if we can actually add points
        if (pointsToAdd > 0) {
          const actualNewValue = currentPoints + pointsToAdd;
          setAddedStats(prev => ({ ...prev, [statKey]: actualNewValue }));
          inputElement.value = actualNewValue.toString();
        } else {
          // Can't add any points, revert input to current value
          inputElement.value = currentPoints.toString();
        }
      } else {
        // Removing points - validate we don't go below 0
        const actualTarget = Math.max(0, targetPoints);
        const pointsToRemove = currentPoints - actualTarget;

        if (pointsToRemove > 0) {
          setAddedStats(prev => ({ ...prev, [statKey]: actualTarget }));
          inputElement.value = actualTarget.toString();
        }
      }
    } else {
      // No change needed, but ensure input shows the correct value
      inputElement.value = currentPoints.toString();
    }

    // Remove any visual indicators and reset to normal styling
    inputElement.style.backgroundColor = '';
    inputElement.style.borderColor = '';
    inputElement.style.color = '';
  };

  // Check if class has fortitude access
  const hasFortitude = ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(mainClass)
    || ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(subClass);

  // Check if class has endurance access
  const hasEndurance = mainClass === 'Hexer' || subClass === 'Hexer';

  // Check if class/race has Rising Game/Pain Tolerance
  const hasGhost = mainClass === 'Ghost' || subClass === 'Ghost';


  const applyOptimizationCandidate = (candidate: OptimizationCandidate): void => {
    setOptimizerUndo({
      mainClass, subClass, selectedMainBaseClass, selectedSubBaseClass, mainClassPassive, subClassPassive,
      addedStats: { ...addedStats },
      equipment: {
        armorName: equippedArmor?.name ?? null,
        armorConditionalBonuses: { ...armorConditionalBonuses },
        armorUpgradePoints: { ...armorUpgradePoints },
        armorMaterial,
        armorEnchantment,
        primaryWeapon: weaponConfig ? { ...weaponConfig, customScaling: { ...weaponConfig.customScaling } } : undefined,
      },
    });
    setMainClass(candidate.patch.mainClass);
    setSubClass(candidate.patch.subClass);
    setSelectedMainBaseClass(candidate.patch.selectedMainBaseClass);
    setSelectedSubBaseClass(candidate.patch.selectedSubBaseClass);
    setMainClassPassive(candidate.patch.mainClassPassive);
    setSubClassPassive(candidate.patch.subClassPassive);
    setAddedStats({ ...candidate.patch.addedStats });
    if (candidate.patch.equipment) {
      setEquippedArmor(candidate.patch.equipment.armorName ? ARMORS[candidate.patch.equipment.armorName] ?? null : null);
      setArmorConditionalBonuses({ ...candidate.patch.equipment.armorConditionalBonuses });
      setWeaponConfig(candidate.patch.equipment.primaryWeapon
        ? { ...candidate.patch.equipment.primaryWeapon, customScaling: { ...candidate.patch.equipment.primaryWeapon.customScaling } }
        : undefined);
    }
  };

  const undoOptimization = (): void => {
    if (!optimizerUndo) return;
    setMainClass(optimizerUndo.mainClass);
    setSubClass(optimizerUndo.subClass);
    setSelectedMainBaseClass(optimizerUndo.selectedMainBaseClass ?? getBaseClass(optimizerUndo.mainClass));
    setSelectedSubBaseClass(optimizerUndo.selectedSubBaseClass ?? getBaseClass(optimizerUndo.subClass));
    setMainClassPassive(optimizerUndo.mainClassPassive);
    setSubClassPassive(optimizerUndo.subClassPassive);
    setAddedStats({ ...optimizerUndo.addedStats });
    setEquippedArmor(optimizerUndo.equipment.armorName ? ARMORS[optimizerUndo.equipment.armorName] ?? null : null);
    setArmorConditionalBonuses({ ...optimizerUndo.equipment.armorConditionalBonuses });
    setWeaponConfig(optimizerUndo.equipment.primaryWeapon
      ? { ...optimizerUndo.equipment.primaryWeapon, customScaling: { ...optimizerUndo.equipment.primaryWeapon.customScaling } }
      : undefined);
    setOptimizerUndo(null);
  };

  /**
   * Take a screenshot of the current build
   */
  const takeScreenshot = async (): Promise<void> => {
    if (!screenshotRef.current) return;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Store original width
      const originalWidth = screenshotRef.current.style.width;
      const originalMaxWidth = screenshotRef.current.style.maxWidth;
      const originallyHadCaptureClass = screenshotRef.current.classList.contains('screenshot-capture');

      // Set to XL desktop resolution width (1280px)
      screenshotRef.current.style.width = '1280px';
      screenshotRef.current.style.maxWidth = '1280px';
      // Add capture class to stabilize layout/animations
      screenshotRef.current.classList.add('screenshot-capture');

      // Ensure web fonts are loaded before rendering (prevents glyph clipping)
      if ((document as any).fonts && typeof (document as any).fonts.ready?.then === 'function') {
        try { await (document as any).fonts.ready; } catch {}
      }

      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#1a202c',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 1280,
      });

      // Restore original width
      screenshotRef.current.style.width = originalWidth;
      screenshotRef.current.style.maxWidth = originalMaxWidth;
      if (!originallyHadCaptureClass) {
        screenshotRef.current.classList.remove('screenshot-capture');
      }

      // Convert to blob and download
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `SL2-Build-${buildName || 'Screenshot'}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
    }
  };

  const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
  // Compact labels for screenshot mode to avoid clipping long names
  const ELEMENT_EMOJI_LABELS: Record<string, string> = {
    Fire: '🔥',
    Ice: '❄️',
    Wind: '🌬️',
    Earth: '⛰️',
    Dark: '🌑',
    Water: '💧',
    Light: '✨',
    Lightning: '⚡',
    Acid: '🧪',
    Sound: '🎵',
  };

  useEffect(() => {
    soundManager.init(uiSounds);
    soundManager.setEnabled(uiSounds);
  }, [uiSounds]);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.sound-click')) {
        soundManager.play('click');
      }
    };
    const hoverHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.sound-hover')) {
        soundManager.play('hover');
      }
    };
    document.addEventListener('click', clickHandler);
    document.addEventListener('mouseover', hoverHandler);
    return () => {
      document.removeEventListener('click', clickHandler);
      document.removeEventListener('mouseover', hoverHandler);
    };
  }, []);

  return {
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
    foodBonus, fortitude, getAvailableSubraces, getBaseClass,
    getClassPassiveData, getRaceResistances, getWeaponStatBonus, giantGene,
    handleCustomBaseStatChange, handleHistoryChange, handleLegendExtendToggle, handleRaceChange,
    handleSubraceChange, hasClassPassive, hasEndurance, hasFortitude,
    hasGhost, history, historyBonus, hpPercent,
    importBuild, inputRefs, isOnline, karakuriYoukai,
    konamiActive, leBonus, legendExtend, loadNamedSave,
    loadTemplate, luminaryElement, lupineInstinct, mainClass,
    mainClassPassive, monoclassModifier, notice, optimizerUndo,
    painTolerance, pendingSharedBuild, persistenceOfNormalcy, powerOfNormalcy,
    race, rawStats, redtailDiceColor, redtailFortuneLevel,
    removeStat, resetStats, restoreDraft, risingGame, sanguineCrest, saveSlots, screenshotRef,
    selectedMainBaseClass, selectedStat, selectedSubBaseClass, setActiveTab,
    setArmorConditionalBonuses, setAstrology, setBaseEvade, setBonusEvade,
    setBuildName, setCharacterLevel, setCustomBaseStats, setCustomFP,
    setCustomHP, setCustomStats, setDragonKing, setDragonQueen,
    setEndurance, setEquippedArmor, setFelidaeInstinct, setFood,
    setFortitude, setGiantGene, setHpPercent, setKarakuriYoukai,
    setLuminaryElement, setLupineInstinct, setMainClass, setMainClassPassive,
    setNotice, setPainTolerance, setPersistenceOfNormalcy, setPowerOfNormalcy,
    setRedtailDiceColor, setRedtailFortuneLevel, setRisingGame,
    setSanguineCrest, setSelectedMainBaseClass, setSelectedStat, setSelectedSubBaseClass,
    setShowAdvanced, setShowChanges, setShowFood, setShowImportExport,
    setShowIntro, setShowIntroOnStartup, setShowMainClassDropdown, setShowRawStats,
    setShowSettings, setShowStamps, setShowStatInfo, setShowSubClassDropdown,
    setShowTalents, setStamps, setSubClass, setSubClassPassive,
    setUiSounds, setWarwalk, setWeaponConfig, shareBuild,
    showAdvanced, showChanges, showFood, showImportExport,
    showIntro, showIntroOnStartup, showMainClassDropdown, showRawStats,
    showSettings, showStamps, showStatInfo, showSubClassDropdown,
    showTalents, stamps, stats, subClass,
    subClassPassive, subrace, takeScreenshot, totalPoints,
    uiSounds, undoOptimization, updateActiveSave, warwalk,
    weaponConfig, youkaiCap, armorUpgradePoints, setArmorUpgradePoints,
    armorMaterial, setArmorMaterial, armorEnchantment, setArmorEnchantment,
    armorClassFilter, setArmorClassFilter, buildEvaluationWithoutArmor,
    shareFormat, setShareFormat, buildCode,
  };
}

export type CalculatorState = ReturnType<typeof useCalculatorState>;
