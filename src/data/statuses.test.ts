import { describe, expect, it } from 'vitest';
import { STATUS_EFFECTS, STATUS_EFFECT_PROVENANCE, statusEffectById, statusImmunitiesForSubrace } from './statuses';

describe('status effect catalog', () => {
  it('carries the full scraped catalog with provenance', () => {
    // 53 statuses in 7 categories as of the 2026-08-15 scrape; the floor guards
    // against a parser regression silently dropping a section (the last table
    // on the wiki page is unterminated and once parsed as zero rows).
    expect(STATUS_EFFECTS.length).toBeGreaterThanOrEqual(53);
    expect(new Set(STATUS_EFFECTS.map(status => status.category)).size).toBeGreaterThanOrEqual(7);
    expect(STATUS_EFFECT_PROVENANCE.source).toContain('sl2.miraheze.org');
    expect(STATUS_EFFECT_PROVENANCE.confidence).toBe('community');
  });

  it('includes the hard crowd-control staples from the unterminated final table', () => {
    for (const name of ['Blind', 'Silence', 'Confusion', 'Interference']) {
      expect(STATUS_EFFECTS.some(status => status.name === name)).toBe(true);
    }
    expect(statusEffectById('silence')?.recoveryImmunityRounds).toBe(2);
  });

  it('parses racial infliction immunities into canonical race names', () => {
    const poison = statusEffectById('poison');
    expect(poison?.immuneRaces).toEqual(expect.arrayContaining(['Glykin', 'Dullahan']));
    // Snakemen are a monster race the calculator does not model: kept visible
    // as prose rather than resolved.
    expect(poison?.otherImmune).toContain('Snakemen');
    expect(statusEffectById('burn')?.immuneRaces).toContain('Salamandra');
    expect(statusImmunitiesForSubrace('Salamandra')).toContain('Burn');
    expect(statusImmunitiesForSubrace('Shaitan').sort()).toEqual(['Charm', 'Fear', 'Hesitation']);
    expect(statusImmunitiesForSubrace('Imperialist')).toEqual([]);
  });

  it('lifts only plainly-stated structure', () => {
    const burn = statusEffectById('burn');
    expect(burn?.protectionIgnoring).toBe(true);
    expect(burn?.perRound).toBe(true);
    expect(statusEffectById('menov-s-fang')?.preventsCureOf).toBe('Poison');
    expect(statusEffectById('stun')?.recoveryImmunityRounds).toBe(2);
  });
});
