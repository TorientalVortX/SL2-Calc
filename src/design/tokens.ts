/**
 * SL2 design tokens — the single source of truth for colour.
 *
 * Consumed by `tailwind.config.ts` (which spreads these into `theme.extend.colors`)
 * and importable directly by components that need a raw value for an inline style.
 *
 * ── Palette: "Calculator UI improvement", Turn 1 ─────────────────────────────
 * Every value below is lifted from the design document's inline styles. It is a
 * cool slate-indigo scale on a near-black ground, replacing the previous
 * Tailwind-gray/blue palette wholesale.
 *
 * The design's central colour decision is *restraint*: chrome is neutral, one
 * periwinkle accent carries interaction, and domain meaning is carried by the
 * data itself (`STAT_COLORS` / `ELEMENT_COLORS` in `data/colors.ts`). Its Armor
 * and Optimizer screens use no feature-area accent at all — see the note on the
 * unspecified ramps further down.
 */

/** Backgrounds, darkest to lightest. */
export const surface = {
  /** Page ground, behind everything. */
  void: '#07090e',
  /** Deepest wells: inset code blocks, modal scrims, table stripes. */
  sunken: '#0a0e16',
  /** Dialog and section ground. */
  base: '#0d1320',
  /** The standard panel/card — the most common background in the design. */
  raised: '#121826',
  /** Interactive control resting state: inputs, neutral buttons. */
  control: '#131a26',
  /** Header and toolbar bars sitting above a panel. */
  bar: '#0f1420',
  /** Control hover, and chips nested on a panel. */
  elevated: '#1a2130',
  /** Pressed / selected control. */
  active: '#1e2739',
  /** Selected row or tab, tinted toward the accent. */
  selected: '#2a3350',
} as const;

/** Border colours. `DEFAULT` is the workhorse — 68 uses in the design. */
export const edge = {
  DEFAULT: '#232c3f',
  /** Quiet dividers between rows and panel sections. */
  subtle: '#1a2130',
  /** Alternate quiet divider, slightly cooler. */
  muted: '#1d2536',
  /** Faintest hairline, for dense tables. */
  faint: '#151c29',
  /** Hover/emphasis border. */
  strong: '#2c3648',
  /** Highest-contrast neutral border, for focused controls. */
  emphasis: '#4a5573',
} as const;

/** Text colours. */
export const content = {
  /** Headings and primary copy. */
  DEFAULT: '#e6ebf5',
  /** Numeric values and emphasised body — the design's "loud" text. */
  bright: '#dbe2ef',
  /** Secondary copy. */
  secondary: '#9aa6bf',
  /** Labels, captions, metadata — the most common text colour in the design. */
  muted: '#7c89a4',
  /** Hints and de-emphasised helper text. */
  faint: '#56627b',
  /** Breakdown maths, units, and anything that must recede entirely. */
  ghost: '#4e5a72',
} as const;

/**
 * Semantic role ramps.
 *
 * Each ramp shares one shape so they are interchangeable at a call site:
 *   DEFAULT — foreground text/icon on a dark ground   (`text-positive`)
 *   soft    — lower-contrast foreground variant       (`text-positive-soft`)
 *   strong  — highest-contrast foreground variant     (`text-positive-strong`)
 *   edge    — border for a tinted container           (`border-positive-edge`)
 *   bg      — tinted container fill, usually with an
 *             opacity modifier                        (`bg-positive-bg/20`)
 *   solid   — filled button resting state             (`bg-positive-solid`)
 *   hover   — filled button hover state               (`hover:bg-positive-hover`)
 *   ring    — focus ring                              (`focus:ring-positive-ring`)
 */

/** Periwinkle — the single UI accent: primary actions, links, selected tabs. */
export const info = {
  DEFAULT: '#8b8dff',
  soft: '#b3b5ff',
  strong: '#d5d6ff',
  edge: '#35406a',
  bg: '#2a3350',
  solid: '#8b8dff',
  hover: '#b3b5ff',
  ring: '#8b8dff',
} as const;

/** Mint green — gains, validated candidates, positive deltas. */
export const positive = {
  DEFAULT: '#6ee7a5',
  soft: '#34d399',
  strong: '#a7f3d0',
  edge: '#1f5741',
  bg: '#0c2a1e',
  solid: '#1f7a55',
  hover: '#26996a',
  ring: '#6ee7a5',
} as const;

/** Red — losses, errors, destructive and cancel actions. */
export const negative = {
  DEFAULT: '#ef7a7a',
  soft: '#ff8f8f',
  strong: '#ffc4c4',
  edge: '#6b2626',
  bg: '#2c1116',
  solid: '#a33636',
  hover: '#c74444',
  ring: '#ef4444',
} as const;

/** Amber — warnings, unmet minimums, "requires verification". */
export const caution = {
  DEFAULT: '#fbbf24',
  soft: '#fcd34d',
  strong: '#fde68a',
  edge: '#6b4d12',
  bg: '#2a1f08',
  solid: '#9a7314',
  hover: '#c2901a',
  ring: '#fbbf24',
} as const;

/**
 * ── Ramps the design does not specify ────────────────────────────────────────
 *
 * `ai`, `highlight`, `equip` and `magic` were derived from the *old* palette's
 * sprawl, where every feature area had its own hue. The Turn 1 design rejects
 * that: its Armor and Optimizer screens are neutral + accent only.
 *
 * They are re-derived below to sit in the new slate-indigo world rather than
 * clash with it, and kept so the ~108 existing token call sites still compile.
 * The intent is that their *chrome* uses collapse onto `info` during the layout
 * work, while genuinely data-driven uses (armour rarity tiers, element colours)
 * keep a distinct hue because there the colour is the information.
 */

/** Violet — optimizer/AI surfaces. Pending collapse onto `info`. */
export const ai = {
  DEFAULT: '#a78bff',
  soft: '#c4b5fd',
  strong: '#ddd6fe',
  edge: '#3b3168',
  bg: '#1d1738',
  solid: '#6d4fd9',
  hover: '#8b6cf0',
  ring: '#a78bff',
} as const;

/** Cyan — evidence, notes, secondary emphasis. Pending collapse onto `info`. */
export const highlight = {
  DEFAULT: '#5bd6ee',
  soft: '#8be5f6',
  strong: '#b8f0fb',
  edge: '#1b4a5c',
  bg: '#0a2430',
  solid: '#1a7994',
  hover: '#2295b4',
  ring: '#5bd6ee',
} as const;

/** Orange — armour and equipment. Retained for rarity tiers. */
export const equip = {
  DEFAULT: '#f9a03c',
  soft: '#fbbf6b',
  strong: '#fdd9a8',
  edge: '#6b431a',
  bg: '#2c1c0b',
  solid: '#a3611f',
  hover: '#c77a2a',
  ring: '#f97316',
} as const;

/** Purple — special effects and high rarity. Retained for rarity tiers. */
export const magic = {
  DEFAULT: '#c084fc',
  soft: '#d8b4fe',
  strong: '#ecd6ff',
  edge: '#4a2a6b',
  bg: '#241134',
  solid: '#7e3fbf',
  hover: '#9a52dd',
  ring: '#c084fc',
} as const;

/** Every ramp, keyed by role name — useful for iterating in stories/tests. */
export const ramps = { positive, negative, caution, info, ai, highlight, equip, magic } as const;

/** The full colour extension handed to Tailwind. */
export const colors = {
  surface,
  edge,
  content,
  ...ramps,
} as const;

export type RampName = keyof typeof ramps;
export type Ramp = (typeof ramps)[RampName];

/**
 * The design's type scale, named by pixel value.
 *
 * Lives here rather than in `tailwind.config.ts` because two consumers need it:
 * Tailwind, to emit the utilities, and `cx`, to teach tailwind-merge that these
 * are font *sizes*. When the two lists drifted, `text-20` and `text-21` were used
 * in the app but emitted no CSS at all.
 */
export const fontSize = {
  '9': ['9px', '1'],
  '10': ['10px', '1'],
  '11': ['11px', '1'],
  '12': ['12px', '1'],
  '13': ['13px', '1'],
  '14': ['14px', '1'],
  '15': ['15px', '1'],
  '17': ['17px', '1'],
  '20': ['20px', '1'],
  '21': ['21px', '1'],
  '26': ['26px', '1'],
} as const;

export const fontSizeNames = Object.keys(fontSize);
