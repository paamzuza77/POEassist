# src/ — TypeScript modules (P5 migration target)

New code goes here as typed ES modules. The legacy app still lives in `index.html`
(global-scope monolith) and is the live source of truth until migrated tab-by-tab.

- Type-check: `npm run typecheck` (only checks `src/`, not the monolith).
- Dev server (HMR): `npm run dev` — serves the existing app at localhost:5173.
- See `../P5_MIGRATION.md` for the staged plan and rules (never change localStorage
  keys or formulas; migrate one tab at a time; keep the live deploy working).

Start by extracting **pure, dependency-free helpers** (formatters, math) — they're the
safest to move and type first.
