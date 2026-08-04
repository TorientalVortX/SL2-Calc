# Class system and priority-class evidence

Research snapshot: 2026-08-04. Class roles and skill behavior from public pages are `community` evidence until checked in the current client. Values in the local class table are `calculator-verified` only.

## Class-system rules

The [official game site](https://neus-projects.net/) confirms that characters combine a Main Class and Sub Class, can unlock promoted classes, and can monoclass. The community [Dual Class System page](https://sl2.fandom.com/wiki/Dual_Class_System) further states:

- Main Class determines class stats, Move, weapon access, and main-class-only effects.
- Sub Class supplies its skill pool and innates but does not normally supply class stat bonuses.
- A promoted class inherits access to its base class's skills.
- Using the same class in both slots doubles its class stat bonuses.
- Main-class-only effects must not be assumed active from a subclass unless a verified exception such as Undeniable Innovator applies.

The calculator currently has these 40 class IDs:

- Soldier family: Soldier, Demon Hunter, Black Knight, Tactician, Solblader.
- Mage family: Mage, Evoker, Hexer, Rune Magician, Ruler.
- Archer family: Archer, Magic Gunner, Arbalest, Ranger.
- Curate family: Curate, Lantern Bearer, Priest, Aquamancer, Druid.
- Duelist family: Duelist, Kensei, Ghost, Firebird.
- Martial Artist family: Martial Artist, Monk, Verglas, Boxer, Shinobi.
- Rogue family: Rogue, Void Assassin, Spellthief, Engineer.
- Summoner family: Summoner, Grand Summoner, Bonder, Shapeshifter.
- Bard family: Bard, Performer, Dancer, Dark Bard.

The community class index still presents eight older base families and does not fully reflect the calculator's Bard/newer promotion structure. Treat family mappings for newer classes as requiring current-client verification.

## Canonical local class-stat table

Source: `src/data/content/classes.json`. Confidence: `calculator-verified`.

| Class | Local main-class stats | Local weapon access |
| --- | --- | --- |
| Soldier | STR+2, SKI+1, VIT+2 | Swords, Axes, Spears |
| Demon Hunter | STR+2, SKI+2, CEL+2, DEF+2 | Swords, Axes, Spears |
| Black Knight | STR+2, SKI+1, DEF+2, VIT+2, LUC+1 | Swords, Axes, Spears |
| Tactician | STR+1, WIL+1, SKI+2, CEL+2, DEF+1, RES+1 | Swords, Axes, Spears |
| Solblader | STR+2, WIL+2, CEL+2, FAI+2 | Swords, Axes, Spears |
| Mage | WIL+2, CEL+1, RES+2 | Tomes |
| Evoker | WIL+3, SKI+2, CEL+2, LUC+1 | Tomes |
| Hexer | WIL+1, SKI+1, DEF+3, RES+3 | Tomes |
| Rune Magician | WIL+3, SKI+2, GUI+3 | Tomes |
| Ruler | WIL+2, RES+2, LUC+2, SAN+2 | Tomes |
| Archer | SKI+2, CEL+2, LUC+1 | Daggers, Bows, Guns |
| Magic Gunner | WIL+2, SKI+3, CEL+2, LUC+1 | Daggers, Guns |
| Arbalest | STR+2, SKI+2, DEF+2, RES+1, LUC+1 | Daggers, Bows, Guns |
| Ranger | STR+2, SKI+2, CEL+2, SAN+2 | Daggers, Bows |
| Curate | WIL+2, CEL+2, RES+1 | Daggers, Tomes, Spears |
| Lantern Bearer | WIL+2, CEL+2, DEF+1, RES+2, LUC+1 | Daggers, Tomes, Spears |
| Priest | WIL+2, CEL+1, RES+2, FAI+3 | Daggers, Tomes, Spears |
| Aquamancer | WIL+1, CEL+2, VIT+3, FAI+2 | Daggers, Tomes, Spears |
| Druid | CEL+2, DEF+2, FAI+2, LUC+2 | Daggers, Tomes, Spears |
| Duelist | STR+1, SKI+2, CEL+2 | Swords, Daggers |
| Kensei | STR+2, SKI+2, CEL+2, LUC+2 | Swords |
| Ghost | none | Swords, Daggers |
| Firebird | STR+2, SKI+2, CEL+3, LUC+1 | Swords, Daggers |
| Martial Artist | STR+2, SKI+2, CEL+1 | Fist |
| Monk | STR+1, SKI+2, CEL+2, DEF+2, RES+1 | Fist |
| Verglas | STR+2, WIL+2, SKI+2, CEL+2 | Fist |
| Boxer | STR+2, SKI+2, DEF+2, VIT+2 | Fist |
| Shinobi | STR+2, CEL+4, GUI+2 | Fist |
| Rogue | SKI+1, CEL+2, LUC+2 | Daggers |
| Void Assassin | SKI+3, CEL+2, RES+2, LUC+1 | Daggers |
| Spellthief | STR+2, WIL+2, SKI+2, CEL+2 | Daggers |
| Engineer | STR+2, SKI+1, CEL+2, DEF+1, LUC+2 | Daggers, Guns |
| Summoner | WIL+2, CEL+2, RES+1 | Tomes |
| Grand Summoner | WIL+2, SKI+2, CEL+2, FAI+2 | Tomes |
| Bonder | STR+2, WIL+2, SKI+2, CEL+1, LUC+1 | Tomes |
| Shapeshifter | STR+2, SKI+2, CEL+2, LUC+2 | Tomes |
| Bard | CEL+2, LUC+1, SAN+2 | Daggers, Swords, Axes |
| Performer | CEL+2, LUC+2, SAN+3 | Daggers, Axes, Swords, Tomes |
| Dancer | STR+1, WIL+2, SKI+2, CEL+3 | Daggers, Axes, Swords, Guns |
| Dark Bard | STR+2, RES+2, VIT+1, SAN+3 | Daggers, Axes, Swords, Tomes |

## Immediate weapon-access conflicts

These conflicts can change which candidates the deterministic search explores and should be verified first:

- Ghost: local data says Swords/Daggers; community [Ghost page](https://sl2.fandom.com/wiki/Ghost) says Sword/Axe.
- Bonder: local data says Tomes; community [Bonder page](https://sl2.fandom.com/wiki/Bonder) says Axe/Spear/Sword/Tome.
- Shapeshifter: local data says Tomes; community [Shapeshifter page](https://sl2.fandom.com/wiki/Shapeshifter) says Fist/Tome/Dagger.
- Spellthief: local data says Daggers; community [Spellthief page](https://sl2.fandom.com/wiki/Spellthief) says Tome.
- Kensei: both sources support Sword, but skill-specific Katana restrictions must be recorded separately.
- Black Knight: both sources support Sword/Spear/Axe and Heavy Armor is central to several mechanics.

Until verified, the optimizer should report these as data conflicts rather than use the community list to bypass canonical local restrictions.

## Priority classes represented by current profile benchmarks

### Ghost

Role evidence: low-HP bruiser, Blood Magic, Claret Call pressure, mobility/control, and conditional survival. Community [Ghost page](https://sl2.fandom.com/wiki/Ghost). Confidence: `community`.

Required optimizer mechanics:

- HP-percentage costs for every Blood Magic/defensive action.
- Rising Game thresholds, exact affected stats, cap, and whether bonus stats can be suppressed.
- Claret Call generation, scaling, consumption, immunity, and target state.
- Wraithguard/Painproof/Rebound mitigation and One-on-One interaction.
- Hit/parry risk for Ether Invitation and exact weapon requirements for all skills.

### Black Knight

Role evidence: Heavy-Armor physical tank, ally protection, forced movement, parry, Critical Evade/Negation, and debuff cleansing. Community [Black Knight page](https://sl2.fandom.com/wiki/Black_Knight). Confidence: `community`.

Required mechanics: Heavy-Armor gates; Negation formula; Stalemate chance and facing; weapon-weight thresholds; Steel Aura/Body/Blood/Mind effects; Castling/Sacrifice redirection; Black Drain; gap closers; and magic-defense weaknesses.

### Kensei

Role evidence: Katana sequence attacker with skill-specific combo effects, stances, Hit/Critical/Evade innates, bullet deflection, and potentially high skill-slot demand. Community [Kensei page](https://sl2.fandom.com/wiki/Kensei). Confidence: `community`.

Required mechanics: which skills require Katana; stance upkeep; exact Sakki/Touki/Kenki/Peerless bonuses; combo order; Sacred Art; projectile-deflection chance; and skill-slot costs.

### Bonder

Role evidence: one-to-three Bonded Youkai, bond-dependent passives, coordinated positioning, sharing damage/resources, summon/install actions, and Youkai-dependent offense. Community [Bonder page](https://sl2.fandom.com/wiki/Bonder). Confidence: `community`.

Required mechanics: chosen Youkai records, level/friendship, contract slots, summon/install state, action control, stat inheritance, bond passives, shared damage, and each Conduct/offensive skill.

### Shapeshifter

Role evidence: Main-Class-focused Install transformations, Youkai-specific forms, elemental flexibility, HP-cost mimicry, and Evade through shifting. Community [Shapeshifter page](https://sl2.fandom.com/wiki/Shapeshifter). Confidence: `community`.

Required mechanics: selected Youkai and Install bonuses; Chaos Reflex generation/decay/cap; Night Shade; form race/type; HP costs; appendage bonuses; elemental damage; and whether subclass usage can access the intended form.

### Monk

Role evidence: flexible Ki-based offense/defense/support with multi-stat demands. Community [Monk page](https://sl2.fandom.com/wiki/Monk). Confidence: `community`.

Required mechanics: Ki generation/spend, Golden Glow/Spirituality/Discipline, each attack's stat/element scaling, Body of Isesip charges, Aid/Woki, Power Up, and Ki Awoken HP/stat behavior.

### Spellthief

Role evidence: configurable stolen-spell loadout, anti-spell utility, cooldown-limited magic, FP theft, illusions, and strong subclass dependence. Community [Spellthief page](https://sl2.fandom.com/wiki/Spellthief). Confidence: `community`.

Required mechanics: exact stolen spells, spell-card persistence, equipped-copy limit, casting tool/domain, cooldown modification, Illusion conditions, and the user's intended non-spell actions.

### Magic Gunner

Role evidence: gun basic attacks, shell selection, Charge/Overcharge state, multi-round weapons, and high dependence on Hit. Community [Magic Gunner page](https://sl2.fandom.com/wiki/Magic_Gunner). Confidence: `community`.

Required mechanics: selected gun and rounds; per-round hit/on-hit resolution; shell ranks/effects; Charge/Overcharge; Reloading; Akimbo; critical-to-Charge interactions; and projectile counters.

### Hexer

Role evidence: status-dependent control and damage-over-round with strong WIL/SKI infliction needs and DEF/RES class stats. Community [Hexer page](https://sl2.fandom.com/wiki/Hexer). Confidence: `community`.

Required mechanics: curse/hex formulas and immunities, Dark Invasion, invocation setup, exact elemental attacks, duration/cooldown, enemy Status Resistance benchmark, silence/rush risk, and team payoff from debuffs.

### Priest

Role evidence: healing, cleansing, status immunity, staff/tool interactions, Light offense, Sanctuary, and costly party support. Community [Priest page](https://sl2.fandom.com/wiki/Priest). Confidence: `community`.

Required mechanics: heal scaling; Detailed Care; treatment coverage; Malmelo cooldown; Sanctuary effects; God Rod/casting-tool legality; Invocation setup; Staff Mastery item-belt state; and FP sustain.

## Skill-record completion rule

A class pair cannot receive an invented numerical synergy score. It can be explored based on qualitative evidence, but exact ranking requires the actions that make both classes essential, their costs, their legal equipment, and the target content. Popular pairings are regression examples, not proof that the pair is optimal.

