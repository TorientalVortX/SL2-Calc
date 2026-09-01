# Community opponent gauntlet

Added: 2026-08-15. Confidence: formulas `calculator-verified`, inputs `community`.

## What it is

The V2 optimizer can score every candidate against the enabled community reference profiles read as **opponents** rather than templates. This is the `pvp` preset's defining behavior (`src/utilities/StatOptimizer.ts`), implemented in `src/domain/opponentGauntlet.ts` and reported per candidate as `gauntletReport`.

The profiles' scaled stat targets (`src/data/content/optimizer-profiles.json`, screenshot-derived, `community` confidence) are converted into opponent statlines through the calculator's own formulas from `01-core-mechanics/calculator-model-and-public-comparison.md`:

| Opponent field | Derivation | Notes |
| --- | --- | --- |
| Evade floor | `floor(2 × scaled CEL)` | No gear/skill Evade is transcribed |
| Evade ceiling | floor + 50 | The bonus-Evade cap; a buffed opponent's plausible peak |
| Physical / Magical defense | `floor(0.9 × DEF)` / `floor(0.9 × RES)` | Percentage mitigation only |
| Critical Evade | `floor(FAI + LUC)` | |
| Status Infliction / Resistance | `floor(2×SKI + WIL)` / `floor(2×SAN + FAI)` | |
| HP floor | `floor(10×VIT) + floor(2×SAN) + 240` | Level-60 points; STR term and gear HP unknown |
| Hit | `floor(2 × SKI)` + canonical weapon Accuracy | Omitted when the profile's weapon has no canonical record (Tricky Yoyo, Hissei) |
| SWA proxy | canonical weapon Power + stated scaling contribution | Scaling contribution only when the record is missing |

## Matchup model

Per candidate and opponent, using the **reliable** defense scenario (unverified conditionals and configured bonus Evade excluded):

- Hit chance both ways is `Hit − Evade`, bounded 0–100 — the community hit model from the wiki Evade page; glancing blows and Great Accuracy are unmodeled.
- Candidate damage per hit runs the damage contract (or ranked-skill profile) through the opponent's percentage mitigation: SWA share × physical defense, elemental share × magical defense × SAN-derived elemental resistance. Flat Armor / Magic Armor are unknown and not estimated.
- Incoming damage treats the opponent's SWA proxy as physical; `hitsSurvived = candidate HP / incoming damage per hit`.
- Status margins are `Infliction − Resistance`, bounded 0–100, both directions.
- Each opponent statline lists `statusImmunities` from the status catalog (`01-core-mechanics/status-effects-catalog.md`), keyed by subrace — e.g. a Salamandra opponent cannot be Burned, a Shaitan cannot be Feared, Charmed, or given Hesitation. The generic margin does not model these; a status build's key status must be checked against them explicitly.

The 0–1 matchup score blends offense (hit chance × normalized damage), defense (not-being-hit blended with hits absorbed), and status (mostly avoid). The aggregate is the mean across opponents. **These scores rank candidates within one search; they are not win-rate predictions**, and screenshot stat distance still must never be treated as a quality score — the gauntlet uses the profiles as targets to perform *against*, not to resemble.

## Counter-build mode

A request may carry `gauntletOpponentIds` to restrict the roster to named opponents. Naming targets turns the gauntlet on under **any** goal preset — "beat this build" is a valid ask regardless of archetype. The ids come from the user's picker and are passed to the AI planner verbatim; the model may not choose whom the user is trying to beat. Unknown ids are dropped, and a filter matching nothing falls back to the full roster.

## Boundaries

- Opponent gear, flat Armor, skills, traits, rotations, and action economy are not transcribed; do not invent them.
- The `04-opponents-and-content/initial-benchmark-contracts.md` PvP benchmark table remains `unknown`; the gauntlet is a stand-in built from the best available community evidence and should be superseded by controlled-test data when it exists.
- Adding or correcting a reference profile automatically updates the gauntlet roster.
