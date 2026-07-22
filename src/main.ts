// P5 bridge entry (patch 0.64) — built to js/ea.js (classic IIFE that sets window.EA)
// by vite.bridge.config.ts. The legacy index.html monolith loads js/ea.js BEFORE its
// inline script and binds helper names from window.EA at parse time.
//
// Migration pattern: move a pure helper into src/lib/*.ts (typed), re-export it here,
// rebuild the bridge (npm run build:bridge), then in index.html delete the old inline
// definition and bind `const <name> = window.EA.<name>;` near the top of the script.
export { formatDurationParts, fmtDuration, fmtNum } from './lib/format';
export type { DurationParts } from './lib/format';
