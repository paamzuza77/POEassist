# ROADMAP.md — POEassist / Exile Assistant

Phase-level view only. Task-level detail lives in `TODO.md`; session history in `CHANGELOG.md`.

## Active Phase

### P0 — Maintenance & docs foundation
Goal: keep the six shipped tabs (Exile Hub, Market Radar, Divine Market, Atlas Farm Planner, Gear Checker, Shopping List) working, keep data pipelines fresh, and keep docs accurate enough that any agent can continue safely.
Status: ongoing.
Done: sidebar app shell (2026-07-05), Market Radar recommendation layout, docs foundation pass (2026-07-12).
Deferred: see `TODO.md` → Deferred.
Next: see `TODO.md` → Next.

## Future Candidates (not committed — sourced from `SKILL.md` product spec)

- **Build Doctor** — future tab. MVP: paste/import character JSON; output strengths, weaknesses, missing stats, upgrade priorities, shopping suggestions. No automatic external fetching without a proper proxy/official API.
- **Gear Checker: missing stat radar** and **before/after item comparison**.
- **Farm Plan → Shopping List integration** (add a farm plan's required items to the Build Shopping List).
- **Patch impact warnings** (flag outdated farm cards/plans after a game patch).

## Boundaries (do not cross without an explicit user request)

- Static GitHub Pages app only: one `index.html`, static JSON in `data/`, Node scripts in `scripts/`, GitHub Actions. No backend, no database, no build step, no framework.
- User data stays in browser `localStorage`; never sent anywhere.
- No login/OAuth; no storing access tokens in `localStorage`.
- Frontend never calls external APIs directly (poe.ninja etc. go through GitHub Actions → static JSON).
- No broad refactors of `index.html`.
