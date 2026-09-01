import { useState } from 'react';
import { cx } from './design';
import DeckDialog, { DialogField, DialogNumber, DialogSection } from './DeckDialog';
import { ARMOR_TYPES } from './data/armors';
import {
  BONUS_EVADE_CAP,
  HIT_TIERS,
  HIT_TIER_HINT,
  HIT_TIER_LABEL,
  MAX_FEAR_RESISTANCE,
  attackerHit,
  hitChance,
  instanceOdds,
  targetEvade,
  type HitTier,
} from './domain/hitEvade';
import type { Armor, BuildEvaluation } from './types';

const SECTIONS = [
  { id: 'target', label: 'Target' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'odds', label: 'Odds' },
];

const selectClass = 'h-8 rounded-7 border border-edge-muted bg-surface-bar px-2 text-12 text-content outline-none focus:border-edge-emphasis';

/** Everything about the defender the model needs. Seeded from the build by `mirrorTarget`. */
interface TargetState {
  scaledCel: number;
  armorEvade: number;
  armorType: Armor['type'];
  baseEvadeMod: number;
  evadeBuffs: number;
  evadeDebuffs: number;
  fieldBuffs: number;
  fieldDebuffs: number;
  baseMultiplier: number;
  bonusMultiplier: number;
  knockedDown: boolean;
}

const DEFAULT_TARGET: TargetState = {
  scaledCel: 0,
  armorEvade: 0,
  armorType: 'Light',
  baseEvadeMod: 0,
  evadeBuffs: 0,
  evadeDebuffs: 0,
  fieldBuffs: 0,
  fieldDebuffs: 0,
  baseMultiplier: 100,
  bonusMultiplier: 0,
  knockedDown: false,
};

/**
 * A mirror of the build, which is the only default that stays useful.
 *
 * A fixed target does not: pitch a level-1 build against a CEL-40 defender and
 * every row floors at 5%, so the screen opens looking broken. Mirroring means the
 * first thing you see is "how often do I hit something like me", at any level.
 */
function mirrorTarget(evaluation: BuildEvaluation, armorType?: Armor['type']): TargetState {
  return {
    ...DEFAULT_TARGET,
    scaledCel: Math.floor(evaluation.scaledStats.cel),
    // `armorEvadeBase`, not `armorEvade`: the latter folds in conditional and item
    // effects, which are bonus-channel sources. Seeding them into this screen's
    // base Evade field would let them escape the +50 cap on the mirrored target.
    armorEvade: evaluation.derived.armorEvadeBase,
    armorType: armorType ?? 'Light',
  };
}

interface AttackerState {
  hitBuffs: number;
  hitDebuffs: number;
  fieldModifier: number;
  baseMultiplier: number;
  bonusMultiplier: number;
  brokenWeapon: boolean;
  blind: boolean;
  feared: boolean;
  fearResistance: number;
  instances: number;
}

const DEFAULT_ATTACKER: AttackerState = {
  hitBuffs: 0,
  hitDebuffs: 0,
  fieldModifier: 0,
  baseMultiplier: 100,
  bonusMultiplier: 0,
  brokenWeapon: false,
  blind: false,
  feared: false,
  fearResistance: 0,
  instances: 1,
};

function Toggle({ label, hint, checked, onChange }: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-8 border border-edge bg-surface-bar px-2.5 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 accent-info"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-12 text-content">{label}</span>
        {hint && <span className="text-10 leading-relaxed text-content-ghost">{hint}</span>}
      </span>
    </label>
  );
}

const percent = (value: number) => `${(value * 100).toFixed(value >= 0.9995 || value === 0 ? 0 : 1)}%`;

export interface HitChanceDialogProps {
  onClose: () => void;
  buildEvaluation: BuildEvaluation;
  /** The equipped torso's class, used to seed the mirrored target. */
  armorType?: Armor['type'];
}

/**
 * Hit versus Evade, against a target you describe.
 *
 * The build supplies the attacker's side (its Hit tiers already carry the
 * flanking and Honor arithmetic), and this screen supplies the defender plus the
 * conditionals neither side can infer. See `domain/hitEvade.ts` for the model and
 * `optimizer-knowledge/01-core-mechanics/hit-and-evade-model.md` for its source.
 */
export default function HitChanceDialog({ onClose, buildEvaluation, armorType }: HitChanceDialogProps) {
  const [target, setTarget] = useState<TargetState>(() => mirrorTarget(buildEvaluation, armorType));
  const [attacker, setAttacker] = useState<AttackerState>(DEFAULT_ATTACKER);

  const patchTarget = (fields: Partial<TargetState>) => setTarget(prev => ({ ...prev, ...fields }));
  const patchAttacker = (fields: Partial<AttackerState>) => setAttacker(prev => ({ ...prev, ...fields }));

  const d = buildEvaluation.derived;
  /*
   * Re-run from the build's *uncapped* channels rather than read off
   * `derived.hitTiers`, because this screen adds bonus sources of its own and they
   * have to meet the +50 cap together with the build's. Adding them to an already
   * capped figure would let a build at the cap keep buying Hit.
   */
  const attack = attackerHit({
    baseHit: d.hitBase,
    fieldModifier: attacker.fieldModifier,
    brokenWeapon: attacker.brokenWeapon,
    baseMultiplier: attacker.baseMultiplier / 100,
    bonusMultiplier: attacker.bonusMultiplier / 100,
    hitBuffs: d.hitBonusSources + attacker.hitBuffs,
    hitDebuffs: attacker.hitDebuffs,
    // The build's own frontal bonus, so this screen agrees with the sheet about
    // how much Honor there is to pay out rather than assuming a maxed Smite.
    honorHitBonus: d.frontalHitBonus,
    feared: attacker.feared,
    fearResistance: attacker.fearResistance / 100,
    flanking: d.flanking,
  });

  const evade = targetEvade({
    baseEvade: target.scaledCel * 2 + target.armorEvade + target.baseEvadeMod + 5,
    baseMultiplier: target.baseMultiplier / 100,
    bonusMultiplier: target.bonusMultiplier / 100,
    evadeBuffs: target.evadeBuffs,
    evadeDebuffs: target.evadeDebuffs,
    fieldBuffs: target.fieldBuffs,
    fieldDebuffs: target.fieldDebuffs,
    knockedDown: target.knockedDown,
    armorType: target.armorType,
  });

  const rows = HIT_TIERS.map(tier => {
    const margin = attack.byTier[tier] - evade.total;
    const chance = hitChance(attack.byTier[tier], evade.total, attacker.blind);
    // Whether the 5% floor or the Blind cap is doing the work, so a row that
    // reads 5% explains itself rather than looking like a bug.
    return { tier, margin, chance, clamped: Math.abs(margin - chance) > 0.05, odds: instanceOdds(chance, attacker.instances) };
  });

  const evadeCapped = evade.bonusEvade >= BONUS_EVADE_CAP;

  return (
    <DeckDialog title="Hit chance" onClose={onClose} sections={SECTIONS}>
      <DialogSection
        id="target"
        title="Target"
        hint="The defender's side of the roll. Legs Evade (+5) is included automatically, as is the armor-class penalty when Knocked Down."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DialogField label="Scaled CEL" hint="2 Evade per point">
            <DialogNumber value={target.scaledCel} min={0} onChange={scaledCel => patchTarget({ scaledCel })} />
          </DialogField>
          <DialogField label="Armor Evade" hint="From the torso's description">
            <DialogNumber value={target.armorEvade} onChange={armorEvade => patchTarget({ armorEvade })} />
          </DialogField>
          <DialogField label="Armor class" hint="Sets the Knocked Down penalty">
            <select
              className={selectClass}
              value={target.armorType}
              onChange={event => patchTarget({ armorType: event.target.value as Armor['type'] })}
            >
              {ARMOR_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </DialogField>
          <DialogField label="Base Evade mod" hint="Dodger, Flock, not Legs">
            <DialogNumber value={target.baseEvadeMod} onChange={baseEvadeMod => patchTarget({ baseEvadeMod })} />
          </DialogField>
          <DialogField label="Evade buffs" hint={`Capped at ${BONUS_EVADE_CAP} together`}>
            <DialogNumber value={target.evadeBuffs} onChange={evadeBuffs => patchTarget({ evadeBuffs })} />
          </DialogField>
          <DialogField label="Evade debuffs">
            <DialogNumber value={target.evadeDebuffs} onChange={evadeDebuffs => patchTarget({ evadeDebuffs })} />
          </DialogField>
          <DialogField label="Field Evade" hint="Counts toward the cap">
            <DialogNumber value={target.fieldBuffs} onChange={fieldBuffs => patchTarget({ fieldBuffs })} />
          </DialogField>
          <DialogField label="Field penalty">
            <DialogNumber value={target.fieldDebuffs} onChange={fieldDebuffs => patchTarget({ fieldDebuffs })} />
          </DialogField>
          <DialogField label="Base multi %" hint="Guard −LV, Thick Brush +10">
            <DialogNumber value={target.baseMultiplier} onChange={baseMultiplier => patchTarget({ baseMultiplier })} />
          </DialogField>
          <DialogField label="Bonus multi %" hint="Body of Isesip −50">
            <DialogNumber value={target.bonusMultiplier} onChange={bonusMultiplier => patchTarget({ bonusMultiplier })} />
          </DialogField>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            label="Knocked Down"
            hint={`Costs a share of base Evade by armor class; ${target.armorType} here.`}
            checked={target.knockedDown}
            onChange={knockedDown => patchTarget({ knockedDown })}
          />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-8 border border-edge bg-surface-bar px-3 py-2 font-mono text-11">
          <span className="text-content-muted">Base <span className="text-content">{evade.preBonus.toFixed(1)}</span></span>
          <span className="text-content-muted">
            Bonus <span className={cx(evadeCapped ? 'text-caution-soft' : 'text-content')}>{evade.bonusEvade.toFixed(1)}</span>
            {evadeCapped && <span className="text-caution-soft"> (at cap)</span>}
          </span>
          <span className="text-content-muted">Total <span className="text-content font-semibold">{evade.total.toFixed(1)}</span></span>
        </div>
      </DialogSection>

      <DialogSection
        id="conditions"
        title="Your conditions"
        hint="Your Hit, Flanking and the +50 bonus cap come from the build. These are the things it cannot know."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DialogField label="Hit buffs" hint="Excluding Honor">
            <DialogNumber value={attacker.hitBuffs} onChange={hitBuffs => patchAttacker({ hitBuffs })} />
          </DialogField>
          <DialogField label="Hit debuffs">
            <DialogNumber value={attacker.hitDebuffs} onChange={hitDebuffs => patchAttacker({ hitDebuffs })} />
          </DialogField>
          <DialogField label="Field Hit" hint="Uncapped, unlike Evade">
            <DialogNumber value={attacker.fieldModifier} onChange={fieldModifier => patchAttacker({ fieldModifier })} />
          </DialogField>
          <DialogField label="Damage instances" hint="Fists 2, Guns per round">
            <DialogNumber value={attacker.instances} min={1} max={20} onChange={instances => patchAttacker({ instances })} />
          </DialogField>
          <DialogField label="Base multi %" hint="Close Shot">
            <DialogNumber value={attacker.baseMultiplier} onChange={baseMultiplier => patchAttacker({ baseMultiplier })} />
          </DialogField>
          <DialogField label="Bonus multi %" hint="Enemy Evaluation">
            <DialogNumber value={attacker.bonusMultiplier} onChange={bonusMultiplier => patchAttacker({ bonusMultiplier })} />
          </DialogField>
          <DialogField label="Fear resist %" hint={`Bravery, max ${MAX_FEAR_RESISTANCE * 100}`}>
            <DialogNumber
              value={attacker.fearResistance}
              min={0}
              max={MAX_FEAR_RESISTANCE * 100}
              onChange={fearResistance => patchAttacker({ fearResistance })}
            />
          </DialogField>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle label="Broken weapon" hint="Halves Hit before the bonus channel." checked={attacker.brokenWeapon} onChange={brokenWeapon => patchAttacker({ brokenWeapon })} />
          <Toggle label="Blind" hint="Caps the final hit chance at 75%." checked={attacker.blind} onChange={blind => patchAttacker({ blind })} />
          <Toggle label="Feared by target" hint="−15 Hit, less whatever Bravery covers." checked={attacker.feared} onChange={feared => patchAttacker({ feared })} />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-8 border border-edge bg-surface-bar px-3 py-2 font-mono text-11">
          <span className="text-content-muted">Base Hit <span className="text-content">{attack.preBonus.toFixed(1)}</span></span>
          <span className="text-content-muted">Bonus <span className="text-content">{attack.bonusHit.toFixed(1)}</span></span>
          <span className="text-content-muted">Honor room <span className="text-content">{attack.honorHeadroom.toFixed(1)}</span></span>
          <span className="text-content-muted">Flanking <span className="text-content">{d.flanking}</span></span>
        </div>
      </DialogSection>

      <DialogSection
        id="odds"
        title="Odds"
        hint="A miss rolls again for a glancing blow, so every glance column is two chances per instance."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-edge">
                {['Position', 'Hit − Evade', 'Hit', '1+ hits', '1+ glances', 'Half+ hits', 'All hit'].map(heading => (
                  <th key={heading} className="px-2 py-1.5 text-10 font-semibold uppercase tracking-wide text-content-muted">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tier, margin, chance, clamped, odds }) => (
                <tr key={tier} className="border-b border-edge-faint last:border-b-0">
                  <td className="px-2 py-2">
                    <div className="text-12 text-content">{HIT_TIER_LABEL[tier as HitTier]}</div>
                    <div className="text-10 leading-relaxed text-content-ghost">{HIT_TIER_HINT[tier as HitTier]}</div>
                  </td>
                  <td className="px-2 py-2 font-mono text-12 text-content-faint">{margin.toFixed(1)}</td>
                  <td className={cx('px-2 py-2 font-mono text-13 font-semibold', clamped ? 'text-caution-soft' : 'text-content')}>
                    {chance.toFixed(1)}%
                  </td>
                  <td className="px-2 py-2 font-mono text-12 text-content-secondary">{percent(odds.anyHit)}</td>
                  <td className="px-2 py-2 font-mono text-12 text-content-secondary">{percent(odds.anyGlance)}</td>
                  <td className="px-2 py-2 font-mono text-12 text-content-secondary">{percent(odds.halfHit)}</td>
                  <td className="px-2 py-2 font-mono text-12 text-content-secondary">{percent(odds.allHit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-11 leading-relaxed text-content-faint">
          Hit chance is floored at 5% and capped at 75% while Blind. A figure in amber has been
          clamped, so the raw <code>Hit − Evade</code> beside it is what actually changed. Honor is
          paid out of whatever the +50 bonus-Hit cap has left, so a build already at the cap gains
          nothing frontally.
        </p>
      </DialogSection>
    </DeckDialog>
  );
}
