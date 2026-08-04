# Core mechanics: calculator model and public comparison

Research snapshot: 2026-08-04. This document distinguishes tested calculator behavior from claims about the live game. A formula marked `calculator-verified` is verified against this repository's code/tests, not necessarily against the current game server.

## Source hierarchy

1. Current in-game descriptions and controlled tests: authoritative when version and conditions are recorded.
2. Official developer announcements: authoritative for the version they describe.
3. Calculator code and validated JSON: authoritative for what the optimizer currently computes.
4. Current community wiki: useful evidence, but version-sensitive and sometimes internally inconsistent.
5. Historical files under `reference/` and `SL2BuildInfo.docx`: planning evidence only.

## Allocation and stat pipeline

Source: `src/domain/buildEvaluation.ts`, `src/domain/calculations.ts`, and `src/data/content/rules.json`. Confidence: `calculator-verified`.

- Point budget is `character level × 4`; level 60 therefore provides 240 allocated points.
- The calculator prevents allocated racial/custom/pre-cap totals from exceeding 80 for a stat.
- Monoclass builds apply a ×2 modifier to class stat bonuses.
- Scaled APT is calculated before its bonus is applied to other stats.
- Each complete 6 scaled APT grants +1 bonus stat to all 11 non-APT stats.
- APT-derived stats are bonus stats, not base stats. The local stat record specifically warns that they do not satisfy base-stat trait requirements and that effects such as Burn can negate APT-derived DEF.

The current diminishing-return implementation uses a soft cap of `racial base + 40 + Dragon bonus`. Above the soft cap, each successive three-point band has multipliers `0.90, 0.82, 0.74, 0.66, ...`, with a floor of `0.10`. The optimizer must evaluate the exact function and must not approximate it with a flat cost.

APT policy:

- Search complete APT breakpoints as bundled decisions; never prune the zero-value intermediate points before evaluating the global payoff.
- Compare the next breakpoint's invested cost with its +11 raw-stat return and the sum of its actual scaled gains after diminishing returns.
- Preserve a breakpoint whose effective scaled-stat return covers its point cost unless doing so worsens a hard user constraint.
- Never leave invested APT stranded above the retained breakpoint.

The [community stat page](https://sl2.fandom.com/wiki/Stat) agrees on four distributable points per level, 240 at default level 60, and +1 to other stats per 6 APT. It disagrees with local/current descriptions on several secondary stat effects, so it is not executable evidence by itself.

## Modeled derived statistics

Source: `src/domain/buildEvaluation.ts` and `src/domain/derivedCalculations.ts`. Confidence: `calculator-verified`.

| Result | Current calculator formula |
| --- | --- |
| Physical defense | `floor(0.9 × scaled DEF)%` |
| Magical defense | `floor(0.9 × scaled RES)%` |
| Evade | `floor(2 × scaled CEL) + base Evade + capped bonus Evade + torso Evade + enabled torso conditional Evade − Giant Gene penalty` |
| Bonus Evade cap | At most +50 from the calculator's configured bonus-Evade field |
| Critical Evade | `floor(scaled FAI + scaled LUC)` |
| Status Infliction | `floor(2 × scaled SKI + scaled WIL)` |
| Status Resistance | `floor(2 × scaled SAN + scaled FAI)` |
| Flanking | `floor(5 + scaled GUI / 2)` |
| Skill Pool | `11 + floor(GUI/5) + floor(SKI/5) + floor(WIL/10) + 2 if Human` |
| Battle Weight capacity | `floor(scaled STR) + 5` |
| Current modeled load | evaluated primary weapon Weight + torso Weight only |
| Encumbrance | `floor(scaled STR + scaled VIT) + 5`, plus modeled racial adjustments |
| Youkai cap | `floor(base FAI / 5) + 5` |

The community pages for [Status Infliction](https://sl2.fandom.com/wiki/Status_Infliction) and [Status Resistance](https://sl2.fandom.com/wiki/Status_Resistance) corroborate `2×SKI + WIL` and `2×SAN + FAI`, with success described as Infliction minus Resistance, bounded from 0% to 100%. Individual skills may use different formulas and therefore require their own records.

The [community Evade page](https://sl2.fandom.com/wiki/Evade) corroborates a +50 cap for ordinary active/passive Evade bonuses and says base-Evade modifications are outside that cap. It describes hit chance as `attacker Hit − defender Evade`, but its glancing-blow wording is not precise enough for deterministic probability modeling. Controlled testing is required.

## HP and FP as currently calculated

Confidence: `calculator-verified`; live-game equivalence remains `uncertain`.

Before racial/trait multipliers and explicit custom/equipment values, the calculator uses:

- HP contributions: `floor(10×scaled VIT) + floor(2×scaled SAN) + 3×base STR contribution + allocated points spent`.
- FP contributions: `floor(5×scaled WIL) + floor(2×scaled SAN) + floor(3×scaled FAI)`.
- Homunculi, Lich, Giant Gene, Fortitude, Pain Tolerance, Warwalk, Endurance, Power of Normalcy, food, history, and torso bonuses are then applied according to their configured controls.

The historical `reference/SL2_Calculations_and_Stats_Summary.txt` mentions a flat HP/FP base that is not present in the extracted helper formula. This discrepancy is in the verification backlog and must not be hidden.

## Elemental attack and resistance

Confidence: `calculator-verified`.

- Fire/STR, Ice/SKI, Wind/CEL, Earth/DEF, Dark/RES, Water/VIT, Light/FAI, Lightning/LUC, Acid/GUI, and Sound/SAN are the primary mappings.
- Unless Luminary replaces the behavior, WIL adds `floor(WIL/4)` to elements other than Sound and Acid.
- SAN adds `floor(SAN/6)%` resistance to the eight common elements, excluding Sound and Acid.
- Race, astrology, torso, and manual adjustments can add further values.

## Weapon combat as currently calculated

Source: `src/domain/weaponCalculation.ts`. Confidence: `calculator-verified`.

- Hit displayed by the weapon calculator is `floor(2×SKI) + final weapon Accuracy`.
- Critical chance is `final weapon Critical + floor(SKI/2) + floor(LUC)`, plus configured extras.
- A weapon with primary STR scaling receives additional weapon Critical equal to `floor(0.4 × STR scaling contribution)`.
- Critical-damage modifier is base weapon Critical Damage + `floor(GUI)` + enchantment modifier.
- The weapon calculator's present `swa` output equals its final Power field. Full live-game SWA skill/spell modeling is not yet implemented.

The community [Critical page](https://sl2.fandom.com/wiki/Critical) corroborates `weapon Critical + SKI/2 + LUC + modifiers`. The community [Damage page](https://sl2.fandom.com/wiki/Damage) describes basic attacks as SWA, non-spells as a percentage of SWA, and spells as combinations of tome Power, SWA scaling, and elemental-ATK scaling. Exact rounding and order of operations remain unverified.

## Protection and armor

The calculator separately exposes percentage Physical/Magical Defense and flat torso Armor/Magic Armor. The community [Protection page](https://sl2.fandom.com/wiki/Protection) says percentage reductions stack multiplicatively and flat Armor/Magic Armor is applied afterward. It distinguishes:

- Ordinary physical/magical damage: relevant percentage mitigation, then relevant flat armor.
- Armor-ignoring damage: ignores flat Armor/Magic Armor but still uses DEF/RES mitigation.
- Protection-ignoring damage: ignores both percentage and flat protection.

Confidence: `community` until reproduced in controlled current-version tests. The calculator does not yet compute incoming damage through this complete pipeline.

The community [Evasion page](https://sl2.fandom.com/wiki/Evasion) says qualifying autohit/magic instances can receive Evasion damage reduction when Evade exceeds 90% of attacker Hit, with 30% reduction for Unarmored/no torso, 15% for Light Armor, and 0% for Heavy Armor. This is version-sensitive and is not yet modeled.

## Battle Weight

The community [Battle Weight page](https://sl2.fandom.com/wiki/Battle_Weight) defines load as main weapon + torso + sub-weapon and says every point over capacity applies −2 Hit and −2 Evade. The calculator currently evaluates only primary weapon + torso and treats remaining weight as a feasibility report; it does not apply overweight penalties. Therefore every result is a partial load validation until sub-weapons are modeled.

## Unmodeled mechanics

Do not invent numerical output for:

- Complete skill damage, healing, cooldown, range, tags, or special formulas.
- Full Hit/Evade/glancing probability and Great Accuracy behavior.
- Complete incoming-damage order, resistance rounding, Evasion, parries, guards, and barriers.
- Off-hand, hands, footwear, accessories, item belt, materials on armor, set bonuses, and most item effects.
- Traits, talents, prayer, skill-point allocation, equipped-skill costs, and casting-tool legality beyond configured data.
- Initiative/turn-order ties, field objects, movement/pathing, team positioning, and opponent AI.
- Buff/debuff uptime or conditional effects not explicitly verified for the target rotation.

