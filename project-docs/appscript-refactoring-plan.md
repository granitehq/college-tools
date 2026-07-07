# Apps Script Refactoring Plan

**Status:** Draft plan
**Scope:** Refactor the Google Apps Script code structure without changing workbook behavior.
**Primary goal:** Make setup, repair, fill, and update flows easier to test and safer to run in live spreadsheets.

## Principles

- Preserve the current user-facing workbook model unless a task explicitly says otherwise.
- Keep `Colleges` headers on row 2 and tracker/helper headers on row 1.
- Keep row-fill access to Scorecard responses as flattened keys.
- Keep direct menu adapters in `src/menu.js` so Google Sheets can discover handlers.
- Prefer narrow, behavior-tested changes over broad rewrites.
- Do not delete live-sheet data or columns as part of refactoring.
- Treat manual copied-sheet smoke testing as required for setup, repair, formatting, and deployment changes.

## Current Pain Points

1. Menu adapters, UI prompts, service logic, and final alerts are mixed across modules.
2. Setup and repair flows are imperative sequences spread across `setup.js`, `trackers.js`, `formatting.js`, `dashboard.js`, `scoring.js`, `financial.js`, and `colleges.js`.
3. Execution time checks exist in more than one place and can disagree.
4. API key lookup still depends on a visible sheet and UI alerts inside the Scorecard client.
5. Tracker sync is still positional; stable hidden college identity remains deferred.
6. Formula strings are still partly inline instead of centralized in `formulas.js`.
7. Some module ownership is blurry, especially debug/about flows and setup side effects.

## Non-Goals

- No visual redesign of the spreadsheet.
- No migration away from Google Apps Script V8.
- No live Maps, geocoding, or external API expansion in this plan.
- No destructive migration of existing workbook data.
- No broad modern-JavaScript rewrite across every file in one change.
- No direct commit to `main`; use the development-to-main release flow.

## Target Architecture

The target shape keeps the current `CollegeTools.ModuleName` namespace pattern but clarifies boundaries.

- `src/menu.js`: only global adapters, menu construction, user confirmation, and final alerts.
- Service modules: return structured results and avoid prompts where practical.
- `src/setup.js`: coordinates setup/repair through a declarative step registry.
- `src/scorecard.js`: API client with no UI alerts except through callers.
- `src/formulas.js`: shared formula builders and sheet reference helpers.
- `src/schema.js`: source of truth for sheet names, row conventions, headers, and ownership groups.
- Tracker modules: preserve user data and formulas, and avoid row-position assumptions where a stable key exists.

## Phase 1: Service And Menu Boundary Cleanup

### Objective

Move prompts and final alerts toward menu adapters while keeping service functions callable from tests and other workflows.

### Tasks

1. Add a result object convention for service flows.
   - Shape: `{ok: boolean, code: string, message: string, warnings: Array, details: Object}`.
   - Keep existing simple return values where they are already heavily tested, but normalize new service work to the result shape.

2. Update high-risk service functions to accept `suppressAlert` or no-UI options consistently.
   - `CollegeTools.Setup.repairEntireWorkbook`
   - `CollegeTools.Trackers.setupAllTrackers`
   - `CollegeTools.Formatting.repairValidationsAndFormatting`
   - `CollegeTools.Colleges.fillRegionsAllRows`
   - `CollegeTools.Travel.createOrUpdateTravelPlanner`

3. Move menu-only confirmation prompts into `src/menu.js` or thin menu-boundary functions.
   - Do not change menu labels unless tests are updated.
   - Keep global function names stable for Apps Script.

4. Add regression tests for no-UI service behavior.
   - Missing sheet returns structured failure instead of alert-only behavior.
   - Repair/setup functions can run with suppressed alerts.
   - Existing menu adapters still delegate into the namespace.

### Acceptance Criteria

- `npm run test:menu` passes.
- `npm run test:regression` passes.
- A copied spreadsheet can run Repair Entire Workbook without duplicate nested alerts.

## Phase 2: Declarative Setup And Repair Registry

### Objective

Replace hand-written setup sequencing with a tested registry of steps that can be reused by Complete Setup, Repair Entire Workbook, and focused repair commands.

### Tasks

1. Add a setup step descriptor format in `src/setup.js`.
   - Fields: `id`, `label`, `run`, `required`, `includeInCompleteSetup`, `includeInRepair`.
   - Each `run` returns a structured result.

2. Convert current Complete Setup steps into registry entries.
   - Instructions sheet
   - Tracker setup
   - Dashboard setup
   - Formatting and dropdowns
   - Scoring formulas
   - Financial profile setup
   - Travel Planner refresh
   - Row trimming
   - Optional registration

3. Convert current Repair Entire Workbook steps into registry entries.
   - Tracker sync
   - Validation and formatting repair
   - Region refresh
   - Travel Planner refresh
   - Scoring formula rebuild
   - Application timeline formatting
   - Dashboard refresh when present

4. Add tests that assert order and inclusion.
   - Complete Setup order is stable.
   - Repair order is stable.
   - A failing optional step reports warning but does not hide required failures.

### Acceptance Criteria

- Setup order is covered by unit tests.
- Repair order is covered by unit tests.
- Manual copied-sheet repair produces a clear summary of each step.

## Phase 3: Shared Execution Budget

### Objective

Use one execution budget object for batch fills and API calls so long-running workflows stop predictably before Apps Script limits.

### Tasks

1. Add `CollegeTools.ExecutionBudget` or a small helper inside an existing utility module.
   - `start(limitMs)` returns a budget object.
   - `budget.canContinue()` returns boolean.
   - `budget.elapsedMs()` returns elapsed time.

2. Start the budget at menu or workflow entry points.
   - Fill selected rows
   - Search colleges
   - Repair or setup flows if they perform large sheet operations

3. Pass the budget into Scorecard fetch/search helpers instead of maintaining a separate Scorecard timer.

4. Add tests for budget behavior.
   - First call allows work.
   - Expired budget returns a structured stop result.
   - Batch fill stops without corrupting rows.

### Acceptance Criteria

- Scorecard and batch fill consult the same budget in tests.
- Existing retry/backoff tests still pass.
- No live network tests are introduced.

## Phase 4: API Key Storage Cleanup

### Objective

Move toward safer API key storage while preserving existing `ScorecardAPIKey!A1` compatibility.

### Tasks

1. Add a non-destructive API key resolver.
   - Check user properties first.
   - Fall back to `ScorecardAPIKey!A1`.
   - Return structured status: configured, missing, placeholder, invalid.

2. Move UI setup instructions out of `scorecard.js` into menu/setup boundary code.

3. Add a migration helper.
   - Reads the legacy sheet value.
   - Writes user property only after explicit user action.
   - Does not delete the legacy sheet automatically.

4. Add tests for resolver precedence and placeholder handling.

### Acceptance Criteria

- Existing spreadsheets still work with `ScorecardAPIKey!A1`.
- New tests prove user properties override the sheet.
- Scorecard client can be called without directly alerting.

## Phase 5: Formula Builder Consolidation

### Objective

Move repeated inline formulas into `src/formulas.js` so formula changes can be tested without sheet setup side effects.

### Tasks

1. Add builders for Financial Aid tracker formulas.
   - EFC prefill
   - Travel Costs lookup
   - Aid Requirements Complete

2. Add builders for Application Timeline formulas.
   - Days Until Deadline
   - Completion Status if currently generated inline

3. Add builders for Status Tracker formulas.
   - Documents Complete

4. Replace inline formula construction in `trackers.js` and related modules with formula helpers.

5. Add tests for exact formula strings where formulas are user-visible and fragile.

### Acceptance Criteria

- `test/formulas-tests.js` covers new builders.
- `npm run test:regression` passes.
- Existing sheet formulas remain compatible with current headers.

## Phase 6: Tracker Identity Preparation

### Objective

Prepare for stable college identity without forcing a destructive migration.

### Tasks

1. Define a hidden identity column strategy in a separate migration plan.
   - Candidate key: Scorecard `id` when available.
   - Fallback key: generated local stable ID.

2. Add schema metadata for hidden identity columns but do not add columns to live sheets in this phase.

3. Add tests for key generation helpers.

4. Document migration behavior for copied sheets.

### Acceptance Criteria

- No live sheet gets a hidden identity column from this phase.
- The future migration plan is explicit about preservation and rollback.

## Phase 7: Incremental Modern JavaScript Cleanup

### Objective

Improve readability only when touching a module for functional work.

### Rules

- Do not run a repository-wide `var` to `const` rewrite.
- For each touched module, prefer `const` and `let` only if lint is configured for that file.
- Use template literals only when they materially improve formula or message readability.
- Keep Apps Script V8 compatibility and existing namespace pattern.

### Candidate Files

- `src/formulas.js`
- `src/dashboard.js`
- `src/scoring.js`
- `src/setup.js`
- `src/scorecard.js`

### Acceptance Criteria

- Cleanup is included only with adjacent tested behavior changes.
- No standalone style-only PR unless explicitly requested.

## Verification Plan

Run these commands for every implementation branch:

```bash
npm run check
git diff --check
```

Run focused tests based on touched modules:

```bash
npm run test:menu
npm run test:regression
npm run test:repair
npm run test:schema
node test/travel-tests.js
node test/formulas-tests.js
```

Manual copied-sheet checks are required for:

- Complete Setup
- Repair Entire Workbook
- Fill current row
- Fill selected rows
- Repair Validations and Dropdowns
- Refresh Dashboard Data
- Refresh Travel Planner
- Direct-push dry run when release changes touch registration or push scripts

## Recommended Order

1. Phase 1: service/menu boundary cleanup.
2. Phase 2: setup and repair registry.
3. Phase 3: shared execution budget.
4. Phase 5: formula builder consolidation.
5. Phase 4: API key storage cleanup.
6. Phase 6: stable identity preparation.
7. Phase 7: incremental JavaScript cleanup as adjacent work.

## Risks And Guardrails

- Setup and repair touch broad ranges; every change needs preservation tests.
- Apps Script UI behavior is synchronous; avoid nested prompts inside services.
- Existing copied sheets may have stale headers, dropdowns, or formulas; repair paths must be rerunnable.
- Direct-push registration is low-trust telemetry; do not expand data sent during refactoring.
- Main branch release requires verification from `main`, not just a feature branch.

## Done Definition

This plan is complete when:

- Service modules can run without UI prompts in tests.
- Setup and repair use a tested step registry.
- Batch fills and Scorecard requests share one execution budget.
- API key lookup is structured and backward compatible.
- Formula builders cover tracker formulas that are currently inline.
- Stable identity has a separate approved migration plan.
- All relevant Node tests pass and copied-sheet smoke testing is documented.
