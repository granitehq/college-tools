# CLAUDE.md

Working rules and non-obvious traps for AI agents in this codebase. Trust source over any prose here if they conflict.

## What This Is

Google Apps Script project — a Google Sheets college research and application tracker. Data comes from the U.S. Department of Education College Scorecard API. Source is in `src/`, static website in `docs/`, build tooling in `scripts/`.

All source modules follow the same IIFE namespace pattern: `CollegeTools.ModuleName = (function() { ... })()`. Menu entry points in `src/menu.js` are global functions that delegate into these modules.

## Critical: Two Header Row Conventions

**`Colleges` sheet: headers on row 2, data from row 3.**
**All other sheets: headers on row 1, data from row 2.**

`CollegeTools.Utils.colIndex()` reads row 1 only — never use it on `Colleges`. Colleges-specific code does its own row-2 header lookups. Mixing these up is the easiest way to introduce silent bugs.

## Critical: Flattened API Keys

Scorecard API responses are accessed as flattened dot-notation strings:

```js
r['school.city']
r['latest.admissions.admission_rate.overall']
```

Do not assume nested objects (`r.school.city` will be undefined). The `Lookup` module handles both forms defensively, but `src/colleges.js` is strictly flat.

## Re-fill Behavior (`fillCollegeRowCore`)

On re-fill, the row is cleared first then API data is written back. What survives:
- `College Name`
- User rating columns (`Program Fit` through `Personal Priority`)
- Formula columns (`Weighted Score`, `Admission Fit`)
- `Notes` — but only when it holds user-entered text. Empty cells and prior auto-stamps (`"1.2.3 | ..."` pattern) are refreshed with version info and matched school name.

## Other Known Risks

- **Dashboard formulas** in `src/dashboard.js` derive column letters from `Config.HEADERS` at build time. They are frozen into the sheet until Setup/Refresh Dashboard is rerun, so header-order changes require a dashboard rebuild.
- **Setup and formatting functions** are rerunnable but several clear or rebuild sheet contents aggressively.

## Testing

The `test/` harness mocks Apps Script globals. It catches wiring issues and config regressions but does not validate spreadsheet behavior, formulas, or real API calls. Manual testing in a live Google Sheet is required for meaningful changes.

## Deploy

- `npm run push` — runs lint check first, then `clasp push`
- `npm run build` — only updates git hash in `docs/` HTML footers; does not compile anything
- `npm run release` — bumps patch version then pushes
- `scripts/update-version.js` — updates `package.json`, all source `@version` tags, and `Config.VERSION` together

## Working Rules

- Always check which header row convention a sheet uses before writing lookups or formulas.
- Keep API field access as flattened keys unless refactoring the entire data path.
- Prefer small, surgical edits. Setup/formatting functions touch a lot — be deliberate.
- Verify formulas against `Config.HEADERS` and the actual row convention of the target sheet.
