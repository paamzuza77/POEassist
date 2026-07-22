// P5 bridge entry (patch 0.64) — built to js/ea.js (classic IIFE that sets window.EA)
// by vite.bridge.config.ts. The legacy index.html monolith loads js/ea.js BEFORE its
// inline script and binds helper names from window.EA at parse time.
//
// Migration pattern: move a pure helper into src/lib/*.ts (typed), re-export it here,
// rebuild the bridge (npm run build:bridge), then in index.html delete the old inline
// definition and bind `const <name> = window.EA.<name>;` near the top of the script.
export { formatDurationParts, fmtDuration, fmtNum, parseIso, kwHelpEsc, notifFmtAgo, acNum, acPct } from './lib/format';
export type { DurationParts } from './lib/format';

// Phase 4 (patch 0.68) — more pure logic: fuzzy matcher + radar display formatters
export { cmdkFuzzyScore } from './lib/fuzzy';
export { radarFmtValue, priceSparkline, radarSignalInfo } from './tabs/radar-format';
export type { PricePoint, RadarSignal } from './tabs/radar-format';

// Phase 4 (patch 0.71) — radarData-dependent radar helpers (radarData passed in as an argument).
export { radarSnapshotAgeHours, radarConfidenceInfo } from './tabs/radar-format';
export type { RadarSnapshot, RadarConfidence } from './tabs/radar-format';

// Phase 4 (patch 0.70) — state-module foundation: shared scoring constants + their pure consumers.
// Lifting CAP/PENALTY/RADAR_FRESH_HOURS to src/ unblocks the constant-dependent scoring migrations.
export { CAP, PENALTY, RADAR_FRESH_HOURS } from './lib/constants';
export { formatResValue } from './tabs/forge-format';

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

// Phase 3 (patch 0.66) — Modern UX Foundation (ex js/ux-foundation.js). Public helpers only;
// internal toast plumbing stays module-private.
export {
  showToast,
  showSuccessToast,
  showWarningToast,
  showErrorToast,
  showInfoToast,
  uxEmptyState,
  uxSkeleton,
  uxFlash,
  uxBusy,
} from './lib/ux-foundation';
export type { ToastOpts, ToastAction, UxAction, UxStateCfg } from './lib/ux-foundation';

// Phase 4 (patch 0.67) — Market Radar scoring brain (pure). DOM rendering stays in the monolith.
export { radarItemScore, buildRadarRecos } from './tabs/radar-scoring';
export type { MarketItem, BucketMeta, RadarReco } from './tabs/radar-scoring';
