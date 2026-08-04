# Personal optimizer knowledge

Markdown files in this directory and its category folders are read only by the local AI optimizer server. Add personal observations, build examples, patch notes, or mechanics here without changing the application code.

These notes are evidence for AI reasoning. They never directly alter calculator formulas, equipment records, point limits, or validation rules.

## Categories

- `00-inbox/` — unsorted information to organize later.
- `01-core-mechanics/` — damage, Hit/Evade, critical, mitigation, APT, weight, and action formulas.
- `02-classes-and-skills/` — class passives, skills, requirements, interactions, and class-pair reasoning.
- `03-equipment/` — weapons, armor, other slots, enchantments, upgrades, sets, and conditional effects.
- `04-opponents-and-content/` — representative PvP/PvE targets and the numerical checks builds must pass.
- `05-build-requirements/` — desired roles, playstyles, hard locks, thresholds, and acceptable weaknesses.
- `06-rotations-and-resources/` — action sequences, FP costs, cooldowns, setup time, and sustainability.
- `07-annotated-builds/` — complete example builds with explanations of why each choice exists.
- `08-combat-results/` — observed tests, combat logs, expected-versus-actual results, and failures.
- `09-patches-and-sources/` — version changes, citations, provenance, and historical mechanics.

Put usable notes in descriptively named `.md` files such as `02-classes-and-skills/ghost.md`. Files beginning with `_` are templates/instructions and are intentionally excluded from AI prompts. Copy the local `_TEMPLATE.md`, rename the copy, and fill it in. Include a game version, source, and confidence whenever possible.

Confidence values:

- `verified` — directly tested or confirmed by authoritative current data.
- `strong` — supported by repeated tests or several reliable sources.
- `community` — commonly reported but not independently verified.
- `uncertain` — incomplete, historical, or dependent on an unknown condition.
