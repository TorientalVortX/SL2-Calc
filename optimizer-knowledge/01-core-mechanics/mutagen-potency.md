# Mutagen Potency and Complex Mutation

Source: [SL2 Wiki — Mutagen](https://sl2.miraheze.org/wiki/Mutagen), read 2026-10-07. Wiki mechanics; not yet independently tested in game.

- Total Mutagen Potency is the sum of the Potency printed on active Mutagen effects, plus **10 for every active Mutagen effect after the first**. Two effects granting 15 each therefore yield 40 total Potency. An active Mutagen effect with no printed Potency can still count toward the additional-effect bonus.
- At the start of a new round, while Mutagen Potency is present, the page gives the Complex Mutation check as `2 × total Mutagen Potency − Status Resist%`. Shapeshifter grants 15 Status Resist for this check, Chimera race grants another 15, and the two stack. These bonuses do not increase general Status Resistance.
- Complex Mutation can trigger a random Unstable skill. Below 30 Potency, the eligible category is Lesser; from 30 through 59, Lesser or Moderate; at 60 or more, Moderate or Greater. The wiki does not yet list the possible Unstable skills, so their outcomes are not simulated.
- The calculator clamps the displayed chance to 0–100%. It computes the number from planned, toggled active mixture effects; the user must maintain those toggles to match the battle state.

Build implication: an Ape effect (+30) and Tendril Tonic (+15) total **55**, not 45. A third active Mutagen effect without printed Potency raises that to **65**, crossing the Greater threshold. For a Shapeshifter with 30 Status Resistance, the two-effect setup has an 65% displayed Complex Mutation chance (`110 − 30 − 15`); the third effect also may reduce Status Resistance depending on its own text.

User-confirmed 2026-10-07: Evolution Drought stat changes are changes to **Base Stats**. The calculator places their +/− stat values on the base-stat line before its diminishing-return calculation. Temporary drought effects do not change the permanent allocation cap.
