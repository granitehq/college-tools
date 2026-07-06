# Development Branch Code Review — Follow-up (2026-07-06)

Second-pass review after the performance batching work landed. Same lens:
design quality, readability, requirements, and performance of the
Performance & Maintenance actions.

> **Status:** All 7 remaining items below are now **resolved** on branch
> `perf/repair-sync-bulk-writes` (still unmerged). Regression coverage added to
> `test/perf-batching-tests.js`. The live-sheet smoke test noted below is still
> recommended before merging to `development`.

## Completed since the first review

Items 1–5 from `CODE_REVIEW_2026-07.md` are **done** on branch
`perf/repair-sync-bulk-writes` (not yet merged to `development`), each with
behavior-preservation + round-trip regression tests (`test/perf-batching-tests.js`):

- **1–2** `repairCollegeSync` — bulk read/write per tracker sheet; per-cell
  `setFormula` loop and the defeated flush machinery removed.
- **3** `enhanceFormatsDropdowns` / `applyStandardValidations` — one
  `setNumberFormats` + one `setDataValidations` per sheet.
- **4** `fillRegionsAllRows` — single batched column write.
- **5** Dashboard refresh — Section 1–5 stat rows batched; all per-cell
  `setFormula` eliminated.

Verified separately as still well-batched (no action needed): `scoring.js`
`ensureScoring` (uses `setFormulas`), and the single-row `fillCollegeRowCore`
read/write. Batch fill time is dominated by the API fetch and
`Utilities.sleep(BATCH_DELAY)`, which are rate-limit-driven, not code overhead.

⚠️ Still needs a live-sheet smoke test before merge: **Repair Validations &
Dropdowns**, **Repair Entire Workbook**, **Refresh Dashboard Data**, **Fill
Regions** — the mock can't verify number-format rendering or cell styling.

---

## Remaining, in priority order

### 1. Undisclosed registration phone-home in the setup consent dialog
**File:** `src/setup.js:63-67` (registration) vs. consent text `src/setup.js:25-32`

Carried over as top priority because the direct-push feature is new and about to
ship. `completeSetup` POSTs `ownerEmail`, `spreadsheetId`, and `spreadsheetUrl`
to an external endpoint, but the confirmation dialog only lists features. Add a
line disclosing registration and what is sent before an endpoint is configured
(`src/config.js:21` is currently blank, so nothing leaves yet).

### 2. Registry "shared secret" is not a real authenticator
**File:** `src/registration.js:45-60`, `scripts/registry-webapp.js:32-48`

The secret ships in every copy's script properties, which the copy owner can
read in the Apps Script editor. Any user can extract it and forge/overwrite
registry rows (upsert keyed by `scriptId`). Treat the registry as low-trust
telemetry and document that; if integrity matters, use per-copy tokens. The
non-constant-time `!==` compare (`registry-webapp.js:35`) is secondary to this.

### 3. `repairCollegeSync`: dual row-identity model + stale data on reused rows
**File:** `src/trackers.js` `repairCollegeSync` / `rebuildTrackerFromSnapshots_`

The double-write is gone after items 1–2, but two row-identity models still
coexist: **positional** (`getTrackerRowForCollegeRow_`) and **name-based**
(snapshot restore). A documented, pre-existing quirk remains: when a college is
removed and a new one takes its canonical row, the new college inherits the old
row's non-linked cells (only `College Name`/COA are overwritten). Decide the
intended behavior:
- If reused rows should start clean, clear non-linked cells for
  no-snapshot assignments.
- Either way, document the positional invariant (trackers must stay
  row-aligned to Colleges; manual sorting breaks the mapping).

This is a correctness/clarity decision, not a perf issue — captured by the
`perf-batching-tests.js` "inherits vacated row content" assertion so any change
is intentional.

### 4. `repairCollegeSync` reads each tracker sheet twice
**File:** `src/trackers.js` `snapshotRowsByCollegeName_` + `readMergedBlock_`

The snapshot pass and the base-block read each pull the same sheet's
values+formulas. Minor now that writes are batched, but the snapshot could
return the raw positional block so the rebuild reuses it — trimming one
`getValues`+`getFormulas` per tracker sheet. Low-effort polish.

### 5. `optimizePerformance` feedback comes only from the dashboard alert
**File:** `src/setup.js:116-122`

It calls `refreshDashboard()` with no opts, so the only success popup is
"Dashboard data refreshed!" — and none at all when no Dashboard sheet exists.
Pass `{suppressAlert: true}` and show one "Performance optimized" confirmation
from `optimizePerformance` itself.

### 6. Registry web app has no input bounds beyond the secret
**File:** `scripts/registry-webapp.js:56-81`

Given item 2, a leaked secret allows unbounded `appendRow` growth with only
required-field presence checks. Low severity (internal tool); consider basic
payload shape/size validation and a row cap.

### 7. `fillRegionsAllRows` column write assumes Region holds no formulas
**File:** `src/colleges.js` `fillRegionsAllRows`

The new single-column `setValues` rewrites the whole Region column, including
unchanged rows read via `getValues()`. Region is an app-owned plain-text column
so this is safe today, but a stray user formula there would be flattened. If you
want to be defensive, write only the contiguous changed runs (as the tracker
flush once did) instead of the full column.

---

### Suggested sequencing
- **Before merging the direct-push feature to real users:** items 1 and 2.
- **Next correctness/design decision:** item 3 (pick the intended reused-row behavior).
- **Polish:** 4, 5, 6, 7.
