// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { importBuild, renderApp, showcaseBuild } from './testing';

// Only exists inside a Vite build with the PWA plugin.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));

const showcaseName = JSON.parse(showcaseBuild).buildName as string;

describe('equipment picker', () => {
  it('equips a weapon from the armory and offers to unequip it', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /Main Hand/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search items for Main Hand' }), 'Longsword');
    await user.click(within(dialog).getByText('Longsword', { selector: '.entry__name' }));
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Main Hand/ }).textContent).toContain('Longsword');
    expect(screen.getByRole('button', { name: 'Unequip Longsword' })).toBeTruthy();
  });
});

describe('import and export', () => {
  it('loads a build file and exports it back', async () => {
    const { user } = renderApp();
    const dialog = await importBuild(user, showcaseBuild);

    expect((screen.getByRole('textbox', { name: 'Build name' }) as HTMLInputElement).value).toBe(showcaseName);

    await user.click(within(dialog).getByRole('button', { name: 'Refresh' }));
    const exported = JSON.parse((within(dialog).getByRole('textbox', { name: 'Build JSON' }) as HTMLTextAreaElement).value);
    expect(exported.buildName).toBe(showcaseName);
    expect(exported.build.mainClass).toBe('Ghost');
    expect(exported.build.equipment.primaryWeapon.selectedWeaponName).toBe('Dynaxis');
  });

  it('keeps the current build when the pasted text is not a build file', async () => {
    const { user } = renderApp();
    const dialog = await importBuild(user, showcaseBuild);
    await user.click(within(dialog).getByRole('button', { name: 'Close Esc' }));
    await importBuild(user, '{"not": "a build"}');

    expect((screen.getByRole('textbox', { name: 'Build name' }) as HTMLInputElement).value).toBe(showcaseName);
    expect(document.querySelector('.notice--bad')).toBeTruthy();
  });
});

describe('share links', () => {
  it('round-trips a build through a copied link', async () => {
    const first = renderApp();
    const dialog = await importBuild(first.user, showcaseBuild);
    await first.user.click(within(dialog).getByRole('button', { name: 'Copy share link' }));
    const link = new URL(await navigator.clipboard.readText());
    expect(link.hash.startsWith('#build=')).toBe(true);

    cleanup();
    localStorage.clear();
    window.history.replaceState(null, '', `/${link.hash}`);

    const second = renderApp();
    const offer = screen.getByRole('dialog', { name: /Shared build/ });
    await second.user.click(within(offer).getByRole('button', { name: 'Load this build' }));

    expect((screen.getByRole('textbox', { name: 'Build name' }) as HTMLInputElement).value).toBe(showcaseName);
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('button', { name: /Main Hand/ }).textContent).toContain('Dynaxis');
  });
});
