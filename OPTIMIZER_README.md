# SL2 Stat Optimizer

## Overview

The SL2 Stat Optimizer is an intelligent system that automatically calculates optimal stat distributions for dual class combinations in Sigrogana Legends 2. It takes into account class synergies, weapon scaling, APT efficiency, and build-specific requirements to provide optimized stat allocations.

## Features

### Build Types

1. **Evade Tank** - High mobility and evasion focus
   - Prioritizes CEL, SKI, VIT, APT
   - Target: 50+ CEL, 45+ SKI, 30+ VIT

2. **Defense Tank** - Physical and magical defense focus
   - Prioritizes DEF, RES, VIT, SKI
   - Target: 35+ DEF/RES, 40+ VIT, 45+ SKI

3. **Glass Cannon** - Maximum damage output
   - Prioritizes primary damage stats (STR/WIL), SKI, LUC
   - Minimal defensive investment

4. **Balanced Hybrid** - Balanced offense and defense
   - Moderate investment across all relevant stats
   - Good for versatile playstyles

5. **Support/Healer** - Supporting allies focus
   - Prioritizes WIL, FAI, SAN, SKI
   - Target: 45+ WIL, 30+ FAI

6. **Critical Focus** - Critical hit specialist
   - Prioritizes LUC, GUI, SKI
   - Target: 40+ LUC, 30+ GUI

### Optimization Factors

The optimizer considers multiple factors when calculating optimal stat distributions:

1. **Class Synergies**
   - Main and sub class stat bonuses
   - Class passive abilities
   - Weapon type compatibility

2. **Weapon Scaling**
   - Automatic detection of valid weapons for class combination
   - Prioritizes stats that scale with equipped weapon types
   - Support for manual weapon type override

3. **APT Efficiency**
   - Calculates optimal APT investment for maximum stat gain
   - Every 6 APT provides +1 to all other stats
   - Considers diminishing returns on APT investment

4. **Build Thresholds**
   - Minimum, ideal, and maximum stat targets
   - Penalties for not meeting minimum requirements
   - Rewards for reaching ideal values

5. **SL2 Game Mechanics**
   - Diminishing returns on high stat values
   - Race and subrace stat bonuses
   - History and legend extension bonuses
   - Planet sign bonuses

### Algorithm Details

The optimizer uses a genetic algorithm approach:

1. **Population Generation** - Creates multiple random stat distributions
2. **Evaluation** - Scores each distribution based on build requirements
3. **Evolution** - Keeps best solutions and mutates them for improvement
4. **Convergence** - Repeats until optimal solution is found

### Integration with Calculator

The optimizer is fully integrated with the existing SL2 Calculator:

- Uses current race, class, and modifier selections
- Applies optimized stats to the main calculator
- Respects all existing bonuses and penalties
- Maintains compatibility with all calculator features

## Usage

1. **Select Build Type** - Choose your desired playstyle
2. **Configure Options** - Set target level and weapon preferences
3. **Run Optimization** - Click "Optimize Stats" to calculate
4. **Review Results** - Examine recommendations and reasoning
5. **Apply Changes** - Use "Apply to Calculator" to set optimized stats

## Advanced Features

- **Class Compatibility Scoring** - Shows how well your classes match the build type
- **Optimization Reasoning** - Explains why certain stat allocations were chosen
- **Warning System** - Alerts about suboptimal configurations
- **Custom Weapon Types** - Override automatic weapon detection

## Technical Implementation

The optimizer is implemented as a TypeScript class with the following key components:

- `StatOptimizer` class - Main optimization engine
- `BuildType` interface - Defines build type requirements
- `OptimizationResult` interface - Contains optimization output
- Genetic algorithm with mutation and selection
- Comprehensive stat calculation system

## Future Enhancements

Potential improvements for future versions:

1. **Template Builds** - Pre-configured optimized builds for common combinations
2. **Multi-Objective Optimization** - Balance multiple competing goals
3. **Advanced Weapon Handling** - Consider specific weapon requirements
4. **PvP vs PvE Builds** - Different optimization strategies
5. **Community Build Sharing** - Share and import optimized builds

## Dependencies

The optimizer requires the following data from the main calculator:

- Class definitions and stat bonuses
- Race and subrace information
- Game mechanic constants (APT ratios, diminishing returns)
- Weapon type mappings
- Historical and legend extension data

This ensures the optimizer always stays synchronized with the main calculator's data and mechanics.