import type { BuildState, SpellthiefState } from '../types';
import { classPairLegal, mergeSkillRanks, skillById } from './skills';

/** Class spells indexed from spell Domain entries in skills-text.json, plus
 * Fulgur of Flight, explicitly described there as a Druid spell. This includes
 * spells with weapon, resource and class requirements: being a card does not
 * waive those requirements. Never search descriptions for the word "spell" to
 * grant access: passives and theft actions also mention spells.
 * Youkai Evokes have a separate catalog and are never admitted here. */
export const COPY_SPELL_IDS = [
  'acid-rain', 'aero-of-disaster', 'aero-of-kindness', 'agile-androcobra', 'air-pressure',
  'akihono-tobitoro', 'altera', 'arashi-sanseiken', 'astral-belt', 'asura-fist',
  'black-bolt', 'black-bubble', 'black-static', 'blink', 'brighten', 'brine-blade',
  'call-storm', 'cherry-blossom', 'cold-splash', 'confusion',
  'cool-burns', 'create-shade', 'crest-surge', 'dancing-water', 'dark-eye', 'dead-sea',
  'death-knighting', 'deos-danzai', 'detogate', 'distortion', 'divine-judgement',
  'divine-shower', 'domino-resonate', 'drowning-chant', 'earthbound-fog',
  'earthbound-vengeance', 'enma-s-summons', 'ensui-veil', 'eternal-darkness',
  'exgalfa', 'explosion', 'famiuga', 'fenrir', 'fir', 'fire-fairy', 'fire-whip',
  'fleeing-spectres', 'focused-beam', 'forest-fiend', 'fortune-wind', 'frigid-arrow',
  'frigid-formation', 'fulgur-of-duplicity', 'fulgur-of-flight', 'galren',
  'gentle-torrent', 'geo-of-crumbling', 'geo-of-drought', 'ghost-arrow', 'golem',
  'graft', 'holy-arrow', 'holy-spark', 'ice-fairy', 'intensify-cold', 'invigoration',
  'invisible-weapon', 'isendo', 'isenshi', 'jet-stream', 'judgement-blade',
  'kaicho-kaisu', 'kan-saiganki', 'kel', 'kiomite-moriomizu', 'kokuhaku-kagedan',
  'kraken', 'libegrande', 'lift-off', 'luminous-arc', 'lux-relido', 'magaisendo',
  'malmelo', 'mercalan-mist', 'miu', 'needle', 'nerhaven', 'overload', 'phoenix',
  'photon-ring', 'pinpoint-electro', 'pressure-fletch', 'purify-poison',
  'purifying-aquae', 'quetal', 'quickness', 'radiant-solace', 'radiant-surrender',
  'rebia', 'rectifer', 'redgull', 'refreshing-flow', 'relent-gale', 'rescue',
  'ring-of-pearls', 'rye', 'ryemei', 'ryumai-suikan', 'sacred-prism', 'salamander',
  'sanctuary', 'scarlet-twister', 'sea-stride', 'sear', 'second-chance',
  'sensui-shippu', 'shine-knights', 'shine-ray', 'smoke-screen', 'sonic-arrow',
  'spirit-pain', 'splash', 'static-air', 'steam-sear', 'stone-dragon', 'strong-legs',
  'swap-position', 'talvyd', 'thunder-bolt', 'titan-gale', 'typhur', 'underworld-flame',
  'vyd', 'vydel', 'water-dragon', 'water-pillar', 'water-to-wine', 'water-wall',
  'white-prison', 'wild-waterfall', 'wind-runner', 'wind-slasher', 'wretched-oil',
] as const;
const allowed = new Set<string>(COPY_SPELL_IDS);
export const COPY_SPELLS = COPY_SPELL_IDS.flatMap(id => {
  const skill = skillById(id);
  return skill ? [skill] : [];
}).sort((a, b) => a.name.localeCompare(b.name));

export const hasSpellthief = (build: Pick<BuildState, 'mainClass' | 'subClass'>) =>
  build.mainClass === 'Spellthief' || build.subClass === 'Spellthief';

export function copySpellCapacity(build: BuildState): number {
  if (!hasSpellthief(build) || !classPairLegal(build.mainClass, build.subClass, build.destiny)) return 0;
  const raw = mergeSkillRanks(build.skillRanks)['spell-snatch'] ?? 0;
  const rank = Number.isFinite(raw) ? Math.max(0, Math.min(5, Math.floor(raw))) : 0;
  return rank ? 1 + rank : 0;
}

export function normalizeSpellthiefState(value: unknown, build: BuildState): SpellthiefState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const ids = (list: unknown): string[] => Array.isArray(list)
    ? [...new Set(list.filter((id): id is string => typeof id === 'string' && allowed.has(id)))] : [];
  const equipped = ids(source.equipped);
  // Unprepared copies become reserve cards; edits never silently destroy the collection.
  const cards = [...new Set([...ids(source.cards), ...equipped])];
  const cap = copySpellCapacity(build);
  return { cards, equipped: cap ? equipped.slice(-cap) : [] };
}

export function settleSpellthief(build: BuildState): BuildState {
  return { ...build, spellthief: normalizeSpellthiefState(build.spellthief, build) };
}

export type CopySpellAction = 'steal' | 'store' | 'prepare' | 'unprepare' | 'forget';
export function changeCopySpell(build: BuildState, id: string, action: CopySpellAction): BuildState {
  if (!allowed.has(id)) return build; // Includes forged imports/actions for Youkai Evokes.
  const state = normalizeSpellthiefState(build.spellthief, build);
  const cap = copySpellCapacity(build);
  if (action === 'steal' && !cap) return build;
  if (action === 'prepare' && (!cap || !state.cards.includes(id))) return build;
  if (action === 'unprepare' && !state.equipped.includes(id)) return build;
  if (action === 'forget') return { ...build, spellthief: {
    cards: state.cards.filter(card => card !== id), equipped: state.equipped.filter(card => card !== id),
  } };
  const cards = [...new Set([...state.cards, id])];
  let equipped = state.equipped;
  if (action === 'unprepare') equipped = equipped.filter(card => card !== id);
  if ((action === 'steal' || action === 'prepare') && !equipped.includes(id)) equipped = [...equipped, id].slice(-cap);
  return { ...build, spellthief: { cards, equipped } };
}

/** User-confirmed calculator rule: all spell cards use the spell's normal
 * maximum rank, independent of learned ranks, class pairing or Destiny.
 * This changes neither the Spell Snatch capacity nor casting restrictions. */
export function copySpellRank(_build: BuildState, id: string): number {
  const skill = allowed.has(id) ? skillById(id) : undefined;
  return skill?.maxRank ?? 0;
}

export function copyCooldownLabel(cooldown: string | null | undefined): string {
  if (!cooldown || /^[-—–]$/.test(cooldown.trim())) return '3 rounds';
  const numeric = cooldown.match(/^\s*(\d+)\s*(?:rounds?)?\s*$/i);
  return numeric ? `${Math.max(3, Number(numeric[1]))} rounds` : `${cooldown}; at least 3 rounds`;
}
