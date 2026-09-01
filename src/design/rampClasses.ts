import type { RampName } from './tokens';

/**
 * Literal class strings for every role ramp.
 *
 * These maps exist because Tailwind's content scanner reads source text, not runtime
 * values: a template literal like `` `text-${ramp}` `` produces no CSS. Every class a
 * primitive can emit must appear verbatim somewhere in the source, so it appears here.
 *
 * Adding a ramp to `tokens.ts` means adding its row to each map below; the
 * `Record<RampName, string>` annotation makes that a type error if you forget.
 */

/** Foreground, full contrast. */
export const RAMP_TEXT: Record<RampName, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  caution: 'text-caution',
  info: 'text-info',
  ai: 'text-ai',
  highlight: 'text-highlight',
  equip: 'text-equip',
  magic: 'text-magic',
};

/** Foreground, softened: the usual choice for body copy inside a tinted container. */
export const RAMP_TEXT_SOFT: Record<RampName, string> = {
  positive: 'text-positive-soft',
  negative: 'text-negative-soft',
  caution: 'text-caution-soft',
  info: 'text-info-soft',
  ai: 'text-ai-soft',
  highlight: 'text-highlight-soft',
  equip: 'text-equip-soft',
  magic: 'text-magic-soft',
};

/** Foreground, highest contrast: headings on a tinted container. */
export const RAMP_TEXT_STRONG: Record<RampName, string> = {
  positive: 'text-positive-strong',
  negative: 'text-negative-strong',
  caution: 'text-caution-strong',
  info: 'text-info-strong',
  ai: 'text-ai-strong',
  highlight: 'text-highlight-strong',
  equip: 'text-equip-strong',
  magic: 'text-magic-strong',
};

/** Border for a tinted container. */
export const RAMP_BORDER: Record<RampName, string> = {
  positive: 'border-positive-edge',
  negative: 'border-negative-edge',
  caution: 'border-caution-edge',
  info: 'border-info-edge',
  ai: 'border-ai-edge',
  highlight: 'border-highlight-edge',
  equip: 'border-equip-edge',
  magic: 'border-magic-edge',
};

/**
 * Tinted container fill.
 *
 * Standardised at 20% opacity. The pre-token UI used a spread of 15/20/25/30/50%
 * chosen ad hoc per call site; collapsing them to one value is the single
 * intentional visual normalisation in this refactor (see design/README.md).
 */
export const RAMP_TINT: Record<RampName, string> = {
  positive: 'bg-positive-bg/20',
  negative: 'bg-negative-bg/20',
  caution: 'bg-caution-bg/20',
  info: 'bg-info-bg/20',
  ai: 'bg-ai-bg/20',
  highlight: 'bg-highlight-bg/20',
  equip: 'bg-equip-bg/20',
  magic: 'bg-magic-bg/20',
};

/** Filled interactive surface plus its hover state. */
export const RAMP_SOLID: Record<RampName, string> = {
  positive: 'bg-positive-solid hover:bg-positive-hover',
  negative: 'bg-negative-solid hover:bg-negative-hover',
  caution: 'bg-caution-solid hover:bg-caution-hover',
  info: 'bg-info-solid hover:bg-info-hover',
  ai: 'bg-ai-solid hover:bg-ai-hover',
  highlight: 'bg-highlight-solid hover:bg-highlight-hover',
  equip: 'bg-equip-solid hover:bg-equip-hover',
  magic: 'bg-magic-solid hover:bg-magic-hover',
};

/** Quiet outlined interactive surface: border and text only until hover. */
export const RAMP_OUTLINE: Record<RampName, string> = {
  positive: 'border border-positive-solid/40 text-positive-strong hover:bg-positive-bg',
  negative: 'border border-negative-solid/40 text-negative-strong hover:bg-negative-bg',
  caution: 'border border-caution-solid/40 text-caution-strong hover:bg-caution-bg',
  info: 'border border-info-solid/40 text-info-strong hover:bg-info-bg',
  ai: 'border border-ai-solid/40 text-ai-strong hover:bg-ai-bg',
  highlight: 'border border-highlight-solid/40 text-highlight-strong hover:bg-highlight-bg',
  equip: 'border border-equip-solid/40 text-equip-strong hover:bg-equip-bg',
  magic: 'border border-magic-solid/40 text-magic-strong hover:bg-magic-bg',
};

/** Focus ring, for controls that opt into a coloured ring. */
export const RAMP_RING: Record<RampName, string> = {
  positive: 'focus:ring-positive-ring',
  negative: 'focus:ring-negative-ring',
  caution: 'focus:ring-caution-ring',
  info: 'focus:ring-info-ring',
  ai: 'focus:ring-ai-ring',
  highlight: 'focus:ring-highlight-ring',
  equip: 'focus:ring-equip-ring',
  magic: 'focus:ring-magic-ring',
};
