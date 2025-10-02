/**
 * SL2 Damage Calculator
 * Port of the C# DamageCalculator for calculating damage output
 */

import { useState } from 'react';
import { Zap, Target } from 'lucide-react';

interface DamageCalculatorProps {
  baseSWA?: number;
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

export default function DamageCalculator({ baseSWA = 0, stats }: DamageCalculatorProps) {
  // Input states
  const [swa, setSWA] = useState(baseSWA);
  const [tomePowerMod, setTomePowerMod] = useState(0);
  const [eleAtk, setEleAtk] = useState(0);
  const [eleMod, setEleMod] = useState(0);
  const [flatTotalP, setFlatTotalP] = useState(0);
  const [flatDMG, setFlatDMG] = useState(0);
  const [hits, setHits] = useState(1);
  const initialFlatMod = 0; // Reserved for future use
  
  // Multiplier states
  const [markedTarget, setMarkedTarget] = useState(false);
  const [chargedWeapon, setChargedWeapon] = useState(0);
  const [eliteEngine, setEliteEngine] = useState(0);
  const [isenshi, setIsenshi] = useState(0);
  
  // Enemy stats
  const [enemyDEF, setEnemyDEF] = useState(0);
  const [enemyRES, setEnemyRES] = useState(0);
  const [enemyArmor, setEnemyArmor] = useState(0);
  const [enemyEleRES, setEnemyEleRES] = useState(0);
  
  // Damage modifiers
  const [physicalDamageBonus, setPhysicalDamageBonus] = useState(0);
  const [elementalDamageBonus, setElementalDamageBonus] = useState(0);
  const [criticalDamageBonus, setCriticalDamageBonus] = useState(150);
  const [isCritical, setIsCritical] = useState(false);

  /**
   * Calculate Total Power (Base formula from C# code)
   */
  const calculateTotalPower = (): number => {
    const totalPower = 
      swa * (1.0 + tomePowerMod * 0.01) +
      eleAtk * (1.0 + eleMod * 0.01) +
      flatTotalP;
    return Math.floor(totalPower);
  };

  /**
   * Calculate Initial DMG (Before defense)
   */
  const calculateInitialDMG = (totalPower: number): number => {
    let initialDMG = totalPower + flatDMG;
    
    // Apply multipliers
    if (markedTarget) {
      initialDMG *= 1.15;
    }
    
    if (chargedWeapon > 0) {
      const chargeBonus = 50.0 - eliteEngine * 15.0;
      initialDMG *= 1.0 + (chargeBonus * chargedWeapon * 0.01);
    }
    
    if (isenshi > 0) {
      initialDMG *= 1.0 + (isenshi * 10.0 * 0.01);
    }
    
    // Divide by number of hits
    initialDMG = initialDMG / hits + initialFlatMod;
    
    return Math.floor(initialDMG);
  };

  /**
   * Calculate damage after defense (Physical)
   */
  const calculatePhysicalDamage = (initialDMG: number): number => {
    // Physical damage reduction
    const defReduction = Math.max(0, enemyDEF - stats.str * 0.5);
    const armorReduction = enemyArmor;
    
    let damage = initialDMG - defReduction - armorReduction;
    
    // Apply physical damage bonus
    damage *= (1 + physicalDamageBonus * 0.01);
    
    // Critical hit
    if (isCritical) {
      damage *= (criticalDamageBonus * 0.01);
    }
    
    return Math.floor(Math.max(1, damage));
  };

  /**
   * Calculate damage after defense (Elemental)
   */
  const calculateElementalDamage = (initialDMG: number): number => {
    // Elemental damage reduction
    const resReduction = Math.max(0, enemyRES - stats.wil * 0.5);
    const eleResReduction = Math.max(0, enemyEleRES);
    
    let damage = initialDMG - resReduction - eleResReduction;
    
    // Apply elemental damage bonus
    damage *= (1 + elementalDamageBonus * 0.01);
    
    // Critical hit
    if (isCritical) {
      damage *= (criticalDamageBonus * 0.01);
    }
    
    return Math.floor(Math.max(1, damage));
  };

  /**
   * Calculate final damage output
   */
  const calculateFinalDamage = (): {
    totalPower: number;
    initialDMG: number;
    physicalDMG: number;
    elementalDMG: number;
    totalDMG: number;
  } => {
    const totalPower = calculateTotalPower();
    const initialDMG = calculateInitialDMG(totalPower);
    const physicalDMG = calculatePhysicalDamage(initialDMG);
    const elementalDMG = calculateElementalDamage(initialDMG);
    const totalDMG = physicalDMG + elementalDMG + flatDMG;
    
    return {
      totalPower,
      initialDMG,
      physicalDMG,
      elementalDMG,
      totalDMG
    };
  };

  const damageResults = calculateFinalDamage();

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap size={28} className="text-yellow-400" />
        <h2 className="text-2xl font-bold">Damage Calculator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Attack Stats */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-red-400">Attack Stats</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Base SWA (Scaled Weapon Attack)
              </label>
              <input
                type="number"
                value={swa}
                onChange={(e) => setSWA(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tome Power Mod (%)
              </label>
              <input
                type="number"
                value={tomePowerMod}
                onChange={(e) => setTomePowerMod(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Elemental ATK
              </label>
              <input
                type="number"
                value={eleAtk}
                onChange={(e) => setEleAtk(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Elemental Mod (%)
              </label>
              <input
                type="number"
                value={eleMod}
                onChange={(e) => setEleMod(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Flat Total Power
              </label>
              <input
                type="number"
                value={flatTotalP}
                onChange={(e) => setFlatTotalP(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Flat DMG
              </label>
              <input
                type="number"
                value={flatDMG}
                onChange={(e) => setFlatDMG(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Number of Hits
              </label>
              <input
                type="number"
                min="1"
                value={hits}
                onChange={(e) => setHits(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Multipliers & Bonuses */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">Multipliers & Bonuses</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={markedTarget}
                onChange={(e) => setMarkedTarget(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Marked Target (+15%)</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">
                Charged Weapon (Rank)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={chargedWeapon}
                onChange={(e) => setChargedWeapon(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
              <span className="text-xs text-gray-400">
                +{(50 - eliteEngine * 15) * chargedWeapon}%
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Elite Engine (Rank)
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={eliteEngine}
                onChange={(e) => setEliteEngine(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
              <span className="text-xs text-gray-400">
                Reduces Charged Weapon bonus by {eliteEngine * 15}%
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Isenshi (Rank)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={isenshi}
                onChange={(e) => setIsenshi(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
              <span className="text-xs text-gray-400">
                +{isenshi * 10}% damage
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Physical Damage Bonus (%)
              </label>
              <input
                type="number"
                value={physicalDamageBonus}
                onChange={(e) => setPhysicalDamageBonus(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Elemental Damage Bonus (%)
              </label>
              <input
                type="number"
                value={elementalDamageBonus}
                onChange={(e) => setElementalDamageBonus(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Critical Damage (%)
              </label>
              <input
                type="number"
                value={criticalDamageBonus}
                onChange={(e) => setCriticalDamageBonus(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isCritical}
                onChange={(e) => setIsCritical(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Critical Hit</span>
            </label>
          </div>
        </div>

        {/* Enemy Stats */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Target size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-400">Enemy Stats</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Enemy DEF
              </label>
              <input
                type="number"
                value={enemyDEF}
                onChange={(e) => setEnemyDEF(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enemy RES
              </label>
              <input
                type="number"
                value={enemyRES}
                onChange={(e) => setEnemyRES(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enemy Armor
              </label>
              <input
                type="number"
                value={enemyArmor}
                onChange={(e) => setEnemyArmor(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enemy Elemental RES
              </label>
              <input
                type="number"
                value={enemyEleRES}
                onChange={(e) => setEnemyEleRES(Number(e.target.value))}
                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
              />
            </div>

            <div className="pt-4 border-t border-gray-600">
              <div className="text-sm text-gray-300 space-y-1">
                <div>Your STR: <span className="text-white font-semibold">{stats.str}</span></div>
                <div>Your WIL: <span className="text-white font-semibold">{stats.wil}</span></div>
                <div className="text-xs text-gray-400 mt-2">
                  STR reduces enemy DEF effectiveness<br />
                  WIL reduces enemy RES effectiveness
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 bg-gradient-to-br from-red-900 to-orange-900 p-6 rounded-lg">
        <h3 className="text-2xl font-bold mb-4 text-center">Damage Output</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Total Power</div>
            <div className="text-2xl font-bold text-blue-400">{damageResults.totalPower}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Initial DMG</div>
            <div className="text-2xl font-bold text-purple-400">{damageResults.initialDMG}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Physical DMG</div>
            <div className="text-2xl font-bold text-red-400">{damageResults.physicalDMG}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center">
            <div className="text-sm text-gray-300">Elemental DMG</div>
            <div className="text-2xl font-bold text-cyan-400">{damageResults.elementalDMG}</div>
          </div>
          
          <div className="bg-black bg-opacity-30 p-3 rounded text-center col-span-2 md:col-span-1">
            <div className="text-sm text-gray-300">Total DMG</div>
            <div className="text-3xl font-bold text-yellow-400">{damageResults.totalDMG}</div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-300">
          {isCritical && <span className="text-yellow-300 font-semibold">★ CRITICAL HIT ★ </span>}
          {hits > 1 && <span>Damage per hit: {Math.floor(damageResults.totalDMG)} × {hits} hits</span>}
        </div>
      </div>
    </div>
  );
}
