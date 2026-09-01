---
title: "Spellthief — Skills"
class: "Spellthief"
skill_count: "25"
source: "https://sl2.miraheze.org/wiki/Spellthief"
scraped: "2026-08-11"
confidence: "strong"
---
# Spellthief — Skills

Every skill the wiki lists for **Spellthief**, with its cost and scaling values.
Slash-separated numbers are per rank, rank 1 first.

## Quick reference

| Skill | Type | Max Rank | FP (per rank) | Momentum | Range | Power | Cooldown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Final Flare](#final-flare) | Offensive | 3 | 30 | 6 | 1 | -- | — |
| [Flying Dagger](#flying-dagger) | Offensive | 5 | 10/9/8/7/6 | 1 | 1 | -- | — |
| [Goose Bite](#goose-bite) | Offensive | 5 | 20 | 3 | 1 | -- | — |
| [Hot Potato](#hot-potato) | Offensive | 5 | 10 | 3 | 3/4/5/6/7 | -- | — |
| [Mystic Dagger](#mystic-dagger) | Offensive | 3 | 10 | 3 | 1 | -- | — |
| [Snatch Spell](#snatch-spell) | Defensive | 5 | 30/25/20/15/10 | 3 | 1 | -- | — |
| [Distortion](#distortion) | Support | 3 | 30/28/26 | 3 | 6 | -- | — |
| [Blue Steal](#blue-steal) | Utility | 5 | 0 | 3 | 1 | -- | — |
| [Confusion](#confusion) | Utility | 3 | 30/25/20 | 3 | 7 | -- | — |
| [Create Shade](#create-shade) | Utility | 3 | 20/15/10 | — | 1 | -- | 3 |
| [Energy Laundering](#energy-laundering) | Utility | 5 | 0 | 3 | 1 | -- | — |
| [Invisible Weapon](#invisible-weapon) | Utility | 3 | 20/19/18 | 3 | 3 | -- | — |
| [Negotiate](#negotiate) | Utility | 5 | 15 | 3 | 5 | -- | — |
| [Smoke Screen](#smoke-screen) | Utility | 3 | 16/14/12 | 3 | 3 | -- | — |
| [Spell Snatch](#spell-snatch) | Utility | 5 | 0 | 3 | 1 | -- | — |
| [Bluff](#bluff) | Passive | 1 | — | — | — | — | — |
| [Margin Manipulation](#margin-manipulation) | Passive | 3 | — | — | — | — | — |
| [Mysterious](#mysterious) | Passive | 1 | — | — | — | — | — |
| [Shuffle](#shuffle) | Passive | 1 | — | — | — | — | — |
| [Tricky](#tricky) | Passive | 1 | — | — | — | — | — |
| [Free Focus](#free-focus) | Innate | 1 | — | — | — | — | — |
| [Overload Copy](#overload-copy) | Innate | 5 | — | — | — | — | — |
| [Sneak Attack](#sneak-attack) | Innate | 1 | — | — | — | — | — |
| [Thrillseeker](#thrillseeker) | Innate | 1 | — | — | — | — | — |
| [Versatile](#versatile) | Innate | 1 | — | — | — | — | — |

## Skills

### Final Flare

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 30
- **Momentum:** 6
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Restriction:** Dagger only
- **Flags:** Self Only
- **Spells:** 1/2/3 Spells

Dagger skill. Must have at least one non-Invocation Copy spell. Loads up your dagger with magical energy for 3 rounds. The next target you hit with a basic attack deals no damage, but instead releases up to Rank Copy Spells (excluding Invocations) on the target randomly. Spells cast this way deal only 75% damage and are lost after being cast (until the end of the battle).

After the magical energy is expended, or time runs out, your dagger explodes, reducing its durability to 0, knocking you back from the target by 7 tiles and knocking you down.

[Wiki page](https://sl2.miraheze.org/wiki/Final_Flare)

### Flying Dagger

- **Type:** Offensive
- **Max rank:** 5
- **FP cost:** 10/9/8/7/6
- **Momentum:** 1
- **Range:** 1
- **Power:** --
- **Target:** Line (3)
- **Restriction:** Dagger only
- **Flags:** Enemy Only

Dagger skill. Throw a barrage of daggers in a line, which will travel up to 3+Rank tiles away and inflict unresistable Piercing damage to the first enemy hit equal to Dagger Power + Rank. Can only be used once per turn.

[Wiki page](https://sl2.miraheze.org/wiki/Flying_Dagger)

### Goose Bite

- **Type:** Offensive
- **Max rank:** 5
- **FP cost:** 20
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Restriction:** Dagger only
- **Flags:** Enemy Only
- **Stat Reduction:** -1/2/3/4/5

Dagger skill. Dig your dagger into an enemy within 1 Range, dealing unresistable Pierce damage equal to Rank + Weapon Power. Afterwards, if you are behind the target, they suffer -X (X = Rank) to all stats for 3 rounds. (If you are not behind them, they suffer half of that instead.)

[Wiki page](https://sl2.miraheze.org/wiki/Goose_Bite)

### Hot Potato

- **Type:** Offensive
- **Max rank:** 5
- **FP cost:** 10
- **Momentum:** 3
- **Range:** 3/4/5/6/7
- **Power:** --
- **Target:** Single
- **Restriction:** Dagger only
- **Flags:** Location
- **Required:** Final Flare rank 1

Requires you to have Final Flare active. Unequips your dagger and tosses it to a nearby location up to X (based on Rank) Range away. At the start of the next round, it will explode, treating all units (friend or foe) as if they were hit by Final Flare (however spells cast do only 50% damage instead of 75%). Enemies who step onto the same location as the dagger will kick it 5 tiles away in the direction they are moving.

[Wiki page](https://sl2.miraheze.org/wiki/Hot_Potato)

### Mystic Dagger

- **Type:** Offensive
- **Max rank:** 3
- **FP cost:** 10
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Restriction:** Dagger only
- **Flags:** Enemy Only
- **2nd Hit Damage:** 40/50/60%

Attack an enemy within 1 Range with your dagger, dealing magic damage. If it misses, it will mystically attack again, dealing reduced damage, based on Rank.

[Wiki page](https://sl2.miraheze.org/wiki/Mystic_Dagger)

### Snatch Spell

- **Type:** Defensive
- **Max rank:** 5
- **FP cost:** 30/25/20/15/10
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only
- **Required:** Spell Snatch rank 1

Prepare to steal a spell. If you are targeted by an enemy spell which can be stolen before your next turn, you negate its casting and steal it as if you have Spell Snatched it.

[Wiki page](https://sl2.miraheze.org/wiki/Snatch_Spell)

### Distortion

- **Type:** Support
- **Max rank:** 3
- **FP cost:** 30/28/26
- **Momentum:** 3
- **Range:** 6
- **Power:** --
- **Target:** Single
- **Flags:** Ally or Self Only
- **Evade Bonus:** +10/15/20
- **Domain:** Mercalan

Illusion skill. Manipulates waves of light around a target ally within 6 Range for 5 rounds, increasing their Evade (based on Rank).

[Wiki page](https://sl2.miraheze.org/wiki/Distortion)

### Blue Steal

- **Type:** Utility
- **Max rank:** 5
- **FP cost:** 0
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **Steal Chance:** Scaled WIL + 10/20/30/40/50%

Give an enemy within 1 Range a stern and magical look and steal FP from them equal to 5 + (Rank*5) (or their current FP, whatever is lower). Requires a stat-based roll and is modified by bonuses to steal (and counts as stealing if successful). Can only be used once per round.

[Wiki page](https://sl2.miraheze.org/wiki/Blue_Steal)

### Confusion

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 30/25/20
- **Momentum:** 3
- **Range:** 7
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **Domain:** Sylphid

Illusion skill. Target 1 enemy within 7 Range and attempts to inflict them with Confusion for 3 Rounds.

[Wiki page](https://sl2.miraheze.org/wiki/Confusion)

### Create Shade

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 20/15/10
- **Range:** 1
- **Power:** --
- **Target:** Spread Triangle (1-4)
- **Cooldown:** 3
- **Flags:** Location
- **Domain:** Sylphid

Illusion spell. Targets 3 separate tiles in a triangle pattern that can be sized. At each target location, you create a shade and hide yourself as one. Shades are illusions and have 1 HP, and at the start of your next turn, they will vanish. However, enemies will not be able to examine shades and tell them apart from you, making them useful decoys, especially against monsters.

[Wiki page](https://sl2.miraheze.org/wiki/Create_Shade)

### Energy Laundering

- **Type:** Utility
- **Max rank:** 5
- **FP cost:** 0
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Self Only
- **Required:** Margin Manipulation rank 1
- **Multiplier:** 1.2x/1.4x/1.6x/1.8x/2.0x

Move your leeched energy through various legitimate businesses and right into your pocket.

Requires Leeched Energy. Ends your Leeched Energy status and restores FP equal to the LV* X (based on Rank).

[Wiki page](https://sl2.miraheze.org/wiki/Energy_Laundering)

### Invisible Weapon

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 20/19/18
- **Momentum:** 3
- **Range:** 3
- **Power:** --
- **Target:** Single
- **Flags:** Ally or Self Only
- **Evade Reduction:** -10/20/30
- **Domain:** Sylphid

Illusion skill. Wraps yours or an ally's weapon(s) in mystery, making them almost completely transparent. While under this effect, the target's weapon's identity will be hidden. Targets attacked by invisible weapons have reduced Evade based on Rank (if they have Blind Fighting, the effect is halved).

[Wiki page](https://sl2.miraheze.org/wiki/Invisible_Weapon)

### Negotiate

- **Type:** Utility
- **Max rank:** 5
- **FP cost:** 15
- **Momentum:** 3
- **Range:** 5
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **Max Times:** 1/2/3/4/5

Work out a mutually beneficial deal with one enemy within 5 Range. If both you and the target have a negative status effect caused by an enemy, you and the target are both cured of one of those effects randomly. Then, this effect is repeated up to Rank times, as long as the condition is met.

[Wiki page](https://sl2.miraheze.org/wiki/Negotiate)

### Smoke Screen

- **Type:** Utility
- **Max rank:** 3
- **FP cost:** 16/14/12
- **Momentum:** 3
- **Range:** 3
- **Power:** --
- **Target:** Single
- **Flags:** Location
- **Hit Penalty:** -10/20/30
- **Domain:** Sylphid

Illusion skill. Creates a harmless but obstructive 3-6 length horizontal line of smoke up to 3 Range away. The smoke cannot be seen through, and anyone standing in it suffers a penalty to Hit (based on Rank). The smoke screen will last up to 3 rounds, but if you cast this spell while a smoke screen is active, or if the smoke screen would be moved by an effect, it will disappear.

[Wiki page](https://sl2.miraheze.org/wiki/Smoke_Screen)

### Spell Snatch

- **Type:** Utility
- **Max rank:** 5
- **FP cost:** 0
- **Momentum:** 3
- **Range:** 1
- **Power:** --
- **Target:** Single
- **Flags:** Enemy Only
- **Steal Chance:** Scaled LUC + 10/20/30/40/50%

The trademark skill of the Spellthief. Targets 1 enemy within 1 Range and attempts to steal a spell from them. Bosses are immune. If successful, you steal the spell and add it to your skill pool as a Copy spell, and the target loses it.

Copy spells are lost if unequipped and do not take up any skill pool slots, but function normally otherwise. You can have a maximum of 1+Rank Copy spells (stealing another one while at max will remove the oldest). All Copy spells will be lost if you begin a battle without Spellthief as one of your classes.

[Wiki page](https://sl2.miraheze.org/wiki/Spell_Snatch)

### Bluff

- **Type:** Passive
- **Max rank:** 1

Do you feel lucky, punk?

Can only be used if you have an Invocation spell in your skill pool. When toggled on, when you use Snatch Spell, you will pretend to be invoking a random Invocation spell in your skill pool, which just might bait your enemy into casting a spell for you to steal. (Note: This will cause Snatch Spell to use up 6 Momentum to keep up the illusion.)

[Wiki page](https://sl2.miraheze.org/wiki/Bluff)

### Margin Manipulation

- **Type:** Passive
- **Max rank:** 3
- **Reduction:** 4/7/10%

They won't notice if a little is missing from the top, will they?

Damage taken from spells is reduced by 1+X% (X = Rank*3) and stored as Leeched Energy (max LV: 10*Rank) for up to 3 rounds. Offensive spells you cast have increased Power equal to the amount of Leeched Energy you have, but after inflicting damage with one, the status will end.

[Wiki page](https://sl2.miraheze.org/wiki/Margin_Manipulation)

### Mysterious

- **Type:** Passive
- **Max rank:** 1

A sense of mysterious destiny that makes someone unpredictable and unreadable. Hides your HP, FP, equipped skills, and status effects from others. Of course, since monsters aren't particularly interested in details, it won't do much against them.

[Wiki page](https://sl2.miraheze.org/wiki/Mysterious)

### Shuffle

- **Type:** Passive
- **Max rank:** 1

One of the most important parts of illusions are making them less obvious, which is easy enough with a shuffle of the deck. When toggled on, when you cast Create Shade, you switch places with one of the illusions at random.

[Wiki page](https://sl2.miraheze.org/wiki/Shuffle)

### Tricky

- **Type:** Passive
- **Max rank:** 1

Imagine the look of surprise on your enemy's face when there's suddenly three of you. When toggled on, at the start of a battle, if Create Shade is in your skill pool, you cast it for free.

[Wiki page](https://sl2.miraheze.org/wiki/Tricky)

### Free Focus

- **Type:** Innate
- **Max rank:** 1

Is there anything better than getting something for free? Every round, recover 2 FP for every positive status effect you have that was caused by an enemy.

[Wiki page](https://sl2.miraheze.org/wiki/Free_Focus)

### Overload Copy

- **Type:** Innate
- **Max rank:** 5
- **Bonus Power:** +2/4/6/8/10

Since it's not yours, you don't know its limits as well. Increases the Power of Copy spells by 2*Rank.

[Wiki page](https://sl2.miraheze.org/wiki/Overload_Copy)

### Sneak Attack

- **Type:** Innate
- **Max rank:** 1

They'll never see it coming. Damage dealt while you have Sneak active is increased by 10%.

[Wiki page](https://sl2.miraheze.org/wiki/Sneak_Attack)

### Thrillseeker

- **Type:** Innate
- **Max rank:** 1

The rush you get from stealing something is not an experience everyone gets. For those who do, however, it is a strong rush of adrenaline. When you successfully steal something from an enemy, you gain +2 to all stats for 2 rounds.

[Wiki page](https://sl2.miraheze.org/wiki/Thrillseeker)

### Versatile

- **Type:** Innate
- **Max rank:** 1

When you get your hands on a lot of completely legitimate items, you get interested in them. So much so that you effortlessly do what most mages can't, memorizing and mastering the art of magic through pure talent.

Spells do not take up skill pool slots.

[Wiki page](https://sl2.miraheze.org/wiki/Versatile)
