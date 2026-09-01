---
title: "Tactician — Skills"
class: "Tactician"
skill_count: "27"
source: "https://sl2.miraheze.org/wiki/Tactician"
scraped: "2026-08-11"
confidence: "strong"
---
# Tactician — Skills

Every skill the wiki lists for **Tactician**, with its cost and scaling values.
Slash-separated numbers are per rank, rank 1 first.

## Quick reference

| Skill | Type | Max Rank | FP (per rank) | Momentum | Range | Power | Cooldown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Arcane Formation](#arcane-formation) | Formation | 1 | 10 | 3 | Left/Right/Center (Wider) - 5 range | -- | — |
| [Acid Rain](#acid-rain) | Offensive | 3 | 26/24/22 | 3 | 4 | 90/100/110% Acid ATK + 100% Scaled WPN ATK | 2 Rounds |
| [Assault Order](#assault-order) | Offensive | 3 | 16/14/12 | 3 | Allies | -- | — |
| [Attack Formation](#attack-formation) | Offensive | 1 | 10 | 3 | 5 | -- | — |
| [Dark Eye](#dark-eye) | Offensive | 3 | 26/24/22 | 3 | 3 | 150/175/200% Darkness ATK + 40/45/50% Scaled WPN ATK | — |
| [Domino Resonate](#domino-resonate) | Offensive | 3 | 31/29/27 | 3 | 1 | 120/135/150% Sound ATK + 100% Scaled WPN ATK | 3 Rounds |
| [Fire Whip](#fire-whip) | Offensive | 3 | 28/27/26 | 3 | 6 | 110/125/140% Fire ATK + 100% Scaled WPN ATK | — |
| [Frigid Formation](#frigid-formation) | Offensive | 3 | 26/24/22 | 3 | — | 150/175/200% Ice ATK + 100% Scaled WPN ATK | 3 turns |
| [Pinpoint Electro](#pinpoint-electro) | Offensive | 3 | 26/24/22 | 3 | 5 | 100/110/120% Lightning ATK + 100% Scaled WPN ATK | — |
| [Sacred Prism](#sacred-prism) | Offensive | 3 | 26/24/22 | 3 | 1 | 110/125/140% Light ATK + 100% Scaled WPN ATK | — |
| [Splash](#splash) | Offensive | 3 | 17/13/9 | 1 | 6 | 8/9/10% Water ATK + 8/9/10% Scaled WPN ATK | 1 Round |
| [Titan Gale](#titan-gale) | Offensive | 3 | 24/26/28 | 3 | 6 | 100/110/120% Wind ATK + 100% Scaled WPN ATK | — |
| [White Prison](#white-prison) | Offensive | 3 | 26/24/22 | 3 | 3 | 100/110/120% Earth ATK + 40/45/50% Scaled WPN ATK | 3 |
| [Bunker Formation](#bunker-formation) | Defensive | 1 | 10 | 3 | 5 | -- | — |
| [Guard Order](#guard-order) | Defensive | 3 | 16/14/12 | 3 | Allies | -- | — |
| [Analyze Weakness](#analyze-weakness) | Support | 5 | 30/28/26/24/22 | 6 | 3 | -- | — |
| [Cast Order](#cast-order) | Support | 3 | 16/14/12 | 3 | All Allies | -- | — |
| [Field Medic](#field-medic) | Support | 3 | 22/20/18 | 3 | 1 | -- | 2 |
| [Charge Order](#charge-order) | Utility | 3 | 16/14/12 | 3 | All Allies | -- | — |
| [Enemy Evaluation](#enemy-evaluation) | Utility | 5 | 30/28/26/24/22 | 6 | 3 | -- | — |
| [Volley Formation](#volley-formation) | Utility | 1 | 10 | 3 | 5 | -- | — |
| [Dualpower](#dualpower) | Passive | 2 | — | — | — | — | — |
| [On My Mark](#on-my-mark) | Passive | 2 | — | — | Self | — | — |
| [According to Plan](#according-to-plan) | Innate | 5 | — | — | — | — | — |
| [Always Learning](#always-learning) | Innate | 3 | — | — | — | — | — |
| [Performance Rating](#performance-rating) | Innate | 1 | — | — | Self | — | — |
| [Timely Withdraw](#timely-withdraw) | Innate | 1 | — | — | — | — | — |

## Skills

### Arcane Formation

- **Type:** Formation
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 3
- **Range:** Left/Right/Center (Wider) - 5 range
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **FP Reduction / Incant Protection:** 25%

Tactical Formation skill. Create a magical formation at a location within 5 range, which reduces FP costs for spells, and chance of invocations being broken for allies inside of it, for 3 rounds.

Range increased by 1 per 15 Scaled GUI. Duration increased by 1 round if a tome is equipped.

[Wiki page](https://sl2.miraheze.org/wiki/Arcane_Formation)

### Acid Rain

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 26/24/22
- **Momentum:** 3
- **Range:** 4
- **Power:** 90/100/110% Acid ATK + 100% Scaled WPN ATK
- **Target:** Circle (2)
- **Cooldown:** 2 Rounds
- **Flags:** Location
- **Domain:** Isespian

Rains acid down on a 2 Range circle of enemies within 5 Range, dealing Acid magic damage that ignores evasion to them. It also reduces their Phys. and Mag. Defense by X (X = 1+3*Rank%) for 3 rounds. For each enemy that is weak to Acid, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Acid_Rain)

### Assault Order

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 16/14/12
- **Momentum:** 3
- **Range:** Allies
- **Power:** --
- **Target:** All Allies/Single
- **Flags:** Ally Only
- **Damage Bonus:** 15/20/25
- **At Rank 3::** If you have a Tome equipped, the bonus damage is increased by it's power, OR 50% of scaled GUI.

Tactical Order skill. Order all allies to attack this turn, boosting their next attack's damage based on Rank + Tactics Rank.

[Wiki page](https://sl2.miraheze.org/wiki/Assault_Order)

### Attack Formation

- **Type:** Offensive
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Semi-Diamond
- **Flags:** Ally Only
- **Hit Bonus (per):** 25

Tactical Formation skill. Create an offensive formation at a location within 5 range, which boosts the Hit of Allies inside of it, for 3 rounds.

Range increased by 1 per 15 scaled GUI. Duration increased by 1 round if Tome is equipped.

[Wiki page](https://sl2.miraheze.org/wiki/Attack_Formation)

### Dark Eye

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 26/24/22
- **Momentum:** 3
- **Range:** 3
- **Power:** 150/175/200% Darkness ATK + 40/45/50% Scaled WPN ATK
- **Target:** Spread Triangle (1-6)
- **Flags:** Location
- **Domain:** Huggessoan

Target 3 separate tiles in a triangle pattern that can be sized. At each target location, you summon a Dark Eye. Dark Eyes have a self-detonate skill that marks enemies with Dark Eye and deals Dark magic damage to them (if they do not already have Dark Eye). Enemies marked by Dark Eye will be affected by your Analyze Weakness and Enemy Evaluation skill when it's used on any enemy, regardless of range, and increase its effect by 50%. (This skill can only be used if you do not have Dark Eyes active.)

[Wiki page](https://sl2.miraheze.org/wiki/Dark_Eye)

### Domino Resonate

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 31/29/27
- **Momentum:** 3
- **Range:** 1
- **Power:** 120/135/150% Sound ATK + 100% Scaled WPN ATK
- **Target:** Single
- **Cooldown:** 3 Rounds
- **Flags:** Enemy Only
- **Domain:** Nature

Targets 1 enemy within 1 Range and deals Sound magic damage to them. The damaged enemy will also be knocked 1 + Rank tiles away in a cardinal direction, and then knocked down. If they encounter any other enemies while being knocked back, the effect will also apply to the enemy, and so on. If an enemy is weak to Sound, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Domino_Resonate)

### Fire Whip

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 28/27/26
- **Momentum:** 3
- **Range:** 6
- **Power:** 110/125/140% Fire ATK + 100% Scaled WPN ATK
- **Target:** Single
- **Flags:** Enemy Only
- **Domain:** Nerifian

Targets 1 enemy within 6 Range and deals Fire magic damage to them, based on Rank, and has a chance to inflict Hesitation LV X (X = Rank*5, plus 10). If the enemy is weak to Fire, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Fire_Whip)

### Frigid Formation

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 26/24/22
- **Momentum:** 3
- **Power:** 150/175/200% Ice ATK + 100% Scaled WPN ATK
- **Target:** Single
- **Cooldown:** 3 turns
- **Flags:** Enemy Only
- **Domain:** Aquarian

Targets all tiles your party currently has formation tiles on. All enemies in those tiles take Ice magic damage that ignores evasion. For each enemy that is weak to Ice, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Frigid_Formation)

### Pinpoint Electro

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 26/24/22
- **Momentum:** 3
- **Range:** 5
- **Power:** 100/110/120% Lightning ATK + 100% Scaled WPN ATK
- **Target:** Single
- **Flags:** Location
- **Domain:** Nature

Targets a single tile within 5 Range, as well as all tiles that enemy units which your Analyze Weakness and Enemy Evaluation skills are affecting (regardless of Range). Enemies in those tiles take Lightning magic damage. For each enemy that is weak to Lightning, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Pinpoint_Electro)

### Sacred Prism

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 26/24/22
- **Momentum:** 3
- **Range:** 1
- **Power:** 110/125/140% Light ATK + 100% Scaled WPN ATK
- **Target:** Single
- **Flags:** Location
- **Domain:** Mercalan

Targets all tiles within 1 Range of yourself, and all allies. All enemies in those tiles take Light magic damage (each enemy can only be damaged once). All allies also gain X% Dark Resistance (X = 5+Rank*5) until your next turn. For each enemy that is weak to Light, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Sacred_Prism)

### Splash

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 17/13/9
- **Momentum:** 1
- **Range:** 6
- **Power:** 8/9/10% Water ATK + 8/9/10% Scaled WPN ATK
- **Target:** Single
- **Cooldown:** 1 Round
- **Flags:** Enemy Only
- **Domain:** Aquarian

Targets 1 enemy within 6 Range and inflicts Water magic damage to them, which inflicts Soaked on them for 5 + Tactics Rank rounds. Soaked enemies will cause Lightning damage taken by them to jump to adjacent allies who are also Soaked. If the enemy is weak to Water, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Splash)

### Titan Gale

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 24/26/28
- **Momentum:** 3
- **Range:** 6
- **Power:** 100/110/120% Wind ATK + 100% Scaled WPN ATK
- **Target:** Single
- **Flags:** Enemy Only
- **Domain:** Sylphid

Launches a spinning wind blade projectile up to 6 Range away, dealing Wind magic damage to the first enemy it hits. They will also be inflicted with Titan Ghost LV X (X = Wind ATK) for 10 rounds. (Titan Ghost transfers upon the unit being defeated, which refreshes its duration to 5 rounds. After doing so at least once, if the person with the status is an ally, it increases their Scaled Weapon Power by LV.) If the enemy is weak to Wind, your Tactics Rank increases by 1 level.

[Wiki page](https://sl2.miraheze.org/wiki/Titan_Gale)

### White Prison

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 26/24/22
- **Momentum:** 3
- **Range:** 3
- **Power:** 100/110/120% Earth ATK + 40/45/50% Scaled WPN ATK
- **Target:** Line (Horizontal) (3-6)
- **Cooldown:** 3
- **Flags:** Location
- **Domain:** Isespian

Summons a 3-6 Range horizontal line of walls up to 3 Range away, for 3 + Tactics Rank rounds. The walls can be attacked to destroy them (+10 HP if enchanted with Galren). Any enemies in the target location will be pushed away and take Earth magic damage. For each enemy that is weak to Earth, your Tactics Rank increases by 1 level.

If at Tactics Rank A, cooldown is reduced 1 round. If at SSS, it is further reduced by 1 round.

[Wiki page](https://sl2.miraheze.org/wiki/White_Prison)

### Bunker Formation

- **Type:** Defensive
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Horizontal Line
- **Flags:** Ally Only
- **Armor/Magic Armor Bonus:** +5

Tactical Formation skill. Create a defensive formation at a location within 5 Range, which boosts the Armor and Magic Armor of allies inside of it, for 3 rounds.

Range increases by 1 per Scaled GUI, Duration increased by 1 round if a tome is equipped.

[Wiki page](https://sl2.miraheze.org/wiki/Bunker_Formation)

### Guard Order

- **Type:** Defensive
- **Max rank:** 3
- **FP cost:** 16/14/12
- **Momentum:** 3
- **Range:** Allies
- **Power:** --
- **Target:** All Allies/Single
- **Flags:** Ally Only
- **Hit Points Recovery:** 15/20/25
- **At Rank 3::** If you have a Tome equipped, the HP Recovery is increased by it's power, or 50% of Scaled GUI.

Tactical Order skill. Order allies to protect themselves this turn, granting them access to the Guard Skill. Allies who guard will recover HP based on Rank + Tactic Ranks.

[Wiki page](https://sl2.miraheze.org/wiki/Guard_Order)

### Analyze Weakness

- **Type:** Support
- **Max rank:** 5
- **FP cost:** 30/28/26/24/22
- **Momentum:** 6
- **Range:** 3
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **Damage Increase:** +(10 + Tactics Rank + Skill Rank)%
- **At Rank 3::** Range increased by 1 if a Tome is equipped.

The simplest way to win, in any scenario where victory is a possibility, is to exploit your enemy's weakness, and step one is to actually learn what it is. Targets an enemy within 3 Range and Analyzes them. You can only Analyze one enemy at a time. When Analyzed, the enemy will suffer increased damage from all party members. The duration of Analyze is (1+ Tactic Ranks) rounds. If your Tactics Rank A or better, you will also call out all of that enemy's elemental weaknesses, if any exist.

[Wiki page](https://sl2.miraheze.org/wiki/Analyze_Weakness)

### Cast Order

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 16/14/12
- **Momentum:** 3
- **Range:** All Allies
- **Power:** --
- **Target:** All Allies/Single
- **Flags:** Ally Only
- **Increase Spell Damage:** +15/20/25

Tactical Order Skill. Order all allies to utilize spells, boosting their next Offensive Category spell's damage based on Rank+Tactic Rank.

Rank 3+: Damage is further boosted by an equipped tome's power, or 50% of scaled GUI (whichever is higher.)

[Wiki page](https://sl2.miraheze.org/wiki/Cast_Order)

### Field Medic

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 22/20/18
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Cooldown:** 2
- **Flags:** Ally Only
- **Base Heal:** +30/40/50
- **At Rank 3::** Can now revive incapacitated allies.
- **Trickery:** Removes one debuff caused by an enemy.

Sometimes, there is no time to move someone to a safer location; They need treatment then and there. Target 1 ally within 1 range (or yourself), restoring HP based on rank, plus (Tactic Rank * 2)% of the target's max HP.

[Wiki page](https://sl2.miraheze.org/wiki/Field_Medic)

### Charge Order

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 16/14/12
- **Momentum:** 3
- **Range:** All Allies
- **Power:** --
- **Target:** All Allies/Single
- **Flags:** Ally Only
- **Move Bonus:** 3/4/5
- **At Rank 3::** If you have a Tome equipped or 30 scaled GUI, allies who end their Movement within 1 range of an enemy inflict Fear on them for 2 rounds.

Tactical Order skill. You give an order to all allies to charge, increasing their next Move based on Rank + (Tactics Rank/2).

[Wiki page](https://sl2.miraheze.org/wiki/Charge_Order)

### Enemy Evaluation

- **Type:** Utility
- **Max rank:** 5
- **FP cost:** 30/28/26/24/22
- **Momentum:** 6
- **Range:** 3
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **At Rank 3::** Range increased by 1 if a Tome is equipped.

Knowing your enemy is more important than knowing yourself. You perform an evaluation on a target enemy within 3 Range. The evaluation's effectiveness is based on Skill Rank and your Tactics Rank. Evaluated enemies suffer a penalty to Hit, Evade, Critical, and damage they deal (equal to 10+Tactics Rank+Skill Rank%). The duration of the evaluation is equal to 1 + Tactics Rank rounds. (If you are defeated, the evaluation immediately ends.).

[Wiki page](https://sl2.miraheze.org/wiki/Enemy_Evaluation)

### Volley Formation

- **Type:** Utility
- **Max rank:** 1
- **FP cost:** 10
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Left, Right, and Center
- **Flags:** Ally Only
- **Range Bonus:** +5
- **Critical Bonus (per):** +25

Tactical Formation skill. Create a ranged formation at a location within 5 range. Which boosts the attack range (and range before Farshot penalty applies), and critical of ranged weapons for allies inside of it for 3 rounds.

Range increased by 1 per scaled GUI. Duration increased by 1 round if a tome is equipped.

[Wiki page](https://sl2.miraheze.org/wiki/Volley_Formation)

### Dualpower

- **Type:** Passive
- **Max rank:** 2
- **At Rank 2::** Equipping this skill does not take up a Skill point slot.

Toggle skill. Sometimes power doesn't need to be raw. It is far more effective if it is tempered by experience. While toggled on, increases the STR scaling of Tomes by 10%, and the WIL scaling of Swords by 10%.

[Wiki page](https://sl2.miraheze.org/wiki/Dualpower)

### On My Mark

- **Type:** Passive
- **Max rank:** 2
- **Range:** Self
- **Flags:** Main class skill
- **At Rank 2::** Equipping this skill does not take up a Skill point slot.

Give your allies the boost they need by giving them orders to follow. At the start of a battle, automatically applies your first Order skill you have equipped. Additionally, increase the duration of your order skills by 1 round (they still only apply once).

[Wiki page](https://sl2.miraheze.org/wiki/On_My_Mark)

### According to Plan

- **Type:** Innate
- **Max rank:** 5
- **Focus Points Restored::** +2/4/6/8/10

The book just isn't for show. It holds detailed reports of a number of battles, information about the types of soil various places have, and other such valuable information. It also shoots out magic, which a lot of people don't expect. Taking advantage of that will restore your Focus Points based on Rank when you hit an enemy with a Tome weapon attack. The bonus is also increased based on your Tactics Rank.

[Wiki page](https://sl2.miraheze.org/wiki/According_To_Plan)

### Always Learning

- **Type:** Innate
- **Max rank:** 3
- **WIL/GUI:** +1/2/3

Both victories and defeats are important to learn from. For victories, you can learn strengths, and from defeats. You can learn flaws. The Tactician knows this well and passes that onto his allies. Increasing Experience Point gains for them by 10%.

Additionally, passively increases your WIL and GUI, based on Rank.

[Wiki page](https://sl2.miraheze.org/wiki/Always_Learning)

### Performance Rating

- **Type:** Innate
- **Max rank:** 1
- **Range:** Self
- **Rank 1::** If you do not learn this skill, your Tactics Rank will be stuck at D.

Tacticians are only as good as their tactics. In battle, a gauge will appear in the bottom left, displaying a ranking from D to SSS, known as your Tactics Rank. Some Tactician skills will be influenced by your Tactics Rank. Your Tactics Rank increases in different ways when you use Tactician skills. It will be reset to D if an ally is reduced to 0 HP. It will also drop by 1 level every time you take damage (as long as that damage is greater than 5% of your maximum HP).

[Wiki page](https://sl2.miraheze.org/wiki/Performance_Rating)

### Timely Withdraw

- **Type:** Innate
- **Max rank:** 1

Sometimes it's best to know when to go. A retreat is a much less costly strategic move than a defeat. When escaping from battle, the success rate is increased by 20% for every player character's HP that is below 25%. If at Tactics Rank S or higher, the success rate becomes 100%.

[Wiki page](https://sl2.miraheze.org/wiki/Timely_Withdraw)
