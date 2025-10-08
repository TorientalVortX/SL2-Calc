/**
 * SL2 Calculator - Extended Version
 * Added features: Class Passives, Rising Game, Instinct, Subrace support
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Minus, RotateCcw, Settings, Utensils, BookOpen, Download, Upload, Copy } from 'lucide-react';
import WeaponCalculator from './WeaponCalculator';

type StatKey = 'str' | 'wil' | 'ski' | 'cel' | 'def' | 'res' | 'vit' | 'fai' | 'luc' | 'gui' | 'san' | 'apt';
type StampKey = 'str' | 'wil' | 'ski' | 'cel' | 'vit' | 'fai';
type ElementKey = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Dark' | 'Water' | 'Light' | 'Lightning' | 'Acid' | 'Sound';

// Stat color mapping based on SL2 themes
const STAT_COLORS: Record<StatKey, string> = {
  'str': '#ef4444',     // Red - Fire element
  'wil': '#ffffff',     // White - Mental strength
  'ski': '#06b6d4',     // Cyan - Ice element
  'cel': '#34d399',     // Mint Green - Wind element
  'def': '#92400e',     // Brown - Earth element
  'res': '#7c3aed',     // Purple - Dark element
  'vit': '#1e40af',     // Deep Blue - Water element
  'fai': '#fbbf24',     // Yellow - Light element
  'luc': '#f97316',     // Orange - Lightning element
  'gui': '#22c55e',     // Sketchy Green - Acid element
  'san': '#6b7280',     // Grey - Sound element
  'apt': 'rainbow'      // Rainbow - Special gradient
};

// Element color mapping for Luminary Element aesthetic
const ELEMENT_COLORS: Record<string, string> = {
  'Fire': '#ef4444',      // Red - matches STR
  'Ice': '#06b6d4',       // Cyan - matches SKI
  'Wind': '#34d399',      // Mint Green - matches CEL
  'Earth': '#92400e',     // Brown - matches DEF
  'Dark': '#7c3aed',      // Purple - matches RES
  'Water': '#1e40af',     // Deep Blue - matches VIT
  'Light': '#fbbf24',     // Yellow - matches FAI
  'Lightning': '#f97316', // Orange - matches LUC
  'Acid': '#22c55e',      // Green - matches GUI
  'Sound': '#6b7280'      // Grey - matches SAN
};

interface Stats {
  str: number;
  wil: number;
  ski: number;
  cel: number;
  def: number;
  res: number;
  vit: number;
  fai: number;
  luc: number;
  gui: number;
  san: number;
  apt: number;
  human?: boolean;
  homunculi?: boolean;
}

/**
 * Race categories - these provide no stat bonuses themselves
 * Races are just groupings for subraces that provide the actual stats
 */
const RACES: Record<string, { human?: boolean; homunculi?: boolean }> = {
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
const SUBRACES: Record<string, Stats & { allowedRaces?: string[] }> = {
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
const RACE_RESISTANCES: Record<string, ElementalRecord> = {
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

// Class hierarchy structure based on POE-style organization
const CLASS_HIERARCHY: Record<string, {
  name: string;
  baseClass: boolean;
  subClasses: string[];
}> = {
  'Archer': {
    name: 'Archer',
    baseClass: true,
    subClasses: ['Arbalest', 'Magic Gunner', 'Ranger']
  },
  'Martial Artist': {
    name: 'Martial Artist',
    baseClass: true,
    subClasses: ['Monk', 'Verglas', 'Boxer', 'Shinobi']
  },
  'Curate': {
    name: 'Curate',
    baseClass: true,
    subClasses: ['Lantern Bearer', 'Priest', 'Aquamancer', 'Druid']
  },
  'Duelist': {
    name: 'Duelist',
    baseClass: true,
    subClasses: ['Ghost', 'Kensei', 'Firebird']
  },
  'Mage': {
    name: 'Mage',
    baseClass: true,
    subClasses: ['Evoker', 'Hexer', 'Rune Magician', 'Ruler']
  },
  'Bard': {
    name: 'Bard',
    baseClass: true,
    subClasses: ['Dancer', 'Performer', 'Dark Bard']
  },
  'Rogue': {
    name: 'Rogue',
    baseClass: true,
    subClasses: ['Engineer', 'Void Assassin', 'Spellthief']
  },
  'Soldier': {
    name: 'Soldier',
    baseClass: true,
    subClasses: ['Black Knight', 'Tactician', 'Demon Hunter', 'Solblader']
  },
  'Summoner': {
    name: 'Summoner',
    baseClass: true,
    subClasses: ['Grand Summoner', 'Bonder', 'Shapeshifter']
  }
};

const CLASSES: Record<string, Omit<Stats, 'human' | 'homunculi'> & { validWeapons?: string[] }> = {
  'Soldier': { str: 2, wil: 0, ski: 1, cel: 0, def: 0, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Duelist': { str: 1, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Daggers'] },
  'Mage': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Evoker': { str: 0, wil: 3, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Priest': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 3, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Monk': { str: 1, wil: 0, ski: 2, cel: 2, def: 2, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Ghost': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Daggers'] },
  'Bonder': { str: 2, wil: 2, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Kensei': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Swords'] },
  'Arbalest': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 1, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Bows', 'Guns'] },
  'Hexer': { str: 0, wil: 1, ski: 1, cel: 0, def: 3, res: 3, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Black Knight': { str: 2, wil: 0, ski: 1, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Tactician': { str: 1, wil: 1, ski: 2, cel: 2, def: 1, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Demon Hunter': { str: 2, wil: 0, ski: 2, cel: 2, def: 2, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Curate': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Engineer': { str: 2, wil: 0, ski: 1, cel: 2, def: 1, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Guns'] },
  'Bard': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 2, apt: 0, validWeapons: ['Daggers', 'Swords', 'Axes'] },
  'Performer': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 3, apt: 0, validWeapons: ['Daggers', 'Axes', 'Swords', 'Tomes'] },
  'Dancer': { str: 1, wil: 2, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Axes', 'Swords', 'Guns'] },
  'Dark Bard': { str: 2, wil: 0, ski: 0, cel: 0, def: 0, res: 2, vit: 1, fai: 0, luc: 0, gui: 0, san: 3, apt: 0, validWeapons: ['Daggers', 'Axes', 'Swords', 'Tomes'] },
  'Verglas': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Summoner': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Grand Summoner': { str: 0, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Boxer': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Rogue': { str: 0, wil: 0, ski: 1, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers'] },
  'Archer': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Bows', 'Guns'] },
  'Martial Artist': { str: 2, wil: 0, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Firebird': { str: 2, wil: 0, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Daggers'] },
  'Aquamancer': { str: 0, wil: 1, ski: 0, cel: 2, def: 0, res: 0, vit: 3, fai: 2, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Druid': { str: 0, wil: 0, ski: 0, cel: 2, def: 2, res: 0, vit: 0, fai: 2, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Shapeshifter': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Lantern Bearer': { str: 0, wil: 2, ski: 0, cel: 2, def: 1, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Tomes', 'Spears'] },
  'Spellthief': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers'] },
  'Magic Gunner': { str: 0, wil: 2, ski: 3, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers', 'Guns'] },
  'Ranger': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 2, apt: 0, validWeapons: ['Daggers', 'Bows'] },
  'Ruler': { str: 0, wil: 2, ski: 0, cel: 0, def: 0, res: 2, vit: 0, fai: 0, luc: 2, gui: 0, san: 2, apt: 0, validWeapons: ['Tomes'] },
  'Rune Magician': { str: 0, wil: 3, ski: 2, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 3, san: 0, apt: 0, validWeapons: ['Tomes'] },
  'Shinobi': { str: 2, wil: 0, ski: 0, cel: 4, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 2, san: 0, apt: 0, validWeapons: ['Fist'] },
  'Solblader': { str: 2, wil: 2, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0, validWeapons: ['Swords', 'Axes', 'Spears'] },
  'Void Assassin': { str: 0, wil: 0, ski: 3, cel: 2, def: 0, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0, validWeapons: ['Daggers'] }
};

// Class passive abilities
interface ClassPassive {
  maxRank: number;
  stats: Partial<StatRecord>;
  description: string;
}

type StatRecord = Record<StatKey, number>;
type StampRecord = Record<StampKey, number>;
type ElementalRecord = Record<ElementKey, number>;

/**
 * Interface for build data that can be exported/imported
 */
interface BuildData {
  buildName: string;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  selectedMainBaseClass?: string; // Added for hierarchical class selection
  selectedSubBaseClass?: string;  // Added for hierarchical class selection
  totalPoints: number;
  characterLevel: number;
  food: string;
  history: string;
  addedStats: StatRecord;
  customStats: StatRecord;
  customBaseStats: StatRecord;
  stamps: StampRecord;
  legendExtend: Record<string, boolean>;
  astrology: string; // Now stores single planet name
  customHP: number;
  customFP: number;
  baseEvade: number;
  bonusEvade: number;
  giantGene: boolean;
  dragonKing: number;
  dragonQueen: number;
  hpPercent: number;
  sanguineCrest: boolean;
  felidaeInstinct: boolean;
  lupineInstinct: boolean;
  risingGame: number;
  redtailFortuneLevel: number;
  redtailDiceColor: 'red' | 'green' | 'yellow';
  karakuriYoukai: string;
  fortitude: boolean;
  painTolerance: number;
  warwalk: boolean;
  endurance: boolean;
  luminaryElement: boolean;
  persistenceOfNormalcy: boolean;
  powerOfNormalcy: boolean;
  mainClassPassive: number;
  subClassPassive: number;
  elementalATKAdjustments: ElementalRecord;
  elementalRESAdjustments: ElementalRecord;
  version: string; // For future compatibility
}

const CLASS_PASSIVES: Record<string, ClassPassive> = {
  'Arbalest': { maxRank: 6, stats: { ski: 1 }, description: '+SKI per rank' },
  'Bard': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
  'Black Knight': { maxRank: 6, stats: { def: 1 }, description: '+DEF per rank' },
  'Bonder': { maxRank: 3, stats: { wil: 1, fai: 1 }, description: '+WIL/FAI per rank' },
  'Dark Bard': { maxRank: 3, stats: { san: 1 }, description: '+STR/SAN at rank 7+' },
  'Engineer': { maxRank: 6, stats: { gui: 1 }, description: '+GUI per rank' },
  'Evoker': { maxRank: 6, stats: { wil: 1 }, description: '+WIL per rank' },
  'Ghost': { maxRank: 5, stats: { res: 1 }, description: '+RES per rank' },
  'Hexer': { maxRank: 3, stats: { def: 1, res: 1 }, description: '+DEF/RES per rank' },
  'Kensei': { maxRank: 3, stats: { str: 1, ski: 1 }, description: '+STR/SKI per rank' },
  'Lantern Bearer': { maxRank: 6, stats: { res: 1 }, description: '+RES per rank' },
  'Magic Gunner': { maxRank: 3, stats: { cel: 1, res: 1 }, description: '+CEL/RES per rank' },
  'Monk': { maxRank: 3, stats: { ski: 1, cel: 1 }, description: '+SKI/CEL per rank' },
  'Priest': { maxRank: 6, stats: { fai: 1 }, description: '+FAI per rank' },
  'Solblader': { maxRank: 3, stats: { fai: 1, gui: 1 }, description: '+FAI/GUI per rank' },
  'Tactician': { maxRank: 3, stats: { wil: 1, gui: 1 }, description: '+WIL/GUI per rank' },
  'Void Assassin': { maxRank: 3, stats: { ski: 1, res: 1 }, description: '+SKI/RES per rank' }
};

interface FoodBonus {
  str: number;
  wil: number;
  ski: number;
  cel: number;
  def: number;
  res: number;
  vit: number;
  fai: number;
  luc: number;
  gui: number;
  san: number;
  apt: number;
}

const FOODS: Record<string, FoodBonus> = {
  'None': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Salad': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 3, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Potatoes & Carrots': { str: 0, wil: 0, ski: 3, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Fugu': { str: 3, wil: 3, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Sushi': { str: 2, wil: 2, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Pumpkin Lollipop': { str: 0, wil: 0, ski: 0, cel: 5, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Redpop': { str: 0, wil: 0, ski: 0, cel: 4, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Cocky': { str: 0, wil: 0, ski: 0, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Kat Knip': { str: 0, wil: 0, ski: 0, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Androbar': { str: 0, wil: 0, ski: 0, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Chocolate Bar': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Sweet Bites': { str: 0, wil: 0, ski: 0, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 }
};

interface HistoryBonus {
  str: number;
  wil: number;
  ski: number;
  cel: number;
  def: number;
  res: number;
  vit: number;
  fai: number;
  luc: number;
}

const HISTORY: Record<string, HistoryBonus> = {
  'None': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Warrior': { str: 2, wil: 0, ski: 1, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Hero': { str: 2, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 1 },
  'Magician': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Spellblade': { str: 1, wil: 2, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Assassin': { str: 0, wil: 0, ski: 2, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 1 },
  'Myrmdon': { str: 0, wil: 0, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0 },
  'Fencer': { str: 0, wil: 0, ski: 0, cel: 2, def: 1, res: 0, vit: 0, fai: 0, luc: 0 },
  'Thief': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1 },
  'Ward': { str: 0, wil: 0, ski: 0, cel: 0, def: 2, res: 1, vit: 0, fai: 0, luc: 0 },
  'Shaman': { str: 0, wil: 0, ski: 0, cel: 0, def: 1, res: 0, vit: 0, fai: 2, luc: 0 },
  'Ghost': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 2, vit: 0, fai: 0, luc: 1 },
  'Witchhunter': { str: 1, wil: 0, ski: 0, cel: 0, def: 0, res: 2, vit: 0, fai: 0, luc: 0 },
  'Marauder': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 2, fai: 0, luc: 1 },
  'Knight': { str: 0, wil: 0, ski: 0, cel: 0, def: 1, res: 0, vit: 2, fai: 0, luc: 0 },
  'Faithful': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 1, vit: 0, fai: 2, luc: 0 },
  'Priest': { str: 0, wil: 1, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 2, luc: 0 },
  'Survivor': { str: 0, wil: 1, ski: 0, cel: 0, def: 0, res: 0, vit: 1, fai: 0, luc: 2 },
  'Gambler': { str: 1, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 2 }
};

const LEGEND_EXTEND: Record<string, { stat: StatKey; name: string; color: string }> = {
  'Axysal': { stat: 'str', name: 'Axys Al', color: STAT_COLORS.str },
  'Kashic': { stat: 'wil', name: 'Kash Ic', color: STAT_COLORS.wil },
  'Zerogyn': { stat: 'ski', name: 'Zero Gyn', color: STAT_COLORS.ski },
  'Rabeur': { stat: 'cel', name: 'Rabe Ur', color: STAT_COLORS.cel },
  'Grenut': { stat: 'def', name: 'Gren Ut', color: STAT_COLORS.def },
  'Choier': { stat: 'res', name: 'Choi Er', color: STAT_COLORS.res },
  'Bldiia': { stat: 'vit', name: 'Bldi Ia', color: STAT_COLORS.vit },
  'Holymr': { stat: 'fai', name: 'Holy Mr', color: STAT_COLORS.fai },
  'Kagiji': { stat: 'luc', name: 'Kagi Ji', color: STAT_COLORS.luc },
  'Akurzo': { stat: 'gui', name: 'Akur Zo', color: STAT_COLORS.gui },
  'Luncau': { stat: 'san', name: 'Luna Cu', color: STAT_COLORS.san }
};

const ASTROLOGY_PLANETS: Record<string, StatKey> = {
  'Mercury': 'ski',
  'Venus': 'def',
  'Mars': 'str',
  'Jupiter': 'luc',
  'Saturn': 'cel',
  'Neptune': 'vit',
  'Uranus': 'fai',
  'Pluto': 'res'
};

// Mapping of planets to their corresponding elemental attack types
const PLANET_ELEMENTS: Record<string, string> = {
  'Mars': 'Fire',
  'Mercury': 'Ice',
  'Saturn': 'Wind',
  'Venus': 'Earth',
  'Pluto': 'Dark',
  'Neptune': 'Water',
  'Uranus': 'Light',
  'Jupiter': 'Lightning'
};

const MAX_POINTS = 240;
const APTITUDE_NUMBER = 6;

// Stat information from StatsInfo.txt (Updated)
const STAT_INFO: Record<string, { title: string; description: string; effects: string[]; notes?: string }> = {
  'str': {
    title: 'Strength (STR)',
    description: "Strength is the measure of a character's physical strength, and/or their affinity with the element of Fire.\n\nA character that possesses high STR is capable of lifting heavy objects, while a character with low STR may struggle with such a task unaided.\n\nAside from certain exceptions, most Swords, Axes, Spears, Bows, and Fist weapons have STR Primary Scaling. Characters interested in using those weapon types will want a healthy helping of STR.",
    effects: [
      '+1 Fire ATK (per 1 Scaled point)',
      '+1 Max. Battle Weight, letting you equip heavier items without penalties (per 1 Scaled point)',
      '+1 Max. Encumbrance, letting you carry more items in your inventory without slowing down (per 1 Scaled point)',
      '+3 Max HP (per 1 Base point only - not affected by stat scaling)',
      '+0.4 Critical, for STR Primary Scaling weapons (per 1 Scaled point)'
    ]
  },
  'wil': {
    title: 'Will (WIL)',
    description: "Will is a character's mental strength, their ability to store Focus, and/or their overall affinity with all elements.\n\nA character with high WIL possesses great magical potential and plenty of resources to use it, while a character with low WIL may be better suited to mundane tasks.\n\nAside from certain exceptions, most Tome weapons have WIL Primary Scaling. Characters interested in using them will want a healthy helping of WIL.",
    effects: [
      '+5 FP (per 1 Scaled point)',
      '+1 to All Elemental ATK per 4 points (excludes Sound and Acid) (per 1 Scaled point)',
      '+1 Status Infliction, increasing your chance to inflict status effects on enemies (per 1 Scaled point)',
      '+1 Max. Skill Pool Size per 10 points, increasing the amount of skills you can equip (per 1 Scaled point)'
    ]
  },
  'ski': {
    title: 'Skill (SKI)',
    description: "Skill is similar to dexterity, governing the character's coordination and ability to hit their mark, and/or affinity with the Ice element.\n\nA character with high SKI may have a good sense of balance and distance, while a character with low SKI may be clumsy.\n\nBecause SKI directly influences your ability to hit enemies, most characters not relying on specific strategies will want this stat. A good amount to aim for is 55 Scaled SKI by level 60.",
    effects: [
      '+1 Ice ATK (per 1 Scaled point)',
      '+2 Hit (per 1 Scaled point)',
      '+0.5 Critical (per 1 Scaled point)',
      '+2 Status Infliction, increasing your chance to inflict status effects on enemies (per 1 Scaled point)',
      '+1 Max. Skill Pool Size per 5 points, increasing the amount of skills you can equip (per 1 Scaled point)'
    ]
  },
  'cel': {
    title: 'Celerity (CEL)',
    description: "Celerity shows a character's speed and agility, and/or affinity with the Wind element.\n\nA character with high CEL may have swift cat-like reflexes, while a character with low CEL probably won't be winning any races.\n\nCEL is a defensive stat for dodge-based characters. If you are interested in playing such a character, it is recommended you increase it at least to 60 Scaled CEL by level 60, and make good use of Evade buffs and Hit debuffs.\n\nAnd don't let your enemies gang up around you, or they'll get a Flanking bonus!",
    effects: [
      '+1 Wind ATK (per 1 Scaled point)',
      '+2 Evade (per 1 Scaled point)',
      'Starting Turn Order, determined by who has the highest CEL (per 1 Scaled point)'
    ]
  },
  'def': {
    title: 'Defense (DEF)',
    description: "Defense is a character's resilience in the face of physical assaults, and/or affinity with the Earth element.\n\nCharacters with lots of DEF might be able to shrug off a punch or two, while characters with low DEF might cry after stepping on a rock.\n\nDEF is a defensive stat for characters who want to be able to take on physical threats. Hitting 40% Phys. Def can be accomplished with 45 Scaled DEF, which is typically a good total to hit by level 60 if you want to be a tanky character.",
    effects: [
      '+1 Earth ATK (per 1 Scaled point)',
      '+0.9% Physical Defense, lowering physical damage taken (per 1 Scaled point)'
    ]
  },
  'res': {
    title: 'Resistance (RES)',
    description: "Resistance is a character's protection from supernatural attacks, and/or affinity with the Dark element.\n\nCharacters with high RES may be familiar with dark arts and therefore less vulnerable to them, while a character with low RES may be a mundane sort ill-exposed to strange happenings.\n\nAside from its contributions to Dark-centered offense, RES is a defensive stat for characters who want to mitigate magic attacks. Much like its counterpart DEF, hitting 40% Mag. Def can be accomplished with 45 Scaled RES, a good total to hit by level 60 if you want to be a tanky character.",
    effects: [
      '+1 Dark ATK (per 1 Scaled point)',
      '+0.9% Magical Defense, lowering magical damage taken (per 1 Scaled point)'
    ]
  },
  'vit': {
    title: 'Vitality (VIT)',
    description: "Vitality represents a character's physical health and durability, and/or affinity with the Water element.\n\nHigh VIT characters are hard to put down, while low VIT characters may be the sickly and fragile sort.\n\nVIT is an important stat, as it is the easiest way to increase your maximum HP. All characters can benefit from having more HP, and so 40 Scaled VIT by level 60 is often recommended to increase survivability. Depending on the character, higher or lower values can be considered.\n\nVIT is also highly useful for characters seeking to become Aquamancers, both for the Water ATK and as a secondary damage scaling stat.",
    effects: [
      '+1 Water ATK (per 1 Scaled point)',
      '+10 HP (per 1 Scaled point)',
      '+1 Max. Encumbrance, letting you carry more items in your inventory without slowing down (per 1 Scaled point)'
    ]
  },
  'fai': {
    title: 'Faith (FAI)',
    description: "Faith is the strength of a character's conviction and belief, and/or affinity with the Light element.\n\nHigh FAI characters are often highly intertwined in religion, while low FAI characters are less likely to believe in higher powers.\n\nFAI is a versatile stat. Characters focusing on Light-based offense will want it for the Light ATK. Critical Evade can be useful defensively, as critical hits can be very threatening.",
    effects: [
      '+1 Light ATK (per 1 Scaled point)',
      '+3 FP (per 1 Scaled point)',
      '+1 Status Resistance, decreasing the chance for enemies to inflict you with status effects (per 1 Scaled point)',
      '+1 Critical Evade, lowering the chance of taking critical hits (per 1 Scaled point)'
    ]
  },
  'luc': {
    title: 'Luck (LUC)',
    description: "Luck is the character's good fortune, and/or affinity with the Lightning element.\n\nThe difference between high and low LUC may be between finding a shiny gold coin and tripping on an unfortunately-placed rock.\n\nLUC is what you make of it. Primarily, its use is for Lightning-based attackers, as well as those seeking to dish out a large amount of critical hits.",
    effects: [
      '+1 Lightning ATK (per 1 Scaled point)',
      '+1 Critical (per 1 Scaled point)',
      '+1 Critical Evade, lowering the chance of taking critical hits (per 1 Scaled point)',
      '+1% Item Drop Chance, boosting chances for you or allies to receive items after battle (per 1 Scaled point)',
      'Only the highest LUC in the party is applied for Item Drop Chance'
    ]
  },
  'gui': {
    title: 'Guile (GUI)',
    description: "Guile is a character's capability of cunning or 'alternative thinking', and/or affinity with the Acid element.\n\nHigh GUI characters may be sneaky tricksters or schemers, while low GUI characters may lack street smarts.\n\nAside from certain exceptions, most Dagger and Gun weapons have GUI Primary Scaling. Characters interested in using them will want a healthy helping of GUI. Similarly, because it influences your Critical Damage, any character interested in focusing on critical hits will want to invest at least a little bit in GUI to make them more worthwhile.",
    effects: [
      '+1 Acid ATK (per 1 Scaled point)',
      '+0.5 Flanking (per 1 Scaled point)',
      '+1% Critical Damage (per 1 Scaled point)',
      '-1 Farshot Penalty per 5 points (per 1 Scaled point)',
      '+1 Max. Skill Pool Size per 5 points, increasing the amount of skills you can equip (per 1 Scaled point)'
    ]
  },
  'san': {
    title: 'Sanctity (SAN)',
    description: "Sanctity is the presence of the divine in a character, such as the strength of their racial gifts or resistance to corruption, and/or affinity with the Sound element.\n\nHigh SAN characters may be performers and singers, while low SAN characters may be among the Corrupted race or otherwise have low spiritual abilities.\n\nSAN has a wide variety of benefits and can be very useful if you can afford to invest in it. Because many instrument weapons scale partially with this stat, characters using Bard classes will want to do so.\n\nAlso of note is that many races have skills whose benefits directly scale with your SAN stat. Depending on your race, you may want to increase this stat to increase the effectiveness of those abilities. Corrupted often do not want SAN, however, as it actually lowers their racial abilities' strength.",
    effects: [
      '+1 Sound ATK (per 1 Scaled point)',
      '+2 HP (per 1 Scaled point)',
      '+2 FP (per 1 Scaled point)',
      '+2 Status Resistance, decreasing the chance for enemies to inflict you with status effects (per 1 Scaled point)',
      '+1% Elemental Resistance per 6 points, for Fire, Ice, Wind, Earth, Water, Lightning, Dark, and Light elements (per 1 Scaled point)'
    ]
  },
  'apt': {
    title: 'Aptitude (APT)',
    description: "Aptitude is a character's flexibility and capability to adapt to a variety of situations.\n\nHigh APT characters may be able to do a lot of things well, while low APT characters may be slow learners.\n\nBecause of APT's ability to bolster your other stats, almost every character will want to invest in it to help round out their character. Depending on your preference or racial stats, you may want to go up to 36 Scaled APT or 42 Scaled APT by level 60. Races with starting APT, such as Humans, can often obtain the latter without penalty.\n\nYou can go as high as 80 APT if you wish to make use of the Undeniable Innovator trait.",
    effects: [
      '+1% Experience Earned (per 1 Scaled point)',
      '+1 bonus to all other stats per 6 points (per 1 Scaled point)'
    ],
    notes: 'IMPORTANT: Stats obtained by APT are NOT base stats, they are bonus stats. This means they will not count towards trait requirements, and are subject to mechanics involving bonus stats (e.g., DEF from APT is negated while Burned).'
  }
};

// Template builds based on stat optimization notes
const TEMPLATE_BUILDS = {
  'soldier': {
    name: 'Human Soldier',
    description: 'Basic physical fighter build. High STR for weapon damage, good defenses, and survivability.',
    stats: { str: 58, wil: 0, ski: 54, cel: 0, def: 20, res: 15, vit: 40, fai: 0, luc: 17, gui: 0, san: 0, apt: 36 },
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Soldier',
    subClass: 'Soldier',
    selectedMainBaseClass: 'Soldier',
    selectedSubBaseClass: 'Soldier',
    history: 'Warrior',
    reasoning: 'STR for weapon scaling, SKI for accuracy, balanced defenses, VIT for HP. Warrior history provides +2 STR, +1 SKI as invested points.'
  },
  'mage': {
    name: 'Human Mage',
    description: 'Basic magical caster build. High WIL for FP and spell power, focus on elemental damage.',
    stats: { str: 0, wil: 58, ski: 55, cel: 0, def: 15, res: 20, vit: 40, fai: 16, luc: 0, gui: 0, san: 0, apt: 36 },
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Mage',
    subClass: 'Mage',
    selectedMainBaseClass: 'Mage',
    selectedSubBaseClass: 'Mage',
    history: 'Magician',
    reasoning: 'WIL for FP and elemental damage, SKI for accuracy, RES for magical defense. Magician history provides +2 WIL, +1 CEL as invested points.'
  },
  'rogue': {
    name: 'Human Rogue',
    description: 'Basic agility build. Focus on critical hits, evasion, and finesse weapons like daggers.',
    stats: { str: 0, wil: 0, ski: 53, cel: 35, def: 10, res: 10, vit: 40, fai: 0, luc: 44, gui: 12, san: 0, apt: 36 },
    race: 'Human',
    subrace: 'Imperialist',
    mainClass: 'Rogue',
    subClass: 'Rogue',
    selectedMainBaseClass: 'Rogue',
    selectedSubBaseClass: 'Rogue',
    history: 'Assassin',
    reasoning: 'CEL for evasion, LUC for critical chance, GUI for critical damage, SKI for accuracy. Assassin history provides +2 SKI, +1 LUC as invested points.'
  }
};

// Build Type Definitions for Stat Optimization
interface BuildType {
  name: string;
  description: string;
  statPriorities: Record<StatKey, number>; // 0-10 priority score
  statThresholds: Partial<Record<StatKey, { min?: number; ideal?: number; max?: number }>>;
  weaponTypes?: string[];
  classCompatibility?: Record<string, number>; // Class compatibility score 0-10
}

const BUILD_TYPES: Record<string, BuildType> = {
  'evade': {
    name: 'Evade Tank',
    description: 'High mobility and evasion, avoiding damage through dodge',
    statPriorities: {
      str: 3, wil: 5, ski: 9, cel: 10, def: 2, res: 2, vit: 6, fai: 4, luc: 6, gui: 5, san: 3, apt: 8
    },
    statThresholds: {
      cel: { min: 35, ideal: 45, max: 55 },    // Adjusted for DR
      ski: { min: 40, ideal: 50, max: 60 },    // More realistic with DR
      vit: { min: 25, ideal: 35, max: 45 },    // HP threshold
      apt: { min: 24, ideal: 36, max: 48 }     // 4-8 stat bonus from APT
    },
    weaponTypes: ['Daggers', 'Swords', 'Bows'],
    classCompatibility: {
      // High compatibility - classes with natural evasion focus
      'Rogue': 10, 'Duelist': 10, 'Archer': 9, 'Dancer': 9, 'Void Assassin': 9, 'Shinobi': 9,
      // Good compatibility - mobile classes or those with evade synergy
      'Monk': 8, 'Ranger': 8, 'Bard': 7, 'Kensei': 7, 'Verglas': 7, 'Spellthief': 7, 'Firebird': 7,
      // Moderate compatibility - some mobility/evade elements
      'Magic Gunner': 6, 'Engineer': 6, 'Shapeshifter': 6, 'Martial Artist': 5, 'Demon Hunter': 6,
      // Lower compatibility - but still workable
      'Performer': 5, 'Dark Bard': 4, 'Tactician': 5, 'Summoner': 4, 'Bonder': 4, 'Grand Summoner': 4,
      // Poor compatibility - heavy armor/tank focused
      'Soldier': 3, 'Black Knight': 2, 'Arbalest': 3, 'Boxer': 3,
      // Caster compatibility varies
      'Mage': 4, 'Evoker': 4, 'Hexer': 3, 'Rune Magician': 5, 'Ruler': 4,
      'Curate': 5, 'Priest': 4, 'Aquamancer': 5, 'Lantern Bearer': 4, 'Druid': 5,
      'Solblader': 5, 'Ghost': 6
    }
  },
  'tank': {
    name: 'Defense Tank',
    description: 'High physical and magical defense, tanking damage through raw mitigation',
    statPriorities: {
      str: 6, wil: 4, ski: 7, cel: 3, def: 10, res: 10, vit: 9, fai: 5, luc: 3, gui: 2, san: 6, apt: 8
    },
    statThresholds: {
      def: { min: 30, ideal: 40, max: 50 },    // ~36% phys def at 40
      res: { min: 30, ideal: 40, max: 50 },    // ~36% mag def at 40  
      vit: { min: 30, ideal: 45, max: 60 },    // Good HP pool
      ski: { min: 40, ideal: 50, max: 60 },    // Accuracy requirement
      apt: { min: 18, ideal: 30, max: 42 }     // 3-7 stat bonus
    },
    weaponTypes: ['Axes', 'Spears', 'Swords'],
    classCompatibility: {
      // Perfect compatibility - natural tanks
      'Soldier': 10, 'Black Knight': 10, 'Boxer': 9,
      // Excellent compatibility - defensive focus
      'Arbalest': 9, 'Demon Hunter': 8, 'Monk': 8, 'Solblader': 8,
      // Good compatibility - supportive tanks or hybrid defense
      'Priest': 8, 'Lantern Bearer': 8, 'Curate': 7, 'Hexer': 7, 'Tactician': 7,
      'Druid': 7, 'Aquamancer': 6, 'Bonder': 6, 'Martial Artist': 6,
      // Moderate compatibility - can work with investment
      'Kensei': 6, 'Duelist': 5, 'Bard': 5, 'Performer': 5, 'Dark Bard': 6,
      'Summoner': 5, 'Grand Summoner': 5, 'Mage': 5, 'Ruler': 6,
      // Lower compatibility - opposing focus
      'Rogue': 3, 'Archer': 4, 'Magic Gunner': 4, 'Dancer': 3, 'Void Assassin': 3,
      'Evoker': 3, 'Verglas': 4, 'Shinobi': 3, 'Spellthief': 3, 'Engineer': 4,
      'Firebird': 4, 'Ghost': 4, 'Ranger': 4, 'Rune Magician': 4, 'Shapeshifter': 4
    }
  },
  'glass_cannon': {
    name: 'Glass Cannon',
    description: 'Maximum damage output with minimal defensive investment',
    statPriorities: {
      str: 9, wil: 8, ski: 9, cel: 4, def: 1, res: 2, vit: 4, fai: 6, luc: 8, gui: 7, san: 3, apt: 7
    },
    statThresholds: {
      str: { min: 40, ideal: 50, max: 65 },    // Physical builds
      wil: { min: 40, ideal: 50, max: 65 },    // Magical builds
      ski: { min: 45, ideal: 55, max: 65 },    // Hit requirement
      luc: { min: 25, ideal: 35, max: 50 },    // Crit chance
      vit: { min: 20, ideal: 30, max: 40 },    // Minimal HP
      apt: { min: 24, ideal: 36, max: 48 }     // Stat efficiency
    },
    weaponTypes: ['Daggers', 'Guns', 'Tomes', 'Bows'],
    classCompatibility: {
      // Perfect compatibility - pure offense
      'Mage': 10, 'Evoker': 10, 'Magic Gunner': 10, 'Rogue': 9, 'Archer': 9,
      // Excellent compatibility - high damage potential
      'Hexer': 8, 'Summoner': 8, 'Ranger': 8, 'Kensei': 8, 'Void Assassin': 8,
      'Rune Magician': 8, 'Ghost': 8, 'Firebird': 7, 'Shapeshifter': 7,
      // Good compatibility - can focus on offense
      'Duelist': 7, 'Martial Artist': 7, 'Verglas': 7, 'Shinobi': 7, 'Spellthief': 7,
      'Dancer': 6, 'Demon Hunter': 6, 'Engineer': 6, 'Bonder': 6, 'Grand Summoner': 7,
      // Moderate compatibility - some offensive capability
      'Soldier': 5, 'Bard': 5, 'Dark Bard': 5, 'Ruler': 6, 'Solblader': 6,
      // Lower compatibility - support focused
      'Curate': 4, 'Priest': 4, 'Aquamancer': 4, 'Lantern Bearer': 4, 'Performer': 4,
      'Tactician': 4, 'Druid': 4,
      // Poor compatibility - defensive focus
      'Black Knight': 2, 'Arbalest': 3, 'Boxer': 3
    }
  },
  'hybrid': {
    name: 'Balanced Hybrid',
    description: 'Balanced approach with good offense and defense capabilities',
    statPriorities: {
      str: 7, wil: 6, ski: 8, cel: 6, def: 6, res: 6, vit: 7, fai: 5, luc: 6, gui: 5, san: 4, apt: 8
    },
    statThresholds: {
      str: { min: 25, ideal: 35, max: 50 },    // Moderate offense
      ski: { min: 40, ideal: 50, max: 60 },    // Accuracy
      def: { min: 20, ideal: 30, max: 40 },    // Some defense
      res: { min: 20, ideal: 30, max: 40 },    // Some mag defense
      vit: { min: 25, ideal: 35, max: 50 },    // Decent HP
      apt: { min: 18, ideal: 30, max: 42 }     // Balanced stats
    },
    weaponTypes: ['Swords', 'Spears', 'Axes'],
    classCompatibility: {
      // Perfect compatibility - naturally balanced
      'Soldier': 8, 'Kensei': 9, 'Duelist': 8, 'Bard': 8, 'Demon Hunter': 8,
      'Martial Artist': 8, 'Monk': 8, 'Solblader': 9, 'Tactician': 8,
      // Excellent compatibility - good balance potential  
      'Performer': 7, 'Curate': 7, 'Lantern Bearer': 7, 'Druid': 7, 'Bonder': 7,
      'Ranger': 7, 'Firebird': 7, 'Spellthief': 7, 'Engineer': 7,
      // Good compatibility - can be made balanced
      'Priest': 6, 'Aquamancer': 6, 'Summoner': 6, 'Grand Summoner': 6, 'Mage': 6,
      'Rogue': 6, 'Archer': 6, 'Magic Gunner': 6, 'Verglas': 6, 'Shinobi': 6,
      'Ruler': 6, 'Dancer': 6, 'Dark Bard': 6, 'Shapeshifter': 6,
      // Moderate compatibility - requires more investment
      'Hexer': 5, 'Rune Magician': 5, 'Void Assassin': 5, 'Ghost': 5,
      'Arbalest': 5, 'Boxer': 5,
      // Lower compatibility - too specialized
      'Evoker': 4, 'Black Knight': 4
    }
  },
  'support': {
    name: 'Support/Healer',
    description: 'Focus on supporting allies with heals, buffs, and utility',
    statPriorities: {
      str: 2, wil: 9, ski: 7, cel: 5, def: 4, res: 6, vit: 6, fai: 8, luc: 3, gui: 3, san: 8, apt: 8
    },
    statThresholds: {
      wil: { min: 40, ideal: 50, max: 65 },    // FP and spell power
      fai: { min: 25, ideal: 35, max: 50 },    // Light ATK and FP
      san: { min: 20, ideal: 30, max: 45 },    // Status resist and HP/FP
      ski: { min: 35, ideal: 45, max: 55 },    // Spell accuracy
      vit: { min: 20, ideal: 30, max: 45 },    // Survivability
      apt: { min: 18, ideal: 30, max: 42 }     // Stat distribution
    },
    weaponTypes: ['Tomes', 'Spears'],
    classCompatibility: {
      // Perfect compatibility - dedicated support
      'Curate': 10, 'Priest': 10, 'Aquamancer': 9, 'Lantern Bearer': 9, 'Performer': 9,
      // Excellent compatibility - strong support elements
      'Bard': 8, 'Dark Bard': 7, 'Summoner': 8, 'Druid': 8, 'Tactician': 8,
      'Ruler': 8, 'Grand Summoner': 7,
      // Good compatibility - some support capability
      'Mage': 7, 'Hexer': 6, 'Bonder': 6, 'Rune Magician': 6, 'Engineer': 6,
      'Dancer': 5, 'Shapeshifter': 5,
      // Moderate compatibility - can provide utility
      'Soldier': 5, 'Monk': 5, 'Ranger': 5, 'Spellthief': 5, 'Solblader': 6,
      'Demon Hunter': 4, 'Firebird': 4, 'Verglas': 4,
      // Lower compatibility - offense focused
      'Rogue': 3, 'Duelist': 3, 'Archer': 4, 'Magic Gunner': 4, 'Kensei': 3,
      'Martial Artist': 3, 'Void Assassin': 3, 'Shinobi': 3, 'Ghost': 3,
      'Evoker': 4, 'Boxer': 3, 'Black Knight': 4, 'Arbalest': 4
    }
  },
  'critical': {
    name: 'Critical Focus',
    description: 'Maximize critical hit chance and damage for burst potential',
    statPriorities: {
      str: 6, wil: 3, ski: 8, cel: 6, def: 3, res: 3, vit: 5, fai: 4, luc: 10, gui: 9, san: 2, apt: 7
    },
    statThresholds: {
      luc: { min: 30, ideal: 40, max: 55 },    // Crit chance
      gui: { min: 25, ideal: 35, max: 50 },    // Crit damage and weapon scaling
      ski: { min: 40, ideal: 50, max: 60 },    // Base accuracy
      cel: { min: 20, ideal: 30, max: 45 },    // Some evasion
      vit: { min: 20, ideal: 30, max: 45 },    // Basic survivability
      apt: { min: 24, ideal: 36, max: 48 }     // Stat efficiency
    },
    weaponTypes: ['Daggers', 'Guns', 'Swords'],
    classCompatibility: {
      // Perfect compatibility - crit focused classes
      'Rogue': 10, 'Magic Gunner': 9, 'Duelist': 9, 'Void Assassin': 9, 'Kensei': 8,
      // Excellent compatibility - high crit potential
      'Ranger': 7, 'Archer': 7, 'Martial Artist': 7, 'Verglas': 7, 'Shinobi': 8,
      'Ghost': 8, 'Firebird': 7, 'Shapeshifter': 7, 'Spellthief': 7,
      // Good compatibility - can build for crits
      'Soldier': 6, 'Demon Hunter': 6, 'Dancer': 6, 'Monk': 6, 'Engineer': 6,
      'Bonder': 5, 'Boxer': 5,
      // Moderate compatibility - some crit synergy
      'Bard': 5, 'Summoner': 5, 'Mage': 5, 'Druid': 5, 'Tactician': 5,
      'Solblader': 5, 'Rune Magician': 4,
      // Lower compatibility - limited crit focus
      'Curate': 3, 'Priest': 3, 'Aquamancer': 3, 'Lantern Bearer': 3, 'Performer': 3,
      'Dark Bard': 4, 'Hexer': 4, 'Evoker': 4, 'Ruler': 4, 'Grand Summoner': 4,
      // Poor compatibility - no crit synergy
      'Black Knight': 2, 'Arbalest': 3
    }
  }
};

// Stat Optimization Engine
interface OptimizationResult {
  allocatedStats: StatRecord;
  totalPoints: number;
  score: number;
  reasoning: string[];
  warnings: string[];
}

interface OptimizationParams {
  buildType: string;
  mainClass: string;
  subClass: string;
  race: string;
  subrace: string;
  history: string;
  astrology?: string;
  legendExtend: Record<string, boolean>;
  targetLevel: number;
  includeCustomStats: boolean;
  customStats?: StatRecord;
  customBaseStats?: StatRecord;
  customHP?: number;
  customFP?: number;
  prioritizeWeaponScaling: boolean;
  weaponType?: string;
  mainClassPassive: number;
  subClassPassive: number;
  baseEvade: number;
  bonusEvade: number;
  optimizationMode?: 'weights' | 'targets';
  targetStats?: StatRecord;
  customWeights?: {
    // Summoner preferences
    youkaiCount?: number;           // 5-12, affects WIL/FP priority (base 5 + up to 7 from faith)
    summonSurvivability?: number;   // 0-10, affects SAN priority
    
    // Combat preferences
    criticalFocus?: number;         // 0-10, affects LUC/GUI priority
    magicDamageFocus?: number;      // 0-10, affects WIL priority
    physicalDamageFocus?: number;   // 0-10, affects STR priority
    accuracyFocus?: number;         // 0-10, affects SKI priority
    
    // Defensive preferences
    minimumHP?: number;           // Hard constraint for minimum HP
    fpPriority?: number;           // 0-10, affects WIL priority
    physicalDefense?: number;      // 0-10, affects DEF priority
    magicalDefense?: number;       // 0-10, affects RES priority
    
    // Utility preferences
    initiativePriority?: number;   // 0-10, affects CEL priority
    statusResistance?: number;     // 0-10, affects SAN priority
    carryCapacity?: number;        // 0-10, affects STR priority for encumbrance
    
    // Advanced preferences
    targetAPT?: 36 | 42;          // Fixed APT choices: 36 or 42 final
    targetEvade?: number;         // Target evade value (CEL*2 + base + bonus)
  };
}

class StatOptimizer {
  private buildType: BuildType;
  private params: OptimizationParams;
  private maxPoints: number;
  
  constructor(buildType: BuildType, params: OptimizationParams) {
    this.buildType = buildType;
    this.params = params;
    this.maxPoints = 240; // Level 60 stat points
  }

  /**
   * Calculate minimum Faith investment needed for target youkai count
   * Formula: (target_youkai - 5) * 5 minimum invested points
   * This accounts for the Faith investment thresholds in SL2
   */
  private getMinimumFaithForYoukai(targetYoukai: number): number {
    if (targetYoukai <= 5) return 0; // No Faith needed for base 5 youkai
    
    // Simple calculation: each extra youkai beyond 5 needs roughly 5 Faith
    // This gives us reasonable minimums like 35 Faith for 12 youkai
    const extraYoukai = targetYoukai - 5;
    const minimumFaith = extraYoukai * 5;
    return minimumFaith;
  }

  /**
   * Calculate custom weight priorities based on user preferences
   */
  private getCustomWeightPriorities(): Record<StatKey, number> {
    const priorities: Record<StatKey, number> = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    const weights = this.params.customWeights;
    if (!weights) return priorities;

    // Summoner-specific weights
    if (weights.youkaiCount) {
      const baseYoukai = 5; // Base youkai count with 0 faith
      const targetYoukai = weights.youkaiCount;
      const extraYoukai = Math.max(0, targetYoukai - baseYoukai); // How many extra beyond base
      const youkaiWeight = extraYoukai / 7; // Normalize 0-7 extra to 0-1 (max 12 total)
      
      // Calculate minimum Faith investment needed for this youkai target
      const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
      const faithWeightBonus = Math.min(1.0, minFaithNeeded / 35); // Scale bonus based on Faith requirement
      
      priorities.wil += youkaiWeight * 15; // More WIL for FP to sustain youkai
      priorities.fai += youkaiWeight * 25 + faithWeightBonus * 15; // Extra FAI priority for threshold investments
      // SAN removed - it doesn't meaningfully help with youkai management
    }

    if (weights.summonSurvivability) {
      const survivalWeight = weights.summonSurvivability / 10;
      priorities.wil += survivalWeight * 8;  // WIL for more FP for heals
    }

    // Combat focus weights
    if (weights.criticalFocus) {
      const critWeight = weights.criticalFocus / 10;
      priorities.luc += critWeight * 15;
      priorities.gui += critWeight * 12;
      priorities.ski += critWeight * 8; // Accuracy for crits to land
    }

    if (weights.magicDamageFocus) {
      const magicWeight = weights.magicDamageFocus / 10;
      priorities.wil += magicWeight * 18;
      priorities.ski += magicWeight * 10; // Spell accuracy
      priorities.fai += magicWeight * 6;  // For light/dark magic
    }

    if (weights.physicalDamageFocus) {
      const physWeight = weights.physicalDamageFocus / 10;
      priorities.str += physWeight * 18;
      priorities.ski += physWeight * 12; // Physical accuracy
      priorities.gui += physWeight * 8;  // Crit for physical
    }

    if (weights.accuracyFocus) {
      const accWeight = weights.accuracyFocus / 10;
      priorities.ski += accWeight * 20; // Direct accuracy boost
      priorities.luc += accWeight * 5;  // Hit bonus from LUC
    }

    // Defensive weights
    if (weights.minimumHP) {
      // When HP minimum is specified, boost VIT priority significantly
      priorities.vit += 50; // Strong priority for reaching minimum HP
      priorities.str += 5; // Slight STR for carry capacity
    }

    if (weights.fpPriority) {
      const fpWeight = weights.fpPriority / 10;
      priorities.wil += fpWeight * 20;
      priorities.fai += fpWeight * 5; // FAI affects max FP slightly
    }

    if (weights.physicalDefense) {
      const pdefWeight = weights.physicalDefense / 10;
      priorities.def += pdefWeight * 18;
      priorities.vit += pdefWeight * 8; // HP to survive hits
    }

    if (weights.magicalDefense) {
      const mdefWeight = weights.magicalDefense / 10;
      priorities.res += mdefWeight * 18;
      priorities.wil += mdefWeight * 6; // FP for magical endurance
    }

    // Utility weights
    if (weights.initiativePriority) {
      const initWeight = weights.initiativePriority / 10;
      priorities.cel += initWeight * 16; // CEL is primary initiative stat
      priorities.luc += initWeight * 6;  // LUC affects initiative slightly
    }

    if (weights.statusResistance) {
      const statusWeight = weights.statusResistance / 10;
      priorities.san += statusWeight * 15; // Primary status resistance
      priorities.fai += statusWeight * 8;  // Faith helps with some statuses
      priorities.wil += statusWeight * 5;  // Mental fortitude
    }

    if (weights.carryCapacity) {
      const carryWeight = weights.carryCapacity / 10;
      priorities.str += carryWeight * 12; // STR affects carry weight
    }

    if (weights.targetEvade) {
      // Calculate how much CEL we need to reach target evade
      // Formula: Evade = (CEL * 2) + baseEvade + bonusEvade
      // So: CEL needed = (targetEvade - baseEvade - bonusEvade) / 2
      const baseEvade = this.params.baseEvade || 0;
      const bonusEvade = this.params.bonusEvade || 0; 
      const celNeeded = Math.max(0, (weights.targetEvade - baseEvade - bonusEvade) / 2);
      
      // Boost CEL priority based on how much we need
      priorities.cel += Math.min(50, celNeeded); // Cap at 50 priority boost
      priorities.luc += 10; // LUC also affects dodge chance
    }

    // Advanced weights
    if (weights.targetAPT && this.params.mainClass !== this.params.subClass) {
      // When multiclassing and APT target is specified, boost APT priority significantly
      priorities.apt += 50; // Strong priority for reaching target APT
    }

    return priorities;
  }

  /**
   * Get weapon scaling preferences for a class combination
   */
  private getWeaponScalingPriorities(): Record<StatKey, number> {
    const priorities: Record<StatKey, number> = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    // Analyze valid weapons for both classes
    const mainClassWeapons = CLASSES[this.params.mainClass]?.validWeapons || [];
    const subClassWeapons = CLASSES[this.params.subClass]?.validWeapons || [];
    const allWeapons = [...new Set([...mainClassWeapons, ...subClassWeapons])];

    // Weapon scaling priorities based on SL2 weapon mechanics
    const weaponScaling: Record<string, StatKey[]> = {
      'Swords': ['str', 'ski'],
      'Axes': ['str'],
      'Spears': ['str', 'ski'],
      'Bows': ['str', 'ski'],
      'Guns': ['gui', 'ski'],
      'Daggers': ['gui', 'ski'],
      'Tomes': ['wil', 'ski'],
      'Fist': ['str', 'ski']
    };

    // Add weapon scaling priorities
    allWeapons.forEach(weapon => {
      const stats = weaponScaling[weapon] || [];
      stats.forEach((stat, index) => {
        priorities[stat] += (stats.length - index) * 2; // Primary stats get higher priority
      });
    });

    return priorities;
  }

  /**
   * Calculate class synergy bonuses for stat allocation
   */
  private getClassSynergyPriorities(): Record<StatKey, number> {
    const priorities: Record<StatKey, number> = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    // Analyze class stat bonuses and synergies
    const mainClassStats = CLASSES[this.params.mainClass] || {};
    const subClassStats = CLASSES[this.params.subClass] || {};

    // Add bonuses for class stat preferences
    Object.entries(mainClassStats).forEach(([stat, value]) => {
      if (stat in priorities && typeof value === 'number' && value > 0) {
        priorities[stat as StatKey] += value * 2;
      }
    });

    Object.entries(subClassStats).forEach(([stat, value]) => {
      if (stat in priorities && typeof value === 'number' && value > 0) {
        priorities[stat as StatKey] += value;
      }
    });

    return priorities;
  }

  /**
   * Calculate APT efficiency - how much APT is worth vs direct stat investment
   * APT should always be optimized in multiples of 6 for maximum efficiency
   */
  private calculateAptEfficiency(currentApt: number): number {
    const aptBonusPerStat = Math.floor((currentApt + 1) / 6) - Math.floor(currentApt / 6);
    return aptBonusPerStat * 11; // APT affects 11 other stats
  }

  /**
   * Get the next efficient APT target (next multiple of 6 that provides a bonus)
   */
  private getNextAptTarget(allocation: StatRecord): number {
    const subraceData = SUBRACES[this.params.subrace];
    const baseRacial = subraceData?.apt || 0;
    const currentAllocated = allocation.apt;
    const totalApt = baseRacial + currentAllocated;
    
    // Find next multiple of 6 above current total
    const nextThreshold = Math.ceil(totalApt / 6) * 6;
    return Math.max(0, nextThreshold - baseRacial);
  }

  /**
   * Check if APT allocation is efficient (final APT divisible by 6)
   */
  private isAptAllocationEfficient(allocation: StatRecord): boolean {
    const finalAPT = this.calculateFinalStat(allocation, 'apt');
    return finalAPT % 6 === 0;
  }

  /**
   * Optimize stat allocation using genetic algorithm approach
   */
  optimize(): OptimizationResult {
    const maxIterations = 500; // Reduced for better performance
    const populationSize = 30;
    
    let bestAllocation = this.generateInitialAllocation();
    let bestScore = this.evaluateAllocation(bestAllocation);
    
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Validate build type compatibility
    const mainClassCompatibility = this.buildType.classCompatibility?.[this.params.mainClass] || 5;
    const subClassCompatibility = this.buildType.classCompatibility?.[this.params.subClass] || 5;
    
    if (mainClassCompatibility < 6) {
      warnings.push(`${this.params.mainClass} has low compatibility (${mainClassCompatibility}/10) with ${this.buildType.name} builds`);
    }
    if (subClassCompatibility < 6) {
      warnings.push(`${this.params.subClass} has low compatibility (${subClassCompatibility}/10) with ${this.buildType.name} builds`);
    }

    // Check for obvious conflicts
    if (this.buildType.name.includes('Tank') && this.params.subrace === 'Lich') {
      warnings.push('Lich race has reduced HP which conflicts with tank builds');
    }

    // Generate initial population
    const population: StatRecord[] = [];
    for (let i = 0; i < populationSize; i++) {
      population.push(this.generateRandomAllocation());
    }

    // Add the initial smart allocation to population
    population[0] = bestAllocation;

    // Evolution loop with early termination
    let bestScoreImprovement = 0;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Evaluate and sort population
      const scored = population.map(allocation => ({
        allocation,
        score: this.evaluateAllocation(allocation)
      })).sort((a, b) => b.score - a.score);

      // Update best if improved
      if (scored[0].score > bestScore) {
        const improvement = scored[0].score - bestScore;
        bestScore = scored[0].score;
        bestAllocation = { ...scored[0].allocation };
        bestScoreImprovement = improvement;
      }

      // Early termination if we haven't improved in a while
      if (iteration > 100 && bestScoreImprovement < 1) {
        break;
      }

      // Generate new population (keep top 30%, mutate top 60%, random 10%)
      const newPopulation: StatRecord[] = [];
      
      // Keep elite
      const eliteCount = Math.floor(populationSize * 0.3);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ ...scored[i].allocation });
      }

      // Mutate good solutions
      const mutationCount = Math.floor(populationSize * 0.6);
      for (let i = 0; i < mutationCount; i++) {
        const parent = scored[i % eliteCount].allocation;
        newPopulation.push(this.mutateAllocation(parent));
      }

      // Add random solutions
      while (newPopulation.length < populationSize) {
        newPopulation.push(this.generateRandomAllocation());
      }

      population.splice(0, population.length, ...newPopulation);
    }

    // Generate reasoning based on final allocation
    reasoning.push(`Build Type: ${this.buildType.name} - ${this.buildType.description}`);
    reasoning.push(`Optimized for ${this.params.mainClass}/${this.params.subClass} combination`);
    
    // Analyze final stats against thresholds
    const finalStats: Record<string, number> = {};
    const allocatedPoints: Record<string, number> = {};
    Object.entries(bestAllocation).forEach(([stat]) => {
      finalStats[stat] = this.calculateFinalStat(bestAllocation, stat as StatKey);
      allocatedPoints[stat] = bestAllocation[stat as StatKey];
    });

    // Add debug information about stat efficiency
    const subraceData = SUBRACES[this.params.subrace];
    Object.entries(allocatedPoints).forEach(([stat, allocated]) => {
      if (allocated > 0) {
        const baseRacial = subraceData?.[stat as StatKey] || 0;
        const final = finalStats[stat];
        const efficiency = allocated > 0 ? final / allocated : 0;
        const softCap = baseRacial + 40;
        
        if (stat === 'apt') {
          const totalApt = baseRacial + allocated;
          const aptBonus = Math.floor(totalApt / 6);
          const isEfficient = totalApt % 6 === 0;
          reasoning.push(`APT: ${allocated} points → ${final} final (${aptBonus} bonus to all stats, ${isEfficient ? 'efficient' : 'INEFFICIENT'} allocation)`);
        } else if (allocated > 50) {
          reasoning.push(`${stat.toUpperCase()}: ${allocated} points → ${final} final (efficiency: ${efficiency.toFixed(2)}, soft cap: ${softCap})`);
        }
      }
    });

    // Check thresholds and add reasoning/warnings
    Object.entries(this.buildType.statThresholds).forEach(([stat, thresholds]) => {
      const finalStat = finalStats[stat];
      if (thresholds?.min && finalStat < thresholds.min) {
        warnings.push(`${stat.toUpperCase()} (${finalStat}) is below minimum threshold (${thresholds.min})`);
      } else if (thresholds?.ideal && finalStat >= thresholds.ideal) {
        reasoning.push(`${stat.toUpperCase()} meets ideal threshold (${finalStat}/${thresholds.ideal})`);
      } else if (thresholds?.min && finalStat >= thresholds.min) {
        reasoning.push(`${stat.toUpperCase()} meets minimum requirement (${finalStat}/${thresholds.min})`);
      }
    });

    // APT efficiency analysis
    const aptValue = finalStats['apt'];
    const aptBonus = Math.floor(aptValue / 6);
    if (aptBonus > 0) {
      reasoning.push(`APT investment provides +${aptBonus} to all other stats (${aptValue}/6 ratio)`);
    }

    // Custom weight analysis
    if (this.params.customWeights) {
      const activeWeights = Object.entries(this.params.customWeights)
        .filter(([, value]) => value && value > 5) // Only show significant preferences
        .map(([key, value]) => {
          const weightNames: Record<string, string> = {
            youkaiCount: `${value} Youkai slots (${this.getMinimumFaithForYoukai(value)} Faith min, ${this.calculateYoukaiFPRequirement(value)} FP needed)`,
            summonSurvivability: 'Summon survivability',
            criticalFocus: 'Critical focus',
            magicDamageFocus: 'Magic damage',
            physicalDamageFocus: 'Physical damage',
            accuracyFocus: 'Accuracy focus',
            hpPriority: 'HP priority',
            fpPriority: 'FP priority',
            physicalDefense: 'Physical defense',
            magicalDefense: 'Magical defense',
            initiativePriority: 'Initiative priority',
            statusResistance: 'Status resistance',
            targetEvade: 'Target evade value',
            multiclassEfficiency: 'Multiclass efficiency'
          };
          return weightNames[key] || key;
        });
      
      if (activeWeights.length > 0) {
        reasoning.push(`Custom preferences: ${activeWeights.join(', ')}`);
        
        // Add explanation for youkai FP calculation if youkai are involved
        if (this.params.customWeights?.youkaiCount) {
          const isShapeshifter = this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter';
          const isGrandSummoner = this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner';
          const isBonder = this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder';
          const isSummoner = this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner';
          
          if (isShapeshifter && !isSummoner) {
            reasoning.push(`Shapeshifter FP: Optimized for Install skills (low sustained FP needs)`);
          } else if (isGrandSummoner && !isSummoner) {
            reasoning.push(`Grand Summoner FP: Optimized for youkai skills (moderate FP needs)`);
          } else if (isBonder && !isSummoner) {
            reasoning.push(`Bonder FP: Optimized for bonds and utility (low-moderate FP needs)`);
          } else if (isSummoner) {
            reasoning.push(`Summoner FP: Optimized for multiple active youkai (high sustained FP)`);
          }
        }
      }
      
      // HP/FP goal analysis
      if (this.params.customWeights?.minimumHP) {
        const actualHP = this.calculateAccurateHP(bestAllocation);
        const minHP = this.params.customWeights.minimumHP;
        
        if (actualHP >= minHP) {
          reasoning.push(`HP meets minimum requirement (${actualHP}/${minHP})`);
        } else {
          reasoning.push(`HP below minimum requirement (${actualHP}/${minHP})`);
        }
      }
      
      if (this.params.customWeights?.targetAPT && this.params.mainClass !== this.params.subClass) {
        const aptStat = finalStats['apt'];
        const targetAPT = this.params.customWeights.targetAPT;
        
        if (aptStat >= targetAPT) {
          reasoning.push(`APT meets target requirement (${aptStat}/${targetAPT})`);
        } else {
          reasoning.push(`APT below target requirement (${aptStat}/${targetAPT})`);
        }
      }
      
      // Legacy HP analysis (for builds not using minimum HP)
      if (!this.params.customWeights?.minimumHP) {
        const vitStat = finalStats['vit'];
        const sanStat = finalStats['san'];
        const strAllocated = bestAllocation.str; // Use allocated STR, not final
        
        // Basic HP calculation (simplified, without all bonuses for reasoning clarity)
        let estimatedHP = vitStat * 10 + sanStat * 2 + strAllocated * 3;
        if (this.params.customHP) {
          estimatedHP += this.params.customHP;
        }
        
        const hpStatus = estimatedHP >= 700 ? 'achieved' : 'below target';
        reasoning.push(`HP Goal: ${estimatedHP} HP (700+ target ${hpStatus})`);
      }
      
      if (this.params.customWeights?.fpPriority && this.params.customWeights.fpPriority > 5) {
        const wilStat = finalStats['wil'];
        const sanStat = finalStats['san'];
        const actualFP = wilStat * 2 + sanStat + (this.params.customFP || 0);
        const fpStatus = actualFP >= 200 ? 'achieved' : 'below target';
        reasoning.push(`FP Goal: ${actualFP} FP (200+ target ${fpStatus})`);
      }
    }

    // Weapon compatibility
    if (this.params.prioritizeWeaponScaling) {
      const weaponPriorities = this.getWeaponScalingPriorities();
      const prioritizedStats = Object.entries(weaponPriorities)
        .filter(([, priority]) => priority > 0)
        .map(([stat]) => stat.toUpperCase());
      
      if (prioritizedStats.length > 0) {
        reasoning.push(`Weapon scaling prioritized: ${prioritizedStats.join(', ')}`);
      }
    }

    return {
      allocatedStats: bestAllocation,
      totalPoints: this.calculateTotalPoints(bestAllocation),
      score: bestScore,
      reasoning,
      warnings
    };
  }

  /**
   * Generate initial allocation based on build type priorities
   */
  private generateInitialAllocation(): StatRecord {
    const allocation: StatRecord = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    let remainingPoints = this.maxPoints;
    const weaponPriorities = this.getWeaponScalingPriorities();
    const classPriorities = this.getClassSynergyPriorities();
    const customPriorities = this.getCustomWeightPriorities();

    // Calculate combined priorities
    const combinedPriorities: Record<StatKey, number> = {} as Record<StatKey, number>;
    Object.keys(allocation).forEach(stat => {
      const statKey = stat as StatKey;
      combinedPriorities[statKey] = 
        this.buildType.statPriorities[statKey] * 3 + 
        weaponPriorities[statKey] * 2 + 
        classPriorities[statKey] +
        customPriorities[statKey] * 1.5; // Custom weights have significant influence
    });

    // Allocate based on priorities and thresholds
    const sortedStats = Object.entries(combinedPriorities)
      .sort(([,a], [,b]) => b - a)
      .map(([stat]) => stat as StatKey);

    // First pass: meet minimum thresholds efficiently, but handle APT specially
    sortedStats.forEach(stat => {
      const threshold = this.buildType.statThresholds[stat];
      if (threshold?.min && remainingPoints > 0) {
        if (stat === 'apt') {
          // For APT, find the next efficient target (multiple of 6)
          const nextTarget = this.getNextAptTarget(allocation);
          if (nextTarget > 0 && nextTarget <= remainingPoints) {
            allocation.apt = nextTarget;
            remainingPoints -= nextTarget;
          }
        } else {
          // Calculate how many points we need to allocate to reach the minimum final stat
          let needed = 0;
          while (this.calculateFinalStat(allocation, stat) < threshold.min && needed < remainingPoints) {
            needed++;
            allocation[stat]++;
          }
          remainingPoints -= needed;
          allocation[stat] -= needed; // Reset and properly allocate
          
          // Now allocate the calculated amount
          const allocate = Math.min(needed, remainingPoints);
          allocation[stat] += allocate;
          remainingPoints -= allocate;
        }
      }
    });

    // Second pass: approach ideal thresholds but respect diminishing returns and APT efficiency
    sortedStats.forEach(stat => {
      const threshold = this.buildType.statThresholds[stat];
      if (threshold?.ideal && remainingPoints > 0) {
        if (stat === 'apt') {
          // For APT, only invest in efficient amounts (final APT divisible by 6)
          const currentFinalAPT = this.calculateFinalStat(allocation, 'apt');
          const targetFinalAPT = Math.min(threshold.ideal, Math.floor(threshold.ideal / 6) * 6);
          
          if (targetFinalAPT > currentFinalAPT) {
            // Find the minimum investment to reach the target
            for (let investment = 1; investment <= remainingPoints; investment++) {
              const testAllocation = {...allocation, apt: allocation.apt + investment};
              const testFinalAPT = this.calculateFinalStat(testAllocation, 'apt');
              if (testFinalAPT >= targetFinalAPT) {
                allocation.apt += investment;
                remainingPoints -= investment;
                break;
              }
            }
          }
        } else {
          // Only allocate if we're not getting heavily diminished returns
          while (remainingPoints > 0 && this.calculateFinalStat(allocation, stat) < threshold.ideal) {
            const currentFinal = this.calculateFinalStat(allocation, stat);
            const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
            const efficiency = nextFinal - currentFinal; // How much final stat we gain per point
            
            // Stop if efficiency drops too low (heavy diminishing returns)
            if (efficiency < 0.5) break;
            
            allocation[stat]++;
            remainingPoints--;
          }
        }
      }
    });

    // Third pass: distribute remaining points by priority, but avoid inefficient allocations and fix APT
    while (remainingPoints > 0) {
      let allocated = false;
      
      // First, try to fix any inefficient APT allocation
      if (!this.isAptAllocationEfficient(allocation) && remainingPoints >= 6) {
        const nextTarget = this.getNextAptTarget(allocation);
        const currentApt = allocation.apt;
        const pointsNeeded = nextTarget - currentApt;
        
        if (pointsNeeded > 0 && pointsNeeded <= remainingPoints) {
          allocation.apt += pointsNeeded;
          remainingPoints -= pointsNeeded;
          allocated = true;
          continue;
        }
      }
      
      for (const stat of sortedStats) {
        if (remainingPoints <= 0) break;
        
        const currentFinal = this.calculateFinalStat(allocation, stat);
        const threshold = this.buildType.statThresholds[stat];
        
        // Don't exceed max thresholds
        if (threshold?.max && currentFinal >= threshold.max) continue;
        
        // Special handling for APT - only invest in multiples of 6
        if (stat === 'apt') {
          if (remainingPoints >= 6 && this.isAptAllocationEfficient(allocation)) {
            const nextTarget = this.getNextAptTarget(allocation);
            const pointsNeeded = nextTarget - allocation.apt;
            if (pointsNeeded === 6 && remainingPoints >= 6) {
              allocation.apt += 6;
              remainingPoints -= 6;
              allocated = true;
              break;
            }
          }
        } else {
          // Check efficiency before allocating
          const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
          const efficiency = nextFinal - currentFinal;
          
          // Only allocate if we get reasonable efficiency (avoid heavy diminishing returns)
          if (efficiency >= 0.4) {
            allocation[stat]++;
            remainingPoints--;
            allocated = true;
            break; // Allocate one point at a time to maintain priority order
          }
        }
      }
      
      // If no efficient allocations found, reduce efficiency threshold
      if (!allocated) {
        for (const stat of sortedStats) {
          if (remainingPoints <= 0) break;
          
          const currentFinal = this.calculateFinalStat(allocation, stat);
          const threshold = this.buildType.statThresholds[stat];
          
          if (threshold?.max && currentFinal >= threshold.max) continue;
          
          // Skip APT if it's not efficient
          if (stat === 'apt' && !this.isAptAllocationEfficient(allocation) && remainingPoints < 6) continue;
          
          const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
          const efficiency = nextFinal - currentFinal;
          
          // Lower threshold for final allocation
          if (efficiency >= 0.2) {
            allocation[stat]++;
            remainingPoints--;
            allocated = true;
            break;
          }
        }
      }
      
      // Prevent infinite loop - if we can't allocate efficiently, just dump points
      if (!allocated && remainingPoints > 0) {
        // Find the highest priority stat that isn't maxed and isn't APT (unless APT is efficient)
        for (const stat of sortedStats) {
          const threshold = this.buildType.statThresholds[stat];
          const currentFinal = this.calculateFinalStat(allocation, stat);
          
          if (stat === 'apt' && !this.isAptAllocationEfficient(allocation) && remainingPoints < 6) continue;
          
          if (!threshold?.max || currentFinal < threshold.max) {
            allocation[stat] += remainingPoints;
            remainingPoints = 0;
            break;
          }
        }
      }
    }

    return allocation;
  }

  /**
   * Generate random allocation for genetic algorithm (with efficiency constraints)
   */
  private generateRandomAllocation(): StatRecord {
    const allocation: StatRecord = {
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    };

    let remainingPoints = this.maxPoints;
    
    // HARD CONSTRAINT: Ensure minimum Faith for youkai count first
    const weights = this.params.customWeights;
    if (weights?.youkaiCount && (
      this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
      this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
      this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
      this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
    )) {
      const targetYoukai = weights.youkaiCount;
      const minInvestedFaith = this.getMinimumFaithForYoukai(targetYoukai);
      allocation.fai = minInvestedFaith;
      remainingPoints -= minInvestedFaith;
    }

    // HARD CONSTRAINT: Ensure minimum HP if specified
    if (weights?.minimumHP) {
      // Better HP estimation based on actual formula: VIT*10 + SAN*2 + STR*3 + ~350 base
      const targetHP = weights.minimumHP;
      const baseHP = 350; // Approximate base HP from race/class/level
      const estimatedSTRContrib = 20 * 3; // Assume ~20 STR allocation average
      const estimatedSANContrib = 10 * 2; // Assume ~10 SAN average
      const neededFromVIT = targetHP - baseHP - estimatedSTRContrib - estimatedSANContrib;
      const estimatedVITNeeded = Math.max(0, Math.ceil(neededFromVIT / 10)); 
      const vitToAllocate = Math.min(40, estimatedVITNeeded); // Reasonable cap
      allocation.vit = vitToAllocate;
      remainingPoints -= vitToAllocate;
    }

    // HARD CONSTRAINT: Ensure target APT if specified and multiclassing (36 or 42)
    if (weights?.targetAPT && this.params.mainClass !== this.params.subClass) {
      const targetAPT = weights.targetAPT; // Already 36 or 42 (both divisible by 6)
      
      // Binary search to find the minimum investment needed to reach target final APT
      let low = 0;
      let high = 80;
      let bestAllocation = 0;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const testAllocation = {...allocation, apt: mid};
        const finalAPT = this.calculateFinalStat(testAllocation, 'apt');
        
        if (finalAPT >= targetAPT) {
          bestAllocation = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      
      const aptToAllocate = Math.min(50, bestAllocation); // Cap at reasonable amount
      allocation.apt = aptToAllocate;
      remainingPoints -= aptToAllocate;
    }

    const stats = Object.keys(allocation).filter(stat => stat !== 'apt') as StatKey[];

    while (remainingPoints > 0) {
      const stat = stats[Math.floor(Math.random() * stats.length)];
      const currentFinal = this.calculateFinalStat(allocation, stat);
      const threshold = this.buildType.statThresholds[stat];
      
      // Respect max thresholds
      if (threshold?.max && currentFinal >= threshold.max) continue;
      
      // Don't allocate more than 80 points to any single stat (this prevents extreme allocations)
      if (allocation[stat] >= 80) continue;
      
      // Check efficiency - don't make completely inefficient allocations
      const nextFinal = this.calculateFinalStat({...allocation, [stat]: allocation[stat] + 1}, stat);
      const efficiency = nextFinal - currentFinal;
      
      // Allow random allocations but bias towards efficient ones
      if (Math.random() < 0.7 && efficiency < 0.3) continue;
      
      allocation[stat]++;
      remainingPoints--;
    }

    return allocation;
  }

  /**
   * Mutate allocation for genetic algorithm (APT excluded from mutations)
   */
  private mutateAllocation(parent: StatRecord): StatRecord {
    const child = { ...parent };
    const mutationRate = 0.1;
    const mutationStrength = 3; // Reduced from 5 to prevent extreme mutations

    const stats = Object.keys(child).filter(stat => stat !== 'apt') as StatKey[];
    
    // Randomly adjust some stats (APT excluded since it's fixed at target)
    stats.forEach(stat => {
      if (Math.random() < mutationRate) {
        const change = Math.floor((Math.random() - 0.5) * mutationStrength * 2);
        
        // Special handling for Faith - never allow it to go below minimum requirement
        if (stat === 'fai') {
          const weights = this.params.customWeights;
          if (weights?.youkaiCount && (
            this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
            this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
            this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
            this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
          )) {
            const targetYoukai = weights.youkaiCount;
            const minFaith = this.getMinimumFaithForYoukai(targetYoukai);
            child[stat] = Math.max(minFaith, Math.min(80, child[stat] + change));
          } else {
            child[stat] = Math.max(0, Math.min(80, child[stat] + change));
          }
        } else {
          child[stat] = Math.max(0, Math.min(80, child[stat] + change)); // Cap at 80 points per stat
        }
      }
    });

    // Normalize to stay within point limit
    const totalPoints = this.calculateTotalPoints(child);
    if (totalPoints !== this.maxPoints) {
      const difference = totalPoints - this.maxPoints;
      if (difference > 0) {
        // Remove excess points, prioritizing stats with poor efficiency (APT excluded)
        for (let i = 0; i < difference; i++) {
          const reducibleStats = stats.filter(s => child[s] > 0);
          if (reducibleStats.length > 0) {
            // Try to reduce from stats that are giving poor returns first
            let statToReduce = reducibleStats[0];
            let worstEfficiency = 1.0;
            
            for (const stat of reducibleStats) {
              if (child[stat] > 0) {
                // Check if this stat can actually be reduced
                let canReduce = true;
                
                // Special check for Faith - don't reduce below minimum requirement
                if (stat === 'fai') {
                  const weights = this.params.customWeights;
                  if (weights?.youkaiCount && (
                    this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
                    this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
                    this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
                    this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
                  )) {
                    const targetYoukai = weights.youkaiCount;
                    const minFaith = this.getMinimumFaithForYoukai(targetYoukai);
                    canReduce = child[stat] > minFaith;
                  }
                }
                
                if (!canReduce) continue; // Skip stats that can't be reduced
                
                const currentFinal = this.calculateFinalStat(child, stat);
                const reducedFinal = this.calculateFinalStat({...child, [stat]: child[stat] - 1}, stat);
                const efficiency = currentFinal - reducedFinal;
                  
                if (efficiency < worstEfficiency) {
                  worstEfficiency = efficiency;
                  statToReduce = stat;
                }
              }
            }
            
            child[statToReduce]--;
          }
        }
      } else {
        // Add missing points to efficient stats (APT excluded)
        for (let i = 0; i < -difference; i++) {
          // Find most efficient stat to add to
          let bestStat = stats[0];
          let bestEfficiency = 0;
          
          for (const stat of stats) {
            if (child[stat] < 80) { // Don't exceed our cap
              const currentFinal = this.calculateFinalStat(child, stat);
              const nextFinal = this.calculateFinalStat({...child, [stat]: child[stat] + 1}, stat);
              const efficiency = nextFinal - currentFinal;
              
              if (efficiency > bestEfficiency) {
                bestEfficiency = efficiency;
                bestStat = stat;
              }
            }
          }
          
          child[bestStat]++;
        }
      }
    }

    return child;
  }

  /**
   * Calculate accurate HP using the same formula as the main calculator
   */
  private calculateAccurateHP(allocation: StatRecord): number {
    const vitStat = this.calculateFinalStat(allocation, 'vit');
    const sanStat = this.calculateFinalStat(allocation, 'san');
    const strAllocated = allocation.str; // Only allocated STR counts for STR HP bonus
    
    // Base HP calculations
    let vitHP = Math.floor(vitStat * 10);
    const sanHP = Math.floor(sanStat * 2);
    const strHP = strAllocated * 3; // STR HP is based on allocated points, not final stat
    
    // Apply homunculi penalty if applicable
    const subraceData = SUBRACES[this.params.subrace];
    const raceData = RACES[this.params.race];
    if (raceData?.homunculi || subraceData?.homunculi) {
      vitHP -= Math.floor(vitStat / 2);
    }
    
    // Calculate points spent (this would need actual point calculation, simplified for now)
    const totalAllocated = Object.values(allocation).reduce((sum, points) => sum + points, 0);
    const maxPoints = this.params.targetLevel * 4; // 4 points per level
    const pointsSpent = maxPoints - (maxPoints - totalAllocated);
    
    let maxHP = vitHP + sanHP + strHP + pointsSpent;
    
    // Add custom HP if provided
    if (this.params.customHP) {
      maxHP += this.params.customHP;
    }
    
    return maxHP;
  }

  /**
   * Calculate accurate FP using the same formula as the main calculator
   */
  private calculateAccurateFP(allocation: StatRecord): number {
    const wilStat = this.calculateFinalStat(allocation, 'wil');
    const sanStat = this.calculateFinalStat(allocation, 'san');
    
    // Base FP calculation: WIL * 2 + SAN * 1
    let maxFP = wilStat * 2 + sanStat;
    
    // Add custom FP if provided
    if (this.params.customFP) {
      maxFP += this.params.customFP;
    }
    
    return maxFP;
  }

  /**
   * Calculate realistic FP requirements for youkai based on class usage patterns
   */
  private calculateYoukaiFPRequirement(targetYoukai: number): number {
    const isShapeshifter = this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter';
    const isGrandSummoner = this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner';
    const isBonder = this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder';
    const isSummoner = this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner';
    
    // Shapeshifters primarily use Install skills - very low FP requirement
    if (isShapeshifter && !isSummoner) {
      // Install skills are temporary and don't require sustained FP
      // Just need enough FP to use Install abilities occasionally
      return Math.max(60, targetYoukai * 5); // Minimal FP requirement
    }
    
    // Grand Summoners use youkai skills more than sustained summoning
    if (isGrandSummoner && !isSummoner) {
      // Skills have cooldowns, don't need all youkai summoned at once
      // Moderate FP requirement for skill usage and some summoning
      return Math.max(100, targetYoukai * 15); // Moderate FP requirement
    }
    
    // Bonders focus on bonds and utility, less sustained summoning
    if (isBonder && !isSummoner) {
      // Bond effects are passive, occasional summoning for utility
      return Math.max(80, targetYoukai * 10); // Low-moderate FP requirement
    }
    
    // Pure Summoners or Summoner hybrids - may want multiple youkai active
    if (isSummoner) {
      // Traditional summoning, may have 2-4 youkai active simultaneously
      const simultaneousYoukai = Math.min(4, Math.ceil(targetYoukai * 0.4)); // 40% of total youkai active
      return Math.max(120, simultaneousYoukai * 30); // Full FP cost for active youkai
    }
    
    // Default case - moderate requirement
    return Math.max(100, targetYoukai * 20);
  }

  /**
   * Evaluate allocation based on target stat goals
   */
  private evaluateTargetAllocation(allocation: StatRecord): number {
    if (!this.params.targetStats) return 0;
    
    let score = 1000; // Start with base score
    
    // Score based on how close we get to target stats
    Object.entries(this.params.targetStats).forEach(([stat, target]) => {
      const statKey = stat as StatKey;
      const finalStat = this.calculateFinalStat(allocation, statKey);
      
      if (finalStat >= target) {
        // Bonus for meeting or exceeding target
        score += 50;
        // Small penalty for excessive over-achievement to prevent waste
        if (finalStat > target + 10) {
          score -= (finalStat - target - 10) * 2;
        }
      } else {
        // Penalty for falling short of target
        const shortfall = target - finalStat;
        score -= shortfall * 10; // Heavy penalty for missing targets
      }
    });
    
    // Efficiency bonus for not wasting points
    const totalAllocated = Object.values(allocation).reduce((sum, points) => sum + points, 0);
    const maxPoints = this.maxPoints;
    if (totalAllocated <= maxPoints) {
      const pointsLeft = maxPoints - totalAllocated;
      if (pointsLeft <= 5) {
        score += 25; // Bonus for efficient point usage
      }
    } else {
      // Heavy penalty for exceeding point limit
      score -= (totalAllocated - maxPoints) * 50;
    }
    
    // Add youkai Faith requirement constraints for target mode too
    const weights = this.params.customWeights;
    if (weights?.youkaiCount) {
      const targetYoukai = weights.youkaiCount;
      const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
      const finalFaithStat = this.calculateFinalStat(allocation, 'fai');
      const faithThresholdMet = finalFaithStat >= minFaithNeeded;
      
      if (!faithThresholdMet) {
        // Heavy penalty for not meeting Faith threshold in target mode
        score -= 500;
      }
    }
    
    // HP minimum requirement (universal constraint for target mode too)
    const actualHP = this.calculateAccurateHP(allocation);
    const minimumHP = 700; // Universal minimum HP for all builds
    if (actualHP < minimumHP) {
      const hpShortfall = minimumHP - actualHP;
      score -= hpShortfall * 2; // Heavy penalty for not meeting minimum HP (2 points per HP below 700)
    }
    
    return score;
  }

  /**
   * Evaluate how good a stat allocation is
   */
  private evaluateAllocation(allocation: StatRecord): number {
    // Use target-based scoring if in target mode
    if (this.params.optimizationMode === 'targets') {
      return this.evaluateTargetAllocation(allocation);
    }
    
    // Otherwise use weight-based scoring
    let score = 0;
    const weaponPriorities = this.getWeaponScalingPriorities();
    const classPriorities = this.getClassSynergyPriorities();
    const customPriorities = this.getCustomWeightPriorities();

    // Score based on meeting thresholds
    Object.entries(this.buildType.statThresholds).forEach(([stat, thresholds]) => {
      const finalStat = this.calculateFinalStat(allocation, stat as StatKey);
      
      if (thresholds.min) {
        if (finalStat >= thresholds.min) {
          score += 100; // Big bonus for meeting minimum
        } else {
          score -= (thresholds.min - finalStat) * 10; // Penalty for not meeting minimum
        }
      }

      if (thresholds.ideal) {
        const distance = Math.abs(finalStat - thresholds.ideal);
        score += Math.max(0, 50 - distance * 2); // Bonus for being close to ideal
      }

      if (thresholds.max && finalStat > thresholds.max) {
        score -= (finalStat - thresholds.max) * 5; // Penalty for exceeding maximum
      }
    });

    // Score based on stat priorities (including custom weights)
    Object.entries(allocation).forEach(([stat, points]) => {
      const statKey = stat as StatKey;
      const basePriority = this.buildType.statPriorities[statKey];
      const weaponPriority = weaponPriorities[statKey] || 0;
      const classPriority = classPriorities[statKey] || 0;
      const customPriority = customPriorities[statKey] || 0;
      
      const totalPriority = basePriority + weaponPriority * 0.5 + classPriority * 0.3 + customPriority * 0.8;
      score += points * totalPriority;
    });

    // Custom weight specific bonuses
    if (this.params.customWeights) {
      const weights = this.params.customWeights;
      
      // Summoner-specific scoring
      if (weights.youkaiCount && (
        this.params.mainClass === 'Summoner' || this.params.subClass === 'Summoner' ||
        this.params.mainClass === 'Grand Summoner' || this.params.subClass === 'Grand Summoner' ||
        this.params.mainClass === 'Shapeshifter' || this.params.subClass === 'Shapeshifter' ||
        this.params.mainClass === 'Bonder' || this.params.subClass === 'Bonder'
      )) {
        const faiStat = this.calculateFinalStat(allocation, 'fai');
        const targetYoukai = weights.youkaiCount;
        
        // Calculate actual youkai slots: 5 base + floor(FAI/14)
        const youkaiSlots = 5 + Math.floor(faiStat / 14);
        const maxYoukai = Math.min(12, youkaiSlots); // Capped at 12
        
        // Check if Faith investment meets the minimum threshold for target youkai
        const finalFaithStat = this.calculateFinalStat(allocation, 'fai');
        const minFaithNeeded = this.getMinimumFaithForYoukai(targetYoukai);
        const faithThresholdMet = finalFaithStat >= minFaithNeeded;
        
        // Calculate FP sustainability using class-appropriate requirements
        const actualFP = this.calculateAccurateFP(allocation);
        const requiredFP = this.calculateYoukaiFPRequirement(targetYoukai);
        const fpSustainable = actualFP >= requiredFP;
        
        if (fpSustainable && maxYoukai >= targetYoukai && faithThresholdMet) {
          score += 50 * targetYoukai; // Bonus for meeting all youkai requirements
        } else {
          const slotShortfall = Math.max(0, targetYoukai - maxYoukai);
          const fpPenalty = fpSustainable ? 0 : 30; // Penalty for insufficient FP
          const faithPenalty = faithThresholdMet ? 0 : 500; // Very heavy penalty for not meeting Faith threshold (makes it a hard constraint)
          
          score -= (slotShortfall * 25) + fpPenalty + faithPenalty;
        }
      }
      
      // HP minimum requirement (universal constraint)
      const actualHP = this.calculateAccurateHP(allocation);
      const minimumHP = 700; // Universal minimum HP for all builds
      if (actualHP < minimumHP) {
        const hpShortfall = minimumHP - actualHP;
        score -= hpShortfall * 2; // Heavy penalty for not meeting minimum HP (2 points per HP below 700)
      }
      
      // Critical focus scoring
      if (weights.criticalFocus) {
        const lucStat = this.calculateFinalStat(allocation, 'luc');
        const guiStat = this.calculateFinalStat(allocation, 'gui');
        const critPotential = lucStat + guiStat * 1.5; // Rough crit calculation
        score += critPotential * weights.criticalFocus * 0.5;
      }
      
      // Accuracy focus scoring
      if (weights.accuracyFocus) {
        const skiStat = this.calculateFinalStat(allocation, 'ski');
        score += skiStat * weights.accuracyFocus * 2;
      }
      
      // FP goal scoring (reasonable FP for sustained combat)
      if (weights.fpPriority) {
        const actualFP = this.calculateAccurateFP(allocation);
        const fpTarget = 120; // Reasonable FP target for sustained combat
        
        if (actualFP >= fpTarget) {
          score += 75 * weights.fpPriority; // Bonus for meeting FP goal
        } else {
          const fpDeficit = fpTarget - actualFP;
          score -= (fpDeficit / 5) * weights.fpPriority; // Penalty for FP shortage
        }
      }
    }

    // APT efficiency bonus
    const aptBonus = Math.floor(this.calculateFinalStat(allocation, 'apt') / 6) * 11;
    score += aptBonus * 2;

    // Penalize unused points
    const usedPoints = this.calculateTotalPoints(allocation);
    const unusedPoints = this.maxPoints - usedPoints;
    score -= unusedPoints * 5;

    return score;
  }

  /**
   * Calculate final stat value including all bonuses (accurate version matching main calculator)
   */
  private calculateFinalStat(allocation: StatRecord, stat: StatKey): number {
    // Use the same calculation logic as the main calculator's getEffectiveStat function
    const subraceData = SUBRACES[this.params.subrace];
    const mainClassData = CLASSES[this.params.mainClass];
    const subClassData = CLASSES[this.params.subClass];
    
    const baseRacial = subraceData?.[stat] || 0;
    const allocated = allocation[stat];
    const history = HISTORY[this.params.history];
    const historyBonus = history?.[stat as keyof HistoryBonus] || 0;
    
    // APT bonus (every 6 APT gives +1 to other stats) - must calculate APT first
    const aptBonus = stat === 'apt' ? 0 : Math.floor(this.calculateFinalStat(allocation, 'apt') / 6);
    
    // Legend extend bonus - check each enabled legend extend
    const leBonus = Object.entries(this.params.legendExtend).reduce((bonus, [key, enabled]) => {
      if (enabled) {
        const leData = LEGEND_EXTEND[key];
        return bonus + (leData?.stat === stat ? 1 : 0);
      }
      return bonus;
    }, 0);

    // Astrology bonus - simplified for now
    const astroBonus = (this.params.astrology && ASTROLOGY_PLANETS[this.params.astrology] === stat) ? 1 : 0;

    // Custom stats if included
    const customBonus = this.params.includeCustomStats ? 
      ((this.params.customStats?.[stat] || 0) + (this.params.customBaseStats?.[stat] || 0)) : 0;

    // Class passive bonuses
    const mainPassiveData = CLASS_PASSIVES[this.params.mainClass];
    const subPassiveData = CLASS_PASSIVES[this.params.subClass];
    const mainPassiveBonus = mainPassiveData && mainPassiveData.stats[stat] ? 
      (mainPassiveData.stats[stat] || 0) * this.params.mainClassPassive : 0;
    const subPassiveBonus = subPassiveData && subPassiveData.stats[stat] ? 
      (subPassiveData.stats[stat] || 0) * this.params.subClassPassive : 0;
    const totalPassiveBonus = mainPassiveBonus + subPassiveBonus;

    // Class bonuses
    const mainClassValue = mainClassData?.[stat] || 0;
    const subClassValue = subClassData?.[stat] || 0;
    const totalClassValue = mainClassValue + subClassValue;

    // Total added value (everything except base racial and class)
    const addedValue = allocated + historyBonus + astroBonus + leBonus + customBonus + totalPassiveBonus;
    
    // Apply the same diminishing returns calculation as the main calculator
    return this.calculateDiminishingReturns(baseRacial, addedValue, totalClassValue, 0, aptBonus);
  }

  /**
   * Replicate the main calculator's diminishing returns logic exactly
   */
  private calculateDiminishingReturns(
    racialStat: number, 
    addedStat: number, 
    classStat: number, 
    customStat: number,
    aptitudeBonus: number,
    dragonBonus = 0
  ): number {
    // Monoclass modifier for class stats
    const monoclassModifier = this.params.mainClass === this.params.subClass ? 1.1 : 1.0;
    
    const softCap = racialStat + 40 + dragonBonus;
    let totalStat = racialStat + addedStat + (classStat * monoclassModifier) + customStat + aptitudeBonus;
    
    if (dragonBonus > 0) {
      totalStat = totalStat + Math.floor(totalStat * 0.05 * (dragonBonus / 3));
    }
    
    if (softCap >= totalStat) return totalStat;
    
    let effective = softCap;
    let remaining = totalStat - softCap;
    let multiplier = 0.9;
    
    while (remaining > 3) {
      remaining -= 3;
      effective += 3 * multiplier;
      multiplier -= 0.08;
      if (multiplier < 0.1) multiplier = 0.1;
    }
    
    return Math.floor(effective + (remaining * multiplier));
  }

  /**
   * Calculate stat allocation efficiency
   */
  private calculateStatEfficiency(allocation: StatRecord, stat: StatKey): number {
    const currentValue = this.calculateFinalStat(allocation, stat);
    const priority = this.buildType.statPriorities[stat];
    
    // APT has special efficiency calculation
    if (stat === 'apt') {
      return this.calculateAptEfficiency(allocation.apt) / 50; // Normalize
    }

    // Efficiency decreases as stat gets higher
    const efficiencyFactor = Math.max(0.1, 1 - (currentValue / 100));
    return (priority / 10) * efficiencyFactor;
  }

  /**
   * Calculate total points used in allocation
   */
  private calculateTotalPoints(allocation: StatRecord): number {
    return Object.values(allocation).reduce((sum, value) => sum + value, 0);
  }
}

export default function SL2Calculator() {
  // Get first race and first subrace on initial load
  const firstRace = Object.keys(RACES)[0];
  const firstSubrace = Object.keys(SUBRACES).find(subraceKey => {
    const subrace = SUBRACES[subraceKey];
    if (!subrace.allowedRaces) return true; 
    return subrace.allowedRaces.includes(firstRace);
  }) || firstRace;
  const firstClass = Object.keys(CLASSES)[0];

  const [race, setRace] = useState(firstRace);
  const [subrace, setSubrace] = useState(firstSubrace);
  const [mainClass, setMainClass] = useState(firstClass);
  const [subClass, setSubClass] = useState(firstClass);
  
  // POE-style class selection states
  const [selectedMainBaseClass, setSelectedMainBaseClass] = useState('Soldier');
  const [selectedSubBaseClass, setSelectedSubBaseClass] = useState('Soldier');
  const [showMainClassDropdown, setShowMainClassDropdown] = useState(false);
  const [showSubClassDropdown, setShowSubClassDropdown] = useState(false);
  
  const [totalPoints, setTotalPoints] = useState(MAX_POINTS);
  const [characterLevel, setCharacterLevel] = useState(60); // Default to level 60
  const [food, setFood] = useState('None');
  const [history, setHistory] = useState('None');
  
  const [addedStats, setAddedStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [customStats, setCustomStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [customBaseStats, setCustomBaseStats] = useState<StatRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
    vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
  });

  const [stamps, setStamps] = useState<StampRecord>({
    str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0
  });

  const [legendExtend, setLegendExtend] = useState<Record<string, boolean>>({});
  const [astrology, setAstrology] = useState<string>(''); // Now stores the selected planet name or empty string
  const [customHP, setCustomHP] = useState(0);
  const [customFP, setCustomFP] = useState(0);
  const [baseEvade, setBaseEvade] = useState(0);
  const [bonusEvade, setBonusEvade] = useState(0);
  const [giantGene, setGiantGene] = useState(false);
  const [dragonKing, setDragonKing] = useState(0);
  const [dragonQueen, setDragonQueen] = useState(0);
  const [hpPercent, setHpPercent] = useState(100);
  const [sanguineCrest, setSanguineCrest] = useState(false);
  const [felidaeInstinct, setFelidaeInstinct] = useState(false);
  const [lupineInstinct, setLupineInstinct] = useState(false);
  const [risingGame, setRisingGame] = useState(0);
  const [redtailFortuneLevel, setRedtailFortuneLevel] = useState(1);
  const [redtailDiceColor, setRedtailDiceColor] = useState<'red' | 'green' | 'yellow'>('red');
  const [karakuriYoukai, setKarakuriYoukai] = useState<string>('None'); // Default to None
  const [fortitude, setFortitude] = useState(false);
  const [painTolerance, setPainTolerance] = useState(0);
  const [warwalk, setWarwalk] = useState(false);
  const [endurance, setEndurance] = useState(false);
  const [luminaryElement, setLuminaryElement] = useState(false);
  const [persistenceOfNormalcy, setPersistenceOfNormalcy] = useState(false);
  const [powerOfNormalcy, setPowerOfNormalcy] = useState(false);
  
  // Class passive ranks
  const [mainClassPassive, setMainClassPassive] = useState(0);
  const [subClassPassive, setSubClassPassive] = useState(0);
  
  // Elemental adjustments
  const [elementalATKAdjustments, setElementalATKAdjustments] = useState<ElementalRecord>({
    Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
  });
  
  const [elementalRESAdjustments, setElementalRESAdjustments] = useState<ElementalRecord>({
    Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
  });
  
  // Update total points when character level changes
  useEffect(() => {
    const newTotalPoints = characterLevel * 4;
    const pointsSpent = Object.values(addedStats).reduce((sum, val) => sum + val, 0);
    setTotalPoints(Math.max(0, newTotalPoints - pointsSpent));
  }, [characterLevel, addedStats]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [showCustomStats, setShowCustomStats] = useState(false);
  const [showTalents, setShowTalents] = useState(false);
  const [showRawStats, setShowRawStats] = useState(false); // Toggle for Raw vs True stats

  // Import/Export state
  const [showImportExport, setShowImportExport] = useState(false);
  const [buildName, setBuildName] = useState('My Build');
  const [importText, setImportText] = useState('');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'stats' | 'weapon' | 'optimizer'>('stats');

  // Stat Optimizer state
  const [selectedBuildType, setSelectedBuildType] = useState<string>('hybrid');
  const [optimizerTargetLevel, setOptimizerTargetLevel] = useState<number>(60);
  const [optimizeWeaponScaling, setOptimizeWeaponScaling] = useState<boolean>(true);
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>('');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationMode, setOptimizationMode] = useState<'weights' | 'targets'>('weights');
  
  // Target stats for target-based optimization
  const [targetStats, setTargetStats] = useState({
    str: 50, wil: 50, ski: 55, cel: 40, def: 35, res: 35, 
    vit: 40, fai: 30, luc: 35, gui: 30, san: 25, apt: 36
  });
  
  // Custom weights state
  const [customWeights, setCustomWeights] = useState({
    youkaiCount: 5, // Starting base youkai count
    summonSurvivability: 5,
    criticalFocus: 5,
    magicDamageFocus: 5,
    physicalDamageFocus: 5,
    accuracyFocus: 5,
    minimumHP: 700, // Restore reasonable default minimum HP
    fpPriority: 5,
    physicalDefense: 5,
    magicalDefense: 5,
    initiativePriority: 5,
    statusResistance: 5,
    carryCapacity: 0,
    targetAPT: 36 as 36 | 42, // Standard APT target for multiclass
    targetEvade: 0, // Target evade value (0 = no target)
  });
  const [showCustomWeights, setShowCustomWeights] = useState<boolean>(false);

  /**
   * Get appropriate custom weight defaults for a build type
   */

  // My descent into madness while writing this function was not worth it
  // I hate myself
  // Please forgive me
  const getBuildTypeWeights = (buildType: string) => {
    const buildDefaults: Record<string, typeof customWeights> = {
      'evade': {
        youkaiCount: 5,
        summonSurvivability: 3,
        criticalFocus: 7,
        magicDamageFocus: 3,
        physicalDamageFocus: 6,
        accuracyFocus: 8,
        minimumHP: 600, // Lower HP for evade tanks
        fpPriority: 5,
        physicalDefense: 2,
        magicalDefense: 3,
        initiativePriority: 9, // High initiative for evade builds
        statusResistance: 4,
        carryCapacity: 2,
        targetAPT: 36 as 36 | 42, // Standard APT for multiclass
        targetEvade: 115, // High evade target for evade tanks
      },
      'tank': {
        youkaiCount: 5,
        summonSurvivability: 7,
        criticalFocus: 3,
        magicDamageFocus: 4,
        physicalDamageFocus: 5,
        accuracyFocus: 6,
        minimumHP: 850, // Higher HP for tanks
        fpPriority: 6,
        physicalDefense: 10, // Max physical defense
        magicalDefense: 10, // Max magical defense
        initiativePriority: 3,
        statusResistance: 8, // High status resistance
        carryCapacity: 4,
        targetAPT: 36 as 36 | 42, // Lower APT for stat-focused tanks (changed from 30)
        targetEvade: 35, // Basic mobility
      },
      'glass_cannon': {
        youkaiCount: 8, // Higher youkai for magic glass cannons
        summonSurvivability: 4,
        criticalFocus: 9, // High crit focus
        magicDamageFocus: 9, // High magic damage
        physicalDamageFocus: 8, // High physical damage
        accuracyFocus: 9, // High accuracy for damage
        minimumHP: 500, // Lower HP (glass cannon)
        fpPriority: 8, // High FP for sustained damage
        physicalDefense: 1, // Minimal defense
        magicalDefense: 2,
        initiativePriority: 7, // First strike advantage
        statusResistance: 3,
        carryCapacity: 2,
        targetAPT: 42 as 36 | 42, // Higher APT for damage efficiency
        targetEvade: 55, // Moderate mobility for DPS
      },
      'hybrid': {
        youkaiCount: 6,
        summonSurvivability: 5,
        criticalFocus: 5,
        magicDamageFocus: 5,
        physicalDamageFocus: 5,
        accuracyFocus: 6,
        minimumHP: 700, // Balanced HP
        fpPriority: 6, // Balanced FP
        physicalDefense: 5, // Balanced defense
        magicalDefense: 5,
        initiativePriority: 5,
        statusResistance: 5,
        carryCapacity: 3,
        targetAPT: 36 as 36 | 42, // Standard APT for versatility
        targetEvade: 75, // Moderate evade for hybrid builds
      },
      'support': {
        youkaiCount: 7, // Higher for support summons
        summonSurvivability: 8, // Keep summons alive
        criticalFocus: 3,
        magicDamageFocus: 6, // Some magic for healing/buffs
        physicalDamageFocus: 2,
        accuracyFocus: 5,
        minimumHP: 650, // More reasonable HP for support
        fpPriority: 9, // High FP for sustained support
        physicalDefense: 6,
        magicalDefense: 7,
        initiativePriority: 6,
        statusResistance: 9, // High status resistance for support
        carryCapacity: 4,
        targetAPT: 36 as 36 | 42, // Standard APT for support utility
        targetEvade: 55, // Some mobility for positioning
      },
      'critical': {
        youkaiCount: 5,
        summonSurvivability: 3,
        criticalFocus: 10, // Max critical focus
        magicDamageFocus: 4,
        physicalDamageFocus: 8, // High physical for crit builds
        accuracyFocus: 8, // Need accuracy for crits to land
        minimumHP: 550, // More reasonable HP for crit builds
        fpPriority: 5,
        physicalDefense: 3,
        magicalDefense: 3, // Why did I do this to myself
        initiativePriority: 8, // First strike for crits
        statusResistance: 4, // I want to die
        carryCapacity: 3, // why
        targetAPT: 36 as 36 | 42, // Standard APT for flexibility (changed from 30)
        targetEvade: 95, // Good evade for positioning in crit builds
      }
    };

    return buildDefaults[buildType] || buildDefaults['hybrid'];
  };

  // Auto-adjust custom weights when build type changes
  useEffect(() => {
    const newWeights = getBuildTypeWeights(selectedBuildType);
    setCustomWeights(newWeights);
  }, [selectedBuildType]);

  // Stat info modal state
  const [showStatInfo, setShowStatInfo] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string>('');

  const monoclassModifier = mainClass === subClass ? 2 : 1;

  /**
   * Export current build to JSON
   */
  const exportBuild = (buildName: string = "My Build"): void => {
    const buildData: BuildData = {
      buildName,
      race,
      subrace,
      mainClass,
      subClass,
      selectedMainBaseClass,
      selectedSubBaseClass,
      totalPoints,
      characterLevel,
      food,
      history,
      addedStats,
      customStats,
      customBaseStats,
      stamps,
      legendExtend,
      astrology,
      customHP,
      customFP,
      baseEvade,
      bonusEvade,
      giantGene,
      dragonKing,
      dragonQueen,
      hpPercent,
      sanguineCrest,
      felidaeInstinct,
      lupineInstinct,
      risingGame,
      redtailFortuneLevel,
      redtailDiceColor,
      karakuriYoukai,
      fortitude,
      painTolerance,
      warwalk,
      endurance,
      luminaryElement,
      persistenceOfNormalcy,
      powerOfNormalcy,
      mainClassPassive,
      subClassPassive,
      elementalATKAdjustments,
      elementalRESAdjustments,
      version: "0.3.0"
    };

    const jsonString = JSON.stringify(buildData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buildName.replace(/[^a-zA-Z0-9]/g, '_')}_build.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Import build from JSON
   */
  const importBuild = (jsonString: string): boolean => {
    try {
      const buildData: BuildData = JSON.parse(jsonString);
      
      // Validate required fields
      if (!buildData.race || !buildData.subrace || !buildData.mainClass || !buildData.subClass) {
        throw new Error("Invalid build data: missing required fields");
      }

      // Apply the build data
      setRace(buildData.race);
      setSubrace(buildData.subrace);
      setMainClass(buildData.mainClass);
      setSubClass(buildData.subClass);
      
      // Set base class information (for backward compatibility, derive from class if not present)
      if (buildData.selectedMainBaseClass) {
        setSelectedMainBaseClass(buildData.selectedMainBaseClass);
      } else {
        // Find base class for main class
        const mainBaseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
          data.subClasses.includes(buildData.mainClass) || data.name === buildData.mainClass
        )?.[0] || 'Soldier';
        setSelectedMainBaseClass(mainBaseClass);
      }
      
      if (buildData.selectedSubBaseClass) {
        setSelectedSubBaseClass(buildData.selectedSubBaseClass);
      } else {
        // Find base class for sub class
        const subBaseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
          data.subClasses.includes(buildData.subClass) || data.name === buildData.subClass
        )?.[0] || 'Soldier';
        setSelectedSubBaseClass(subBaseClass);
      }
      
      setTotalPoints(buildData.totalPoints || MAX_POINTS);
      setCharacterLevel(buildData.characterLevel || 60);
      setFood(buildData.food || 'None');
      setHistory(buildData.history || 'None');
      setAddedStats(buildData.addedStats || {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
      });
      setCustomStats(buildData.customStats || {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
      });
      setCustomBaseStats(buildData.customBaseStats || {
        str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
        vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
      });
      setStamps(buildData.stamps || { str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
      setLegendExtend(buildData.legendExtend || {});
      setAstrology(buildData.astrology || '');
      setCustomHP(buildData.customHP || 0);
      setCustomFP(buildData.customFP || 0);
      setBaseEvade(buildData.baseEvade || 0);
      setBonusEvade(buildData.bonusEvade || 0);
      setGiantGene(buildData.giantGene || false);
      setDragonKing(buildData.dragonKing || 0);
      setDragonQueen(buildData.dragonQueen || 0);
      setHpPercent(buildData.hpPercent || 100);
      setSanguineCrest(buildData.sanguineCrest || false);
      setFelidaeInstinct(buildData.felidaeInstinct || false);
      setLupineInstinct(buildData.lupineInstinct || false);
      setRisingGame(buildData.risingGame || 0);
      setRedtailFortuneLevel(buildData.redtailFortuneLevel || 1);
      setRedtailDiceColor(buildData.redtailDiceColor || 'red');
      setKarakuriYoukai(buildData.karakuriYoukai || 'None');
      setFortitude(buildData.fortitude || false);
      setPainTolerance(buildData.painTolerance || 0);
      setWarwalk(buildData.warwalk || false);
      setEndurance(buildData.endurance || false);
      setLuminaryElement(buildData.luminaryElement || false);
      setPersistenceOfNormalcy(buildData.persistenceOfNormalcy || false);
      setPowerOfNormalcy(buildData.powerOfNormalcy || false);
      setMainClassPassive(buildData.mainClassPassive || 0);
      setSubClassPassive(buildData.subClassPassive || 0);
      
      // Import elemental adjustments with defaults
      setElementalATKAdjustments(buildData.elementalATKAdjustments || {
        Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
      });
      setElementalRESAdjustments(buildData.elementalRESAdjustments || {
        Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import build:', error);
      return false;
    }
  };

  /**
   * Load a template build
   */
  const loadTemplate = (templateKey: string): void => {
    const template = TEMPLATE_BUILDS[templateKey as keyof typeof TEMPLATE_BUILDS];
    if (!template) {
      console.error('Template not found:', templateKey);
      return;
    }

    // Reset to clean state first
    setRace(template.race);
    setSubrace(template.subrace);
    setMainClass(template.mainClass);
    setSubClass(template.subClass);
    
    // Set base class information for templates
    setSelectedMainBaseClass((template as any).selectedMainBaseClass || template.mainClass);
    setSelectedSubBaseClass((template as any).selectedSubBaseClass || template.subClass);
    
    setCharacterLevel(60); // Default level for templates
    setFood('None');
    setHistory(template.history || 'None');
    
    // Set stats from template
    setAddedStats(template.stats);
    
    // Clear custom modifications
    setCustomStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setCustomBaseStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setStamps({ str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
    setLegendExtend({});
    setAstrology('');
    
    // Clear all modifiers
    setCustomHP(0);
    setCustomFP(0);
    setBaseEvade(0);
    setBonusEvade(0);
    setGiantGene(false);
    setDragonKing(0);
    setDragonQueen(0);
    setHpPercent(100);
    setSanguineCrest(false);
    setFelidaeInstinct(false);
    setLupineInstinct(false);
    setRisingGame(0);
    setRedtailFortuneLevel(1);
    setRedtailDiceColor('red');
    setKarakuriYoukai('None');
    setFortitude(false);
    setPainTolerance(0);
    setWarwalk(false);
    setEndurance(false);
    setLuminaryElement(false);
    setPersistenceOfNormalcy(false);
    setPowerOfNormalcy(false);
    setMainClassPassive(0);
    setSubClassPassive(0);
    
    // Clear elemental adjustments
    setElementalATKAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });
    setElementalRESAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });

    // Calculate remaining points
    const pointsSpent = Object.values(template.stats).reduce((sum: number, val: number) => sum + val, 0);
    setTotalPoints(Math.max(0, 240 - pointsSpent)); // 60 * 4 = 240 points
  };

  /**
   * Copy build to clipboard as JSON
   */
  const copyBuildToClipboard = async (buildName: string = "My Build"): Promise<boolean> => {
    const buildData: BuildData = {
      buildName,
      race,
      subrace,
      mainClass,
      subClass,
      totalPoints,
      characterLevel,
      food,
      history,
      addedStats,
      customStats,
      customBaseStats,
      stamps,
      legendExtend,
      astrology,
      customHP,
      customFP,
      baseEvade,
      bonusEvade,
      giantGene,
      dragonKing,
      dragonQueen,
      hpPercent,
      sanguineCrest,
      felidaeInstinct,
      lupineInstinct,
      risingGame,
      redtailFortuneLevel,
      redtailDiceColor,
      karakuriYoukai,
      fortitude,
      painTolerance,
      warwalk,
      endurance,
      luminaryElement,
      persistenceOfNormalcy,
      powerOfNormalcy,
      mainClassPassive,
      subClassPassive,
      elementalATKAdjustments,
      elementalRESAdjustments,
      version: "0.3.0"
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(buildData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  /**
   * Filter subraces based on the currently selected race
   * Returns base race and any specific subraces available for the current race
   */
  const getAvailableSubraces = (): string[] => {
    return Object.keys(SUBRACES).filter(subraceKey => {
      const subrace = SUBRACES[subraceKey];
      // If no allowedRaces specified, it's available to all races
      if (!subrace.allowedRaces) return true;
      // Check if current race is in the allowed races list
      return subrace.allowedRaces.includes(race);
    });
  };

  /**
   * Handle race change - auto-select the base race subrace and reset if not available, then validate stat caps
   */
  const handleRaceChange = (newRace: string): void => {
    setRace(newRace);
    
    let finalSubrace = subrace;
    
    // Auto-select the base race as subrace if it exists
    if (SUBRACES[newRace]) {
      setSubrace(newRace);
      finalSubrace = newRace;
    } else {
      // Find available subraces for this race
      const availableSubraces = Object.keys(SUBRACES).filter(subraceKey => {
        const subrace = SUBRACES[subraceKey];
        if (!subrace.allowedRaces) return true;
        return subrace.allowedRaces.includes(newRace);
      });
      
      // If current subrace is not available for the new race, reset to first available
      if (!availableSubraces.includes(subrace)) {
        const newSubrace = availableSubraces[0] || newRace;
        setSubrace(newSubrace);
        finalSubrace = newSubrace;
      }
    }

    // Validate and adjust stats to ensure they don't exceed hard caps with the new race/subrace
    const adjustedStats = validateStatCaps(finalSubrace, customBaseStats, legendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Handle subrace change - disable Sanguine Crest if not Oni/Vampire and validate stat caps
   */
  const handleSubraceChange = (newSubrace: string): void => {
    setSubrace(newSubrace);
    
    // Disable Sanguine Crest if the new subrace is not Oni or Vampire
    if (newSubrace !== 'Oni' && newSubrace !== 'Vampire') {
      setSanguineCrest(false);
    }
    
    // Reset Karakuri youkai selection when changing away from Karakuri
    if (newSubrace !== 'Karakuri') {
      setKarakuriYoukai('None');
    }

    // Validate and adjust stats to ensure they don't exceed hard caps
    const adjustedStats = validateStatCaps(newSubrace, customBaseStats, legendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Validate and adjust stats to ensure they don't exceed hard caps (80 total)
   * Returns adjusted addedStats that respect the hard cap: race base + custom base + manual points + LE bonus + history bonus ≤ 80
   */
  const validateStatCaps = (
    newSubrace: string = subrace,
    newCustomBaseStats: StatRecord = customBaseStats,
    newLegendExtend: Record<string, boolean> = legendExtend,
    currentAddedStats: StatRecord = addedStats,
    newHistory: string = history
  ): StatRecord => {
    const adjustedStats = { ...currentAddedStats };
    let totalPointsFreed = 0;

    // Calculate Legend Extend bonuses for the given state
    const newLeBonus: Partial<StatRecord> = {};
    Object.entries(newLegendExtend).forEach(([key, enabled]) => {
      if (enabled) {
        const statKey = key.toLowerCase() as StatKey;
        if (statKey in adjustedStats) {
          newLeBonus[statKey] = (newLeBonus[statKey] || 0) + 1;
        }
      }
    });

    // Get history bonuses for the new history
    const newHistoryBonus = HISTORY[newHistory];

    // Check each stat for hard cap violations
    Object.keys(adjustedStats).forEach(statKey => {
      const stat = statKey as StatKey;
      const subraceData = SUBRACES[newSubrace];
      const raceBase = subraceData?.[stat] || 0;
      const customBase = newCustomBaseStats[stat] || 0;
      const legendExtendBonus = newLeBonus[stat] || 0;
      const historyBonus = (newHistoryBonus as any)[stat] || 0;
      const manualPoints = adjustedStats[stat];

      const total = raceBase + customBase + manualPoints + legendExtendBonus + historyBonus;
      
      if (total > 80) {
        // Calculate how many manual points we need to remove
        const excess = total - 80;
        const newManualPoints = Math.max(0, manualPoints - excess);
        const pointsRemoved = manualPoints - newManualPoints;
        
        adjustedStats[stat] = newManualPoints;
        totalPointsFreed += pointsRemoved;

        // Update the input field to reflect the capped value
        const inputElement = inputRefs.current[stat];
        if (inputElement) {
          inputElement.value = newManualPoints.toString();
        }

        // Log the cap adjustment for debugging
        console.log(`Stat ${stat.toUpperCase()} capped: ${manualPoints} → ${newManualPoints} (${pointsRemoved} points freed)`);
      }
    });

    // If we freed up points, update the total points available
    if (totalPointsFreed > 0) {
      setTotalPoints(prev => Math.min(MAX_POINTS, prev + totalPointsFreed));
    }

    return adjustedStats;
  };

  /**
   * Handle custom base stat changes with validation
   */
  const handleCustomBaseStatChange = (stat: StatKey, value: number): void => {
    const newCustomBaseStats = { ...customBaseStats, [stat]: value };
    setCustomBaseStats(newCustomBaseStats);

    // Validate and adjust manual stats to ensure they don't exceed hard caps
    const adjustedStats = validateStatCaps(subrace, newCustomBaseStats, legendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Handle Legend Extend toggle with validation
   */
  const handleLegendExtendToggle = (key: string): void => {
    const newLegendExtend = { ...legendExtend, [key]: !legendExtend[key] };
    setLegendExtend(newLegendExtend);

    // Validate and adjust manual stats to ensure they don't exceed hard caps
    const adjustedStats = validateStatCaps(subrace, customBaseStats, newLegendExtend, addedStats, history);
    setAddedStats(adjustedStats);
  };

  /**
   * Handle history changes and validate stat caps
   */
  const handleHistoryChange = (newHistory: string): void => {
    setHistory(newHistory);

    // Validate and adjust manual stats to ensure they don't exceed hard caps
    const adjustedStats = validateStatCaps(subrace, customBaseStats, legendExtend, addedStats, newHistory);
    setAddedStats(adjustedStats);
  };

  // Calculate Rising Game bonus
  const calculateRisingGame = (): Partial<StatRecord> => {
    const hpLost = 100 - hpPercent;
    let bonusPerStat = Math.floor(hpLost / 15);
    
    // Cap based on rising game rank
    const caps = [0, 2, 3, 4, 5, 6];
    bonusPerStat = Math.min(bonusPerStat, caps[risingGame] || 0);
    
    return {
      str: bonusPerStat,
      wil: bonusPerStat,
      ski: bonusPerStat,
      cel: bonusPerStat,
      res: bonusPerStat,
      luc: bonusPerStat
    };
  };

  // Calculate Instinct bonus (Felidae/Grimalkin/Lupine)
  const calculateInstinct = (): Partial<StatRecord> => {
    if (hpPercent > 50) return {};
    
    const baseInstinct = Math.floor(stats.san * 0.1 + 1);
    const bonus = hpPercent <= 25 ? baseInstinct * 2 : baseInstinct;
    
    // Felidae & Grimalkin Instinct: SKI, CEL, LUC, GUI
    if ((subrace === 'Felidae' || subrace === 'Grimalkin') && felidaeInstinct) {
      return { ski: bonus, cel: bonus, gui: bonus, luc: bonus };
    }
    
    // Lupine Instinct: STR, WIL, DEF, RES
    if (subrace === 'Lupine' && lupineInstinct) {
      return { str: bonus, wil: bonus, def: bonus, res: bonus };
    }
    
    // Leporidae Instinct: Currently only affects Rabbit Foot (not stat-related)
    // We track the state but don't add stat bonuses
    
    return {};
  };

  // Calculate Redtail Fox God's Blessing bonus
  const calculateRedtailBonus = (): Partial<StatRecord> => {
    if (subrace !== 'Redtail') return {};
    
    const scaledSAN = Math.floor(stats.san);
    const sanMultiplier = Math.min(Math.floor(scaledSAN / 10), 5); // Max 5x
    const fortuneLevel = redtailFortuneLevel;
    
    // Base multiplier: 1x per Fortune Level
    // Enhanced by SAN: +1x per 10 Scaled SAN (max +5x total)
    const totalMultiplier = 1 + sanMultiplier;
    
    const bonuses: Partial<StatRecord> = {};
    
    if (redtailDiceColor === 'red') {
      // Red Dice: Hit and Critical
      // These are combat stats we can't directly add to StatRecord
      // But if Fortune Level is 1, apply penalties
      // Note: Hit/Critical aren't in StatRecord, so this is mainly for display
      // In a real implementation, you'd track these separately
      return {}; // Combat stats handled separately
    } else if (redtailDiceColor === 'green') {
      // Green Dice: Luck-based status effect chances
      // This is also a combat effect, not a base stat
      return {}; // Combat effects handled separately
    } else if (redtailDiceColor === 'yellow') {
      // Yellow Dice: Evade and Critical Evade
      // These are also combat stats, not base stats
      return {}; // Combat stats handled separately
    }
    
    return bonuses;
  };

  const getLEBonus = (): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    Object.keys(LEGEND_EXTEND).forEach(key => {
      const stat = LEGEND_EXTEND[key].stat;
      bonuses[stat] = legendExtend[key] ? 1 : 0;
    });
    return bonuses;
  };

  const getAstrologyBonus = (): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    if (astrology && ASTROLOGY_PLANETS[astrology]) {
      const stat = ASTROLOGY_PLANETS[astrology];
      bonuses[stat] = 1; // Planet signs give +1 to the associated stat
    }
    return bonuses;
  };

  // Helper function to get the base class for any given class
  const getBaseClass = (className: string): string => {
    // Check if the class is already a base class
    if (CLASS_HIERARCHY[className]?.baseClass) {
      return className;
    }
    
    // Find which base class this promotion class belongs to
    for (const [baseClassName, classData] of Object.entries(CLASS_HIERARCHY)) {
      if (classData.baseClass && classData.subClasses.includes(className)) {
        return baseClassName;
      }
    }
    
    // If not found in hierarchy, assume it's the class itself
    return className;
  };

  // Get class passive bonuses
  const getClassPassiveBonus = (className: string, rank: number): Partial<StatRecord> => {
    if (rank === 0) return {};
    
    const bonuses: Partial<StatRecord> = {};
    
    // Check for passive in the current class
    const classPassive = CLASS_PASSIVES[className];
    if (classPassive) {
      Object.entries(classPassive.stats).forEach(([stat, value]) => {
        bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + (value || 0) * rank;
      });
    }
    
    // Also check for base class passive (if different from current class)
    const baseClass = getBaseClass(className);
    if (baseClass !== className) {
      const basePassive = CLASS_PASSIVES[baseClass];
      if (basePassive) {
        Object.entries(basePassive.stats).forEach(([stat, value]) => {
          bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + (value || 0) * rank;
        });
      }
    }
    
    // Special case for Dark Bard - extra STR bonus at rank 7+
    if (className === 'Dark Bard' && rank >= 7) {
      bonuses.str = (bonuses.str || 0) + (rank - 6);
    }
    
    return bonuses;
  };

  const calculateDiminishingReturns = (
    racialStat: number, 
    addedStat: number, 
    classStat: number, 
    customStat: number,
    aptitudeBonus: number, 
    dragonBonus = 0
  ): number => {
    const softCap = racialStat + 40 + dragonBonus;
    let totalStat = racialStat + addedStat + (classStat * monoclassModifier) + customStat + aptitudeBonus;
    
    if (dragonBonus > 0) {
      totalStat = totalStat + Math.floor(totalStat * 0.05 * (dragonBonus / 3));
    }
    
    if (softCap >= totalStat) return totalStat;
    
    let effective = softCap;
    let remaining = totalStat - softCap;
    let multiplier = 0.9;
    
    while (remaining > 3) {
      remaining -= 3;
      effective += 3 * multiplier;
      multiplier -= 0.08;
      if (multiplier < 0.1) multiplier = 0.1;
    }
    
    return effective + (remaining * multiplier);
  };

  const getAptitudeBonus = (): number => {
    const subraceData = SUBRACES[subrace];
    const effectiveApt = calculateDiminishingReturns(
      (subraceData?.apt || 0) + customBaseStats.apt,
      addedStats.apt,
      0,
      customStats.apt,
      0
    );
    return Math.floor(effectiveApt / APTITUDE_NUMBER);
  };

  // Get combined class passive bonuses, avoiding double-counting base class passives
  const getCombinedClassPassiveBonuses = (mainClass: string, mainRank: number, subClass: string, subRank: number): Partial<StatRecord> => {
    const bonuses: Partial<StatRecord> = {};
    
    // Get main class bonuses
    const mainBonuses = getClassPassiveBonus(mainClass, mainRank);
    Object.entries(mainBonuses).forEach(([stat, value]) => {
      bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + (value || 0);
    });
    
    // Get sub class bonuses
    const subBonuses = getClassPassiveBonus(subClass, subRank);
    
    // Check if main and sub classes share the same base class
    const mainBaseClass = getBaseClass(mainClass);
    const subBaseClass = getBaseClass(subClass);
    const sharedBaseClass = mainBaseClass === subBaseClass ? mainBaseClass : null;
    
    // Apply sub class bonuses, but subtract shared base class passive if it would be double-counted
    Object.entries(subBonuses).forEach(([stat, value]) => {
      let adjustedValue = value || 0;
      
      // If classes share a base class and both would inherit the same base passive, subtract one instance
      if (sharedBaseClass && sharedBaseClass !== mainClass && sharedBaseClass !== subClass) {
        const basePassive = CLASS_PASSIVES[sharedBaseClass];
        if (basePassive && basePassive.stats[stat as StatKey]) {
          // Only subtract if both classes are actually inheriting from base (not using their own passive)
          const mainHasOwnPassive = CLASS_PASSIVES[mainClass] !== undefined;
          const subHasOwnPassive = CLASS_PASSIVES[subClass] !== undefined;
          
          if (!mainHasOwnPassive && !subHasOwnPassive) {
            // Both classes are inheriting from base, so subtract one instance
            adjustedValue -= (basePassive.stats[stat as StatKey] || 0) * subRank;
          }
        }
      }
      
      bonuses[stat as StatKey] = (bonuses[stat as StatKey] || 0) + adjustedValue;
    });
    
    return bonuses;
  };

  // Helper function to check if a class has access to a passive (either its own or inherited)
  const hasClassPassive = (className: string): boolean => {
    // Check if class has its own passive
    if (CLASS_PASSIVES[className]) return true;
    
    // Check if class can inherit a passive from its base class
    const baseClass = getBaseClass(className);
    return baseClass !== className && CLASS_PASSIVES[baseClass] !== undefined;
  };

  // Get the passive for a class (either its own or inherited from base class)
  const getClassPassiveData = (className: string): ClassPassive | undefined => {
    // Check for class's own passive first
    if (CLASS_PASSIVES[className]) return CLASS_PASSIVES[className];
    
    // Check for base class passive
    const baseClass = getBaseClass(className);
    if (baseClass !== className && CLASS_PASSIVES[baseClass]) {
      return CLASS_PASSIVES[baseClass];
    }
    
    return undefined;
  };

  const aptitudeBonus = Math.max(0, getAptitudeBonus());
  const leBonus = getLEBonus();
  const astroBonus = getAstrologyBonus();
  const foodBonus = FOODS[food];
  const historyBonus = HISTORY[history];
  const sanguineBonus = (sanguineCrest && (subrace === 'Oni' || subrace === 'Vampire')) ? 2 : 0;
  const risingGameBonus = calculateRisingGame();
  const combinedPassiveBonuses = getCombinedClassPassiveBonuses(mainClass, mainClassPassive, subClass, subClassPassive);

  // Karakuri youkai modifiers
  const getKarakuriYoukaiBonus = (): StatRecord => {
    if (subrace !== 'Karakuri') {
      return { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
    }

    switch (karakuriYoukai) {
      case 'Avian':
        return { str: 0, wil: -3, ski: 0, cel: 2, def: -2, res: 0, vit: 0, fai: 0, luc: 0, gui: 3, san: 0, apt: 0 };
      case 'Beast':
        return { str: 0, wil: 0, ski: 3, cel: 0, def: 0, res: -3, vit: 0, fai: 0, luc: 2, gui: -2, san: 0, apt: 0 };
      case 'Dragon':
        return { str: 3, wil: 0, ski: 0, cel: -3, def: 2, res: -2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
      case 'Fairy':
        return { str: -3, wil: -2, ski: 0, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 };
      case 'Mystic':
        return { str: -3, wil: 3, ski: 2, cel: 0, def: 0, res: -2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
      case 'Night':
        return { str: 0, wil: 0, ski: 0, cel: 0, def: -3, res: 3, vit: 0, fai: -2, luc: 0, gui: 2, san: 0, apt: 0 };
      case 'Plant':
        return { str: 0, wil: 0, ski: 0, cel: 0, def: 3, res: 0, vit: 2, fai: 0, luc: -2, gui: -3, san: 0, apt: 0 };
      default:
        return { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 };
    }
  };

  const karakuriYoukaiBonus = getKarakuriYoukaiBonus();

  const getEffectiveStat = (statName: StatKey): number => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    // Now only subrace provides stat bonuses, race provides special flags only
    const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName] + (karakuriYoukaiBonus[statName] || 0);
    const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
    
    // Sanguine Crest only affects STR, WIL, SKI, CEL, DEF
    const sanguineBonusForStat = (['str', 'wil', 'ski', 'cel', 'def'].includes(statName)) ? sanguineBonus : 0;
    
    // Power of Normalcy affects all stats except APT
    const powerOfNormalcyBonus = (() => {
      if (statName === 'apt' || !powerOfNormalcy) return 0;
      
      const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
      const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
      
      if (mainIsBase && subIsBase) {
        return mainClass === subClass ? 8 : 4; // Same Base Class: +8, Both Base Classes: +4
      }
      return 0;
    })();
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      + (foodBonus[statName as keyof FoodBonus] || 0) 
      + (historyBonus[statName as keyof HistoryBonus] || 0)
      + stampValue 
      + sanguineBonusForStat
      + powerOfNormalcyBonus
      + (risingGameBonus[statName] || 0)
      + (combinedPassiveBonuses[statName] || 0)
      + (leBonus[statName] || 0); // Legend Extend now added BEFORE diminishing returns
    
    const classValue = classData?.[statName] || 0;
    const customValue = customStats[statName];
    
    let dragonBonus = 0;
    if (statName === 'str') dragonBonus = dragonKing * 3;
    if (statName === 'wil') dragonBonus = dragonQueen * 3;
    
    const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
    const effective = calculateDiminishingReturns(racialValue, addedValue, classValue, customValue, aptBonusToApply, dragonBonus);
    
    // Legend Extend bonuses now included in addedValue before diminishing returns
    return effective;
  };

  const getRawStat = (statName: StatKey): number => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    // Raw stat is the total before diminishing returns are applied
    const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName] + (karakuriYoukaiBonus[statName] || 0);
    const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
    
    // Sanguine Crest only affects STR, WIL, SKI, CEL, DEF
    const sanguineBonusForStat = (['str', 'wil', 'ski', 'cel', 'def'].includes(statName)) ? sanguineBonus : 0;
    
    // Power of Normalcy affects all stats except APT
    const powerOfNormalcyBonus = (() => {
      if (statName === 'apt' || !powerOfNormalcy) return 0;
      
      const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
      const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
      
      if (mainIsBase && subIsBase) {
        return mainClass === subClass ? 8 : 4; // Same Base Class: +8, Both Base Classes: +4
      }
      return 0;
    })();
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      + (foodBonus[statName as keyof FoodBonus] || 0) 
      + (historyBonus[statName as keyof HistoryBonus] || 0)
      + stampValue 
      + sanguineBonusForStat
      + powerOfNormalcyBonus
      + (risingGameBonus[statName] || 0)
      + (combinedPassiveBonuses[statName] || 0)
      + (leBonus[statName] || 0);
    
    const classValue = (classData?.[statName] || 0) * monoclassModifier;
    const customValue = customStats[statName];
    
    let dragonBonus = 0;
    if (statName === 'str') dragonBonus = dragonKing * 3;
    if (statName === 'wil') dragonBonus = dragonQueen * 3;
    
    const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
    
    // Raw stat = base + additions + class + custom + dragon + aptitude (no diminishing returns)
    return racialValue + addedValue + classValue + customValue + dragonBonus + aptBonusToApply;
  };

  const stats: StatRecord = {
    str: getEffectiveStat('str'),
    wil: getEffectiveStat('wil'),
    ski: getEffectiveStat('ski'),
    cel: getEffectiveStat('cel'),
    def: getEffectiveStat('def'),
    res: getEffectiveStat('res'),
    vit: getEffectiveStat('vit'),
    fai: getEffectiveStat('fai'),
    luc: getEffectiveStat('luc'),
    gui: getEffectiveStat('gui'),
    san: getEffectiveStat('san'),
    apt: getEffectiveStat('apt')
  };

  const rawStats: StatRecord = {
    str: getRawStat('str'),
    wil: getRawStat('wil'),
    ski: getRawStat('ski'),
    cel: getRawStat('cel'),
    def: getRawStat('def'),
    res: getRawStat('res'),
    vit: getRawStat('vit'),
    fai: getRawStat('fai'),
    luc: getRawStat('luc'),
    gui: getRawStat('gui'),
    san: getRawStat('san'),
    apt: getRawStat('apt')
  };

  // Apply instinct bonus after initial calculation
  const instinctBonus = calculateInstinct();
  Object.entries(instinctBonus).forEach(([stat, value]) => {
    if (value) {
      stats[stat as StatKey] += value;
      rawStats[stat as StatKey] += value; // Apply to raw stats too
    }
  });

  if (dragonKing > 0) {
    stats.str = Math.floor(stats.str * (1 + 0.05 * dragonKing));
    // Raw stats don't get the percentage bonus from dragon pieces - they already include the flat +3 per piece
  }
  if (dragonQueen > 0) {
    stats.wil = Math.floor(stats.wil * (1 + 0.05 * dragonQueen));
    // Raw stats don't get the percentage bonus from dragon pieces - they already include the flat +3 per piece
  }

  // Choose which stats to display
  const displayStats = showRawStats ? rawStats : stats;

  const calculateMaxHP = (): number => {
    const raceData = RACES[race];
    const subraceData = SUBRACES[subrace];
    
    let vitHP = Math.floor(stats.vit * 10);
    if (raceData?.homunculi || subraceData?.homunculi) {
      vitHP -= Math.floor(stats.vit / 2);
    }
    
    const sanHP = Math.floor(stats.san * 2);
    const strHP = (addedStats.str + (subraceData?.str || 0) + (astroBonus.str || 0)) * 3;
    const pointsSpent = MAX_POINTS - totalPoints;
    
    let maxHP = vitHP + sanHP + strHP + pointsSpent;
    
    if (giantGene) {
      maxHP = Math.floor(maxHP * 1.1);
    }
    
    // Fortitude bonus
    if (fortitude) {
      maxHP += Math.floor(maxHP * 0.1);
    }
    
    // Pain Tolerance
    maxHP += painTolerance * 10;
    
    // Warwalk
    if (warwalk) {
      maxHP += 30;
    }
    
    // Endurance
    if (endurance) {
      maxHP = Math.floor(maxHP * 1.15);
    }
    
    maxHP += customHP;
    
    // Persistence of Normalcy
    if (persistenceOfNormalcy) {
      const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
      const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
      
      if (mainIsBase && subIsBase) {
        if (mainClass === subClass) {
          maxHP += 200; // Same Base Class
        } else {
          maxHP += 100; // Both Base Classes
        }
      }
    }
    
    // Lich Magia Detremus: -30% HP (reduced by 1% per 2 Scaled SAN)
    if (subrace === 'Lich') {
      const sanModifier = Math.floor(stats.san / 2);
      const hpPenalty = Math.max(0, 30 - sanModifier); // Can't go below 0% penalty
      maxHP = Math.floor(maxHP * (1 - hpPenalty / 100));
    }
    
    return maxHP;
  };

  const calculateHP = (): number => {
    const maxHP = calculateMaxHP();
    return Math.floor(maxHP * (hpPercent / 100));
  };

  const calculateMP = (): number => {
    const raceData = RACES[race];
    const subraceData = SUBRACES[subrace];
    
    let willMP = Math.floor(stats.wil * 5);
    if (raceData?.homunculi || subraceData?.homunculi) {
      willMP += Math.floor(stats.wil);
    }
    
    const sanMP = Math.floor(stats.san * 2);
    const faiMP = Math.floor(stats.fai * 3);
    
    let maxMP = willMP + sanMP + faiMP;
    
    // Warwalk
    if (warwalk) {
      maxMP += 30;
    }
    
    maxMP += customFP;
    
    // Lich Magia Detremus: +50% FP (increased by 1% per 2 Scaled SAN)
    if (subrace === 'Lich') {
      const sanModifier = Math.floor(stats.san / 2);
      const fpBonus = 50 + sanModifier;
      maxMP = Math.floor(maxMP * (1 + fpBonus / 100));
    }
    
    return maxMP;
  };

  const calculateElementalATK = (element: string): number => {
    // Helper function to get raw (unscaled) stat value for a given stat
    const getRawStat = (statName: StatKey): number => {
      const subraceData = SUBRACES[subrace];
      const classData = CLASSES[mainClass];
      
      // Calculate the same way as getEffectiveStat but without diminishing returns
      const racialValue = (subraceData?.[statName] || 0) + customBaseStats[statName] + (karakuriYoukaiBonus[statName] || 0);
      const stampValue = statName in stamps ? (stamps[statName as StampKey] || 0) : 0;
      
      // Sanguine Crest only affects STR, WIL, SKI, CEL, DEF
      const sanguineBonusForStat = (['str', 'wil', 'ski', 'cel', 'def'].includes(statName)) ? sanguineBonus : 0;
      
      const addedValue = addedStats[statName] 
        + (astroBonus[statName] || 0) 
        + (foodBonus[statName as keyof FoodBonus] || 0) 
        + (historyBonus[statName as keyof HistoryBonus] || 0)
        + stampValue 
        + sanguineBonusForStat
        + (risingGameBonus[statName] || 0)
        + (combinedPassiveBonuses[statName] || 0);
      
      const classValue = classData?.[statName] || 0;
      const customValue = customStats[statName];
      
      let dragonBonus = 0;
      if (statName === 'str') dragonBonus = dragonKing * 3;
      if (statName === 'wil') dragonBonus = dragonQueen * 3;
      
      const aptBonusToApply = statName === 'apt' ? 0 : aptitudeBonus;
      
      // Return the raw total without diminishing returns, but include LE bonus
      let rawTotal = racialValue + addedValue + (classValue * monoclassModifier) + customValue + aptBonusToApply + dragonBonus;
      
      // Add Legend Extend bonuses (these come after everything)
      rawTotal += (leBonus[statName] || 0);
      
      return rawTotal;
    };

    const statMap: Record<string, StatKey> = {
      'Fire': 'str', 'Ice': 'ski', 'Wind': 'cel', 'Earth': 'def',
      'Dark': 'res', 'Water': 'vit', 'Light': 'fai', 'Lightning': 'luc',
      'Acid': 'gui', 'Sound': 'san'
    };

    // Add +2 elemental attack if the matching planet sign is selected
    const planetBonus = (astrology && PLANET_ELEMENTS[astrology] === element) ? 2 : 0;
    
    // Get the starsign's element if astrology is selected
    const starsignElement = astrology ? PLANET_ELEMENTS[astrology] : null;
    
    let wilBonus = 0;
    let statBonus = 0;
    
    if (luminaryElement) {
      // Luminary Element: WIL no longer increases all elements
      // Instead, it increases your Starsign's element by 1 per 1 WIL (no diminishing returns)
      // The original stat that grants a bonus to this element no longer does so
      if (starsignElement === element) {
        // For starsign element: Raw WIL gives 1:1 bonus (ignoring diminishing returns), original stat gives 0
        wilBonus = getRawStat('wil');
        statBonus = 0;
      } else {
        // For other elements: no WIL bonus, use scaled stat bonus normally
        wilBonus = 0;
        statBonus = stats[statMap[element]];
      }
    } else {
      // Normal WIL behavior: adds to all elemental ATK except Sound and Acid (per 4 points, using scaled WIL)
      wilBonus = (element !== 'Sound' && element !== 'Acid') ? Math.floor(stats.wil / 4) : 0;
      statBonus = stats[statMap[element]];
    }
    
    // Add manual adjustment for this element
    const manualAdjustment = elementalATKAdjustments[element as ElementKey] || 0;
    
    // Handle special racial attack bonuses
    let raceBonus = 0;
    if (subrace === 'Umbral' && element === 'Dark') {
      // Umbral: Dark ATK increased by half of character level (max: 15)
      raceBonus = Math.min(15, Math.floor(characterLevel / 2));
    } else if (subrace === 'Theno' && element === 'Sound') {
      // Theno: Base Sound ATK equals character level, doesn't increase from stat points
      return Math.floor(characterLevel + planetBonus + manualAdjustment);
    }
    
    return Math.floor(statBonus + wilBonus + planetBonus + manualAdjustment + raceBonus);
  };

  const calculateElementalRES = (element: string): number => {
    // Elemental resistance: +1% per 6 SAN points for Fire, Ice, Wind, Earth, Water, Lightning, Dark, and Light
    // Sound and Acid elements don't get SAN-based resistance
    let baseResistance = 0;
    if (element !== 'Sound' && element !== 'Acid') {
      baseResistance = Math.floor(stats.san / 6);
    }
    
    // Add manual adjustment for this element
    const manualAdjustment = elementalRESAdjustments[element as ElementKey] || 0;
    
    // Add race-based resistance/weakness for this element
    const raceAdjustment = getRaceResistances()[element as ElementKey] || 0;
    
    return Math.floor(baseResistance + manualAdjustment + raceAdjustment);
  };

  // Get race-based elemental resistances for the current subrace
  const getRaceResistances = (): ElementalRecord => {
    // Default resistances from the basic table
    const baseResistances = RACE_RESISTANCES[subrace] || {
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, 
      Light: 0, Lightning: 0, Acid: 0, Sound: 0
    };

    // Handle special races with SAN-scaled resistances
    if (subrace === 'Umbral') {
      const sanReduction = stats.san;
      return {
        Fire: 0, Ice: 0, Wind: 0, Earth: 0, Water: 0, Lightning: 0, Acid: 0, Sound: 0,
        Dark: Math.floor(Math.max(0, 25 - sanReduction)),    // 25% Dark resistance, reduced by SAN
        Light: Math.floor(Math.min(0, -25 + sanReduction))   // 25% Light weakness, reduced by SAN (less negative)
      };
    }

    if (subrace === 'Papilion') {
      const sanReduction = stats.san;
      return {
        Fire: 0, Ice: 0, Water: 0, Lightning: 0, Acid: 0, Sound: 0, Dark: 0, Light: 0,
        Wind: Math.floor(Math.max(0, 30 - sanReduction)),    // 30% Wind resistance, reduced by SAN
        Earth: Math.floor(Math.min(0, -30 + sanReduction))   // 30% Earth weakness, reduced by SAN (less negative)
      };
    }

    // Handle Vampire with Sanguine Crest conditional resistances
    if (subrace === 'Vampire') {
      if (sanguineCrest) {
        return {
          Fire: 0, Ice: 0, Wind: 0, Earth: 0, Water: 0, Lightning: 0, Acid: 0, Sound: 0,
          Dark: 25,    // 25% Dark resistance when Sanguine Crest is active
          Light: -25   // 25% Light weakness when Sanguine Crest is active
        };
      } else {
        return {
          Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, 
          Light: 0, Lightning: 0, Acid: 0, Sound: 0
        };
      }
    }

    // Handle Karakuri youkai resistances
    if (subrace === 'Karakuri') {
      const base = { Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0 };
      
      switch (karakuriYoukai) {
        case 'Avian':
          return { ...base, Wind: 15, Lightning: -15 };
        case 'Beast':
          return { ...base, Lightning: 15, Fire: -15 };
        case 'Dragon':
          return { ...base, Fire: 15, Wind: -15 };
        case 'Fairy':
          return { ...base, Light: 15, Dark: -15 };
        case 'Mystic':
          return { ...base, Ice: 15, Earth: -15 };
        case 'Night':
          return { ...base, Dark: 15, Light: -15 };
        case 'Plant':
          return { ...base, Earth: 15, Ice: -15 };
        default:
          return base;
      }
    }

    // Handle Wyverntouched - poison resistance displayed separately
    if (subrace === 'Wyverntouched') {
      // No modifications to elemental resistances needed
      // Poison resistance is handled in separate UI section
      return baseResistances;
    }

    // Handle Naga - poison resistance displayed separately  
    if (subrace === 'Naga') {
      // No modifications to elemental resistances needed
      // Poison resistance is handled in separate UI section
      return baseResistances;
    }

    // Return the base resistances for other races
    return baseResistances;
  };

  const youkaiCap = Math.floor(((SUBRACES[subrace]?.fai || 0) + customBaseStats.fai + addedStats.fai + (astroBonus.fai || 0)) / 5) + 5;

  const addStat = (statName: StatKey): void => {
    // Comprehensive validation before adding
    const currentValue = addedStats[statName];
    const availablePoints = totalPoints;
    
    // Calculate hard cap: race base + custom base + manual points + LE bonus + history bonus ≤ 80
    // Class stats do NOT count toward the hard cap
    const subraceData = SUBRACES[subrace];
    const raceBase = subraceData?.[statName] || 0;
    const customBase = customBaseStats[statName];
    const legendExtendBonus = leBonus[statName] || 0;
    const currentHistoryBonus = (historyBonus as any)[statName] || 0;
    
    const totalBase = raceBase + customBase;
    const currentTotal = totalBase + currentValue + legendExtendBonus + currentHistoryBonus;
    const wouldExceedHardCap = currentTotal >= 80;
    
    // Only add if we have points available, current value is valid, and we haven't hit hard cap
    if (availablePoints > 0 && currentValue >= 0 && currentValue < MAX_POINTS && !wouldExceedHardCap) {
      setAddedStats(prev => ({ ...prev, [statName]: prev[statName] + 1 }));
      setTotalPoints(prev => Math.max(0, prev - 1));
      
      // Update any input field that might be showing this stat
      const inputElement = inputRefs.current[statName];
      if (inputElement) {
        inputElement.value = (currentValue + 1).toString();
      }
    }
  };

  const removeStat = (statName: StatKey): void => {
    // Comprehensive validation before removing
    const currentValue = addedStats[statName];
    const currentTotal = totalPoints;
    
    // Only remove if current value is positive and total won't exceed max
    if (currentValue > 0 && currentTotal < MAX_POINTS) {
      setAddedStats(prev => ({ ...prev, [statName]: Math.max(0, prev[statName] - 1) }));
      setTotalPoints(prev => Math.min(MAX_POINTS, prev + 1));
      
      // Update any input field that might be showing this stat
      const inputElement = inputRefs.current[statName];
      if (inputElement) {
        inputElement.value = Math.max(0, currentValue - 1).toString();
      }
    }
  };

  const resetStats = (): void => {
    setAddedStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setCustomStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setCustomBaseStats({
      str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0,
      vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0
    });
    setTotalPoints(MAX_POINTS);
    setLegendExtend({});
    setAstrology('');
    setCustomHP(0);
    setCustomFP(0);
    setBaseEvade(0);
    setBonusEvade(0);
    setGiantGene(false);
    setDragonKing(0);
    setDragonQueen(0);
    setFood('None');
    setHistory('None');
    setSubrace('Human'); // Reset to base Human race
    setStamps({ str: 0, wil: 0, ski: 0, cel: 0, vit: 0, fai: 0 });
    setSanguineCrest(false);
    setFelidaeInstinct(false);
    setLupineInstinct(false);
    setRisingGame(0);
    setRedtailFortuneLevel(1);
    setRedtailDiceColor('red');
    setFortitude(false);
    setPainTolerance(0);
    setWarwalk(false);
    setEndurance(false);
    setPersistenceOfNormalcy(false);
    setPowerOfNormalcy(false);
    setMainClassPassive(0);
    setSubClassPassive(0);
    
    // Reset elemental adjustments
    setElementalATKAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });
    setElementalRESAdjustments({
      Fire: 0, Ice: 0, Wind: 0, Earth: 0, Dark: 0, Water: 0, Light: 0, Lightning: 0, Acid: 0, Sound: 0
    });
  };

  // Elemental adjustment functions
  const adjustElementalATK = (element: ElementKey, change: number): void => {
    setElementalATKAdjustments(prev => ({
      ...prev,
      [element]: Math.max(-99, Math.min(99, prev[element] + change))
    }));
  };

  const adjustElementalRES = (element: ElementKey, change: number): void => {
    setElementalRESAdjustments(prev => ({
      ...prev,
      [element]: Math.max(-99, Math.min(99, prev[element] + change))
    }));
  };

  // Uncontrolled input approach - no React state management for input values
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  const commitStatValue = (statKey: StatKey, inputElement: HTMLInputElement) => {
    const value = inputElement.value;
    let targetPoints = parseInt(value) || 0;
    
    // Calculate hard cap: race base + custom base + manual points + LE bonus + history bonus + astrology bonus ≤ 80
    // Class stats do NOT count toward the hard cap
    const subraceData = SUBRACES[subrace];
    const raceBase = subraceData?.[statKey] || 0;
    const customBase = customBaseStats[statKey];
    const legendExtendBonus = leBonus[statKey] || 0;
    const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
    const currentAstrologyBonus = astroBonus[statKey] || 0;
    
    const totalBase = raceBase + customBase;
    const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus - currentAstrologyBonus;
    
    // Aggressive validation - clamp to valid range immediately, including dynamic hard cap
    targetPoints = Math.max(0, Math.min(MAX_POINTS, Math.min(maxAllowedManualPoints, targetPoints)));
    
    const currentPoints = addedStats[statKey];
    
    // Additional safety check - ensure we're not in an invalid state
    const totalUsedPoints = Object.values(addedStats).reduce((sum, val) => sum + val, 0) - currentPoints;
    const maxAllowableForThisStat = MAX_POINTS - totalUsedPoints;
    targetPoints = Math.min(targetPoints, maxAllowableForThisStat);
    
    // Calculate final difference after all validations
    const actualDifference = targetPoints - currentPoints;
    
    if (actualDifference !== 0) {
      if (actualDifference > 0) {
        // Adding points - strictly validate available points
        const availablePoints = totalPoints;
        const pointsToAdd = Math.min(actualDifference, availablePoints);
        
        // Only proceed if we can actually add points
        if (pointsToAdd > 0) {
          const actualNewValue = currentPoints + pointsToAdd;
          setAddedStats(prev => ({ ...prev, [statKey]: actualNewValue }));
          setTotalPoints(prev => Math.max(0, prev - pointsToAdd));
          inputElement.value = actualNewValue.toString();
        } else {
          // Can't add any points, revert input to current value
          inputElement.value = currentPoints.toString();
        }
      } else {
        // Removing points - validate we don't go below 0
        const actualTarget = Math.max(0, targetPoints);
        const pointsToRemove = currentPoints - actualTarget;
        
        if (pointsToRemove > 0) {
          setAddedStats(prev => ({ ...prev, [statKey]: actualTarget }));
          setTotalPoints(prev => Math.min(MAX_POINTS, prev + pointsToRemove));
          inputElement.value = actualTarget.toString();
        }
      }
    } else {
      // No change needed, but ensure input shows the correct value
      inputElement.value = currentPoints.toString();
    }
    
    // Remove any visual indicators and reset to normal styling
    inputElement.style.backgroundColor = '';
    inputElement.style.borderColor = '';
    inputElement.style.color = '';
  };

  // Validation function to ensure point integrity
  const validatePointTotals = () => {
    const totalUsedPoints = Object.values(addedStats).reduce((sum, value) => sum + value, 0);
    const expectedRemainingPoints = MAX_POINTS - totalUsedPoints;
    
    // If totals don't match, correct them
    if (totalPoints !== expectedRemainingPoints) {
      console.warn(`Point total mismatch detected. Correcting from ${totalPoints} to ${expectedRemainingPoints}`);
      setTotalPoints(Math.max(0, Math.min(MAX_POINTS, expectedRemainingPoints)));
    }
  };

  // Auto-validate point totals whenever addedStats or totalPoints change
  useEffect(() => {
    validatePointTotals();
  }, [addedStats, totalPoints]);

  // Check if class has fortitude access
  const hasFortitude = ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(mainClass) 
    || ['Soldier', 'Black Knight', 'Tactician', 'Demon Hunter', 'Solblader'].includes(subClass);

  // Check if class has endurance access
  const hasEndurance = mainClass === 'Hexer' || subClass === 'Hexer';

  // Check if class/race has Rising Game/Pain Tolerance
  const hasGhost = mainClass === 'Ghost' || subClass === 'Ghost';

  const StatRow = ({ label, statKey }: { label: string; statKey: StatKey }) => {
    const subraceData = SUBRACES[subrace];
    const classData = CLASSES[mainClass];
    
    const subraceBase = subraceData?.[statKey] || 0;
    const customBase = customBaseStats[statKey];
    const classBase = classData?.[statKey] || 0;
    
    const totalBase = subraceBase + customBase;
    const pointsAdded = addedStats[statKey];
    const legendExtendBonus = leBonus[statKey] || 0;
    const historyInvested = historyBonus[statKey as keyof HistoryBonus] || 0;
    const astrologyBonus = astroBonus[statKey] || 0;
    const totalInvested = pointsAdded + legendExtendBonus + historyInvested + astrologyBonus; // Include LE, History, and Astrology in invested display
    const customFlat = customStats[statKey];
    
    // Get the color for this stat
    let statColor = STAT_COLORS[statKey];
    let isRainbow = statColor === 'rainbow';
    
    // Special case: WIL with Luminary Element changes to element color
    if (statKey === 'wil' && luminaryElement && astrology && PLANET_ELEMENTS[astrology]) {
      const elementColor = ELEMENT_COLORS[PLANET_ELEMENTS[astrology]];
      if (elementColor) {
        statColor = elementColor;
        isRainbow = false; // Override rainbow if it was set
      }
    }
    
    // Build detailed tooltip showing all sources
    const tooltipParts = [
      `Subrace (${subrace}): ${subraceBase}`, 
      customBase !== 0 ? `Custom Base: ${customBase}` : null,
      `Class (${mainClass}): ${classBase}${monoclassModifier === 2 ? ' x2 (monoclass)' : ''}`,
      pointsAdded > 0 ? `Points Added: ${pointsAdded}` : null,
      customFlat !== 0 ? `Custom Flat Bonus: ${customFlat}` : null,
      astroBonus[statKey] ? `Astrology: ${astroBonus[statKey]}` : null,
      leBonus[statKey] ? `Legend Extend: +${leBonus[statKey]}` : null,
      foodBonus[statKey as keyof FoodBonus] ? `Food: ${foodBonus[statKey as keyof FoodBonus]}` : null,
      historyBonus[statKey as keyof HistoryBonus] ? `History: ${historyBonus[statKey as keyof HistoryBonus]}` : null,
      showRawStats ? `Raw Total: ${displayStats[statKey].toFixed(1)}` : `Final (after DR): ${displayStats[statKey].toFixed(1)}`
    ].filter(Boolean).join('\n');

    return (
      <div className="flex items-center gap-2 py-2 border-b border-gray-700">
        <button 
          className="w-24 font-semibold text-left hover:underline cursor-pointer" 
          style={isRainbow ? {
            background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          } : { color: statColor }} 
          title="Click for detailed info"
          onClick={() => {
            setSelectedStat(statKey);
            setShowStatInfo(true);
          }}
        >
          {label}
        </button>
        <button
          onClick={() => removeStat(statKey)}
          disabled={addedStats[statKey] === 0}
          className="p-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded"
          title="Remove 1 point"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => addStat(statKey)}
          disabled={(() => {
            if (totalPoints === 0) return true;
            
            // Calculate current bonuses for this stat using same logic as addStat
            // Class stats do NOT count toward the hard cap
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
            
            return addedStats[statKey] >= maxAllowedManualPoints;
          })()}
          className="p-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded"
          title={(() => {
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
            
            return addedStats[statKey] >= maxAllowedManualPoints ? 
              `Hard cap reached (max ${maxAllowedManualPoints} manual points with race+custom base ${totalBase} + LE ${legendExtendBonus} + History ${currentHistoryBonus})` : 
              "Add 1 point";
          })()}
        >
          <Plus size={16} />
        </button>
        <input
          ref={(el) => { if (el) inputRefs.current[statKey] = el; }}
          type="number"
          min="0"
          max={(() => {
            // Class stats do NOT count toward the hard cap
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            return 80 - totalBase - legendExtendBonus - currentHistoryBonus;
          })()}
          defaultValue={pointsAdded}
          key={`${statKey}-${pointsAdded}`} // Force reset when points change via +/- buttons
          onInput={(e) => {
            // Visual feedback while typing
            const input = e.currentTarget;
            const value = parseInt(input.value) || 0;
            
            // Calculate dynamic hard cap
            // Class stats do NOT count toward the hard cap
            const subraceData = SUBRACES[subrace];
            const raceBase = subraceData?.[statKey] || 0;
            const customBase = customBaseStats[statKey];
            const legendExtendBonus = leBonus[statKey] || 0;
            const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
            
            const totalBase = raceBase + customBase;
            const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
            
            // Basic range validation during typing (dynamic hard cap)
            if (value < 0) {
              input.value = '0';
            } else if (value > maxAllowedManualPoints) {
              input.value = maxAllowedManualPoints.toString();
            }
            
            // Visual feedback
            input.style.backgroundColor = '#92400e'; // Yellow-900
            input.style.borderColor = '#d97706'; // Yellow-600
            input.style.color = '#fef3c7'; // Yellow-200
          }}
          onBlur={(e) => {
            commitStatValue(statKey, e.currentTarget);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              commitStatValue(statKey, e.currentTarget);
              e.currentTarget.blur();
            }
          }}
          className="w-16 border rounded px-2 py-1 text-center bg-gray-700 border-gray-600"
          title="Type number and press Enter or click away to apply"
        />
        <div className="flex-1 text-right">
          <span 
            className="text-2xl font-bold" 
            style={isRainbow ? {
              background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            } : { color: statColor }} 
            title={tooltipParts}
          >
            {Math.floor(displayStats[statKey])}
          </span>
          <span className="text-sm text-gray-400 ml-2" title={`Base: ${subraceBase} (from ${subrace}) + ${customBase > 0 ? customBase + ' (custom) + ' : ''}${totalInvested} (invested points + Legend Extend + History)`}>
            ({totalBase} + {totalInvested})
          </span>
        </div>
      </div>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.hierarchical-class-selector')) {
        setShowMainClassDropdown(false);
        setShowSubClassDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // POE-style hierarchical class selection component
  const HierarchicalClassSelector = ({ 
    type, 
    selectedBaseClass, 
    selectedClass, 
    onBaseClassChange, 
    onClassChange, 
    showDropdown, 
    setShowDropdown 
  }: {
    type: 'Main' | 'Sub';
    selectedBaseClass: string;
    selectedClass: string;
    onBaseClassChange: (baseClass: string) => void;
    onClassChange: (className: string) => void;
    showDropdown: boolean;
    setShowDropdown: (show: boolean) => void;
  }) => {
    return (
      <div className="relative hierarchical-class-selector">
        <label className="block text-sm font-medium mb-2">{type} Class</label>
        
        {/* Selected class display */}
        <div 
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 cursor-pointer hover:bg-gray-600 flex justify-between items-center"
        >
          <div className="flex flex-col">
            <span className="text-white">{selectedClass}</span>
            {selectedClass !== selectedBaseClass && (
              <span className="text-xs text-gray-400">from {selectedBaseClass}</span>
            )}
          </div>
          <span className="text-gray-400">▼</span>
        </div>

        {/* Dropdown menu */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-80 overflow-y-auto">
            <div className="px-3 py-2 text-xs text-gray-400 bg-gray-900 border-b border-gray-700">
              💡 Select a base class or its promotion class
            </div>
            {Object.entries(CLASS_HIERARCHY).map(([baseClassName, baseClassData]) => (
              <div key={baseClassName} className="border-b border-gray-700 last:border-b-0">
                {/* Base class header - styled like POE skill tree nodes */}
                <div 
                  className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors border-l-4 relative ${
                    selectedBaseClass === baseClassName 
                      ? 'bg-red-800 text-red-100 border-red-400' 
                      : 'bg-red-700 text-red-200 border-red-500 hover:bg-red-600 hover:border-red-400'
                  }`}
                  onClick={() => {
                    onBaseClassChange(baseClassName);
                    onClassChange(baseClassName); // Set base class as selected
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>⚔️ {baseClassName}</span>
                    <span className="text-xs opacity-75">
                      {selectedClass === baseClassName ? '✓ Selected' : 'Click to select'}
                    </span>
                  </div>
                </div>
                
                {/* Subclasses header */}
                <div className="px-4 py-1 text-xs text-gray-500 bg-gray-800 border-l-2 border-gray-600 ml-2">
                  Promotion Classes:
                </div>
                
                {/* Subclasses - styled like POE ascendancy classes */}
                <div className="bg-gray-900">
                  {baseClassData.subClasses.map(subClassName => (
                    <div
                      key={subClassName}
                      className={`px-6 py-2 text-sm cursor-pointer transition-colors border-l-2 ml-2 relative ${
                        selectedClass === subClassName
                          ? 'bg-blue-800 text-blue-100 border-blue-400'
                          : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-blue-500'
                      }`}
                      onClick={() => {
                        onBaseClassChange(baseClassName);
                        onClassChange(subClassName);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span>↳ {subClassName}</span>
                        {selectedClass === subClassName && (
                          <span className="text-xs opacity-75">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * Run stat optimization
   */
  const runOptimization = async (): Promise<void> => {
    setIsOptimizing(true);
    setOptimizationResult(null);

    try {
      // Small delay for UI responsiveness
      await new Promise(resolve => setTimeout(resolve, 100));

      const buildType = BUILD_TYPES[selectedBuildType];
      if (!buildType) {
        throw new Error('Invalid build type selected');
      }

      const params: OptimizationParams = {
        buildType: selectedBuildType,
        mainClass,
        subClass,
        race,
        subrace,
        history,
        astrology,
        legendExtend,
        targetLevel: optimizerTargetLevel,
        includeCustomStats: true,
        customStats,
        customBaseStats,
        customHP,
        customFP,
        prioritizeWeaponScaling: optimizeWeaponScaling,
        weaponType: selectedWeaponType,
        mainClassPassive,
        subClassPassive,
        baseEvade,
        bonusEvade,
        optimizationMode,
        targetStats: optimizationMode === 'targets' ? targetStats : undefined,
        customWeights: optimizationMode === 'weights' ? customWeights : undefined
      };

      const optimizer = new StatOptimizer(buildType, params);
      const result = optimizer.optimize();

      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
      setOptimizationResult({
        allocatedStats: { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
        totalPoints: 0,
        score: 0,
        reasoning: ['Optimization failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: []
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  /**
   * Apply optimization result to current build
   */
  const applyOptimization = (): void => {
    if (!optimizationResult) return;

    setAddedStats(optimizationResult.allocatedStats);
    const pointsUsed = Object.values(optimizationResult.allocatedStats).reduce((sum, val) => sum + val, 0);
    setTotalPoints(MAX_POINTS - pointsUsed);
  };

  const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">SL2 Calculator Suite</h1>
            <div className="text-sm text-gray-400">Version 0.3.0a</div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Stat Calculator
            </button>
            <button
              onClick={() => setActiveTab('weapon')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'weapon'
                  ? 'border-b-2 border-yellow-500 text-yellow-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Weapon Calculator
            </button>
            <button
              onClick={() => setActiveTab('optimizer')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'optimizer'
                  ? 'border-b-2 border-green-500 text-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Stat Optimizer
            </button>
          </div>

          {/* Stat Calculator Tab */}
          {activeTab === 'stats' && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Race Category</label>
              <select
                value={race}
                onChange={(e) => handleRaceChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(RACES).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Race/Subrace (Stats)</label>
              <select
                value={subrace}
                onChange={(e) => handleSubraceChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {getAvailableSubraces().map(sr => (
                  <option key={sr} value={sr}>{sr}</option>
                ))}
              </select>
              
              {/* Karakuri Youkai Selection */}
              {subrace === 'Karakuri' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1 text-purple-400">Youkai Binding</label>
                  <select
                    value={karakuriYoukai}
                    onChange={(e) => setKarakuriYoukai(e.target.value)}
                    className="w-full bg-purple-900 border border-purple-600 rounded px-3 py-1 text-sm"
                  >
                    <option value="None">None</option>
                    <option value="Avian">Avian (+3 GUI, +2 CEL, -3 WIL, -2 DEF)</option>
                    <option value="Beast">Beast (+3 SKI, +2 LUC, -3 RES, -2 GUI)</option>
                    <option value="Dragon">Dragon (+3 STR, +2 DEF, -3 CEL, -2 RES)</option>
                    <option value="Fairy">Fairy (+3 CEL, +2 LUC, -3 STR, -2 WIL)</option>
                    <option value="Mystic">Mystic (+3 WIL, +2 SKI, -3 STR, -2 RES)</option>
                    <option value="Night">Night (+3 RES, +2 GUI, -3 DEF, -2 FAI)</option>
                    <option value="Plant">Plant (+3 DEF, +2 VIT, -3 GUI, -2 LUC)</option>
                  </select>
                </div>
              )}
            </div>
            
            <HierarchicalClassSelector
              type="Main"
              selectedBaseClass={selectedMainBaseClass}
              selectedClass={mainClass}
              onBaseClassChange={(baseClass) => {
                setSelectedMainBaseClass(baseClass);
              }}
              onClassChange={(className) => {
                // Find which base class this subclass belongs to
                const baseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
                  data.subClasses.includes(className) || data.name === className
                )?.[0] || selectedMainBaseClass;
                setSelectedMainBaseClass(baseClass);
                setMainClass(className);
                setMainClassPassive(0);
              }}
              showDropdown={showMainClassDropdown}
              setShowDropdown={setShowMainClassDropdown}
            />
            
            <HierarchicalClassSelector
              type="Sub"
              selectedBaseClass={selectedSubBaseClass}
              selectedClass={subClass}
              onBaseClassChange={(baseClass) => {
                setSelectedSubBaseClass(baseClass);
              }}
              onClassChange={(className) => {
                // Find which base class this subclass belongs to
                const baseClass = Object.entries(CLASS_HIERARCHY).find(([, data]) => 
                  data.subClasses.includes(className) || data.name === className
                )?.[0] || selectedSubBaseClass;
                setSelectedSubBaseClass(baseClass);
                setSubClass(className);
                setSubClassPassive(0);
              }}
              showDropdown={showSubClassDropdown}
              setShowDropdown={setShowSubClassDropdown}
            />
          </div>

          {/* Class Passive Rank selectors */}
          {(hasClassPassive(mainClass) || hasClassPassive(subClass)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {(() => {
                // Check if both classes share the same base class passive
                const mainPassiveData = getClassPassiveData(mainClass);
                const subPassiveData = getClassPassiveData(subClass);
                const mainIsInherited = !CLASS_PASSIVES[mainClass];
                const subIsInherited = !CLASS_PASSIVES[subClass];
                const mainSourceClass = mainIsInherited ? getBaseClass(mainClass) : mainClass;
                const subSourceClass = subIsInherited ? getBaseClass(subClass) : subClass;
                const isSharedBaseClassPassive = mainIsInherited && subIsInherited && mainSourceClass === subSourceClass && mainClass !== subClass;
                
                const elements = [];
                
                // Main class passive (or shared passive if both inherit the same one)
                if (hasClassPassive(mainClass)) {
                  const displayName = mainIsInherited ? mainSourceClass : mainClass;
                  const passiveData = mainPassiveData;
                  
                  elements.push(
                    <div key="main">
                      <label className="block text-sm font-medium mb-2">
                        {displayName} Passive Rank {isSharedBaseClassPassive ? '(Main Class)' : ''} ({passiveData?.description})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={mainClass === subClass ? 0 : passiveData?.maxRank || 0}
                        value={mainClassPassive}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(Number(e.target.value), passiveData?.maxRank || 0));
                          setMainClassPassive(value);
                        }}
                        disabled={mainClass === subClass}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>
                  );
                }
                
                // Sub class passive (only if it's different from main or if not shared base class passive)
                if (hasClassPassive(subClass) && mainClass !== subClass && !isSharedBaseClassPassive) {
                  const displayName = subIsInherited ? subSourceClass : subClass;
                  const passiveData = subPassiveData;
                  
                  elements.push(
                    <div key="sub">
                      <label className="block text-sm font-medium mb-2">
                        {displayName} Passive Rank (Sub Class) ({passiveData?.description})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={passiveData?.maxRank || 0}
                        value={subClassPassive}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(Number(e.target.value), passiveData?.maxRank || 0));
                          setSubClassPassive(value);
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>
                  );
                }
                
                return elements;
              })()}
            </div>
          )}

          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="text-xl font-semibold">
              Points Remaining: <span className="text-yellow-400">{totalPoints}</span>
              {monoclassModifier === 2 && <span className="ml-2 text-sm text-purple-400">(Monoclass x2)</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowFood(!showFood)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
              >
                <Utensils size={16} />
                Food
              </button>
              <button
                onClick={() => setShowStamps(!showStamps)}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm"
              >
                <BookOpen size={16} />
                History
              </button>
              <button
                onClick={() => setShowTalents(!showTalents)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-sm"
              >
                Talents
              </button>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
              >
                <Settings size={16} />
                Advanced
              </button>
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
              >
                <Download size={16} />
                Import/Export
              </button>
              <button
                onClick={resetStats}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          {showFood && (
            <div className="bg-gray-700 rounded p-4 mb-4">
              <h3 className="font-bold text-lg mb-3">Food Bonuses</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(FOODS).map(f => (
                  <button
                    key={f}
                    onClick={() => setFood(f)}
                    className={`px-4 py-2 rounded ${
                      food === f ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {f}
                    {f !== 'None' && (
                      <span className="text-xs block text-gray-300">
                        {Object.entries(FOODS[f]).filter(([_, v]) => v > 0).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showStamps && (
            <div className="bg-gray-700 rounded p-4 mb-4">
              <h3 className="font-bold text-lg mb-3">History & Stamps</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Character History</label>
                <select
                  value={history}
                  onChange={(e) => handleHistoryChange(e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2"
                >
                  {Object.keys(HISTORY).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Stat Stamps</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(stamps) as StampKey[]).map(stat => (
                    <div key={stat}>
                      <label className="block text-sm mb-1 capitalize">{stat.toUpperCase()}</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={stamps[stat]}
                        onChange={(e) => setStamps(prev => ({ ...prev, [stat]: Number(e.target.value) }))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showTalents && (
            <div className="bg-gray-700 rounded p-4 mb-4 space-y-3">
              <h3 className="font-bold text-lg mb-2">Talents & Traits</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasGhost && (
                  <>
                    <div>
                      <label className="block text-sm mb-1">Rising Game Rank (0-5)</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={risingGame}
                        onChange={(e) => setRisingGame(Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">Bonus stats when HP is low</span>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Pain Tolerance HP</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={painTolerance}
                        onChange={(e) => setPainTolerance(Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">+10 HP per rank</span>
                    </div>
                  </>
                )}
                
                {hasFortitude && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fortitude}
                      onChange={(e) => setFortitude(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Fortitude (+10% HP)</span>
                  </div>
                )}
                
                {hasEndurance && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={endurance}
                      onChange={(e) => setEndurance(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Endurance (+15% HP)</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={giantGene}
                    onChange={(e) => setGiantGene(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Giant Gene (+10% HP, -10 Evade)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={warwalk}
                    onChange={(e) => setWarwalk(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Warwalk (+30 HP/FP)</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={luminaryElement}
                      onChange={(e) => setLuminaryElement(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Luminary Element
                      {luminaryElement && astrology && (
                        <span className="ml-2 text-blue-400">
                          ✓ WIL → {PLANET_ELEMENTS[astrology]} ATK (1:1)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 ml-6">
                    WIL no longer increases all elements; increases your Starsign's element by 1 per 1 raw WIL (ignores diminishing returns)
                  </div>
                </div>
                
                {/* Normalcy Talents */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={persistenceOfNormalcy}
                    onChange={(e) => setPersistenceOfNormalcy(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Persistence of Normalcy
                    {persistenceOfNormalcy && (
                      <span className="ml-2 text-green-400">
                        {(() => {
                          const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
                          const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
                          const isSame = mainClass === subClass;
                          
                          if (mainIsBase && subIsBase) {
                            return isSame ? "✓ +200 HP (Same Base Classes)" : "✓ +100 HP (Both Base Classes)";
                          }
                          return "✗ Requires both classes to be Base Classes";
                        })()}
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={powerOfNormalcy}
                    onChange={(e) => setPowerOfNormalcy(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Power of Normalcy
                    {powerOfNormalcy && (
                      <span className="ml-2 text-green-400">
                        {(() => {
                          const mainIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === mainClass && data.baseClass);
                          const subIsBase = Object.values(CLASS_HIERARCHY).some(data => data.name === subClass && data.baseClass);
                          const isSame = mainClass === subClass;
                          
                          if (mainIsBase && subIsBase) {
                            return isSame ? "✓ +8 All Stats (Same Base Classes)" : "✓ +4 All Stats (Both Base Classes)";
                          }
                          return "✗ Requires both classes to be Base Classes";
                        })()}
                      </span>
                    )}
                  </span>
                </div>
                
                {/* Kaelensia Instinct Toggles */}
                {(subrace === 'Felidae' || subrace === 'Grimalkin') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={felidaeInstinct}
                      onChange={(e) => setFelidaeInstinct(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Felidae/Grimalkin Instinct (SKI/CEL/LUC/GUI at ≤50% HP)
                      {felidaeInstinct && hpPercent <= 50 && (
                        <span className="ml-2 text-green-400">
                          ✓ Active {hpPercent <= 25 && '(x2)'}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {subrace === 'Lupine' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lupineInstinct}
                      onChange={(e) => setLupineInstinct(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Lupine Instinct (STR/WIL/DEF/RES at ≤50% HP)
                      {lupineInstinct && hpPercent <= 50 && (
                        <span className="ml-2 text-green-400">
                          ✓ Active {hpPercent <= 25 && '(x2)'}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {/* Sanguine Crest for Oni/Vampire */}
                {(subrace === 'Oni' || subrace === 'Vampire') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sanguineCrest}
                      onChange={(e) => setSanguineCrest(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Sanguine Crest (+2 STR/WIL/SKI/CEL/DEF)</span>
                  </div>
                )}
                
                {/* Redtail Fox God's Blessing */}
                {subrace === 'Redtail' && (
                  <div className="col-span-full border border-orange-500 rounded p-3 bg-orange-900 bg-opacity-20">
                    <h4 className="font-bold text-orange-400 mb-2">Fox God's Blessing</h4>
                    <p className="text-xs text-gray-300 mb-3">
                      Every round in battle, glowing spirits appear around the Redtail (1-6), becoming your Fortune Level. 
                      Dice color determines the effect. Bonuses scale with SAN (+1x per 10 Scaled SAN, max 5x).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Fortune Level (1-6)</label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={redtailFortuneLevel}
                          onChange={(e) => setRedtailFortuneLevel(Number(e.target.value))}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Dice Color</label>
                        <select
                          value={redtailDiceColor}
                          onChange={(e) => setRedtailDiceColor(e.target.value as 'red' | 'green' | 'yellow')}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                        >
                          <option value="red">Red Dice</option>
                          <option value="green">Green Dice</option>
                          <option value="yellow">Yellow Dice</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-300 space-y-1">
                      {redtailDiceColor === 'red' && (
                        <p>
                          <span className="text-red-400 font-semibold">Red Dice:</span> 
                          {redtailFortuneLevel === 1 
                            ? ` -${5 + Math.min(Math.floor(stats.san / 10), 5) * 5} Hit/Critical`
                            : ` +${redtailFortuneLevel * (1 + Math.min(Math.floor(stats.san / 10), 5))} Hit/Critical`
                          }
                        </p>
                      )}
                      {redtailDiceColor === 'green' && (
                        <p>
                          <span className="text-green-400 font-semibold">Green Dice:</span>
                          {redtailFortuneLevel === 1
                            ? ` -${5 + Math.min(Math.floor(stats.san / 10), 5) * 5}% Status Inflict/Resist chance`
                            : ` +${redtailFortuneLevel * (1 + Math.min(Math.floor(stats.san / 10), 5))}% Status Inflict/Resist chance`
                          }
                        </p>
                      )}
                      {redtailDiceColor === 'yellow' && (
                        <p>
                          <span className="text-yellow-400 font-semibold">Yellow Dice:</span>
                          {redtailFortuneLevel === 1
                            ? ` -${5 + Math.min(Math.floor(stats.san / 10), 5) * 5} Evade/Critical Evade`
                            : ` +${redtailFortuneLevel * (1 + Math.min(Math.floor(stats.san / 10), 5))} Evade/Critical Evade`
                          }
                        </p>
                      )}
                      <p className="text-gray-400 italic">
                        Current SAN Multiplier: {1 + Math.min(Math.floor(stats.san / 10), 5)}x
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {showAdvanced && (
            <div className="bg-gray-700 rounded p-4 mb-4 space-y-4">
              <h3 className="font-bold text-lg mb-2">Advanced Options</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm mb-1">Character Level (1-60)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={characterLevel}
                    onChange={(e) => {
                      const level = Math.min(60, Math.max(1, Number(e.target.value)));
                      setCharacterLevel(level);
                    }}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Available Points: {characterLevel * 4}
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Custom HP</label>
                  <input
                    type="number"
                    value={customHP}
                    onChange={(e) => setCustomHP(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Custom FP</label>
                  <input
                    type="number"
                    value={customFP}
                    onChange={(e) => setCustomFP(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Base Evade</label>
                  <input
                    type="number"
                    value={baseEvade}
                    onChange={(e) => setBaseEvade(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Bonus Evade</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={bonusEvade}
                    onChange={(e) => setBonusEvade(Math.min(Number(e.target.value), 50))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Capped at 50
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Dragon King Pieces</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={dragonKing}
                    onChange={(e) => setDragonKing(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Dragon Queen Pieces</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={dragonQueen}
                    onChange={(e) => setDragonQueen(Number(e.target.value))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Current HP %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hpPercent}
                    onChange={(e) => setHpPercent(Number(e.target.value))}
                    className="w-20 bg-gray-600 border border-gray-500 rounded px-2 py-1"
                  />
                </div>
                <button
                  onClick={() => setShowCustomStats(!showCustomStats)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm"
                >
                  Custom Stats
                </button>
              </div>

              {showCustomStats && (
                <div>
                  <h4 className="font-semibold mb-2">Custom Stat Modifiers (Flat Bonuses)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {(Object.keys(customStats) as StatKey[]).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs mb-1 uppercase">{stat}</label>
                        <input
                          type="number"
                          value={customStats[stat]}
                          onChange={(e) => setCustomStats(prev => ({ ...prev, [stat]: Number(e.target.value) }))}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <h4 className="font-semibold mb-2 mt-3">Custom Base Stats (Pre-Class)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {(Object.keys(customBaseStats) as StatKey[]).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs mb-1 uppercase">{stat}</label>
                        <input
                          type="number"
                          value={customBaseStats[stat]}
                          onChange={(e) => handleCustomBaseStatChange(stat, Number(e.target.value))}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Legend Extend (+1 before DR)</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {Object.keys(LEGEND_EXTEND).map(key => (
                    <button
                      key={key}
                      onClick={() => handleLegendExtendToggle(key)}
                      className={`px-3 py-2 rounded text-sm ${
                        legendExtend[key] 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      style={{ borderLeft: `4px solid ${LEGEND_EXTEND[key].color}` }}
                    >
                      {LEGEND_EXTEND[key].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Astrology (Planet Signs) - +1 Stat, +3 Element ATK</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700">
                    <input
                      type="radio"
                      name="astrology"
                      checked={astrology === ''}
                      onChange={() => setAstrology('')}
                      className="w-4 h-4"
                    />
                    <span>None</span>
                  </label>
                  {Object.keys(ASTROLOGY_PLANETS).map(planet => {
                    const element = PLANET_ELEMENTS[planet];
                    const stat = ASTROLOGY_PLANETS[planet].toUpperCase();
                    return (
                      <label key={planet} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700">
                        <input
                          type="radio"
                          name="astrology"
                          checked={astrology === planet}
                          onChange={() => setAstrology(planet)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{planet} ({stat} / {element})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Import/Export Section */}
          {showImportExport && (
            <div className="space-y-4 p-4 bg-gray-800 rounded border border-gray-600">
              <h3 className="text-lg font-semibold text-white">Build Import/Export</h3>
              
              {/* Export Section */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Export Build</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    placeholder="Build name (optional)"
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportBuild(buildName)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download JSON
                    </button>
                    <button
                      onClick={() => copyBuildToClipboard(buildName)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Import Build</h4>
                <div className="space-y-2">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste build JSON here..."
                    rows={4}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 font-mono text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => importBuild(importText)}
                      disabled={!importText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Import from Text
                    </button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            importBuild(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2 cursor-pointer"
                    >
                      <Upload size={16} />
                      Import from File
                    </label>
                  </div>
                </div>
              </div>

              {/* Template Builds Section */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Template Builds</h4>
                <p className="text-sm text-gray-400">Load basic builds for simple templates!</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(TEMPLATE_BUILDS).map(([key, template]) => (
                    <div key={key} className="bg-gray-700 border border-gray-600 rounded p-3" title={template.reasoning}>
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-white text-sm">{template.name}</h5>
                        <button
                          onClick={() => loadTemplate(key)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Load
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">{template.description}</p>
                      <div className="text-xs text-gray-400">
                        <div className="mb-1">
                          <span className="font-medium">Race:</span> {template.race} {template.subrace}
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">Classes:</span> {template.mainClass} Monotype
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">History:</span> {template.history || 'None'}
                        </div>
                        <div className="text-xs text-blue-300 mt-1">
                          Key Stats: {Object.entries(template.stats)
                            .filter(([, value]) => value > 0) 
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([stat, value]) => `${stat.toUpperCase()}: ${value}`)
                            .join(', ')}
                        </div>
                        <div className="text-xs text-yellow-400 mt-1 italic">
                          💡 Hover for stat reasoning
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raw vs True Stats Toggle */}
          <div className="flex justify-center mb-4">
            <div className="bg-gray-700 rounded-lg p-1 flex">
              <button
                onClick={() => setShowRawStats(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showRawStats 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                True Stats (DR Applied)
              </button>
              <button
                onClick={() => setShowRawStats(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showRawStats 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Raw Stats (No DR)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <StatRow label="Strength" statKey="str" />
              <StatRow label="Will" statKey="wil" />
              <StatRow label="Skill" statKey="ski" />
              <StatRow label="Celerity" statKey="cel" />
              <StatRow label="Defense" statKey="def" />
              <StatRow label="Resistance" statKey="res" />
            </div>
            
            <div className="space-y-1">
              <StatRow label="Vitality" statKey="vit" />
              <StatRow label="Faith" statKey="fai" />
              <StatRow label="Luck" statKey="luc" />
              <StatRow label="Guile" statKey="gui" />
              <StatRow label="Sanctity" statKey="san" />
              <StatRow label="Aptitude" statKey="apt" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">HP</div>
              <div className="text-2xl font-bold text-red-400">
                {calculateHP()} <span className="text-base text-gray-400">/ {calculateMaxHP()}</span>
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">FP</div>
              <div className="text-2xl font-bold text-blue-400">{calculateMP()}</div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Phys. Def</div>
              <div className="text-2xl font-bold text-purple-400">{Math.floor(stats.def * 0.9)}%</div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Mag. Def</div>
              <div className="text-2xl font-bold text-pink-400">{Math.floor(stats.res * 0.9)}%</div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Evade</div>
              <div className="text-xl font-bold text-yellow-400">
                {Math.floor(stats.cel * 2) + baseEvade + Math.min(bonusEvade, 50) - (giantGene ? 10 : 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Crit Evade</div>
              <div className="text-xl font-bold text-cyan-400">
                {Math.floor(stats.fai + stats.luc)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Status Inflict</div>
              <div className="text-xl font-bold text-green-400">
                {Math.floor(stats.ski * 2 + stats.wil)}%
              </div>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm text-gray-400">Status Resist</div>
              <div className="text-xl font-bold text-indigo-400">
                {Math.floor(stats.san * 2 + stats.fai)}%
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="font-bold text-lg mb-4">Elemental ATK & RES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {elements.map(elem => (
                <div key={elem} className="bg-gray-700 rounded p-3">
                  <div 
                    className="text-sm font-semibold mb-2" 
                    style={{ color: ELEMENT_COLORS[elem] }}
                  >
                    {elem}
                  </div>
                  
                  {/* ATK Row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 text-sm">ATK:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustElementalATK(elem as ElementKey, -1)}
                        className="w-5 h-5 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center justify-center"
                        title={`Decrease ${elem} ATK`}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-red-400 text-sm font-bold min-w-[2rem] text-center">
                        {calculateElementalATK(elem)}
                      </span>
                      <button
                        onClick={() => adjustElementalATK(elem as ElementKey, 1)}
                        className="w-5 h-5 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center justify-center"
                        title={`Increase ${elem} ATK`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  
                  {/* RES Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 text-sm">RES:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustElementalRES(elem as ElementKey, -1)}
                        className="w-5 h-5 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center justify-center"
                        title={`Decrease ${elem} RES`}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-blue-400 text-sm font-bold min-w-[2rem] text-center">
                        {calculateElementalRES(elem)}%
                      </span>
                      <button
                        onClick={() => adjustElementalRES(elem as ElementKey, 1)}
                        className="w-5 h-5 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center justify-center"
                        title={`Increase ${elem} RES`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Show manual adjustments and race resistances if any */}
                  {(elementalATKAdjustments[elem as ElementKey] !== 0 || 
                    elementalRESAdjustments[elem as ElementKey] !== 0 || 
                    getRaceResistances()[elem as ElementKey] !== 0 ||
                    (subrace === 'Umbral' && elem === 'Dark') ||
                    (subrace === 'Theno' && elem === 'Sound')) && (
                    <div className="mt-1 text-xs text-gray-400">
                      {elementalATKAdjustments[elem as ElementKey] !== 0 && (
                        <div>Manual ATK: {elementalATKAdjustments[elem as ElementKey] > 0 ? '+' : ''}{elementalATKAdjustments[elem as ElementKey]}</div>
                      )}
                      {elementalRESAdjustments[elem as ElementKey] !== 0 && (
                        <div>Manual RES: {elementalRESAdjustments[elem as ElementKey] > 0 ? '+' : ''}{elementalRESAdjustments[elem as ElementKey]}</div>
                      )}
                      {getRaceResistances()[elem as ElementKey] !== 0 && (
                        <div className={`${getRaceResistances()[elem as ElementKey] > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          Race RES: {getRaceResistances()[elem as ElementKey] > 0 ? '+' : ''}{getRaceResistances()[elem as ElementKey]}%
                          {(subrace === 'Umbral' || subrace === 'Papilion') && 
                           (elem === 'Dark' || elem === 'Light' || elem === 'Wind' || elem === 'Earth') && 
                           <span className="text-gray-500"> (scales with SAN)</span>
                          }
                        </div>
                      )}
                      {subrace === 'Umbral' && elem === 'Dark' && (
                        <div className="text-purple-400">
                          Race ATK: +{Math.min(15, Math.floor(characterLevel / 2))} (level/2, max 15)
                        </div>
                      )}
                      {subrace === 'Theno' && elem === 'Sound' && (
                        <div className="text-blue-400">
                          Race ATK: Base = Level {characterLevel} (ignores stat scaling)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Poison Resistance Box (separate from Acid) */}
              {(subrace === 'Wyverntouched' || subrace === 'Naga') && (
                <div className="bg-green-900 rounded p-3 border-2 border-green-600">
                  <div className="text-sm font-semibold mb-2 text-green-300">Poison</div>
                  
                  {/* No ATK for Poison */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">ATK:</span>
                    <span className="text-gray-500 text-sm">—</span>
                  </div>
                  
                  {/* Poison RES Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-green-300 text-sm">RES:</span>
                    <span className="text-green-300 text-sm font-bold">
                      {subrace === 'Wyverntouched' ? stats.san * 2 : stats.san}%
                    </span>
                  </div>
                  
                  <div className="mt-1 text-xs text-green-400">
                    <div>
                      Race RES: {subrace === 'Wyverntouched' ? 'SAN × 2' : 'SAN × 1'} = {subrace === 'Wyverntouched' ? stats.san * 2 : stats.san}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Initiative</div>
              <div className="text-lg font-bold">
                {(SUBRACES[subrace]?.cel || 0) + addedStats.cel + customBaseStats.cel + (astroBonus.cel || 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Youkai Cap</div>
              <div className="text-lg font-bold text-purple-400">{youkaiCap}</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Flanking</div>
              <div className="text-lg font-bold">
                {Math.floor(5 + stats.gui / 2)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Skill Pool</div>
              <div className="text-lg font-bold">
                {11 + Math.floor(stats.gui / 5) + Math.floor(stats.ski / 5) + Math.floor(stats.wil / 10) + ((RACES[race]?.human || SUBRACES[subrace]?.human) ? 2 : 0)}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Battle Weight</div>
              <div className="text-lg font-bold">
                0/{Math.floor(stats.str) + 5}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Encumbrance</div>
              <div className="text-lg font-bold">
                0/{Math.floor(stats.str + stats.vit) + 5 + (subrace === 'Dullahan' ? 30 : 0) + (subrace.includes('Mechanation') ? 20 : 0)}
              </div>
            </div>
          </div>
            </>
          )}

          {/* Weapon Calculator Tab */}
          {activeTab === 'weapon' && (
            <WeaponCalculator stats={stats} />
          )}

          {/* Stat Optimizer Tab */}
          {activeTab === 'optimizer' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-900 to-blue-900 bg-opacity-30 border border-green-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-green-400">Stat Optimizer</h2>
                <p className="text-gray-300 mb-4">
                  Get optimized stat distributions for your dual class combination and build strategy. 
                  The optimizer considers class synergies, weapon scaling, APT efficiency, and build-specific thresholds.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Build Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-300">Build Type</label>
                    <select
                      value={selectedBuildType}
                      onChange={(e) => setSelectedBuildType(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      {Object.entries(BUILD_TYPES).map(([key, buildType]) => (
                        <option key={key} value={key}>{buildType.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {BUILD_TYPES[selectedBuildType]?.description}
                    </p>
                  </div>

                  {/* Target Level */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-300">Target Level</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={optimizerTargetLevel}
                      onChange={(e) => setOptimizerTargetLevel(Math.min(60, Math.max(1, parseInt(e.target.value) || 60)))}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Available stat points: {optimizerTargetLevel * 4}
                    </p>
                  </div>

                  {/* Optimization Mode */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-blue-300">Optimization Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="optimizationMode"
                          value="weights"
                          checked={optimizationMode === 'weights'}
                          onChange={(e) => setOptimizationMode(e.target.value as 'weights' | 'targets')}
                          className="mr-2"
                        />
                        <span className="text-sm">Weight-based (sliders)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="optimizationMode"
                          value="targets"
                          checked={optimizationMode === 'targets'}
                          onChange={(e) => setOptimizationMode(e.target.value as 'weights' | 'targets')}
                          className="mr-2"
                        />
                        <span className="text-sm">Target-based (goals)</span>
                      </label>
                    </div>
                  </div>

                  {optimizationMode === 'targets' && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-1 text-blue-300">Target Stats</h4>
                      <p className="text-xs text-gray-400 mb-3">
                        All targets are <strong>scaled values</strong> (after racial bonuses). APT: 36/42 are common scaled targets.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">STR Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.str}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, str: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">WIL Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.wil}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, wil: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">SKI Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.ski}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, ski: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">CEL Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.cel}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, cel: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">DEF Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.def}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, def: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">RES Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.res}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, res: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">VIT Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.vit}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, vit: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">LUC Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.luc}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, luc: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">FAI Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.fai}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, fai: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">GUI Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.gui}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, gui: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">SAN Target</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.san}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, san: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">APT Target (Scaled)</label>
                          <div className="flex gap-1 mb-1">
                            <button
                              onClick={() => setTargetStats(prev => ({ ...prev, apt: 36 }))}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            >
                              36
                            </button>
                            <button
                              onClick={() => setTargetStats(prev => ({ ...prev, apt: 42 }))}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            >
                              42
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={targetStats.apt}
                            onChange={(e) => setTargetStats(prev => ({ ...prev, apt: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Total target points: {Object.values(targetStats).reduce((sum, val) => sum + val, 0)} / {optimizerTargetLevel * 4}
                      </p>
                    </div>
                  )}

                  {/* Weapon Type Priority */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-300">Weapon Priority</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={optimizeWeaponScaling}
                        onChange={(e) => setOptimizeWeaponScaling(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Optimize for weapon scaling</span>
                    </div>
                    {optimizeWeaponScaling && (
                      <select
                        value={selectedWeaponType}
                        onChange={(e) => setSelectedWeaponType(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="">Auto-detect from classes</option>
                        <option value="Swords">Swords (STR/SKI)</option>
                        <option value="Axes">Axes (STR)</option>
                        <option value="Spears">Spears (STR/SKI)</option>
                        <option value="Bows">Bows (STR/SKI)</option>
                        <option value="Guns">Guns (GUI/SKI)</option>
                        <option value="Daggers">Daggers (GUI/SKI)</option>
                        <option value="Tomes">Tomes (WIL/SKI)</option>
                        <option value="Fist">Fist (STR/SKI)</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Custom Weights Section */}
                {optimizationMode === 'weights' && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Custom Build Preferences</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCustomWeights(getBuildTypeWeights(selectedBuildType))}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        title="Reset sliders to match current build type"
                      >
                        Reset to {BUILD_TYPES[selectedBuildType]?.name} Defaults
                      </button>
                      <button
                        onClick={() => setShowCustomWeights(!showCustomWeights)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        {showCustomWeights ? 'Hide' : 'Show'} Advanced Options
                      </button>
                    </div>
                  </div>
                  
                  {showCustomWeights && (
                    <div className="space-y-4">
                      <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded p-3">
                        <p className="text-blue-300 text-sm mb-2">
                          <strong>Auto-Adjustment:</strong> Sliders automatically adjust when you change build types to match typical preferences for that build style.
                        </p>
                        <p className="text-gray-400 text-sm">
                          Adjust these sliders to influence stat priorities based on your specific build goals. 
                          Higher values increase the priority of related stats.
                        </p>
                      </div>
                      
                      {/* Summoner Preferences */}
                      {(mainClass === 'Summoner' || subClass === 'Summoner' || 
                        mainClass === 'Grand Summoner' || subClass === 'Grand Summoner' ||
                        mainClass === 'Shapeshifter' || subClass === 'Shapeshifter' ||
                        mainClass === 'Bonder' || subClass === 'Bonder') && (
                        <div className="bg-purple-900 bg-opacity-30 border border-purple-700 rounded p-3">
                          <h4 className="font-medium text-purple-300 mb-2">Summoner Preferences</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">
                                Youkai Count: {customWeights.youkaiCount}
                              </label>
                              <input
                                type="range"
                                min="5"
                                max="12"
                                value={customWeights.youkaiCount}
                                onChange={(e) => setCustomWeights({...customWeights, youkaiCount: parseInt(e.target.value)})}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-400">Youkai slots (5 base + Faith investment: 6=5pts, 7=10pts, 8=15pts, etc.)</span>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">
                                Summon Survivability: {customWeights.summonSurvivability}/10
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                value={customWeights.summonSurvivability}
                                onChange={(e) => setCustomWeights({...customWeights, summonSurvivability: parseInt(e.target.value)})}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-400">Focus on keeping summons alive</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Combat Preferences */}
                      <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-3">
                        <h4 className="font-medium text-red-300 mb-2">Combat Focus</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Critical Focus: {customWeights.criticalFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.criticalFocus}
                              onChange={(e) => setCustomWeights({...customWeights, criticalFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Magic Damage: {customWeights.magicDamageFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.magicDamageFocus}
                              onChange={(e) => setCustomWeights({...customWeights, magicDamageFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Physical Damage: {customWeights.physicalDamageFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.physicalDamageFocus}
                              onChange={(e) => setCustomWeights({...customWeights, physicalDamageFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Accuracy Focus: {customWeights.accuracyFocus}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.accuracyFocus}
                              onChange={(e) => setCustomWeights({...customWeights, accuracyFocus: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Defensive Preferences */}
                      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3">
                        <h4 className="font-medium text-blue-300 mb-2">Defensive Focus</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Minimum HP (Hard Constraint)
                            </label>
                            <input
                              type="number"
                              min="400"
                              max="1200"
                              step="50"
                              value={customWeights.minimumHP}
                              onChange={(e) => setCustomWeights({...customWeights, minimumHP: parseInt(e.target.value) || 700})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            />
                            <span className="text-xs text-gray-400">Required minimum HP for all builds</span>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              FP Priority: {customWeights.fpPriority}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.fpPriority}
                              onChange={(e) => setCustomWeights({...customWeights, fpPriority: parseInt(e.target.value)})}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-400">Target: 200+ FP for sustained combat</span>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Physical Defense: {customWeights.physicalDefense}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.physicalDefense}
                              onChange={(e) => setCustomWeights({...customWeights, physicalDefense: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Magical Defense: {customWeights.magicalDefense}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.magicalDefense}
                              onChange={(e) => setCustomWeights({...customWeights, magicalDefense: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Utility Preferences */}
                      <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded p-3">
                        <h4 className="font-medium text-green-300 mb-2">Utility & Special</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Initiative Priority: {customWeights.initiativePriority}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.initiativePriority}
                              onChange={(e) => setCustomWeights({...customWeights, initiativePriority: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Status Resistance: {customWeights.statusResistance}/10
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={customWeights.statusResistance}
                              onChange={(e) => setCustomWeights({...customWeights, statusResistance: parseInt(e.target.value)})}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              Target Evade
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              step="10"
                              value={customWeights.targetEvade || 0}
                              onChange={(e) => setCustomWeights({...customWeights, targetEvade: parseInt(e.target.value) || 0})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            />
                            <span className="text-xs text-gray-400">Target evade value (CEL×2 + base + bonus)</span>
                          </div>
                          {mainClass !== subClass && (
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">
                                Target APT (Hard Constraint)
                              </label>
                              <select
                                value={customWeights.targetAPT || 36}
                                onChange={(e) => setCustomWeights({...customWeights, targetAPT: parseInt(e.target.value) as 36 | 42})}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                              >
                                <option value={36}>36 APT (Standard)</option>
                                <option value={42}>42 APT (High Efficiency)</option>
                              </select>
                              <span className="text-xs text-gray-400">Target final APT for multiclass builds</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Current Class Configuration Display */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold mb-2">Current Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Race:</span> {subrace}
                    </div>
                    <div>
                      <span className="text-gray-400">Main Class:</span> {mainClass}
                    </div>
                    <div>
                      <span className="text-gray-400">Sub Class:</span> {subClass}
                    </div>
                    <div>
                      <span className="text-gray-400">History:</span> {history || 'None'}
                    </div>
                  </div>
                </div>

                {/* Optimize Button */}
                <div className="flex gap-4">
                  <button
                    onClick={runOptimization}
                    disabled={isOptimizing}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    {isOptimizing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Optimizing...
                      </>
                    ) : (
                      <>
                        🎯 Optimize Stats
                      </>
                    )}
                  </button>
                  
                  {optimizationResult && (
                    <button
                      onClick={applyOptimization}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                    >
                      📋 Apply to Calculator
                    </button>
                  )}
                </div>
              </div>

              {/* Optimization Results */}
              {optimizationResult && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-green-400">Optimization Results</h3>
                  
                  {/* Score and Summary */}
                  <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-green-900 bg-opacity-50 rounded-lg px-4 py-2">
                        <span className="text-green-300 font-semibold">Score: {Math.round(optimizationResult.score)}</span>
                      </div>
                      <div className="bg-blue-900 bg-opacity-50 rounded-lg px-4 py-2">
                        <span className="text-blue-300 font-semibold">Points Used: {optimizationResult.totalPoints}/240</span>
                      </div>
                    </div>
                  </div>

                  {/* Optimized Stats Display */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    {Object.entries(optimizationResult.allocatedStats).map(([stat, value]) => (
                      <div key={stat} className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">{stat}</div>
                        <div className="text-lg font-bold" style={{ color: STAT_COLORS[stat as StatKey] === 'rainbow' ? '#ffffff' : STAT_COLORS[stat as StatKey] }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reasoning */}
                  {optimizationResult.reasoning.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold mb-2 text-blue-400">💡 Optimization Reasoning</h4>
                      <ul className="space-y-1">
                        {optimizationResult.reasoning.map((reason, index) => (
                          <li key={index} className="text-gray-300 text-sm">• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {optimizationResult.warnings.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold mb-2 text-yellow-400">⚠️ Warnings</h4>
                      <ul className="space-y-1">
                        {optimizationResult.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-300 text-sm">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Build Type Compatibility */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-2 text-purple-400">🎭 Class Compatibility</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {BUILD_TYPES[selectedBuildType]?.classCompatibility && Object.entries(BUILD_TYPES[selectedBuildType].classCompatibility)
                        .filter(([className]) => className === mainClass || className === subClass)
                        .map(([className, compatibility]) => (
                          <div key={className} className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
                            <span className="text-sm">{className}</span>
                            <div className="flex">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full mr-1 ${
                                    i < compatibility ? 'bg-green-500' : 'bg-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stat Information Modal */}
        {showStatInfo && selectedStat && STAT_INFO[selectedStat] && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatInfo(false)}
          >
            <div 
              className="bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">{STAT_INFO[selectedStat].title}</h2>
                <button
                  onClick={() => setShowStatInfo(false)}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Base Stats vs Scaled Stats Info Box */}
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-4">
                  <h4 className="font-semibold text-blue-300 mb-2">Base vs Scaled Stats</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p><strong>Base Stat:</strong> Your race's starting stat + invested points + bonuses from History, Starsigns, and Legend Extends. Used for trait requirements.</p>
                    <p><strong>Scaled Stat:</strong> Base stats with diminishing returns applied after soft cap. Most effects use Scaled stats.</p>
                    <p><strong>Hard Cap:</strong> Race base + 80 invested points maximum (including Legend Extends and History bonuses).</p>
                    <p><strong>Soft Cap:</strong> Race base + 40 points. After this, every 3 points lose 8% effectiveness (min 10%).</p>
                  </div>
                </div>

                <div className="text-gray-300 whitespace-pre-line leading-relaxed">
                  {STAT_INFO[selectedStat].description}
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-xl font-semibold mb-3 text-green-400">Effects</h3>
                  <ul className="space-y-2">
                    {STAT_INFO[selectedStat].effects.map((effect, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                        <span className="text-gray-300">{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {STAT_INFO[selectedStat].notes && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded p-4">
                      <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Important Note</h4>
                      <p className="text-sm text-gray-300">{STAT_INFO[selectedStat].notes}</p>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-700 pt-4">
                  <div className="bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-400 mb-2">Your Current Values:</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Raw Stat:</div>
                        <div className="text-2xl font-bold text-orange-400">
                          {Math.floor(rawStats[selectedStat as StatKey])}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Scaled Stat:</div>
                        <div className="text-2xl font-bold text-blue-400">
                          {Math.floor(stats[selectedStat as StatKey])}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
