import type { DerivedSource, ElementKey, ElementalRecord, StatKey, StatRecord } from '../../types';

export const STAT_KEYS: StatKey[] = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];
export const ELEMENT_KEYS: ElementKey[] = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

export const emptyStats = (): StatRecord => ({ str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 });
export const emptyElements = (): ElementalRecord => ({ Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 });

export function compactSources(sources: DerivedSource[]): DerivedSource[] {
  return sources.filter(source => source.value !== 0);
}

export function sumSources(sources: DerivedSource[], channel: DerivedSource['channel']): number {
  return sources.reduce((total, source) => (source.channel === channel ? total + source.value : total), 0);
}
