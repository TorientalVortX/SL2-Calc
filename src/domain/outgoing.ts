import type { BuildEvaluation, ElementKey, PhysicalKey, Skill } from '../types';
import { PHYSICAL_KEYS } from '../types';
import { ELEMENT_KEYS } from './evaluation/shared';
import {
  expectedDamage, incomingDamage,
  type DamageClass, type DamageType, type IncomingDamage, type IncomingHit,
} from './damage';
import { skillFormulaBreakdown } from './skillDamage';

export interface AttackTerm {
  label: string;
  amount: number | null;
  detail: string;
}

export interface AttackBase {
  terms: AttackTerm[];
  amount: number;
  complete: boolean;
}

export interface FlatBonus {
  amount: number;
  /** "armor-ignoring" skips Armor only; "protection-ignoring" skips every defense, as the rider's text says. */
  ignores: 'none' | 'armor' | 'protection';
}

export interface Target {
  physicalDefense: number;
  magicalDefense: number;
  armor: number;
  magicArmor: number;
  /** Resistance to the hit's type, in percent; negative is a weakness. */
  resistance: number;
  evade: number;
  criticalEvade: number;
}

export const OPEN_TARGET: Target = {
  physicalDefense: 0, magicalDefense: 0, armor: 0, magicArmor: 0, resistance: 0, evade: 0, criticalEvade: 0,
};

type Attacker = Pick<BuildEvaluation, 'scaledStats' | 'elementalAttack' | 'primaryWeapon'>;

/** Wiki Damage page: a basic attack is Scaled Weapon Attack; a skill or spell adds its SWA and Elemental ATK scaling. */
export function attackBase(skill: Skill | null, rank: number, attacker: Attacker, elements: Partial<Record<number, ElementKey>> = {}): AttackBase {
  if (!skill || skill.basicAttack) {
    const swa = attacker.primaryWeapon?.swa ?? null;
    return {
      terms: [{ label: 'Scaled Weapon ATK', amount: swa, detail: swa === null ? 'Equip a main-hand weapon.' : '100%' }],
      amount: swa ?? 0,
      complete: swa !== null,
    };
  }
  const formula = skillFormulaBreakdown(skill, rank, attacker, elements);
  if (!formula) return { terms: [], amount: 0, complete: false };
  return {
    terms: formula.terms.map(term => ({
      label: term.label,
      amount: term.amount,
      detail: term.amount === null ? term.reason ?? '' : term.flat ? 'flat' : `${term.coefficient}%`,
    })),
    amount: formula.subtotal,
    complete: formula.complete,
  };
}

/** Damage percentages are mostly separate sources, so each multiplies rather than adding into one pool. */
export function powerMultiplier(percents: number[]): number {
  return percents.reduce((product, percent) => product * Math.max(0, 1 + percent / 100), 1);
}

const isPhysical = (type: DamageType): type is PhysicalKey => (PHYSICAL_KEYS as readonly string[]).includes(type ?? '');

export function targetDefenses(target: Target, type: DamageType) {
  const elementalResistance = Object.fromEntries(ELEMENT_KEYS.map(key => [key, 0])) as Record<ElementKey, number>;
  const physicalResistance = Object.fromEntries(PHYSICAL_KEYS.map(key => [key, 0])) as Record<PhysicalKey, number>;
  if (type && isPhysical(type)) physicalResistance[type] = target.resistance;
  else if (type) elementalResistance[type] = target.resistance;
  return {
    derived: { physicalDefense: target.physicalDefense, magicalDefense: target.magicalDefense, armor: target.armor, magicArmor: target.magicArmor },
    elementalResistance,
    physicalResistance,
  };
}

export interface OutgoingDamage {
  perHit: number;
  main: IncomingDamage;
  bonus: IncomingDamage | null;
  dealt: number;
}

/** A crit raises the attack's own damage; "bonus damage from on-hit effects remains the same" (wiki Critical page). */
export function outgoingDamage(hit: IncomingHit, base: number, percents: number[], flat: FlatBonus, target: Target): OutgoingDamage {
  const perHit = base * powerMultiplier(percents);
  const defenses = targetDefenses(target, hit.type);
  const main = incomingDamage({ ...hit, amount: perHit }, defenses);
  const bonus = flat.amount > 0 ? incomingDamage(bonusHit(hit, flat), defenses) : null;
  return { perHit, main, bonus, dealt: main.taken + (bonus?.taken ?? 0) };
}

function bonusHit(hit: IncomingHit, flat: FlatBonus): IncomingHit {
  return {
    ...hit,
    amount: flat.amount,
    damageClass: flat.ignores === 'protection' ? 'protection-ignoring' : hit.damageClass,
    armorIgnoring: flat.ignores === 'armor',
    outcomes: hit.outcomes.map(outcome => ({ ...outcome, critical: false })),
  };
}

export interface AttackerOdds {
  hit: number;
  critical: number;
  greatAccuracy: boolean;
  ignoresEvasion: boolean;
}

export function expectedOutgoing(hit: IncomingHit, base: number, percents: number[], flat: FlatBonus, target: Target, attacker: AttackerOdds) {
  const defenses = targetDefenses(target, hit.type);
  const critChance = Math.max(0, Math.min(100, attacker.critical - target.criticalEvade));
  const odds = {
    attackerHit: attacker.hit, defenderEvade: target.evade, greatAccuracy: attacker.greatAccuracy,
    ignoresEvasion: attacker.ignoresEvasion, parryChancePercent: 0, critChancePercent: critChance,
  };
  const main = expectedDamage({ ...hit, amount: base * powerMultiplier(percents) }, defenses, odds);
  const bonus = flat.amount > 0 ? expectedDamage(bonusHit(hit, flat), defenses, { ...odds, critChancePercent: 0 }).expected : 0;
  return { ...main, critChance, expected: main.expected + bonus };
}

// Confirmed in game: skills and spells crit at a flat 1.25, without the weapon's crit damage or GUI;
// skills that perform a basic attack crit like one.
export const SKILL_CRIT_DAMAGE_PERCENT = 125;

/** A basic attack crits at the weapon's crit damage plus scaled GUI (wiki Critical page). */
export function critDamageFor(skill: Skill | null, attacker: Pick<BuildEvaluation, 'primaryWeapon'>): number {
  return skill && !skill.basicAttack ? SKILL_CRIT_DAMAGE_PERCENT : attacker.primaryWeapon?.criticalDamage ?? 100;
}

/** Element terms make a spell's damage magical; anything else is a physical hit of the weapon's type. */
export function defaultDamage(skill: Skill | null, elements: Partial<Record<number, ElementKey>>, weaponType: DamageType): { damageClass: DamageClass; type: DamageType } {
  const elementTerm = skill?.scaling?.findIndex(term => term.source === 'element') ?? -1;
  if (skill && elementTerm >= 0) {
    const term = skill.scaling![elementTerm];
    return { damageClass: 'magical', type: elements[elementTerm] ?? term.element ?? null };
  }
  return { damageClass: 'physical', type: weaponType };
}

