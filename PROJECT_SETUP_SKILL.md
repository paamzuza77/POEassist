---
name: project-setup-docs
description: Use when starting or organizing a software/game project with an AI agent and the user wants a durable project index, documentation map, workflow rules, roadmap, TODO, changelog, session-end reporting, and minimal-but-reliable project memory. Especially useful before implementation work begins, when onboarding another AI agent, or when a project is growing across many systems and needs a PROJECT_INDEX-style navigation hub.
---

# Project Setup Docs Skill

## Purpose

Create a durable project documentation skeleton that lets any AI agent understand the project quickly without reading the whole repo. Use this skill to set up or refresh project-level docs before implementation work, especially for long-running projects with many phases.

## Core Principles

- Read narrowly. Search first, then open only the files needed.
- Create a navigation hub first. The project index should tell future agents where to look, not duplicate every document.
- Keep docs short, precise, and phase-aware.
- Treat docs as an operational tool, not a novel.
- Record decisions once, then link to them.
- Separate implemented reality from future ideas.
- Always distinguish design proposal, active roadmap, completed work, and deferred work.
- Prefer stable names and clear file ownership.

## Recommended Files

Create or update only the files that fit the project. Do not create unnecessary docs.

### Required For Most Projects

- `PROJECT_INDEX.md`: navigation hub and source of truth for where docs live.
- `AGENTS.md`: rules for AI agents working in the repo.
- `ROADMAP.md`: current phases and future phase candidates.
- `TODO.md`: short task list with current next task and deferred follow-ups.
- `CHANGELOG.md`: dated/session-based record of notable changes.
- `DOC_UPDATE_RULES.md`: rules for when docs must be updated.

### Add When Relevant

- `SYSTEMS_OVERVIEW.md`: high-level architecture and major flows.
- `DATA_SCHEMA.md`: durable state, save/load shape, data registries, schema rules.
- `UI_MAP.md`: screens, panels, controls, shortcuts, and UX conventions.
- `BALANCE_NOTES.md`: tuning decisions, audit tables, benchmark seeds, known risks.
- `REFERENCE_POLICY.md`: rules for using external inspiration without copying.
- Domain docs such as `COMBAT_DESIGN.md`, `ITEMIZATION_DESIGN.md`, `SKILL_GEM_DESIGN.md`, `VISUAL_EFFECTS_DESIGN.md`, `PROGRESSION_DESIGN.md`.

## Setup Workflow

1. Ask or infer the project goal in one paragraph.
2. Identify the active repo root and primary tech stack.
3. Search for existing docs before creating new ones.
4. Create or update `PROJECT_INDEX.md` first.
5. Add `AGENTS.md` rules for future agents.
6. Add roadmap/TODO/changelog only if they do not already exist.
7. Add topic docs only for systems that are active or imminent.
8. Keep every doc linked from `PROJECT_INDEX.md`.
9. End with a short session report.

## PROJECT_INDEX.md Template

Use this structure unless the project already has a better one:

```markdown
# Project Index

## Project
Short description of what this project is and what it is not.

## Current Status
- Active phase:
- Last completed phase:
- Next recommended task:

## Start Here
- `AGENTS.md` - AI agent workflow rules.
- `ROADMAP.md` - active/future phases.
- `TODO.md` - actionable task list.
- `CHANGELOG.md` - session history.

## System Docs
| Area | File | When to read |
| --- | --- | --- |
| Architecture | `SYSTEMS_OVERVIEW.md` | Before cross-system work |
| Data/save | `DATA_SCHEMA.md` | Before schema or persistence changes |
| UI | `UI_MAP.md` | Before UI work |
| Balance | `BALANCE_NOTES.md` | Before tuning |

## Implementation Map
| Area | Key files | Notes |
| --- | --- | --- |

## Documentation Rules
Follow `DOC_UPDATE_RULES.md`.
```

## AGENTS.md Template

```markdown
# AGENTS.md

## Session Start
1. Read `PROJECT_INDEX.md` first.
2. Read `AGENTS.md`.
3. Search before opening files.
4. Read only docs/files relevant to the current task.

## Work Rules
- Keep changes narrow.
- Prefer existing patterns.
- Do not rewrite unrelated systems.
- Do not touch generated/vendor files unless required.
- Preserve user changes.

## Verification
- Run the smallest meaningful tests for the touched area.
- Run broader checks when touching shared systems.
- Report anything not run.

## Documentation
- Update `PROJECT_INDEX.md` when adding docs, systems, screens, folders, or major files.
- Update topic docs when behavior/schema/UI changes.
- Update `CHANGELOG.md` for notable work.
- Update `TODO.md` when task status changes.

## Session End
Report changed files, verification, known risks, and next suggested task.
```

## Roadmap Pattern

Use phases with clear boundaries:

```markdown
## Active Phase
### P1 - Name
Goal:
Status:
Done:
Deferred:
Next:

## Future Candidates
- P2 - ...
- P3 - ...
```

## TODO Pattern

Keep TODO actionable and compact:

```markdown
## Next
- [ ] Immediate next task.

## Deferred
- [ ] Follow-up with reason.

## Known Issues
- [ ] Bug or risk, with evidence.

## Done
- [x] Completed task, date/session if useful.
```

## CHANGELOG Pattern

```markdown
## YYYY-MM-DD (N)
- Phase/task name.
- Changed files/systems in one line.
- Verification summary.
- Known follow-up if any.
```

## Doc Update Rules

Add a concise doc rule file if missing:

```markdown
# Doc Update Rules

Update docs only when the change affects future understanding.

Always update:
- `PROJECT_INDEX.md` when adding/removing docs, folders, major systems, or screens.
- Topic docs when behavior/schema/UI changes.
- `CHANGELOG.md` for notable completed work.
- `TODO.md` for task status and deferred follow-ups.

Avoid:
- Rewriting old history.
- Duplicating large explanations across docs.
- Updating docs for tiny internal refactors unless future agents need to know.
```

## Session-End Report Format

Use this report shape:

```text
Session report - <task name>

Changed files
- ...

What changed
- ...

Verification
- ...

Not run / risks
- ...

Next suggested task
- ...
```

## Quality Bar

A good setup pass leaves the project easier to continue tomorrow. A future AI should know:

- What the project is.
- Where important docs live.
- What is active, done, deferred, and forbidden.
- Which files are likely relevant for the next task.
- How to verify changes.

## Anti-Patterns

Avoid these:

- Reading the whole repo before deciding what matters.
- Creating many docs with overlapping purpose.
- Mixing future dreams into implemented status.
- Marking a task complete without verification notes.
- Writing vague roadmap items like “improve everything.”
- Hiding risks instead of recording them.
