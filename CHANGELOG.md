# CHANGELOG.md — POEassist / Exile Assistant

Dated, session-based record of notable work. Newest first. One entry per session/task, a few lines each. (User-visible app changes additionally need a `PATCH_NOTES` entry in `index.html` — see `PROJECT_INDEX.md` → Patch Notes.)

## 2026-07-12 (7)

- **Shopping List: gear-board coverage states + quick-add + Excel-like table sizing** (`index.html`, patch 0.11):
  - Gear Plan board now shows a per-slot coverage state so it reads as a build checklist: `empty` (grey), `planned` (has item(s), none bought — black left stripe), `partial` (some bought — green stripe), `complete` (all bought — green border + stripe), plus a `cov-warn` marker (orange count badge + existing `●N` dot) when any unbought row in the slot has no price. Logic added to `updateShopGearPanel()` (toggles `cov-empty`/`cov-planned`/`cov-partial`/`cov-complete`/`cov-warn`); the existing count / `x/y✓` / remaining-Div / missing-dot summary is unchanged.
  - Quick-add: each slot button (now a `div[role=button]` so a real `<button>` can nest without button-in-button) carries a `+` control → `quickAddToSlot(id)` creates a row assigned to that slot, switches the view to it, resets search/quick-filter so it shows, and focuses the item-name field (`focusShopRowName`). `+` is on every slot incl. Unassigned, not on All. Main "+ Add Row" also focuses the new row's name. An empty selected slot's table shows a direct "+ เพิ่มไอเทมในช่องนี้" button.
  - Excel-like sizing: table switched to `table-layout: fixed` + a `<colgroup>` with stable `data-col` ids; drag handles (`.col-resize`, pointer events → mouse + touch) on each `<th>` resize columns (clamped min/max), and a toolbar `Row H −/+` stepper sets row height via a `--shop-row-h` CSS var, with a `Reset size` button. Because the Shopping List is one re-rendered table, sizing applies across All/Unassigned/every slot/filtered/sorted views automatically.
  - New additive localStorage key `poe2ShopList.tableSizing.v1` (`{ colWidths:{<colId>:px}, rowHeight:px|null }`, tolerant load with clamping); `poe2ShopList.rows.v1` untouched. Old rows without `slot` still load as Unassigned.
  - Verification: Playwright (headless Chromium) interaction harness over a local HTTP server — 25/25 checks passing (old-data→Unassigned, quick-add slot assignment + view switch + focus, all four coverage states + warn, empty-state add button, numpad open/close, column drag-resize + persist, row-height stepper + persist, reload persistence, reset sizing, buy-next, tab switching, zero console errors) + desktop 1440px & mobile 480px screenshots. Harness deleted after use.

## 2026-07-12 (6)

- **Shopping List: POE2 equipment-slot planner + on-screen numpad** (`index.html`, patch 0.10): left "Gear Plan" board (Weapon/Offhand/Helmet/Body/Gloves/Boots/Belt/Amulet/Ring 1-2/Jewel 1-4/Other + All/Unassigned views) filters the right-side table per slot; per-slot signals (item count, bought x/y, remaining Div using the same min??max rule as "ต้องใช้อีก", orange missing-price dot); new rows inherit the selected slot; rows get a slot dropdown for reassignment.
- Data model: additive `slot` field on shopping rows (storage key unchanged, `poe2ShopList.rows.v1`); old rows without `slot` load as Unassigned via the existing `Object.assign(newShopRow(), r)` tolerant read; export/import round-trips it automatically. Buy-next stays **global** (all slots) by design — it answers "what to buy next overall" and jumping to a row resets the slot view.
- Numpad: all Divine-price inputs (Min/Max/Bought, deal price, THB rate) switched from `type=number` to `type=text inputmode=decimal` + `.num-input` (number inputs reject intermediate values like `3.`); custom RawBlock numpad (0-9 / . / ⌫ / C / Done) opens on focus, positions under/above the field (bottom-pinned on ≤640px), dispatches real `input` events so existing handlers run; keyboard typing unaffected; closes on Done/Esc/outside click.
- Fixed a latent mobile overflow: `.shop-layout` single-column mode needs `minmax(0,1fr)` or the table's 1180px min-width blows the layout past the viewport.
- Verification: temp iframe harness in headless Edge — 46 checks passing (old-data load, per-slot filtering, add-into-slot, reassign, numpad digit/decimal/backspace/clear/done/esc/outside-close, keyboard path, rate entry, quick-filter+sort inside slot view, storage order untouched, chips, tab switching, reload persistence); desktop 1440px + mobile 480px screenshots. Harness deleted after use.

- **Shopping List usability pass** (`index.html`, patch 0.9): added "ซื้อต่อไป" buy-next strip (checked rows first, then cheapest unbought with a price; opens deal/trade link, jumps+highlights the row), optional item-name field (additive — old rows default to `''`, storage key unchanged), quick filters (need/bought/no-price/has-deal), display-only sort (never reorders saved rows), bought-progress bar, and row-state markers (green bought / orange missing-price / green good-deal price).
- Calculation change: "ต้องใช้อีก" now sums min/max of **unbought rows only** (was planned-total − spent, which skewed when buying above/below plan); planned totals coalesce a missing min/max bound from the other side.
- Verification: in-browser interaction suite (temp iframe harness, headless Edge) — 28 checks all passing (totals, THB rate, filters, sort-vs-storage, add/edit/delete, chip rendering, persistence, tab switching) + desktop/mobile screenshots; harness deleted after use.

## 2026-07-12 (4)

- **RawBlock UI redesign shipped** (`index.html`, patch 0.8): full retheme per `design.md.md` — white/black palette, thick square borders, no shadows/gradients/glow, inversion hovers, Archivo Black/Work Sans/Space Mono. CSS var names kept so all inline JS (gauges, chart) works unchanged; feature logic untouched.
- Icons: nav/card emoji replaced with original inline SVGs (currentColor); Exile Hub resource icons via new `RAW_ICONS` JS map; original pixel-art currency SVGs added in `assets/icons/` and wired into `data/icon-map.json` (was pointing at nonexistent PNGs). No official PoE2 assets copied.
- Small JS visual fixes only: Divine chart point stroke/forecast band colors for white bg, phase colors deduped (mid=purple, late=green), patch-notes button keeps its SVG when JS appends the version, mobile nav strip now a single scrollable row.
- Verification: headless-Edge screenshots of all 6 tabs (desktop 1440px + mobile 480px) over a local HTTP server, JS syntax check of the inline script, no console errors. Interactive flows (OCR run, modal open, tooltips) not exercised — logic untouched.

## 2026-07-12 (3)

- Tracked the active root drafts in git: `SKILL.md` (product rules), `AGENTS.md` (agent rules), `design.md.md` (RawBlock design spec — the planned redesign target), `PROJECT_SETUP_SKILL.md` + `PROMPT_COLLABORATION_SKILL.md` (workflow skills). `Index.md` deliberately left untracked (superseded draft).
- Updated `PROJECT_INDEX.md` status notes and `TODO.md` (redesign queued as Next; draft-decision item resolved). Docs only, no runtime changes.

## 2026-07-12 (2)

- Docs reconciliation pass (docs only, no runtime changes).
- `PROJECT_INDEX.md`: added the Divine Market tab to summary/status/file map/feature map (verified against `index.html` `TAB_IDS` — it's a real 6th tab using in-file mock data, no persistence), corrected line count (~5600), added a line-number drift warning; `AGENTS.md` doc-maintenance rule confirmed in sync with `CLAUDE.md`.
- `TODO.md`: closed the PROJECT_INDEX/EDIT_GUIDE mismatch issue; narrowed the remaining known issue to stale line numbers only.
- Verification: `rg` checks against `index.html` (`TAB_IDS`, `pageDivine`, Divine JS anchors), `wc -l`, markdown diff review.

## 2026-07-12

- Docs foundation pass (docs only, no runtime changes).
- Added `ROADMAP.md`, `TODO.md`, `CHANGELOG.md`, `DOC_UPDATE_RULES.md`; added a "Start here" docs map and current-status section to `PROJECT_INDEX.md`; noted doc-maintenance rule in `AGENTS.md`/`CLAUDE.md`.
- Verification: markdown-only diff review + link/filename check; no build or app verification needed.
- Follow-up: reconcile `PROJECT_INDEX.md` vs `EDIT_GUIDE.md` anchor drift (see `TODO.md` → Known Issues).

## Earlier (from git history, pre-changelog)

- 2026-07-05 — `03c5655` ui: add Vercel-inspired sidebar app shell.
- `b4a3424` ui: improve Market Radar recommendation layout.
- Ongoing — automated `Update market radar data` commits from the GitHub Actions workflow.
