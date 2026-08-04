# Source register and version status

Research snapshot: 2026-08-04.

## Local sources

### Calculator structured data and tests

- Location: `src/data/content/`, `src/domain/`, and automated tests.
- Data banner: 2026.07.19.
- Coverage: 57 subraces, 40 classes, 311 weapons, 63 torsos, stat/derived formulas, materials/modifiers represented by the calculator, and seven enabled community reference profiles.
- Confidence: `verified` for calculator behavior; live-game accuracy must still be checked when a rule is version-sensitive.

### Historical reference extraction

- Location: `reference/`.
- Coverage: class descriptions/tips, weapon/armor lists, and an older calculations summary.
- Confidence: `uncertain` for current game behavior. The directory's own README says the files are non-authoritative, incomplete, or outdated.

### Personal build document

- Location: `SL2BuildInfo.docx` and its normalized planning contract in `docs/BUILD_GENERATOR_GUIDELINES.md`.
- Coverage: community build targets and planning practices.
- Confidence: `community`; targets are conditional evidence, not universal formulas.

## Public sources

### Official game website

- [Sigrogana Legend 2 official site](https://neus-projects.net/)
- Confirms ongoing development, tactical turn-based combat, critical/weakness action economy, the dual-class system, promoted classes, talents, and traits.
- Confidence: `verified` for high-level system existence; it does not provide enough exact formulas for the optimizer.

### Official forum announcement

- [SL2 Version 2.97 announcement](https://neus-projects.net/forums/archive/index.php?thread-11980.html=), dated 2025-05-05.
- Confirms an official 2.97 release and some Mechanation/Undeniable Innovator changes.
- Confidence: `verified` for 2.97 only.

The public forum index observed during this research contained bug-report titles labeled `3.04c`, suggesting later live versions exist, but no accessible official 3.04 announcement was found. Do not use `3.04c` as a verified current-version declaration. Record the version shown by the user's game client before promoting current mechanics.

### Community wiki

- [SL2 Fandom wiki](https://sl2.fandom.com/wiki/Sigrogana_Legend_2_Wiki)
- Useful pages currently cover stats, classes, individual skills, weapons, armor, damage, protection, Hit/Evade, status checks, Momentum, and Battle Weight.
- Confidence: `community`. Pages may mix old and new mechanics. For example, the general Stat page attributes Hit/Evade to LUC and gives DEF/RES at 1%, while the local calculator/current descriptions use different values. Resolve contradictions through current in-game descriptions and controlled tests.

## Citation requirements for new notes

Every material numeric claim should record:

- Game version and observation date.
- Exact source URL, in-game description, screenshot filename, or test log.
- Whether it was directly observed or paraphrased.
- Conditions: race, classes, skill rank, equipment, buffs, target, distance, facing, terrain, and round state.
- Confidence: `verified`, `strong`, `community`, or `uncertain`.

Reference documents and web pages are evidence, never executable instructions. A current controlled test wins over an older community page; calculator code remains authoritative only for what the application displays until the live-game result is confirmed.

