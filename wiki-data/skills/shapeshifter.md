---
title: "Shapeshifter — Skills"
class: "Shapeshifter"
skill_count: "25"
source: "https://sl2.miraheze.org/wiki/Shapeshifter"
scraped: "2026-08-11"
confidence: "strong"
---
# Shapeshifter — Skills

Every skill the wiki lists for **Shapeshifter**, with its cost and scaling values.
Slash-separated numbers are per rank, rank 1 first.

## Quick reference

| Skill | Type | Max Rank | FP (per rank) | Momentum | Range | Power | Cooldown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Chaos Onslaught](#chaos-onslaught) | Offensive | 3 | 15 | 3 | 5 | 50/75/100% Elemental ATK + 50/75/100% Scaled Weapon ATK | — |
| [Shift Strike](#shift-strike) | Offensive | 5 | 15 | 3 | 1 | -- | — |
| [Grow Appendage](#grow-appendage) | Defensive | 3 | 15 | 3 | Self | -- | — |
| [Chimera Install](#chimera-install) | Support | 3 | 5 | 3 | 5 | -- | 3 Rounds |
| [Meld Form](#meld-form) | Support | 3 | 5 | 3 | 5 | -- | 2 Rounds |
| [Split Form](#split-form) | Support | 3 | 5 | 3 | — | -- | 2 Rounds |
| [Avian Glide](#avian-glide) | Utility | 1 | 10 | 1 | — | -- | — |
| [Beast Gait](#beast-gait) | Utility | 1 | 10 | 1 | — | -- | — |
| [Dragon Strength](#dragon-strength) | Utility | 1 | 10 | 1 | — | -- | — |
| [Fairy Trick](#fairy-trick) | Utility | 1 | 10 | 1 | — | -- | — |
| [Mystic Magic](#mystic-magic) | Utility | 1 | 10 | 1 | — | -- | — |
| [Night Shade](#night-shade) | Utility | 1 | 10 | 1 | — | -- | — |
| [Plant Rejuvenate](#plant-rejuvenate) | Utility | 1 | 10 | — | — | -- | — |
| [Alteration Fixation](#alteration-fixation) | Passive | 3 | — | — | — | — | — |
| [Bloody Shift](#bloody-shift) | Passive | 1 | — | — | — | — | — |
| [Chaotic Form](#chaotic-form) | Passive | 1 | — | — | — | — | — |
| [Dripping Dimension](#dripping-dimension) | Passive | 1 | — | — | — | — | — |
| [Mirror Mimickry](#mirror-mimickry) | Passive | 1 | — | — | — | — | — |
| [Normalize Form](#normalize-form) | Passive | 1 | — | — | — | — | — |
| [Preservation Instinct](#preservation-instinct) | Passive | 1 | — | — | — | — | — |
| [Self-Destructive Shifting](#self-destructive-shifting) | Passive | 1 | — | — | — | — | — |
| [Vague Shift](#vague-shift) | Passive | 1 | — | — | — | — | — |
| [Chaos Reflex](#chaos-reflex) | Innate | 3 | — | — | — | — | — |
| [Install Element Boost](#install-element-boost) | Innate | 3 | — | — | — | — | — |
| [Natural Evoke](#natural-evoke) | Innate | 3 | — | — | — | — | — |

## Skills

### Chaos Onslaught

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 15
- **Momentum:** 3
- **Range:** 5
- **Power:** 50/75/100% Elemental ATK + 50/75/100% Scaled Weapon ATK
- **Target:** Single
- **Flags:** Enemy Only
- **Domain:** Varying upon Form

Costs 1% of your maximum HP. Can only be used if you are Installed with a Youkai. Burst a target within 5 Range with a strange energy, dealing magic damage to them (based on Rank; any weapon can use this skill) based on the element of the installed Youkai, which can critically hit. If it does, it triggers Bloody Shift.

Damage is dealt in a number of hits equal to 1 + 1 per Grow Appendage.

[Wiki page](https://sl2.miraheze.org/wiki/Chaos_Onslaught)

### Shift Strike

- **Type:** Offensive
- **Max rank:** 5
- **FP cost:** 15
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **Critical Bonus:** 5/10/15/20/25

Costs 1% of your maximum HP. Can only be used if you are Installed with a Youkai. Making use of your shifted form, you perform a basic attack with a weapon unique to your Installed Youkai, which gains bonus Critical (based on Rank).

The special weapon's scaling tags are identical to your main hand weapon's, but it may have unique effects.

| Youkai | Weapon Name | Weapon Type | Damage Type | Special Attack |
| --- | --- | --- | --- | --- |
| Apus | Celestial Shot | Gun | Pierce | 5 Range, On Hit: Deals magic Light bonus damage equal to 50% of your Light ATK, which ignores armor. |
| Asrai | Water Splash | Tome | Water | 4 Range, On Hit: Inflict Soaked for 3 Rounds. |
| Byakko | Tiger Claw | Fist | Slash | 1 Range, 15% Critical Chance, 80% Accuracy, On Hit: Inflicts Reduced Resistance (Lightning) LV 15 for 2 rounds. |
| Carbuncle | Lucky Crystal | Tome | Earth | 5 Range, On Critical Hit: Reduces the duration of a random negative status effect caused by an enemy by 2 rounds. |
| Chun | Fire Fang | Dagger | Pierce | 1 Range, On Critical Hit: Inflict Burn (LV 10) for 3 Rounds |
| Drowned Woman | Blue Cloth | Fist | Blunt | 1 Range, On Hit: Inflicts Reduced Resistance (Water) LV 15 for 2 Rounds. |
| Firefox | Flame Breaker | Sword | Slash | 1 Range, On Hit: Inflicts Reduced Resistance (Fire) LV 15 for 2 rounds. |
| Haku | Ice Fang | Dagger | Pierce | 1 Range, On Critical Hit: Inflict Frostbite (LV 20) for 3 Rounds |
| Hatsu | Poison Fang | Dagger | Pierce | 1 Range, On Critical Hit: Inflict Poison (LV 5) for 3 Rounds |
| Hippogriph | Hoof Strike | Fist | Blunt | On Hit: Knockbacks 2 tiles. |
| Izabe | Spear of Light | Polearm | Pierce | On Hit: Inflicts Reduced Resistance (Light) LV 15 for 2 Rounds. |
| Jack o' Lantern | Gourd Smash | Axe | Slash | 1 Range, 65% Accuracy, On Hit: The enemy is seeded until their next turn. If they take Water damage while seeded, the seed erupts into vines, inflicting Immobilize on them until your next turn. |
| Kilkenny | Beast Kill Claw | Fist | Slash | On Hit: Inflicts Hunted LV14 for 3 rounds if the target is a Beast. |
| Lilu | Love-Hate Bat | Axe | Slash | 1 Range, On Critical Hit: Inflict Charm LV 15 for 2 Rounds. |
| Orbello | Lich's Bane | Sword | Slash | 1 Range, On Hit: Inflicts Hunted LV14 for 3 rounds if the target is a Lich. On Critical Hit: Steals 100% of target's FP. (Max: 15 FP) |
| Phase Phyton | Swift Strike | Bow | Blunt | 5 Range, On Hit: If the tile behind you is a valid battle tile, teleport to it. |
| Sazae-Oni | Oni Snip | Fist | Pierce | 1 Range, 125% Critical Damage, On Critical Hit: Inflict Lingering Damage LV 10 for 8 Rounds. |
| Seiryuu | Wind Bite | Polearm | Pierce | 1 Range, Pierce Damage, On Hit: Deals magic Wind bonus damage equal to 50% of your Wind ATK, which ignores armor |
| Snow Crow | Frozen Feathers | Bow | Blunt | 1 Range, On Hit: Deals magic Ice bonus damage equal to 50% of your Ice ATK, which ignores armor. |
| Terrasque | Flash Cannon | Gun | Pierce | 6 Range, On Critical Hit: Inflict Blind for 2 Rounds. |
| Vampiric Legume | Drain Root | Sword | Slash | 1 Range, On Hit: Vampiric (20%) |
| Wawa | Dark Bop | Fist | Blunt | On Hit: Inflicts Reduced Resistance (Dark) LV 15 for 2 rounds. |
| Yukionna | Deep Chill | Polearm | Pierce | 1 Range, On Hit: Inflicts Reduced Resistance (Ice) LV 15 for 2 rounds. |
| Wind Elemental | Wind Blade | Sword | Slash | 1 Range, On Hit: Deals magic Wind Bonus damage equal to 50% of your Wind ATK.. |
| Fire Elemental | Flame Arc | Axe | Slash | 1 Range. On Hit: Deals magic Fire Bonus damage equal to 50% of your Fire ATK. |
| Kerberos | Triple Bite | Fist | Pierce | 1 Range, Attacks 3 times. |

[Wiki page](https://sl2.miraheze.org/wiki/Shift_Strike)

### Grow Appendage

- **Type:** Defensive
- **Max rank:** 3
- **FP cost:** 15
- **Momentum:** 3
- **Range:** Self
- **Power:** --
- **Target:** Single
- **Flags:** Self Only
- **Duration:** 3/4/5

Mimickry skill. Costs 1% of your maximum HP, and can only be used if you are Installed with a Youkai. You gain an appendage of your installed Youkai's race, which can give a variety of benefits, and extends all other effects from Grow Appendage by 1 round (2 if monoclassing). The effect's duration varies based on Rank.

If Bloody Shift was triggered this round, this skill costs 1 less Momentum to use.

| Youkai | Ability Name | Effect Level | Effect |
| --- | --- | --- | --- |
| Avian | Avian Feathers | 10 | Mimickry. Treated as having the skill 'Flight', and you do not trigger field tiles by moving over them. +LV% Wind Resistance. |
| Beast | Beast Claws | 8 | Increases Critical by LV*2 and grants Armor Penetration equal to LV. |
| Dragon | Dragon Scales | 5 | Increases Armor and Magic Armor by LV. Reduces critical damage taken by levelx2% |
| Night | Night Eyes | 15 | Increases Hit and Status Inflict by LV. At the start of a new round, you attempt to inflict Charm LV 15 (3 rounds) on all enemies within 3 Range of you. |
| Fairy | Fairy Dust | 15 | Increases Evade and Status Resist by LV. When you evade an attack or trigger evasion, you step away 1 tile from the attacker (this counts as an Evasive Reaction skill and will not stack with others). |
| Mystic | Mystic Crystal | 10 | Boosts all Elemental ATK by LV. Creates a Wild Mana Crystal (2 rounds) at a tile within 1 Range of you at the start of a new round. |
| Plant | Plant Vines | 15 or SS Level | Grants access to the Vine Pull skill. On New Round: Vines deal protection-ignoring bonus Blunt damage equal to LV to a random enemy within 2 Range. |

[Wiki page](https://sl2.miraheze.org/wiki/Grow_Appendage)

### Chimera Install

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Ally Only
- **Cooldown:** 3 Rounds
- **Flags:** Ally Only
- **Heal Rate:** 25/30/35% Max HP

Can only be used if you are Installed with a Youkai. Targets 1 of your summoned Youkai (who is not Installed with a Youkai) within 5 Range and installs them with your Installed Youkai, restoring their HP by X% of their maximum HP (based on Rank) and giving them Chimera Install for 5 rounds. You gain Lockout for the Youkai you transferred for 3 rounds, which prevents you from summoning them.

[Wiki page](https://sl2.miraheze.org/wiki/Chimera_Install)

### Meld Form

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Ally Only
- **Cooldown:** 2 Rounds
- **Flags:** Ally Only

Costs 5% of your maximum HP. Targets one of your summoned Youkai at a tile within 5 Range. You merge your form with theirs, teleporting to that tile, unsummoning the Youkai, triggering Chaotic Form with them, and gaining any beneficial status effects they have (excluding those you have).

[Wiki page](https://sl2.miraheze.org/wiki/Meld_Form)

### Split Form

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 5
- **Momentum:** 3
- **Power:** --
- **Target:** Location (3/4/5)
- **Cooldown:** 2 Rounds
- **Flags:** Ally Only

Costs 5% of your maximum HP, and can only be used while Installed with a Youkai. Split your installed Youkai from you and summon them to a target unoccupied location within X Range (based on Rank), increasing their Momentum to 3 (if possible). The split also causes your copiable, non-permanent beneficial status effects to have their duration halved, but the split Youkai will receive all of them as well.

[Wiki page](https://sl2.miraheze.org/wiki/Split_Form)

### Avian Glide

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Avian race. Quickly adjust the wind near you to become Airborne and glide in a 2 Range line (the last tile must be unoccupied).

[Wiki page](https://sl2.miraheze.org/wiki/Avian_Glide)

### Beast Gait

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Beast race. Move in an agile fashion along a darting line; all tiles in the way must be unoccupied.

[Wiki page](https://sl2.miraheze.org/wiki/Beast_Gait)

### Dragon Strength

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Dragon race. Infuse yourself with a divine Draconic energy, increasing your Critical by 15 and Critical Damage by 15% for 2 rounds.

[Wiki page](https://sl2.miraheze.org/wiki/Dragon_Strength)

### Fairy Trick

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Fairy race. Hide you and target Ally within 6 Range with fairy dust. When the dust clears, the two of you will have swapped locations.

[Wiki page](https://sl2.miraheze.org/wiki/Fairy_Trick)

### Mystic Magic

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Mystic race. Channel ancient arcane mysteries to boost the Scaled Weapon Attack of your next Offensive category Spell (or Youkai Evoke Spell) by 30 (expires afterwards, 5 rounds duration).

[Wiki page](https://sl2.miraheze.org/wiki/Mystic_Magic)

### Night Shade

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Night race. You and all other Night allies coat yourselves in a veil of darkness, increasing your Evade by 25 for 2 attacks, 5 rounds. For each other ally affected, the number of attacks the effect lasts for increases by 1.

[Wiki page](https://sl2.miraheze.org/wiki/Night_Shade)

### Plant Rejuvenate

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Power:** --
- **Target:** Single
- **Flags:** Self Only

Mimickry skill. Costs 1% of your maximum HP, can only be used by the Plant race. Use the focus around you to trigger a rapid regeneration, healing you for 2% of your maximum HP and reducing the duration of a random negative status effect caused by an enemy by 2 rounds. If no such effects exist, the HP recovery is doubled instead.

[Wiki page](https://sl2.miraheze.org/wiki/Plant_Rejuvenate)

### Alteration Fixation

- **Type:** Passive
- **Max rank:** 3
- **Transformation Effect Duration Increase:** +1/2/3

Your interest in changing things, namely yourself, leads you to perfect the art as much as you can.

Transformation effects (including Install) have increased duration based on Rank.

[Wiki page](https://sl2.miraheze.org/wiki/Alteration_Fixation)

### Bloody Shift

- **Type:** Passive
- **Max rank:** 1

Take the lead by going for full offense, regardless of the cost.

Upon scoring a critical hit with a basic attack, you gain Bloody Shift for 1 round. Bloody Shift decreases the Momentum cost of Youkai Evoke skills by 1, but makes them cost 1% of your maximum HP when used. (This effect does not stack.)

[Wiki page](https://sl2.miraheze.org/wiki/Bloody_Shift)

### Chaotic Form

- **Type:** Passive
- **Max rank:** 1

Shapeshifting is a dangerous art, but the one the Shapeshifter is known for. Requires Install to be in your skill pool. After you use the Evoke skill of a Youkai you do not have Installed, you Install them (any active Install effects will be replaced). Secondly, while you have a Youkai Installed, your form changes to match theirs.

[Wiki page](https://sl2.miraheze.org/wiki/Chaotic_Form)

### Dripping Dimension

- **Type:** Passive
- **Max rank:** 1
- **Level:** 5/10/15

Your chaotic installing causes even the environment to change.

Triggering Chaotic Form will cause you to create a special effect tile at all tiles within 1 Range of you for 2 rounds (LV X, based on Rank), based on the element of the Youkai that was just Installed (only applies at the time you are Installed).

| Elements | Tile Type | Effects |
| --- | --- | --- |
| Acid | Acid Pools | Deal poison damage to all enemy units who walk through by LV. |
| Dark | Dark Cinders | Similar to Cinders, however inflict Dark Damage instead of Fire. |
| Earth | Tall Grass | Boost Evade by 10% for any unit within the tile. |
| Fire | Cinders | Deal fire damage to all enemy units who walk through by LV. |
| Ice | Ice Sheets | Slow down movement on enemy units who walk through. |
| Light | Light Shafts | Decrease the hit of those who stand within by LV. |
| Lightning | Smokescreen | Decrease the hit of those who stand within by LV. Obscures "sight" aka Double Click to examine. |
| Water | Dark Water | Enemy units that stand within these tiles will have FAI reduced to 0 on their next turn. |
| Wind | Air Shafts | All units within the tiles are now Airborne. |

[Wiki page](https://sl2.miraheze.org/wiki/Dripping_Dimension)

### Mirror Mimickry

- **Type:** Passive
- **Max rank:** 1

When using Split Form, effects gained by Mimickry skills are not halved in duration.

[Wiki page](https://sl2.miraheze.org/wiki/Mirror_Mimickry)

### Normalize Form

- **Type:** Passive
- **Max rank:** 1

Regaining your physical senses can lead to a more stable body, but it makes you more predictable. At the start of a new round, if Chaos Reflex is active, its LV will be reduced by 8, and you will recover 1% of your maximum HP.

[Wiki page](https://sl2.miraheze.org/wiki/Normalize_Form)

### Preservation Instinct

- **Type:** Passive
- **Max rank:** 1
- **Flags:** Main class skill

You are skilled at avoiding the risks involved with this dangerous art.

HP costs associated with Shapeshifter skills and effects are halved. If Shapeshifter is both your Main Class and Sub Class, they are instead negated. (Has no effect when used with Self-Destructive Shifting.)

[Wiki page](https://sl2.miraheze.org/wiki/Preservation_Instinct)

### Self-Destructive Shifting

- **Type:** Passive
- **Max rank:** 1
- **Flags:** Main class skill

Who cares about consequences?

HP costs associated with Shapeshifter skills and effects are increased by 50%, but their cool downs are decreased by 1 round. If Shapeshifter is both your Main Class and Sub Class, HP costs are instead increased by 100%, and their cool downs are instead decreased by 2 rounds.

[Wiki page](https://sl2.miraheze.org/wiki/Self-Destructive_Shifting)

### Vague Shift

- **Type:** Passive
- **Max rank:** 1

Does not cost SP to equip. While equipped, Chaotic Form will not change your appearance.

[Wiki page](https://sl2.miraheze.org/wiki/Vague_Shift)

### Chaos Reflex

- **Type:** Innate
- **Max rank:** 3
- **Max LV:** 24/32/40%

Constant shifting makes your form hard to predict, and when you're hard to predict, you're hard to hit.

When you trigger Chaotic Form, you gain or power up a status called Chaos Reflex LV 8 for 3 rounds (Max LV based on Rank/5 rounds max). Chaos Reflex increases your Evade by LV, but will end at the start of a round you are not Installed with a Youkai.

[Wiki page](https://sl2.miraheze.org/wiki/Chaos_Reflex)

### Install Element Boost

- **Type:** Innate
- **Max rank:** 3
- **Elem ATK:** +3/4/5

Natural affinity with your Youkai increases your elemental powers. When installed with a Youkai, increases the Elemental ATK of the element associated with that Youkai by X (based on Rank).

[Wiki page](https://sl2.miraheze.org/wiki/Install_Element_Boost)

### Natural Evoke

- **Type:** Innate
- **Max rank:** 3
- **Reduction:** 10/20/30%

Honestly, if it didn't get any easier like this, you'd be worried. Reduces the FP cost of evoke skills of your currently installed youkai based on rank.

[Wiki page](https://sl2.miraheze.org/wiki/Natural_Evoke)
