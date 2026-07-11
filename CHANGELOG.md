# CHANGELOG.md — POEassist / Exile Assistant

Dated, session-based record of notable work. Newest first. One entry per session/task, a few lines each. (User-visible app changes additionally need a `PATCH_NOTES` entry in `index.html` — see `PROJECT_INDEX.md` → Patch Notes.)

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
