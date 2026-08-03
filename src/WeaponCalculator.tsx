/**
 * SL2 Weapon Calculator
 * Port of the C# WeaponCalculator with materials, parts, enchantments, and stat scaling
 */

import { useState, useEffect } from 'react';
import { WEAPONS } from './data/weapons';
import type { Weapon, WeaponConfig } from './types';
import modifierData from './data/content/weapon-modifiers.json';
import { calculateWeaponSlot } from './domain/weaponCalculation';
export type { WeaponConfig } from './types';

interface WeaponCalculatorProps {
  stats: {
    str: number;
    wil: number;
    ski: number;
    cel: number;
    def: number;
    res: number;
    vit: number;
    fai: number;
    luc: number;
    gui: number;
    san: number;
    apt: number;
  };
  readOnly?: boolean;
  retroMode?: boolean;
  config?: WeaponConfig;
  onConfigChange?: (config: WeaponConfig) => void;
  // Additional crit chance from external equipment conditionals (e.g., armor effects)
  extraCritChance?: number;
}

interface WeaponPart {
  power: number;
  crit: number;
  hit: number;
  weight: number;
  critDamage?: number;
}

interface Material {
  power: number;
  crit: number;
  hit: number;
  weight: number;
}

interface Enchantment {
  power: number;
  crit: number;
  critMod: number;
  hit: number;
  weight: number;
  weightMod: number;
}

const MATERIAL_CATEGORIES = modifierData.materialCategories as Record<string, string[]>;
const MATERIALS = modifierData.materials as Record<string, Material>;
const WEAPON_PART_CATEGORIES = modifierData.partCategories as Record<string, string[]>;
const WEAPON_PART1 = modifierData.parts as Record<string, WeaponPart>;
const WEAPON_PART2 = WEAPON_PART1;
const WEAPON_PART3 = WEAPON_PART1;
const ENCHANTMENTS = modifierData.enchantments as Record<string, Enchantment>;
const STAT_SCALING = modifierData.defaultScaling as Record<string, Omit<WeaponConfig['customScaling'], 'apt'>>;

export default function WeaponCalculator({ stats, readOnly = false, retroMode = false, config, onConfigChange, extraCritChance = 0 }: WeaponCalculatorProps) {
  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  
  // Weapon selection states - Weapon 1
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  const [weaponSearchTerm, setWeaponSearchTerm] = useState('');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('All');
  const [subtypeFilter, setSubtypeFilter] = useState('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  
  const [weaponType, setWeaponType] = useState('Sword');
  const [basePower, setBasePower] = useState(5);
  const [baseCrit, setBaseCrit] = useState(5);
  const [baseHit, setBaseHit] = useState(80);
  const [baseWeight, setBaseWeight] = useState(10);
  const [baseCritDamage, setBaseCritDamage] = useState(100);
  
  const [material, setMaterial] = useState('None');
  const [part1, setPart1] = useState('None');
  const [part2, setPart2] = useState('None');
  const [part3, setPart3] = useState('None');
  const [enchantment, setEnchantment] = useState('None');
  
  const [upgradeLevel, setUpgradeLevel] = useState(0);
  const [rarity, setRarity] = useState(10);
  const [powerQuality, setPowerQuality] = useState(false);
  const [critQuality, setCritQuality] = useState(false);
  const [hitQuality, setHitQuality] = useState(false);
  const [weightPlus, setWeightPlus] = useState(false);
  const [weightMinus, setWeightMinus] = useState(false);
  const [sentimentality, setSentimentality] = useState(false);
  const [twoHandedSkillRank, setTwoHandedSkillRank] = useState(0);

  // Custom scaling percentages (initialized from weapon type)
  const [customScaling, setCustomScaling] = useState({
    str: 100,
    wil: 0,
    ski: 0,
    cel: 0,
    def: 0,
    res: 0,
    vit: 0,
    fai: 0,
    luc: 0,
    gui: 0,
    san: 0
  });

  // Weapon 2 states for comparison
  const [selectedWeapon2, setSelectedWeapon2] = useState<Weapon | null>(null);
  const [weaponSearchTerm2, setWeaponSearchTerm2] = useState('');
  const [weaponTypeFilter2, setWeaponTypeFilter2] = useState('All');
  const [subtypeFilter2, setSubtypeFilter2] = useState('All');
  const [rarityFilter2, setRarityFilter2] = useState('All');
  
  const [weaponType2, setWeaponType2] = useState('Sword');
  const [basePower2, setBasePower2] = useState(5);
  const [baseCrit2, setBaseCrit2] = useState(5);
  const [baseHit2, setBaseHit2] = useState(80);
  const [baseWeight2, setBaseWeight2] = useState(10);
  const [baseCritDamage2, setBaseCritDamage2] = useState(100);
  
  const [material2, setMaterial2] = useState('None');
  const [part1_2, setPart1_2] = useState('None');
  const [part2_2, setPart2_2] = useState('None');
  const [part3_2, setPart3_2] = useState('None');
  const [enchantment2, setEnchantment2] = useState('None');
  
  const [upgradeLevel2, setUpgradeLevel2] = useState(0);
  const [rarity2, setRarity2] = useState(10);
  const [powerQuality2, setPowerQuality2] = useState(false);
  const [critQuality2, setCritQuality2] = useState(false);
  const [hitQuality2, setHitQuality2] = useState(false);
  const [weightPlus2, setWeightPlus2] = useState(false);
  const [weightMinus2, setWeightMinus2] = useState(false);
  const [sentimentality2, setSentimentality2] = useState(false);
  const [twoHandedSkillRank2, setTwoHandedSkillRank2] = useState(0);

  const [customScaling2, setCustomScaling2] = useState({
    str: 100,
    wil: 0,
    ski: 0,
    cel: 0,
    def: 0,
    res: 0,
    vit: 0,
    fai: 0,
    luc: 0,
    gui: 0,
    san: 0
  });

  // Effect to update weapon stats when a weapon is selected
  useEffect(() => {
    if (selectedWeapon) {
      setWeaponType(selectedWeapon.weaponType);
      setBasePower(selectedWeapon.power);
      setBaseCrit(selectedWeapon.critical);
      setBaseHit(selectedWeapon.accuracy);
      setBaseWeight(selectedWeapon.weight);
      setBaseCritDamage(selectedWeapon.criticalDamage);
      setRarity(selectedWeapon.rarity);
      
      // Update scaling based on weapon's scaling type
      const weaponScaling = selectedWeapon.scaling;
      
      // Combine all scaling values if multiple scaling types exist
      const combinedScaling = weaponScaling.reduce((acc, scaling) => ({
        str: acc.str + (scaling.str || 0),
        wil: acc.wil + (scaling.wil || 0),
        ski: acc.ski + (scaling.ski || 0),
        cel: acc.cel + (scaling.cel || 0),
        def: acc.def + (scaling.def || 0),
        res: acc.res + (scaling.res || 0),
        vit: acc.vit + (scaling.vit || 0),
        fai: acc.fai + (scaling.fai || 0),
        luc: acc.luc + (scaling.luc || 0),
        gui: acc.gui + (scaling.gui || 0),
        san: acc.san + (scaling.san || 0)
      }), {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0
      });
      
      setCustomScaling(combinedScaling);
    }
  }, [selectedWeapon]);

  // Effect for weapon 2
  useEffect(() => {
    if (selectedWeapon2) {
      setWeaponType2(selectedWeapon2.weaponType);
      setBasePower2(selectedWeapon2.power);
      setBaseCrit2(selectedWeapon2.critical);
      setBaseHit2(selectedWeapon2.accuracy);
      setBaseWeight2(selectedWeapon2.weight);
      setBaseCritDamage2(selectedWeapon2.criticalDamage);
      setRarity2(selectedWeapon2.rarity);
      
      const weaponScaling = selectedWeapon2.scaling;
      
      const combinedScaling = weaponScaling.reduce((acc, scaling) => ({
        str: acc.str + (scaling.str || 0),
        wil: acc.wil + (scaling.wil || 0),
        ski: acc.ski + (scaling.ski || 0),
        cel: acc.cel + (scaling.cel || 0),
        def: acc.def + (scaling.def || 0),
        res: acc.res + (scaling.res || 0),
        vit: acc.vit + (scaling.vit || 0),
        fai: acc.fai + (scaling.fai || 0),
        luc: acc.luc + (scaling.luc || 0),
        gui: acc.gui + (scaling.gui || 0),
        san: acc.san + (scaling.san || 0)
      }), {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0
      });
      
      setCustomScaling2(combinedScaling);
    }
  }, [selectedWeapon2]);

  // Filter weapons based on search and filters
  const filteredWeapons = WEAPONS.filter((weapon: Weapon) => {
    const matchesSearch = weapon.name.toLowerCase().includes(weaponSearchTerm.toLowerCase());
    const matchesType = weaponTypeFilter === 'All' || weapon.weaponType === weaponTypeFilter;
    const matchesSubtype = subtypeFilter === 'All' || weapon.subtype === subtypeFilter || (!weapon.subtype && subtypeFilter === 'None');
    const matchesRarity = rarityFilter === 'All' || weapon.rarity.toString() === rarityFilter;
    return matchesSearch && matchesType && matchesSubtype && matchesRarity;
  });

  const filteredWeapons2 = WEAPONS.filter((weapon: Weapon) => {
    const matchesSearch = weapon.name.toLowerCase().includes(weaponSearchTerm2.toLowerCase());
    const matchesType = weaponTypeFilter2 === 'All' || weapon.weaponType === weaponTypeFilter2;
    const matchesSubtype = subtypeFilter2 === 'All' || weapon.subtype === subtypeFilter2 || (!weapon.subtype && subtypeFilter2 === 'None');
    const matchesRarity = rarityFilter2 === 'All' || weapon.rarity.toString() === rarityFilter2;
    return matchesSearch && matchesType && matchesSubtype && matchesRarity;
  });

  // Get available subtypes for the current weapon type filter
  const getAvailableSubtypes = (): string[] => {
    const subtypes = new Set<string>();
    WEAPONS.forEach((weapon: Weapon) => {
      if (weaponTypeFilter === 'All' || weapon.weaponType === weaponTypeFilter) {
        if (weapon.subtype) {
          subtypes.add(weapon.subtype);
        }
      }
    });
    return Array.from(subtypes).sort();
  };

  const getAvailableSubtypes2 = (): string[] => {
    const subtypes = new Set<string>();
    WEAPONS.forEach((weapon: Weapon) => {
      if (weaponTypeFilter2 === 'All' || weapon.weaponType === weaponTypeFilter2) {
        if (weapon.subtype) {
          subtypes.add(weapon.subtype);
        }
      }
    });
    return Array.from(subtypes).sort();
  };

  const availableSubtypes = getAvailableSubtypes();
  const availableSubtypes2 = getAvailableSubtypes2();

  // Reset subtype filter when weapon type changes
  useEffect(() => {
    if (subtypeFilter !== 'All' && !availableSubtypes.includes(subtypeFilter)) {
      setSubtypeFilter('All');
    }
  }, [weaponTypeFilter, subtypeFilter, availableSubtypes]);

  useEffect(() => {
    if (subtypeFilter2 !== 'All' && !availableSubtypes2.includes(subtypeFilter2)) {
      setSubtypeFilter2('All');
    }
  }, [weaponTypeFilter2, subtypeFilter2, availableSubtypes2]);

  // Function to select a weapon
  const selectWeapon = (weapon: Weapon) => {
    setSelectedWeapon(weapon);
  };

  const selectWeapon2 = (weapon: Weapon) => {
    setSelectedWeapon2(weapon);
  };

  // Function to clear weapon selection (use custom values)
  const clearWeaponSelection = () => {
    setSelectedWeapon(null);
  };

  const clearWeaponSelection2 = () => {
    setSelectedWeapon2(null);
  };
  // Get effective weapon type (mutation changes type based on rarity)
  const getEffectiveWeaponType = (): string => {
    if (enchantment === 'Mutation' && rarity < 9) {
      const mutationTypes: Record<number, string> = {
        1: 'Dagger',
        2: 'Fist',
        3: 'Sword',
        4: 'Axe',
        5: 'Spear',
        6: 'Tome',
        7: 'Bow',
        8: 'Gun'
      };
      return mutationTypes[rarity] || weaponType;
    }
    return weaponType;
  };

  // Calculate stat scaling contribution
  const calculateScaling = (): number => {
    // Always use custom scaling (which loads weapon type defaults)
    // Note: Mutation does NOT change scaling - it only affects weapon behavior
    const scaling = customScaling;
    
    let totalScaling = 
      (stats.str * scaling.str / 100) +
      (stats.wil * scaling.wil / 100) +
      (stats.ski * scaling.ski / 100) +
      (stats.cel * scaling.cel / 100) +
      (stats.def * scaling.def / 100) +
      (stats.res * scaling.res / 100) +
      (stats.vit * scaling.vit / 100) +
      (stats.fai * scaling.fai / 100) +
      (stats.luc * scaling.luc / 100) +
      (stats.gui * scaling.gui / 100) +
      (stats.san * scaling.san / 100);
    
    return Math.floor(totalScaling);
  };

  // Calculate STR scaling for power
  const calculateStrScaling = (): number => {
    const scaling = customScaling;
    return Math.floor(stats.str * scaling.str / 100);
  };

  // Check if weapon has primary STR scaling (STR is the highest scaling stat)
  const hasPrimaryStrScaling = (): boolean => {
    const scaling = customScaling;
    return scaling.str > 0 && 
           scaling.str >= scaling.wil && 
           scaling.str >= scaling.ski && 
           scaling.str >= scaling.cel &&
           scaling.str >= scaling.def &&
           scaling.str >= scaling.res &&
           scaling.str >= scaling.vit &&
           scaling.str >= scaling.fai &&
           scaling.str >= scaling.luc &&
           scaling.str >= scaling.gui &&
           scaling.str >= scaling.san;
  };

  // Calculate special enchantment bonuses
  const calculateEnchantmentBonus = () => {
    let bonusPower = 0;
    let bonusHit = 0;
    
    // Rebellion: +1.5 Power and -1.5 Hit for every 1 Rarity below 9
    if (enchantment === 'Rebellion' && rarity < 9) {
      const rarityDiff = 9 - rarity;
      bonusPower = Math.floor(rarityDiff * 1.5);
      bonusHit = -Math.floor(rarityDiff * 1.5);
    }
    
    return { bonusPower, bonusHit };
  };

  // Calculate total weapon stats
  const calculateWeaponStats = () => {
    const mat = MATERIALS[material] || MATERIALS['None'];
    const p1 = WEAPON_PART1[part1] || WEAPON_PART1['None'];
    const p2 = WEAPON_PART2[part2] || WEAPON_PART2['None'];
    const p3 = WEAPON_PART3[part3] || WEAPON_PART3['None'];
    const ench = ENCHANTMENTS[enchantment] || ENCHANTMENTS['None'];
    const enchBonus = calculateEnchantmentBonus();
    return calculateWeaponSlot({
      stats, weaponType, effectiveWeaponType: getEffectiveWeaponType(), basePower, baseCrit, baseHit, baseWeight, baseCritDamage,
      material: mat, parts: [p1, p2, p3], enchantmentName: enchantment, enchantment: ench,
      upgradeLevel, rarity, powerQuality, critQuality, hitQuality, weightPlus, weightMinus,
      sentimentality, twoHandedSkillRank, scalingContribution: calculateScaling(),
      strScalingContribution: calculateStrScaling(), hasPrimaryStrScaling: hasPrimaryStrScaling(),
      enchantmentPowerBonus: enchBonus.bonusPower, enchantmentHitBonus: enchBonus.bonusHit, extraCritChance,
    });
  };

  const weaponStats = calculateWeaponStats();

  // Reset function for easy testing
  const resetWeapon = () => {
    setBasePower(5);
    setBaseCrit(5);
    setBaseHit(80);
    setBaseWeight(10);
    setBaseCritDamage(100);
    setMaterial('None');
    setPart1('None');
    setPart2('None');
    setPart3('None');
    setEnchantment('None');
    setUpgradeLevel(0);
    setRarity(10);
    setPowerQuality(false);
    setCritQuality(false);
    setHitQuality(false);
    setWeightPlus(false);
    setWeightMinus(false);
    setTwoHandedSkillRank(0);
    // Reset to weapon type defaults
    const defaultScaling = STAT_SCALING[weaponType] || STAT_SCALING['Sword'];
    setCustomScaling({ ...defaultScaling });
  };

  // Weapon 2 calculation functions
  const getEffectiveWeaponType2 = (): string => {
    if (enchantment2 === 'Mutation' && rarity2 < 9) {
      const mutationTypes: Record<number, string> = {
        1: 'Dagger', 2: 'Fist', 3: 'Sword', 4: 'Axe',
        5: 'Spear', 6: 'Tome', 7: 'Bow', 8: 'Gun'
      };
      return mutationTypes[rarity2] || weaponType2;
    }
    return weaponType2;
  };

  const calculateScaling2 = (): number => {
    const scaling = customScaling2;
    let totalScaling = 
      (stats.str * scaling.str / 100) +
      (stats.wil * scaling.wil / 100) +
      (stats.ski * scaling.ski / 100) +
      (stats.cel * scaling.cel / 100) +
      (stats.def * scaling.def / 100) +
      (stats.res * scaling.res / 100) +
      (stats.vit * scaling.vit / 100) +
      (stats.fai * scaling.fai / 100) +
      (stats.luc * scaling.luc / 100) +
      (stats.gui * scaling.gui / 100) +
      (stats.san * scaling.san / 100);
    return Math.floor(totalScaling);
  };

  const calculateStrScaling2 = (): number => {
    const scaling = customScaling2;
    return Math.floor(stats.str * scaling.str / 100);
  };

  const hasPrimaryStrScaling2 = (): boolean => {
    const scaling = customScaling2;
    return scaling.str > 0 && 
           scaling.str >= scaling.wil && 
           scaling.str >= scaling.ski && 
           scaling.str >= scaling.cel &&
           scaling.str >= scaling.def &&
           scaling.str >= scaling.res &&
           scaling.str >= scaling.vit &&
           scaling.str >= scaling.fai &&
           scaling.str >= scaling.luc &&
           scaling.str >= scaling.gui &&
           scaling.str >= scaling.san;
  };

  const calculateEnchantmentBonus2 = () => {
    let bonusPower = 0;
    let bonusHit = 0;
    if (enchantment2 === 'Rebellion' && rarity2 < 9) {
      const rarityDiff = 9 - rarity2;
      bonusPower = Math.floor(rarityDiff * 1.5);
      bonusHit = -Math.floor(rarityDiff * 1.5);
    }
    return { bonusPower, bonusHit };
  };

  const calculateWeaponStats2 = () => {
    const mat = MATERIALS[material2] || MATERIALS['None'];
    const p1 = WEAPON_PART1[part1_2] || WEAPON_PART1['None'];
    const p2 = WEAPON_PART2[part2_2] || WEAPON_PART2['None'];
    const p3 = WEAPON_PART3[part3_2] || WEAPON_PART3['None'];
    const ench = ENCHANTMENTS[enchantment2] || ENCHANTMENTS['None'];
    const enchBonus = calculateEnchantmentBonus2();
    return calculateWeaponSlot({
      stats, weaponType: weaponType2, effectiveWeaponType: getEffectiveWeaponType2(), basePower: basePower2,
      baseCrit: baseCrit2, baseHit: baseHit2, baseWeight: baseWeight2, baseCritDamage: baseCritDamage2,
      material: mat, parts: [p1, p2, p3], enchantmentName: enchantment2, enchantment: ench,
      upgradeLevel: upgradeLevel2, rarity: rarity2, powerQuality: powerQuality2, critQuality: critQuality2,
      hitQuality: hitQuality2, weightPlus: weightPlus2, weightMinus: weightMinus2, sentimentality: sentimentality2,
      twoHandedSkillRank: twoHandedSkillRank2, scalingContribution: calculateScaling2(),
      strScalingContribution: calculateStrScaling2(), hasPrimaryStrScaling: hasPrimaryStrScaling2(),
      enchantmentPowerBonus: enchBonus.bonusPower, enchantmentHitBonus: enchBonus.bonusHit, extraCritChance,
    });
  };

  const weaponStats2 = calculateWeaponStats2();

  // Build config from current state
  const buildConfig = (): WeaponConfig => ({
    selectedWeaponName: selectedWeapon?.name || null,
    weaponType,
    basePower,
    baseCrit,
    baseHit,
    baseWeight,
    baseCritDamage,
    material,
    part1,
    part2,
    part3,
    enchantment,
    upgradeLevel,
    rarity,
    powerQuality,
    critQuality,
    hitQuality,
    weightPlus,
    weightMinus,
    sentimentality,
    twoHandedSkillRank,
    customScaling,
    comparisonMode,
    secondaryWeapon: {
      selectedWeaponName: selectedWeapon2?.name || null,
      weaponType: weaponType2,
      basePower: basePower2,
      baseCrit: baseCrit2,
      baseHit: baseHit2,
      baseWeight: baseWeight2,
      baseCritDamage: baseCritDamage2,
      material: material2,
      part1: part1_2,
      part2: part2_2,
      part3: part3_2,
      enchantment: enchantment2,
      upgradeLevel: upgradeLevel2,
      rarity: rarity2,
      powerQuality: powerQuality2,
      critQuality: critQuality2,
      hitQuality: hitQuality2,
      weightPlus: weightPlus2,
      weightMinus: weightMinus2,
      sentimentality: sentimentality2,
      twoHandedSkillRank: twoHandedSkillRank2,
      customScaling: customScaling2,
    },
  });

  // Hydrate state from incoming config
  // - Always hydrate in readOnly mode (screenshot display)
  // - In interactive mode, hydrate only once on mount to restore prior settings
  const [hasHydratedFromConfig, setHasHydratedFromConfig] = useState(false);
  useEffect(() => {
    if (!config) return;
    if (!readOnly && hasHydratedFromConfig) return;
    if (config.selectedWeaponName) {
      const found = WEAPONS.find(w => w.name === config.selectedWeaponName) || null as any as Weapon | null;
      setSelectedWeapon(found as Weapon | null);
    } else {
      setSelectedWeapon(null);
    }
    setWeaponType(config.weaponType);
    setBasePower(config.basePower);
    setBaseCrit(config.baseCrit);
    setBaseHit(config.baseHit);
    setBaseWeight(config.baseWeight);
    setBaseCritDamage(config.baseCritDamage);
    setMaterial(config.material);
    setPart1(config.part1);
    setPart2(config.part2);
    setPart3(config.part3);
    setEnchantment(config.enchantment);
    setUpgradeLevel(config.upgradeLevel);
    setRarity(config.rarity);
    setPowerQuality(config.powerQuality);
    setCritQuality(config.critQuality);
    setHitQuality(config.hitQuality);
    setWeightPlus(config.weightPlus);
    setWeightMinus(config.weightMinus);
    setSentimentality(config.sentimentality);
    setTwoHandedSkillRank(config.twoHandedSkillRank);
    setCustomScaling({ ...config.customScaling });
    setComparisonMode(Boolean(config.comparisonMode));
    if (config.secondaryWeapon) {
      const secondary = config.secondaryWeapon;
      setSelectedWeapon2(secondary.selectedWeaponName ? WEAPONS.find((weapon) => weapon.name === secondary.selectedWeaponName) ?? null : null);
      setWeaponType2(secondary.weaponType);
      setBasePower2(secondary.basePower);
      setBaseCrit2(secondary.baseCrit);
      setBaseHit2(secondary.baseHit);
      setBaseWeight2(secondary.baseWeight);
      setBaseCritDamage2(secondary.baseCritDamage);
      setMaterial2(secondary.material);
      setPart1_2(secondary.part1);
      setPart2_2(secondary.part2);
      setPart3_2(secondary.part3);
      setEnchantment2(secondary.enchantment);
      setUpgradeLevel2(secondary.upgradeLevel);
      setRarity2(secondary.rarity);
      setPowerQuality2(secondary.powerQuality);
      setCritQuality2(secondary.critQuality);
      setHitQuality2(secondary.hitQuality);
      setWeightPlus2(secondary.weightPlus);
      setWeightMinus2(secondary.weightMinus);
      setSentimentality2(secondary.sentimentality);
      setTwoHandedSkillRank2(secondary.twoHandedSkillRank);
      setCustomScaling2({ ...secondary.customScaling });
    }
    if (!readOnly) setHasHydratedFromConfig(true);
  }, [config, readOnly, hasHydratedFromConfig]);

  // Emit config changes upward to persist
  useEffect(() => {
    if (!onConfigChange) return;
    onConfigChange(buildConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeapon, weaponType, basePower, baseCrit, baseHit, baseWeight, baseCritDamage, material, part1, part2, part3, enchantment, upgradeLevel, rarity, powerQuality, critQuality, hitQuality, weightPlus, weightMinus, sentimentality, twoHandedSkillRank, customScaling, comparisonMode, selectedWeapon2, weaponType2, basePower2, baseCrit2, baseHit2, baseWeight2, baseCritDamage2, material2, part1_2, part2_2, part3_2, enchantment2, upgradeLevel2, rarity2, powerQuality2, critQuality2, hitQuality2, weightPlus2, weightMinus2, sentimentality2, twoHandedSkillRank2, customScaling2]);

  return (
    <div className={`panel-contrast rounded-lg shadow-xl p-6 ${retroMode ? 'font-retro glow-border' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${retroMode ? 'glitch-title text-emerald-300' : ''}`}>Weapon Calculator</h2>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`px-4 py-2 rounded text-white font-medium transition-colors ${
                comparisonMode 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              } ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
            >
              {comparisonMode ? '✓ Comparison Mode' : 'Compare Weapons'}
            </button>
            <button
              onClick={resetWeapon}
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
            >
              Reset Weapon
            </button>
          </div>
        )}
      </div>

      {!readOnly && (
        <>
      {/* SL2 Weapon Mechanics Info */}
      <div className="mb-6 bg-gradient-to-br from-indigo-900 to-purple-900 p-4 rounded-lg border border-indigo-700">
        <h3 className="text-lg font-semibold mb-3 text-indigo-300">SL2 Weapon Mechanics Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <h4 className="font-semibold text-indigo-200 mb-2">Power Calculation:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Base + Materials + Parts + Enchantment + Quality + Upgrades + Stat Scaling</li>
              <li>Two-Handed skill: +Rank×2 SWA for Sword/Axe/Spear (×2 if weight ≥20)</li>
              <li>Stat scaling uses your <strong>scaled stats</strong> from the character calculator</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-indigo-200 mb-2">Critical Hit:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Weapon Crit + Skill/2 + Luck</li>
              <li>Primary STR weapons: +0.4 crit per STR scaling point</li>
              <li>Critical damage = SWA × (100% + GUI + Enchant bonuses)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-indigo-200 mb-2">Hit Rate:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Hit% = Skill × 2 + Weapon Accuracy</li>
              <li>Two-Handed skill: +Rank×2 Hit for Gun weapons (×2 for Rifles)</li>
              <li>Quality bonus adds +4 to weapon accuracy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-indigo-200 mb-2">Special Notes:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Rarity stars do NOT affect damage</li>
              <li>Mutation enchant changes weapon type but not scaling</li>
              <li>Upgrades add +1 Power/Crit/Hit per level</li>
              <li>Some enchantment effects (HP regen, status effects, etc.) not calculated</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enchantment Effects Notice */}
      {enchantment !== 'None' && (
        <div className="mb-6 bg-gradient-to-br from-amber-900 to-yellow-900 p-4 rounded-lg border border-amber-700">
          <h3 className="text-lg font-semibold mb-3 text-amber-300">Enchantment Notice</h3>
          <p className="text-sm text-amber-200">
            This calculator shows the basic stat modifications from enchantments. Many enchantments have additional effects 
            (HP regeneration, status infliction, special damage, etc.) that are not reflected in the raw weapon statistics but 
            affect combat performance. Check individual enchantment descriptions for complete effects.
          </p>
        </div>
      )}

      {/* Weapon 1 Configuration - Streamlined UI */}
      <div className={`p-6 rounded-lg ${comparisonMode ? 'border-4 border-blue-600 bg-gradient-to-br from-blue-900 to-indigo-900' : 'bg-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-300">
          {comparisonMode ? 'Weapon 1 Configuration' : 'Weapon Configuration'}
        </h2>
        
        {/* Weapon Selection */}
        <div className={`mb-4 border border-blue-500 rounded p-3 bg-gray-800 ${retroMode ? 'glow-border' : ''}`}>
          <h3 className="text-lg font-semibold mb-3 text-blue-400">🔍 Weapon Selection</h3>
          {selectedWeapon && (
            <div className="mb-3 p-2 bg-blue-900 rounded border border-blue-600">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-blue-300">{selectedWeapon.name}</h4>
                  <div className="text-sm text-gray-300">
                    {'★'.repeat(selectedWeapon.rarity)} {selectedWeapon.weaponType}
                    {selectedWeapon.subtype && ` (${selectedWeapon.subtype})`}
                  </div>
                </div>
                <button
                  onClick={clearWeaponSelection}
                  className={`px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
                >
                  Clear
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Power: {selectedWeapon.power} | Accuracy: {selectedWeapon.accuracy}% | Critical: {selectedWeapon.critical}% | Weight: {selectedWeapon.weight}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={weaponSearchTerm}
                onChange={(e) => setWeaponSearchTerm(e.target.value)}
                className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
              />
              <select
                value={weaponTypeFilter}
                onChange={(e) => setWeaponTypeFilter(e.target.value)}
                className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
              >
                <option value="All">All Types</option>
                <option value="Axe">Axe</option>
                <option value="Bow">Bow</option>
                <option value="Dagger">Dagger</option>
                <option value="Gun">Gun</option>
                <option value="Fist">Fist</option>
                <option value="Spear">Polearm</option>
                <option value="Sword">Sword</option>
                <option value="Tome">Tome</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={subtypeFilter}
                onChange={(e) => setSubtypeFilter(e.target.value)}
                className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
                disabled={availableSubtypes.length === 0}
              >
                <option value="All">All Subtypes</option>
                {availableSubtypes.map(subtype => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                ))}
                {weaponTypeFilter === 'All' || availableSubtypes.length > 0 ? (
                  <option value="None">No Subtype</option>
                ) : null}
              </select>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
              >
                <option value="All">All ★</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                  <option key={r} value={r}>{r}★</option>
                ))}
              </select>
            </div>
          </div>

            {filteredWeapons.length > 0 && (
            <div className={`max-h-48 overflow-y-auto bg-gray-900 rounded border border-gray-600 ${retroMode ? 'glow-border' : ''}`}>
              {filteredWeapons.slice(0, weaponSearchTerm ? 20 : 10).map((weapon) => (
                <div
                  key={weapon.name}
                  onClick={() => selectWeapon(weapon)}
                  className={`p-2 border-b border-gray-600 hover:bg-gray-700 cursor-pointer ${retroMode ? 'sound-hover sound-click' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{weapon.name}</div>
                      <div className="text-xs text-gray-400">
                        {'★'.repeat(weapon.rarity)} {weapon.weaponType}
                        {weapon.subtype && ` (${weapon.subtype})`}
                      </div>
                    </div>
                    <div className="text-xs text-right text-gray-300">
                      <div>Pow: {weapon.power}</div>
                      <div>Acc: {weapon.accuracy}%</div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredWeapons.length > (weaponSearchTerm ? 20 : 10) && (
                <div className="p-2 text-xs text-gray-400 text-center">
                  Showing first {weaponSearchTerm ? 20 : 10} results. {!weaponSearchTerm && 'Use search to see more.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Config Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Material</label>
            <select value={material} onChange={(e) => setMaterial(e.target.value)}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
              {Object.keys(MATERIAL_CATEGORIES).map(category => (
                <optgroup key={category} label={category}>
                  {MATERIAL_CATEGORIES[category as keyof typeof MATERIAL_CATEGORIES].map(mat => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Part 1</label>
            <select value={part1} onChange={(e) => setPart1(e.target.value)}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
              <option value="None">None</option>
              {Object.keys(WEAPON_PART_CATEGORIES).slice(1).map(category => (
                <optgroup key={category} label={category}>
                  {WEAPON_PART_CATEGORIES[category as keyof typeof WEAPON_PART_CATEGORIES].map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Part 2</label>
            <select value={part2} onChange={(e) => setPart2(e.target.value)}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
              <option value="None">None</option>
              {Object.keys(WEAPON_PART_CATEGORIES).slice(1).map(category => (
                <optgroup key={category} label={category}>
                  {WEAPON_PART_CATEGORIES[category as keyof typeof WEAPON_PART_CATEGORIES].map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Part 3</label>
            <select value={part3} onChange={(e) => setPart3(e.target.value)}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
              <option value="None">None</option>
              {Object.keys(WEAPON_PART_CATEGORIES).slice(1).map(category => (
                <optgroup key={category} label={category}>
                  {WEAPON_PART_CATEGORIES[category as keyof typeof WEAPON_PART_CATEGORIES].map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Enchantment</label>
            <select value={enchantment} onChange={(e) => setEnchantment(e.target.value)}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
              {Object.keys(ENCHANTMENTS).map(ench => (
                <option key={ench} value={ench}>{ench}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Upgrade Level</label>
            <input type="number" min="0" max="10" value={upgradeLevel}
              onChange={(e) => setUpgradeLevel(Number(e.target.value))}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Rarity</label>
            <input type="number" min="1" max="10" value={rarity}
              onChange={(e) => setRarity(Number(e.target.value))}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`}
              disabled={selectedWeapon !== null} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Two-Handed Rank</label>
            <input type="number" min="0" max="5" value={twoHandedSkillRank}
              onChange={(e) => setTwoHandedSkillRank(Number(e.target.value))}
              className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
          </div>
        </div>

        {/* Quality checkboxes */}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={powerQuality} onChange={(e) => setPowerQuality(e.target.checked)} />
            <span>Power Quality (+2)</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={critQuality} onChange={(e) => setCritQuality(e.target.checked)} />
            <span>Crit Quality (+4)</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={hitQuality} onChange={(e) => setHitQuality(e.target.checked)} />
            <span>Hit Quality (+4)</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={weightPlus} onChange={(e) => { setWeightPlus(e.target.checked); if (e.target.checked) setWeightMinus(false); }} />
            <span>Weight+ (+2)</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={weightMinus} onChange={(e) => { setWeightMinus(e.target.checked); if (e.target.checked) setWeightPlus(false); }} />
            <span>Weight- (-2)</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={sentimentality} onChange={(e) => setSentimentality(e.target.checked)} />
            <span>Sentimentality (+2 Pow/Crit/Hit)</span>
          </label>
        </div>

        {/* Base stats if custom weapon */}
        {!selectedWeapon && (
          <div className={`mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm bg-gray-800 p-3 rounded ${retroMode ? 'glow-border' : ''}`}>
            <div>
              <label className="block text-xs">Base Power</label>
              <input type="number" value={basePower} onChange={(e) => setBasePower(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
            </div>
            <div>
              <label className="block text-xs">Base Crit</label>
              <input type="number" value={baseCrit} onChange={(e) => setBaseCrit(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
            </div>
            <div>
              <label className="block text-xs">Base Hit</label>
              <input type="number" value={baseHit} onChange={(e) => setBaseHit(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
            </div>
            <div>
              <label className="block text-xs">Base Weight</label>
              <input type="number" value={baseWeight} onChange={(e) => setBaseWeight(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
            </div>
          </div>
        )}
      </div>

      {/* Custom Stat Scaling */}
      <div className={`mt-6 bg-gray-700 p-4 rounded-lg ${retroMode ? 'glow-border' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-lg font-semibold text-cyan-400 ${retroMode ? 'font-retro' : ''}`}>Custom Stat Scaling</h3>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          Adjust the percentage each stat contributes to weapon power (initialized from weapon type defaults)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">STR (%)</label>
                <input
                  type="number"
                  value={customScaling.str}
                  onChange={(e) => setCustomScaling({ ...customScaling, str: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">WIL (%)</label>
                <input
                  type="number"
                  value={customScaling.wil}
                  onChange={(e) => setCustomScaling({ ...customScaling, wil: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SKI (%)</label>
                <input
                  type="number"
                  value={customScaling.ski}
                  onChange={(e) => setCustomScaling({ ...customScaling, ski: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">CEL (%)</label>
                <input
                  type="number"
                  value={customScaling.cel}
                  onChange={(e) => setCustomScaling({ ...customScaling, cel: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">DEF (%)</label>
                <input
                  type="number"
                  value={customScaling.def}
                  onChange={(e) => setCustomScaling({ ...customScaling, def: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">RES (%)</label>
                <input
                  type="number"
                  value={customScaling.res}
                  onChange={(e) => setCustomScaling({ ...customScaling, res: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">VIT (%)</label>
                <input
                  type="number"
                  value={customScaling.vit}
                  onChange={(e) => setCustomScaling({ ...customScaling, vit: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">FAI (%)</label>
                <input
                  type="number"
                  value={customScaling.fai}
                  onChange={(e) => setCustomScaling({ ...customScaling, fai: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">LUC (%)</label>
                <input
                  type="number"
                  value={customScaling.luc}
                  onChange={(e) => setCustomScaling({ ...customScaling, luc: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">GUI (%)</label>
                <input
                  type="number"
                  value={customScaling.gui}
                  onChange={(e) => setCustomScaling({ ...customScaling, gui: Number(e.target.value) })}
                  className={`w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SAN (%)</label>
                <input
                  type="number"
                  value={customScaling.san}
                  onChange={(e) => setCustomScaling({ ...customScaling, san: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Example: 100% STR means 40 STR = +40 Power. Current total scaling bonus: +{calculateScaling()} Power
            </div>
      </div>

      {/* Weapon Details */}
      {selectedWeapon && (
        <div className={`mt-6 bg-gradient-to-br from-blue-800 to-indigo-800 p-4 rounded-lg border-2 border-blue-400 ${retroMode ? 'glow-border' : ''}`}>
          <h3 className={`text-lg font-semibold mb-3 text-blue-200 ${retroMode ? 'font-retro' : ''}`}>
            {selectedWeapon.name} Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-blue-300 font-medium">Damage Type:</span> {selectedWeapon.damageType}
              </div>
              {selectedWeapon.subtype && (
                <div className="text-sm">
                  <span className="text-blue-300 font-medium">Subtype:</span> {selectedWeapon.subtype}
                </div>
              )}
              <div className="text-sm">
                <span className="text-blue-300 font-medium">Range:</span> {selectedWeapon.range}
              </div>
              <div className="text-sm">
                <span className="text-blue-300 font-medium">Scaling:</span> {selectedWeapon.scaling.map(s => s.type).join(', ')}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-blue-300 font-medium">Location:</span> {selectedWeapon.location.join(', ')}
              </div>
              {selectedWeapon.material && (
                <div className="text-sm">
                  <span className="text-blue-300 font-medium">Material:</span> {selectedWeapon.material}
                </div>
              )}
              {selectedWeapon.enchantment && (
                <div className="text-sm">
                  <span className="text-blue-300 font-medium">Enchantment:</span> {selectedWeapon.enchantment}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm mb-2">
              <span className="text-blue-300 font-medium">Description:</span>
            </div>
            <div className="text-sm text-gray-300 italic bg-blue-900 bg-opacity-30 p-2 rounded">
              {selectedWeapon.description}
            </div>
          </div>

          {selectedWeapon.specials && selectedWeapon.specials.length > 0 && (
            <div>
              <div className="text-sm mb-2">
                <span className="text-blue-300 font-medium">Special Abilities:</span>
              </div>
              <div className="space-y-2">
                {selectedWeapon.specials.map((special, index) => (
                  <div key={index} className="bg-blue-900 bg-opacity-30 p-2 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 font-medium text-sm">{special.name}</span>
                      <span className="text-xs px-1 py-0.5 bg-blue-600 rounded">{special.type}</span>
                      {special.cooldown && (
                        <span className="text-xs text-gray-400">CD: {special.cooldown}r</span>
                      )}
                      {special.fpCost && (
                        <span className="text-xs text-gray-400">FP: {special.fpCost}</span>
                      )}
                      {special.momentumCost && (
                        <span className="text-xs text-gray-400">M: {special.momentumCost}</span>
                      )}
                      {special.triggerRate && (
                        <span className="text-xs text-gray-400">Rate: {special.triggerRate}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300">{special.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mutation Enchant Info */}
      {enchantment === 'Mutation' && (
        <div className={`mt-6 bg-gradient-to-br from-purple-800 to-pink-800 p-4 rounded-lg border-2 border-purple-400 ${retroMode ? 'glow-border' : ''}`}>
          <h3 className="text-lg font-semibold mb-3 text-purple-200">
            Mutation Enchantment
          </h3>
          <p className="text-sm text-purple-300 mb-2">
            <strong>Effect:</strong> -5 Hit, +25% Weight. Weapon type changes based on rarity (9*+ weapons not affected).
          </p>
          <p className="text-sm text-purple-300 mb-2">
            <strong>Note:</strong> Weapon type change is visual/mechanical only - stat scaling remains based on original weapon type.
          </p>
          <div className="text-sm text-purple-200 grid grid-cols-4 gap-2">
            <div>1*: Dagger</div>
            <div>2*: Fist</div>
            <div>3*: Sword</div>
            <div>4*: Axe</div>
            <div>5*: Polearm</div>
            <div>6*: Tome</div>
            <div>7*: Bow</div>
            <div>8*: Gun</div>
          </div>
          {rarity < 9 && (
            <div className="mt-3 text-yellow-300 font-semibold">
              Current Mutation Type: {getEffectiveWeaponType()} (Scaling: {weaponType})
            </div>
          )}
        </div>
      )}

      {/* Rebellion Enchant Info */}
      {enchantment === 'Rebellion' && (
        <div className={`mt-6 bg-gradient-to-br from-red-800 to-orange-800 p-4 rounded-lg border-2 border-red-400 ${retroMode ? 'glow-border' : ''}`}>
          <h3 className="text-lg font-semibold mb-3 text-red-200">
            Rebellion Enchantment
          </h3>
          <p className="text-sm text-red-300 mb-2">
            <strong>Effect:</strong> +1.5 Power and -1.5 Hit for every 1 Rarity below 9*.
          </p>
          <div className="text-sm text-red-200">
            <div>Current Rarity: {rarity}*</div>
            {rarity < 9 && (
              <>
                <div>Rarity Difference: {9 - rarity} (below 9*)</div>
                <div className="text-yellow-300 font-semibold">
                  Rebellion Bonus: +{Math.floor((9 - rarity) * 1.5)} Power, {-Math.floor((9 - rarity) * 1.5)} Hit
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gigantic Enchant Info */}
      {enchantment === 'Gigantic' && (
        <div className={`mt-6 bg-gradient-to-br from-gray-800 to-stone-800 p-4 rounded-lg border-2 border-gray-400 ${retroMode ? 'glow-border' : ''}`}>
          <h3 className="text-lg font-semibold mb-3 text-gray-200">
            Gigantic Enchantment
          </h3>
          <p className="text-sm text-gray-300 mb-2">
            <strong>Effect:</strong> +1 Attack Range, -10 Evade, +50% Weight (minimum 2).
          </p>
          <div className="text-sm text-gray-200">
            <div>Base Weight Calculation: {Math.floor((baseWeight + (MATERIALS[material]?.weight || 0) + (WEAPON_PART1[part1]?.weight || 0) + (WEAPON_PART2[part2]?.weight || 0) + (WEAPON_PART3[part3]?.weight || 0) + (weightPlus && !weightMinus ? 1 : !weightPlus && weightMinus ? -1 : 0)) * 1.5)}</div>
            <div className="text-yellow-300">Final Weight: {weaponStats.weight} (minimum 2 enforced)</div>
          </div>
        </div>
      )}

      {/* Vorpal Enchant Info */}
      {enchantment === 'Vorpal' && (
        <div className={`mt-6 bg-gradient-to-br from-purple-800 to-indigo-800 p-4 rounded-lg border-2 border-purple-400 ${retroMode ? 'glow-border' : ''}`}>
          <h3 className="text-lg font-semibold mb-3 text-purple-200">
            Vorpal Enchantment
          </h3>
          <p className="text-sm text-purple-300 mb-2">
            <strong>Effect:</strong> +10 Weapon Critical, +5% Critical Damage.
          </p>
          <p className="text-sm text-purple-300">
            <strong>Special:</strong> 5% chance for Vorpal Strike (9999 Akashic damage) vs monsters (excludes bosses and monsters 10+ levels higher).
          </p>
        </div>
      )}

            {/* Weapon 2 Configuration - Only shown in comparison mode */}
      {comparisonMode && (
        <div className={`mt-8 border-4 border-green-600 rounded-lg p-6 bg-gradient-to-br from-green-900 to-emerald-900 ${retroMode ? 'glow-border' : ''}`}>
          <h2 className={`text-2xl font-bold mb-4 text-center text-green-300 ${retroMode ? 'font-retro glitch-title' : ''}`}>Weapon 2 Configuration</h2>
          
          {/* Weapon 2 Selection */}
          <div className={`mb-4 border border-green-500 rounded p-3 bg-gray-800 ${retroMode ? 'glow-border' : ''}`}>
            <h3 className="text-lg font-semibold mb-3 text-green-400">🔍 Weapon Selection</h3>
            
            {selectedWeapon2 && (
              <div className="mb-3 p-2 bg-green-900 rounded border border-green-600">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-green-300">{selectedWeapon2.name}</h4>
                    <div className="text-sm text-gray-300">
                      {'★'.repeat(selectedWeapon2.rarity)} {selectedWeapon2.weaponType}
                      {selectedWeapon2.subtype && ` (${selectedWeapon2.subtype})`}
                    </div>
                  </div>
                  <button
                    onClick={clearWeaponSelection2}
                    className={`px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
                  >
                    Clear
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Power: {selectedWeapon2.power} | Accuracy: {selectedWeapon2.accuracy}% | 
                  Critical: {selectedWeapon2.critical}% | Weight: {selectedWeapon2.weight}
                </div>
              </div>
            )}

            <div className="space-y-2 mb-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={weaponSearchTerm2}
                  onChange={(e) => setWeaponSearchTerm2(e.target.value)}
                  className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-hover' : ''}`}
                />
                <select
                  value={weaponTypeFilter2}
                  onChange={(e) => setWeaponTypeFilter2(e.target.value)}
                  className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
                >
                  <option value="All">All Types</option>
                  <option value="Axe">Axe</option>
                  <option value="Bow">Bow</option>
                  <option value="Dagger">Dagger</option>
                  <option value="Gun">Gun</option>
                  <option value="Fist">Fist</option>
                  <option value="Spear">Polearm</option>
                  <option value="Sword">Sword</option>
                  <option value="Tome">Tome</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={subtypeFilter2}
                  onChange={(e) => setSubtypeFilter2(e.target.value)}
                  className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
                  disabled={availableSubtypes2.length === 0}
                >
                  <option value="All">All Subtypes</option>
                  {availableSubtypes2.map(subtype => (
                    <option key={subtype} value={subtype}>{subtype}</option>
                  ))}
                  {weaponTypeFilter2 === 'All' || availableSubtypes2.length > 0 ? (
                    <option value="None">No Subtype</option>
                  ) : null}
                </select>
                <select
                  value={rarityFilter2}
                  onChange={(e) => setRarityFilter2(e.target.value)}
                  className={`bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
                >
                  <option value="All">All ★</option>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>{r}★</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredWeapons2.length > 0 && (
              <div className={`max-h-48 overflow-y-auto bg-gray-900 rounded border border-gray-600 ${retroMode ? 'glow-border' : ''}`}>
                {filteredWeapons2.slice(0, weaponSearchTerm2 ? 20 : 10).map((weapon) => (
                  <div
                    key={weapon.name}
                    onClick={() => selectWeapon2(weapon)}
                    className={`p-2 border-b border-gray-600 hover:bg-gray-700 cursor-pointer ${retroMode ? 'sound-hover sound-click' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{weapon.name}</div>
                        <div className="text-xs text-gray-400">
                          {'★'.repeat(weapon.rarity)} {weapon.weaponType}
                          {weapon.subtype && ` (${weapon.subtype})`}
                        </div>
                      </div>
                      <div className="text-xs text-right text-gray-300">
                        <div>Pow: {weapon.power}</div>
                        <div>Acc: {weapon.accuracy}%</div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredWeapons2.length > (weaponSearchTerm2 ? 20 : 10) && (
                  <div className="p-2 text-xs text-gray-400 text-center">
                    Showing first {weaponSearchTerm2 ? 20 : 10} results. {!weaponSearchTerm2 && 'Use search to see more.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Weapon 2 Quick Config */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium mb-1">Material</label>
              <select value={material2} onChange={(e) => setMaterial2(e.target.value)}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
                {Object.keys(MATERIAL_CATEGORIES).map(category => (
                  <optgroup key={category} label={category}>
                    {MATERIAL_CATEGORIES[category as keyof typeof MATERIAL_CATEGORIES].map(mat => (
                      <option key={mat} value={mat}>{mat}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1">Part 1</label>
              <select value={part1_2} onChange={(e) => setPart1_2(e.target.value)}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
                <option value="None">None</option>
                {Object.keys(WEAPON_PART_CATEGORIES).slice(1).map(category => (
                  <optgroup key={category} label={category}>
                    {WEAPON_PART_CATEGORIES[category as keyof typeof WEAPON_PART_CATEGORIES].map(part => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Part 2</label>
              <select value={part2_2} onChange={(e) => setPart2_2(e.target.value)}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
                <option value="None">None</option>
                {Object.keys(WEAPON_PART_CATEGORIES).slice(1).map(category => (
                  <optgroup key={category} label={category}>
                    {WEAPON_PART_CATEGORIES[category as keyof typeof WEAPON_PART_CATEGORIES].map(part => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Part 3</label>
              <select value={part3_2} onChange={(e) => setPart3_2(e.target.value)}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
                <option value="None">None</option>
                {Object.keys(WEAPON_PART_CATEGORIES).slice(1).map(category => (
                  <optgroup key={category} label={category}>
                    {WEAPON_PART_CATEGORIES[category as keyof typeof WEAPON_PART_CATEGORIES].map(part => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Enchantment</label>
              <select value={enchantment2} onChange={(e) => setEnchantment2(e.target.value)}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}>
                {Object.keys(ENCHANTMENTS).map(ench => (
                  <option key={ench} value={ench}>{ench}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Upgrade Level</label>
              <input type="number" min="0" max="10" value={upgradeLevel2}
                onChange={(e) => setUpgradeLevel2(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Rarity</label>
              <input type="number" min="1" max="10" value={rarity2}
                onChange={(e) => setRarity2(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`}
                disabled={selectedWeapon2 !== null} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Two-Handed Rank</label>
              <input type="number" min="0" max="5" value={twoHandedSkillRank2}
                onChange={(e) => setTwoHandedSkillRank2(Number(e.target.value))}
                className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 ${retroMode ? 'glow-border sound-hover' : ''}`} />
            </div>
          </div>

          {/* Quality checkboxes for weapon 2 */}
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={powerQuality2} onChange={(e) => setPowerQuality2(e.target.checked)} />
              <span>Power Quality (+2)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={critQuality2} onChange={(e) => setCritQuality2(e.target.checked)} />
              <span>Crit Quality (+4)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={hitQuality2} onChange={(e) => setHitQuality2(e.target.checked)} />
              <span>Hit Quality (+4)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={weightPlus2} onChange={(e) => setWeightPlus2(e.target.checked)} />
              <span>Weight+ (+2)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={weightMinus2} onChange={(e) => setWeightMinus2(e.target.checked)} />
              <span>Weight- (-2)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={sentimentality2} onChange={(e) => setSentimentality2(e.target.checked)} />
              <span>Sentimentality (+2 Pow/Crit/Hit)</span>
            </label>
          </div>

          {/* Base stats for weapon 2 if custom */}
          {!selectedWeapon2 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm bg-gray-800 p-3 rounded">
              <div>
                <label className="block text-xs">Base Power</label>
                <input type="number" value={basePower2} onChange={(e) => setBasePower2(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs">Base Crit</label>
                <input type="number" value={baseCrit2} onChange={(e) => setBaseCrit2(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs">Base Hit</label>
                <input type="number" value={baseHit2} onChange={(e) => setBaseHit2(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs">Base Weight</label>
                <input type="number" value={baseWeight2} onChange={(e) => setBaseWeight2(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stat Verification Section */}
      <div className={`mt-6 bg-gray-700 p-4 rounded-lg ${retroMode ? 'glow-border' : ''}`}>
        <h3 className="text-lg font-semibold mb-3 text-cyan-400">Character Stats (from Calculator)</h3>
        <p className="text-xs text-gray-400 mb-3">These are your scaled stats being used for weapon calculations:</p>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">STR</div>
            <div className="text-white font-bold">{Math.floor(stats.str)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">WIL</div>
            <div className="text-white font-bold">{Math.floor(stats.wil)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">SKI</div>
            <div className="text-white font-bold">{Math.floor(stats.ski)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">CEL</div>
            <div className="text-white font-bold">{Math.floor(stats.cel)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">DEF</div>
            <div className="text-white font-bold">{Math.floor(stats.def)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">RES</div>
            <div className="text-white font-bold">{Math.floor(stats.res)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">VIT</div>
            <div className="text-white font-bold">{Math.floor(stats.vit)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">FAI</div>
            <div className="text-white font-bold">{Math.floor(stats.fai)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">LUC</div>
            <div className="text-white font-bold">{Math.floor(stats.luc)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">GUI</div>
            <div className="text-white font-bold">{Math.floor(stats.gui)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">SAN</div>
            <div className="text-white font-bold">{Math.floor(stats.san)}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400 text-xs">APT</div>
            <div className="text-white font-bold">{Math.floor(stats.apt)}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
         These stats include all bonuses from race, class, aptitude, etc.
        </div>
      </div>

        </>
      )}

      {/* Results */}
      <div className={`mt-6 panel-soft p-6 rounded-lg ${retroMode ? 'glow-border' : ''}`}>
        <h3 className={`text-2xl font-bold mb-4 text-center ${retroMode ? 'font-retro glitch-title text-yellow-300' : 'text-white'}`}>Final Weapon Stats</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Power</div>
            <div className="text-2xl font-bold text-red-400">{weaponStats.power}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Weapon Critical</div>
            <div className="text-2xl font-bold text-yellow-400">{weaponStats.weaponCritical}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center border-2 border-yellow-500">
            <div className="text-sm text-gray-300">Crit Chance (Crit+SKI/2+LUC)</div>
            <div className="text-2xl font-bold text-yellow-300">{weaponStats.crit}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Weapon Accuracy</div>
            <div className="text-2xl font-bold text-green-400">{weaponStats.weaponAccuracy}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center border-2 border-green-500">
            <div className="text-sm text-gray-300">Hit (SKI×2 + Accuracy)</div>
            <div className="text-2xl font-bold text-green-300">{weaponStats.hit}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Weight</div>
            <div className="text-2xl font-bold text-blue-400">{weaponStats.weight}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Crit Damage</div>
            <div className="text-2xl font-bold text-purple-400">{weaponStats.critDamageMod}%</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">SWA</div>
            <div className="text-2xl font-bold text-orange-400">{weaponStats.swa}</div>
          </div>

          <div className="bg-black bg-opacity-30 p-3 rounded text-center border-2 border-yellow-500">
            <div className="text-sm text-gray-300">Critical SWA</div>
            <div className="text-2xl font-bold text-yellow-300">{weaponStats.critSwa}</div>
          </div>
        </div>

        <div className="mt-4 space-y-1 text-sm text-gray-300">
          <div className="text-center font-semibold text-blue-300 mb-2">Breakdown:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 max-w-2xl mx-auto">
            <div>Stat Scaling Bonus: <span className="text-white font-semibold">+{calculateScaling()}</span> Power</div>
            <div>Weapon Critical: <span className="text-white font-semibold">{weaponStats.weaponCritical}</span></div>
            <div>SKI Contribution to Crit: <span className="text-white font-semibold">+{Math.floor(stats.ski / 2)}</span> (SKI / 2)</div>
            <div>LUC Contribution to Crit: <span className="text-white font-semibold">+{Math.floor(stats.luc)}</span></div>
            {hasPrimaryStrScaling() && calculateStrScaling() > 0 && (
              <div>Primary STR Crit Bonus: <span className="text-white font-semibold">+{Math.floor(calculateStrScaling() * 0.4)}</span> (to Weapon Crit)</div>
            )}
            <div>SKI Contribution to Hit: <span className="text-white font-semibold">+{Math.floor(stats.ski * 2)}</span> (SKI × 2)</div>
            <div>Weapon Accuracy: <span className="text-white font-semibold">{weaponStats.weaponAccuracy}</span></div>
            <div>GUI Crit Damage Bonus: <span className="text-white font-semibold">+{Math.floor(stats.gui)}%</span> Crit Damage</div>
            {upgradeLevel > 0 && (
              <>
                <div>Upgrade Bonus: <span className="text-white font-semibold">+{upgradeLevel}</span> Power</div>
                <div>Upgrade Bonus: <span className="text-white font-semibold">+{upgradeLevel}</span> Crit Chance</div>
                <div>Upgrade Bonus: <span className="text-white font-semibold">+{upgradeLevel}</span> Hit</div>
              </>
            )}
            {enchantment === 'Rebellion' && rarity < 9 && (
              <>
                <div>Rebellion Power Bonus: <span className="text-white font-semibold">+{Math.floor((9 - rarity) * 1.5)}</span></div>
                <div>Rebellion Hit Penalty: <span className="text-red-400 font-semibold">{-Math.floor((9 - rarity) * 1.5)}</span></div>
              </>
            )}
            {twoHandedSkillRank > 0 && (
              <>
                {weaponStats.twoHandedPowerBonus > 0 && (
                  <div>Two-Handed Power Bonus: <span className="text-white font-semibold">+{weaponStats.twoHandedPowerBonus}</span> SWA (Rank {twoHandedSkillRank})</div>
                )}
                {weaponStats.twoHandedHitBonus > 0 && (
                  <div>Two-Handed Hit Bonus: <span className="text-white font-semibold">+{weaponStats.twoHandedHitBonus}</span> Hit (Rank {twoHandedSkillRank})</div>
                )}
              </>
            )}
            {enchantment === 'Mutation' && rarity < 9 && (
              <div className="col-span-full text-purple-300">
                Mutation Effect: Weapon functions as <span className="font-semibold">{getEffectiveWeaponType()}</span> (based on {rarity}* rarity)
              </div>
            )}
            {enchantment === 'Gigantic' && (
              <div className="col-span-full text-gray-300">
                Gigantic Effect: +1 Range, -10 Evade, +50% Weight (min 2)
              </div>
            )}
            {enchantment === 'Vorpal' && (
              <div className="col-span-full text-purple-300">
                Vorpal Effect: 5% chance for 9999 Akashic damage vs eligible monsters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison View */}
      {comparisonMode && (
        <div className={`mt-8 border-t-4 border-purple-600 pt-6 ${retroMode ? 'glow-border' : ''}`}>
          <h2 className={`text-3xl font-bold mb-6 text-center text-purple-400 ${retroMode ? 'font-retro glitch-title' : ''}`}>Weapon Comparison</h2>
          
          {/* Comparison Stats Grid */}
          <div className={`bg-gray-800 p-6 rounded-lg mb-6 ${retroMode ? 'glow-border' : ''}`}>
            <h3 className={`text-xl font-bold mb-4 ${retroMode ? 'font-retro' : ''}`}>Final Stats Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead>
                  <tr className="border-b-2 border-gray-600">
                    <th className="p-3 text-gray-300">Stat</th>
                    <th className="p-3 text-gray-300">Weapon 1</th>
                    <th className="p-3 text-gray-300">Weapon 2</th>
                    <th className="p-3 text-gray-300">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Power</td>
                    <td className={`p-3 ${weaponStats.power > weaponStats2.power ? 'text-green-400 font-bold' : weaponStats.power < weaponStats2.power ? 'text-red-400' : 'text-white'}`}>{weaponStats.power}</td>
                    <td className={`p-3 ${weaponStats2.power > weaponStats.power ? 'text-green-400 font-bold' : weaponStats2.power < weaponStats.power ? 'text-red-400' : 'text-white'}`}>{weaponStats2.power}</td>
                    <td className="p-3">{weaponStats2.power - weaponStats.power > 0 ? '+' : ''}{weaponStats2.power - weaponStats.power}</td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Weapon Critical</td>
                    <td className={`p-3 ${weaponStats.weaponCritical > weaponStats2.weaponCritical ? 'text-green-400 font-bold' : weaponStats.weaponCritical < weaponStats2.weaponCritical ? 'text-red-400' : 'text-white'}`}>{weaponStats.weaponCritical}</td>
                    <td className={`p-3 ${weaponStats2.weaponCritical > weaponStats.weaponCritical ? 'text-green-400 font-bold' : weaponStats2.weaponCritical < weaponStats.weaponCritical ? 'text-red-400' : 'text-white'}`}>{weaponStats2.weaponCritical}</td>
                    <td className="p-3">{weaponStats2.weaponCritical - weaponStats.weaponCritical > 0 ? '+' : ''}{weaponStats2.weaponCritical - weaponStats.weaponCritical}</td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Crit Chance</td>
                    <td className="p-3">{weaponStats.crit}</td>
                    <td className="p-3">{weaponStats2.crit}</td>
                    <td className="p-3 text-gray-400">-</td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Weapon Accuracy</td>
                    <td className={`p-3 ${weaponStats.weaponAccuracy > weaponStats2.weaponAccuracy ? 'text-green-400 font-bold' : weaponStats.weaponAccuracy < weaponStats2.weaponAccuracy ? 'text-red-400' : 'text-white'}`}>{weaponStats.weaponAccuracy}</td>
                    <td className={`p-3 ${weaponStats2.weaponAccuracy > weaponStats.weaponAccuracy ? 'text-green-400 font-bold' : weaponStats2.weaponAccuracy < weaponStats.weaponAccuracy ? 'text-red-400' : 'text-white'}`}>{weaponStats2.weaponAccuracy}</td>
                    <td className="p-3">{weaponStats2.weaponAccuracy - weaponStats.weaponAccuracy > 0 ? '+' : ''}{weaponStats2.weaponAccuracy - weaponStats.weaponAccuracy}</td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Hit</td>
                    <td className="p-3">{weaponStats.hit}</td>
                    <td className="p-3">{weaponStats2.hit}</td>
                    <td className="p-3 text-gray-400">-</td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Weight</td>
                    <td className={`p-3 ${weaponStats.weight < weaponStats2.weight ? 'text-green-400 font-bold' : weaponStats.weight > weaponStats2.weight ? 'text-red-400' : 'text-white'}`}>{weaponStats.weight}</td>
                    <td className={`p-3 ${weaponStats2.weight < weaponStats.weight ? 'text-green-400 font-bold' : weaponStats2.weight > weaponStats.weight ? 'text-red-400' : 'text-white'}`}>{weaponStats2.weight}</td>
                    <td className="p-3">{weaponStats2.weight - weaponStats.weight > 0 ? '+' : ''}{weaponStats2.weight - weaponStats.weight}</td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="p-3 font-semibold">Crit Damage %</td>
                    <td className={`p-3 ${weaponStats.critDamageMod > weaponStats2.critDamageMod ? 'text-green-400 font-bold' : weaponStats.critDamageMod < weaponStats2.critDamageMod ? 'text-red-400' : 'text-white'}`}>{weaponStats.critDamageMod}%</td>
                    <td className={`p-3 ${weaponStats2.critDamageMod > weaponStats.critDamageMod ? 'text-green-400 font-bold' : weaponStats2.critDamageMod < weaponStats.critDamageMod ? 'text-red-400' : 'text-white'}`}>{weaponStats2.critDamageMod}%</td>
                    <td className="p-3">{weaponStats2.critDamageMod - weaponStats.critDamageMod > 0 ? '+' : ''}{weaponStats2.critDamageMod - weaponStats.critDamageMod}%</td>
                  </tr>
                  <tr className="hover:bg-gray-800 bg-gray-700">
                    <td className="p-3 font-bold">SWA</td>
                    <td className={`p-3 font-bold ${weaponStats.swa > weaponStats2.swa ? 'text-green-400' : weaponStats.swa < weaponStats2.swa ? 'text-red-400' : 'text-white'}`}>{weaponStats.swa}</td>
                    <td className={`p-3 font-bold ${weaponStats2.swa > weaponStats.swa ? 'text-green-400' : weaponStats2.swa < weaponStats.swa ? 'text-red-400' : 'text-white'}`}>{weaponStats2.swa}</td>
                    <td className="p-3 font-bold">{weaponStats2.swa - weaponStats.swa > 0 ? '+' : ''}{weaponStats2.swa - weaponStats.swa}</td>
                  </tr>
                  <tr className="hover:bg-gray-800 bg-gray-700">
                    <td className="p-3 font-bold">Critical SWA</td>
                    <td className={`p-3 font-bold ${weaponStats.critSwa > weaponStats2.critSwa ? 'text-green-400' : weaponStats.critSwa < weaponStats2.critSwa ? 'text-red-400' : 'text-white'}`}>{weaponStats.critSwa}</td>
                    <td className={`p-3 font-bold ${weaponStats2.critSwa > weaponStats.critSwa ? 'text-green-400' : weaponStats2.critSwa < weaponStats.critSwa ? 'text-red-400' : 'text-white'}`}>{weaponStats2.critSwa}</td>
                    <td className="p-3 font-bold">{weaponStats2.critSwa - weaponStats.critSwa > 0 ? '+' : ''}{weaponStats2.critSwa - weaponStats.critSwa}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
              <h4 className="font-bold text-gray-300 mb-2">Weapon 1 Summary</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {selectedWeapon?.name || 'Custom Weapon'}</div>
                <div><strong>Type:</strong> {weaponType} {enchantment === 'Mutation' && rarity < 9 ? `→ ${getEffectiveWeaponType()}` : ''}</div>
                <div><strong>Material:</strong> {material}</div>
                <div><strong>Enchantment:</strong> {enchantment}</div>
                <div><strong>Upgrade:</strong> +{upgradeLevel}</div>
                <div><strong>Rarity:</strong> {'★'.repeat(rarity)}</div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
              <h4 className="font-bold text-gray-300 mb-2">Weapon 2 Summary</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {selectedWeapon2?.name || 'Custom Weapon'}</div>
                <div><strong>Type:</strong> {weaponType2} {enchantment2 === 'Mutation' && rarity2 < 9 ? `→ ${getEffectiveWeaponType2()}` : ''}</div>
                <div><strong>Material:</strong> {material2}</div>
                <div><strong>Enchantment:</strong> {enchantment2}</div>
                <div><strong>Upgrade:</strong> +{upgradeLevel2}</div>
                <div><strong>Rarity:</strong> {'★'.repeat(rarity2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
