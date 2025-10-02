/**
 * SL2 Calculator - Extended Version
 * Added features: Class Passives, Rising Game, Instinct, Subrace support
 */

import { useState } from 'react';
import { Plus, Minus, RotateCcw, Settings, Utensils, BookOpen, Download, Upload, Copy } from 'lucide-react';
import WeaponCalculator from './WeaponCalculator';

type StatKey = 'str' | 'wil' | 'ski' | 'cel' | 'def' | 'res' | 'vit' | 'fai' | 'luc' | 'gui' | 'san' | 'apt';
type StampKey = 'str' | 'wil' | 'ski' | 'cel' | 'vit' | 'fai';

interface Stats {
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
  human?: boolean;
  homunculi?: boolean;
}

/**
 * Race categories - these provide no stat bonuses themselves
 * Races are just groupings for subraces that provide the actual stats
 */
const RACES: Record<string, { human?: boolean; homunculi?: boolean }> = {
  'Humans': { human: true },
  'Homunculi': { homunculi: true },
  'Serpentkind': {},
  'Corrupted': {},
  'Kaelensia': {},
  'Ancients': {},
  'Other': {},
  'Youkai': {}
};

// Subrace options with race restrictions 
const SUBRACES: Record<string, Stats & { allowedRaces?: string[] }> = {
  'Humans': { str: 1, wil: 1, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 1, san: 0, apt: 1, human: true, allowedRaces: ['Human'] },
  'Homunculi': { str: 0, wil: 2, ski: 1, cel: 0, def: 0, res: 0, vit: -1, fai: 1, luc: 0, gui: 1, san: 1, apt: 0, homunculi: true, allowedRaces: ['Homunculi'] },
  'Lich': { str: 0, wil: 2, ski: 0, cel: 0, def: 0, res: 2, vit: -2, fai: -2, luc: 0, gui: 0, san: 3, apt: 0, allowedRaces: ['Lich'] },
  'Felidae': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 1, san: 0, apt: 0, allowedRaces: ['Felidae'] },
  'Grimalkin': { str: 0, wil: 1, ski: 1, cel: 1, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, allowedRaces: ['Grimalkin'] },
  'Lupine': { str: 2, wil: 1, ski: 0, cel: 0, def: 1, res: 1, vit: 1, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, allowedRaces: ['Lupine'] },
  'Phenex': { str: 1, wil: 1, ski: 0, cel: 1, def: 0, res: 1, vit: 0, fai: 1, luc: 1, gui: 0, san: 0, apt: 0, allowedRaces: ['Phenex'] },
  'Mechanation': { str: 1, wil: 0, ski: 1, cel: 0, def: 2, res: 2, vit: 0, fai: -2, luc: 0, gui: 1, san: 0, apt: 1, allowedRaces: ['Mechanation'] },
  'Dullahan': { str: 2, wil: 0, ski: 0, cel: 0, def: 1, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, allowedRaces: ['Dullahan'] },
  'Glykin': { str: 0, wil: 1, ski: 0, cel: 1, def: 0, res: 1, vit: 0, fai: 2, luc: 1, gui: 0, san: 0, apt: 0, allowedRaces: ['Glykin'] },
  'Umbral': { str: 0, wil: 1, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 2, san: 0, apt: 0, allowedRaces: ['Umbral'] },
  'Wyverntouched': { str: 1, wil: 0, ski: 1, cel: 0, def: 1, res: 1, vit: 1, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, allowedRaces: ['Wyverntouched'] },
  'Vampire': { str: 1, wil: 1, ski: 0, cel: 1, def: 0, res: 1, vit: 0, fai: -1, luc: 1, gui: 1, san: 0, apt: 0, allowedRaces: ['Vampire'] },
  'Corrupted': { str: 1, wil: 1, ski: 0, cel: 0, def: 0, res: 1, vit: 1, fai: 0, luc: 0, gui: 1, san: 0, apt: 0, allowedRaces: ['Corrupted'] },
  'Zeran': { str: 1, wil: 0, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 1, luc: 0, gui: 1, san: 0, apt: 1, allowedRaces: ['Zeran'] },
  
  // Actual subraces with unique stats
  'Corbie': { str: 0, wil: 1, ski: 0, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, allowedRaces: ['Human'] },
  'Kaelensian': { str: 0, wil: 0, ski: 1, cel: 0, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 1, san: 0, apt: 0, allowedRaces: ['Human'] },
  'Hyattr': { str: 1, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 1, fai: 0, luc: 0, gui: 0, san: 1, apt: 0, allowedRaces: ['Human'] },
  'Shaitan': { str: 0, wil: 1, ski: 0, cel: 0, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 1, san: 0, apt: 0, allowedRaces: ['Homunculi'] },
  'Doriads': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 2, fai: 1, luc: 0, gui: 0, san: 0, apt: 0, allowedRaces: ['Glykin'] },
  'Papilion': { str: 0, wil: 0, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, allowedRaces: ['Glykin'] }
};

const CLASSES: Record<string, Omit<Stats, 'human' | 'homunculi'>> = {
  'Soldier': { str: 2, wil: 0, ski: 1, cel: 0, def: 0, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Duelist': { str: 1, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Mage': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Evoker': { str: 0, wil: 3, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Priest': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 3, luc: 0, gui: 0, san: 0, apt: 0 },
  'Monk': { str: 1, wil: 0, ski: 2, cel: 2, def: 2, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Ghost': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Bonder': { str: 2, wil: 2, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Kensei': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Arbalest': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 1, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Hexer': { str: 0, wil: 1, ski: 1, cel: 0, def: 3, res: 3, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Black Knight': { str: 2, wil: 0, ski: 1, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Tactician': { str: 1, wil: 1, ski: 2, cel: 2, def: 1, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Demon Hunter': { str: 2, wil: 0, ski: 2, cel: 2, def: 2, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Curate': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Engineer': { str: 2, wil: 0, ski: 1, cel: 2, def: 1, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Bard': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 2, apt: 0 },
  'Performer': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 3, apt: 0 },
  'Dancer': { str: 1, wil: 2, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Dark Bard': { str: 2, wil: 0, ski: 0, cel: 0, def: 0, res: 2, vit: 1, fai: 0, luc: 0, gui: 0, san: 3, apt: 0 },
  'Verglas': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Summoner': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Grand Summoner': { str: 0, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0 },
  'Boxer': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Rogue': { str: 0, wil: 0, ski: 1, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Archer': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Martial Artist': { str: 2, wil: 0, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Firebird': { str: 2, wil: 0, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Aquamancer': { str: 0, wil: 1, ski: 0, cel: 2, def: 0, res: 0, vit: 3, fai: 2, luc: 0, gui: 0, san: 0, apt: 0 },
  'Druid': { str: 0, wil: 0, ski: 0, cel: 2, def: 2, res: 0, vit: 0, fai: 2, luc: 2, gui: 0, san: 0, apt: 0 },
  'Shapeshifter': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Lantern Bearer': { str: 0, wil: 2, ski: 0, cel: 2, def: 1, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Spellthief': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Magic Gunner': { str: 0, wil: 2, ski: 3, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Ranger': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 2, apt: 0 },
  'Ruler': { str: 0, wil: 2, ski: 0, cel: 0, def: 0, res: 2, vit: 0, fai: 0, luc: 2, gui: 0, san: 2, apt: 0 },
  'Rune Magician': { str: 0, wil: 3, ski: 2, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 3, san: 0, apt: 0 },
  'Shinobi': { str: 2, wil: 0, ski: 0, cel: 4, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 2, san: 0, apt: 0 },
  'Solblader': { str: 2, wil: 2, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0 },
  'Void Assassin': { str: 0, wil: 0, ski: 3, cel: 2, def: 0, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 }
};

// Class passive abilities
interface ClassPassive {
  maxRank: number;
  stats: Partial<StatRecord>;
  description: string;
}

type StatRecord = Record<StatKey, number>;
type StampRecord = Record<StampKey, number>;

/**
 * Interface for build data that can be exported/imported
 */
interface BuildData {
  buildName: string;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  totalPoints: number;
  food: string;
  history: string;
  addedStats: StatRecord;
  customStats: StatRecord;
  customBaseStats: StatRecord;
  stamps: StampRecord;
  legendaryExtents: Record<string, boolean>;
  astrology: Record<string, number>;
  customHP: number;
  customFP: number;
  giantGene: boolean;
  dragonKing: number;
  dragonQueen: number;
  hpPercent: number;
  sanguineCrest: boolean;
  grimalkinInstinct: boolean;
  risingGame: number;
  fortitude: boolean;
  painTolerance: number;
  warwalk: boolean;
  endurance: boolean;
  mainClassPassive: number;
  subClassPassive: number;
  version: string; // For future compatibility
}

const CLASS_PASSIVES: Record<string, ClassPassive> = {
  'Arbalest': { maxRank: 6, stats: { ski: 1 }, description: '+SKI per rank' },
  'Bard': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
  'Black Knight': { maxRank: 6, stats: { def: 1 }, description: '+DEF per rank' },
  'Bonder': { maxRank: 3, stats: { wil: 1, fai: 1 }, description: '+WIL/FAI per rank' },
  'Dancer': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
  'Dark Bard': { maxRank: 9, stats: { san: 1 }, description: '+SAN, +STR/SAN at rank 7+' },
  'Engineer': { maxRank: 6, stats: { gui: 1 }, description: '+GUI per rank' },
  'Evoker': { maxRank: 6, stats: { wil: 1 }, description: '+WIL per rank' },
  'Ghost': { maxRank: 5, stats: { res: 1 }, description: '+RES per rank' },
  'Hexer': { maxRank: 3, stats: { def: 1, res: 1 }, description: '+DEF/RES per rank' },
  'Kensei': { maxRank: 3, stats: { str: 1, ski: 1 }, description: '+STR/SKI per rank' },
  'Lantern Bearer': { maxRank: 6, stats: { res: 1 }, description: '+RES per rank' },
  'Magic Gunner': { maxRank: 3, stats: { cel: 1, res: 1 }, description: '+CEL/RES per rank' },
  'Monk': { maxRank: 3, stats: { ski: 1, cel: 1 }, description: '+SKI/CEL per rank' },
  'Performer': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
  'Priest': { maxRank: 6, stats: { fai: 1 }, description: '+FAI per rank' },
  'Solblader': { maxRank: 3, stats: { fai: 1, gui: 1 }, description: '+FAI/GUI per rank' },
  'Tactician': { maxRank: 3, stats: { wil: 1, gui: 1 }, description: '+WIL/GUI per rank' },
  'Void Assassin': { maxRank: 3, stats: { ski: 1, res: 1 }, description: '+SKI/RES per rank' }
};

interface FoodBonus {
  str: number;
  wil: number;
  ski: number;
  cel: number;
  vit: number;
}

const FOODS: Record<string, FoodBonus> = {
  'None': { str: 0, wil: 0, ski: 0, cel: 0, vit: 0 },
  'Cheese': { str: 1, wil: 0, ski: 0, cel: 0, vit: 0 },
  'Fish': { str: 0, wil: 1, ski: 0, cel: 0, vit: 0 },
  'Fruit': { str: 0, wil: 0, ski: 1, cel: 0, vit: 0 },
  'Vegetable': { str: 0, wil: 0, ski: 0, cel: 1, vit: 0 },
  'Grain': { str: 0, wil: 0, ski: 0, cel: 0, vit: 1 }
};

interface HistoryBonus {
  str: number;
  wil: number;
  ski: number;
  cel: number;
  def: number;
  res: number;
  vit: number;
  fai: number;
  luc: number;
}

const HISTORY: Record<string, HistoryBonus> = {
  'None': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Orphan': { str: 0, wil: 1, ski: 0, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Noble': { str: 0, wil: 1, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 1, luc: 0 },
  'Commoner': { str: 1, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 1, fai: 0, luc: 0 },
  'Street Rat': { str: 0, wil: 0, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Merchant': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 2 },
  'Soldier': { str: 1, wil: 0, ski: 0, cel: 0, def: 1, res: 0, vit: 0, fai: 0, luc: 0 },
  'Scholar': { str: 0, wil: 1, ski: 1, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 }
};

const LEGENDARY_EXTENTS: Record<string, { stat: StatKey; name: string; color: string }> = {
  'Axysal': { stat: 'str', name: 'Axys Al', color: '#ff6b6b' },
  'Kashic': { stat: 'wil', name: 'Kash Ic', color: '#4ecdc4' },
  'Zerogyn': { stat: 'ski', name: 'Zero Gyn', color: '#95e1d3' },
  'Rabeur': { stat: 'cel', name: 'Rabe Ur', color: '#f9ca24' },
  'Grenut': { stat: 'def', name: 'Gren Ut', color: '#a29bfe' },
  'Choier': { stat: 'res', name: 'Choi Er', color: '#fd79a8' },
  'Bldiia': { stat: 'vit', name: 'Bldi Ia', color: '#55efc4' },
  'Holymr': { stat: 'fai', name: 'Holy Mr', color: '#ffeaa7' },
  'Kagiji': { stat: 'luc', name: 'Kagi Ji', color: '#74b9ff' },
  'Akurzo': { stat: 'gui', name: 'Akur Zo', color: '#a29bfe' },
  'Luncau': { stat: 'san', name: 'Luna Cu', color: '#dfe6e9' }
};

const ASTROLOGY_PLANETS: Record<string, StatKey> = {
  'Mercury': 'ski',
  'Venus': 'def',
  'Mars': 'str',
  'Jupiter': 'luc',
  'Saturn': 'cel',
  'Neptune': 'vit',
  'Uranus': 'fai',
  'Pluto': 'res'
};

const MAX_POINTS = 240;
const APTITUDE_NUMBER = 6;

export default function SL2Calculator() {
  const [race, setRace] = useState('Human');
  const [subrace, setSubrace] = useState('Human');
  const [mainClass, setMainClass] = useState('Soldier');
  const [subClass, setSubClass] = useState('Soldier');
  const [totalPoints, setTotalPoints] = useState(MAX_POINTS);
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

  const [legendaryExtents, setLegendaryExtents] = useState<Record<string, boolean>>({});
  const [astrology, setAstrology] = useState<Record<string, number>>({});
  const [customHP, setCustomHP] = useState(0);
  const [customFP, setCustomFP] = useState(0);
  const [giantGene, setGiantGene] = useState(false);
  const [dragonKing, setDragonKing] = useState(0);
  const [dragonQueen, setDragonQueen] = useState(0);
  const [hpPercent, setHpPercent] = useState(100);
  const [sanguineCrest, setSanguineCrest] = useState(false);
  const [grimalkinInstinct, setGrimalkinInstinct] = useState(false);
  const [risingGame, setRisingGame] = useState(0);
  const [fortitude, setFortitude] = useState(false);
  const [painTolerance, setPainTolerance] = useState(0);
  const [warwalk, setWarwalk] = useState(false);
  const [endurance, setEndurance] = useState(false);
  
  // Class passive ranks
  const [mainClassPassive, setMainClassPassive] = useState(0);
  const [subClassPassive, setSubClassPassive] = useState(0);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [showCustomStats, setShowCustomStats] = useState(false);
  const [showTalents, setShowTalents] = useState(false);

  // Import/Export state
  const [showImportExport, setShowImportExport] = useState(false);
  const [buildName, setBuildName] = useState('My Build');
  const [importText, setImportText] = useState('');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'stats' | 'weapon' >('stats');

  const monoclassModifier = mainClass === subClass ? 2 : 1;

  /**
   * Export current build to JSON
   */
  const exportBuild = (buildName: string = "My Build"): void => {
    const buildData: BuildData = {
      buildName,
      race,
      subrace,
      mainClass,
      subClass,
      totalPoints,
      food,
      history,
      addedStats,
      customStats,
      customBaseStats,
      stamps,
      legendaryExtents,
      astrology,
      customHP,
      customFP,
      giantGene,
      dragonKing,
      dragonQueen,
      hpPercent,
      sanguineCrest,
      grimalkinInstinct,
      risingGame,
      fortitude,
      painTolerance,
      warwalk,
      endurance,
      mainClassPassive,
      subClassPassive,
      version: "1.0"
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

  /**
   * Import build from JSON
   */
  const importBuild = (jsonString: string): boolean => {
    try {
      const buildData: BuildData = JSON.parse(jsonString);
      
      // Validate required fields
      if (!buildData.race || !buildData.subrace || !buildData.mainClass || !buildData.subClass) {
        throw new Error("Invalid build data: missing required fields");
      }

      // Apply the build data
      setRace(buildData.race);
      setSubrace(buildData.subrace);
      setMainClass(buildData.mainClass);
      setSubClass(buildData.subClass);
      setTotalPoints(buildData.totalPoints || MAX_POINTS);
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
      setLegendaryExtents(buildData.legendaryExtents || {});
      setAstrology(buildData.astrology || {});
      setCustomHP(buildData.customHP || 0);
      setCustomFP(buildData.customFP || 0);
      setGiantGene(buildData.giantGene || false);
      setDragonKing(buildData.dragonKing || 0);
      setDragonQueen(buildData.dragonQueen || 0);
      setHpPercent(buildData.hpPercent || 100);
      setSanguineCrest(buildData.sanguineCrest || false);
      setGrimalkinInstinct(buildData.grimalkinInstinct || false);
      setRisingGame(buildData.risingGame || 0);
      setFortitude(buildData.fortitude || false);
      setPainTolerance(buildData.painTolerance || 0);
      setWarwalk(buildData.warwalk || false);
      setEndurance(buildData.endurance || false);
      setMainClassPassive(buildData.mainClassPassive || 0);
      setSubClassPassive(buildData.subClassPassive || 0);
      
      return true;
    } catch (error) {
      console.error('Failed to import build:', error);
      return false;
    }
  };

  /**
   * Copy build to clipboard as JSON
   */
  const copyBuildToClipboard = async (buildName: string = "My Build"): Promise<boolean> => {
    const buildData: BuildData = {
      buildName,
      race,
      subrace,
      mainClass,
      subClass,
      totalPoints,
      food,
      history,
      addedStats,
      customStats,
      customBaseStats,
      stamps,
      legendaryExtents,
      astrology,
      customHP,
      customFP,
      giantGene,
      dragonKing,
      dragonQueen,
      hpPercent,
      sanguineCrest,
      grimalkinInstinct,
      risingGame,
      fortitude,
      painTolerance,
      warwalk,
      endurance,
      mainClassPassive,
      subClassPassive,
      version: "1.0"
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(buildData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  /**
   * Filter subraces based on the currently selected race
   * Returns base race and any specific subraces available for the current race
   */
  const getAvailableSubraces = (): string[] => {
    return Object.keys(SUBRACES).filter(subraceKey => {
      const subrace = SUBRACES[subraceKey];
      // If no allowedRaces specified, it's available to all races
      if (!subrace.allowedRaces) return true;
      // Check if current race is in the allowed races list
      return subrace.allowedRaces.includes(race);
    });
  };

  /**
   * Handle race change - auto-select the base race subrace and reset if not available
   */
  const handleRaceChange = (newRace: string): void => {
    setRace(newRace);
    
    // Auto-select the base race as subrace if it exists
    if (SUBRACES[newRace]) {
      setSubrace(newRace);
    } else {
      // Find available subraces for this race
      const availableSubraces = Object.keys(SUBRACES).filter(subraceKey => {
        const subrace = SUBRACES[subraceKey];
        if (!subrace.allowedRaces) return true;
        return subrace.allowedRaces.includes(newRace);
      });
      
      // If current subrace is not available for the new race, reset to first available
      if (!availableSubraces.includes(subrace)) {
        setSubrace(availableSubraces[0] || newRace);
      }
    }
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

  // Calculate Instinct bonus (Felidae/Lupine/Grimalkin)
  const calculateInstinct = (): Partial<StatRecord> => {
    if (hpPercent > 50) return {};
    
    const baseInstinct = Math.floor(stats.san * 0.1 + 1);
    const bonus = hpPercent <= 25 ? baseInstinct * 2 : baseInstinct;
    
    if (race === 'Felidae' || race === 'Grimalkin') {
      if (grimalkinInstinct) {
        // Grimalkin I variant: WIL/RES instead of GUI/LUC
        return { ski: bonus, cel: bonus, wil: bonus, res: bonus };
      }
      return { ski: bonus, cel: bonus, gui: bonus, luc: bonus };
    }
    
    if (race === 'Lupine') {
      return { str: bonus, wil: bonus, def: bonus, res: bonus };
    }
    
    return {};
  };

  const getLEBonus = (): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    Object.keys(LEGENDARY_EXTENTS).forEach(key => {
      const stat = LEGENDARY_EXTENTS[key].stat;
      bonuses[stat] = legendaryExtents[key] ? 1 : 0;
    });
    return bonuses;
  };

  const getAstrologyBonus = (): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    Object.keys(ASTROLOGY_PLANETS).forEach(planet => {
      const stat = ASTROLOGY_PLANETS[planet];
      bonuses[stat] = (bonuses[stat] || 0) + (astrology[planet] || 0);
    });
    return bonuses;
  };

  // Get class passive bonuses
  const getClassPassiveBonus = (className: string, rank: number): Partial<StatRecord> => {
    const passive = CLASS_PASSIVES[className];
    if (!passive || rank === 0) return {};
    
    const bonuses: Partial<StatRecord> = {};
    Object.entries(passive.stats).forEach(([stat, value]) => {
      bonuses[stat as StatKey] = (value || 0) * rank;
    });
    
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

  const aptitudeBonus = Math.max(0, getAptitudeBonus());
  const leBonus = getLEBonus();
  const astroBonus = getAstrologyBonus();
  const foodBonus = FOODS[food];
  const historyBonus = HISTORY[history];
  const sanguineBonus = sanguineCrest ? 1 : 0;
  const risingGameBonus = calculateRisingGame();
  const mainPassiveBonus = getClassPassiveBonus(mainClass, mainClassPassive);
  const subPassiveBonus = getClassPassiveBonus(subClass, subClassPassive);

  const getEffectiveStat = (statName: StatKey): number => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    // Now only subrace provides stat bonuses, race provides special flags only
    const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName];
    const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      - (leBonus[statName] || 0)
      + (foodBonus[statName as keyof FoodBonus] || 0) 
      + (historyBonus[statName as keyof HistoryBonus] || 0)
      + stampValue 
      + sanguineBonus
      + (risingGameBonus[statName] || 0)
      + (mainPassiveBonus[statName] || 0)
      + (subPassiveBonus[statName] || 0);
    
    const classValue = classData?.[statName] || 0;
    const customValue = customStats[statName];
    
    let dragonBonus = 0;
    if (statName === 'str') dragonBonus = dragonKing * 3;
    if (statName === 'wil') dragonBonus = dragonQueen * 3;
    
    const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
    const effective = calculateDiminishingReturns(racialValue, addedValue, classValue, customValue, aptBonusToApply, dragonBonus);
    
    return effective + (leBonus[statName] || 0);
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

  // Apply instinct bonus after initial calculation
  const instinctBonus = calculateInstinct();
  Object.entries(instinctBonus).forEach(([stat, value]) => {
    if (value) stats[stat as StatKey] += value;
  });

  if (dragonKing > 0) {
    stats.str = Math.floor(stats.str * (1 + 0.05 * dragonKing));
  }
  if (dragonQueen > 0) {
    stats.wil = Math.floor(stats.wil * (1 + 0.05 * dragonQueen));
  }

  const calculateHP = (): number => {
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
    
    return maxMP;
  };

  const calculateElementalATK = (element: string): number => {
    const statMap: Record<string, number> = {
      'Fire': stats.str, 'Ice': stats.ski, 'Wind': stats.cel, 'Earth': stats.def,
      'Dark': stats.res, 'Water': stats.vit, 'Light': stats.fai, 'Lightning': stats.luc,
      'Acid': stats.gui, 'Sound': stats.san
    };
    
    return Math.floor(statMap[element] + stats.wil / 4);
  };

  const calculateElementalRES = (element: string): number => {
    const statMap: Record<string, number> = {
      'Fire': stats.str, 'Ice': stats.ski, 'Wind': stats.cel, 'Earth': stats.def,
      'Dark': stats.res, 'Water': stats.vit, 'Light': stats.fai, 'Lightning': stats.luc,
      'Acid': stats.gui, 'Sound': stats.san
    };
    
    return Math.floor((statMap[element] + stats.wil) / 4);
  };

  const youkaiCap = Math.floor(((SUBRACES[subrace]?.fai || 0) + customBaseStats.fai + addedStats.fai + (astroBonus.fai || 0)) / 5) + 5;

  const addStat = (statName: StatKey): void => {
    if (totalPoints > 0) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] + 1 }));
      setTotalPoints(prev => prev - 1);
    }
  };

  const removeStat = (statName: StatKey): void => {
    if (addedStats[statName] > 0) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] - 1 }));
      setTotalPoints(prev => prev + 1);
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
    setLegendaryExtents({});
    setAstrology({});
    setCustomHP(0);
    setCustomFP(0);
    setGiantGene(false);
    setDragonKing(0);
    setDragonQueen(0);
    setFood('None');
    setHistory('None');
    setSubrace('Human'); // Reset to base Human race
    setStamps({ str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
    setSanguineCrest(false);
    setGrimalkinInstinct(false);
    setRisingGame(0);
    setFortitude(false);
    setPainTolerance(0);
    setWarwalk(false);
    setEndurance(false);
    setMainClassPassive(0);
    setSubClassPassive(0);
  };

  // Check if class has fortitude access
  const hasFortitude = ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(mainClass) 
    || ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(subClass);

  // Check if class has endurance access
  const hasEndurance = mainClass === 'Hexer' || subClass === 'Hexer';

  // Check if class/race has Rising Game/Pain Tolerance
  const hasGhost = mainClass === 'Ghost' || subClass === 'Ghost';

  const StatRow = ({ label, statKey, color }: { label: string; statKey: StatKey; color: string }) => {
    const subraceData = SUBRACES[subrace];
    const baseValue = (subraceData?.[statKey] || 0) + customBaseStats[statKey];
    const addedValue = addedStats[statKey] + (astroBonus[statKey] || 0);
    
    return (
      <div className="flex items-center gap-2 py-2 border-b border-gray-700">
        <div className="w-24 font-semibold" style={{ color }} title={`Base: ${baseValue} (from ${subrace}) + Added: ${addedValue}`}>
          {label}
        </div>
        <button
          onClick={() => removeStat(statKey)}
          disabled={addedStats[statKey] === 0}
          className="p-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => addStat(statKey)}
          disabled={totalPoints === 0}
          className="p-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded"
        >
          <Plus size={16} />
        </button>
        <div className="flex-1 text-right">
          <span className="text-2xl font-bold" style={{ color }} title={`Effective: ${stats[statKey].toFixed(1)}`}>
            {Math.floor(stats[statKey])}
          </span>
          <span className="text-sm text-gray-400 ml-2">
            ({baseValue} + {addedValue})
          </span>
        </div>
      </div>
    );
  };

  const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">SL2 Calculator Suite</h1>
            <div className="text-sm text-gray-400">Version 1.0.0</div>
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
          </div>

          {/* Stat Calculator Tab */}
          {activeTab === 'stats' && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                onChange={(e) => setSubrace(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {getAvailableSubraces().map(sr => (
                  <option key={sr} value={sr}>{sr}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Main Class</label>
              <select
                value={mainClass}
                onChange={(e) => {
                  setMainClass(e.target.value);
                  setMainClassPassive(0);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(CLASSES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Sub Class</label>
              <select
                value={subClass}
                onChange={(e) => {
                  setSubClass(e.target.value);
                  setSubClassPassive(0);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(CLASSES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Passive Rank selectors */}
          {(CLASS_PASSIVES[mainClass] || CLASS_PASSIVES[subClass]) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {CLASS_PASSIVES[mainClass] && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {mainClass} Passive Rank ({CLASS_PASSIVES[mainClass].description})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={mainClass === subClass ? 0 : CLASS_PASSIVES[mainClass].maxRank}
                    value={mainClassPassive}
                    onChange={(e) => setMainClassPassive(Number(e.target.value))}
                    disabled={mainClass === subClass}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              )}
              {CLASS_PASSIVES[subClass] && mainClass !== subClass && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {subClass} Passive Rank ({CLASS_PASSIVES[subClass].description})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={CLASS_PASSIVES[subClass].maxRank}
                    value={subClassPassive}
                    onChange={(e) => setSubClassPassive(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              )}
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
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
              >
                <Utensils size={16} />
                Food
              </button>
              <button
                onClick={() => setShowStamps(!showStamps)}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm"
              >
                <BookOpen size={16} />
                History
              </button>
              <button
                onClick={() => setShowTalents(!showTalents)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-sm"
              >
                Talents
              </button>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
              >
                <Settings size={16} />
                Advanced
              </button>
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
              >
                <Download size={16} />
                Import/Export
              </button>
              <button
                onClick={resetStats}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
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
                  onChange={(e) => setHistory(e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
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
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
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
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
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
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
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
                    checked={warwalk}
                    onChange={(e) => setWarwalk(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Warwalk (+30 HP/FP)</span>
                </div>
                
                {(race === 'Grimalkin' || race === 'Felidae') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grimalkinInstinct}
                      onChange={(e) => setGrimalkinInstinct(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Grimalkin Instinct I (WIL/RES variant)</span>
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
                  <label className="block text-sm mb-1">Custom HP</label>
                  <input
                    type="number"
                    value={customHP}
                    onChange={(e) => setCustomHP(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Custom FP</label>
                  <input
                    type="number"
                    value={customFP}
                    onChange={(e) => setCustomFP(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Dragon King Pieces</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={dragonKing}
                    onChange={(e) => setDragonKing(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
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
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={giantGene}
                    onChange={(e) => setGiantGene(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Giant Gene (+10% HP, -10 Evade)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sanguineCrest}
                    onChange={(e) => setSanguineCrest(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Sanguine Crest (+1 All Stats)</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Current HP %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hpPercent}
                    onChange={(e) => setHpPercent(Number(e.target.value))}
                    className="w-20 bg-gray-600 border border-gray-500 rounded px-2 py-1"
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
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
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
                          onChange={(e) => setCustomBaseStats(prev => ({ ...prev, [stat]: Number(e.target.value) }))}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Legendary Extents (+1 after DR)</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {Object.keys(LEGENDARY_EXTENTS).map(key => (
                    <button
                      key={key}
                      onClick={() => setLegendaryExtents(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`px-3 py-2 rounded text-sm ${
                        legendaryExtents[key] 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      style={{ borderLeft: `4px solid ${LEGENDARY_EXTENTS[key].color}` }}
                    >
                      {LEGENDARY_EXTENTS[key].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Astrology (Planet Signs)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.keys(ASTROLOGY_PLANETS).map(planet => (
                    <div key={planet}>
                      <label className="block text-sm mb-1">{planet}</label>
                      <input
                        type="number"
                        min="0"
                        max="3"
                        value={astrology[planet] || 0}
                        onChange={(e) => setAstrology(prev => ({ ...prev, [planet]: Number(e.target.value) }))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                      />
                    </div>
                  ))}
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
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download JSON
                    </button>
                    <button
                      onClick={() => copyBuildToClipboard(buildName)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
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
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <StatRow label="Strength" statKey="str" color="#ff6b6b" />
              <StatRow label="Will" statKey="wil" color="#4ecdc4" />
              <StatRow label="Skill" statKey="ski" color="#95e1d3" />
              <StatRow label="Celerity" statKey="cel" color="#f9ca24" />
              <StatRow label="Defense" statKey="def" color="#a29bfe" />
              <StatRow label="Resistance" statKey="res" color="#fd79a8" />
            </div>
            
            <div className="space-y-1">
              <StatRow label="Vitality" statKey="vit" color="#55efc4" />
              <StatRow label="Faith" statKey="fai" color="#ffeaa7" />
              <StatRow label="Luck" statKey="luc" color="#74b9ff" />
              <StatRow label="Guile" statKey="gui" color="#a29bfe" />
              <StatRow label="Sanctity" statKey="san" color="#dfe6e9" />
              <StatRow label="Aptitude" statKey="apt" color="#00b894" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">HP</div>
              <div className="text-2xl font-bold text-red-400">{calculateHP()}</div>
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
                {Math.floor(stats.cel * 2) - (giantGene ? 10 : 0)}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {elements.map(elem => (
                <div key={elem} className="bg-gray-700 rounded p-3">
                  <div className="text-sm font-semibold mb-1">{elem}</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">ATK: {calculateElementalATK(elem)}</span>
                    <span className="text-blue-400">RES: {calculateElementalRES(elem)}%</span>
                  </div>
                </div>
              ))}
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
                0/{Math.floor(stats.str + stats.vit) + 5 + (race === 'Dullahan' ? 30 : 0)}
              </div>
            </div>
          </div>
            </>
          )}

          {/* Weapon Calculator Tab */}
          {activeTab === 'weapon' && (
            <WeaponCalculator stats={stats} />
          )}
        </div>
      </div>
    </div>
  );
}
