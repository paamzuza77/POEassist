# TODO.md — POEassist / Exile Assistant

Short, actionable list. Phases live in `ROADMAP.md`; history in `CHANGELOG.md`.

## Next

- (empty — nothing queued)

## Deferred
- [ ] Replace placeholder `README.md` (currently just a title) with a short public-facing description + live-site link.
- [ ] Extend Settings further (theme/mode 0.13; startup tab + data overview + export/import + scoped resets 0.15) — remaining candidates: Divine-rate default, sidebar default state, and moving the in-Shop rate/table-sizing controls into Settings for one control center.
- [ ] Divine Market: optional opt-in persistence for user-added price points (currently session-only by design — needs a product decision + additive key before building).
- [ ] Market Radar: sortable/limited "Top Rising Items Used" list (sort by value/trend/score, show top-20 + expand) — the list gets long on big snapshots.
- [ ] Atlas Planner: compact/collapsed card mode (title + status + age only) for faster scanning once card count grows; full editors expand on click.
- [ ] Gear Checker: preset naming (rename "ชุดที่ 1/2/3" to user labels) — needs a small additive storage field.

## Known Issues

- [ ] Pre-Divine-Market line numbers in `PROJECT_INDEX.md`'s feature map (Exile Hub, Market Radar, Farm Planner, Gear Checker, Shopping List, Patch Notes, Cross-cutting sections) have drifted (`index.html` is now ~5600 lines). A drift warning is in place — always `rg` the anchor term first. Refresh the numbers opportunistically on the next `index.html` task.

## Done

- [x] App-wide QoL/UX pass — league "Ends in" countdown (Hub + Divine), Market Radar TOP PICK badge + Enter-to-apply, Divine section reorder + form prefill, Atlas filter counts + last-checked age warnings, Gear preset data dots + res-cap counter, Shopping quick-filter counts + slot-view label; all additive, no storage keys changed; patch 0.16 (2026-07-12).
- [x] Settings app control center — startup-tab preference (new additive key `poeAssist.startTab.v1`), read-only local-data overview, Export/Import all local data (backup file), and `confirm()`-gated scoped resets (UI-only / Shopping / Atlas / Gear); patch 0.15 (2026-07-12).
- [x] Trust Blue Pay coverage polish (comprehensive rounded/soft/navy-accent overrides across all major surfaces, dark-mode grey repairs, RawBlock untouched) + original inline-SVG favicon (resolves the `/favicon.ico` 404); patch 0.14 (2026-07-12).
- [x] Theme switcher (RawBlock + Trust Blue Pay) + dark/light mode (topbar toggle + Settings, synced) via `data-theme`/`data-mode` token overrides; functional Settings; removed the redundant Shopping List standalone Type column (data model/export unchanged). New additive keys `poeAssist.theme.v1` / `poeAssist.colorMode.v1`; patch 0.13 (2026-07-12).
- [x] App layout polish: wider content (max-width 1760), collapsible sidebar (new additive key `poeAssist.sidebarCollapsed.v1`), Settings placeholder button/modal above Patch Notes, and readable Gear Plan slots (full labels + original per-slot icons, 2×2 jewels, corner quick-add); patch 0.12 (2026-07-12).
- [x] Shopping List gear-board coverage states + per-slot quick-add + Excel-like column-width/row-height sizing (new additive key `poe2ShopList.tableSizing.v1`); patch 0.11 (2026-07-12).
- [x] Shopping List equipment-slot planner — left POE2 gear board filters the table per slot, additive `slot` field (old rows → Unassigned), on-screen numpad for all Divine-price inputs; patch 0.10 (2026-07-12).
- [x] Shopping List usability pass — buy-next strip, name field (additive), quick filters, display-only sort, progress bar, clearer remaining-cost calc; patch 0.9 (2026-07-12).
- [x] Full RawBlock UI redesign of `index.html` per `design.md.md` — shipped as patch 0.8; all 6 tabs verified via headless-browser screenshots; original SVG icon set added (2026-07-12).
- [x] Committed active draft docs (`SKILL.md`, `AGENTS.md`, `design.md.md`, both workflow-skill docs); `Index.md` deliberately left untracked as a superseded draft (2026-07-12).
- [x] Reconciled `PROJECT_INDEX.md` with `EDIT_GUIDE.md`/code: added the Divine Market tab (6th tab, verified in `index.html` `TAB_IDS`), corrected line count, added line-number drift warning (2026-07-12).
- [x] Docs foundation pass: added `ROADMAP.md`, `TODO.md`, `CHANGELOG.md`, `DOC_UPDATE_RULES.md`; linked from `PROJECT_INDEX.md` (2026-07-12).
