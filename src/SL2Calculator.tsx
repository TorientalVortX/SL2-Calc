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

const CLASSES: Record<string, Omit<Stats, 'human' | 'homunculi'>> = {
  'Soldier': { str: 2, wil: 0, ski: 1, cel: 0, def: 0, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Duelist': { str: 1, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Mage': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Evoker': { str: 0, wil: 3, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Priest': { str: 0, wil: 2, ski: 0, cel: 1, def: 0, res: 2, vit: 0, fai: 3, luc: 0, gui: 0, san: 0, apt: 0 },
  'Monk': { str: 1, wil: 0, ski: 2, cel: 2, def: 2, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Ghost': { str: 0, wil: 0, ski: 0, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Bonder': { str: 2, wil: 2, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Kensei': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Arbalest': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 1, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Hexer': { str: 0, wil: 1, ski: 1, cel: 0, def: 3, res: 3, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Black Knight': { str: 2, wil: 0, ski: 1, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Tactician': { str: 1, wil: 1, ski: 2, cel: 2, def: 1, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Demon Hunter': { str: 2, wil: 0, ski: 2, cel: 2, def: 2, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Curate': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Engineer': { str: 2, wil: 0, ski: 1, cel: 2, def: 1, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Bard': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 2, apt: 0 },
  'Performer': { str: 0, wil: 0, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 3, apt: 0 },
  'Dancer': { str: 1, wil: 2, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Dark Bard': { str: 2, wil: 0, ski: 0, cel: 0, def: 0, res: 2, vit: 1, fai: 0, luc: 0, gui: 0, san: 3, apt: 0 },
  'Verglas': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Summoner': { str: 0, wil: 2, ski: 0, cel: 2, def: 0, res: 1, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Grand Summoner': { str: 0, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0 },
  'Boxer': { str: 2, wil: 0, ski: 2, cel: 0, def: 2, res: 0, vit: 2, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Rogue': { str: 0, wil: 0, ski: 1, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Archer': { str: 0, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Martial Artist': { str: 2, wil: 0, ski: 2, cel: 1, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Firebird': { str: 2, wil: 0, ski: 2, cel: 3, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Aquamancer': { str: 0, wil: 1, ski: 0, cel: 2, def: 0, res: 0, vit: 3, fai: 2, luc: 0, gui: 0, san: 0, apt: 0 },
  'Druid': { str: 0, wil: 0, ski: 0, cel: 2, def: 2, res: 0, vit: 0, fai: 2, luc: 2, gui: 0, san: 0, apt: 0 },
  'Shapeshifter': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 2, gui: 0, san: 0, apt: 0 },
  'Lantern Bearer': { str: 0, wil: 2, ski: 0, cel: 2, def: 1, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Spellthief': { str: 2, wil: 2, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 0, apt: 0 },
  'Magic Gunner': { str: 0, wil: 2, ski: 3, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 },
  'Ranger': { str: 2, wil: 0, ski: 2, cel: 2, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 0, san: 2, apt: 0 },
  'Ruler': { str: 0, wil: 2, ski: 0, cel: 0, def: 0, res: 2, vit: 0, fai: 0, luc: 2, gui: 0, san: 2, apt: 0 },
  'Rune Magician': { str: 0, wil: 3, ski: 2, cel: 0, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 3, san: 0, apt: 0 },
  'Shinobi': { str: 2, wil: 0, ski: 0, cel: 4, def: 0, res: 0, vit: 0, fai: 0, luc: 0, gui: 2, san: 0, apt: 0 },
  'Solblader': { str: 2, wil: 2, ski: 0, cel: 2, def: 0, res: 0, vit: 0, fai: 2, luc: 0, gui: 0, san: 0, apt: 0 },
  'Void Assassin': { str: 0, wil: 0, ski: 3, cel: 2, def: 0, res: 2, vit: 0, fai: 0, luc: 1, gui: 0, san: 0, apt: 0 }
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
  'Dancer': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
  'Dark Bard': { maxRank: 9, stats: { san: 1 }, description: '+SAN, +STR/SAN at rank 7+' },
  'Engineer': { maxRank: 6, stats: { gui: 1 }, description: '+GUI per rank' },
  'Evoker': { maxRank: 6, stats: { wil: 1 }, description: '+WIL per rank' },
  'Ghost': { maxRank: 5, stats: { res: 1 }, description: '+RES per rank' },
  'Hexer': { maxRank: 3, stats: { def: 1, res: 1 }, description: '+DEF/RES per rank' },
  'Kensei': { maxRank: 3, stats: { str: 1, ski: 1 }, description: '+STR/SKI per rank' },
  'Lantern Bearer': { maxRank: 6, stats: { res: 1 }, description: '+RES per rank' },
  'Magic Gunner': { maxRank: 3, stats: { cel: 1, res: 1 }, description: '+CEL/RES per rank' },
  'Monk': { maxRank: 3, stats: { ski: 1, cel: 1 }, description: '+SKI/CEL per rank' },
  'Performer': { maxRank: 6, stats: { san: 1 }, description: '+SAN per rank' },
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
    history: 'Assassin',
    reasoning: 'CEL for evasion, LUC for critical chance, GUI for critical damage, SKI for accuracy. Assassin history provides +2 SKI, +1 LUC as invested points.'
  }
};

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
  const [activeTab, setActiveTab] = useState<'stats' | 'weapon' >('stats');

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
      mainClassPassive,
      subClassPassive,
      elementalATKAdjustments,
      elementalRESAdjustments,
      version: "0.2.0"
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
      mainClassPassive,
      subClassPassive,
      elementalATKAdjustments,
      elementalRESAdjustments,
      version: "0.2.0"
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

  // Get class passive bonuses
  const getClassPassiveBonus = (className: string, rank: number): Partial<StatRecord> => {
    const passive = CLASS_PASSIVES[className];
    if (!passive || rank === 0) return {};
    
    const bonuses: Partial<StatRecord> = {};
    Object.entries(passive.stats).forEach(([stat, value]) => {
      bonuses[stat as StatKey] = (value || 0) * rank;
    });
    
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

  const aptitudeBonus = Math.max(0, getAptitudeBonus());
  const leBonus = getLEBonus();
  const astroBonus = getAstrologyBonus();
  const foodBonus = FOODS[food];
  const historyBonus = HISTORY[history];
  const sanguineBonus = (sanguineCrest && (subrace === 'Oni' || subrace === 'Vampire')) ? 2 : 0;
  const risingGameBonus = calculateRisingGame();
  const mainPassiveBonus = getClassPassiveBonus(mainClass, mainClassPassive);
  const subPassiveBonus = getClassPassiveBonus(subClass, subClassPassive);

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
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      + (foodBonus[statName as keyof FoodBonus] || 0) 
      + (historyBonus[statName as keyof HistoryBonus] || 0)
      + stampValue 
      + sanguineBonusForStat
      + (risingGameBonus[statName] || 0)
      + (mainPassiveBonus[statName] || 0)
      + (subPassiveBonus[statName] || 0)
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
    
    const addedValue = addedStats[statName] 
      + (astroBonus[statName] || 0) 
      + (foodBonus[statName as keyof FoodBonus] || 0) 
      + (historyBonus[statName as keyof HistoryBonus] || 0)
      + stampValue 
      + sanguineBonusForStat
      + (risingGameBonus[statName] || 0)
      + (mainPassiveBonus[statName] || 0)
      + (subPassiveBonus[statName] || 0)
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
        + (mainPassiveBonus[statName] || 0)
        + (subPassiveBonus[statName] || 0);
      
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
    
    // Calculate hard cap: race base + custom base + manual points + LE bonus + history bonus ≤ 80
    // Class stats do NOT count toward the hard cap
    const subraceData = SUBRACES[subrace];
    const raceBase = subraceData?.[statKey] || 0;
    const customBase = customBaseStats[statKey];
    const legendExtendBonus = leBonus[statKey] || 0;
    const currentHistoryBonus = (historyBonus as any)[statKey] || 0;
    
    const totalBase = raceBase + customBase;
    const maxAllowedManualPoints = 80 - totalBase - legendExtendBonus - currentHistoryBonus;
    
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
    const totalInvested = pointsAdded + legendExtendBonus + historyInvested; // Include LE and History in invested display
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

  const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">SL2 Calculator Suite</h1>
            <div className="text-sm text-gray-400">Version 0.2.0a</div>
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
          </div>

          {/* Stat Calculator Tab */}
          {activeTab === 'stats' && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            
            <div>
              <label className="block text-sm font-medium mb-2">Main Class</label>
              <select
                value={mainClass}
                onChange={(e) => {
                  setMainClass(e.target.value);
                  setMainClassPassive(0);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(CLASSES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Sub Class</label>
              <select
                value={subClass}
                onChange={(e) => {
                  setSubClass(e.target.value);
                  setSubClassPassive(0);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {Object.keys(CLASSES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Passive Rank selectors */}
          {(CLASS_PASSIVES[mainClass] || CLASS_PASSIVES[subClass]) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {CLASS_PASSIVES[mainClass] && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {mainClass} Passive Rank ({CLASS_PASSIVES[mainClass].description})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={mainClass === subClass ? 0 : CLASS_PASSIVES[mainClass].maxRank}
                    value={mainClassPassive}
                    onChange={(e) => setMainClassPassive(Number(e.target.value))}
                    disabled={mainClass === subClass}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              )}
              {CLASS_PASSIVES[subClass] && mainClass !== subClass && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {subClass} Passive Rank ({CLASS_PASSIVES[subClass].description})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={CLASS_PASSIVES[subClass].maxRank}
                    value={subClassPassive}
                    onChange={(e) => setSubClassPassive(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              )}
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
