# AGENTS.md

## Purpose

This repository is `college-tools`, a Google Apps Script project for a Google Sheets based college research and application tracker. It fetches school data from the U.S. Department of Education College Scorecard API, writes that data into a `Colleges` sheet, and maintains related tracker sheets, scoring formulas, financial analysis, and a simple static marketing/docs site under `docs/`.

## Current Architecture

- Runtime: Google Apps Script V8.
- Primary source root for Apps Script: `src/`.
- Deployment metadata: root [`appsscript.json`](/home/scott/code/college-tools/appsscript.json) and `.clasp.json`.
- Public website/docs: [`docs/`](/home/scott/code/college-tools/docs).
- Local helper scripts: [`scripts/`](/home/scott/code/college-tools/scripts).
- Local regression tests: [`test/`](/home/scott/code/college-tools/test).

The Apps Script code uses a shared global namespace pattern:

- `var CollegeTools = CollegeTools || {};`
- Each module assigns `CollegeTools.<ModuleName> = (function() { ... return {...}; })();`

Global top-level menu entry points live in [`src/menu.js`](/home/scott/code/college-tools/src/menu.js). Those adapter functions call into namespaced modules so Google Sheets can discover the menu handlers.

## Module Map

- [`src/config.js`](/home/scott/code/college-tools/src/config.js): central constants, sheet names, header definitions, API fields, default weights, version.
- [`src/menu.js`](/home/scott/code/college-tools/src/menu.js): `onOpen()` and all global adapters exposed to the Sheets UI.
- [`src/utils.js`](/home/scott/code/college-tools/src/utils.js): sheet helpers, region mapping, sanitization, header lookup for row-1 sheets.
- [`src/scorecard.js`](/home/scott/code/college-tools/src/scorecard.js): College Scorecard API access, retry logic, cache, quota tracking, API key lookup.
- [`src/colleges.js`](/home/scott/code/college-tools/src/colleges.js): core college row fill logic, batch fill, region fill, debug flow, version dialog.
- [`src/trackers.js`](/home/scott/code/college-tools/src/trackers.js): create/update tracker sheets and sync college names into them.
- [`src/formatting.js`](/home/scott/code/college-tools/src/formatting.js): number formats and data validation rules.
- [`src/scoring.js`](/home/scott/code/college-tools/src/scoring.js): weights sheet, weighted score formulas, normalized value score, visit score.
- [`src/lookup.js`](/home/scott/code/college-tools/src/lookup.js): search dialog and `Lookup` sheet population.
- [`src/setup.js`](/home/scott/code/college-tools/src/setup.js): one-shot setup, optimization, quick-start UX.
- [`src/financial.js`](/home/scott/code/college-tools/src/financial.js): `Personal Profile`, merit aid, financial safety, formatting enhancements.
- [`src/admissions.js`](/home/scott/code/college-tools/src/admissions.js): admission chance and academic index formulas and conditional formatting.
- [`src/dashboard.js`](/home/scott/code/college-tools/src/dashboard.js): dashboard formulas and chart data staging.
- [`src/instructions.js`](/home/scott/code/college-tools/src/instructions.js): generated in-sheet user guide.

## Sheet Model

There are two header conventions in this codebase:

- `Colleges` uses headers on row 2 and data starting on row 3.
- Most tracker/helper sheets use headers on row 1 and data starting on row 2.

This distinction matters a lot:

- `CollegeTools.Utils.colIndex()` searches row 1 only.
- `Colleges`-specific code uses custom row-2 lookup helpers instead.
- If adding new logic against `Colleges`, do not use `Utils.colIndex()` unless you first change the implementation.

Important sheet names are defined in [`src/config.js`](/home/scott/code/college-tools/src/config.js):

- `Instructions`
- `Colleges`
- `ScorecardAPIKey`
- `Weights`
- `Personal Profile`
- `Lookup`
- `Financial Aid Tracker`
- `Campus Visit Tracker`
- `Application Timeline`
- `Scholarship Tracker`
- `Application Status Tracker`
- `Dashboard`

## Main User Flows

### Fill college data

The primary workflow is:

1. User types a college name into column A of `Colleges`.
2. User runs `Fill current row`, `Fill current row (fast)`, or `Fill selected rows`.
3. [`src/colleges.js`](/home/scott/code/college-tools/src/colleges.js) sanitizes the name and calls [`src/scorecard.js`](/home/scott/code/college-tools/src/scorecard.js).
4. Scorecard API data is written back into the row.
5. Tracker sheets may be seeded via `Trackers.syncCollegeToTrackers()`.

### Search colleges

`Search College Names` prompts for query text and optionally `, ST`, then writes results to the `Lookup` sheet.

### Setup/customization

`Complete Setup` orchestrates:

- instructions sheet creation
- tracker setup
- dashboard setup
- formatting/dropdowns
- scoring
- financial intelligence
- row trimming

### Financial/admissions analysis

`Personal Profile` drives formulas via named ranges:

- `SAT_Score`
- `ACT_Score`
- `GPA`
- `Family_Income`
- `EFC`
- `State_Residency`

Admissions and finance formulas depend on those named ranges existing.

## API Notes

Critical rule: College Scorecard responses are handled as flattened keys.

Examples:

- `r['school.city']`
- `r['latest.admissions.admission_rate.overall']`

Do not assume nested response objects.

Other API details:

- API key is read from sheet `ScorecardAPIKey`, cell `A1`.
- Root manifest allowlists `https://api.data.gov/`.
- Retry logic exists for `5xx` and `429`.
- Search requests may use cache.
- Detailed row-fill requests currently bypass cache.

## Development Commands

From [`package.json`](/home/scott/code/college-tools/package.json):

- `npm run lint`
- `npm run lint:fix`
- `npm run lint:check`
- `npm run build`
- `npm run dev`
- `npm run push`
- `npm run pull`
- `npm run clasp:version`
- `npm run version:show`
- `npm run version:patch`
- `npm run version:minor`
- `npm run version:major`
- `npm run release`

Notes:

- `npm run build` only updates git hashes in the static website footer files.
- `scripts/update-version.js` updates `package.json`, module `@version` headers, and `Config.VERSION`.
- `npm run push` runs lint first, then `clasp push`.

## Testing

There is a lightweight Node-based regression harness under [`test/`](/home/scott/code/college-tools/test).

- Main entry: [`test/regression-tests.js`](/home/scott/code/college-tools/test/regression-tests.js)
- It mocks Apps Script globals.
- It is useful for namespace/config/function presence checks.
- It does not prove real spreadsheet behavior, formulas, UI prompts, or live API correctness.

Manual spreadsheet testing is still required for meaningful changes.

## Important Realities And Mismatches

These are worth remembering before editing:

- [`CLAUDE.md`](/home/scott/code/college-tools/CLAUDE.md) is partially stale. It still references an older single-file architecture and outdated versioning notes.
- The README project structure is incomplete relative to current modules.
- [`src/colleges.js`](/home/scott/code/college-tools/src/colleges.js) `fillCollegeRowCore()` currently batch-writes the entire target row with mostly blank defaults, preserving only `College Name` plus freshly fetched API fields and `Notes`. That means non-API columns in that row can be wiped.
- [`src/dashboard.js`](/home/scott/code/college-tools/src/dashboard.js) uses hard-coded column letters/positions for dashboard formulas; verify those against the current `Colleges` header order before trusting dashboard metrics.
- [`src/admissions.js`](/home/scott/code/college-tools/src/admissions.js) clears existing conditional formatting rules on the `Colleges` sheet before applying admission formatting, which can remove unrelated rules.
- Formatting, trackers, and setup code are designed to be rerunnable, but many functions still rebuild or clear sheet content aggressively.
- There is mixed use of row-1 and row-2 header assumptions across modules; this is the main structural footgun in the repo.

## Static Site

The `docs/` directory is a separate static documentation/marketing site, not the Apps Script runtime.

- HTML pages are mostly hand-authored.
- [`scripts/build-website.js`](/home/scott/code/college-tools/scripts/build-website.js) only stamps the git hash into footer text.
- `docs/functions/[[path]].js` suggests Cloudflare Pages Functions routing support.

## Safe Working Rules For Future Agents

- Start by checking whether you are touching `Colleges` row-2 logic or tracker row-1 logic. Do not mix them.
- When changing Scorecard field extraction, preserve flattened-key access.
- When editing fill/setup flows, check for unintended sheet clearing or whole-row overwrites.
- When editing formulas, verify header positions against `Config.HEADERS` and actual row conventions.
- Treat the Apps Script UX as alert/prompt driven and synchronous.
- Prefer small, surgical changes because setup code and formatting rules are easy to make destructive.
- Do not trust older prose docs over current source.

## Recommended First Files To Read Next Time

- [`src/config.js`](/home/scott/code/college-tools/src/config.js)
- [`src/menu.js`](/home/scott/code/college-tools/src/menu.js)
- [`src/colleges.js`](/home/scott/code/college-tools/src/colleges.js)
- [`src/scorecard.js`](/home/scott/code/college-tools/src/scorecard.js)
- [`src/trackers.js`](/home/scott/code/college-tools/src/trackers.js)
