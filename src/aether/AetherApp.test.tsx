// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { importBuild, renderApp, showcaseBuild } from './testing';
import { parseBuildFile } from '../domain/buildPersistence';
import { evaluateBuild } from '../domain/buildEvaluation';
import { NO_HIT, incomingDamage } from '../domain/damage';

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

describe('incoming damage', () => {
  it('shows what the current build takes from a hit, with Guard', async () => {
    const { user } = renderApp();
    const dialog = await importBuild(user, showcaseBuild);
    await user.click(within(dialog).getByRole('button', { name: 'Close Esc' }));
    const evaluation = evaluateBuild(parseBuildFile(showcaseBuild).build);

    await user.click(screen.getByRole('button', { name: 'Simulate' }));
    const card = screen.getByRole('dialog', { name: /Incoming damage/ });
    const damage = within(card).getByRole('spinbutton', { name: 'Damage per hit' });
    await user.clear(damage);
    await user.type(damage, '400');
    const taken = () => within(card).getByText('Taken').parentElement!.querySelector('.figure__value')!.textContent;
    expect(taken()).toBe(String(incomingDamage({ ...NO_HIT, amount: 400 }, evaluation).taken));

    await user.click(within(card).getByRole('button', { name: 'Guard Momentum up' }));
    await user.click(within(card).getByRole('button', { name: 'Guard Momentum up' }));
    expect(taken()).toBe(String(incomingDamage({ ...NO_HIT, amount: 400, guardMomentum: 2 }, evaluation).taken));
  });
});

describe('glancing and parries', () => {
  it('applies a ranked parry skill, a glancing blow and a crit to the chosen hit', async () => {
    const { user } = renderApp();
    const dialog = await importBuild(user, showcaseBuild);
    await user.click(within(dialog).getByRole('button', { name: 'Close Esc' }));
    const evaluation = evaluateBuild(parseBuildFile(showcaseBuild).build);

    await user.click(screen.getByRole('button', { name: 'Simulate' }));
    const card = screen.getByRole('dialog', { name: /Incoming damage/ });
    const damage = within(card).getByRole('spinbutton', { name: 'Damage per hit' });
    await user.clear(damage);
    await user.type(damage, '400');
    await user.selectOptions(within(card).getByRole('combobox', { name: 'Parry skill' }), 'stalemate');
    expect((within(card).getByRole('spinbutton', { name: 'Parry chance %' }) as HTMLInputElement).value).toBe('40');
    await user.selectOptions(within(card).getByRole('combobox', { name: 'Hit 1' }), 'glance');
    await user.click(within(card).getByRole('checkbox', { name: 'Parried' }));
    await user.click(within(card).getByRole('checkbox', { name: 'Crit' }));

    const taken = within(card).getByText('Taken').parentElement!.querySelector('.figure__value')!.textContent;
    const expected = incomingDamage({ ...NO_HIT, amount: 400, parryReductionPercent: 50, outcomes: [{ result: 'glance', parried: true, critical: true }] }, evaluation).taken;
    expect(taken).toBe(String(expected));
  });
});

describe('outgoing damage', () => {
  it('runs a basic attack and a damage modifier against a target', async () => {
    const { user } = renderApp();
    const dialog = await importBuild(user, showcaseBuild);
    await user.click(within(dialog).getByRole('button', { name: 'Close Esc' }));
    const evaluation = evaluateBuild(parseBuildFile(showcaseBuild).build);

    await user.click(screen.getByRole('button', { name: 'Simulate' }));
    await user.click(screen.getByRole('button', { name: 'outgoing' }));
    const card = screen.getByRole('dialog', { name: /Outgoing damage/ });
    const dealt = () => within(card).getByText('Dealt').parentElement!.querySelector('.figure__value')!.textContent;
    const swa = evaluation.primaryWeapon!.swa;
    expect(dealt()).toBe(String(Math.floor(swa)));

    await user.click(within(card).getByRole('button', { name: 'Add modifier' }));
    const armor = within(card).getByRole('spinbutton', { name: 'Armor' });
    await user.clear(armor);
    await user.type(armor, '20');
    expect(dealt()).toBe(String(Math.floor(swa * 1.1 - 20)));
  });
});
