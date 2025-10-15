/**
 * SL2 Weapon Calculator
 * Port of the C# WeaponCalculator with materials, parts, enchantments, and stat scaling
 */

import { useState, useEffect } from 'react';
import { WEAPONS } from './data/weapons';
import { Weapon } from './types';

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

// Material categories for organized dropdown
const MATERIAL_CATEGORIES = {
  'Basic': ['None'],
  'Hard Materials': [
    'Accursed Remains', 'Arctic Gold', 'Aureate', 'Boulder', 'Carapace', 'Clawice', 
    'Conduiz', 'Coral', 'Dragon Remains', 'Etherium', 'Fireblood Remains', 'Fish Remains', 
    'Folded Steel', 'Fossil', 'Gasprock', 'Gorgon Remains', 'Gravestone', 'Iceblood Remains', 
    'Insect Remains', 'Iron Ore', 'Kraboid Remains', 'Meteorite', 'Nerif\'s Blood', 
    'Orichalum', 'Planetarium', 'Rockdirt', 'Sandstone', 'Shark Remains', 'Slipheed\'s Curse', 
    'Snakeman Remains', 'Spatial Remains', 'Thinsteel'
  ],
  'Wood Materials': [
    'Ash Wood', 'Coldbark', 'Devilbark', 'Etherbark', 'Firebark', 'Fungusbark', 
    'Hollow Log', 'Ivorybark', 'Loyrwell Rotwood', 'Markedbark', 'Mossybark', 
    'Nightflower', 'Oribark', 'Petrified Wood', 'Rainbowbark', 'Scorched Wood', 
    'Seedbark', 'Smoothbark', 'Windbark'
  ],
  'Page Materials': [
    'Aquarian Page', 'Ashen Page', 'Beast Page', 'Fine Art', 'Foamy Page', 
    'Heretic Page', 'Isesip Page', 'Mercalan Page', 'Moldy Page', 'Nerifian Page', 
    'Orichal Page', 'Paper', 'Sandy Page', 'Sheet Music', 'Star Page', 'Storm Page', 
    'Sylphid Page', 'Thin Page'
  ]
};

// Material definitions organized by category
const MATERIALS: Record<string, Material> = {
  // Basic
  'None': { power: 0, crit: 0, hit: 0, weight: 0 },

  // Hard Materials (Ores and Remains)
  'Accursed Remains': { power: 0, crit: 6, hit: 0, weight: 8 },
  'Arctic Gold': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Aureate': { power: -2, crit: -5, hit: 0, weight: 6 },
  'Boulder': { power: 10, crit: 10, hit: -5, weight: 25 },
  'Carapace': { power: 2, crit: 0, hit: 0, weight: 5 },
  'Clawice': { power: 1, crit: 3, hit: 3, weight: 5 },
  'Conduiz': { power: 0, crit: 3, hit: 0, weight: 0 },
  'Coral': { power: 1, crit: 3, hit: 3, weight: 1 },
  'Dragon Remains': { power: 3, crit: 5, hit: 5, weight: 8 },
  'Etherium': { power: 0, crit: 0, hit: 0, weight: 0 }, // Special: Self-repairing
  'Fireblood Remains': { power: 8, crit: 0, hit: 0, weight: 8 },
  'Fish Remains': { power: 3, crit: 0, hit: 3, weight: 8 },
  'Folded Steel': { power: 2, crit: 5, hit: 0, weight: 0 },
  'Fossil': { power: 5, crit: -5, hit: 0, weight: 6 },
  'Gasprock': { power: 2, crit: 0, hit: 3, weight: 5 },
  'Gorgon Remains': { power: 0, crit: 0, hit: 8, weight: 8 },
  'Gravestone': { power: 2, crit: -5, hit: 0, weight: 3 },
  'Iceblood Remains': { power: 0, crit: 8, hit: 0, weight: 8 },
  'Insect Remains': { power: 0, crit: 3, hit: 3, weight: 8 },
  'Iron Ore': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Kraboid Remains': { power: 0, crit: 0, hit: 6, weight: 8 },
  'Meteorite': { power: 5, crit: 0, hit: 0, weight: 8 },
  'Nerif\'s Blood': { power: 2, crit: -5, hit: 0, weight: 0 },
  'Orichalum': { power: -1, crit: -1, hit: -1, weight: 2 },
  'Planetarium': { power: 1, crit: 2, hit: 2, weight: -2 },
  'Rockdirt': { power: 1, crit: 4, hit: 2, weight: 4 },
  'Sandstone': { power: -2, crit: 5, hit: 0, weight: 3 },
  'Shark Remains': { power: 6, crit: 0, hit: 0, weight: 8 },
  'Slipheed\'s Curse': { power: -2, crit: 0, hit: 5, weight: -5 },
  'Snakeman Remains': { power: 0, crit: 8, hit: 0, weight: 8 },
  'Spatial Remains': { power: 3, crit: 3, hit: 0, weight: 8 },
  'Thinsteel': { power: -3, crit: 3, hit: 5, weight: -2 },

  // Wood Materials
  'Ash Wood': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Coldbark': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Devilbark': { power: 2, crit: 0, hit: 0, weight: 5 },
  'Etherbark': { power: 0, crit: 0, hit: 0, weight: 0 }, // Special: Self-repairing
  'Firebark': { power: 2, crit: -5, hit: 0, weight: 0 },
  'Fungusbark': { power: 2, crit: 0, hit: 0, weight: 2 },
  'Hollow Log': { power: 10, crit: 10, hit: -5, weight: 25 },
  'Ivorybark': { power: -2, crit: -5, hit: 0, weight: 6 },
  'Loyrwell Rotwood': { power: 0, crit: 0, hit: 3, weight: 0 },
  'Markedbark': { power: 0, crit: 4, hit: 4, weight: 4 },
  'Mossybark': { power: 3, crit: -3, hit: 3, weight: 3 },
  'Nightflower': { power: 0, crit: 0, hit: -5, weight: 0 },
  'Oribark': { power: -1, crit: -1, hit: -1, weight: 2 },
  'Petrified Wood': { power: 5, crit: 0, hit: 0, weight: 6 },
  'Rainbowbark': { power: 3, crit: 3, hit: 3, weight: 0 },
  'Scorched Wood': { power: 2, crit: 3, hit: 3, weight: 6 },
  'Seedbark': { power: 4, crit: -3, hit: 2, weight: 4 },
  'Smoothbark': { power: 3, crit: 3, hit: 0, weight: 2 },
  'Windbark': { power: -2, crit: 0, hit: 5, weight: -2 },

  // Page Materials
  'Aquarian Page': { power: 3, crit: 0, hit: 3, weight: 2 },
  'Ashen Page': { power: 2, crit: 0, hit: 3, weight: 6 },
  'Beast Page': { power: 3, crit: 3, hit: 3, weight: 8 },
  'Fine Art': { power: -2, crit: -5, hit: 0, weight: 6 },
  'Foamy Page': { power: 1, crit: 0, hit: 5, weight: 6 },
  'Heretic Page': { power: 5, crit: 0, hit: 0, weight: 5 },
  'Isesip Page': { power: 2, crit: 2, hit: 2, weight: 2 },
  'Mercalan Page': { power: 0, crit: 0, hit: 5, weight: 5 },
  'Moldy Page': { power: 2, crit: 0, hit: 0, weight: 3 },
  'Nerifian Page': { power: 3, crit: 3, hit: 0, weight: 2 },
  'Orichal Page': { power: -1, crit: -1, hit: -1, weight: 2 },
  'Paper': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Sandy Page': { power: 2, crit: 0, hit: 3, weight: 6 },
  'Sheet Music': { power: 1, crit: 2, hit: 3, weight: 4 },
  'Star Page': { power: 1, crit: 5, hit: 0, weight: 6 },
  'Storm Page': { power: 0, crit: 5, hit: 0, weight: 5 },
  'Sylphid Page': { power: 0, crit: 3, hit: 3, weight: 2 },
  'Thin Page': { power: -2, crit: 3, hit: 0, weight: -6 }
};

// Weapon Part Categories for organized dropdowns
const WEAPON_PART_CATEGORIES = {
  'Basic': ['None'],
  'Blades': [
    'Standard Blade', 'Serrated Blade', 'Razor Blade', 'Balanced Blade', 'Piercing Blade', 'Huge Blade'
  ],
  'Guards': [
    'Standard Guard', 'Sturdy Guard', 'Full Guard', 'Empty Guard', 'Razor Guard', 'Locking Guard'
  ],
  'Hilts': [
    'Standard Hilt', 'Firm Hilt', 'Sharp Hilt', 'Onigan Hilt', 'Insulated Hilt', 'Wooden Hilt'
  ],
  'Spearheads': [
    'Standard Spearhead', 'Barbed Spearhead', 'Crescent Spearhead', 'Hollow Spearhead', 'Thin Spearhead', 'Hooked Spearhead'
  ],
  'Axeheads': [
    'Standard Axehead', 'Tempered Axehead', 'Guillotine Axehead', 'Cutting Axehead', 'Curved Axehead', 'Spiked Axehead'
  ],
  'Poles': [
    'Standard Pole', 'Wooden Pole', 'Helix Pole', 'Curved Pole', 'Flexible Pole', 'Extended Pole'
  ],
  'Knuckles': [
    'Standard Knuckles', 'Dense Knuckles', 'Elongated Knuckles', 'Leather Knuckles', 'Wrapped Knuckles', 'Spiked Knuckles'
  ],
  'Wrists': [
    'Standard Wrist', 'Wrist Guard', 'Spiked Wrist', 'Wrist Strings', 'Loose Wrist', 'Weighted Wrist'
  ],
  'Bow Bodies': [
    'Standard Body', 'Thin Body', 'Compact Body', 'Short Body', 'Focused Body', 'Large Body', 'Composite Body'
  ],
  'Strings': [
    'Standard String', 'Wire String', 'Silk String', 'Tight String', 'Double String', 'Chain String'
  ],
  'Arrows': [
    'Standard Arrows', 'Sharp Arrows', 'Fire Arrows', 'Light Arrows', 'Thin Arrows', 'Heavy Arrows'
  ],
  'Barrels': [
    'Standard Barrel', 'Short Barrel', 'Wide Barrel', 'Long Barrel', 'Double Barrel', 'Sniper Barrel'
  ],
  'Grips': [
    'Standard Grip', 'Soft Grip', 'Steady Grip', 'Revolver Grip', 'Extended Grip', 'Custom Grip'
  ],
  'Bullets': [
    'Standard Bullets', 'Aerodynamic Bullets', 'Piercing Bullets', 'Hellhound Bullets', 'Scatter Bullets', 'Silver Bullets'
  ],
  'Covers': [
    'Standard Cover', 'Hardback Cover', 'Thin Cover', 'Blank Cover', 'Hellish Eye', 'Diary Lock'
  ],
  'Binds': [
    'Standard Binds', 'Leather Binds', 'Metal Binds', 'Magic Binds', 'Bone Binds', 'Long Binds'
  ]
};

// Weapon Part 1 definitions - All weapon parts available
const WEAPON_PART1: Record<string, WeaponPart> = {
  // Basic
  'None': { power: 0, crit: 0, hit: 0, weight: 0 },

  // Blades
  'Standard Blade': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Serrated Blade': { power: -1, crit: 0, hit: 0, weight: 0 },
  'Razor Blade': { power: 0, crit: 10, hit: 0, weight: 0 },
  'Balanced Blade': { power: 0, crit: 0, hit: 3, weight: 1 },
  'Piercing Blade': { power: 2, crit: -5, hit: -5, weight: 0 },
  'Huge Blade': { power: 5, crit: -10, hit: -10, weight: 10 },

  // Guards
  'Standard Guard': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Sturdy Guard': { power: 0, crit: 0, hit: 3, weight: 1 },
  'Full Guard': { power: 0, crit: 0, hit: 0, weight: 4 },
  'Empty Guard': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Razor Guard': { power: 1, crit: 0, hit: 0, weight: 1 },
  'Locking Guard': { power: 0, crit: 0, hit: 0, weight: 1 },

  // Hilts
  'Standard Hilt': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Firm Hilt': { power: 0, crit: 0, hit: 3, weight: 0 },
  'Sharp Hilt': { power: 1, crit: 0, hit: -5, weight: 0 },
  'Onigan Hilt': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Insulated Hilt': { power: -1, crit: 0, hit: 0, weight: 0 },
  'Wooden Hilt': { power: 0, crit: 0, hit: 0, weight: -3 },

  // Spearheads
  'Standard Spearhead': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Barbed Spearhead': { power: 1, crit: 5, hit: 0, weight: 2 },
  'Crescent Spearhead': { power: 0, crit: -5, hit: 5, weight: 0 },
  'Hollow Spearhead': { power: -2, crit: 0, hit: 0, weight: -5 },
  'Thin Spearhead': { power: 2, crit: 0, hit: -5, weight: -2 },
  'Hooked Spearhead': { power: 1, crit: -5, hit: 0, weight: 0 },

  // Axeheads
  'Standard Axehead': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Tempered Axehead': { power: -1, crit: 0, hit: 0, weight: 0 },
  'Guillotine Axehead': { power: 3, crit: 0, hit: -5, weight: 1 },
  'Cutting Axehead': { power: -1, crit: 10, hit: -5, weight: 0 },
  'Curved Axehead': { power: -1, crit: 0, hit: 5, weight: 0 },
  'Spiked Axehead': { power: 2, crit: 0, hit: 0, weight: 0 },

  // Poles
  'Standard Pole': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wooden Pole': { power: 0, crit: 0, hit: 0, weight: -5 },
  'Helix Pole': { power: 1, crit: 0, hit: -4, weight: 2 },
  'Curved Pole': { power: -1, crit: 5, hit: 0, weight: 0 },
  'Flexible Pole': { power: 0, crit: 0, hit: -5, weight: 0 },
  'Extended Pole': { power: -1, crit: 0, hit: 5, weight: 0 },

  // Knuckles
  'Standard Knuckles': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Dense Knuckles': { power: 2, crit: 0, hit: 0, weight: 0 },
  'Elongated Knuckles': { power: 0, crit: 8, hit: 0, weight: 4 },
  'Leather Knuckles': { power: -2, crit: 0, hit: 5, weight: 0 },
  'Wrapped Knuckles': { power: 0, crit: -4, hit: 0, weight: 0 },
  'Spiked Knuckles': { power: 1, crit: 0, hit: -4, weight: 0 },

  // Wrists
  'Standard Wrist': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wrist Guard': { power: 0, crit: 0, hit: 0, weight: 2 },
  'Spiked Wrist': { power: 1, crit: 0, hit: 0, weight: 2 },
  'Wrist Strings': { power: 0, crit: 0, hit: 4, weight: 0 },
  'Loose Wrist': { power: 0, crit: 0, hit: -6, weight: 0 },
  'Weighted Wrist': { power: 0, crit: 10, hit: -5, weight: 8 },

  // Bow Bodies
  'Standard Body': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Thin Body': { power: -1, crit: 0, hit: 0, weight: -4 },
  'Compact Body': { power: 0, crit: 15, hit: 0, weight: -4 },
  'Short Body': { power: 0, crit: 3, hit: 0, weight: -4 },
  'Focused Body': { power: 0, crit: 0, hit: 5, weight: 0 },
  'Large Body': { power: 0, crit: 0, hit: 0, weight: 6 },
  'Composite Body': { power: 2, crit: -5, hit: 0, weight: 0 },

  // Strings
  'Standard String': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Wire String': { power: 1, crit: 0, hit: 0, weight: 0 },
  'Silk String': { power: -2, crit: 0, hit: 5, weight: 0 },
  'Tight String': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Double String': { power: 0, crit: -5, hit: 0, weight: 0 },
  'Chain String': { power: 2, crit: 0, hit: 0, weight: 10 },

  // Arrows
  'Standard Arrows': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Sharp Arrows': { power: 0, crit: 10, hit: -5, weight: 0 },
  'Fire Arrows': { power: 1, crit: -5, hit: 0, weight: 0 },
  'Light Arrows': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Thin Arrows': { power: -1, crit: 0, hit: 5, weight: 0 },
  'Heavy Arrows': { power: 2, crit: 0, hit: -5, weight: 5 },

  // Barrels
  'Standard Barrel': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Short Barrel': { power: 5, crit: 0, hit: 0, weight: 0 },
  'Wide Barrel': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Long Barrel': { power: 0, crit: -5, hit: 0, weight: 0 },
  'Double Barrel': { power: 0, crit: 0, hit: 5, weight: 3 },
  'Sniper Barrel': { power: 0, crit: 15, hit: 0, weight: 8 },

  // Grips
  'Standard Grip': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Soft Grip': { power: -1, crit: 0, hit: 0, weight: 0 },
  'Steady Grip': { power: 0, crit: -5, hit: 5, weight: 0 },
  'Revolver Grip': { power: -2, crit: 5, hit: 0, weight: 0 },
  'Extended Grip': { power: 0, crit: 0, hit: 0, weight: 2 },
  'Custom Grip': { power: 0, crit: 3, hit: 3, weight: 0 },

  // Bullets
  'Standard Bullets': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Aerodynamic Bullets': { power: 0, crit: -5, hit: 5, weight: 0 },
  'Piercing Bullets': { power: 5, crit: -5, hit: 0, weight: 0 },
  'Hellhound Bullets': { power: 0, crit: 5, hit: -5, weight: 0 },
  'Scatter Bullets': { power: -2, crit: 0, hit: 5, weight: 0 },
  'Silver Bullets': { power: 0, crit: 0, hit: -5, weight: 0 },

  // Covers
  'Standard Cover': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Hardback Cover': { power: 2, crit: 0, hit: 0, weight: 3 },
  'Thin Cover': { power: 0, crit: 0, hit: 0, weight: -5 },
  'Blank Cover': { power: -2, crit: 5, hit: 0, weight: 0 },
  'Hellish Eye': { power: 0, crit: -5, hit: 3, weight: 5 },
  'Diary Lock': { power: 0, crit: 3, hit: -3, weight: 5 },

  // Binds
  'Standard Binds': { power: 0, crit: 0, hit: 0, weight: 0 },
  'Leather Binds': { power: -2, crit: 0, hit: 3, weight: -3 },
  'Metal Binds': { power: 3, crit: 0, hit: 0, weight: 3 },
  'Magic Binds': { power: 0, crit: 0, hit: -3, weight: -8 },
  'Bone Binds': { power: 0, crit: 5, hit: 0, weight: 3 },
  'Long Binds': { power: 0, crit: 0, hit: 0, weight: 5 }
};

// Weapon Part 2 definitions - Same as Part 1 for flexibility
const WEAPON_PART2: Record<string, WeaponPart> = {
  ...WEAPON_PART1
};

// Weapon Part 3 definitions - Same as Part 1 for flexibility  
const WEAPON_PART3: Record<string, WeaponPart> = {
  ...WEAPON_PART1
};

// Enchantment definitions
const ENCHANTMENTS: Record<string, Enchantment> = {
  'None': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 },
  'Feather': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 0.5 }, // Weapon weight is halved
  'Jeweled': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +2 FAI, +3 Light ATK (not calculated here)
  'Exorcism': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +2 FAI, +2 SAN, anti-undead damage
  'Avalon': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // HP regen based on Chivalry
  'Fated': { power: 3, crit: 3, critMod: 0, hit: 3, weight: 3, weightMod: 1 }, // All weapon parameters +3
  'Rampaging': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Defense reduction on hit
  'Gigantic': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1.5 }, // +1 Range, -10 Evade, +50% Weight (min 2)
  'Bloodhunt': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +1 Hit per 4% missing target HP
  'Mutation': { power: 0, crit: 0, critMod: 0, hit: -5, weight: 0, weightMod: 1.25 }, // -5 Hit, weapon type changes, +25% Weight
  'Volcanic': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Fire AOE on crit
  'Runed': { power: 2, crit: 2, critMod: 0, hit: 2, weight: -2, weightMod: 1 }, // +2 Power/Crit/Hit, -2 Weight, casting tool
  'Mundane': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Removes scaling tags
  'Arcane': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Spelledge weapon, Alterated tag (-10% scaling)
  'Blessed': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +Hit vs undead based on FAI
  'Reaper': { power: 5, crit: 5, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +5 Power, +5 Critical
  'Rebellion': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +1.5 Power/-1.5 Hit per rarity below 9
  'Bloodtaking': { power: -5, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // -5 Power, life drain effect
  'Envenomed': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Alterated tag, poison on hit
  'Enflamed': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Alterated tag, fire damage on hit
  'Divine': { power: 2, crit: 5, critMod: 0, hit: 5, weight: -2, weightMod: 1 }, // +2 Power, +5 Crit/Hit, -2 Weight, unbreakable
  'Vorpal': { power: 0, crit: 10, critMod: 5, hit: 0, weight: 0, weightMod: 1 }, // +10 Weapon Crit, +5% Crit Damage, 5% vorpal strike
  'Melting': { power: 0, crit: 0, critMod: 0, hit: 5, weight: 0, weightMod: 1 }, // +5 Hit in 1 range, durability effects
  'Haunted': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // -2 WIL, fear chance, possessed race
  'Haunted Soul': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Fear on hit, -25% status resist
  'Blood Drenched': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Attracts monsters
  'Demonic': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +3 STR, -10% status resist
  'Tainted': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Same as Demonic
  'Misplaced': { power: 2, crit: 2, critMod: 0, hit: 2, weight: 2, weightMod: 1 }, // All parameters +2, can be dropped
  'Fleeting': { power: 2, crit: 2, critMod: 0, hit: 2, weight: 2, weightMod: 1 }, // Same as Misplaced
  'Parasitic': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Crit: -5 HP, +3 durability
  'Rustic': { power: 5, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +5 Power, max durability 4
  'Evolving': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // +10% EXP, battle power boost
  // Legacy entries for backward compatibility
  'Blessed(Divine Sign)': { power: 0, crit: 0, critMod: 0, hit: 0, weight: 0, weightMod: 1 }, // Same as Blessed
  'Purity Edge': { power: 5, crit: 0, critMod: 0, hit: -5, weight: 0, weightMod: 1 } // Custom enchant (keeping for compatibility)
};

// Stat scaling definitions (based on SL2 weapon mechanics)
const STAT_SCALING: Record<string, { str: number; wil: number; ski: number; cel: number; def: number; res: number; vit: number; fai: number; luc: number; gui: number; san: number }> = {
  'Sword': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Axe': { str: 120, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Polearm': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Bow': { str: 80, wil: 0, ski: 20, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Gun': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 100, san: 0 },
  'Tome': { str: 0, wil: 100, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Staff': { str: 80, wil: 20, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Fist': { str: 100, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Dagger': { str: 50, wil: 0, ski: 0, cel: 50, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
};

export default function WeaponCalculator({ stats }: WeaponCalculatorProps) {
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

    // Quality bonuses
    const powerBonus = powerQuality ? 2 : 0;
    const critBonus = critQuality ? 4 : 0;
    const hitBonus = hitQuality ? 4 : 0;
    
    // Sentimentality bonuses (+10 Max Durability, +2 Power, +2 Critical, +2 Hit)
    const sentimentalityPowerBonus = sentimentality ? 2 : 0;
    const sentimentalityCritBonus = sentimentality ? 2 : 0;
    const sentimentalityHitBonus = sentimentality ? 2 : 0;
    
    // Weight modifications
    let weightBonus = 0;
    if (weightPlus && !weightMinus) weightBonus = 2;
    if (!weightPlus && weightMinus) weightBonus = -2;

    // Upgrade bonuses - each upgrade level adds +1 to Power, Crit, and Hit
    const upgradePowerBonus = upgradeLevel;
    const upgradeCritBonus = upgradeLevel;
    const upgradeHitBonus = upgradeLevel;

    // Special enchantment bonuses
    const enchBonus = calculateEnchantmentBonus();

    // Calculate base totals before Two-Handed skill
    const baseTotalPower = basePower + mat.power + p1.power + p2.power + p3.power + ench.power + powerBonus + sentimentalityPowerBonus + upgradePowerBonus + enchBonus.bonusPower + calculateScaling();
    const weaponCritical = baseCrit + mat.crit + p1.crit + p2.crit + p3.crit + ench.crit + critBonus + sentimentalityCritBonus + upgradeCritBonus;
    const baseWeaponAccuracy = baseHit + mat.hit + p1.hit + p2.hit + p3.hit + ench.hit + hitBonus + sentimentalityHitBonus + upgradeHitBonus + enchBonus.bonusHit;
    
    // Calculate weight with special handling for Gigantic enchantment
    let totalWeight = Math.floor((baseWeight + mat.weight + p1.weight + p2.weight + p3.weight + ench.weight + weightBonus) * ench.weightMod);
    
    // Gigantic enchantment: minimum weight of 2 after all calculations
    if (enchantment === 'Gigantic' && totalWeight < 2) {
      totalWeight = 2;
    }

    // Two-Handed skill bonuses
    let twoHandedPowerBonus = 0;
    let twoHandedHitBonus = 0;
    
    if (twoHandedSkillRank > 0) {
      const effectiveWeaponType = getEffectiveWeaponType();
      
      // For Swords, Axes, and Spears: +SR*2 SWA (doubled if weapon weight >= 20)
      if (['Sword', 'Axe', 'Spear'].includes(effectiveWeaponType)) {
        const baseBonus = twoHandedSkillRank * 2;
        twoHandedPowerBonus = totalWeight >= 20 ? baseBonus * 2 : baseBonus;
      }
      
      // For Gun weapons: +SR*2 Hit (doubled for Rifle subtype)
      if (effectiveWeaponType === 'Gun') {
        const baseBonus = twoHandedSkillRank * 2;
        // Note: We don't have rifle subtype detection, so treating all guns the same for now
        // In actual implementation, you'd need to check weapon name/subtype
        twoHandedHitBonus = baseBonus; // Could be doubled for rifles
      }
    }

    // Apply Two-Handed bonuses
    const totalPower = baseTotalPower + twoHandedPowerBonus;
    const weaponAccuracy = baseWeaponAccuracy + twoHandedHitBonus;

    // Hit calculation (Skill * 2 + Weapon Accuracy)
    const finalHit = Math.floor(stats.ski * 2) + weaponAccuracy + '%';

    // Critical chance calculation (Weapon Critical + Skill/2 + Luck)
    // Primary STR scaling weapons get +0.4 crit per STR point that contributes to weapon power
    // This applies to the STR scaling component only, not base STR
    const strScaledCrit = hasPrimaryStrScaling() ? Math.floor(calculateStrScaling() * 0.4) : 0;
    const weaponCritWithStr = weaponCritical + strScaledCrit;
    const finalCrit = weaponCritWithStr + Math.floor(stats.ski / 2) + Math.floor(stats.luc) + '%';

    // Critical damage multiplier (influenced by weapon type and GUI)
    // Base crit damage (default 100%), modified by enchantment and GUI
    const guiCritDamageBonus = Math.floor(stats.gui);
    const critDamageMod = baseCritDamage + guiCritDamageBonus + ench.critMod;

    // SWA calculation (Scaled Weapon Attack) - Two-Handed bonus is already included in totalPower
    const swa = totalPower;

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
      critSwa,
      twoHandedPowerBonus,
      twoHandedHitBonus
    };
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

    const powerBonus = powerQuality2 ? 2 : 0;
    const critBonus = critQuality2 ? 4 : 0;
    const hitBonus = hitQuality2 ? 4 : 0;
    
    // Sentimentality bonuses (+10 Max Durability, +2 Power, +2 Critical, +2 Hit)
    const sentimentalityPowerBonus = sentimentality2 ? 2 : 0;
    const sentimentalityCritBonus = sentimentality2 ? 2 : 0;
    const sentimentalityHitBonus = sentimentality2 ? 2 : 0;
    
    let weightBonus = 0;
    if (weightPlus2 && !weightMinus2) weightBonus = 1;
    if (!weightPlus2 && weightMinus2) weightBonus = -1;

    const upgradePowerBonus = upgradeLevel2;
    const upgradeCritBonus = upgradeLevel2;
    const upgradeHitBonus = upgradeLevel2;

    const enchBonus = calculateEnchantmentBonus2();

    const baseTotalPower = basePower2 + mat.power + p1.power + p2.power + p3.power + ench.power + powerBonus + sentimentalityPowerBonus + upgradePowerBonus + enchBonus.bonusPower + calculateScaling2();
    const weaponCritical = baseCrit2 + mat.crit + p1.crit + p2.crit + p3.crit + ench.crit + critBonus + sentimentalityCritBonus + upgradeCritBonus;
    const baseWeaponAccuracy = baseHit2 + mat.hit + p1.hit + p2.hit + p3.hit + ench.hit + hitBonus + sentimentalityHitBonus + upgradeHitBonus + enchBonus.bonusHit;
    
    let totalWeight = Math.floor((baseWeight2 + mat.weight + p1.weight + p2.weight + p3.weight + ench.weight + weightBonus) * ench.weightMod);
    
    if (enchantment2 === 'Gigantic' && totalWeight < 2) {
      totalWeight = 2;
    }

    let twoHandedPowerBonus = 0;
    let twoHandedHitBonus = 0;
    
    if (twoHandedSkillRank2 > 0) {
      const effectiveWeaponType = getEffectiveWeaponType2();
      
      if (['Sword', 'Axe', 'Spear'].includes(effectiveWeaponType)) {
        const baseBonus = twoHandedSkillRank2 * 2;
        twoHandedPowerBonus = totalWeight >= 20 ? baseBonus * 2 : baseBonus;
      }
      
      if (effectiveWeaponType === 'Gun') {
        const baseBonus = twoHandedSkillRank2 * 2;
        twoHandedHitBonus = baseBonus;
      }
    }

    const totalPower = baseTotalPower + twoHandedPowerBonus;
    const weaponAccuracy = baseWeaponAccuracy + twoHandedHitBonus;

    const finalHit = Math.floor(stats.ski * 2) + weaponAccuracy + '%';

    const strScaledCrit = hasPrimaryStrScaling2() ? Math.floor(calculateStrScaling2() * 0.4) : 0;
    const weaponCritWithStr = weaponCritical + strScaledCrit;
    const finalCrit = weaponCritWithStr + Math.floor(stats.ski / 2) + Math.floor(stats.luc) + '%';

    const guiCritDamageBonus = Math.floor(stats.gui);
    const critDamageMod = baseCritDamage2 + guiCritDamageBonus + ench.critMod;

    const swa = totalPower;
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
      critSwa,
      twoHandedPowerBonus,
      twoHandedHitBonus
    };
  };

  const weaponStats2 = calculateWeaponStats2();

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Weapon Calculator</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`px-4 py-2 rounded text-white font-medium transition-colors ${
              comparisonMode 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {comparisonMode ? '✓ Comparison Mode' : 'Compare Weapons'}
          </button>
          <button
            onClick={resetWeapon}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors"
          >
            Reset Weapon
          </button>
        </div>
      </div>

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
        <div className="mb-4 border border-blue-500 rounded p-3 bg-gray-800">
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
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                >
                  Clear
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Power: {selectedWeapon.power} | Accuracy: {selectedWeapon.accuracy}% | 
                Critical: {selectedWeapon.critical}% | Weight: {selectedWeapon.weight}
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
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
              />
              <select
                value={weaponTypeFilter}
                onChange={(e) => setWeaponTypeFilter(e.target.value)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
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
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
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
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
              >
                <option value="All">All ★</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                  <option key={r} value={r}>{r}★</option>
                ))}
              </select>
            </div>
          </div>

          {filteredWeapons.length > 0 && (
            <div className="max-h-48 overflow-y-auto bg-gray-900 rounded border border-gray-600">
              {filteredWeapons.slice(0, weaponSearchTerm ? 20 : 10).map((weapon) => (
                <div
                  key={weapon.name}
                  onClick={() => selectWeapon(weapon)}
                  className="p-2 border-b border-gray-600 hover:bg-gray-700 cursor-pointer"
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
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
              {Object.keys(ENCHANTMENTS).map(ench => (
                <option key={ench} value={ench}>{ench}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Upgrade Level</label>
            <input type="number" min="0" max="10" value={upgradeLevel}
              onChange={(e) => setUpgradeLevel(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Rarity</label>
            <input type="number" min="1" max="10" value={rarity}
              onChange={(e) => setRarity(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
              disabled={selectedWeapon !== null} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Two-Handed Rank</label>
            <input type="number" min="0" max="5" value={twoHandedSkillRank}
              onChange={(e) => setTwoHandedSkillRank(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
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
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm bg-gray-800 p-3 rounded">
            <div>
              <label className="block text-xs">Base Power</label>
              <input type="number" value={basePower} onChange={(e) => setBasePower(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-xs">Base Crit</label>
              <input type="number" value={baseCrit} onChange={(e) => setBaseCrit(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-xs">Base Hit</label>
              <input type="number" value={baseHit} onChange={(e) => setBaseHit(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-xs">Base Weight</label>
              <input type="number" value={baseWeight} onChange={(e) => setBaseWeight(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
            </div>
          </div>
        )}
      </div>

      {/* Custom Stat Scaling */}
      <div className="mt-6 bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-cyan-400">Custom Stat Scaling</h3>
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
      </div>

      {/* Weapon Details */}
      {selectedWeapon && (
        <div className="mt-6 bg-gradient-to-br from-blue-800 to-indigo-800 p-4 rounded-lg border-2 border-blue-400">
          <h3 className="text-lg font-semibold mb-3 text-blue-200">
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
        <div className="mt-6 bg-gradient-to-br from-purple-800 to-pink-800 p-4 rounded-lg border-2 border-purple-400">
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
        <div className="mt-6 bg-gradient-to-br from-red-800 to-orange-800 p-4 rounded-lg border-2 border-red-400">
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
        <div className="mt-6 bg-gradient-to-br from-gray-800 to-stone-800 p-4 rounded-lg border-2 border-gray-400">
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
        <div className="mt-6 bg-gradient-to-br from-purple-800 to-indigo-800 p-4 rounded-lg border-2 border-purple-400">
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
        <div className="mt-8 border-4 border-green-600 rounded-lg p-6 bg-gradient-to-br from-green-900 to-emerald-900">
          <h2 className="text-2xl font-bold mb-4 text-center text-green-300">Weapon 2 Configuration</h2>
          
          {/* Weapon 2 Selection */}
          <div className="mb-4 border border-green-500 rounded p-3 bg-gray-800">
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
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
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
                  className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                />
                <select
                  value={weaponTypeFilter2}
                  onChange={(e) => setWeaponTypeFilter2(e.target.value)}
                  className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
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
                  className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
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
                  className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                >
                  <option value="All">All ★</option>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>{r}★</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredWeapons2.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-gray-900 rounded border border-gray-600">
                {filteredWeapons2.slice(0, weaponSearchTerm2 ? 20 : 10).map((weapon) => (
                  <div
                    key={weapon.name}
                    onClick={() => selectWeapon2(weapon)}
                    className="p-2 border-b border-gray-600 hover:bg-gray-700 cursor-pointer"
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
                {Object.keys(ENCHANTMENTS).map(ench => (
                  <option key={ench} value={ench}>{ench}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Upgrade Level</label>
              <input type="number" min="0" max="10" value={upgradeLevel2}
                onChange={(e) => setUpgradeLevel2(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Rarity</label>
              <input type="number" min="1" max="10" value={rarity2}
                onChange={(e) => setRarity2(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                disabled={selectedWeapon2 !== null} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Two-Handed Rank</label>
              <input type="number" min="0" max="5" value={twoHandedSkillRank2}
                onChange={(e) => setTwoHandedSkillRank2(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1" />
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
         These stats include all bonuses from race, class, aptitude, etc.
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
        <div className="mt-8 border-t-4 border-purple-600 pt-6">
          <h2 className="text-3xl font-bold mb-6 text-center text-purple-400">Weapon Comparison</h2>
          
          {/* Comparison Stats Grid */}
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold mb-4">Final Stats Comparison</h3>
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
