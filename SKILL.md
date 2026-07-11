---
name: poeassist-exile-assistant
description: Use this skill when working on the user's POEassist / Exile Assistant web app, a personal Path of Exile 2 assistant for gear stats, build shopping, atlas farming, market radar, and build analysis. Use for feature planning, UI/UX improvements, static GitHub Pages implementation, localStorage data design, GitHub Actions JSON generation, and Claude Code development tasks for this project.
---

# POEassist / Exile Assistant Skill

## Project Identity

This project is a personal Path of Exile 2 web assistant.

Current / intended product name:
**Exile Assistant**

Product purpose:
A personal PoE2 build, gear, trade, farming, and market decision assistant.

The app should help the user:
- Check gear stats.
- Plan build purchases.
- Track shopping budget.
- Save trade links.
- Plan atlas farming strategies.
- Track tablets, waystones, key mods, and sources.
- Read poe.ninja market snapshots from generated JSON.
- Eventually analyze character/build links or imported character JSON.

This is not meant to compete directly with Path of Building, poe.ninja, or Mobalytics.
The niche is:
**a personal decision tool that helps the user decide what to buy, what to fix, and what to farm next.**

## Current / Planned Main Tabs

Use these names unless the user asks otherwise:

1. **Gear Stat Checker**
   - Formerly Resistance Forge.
   - Calculates resistance and rarity from gear/jewels.
   - Supports screenshot/OCR workflow if already present.
   - Should eventually support missing stat radar and before/after item comparison.

2. **Build Shopping List**
   - Spreadsheet-like or card/table hybrid planner.
   - Tracks build items to buy.
   - Stores trade links, item type, important option, min/max price, bought price, saved deal link, Divine to THB rate, total cost, remaining cost.
   - Long URLs must always be displayed as short chips/buttons.

3. **Atlas Farm Planner**
   - Should be card-based, not a plain spreadsheet.
   - Records farm strategy, tablets, waystones, key mods, trade filters, source links, notes, favorite star, active checkbox, status, and last checked date.
   - Favorite cards should sort to the top.
   - Active cards should be highlighted.
   - Outdated / too expensive cards should look muted or warning-like.

4. **Market Farm Radar**
   - Usually appears at the top of Atlas Farm Planner.
   - Reads static JSON from `data/market-radar.json`.
   - The frontend must not directly spam poe.ninja.
   - GitHub Actions should generate/update the JSON on a schedule.
   - Scores must be labeled as **Farm Score** or **Recommendation Score**, never drop chance.

5. **Build Doctor**
   - Future tab.
   - Analyzes character/build data.
   - MVP should accept pasted character JSON or imported JSON.
   - Pasted poe.ninja URLs may be parsed for account/league/character, but automatic fetching should not be assumed unless implemented through a proper backend/proxy or official API.
   - Output should include strengths, weaknesses, missing stats, upgrade priorities, and shopping suggestions.

## Hosting / Architecture Rules

The site is hosted on GitHub Pages.

Assume static hosting by default:
- HTML
- CSS
- JavaScript
- JSON files
- localStorage
- GitHub Actions for scheduled static data generation

Do not introduce a live backend unless the user explicitly requests it.

Do not add paid APIs.

Do not add secrets for MVP.

Do not require login unless designing a future OAuth/API mode.

For market data:
- Prefer GitHub Actions generating `data/market-radar.json`.
- Frontend reads that JSON.
- Use stale/missing/error states.
- Do not make the browser directly spam poe.ninja in production.

## Data Persistence Rules

Use localStorage for user-created planner data unless the user requests otherwise.

Before changing storage keys, warn the user.
Avoid breaking existing saved data.

When changing data structures:
- Add migration logic where possible.
- Preserve old fields.
- Be tolerant of missing fields.
- Export/import JSON should remain available for important user data.

Useful storage principles:
- Store full URLs.
- Display short link chips.
- Store dates in ISO format when possible.
- Keep user-editable data human-readable in exported JSON.

## UI / UX Direction

The app should feel like a clean dark fantasy PoE2 dashboard.

General style:
- Dark background.
- Gold accents.
- Readable typography.
- Card-based summaries.
- Compact but not cramped.
- Desktop-first with about 1520px max width.
- Mobile should not break; horizontal scroll is acceptable for wide tables.

Important UX rules:
- Long links must never stretch layouts.
- Show long URLs as chips like:
  - Open Trade
  - Open Source
  - Open Backup
  - Open Filter
- Add edit/delete controls for link chips.
- Use clear empty states.
- Use confirmation for destructive actions.
- Keep actions visible and predictable.
- Favor cards for complex farm/build strategy records.
- Favor tables for dense price/budget rows.
- Always reduce manual typing when possible.

## Feature Design Principles

Prioritize features that help the user make decisions, not just store data.

The app should answer:
- What am I missing?
- What should I buy next?
- Is this item worth buying?
- What farm is worth doing now?
- Is this plan outdated?
- Is this build ready?

High-value QoL features:
1. Missing Stat Radar
2. Build Readiness Score
3. Before / After Gear Swap
4. Buy Decision / Evaluate Item
5. Farm Plan → Add required items to Build Shopping List
6. Favorite / Active / Status filters
7. Source confidence and Last Checked warnings
8. Market Farm Radar with Farm Score
9. Export / Import JSON
10. Patch impact warnings in the future

## Gear Stat Checker Rules

Preserve existing resistance/rarity calculation behavior unless asked to change it.

Important stats:
- Fire resistance
- Cold resistance
- Lightning resistance
- Chaos resistance
- Item rarity

Future stats to support:
- Life
- Energy Shield
- Spirit
- Attributes
- Movement speed
- +skill levels
- Minion stats
- Open prefix/suffix notes

If adding penalty settings:
- Do not hard-code only one penalty forever.
- Prefer selectable/custom resistance penalty.
- Make clear whether the user is entering raw gear stats or character sheet stats.

## Build Shopping List Rules

Core columns / fields:
- Checkbox
- No.
- Link Item
- Type
- Important Option
- Min Price
- Max Price
- Bought
- Saved Deal / Good Item link + price

Totals:
- Total Min Divine
- Total Max Divine
- Total Bought Divine
- Remaining Min Divine
- Remaining Max Divine
- Divine to THB manual rate
- THB equivalents

Bought logic:
- If Bought has a valid number, count as bought.
- If Bought is empty, count as not bought.

UI:
- Link fields must be visually shortened.
- Price fields should be compact.
- Link fields should have enough width.
- Avoid huge raw URLs.

## Atlas Farm Planner Rules

Use card view by default.

Each farm card should support:
- Favorite star: ☆ / ★
- Active checkbox
- Farm Strategy Name
- Goal
- Mechanic tags
- Status
- Tablet Setup
- Waystone Setup
- Key Mods
- Trade Filter Links
- Source Links
- Notes
- Last Checked
- Duplicate
- Delete

Suggested goals:
- EXP
- Drop
- Currency
- MF
- Boss
- Tablet Farm
- Waystone Farm
- Hybrid
- Other

Suggested mechanics:
- Breach
- Delirium
- Abyss
- Ritual
- Overseer
- Irradiated
- Runes
- Expedition
- Waystone
- Other

Suggested statuses:
- Active
- Testing
- Good
- Budget
- Expensive
- Too Expensive
- Later
- Outdated
- Skipped

Suggested source types:
- YouTube
- Reddit
- Mobalytics
- Maxroll
- PoE Forum
- Discord
- Wiki
- PoE2DB
- Personal Test
- Friend
- Other

## Market Farm Radar Rules

Market Farm Radar should be generated from static JSON, usually:

`data/market-radar.json`

Frontend behavior:
- Show title.
- Show league.
- Show last updated time.
- Show data status:
  - Fresh
  - Stale
  - Missing
  - Error
- If missing, show friendly fallback.
- If stale, warn but still display data.
- If errors exist, show them compactly.

Score wording:
- Use “Farm Score” or “Recommendation Score”.
- Never call the score drop chance.
- Explain that it is based on price trend, value, liquidity, and content mapping confidence.

Suggested JSON structure:
- version
- league
- updatedAt
- source
- topRisingItems
- contentRecommendations
- errors

Recommended architecture:
- GitHub Action runs hourly.
- Script fetches poe.ninja economy endpoints.
- Script maps item categories to content.
- Script writes `data/market-radar.json`.
- GitHub Action commits file only if changed.

## Build Doctor Rules

Build Doctor should be honest and approximate unless using a full reliable calculation engine.

Do not claim exact DPS unless exact data and formulas exist.

MVP input modes:
- Paste poe.ninja URL
- Paste character JSON
- Import character JSON

For poe.ninja URL only:
- Parse account/profile, league, character name if possible.
- Do not pretend to have analyzed the build if character data is not fetched.
- Ask for JSON or screenshots if needed.

Analysis output:
- Strengths
- Weaknesses
- Missing stats
- Upgrade priority
- Suggested shopping targets
- Build Readiness Score
- Defense Score
- Damage Setup Score
- Gear Quality Score

Potential warning:
“Rule-based approximation. Verify in-game or with a full build calculator.”

## Coding Workflow for Claude Code

When asked to edit the project:

1. Inspect the existing project structure first.
2. Identify whether the project is a single `index.html` or split files.
3. State the files that will be changed before major edits.
4. Preserve existing functionality.
5. Do not remove OCR, localStorage, export/import, or tab navigation unless explicitly asked.
6. Make small, testable changes.
7. Keep code readable.
8. Add comments around configurable sections:
   - league name
   - poe.ninja categories
   - content mapping
   - localStorage keys
   - JSON file path
9. After changes, summarize:
   - what changed
   - where to edit config later
   - what to test in the browser

## Safety / Security Rules

Be careful with third-party skills, scripts, or copied code.

Do not copy code from other websites unless license clearly allows it.

Do not scrape external sites if an official or documented API exists.

Do not store access tokens in localStorage for future OAuth designs unless explicitly accepted.

Do not expose API secrets in GitHub Pages.

Do not auto-run destructive operations.

Ask for confirmation before clearing user data.

## Communication Style

When explaining to the user:
- Be practical.
- Focus on what to do next.
- Give ready-to-paste prompts when useful.
- Explain tradeoffs clearly.
- Prefer phased plans:
  - MVP
  - Better version
  - Future advanced version
- Keep the user’s goal in mind:
  building a useful personal PoE2 assistant, not a perfect enterprise product.
