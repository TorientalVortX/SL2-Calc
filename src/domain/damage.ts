import type { BuildEvaluation, ElementKey, PhysicalKey } from '../types';
import { PHYSICAL_KEYS } from '../types';

export type DamageClass = 'physical' | 'magical' | 'protection-ignoring';
export type DamageType = ElementKey | PhysicalKey | null;

export interface IncomingHit {
  amount: number;
  damageClass: DamageClass;
  type: DamageType;
  critical: boolean;
  critDamagePercent: number;
  armorIgnoring: boolean;
  guardMomentum: number;
  otherReductionPercent: number;
}

export interface DamageStep {
  label: string;
  /** Multiplier applied at this step, or the flat amount subtracted. */
  factor?: number;
  flat?: number;
  total: number;
}

export interface IncomingDamage {
  steps: DamageStep[];
  taken: number;
}

// Guard (Shield): each Momentum spent adds 10% damage reduction and costs 10% Evade (confirmed in game).
export const GUARD_PERCENT_PER_MOMENTUM = 10;

export const NO_HIT: IncomingHit = {
  amount: 100, damageClass: 'physical', type: null, critical: false, critDamagePercent: 150,
  armorIgnoring: false, guardMomentum: 0, otherReductionPercent: 0,
};

type Defenses = Pick<BuildEvaluation, 'elementalResistance' | 'physicalResistance'> & {
  derived: Pick<BuildEvaluation['derived'], 'physicalDefense' | 'magicalDefense' | 'armor' | 'magicArmor'>;
};

function isPhysicalType(type: DamageType): type is PhysicalKey {
  return (PHYSICAL_KEYS as readonly string[]).includes(type ?? '');
}

/** Per the wiki Protection page: percentage reductions multiply, then flat Armor/Magic Armor is subtracted. */
export function incomingDamage(hit: IncomingHit, defender: Defenses): IncomingDamage {
  const steps: DamageStep[] = [{ label: 'Incoming', total: hit.amount }];
  let total = hit.amount;
  const multiply = (label: string, percent: number) => {
    if (!percent) return;
    const factor = Math.max(0, 1 - percent / 100);
    total *= factor;
    steps.push({ label, factor, total });
  };

  if (hit.critical) {
    total *= hit.critDamagePercent / 100;
    steps.push({ label: 'Critical', factor: hit.critDamagePercent / 100, total });
  }

  if (hit.damageClass !== 'protection-ignoring') {
    const physical = hit.damageClass === 'physical';
    multiply(physical ? 'Physical Defense' : 'Magical Defense', physical ? defender.derived.physicalDefense : defender.derived.magicalDefense);
    if (hit.type) {
      const resistance = isPhysicalType(hit.type) ? defender.physicalResistance[hit.type] : defender.elementalResistance[hit.type];
      multiply(`${hit.type} resistance`, resistance);
    }
    multiply('Guard', hit.guardMomentum * GUARD_PERCENT_PER_MOMENTUM);
    multiply('Other reductions', hit.otherReductionPercent);
    if (!hit.armorIgnoring) {
      const flat = physical ? defender.derived.armor : defender.derived.magicArmor;
      if (flat) {
        total -= flat;
        steps.push({ label: physical ? 'Armor' : 'Magic Armor', flat, total });
      }
    }
  }

  return { steps, taken: Math.max(0, Math.floor(total)) };
}

export function guardedEvade(evade: number, guardMomentum: number): number {
  return Math.floor(evade * Math.max(0, 1 - guardMomentum * GUARD_PERCENT_PER_MOMENTUM / 100));
}
