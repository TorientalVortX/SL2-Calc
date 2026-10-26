// Must match the storage key in `src/aether/state/theme.ts`.
try {
  if (localStorage.getItem('sl2:aether:theme:v1') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch (error) { /* private browsing; the dark default stands */ }
