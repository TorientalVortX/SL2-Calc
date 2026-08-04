# Initial opponent and content benchmark contracts

Research snapshot: 2026-08-04.

No reliable public dataset of current opponent Hit, Evade, mitigation, HP, Critical Evade, or Status Resistance distributions was found. Therefore the values below are build-planning defaults from the user-supplied guide and local stat descriptions, not claims about every opponent.

## General level-60 planning evidence

Source: `SL2BuildInfo.docx`, `docs/BUILD_GENERATOR_GUIDELINES.md`, and `src/data/content/stats.json`. Confidence: `community` unless explicitly calculator-derived.

- Accuracy: 57 scaled SKI is a planning floor and 60+ is preferred, but true sufficiency depends on weapon Accuracy, Battle Weight, range, Blind/Fear/Hesitation, target Evade, facing, and skill modifiers.
- Vitality: 35 final/raw VIT in the supplied guide and 40 scaled VIT in the local stat description are two different historical baselines. The optimizer must preserve the label and must not treat them as identical.
- Evade defense: reliably reach at least 195 total Evade, preferably 200+, when no user target is supplied. Do not count more than +50 ordinary bonus Evade and do not count uncertain uptime.
- Tank defense: approximately 45 scaled DEF and 45 scaled RES are initial mitigation targets. Torso Armor/Magic Armor, HP, elemental resistances, Critical Evade, status defense, class protection, and recovery still matter.
- APT: the guide's 48 scaled target is evidence, while the calculator's marginal breakpoint analysis decides the mathematically efficient default unless the user locks a target.
- Weight: the full main weapon + torso + sub-weapon load should not exceed Battle Weight. Current deterministic validation is partial because it omits the sub-weapon.

These are target-saturated defaults: once a preferred target is met, surplus should receive sharply reduced value unless the request identifies a harder opponent benchmark.

## PvP benchmark record required

Before claiming a PvP build is optimized, collect at least low/median/high values for the intended player population:

| Opponent dimension | Low | Median | High | Sample/version |
| --- | ---: | ---: | ---: | --- |
| Reliable Hit | unknown | unknown | unknown | needed |
| Reliable Evade | unknown | unknown | unknown | needed |
| Critical / Critical Evade | unknown | unknown | unknown | needed |
| Physical / magical reduction | unknown | unknown | unknown | needed |
| Armor / Magic Armor | unknown | unknown | unknown | needed |
| Status Infliction / Resistance | unknown | unknown | unknown | needed |
| HP and recovery per round | unknown | unknown | unknown | needed |

For a Hit-versus-Evade action, the community [Evade page](https://sl2.fandom.com/wiki/Evade) describes the base displayed relation as attacker Hit minus defender Evade. Glancing, caps, Great Accuracy, facing, skill accuracy, and minimum/maximum chances need controlled current-version tests before converting that difference into exact expected damage.

## PvE and boss benchmark record required

Each enemy/content family needs:

- Level and difficulty scaling.
- HP, movement, ranges, initiative, phases, summons, and enrage/time limit.
- Hit, Evade, Critical, Critical Evade, Status Infliction, and Status Resistance.
- DEF/RES, Armor/Magic Armor, elemental/physical resistances, immunities, and weaknesses.
- Damage distribution by physical/magical/armor-ignoring/protection-ignoring type.
- Dangerous statuses, forced movement, terrain, area denial, dispels, and healing denial.
- Whether burst, sustain, range, mobility, AoE, cleanse, or party support is the actual success condition.

Do not use a generic PvP Evade threshold as proof that a build is optimal for unavoidable boss damage.

## Reliability scenarios

Every benchmark should be evaluated in three scenarios:

1. Baseline: no temporary or conditional bonuses.
2. Reliable: bonuses whose trigger and uptime are realistically maintained in the intended rotation.
3. Configured ceiling: every selected conditional active.

Hard requirements are checked against Reliable. Configured ceiling is descriptive only unless the encounter guarantees those conditions.

