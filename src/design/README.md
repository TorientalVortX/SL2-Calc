# SL2 design system

The styling layer the UI is being moved onto, so a redesign means editing this folder
instead of a 3,400-line component.

```
src/design/
  tokens.ts          colour, the single source of truth. Edit here to restyle the app.
  rampClasses.ts     literal Tailwind class strings per semantic role.
  cx.ts              conflict-resolving class joiner (tailwind-merge).
  primitives/        the components below.
```

`tailwind.config.ts` imports `tokens.ts` and spreads it into `theme.extend.colors`.
Tailwind's default palette is **extended, not replaced**, so unmigrated `gray-*` call
sites still compile while they are worked through.

## Why it exists

Before this, the UI had no shared styling layer at all:

- 146 distinct colour utilities in use; `gray` alone appeared 592 times, freely mixed
  with `slate` and `zinc`.
- `tailwind.config.js` defined a `dark-*` / `accent-*` palette that had **20 total
  uses** — the tokens existed and were ignored.
- The primitives existed as copy-paste: `text-xs text-gray-400` ×40, the label
  `block text-xs font-medium mb-1` ×27, the modal backdrop ×6, the input shell ×10.
- Six modal dialogs each reimplemented a different subset of focus trapping.

## Colour: how to use it

Every colour is a **role**, not a hue. Four neutral groups plus eight role ramps.

| Group      | Keys                                                    | Was |
| ---------- | ------------------------------------------------------- | --- |
| `surface`  | `sunken` `base` `raised` `control` `elevated`            | `bg-gray-950…600` |
| `edge`     | `DEFAULT` `subtle` `strong` `emphasis`                   | `border-gray-600/700/500/400` |
| `content`  | `DEFAULT` `bright` `secondary` `muted` `faint`           | `text-white`, `text-gray-200…500` |

Role ramps — `positive` `negative` `caution` `info` `ai` `highlight` `equip` `magic` —
all share one shape, so they are interchangeable at a call site:

| Key       | Use                        | Class example |
| --------- | -------------------------- | ------------- |
| `DEFAULT` | foreground on dark         | `text-positive` |
| `soft`    | lower-contrast foreground  | `text-positive-soft` |
| `strong`  | heading inside a tint      | `text-positive-strong` |
| `edge`    | border of a tinted box     | `border-positive-edge` |
| `bg`      | tint fill                  | `bg-positive-bg/20` |
| `solid`   | filled button              | `bg-positive-solid` |
| `hover`   | filled button hover        | `hover:bg-positive-hover` |
| `ring`    | focus ring                 | `focus:ring-positive-ring` |

What each role means here: `positive` gains/validated, `negative` losses/destructive,
`caution` warnings and unmet minimums, `info` primary actions, `ai` the optimizer and
AI planner surface, `highlight` evidence and notes, `equip` armour and weapons,
`magic` special effects and rarity.

**Never build a class name from a variable.** Tailwind scans source text, so
`` `text-${role}` `` emits no CSS. Use the maps in `rampClasses.ts`; their
`Record<RampName, string>` type makes a missing row a compile error. (The codebase
already had one live instance of this bug — see *Fixed* below.)

## Primitives

| | |
| --- | --- |
| `Button` | variants `solid` `neutral` `ghost` `outline` × any ramp; sizes `xs`–`lg`, `icon` |
| `Select` | uses `fieldStyles.ts` |
| `Field` | label + control + hint as one `<label>`; no `id`/`htmlFor` pairing needed |
| `Label` | standalone label |
| `Modal` `ModalHeader` `ModalFooter` | dialog with focus trap, scroll lock, Escape, focus restore |
| `StatRow` | the repeated display shape |

`size` is spelled `fieldSize` on form controls because `<input size>` and
`<select size>` are native numeric attributes.

`cx()` uses `tailwind-merge`, so a caller's `className` reliably beats a primitive's
default — `cx('px-4', 'px-3')` yields `px-3` rather than deferring to stylesheet
order. That is what makes `className` a safe escape hatch mid-migration.

## Fidelity

Every hex in `tokens.ts` is copied verbatim from the Tailwind default palette entry
the UI already used, so adopting a token is a rename, not a restyle. This is
machine-checked: 50 old→new class pairs were compiled through Tailwind and compared
declaration-by-declaration — **50/50 identical, 0 differ**.

### Deliberate exceptions

Five normalisations were made on purpose, all imperceptible-to-minor, all worth
collapsing rather than preserving:

1. **Tint opacity** standardised at 20%. Call sites previously used 15/20/25/30/50%
   picked ad hoc (`RAMP_TINT` in `rampClasses.ts`).
2. **Tinted-border opacity** standardised at 100%; some sites used `/60` or `/70`.
3. **amber folded into `caution`** (yellow). The UI used both, ~4% apart in hue.
4. **slate folded into `surface`/`content`** (gray) in `ErrorBoundary`,
   `PwaUpdatePrompt` and `main.tsx` — three chrome screens built against a different
   palette from the rest of the app. Largest shift: `slate-950 #020617` →
   `surface-sunken #030712`.
5. **Armour rarity stars** moved from the `-600` shades to the role foregrounds
   (`-400`). At `-600` on `surface-raised` they sat near 2:1 contrast.

### Fixed

`ArmorCalculator` built `` `text-${STAT_COLORS[statKey]}-400` `` for conditional-bonus
stat values, but `STAT_COLORS` holds **hex strings** — so it emitted
`text-#ef4444-400`, which is not a class. Those values had been rendering uncoloured.
They now use the inline `style` the same file already used for its stat tiles.

## Migration status

`WeaponCalculator` and `ArmorCalculator` — which held 748 of the raw palette
utilities between them — were deleted outright once the decks covered their
features, so that migration resolved itself. `SL2Calculator` is now composition
only; the screens live in `CommandDeck` / `MobileDeck` and their panels.

**Retro mode is gone.** It was threaded as a prop through every component and
carried its own font, CRT overlay, glow borders and glitch text. All of it was
removed rather than migrated to a context: the prop, the CSS, the `Press Start 2P`
/ `VT323` faces, the settings toggle and the stored preference. The `retro` prop on
the design primitives went with it.

The Konami easter egg was gated behind retro and is a separate feature, so it
survives — ungated, and without the CRT dressing.

## Cleanup pass

Deleting the legacy calculators and retro mode orphaned a lot of the primitive
layer. Removed once nothing referenced them:

| Removed | Why |
| --- | --- |
| `Badge` `Callout` `Checkbox` `Input` `Panel` `SectionHeading` `StatTile` `Textarea` | built for the legacy weapon/armour calculators; zero consumers after those went |
| `DerivedStatsPanel` `IdentityRow` `SecondaryStatsPanel` | superseded by the deck's rails |
| `StatAllocator` | the pre-deck allocator; only its two type shapes were still used, and they moved into `AllocationPanel` |
| `@fontsource/press-start-2p` `@fontsource/vt323` | the retro faces |
| `@fontsource/inter` `@fontsource/space-grotesk` | never imported at all |

`fieldStyles` looked orphaned by a naive grep but is used *inside* `Select` — when
checking a primitive for consumers, exclude the component's own directory from the
search, not just its own file.

Still in the tree and still used: `Button` `Field` `Label` `Modal` `Select`
`StatRow` `fieldStyles`.
