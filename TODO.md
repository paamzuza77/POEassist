# TODO.md — POEassist / Exile Assistant

Short, actionable list. Phases live in `ROADMAP.md`; history in `CHANGELOG.md`.

## Next

- (empty — nothing queued)

## Deferred
- [ ] Replace placeholder `README.md` (currently just a title) with a short public-facing description + live-site link.

## Known Issues

- [ ] Pre-Divine-Market line numbers in `PROJECT_INDEX.md`'s feature map (Exile Hub, Market Radar, Farm Planner, Gear Checker, Shopping List, Patch Notes, Cross-cutting sections) have drifted (`index.html` is now ~5600 lines). A drift warning is in place — always `rg` the anchor term first. Refresh the numbers opportunistically on the next `index.html` task.

## Done

- [x] Shopping List equipment-slot planner — left POE2 gear board filters the table per slot, additive `slot` field (old rows → Unassigned), on-screen numpad for all Divine-price inputs; patch 0.10 (2026-07-12).
- [x] Shopping List usability pass — buy-next strip, name field (additive), quick filters, display-only sort, progress bar, clearer remaining-cost calc; patch 0.9 (2026-07-12).
- [x] Full RawBlock UI redesign of `index.html` per `design.md.md` — shipped as patch 0.8; all 6 tabs verified via headless-browser screenshots; original SVG icon set added (2026-07-12).
- [x] Committed active draft docs (`SKILL.md`, `AGENTS.md`, `design.md.md`, both workflow-skill docs); `Index.md` deliberately left untracked as a superseded draft (2026-07-12).
- [x] Reconciled `PROJECT_INDEX.md` with `EDIT_GUIDE.md`/code: added the Divine Market tab (6th tab, verified in `index.html` `TAB_IDS`), corrected line count, added line-number drift warning (2026-07-12).
- [x] Docs foundation pass: added `ROADMAP.md`, `TODO.md`, `CHANGELOG.md`, `DOC_UPDATE_RULES.md`; linked from `PROJECT_INDEX.md` (2026-07-12).
