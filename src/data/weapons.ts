/**
 * Weapon data for SL2 Calculator
 * Contains all weapon information including stats, scaling, and special abilities
 */

import { Weapon } from '../types';

// ==================== AXES ====================
export const AXES: Weapon[] = [
  // 1★ Weapons
  {
    name: "Wrench",
    rarity: 1,
    weaponType: "Axe",
    subtype: "Club",
    range: 1,
    power: 8,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 8,
    damageType: "Blunt",
    scaling: [
      {
        type: "Cunning",
        str: 70,
        gui: 40
      }
    ],
    description: "While not a conventional weapon, it still hurts.",
    location: ["Random drops", "Casino"]
  },
  {
    name: "Axe",
    rarity: 1,
    weaponType: "Axe",
    range: 1,
    power: 8,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "A heavy axe. Not easy to aim, but very powerful.",
    location: ["Random drops", "Shops", "Metalwork (Lv1)"]
  },
  {
    name: "Battleaxe",
    rarity: 1,
    weaponType: "Axe",
    range: 1,
    power: 9,
    accuracy: 75,
    critical: 10,
    criticalDamage: 135,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Critical Bonus",
        type: "Passive",
        description: "Increases Critical Chance"
      }
    ],
    description: "A large, heavy axe that can slice through soft spots.",
    location: ["Random drops", "Metalwork (Lv2)"]
  },
  // 2★ Weapons
  {
    name: "Axe (Enhanced)",
    rarity: 2,
    weaponType: "Axe",
    range: 1,
    power: 8,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 STR"
      }
    ],
    description: "A heavy axe. Not easy to aim, but very powerful.",
    location: ["Enchanting (Lv1)"]
  },
  {
    name: "Guillotine",
    rarity: 2,
    weaponType: "Axe",
    subtype: "Greataxe",
    range: 1,
    power: 11,
    accuracy: 75,
    critical: 5,
    criticalDamage: 125,
    weight: 16,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Enhanced Critical Damage",
        type: "Passive",
        description: "+10 Critical Damage"
      }
    ],
    description: "A headsman's axe that gets more powerful as the target nears death",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Sweeper",
    rarity: 2,
    weaponType: "Axe",
    subtype: "Greataxe",
    range: 1,
    power: 13,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 22,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Wide Attack",
        type: "Passive",
        description: "Attacks in a 3-wide line."
      }
    ],
    description: "A wide axe with a large area of attack.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  // 3★ Weapons
  {
    name: "Gorger",
    rarity: 3,
    weaponType: "Axe",
    range: 1,
    power: 10,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 14,
    damageType: "Slash",
    scaling: [
      {
        type: "Vampiric",
        str: 80,
        vit: 30
      }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%)"
      },
      {
        name: "Bloodfest",
        type: "SpecialStrike",
        description: "Triggers after the attack hits an enemy. Restores 35 HP and deals 35 Dark bonus damage that ignores armor to the target. If you have Claret Call active, it is also applied twice to that enemy.",
        triggerRate: "10% + 8% Bonus"
      }
    ],
    description: "Gorges itself on your enemies' blood.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Icebreaker",
    rarity: 3,
    weaponType: "Axe",
    range: 1,
    power: 11,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 16,
    damageType: "Slash",
    scaling: [
      {
        type: "Cold",
        str: 70,
        ski: 40
      }
    ],
    specials: [
      {
        name: "Ice Damage",
        type: "OnHit",
        description: "Deals magic Ice bonus damage equal to 50% of your Ice ATK, which ignores armor."
      }
    ],
    description: "A very literal weapon with an extremely cold blade.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Battlepick",
    rarity: 3,
    weaponType: "Axe",
    range: 1,
    power: 12,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 18,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Armor Reduction",
        type: "Passive",
        description: "Reduces effectiveness of enemy Armor by 5."
      },
      {
        name: "Wear Down",
        type: "PotentialSkill",
        description: "When an enemy is damaged by weapons that reduce enemy Armor effectiveness, either by basic attacks or skills using them, a Wear Down status is applied for 3 rounds, or powered up. This status decreases the enemy's Armor by LV. (Max LV of 20, max duration of 3 rounds)."
      }
    ],
    description: "A pickaxe more similar to a halberd, made for piercing armor.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Grand Axe",
    rarity: 3,
    weaponType: "Axe",
    subtype: "Greataxe",
    range: 1,
    power: 14,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 24,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "A massive double-sided axe.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  // 4★ Weapons
  {
    name: "Graality",
    rarity: 4,
    weaponType: "Axe",
    range: 1,
    power: 12,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 20,
    damageType: "Slash",
    scaling: [
      {
        type: "Earthen",
        str: 70,
        def: 40
      }
    ],
    specials: [
      {
        name: "CEL Reduction",
        type: "OnHit",
        description: "Target suffers -20% CEL for 2 rounds."
      },
      {
        name: "Gravity Lock",
        type: "PotentialSkill",
        description: "Targets 1 enemy within 3 Range that is under the effect of your Graality and consumes the energy, dealing Earth magic damage to the target equal to 100% of Graality's Scaled Weapon Attack, and makes the target immune to Airborne for 3 rounds. If the target has Airborne status, it is ended, and they are Knocked Down."
      }
    ],
    description: "Gravity manipulating axe used by an ancient lizardman.",
    location: ["Random drops"]
  },
  {
    name: "Spirit Axe",
    rarity: 4,
    weaponType: "Axe",
    range: 1,
    power: 13,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Spiritual",
        str: 70,
        san: 40
      }
    ],
    specials: [
      {
        name: "Focus Restoration",
        type: "Passive",
        description: "Restores Focus based on damage dealt. (10%) (Basic attacks only)"
      }
    ],
    description: "This axe absorbs Focus from the wounds that it makes.",
    location: ["Random drops"]
  },
  {
    name: "Kanabo",
    rarity: 4,
    weaponType: "Axe",
    subtype: "Club",
    range: 1,
    power: 12,
    accuracy: 75,
    critical: 0,
    criticalDamage: 125,
    weight: 17,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Wear Down Synergy",
        type: "Passive",
        description: "Critical chance increased by the Wear Down LV on the attack target."
      },
      {
        name: "Kanabo Crusher",
        type: "PotentialSkill",
        description: "An extremely heavy swing that uses up all of your Momentum (min. 3) and smashes into an enemy within 1 Range, which deals damage equal your STR (80 max) x Momentum consumed. This also shatters the target's defenses (if not a few bones), inflicting them with Wear Down (LV = Kanabo's Power, 2 round). The attack takes its toll on the Kanabo and reduces its durability by the amount of Momentum used.",
        momentumCost: 3,
        fpCost: 10
      }
    ],
    description: "A large club with circular metal protusions. A rather brutal and heavy weapon, it is often associated with 'oni' or giants.",
    location: ["Random drops"]
  }
];

// ==================== SWORDS ====================
export const SWORDS: Weapon[] = [
  // 1★ Weapons
  {
    name: "Longsword",
    rarity: 1,
    weaponType: "Sword",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "Your standard, boring longsword.",
    location: ["Random drops", "Shops", "Metalwork (Lv1)"]
  },
  {
    name: "Wooden Longsword",
    rarity: 1,
    weaponType: "Sword",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "Your standard, boring longsword, only this time, it's made out of wood.",
    location: ["Random drops", "Woodwork (Lv1)", "Plant Drop Table"]
  },
  {
    name: "Wooden Katana",
    rarity: 1,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Blunt",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    description: "Also called a bokken in Oniga, the land of the katana's origin. The more you know!",
    location: ["Random drops", "Woodwork (Lv1)", "Plant Drop Table", "Eastern Drop Table"]
  },
  {
    name: "Wooden Nelten",
    rarity: 1,
    weaponType: "Sword",
    subtype: "Greatsword",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 12,
    damageType: "Blunt",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    description: "A heavy longsword that is iconic to Chaturanga's military division. Its destructive power is high. This one is made out of wood material.",
    location: ["Random drops", "Woodwork (Lv3)", "Plant Drop Table"]
  },
  // 2★ Weapons  
  {
    name: "Longsword (Enhanced)",
    rarity: 2,
    weaponType: "Sword",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 STR"
      }
    ],
    description: "Your standard, boring longsword.",
    location: ["Enchanting (Lv1)"]
  },
  {
    name: "Wo-Dao",
    rarity: 2,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 6,
    accuracy: 85,
    critical: 10,
    criticalDamage: 125,
    weight: 5,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Critical Bonus",
        type: "Passive",
        description: "Increases Critical Chance"
      }
    ],
    description: "An extremely sharp sword originating from Oniga.",
    location: ["Random drops", "Metalwork (Lv2)", "Eastern Drop Table"]
  },
  {
    name: "Swordfish Sword",
    rarity: 2,
    weaponType: "Sword",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Aquatic",
        str: 70,
        vit: 40
      }
    ],
    specials: [
      {
        name: "Water Damage",
        type: "OnHit",
        description: "Deals magic Water bonus damage equal to 50% of your Water ATK, which ignores armor."
      }
    ],
    description: "Ya-Ha! A sword, made out of... a swordfish.",
    location: ["Random drops", "Metalwork (Lv3)", "Water Drop Table"]
  },
  // 3★ Weapons
  {
    name: "Bloody Fang",
    rarity: 3,
    weaponType: "Sword",
    range: 1,
    power: 7,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 8,
    damageType: "Slash",
    scaling: [
      {
        type: "Vampiric",
        str: 80,
        vit: 30
      }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%) (Basic attacks only)"
      }
    ],
    description: "A sword with a thirst for blood.",
    location: ["Random drops", "Metalwork (Lv3)", "Water Drop Table"]
  },
  {
    name: "Moonblade",
    rarity: 3,
    weaponType: "Sword",
    range: 1,
    power: 7,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Hit Bonus",
        type: "OnHit",
        description: "+5 Hit for 2 turns. Bonus becomes +10 instead on a critical hit. (At night, bonuses and duration are doubled.)"
      }
    ],
    description: "Crafted from silver and enchanted under the night sky.",
    location: ["Random drops", "Metalwork (Lv3)", "Light Drop Table"]
  },
  {
    name: "Eresh",
    rarity: 3,
    weaponType: "Sword",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    specials: [
      {
        name: "Darkness Damage",
        type: "OnHit",
        description: "Deals magic Darkness bonus damage equal to 50% of your Darkness ATK, which ignores armor."
      },
      {
        name: "Impure Stroke",
        type: "PotentialSkill",
        description: "The Duelist skill Eclair La'Croix is changed in the following ways: 1) Light damage becomes Dark. 2) Slash damage effect also inflicts Reduced Resistance (Dark) LV 30 for 3 rounds. (Reduced Resistance lowers the target's elemental resistance by LV.) 3) FP cost increased by 10."
      }
    ],
    description: "A sword wrapped in darkness.",
    location: ["Random drops", "Metalwork (Lv3)", "Dark Drop Table"]
  },
  {
    name: "Fuuma",
    rarity: 3,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 11,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Armor Reduction",
        type: "Passive",
        description: "Reduces effectiveness of enemy Armor by 5."
      },
      {
        name: "Wear Down",
        type: "PotentialSkill",
        description: "When an enemy is damaged by weapons that reduce enemy Armor effectiveness, either by basic attacks or skills using them, a Wear Down status is applied for 3 rounds, or powered up. This status decreases the enemy's Armor by LV. (Max LV of 20, max duration of 3 rounds)."
      }
    ],
    description: "A mystical sword that is said to be powerful enough to chop through stones.",
    location: ["Random drops", "Metalwork (Lv3)", "Earth Drop Table"]
  },
  {
    name: "Nelten",
    rarity: 3,
    weaponType: "Sword",
    subtype: "Greatsword",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 20,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "A heavy greatsword that is iconic to Chaturanga's military division. Its destructive power is high.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Endless Handkerchief",
    rarity: 3,
    weaponType: "Sword",
    subtype: "Whip",
    range: 3,
    power: 5,
    accuracy: 80,
    critical: 10,
    criticalDamage: 110,
    weight: 3,
    damageType: "Slash",
    scaling: [
      {
        type: "Spiritual",
        str: 20,
        san: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Variable Range",
        type: "Passive",
        description: "Attack range increases by 1 and basic attack damage increases by 3 for every empty Item Belt Slot."
      },
      {
        name: "Spinning Strike",
        type: "OnCrit",
        description: "Attack target is spun in a random direction."
      }
    ],
    description: "Less of a weapon and more of a stage prop, your enemy will be left guessing just where this damn chain of handkerchiefs ends.",
    location: ["Random drops"]
  },
  // 4★ Weapons
  {
    name: "River Sword",
    rarity: 4,
    weaponType: "Sword",
    range: 1,
    power: 8,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 8,
    damageType: "Slash",
    scaling: [
      {
        type: "Aquatic",
        str: 70,
        vit: 40
      }
    ],
    specials: [
      {
        name: "Water Damage",
        type: "OnHit",
        description: "Deals magic Water bonus damage equal to 50% of your Water ATK, which ignores armor."
      },
      {
        name: "Aqua Pulse",
        type: "PotentialSkill",
        description: "When an enemy is damaged by a weapon that inflicts Water damage by skills or basic attacks, they become Drenched for 3 rounds. While Drenched, the target takes +25% damage from Lightning element attacks and cannot be set on fire."
      }
    ],
    description: "A sword found deep within the ruins of the sunken city.",
    location: ["Random drops", "Metalwork (Lv4)", "Water Drop Table"]
  },
  {
    name: "Crystal Blade",
    rarity: 4,
    weaponType: "Sword",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 9,
    damageType: "Slash",
    scaling: [
      {
        type: "Earthen",
        str: 70,
        def: 40
      }
    ],
    specials: [
      {
        name: "Earth Damage",
        type: "OnHit",
        description: "Deals magic Earth bonus damage equal to 50% of your Earth ATK, which ignores armor."
      },
      {
        name: "Crystalline Armor",
        type: "OnCrit",
        description: "Grants the attacker Crystalline Armor for 3 rounds. (+30% physical damage reduction, +20% magical damage reduction. Is removed when the bearer moves 2 or more tiles.)"
      }
    ],
    description: "A sword crafted from pure crystal, it shimmers like a diamond.",
    location: ["Random drops", "Metalwork (Lv4)", "Earth Drop Table"]
  },
  {
    name: "Golgorth",
    rarity: 4,
    weaponType: "Sword",
    subtype: "Greatsword",
    range: 1,
    power: 14,
    accuracy: 75,
    critical: 0,
    criticalDamage: 110,
    weight: 35,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "An enormous executioner's blade. Just wielding it is proof of one's superhuman strength.",
    location: ["Random drops", "Metalwork (Lv4)"]
  },
  {
    name: "Rapier of Resent",
    rarity: 4,
    weaponType: "Sword",
    subtype: "Rapier",
    range: 1,
    power: 6,
    accuracy: 95,
    critical: 20,
    criticalDamage: 130,
    weight: 4,
    damageType: "Pierce",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    specials: [
      {
        name: "Darkness Damage",
        type: "OnHit",
        description: "Deals magic Darkness bonus damage equal to 50% of your Darkness ATK, which ignores armor."
      },
      {
        name: "Soul Burn",
        type: "OnCrit",
        description: "If the user is at 50% or less HP, inflicts Soul Burn LV 20 for 5 rounds on the target. (Soul Burn inflicts Dark damage at the start of a round equal to LV.)"
      }
    ],
    description: "This cursed blade feeds on the wielder's suffering to become more deadly.",
    location: ["Random drops", "Metalwork (Lv4)", "Dark Drop Table"]
  },
  {
    name: "Spirit Sword",
    rarity: 4,
    weaponType: "Sword",
    range: 1,
    power: 7,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 5,
    damageType: "Slash",
    scaling: [
      {
        type: "Spiritual",
        str: 35,
        san: 60,
        ski: 35
      }
    ],
    specials: [
      {
        name: "Ghost Touch",
        type: "Passive",
        description: "Weapon is treated as having the Ghost enchantment."
      },
      {
        name: "Soul Strike",
        type: "OnCrit",
        description: "Target loses 5% of their current FP. (10% if target has a spirit. 0% against spirits.)"
      }
    ],
    description: "A blade forged from the essence of spirits.",
    location: ["Random drops", "Metalwork (Lv4)"]
  },
  // 5★ Weapons
  {
    name: "Bandit Sword",
    rarity: 5,
    weaponType: "Sword",
    range: 1,
    power: 9,
    accuracy: 80,
    critical: 5,
    criticalDamage: 110,
    weight: 14,
    damageType: "Slash",
    scaling: [
      {
        type: "Cunning",
        str: 70,
        gui: 40
      }
    ],
    specials: [
      {
        name: "Steal Bonus",
        type: "Passive",
        description: "Increases Steal's success rate by 15%."
      },
      {
        name: "Pilfer",
        type: "PotentialSkill",
        description: "Targets one enemy within 1 Range. Messes with the target's inventory, preventing them from using items for 2 rounds."
      }
    ],
    description: "Usually used by bandits, this sword helps you take things from others.",
    location: ["Random drops", "Highway Drop Table"]
  },
  {
    name: "Engraved Katana",
    rarity: 5,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 9,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Extra Scroll Slot",
        type: "Passive",
        description: "Weapon gains an additional Scroll customization slot."
      }
    ],
    description: "This katana, as the name implies, has a spell engraved in its metal.",
    location: ["Random drops", "Eastern Drop Table"]
  },
  // 6★ Weapons
  {
    name: "Excel Saber",
    rarity: 6,
    weaponType: "Sword",
    range: 1,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 18,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Charge Damage",
        type: "OnHit",
        description: "Consumes Weapon Charges, dealing 50% more damage per Charge Level."
      },
      {
        name: "Charge Weapon",
        type: "GrantsSkill",
        description: "Grants Skill: Charge Weapon (3 Momentum, 5 FP) - Rev your weapon and fill it with focus, increasing its Charge, to a maximum of level 3. When you hit with a weapon that can consume Weapon Charges, the damage you deal with that attack will increase by 50% per level. (Weapon Charges will expire after 5 rounds.)"
      },
      {
        name: "Elite Engine",
        type: "PotentialSkill",
        description: "Shared Potential Skill. Charge Weapon FP cost is increased to 8 FP. Attacks do not use up all of your charges, instead the LV is reduced by 1, and the damage bonus is 35% (does not increase with charge amount like normal Excel attacks)."
      }
    ],
    description: "The Excel line of weapons were developed in Chaturanga, where the ability to be defensive while increasing offensive capabilities was highly valued. By charging up the weapon, it can explosively spend the focus energy when it strikes an enemy, greatly increasing damage. However, the engine module makes it heavier than other weapons.",
    location: ["Random drops", "Mine Drop Table"]
  },
  {
    name: "Dynaxis",
    rarity: 6,
    weaponType: "Sword",
    subtype: "Greatsword",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 5,
    criticalDamage: 110,
    weight: 11,
    damageType: "Slash",
    scaling: [
      {
        type: "Electrical",
        str: 70,
        luc: 40
      }
    ],
    specials: [
      {
        name: "Static Field",
        type: "OnHit",
        description: "When you perform a basic attack with this weapon, it creates a Static Field LV X (X = Dynaxis's Power) for 2 rounds at the target's location. (Static Fields deal Lightning bonus damage that ignores armor equal to LV to enemies when it is created, at the start of a new round, or when an enemy passes through it.)"
      },
      {
        name: "Thunder Strike",
        type: "SpecialStrike",
        description: "Special Strike: Thunder Strike (Trigger Rate: 10% + 8% Bonus, Trigger CD: 2 rounds) - Triggers before an enemy is attacked. Increases the Critical for that attack by 15, changes the damage type to Lightning, and if the attack hits, deals 50 Lightning magic bonus damage to them."
      }
    ],
    description: "An electrically overcharged greatsword. Anything it passes over will get charged up.",
    location: ["Random drops", "Lightning Drop Table"]
  },
  {
    name: "Sakabatou",
    rarity: 6,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Blunt",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Flip Blade",
        type: "GrantsSkill",
        description: "Grants Skill: Flip Blade (0M, 0 FP, 1 Round CD) - Turn your Sakabatou around, changing which side you're using. Grants or removes Flipped Blade (permanent duration). Flipped Blade: Your Sakabatou weapons deal Slash damage."
      },
      {
        name: "Killing Is A Choice",
        type: "PotentialSkill",
        description: "Sakabatou's Potential Skill. Sakabatou gains +5 Critical while it deals Slash damage, and you gain +5 Armor & Magic Armor while it deals Blunt damage. When you flip the Sakabatou to Slash damage, enemies within its attack range are inflicted with your Sakki (if the skill is equipped) and Slash Resist Down (LV 10, 1 round, 1 hit). 2 round CD if an enemy is affected."
      },
      {
        name: "Nine Heads",
        type: "SpecialStrike",
        description: "Special Strike - Nine Heads (Trigger Rate: 10% + 8% Bonus, Trigger CD: 3 Rounds) - Triggers before an enemy is attacked, and replaces the attack. An ultra fast strike hitting from 9 directions at once, dealing 125% Scaled Weapon Attack, and rendering it unavoidable and unparriable, but it deals no extra damage on a Critical Hit."
      }
    ],
    description: "A reverse-blade sword, meaning the side where the edge normally would be is dull, and vice versa. It is somewhat less lethal with a dull edge, and can be flipped should you need to cut, but it requires a skilled hand to avoid hurting yourself.",
    location: ["Random drops", "Eastern Drop Table"]
  },
  // 7★ Weapons
  {
    name: "Raijin",
    rarity: 7,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Electrical",
        str: 70,
        luc: 40
      }
    ],
    specials: [
      {
        name: "Lightning Damage",
        type: "OnHit",
        description: "Deals magic Lightning bonus damage equal to 50% of your Lightning ATK, which ignores armor."
      },
      {
        name: "Lightning Resistance",
        type: "Passive",
        description: "10% Lightning Resistance"
      },
      {
        name: "Kuuga",
        type: "PotentialSkill",
        description: "The Kensei skill Hidden Cut's effect changes in the following ways; Damage becomes Lightning magic damage, and can Lightning Critical."
      }
    ],
    description: "A katana forged in the chaotic skies of a storm, or so it's said.",
    location: ["Random drops", "Lightning Drop Table"]
  },
  {
    name: "Akuijin",
    rarity: 7,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Darkness Damage",
        type: "OnHit",
        description: "Deals magic Darkness bonus damage equal to 50% of your Darkness ATK, which ignores armor."
      },
      {
        name: "Darkness Resistance",
        type: "Passive",
        description: "10% Darkness Resistance"
      },
      {
        name: "Dark Moon",
        type: "PotentialSkill",
        description: "The Kensei skill Hidden Cut's effect changes in the following ways; Damage becomes Dark magic damage. Monsters who are defeated by this effect melt, becoming Dark Water tiles in a 2 Range circle for 3 rounds."
      }
    ],
    description: "A katana forged in a pit of evil, or so it's said.",
    location: ["Random drops", "Dark Drop Table"]
  },
  {
    name: "Sanjin",
    rarity: 7,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Acid Damage",
        type: "OnHit",
        description: "Deals magic Acid bonus damage equal to 50% of your Acid ATK, which ignores armor."
      },
      {
        name: "Acid Resistance",
        type: "Passive",
        description: "10% Acid Resistance"
      },
      {
        name: "Mossy Grave",
        type: "PotentialSkill",
        description: "The Kensei skill Hidden Cut's effect changes in the following ways; Damage becomes Acid magic damage. Monsters who are defeated by this effect melt, becoming LV 30 Poison Pool tiles in a 2 Range circle for 3 rounds."
      }
    ],
    description: "A katana forged in the stomach of a monster, or so it's said.",
    location: ["Random drops", "Snake Drop Table"]
  },
  {
    name: "Hakouhen Masterwork Katana",
    rarity: 7,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 10,
    accuracy: 85,
    critical: 8,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Weapon Properties",
        type: "Passive",
        description: "Always comes with the Sharp, Precise, Deadly, and Lightweight properties."
      }
    ],
    description: "The Hakouhen style could best be described as a hawk swooping in for the kill; an aerial attack that is precise, powerful, and deadly. This is a sword made specifically for the followers of that school, and it works well as a lightweight weapon focused on attacking. However, because it's lightweight, the material is somewhat thin, making it easier to break than other weapons.",
    location: ["G6 Only - Oniga Quest"]
  },
  {
    name: "Sea Hunter Sword",
    rarity: 7,
    weaponType: "Sword",
    subtype: "Greatsword",
    range: 1,
    power: 13,
    accuracy: 80,
    critical: 7,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Aquatic",
        str: 70,
        vit: 40
      }
    ],
    specials: [
      {
        name: "Anti-Seafaring",
        type: "OnHit",
        description: "Inflicts Hunted LV14 for 3 rounds if the target is a seafaring monster."
      },
      {
        name: "Coral Material",
        type: "Passive",
        description: "Always comes made of Coral. (+1 Power, +3 Accuracy, +3 Critical, +1 Weight, +3 Water ATK.)"
      }
    ],
    description: "This sword was born from the sea, and as anyone who lives there knows, anything that lives in the sea is out to get everything else... that lives in the sea.",
    location: ["Fishing Contest Chest"]
  },
  // 8★ Weapons
  {
    name: "Hisen",
    rarity: 8,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 125,
    weight: 3,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Fatal Stroke",
        type: "PotentialSkill",
        description: "The Kensei skill Hidden Cut's effect changes in the following ways; Sheath Sword's FP cost is increased to 25 FP. Damage is increased by 25% and can critically hit. Against non-boss monsters, the damage is increased by 100% instead. If an enemy damaged by this effect is defeated by it, you regain 5 FP for each."
      }
    ],
    description: "A deadly katana, which is fragile, but extremely sharp.",
    location: ["Random drops", "Labyrinth Drop Table"]
  },
  {
    name: "Braver Replica",
    rarity: 8,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 16,
    accuracy: 90,
    critical: 0,
    criticalDamage: 110,
    weight: 15,
    damageType: "Slash",
    scaling: [
      {
        type: "Replica",
        str: 70,
        ski: 20,
        san: 20
      }
    ],
    specials: [
      {
        name: "Divine Weapon",
        type: "Passive",
        description: "Always comes enchanted with Divine Weapon. (+2 Power, +5 Accuracy, +5 Critical, -2 Weight. Unbreakable.)"
      }
    ],
    description: "A replica of a famous sword used by Ryart. It possesses extremely high power.",
    location: ["Casino"]
  },
  {
    name: "Ensui",
    rarity: 8,
    weaponType: "Sword",
    range: 1,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Water",
    scaling: [
      {
        type: "Aquatic",
        str: 70,
        vit: 40
      }
    ],
    specials: [
      {
        name: "Protective Bubble",
        type: "Passive",
        description: "Encases you in a protective bubble, reducing all damage you take by 4-7."
      },
      {
        name: "Dragon Remains",
        type: "Passive",
        description: "Always comes made of Dragon Remains. (+3 Power, +5 Accuracy, +5 Critical, +8 Weight.)"
      }
    ],
    description: "A sword made from the remains of a water dragon; it smashes waves against your enemies.",
    location: ["Random drops", "Metalwork (Lv5)", "Water Drop Table", "Snake Drop Table"]
  },
  {
    name: "Narcus",
    rarity: 8,
    weaponType: "Sword",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Fire",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Narcus Revenge",
        type: "Passive",
        description: "Upon taking damage: Gain Narcus LV X (X = 50% of damage taken) for 2 rounds, which causes your next basic attack that hits to deal Fire magic bonus damage that ignores armor equal to LV. (Does not stack, but status will refresh upon taking damage if it would result in a higher LV.)"
      },
      {
        name: "Dragon Remains",
        type: "Passive",
        description: "Always comes made of Dragon Remains. (+3 Power, +5 Accuracy, +5 Critical, +8 Weight.)"
      }
    ],
    description: "A flaming sword made from the remains of a fire dragon. It takes punishment and returns it.",
    location: ["Random drops", "Metalwork (Lv5)", "Fire Drop Table", "Snake Drop Table"]
  },
  {
    name: "Kirosh",
    rarity: 8,
    weaponType: "Sword",
    range: 1,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Dark",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    specials: [
      {
        name: "Trap Immunity",
        type: "Passive",
        description: "You do not trigger traps or other field hazards while moving."
      },
      {
        name: "Dragon Remains",
        type: "Passive",
        description: "Always comes made of Dragon Remains. (+3 Power, +5 Accuracy, +5 Critical, +8 Weight.)"
      }
    ],
    description: "A sword made from the remains of a dark dragon. Its movements cannot be traced.",
    location: ["Random drops", "Metalwork (Lv5)", "Dark Drop Table", "Snake Drop Table"]
  },
  {
    name: "Setsuna",
    rarity: 8,
    weaponType: "Sword",
    range: 1,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Light",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Enemy Analysis",
        type: "Passive",
        description: "Shows the statistics and skills of most non-monster enemies."
      },
      {
        name: "Dragon Remains",
        type: "Passive",
        description: "Always comes made of Dragon Remains. (+3 Power, +5 Accuracy, +5 Critical, +8 Weight.)"
      }
    ],
    description: "A sword made from the remains of a blind dragon. Truth cannot be hidden.",
    location: ["Random drops", "Metalwork (Lv5)", "Light Drop Table", "Snake Drop Table"]
  },
  {
    name: "Shine Sword",
    rarity: 8,
    weaponType: "Sword",
    range: 1,
    power: 10,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Light Damage",
        type: "OnHit",
        description: "Deals magic Light bonus damage equal to 50% of your Light ATK, which ignores armor."
      },
      {
        name: "Stat Bonus",
        type: "Passive",
        description: "+2 WIL, +2 FAI."
      },
      {
        name: "Blessed",
        type: "Passive",
        description: "Always comes enchanted with Blessed. (Against Undead, Ghost, and Possessed Enemies: Increases weapon's hit by half of your Scaled FAI.)"
      },
      {
        name: "Shine Knighting",
        type: "PotentialSkill",
        description: "Requires a Rank D Invocation. After casting, you will temporarily change into a Shine Knight for 5 rounds. While you are a Shine Knight, you gain +5 to all stats, and access to certain new passive skills. (Shining in the Darkness: Grants the owner of this skill immunity to Dark and Light damage.) (Shining Radiance: Enemies who attack the owner of this skill are treated as if they were Blinded, potentially reducing their Hit.)"
      }
    ],
    description: "Radiant like a jewel... A blessed sword that shines in the holy light of Mercala.",
    location: ["Random drops", "Metalwork (Lv4)", "Light Drop Table"]
  },
  {
    name: "Larveget",
    rarity: 8,
    weaponType: "Sword",
    subtype: "Instrument",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Aquatic",
        str: 70,
        vit: 40
      }
    ],
    specials: [
      {
        name: "Sound ATK Substitution",
        type: "OnHit",
        description: "Replaces your Sound ATK with the target's for 2 rounds."
      },
      {
        name: "Death Ant Shriek",
        type: "PotentialSkill",
        description: "Song skill. Requires Substitute Sound ATK to be active. Consumes the status caused by the weapon, deals 20 armor-ignoring Sound Kickback damage to you, and accelerates any Silence effect you're suffering from by 1 round. Additionally grants you Larveget's Cursed Wail (LV = 35% of Substituted Sound ATK, min. 5, 5 rounds). (Larveget's Cursed Wail - -10% Status Resistance. Enemies who attack you take armor-ignoring Sound magic bonus damage equal to LV and apply or power up Cursed Wound by LV (3 rounds). Triggers only once per action.)"
      }
    ],
    description: "A sword said to be made from the remains of an insect-god whose screams cursed all who harmed him.",
    location: ["Random drops", "Water Drop Table"]
  },
  // 9★ Weapons
  {
    name: "Rogue Dasher",
    rarity: 9,
    weaponType: "Sword",
    range: 1,
    power: 14,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 15,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Anti-Light Armor",
        type: "Passive",
        description: "Increases Scaled Weapon ATK by 20% if the target's armor type is Light Armor."
      }
    ],
    description: "A sword made to dash the dastardly and not much else.",
    location: ["Random drops", "Highway Drop Table"]
  },
  {
    name: "Sogensara",
    rarity: 9,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Ice Damage",
        type: "OnHit",
        description: "Deals magic Ice bonus damage equal to 50% of your Ice ATK, which ignores armor."
      },
      {
        name: "Everblue",
        type: "GrantsSkill",
        description: "Targets a tile up to 8 Range away that contains an enemy or plant special tile. Creates Ice Sheets in the line along from your current location to that tile, which last 3 rounds. Plant special tiles are frozen and turn into dense ice statues. If an enemy is the target and they are a Plant, they are inflicted with Frozen LV 10 for 2 rounds, but this skill enters a 3 round cooldown.",
        momentumCost: 3,
        fpCost: 10
      }
    ],
    description: "An icy katana that gives nature a respite.",
    location: ["Random drops", "Ice Drop Table"]
  },
  {
    name: "Spectre Sword",
    rarity: 9,
    weaponType: "Sword",
    range: 1,
    power: 11,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Slash",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    specials: [
      {
        name: "Darkness Damage",
        type: "OnHit",
        description: "Deals magic Darkness bonus damage equal to 50% of your Darkness ATK, which ignores armor."
      },
      {
        name: "Haunted Soul",
        type: "Passive",
        description: "Always comes enchanted with Haunted Soul. (Inflicts Fear on hit for 2 rounds. -25% Status Resist.)"
      },
      {
        name: "Grudge",
        type: "PotentialSkill",
        description: "When you are defeated by an enemy, if you are not Badly Beaten, that enemy takes 100 Akashic magic damage that ignores protection."
      }
    ],
    description: "A sword possessed by a powerful spectre that has tainted it with the power of darkness.",
    location: ["Random drops", "Spectre Knight", "Dark Drop Table"]
  },
  {
    name: "Black Xyston",
    rarity: 9,
    weaponType: "Sword",
    range: 1,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 14,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Dual Weapon Type",
        type: "Passive",
        description: "Also qualifies as a Polearm weapon."
      }
    ],
    description: "A large, black, double-edged sword that curves near the base like an umbrella, letting it also function as a spear.",
    location: ["Random drops", "Labyrinth Drop Table"]
  },
  {
    name: "Salamander Sword",
    rarity: 9,
    weaponType: "Sword",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Power Stacking",
        type: "Passive",
        description: "Increases the Power of Salamander Sword by 5 every time you deal Fire damage, up to a maximum of +100 Power. (Lasts for the entirety of the battle. Non-monster targets only give +2 Power.)"
      }
    ],
    description: "Made from cooled salamander blood. This doesn't mean the sword can't get hot again, of course.",
    location: ["Random drops", "Fire Drop Table"]
  },
  // 10★ Weapons
  {
    name: "Hooked Twinblade",
    rarity: 10,
    weaponType: "Sword",
    range: 1,
    power: 14,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Pierce Bonus Damage",
        type: "OnHit",
        description: "Deals physical Pierce bonus damage equal to UL, which ignores armor."
      },
      {
        name: "Parry Penetration",
        type: "Passive",
        description: "Reduces the damage reduction of Parry skills triggered by this weapon's basic attack by UL%."
      }
    ],
    description: "This almost snake-like double blade has some nasty hooks, allowing it to squirm in even through an opponent's parry.",
    location: ["Snakemen Twinblade (Lv56+)"]
  },
  {
    name: "Gigantys",
    rarity: 10,
    weaponType: "Sword",
    subtype: "Greatsword",
    range: 1,
    power: 13,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 5,
    damageType: "Slash",
    scaling: [
      {
        type: "Aquatic",
        str: 70,
        vit: 40
      }
    ],
    specials: [
      {
        name: "Weight Scaling",
        type: "Passive",
        description: "Increases Weight by UL."
      },
      {
        name: "Heavy Attacks",
        type: "Passive",
        description: "Basic attacks cost 4M, but inflict bonus damage equal to Weight and can Guard Break."
      },
      {
        name: "Dragon Remains",
        type: "Passive",
        description: "Always comes made of Dragon Remains. (+3 Power, +5 Accuracy, +5 Critical, +8 Weight.)"
      }
    ],
    description: "Made of a large piece of bone from a long dead monster, Gigantys is large and very difficult to wield. However, for those that can manage the burden, its weight also give it extremely potent attack force.",
    location: ["Gigas Rex (Lv56+)"]
  },
  {
    name: "Tarnada",
    rarity: 10,
    weaponType: "Sword",
    subtype: "Katana",
    range: 1,
    power: 15,
    accuracy: 80,
    critical: 10,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Sylphid",
        str: 70,
        cel: 40
      }
    ],
    specials: [
      {
        name: "Tarnada Charges",
        type: "OnCrit",
        description: "On Critical: Gain 1+(UL/2) Tarnada Charges. Then, if you have 100 or more Tarnada Charges, consumes them and casts Vydel on the target for free."
      }
    ],
    description: "Tarnada is a sword empowered by the storms of the desert on Gold. Storing that power, it will suddenly and chaotically unleash it when it decides it wants to.",
    location: ["Jammer Delta (Lv56+)"]
  },
  {
    name: "Kingslayer",
    rarity: 10,
    weaponType: "Sword",
    range: 1,
    power: 14,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Elite Slayer",
        type: "Passive",
        description: "Increases the total Power of attacks and skills this weapon is used in by UL%, but only if the enemy is a Boss monster or has at least one 10* item equipped."
      }
    ],
    description: "The Kingslayer is a powerful sword in its own right, but it has an almost otherworldly efficiency at killing those sitting at the top of the food chain... at least, the ones that can be killed.",
    location: ["Jammer (Lv56+)"]
  },
  {
    name: "Spine Leash",
    rarity: 10,
    weaponType: "Sword",
    subtype: "Whip",
    range: 1,
    power: 14,
    accuracy: 80,
    critical: 10,
    criticalDamage: 110,
    weight: 14,
    damageType: "Ice",
    scaling: [
      {
        type: "Cold",
        str: 70,
        ski: 40
      }
    ],
    specials: [
      {
        name: "Range Scaling",
        type: "Passive",
        description: "Attack range increases by 1 for every 7 UL."
      },
      {
        name: "Ice ATK Bonus",
        type: "Passive",
        description: "Increases Ice ATK by UL/2. (Doesn't stack.)"
      },
      {
        name: "Ghostly Dog",
        type: "OnBattleStart",
        description: "On Battle Start: If UL is at least 10 and fighting monsters, a ghostly dog manifests and joins your battle as an ally."
      }
    ],
    description: "A bone-like whip that seems to be made from a spine of some creature, although it looks nothing like any animal you've seen. The surface of the bone seems to be covered in frost.",
    location: ["Ghost Dog (Lv56+)"]
  }
];

// ==================== BOWS ====================
export const BOWS: Weapon[] = [
  {
    name: "Adversity Annihilator",
    rarity: 9,
    weaponType: "Bow",
    subtype: "Shortbow",
    range: 3,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Sylphid",
        str: 70,
        cel: 40
      }
    ],
    specials: [
      {
        name: "Anti-Summoner",
        type: "Passive",
        description: "On Attacking a Summoner or Youkai: Attacks all controlled youkai and the Summoner."
      }
    ],
    description: "A magical bow that seems to be in rough shape. It seeks out summoners and their ilk with worrying enthusiasm. As to where it came from and why it exists, that much is unclear.",
    location: ["Random drops"]
  },
  {
    name: "Artemis Replica",
    rarity: 8,
    weaponType: "Bow",
    range: 3,
    power: 16,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 15,
    damageType: "Slash",
    scaling: [
      {
        type: "Replica",
        str: 70,
        ski: 20,
        san: 20
      }
    ],
    enchantment: "Divine Weapon",
    specials: [
      {
        name: "Divine Weapon",
        type: "Passive",
        description: "+2 Power, +5 Critical, +5 Accuracy, -2 Weight. Weapon durability cannot decrease."
      }
    ],
    description: "A replica of the bow used by Mercala. It possesses extremely high power.",
    location: ["Random drops"]
  },
  {
    name: "Blind Bright",
    rarity: 10,
    weaponType: "Bow",
    subtype: "Whip",
    range: 3,
    power: 12,
    accuracy: 80,
    critical: 10,
    criticalDamage: 110,
    weight: 15,
    damageType: "Slash",
    scaling: [
      {
        type: "Faithful",
        str: 40,
        ski: 30,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Light ATK Bonus",
        type: "Passive",
        description: "Increases Light ATK by UL/2. (Doesn't stack.)"
      },
      {
        name: "Whip Glow",
        type: "OnNewRound",
        description: "If there is a Light Shaft at your location, the whip glows. This effect also activates when you step on a Light Shaft, and when one is created at your location."
      },
      {
        name: "Glow Benefits",
        type: "Passive",
        description: "While the whip is glowing, you gain +10 Status Resistance, you are immune to Light Shafts, and damage from this weapon cannot hurt allies (even if you are Confused)."
      },
      {
        name: "Light Burst",
        type: "OnHit",
        description: "If the whip is glowing, the target and enemies within 3 Range of it are caught in a burst of light, which deals Light magic bonus damage that ignores armor equal to 20% + (UL x 4)% of your Light ATK which can critically hit, and inflicts them with Glowing LV 10 for 2 rounds. The whip then stops glowing."
      }
    ],
    description: "This bow has a string that envelops itself in light, allowing it to extend and lash out, much like a tail or whip. The holy magic that it glows with protects friends and punishes foes.",
    location: ["Level 56+ Yellow Dragon Knights"]
  },
  {
    name: "Bow",
    rarity: 1,
    weaponType: "Bow",
    range: 3,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "A common bow.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Bow (Enhanced)",
    rarity: 2,
    weaponType: "Bow",
    range: 3,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 SKI"
      }
    ],
    description: "A common bow.",
    location: ["Enchanting"]
  },
  {
    name: "Bow of the Green Forest",
    rarity: 4,
    weaponType: "Bow",
    range: 3,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Cunning",
        str: 70,
        gui: 40
      }
    ],
    specials: [
      {
        name: "Poison on Crit",
        type: "OnCrit",
        description: "Inflicts Poison LV 3 for 3 rounds. If already poisoned, instead increases duration and LV by 3."
      },
      {
        name: "Poisonous Forest",
        type: "PotentialSkill",
        description: "Stepping on a plant tile that was not created by another unit transfers ownership of it to you. At the start of a new round, all plant tiles you own spawn a Creeping Poison Mist LV X (X = half of your level, min. 3) for 5 rounds. Creeping Poison Mist can inflict Poison with the same LV when created and at the start of a new round. If no enemy is in the same tile, it will slowly move towards one."
      }
    ],
    description: "Made from the wood of a tree deep in a noxious forest.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Crossbow",
    rarity: 2,
    weaponType: "Bow",
    subtype: "Crossbow",
    range: 2,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 120,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        ski: 100
      }
    ],
    description: "A heavy but effective alternative to bows, the crossbow is simple enough that almost anyone can use it.",
    location: ["Random drops", "Purchased from Blacksmiths"]
  },
  {
    name: "Daikyu",
    rarity: 4,
    weaponType: "Bow",
    range: 3,
    power: 12,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 14,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Two-Hand Bonus",
        type: "Passive",
        description: "When you are two-handing this weapon, it gains +2 Farshot Bonus."
      },
      {
        name: "Daikyu Snipe",
        type: "PotentialSkill",
        description: "Targets 1 unoccupied tile within 1 Range and fires a long-reaching arrow from the Daikyu, which travels up to 15 tiles away. The first enemy hit by the arrow is attacked by the Daikyu with no Farshot Penalty. If the bow is fitted with Light Arrows, this arrow cannot be reflected, dispells Darkness tiles it passes near, and gains +100 Critical against Supernatural enemies. If you have 40+ FAI, it also creates Sanctuary tiles (LV 1, 2 rounds).",
        momentumCost: 3,
        fpCost: 15
      }
    ],
    description: "The daikyu is a longbow with an irregular draw, positioned below the center of the bow. This makes the bow well-suited for use on horseback, as the bow is less likely to catch on the horse. However, the stress on the wood requires greater levels of maintenance, and its draw form is different from standard bows. Someone using a daikyu without the proper training will not have a functional one for long.",
    location: ["Random drops"]
  },
  {
    name: "Fae Bow",
    rarity: 9,
    weaponType: "Bow",
    subtype: "Shortbow",
    range: 3,
    power: 12,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 11,
    damageType: "Slash",
    scaling: [
      {
        type: "Electrical",
        str: 70,
        luc: 40
      }
    ],
    specials: [
      {
        name: "Fairy Synergy",
        type: "Passive",
        description: "Scaled Weapon Attack increased by 15 for each Fairy-race ally."
      },
      {
        name: "Midsummer's Majesty",
        type: "SpecialStrike",
        description: "Triggers after the attack hits an enemy. Restores 50 HP to yourself and all Fairy Youkai you have summoned. Furthermore, it has a chance to inflict the target with Charm LV X (X = 10 + 10 per Fairy ally, max. 50) for 3 rounds.",
        triggerRate: "10% + 8% Bonus"
      }
    ],
    description: "This bow was blessed in long forgotten forests by the whimsical fae, and it only grows stronger near them.",
    location: ["Random drops"]
  },
  {
    name: "Filcherbird",
    rarity: 10,
    weaponType: "Bow",
    subtype: "Shortbow",
    range: 4,
    power: 13,
    accuracy: 85,
    critical: 5,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Sylphid",
        str: 70,
        cel: 40
      }
    ],
    specials: [
      {
        name: "Auto Steal",
        type: "OnHit",
        description: "UL% of automatically applying Steal to the target. (Does not activate Trickery effects.)"
      }
    ],
    description: "This little bird may have crooked wings, but her arrows fly true and may even come back with a little something special.",
    location: ["Level 56+ Bandit Archer"]
  },
  {
    name: "Fortune's Favor",
    rarity: 7,
    weaponType: "Bow",
    range: 3,
    power: 14,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 7,
    damageType: "Slash",
    scaling: [
      {
        type: "Dextria-Lightning",
        str: 70,
        luc: 40
      }
    ],
    specials: [
      {
        name: "LUC Bonus",
        type: "Passive",
        description: "+5 LUC"
      },
      {
        name: "FP Recovery",
        type: "Passive",
        description: "When you deal non-bonus damage that an enemy is weak to, you recover 10 FP."
      },
      {
        name: "Weak Seeker",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked. Increases the damage the attack deals by 5, and changes the damage type to the element the attack target is weakest against (if any).",
        triggerRate: "10% + 8% Bonus"
      }
    ],
    description: "A magical bow that will ensure you get some lucky shots in.",
    location: ["Random drops"]
  },
  {
    name: "Gel'naia",
    rarity: 3,
    weaponType: "Bow",
    range: 3,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 11,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Fire Damage",
        type: "OnHit",
        description: "Deals magic Fire damage equal to 50% of your Fire ATK, which ignores armor."
      },
      {
        name: "Burning Rope",
        type: "PotentialSkill",
        description: "The Archer skill Pulling Shot is changed in the following ways: 1. The attack damage becomes Fire element. 2. Tiles the rope passes over create Cinders LV X (X = 25% Fire ATK) for 3 rounds. 3. Increases FP cost by 5."
      }
    ],
    description: "A magical bow originally created by a famous bowsmith, any arrow it fires will be ignited.",
    location: ["Random drops"]
  },
  {
    name: "Grandia",
    rarity: 8,
    weaponType: "Bow",
    range: 3,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 125,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Lightning ATK Substitute",
        type: "OnHit",
        description: "Replaces your Lightning ATK with the target's for 2 rounds."
      },
      {
        name: "Neutralize Charge",
        type: "PotentialSkill",
        description: "Requires Substitute Lightning ATK to be active. Consumes the status caused by the weapon, deals 20 kickback Lightning magic damage to you, and cures any Magentize and Interference status you have.",
        momentumCost: 1,
        fpCost: 0,
        cooldown: 3
      }
    ],
    description: "A bow with an odd shape that creates wounds in the shape of lightning bolts.",
    location: ["Random drops"]
  },
  {
    name: "Guiding Shot",
    rarity:  1,
    weaponType: "Bow",
    subtype: "Shortbow",
    range: 3,
    power: 5,
    accuracy: 90,
    critical: 0,
    criticalDamage: 110,
    weight: 8,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    description: "This bow has been modified with a guide, making it easier to use and more accurate.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Hankyu",
    rarity: 5,
    weaponType: "Bow",
    subtype: "Shortbow",
    range: 3,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Close Range Bonus",
        type: "Passive",
        description: "When you are two-handing this weapon, it gains +10 Power and +10 Critical against enemies within 2 Range."
      },
      {
        name: "Hankyu Posture",
        type: "PotentialSkill",
        description: "Take a swift knee and gain Firing Posture (until your next turn). Gain +10 Evade and Critical Evade while in Firing Posture. If the Hankyu is fitted with Light Arrows, attacks while in Firing Posture deal 75% of your Light ATK as armor-ignoring bonus magic damage (doubled against Supernatural enemies). If you have 40+ FAI, attacking a field object while in Firing Posture applies this bonus damage to all enemies in 3 Range of it.",
        momentumCost: 1,
        fpCost: 0
      }
    ],
    description: "The hankyu is a more compact version of the daikyu bow, with an irregular, uneven draw slightly below the center of the bow. While its power at long distances is less impressive than its sister bow, its smaller body allows it to be used for low profile shooting, such as when ducking.",
    location: ["Random drops"]
  },
  {
    name: "Harp Bow",
    rarity: 3,
    weaponType: "Bow",
    subtype: "Instrument",
    range: 3,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Dextria-Sound",
        str: 80,
        san: 30
      }
    ],
    specials: [
      {
        name: "Sound ATK Bonus",
        type: "Passive",
        description: "+5 Sound ATK"
      },
      {
        name: "Song Enhancement",
        type: "Passive",
        description: "When played (via a Song Skill): Gain a status that causes Harp Bow basic attacks to deal 15 bonus armor-ignoring Sound magic damage on hit, for 3 rounds."
      }
    ],
    description: "An odd but interesting bow made in the shape of a harp. It is functional as both a weapon and an instrument.",
    location: ["Random drops"]
  },
  {
    name: "Hell Sniper",
    rarity: 6,
    weaponType: "Bow",
    range: 3,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 9,
    damageType: "Slash",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    enchantment: "Tainted (Cursed)",
    specials: [
      {
        name: "Tainted Curse",
        type: "Passive",
        description: "Always drops with the Tainted (Cursed) enchantment."
      },
      {
        name: "Enhanced Marked Target",
        type: "Passive",
        description: "Marked Target damage bonus increases by 8% when triggered by this weapon."
      },
      {
        name: "Cursed Marking",
        type: "OnNewRound",
        description: "If this weapon is Cursed or Doomed, lose 15 HP (non-fatal) and a random enemy becomes one of your Marked Targets (LV 15)."
      }
    ],
    description: "This bow glowers with a fatal curse, and its arrows are painfully accurate, even when fired from hell.",
    location: ["Random drops"]
  },
  {
    name: "Howling Handshot",
    rarity: 9,
    weaponType: "Bow",
    subtype: "Crossbow",
    range: 2,
    power: 12,
    accuracy: 80,
    critical: 0,
    criticalDamage: 120,
    weight: 25,
    damageType: "Slash",
    scaling: [
      {
        type: "Precision",
        str: 30,
        ski: 70
      }
    ],
    specials: [
      {
        name: "Dual Type",
        type: "Passive",
        description: "Also qualities as a Sword weapon."
      },
      {
        name: "Razor Flurry",
        type: "PotentialSkill",
        description: "Changes the Archer skill Aerial Razor in the following ways; +5 FP cost. The skill will affect all cardinal directions around the user, instead of just the one they are facing."
      }
    ],
    description: "A somewhat large and very heavy crossbow. The edges of its front half are razor sharp. Be careful not to chop your hand off when reloading.",
    location: ["Random drops"]
  },
  {
    name: "Hunting Bow",
    rarity: 2,
    weaponType: "Bow",
    subtype: "Shortbow",
    range: 3,
    power: 6,
    accuracy: 80,
    critical: 10,
    criticalDamage: 125,
    weight: 8,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 100
      }
    ],
    specials: [
      {
        name: "On The Hunt",
        type: "PotentialSkill",
        description: "Targets an enemy up to 8 Range away and inflicts Hunted on them with a LV equal to half of UL, for 3 rounds. (LV increased by 2x for Beast race, 1.5x for Kaelensia.) Using this skill will end any currently active Hunted status effects you have applied.",
        momentumCost: 3,
        fpCost: 0,
        cooldown: 3
      }
    ],
    description: "A strong bow for driving arrows into the vital points of the target. Often used for hunting animals.",
    location: ["Random drops"]
  },
  {
    name: "Knightslayer",
    rarity: 3,
    weaponType: "Bow",
    range: 3,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 13,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Armor Reduction",
        type: "Passive",
        description: "Reduces effectiveness of enemy Armor by 5."
      },
      {
        name: "Wear Down",
        type: "PotentialSkill",
        description: "When an enemy is damaged by weapons that reduce enemy Armor effectiveness, either by basic attacks or by skills using them, a Wear Down status is applied for 3 rounds, or powered up. This status decreases the enemy's Armor by 5 per LV. (Max LV of 20, max duration of 3 rounds.)"
      }
    ],
    description: "Pierces full plate as if it were tree bark.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Kraken's Sigh",
    rarity: 10,
    weaponType: "Bow",
    range: 5,
    power: 14,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 14,
    damageType: "Slash",
    scaling: [
      {
        type: "Cold",
        str: 70,
        ski: 40
      }
    ],
    material: "Coldbark",
    specials: [
      {
        name: "Coldbark Material",
        type: "Passive",
        description: "+5 Critical, -5 Accuracy, +3 Ice ATK"
      },
      {
        name: "Ice Immunity Negation",
        type: "Passive",
        description: "Negates Ice immunity and absorb effects for you and enemies you damage or are damaged by."
      },
      {
        name: "Icy Spear",
        type: "Passive",
        description: "This weapon's attack skill has a ULx2% chance of launching an icey spear at the target, travelling in a line towards them, creating Ice Sheets (5 rounds) in its path. Enemies that the spear travels within 1 Range of also become attack targets, and all attack targets take bonus damage equal to 10 + UL. (1 round CD)"
      }
    ],
    description: "A tendril-styled bow that is chilly to the touch.",
    location: ["Level 56+ Grindylows"]
  },
  {
    name: "Longbow",
    rarity: 3,
    weaponType: "Bow",
    range: 3,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "Tannis, a fishing village located high in the mountains, uses these high-quality bows in their militia.",
    location: ["Random drops"]
  },
  {
    name: "Magical Meteor",
    rarity: 7,
    weaponType: "Bow",
    range: 3,
    power: 12,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Magical",
        str: 70,
        wil: 40
      }
    ],
    specials: [
      {
        name: "Spelledge",
        type: "Passive",
        description: "This weapon can be used as a casting tool for spells."
      }
    ],
    description: "Leave streaks of stardust across the sky. Will not help you transform, however.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Nighthunt",
    rarity: 3,
    weaponType: "Bow",
    range: 3,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 11,
    damageType: "Slash",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    specials: [
      {
        name: "SKI Reduction",
        type: "OnHit",
        description: "Target suffers -5 SKI for 2 rounds."
      }
    ],
    description: "A bow of darkness that no one can hide from.",
    location: ["Random drops"]
  },
  {
    name: "Razing Salamander",
    rarity: 10,
    weaponType: "Bow",
    range: 5,
    power: 14,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 14,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    material: "Firebark",
    specials: [
      {
        name: "Firebark Material",
        type: "Passive",
        description: "+2 Power, -5 Critical, +3 Fire ATK"
      },
      {
        name: "Fire Immunity Negation",
        type: "Passive",
        description: "Negates Fire immunity and absorb effects for you and enemies you damage or are damaged by."
      },
      {
        name: "Fiery Spear",
        type: "Passive",
        description: "This weapon's attack skill has a ULx2% chance of launching a fiery spear at the target, travelling in a line towards them, creating Cinders (LV 15, 3 rounds) in its path. Enemies that the spear travels within 1 Range of also become attack targets, and all attack targets take bonus damage equal to 10 + UL. (1 round CD)"
      }
    ],
    description: "Made of salamander skin, this bow is warm to the touch. Like a volcano, it will suddenly and violently erupt, often in a painful way.",
    location: ["Level 56+ Lava Slime"]
  },
  {
    name: "Redwing",
    rarity: 3,
    weaponType: "Bow",
    range: 3,
    power: 7,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Vampiric",
        str: 80,
        vit: 30
      }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%)"
      }
    ],
    description: "Makes the blood of your enemies fly.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Sea Hunter Bow",
    rarity: 7,
    weaponType: "Bow",
    range: 3,
    power: 13,
    accuracy: 80,
    critical: 7,
    criticalDamage: 110,
    weight: 10,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    material: "Coral",
    specials: [
      {
        name: "Coral Material",
        type: "Passive",
        description: "+1 Power, +3 Critical, +3 Accuracy, +1 Weight, +3 Water ATK"
      },
      {
        name: "Hunted",
        type: "OnHit",
        description: "Inflicts Hunted LV14 for 3 rounds if the target is a seafaring monster."
      }
    ],
    description: "This bow was born from the sea, and as anyone who lives there knows, anything that lives in the sea is out to get everything else... that lives in the sea.",
    location: ["Fishing Contest"]
  },
  {
    name: "Soulshot",
    rarity: 4,
    weaponType: "Bow",
    range: 3,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 12,
    damageType: "Slash",
    scaling: [
      {
        type: "Spiritual",
        str: 70,
        san: 40
      }
    ],
    specials: [
      {
        name: "Leyline Path",
        type: "OnHit",
        description: "Leaves a leyline path to the target, causing your next attack against them to automatically hit."
      }
    ],
    description: "A bow that leads arrows with spiritual guidance.",
    location: ["Random drops", "Woodworking"]
  },
  {
    name: "Spirit Bow",
    rarity: 4,
    weaponType: "Bow",
    range: 3,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 8,
    damageType: "Slash",
    scaling: [
      {
        type: "Spiritual",
        str: 70,
        san: 40
      }
    ],
    specials: [
      {
        name: "Focus Restoration",
        type: "Passive",
        description: "Restores Focus based on damage dealt. (10%)"
      }
    ],
    description: "This bow absorbs Focus from the wounds that it makes.",
    location: ["Random drops"]
  },
  {
    name: "Star Shooter",
    rarity: 10,
    weaponType: "Bow",
    range: 3,
    power: 15,
    accuracy: 85,
    critical: 0,
    criticalDamage: 110,
    weight: 15,
    damageType: "Slash",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Shooting Stars",
        type: "OnNewRound",
        description: "Fires shooting stars at all enemies, dealing UL/2 unresistable Light damage."
      },
      {
        name: "Light Shaft Creation",
        type: "OnHit",
        description: "Creates a Light Shaft (LV = UL) at the target's location for 3 Rounds."
      }
    ],
    description: "A bow of light that produces stars around it. These stars will fly towards your enemies and help them see stars in a different sense of the phrase.",
    location: ["Level 56+ Divine Knight"]
  }
];

// ==================== DAGGERS ====================
export const DAGGERS: Weapon[] = [
  // 1★ Weapons
  {
    name: "Dagger",
    rarity: 1,
    weaponType: "Dagger",
    range: 1,
    power: 3,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Basic", gui: 100 }
    ],
    specials: [
      {
        name: "Forbidden Technique",
        type: "PotentialSkill",
        description: "Inflicts you with Cursed Vengeance LV10 for 3 rounds. (Cursed Vengeance increases your damage by LV%, but drains your HP by LV% of your maximum HP every round.)",
        momentumCost: 3,
        fpCost: 20
      }
    ],
    description: "A simple dagger that anyone can use.",
    location: ["Random Drops", "Purchased from Tutorial", "Purchased from Blacksmiths", "Metalworking"]
  },
  {
    name: "Lute",
    rarity: 1,
    weaponType: "Dagger",
    subtype: "Instrument",
    range: 3,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 5,
    damageType: "Sound",
    scaling: [
      { type: "Dextria-Sound", gui: 80, san: 30 }
    ],
    description: "The lute is a musician's best friend. If you're a bard, don't leave home without it - you'll need an instrument to play your songs, after all.",
    location: ["Random Drops"]
  },
  {
    name: "Whip",
    rarity: 1,
    weaponType: "Dagger",
    subtype: "Whip",
    range: 4,
    power: 4,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 5,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 70, ski: 30 }
    ],
    description: "An incredibly simple yet effective weapon, the whip is less about lethality and more about threat.",
    location: ["Random Drops", "Tutorial", "Metalworking"]
  },
  // 2★ Weapons
  {
    name: "Dagger (Enhanced)",
    rarity: 2,
    weaponType: "Dagger",
    range: 1,
    power: 3,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Basic", gui: 100 }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 GUI"
      },
      {
        name: "Forbidden Technique",
        type: "PotentialSkill",
        description: "Inflicts you with Cursed Vengeance LV10 for 3 rounds. (Cursed Vengeance increases your damage by LV%, but drains your HP by LV% of your maximum HP every round.)",
        momentumCost: 3,
        fpCost: 20
      }
    ],
    description: "A simple dagger that anyone can use.",
    location: ["Enchanting"]
  },
  {
    name: "Stinger",
    rarity: 2,
    weaponType: "Dagger",
    range: 1,
    power: 4,
    accuracy: 75,
    critical: 10,
    criticalDamage: 145,
    weight: 10,
    damageType: "Pierce",
    scaling: [
      { type: "Finesse", gui: 70, ski: 30 }
    ],
    description: "A dagger with increased sharpness for extra stabbing.",
    location: ["Random Drops", "Metalworking", "Lightning Drop Table"]
  },
  {
    name: "Tanto",
    rarity: 2,
    weaponType: "Dagger",
    subtype: "Katana",
    range: 1,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 6,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 70, ski: 30 }
    ],
    description: "A small blade with a sharp edge, the tanto is often used for personal protection or as a backup weapon when longer blades aren't available or are impractical.",
    location: ["Random Drops", "Eastern Drop Table"]
  },
  {
    name: "Throwing Dagger",
    rarity: 2,
    weaponType: "Dagger",
    range: 3,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 5,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 70, ski: 30 }
    ],
    specials: [
      {
        name: "Deadly Roundabout",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked, and replaces the attack. Deals 110% of Throwing Dagger's Scaled Weapon Attack over 10 hits of Pierce damage, which can critically hit.",
        triggerRate: "10% + 8% Bonus"
      }
    ],
    description: "A dagger made for long distance attacks.",
    location: ["Random Drops", "Wind Drop Table"]
  },
  {
    name: "Dagger of Bleeding",
    rarity: 3,
    weaponType: "Dagger",
    range: 1,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 10,
    damageType: "Slash",
    scaling: [
      { type: "Vampiric", gui: 80, vit: 30 }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%)"
      }
    ],
    description: "A dagger with a taste for blood.",
    location: ["Random Drops", "Water Drop Table", "Metalworking"]
  },
  {
    name: "Parrying Dagger",
    rarity: 3,
    weaponType: "Dagger",
    range: 1,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 6,
    damageType: "Slash",
    scaling: [
      { type: "Basic", gui: 100 }
    ],
    specials: [
      {
        name: "Parry Bonus",
        type: "Passive",
        description: "Increases activation rate of Parry skills by 15%."
      }
    ],
    description: "A simple dagger that is made less for attacking and more for catching blades.",
    location: ["Random Drops", "Highway Drop Table"]
  },
  {
    name: "Shuriken",
    rarity: 3,
    weaponType: "Dagger",
    subtype: "Shuriken",
    range: 3,
    power: 4,
    accuracy: 75,
    critical: 10,
    criticalDamage: 130,
    weight: 3,
    damageType: "Pierce",
    scaling: [
      { type: "Finesse", gui: 70, ski: 30 }
    ],
    description: "A throwing-type dagger that originates from Oniga.",
    location: ["Random Drops", "Metalworking", "Eastern Drop Table"]
  },
  {
    name: "Bloodstained Flute",
    rarity: 4,
    weaponType: "Dagger",
    subtype: "Instrument",
    range: 1,
    power: 7,
    accuracy: 75,
    critical: 5,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Vampiric", gui: 80, vit: 30 }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%)"
      },
      {
        name: "Blood Coating",
        type: "OnHit",
        description: "Covers the flute in blood."
      },
      {
        name: "Blood Song",
        type: "Passive",
        description: "When played (via a Song skill), while the flute is covered in blood: Consumes the blood; All allies affected by the song recover HP equal to 5 + UL. All enemies affected by the song take protection-ignoring Dark damage equal to UL."
      }
    ],
    description: "This bladed flute is stained with dark traces of red; the blood of the performer's enemies.",
    location: ["Random Drops", "Water Drop Table"]
  },
  {
    name: "Creeping Darkness",
    rarity: 4,
    weaponType: "Dagger",
    subtype: "Whip",
    range: 4,
    power: 6,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 8,
    damageType: "Slash",
    scaling: [
      { type: "Darkness", gui: 70, res: 40 }
    ],
    specials: [
      {
        name: "Fear Progression",
        type: "OnCrit",
        description: "Inflict the target with Fear. If you have already Feared them, inflicts Hesitation LV 15 instead. If already Hesitating, inflicts Poison LV 5. All effects last 3 rounds."
      },
      {
        name: "Light Reduction",
        type: "OnNewRound",
        description: "Reduces the duration of Glowing statuses you suffer from and any Light Shafts at your current location by 2 rounds."
      },
      {
        name: "Spider Illusion",
        type: "Passive",
        description: "Whenever one of your item effects reduces Glowing statuses or Light Shafts to 0 duration or less, creates a Spider Illusion at a nearby tile, which will approach enemies and deal 25 armor-ignoring Dark magic damage to them."
      }
    ],
    description: "A whip adorned with a lash shaped like a spider. It devours light and makes shadows dance.",
    location: ["Random Drops", "Dark Drop Table"]
  },
  {
    name: "Nullifying Dirk",
    rarity: 5,
    weaponType: "Dagger",
    range: 1,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 6,
    damageType: "Slash",
    scaling: [
      { type: "Magical", gui: 70, wil: 40 }
    ],
    specials: [
      {
        name: "Resistance Bonus",
        type: "Passive",
        description: "+5 RES"
      },
      {
        name: "Dispel on Crit",
        type: "OnCrit",
        description: "Dispells 1 Random buff from the target. (Can only trigger once every 2 rounds.)"
      },
      {
        name: "Arcanic Pierce",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked. Increases the damage the attack deals by 15, and if it hits, spells you cast this round ignore 15% of elemental resistance.",
        triggerRate: "10% + 8% Bonus"
      }
    ],
    description: "A magical dagger, it seems, with the properties of erasure. It has the capability to restore things to their original state.",
    location: ["Random Drops (Korvara Only)", "Mine Drop Table"]
  },
  {
    name: "Thief Blade",
    rarity: 5,
    weaponType: "Dagger",
    range: 1,
    power: 2,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Basic", gui: 100 }
    ],
    specials: [
      {
        name: "Steal Bonus",
        type: "Passive",
        description: "Increases Steal's success rate by 15%."
      },
      {
        name: "Pilfer",
        type: "PotentialSkill",
        description: "Targets one enemy within 1 Range. Messes with the target's inventory, preventing them from using items for 2 rounds.",
        momentumCost: 3,
        fpCost: 5,
        cooldown: 2
      }
    ],
    description: "A blade often used by thieves for its nimbleness.",
    location: ["Random Drops", "Highway Drop Table"]
  },
  {
    name: "Byakko Tessen",
    rarity: 6,
    weaponType: "Dagger",
    subtype: "Fan",
    range: 1,
    power: 8,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 50, ski: 30 },
      { type: "Dextria-Lightning", luc: 30 }
    ],
    specials: [
      {
        name: "Ice Damage",
        type: "OnHit",
        description: "Deals magic Ice bonus damage equal to 25% of your Ice ATK, which ignores armor."
      },
      {
        name: "Water Damage",
        type: "OnHit",
        description: "Deals magic Water bonus damage equal to 25% of your Water ATK, which ignores armor."
      }
    ],
    description: "A bladed, iron-fan often used by covert female assassins to kill targets from a close distance.",
    location: ["Random Drops", "Metalworking", "Eastern Drop Table", "Ice Drop Table", "Water Drop Table"]
  },
  {
    name: "Seiryuu Tessen",
    rarity: 6,
    weaponType: "Dagger",
    subtype: "Fan",
    range: 1,
    power: 8,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 50, ski: 30 },
      { type: "Dextria-Wind", cel: 30 }
    ],
    specials: [
      {
        name: "Lightning Damage",
        type: "OnHit",
        description: "Deals magic Lightning bonus damage equal to 25% of your Lightning ATK, which ignores armor."
      },
      {
        name: "Wind Damage",
        type: "OnHit",
        description: "Deals magic Wind bonus damage equal to 25% of your Wind ATK, which ignores armor."
      },
      {
        name: "Dragon Dance",
        type: "PotentialSkill",
        description: "Requires a Rank D Invocation. While invoking, if you have a summoned Seiryuu that has at least 3M, 3M will be consumed by them and reduce the momentum cost you pay by 3M. After casting, you will gain Punishing Winds LV 60 for 5 rounds. Punishing Winds gives Seiryuu's Hunter Wind a bonus effect and deals Wind magic damage to all enemies at the start of a round equal to its LV.",
        momentumCost: 6,
        fpCost: 25
      }
    ],
    description: "A bladed, iron-fan often used by covert female assassins to kill targets from a close distance.",
    location: ["Random Drops", "Metalworking", "Lightning Drop Table", "Wind Drop Table"]
  },
  {
    name: "Summoner's Tandem Dagger",
    rarity: 6,
    weaponType: "Dagger",
    range: 1,
    power: 7,
    accuracy: 75,
    critical: 5,
    criticalDamage: 130,
    weight: 8,
    damageType: "Slash",
    scaling: [
      { type: "Spiritual", gui: 70, san: 40 }
    ],
    specials: [
      {
        name: "Summon Attack",
        type: "Passive",
        description: "When you summon a Youkai with Summon Youkai, while an enemy is within 1 Range of you: you perform a basic attack on them with this weapon (which does 50% damage)."
      }
    ],
    description: "A dagger that aids in the summoning process. The dance of the blade calls youkai and carves enemies.",
    location: ["Random Drops", "Summon Drop Table"]
  },
  {
    name: "Suzaku Tessen",
    rarity: 6,
    weaponType: "Dagger",
    subtype: "Fan",
    range: 1,
    power: 8,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 50, ski: 30 },
      { type: "Dextria-Fire", str: 30 }
    ],
    specials: [
      {
        name: "Fire Damage",
        type: "OnHit",
        description: "Deals magic Fire bonus damage equal to 25% of your Fire ATK, which ignores armor."
      },
      {
        name: "Wind Damage",
        type: "OnHit",
        description: "Deals magic Wind bonus damage equal to 25% of your Wind ATK, which ignores armor."
      }
    ],
    description: "A bladed, iron-fan often used by covert female assassins to kill targets from a close distance.",
    location: ["Random Drops", "Metalworking", "Fire Drop Table", "Eastern Drop Table", "Wind Drop Table"]
  },
  {
    name: "Touyaa Shuriken",
    rarity: 6,
    weaponType: "Dagger",
    subtype: "Shuriken",
    range: 6,
    power: 13,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 10,
    damageType: "Ice",
    scaling: [
      { type: "Cold", gui: 40 },
      { type: "Tool", ski: 40 }
    ],
    specials: [
      {
        name: "Frostbite",
        type: "OnHit",
        description: "Status infliction based chance to inflict Frostbite LV20 for 3 turns."
      },
      {
        name: "Snowflake",
        type: "PotentialSkill",
        description: "Creates a 3 Range diamond of Ice Sheets at a target location within 3 Range, with a duration of 3 rounds.",
        momentumCost: 1,
        fpCost: 15,
        cooldown: 3
      }
    ],
    description: "A snowflake-styled shuriken that flies far.",
    location: ["Random Drops", "Ice Drop Table", "Eastern Drop Table"]
  },
  {
    name: "Combat Magnifying Glass",
    rarity: 7,
    weaponType: "Dagger",
    range: 1,
    power: 5,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 10,
    damageType: "Slash",
    scaling: [
      { type: "Basic", gui: 100 }
    ],
    specials: [
      {
        name: "Drop Rate",
        type: "Passive",
        description: "Increases rate enemies drop items by 25%."
      },
      {
        name: "Culprit Declaration",
        type: "PotentialSkill",
        description: "When an enemy defeats an ally, you inflict Hunted LV 30 on them for 5 rounds."
      }
    ],
    description: "There's no telling when deduction will turn into a brawl, and so it's good to have implements with multiple uses. Like beating someone to death.",
    location: ["Purchased from Air", "Purchased from Bandit in Meiaquar Sewers"]
  },
  {
    name: "Konosekai",
    rarity: 7,
    weaponType: "Dagger",
    subtype: "Fan",
    range: 1,
    power: 10,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Spiritual", gui: 70, san: 40 }
    ],
    specials: [
      {
        name: "HP Bonus",
        type: "Passive",
        description: "+15 HP"
      },
      {
        name: "Neverending Story Set",
        type: "Passive",
        description: "2+ - 1) +3 WIL. 2) +3 CEL. 3) +15% Sound Resistance."
      }
    ],
    description: "A combat fan used in a certain famous singer's dance.",
    location: ["Random Drops", "Eastern Drop Table", "Metalwork (Lv4)"]
  },
  {
    name: "Magical Photon",
    rarity: 7,
    weaponType: "Dagger",
    range: 1,
    power: 10,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 8,
    damageType: "Slash",
    scaling: [
      { type: "Magical", gui: 70, wil: 40 }
    ],
    specials: [
      {
        name: "Spelledge",
        type: "Passive",
        description: "This weapon can be used as a casting tool for spells."
      }
    ],
    description: "Suitable for casting technics and wearing fancy hats. Will not help you transform, however.",
    location: ["Random Drops", "Space Drop Table", "Metalworking"]
  },
  {
    name: "Sea Hunter Dagger",
    rarity: 7,
    weaponType: "Dagger",
    range: 3,
    power: 12,
    accuracy: 75,
    critical: 7,
    criticalDamage: 130,
    weight: 8,
    damageType: "Slash",
    scaling: [
      { type: "Aquatic", gui: 70, vit: 40 }
    ],
    material: "Coral",
    specials: [
      {
        name: "Hunted",
        type: "OnHit",
        description: "Inflicts Hunted LV14 for 3 rounds if the target is a seafaring monster."
      }
    ],
    description: "This dagger was born from the sea, and as anyone who lives there knows, anything that lives in the sea is out to get everything else... that lives in the sea.",
    location: ["Fishing Contest"]
  },
  {
    name: "Tamaki Shuriken",
    rarity: 7,
    weaponType: "Dagger",
    subtype: "Shuriken",
    range: 5,
    power: 10,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 5,
    damageType: "Acid",
    scaling: [
      { type: "Cunning", gui: 80 },
      { type: "Tool", gui: 80 }
    ],
    specials: [
      {
        name: "Poison",
        type: "OnHit",
        description: "Status infliction based on chance to inflict Poison LV 20 for 3 turns."
      },
      {
        name: "Acid Flower",
        type: "PotentialSkill",
        description: "Unleashes a barrage of acid shurikens in all directions around you. If these hit an enemy, it performs a basic attack on them with a bonus to hit equal to Tamaki Shuriken's UL. Once it reaches its maximum distance or hits an enemy, it also creates a 2 range circle of Acid Pools and spawns a random flower at the location. These last for 5 rounds and have a LV equal to 1 + Tamaki Shuriken's UL.",
        momentumCost: 3,
        fpCost: 20,
        cooldown: 3
      }
    ],
    description: "A type of shuriken coated in venom.",
    location: ["Random Drops", "Eastern Drop Table", "Snake Drop Table"]
  },
  {
    name: "Creed Replica",
    rarity: 8,
    weaponType: "Dagger",
    range: 1,
    power: 13,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 6,
    damageType: "Slash",
    scaling: [
      { type: "Replica", gui: 70, ski: 20, san: 20 }
    ],
    enchantment: "Divine Weapon",
    specials: [
      {
        name: "Divine Weapon",
        type: "Passive",
        description: "+2 Power, +5 Critical, +5 Accuracy, -2 Weight. Weapon durability cannot decrease."
      }
    ],
    description: "A replica of a deadly assassin's dagger. It possesses extremely high power.",
    location: ["Purchased from Korvara Casino", "Purchased from Arena"]
  },
  {
    name: "Crelia",
    rarity: 8,
    weaponType: "Dagger",
    range: 1,
    power: 11,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 6,
    damageType: "Slash",
    scaling: [
      { type: "Darkness", gui: 70, res: 40 }
    ],
    specials: [
      {
        name: "Ice ATK Substitute",
        type: "OnHit",
        description: "Replaces your Ice ATK with the target's for 2 rounds."
      },
      {
        name: "Warmth",
        type: "PotentialSkill",
        description: "Requires Substitute Ice ATK to be active. Consumes the status caused by the weapon, deals 20 armor-ignoring Ice Kickback damage to you, curing Frostbite effects you suffer from, and creating a wave of warmth that spreads out in a 3 Size Circle around you. In that circle, ice statues, ice sheets, frozen plants, and Frozen & Frostbitten allies thaw out. All allies also recover HP equal to 100% of the Substituted Ice ATK.",
        momentumCost: 3,
        fpCost: 0,
        cooldown: 4
      }
    ],
    description: "A dagger made with a flowery, but sharp, design.",
    location: ["Random Drops", "Dark Drop Table"]
  },
  {
    name: "Hikage",
    rarity: 8,
    weaponType: "Dagger",
    range: 1,
    power: 11,
    accuracy: 75,
    critical: 5,
    criticalDamage: 130,
    weight: 4,
    damageType: "Slash",
    scaling: [
      { type: "Flamelit", gui: 70, str: 40 }
    ],
    specials: [
      {
        name: "Sun/Moon Set",
        type: "Passive",
        description: "Damage type changes to Fire if Tsukikage is also equipped. Set: Hayabusa. 2+ - 1) +2 Attack Range with Daggers. 2) Movement type becomes Teleport. If Main Weapon is Tsukikage: Moon Style. Critical hits generate Moon Crests (max 3) and grants Moon Reflection skill. If Main Weapon is Hikage: Sun Style. Critical hits generate Sun Crests (max 3) and grants Rising Sun skill."
      },
      {
        name: "Lingering Damage",
        type: "OnCrit",
        description: "Inflict Lingering Damage (Fire) LV 15 for 2 rounds."
      },
      {
        name: "Rising Sun",
        type: "GrantsSkill",
        description: "Rising Sun: 2M, 15 FP, 2 Round CD. Consumes 3 Sun Crests. Targets 1 unoccupied tile within 3 Range. Reappear at target location, when you do, become Airborne and deal 30 armor-ignoring Fire bonus damage to all enemies in 2 Range Circle. All damaged enemies are inflicted with Glowing LV 10 until your next turn."
      },
      {
        name: "Muddle",
        type: "PotentialSkill",
        description: "Item properties that would change the damage type of your basic attacks are ignored."
      }
    ],
    description: "A ninja dagger with a red cloth tail, decorated with a moon.",
    location: ["Random Drops", "Fire Drop Table", "Eastern Drop Table"]
  },
  {
    name: "Paragi Shuriken",
    rarity: 8,
    weaponType: "Dagger",
    subtype: "Shuriken",
    range: 3,
    power: 6,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 12,
    damageType: "Lightning",
    scaling: [
      { type: "Electrical", gui: 40 },
      { type: "Tool", luc: 40 }
    ],
    specials: [
      {
        name: "Knocked Down",
        type: "OnHit",
        description: "Status infliction based chance to inflict Knocked Down LV2 for 2 turns."
      },
      {
        name: "Rairashi",
        type: "PotentialSkill",
        description: "Launches sparks of lightning at a target enemy within 8 Range, dealing Lightning magic damage that ignores protection equal to 10 + Paragi Shuriken's UL * 3.",
        momentumCost: 1,
        fpCost: 0,
        cooldown: 3
      }
    ],
    description: "A heavy shuriken that is effective at knocking someone on their butt.",
    location: ["Random Drops", "Lightning Drop Table", "Eastern Drop Table"]
  },
  {
    name: "Puppet Strings",
    rarity: 8,
    weaponType: "Dagger",
    subtype: "Whip",
    range: 4,
    power: 6,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 12,
    damageType: "Slash",
    scaling: [
      { type: "Finesse", gui: 70, ski: 30 }
    ],
    specials: [
      {
        name: "String Attached",
        type: "OnHit",
        description: "Apply or power up String Attached (LV 1, max 4, 3 rounds). Only 1 string can attached per action (even if you have multiple Puppet Strings equipped, or attack with it multiple times). String Attached: The causer has attached a string to you. LV decreases by 1 every time you use a movement skill and end outside of 3 Range from them."
      },
      {
        name: "Puppet Assault",
        type: "GrantsSkill",
        description: "Targets 2 tiles in 6 Range. Location 1 must contain an enemy with String Attached LV 2+ (caused by you), and Location 2 must contain a different enemy. You puppeteer the first enemy, who takes 3 steps towards the second. Then, the first enemy is forced to attack the second with their main hand weapon (75% damage, or 100% if String Attached was LV4+). Afterwards, your strings detach from the first target."
      }
    ],
    description: "Gloves holding within them long puppet strings. One never knows when they may be forced to dance upon them.",
    location: ["Random Drops", "Highway Drop Table"]
  },
  {
    name: "Tsukikage",
    rarity: 8,
    weaponType: "Dagger",
    range: 1,
    power: 11,
    accuracy: 75,
    critical: 5,
    criticalDamage: 130,
    weight: 4,
    damageType: "Ice",
    scaling: [
      { type: "Aquatic", gui: 70, vit: 40 }
    ],
    specials: [
      {
        name: "Sun/Moon Set",
        type: "Passive",
        description: "Damage type changes to Water if Hikage is also equipped. Set: Hayabusa. 2+ - 1) +2 Attack Range with Daggers. 2) Movement type becomes Teleport. If Main Weapon is Tsukikage: Moon Style. Critical hits generate Moon Crests (max 3) and grants Moon Reflection skill. If Main Weapon is Hikage: Sun Style. Critical hits generate Sun Crests (max 3) and grants Rising Sun skill."
      },
      {
        name: "Spelldaze",
        type: "OnCrit",
        description: "Inflict Spelldaze for 2 rounds."
      },
      {
        name: "Moon Reflection",
        type: "GrantsSkill",
        description: "Rising Sun: 2M, 15FP, 2 Round Cooldown. Consumes 3 Moon Crests. Targets 1 unoccupied tile within 3 Range. Appear at location, gain Sneak until next turn and Night Shade (LV15, 2 attacks, 3 rounds)."
      },
      {
        name: "Muddle",
        type: "PotentialSkill",
        description: "Item properties that would change the damage type of your basic attacks are ignored."
      }
    ],
    description: "A ninja dagger with a blue cloth tail, decorated with a moon.",
    location: ["Random Drops", "Ice Drop Table", "Eastern Drop Table"]
  },
  {
    name: "Bakaga Shuriken",
    rarity: 9,
    weaponType: "Dagger",
    subtype: "Shuriken",
    range: 4,
    power: 10,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 8,
    damageType: "Dark",
    scaling: [
      { type: "Darkness", gui: 40 },
      { type: "Tool", res: 40 }
    ],
    specials: [
      {
        name: "Smoke Screen",
        type: "OnAttack",
        description: "Creates a Smoke Screen at the target's location for 3 rounds, reducing the Hit of those who stand in it by 30."
      },
      {
        name: "Dark Hole",
        type: "PotentialSkill",
        description: "Launches a swirling dark energy in a line that will travel up to 5 Range away. If it contacts an enemy, it will deal armor-ignoring Dark magic damage to them equal to 10 + (Bakaga Shuriken's UL*2) and begin moving back towards you, pulling the enemy along with it.",
        momentumCost: 1,
        fpCost: 15,
        cooldown: 3
      }
    ],
    description: "A shuriken with a smoke bomb hidden inside of it.",
    location: ["Random Drops", "Eastern Drop Table", "Dark Drop Table"]
  },
  {
    name: "Copper Coliche",
    rarity: 9,
    weaponType: "Dagger",
    range: 1,
    power: 9,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 9,
    damageType: "Slash",
    scaling: [
      { type: "Basic", str: 100 }
    ],
    specials: [
      {
        name: "Dual Weapon Type",
        type: "Passive",
        description: "Also qualifies as a Sword weapon."
      }
    ],
    description: "A small yet thin blade made of a reddish metal. It's somewhere between dagger and sword, making it a versatile blade.",
    location: ["Random Drops", "Water Drop Table"]
  },
  {
    name: "Ninshi Shuriken",
    rarity: 9,
    weaponType: "Dagger",
    subtype: "Shuriken",
    range: 4,
    power: 14,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 12,
    damageType: "Fire",
    scaling: [
      { type: "Flamelit", gui: 40 },
      { type: "Tool", str: 40 }
    ],
    specials: [
      {
        name: "Fire Damage",
        type: "OnHit",
        description: "Inflicts 30 armor-ignoring Fire damage to all enemies in 2 Range."
      },
      {
        name: "Ignition",
        type: "PotentialSkill",
        description: "Targets 1 tile within 5 Range and creates a single Cinder tile with a LV equal to (Ninshi Shuriken's UL * 2) for 5 rounds. If there is an enemy at that location, they also take armor-ignoring Fire damage equal to half of that. If there is a Bomb at that location, it will blow immediately as if you had a set it.",
        momentumCost: 1,
        fpCost: 10,
        cooldown: 3
      }
    ],
    description: "Shurikens designed to explode on impact.",
    location: ["Random Drops", "Fire Drop Table", "Eastern Drop Table"]
  },
  {
    name: "Red Letter",
    rarity: 9,
    weaponType: "Dagger",
    range: 1,
    power: 10,
    accuracy: 75,
    critical: 0,
    criticalDamage: 130,
    weight: 6,
    damageType: "Fire",
    scaling: [
      { type: "Flamelit", gui: 70, str: 40 }
    ],
    material: "Magmic",
    specials: [
      {
        name: "Fire Damage",
        type: "OnHit",
        description: "Deals magic Fire bonus damage equal to 50% of your Fire ATK, which ignores armor."
      },
      {
        name: "Fire Exhaurire",
        type: "SpecialStrike",
        description: "Triggers after the attack hits an enemy. Deals 25 Fire bonus magic damage that ignores armor to the target, and you gain Absorb Fire (Limited) LV 1 for 5 rounds.",
        triggerRate: "10% + 8% Bonus"
      }
    ],
    description: "A flame dagger used in ritual sacrifices by an old tribal cult inhabiting the lands near the volcano 'Autumn'.",
    location: ["Random Drops", "Fire Drop Table"]
  },
  {
    name: "Atlaua's Abaniko",
    rarity: 10,
    weaponType: "Dagger",
    subtype: "Fan",
    range: 3,
    power: 12,
    accuracy: 80,
    critical: 0,
    criticalDamage: 130,
    weight: 7,
    damageType: "Water",
    scaling: [
      { type: "Finesse", gui: 50, ski: 30 },
      { type: "Dextria-Water", vit: 30 }
    ],
    specials: [
      {
        name: "Silence on Crit",
        type: "OnCrit",
        description: "UL% chance of inflicting Silence for 2 Rounds."
      },
      {
        name: "Luckiness Dance",
        type: "GrantsSkill",
        description: "Begins a rhythmic foreign dance which boosts the SKI and LUC of all party members in the current battle by Atlaua's Abaniko's UL/2 (min. 1) for 3 rounds.",
        momentumCost: 6,
        fpCost: 20
      }
    ],
    description: "A famous water dancer's dancing fan, this Abaniko carries with it a strange energy, filling those who watch its dances with joy.",
    location: ["Level 56+ Sand Kraboid"]
  },
  {
    name: "Dancing Shiv",
    rarity: 10,
    weaponType: "Dagger",
    range: 1,
    power: 11,
    accuracy: 75,
    critical: 5,
    criticalDamage: 130,
    weight: 7,
    damageType: "Slash",
    scaling: [
      { type: "Sylphid", gui: 70, cel: 40 }
    ],
    specials: [
      {
        name: "Skill Cost Reduction",
        type: "Passive",
        description: "Reduces cost of Dagger Skills by UL%."
      },
      {
        name: "Fray",
        type: "OnAttack",
        description: "If you are behind your target, inflict Fray LV 1+(UL/3) for 3 rounds."
      }
    ],
    description: "While little more than a very well made dagger, the Dancing Shiv earns its name for the way its movements almost seem to be a deadly dance, making it far easier to utilize than most daggers.",
    location: ["Level 56+ Bandit Backstabber"]
  },
  {
    name: "Eternal Solitude",
    rarity: 10,
    weaponType: "Dagger",
    range: 1,
    power: 15,
    accuracy: 75,
    critical: 5,
    criticalDamage: 130,
    weight: 5,
    damageType: "Slash",
    scaling: [
      { type: "Darkness", gui: 70, res: 40 }
    ],
    specials: [
      {
        name: "Summon Damage",
        type: "Passive",
        description: "When an enemy effect or skill summons an allied unit: the summoner takes UL protection-ignoring Akashic magic damage."
      }
    ],
    description: "This thin dagger severs the line between allies.",
    location: ["Level 56+ Soulture"]
  },
  {
    name: "Fangfare",
    rarity: 10,
    weaponType: "Dagger",
    range: 1,
    power: 10,
    accuracy: 75,
    critical: 10,
    criticalDamage: 130,
    weight: 7,
    damageType: "Ice",
    scaling: [
      { type: "Cold", gui: 70, ski: 40 }
    ],
    specials: [
      {
        name: "Evade Teleport",
        type: "OnEvadeAttack",
        description: "If the tile behind your opponent is a valid battle tile, UL% chance that you teleport behind them, leaving behind an ice statue that shares your appearance. Also inflicts Immobilize on the attacker until their next turn if successful."
      }
    ],
    description: "An icy fang-shaped dagger, no doubt belonging to some devious ice beast at one point.",
    location: ["Level 56+ Fenrirbus"]
  },
  {
    name: "Hexfang",
    rarity: 10,
    weaponType: "Dagger",
    range: 1,
    power: 7,
    accuracy: 80,
    critical: 10,
    criticalDamage: 130,
    weight: 5,
    damageType: "Slash",
    scaling: [
      { type: "Basic", gui: 100 }
    ],
    specials: [
      {
        name: "Curse Infliction",
        type: "OnCrit",
        description: "Inflict Noshka's Famine, or Crippling Muysig, or Frailty of Credwa LV 3 for 2 rounds (Activation Rate: UL%). Prevents you from receiving Curse statuses by dealing damage to enemies."
      }
    ],
    description: "A cursed fang with words of evil written on it.",
    location: ["Level 56+ Snakeman Pariah"]
  },
  {
    name: "Vorpal Fang",
    rarity: 10,
    weaponType: "Dagger",
    range: 1,
    power: 10,
    accuracy: 75,
    critical: 10,
    criticalDamage: 130,
    weight: 10,
    damageType: "Slash",
    scaling: [
      { type: "Electrical", gui: 70, luc: 40 }
    ],
    enchantment: "Vorpal",
    specials: [
      {
        name: "Vorpal Strike",
        type: "Passive",
        description: "+10 Critical, +5% Critical Damage. When critically hitting monsters with this weapon (excluding bosses, and monsters whose level is 10 or more higher than yours): 5% chance for the attack to do a Vorpal Strike, dealing 9999 Akashic damage. Critical hits from behind the target when attacking with this weapon have an UL% chance higher of becoming Vorpal Strikes (applies as a percentage to the base chance, not added to it.)"
      }
    ],
    description: "Some weapons are enchanted to become vorpal. Other weapons are born vorpal, molded by it. The Vorpal Fang is a unique dagger in that sense, taking the powers of the Vorpal Rabbit for itself.",
    location: ["Level 56+ Vorpal Rabbits"]
  }
];

// All gun weapons from the game
export const GUNS: Weapon[] = [
  {
    name: "Handgun (Enhanced)",
    rarity: 2,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 3,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Pierce",
    rounds: 3,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 GUI"
      }
    ],
    description: "",
    location: ["Enchanting (Lv1)"]
  },
  {
    name: "Handgun",
    rarity: 3,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 3,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 4,
    damageType: "Pierce",
    rounds: 3,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    description: "",
    location: ["Random drops", "Shops"]
  },
  {
    name: "Shotgun",
    rarity: 4,
    weaponType: "Gun",
    subtype: "Shotgun",
    range: 3,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 8,
    damageType: "Pierce",
    rounds: 1,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    specials: [
      {
        name: "Knockback",
        type: "OnHit",
        description: "Knockbacks 1 tile."
      }
    ],
    description: "",
    location: ["Random drops"]
  },
  {
    name: "Autopistol",
    rarity: 4,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 6,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 8,
    damageType: "Pierce",
    rounds: 3,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    description: "",
    location: ["Random drops"]
  },
  {
    name: "Hold Upper",
    rarity: 5,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 6,
    accuracy: 80,
    critical: 5,
    criticalDamage: 110,
    weight: 10,
    damageType: "Pierce",
    rounds: 3,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    specials: [
      {
        name: "Steal Success Bonus",
        type: "Passive",
        description: "Increases Steal's success rate by 15%."
      },
      {
        name: "Pilfer",
        type: "PotentialSkill",
        description: "Targets one enemy within 1 Range. Messes with the target's inventory, preventing them from using items for 2 rounds."
      }
    ],
    description: "",
    location: ["Random drops"]
  },
  {
    name: "Spirit Hunter",
    rarity: 5,
    weaponType: "Gun",
    subtype: "Rifle",
    range: 5,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 15,
    damageType: "Pierce",
    rounds: 4,
    scaling: [
      { type: "Spiritual", gui: 70, san: 40 }
    ],
    specials: [
      {
        name: "Anti-Youkai Damage",
        type: "Passive",
        description: "Damage dealt by this weapon's attack is increased by 15% if the target is a Youkai or installed with one."
      }
    ],
    description: "A special rifle made for taking down supernatural things.",
    location: ["Random drops"]
  },
  {
    name: "Ghost Smoke",
    rarity: 5,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 6,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 6,
    damageType: "Pierce",
    rounds: 3,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    specials: [
      {
        name: "Grudge Wound",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked, and replaces the attack. Fire a black bullet at the target, dealing 110% Scaled Weapon Attack. If it hits, and one of your equipped items is enchanted with Gravedigger, summons a Ghost ally next to the target with HP equal to 100 + damage dealt by the attack.",
        triggerRate: "10% + 8% Bonus",
        cooldown: 3
      },
      {
        name: "Reduced Counters",
        type: "Passive",
        description: "This weapon does not trigger effects that activate when an enemy is hit by an attack. Reduces the chance for Deflection and Parry skills to activate from this weapon's attacks by 25%."
      }
    ],
    description: "A strange gun that fires focus bullets made of what appears to be solidified smoke. In addition to making the shots harder to see, they are also hard to counter, but pack less of a punch as a result.",
    location: ["Random drops"]
  },
  {
    name: "Excel Sniper",
    rarity: 6,
    weaponType: "Gun",
    subtype: "Rifle",
    range: 7,
    power: 16,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 20,
    damageType: "Pierce",
    rounds: 1,
    scaling: [
      { type: "Firearms", gui: 60, ski: 40 }
    ],
    specials: [
      {
        name: "Weapon Charge Consumption",
        type: "OnHit",
        description: "Consumes Weapon Charges, dealing 50% more damage per Charge Level."
      },
      {
        name: "Charge Weapon",
        type: "GrantsSkill",
        description: "Rev your weapon and fill it with focus, increasing its Charge, to a maximum of level 3. When you hit with a weapon that can consume Weapon Charges, the damage you deal with that attack will increase by 50% per level. (Weapon Charges will expire after 5 rounds.)",
        momentumCost: 3,
        fpCost: 5
      },
      {
        name: "Elite Engine",
        type: "PotentialSkill",
        description: "Shared Potential Skill. Charge Weapon FP cost is increased to 8 FP. Attacks do not use up all of your charges, instead the LV is reduced by 1, and the damage bonus is 35% (does not increase with charge amount like normal Excel attacks)."
      }
    ],
    description: "The Excel line of weapons were developed in Chaturanga, where the ability to be defensive while increasing offensive capabilities was highly valued. By charging up the weapon, it can explosively spend the focus energy when it strikes an enemy, greatly increasing damage. However, the engine module makes it heavier than other weapons.",
    location: ["Random drops"]
  },
  {
    name: "Ryeser",
    rarity: 6,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 6,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 3,
    damageType: "Lightning",
    rounds: 2,
    scaling: [
      { type: "Electrical", luc: 40 },
      { type: "Tool", gui: 40 }
    ],
    specials: [
      {
        name: "Clumsy on Critical",
        type: "OnCrit",
        description: "Inflict the target with Clumsy until your next turn. (Clumsy prevents the use of movement skills that aren't basic movement.) When this effect is applied to a unit, that unit cannot be affected by Ryeser again for 3 rounds."
      }
    ],
    description: "This type of weapon was developed as a non-life-threatening alternative to restrain individuals, but it is unpopular due to its unreliability.",
    location: ["Random drops"]
  },
  {
    name: "Firthrower",
    rarity: 6,
    weaponType: "Gun",
    subtype: "Thrower",
    range: 3,
    power: 15,
    accuracy: 80,
    critical: 10,
    criticalDamage: 110,
    weight: 15,
    damageType: "Fire",
    rounds: 1,
    scaling: [
      { type: "Flamelit", gui: 70, str: 40 }
    ],
    specials: [
      {
        name: "Cone Attack",
        type: "Passive",
        description: "Attacks in a 4-long cone."
      },
      {
        name: "Flash Trigger",
        type: "PotentialSkill",
        description: "Moving into the same tile that contains an explosive special tile or object, such as a bomb, that was placed by you or an ally, causes it to instantly detonate."
      }
    ],
    description: "This weapon, unlike traditional guns, instead releases a stream of fire in a 4 Range cone.",
    location: ["Random drops"]
  },
  {
    name: "Yin",
    rarity: 7,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 8,
    accuracy: 85,
    critical: 10,
    criticalDamage: 110,
    weight: 8,
    damageType: "Pierce",
    rounds: 2,
    scaling: [
      { type: "Darkness", gui: 70, res: 40 }
    ],
    specials: [
      {
        name: "Damage Type Change",
        type: "Passive",
        description: "Damage type changes to Dark if Yang is also equipped."
      },
      {
        name: "Muddle",
        type: "PotentialSkill",
        description: "Item properties that would change the damage type of your basic attacks are ignored."
      },
      {
        name: "Gunsmoke Spiritual Set",
        type: "Passive",
        description: "Set: Gunsmoke Spiritual - 2+: Grants access to the Double Dao skill. 3+: Darkness and Light damage you deal ignores up to 10% of elemental resistance."
      },
      {
        name: "Double Dao",
        type: "GrantsSkill",
        description: "Fire both Yin and Yang at a target enemy within 3 Range, alternating between Light and Darkness damage, over 4 shots. The total damage dealt is equal to 100% Darkness ATK + 100% Light ATK + 50% of the total Scaled Weapon ATK of both weapons. In addition, both guns gain 2 additional attack rounds for 2 rounds.",
        momentumCost: 3,
        fpCost: 30
      }
    ],
    description: "A pitch black handgun, and sister to the Yang handgun.",
    location: ["Random drops"]
  },
  {
    name: "Yang",
       rarity: 7,
    weaponType: "Gun",
    subtype: "Handgun",
    range: 3,
    power: 8,
    accuracy: 85,
    critical: 10,
    criticalDamage: 110,
    weight: 8,
    damageType: "Pierce",
    rounds: 2,
    scaling: [
      { type: "Faithful", gui: 70, fai: 40 }
    ],
    specials: [
      {
        name: "Damage Type Change",
        type: "Passive",
        description: "Damage type changes to Light if Yin is also equipped."
      },
      {
        name: "Muddle",
        type: "PotentialSkill",
        description: "Item properties that would change the damage type of your basic attacks are ignored."
      },
      {
        name: "Gunsmoke Spiritual Set",
        type: "Passive",
        description: "Set: Gunsmoke Spiritual - 2+: Grants access to the Double Dao skill. 3+: Darkness and Light damage you deal ignores up to 10% of elemental resistance."
      },
      {
        name: "Double Dao",
        type: "GrantsSkill",
        description: "Fire both Yin and Yang at a target enemy within 3 Range, alternating between Light and Darkness damage, over 4 shots. The total damage dealt is equal to 100% Darkness ATK + 100% Light ATK + 50% of the total Scaled Weapon ATK of both weapons. In addition, both guns gain 2 additional attack rounds for 2 rounds.",
        momentumCost: 3,
        fpCost: 30
      }
    ],
    description: "A shining silver handgun, and sister to the Yin handgun.",
    location: ["Random drops"]
  },
  {
    name: "Magical Nova",
    rarity: 7,
    weaponType: "Gun",
    subtype: "Shotgun",
    range: 3,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 110,
    weight: 9,
    damageType: "Pierce",
    rounds: 1,
    scaling: [
      { type: "Magical", gui: 70, wil: 40 }
    ],
    specials: [
      {
        name: "Spelledge",
        type: "Passive",
        description: "This weapon can be used as a casting tool for spells."
      },
      {
        name: "Nova Eraser",
        type: "PotentialSkill",
        description: "This skill requires a Rank D Invocation (see the Invocation talent for more details). Fires a large beam of light at a target enemy, dealing Light magic damage that ignores evasion equal to 300% of Magical Nova's SWA. If the target is defeated by this attack, they are inflicted with Certain Defeat."
      }
    ],
    description: "Leave craters in your enemy. Will not help you transform, however.",
    location: ["Random drops", "Metalwork (Lv5)"]
  },
  {
    name: "Sea Hunter Gun",
    rarity: 7,
    weaponType: "Gun",
    range: 3,
    power: 7,
    accuracy: 80,
    critical: 7,
    criticalDamage: 110,
    weight: 12,
    damageType: "Pierce",
    rounds: 3,
    scaling: [
      { type: "Aquatic", gui: 70, vit: 40 }
    ],
    material: "Coral",
    specials: [
      {
        name: "Coral Material",
        type: "Passive",
        description: "+1 Power, +3 Critical, +3 Accuracy, +1 Weight, +3 Water ATK"
      },
      {
        name: "Hunted vs Sea Monsters",
        type: "OnHit",
        description: "Inflicts Hunted LV14 for 3 rounds if the target is a seafaring monster."
      }
    ],
    description: "This gun was born from the sea, and as anyone who lives there knows, anything that lives in the sea is out to get everything else... that lives in the sea.",
    location: ["Fishing Contest"]
  }
];

// ==================== FISTS ====================
export const FISTS: Weapon[] = [
  {
    name: "Helrenroka",
    rarity: 8,
    weaponType: "Fist",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 6,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        gui: 100
      }
    ],
    specials: [
      {
        name: "Fire ATK Substitute",
        type: "OnHit",
        description: "Replaces your Fire ATK with the target's for 2 Rounds."
      },
      {
        name: "Guiding Flame",
        type: "PotentialSkill",
        description: "Ninjutsu. Requires Substitute Fire ATK to be active. Invoke a fiery ninja art, dealing 20 armor-ignoring Fire Kickback damage to you, curing Blind effects you suffer from, and creating a burst of Fire around you that damages all enemies in a 3 Size Circle for Fire magic damage (can critically hit for +25% damage, ignores Reflect, Immunity, and Absorb) equal to 100% of Helrenroka's Scaled Weapon Attack + 100% of the Substitute Fire ATK from its effect. Damaged enemies are inflicted with Glowing LV 10 (3 rounds). Furinkazan: Gain 1 Fire Mark.",
        momentumCost: 3,
        fpCost: 0,
        cooldown: 2
      }
    ],
    description: "A gauntlet said to once belong to a ninja who could summon fire.",
    location: ["Random drops"]
  },
  {
    name: "Ymir",
    rarity: 9,
    weaponType: "Fist",
    range: 1,
    power: 13,
    accuracy: 85,
    critical: 0,
    criticalDamage: 105,
    weight: 15,
    damageType: "Blunt",
    scaling: [
      {
        type: "Cold",
        str: 70,
        ski: 40
      }
    ],
    specials: [
      {
        name: "Conditional Knockback",
        type: "OnHit",
        description: "If target is not immune to knockback effects; Inflicts knockback (1 tile) in your current direction. If the enemy doesn't move from this effect (due to that tile being invalid/occupied), they take Ice magic damage equal to 150% of your Ice ATK. (Activations of this effect beyond the first in a round will only use 50% instead.)"
      }
    ],
    description: "The frosty gauntlets of a frosty giant.",
    location: ["Random drops", "Ice Giants"]
  },
  {
    name: "Brawler's Glove",
    rarity: 1,
    weaponType: "Fist",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 2,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Machinegun Punch",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked, and replaces the attack. Deals five hits of Blunt damage to the enemy, which can critically hit, dealing a total of 110% of Brawler's Glove's Scaled Weapon Attack. If any of them hit, the target is also inflicted with Flatfoot until your next turn.",
        triggerRate: "10% + 8% Bonus",
        cooldown: 2
      }
    ],
    description: "A lightweight glove often used to protect a fist fighter's assets.",
    location: ["Random drops", "Metalwork (Lv1)"]
  },
  {
    name: "Brawler's Glove (Enhanced)",
    rarity: 2,
    weaponType: "Fist",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 2,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 STR"
      },
      {
        name: "Machinegun Punch",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked, and replaces the attack. Deals five hits of Blunt damage to the enemy, which can critically hit, dealing a total of 110% of Brawler's Glove's Scaled Weapon Attack. If any of them hit, the target is also inflicted with Flatfoot until your next turn.",
        triggerRate: "10% + 8% Bonus",
        cooldown: 2
      }
    ],
    description: "A lightweight glove often used to protect a fist fighter's assets.",
    location: ["Enchanting (Lv2)"]
  },
  {
    name: "Boxing Glove",
    rarity: 2,
    weaponType: "Fist",
    range: 1,
    power: 6,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 2,
    damageType: "Blunt",
    scaling: [
      {
        type: "Earthen",
        str: 70,
        def: 40
      }
    ],
    specials: [
      {
        name: "Defense Bonus",
        type: "Passive",
        description: "+1-3 DEF"
      },
      {
        name: "Guard Skill",
        type: "GrantsSkill",
        description: "Grants skill: Guard. Guard does not deplete the Sturm gauge."
      }
    ],
    description: "A type of fighting glove used in one of Kysei's provinces. It gives some defensive options.",
    location: ["Random drops"]
  },
  {
    name: "Knuckledusters",
    rarity: 2,
    weaponType: "Fist",
    range: 1,
    power: 5,
    accuracy: 80,
    critical: 10,
    criticalDamage: 120,
    weight: 8,
    damageType: "Blunt",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    description: "A sharp pair of brass knuckles.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Tenderizers",
    rarity: 3,
    weaponType: "Fist",
    range: 1,
    power: 6,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 4,
    damageType: "Blunt",
    scaling: [
      {
        type: "Vampiric",
        str: 80,
        vit: 30
      }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%)"
      }
    ],
    description: "This gauntlet absorbs Focus from the wounds that it makes.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Needler",
    rarity: 3,
    weaponType: "Fist",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 8,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Armor Reduction",
        type: "Passive",
        description: "Reduces effectiveness of enemy Armor by 5."
      },
      {
        name: "Wear Down",
        type: "PotentialSkill",
        description: "When an enemy is damaged by weapons that reduce enemy Armor effectiveness, either by basic attacks or by skills using them, a Wear Down status is applied for 3 rounds, or powered up. This status decreases the enemy's Armor by 5 per LV. (Max LV of 20, max duration of 3 rounds.)"
      }
    ],
    description: "",
    location: ["Random Drops", "Metalwork (Lv3)"]
  },
  {
    name: "Whulf",
    rarity: 7,
    weaponType: "Fist",
    subtype: "Claws",
    range: 1,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "The Wolf's Claws Set",
        type: "Passive",
        description: "Set: The Wolf's Claws - 2+: Grants access to the Shooting Star skill. Increases the range of the Kick skill by 5. Kick skill causes you to fly towards your target."
      }
    ],
    description: "A set of gloves with sharp claws extending from them. They are enchanted with the spirit of a great beast of light.",
    location: ["Random drops"]
  },
  {
    name: "Excellion",
    rarity: 6,
    weaponType: "Fist",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 15,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Charge Weapon",
        type: "GrantsSkill",
        description: "Rev your weapon and fill it with focus, increasing its Charge, to a maximum of level 3. When you hit with a weapon that can consume Weapon Charges, the damage you deal with that attack will increase by 50% per level. (Weapon Charges will expire after 5 rounds.)",
        momentumCost: 3,
        fpCost: 5
      },
      {
        name: "Weapon Charge Consumption",
        type: "OnHit",
        description: "Consumes Weapon Charge, dealing 50% more damage per Charge Level"
      },
      {
        name: "Elite Engine",
        type: "PotentialSkill",
        description: "Charge Weapon FP cost is increased to 8 FP. Attacks do not use up all of your charges, instead the LV is reduced by 1, and the damage bonus is 35% (does not increase with charge amount like normal Excel attacks)."
      }
    ],
    description: "The Excel line of weapons were developed in Chaturanga, where the ability to be defensive while increasing offensive capabilities was highly valued. By charging up the weapon, it can explosively spend the focus energy when it strikes an enemy, greatly increasing damage. However, the engine module makes it heavier than other weapons.",
    location: ["Random drops"]
  },
  {
    name: "Shredder Replica",
    rarity: 8,
    weaponType: "Fist",
    range: 1,
    power: 16,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 8,
    damageType: "Blunt",
    scaling: [
      {
        type: "Replica",
        str: 70,
        ski: 20,
        san: 20
      }
    ],
    enchantment: "Divine Weapon",
    specials: [
      {
        name: "Divine Weapon",
        type: "Passive",
        description: "+2 Power, +5 Critical, +5 Accuracy, -2 Weight. Weapon durability cannot decrease."
      }
    ],
    description: "A replica of a deadly pair of gauntlets that rend flesh. It possesses extremely high power.",
    location: ["Korvara Casino", "Arena"]
  },
  {
    name: "Fenri",
    rarity: 9,
    weaponType: "Fist",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 6,
    damageType: "Blunt",
    scaling: [
      {
        type: "Cold",
        str: 70,
        ski: 40
      }
    ],
    specials: [
      {
        name: "Ice Damage",
        type: "OnHit",
        description: "Deals magic Ice damage equal to 50% of your Ice ATK, which ignores armor."
      },
      {
        name: "WIL Bonus",
        type: "Passive",
        description: "+3 WIL"
      },
      {
        name: "Freezing Round",
        type: "GrantsSkill",
        description: "Spin your weapon, Fenri, around your body and let it tear into all enemies within 1 Range of you, dealing Ice physical damage equal to 100% of Scaled Weapon Attack to them.",
        momentumCost: 3,
        fpCost: 10
      }
    ],
    description: "A three-sided nunchaku enchanted with strong ice powers. It is said to contain the soul of a legendary wolf that once had dominion over the frozen lands of Lordwain, the snow-covered continent to the north, where Lispool and Hyoya exist. However, this may just be a legend.",
    location: ["Random drops"]
  },
  {
    name: "Claw Gauntlet",
    rarity: 4,
    weaponType: "Fist",
    subtype: "Claw",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 5,
    damageType: "Slash",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Riprun",
        type: "PotentialSkill",
        description: "Targets a 3-7 Range line, which must end in an unoccupied tile. You move along that line, slashing every tile to the left and right of your moving direction, dealing Slash physical damage to all enemies in those tiles equal to 120% Scaled WPN Power. It has a status-based chance to also reduce the Phys. and Mag. Defense of all enemies damaged by 1 + half of Claw Gauntlet's UL, for 3 rounds. The chance is much higher against monsters.",
        momentumCost: 3,
        fpCost: 15
      }
    ],
    description: "These are normal fighter's gauntlets, except they have been affixed with claws, causing them to rend enemies instead of pummel them.",
    location: ["Random drops"]
  },
  {
    name: "Pickpocketers",
    rarity: 5,
    weaponType: "Fist",
    range: 1,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 8,
    damageType: "Blunt",
    scaling: [
      {
        type: "Cunning",
        str: 70,
        gui: 40
      }
    ],
    specials: [
      {
        name: "Steal Success Bonus",
        type: "Passive",
        description: "Increases Steal's success rate by 15%."
      },
      {
        name: "Pilfer",
        type: "PotentialSkill",
        description: "Targets one enemy within 1 Range. Messes with the target's inventory, preventing them from using items for 2 rounds.",
        momentumCost: 3,
        fpCost: 5,
        cooldown: 2
      }
    ],
    description: "",
    location: ["Random drops"]
  },
  {
    name: "Magical Comet",
    rarity: 7,
    weaponType: "Fist",
    range: 1,
    power: 11,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 8,
    damageType: "Blunt",
    scaling: [
      {
        type: "Magical",
        str: 70,
        wil: 40
      }
    ],
    specials: [
      {
        name: "Spelledge",
        type: "Passive",
        description: "This weapon can be used as a casting tool for spells."
      },
      {
        name: "Unmasking Trail",
        type: "PotentialSkill",
        description: "This skill requires a Rank D Invocation. Drops down blue stars on all enemies in the battle, dealing Ice magic damage equal to 100% of Magical Comet's SWA + 150% of your Ice ATK. Enemies who are under transformation effects take 50% extra damage and have those transformations effect(s)'s duration cut by 5 rounds.",
        momentumCost: 6,
        fpCost: 30,
        cooldown: 3
      }
    ],
    description: "Leave impacts that will only fade after an eon. Will not help you transform, however.",
    location: ["Random drops", "Metalwork (Lv5)"]
  },
  {
    name: "Bear Claws",
    rarity: 6,
    weaponType: "Fist",
    range: 1,
    power: 7,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 8,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Stat Bonuses",
        type: "Passive",
        description: "+2 STR, +2 VIT"
      },
      {
        name: "Scary Mauling",
        type: "PotentialSkill",
        description: "+10% Critical Damage for Claws-type weapons. On Critical Hit (Bear Claws only): Automatically activate the skill 'Bellow' (3 round cooldown). Bellow - Roars loudly, generating a strong fighting will. Deals Sound magic damage equal to 150% Sound ATK to all enemies in Circle (2) range. Also increases the user's STR by LV/5 (min. 3) for 3 rounds."
      }
    ],
    description: "Shaped somewhat like a bear's paw, the claws hidden within will shred anyone caught in them just as effectively.",
    location: ["Random drops", "Metalwork (Lv4)"]
  },
  {
    name: "Spirit Gauntlet",
    rarity: 4,
    weaponType: "Fist",
    range: 1,
    power: 10,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 4,
    damageType: "Blunt",
    scaling: [
      {
        type: "Spiritual",
        str: 70,
        san: 40
      }
    ],
    specials: [
      {
        name: "Focus Restore",
        type: "Passive",
        description: "Restores Focus based on damage dealt. (10%) (Basic attacks only)"
      }
    ],
    description: "This gauntlet absorbs Focus from the wounds that it makes.",
    location: ["Random drops"]
  },
  {
    name: "Burst Claw",
    rarity: 5,
    weaponType: "Fist",
    subtype: "Claws",
    range: 1,
    power: 8,
    accuracy: 80,
    critical: 0,
    criticalDamage: 105,
    weight: 6,
    damageType: "Slash",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Fire Damage",
        type: "OnHit",
        description: "Deals magic Fire damage equal to 50% of your Fire ATK, which ignores armor."
      },
      {
        name: "Weapon Charge Consumption",
        type: "OnHit",
        description: "Consumes Weapon Charges, dealing 50% more damage per Charge Level"
      },
      {
        name: "Red Raid",
        type: "PotentialSkill",
        description: "Dash forward in a 4 Range line (+1 for every Weapon Charge level). If you encounter an enemy, you grab them and cause an explosion around them, dealing Blunt physical damage to all enemies in a 2 Range circle around them equal to 100% of Burst Claw's SWA, then your Weapon Charge level increases by 1.",
        momentumCost: 3,
        fpCost: 15,
        cooldown: 2
      }
    ],
    description: "An explosive set of claws that can cause fire plumes to appear when it strikes.",
    location: ["Random drops"]
  }
];

// All polearm weapons from the game
export const POLEARMS: Weapon[] = [
  {
    name: "Elenoa",
    rarity: 8,
    weaponType: "Polearm",
    range: 1,
    power: 11,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 6,
    damageType: "Pierce",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Dark ATK Substitute",
        type: "OnHit",
        description: "Replaces your Dark ATK with the target's for 2 rounds."
      },
      {
        name: "Tokio",
        type: "PotentialSkill",
        description: "Requires Substitute Dark ATK to be active. Consumes the status caused by the weapon and targets 1 enemy within 3 Range, drawing them in 2 tile towards you, dealing X armor-ignoring Dark damage, and inflicting Cursed Wound LV X on them for 3 rounds. (X = Twice Elenoa's total Upgrade Level (UL).)",
        momentumCost: 1
      }
    ],
    description: "A spear said to once belong to a priest who believed in dark deities.",
    location: ["Random drops"]
  },
  {
    name: "Knight Slayer",
    rarity: 9,
    weaponType: "Polearm",
    subtype: "Greatlance",
    range: 1,
    power: 14,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 15,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Anti-Heavy Armor",
        type: "Passive",
        description: "Increases Scaled Weapon ATK by 20% if the target's armor type is Heavy Armor."
      }
    ],
    description: "A spear made to pierce heavy armor and not much else.",
    location: ["Random drops"]
  },
  {
    name: "Monk Priest's Staff",
    rarity: 5,
    weaponType: "Polearm",
    subtype: "Staff",
    range: 1,
    power: 10,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 9,
    damageType: "Blunt",
    scaling: [
      {
        type: "Faithful",
        str: 50,
        fai: 50
      },
      {
        type: "Dextria-Light",
        fai: 20
      }
    ],
    specials: [
      {
        name: "Sanctify",
        type: "PotentialSkill",
        description: "Targets a 1 Range diamond around your position and removes most special effects tiles inside of it, destroying them, and creates a Sanctuary for 3 rounds with LV X (X = 1 + Power upgrade of Monk-Priest's Staff). Requires 2 durability to use and will fail if below that."
      }
    ],
    description: "A staff used by priests. When slammed into the ground, it makes a distinctive jingle.",
    location: ["Random drops", "Woodwork (Lv3)"]
  },
  {
    name: "Spear",
    rarity: 1,
    weaponType: "Polearm",
    range: 1,
    power: 4,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 4,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "Your standard, boring spear.",
    location: ["Random drops", "Shops", "Metalwork (Lv1)"]
  },
  {
    name: "Spear (Enhanced)",
    rarity: 2,
    weaponType: "Polearm",
    range: 1,
    power: 4,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 4,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Enhanced Stats",
        type: "Passive",
        description: "+3 STR"
      }
    ],
    description: "Your standard, boring spear.",
    location: ["Enchanting (Lv1)"]
  },
  {
    name: "Duodent",
    rarity: 2,
    weaponType: "Polearm",
    range: 1,
    power: 5,
    accuracy: 85,
    critical: 10,
    criticalDamage: 130,
    weight: 5,
    damageType: "Pierce",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    specials: [
      {
        name: "Critical Chance Bonus",
        type: "Passive",
        description: "Increases Critical Chance"
      },
      {
        name: "Swift Thrust",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked. Increases the Hit of the attack by 10, and if it hits, deals 35 Pierce bonus damage that ignores armor to all enemies within 5 Range of the target.",
        triggerRate: "10% + 8% Bonus",
        cooldown: 2
      }
    ],
    description: "Stabs deep and cuts twice.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Impaler",
    rarity: 3,
    weaponType: "Polearm",
    range: 1,
    power: 6,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 6,
    damageType: "Pierce",
    scaling: [
      {
        type: "Vampiric",
        str: 80,
        vit: 30
      }
    ],
    specials: [
      {
        name: "Vampiric",
        type: "Passive",
        description: "Vampiric (10%) (Basic attacks only)"
      }
    ],
    description: "A vampiric spear that sucks the blood of those it stabs.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Javelin",
    rarity: 2,
    weaponType: "Polearm",
    range: 3,
    power: 7,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 7,
    damageType: "Pierce",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    description: "A ranged variation of the spear.",
    location: ["Random drops", "Metalwork (Lv2)"]
  },
  {
    name: "Holy Lance",
    rarity: 3,
    weaponType: "Polearm",
    range: 1,
    power: 7,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 7,
    damageType: "Pierce",
    scaling: [
      {
        type: "Faithful",
        str: 70,
        fai: 40
      }
    ],
    specials: [
      {
        name: "Light Damage",
        type: "OnHit",
        description: "Deals magic Light bonus damage equal to 50% of your Light ATK, which ignores armor."
      }
    ],
    description: "Divinity in the form of a spear.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Siphon",
    rarity: 4,
    weaponType: "Polearm",
    range: 1,
    power: 8,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 8,
    damageType: "Pierce",
    scaling: [
      {
        type: "Spiritual",
        str: 70,
        san: 40
      }
    ],
    specials: [
      {
        name: "Focus Restore",
        type: "Passive",
        description: "Restores Focus based on damage dealt. (10%) (Basic attacks only)"
      },
      {
        name: "Wind Voltic",
        type: "PotentialSkill",
        description: "Launches a magically charged slash through all enemies in a 5 Range line that deals Wind magic damage equal to Siphon's SWA + 100% of your Wind ATK. You also drain 10% of the damage dealt from all enemies hit as FP."
      }
    ],
    description: "This spear draws out and absorbs Focus from enemy wounds.",
    location: ["Random drops", "Metalwork (Lv4)"]
  },
  {
    name: "Shizumare",
    rarity: 3,
    weaponType: "Polearm",
    subtype: "Greatlance",
    range: 1,
    power: 8,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 9,
    damageType: "Pierce",
    scaling: [
      {
        type: "Magical",
        str: 70,
        wil: 40
      }
    ],
    specials: [
      {
        name: "Silence on Critical",
        type: "OnCrit",
        description: "Inflict Silence for 2 rounds. (Cannot be reapplied to that target for 4 rounds afterwards.)"
      }
    ],
    description: "A deadly blow from this weapon will leave an enemy speechless.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Soulstealer",
    rarity: 4,
    weaponType: "Polearm",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 11,
    damageType: "Pierce",
    scaling: [
      {
        type: "Darkness",
        str: 70,
        res: 40
      }
    ],
    specials: [
      {
        name: "WIL Absorption",
        type: "OnHit",
        description: "Absorbs part of the target's spiritual power, increasing your WIL by 15% of their WIL for 3 turns."
      }
    ],
    description: "An essence stealing demonic spear.",
    location: ["Random drops", "Metalwork (Lv4)"]
  },
  {
    name: "Voidcut",
    rarity: 4,
    weaponType: "Polearm",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 11,
    damageType: "Pierce",
    scaling: [
      {
        type: "Magical",
        str: 70,
        wil: 40
      }
    ],
    specials: [
      {
        name: "WIL Reduction",
        type: "OnCrit",
        description: "Torments the target with horrible visions, lowering their WIL by 20% for 3 turns."
      }
    ],
    description: "From another world.",
    location: ["Random drops", "Metalwork (Lv4)"]
  },
  {
    name: "Greatspear",
    rarity: 3,
    weaponType: "Polearm",
    range: 1,
    power: 10,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 16,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "A heavier spear that deals more damage. While not the trademark of a particular nation, Wyvernriders often use them in battle, as their mobility is not hindered by the weapon's weight.",
    location: ["Random drops", "Metalwork (Lv3)"]
  },
  {
    name: "Excel Hasta",
    rarity: 6,
    weaponType: "Polearm",
    range: 1,
    power: 8,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 14,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Weapon Charge Consumption",
        type: "OnHit",
        description: "Consumes Weapon Charges, dealing 50% more damage per Charge Level."
      },
      {
        name: "Charge Weapon",
        type: "GrantsSkill",
        description: "Rev your weapon and fill it with focus, increasing its Charge, to a maximum of level 3. When you hit with a weapon that can consume Weapon Charges, the damage you deal with that attack will increase by 50% per level. (Weapon Charges will expire after 5 rounds.)",
        momentumCost: 3,
        fpCost: 5
      },
      {
        name: "Elite Engine",
        type: "PotentialSkill",
        description: "Shared Potential Skill. Charge Weapon FP cost is increased to 8 FP. Attacks do not use up all of your charges, instead the LV is reduced by 1, and the damage bonus is 35% (does not increase with charge amount like normal Excel attacks)."
      }
    ],
    description: "The Excel line of weapons were developed in Chaturanga, where the ability to be defensive while increasing offensive capabilities was highly valued. By charging up the weapon, it can explosively spend the focus energy when it strikes an enemy, greatly increasing damage. However, the engine module makes it heavier than other weapons.",
    location: ["Random drops"]
  },
  {
    name: "Firepoker",
    rarity: 6,
    weaponType: "Polearm",
    range: 1,
    power: 8,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 6,
    damageType: "Pierce",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    specials: [
      {
        name: "Fire Damage",
        type: "OnHit",
        description: "Deals magic Fire bonus damage equal to 50% of your Fire ATK, which ignores armor."
      },
      {
        name: "Coal Brand",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked. Inflicts the target with Elemental Pierce (Fire) (2 rounds), and if it hits, all other enemies in 5 Range of the target take Firepoker's On Hit effects.",
        triggerRate: "10% + 8% Bonus",
        cooldown: 2
      }
    ],
    description: "Not your average fireplace tool.",
    location: ["Random drops"]
  },
  {
    name: "Gae Bolg Replica",
    rarity: 8,
    weaponType: "Polearm",
    range: 1,
    power: 15,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 12,
    damageType: "Pierce",
    scaling: [
      {
        type: "Replica",
        str: 70,
        ski: 20,
        san: 20
      }
    ],
    enchantment: "Divine Weapon",
    specials: [
      {
        name: "Divine Weapon",
        type: "Passive",
        description: "+2 Power, +5 Accuracy, +5 Critical, -2 Weight. Unbreakable."
      }
    ],
    description: "A replica of a set of spears said to be made from Zera's remains. It possesses extremely high power.",
    location: ["Casino"]
  },
  {
    name: "Quarterstaff",
    rarity: 1,
    weaponType: "Polearm",
    subtype: "Staff",
    range: 1,
    power: 4,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 4,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 100
      }
    ],
    description: "A quarterstaff made out of wood.",
    location: ["Random drops", "Woodwork (Lv1)"]
  },
  {
    name: "Warstaff",
    rarity: 3,
    weaponType: "Polearm",
    subtype: "Staff",
    range: 1,
    power: 10,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 12,
    damageType: "Blunt",
    scaling: [
      {
        type: "Finesse",
        str: 70,
        ski: 30
      }
    ],
    description: "A heavier, more powerful version of your average quarterstaff, the war staff is often used as a momentum-based weapon.",
    location: ["Random drops", "Woodwork (Lv3)"]
  },
  {
    name: "Sasumata",
    rarity: 6,
    weaponType: "Polearm",
    range: 1,
    power: 9,
    accuracy: 80,
    critical: 0,
    criticalDamage: 115,
    weight: 6,
    damageType: "Blunt",
    scaling: [
      {
        type: "Basic",
        str: 70,
        ski: 40
      }
    ],
    specials: [
      {
        name: "Sasumata Passive",
        type: "Passive",
        description: "Once per round (per enemy), after an enemy uses an action that moves them into the tile you are facing; if your STR is greater than their Battle Weight (ignoring reductions; monsters use their level instead), you push them back 1 tile and inflict them with Clumsy (1 round). Otherwise, you inflict them with Impaired Attack (LV 5, until your next turn, effect ends when enemy is no longer close to you). Impaired Attack: Damage against the causer is reduced by LV%. Effect ends by moving away from the causer."
      },
      {
        name: "Subdue & Restrain",
        type: "PotentialSkill",
        description: "Targets an enemy in 1 Range and applies an effect. If the target is Knocked Down, you pin them with the Sasumata, inflicting Grappled (2 rounds) and Impaired Attack (LV 10, 2 rounds). If not, if you are behind the target, you strike their knees and inflict them with Knocked Down. If none of the other effects activate, you knock them back 2 tiles and recover 2M.",
        momentumCost: 3,
        fpCost: 5
      }
    ],
    description: "A polearm with a dull crescent edge and a row of spikes near it. It is frequently used by guards in certain cultures as a means to restrain the aggressive, such as animals or criminals, or to keep them away.",
    location: ["Random drops"]
  },
  {
    name: "Sleigher",
    rarity: 6,
    weaponType: "Polearm",
    subtype: "Scythe",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 9,
    damageType: "Pierce",
    scaling: [
      {
        type: "Cold",
        str: 70,
        ski: 40
      }
    ],
    specials: [
      {
        name: "Ice Damage",
        type: "OnHit",
        description: "Deals magic Ice bonus damage equal to 50% of your Ice ATK, which ignores armor."
      }
    ],
    description: "Used by a demon from the north to trim people from his list of evil-doers.",
    location: ["Random drops"]
  },
  {
    name: "Gae Baed",
    rarity: 9,
    weaponType: "Polearm",
    range: 1,
    power: 13,
    accuracy: 85,
    critical: 0,
    criticalDamage: 115,
    weight: 14,
    damageType: "Pierce",
    scaling: [
      {
        type: "Cunning",
        str: 70,
        gui: 40
      }
    ],
    specials: [
      {
        name: "Cursed Wound",
        type: "OnHit",
        description: "Inflicts or powers up Cursed Wound by 10 LV for 3 rounds. (Cursed Wound lowers the target's maximum HP by LV.)"
      },
      {
        name: "Cursed Thrust",
        type: "SpecialStrike",
        description: "Triggers before an enemy is attacked. Increases the damage the attack deals by 15, and if it hits, applies or powers up Cursed Wound LV X (X = 75 + 25 per Curse status effect on the target) (3 rounds) to the target.",
        triggerRate: "10% + 8% Bonus",
        cooldown: 2
      }
    ],
    description: "One of a set of spears said to be made from Zera's remains, the Gae Baed inflicts wounds that never heal. Either due to being an imitation, or age, that effect is weakened on this particular spear.",
    location: ["Random drops"]
  },
  {
    name: "Pilfer Spear",
    rarity: 5,
    weaponType: "Polearm",
    range: 1,
    power: 9,
    accuracy: 85,
    critical: 5,
    criticalDamage: 115,
    weight: 10,
    damageType: "Pierce",
    scaling: [
      {
        type: "Cunning",
        str: 70,
        gui: 40
      }
    ],
    specials: [
      {
        name: "Steal Success Bonus",
        type: "Passive",
        description: "Increases Steal's success rate by 15%."
      },
      {
        name: "Pilfer",
        type: "PotentialSkill",
        description: "Targets one enemy within 1 Range. Messes with the target's inventory, preventing them from using items for 2 rounds."
      }
    ],
    description: "A spear designed for those who like to take things that don't belong to them.",
    location: ["Random drops"]
  }
];

// Group weapons by category for easy filtering
export const WEAPONS_BY_TYPE = {
  'Axe': AXES,
  'Bow': BOWS,
  'Dagger': DAGGERS,
  'Gun': GUNS,
  'Fist': FISTS,
  'Polearm': POLEARMS,
  'Sword': SWORDS
};

// All weapons combined
export const ALL_WEAPONS: Weapon[] = [
  ...AXES,
  ...SWORDS,
  ...BOWS,
  ...DAGGERS,
  ...GUNS,
  ...FISTS,
  ...POLEARMS
];

// Combined weapon array for easy access
export const WEAPONS: Weapon[] = [
  ...AXES,
  ...SWORDS,
  ...BOWS,
  ...DAGGERS,
  ...GUNS,
  ...FISTS,
  ...POLEARMS
];
