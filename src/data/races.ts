import type { ElementalRecord, RaceConfig, SubraceConfig } from '../types';
import content from './content/races.json';

export const RACES = content.races as Record<string, RaceConfig>;
export const SUBRACES = content.subraces as Record<string, SubraceConfig>;
export const RACE_RESISTANCES = content.resistances as Record<string, ElementalRecord>;
