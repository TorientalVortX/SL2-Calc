# Changelog

App releases for the SL2 Calculator. The game data has its own version and its
own list of changes, in [`src/data/game-data.json`](src/data/game-data.json).
The two move independently, because one tracks what the app can do and the other
tracks how current the wiki-derived numbers are. Both are shown together behind
the version badge in the app.

The notes for the current release are held in
[`src/data/app-release.json`](src/data/app-release.json), which is what
`APP_VERSION` and the in-app dialog read. `npm run validate:data` fails if that
file and `package.json` disagree about the version.

## 0.8.0 — 2026-08-31

A new character sheet, talents, status effects, and a hit/evade model you can
open up.

### Added

- **Aether Codex character sheet**, now the SL2 Calculator experience. A
  single-screen sheet with identity, class, attributes, loadout and derived
  readouts in three columns.
- **Talents**: 40 talents and 135 subtalents, ranked by subpoint spend, with
  their stat and Hit modifiers folded into the build. Weapon-scoped subtalents
  are shown greyed against a weapon they do not match rather than hidden, and
  conditional ones carry their own switch.
- **Adaptation weapon access.** Adaptation subtalents grant weapon access by
  Rarity, so a class can legally equip a weapon its own list does not offer.
  `validWeapons` is base class access only; a build's talents are checked
  alongside it.
- **Status effect catalogue**: 53 statuses, including which subraces cannot be
  inflicted with each one, so a status build can be checked against an opponent
  before trusting an infliction margin.
- **Hit and evade model.** Every derived figure opens to show where it came
  from: flanking conditions, the ceiling that buffs and item effects share, and
  the 5% floor and 75% cap that apply while Blind.
- **Source provenance on derived values.** A capped Hit or Evade figure now
  names which effects are competing for the ceiling and how much is being
  discarded, instead of only reporting the total.
- **Opponent gauntlet**: 7 community reference statlines a build can be scored
  against, with a counter-build mode that restricts the gauntlet to chosen
  opponents. Every figure is derived through the calculator's own formulas;
  inputs the community transcription cannot support are reported as caveats
  rather than guessed.
- **Upgrade tracks on the remaining slots.** Hands, legs and accessories take
  upgrade points at +1 of their stat per point, with no durability track, plus
  Fortune and Greed on accessories.
- **G6 and Korvara worlds.** A build records which world it is played in. G6
  raises every upgrade ceiling by one; Korvara uses the base caps.
- **Mobile layout** with swipe between tabs and touch-sized controls.
- **AI-assisted optimizer** (private, experimental). It may only recommend
  builds the server has already validated, and must cite the local knowledge it
  reasoned from; an ungrounded or unvalidated selection falls back to the
  deterministic search.

### Changed

- Armor is spelled the way the game spells it throughout the interface. Some
  labels and messages previously read "armour" beside an "Armor" column header
  in the same panel.
- The version badge now opens release notes as well as data changes.

### Fixed

- The optimizer no longer recommends weapons a build could not equip.
- Aptitude is evaluated in complete 6-point breakpoint bundles, so intermediate
  points that look worthless on their own are not pruned before the breakpoint
  that pays for them.

### Internal

- Source-level editorial pass across 155 files: prose and comment style,
  removal of comments that only restated the code, and deletion of unused
  decorative CSS. No logic changed. See [`review.md`](review.md).
