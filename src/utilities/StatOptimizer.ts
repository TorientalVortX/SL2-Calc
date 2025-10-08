/**
 * StatOptimizer - Automated stat allocation and build optimization
 * 
 * This class handles all the complex logic for automatically optimizing character builds
 * including stat allocation, genetic algorithms, and build evaluation.
 */

import type {
  StatKey,
  StatRecord,
  BuildType,
  OptimizationResult,
  OptimizationParams
} from '../types';

// Import data constants needed for calculations
import { RACES, SUBRACES } from '../data/races';
import { CLASSES, CLASS_PASSIVES } from '../data/classes';
import { FOODS, HISTORY, LEGEND_EXTEND, ASTROLOGY_PLANETS } from '../data/bonuses';
import { BUILD_TYPES } from '../data/stats';

/**
 * Main StatOptimizer class for automated build generation and optimization
 * 
 * Features:
 * - Genetic algorithm-based stat allocation
 * - Multi-objective optimization (damage, survivability, efficiency)
 * - Build type compatibility analysis
 * - Weapon scaling optimization
 * - Class synergy evaluation
 * - Custom weight support
 * - Target stat mode
 */
export class StatOptimizer {
  private buildType: BuildType;
  private params: OptimizationParams;
  private maxPoints: number;
  
  constructor(buildType: BuildType, params: OptimizationParams) {
    this.buildType = buildType;
    this.params = params;
    this.maxPoints = 240; // Level 60 stat points
  }

  /**
   * Calculate minimum Faith investment needed for target youkai count
   * Formula: (target_youkai - 5) * 5 minimum invested points
   * This accounts for the Faith investment thresholds in SL2
   */
  private getMinimumFaithForYoukai(targetYoukai: number): number {
    if (targetYoukai <= 5) return 0; // No Faith needed for base 5 youkai
    
    // Simple calculation: each extra youkai beyond 5 needs roughly 5 Faith
    // This gives us reasonable minimums like 35 Faith for 12 youkai
    const extraYoukai = targetYoukai - 5;
    const minimumFaith = extraYoukai * 5;
    return minimumFaith;
  }

  /**
   * Calculate custom weight priorities based on user preferences
   */
  private getCustomWeightPriorities(): Record<StatKey, number> {
    const priorities: Record<StatKey, number> = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    const weights = this.params.customWeights;
    if (!weights) return priorities;

    // Summoner-specific weights
    if (weights.youkaiCount) {
      const baseYoukai = 5; // Base youkai count with 0 faith
      const targetYoukai = weights.youkaiCount;
      const extraYoukai = Math.max(0, targetYoukai - baseYoukai); // How many extra beyond base
      const youkaiWeight = extraYoukai / 7; // Normalize 0-7 extra to 0-1 (max 12 total)
      
      // Calculate minimum Faith investment needed for this youkai target
      const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
      const faithWeightBonus = Math.min(1.0, minFaithNeeded / 35); // Scale bonus based on Faith requirement
      
      priorities.wil += youkaiWeight * 15; // More WIL for FP to sustain youkai
      priorities.fai += youkaiWeight * 25 + faithWeightBonus * 15; // Extra FAI priority for threshold investments
      // SAN removed - it doesn't meaningfully help with youkai management
    }

    if (weights.summonSurvivability) {
      const survivalWeight = weights.summonSurvivability / 10;
      priorities.wil += survivalWeight * 8;  // WIL for more FP for heals
    }

    // Combat focus weights
    if (weights.criticalFocus) {
      const critWeight = weights.criticalFocus / 10;
      priorities.luc += critWeight * 15;
      priorities.gui += critWeight * 12;
      priorities.ski += critWeight * 8; // Accuracy for crits to land
    }

    if (weights.magicDamageFocus) {
      const magicWeight = weights.magicDamageFocus / 10;
      priorities.wil += magicWeight * 18;
      priorities.ski += magicWeight * 10; // Spell accuracy
      priorities.fai += magicWeight * 6;  // For light/dark magic
    }

    if (weights.physicalDamageFocus) {
      const physWeight = weights.physicalDamageFocus / 10;
      priorities.str += physWeight * 18;
      priorities.ski += physWeight * 12; // Physical accuracy
      priorities.gui += physWeight * 8;  // Crit for physical
    }

    if (weights.accuracyFocus) {
      const accWeight = weights.accuracyFocus / 10;
      priorities.ski += accWeight * 20; // Direct accuracy boost
      priorities.luc += accWeight * 5;  // Hit bonus from LUC
    }

    // Defensive weights
    if (weights.minimumHP) {
      // When HP minimum is specified, boost VIT priority significantly
      priorities.vit += 50; // Strong priority for reaching minimum HP
      priorities.str += 5; // Slight STR for carry capacity
    }

    if (weights.fpPriority) {
      const fpWeight = weights.fpPriority / 10;
      priorities.wil += fpWeight * 20;
      priorities.fai += fpWeight * 5; // FAI affects max FP slightly
    }

    if (weights.physicalDefense) {
      const pdefWeight = weights.physicalDefense / 10;
      priorities.def += pdefWeight * 18;
      priorities.vit += pdefWeight * 8; // HP to survive hits
    }

    if (weights.magicalDefense) {
      const mdefWeight = weights.magicalDefense / 10;
      priorities.res += mdefWeight * 18;
      priorities.wil += mdefWeight * 6; // FP for magical endurance
    }

    // Utility weights
    if (weights.initiativePriority) {
      const initWeight = weights.initiativePriority / 10;
      priorities.cel += initWeight * 16; // CEL is primary initiative stat
      priorities.luc += initWeight * 6;  // LUC affects initiative slightly
    }

    if (weights.statusResistance) {
      const statusWeight = weights.statusResistance / 10;
      priorities.san += statusWeight * 15; // Primary status resistance
      priorities.fai += statusWeight * 8;  // Faith helps with some statuses
      priorities.wil += statusWeight * 5;  // Mental fortitude
    }

    if (weights.carryCapacity) {
      const carryWeight = weights.carryCapacity / 10;
      priorities.str += carryWeight * 12; // STR affects carry weight
    }

    if (weights.targetEvade) {
      // Calculate how much CEL we need to reach target evade
      // Formula: Evade = (CEL * 2) + baseEvade + bonusEvade
      // So: CEL needed = (targetEvade - baseEvade - bonusEvade) / 2
      const baseEvade = this.params.baseEvade || 0;
      const bonusEvade = this.params.bonusEvade || 0; 
      const celNeeded = Math.max(0, (weights.targetEvade - baseEvade - bonusEvade) / 2);
      
      // Boost CEL priority based on how much we need
      priorities.cel += Math.min(50, celNeeded); // Cap at 50 priority boost
      priorities.luc += 10; // LUC also affects dodge chance
    }

    // Advanced weights
    if (weights.targetAPT) {
      // When APT target is specified, boost APT priority significantly
      priorities.apt += 50; // Strong priority for reaching target APT
    }

    return priorities;
  }

  /**
   * Get weapon scaling preferences for a class combination
   */
  private getWeaponScalingPriorities(): Record<StatKey, number> {
    const priorities: Record<StatKey, number> = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    // Analyze valid weapons for both classes
    const mainClassWeapons = CLASSES[this.params.mainClass]?.validWeapons || [];
    const subClassWeapons = CLASSES[this.params.subClass]?.validWeapons || [];
    const allWeapons = [...new Set([...mainClassWeapons, ...subClassWeapons])];

    // Weapon scaling priorities based on SL2 weapon mechanics
    const weaponScaling: Record<string, StatKey[]> = {
      'Swords': ['str', 'ski'],
      'Axes': ['str'],
      'Spears': ['str', 'ski'],
      'Bows': ['str', 'ski'],
      'Guns': ['gui', 'ski'],
      'Daggers': ['gui', 'ski'],
      'Tomes': ['wil', 'ski'],
      'Fist': ['str', 'ski']
    };

    // Add weapon scaling priorities
    allWeapons.forEach(weapon => {
      const stats = weaponScaling[weapon] || [];
      stats.forEach((stat, index) => {
        priorities[stat] += (stats.length - index) * 2; // Primary stats get higher priority
      });
    });

    return priorities;
  }

  /**
   * Calculate class synergy bonuses for stat allocation
   */
  private getClassSynergyPriorities(): Record<StatKey, number> {
    const priorities: Record<StatKey, number> = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    // Analyze class stat bonuses and synergies
    const mainClassStats = CLASSES[this.params.mainClass] || {};
    const subClassStats = CLASSES[this.params.subClass] || {};

    // Add bonuses for class stat preferences
    Object.entries(mainClassStats).forEach(([stat, value]) => {
      if (stat in priorities && typeof value === 'number' && value > 0) {
        priorities[stat as StatKey] += value * 2;
      }
    });

    Object.entries(subClassStats).forEach(([stat, value]) => {
      if (stat in priorities && typeof value === 'number' && value > 0) {
        priorities[stat as StatKey] += value;
      }
    });

    return priorities;
  }

  /**
   * Calculate APT efficiency - how much APT is worth vs direct stat investment
   * APT should always be optimized in multiples of 6 for maximum efficiency
   */
  private calculateAptEfficiency(currentApt: number): number {
    const aptBonusPerStat = Math.floor((currentApt + 1) / 6) - Math.floor(currentApt / 6);
    return aptBonusPerStat * 11; // APT affects 11 other stats
  }

  /**
   * Get the next efficient APT target (next multiple of 6 that provides a bonus)
   */
  private getNextAptTarget(allocation: StatRecord): number {
    const subraceData = SUBRACES[this.params.subrace];
    const baseRacial = subraceData?.apt || 0;
    const currentAllocated = allocation.apt;
    const totalApt = baseRacial + currentAllocated;
    
    // Find next multiple of 6 above current total
    const nextThreshold = Math.ceil(totalApt / 6) * 6;
    return Math.max(0, nextThreshold - baseRacial);
  }

  /**
   * Check if APT allocation is efficient (final APT divisible by 6)
   */
  private isAptAllocationEfficient(allocation: StatRecord): boolean {
    const finalAPT = this.calculateFinalStat(allocation, 'apt');
    return finalAPT % 6 === 0;
  }

  /**
   * Optimize stat allocation using genetic algorithm approach
   */
  optimize(): OptimizationResult {
    const maxIterations = 500; // Reduced for better performance
    const populationSize = 30;
    
    let bestAllocation = this.generateInitialAllocation();
    let bestScore = this.evaluateAllocation(bestAllocation);
    
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Validate build type compatibility
    const mainClassCompatibility = this.buildType.classCompatibility?.[this.params.mainClass] || 5;
    const subClassCompatibility = this.buildType.classCompatibility?.[this.params.subClass] || 5;
    
    if (mainClassCompatibility < 6) {
      warnings.push(`${this.params.mainClass} has low compatibility (${mainClassCompatibility}/10) with ${this.buildType.name} builds`);
    }
    if (subClassCompatibility < 6) {
      warnings.push(`${this.params.subClass} has low compatibility (${subClassCompatibility}/10) with ${this.buildType.name} builds`);
    }

    // Check for obvious conflicts
    if (this.buildType.name.includes('Tank') && this.params.subrace === 'Lich') {
      warnings.push('Lich race has reduced HP which conflicts with tank builds');
    }

    // Generate initial population
    const population: StatRecord[] = [];
    for (let i = 0; i < populationSize; i++) {
      population.push(this.generateRandomAllocation());
    }

    // Add the initial smart allocation to population
    population[0] = bestAllocation;

    // Evolution loop with early termination
    let bestScoreImprovement = 0;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Evaluate and sort population
      const scored = population.map(allocation => ({
        allocation,
        score: this.evaluateAllocation(allocation)
      })).sort((a, b) => b.score - a.score);

      // Update best if improved
      if (scored[0].score > bestScore) {
        const improvement = scored[0].score - bestScore;
        bestScore = scored[0].score;
        bestAllocation = { ...scored[0].allocation };
        bestScoreImprovement = improvement;
      }

      // Early termination if we haven't improved in a while
      if (iteration > 100 && bestScoreImprovement < 1) {
        break;
      }

      // Generate new population (keep top 30%, mutate top 60%, random 10%)
      const newPopulation: StatRecord[] = [];
      
      // Keep elite
      const eliteCount = Math.floor(populationSize * 0.3);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ ...scored[i].allocation });
      }

      // Mutate good solutions
      const mutationCount = Math.floor(populationSize * 0.6);
      for (let i = 0; i < mutationCount; i++) {
        const parent = scored[i % eliteCount].allocation;
        newPopulation.push(this.mutateAllocation(parent));
      }

      // Add random solutions
      while (newPopulation.length < populationSize) {
        newPopulation.push(this.generateRandomAllocation());
      }

      population.splice(0, population.length, ...newPopulation);
    }

    // Generate reasoning based on final allocation
    reasoning.push(`Build Type: ${this.buildType.name} - ${this.buildType.description}`);
    reasoning.push(`Optimized for ${this.params.mainClass}/${this.params.subClass} combination`);
    
    // Analyze final stats against thresholds
    const finalStats: Record<string, number> = {};
    const allocatedPoints: Record<string, number> = {};
    Object.entries(bestAllocation).forEach(([stat]) => {
      finalStats[stat] = this.calculateFinalStat(bestAllocation, stat as StatKey);
      allocatedPoints[stat] = bestAllocation[stat as StatKey];
    });

    // Add debug information about stat efficiency
    const subraceData = SUBRACES[this.params.subrace];
    Object.entries(allocatedPoints).forEach(([stat, allocated]) => {
      if (allocated > 0) {
        const baseRacial = subraceData?.[stat as StatKey] || 0;
        const final = finalStats[stat];
        const efficiency = allocated > 0 ? final / allocated : 0;
        const softCap = baseRacial + 40;
        
        if (stat === 'apt') {
          const totalApt = baseRacial + allocated;
          const aptBonus = Math.floor(totalApt / 6);
          const isEfficient = totalApt % 6 === 0;
          reasoning.push(`APT: ${allocated} points → ${final} final (${aptBonus} bonus to all stats, ${isEfficient ? 'efficient' : 'INEFFICIENT'} allocation)`);
        } else if (allocated > 50) {
          reasoning.push(`${stat.toUpperCase()}: ${allocated} points → ${final} final (efficiency: ${efficiency.toFixed(2)}, soft cap: ${softCap})`);
        }
      }
    });

    // Check thresholds and add reasoning/warnings
    Object.entries(this.buildType.statThresholds).forEach(([stat, thresholds]) => {
      const finalStat = finalStats[stat];
      if (thresholds?.min && finalStat < thresholds.min) {
        warnings.push(`${stat.toUpperCase()} (${finalStat}) is below minimum threshold (${thresholds.min})`);
      } else if (thresholds?.ideal && finalStat >= thresholds.ideal) {
        reasoning.push(`${stat.toUpperCase()} meets ideal threshold (${finalStat}/${thresholds.ideal})`);
      } else if (thresholds?.min && finalStat >= thresholds.min) {
        reasoning.push(`${stat.toUpperCase()} meets minimum requirement (${finalStat}/${thresholds.min})`);
      }
    });

    // APT efficiency analysis
    const aptValue = finalStats['apt'];
    const aptBonus = Math.floor(aptValue / 6);
    if (aptBonus > 0) {
      reasoning.push(`APT investment provides +${aptBonus} to all other stats (${aptValue}/6 ratio)`);
    }

    // Custom weight analysis
    if (this.params.customWeights) {
      const activeWeights = Object.entries(this.params.customWeights)
        .filter(([, value]) => typeof value === 'number' && value > 5) // Only show significant preferences
        .map(([key, value]) => {
          const numValue = value as number;
          const weightNames: Record<string, string> = {
            youkaiCount: `${numValue} Youkai slots (${this.getMinimumFaithForYoukai(numValue)} Faith min, ${this.calculateYoukaiFPRequirement(numValue)} FP needed)`,
            criticalFocus: 'Critical focus',
            magicDamageFocus: 'Magic damage',
            physicalDamageFocus: 'Physical damage',
            accuracyFocus: 'Accuracy focus',
            hpPriority: 'HP priority',
            fpPriority: 'FP priority',
            physicalDefense: 'Physical defense',
            magicalDefense: 'Magical defense',
            initiativePriority: 'Initiative priority',
            statusResistance: 'Status resistance',
            targetEvade: 'Target evade value',
            multiclassEfficiency: 'Multiclass efficiency'
          };
          return weightNames[key] || key;
        });
      
      if (activeWeights.length > 0) {
        reasoning.push(`Custom preferences: ${activeWeights.join(', ')}`);
        
        // Add explanation for youkai FP calculation if youkai are involved
        if (this.params.customWeights?.youkaiCount) {
          const isShapeshifter = this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter';
          const isGrandSummoner = this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner';
          const isBonder = this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder';
          const isSummoner = this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner';
          
          if (isShapeshifter && !isSummoner) {
            reasoning.push(`Shapeshifter FP: Optimized for Install skills (low sustained FP needs)`);
          } else if (isGrandSummoner && !isSummoner) {
            reasoning.push(`Grand Summoner FP: Optimized for youkai skills (moderate FP needs)`);
          } else if (isBonder && !isSummoner) {
            reasoning.push(`Bonder FP: Optimized for bonds and utility (low-moderate FP needs)`);
          } else if (isSummoner) {
            reasoning.push(`Summoner FP: Optimized for multiple active youkai (high sustained FP)`);
          }
        }
      }
      
      // HP/FP goal analysis
      if (this.params.customWeights?.minimumHP) {
        const actualHP = this.calculateAccurateHP(bestAllocation);
        const minHP = this.params.customWeights.minimumHP;
        
        if (actualHP >= minHP) {
          reasoning.push(`HP meets minimum requirement (${actualHP}/${minHP})`);
        } else {
          reasoning.push(`HP below minimum requirement (${actualHP}/${minHP})`);
        }
      }
      
      if (this.params.customWeights?.targetAPT) {
        const aptStat = finalStats['apt'];
        const targetAPT = this.params.customWeights.targetAPT;
        
        if (aptStat >= targetAPT) {
          reasoning.push(`APT meets target requirement (${aptStat}/${targetAPT})`);
        } else {
          reasoning.push(`APT below target requirement (${aptStat}/${targetAPT})`);
        }
      }
      
      // Legacy HP analysis (for builds not using minimum HP)
      if (!this.params.customWeights?.minimumHP) {
        const vitStat = finalStats['vit'];
        const sanStat = finalStats['san'];
        const strAllocated = bestAllocation.str; // Use allocated STR, not final
        
        // Basic HP calculation (simplified, without all bonuses for reasoning clarity)
        let estimatedHP = vitStat * 10 + sanStat * 2 + strAllocated * 3;
        if (this.params.customHP) {
          estimatedHP += this.params.customHP;
        }
        
        const hpStatus = estimatedHP >= 700 ? 'achieved' : 'below target';
        reasoning.push(`HP Goal: ${estimatedHP} HP (700+ target ${hpStatus})`);
      }
      
      if (this.params.customWeights?.fpPriority && this.params.customWeights.fpPriority > 5) {
        const wilStat = finalStats['wil'];
        const sanStat = finalStats['san'];
        const actualFP = wilStat * 2 + sanStat + (this.params.customFP || 0);
        const fpStatus = actualFP >= 200 ? 'achieved' : 'below target';
        reasoning.push(`FP Goal: ${actualFP} FP (200+ target ${fpStatus})`);
      }
    }

    // Weapon compatibility
    if (this.params.prioritizeWeaponScaling) {
      const weaponPriorities = this.getWeaponScalingPriorities();
      const prioritizedStats = Object.entries(weaponPriorities)
        .filter(([, priority]) => priority > 0)
        .map(([stat]) => stat.toUpperCase());
      
      if (prioritizedStats.length > 0) {
        reasoning.push(`Weapon scaling prioritized: ${prioritizedStats.join(', ')}`);
      }
    }

    return {
      stats: bestAllocation, // Final calculated stats
      race: this.params.race,
      subrace: this.params.subrace,
      mainClass: this.params.mainClass,
      subClass: this.params.subClass,
      allocatedStats: bestAllocation,
      totalPoints: this.calculateTotalPoints(bestAllocation),
      score: bestScore,
      reasoning,
      warnings,
      analysis: {}
    };
  }

  /**
   * Generate initial allocation based on build type priorities
   */
  private generateInitialAllocation(): StatRecord {
    const allocation: StatRecord = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    let remainingPoints = this.maxPoints;
    const weaponPriorities = this.getWeaponScalingPriorities();
    const classPriorities = this.getClassSynergyPriorities();
    const customPriorities = this.getCustomWeightPriorities();

    // Calculate combined priorities
    const combinedPriorities: Record<StatKey, number> = {} as Record<StatKey, number>;
    Object.keys(allocation).forEach(stat => {
      const statKey = stat as StatKey;
      combinedPriorities[statKey] = 
        this.buildType.statPriorities[statKey] * 3 + 
        weaponPriorities[statKey] * 2 + 
        classPriorities[statKey] +
        customPriorities[statKey] * 1.5; // Custom weights have significant influence
    });

    // Allocate based on priorities and thresholds
    const sortedStats = Object.entries(combinedPriorities)
      .sort(([,a], [,b]) => b - a)
      .map(([stat]) => stat as StatKey);

    // First pass: meet minimum thresholds efficiently, but handle APT specially
    sortedStats.forEach(stat => {
      const threshold = this.buildType.statThresholds[stat];
      if (threshold?.min && remainingPoints > 0) {
        if (stat === 'apt') {
          // For APT, find the next efficient target (multiple of 6)
          const nextTarget = this.getNextAptTarget(allocation);
          if (nextTarget > 0 && nextTarget <= remainingPoints) {
            allocation.apt = nextTarget;
            remainingPoints -= nextTarget;
          }
        } else {
          // Calculate how many points we need to allocate to reach the minimum final stat
          let needed = 0;
          while (this.calculateFinalStat(allocation, stat) < threshold.min && needed < remainingPoints) {
            needed++;
            allocation[stat]++;
          }
          remainingPoints -= needed;
          allocation[stat] -= needed; // Reset and properly allocate
          
          // Now allocate the calculated amount
          const allocate = Math.min(needed, remainingPoints);
          allocation[stat] += allocate;
          remainingPoints -= allocate;
        }
      }
    });

    // Second pass: approach ideal thresholds but respect diminishing returns and APT efficiency
    sortedStats.forEach(stat => {
      const threshold = this.buildType.statThresholds[stat];
      if (threshold?.ideal && remainingPoints > 0) {
        if (stat === 'apt') {
          // For APT, only invest in efficient amounts (final APT divisible by 6)
          const currentFinalAPT = this.calculateFinalStat(allocation, 'apt');
          const targetFinalAPT = Math.min(threshold.ideal, Math.floor(threshold.ideal / 6) * 6);
          
          if (targetFinalAPT > currentFinalAPT) {
            // Find the minimum investment to reach the target
            for (let investment = 1; investment <= remainingPoints; investment++) {
              const testAllocation = {...allocation, apt: allocation.apt + investment};
              const testFinalAPT = this.calculateFinalStat(testAllocation, 'apt');
              if (testFinalAPT >= targetFinalAPT) {
                allocation.apt += investment;
                remainingPoints -= investment;
                break;
              }
            }
          }
        } else {
          // Only allocate if we're not getting heavily diminished returns
          while (remainingPoints > 0 && this.calculateFinalStat(allocation, stat) < threshold.ideal) {
            const currentFinal = this.calculateFinalStat(allocation, stat);
            const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
            const efficiency = nextFinal - currentFinal; // How much final stat we gain per point
            
            // Stop if efficiency drops too low (heavy diminishing returns)
            if (efficiency < 0.5) break;
            
            allocation[stat]++;
            remainingPoints--;
          }
        }
      }
    });

    // Third pass: distribute remaining points by priority, but avoid inefficient allocations and fix APT
    while (remainingPoints > 0) {
      let allocated = false;
      
      // First, try to fix any inefficient APT allocation
      if (!this.isAptAllocationEfficient(allocation) && remainingPoints >= 6) {
        const nextTarget = this.getNextAptTarget(allocation);
        const currentApt = allocation.apt;
        const pointsNeeded = nextTarget - currentApt;
        
        if (pointsNeeded > 0 && pointsNeeded <= remainingPoints) {
          allocation.apt += pointsNeeded;
          remainingPoints -= pointsNeeded;
          allocated = true;
          continue;
        }
      }
      
      for (const stat of sortedStats) {
        if (remainingPoints <= 0) break;
        
        const currentFinal = this.calculateFinalStat(allocation, stat);
        const threshold = this.buildType.statThresholds[stat];
        
        // Don't exceed max thresholds
        if (threshold?.max && currentFinal >= threshold.max) continue;
        
        // Special handling for APT - only invest in multiples of 6
        if (stat === 'apt') {
          if (remainingPoints >= 6 && this.isAptAllocationEfficient(allocation)) {
            const nextTarget = this.getNextAptTarget(allocation);
            const pointsNeeded = nextTarget - allocation.apt;
            if (pointsNeeded === 6 && remainingPoints >= 6) {
              allocation.apt += 6;
              remainingPoints -= 6;
              allocated = true;
              break;
            }
          }
        } else {
          // Check efficiency before allocating
          const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
          const efficiency = nextFinal - currentFinal;
          
          // Only allocate if we get reasonable efficiency (avoid heavy diminishing returns)
          if (efficiency >= 0.4) {
            allocation[stat]++;
            remainingPoints--;
            allocated = true;
            break; // Allocate one point at a time to maintain priority order
          }
        }
      }
      
      // If no efficient allocations found, reduce efficiency threshold
      if (!allocated) {
        for (const stat of sortedStats) {
          if (remainingPoints <= 0) break;
          
          const currentFinal = this.calculateFinalStat(allocation, stat);
          const threshold = this.buildType.statThresholds[stat];
          
          if (threshold?.max && currentFinal >= threshold.max) continue;
          
          // Skip APT if it's not efficient
          if (stat === 'apt' && !this.isAptAllocationEfficient(allocation) && remainingPoints < 6) continue;
          
          const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
          const efficiency = nextFinal - currentFinal;
          
          // Lower threshold for final allocation
          if (efficiency >= 0.2) {
            allocation[stat]++;
            remainingPoints--;
            allocated = true;
            break;
          }
        }
      }
      
      // Prevent infinite loop - if we can't allocate efficiently, just dump points
      if (!allocated && remainingPoints > 0) {
        // Find the highest priority stat that isn't maxed and isn't APT (unless APT is efficient)
        for (const stat of sortedStats) {
          const threshold = this.buildType.statThresholds[stat];
          const currentFinal = this.calculateFinalStat(allocation, stat);
          
          if (stat === 'apt' && !this.isAptAllocationEfficient(allocation) && remainingPoints < 6) continue;
          
          if (!threshold?.max || currentFinal < threshold.max) {
            allocation[stat] += remainingPoints;
            remainingPoints = 0;
            break;
          }
        }
      }
    }

    return allocation;
  }

  /**
   * Generate random allocation for genetic algorithm (with efficiency constraints)
   */
  private generateRandomAllocation(): StatRecord {
    const allocation: StatRecord = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    let remainingPoints = this.maxPoints;
    
    // HARD CONSTRAINT: Ensure minimum Faith for youkai count first
    const weights = this.params.customWeights;
    if (weights?.youkaiCount && (
      this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
      this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
      this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
      this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
    )) {
      const targetYoukai = weights.youkaiCount;
      const minInvestedFaith = this.getMinimumFaithForYoukai(targetYoukai);
      allocation.fai = minInvestedFaith;
      remainingPoints -= minInvestedFaith;
    }

    // HARD CONSTRAINT: Ensure minimum HP if specified
    if (weights?.minimumHP) {
      // Better HP estimation based on actual formula: VIT*10 + SAN*2 + STR*3 + ~350 base
      const targetHP = weights.minimumHP;
      const baseHP = 350; // Approximate base HP from race/class/level
      const estimatedSTRContrib = 20 * 3; // Assume ~20 STR allocation average
      const estimatedSANContrib = 10 * 2; // Assume ~10 SAN average
      const neededFromVIT = targetHP - baseHP - estimatedSTRContrib - estimatedSANContrib;
      const estimatedVITNeeded = Math.max(0, Math.ceil(neededFromVIT / 10)); 
      const vitToAllocate = Math.min(40, estimatedVITNeeded); // Reasonable cap
      allocation.vit = vitToAllocate;
      remainingPoints -= vitToAllocate;
    }

    // HARD CONSTRAINT: Ensure target APT if specified  (36 or 42)
    if (weights?.targetAPT) {
      const targetAPT = weights.targetAPT; // Already 36 or 42 (both divisible by 6)
      
      // Binary search to find the minimum investment needed to reach target final APT
      let low = 0;
      let high = 80;
      let bestAllocation = 0;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const testAllocation = {...allocation, apt: mid};
        const finalAPT = this.calculateFinalStat(testAllocation, 'apt');
        
        if (finalAPT >= targetAPT) {
          bestAllocation = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      
      const aptToAllocate = Math.min(50, bestAllocation); // Cap at reasonable amount
      allocation.apt = aptToAllocate;
      remainingPoints -= aptToAllocate;
    }

    const stats = Object.keys(allocation).filter(stat => stat !== 'apt') as StatKey[];

    while (remainingPoints > 0) {
      const stat = stats[Math.floor(Math.random() * stats.length)];
      const currentFinal = this.calculateFinalStat(allocation, stat);
      const threshold = this.buildType.statThresholds[stat];
      
      // Respect max thresholds
      if (threshold?.max && currentFinal >= threshold.max) continue;
      
      // Don't allocate more than 80 points to any single stat (this prevents extreme allocations)
      if (allocation[stat] >= 80) continue;
      
      // Check efficiency - don't make completely inefficient allocations
      const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
      const efficiency = nextFinal - currentFinal;
      
      // Allow random allocations but bias towards efficient ones
      if (Math.random() < 0.7 && efficiency < 0.3) continue;
      
      allocation[stat]++;
      remainingPoints--;
    }

    return allocation;
  }

  /**
   * Mutate allocation for genetic algorithm (APT excluded from mutations)
   */
  private mutateAllocation(parent: StatRecord): StatRecord {
    const child = { ...parent };
    const mutationRate = 0.1;
    const mutationStrength = 3; // Reduced from 5 to prevent extreme mutations

    const stats = Object.keys(child).filter(stat => stat !== 'apt') as StatKey[];
    
    // Randomly adjust some stats (APT excluded since it's fixed at target)
    stats.forEach(stat => {
      if (Math.random() < mutationRate) {
        const change = Math.floor((Math.random() - 0.5) * mutationStrength * 2);
        
        // Special handling for Faith - never allow it to go below minimum requirement
        if (stat === 'fai') {
          const weights = this.params.customWeights;
          if (weights?.youkaiCount && (
            this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
            this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
            this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
            this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
          )) {
            const targetYoukai = weights.youkaiCount;
            const minFaith = this.getMinimumFaithForYoukai(targetYoukai);
            child[stat] = Math.max(minFaith, Math.min(80, child[stat] + change));
          } else {
            child[stat] = Math.max(0, Math.min(80, child[stat] + change));
          }
        } else {
          child[stat] = Math.max(0, Math.min(80, child[stat] + change)); // Cap at 80 points per stat
        }
      }
    });

    // Normalize to stay within point limit
    const totalPoints = this.calculateTotalPoints(child);
    if (totalPoints !== this.maxPoints) {
      const difference = totalPoints - this.maxPoints;
      if (difference > 0) {
        // Remove excess points, prioritizing stats with poor efficiency (APT excluded)
        for (let i = 0; i < difference; i++) {
          const reducibleStats = stats.filter(s => child[s] > 0);
          if (reducibleStats.length > 0) {
            // Try to reduce from stats that are giving poor returns first
            let statToReduce = reducibleStats[0];
            let worstEfficiency = 1.0;
            
            for (const stat of reducibleStats) {
              if (child[stat] > 0) {
                // Check if this stat can actually be reduced
                let canReduce = true;
                
                // Special check for Faith - don't reduce below minimum requirement
                if (stat === 'fai') {
                  const weights = this.params.customWeights;
                  if (weights?.youkaiCount && (
                    this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
                    this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
                    this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
                    this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
                  )) {
                    const targetYoukai = weights.youkaiCount;
                    const minFaith = this.getMinimumFaithForYoukai(targetYoukai);
                    canReduce = child[stat] > minFaith;
                  }
                }
                
                if (!canReduce) continue; // Skip stats that can't be reduced
                
                const currentFinal = this.calculateFinalStat(child, stat);
                const reducedFinal = this.calculateFinalStat({...child, [stat]: child[stat] - 1}, stat);
                const efficiency = currentFinal - reducedFinal;
                  
                if (efficiency < worstEfficiency) {
                  worstEfficiency = efficiency;
                  statToReduce = stat;
                }
              }
            }
            
            child[statToReduce]--;
          }
        }
      } else {
        // Add missing points to efficient stats (APT excluded)
        for (let i = 0; i < -difference; i++) {
          // Find most efficient stat to add to
          let bestStat = stats[0];
          let bestEfficiency = 0;
          
          for (const stat of stats) {
            if (child[stat] < 80) { // Don't exceed our cap
              const currentFinal = this.calculateFinalStat(child, stat);
              const nextFinal = this.calculateFinalStat({...child, [stat]: child[stat] + 1}, stat);
              const efficiency = nextFinal - currentFinal;
              
              if (efficiency > bestEfficiency) {
                bestEfficiency = efficiency;
                bestStat = stat;
              }
            }
          }
          
          child[bestStat]++;
        }
      }
    }

    return child;
  }

  /**
   * Calculate accurate HP using the same formula as the main calculator
   */
  private calculateAccurateHP(allocation: StatRecord): number {
    const vitStat = this.calculateFinalStat(allocation, 'vit');
    const sanStat = this.calculateFinalStat(allocation, 'san');
    const strAllocated = allocation.str; // Only allocated STR counts for STR HP bonus
    
    // Base HP calculations
    let vitHP = Math.floor(vitStat * 10);
    const sanHP = Math.floor(sanStat * 2);
    const strHP = strAllocated * 3; // STR HP is based on allocated points, not final stat
    
    // Apply homunculi penalty if applicable
    const subraceData = SUBRACES[this.params.subrace];
    const raceData = RACES[this.params.race];
    if (raceData?.homunculi || subraceData?.homunculi) {
      vitHP -= Math.floor(vitStat / 2);
    }
    
    // Calculate points spent (this would need actual point calculation, simplified for now)
    const totalAllocated = Object.values(allocation).reduce((sum, points) => sum + points, 0);
    const maxPoints = this.params.targetLevel * 4; // 4 points per level
    const pointsSpent = maxPoints - (maxPoints - totalAllocated);
    
    let maxHP = vitHP + sanHP + strHP + pointsSpent;
    
    // Add custom HP if provided
    if (this.params.customHP) {
      maxHP += this.params.customHP;
    }
    
    return maxHP;
  }

  /**
   * Calculate accurate FP using the same formula as the main calculator
   */
  private calculateAccurateFP(allocation: StatRecord): number {
    const wilStat = this.calculateFinalStat(allocation, 'wil');
    const sanStat = this.calculateFinalStat(allocation, 'san');
    
    // Base FP calculation: WIL * 2 + SAN * 1
    let maxFP = wilStat * 2 + sanStat;
    
    // Add custom FP if provided
    if (this.params.customFP) {
      maxFP += this.params.customFP;
    }
    
    return maxFP;
  }

  /**
   * Calculate realistic FP requirements for youkai based on class usage patterns
   */
  private calculateYoukaiFPRequirement(targetYoukai: number): number {
    const isShapeshifter = this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter';
    const isGrandSummoner = this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner';
    const isBonder = this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder';
    const isSummoner = this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner';
    
    // Shapeshifters primarily use Install skills - very low FP requirement
    if (isShapeshifter && !isSummoner) {
      // Install skills are temporary and don't require sustained FP
      // Just need enough FP to use Install abilities occasionally
      return Math.max(60, targetYoukai * 5); // Minimal FP requirement
    }
    
    // Grand Summoners use youkai skills more than sustained summoning
    if (isGrandSummoner && !isSummoner) {
      // Skills have cooldowns, don't need all youkai summoned at once
      // Moderate FP requirement for skill usage and some summoning
      return Math.max(100, targetYoukai * 15); // Moderate FP requirement
    }
    
    // Bonders focus on bonds and utility, less sustained summoning
    if (isBonder && !isSummoner) {
      // Bond effects are passive, occasional summoning for utility
      return Math.max(80, targetYoukai * 10); // Low-moderate FP requirement
    }
    
    // Pure Summoners or Summoner hybrids - may want multiple youkai active
    if (isSummoner) {
      // Traditional summoning, may have 2-4 youkai active simultaneously
      const simultaneousYoukai = Math.min(4, Math.ceil(targetYoukai * 0.4)); // 40% of total youkai active
      return Math.max(120, simultaneousYoukai * 30); // Full FP cost for active youkai
    }
    
    // Default case - moderate requirement
    return Math.max(100, targetYoukai * 20);
  }

  /**
   * Evaluate allocation based on target stat goals
   */
  private evaluateTargetAllocation(allocation: StatRecord): number {
    if (!this.params.targetStats) return 0;
    
    let score = 1000; // Start with base score
    
    // Score based on how close we get to target stats
    Object.entries(this.params.targetStats).forEach(([stat, target]) => {
      const statKey = stat as StatKey;
      const finalStat = this.calculateFinalStat(allocation, statKey);
      
      if (finalStat >= target) {
        // Bonus for meeting or exceeding target
        score += 50;
        // Small penalty for excessive over-achievement to prevent waste
        if (finalStat > target + 10) {
          score -= (finalStat - target - 10) * 2;
        }
      } else {
        // Penalty for falling short of target
        const shortfall = target - finalStat;
        score -= shortfall * 10; // Heavy penalty for missing targets
      }
    });
    
    // Efficiency bonus for not wasting points
    const totalAllocated = Object.values(allocation).reduce((sum, points) => sum + points, 0);
    const maxPoints = this.maxPoints;
    if (totalAllocated <= maxPoints) {
      const pointsLeft = maxPoints - totalAllocated;
      if (pointsLeft <= 5) {
        score += 25; // Bonus for efficient point usage
      }
    } else {
      // Heavy penalty for exceeding point limit
      score -= (totalAllocated - maxPoints) * 50;
    }
    
    // Add youkai Faith requirement constraints for target mode too
    const weights = this.params.customWeights;
    if (weights?.youkaiCount) {
      const targetYoukai = weights.youkaiCount;
      const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
      const finalFaithStat = this.calculateFinalStat(allocation, 'fai');
      const faithThresholdMet = finalFaithStat >= minFaithNeeded;
      
      if (!faithThresholdMet) {
        // Heavy penalty for not meeting Faith threshold in target mode
        score -= 500;
      }
    }
    
    // HP minimum requirement (universal constraint for target mode too)
    const actualHP = this.calculateAccurateHP(allocation);
    const minimumHP = 700; // Universal minimum HP for all builds
    if (actualHP < minimumHP) {
      const hpShortfall = minimumHP - actualHP;
      score -= hpShortfall * 2; // Heavy penalty for not meeting minimum HP (2 points per HP below 700)
    }
    
    return score;
  }

  /**
   * Evaluate how good a stat allocation is
   */
  private evaluateAllocation(allocation: StatRecord): number {
    // Use target-based scoring if in target mode
    if (this.params.optimizationMode === 'targets') {
      return this.evaluateTargetAllocation(allocation);
    }
    
    // Otherwise use weight-based scoring
    let score = 0;
    const weaponPriorities = this.getWeaponScalingPriorities();
    const classPriorities = this.getClassSynergyPriorities();
    const customPriorities = this.getCustomWeightPriorities();

    // Score based on meeting thresholds
    Object.entries(this.buildType.statThresholds).forEach(([stat, thresholds]) => {
      const finalStat = this.calculateFinalStat(allocation, stat as StatKey);
      
      if (thresholds.min) {
        if (finalStat >= thresholds.min) {
          score += 100; // Big bonus for meeting minimum
        } else {
          score -= (thresholds.min - finalStat) * 10; // Penalty for not meeting minimum
        }
      }

      if (thresholds.ideal) {
        const distance = Math.abs(finalStat - thresholds.ideal);
        score += Math.max(0, 50 - distance * 2); // Bonus for being close to ideal
      }

      if (thresholds.max && finalStat > thresholds.max) {
        score -= (finalStat - thresholds.max) * 5; // Penalty for exceeding maximum
      }
    });

    // Score based on stat priorities (including custom weights)
    Object.entries(allocation).forEach(([stat, points]) => {
      const statKey = stat as StatKey;
      const basePriority = this.buildType.statPriorities[statKey];
      const weaponPriority = weaponPriorities[statKey] || 0;
      const classPriority = classPriorities[statKey] || 0;
      const customPriority = customPriorities[statKey] || 0;
      
      const totalPriority = basePriority + weaponPriority * 0.5 + classPriority * 0.3 + customPriority * 0.8;
      score += points * totalPriority;
    });

    // Custom weight specific bonuses
    if (this.params.customWeights) {
      const weights = this.params.customWeights;
      
      // Summoner-specific scoring
      if (weights.youkaiCount && (
        this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
        this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
        this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
        this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
      )) {
        const faiStat = this.calculateFinalStat(allocation, 'fai');
        const targetYoukai = weights.youkaiCount;
        
        // Calculate actual youkai slots: 5 base + floor(FAI/14)
        const youkaiSlots = 5 + Math.floor(faiStat / 14);
        const maxYoukai = Math.min(12, youkaiSlots); // Capped at 12
        
        // Check if Faith investment meets the minimum threshold for target youkai
        const finalFaithStat = this.calculateFinalStat(allocation, 'fai');
        const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
        const faithThresholdMet = finalFaithStat >= minFaithNeeded;
        
        // Calculate FP sustainability using class-appropriate requirements
        const actualFP = this.calculateAccurateFP(allocation);
        const requiredFP = this.calculateYoukaiFPRequirement(targetYoukai);
        const fpSustainable = actualFP >= requiredFP;
        
        if (fpSustainable && maxYoukai >= targetYoukai && faithThresholdMet) {
          score += 50 * targetYoukai; // Bonus for meeting all youkai requirements
        } else {
          const slotShortfall = Math.max(0, targetYoukai - maxYoukai);
          const fpPenalty = fpSustainable ? 0 : 30; // Penalty for insufficient FP
          const faithPenalty = faithThresholdMet ? 0 : 500; // Very heavy penalty for not meeting Faith threshold (makes it a hard constraint)
          
          score -= (slotShortfall * 25) + fpPenalty + faithPenalty;
        }
      }
      
      // HP minimum requirement (universal constraint)
      const actualHP = this.calculateAccurateHP(allocation);
      const minimumHP = 700; // Universal minimum HP for all builds
      if (actualHP < minimumHP) {
        const hpShortfall = minimumHP - actualHP;
        score -= hpShortfall * 2; // Heavy penalty for not meeting minimum HP (2 points per HP below 700)
      }
      
      // Critical focus scoring
      if (weights.criticalFocus) {
        const lucStat = this.calculateFinalStat(allocation, 'luc');
        const guiStat = this.calculateFinalStat(allocation, 'gui');
        const critPotential = lucStat + guiStat * 1.5; // Rough crit calculation
        score += critPotential * weights.criticalFocus * 0.5;
      }
      
      // Accuracy focus scoring
      if (weights.accuracyFocus) {
        const skiStat = this.calculateFinalStat(allocation, 'ski');
        score += skiStat * weights.accuracyFocus * 2;
      }
      
      // FP goal scoring (reasonable FP for sustained combat)
      if (weights.fpPriority) {
        const actualFP = this.calculateAccurateFP(allocation);
        const fpTarget = 120; // Reasonable FP target for sustained combat
        
        if (actualFP >= fpTarget) {
          score += 75 * weights.fpPriority; // Bonus for meeting FP goal
        } else {
          const fpDeficit = fpTarget - actualFP;
          score -= (fpDeficit / 5) * weights.fpPriority; // Penalty for FP shortage
        }
      }
    }

    // APT efficiency bonus
    const aptBonus = Math.floor(this.calculateFinalStat(allocation, 'apt') / 6) * 11;
    score += aptBonus * 2;

    // Penalize unused points
    const usedPoints = this.calculateTotalPoints(allocation);
    const unusedPoints = this.maxPoints - usedPoints;
    score -= unusedPoints * 5;

    return score;
  }

  /**
   * Calculate final stat value including all bonuses (accurate version matching main calculator)
   */
  private calculateFinalStat(allocation: StatRecord, stat: StatKey): number {
    // Use the same calculation logic as the main calculator's getEffectiveStat function
    const subraceData = SUBRACES[this.params.subrace];
    const mainClassData = CLASSES[this.params.mainClass];
    const subClassData = CLASSES[this.params.subClass];
    
    const baseRacial = subraceData?.[stat] || 0;
    const allocated = allocation[stat];
    const history = HISTORY[this.params.history || 'None'];
    const historyBonus = history?.stats[stat] || 0;
    
    // APT bonus (every 6 APT gives +1 to other stats) - must calculate APT first
    const aptBonus = stat === 'apt' ? 0 : Math.floor(this.calculateFinalStat(allocation, 'apt') / 6);
    
    // Legend extend bonus - check each enabled legend extend
    const leBonus = Object.entries(this.params.legendExtend || {}).reduce((bonus, [key, enabled]) => {
      if (enabled) {
        const leData = LEGEND_EXTEND[key];
        return bonus + (leData?.stat === stat ? 1 : 0);
      }
      return bonus;
    }, 0);

    // Astrology bonus - simplified for now
    const astroBonus = (this.params.astrology && ASTROLOGY_PLANETS[this.params.astrology] === stat) ? 1 : 0;

    // Custom stats if included
    const customBonus = this.params.includeCustomStats ? 
      ((this.params.customStats?.[stat] || 0) + (this.params.customBaseStats?.[stat] || 0)) : 0;

    // Class passive bonuses
    const mainPassiveData = CLASS_PASSIVES[this.params.mainClass];
    const subPassiveData = CLASS_PASSIVES[this.params.subClass];
    const mainPassiveBonus = mainPassiveData && mainPassiveData.stats[stat] ? 
      (mainPassiveData.stats[stat] || 0) * (this.params.mainClassPassive || 0) : 0;
    const subPassiveBonus = subPassiveData && subPassiveData.stats[stat] ? 
      (subPassiveData.stats[stat] || 0) * (this.params.subClassPassive || 0) : 0;
    const totalPassiveBonus = mainPassiveBonus + subPassiveBonus;

    // Class bonuses
    const mainClassValue = mainClassData?.[stat] || 0;
    const subClassValue = subClassData?.[stat] || 0;
    const totalClassValue = mainClassValue + subClassValue;

    // Total added value (everything except base racial and class)
    const addedValue = allocated + historyBonus + astroBonus + leBonus + customBonus + totalPassiveBonus;
    
    // Apply the same diminishing returns calculation as the main calculator
    return this.calculateDiminishingReturns(baseRacial, addedValue, totalClassValue, 0, aptBonus);
  }

  /**
   * Replicate the main calculator's diminishing returns logic exactly
   */
  private calculateDiminishingReturns(
    racialStat: number, 
    addedStat: number, 
    classStat: number, 
    customStat: number,
    aptitudeBonus: number,
    dragonBonus = 0
  ): number {
    // Monoclass modifier for class stats
    const monoclassModifier = this.params.mainClass === this.params.subClass ? 1.1 : 1.0;
    
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
    
    return Math.floor(effective + (remaining * multiplier));
  }

  /**
   * Calculate stat allocation efficiency
   */
  private calculateStatEfficiency(allocation: StatRecord, stat: StatKey): number {
    const currentValue = this.calculateFinalStat(allocation, stat);
    const priority = this.buildType.statPriorities[stat];
    
    // APT has special efficiency calculation
    if (stat === 'apt') {
      return this.calculateAptEfficiency(allocation.apt) / 50; // Normalize
    }

    // Efficiency decreases as stat gets higher
    const efficiencyFactor = Math.max(0.1, 1 - (currentValue / 100));
    return (priority / 10) * efficiencyFactor;
  }

  /**
   * Calculate total points used in allocation
   */
  private calculateTotalPoints(allocation: StatRecord): number {
    return Object.values(allocation).reduce((sum, value) => sum + value, 0);
  }
}

export default StatOptimizer;