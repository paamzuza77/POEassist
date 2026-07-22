// P5 bridge entry (patch 0.64) — built to js/ea.js (classic IIFE that sets window.EA)
// by vite.bridge.config.ts. The legacy index.html monolith loads js/ea.js BEFORE its
// inline script and binds helper names from window.EA at parse time.
//
// Migration pattern: move a pure helper into src/lib/*.ts (typed), re-export it here,
// rebuild the bridge (npm run build:bridge), then in index.html delete the old inline
// definition and bind `const <name> = window.EA.<name>;` near the top of the script.
export { formatDurationParts, fmtDuration, fmtNum } from './lib/format';
export type { DurationParts } from './lib/format';

// Phase 3 (patch 0.65) — Game asset registry (ex js/asset-registry.js). Importing it also
// runs its top-level image-error listener (side effect) when ea.js loads, before the monolith.
export {
  GAME_ASSETS,
  ASSET_ALIASES,
  RADAR_ASSET_BY_KEY,
  normalizeAssetKey,
  getLocalAssetForName,
  renderAssetIcon,
} from './lib/asset-registry';
export type { GameAsset, LocalAsset, RenderAssetOpts } from './lib/asset-registry';
