import React, { useState } from 'react';
import { Plus, Minus, RotateCcw, Settings, Utensils, BookOpen } from 'lucide-react';

const RACES = {
  'Human': { str: 1, wil: 1, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 1, san: 0, apt: 1, human: true },
  'Homunculi': { str: 0, wil: 2, ski: 1, cel: 0, def: 0, res: 0, vit: -1, fai: 1, luc: 0, gui: 1, san: 1, apt: 0, homunculi: true },
  'Lich': { str: 0, wil: 2, ski: 0, cel: 0, def: 0, res: 2, vit: -2, fai: -2, luc: 0, gui: 0, san: 3, apt: 0 },
  'Felidae': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 1, san: 0, apt: 0 },
  'Grimalkin': { str: 0, wil: 1, ski: 1, cel: 1, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Lupine': { str: 2, wil: 1, ski: 0, cel: 0, def: 1, res: 1, vit: 1, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Phenex': { str: 1, wil: 1, ski: 0, cel: 1, def: 0, res: 1, vit: 0, fai: 1, luc: 1, gui: 0, san: 0, apt: 0 },
  'Mechanation': { str: 1, wil: 0, ski: 1, cel: 0, def: 2, res: 2, vit: 0, fai: -2, luc: 0, gui: 1, san: 0, apt: 1 },
  'Dullahan': { str: 2, wil: 0, ski: 0, cel: 0, def: 1, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Glykin': { str: 0, wil: 1, ski: 0, cel: 1, def: 0, res: 1, vit: 0, fai: 2, luc: 1, gui: 0, san: 0, apt: 0 },
  'Umbral': { str: 0, wil: 1, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 2, san: 0, apt: 0 },
  'Wyverntouched': { str: 1, wil: 0, ski: 1, cel: 0, def: 1, res: 1, vit: 1, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Vampire': { str: 1, wil: 1, ski: 0, cel: 1, def: 0, res: 1, vit: 0, fai: -1, luc: 1, gui: 1, san: 0, apt: 0 },
  'Corrupted': { str: 1, wil: 1, ski: 0, cel: 0, def: 0, res: 1, vit: 1, fai: 0, luc: 0, gui: 1, san: 0, apt: 0 },
  'Zeran': { str: 1, wil: 0, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 1, luc: 0, gui: 1, san: 0, apt: 1 }
};

const CLASSES = {
  'Soldier': { str: 2, wil: 0, ski: 1, cel: 0, def: 0, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0 },
  'Duelist': { str: 1, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Mage': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Evoker': { str: 0, wil: 3, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0 },
  'Priest': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 3, luc: 0, gui: 0, san: 0 },
  'Monk': { str: 1, wil: 0, ski: 2, cel: 2, def: 2, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Ghost': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Bonder': { str: 2, wil: 2, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0 },
  'Kensei': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0 },
  'Arbalest': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 1, vit: 0, fai: 0, luc: 1, gui: 0, san: 0 },
  'Hexer': { str: 0, wil: 1, ski: 1, cel: 0, def: 3, res: 3, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Black Knight': { str: 2, wil: 0, ski: 1, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0 },
  'Tactician': { str: 1, wil: 1, ski: 2, cel: 2, def: 1, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Curate': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Engineer': { str: 2, wil: 0, ski: 1, cel: 2, def: 1, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0 },
  'Bard': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 2 },
  'Verglas': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Summoner': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 },
  'Boxer': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0 },
  'Rogue': { str: 0, wil: 0, ski: 1, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0 },
  'Archer': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0 },
  'Martial Artist': { str: 2, wil: 0, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0 }
};

const FOODS = {
  'None': { str: 0, wil: 0, ski: 0, cel: 0, vit: 0 },
  'Cheese': { str: 1, wil: 0, ski: 0, cel: 0, vit: 0 },
  'Fish': { str: 0, wil: 1, ski: 0, cel: 0, vit: 0 },
  'Fruit': { str: 0, wil: 0, ski: 1, cel: 0, vit: 0 },
  'Vegetable': { str: 0, wil: 0, ski: 0, cel: 1, vit: 0 },
  'Grain': { str: 0, wil: 0, ski: 0, cel: 0, vit: 1 }
};

const HISTORY = {
  'None': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Orphan': { str: 0, wil: 1, ski: 0, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Noble': { str: 0, wil: 1, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 1, luc: 0 },
  'Commoner': { str: 1, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 1, fai: 0, luc: 0 },
  'Street Rat': { str: 0, wil: 0, ski: 1, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Merchant': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 2 },
  'Soldier': { str: 1, wil: 0, ski: 0, cel: 0, def: 1, res: 0, vit: 0, fai: 0, luc: 0 },
  'Scholar': { str: 0, wil: 1, ski: 1, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 }
};

const LEGENDARY_EXTENTS = {
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

const ASTROLOGY_PLANETS = {
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
  const [mainClass, setMainClass] = useState('Soldier');
  const [subClass, setSubClass] = useState('Soldier');
  const [totalPoints, setTotalPoints] = useState(MAX_POINTS);
  const [food, setFood] = useState('None');
  const [history, setHistory] = useState('None');
  
  const [addedStats, setAddedStats] = useState({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [customStats, setCustomStats] = useState({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [customBaseStats, setCustomBaseStats] = useState({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [stamps, setStamps] = useState({
    str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0
  });

  const [legendaryExtents, setLegendaryExtents] = useState({});
  const [astrology, setAstrology] = useState({});
  const [customHP, setCustomHP] = useState(0);
  const [customFP, setCustomFP] = useState(0);
  const [giantGene, setGiantGene] = useState(false);
  const [dragonKing, setDragonKing] = useState(0);
  const [dragonQueen, setDragonQueen] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [hpPercent, setHpPercent] = useState(100);
  const [sanguineCrest, setSanguineCrest] = useState(false);

  const monoclassModifier = mainClass === subClass ? 2 : 1;

  const getLEBonus = () => {
    const bonuses = {};
    Object.keys(LEGENDARY_EXTENTS).forEach(key => {
      bonuses[LEGENDARY_EXTENTS[key].stat] = legendaryExtents[key] ? 1 : 0;
    });
    return bonuses;
  };

  const getAstrologyBonus = () => {
    const bonuses = {};
    Object.keys(ASTROLOGY_PLANETS).forEach(planet => {
      const stat = ASTROLOGY_PLANETS[planet];
      bonuses[stat] = (bonuses[stat] || 0) + (astrology[planet] || 0);
    });
    return bonuses;
  };

  const calculateDiminishingReturns = (racialStat, addedStat, classStat, customStat, aptitudeBonus, dragonBonus = 0) => {
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

  const getAptitudeBonus = () => {
    const raceData = RACES[race] || {};
    const classData = CLASSES[mainClass] || {};
    const effectiveApt = calculateDiminishingReturns(
      (raceData.apt || 0) + customBaseStats.apt,
      addedStats.apt,
      0,
      customStats.apt,
      0
    );
    return Math.floor((effectiveApt - APTITUDE_NUMBER) / APTITUDE_NUMBER);
  };

  const aptitudeBonus = Math.max(0, getAptitudeBonus());
  const leBonus = getLEBonus();
  const astroBonus = getAstrologyBonus();
  const foodBonus = FOODS[food] || {};
  const historyBonus = HISTORY[history] || {};
  const sanguineBonus = sanguineCrest ? 1 : 0;

  const getEffectiveStat = (statName) => {
    const raceData = RACES[race] || {};
    const classData = CLASSES[mainClass] || {};
    
    const racialValue = (raceData[statName] || 0) + customBaseStats[statName];
    const addedValue = addedStats[statName] + (astroBonus[statName] || 0) - (leBonus[statName] || 0) 
                      + (foodBonus[statName] || 0) + (historyBonus[statName] || 0) + (stamps[statName] || 0) + sanguineBonus;
    const classValue = classData[statName] || 0;
    const customValue = customStats[statName];
    
    let dragonBonus = 0;
    if (statName === 'str') dragonBonus = dragonKing * 3;
    if (statName === 'wil') dragonBonus = dragonQueen * 3;
    
    const effective = calculateDiminishingReturns(racialValue, addedValue, classValue, customValue, aptitudeBonus, dragonBonus);
    return effective + (leBonus[statName] || 0);
  };

  const stats = {
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

  if (dragonKing > 0) {
    stats.str = Math.floor(stats.str * (1 + 0.05 * dragonKing));
  }
  if (dragonQueen > 0) {
    stats.wil = Math.floor(stats.wil * (1 + 0.05 * dragonQueen));
  }

  const calculateHP = () => {
    const raceData = RACES[race] || {};
    let vitHP = Math.floor(stats.vit * 10);
    if (raceData.homunculi) {
      vitHP -= Math.floor(stats.vit / 2);
    }
    const sanHP = Math.floor(stats.san * 2);
    const strHP = (addedStats.str + (raceData.str || 0) + (astroBonus.str || 0)) * 3;
    const pointsSpent = MAX_POINTS - totalPoints;
    
    let maxHP = vitHP + sanHP + strHP + pointsSpent;
    
    if (giantGene) {
      maxHP = Math.floor(maxHP * 1.1);
    }
    
    maxHP += customHP;
    
    return Math.floor(maxHP * (hpPercent / 100));
  };

  const calculateMP = () => {
    const raceData = RACES[race] || {};
    let willMP = Math.floor(stats.wil * 5);
    if (raceData.homunculi) {
      willMP += Math.floor(stats.wil);
    }
    const sanMP = Math.floor(stats.san * 2);
    const faiMP = Math.floor(stats.fai * 3);
    
    let maxMP = willMP + sanMP + faiMP;
    maxMP += customFP;
    
    return maxMP;
  };

  const calculateElementalATK = (element) => {
    const statMap = {
      'Fire': stats.str, 'Ice': stats.ski, 'Wind': stats.cel, 'Earth': stats.def,
      'Dark': stats.res, 'Water': stats.vit, 'Light': stats.fai, 'Lightning': stats.luc,
      'Acid': stats.gui, 'Sound': stats.san
    };
    
    return Math.floor(statMap[element] + stats.wil / 4);
  };

  const calculateElementalRES = (element) => {
    const statMap = {
      'Fire': stats.str, 'Ice': stats.ski, 'Wind': stats.cel, 'Earth': stats.def,
      'Dark': stats.res, 'Water': stats.vit, 'Light': stats.fai, 'Lightning': stats.luc,
      'Acid': stats.gui, 'Sound': stats.san
    };
    
    return Math.floor((statMap[element] + stats.wil) / 4);
  };

  const youkaiCap = Math.floor(((RACES[race]?.fai || 0) + customBaseStats.fai + addedStats.fai + (astroBonus.fai || 0)) / 5) + 5;

  const addStat = (statName) => {
    if (totalPoints > 0) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] + 1 }));
      setTotalPoints(prev => prev - 1);
    }
  };

  const removeStat = (statName) => {
    if (addedStats[statName] > 0) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] - 1 }));
      setTotalPoints(prev => prev + 1);
    }
  };

  const resetStats = () => {
    setAddedStats({
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
    setStamps({ str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
    setSanguineCrest(false);
  };

  const StatRow = ({ label, statKey, color }) => {
    const raceData = RACES[race] || {};
    const baseValue = (raceData[statKey] || 0) + customBaseStats[statKey];
    const addedValue = addedStats[statKey] + (astroBonus[statKey] || 0);
    
    return (
      <div className="flex items-center gap-2 py-2 border-b border-gray-700">
        <div className="w-24 font-semibold" style={{ color }} title={`${baseValue} + ${addedValue}`}>
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
            <h1 className="text-3xl font-bold">SL2 Reckoning Calculator</h1>
            <div className="text-sm text-gray-400">Version 1.19</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Race</label>
              <select
                value={race}
                onChange={(e) => setRace(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(RACES).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Main Class</label>
              <select
                value={mainClass}
                onChange={(e) => setMainClass(e.target.value)}
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
                onChange={(e) => setSubClass(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(CLASSES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

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
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
              >
                <Settings size={16} />
                Advanced
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
                        {Object.entries(FOODS[f]).filter(([k, v]) => v > 0).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
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
                  {Object.keys(stamps).map(stat => (
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
              </div>

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
                {(RACES[race]?.cel || 0) + addedStats.cel + customBaseStats.cel + (astroBonus.cel || 0)}
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
                {11 + Math.floor(stats.gui / 5) + Math.floor(stats.ski / 5) + Math.floor(stats.wil / 10) + (RACES[race]?.human ? 2 : 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Essence</div>
              <div className="text-lg font-bold">
                {Math.floor(stats.san * 2 + 100)}
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
        </div>
      </div>
    </div>
  );
}