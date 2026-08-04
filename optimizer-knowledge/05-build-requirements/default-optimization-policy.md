# Default player-like optimization policy

Research snapshot: 2026-08-04. This policy defines how to make decisions when the user has not supplied a more specific contract.

## Decision order

1. Preserve race, subrace, main class, level, active character configuration, and every user lock.
2. Translate the description into target content, essential actions, damage path, defense plan, reliability assumptions, and unacceptable failure modes.
3. Reject mechanically illegal class/weapon/armor/casting-tool combinations.
4. Meet hard requirements using the reliable scenario.
5. Choose complete, economically efficient APT breakpoints without violating hard requirements.
6. Meet accuracy/reliability requirements for the intended opponent and action set.
7. Meet the chosen defense contract, including torso and weight.
8. Fund the primary damage/support/control path and its sustainable resource needs.
9. Spend remaining budget on the best marginal improvement; stop over-rewarding already-saturated targets.
10. Return three candidates with meaningfully different tradeoffs, not cosmetic stat swaps.

## Marginal-value rules

- APT: compare complete breakpoints, +11 raw-stat return, exact post-DR scaled return, and opportunity cost.
- Accuracy: value Hit until the requested reliability is reached against the benchmark; value surplus only for stated debuffs/high-Evade targets.
- Evade: value reliable Evade strongly until minimum and preferred targets, then redirect surplus to survival against unavoidable damage, offense, or sustain.
- DEF/RES: evaluate expected physical/magical damage mix, percentage mitigation, flat armor, HP, healing, penetration, and armor-/protection-ignoring attacks.
- Critical: optimize expected critical contribution against target Critical Evade, not displayed Critical in isolation.
- Damage: compare expected damage per Momentum, per round, and per resource—not only weapon Power or a single maximum hit.
- Status: Status Infliction has value only for statuses the rotation actually uses and opponents that are not immune; compare against target Status Resistance.
- Utility: quantify movement, range, cooldown reduction, cleanses, control, ally protection, and setup only when their mechanics and target scenario are known.
- Conditional effects: multiply by justified uptime or keep them outside the reliable score. Never assume 100% uptime from an item description alone.

## Coherence checks

A candidate should normally have:

- One primary damage path and a weapon/action set that uses it.
- One explicit defense plan rather than incomplete investment in both tank and Evade.
- No more than one demanding extra-stat package—Critical, Faith, Sanctity, or Status—unless a verified interaction pays for the split.
- A legal casting tool for every spell that matters.
- Enough Skill Pool and skill points for the claimed loadout.
- A rotation that fits Momentum, FP/HP, cooldowns, range, and setup constraints.
- Full Battle Weight legality after all equipment slots are included.
- A plan for common counters and for turns when its main condition fails.

## Evidence precedence

- Explicit user requirements override generic guide targets.
- Current verified mechanics override historical documents.
- Calculator output overrides AI arithmetic for modeled formulas.
- A popular build can seed a candidate and reveal interactions but cannot override a mathematically stronger validated candidate.
- When the data cannot evaluate an interaction, preserve uncertainty and report the missing evidence.

## Candidate diversity

The three final candidates should differ materially, for example:

- Reliability-first: higher Hit/defense/sustain and lower peak output.
- Output-first: meets all hard floors, then maximizes expected damage/control.
- Counter-specialized: changes armor, range, resistance, or action plan for a stated threat.

Do not present a candidate as optimized if unmodeled class skills or equipment effects are the primary reason it is supposed to work.

