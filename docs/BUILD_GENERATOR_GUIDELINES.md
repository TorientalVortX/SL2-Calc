# SL2 build-generator guidelines

Primary reference: `SL2BuildInfo.docx`. These instructions turn that document into a generator contract. Calculator formulas and structured data may evaluate a proposed build, but must not silently replace the document's planning framework. Current patch/game evidence takes precedence for a version-sensitive fact once it has been verified.

## Source and uncertainty labels

Every material claim must be distinguishable as one of:

- **Document baseline** — stated by `SL2BuildInfo.docx`.
- **Calculator data** — computed or listed by the current structured calculator data; identify the relevant value.
- **Assumption** — an interpretation needed because the document does not define the mapping or rule.
- **Requires verification** — unavailable, version-sensitive, dependent on unmodeled class/item effects, or dependent on the target content.

Never turn “requires verification” into a confident recommendation. Do not invent item effects, class effects, abbreviation expansions, spell casting permissions, buff uptime, or special scaling.

## Required input pass

Collect or explicitly mark `open`:

1. Current patch/version and PvE/PvP/mixed context.
2. Character concept, combat role, and roleplay theme.
3. Non-negotiable race, class, weapon, item, and theme choices.
4. Choices the generator may change.
5. Primary damage path: Strength, Guile, Will, Skill-only, or verified special scaling.
6. Defense plan: Evade, tank/non-evade, bruiser, hybrid, or intentional glass.
7. Extra-stat package: Critical, Faith, Sanctity, or none.
8. Target level/content and solo/team context.
9. Available gear, crafting access, budget, and restrictions.
10. Complexity, mobility, range, support, reliability, and theme preferences.

Ask only about missing information that would materially change the result. Preserve every non-negotiable. Do not force a class, race, or weapon when that choice is open.

## Build sequence

Generate in this order because each decision constrains the next:

1. Define one coherent concept.
2. Choose two classes that provide essential actions, buffs, passives, or utility for it.
3. Check race mechanics, Sanctity demand, and Celerity versus Defense/Resistance fit.
4. Select one primary damage path and a compatible weapon.
5. Select one explicit defense plan.
6. Select at most one demanding extra-stat package unless a specific interaction is verified.
7. Meet applicable attribute baselines, then allocate remaining points to primary needs.
8. Select weapon and torso first, followed by off-hand, boots, gloves, and accessories.
9. Validate accuracy, survivability, buffs, casting tools, battle weight, and action reliability.

Prefer one weapon and one damage stat. Twin Dance, Akimbo, and other departures require a verified interaction. Treat hybrid defenses plus Faith, Critical plus Sanctity, and two damage stats as likely stat-budget overload until proven otherwise.

## Numeric baselines

For a final/endgame build:

- Scaled Aptitude: exactly 48; avoid overinvestment. The document says this is usually 50 unscaled and may be 49 for some races.
- Skill: at least 57 scaled, preferably 60+; the document also gives 65 final Skill as a simple baseline.
- Vitality: at least 35 final.
- Evade plan: reliably reach at least 195 total, preferably 200+, with no more than +50 Evade buffs.
- Tank/non-evade plan: approximately 45+ Defense and Resistance is described as a strong target; armor and magic armor remain part of the check.
- Battle weight: total equipped weight must not exceed the maximum.

Do not prorate these targets for a lower-level build unless a verified leveling rule is supplied. Label lower-level evaluation as requiring endgame-plan verification.

The calculator currently treats `rawStats` as its unscaled total. **Assumption:** mapping that value to the document's “final” label is not explicitly defined by the document. Keep this label visible when evaluating final Vitality or the document's 65-final-Skill baseline.

APT must be searched in complete breakpoints rather than one point at a time. Each +1 global bonus affects all 11 non-APT stats, so compare the invested points needed for the next breakpoint against both its +11 raw-stat return and its exact post-diminishing-return scaled-stat gain. Then compare the whole breakpoint-funded build against distributing those points directly among the build's important stats. Intermediate APT points must not be pruned before their breakpoint payoff is evaluated.

## Required output order

Return one primary build and one alternative in this order:

1. Assumptions, verification needs, and material questions.
2. Build summary.
3. Class, race, weapon, and defense rationale.
4. Attribute targets, explicitly labeled final/unscaled/scaled/base/equipment/passive/in-combat.
5. Equipment plan by slot.
6. Buff, accuracy, casting-tool, and resource plan.
7. Strengths, weaknesses, and failure conditions.
8. Leveling and acquisition order.
9. Completed validation checklist.

## Validation checklist

Each line must be `PASS`, `FAIL`, or `REQUIRES VERIFICATION`, followed by the evidence used.

- Concept coherence.
- Both classes make an essential contribution.
- One primary damage stat and compatible weapon.
- At least 57 scaled Skill, with range and Blind penalties addressed.
- Defense plan meets its Evade or mitigation needs.
- At least 35 final Vitality.
- Exactly 48 scaled Aptitude.
- Only the extra-stat package actually used is funded.
- Final, unscaled, scaled, base, equipment, passive, and in-combat values remain distinct.
- Every damaging spell has a valid casting tool and the correct tool is selected.
- Weapon and torso are suitable and prioritized for upgrades.
- A second weapon is justified by a verified interaction.
- Total battle weight is within the maximum.
- Buffs, resources, positioning, and actions are sustainable in target content.
- Version-sensitive claims were checked against the target patch.

## Current calculator boundary

The optimizer can automatically evaluate scaled and raw stats, derived Evade, configured weapon scaling/access, and the configured torso. V2 can search subclass, stats, primary weapon, and torso while enforcing fixed character choices and equipment locks. Generic numeric targets are evidence, while explicit user minimums remain hard constraints. For APT specifically, V2 evaluates complete 6-scaled-APT breakpoint purchases, their +11 raw-stat return, their exact effective scaled-stat gain, and their opportunity cost. It reports the document's 48 target but does not force it unless the user adds an explicit APT constraint.

Defense plans are evaluated as reliable-condition contracts. Evade distinguishes baseline, declared-reliable bonus, and fully configured totals; it requires the chosen minimum before rewarding secondary goals and saturates at the preferred target. Tank checks scaled DEF/RES alongside native torso Armor and Magic Armor. Armor conditionals remain excluded unless the exact current torso is locked and the user marks its active conditions verified. Primary weapon plus torso weight is checked against Battle Weight, but this remains a partial check until all equipment slots are modeled.

The AI mode may interpret free-text intent and direct deterministic searches, but it cannot supply calculator numbers or final equipment directly. It must return server-created, calculator-validated candidate IDs. It cannot currently prove concept fit, class-skill behavior, full spell lists/casting permissions, extra-stat interactions, off-hand legitimacy, gloves/boots/accessories, complete equipped weight, buff uptime, positioning, acquisition order, or patch currency. Those items must remain `REQUIRES VERIFICATION` until structured data is added.
