# Upgrade tracks for hands, legs and accessories

## Canonical item name and slot

Not one item — this covers the upgrade behaviour of equipment slots 3, 4, 5 and 6:
hands, legs and the two accessory slots.

## Base values

Every track starts at **0**. There is no base value granted by the slot itself.

## Scaling, enchantment, and upgrade behavior

Each slot has its own pair of upgradeable stats, and **one upgrade point is worth +1**
of its stat — the same rate the weapon and armor tracks already use.

| Slot | Upgrade tracks |
| --- | --- |
| 1, 3 — Weapons | Power, Critical, Accuracy, Durability |
| 2 — Torso | Armor, Magic Armor, Evade — **no durability** |
| 3 — Hands | Hit (applies to the main weapon), Max FP |
| 4 — Legs | Max HP, Evade |
| 5, 6 — Accessories | Fortune, Greed |

## Torso ceilings

Confidence: `player-reported` — supplied by the maintainer; the wiki dumps carry no
upgrade ceilings at all. Each armour class spends the same **16 points** across the
three channels in a different order, so the shape is a rotation rather than a slope —
which is why Heavy's Evade ceiling could not be interpolated when only the Unarmored
and Light Evade figures were known.

| Class | Armor | Magic Armor | Evade |
| --- | --- | --- | --- |
| Heavy | 8 | 5 | 3 |
| Light | 5 | 7 | 4 |
| Unarmored | 3 | 5 | 8 |

Weapons are simpler — **5 in every channel**, the same across all weapon types:

| Channel | Cap |
| --- | --- |
| Power | 5 |
| Critical | 5 |
| Accuracy | 5 |
| Durability | 5 |

## Torso quality tags

Confidence: `player-reported`. Armour carries quality tags the same way weapons do,
and they stack with the material, the enchantment and the upgrade spend.

| Tag | Effect |
| --- | --- |
| Solid | +2 Armor |
| Polished | +2 Magic Armor |
| Good Fit | +4 Evade |
| Lightweight | −2 Weight |
| Heavy | +2 Weight |

Modelled as independent booleans, matching the weapon quality flags — the
calculator does not claim to know how many tags one item may carry. Lightweight and
Heavy are the one genuinely exclusive pair and cancel when both are set, exactly as
the weapon's Light/Heavy do.

Good Fit's Evade lands in the **uncapped base channel**: a quality tag is part of
the item's own statline, so it does not compete for the +50 bonus ceiling. Weight
is applied inside the enchantment's weight multiplier, again as the weapon does it.

## The G6 bonus

**G6 is a world, not an item grade.** G6 and Korvara are the game's two worlds, with
separate content and, in places, separate rules — the wiki writes trait effects as
"G6: … Korvara: …" (`Servant Training`, `Dedicated Cleaner`) and marks items and
quests "G6 Only". Being in G6 raises **every recorded ceiling by one**.

It therefore lives on the build as `BuildState.world`, not on the item. Builds saved
before the field resolve to `DEFAULT_WORLD`, which is **Korvara** — the stricter of
the two. Defaulting to G6 would let a Korvara build quietly hold a spend it cannot
have; a G6 player instead sees a ceiling one too low and flips the toggle, which is
the mistake that announces itself.

A torso has **three** upgrade channels, not four: durability is a weapon track and
torsos have none at all. `ArmorUpgradePoints` is shaped accordingly, and a
durability value on a build saved before that is dropped on load rather than kept.

`null` in the cap table means "unknown", never "unlimited" — it is what an unknown
armour class returns, since capping against a class the build is not wearing would
be worse than not capping.

Enforced in three places, because each catches a different route to an illegal value:
the aether tracks and the legacy decks clamp on edit, and `normalizeBuildState` clamps
on load — every build saved before these ceilings existed can hold a spend no item can
reach, and clamping only on edit would let one sit there feeding derived values. The
load-time clamp covers the torso, the primary weapon and the off-hand.

Accessory upgrades are the odd pair: Fortune reduces the chance of dropping items or
murai on defeat, and Greed increases murai dropped by monsters. Both are percentages
and both stack across the two accessory slots. Neither is a combat stat, so accessories
contribute nothing to a damage or survivability model through their upgrades.

Hands, legs and accessories all additionally take a **material** and an
**enchantment**. A material applied to any of these slots uses its `Other` profile —
not its `Weapon` or `Armor` profile. See `wiki-data/equipment/materials.md`.

Unlike weapons and armor, these slots have **no per-item Armor, Magic Armor, Evade or
Weight values**; the wiki publishes none, and their entire per-item contribution is the
effect text. Everything they add to a loadout comes from three places: the effect text,
the upgrade tracks above, and the material/enchantment applied.

## Granted skills or passive effects

Not applicable at the slot level. Individual items grant skills — 22 of the 224 items
in slots 3-6 do — and those are recorded per item in `wiki-data/equipment/`.

## Conditional effects

None at the slot level. The upgrade tracks are unconditional.

## Build uses and tradeoffs

Hands and legs are the only two of these slots that feed a combat model at all through
upgrades: hands buys main-weapon Hit and Max FP, legs buys Max HP and Evade. Since the
rate is a flat +1 per point, the choice is a straight budget split with no breakpoints.

## Game version/date, source, and confidence

- Recorded 2026-08-12.
- **Hands tracks (Hit, Max FP)** — stated on the wiki's Hands page; `strong`.
- **Accessory tracks (Fortune, Greed)** — stated on the wiki's Accessories page; `strong`.
- **Legs tracks (Max HP, Evade)** — *not on the wiki*; supplied by the project owner.
  Confidence `community`.
- **Rate of +1 per point, and a base of 0** — supplied by the project owner, consistent
  with the existing weapon and armor upgrade model in `src/domain/equipment.ts`.
  Confidence `community`.

## Settled points

- These slots have **no durability track**. Durability is a weapon and armor concept
  only; hands, legs and accessories have exactly the two tracks listed above.
- Slot 3 is **exclusive**: it holds either a hands piece or a second weapon, never
  both. When an off-hand weapon is equipped there is no hands item at all, so the
  hands Hit and Max FP tracks do not exist for that build.

- There is **no upgrade point budget**, here or on weapons and armor. `src/types.ts`
  records this on `WeaponSlotConfig.upgradePoints` ("Uncapped — the game imposes no
  spend budget") and keeps `upgradeBudget` only to parse older build files. Any
  budget shown in a mockup is stale.
