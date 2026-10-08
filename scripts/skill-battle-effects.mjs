const stats = ['str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt'];
const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
const effect = (kind, key, values, extra = {}) => ({ kind, key, valueByRank: values, applies: 'conditional', ...extra });
const statEffects = (keys, values, extra) => keys.map(key => effect('stat', key, values, extra));
const derived = (key, values, extra) => effect('derived', key, values, extra);
const element = (key, values, extra) => effect('element', key, values, extra);
const resistance = (key, values, extra) => effect('elementResistance', key, values, extra);
const input = (key, label, max, initial = 0, extra = {}) => ({ key, label, min: 0, max, default: initial, ...extra });
const elementInput = (label) => input('element', label, 10, 0, { choices: [{ value: 0, label: 'Choose element' }, ...elements.map((label, index) => ({ value: index + 1, label }))] });

export function applyBattleEffects(skill) {
  const add = (...effects) => skill.effects.push(...effects);
  const ids = {
    'blazing-sol': () => add(...statEffects(stats, [3])),
    'ki-awoken': () => add(...statEffects(stats.filter(key => key !== 'vit'), [4, 7, 10])),
    thrillseeker: () => add(...statEffects(stats, [2])),
    'mighty-wall': () => add(...statEffects(['def', 'res'], [3, 4, 5])),
    sanctuary: () => add(...statEffects(['def', 'res'], [2, 4, 6, 8, 10])),
    'dark-stage': () => add(...statEffects(['def', 'res'], [3, 4, 5]), ...['Fire', 'Dark', 'Sound'].map(key => element(key, [9, 12, 15]))),
    'aria-of-agility': () => add(...statEffects(['cel', 'ski'], [2, 2, 2, 2, 2], { condition: 'Singing' }), derived('hit', [2, 4, 6, 8, 10]), derived('evade', [2, 4, 6, 8, 10])),
    'samba-of-strength': () => add(...statEffects(['str', 'ski'], [2, 2, 2, 2, 2], { condition: 'Singing' }), derived('swa', [2, 4, 6, 8, 10]), derived('critical', [2, 4, 6, 8, 10])),
    'anthem-of-enthusiasm': () => add(...statEffects(['wil', 'gui'], [2, 2, 2, 2, 2], { condition: 'Singing' }), ...elements.map(key => element(key, [2, 4, 6, 8, 10])), derived('criticalDamage', [2, 4, 6, 8, 10])),
    'anthem-of-enthusiasm-bard': () => add(...statEffects(['def', 'res'], [2, 2, 2, 2, 2], { condition: 'Singing' }), ...elements.map(key => resistance(key, [1, 2, 3, 4, 5])), derived('criticalEvade', [2, 4, 6, 8, 10])),
    'volume-up': () => add(element('Sound', [5, 10, 15])),
    'roaring-falcon': () => add(element('Sound', [5, 10, 15])),
    'sonic-arrow': () => add(element('Sound', [5, 10, 15])),
    'dodging-tomatoes': () => add(derived('evade', [5, 10, 15], { condition: 'Singing' })),
    'ring-of-pearls': () => add(derived('evade', [5, 10, 15])),
    'nest-flight': () => add(derived('evade', [10, 20, 30])),
    'night-shade': () => add(derived('evade', [25])),
    'black-deflection': () => add(derived('hit', [5])),
    'watchful-eye': () => add(derived('hit', [5], { condition: 'Against watched target' })),
    'firing-posture': () => add(derived('hit', [5], { weapons: ['Bow', 'Gun'] })),
    'cobra-stance': () => add(derived('evade', [5])),
    'desperado-stance': () => add(derived('hit', [5])),
    'matador-stance': () => add(derived('armor', [2]), derived('magicArmor', [2])),
    'dragon-strength': () => add(derived('critical', [15]), derived('criticalDamage', [15])),
    'bunker-formation': () => add(derived('armor', [5]), derived('magicArmor', [5])),
    'distorted-beat': () => add(derived('evade', [10, 10]), derived('armor', [5, 5]), derived('magicArmor', [5, 5])),
    'ensui-veil': () => add(derived('armor', [1, 2, 3, 4, 5]), derived('magicArmor', [1, 2, 3, 4, 5]), resistance('Fire', [3, 6, 9, 12, 15])),
    'lighten-the-load': () => add(...statEffects(['cel'], [3, 4, 5]), derived('battleWeight', [15, 20, 25])),
    'deadly-aim': () => add(derived('hit', [4, 7, 10]), derived('criticalDamage', [4, 7, 10])),
    'deadly-arms': () => add(derived('criticalDamage', [10], { applies: 'always', weapons: ['Dagger'] })),
    'hell-s-beating': () => add(derived('criticalDamage', [35, 40, 45], { condition: 'Instrument attack' })),
    prophylaxis: () => add(derived('criticalDamage', [10, 20, 30], { condition: 'Counterattack' })),
    'golden-glow': () => add(derived('physicalDefense', [2, 4, 6, 8, 10]), derived('magicalDefense', [2, 4, 6, 8, 10])),
    'upgrade-electro-shield': () => add(derived('critical', [5, 10, 15])),
    'upgrade-flamethrower': () => add(derived('power', [5, 10, 15])),
    'upgrade-jetpack': () => add(derived('evade', [5, 10, 15])),
    'upgrade-launcher': () => add(derived('hit', [5, 10, 15])),
    'musical-prodigy': () => add(...statEffects(['san'], [1, 2, 3, 4, 6], { applies: 'always' })),
    'spirit-well': () => add(derived('fp', [3, 6, 9, 12, 18], { applies: 'always' })),
    resourceful: () => add(derived('skillPool', [1, 2, 3], { applies: 'always' })),
    'trained-ears': () => add(resistance('Sound', [10], { applies: 'always' })),
    insulate: () => add(resistance('Ice', [10, 20, 30])),
    'dark-shield': () => {
      add(resistance('Dark', [3, 6, 9, 12, 15], { applies: 'always' }), ...statEffects(['res'], [1, 1, 1, 1, 1]));
      skill.inputs = [input('void-energy', 'Void Energy spent', 60, 0, { maxByRank: [20, 30, 40, 50, 60], maxRankSource: 'voidveil' })];
      add(...statEffects(['res'], [0.2, 0.2, 0.2, 0.2, 0.2], { input: 'void-energy', round: 'floor' }));
    },
    'fortune-wind': () => add(derived('evade', [5, 10, 15], { scaledStat: { stat: 'luc', percent: 50 } })),
    pray: () => add(...statEffects(['luc'], [0, 0, 0, 0, 0], { scaledStat: { stat: 'fai', percent: 50 } })),
    grandmaster: () => add(derived('hit', [0], { applies: 'always', weapons: ['Greatsword', 'Greataxe', 'Greatlance'], scaledStat: { stat: 'gui', percent: 50 } })),
    'striking-samba': () => add(derived('critical', [3, 6, 9, 12, 15], { rankSource: 'samba-of-strength' })),
    'amplified-aria': () => add(derived('evade', [3, 6, 9, 12, 15], { rankSource: 'aria-of-agility' })),
    'flash-of-light': () => add(...elements.map(key => element(key, [5], { condition: 'Holy Aura' }))),
    'speed-of-light': () => add(derived('evade', [15], { condition: 'Holy Aura' })),
    'wall-of-light': () => add(derived('armor', [5], { condition: 'Holy Aura' }), derived('magicArmor', [5], { condition: 'Holy Aura' })),
    'sol-charge': () => { skill.inputs = [input('solcharges', 'Solcharges', 6)]; add(element('Light', [1], { input: 'solcharges' })); },
    'aquae-crest': () => { skill.inputs = [input('crest', 'Aquae Crest LV', 9)]; add(element('Water', [1, 1], { input: 'crest' })); },
    'serpent-strikes': () => { skill.inputs = [input('ki', 'Ki', 30)]; add(derived('critical', [1], { input: 'ki', weapons: ['Fist'] })); },
    'fox-s-cunning': () => { skill.inputs = [input('stacks', 'Stacks', 6, 1)]; add(element('Ice', [5], { input: 'stacks' })); },
    'hare-s-agility': () => { skill.inputs = [input('stacks', 'Stacks', 6, 1)]; add(derived('evade', [5], { input: 'stacks' })); },
    'bear-s-might': () => { skill.inputs = [input('stacks', 'Stacks', 6, 1)]; add(derived('power', [5], { input: 'stacks' }), derived('criticalDamage', [5], { input: 'stacks' })); },
    'chaos-reflex': () => { skill.inputs = [input('level', 'Chaos Reflex LV', 40, 8, { maxByRank: [24, 32, 40] })]; add(derived('evade', [1, 1, 1], { input: 'level' })); },
    'bloody-karma': () => { skill.inputs = [input('curses', 'Curses on target', 20)]; add(derived('critical', [5, 10, 15, 20, 25], { input: 'curses' })); },
    'veil-off': () => { skill.inputs = [input('void-energy', 'Void Energy spent', 60, 0, { maxByRank: [20, 30, 40, 50, 60], maxRankSource: 'voidveil' })]; add(derived('critical', [1, 1, 1], { input: 'void-energy' })); },
    'black-drain': () => { skill.inputs = [input('level', 'Black Drain LV', 4)]; add(derived('swa', [1], { input: 'level' })); },
    'fight-as-one': () => { skill.inputs = [input('multiplier', 'Bonus multiplier', 2, 1, { min: 1 })]; add(...['hit', 'evade', 'critical', 'criticalEvade'].map(key => derived(key, [4, 7, 10], { input: 'multiplier' }))); },
    'synchro-summon': () => add(...statEffects(stats, [2, 3, 4, 5, 6], { condition: 'One Bonded Youkai' })),
    'eastern-wind': () => add(...statEffects(['ski', 'cel'], [1, 1, 2, 2, 3], { condition: 'East bonus' })),
    'northern-wind': () => add(derived('critical', [4, 6, 8, 10, 12], { condition: 'North bonus' })),
    'southern-wind': () => add(derived('evade', [4, 7, 10], { condition: 'South bonus' })),
    poise: () => add(derived('critical', [3, 6, 9, 12, 15], { condition: 'Perfect Poise' })),
    'focused-mind': () => add(derived('hit', [3, 6, 9, 12, 15], { condition: 'Overcharged', weapons: ['Gun'] })),
    'overheat-bullet': () => add(derived('swa', [1, 2, 3, 4, 5], { weapons: ['Gun'] }), derived('criticalDamage', [2, 4, 6, 8, 10], { weapons: ['Gun'] })),
    'safety-gear': () => {
      add(...['Fire', 'Ice', 'Wind', 'Lightning', 'Earth'].map(key => resistance(key, [6, 8, 10])), derived('statusResistancePercent', [15, 15, 15]));
      skill.battleRules = [{ description: '+LV% Fire, Ice, Wind, Lightning, and Earth Resistance. +15% Status Resistance. Provides immunity to effects of Mist field objects. -1 Move. Always treated as Silenced.', url: 'https://sl2.miraheze.org/wiki/Safety_Gear_(effect)' }];
    },
    'hard-light': () => { skill.inputs = [elementInput('Last lantern element')]; add(resistance('selected', [5, 10, 15, 20, 25], { elementInput: 'element' })); },
    'bask-in-light': () => { skill.inputs = [elementInput('Lantern element')]; add(resistance('selected', [2, 4, 6, 8, 10], { elementInput: 'element' })); },
    'enchant-shield': () => { skill.inputs = [elementInput('Shield element')]; add(resistance('selected', [5, 10, 15], { elementInput: 'element' })); },
    'install-element-boost': () => { skill.inputs = [elementInput('Installed Youkai element')]; add(element('selected', [3, 4, 5], { elementInput: 'element' })); },
    brighten: () => add(resistance('Light', [5, 10, 15])),
    'afflicted-spectre': () => { skill.inputs = [input('statuses', 'Negative status effects', 999)]; add(derived('hpPercent', [5, 5], { input: 'statuses' })); },
    'weir-konnen': () => add(derived('defensiveKnowledge', [0], { applies: 'always', scaledStat: { stat: 'wil', percent: 20 } })),
    'stand-off': () => add(derived('defensiveKnowledge', [0, 0], { applies: 'always', scaledStat: { stat: 'wil', percent: 20 } })),
    'tome-specialist': () => add(derived('hit', [5], { applies: 'always', weapons: ['Tome'] }), derived('hit', [5], { condition: 'Matching element', weapons: ['Tome'] })),
    'bard-s-dexterity': () => add(derived('hit', [5], { applies: 'always', weapons: ['Axe', 'Instrument'] })),
  };
  ids[skill.id]?.();
  if (['aria-of-agility', 'samba-of-strength', 'anthem-of-enthusiasm', 'anthem-of-enthusiasm-bard'].includes(skill.id)) {
    for (const effect of skill.effects) delete effect.condition;
  }
  if (skill.id === 'anthem-of-enthusiasm-bard' && skill.text.url.endsWith('/Dawr_of_Defense')) skill.name = 'Dawr of Defense';
  const eternalStats = /Eternal Flame:\s*([A-Z]{3}(?:,\s*[A-Z]{3})*)\s*(?:$|\n)/.exec(skill.text.description)?.[1];
  if (eternalStats) add(...statEffects(eternalStats.split(/,\s*/).map(key => key.toLowerCase()), [1, 2, 3, 4, 5], { rankSource: 'eternal-flame', condition: 'Eternal Flame' }));
  const shapes = {
    'wild-shape-bear': ['armor', 'swa'], 'wild-shape-hawk': ['evade', 'hit'],
    'wild-shape-wolf': ['evade', 'critical'], 'wild-shape-viper': ['evade', 'magicArmor'],
  };
  if (shapes[skill.id]) {
    add(...shapes[skill.id].map(key => derived(key, [3, 4, 5])));
    skill.battleNote = 'Race changes and animal attacks are not calculated.';
  }

  if (['aerial-razor', 'geldoren', 'bloody-ball'].includes(skill.id)) for (const effect of skill.effects) effect.target = 'enemy';
  if (skill.id === 'blotch') Object.assign(skill.effects[0], { target: 'enemy', valueByRank: skill.effects[0].valueByRank.map(value => -value) });
  if (skill.id === 'astral-aegis') { skill.effects[0].statMode = 'class'; add(...statEffects(['res'], [5], { statMode: 'class' })); }
  if (skill.id === 'agile-protection') skill.effects[0].key = 'criticalEvade';
  if (skill.id === 'scharfe') {
    skill.inputs = [input('schwarz-sturm', 'Schwarz Sturm LV', 8, 0, { maxByRank: [4, 5, 6, 7, 8], maxRankSource: 'schwarz-sturm' })];
    for (const effect of skill.effects) effect.input = 'schwarz-sturm';
  }
  if (skill.id === 'wind-weave') { skill.inputs = [input('schwarz-sturm', 'Schwarz Sturm LV', 8, 0, { maxByRank: [4, 5, 6, 7, 8], maxRankSource: 'schwarz-sturm' })]; add(derived('evade', [2], { input: 'schwarz-sturm' })); }
  if (skill.id === 'vent-petale') add(...statEffects(['ski', 'def'], [3, 4, 5], { statMode: 'class' }));
  const weaponSkills = { snipe: ['Bow'], 'dynamic-shooting': ['Bow', 'Gun'], 'trained-fists': ['Fist'], 'focused-mind': ['Gun'], 'heavy-bow-mastery': ['Bow'], 'one-hit-wonder': ['Shotgun'] };
  if (weaponSkills[skill.id]) for (const effect of skill.effects) effect.weapons = weaponSkills[skill.id];
  if (skill.id === 'straight-cannon') {
    skill.effects[0].unmodelled = 'Depends on Special Armament weight.';
    skill.battleNote = 'The Hit penalty depends on Special Armament weight; it is not calculated yet.';
  }
  if (skill.id === 'overload-copy') { skill.effects[0].unmodelled = 'Copy spells only.'; skill.battleNote = 'The Power bonus applies to Copy spells only.'; }
}
