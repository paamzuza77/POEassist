// P5 Phase 4 (patch 0.70) — shared scoring/state constants, lifted verbatim from index.html.
// State-module foundation: lifting these first unblocks migrating the functions that read them
// (formatResValue → CAP now; radar/forge scoring later). Values are BYTE-IDENTICAL — never change
// them here (iron rule: no formula/threshold changes during migration).

/** Elemental/resistance cap that values are shown and scored against (75%). */
export const CAP = 75;

/** Per-element uncapped starting penalty (fixed per user setting; real endgame value is -60%). */
export const PENALTY = -40;

/** Market Radar snapshot freshness threshold, in hours — older than this counts as Stale. */
export const RADAR_FRESH_HOURS = 2;
