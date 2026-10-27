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

## 0.9.3 — 2026-10-27

Set bonuses, off-hands, bare fists, and a lot more in the damage calc.

### Added

- **Set bonuses.** Wear enough pieces of a set and its bonus turns on by
  itself. The armory shows which tiers you've reached.
- **Off-hand weapons count.** A weapon in slot 3 is its own weapon now, with
  its own Power, Hit, Crit and crit damage. Its effects, enchantment, material
  and weight all count. In the damage calc, basic attacks can pick which hand
  swings, and Straight Cannon adds both weapons' Power.
- **Unarmed.** With nothing in your main hand you fight with Bare Fists
  (10 Power, 105 Accuracy, 5% at 110%, 100% STR, Blunt).
  - Empty Palm, the Kickboxing Shoes, Metal Buckler and Arcane Tattoo (Fist)
    all feed into them.
  - Hidden Blade (Slash) and Hidden Barrage count as a Sword or Gun too, and
    Tendril Tonic swaps in the Unstable Tendril.
  - Mixed Martial Arts, or the Tendril, lets you use them next to a held
    weapon.
- **More in the damage calc.**
  - On-hit damage from your weapon and gear (Icebreaker's 50% Ice ATK, Burning
    Bracers, the Swordmaster's Rings and so on) gets added to basic attacks as
    its own hit. It doesn't crit and rides the attack's roll.
  - Pick the target's race, torso and whether it's a boss, so Mythslayer,
    Giant Slayer, Kingslayer and the armor Slayers kick in. Incoming has an
    attacker race for the Foe Shields and the like.
  - "+10% Power to Nerifian Spells" and the "+2 Power to Sylphid Spells"
    trinkets apply to spells of that school. Off-hand staves give half.
  - "+10 Critical Damage" is flat damage added on a crit.
- Church Faithful's +15% healing applies to your healing skills.

### Changed

- Cleaned up the damage tabs. Toggles aren't giant bars anymore, and the hit
  settings have their own section.

### Fixed

- Set bonuses written on set pieces counted once per piece. Church Faithful
  could give +9 Light ATK.
- Guillotine and Morimayer's "+10 Critical Damage" was giving Critical instead.
- Ring of Thorns and Archery Gloves' basic attack Power applied to everything,
  skills included. Archery Gloves only works on Bows now.
- The "+2 Power to X Spells" trinkets were giving weapon Power when switched on.
- Arcane Tattoo (Fist) made any weapon you held Magical.
- Some plain bonuses were never read: +5% Critical Chance (Crownbleeder Plus,
  Sayakensa), Ring of Thorns' Max HP cut, +5 Darkness ATK and Rogue's Work
  Gloves' crit damage.
- Skitterscale counts as bonus Evade, inside the cap.
- Item switches stay on when the wiki data changes. They're tied to the line's
  text now instead of its position.

## 0.9.2 — 2026-10-27

Damage calc is in, plus a big pass on item effects.

### Added

- **Damage calc.** Hit Simulate in the Defense panel.
  - Incoming shows what a hit actually does to you: DEF and RES, resists,
    Guard, then Armor. Armor works as a pool over multi-hits, so 20 Armor
    against two 15 damage hits takes 0 then 10. Glances, parries (including
    the gauntlet shields) and per-hit crits are all in there, plus an
    expected damage number off the attacker's Hit.
  - Outgoing does the same thing the other way. Pick a basic attack or one of
    your ranked skills, add any damage modifiers or bonus damage, and point it
    at a target's numbers, or at your own with Use my defenses. Skills and
    spells crit at 1.25. Basic attacks, and skills that do a basic attack, use
    your weapon's crit damage plus GUI.
  - Skills that do a basic attack carry their own Hit, Crit and bonus damage
    now (Couloir, Geldoren, Wazabane, Snake Shot's acid and so on).
- **Skills from gear.** Every skill an item gives you shows up as a card with
  its cost in the armory, and in a From equipment section on the Skills sheet.
  They don't take skill points. The ones that buff you, like Contract of Blood,
  Lion's Roar and Luckiness Dance, have a switch that applies them.
- **Tetra crystals.** Tetra Dragon Fang and Tetra Gauntlet follow whichever
  crystal you pick instead of always being Fire.
- **Missing torsos.** Shadow Gi, Dragon Gi, Caster's Cape, Farmer's Shirt,
  Healer's Shroud, Berserker Shell, Kaminah Robes, Warding Cloth, Alchemic Wrap
  and Batwing Cloak. Dragon Gi and Healer's Shroud count toward their sets now.
- Caster's Cape, Farmer's Shirt and Healer's Shroud bump your main class stats
  by half when you're in their class family.
- Little Cheese has a switch for its WIL and GUI, and Oni Heritage adds its +2
  onto Sanguine Crest when the crest is up.

### Changed

- Magical Gauntlet shields match the patch: 5 rounds, 5 FP, swap between them
  for free, and each one parries. Magical Aegis is +8 RES. Only one can be on
  at a time.
- Buffs that only last a few rounds (gauntlet shields, Heart of the Lion,
  Est Lestrada's penalty) are switches now instead of always being on.

### Fixed

- Item switches actually save. They used to reset on refresh and never made it
  into saves or share links. Builds saved before this update still load with
  them off, since they were never stored.
- Items that gave stats from the wrong part of their text: Creeping Darkness
  had a free 25 Armor, Tetra Dragon Fang 30 Armor, and Holy Word's switches
  gave STR and FP read off its costs.
- Lists like "+2 STR, WIL, DEF, and RES" give every stat now, not just the
  first one (Heart of the Lion, Sunken Silk Bow, Hankyu).
- Little Cheese and Oni Heritage no longer give their stats all the time.
- Materials with "All:" effects work on every slot they fit, so Webbing on
  cloth gloves gives its Acid ATK. Glove enchantments like Fireheart give their
  elemental ATK too.

## 0.9.1 — 2026-10-26

Build cards, link previews, and the classic calculator retired.

### Added

- **Build cards.** Copy build card and Save card in Import / Export make an
  image of the build, in the current theme, for posting where links don't
  preview.
- **Link previews.** Links to the site show a screenshot of the sheet.

### Changed

- The classic calculator and its optimizer are retired. `/classic` and
  `/aether.html` redirect to the sheet and keep any shared build.
- The installed app is called Aether Codex and has a new icon.
- RES and Dark ink is lighter on the dark theme so it is readable.
- Updates download only changed files. The first update after 0.9.1
  downloads everything once.

### Fixed

- The light theme no longer flashes dark on load.

## 0.9.0 — 2026-10-08

Chemist mixtures, battle effects, and a pass through Aether's controls and wording.

### Added

- **Chemist mixtures.** All 60 recipes, flask planning, wiki descriptions,
  status tooltips and source links. Supported ally effects can be enabled
  from the mixture sheet.
- **Skill details.** Read the wiki description, formula, rank values, costs
  and requirements from the skill list. Damage formulas use the build's
  referenced stats, weapon ATK and elemental ATK.
- **Battle effects.** Controls for temporary stat boosts, defenses, elemental
  bonuses and other supported skill effects. Skills with stacks, resource
  counts or an element choice have fields for those values.
- **Spellthief spell library.** Save spell cards and prepare copies, with
  descriptions, requirements and capacity shown. Cards use their normal
  maximum rank and are kept when changing classes.
- **Crystals.** A count beside Level in Identity, granting +1 HP and FP each,
  up to 45.
- **Spirits.** White Spirits in Talents grant +3 HP and FP each, up to five.
  Black Spirits are marked TBA.
- Crystal, White Spirit and skill input counts are kept in saves, imports
  and share links.

### Changed

- Moved History from Identity into Traits. Selecting another History replaces
  the previous choice. History is free for Human-category races and costs one
  trait point otherwise.
- Each Bard song now has one Active toggle for all its bonuses. Additional
  conditions on other skills keep their own controls.
- Simplified Aether's wording, helper text and decorative styling. Wiki text
  is preserved.
- Shortened the skill calculation heading to Power and removed
  "Live, from this build" from readout cards.

### Fixed

- Chemist mixture power now includes the Chemist class level and the stat
  for its mixture type: GUI for Cocktails, DEF for Balms, FAI for Medicine,
  and APT for Mutagens.
- Corrected Unholy Dye to B + E, matching the wiki correction.
- History stats now count toward trait requirements without changing racial
  base stats. Its point cost is included in the trait budget.
- Temporary skill stat boosts keep their full value after diminishing
  returns. Temporary Evade uses the bonus cap; Dodger remains base Evade.
- Skill Power bonuses now reach Scaled Weapon ATK. Supported resistance,
  critical damage and FP bonuses also reach the build totals.
- Chaos Reflex shows Max LV by rank instead of +1 Evade. Its Active control
  shows the bonus from the entered LV.

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
  decorative CSS. No logic changed.
