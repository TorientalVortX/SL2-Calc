# Action economy and rotation constraints

Research snapshot: 2026-08-04.

## Shapeshifter corrections confirmed by the maintainer, 2026-10-13

These direct player confirmations supersede earlier uncertainty in the build
research; they have not been independently reproduced in a gameplay session.

- Generic damaging Youkai evokes use **250% of the actual user's relevant
  elemental ATK**, with the equipped weapon supplying Hit. The September 16
  confirmation is also recorded in `tandem-summoning-user-confirmed.md`.
  Preserve explicit basic-attack and status-only exceptions.
- Glancing hits **cannot** trigger Bloody Shift. Each Chaos Onslaught hit has
  its own critical chance; Onslaught uses the currently equipped weapon.
  With one hit plus one per active appendage, evaluate the chance of at least
  one qualifying critical rather than assuming a proc or using one roll for
  the entire attack. The maintainer subsequently confirmed that the total damage
  coefficient is divided across the hits, including Chaos Onslaught. Flat-armor
  application order remains a separate question.
- Kerberos's Triple Bite (Shift Strike) takes **SWA from the equipped weapon**,
  but uses the Youkai weapon's unenchanted, unmodified accuracy and critical
  properties: **80% base Accuracy and normal Fist base critical statistics**.
  All three hits can critically hit. The maintainer explicitly confirmed that
  **100% total SWA is split three ways**, not 100% SWA per hit. Preserve applicable
  character bonuses and Shift Strike's rank-based Critical bonus; do not copy
  the held weapon's accuracy/critical upgrades, parts or enchantment into the
  form weapon. The ordinary Fist reference uses 0 base Critical and 105% base
  Critical Damage. These confirmations do not specify flat-armor order.
- Wild Mana Crystals restore **10% FP on spawning and on round start** to units
  within **one tile**. Overlapping crystals can each restore FP. Grow
  Appendage's Mystic Crystal effect grants +10 all elemental ATK and creates a
  two-round Wild Mana Crystal within one tile at the start of a new round.
  Track individual crystals, proximity, creation/expiry and FP overflow. Do not
  count a spawned crystal immediately when first casting Grow Appendage, or
  assume a newborn receives a second same-boundary tick without confirming
  event order.

## General Momentum rules

Maintainer confirmations, 2026-10-19 (SS/Shinobi option B): Salamander Sword's Power gain triggers on **each Fire-damage tick**, including separate hits/ticks rather than only once per action. The item belt can hold **only one extra weapon**. For a sword build using Shuriken Wrap, count at most one belted Shuriken; do not turn additional belt-item slots into additional Shuriken. This confirms trigger granularity, not whether Power gained mid-action changes later hits' snapshotted damage.

Maintainer correction, 2026-10-19: Mage elemental enchantments such as **Galren, Kraken, Nerhaven, Redgull, and Talvyd are mutually exclusive**. Evaluate one active enchantment at a time; do not combine their stat or elemental-ATK bonuses. Auto-Enchant selects one opening enchantment, not a stack. The Redtail Elementalist benchmark excludes all of them, with Kraken proposed as the default opening choice.

Maintainer confirmation, 2026-10-13: Shapeshifter has **5 base Move**;
subclass Move does not stack with it. Explicit effects such as First Move and
Shukuchi still apply. The **initial Move action costs 3 Momentum**. Keep the
movement distance per action separate from its Momentum cost and from separate
paid displacement skills such as Falcon Arc.

The maintainer also confirmed **diamond (Manhattan) distance for range and
movement**: distance is `abs(dx) + abs(dy)`. Moving one tile across and one up
costs two Move, not one. Generic range areas should not use Chebyshev squares.
Respect any separately specified skill-area shapes. The 12-by-12 research
battlefield's `(2,2)` to `(11,11)` opening separation is therefore 18 tiles.

Source: community [Momentum page](https://sl2.fandom.com/wiki/Momentum). Confidence: `community`, current-looking but not independently tested.

- Default characters receive 7 Momentum (M) per round.
- Most actions cost 3M on their first use in a round.
- Repeating the same action in a round increases its Momentum cost by 1M each time: a base 3M action becomes 3M, then 4M, then 5M.
- Repeated actions also receive a compounding +50% FP-cost step: 100%, 150%, 200%, 250%, and so forth.
- A qualifying critical can grant +1M once per round. Different main-/sub-hand weapons may qualify separately; Duelist's Fleur can alter this behavior.
- Exploiting an elemental weakness can grant +1M; triggering enemy resistance can remove 1M. Exact per-action/per-source limits require verification.
- Stun, Knockdown, racial effects, class skills, and field effects can change available Momentum.

## Known class-resource examples

These are routing evidence, not full rotation formulas.

- Ghost: Blood Magic and several defensive tools can spend maximum-HP percentages; low HP can also activate Rising Game and Ether Invitation behavior. Model both payoff and death risk. Source: local historical class guide and community [Ghost page](https://sl2.fandom.com/wiki/Ghost). Confidence: `community`.
- Monk: Ki must be generated and spent; Power Up trades tempo for resources, and Ki Awoken trades ongoing HP for stat power. Source: community [Monk page](https://sl2.fandom.com/wiki/Monk). Confidence: `community`.
- Magic Gunner: shells depend on successful basic attacks. Overcharge is described as 3M/25 FP and causes two rounds of Reloading after the next successful shot; Cooldown can shorten Reloading. Source: community [Overcharge](https://sl2.fandom.com/wiki/Overcharge) and [Cooldown](https://sl2.fandom.com/wiki/Cooldown) pages. Confidence: `community`.
- Shapeshifter: transformation/mimicry effects can consume maximum-HP percentages. Meld Form is described as 3M/5 FP, 5% maximum HP, and a two-round cooldown. Source: community [Meld Form page](https://sl2.fandom.com/wiki/Meld_Form). Confidence: `community`.
- Kensei: stance upkeep and combo ordering matter. Absolute Death is described as 0M/5 FP to activate and 15 FP each round; Kensei offensive skills gain combo effects only in specified sequences. Source: community [Absolute Death](https://sl2.fandom.com/wiki/Absolute_Death) and [Kensei Combos](https://sl2.fandom.com/wiki/Kensei_Combos). Confidence: `community`.
- Spellthief: copied spells reportedly have minimum cooldowns and a limited equipped selection; exact spell inventory is part of the build, not a generic class bonus. Source: community [Spellthief page](https://sl2.fandom.com/wiki/Spellthief). Confidence: `community`.
- Bonder: Youkai count, bond/friendship, summon/install state, and Youkai training determine whether class passives function. Source: community [Bonder page](https://sl2.fandom.com/wiki/Bonder). Confidence: `community`.

## Per-skill record needed for exact rotations

- Rank and skill-point cost.
- Main-class-only behavior and inheritance rules.
- Category/tags, weapon/casting-tool requirements, damage type, and element.
- Momentum, FP, HP, and class-resource costs.
- Range, targeting shape, movement, hit check, critical eligibility, and Evasion interaction.
- SWA/elemental/stat scaling with exact order and rounding.
- Cooldown, duration, charges, once-per-round limits, and repeat-action behavior.
- Buff/debuff formula, infliction check, immunity, cleanse, and counterplay.
- Reliable uptime in the intended rotation.



### Numa ? user-confirmed tooltip, 2026-10-19
Curse of Numa LV30 lasts two rounds and loses HP equal to LV on each new round. When it ends, Boon level is (number of equipped Cursed/Doomed items + 10), doubled in Fog. It also grants Summon: Rotean Bog. Boon has permanent duration, grants unconditional STR equal to LV, Hit versus Trapped in Sludge equal to LV (25% against Muddy), and HP regeneration equal to half LV. User explicitly confirmed that only Hit is target-conditional. Boon LV decreases by remaining Momentum on End Turn, and each new round by equipped Cursed/Doomed item count (max six; max two with Black-Forged Pact). With zero such items, no Fog and no unused Momentum it remains LV10. Do not assume a +30 Boon from the LV30 curse. Bog's action costs and application reliability remain unverified; no Hit bonus is credited without target status.


### Furinkazan access correction ? user-confirmed 2026-10-19
Furinkazan is MAIN CLASS ONLY despite missing flags in the local skill transcription. SS/Shinobi cannot use it without Undeniable Innovator. Prior imports learning Furinkazan without the trait are not proof of access; do not count marks or Elemental Arts for them. Undeniable Innovator requires80 base APT (race + invested, not equipment), allows subclass main-class skills, and sets Skill Pool maximum99 per trait description. Current calculator does not implement the99 pool override or enforce this missing Furinkazan access flag. The new innovator import qualifies with80 investedAPT and the trait; Die Hard removed because its baseVIT prerequisite fails. Weathered Body remains incompatible with the Gi's baseARM2+MARM7, even with Innovator.


### Six-Youkai revision and Nerifian correction ? 2026-10-19
User locks Asrai, Seiryuu, Suzaku, Lilu, Sazae-Oni, Terrasque; uses Pumpkin Lollipop and identifies screenshot shards as crystals. Screenshot45 shards maps to crystalCount45. Five White Spirits follows screenshot explanation15HP from spirits. User accepts combined Evade (128+29=157); do not demand150 in the earlier display component alone. Akihono Tobitoro AND Kokuhaku Kagedan explicitly have Domain=Nerifian in skills-text.json extras. Earlier statements implying no confirmed Gi trigger after dropping Fire Elemental were incorrect. These spells support the Gi trigger; same-action buff ordering remains unverified. New six-contract Redtail build funds5FAI, includes80APT Innovator, Windheart Chimera bands, Winged Souji, HMC and Numa. No old100damage target imposed by this revision.


### Calculator correction batch completed ? 2026-10-20
Supersedes the earlier Innovator pool limitation: evaluateBuild now reports99 for Undeniable Innovator. Numa item slider (equipment.itemRolls['Numa:0:0']) models current Boon STR as a post-softcap item status, default0; active export uses20 and clears manualSTR. Sludge/Muddy Hit and HP regeneration remain descriptive, not unconditional Hit/maxHP. Slider UI range0..100 is an input range, not a sourced game cap. Full Swing/Steady resolve automatically from weapon type, weight/subtype and no shield/offhand; learned talent rank overrides legacy grip field. Full Swing adds SWA, not printedPower. Classic primary results use full build evaluation. FP source list explains323 vs screenshot283:25Depth and15Redthread material FP are real added contributions. Full suite734 tests passes, typecheck and production build/data validation pass. Corrected/cold exports regenerated and roundtripped;240points, six contracts,99pool,847HP in Asrai active state. No new live-game or battle-simulation verification.
