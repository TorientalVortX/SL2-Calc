import type { RefObject } from 'react';
import { STAT_KEYS } from './domain/buildEvaluation';
import { STAT_COLORS, onDark } from './data/colors';
import { cx } from './design';
import { DeckLabel } from './CommandDeck';
import type { Armor, BuildEvaluation, StatKey, StatRecord, WeaponConfig } from './types';

export type ShareFormat = 'summary' | 'full' | 'code';

export const SHARE_FORMATS: Array<[id: ShareFormat, label: string]> = [
  ['summary', 'Summary card'],
  ['full', 'Full sheet'],
  ['code', 'Build code'],
];

/** Scale allocation bars against the largest scaled stat so they stay comparable. */
function barScale(stats: StatRecord): number {
  return Math.max(40, ...STAT_KEYS.map(s => stats[s] ?? 0));
}

export interface ShareCardProps {
  cardRef: RefObject<HTMLDivElement>;
  format: ShareFormat;
  buildName: string;
  race: string;
  subrace: string;
  mainClass: string;
  subClass: string;
  characterLevel: number;
  stats: StatRecord;
  addedStats: StatRecord;
  buildEvaluation: BuildEvaluation;
  equippedArmor: Armor | null;
  weaponConfig: WeaponConfig | undefined;
  buildCode: string;
}

/**
 * The shareable card — the Screenshot tab's centre column.
 *
 * Fixed at the design's 520px so the captured image is the same size regardless
 * of viewport; `cardRef` is what html2canvas renders.
 */
export default function ShareCard({
  cardRef,
  format,
  buildName,
  race,
  subrace,
  mainClass,
  subClass,
  characterLevel,
  stats,
  addedStats,
  buildEvaluation,
  equippedArmor,
  weaponConfig,
  buildCode,
}: ShareCardProps) {
  const d = buildEvaluation.derived;
  const identity = [subrace || race, mainClass === subClass ? mainClass : `${mainClass} / ${subClass}`]
    .filter(Boolean)
    .join(' · ');

  const derived: Array<[string, string | number]> = [
    ['HP', d.maxHP],
    ['FP', d.fp],
    ['Evade', d.evade],
    ['Hit', buildEvaluation.primaryWeapon?.hit ?? Math.floor(stats.ski * 2)],
    ['Phys. Def', `${d.physicalDefense}%`],
    ['Mag. Def', `${d.magicalDefense}%`],
  ];

  const loadout: Array<[label: string, value: string, detail: string]> = [
    ['Weapon', weaponConfig?.selectedWeaponName ?? 'None', weaponConfig?.weaponType ?? ''],
    ['Torso', equippedArmor?.name ?? 'None', equippedArmor?.type ?? ''],
    ['Battle weight', `${d.equipmentLoad}/${d.battleWeight}`, d.battleWeightRemaining < 0 ? 'over' : 'within'],
    ['Encumbrance', String(d.encumbrance), ''],
  ];

  const scale = barScale(stats);

  return (
    <div className="flex justify-center">
      <div
        ref={cardRef}
        className="flex w-[520px] max-w-full flex-col gap-4 rounded-[14px] border border-edge bg-surface-bar p-6"
      >
        <div className="flex items-baseline justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-22 font-bold leading-tight text-content">{buildName || 'Untitled Build'}</span>
            <span className="text-12 font-medium text-content-muted">{identity} · Level {characterLevel}</span>
          </div>
          <span className="shrink-0 font-mono text-11 font-medium text-content-ghost">SL2 Calculator</span>
        </div>

        {/* Stat grid — 1px gaps over a lighter ground give the hairline rules. */}
        <div className="grid grid-cols-6 gap-px overflow-hidden rounded-9 bg-edge-subtle">
          {STAT_KEYS.map(stat => {
            const key = stat as StatKey;
            const raw = STAT_COLORS[key];
            const colour = raw === 'rainbow' ? '#e6ebf5' : onDark(raw);
            return (
              <div key={key} className="bg-surface-base px-1.5 py-2.5 text-center">
                <div className="font-condensed text-10 font-semibold uppercase tracking-tag text-content-ghost">
                  {key.toUpperCase()}
                </div>
                <div className="mt-1.5 font-mono text-17 font-bold" style={{ color: colour }}>
                  {Math.floor(stats[key])}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {derived.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-11 font-medium text-content-muted">{label}</span>
              <span className="font-mono text-18 font-bold tracking-tight-value text-content">{value}</span>
            </div>
          ))}
        </div>

        {format === 'full' && (
          <div className="flex flex-col gap-4 border-t border-edge-faint pt-4">
            <section className="flex flex-col gap-2">
              <DeckLabel>Allocation</DeckLabel>
              <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-2 sm:gap-x-5">
                {STAT_KEYS.map(stat => {
                  const key = stat as StatKey;
                  const raw = STAT_COLORS[key];
                  const colour = raw === 'rainbow' ? '#e6ebf5' : onDark(raw);
                  return (
                    <div key={key} className="grid grid-cols-[40px_1fr_36px] items-center gap-2">
                      <span className="text-11 font-semibold text-content-secondary">{key.toUpperCase()}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-control">
                        <div
                          className="h-full rounded-full"
                          style={{ background: colour, width: `${Math.min(100, ((stats[key] ?? 0) / scale) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right font-mono text-12 font-bold text-content">{addedStats[key]}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <DeckLabel>Loadout</DeckLabel>
              <div className="grid grid-cols-2 gap-2">
                {loadout.map(([label, value, detail]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2.5">
                    <span className="text-11 font-medium text-content-muted">{label}</span>
                    <span className="flex flex-col gap-0.5 text-right">
                      <span className="text-12 font-semibold text-content-bright">{value}</span>
                      {detail && <span className="text-10 text-content-ghost">{detail}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {format === 'code' && (
          <div className="max-h-64 overflow-auto break-all rounded-7 bg-surface-sunken p-3 font-mono text-10 leading-relaxed text-content-muted">
            {buildCode || 'Build code unavailable — the build is too large to encode.'}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ShareFormatRailProps {
  format: ShareFormat;
  onFormatChange: (format: ShareFormat) => void;
  onDownload: () => void;
  onCopyCode: () => void;
}

/** Format picker and share actions — the Screenshot tab's right rail. */
export function ShareFormatRail({ format, onFormatChange, onDownload, onCopyCode }: ShareFormatRailProps) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <DeckLabel>Format</DeckLabel>
        <div className="flex flex-col gap-0.5">
          {SHARE_FORMATS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={format === id}
              onClick={() => onFormatChange(id)}
              className={cx(
                'rounded-8 px-3 py-2.5 text-left text-13 font-semibold transition-colors',
                format === id
                  ? 'bg-info-bg/50 text-content'
                  : 'text-content-secondary hover:bg-surface-raised',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-8 bg-info-bg px-3 py-3 text-center text-13 font-semibold text-content transition-colors hover:bg-info-edge"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={onCopyCode}
          className="rounded-8 border border-edge px-3 py-3 text-center text-13 font-semibold text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content"
        >
          Copy build code
        </button>
      </div>

      <p className="text-11 leading-relaxed text-content-faint">
        The card renders at 2× for sharing. Build code round-trips through Import / Export.
      </p>
    </>
  );
}
