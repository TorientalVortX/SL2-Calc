/**
 * Stat information and build templates for SL2 Calculator
 */

import type { BuildType, StatInfo } from '../types';

// Stat information from StatsInfo.txt (Updated)
export const STAT_INFO: Record<string, StatInfo> = {
  'str': {
    title: 'Strength (STR)',
    description: "Strength is the measure of a character's physical strength, and/or their affinity with the element of Fire.\n\nA character that possesses high STR is capable of lifting heavy objects, while a character with low STR may struggle with such a task unaided.\n\nAside from certain exceptions, most Swords, Axes, Spears, Bows, and Fist weapons have STR Primary Scaling. Characters interested in using those weapon types will want a healthy helping of STR.",
    effects: [
      '+1 Fire ATK (per 1 Scaled point)',
      '+1 Max. Battle Weight, letting you equip heavier items without penalties (per 1 Scaled point)',
      '+1 Max. Encumbrance, letting you carry more items in your inventory without slowing down (per 1 Scaled point)',
      '+3 Max HP (per 1 Base point only - not affected by stat scaling)',
      '+0.4 Critical, for STR Primary Scaling weapons (per 1 Scaled point)'
    ]
  },
  'wil': {
    title: 'Will (WIL)',
    description: "Will is a character's mental strength, their ability to store Focus, and/or their overall affinity with all elements.\n\nA character with high WIL possesses great magical potential and plenty of resources to use it, while a character with low WIL may be better suited to mundane tasks.\n\nAside from certain exceptions, most Tome weapons have WIL Primary Scaling. Characters interested in using them will want a healthy helping of WIL.",
    effects: [
      '+5 FP (per 1 Scaled point)',
      '+1 to All Elemental ATK per 4 points (excludes Sound and Acid) (per 1 Scaled point)',
      '+1 Status Infliction, increasing your chance to inflict status effects on enemies (per 1 Scaled point)',
      '+1 Max. Skill Pool Size per 10 points, increasing the amount of skills you can equip (per 1 Scaled point)'
    ]
  },
  'ski': {
    title: 'Skill (SKI)',
    description: "Skill is similar to dexterity, governing the character's coordination and ability to hit their mark, and/or affinity with the Ice element.\n\nA character with high SKI may have a good sense of balance and distance, while a character with low SKI may be clumsy.\n\nBecause SKI directly influences your ability to hit enemies, most characters not relying on specific strategies will want this stat. A good amount to aim for is 55 Scaled SKI by level 60.",
    effects: [
      '+1 Ice ATK (per 1 Scaled point)',
      '+2 Hit (per 1 Scaled point)',
      '+0.5 Critical (per 1 Scaled point)',
      '+2 Status Infliction, increasing your chance to inflict status effects on enemies (per 1 Scaled point)',
      '+1 Max. Skill Pool Size per 5 points, increasing the amount of skills you can equip (per 1 Scaled point)'
    ]
  },
  'cel': {
    title: 'Celerity (CEL)',
    description: "Celerity shows a character's speed and agility, and/or affinity with the Wind element.\n\nA character with high CEL may have swift cat-like reflexes, while a character with low CEL probably won't be winning any races.\n\nCEL is a defensive stat for dodge-based characters. If you are interested in playing such a character, it is recommended you increase it at least to 60 Scaled CEL by level 60, and make good use of Evade buffs and Hit debuffs.\n\nAnd don't let your enemies gang up around you, or they'll get a Flanking bonus!",
    effects: [
      '+1 Wind ATK (per 1 Scaled point)',
      '+2 Evade (per 1 Scaled point)',
      'Starting Turn Order, determined by who has the highest CEL (per 1 Scaled point)'
    ]
  },
  'def': {
    title: 'Defense (DEF)',
    description: "Defense is a character's resilience in the face of physical assaults, and/or affinity with the Earth element.\n\nCharacters with lots of DEF might be able to shrug off a punch or two, while characters with low DEF might cry after stepping on a rock.\n\nDEF is a defensive stat for characters who want to be able to take on physical threats. Hitting 40% Phys. Def can be accomplished with 45 Scaled DEF, which is typically a good total to hit by level 60 if you want to be a tanky character.",
    effects: [
      '+1 Earth ATK (per 1 Scaled point)',
      '+0.9% Physical Defense, lowering physical damage taken (per 1 Scaled point)'
    ]
  },
  'res': {
    title: 'Resistance (RES)',
    description: "Resistance is a character's protection from supernatural attacks, and/or affinity with the Dark element.\n\nCharacters with high RES may be familiar with dark arts and therefore less vulnerable to them, while a character with low RES may be a mundane sort ill-exposed to strange happenings.\n\nAside from its contributions to Dark-centered offense, RES is a defensive stat for characters who want to mitigate magic attacks. Much like its counterpart DEF, hitting 40% Mag. Def can be accomplished with 45 Scaled RES, a good total to hit by level 60 if you want to be a tanky character.",
    effects: [
      '+1 Dark ATK (per 1 Scaled point)',
      '+0.9% Magical Defense, lowering magical damage taken (per 1 Scaled point)'
    ]
  },
  'vit': {
    title: 'Vitality (VIT)',
    description: "Vitality represents a character's physical health and durability, and/or affinity with the Water element.\n\nHigh VIT characters are hard to put down, while low VIT characters may be the sickly and fragile sort.\n\nVIT is an important stat, as it is the easiest way to increase your maximum HP. All characters can benefit from having more HP, and so 40 Scaled VIT by level 60 is often recommended to increase survivability. Depending on the character, higher or lower values can be considered.\n\nVIT is also highly useful for characters seeking to become Aquamancers, both for the Water ATK and as a secondary damage scaling stat.",
    effects: [
      '+1 Water ATK (per 1 Scaled point)',
      '+10 HP (per 1 Scaled point)',
      '+1 Max. Encumbrance, letting you carry more items in your inventory without slowing down (per 1 Scaled point)'
    ]
  },
  'fai': {
    title: 'Faith (FAI)',
    description: "Faith is the strength of a character's conviction and belief, and/or affinity with the Light element.\n\nHigh FAI characters are often highly intertwined in religion, while low FAI characters are less likely to believe in higher powers.\n\nFAI is a versatile stat. Characters focusing on Light-based offense will want it for the Light ATK. Critical Evade can be useful defensively, as critical hits can be very threatening.",
    effects: [
      '+1 Light ATK (per 1 Scaled point)',
      '+3 FP (per 1 Scaled point)',
      '+1 Status Resistance, decreasing the chance for enemies to inflict you with status effects (per 1 Scaled point)',
      '+1 Critical Evade, lowering the chance of taking critical hits (per 1 Scaled point)'
    ]
  },
  'luc': {
    title: 'Luck (LUC)',
    description: "Luck is the character's good fortune, and/or affinity with the Lightning element.\n\nThe difference between high and low LUC may be between finding a shiny gold coin and tripping on an unfortunately-placed rock.\n\nLUC is what you make of it. Primarily, its use is for Lightning-based attackers, as well as those seeking to dish out a large amount of critical hits.",
    effects: [
      '+1 Lightning ATK (per 1 Scaled point)',
      '+1 Critical (per 1 Scaled point)',
      '+1 Critical Evade, lowering the chance of taking critical hits (per 1 Scaled point)',
      '+1% Item Drop Chance, boosting chances for you or allies to receive items after battle (per 1 Scaled point)',
      'Only the highest LUC in the party is applied for Item Drop Chance'
    ]
  },
  'gui': {
    title: 'Guile (GUI)',
    description: "Guile is a character's capability of cunning or 'alternative thinking', and/or affinity with the Acid element.\n\nHigh GUI characters may be sneaky tricksters or schemers, while low GUI characters may lack street smarts.\n\nAside from certain exceptions, most Dagger and Gun weapons have GUI Primary Scaling. Characters interested in using them will want a healthy helping of GUI. Similarly, because it influences your Critical Damage, any character interested in focusing on critical hits will want to invest at least a little bit in GUI to make them more worthwhile.",
    effects: [
      '+1 Acid ATK (per 1 Scaled point)',
      '+0.5 Flanking (per 1 Scaled point)',
      '+1% Critical Damage (per 1 Scaled point)',
      '-1 Farshot Penalty per 5 points (per 1 Scaled point)',
      '+1 Max. Skill Pool Size per 5 points, increasing the amount of skills you can equip (per 1 Scaled point)'
    ]
  },
  'san': {
    title: 'Sanctity (SAN)',
    description: "Sanctity is the presence of the divine in a character, such as the strength of their racial gifts or resistance to corruption, and/or affinity with the Sound element.\n\nHigh SAN characters may be performers and singers, while low SAN characters may be among the Corrupted race or otherwise have low spiritual abilities.\n\nSAN has a wide variety of benefits and can be very useful if you can afford to invest in it. Because many instrument weapons scale partially with this stat, characters using Bard classes will want to do so.\n\nAlso of note is that many races have skills whose benefits directly scale with your SAN stat. Depending on your race, you may want to increase this stat to increase the effectiveness of those abilities. Corrupted often do not want SAN, however, as it actually lowers their racial abilities' strength.",
    effects: [
      '+1 Sound ATK (per 1 Scaled point)',
      '+2 HP (per 1 Scaled point)',
      '+2 FP (per 1 Scaled point)',
      '+2 Status Resistance, decreasing the chance for enemies to inflict you with status effects (per 1 Scaled point)',
      '+1% Elemental Resistance per 6 points, for Fire, Ice, Wind, Earth, Water, Lightning, Dark, and Light elements (per 1 Scaled point)'
    ]
  },
  'apt': {
    title: 'Aptitude (APT)',
    description: "Aptitude is a character's flexibility and capability to adapt to a variety of situations.\n\nHigh APT characters may be able to do a lot of things well, while low APT characters may be slow learners.\n\nBecause of APT's ability to bolster your other stats, almost every character will want to invest in it to help round out their character. Depending on your preference or racial stats, you may want to go up to 36 Scaled APT or 42 Scaled APT by level 60. Races with starting APT, such as Humans, can often obtain the latter without penalty.\n\nYou can go as high as 80 APT if you wish to make use of the Undeniable Innovator trait.",
    effects: [
      '+1% Experience Earned (per 1 Scaled point)',
      '+1 bonus to all other stats per 6 points (per 1 Scaled point)'
    ],
    notes: 'IMPORTANT: Stats obtained by APT are NOT base stats, they are bonus stats. This means they will not count towards trait requirements, and are subject to mechanics involving bonus stats (e.g., DEF from APT is negated while Burned).'
  }
};

export const BUILD_TYPES: Record<string, BuildType> = {
  'evade': {
    name: 'Evade Tank',
    description: 'High mobility and evasion, avoiding damage through dodge',
    statPriorities: {
      str: 3, wil: 5, ski: 9, cel: 10, def: 2, res: 2, vit: 6, fai: 4, luc: 6, gui: 5, san: 3, apt: 8
    },
    statThresholds: {
      cel: { min: 35, ideal: 45, max: 55 },    // Adjusted for DR
      ski: { min: 40, ideal: 50, max: 60 },    // More realistic with DR
      vit: { min: 25, ideal: 35, max: 45 },    // HP threshold
      apt: { min: 24, ideal: 36, max: 48 }     // 4-8 stat bonus from APT
    },
    weaponTypes: ['Daggers', 'Swords', 'Bows'],
    classCompatibility: {
      // High compatibility - classes with natural evasion focus
      'Rogue': 10, 'Duelist': 10, 'Archer': 9, 'Dancer': 9, 'Void Assassin': 9, 'Shinobi': 9,
      // Good compatibility - mobile classes or those with evade synergy
      'Monk': 8, 'Ranger': 8, 'Bard': 7, 'Kensei': 7, 'Verglas': 7, 'Spellthief': 7, 'Firebird': 7,
      // Moderate compatibility - some mobility/evade elements
      'Magic Gunner': 6, 'Engineer': 6, 'Shapeshifter': 6, 'Martial Artist': 5, 'Demon Hunter': 6,
      // Lower compatibility - but still workable
      'Performer': 5, 'Dark Bard': 4, 'Tactician': 5, 'Summoner': 4, 'Bonder': 4, 'Grand Summoner': 4,
      // Poor compatibility - heavy armor/tank focused
      'Soldier': 3, 'Black Knight': 2, 'Arbalest': 3, 'Boxer': 3,
      // Caster compatibility varies
      'Mage': 4, 'Evoker': 4, 'Hexer': 3, 'Rune Magician': 5, 'Ruler': 4,
      'Curate': 5, 'Priest': 4, 'Aquamancer': 5, 'Lantern Bearer': 4, 'Druid': 5,
      'Solblader': 5, 'Ghost': 6
    }
  },
  'tank': {
    name: 'Defense Tank',
    description: 'High physical and magical defense, tanking damage through raw mitigation',
    statPriorities: {
      str: 6, wil: 4, ski: 7, cel: 3, def: 10, res: 10, vit: 9, fai: 5, luc: 3, gui: 2, san: 6, apt: 8
    },
    statThresholds: {
      def: { min: 30, ideal: 40, max: 50 },    // ~36% phys def at 40
      res: { min: 30, ideal: 40, max: 50 },    // ~36% mag def at 40  
      vit: { min: 30, ideal: 45, max: 60 },    // Good HP pool
      ski: { min: 40, ideal: 50, max: 60 },    // Accuracy requirement
      apt: { min: 18, ideal: 30, max: 42 }     // 3-7 stat bonus
    },
    weaponTypes: ['Axes', 'Spears', 'Swords'],
    classCompatibility: {
      // Perfect compatibility - natural tanks
      'Soldier': 10, 'Black Knight': 10, 'Boxer': 9,
      // Excellent compatibility - defensive focus
      'Arbalest': 9, 'Demon Hunter': 8, 'Monk': 8, 'Solblader': 8,
      // Good compatibility - supportive tanks or hybrid defense
      'Priest': 8, 'Lantern Bearer': 8, 'Curate': 7, 'Hexer': 7, 'Tactician': 7,
      'Druid': 7, 'Aquamancer': 6, 'Bonder': 6, 'Martial Artist': 6,
      // Moderate compatibility - can work with investment
      'Kensei': 6, 'Duelist': 5, 'Bard': 5, 'Performer': 5, 'Dark Bard': 6,
      'Summoner': 5, 'Grand Summoner': 5, 'Mage': 5, 'Ruler': 6,
      // Lower compatibility - opposing focus
      'Rogue': 3, 'Archer': 4, 'Magic Gunner': 4, 'Dancer': 3, 'Void Assassin': 3,
      'Evoker': 3, 'Verglas': 4, 'Shinobi': 3, 'Spellthief': 3, 'Engineer': 4,
      'Firebird': 4, 'Ghost': 4, 'Ranger': 4, 'Rune Magician': 4, 'Shapeshifter': 4
    }
  },
  'glass_cannon': {
    name: 'Glass Cannon',
    description: 'Maximum damage output with minimal defensive investment',
    statPriorities: {
      str: 9, wil: 8, ski: 9, cel: 4, def: 1, res: 2, vit: 4, fai: 6, luc: 8, gui: 7, san: 3, apt: 7
    },
    statThresholds: {
      str: { min: 40, ideal: 50, max: 65 },    // Physical builds
      wil: { min: 40, ideal: 50, max: 65 },    // Magical builds
      ski: { min: 45, ideal: 55, max: 65 },    // Hit requirement
      luc: { min: 25, ideal: 35, max: 50 },    // Crit chance
      vit: { min: 20, ideal: 30, max: 40 },    // Minimal HP
      apt: { min: 24, ideal: 36, max: 48 }     // Stat efficiency
    },
    weaponTypes: ['Daggers', 'Guns', 'Tomes', 'Bows'],
    classCompatibility: {
      // Perfect compatibility - pure offense
      'Mage': 10, 'Evoker': 10, 'Magic Gunner': 10, 'Rogue': 9, 'Archer': 9,
      // Excellent compatibility - high damage potential
      'Hexer': 8, 'Summoner': 8, 'Ranger': 8, 'Kensei': 8, 'Void Assassin': 8,
      'Rune Magician': 8, 'Ghost': 8, 'Firebird': 7, 'Shapeshifter': 7,
      // Good compatibility - can focus on offense
      'Duelist': 7, 'Martial Artist': 7, 'Verglas': 7, 'Shinobi': 7, 'Spellthief': 7,
      'Dancer': 6, 'Demon Hunter': 6, 'Engineer': 6, 'Bonder': 6, 'Grand Summoner': 7,
      // Moderate compatibility - some offensive capability
      'Soldier': 5, 'Bard': 5, 'Dark Bard': 5, 'Ruler': 6, 'Solblader': 6,
      // Lower compatibility - support focused
      'Curate': 4, 'Priest': 4, 'Aquamancer': 4, 'Lantern Bearer': 4, 'Performer': 4,
      'Tactician': 4, 'Druid': 4,
      // Poor compatibility - defensive focus
      'Black Knight': 2, 'Arbalest': 3, 'Boxer': 3
    }
  },
  'hybrid': {
    name: 'Balanced Hybrid',
    description: 'Balanced approach with good offense and defense capabilities',
    statPriorities: {
      str: 7, wil: 6, ski: 8, cel: 6, def: 6, res: 6, vit: 7, fai: 5, luc: 6, gui: 5, san: 4, apt: 8
    },
    statThresholds: {
      str: { min: 25, ideal: 35, max: 50 },    // Moderate offense
      ski: { min: 40, ideal: 50, max: 60 },    // Accuracy
      def: { min: 20, ideal: 30, max: 40 },    // Some defense
      res: { min: 20, ideal: 30, max: 40 },    // Some mag defense
      vit: { min: 25, ideal: 35, max: 50 },    // Decent HP
      apt: { min: 18, ideal: 30, max: 42 }     // Balanced stats
    },
    weaponTypes: ['Swords', 'Spears', 'Axes'],
    classCompatibility: {
      // Perfect compatibility - naturally balanced
      'Soldier': 8, 'Kensei': 9, 'Duelist': 8, 'Bard': 8, 'Demon Hunter': 8,
      'Martial Artist': 8, 'Monk': 8, 'Solblader': 9, 'Tactician': 8,
      // Excellent compatibility - good balance potential  
      'Performer': 7, 'Curate': 7, 'Lantern Bearer': 7, 'Druid': 7, 'Bonder': 7,
      'Ranger': 7, 'Firebird': 7, 'Spellthief': 7, 'Engineer': 7,
      // Good compatibility - can be made balanced
      'Priest': 6, 'Aquamancer': 6, 'Summoner': 6, 'Grand Summoner': 6, 'Mage': 6,
      'Rogue': 6, 'Archer': 6, 'Magic Gunner': 6, 'Verglas': 6, 'Shinobi': 6,
      'Ruler': 6, 'Dancer': 6, 'Dark Bard': 6, 'Shapeshifter': 6,
      // Moderate compatibility - requires more investment
      'Hexer': 5, 'Rune Magician': 5, 'Void Assassin': 5, 'Ghost': 5,
      'Arbalest': 5, 'Boxer': 5,
      // Lower compatibility - too specialized
      'Evoker': 4, 'Black Knight': 4
    }
  },
  'support': {
    name: 'Support/Healer',
    description: 'Focus on supporting allies with heals, buffs, and utility',
    statPriorities: {
      str: 2, wil: 9, ski: 7, cel: 5, def: 4, res: 6, vit: 6, fai: 8, luc: 3, gui: 3, san: 8, apt: 8
    },
    statThresholds: {
      wil: { min: 40, ideal: 50, max: 65 },    // FP and spell power
      fai: { min: 25, ideal: 35, max: 50 },    // Light ATK and FP
      san: { min: 20, ideal: 30, max: 45 },    // Status resist and HP/FP
      ski: { min: 35, ideal: 45, max: 55 },    // Spell accuracy
      vit: { min: 20, ideal: 30, max: 45 },    // Survivability
      apt: { min: 18, ideal: 30, max: 42 }     // Stat distribution
    },
    weaponTypes: ['Tomes', 'Spears'],
    classCompatibility: {
      // Perfect compatibility - dedicated support
      'Curate': 10, 'Priest': 10, 'Aquamancer': 9, 'Lantern Bearer': 9, 'Performer': 9,
      // Excellent compatibility - strong support elements
      'Bard': 8, 'Dark Bard': 7, 'Summoner': 8, 'Druid': 8, 'Tactician': 8,
      'Ruler': 8, 'Grand Summoner': 7,
      // Good compatibility - some support capability
      'Mage': 7, 'Hexer': 6, 'Bonder': 6, 'Rune Magician': 6, 'Engineer': 6,
      'Dancer': 5, 'Shapeshifter': 5,
      // Moderate compatibility - can provide utility
      'Soldier': 5, 'Monk': 5, 'Ranger': 5, 'Spellthief': 5, 'Solblader': 6,
      'Demon Hunter': 4, 'Firebird': 4, 'Verglas': 4,
      // Lower compatibility - offense focused
      'Rogue': 3, 'Duelist': 3, 'Archer': 4, 'Magic Gunner': 4, 'Kensei': 3,
      'Martial Artist': 3, 'Void Assassin': 3, 'Shinobi': 3, 'Ghost': 3,
      'Evoker': 4, 'Boxer': 3, 'Black Knight': 4, 'Arbalest': 4
    }
  },
  'critical': {
    name: 'Critical Focus',
    description: 'Maximize critical hit chance and damage for burst potential',
    statPriorities: {
      str: 6, wil: 3, ski: 8, cel: 6, def: 3, res: 3, vit: 5, fai: 4, luc: 10, gui: 9, san: 2, apt: 7
    },
    statThresholds: {
      luc: { min: 30, ideal: 40, max: 55 },    // Crit chance
      gui: { min: 25, ideal: 35, max: 50 },    // Crit damage and weapon scaling
      ski: { min: 40, ideal: 50, max: 60 },    // Base accuracy
      cel: { min: 20, ideal: 30, max: 45 },    // Some evasion
      vit: { min: 20, ideal: 30, max: 45 },    // Basic survivability
      apt: { min: 24, ideal: 36, max: 48 }     // Stat efficiency
    },
    weaponTypes: ['Daggers', 'Guns', 'Swords'],
    classCompatibility: {
      // Perfect compatibility - crit focused classes
      'Rogue': 10, 'Magic Gunner': 9, 'Duelist': 9, 'Void Assassin': 9, 'Kensei': 8,
      // Excellent compatibility - high crit potential
      'Ranger': 7, 'Archer': 7, 'Martial Artist': 7, 'Verglas': 7, 'Shinobi': 8,
      'Ghost': 8, 'Firebird': 7, 'Shapeshifter': 7, 'Spellthief': 7,
      // Good compatibility - can build for crits
      'Soldier': 6, 'Demon Hunter': 6, 'Dancer': 6, 'Monk': 6, 'Engineer': 6,
      'Bonder': 5, 'Boxer': 5,
      // Moderate compatibility - some crit synergy
      'Bard': 5, 'Summoner': 5, 'Mage': 5, 'Druid': 5, 'Tactician': 5,
      'Solblader': 5, 'Rune Magician': 4,
      // Lower compatibility - limited crit focus
      'Curate': 3, 'Priest': 3, 'Aquamancer': 3, 'Lantern Bearer': 3, 'Performer': 3,
      'Dark Bard': 4, 'Hexer': 4, 'Evoker': 4, 'Ruler': 4, 'Grand Summoner': 4,
      // Poor compatibility - no crit synergy
      'Black Knight': 2, 'Arbalest': 3
    }
  }
};

