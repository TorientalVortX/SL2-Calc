import { useMemo } from 'react';
import { GEAR_BY_GROUP, SLOT3_GEAR, gearByName } from './data/gear';
import { STAT_COLORS, onDark } from './data/colors';
import type { GearGroup, GearItem } from './types';
import { OTHER_MATERIAL_CATEGORIES, OTHER_MATERIALS_MODELLED } from './domain/armorMaterials';
import { enchantmentNamesForSlot, type EnchantSlot } from './domain/armorEnchantments';
import { clampRoll, gearEffects, itemConditionalKey, itemRollKey, valueAtUL } from './domain/itemEffects';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import ItemPicker, { type PickerRow } from './ItemPicker';

const SELECT =
  'w-full rounded-7 border border-edge bg-surface-bar px-2 py-1.5 text-12 text-content-bright transition-colors hover:border-edge-strong focus:border-edge-emphasis focus:outline-none';

/**
 * One of the four slots this deck edits, and everything that differs between
 * them: what it can hold, what its two upgrade tracks are called, and which
 * enchantment profile it reads.
 *
 * Accessories take a material but no enchantment of their own, and their two
 * tracks (Fortune and Greed) are drop-rate qualities rather than combat stats,
 * so the deck says so rather than implying they feed the numbers.
 */
export type GearSlotKey = 'hands' | 'legs' | 'accessory1' | 'accessory2';

interface SlotSpec {
  label: string;
  items: GearItem[];
  /** `[stateKey, label]` for each of the slot's two upgrade tracks. */
  tracks: Array<[key: string, label: string]>;
  enchantSlot: EnchantSlot | null;
  /** Why the tracks do not move any number, when they do not. */
  trackNote: string;
}

const SLOTS: Record<GearSlotKey, SlotSpec> = {
  hands: {
    label: 'Slot 3 · Hands',
    items: SLOT3_GEAR,
    tracks: [['hit', 'Hit'], ['fp', 'Max FP']],
    enchantSlot: 'Hands',
    trackNote: 'Hit applies to your main weapon.',
  },
  legs: {
    label: 'Slot 4 · Legs',
    items: GEAR_BY_GROUP.Legs,
    tracks: [['hp', 'Max HP'], ['evade', 'Evade']],
    enchantSlot: 'Legs',
    trackNote: '',
  },
  accessory1: {
    label: 'Slot 5 · Accessory',
    items: GEAR_BY_GROUP.Accessory,
    tracks: [['fortune', 'Fortune'], ['greed', 'Greed']],
    enchantSlot: 'Accessory',
    trackNote: 'Fortune and Greed change item and murai drops, not combat stats.',
  },
  accessory2: {
    label: 'Slot 6 · Accessory',
    items: GEAR_BY_GROUP.Accessory,
    tracks: [['fortune', 'Fortune'], ['greed', 'Greed']],
    enchantSlot: 'Accessory',
    trackNote: 'Fortune and Greed change item and murai drops, not combat stats.',
  },
};

export interface GearSlotValue {
  itemName: string | null;
  material?: string;
  enchantment?: string;
  upgradePoints: Record<string, number>;
}

/**
 * Bridges the stored slot types and this deck's generic one.
 *
 * `HandsSlotState` and friends name their two tracks exactly (`{hit, fp}`,
 * `{hp, evade}`), which is what keeps a legs slot from being saved with a `hit`
 * value. This deck is generic over all four, so it works in the open
 * `Record<string, number>` those exact types have no index signature for.
 *
 * The two representations hold the same data and the deck only ever writes the
 * keys its own `spec.tracks` names, so the conversion is a re-labelling rather
 * than a change. It lives here, in one place, instead of a cast at each call.
 */
export const asDeckSlot = (slot: unknown): GearSlotValue | undefined => slot as GearSlotValue | undefined;

/** The inverse, for handing an edited slot back to the typed loadout. */
export const asStoredSlot = <T,>(value: GearSlotValue | undefined): T | undefined => value as T | undefined;

export interface GearDeckProps {
  slot: GearSlotKey;
  value: GearSlotValue | undefined;
  onChange: (next: GearSlotValue | undefined) => void;
  /** Chosen roll per ranged value, shared across every slot. */
  rolls: Record<string, number>;
  onRollsChange: (next: Record<string, number>) => void;
  /** Opt-in conditional effects, shared with the armour controls. */
  conditionals: Record<string, boolean>;
  onConditionalChange: (key: string, enabled: boolean) => void;
  /** The name held by the *other* accessory slot, which this one may not repeat. */
  unavailableName?: string | null;
}

/** A readable label for an effect channel: `magicArmor` -> `MAGIC ARMOR`. */
const channelLabel = (key: string) => key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();

export default function GearDeck({
  slot,
  value,
  onChange,
  rolls,
  onRollsChange,
  conditionals,
  onConditionalChange,
  unavailableName,
}: GearDeckProps) {
  const spec = SLOTS[slot];
  const item = gearByName(value?.itemName);
  const points = value?.upgradePoints ?? Object.fromEntries(spec.tracks.map(([key]) => [key, 0]));
  const spent = Object.values(points).reduce((total, n) => total + n, 0);
  const effects = useMemo(() => gearEffects(value?.itemName), [value?.itemName]);

  /*
   * Items are keyed by name because that is what a build stores, so the picker's
   * `id` is the name too and no lookup is needed on the way back.
   */
  const pickerRows: PickerRow[] = useMemo(() => spec.items.map(option => ({
    id: option.name,
    name: option.name,
    rarity: option.rarity,
    tag: option.material,
    detail: option.details,
    keywords: option.flavour,
    // The same accessory cannot go in both slots.
    disabled: option.name === unavailableName,
    disabledNote: 'Equipped in the other accessory slot.',
  })), [spec.items, unavailableName]);

  /** Materials this piece can take: its own class, filtered to those with an Other profile. */
  const materialNames = useMemo(() => {
    const all = Object.values(OTHER_MATERIAL_CATEGORIES).flat();
    return ['None', ...all];
  }, []);

  const enchantmentNames = useMemo(
    () => (spec.enchantSlot ? enchantmentNamesForSlot(spec.enchantSlot) : []),
    [spec.enchantSlot],
  );

  const patch = (next: Partial<GearSlotValue>) => {
    onChange({
      itemName: value?.itemName ?? null,
      material: value?.material,
      enchantment: value?.enchantment,
      upgradePoints: points,
      ...next,
    });
  };

  const setPoint = (key: string, raw: number) => {
    patch({ upgradePoints: { ...points, [key]: Math.max(0, Math.floor(raw) || 0) } });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <DeckLabel>{spec.label}</DeckLabel>
          {item && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="font-mono text-11 text-info hover:text-info-soft"
            >
              Unequip
            </button>
          )}
        </div>
        <ItemPicker
          rows={pickerRows}
          label={spec.label}
          selected={value?.itemName ?? null}
          onPick={name => {
            if (!name) { onChange(undefined); return; }
            // A new item resets the upgrade spend: the points belonged to the
            // piece that was there, not to the slot.
            onChange({
              itemName: name,
              material: 'None',
              enchantment: 'None',
              upgradePoints: Object.fromEntries(spec.tracks.map(([key]) => [key, 0])),
            });
          }}
        />
        {item?.flavour && <p className="text-11 italic leading-relaxed text-content-faint">{item.flavour}</p>}
      </section>

      {item && (
        <>
          <section className="flex flex-col gap-2">
            <DeckLabel>Effects</DeckLabel>
            <div className="flex flex-col gap-1.5">
              {effects.map((effect, effectIndex) => {
                const key = itemConditionalKey(item.name, effectIndex);
                const enabled = effect.applies === 'always' || Boolean(conditionals[key]);
                return (
                  <div key={key} className="rounded-8 border border-edge bg-surface-bar p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-11 leading-relaxed text-content-secondary">{effect.description}</p>
                      {effect.applies === 'conditional' && (
                        <label className="flex shrink-0 items-center gap-1 text-10 text-content-faint">
                          <input
                            type="checkbox"
                            checked={Boolean(conditionals[key])}
                            onChange={event => onConditionalChange(key, event.target.checked)}
                          />
                          Applies
                        </label>
                      )}
                      {effect.applies === 'reference' && (
                        <span className="shrink-0 rounded-6 bg-surface-control px-1.5 py-0.5 text-10 text-content-faint">
                          Not modelled
                        </span>
                      )}
                    </div>

                    {effect.effects.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {effect.effects.map((valueSpec, valueIndex) => {
                          const rollKey = itemRollKey(item.name, effectIndex, valueIndex);
                          const amount = valueAtUL(valueSpec, spent, rolls[rollKey]);
                          return (
                            <span
                              key={rollKey}
                              className={cx(
                                'rounded-6 px-1.5 py-0.5 font-mono text-10',
                                enabled ? 'bg-surface-control text-content-secondary' : 'bg-surface-control text-content-faint line-through',
                              )}
                            >
                              {channelLabel(valueSpec.key)} {amount >= 0 ? '+' : ''}{amount}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/*
                      * A rolled range is per-item RNG: the copy the player owns
                      * landed somewhere in it. Only they know where, so the
                      * range is offered as a control rather than assumed.
                      */}
                    {effect.effects.some(v => v.rollMax !== undefined) && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {effect.effects.map((valueSpec, valueIndex) => {
                          if (valueSpec.rollMax === undefined) return null;
                          const rollKey = itemRollKey(item.name, effectIndex, valueIndex);
                          const current = clampRoll(valueSpec, rolls[rollKey]);
                          return (
                            <label key={rollKey} className="flex items-center gap-2 text-10 text-content-faint">
                              <span className="w-20 shrink-0">{channelLabel(valueSpec.key)} roll</span>
                              <input
                                type="range"
                                min={valueSpec.base}
                                max={valueSpec.rollMax}
                                step={1}
                                value={current}
                                aria-label={`${item.name} ${channelLabel(valueSpec.key)} roll`}
                                onChange={event => onRollsChange({ ...rolls, [rollKey]: Number(event.target.value) })}
                                className="flex-1"
                              />
                              <span className="w-14 shrink-0 text-right font-mono text-content-secondary">
                                {current} of {valueSpec.rollMax}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <DeckLabel>Upgrade points</DeckLabel>
              <span className="flex items-baseline gap-2 font-mono text-11">
                <span className="text-content-faint">{spent} spent</span>
                <button
                  type="button"
                  onClick={() => patch({ upgradePoints: Object.fromEntries(spec.tracks.map(([key]) => [key, 0])) })}
                  aria-label={`Reset ${spec.label} upgrade points`}
                  className="text-info hover:text-info-soft"
                >
                  Reset
                </button>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {spec.tracks.map(([key, label]) => (
                <div key={key} className="rounded-9 border border-edge bg-surface-bar p-2">
                  <div className="mb-1 text-11 text-content-muted">{label}</div>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease ${label}`}
                      disabled={(points[key] ?? 0) === 0}
                      onClick={() => setPoint(key, (points[key] ?? 0) - 1)}
                      className="grid h-6 w-6 place-items-center rounded-6 bg-surface-control text-14 text-content-muted hover:bg-surface-active hover:text-content disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="font-mono text-13 font-semibold text-content">{points[key] ?? 0}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${label}`}
                      onClick={() => setPoint(key, (points[key] ?? 0) + 1)}
                      className="grid h-6 w-6 place-items-center rounded-6 bg-surface-control text-14 text-content-muted hover:bg-surface-active hover:text-content"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-11 leading-relaxed text-content-faint">
              Each point is worth +1. {spec.trackNote}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <DeckLabel>Crafting</DeckLabel>
            <div className={cx('grid gap-2', spec.enchantSlot ? 'grid-cols-2' : 'grid-cols-1')}>
              <label className="flex flex-col gap-1">
                <span className="text-11 text-content-muted">Material</span>
                <select
                  className={SELECT}
                  value={value?.material ?? 'None'}
                  onChange={event => patch({ material: event.target.value })}
                >
                  {materialNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              {spec.enchantSlot && (
                <label className="flex flex-col gap-1">
                  <span className="text-11 text-content-muted">Enchantment</span>
                  <select
                    className={SELECT}
                    value={value?.enchantment ?? 'None'}
                    onChange={event => patch({ enchantment: event.target.value })}
                  >
                    {enchantmentNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <p className="text-11 leading-relaxed text-content-faint">
              {item.material
                ? <>This piece is <span className="text-content-secondary">{item.material}</span>, so it takes materials of that class.{' '}</>
                : null}
              {OTHER_MATERIALS_MODELLED
                ? 'A material on this slot uses its Other profile, which is usually a resistance.'
                : 'Material effects for this slot are not modelled yet.'}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

/** The compact per-slot summary the loadout rail shows for a filled slot. */
export function gearSlotSummary(item: GearItem | undefined, points: Record<string, number> | undefined): string {
  if (!item) return 'Empty';
  const spent = Object.values(points ?? {}).reduce((total, n) => total + n, 0);
  return spent ? `${item.rarity}★ · ${spent} pts` : `${item.rarity}★`;
}

/** Stat colouring reused by the loadout summary, kept next to the deck that owns it. */
export function statSwatch(stat: string): string {
  return onDark(STAT_COLORS[stat as keyof typeof STAT_COLORS] ?? '#9aa6bf');
}

export { GEAR_BY_GROUP, type GearGroup };
