import { writeFile } from 'node:fs/promises';

const source = 'https://sl2.miraheze.org/wiki/Mixture_List';
const api = 'https://sl2.miraheze.org/w/api.php?action=parse&page=Mixture_List&prop=wikitext&format=json';
const response = await fetch(api);
if (!response.ok) throw new Error(`Mixture List returned ${response.status}`);
const page = await response.json();
const wikitext = page.parse?.wikitext?.['*'];
if (!wikitext) throw new Error('Mixture List has no wikitext');

function plainText(value) {
  return value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/'{2,5}/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function withEffects(value, effects) {
  const prefix = '{{#tip-text:';
  let output = '';
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf(prefix, cursor);
    if (start < 0) return output + value.slice(cursor);
    output += value.slice(cursor, start);
    let position = start + 2;
    let depth = 1;
    while (position < value.length && depth > 0) {
      if (value.startsWith('{{', position)) { depth++; position += 2; }
      else if (value.startsWith('}}', position)) { depth--; position += 2; }
      else position++;
    }
    if (depth !== 0) throw new Error('Unclosed mixture tooltip');
    const content = value.slice(start + prefix.length, position - 2);
    const divider = content.indexOf('|');
    if (divider < 0) throw new Error('Mixture tooltip has no description');
    const name = plainText(content.slice(0, divider));
    const effect = { name, description: '' };
    effects.push(effect);
    effect.description = plainText(withEffects(content.slice(divider + 1), effects));
    output += name;
    cursor = position;
  }
  return output;
}

const mixtures = [];
const starts = [...wikitext.matchAll(/\{\{\s*Mixture\s*\n/g)];
for (let mixtureIndex = 0; mixtureIndex < starts.length; mixtureIndex++) {
  const start = starts[mixtureIndex];
  const end = starts[mixtureIndex + 1]?.index ?? wikitext.length;
  const section = wikitext.slice(start.index + start[0].length, end);
  const body = section.slice(0, section.search(/^\s*\}\}\s*$/m))
    .replace(/\s+\|\s*([a-z][a-z0-9_]*)\s*=/g, '\n| $1 =');
  const fields = {};
  const markers = [...body.matchAll(/^\|\s*([a-z][a-z0-9_]*)\s*=\s*/gm)];
  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
    const end = markers[index + 1]?.index ?? body.length;
    fields[marker[1]] = body.slice(marker.index + marker[0].length, end).trim();
  }
  const name = fields.mix_name;
  const type = fields.mix_type;
  if (!name || !type) throw new Error('Mixture without a name or type');
  const dealsDamage = fields.deals_dmg !== '0';
  const mistEfficacy = Number(fields.mist_eff ?? (type === 'Mutagen' ? 70 : type === 'Balm' ? 60 : 80));
  const coatEfficacy = Number(fields.coat_eff ?? (type === 'Mutagen' ? 70 : type === 'Medicine' ? 60 : 80));
  const allyMultiplier = Number(fields.ally_multi ?? (type === 'Cocktail' ? 50 : 100));
  const effects = [];
  const description = plainText(withEffects(fields.mix_desc || '', effects));
  const uniqueEffects = [...new Map(effects.map(effect => [`${effect.name}\n${effect.description}`, effect])).values()];
  mixtures.push({
    name,
    type,
    chemicals: [fields.chem1, fields.chem2],
    element: dealsDamage ? (fields.elem_atk ?? 'Fire') : null,
    elementRatio: dealsDamage ? Number(fields.elem_atk_ratio ?? 50) : null,
    baseDamage: dealsDamage ? Number(fields.dmg_base ?? 30) : null,
    mistEfficacy: mistEfficacy > 0 ? mistEfficacy : null,
    mistDuration: mistEfficacy > 0 ? Number(fields.mist_dur ?? 1) : null,
    mistSize: mistEfficacy > 0 ? (fields.mist_size || (type === 'Balm' || type === 'Medicine' ? '2 Size Diamond' : '3 Size Diamond')) : null,
    coatEfficacy: coatEfficacy > 0 ? coatEfficacy : null,
    allyMultiplier: allyMultiplier > 0 ? allyMultiplier : null,
    kickback: fields.ally_kb === '1',
    description,
    effects: uniqueEffects,
    source,
  });
}
const effectCount = mixtures.reduce((count, mixture) => count + mixture.effects.length, 0);
if (effectCount < 100) throw new Error(`Only ${effectCount} mixture tooltips were captured`);
for (const mixture of mixtures) {
  for (const effect of mixture.effects) {
    if (effect.description) continue;
    const url = `https://sl2.miraheze.org/w/api.php?action=parse&page=${encodeURIComponent(effect.name.replace(/ /g, '_'))}&prop=wikitext&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${effect.name} returned ${response.status}`);
    const page = await response.json();
    const description = page.parse?.wikitext?.['*'];
    if (!description) throw new Error(`No wiki text for ${effect.name}`);
    effect.description = plainText(description);
  }
}

const counts = Object.groupBy(mixtures, mixture => mixture.type);
for (const type of ['Cocktail', 'Balm', 'Medicine', 'Mutagen']) {
  if (counts[type]?.length !== 15) throw new Error(`Expected 15 ${type} mixtures, found ${counts[type]?.length ?? 0}`);
  const recipes = new Map();
  for (const mixture of counts[type]) {
    const key = mixture.chemicals.join('+');
    if (recipes.has(key)) console.warn(`${type} ${key} appears for both ${recipes.get(key)} and ${mixture.name}`);
    recipes.set(key, mixture.name);
  }
}
await writeFile('src/data/content/mixtures.json', `${JSON.stringify({ source, mixtures }, null, 2)}\n`);
console.log(`Updated ${mixtures.length} mixtures and ${effectCount} tooltip effects from ${source}`);
