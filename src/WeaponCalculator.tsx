/**
 * SL2 Weapon Calculator
 * Port of the C# WeaponCalculator with materials, parts, enchantments, and stat scaling
 */

import { useState } from 'react';
import { Wrench } from 'lucide-react';

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

// Material definitions
const MATERIALS: Record<string, Material> = {
  'None': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Accursed': { power: 0, crit: 0, hit: 0, weight: -2 },
  'Arctic': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Ashen Chapter': { power: 3, crit: 0, hit: 0, weight: -2 },
  'Aureate': { power: 1, crit: 1, hit: 1, weight: 0 },
  'Boulder': { power: 2, crit: 0, hit: -2, weight: 4 },
  'Carapace': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Conduiz': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Coral': { power: 1, crit: 0, hit: 0, weight: -2 },
  'Dragon': { power: 4, crit: 0, hit: 0, weight: 2 },
  'Fireblood': { power: 2, crit: 0, hit: 0, weight: 0 },
  'Fossil': { power: 1, crit: 0, hit: -1, weight: 3 },
  'Galdric': { power: 0, crit: 1, hit: 2, weight: 0 },
  'Gorgon': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Gravestone': { power: 2, crit: 0, hit: -1, weight: 3 },
  'Iceblood': { power: 2, crit: 0, hit: 0, weight: 0 },
  'Insect': { power: 0, crit: 1, hit: 1, weight: -2 },
  'Magmic': { power: 2, crit: 0, hit: 0, weight: 0 },
  'Meteorite': { power: 2, crit: 0, hit: 0, weight: 0 },
  'Orichalum': { power: 3, crit: 0, hit: 1, weight: 2 },
  'Planetarium': { power: 1, crit: 1, hit: 1, weight: -2 },
  'Rockdirt': { power: 2, crit: 0, hit: -2, weight: 4 },
  'Sandstone': { power: 1, crit: 0, hit: -1, weight: 2 },
  'Shark': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Sheet Music': { power: 0, crit: 1, hit: 2, weight: -2 },
  'Snakeman': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Spatial': { power: 0, crit: 1, hit: 2, weight: -1 },
  'Thinsteel': { power: 1, crit: 1, hit: 1, weight: -2 }
};

// Weapon Part 1 definitions (Blade, Body, etc.)
const WEAPON_PART1: Record<string, WeaponPart> = {
  'None': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Balanced': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Barbed': { power: 2, crit: 0, hit: -1, weight: 1 },
  'Cutting': { power: 2, crit: 1, hit: 0, weight: 0 },
  'Dense': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Elongated': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Flexible': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Focused': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Guillotine': { power: 3, crit: 0, hit: -2, weight: 2 },
  'Helix': { power: 2, crit: 1, hit: 0, weight: 0 },
  'Hellish Eye': { power: 1, crit: 2, hit: 0, weight: 0 },
  'Hollow': { power: 0, crit: 0, hit: 1, weight: -2 },
  'Hooked': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Huge(Sword)': { power: 4, crit: 0, hit: -2, weight: 4 },
  'Large Body': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Leather': { power: 0, crit: 0, hit: 1, weight: -1 },
  'Long': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Piercing Blade': { power: 2, crit: 1, hit: 1, weight: 0 },
  'Razor Blade': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Serrated': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Short': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Silk': { power: 0, crit: 1, hit: 1, weight: 0 },
  'Sniper(Rifle)': { power: 1, crit: 0, hit: 2, weight: 0 },
  'Spiked Axehead': { power: 1, crit: 1, hit: 0, weight: 0 },
  'Spiked Knuckles': { power: 1, crit: 1, hit: 0, weight: 0 },
  'Tempered': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Thin Spearhead': { power: 1, crit: 2, hit: 1, weight: 0 },
  'Tight': { power: 0, crit: 1, hit: 1, weight: 0 },
  'Wide': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Wire': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wooden': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wrapped': { power: 0, crit: 0, hit: 0, weight: 0 }
};

// Weapon Part 2 definitions (Handle, Grip, etc.)
const WEAPON_PART2: Record<string, WeaponPart> = {
  'None': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Balanced': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Custom': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Extended': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Firm Hilt': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Flexible': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Full': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Helix': { power: 2, crit: 1, hit: 0, weight: 0 },
  'Huge(Sword)': { power: 4, crit: 0, hit: -2, weight: 4 },
  'Insulated Hilt': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Leather Binds': { power: 0, crit: 1, hit: 1, weight: 0 },
  'Locking': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Long Binds': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Loose': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Magic Binds': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Metal Binds': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Onigan Hilt': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Piercing Blade': { power: 2, crit: 1, hit: 1, weight: 0 },
  'Razor Blade': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Razor Guard': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Revolver': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Serrated': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Sharp Hilt': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Silk': { power: 0, crit: 1, hit: 1, weight: 0 },
  'Soft': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Spiked Wrist': { power: 1, crit: 1, hit: 0, weight: 0 },
  'Steady': { power: 0, crit: 0, hit: 2, weight: 0 },
  'Strings Wrist': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Sturdy': { power: 0, crit: 0, hit: 1, weight: 2 },
  'Tight': { power: 0, crit: 1, hit: 1, weight: 0 },
  'Weighted': { power: 3, crit: 0, hit: -1, weight: 3 },
  'Wire': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wooden': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wooden Hilt': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wrist Guard': { power: 0, crit: 0, hit: 0, weight: 0 }
};

// Weapon Part 3 definitions (Tip, Pommel, etc.)
const WEAPON_PART3: Record<string, WeaponPart> = {
  'None': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Aerodynamic': { power: 0, crit: 0, hit: 2, weight: -1 },
  'Balanced': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Cutting': { power: 2, crit: 1, hit: 0, weight: 0 },
  'Firm Hilt': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Flexible': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Guillotine': { power: 3, crit: 0, hit: -2, weight: 2 },
  'Heavy Arrow': { power: 2, crit: 0, hit: -1, weight: 2 },
  'Helix': { power: 2, crit: 1, hit: 0, weight: 0 },
  'Hellhound': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Huge(Sword)': { power: 4, crit: 0, hit: -2, weight: 4 },
  'Insulated Hilt': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Light Arrow': { power: 0, crit: 0, hit: 2, weight: -1 },
  'Onigan Hilt': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Piercing Blade': { power: 2, crit: 1, hit: 1, weight: 0 },
  'Piercing Bullet': { power: 1, crit: 0, hit: 1, weight: 0 },
  'Razor Blade': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Scatter': { power: 0, crit: 0, hit: 1, weight: 1 },
  'Serrated': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Sharp Arrow': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Sharp Hilt': { power: 0, crit: 2, hit: 0, weight: 0 },
  'Silver': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Spiked Axehead': { power: 1, crit: 1, hit: 0, weight: 0 },
  'Tempered': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Thin Arrow': { power: 0, crit: 1, hit: 1, weight: -1 },
  'Wooden': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wooden Hilt': { power: 0, crit: 0, hit: 0, weight: 0 }
};

// Enchantment definitions
const ENCHANTMENTS: Record<string, Enchantment> = {
  'None': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Fleeting': { power: 0, crit: 0, critMod: 0, hit: 3, weight: -5, weightMod: 0.5 },
  'Blessed(Divine Sign)': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Mundane': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Runed': { power: 3, crit: 0, critMod: 0, hit: 0, weight: 3, weightMod: 1 },
  'Vorpal': { power: 0, crit: 3, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Gigantic': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Purity Edge': { power: 5, crit: 0, critMod: 0, hit: -5, weight: 0, weightMod: 1 },
  'Divine': { power: 5, crit: 0, critMod: 0, hit: 0, weight: 5, weightMod: 1 },
  'Arcane': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Reaper': { power: 0, crit: 5, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Rustic': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Mutation': { power: 0, crit: 0, critMod: 0, hit: -5, weight: 0, weightMod: 1 },
  'Fated': { power: 5, crit: 0, critMod: 0, hit: 0, weight: 5, weightMod: 1 },
  'Blessed': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Rebellion': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }
};

// Stat scaling definitions
const STAT_SCALING: Record<string, { str: number; wil: number; ski: number; cel: number; def: number; res: number; vit: number; fai: number; luc: number; gui: number; san: number }> = {
  'Sword': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Axe': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Spear': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Bow': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Gun': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 100, san: 0 },
  'Tome': { str: 0, wil: 100, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Staff': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Fist': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Dagger': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 100, san: 0 },
};

export default function WeaponCalculator({ stats }: WeaponCalculatorProps) {
  const [weaponType, setWeaponType] = useState('Sword');
  const [basePower, setBasePower] = useState(50);
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
  const [twoHanded, setTwoHanded] = useState(false);

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
  const [useCustomScaling, setUseCustomScaling] = useState(true);

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
    // Use custom scaling if enabled, otherwise use weapon type scaling
    // Note: Mutation does NOT change scaling - it only affects weapon behavior
    const scaling = useCustomScaling ? customScaling : (STAT_SCALING[weaponType] || STAT_SCALING['Sword']);
    
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
    const scaling = useCustomScaling ? customScaling : (STAT_SCALING[weaponType] || STAT_SCALING['Sword']);
    return Math.floor(stats.str * scaling.str / 100);
  };

  // Check if weapon has primary STR scaling (STR is the highest scaling stat)
  const hasPrimaryStrScaling = (): boolean => {
    const scaling = useCustomScaling ? customScaling : (STAT_SCALING[weaponType] || STAT_SCALING['Sword']);
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

  // Load default scaling when weapon type changes
  const handleWeaponTypeChange = (newType: string) => {
    setWeaponType(newType);
    // Always update custom scaling values when weapon type changes
    const defaultScaling = STAT_SCALING[newType] || STAT_SCALING['Sword'];
    setCustomScaling({ ...defaultScaling });
  };

  // Toggle custom scaling and load current weapon type scaling
  const handleToggleCustomScaling = (enabled: boolean) => {
    setUseCustomScaling(enabled);
    if (enabled && !customScaling.str && !customScaling.wil && !customScaling.ski) {
      // Initialize with current weapon type scaling if not already set
      const defaultScaling = STAT_SCALING[weaponType] || STAT_SCALING['Sword'];
      setCustomScaling({ ...defaultScaling });
    }
  };

  // Calculate total weapon stats
  const calculateWeaponStats = () => {
    const mat = MATERIALS[material] || MATERIALS['None'];
    const p1 = WEAPON_PART1[part1] || WEAPON_PART1['None'];
    const p2 = WEAPON_PART2[part2] || WEAPON_PART2['None'];
    const p3 = WEAPON_PART3[part3] || WEAPON_PART3['None'];
    const ench = ENCHANTMENTS[enchantment] || ENCHANTMENTS['None'];

    // Quality bonuses
    const powerBonus = powerQuality ? 3 : 0;
    const critBonus = critQuality ? 3 : 0;
    const hitBonus = hitQuality ? 3 : 0;
    
    // Weight modifications
    let weightBonus = 0;
    if (weightPlus && !weightMinus) weightBonus = 1;
    if (!weightPlus && weightMinus) weightBonus = -1;

    // Upgrade bonuses - each upgrade level adds +1 to Power, Crit, and Hit
    const upgradePowerBonus = upgradeLevel;
    const upgradeCritBonus = upgradeLevel;
    const upgradeHitBonus = upgradeLevel;

    // Calculate totals
    const totalPower = basePower + mat.power + p1.power + p2.power + p3.power + ench.power + powerBonus + upgradePowerBonus + calculateScaling();
    const weaponCritical = baseCrit + mat.crit + p1.crit + p2.crit + p3.crit + ench.crit + critBonus + upgradeCritBonus;
    const weaponAccuracy = baseHit + mat.hit + p1.hit + p2.hit + p3.hit + ench.hit + hitBonus + upgradeHitBonus;
    const totalWeight = Math.floor((baseWeight + mat.weight + p1.weight + p2.weight + p3.weight + ench.weight + weightBonus) * ench.weightMod);

    // Hit calculation (Skill * 2 + Weapon Accuracy)
    const finalHit = Math.floor(stats.ski * 2) + weaponAccuracy + '%';

    // Critical chance calculation (Weapon Critical + Skill/2 + Luck)
    // Primary STR scaling weapons get +0.4 crit per scaled STR point added to weapon crit
    const strScaledCrit = hasPrimaryStrScaling() ? Math.floor(calculateStrScaling() * 0.4) : 0;
    const weaponCritWithStr = weaponCritical + strScaledCrit;
    const finalCrit = weaponCritWithStr + Math.floor(stats.ski / 2) + Math.floor(stats.luc) + '%';

    // Critical damage multiplier (influenced by weapon type and GUI)
    // Base crit damage (default 100%), modified by enchantment and GUI
    const guiCritDamageBonus = Math.floor(stats.gui);
    const critDamageMod = baseCritDamage + guiCritDamageBonus + ench.critMod;

    // SWA calculation (Scaled Weapon Attack)
    // Note: Rarity does NOT affect damage in SL2
    const twoHandBonus = twoHanded ? Math.floor(totalPower * 0.25) : 0;
    const swa = totalPower + twoHandBonus;

    // Critical SWA calculation (SWA with critical damage multiplier applied)
    const critSwa = Math.floor(swa * (critDamageMod / 100));

    return {
      power: totalPower,
      weaponCritical: weaponCritWithStr,
      crit: finalCrit,
      weaponAccuracy,
      hit: finalHit,
      weight: totalWeight,
      critDamageMod,
      swa,
      critSwa
    };
  };

  const weaponStats = calculateWeaponStats();

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Weapon Calculator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Base Stats */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">Base Weapon Stats</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Weapon Type</label>
              <select
                value={weaponType}
                onChange={(e) => handleWeaponTypeChange(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              >
                {Object.keys(STAT_SCALING).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Power</label>
              <input
                type="number"
                value={basePower}
                onChange={(e) => setBasePower(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Critical</label>
              <input
                type="number"
                value={baseCrit}
                onChange={(e) => setBaseCrit(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Hit</label>
              <input
                type="number"
                value={baseHit}
                onChange={(e) => setBaseHit(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Weight</label>
              <input
                type="number"
                value={baseWeight}
                onChange={(e) => setBaseWeight(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Crit Damage (%)</label>
              <input
                type="number"
                value={baseCritDamage}
                onChange={(e) => setBaseCritDamage(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Material & Parts */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">Material & Parts</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Material</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              >
                {Object.keys(MATERIALS).map(mat => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Weapon Part 1 (Blade/Body)</label>
              <select
                value={part1}
                onChange={(e) => setPart1(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              >
                {Object.keys(WEAPON_PART1).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Weapon Part 2 (Handle/Grip)</label>
              <select
                value={part2}
                onChange={(e) => setPart2(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              >
                {Object.keys(WEAPON_PART2).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Weapon Part 3 (Tip/Pommel)</label>
              <select
                value={part3}
                onChange={(e) => setPart3(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              >
                {Object.keys(WEAPON_PART3).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Enchantment</label>
              <select
                value={enchantment}
                onChange={(e) => setEnchantment(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              >
                {Object.keys(ENCHANTMENTS).map(ench => (
                  <option key={ench} value={ench}>{ench}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modifiers */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-400">Modifiers</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Upgrade Level (+{upgradeLevel})</label>
              <input
                type="number"
                min="0"
                max="10"
                value={upgradeLevel}
                onChange={(e) => setUpgradeLevel(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rarity (*/10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={rarity}
                onChange={(e) => setRarity(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={powerQuality}
                  onChange={(e) => setPowerQuality(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Power Quality (+3)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={critQuality}
                  onChange={(e) => setCritQuality(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Critical Quality (+3)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hitQuality}
                  onChange={(e) => setHitQuality(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Hit Quality (+3)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={weightPlus}
                  onChange={(e) => {
                    setWeightPlus(e.target.checked);
                    if (e.target.checked) setWeightMinus(false);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Weight (+)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={weightMinus}
                  onChange={(e) => {
                    setWeightMinus(e.target.checked);
                    if (e.target.checked) setWeightPlus(false);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Weight (-)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={twoHanded}
                  onChange={(e) => setTwoHanded(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Two-Handed (WIP)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Stat Scaling */}
      <div className="mt-6 bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-cyan-400">Custom Stat Scaling</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useCustomScaling}
              onChange={(e) => handleToggleCustomScaling(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Enable Custom Scaling</span>
          </label>
        </div>

        {useCustomScaling && (
          <>
            <p className="text-sm text-gray-400 mb-3">
              Adjust the percentage each stat contributes to weapon power (default based on weapon type)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">STR (%)</label>
                <input
                  type="number"
                  value={customScaling.str}
                  onChange={(e) => setCustomScaling({ ...customScaling, str: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">WIL (%)</label>
                <input
                  type="number"
                  value={customScaling.wil}
                  onChange={(e) => setCustomScaling({ ...customScaling, wil: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SKI (%)</label>
                <input
                  type="number"
                  value={customScaling.ski}
                  onChange={(e) => setCustomScaling({ ...customScaling, ski: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">CEL (%)</label>
                <input
                  type="number"
                  value={customScaling.cel}
                  onChange={(e) => setCustomScaling({ ...customScaling, cel: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">DEF (%)</label>
                <input
                  type="number"
                  value={customScaling.def}
                  onChange={(e) => setCustomScaling({ ...customScaling, def: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">RES (%)</label>
                <input
                  type="number"
                  value={customScaling.res}
                  onChange={(e) => setCustomScaling({ ...customScaling, res: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">VIT (%)</label>
                <input
                  type="number"
                  value={customScaling.vit}
                  onChange={(e) => setCustomScaling({ ...customScaling, vit: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">FAI (%)</label>
                <input
                  type="number"
                  value={customScaling.fai}
                  onChange={(e) => setCustomScaling({ ...customScaling, fai: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">LUC (%)</label>
                <input
                  type="number"
                  value={customScaling.luc}
                  onChange={(e) => setCustomScaling({ ...customScaling, luc: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">GUI (%)</label>
                <input
                  type="number"
                  value={customScaling.gui}
                  onChange={(e) => setCustomScaling({ ...customScaling, gui: Number(e.target.value) })}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
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
          </>
        )}

        {!useCustomScaling && (
          <div className="text-sm text-gray-400">
            Using default {weaponType} scaling. Enable custom scaling to modify stat percentages.
          </div>
        )}
      </div>

      {/* Mutation Enchant Info */}
      {enchantment === 'Mutation' && (
        <div className="mt-6 bg-gradient-to-br from-purple-800 to-pink-800 p-4 rounded-lg border-2 border-purple-400">
          <h3 className="text-lg font-semibold mb-3 text-purple-200">
            🎲 Mutation Enchantment
          </h3>
          <p className="text-sm text-purple-300 mb-2">
            <strong>Effect:</strong> -5 Hit. Weapon type changes based on rarity (9*+ weapons not affected).
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

      {/* Stat Verification Section */}
      <div className="mt-6 bg-gray-700 p-4 rounded-lg">
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
          ℹ️ These stats include all bonuses from race, class, aptitude, legend extends, food, history, rising game, class passives, instinct, and dragon bonuses with diminishing returns applied.
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 bg-gradient-to-br from-purple-900 to-blue-900 p-6 rounded-lg">
        <h3 className="text-2xl font-bold mb-4 text-center">Final Weapon Stats</h3>
        
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
            {twoHanded && (
              <div>Two-Handed Bonus: <span className="text-white font-semibold">+{Math.floor((basePower + (MATERIALS[material]?.power || 0) + (WEAPON_PART1[part1]?.power || 0) + (WEAPON_PART2[part2]?.power || 0) + (WEAPON_PART3[part3]?.power || 0) + (ENCHANTMENTS[enchantment]?.power || 0) + (powerQuality ? 3 : 0) + calculateScaling()) * 0.25)}</span> Power (25%)</div>
            )}
            {enchantment === 'Mutation' && rarity < 9 && (
              <div className="col-span-full text-purple-300">
                Mutation Effect: Weapon functions as <span className="font-semibold">{getEffectiveWeaponType()}</span> (based on {rarity}* rarity)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
