# Core mechanics: Hit vs Evade

Research snapshot: 2026-08-21. Confidence: `community-sheet` — transcribed from the
formulas of a community Hit/Evade calculator supplied by the maintainer, not from
the wiki (which states none of the ordering below) and not verified against a game
server. A local copy of the workbook is at
`reference/hitEvade/hit-evade-sheet.xlsx`; the numbers below are read out of its
cell formulas rather than its displayed values, so they are the model rather than
one worked example.

Source: <https://docs.google.com/spreadsheets/d/1cR6N16JRSH8yc8eyxuDPejBxagYLZ7vELpb2gUgE5U4>

## Constants

| Rule | Value |
| --- | --- |
| Hit per scaled SKI | 2 |
| Evade per scaled CEL | 2 |
| Hand Hit (one weapon only) | 5 |
| Legs Evade | 5 |
| Flanking base | 5 |
| Flanking per scaled GUI | 0.5 |
| Flanking applied per condition met | 50% of the Flanking stat |
| Honor Hit bonus (Chivalry Smite, 3/rank, 15 at max SR) | rank-dependent |
| Bonus Hit cap | 50 |
| Bonus Evade cap | 50 |
| Hit rate cap while Blind | 75 |
| Minimum Hit chance | 5 |
| Fear Hit penalty | 15, reduced by up to 48% by Bravery |
| Knocked Down Evade penalty | 12% Unarmored / 25% Light / 37% Heavy |

## Attacker Hit, in order

1. **Base Hit** = `2 × scaled SKI + weapon Hit + Base Hit Mod`, `+ 5` if wielding
   one weapon (nothing in the off-hand).
2. **Field modifier** = `field buffs − field debuffs`. Added to *base*, and
   explicitly **not** subject to the Bonus Hit cap. Only the strongest field
   penalty applies.
3. **Broken weapon**: `− half` the running total.
4. **Base multiplier** (default 100%). Close Shot is the stated use.
5. **Bonus Hit** = `min(50, runningTotal × bonusMulti + hitBuffs − hitDebuffs)`,
   then `− fearPenalty` when Feared by the target. Note the order: the bonus
   multiplier reads the *pre-bonus* total, so Bonus Hit never compounds on itself.
6. **Honor** = `min(50 − bonusHitAlreadySpent, frontalBonus)` on a frontal
   attack — paid out of whatever Bonus Hit headroom is left, not on top of the
   cap. `frontalBonus` is **Chivalry's Smite at the build's own rank** (3 Hit a
   rank, 15 at rank 5), not a flat 15: the workbook wrote the max-rank figure
   because it predates the wiki documenting talents, and its own table says
   "(max SR)". A build without the talent gets nothing here.
7. **Flanking** = `conditionsMet × 50% × (5 + 0.5 × scaled GUI)`. One condition is
   attacking from behind, or from the side while an ally is within 1 Range; two is
   from behind *and* an ally within 1 Range.

## Target Evade, in order

1. **Base Evade** = `2 × scaled CEL + armour Evade + Base Evade Mod + 5` (legs).
2. **Base multiplier** (default 100%). Thick Brush +10%, Thick Vines −10%, Guard
   −LV%, and Knocked Down applies its armour-type penalty here.
3. **Bonus Evade** = `min(50, baseEvade × bonusMulti + evadeBuffs − evadeDebuffs
   + fieldBuffs − fieldDebuffs)`. Unlike Hit, field effects on Evade *are* bonus
   modifiers and *do* stack into the cap.
4. **Total Evade** = base (post-multiplier) + Bonus Evade.

## Resolution

`hitChance = clamp(attackerHit − targetEvade)`, floored at 5 and capped at 75 when
the attacker is Blind. A miss rolls a second time for a glancing blow, so:

- at least one hit over `n` instances: `1 − (1 − p)ⁿ`
- at least one hit-or-glance: `1 − (1 − p)²ⁿ`
- all hit: `pⁿ`; all hit-or-glance: `(1 − (1 − p)²)ⁿ`
- "half or more" rows use the binomial CDF over `n` (hits) or `2n` (glances)

Damage instances are 2 for basic Fist attacks, and the number of rounds for Guns.

## Where the calculator currently stands

Implemented in `src/domain/hitEvade.ts`, whose tests reproduce the workbook's own
worked example end to end — base Hit 82, base Evade 7, and hit chances of
75 / 90 / 77.75 / 80.5 across the four positional tiers, plus its odds table. If
the ordering above drifts, those tests fail.

`calculator-verified` agreements with the sheet: Hit's `2 x scaled SKI + weapon
Hit`, Evade's `2 x scaled CEL`, the Flanking stat as `5 + floor(scaled GUI / 2)`,
and Hand Hit being gated on having no off-hand equipped. The calculator models
Hand Hit and Legs Evade as the actual upgrade spend rather than the sheet's flat
5, which assumes a fully-upgraded slot — finer-grained, and not a disagreement.

### Base versus bonus channel assignments

`evaluateBuild` splits both Hit and Evade into an uncapped base channel and a
bonus channel capped at 50, and reports each (`derived.evadeBase`,
`derived.evadeBonus`, `derived.hitBase`, `derived.hitBonusApplied`) along with
what the cap discards (`derived.evadeBonusWasted`, `derived.hitBonusWasted`).

The sheet names only a handful of sources directly, so the rest are assigned by
the principle it and the community Evade page share: an item's own printed
statline and anything that alters it is *base*; an effect or buff layered on top
is *bonus*. Assignments marked inferred are the ones worth challenging first if a
build's Evade reads wrong.

| Source | Channel | Basis |
| --- | --- | --- |
| `2 x scaled CEL` | base | sheet |
| Torso's printed Evade | base | sheet ("Armor Evade") |
| Torso upgrade points | base | wiki — Equipment Extras bypasses the cap |
| Legs upgrade points | base | sheet ("Legs Evade") |
| Manual Base Evade field | base | sheet ("Base Evade Mod") |
| Skill Evade (Dodger) | base | wiki — named as bypassing the cap |
| Armour material / enchantment | base | inferred — alters the item's statline |
| Hands / legs / accessory material and enchantment | base | inferred — same |
| Giant Gene's −10 | base | inferred — permanent, not a buff |
| Manual Bonus Evade field | bonus | sheet ("Evade Buffs") |
| Armour conditional effects | bonus | wiki — Sarashi Gi's +12 is its example |
| Gear item effects | bonus | wiki — same class of effect |
| Redtail fortune Evade | bonus | inferred — a rolled temporary effect |
| Youkai passive Evade | bonus | inferred — a passive buff |
| Weapon Accuracy, `2 x scaled SKI`, Hand Hit | base | sheet |
| Skill / item / fortune Hit | bonus | sheet ("Hit Buffs") |

### Ordering details the implementation commits to

- The bonus multiplier reads the pre-bonus total on both sides, so neither Bonus
  Hit nor Bonus Evade compounds on itself.
- Fear is subtracted **after** the Hit cap. Folding it in before would let a build
  with a large buff total absorb Fear for free, since the cap clips either way.
- Honor is `min(50 - bonusHitAlreadySpent, frontalBonus)` — a build at the cap
  gains nothing from a frontal attack, and a build without Smite has no frontal
  bonus to spend. Smite must **not** also enter the general Hit buff channel:
  that is one bonus, and counting it in both places gave a frontal attack the
  same 15 twice while also crediting it to the base and flanked tiers, where the
  attacker is by definition not in front of the target.
- Field Hit is base and uncapped; field Evade is bonus and capped. The asymmetry
  is the sheet's, not a transcription error.
- Knocked Down is a multiplier on base Evade, so it scales with how much Evade
  there was to lose, rather than a flat subtraction.

### Provenance

`evaluateBuild` reports `sources.hit` and `sources.evade` as itemised
`DerivedSource[]` — a label, a value, the channel it lands in, and the attribute it
reads when it is a stat term. Zero-valued sources are dropped, so a list is only as
long as the build makes it. A test holds the itemised sums against
`derived.hitBase` / `hitBonusSources` / `evadeBase` / `evadeBonus`, which is the
property that makes the breakdown worth showing: the named parts reconcile with
the figure being explained.

The aether readout card renders these under **Base sources** (uncapped) and
**Bonus sources** (capped at 50), plus the four positional Hit tiers, and states
what the cap is discarding. A bonus row shows only its own channel — listing base
sources under "Bonus Evade" would read as a claim that scaled CEL is part of Bonus
Evade.

### Bounds

`hitChance` is floored at 5, capped at 75 while Blind, and capped at 100 otherwise.
The 100 ceiling is a **deliberate divergence**: the workbook clamps only where it
converts a chance into a probability, so its Hit-versus-Evade cell can read 160
against a low-Evade target. That is a margin, not a chance. Callers show the raw
`Hit − Evade` beside the bounded figure, so nothing is lost.

Max HP and Max FP are floored at zero for the same reason — a large enough debuff or
manual override drove Max HP to about −3900, and every readout downstream reported a
nonsense quantity rather than a very fragile character.

### Positioning in the optimizer

The accuracy objective scores `hitTiers.base` — the Hit a build can always count on
— plus a credit for `hitTiers.flank2 - base`, scaled against 35 (a GUI-heavy build's
Flanking stat) and weighted at 0.15. Flanking depends on where the character is
standing, so at that weight it ranks a flanking build above an otherwise-equal one
without ever paying to give up guaranteed Hit. Same reasoning as
`INSTALL_UPSIDE_WEIGHT`.

### Still outstanding

- The multiplier and conditional channels are inputs on the Hit-chance screen
  only; nothing derives them from the build, so Guard, Thick Brush, Close Shot and
  Enemy Evaluation have to be entered by hand.
- The Hit-chance screen lives in the legacy shell. Aether has the provenance and
  tier display but no hit-chance panel yet; both shells get the cap and SWA
  corrections through `evaluateBuild`.
