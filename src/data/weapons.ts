import type { Weapon } from '../types';
import axes from './content/weapons-axes.json';
import bows from './content/weapons-bows.json';
import daggers from './content/weapons-daggers.json';
import fists from './content/weapons-fists.json';
import guns from './content/weapons-guns.json';
import polearms from './content/weapons-polearms.json';
import swords from './content/weapons-swords.json';
import tomes from './content/weapons-tomes.json';

export const AXES = axes as Weapon[];
export const SWORDS = swords as Weapon[];
export const BOWS = bows as Weapon[];
export const DAGGERS = daggers as Weapon[];
export const GUNS = guns as Weapon[];
export const FISTS = fists as Weapon[];
export const POLEARMS = polearms as Weapon[];
export const TOMES = tomes as Weapon[];

export const WEAPONS_BY_TYPE = {
  Axe: AXES,
  Sword: SWORDS,
  Bow: BOWS,
  Dagger: DAGGERS,
  Gun: GUNS,
  Fist: FISTS,
  Polearm: POLEARMS,
  Tome: TOMES,
} as const;

export const ALL_WEAPONS = Object.values(WEAPONS_BY_TYPE).flat();
export const WEAPONS = ALL_WEAPONS;
