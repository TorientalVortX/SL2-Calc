import { useMemo, useState } from 'react';
import { ARMORS, ARMOR_TYPES } from './data/armors';
import { STAT_COLORS, onDark } from './data/colors';
import {
  BASE_DURABILITY,
  armorPointsSpent,
  type Armor,
  type ArmorUpgradePoints,
  type BuildEvaluation,
  type StatKey,
} from './types';
import { ARMOR_MATERIAL_CATEGORIES, ARMOR_MATERIALS_MODELLED } from './domain/armorMaterials';
import { ARMOR_ENCHANTMENT_NAMES, ARMOR_ENCHANTMENTS_MODELLED } from './domain/armorEnchantments';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';

type SortKey = 'name' | 'armor' | 'magicArmor' | 'evade' | 'weight' | 'rarity';

const COLUMNS: Array<[label: string, key: SortKey, numeric: boolean]> = [
  ['Armor', 'name', false],
  ['Arm', 'armor', true],
  ['M.Arm', 'magicArmor', true],
  ['Evd', 'evade', true],
  ['Wt', 'weight', true],
  ['Rar', 'rarity', true],
];

const CRAFT_SELECT =
  'w-full rounded-7 border border-edge bg-surface-bar px-2 py-1.5 text-12 text-content-bright transition-colors hover:border-edge-strong focus:border-edge-emphasis focus:outline-none';

const CHANNELS: Array<[label: string, key: keyof ArmorUpgradePoints]> = [
  ['Armor', 'armor'],
  ['Magic armor', 'magicArmor'],
  ['Evade', 'evade'],
  ['Durability', 'durability'],
];

export interface ArmorClassRailProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

/** The class filter — Heavy / Light / Unarmored with counts. */
export function ArmorClassRail({ selectedType, onSelectType }: ArmorClassRailProps) {
  const counts = useMemo(() => {
    const all = Object.values(ARMORS);
    return Object.fromEntries(ARMOR_TYPES.map(t => [t, all.filter(a => a.type === t).length]));
  }, []);

  return (
    <>
      <DeckLabel>Class</DeckLabel>
      <div className="flex flex-col gap-1">
        {ARMOR_TYPES.map(type => {
          const selected = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectType(type)}
              className={cx(
                'flex items-center justify-between rounded-7 px-3 py-2 text-13 transition-colors',
                selected
                  ? 'bg-info-bg/50 text-content'
                  : 'text-content-secondary hover:bg-surface-raised',
              )}
            >
              <span>{type}</span>
              <span className="font-mono text-11 text-content-ghost">{counts[type]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export interface ArmorTableProps {
  selectedType: string;
  equippedArmor: Armor | null;
  onEquip: (armor: Armor) => void;
  /**
   * `cards` stacks each armour into its own block with labelled figures. The
   * six-column table needs ~600px; at 390px the name column collapsed to a few
   * characters and the numbers lost their headers, which made the list unreadable.
   */
  layout?: 'table' | 'cards';
}

/** Sortable list of the armours in the selected class. */
export function ArmorTable({ selectedType, equippedArmor, onEquip, layout = 'table' }: ArmorTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'name', desc: false });

  const rows = useMemo(() => {
    const list = Object.values(ARMORS).filter(a => a.type === selectedType);
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === 'string' || typeof bv === 'string'
        ? String(av).localeCompare(String(bv))
        : Number(av) - Number(bv);
      return sort.desc ? -cmp : cmp;
    });
  }, [selectedType, sort]);

  if (layout === 'cards') {
    return (
      <div className="flex flex-col gap-2">
        {rows.length === 0 && <p className="text-12 text-content-faint">No armour of this class.</p>}
        {rows.map(armor => {
          const equipped = equippedArmor?.name === armor.name;
          return (
            <button
              key={armor.id ?? armor.name}
              type="button"
              aria-pressed={equipped}
              onClick={() => onEquip(armor)}
              className={cx(
                'flex w-full flex-col gap-2 rounded-9 border p-3 text-left transition-colors',
                equipped ? 'border-info bg-info-bg/30' : 'border-edge bg-surface-bar',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 text-13 font-semibold text-content-bright">{armor.name}</span>
                <span className="shrink-0 font-mono text-10 text-content-ghost">R{armor.rarity}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['Arm', armor.armor],
                  ['M.Arm', armor.magicArmor],
                  ['Evd', armor.evade],
                  ['Wt', armor.weight],
                ] as const).map(([label, value]) => (
                  <span key={label} className="flex items-baseline gap-1.5 rounded-6 bg-surface-base px-2 py-1">
                    <span className="text-10 font-medium text-content-faint">{label}</span>
                    <span className="font-mono text-12 font-semibold text-content">{value}</span>
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-9 border border-edge">
      <div className="grid grid-cols-[1fr_52px_60px_52px_48px_52px] border-b border-edge-faint bg-surface-sunken px-3 py-2">
        {COLUMNS.map(([label, key, numeric]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(s => ({ key, desc: s.key === key ? !s.desc : true }))}
            className={cx(
              'font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost hover:text-content-muted',
              numeric ? 'text-right' : 'text-left',
            )}
          >
            {label}{sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="px-3 py-4 text-12 text-content-faint">No armour of this class.</p>
      )}

      {rows.map(armor => {
        const equipped = equippedArmor?.name === armor.name;
        return (
          <button
            key={armor.id ?? armor.name}
            type="button"
            aria-pressed={equipped}
            onClick={() => onEquip(armor)}
            className={cx(
              'grid w-full grid-cols-[1fr_52px_60px_52px_48px_52px] items-center border-b border-edge-faint px-3 py-2.5 text-left last:border-b-0 transition-colors',
              equipped ? 'bg-info-bg/30' : 'hover:bg-surface-raised',
            )}
          >
            <span className="truncate text-13 text-content-bright">{armor.name}</span>
            <span className="text-right font-mono text-13 text-content">{armor.armor}</span>
            <span className="text-right font-mono text-13 text-content">{armor.magicArmor}</span>
            <span className="text-right font-mono text-13 text-content">{armor.evade}</span>
            <span className="text-right font-mono text-13 text-content-secondary">{armor.weight}</span>
            <span className="text-right font-mono text-11 text-content-ghost">R{armor.rarity}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface ArmorDetailRailProps {
  armor: Armor | null;
  points: ArmorUpgradePoints;
  onPointsChange: (points: ArmorUpgradePoints) => void;
  /** Which conditional effects the build is currently claiming. */
  conditionalStates?: Record<string, boolean>;
  onConditionalChange?: (key: string, enabled: boolean) => void;
  /** Crafting material for the torso. */
  material?: string;
  onMaterialChange?: (material: string) => void;
  /** Enchantment on the torso. */
  enchantment?: string;
  onEnchantmentChange?: (enchantment: string) => void;
  /** Evaluation of the build *without* this armour, for the before column. */
  before: BuildEvaluation;
  /** Evaluation of the build *with* it, for the after column. */
  after: BuildEvaluation;
}

/** Selected armour: description, effect on the build, upgrades, resistances, special. */
export function ArmorDetailRail({
  armor,
  points,
  onPointsChange,
  conditionalStates = {},
  onConditionalChange,
  material = 'None',
  onMaterialChange,
  enchantment = 'None',
  onEnchantmentChange,
  before,
  after,
}: ArmorDetailRailProps) {
  if (!armor) {
    return <p className="text-11 text-content-faint">Select an armour to see its effect on this build.</p>;
  }

  const conditionalBonuses = Object.entries(armor.conditionalBonuses ?? {});

  const spent = armorPointsSpent(points);
  // No budget: points are limited only by being non-negative.
  const setPoint = (key: keyof ArmorUpgradePoints, value: number) => {
    onPointsChange({ ...points, [key]: Math.max(0, value) });
  };

  const effects: Array<[label: string, from: number | string, to: number | string]> = [
    ['Armor', before.derived.armor, after.derived.armor],
    ['Magic armor', before.derived.magicArmor, after.derived.magicArmor],
    ['Evade', before.derived.evade, after.derived.evade],
    ['Durability', BASE_DURABILITY, BASE_DURABILITY + points.durability],
    ['Max HP', before.derived.maxHP, after.derived.maxHP],
    ['Max FP', before.derived.fp, after.derived.fp],
    [
      'Battle weight',
      `${before.derived.equipmentLoad}/${before.derived.battleWeight}`,
      `${after.derived.equipmentLoad}/${after.derived.battleWeight}`,
    ],
  ];

  const weightLeft = after.derived.battleWeightRemaining;

  return (
    <>
      <div>
        <h3 className="text-15 font-semibold text-content">{armor.name}</h3>
        {armor.details && (
          <p className="mt-1 text-11 leading-relaxed text-content-faint">{armor.details}</p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <DeckLabel>Effect on this build</DeckLabel>
        <div className="overflow-hidden rounded-9 border border-edge">
          {effects.map(([label, from, to]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 border-b border-edge-faint px-3 py-2 last:border-b-0">
              <span className="text-12 text-content-secondary">{label}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-11 text-content-ghost">{from}</span>
                <span className="text-10 text-edge-strong">→</span>
                <span className="font-mono text-13 font-semibold text-content">{to}</span>
              </span>
            </div>
          ))}
        </div>
        <p className={cx('rounded-7 px-3 py-2 text-11', weightLeft < 0 ? 'bg-negative-bg/30 text-negative-soft' : 'bg-surface-bar text-content-faint')}>
          {weightLeft < 0
            ? `Over battle weight by ${Math.abs(weightLeft)}.`
            : `${weightLeft} battle weight left for a weapon.`}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <DeckLabel>Upgrade points</DeckLabel>
          <span className="flex items-baseline gap-2 font-mono text-11">
            <span className="text-content-faint">{spent} spent</span>
            <button
              type="button"
              onClick={() => onPointsChange({ armor: 0, magicArmor: 0, evade: 0, durability: 0 })}
              aria-label="Reset armour upgrade points"
              className="text-info hover:text-info-soft"
            >
              Reset
            </button>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map(([label, key]) => (
            <div key={key} className="rounded-9 border border-edge bg-surface-bar p-2">
              <div className="mb-1 text-11 text-content-muted">{label}</div>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  title={`Decrease armour ${label.toLowerCase()}`}
                  aria-label={`Decrease armour ${label.toLowerCase()}`}
                  disabled={points[key] === 0}
                  onClick={() => setPoint(key, points[key] - 1)}
                  className="grid h-6 w-6 place-items-center rounded-6 bg-surface-control text-14 text-content-muted hover:bg-surface-active hover:text-content disabled:opacity-40"
                >
                  −
                </button>
                <span className="font-mono text-13 font-semibold text-content">{points[key]}</span>
                <button
                  type="button"
                  title={`Increase armour ${label.toLowerCase()}`}
                  aria-label={`Increase armour ${label.toLowerCase()}`}
                  onClick={() => setPoint(key, points[key] + 1)}
                  className="grid h-6 w-6 place-items-center rounded-6 bg-surface-control text-14 text-content-muted hover:bg-surface-active hover:text-content disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-11 leading-relaxed text-content-faint">
          Points apply to the selected piece and flow into the impact table above.
        </p>
      </section>

      {armor.statBonuses && Object.keys(armor.statBonuses).length > 0 && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Stat bonuses</DeckLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(armor.statBonuses)
              .filter(([, v]) => v)
              .map(([stat, value]) => (
                <span key={stat} className="rounded-6 bg-surface-bar px-2 py-1 text-11">
                  <span style={{ color: onDark(STAT_COLORS[stat as StatKey] ?? '#9aa6bf') }}>
                    {stat.toUpperCase()}
                  </span>{' '}
                  <span className="font-mono text-content-secondary">+{value}</span>
                </span>
              ))}
          </div>
        </section>
      )}

      {armor.resistances && Object.keys(armor.resistances).length > 0 && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Resistances</DeckLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(armor.resistances).map(([element, value]) => (
              <span key={element} className="rounded-6 bg-surface-bar px-2 py-1 text-11 text-content-secondary">
                {element}{' '}
                <span className={cx('font-mono font-semibold', value >= 0 ? 'text-positive' : 'text-negative')}>
                  {value >= 0 ? '+' : ''}{value}%
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {(onMaterialChange || onEnchantmentChange) && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Crafting</DeckLabel>

          {onMaterialChange && (
            <label className="flex flex-col gap-1.5">
              <span className="text-11 font-medium text-content-muted">Material</span>
              <select
                aria-label="Armour material"
                value={material}
                onChange={event => onMaterialChange(event.target.value)}
                className={CRAFT_SELECT}
              >
                {Object.entries(ARMOR_MATERIAL_CATEGORIES).map(([category, names]) => (
                  <optgroup key={category} label={category}>
                    {names.map(name => <option key={name} value={name}>{name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          {onEnchantmentChange && (
            <label className="flex flex-col gap-1.5">
              <span className="text-11 font-medium text-content-muted">Enchantment</span>
              <select
                aria-label="Armour enchantment"
                value={enchantment}
                onChange={event => onEnchantmentChange(event.target.value)}
                className={CRAFT_SELECT}
              >
                {ARMOR_ENCHANTMENT_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          )}

          {(!ARMOR_MATERIALS_MODELLED || !ARMOR_ENCHANTMENTS_MODELLED) && (
            <p className="text-10 leading-relaxed text-content-ghost">
              Both are recorded on the build and saved with it. Enchantment weight — Feather
              and the like — is applied. The armour/magic-armour/evade effects are not in the
              data set yet, so filling in
              <span className="font-mono"> domain/armorMaterials.ts </span>
              and
              <span className="font-mono"> domain/armorEnchantments.ts </span>
              makes them live with no other change.
            </p>
          )}
        </section>
      )}

      {conditionalBonuses.length > 0 && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Conditional effects</DeckLabel>
          <p className="text-10 leading-relaxed text-content-ghost">
            Only counted while their condition holds, so they are off by default.
          </p>
          <div className="flex flex-col gap-1.5">
            {conditionalBonuses.map(([key, bonus]) => {
              const on = conditionalStates[key] ?? false;
              // `condition` and `special` are prose; everything else is a stat delta.
              const deltas = Object.entries(bonus).filter(
                ([stat, value]) => stat !== 'condition' && stat !== 'special' && typeof value === 'number' && value !== 0,
              ) as Array<[string, number]>;
              return (
                <label
                  key={key}
                  className={cx(
                    'flex cursor-pointer flex-col gap-1.5 rounded-8 border p-2.5 transition-colors',
                    on ? 'border-caution/50 bg-surface-base' : 'border-edge bg-surface-bar hover:border-edge-emphasis',
                  )}
                >
                  <span className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={event => onConditionalChange?.(key, event.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-caution"
                    />
                    <span className="text-11 leading-relaxed text-content-secondary">{bonus.condition}</span>
                  </span>
                  {on && (deltas.length > 0 || bonus.special) && (
                    <span className="flex flex-wrap gap-1 pl-[22px]">
                      {deltas.map(([stat, value]) => (
                        <span key={stat} className="rounded-6 bg-surface-control px-1.5 py-0.5 font-mono text-10 text-content-secondary">
                          {stat.toUpperCase()} {value > 0 ? '+' : ''}{value}
                        </span>
                      ))}
                      {bonus.special && (
                        <span className="text-10 leading-relaxed text-magic">{bonus.special}</span>
                      )}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {armor.specialEffects && armor.specialEffects.length > 0 && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Special</DeckLabel>
          <ul className="flex flex-col gap-1">
            {armor.specialEffects.map(effect => (
              <li key={effect} className="flex gap-2 text-11 leading-relaxed text-content-secondary">
                <span className="text-magic">▪</span>
                {effect}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
