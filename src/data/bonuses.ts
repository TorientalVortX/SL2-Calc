/**
 * Bonus data for SL2 Calculator
 * Contains food bonuses, history bonuses, legend extend options, and astrology
 */

import type { FoodBonus, HistoryBonus, LegendExtendConfig, StatKey } from '../types';
import { STAT_COLORS } from './colors';

export const FOODS: Record<string, FoodBonus> = {
  'None': { hp: 0, fp: 0, stats: {}, description: 'No food bonus' },
  'Salad': { hp: 0, fp: 0, stats: { vit: 3 }, description: 'Fresh vegetables' },
  'Potatoes & Carrots': { hp: 0, fp: 0, stats: { ski: 3 }, description: 'Hearty root vegetables' },
  'Fugu': { hp: 0, fp: 0, stats: { str: 3, wil: 3 }, description: 'Dangerous delicacy' },
  'Sushi': { hp: 0, fp: 0, stats: { str: 2, wil: 2 }, description: 'Fresh fish preparation' },
  'Pumpkin Lollipop': { hp: 0, fp: 0, stats: { cel: 5 }, description: 'Sweet seasonal treat' },
  'Redpop': { hp: 0, fp: 0, stats: { cel: 4 }, description: 'Energizing candy' },
  'Cocky': { hp: 0, fp: 0, stats: { cel: 3 }, description: 'Confidence-boosting snack' },
  'Kat Knip': { hp: 0, fp: 0, stats: { cel: 3 }, description: 'Feline-inspired treat' },
  'Androbar': { hp: 0, fp: 0, stats: { cel: 3 }, description: 'Android energy bar' },
  'Chocolate Bar': { hp: 0, fp: 0, stats: { cel: 2 }, description: 'Simple chocolate' },
  'Sweet Bites': { hp: 0, fp: 0, stats: { cel: 1 }, description: 'Small candy pieces' }
};

export const HISTORY: Record<string, HistoryBonus> = {
  'None': { stats: {}, description: 'No background bonus' },
  'Warrior': { stats: { str: 2, ski: 1 }, description: 'Combat-focused background' },
  'Hero': { stats: { str: 2, luc: 1 }, description: 'Heroic background' },
  'Magician': { stats: { wil: 2, cel: 1 }, description: 'Arcane studies' },
  'Spellblade': { stats: { str: 1, wil: 2 }, description: 'Magic warrior' },
  'Assassin': { stats: { ski: 2, luc: 1 }, description: 'Stealth specialist' },
  'Myrmdon': { stats: { ski: 2, cel: 1 }, description: 'Elite soldier' },
  'Fencer': { stats: { cel: 2, def: 1 }, description: 'Dueling expert' },
  'Thief': { stats: { cel: 2, luc: 1 }, description: 'Criminal background' },
  'Ward': { stats: { def: 2, res: 1 }, description: 'Defensive specialist' },
  'Shaman': { stats: { def: 1, fai: 2 }, description: 'Spiritual guide' },
  'Ghost': { stats: { res: 2, luc: 1 }, description: 'Otherworldly connection' },
  'Witchhunter': { stats: { str: 1, res: 2 }, description: 'Anti-magic specialist' },
  'Marauder': { stats: { vit: 2, luc: 1 }, description: 'Raider background' },
  'Knight': { stats: { def: 1, vit: 2 }, description: 'Noble warrior' },
  'Faithful': { stats: { res: 1, fai: 2 }, description: 'Religious devotee' },
  'Priest': { stats: { wil: 1, fai: 2 }, description: 'Holy servant' },
  'Survivor': { stats: { wil: 1, vit: 1, luc: 2 }, description: 'Hardened by trials' },
  'Gambler': { stats: { str: 1, luc: 2 }, description: 'Risk-taking lifestyle' }
};

export const LEGEND_EXTEND: Record<string, LegendExtendConfig> = {
  'Axysal': { stat: 'str', name: 'Axys Al', color: STAT_COLORS.str },
  'Kashic': { stat: 'wil', name: 'Kash Ic', color: STAT_COLORS.wil },
  'Zerogyn': { stat: 'ski', name: 'Zero Gyn', color: STAT_COLORS.ski },
  'Rabeur': { stat: 'cel', name: 'Rabe Ur', color: STAT_COLORS.cel },
  'Grenut': { stat: 'def', name: 'Gren Ut', color: STAT_COLORS.def },
  'Choier': { stat: 'res', name: 'Choi Er', color: STAT_COLORS.res },
  'Bldiia': { stat: 'vit', name: 'Bldi Ia', color: STAT_COLORS.vit },
  'Holymr': { stat: 'fai', name: 'Holy Mr', color: STAT_COLORS.fai },
  'Kagiji': { stat: 'luc', name: 'Kagi Ji', color: STAT_COLORS.luc },
  'Akurzo': { stat: 'gui', name: 'Akur Zo', color: STAT_COLORS.gui },
  'Luncau': { stat: 'san', name: 'Luna Cu', color: STAT_COLORS.san }
};

export const ASTROLOGY_PLANETS: Record<string, StatKey> = {
  'Mercury': 'ski',
  'Venus': 'def',
  'Mars': 'str',
  'Jupiter': 'luc',
  'Saturn': 'cel',
  'Neptune': 'vit',
  'Uranus': 'fai',
  'Pluto': 'res'
};

// Mapping of planets to their corresponding elemental attack types
export const PLANET_ELEMENTS: Record<string, string> = {
  'Mars': 'Fire',
  'Mercury': 'Ice',
  'Saturn': 'Wind',
  'Venus': 'Earth',
  'Pluto': 'Dark',
  'Neptune': 'Water',
  'Uranus': 'Light',
  'Jupiter': 'Lightning'
};