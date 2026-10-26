import type { Armor } from '../types';
import armorData from './armors.json';

export const ARMORS: Record<string, Armor> = {};

Object.entries(armorData as Record<string, Omit<Armor, 'type'>[]>).forEach(([type, armors]) => {
  armors.forEach((armorJson) => {
    const armor: Armor = {
      id: armorJson.id,
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
