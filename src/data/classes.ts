/**
 * Class data for SL2 Calculator
 * Contains class stats, passives, and weapon restrictions
 */

import type { ClassConfig, ClassHierarchy, ClassPassive } from '../types';

// Class hierarchy structure based on POE-style organization
export const CLASS_HIERARCHY: Record<string, ClassHierarchy> = {
  'Archer': {
    name: 'Archer',
    baseClass: true,
    subClasses: ['Arbalest', 'Magic Gunner', 'Ranger']
  },
  'Martial Artist': {
    name: 'Martial Artist',
    baseClass: true,
    subClasses: ['Monk', 'Verglas', 'Boxer', 'Shinobi']
  },
  'Curate': {
    name: 'Curate',
    baseClass: true,
    subClasses: ['Lantern Bearer', 'Priest', 'Aquamancer', 'Druid']
  },
  'Duelist': {
    name: 'Duelist',
    baseClass: true,
    subClasses: ['Ghost', 'Kensei', 'Firebird']
  },
  'Mage': {
    name: 'Mage',
    baseClass: true,
    subClasses: ['Evoker', 'Hexer', 'Rune Magician', 'Ruler']
  },
  'Bard': {
    name: 'Bard',
    baseClass: true,
    subClasses: ['Dancer', 'Performer', 'Dark Bard']
  },
  'Rogue': {
    name: 'Rogue',
    baseClass: true,
    subClasses: ['Engineer', 'Void Assassin', 'Spellthief']
  },
  'Soldier': {
    name: 'Soldier',
    baseClass: true,
    subClasses: ['Black Knight', 'Tactician', 'Demon Hunter', 'Solblader']
  },
  'Summoner': {
    name: 'Summoner',
    baseClass: true,
    subClasses: ['Grand Summoner', 'Bonder', 'Shapeshifter']
  }
};

export const CLASSES: Record<string, ClassConfig> = {
  'Soldier': { str: 2, wil: 0, ski: 1, cel: 0, def: 0, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Duelist': { str: 1, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Daggers'] },
  'Mage': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Evoker': { str: 0, wil: 3, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Priest': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 3, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Monk': { str: 1, wil: 0, ski: 2, cel: 2, def: 2, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Ghost': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Daggers'] },
  'Bonder': { str: 2, wil: 2, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Kensei': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Swords'] },
  'Arbalest': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 1, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Bows', 'Guns'] },
  'Hexer': { str: 0, wil: 1, ski: 1, cel: 0, def: 3, res: 3, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Black Knight': { str: 2, wil: 0, ski: 1, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Tactician': { str: 1, wil: 1, ski: 2, cel: 2, def: 1, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Demon Hunter': { str: 2, wil: 0, ski: 2, cel: 2, def: 2, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Curate': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Engineer': { str: 2, wil: 0, ski: 1, cel: 2, def: 1, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Guns'] },
  'Bard': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 2, apt: 0, validWeapons: ['Daggers', 'Swords', 'Axes'] },
  'Performer': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 3, apt: 0, validWeapons: ['Daggers', 'Axes', 'Swords', 'Tomes'] },
  'Dancer': { str: 1, wil: 2, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Axes', 'Swords', 'Guns'] },
  'Dark Bard': { str: 2, wil: 0, ski: 0, cel: 0, def: 0, res: 2, vit: 1, fai: 0, luc: 0, gui: 0, san: 3, apt: 0, validWeapons: ['Daggers', 'Axes', 'Swords', 'Tomes'] },
  'Verglas': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Summoner': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Grand Summoner': { str: 0, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Boxer': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Rogue': { str: 0, wil: 0, ski: 1, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers'] },
  'Archer': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Bows', 'Guns'] },
  'Martial Artist': { str: 2, wil: 0, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Firebird': { str: 2, wil: 0, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Daggers'] },
  'Aquamancer': { str: 0, wil: 1, ski: 0, cel: 2, def: 0, res: 0, vit: 3, fai: 2, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Druid': { str: 0, wil: 0, ski: 0, cel: 2, def: 2, res: 0, vit: 0, fai: 2, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Shapeshifter': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Lantern Bearer': { str: 0, wil: 2, ski: 0, cel: 2, def: 1, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Spellthief': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers'] },
  'Magic Gunner': { str: 0, wil: 2, ski: 3, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Guns'] },
  'Ranger': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 2, apt: 0, validWeapons: ['Daggers', 'Bows'] },
  'Ruler': { str: 0, wil: 2, ski: 0, cel: 0, def: 0, res: 2, vit: 0, fai: 0, luc: 2, gui: 0, san: 2, apt: 0, validWeapons: ['Tomes'] },
  'Rune Magician': { str: 0, wil: 3, ski: 2, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 3, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Shinobi': { str: 2, wil: 0, ski: 0, cel: 4, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 2, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Solblader': { str: 2, wil: 2, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Void Assassin': { str: 0, wil: 0, ski: 3, cel: 2, def: 0, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers'] }
};

export const CLASS_PASSIVES: Record<string, ClassPassive> = {
  'Arbalest': { maxRank: 6, stats: { ski: 1 }, description: '+SKI per rank' },
  'Bard': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
  'Black Knight': { maxRank: 6, stats: { def: 1 }, description: '+DEF per rank' },
  'Bonder': { maxRank: 3, stats: { wil: 1, fai: 1 }, description: '+WIL/FAI per rank' },
  'Dark Bard': { maxRank: 3, stats: { san: 1 }, description: '+STR/SAN at rank 7+' },
  'Engineer': { maxRank: 6, stats: { gui: 1 }, description: '+GUI per rank' },
  'Evoker': { maxRank: 6, stats: { wil: 1 }, description: '+WIL per rank' },
  'Ghost': { maxRank: 5, stats: { res: 1 }, description: '+RES per rank' },
  'Hexer': { maxRank: 3, stats: { def: 1, res: 1 }, description: '+DEF/RES per rank' },
  'Kensei': { maxRank: 3, stats: { str: 1, ski: 1 }, description: '+STR/SKI per rank' },
  'Lantern Bearer': { maxRank: 6, stats: { res: 1 }, description: '+RES per rank' },
  'Magic Gunner': { maxRank: 3, stats: { cel: 1, res: 1 }, description: '+CEL/RES per rank' },
  'Monk': { maxRank: 3, stats: { ski: 1, cel: 1 }, description: '+SKI/CEL per rank' },
  'Priest': { maxRank: 6, stats: { fai: 1 }, description: '+FAI per rank' },
  'Solblader': { maxRank: 3, stats: { fai: 1, gui: 1 }, description: '+FAI/GUI per rank' },
  'Tactician': { maxRank: 3, stats: { wil: 1, gui: 1 }, description: '+WIL/GUI per rank' },
  'Void Assassin': { maxRank: 3, stats: { ski: 1, res: 1 }, description: '+SKI/RES per rank' }
};
