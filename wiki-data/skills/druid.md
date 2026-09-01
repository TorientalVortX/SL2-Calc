---
title: "Druid — Skills"
class: "Druid"
skill_count: "30"
source: "https://sl2.miraheze.org/wiki/Druid"
scraped: "2026-08-11"
confidence: "strong"
---
# Druid — Skills

Every skill the wiki lists for **Druid**, with its cost and scaling values.
Slash-separated numbers are per rank, rank 1 first.

## Quick reference

| Skill | Type | Max Rank | FP (per rank) | Momentum | Range | Power | Cooldown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Aero of Disaster](#aero-of-disaster) | Offensive | 3 | 25 | 3 | 5 | 80/90/100% Wind ATK, 100% Scaled WPN ATK | 2 |
| [Fulgur of Duplicity](#fulgur-of-duplicity) | Offensive | 3 | 20 | 3 | 6 | 90/100/110% Lightning ATK, 100% Scaled WPN ATK | 2 |
| [Geo of Crumbling](#geo-of-crumbling) | Offensive | 3 | 25 | 3 | 5 | 80/90/100% Earth ATK, 100% Scaled WPN ATK | 2 |
| [Summon Animal Companion (Bear)](#summon-animal-companion-bear) | Offensive | 3 | 5 | 3 | 5 | -- | 1 |
| [Summon Animal Companion (Wolf)](#summon-animal-companion-wolf) | Offensive | 3 | 5 | 3 | 5 | -- | 1 |
| [Wild Shape (Bear)](#wild-shape-bear) | Offensive | 3 | 0 | 0 | — | -- | 1 |
| [Wild Shape (Hawk)](#wild-shape-hawk) | Offensive | 3 | 0 | 0 | — | -- | 1 |
| [Wild Shape (Viper)](#wild-shape-viper) | Offensive | 3 | 0 | 0 | — | -- | 1 |
| [Wild Shape (Wolf)](#wild-shape-wolf) | Offensive | 3 | 0 | 0 | — | -- | 1 |
| [Aero of Kindness](#aero-of-kindness) | Support | 3 | 25 | 3 | 5 | HP Heal (per): 5 + 30/40/50% Wind ATK | 6 |
| [Canto of Nature](#canto-of-nature) | Support | 3 | 10 | 3 | 5 | -- | 1 |
| [Nature's Bounty](#nature-s-bounty) | Support | 3 | 35/25/15 | 3 | 5 | -- | 6 |
| [Summon Animal Companion (Hawk)](#summon-animal-companion-hawk) | Support | 3 | 5 | 3 | 5 | -- | 1 |
| [Burning Bush](#burning-bush) | Utility | 3 | 15 | 3 | 5 | -- | 2 |
| [Dragging Vines](#dragging-vines) | Utility | 1 | 10 | 1 | 8 | -- | 3 |
| [Dragging Vines](#dragging-vines) | Utility | 3 | 10 | 1 | 5 | -- | 1 |
| [Fulgur of Flight](#fulgur-of-flight) | Utility | 3 | 30 | 3 | 5 | -- | 5 |
| [Geo of Drought](#geo-of-drought) | Utility | 3 | 20 | 3 | 5 | -- | 3 |
| [Listblume](#listblume) | Utility | 3 | 15 | 3 | 5 | -- | 2 |
| [Mortefiore](#mortefiore) | Utility | 3 | 30 | 3 | 5 | -- | 2 |
| [Summon Animal Companion (Viper)](#summon-animal-companion-viper) | Utility | 3 | 5 | 3 | 5 | -- | 1 |
| [Transplant](#transplant) | Utility | 1 | 5 | 3 | 5 | -- | 3 |
| [Active Animal Companion](#active-animal-companion) | Passive | 2 | — | — | — | — | — |
| [Druidic Tending](#druidic-tending) | Passive | 2 | — | — | — | — | — |
| [Nutrient Brighten](#nutrient-brighten) | Passive | 2 | — | — | — | — | — |
| [Predator and Prey](#predator-and-prey) | Passive | 2 | — | — | — | — | — |
| [Still Shape](#still-shape) | Passive | 1 | — | — | — | — | — |
| [Command Nature](#command-nature) | Innate | 1 | — | — | — | — | — |
| [Lone Wolves](#lone-wolves) | Innate | 1 | — | — | — | — | — |
| [Nature's Conduit](#nature-s-conduit) | Innate | 3 | — | — | — | — | — |

## Skills

### Aero of Disaster

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 25
- **Momentum:** 3
- **Range:** 5
- **Power:** 80/90/100% Wind ATK, 100% Scaled WPN ATK
- **Target:** Circle (2), Circle (3)
- **Cooldown:** 2
- **Flags:** Location
- **Earth Damage/Plant:** 8/16/24
- **Domain:** Sylphid

Targets a 2 Size Circle up to 5 Range away and creates a violent squall within it. All enemies in it take Wind magic damage that can critical (+25% damage), and are spun around. +1 size of Mass is active.

Plant tiles (excluding Druid Plants) are torn from the ground, dealing armor-ignoring Earth bonus damage to 1 random enemy or other ally (max 3 per enemy, 1 per ally as Kickback Damage). Other tiles apply an Aero Shift (3) effect.

##### Aero Shift

This is an effect typically created by wind element abilities, often listed as Aero Shift (X), where X is a number.

When applied to a tile, any movable field effects in that tile (such as rocks) are blown away tiles equal to the Aero Shift value. For example, Aero Shift (2) will blow the object away 2 tiles. The direction an object moves is usually away from the center of the effect.

Objects which collide with a unit may have additional effects; rocks, for example, can inflict stun. Other objects may be vulnerable to the wind and will dissipate from the Aero Shift; for example, Smokescreens, clouds of spores, etc. will disappear entirely.

[Wiki page](https://sl2.miraheze.org/wiki/Aero_of_Disaster)

### Fulgur of Duplicity

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 20
- **Momentum:** 3
- **Range:** 6
- **Power:** 90/100/110% Lightning ATK, 100% Scaled WPN ATK
- **Target:** Single
- **Cooldown:** 2
- **Flags:** Enemy
- **Domain:** Nature

Targets 1 enemy within 6 Range, and creates a burst of static energy, dealing Lightning magic damage that can critically hit (+25% damage). If the target is hit and has a copiable effect, and an ally is within 3 Range of them, the lightning jolts to 1 of those allies randomly, dealing 25% of the damage as Kickback Damage, but they copy one of those effects (same duration, half LV).

If Mass is active, you can target 2 different tiles.

[Wiki page](https://sl2.miraheze.org/wiki/Fulgur_of_Duplicity)

### Geo of Crumbling

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 25
- **Momentum:** 3
- **Range:** 5
- **Power:** 80/90/100% Earth ATK, 100% Scaled WPN ATK
- **Target:** Circle (2), Circle (3)
- **Cooldown:** 2
- **Flags:** Location
- **Wear Down/Lingering Damage (Earth) LV:** 5/10/15
- **Domain:** Isespian

Targets a 2 Size Circle up to 5 Range away and creates an eroding quake. All enemies within that circle take Earth magic damage that can critically hit (+25% damage). Enemies that are hit suffer from Wear Down LV X, if critically hit they suffer from Lingering Damage (Earth) LV X instead. This lasts for 3 rounds. +1 size if Mass is active.

Trickery: All enemy-placed attackable field objects in the circle take 10 damage.

(Wear Down reduces armor by LV.)

[Wiki page](https://sl2.miraheze.org/wiki/Geo_of_Crumbling)

### Summon Animal Companion (Bear)

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Location

Grants you access to an Animal Companion, the Bear, a bulky and disruptive momma bear. Passively grants access to the skills Bear Bash (Call), Bear Hug (Call), and Bear Zerk (Call).

Targets 1 tile within 5 Range and summons the Bear to it, or targets the Bear and unsummons in. Unsummoning the Bear recovers 2M, but puts it on a 1 round CD (+1 round if the Bear was at less than 50% HP).

[Wiki page](https://sl2.miraheze.org/wiki/Animal_Companion_(Bear))

### Summon Animal Companion (Wolf)

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Location

Grants you access to an Animal Companion, the Wolf, a powerful hunting beast. Passively grants access to the skills Wolf Run (Call), Wolf Howl (Call), and Wolf Agility (Call).

Targets 1 tile within 5 Range and summons the Wolf to it, or targets the Wolf and unsummons in. Unsummoning the Wolf recovers 2M, but puts it on a 1 round CD (+1 round if the Wolf was at less than 50% HP).

[Wiki page](https://sl2.miraheze.org/wiki/Animal_Companion_(Wolf))

### Wild Shape (Bear)

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 0
- **Momentum:** 0
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Self
- **Stat Bonus:** 3/4/5

Utilize the power of nature to Wild Shapeshift into a Bear. Whil ein Bear form, you gain bonuses to the following stats; DEF, RES, VIT.

You also gain a bonus to Armor and Scaled Weapon Attack, and access to the various skills listed in Wild Shape (Bear).

#### Wild Shape (Bear)

An animal form that the Druid can Wild Shapeshift into. While in this form, your race changes, you gain bonuses to various stats, and gain access to certain skills. However, you cannot cast spells.

When using the basic attack granted by this form, a special weapon is used. Additionally, when using these skills, you gain the benefit as if the animal were using them, and they do not affect your ability to use Calls of the same animal, etc.

Race Changed To: Beast

Stat Bonuses: DEF, RES, VIT, Armor, Scaled Weapon Attack

Additional Skills:

•Bear Maul (Weapon: Wild Bear Claw)

• Bear Bash

• Bear Hug

• Bear Zerk

• End Wild Shape

[Wiki page](https://sl2.miraheze.org/wiki/Wild_Shape_(Bear))

### Wild Shape (Hawk)

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 0
- **Momentum:** 0
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Self
- **Stat Bonus:** 3/4/5

Utilize the power of nature to Wild Shapeshift into a Hawk. While in Hawk form, you gain bonuses to the following stats; CEL, LUC, SKI.

You also gain a bonus to Evade and Hit, and access to the various skills listed in Wild Shape (Hawk).

#### Wild Shape (Wolf)

An animal form that the Druid can Wild Shapeshift into. While in this form, your race changes, you gain bonuses to various stats, and gain access to certain skills. However, you cannot cast spells.

When using the basic attack granted by this form, a special weapon is used. Additionally, when using these skills, you gain the benefit as if the animal were using them, and they do not affect your ability to use Calls of the same animal, etc.

Race Changed To: Avian

Stat Bonuses: CEL, LUC, SKI, Evade, Hit

Additional Skills:

• Hawk Dive (Weapon: Wild Hawk Talon)

• Hawk Strike

• Hawk Glide

• Hawk Gale

• End Wild Shape

[Wiki page](https://sl2.miraheze.org/wiki/Wild_Shape_(Hawk))

### Wild Shape (Viper)

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 0
- **Momentum:** 0
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Self
- **Stat Bonus:** 3/4/5

Utilize the power of nature to Wild Shapeshift into a Viper. While in Viper form, you gain bonuses to the following stats; CEL, GUI, RES.

You also gain a bonus to Evade and Critical, and access to the various skills listed in Wild Shape (Viper).

#### Wild Shape (Viper)

An animal form that the Druid can Wild Shapeshift into. While in this form, your race changes, you gain bonuses to various stats, and gain access to certain skills. However, you cannot cast spells.

When using the basic attack granted by this form, a special weapon is used. Additionally, when using these skills, you gain the benefit as if the animal were using them, and they do not affect your ability to use Calls of the same animal, etc.

Race Changed To: Serpent

Stat Bonuses: CEL, GUI, RES, Evade, Magic Armor

Additional Skills:

• Viper Brushbite (Weapon: Wild Viper Fang)

• Viper Venom

• Viper Antivenom

• Viper Wrap

• End Wild Shape

[Wiki page](https://sl2.miraheze.org/wiki/Wild_Shape_(Viper))

### Wild Shape (Wolf)

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 0
- **Momentum:** 0
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Self
- **Stat Bonus:** 3/4/5

Utilize the power of nature to Wild Shapeshift into a Wolf. While in Wolf form, you gain bonuses to the following stats; STR, SKI, CEL.

You also gain a bonus to Evade and Critical, and access to the various skills listed in Wild Shape (Wolf).

#### Wild Shape (Wolf)

An animal form that the Druid can Wild Shapeshift into. While in this form, your race changes, you gain bonuses to various stats, and gain access to certain skills. However, you cannot cast spells.

When using the basic attack granted by this form, a special weapon is used. Additionally, when using these skills, you gain the benefit as if the animal were using them, and they do not affect your ability to use Calls of the same animal, etc.

Race Changed To: Beast

Stat Bonuses: STR, SKI, CEL, Evade, Critical

Additional Skills:

• Wolf Strike (Weapon: Wild Wolf Claw)

• Wolf Run

• Wolf Howl

• Wolf Agility

• End Wild Shape

[Wiki page](https://sl2.miraheze.org/wiki/Wild_Shape_(Wolf))

### Aero of Kindness

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 25
- **Momentum:** 3
- **Range:** 5
- **Power:** HP Heal (per): 5 + 30/40/50% Wind ATK
- **Target:** Circle (2), Circle (3)
- **Cooldown:** 6
- **Flags:** Ally
- **Domain:** Sylphid

Targets a 2 Size Circle in 5 Range and conjures a healing breeze. Allies and Druid Plants within it enhances it, recovering HP and giving HP Regeneration LV X (Rank x 8, 1 round) Heal and Regen duration increase based on enhancement (up to 150% wind ATK, 5 rounds); Druid Plants count as 'half' an ally. +1 size if Mass is active.

If 3+ allies affected, their enemy-caused effect durations are cut by 1 round, and all Druid Plants in the circle apply Growth 1.

[Wiki page](https://sl2.miraheze.org/wiki/Aero_of_Kindness)

### Canto of Nature

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 10
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Location

Song skill. Targets 1 tile within 5 Range, which has a flower, Druid Plant or Plant ally in it, and fills it with galdric energies. Flowers will grow in size, increasing their effective range, while Druid Plants will apply Growth 1. Plant allies gain Encourage LV X (X = Rank) for 5 rounds.

If the skill only affects a flower or Druid Plant, the skill refunds 2M.

[Wiki page](https://sl2.miraheze.org/wiki/Canto_of_Nature)

### Nature's Bounty

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 35/25/15
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 6
- **Flags:** Location

Targets 1 tile within 5 Range, and plants a Sweet Apple Sapling at that tile. If Mass is active, you can target 2 tiles. The second will create a Sweet Strawberry Sapling.

#### Sweet Apple Sapling

Growth Period: 3 Created by the Druid skill Nature's Bounty. A magical plant that can grow from druidic magics.

A relatively unremarkable plant, but with a remarkable fruit.

HP: Not Attackable

Bloom: Grows a Sweet Apple.

Special: Units (including enemies) within 1 Range of the Sweet Apple Sapling can eat the fruit to recover 25% of their maximum FP. Eating the fruit destroys the plant.

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Recovery percentage increases by 10. Additionally, grants the eater Damage Amplified (LV 10, 5 rounds. Damage Amplified increases all damage dealt by LV%.).

Quickness Tending - Recovery percentage increases by 5. If an enemy tries to eat from the tree, they only have a (Enemy's CEL)% chance to successfully eat it. If they fail, they cannot attempt to eat it again for 1 round.

#### Sweet Strawberry Sapling

Growth Period: 3 Created by the Druid skill Nature's Bounty. A magical plant that can grow from druidic magics.

A relatively unremarkable plant, but with a remarkable fruit.

HP: Not Attackable

Bloom: Grows a Sweet Strawberry.

Special: Units (including enemies) within 1 Range of the Sweet Strawberry Sapling can eat the fruit to recover 25% of their maximum HP. Eating the fruit destroys the plant.

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Recovery percentage increases by 10. Additionally, grants the eater Protection Up (LV 10, 5 rounds. Protection up increases Phys. and Mag. Defense by LV.).

Quickness Tending - Recovery percentage increases by 5. If an enemy tries to eat from the tree, they only have a (Enemy's CEL)% chance to successfully eat it. If they fail, they cannot attempt to eat it again for 1 round.

[Wiki page](https://sl2.miraheze.org/wiki/Nature's_Bounty)

### Summon Animal Companion (Hawk)

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Location

Grants you access to an Animal Companion, the Hawk, a flying eye in the sky. Passively grants access to the skills Hawk Strike (Call), Hawk Glide (Call), and Hawk Gale (Call).

Targets 1 tile within 5 Range and summons the Hawk to it, or targets the Hawk and unsummons in. Unsummoning the Hawk recovers 2M, but puts it on a 1 round CD (+1 round if the Wolf was at less than 50% HP).

[Wiki page](https://sl2.miraheze.org/wiki/Animal_Companion_(Hawk))

### Burning Bush

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 15
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 2
- **Flags:** Location
- **LV:** 10/15/20

Targets 1 tile within 5 Range and plants a Burning Bush Sapling at it. If Mass is Active, you can target 2 tiles.

#### Burning Bush

Growth Period: 3

Created by the Druid skill Burning Bush. A magical plant that can grow from druidic magics.

These plants secrete an oil that ignites from friction of the vines rubbing together, producing smoke that attracts and incapacitates insects, which it then consumes.

HP: 20

Bloom: Deals Fire magic damage equal to 25 + (LV x 10)% of your Fire ATK to all enemies within 4 Range.

On New Round: Lashes out with a burning vine at an enemy within 2 Range, which deals 25 + (LV x 5)% of your Fire ATK as Fire magic damage (with Great Accuracy). If it hits, the target may be inflicted with Burn (LV 10, 2 rounds).

Special: These blazing vines are immune to fire-based effects that destroy plants.

Special 2: Aero Shift effects will spread the plant's oil onto enemies within 2 Range, inflicting them with Dangerous Liquid (2 rounds).

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Effective LV is increased by 25%.

Quickness Tending - Effective Range is increased by 1.

[Wiki page](https://sl2.miraheze.org/wiki/Burning_Bush)

### Dragging Vines

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Range:** 8
- **Power:** --
- **Target:** Single (2)
- **Cooldown:** 3
- **Flags:** Location

Targets 2 tiles in 8 Range. Location 1 must contain one of your bloomed Druid Plants, and Location 2 must contain a unit within 5 Range of it. Grasping vines outreach from the plant, pulling the target unit 3 tiles closer to it.

If Predator and Prey is active and the target is an enemy, it deals 30 protection-ignoring Darkness damage, and restores 30 HP to you.

[Wiki page](https://sl2.miraheze.org/wiki/Dragging_Vines)

### Dragging Vines

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 10
- **Momentum:** 1
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Location
- **LV:** 15/30/45

Targets 1 tile within 5 Range and plants a Devil Vines Sapling at it. If Mass is Active, you can target 2 tiles.

#### Devil Vines Sapling

Growth Period: 1

Created by the Druid skill Devil Vines. A magical plant that can grow from druidic magics.

These thorn-covered vines seemingly feed on the suffering of those who move through them, and are notorious for spreading like weeds.

HP: 30

Bloom: Creates another Devil Vines Sapling at a valid tile within 2 Range of itself.

Stepped On: Any unit who steps on a tile containing Devil Vines take armor-ignoring Pierce damage equal to its LV. This also damages the plant for 10 HP, however; boss enemies will deal 30 HP instead, as they completely trample the vines.

Special: An allied unit of the placer that is within 1 Range of Devil Vines gains a chance to parry physical damage (35% Reduction, 50% Chance) as the vines move to protect them.

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Effective LV is increased by 25%.

Quickness Tending - Parry success chance increased to 60%.

[Wiki page](https://sl2.miraheze.org/wiki/Devil_Vines)

### Fulgur of Flight

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 30
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Circle (2), Circle (3)
- **Cooldown:** 5
- **Flags:** Location

Targets a 2 Size Circle up to 5 Range away and charges the area with polarized electricity, while also planting a Fulgurbloom Sapling in the center (Druids only). +1 Size if Mass is active.

In that area; all units take 15 Lightning magic Kickback Damage, are cured of Knocked Down (and gain immunity if so), go Airborne, recover X FP (Rank x 15), cut the duration of Interference, and Elemental Pierce (Wind) LV X (Rank x 5, 3 rounds).

#### Fulgurbloom Sapling

Growth Period: 3 Created by the Druid spell Fulgur of Flight. A magical plant that can grow from druidic magics.

The pollen of this plant manipulates electrical charges in the air it flows through, creating a deadly atmosphere of static.

HP: 20

Bloom: Creates Static Fields LV X (LV x 2, 2 rounds) at all tiles within 5 Range. (Deals armor-ignoring Lightning damage when created, stepped on, and at the start of a new round.)

On New Round: Creates Static Fields LV X (LV, 2 rounds) at all tiles within 2 Range.

Static Field tiles will only be created in tiles which do not already have them.

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Effective LV is increased by 25%.

Quickness Tending - Effective Range is increased by 1

[Wiki page](https://sl2.miraheze.org/wiki/Fulgur_of_Flight)

### Geo of Drought

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 20
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Circle (2), Circle (3)
- **Cooldown:** 3
- **Flags:** Location
- **Duration Cut:** 1/2/3
- **Reduced Resistance (Fire), Burn LV:** 7/14/21
- **Domain:** Isespian

Targets a 2 Size Circle in 5 Range and dries out the air in it, while also planting a Bristleblade Sapling in the center (Druids only). +1 Size of Mass is active.

The target area is subjected to an instantaneous Natural Drought.

#### Bristleblade Sapling

Growth Period: 3 Created by the Druid spell Geo of Drought. A magical plant that can grow from druidic magics.

A hardy, leafless plant with extremely sharp branches. It is capable of thriving in environments other plants cannot.

HP: 20

Bloom: Deals X armor-ignoring Slash damage (LV x 10) to all enemies in 4 Range.

On New Round: Deals X armor-ignoring Slash damage (LV x 2) to all enemies in 2 Range.

Special: Aero Shift effects will sway the plant in place, applying its On New Round effect.

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Effective LV is increased by 25%.

Quickness Tending - Effective Range is increased by 1.

#### Natural Drought

This is a magical effect created by the Druid spell Geo of Drought.

Within that area, the duration of all water-based effects and tiles are cut, such as;

• Soaked

• Brine Blade

• Refreshing Flow

• Water Veil

• Dancing Tentacles, Dark Water, Flooded Water, etc.

This applies to all units and tiles. If you are a Monoclass Druid, your control of the magic is stronger; field tiles are affected the same, but only negative effects for allies and positive effects for enemies receive the duration cut.

Additionally, enemies within the drought suffer from Elemental Pierce (Fire) LV X (Rank x 5, 3 rounds), and if they're a water-based monster, they may be inflicted with Burn of the same LV and duration.

[Wiki page](https://sl2.miraheze.org/wiki/Geo_of_Drought)

### Listblume

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 15
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 2
- **Flags:** Location
- **LV:** 10/20/30

Targets 1 tile within 5 Range and plants a Listblume Sapling at it. If Mass is Active, you can target 2 tiles.

#### Listblume Sapling

Growth Period: 3

Created by the Druid skill Listblume. A magical plant that can grow from druidic magics.

The fragrance of this plant's flower is said to lead animals to it. Once enchanted, the plant's pollen drives them to kill other animals attracted to the Listblume, where the remains feed its rooted soil with nutrients.

HP: 20

Bloom: All enemies within 5 Range are inflicted with Charm LV X (X = LV, 3 rounds) and perform their main hand weapon's basic attack skill on one of your enemies within 3 Range of them (or themself, if none) for 50% damage. Bosses will resist the compulsion to attack themselves.

On New Round: Attempts to inflict enemies within 3 Range with Charm LV X (X = LV, 3 rounds).

##### Tending

With the skill Druidic Tending, the plant gets the following bonuses:

Invigoration Tending - Effective LV is increased by 25%.

Quickness Tending - Effective Range is increased by 1.

[Wiki page](https://sl2.miraheze.org/wiki/Listblume)

### Mortefiore

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 30
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 2
- **Flags:** Location
- **LV:** 10/15/20

Targets an enemy within 5 Range and attempts to sow a deadly seed in their body, dealing 15 protection-ignoring Earth damage. If the attack hits, they will be inflicted with Mortefiore, the duration depends on an infliction check; if successful, 3 rounds, if not, 5 rounds.

Certain races may not be valid hosts for the plant. A unit can only be inflicted with Mortefiore once per Battle.

#### Mortefiore

Sewn with a deadly plant. At start of new round, drain FP by LV. If duration is 1, painfully blooms, dealing Darkness damage based on LV (ignores Immunity/Absorb/Reflect); LV x 25 if causer level + 10 is greater or equal to this unit's level and this unit is a monster, or LV x 10 otherwise. Then inflicts Cursed Wound (LV = dmg dealt, 5 rounds) and Darkness Resistance Down (LV = level, 5 rounds).

[Wiki page](https://sl2.miraheze.org/wiki/Mortefiore)

### Summon Animal Companion (Viper)

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 1
- **Flags:** Location

Grants you access to an Animal Companion, the Viper, a sneaky and swift snake. Passively grants access to the skills Viper Venom (Call), Viper Antivenom (Call), and Viper Wrap (Call).

Targets 1 tile within 5 Range and summons the Viper to it, or targets the Viper and unsummons in. Unsummoning the Viper recovers 2M, but puts it on a 1 round CD (+1 round if the Wolf was at less than 50% HP).

[Wiki page](https://sl2.miraheze.org/wiki/Animal_Companion_(Viper))

### Transplant

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Cooldown:** 3
- **Flags:** Location

Targets 2 tiles in 8 Range. Location 1 must contain one of your plant tiles (except non-Bloomed Druid Plants), and Location 2 must be an empty tile containing no plants. A flash of druidic magic instantly relocates that plant to a new location.

[Wiki page](https://sl2.miraheze.org/wiki/Transplant)

### Active Animal Companion

- **Type:** Passive
- **Max rank:** 2
- **Flags:** Main class skill
- **Rank 2:** Equipping this skill does not take up a Skill Pool slot.

You and your favorite companion are used to working together.

At the start of battle, you automatically summon the first equipped Animal Companion to a tile within 1 Range of you.

#### Animal Companion

Druids often work in tandem with the forces of nature, as their goals are often aligned. As such, they often employ animal companions as allies, who protect the Druid and follow its instructions.

##### Additional Skills

The Druid has access to a few different Animal Companion skills. Simply having these skills equipped will give them additional access to 3 'Call' skills that utilize the animal's talents, which briefly call the animal companion to the battlefield to perform an action.

These skills have a shared cooldown on a per-animal basis. For example, utilizing one of the Wolf's Call skills will put its other Call skills, and the ability to summon them, on cooldown (dependent on the skill). However, even if you use one of the Wolf's Call skills, you will still be able to use the Bear's Call skills (if they aren't also on CD).

##### Summoning the Companion

You can also use the skill directly to summon the animal companion as a unit to battle. When summoned this way, its level is equal to your character level, and it will be summoned with 3M immediately available. While summoned, however, you will not be able to use the companion's Call skills. You can use the skill on the companion again to unsummon them.

Animal Companions do not carry over HP/FP between battles, or even through multiple summons; they will always be summoned with full HP and FP.

##### Defeated Companions

When defeated, all of an Animal Companion's skills (including Calls) are put on a 6 round CD. However, they also drop a Druid Totem at their current location. If you enter the same tile as this totem, you will pick it up and accelerate the companion's CD by 3 rounds. Enemies can attack it to destroy it, to deny you this bonus.

Utilize caution and unsummon your animal companion if they are in dire straits, or you may find yourself without them when it matters most.

##### Calls VS Self-Use

If an Animal Companion's skill references Rank, it means the master's rank of the Animal Companion skill that grants access to it. If a monster, wild animal, or other unit uses those skills somehow, it defaults to max Rank (3).

Animal Companions may also have benefits to their skills if they are Invigorated or Quickened. These benefits do not apply when using the Call versions of their skills, only when they are used by the companion while summoned. See individual skills for further information.

[Wiki page](https://sl2.miraheze.org/wiki/Active_Animal_Companion)

### Druidic Tending

- **Type:** Passive
- **Max rank:** 2
- **Flags:** Main class skill
- **Rank 2:** Equipping this skill does not take up a Skill Pool slot.

The Druid's Invigoration & Quickness spells become effective on their own Druid Plants. These spells grant the same type of Tending, which enhances the plant permanently; see plant descriptions for details.

But, Invigoration & Quickness gain a 1 round CD, and can only affect a number of your plants per single cast equal to the skill's Rank.

##### Druid Plants

Druids are knowledgeable in special natural magic rituals that manipulate or grow plants. They have several skills that plant magical saplings at certain locations.

Each sapling has a Growth Stage and a Growth Period.

• Growth Stage - Starts at 0, and increases by 1 at the start of a new round. Certain Druid skills can accelerate this, listed as 'apply Growth X', where X is a number. Growth 1, for example, increases Growth Stage by 1.

• Growth Period - When the plant's Growth Stage reaches this value, it will Bloom.

Generally, saplings have no effect until they bloom. Once they do, they may trigger a Bloom effect (only once) and may have other additional effects, for example those that apply when a new round happens.

After blooming, these plants can also be attacked and destroyed, and most have 20 HP, letting them survive 2 attacks. However, plants created by these effects typically only last 10 rounds, unless prolonged by another effect.

[Wiki page](https://sl2.miraheze.org/wiki/Druidic_Tending)

### Nutrient Brighten

- **Type:** Passive
- **Max rank:** 2
- **Rank 2:** Equipping this skill does not take up a Skill Pool slot.

Magically induced photosynthesis is not normally effective, but these are not normal plants.

Upon using Brighten, any Druid Plants in its target area which do not already have a Light Shaft atop them receive Growth 1.

[Wiki page](https://sl2.miraheze.org/wiki/Nutrient_Brighten)

### Predator and Prey

- **Type:** Passive
- **Max rank:** 2
- **Rank 2:** Equipping this skill does not take up a Skill Pool slot.

One hunts, the other feeds. Animal Companion skills (including Calls), Wild Shape skills, and basic attacks of Animal Companions (and you in Wild Shapeshift), gain a Vampiric (10%) effect. Your Dhessence spell recovers twice as much HP.

In exchange, you have -15 Status Resistance VS Hunted, and the LV of Hunted applied to you increases by 5.

[Wiki page](https://sl2.miraheze.org/wiki/Predator_and_Prey)

### Still Shape

- **Type:** Passive _(wiki: Passive (Hidden))_
- **Max rank:** 1

Does not cost SP to equip. While equipped, Wild Shape skills will not change your appearance.

##### Wild Shapeshift

The Druid has the ability to use Wild Shape skills to Wild Shapeshift into various animal forms, changing their appearance and giving them access to certain skills while in that form.

While in a Wild Shape, you cannot cast spells, your race changes to match that of your new form (changing your base stats), and you gain access to a special basic attack, as well as certain skills (similar to those possessed by an Animal Companion). If those skills reference Rank, they are treated as max Rank (3) instead of whatever your Animal Companion skill's rank would be, as you are using the skill as an animal, not a companion.

You can change from one animal form into another without changing back. You can also use End Wild Shape, a 0M skill, to exit your form. However, bear in mind that End Wild Shape has a 1 round CD, so you will be stuck in your Wild Shape should you use it and then transform again. In battle, you will remain in your chosen Wild Shape until you transform again or end it manually.

You cannot use Wild Shape while you are Installed with a Youkai, and attempting to install a Youkai while in Wild Shape will fail.

#### RP Precautions

If you want to use this in your RP, please keep the following in mind:

Druids that are in Wild Shape appear to be animals, but their presence is easy to notice and it is obvious to anyone on sight that they are not a normal animal (excluding brief glances, or the dimwitted). This form requires concentration to maintain, and can be kept for 1 hour concurrently at most, after which the Druid will require rest equal to the amount of time spent shapeshifting before the ability can be used again. Using Wild Shape to shift between forms, or briefly revert to a humanoid form, is treated as one continuous 'use'.

Animals are incapable of speech and therefore cannot talk in a way that is understandable, hence why they cannot cast spells.

You cannot partially Wild Shape yourself; you must take on (or revert from) the full form of the animal. IE, you can't use this ability to grow animal ears or tails, you can't turn only your head into a snake's, and so on.

[Wiki page](https://sl2.miraheze.org/wiki/Still_Shape)

### Command Nature

- **Type:** Innate
- **Max rank:** 1

The Druid is skilled in commanding the forces of nature, and at times, earning their loyalty.

Plant and Beast enemies can be converted by your Convert skill without being Calmed first. Furthermore, any attempts to Convert one of those races gain a +10% success rate bonus.

[Wiki page](https://sl2.miraheze.org/wiki/Command_Nature)

### Lone Wolves

- **Type:** Innate
- **Max rank:** 1

You work better alone, and so does your animal companion. But you work better alone together.

While you have only one Animal Companion skill in your Skill Pool, the CD of its skills (including Calls) are reduced by 1 round (min. 1). Furthermore, when it is summoned, the Animal Companion's level is increased by 10.

[Wiki page](https://sl2.miraheze.org/wiki/Lone_Wolves)

### Nature's Conduit

- **Type:** Innate
- **Max rank:** 3

Serving as a conduit through which nature flows, you can use any weapon made of a Wood material as a casting tool for Nature, Isespian, and Sylphid spells.

Additionally, when you use Pray, all allied Saplings within X Range (X = Rank) receive Growth 2.

[Wiki page](https://sl2.miraheze.org/wiki/Nature's_Conduit)
