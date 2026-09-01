import type { SlotId } from '../state/equipment';

/**
 * Slot marks, drawn as paths.
 *
 * These were emoji first (⚔ 🛡 ⬢). They rendered as tofu: the bundled Barlow and
 * JetBrains faces carry no pictographs, and whether the system fallback has them
 * is not something the page can rely on. Inline SVG always draws, scales cleanly,
 * and inherits the slot's gold through `currentColor`.
 */
const PATHS: Record<SlotId, JSX.Element> = {
  primaryWeapon: (
    <>
      <path d="M12 3 L14 6 L14 15 L12 17 L10 15 L10 6 Z" />
      <path d="M7.5 15.5 H16.5" />
      <path d="M12 17 V21" />
    </>
  ),
  slot3: (
    <>
      <path d="M12 3 L19 6 V12 C19 16.5 15.8 19.6 12 21 C8.2 19.6 5 16.5 5 12 V6 Z" />
      <path d="M12 7.5 V16" />
    </>
  ),
  armor: (
    <>
      <path d="M8 4 L12 6 L16 4 L19 6.5 L18 20 H6 L5 6.5 Z" />
      <path d="M12 6 V19" />
    </>
  ),
  legs: (
    <>
      <path d="M6.5 3 H17.5 L16.5 21 H13 L12 11 L11 21 H7.5 Z" />
    </>
  ),
  accessory1: (
    <>
      <path d="M12 4 L19 12 L12 20 L5 12 Z" />
      <path d="M12 8.5 L15.5 12 L12 15.5 L8.5 12 Z" />
    </>
  ),
  accessory2: (
    <>
      <path d="M12 4 L19 12 L12 20 L5 12 Z" />
      <path d="M12 8.5 L15.5 12 L12 15.5 L8.5 12 Z" />
    </>
  ),
};

export function SlotGlyph({ slot }: { slot: SlotId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {PATHS[slot]}
    </svg>
  );
}
