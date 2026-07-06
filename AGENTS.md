# AGENTS.md

Canonical repo guidance for coding agents. Keep this file practical and current:
repo layout, commands, conventions, constraints, and verification expectations.
`CLAUDE.md` and `GEMINI.md` intentionally mirror the same core facts for other
agent surfaces; update all three when durable project guidance changes.

## Purpose

`college-tools` is a Google Apps Script V8 project for a Google Sheets based
college research and application tracker. It fetches U.S. Department of
Education College Scorecard data, writes it into a `Colleges` sheet, maintains
tracker sheets, scoring formulas, financial analysis, registration/update
workflows, and a static marketing/docs site under `docs/`.

## Current Architecture

- Runtime: Google Apps Script V8.
- Apps Script source: `src/`.
- Deployment metadata: `appsscript.json` and `.clasp.json`.
- Static website: `docs/`.
- Local helper scripts: `scripts/`.
- Node regression harness: `test/`.
- Project docs and runbooks: `project-docs/`, using lowercase kebab-case file
  names. Historical/consolidated planning docs live in `project-docs/archive/`.

The Apps Script code uses one shared global namespace:

```js
var CollegeTools = CollegeTools || {};
CollegeTools.ModuleName = (function() {
  return {};
})();
```

Global menu entry points live in `src/menu.js`. Those top-level functions are
required so Google Sheets can discover menu handlers; they delegate into
namespaced modules.

## Module Map

- `src/config.js`: sheet names, headers, API fields, default weights, version,
  registration config.
- `src/menu.js`: `onOpen()` and global menu adapters.
- `src/utils.js`: shared helpers, sanitization, region mapping, row-1 lookup.
- `src/schema.js`: canonical sheet metadata, header rows, data starts, column
  keys, ownership groups, workbook shape validation.
- `src/formulas.js`: pure formula builders and sheet/range reference helpers.
- `src/scorecard.js`: College Scorecard API client, retry/backoff, search
  cache, execution-budget checks, API key lookup.
- `src/colleges.js`: fill current/selected rows, region repair, row
  preservation, debug/version helpers.
- `src/trackers.js`: create/update trackers and sync/repair college-linked
  rows.
- `src/formatting.js`: number formats, dropdown/date validation, formatting
  repair, shared conditional-format helpers.
- `src/scoring.js`: weights sheet, Weighted Score formulas, Campus Visit Score.
- `src/lookup.js`: search dialog and `Lookup` sheet population.
- `src/setup.js`: complete setup, quick start, repair/performance workflows.
- `src/financial.js`: `Personal Profile`, named ranges, financial formulas and
  formatting.
- `src/admissions.js`: Admission Fit formulas and admission formatting.
- `src/dashboard.js`: dashboard formulas, due-next/offer/decision/fit tables.
- `src/instructions.js`: generated in-sheet user guide.
- `src/registration.js`: optional copy registration/phone-home for direct-push
  updates.

## Sheet Model

There are two header conventions:

- `Colleges`: headers on row 2, data starts on row 3.
- Tracker/helper sheets: headers on row 1, data starts on row 2.

This is the main structural footgun. `CollegeTools.Utils.colIndex()` searches
row 1 only, so do not use it for `Colleges`. Prefer `CollegeTools.Schema`
helpers for new code. If a module still uses local lookup helpers, confirm the
target sheet's header row before changing formulas or writes.

Sheet names are centralized in `CollegeTools.Config.SHEET_NAMES`:
`Instructions`, `Colleges`, `ScorecardAPIKey`, `Weights`, `Personal Profile`,
`Lookup`, `Financial Aid Tracker`, `Campus Visit Tracker`,
`Application Timeline`, `Scholarship Tracker`, `Application Status Tracker`,
and `Dashboard`.

## Main User Flows

### Fill College Data

1. User types a college name into column A of `Colleges`.
2. User runs `Fill current row`, `Fill current row (fast)`, or
   `Fill selected rows`.
3. `src/colleges.js` sanitizes the name and calls `src/scorecard.js`.
4. Scorecard API data is written back into the row.
5. Tracker sheets are synced with the typed/matched college name, including the
   no-API-match path.

`fillCollegeRowCore()` is a batched row update. It reads the target row,
preserves user-owned/formula-owned cells, refreshes API-owned cells, and writes
the row back in one call. Be careful when changing ownership lists or row
defaults; this path protects user-entered ratings, formulas, and user notes.

### Search Colleges

`Search College Names` prompts for query text, optionally accepts `, ST`, and
writes results to the `Lookup` sheet.

### Setup, Repair, And Formatting

`Complete Setup` creates/updates instructions, trackers, dashboard, formatting,
scoring, financial intelligence, registration, and row trimming. Repair flows
are intended to be rerunnable, but they still touch broad sheet ranges. Keep
edits surgical and verify preservation behavior.

### Financial And Admissions Analysis

`Personal Profile` creates named ranges used by formulas:

- `SAT_Score`
- `ACT_Score`
- `GPA`
- `Family_Income`
- `EFC`
- `State_Residency`

Admission Fit, Applicable Tuition, EFC propagation, financial safety, and
burden formulas depend on these named ranges existing.

### Direct-Push Registration And Updates

`src/registration.js`, `scripts/registry-webapp.js`, and
`scripts/push-updates.js` support optional direct-push updates to registered
copies. `CollegeTools.Config.REGISTRATION_CONFIG.ENDPOINT_URL` is blank by
default in local/dev builds. When configured, setup/register actions send
copy metadata to the registry. Treat the registry as low-trust telemetry; the
shared secret is not a strong security boundary.

Runbook docs:

- `project-docs/direct-push-registry-provisioning.md`
- `project-docs/direct-push-release-workflow.md`

## College Scorecard API Rules

Scorecard API responses are handled as flattened keys:

```js
r['school.city']
r['latest.admissions.admission_rate.overall']
```

Do not assume nested objects in `src/colleges.js`. `lookup.js` handles both
forms defensively, but the row-fill path is flat-key based.

Other API facts:

- API key is read from `ScorecardAPIKey!A1`.
- Root manifest allowlists `https://api.data.gov/`.
- Retry/backoff exists for `5xx` and `429`.
- Search requests may use cache.
- Detailed row-fill requests currently bypass search cache.

## Development Commands

From `package.json`:

- `npm run lint`
- `npm run lint:fix`
- `npm run lint:check`
- `npm test`
- `npm run check`
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
- `npm run release:prepare`
- `npm run release:tag`
- `npm run release:clasp`
- `npm run release:promote`
- `npm run push:updates`

Notes:

- Node requirement is `>=24.0.0`.
- `npm run build` only stamps git hashes into static website footer files.
- `npm run dev` runs the static website locally from `docs/`.
- `scripts/update-version.js` updates `package.json`, source `@version`
  headers, and `Config.VERSION`.
- `npm run push` runs `npm run check` before `npx clasp push`.
- `npm run release:promote -- <sheet-id>` updates the website template link.

## Required Branch And Release Flow

Default all new code/docs changes to this flow unless the user explicitly
overrides it:

1. Start from latest `development`.
2. Create a feature branch off `development`.
3. Commit the feature work on that feature branch.
4. Merge the feature branch back into `development`.
5. Merge `development` into `main`.
6. Version and deploy from `main`.

`main` should not receive ordinary feature or documentation commits directly.
If the user asks for a direct commit to `main`, explain the normal flow and ask
for an explicit override for that specific change. Rare direct hotfixes must be
reconciled back into `development`.

## Testing And Verification

The Node harness in `test/` mocks Apps Script globals. Main entry:

```bash
npm test
```

Full local quality gate:

```bash
npm run check
```

Useful focused commands:

- `npm run test:regression`
- `npm run test:template`
- `npm run test:repair`
- `npm run test:schema`
- `npm run test:menu`
- `npm run test:validation`
- `npm run test:syntax`

The harness is good for namespace wiring, config/schema contracts, formula text,
repair behavior, registration/push scripts, and regression coverage. It does
not prove live spreadsheet behavior, rendered formulas, UI prompts, OAuth, or
live API correctness. Meaningful setup/repair/formula/deploy changes still need
manual testing in a copied Google Sheet.

## Important Current Realities

- `project-docs/backlog.md` is the consolidated roadmap/backlog. Older planning
  and review docs are archived under `project-docs/archive/`.
- `README.md`, `project-docs/version-management.md`, and release docs describe
  template promotion and release mechanics.
- Dashboard formulas are generated into the sheet; header/formula changes
  require rerunning setup or dashboard refresh.
- Formatting repair intentionally normalizes validations across broad sheet
  ranges to fix stale/dropdown corruption.
- Tracker repair preserves user-entered tracker data where possible, but stable
  hidden college identity is still backlog work. Be cautious around sorting,
  row reuse, and positional assumptions.
- Apps Script UX is synchronous and prompt/alert driven. Service modules still
  contain some UI behavior; menu-boundary cleanup remains backlog work.
- Setup, repair, formatting, and tracker code can touch many sheets. Narrow
  changes and preservation-focused tests matter.

## Safe Working Rules

- Read current source before trusting prose. If docs and code conflict, use code
  as truth and update docs.
- Before committing code, confirm you are on a feature branch based on
  `development`, unless the user explicitly chose another flow.
- Do not commit directly to `main` without explicit override.
- Check row convention before writing lookups, formulas, or ranges.
- Use schema helpers for new sheet-aware code where practical.
- Preserve flattened Scorecard field access in row-fill code.
- Preserve user-owned columns, formula columns, notes, tracker details, and named
  ranges unless the user specifically requests a destructive migration.
- Keep edits small around setup, formatting, dashboard, and tracker repair.
- Add or update focused tests for behavior changes, especially preservation,
  formulas, schema, registration, and repair paths.
- For review tasks, lead with bugs/regressions/risks and file references.
- For docs-only changes, still run `git diff --check`; run code tests only when
  source behavior changed or references are risky.

## Recommended First Files To Read

- `src/config.js`
- `src/schema.js`
- `src/menu.js`
- `src/colleges.js`
- `src/scorecard.js`
- `src/trackers.js`
- `src/formatting.js`
- `project-docs/backlog.md`
