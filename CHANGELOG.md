# CHANGELOG.md — POEassist / Exile Assistant

Dated, session-based record of notable work. Newest first. One entry per session/task, a few lines each. (User-visible app changes additionally need a `PATCH_NOTES` entry in `index.html` — see `PROJECT_INDEX.md` → Patch Notes.)

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
