# Mockup style guide

Conventions extracted from `Calculator UI improvement/SL2 Calculator.dc.html`
(Turn 1, variant **1a — command deck**). **The mockup is the source of truth for
UI and UX.** Where the live app disagrees, the app is wrong.

Written down because the mockup is inline-styled raw hex with no classes, so every
value has to be re-derived by hand otherwise.

---

## Shell

| Thing | Value | Token |
| --- | --- | --- |
| Deck width | `1340px` (we use as `max-width`) | — |
| Deck background | `#0d111a` | `bg-surface-base` |
| Deck border | `#1e2636`, radius `14px` | `border-edge-muted rounded-[14px]` |
| Header bar | height `52px`, bg `#0f1420`, border-bottom `#1a2130`, padding `0 20px` | `bg-surface-bar border-edge-subtle` |
| Left rail | `268px`, bg `#0a0e16`, border-right `#1a2130`, padding `18px` | `bg-surface-sunken` |
| Right rail | `330px`, border-left `#1a2130`, padding `16–18px` | — |
| Centre | `1fr`, padding `18px 20px 24px` | — |

Grid templates vary per tab — **not every tab has both rails**:

| Tab | Columns |
| --- | --- |
| Stats | `268px 1fr 330px` |
| Optimizer | `268px 1fr` |
| Weapon | `1fr 330px` |
| Armor | `168px 1fr 330px` (class filter / table / detail) |
| Screenshot | `1fr 300px` |

## Type

Three families only:

- **Barlow** — all prose, labels, buttons. 400/500/600/700.
- **Barlow Condensed** — uppercase micro-labels *only*.
- **JetBrains Mono** — every number, without exception.

The dominant heading is the **section micro-label**, used ~73 times:

```
font: 600 10px 'Barlow Condensed'; letter-spacing: 0.20em; text-transform: uppercase; color: #4e5a72
→ font-condensed text-10 font-semibold uppercase tracking-label text-content-ghost
```

Tracking varies by context: `0.22em` page-level, `0.20em` section, `0.18em`/`0.16em`
table headers, `0.14em` right-aligned meta.

Sizes in play: 9, 10, 11, 12, 13, 14, 15, 17, 20, 21, 26px. The scale lives in
`design/tokens.ts` as `fontSize`; `tailwind.config.ts` imports it to emit the
utilities and `design/cx.ts` imports the same list to configure tailwind-merge.

**Both consumers are mandatory.** The scale is named by pixel value, which
matches none of tailwind-merge's built-in size validators, so without the `cx`
registration it files `text-10` as a *text colour* and drops it whenever a colour
is also present — `cx('text-10 text-content-faint')` silently emitted colour
only, rendering the design's 10px label at the inherited 16px. Adding a size means
adding it to `fontSize`, and nowhere else.

## Colour

Full palette lives in `tokens.ts`. The rules that matter:

1. **Chrome is neutral.** One periwinkle accent (`#8b8dff`, `info`) carries
   interaction. There is no per-feature hue — the Armor and Optimizer screens use
   *no* accent beyond it.
2. **Colour comes from data**, not from chrome: `STAT_COLORS` / `ELEMENT_COLORS`
   tint values and bars. Three of them fail contrast on near-black and are
   substituted at render time by `ON_DARK` (see `data/colors.ts`).
3. Semantic colour is limited to `positive` `#6ee7a5`, `negative` `#ef7a7a`,
   `caution` `#fbbf24`.

## Recurring components

**Bars.** Every bar is the owning entity's colour, layered by opacity — never a
different hue.

- Composition (stats): `h-8px r-4px`, track `#131a26`, segments at opacity
  `1 / 0.55 / 0.22` for base / invested / bonuses.
- Delta (optimizer): `h-6px r-3px`, track `#131a26`, proposed at `opacity .3`
  underneath, current at full opacity on top.

**Metric chip.** `bg #0d1320`, radius `6px`, label `500 10px Barlow #6b7893` +
value `600 11px mono #c3cbdb`.

**Primary button.** `bg #2a3350` → hover `#35406a`, radius `8px`, padding
`12px 18px`, `600 13px Barlow #e6ebf5`. Tokens: `bg-info-bg hover:bg-info-edge`.

**Selectable card** (goals, candidates). Border `#232c3f` → hover `#4a5573`;
selected gets the accent border and a lifted background.

**Stepper.** `26×26`, radius `6px`, bg `#131a26`, hover `bg #1e2739` + white text.
Steppers are **press-and-hold with acceleration** (`holdDec`/`holdInc`/`stopHold`),
not click-once.

**Numeric field.** `46×26`, centred, bg `#0f1420`, border `#202836` → focus
`#4a5573`, `500 13px` mono.

## Row grids

Rows are fixed-column grids, not flex — columns must align down the table.

| Screen | Template | Row height |
| --- | --- | --- |
| Stat allocation | `92px 1fr 128px 116px` | `46px` |
| Optimizer diff | `46px 1fr 78px 52px 82px`, gap `10px` | auto |
| Elemental (rail) | label / bar / value / RES | auto |

Optimizer diff is laid out **two per row**: outer grid `1fr 1fr`, gap `0 28px`.

## Interaction rules

- **Press-and-hold** on every numeric stepper.
- **Rows expand in place.** Clicking a stat name toggles an inline breakdown —
  the mockup never opens a modal for this.
- **Hover raises borders**, it does not change background hue. Table rows are the
  exception and lighten to `surface-raised`.
- **No global button effects.** `index.css` used to give every `button` a
  300px white ripple via `::before`, clipped by `overflow: hidden`. On the deck's
  wide, short buttons — an armour row is 802×34 — that renders as a lighter band
  floating in the middle of the row rather than a highlight covering it. It is now
  opt-in as `.btn-ripple`; controls declare their own `hover:` state.
- **Transitions** on width only, `140ms ease`.
- Selecting a candidate updates the comparison below it; **Apply** is a separate
  explicit action.

## Deviations we have taken, deliberately

| Deviation | Why |
| --- | --- |
| `1340px` as `max-width`, not fixed | fixed width scrolls horizontally on laptops |
| Optimizer keeps the AI/V2 engines | the mockup shows a simpler greedy allocator; the existing engine is real functionality, so the mockup's *layout* is adopted over it |
| `BAR_SCALE = 80` for composition bars | the mockup states no reference maximum |
| Optimizer goals are the app's **6 presets**, not the mockup's 5 | the mockup's goals (Weapon power, Critical rate, Survivability, Evade, Accuracy) are close but not identical to `OPTIMIZATION_PRESETS`; mapping to real presets keeps the engine honest rather than inventing goals it cannot score |
| Candidate cards are titled by class pair | the mockup titles them by strategy ("Pure weapon power"); the engine returns class/equipment permutations, so the class pair is the truthful label |
| Engine controls occupy the Optimizer rail | the mockup shows no engine picker, defence contract or hard minimums; they are real functionality, so they are given the rail's own language rather than hidden |

### Stats specifics

Left rail (`BuildRail.tsx`) follows the mockup's order: Build name → Identity →
Main/Sub class → Modifiers → Saved builds → Templates → Reset. Class slots are a
**base select with the promotion nested beneath it** under an elbow rule.

Template badges show the stat that most *distinguishes* a template, not its
highest — every template invests heavily in SKI and VIT, so "highest" badges
Rogue as SKI. Measuring against the mean across templates yields STR / WIL / LUC,
matching the mockup.

Right rail (`ResultRail.tsx`): HP and FP as headline readouts with fill bars,
then Defense and Offense as 2×2 grids, Elemental ATK as per-element bars with
`ATK · RES` columns, and Utility as chips.

The centre's expanded stat row renders the real `STAT_INFO` — title, paragraphs
and effect list — not a one-line summary.

**Class picker retained.** The mockup replaces `ClassFamilyPicker` with plain
selects, which show none of the per-class stat bonuses or valid weapons. It is
kept as a compact "Browse" trigger in each class slot header, restyled to the
deck's language. Its keyboard behaviour is covered by `scripts/browser-smoke.mjs`.

**Import / Export** lives in the header bar. Without it the saves dialog has no
route, since the rebuilt left rail dropped the old button row.

**Elemental ATK & RES adjusters.** The manual ±99 overrides feed
`buildEvaluation` as `manualAdjustment` and are persisted, but `ElementalPanel`
had been extracted during the rebuild and never mounted — leaving state that
could be loaded and saved but no longer changed. It now lives in the advanced
dialog's Elemental section. The right rail marks an adjusted element with `±`
and its header doubles as the route in, because a manual override is otherwise
invisible in the total.

### Dialogs

Every dialog now uses `DeckDialog` — Talents, the four build dialogs, and
**Saves & Sharing**, which was the last screen still wearing the old modal (a
`bg-black/75` backdrop, a saturated colour per action, no keyboard handling). Its
buttons follow the chrome rule: one periwinkle primary per section, everything
else neutral with a raised border on hover.


`DeckDialog` owns the modal chrome: backdrop, sticky header, Escape, focus return
to the opener, `role="dialog"` + `aria-modal`. Talents and Advanced previously
carried a copy each of a legacy shell with no keyboard handling.

**One chip, one dialog.** The rail's five chips each open their own dialog with
its own title: Talents, Legend Extend, Astrology, Elemental (`BuildDialogs.tsx`)
and Advanced. They were briefly sections of a single "Advanced Options" modal
reached by five chips, but a dialog headed "Advanced Options" is a poor answer to
a button marked "Astrology". `AdvancedDialog` keeps `sections` + `initialSection`
for its own two groups (Character, Custom stats).

Gotcha: `aria-pressed={legendExtend[key]}` ships **no attribute at all** until the
key is first toggled, because React omits `undefined` attributes. Coerce with
`Boolean()` on any toggle backed by a sparse record.

### Weapon specifics

The mockup's **upgrade points** did not exist in the app — it had a single blanket
`upgradeLevel` that raised power, crit and hit together. Built as a real feature:
`upgradePoints` (power / critical / accuracy / durability).

**There is no upgrade budget.** The mockup showed one and it was built, but the
game imposes no spend limit, so it was removed for both weapons and armour: points
are bounded only by being non-negative, and the readout says "N spent" rather than
"N of 5 left". `upgradeBudget` / `armorUpgradeBudget` survive as deprecated
optional fields so build files written while a budget existed still parse — they
are ignored on read and never written, which a test in
`domain/weaponCalculation.test.ts` pins down.

The deck carries the whole weapon config: material, enchantment, the three part
slots (optgrouped by the slot they fit), rarity, mutually-exclusive weight
modifiers, quality flags, the 2H rank and **custom stat scaling** — eleven percent
fields seeded from the weapon's own scaling, with a reset. `customScaling` already
drove `evaluateWeaponSlot`; it simply had no editor outside the legacy calculator.
Only the two-config comparison remains there.

The weapon deck has two "Reset" buttons (scaling, upgrade points). Both carry
distinct `aria-label`s — match on those, not on the visible text.

**Weapon scaling sums every entry.** `Weapon.scaling` is an array because a weapon
can scale several ways at once and the game adds them together. `scalingForWeapon`
read only `scaling[0]`, silently halving **32 weapons — 43 of the 53 tomes among
them**. Amplifyia is `[{Electrical, wil 25, luc 35}, {Dextria-Lightning, wil 25,
luc 35}]`: WIL 50 / LUC 70, not 25 / 35.

The legacy `WeaponCalculator` had this right all along ("Combine all scaling
values if multiple scaling types exist"), which is why the discrepancy was visible
by comparing the two screens. `domain/equipmentScaling.test.ts` now pins the
summation against the data for every multi-entry weapon. The deck's summary line
names each scaling type and quotes the summed totals for the same reason.

**APT is a scaling stat.** `customScaling` was `Omit<StatRecord, 'apt'>` and
`evaluateWeaponSlot` filtered APT out of both its contribution sum and its
primary-stat test, so a weapon that scales off Aptitude was unrepresentable.
`SCALING_STATS` now carries all twelve — note the list *and* the type both had to
change; widening the type alone silently kept eleven fields.

**Slot B** drives the comparison: it is scored through the same
`evaluateWeaponSlot` as slot A, so the result rail's A / B / Δ columns are
comparable by construction rather than by a parallel implementation. Enabling it
seeds slot B from slot A so the first comparison is like-for-like.

### The legacy calculators are gone

`WeaponCalculator` (1809 lines) and `ArmorCalculator` (335 lines) were deleted
once the decks covered everything they did. The decks are now the only
implementation:

| Was in the legacy panel | Now |
| --- | --- |
| Armour properties, stat bonuses, resistances, special and conditional effects | `ArmorDetailRail` |
| Material, enchantment, parts, rarity, weight, quality, 2H rank, custom scaling, two-config comparison | `WeaponDeck` |

Two things had to move first, and are worth knowing about:

- `ScreenshotView`'s legacy sheet embedded a **read-only `WeaponCalculator`** for
  the resolved weapon stats. It now renders `WeaponResultRail`, which shows the
  same figures from the same `evaluateWeaponSlot` call.
- `Select.tsx` carried a comment pointing at `ArmorCalculator` for a popup
  pattern; the pattern is described in place instead.

**`upgradeLevel` deliberately survives** on `WeaponSlotConfig`. It is the
deprecated blanket-upgrade field, and `resolveUpgradePoints` is its only reader —
but that reader is what migrates builds saved before upgrade points existed.
Dropping it would silently lose those builds' weapon upgrades, so it stays until
no such files are in circulation.

Existing builds are preserved exactly: `resolveUpgradePoints()` maps a legacy
`upgradeLevel: N` to N in each of power, critical and accuracy — which is what the
old uniform value did — and `resolveUpgradeBudget()` widens the budget so a
migrated build is never over-spent. Both are covered by tests in
`domain/weaponCalculation.test.ts`.

**Durability** has no weapon data anywhere, so it is `BASE_DURABILITY` (30) plus
durability points. The mockup's own note ("base durability is set in Tweaks")
implies a setting rather than per-weapon data, so this matches its intent.

### Armor specifics

Three panes: `168px` class filter (narrower than the stats rail — pass
`leftWidth="narrow"` to `CommandDeck`), sortable table, `330px` detail.

Armour got the same upgrade-point treatment as weapons — `armorUpgradePoints`
(armor / magic armor / evade / durability) on `BuildEquipmentState`, applied in
`evaluateBuild`. Builds saved before the feature simply have none, which is
covered by a test asserting their derived stats are byte-identical.

The **effect-on-build** column needs a baseline, so `useCalculatorState` exposes
`buildEvaluationWithoutArmor` — the same build re-evaluated with no torso. The
battle-weight advisory flips to a negative-toned "Over battle weight by N" when
`battleWeightRemaining` goes negative.

**Conditional effects** live in the detail rail, off by default, showing their
stat deltas as chips once claimed. Only the 11 Unarmored "Gi" armours have any —
worth knowing when testing, since Heavy and Light show no such section.

**Armour material** is a first-class field: `equipment.armorMaterial`, persisted,
applied in `evaluateBuild`, and picked from the detail rail. SL2 crafts armour
from the same materials as weapons, so `domain/armorMaterials.ts` reads the names
straight out of `weapon-modifiers.json` rather than duplicating them.

The **effects** differ, though — a weapon material moves power/crit/hit/weight, an
armour material moves armour/magic armour/evade/weight — and those values are not
in the repo. `ARMOR_MATERIAL_MODIFIERS` therefore starts empty and every material
resolves to no change, so the choice is recorded and saved without inventing
balance numbers. Filling that table in is the only step needed to make materials
live; nothing else has to change.

**Armour enchantment** works the same way, in `domain/armorEnchantments.ts`, with
one difference: part of the shared table genuinely transfers. `weight` and
`weightMod` describe the enchantment's effect on the *item*, so Feather halving a
torso's weight is the same mechanic as Feather halving a sword's — those are
applied and verified. `power` / `crit` / `hit` do not transfer; the armour-side
armour/magic-armour/evade effects live in `ARMOR_ENCHANTMENT_OVERRIDES`, empty for
the same reason as materials.

**Persistence gap fixed:** `parseBuild` was dropping `armorUpgradePoints`
entirely, so a saved build came back with its torso upgrades reset. It and
`armorMaterial` are now both parsed.

### Screenshot specifics

Grid `1fr 300px` — narrower than every other right rail, hence `rightWidth="narrow"`.

The card is `w-[520px] max-w-full`. On desktop that is the design's fixed 520px,
so the captured PNG is identical whatever the window size. **On mobile it is not** —
`max-w-full` shrinks it to the viewport, so a phone exports a narrower image than
a desktop. That keeps it from being clipped, but it does mean shared images are not
a consistent size across devices. Worth deciding on deliberately.

Three formats off one card:

| Format | Adds |
| --- | --- |
| Summary card | stat grid + derived row only |
| Full sheet | Allocation (12 rows, `40px 1fr 36px`) and Loadout |
| Build code | the encoded share string, mono 10px |

The stat grid's hairlines come from `gap-px` over a lighter ground rather than
per-cell borders, matching the mockup's `gap: 1px; background: #1a2130`.

**Copy build code** copies the encoded string itself, not a share URL — the two
are different things and the mockup's label means the former. Encoding throws
when a build exceeds the URL budget; that is a normal outcome and the card says
so rather than surfacing an error.

### Optimizer specifics

The headline number on a candidate card is the **goal metric's value**, not the
engine's internal `score` — in the mockup "#1 67" equals that same card's
"Power 67" chip. Resolved via `goalMetricOf()`: the most heavily weighted metric
in the selected preset's `metricWeights`.

The tab owns everything the optimizer can do; nothing is folded away:

| Column | Contents |
| --- | --- |
| Rail (`OptimizerGoals` + `OptimizerControls`) | goals, engine, AI brief, search scope, defence contract, hard minimums, reference evidence |
| Centre (`OptimizerResults`) | run/cancel, ranked candidates, candidate status, equipment, current-vs-proposed, then "Why this allocation" |

`OptimizerControls` is sized for the 268px rail — 232px of usable width, labels
above controls, numerics right-aligned in a fixed 58px box. Its own primitives
(`RailField` / `RailSelect` / `RailNumber` / `RailCheck`) exist because the
`design/` form controls are built for full-width panels. The AI section keeps the
neutral chrome rule: **no per-feature hue**, only the periwinkle `info`.

Two derived-state rules worth keeping:

- Reference profiles are filtered by main class, and the chosen id survives a
  class change. `useOptimizer` therefore honours the selection only while it is
  still applicable — otherwise a Ghost profile would tie-break a Mage search
  while the picker, which no longer lists it, read "None".
- The run button names the engine (`Run V2 optimizer`, `Plan with AI`), so the
  rail's engine choice is legible from the centre column.

## Not yet built

- Stats left rail: build name, base+promotion class pairs, Templates, Saved list
- Stats right rail: HP/FP hero cards, Defense/Offense split, elemental bars
- Weapon: "Compare two configs" (parts, custom scaling and comparison remain in
  the legacy calculator behind a disclosure)
- Screenshot: the mockup's "Compare" and per-format 2× render pipeline (Download
  PNG uses the existing single-scale html2canvas path)
- Armor: enchantment select (no data model), conditional effects remain in the
  legacy calculator behind a disclosure


## Testing note

The browser suites share one live app instance, so a suite that equips armour or
spends points changes what the next one sees. Each now **sets up its own
preconditions** rather than inheriting them — the last offender was the monoclass
assertion, which read a body snapshot taken before it had matched the classes. All
sixteen suites pass in sequence; a suite failing in a run but passing alone means
a missing precondition, not a flake to shrug at.

Two recurring traps, both of which produced false failures:
- Labels are **CSS-uppercased**, so `innerText` reads `ARM`, not `Arm`.
- React re-renders **asynchronously** — re-read an attribute after a tick, never
  immediately after `.click()`.

## Gotcha worth remembering

`<details>` keeps its children mounted while collapsed, so anything with a
mount-time side effect runs immediately. The legacy weapon calculator pushes its
config upward on mount, which silently overwrote the shared weapon with a nameless
one. Use `<Disclosure>` from `CommandDeck.tsx`, which only mounts on open.

## Variant 1c — mobile

Below **1024px** `MobileDeck` renders instead of `CommandDeck`. The two are
**mutually exclusive**, chosen by `useMediaQuery`, not toggled with
`hidden`/`lg:block` — both carry `id`s, `role="tab"`s and form controls, and two
copies in the DOM would duplicate every one of them.

| Region | Contents |
| --- | --- |
| Header (pinned) | build name → tap to expand identity; points remaining + bar; five-up HP / FP / Evade / Hit / Lv strip |
| Body (scrolls) | the stat list, or the active tab's content |
| Bottom bar (pinned) | five tabs, `min-height: 52px` |

The shell is `h-[100dvh] overflow-hidden` and the page drops its padding on
mobile, so only the body scrolls. Without that the shell extended past the fold
and took the "sticky" bottom bar with it.

**Touch targets are pinned in px, not rem.** `index.css` sets `html { font-size:
14px }` below 640px, so a rem-based `h-11` renders 38.5px — under both the
mockup's 44px and the WCAG minimum. `h-[44px]` is deliberate; don't "tidy" it back
to a scale class.

Stat rows stack (name + value + bar on the left, ± steppers right) rather than
using the desktop's four-column grid, which cannot hold at 390px. Steppers share
`useHoldRepeat`, so press-and-hold behaves the same on both shells.

Tab bodies are passed in as `children` from `SL2Calculator`, so Weapon, Armor,
Optimizer and Screenshot render from the same components on both shells.

### Mobile corrections

Three things the desktop shell hid:

- **Armour needs a card layout.** `ArmorTable` takes `layout="cards"`; its six-column
  table needs ~600px, and at 390px the name column collapsed to a few characters
  with the figures stripped of their headers. Cards give each armour its full name
  and label every number.
- **The build dialogs need their own route.** Talents / Legend Extend / Astrology /
  Elemental / Advanced live as chips inside the mobile identity panel — the header's
  settings button opens Saves & Sharing, which is a different thing.
- **Stat rows expand in place on both shells.** The legacy `showStatInfo` modal was
  still wired to mobile's stat tap. It is deleted: the design never opens a modal
  for a stat description, and `AllocationPanel` had already stopped using it, so
  mobile was its only remaining caller.

**No horizontal slide.** `overflow-y-auto` makes `overflow-x` compute to `auto`,
so the mobile body was a horizontal scroll container that slid as soon as any
child exceeded the viewport — a stray few pixels was enough. The body is pinned
`overflow-x-hidden overscroll-x-none`, and the header, bar and shell are
`w-full` + `overflow-hidden`. Genuinely wide content must scroll inside its own
container, never the page. `overflow-check.mjs` asserts zero slide at
320/360/390/414/768/1000px on every tab.

**Swipe between tabs.** `main` carries touch handlers: swipe left for the next
tab, right for the previous, with hard stops at both ends rather than wrapping —
the gesture should match the bar's visible order.

Three guards, because a swipe handler that fires on scrolls is worse than none:

| Guard | Rule |
| --- | --- |
| Distance | `|dx|` must exceed 60px |
| Dominance | `|dx|` must exceed `|dy| × 1.5`, so vertical scrolls and diagonals are ignored |
| Nested scrollers | the gesture is dropped if it began inside an element that scrolls horizontally |

Nothing scrolls horizontally on mobile today — armour uses cards and the share
card is `max-w-full` — but the third guard means adding a wide table later will
not silently have its pan hijacked. `swipe-check.mjs` covers all three, plus both
end stops.
