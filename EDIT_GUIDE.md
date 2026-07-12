# EDIT_GUIDE.md

## Purpose

Tells future Claude Code sessions exactly where each POEassist / Exile Assistant feature lives, so they can patch the right lines in `index.html` (or the right data/script file) without reading the whole repo.

## Golden Rules

- Read `PROJECT_INDEX.md` first.
- Use this `EDIT_GUIDE.md` before opening source files.
- Use `rg`/grep before opening files — never scan `index.html` top to bottom.
- Open only the relevant line range (`Read` with `offset`/`limit`).
- Make minimal patches — no drive-by refactors.
- Update `PROJECT_INDEX.md`/`EDIT_GUIDE.md` when a feature is added or its anchors move.
- Verify with the smallest reasonable check (see each recipe below).
- Commit and push only after verification passes.

## Project Structure Map

This is a static, single-page, no-build-step app — there is no `src/`, `components/`, or `pages/` split. Everything UI-related lives inside one file.

- `index.html` — the entire app: all CSS (one `<style>` block), all markup (one `<body>`), all JS (one `<script>` block at the bottom). ~5300 lines.
- `data/` — static JSON "backend": `home-status.json`, `market-radar.json`, `icon-map.json`.
- `scripts/` — Node generators that write the files in `data/`: `update-home-status.mjs`, `update-market-radar.mjs`.
- `.github/workflows/update-market-radar.yml` — runs both scripts hourly + on push, commits `data/*.json` if changed.
- No `package.json` / framework — plain HTML/CSS/JS, no npm install needed to run it (just open/serve `index.html`).
- Root docs: `PROJECT_INDEX.md` (repo map), `CLAUDE.md` (session rules), `EDIT_GUIDE.md` (this file).

## Feature Map

All "components" below are sections inside `index.html`, identified by comment banners like `/* ==================== NAME ==================== */`. Line numbers drift as the file grows — always confirm with `rg` before trusting a number here.

| Feature / Tab | Main file(s) | Related sections | Data / utils | How to edit safely | Files to avoid |
|---|---|---|---|---|---|
| Exile Hub (`home`) | `index.html` — markup `#pageHome` (~1794), JS `==== Exile Hub ====` (~4675) | `renderLeagueCard()`, `renderStashCard()`, `startHubTicker()` | `data/home-status.json` ← `scripts/update-home-status.mjs` | Edit inside the Exile Hub JS block only; `renderLeagueCard()` is now shared with Divine Market (see below). Patch 0.16: it also renders a live "Ends in" countdown when `league.endAt` exists (element id `<runningId>Ends`, ticked in `startHubTicker`, `.divine-warn` under 7 days) | Don't touch OCR/localStorage/tab-switch code while here |
| Market Radar (`radar`) | `index.html` — markup `#pageRadar` (~1837), JS `==== Market Farm Radar ====` (~3980 area) | `radarItemScore()`, `buildRadarRecos()`, `renderRadar()` | `data/market-radar.json` ← `scripts/update-market-radar.mjs` | Recommendations are calculated from `data.marketItems` (all mapped items ≥1 Divine), never from `topRisingItems` (display/fallback only). Content mapping lives in `CONTENT_BUCKETS` in `scripts/update-market-radar.mjs`. All supported content buckets always render — no-evidence ones show muted (`.reco-card.dimmed`) at the bottom. Scoring lives only in `radarItemScore`/`buildRadarRecos` — never rename the score to "drop chance". `renderRadar()` renders "Recommended Farm Now" (primary, with a `.radar-score-info` collapsible explaining the score) first, then "Top Rising Items Used" (secondary, `.radar-item-row` compact rows, not cards) below it. Patch 0.16: the #1 evidence card gets `.reco-card.top-pick` + a `.reco-top-badge` "★ TOP PICK" chip (themed in the Trust pill/accent groups); Enter in `#rfMin`/`#rfRate` clicks Apply | Don't touch Atlas Planner card code |
| Atlas Planner (`farm`) | `index.html` — markup `#pageFarm` (master/detail since 0.18: `.farm-project-bar` + `.farm-layout` → `#farmList`/`#farmDetail`), JS `==== Atlas Farm Planner ====`, CSS `==== Atlas Planner master/detail (patch 0.18) ====` (end of `<style>`) | `newFarmCard()` (+ 0.18 additive fields `durationPerRunMinutes`/`costPerRun`/`costCurrency`/`runTrackerRows`), `newFarmRunRow()`, `normalizeFarmCard()` (tolerant load/import), `buildFarmCard()` (original card editor — rendered inside detail, don't remove fields), `renderFarmGrid()` (orchestrator = auto-select + `renderFarmList()` + `renderFarmDetail()`), `buildFarmListItem()`, `updateFarmRunSummary()`, `buildFarmEconPanel()`, `buildFarmRunTracker()`, `farmParseDuration`/`farmFmtDuration`/`farmTrackerGross`/`farmFmtGross`, `FARM_GOALS`/`FARM_MECHANICS`/`FARM_STATUSES`/`FARM_CURRENCIES` | `localStorage` only (`poe2FarmPlanner.cards.v1` — **key + old fields unchanged**; new fields additive, old cards load via `normalizeFarmCard`) | Add dropdown options via the arrays; old card layout is in `buildFarmCard()`. `farmSelectedId`/`farmProjectRuns` are in-memory only. **Project runs = left-list projection only** (never mutates cards, never feeds the Run Tracker summary); Run Tracker summary = that card's actual runs only. **No hidden currency conversion** — per-unit totals (`farmFmtGross`, e.g. `3 Dv + 120 C`); Net only when all result units == `costCurrency`, else "หน่วยผสม" note. Duration input accepts `H:MM` or plain minutes (`farmParseDuration`). Numpad shared with Shopping List via `NUMPAD_INPUT_SELECTOR` (`#pageShop` + `#pageFarm` `input.num-input`) — extend that constant, not the shop functions. New surfaces are registered in the Trust Blue Pay rounded/shadow/accent groups (`.farm-project-bar`/`.farm-list-item`/`.farm-run-summary`/`.farm-econ`/`.farm-tracker`/`.frs-cell`). Patch 0.16: filter chips show live counts (`updateFarmFilterCounts()`); card foot has a `.farm-checked-age` age label. **Patch 0.19:** Run Tracker analytics live in `computeFarmRunAnalytics(card)` (single source) rendered by `updateFarmRunSummary` — to add a metric, add a field there then a `cell(...)` call. **Only compute per-hour/net when `netCompatible`/`singleUnit`** (priority Dv); mixed units must stay grouped + show the "Mixed units: per-hour conversion unavailable" note — never convert C/Ex→Dv. View state (`farmSelectedId`/`farmProjectRuns`) persists via `persistFarmView()` → `poe2FarmPlanner.view.v1` (registered in `APP_DATA_KEYS` + `UI_PREF_KEYS`); a stale selected id falls back safely in `renderFarmGrid()`. Run rows have an additive `date` (default `farmTodayISO()`, tolerant for old rows). `poe2FarmPlanner.cards.v1` shape unchanged | Don't touch Market Radar scoring |
| Atlas Farm V.2 (`farmv2`, in development) | `index.html` — markup `#pageFarmV2` (after `/pageFarm`), JS `==== Atlas Farm V.2 — Run Economics Lab ====` (between Atlas Planner and Market Radar JS sections), CSS `==== Atlas Farm V.2 (Run Economics) ====` (end of `<style>`) | `newFv2Run()`, `computeFv2Econ()` (entry cost / Guaranteed Return after haircut / Net / ROI / break-even), `computeFv2Score()` (Farm V.2 Score 0–100, 7 dimensions incl. Risk Penalty 0..−20), `fv2LoadMarket()`/`findMarketItemByName()`/`marketPriceFor()`/`fv2ItemPrice()` (Market/Manual/Missing price badges), `FV2_TEMPLATES`, `renderFv2()` (+ `renderFv2ResultOnly()` for live recalc while typing) | `localStorage` (`poe2FarmLabV2.runs.v1`, new additive key); market prefill from `data/market-radar.json` fetched independently — page works fully manual without it | All identifiers prefixed `fv2`/`FV2_` — fully independent of the old Atlas Planner (`poe2FarmPlanner.*` never touched). Wording rules: "Farm V.2 Score", "Guaranteed Floor/ROI", "Expected ROI (manual)", "Upside/Bigdrop Notes" — never "drop chance"/"drop rate"; Bigdrop values stay out of ROI unless the user types a manual Common-return estimate. Market match is exact-name (case-insensitive), Divine-priced only — don't add fuzzy matching without discussion. User text rendered via `textContent` only. Reuses `.divine-metric-card` tiles, `.divine-table` score breakdown, `.ocr-btn`, `.divine-up/down/warn`; fv2-specific classes are registered in the Trust Blue Pay rounded/pill/shadow/accent groups | Don't touch old Atlas Planner card code or Market Radar scoring |
| Gear Checker (`forge`) | `index.html` — markup `#pageForge` (~1891, default visible tab) | `recalc()`, `renderResGauges()`, OCR block (`loadTesseract`, `parseItemText`, paste/drop listeners) | `localStorage` (`poe2ResForge.presets.v2`) | Resistance math vs. OCR parsing are separate — don't conflate. Patch 0.16: preset tabs get a green `.preset-dot` for presets with data (`updatePresetDots()`, called from `recalc()`); `#resCapCount` next to the Total Resistance title shows "x/4 ถึง cap" (filled in `recalc()`) | Don't touch Tesseract CDN load or paste/drop listeners unless task is OCR-specific |
| Shopping List (`shop`) | `index.html` — markup `#pageShop` (~2170), JS `==== Build Shopping List ====` (~3360) | `newShopRow()`, `updateShopSummary()`, `renderShopBuyNext()`, `sortShopRowsForDisplay()`, `buildLinkCell()`, `renderShopTable()`; gear board: `SHOP_SLOTS`, `buildShopGearPanel()`, `updateShopGearPanel()`, `selectShopSlot()`, `makeShopSlotBtn()`, `quickAddToSlot()`/`focusShopRowName()`; sizing: `SHOP_COLS`/`SHOP_ROW_H`, `applyShopSizing()`, `initShopColResize()`, `stepShopRowHeight()`, `resetShopSizing()`; numpad: `shopNumpadEl`, `openShopNumpad()`, `shopNumpadPress()` (since 0.18 the open triggers use `NUMPAD_INPUT_SELECTOR` = `#pageShop` + `#pageFarm` `input.num-input` — shared with Atlas Planner) | `localStorage` (`poe2ShopList.rows.v1`) — row shape: `{checked, name, link, type, option, min, max, bought, dealLink, dealPrice, slot}` (`name` + `slot` added 2026-07-12, additive; old rows default `''` → slot `''` = Unassigned). **`type` is still in the data model (export/import round-trips it) but its standalone Type table column was removed in patch 0.13** — item slot/context is set via the slot-select inside the Item/Link cell; the table is now 9 columns (`SHOP_COLS` has no `type`, `min-width` 1010); table sizing in a **separate additive key `poe2ShopList.tableSizing.v1`** (`{colWidths:{colId:px}, rowHeight:px|null}`, never inside row data) | Keep link fields as chips (`buildLinkCell`), never raw URLs. "ต้องใช้อีก" (remaining) sums prices of **unbought rows only**; per-slot remaining on the left board uses the same min??max rule. Gear board shows per-slot coverage state (`cov-empty`/`cov-planned`/`cov-partial`/`cov-complete`/`cov-warn`) — set in `updateShopGearPanel()` (count/bought/remain/missing live in the `.shop-slot-sub` line). Slots use **readable full labels** (add a `board` label field for long slot names — never rename ids) + original inline icons from `SHOP_SLOT_ICONS`; the jewel row is a 2×2 grid. Slot buttons are `div[role=button]` with a bottom-right corner `+` quick-add `<button>` (its click `stopPropagation`s so it doesn't select the slot). Quick filters + sort + slot view (`shopSelectedSlot`: all/unassigned/slot id) are in-memory display-only — never `sort()` `shopRows` itself; row actions resolve the live index via `shopRows.indexOf(row)`. Slot ids in `SHOP_SLOTS` are persisted in `row.slot` — never rename existing ids. Buy-next is **global across all slots** (picks unbought rows with a price: checked first, then cheapest via `rowEstPrice`: deal > min > max); `goToShopRow` resets slot/filters. Numeric fields are `type=text inputmode=decimal` + class `num-input` (numpad target selector — `type=number` would reject `3.`); the numpad dispatches real `input` events. Patch 0.16: quick-filter chip text is rewritten with live counts by `updateShopQuickFilterCounts()` (base labels in `SHOP_QUICK_LABELS`, not the markup — edit labels there); `#shopFilterCount` prefixes the active slot view name. Table is `table-layout:fixed` + a `<colgroup>` (`data-col` ids in `SHOP_COLS`) — column widths come from the `<col>` elements via `applyShopSizing()`; row height via `--shop-row-h` on the table. One table is re-rendered per view, so sizing is inherently consistent across All/Unassigned/every slot/filtered/sorted. `.shop-layout` mobile breakpoint must stay `minmax(0,1fr)` or the table's 1180px min-width overflows the viewport | Don't touch Atlas Planner/Gear Checker |
| Patch Notes | `index.html` — JS `==== Patch Notes ====` (~3355 area), `PATCH_NOTES` array | button `patchNotesBtn` (~3421) | none (hardcoded array, newest entry first) | Add a new `{ version, date, notes: [...] }` object at the top of `PATCH_NOTES` for every user-visible change | Don't reorder or delete old entries |
| Divine Market (`divine`) | `index.html` — markup `#pageDivine` (~2028–2096), JS `==== Divine Market ====` (~4875) | `computeDivineStats()`, `computeDivineForecast()`, `divineRecommendation()`, `computeDivineHealth()`, `renderDivineChart()`, `renderDivineMarket()` (orchestrator) | `DIVINE_MOCK_DATA` (in-file array) + `divinePoints` (mutable, **session-memory only**, no persistence); league timer reuses `homeStatus.league` from `data/home-status.json` | All analytics/render functions are prefixed `divine`/`Divine` — safe to extend without touching Exile Hub. Chart is hand-rolled inline SVG (no chart lib in this stack). Patch 0.16: section order = Summary → Chart → Recommendation → What Changed → **Add/Update form** → Phase → Forecast; the form prefills today + suggested League Day (`suggestDivineDay` in `initDivineForm`) | Don't edit `renderLeagueCard()`'s default ids (used by Exile Hub) — only its optional `(bodyId, badgeId, runningId)` params are for reuse |

## Navigation / Tabs

As of the 2026-07-05 Vercel-inspired app-shell refresh, navigation is a **left sidebar with grouped sections**, not a top pill bar. This was a shell/layout-only change — no feature logic moved.

- App shell markup: `<div class="app-shell">` (search `class="app-shell"`) wraps `<aside class="sidebar">` (brand block + grouped nav + footer) and `<div class="main-col">` (`<header class="topbar">` + `<main class="content">` holding all six `#pageX` panels, unchanged internally).
- Sidebar nav buttons: still one `<button class="nav-item" id="tabBtnX">` per tab (was `class="tab-btn"`), grouped inside `<div class="nav-group">` blocks under a `<div class="nav-group-label">` (search `class="nav-group"` in `index.html`) — currently **Main** (Exile Hub/Market Radar/Divine Market), **Planning** (Atlas Planner/Shopping List/Atlas V.2), **Tools** (Gear Checker); Patch Notes lives in `.sidebar-footer` as a **System** group of one.
- Tab→panel wiring: `const TAB_IDS = {...}` and `const TAB_BTNS = {...}` (search `TAB_IDS =`) — unchanged, still keyed by `getElementById`, so it doesn't care about the sidebar restructure.
- Switching logic: `function switchTab(tab)` (search `function switchTab`) — generic, do not special-case new tabs here. It now also writes the active tab's label into `#topbarTitle`/`#topbarCrumb` via two added lookup maps, `TAB_TITLES` and `TAB_GROUPS` (declared right above `switchTab`, next to `TAB_IDS`/`TAB_BTNS`).
- Icon fallback (optional): `MENU_ICON_LABELS` (search `MENU_ICON_LABELS =`) — unchanged; still targets the `.tab-ico` span nested in each `tabBtnX` button, which every nav item still has.
- Shell CSS (sidebar/topbar/content/nav-item/responsive collapse) lives in one block near the top of `<style>`, search `/* ---------- App shell (sidebar dashboard) ---------- */`. Old `.tab-nav`/`.tab-btn` pill CSS and the fixed-position `.patch-btn` were removed since nothing references them anymore. `.content` is capped at 1760px (was 1400) so wide desktops use more width.
- **Sidebar collapse (2026-07-12):** `#sidebarToggle` (top of `.sidebar`) toggles `.app-shell.collapsed`; JS is `initSidebarCollapse` (search it), persisted in `poeAssist.sidebarCollapsed.v1`. Collapse CSS is under `@media (min-width: 861px)` only (search `.app-shell.collapsed`) — never affects the ≤860px horizontal nav row (the toggle is `display:none` there; **that hide rule must stay *after* the base `.sidebar-toggle` rule** or source order overrides it). Nav-button `title` tooltips are set in the `TAB_BTNS` wiring loop. Collapsed nav hides label text via `font-size:0` (icons keep explicit 16px size).
- **Settings (2026-07-12; functional since patch 0.13, expanded in 0.15):** `#settingsBtn` in the `.sidebar-footer` System group, **above** `#patchNotesBtn`; `initSettings` (search it) builds a modal reusing `.patch-overlay`/`.patch-panel` (+ `.settings-panel`), scrollable via the panel's `max-height`/`overflow`. Sections: **Appearance** — Theme + Mode segmented buttons (`#appearanceThemeSeg`/`#appearanceModeSeg`, `.appearance-seg`) → `setAppTheme()`/`setAppColorMode()` (shared appearance module, search `THEME_KEY`), persist + `syncAppearanceControls()`; **Startup** — `#settingsStartTab` select writing `poeAssist.startTab.v1` (applied at load in the Tabs section via `loadStartTabPreference()`); **Local data** — read-only counts (`countLocalArray()`/`countGearPresetsWithData()`, tolerant, refreshed on open); **Data backup** — Export/Import all local data (`exportAppData()`/`parseBackup()`, keys = module-level `APP_DATA_KEYS`, raw-string values, import confirms then reloads, writes only known keys); **Danger zone** — `.settings-danger` buttons (`.ocr-btn.danger`), each `confirm()`-gated then `location.reload()`, reset UI-only (`UI_PREF_KEYS`) / clear Shopping rows / clear Atlas cards / clear Gear presets. To add a preference: extend the modal body (a new section via `sectionTitle()`), add its key to `APP_DATA_KEYS` (backup) and, if it's a UI pref, `UI_PREF_KEYS` (reset). Keep it above Patch Notes.
- **Topbar mode toggle (patch 0.13):** `#modeToggle` (sun/moon) in `.topbar-actions` on the right of `<header class="topbar">`; wired in `initModeToggle`, shares state with the Settings Mode control via `syncAppearanceControls()`.

**To add a new tab safely:** add one `<button class="nav-item" id="tabBtnX">` (with a nested `<span class="tab-ico">`) inside the right `.nav-group` (or a new one, with its own `.nav-group-label`), one `<div id="pageX" hidden>` block inside `<main class="content">`, one key each in `TAB_IDS`, `TAB_BTNS`, `TAB_TITLES`, `TAB_GROUPS`. Don't touch `switchTab()` itself — it stays generic.

**To add a new sidebar item later:** same as above — a nav-group only needs a label + one or more `.nav-item` buttons; no JS beyond the four map entries.

## Shared UI Components

All are CSS classes reused via `class="..."` in template strings or markup — there are no separate component files.

| Class | Purpose | When to reuse | Caution |
|---|---|---|---|
| `.hub-card`, `.hub-grid`, `.hub-line`, `.hub-big`, `.hub-missing` | Card layout used by Exile Hub and Divine Market status tiles | Any small "status card" with label/value rows | `.hub-big` implies the JetBrains Mono live-counter look |
| `.radar-badge` (`fresh`/`stale`/`missing`/`error`) | Freshness/status pill | Any data-sourced card needing a Fresh/Stale/Missing badge | Keep the 4 status kinds consistent |
| `.reco-card`, `.reco-grid`, `.reco-head`, `.reason-list`, `.reco-risk` | Recommendation card (Market Radar + Divine Market) | Any "here's what to do" card with bullet reasons | `.divine-reco-badge` is a Divine-specific badge variant, don't reuse elsewhere without checking colors |
| `.radar-filter` | Labeled input row (used for Market Radar filters and the Divine Market add-price form) | Any small inline form with 2–4 labeled inputs + a button | Inputs inside must be `<label>` wrapping `<input>`/`<select>` |
| `.farm-grid`, `.farm-card` | Card grid (Atlas Planner) | Card-per-record layouts | Has `.favorite`/`.is-active`/`.muted` modifiers tied to Atlas Planner logic |
| `.divine-metrics-grid`, `.divine-metric-card` | Small stat-tile grid (Divine Market summary) | Any dense grid of label+value tiles | Use `.divine-up`/`.divine-down`/`.divine-warn` utility classes for color, not new one-off colors |
| `.divine-table`, `.divine-table-wrap` | Simple scrollable data table (Divine Market phase/forecast tables) | Any small reference table | Wrap in `.divine-table-wrap` for `overflow-x: auto` on mobile |
| `.divine-chart-wrap`, `.divine-chart-svg`, `.divine-tooltip`, `.divine-legend` | Hand-rolled inline SVG chart + hover tooltip | Only for Divine Market's chart currently | No chart library exists in this stack — don't introduce Recharts/Chart.js without discussion |
| `.ocr-btn` (`.primary` modifier) | Standard button | Any button | — |

## Data and Mock Sources

| File | Stores | Used by | Notes |
|---|---|---|---|
| `data/home-status.json` | League name/patch/start/end, stash sale window | Exile Hub, Divine Market (league timer) | Generated by `scripts/update-home-status.mjs`; frontend never scrapes poe2db.tw directly |
| `data/market-radar.json` | poe.ninja snapshot, `marketItems`, `topRisingItems`, `contentRecommendations` | Market Radar | Generated by `scripts/update-market-radar.mjs`; don't hand-edit, it's overwritten hourly by Actions |
| `data/icon-map.json` | Currency/menu icon lookup with emoji fallback | Nav icons, Market Radar item icons | Safe to hand-edit; missing entries just fall back to emoji |
| `DIVINE_MOCK_DATA` (in `index.html`, inside the Divine Market JS section) | Seed price-history array (`date`, `leagueDay`, `priceTHB`) | Divine Market | Frontend-only mock data. User edits via the on-page form go into `divinePoints` (a copy), **in-memory for the session only** — not localStorage, not a file. To change the seed data, edit this array directly. |

To add a brand-new static JSON data source: follow the `market-radar.json`/`home-status.json` pattern (a `scripts/update-*.mjs` generator + a `fetch('data/*.json?t='+Date.now(), {cache:'no-store'})` reader + optional workflow entry) — don't make the browser call third-party APIs directly.

## Analytics / Calculation Logic

| File / function | Feature | What it computes | How to extend safely |
|---|---|---|---|
| `index.html` — `radarItemScore()`, `buildRadarRecos()` (search `function radarItemScore`) | Market Radar | Item score → content-bucket Farm Score/Recommendation Score | Keep wording "Farm Score"/"Recommendation Score", never "drop chance" |
| `index.html` — `recalc()`, `STATS`, `PENALTY` (search `function recalc`) | Gear Checker | Resistance totals, cap/penalty math, rarity | `PENALTY` is a single constant (~line with `const PENALTY`) — change there only |
| `index.html` — `computeDivineStats()`, `computeDivineForecast()`, `divineRecommendation()`, `computeDivineHealth()` (search `function computeDivine`) | Divine Market | Daily/3d/7d change %, drawdown, min/max/avg/median, 7-day volatility (stddev), phase+momentum, forecast range (7/45/60 day), rule-based buy/sell/craft recommendation, health score | All pure functions taking a sorted points array/stats object — extend by adding a new computed field to `computeDivineStats()`'s return object, then read it in the relevant `renderDivine*()` function |

## Styling / Theme Notes

**As of 2026-07-12 the default look is the RawBlock brutalist design system** (spec: `design.md.md`): white background, black text, thick square borders (2/3/5px by importance), no shadows, no glow, no gradients, no border-radius, hard black↔white inversion on hover/active, uppercase tracked labels/buttons.

**Theme switcher + dark/light mode (patch 0.13):** appearance is controlled by two attributes on `<html>` — `data-theme` (`rawblock` | `trust-blue-pay`) and `data-mode` (`light` | `dark`) — set pre-paint by a small `<head>` script and managed by the appearance module in the main script (search `THEME_KEY`, `MODE_KEY`, `loadThemePreference`, `applyThemePreference`, `setAppTheme`, `setAppColorMode`, `syncAppearanceControls`). Persisted in `poeAssist.theme.v1` / `poeAssist.colorMode.v1` (additive, tolerant). Defaults: RawBlock + light.
  - **Token-first, no per-tab code:** all colors/fonts are CSS custom properties. Base `:root` = RawBlock light. Overrides live in one CSS block (search `==================== Themes & color modes ====================`): `:root[data-theme="rawblock"][data-mode="dark"]`, `:root[data-theme="trust-blue-pay"]` (light), `:root[data-theme="trust-blue-pay"][data-mode="dark"]`. Because everything reads `var(--…)`, changing the attribute re-themes every tab (and the JS gauges/chart, which read computed vars) with no extra JS.
  - **Trust Blue Pay** (navy/clean-white "financial dashboard" per `trust-blue-pay-DESIGN.md`) also swaps fonts to Inter / JetBrains Mono and **softens structure** via selectors scoped as `html[data-theme="trust-blue-pay"] .<class>` (+ `[data-mode="dark"]` where needed). As of patch 0.14 this is a **comprehensive** block (numbered 1–5 in a comment): (1) thin 1px + ~10px-rounded borders on all panels/cards/controls/inputs, (2) pill radius on short status chips/badges, (3) navy-tinted card shadows (light) / soft black (dark) + a level-3 modal shadow, (4) navy brand accents (score-bar fill; 2px navy borders replacing the old 5px black hierarchy on `remain-group`/`bought-group`/`.farm-card.favorite`; recolored `is-active` left border; dark `.divine-table th`), (5) **dark-mode repairs** for hardcoded light greys (`.farm-card.muted`/`.reco-card.dimmed`/`.shop-slot.empty`/`#e8e8e8` hovers). These rules set border/radius/shadow/tint only; base colors still come from the tokens. **When you add a new prominent surface/card/chip, add its class to the matching group** (rounded list, pill list, or shadow list) so it stays on-theme — otherwise it'll keep RawBlock's square thick border under Trust Blue Pay.
  - **To adjust a theme:** edit its token block. **To add a theme:** add an `{id,label}` to `APP_THEMES`, a `:root[data-theme="<id>"]` (+ dark) token block, and (if it needs structural changes) a scoped `html[data-theme="<id>"]` block. RawBlock stays the default.

Within RawBlock, hierarchy still comes from border weight, not shadows (see below). Do not reintroduce the old dark-fantasy/gold theme or the Vercel-style shell.

- All design tokens are CSS custom properties at the top of the single `<style>` block (search `RawBlock design tokens`). **Var names were kept from the old theme so inline JS keeps working**: `--void`/`--panel*` are white/near-white surfaces, `--border` is black (`--border-soft` = light grey for subtle dividers/chart grid), `--gold`/`--gold-glow`/`--gold-dim` all = black (accent), element hues are pure web colors (`--fire` red, `--cold` blue, `--lightning` orange, `--chaos` purple), plus new `--ok` (green) and `--link` (hyperlink blue).
- Fonts: `var(--font-head)` = 'Archivo Black' (headings, uppercase), `var(--font-body)` = 'Work Sans', `var(--font-mono)` = 'Space Mono' (numbers/labels/badges/buttons).
- Status color rules: green = fresh/up/capped, orange = stale/warning, red = error/down/destructive, blue = links/info only. `.divine-up`/`.divine-down`/`.divine-warn` utility classes still work — prefer them over new inline colors.
- Hierarchy comes from border weight, not shadows: 5px = hero/emphasized panel, 3px = standard panel/card, 2px = sub-card/chip/input. Focus rings use inset `box-shadow: inset 0 0 0 2px var(--border)` (border simulation, the only allowed box-shadow use besides the checked-row marker).
- Disabled/muted states use grey borders (`#ccc`) + grey fills (`#f5f5f5`), not opacity.
- No Tailwind/CSS framework, no theme config file — all hand-written CSS in `index.html`.

## Icons

- Nav/tab icons and hub/divine card icons are **original inline SVGs in the markup** (16×16 viewBox, `fill="currentColor"` so they invert with hover/active). Edit them directly in the nav buttons / `.hub-card-ico` spans.
- Exile Hub resource-card icons come from the `RAW_ICONS` map in JS (search `const RAW_ICONS`) — keys referenced by `HUB_RESOURCES[].icon`; unknown keys fall back to rendering the icon string as text. **Add future icons here.**
- `data/icon-map.json` + `iconEl()` remain the lookup for currency/menu image icons; currency entries now point to original pixel-art SVGs in `assets/icons/` (`divine-orb.svg`, `exalted-orb.svg`, `chaos-orb.svg`). Missing entries still fall back to emoji.
- **Favicon (patch 0.14):** an original inline-SVG "E" monogram embedded as a `data:` URI in `<link rel="icon">` in `<head>` (search `rel="icon"`). Self-contained (no asset file), so `/favicon.ico` is never requested. To change it, edit the data-URI SVG in place (`#` must stay `%23`-encoded); keep it original (not PoE2 artwork).
- Never copy official PoE2 artwork/icons into the repo — icons must be original interpretations.

## Documentation Update Rules

Whenever a feature/tab/section is added or changed:

- Update `PROJECT_INDEX.md` **only** in the relevant feature's subsection (use `rg` to find it, e.g. `rg "^### " PROJECT_INDEX.md`).
- Update `EDIT_GUIDE.md` **only** the row/section for the changed feature (Feature Map table, and any new shared component/data/util entries).
- Never rewrite either doc wholesale — targeted edits only.
- If line-number anchors drift, it's fine to leave a fuzzy anchor ("~line") rather than re-verifying every number every time.

## Safe Edit Workflow

1. Read `PROJECT_INDEX.md`.
2. Read `CLAUDE.md` if the task needs project-wide rules.
3. Read this `EDIT_GUIDE.md`.
4. Use `rg`/grep to locate the exact current line numbers for your target.
5. State the target file(s) and why, before editing.
6. Edit the minimal lines needed.
7. Run the smallest reasonable verification (see recipes below).
8. Show a `git diff` summary.
9. Commit and push.

## Common Tasks Cheat Sheet

- **Add a new tab/page** — search: `TAB_IDS =`. Files: `index.html` only (nav button + `TAB_IDS`/`TAB_BTNS` + new `#pageX` div). Avoid: `switchTab()` internals. Verify: open in a browser, click the new tab, confirm other tabs still switch.
- **Edit Market Radar scoring** — search: `function radarItemScore`. Files: `index.html` (frontend recompute) and/or `scripts/update-market-radar.mjs` (source data). Recommendations always derive from `marketItems`/`data.marketItems` (never `topRisingItems`), and every bucket in `CONTENT_BUCKETS` must keep rendering even with zero evidence (muted). Avoid: Atlas Planner card code. Verify: `node scripts/update-market-radar.mjs` runs clean; reload radar tab.
- **Edit Exile Hub league status** — search: `function renderLeagueCard`. Files: `index.html` only; also affects Divine Market's league card (shared function). Avoid: changing the default parameter ids. Verify: both Exile Hub and Divine Market league cards still show correct data.
- **Add mock data (Divine Market)** — search: `DIVINE_MOCK_DATA`. Files: `index.html` only. Avoid: turning it into a fetch/localStorage source unless asked — it's intentionally in-memory/session-only. Verify: reload, confirm chart/metrics reflect the new seed rows.
- **Add a chart** — there's no chart library; follow the pattern in `function renderDivineChart` (hand-rolled inline SVG, `xScale`/`yScale` closures, template-string `<svg>` build). Avoid: adding Recharts/Chart.js/D3 without discussion — no build step exists to bundle them. Verify: open the tab, hover a data point, confirm the tooltip shows.
- **Add/update a feature card** — reuse `.hub-card`/`.reco-card`/`.divine-metric-card` classes (see Shared UI Components). Avoid: inventing new card CSS when an existing class fits. Verify: check both desktop width and a narrow viewport.
- **Update docs after a feature change** — search the exact section first (`rg "^### FeatureName" PROJECT_INDEX.md`, `rg "FeatureName" EDIT_GUIDE.md`), then edit only that section.

## Known Risk Areas

- `index.html` top-level tab wiring (`TAB_IDS`, `TAB_BTNS`, `switchTab()`) — breaking this breaks every tab.
- OCR paste/drop listeners and `loadTesseract()` — fragile, CDN-dependent, easy to silently break.
- `localStorage` key constants (`*_KEY` names) — changing a key's shape without a tolerant read breaks existing users' saved data.
- `data/market-radar.json`, `data/home-status.json` — generated files, overwritten hourly by GitHub Actions; don't hand-edit expecting it to stick.
- `.github/workflows/update-market-radar.yml` — `paths-ignore` and `concurrency` block prevent infinite bot-commit loops; don't remove.
- Root docs (`PROJECT_INDEX.md`, `CLAUDE.md`, this file) — keep edits targeted; do not regenerate from scratch.

## Last Updated

2026-07-12 (patch 0.19 — Atlas Planner Run Tracker analytics [`computeFarmRunAnalytics`: Net avg/run, Net/gross per-hour on compatible units, best/worst, win rate, cost-recovered, trend insight], additive per-run `date` column, and view-state persistence in new additive key `poe2FarmPlanner.view.v1`; `poe2FarmPlanner.cards.v1` unchanged)
