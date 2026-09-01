/**
 * Build-time feature switches.
 *
 * Flip a flag to `true` and the feature comes back everywhere at once: the code
 * behind each one is left intact rather than deleted, so re-enabling is a
 * one-line edit and needs no other change. Each flag documents what it gates
 * and what the app falls back to while it is off.
 */
export const FEATURES = {
  /**
   * The PvP Gauntlet goal and its "Counter targets" opponent list.
   *
   * Off: the goal is hidden from the preset list, the opponent checkboxes never
   * render, and no gauntletOpponentIds reach the engine, so V2 never runs the
   * gauntlet and candidates carry no gauntletReport. The scoring code in
   * BuildOptimizerV2 and domain/opponentGauntlet is untouched and still tested.
   */
  pvpGauntlet: false,

  /**
   * The AI planner engine (Terra / Sol) and its Brief panel.
   *
   * Off: "AI planner" is dropped from the engine list, the engine defaults to
   * the deterministic V2 search, the Brief textarea and depth picker are
   * hidden, the /api/optimizer-health probe is skipped, and run() never calls
   * /api/optimizer-ai. The server routes stay mounted and functional.
   */
  aiPlanner: false,
} as const;
