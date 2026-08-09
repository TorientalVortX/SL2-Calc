import { useMemo } from 'react';
import { WEAPONS_BY_TYPE } from './data/weapons';
import modifierData from './data/content/weapon-modifiers.json';
import { SCALING_STATS, scalingForWeapon, weaponToConfig } from './domain/equipment';
import { evaluateWeaponSlot } from './domain/buildEvaluation';
import {
  resolveUpgradePoints,
  upgradePointsSpent,
  type StatRecord,
  type WeaponConfig,
  type WeaponUpgradePoints,
} from './types';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';

const MATERIALS = Object.keys(modifierData.materials as Record<string, unknown>);
const ENCHANTMENTS = Object.keys(modifierData.enchantments as Record<string, unknown>);
const PART_CATEGORIES = modifierData.partCategories as Record<string, string[]>;

/** The three part slots every weapon carries. */
const PART_SLOTS: Array<[label: string, key: 'part1' | 'part2' | 'part3']> = [
  ['Part 1', 'part1'],
  ['Part 2', 'part2'],
  ['Part 3', 'part3'],
];

const WEIGHT_MODS: Array<[label: string, key: 'weightPlus' | 'weightMinus']> = [
  ['Heavy (+)', 'weightPlus'],
  ['Light (−)', 'weightMinus'],
];
const WEAPON_TYPES = Object.keys(WEAPONS_BY_TYPE) as (keyof typeof WEAPONS_BY_TYPE)[];

/** The four channels upgrade points can be spent on. */
const CHANNELS: Array<[label: string, key: keyof WeaponUpgradePoints]> = [
  ['Power', 'power'],
  ['Critical', 'critical'],
  ['Accuracy', 'accuracy'],
  ['Durability', 'durability'],
];

/** Quality flags, with the bonus the maths actually applies. */
const QUALITIES: Array<[label: string, key: 'powerQuality' | 'critQuality' | 'hitQuality' | 'sentimentality']> = [
  ['Power quality (+2)', 'powerQuality'],
  ['Crit quality (+4)', 'critQuality'],
  ['Hit quality (+4)', 'hitQuality'],
  ['Sentimentality (+2 all)', 'sentimentality'],
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-11 font-medium text-content-muted">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  'w-full rounded-7 border border-edge bg-surface-raised px-3 py-2 text-13 text-content outline-none focus:border-edge-emphasis';

export interface WeaponDeckProps {
  config: WeaponConfig | undefined;
  onChange: (config: WeaponConfig) => void;
  stats: StatRecord;
  extraCritChance?: number;
}

/**
 * Weapon configuration — the centre column of the Weapon tab.
 *
 * Results come from `evaluateWeaponSlot`, the same assembly the build evaluation
 * uses, so this screen can never disagree with the rest of the app.
 */
export default function WeaponDeck({ config, onChange, stats, extraCritChance = 0 }: WeaponDeckProps) {
  const weaponsOfType = useMemo(
    () => (config ? WEAPONS_BY_TYPE[config.weaponType as keyof typeof WEAPONS_BY_TYPE] ?? [] : []),
    [config],
  );

  if (!config) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-15 font-semibold text-content">Weapon configuration</h2>
        <p className="rounded-11 border border-edge bg-surface-bar p-4 text-12 text-content-faint">
          No weapon equipped. Pick a type to begin.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEAPON_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                const first = WEAPONS_BY_TYPE[type][0];
                if (first) onChange(weaponToConfig(first, {}));
              }}
              className="rounded-7 border border-edge bg-surface-raised px-3 py-2 text-13 text-content-bright hover:border-edge-emphasis"
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const points = resolveUpgradePoints(config);
  const scalingTotal = SCALING_STATS.reduce((sum, stat) => sum + (config.customScaling[stat] ?? 0), 0);
  const spent = upgradePointsSpent(points);
  const result = evaluateWeaponSlot(config, stats, extraCritChance);
  const weapon = weaponsOfType.find(w => w.name === config.selectedWeaponName);

  const patch = (next: Partial<WeaponConfig>) => onChange({ ...config, ...next });
  // No budget: points are limited only by being non-negative.
  const setPoints = (key: keyof WeaponUpgradePoints, value: number) => {
    patch({ upgradePoints: { ...points, [key]: Math.max(0, value) } });
  };

  return (
    <div className={cx('flex flex-col gap-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-15 font-semibold text-content">Weapon configuration</h2>
          <p className="text-11 text-content-faint">Scaling reads live from your allocated stats.</p>
        </div>
      </div>

      <section className="rounded-11 border border-edge bg-surface-bar p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <DeckLabel className="text-info">Slot A</DeckLabel>
          {weapon && (
            <span className="font-mono text-11 text-content-faint">
              {weapon.name} · {weapon.damageType} · Range {weapon.range}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Field label="Type">
            <select
              className={selectClass}
              value={config.weaponType}
              onChange={e => {
                const first = WEAPONS_BY_TYPE[e.target.value as keyof typeof WEAPONS_BY_TYPE][0];
                if (first) onChange({ ...weaponToConfig(first, {}), upgradePoints: points });
              }}
            >
              {WEAPON_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Weapon">
            <select
              className={selectClass}
              value={config.selectedWeaponName ?? ''}
              onChange={e => {
                const picked = weaponsOfType.find(w => w.name === e.target.value);
                if (picked) onChange({ ...weaponToConfig(picked, {}), upgradePoints: points });
              }}
            >
              {/* Without an empty option a null weapon silently displays the first
                  entry, implying something is equipped when nothing is. */}
              {!config.selectedWeaponName && <option value="">— Select a weapon —</option>}
              {weaponsOfType.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>
          </Field>
        </div>

        {/* A weapon can scale several ways at once and the game adds them, so
            name every type and show the summed totals — quoting only the first
            entry understated 32 weapons, most of them tomes. */}
        {weapon?.scaling?.length ? (
          <p className="mt-2 font-mono text-11 text-content-faint">
            {weapon.scaling.map(entry => entry.type).join(' + ')} ·{' '}
            {SCALING_STATS
              .map(stat => [stat, scalingForWeapon(weapon)[stat]] as const)
              .filter(([, value]) => value !== 0)
              .map(([stat, value]) => `${stat.toUpperCase()} ${value}%`)
              .join(' · ')}
          </p>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
          <Field label="Material">
            <select className={selectClass} value={config.material} onChange={e => patch({ material: e.target.value })}>
              {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Enchantment">
            <select className={selectClass} value={config.enchantment} onChange={e => patch({ enchantment: e.target.value })}>
              {ENCHANTMENTS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="2H rank">
            <input
              type="number"
              min={0}
              max={5}
              value={config.twoHandedSkillRank}
              onChange={e => patch({ twoHandedSkillRank: Math.max(0, Math.min(5, Number(e.target.value))) })}
              className="w-full rounded-7 border border-edge bg-surface-raised px-3 py-2 text-center font-mono text-13 text-content outline-none focus:border-edge-emphasis"
            />
          </Field>
        </div>

        {/* Parts carry the same power/crit/hit/weight modifiers as materials and
            are grouped by the slot they fit, so the picker is optgrouped. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PART_SLOTS.map(([label, key]) => (
            <Field key={key} label={label}>
              <select
                className={selectClass}
                value={config[key]}
                onChange={e => patch({ [key]: e.target.value } as Partial<WeaponConfig>)}
              >
                {Object.entries(PART_CATEGORIES).map(([category, names]) => (
                  <optgroup key={category} label={category}>
                    {names.map(name => <option key={name} value={name}>{name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Field label="Rarity (0–10)">
            <input
              type="number"
              min={0}
              max={10}
              value={config.rarity}
              onChange={e => patch({ rarity: Math.max(0, Math.min(10, Number(e.target.value))) })}
              className="w-full rounded-7 border border-edge bg-surface-raised px-3 py-2 text-center font-mono text-13 text-content outline-none focus:border-edge-emphasis"
            />
          </Field>
          <Field label="Weight modifier">
            <div className="flex gap-2">
              {WEIGHT_MODS.map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={config[key]}
                  // The two are mutually exclusive: enabling one clears the other.
                  onClick={() => patch({
                    weightPlus: key === 'weightPlus' ? !config.weightPlus : false,
                    weightMinus: key === 'weightMinus' ? !config.weightMinus : false,
                  })}
                  className={cx(
                    'flex-1 rounded-7 border px-3 py-2 text-12 transition-colors',
                    config[key]
                      ? 'border-info bg-info-bg/50 text-content'
                      : 'border-edge text-content-muted hover:border-edge-emphasis',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Custom scaling. `customScaling` already drives evaluateWeaponSlot —
            it simply had no editor outside the legacy calculator. */}
        <div className="mt-4 border-t border-edge-faint pt-3">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <DeckLabel>Stat scaling</DeckLabel>
            <span className="flex items-baseline gap-2 font-mono text-11">
              <span className="text-content-faint">{scalingTotal}% total</span>
              {weapon && (
                <button
                  type="button"
                  onClick={() => patch({ customScaling: scalingForWeapon(weapon) })}
                  aria-label="Reset stat scaling to the weapon default"
                  className="text-info hover:text-info-soft"
                >
                  Reset
                </button>
              )}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-11">
            {SCALING_STATS.map(stat => (
              <label key={stat} className="flex flex-col gap-1">
                <span className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">
                  {stat}
                </span>
                <input
                  type="number"
                  aria-label={`${stat.toUpperCase()} scaling percent`}
                  value={config.customScaling[stat]}
                  onChange={e => patch({
                    customScaling: { ...config.customScaling, [stat]: Number(e.target.value) || 0 },
                  })}
                  className="w-full rounded-6 border border-edge bg-surface-base px-1.5 py-1 text-center font-mono text-12 text-content outline-none transition-colors hover:border-edge-strong focus:border-edge-emphasis"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-11 leading-relaxed text-content-faint">
            Percent of each scaled stat folded into weapon attack. Defaults come from the
            weapon's own scaling; edit for weapons whose scaling the data set does not carry.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUALITIES.map(([label, key]) => (
            <button
              key={key}
              type="button"
              aria-pressed={config[key]}
              onClick={() => patch({ [key]: !config[key] } as Partial<WeaponConfig>)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-12 transition-colors',
                config[key]
                  ? 'border-info bg-info-bg/50 text-content'
                  : 'border-edge text-content-muted hover:border-edge-emphasis',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Upgrade points */}
        <div className="mt-4 border-t border-edge-faint pt-3">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <DeckLabel>Upgrade points</DeckLabel>
            <span className="flex items-baseline gap-2 font-mono text-11">
              <span className="text-content-faint">{spent} spent</span>
              <button
                type="button"
                onClick={() => patch({ upgradePoints: { power: 0, critical: 0, accuracy: 0, durability: 0 } })}
                aria-label="Reset upgrade points"
                className="text-info hover:text-info-soft"
              >
                Reset
              </button>
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map(([label, key]) => (
              <div key={key} className="rounded-9 border border-edge bg-surface-base p-2.5">
                <div className="mb-1.5 text-11 text-content-muted">{label}</div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    title={`Decrease ${label.toLowerCase()}`}
                    aria-label={`Decrease ${label.toLowerCase()}`}
                    disabled={points[key] === 0}
                    onClick={() => setPoints(key, points[key] - 1)}
                    className="grid h-6 w-6 place-items-center rounded-6 bg-surface-control text-14 text-content-muted hover:bg-surface-active hover:text-content disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="font-mono text-13 font-semibold text-content">{points[key]}</span>
                  <button
                    type="button"
                    title={`Increase ${label.toLowerCase()}`}
                    aria-label={`Increase ${label.toLowerCase()}`}
                    onClick={() => setPoints(key, points[key] + 1)}
                    className="grid h-6 w-6 place-items-center rounded-6 bg-surface-control text-14 text-content-muted hover:bg-surface-active hover:text-content disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-11 leading-relaxed text-content-faint">
            Points replace the old blanket upgrade level — spend them where the build needs them.
            Builds saved before upgrade points keep their original stats by converting the old level
            into Power, Critical and Accuracy.
          </p>
        </div>
      </section>

      <section className="rounded-11 border border-edge bg-surface-bar p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <DeckLabel className={config.comparisonMode ? 'text-info' : undefined}>Slot B — comparison</DeckLabel>
          <button
            type="button"
            aria-pressed={Boolean(config.comparisonMode)}
            onClick={() => {
              const enabling = !config.comparisonMode;
              patch({
                comparisonMode: enabling,
                // Seed from slot A so the first comparison is like-for-like.
                secondaryWeapon: config.secondaryWeapon ?? { ...config },
              });
            }}
            className={cx(
              'rounded-full border px-3 py-1 text-11 transition-colors',
              config.comparisonMode
                ? 'border-info bg-info-bg/50 text-content'
                : 'border-edge text-content-muted hover:border-edge-emphasis',
            )}
          >
            {config.comparisonMode ? 'Comparing' : 'Compare two configs'}
          </button>
        </div>

        {config.comparisonMode && config.secondaryWeapon && (
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Field label="Type">
              <select
                className={selectClass}
                value={config.secondaryWeapon.weaponType}
                onChange={e => {
                  const first = WEAPONS_BY_TYPE[e.target.value as keyof typeof WEAPONS_BY_TYPE][0];
                  if (first) patch({ secondaryWeapon: weaponToConfig(first, {}) });
                }}
              >
                {WEAPON_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Weapon">
              <select
                className={selectClass}
                value={config.secondaryWeapon.selectedWeaponName ?? ''}
                onChange={e => {
                  const list = WEAPONS_BY_TYPE[config.secondaryWeapon!.weaponType as keyof typeof WEAPONS_BY_TYPE] ?? [];
                  const picked = list.find(w => w.name === e.target.value);
                  if (picked) patch({ secondaryWeapon: weaponToConfig(picked, {}) });
                }}
              >
                {!config.secondaryWeapon.selectedWeaponName && <option value="">— Select a weapon —</option>}
                {(WEAPONS_BY_TYPE[config.secondaryWeapon.weaponType as keyof typeof WEAPONS_BY_TYPE] ?? [])
                  .map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <Field label="Material">
                <select
                  className={selectClass}
                  value={config.secondaryWeapon.material}
                  onChange={e => patch({ secondaryWeapon: { ...config.secondaryWeapon!, material: e.target.value } })}
                >
                  {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Enchantment">
                <select
                  className={selectClass}
                  value={config.secondaryWeapon.enchantment}
                  onChange={e => patch({ secondaryWeapon: { ...config.secondaryWeapon!, enchantment: e.target.value } })}
                >
                  {ENCHANTMENTS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <p className="sm:col-span-2 text-11 leading-relaxed text-content-faint">
              Slot B is scored through the same assembly as slot A, so the result rail's
              A / B / Δ columns are comparable by construction.
            </p>
          </div>
        )}
      </section>

      <p className="sr-only" aria-live="polite">
        Scaled weapon attack {result.swa}
      </p>
    </div>
  );
}

export interface WeaponResultRailProps {
  config: WeaponConfig | undefined;
  stats: StatRecord;
  extraCritChance?: number;
}

/** "Scaled weapon attack" plus the full result table — the Weapon tab's right rail. */
export function WeaponResultRail({ config, stats, extraCritChance = 0 }: WeaponResultRailProps) {
  if (!config) {
    return <p className="text-11 text-content-faint">Equip a weapon to see its resolved stats.</p>;
  }
  const r = evaluateWeaponSlot(config, stats, extraCritChance);
  // Slot B is evaluated through the same assembly, so the columns are comparable
  // by construction rather than by two parallel implementations.
  const b = config.comparisonMode && config.secondaryWeapon
    ? evaluateWeaponSlot(config.secondaryWeapon, stats, extraCritChance)
    : null;

  const numbers = (result: typeof r): Array<[label: string, shown: string | number, value: number]> => (
    [
      ['Power', result.power],
      ['SWA', result.swa],
      ['Critical SWA', result.critSwa],
      ['Weapon critical', result.weaponCritical],
      ['Critical chance', result.crit],
      ['Crit damage', `${result.critDamageMod}%`],
      ['Weapon accuracy', result.weaponAccuracy],
      ['Hit', result.hit],
      ['Weight', result.weight],
      ['Durability', result.durability],
    ] as Array<[string, string | number]>
  ).map(([label, shown]) => [label, shown, Number(parseFloat(String(shown))) || 0]);
  const rowsA = numbers(r);
  const rowsB = b ? numbers(b) : null;

  return (
    <>
      <div>
        <DeckLabel>Scaled weapon attack</DeckLabel>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-mono text-26 font-bold tracking-tight-value text-info">{r.swa}</span>
          {b && (
            <span className="font-mono text-17 font-bold tracking-tight-value text-content-muted">
              vs {b.swa}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-9 border border-edge">
        <div className={cx(
          'grid items-baseline gap-2 border-b border-edge-faint bg-surface-sunken px-3 py-2',
          b ? 'grid-cols-[1fr_52px_52px_48px]' : 'grid-cols-[1fr_auto]',
        )}>
          <span className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">Result</span>
          <span className="text-right font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">A</span>
          {b && <span className="text-right font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">B</span>}
          {b && <span className="text-right font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">Δ</span>}
        </div>
        {rowsA.map(([label, value], index) => {
          const other = rowsB?.[index];
          const delta = other ? other[2] - rowsA[index][2] : 0;
          return (
            <div
              key={label}
              className={cx(
                'grid items-baseline gap-2 border-b border-edge-faint px-3 py-2 last:border-b-0',
                b ? 'grid-cols-[1fr_52px_52px_48px]' : 'grid-cols-[1fr_auto]',
              )}
            >
              <span className="text-12 text-content-secondary">{label}</span>
              <span className="text-right font-mono text-13 font-semibold text-content">{value}</span>
              {other && <span className="text-right font-mono text-13 font-semibold text-content-secondary">{other[1]}</span>}
              {other && (
                <span className={cx(
                  'text-right font-mono text-12 font-semibold',
                  delta > 0 ? 'text-positive' : delta < 0 ? 'text-negative' : 'text-content-ghost',
                )}>
                  {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-11 leading-relaxed text-content-faint">
        Scaling contribution is already inside Power. Critical chance adds SKI/2 and LUC;
        crit damage adds GUI.
      </p>
    </>
  );
}
