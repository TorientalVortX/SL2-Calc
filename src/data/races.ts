/**
 * Race and subrace data for SL2 Calculator
 * Contains race categories, subrace stats, and elemental resistances
 */

import type { RaceConfig, SubraceConfig, ElementalRecord} from '../types';

/**
 * Race categories - these provide no stat bonuses themselves
 * Races are just groupings for subraces that provide the actual stats
 */
export const RACES: Record<string, RaceConfig> = {
  'Human': { human: true },
  'Homunculi': { homunculi: true },
  'Serpentkind': {},
  'Corrupted': {},
  'Kaelensia': {},
  'Ancients': {},
  'Other': {},
  'Youkai': {}
};

// Subrace options with race restrictions 
export const SUBRACES: Record<string, SubraceConfig> = {
  // Human subraces
    'Imperialist': {'str': 4, 'wil': 4, 'ski': 4, 'cel': 4, 'def': 4, 'res': 4, 'vit': 4, 'fai': 0, 'luc': 4, 'gui': 4, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Chataran': {'str': 6, 'wil': 2, 'ski': 4, 'cel': 1, 'def': 8, 'res': 5, 'vit': 5, 'fai': 0, 'luc': 1, 'gui': 4, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Karatynn': {'str': 2, 'wil': 7, 'ski': 5, 'cel': 5, 'def': 1, 'res': 5, 'vit': 3, 'fai': 0, 'luc': 4, 'gui': 4, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Onigan': {'str': 5, 'wil': 1, 'ski': 7, 'cel': 6, 'def': 3, 'res': 1, 'vit': 4, 'fai': 0, 'luc': 5, 'gui': 4, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Tannite': {'str': 5, 'wil': 3, 'ski': 6, 'cel': 4, 'def': 3, 'res': 3, 'vit': 4, 'fai': 0, 'luc': 2, 'gui': 4, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Lispoolian': {'str': 3, 'wil': 4, 'ski': 4, 'cel': 3, 'def': 2, 'res': 6, 'vit': 4, 'fai': 4, 'luc': 1, 'gui': 1, 'san': 4, 'apt': 4,  'allowedRaces': ['Human']},
    'Hyoyan': {'str': 5, 'wil': 5, 'ski': 6, 'cel': 5, 'def': 2, 'res': 2, 'vit': 6, 'fai': 1, 'luc': 2, 'gui': 2, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Alstalsian': {'str': 2, 'wil': 4, 'ski': 5, 'cel': 5, 'def': 3, 'res': 3, 'vit': 4, 'fai': 0, 'luc': 2, 'gui': 8, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Dormehan': {'str': 5, 'wil': 2, 'ski': 5, 'cel': 1, 'def': 4, 'res': 4, 'vit': 8, 'fai': 0, 'luc': 3, 'gui': 4, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Telegradian': {'str': 7, 'wil': 2, 'ski': 6, 'cel': 4, 'def': 1, 'res': 4, 'vit': 4, 'fai': 2, 'luc': 4, 'gui': 2, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Geladynian': {'str': 4, 'wil': 7, 'ski': 4, 'cel': 1, 'def': 6, 'res': 4, 'vit': 4, 'fai': 0, 'luc': 1, 'gui': 5, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Meiaquarise': {'str': 3, 'wil': 4, 'ski': 4, 'cel': 7, 'def': 4, 'res': 1, 'vit': 3, 'fai': 0, 'luc': 4, 'gui': 6, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},
    'Duyuein': {'str': 4, 'wil': 4, 'ski': 4, 'cel': 1, 'def': 4, 'res': 6, 'vit': 7, 'fai': 3, 'luc': 2, 'gui': 1, 'san': 0, 'apt': 4,  'allowedRaces': ['Human']},

  // Kaelensia subraces
    'Lupine': {'str': 8, 'wil': 1, 'ski': 4, 'cel': 2, 'def': 6, 'res': 3, 'vit': 7, 'fai': 0, 'luc': 3, 'gui': 2, 'san': 3, 'apt': 1,  'allowedRaces': ['Kaelensia']},
    'Leporidae': {'str': 6, 'wil': 2, 'ski': 5, 'cel': 5, 'def': 3, 'res': 2, 'vit': 3, 'fai': 0, 'luc': 7, 'gui': 3, 'san': 3, 'apt': 1,  'allowedRaces': ['Kaelensia']},
    'Corbie': {'str': 4, 'wil': 3, 'ski': 4, 'cel': 6, 'def': 1, 'res': 4, 'vit': 4, 'fai': 0, 'luc': 5, 'gui': 6, 'san': 3, 'apt': 1,  'allowedRaces': ['Kaelensia']},
    'Phenex': {'str': 4, 'wil': 4, 'ski': 4, 'cel': 3, 'def': 2, 'res': 4, 'vit': 6, 'fai': 5, 'luc': 2, 'gui': 2, 'san': 3, 'apt': 1,  'allowedRaces': ['Kaelensia']},
    'Heron': {'str': 4, 'wil': 6, 'ski': 4, 'cel': 4, 'def': 2, 'res': 2, 'vit': 5, 'fai': 3, 'luc': 1, 'gui': 1, 'san': 8, 'apt': 0,  'allowedRaces': ['Kaelensia']},
    'Felidae': {'str': 7, 'wil': 1, 'ski': 6, 'cel': 8, 'def': 1, 'res': 1, 'vit': 4, 'fai': 0, 'luc': 4, 'gui': 4, 'san': 3, 'apt': 1,  'allowedRaces': ['Kaelensia']},
    'Grimalkin': {'str': 4, 'wil': 8, 'ski': 4, 'cel': 7, 'def': 1, 'res': 5, 'vit': 3, 'fai': 0, 'luc': 1, 'gui': 4, 'san': 2, 'apt': 1,  'allowedRaces': ['Kaelensia']},
    'Muridae': {'str': 3, 'wil': 5, 'ski': 5, 'cel': 8, 'def': 2, 'res': 2, 'vit': 3, 'fai': 0, 'luc': 4, 'gui': 5, 'san': 0, 'apt': 2,  'allowedRaces': ['Kaelensia']},

  // Corrupted subraces
    'Umbral': {'str': 5, 'wil': 6, 'ski': 4, 'cel': 6, 'def': 2, 'res': 4, 'vit': 6, 'fai': 0, 'luc': 4, 'gui': 3, 'san': 0, 'apt': 0,  'allowedRaces': ['Corrupted']},
    'Shaitan': {'str': 8, 'wil': 1, 'ski': 4, 'cel': 4, 'def': 8, 'res': 3, 'vit': 8, 'fai': 0, 'luc': 2, 'gui': 2, 'san': 0, 'apt': 0,  'allowedRaces': ['Corrupted']},
    'Oracle': {'str': 3, 'wil': 7, 'ski': 4, 'cel': 4, 'def': 3, 'res': 5, 'vit': 5, 'fai': 4, 'luc': 1, 'gui': 4, 'san': 0, 'apt': 0,  'allowedRaces': ['Corrupted']},
    'Papilion': {'str': 2, 'wil': 8, 'ski': 8, 'cel': 5, 'def': 3, 'res': 3, 'vit': 3, 'fai': 0, 'luc': 4, 'gui': 4, 'san': 0, 'apt': 0,  'allowedRaces': ['Corrupted']},
    'Theno': {'str': 3, 'wil': 6, 'ski': 6, 'cel': 6, 'def': 1, 'res': 1, 'vit': 6, 'fai': 0, 'luc': 4, 'gui': 4, 'san': 0, 'apt': 3,  'allowedRaces': ['Corrupted']},

  // Ancients subraces
    'Vampire': {'str': 3, 'wil': 6, 'ski': 4, 'cel': 4, 'def': 3, 'res': 3, 'vit': 6, 'fai': 1, 'luc': 2, 'gui': 5, 'san': 3, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Elf': {'str': 3, 'wil': 6, 'ski': 4, 'cel': 4, 'def': 3, 'res': 3, 'vit': 7, 'fai': 2, 'luc': 1, 'gui': 2, 'san': 5, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Wild Elf': {'str': 6, 'wil': 3, 'ski': 4, 'cel': 4, 'def': 3, 'res': 3, 'vit': 5, 'fai': 0, 'luc': 2, 'gui': 6, 'san': 4, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Zeran': {'str': 4, 'wil': 4, 'ski': 6, 'cel': 4, 'def': 3, 'res': 3, 'vit': 4, 'fai': 5, 'luc': 0, 'gui': 4, 'san': 3, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Lich': {'str': 1, 'wil': 10, 'ski': 8, 'cel': 4, 'def': 2, 'res': 6, 'vit': 3, 'fai': 0, 'luc': 0, 'gui': 6, 'san': 0, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Reaper': {'str': 4, 'wil': 6, 'ski': 4, 'cel': 1, 'def': 3, 'res': 5, 'vit': 7, 'fai': 0, 'luc': 2, 'gui': 3, 'san': 5, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Apertaurus': {'str': 9, 'wil': 1, 'ski': 4, 'cel': 6, 'def': 1, 'res': 2, 'vit': 7, 'fai': 1, 'luc': 2, 'gui': 1, 'san': 6, 'apt': 0,  'allowedRaces': ['Ancients']},
    'Oni': {'str': 8, 'wil': 3, 'ski': 3, 'cel': 2, 'def': 5, 'res': 4, 'vit': 9, 'fai': 0, 'luc': 2, 'gui': 0, 'san': 4, 'apt': 0,  'allowedRaces': ['Ancients']},

  // Serpentkind subraces
    'Glykin': {'str': 4, 'wil': 4, 'ski': 5, 'cel': 4, 'def': 3, 'res': 3, 'vit': 7, 'fai': 5, 'luc': 0, 'gui': 2, 'san': 3, 'apt': 0,  'allowedRaces': ['Serpentkind']},
    'Wyverntouched': {'str': 6, 'wil': 6, 'ski': 5, 'cel': 1, 'def': 4, 'res': 2, 'vit': 9, 'fai': 0, 'luc': 0, 'gui': 3, 'san': 3, 'apt': 1,  'allowedRaces': ['Serpentkind']},
    'Hyattr': {'str': 7, 'wil': 7, 'ski': 3, 'cel': 2, 'def': 5, 'res': 1, 'vit': 8, 'fai': 0, 'luc': 1, 'gui': 1, 'san': 5, 'apt': 0,  'allowedRaces': ['Serpentkind']},
    'Naga': {'str': 3, 'wil': 8, 'ski': 4, 'cel': 8, 'def': 2, 'res': 4, 'vit': 4, 'fai': 0, 'luc': 0, 'gui': 5, 'san': 1, 'apt': 1,  'allowedRaces': ['Serpentkind']},

  // Other subraces
    'Mechanation STANDARD': {'str': 6, 'wil': 2, 'ski': 4, 'cel': 5, 'def': 6, 'res': 3, 'vit': 8, 'fai': 0, 'luc': 2, 'gui': 2, 'san': 0, 'apt': 2,  'allowedRaces': ['Other']},
    'Mechanation CABAL': {'str': 2, 'wil': 6, 'ski': 5, 'cel': 4, 'def': 3, 'res': 6, 'vit': 6, 'fai': 0, 'luc': 3, 'gui': 3, 'san': 0, 'apt': 2,  'allowedRaces': ['Other']},
    'Mechanation AGILE': {'str': 4, 'wil': 4, 'ski': 6, 'cel': 6, 'def': 3, 'res': 3, 'vit': 6, 'fai': 0, 'luc': 3, 'gui': 3, 'san': 0, 'apt': 2,  'allowedRaces': ['Other']},
    'Mechanation RAID': {'str': 6, 'wil': 6, 'ski': 4, 'cel': 3, 'def': 1, 'res': 1, 'vit': 8, 'fai': 0, 'luc': 5, 'gui': 4, 'san': 0, 'apt': 2,  'allowedRaces': ['Other']},
    'Redtail': {'str': 3, 'wil': 4, 'ski': 5, 'cel': 4, 'def': 3, 'res': 3, 'vit': 4, 'fai': 0, 'luc': 9, 'gui': 4, 'san': 1, 'apt': 0,  'allowedRaces': ['Other']},
    'Omina': {'str': 3, 'wil': 5, 'ski': 5, 'cel': 4, 'def': 2, 'res': 7, 'vit': 6, 'fai': 0, 'luc': 0, 'gui': 2, 'san': 5, 'apt': 1,  'allowedRaces': ['Other']},
    'Doriad': {'str': 9, 'wil': 1, 'ski': 5, 'cel': 1, 'def': 9, 'res': 4, 'vit': 5, 'fai': 0, 'luc': 2, 'gui': 3, 'san': 0, 'apt': 1,  'allowedRaces': ['Other']},
    'Dullahan': {'str': 4, 'wil': 4, 'ski': 5, 'cel': 7, 'def': 2, 'res': 2, 'vit': 4, 'fai': 2, 'luc': 4, 'gui': 2, 'san': 4, 'apt': 0,  'allowedRaces': ['Other']},
    'Karakuri': {'str': 4, 'wil': 4, 'ski': 4, 'cel': 4, 'def': 4, 'res': 4, 'vit': 4, 'fai': 4, 'luc': 4, 'gui': 4, 'san': 4, 'apt': 4,  'allowedRaces': ['Other']},


  // Homunculi subraces
    'Salamandra': {'str': 8, 'wil': 6, 'ski': 4, 'cel': 4, 'def': 2, 'res': 4, 'vit': 5, 'fai': 0, 'luc': 2, 'gui': 5, 'san': 0, 'apt': 0,  'allowedRaces': ['Homunculi']},
    'Amalgama': {'str': 5, 'wil': 6, 'ski': 5, 'cel': 3, 'def': 2, 'res': 3, 'vit': 5, 'fai': 0, 'luc': 2, 'gui': 7, 'san': 0, 'apt': 2,  'allowedRaces': ['Homunculi']},
    'Chimera': {'str': 3, 'wil': 3, 'ski': 6, 'cel': 6, 'def': 2, 'res': 4, 'vit': 5, 'fai': 0, 'luc': 2, 'gui': 5, 'san': 0, 'apt': 4,  'allowedRaces': ['Homunculi']},


// Youkai subraces
    'Avian': {'str': 6, 'wil': 3, 'ski': 9, 'cel': 7, 'def': 4, 'res': 4, 'vit': 5, 'fai': 0, 'luc': 4, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']},
    'Mystic': {'str': 3, 'wil': 7, 'ski': 5, 'cel': 6, 'def': 4, 'res': 3, 'vit': 5, 'fai': 0, 'luc': 7, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']},
    'Plant': {'str': 5, 'wil': 6, 'ski': 5, 'cel': 4, 'def': 5, 'res': 4, 'vit': 9, 'fai': 0, 'luc': 4, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']},
    'Night': {'str': 5, 'wil': 9, 'ski': 4, 'cel': 5, 'def': 3, 'res': 4, 'vit': 6, 'fai': 0, 'luc': 6, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']},
    'Dragon': {'str': 8, 'wil': 6, 'ski': 7, 'cel': 4, 'def': 3, 'res': 5, 'vit': 7, 'fai': 0, 'luc': 2, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']},
    'Beast': {'str': 9, 'wil': 4, 'ski': 6, 'cel': 6, 'def': 4, 'res': 4, 'vit': 6, 'fai': 0, 'luc': 3, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']},
    'Fairy': {'str': 3, 'wil': 6, 'ski': 6, 'cel': 9, 'def': 3, 'res': 4, 'vit': 6, 'fai': 0, 'luc': 5, 'gui': 0, 'san': 0, 'apt': 0,  'allowedRaces': ['Youkai']}

};


// Race-based elemental resistances and weaknesses
export const RACE_RESISTANCES: Record<string, ElementalRecord> = {
  'Phenex': {
    Fire: 15,
    Light: 15,
    Ice: -15,
    Dark: -15,
    Wind: 0,
    Earth: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Sound: 0
  },
  'Leporidae': {
    Earth: 15,
    Sound: -15,
    Fire: 0,
    Ice: 0,
    Wind: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0
  },
  'Heron': {
    Sound: 15,
    Wind: -15,
    Fire: 0,
    Ice: 0,
    Earth: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0
  },
  'Theno': {
    Water: 15,
    Sound: 15,
    Acid: -15,
    Lightning: -15,
    Fire: 0,
    Ice: 0,
    Wind: 0,
    Earth: 0,
    Light: 0,
    Dark: 0
  },
  'Elf': {
    Water: 25,
    Dark: -25,
    Fire: 0,
    Ice: 0,
    Wind: 0,
    Earth: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Sound: 0
  },
  'Wild Elf': {
    Earth: 15,
    Ice: -15,
    Fire: 0,
    Wind: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Reaper': {
    Ice: 15,
    Wind: -15,
    Fire: 0,
    Earth: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Apertaurus': {
    Ice: 15,
    Wind: -15,
    Fire: 0,
    Earth: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Mechanation STANDARD': {
    Fire: -15,
    Ice: -15,
    Lightning: 25,
    Wind: 0,
    Earth: 0,
    Water: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Mechanation CABAL': {
    Fire: -15,
    Ice: -15,
    Lightning: 25,
    Wind: 0,
    Earth: 0,
    Water: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Mechanation AGILE': {
    Fire: -15,
    Ice: -15,
    Lightning: 25,
    Wind: 0,
    Earth: 0,
    Water: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Mechanation RAID': {
    Fire: -15,
    Ice: -15,
    Lightning: 25,
    Wind: 0,
    Earth: 0,
    Water: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Doriad': {
    Water: -15,
    Earth: -15,
    Fire: 15,
    Dark: 15,
    Ice: 0,
    Wind: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Sound: 0
  },
  'Hyattr': {
    Fire: 15,
    Wind: -15,
    Ice: 0,
    Earth: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  },
  'Salamandra': {
    Fire: 15,
    Ice: -15,
    Wind: 0,
    Earth: 0,
    Water: 0,
    Lightning: 0,
    Acid: 0,
    Light: 0,
    Dark: 0,
    Sound: 0
  }
};

