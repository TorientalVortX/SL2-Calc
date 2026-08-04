# Equipment catalog and model boundaries

Research snapshot: 2026-08-04.

## Canonical local coverage

Source: validated files in `src/data/content/`. Confidence: `calculator-verified`.

- 311 weapon records across Axes, Bows, Daggers, Fists, Guns, Polearms, Swords, and Tomes.
- 63 torso records across Unarmored, Light Armor, and Heavy Armor.
- Weapon records include canonical ID/name, type, rarity, Power, Accuracy, Critical, Critical Damage, Weight, scaling variants, description, and modeled stat/effect metadata.
- Torso records include ID/name, armor type, Armor, Magic Armor, Evade, Weight, stat bonuses, elemental resistances, and structured conditional bonuses where available.
- Material, part, enchantment, quality, upgrade, two-handed, sentimentality, and mutation controls exist in the weapon calculator.

Descriptions/effects remain version-sensitive even when base values are locally canonical. The source files under `reference/weaponInfo/` and `reference/armorInfo/` are historical and must not override validated JSON without testing.

### Restricted automatic recommendations

Devil's Tome is not a general-purpose high-stat Tome. Its canonical `Devilbark Material` passive says that spells outside the Nerifian domain cannot be cast. This conflicts directly with flexible and multi-element spell plans, including the normal reason to value Shapeshifter's elemental breadth. Confidence: `calculator-verified` from `src/data/content/weapons-tomes.json`, corroborated by `reference/weaponInfo/Tomes.txt`.

Optimizer policy: exclude Devil's Tome from automatic weapon generation unless the user explicitly requests Devil's Tome or a Nerifian plan. An exact user weapon lock remains a hard constraint, but the result must report the casting restriction. Its Power, Hit, Critical, Hellfire damage, and WIL scaling cannot compensate for an incompatible spell-access requirement.

## Weapon evaluation

Source: `src/domain/weaponCalculation.ts`. Confidence: `calculator-verified`.

The calculator combines base values, material, parts, enchantment, qualities, upgrade level, sentimentality, configured scaling, and eligible two-handed bonuses. Weight modifiers are applied before the final floor. Mutation can change effective weapon type for rarities 1–8 according to the local mapping; 9-star weapons are not mutated.

The community [Weapons page](https://sl2.fandom.com/wiki/Weapons) corroborates the importance of Power, Accuracy, Critical, Weight, Durability, rounds for guns, upgrades, and unique effects. It is not sufficient to calculate a weapon's skill damage without exact current scaling and skill records.

## Torso evaluation

The community [Armor page](https://sl2.fandom.com/wiki/Armor) describes:

- Armor as flat physical reduction.
- Magic Armor as flat magical reduction.
- torso Evade as a base-Evade modifier.
- torso Weight as Battle Weight consumption, with negative torso Weight treated as zero.

Confidence: `community`; local base records are `calculator-verified`.

Optimizer policy:

- Always evaluate Armor, Magic Armor, Evade, Weight, stats, resistances, and conditions together.
- Do not count an item condition in the reliable scenario unless its trigger and expected uptime are supplied.
- Do not rank a high-Evade torso as universally superior to flat protection; armor type changes Evasion and class interactions.
- Respect class/skill requirements for Unarmored, Light, or Heavy Armor.

## Battle Weight and missing slots

The community [Battle Weight page](https://sl2.fandom.com/wiki/Battle_Weight) defines main weapon + torso + sub-weapon load and a −2 Hit/−2 Evade penalty per excess point. The calculator currently validates only primary weapon + torso. Results must say `partial load` until sub-weapon support is added.

Not yet represented in deterministic candidate generation:

- Sub-weapon/off-hand configuration and dual-wield/Akimbo/Twin Dance rules.
- Hands, footwear, and accessories.
- Item-belt state, including Priest Staff Mastery interactions.
- Full armor materials and upgrades.
- Set bonuses beyond explicitly configured controls.
- Granted skills, item cooldowns/charges, durability, acquisition, and economy.
- Most special item effects and their triggers.

## Known canonical gaps from supplied reference profiles

- Tricky Yoyo has no canonical weapon record and must remain unavailable.
- Hissei has no canonical weapon record and must remain unavailable.
- Any transformed/effective weapon type must be backed by a legal modeled enchantment or explicit verified mechanic.
- A profile's stated scaling must not silently replace canonical scaling unless the required transformation/enchantment is known.

## Data needed for each new item

- Exact canonical name/ID, slot, type, rarity, material family, and acquisition/version.
- Unmodified base Power/Accuracy/Critical/Critical Damage/Armor/Magic Armor/Evade/Weight.
- Every scaling component and whether it uses base, raw/final, scaled, elemental attack, or another quantity.
- Upgrade/material/part/enchantment behavior and maximum upgrade state.
- Trigger, duration, cooldown, charges, target, and uptime for each effect.
- Whether effects stack, share a cap, are dispellable, or are main-/sub-hand specific.
- Required class, skill, armor type, weapon type, range, facing, or status.
- Controlled before/after screenshots or logs and current game version.
