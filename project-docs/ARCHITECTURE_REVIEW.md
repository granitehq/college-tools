# Architecture & Code Review — College Tools Apps Script

**Date:** 2026-07-05
**Scope:** Internal design and architecture of the Apps Script project (`src/`) that generates and maintains the college research spreadsheet.
**Evaluated against:** [gas-complete-guide.md](gas-complete-guide.md) principles (batch I/O, read-once/write-once, layered architecture, centralized config/error handling, testability), tempered with judgment about what pays off in a distributed spreadsheet template.

**Context:** A companion code-level review on the same date found 13 concrete bugs (dashboard `#ERROR!` formulas, 4-Year Projected Cost math, notes clobbering on re-fill, etc.), all fixed on the `development` branch. This document covers the *structural* findings — refactorings that make the codebase easier to maintain and more stable when introducing changes.

**What's already good:** The IIFE namespace layout (`CollegeTools.Module`), central `Config`, menu-adapter layer, and the clasp/ESLint/Node-test workflow are genuinely solid and ahead of most GAS projects. The findings below rank remaining structural risk, most severe first.

---

## Findings (ordered by severity)

### 1. Sheet schema is duplicated across seven modules with two competing header conventions

The #1 source of silent bugs in this codebase.

- **Where:** Header strings like `'Estimated Net Price'` appear as literals in `colleges.js`, `scoring.js`, `admissions.js`, `financial.js`, `trackers.js`, `formatting.js`, and `dashboard.js` — alongside `Config.HEADERS`. Column resolution is reimplemented four ways: `Utils.colIndex` (row 1), `Utils.colIndex2` (row 2), `Formatting.findColumn_(sh, h, headerRow)`, `Colleges.requireCol_`, and `Dashboard.colRange_` (from Config, not the live sheet).
- **Why it's severe:** Renaming or reordering one column requires touching ~6 files, and picking the wrong header-row convention (Colleges uses row 2; everything else row 1) fails *silently*. CLAUDE.md itself calls this the easiest way to introduce bugs. The convention lives in every caller's head instead of in code.
- **Refactoring:** Introduce a single `CollegeTools.Schema` module: each sheet declared once with its name, header row, data-start row, and column keys (e.g. `Schema.COLLEGES.col('NET_PRICE')`). All modules resolve columns through it; the row-1/row-2 distinction becomes an internal detail no caller can get wrong. `Config.HEADERS` becomes the single source of truth it was meant to be. **This is the highest-leverage change in the codebase — most findings below get easier after it.**

### 2. Per-cell I/O throughout, violating the guide's 70x batch rule

- **Where:** `fillCollegeRowCore` issues ~16 individual `setValue` calls plus several per-cell reads per row, so "Fill selected rows" on 20 colleges is ~400+ Spreadsheet API round-trips. Same pattern in `syncCollegeRowToSheet_` (per-cell writes × 4 trackers × every row during `repairCollegeSync`), `createOrUpdateDashboard` (~60 sequential `setValue`/`setFormula`/format calls), `instructions.js` (a `setValue` + `merge` per line, 100+ calls), and the Campus Visit score loop (`setFormula` per row).
- **Why it's severe:** This is the guide's Critical Rule #1, and it's also a *stability* problem: a mid-row failure leaves a half-written row, and long batch fills brush against the 6-minute execution limit that the code then works around with timers.
- **Refactoring:** Read the target row once (`getValues` on the full row), mutate in memory, write once with `setValues` — preserving the preserved-columns logic in memory instead of with `clearContent` runs. For trackers, build the full sync as a 2D array per sheet and write in one call. Dashboard and Instructions can assemble a values matrix and apply it in one `setValues` plus a handful of format passes.

### 3. Tracker sync is positional — sorting the Colleges sheet silently corrupts every tracker

- **Where:** `trackers.js` `getTrackerRowForCollegeRow_` (`tracker row = Colleges row − 1`) and everything built on it.
- **Why it's severe:** Users *will* sort their college list by weighted score — that's the point of the tool. The moment they do, tracker rows no longer correspond to the colleges listed beside them, and there's no error — FAFSA deadlines now belong to the wrong school. The most dangerous latent behavior in the design.
- **Refactoring:** Sync by key, not position: match on `College Name` in each tracker (they already have dropdown validation sourced from `Colleges!A3:A1000`), append missing colleges, update linked fields on the matched row. Alternatively, make tracker college-name columns formula-driven mirrors (`ARRAYFORMULA` over the Colleges names) and treat trackers as keyed lookups. Either way, row order stops being load-bearing.

### 4. Formulas are generated per-row as concatenated strings, freezing state into the sheet at build time

- **Where:** `scoring.js`, `admissions.js`, `financial.js` build near-identical formula text per row in loops; `normalizeValueScores` bakes min/max constants; `dashboard.js` freezes column letters; tracker formulas exist only in row 2 ("fill down yourself").
- **Why it matters:** Every one of these is a "works until the data changes" trap — new rows have no formulas until a setup function is rerun, Value Score normalization goes stale (the repair-time rebuild added in the bug-fix pass is a mitigation, not a cure), and formula logic is duplicated and untestable.
- **Refactoring:** Two parts:
  1. Use `setFormulaR1C1` once over the whole column range — the per-row loops collapse to a single call and every row within the range, present or future, gets the same relative formula.
  2. Extract formula *builders* into a pure module (`CollegeTools.Formulas`) that takes column refs and returns strings — these become unit-testable in the existing Node harness, which today can't see formula regressions at all. (The dashboard `#ERROR!` bug shipped precisely because nothing could catch it.)

### 5. UI is welded into the service layer — spreading `suppressAlert` flags are the symptom

- **Where:** `Scorecard.getApiKey()` shows alerts from inside an API client; `ensureScoring`, `fillRegionsAllRows`, `repairCollegeSync`, `enhanceFormatsDropdowns`, `repairValidationsAndFormatting` all grew `opts.suppressAlert` plumbing; `fillSelectedRows` alerts mid-loop.
- **Why it matters:** Every new orchestration path (`completeSetup`, `repairEntireWorkbook`) must thread suppress flags through or users get alert storms. Nothing can run from a time-driven trigger (no UI context = crash). Tests must mock UI everywhere.
- **Refactoring:** Modules return result objects (`{ok, count, error}`) and never touch `SpreadsheetApp.getUi()`. The menu-adapter layer in `menu.js` — which already exists and is the natural boundary — owns all alerts/prompts/toasts. The `suppressAlert` plumbing disappears rather than multiplying.

### 6. Setup is an overlapping multi-pass pipeline with redundant work and no shared context

- **Where:** `completeSetup` runs `setupAllTrackers` (which applies financial + admissions formatting), then `enhanceFormatsDropdowns` (reapplying validations trackers just applied), then `runFinancialSetup_` (reapplying admissions formulas again). Each of the ~40 `validateList`/`formatNumber` calls re-reads a header row from the sheet.
- **Why it matters:** Setup order is load-bearing but implicit. Adding a feature means deciding which of three overlapping entry points to hook into, and forgetting one produces "works after Complete Setup but not after Repair" bugs. It's also why setup takes 30–60 seconds.
- **Refactoring:** One orchestrator with a declarative step list, passing a shared context (schema + header maps read once per sheet). Each feature registers its setup/repair work in exactly one place; `completeSetup` and `repairEntireWorkbook` become different subsets of the same step list.

### 7. No centralized error handling — failures are either swallowed or alerted ad hoc

- **Where:** Silent `catch (e) {}` in cache read/write, quota persistence, and conditional-format-rule inspection; top-level `try/catch → ui.alert(error.toString())` in setup functions; nothing is logged anywhere durable.
- **Why it matters:** When a user of the distributed template reports "setup didn't work," there is no trail. Individually swallowed cache errors are fine; the swallowed *pattern* isn't — real failures become indistinguishable from expected ones.
- **Refactoring:** Small `ErrorHandler` per the guide, without the ceremony: `console.error` with context everywhere (Stackdriver picks it up), plus one `wrapMenuAction(fn)` helper in `menu.js` providing the try/catch/alert so individual modules stop hand-rolling it. Skip the guide's error-log *sheet* — writing errors into the user's workbook is product clutter.

### 8. Test harness can't see the two riskiest layers: formula strings and write sequencing

- **Where:** `test/` validates wiring, config schema, and menu adapters — genuinely useful — but every serious bug found in the code-level review (dashboard `#ERROR!`, 4-year cost math, notes clobbering) lived in formula strings and write sequencing the harness never inspects.
- **Refactoring:** Follows from #4 and #2: once formula builders are pure functions, assert on their output (e.g. the 4-year formula contains `1.03`); once writes are batched matrices, assert on the matrix. No QUnit-in-GAS needed (the guide's suggestion is heavyweight) — the existing Node harness is the right tool, it just needs testable seams.

### 9. No `LockService` around mutating operations

- **Where:** Quota persistence in `scorecard.js` (read-modify-write on a ScriptProperty), the cache-key registry, and all setup/repair flows.
- **Why it's lower severity:** These sheets are effectively single-user, so contention is rare — but a user double-clicking a menu item mid-run can interleave `repairCollegeSync` with a fill. Cheap insurance: `LockService.getScriptLock()` in the menu-adapter wrapper from #7 for mutating actions.

### 10. API key lives in a visible sheet tab

- **Where:** `ScorecardAPIKey!A1`, read by `getApiKey()`.
- **Why it's tolerable but worth fixing:** Anyone the user shares the spreadsheet with (counselor, parent, friend copying their setup) gets the key. It's a free-tier key, so blast radius is small — which is why this ranks last — but the guide's pattern is right: store it in `PropertiesService.getUserProperties()` via a one-time prompt dialog, keeping the sheet-based path as a migration fallback.

---

## Guide patterns deliberately NOT adopted

- **Classes, singletons, and the DI container** — the IIFE-namespace pattern already provides module boundaries and is idiomatic for GAS's flat global runtime; a DI container adds ceremony without testability gains the Node harness doesn't already provide.
- **Advanced Sheets API (`Sheets.Spreadsheets.batchUpdate`)** — an extra OAuth scope and a much harder API for marginal gains once #2's `setValues` batching is done.
- **Error-log and performance-log sheets** — this is a consumer template; extra tabs are product clutter. Stackdriver logging covers it.

## Suggested sequencing

**#1 (schema) → #2 (batch I/O) → #4 (formula builders)** form the natural first arc: each makes the next mechanical, and together they eliminate the header-convention trap, the API-call storms, and the untestable formula strings — the three things most likely to break when introducing changes.

**#3 (keyed tracker sync)** is independent and can go anytime; prioritize it first if users are actively sorting their sheets today.

**#5–#8** ride along naturally with the first arc (the menu-adapter wrapper from #5/#7 is a small standalone change). **#9–#10** are opportunistic.
