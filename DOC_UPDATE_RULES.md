# DOC_UPDATE_RULES.md — POEassist / Exile Assistant

Update docs only when the change affects future understanding.

## Always update

- `PROJECT_INDEX.md` — when adding/removing docs, tabs, data files, scripts, or workflows, or when its feature-map anchors are known to be wrong.
- `EDIT_GUIDE.md` — when a feature is added or its `index.html` anchors move (comment banners, function names).
- `PATCH_NOTES` array in `index.html` — for **every user-visible app change** (version bump + date). This is an app-code rule, not a markdown rule, but it belongs in the same checklist.
- `CHANGELOG.md` — one short entry per notable session/task.
- `TODO.md` — when a task is completed, deferred, or a new known issue is found.
- `ROADMAP.md` — only when a phase starts/ends or a future candidate is promoted/dropped.

## Avoid

- Rewriting old history in `CHANGELOG.md` or `PATCH_NOTES`.
- Duplicating content across docs — link instead (`PROJECT_INDEX.md` is the hub; `SKILL.md` owns product rules; `EDIT_GUIDE.md` owns edit recipes).
- Updating docs for tiny internal tweaks future agents don't need to know about.
- Recording exact `index.html` line numbers as durable facts — they drift; prefer `rg` anchor terms (function names, comment banners).

## If unsure

Write a short note/TODO in the relevant `.md` file instead of guessing (per `CLAUDE.md`/`AGENTS.md`).
