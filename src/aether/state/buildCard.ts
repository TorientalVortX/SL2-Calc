import type { BuildEvaluation, BuildState, StatKey } from '../../types';
import { activeSets } from '../../domain/itemSets';
import { formatReadout, formatScaled, readoutGroups } from './readout';
import { SLOTS, slotSummary } from './equipment';
import { STAT_KEYS } from './build';
import type { LoadoutStatus } from './useBuilder';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const DERIVED_KEYS = ['maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'armor', 'evade', 'hit', 'critical', 'critDamage', 'swa'];

export interface BuildCardModel {
  name: string;
  classes: string;
  origin: string;
  stats: Array<{ key: StatKey; label: string; value: string }>;
  derived: Array<{ label: string; value: string }>;
  gear: Array<{ label: string; name: string; ul: number }>;
  sets: string[];
  counts: string;
}

export function buildCardModel(
  build: BuildState,
  evaluation: BuildEvaluation,
  buildName: string,
  status: Pick<LoadoutStatus, 'skillsSpent' | 'skillsBudget' | 'traitsSpent' | 'traitsBudget' | 'talentsSpent' | 'talentsBudget'>,
): BuildCardModel {
  const rows = readoutGroups(evaluation).flatMap(group => group.rows);
  const classes = build.mainClass === build.subClass ? `${build.mainClass} (Monoclass)` : `${build.mainClass} / ${build.subClass}`;
  return {
    name: buildName.trim() || 'Untitled Build',
    classes: build.destiny ? `${classes} · Destiny` : classes,
    origin: `${build.race} · ${build.subrace} · Lv ${build.characterLevel}`,
    stats: STAT_KEYS.map(key => ({ key, label: key.toUpperCase(), value: formatScaled(evaluation.scaledStats[key]) })),
    derived: DERIVED_KEYS.flatMap(key => {
      const row = rows.find(entry => entry.key === key);
      return row ? [{ label: row.label, value: `${formatReadout(row.value, row.format)}${row.partial ? '†' : ''}` }] : [];
    }),
    gear: SLOTS.map(slot => {
      const summary = slotSummary(build.equipment, slot.id);
      return { label: slot.label, name: summary.name ?? 'Empty', ul: summary.ul };
    }),
    sets: activeSets(build.equipment).map(set => `${set.name} ${set.equipped}/${set.total}`),
    counts: `Skills ${status.skillsSpent}/${status.skillsBudget} · Traits ${status.traitsSpent}/${status.traitsBudget} · Talents ${status.talentsSpent}/${status.talentsBudget}`,
  };
}

interface Palette {
  void: string;
  panel: string;
  edge: string;
  gold: string;
  goldDim: string;
  text: string;
  text2: string;
  text3: string;
  display: string;
  body: string;
  num: string;
  stat: Record<StatKey, string>;
}

function readPalette(root: HTMLElement): Palette {
  const css = getComputedStyle(root);
  const read = (name: string) => css.getPropertyValue(name).trim();
  return {
    void: read('--void'),
    panel: read('--ink-800'),
    edge: read('--ink-500'),
    gold: read('--gold-200'),
    goldDim: read('--gold-400'),
    text: read('--text'),
    text2: read('--text-2'),
    text3: read('--text-3'),
    display: read('--font-display'),
    body: read('--font-body'),
    num: read('--font-num'),
    stat: Object.fromEntries(STAT_KEYS.map(key => [key, read(`--ink-stat-${key}`)])) as Record<StatKey, string>,
  };
}

function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function drawCrest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const s = size / 32;
  const diamond = (top: number, half: number) => {
    ctx.beginPath();
    ctx.moveTo(x + 16 * s, y + top * s);
    ctx.lineTo(x + (16 + half) * s, y + 16 * s);
    ctx.lineTo(x + 16 * s, y + (32 - top) * s);
    ctx.lineTo(x + (16 - half) * s, y + 16 * s);
    ctx.closePath();
  };
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6 * s;
  diamond(2, 12);
  ctx.stroke();
  ctx.globalAlpha = 0.7;
  diamond(7, 7.5);
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  diamond(11.5, 3.5);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function heading(ctx: CanvasRenderingContext2D, p: Palette, text: string, x: number, y: number) {
  ctx.font = `600 15px ${p.display}`;
  ctx.fillStyle = p.goldDim;
  ctx.fillText(text.toUpperCase(), x, y);
}

function draw(ctx: CanvasRenderingContext2D, model: BuildCardModel, p: Palette, host: string, dataVersion: string) {
  ctx.fillStyle = p.void;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.edge;
  ctx.lineWidth = 1;
  ctx.fillRect(20, 20, CARD_WIDTH - 40, CARD_HEIGHT - 40);
  ctx.strokeRect(20.5, 20.5, CARD_WIDTH - 41, CARD_HEIGHT - 41);
  ctx.textBaseline = 'alphabetic';

  drawCrest(ctx, 52, 50, 48, p.gold);
  ctx.textAlign = 'left';
  ctx.font = `600 15px ${p.display}`;
  ctx.fillStyle = p.goldDim;
  ctx.fillText('AETHER CODEX', 116, 66);
  ctx.font = `700 40px ${p.display}`;
  ctx.fillStyle = p.text;
  ctx.fillText(fit(ctx, model.name, 560), 116, 104);

  ctx.textAlign = 'right';
  ctx.font = `600 26px ${p.display}`;
  ctx.fillStyle = p.gold;
  ctx.fillText(fit(ctx, model.classes, 440), CARD_WIDTH - 52, 76);
  ctx.font = `500 18px ${p.body}`;
  ctx.fillStyle = p.text2;
  ctx.fillText(model.origin, CARD_WIDTH - 52, 104);

  ctx.fillStyle = p.edge;
  ctx.fillRect(52, 132, CARD_WIDTH - 104, 1);

  ctx.textAlign = 'left';
  heading(ctx, p, 'Attributes', 52, 170);
  model.stats.forEach((stat, index) => {
    const x = 52 + Math.floor(index / 6) * 190;
    const y = 212 + (index % 6) * 50;
    ctx.fillStyle = p.stat[stat.key];
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 15);
    ctx.lineTo(x + 12, y - 9);
    ctx.lineTo(x + 6, y - 3);
    ctx.lineTo(x, y - 9);
    ctx.closePath();
    ctx.fill();
    ctx.font = `600 20px ${p.display}`;
    ctx.fillStyle = p.text2;
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, x + 22, y);
    ctx.font = `500 22px ${p.num}`;
    ctx.fillStyle = p.text;
    ctx.textAlign = 'right';
    ctx.fillText(stat.value, x + 150, y);
  });

  ctx.textAlign = 'left';
  heading(ctx, p, 'Derived', 472, 170);
  model.derived.forEach((row, index) => {
    const y = 206 + index * 33;
    ctx.font = `500 18px ${p.body}`;
    ctx.fillStyle = p.text2;
    ctx.textAlign = 'left';
    ctx.fillText(row.label, 472, y);
    ctx.font = `500 19px ${p.num}`;
    ctx.fillStyle = p.text;
    ctx.textAlign = 'right';
    ctx.fillText(row.value, 760, y);
  });

  ctx.textAlign = 'left';
  heading(ctx, p, 'Equipment', 804, 170);
  model.gear.forEach((slot, index) => {
    const y = 206 + index * 46;
    ctx.font = `600 13px ${p.display}`;
    ctx.fillStyle = p.text3;
    ctx.textAlign = 'left';
    ctx.fillText(slot.label.toUpperCase(), 804, y - 16);
    ctx.font = `500 19px ${p.body}`;
    ctx.fillStyle = slot.name === 'Empty' ? p.text3 : p.text;
    ctx.fillText(fit(ctx, slot.name, slot.ul ? 270 : 340), 804, y + 4);
    if (slot.ul) {
      ctx.font = `500 15px ${p.num}`;
      ctx.fillStyle = p.goldDim;
      ctx.textAlign = 'right';
      ctx.fillText(`UL ${slot.ul}`, CARD_WIDTH - 52, y + 4);
    }
  });
  ctx.textAlign = 'left';
  ctx.font = `500 16px ${p.body}`;
  ctx.fillStyle = p.gold;
  if (model.sets.length) ctx.fillText(fit(ctx, model.sets.join(' · '), 344), 804, 494);

  ctx.fillStyle = p.edge;
  ctx.fillRect(52, 532, CARD_WIDTH - 104, 1);
  ctx.font = `500 16px ${p.body}`;
  ctx.fillStyle = p.text2;
  ctx.fillText(model.counts, 52, 566);
  ctx.textAlign = 'right';
  ctx.font = `500 14px ${p.num}`;
  ctx.fillStyle = p.text3;
  ctx.fillText(`${host} · data ${dataVersion}`, CARD_WIDTH - 52, 566);
}

export async function renderBuildCard(model: BuildCardModel, dataVersion: string): Promise<Blob> {
  const palette = readPalette(document.documentElement);
  await Promise.all([
    `600 15px ${palette.display}`, `700 40px ${palette.display}`,
    `500 18px ${palette.body}`, `500 22px ${palette.num}`,
  ].map(font => document.fonts.load(font)));

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * scale;
  canvas.height = CARD_HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable.');
  ctx.scale(scale, scale);
  draw(ctx, model, palette, window.location.host, dataVersion);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not encode the card.'))), 'image/png');
  });
}
