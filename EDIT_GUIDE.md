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
| Exile Hub (`home`) | `index.html` — markup `#pageHome` (~1794), JS `==== Exile Hub ====` (~4675) | `renderLeagueCard()`, `renderStashCard()`, `startHubTicker()` | `data/home-status.json` ← `scripts/update-home-status.mjs` | Edit inside the Exile Hub JS block only; `renderLeagueCard()` is now shared with Divine Market (see below) | Don't touch OCR/localStorage/tab-switch code while here |
| Market Radar (`radar`) | `index.html` — markup `#pageRadar` (~1837), JS `==== Market Farm Radar ====` (~3980 area) | `radarItemScore()`, `buildRadarRecos()`, `renderRadar()` | `data/market-radar.json` ← `scripts/update-market-radar.mjs` | Recommendations are calculated from `data.marketItems` (all mapped items ≥1 Divine), never from `topRisingItems` (display/fallback only). Content mapping lives in `CONTENT_BUCKETS` in `scripts/update-market-radar.mjs`. All supported content buckets always render — no-evidence ones show muted (`.reco-card.dimmed`) at the bottom. Scoring lives only in `radarItemScore`/`buildRadarRecos` — never rename the score to "drop chance". `renderRadar()` renders "Recommended Farm Now" (primary, with a `.radar-score-info` collapsible explaining the score) first, then "Top Rising Items Used" (secondary, `.radar-item-row` compact rows, not cards) below it | Don't touch Atlas Planner card code |
| Atlas Planner (`farm`) | `index.html` — markup `#pageFarm` (~1877), JS `==== Atlas Farm Planner ====` | `newFarmCard()`, `buildFarmCard()`, `renderFarmGrid()`, `FARM_GOALS`/`FARM_MECHANICS`/`FARM_STATUSES` | `localStorage` only (`poe2FarmPlanner.cards.v1`) | Add dropdown options via the arrays; card layout is in `buildFarmCard()` | Don't touch Market Radar scoring |
| Gear Checker (`forge`) | `index.html` — markup `#pageForge` (~1891, default visible tab) | `recalc()`, `renderResGauges()`, OCR block (`loadTesseract`, `parseItemText`, paste/drop listeners) | `localStorage` (`poe2ResForge.presets.v2`) | Resistance math vs. OCR parsing are separate — don't conflate | Don't touch Tesseract CDN load or paste/drop listeners unless task is OCR-specific |
| Shopping List (`shop`) | `index.html` — markup `#pageShop` (~2170), JS `==== Build Shopping List ====` (~3360) | `newShopRow()`, `updateShopSummary()`, `renderShopBuyNext()`, `sortShopRowsForDisplay()`, `buildLinkCell()`, `renderShopTable()`; gear board: `SHOP_SLOTS`, `buildShopGearPanel()`, `updateShopGearPanel()`, `selectShopSlot()`; numpad: `shopNumpadEl`, `openShopNumpad()`, `shopNumpadPress()` | `localStorage` (`poe2ShopList.rows.v1`) — row shape: `{checked, name, link, type, option, min, max, bought, dealLink, dealPrice, slot}` (`name` + `slot` added 2026-07-12, additive; old rows default `''` → slot `''` = Unassigned) | Keep link fields as chips (`buildLinkCell`), never raw URLs. "ต้องใช้อีก" (remaining) sums prices of **unbought rows only**; per-slot remaining on the left board uses the same min??max rule. Quick filters + sort + slot view (`shopSelectedSlot`: all/unassigned/slot id) are in-memory display-only — never `sort()` `shopRows` itself; row actions resolve the live index via `shopRows.indexOf(row)`. Slot ids in `SHOP_SLOTS` are persisted in `row.slot` — never rename existing ids. Buy-next is **global across all slots** (picks unbought rows with a price: checked first, then cheapest via `rowEstPrice`: deal > min > max); `goToShopRow` resets slot/filters. Numeric fields are `type=text inputmode=decimal` + class `num-input` (numpad target selector — `type=number` would reject `3.`); the numpad dispatches real `input` events. `.shop-layout` mobile breakpoint must stay `minmax(0,1fr)` or the table's 1180px min-width overflows the viewport | Don't touch Atlas Planner/Gear Checker |
| Patch Notes | `index.html` — JS `==== Patch Notes ====` (~3355 area), `PATCH_NOTES` array | button `patchNotesBtn` (~3421) | none (hardcoded array, newest entry first) | Add a new `{ version, date, notes: [...] }` object at the top of `PATCH_NOTES` for every user-visible change | Don't reorder or delete old entries |
| Divine Market (`divine`) | `index.html` — markup `#pageDivine` (~2028–2096), JS `==== Divine Market ====` (~4875) | `computeDivineStats()`, `computeDivineForecast()`, `divineRecommendation()`, `computeDivineHealth()`, `renderDivineChart()`, `renderDivineMarket()` (orchestrator) | `DIVINE_MOCK_DATA` (in-file array) + `divinePoints` (mutable, **session-memory only**, no persistence); league timer reuses `homeStatus.league` from `data/home-status.json` | All analytics/render functions are prefixed `divine`/`Divine` — safe to extend without touching Exile Hub. Chart is hand-rolled inline SVG (no chart lib in this stack) | Don't edit `renderLeagueCard()`'s default ids (used by Exile Hub) — only its optional `(bodyId, badgeId, runningId)` params are for reuse |

## Navigation / Tabs

As of the 2026-07-05 Vercel-inspired app-shell refresh, navigation is a **left sidebar with grouped sections**, not a top pill bar. This was a shell/layout-only change — no feature logic moved.

- App shell markup: `<div class="app-shell">` (search `class="app-shell"`) wraps `<aside class="sidebar">` (brand block + grouped nav + footer) and `<div class="main-col">` (`<header class="topbar">` + `<main class="content">` holding all six `#pageX` panels, unchanged internally).
- Sidebar nav buttons: still one `<button class="nav-item" id="tabBtnX">` per tab (was `class="tab-btn"`), grouped inside `<div class="nav-group">` blocks under a `<div class="nav-group-label">` (search `class="nav-group"` in `index.html`) — currently **Main** (Exile Hub/Market Radar/Divine Market), **Planning** (Atlas Planner/Shopping List), **Tools** (Gear Checker); Patch Notes lives in `.sidebar-footer` as a **System** group of one.
- Tab→panel wiring: `const TAB_IDS = {...}` and `const TAB_BTNS = {...}` (search `TAB_IDS =`) — unchanged, still keyed by `getElementById`, so it doesn't care about the sidebar restructure.
- Switching logic: `function switchTab(tab)` (search `function switchTab`) — generic, do not special-case new tabs here. It now also writes the active tab's label into `#topbarTitle`/`#topbarCrumb` via two added lookup maps, `TAB_TITLES` and `TAB_GROUPS` (declared right above `switchTab`, next to `TAB_IDS`/`TAB_BTNS`).
- Icon fallback (optional): `MENU_ICON_LABELS` (search `MENU_ICON_LABELS =`) — unchanged; still targets the `.tab-ico` span nested in each `tabBtnX` button, which every nav item still has.
- Shell CSS (sidebar/topbar/content/nav-item/responsive collapse) lives in one block near the top of `<style>`, search `/* ---------- App shell (sidebar dashboard) ---------- */`. Old `.tab-nav`/`.tab-btn` pill CSS and the fixed-position `.patch-btn` were removed since nothing references them anymore.

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

**As of 2026-07-12 the whole app uses the RawBlock brutalist design system** (spec: `design.md.md`): white background, black text, thick square borders (2/3/5px by importance), no shadows, no glow, no gradients, no border-radius, hard black↔white inversion on hover/active, uppercase tracked labels/buttons. The old dark-fantasy/gold theme and the Vercel-style dark shell are gone — do not reintroduce dark surfaces, gold accents, glows, or rounded corners.

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

2026-07-12 (RawBlock redesign)
