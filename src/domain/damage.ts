import type { BuildEvaluation, ElementKey, PhysicalKey } from '../types';
import { PHYSICAL_KEYS } from '../types';
import { hitChance } from './hitEvade';

export type DamageClass = 'physical' | 'magical' | 'protection-ignoring';
export type DamageType = ElementKey | PhysicalKey | null;
export type HitResult = 'hit' | 'glance' | 'evaded';

export interface HitOutcome {
  result: HitResult;
  parried: boolean;
  critical: boolean;
}

export interface IncomingHit {
  /** Damage per hit; a multi-hit attack has `hits` instances of it. */
  amount: number;
  hits: number;
  damageClass: DamageClass;
  type: DamageType;
  critDamagePercent: number;
  /** Flat damage a crit adds before defenses ("+10 Critical Damage"). */
  critFlatDamage?: number;
  armorIgnoring: boolean;
  guardMomentum: number;
  otherReductionPercent: number;
  /** Cuts against this attacker in particular (Beastfoe Shield vs Beast), each its own multiplier. */
  versusReductions?: Array<{ label: string; percent: number }>;
  /** Reduction of the defender's parry skill when it fires, already halved for Zugzwang. */
  parryReductionPercent: number;
  /** One per hit; missing entries are plain hits. Each hit rolls its own crit. */
  outcomes: HitOutcome[];
}

export interface DamageStep {
  label: string;
  /** Multiplier applied at this step, or the flat amount subtracted. */
  factor?: number;
  flat?: number;
  total: number;
}

export interface DamageInstance extends HitOutcome {
  /** Armor or Magic Armor spent on this hit from the attack's pool. */
  absorbed: number;
  taken: number;
}

export interface IncomingDamage {
  steps: DamageStep[];
  instances: DamageInstance[];
  taken: number;
}

// Guard (Shield): each Momentum spent adds 10% damage reduction and costs 10% of current Evade (confirmed in game).
export const GUARD_PERCENT_PER_MOMENTUM = 10;
// Wiki Evade page: a glancing blow takes 60% less damage.
export const GLANCE_REDUCTION_PERCENT = 60;

export const NO_HIT: IncomingHit = {
  amount: 100, hits: 1, damageClass: 'physical', type: null, critDamagePercent: 150,
  armorIgnoring: false, guardMomentum: 0, otherReductionPercent: 0, parryReductionPercent: 0, outcomes: [],
};

type Defenses = Pick<BuildEvaluation, 'elementalResistance' | 'physicalResistance'> & {
  derived: Pick<BuildEvaluation['derived'], 'physicalDefense' | 'magicalDefense' | 'armor' | 'magicArmor'>;
};

function isPhysicalType(type: DamageType): type is PhysicalKey {
  return (PHYSICAL_KEYS as readonly string[]).includes(type ?? '');
}

const reduce = (percent: number) => Math.max(0, 1 - percent / 100);

function hitCount(hit: IncomingHit): number {
  return Math.max(1, Math.floor(hit.hits));
}

const PLAIN_HIT: HitOutcome = { result: 'hit', parried: false, critical: false };

// (amount × crit% + flat) is amount × (crit% + flat / amount), so the flat part rides the same multiplier.
function critFactor(hit: IncomingHit): number {
  const flat = hit.critFlatDamage && hit.amount > 0 ? hit.critFlatDamage / hit.amount : 0;
  return hit.critDamagePercent / 100 + flat;
}

function outcomeSteps(outcome: HitOutcome, hit: IncomingHit): Array<{ label: string; factor: number }> {
  if (outcome.result === 'evaded') return [{ label: 'Evaded', factor: 0 }];
  const steps = [
    { label: 'Critical', factor: outcome.critical ? critFactor(hit) : 1 },
    { label: 'Glancing', factor: outcome.result === 'glance' ? reduce(GLANCE_REDUCTION_PERCENT) : 1 },
    { label: 'Parried', factor: outcome.parried ? reduce(hit.parryReductionPercent) : 1 },
  ];
  return steps.filter(step => step.factor !== 1);
}

const outcomeFactor = (outcome: HitOutcome, hit: IncomingHit) =>
  outcomeSteps(outcome, hit).reduce((product, step) => product * step.factor, 1);

/** The reductions every hit of the attack shares, and the Armor pool they draw from. */
function sharedReductions(hit: IncomingHit, defender: Defenses) {
  const steps: DamageStep[] = [{ label: 'Incoming', total: hit.amount }];
  let total = hit.amount;
  let armorPool = 0;
  const multiply = (label: string, percent: number) => {
    if (!percent) return;
    const factor = reduce(percent);
    total *= factor;
    steps.push({ label, factor, total });
  };

  if (hit.damageClass !== 'protection-ignoring') {
    const physical = hit.damageClass === 'physical';
    multiply(physical ? 'Physical Defense' : 'Magical Defense', physical ? defender.derived.physicalDefense : defender.derived.magicalDefense);
    if (hit.type) {
      const resistance = isPhysicalType(hit.type) ? defender.physicalResistance[hit.type] : defender.elementalResistance[hit.type];
      multiply(`${hit.type} resistance`, resistance);
    }
    multiply('Guard', hit.guardMomentum * GUARD_PERCENT_PER_MOMENTUM);
    multiply('Other reductions', hit.otherReductionPercent);
    for (const reduction of hit.versusReductions ?? []) multiply(reduction.label, reduction.percent);
    if (!hit.armorIgnoring) armorPool = Math.max(0, physical ? defender.derived.armor : defender.derived.magicArmor);
  }
  return { steps, perHit: total, armorPool };
}

/**
 * Per the wiki Protection page, percentage reductions multiply and flat Armor/Magic Armor comes off afterwards.
 * Per the developer, Armor is one pool per attack, spent on each hit in turn (20 Armor vs 2×15 takes 0, then 10).
 */
export function incomingDamage(hit: IncomingHit, defender: Defenses): IncomingDamage {
  const { steps, perHit, armorPool } = sharedReductions(hit, defender);
  let pool = armorPool;
  const instances: DamageInstance[] = [];
  for (let index = 0; index < hitCount(hit); index++) {
    const given = hit.outcomes[index] ?? PLAIN_HIT;
    const outcome = given.result === 'evaded' ? { ...PLAIN_HIT, result: given.result } : given;
    const damage = perHit * outcomeFactor(outcome, hit);
    const absorbed = Math.min(pool, damage);
    pool -= absorbed;
    instances.push({ ...outcome, absorbed, taken: Math.max(0, Math.floor(damage - absorbed)) });
  }
  const only = instances.length === 1 ? instances[0] : null;
  if (only && only.result !== 'evaded') {
    let total = perHit;
    for (const step of outcomeSteps(only, hit)) {
      total *= step.factor;
      steps.push({ ...step, total });
    }
    if (only.absorbed) steps.push({ label: hit.damageClass === 'magical' ? 'Magic Armor' : 'Armor', flat: only.absorbed, total: total - only.absorbed });
  }
  return { steps, instances, taken: instances.reduce((sum, instance) => sum + instance.taken, 0) };
}

export interface AttackOdds {
  /** The attacker's Hit against this defender's (guarded) Evade. */
  attackerHit: number;
  defenderEvade: number;
  greatAccuracy: boolean;
  ignoresEvasion: boolean;
  parryChancePercent: number;
  critChancePercent: number;
}

export interface ExpectedDamage {
  hitChance: number;
  glanceChance: number;
  evadeChance: number;
  expected: number;
}

/** Per hit roll odds: a miss rerolls for a glance (wiki Evade page); Great Accuracy guarantees at least a glance. */
export function rollOdds(odds: AttackOdds) {
  const p = odds.ignoresEvasion ? 1 : hitChance(odds.attackerHit, odds.defenderEvade) / 100;
  const glance = (1 - p) * (odds.greatAccuracy ? 1 : p);
  return { hit: p, glance, evaded: Math.max(0, 1 - p - glance) };
}

/** Exact expected damage per attack; the Armor pool depends on earlier hits, so outcomes are tracked as a distribution. */
export function expectedDamage(hit: IncomingHit, defender: Defenses, odds: AttackOdds): ExpectedDamage {
  const { perHit, armorPool } = sharedReductions(hit, defender);
  const rolls = rollOdds(odds);
  const chance = (percent: number) => (on: boolean) => {
    const p = Math.max(0, Math.min(1, percent / 100));
    return on ? p : 1 - p;
  };
  const parry = chance(odds.parryChancePercent);
  const crit = chance(odds.critChancePercent);
  const states = [{ probability: rolls.evaded, factor: 0 }];
  for (const result of ['hit', 'glance'] as const) {
    for (const parried of [false, true]) {
      for (const critical of [false, true]) {
        states.push({ probability: rolls[result] * parry(parried) * crit(critical), factor: outcomeFactor({ result, parried, critical }, hit) });
      }
    }
  }

  const live = states.filter(state => state.probability > 0);
  let pools = new Map<number, number>([[armorPool, 1]]);
  let expected = 0;
  for (let index = 0; index < hitCount(hit); index++) {
    const next = new Map<number, number>();
    for (const [pool, weight] of pools) {
      for (const state of live) {
        const damage = perHit * state.factor;
        const absorbed = Math.min(pool, damage);
        const probability = weight * state.probability;
        expected += probability * Math.max(0, Math.floor(damage - absorbed));
        const key = Math.round((pool - absorbed) * 1e6) / 1e6;
        next.set(key, (next.get(key) ?? 0) + probability);
      }
    }
    pools = next;
  }
  return { hitChance: rolls.hit, glanceChance: rolls.glance, evadeChance: rolls.evaded, expected };
}

export function guardedEvade(evade: number, guardMomentum: number): number {
  return Math.floor(evade * reduce(guardMomentum * GUARD_PERCENT_PER_MOMENTUM));
}
