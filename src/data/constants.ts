/**
 * General constants for SL2 Calculator
 */

export const MAX_POINTS = 240;
export const APTITUDE_NUMBER = 6;


// Template builds based on stat optimization notes
export const TEMPLATE_BUILDS = {
  'soldier': {
    name: 'Human Soldier',
    description: 'Basic physical fighter build. High STR for weapon damage, good defenses, and survivability.',
    stats: { str: 58, wil: 0, ski: 54, cel: 0, def: 20, res: 15, vit: 40, fai: 0, luc: 17, gui: 0, san: 0, apt: 36 },
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Soldier',
    subClass: 'Soldier',
    selectedMainBaseClass: 'Soldier',
    selectedSubBaseClass: 'Soldier',
    history: 'Warrior',
    reasoning: 'STR for weapon scaling, SKI for accuracy, balanced defenses, VIT for HP. Warrior history provides +2 STR, +1 SKI as invested points.'
  },
  'mage': {
    name: 'Human Mage',
    description: 'Basic magical caster build. High WIL for FP and spell power, focus on elemental damage.',
    stats: { str: 0, wil: 58, ski: 55, cel: 0, def: 15, res: 20, vit: 40, fai: 16, luc: 0, gui: 0, san: 0, apt: 36 },
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Mage',
    subClass: 'Mage',
    selectedMainBaseClass: 'Mage',
    selectedSubBaseClass: 'Mage',
    history: 'Magician',
    reasoning: 'WIL for FP and elemental damage, SKI for accuracy, RES for magical defense. Magician history provides +2 WIL, +1 CEL as invested points.'
  },
  'rogue': {
    name: 'Human Rogue',
    description: 'Basic agility build. Focus on critical hits, evasion, and finesse weapons like daggers.',
    stats: { str: 0, wil: 0, ski: 53, cel: 35, def: 10, res: 10, vit: 40, fai: 0, luc: 44, gui: 12, san: 0, apt: 36 },
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Rogue',
    subClass: 'Rogue',
    selectedMainBaseClass: 'Rogue',
    selectedSubBaseClass: 'Rogue',
    history: 'Assassin',
    reasoning: 'CEL for evasion, LUC for critical chance, GUI for critical damage, SKI for accuracy. Assassin history provides +2 SKI, +1 LUC as invested points.'
  }
};