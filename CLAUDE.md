# CLAUDE.md — POEassist / Exile Assistant

Instructions for Claude Code sessions working in this repo.

## Read order

1. Read `PROJECT_INDEX.md` first, always — it maps every feature to exact line ranges in `index.html` plus the data/scripts/workflow files.
2. Read `EDIT_GUIDE.md` if the task matches one of its recipes (scoring formula, league name, UI text, shopping list, gear checker/OCR, new data source, Actions schedule).
3. Only then open source files, and only the sections `PROJECT_INDEX.md` points to.

## Working rules

- For every task, identify the smallest relevant edit target (file + line range) before reading large files. State it before making major edits.
- Prefer `rg`/grep with the anchor terms in `PROJECT_INDEX.md` before opening `index.html` in full. Never re-read the whole file "just in case."
- Do not rewrite `index.html` unless the requested change truly requires touching most of it. Default to targeted edits.
- Do not perform broad refactors, renames, or restructuring unless explicitly requested.
- Do not connect a backend or database unless explicitly requested. This stays a static GitHub Pages app (HTML/CSS/JS + static JSON + `localStorage`) unless a future task says otherwise.
- Preserve existing behavior: OCR/paste/drop, `localStorage` save/load, export/import JSON, tab navigation, and the Market Radar scoring pipeline must keep working unless the task is specifically about changing them.
- After editing, run the smallest reasonable verification (see `EDIT_GUIDE.md` per-recipe notes) — e.g. `node scripts/<script>.mjs` for a script change, open `index.html` in a browser for a UI change.
- After successful verification, commit and push to GitHub with a concise commit message.
- Before ending a session, update the docs per `DOC_UPDATE_RULES.md` (typically: `CHANGELOG.md` entry, `TODO.md` status, and `PROJECT_INDEX.md`/`EDIT_GUIDE.md` if anchors or the file map changed).
- If unsure about a decision (e.g. ambiguous requirement, missing data), leave a short note in the relevant `.md` file instead of guessing.

## Product/UX conventions

`SKILL.md` at repo root holds detailed product rules (tab specs, scoring wording, UX conventions like link chips). Check it when a task touches product behavior, not just code mechanics — `PROJECT_INDEX.md` intentionally doesn't duplicate it.
