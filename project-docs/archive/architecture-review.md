# Architecture & Refactoring Review - College Tools Apps Script

**Date:** 2026-07-05
**Scope:** Internal design and refactoring plan for the Apps Script project in `src/`, which builds and maintains the College Tools Google Sheets workbook.
**Evaluated against:** `project-docs/gas-complete-guide.md` principles: batch I/O, read-once/write-once sheet access, layered architecture, centralized configuration and error handling, and testable seams. Recommendations are adapted for a distributed consumer spreadsheet template, where user data preservation is more important than architectural purity.

## Executive Summary

The project already has a strong foundation for a Google Apps Script codebase: a single `CollegeTools` namespace, module-level IIFEs, centralized `Config`, explicit menu adapters, clasp tooling, ESLint, and a useful local Node regression harness. The main risk is not lack of structure. The main risk is that sheet schema, row ownership, formula generation, and setup/repair behavior are still spread across modules in ways that make refactoring easy to break silently.

The refactor should therefore start with guardrails, not rewrites. Before changing behavior, add characterization coverage for the current workbook contract: existing copied spreadsheets, row-2 vs row-1 headers, preserved user columns, tracker data, named ranges, formulas, and repair idempotence. Once those invariants are locked down, the safest path is: schema registry, stable row identity, formula builders, batch write plans, service/menu separation, and then setup orchestration.

## Status Update — 2026-07-06

Progress against the original findings, so this document reflects reality:

| # | Finding | Status |
|---|---------|--------|
| 1 | Migration guardrails / characterization tests | **Largely complete.** Harness now includes schema-metadata, workbook-repair, formulas, template-integrity, validation-coverage, formatting-schema-integration, dashboard-decision, and tracker repair-path regression tests. Write-plan and setup-plan coverage remain open. |
| 2 | Canonical `CollegeTools.Schema` | **Partially complete.** `src/schema.js` exists with `headerRow`, `dataStartRow`, column keys, ownership groups, `validateHeaderRow`, and `validateWorkbookShape`. Dashboard, Admissions, Formatting, and the Colleges fill/region column map resolve through it. `scoring.js` still calls `Utils.colIndex2`; some tracker internals still use row-1 header helpers. |
| 3 | Stable college identity for tracker sync | **Partially complete.** `repairCollegeSync` now snapshots tracker rows by college name, preserves rows after reorder, reports duplicate-name warnings, and batches repair-time linked updates. Stable key columns are not implemented; live sync remains positional. |
| 4 | Formula builders | **Partially complete.** `src/formulas.js` exists (`sheetRef`, `netPriceAfterAid`, `outOfPocketCost`, `fourYearProjectedCost`, `admissionFit`) with Node tests. Weighted Score, Visit Score, timeline/status/aid-completion, financial safety, and dashboard stat formulas are still built inline. Value Score was removed entirely (R2), closing its normalization concern. |
| 5 | Batch write plans | **Partially complete.** Tracker repair now batches formula snapshots and linked tracker updates, and `fillCollegeRowCore` now reads/builds/writes a Colleges row in one pass. Live tracker sync and some smaller helpers still write per cell. |
| 6 | Menu boundary / structured results | **Open.** Services still alert directly and thread `suppressAlert`. |
| 7 | Declarative setup orchestration | **Open.** |
| 8 | Centralized diagnostics | **Open.** Repair now returns stable `warnings` arrays, including the missing-Colleges path; broader diagnostics remain open. |
| 9 | Scoped locks | **Open.** Note: the API quota subsystem was removed (R5), so the script-properties race now only covers the cache-key registry. |
| 10 | API key storage | **Open.** Key still lives in `ScorecardAPIKey!A1`. |
| 11 | Dashboard/instructions as renderers | **Partially complete.** `instructions.js` now renders from declarative section data; `dashboard.js` gained `writeDashboardTable_`, data-built tables for the deadline/decision sections, and computed section rows for those tables. Shared conditional-format text-rule helpers now live in `Formatting`. The Key Statistics area is still an imperative cell script. |
| 12 | Harness coverage of seams | **Largely complete** for Schema and Formulas; repair-path batching coverage was added; write-plan and setup-plan coverage still open. |

Completed since the previous status pass:

- Fixed dashboard magic row anchors for the deadline/decision/list-balance sections; tests now locate dashboard sections by label and assert relative structure.
- Fixed `repairCollegeSync` missing-Colleges return so `warnings` is always an array.
- Replaced repair snapshot per-cell `getFormula()` calls with one batched `getFormulas()` read per tracker sheet.
- Changed repair-time linked tracker updates to resolve tracker columns once and flush queued linked values with batched `setValues()` calls.
- Deduplicated tracker dropdown/date validation specs so setup and repair apply the same options.
- Consolidated Colleges fill/region column lookup into one schema-backed column map.
- Converted `fillCollegeRowCore` from cell-by-cell writes to a read-once/write-once row update that preserves formulas and user-owned columns.
- Moved duplicated Financial/Admissions text conditional-format helpers into `CollegeTools.Formatting`.

## Refactoring Principles

1. Preserve user data first. Existing copied spreadsheets may contain user ratings, tracker details, notes, formatting, and customized weights. A refactor that is cleaner but destroys data is a regression.
2. Make sheet shape explicit. Header row, data start row, owned columns, user-owned columns, and linked columns should be declared once and reused everywhere.
3. Prefer testable pure seams before broad rewrites. Extract formula builders, schema lookups, row-diff builders, and setup plans into code that the Node harness can exercise without Apps Script UI.
4. Use bounded ranges. Avoid applying formulas or validations to unbounded columns when the workbook intentionally trims rows for performance.
5. Keep the menu layer as the UI boundary. Service modules should return structured results; global menu adapters should own prompts, alerts, and top-level error presentation.
6. Keep Apps Script constraints visible. The flat global runtime and copied-template deployment model are real constraints; avoid DI containers, class hierarchies, or extra OAuth scopes unless they buy concrete reliability.

## Refactor Readiness Gates

Before starting the structural refactor, add or confirm tests for these invariants:

- `Colleges` headers remain on row 2 and data starts on row 3.
- Tracker/helper sheets use row 1 headers and data starts on row 2.
- Filling a college row preserves user-owned rating columns, formula columns, and user-entered notes.
- Re-filling a row replaces stale API-owned fields and prior auto-stamp notes.
- `repairEntireWorkbook` is idempotent and does not delete tracker user columns.
- Tracker rows keep user-entered tracker data when the `Colleges` sheet is sorted or repaired.
- Formula builders generate valid formulas for sheet names with spaces and for missing optional columns.
- Named ranges required by financial/admissions formulas are created and survive reruns.
- Existing copied spreadsheets can migrate from sheet-stored API key behavior to any new storage path.

These gates should live in the existing Node harness where possible. Manual spreadsheet testing is still required for UI prompts, real formulas, protections, and Apps Script services.

---

## Findings And Recommendations (Ordered By Severity And Refactor Value)

### 1. Add migration guardrails before changing architecture

**Current risk:** The existing review jumps directly into schema and batching. Those changes are important, but they touch the highest-blast-radius surfaces in the workbook: headers, row writes, tracker synchronization, formulas, setup, and repair. The local tests are useful, but they still do not fully characterize user-data preservation or copied-template migration behavior.

**Evidence in code:** Existing tests cover menu wiring, config schema, validation coverage, repair flow, and some tracker/fill regressions. The code also has several preservation-sensitive paths, including `Colleges` preserved headers, tracker linked-column clearing, custom weight preservation, and named ranges.

**Recommendation:** Create a short compatibility layer of tests and fixtures before the first structural change:

- Add fixture builders for a representative copied workbook: `Colleges`, `Financial Aid Tracker`, `Campus Visit Tracker`, `Application Timeline`, `Application Status Tracker`, `Scholarship Tracker`, `Weights`, and `Personal Profile`.
- Assert which columns are API-owned, formula-owned, linked-owned, and user-owned.
- Add tests that sort or reorder `Colleges` data and prove tracker user data remains attached to the right college after repair.
- Add tests that verify formulas are rebuilt without clobbering user-entered fields.
- Add tests for migration fallback paths, especially API key lookup and tracker identity.

**Acceptance gate:** No schema, formula, setup, or tracker refactor starts until the harness can fail on at least one intentionally broken preservation invariant.

### 2. Sheet schema is duplicated across modules with two competing header conventions

**Current risk:** Header strings and row conventions are spread across `colleges.js`, `scoring.js`, `admissions.js`, `financial.js`, `trackers.js`, `formatting.js`, `dashboard.js`, and `utils.js`. `Colleges` uses headers on row 2, while tracker/helper sheets use row 1. Callers must remember which lookup helper to use.

**Evidence in code:** The project has `Config.HEADERS`, `Utils.colIndex`, `Utils.colIndex2`, `Formatting.findColumn_`, `Colleges.requireCol_`, and `Dashboard.colRange_`. This is the main structural footgun because using the wrong lookup can silently target the wrong column.

**Recommendation:** Introduce `CollegeTools.Schema` as the canonical sheet model:

- Each sheet declares `sheetName`, `headerRow`, `dataStartRow`, `headers`, `ownedColumns`, `userColumns`, `formulaColumns`, and `linkedColumns`.
- Column lookup goes through schema helpers such as `Schema.col(sheetKey, columnKey, sheet)` and `Schema.headerMap(sheetKey, sheet)`.
- `Config.HEADERS` remains the source for header text, but callers use symbolic keys instead of raw header strings.
- Missing required columns should fail loudly with context: sheet name, header row, expected key, and expected label.
- Optional columns should be explicitly marked optional instead of checked ad hoc with `indexOf`.

**Migration note:** Add `Schema.validateWorkbookShape()` first. Run it from setup/repair and from tests before replacing existing helpers. Keep `Utils.colIndex` and `Utils.colIndex2` temporarily as adapters so the migration can be incremental.

**Acceptance gate:** New code no longer calls `Utils.colIndex2` or hand-rolls row-2 header reads. Existing call sites are migrated module by module with tests.

### 3. Tracker sync is positional and can detach user data from the intended college

**Current risk:** Tracker rows are derived from `Colleges` row number. Sorting or inserting rows in `Colleges` can make tracker data appear beside the wrong college. The current review recommends matching by `College Name`, but name-only matching is not strong enough for a safe refactor.

**Evidence in code:** `getTrackerRowForCollegeRow_()` maps a source row to tracker row by `sourceRow - 1`; `syncCollegeRowToSheet_()` writes linked values into that derived row; `repairCollegeSync()` loops through `Colleges` order and rewrites tracker names.

**Recommendation:** Introduce stable college identity before changing sync semantics:

- Add a hidden or protected stable key column to `Colleges`, preferably College Scorecard `id` when available.
- Add a matching hidden/protected key column to trackers that mirror colleges.
- Treat `College Name` as display text, not identity.
- During migration, populate keys from existing Scorecard data when possible. For rows without an API match, generate a local stable key such as `manual:<normalized-name>:<timestamp-or-row-seed>` and keep it stable once assigned.
- Use name matching only as a fallback to attach existing tracker rows during the first migration. If duplicate names exist, do not guess; surface a repair result requiring manual resolution.
- Preserve all user-owned tracker columns while updating only linked columns such as display name and copied cost fields.

**Acceptance gate:** A test can sort `Colleges`, run repair, and prove tracker user-entered fields still belong to the same stable key.

### 4. Formula generation is duplicated and only partly testable

**Current risk:** Formula strings are generated inside modules using per-row concatenation. Several columns are already batch-written with `setFormulas`, but formula logic is still scattered and hard to unit test. Some tracker formulas are only written into row 2, and Value Score normalization bakes runtime constants into generated formulas.

**Evidence in code:** `scoring.js`, `admissions.js`, `financial.js`, `trackers.js`, and `dashboard.js` all build formula strings directly. `normalizeValueScores()` reads current values and embeds min/max constants. Campus Visit score still loops with per-row `setFormula`.

**Recommendation:** Extract formula builders before changing formula application:

- Create `CollegeTools.Formulas` with pure builder functions for weighted score, value score, admission chance, academic index, merit aid, financial safety, aid completion, document completion, dashboard metrics, and visit score.
- Builders should accept schema-derived refs and return formula text. Tests should assert formula text for representative sheet names, row numbers, optional columns, and named ranges.
- Use bounded application ranges from schema, not full columns. Respect trimmed workbook sizes and configured data limits.
- Prefer R1C1 or relative formulas where it reduces duplication, but do not blindly apply one formula over whole future columns. Make formula-owned columns explicit so user-entered tracker fields are not overwritten.
- Revisit Value Score normalization separately. Options include a dynamic formula using `MIN/FILTER` and `MAX/FILTER`, or a deliberate repair-time normalization step that is clearly labeled as snapshot-based.

**Acceptance gate:** The Node harness catches a broken dashboard formula, a broken 4-year projected cost formula, and a broken sheet-name quoting case without running Apps Script.

### 5. Per-cell I/O remains in high-traffic paths

**Current risk:** Some paths have already moved toward batching, but high-traffic and setup paths still perform many individual reads/writes. This affects execution time, increases partial-write risk, and makes batch fill behavior harder to reason about.

**Evidence in code:** `fillCollegeRowCore()` clears ranges but then writes API values with individual `setValue` calls. `syncCollegeRowToSheet_()` writes linked tracker values cell by cell. `fillRegionsAllRows()` reads a matrix but writes updates one cell at a time. `createOrUpdateDashboard()` and `instructions.js` still build many cells sequentially.

**Recommendation:** Move from direct writes to write plans:

- For a single `Colleges` row, read the whole row once, build a row array in memory, preserve user/formula columns using schema ownership metadata, and write one row back.
- For selected rows, group row reads and writes where practical, while still respecting API calls and quota delays.
- For tracker repair, build per-sheet matrices keyed by stable college identity and write linked columns in batches.
- For dashboard and instructions, build value matrices first, then apply formatting in grouped passes.
- Keep formatting operations separate from value writes; they are slower and do not need to be mixed into every data mutation.

**Acceptance gate:** Tests can inspect generated write plans before applying them. Manual testing confirms no partial row corruption after an injected failure.

### 6. UI behavior is welded into service modules

**Current risk:** Several service modules show alerts directly or accept `suppressAlert` flags. This makes orchestration brittle: every new setup/repair path must remember which nested calls will alert. It also blocks clean trigger or test execution.

**Evidence in code:** `Scorecard.getApiKey()` and `showApiKeySetupInstructions()` alert from inside the API client. `ensureScoring`, `fillRegionsAllRows`, `repairCollegeSync`, and formatting repair methods accept `suppressAlert`. Setup functions catch errors and alert directly.

**Recommendation:** Establish a menu boundary:

- Service functions return structured results: `{ ok, status, message, warnings, counts, error }`.
- Menu adapters in `menu.js` own prompts, alerts, confirmation dialogs, and final summaries.
- Add a `CollegeTools.MenuActions.wrapAction(name, options, fn)` helper to centralize try/catch, logging, locks, and user alerts.
- Keep progress toasts only at orchestration boundaries.
- Provide UI-specific wrappers for workflows that need prompts, such as API key setup.

**Acceptance gate:** Core modules can run in tests without mocking `SpreadsheetApp.getUi()` except at the adapter boundary.

### 7. Setup and repair are overlapping multi-pass pipelines

**Current risk:** Setup order is implicit and repeated. Multiple functions reapply related validations, formatting, formulas, dashboard refreshes, and admissions/financial setup. This makes it easy for a new feature to work after one menu path but not another.

**Evidence in code:** `completeSetup()` calls instructions, trackers, dashboard, formatting, scoring, financial setup, and trimming. Trackers also apply some financial/admission formatting. Repair calls a different subset and depends on nested `suppressAlert` behavior.

**Recommendation:** Replace overlapping setup flows with a declarative setup plan:

- Define steps with IDs, dependencies, ownership, and modes: `initialSetup`, `repair`, `formatOnly`, `formulasOnly`, and `performance`.
- Pass a shared context containing spreadsheet, schema maps, sheet handles, current workbook shape, and collected warnings.
- Ensure each feature registers setup work in exactly one place.
- Make `completeSetup` and `repairEntireWorkbook` different step selections over the same registry.
- Report a summary of actions and warnings at the end instead of alerting during nested steps.

**Acceptance gate:** A test verifies the setup step order and proves `completeSetup` and `repairEntireWorkbook` include the expected step subsets.

### 8. Error handling is not centralized or user-diagnosable

**Current risk:** Errors are caught ad hoc. Some expected service failures are swallowed silently, while user-facing workflows only show the final error string. For a distributed template, console logs alone are not enough because users cannot reliably inspect Apps Script execution logs.

**Evidence in code:** Scorecard cache/quota code swallows failures. Conditional formatting rule inspection swallows criteria read failures. Setup and repair catch broad errors and alert a string.

**Recommendation:** Add lightweight diagnostics without cluttering the workbook:

- Create `CollegeTools.Diagnostics` with `info`, `warn`, `error`, and `captureResult` helpers.
- Always log to `console` with workflow, module, operation, sheet, row/column when relevant, and sanitized error details.
- Keep an in-memory diagnostics buffer during each menu action and show a concise final summary to the user.
- Add an optional hidden `_CollegeToolsDiagnostics` sheet only when a workflow fails or when a developer/debug menu action enables diagnostics. Do not create a visible permanent error-log tab during normal setup.
- Use typed error/result codes for expected failures such as missing API key, no API match, quota limit, malformed workbook, duplicate tracker keys, and missing named ranges.

**Acceptance gate:** A failed repair produces a structured result and enough diagnostic context to tell which sheet/step failed.

### 9. Mutating operations need scoped locks

**Current risk:** A user can double-click a menu item or run overlapping workflows. Shared script properties for quota/cache registry also use read-modify-write without locking.

**Evidence in code:** Scorecard quota persistence uses `PropertiesService.getScriptProperties()` and then writes an updated JSON blob. Setup/repair/fill workflows mutate multiple sheets without a lock.

**Recommendation:** Use scoped locks, not one blanket script lock for everything:

- Use `LockService.getDocumentLock()` around workbook-mutating menu actions such as setup, repair, fill selected rows, tracker sync, and formatting repair.
- Use a narrower `ScriptLock` or shared helper around script-property updates for quota/cache registry if those remain in script properties.
- Time out with a friendly message if another College Tools action is already running.
- Keep locks in the menu wrapper so service functions remain testable.

**Acceptance gate:** A testable wrapper path handles lock acquisition failure as a structured user-facing result. Manual spreadsheet testing confirms double-clicking a menu action does not interleave writes.

### 10. API key storage is visible and coupled to a sheet

**Current risk:** The API key is stored in `ScorecardAPIKey!A1`. Anyone with access to the workbook can see it. It is a free API key, so this is lower severity than tracker or schema risk, but it is still worth improving.

**Evidence in code:** `Scorecard.getApiKey()` reads `ScorecardAPIKey` directly and shows setup alerts from inside the API client.

**Recommendation:** Move toward user properties with a migration fallback:

- Add `Scorecard.getApiKeyStatus()` returning whether the key exists in user properties, legacy sheet, placeholder, or nowhere.
- Add a menu-driven setup action that prompts for the key and stores it in `PropertiesService.getUserProperties()`.
- Keep the legacy sheet read path as a migration fallback, but alert users that sheet-stored keys are visible to collaborators.
- Provide a one-click migration from the sheet tab to user properties, then optionally hide or clear the legacy sheet only with explicit user confirmation.

**Acceptance gate:** Existing spreadsheets with `ScorecardAPIKey!A1` continue to work after the refactor, and new spreadsheets can be configured without creating a visible key sheet.

### 11. Dashboard and instructions are generated as imperative cell scripts

**Current risk:** Dashboard and Instructions are rebuilt through many sequential cell operations. That makes them slow, hard to diff in tests, and easy to partially update.

**Evidence in code:** `dashboard.js` writes each label/formula/format as control flow. `instructions.js` renders one merged line at a time.

**Recommendation:** Treat both as renderers:

- Define dashboard sections as data objects with labels, formulas, formats, and visibility conditions.
- Define instruction sections as data objects with text, style tokens, and merge behavior.
- Render values in matrices first; then apply merged ranges and formatting in grouped passes.
- Keep formula builders shared with `CollegeTools.Formulas` so dashboard formula tests cover production formulas.

**Acceptance gate:** Tests can snapshot the dashboard/instructions render model without needing a live spreadsheet.

### 12. Test harness needs deeper coverage of architecture seams

**Current risk:** The current Node harness is useful but strongest around presence/wiring/config. The highest-risk behaviors are formulas, write plans, migration behavior, and setup sequencing.

**Recommendation:** Expand the harness around newly extracted pure modules:

- `Schema` tests: header rows, data starts, optional/required columns, ownership metadata.
- `Formulas` tests: formula text for all formula-owned columns and dashboard metrics.
- `WritePlans` tests: fill-row preservation, tracker linked updates, region fill, dashboard render matrices.
- `SetupPlan` tests: step ordering and workflow subsets.
- `Diagnostics` tests: structured error/result codes.

**Acceptance gate:** Every refactor phase adds tests before behavior changes and keeps the existing regression suite green.

---

## Patterns Deliberately Not Adopted

- **DI containers and class-heavy service layers:** The flat Apps Script runtime and existing IIFE namespace are a good fit. Add focused modules, not a framework.
- **Advanced Sheets API by default:** `Sheets.Spreadsheets.batchUpdate` adds OAuth scope and complexity. Use standard `SpreadsheetApp` batching first. Revisit Advanced Sheets API only for operations that cannot be made efficient otherwise.
- **Always-visible error/performance log sheets:** They add product clutter. Prefer console logs plus an optional hidden diagnostics sheet created only on failure or explicit debug action.
- **Unbounded full-column formulas:** They fight the workbook's row trimming and can overwrite user-editable areas. Use schema-defined bounded ranges.
- **Name-only identity:** College names are display labels, not durable keys.

## Suggested Sequencing

### Phase 0: Stabilize And Characterize

1. Add compatibility fixtures and tests for current workbook behavior.
2. Add explicit ownership expectations for API-owned, user-owned, formula-owned, and linked columns.
3. Add tests for sorted `Colleges` tracker preservation and duplicate-name handling.
4. Add formula text tests for existing formulas before moving formula code.
5. Add branch/deployment notes so refactor work happens on `development` and verifies from the branch that will ship.

### Phase 1: Schema And Workbook Shape

1. Add `CollegeTools.Schema` with sheet metadata and column keys.
2. Add workbook shape validation and tests.
3. Migrate low-risk modules first: formatting, dashboard range lookup, and tests.
4. Migrate high-risk modules after coverage: colleges fill, trackers, scoring, admissions, financial.
5. Deprecate direct `Utils.colIndex2` usage once all row-2 callers are schema-backed.

### Phase 2: Stable Identity And Tracker Sync

1. Add hidden/protected stable key columns and migration code.
2. Backfill keys for current rows using Scorecard `id` when available.
3. Build keyed tracker sync that updates linked columns but preserves user tracker fields.
4. Add duplicate-name/manual-key conflict reporting.
5. Replace positional sync and repair with keyed sync.

### Phase 3: Formula Builders And Bounded Formula Application

1. Extract formula builders into `CollegeTools.Formulas`.
2. Add Node tests for each builder.
3. Replace in-module string concatenation with builder calls.
4. Apply formulas to schema-defined bounded ranges.
5. Revisit Value Score normalization and document whether it is dynamic or repair-time snapshot based.

### Phase 4: Write Plans And Batch I/O

1. Add pure write-plan builders for fill row, region fill, tracker sync, dashboard render, and instructions render.
2. Test write plans without Apps Script services.
3. Replace per-cell writes with row/range writes where ownership rules allow.
4. Keep formatting grouped separately from value/formula writes.
5. Manually test fill current row, fill selected rows, repair, setup, and dashboard refresh in a copied spreadsheet.

### Phase 5: Menu Boundary, Diagnostics, And Locks

1. Add menu action wrapper for confirmation, document lock, structured error handling, diagnostics, and final alerts.
2. Convert service modules to structured results and remove `suppressAlert` plumbing gradually.
3. Add diagnostics helpers and optional hidden diagnostics output on failure/debug.
4. Add API key status/migration workflow.
5. Keep old entry points as adapters until menu tests prove all functions are wired.

### Phase 6: Setup Orchestration

1. Add declarative setup step registry.
2. Migrate `completeSetup`, `repairEntireWorkbook`, formatting repair, scoring repair, and dashboard refresh onto the registry.
3. Add tests for step order and workflow subsets.
4. Remove redundant setup work after tests prove parity.
5. Update user-facing instructions once behavior stabilizes.

## Verification Matrix For Each Phase

Run these checks before merging each phase:

- `npm run lint`
- `npm test`
- Any new focused Node test for the phase
- Manual spreadsheet smoke test for affected menu items
- For setup/repair changes: run on a copied workbook with existing user data and confirm no owned/user-column regressions
- For formula changes: inspect formulas in Google Sheets, not only generated strings
- For tracker changes: sort `Colleges`, repair, and confirm tracker user data stays attached to the intended stable key
- For API key changes: verify both legacy sheet key and new user-property key paths

## Recommended First Implementation Batch

The first batch should be intentionally small:

1. Add tests that capture current preservation behavior for fill row, tracker repair, formula text, and setup step expectations.
2. Add `CollegeTools.Schema` with metadata only; do not migrate production code yet.
3. Add schema tests proving row conventions and ownership metadata.
4. Wire one low-risk caller, such as formatting column lookup, through schema.
5. Run the full verification matrix and inspect the diff for accidental behavior changes.

This creates a safe runway for the larger refactor without forcing multiple high-risk behavior changes into the first patch.

---

## Apps Script Best-Practices, Readability, DRY/KISS Review — 2026-07-05

**Scope:** Full `src/` pass evaluated against Google's published Apps Script best practices (developers.google.com/apps-script/guides/support/best-practices — chiefly "use batch operations": read once into arrays, compute in memory, write once; minimize service calls; use Cache Service) plus DRY and KISS. Overlaps with the original findings are noted rather than repeated. Feature work in progress on `development` (deadline/decision dashboard views) was treated as in-flight, not a defect.

### Findings (ordered by priority)

1. **Complete: `repairCollegeSync` returns `warnings` before it is initialized.** The missing-Colleges-sheet early return now initializes and returns `warnings: []`, with a harness test for the missing-sheet path.

2. **Complete: per-cell `getFormula()` loop in tracker snapshots.** `snapshotRowsByCollegeName_` now reads formulas with one `getFormulas()` range call per tracker sheet. A harness test asserts repair preserves formulas without per-cell formula reads.

3. **Complete: `fillCollegeRowCore` read and wrote cell-by-cell.** `fillCollegeRowCore` now reads the row values/formulas once, builds the refreshed row in memory, preserves user/formula columns, and writes the Colleges row with one `setValues()` call.

4. **Complete: Colleges column knowledge was defined multiple times.** `buildCollegesColumnMap_` now resolves labels through `Schema.header('COLLEGES', key)` and is shared by single-row fill, selected-row fill, and region fill.

5. **Complete: validation/dropdown rules were duplicated between `trackers.js` and `formatting.js`.** Shared tracker validation specs now live in `Formatting.applyStandardValidations`, and both tracker setup and formatting repair use the same dropdown/date definitions.

6. **Complete for repair: repair loop re-resolves tracker columns for every college row.** `repairCollegeSync` no longer calls `syncCollegeToTrackers` inside the repair loop. It resolves each repair tracker target once, queues linked values, and writes contiguous row runs with `setValues()`. Live row-fill sync remains positional and per-cell until the stable-identity/fill-row batching work.

7. **Partly complete: dashboard layout relied on magic absolute rows and could self-collide.** The deadline/offer/decision/list-balance sections now use a flowing row cursor and table-returned next rows, and formatting ranges follow actual row counts. Remaining dashboard renderer work: the Key Statistics area is still imperative, and the repeated `CollegeTools.Formulas.sheetRef(cn.X) + '!' + safeRange_(rY)` concatenation still needs a local `ref_(sheetName, range)` helper or render model.

8. **Complete for Financial/Admissions: `pushTextRule_`/`removeTextRules_` were copy-pasted between modules.** Shared text-rule helpers now live in `CollegeTools.Formatting`, and Financial/Admissions use them. `enhanceApplicationTimelineFormatting` still has range-based rule ownership logic because it removes numeric deadline rules by target range rather than text marker.

9. **Two independent execution-time guards (KISS).** `Scorecard.executionState` (`src/scorecard.js:21–38`) and the `startTime`/`elapsed` check in `fillSelectedRows` (`src/colleges.js:640–655`) measure the same 5-minute budget with separate clocks that can disagree (Scorecard's timer starts on first fetch and is only reset by `searchColleges`). Keep one guard — a small shared `ExecutionBudget` started explicitly at the top of each menu action — and have both the batch loop and the API client consult it.

10. **ES5 idiom throughout, despite the V8 runtime.** Every module uses `var`, string concatenation, and `function` expressions; `appsscript.json` runs V8 and Google recommends modern JavaScript on it. `const`/`let`, template literals (a major win for the formula-building code), `Object.assign` instead of `JSON.parse(JSON.stringify(...))` cloning (`src/scorecard.js:347–361`, `420`, `437`), and arrow callbacks would materially improve readability. Do this incrementally, one module per PR alongside other work — never as a big-bang rewrite — with ESLint `no-var`/`prefer-const` ratcheted per file.

11. **Minor placement and consistency items (batch these into adjacent work, not standalone PRs):**
    - `showVersion` and `debugFillCollegeRow` live in `CollegeTools.Colleges` but are about-dialog and developer tooling, not college data (`src/colleges.js:117–232`).
    - `scoring.js:92` builds `Weights!A:B` by raw concatenation instead of `Formulas.sheetRef` — safe only while the sheet name has no spaces or quotes.
    - `scoring.js` is the last `Utils.colIndex2` caller; migrating it to `Schema.columnIndex` lets colIndex2 be deprecated (original finding 2's acceptance gate).
    - The Campus Visit score loop still applies formulas with per-row `setFormula` (`src/scoring.js:126–132`); build the array and use one `setFormulas` like the Weighted Score block directly above it already does.
    - `Utils.getPath`/`getField` exist to defensively handle nested API responses, but `colleges.js` is strictly flat per CLAUDE.md — only `lookup.js` uses them. Either standardize the lookup on flat keys or note why the defensive form remains.

### Recommended PR Sequence (updated 2026-07-06)

The originally recommended PRs 1-4 are complete in the current worktree and should ship together as one architecture-refactor PR after review/manual spreadsheet smoke testing. Remaining work should move to the deferred architecture items below rather than expanding this PR further.

**PR 1 — Repair-path fixes: findings 1 + 2 + 6 (`src/trackers.js`) — complete**
- `repairCollegeSync` initializes and returns `warnings` consistently, including the missing-Colleges path.
- `snapshotRowsByCollegeName_` reads tracker formulas with one `getFormulas()` range call per sheet.
- `repairCollegeSync` queues linked tracker values after row restore and flushes them with batched `setValues()` runs.
- Tests: regression coverage now asserts the missing-Colleges result, batched formula snapshotting, and batched linked tracker updates.
- Manual check still required before merge: run Repair College Sync and Repair Entire Workbook on a copied sheet with tracker user data; confirm rows stay attached and repair is visibly faster.

**PR 2 — Validation spec dedup: finding 5 (`src/trackers.js`, `src/formatting.js`) — complete**
- Shared validation specs live in `Formatting.applyStandardValidations`.
- Tracker setup and formatting repair now apply identical audited dropdown options.

**PR 3 — Single Colleges column map: finding 4 (`src/colleges.js`) — complete**
- `buildCollegesColumnMap_` is shared by fill and region paths and resolves labels through `Schema.header`.

**PR 4 — Fill-row batching: finding 3 (`src/colleges.js`) — complete**
- `fillCollegeRowCore` now performs a batched row update while preserving user-owned and formula-owned cells.
- Manual check still required before merge: in a copied sheet, re-fill a row that has user ratings, user-entered Notes, and formula columns; verify all survive. Also verify the no-API-match path still stamps Notes correctly and a batch fill of several rows behaves.

**Riding along:** finding 8's Financial/Admissions helper duplication is complete.

**Deferred, with conditions:**
- **Finding 7 (dashboard renderer cleanup):** the fixed-row collision is complete. Defer the remaining render-model cleanup until dashboard stats/formulas are touched again.
- **Finding 9 (duplicate execution-time guards):** fold into the menu-boundary work (original finding 6), which restructures the same entry points.
- **Finding 10 (ES5 → modern JS):** never a standalone project. Rule: any module touched for PRs 1–4 may be modernized in the same PR if the diff stays reviewable; ratchet ESLint `no-var`/`prefer-const` per file.
- **Finding 11 (minor placement/consistency):** batch into adjacent work. Exception worth prioritizing: migrate `scoring.js` off `Utils.colIndex2` to `Schema.columnIndex` next time scoring is touched — it is the last caller and closes the original finding 2 acceptance gate.

### What is already in good shape

Worth stating so it is preserved: consistent IIFE-namespace modules with JSDoc on nearly every function, `Cache Service` used for search responses exactly as Google recommends, exponential backoff with `muteHttpExceptions`, bounded batch loops with configured delays and an execution-time stop, conditional-format rule ownership on rerun, user-weight preservation in `ensureScoring`, and several paths (Weighted Score, Admission Fit, financial safety) already using batched `setFormulas`. The new dashboard deadline/decision builders are pure data-in/rows-out functions with Node tests — the right pattern for everything else on this list.
