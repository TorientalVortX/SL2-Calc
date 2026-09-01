/**
 * The derived-stat readout, grouped for display.
 *
 * Almost every number is taken straight off `evaluateBuild`. Hit, Critical and
 * Crit Damage are the exceptions, and they change meaning depending on whether a
 * weapon is equipped:
 *
 * - **With a weapon**, `evaluateBuild` reports all three complete
 *   (`calculateWeaponSlot` folds the character's own SKI/LUC/GUI terms into
 *   them), so they are shown as-is.
 * - **Without one**, there is no attack to report, so the rail falls back to the
 *   character-side stat terms alone and marks them with a dagger. That is a base a
 *   weapon adds to, not a full attack roll.
 *
 * The fallbacks are composed exactly the way the weapon path composes them, so
 * equipping a weapon never makes a number jump by a rounding step.
 */
import type { BuildEvaluation, BuildState, ElementKey, StatKey } from '../../types';
import { ELEMENT_KEYS } from '../../domain/buildEvaluation';
import { STAT_HARD_CAP } from './build';

export type ReadoutFormat = 'integer' | 'percent' | 'signed-percent' | 'ratio';

export interface ReadoutRow {
  key: string;
  label: string;
  value: number;
  format: ReadoutFormat;
  /** Shown on hover: where the number comes from. */
  hint: string;
  /**
   * The stats the row reads, for the card's "reads from" list.
   *
   * Written out rather than parsed from `hint`, and covered by a test that holds
   * the two together: a formula's prose and the stats it names have to agree, and
   * prose is not a data structure. Empty for a row no stat feeds, such as Armor.
   */
  stats: StatKey[];
  /** True when the value is a character-side base a weapon or item adds to. */
  partial?: boolean;
  /** What the dagger means on this row. The rail's footnote is built from these. */
  note?: string;
  /** The denominator of a `ratio` row, such as weight capacity. */
  secondary?: number;
  /** Renders the value in the alert colour: currently only over-capacity weight. */
  warn?: boolean;
}

export interface ReadoutGroup {
  key: string;
  title: string;
  rows: ReadoutRow[];
}

/** Character-side Hit: `+2 Hit per scaled SKI`. A weapon adds its own base Hit. */
export function baseHit(evaluation: BuildEvaluation): number {
  return Math.floor(evaluation.scaledStats.ski * 2);
}

/**
 * Character-side Critical: `+0.5 per scaled SKI` and `+1 per scaled LUC`.
 *
 * Each term is floored on its own, which is how `calculateWeaponSlot` composes
 * the same two terms. Flooring their sum instead would read one higher whenever
 * both carried a fraction, and the number would then drop by one the moment a
 * weapon was equipped.
 *
 * STR also grants `+0.4 Critical`, but only for a weapon whose primary scaling
 * is STR, so it belongs to the weapon rather than to the character.
 */
export function baseCritical(evaluation: BuildEvaluation): number {
  return Math.floor(evaluation.scaledStats.ski / 2) + Math.floor(evaluation.scaledStats.luc);
}

/** `+1% Critical Damage per scaled GUI`, reported as the bonus it is stated as. */
export function critDamageBonus(evaluation: BuildEvaluation): number {
  return Math.floor(evaluation.scaledStats.gui);
}

/**
 * The two dagger footnotes.
 *
 * Named here because both the rail and the card show them, and neither of those
 * should be the place they are written down.
 */
const WEAPON_NOTE = 'Character contribution only. Equip a weapon for the full Hit, Critical and critical modifier.';
const WEIGHT_NOTE = 'Weight counts the weapon and torso; the wiki publishes none for slots 3–6.';

export function readoutGroups(evaluation: BuildEvaluation): ReadoutGroup[] {
  const d = evaluation.derived;
  const weapon = evaluation.primaryWeapon;

  const groups: ReadoutGroup[] = [
    {
      key: 'vitals',
      title: 'Vitals',
      rows: [
        { key: 'maxHP', label: 'Max HP', value: d.maxHP, format: 'integer', stats: ['vit', 'san', 'str'], hint: '10× scaled VIT, +2 per scaled SAN, +3 per base STR, +1 per invested point' },
        { key: 'fp', label: 'Max FP', value: d.fp, format: 'integer', stats: ['wil', 'san', 'fai'], hint: '5× scaled WIL, +2 per scaled SAN, +3 per scaled FAI' },
      ],
    },
    {
      key: 'defense',
      title: 'Defense',
      rows: [
        { key: 'physicalDefense', label: 'Phys. Def', value: d.physicalDefense, format: 'percent', stats: ['def'], hint: '0.9% per scaled DEF' },
        { key: 'magicalDefense', label: 'Mag. Def', value: d.magicalDefense, format: 'percent', stats: ['res'], hint: '0.9% per scaled RES' },
        { key: 'armor', label: 'Armor', value: d.armor, format: 'integer', stats: [], hint: 'Flat damage reduction from the torso, its material, enchantment and upgrades' },
        { key: 'magicArmor', label: 'M. Armor', value: d.magicArmor, format: 'integer', stats: [], hint: 'Flat magic damage reduction from the torso and what is applied to it' },
        { key: 'evade', label: 'Evade', value: d.evade, format: 'integer', stats: ['cel'], hint: '2× scaled CEL, plus armor, legs upgrades and skills' },
        {
          key: 'evadeBonus',
          label: 'Bonus Evade',
          value: d.evadeBonus,
          format: 'integer',
          stats: [],
          hint: d.evadeBonusWasted > 0
            ? `Buffs and item effects share one ceiling of 50, so ${d.evadeBonusWasted} is being discarded`
            : 'Buffs and item effects, which share one ceiling of 50',
        },
        { key: 'criticalEvade', label: 'Crit Evade', value: d.criticalEvade, format: 'integer', stats: ['fai', 'luc'], hint: 'Scaled FAI + scaled LUC' },
        { key: 'statusResistance', label: 'Status Res.', value: d.statusResistance, format: 'integer', stats: ['san', 'fai'], hint: '2× scaled SAN + scaled FAI' },
      ],
    },
    {
      key: 'offense',
      title: 'Offense',
      rows: weapon
        ? [
          { key: 'power', label: 'Power', value: weapon.power, format: 'integer', stats: [], hint: 'The weapon’s own Power: base power, modifiers and upgrades, with no stat scaling' },
          { key: 'swa', label: 'SWA', value: weapon.swa, format: 'integer', stats: [], hint: 'Scaled Weapon Attack: Power plus the weapon’s stat scaling, which every skill coefficient is a percentage of' },
          { key: 'hit', label: 'Hit', value: weapon.hit, format: 'percent', stats: ['ski'], hint: '2× scaled SKI plus the weapon’s accuracy, modifiers and upgrades' },
          { key: 'critical', label: 'Critical', value: weapon.critical, format: 'percent', stats: ['ski', 'luc'], hint: 'Weapon critical plus half scaled SKI and scaled LUC' },
          { key: 'critDamage', label: 'Crit Damage', value: weapon.criticalDamage, format: 'percent', stats: ['gui'], hint: 'The weapon’s critical modifier plus 1% per scaled GUI' },
          {
            key: 'hitBonus',
            label: 'Bonus Hit',
            value: d.hitBonusApplied,
            format: 'integer',
            stats: [],
            hint: d.hitBonusWasted > 0
              ? `Buffs and item effects share one ceiling of 50, so ${d.hitBonusWasted} is being discarded`
              : 'Buffs and item effects, which share one ceiling of 50',
          },
          { key: 'statusInfliction', label: 'Status Inf.', value: d.statusInfliction, format: 'integer', stats: ['ski', 'wil'], hint: '2× scaled SKI + scaled WIL' },
        ]
        : [
          { key: 'hit', label: 'Hit', value: baseHit(evaluation), format: 'integer', stats: ['ski'], partial: true, note: WEAPON_NOTE, hint: '2× scaled SKI. Equip a weapon to see the full figure.' },
          { key: 'critical', label: 'Critical', value: baseCritical(evaluation), format: 'integer', stats: ['ski', 'luc'], partial: true, note: WEAPON_NOTE, hint: 'Half scaled SKI + scaled LUC. Equip a weapon to see the full figure.' },
          { key: 'critDamage', label: 'Crit Damage', value: critDamageBonus(evaluation), format: 'signed-percent', stats: ['gui'], partial: true, note: WEAPON_NOTE, hint: '+1% per scaled GUI, on top of a weapon’s own critical modifier' },
          { key: 'statusInfliction', label: 'Status Inf.', value: d.statusInfliction, format: 'integer', stats: ['ski', 'wil'], hint: '2× scaled SKI + scaled WIL' },
        ],
    },
    {
      key: 'utility',
      title: 'Utility',
      rows: [
        { key: 'initiative', label: 'Initiative', value: d.initiative, format: 'integer', stats: ['cel'], hint: 'Base CEL: racial line plus invested points, before scaling' },
        { key: 'flanking', label: 'Flanking', value: d.flanking, format: 'integer', stats: ['gui'], hint: '5 + half of scaled GUI. Half of it is added to Hit per flanking condition met' },
        { key: 'skillPool', label: 'Skill Pool', value: d.skillPool, format: 'integer', stats: ['gui', 'ski', 'wil'], hint: '11, +1 per 5 GUI, +1 per 5 SKI, +1 per 10 WIL, +2 for Human' },
        { key: 'youkaiCap', label: 'Youkai Cap', value: d.youkaiCap, format: 'integer', stats: ['fai'], hint: 'Base FAI ÷ 5, +5' },
        {
          key: 'battleWeight',
          label: 'Battle Wt.',
          value: d.equipmentLoad,
          secondary: d.battleWeight,
          format: 'ratio',
          stats: ['str'],
          warn: d.battleWeightRemaining < 0,
          note: WEIGHT_NOTE,
          // Only the weapon and torso carry a published weight, so this is a
          // partial load and says so rather than implying the whole loadout.
          partial: true,
          hint: 'Weapon and torso weight against a capacity of scaled STR + 5. Slots 3–6 have no published weight.',
        },
        { key: 'encumbrance', label: 'Encumbrance', value: d.encumbrance, format: 'integer', stats: ['str', 'vit'], hint: 'Scaled STR + scaled VIT + 5' },
      ],
    },
  ];

  return groups;
}

export interface ElementalRow {
  element: ElementKey;
  attack: number;
  resistance: number;
  /** The stat this element's attack scales from; uppercased where it is shown. */
  stat: StatKey;
}

const ELEMENT_SOURCE: Record<ElementKey, StatKey> = {
  Fire: 'str', Ice: 'ski', Wind: 'cel', Earth: 'def', Dark: 'res',
  Water: 'vit', Light: 'fai', Lightning: 'luc', Acid: 'gui', Sound: 'san',
};

/**
 * The element a stat powers, read the other way round for the stat card.
 *
 * Inverted from the one table rather than written out twice: WIL and APT power no
 * element, and a second literal would be the place that eventually disagrees.
 */
export const ELEMENT_FOR_STAT = Object.fromEntries(
  Object.entries(ELEMENT_SOURCE).map(([element, stat]) => [stat, element as ElementKey]),
) as Partial<Record<StatKey, ElementKey>>;

export function elementalRows(evaluation: BuildEvaluation): ElementalRow[] {
  return ELEMENT_KEYS.map(element => ({
    element,
    attack: evaluation.elementalAttack[element],
    resistance: evaluation.elementalResistance[element],
    stat: ELEMENT_SOURCE[element],
  }));
}

export interface StatBreakdown {
  /** Everything the stat has before a point is spent, as its cap implies. */
  floor: number;
  /** Points allocated from the level pool. */
  invested: number;
  /** How many points this stat can still take under the hard cap. */
  cap: number;
  /** Class levels, gear, traits, food, APT, the rest of the raw total. */
  other: number;
  raw: number;
  scaled: number;
  /** Scaled less raw: what diminishing returns take off, zero below the soft cap. */
  returns: number;
}

/**
 * One stat, split into the four figures that explain its total.
 *
 * `evaluateBuild` reports the raw and scaled totals but not their provenance (a
 * dozen sources are summed inside it), so the middle term here is arithmetic
 * rather than attribution: whatever the raw total holds that the floor and the
 * allocation do not account for. That keeps the three parts adding up to the raw
 * total exactly, which is the property a breakdown has to have; it cannot name
 * the individual sources, and does not claim to.
 *
 * The floor comes from the cap rather than from the racial line, because the cap
 * is measured against the same pre-allocation total: subrace, base corrections,
 * Legend Extend, history and the star sign pick.
 */
export function statBreakdown(
  build: BuildState,
  evaluation: BuildEvaluation,
  stat: StatKey,
): StatBreakdown {
  const cap = evaluation.maxInvestedStats[stat];
  const floor = STAT_HARD_CAP - cap;
  const invested = build.addedStats[stat] ?? 0;
  const raw = evaluation.rawStats[stat];
  const scaled = evaluation.scaledStats[stat];
  return {
    floor,
    invested,
    cap,
    other: raw - floor - invested,
    raw,
    scaled,
    returns: scaled - raw,
  };
}

/**
 * The manual ATK / RES adjustment on one element, as a readable summary.
 *
 * The rail shows the finished figure, which means an adjustment is invisible in
 * it, and an unexplained number in a readout is worse than no number. Returns an
 * empty string when nothing is adjusted, so it doubles as the flag's condition.
 */
export function elementAdjustment(build: BuildState, element: ElementKey): string {
  const attack = build.elementalATKAdjustments[element] ?? 0;
  const resistance = build.elementalRESAdjustments[element] ?? 0;
  const parts: string[] = [];
  if (attack) parts.push(`${attack > 0 ? '+' : ''}${attack} ATK`);
  if (resistance) parts.push(`${resistance > 0 ? '+' : ''}${resistance}% RES`);
  return parts.join(', ');
}

export function formatReadout(value: number, format: ReadoutFormat): string {
  switch (format) {
    case 'percent':
      return `${value}%`;
    case 'signed-percent':
      return `${value >= 0 ? '+' : ''}${value}%`;
    default:
      return String(value);
  }
}

/** Scaled stats carry a fraction from diminishing returns; show at most one decimal. */
export { formatScaled } from '../../statFormat';
