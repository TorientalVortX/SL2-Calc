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
import { HISTORY, LEGEND_EXTEND, ASTROLOGY_PLANETS } from '../data/bonuses';

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
   */
  private getMinimumFaithForYoukai(targetYoukai: number): number {
    if (targetYoukai <= 5) return 0;
    const extraYoukai = targetYoukai - 5;
    return extraYoukai * 5;
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

    if (weights.youkaiCount) {
      const baseYoukai = 5;
      const targetYoukai = weights.youkaiCount;
      const extraYoukai = Math.max(0, targetYoukai - baseYoukai);
      const youkaiWeight = extraYoukai / 7;
      
      const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
      const faithWeightBonus = Math.min(1.0, minFaithNeeded / 35);
      
      priorities.wil += youkaiWeight * 15;
      priorities.fai += youkaiWeight * 25 + faithWeightBonus * 15;
    }

    if (weights.summonSurvivability) {
      const survivalWeight = weights.summonSurvivability / 10;
      priorities.wil += survivalWeight * 8;  // WIL for more FP for heals
    }

    if (weights.criticalFocus) {
      const critWeight = weights.criticalFocus / 10;
      priorities.luc += critWeight * 15;
      priorities.gui += critWeight * 12;
      priorities.ski += critWeight * 8;
    }

    if (weights.magicDamageFocus) {
      const magicWeight = weights.magicDamageFocus / 10;
      priorities.wil += magicWeight * 18;
      priorities.ski += magicWeight * 10;
      priorities.fai += magicWeight * 6;
    }

    if (weights.physicalDamageFocus) {
      const physWeight = weights.physicalDamageFocus / 10;
      priorities.str += physWeight * 18;
      priorities.ski += physWeight * 12;
      priorities.gui += physWeight * 8;
    }

    if (weights.accuracyFocus) {
      const accWeight = weights.accuracyFocus / 10;
      priorities.ski += accWeight * 20;
      priorities.luc += accWeight * 5;
    }

    if (weights.minimumHP) {
      priorities.vit += 50;
      priorities.str += 5;
    }

    if (weights.fpPriority) {
      const fpWeight = weights.fpPriority / 10;
      priorities.wil += fpWeight * 20;
      priorities.fai += fpWeight * 5;
    }

    if (weights.physicalDefense) {
      const pdefWeight = weights.physicalDefense / 10;
      priorities.def += pdefWeight * 18;
      priorities.vit += pdefWeight * 8;
    }

    if (weights.magicalDefense) {
      const mdefWeight = weights.magicalDefense / 10;
      priorities.res += mdefWeight * 18;
      priorities.wil += mdefWeight * 6;
    }

    if (weights.initiativePriority) {
      const initWeight = weights.initiativePriority / 10;
      priorities.cel += initWeight * 16;
      priorities.luc += initWeight * 6;
    }

    if (weights.statusResistance) {
      const statusWeight = weights.statusResistance / 10;
      priorities.san += statusWeight * 15;
      priorities.fai += statusWeight * 8;
      priorities.wil += statusWeight * 5;
    }

    if (weights.carryCapacity) {
      const carryWeight = weights.carryCapacity / 10;
      priorities.str += carryWeight * 12;
    }

    if (weights.targetEvade) {
      const baseEvade = this.params.baseEvade || 0;
      const bonusEvade = this.params.bonusEvade || 0; 
      const celNeeded = Math.max(0, (weights.targetEvade - baseEvade - bonusEvade) / 2);
      
      priorities.cel += Math.min(50, celNeeded);
      priorities.luc += 10;
    }

    if (weights.targetAPT) {
      priorities.apt += 50;
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
    // Main class gets stronger weight since it defines your primary playstyle
    Object.entries(mainClassStats).forEach(([stat, value]) => {
      if (stat in priorities && typeof value === 'number' && value > 0) {
        priorities[stat as StatKey] += value * 3.5; // Increased from 2 to make class stats more influential
      }
    });

    // Sub class still important but slightly less weight
    Object.entries(subClassStats).forEach(([stat, value]) => {
      if (stat in priorities && typeof value === 'number' && value > 0) {
        priorities[stat as StatKey] += value * 2; // Increased from 1 to give subclass more influence
      }
    });

    return priorities;
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
    const maxIterations = 500;
    const populationSize = 30;
    
    let bestAllocation = this.generateInitialAllocation();
    let bestScore = this.evaluateAllocation(bestAllocation);

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

    return {
      stats: bestAllocation,
      race: this.params.race,
      subrace: this.params.subrace,
      mainClass: this.params.mainClass,
      subClass: this.params.subClass,
      allocatedStats: bestAllocation,
      totalPoints: this.calculateTotalPoints(bestAllocation),
      score: bestScore,
      reasoning: [],
      warnings: [],
      analysis: {}
    };
  }

  /**
   * Generate initial allocation based on build type priorities
   */
  private generateInitialAllocation(): StatRecord {
    const weights = this.params.customWeights;
    let aptPoints = 0;
    let remainingPoints = this.maxPoints;

    if (weights?.targetAPT) {
      const targetAPT = weights.targetAPT;
      
      if (targetAPT === 80) {
        aptPoints = 80;
      } else {
        const subraceData = SUBRACES[this.params.subrace];
        const mainClassData = CLASSES[this.params.mainClass];
        const subClassData = CLASSES[this.params.subClass];
        
        const baseRacialAPT = subraceData?.apt || 0;
        const mainClassAPT = mainClassData?.apt || 0;
        const subClassAPT = subClassData?.apt || 0;
        const totalClassAPT = mainClassAPT + subClassAPT;
        
        let neededAllocation = 0;
        for (let testAlloc = 0; testAlloc <= 100; testAlloc++) {
          const finalAPT = this.calculateDiminishingReturns(baseRacialAPT, testAlloc, totalClassAPT, 0, 0);
          if (finalAPT >= targetAPT) {
            neededAllocation = testAlloc;
            break;
          }
        }
        
        aptPoints = neededAllocation;
      }
      
      remainingPoints -= aptPoints;
    }

    const allocation: StatRecord = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: aptPoints
    };

    const weaponPriorities = this.getWeaponScalingPriorities();
    const classPriorities = this.getClassSynergyPriorities();
    const customPriorities = this.getCustomWeightPriorities();

    const combinedPriorities: Record<StatKey, number> = {} as Record<StatKey, number>;
    Object.keys(allocation).forEach(stat => {
      const statKey = stat as StatKey;
      combinedPriorities[statKey] = 
        classPriorities[statKey] * 3.5 +
        this.buildType.statPriorities[statKey] * 2.5 +
        weaponPriorities[statKey] * 1.5 +
        customPriorities[statKey] * 2.0;
    });

    const sortedStats = Object.entries(combinedPriorities)
      .sort(([,a], [,b]) => b - a)
      .map(([stat]) => stat as StatKey);

    const criticalStats: StatKey[] = weights?.targetAPT ? ['vit', 'ski'] : ['vit', 'ski', 'apt'];
    criticalStats.forEach(stat => {
      const threshold = this.buildType.statThresholds[stat];
      if (threshold?.min && remainingPoints > 0) {
        if (stat === 'apt') {
          const nextTarget = this.getNextAptTarget(allocation);
          const modestAPTTarget = Math.min(18, nextTarget);
          if (modestAPTTarget > 0 && modestAPTTarget <= remainingPoints) {
            allocation.apt = modestAPTTarget;
            remainingPoints -= modestAPTTarget;
          }
        } else {
          const modestMin = Math.floor(threshold.min * 0.6);
          let needed = 0;
          while (this.calculateFinalStat(allocation, stat) < modestMin && needed < remainingPoints) {
            needed++;
            allocation[stat]++;
          }
          remainingPoints -= needed;
          allocation[stat] -= needed;
          
          const allocate = Math.min(needed, remainingPoints);
          allocation[stat] += allocate;
          remainingPoints -= allocate;
        }
      }
    });

    const pointsToDistribute = Math.floor(remainingPoints * 0.85);
    let distributed = 0;
    
    while (distributed < pointsToDistribute && remainingPoints > 0) {
      let allocated = false;
      
      for (const stat of sortedStats) {
        if (distributed >= pointsToDistribute) break;
        if (remainingPoints <= 0) break;
        
        if (stat === 'apt') continue;
        
        const currentFinal = this.calculateFinalStat(allocation, stat);
        const threshold = this.buildType.statThresholds[stat];
        
        if (threshold?.max && currentFinal >= threshold.max) continue;
        if (allocation[stat] >= 70) continue;
        
        const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
        const efficiency = nextFinal - currentFinal;
        
        if (efficiency < 0.3) continue;
        
        allocation[stat]++;
        remainingPoints--;
        distributed++;
        allocated = true;
        break;
      }
      
      if (!allocated) break;
    }

    while (remainingPoints > 0) {
      let allocated = false;
      
      const skipAPTOptimization = weights?.targetAPT !== undefined;
      
      if (!skipAPTOptimization && !this.isAptAllocationEfficient(allocation) && remainingPoints >= 6) {
        const nextTarget = this.getNextAptTarget(allocation);
        const currentApt = allocation.apt;
        const pointsNeeded = nextTarget - currentApt;
        
        if (pointsNeeded > 0 && pointsNeeded <= remainingPoints && pointsNeeded <= 6) {
          allocation.apt += pointsNeeded;
          remainingPoints -= pointsNeeded;
          allocated = true;
          continue;
        }
      }
      
      for (const stat of sortedStats) {
        if (remainingPoints <= 0) break;
        
        if (stat === 'apt') {
          if (!skipAPTOptimization && this.isAptAllocationEfficient(allocation) && remainingPoints >= 6) {
            const nextTarget = this.getNextAptTarget(allocation);
            const pointsNeeded = nextTarget - allocation.apt;
            if (pointsNeeded === 6) {
              allocation.apt += 6;
              remainingPoints -= 6;
              allocated = true;
              break;
            }
          }
          continue;
        }
        
        const currentFinal = this.calculateFinalStat(allocation, stat);
        if (allocation[stat] >= 70) continue;
        
        const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
        const efficiency = nextFinal - currentFinal;
        
        if (efficiency >= 0.2) {
          allocation[stat]++;
          remainingPoints--;
          allocated = true;
          break;
        }
      }
      
      if (!allocated && remainingPoints > 0) {
        for (const stat of sortedStats) {
          if (stat === 'apt') continue;
          if (allocation[stat] < 70) {
            const pointsToDump = Math.min(remainingPoints, 70 - allocation[stat]);
            allocation[stat] += pointsToDump;
            remainingPoints -= pointsToDump;
            break;
          }
        }
        if (remainingPoints > 0) break;
      }
    }

    return allocation;
  }

  /**
   * Generate random allocation for genetic algorithm
   */
  private generateRandomAllocation(): StatRecord {
    const weights = this.params.customWeights;
    let aptPoints = 0;
    let remainingPoints = this.maxPoints;

    if (weights?.targetAPT) {
      const targetAPT = weights.targetAPT;
      
      if (targetAPT === 80) {
        aptPoints = 80;
      } else {
        const subraceData = SUBRACES[this.params.subrace];
        const mainClassData = CLASSES[this.params.mainClass];
        const subClassData = CLASSES[this.params.subClass];
        
        const baseRacialAPT = subraceData?.apt || 0;
        const mainClassAPT = mainClassData?.apt || 0;
        const subClassAPT = subClassData?.apt || 0;
        const totalClassAPT = mainClassAPT + subClassAPT;
        
        let neededAllocation = 0;
        for (let testAlloc = 0; testAlloc <= 100; testAlloc++) {
          const finalAPT = this.calculateDiminishingReturns(baseRacialAPT, testAlloc, totalClassAPT, 0, 0);
          if (finalAPT >= targetAPT) {
            neededAllocation = testAlloc;
            break;
          }
        }
        
        aptPoints = neededAllocation;
      }
      
      remainingPoints -= aptPoints;
    }

    const allocation: StatRecord = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: aptPoints
    };
    
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

    if (weights?.minimumHP) {
      const targetHP = weights.minimumHP;
      const baseHP = 350;
      const estimatedSTRContrib = 20 * 3;
      const estimatedSANContrib = 10 * 2;
      const neededFromVIT = targetHP - baseHP - estimatedSTRContrib - estimatedSANContrib;
      const estimatedVITNeeded = Math.max(0, Math.ceil(neededFromVIT / 10)); 
      const vitToAllocate = Math.min(40, estimatedVITNeeded);
      allocation.vit = vitToAllocate;
      remainingPoints -= vitToAllocate;
    }

    const stats = Object.keys(allocation).filter(stat => stat !== 'apt') as StatKey[];

    while (remainingPoints > 0) {
      const stat = stats[Math.floor(Math.random() * stats.length)];
      const currentFinal = this.calculateFinalStat(allocation, stat);
      const threshold = this.buildType.statThresholds[stat];
      
      if (threshold?.max && currentFinal >= threshold.max) continue;
      if (allocation[stat] >= 80) continue;
      
      const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
      const efficiency = nextFinal - currentFinal;
      
      if (Math.random() < 0.7 && efficiency < 0.3) continue;
      
      allocation[stat]++;
      remainingPoints--;
    }

    return allocation;
  }

  /**
   * Mutate allocation for genetic algorithm
   */
  private mutateAllocation(parent: StatRecord): StatRecord {
    const child = { ...parent };
    const mutationRate = 0.1;
    const mutationStrength = 3;

    const stats = Object.keys(child).filter(stat => stat !== 'apt') as StatKey[];
    
    stats.forEach(stat => {
      if (Math.random() < mutationRate) {
        const change = Math.floor((Math.random() - 0.5) * mutationStrength * 2);
        
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
          child[stat] = Math.max(0, Math.min(80, child[stat] + change));
        }
      }
    });

    const totalPoints = this.calculateTotalPoints(child);
    if (totalPoints !== this.maxPoints) {
      const difference = totalPoints - this.maxPoints;
      if (difference > 0) {
        for (let i = 0; i < difference; i++) {
          const reducibleStats = stats.filter(s => child[s] > 0);
          if (reducibleStats.length > 0) {
            let statToReduce = reducibleStats[0];
            let worstEfficiency = 1.0;
            
            for (const stat of reducibleStats) {
              if (child[stat] > 0) {
                let canReduce = true;
                
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
                
                if (!canReduce) continue;
                
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
        for (let i = 0; i < -difference; i++) {
          let bestStat = stats[0];
          let bestEfficiency = 0;
          
          for (const stat of stats) {
            if (child[stat] < 80) {
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
    
    if (isShapeshifter && !isSummoner) {
      return Math.max(60, targetYoukai * 5);
    }
    
    if (isGrandSummoner && !isSummoner) {
      return Math.max(100, targetYoukai * 15);
    }
    
    if (isBonder && !isSummoner) {
      return Math.max(80, targetYoukai * 10);
    }
    
    if (isSummoner) {
      const simultaneousYoukai = Math.min(4, Math.ceil(targetYoukai * 0.4));
      return Math.max(120, simultaneousYoukai * 30);
    }
    
    return Math.max(100, targetYoukai * 20);
  }

  /**
   * Evaluate allocation based on target stat goals
   */
  private evaluateTargetAllocation(allocation: StatRecord): number {
    if (!this.params.targetStats) return 0;
    
    let score = 1000;
    
    Object.entries(this.params.targetStats).forEach(([stat, target]) => {
      const statKey = stat as StatKey;
      const finalStat = this.calculateFinalStat(allocation, statKey);
      
      if (finalStat >= target) {
        score += 50;
        if (finalStat > target + 10) {
          score -= (finalStat - target - 10) * 2;
        }
      } else {
        const shortfall = target - finalStat;
        score -= shortfall * 10;
      }
    });
    
    const totalAllocated = Object.values(allocation).reduce((sum, points) => sum + points, 0);
    const maxPoints = this.maxPoints;
    if (totalAllocated <= maxPoints) {
      const pointsLeft = maxPoints - totalAllocated;
      if (pointsLeft <= 5) {
        score += 25;
      }
    } else {
      score -= (totalAllocated - maxPoints) * 50;
    }
    
    const weights = this.params.customWeights;
    if (weights?.youkaiCount) {
      const targetYoukai = weights.youkaiCount;
      const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
      const finalFaithStat = this.calculateFinalStat(allocation, 'fai');
      const faithThresholdMet = finalFaithStat >= minFaithNeeded;
      
      if (!faithThresholdMet) {
        score -= 500;
      }
    }
    
    const actualHP = this.calculateAccurateHP(allocation);
    const minimumHP = 700;
    if (actualHP < minimumHP) {
      const hpShortfall = minimumHP - actualHP;
      score -= hpShortfall * 2;
    }
    
    return score;
  }

  /**
   * Evaluate allocation quality based on build goals
   */
  private evaluateAllocation(allocation: StatRecord): number {
    if (this.params.optimizationMode === 'targets') {
      return this.evaluateTargetAllocation(allocation);
    }
    
    let score = 0;
    const weaponPriorities = this.getWeaponScalingPriorities();
    const classPriorities = this.getClassSynergyPriorities();
    const customPriorities = this.getCustomWeightPriorities();

    Object.entries(this.buildType.statThresholds).forEach(([stat, thresholds]) => {
      const finalStat = this.calculateFinalStat(allocation, stat as StatKey);
      
      if (thresholds.min) {
        if (finalStat >= thresholds.min) {
          score += 100;
        } else {
          score -= (thresholds.min - finalStat) * 10;
        }
      }

      if (thresholds.ideal) {
        const distance = Math.abs(finalStat - thresholds.ideal);
        score += Math.max(0, 50 - distance * 2);
      }

      if (thresholds.max && finalStat > thresholds.max) {
        score -= (finalStat - thresholds.max) * 5;
      }
    });

    Object.entries(allocation).forEach(([stat, points]) => {
      const statKey = stat as StatKey;
      const basePriority = this.buildType.statPriorities[statKey];
      const weaponPriority = weaponPriorities[statKey] || 0;
      const classPriority = classPriorities[statKey] || 0;
      const customPriority = customPriorities[statKey] || 0;
      
      const totalPriority = classPriority * 0.8 + basePriority * 0.6 + weaponPriority * 0.4 + customPriority * 0.7;
      score += points * totalPriority;
    });

    if (this.params.customWeights) {
      const weights = this.params.customWeights;
      
      if (weights.youkaiCount && (
        this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
        this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
        this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
        this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
      )) {
        const faiStat = this.calculateFinalStat(allocation, 'fai');
        const targetYoukai = weights.youkaiCount;
        
        const youkaiSlots = 5 + Math.floor(faiStat / 14);
        const maxYoukai = Math.min(12, youkaiSlots);
        
        const finalFaithStat = this.calculateFinalStat(allocation, 'fai');
        const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
        const faithThresholdMet = finalFaithStat >= minFaithNeeded;
        
        const actualFP = this.calculateAccurateFP(allocation);
        const requiredFP = this.calculateYoukaiFPRequirement(targetYoukai);
        const fpSustainable = actualFP >= requiredFP;
        
        if (fpSustainable && maxYoukai >= targetYoukai && faithThresholdMet) {
          score += 50 * targetYoukai;
        } else {
          const slotShortfall = Math.max(0, targetYoukai - maxYoukai);
          const fpPenalty = fpSustainable ? 0 : 30;
          const faithPenalty = faithThresholdMet ? 0 : 500;
          
          score -= (slotShortfall * 25) + fpPenalty + faithPenalty;
        }
      }
      
      const actualHP = this.calculateAccurateHP(allocation);
      const minimumHP = 700;
      if (actualHP < minimumHP) {
        const hpShortfall = minimumHP - actualHP;
        score -= hpShortfall * 2;
      }
      
      if (weights.criticalFocus) {
        const lucStat = this.calculateFinalStat(allocation, 'luc');
        const guiStat = this.calculateFinalStat(allocation, 'gui');
        const critPotential = lucStat + guiStat * 1.5;
        score += critPotential * weights.criticalFocus * 0.5;
      }
      
      if (weights.accuracyFocus) {
        const skiStat = this.calculateFinalStat(allocation, 'ski');
        score += skiStat * weights.accuracyFocus * 2;
      }
      
      if (weights.fpPriority) {
        const actualFP = this.calculateAccurateFP(allocation);
        const fpTarget = 120;
        
        if (actualFP >= fpTarget) {
          score += 75 * weights.fpPriority;
        } else {
          const fpDeficit = fpTarget - actualFP;
          score -= (fpDeficit / 5) * weights.fpPriority;
        }
      }
    }

    const aptBonus = Math.floor(this.calculateFinalStat(allocation, 'apt') / 6) * 11;
    score += aptBonus * 2;

    const usedPoints = this.calculateTotalPoints(allocation);
    const unusedPoints = this.maxPoints - usedPoints;
    score -= unusedPoints * 5;

    return score;
  }

  /**
   * Calculate final stat value including all bonuses
   */
  private calculateFinalStat(allocation: StatRecord, stat: StatKey): number {
    const subraceData = SUBRACES[this.params.subrace];
    const mainClassData = CLASSES[this.params.mainClass];
    const subClassData = CLASSES[this.params.subClass];
    
    const baseRacial = subraceData?.[stat] || 0;
    const allocated = allocation[stat];
    const history = HISTORY[this.params.history || 'None'];
    const historyBonus = history?.stats[stat] || 0;
    
    const aptBonus = stat === 'apt' ? 0 : Math.floor(this.calculateFinalStat(allocation, 'apt') / 6);
    
    const leBonus = Object.entries(this.params.legendExtend || {}).reduce((bonus, [key, enabled]) => {
      if (enabled) {
        const leData = LEGEND_EXTEND[key];
        return bonus + (leData?.stat === stat ? 1 : 0);
      }
      return bonus;
    }, 0);

    const astroBonus = (this.params.astrology && ASTROLOGY_PLANETS[this.params.astrology] === stat) ? 1 : 0;

    const customBonus = this.params.includeCustomStats ? 
      ((this.params.customStats?.[stat] || 0) + (this.params.customBaseStats?.[stat] || 0)) : 0;

    const mainPassiveData = CLASS_PASSIVES[this.params.mainClass];
    const subPassiveData = CLASS_PASSIVES[this.params.subClass];
    const mainPassiveBonus = mainPassiveData && mainPassiveData.stats[stat] ? 
      (mainPassiveData.stats[stat] || 0) * (this.params.mainClassPassive || 0) : 0;
    const subPassiveBonus = subPassiveData && subPassiveData.stats[stat] ? 
      (subPassiveData.stats[stat] || 0) * (this.params.subClassPassive || 0) : 0;
    const totalPassiveBonus = mainPassiveBonus + subPassiveBonus;

    const mainClassValue = mainClassData?.[stat] || 0;
    const subClassValue = subClassData?.[stat] || 0;
    const totalClassValue = mainClassValue + subClassValue;

    const addedValue = allocated + historyBonus + astroBonus + leBonus + customBonus + totalPassiveBonus;
    
    return this.calculateDiminishingReturns(baseRacial, addedValue, totalClassValue, 0, aptBonus);
  }

  /**
   * Apply diminishing returns to stat calculation
   */
  private calculateDiminishingReturns(
    racialStat: number, 
    addedStat: number, 
    classStat: number, 
    customStat: number,
    aptitudeBonus: number,
    dragonBonus = 0
  ): number {
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
   * Calculate total points used in allocation
   */
  private calculateTotalPoints(allocation: StatRecord): number {
    return Object.values(allocation).reduce((sum, value) => sum + value, 0);
  }
}

export default StatOptimizer;