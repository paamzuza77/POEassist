# EDIT_GUIDE.md — Practical edit workflow for POEassist

## Token-saving workflow

1. Read `CLAUDE.md`.
2. Read `PROJECT_INDEX.md`.
3. Identify which feature the task touches (Exile Hub / Market Radar / Atlas Planner / Gear Checker / Shopping List / Patch Notes / cross-cutting).
4. Use the `rg` anchor terms from `PROJECT_INDEX.md` to confirm current line numbers (they drift as the file grows).
5. Open only the relevant line range with `Read` (`offset`/`limit`), not the whole file.
6. Patch the minimal lines with `Edit`.
7. Verify (see recipes below for what "smallest reasonable verification" means per task type).
8. Commit with a concise message and push.

## Common task recipes

### Change market scoring formula
- Inspect: `scripts/update-market-radar.mjs` (server-side scoring/mapping), and `radarItemScore()` / `buildRadarRecos()` in `index.html` (~3884-3934, frontend recalculation from filters).
- Avoid: renaming the score to "drop chance"/"drop rate" (product rule); changing `data/market-radar.json` shape without updating both the generator script and the frontend reader.
- Verify: `node scripts/update-market-radar.mjs` runs clean and produces sane `marketItems`; spot-check `renderRadar()` output in a browser.

### Change league name/source
- Inspect: `scripts/update-home-status.mjs` (league fetch/parse), `data/home-status.json` shape, `renderLeagueCard()` in `index.html` (~4514).
- Avoid: hardcoding league name in `index.html` — it should come from `data/home-status.json`.
- Verify: `node scripts/update-home-status.mjs`, check `league.name`/`league.displayName` in output JSON.

### Change UI text (labels, copy, tab names)
- Inspect: the specific tab's markup block in `index.html` (line ranges in `PROJECT_INDEX.md`) or `MENU_ICON_LABELS` (line 4358) for nav/menu labels.
- Avoid: touching JS logic in the same block unless the text is generated dynamically (check `renderXxx()` functions first).
- Verify: open `index.html` in a browser, confirm the tab renders and text appears as expected.

### Change Shopping List behavior
- Inspect: `==================== Build Shopping List ====================` block starting line 2829 — `ITEM_TYPES`, `newShopRow()`, `updateShopSummary()`, `buildLinkCell()`, `renderShopTable()`.
- Avoid: breaking the link-chip UI (`buildLinkCell`) by rendering raw URLs; breaking `SHOP_ROWS_KEY` localStorage shape without tolerant fallback for old saved data.
- Verify: open the Shopping List tab, add/edit a row, confirm totals recompute and localStorage persists across reload.

### Change Gear Checker OCR/resistance logic
- Inspect: resistance calc (`STATS`, `PENALTY`, `recalc()` ~2354) vs. OCR parsing (`STAT_PATTERNS` 2469, `guessSlot()` 2491, `parseItemText()` 2508, `handleItemImage()` 2552) — these are separate concerns, don't conflate them.
- Avoid: touching the Tesseract.js CDN load (`loadTesseract()` 2426) or the paste/drop event listeners (2767, 2785) unless the task is specifically about OCR; these are fragile.
- Verify: open Gear Checker tab, manually enter stats and confirm resistance gauges update; if touching OCR, paste a real item screenshot and check parsed stats.

### Add a new static JSON data source
- Inspect: pattern used by `data/market-radar.json` / `data/home-status.json` — a `scripts/update-*.mjs` generator, a `fetch('data/*.json?t=' + Date.now(), { cache: 'no-store' })` reader in `index.html`, and (if scheduled) an entry in `.github/workflows/update-market-radar.yml`.
- Avoid: making the browser fetch third-party APIs directly — always go through a generator script + committed JSON.
- Verify: run the new script locally, confirm valid JSON output, confirm the frontend reader handles missing/stale data gracefully (Fresh/Stale/Missing states).

### Update GitHub Actions schedule
- Inspect: `.github/workflows/update-market-radar.yml` — `schedule.cron` and the `paths-ignore` list (must include every generated JSON file the bot commits, or it will loop-trigger itself).
- Avoid: removing `paths-ignore` entries or the `concurrency` group (prevents overlapping runs).
- Verify: YAML is well-formed (no tab characters, correct indentation); if possible, trigger via `workflow_dispatch` to confirm.

## Files to avoid touching for unrelated tasks

`index.html` sections other than the one you're editing; `data/*.json` (generated, not hand-edited); `README.md` (intentionally a placeholder).

## Future Claude prompt template

```
Read CLAUDE.md and PROJECT_INDEX.md first.

Task: <describe the change>
Feature area: <Exile Hub | Market Radar | Atlas Planner | Gear Checker | Shopping List | Patch Notes | cross-cutting>

Constraints:
- Only touch the minimal relevant section(s) in index.html (use PROJECT_INDEX.md anchors + rg to confirm current line numbers).
- Do not refactor, rewrite index.html wholesale, or add unrelated features.
- Preserve OCR, localStorage, export/import, and tab navigation behavior.
- If this changes user-visible behavior, add a new PATCH_NOTES entry (index.html ~line 3220).
- After editing, verify with the smallest reasonable check (see EDIT_GUIDE.md recipe for this feature), then commit and push with a concise message.
```
