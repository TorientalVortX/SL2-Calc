import { describe, expect, it } from 'vitest';
import { RACIAL_SKILLS, MODELLED, hasRacialSkills, modelledControl, racialSkillById, racialSkillsFor } from './racialSkills';
import racesContent from '../data/content/races.json';

const SUBRACES = Object.keys(racesContent.subraces);

describe('racial skill dataset', () => {
  it('covers every subrace that has a wiki race page', () => {
    // The seven Youkai "subraces" are Youkai types, not playable races with a
    // page of their own; they are covered by youkai.json instead.
    const youkaiTypes = ['Avian', 'Mystic', 'Plant', 'Night', 'Dragon', 'Beast', 'Fairy'];
    const uncovered = SUBRACES.filter(s => !youkaiTypes.includes(s) && racialSkillsFor(s).length === 0);
    expect(uncovered).toEqual([]);
  });

  it('only points at subraces the calculator can select', () => {
    const known = new Set(SUBRACES);
    for (const skill of RACIAL_SKILLS) {
      for (const subrace of skill.subraces) expect(known.has(subrace)).toBe(true);
    }
  });

  it('expands a wiki race group to all of its subraces', () => {
    // "Any Human" covers all thirteen Human nationalities, none of which has
    // racial skills of its own.
    const profession = racialSkillById('profession')!;
    expect(profession.grantedTo).toBe('Any Human');
    expect(profession.subraces).toContain('Imperialist');
    expect(profession.subraces).toContain('Duyuein');
    expect(profession.subraces.length).toBe(13);
  });

  it('splits a skill written for several races', () => {
    // "Felidae, Grimalkin" is two races, not one bucket.
    const golden = RACIAL_SKILLS.find(s => s.grantedTo === 'Felidae, Grimalkin');
    expect(golden).toBeDefined();
    expect(golden!.subraces).toEqual(expect.arrayContaining(['Felidae', 'Grimalkin']));
  });

  it('gives Mechanation loadouts the shared page skills', () => {
    for (const loadout of ['Mechanation STANDARD', 'Mechanation CABAL', 'Mechanation AGILE', 'Mechanation RAID']) {
      expect(racialSkillsFor(loadout).length).toBeGreaterThan(0);
    }
  });

  it('lists actives before passives', () => {
    for (const subrace of SUBRACES) {
      const passiveFlags = racialSkillsFor(subrace).map(s => Number(s.passive));
      expect([...passiveFlags].sort()).toEqual(passiveFlags);
    }
  });
});

describe('modelled controls', () => {
  it('maps only skills the calculator actually applies', () => {
    for (const id of Object.keys(MODELLED)) {
      expect(racialSkillById(id), `${id} is mapped but not in the dataset`).toBeDefined();
    }
  });

  it('marks the rest as reference only', () => {
    const modelled = RACIAL_SKILLS.filter(s => modelledControl(s));
    expect(modelled.length).toBe(Object.keys(MODELLED).length);
    // The overwhelming majority carry no calculator effect, which is the point:
    // the wiki gives them no numbers to model.
    expect(RACIAL_SKILLS.length - modelled.length).toBeGreaterThan(80);
  });

  it('reaches the races whose toggles already existed', () => {
    for (const [subrace, id] of [
      ['Felidae', 'instinct-felidae'],
      ['Grimalkin', 'instinct-felidae'],
      ['Lupine', 'instinct-lupine'],
      ['Vampire', 'sanguine-crest'],
      ['Redtail', 'red-dice'],
      ['Karakuri', 'karakuri-body'],
    ] as const) {
      expect(racialSkillsFor(subrace).some(s => s.id === id), `${subrace} should offer ${id}`).toBe(true);
    }
  });
});

describe('racials entry gating', () => {
  it('shows for a race with skills and hides for one without', () => {
    expect(hasRacialSkills('Lupine')).toBe(true);
    expect(hasRacialSkills('Avian')).toBe(false);
    expect(hasRacialSkills(null)).toBe(false);
  });
});
