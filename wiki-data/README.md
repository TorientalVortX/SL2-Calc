# SL2 wiki data

Scraped from the [Sigrogana Legend 2 Wiki](https://sl2.miraheze.org/wiki/Sigrogana_Legend_2_Wiki) on **2026-08-11**
by `scripts/scrape-wiki.mjs`. Regenerate with `npm run scrape:wiki` — the script rewrites
this whole directory, so `git diff` shows exactly what changed on the wiki.

These files are the reference values the calculator should agree with. Unlike
`optimizer-knowledge/` (personal notes, evidence-only), everything here is transcribed
from the wiki without interpretation.

## Layout

- `classes/` — one file per class: type, weapons, move, per-level stat bonuses, skill roster. Start at [`classes/_index.md`](classes/_index.md).
- `skills/` — one file per class listing every skill with FP cost, momentum, range, power and full description. Start at [`skills/_index.md`](skills/_index.md).
- `youkai/` — one file per Youkai type, each Youkai with level 1 / level 60 stat lines and full skill text. Start at [`youkai/_index.md`](youkai/_index.md).
- `mechanics/` — stat, damage, hit/evade, critical and other formula pages.
- `races/` — one file per race: base stats and racial skills. Written by `scripts/scrape-races.mjs`.
- `equipment/` — one file per equipment kind (weapons, armor, hands, legs, accessories) with every item's stats, effects and drop locations, plus item materials and catalysts. Written by `scripts/scrape-equipment.mjs`. Start at [`equipment/_index.md`](equipment/_index.md).
- `raw/` — the same class, skill, Youkai, race, equipment, material and catalyst records as JSON, for importing into calculator data files.
- [`COVERAGE.md`](COVERAGE.md) — what the wiki does **not** document. Read this before trusting a class to be complete.

## Reading the numbers

Slash-separated values are **per skill rank, rank 1 first**. `13/15/17/19/21 FP` means
rank 1 costs 13 FP and rank 5 costs 21 FP. A single value applies at every rank.

| Field | Meaning |
| --- | --- |
| Max Rank | Highest rank the skill can reach |
| FP | Focus Point cost |
| Momentum | Momentum spent to use the skill |
| Range | Tiles between user and target |
| Power | Damage scaling, usually a % of Scaled Weapon Attack |
| Target | Shape and size of the affected area |
| Cooldown | Rounds before the skill can be reused |

## Caveats

- The wiki lags the game on recent patches; treat values as strong, not verified.
- Blank fields mean the wiki infobox left them blank, not that the value is zero.
- Skills shared by several classes are filed under each class that lists them.
- Skill categories are normalised to Offensive / Defensive / Support / Utility / Passive / Innate.
  Where the wiki wrote something else, the original is shown next to the category.
- Some classes are only partly documented on the wiki. See [`COVERAGE.md`](COVERAGE.md).
