import { useCallback, type KeyboardEvent } from 'react';
import { play } from '../state/audio';

/**
 * Arrow-key / WASD movement between the focusable items of a list.
 *
 * Attached to the container rather than each item, so a panel's rows stay plain
 * buttons and remain in the normal tab order. Items opt in with `data-nav`,
 * which lets a container hold controls that should not be walked through (a
 * search box, a header action) without them joining the list.
 *
 * `columns` makes the same handler work for a grid: vertical movement steps by a
 * row rather than by one item.
 */
export function useListNavigation(columns = 1) {
  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    const key = event.key.toLowerCase();
    const back = key === 'arrowup' || key === 'w' || key === 'arrowleft' || key === 'a';
    const forward = key === 'arrowdown' || key === 's' || key === 'arrowright' || key === 'd';
    const jump = key === 'home' || key === 'end';
    if (!back && !forward && !jump) return;

    // Typing in a field must never be hijacked into navigation.
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;

    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-nav]:not(:disabled)')];
    if (!items.length) return;
    const index = items.findIndex(item => item === active);
    if (index < 0 && !jump) return;

    const vertical = key === 'arrowup' || key === 'w' || key === 'arrowdown' || key === 's';
    const stride = vertical ? columns : 1;

    let next: number;
    if (key === 'home') next = 0;
    else if (key === 'end') next = items.length - 1;
    else next = index + (forward ? stride : -stride);

    if (next < 0 || next >= items.length) return;
    event.preventDefault();
    items[next].focus();
    play('move');
  }, [columns]);
}
