// Usage: node scripts/effect-coverage.mjs [--all] [bucket]  -> groups the text-only item effects by mechanic
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const SHOW_ALL = args.includes('--all');
const ONLY = args.find((arg) => !arg.startsWith('--'));
const data = JSON.parse(await readFile(path.resolve('src/data/content/item-effects.json'), 'utf8'));
// An armor's details line repeats numbers `armors.json` already applies; its special effects are what stays text.
const armorDetails = new Set(Object.values(JSON.parse(await readFile(path.resolve('src/data/armors.json'), 'utf8'))).flat().map((armor) => armor.details));

const ELEMENTS = 'Fire|Ice|Wind|Earth|Dark|Darkness|Water|Light|Lightning|Acid|Sound|Blunt|Pierce|Slash';
const STATS = 'STR|WIL|SKI|CEL|DEF|RES|VIT|FAI|LUC|GUI|SAN|APT';
const CHANNEL = String.raw`(?:${ELEMENTS}) (?:ATK|Resistance)|Critical(?: Chance)?|Maximum (?:HP|FP)|Evade|Armor|Magic Armor|Power|Hit`;

const test = (pattern) => (entry) => pattern.test(entry.description);

// First match wins, so narrower mechanics sit above broader ones.
const BUCKETS = [
  ['handled elsewhere', (entry) => armorDetails.has(entry.description) || test(/^Set: |^\d\+\s*[-:]|^[\w' -]+ Set$|class bonus enhancement|stat bonuses (?:it gives you )?(?:are )?increased by 50%|per set piece|for each Dragon (?:King|Queen) item/i)(entry)],
  ['granted skill', (entry) => Boolean(entry.grants) || /^grants? (?:the )?skill/i.test(entry.description)],
  ['potential skill', test(/potential skill/i)],
  ['special strike', test(/triggers before an enemy is attacked|special strike/i)],
  ['spell-school power', test(/power to [\w\s-]+spells?|spell power/i)],
  ['plain number the parser missed', test(new RegExp(String.raw`^(?:Material: \w+ )?[+-]?(?:\d+|UL)%? (?:${CHANNEL})\b|^[+-]?\d+ (?:${ELEMENTS}) & (?:${ELEMENTS}) ATK`, 'i'))],
  ['flag (casting tool, sub type, slots)', test(/casting tool|^Sub Type:|slots?\b|qualifies as|treated as having the|^Material: \w+\.?$/i)],
  ['on-hit bonus damage', test(new RegExp(String.raw`bonus damage|damage equal to \d+% of your|on hit: (?:if a \w+ weapon, )?deals|deals \d+\+?(?:UL)? (?:unresistable )?(?:${ELEMENTS})`, 'i'))],
  ['enemy armor reduction', test(/effectiveness of enemy armor|reduce enemy armor/i)],
  ['vampiric / drain', test(/vampiric|restores? (?:focus|fp|hp) based on damage/i)],
  ['status resistance', test(/status resist|resist(?:ance)? (?:to|versus|vs\.?|against) \w+|immun/i)],
  ['status infliction', test(/status infliction|inflicts?|chance (?:of automatically |to )?(?:inflict|apply|applying|cause)|applies or powers up/i)],
  ['damage taken from a race/type', test(/reduces? (?:all )?damage (?:from|taken)|damage reduction|reduce \w+ damage by/i)],
  ['damage vs a race/target', test(/damage dealt|scaled weapon atk by \d+% if|damage if|(?:against|versus|vs\.?) (?:[A-Z]\w+|sea-faring|undead|bosses?)|if the (?:target|enemy) is/i)],
  ['damage % (skill or type)', test(/(?:increases?|boosts?) (?:the )?damage|damage (?:is )?increased|\+\d+% damage|deals? \d+% (?:more|extra)|more damage per/i)],
  ['on hit / on crit', test(/\bon (?:hit|crit|kill|attack|defeat)|when you (?:hit|crit|kill|attack)|attacks? that hit|critical hits/i)],
  ['recovery', test(/recover|restore|regenerat|heal|drain|absorb/i)],
  ['armor / defense ignoring', test(/ignor|penetrat/i)],
  ['FP / cost / cooldown', test(/\bFP cost|costs?\b|cooldown|momentum/i)],
  ['range / area / movement', test(/range|tiles?|move|line|area|diamond|circle|cone|knock/i)],
  ['economy / drops / exp', test(/murai|drop|experience|encounter|escap|flee|steal/i)],
];

function shape(text) {
  return text
    .replace(new RegExp(String.raw`\b(?:${ELEMENTS})\b`, 'g'), '<type>')
    .replace(new RegExp(String.raw`\b(?:${STATS})\b`, 'g'), '<stat>')
    .replace(/[+-]?\d+(?:\.\d+)?%?/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110);
}

const lines = [];
for (const items of Object.values(data)) {
  for (const [item, entries] of Object.entries(items)) {
    for (const entry of entries) {
      if (entry.applies !== 'reference' || entry.onHit || entry.versus) continue;
      const bucket = BUCKETS.find(([, matches]) => matches(entry))?.[0] ?? 'other';
      lines.push({ item, bucket, shape: shape(entry.description), entry });
    }
  }
}

const byBucket = new Map();
for (const line of lines) {
  if (!byBucket.has(line.bucket)) byBucket.set(line.bucket, []);
  byBucket.get(line.bucket).push(line);
}

const total = Object.values(data).flatMap((items) => Object.values(items).flat()).length;
console.log(`${lines.length} of ${total} item effect lines are text only.\n`);
for (const [bucket, members] of [...byBucket].sort((a, b) => b[1].length - a[1].length)) {
  if (ONLY && !bucket.startsWith(ONLY)) continue;
  const items = new Set(members.map((member) => member.item)).size;
  console.log(`${String(members.length).padStart(4)}  ${bucket} (${items} items)`);
  const shapes = new Map();
  for (const member of members) {
    const seen = shapes.get(member.shape) ?? { count: 0, example: member };
    seen.count += 1;
    shapes.set(member.shape, seen);
  }
  const ranked = [...shapes].sort((a, b) => b[1].count - a[1].count);
  for (const [, { count, example }] of SHOW_ALL ? ranked : ranked.slice(0, 5)) {
    console.log(`        ${String(count).padStart(3)}× ${example.item}: ${example.entry.description.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
  if (!SHOW_ALL && ranked.length > 5) console.log(`        … ${ranked.length - 5} more wordings`);
}
