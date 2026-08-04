# Controlled-test and data verification backlog

Research snapshot: 2026-08-04. This is the highest-value queue for turning current evidence into reliable optimizer math.

## Priority 0: establish current version

- Record the exact version string shown by the current client/server.
- Preserve one screenshot and date.
- Match public patch notes where available.

## Priority 1: formulas that can change every build

1. Diminishing returns: test each three-point band above `racial base + 40`, including rounding and the hard investment cap.
2. APT: test breakpoint calculation under DR; confirm bonus-stat classification, Burn behavior, trait eligibility, enchantment cap interaction, and all 11 recipients.
3. HP/FP: reconcile the calculator helper, historical flat-base claims, per-allocated-point HP, and all rounding/multiplier order.
4. DEF/RES: local calculator uses `floor(0.9×stat)` while some community pages say 1% per point. Measure several values.
5. Hit/Evade: establish exact displayed and rolled formulas, floors/ceilings, glancing distribution, Great Accuracy, Blind/Fear/Hesitation, facing/flanking, range, and unavoidable attacks.
6. Critical: confirm chance formula, target Critical Evade subtraction, floors/ceilings, STR-primary-scaling contribution, and critical-damage order.
7. Damage/protection: establish SWA, skill/spell/tome scaling, elemental resistance, percentage mitigation stacking, flat armor ordering, Evasion, armor-ignoring, and protection-ignoring behavior.
8. Battle Weight: confirm capacity, included slots, −2 Hit/Evade per excess point, negative item Weight, movement impact, and rounding.
9. Status: confirm Infliction minus Resistance, caps, skill-specific formulas, immunity, duration, and cleanse behavior.

## Priority 2: canonical-data conflicts

- Ghost weapon access: local Swords/Daggers versus community Sword/Axe.
- Bonder weapon access: local Tome-only versus community Axe/Spear/Sword/Tome.
- Shapeshifter weapon access: local Tome-only versus community Fist/Tome/Dagger.
- Spellthief weapon access: local Dagger versus community Tome.
- Bard base-family/class inheritance under the current class system.
- Tricky Yoyo and Hissei canonical values and transformation requirements.
- Every represented profile weapon whose effective type/scaling differs from its canonical record.

## Priority 3: build-defining class mechanics

- Ghost: Rising Game, Claret Call, Ether Invitation, Blood Magic HP costs, Wraithguard, Painproof, Rebound.
- Black Knight: Negation, Stalemate, armor gates, weight gates, protection/redirection, Black Wind state.
- Kensei: Katana gates, stance upkeep, combo effects, Sakki/Touki/Kenki, Peerless, Sacred Art, bullet deflection.
- Bonder/Shapeshifter: full Youkai roster used by builds, bond/install stat transfer, action economy, form/HP/Evade mechanics.
- Monk: Ki economy, Ki Awoken, Body of Isesip, Woki/Aid, offensive scalings.
- Spellthief/Magic Gunner: copied-spell loadout, shell/round/Akimbo resolution, cooldown and Reloading states.
- Hexer/Priest: every relied-on status/heal, infliction, casting-tool legality, Invocation/setup, cooldown, and FP economy.

## Minimum controlled-test format

For every test record:

- Version, date, tester, map/content, and PvP/PvE mode.
- Full actor and target builds or exported files.
- Exact equipment and all enabled/disabled effects.
- Before-state values, action used, roll/result text, and after-state values.
- At least 100 trials for probability estimates where practical; report confidence intervals rather than a single percentage.
- A control case that changes one variable only.
- Screenshot/log filenames and reproduction steps.

## Promotion rule

A community claim becomes `strong` after repeatable controlled tests with no unexplained contradictions. It becomes `verified` only when current authoritative data or sufficiently complete reproducible testing establishes the formula and order of operations. Until then, the AI may discuss the claim but the deterministic calculator must not silently award its numerical effect.

