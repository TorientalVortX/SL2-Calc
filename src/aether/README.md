# Aether Codex

A Final Fantasy XIV inspired character sheet for Sigrogana Legend 2, built as a
second front end over the calculator's existing domain layer.

```bash
npm run dev:aether     # http://127.0.0.1:5173/aether.html
npm run build          # emits dist/index.html and dist/aether.html
```

The original calculator still lives at `/`. Both pages ship from one Vite build.

## Why it reuses the domain layer

Not a single stat formula lives in `src/aether`. Every number on screen comes from
`evaluateBuild`, the same pure function the optimizer runs a hundred thousand
times per search, and legality comes from `domain/skills`, `domain/traits` and
`domain/loadout`. Two consequences worth knowing:

- A build exported here opens in the original calculator and the other way round —
  both use `buildPersistence`'s schema-v1 file.
- Fixing a formula fixes it in both front ends. This directory is presentation and
  interaction only.

The deliberate exceptions are documented at the top of `state/readout.ts`. **Hit**,
**Critical** and **Crit Damage** are properties of an attack rather than of a
character: with a weapon equipped the rail shows `evaluateBuild`'s complete
figures, and without one it falls back to the character-side stat terms alone and
marks them with a dagger. The fallbacks floor each term exactly the way
`calculateWeaponSlot` does, so equipping a weapon never moves a number by a
rounding step.

## Equipment

All six slots are editable. A slot row opens the **armory**, a two-pane dialog:
the item list on the left, and that slot's material, enchantment, upgrade tracks
and effect toggles on the right.

Three game rules live in `state/equipment.ts` rather than in the components,
because a plain setter breaks each of them:

- **Slot 3 is exclusive.** It holds a hands piece or an off-hand weapon. Equipping
  either clears the other, rather than leaving the stale entry `equippedSlot3`
  would then have to disambiguate.
- **An accessory cannot be worn twice.** Equipping one already in the other slot
  moves it.
- **Conditionals are keyed per item.** Changing the torso clears its conditional
  toggles, so the new piece does not inherit switches for conditions it lacks.

Ranged effects ("+2-4 CEL") are per-item RNG the calculator cannot know, so each
gets a slider keyed down to the individual value — one effect line can state two
independent ranges.

Two limits are surfaced in the UI rather than hidden:


- **The off-hand weapon is not scored.** `evaluateBuild` evaluates the main hand
  only; a weapon in slot 3 correctly displaces the hands piece but adds nothing of
  its own. The gear sheet says so when one is equipped.
- **Weight is partial.** Only the weapon and torso have a published weight, so the
  Battle Wt. row keeps its dagger even when fully geared.

## Talents

Six categories, forty talents, a hundred and thirty-five subtalents, scraped from
the wiki by `scripts/scrape-talents.mjs` and derived by `scripts/build-talent-data.mjs`.
The sheet edits one thing — a subtalent's rank — because a talent's own rank *is*
the subpoints spent inside it; the group header only reports.

**The budget is 65 ranks, flat.** Not scaled by level and not gated on Legend
Extend being switched on: the sheet is used to plan a finished character, so
budgeting against a level 20 pool would refuse allocations the build is being
planned towards. Ranks are the unit, because ranks are what the 65 are spent on.
The SP those ranks cost rides alongside as a second chip and is deliberately not
the thing being counted — the rate differs per talent (1 for Capacity, 2 for
Chivalry), so an SP total cannot be measured against one pool.

Three rules live in `domain/talents.ts` rather than in the component:

- **A talent is scoped to the weapon in hand.** Blade Expertise's +Hit is worth
  nothing to an axe build, so weapon-scoped modifiers are filtered against the
  equipped weapon before they reach the sheet or `evaluateBuild`. An out-of-scope
  row is dimmed rather than hidden: the talent is bought and real, and hiding it
  would read as the talent not existing.
- **A conditional talent is off until the build confirms it.** Two-Hand's Steady
  needs an empty off-hand, which the sheet cannot see. Each such talent carries
  its own switch and stays out of every total until it is thrown — the same
  opt-in the skills sheet uses.
- **A frontal Hit bonus is the Hit model's own term, not a buff beside it.**
  Chivalry's Smite is exactly what the Hit workbook hard-coded as "Honor +15" —
  its table says "(max SR)", and Smite is 3 Hit a rank to a cap of 5. So it is
  paid into the `front` tier at the build's real rank rather than added to the
  general channel, where it would have landed on the base and flanked tiers too
  and stacked against the term it already is. It needs no switch: the tier is
  the condition.
- **Adaptation is weapon access, not a bonus.** It opens a whole weapon type up
  to a Rarity ceiling regardless of class, so the armory checks it *alongside*
  `mainClassAllowsWeaponType`: a Soldier with Fluency Adaptation 1 can hold a
  Rarity 2 Tome and not a Rarity 3 one. Rows made legal that way are marked
  **Adaptation**, or a weapon the class refuses would look like a failed check.

  Note which class that is. **Only the main class grants weapons for free** — a
  subclass supplies skills, not proficiency, so a Polearm listed under an Evoker
  subclass is exactly as unequippable as one no class lists. A refusal says so
  rather than naming both classes, because picking a subclass for its weapon
  list is the specific mistake the message exists to correct.

What reaches the numbers: Hit (in the capped bonus channel, since a talent bonus
is a buff), Critical and Critical Damage, Power and Scaled Weapon ATK, the
weapon's own Battle Weight, Max FP, elemental ATK, Armor and Magic Armor, skill
pool, and Status Infliction as a multiplier rather than a term. What does not:
anything the wiki writes qualitatively, and the non-combat half of the catalog —
Cooking, Security, Harvest — which is carried as prose and marked as such.

## Youkai

Contracts and Install, on their own sheet. Two rules come from the domain rather
than from the component:

- **One form per family.** An ascended Youkai replaces the base it grew from, so
  contracting resolves through `contractYoukai` instead of pushing onto the list —
  and the install follows the upgrade if the base was the one installed.
- **Install substitutes the race's base line, not the creature's.** Byakko's own
  level 60 STR is 56 against a Beast line in single digits; using the summon's
  numbers would make Install a fifty-point racial swing that also dragged the
  soft cap with it. The sheet previews the line actually applied, and notes that
  FAI, SAN and APT stay the character's own.

Contracting is a Summoner-tree activity. A build with no Summoner slot keeps the
contracts it already has — they are not deleted — but cannot take new ones.

**Every Youkai's skills are readable.** The `?` on any roster or contract row (or
**I** on a focused row) opens that Youkai's card: its stat line, and all three
skills with cost, momentum, range, area, domain and rules text. Each skill states
the requirement that grants it — Sync-Mind 1 for the Evoke-Active, Sync-Mind 2 for
the Evoke-Passive, Install for the Main — and whether this build currently has it.
The **Skills you hold** section above the roster lists only what the character
actually holds, which is the question a contract list cannot answer: Sync-Mind
decides which slots come across, so two identical rosters can grant nothing at
all or six skills.

## Advanced overrides

Some of a build is not a choice made here: Legend Extend, base-stat corrections,
stat stamps, the custom HP / FP / Evade fields and the per-element ATK and RES
adjusters. All of them are part of `BuildState`, all of them feed `evaluateBuild`,
and the sheet held none of them — so a build imported from the original calculator
could read differently here with nothing on screen to explain the difference.

They live behind **Advanced** in the masthead (**A**), in four sections, because
none of them is part of ordinary play. Two consequences worth knowing:

- **The rail routes to them.** The Elements group's *Adjust* opens the dialog on
  the adjusters, and an element whose figure includes one is marked `±`. A readout
  showing a number the sheet cannot account for is worse than showing no number.
- **Situational skill bonuses are on the skill.** A ranked skill with a
  conditional effect the calculator can model now carries a toggle under its row.
  Before, every one of them was silently pinned off.

## Reading a stat

Two numbers describe every attribute and both are asked about constantly: the
**raw** total, which is what the hard cap of 80 is measured against, and the
**scaled** total, which is what every formula in the game actually reads once
diminishing returns have taken their share. The grid showed the scaled figure and
kept the raw one in the row's `title` tooltip — which is to say it kept it
nowhere at all on a touch screen, where there is no hover.

So the value column is switchable. **Scaled / Raw** sits in the panel header,
**R** flips it from any focused row, and the choice is remembered in
`sl2:aether:statview:v1`. It is one switch for all twelve rows rather than one per
row, because the column is read as a column — twelve switches would be twelve
ways to end up comparing a scaled figure against a raw one. Raw totals render in
plain type and scaled in gold, so which unit is on screen survives a glance.

Each row also opens a **stat card**: tap the attribute's name, or press **I** or
**Enter** on a focused row. The card carries

- both figures, either of which is also the switch for the grid behind it, and a
  line stating what diminishing returns are currently taking off;
- the allocation, as a thumb-sized track with ±1 / ±10 steppers and Empty / Fill —
  so the card is somewhere to spend points, not only somewhere to read about them;
- **where the number comes from**: the racial floor, the points invested, and
  everything else the raw total holds. That last line is arithmetic rather than
  attribution — `evaluateBuild` sums a dozen sources internally and does not
  report which gave what — so it is named for the sources it can contain and is
  guaranteed only to make the three lines add up to the raw total, which is the
  one property a breakdown has to have;
- what the stat does, and the wiki's description of it;
- the previous and next attribute, so all twelve can be read without closing it.

`statBreakdown` in `state/readout.ts` is the whole calculation, shared by the row
and the card so the tooltip, the column and the card cannot disagree.

## Reading a derived value

The rail had the same problem one step further along: its formulas lived in `title`
tooltips, so they existed on a desktop and nowhere else. Every line of it — all
nineteen readouts and all ten elements — is now a button onto its own card, from a
click, or **Enter** or **I** on a focused row, with **↑ ↓** walking the rail.

A card carries the figure, the formula behind it, the dagger footnote if the row
has one, and then the part a tooltip could never do: **the attributes it reads**,
each a route to that attribute's card. Knowing Max HP is ten times scaled VIT is
the moment you want to be looking at VIT. Taking that route *replaces* the card
rather than stacking a second dialog over it, so one figure is being read at a
time — which is why the attribute card is owned by `AetherApp` and not by the
attribute panel: the rail opens it too, and a panel cannot open another panel's
dialog.

Two things are held together by tests rather than by care:

- **A row's `stats` list and its `hint` prose.** Both are hand-written, both
  describe one formula, and the way they drift is silent — a row goes on claiming
  SKI in prose long after its list has moved on. The test asserts that the stat
  abbreviations in the prose are exactly the stats in the list.
- **The dagger and its footnote.** Each partial row owns its note, the rail's
  footnote is built from the distinct notes of the partial rows on screen, and the
  card shows the same string. Previously the footnote's prose was composed in the
  panel and the row had no idea what its own dagger meant.

The element card also routes to the ATK/RES adjusters for that element, which is
where an unexplained number in the rail would otherwise have come from.

## Layout

| Column | Contents |
| --- | --- |
| Left | Identity (race, subrace, level, history, star sign, meal) and the class browser |
| Centre | Attribute allocation, then the loadout sheet (gear / skills / traits / talents / racials / youkai) |
| Right | Every derived value, recomputed live |

**The page is the scroll surface, and the side columns are pinned.** This was a
fixed frame first, with every panel scrolling inside itself. It looked right and
read badly: the wheel did something different depending on which of three regions
the pointer was over, and nothing at all over the gaps. Now the centre column's
panels are sized by their content and the document scrolls, while the left and
right columns are `position: sticky` and capped to the viewport — so the class
browser and the derived rail stay put while the sheet in the middle moves. Panel
headers are sticky too, which keeps the loadout's tab strip reachable partway
down a nine-hundred-skill list.

Two consequences worth knowing if you touch the CSS:

- `.panel` uses `overflow: clip`, not `hidden`. `hidden` would make each panel a
  scroll container, and the sticky headers would then stick to the panel instead
  of to the viewport.
- `.scroll` deliberately does not set `overscroll-behavior: contain`. When a
  pinned sidebar reaches its end the wheel should carry on scrolling the page.

The attribute panel is sized by its content rather than by a fraction of the
column, because twelve rows clipping at the eleventh is worse than the loadout
sheet below it being shorter. Above 1400px wide it lays those twelve out as two
columns of six, which roughly halves its height — every row it saves goes to the
loadout sheet below rather than to empty space.

Panel headers are container queries, not media queries: the same header sits in a
320px sidebar and an 890px centre column, and only the narrow one has to drop the
class name from its tab strip.

### On a phone

A fourth tier below 430px, for a 360px screen — a hundred pixels narrower than the
narrowest column this sheet was drawn for. Type sizes, colour and rule weights are
untouched; only geometry moves. Two of those moves are worth knowing:

- **The attribute row is on two lines.** Five columns in 320px left the allocation
  track 64px wide, which is too narrow to read as a proportion, too narrow to hit,
  and — since it takes `touch-action: none` to work as a drag surface — a scroll
  dead zone in the middle of twelve rows. Given a line of its own it is the widest
  control on the sheet instead of the smallest, and the top line then has the room
  to make the steppers thumb-sized.
- **The masthead spends 198px instead of 229px**, by putting the crest beside the
  title rather than above it and holding the subtitle to one line.

Three things that look like phone bugs are really width-independent ones that only
a phone is narrow enough to expose, and all three are the same bug:

> A grid track that is `auto`, or a grid item that keeps `min-width: auto`, cannot
> be sized below its content — so one nowrap row inside pushes everything above it
> wider than the viewport.

It reached the page three ways. `.modal` is centred rather than stretched by its
scrim, so the footer's five buttons set the dialog to 437px on a 360px screen and
carried **Close** and **Import** off the right edge, where nothing but Esc could
reach them. `.shell__body` sizes its columns with `fr`, which gives the grid a
min-content width of the widest column times the track count — 1319px at a 900px
viewport — and `.shell`'s auto track adopted it. `.panel`'s own implicit column
did the same for one sheet at a time. All three now say `minmax(0, 1fr)` and
`min-width: 0`; if a panel or a dialog ever starts overflowing again, this is what
came back.

Also: the masthead wraps at **any** width, not only below the stacking breakpoint.
Seven action buttons and a build name are content, and they ran past a 900px window
long before the layout was told to stack. The build name's `flex-basis` is its
floor rather than its content width, so a tight bar narrows the field before it
takes a second line.

`--nav-h` is one number for the section strip's height and the offset every panel
header sticks at. They touch, so they cannot be allowed to disagree: left to its
content the strip measured 35px against the 39px the headers assumed, and a 4px
band of the sheet scrolled through the seam.

Prose that names keys is hidden under `(hover: none) and (pointer: coarse)`. Two of
those paragraphs sit under the panels they describe and cost about 60px between
them — a fifth of a phone screen spent telling a thumb about Shift and Home. The
shortcut dialog still lists them for anyone who attaches a keyboard.

## The opening cinematic

`intro/` holds a title sequence: twenty thousand GPU motes gather out of the dark,
settle onto the crest, and the sheet unveils behind them.

The whole thing is **one rAF clock reading a table of act boundaries**, not a chain
of `setTimeout`s. That is what makes skipping, replaying and the short
returning-visitor cut the same code path — each is just a different table — and it
means the WebGL swarm and the DOM typography cannot drift, since both derive from
the same elapsed time. React re-renders at most five times over the whole run, at
act boundaries; everything continuous is either a shader uniform or a CSS animation
keyed to `data-act` on the root.

Three things are worth knowing before editing it:

- **`crest.ts` is the single source of the mark.** The SVG strokes and the
  particles' target positions come from the same polylines, so the drawn crest and
  the swarm that forms it cannot disagree. Points are sampled by arc length, not a
  fixed count per segment — the core diamond is a fraction of the ring's length and
  a per-segment split would settle as a bright blob inside a faint circle.
- **The swarm is fitted to the SVG, not the other way round.** `setCrestRect` takes
  the crest's measured size *and centre* in CSS pixels and scales and positions the
  point cloud to match, recomputed per frame because the camera is still dollying.
  So `--crest` and `--crest-center` in `intro.css` can be retuned freely and the
  particles follow — including sitting the crest above centre to make room for the
  title.
- **Three is a dynamic import.** About 500KB stays off the sheet's critical path
  and out of the download entirely for reduced-motion visitors, who never mount the
  component. The timeline does not wait for it: a swarm arriving late appears at the
  position it should already be in.

Cuts: the full overture on a first visit, a ~1.5s flare thereafter, and nothing at
all under `prefers-reduced-motion`. Any key, any click or the Skip button enters
immediately; the masthead crest replays it.

Sound is synthesised — a filtered two-voice swell under the gather and a struck
chord as the crest lands — and is off by default. Note that browsers refuse an
`AudioContext` before a gesture, so a first load is silent regardless; a replay
triggered by clicking the crest is not.

## Getting around

The sheet is one document, and on a desktop viewport that is all the navigation it
needs — the sidebars are pinned, so nothing is more than a short scroll away.
Three additions cover the cases where that stops being true:

- **A section strip appears below 1240px**, where the columns unpin and stack. It
  jumps to any of the five panels and marks the one you are in. Deliberately not a
  tab bar: hiding the attributes to reveal the readout trades the problem for the
  same problem in the other direction. Note that it asks for a smooth scroll only
  when motion is welcome — Chromium declines a smooth scroll outright under
  `prefers-reduced-motion`, rather than jumping, which would leave the strip
  looking broken for the visitors who most need it.
- **Legality problems are routes.** Each line above the loadout sheets is a button
  onto the sheet that can fix it, tagged where the violations are collected rather
  than guessed from their prose.
- **Both front ends link to each other.** `Calculator ↗` in the masthead, `Aether ↗`
  in the original's header bar. One build file and one share-link format serve
  both, and until now whichever page you opened was the only one you could reach.

## Sharing

Three routes out, and one in:

- **A link.** `Copy share link` puts the whole build in the URL fragment, in the
  same `#build=` format the original calculator writes — so a link made in either
  front end opens in either.
- **A code**, for pasting where a URL will not go.
- **A file**, schema v1, as before.

Arriving on a `#build=` link offers the build rather than applying it: accepting
replaces the sheet, and unsaved work is behind that. The fragment is cleared on
both paths, so a reload cannot re-offer or silently re-apply it. If the link was
made against a different dataset, the offer says so — the numbers move when the
data does.

## Interaction

- **Tab** moves between attributes; the steppers inside a row are out of the tab
  order on purpose, so the row itself is the tab stop.
- **← →** spend and refund a point, **Shift** for ten, **Home** / **End** empty or
  fill the stat. Dragging a bar sets it directly.
- **I** or **Enter** opens the focused attribute's card; **R** switches the value
  column between scaled and raw.
- Every line of the derived rail opens a card the same way, and each attribute
  named in one is a route to that attribute's card.
- **↑ ↓ / W S** walk any list; **Enter** or **Space** activates.
- **T** templates, **B** saved builds, **E** import/export, **A** advanced
  overrides, **?** the shortcut list itself, **Esc** closes.
- Menu sounds are synthesised with WebAudio (no audio assets) and default to off.

Over-allocation is allowed and marked rather than blocked — the pool turns red and
states the overspend. The per-stat hard cap of 80 *is* enforced, because that is a
game rule rather than a budget.

## Files

```
intro/              the title sequence: crest geometry, Three scene, timeline
state/build.ts      the legal edits, and the pruning each one drags in
state/useBuilder.ts one build, one memoised evaluation, saves and transfer
state/equipment.ts  slot rules, item lists and effect keys
state/readout.ts    derived values grouped for display, and one stat's breakdown
state/statView.ts   whether the grid reports raw or scaled totals
state/audio.ts      synthesised menu cues
ui/                 panel frame, modal, animated numbers, backdrop, section nav
panels/             the sheets
dialogs/            templates, saves, transfer, advanced, shared builds, armory,
                    one attribute's card, one derived figure's card
aether.css          the whole design system; no Tailwind dependency
```

Modals are portalled to `document.body`. The armory opens from inside a panel
that owns a scroll region, and a `position: fixed` scrim nested in one is laid
out against that ancestor instead of the viewport.

`Modal`'s focus effect runs on mount only, and reaches its `onClose` through a
ref. It used to depend on the prop, which every caller writes as an inline arrow —
a fresh identity on each render of the sheet — so the effect tore down and set up
again after every edit, and its opening `focus()` fired each time. Any dialog that
changes the build threw focus back to its Close button as you used it. If you add
a dependency to that effect, this is what comes back.

`aether.css` is deliberately standalone. The original calculator is a Tailwind
build, and sharing a token layer between the two would have coupled a visual
experiment to a shipping interface.

## Checking it

```bash
npx vitest run src/aether                       # derivations and reducer rules
npm run smoke:aether -- 9224 shot.png 1600 1000 # renders it over CDP, reports console errors
npm run flow:mobile                             # drives it with a thumb at 360x780 and asserts
npm run audit:mobile                            # measures the same tour: overflow, tap targets, type
```

The smoke script needs a browser started with `--remote-debugging-port=9224` and
a dedicated `--user-data-dir`; an everyday profile tends to refuse the attach. The
two mobile scripts launch their own Playwright Chromium and need only the dev
server, and both take `--width` / `--height` (`--desktop` on the audit drops the
touch emulation, which is how a phone fix is checked against the layout it was
fenced away from).

`flow:mobile` is the one to run after touching `aether.css`. Several of the things
it covers were unreachable rather than merely cramped — a Close button off the side
of the screen on a device with no Esc key is not something a geometry report
notices, because the geometry is fine right up until you need to tap it.
