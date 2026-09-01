import { extendTailwindMerge } from 'tailwind-merge';
import { fontSizeNames } from './tokens';

export type ClassValue = string | false | null | undefined;

/**
 * `twMerge` cannot infer which custom `text-*` utilities are sizes.
 *
 * Our scale is named by pixel value (`text-10`, `text-13`), which matches none of
 * tailwind-merge's built-in size validators, so it filed them under *text colour*
 * instead, and then dropped them whenever a colour was also present. That made
 * `cx('text-10 text-content-faint')` emit only the colour, silently rendering the
 * design's 10px micro-label at the inherited 16px. Declaring the scale here is
 * what keeps size and colour in separate conflict groups.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...fontSizeNames] }],
    },
  },
});

/**
 * Join class names, resolving Tailwind conflicts in favour of the *last* value.
 *
 * The merge matters: Tailwind emits utilities in its own fixed order, so a plain
 * string join makes `cx('px-4', 'px-3')` resolve by stylesheet position rather than
 * by call order, meaning a caller's `className` could not reliably override a
 * primitive's default padding. `twMerge` drops the losing utility outright, which is
 * what makes `className` a safe escape hatch while the monoliths are migrated.
 *
 * App-specific classes (`panel-soft`, `tap-target`, `shine`) are
 * unknown to `twMerge` and pass through untouched.
 */
export function cx(...values: ClassValue[]): string {
  return merge(values.filter(Boolean).join(' '));
}
