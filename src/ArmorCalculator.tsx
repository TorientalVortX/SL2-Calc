/**
 * SL2 Armor Calculator
 * Equipment system for armor pieces
 */

import { useState, useEffect } from 'react';
import { ARMORS, getArmorsByType, ARMOR_TYPES } from './data/armors';
import { Armor } from './types';
import { STAT_COLORS } from './data/colors';
import type { StatKey } from './types';

interface ArmorCalculatorProps {
  equippedArmor: Armor | null;
  onArmorChange?: (armor: Armor | null) => void;
  conditionalBonusStates?: Record<string, boolean>;
  onConditionalBonusChange?: (bonusKey: string, enabled: boolean) => void;
  readOnly?: boolean;
  retroMode?: boolean;
}

export default function ArmorCalculator({ equippedArmor, onArmorChange, conditionalBonusStates = {}, onConditionalBonusChange, readOnly = false, retroMode = false }: ArmorCalculatorProps) {
  const [selectedType, setSelectedType] = useState<string>('Heavy');
  const [localBonusStates, setLocalBonusStates] = useState<Record<string, boolean>>({});

  // Update selectedType when armor changes
  useEffect(() => {
    if (equippedArmor) {
      setSelectedType(equippedArmor.type);
    }
  }, [equippedArmor]);

  // Sync conditional bonus states and reset when armor changes
  useEffect(() => {
    if (equippedArmor?.conditionalBonuses) {
      const newStates: Record<string, boolean> = {};
      Object.keys(equippedArmor.conditionalBonuses).forEach(key => {
        newStates[key] = conditionalBonusStates[key] ?? false;
      });
      setLocalBonusStates(newStates);
    } else {
      setLocalBonusStates({});
    }
  }, [equippedArmor, conditionalBonusStates]);

  // Handle conditional bonus toggle
  const handleBonusToggle = (bonusKey: string, enabled: boolean) => {
    setLocalBonusStates(prev => ({
      ...prev,
      [bonusKey]: enabled
    }));
    onConditionalBonusChange?.(bonusKey, enabled);
  };

  // Get armors for selected type
  const availableArmors = getArmorsByType(selectedType);

  // Handle armor selection
  const handleArmorSelection = (armorName: string) => {
    if (armorName === 'None') {
      onArmorChange?.(null);
    } else {
      const armor = ARMORS[armorName];
      if (armor) {
        onArmorChange?.(armor);
      }
    }
  };

  // Calculate total armor stats
  const getTotalArmor = () => {
    if (!equippedArmor) return 0;
    return equippedArmor.armor;
  };

  const getTotalMagicArmor = () => {
    if (!equippedArmor) return 0;
    return equippedArmor.magicArmor;
  };

  const getTotalEvade = () => {
    if (!equippedArmor) return 0;
    return equippedArmor.evade;
  };

  const getTotalWeight = () => {
    if (!equippedArmor) return 0;
    return equippedArmor.weight;
  };

  // Get rarity color
  const getRarityColor = (rarity: number) => {
    if (rarity >= 9) return 'text-purple-600';
    if (rarity >= 7) return 'text-orange-600';
    if (rarity >= 5) return 'text-blue-600';
    if (rarity >= 3) return 'text-green-600';
    return 'text-gray-600';
  };

  // Get rarity stars
  const getRarityStars = (rarity: number) => {
    return '★'.repeat(rarity);
  };

  return (
    <div className={`space-y-6 ${retroMode ? 'font-retro' : ''}`}>
      <div className={`panel-contrast border border-orange-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
        <h2 className={`text-2xl font-bold mb-4 ${retroMode ? 'glitch-title text-orange-300' : 'text-orange-400'}`}>Armor Calculator</h2>
        
        {/* Armor Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Armor Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={readOnly}
            className={`w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
          >
            {ARMOR_TYPES.map((type) => (
              <option key={type} value={type} className="bg-gray-800">
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Armor Selection */}
        <div className="space-y-3 mt-4">
          <label className="block text-sm font-medium text-gray-300">Armor:</label>
          <select
            value={equippedArmor?.name || 'None'}
            onChange={(e) => handleArmorSelection(e.target.value)}
            disabled={readOnly}
            className={`w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${retroMode ? 'glow-border sound-click sound-hover' : ''}`}
          >
            <option value="None" className="bg-gray-800">None</option>
            {availableArmors
              .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
              .map((armor) => (
                <option key={armor.name} value={armor.name} className="bg-gray-800">
                  {getRarityStars(armor.rarity)} {armor.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Armor Stats Display */}
      {equippedArmor && (
        <div className="space-y-6">
          {/* Basic Stats */}
          <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
            <h3 className={`text-lg font-bold mb-4 ${retroMode ? 'text-white' : 'text-white'}`}>Armor Properties</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Physical Armor:</span>
                  <span className="text-sm font-bold text-orange-400">{getTotalArmor()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Magic Armor:</span>
                  <span className="text-sm font-bold text-blue-400">{getTotalMagicArmor()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Evade:</span>
                  <span className="text-sm font-bold text-yellow-400">{getTotalEvade()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Weight:</span>
                  <span className="text-sm font-bold text-red-400">{getTotalWeight()}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Type:</span>
                  <span className="text-sm font-bold text-white">{equippedArmor.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Rarity:</span>
                  <span className={`text-sm font-bold ${getRarityColor(equippedArmor.rarity)}`}>
                    {getRarityStars(equippedArmor.rarity)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Bonuses */}
          {equippedArmor.statBonuses && Object.keys(equippedArmor.statBonuses).length > 0 && (
            <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
              <h3 className={`text-lg font-bold mb-4 ${retroMode ? 'text-green-300' : 'text-green-400'}`}>Stat Bonuses</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(equippedArmor.statBonuses).map(([stat, value]) => {
                  if (value === undefined || value === 0) return null;
                  const statKey = stat as StatKey;
                  const color = STAT_COLORS[statKey] === 'rainbow' ? '#ffffff' : STAT_COLORS[statKey];
                  return (
                    <div key={stat} className={`bg-gray-700 rounded-lg p-3 ${retroMode ? 'glow-border' : ''}`}>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat}</div>
                      <div className="text-lg font-bold" style={{ color }}>
                        +{value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resistances */}
          {equippedArmor.resistances && Object.keys(equippedArmor.resistances).length > 0 && (
            <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
              <h3 className={`text-lg font-bold mb-4 ${retroMode ? 'text-blue-300' : 'text-blue-400'}`}>Resistances</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(equippedArmor.resistances).map(([element, value]) => (
                  <div key={element} className={`bg-gray-700 rounded-lg p-3 ${retroMode ? 'glow-border' : ''}`}>
                    <div className="text-sm text-gray-300 mb-1">{element}</div>
                    <div className="text-lg font-bold text-blue-400">{value}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Effects */}
          {equippedArmor.specialEffects && equippedArmor.specialEffects.length > 0 && (
            <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
              <h3 className={`text-lg font-bold mb-4 ${retroMode ? 'text-purple-300' : 'text-purple-400'}`}>Special Effects</h3>
              <div className="space-y-2">
                {equippedArmor.specialEffects.map((effect, index) => (
                  <div key={index} className={`bg-gray-700 rounded-lg p-3 ${retroMode ? 'glow-border' : ''}`}>
                    <p className="text-sm text-purple-300">• {effect}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditional Bonuses */}
          {equippedArmor.conditionalBonuses && Object.keys(equippedArmor.conditionalBonuses).length > 0 && (
            <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
              <h3 className={`text-lg font-bold mb-4 ${retroMode ? 'text-amber-300' : 'text-amber-400'}`}>Conditional Effects</h3>
              <div className="space-y-3">
                {Object.entries(equippedArmor.conditionalBonuses).map(([bonusKey, bonus]) => (
                  <div key={bonusKey} className={`bg-gray-700 rounded-lg p-4 ${retroMode ? 'glow-border' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`flex items-center cursor-pointer ${retroMode ? 'sound-click sound-hover' : ''}`}>
                        <input
                          type="checkbox"
                          checked={localBonusStates[bonusKey] || false}
                          onChange={(e) => handleBonusToggle(bonusKey, e.target.checked)}
                          disabled={readOnly}
                          className={`w-4 h-4 text-amber-400 bg-gray-600 border-gray-500 rounded focus:ring-amber-500 focus:ring-2 ${retroMode ? 'glow-border' : ''}`}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-200">
                          {bonus.condition}
                        </span>
                      </label>
                    </div>
                    
                    {/* Show bonus effects when enabled */}
                    {localBonusStates[bonusKey] && (
                      <div className="mt-3 pl-7 space-y-1">
                        {Object.entries(bonus).map(([stat, value]) => {
                          if (stat === 'condition' || value === undefined || value === 0) return null;
                          
                          let displayStat = stat.toUpperCase();
                          let displayValue = `+${value}`;
                          let color = 'text-amber-300';
                          
                          // Handle special stat formatting
                          if (stat === 'critical') {
                            displayStat = 'Critical';
                            color = 'text-yellow-400';
                          } else if (stat === 'evade') {
                            displayStat = 'Evade';
                            color = 'text-green-400';
                          } else if (stat === 'special') {
                            displayStat = 'Special';
                            displayValue = String(value);
                            color = 'text-purple-400';
                          } else {
                            const statKey = stat as StatKey;
                            if (STAT_COLORS[statKey]) {
                              color = STAT_COLORS[statKey] === 'rainbow' ? 'text-white' : `text-${STAT_COLORS[statKey]}-400`;
                            }
                          }
                          
                          return (
                            <div key={stat} className="text-sm">
                              <span className="text-gray-400">{displayStat}:</span>
                              <span className={`ml-2 font-medium ${color}`}>{displayValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          {equippedArmor.details && (
            <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${retroMode ? 'glow-border' : ''}`}>
              <h3 className={`text-lg font-bold mb-4 ${retroMode ? 'text-cyan-300' : 'text-cyan-400'}`}>Details</h3>
              <p className="text-sm text-gray-300">{equippedArmor.details}</p>
            </div>
          )}
        </div>
      )}

      {/* No Armor Selected */}
      {!equippedArmor && (
        <div className={`panel-soft border border-gray-700 rounded-lg p-8 ${retroMode ? 'glow-border' : ''}`}>
          <div className="text-center text-gray-400">
            <p className={`text-lg font-medium mb-2 ${retroMode ? 'font-retro' : ''}`}>No armor equipped</p>
            <p className="text-sm">Select an armor type and piece to see its stats and effects</p>
          </div>
        </div>
      )}
    </div>
  );
}