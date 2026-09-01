import { useEffect, useMemo, useRef, useState } from 'react';
import { equippedSlot3 } from '../../types';
import { Modal } from '../ui/Modal';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import {
  SLOTS,
  choicesForSlot,
  slotSummary,
  type ItemChoice,
  type Slot3Choice,
  type SlotId,
} from '../state/equipment';
import type { Builder } from '../state/useBuilder';
import { ArmorTuning, GearTuning, WeaponTuning } from './armoryTuning';

/**
 * The armory: pick an item for one slot, then tune it.
 *
 * Two panes rather than a wizard, because choosing and tuning are the same task:
 * a player comparing two swords wants the upgrade tracks they have already set to
 * still be there when they switch back.
 *
 * Slot 3 is the one that needs a mode switch: it takes a hands piece *or* an
 * off-hand weapon, and the choice of which changes the whole item list.
 */
export function ArmoryDialog({ builder, slot, onClose }: { builder: Builder; slot: SlotId; onClose: () => void }) {
  const { build, evaluation, dispatch } = builder;
  const descriptor = SLOTS.find(entry => entry.id === slot)!;
  const [query, setQuery] = useState('');
  const onKeys = useListNavigation(1);

  const [mode, setMode] = useState<Slot3Choice>(
    () => (equippedSlot3(build.equipment) === 'offHandWeapon' ? 'offHandWeapon' : 'hands'),
  );

  const summary = slotSummary(build.equipment, slot);
  const choices = useMemo(() => choicesForSlot(slot, mode, build), [slot, mode, build]);

  /*
   * Bring the equipped item into view when the dialog opens.
   *
   * The accessory list is 115 rows and the weapon list 339; without this, opening
   * a filled slot shows the top of the list and the current item is nowhere on
   * screen. Deliberately on open only: re-running it on every selection would
   * pull the list out from under the pointer as items are tried.
   */
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.entry.is-taken')?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const matched = needle
      ? choices.filter(choice => choice.name.toLowerCase().includes(needle) || choice.detail.toLowerCase().includes(needle))
      : choices;
    const byGroup = new Map<string, ItemChoice[]>();
    for (const choice of matched) {
      const list = byGroup.get(choice.group) ?? [];
      list.push(choice);
      byGroup.set(choice.group, list);
    }
    return [...byGroup.entries()];
  }, [choices, needle]);

  const equip = (name: string | null) => {
    play(name ? 'confirm' : 'back');
    switch (slot) {
      case 'primaryWeapon':
        dispatch({ type: 'equip-weapon', which: 'primaryWeapon', weaponName: name });
        break;
      case 'armor':
        dispatch({ type: 'equip-armor', armorName: name });
        break;
      case 'slot3':
        if (mode === 'offHandWeapon') dispatch({ type: 'equip-weapon', which: 'offHandWeapon', weaponName: name });
        else dispatch({ type: 'equip-gear', slot: 'hands', itemName: name });
        break;
      default:
        dispatch({ type: 'equip-gear', slot, itemName: name });
    }
  };

  const weapon = evaluation.primaryWeapon;

  return (
    <Modal
      title={`Armory · ${descriptor.label}`}
      onClose={onClose}
      wide
      flush
      footer={
        <>
          <span className="chip chip--gold">{summary.name ?? 'Nothing equipped'}</span>
          {slot === 'primaryWeapon' && weapon ? (
            <span className="inline" style={{ gap: 5 }}>
              <span className="chip">PWR {weapon.power}</span>
              <span className="chip">HIT {weapon.hit}</span>
              <span className="chip">CRT {weapon.critical}%</span>
              <span className="chip">WT {weapon.weight}</span>
            </span>
          ) : null}
          <div className="spacer" />
          {summary.name ? (
            <button type="button" className="btn btn--danger" onClick={() => equip(null)}>Unequip</button>
          ) : null}
          <button type="button" className="btn btn--primary" onClick={onClose}>Done</button>
        </>
      }
    >
      <div className="armory">
        <div className="armory__browse">
          <div className="filters" style={{ marginBottom: 0 }}>
            <input
              className="search"
              type="search"
              placeholder={`Search ${descriptor.label.toLowerCase()}…`}
              value={query}
              onChange={event => setQuery(event.target.value)}
              aria-label={`Search items for ${descriptor.label}`}
            />
          </div>

          {slot === 'slot3' ? (
            <div className="tabs" style={{ padding: '6px 0' }}>
              {([['hands', 'Hands & Shields'], ['offHandWeapon', 'Off-hand weapon']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`tab ${mode === value ? 'is-active' : ''}`}
                  onClick={() => { play('select'); setMode(value); }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="armory__list scroll" ref={listRef} onKeyDown={onKeys}>
            {groups.length === 0 ? (
              <div className="empty">
                <span className="eyebrow">No match</span>
                <span>Nothing in this slot matches “{query}”.</span>
              </div>
            ) : groups.map(([group, items]) => (
              <div key={group} className="stack--tight" style={{ marginBottom: 8 }}>
                <div className="eyebrow" style={{ padding: '5px 9px 2px', fontSize: 9 }}>
                  {group} <span className="dim">{items.length}</span>
                </div>
                {items.map(choice => (
                  <button
                    key={choice.name}
                    type="button"
                    data-nav
                    className={`entry ${summary.name === choice.name ? 'is-taken' : ''}`}
                    title={choice.restriction ?? choice.detail}
                    onClick={() => equip(choice.name)}
                  >
                    <span className="entry__main">
                      <span className="entry__name">
                        {choice.name}
                        {choice.restriction ? <span className="chip" title={choice.restriction}>restricted</span> : null}
                        {/* A weapon the main class does not list, made legal by a
                            talent; without this the row looks like a failed check. */}
                        {choice.unlockedBy ? (
                          <span className="chip chip--gold" title={`${choice.unlockedBy} opens this weapon regardless of class`}>
                            {choice.unlockedBy}
                          </span>
                        ) : null}
                      </span>
                      <span className="entry__sub">{choice.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="armory__tune scroll">
          {!summary.name ? (
            <div className="empty">
              <span className="eyebrow">{descriptor.label}</span>
              <span>{descriptor.hint}</span>
              <span className="dim">Choose an item to set its material, upgrades and effects.</span>
            </div>
          ) : slot === 'primaryWeapon' ? (
            <WeaponTuning builder={builder} which="primaryWeapon" />
          ) : slot === 'armor' ? (
            <ArmorTuning builder={builder} />
          ) : slot === 'slot3' ? (
            mode === 'offHandWeapon'
              ? <WeaponTuning builder={builder} which="offHandWeapon" />
              : <GearTuning builder={builder} slot="hands" slotId="slot3" />
          ) : (
            <GearTuning builder={builder} slot={slot} slotId={slot} />
          )}
        </div>
      </div>
    </Modal>
  );
}
