/**
 * The per-slot control panels of the armory.
 *
 * Split from the dialog shell because each slot kind tunes a different thing (a
 * weapon has parts and scaling, a torso has armour tracks, and slots 3 to 6 have
 * two tracks and an effect list) while the shell around them (search, item list,
 * footer) is identical.
 *
 * Nothing here computes a bonus. Every control writes a field that
 * `evaluateBuild` already reads.
 */
import type { StatKey, WeaponUpgradePoints } from '../../types';
import { NO_ARMOR_QUALITY, resolveArmorUpgradePoints, resolveUpgradePoints } from '../../types';
import { ARMORS } from '../../data/armors';
import { statInk } from '../../data/colors';
import modifierData from '../../data/content/weapon-modifiers.json';
import {
  ARMOR_MATERIAL_CATEGORIES,
  ARMOR_QUALITY_TAGS,
  OTHER_MATERIAL_CATEGORIES,
  armorQualityModifier,
} from '../../domain/armorMaterials';
import { ARMOR_ENCHANTMENT_NAMES, enchantmentNamesForSlot, type EnchantSlot } from '../../domain/armorEnchantments';
import { findWeaponByName, scalingForWeapon } from '../../domain/equipment';
import { SCALING_TAG_LABEL, effectiveScaling, scalingTagsFor } from '../../domain/weaponScaling';
import { armorUpgradeCaps, clampUpgradePoint, weaponUpgradeCaps } from '../../domain/upgradeCaps';
import {
  summarizeArmorEnchantment,
  summarizeArmorMaterial,
  summarizeWeaponModifier,
  type ModifierPart,
  summarizeModifier,
  type SummarisableWeaponModifier,
} from '../../domain/modifierSummary';
import { SectionHead } from '../ui/Panel';
import { GroupedSelect, SelectField, Toggle } from '../ui/controls';
import { play } from '../state/audio';
import { STAT_KEYS } from '../state/build';
import { effectsForSlot, type GearSlotId, type SlotId } from '../state/equipment';
import type { Builder } from '../state/useBuilder';

const MATERIAL_CATEGORIES = modifierData.materialCategories as Record<string, string[]>;
const PART_CATEGORIES = modifierData.partCategories as Record<string, string[]>;
const ENCHANTMENTS = Object.keys(modifierData.enchantments as Record<string, unknown>);

const asGroups = (record: Record<string, string[]>) =>
  Object.entries(record).map(([label, options]) => ({ label, options }));

/**
 * The same list with an explicit "no material" choice in front.
 *
 * The weapon modifier data ships a `Basic` group holding `None`; the armour and
 * `Other` material tables do not, so without this the empty state would render
 * through the grouped select's unknown-value fallback and read as a data error.
 */
const withNone = (groups: Array<{ label: string; options: string[] }>) =>
  [{ label: 'Basic', options: ['None'] }, ...groups];

/* ------------------------------------------------------------ upgrade tracks */

interface TrackProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /**
   * The channel's ceiling, when one is recorded.
   *
   * `null` or absent means no sourced ceiling. The channel is then bounded only
   * by `TYPO_CEILING`, which is a guard against a slipped keypress rather than a
   * rule about the game.
   */
  cap?: number | null;
}

/** Not a game rule: an upper bound so a slipped keypress cannot store 9999. */
const TYPO_CEILING = 99;

/**
 * One upgrade channel.
 *
 * Where a ceiling is known the spend reads `3 / 8` and the stepper stops there;
 * where none is recorded it reads as a bare number, so an uncapped channel is
 * visibly uncapped rather than looking like a cap nobody hit.
 */
function Track({ label, value, onChange, cap = null }: TrackProps) {
  const ceiling = cap ?? TYPO_CEILING;
  const commit = (next: number) => onChange(clampUpgradePoint(next, ceiling));
  const step = (delta: number) => {
    const next = clampUpgradePoint(value + delta, ceiling);
    if (next === value) { play('deny'); return; }
    play('move');
    onChange(next);
  };
  return (
    <div className="track">
      <span className="track__label">{label}</span>
      <span className="stat__stepper">
        <button type="button" className="step" onClick={() => step(-1)} disabled={value <= 0} aria-label={`${label} down`}>−</button>
        <input
          className="stat__input"
          type="number"
          min={0}
          max={ceiling}
          value={value}
          aria-label={`${label} upgrade points`}
          onChange={event => commit(Number(event.target.value))}
        />
        <button
          type="button"
          className="step"
          onClick={() => step(1)}
          disabled={value >= ceiling}
          title={cap !== null && value >= cap ? `Caps at ${cap}` : undefined}
          aria-label={`${label} up`}
        >
          +
        </button>
        {cap !== null && <span className="track__cap">/ {cap}</span>}
      </span>
    </div>
  );
}

/**
 * What a chosen material, part or enchantment does.
 *
 * The dropdowns named the choice and showed nothing about it, so comparing two
 * meant picking one, reading the rail three panels away, picking the other and
 * reading it again. `empty` distinguishes "this record has no numeric effect the
 * calculator models" from "you have not chosen anything", which are different
 * answers and were previously both a blank space.
 */
function ModifierParts({ title, parts, description, empty }: {
  title: string;
  parts: ModifierPart[];
  description?: string;
  empty?: string;
}) {
  if (!parts.length && !description && !empty) return null;
  return (
    <div className="modifier-parts">
      <span className="modifier-parts__title">{title}</span>
      {parts.length > 0 && (
        <span className="modifier-parts__chips">
          {parts.map(part => (
            <span key={`${part.label}:${part.value}`} className={`chip chip--${part.tone === 'good' ? 'good' : 'alert'}`}>
              {part.value} {part.label}
            </span>
          ))}
        </span>
      )}
      {!parts.length && empty && <span className="hint">{empty}</span>}
      {description && <span className="hint modifier-parts__prose">{description}</span>}
    </div>
  );
}

function Tracks({ children, ul }: { children: React.ReactNode; ul: number }) {
  return (
    <div className="section">
      <SectionHead aside={`UL ${ul}`}>Upgrades</SectionHead>
      <div className="tracks">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------- item effects */

/**
 * Effect lines for the equipped item, with a toggle for each conditional and a
 * control for each rolled range.
 *
 * `always` lines are listed but not toggleable. They are already counted, and a
 * switch that cannot be turned off is a lie. `reference` lines carry no numbers
 * at all and are marked as such rather than hidden, so the sheet accounts for
 * every line the wiki prints.
 */
export function EffectControls({ builder, slot }: { builder: Builder; slot: SlotId }) {
  const { build, dispatch } = builder;
  const effects = effectsForSlot(build.equipment, slot);
  if (!effects.length) return null;

  const conditionals = {
    ...build.equipment.armorConditionalBonuses,
    ...(build.equipment.itemConditionalBonuses ?? {}),
  };

  return (
    <div className="section">
      <SectionHead aside={`${effects.length}`}>Item effects</SectionHead>
      <div className="stack--tight">
        {effects.map(entry => (
          <div key={entry.conditionalKey} className="effect">
            {entry.effect.applies === 'conditional' ? (
              <Toggle
                on={Boolean(conditionals[entry.conditionalKey])}
                onChange={on => dispatch({ type: 'item-conditional', key: entry.conditionalKey, on })}
                hint="Gated on something the calculator cannot see, so it is opt-in."
              >
                {entry.effect.description}
              </Toggle>
            ) : (
              <div className="effect__static">
                <span className={`chip ${entry.effect.applies === 'always' ? 'chip--good' : ''}`}>
                  {entry.effect.applies === 'always' ? 'active' : 'text'}
                </span>
                <span>{entry.effect.description}</span>
              </div>
            )}

            {entry.rolls.map(roll => (
              <div className="roll" key={roll.key}>
                <span className="roll__label">{roll.label}</span>
                <input
                  className="roll__range"
                  type="range"
                  min={roll.min}
                  max={roll.max}
                  value={roll.current}
                  aria-label={`Rolled value for ${roll.label}`}
                  onChange={event => dispatch({ type: 'item-roll', key: roll.key, value: Number(event.target.value) })}
                />
                <span className="num roll__value">{roll.current}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- weapon */

export function WeaponTuning({ builder, which }: { builder: Builder; which: 'primaryWeapon' | 'offHandWeapon' }) {
  const { build, dispatch } = builder;
  const config = build.equipment[which];
  if (!config) return null;

  const points = resolveUpgradePoints(config);
  const patch = (change: Partial<typeof config>) => dispatch({ type: 'weapon-patch', which, patch: change });
  const setPoints = (change: Partial<WeaponUpgradePoints>) => patch({ upgradePoints: { ...points, ...change } });
  const source = findWeaponByName(config.selectedWeaponName);
  const weaponCaps = weaponUpgradeCaps(build.world);
  /*
   * The crafted choices that carry numbers. `None` is skipped rather than shown as
   * an empty row. An unfilled slot is not a modifier with no effect.
   */
  const weaponModifiers = ([
    ['material', config.material, (modifierData.materials as Record<string, SummarisableWeaponModifier>)[config.material]],
    ['enchantment', config.enchantment, (modifierData.enchantments as Record<string, SummarisableWeaponModifier>)[config.enchantment]],
    ['part1', config.part1, (modifierData.parts as Record<string, SummarisableWeaponModifier>)[config.part1]],
    ['part2', config.part2, (modifierData.parts as Record<string, SummarisableWeaponModifier>)[config.part2]],
    ['part3', config.part3, (modifierData.parts as Record<string, SummarisableWeaponModifier>)[config.part3]],
  ] as const)
    .filter(([, name]) => name && name !== 'None')
    .map(([key, name, record]) => ({ key, name, parts: summarizeWeaponModifier(record) }));
  /*
   * What the weapon actually scales off, and why it differs from the inputs below.
   * The reason is named rather than just the numbers: "rewritten to nothing" is
   * alarming without "by the Mundane enchantment" beside it.
   */
  const effective = effectiveScaling(config, build.traits);
  const tags = scalingTagsFor(config, build.traits);
  const scalingRewritten = STAT_KEYS.some(stat => effective[stat as StatKey] !== (config.customScaling[stat as StatKey] ?? 0));
  const rewriteReason = tags.map(tag => SCALING_TAG_LABEL[tag]).join(' and ');

  return (
    <>
      <div className="section">
        <SectionHead aside={config.weaponType}>Crafting</SectionHead>
        <div className="grid-2">
          <GroupedSelect
            label="Material"
            value={config.material}
            groups={asGroups(MATERIAL_CATEGORIES)}
            onChange={material => patch({ material })}
          />
          <SelectField
            label="Enchantment"
            value={config.enchantment}
            options={ENCHANTMENTS.map(name => ({ value: name, label: name }))}
            onChange={enchantment => patch({ enchantment })}
          />
        </div>
        <div className="grid-3" style={{ marginTop: 6 }}>
          {(['part1', 'part2', 'part3'] as const).map((key, index) => (
            <GroupedSelect
              key={key}
              label={`Part ${index + 1}`}
              value={config[key]}
              groups={asGroups(PART_CATEGORIES)}
              onChange={value => patch({ [key]: value } as Partial<typeof config>)}
            />
          ))}
        </div>
        {/*
          * Every crafted choice, each named beside what it does. Parts are listed
          * individually rather than summed: three slots that each read `+2 Power`
          * is a different thing to know than one line reading `+6`.
          */}
        {weaponModifiers.map(({ key, name, parts }) => (
          <ModifierParts
            key={key}
            title={name}
            parts={parts}
            empty="No modelled numeric effect."
          />
        ))}
      </div>

      <Tracks ul={points.power + points.critical + points.accuracy + points.durability}>
        <Track label="Power" cap={weaponCaps.power} value={points.power} onChange={value => setPoints({ power: value })} />
        <Track label="Critical" cap={weaponCaps.critical} value={points.critical} onChange={value => setPoints({ critical: value })} />
        <Track label="Accuracy" cap={weaponCaps.accuracy} value={points.accuracy} onChange={value => setPoints({ accuracy: value })} />
        <Track label="Durability" cap={weaponCaps.durability} value={points.durability} onChange={value => setPoints({ durability: value })} />
      </Tracks>

      <div className="section">
        <SectionHead>Quality and handling</SectionHead>
        <div className="grid-2">
          <Toggle on={config.powerQuality} onChange={powerQuality => patch({ powerQuality })} hint="+2 Power">Power quality</Toggle>
          <Toggle on={config.critQuality} onChange={critQuality => patch({ critQuality })} hint="+4 Critical">Crit quality</Toggle>
          <Toggle on={config.hitQuality} onChange={hitQuality => patch({ hitQuality })} hint="+4 Hit">Hit quality</Toggle>
          <Toggle on={config.sentimentality} onChange={sentimentality => patch({ sentimentality })} hint="+2 Power, Critical and Hit">Sentimentality</Toggle>
          <Toggle on={config.weightPlus} onChange={weightPlus => patch({ weightPlus })} hint="+2 Weight">Heavy</Toggle>
          <Toggle on={config.weightMinus} onChange={weightMinus => patch({ weightMinus })} hint="−2 Weight">Light</Toggle>
        </div>
        <div className="grid-2" style={{ marginTop: 6 }}>
          <SelectField
            label="Two-handed rank"
            value={String(config.twoHandedSkillRank)}
            options={[0, 1, 2, 3, 4, 5].map(rank => ({ value: String(rank), label: String(rank) }))}
            onChange={value => patch({ twoHandedSkillRank: Number(value) })}
            title="Swords, axes and spears gain Power; guns gain Hit. Doubled at weight 20 or more."
          />
          <SelectField
            label="Rarity"
            value={String(config.rarity)}
            options={Array.from({ length: 10 }, (_, index) => ({ value: String(index), label: String(index) }))}
            onChange={value => patch({ rarity: Number(value) })}
            title="Drives the Mutation and Rebellion enchantments."
          />
        </div>
      </div>

      <div className="section">
        <SectionHead
          aside={source ? <button type="button" className="btn btn--ghost btn--icon" onClick={() => patch({ customScaling: scalingForWeapon(source) })}>Reset</button> : undefined}
        >
          Scaling %
        </SectionHead>
        <div className="scaling">
          {STAT_KEYS.map(stat => (
            <label className="scaling__cell" key={stat} title={`${stat.toUpperCase()} scaling`}>
              <span style={{ color: statInk(stat) }}>
                {stat.toUpperCase()}
              </span>
              <input
                className="stat__input"
                type="number"
                value={config.customScaling[stat as StatKey] ?? 0}
                aria-label={`${stat.toUpperCase()} scaling percent`}
                onChange={event => patch({
                  customScaling: { ...config.customScaling, [stat]: Number(event.target.value) || 0 },
                })}
              />
            </label>
          ))}
        </div>
        {/*
          * These inputs edit the weapon's *printed* tags. An enchantment, a part
          * or a trait can rewrite them before they reach SWA (Mundane strips them
          * outright), so the effective table is stated whenever it differs, or the
          * editor would look broken next to a rail that disagrees with it.
          */}
        {scalingRewritten && (
          <p className="hint" style={{ padding: '6px 2px 0' }}>
            Rewritten in play to{' '}
            <strong>
              {STAT_KEYS.filter(stat => effective[stat as StatKey] !== 0)
                .map(stat => `${effective[stat as StatKey]}% ${stat.toUpperCase()}`)
                .join(', ') || 'no scaling at all'}
            </strong>
            {' '}by {rewriteReason}.
          </p>
        )}
      </div>

      <EffectControls builder={builder} slot={which === 'primaryWeapon' ? 'primaryWeapon' : 'slot3'} />
    </>
  );
}

/* --------------------------------------------------------------------- torso */

export function ArmorTuning({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const armor = build.equipment.armorName ? ARMORS[build.equipment.armorName] : null;
  if (!armor) return null;

  const points = resolveArmorUpgradePoints(build.equipment);
  // Per armour class: the three classes spend the same total across the channels
  // in a different order, so the ceilings move with the torso rather than the item.
  const caps = armorUpgradeCaps(armor.type, build.world);
  const materialParts = summarizeArmorMaterial(build.equipment.armorMaterial);
  const quality = build.equipment.armorQuality ?? NO_ARMOR_QUALITY;
  const qualityParts = summarizeModifier(armorQualityModifier(quality));
  const enchantment = summarizeArmorEnchantment(build.equipment.armorEnchantment);
  const conditionals = Object.entries(armor.conditionalBonuses ?? {});

  return (
    <>
      <div className="section">
        <SectionHead aside={`${armor.type} · WT ${armor.weight}`}>Crafting</SectionHead>
        <div className="grid-2">
          <GroupedSelect
            label="Material"
            value={build.equipment.armorMaterial ?? 'None'}
            groups={withNone(asGroups(ARMOR_MATERIAL_CATEGORIES))}
            onChange={armorMaterial => dispatch({ type: 'armor-patch', patch: { armorMaterial } })}
          />
          <SelectField
            label="Enchantment"
            value={build.equipment.armorEnchantment ?? 'None'}
            // The list already leads with `None`; prepending another duplicated it.
            options={ARMOR_ENCHANTMENT_NAMES.map(name => ({ value: name, label: name }))}
            onChange={armorEnchantment => dispatch({ type: 'armor-patch', patch: { armorEnchantment } })}
          />
        </div>
        <ModifierParts
          title={build.equipment.armorMaterial ?? 'None'}
          parts={materialParts}
          empty={(build.equipment.armorMaterial ?? 'None') === 'None' ? undefined : 'No modelled effect on a torso.'}
        />
        <ModifierParts
          title={build.equipment.armorEnchantment ?? 'None'}
          parts={enchantment.parts}
          description={enchantment.description}
          empty={(build.equipment.armorEnchantment ?? 'None') === 'None' ? undefined : 'No modelled effect.'}
        />
      </div>

      <div className="section">
        <SectionHead>Quality</SectionHead>
        <div className="grid-2">
          {ARMOR_QUALITY_TAGS.map(tag => (
            <Toggle
              key={tag.key}
              on={quality[tag.key]}
              hint={tag.hint}
              onChange={on => dispatch({ type: 'armor-patch', patch: { armorQuality: { ...quality, [tag.key]: on } } })}
            >
              {tag.label}
            </Toggle>
          ))}
        </div>
        {/*
          * The net of the tags, since Lightweight and Heavy cancel: two toggles
          * lit and no weight change would otherwise look like a bug.
          */}
        <ModifierParts title="Net" parts={qualityParts} empty="No quality tags." />
      </div>

      <Tracks ul={points.armor + points.magicArmor + points.evade}>
        <Track label="Armor" cap={caps.armor} value={points.armor} onChange={value => dispatch({ type: 'armor-upgrade', patch: { armor: value } })} />
        <Track label="M. Armor" cap={caps.magicArmor} value={points.magicArmor} onChange={value => dispatch({ type: 'armor-upgrade', patch: { magicArmor: value } })} />
        {/* No durability track: a torso has none. */}
        <Track label="Evade" cap={caps.evade} value={points.evade} onChange={value => dispatch({ type: 'armor-upgrade', patch: { evade: value } })} />
      </Tracks>

      {conditionals.length ? (
        <div className="section">
          <SectionHead aside={`${conditionals.length}`}>Conditional bonuses</SectionHead>
          <div className="stack--tight">
            {conditionals.map(([key, bonus]) => (
              <Toggle
                key={key}
                on={Boolean(build.equipment.armorConditionalBonuses[key])}
                onChange={on => dispatch({ type: 'armor-conditional', key, on })}
                hint={bonus.condition}
              >
                {bonus.condition}
              </Toggle>
            ))}
          </div>
        </div>
      ) : null}

      {armor.specialEffects?.length ? (
        <div className="section">
          <SectionHead>Notes</SectionHead>
          {armor.specialEffects.map(effect => <p className="hint" key={effect}>{effect}</p>)}
        </div>
      ) : null}

      <EffectControls builder={builder} slot="armor" />
    </>
  );
}

/* ------------------------------------------------------------- slots 3 to 6 */

const ENCHANT_SLOT: Record<GearSlotId, EnchantSlot | null> = {
  hands: 'Hands',
  legs: 'Legs',
  // The wiki gives accessories a material but no enchantment slot of their own.
  accessory1: null,
  accessory2: null,
};

const TRACK_LABELS: Record<GearSlotId, Array<[string, string]>> = {
  hands: [['Hit', 'hit'], ['Max FP', 'fp']],
  legs: [['Max HP', 'hp'], ['Evade', 'evade']],
  accessory1: [['Fortune', 'fortune'], ['Greed', 'greed']],
  accessory2: [['Fortune', 'fortune'], ['Greed', 'greed']],
};

export function GearTuning({ builder, slot, slotId }: { builder: Builder; slot: GearSlotId; slotId: SlotId }) {
  const { build, dispatch } = builder;
  const state = build.equipment[slot];
  if (!state?.itemName) return null;

  const points = state.upgradePoints as unknown as Record<string, number>;
  const ul = Object.values(points).reduce((total, value) => total + (Number(value) || 0), 0);
  const enchantSlot = ENCHANT_SLOT[slot];

  return (
    <>
      <div className="section">
        <SectionHead>Crafting</SectionHead>
        <div className="grid-2">
          <GroupedSelect
            label="Material"
            value={state.material ?? 'None'}
            groups={withNone(asGroups(OTHER_MATERIAL_CATEGORIES))}
            onChange={material => dispatch({ type: 'gear-patch', slot, patch: { material } })}
            title="These slots read a material's Other profile, not its armor one."
          />
          {enchantSlot ? (
            <SelectField
              label="Enchantment"
              value={state.enchantment ?? 'None'}
              options={enchantmentNamesForSlot(enchantSlot).map(name => ({ value: name, label: name }))}
              onChange={enchantment => dispatch({ type: 'gear-patch', slot, patch: { enchantment } })}
            />
          ) : (
            <div className="field">
              <span className="field__label">Enchantment</span>
              <span className="hint">The wiki gives accessories no enchantment slot.</span>
            </div>
          )}
        </div>
      </div>

      <Tracks ul={ul}>
        {TRACK_LABELS[slot].map(([label, key]) => (
          <Track
            key={key}
            label={label}
            value={points[key] ?? 0}
            onChange={value => dispatch({ type: 'gear-patch', slot, patch: { upgradePoints: { [key]: value } } })}
          />
        ))}
      </Tracks>

      {slot === 'accessory1' || slot === 'accessory2' ? (
        <p className="hint">
          Fortune and Greed govern item and murai drops. They round-trip and stack across both
          accessory slots, but neither moves a combat number.
        </p>
      ) : null}

      <EffectControls builder={builder} slot={slotId} />
    </>
  );
}
