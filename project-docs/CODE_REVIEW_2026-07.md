# Development Branch Code Review — 2026-07-06

Scope: recent `development` work (direct-push/registration workflow, region column,
validation/sync repair, dashboard) with a focus on the **Performance & Maintenance**
menu items that "take many seconds." Tests: 58/58 passing at review time.

Findings are in priority order. Each item is independent — pick and fix in any order.
Fix on a feature branch off `development` per the required flow.

---

## 1. `restoreTrackerRow_` writes formulas cell-by-cell — the main repair slowdown
**File:** `src/trackers.js:121-130` (called from `repairCollegeSync`, `src/trackers.js:566-569`)

For every college, for each of the 4 tracker sheets, this does one `setValues` for the
row **plus a separate `setFormula` per formula cell in a loop**. That is
`O(rows × formulaColumns × 4 sheets)` individual range round-trips — the dominant cost of
"Repair College Sync" and "Repair Entire Workbook." A 40-college workbook can easily be
thousands of round-trips.

**Fix:** Accumulate each sheet's restored rows into one 2D array and write with a single
`setValues` per sheet. Preserve formulas by writing the formula strings in the same array
(`setValues` accepts leading-`=` strings and treats them as formulas), eliminating the
per-cell `setFormula` loop entirely.

## 2. Batched flush machinery is defeated by the per-row restore above
**File:** `src/trackers.js:405-490` (`buildRepairSyncTarget_` / `queueRepairSync_` / `flushColumnRuns_` / `flushRepairSyncTarget_`)

~90 lines of contiguous-run batching exist to write `College Name` / `Total Cost of
Attendance` efficiently — but `restoreTrackerRow_` already rewrites the **entire row**
per-row first (item 1), so the batching saves nothing and the same cells are written
twice (see item 6). You pay the complexity cost and the per-row cost.

**Fix:** Pick one model. If item 1 moves to a single bulk `setValues` per sheet, the
`College Name`/COA values fold into that same write and this whole machinery can be
deleted. Simpler and faster.

## 3. Validation/format helpers issue one full-height range write per column
**File:** `src/formatting.js:80-145` (`validateList`, `validateDate`, `formatNumber`) driven by `enhanceFormatsDropdowns` (`src/formatting.js:278-374`)

Each call writes over `getMaxRows()` (~1000 rows) for a single column, and
`enhanceFormatsDropdowns` makes dozens per run: the Colleges block alone is ~8 rating
dropdowns + 3 category dropdowns + ~11 number formats, repeated across 6 sheets ⇒
~60-80 separate full-height `setDataValidation`/`setNumberFormat` calls, plus one
`clearExistingValidation_` per sheet. This is why "Repair Validations & Dropdowns" is slow.

**Fix:**
- Batch number formats: build a `1 × colCount` pattern row (or full-height `setNumberFormats`
  array) and apply per sheet in one call instead of one call per column.
- Apply validations/formats to the **actual `getLastRow()`** data extent, not `getMaxRows()`,
  so empty template rows aren't formatted.
- `setDataValidation` can't be array-batched by the API, but combining the above cuts the
  bulk of the round-trips.

## 4. `fillRegionsAllRows` writes changed regions one cell at a time
**File:** `src/colleges.js:561-576`

The read side is already optimized (one bulk `getValues`), but the write side loops
`sh.getRange(u.r, u.c).setValue(u.v)` per changed row. On a first run over a fresh sheet
every row changes ⇒ N round-trips.

**Fix:** Region is a single column — build the full column array once and write with one
`setValues`, or reuse the contiguous-run pattern from `flushColumnRuns_`.

## 5. `refreshDashboard` fully tears down and rebuilds with per-cell styling
**File:** `src/dashboard.js:688-693` → `createOrUpdateDashboard`

Refresh delegates to the full builder, which issues ~34 `setValue` + ~19 `setFormula` +
~13 `setNumberFormat` + ~11 `setFontWeight` + ~10 `setFontSize` + `autoResizeColumn`/
`setColumnWidth` — ~100+ individual range ops every refresh. The doc comment says
"all Dashboard values are live formulas," so a refresh rarely needs the full styling rebuild.

**Fix:** Separate structure/styling (setup-time) from data/formula refresh (refresh-time),
or batch the writes: assemble contiguous section blocks into 2D arrays and apply formats
with range-level (not per-cell) calls.

## 6. `repairCollegeSync` has two row-identity models and double-writes `College Name`
**File:** `src/trackers.js:499-602`

Two things share one function: **positional** mapping (`getTrackerRowForCollegeRow_`,
`sourceRow - 1`) and **name-based** snapshot restore. `College Name` is then written twice —
once from the snapshot in `restoreTrackerRow_`, once (canonical) via the queued flush. This
is correct today but fragile: if a user manually sorts a tracker, the positional assumption
silently breaks, and the dual source of truth is hard to reason about.

**Fix:** Document the positional invariant explicitly (trackers must stay row-aligned to
Colleges), and make canonical `College Name` the single writer. Folds naturally into item 1/2.

## 7. Silent phone-home during setup is not disclosed in the consent dialog
**File:** `src/setup.js:63-67` (registration) vs. consent text `src/setup.js:25-32`

`completeSetup` calls `Registration.registerIfNeeded()`, which POSTs `ownerEmail`,
`spreadsheetId`, `spreadsheetUrl`, and version to an external endpoint. The setup
confirmation dialog lists features but never tells the user their copy + email are
registered with a server. This is a privacy/consent gap.

**Fix:** Add a line to the consent dialog (and/or Instructions) disclosing registration and
what is sent. Endpoint is blank by default (`src/config.js:21`), so this only fires once an
endpoint is configured — worth fixing before that ships.

## 8. Registry "shared secret" is readable by every copy owner
**File:** `src/registration.js:45-60`, `scripts/registry-webapp.js:32-48`

The secret lives in each distributed copy's script properties, which the copy owner can read
in the Apps Script editor. It therefore authenticates nothing against a motivated user: anyone
with a copy can extract it and forge or overwrite registry rows (upsert keyed by `scriptId`,
`appendRow` otherwise), growing/poisoning the registry. The non-constant-time `!==` compare
(`registry-webapp.js:35`) is minor next to this.

**Fix:** Treat the registry as low-trust telemetry — don't rely on the secret as real auth.
If integrity matters, issue per-copy tokens server-side or validate `scriptId` ownership.
At minimum, document the trust model so it isn't mistaken for a security boundary.

## 9. `optimizePerformance` gives feedback only via the Dashboard's own alert
**File:** `src/setup.js:116-122`

It calls `refreshDashboard()` with no opts, so the only success popup the user sees is
"Dashboard data refreshed!" — and none at all if no Dashboard sheet exists. Minor UX
inconsistency with the other maintenance actions, which each confirm their own completion.

**Fix:** Pass `{suppressAlert: true}` to the dashboard refresh and show one
"Performance optimized" confirmation from `optimizePerformance` itself.

## 10. Registry web app deployed "Anyone" with no input bounds beyond the secret
**File:** `scripts/registry-webapp.js:56-81`

Once the secret leaks (item 8), `upsertRegistration` accepts unbounded appends with no rate
limiting or payload validation beyond required-field presence. Low severity (internal tool),
but worth a note.

**Fix:** Optional — add basic payload size/shape validation and consider capping row growth.

---

### Suggested sequencing
- **Biggest perf win for least risk:** items 1 + 2 together (repair sync), then 3
  (validation repair), then 4 (regions) and 5 (dashboard). These directly target the
  "many seconds" complaint.
- **Before the direct-push feature ships to real users:** items 7 and 8 (disclosure + trust model).
- **Polish:** 6, 9, 10.
