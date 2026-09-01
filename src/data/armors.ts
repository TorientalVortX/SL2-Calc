import type { Armor } from '../types';
import armorData from './armors.json';

/**
 * The armor catalogue, keyed by name.
 *
 * `armors.json` groups items by armor type and leaves `type` off each record,
 * so the type is folded back in here as the groups are flattened.
 */
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
