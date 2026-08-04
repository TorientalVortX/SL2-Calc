# Community profile regression set

Source: `src/data/content/optimizer-profiles.json`. Research snapshot: 2026-08-04. Confidence: `community`.

These profiles are supplied examples of builds players have used. They are candidate seeds and regression benchmarks, not mandatory templates. Their screenshot/profile stat values must never become a quality score. The optimizer should recover the represented subclass and weapon in the top three only when the canonical item exists and no candidate formally dominates it under the same constraints.

| Profile | Intended archetype | Priority stats | Represented weapon | Known gap |
| --- | --- | --- | --- | --- |
| Salamandra Bonder / Monk | Durable STR/SKI frontline | STR, SKI, DEF, RES, VIT, APT | Tricky Yoyo, supplied 70% STR/30% SKI Polearm behavior | Weapon is absent from canonical data |
| Amalgama Shapeshifter / Ghost | Flexible high-APT hybrid | STR, SKI, DEF, RES, APT | Spine Leash, supplied 70% STR/40% SKI Sword behavior | Exact Youkai/forms, skill rotation, and conditionals unknown |
| Karakuri Dragon Kensei / Bonder | STR/SKI Critical bruiser | STR, SKI, VIT, LUC, APT | Hissei, supplied 70% STR/30% SKI Gun behavior | Weapon is absent; Dragon/Youkai mechanics incomplete |
| Mechanation RAID Spellthief / Magic Gunner | CEL/GUI ranged | SKI, CEL, GUI, APT | Yin, supplied 100% GUI Bow behavior | Stolen spell loadout, gun/shell interaction, and effective-type provenance incomplete |
| Karatynn Hexer / Priest | Faith/status support with weapon pressure | STR, SKI, DEF, RES, FAI, APT | Shine Sword, supplied 60% STR/40% FAI Gun behavior | Spell/curse/heal loadout and weapon transformation must be verified |
| Amalgama Ghost / Black Knight | STR/SKI/LUC bruiser | STR, SKI, VIT, LUC, APT | Dynaxis, supplied 70% STR/40% LUC Tome behavior | Ghost HP cycle, armor, Black Knight mitigation, and transformation provenance unknown |
| Karakuri Avian Kensei / Bonder | High-CEL Kensei hybrid | STR, SKI, CEL, VIT, GUI, APT | Tarnada, supplied 70% STR/40% CEL Sword behavior | Avian/Youkai mechanics and exact Kensei rotation incomplete |

One Redtail Chemist / Monk profile is retained but disabled because Chemist does not exist in canonical class data.

## What an annotated replacement must add

For each profile, obtain:

- Exact invested stats separately from resulting raw/final/scaled stats.
- Full equipment, materials, upgrades, enchantments, weapon transformations, and all slots.
- Main/sub class placement and every equipped skill/rank.
- Traits, talents, prayer, history, food, race options, and persistent bonuses.
- Primary and backup rotations with Momentum/FP/HP costs.
- Baseline/reliable/ceiling Hit, Evade, mitigation, damage, and resource values.
- Intended PvP/PvE opponent benchmark.
- Why each unusual stat/item/class choice exists.
- What is fixed and what can be optimized.
- Current game version and a reproducible build export or screenshots.

Until those fields exist, profile similarity receives at most tie-break weight after mechanical feasibility and objective performance.

