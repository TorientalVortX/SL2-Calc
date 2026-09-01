# Talents: source gap closed

Checked: 2026-08-31. Confidence: `verified` for the state of the source.

This gap is **closed**. The wiki's [Talents page](https://sl2.miraheze.org/wiki/Talents) was a bare `'''PLACEHOLDER'''` when this was first checked on 2026-08-15; it has since been written out in full. It now documents 6 categories, 40 talents and 135 subtalents, each with its SP per rank, rank cap, and per-`SR` effect text.

## What replaced it

- `scripts/scrape-talents.mjs` pulls the page's wikitext through the MediaWiki API into `wiki-data/raw/talents.json` and `wiki-data/mechanics/talents.md`.
- `scripts/build-talent-data.mjs` derives `src/data/content/talents.json` and the catalog at `01-core-mechanics/talents-catalog.md`.
- `src/data/talents.ts` exposes the allocation helpers: weapon-rarity unlocks, per-stat modifier totals, and SP spending.

## What is now safe to use

- **Weapon access.** An Adaptation rank unlocks any weapon of its type up to `SR × 2` Rarity, for all seven types the game gates. This is access a class roster does not grant, so it is checked *alongside* `mainClassAllowsWeaponType`, never instead of it. Note that only the **main** class grants weapons for free: a subclass supplies skills, not proficiency, so Adaptation is the only route to anything outside the main roster. See `src/domain/equipment.ts`.
- **Per-rank stat modifiers** the wiki states plainly: Hit, Critical, Critical Damage, Power, Scaled Weapon ATK, Battle Weight, attack range, FP pool/regen/cost, Armor, Magic Armor, elemental ATK, and Status Infliction — each with the weapon types it is scoped to.
- **The point budget**: a flat 65 ranks (the wiki's 60 from levels plus 5 from Legend Extension), at most 10 ranks per talent. The calculator budgets the full figure rather than the level's share, because a sheet is used to plan a finished character. Ranks are the unit — SP is what those ranks bill at a rate that differs per talent.

## What is still not modeled

- Conditional modifiers (a stance, a facing, a time of day) are marked `conditional` and are excluded from totals unless a caller opts in. Do not quietly assume the build is in that stance.
- Non-combat subtalents (Cooking, Security, Harvest, Spiritualism…) carry prose only. Effects the wiki writes qualitatively ("based on SR") have no number and must not be given one.
- How talents interact with individual skills. The wiki states none.
- The calculator's trait requirement checks that reference talent ranks (`src/domain/traits.ts`) stay display-only until a build actually records its allocation.
