import { useMemo, useState, type ReactNode } from 'react';
import { TALENTS, TALENT_CATEGORIES, type SubtalentRecord, type TalentRecord } from '../../data/talents';
import { effectiveWeaponTypes } from '../../domain/equipment';
import { isFrontalHitSubtalent, talentEffects } from '../../domain/talents';
import { TALENT_POINT_BUDGET } from '../../domain/loadout';
import { talentSpending } from '../../data/talents';
import { SectionHead } from '../ui/Panel';
import { NumberField } from '../ui/controls';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';

/** Only subtalent ranks are edited; a talent's rank is the fewest whole ranks whose SP covers them. */
export function TalentsSheet({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const [query, setQuery] = useState('');
  const [combatOnly, setCombatOnly] = useState(false);
  const onKeys = useListNavigation(1);

  const weaponType = useMemo(() => effectiveWeaponTypes(build.equipment.primaryWeapon), [build.equipment.primaryWeapon]);
  const allocation = build.talents ?? {};
  const conditionals = build.talentConditionals ?? {};

  const { totalRanks, totalSp, perTalent } = useMemo(() => talentSpending(build.talents ?? {}), [build.talents]);
  const ranksByTalent = useMemo(
    () => new Map(perTalent.map(entry => [entry.talent.id, entry])),
    [perTalent],
  );

  // The same call `evaluateBuild` makes, so this summary cannot disagree with the rail.
  const effects = useMemo(() => talentEffects(build, weaponType), [build, weaponType]);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => TALENT_CATEGORIES.map(category => ({
    category,
    talents: TALENTS.filter(talent => {
      if (talent.categoryId !== category.id) return false;
      if (combatOnly && !talent.subtalents.some(sub => sub.modifiers.length || sub.weaponAccess || sub.id === 'spiritualism/possession')) return false;
      if (!needle) return true;
      return talent.name.toLowerCase().includes(needle)
        || talent.subtalents.some(sub =>
          sub.name.toLowerCase().includes(needle) || sub.effect.toLowerCase().includes(needle));
    }),
  })).filter(group => group.talents.length > 0), [needle, combatOnly]);

  const setRank = (subtalent: SubtalentRecord, rank: number) => {
    const next = Math.max(0, Math.min(rank, subtalent.maxSr));
    if (next === (allocation[subtalent.id] ?? 0)) return;
    play(next > (allocation[subtalent.id] ?? 0) ? 'select' : 'back');
    dispatch({ type: 'subtalent-rank', subtalentId: subtalent.id, rank: next });
  };

  return (
    <>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search talents…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Search talents"
        />
        <span className={`chip ${totalRanks > TALENT_POINT_BUDGET ? 'chip--alert' : 'chip--gold'}`}>
          {totalRanks} / {TALENT_POINT_BUDGET} ranks
        </span>
        {totalSp ? <span className="chip">{Number(totalSp.toFixed(1))} SP</span> : null}
        <button
          type="button"
          className={`btn btn--ghost btn--icon ${combatOnly ? 'is-active' : ''}`}
          onClick={() => { play('select'); setCombatOnly(value => !value); }}
        >
          Combat
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--danger"
          onClick={() => { play('back'); dispatch({ type: 'talents-clear' }); }}
        >
          Reset
        </button>
      </div>

      <TalentTotals effects={effects} weaponType={weaponType} />

      <div onKeyDown={onKeys}>
        {groups.length === 0 ? (
          <div className="empty">
            <span className="eyebrow">No matching talents</span>
            <span>No talent matches those filters.</span>
          </div>
        ) : groups.map(group => (
          <div className="section" key={group.category.id}>
            <SectionHead aside={`${group.talents.length}`}>{group.category.name}</SectionHead>
            {group.talents.map(talent => (
              <TalentGroup
                key={talent.id}
                builder={builder}
                talent={talent}
                spent={ranksByTalent.get(talent.id)}
                weaponType={weaponType}
                allocation={allocation}
                conditionals={conditionals}
                onRank={setRank}
                onConditional={(subtalentId, on) => {
                  play(on ? 'select' : 'back');
                  dispatch({ type: 'talent-conditional', subtalentId, on });
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function TalentGroup({
  builder,
  talent,
  spent,
  weaponType,
  allocation,
  conditionals,
  onRank,
  onConditional,
}: {
  builder: Builder;
  talent: TalentRecord;
  spent?: { ranks: number; sp: number; overAllocated: boolean };
  weaponType: string[] | null;
  allocation: Record<string, number>;
  conditionals: Record<string, boolean>;
  onRank: (subtalent: SubtalentRecord, rank: number) => void;
  onConditional: (subtalentId: string, on: boolean) => void;
}) {
  const ranks = spent?.ranks ?? 0;
  return (
    <div className={`entry entry--group ${ranks ? 'is-taken' : ''}`}>
      <div className="entry__main">
        <div className="entry__name">
          {talent.name}
          <span className="chip">{talent.spPerRank} SP / rank</span>
          {spent?.overAllocated ? (
            <span className="chip chip--alert">{ranks} of {talent.maxRanks} ranks</span>
          ) : null}
        </div>
        <div className="entry__sub">
          {ranks
            ? `${ranks} rank${ranks === 1 ? '' : 's'} · ${spent?.sp} SP`
            : `Up to ${talent.maxRanks} ranks · ${talent.maxSp} SP`}
        </div>
        {talent.subtalents.map(sub => (
          <SubtalentRow
            key={sub.id}
            subtalent={sub}
            rank={allocation[sub.id] ?? 0}
            weaponType={weaponType}
            conditionalOn={Boolean(conditionals[sub.id])}
            onRank={onRank}
            onConditional={onConditional}
            children={sub.id === 'spiritualism/possession' ? <SpiritControls builder={builder} /> : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function SubtalentRow({
  subtalent,
  rank,
  weaponType,
  conditionalOn,
  onRank,
  onConditional,
  children,
}: {
  subtalent: SubtalentRecord;
  rank: number;
  weaponType: string[] | null;
  conditionalOn: boolean;
  onRank: (subtalent: SubtalentRecord, rank: number) => void;
  onConditional: (subtalentId: string, on: boolean) => void;
  children?: ReactNode;
}) {
  // Still buyable: players spec a talent before buying the weapon for it.
  const outOfScope = Boolean(subtalent.weapons?.length && (!weaponType || !weaponType.some(type => subtalent.weapons!.includes(type))));
  // Smite is the Hit model's own `front` tier and already counted, so it gets no switch.
  const frontal = isFrontalHitSubtalent(subtalent);
  const conditional = !frontal && subtalent.modifiers.some(modifier => modifier.conditional);
  return (
    <div
      className={`entry entry--sub ${rank ? 'is-taken' : ''} ${outOfScope ? 'is-muted' : ''}`}
      data-nav
      tabIndex={0}
      aria-label={subtalent.name}
    >
      <div className="entry__main">
        <div className="entry__name">
          {subtalent.name}
          {subtalent.weaponAccess ? (
            <span className="chip chip--gold" title="Opens this weapon type regardless of class">
              {subtalent.weaponAccess.weaponType} ≤ R{rank * subtalent.weaponAccess.rarityPerRank}
            </span>
          ) : null}
          {/* Adaptation's access chip already names the weapon; two chips clip the name at phone width. */}
          {subtalent.weapons?.length && !subtalent.weaponAccess ? (
            <span className="chip" title={outOfScope ? 'The equipped weapon is not one of these' : 'Applies to the weapon in hand'}>
              {subtalent.weapons.join(' · ')}
            </span>
          ) : null}
        </div>
        <div className="entry__sub">{subtalent.effect}</div>
        {children}
        {conditional && rank > 0 ? (
          <label className="entry__sub" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={conditionalOn}
              onChange={event => onConditional(subtalent.id, event.target.checked)}
            />
            Count this. It applies only in the situation the effect names.
          </label>
        ) : null}
        {frontal && rank > 0 ? (
          <div className="entry__sub">Counted on the Front (Honor) Hit tier, which is this bonus.</div>
        ) : null}
      </div>
      <div className="entry__rank">
        <button
          type="button"
          className="step"
          aria-label={`Lower ${subtalent.name}`}
          disabled={rank <= 0}
          onClick={() => onRank(subtalent, rank - 1)}
        >
          −
        </button>
        <span className="chip">{rank} / {subtalent.maxSr}</span>
        <button
          type="button"
          className="step"
          aria-label={`Raise ${subtalent.name}`}
          disabled={rank >= subtalent.maxSr}
          onClick={() => onRank(subtalent, rank + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SpiritControls({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  return <div className="grid-2" style={{ marginTop: 8 }}>
    <NumberField label="White Spirits" value={build.whiteSpiritCount ?? 0} min={0} max={5}
      hint={`+${(build.whiteSpiritCount ?? 0) * 3} HP and FP · Max 5`}
      onChange={whiteSpiritCount => dispatch({ type: 'field', patch: { whiteSpiritCount: Math.floor(whiteSpiritCount) } })} />
    <div className="field">
      <span className="field__label">Black Spirits</span>
      <span className="hint">TBA</span>
    </div>
  </div>;
}

function TalentTotals({
  effects,
  weaponType,
}: {
  effects: ReturnType<typeof talentEffects>;
  weaponType: string[] | null;
}) {
  const lines: string[] = [];
  if (effects.hit) lines.push(`Hit ${signed(effects.hit)}`);
  if (effects.frontalHit) lines.push(`Hit ${signed(effects.frontalHit)} from the front`);
  if (effects.critical) lines.push(`Critical ${signed(effects.critical)}`);
  if (effects.criticalDamagePercent) lines.push(`Crit damage ${signed(effects.criticalDamagePercent)}%`);
  if (effects.power) lines.push(`Power ${signed(effects.power)}`);
  if (effects.scaledWeaponAtk) lines.push(`SWA ${signed(effects.scaledWeaponAtk)}`);
  if (effects.weaponWeightReduction) lines.push(`Weapon weight −${effects.weaponWeightReduction}`);
  if (effects.maxBattleWeight) lines.push(`Battle weight ${signed(effects.maxBattleWeight)}`);
  if (effects.maxFp) lines.push(`Max FP ${signed(effects.maxFp)}`);
  if (effects.fpRegen) lines.push(`FP regen ${signed(effects.fpRegen)}`);
  for (const [scope, discount] of Object.entries(effects.fpCostDiscounts)) {
    if (discount) lines.push(`${scope.replace(/-/g, ' ')} FP −${discount}%`);
  }
  if (effects.armor) lines.push(`Armor ${signed(effects.armor)}`);
  if (effects.magicArmor) lines.push(`M.Armor ${signed(effects.magicArmor)}`);
  if (effects.skillPool) lines.push(`Skill pool ${signed(effects.skillPool)}`);
  if (effects.statusInflictionPercent) lines.push(`Status infliction ${signed(effects.statusInflictionPercent)}%`);
  if (effects.attackRange) lines.push(`Range ${signed(effects.attackRange)}`);
  for (const [element, value] of Object.entries(effects.elementalAttack)) {
    if (value) lines.push(`${element} ATK ${signed(value)}`);
  }
  if (!lines.length) return null;
  return (
    <div className="filters">
      <span className="eyebrow">
        In force{weaponType?.length ? ` with ${weaponType.join(' / ')}` : ' (no weapon equipped)'}
      </span>
      {lines.map(line => <span className="chip chip--good" key={line}>{line}</span>)}
    </div>
  );
}

const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(2))}`;
