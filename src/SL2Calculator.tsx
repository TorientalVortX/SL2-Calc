/**
 * SL2 Calculator - Extended Version
 * Added features: Class Passives, Rising Game, Instinct, Subrace support
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Minus, RotateCcw, Settings, Utensils, BookOpen, Download, Upload, Copy } from 'lucide-react';
import WeaponCalculator from './WeaponCalculator';
import type {
  StatKey,
  StampKey,
  ElementKey,
  StatRecord,
  StampRecord,
  ElementalRecord,
  ClassPassive,
  BuildData,
  BuildType,
  OptimizationResult,
  OptimizationParams
} from './types';

// Import data constants
import { STAT_COLORS, ELEMENT_COLORS } from './data/colors';
import { RACES, SUBRACES, RACE_RESISTANCES} from './data/races';
import { CLASSES, CLASS_PASSIVES, CLASS_HIERARCHY  } from './data/classes';
import { FOODS, HISTORY, LEGEND_EXTEND, ASTROLOGY_PLANETS, PLANET_ELEMENTS } from './data/bonuses';
import { STAT_INFO, BUILD_TYPES } from './data/stats';
import { MAX_POINTS, APTITUDE_NUMBER, TEMPLATE_BUILDS } from './data/constants';
import { StatOptimizer } from './utilities/StatOptimizer';

export default function SL2Calculator() {
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
  
  const [totalPoints, setTotalPoints] = useState(MAX_POINTS);
  const [characterLevel, setCharacterLevel] = useState(60);
  const [food, setFood] = useState('None');
  const [history, setHistory] = useState('None');
  
  const [addedStats, setAddedStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

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
  
  useEffect(() => {
    const newTotalPoints = characterLevel * 4;
    const pointsSpent = Object.values(addedStats).reduce((sum, val) => sum + val, 0);
    setTotalPoints(Math.max(0, newTotalPoints - pointsSpent));
  }, [characterLevel, addedStats]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [showCustomStats, setShowCustomStats] = useState(false);
  const [showTalents, setShowTalents] = useState(false);
  const [showRawStats, setShowRawStats] = useState(false);

  // Import/Export state
  const [showImportExport, setShowImportExport] = useState(false);
  const [buildName, setBuildName] = useState('My Build');
  const [importText, setImportText] = useState('');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'stats' | 'weapon' | 'optimizer'>('stats');

  // Stat Optimizer state
  const [selectedBuildType, setSelectedBuildType] = useState<string>('hybrid');
  const [optimizerTargetLevel, setOptimizerTargetLevel] = useState<number>(60);
  const [optimizeWeaponScaling, setOptimizeWeaponScaling] = useState<boolean>(true);
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>('');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationMode, setOptimizationMode] = useState<'weights' | 'targets'>('weights');
  
  // Target stats for target-based optimization
  const [targetStats, setTargetStats] = useState({
    str: 50, wil: 50, ski: 55, cel: 40, def: 35, res: 35, 
    vit: 40, fai: 30, luc: 35, gui: 30, san: 25, apt: 36
  });
  
  // Custom weights state
  const [customWeights, setCustomWeights] = useState({
    youkaiCount: 5, // Starting base youkai count
    summonSurvivability: 5,
    criticalFocus: 5,
    magicDamageFocus: 5,
    physicalDamageFocus: 5,
    accuracyFocus: 5,
    minimumHP: 700, // Restore reasonable default minimum HP
    fpPriority: 5,
    physicalDefense: 5,
    magicalDefense: 5,
    initiativePriority: 5,
    statusResistance: 5,
    carryCapacity: 0,
    targetAPT: 36 as 36 | 42 | 80, // Standard APT target for multiclass (80 for Undeniable Innovator)
    targetEvade: 0, // Target evade value (0 = no target)
  });
  const [showCustomWeights, setShowCustomWeights] = useState<boolean>(false);

  // My descent into madness while writing this function was not worth it
  // I hate myself
  // Please forgive me
  const getBuildTypeWeights = (buildType: string) => {
    const buildDefaults: Record<string, typeof customWeights> = {
      'evade': {
        youkaiCount: 5,
        summonSurvivability: 3,
        criticalFocus: 7,
        magicDamageFocus: 3,
        physicalDamageFocus: 6,
        accuracyFocus: 8,
        minimumHP: 600, // Lower HP for evade tanks
        fpPriority: 5,
        physicalDefense: 2,
        magicalDefense: 3,
        initiativePriority: 9, // High initiative for evade builds
        statusResistance: 4,
        carryCapacity: 2,
        targetAPT: 36 as 36 | 42 | 80, // Standard APT for multiclass
        targetEvade: 115, // High evade target for evade tanks
      },
      'tank': {
        youkaiCount: 5,
        summonSurvivability: 7,
        criticalFocus: 3,
        magicDamageFocus: 4,
        physicalDamageFocus: 5,
        accuracyFocus: 6,
        minimumHP: 850, // Higher HP for tanks
        fpPriority: 6,
        physicalDefense: 10, // Max physical defense
        magicalDefense: 10, // Max magical defense
        initiativePriority: 3,
        statusResistance: 8, // High status resistance
        carryCapacity: 4,
        targetAPT: 36 as 36 | 42 | 80, // Lower APT for stat-focused tanks (changed from 30)
        targetEvade: 35, // Basic mobility
      },
      'glass_cannon': {
        youkaiCount: 8, // Higher youkai for magic glass cannons
        summonSurvivability: 4,
        criticalFocus: 9, // High crit focus
        magicDamageFocus: 9, // High magic damage
        physicalDamageFocus: 8, // High physical damage
        accuracyFocus: 9, // High accuracy for damage
        minimumHP: 500, // Lower HP (glass cannon)
        fpPriority: 8, // High FP for sustained damage
        physicalDefense: 1, // Minimal defense
        magicalDefense: 2,
        initiativePriority: 7, // First strike advantage
        statusResistance: 3,
        carryCapacity: 2,
        targetAPT: 42 as 36 | 42 | 80, // Higher APT for damage efficiency
        targetEvade: 55, // Moderate mobility for DPS
      },
      'hybrid': {
        youkaiCount: 6,
        summonSurvivability: 5,
        criticalFocus: 5,
        magicDamageFocus: 5,
        physicalDamageFocus: 5,
        accuracyFocus: 6,
        minimumHP: 700, // Balanced HP
        fpPriority: 6, // Balanced FP
        physicalDefense: 5, // Balanced defense
        magicalDefense: 5,
        initiativePriority: 5,
        statusResistance: 5,
        carryCapacity: 3,
        targetAPT: 36 as 36 | 42 | 80, // Standard APT for versatility
        targetEvade: 75, // Moderate evade for hybrid builds
      },
      'support': {
        youkaiCount: 7, // Higher for support summons
        summonSurvivability: 8, // Keep summons alive
        criticalFocus: 3,
        magicDamageFocus: 6, // Some magic for healing/buffs
        physicalDamageFocus: 2,
        accuracyFocus: 5,
        minimumHP: 650, // More reasonable HP for support
        fpPriority: 9, // High FP for sustained support
        physicalDefense: 6,
        magicalDefense: 7,
        initiativePriority: 6,
        statusResistance: 9, // High status resistance for support
        carryCapacity: 4,
        targetAPT: 36 as 36 | 42 | 80, // Standard APT for support utility
        targetEvade: 55, // Some mobility for positioning
      },
      'critical': {
        youkaiCount: 5,
        summonSurvivability: 3,
        criticalFocus: 10, // Max critical focus
        magicDamageFocus: 4,
        physicalDamageFocus: 8, // High physical for crit builds
        accuracyFocus: 8, // Need accuracy for crits to land
        minimumHP: 550, // More reasonable HP for crit builds
        fpPriority: 5,
        physicalDefense: 3,
        magicalDefense: 3,
        initiativePriority: 8,
        statusResistance: 4,
        carryCapacity: 3,
        targetAPT: 36 as 36 | 42 | 80, // Standard APT for flexibility (changed from 30)
        targetEvade: 95, // Good evade for positioning in crit builds
      }
    };

    return buildDefaults[buildType] || buildDefaults['hybrid'];
  };

  useEffect(() => {
    const newWeights = getBuildTypeWeights(selectedBuildType);
    setCustomWeights(newWeights);
  }, [selectedBuildType]);

  // Stat info modal state
  const [showStatInfo, setShowStatInfo] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string>('');

  const monoclassModifier = mainClass === subClass ? 2 : 1;

  const exportBuild = (buildName: string = "My Build"): void => {
    const buildData: BuildData = {
      buildName,
      race,
      subrace,
      mainClass,
      subClass,
      selectedMainBaseClass,
      selectedSubBaseClass,
      totalPoints,
      characterLevel,
      food,
      history,
      addedStats,
      customStats,
      customBaseStats,
      stamps,
      legendExtend,
      astrology,
      customHP,
      customFP,
      baseEvade,
      bonusEvade,
      giantGene,
      dragonKing,
      dragonQueen,
      hpPercent,
      sanguineCrest,
      felidaeInstinct,
      lupineInstinct,
      risingGame,
      redtailFortuneLevel,
      redtailDiceColor,
      karakuriYoukai,
      fortitude,
      painTolerance,
      warwalk,
      endurance,
      luminaryElement,
      persistenceOfNormalcy,
      powerOfNormalcy,
      mainClassPassive,
      subClassPassive,
      elementalATKAdjustments,
      elementalRESAdjustments,
      version: "0.4.0"
    };

    const jsonString = JSON.stringify(buildData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buildName.replace(/[^a-zA-Z0-9]/g, '_')}_build.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importBuild = (jsonString: string): boolean => {
    try {
      const buildData: BuildData = JSON.parse(jsonString);
      
      if (!buildData.race || !buildData.subrace || !buildData.mainClass || !buildData.subClass) {
        throw new Error("Invalid build data: missing required fields");
      }

      setRace(buildData.race);
      setSubrace(buildData.subrace);
      setMainClass(buildData.mainClass);
      setSubClass(buildData.subClass);
      
      if (buildData.selectedMainBaseClass) {
        setSelectedMainBaseClass(buildData.selectedMainBaseClass);
      } else {
        const mainBaseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
          data.subClasses.includes(buildData.mainClass) || data.name === buildData.mainClass
        )?.[0] || 'Soldier';
        setSelectedMainBaseClass(mainBaseClass);
      }
      
      if (buildData.selectedSubBaseClass) {
        setSelectedSubBaseClass(buildData.selectedSubBaseClass);
      } else {
        const subBaseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
          data.subClasses.includes(buildData.subClass) || data.name === buildData.subClass
        )?.[0] || 'Soldier';
        setSelectedSubBaseClass(subBaseClass);
      }
      
      setTotalPoints(buildData.totalPoints || MAX_POINTS);
      setCharacterLevel(buildData.characterLevel || 60);
      setFood(buildData.food || 'None');
      setHistory(buildData.history || 'None');
      setAddedStats(buildData.addedStats || {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
      });
      setCustomStats(buildData.customStats || {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
      });
      setCustomBaseStats(buildData.customBaseStats || {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
      });
      setStamps(buildData.stamps || { str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
      setLegendExtend(buildData.legendExtend || {});
      setAstrology(buildData.astrology || '');
      setCustomHP(buildData.customHP || 0);
      setCustomFP(buildData.customFP || 0);
      setBaseEvade(buildData.baseEvade || 0);
      setBonusEvade(buildData.bonusEvade || 0);
      setGiantGene(buildData.giantGene || false);
      setDragonKing(buildData.dragonKing || 0);
      setDragonQueen(buildData.dragonQueen || 0);
      setHpPercent(buildData.hpPercent || 100);
      setSanguineCrest(buildData.sanguineCrest || false);
      setFelidaeInstinct(buildData.felidaeInstinct || false);
      setLupineInstinct(buildData.lupineInstinct || false);
      setRisingGame(buildData.risingGame || 0);
      setRedtailFortuneLevel(buildData.redtailFortuneLevel || 1);
      setRedtailDiceColor(buildData.redtailDiceColor || 'red');
      setKarakuriYoukai(buildData.karakuriYoukai || 'None');
      setFortitude(buildData.fortitude || false);
      setPainTolerance(buildData.painTolerance || 0);
      setWarwalk(buildData.warwalk || false);
      setEndurance(buildData.endurance || false);
      setLuminaryElement(buildData.luminaryElement || false);
      setPersistenceOfNormalcy(buildData.persistenceOfNormalcy || false);
      setPowerOfNormalcy(buildData.powerOfNormalcy || false);
      setMainClassPassive(buildData.mainClassPassive || 0);
      setSubClassPassive(buildData.subClassPassive || 0);
      
      // Import elemental adjustments with defaults
      setElementalATKAdjustments(buildData.elementalATKAdjustments || {
        Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
      });
      setElementalRESAdjustments(buildData.elementalRESAdjustments || {
        Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import build:', error);
      return false;
    }
  };

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

    const pointsSpent = Object.values(template.stats).reduce((sum: number, val: number) => sum + val, 0);
    setTotalPoints(Math.max(0, 240 - pointsSpent));
  };

  const copyBuildToClipboard = async (buildName: string = "My Build"): Promise<boolean> => {
    const buildData: BuildData = {
      buildName,
      race,
      subrace,
      mainClass,
      subClass,
      totalPoints,
      characterLevel,
      food,
      history,
      addedStats,
      customStats,
      customBaseStats,
      stamps,
      legendExtend,
      astrology,
      customHP,
      customFP,
      baseEvade,
      bonusEvade,
      giantGene,
      dragonKing,
      dragonQueen,
      hpPercent,
      sanguineCrest,
      felidaeInstinct,
      lupineInstinct,
      risingGame,
      redtailFortuneLevel,
      redtailDiceColor,
      karakuriYoukai,
      fortitude,
      painTolerance,
      warwalk,
      endurance,
      luminaryElement,
      persistenceOfNormalcy,
      powerOfNormalcy,
      mainClassPassive,
      subClassPassive,
      elementalATKAdjustments,
      elementalRESAdjustments,
      version: "0.4.0"
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(buildData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
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
    let totalPointsFreed = 0;

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
      const historyBonus = (newHistoryBonus as any)[stat] || 0;
      const manualPoints = adjustedStats[stat];

      const total = raceBase + customBase + manualPoints + legendExtendBonus + historyBonus;
      
      if (total > 80) {
        const excess = total - 80;
        const newManualPoints = Math.max(0, manualPoints - excess);
        const pointsRemoved = manualPoints - newManualPoints;
        
        adjustedStats[stat] = newManualPoints;
        totalPointsFreed += pointsRemoved;

        const inputElement = inputRefs.current[stat];
        if (inputElement) {
          inputElement.value = newManualPoints.toString();
        }

        console.log(`Stat ${stat.toUpperCase()} capped: ${manualPoints} → ${newManualPoints} (${pointsRemoved} points freed)`);
      }
    });

    if (totalPointsFreed > 0) {
      setTotalPoints(prev => Math.min(MAX_POINTS, prev + totalPointsFreed));
    }

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

  // Calculate Rising Game bonus
  const calculateRisingGame = (): Partial<StatRecord> => {
    const hpLost = 100 - hpPercent;
    let bonusPerStat = Math.floor(hpLost / 15);
    
    // Cap based on rising game rank
    const caps = [0, 2, 3, 4, 5, 6];
    bonusPerStat = Math.min(bonusPerStat, caps[risingGame] || 0);
    
    return {
      str: bonusPerStat,
      wil: bonusPerStat,
      ski: bonusPerStat,
      cel: bonusPerStat,
      res: bonusPerStat,
      luc: bonusPerStat
    };
  };

  // Calculate Instinct bonus (Felidae/Grimalkin/Lupine)
  const calculateInstinct = (): Partial<StatRecord> => {
    if (hpPercent > 50) return {};
    
    const baseInstinct = Math.floor(stats.san * 0.1 + 1);
    const bonus = hpPercent <= 25 ? baseInstinct * 2 : baseInstinct;
    
    // Felidae & Grimalkin Instinct: SKI, CEL, LUC, GUI
    if ((subrace === 'Felidae' || subrace === 'Grimalkin') && felidaeInstinct) {
      return { ski: bonus, cel: bonus, gui: bonus, luc: bonus };
    }
    
    // Lupine Instinct: STR, WIL, DEF, RES
    if (subrace === 'Lupine' && lupineInstinct) {
      return { str: bonus, wil: bonus, def: bonus, res: bonus };
    }
    
    // Leporidae Instinct: Currently only affects Rabbit Foot (not stat-related)
    // We track the state but don't add stat bonuses
    
    return {};
  };

  // Calculate Redtail Fox God's Blessing bonus
  const calculateRedtailBonus = (): Partial<StatRecord> => {
    if (subrace !== 'Redtail') return {};
    
    const scaledSAN = Math.floor(stats.san);
    const sanMultiplier = Math.min(Math.floor(scaledSAN / 10), 5); // Max 5x
    const fortuneLevel = redtailFortuneLevel;
    
    // Base multiplier: 1x per Fortune Level
    // Enhanced by SAN: +1x per 10 Scaled SAN (max +5x total)
    const totalMultiplier = 1 + sanMultiplier;
    
    const bonuses: Partial<StatRecord> = {};
    
    if (redtailDiceColor === 'red') {
      // Red Dice: Hit and Critical
      // These are combat stats we can't directly add to StatRecord
      // But if Fortune Level is 1, apply penalties
      // Note: Hit/Critical aren't in StatRecord, so this is mainly for display
      // In a real implementation, you'd track these separately
      return {}; // Combat stats handled separately
    } else if (redtailDiceColor === 'green') {
      // Green Dice: Luck-based status effect chances
      // This is also a combat effect, not a base stat
      return {}; // Combat effects handled separately
    } else if (redtailDiceColor === 'yellow') {
      // Yellow Dice: Evade and Critical Evade
      // These are also combat stats, not base stats
      return {}; // Combat stats handled separately
    }
    
    return bonuses;
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

  // Get class passive bonuses
  const getClassPassiveBonus = (className: string, rank: number): Partial<StatRecord> => {
    if (rank === 0) return {};
    
    const bonuses: Partial<StatRecord> = {};
    
    // Check for passive in the current class
    const classPassive = CLASS_PASSIVES[className];
    if (classPassive) {
      Object.entries(classPassive.stats).forEach(([stat, value]) => {
        bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + (value || 0) * rank;
      });
    }
    
    // Also check for base class passive (if different from current class)
    const baseClass = getBaseClass(className);
    if (baseClass !== className) {
      const basePassive = CLASS_PASSIVES[baseClass];
      if (basePassive) {
        Object.entries(basePassive.stats).forEach(([stat, value]) => {
          bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + (value || 0) * rank;
        });
      }
    }
    
    // Special case for Dark Bard - extra STR bonus at rank 7+
    if (className === 'Dark Bard' && rank >= 7) {
      bonuses.str = (bonuses.str || 0) + (rank - 6);
    }
    
    return bonuses;
  };

  const calculateDiminishingReturns = (
    racialStat: number, 
    addedStat: number, 
    classStat: number, 
    customStat: number,
    aptitudeBonus: number, 
    dragonBonus = 0
  ): number => {
    const softCap = racialStat + 40 + dragonBonus;
    let totalStat = racialStat + addedStat + (classStat * monoclassModifier) + customStat + aptitudeBonus;
    
    if (dragonBonus > 0) {
      totalStat = totalStat + Math.floor(totalStat * 0.05 * (dragonBonus / 3));
    }
    
    if (softCap >= totalStat) return totalStat;
    
    let effective = softCap;
    let remaining = totalStat - softCap;
    let multiplier = 0.9;
    
    while (remaining > 3) {
      remaining -= 3;
      effective += 3 * multiplier;
      multiplier -= 0.08;
      if (multiplier < 0.1) multiplier = 0.1;
    }
    
    return effective + (remaining * multiplier);
  };

  const getAptitudeBonus = (): number => {
    const subraceData = SUBRACES[subrace];
    const effectiveApt = calculateDiminishingReturns(
      (subraceData?.apt || 0) + customBaseStats.apt,
      addedStats.apt,
      0,
      customStats.apt,
      0
    );
    return Math.floor(effectiveApt / APTITUDE_NUMBER);
  };

  // Get combined class passive bonuses, avoiding double-counting base class passives
  const getCombinedClassPassiveBonuses = (mainClass: string, mainRank: number, subClass: string, subRank: number): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    
    // Get main class bonuses
    const mainBonuses = getClassPassiveBonus(mainClass, mainRank);
    Object.entries(mainBonuses).forEach(([stat, value]) => {
      bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + (value || 0);
    });
    
    // Get sub class bonuses
    const subBonuses = getClassPassiveBonus(subClass, subRank);
    
    // Check if main and sub classes share the same base class
    const mainBaseClass = getBaseClass(mainClass);
    const subBaseClass = getBaseClass(subClass);
    const sharedBaseClass = mainBaseClass === subBaseClass ? mainBaseClass : null;
    
    // Apply sub class bonuses, but subtract shared base class passive if it would be double-counted
    Object.entries(subBonuses).forEach(([stat, value]) => {
      let adjustedValue = value || 0;
      
      // If classes share a base class and both would inherit the same base passive, subtract one instance
      if (sharedBaseClass && sharedBaseClass !== mainClass && sharedBaseClass !== subClass) {
        const basePassive = CLASS_PASSIVES[sharedBaseClass];
        if (basePassive && basePassive.stats[stat as StatKey]) {
          // Only subtract if both classes are actually inheriting from base (not using their own passive)
          const mainHasOwnPassive = CLASS_PASSIVES[mainClass] !== undefined;
          const subHasOwnPassive = CLASS_PASSIVES[subClass] !== undefined;
          
          if (!mainHasOwnPassive && !subHasOwnPassive) {
            // Both classes are inheriting from base, so subtract one instance
            adjustedValue -= (basePassive.stats[stat as StatKey] || 0) * subRank;
          }
        }
      }
      
      bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + adjustedValue;
    });
    
    return bonuses;
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

  const aptitudeBonus = Math.max(0, getAptitudeBonus());
  const leBonus = getLEBonus();
  const astroBonus = getAstrologyBonus();
  const foodBonus = FOODS[food];
  const historyBonus = HISTORY[history];
  const sanguineBonus = (sanguineCrest && (subrace === 'Oni' || subrace === 'Vampire')) ? 2 : 0;
  const risingGameBonus = calculateRisingGame();
  const combinedPassiveBonuses = getCombinedClassPassiveBonuses(mainClass, mainClassPassive, subClass, subClassPassive);

  // Karakuri youkai modifiers
  const getKarakuriYoukaiBonus = (): StatRecord => {
    if (subrace !== 'Karakuri') {
      return { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
    }

    switch (karakuriYoukai) {
      case 'Avian':
        return { str: 0, wil: -3, ski: 0, cel: 2, def: -2, res: 0, vit: 0, fai: 0, luc: 0, gui: 3, san: 0, apt: 0 };
      case 'Beast':
        return { str: 0, wil: 0, ski: 3, cel: 0, def: 0, res: -3, vit: 0, fai: 0, luc: 2, gui: -2, san: 0, apt: 0 };
      case 'Dragon':
        return { str: 3, wil: 0, ski: 0, cel: -3, def: 2, res: -2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
      case 'Fairy':
        return { str: -3, wil: -2, ski: 0, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 };
      case 'Mystic':
        return { str: -3, wil: 3, ski: 2, cel: 0, def: 0, res: -2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
      case 'Night':
        return { str: 0, wil: 0, ski: 0, cel: 0, def: -3, res: 3, vit: 0, fai: -2, luc: 0, gui: 2, san: 0, apt: 0 };
      case 'Plant':
        return { str: 0, wil: 0, ski: 0, cel: 0, def: 3, res: 0, vit: 2, fai: 0, luc: -2, gui: -3, san: 0, apt: 0 };
      default:
        return { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
    }
  };

  const karakuriYoukaiBonus = getKarakuriYoukaiBonus();

  const getEffectiveStat = (statName: StatKey): number => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    // Now only subrace provides stat bonuses, race provides special flags only
    const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName] + (karakuriYoukaiBonus[statName] || 0);
    const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
    
    // Sanguine Crest only affects STR, WIL, SKI, CEL, DEF
    const sanguineBonusForStat = (['str', 'wil', 'ski', 'cel', 'def'].includes(statName)) ? sanguineBonus : 0;
    
    // Power of Normalcy affects all stats except APT
    const powerOfNormalcyBonus = (() => {
      if (statName === 'apt' || !powerOfNormalcy) return 0;
      
      const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
      const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
      
      if (mainIsBase && subIsBase) {
        return mainClass === subClass ? 8 : 4; // Same Base Class: +8, Both Base Classes: +4
      }
      return 0;
    })();
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      + (foodBonus.stats[statName] || 0) 
      + (historyBonus.stats[statName] || 0)
      + stampValue 
      + sanguineBonusForStat
      + powerOfNormalcyBonus
      + (risingGameBonus[statName] || 0)
      + (combinedPassiveBonuses[statName] || 0)
      + (leBonus[statName] || 0); // Legend Extend now added BEFORE diminishing returns
    
    const classValue = classData?.[statName] || 0;
    const customValue = customStats[statName];
    
    let dragonBonus = 0;
    if (statName === 'str') dragonBonus = dragonKing * 3;
    if (statName === 'wil') dragonBonus = dragonQueen * 3;
    
    const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
    const effective = calculateDiminishingReturns(racialValue, addedValue, classValue, customValue, aptBonusToApply, dragonBonus);
    
    // Legend Extend bonuses now included in addedValue before diminishing returns
    return effective;
  };

  const getRawStat = (statName: StatKey): number => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    // Raw stat is the total before diminishing returns are applied
    const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName] + (karakuriYoukaiBonus[statName] || 0);
    const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
    
    // Sanguine Crest only affects STR, WIL, SKI, CEL, DEF
    const sanguineBonusForStat = (['str', 'wil', 'ski', 'cel', 'def'].includes(statName)) ? sanguineBonus : 0;
    
    // Power of Normalcy affects all stats except APT
    const powerOfNormalcyBonus = (() => {
      if (statName === 'apt' || !powerOfNormalcy) return 0;
      
      const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
      const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
      
      if (mainIsBase && subIsBase) {
        return mainClass === subClass ? 8 : 4; // Same Base Class: +8, Both Base Classes: +4
      }
      return 0;
    })();
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      + (foodBonus.stats[statName] || 0) 
      + (historyBonus.stats[statName] || 0)
      + stampValue 
      + sanguineBonusForStat
      + powerOfNormalcyBonus
      + (risingGameBonus[statName] || 0)
      + (combinedPassiveBonuses[statName] || 0)
      + (leBonus[statName] || 0);
    
    const classValue = (classData?.[statName] || 0) * monoclassModifier;
    const customValue = customStats[statName];
    
    let dragonBonus = 0;
    if (statName === 'str') dragonBonus = dragonKing * 3;
    if (statName === 'wil') dragonBonus = dragonQueen * 3;
    
    const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
    
    // Raw stat = base + additions + class + custom + dragon + aptitude (no diminishing returns)
    return racialValue + addedValue + classValue + customValue + dragonBonus + aptBonusToApply;
  };

  const stats: StatRecord = {
    str: getEffectiveStat('str'),
    wil: getEffectiveStat('wil'),
    ski: getEffectiveStat('ski'),
    cel: getEffectiveStat('cel'),
    def: getEffectiveStat('def'),
    res: getEffectiveStat('res'),
    vit: getEffectiveStat('vit'),
    fai: getEffectiveStat('fai'),
    luc: getEffectiveStat('luc'),
    gui: getEffectiveStat('gui'),
    san: getEffectiveStat('san'),
    apt: getEffectiveStat('apt')
  };

  const rawStats: StatRecord = {
    str: getRawStat('str'),
    wil: getRawStat('wil'),
    ski: getRawStat('ski'),
    cel: getRawStat('cel'),
    def: getRawStat('def'),
    res: getRawStat('res'),
    vit: getRawStat('vit'),
    fai: getRawStat('fai'),
    luc: getRawStat('luc'),
    gui: getRawStat('gui'),
    san: getRawStat('san'),
    apt: getRawStat('apt')
  };

  // Apply instinct bonus after initial calculation
  const instinctBonus = calculateInstinct();
  Object.entries(instinctBonus).forEach(([stat, value]) => {
    if (value) {
      stats[stat as StatKey] += value;
      rawStats[stat as StatKey] += value; // Apply to raw stats too
    }
  });

  if (dragonKing > 0) {
    stats.str = Math.floor(stats.str * (1 + 0.05 * dragonKing));
    // Raw stats don't get the percentage bonus from dragon pieces - they already include the flat +3 per piece
  }
  if (dragonQueen > 0) {
    stats.wil = Math.floor(stats.wil * (1 + 0.05 * dragonQueen));
    // Raw stats don't get the percentage bonus from dragon pieces - they already include the flat +3 per piece
  }

  // Choose which stats to display
  const displayStats = showRawStats ? rawStats : stats;

  const calculateMaxHP = (): number => {
    const raceData = RACES[race];
    const subraceData = SUBRACES[subrace];
    
    let vitHP = Math.floor(stats.vit * 10);
    if (raceData?.homunculi || subraceData?.homunculi) {
      vitHP -= Math.floor(stats.vit / 2);
    }
    
    const sanHP = Math.floor(stats.san * 2);
    const strHP = (addedStats.str + (subraceData?.str || 0) + (astroBonus.str || 0)) * 3;
    const pointsSpent = MAX_POINTS - totalPoints;
    
    let maxHP = vitHP + sanHP + strHP + pointsSpent;
    
    if (giantGene) {
      maxHP = Math.floor(maxHP * 1.1);
    }
    
    // Fortitude bonus
    if (fortitude) {
      maxHP += Math.floor(maxHP * 0.1);
    }
    
    // Pain Tolerance
    maxHP += painTolerance * 10;
    
    // Warwalk
    if (warwalk) {
      maxHP += 30;
    }
    
    // Endurance
    if (endurance) {
      maxHP = Math.floor(maxHP * 1.15);
    }
    
    maxHP += customHP;
    
    // Persistence of Normalcy
    if (persistenceOfNormalcy) {
      const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
      const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
      
      if (mainIsBase && subIsBase) {
        if (mainClass === subClass) {
          maxHP += 200; // Same Base Class
        } else {
          maxHP += 100; // Both Base Classes
        }
      }
    }
    
    // Lich Magia Detremus: -30% HP (reduced by 1% per 2 Scaled SAN)
    if (subrace === 'Lich') {
      const sanModifier = Math.floor(stats.san / 2);
      const hpPenalty = Math.max(0, 30 - sanModifier); // Can't go below 0% penalty
      maxHP = Math.floor(maxHP * (1 - hpPenalty / 100));
    }
    
    return maxHP;
  };

  const calculateHP = (): number => {
    const maxHP = calculateMaxHP();
    return Math.floor(maxHP * (hpPercent / 100));
  };

  const calculateMP = (): number => {
    const raceData = RACES[race];
    const subraceData = SUBRACES[subrace];
    
    let willMP = Math.floor(stats.wil * 5);
    if (raceData?.homunculi || subraceData?.homunculi) {
      willMP += Math.floor(stats.wil);
    }
    
    const sanMP = Math.floor(stats.san * 2);
    const faiMP = Math.floor(stats.fai * 3);
    
    let maxMP = willMP + sanMP + faiMP;
    
    // Warwalk
    if (warwalk) {
      maxMP += 30;
    }
    
    maxMP += customFP;
    
    // Lich Magia Detremus: +50% FP (increased by 1% per 2 Scaled SAN)
    if (subrace === 'Lich') {
      const sanModifier = Math.floor(stats.san / 2);
      const fpBonus = 50 + sanModifier;
      maxMP = Math.floor(maxMP * (1 + fpBonus / 100));
    }
    
    return maxMP;
  };

  const calculateElementalATK = (element: string): number => {
    // Helper function to get raw (unscaled) stat value for a given stat
    const getRawStat = (statName: StatKey): number => {
      const subraceData = SUBRACES[subrace];
      const classData = CLASSES[mainClass];
      
      // Calculate the same way as getEffectiveStat but without diminishing returns
      const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName] + (karakuriYoukaiBonus[statName] || 0);
      const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
      
      // Sanguine Crest only affects STR, WIL, SKI, CEL, DEF
      const sanguineBonusForStat = (['str', 'wil', 'ski', 'cel', 'def'].includes(statName)) ? sanguineBonus : 0;
      
      const addedValue = addedStats[statName] 
        + (astroBonus[statName] || 0) 
        + (foodBonus.stats[statName] || 0) 
        + (historyBonus.stats[statName] || 0)
        + stampValue 
        + sanguineBonusForStat
        + (risingGameBonus[statName] || 0)
        + (combinedPassiveBonuses[statName] || 0);
      
      const classValue = classData?.[statName] || 0;
      const customValue = customStats[statName];
      
      let dragonBonus = 0;
      if (statName === 'str') dragonBonus = dragonKing * 3;
      if (statName === 'wil') dragonBonus = dragonQueen * 3;
      
      const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
      
      // Return the raw total without diminishing returns, but include LE bonus
      let rawTotal = racialValue + addedValue + (classValue * monoclassModifier) + customValue + aptBonusToApply + dragonBonus;
      
      // Add Legend Extend bonuses (these come after everything)
      rawTotal += (leBonus[statName] || 0);
      
      return rawTotal;
    };

    const statMap: Record<string, StatKey> = {
      'Fire': 'str', 'Ice': 'ski', 'Wind': 'cel', 'Earth': 'def',
      'Dark': 'res', 'Water': 'vit', 'Light': 'fai', 'Lightning': 'luc',
      'Acid': 'gui', 'Sound': 'san'
    };

    // Add +2 elemental attack if the matching planet sign is selected
    const planetBonus = (astrology && PLANET_ELEMENTS[astrology] === element) ? 2 : 0;
    
    // Get the starsign's element if astrology is selected
    const starsignElement = astrology ? PLANET_ELEMENTS[astrology] : null;
    
    let wilBonus = 0;
    let statBonus = 0;
    
    if (luminaryElement) {
      // Luminary Element: WIL no longer increases all elements
      // Instead, it increases your Starsign's element by 1 per 1 WIL (no diminishing returns)
      // The original stat that grants a bonus to this element no longer does so
      if (starsignElement === element) {
        // For starsign element: Raw WIL gives 1:1 bonus (ignoring diminishing returns), original stat gives 0
        wilBonus = getRawStat('wil');
        statBonus = 0;
      } else {
        // For other elements: no WIL bonus, use scaled stat bonus normally
        wilBonus = 0;
        statBonus = stats[statMap[element]];
      }
    } else {
      // Normal WIL behavior: adds to all elemental ATK except Sound and Acid (per 4 points, using scaled WIL)
      wilBonus = (element !== 'Sound' && element !== 'Acid') ? Math.floor(stats.wil / 4) : 0;
      statBonus = stats[statMap[element]];
    }
    
    // Add manual adjustment for this element
    const manualAdjustment = elementalATKAdjustments[element as ElementKey] || 0;
    
    // Handle special racial attack bonuses
    let raceBonus = 0;
    if (subrace === 'Umbral' && element === 'Dark') {
      // Umbral: Dark ATK increased by half of character level (max: 15)
      raceBonus = Math.min(15, Math.floor(characterLevel / 2));
    } else if (subrace === 'Theno' && element === 'Sound') {
      // Theno: Base Sound ATK equals character level, doesn't increase from stat points
      return Math.floor(characterLevel + planetBonus + manualAdjustment);
    }
    
    return Math.floor(statBonus + wilBonus + planetBonus + manualAdjustment + raceBonus);
  };

  const calculateElementalRES = (element: string): number => {
    // Elemental resistance: +1% per 6 SAN points for Fire, Ice, Wind, Earth, Water, Lightning, Dark, and Light
    // Sound and Acid elements don't get SAN-based resistance
    let baseResistance = 0;
    if (element !== 'Sound' && element !== 'Acid') {
      baseResistance = Math.floor(stats.san / 6);
    }
    
    // Add manual adjustment for this element
    const manualAdjustment = elementalRESAdjustments[element as ElementKey] || 0;
    
    // Add race-based resistance/weakness for this element
    const raceAdjustment = getRaceResistances()[element as ElementKey] || 0;
    
    return Math.floor(baseResistance + manualAdjustment + raceAdjustment);
  };

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

  const youkaiCap = Math.floor(((SUBRACES[subrace]?.fai || 0) + customBaseStats.fai + addedStats.fai + (astroBonus.fai || 0)) / 5) + 5;

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
    const currentHistoryBonus = (historyBonus as any)[statName] || 0;
    
    const totalBase = raceBase + customBase;
    const currentTotal = totalBase + currentValue + legendExtendBonus + currentHistoryBonus;
    const wouldExceedHardCap = currentTotal >= 80;
    
    // Only add if we have points available, current value is valid, and we haven't hit hard cap
    if (availablePoints > 0 && currentValue >= 0 && currentValue < MAX_POINTS && !wouldExceedHardCap) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] + 1 }));
      setTotalPoints(prev => Math.max(0, prev - 1));
      
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
      setTotalPoints(prev => Math.min(MAX_POINTS, prev + 1));
      
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
    setTotalPoints(MAX_POINTS);
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
    const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
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
          setTotalPoints(prev => Math.max(0, prev - pointsToAdd));
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
          setTotalPoints(prev => Math.min(MAX_POINTS, prev + pointsToRemove));
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

  // Validation function to ensure point integrity
  const validatePointTotals = () => {
    const totalUsedPoints = Object.values(addedStats).reduce((sum, value) => sum + value, 0);
    const expectedRemainingPoints = MAX_POINTS - totalUsedPoints;
    
    // If totals don't match, correct them
    if (totalPoints !== expectedRemainingPoints) {
      console.warn(`Point total mismatch detected. Correcting from ${totalPoints} to ${expectedRemainingPoints}`);
      setTotalPoints(Math.max(0, Math.min(MAX_POINTS, expectedRemainingPoints)));
    }
  };

  // Auto-validate point totals whenever addedStats or totalPoints change
  useEffect(() => {
    validatePointTotals();
  }, [addedStats, totalPoints]);

  // Check if class has fortitude access
  const hasFortitude = ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(mainClass) 
    || ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(subClass);

  // Check if class has endurance access
  const hasEndurance = mainClass === 'Hexer' || subClass === 'Hexer';

  // Check if class/race has Rising Game/Pain Tolerance
  const hasGhost = mainClass === 'Ghost' || subClass === 'Ghost';

  const StatRow = ({ label, statKey }: { label: string; statKey: StatKey }) => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    const subraceBase = subraceData?.[statKey] || 0;
    const customBase = customBaseStats[statKey];
    const classBase = classData?.[statKey] || 0;
    
    const totalBase = subraceBase + customBase;
    const pointsAdded = addedStats[statKey];
    const legendExtendBonus = leBonus[statKey] || 0;
    const historyInvested = historyBonus.stats[statKey] || 0;
    const astrologyBonus = astroBonus[statKey] || 0;
    const totalInvested = pointsAdded + legendExtendBonus + historyInvested + astrologyBonus; // Include LE, History, and Astrology in invested display
    const customFlat = customStats[statKey];
    
    // Get the color for this stat
    let statColor = STAT_COLORS[statKey];
    let isRainbow = statColor === 'rainbow';
    
    // Special case: WIL with Luminary Element changes to element color
    if (statKey === 'wil' && luminaryElement && astrology && PLANET_ELEMENTS[astrology]) {
      const elementColor = ELEMENT_COLORS[PLANET_ELEMENTS[astrology]];
      if (elementColor) {
        statColor = elementColor;
        isRainbow = false; // Override rainbow if it was set
      }
    }
    
    // Build detailed tooltip showing all sources
    const tooltipParts = [
      `Subrace (${subrace}): ${subraceBase}`, 
      customBase !== 0 ? `Custom Base: ${customBase}` : null,
      `Class (${mainClass}): ${classBase}${monoclassModifier === 2 ? ' x2 (monoclass)' : ''}`,
      pointsAdded > 0 ? `Points Added: ${pointsAdded}` : null,
      customFlat !== 0 ? `Custom Flat Bonus: ${customFlat}` : null,
      astroBonus[statKey] ? `Astrology: ${astroBonus[statKey]}` : null,
      leBonus[statKey] ? `Legend Extend: +${leBonus[statKey]}` : null,
      foodBonus.stats[statKey] ? `Food: ${foodBonus.stats[statKey]}` : null,
      historyBonus.stats[statKey] ? `History: ${historyBonus.stats[statKey]}` : null,
      showRawStats ? `Raw Total: ${displayStats[statKey].toFixed(1)}` : `Final (after DR): ${displayStats[statKey].toFixed(1)}`
    ].filter(Boolean).join('\n');

    return (
      <div className="flex items-center gap-2 py-2 border-b border-gray-700">
        <button 
          className="w-24 font-semibold text-left hover:underline cursor-pointer" 
          style={isRainbow ? {
            background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          } : { color: statColor }} 
          title="Click for detailed info"
          onClick={() => {
            setSelectedStat(statKey);
            setShowStatInfo(true);
          }}
        >
          {label}
        </button>
        <button
          onClick={() => removeStat(statKey)}
          disabled={addedStats[statKey] === 0}
          className="p-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded"
          title="Remove 1 point"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => addStat(statKey)}
          disabled={(() => {
            if (totalPoints === 0) return true;
            
            // Calculate current bonuses for this stat using same logic as addStat
            // Class stats do NOT count toward the hard cap
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
            
            return addedStats[statKey] >= maxAllowedManualPoints;
          })()}
          className="p-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded"
          title={(() => {
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
            
            return addedStats[statKey] >= maxAllowedManualPoints ? 
              `Hard cap reached (max ${maxAllowedManualPoints} manual points with race+custom base ${totalBase} + LE ${legendExtendBonus} + History ${currentHistoryBonus})` : 
              "Add 1 point";
          })()}
        >
          <Plus size={16} />
        </button>
        <input
          ref={(el) => { if (el) inputRefs.current[statKey] = el; }}
          type="number"
          min="0"
          max={(() => {
            // Class stats do NOT count toward the hard cap
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            return 80 - totalBase - legendExtendBonus - currentHistoryBonus;
          })()}
          defaultValue={pointsAdded}
          key={`${statKey}-${pointsAdded}`} // Force reset when points change via +/- buttons
          onInput={(e) => {
            // Visual feedback while typing
            const input = e.currentTarget;
            const value = parseInt(input.value) || 0;
            
            // Calculate dynamic hard cap
            // Class stats do NOT count toward the hard cap
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
            
            // Basic range validation during typing (dynamic hard cap)
            if (value < 0) {
              input.value = '0';
            } else if (value > maxAllowedManualPoints) {
              input.value = maxAllowedManualPoints.toString();
            }
            
            // Visual feedback
            input.style.backgroundColor = '#92400e'; // Yellow-900
            input.style.borderColor = '#d97706'; // Yellow-600
            input.style.color = '#fef3c7'; // Yellow-200
          }}
          onBlur={(e) => {
            commitStatValue(statKey, e.currentTarget);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              commitStatValue(statKey, e.currentTarget);
              e.currentTarget.blur();
            }
          }}
          className="w-16 border rounded px-2 py-1 text-center bg-gray-700 border-gray-600"
          title="Type number and press Enter or click away to apply"
        />
        <div className="flex-1 text-right">
          <span 
            className="text-2xl font-bold" 
            style={isRainbow ? {
              background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            } : { color: statColor }} 
            title={tooltipParts}
          >
            {Math.floor(displayStats[statKey])}
          </span>
          <span className="text-sm text-gray-400 ml-2" title={`Base: ${subraceBase} (from ${subrace}) + ${customBase > 0 ? customBase + ' (custom) + ' : ''}${totalInvested} (invested points + Legend Extend + History)`}>
            ({totalBase} + {totalInvested})
          </span>
        </div>
      </div>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.hierarchical-class-selector')) {
        setShowMainClassDropdown(false);
        setShowSubClassDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // POE-style hierarchical class selection component
  const HierarchicalClassSelector = ({ 
    type, 
    selectedBaseClass, 
    selectedClass, 
    onBaseClassChange, 
    onClassChange, 
    showDropdown, 
    setShowDropdown 
  }: {
    type: 'Main' | 'Sub';
    selectedBaseClass: string;
    selectedClass: string;
    onBaseClassChange: (baseClass: string) => void;
    onClassChange: (className: string) => void;
    showDropdown: boolean;
    setShowDropdown: (show: boolean) => void;
  }) => {
    return (
      <div className="relative hierarchical-class-selector">
        <label className="block text-sm font-medium mb-2">{type} Class</label>
        
        {/* Selected class display */}
        <div 
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 cursor-pointer hover:bg-gray-600 flex justify-between items-center"
        >
          <div className="flex flex-col">
            <span className="text-white">{selectedClass}</span>
            {selectedClass !== selectedBaseClass && (
              <span className="text-xs text-gray-400">from {selectedBaseClass}</span>
            )}
          </div>
          <span className="text-gray-400">▼</span>
        </div>

        {/* Dropdown menu */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-80 overflow-y-auto">
            <div className="px-3 py-2 text-xs text-gray-400 bg-gray-900 border-b border-gray-700">
              💡 Select a base class or its promotion class
            </div>
            {Object.entries(CLASS_HIERARCHY).map(([baseClassName, baseClassData]) => (
              <div key={baseClassName} className="border-b border-gray-700 last:border-b-0">
                {/* Base class header - styled like POE skill tree nodes */}
                <div 
                  className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors border-l-4 relative ${
                    selectedBaseClass === baseClassName 
                      ? 'bg-red-800 text-red-100 border-red-400' 
                      : 'bg-red-700 text-red-200 border-red-500 hover:bg-red-600 hover:border-red-400'
                  }`}
                  onClick={() => {
                    onBaseClassChange(baseClassName);
                    onClassChange(baseClassName); // Set base class as selected
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>⚔️ {baseClassName}</span>
                    <span className="text-xs opacity-75">
                      {selectedClass === baseClassName ? '✓ Selected' : 'Click to select'}
                    </span>
                  </div>
                </div>
                
                {/* Subclasses header */}
                <div className="px-4 py-1 text-xs text-gray-500 bg-gray-800 border-l-2 border-gray-600 ml-2">
                  Promotion Classes:
                </div>
                
                {/* Subclasses - styled like POE ascendancy classes */}
                <div className="bg-gray-900">
                  {baseClassData.subClasses.map(subClassName => (
                    <div
                      key={subClassName}
                      className={`px-6 py-2 text-sm cursor-pointer transition-colors border-l-2 ml-2 relative ${
                        selectedClass === subClassName
                          ? 'bg-blue-800 text-blue-100 border-blue-400'
                          : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-blue-500'
                      }`}
                      onClick={() => {
                        onBaseClassChange(baseClassName);
                        onClassChange(subClassName);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span>↳ {subClassName}</span>
                        {selectedClass === subClassName && (
                          <span className="text-xs opacity-75">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * Run stat optimization
   */
  const runOptimization = async (): Promise<void> => {
    setIsOptimizing(true);
    setOptimizationResult(null);

    try {
      // Small delay for UI responsiveness
      await new Promise(resolve => setTimeout(resolve, 100));

      const buildType = BUILD_TYPES[selectedBuildType];
      if (!buildType) {
        throw new Error('Invalid build type selected');
      }

      const params: OptimizationParams = {
        buildType: selectedBuildType,
        mainClass,
        subClass,
        race,
        subrace,
        history,
        astrology,
        legendExtend,
        targetLevel: optimizerTargetLevel,
        includeCustomStats: true,
        customStats,
        customBaseStats,
        customHP,
        customFP,
        prioritizeWeaponScaling: optimizeWeaponScaling,
        weaponType: selectedWeaponType,
        mainClassPassive,
        subClassPassive,
        baseEvade,
        bonusEvade,
        optimizationMode,
        targetStats: optimizationMode === 'targets' ? targetStats : undefined,
        customWeights: optimizationMode === 'weights' ? customWeights : undefined
      };

      const optimizer = new StatOptimizer(buildType, params);
      const result = optimizer.optimize();

      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
      setOptimizationResult({
        stats: { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
        race: race,
        subrace: subrace,
        mainClass: mainClass,
        subClass: subClass,
        allocatedStats: { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
        totalPoints: 0,
        score: 0,
        reasoning: ['Optimization failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: [],
        analysis: {}
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  /**
   * Apply optimization result to current build
   */
  const applyOptimization = (): void => {
    if (!optimizationResult) return;

    setAddedStats(optimizationResult.allocatedStats);
    const pointsUsed = Object.values(optimizationResult.allocatedStats).reduce((sum, val) => sum + val, 0);
    setTotalPoints(MAX_POINTS - pointsUsed);
  };

  const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">SL2 Calculator Suite</h1>
            <div className="text-sm text-gray-400">Version 0.4.0a</div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Stat Calculator
            </button>
            <button
              onClick={() => setActiveTab('weapon')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'weapon'
                  ? 'border-b-2 border-yellow-500 text-yellow-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Weapon Calculator
            </button>
            <button
              onClick={() => setActiveTab('optimizer')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'optimizer'
                  ? 'border-b-2 border-green-500 text-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Stat Optimizer
            </button>
          </div>

          {/* Stat Calculator Tab */}
          {activeTab === 'stats' && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Race Category</label>
              <select
                value={race}
                onChange={(e) => handleRaceChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(RACES).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Race/Subrace (Stats)</label>
              <select
                value={subrace}
                onChange={(e) => handleSubraceChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {getAvailableSubraces().map(sr => (
                  <option key={sr} value={sr}>{sr}</option>
                ))}
              </select>
              
              {/* Karakuri Youkai Selection */}
              {subrace === 'Karakuri' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1 text-purple-400">Youkai Binding</label>
                  <select
                    value={karakuriYoukai}
                    onChange={(e) => setKarakuriYoukai(e.target.value)}
                    className="w-full bg-purple-900 border border-purple-600 rounded px-3 py-1 text-sm"
                  >
                    <option value="None">None</option>
                    <option value="Avian">Avian (+3 GUI, +2 CEL, -3 WIL, -2 DEF)</option>
                    <option value="Beast">Beast (+3 SKI, +2 LUC, -3 RES, -2 GUI)</option>
                    <option value="Dragon">Dragon (+3 STR, +2 DEF, -3 CEL, -2 RES)</option>
                    <option value="Fairy">Fairy (+3 CEL, +2 LUC, -3 STR, -2 WIL)</option>
                    <option value="Mystic">Mystic (+3 WIL, +2 SKI, -3 STR, -2 RES)</option>
                    <option value="Night">Night (+3 RES, +2 GUI, -3 DEF, -2 FAI)</option>
                    <option value="Plant">Plant (+3 DEF, +2 VIT, -3 GUI, -2 LUC)</option>
                  </select>
                </div>
              )}
            </div>
            
            <HierarchicalClassSelector
              type="Main"
              selectedBaseClass={selectedMainBaseClass}
              selectedClass={mainClass}
              onBaseClassChange={(baseClass) => {
                setSelectedMainBaseClass(baseClass);
              }}
              onClassChange={(className) => {
                // Find which base class this subclass belongs to
                const baseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
                  data.subClasses.includes(className) || data.name === className
                )?.[0] || selectedMainBaseClass;
                setSelectedMainBaseClass(baseClass);
                setMainClass(className);
                setMainClassPassive(0);
              }}
              showDropdown={showMainClassDropdown}
              setShowDropdown={setShowMainClassDropdown}
            />
            
            <HierarchicalClassSelector
              type="Sub"
              selectedBaseClass={selectedSubBaseClass}
              selectedClass={subClass}
              onBaseClassChange={(baseClass) => {
                setSelectedSubBaseClass(baseClass);
              }}
              onClassChange={(className) => {
                // Find which base class this subclass belongs to
                const baseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
                  data.subClasses.includes(className) || data.name === className
                )?.[0] || selectedSubBaseClass;
                setSelectedSubBaseClass(baseClass);
                setSubClass(className);
                setSubClassPassive(0);
              }}
              showDropdown={showSubClassDropdown}
              setShowDropdown={setShowSubClassDropdown}
            />
          </div>

          {/* Class Passive Rank selectors */}
          {(hasClassPassive(mainClass) || hasClassPassive(subClass)) && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    {(() => {
      // Check if both classes share the same base class passive
      const mainPassiveData = getClassPassiveData(mainClass);
      const subPassiveData = getClassPassiveData(subClass);
      const mainIsInherited = !CLASS_PASSIVES[mainClass];
      const subIsInherited = !CLASS_PASSIVES[subClass];
      const mainSourceClass = mainIsInherited ? getBaseClass(mainClass) : mainClass;
      const subSourceClass = subIsInherited ? getBaseClass(subClass) : subClass;
      
      // Check if we're dealing with the same passive (either same class or same inherited passive)
      const isSamePassive = mainSourceClass === subSourceClass;
      
      const elements = [];
      
      if (isSamePassive) {
        // Show single passive control for shared passive
        const displayName = mainSourceClass;
        const passiveData = mainPassiveData || subPassiveData;
        
        elements.push(
          <div key="shared" className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              {displayName} Passive Rank ({passiveData?.description})
            </label>
            <input
              type="number"
              min="0"
              max={passiveData?.maxRank || 0}
              value={mainClassPassive}
              onChange={(e) => {
                const value = Math.max(0, Math.min(Number(e.target.value), passiveData?.maxRank || 0));
                setMainClassPassive(value);
                // For shared passives, keep sub passive in sync or at 0
                if (mainClass === subClass) {
                  setSubClassPassive(0);
                } else {
                  setSubClassPassive(value);
                }
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            />
            {mainClass === subClass && (
              <div className="text-xs text-gray-400 mt-1">
                Monoclass builds use the same passive for both slots
              </div>
            )}
          </div>
        );
      } else {
        // Show separate controls for different passives
        
        // Main class passive
        if (hasClassPassive(mainClass)) {
          const displayName = mainIsInherited ? mainSourceClass : mainClass;
          const passiveData = mainPassiveData;
          
          elements.push(
            <div key="main">
              <label className="block text-sm font-medium mb-2">
                {displayName} Passive Rank (Main Class) ({passiveData?.description})
              </label>
              <input
                type="number"
                min="0"
                max={passiveData?.maxRank || 0}
                value={mainClassPassive}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(Number(e.target.value), passiveData?.maxRank || 0));
                  setMainClassPassive(value);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>
          );
        }
        
        // Sub class passive (only if different from main)
        if (hasClassPassive(subClass) && mainClass !== subClass) {
          const displayName = subIsInherited ? subSourceClass : subClass;
          const passiveData = subPassiveData;
          
          elements.push(
            <div key="sub">
              <label className="block text-sm font-medium mb-2">
                {displayName} Passive Rank (Sub Class) ({passiveData?.description})
              </label>
              <input
                type="number"
                min="0"
                max={passiveData?.maxRank || 0}
                value={subClassPassive}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(Number(e.target.value), passiveData?.maxRank || 0));
                  setSubClassPassive(value);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>
          );
        }
      }
      
      return elements;
    })()}
  </div>
)}

          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="text-xl font-semibold">
              Points Remaining: <span className="text-yellow-400">{totalPoints}</span>
              {monoclassModifier === 2 && <span className="ml-2 text-sm text-purple-400">(Monoclass x2)</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowFood(!showFood)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm transition-colors"
              >
                <Utensils size={16} />
                Food
              </button>
              <button
                onClick={() => setShowStamps(!showStamps)}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm transition-colors"
              >
                <BookOpen size={16} />
                History
              </button>
              <button
                onClick={() => setShowTalents(!showTalents)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-sm transition-colors"
              >
                Talents
              </button>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm transition-colors"
              >
                <Settings size={16} />
                Advanced
              </button>
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm transition-colors"
              >
                <Download size={16} />
                Import/Export
              </button>
              <button
                onClick={resetStats}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition-colors"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          {showFood && (
            <div className="bg-gray-700 rounded p-4 mb-4">
              <h3 className="font-bold text-lg mb-3">Food Bonuses</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(FOODS).map(f => (
                  <button
                    key={f}
                    onClick={() => setFood(f)}
                    className={`px-4 py-2 rounded ${
                      food === f ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {f}
                    {f !== 'None' && (
                      <span className="text-xs block text-gray-300">
                        {Object.entries(FOODS[f]).filter(([_, v]) => v > 0).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showStamps && (
            <div className="bg-gray-700 rounded p-4 mb-4">
              <h3 className="font-bold text-lg mb-3">History & Stamps</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Character History</label>
                <select
                  value={history}
                  onChange={(e) => handleHistoryChange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  {Object.keys(HISTORY).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Stat Stamps</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(stamps) as StampKey[]).map(stat => (
                    <div key={stat}>
                      <label className="block text-sm mb-1 capitalize">{stat.toUpperCase()}</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={stamps[stat]}
                        onChange={(e) => setStamps(prev => ({ ...prev, [stat]: Number(e.target.value) }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showTalents && (
            <div className="bg-gray-700 rounded p-4 mb-4 space-y-3">
              <h3 className="font-bold text-lg mb-2">Talents & Traits</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasGhost && (
                  <>
                    <div>
                      <label className="block text-sm mb-1">Rising Game Rank (0-5)</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={risingGame}
                        onChange={(e) => setRisingGame(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">Bonus stats when HP is low</span>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Pain Tolerance HP</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={painTolerance}
                        onChange={(e) => setPainTolerance(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">+10 HP per rank</span>
                    </div>
                  </>
                )}
                
                {hasFortitude && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fortitude}
                      onChange={(e) => setFortitude(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Fortitude (+10% HP)</span>
                  </div>
                )}
                
                {hasEndurance && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={endurance}
                      onChange={(e) => setEndurance(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Endurance (+15% HP)</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={giantGene}
                    onChange={(e) => setGiantGene(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Giant Gene (+10% HP, -10 Evade)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={warwalk}
                    onChange={(e) => setWarwalk(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Warwalk (+30 HP/FP)</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={luminaryElement}
                      onChange={(e) => setLuminaryElement(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Luminary Element
                      {luminaryElement && astrology && (
                        <span className="ml-2 text-blue-400">
                          ✓ WIL → {PLANET_ELEMENTS[astrology]} ATK (1:1)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 ml-6">
                    WIL no longer increases all elements; increases your Starsign's element by 1 per 1 raw WIL (ignores diminishing returns)
                  </div>
                </div>
                
                {/* Normalcy Talents */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={persistenceOfNormalcy}
                    onChange={(e) => setPersistenceOfNormalcy(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Persistence of Normalcy
                    {persistenceOfNormalcy && (
                      <span className="ml-2 text-green-400">
                        {(() => {
                          const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
                          const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
                          const isSame = mainClass === subClass;
                          
                          if (mainIsBase && subIsBase) {
                            return isSame ? "✓ +200 HP (Same Base Classes)" : "✓ +100 HP (Both Base Classes)";
                          }
                          return "✗ Requires both classes to be Base Classes";
                        })()}
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={powerOfNormalcy}
                    onChange={(e) => setPowerOfNormalcy(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Power of Normalcy
                    {powerOfNormalcy && (
                      <span className="ml-2 text-green-400">
                        {(() => {
                          const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
                          const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
                          const isSame = mainClass === subClass;
                          
                          if (mainIsBase && subIsBase) {
                            return isSame ? "✓ +8 All Stats (Same Base Classes)" : "✓ +4 All Stats (Both Base Classes)";
                          }
                          return "✗ Requires both classes to be Base Classes";
                        })()}
                      </span>
                    )}
                  </span>
                </div>
                
                {/* Kaelensia Instinct Toggles */}
                {(subrace === 'Felidae' || subrace === 'Grimalkin') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={felidaeInstinct}
                      onChange={(e) => setFelidaeInstinct(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Felidae/Grimalkin Instinct (SKI/CEL/LUC/GUI at ≤50% HP)
                      {felidaeInstinct && hpPercent <= 50 && (
                        <span className="ml-2 text-green-400">
                          ✓ Active {hpPercent <= 25 && '(x2)'}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {subrace === 'Lupine' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lupineInstinct}
                      onChange={(e) => setLupineInstinct(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Lupine Instinct (STR/WIL/DEF/RES at ≤50% HP)
                      {lupineInstinct && hpPercent <= 50 && (
                        <span className="ml-2 text-green-400">
                          ✓ Active {hpPercent <= 25 && '(x2)'}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {/* Sanguine Crest for Oni/Vampire */}
                {(subrace === 'Oni' || subrace === 'Vampire') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sanguineCrest}
                      onChange={(e) => setSanguineCrest(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Sanguine Crest (+2 STR/WIL/SKI/CEL/DEF)</span>
                  </div>
                )}
                
                {/* Redtail Fox God's Blessing */}
                {subrace === 'Redtail' && (
                  <div className="col-span-full border border-orange-500 rounded p-3 bg-orange-900 bg-opacity-20">
                    <h4 className="font-bold text-orange-400 mb-2">Fox God's Blessing</h4>
                    <p className="text-xs text-gray-300 mb-3">
                      Every round in battle, glowing spirits appear around the Redtail (1-6), becoming your Fortune Level. 
                      Dice color determines the effect. Bonuses scale with SAN (+1x per 10 Scaled SAN, max 5x).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Fortune Level (1-6)</label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={redtailFortuneLevel}
                          onChange={(e) => setRedtailFortuneLevel(Number(e.target.value))}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Dice Color</label>
                        <select
                          value={redtailDiceColor}
                          onChange={(e) => setRedtailDiceColor(e.target.value as 'red' | 'green' | 'yellow')}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                        >
                          <option value="red">Red Dice</option>
                          <option value="green">Green Dice</option>
                          <option value="yellow">Yellow Dice</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-300 space-y-1">
                      {redtailDiceColor === 'red' && (
                        <p>
                          <span className="text-red-400 font-semibold">Red Dice:</span> 
                          {redtailFortuneLevel === 1 
                            ? ` -${5 + Math.min(Math.floor(stats.san / 10), 5) * 5} Hit/Critical`
                            : ` +${redtailFortuneLevel * (1 + Math.min(Math.floor(stats.san / 10), 5))} Hit/Critical`
                          }
                        </p>
                      )}
                      {redtailDiceColor === 'green' && (
                        <p>
                          <span className="text-green-400 font-semibold">Green Dice:</span>
                          {redtailFortuneLevel === 1
                            ? ` -${5 + Math.min(Math.floor(stats.san / 10), 5) * 5}% Status Inflict/Resist chance`
                            : ` +${redtailFortuneLevel * (1 + Math.min(Math.floor(stats.san / 10), 5))}% Status Inflict/Resist chance`
                          }
                        </p>
                      )}
                      {redtailDiceColor === 'yellow' && (
                        <p>
                          <span className="text-yellow-400 font-semibold">Yellow Dice:</span>
                          {redtailFortuneLevel === 1
                            ? ` -${5 + Math.min(Math.floor(stats.san / 10), 5) * 5} Evade/Critical Evade`
                            : ` +${redtailFortuneLevel * (1 + Math.min(Math.floor(stats.san / 10), 5))} Evade/Critical Evade`
                          }
                        </p>
                      )}
                      <p className="text-gray-400 italic">
                        Current SAN Multiplier: {1 + Math.min(Math.floor(stats.san / 10), 5)}x
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {showAdvanced && (
            <div className="bg-gray-700 rounded p-4 mb-4 space-y-4">
              <h3 className="font-bold text-lg mb-2">Advanced Options</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm mb-1">Character Level (1-60)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={characterLevel}
                    onChange={(e) => {
                      const level = Math.min(60, Math.max(1, Number(e.target.value)));
                      setCharacterLevel(level);
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Available Points: {characterLevel * 4}
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Custom HP</label>
                  <input
                    type="number"
                    value={customHP}
                    onChange={(e) => setCustomHP(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Custom FP</label>
                  <input
                    type="number"
                    value={customFP}
                    onChange={(e) => setCustomFP(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Base Evade</label>
                  <input
                    type="number"
                    value={baseEvade}
                    onChange={(e) => setBaseEvade(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Bonus Evade</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={bonusEvade}
                    onChange={(e) => setBonusEvade(Math.min(Number(e.target.value), 50))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Capped at 50
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Dragon King Pieces</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={dragonKing}
                    onChange={(e) => setDragonKing(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Dragon Queen Pieces</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={dragonQueen}
                    onChange={(e) => setDragonQueen(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Current HP %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hpPercent}
                    onChange={(e) => setHpPercent(Number(e.target.value))}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  />
                </div>
                <button
                  onClick={() => setShowCustomStats(!showCustomStats)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm"
                >
                  Custom Stats
                </button>
              </div>

              {showCustomStats && (
                <div>
                  <h4 className="font-semibold mb-2">Custom Stat Modifiers (Flat Bonuses)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {(Object.keys(customStats) as StatKey[]).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs mb-1 uppercase">{stat}</label>
                        <input
                          type="number"
                          value={customStats[stat]}
                          onChange={(e) => setCustomStats(prev => ({ ...prev, [stat]: Number(e.target.value) }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <h4 className="font-semibold mb-2 mt-3">Custom Base Stats (Pre-Class)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {(Object.keys(customBaseStats) as StatKey[]).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs mb-1 uppercase">{stat}</label>
                        <input
                          type="number"
                          value={customBaseStats[stat]}
                          onChange={(e) => handleCustomBaseStatChange(stat, Number(e.target.value))}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Legend Extend (+1 before DR)</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {Object.keys(LEGEND_EXTEND).map(key => (
                    <button
                      key={key}
                      onClick={() => handleLegendExtendToggle(key)}
                      className={`px-3 py-2 rounded text-sm transition-colors ${
                        legendExtend[key] 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      style={{ borderLeft: `4px solid ${LEGEND_EXTEND[key].color}` }}
                    >
                      {LEGEND_EXTEND[key].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Astrology (Planet Signs) - +1 Stat, +3 Element ATK</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700">
                    <input
                      type="radio"
                      name="astrology"
                      checked={astrology === ''}
                      onChange={() => setAstrology('')}
                      className="w-4 h-4"
                    />
                    <span>None</span>
                  </label>
                  {Object.keys(ASTROLOGY_PLANETS).map(planet => {
                    const element = PLANET_ELEMENTS[planet];
                    const stat = ASTROLOGY_PLANETS[planet].toUpperCase();
                    return (
                      <label key={planet} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700">
                        <input
                          type="radio"
                          name="astrology"
                          checked={astrology === planet}
                          onChange={() => setAstrology(planet)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{planet} ({stat} / {element})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Import/Export Section */}
          {showImportExport && (
            <div className="space-y-4 p-4 bg-gray-800 rounded border border-gray-600">
              <h3 className="text-lg font-semibold text-white">Build Import/Export</h3>
              
              {/* Export Section */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Export Build</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    placeholder="Build name (optional)"
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportBuild(buildName)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 transition-colors"
                    >
                      <Download size={16} />
                      Download JSON
                    </button>
                    <button
                      onClick={() => copyBuildToClipboard(buildName)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2 transition-colors"
                    >
                      <Copy size={16} />
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Import Build</h4>
                <div className="space-y-2">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste build JSON here..."
                    rows={4}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 font-mono text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => importBuild(importText)}
                      disabled={!importText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Import from Text
                    </button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            importBuild(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2 cursor-pointer"
                    >
                      <Upload size={16} />
                      Import from File
                    </label>
                  </div>
                </div>
              </div>

              {/* Template Builds Section */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Template Builds</h4>
                <p className="text-sm text-gray-400">Load basic builds for simple templates!</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(TEMPLATE_BUILDS).map(([key, template]) => (
                    <div key={key} className="bg-gray-700 border border-gray-600 rounded p-3" title={template.reasoning}>
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-white text-sm">{template.name}</h5>
                        <button
                          onClick={() => loadTemplate(key)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Load
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">{template.description}</p>
                      <div className="text-xs text-gray-400">
                        <div className="mb-1">
                          <span className="font-medium">Race:</span> {template.race} {template.subrace}
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">Classes:</span> {template.mainClass} Monotype
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">History:</span> {template.history || 'None'}
                        </div>
                        <div className="text-xs text-blue-300 mt-1">
                          Key Stats: {Object.entries(template.stats)
                            .filter(([, value]) => value > 0) 
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([stat, value]) => `${stat.toUpperCase()}: ${value}`)
                            .join(', ')}
                        </div>
                        <div className="text-xs text-yellow-400 mt-1 italic">
                          💡 Hover for stat reasoning
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raw vs True Stats Toggle */}
          <div className="flex justify-center mb-4">
            <div className="bg-gray-700 rounded-lg p-1 flex">
              <button
                onClick={() => setShowRawStats(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showRawStats 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                True Stats (DR Applied)
              </button>
              <button
                onClick={() => setShowRawStats(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showRawStats 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Raw Stats (No DR)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <StatRow label="Strength" statKey="str" />
              <StatRow label="Will" statKey="wil" />
              <StatRow label="Skill" statKey="ski" />
              <StatRow label="Celerity" statKey="cel" />
              <StatRow label="Defense" statKey="def" />
              <StatRow label="Resistance" statKey="res" />
            </div>
            
            <div className="space-y-1">
              <StatRow label="Vitality" statKey="vit" />
              <StatRow label="Faith" statKey="fai" />
              <StatRow label="Luck" statKey="luc" />
              <StatRow label="Guile" statKey="gui" />
              <StatRow label="Sanctity" statKey="san" />
              <StatRow label="Aptitude" statKey="apt" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">HP</div>
              <div className="text-2xl font-bold text-red-400">
                {calculateHP()} <span className="text-base text-gray-400">/ {calculateMaxHP()}</span>
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">FP</div>
              <div className="text-2xl font-bold text-blue-400">{calculateMP()}</div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Phys. Def</div>
              <div className="text-2xl font-bold text-purple-400">{Math.floor(stats.def * 0.9)}%</div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Mag. Def</div>
              <div className="text-2xl font-bold text-pink-400">{Math.floor(stats.res * 0.9)}%</div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Evade</div>
              <div className="text-xl font-bold text-yellow-400">
                {Math.floor(stats.cel * 2) + baseEvade + Math.min(bonusEvade, 50) - (giantGene ? 10 : 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Crit Evade</div>
              <div className="text-xl font-bold text-cyan-400">
                {Math.floor(stats.fai + stats.luc)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Status Inflict</div>
              <div className="text-xl font-bold text-green-400">
                {Math.floor(stats.ski * 2 + stats.wil)}%
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Status Resist</div>
              <div className="text-xl font-bold text-indigo-400">
                {Math.floor(stats.san * 2 + stats.fai)}%
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="font-bold text-lg mb-4">Elemental ATK & RES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {elements.map(elem => (
                <div key={elem} className="bg-gray-700 rounded p-3">
                  <div 
                    className="text-sm font-semibold mb-2" 
                    style={{ color: ELEMENT_COLORS[elem] }}
                  >
                    {elem}
                  </div>
                  
                  {/* ATK Row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 text-sm">ATK:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustElementalATK(elem as ElementKey, -1)}
                        className="w-5 h-5 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center justify-center"
                        title={`Decrease ${elem} ATK`}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-red-400 text-sm font-bold min-w-[2rem] text-center">
                        {calculateElementalATK(elem)}
                      </span>
                      <button
                        onClick={() => adjustElementalATK(elem as ElementKey, 1)}
                        className="w-5 h-5 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center justify-center"
                        title={`Increase ${elem} ATK`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  
                  {/* RES Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 text-sm">RES:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustElementalRES(elem as ElementKey, -1)}
                        className="w-5 h-5 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center justify-center"
                        title={`Decrease ${elem} RES`}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-blue-400 text-sm font-bold min-w-[2rem] text-center">
                        {calculateElementalRES(elem)}%
                      </span>
                      <button
                        onClick={() => adjustElementalRES(elem as ElementKey, 1)}
                        className="w-5 h-5 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center justify-center"
                        title={`Increase ${elem} RES`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Show manual adjustments and race resistances if any */}
                  {(elementalATKAdjustments[elem as ElementKey] !== 0 || 
                    elementalRESAdjustments[elem as ElementKey] !== 0 || 
                    getRaceResistances()[elem as ElementKey] !== 0 ||
                    (subrace === 'Umbral' && elem === 'Dark') ||
                    (subrace === 'Theno' && elem === 'Sound')) && (
                    <div className="mt-1 text-xs text-gray-400">
                      {elementalATKAdjustments[elem as ElementKey] !== 0 && (
                        <div>Manual ATK: {elementalATKAdjustments[elem as ElementKey] > 0 ? '+' : ''}{elementalATKAdjustments[elem as ElementKey]}</div>
                      )}
                      {elementalRESAdjustments[elem as ElementKey] !== 0 && (
                        <div>Manual RES: {elementalRESAdjustments[elem as ElementKey] > 0 ? '+' : ''}{elementalRESAdjustments[elem as ElementKey]}</div>
                      )}
                      {getRaceResistances()[elem as ElementKey] !== 0 && (
                        <div className={`${getRaceResistances()[elem as ElementKey] > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          Race RES: {getRaceResistances()[elem as ElementKey] > 0 ? '+' : ''}{getRaceResistances()[elem as ElementKey]}%
                          {(subrace === 'Umbral' || subrace === 'Papilion') && 
                           (elem === 'Dark' || elem === 'Light' || elem === 'Wind' || elem === 'Earth') && 
                           <span className="text-gray-500"> (scales with SAN)</span>
                                                   }
                        </div>
                      )}
                      {subrace === 'Umbral' && elem === 'Dark' && (
                        <div className="text-purple-400">
                          Race ATK: +{Math.min(15, Math.floor(characterLevel / 2))} (level/2, max 15)
                        </div>
                      )}
                      {subrace === 'Theno' && elem === 'Sound' && (
                        <div className="text-blue-400">
                          Race ATK: Base = Level {characterLevel} (ignores stat scaling)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Poison Resistance Box (separate from Acid) */}
              {(subrace === 'Wyverntouched' || subrace === 'Naga') && (
                <div className="bg-green-900 rounded p-3 border-2 border-green-600">
                  <div className="text-sm font-semibold mb-2 text-green-300">Poison</div>
                  
                  {/* No ATK for Poison */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">ATK:</span>
                    <span className="text-gray-500 text-sm">—</span>
                  </div>
                  
                  {/* Poison RES Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-green-300 text-sm">RES:</span>
                    <span className="text-green-300 text-sm font-bold">
                      {subrace === 'Wyverntouched' ? stats.san * 2 : stats.san}%
                    </span>
                  </div>
                  
                  <div className="mt-1 text-xs text-green-400">
                    <div>
                      Race RES: {subrace === 'Wyverntouched' ? 'SAN × 2' : 'SAN × 1'} = {subrace === 'Wyverntouched' ? stats.san * 2 : stats.san}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Initiative</div>
              <div className="text-lg font-bold">
                {(SUBRACES[subrace]?.cel || 0) + addedStats.cel + customBaseStats.cel + (astroBonus.cel || 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Youkai Cap</div>
              <div className="text-lg font-bold text-purple-400">{youkaiCap}</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Flanking</div>
              <div className="text-lg font-bold">
                {Math.floor(5 + stats.gui / 2)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Skill Pool</div>
              <div className="text-lg font-bold">
                {11 + Math.floor(stats.gui / 5) + Math.floor(stats.ski / 5) + Math.floor(stats.wil / 10) + ((RACES[race]?.human || SUBRACES[subrace]?.human) ? 2 : 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Battle Weight</div>
              <div className="text-lg font-bold">
                0/{Math.floor(stats.str) + 5}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Encumbrance</div>
              <div className="text-lg font-bold">
                0/{Math.floor(stats.str + stats.vit) + 5 + (subrace === 'Dullahan' ? 30 : 0) + (subrace.includes('Mechanation') ? 20 : 0)}
              </div>
            </div>
          </div>
            </>
          )}

          {/* Weapon Calculator Tab */}
          {activeTab === 'weapon' && (
            <WeaponCalculator stats={stats} />
          )}

          {/* Stat Optimizer Tab */}
          {activeTab === 'optimizer' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-900 to-blue-900 bg-opacity-30 border border-green-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-green-400">Stat Optimizer</h2>
                <p className="text-gray-300 mb-4">
                  Get optimized stat distributions for your dual class combination and build strategy. 
                  The optimizer considers class synergies, weapon scaling, APT efficiency, and build-specific thresholds.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Build Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-300">Build Type</label>
                    <select
                      value={selectedBuildType}
                      onChange={(e) => setSelectedBuildType(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      {Object.entries(BUILD_TYPES).map(([key, buildType]) => (
                        <option key={key} value={key}>{buildType.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {BUILD_TYPES[selectedBuildType]?.description}
                    </p>
                  </div>

                  {/* Target Level */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-300">Target Level</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={optimizerTargetLevel}
                      onChange={(e) => setOptimizerTargetLevel(Math.min(60, Math.max(1, parseInt(e.target.value) || 60)))}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Available stat points: {optimizerTargetLevel * 4}
                    </p>
                  </div>

                  {/* Optimization Mode */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-blue-300">Optimization Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="optimizationMode"
                          value="weights"
                          checked={optimizationMode === 'weights'}
                          onChange={(e) => setOptimizationMode(e.target.value as 'weights' | 'targets')}
                          className="mr-2"
                        />
                        <span className="text-sm">Weight-based (sliders)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="optimizationMode"
                          value="targets"
                          checked={optimizationMode === 'targets'}
                          onChange={(e) => setOptimizationMode(e.target.value as 'weights' | 'targets')}
                          className="mr-2"
                        />
                        <span className="text-sm">Target-based (goals)</span>
                      </label>
                    </div>
                  </div>

                  {optimizationMode === 'targets' && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-1 text-blue-300">Target Stats</h4>
                      <p className="text-xs text-gray-400 mb-3">
                        All targets are <strong>scaled values</strong> (after racial bonuses). APT: 36/42/80 are common scaled targets.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">STR Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.str}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, str: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">WIL Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.wil}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, wil: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">SKI Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.ski}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, ski: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">CEL Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.cel}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, cel: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">DEF Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.def}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, def: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">RES Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.res}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, res: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">VIT Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.vit}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, vit: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">LUC Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.luc}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, luc: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">FAI Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.fai}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, fai: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">GUI Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.gui}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, gui: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">SAN Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.san}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, san: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">APT Target (Scaled)</label>
                          <div className="flex gap-1 mb-1">
                            <button
                              onClick={() => setTargetStats(prev => ({ ...prev, apt: 36 }))}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            >
                              36
                            </button>
                            <button
                              onClick={() => setTargetStats(prev => ({ ...prev, apt: 42 }))}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            >
                              42
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.apt}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, apt: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Total target points: {Object.values(targetStats).reduce((sum, val) => sum + val, 0)} / {optimizerTargetLevel * 4}
                      </p>
                    </div>
                  )}

                  {/* Weapon Type Priority */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-300">Weapon Priority</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={optimizeWeaponScaling}
                        onChange={(e) => setOptimizeWeaponScaling(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Optimize for weapon scaling</span>
                    </div>
                    {optimizeWeaponScaling && (
                      <select
                        value={selectedWeaponType}
                        onChange={(e) => setSelectedWeaponType(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="">Auto-detect from classes</option>
                        <option value="Swords">Swords (STR/SKI)</option>
                        <option value="Axes">Axes (STR)</option>
                        <option value="Spears">Spears (STR/SKI)</option>
                        <option value="Bows">Bows (STR/SKI)</option>
                        <option value="Guns">Guns (GUI/SKI)</option>
                        <option value="Daggers">Daggers (GUI/SKI)</option>
                        <option value="Tomes">Tomes (WIL/SKI)</option>
                        <option value="Fist">Fist (STR/SKI)</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Custom Weights Section */}
                {optimizationMode === 'weights' && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Custom Build Preferences</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCustomWeights(getBuildTypeWeights(selectedBuildType))}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        title="Reset sliders to match current build type"
                      >
                        Reset to {BUILD_TYPES[selectedBuildType]?.name} Defaults
                      </button>
                      <button
                        onClick={() => setShowCustomWeights(!showCustomWeights)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        {showCustomWeights ? 'Hide' : 'Show'} Advanced Options
                      </button>
                    </div>
                  </div>
                  
                  {showCustomWeights && (
                    <div className="space-y-4">
                      <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded p-3">
                        <p className="text-blue-300 text-sm mb-2">
                          <strong>Auto-Adjustment:</strong> Sliders automatically adjust when you change build types to match typical preferences for that build style.
                        </p>
                        <p className="text-gray-400 text-sm">
                          Adjust these sliders to influence stat priorities based on your specific build goals. 
                          Higher values increase the priority of related stats.
                        </p>
                      </div>
                      
                      {/* Summoner Preferences */}
                      {(mainClass === 'Summoner' || subClass === 'Summoner' || 
                        mainClass === 'Grand Summoner' || subClass === 'Grand Summoner' ||
                        mainClass === 'Shapeshifter' || subClass === 'Shapeshifter' ||
                        mainClass === 'Bonder' || subClass === 'Bonder') && (
                        <div className="bg-purple-900 bg-opacity-30 border border-purple-700 rounded p-3">
                          <h4 className="font-medium text-purple-300 mb-2">Summoner Preferences</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">
                                Youkai Count: {customWeights.youkaiCount}
                              </label>
                              <input
                                type="range"
                                min="5"
                                max="12"
                                value={customWeights.youkaiCount}
                                onChange={(e) => setCustomWeights({...customWeights, youkaiCount: parseInt(e.target.value)})}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-400">Youkai slots (5 base + Faith investment: 6=5pts, 7=10pts, 8=15pts, etc.)</span>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">
                                Summon Survivability: {customWeights.summonSurvivability}/10
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                value={customWeights.summonSurvivability}
                                onChange={(e) => setCustomWeights({...customWeights, summonSurvivability: parseInt(e.target.value)})}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-400">Focus on keeping summons alive</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Combat Preferences */}
                      <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-3">
                        <h4 className="font-medium text-red-300 mb-2">Combat Focus</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Critical Focus: {customWeights.criticalFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.criticalFocus}
                              onChange={(e) => setCustomWeights({...customWeights, criticalFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Magic Damage: {customWeights.magicDamageFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.magicDamageFocus}
                              onChange={(e) => setCustomWeights({...customWeights, magicDamageFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Physical Damage: {customWeights.physicalDamageFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.physicalDamageFocus}
                              onChange={(e) => setCustomWeights({...customWeights, physicalDamageFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Accuracy Focus: {customWeights.accuracyFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.accuracyFocus}
                              onChange={(e) => setCustomWeights({...customWeights, accuracyFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Defensive Preferences */}
                      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3">
                        <h4 className="font-medium text-blue-300 mb-2">Defensive Focus</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Minimum HP (Hard Constraint)
                            </label>
                            <input
                              type="number"
                              min="400"
                              max="1200"
                              step="50"
                              value={customWeights.minimumHP}
                              onChange={(e) => setCustomWeights({...customWeights, minimumHP: parseInt(e.target.value) || 700})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            />
                            <span className="text-xs text-gray-400">Required minimum HP for all builds</span>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              FP Priority: {customWeights.fpPriority}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.fpPriority}
                              onChange={(e) => setCustomWeights({...customWeights, fpPriority: parseInt(e.target.value)})}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-400">Target: 200+ FP for sustained combat</span>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Physical Defense: {customWeights.physicalDefense}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.physicalDefense}
                              onChange={(e) => setCustomWeights({...customWeights, physicalDefense: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Magical Defense: {customWeights.magicalDefense}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.magicalDefense}
                              onChange={(e) => setCustomWeights({...customWeights, magicalDefense: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Utility Preferences */}
                      <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded p-3">
                        <h4 className="font-medium text-green-300 mb-2">Utility & Special</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Initiative Priority: {customWeights.initiativePriority}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.initiativePriority}
                              onChange={(e) => setCustomWeights({...customWeights, initiativePriority: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Status Resistance: {customWeights.statusResistance}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.statusResistance}
                              onChange={(e) => setCustomWeights({...customWeights, statusResistance: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Target Evade
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              step="10"
                              value={customWeights.targetEvade || 0}
                              onChange={(e) => setCustomWeights({...customWeights, targetEvade: parseInt(e.target.value) || 0})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            />
                            <span className="text-xs text-gray-400">Target evade value (CEL×2 + base + bonus)</span>
                          </div>
                          { (
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">
                                Target APT (Hard Constraint)
                              </label>
                              <select
                                value={customWeights.targetAPT || 36}
                                onChange={(e) => setCustomWeights({...customWeights, targetAPT: parseInt(e.target.value) as 36 | 42 | 80})}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                              >
                                <option value={36}>36 APT (Standard)</option>
                                <option value={42}>42 APT (High Efficiency)</option>
                                <option value={80}>80 APT (Undeniable Innovator)</option>
                              </select>
                              <span className="text-xs text-gray-400">Target final APT for multiclass builds</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Current Class Configuration Display */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold mb-2">Current Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Race:</span> {subrace}
                    </div>
                    <div>
                      <span className="text-gray-400">Main Class:</span> {mainClass}
                    </div>
                    <div>
                      <span className="text-gray-400">Sub Class:</span> {subClass}
                    </div>
                    <div>
                      <span className="text-gray-400">History:</span> {history || 'None'}
                    </div>
                  </div>
                </div>

                {/* Optimize Button */}
                <div className="flex gap-4">
                  <button
                    onClick={runOptimization}
                    disabled={isOptimizing}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    {isOptimizing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Optimizing...
                      </>
                    ) : (
                      <>
                        Optimize Stats
                      </>
                    )}
                  </button>
                  
                  {optimizationResult && (
                    <button
                      onClick={applyOptimization}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                    >
                      Apply to Calculator
                    </button>
                  )}
                </div>
              </div>

              {/* Optimization Results */}
              {optimizationResult && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-green-400">Optimization Results</h3>
                  
                  {/* Score and Summary */}
                  <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-green-900 bg-opacity-50 rounded-lg px-4 py-2">
                        <span className="text-green-300 font-semibold">Score: {Math.round(optimizationResult.score)}</span>
                      </div>
                      <div className="bg-blue-900 bg-opacity-50 rounded-lg px-4 py-2">
                        <span className="text-blue-300 font-semibold">Points Used: {optimizationResult.totalPoints}/240</span>
                      </div>
                    </div>
                  </div>

                  {/* Optimized Stats Display */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    {Object.entries(optimizationResult.allocatedStats).map(([stat, value]) => (
                      <div key={stat} className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">{stat}</div>
                        <div className="text-lg font-bold" style={{ color: STAT_COLORS[stat as StatKey] === 'rainbow' ? '#ffffff' : STAT_COLORS[stat as StatKey] }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reasoning */}
                  {optimizationResult.reasoning.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold mb-2 text-blue-400">💡 Optimization Reasoning</h4>
                      <ul className="space-y-1">
                        {optimizationResult.reasoning.map((reason, index) => (
                          <li key={index} className="text-gray-300 text-sm">• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {optimizationResult.warnings.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold mb-2 text-yellow-400">⚠️ Warnings</h4>
                      <ul className="space-y-1">
                        {optimizationResult.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-300 text-sm">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Build Type Compatibility */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-2 text-purple-400">Class Compatibility</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {BUILD_TYPES[selectedBuildType]?.classCompatibility && Object.entries(BUILD_TYPES[selectedBuildType].classCompatibility)
                        .filter(([className]) => className === mainClass || className === subClass)
                        .map(([className, compatibility]) => (
                          <div key={className} className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
                            <span className="text-sm">{className}</span>
                            <div className="flex">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full mr-1 ${
                                    i < compatibility ? 'bg-green-500' : 'bg-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stat Information Modal */}
        {showStatInfo && selectedStat && STAT_INFO[selectedStat] && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatInfo(false)}
          >
            <div 
              className="bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">{STAT_INFO[selectedStat].title}</h2>
                <button
                  onClick={() => setShowStatInfo(false)}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Base Stats vs Scaled Stats Info Box */}
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-4">
                  <h4 className="font-semibold text-blue-300 mb-2">Base vs Scaled Stats</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p><strong>Base Stat:</strong> Your race's starting stat + invested points + bonuses from History, Starsigns, and Legend Extends. Used for trait requirements.</p>
                    <p><strong>Scaled Stat:</strong> Base stats with diminishing returns applied after soft cap. Most effects use Scaled stats.</p>
                    <p><strong>Hard Cap:</strong> Race base + 80 invested points maximum (including Legend Extends and History bonuses).</p>
                    <p><strong>Soft Cap:</strong> Race base + 40 points. After this, every 3 points lose 8% effectiveness (min 10%).</p>
                  </div>
                </div>

                <div className="text-gray-300 whitespace-pre-line leading-relaxed">
                  {STAT_INFO[selectedStat].description}
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-xl font-semibold mb-3 text-green-400">Effects</h3>
                  <ul className="space-y-2">
                    {STAT_INFO[selectedStat].effects.map((effect, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                        <span className="text-gray-300">{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {STAT_INFO[selectedStat].notes && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded p-4">
                      <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Important Note</h4>
                      <p className="text-sm text-gray-300">{STAT_INFO[selectedStat].notes}</p>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-700 pt-4">
                  <div className="bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-400 mb-2">Your Current Values:</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Raw Stat:</div>
                        <div className="text-2xl font-bold text-orange-400">
                          {Math.floor(rawStats[selectedStat as StatKey])}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Scaled Stat:</div>
                        <div className="text-2xl font-bold text-blue-400">
                          {Math.floor(stats[selectedStat as StatKey])}
                        </div>
                      </div>
                    </div>
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
