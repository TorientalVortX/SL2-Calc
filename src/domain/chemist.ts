import mixtureData from '../data/content/mixtures.json';
import type { BuildEvaluation, BuildState, ElementKey, StatKey } from '../types';
import { skillPointBudget } from './skills';

export const MIXTURES = mixtureData.mixtures;
export const MAX_MIXTURE_FLASKS = 5;
export const MUTAGEN_SOURCE = 'https://sl2.miraheze.org/wiki/Mutagen';

const mixtureDamageStats = { Cocktail: 'gui', Balm: 'def', Medicine: 'fai', Mutagen: 'apt' } as const;

export function mixtureDamageBreakdown(
  mixture: (typeof MIXTURES)[number],
  build: Pick<BuildState, 'mainClass' | 'subClass' | 'destiny'>,
  evaluation: Pick<BuildEvaluation, 'scaledStats' | 'elementalAttack'>,
) {
  if (build.mainClass !== 'Chemist' && build.subClass !== 'Chemist') return null;
  if (mixture.baseDamage === null || mixture.elementRatio === null) return null;
  const element = mixture.element === 'Darkness' ? 'Dark' : mixture.element;
  if (!element || !(element in evaluation.elementalAttack)) return null;
  const stat = mixtureDamageStats[mixture.type as keyof typeof mixtureDamageStats];
  if (!stat) return null;
  const classLevel = skillPointBudget(build.destiny);
  const scaledStat = evaluation.scaledStats[stat];
  const elementalAttack = evaluation.elementalAttack[element as ElementKey];
  const elementalDamage = elementalAttack * mixture.elementRatio / 100;
  return {
    classLevel,
    stat,
    scaledStat,
    baseDamage: mixture.baseDamage,
    element: element as ElementKey,
    elementalAttack,
    elementRatio: mixture.elementRatio,
    elementalDamage,
    total: classLevel + scaledStat + mixture.baseDamage + elementalDamage,
  };
}

const knownNames = new Set(MIXTURES.map(mixture => mixture.name));
const mutagenNames = new Set(MIXTURES.filter(mixture => mixture.type === 'Mutagen').map(mixture => mixture.name));
type MixtureBonus = {
  baseStats?: Partial<Record<StatKey, number>>;
  stats?: Partial<Record<StatKey, number>>;
  elementalAttack?: Partial<Record<ElementKey, number>>;
  elementalResistance?: Partial<Record<ElementKey, number>>;
  physicalResistance?: Partial<Record<'Blunt' | 'Pierce' | 'Slash', number>>;
  maxHP?: number;
  evade?: number;
  mutagenPotency?: number;
  statusResistance?: number;
  statusResistancePercent?: number;
};

const effectBonuses: Record<string, MixtureBonus> = {
  'Evolution Drought (Ape)': { baseStats: { str: 3, vit: 3, gui: -3 }, physicalResistance: { Slash: 10, Pierce: 10 }, elementalResistance: { Fire: -15 }, mutagenPotency: 30 },
  'Evolution Drought (Lion)': { baseStats: { luc: 3, san: 3, gui: -3 }, elementalResistance: { Ice: 10, Wind: 10, Earth: -15 }, mutagenPotency: 30 },
  'Evolution Drought (Armadillo)': { baseStats: { def: 3, wil: 3, cel: -3 }, physicalResistance: { Blunt: 10 }, elementalResistance: { Fire: 10, Lightning: -15 }, mutagenPotency: 30 },
  'Evolution Drought (Shark)': { baseStats: { cel: 3, gui: 3, str: -3 }, physicalResistance: { Pierce: -15 }, elementalResistance: { Water: 10, Dark: 10 }, mutagenPotency: 30 },
  'Evolution Drought (Unicorn)': { baseStats: { fai: 3, res: 3, def: -3 }, elementalResistance: { Light: 10, Lightning: 10, Dark: -15 }, mutagenPotency: 30 },
  'Devilish Pyrogen': { stats: { san: 5 }, elementalResistance: { Fire: 5 }, mutagenPotency: 15 },
  'Dubious Entheogen': { stats: { fai: 5 }, elementalResistance: { Light: 5 }, mutagenPotency: 15 },
  'Scent of the Tyrant': { elementalAttack: { Ice: 5 }, elementalResistance: { Fire: -10 }, mutagenPotency: 15 },
  'Crimson Brew': { stats: { res: 5 }, elementalResistance: { Dark: 5 }, mutagenPotency: 15 },
  'Stupendous Sudorific': { mutagenPotency: 10 },
  'Personality Splitter': { mutagenPotency: 10 },
  'Tendril Tonic': { mutagenPotency: 15 },
  'Enlargening Elixir': { mutagenPotency: 15 },
  'Status Resistance Lowered': { statusResistancePercent: -25 },
  'Silk Spinner': { mutagenPotency: 10 },
  'Radical Cocoon': { mutagenPotency: 20, statusResistance: 100 },
  'Radical Line': { mutagenPotency: 15 },
  'Radical Gene #1': { mutagenPotency: 5 },
  'Radical Gene #2': { mutagenPotency: 5 },
  'Radical Gene #3': { mutagenPotency: 5 },
  'Ice Armor': { stats: { def: 10 }, elementalResistance: { Ice: 25, Fire: -25 } },
  'Phosphorescent Cream (Good)': { elementalAttack: { Light: 10 }, elementalResistance: { Dark: 15 } },
  "Hunter's Extract": { evade: 10 },
  'Amrita': { maxHP: 50 },
  'Hydromalic Reagent': { elementalResistance: { Water: 15 } },
  'Fragrant Balsam (Good)': { elementalAttack: { Wind: 5 } },
};

const supportedEffects: Record<string, string> = {
  'Instant Freeze': 'Ice Armor',
  'Phosphorescent Cream': 'Phosphorescent Cream (Good)',
  "Hunter's Extract": "Hunter's Extract",
  Amrita: 'Amrita',
  'Hydromalic Reagent': 'Hydromalic Reagent',
  'Fragrant Balsam': 'Fragrant Balsam (Good)',
  'Metabolic Stabilizer': 'Status Resistance Lowered',
};
const radicalEffects = new Set(['Silk Spinner', 'Radical Cocoon', 'Radical Line', 'Radical Gene #1', 'Radical Gene #2', 'Radical Gene #3']);
const effectKeys = new Set(MIXTURES.flatMap(mixture => mixture.effects
  .filter(effect => (effect.name === (supportedEffects[mixture.name] ?? (mixture.type === 'Mutagen' ? mixture.name : ''))
    || (mixture.name === 'Radical Gene' && radicalEffects.has(effect.name))) && effectBonuses[effect.name])
  .map(effect => mixtureEffectKey(mixture.name, effect.name))));
const noMixtureBonuses: MixtureBonus = Object.freeze({});

export function mixtureEffectBonus(name: string, effect: string): MixtureBonus | null {
  return effectKeys.has(mixtureEffectKey(name, effect)) ? effectBonuses[effect] : null;
}

export function activeMixtureBonuses(build: BuildState): MixtureBonus {
  if (!build.activeMixtureEffects?.length) return noMixtureBonuses;
  const result: MixtureBonus = { baseStats: {}, stats: {}, elementalAttack: {}, elementalResistance: {}, physicalResistance: {} };
  let mutagenEffects = 0;
  for (const key of normalizeActiveMixtureEffects(build.activeMixtureEffects, build.mixturePlan)) {
    const [name, effect] = JSON.parse(key) as [string, string];
    const source = mixtureEffectBonus(name, effect);
    if (!source) continue;
    if (mutagenNames.has(name)) mutagenEffects++;
    for (const channel of ['baseStats', 'stats', 'elementalAttack', 'elementalResistance', 'physicalResistance'] as const) {
      for (const [part, amount] of Object.entries(source[channel] ?? {})) {
        const values = result[channel] as Record<string, number>;
        values[part] = (values[part] ?? 0) + amount;
      }
    }
    result.maxHP = (result.maxHP ?? 0) + (source.maxHP ?? 0);
    result.evade = (result.evade ?? 0) + (source.evade ?? 0);
    result.mutagenPotency = (result.mutagenPotency ?? 0) + (source.mutagenPotency ?? 0);
    result.statusResistance = (result.statusResistance ?? 0) + (source.statusResistance ?? 0);
    result.statusResistancePercent = (result.statusResistancePercent ?? 0) + (source.statusResistancePercent ?? 0);
  }
  // The Mutagen page adds 10 to total Potency for each active Mutagen
  // effect beyond the first, including effects with no intrinsic Potency.
  result.mutagenPotency = (result.mutagenPotency ?? 0) + Math.max(0, mutagenEffects - 1) * 10;
  return result;
}

export function complexMutationChance(potency: number, statusResistance: number, shapeshifter: boolean, chimera: boolean): number {
  if (potency <= 0) return 0;
  return Math.max(0, Math.min(100, potency * 2 - statusResistance - (shapeshifter ? 15 : 0) - (chimera ? 15 : 0)));
}

export function mixtureEffectKey(name: string, effect: string): string {
  return JSON.stringify([name, effect]);
}

export function normalizeActiveMixtureEffects(value: unknown, plan: unknown): string[] {
  const planned = new Set(normalizeMixturePlan(plan));
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((key): key is string => {
    if (typeof key !== 'string' || !effectKeys.has(key)) return false;
    const [name] = JSON.parse(key) as [string, string];
    return planned.has(name);
  }))];
}

export function normalizeMixturePlan(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((name): name is string => typeof name === 'string' && knownNames.has(name))
    .slice(0, MAX_MIXTURE_FLASKS);
}

export function mixtureFlaskCapacity(build: Pick<BuildState, 'mainClass' | 'subClass' | 'skillRanks'>): number {
  if (build.mainClass !== 'Chemist' && build.subClass !== 'Chemist') return 0;
  const rank = Math.max(
    build.skillRanks.main['create-mixture'] ?? 0,
    build.skillRanks.sub['create-mixture'] ?? 0,
  );
  return rank > 0 ? Math.min(MAX_MIXTURE_FLASKS, 2 + rank) : 0;
}

export function planMixture(build: BuildState, name: string): BuildState {
  const plan = normalizeMixturePlan(build.mixturePlan);
  if (!knownNames.has(name) || plan.length >= MAX_MIXTURE_FLASKS) return build;
  return { ...build, mixturePlan: [...plan, name] };
}

export function removePlannedMixture(build: BuildState, index: number): BuildState {
  const plan = normalizeMixturePlan(build.mixturePlan);
  if (!Number.isInteger(index) || index < 0 || index >= plan.length) return build;
  const mixturePlan = plan.filter((_, position) => position !== index);
  return { ...build, mixturePlan, activeMixtureEffects: normalizeActiveMixtureEffects(build.activeMixtureEffects, mixturePlan) };
}

export function toggleMixtureEffect(build: BuildState, name: string, effect: string): BuildState {
  const key = mixtureEffectKey(name, effect);
  if (!normalizeMixturePlan(build.mixturePlan).includes(name) || !effectKeys.has(key)) return build;
  const active = normalizeActiveMixtureEffects(build.activeMixtureEffects, build.mixturePlan);
  if (active.includes(key)) return { ...build, activeMixtureEffects: active.filter(entry => entry !== key) };
  const stages = ['Silk Spinner', 'Radical Cocoon', 'Radical Line'];
  const remaining = name === 'Radical Gene' && stages.includes(effect)
    ? active.filter(entry => !stages.some(stage => entry === mixtureEffectKey(name, stage)))
    : active;
  return { ...build, activeMixtureEffects: [...remaining, key] };
}
