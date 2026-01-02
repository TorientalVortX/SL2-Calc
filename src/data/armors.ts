/**
 * Armor data loader for SL2 Calculator
 * Loads armor data from JSON file for easy updates
 */

import { Armor } from '../types';
import armorData from './armors.json';

// Convert JSON data to proper Armor objects
export const ARMORS: Record<string, Armor> = {};

// Process each armor type and convert to Armor objects
Object.entries(armorData).forEach(([type, armors]) => {
  armors.forEach((armorJson: any) => {
    const armor: Armor = {
      name: armorJson.name,
      armor: armorJson.armor,
      magicArmor: armorJson.magicArmor,
      evade: armorJson.evade,
      weight: armorJson.weight,
      type: type as 'Heavy' | 'Light' | 'Unarmored',
      details: armorJson.details,
      statBonuses: armorJson.statBonuses,
      resistances: armorJson.resistances,
      specialEffects: armorJson.specialEffects,
      conditionalBonuses: armorJson.conditionalBonuses,
      rarity: armorJson.rarity
    };
    ARMORS[armor.name] = armor;
  });
});

export const ARMOR_TYPES = ['Heavy', 'Light', 'Unarmored'] as const;

export const getArmorsByType = (type: string) => {
  return Object.values(ARMORS).filter(armor => armor.type === type);
};