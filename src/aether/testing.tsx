import { readFileSync } from 'node:fs';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { AetherApp } from './AetherApp';

export const showcaseBuild = readFileSync('scripts/social-preview-build.json', 'utf8');

// jsdom has no matchMedia, IntersectionObserver or scrollIntoView. Reduced motion also skips the WebGL intro.
function installBrowserStubs() {
  window.matchMedia = (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  window.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollIntoView = () => {};
}

export function renderApp() {
  installBrowserStubs();
  const user = userEvent.setup();
  return { user, ...render(<AetherApp />) };
}

export async function importBuild(user: ReturnType<typeof userEvent.setup>, json: string) {
  await user.click(screen.getByRole('button', { name: 'Import / Export' }));
  const dialog = screen.getByRole('dialog');
  const field = within(dialog).getByRole('textbox', { name: 'Build JSON' });
  await user.clear(field);
  await user.click(field);
  await user.paste(json);
  await user.click(within(dialog).getByRole('button', { name: 'Import' }));
  return dialog;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
