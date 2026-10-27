import { useMemo, useState } from 'react';
import { equippedSlot3 } from '../../types';
import { SectionHead } from '../ui/Panel';
import { SlotGlyph } from '../ui/SlotGlyph';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import { SLOTS, equipmentOverview, setBonuses, slotSummary, type SlotId } from '../state/equipment';
import { EffectRow } from './ItemEffects';
import type { Builder } from '../state/useBuilder';
import { ArmoryDialog } from '../dialogs/ArmoryDialog';

export function GearSheet({ builder }: { builder: Builder }) {
  const { build, evaluation, dispatch } = builder;
  const [open, setOpen] = useState<SlotId | null>(null);
  const onKeys = useListNavigation(1);

  const overview = useMemo(
    () => equipmentOverview(
      build.equipment,
      evaluation.derived.battleWeight,
      evaluation.derived.equipmentLoad,
      build,
    ),
    [build, evaluation.derived.battleWeight, evaluation.derived.equipmentLoad],
  );

  const sets = useMemo(() => setBonuses(build.equipment), [build.equipment]);

  const accessNote = (weaponType: string | null, subClassOnly: boolean) => weaponType && (subClassOnly
    ? `${build.subClass} lists ${weaponType}s, but only the main class grants weapon access. ${build.mainClass} needs Adaptation to equip one. Its stats are still included.`
    : `${build.mainClass} cannot equip a ${weaponType} without Adaptation. Its stats are still included.`);
  const notes = [
    accessNote(overview.restrictedWeapon, overview.restrictedBySubClassOnly),
    overview.restrictedOffHand !== overview.restrictedWeapon && accessNote(overview.restrictedOffHand, overview.restrictedOffHandBySubClassOnly),
    overview.duplicateAccessory
      && 'The same accessory is equipped twice. The game allows only one copy.',
    overview.overWeight
      && `Weapon and torso weigh ${overview.load} against a battle weight of ${overview.capacity}.`,
  ].filter((note): note is string => Boolean(note));

  return (
    <>
      <div className="filters">
        <span className="chip chip--gold">
          Load {overview.load}/{overview.capacity}
        </span>
        {overview.sets.map(set => (
          <span
            key={set.name}
            className={`chip ${set.active.length ? 'chip--good' : ''}`}
            title={[
              ...set.active.map(threshold => `✓ ${threshold.count}: ${threshold.description}`),
              ...set.upcoming.map(threshold => `· ${threshold.count}: ${threshold.description}`),
              set.note,
            ].filter(Boolean).join('\n')}
          >
            {set.name} {set.equipped}/{set.total}
          </span>
        ))}
        <div className="spacer" />
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--danger"
          onClick={() => { play('back'); dispatch({ type: 'equipment-clear' }); }}
        >
          Unequip all
        </button>
      </div>

      {notes.length ? (
        <div className="warnings">
          {notes.map(note => <div key={note}>{note}</div>)}
        </div>
      ) : null}

      <div className="section">
        <SectionHead aside="6 slots">Equipped</SectionHead>
        <div className="list" onKeyDown={onKeys}>
          {SLOTS.map(descriptor => {
            const summary = slotSummary(build.equipment, descriptor.id);
            const label = descriptor.id === 'slot3' && equippedSlot3(build.equipment) === 'offHandWeapon'
              ? 'Off Hand · weapon'
              : descriptor.label;
            return (
              <div className={`slot ${summary.name ? 'is-filled' : ''}`} key={descriptor.id}>
                <button
                  type="button"
                  data-nav
                  className="slot__open"
                  title={descriptor.hint}
                  onClick={() => { play('select'); setOpen(descriptor.id); }}
                >
                  <span className="slot__glyph"><SlotGlyph slot={descriptor.id} /></span>
                  <span className="slot__text">
                    <span className="slot__label">{label}</span>
                    <span className="slot__item">{summary.name ?? 'Empty'}</span>
                    {summary.detail ? <span className="slot__detail">{summary.detail}</span> : null}
                  </span>
                  <span className="slot__marks">
                    {summary.ul > 0 ? <span className="chip chip--gold">UL {summary.ul}</span> : null}
                    {summary.effects > 0 ? <span className="chip">{summary.effects} fx</span> : null}
                    {summary.weight != null ? <span className="chip">WT {summary.weight}</span> : null}
                  </span>
                </button>
                {summary.name ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="step slot__clear"
                    aria-label={`Unequip ${summary.name}`}
                    onClick={() => { play('back'); unequip(dispatch, descriptor.id, build.equipment); }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {sets.length ? (
        <div className="section">
          <SectionHead aside={`${sets.length}`}>Set bonuses</SectionHead>
          <div className="stack--tight">
            {sets.map(set => (
              <div className="granted" key={set.name}>
                <div className="granted__head">
                  <span className="granted__name">{set.name}</span>
                  <span className={`chip ${set.thresholds.some(threshold => threshold.reached) ? 'chip--good' : ''}`}>{set.equipped}/{set.total}</span>
                </div>
                {set.note && !set.thresholds.length ? <p className="granted__text">{set.note}</p> : null}
                {set.thresholds.map(threshold => (
                  <div className={`set-threshold ${threshold.reached ? '' : 'is-pending'}`} key={threshold.entry.conditionalKey}>
                    <span className="chip">{threshold.count}+</span>
                    {threshold.reached
                      ? <EffectRow builder={builder} entry={threshold.entry} />
                      : <span className="granted__text">{threshold.entry.effect.description}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {open ? (
        <ArmoryDialog builder={builder} slot={open} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}

function unequip(
  dispatch: Builder['dispatch'],
  slot: SlotId,
  equipment: Builder['build']['equipment'],
): void {
  if (slot === 'primaryWeapon') {
    dispatch({ type: 'equip-weapon', which: 'primaryWeapon', weaponName: null });
  } else if (slot === 'armor') {
    dispatch({ type: 'equip-armor', armorName: null });
  } else if (slot === 'slot3') {
    if (equippedSlot3(equipment) === 'offHandWeapon') {
      dispatch({ type: 'equip-weapon', which: 'offHandWeapon', weaponName: null });
    } else {
      dispatch({ type: 'equip-gear', slot: 'hands', itemName: null });
    }
  } else {
    dispatch({ type: 'equip-gear', slot, itemName: null });
  }
}
