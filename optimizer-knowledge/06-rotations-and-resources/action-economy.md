# Action economy and rotation constraints

Research snapshot: 2026-08-04.

## General Momentum rules

Source: community [Momentum page](https://sl2.fandom.com/wiki/Momentum). Confidence: `community`, current-looking but not independently tested.

- Default characters receive 7 Momentum (M) per round.
- Most actions cost 3M on their first use in a round.
- Repeating the same action in a round increases its Momentum cost by 1M each time: a base 3M action becomes 3M, then 4M, then 5M.
- Repeated actions also receive a compounding +50% FP-cost step: 100%, 150%, 200%, 250%, and so forth.
- A qualifying critical can grant +1M once per round. Different main-/sub-hand weapons may qualify separately; Duelist's Fleur can alter this behavior.
- Exploiting an elemental weakness can grant +1M; triggering enemy resistance can remove 1M. Exact per-action/per-source limits require verification.
- Stun, Knockdown, racial effects, class skills, and field effects can change available Momentum.

## Optimizer implications

Until exact skill records exist, rotation quality must be reported separately from stat quality.

For each candidate, eventually evaluate:

1. Setup cost before the build becomes effective.
2. Damage, healing, control, or protection delivered per Momentum.
3. FP and HP spent per round, including repeat-action multipliers.
4. Cooldown gaps and the actions available during them.
5. Probability of receiving critical/weakness Momentum under the expected opponent.
6. Movement Momentum and whether the required position is realistically reachable.
7. Whether the rotation is still functional when its primary condition, status, summon, or field tile fails.

Do not treat a high one-action damage number as the best rotation when it consumes setup, a whole round, unsustainable FP, or a limited class resource.

## Known class-resource examples

These are routing evidence, not full rotation formulas.

- Ghost: Blood Magic and several defensive tools can spend maximum-HP percentages; low HP can also activate Rising Game and Ether Invitation behavior. Model both payoff and death risk. Source: local historical class guide and community [Ghost page](https://sl2.fandom.com/wiki/Ghost). Confidence: `community`.
- Monk: Ki must be generated and spent; Power Up trades tempo for resources, and Ki Awoken trades ongoing HP for stat power. Source: community [Monk page](https://sl2.fandom.com/wiki/Monk). Confidence: `community`.
- Magic Gunner: shells depend on successful basic attacks. Overcharge is described as 3M/25 FP and causes two rounds of Reloading after the next successful shot; Cooldown can shorten Reloading. Source: community [Overcharge](https://sl2.fandom.com/wiki/Overcharge) and [Cooldown](https://sl2.fandom.com/wiki/Cooldown) pages. Confidence: `community`.
- Shapeshifter: transformation/mimicry effects can consume maximum-HP percentages. Meld Form is described as 3M/5 FP, 5% maximum HP, and a two-round cooldown. Source: community [Meld Form page](https://sl2.fandom.com/wiki/Meld_Form). Confidence: `community`.
- Kensei: stance upkeep and combo ordering matter. Absolute Death is described as 0M/5 FP to activate and 15 FP each round; Kensei offensive skills gain combo effects only in specified sequences. Source: community [Absolute Death](https://sl2.fandom.com/wiki/Absolute_Death) and [Kensei Combos](https://sl2.fandom.com/wiki/Kensei_Combos). Confidence: `community`.
- Spellthief: copied spells reportedly have minimum cooldowns and a limited equipped selection; exact spell inventory is part of the build, not a generic class bonus. Source: community [Spellthief page](https://sl2.fandom.com/wiki/Spellthief). Confidence: `community`.
- Bonder: Youkai count, bond/friendship, summon/install state, and Youkai training determine whether class passives function. Source: community [Bonder page](https://sl2.fandom.com/wiki/Bonder). Confidence: `community`.

## Required per-skill record before exact rotation optimization

- Rank and skill-point cost.
- Main-class-only behavior and inheritance rules.
- Category/tags, weapon/casting-tool requirements, damage type, and element.
- Momentum, FP, HP, and class-resource costs.
- Range, targeting shape, movement, hit check, critical eligibility, and Evasion interaction.
- SWA/elemental/stat scaling with exact order and rounding.
- Cooldown, duration, charges, once-per-round limits, and repeat-action behavior.
- Buff/debuff formula, infliction check, immunity, cleanse, and counterplay.
- Reliable uptime in the intended rotation.

