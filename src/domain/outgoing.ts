import type { BuildEvaluation, ElementKey, PhysicalKey, Skill } from '../types';
import { PHYSICAL_KEYS } from '../types';
import { ELEMENT_KEYS } from './evaluation/shared';
import {
  expectedDamage, incomingDamage,
  type DamageClass, type DamageType, type IncomingDamage, type IncomingHit,
} from './damage';
import { valueAtRank } from './skills';
import { skillFormulaBreakdown } from './skillDamage';
import type { SetAttackEffect } from './itemEffects';

export interface AttackTerm {
  label: string;
  amount: number | null;
  detail: string;
}

export interface AttackBase {
  terms: AttackTerm[];
  /** Raised by damage modifiers and crits. */
  amount: number;
  /** The skill's own bonus damage: added after damage modifiers, before the crit. */
  bonus: number;
  hit: number;
  critical: number;
  complete: boolean;
}

export interface FlatBonus {
  amount: number;
  /** "armor-ignoring" skips Armor only; "protection-ignoring" skips every defense, as the rider's text says. */
  ignores: 'none' | 'armor' | 'protection';
  /** Set when the rider differs from the attack (Snake Shot's Acid magic damage). */
  damageClass?: 'physical' | 'magical';
  type?: DamageType;
}

export interface Target {
  physicalDefense: number;
  magicalDefense: number;
  armor: number;
  magicArmor: number;
  /** Resistance to the hit's type, in percent; negative is a weakness. */
  resistance: number;
  /** Resistance to the bonus damage's type, when it has its own. */
  bonusResistance: number;
  evade: number;
  criticalEvade: number;
}

export const OPEN_TARGET: Target = {
  physicalDefense: 0, magicalDefense: 0, armor: 0, magicArmor: 0, resistance: 0, bonusResistance: 0, evade: 0, criticalEvade: 0,
};

type Attacker = Pick<BuildEvaluation, 'scaledStats' | 'elementalAttack' | 'primaryWeapon'> & {
  derived?: Pick<BuildEvaluation['derived'], 'maxHP' | 'currentHP'>;
};

const atRank = (values: number[] | undefined, rank: number) => (values ? valueAtRank(values, rank) ?? 0 : 0);

function basicAttack(skill: Skill | null, rank: number, attacker: Attacker): AttackBase {
  const profile = skill?.basicAttack ?? {};
  const swa = attacker.primaryWeapon?.swa ?? null;
  const share = profile.damagePercent ?? 100;
  const terms: AttackTerm[] = [{ label: 'Scaled Weapon ATK', amount: swa === null ? null : swa * share / 100, detail: swa === null ? 'Equip a main-hand weapon.' : `${share}%` }];
  const bonusDamage = atRank(profile.bonusDamageByRank, rank);
  if (bonusDamage) terms.push({ label: 'Bonus damage', amount: bonusDamage, detail: `rank ${rank}` });
  const missingHp = profile.missingHpPercent && attacker.derived
    ? Math.max(0, attacker.derived.maxHP - attacker.derived.currentHP) * profile.missingHpPercent / 100
    : 0;
  if (profile.missingHpPercent) terms.push({ label: 'Missing HP bonus', amount: missingHp, detail: `${profile.missingHpPercent}% of missing HP` });
  return {
    terms,
    amount: terms[0].amount ?? 0,
    bonus: bonusDamage + missingHp,
    hit: atRank(profile.hitByRank, rank),
    critical: atRank(profile.criticalByRank, rank),
    complete: swa !== null,
  };
}

/** Wiki Damage page: a basic attack is Scaled Weapon Attack; a skill or spell adds its SWA and Elemental ATK scaling. */
export function attackBase(skill: Skill | null, rank: number, attacker: Attacker, elements: Partial<Record<number, ElementKey>> = {}): AttackBase {
  if (!skill || skill.basicAttack) return basicAttack(skill, rank, attacker);
  const formula = skillFormulaBreakdown(skill, rank, attacker, elements);
  if (!formula) return { terms: [], amount: 0, bonus: 0, hit: 0, critical: 0, complete: false };
  return {
    terms: formula.terms.map(term => ({
      label: term.label,
      amount: term.amount,
      detail: term.amount === null ? term.reason ?? '' : term.flat ? 'flat' : `${term.coefficient}%`,
    })),
    amount: formula.subtotal,
    bonus: 0,
    hit: 0,
    critical: 0,
    complete: formula.complete,
  };
}

/** A basic-attack skill's separate rider, at the given rank. */
export function riderFor(skill: Skill | null, rank: number): FlatBonus | null {
  const rider = skill?.basicAttack?.rider;
  if (!rider) return null;
  return { amount: atRank(rider.bonusByRank ?? undefined, rank), ignores: rider.ignores, damageClass: rider.damageClass, type: rider.type };
}

/** "Ignores up to 10% of elemental resistance": a resistance drops toward 0, a weakness is untouched. */
export function ignoreResistance(resistance: number, percent: number): number {
  return resistance > 0 ? Math.max(0, resistance - percent) : resistance;
}

/** The target as your sets see it: resistance they let you ignore is taken off. */
export function targetAfterSets(target: Target, effects: SetAttackEffect[], type: DamageType, bonusType: DamageType): Target {
  const ignored = (forType: DamageType) => effects.reduce(
    (total, effect) => total + (forType && effect.resistanceIgnored?.types.includes(forType) ? effect.resistanceIgnored.percent : 0),
    0,
  );
  return {
    ...target,
    resistance: ignoreResistance(target.resistance, ignored(type)),
    bonusResistance: ignoreResistance(target.bonusResistance, ignored(bonusType)),
  };
}

/** Damage percentages are mostly separate sources, so each multiplies rather than adding into one pool. */
export function powerMultiplier(percents: number[]): number {
  return percents.reduce((product, percent) => product * Math.max(0, 1 + percent / 100), 1);
}

const isPhysical = (type: DamageType): type is PhysicalKey => (PHYSICAL_KEYS as readonly string[]).includes(type ?? '');

export function targetDefenses(target: Target, type: DamageType, resistance = target.resistance) {
  const elementalResistance = Object.fromEntries(ELEMENT_KEYS.map(key => [key, 0])) as Record<ElementKey, number>;
  const physicalResistance = Object.fromEntries(PHYSICAL_KEYS.map(key => [key, 0])) as Record<PhysicalKey, number>;
  if (type && isPhysical(type)) physicalResistance[type] = resistance;
  else if (type) elementalResistance[type] = resistance;
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

type Attack = Pick<AttackBase, 'amount' | 'bonus'>;

const perHit = (attack: Attack, percents: number[]) => attack.amount * powerMultiplier(percents) + attack.bonus;

function bonusHit(hit: IncomingHit, flat: FlatBonus): IncomingHit {
  return {
    ...hit,
    amount: flat.amount,
    damageClass: flat.ignores === 'protection' ? 'protection-ignoring' : flat.damageClass ?? hit.damageClass,
    type: flat.type ?? hit.type,
    armorIgnoring: flat.ignores === 'armor',
    outcomes: hit.outcomes.map(outcome => ({ ...outcome, critical: false })),
  };
}

function bonusDefenses(hit: IncomingHit, flat: FlatBonus, target: Target) {
  const ownType = flat.type && flat.type !== hit.type;
  return targetDefenses(target, flat.type ?? hit.type, ownType ? target.bonusResistance : target.resistance);
}

/** A crit raises the attack's own damage; "bonus damage from on-hit effects remains the same" (wiki Critical page). */
export function outgoingDamage(hit: IncomingHit, attack: Attack, percents: number[], flat: FlatBonus, target: Target): OutgoingDamage {
  const amount = perHit(attack, percents);
  const main = incomingDamage({ ...hit, amount }, targetDefenses(target, hit.type));
  const bonus = flat.amount > 0 ? incomingDamage(bonusHit(hit, flat), bonusDefenses(hit, flat, target)) : null;
  return { perHit: amount, main, bonus, dealt: main.taken + (bonus?.taken ?? 0) };
}

export interface AttackerOdds {
  hit: number;
  critical: number;
  greatAccuracy: boolean;
  ignoresEvasion: boolean;
}

export function expectedOutgoing(hit: IncomingHit, attack: Attack, percents: number[], flat: FlatBonus, target: Target, attacker: AttackerOdds) {
  const critChance = Math.max(0, Math.min(100, attacker.critical - target.criticalEvade));
  const odds = {
    attackerHit: attacker.hit, defenderEvade: target.evade, greatAccuracy: attacker.greatAccuracy,
    ignoresEvasion: attacker.ignoresEvasion, parryChancePercent: 0, critChancePercent: critChance,
  };
  const main = expectedDamage({ ...hit, amount: perHit(attack, percents) }, targetDefenses(target, hit.type), odds);
  const bonus = flat.amount > 0
    ? expectedDamage(bonusHit(hit, flat), bonusDefenses(hit, flat, target), { ...odds, critChancePercent: 0 }).expected
    : 0;
  return { ...main, critChance, expected: main.expected + bonus };
}

// Confirmed in game: skills and spells crit at a flat 1.25, without the weapon's crit damage or GUI;
// skills that perform a basic attack crit like one.
export const SKILL_CRIT_DAMAGE_PERCENT = 125;

/** A basic attack crits at the weapon's crit damage plus scaled GUI (wiki Critical page). */
export function critDamageFor(skill: Skill | null, attacker: Pick<BuildEvaluation, 'primaryWeapon'>): number {
  return skill && !skill.basicAttack ? SKILL_CRIT_DAMAGE_PERCENT : attacker.primaryWeapon?.criticalDamage ?? 100;
}

/** Element terms make a spell's damage magical; a basic attack keeps its weapon's type unless the skill says otherwise. */
export function defaultDamage(skill: Skill | null, elements: Partial<Record<number, ElementKey>>, weaponType: DamageType): { damageClass: DamageClass; type: DamageType } {
  if (skill?.basicAttack) {
    return { damageClass: skill.basicAttack.damageClass ?? 'physical', type: skill.basicAttack.type ?? weaponType };
  }
  const elementTerm = skill?.scaling?.findIndex(term => term.source === 'element') ?? -1;
  if (skill && elementTerm >= 0) {
    const term = skill.scaling![elementTerm];
    return { damageClass: 'magical', type: elements[elementTerm] ?? term.element ?? null };
  }
  return { damageClass: 'physical', type: weaponType };
}
