# Review: de-signposting pass over the SL2 Calculator

This pass removed the markers that made the source read as machine-written, and
removed the decorative UI features that read the same way. It changed prose,
punctuation, a handful of visible strings and one set of CSS layers. **It changed
no logic.** 155 files were touched across `src/` (133), `scripts/` (19) and
`server/` (3). A closing patch then cut the 0.8.0 release, covered in section 9.

Verified after the change: `npm run check` (data validation, both typechecks, 636
tests in 36 files) passes, `npm run build` succeeds, and both shells were loaded
in a real browser over CDP with zero console errors.

---

## 1. What the tells were

Four distinct signals, in descending order of how loudly they read:

| Signal | Count before | Count after |
| --- | --- | --- |
| Em-dash asides in prose | 819 | 0 |
| Comments restating the code below them | 48 | 0 |
| Boilerplate file headers | 4 | 0 |
| Decorative UI layers with no product purpose | 6 | 0 |

The em-dash was the dominant one. Every explanatory aside in the codebase used
`X — Y`, in comments *and* in user-facing hint text, which is the single most
recognisable signature of generated prose.

---

## 2. Punctuation: how the rewrite works and where

### Where

`src/`, `server/` and `scripts/`: every `.ts`, `.tsx`, `.mjs` and `.css` file.
All 692 dashes in block comments, 127 in string literals and JSX text, and the
remainder in `//` line comments and CSS `/* */` blocks.

### How

The dashes could not be swapped one-for-one, because a dash and the clause it
introduces are usually split across wrapped lines. So the work ran on whole
**units of prose**: a paragraph, or a single list item with its indented
continuation lines. Each unit was un-wrapped, rewritten, and re-wrapped at the
width it already used, which keeps the diff local to the sentences that changed.

Punctuation was chosen by what follows the dash, not by a blanket substitution:

| The aside is… | Becomes | Example |
| --- | --- | --- |
| introduced by a conjunction | comma | `…allowances — one each…` → `…allowances, one each…` |
| a cross-reference | semicolon | `…instead — see itemSets` → `…instead; see itemSets` |
| a full clause with its own subject | full stop (or semicolon, ~1 in 4) | `…number — they are modelled…` → `…number. They are modelled…` |
| a short gloss | comma | `…never both.` |
| a longer gloss | colon | `Not an item property: G6 and Korvara are…` |
| a matched pair around an aside | parentheses | `…status (a Nerhaven buff, a borrowed stat line) belongs here…` |

The distribution matters as much as the correctness. Defaulting everything to a
colon is as mechanical as the dashes were, so the final mix is **44% comma, 33%
colon, 11% full stop, 6% semicolon**, with parentheses for matched pairs. Among
full clauses the full-stop/semicolon choice is keyed to a hash of the sentence,
so it varies but is stable across runs.

### Dashes that were deliberately kept

Three regex character classes in `scripts/build-set-data.mjs` (lines 49, 50, 61)
match em-dashes in scraped wiki text, so changing them would break parsing. Twelve
bare `—` glyphs remain as empty-value placeholders in the UI (`'— Empty —'`,
`— Select a weapon —`, and `—` in table cells with no value), which is ordinary
typographic convention rather than a tell.

---

## 3. Comments that restated the code

Concentrated almost entirely in two legacy files.

**`src/types.ts`** carried a docblock over most interfaces that only repeated the
interface name: `/** Race configuration interface */` above `interface RaceConfig`,
and eleven more like it (17 sites in all). Those were deleted. Two were replaced
with something the signature does not say:

```ts
/** The serialised shape of a build: what import and export round-trip. */
export interface BuildData {
```

The same file had two 3-line ruler boxes (`/* ---- */ / /* Skills */ / /* ---- */`).
Those were folded into the right-aligned single rule the rest of the codebase
already uses (`/* ------- skills */`). Note the 91 other right-aligned rules were
**left alone**, being a distinctive house style rather than a tell.

**`src/useCalculatorState.ts`** narrated itself line by line:
`// Check if the class is already a base class` above
`if (CLASS_HIERARCHY[className]?.baseClass)`, and `// Comprehensive validation
before adding` above code that validates nothing on its own. 30 comment sites in
this file were cleaned up: most deleted outright, and the rest rewritten to keep
the information and drop the narrating prefix:

```diff
-    // Handle special races with SAN-scaled resistances
+    // Umbral and Papilion each trade a resistance against its opposite weakness,
+    // and SAN erodes both ends of the pair.
```

Comments that genuinely document game rules were kept: the hard-cap formula at
`useCalculatorState.ts:993`, the DOM side-effect notes, the font-loading reason
in the screenshot path.

**File headers.** `SL2Calculator.tsx` and `useCalculatorState.ts` both opened
with `SL2 Calculator - Extended Version / Added features: Class Passives, Rising
Game, Instinct, Subrace support`, a changelog masquerading as documentation.
Replaced with one line each saying what the file is. `armors.ts` and `colors.ts`
had the same shape and got the same treatment.

---

## 4. Visual features removed

You confirmed classic is deprecated and Aether is the visual standard, so
anything decorative that existed only in classic went.

**Deleted `src/SparkleBackground.tsx`** (210 lines). It painted a full-viewport
canvas behind the calculator: three parallax layers of twinkling stars, two
drifting nebula gradients, and randomly spawned meteors with gradient trails. It
ran a `requestAnimationFrame` loop for the life of the page. Its own comments
gave it away (`// Density tuned for performance and vibe`).

**Trimmed `src/index.css`:**

- `body` had a three-stop gradient on a 300% background running a 24s
  `gradientShift` animation. Now the flat `#07090e` the design tokens specify.
- `body::before` was a fixed full-screen layer of three radial gradients on a
  20s `float` animation. Removed.
- `.text-gradient` clipped an indigo→violet→green gradient to text and cycled it
  on a 3s infinite loop. It was on the classic `<h1>` and the screenshot export
  title. Both now render in `text-content-bright`.
- Dead decorative rules nothing referenced: `.shine` (a 3s sweeping highlight),
  `.card-hover` (lift-and-glow on hover), `.glass-effect`, `.sparkle-*`,
  `.btn-ripple` and its 11-line comment explaining why it was already disabled.
- `button` had `position: relative; overflow: hidden` purely to clip the ripple,
  plus `transition: all 0.3s`. Now transitions only the three properties that
  actually change.

**Kept:** the Konami-code fox rain (`FoxRain.tsx`) is a deliberate easter egg
behind a cheat code, not a generated flourish. The Aether `Backdrop.tsx` ambient
layer and the FFXIV-homage intro are considered design work, and Aether's own
animations (`sheen`, `value-flash`, `modal-in`) are ordinary UI polish.

---

## 5. A real defect found on the way

The armour/armor spelling was inconsistent **in the product**, not just in
comments. `src/ArmorDeck.tsx` rendered a column header `'Armor'` and, in the same
panel, body copy reading `No armour matches.`, plus `aria-label="Armour material"`
next to `armor.type`. SL2 itself spells it "Armor".

20 user-visible occurrences were aligned to the game's spelling across
`ArmorDeck.tsx`, `HitChanceDialog.tsx`, `armoryTuning.tsx` and `readout.ts`, and
the channel label `'Magic armor'` became `'Magic Armor'` to match its sibling
`'Armor'`.

**Scope note:** British spelling in *comments and test descriptions* was left as
it is. A developer writing British prose beside an American API is completely
ordinary, and rewriting 182 comments would have been churn with no benefit. Only
text a user actually reads was changed.

---

## 6. What I did not change, and why

- **Comment density (16%, 65 blocks over 12 lines).** High for a typical
  codebase, but this one documents game formulas whose rationale is not
  recoverable from the code: why Install preserves FAI/SAN/APT, why enchantment
  slot clauses are alternatives rather than sums. Cutting it would remove the
  codebase's real value. Flagging it as an observation rather than acting.
- **The 91 right-aligned section rules** (`/* ------- scaling */`). Consistent,
  unusual, and clearly deliberate.
- **British spellings in comments.** See above.
- **Local variables named `colour`** sitting next to the CSS `color` property.
  Consistent authorial voice.

---

## 7. Two things worth knowing about this repo

Both cost me time and are worth recording:

1. **The working tree is almost entirely uncommitted, and HEAD is far behind.**
   `src/types.ts` is 1577 lines in the tree and 730 at HEAD. I ran
   `git checkout src/types.ts` early on intending to undo one pilot edit, and it
   discarded ~850 lines of your real work. I recovered it in full from a backup
   I had taken a moment earlier, and verified the restore (1577 lines, all 34
   original dash sites present) before continuing. Nothing was lost, but
   `git checkout`/`git restore` are unsafe here until this branch is committed.

2. **Eight files use CRLF** (`AppHeader.tsx`, `SL2Calculator.tsx`,
   `ScreenshotView.tsx`, `index.css`, `AttributesRail.tsx`, `StatPanel.tsx`,
   `armors.ts`, `colors.ts`) while the rest use LF. My scripts flattened them and
   I restored them, but any bulk tooling here needs to preserve per-file endings
   or it will produce whole-file diffs.

---

## 8. Verification

```
npm run check
  Data valid: 339 weapons, 63 armors, 224 gear items, 951 skills, …
  tsc --noEmit                        clean
  tsc -p tsconfig.server.json         clean
  Test Files  36 passed (36)
  Tests      636 passed (636)

npm run build                         built in 2.43s

Aether  (127.0.0.1:5173/)             5 panels, 12 stats, 20 readouts, no console errors
Classic (127.0.0.1:5173/classic.html) 64 buttons, 7 selects, no console errors
                                      canvases: 0 · sparkle: false
                                      body background-image: none · animation: none
```

Beyond the test suite, three audits ran over every line the rewrite touched,
comparing against a pre-change snapshot:

- **Awkward punctuation** (double colons, stray spacing, unbalanced parens). All
  13 remaining flags are colons inside quoted game text, e.g.
  `Warding is "Armor: +5 Resistance. Legs: +3 Resistance"`.
- **Comma splices**, a real risk when a dash becomes a comma. Six flags, all
  false positives (serial lists and introductory phrases).
- **List structure.** This caught a genuine bug mid-pass. The first version of
  the reflow folded a bullet into the paragraph above it, mangling the
  `youkai.ts` header. I fixed the reflow to treat a list item as its own unit
  with a hanging indent, then replayed the entire pass from the snapshot so no
  output from the buggy version survived. Verified: bullet counts now match the
  original in every file.

---

## 9. Version 0.8.0 and its release notes

### Why the version needed a home

The app carried its version in two places that nothing kept in step
(`package.json` and a hard-coded `APP_VERSION` string), and the only changelog it
surfaced was `game-data.json.changes` behind a dialog titled "Data changes".
That list tracks the **data** version, which moves independently of the app, so
it was the wrong home for release notes.

### What was added

- **`src/data/app-release.json`** now holds the version, release date, a headline
  and the itemised notes. `buildPersistence` derives `APP_VERSION` from it, so
  the badge and the notes can no longer disagree.
- **`CHANGELOG.md`** at the repo root, with the full 0.8.0 entry split into
  Added / Changed / Fixed / Internal.
- **The version badge now opens release notes.** Both shells' dialogs were
  retitled "What's new" and show two sections: this release, then the game data
  changes they showed before. The classic dialog also gained a scroll container,
  since the combined list is longer than the viewport.
- **A drift guard in `npm run validate:data`.** It fails if `app-release.json`
  and `package.json` disagree about the version, and prints `App vX · data Y` on
  success. Confirmed by deliberately setting `package.json` to 0.8.1:
  `app-release.json.version: is 0.8.0 but package.json says 0.8.1`.

### What the notes cover

Everything since 0.7.0, which I established by diffing the tree against HEAD and
against the 0.7.0 data changelog: the Aether Codex sheet, talents and Adaptation
weapon access, the status catalogue, the hit/evade model and source provenance,
the opponent gauntlet, slot upgrade tracks, G6/Korvara worlds, the mobile layout,
and the AI optimizer. Two user-facing results of the editorial pass are listed
too (the armor spelling fix and the removed classic backdrop); the rest of that
pass is one line under Internal.

### Verified in the browser

Badge clicked in both shells over CDP. The dialog opens with 26 bullets across
the two sections, the headline and both lists present, and no console errors.
The masthead reads `V0.8.0 · DATA 2026.08.14`.

One note: `apply.py`, the tool I used for exact-substring edits, was silently
rewriting CRLF files to LF. I found it when a `SL2Calculator.tsx` edit failed to
match, fixed the tool to normalise for matching and restore the original endings
on write, and confirmed all four touched files kept their endings.
