import { useEffect, useState } from 'react';

/**
 * Subscribe to a media query.
 *
 * The mobile and desktop shells are rendered *exclusively* rather than toggled
 * with `hidden`/`lg:block`, because both carry `id`s, `role="tab"`s and form
 * controls: two copies in the DOM would duplicate every one of them.
 *
 * Starts `false` so the server/first paint matches the desktop deck, then
 * corrects on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The mockup's 1c is a 390px phone; the deck's three columns need ~1024px. */
export const MOBILE_QUERY = '(max-width: 1023px)';
