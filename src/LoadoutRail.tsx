import { gearByName } from './data/gear';
import type { BuildEquipmentState, BuildEvaluation, GearLoadout, WeaponConfig } from './types';
import { hasDuplicateAccessory } from './types';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import { activeSets } from './domain/itemSets';

/**
 * The six equipment slots, as one picker.
 *
 *   1  Primary weapon
 *   2  Armor
 *   3  Hands, or a second weapon instead
 *   4  Legs
 *   5  Accessory
 *   6  Accessory
 *
 * Slot 3 is the only one that can hold two different kinds of thing, so it is
 * the only one with a mode switch. Everything else is a straight pick.
 */
export type LoadoutSlot = 'weapon' | 'armor' | 'hands' | 'legs' | 'accessory1' | 'accessory2';

const SLOT_ORDER: Array<{ slot: LoadoutSlot; abbr: string; number: number }> = [
  { slot: 'weapon', abbr: 'WPN', number: 1 },
  { slot: 'armor', abbr: 'ARM', number: 2 },
  { slot: 'hands', abbr: 'HND', number: 3 },
  { slot: 'legs', abbr: 'LEG', number: 4 },
  { slot: 'accessory1', abbr: 'AC1', number: 5 },
  { slot: 'accessory2', abbr: 'AC2', number: 6 },
];

export interface LoadoutRailProps {
  active: LoadoutSlot;
  onSelect: (slot: LoadoutSlot) => void;
  gear: GearLoadout;
  onGearChange: (next: GearLoadout) => void;
  /**
   * Which of slot 3's two kinds the user is editing.
   *
   * Held above this component rather than derived from the loadout, because the
   * user can switch to off-hand before picking a weapon, and an "off-hand mode
   * with nothing in it" is not representable in the build itself, nor should it
   * be, since an empty slot is an empty slot either way.
   */
  slot3Mode: 'hands' | 'offHandWeapon';
  onSlot3ModeChange: (mode: 'hands' | 'offHandWeapon') => void;
  weapon?: WeaponConfig;
  armorName: string | null;
  evaluation: BuildEvaluation;
  /** The whole loadout, for set bonuses that span every slot. */
  equipment?: BuildEquipmentState;
}

/** What a slot currently holds, for the tile's second line. */
function occupantOf(slot: LoadoutSlot, props: LoadoutRailProps): string {
  const { gear, weapon, armorName } = props;
  switch (slot) {
    case 'weapon': return weapon?.selectedWeaponName ?? 'Empty';
    case 'armor': return armorName ?? 'Empty';
    case 'hands':
      return gear.offHandWeapon
        ? gear.offHandWeapon.selectedWeaponName ?? 'Off-hand weapon'
        : gear.hands?.itemName ?? 'Empty';
    case 'legs': return gear.legs?.itemName ?? 'Empty';
    case 'accessory1': return gear.accessory1?.itemName ?? 'Empty';
    case 'accessory2': return gear.accessory2?.itemName ?? 'Empty';
  }
}

/** The upgrade spend on a slot, for the tile's third line. */
function spendOf(slot: LoadoutSlot, gear: GearLoadout): number {
  const points = slot === 'hands' ? gear.hands?.upgradePoints
    : slot === 'legs' ? gear.legs?.upgradePoints
      : slot === 'accessory1' ? gear.accessory1?.upgradePoints
        : slot === 'accessory2' ? gear.accessory2?.upgradePoints
          : undefined;
  if (!points) return 0;
  return Object.values(points).reduce<number>((total, value) => total + (Number(value) || 0), 0);
}

export default function LoadoutRail(props: LoadoutRailProps) {
  const { active, onSelect, gear, onGearChange, evaluation, slot3Mode, onSlot3ModeChange } = props;
  const usingOffHand = slot3Mode === 'offHandWeapon';
  const duplicateAccessory = hasDuplicateAccessory({
    armorName: null, armorConditionalBonuses: {}, ...gear,
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <DeckLabel>Loadout</DeckLabel>
        <div className="grid grid-cols-2 gap-2">
          {SLOT_ORDER.map(({ slot, abbr, number }) => {
            const occupant = occupantOf(slot, props);
            const filled = occupant !== 'Empty';
            const spend = spendOf(slot, gear);
            const label = slot === 'hands' && usingOffHand ? 'OFF' : abbr;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onSelect(slot)}
                aria-pressed={active === slot}
                className={cx(
                  'flex flex-col items-start gap-0.5 rounded-9 border p-2 text-left transition-colors',
                  active === slot
                    ? 'border-edge-emphasis bg-surface-active'
                    : 'border-edge bg-surface-bar hover:border-edge-strong',
                )}
              >
                <span className="font-mono text-9 text-content-faint">{number}</span>
                <span className={cx('font-mono text-12 font-semibold', filled ? 'text-content-bright' : 'text-content-faint')}>
                  {label}
                </span>
                <span className="line-clamp-2 w-full text-10 leading-snug text-content-muted">{occupant}</span>
                {spend > 0 && <span className="font-mono text-9 text-content-faint">{spend} pts</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/*
        * Slot 3's mode switch. Choosing an off-hand weapon displaces the hands
        * piece rather than sitting beside it, which is why this is a switch and
        * not a second slot.
        */}
      {active === 'hands' && (
        <section className="flex flex-col gap-2">
          <DeckLabel>Slot 3 holds</DeckLabel>
          <div className="grid grid-cols-2 gap-1 rounded-9 border border-edge bg-surface-bar p-1">
            {/*
              * Each switch clears the other side. The two are alternatives, so
              * leaving the previous one in place would let a build carry both
              * and make "what is in slot 3" ambiguous.
              */}
            <button
              type="button"
              aria-pressed={!usingOffHand}
              onClick={() => { onSlot3ModeChange('hands'); onGearChange({ ...gear, offHandWeapon: undefined }); }}
              className={cx(
                'rounded-7 px-2 py-1.5 text-11 font-semibold transition-colors',
                usingOffHand ? 'text-content-muted hover:text-content' : 'bg-surface-active text-content-bright',
              )}
            >
              Hands item
            </button>
            <button
              type="button"
              aria-pressed={usingOffHand}
              onClick={() => { onSlot3ModeChange('offHandWeapon'); onGearChange({ ...gear, hands: undefined }); }}
              className={cx(
                'rounded-7 px-2 py-1.5 text-11 font-semibold transition-colors',
                usingOffHand ? 'bg-surface-active text-content-bright' : 'text-content-muted hover:text-content',
              )}
            >
              Off-hand weapon
            </button>
          </div>
          <p className="text-11 leading-relaxed text-content-faint">
            {usingOffHand
              ? 'Slot 3 holds a second weapon, so no hands piece is equipped.'
              : 'Slot 3 holds a hands piece. Switch it to an off-hand weapon to dual wield.'}
          </p>
        </section>
      )}

      {duplicateAccessory && (
        <p className="rounded-8 border border-negative-edge bg-surface-bar p-2 text-11 leading-relaxed text-negative">
          Both accessory slots hold the same item. The game does not allow that.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <DeckLabel>Loadout summary</DeckLabel>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['Armor', evaluation.derived.armor],
            ['M.Armor', evaluation.derived.magicArmor],
            ['Evade', evaluation.derived.evade],
          ] as const).map(([label, amount]) => (
            <div key={label} className="rounded-9 border border-edge bg-surface-bar p-2">
              <div className="text-10 text-content-muted">{label}</div>
              <div className="font-mono text-14 font-semibold text-content-bright">{amount}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-9 border border-edge bg-surface-bar p-2">
            <div className="text-10 text-content-muted">Max HP</div>
            <div className="font-mono text-14 font-semibold text-content-bright">{evaluation.derived.maxHP}</div>
          </div>
          <div className="rounded-9 border border-edge bg-surface-bar p-2">
            <div className="text-10 text-content-muted">Max FP</div>
            <div className="font-mono text-14 font-semibold text-content-bright">{evaluation.derived.fp}</div>
          </div>
        </div>
      </section>

      {/*
        * Everything slots 3-6 are contributing right now, gathered in one place.
        * Their items have no stat columns, so without this the only sign a slot
        * is doing anything is the totals moving.
        */}
      <GearContributions gear={gear} />
      <SetBonuses equipment={props.equipment} />
    </div>
  );
}

/**
 * Set bonuses for what the build is wearing.
 *
 * Bonuses stay as the wiki's own words. Almost none of them are a stat the
 * calculator has a channel for, "Grants access to the Double Dao skill",
 * "Flee success rate is (normal success rate+50)%", so they are shown rather
 * than folded into the numbers, and a set the build has only one piece of is
 * listed too, because that is when knowing the next threshold matters most.
 */
function SetBonuses({ equipment }: { equipment: BuildEquipmentState | undefined }) {
  const sets = activeSets(equipment);
  if (!sets.length) return null;

  return (
    <section className="flex flex-col gap-2">
      <DeckLabel>Set bonuses</DeckLabel>
      <div className="flex flex-col gap-2">
        {sets.map(set => (
          <div key={set.name} className="rounded-8 border border-edge bg-surface-bar p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-11 font-semibold text-content-bright">{set.name}</span>
              <span className={cx('shrink-0 font-mono text-10', set.active.length ? 'text-positive' : 'text-content-faint')}>
                {set.equipped}/{set.total}
              </span>
            </div>
            {set.active.map(threshold => (
              <p key={threshold.count} className="mt-1 text-10 leading-snug text-content-secondary">
                <span className="font-mono text-positive">{threshold.count}+</span> {threshold.description}
              </p>
            ))}
            {set.upcoming.slice(0, 1).map(threshold => (
              <p key={threshold.count} className="mt-1 text-10 leading-snug text-content-faint">
                <span className="font-mono">{threshold.count}+</span> {threshold.description}
              </p>
            ))}
            {set.note && (
              <p className="mt-1 text-10 leading-snug text-content-secondary">{set.note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function GearContributions({ gear }: { gear: GearLoadout }) {
  const filled = ([
    ['Hands', gear.offHandWeapon ? undefined : gear.hands?.itemName],
    ['Legs', gear.legs?.itemName],
    ['Acc I', gear.accessory1?.itemName],
    ['Acc II', gear.accessory2?.itemName],
  ] as const).filter(([, name]) => Boolean(name));

  if (!filled.length) return null;

  return (
    <section className="flex flex-col gap-2">
      <DeckLabel>Slots 3–6</DeckLabel>
      <div className="flex flex-col gap-1">
        {filled.map(([label, name]) => {
          const item = gearByName(name);
          return (
            <div key={label} className="flex items-baseline justify-between gap-2 rounded-8 bg-surface-bar px-2 py-1.5">
              <span className="shrink-0 font-mono text-10 text-content-faint">{label}</span>
              <span className="line-clamp-1 flex-1 text-right text-11 text-content-secondary">{item?.name}</span>
              {item?.material && (
                <span className="shrink-0 rounded-6 bg-surface-control px-1.5 py-0.5 text-9 text-content-faint">
                  {item.material}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
