import { useMemo, useState } from 'react';
import { TALENTS, TALENT_CATEGORIES, type SubtalentRecord, type TalentRecord } from '../../data/talents';
import { effectiveWeaponType } from '../../domain/equipment';
import { isFrontalHitSubtalent, talentEffects } from '../../domain/talents';
import { TALENT_POINT_BUDGET } from '../../domain/loadout';
import { talentSpending } from '../../data/talents';
import { SectionHead } from '../ui/Panel';
import { useListNavigation } from '../hooks/useListNavigation';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';

/**
 * The talent sheet.
 *
 * A talent is bought in whole ranks, each making `spPerRank` SP available, and
 * that SP is what its subtalents spend one rank at a time. So the only thing
 * actually edited here is a subtalent's rank, and the talent's own rank is the
 * fewest whole ranks that could afford its subtalents' SP, which is why the
 * rank track sits on the subtalent row and the talent header only reports.
 * Spending is shown in SP, because that is the currency the wiki costs a rank
 * in, against the point budget the level gives.
 *
 * Two things are marked rather than hidden:
 *
 *   **A weapon-scoped subtalent that does not match the weapon in hand.** Blade
 *   Expertise's Hit is real, and worth nothing to this build until it holds a
 *   sword. Showing it greyed says that; hiding it would make the sheet look
 *   like the talent does not exist.
 *
 *   **A conditional subtalent.** Two-Hand's Steady needs an empty off-hand, which
 *   the sheet cannot see, so it carries its own switch and stays out of the
 *   totals until the build confirms it, the same opt-in the skills sheet uses.
 *
 * The exception is a frontal Hit bonus. Smite is the Hit model's own `front`
 * tier rather than a buff beside it, so it is counted there and carries no
 * switch: a switch would imply the sheet was withholding it.
 */
export function TalentsSheet({ builder }: { builder: Builder }) {
  const { build, dispatch } = builder;
  const [query, setQuery] = useState('');
  const [combatOnly, setCombatOnly] = useState(false);
  const onKeys = useListNavigation(1);

  const weaponType = effectiveWeaponType(build.equipment.primaryWeapon) ?? null;
  const allocation = build.talents ?? {};
  const conditionals = build.talentConditionals ?? {};

  const { totalRanks, totalSp, perTalent } = useMemo(() => talentSpending(allocation), [allocation]);
  const ranksByTalent = useMemo(
    () => new Map(perTalent.map(entry => [entry.talent.id, entry])),
    [perTalent],
  );

  // What the current allocation is actually worth, with the weapon in hand and
  // the conditionals the build has confirmed: the same call `evaluateBuild`
  // makes, so the summary here cannot disagree with the rail.
  const effects = useMemo(() => talentEffects(build, weaponType), [build, weaponType]);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => TALENT_CATEGORIES.map(category => ({
    category,
    talents: TALENTS.filter(talent => {
      if (talent.categoryId !== category.id) return false;
      if (combatOnly && !talent.subtalents.some(sub => sub.modifiers.length || sub.weaponAccess)) return false;
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
        {/* Ranks against the budget, because ranks are what a character has 65
            of. The SP those cost is a second figure at a rate that differs per
            talent, so it rides alongside rather than replacing the count. */}
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
            <span className="eyebrow">Nothing to show</span>
            <span>No talent matches those filters.</span>
          </div>
        ) : groups.map(group => (
          <div className="section" key={group.category.id}>
            <SectionHead aside={`${group.talents.length}`}>{group.category.name}</SectionHead>
            {group.talents.map(talent => (
              <TalentGroup
                key={talent.id}
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

/** One talent: its cost header, then a row per subtalent. */
function TalentGroup({
  talent,
  spent,
  weaponType,
  allocation,
  conditionals,
  onRank,
  onConditional,
}: {
  talent: TalentRecord;
  spent?: { ranks: number; sp: number; overAllocated: boolean };
  weaponType: string | null;
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
          />
        ))}
      </div>
    </div>
  );
}

/** A subtalent: the rank track, the wiki's effect text, and its own switches. */
function SubtalentRow({
  subtalent,
  rank,
  weaponType,
  conditionalOn,
  onRank,
  onConditional,
}: {
  subtalent: SubtalentRecord;
  rank: number;
  weaponType: string | null;
  conditionalOn: boolean;
  onRank: (subtalent: SubtalentRecord, rank: number) => void;
  onConditional: (subtalentId: string, on: boolean) => void;
}) {
  // Scoped to weapons this build is not holding: still listed, still buyable
  // (a player specs into a talent before buying the weapon for it), but
  // marked, because it contributes nothing at this loadout.
  const outOfScope = Boolean(subtalent.weapons?.length && (!weaponType || !subtalent.weapons.includes(weaponType)));
  // A frontal Hit bonus is already counted, on the frontal Hit tier: offering
  // a switch for it would suggest the sheet is holding it back.
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
          {/* Skipped on an Adaptation row: the access chip beside it already
              names the weapon type, and two chips clip the name at phone width. */}
          {subtalent.weapons?.length && !subtalent.weaponAccess ? (
            <span className="chip" title={outOfScope ? 'The equipped weapon is not one of these' : 'Applies to the weapon in hand'}>
              {subtalent.weapons.join(' · ')}
            </span>
          ) : null}
        </div>
        <div className="entry__sub">{subtalent.effect}</div>
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
        {/* `.step` rather than a ghost button: it is the sheet's own rank
            control, and it is the one the phone tier grows to a thumb. */}
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

/**
 * What the allocation is currently worth.
 *
 * Only non-zero lines, for the same reason `compactSources` drops empty ones: a
 * column of zeroes is a worse explanation than three real numbers.
 */
function TalentTotals({
  effects,
  weaponType,
}: {
  effects: ReturnType<typeof talentEffects>;
  weaponType: string | null;
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
  if (effects.fpCostPercent) lines.push(`Spell FP cost −${effects.fpCostPercent}%`);
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
        In force{weaponType ? ` with a ${weaponType}` : ' (no weapon equipped)'}
      </span>
      {lines.map(line => <span className="chip chip--good" key={line}>{line}</span>)}
    </div>
  );
}

const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(2))}`;
