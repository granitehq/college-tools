# Stable College Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Colleges row a stable, hidden `College ID` that never changes, propagate it to the four per-college trackers (Financial Aid, Campus Visit, Application Timeline, Application Status), and switch `repairCollegeSync` from name-matching to ID-matching so renaming a college or having duplicate names no longer strands or clobbers tracker data.

**Architecture:** Add a `College ID` header (auto-appended to old sheets the same way `ensureCollegesRegionColumn_` already appends `Region`) to Colleges and to the four trackers. IDs are generated with `Utilities.getUuid()` the first time a Colleges row is filled or repaired, and preserved forever after (added to `PRESERVED_HEADERS`). `repairCollegeSync`'s existing name-keyed snapshot/rebuild mechanism becomes the **one-time bridge**: any tracker row that already carries an ID is matched by ID; any tracker row that still has a name but no ID is matched by name (today's logic) and has the winning Colleges row's ID stamped onto it, so it never needs name-matching again. This makes the migration automatic and idempotent — it happens the next time a user runs Setup/Repair, with no separate migration script and no data loss.

**Tech Stack:** Google Apps Script V8 (`src/*.js`, global `CollegeTools` namespace), Node test harness under `test/` with a mocked `SpreadsheetApp`/`Utilities` (`test/support.js`).

## Global Constraints

- `Colleges` headers stay on row 2, data starts row 3. Trackers keep headers on row 1, data on row 2. (`CLAUDE.md`)
- Do not switch `src/colleges.js` off flattened Scorecard keys (`r['school.city']` style). (`CLAUDE.md`)
- No destructive migration of existing workbook data — this plan must never drop or blank a user's tracker row. (`project-docs/appscript-refactoring-plan.md` Non-Goals)
- Setup/repair/tracker edits must stay narrow with focused regression tests. (`CLAUDE.md`)
- Node requirement `>=24.0.0`; verify with `npm run check` (lint + tests) before considering any task done. (`CLAUDE.md`)
- This supersedes the "prep only, no live columns" framing in `project-docs/appscript-refactoring-plan.md` Phase 6 — the user explicitly chose the full end-to-end cutover over the staged prep-only approach. Task 8 updates that doc and the backlog to reflect this.

---

## File Map

| File | Change |
|---|---|
| `src/config.js` | Append `'College ID'` to `HEADERS.COLLEGES`, `HEADERS.FINANCIAL_AID`, `HEADERS.CAMPUS_VISIT`, `HEADERS.APPLICATION_TIMELINE`, `HEADERS.STATUS_TRACKER`. |
| `src/schema.js` | Add `COLLEGE_ID` column key + new `systemColumns` ownership group to those 5 `SHEETS` entries; add `isSystemColumn` accessor. |
| `src/colleges.js` | Add `ensureCollegesIdColumn_`, `ensureCollegeIdForRow_`; wire into `fillCollegeRowCore`; add `'College ID'` to `PRESERVED_HEADERS`; pass `id` through to `syncCollegeToTrackers`. |
| `src/trackers.js` | Add `ensureTrackerIdColumn_`; rewrite `captureTrackerSheet_` to snapshot by ID with a name-keyed bridge fallback; update `rebuildTrackerFromSnapshots_`/`repairCollegeSync` to resolve/stamp IDs; update `syncCollegeRowToSheet_`/`syncCollegeToTrackers` to stamp ID alongside name. |
| `test/support.js` | Add a deterministic `Utilities.getUuid` mock. |
| `test/schema-metadata-tests.js` | Assert the new schema metadata. |
| `test/workbook-repair-tests.js` | Extend with rename/duplicate-name/idempotency regression coverage. |
| `project-docs/appscript-refactoring-plan.md`, `project-docs/backlog.md` | Mark backlog item 7 / Phase 6 complete, note the full cutover superseded the prep-only staging. |

Scholarship Tracker and Travel Planner are **out of scope**: Scholarship Tracker rows aren't per-college (no `College Name` column), and Travel Planner already fully rebuilds its block from Colleges order on every refresh rather than using `captureTrackerSheet_`/name snapshots, so it has no positional-loss bug to fix here.

---

### Task 1: Schema metadata for `College ID`

**Files:**
- Modify: `src/config.js:117-159` (the `HEADERS` object)
- Modify: `src/schema.js:45-221` (`SHEETS` map) and `src/schema.js:372-392` (public API)
- Test: `test/schema-metadata-tests.js`

**Interfaces:**
- Produces: `CollegeTools.Schema.header(sheetKey, 'COLLEGE_ID')` resolves to `'College ID'` for `COLLEGES`, `FINANCIAL_AID`, `CAMPUS_VISIT`, `APPLICATION_TIMELINE`, `STATUS_TRACKER`. `CollegeTools.Schema.isSystemColumn(sheetKey, 'COLLEGE_ID')` returns `true` for those 5 sheets.

- [ ] **Step 1: Append `College ID` to the five header arrays in `src/config.js`**

```js
    COLLEGES: [
      'College Name', 'City', 'State', 'Region', 'Type (Public/Private)',
      'Acceptance Rate', 'First-Year Retention', 'Grad Rate', 'Median Earnings (10yr)',
      'Total Cost of Attendance', 'Estimated Net Price', 'Link',
      'SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%',
      'Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)',
      'Safety (1-5)', 'Campus Culture Fit (1-5)', 'Weather Fit (1-5)',
      'Clubs/Activities (1-5)', 'Personal Priority (1-5)',
      'Weighted Score', 'Admission Fit', 'Campus Setting', 'Test Optional',
      'In-State Tuition', 'Out-of-State Tuition', 'Applicable Tuition',
      'Typical Debt at Graduation', 'Pell Grant Rate', 'Notes', 'College ID',
    ],
```

Do the same append (`, 'College ID',` at the end of the array, before the closing `]`) for `FINANCIAL_AID` (`src/config.js:117-126`), `CAMPUS_VISIT` (`128-133`), `APPLICATION_TIMELINE` (`145-152`), and `STATUS_TRACKER` (`154-159`). Leave `SCHOLARSHIP_TRACKER` and `TRAVEL_PLANNER` untouched — out of scope.

Appending at the end (not inserting mid-array) keeps every existing positional test/fixture assumption intact, since nothing in the codebase indexes these arrays by position — only by header-label lookup (`colIndex`, `Schema.columnIndex`).

- [ ] **Step 2: Add the `COLLEGE_ID` column key and a `systemColumns` ownership group in `src/schema.js`**

In the `COLLEGES` entry (`src/schema.js:46-103`), add to the `columns` keyMap list (after `['NOTES', 'Notes']`):

```js
        ['NOTES', 'Notes'],
        ['COLLEGE_ID', 'College ID'],
      ]),
```

and add a new ownership group after `formulaColumns`:

```js
      formulaColumns: setFromKeys([
        'WEIGHTED_SCORE', 'ADMISSION_FIT', 'APPLICABLE_TUITION',
      ]),
      systemColumns: setFromKeys(['COLLEGE_ID']),
      linkedColumns: {},
```

Repeat the same two edits (add `['COLLEGE_ID', 'College ID']` to `columns`, add `systemColumns: setFromKeys(['COLLEGE_ID'])`) for the `FINANCIAL_AID` (`136-161`), `CAMPUS_VISIT` (`162-175`), `APPLICATION_TIMELINE` (`176-189`), and `STATUS_TRACKER` (`190-204`) entries. For those four, `COLLEGE_ID` also belongs in `linkedColumns` alongside `COLLEGE_NAME`, since it is a value that `repairCollegeSync` writes into the tracker (like the name), not something a formula or the user owns:

```js
    FINANCIAL_AID: {
      ...
      linkedColumns: setFromKeys(['COLLEGE_NAME', 'TOTAL_COST', 'COLLEGE_ID']),
```

```js
    CAMPUS_VISIT: {
      ...
      linkedColumns: setFromKeys(['COLLEGE_NAME', 'COLLEGE_ID']),
```

```js
    APPLICATION_TIMELINE: {
      ...
      linkedColumns: setFromKeys(['COLLEGE_NAME', 'COLLEGE_ID']),
```

```js
    STATUS_TRACKER: {
      ...
      linkedColumns: setFromKeys(['COLLEGE_NAME', 'COLLEGE_ID']),
```

- [ ] **Step 3: Add the `isSystemColumn` accessor to the returned API (`src/schema.js:372-392`)**

```js
  return {
    getSheet: getSheet,
    getSheetKeyByName: getSheetKeyByName,
    columnIndex: columnIndex,
    rangeA1: rangeA1,
    header: header,
    isApiColumn: function(sheetKey, columnKey) {
      return hasColumn('apiColumns', sheetKey, columnKey);
    },
    isUserColumn: function(sheetKey, columnKey) {
      return hasColumn('userColumns', sheetKey, columnKey);
    },
    isFormulaColumn: function(sheetKey, columnKey) {
      return hasColumn('formulaColumns', sheetKey, columnKey);
    },
    isLinkedColumn: function(sheetKey, columnKey) {
      return hasColumn('linkedColumns', sheetKey, columnKey);
    },
    isSystemColumn: function(sheetKey, columnKey) {
      return hasColumn('systemColumns', sheetKey, columnKey);
    },
    validateHeaderRow: validateHeaderRow,
    validateWorkbookShape: validateWorkbookShape,
  };
```

- [ ] **Step 4: Write the test in `test/schema-metadata-tests.js`**

Add near the existing row-convention test (after the block ending around line 30):

```js
suite.test('schema declares a system-owned College ID column for Colleges and per-college trackers', () => {
  const sheetKeys = ['COLLEGES', 'FINANCIAL_AID', 'CAMPUS_VISIT', 'APPLICATION_TIMELINE', 'STATUS_TRACKER'];
  sheetKeys.forEach((key) => {
    suite.assertEqual(CollegeTools.Schema.header(key, 'COLLEGE_ID'), 'College ID',
      `${key} should declare a College ID column`);
    suite.assert(CollegeTools.Schema.isSystemColumn(key, 'COLLEGE_ID'),
      `${key}.COLLEGE_ID should be a system column`);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `node test/schema-metadata-tests.js` and `npm run check`.
Expected: PASS, no lint warnings.

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/schema.js test/schema-metadata-tests.js
git commit -m "feat: add College ID schema metadata for Colleges and trackers"
```

---

### Task 2: Deterministic `Utilities.getUuid` mock in the test harness

**Files:**
- Modify: `test/support.js:474` (`global.Utilities = {sleep: () => {}};`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Utilities.getUuid()` callable from `src/*.js` under test, returning sequential deterministic strings (`'uuid-1'`, `'uuid-2'`, ...) so tests can assert on generated IDs. Exposes `resetUuidCounter()` via the harness return object so each test file can reset numbering if needed.

- [ ] **Step 1: Update the mock**

```js
  let uuidCounter = 0;
  global.Utilities = {
    sleep: () => {},
    getUuid: () => {
      uuidCounter += 1;
      return `uuid-${uuidCounter}`;
    },
  };
```

Place this right before the existing `global.Utilities = {sleep: () => {}};` line inside `createHarness`, replacing it.

- [ ] **Step 2: Expose a reset helper from `createHarness`'s return object** (`test/support.js:526-536`)

```js
  return {
    mockSpreadsheet,
    mockUi,
    CollegeTools: global.CollegeTools,
    resetSheets,
    ensureSheetWithHeaders,
    setupWorkbook,
    getCollegeColumn,
    loadModule,
    resetUuidCounter: () => {
      uuidCounter = 0;
    },
  };
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

Run: `npm test`
Expected: All existing suites still PASS (no test currently calls `Utilities.getUuid`, so this is purely additive).

- [ ] **Step 4: Commit**

```bash
git add test/support.js
git commit -m "test: add deterministic Utilities.getUuid mock to the harness"
```

---

### Task 3: Colleges sheet — generate and preserve College ID

**Files:**
- Modify: `src/colleges.js` (`PRESERVED_HEADERS` at line 127, `ensureCollegesRegionColumn_` region at lines 68-89, `buildCollegesColumnMap_` at lines 97-124, `fillCollegeRowCore` at lines 318-497)
- Test: new file `test/college-identity-tests.js`

**Interfaces:**
- Consumes: `CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID')` (Task 1). `Utilities.getUuid()` (Task 2, and real Apps Script runtime).
- Produces: `ensureCollegesIdColumn_(sh)` → returns refreshed `hdrs` array (same contract as `ensureCollegesRegionColumn_`). `ensureCollegeIdForRow_(sh, row, idCol)` → returns the row's College ID string (existing value if present, otherwise a newly generated and written UUID). `COL.COLLEGE_ID` added to the map returned by `buildCollegesColumnMap_`. `fillCollegeRowCore` result unchanged (`{ok, msg}`), but `CollegeTools.Trackers.syncCollegeToTrackers` is now called with an `id` field in its `info` object in both the success and no-match branches.

- [ ] **Step 1: Add `ensureCollegesIdColumn_`, next to `ensureCollegesRegionColumn_` (`src/colleges.js:68-89`)**

```js
  /**
   * Auto-appends the College ID column to older Colleges sheets that predate
   * stable college identity, the same way ensureCollegesRegionColumn_ backfills
   * Region. Existing IDs (if any) are left untouched.
   * @param {Sheet} sh - Colleges sheet
   * @returns {Array<string>} Refreshed row-2 headers
   * @private
   */
  function ensureCollegesIdColumn_(sh) {
    var lastCol = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });

    if (hdrs.indexOf(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID')) !== -1) return hdrs;

    var idCol = lastCol + 1;
    sh.getRange(2, idCol).setValue(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID'));

    lastCol = Math.max(1, sh.getLastColumn());
    return sh.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });
  }

  /**
   * Returns a Colleges row's stable College ID, generating and writing one if
   * the cell is currently blank. Never overwrites an existing ID.
   * @param {Sheet} sh - Colleges sheet
   * @param {number} row - 1-based row number
   * @param {number} idCol - 1-based College ID column index
   * @returns {string} The row's College ID
   * @private
   */
  function ensureCollegeIdForRow_(sh, row, idCol) {
    if (!idCol) return '';
    var cell = sh.getRange(row, idCol);
    var existing = (cell.getValue() || '').toString().trim();
    if (existing) return existing;
    var id = Utilities.getUuid();
    cell.setValue(id);
    return id;
  }
```

- [ ] **Step 2: Wire `ensureCollegesIdColumn_` into header resolution and add `COL.COLLEGE_ID`**

In `fillCollegeRowCore` (`src/colleges.js:335-341`), change:

```js
    var hdrs = opts.columnIndexes ? opts.columnIndexes.HEADERS : null;
    if (!hdrs) {
      hdrs = ensureCollegesRegionColumn_(sh);
    }
    var COL = opts.columnIndexes || buildCollegesColumnMap_(hdrs);
```

to:

```js
    var hdrs = opts.columnIndexes ? opts.columnIndexes.HEADERS : null;
    if (!hdrs) {
      hdrs = ensureCollegesRegionColumn_(sh);
      hdrs = ensureCollegesIdColumn_(sh);
    }
    var COL = opts.columnIndexes || buildCollegesColumnMap_(hdrs);
```

In `buildCollegesColumnMap_` (`src/colleges.js:97-124`), add before `HEADERS: hdrs,`:

```js
      NOTES: requiredCollegeColumn_(hdrs, 'NOTES'),
      REGION: optionalCollegeColumn_(hdrs, 'REGION'),
      COLLEGE_ID: optionalCollegeColumn_(hdrs, 'COLLEGE_ID'),
      HEADERS: hdrs,
```

(`optionalCollegeColumn_` is used, matching `REGION`, since batch callers may pass a pre-built `columnIndexes` map captured before the ID column existed — this keeps `fillRegionsAllRows`/`fillSelectedRows` from throwing on a stale map instead of silently missing the column.)

- [ ] **Step 3: Preserve `College ID` across row refreshes (`src/colleges.js:127-141`)**

```js
  var PRESERVED_HEADERS = {
    'College Name': true,
    'Program Fit (1-5)': true,
    'Academic Reputation (1-5)': true,
    'Research Opportunities (1-5)': true,
    'Safety (1-5)': true,
    'Campus Culture Fit (1-5)': true,
    'Weather Fit (1-5)': true,
    'Clubs/Activities (1-5)': true,
    'Personal Priority (1-5)': true,
    'Weighted Score': true,
    'Admission Fit': true,
    'College ID': true,
    // Preserved so the auto-stamp check in fillCollegeRowCore can decide:
    // user-entered notes survive a re-fill, auto-stamps get refreshed.
    'Notes': true,
  };
```

- [ ] **Step 4: Generate/read the ID and pass it through to tracker sync, in both branches of `fillCollegeRowCore`**

In the no-match branch (`src/colleges.js:365-382` roughly, right after `nextRowValues[COL.NAME - 1] = sanitizedName;` and before `var apiResult = ...`), stamp the ID once so it exists regardless of API outcome:

```js
    nextRowValues[COL.NAME - 1] = sanitizedName;
    var collegeId = ensureCollegeIdForRow_(sh, row, COL.COLLEGE_ID);
```

Then in the no-match branch (`src/colleges.js:374-382`):

```js
      if (!opts.skipTrackerSetup) {
        CollegeTools.Trackers.syncCollegeToTrackers({
          name: sanitizedName,
          id: collegeId,
          sourceRow: row,
        });
```

And in the success branch (`src/colleges.js:488-494`):

```js
    if (!opts.skipTrackerSetup) {
      CollegeTools.Trackers.syncCollegeToTrackers({
        name: (usedName||name),
        coa: coa,
        id: collegeId,
        sourceRow: row,
      });
```

`collegeId` is in scope for both because it's declared once, right after sanitizing the name, before the API call branches.

- [ ] **Step 5: Write the failing test first — `test/college-identity-tests.js`**

```js
/**
 * Stable College ID generation and preservation tests.
 */
const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js', 'utils.js', 'schema.js', 'formatting.js',
  'travel.js', 'trackers.js', 'colleges.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn, resetUuidCounter} = harness;
const suite = new TestSuite();

CollegeTools.Scorecard = {
  fetchCollegeData: function() {
    return {ok: false, error: 'no match'};
  },
};

suite.test('fillCollegeRowCore assigns a College ID to a new row and preserves it on refill', () => {
  resetUuidCounter();
  const {colleges} = setupWorkbook({});
  const idCol = getCollegeColumn('College ID', colleges) || (colleges.getLastColumn() + 1);
  colleges.getRange(3, 1).setValue('Alpha College');

  const result = CollegeTools.Colleges.fillCollegeRow ?
    null : CollegeTools.Colleges;
  CollegeTools.Colleges.fillCollegeRowCore ?
    CollegeTools.Colleges.fillCollegeRowCore(3, {suppressAlert: true, skipTrackerSetup: true}) :
    null;

  const assignedId = colleges.getRange(3, getCollegeColumn('College ID', colleges)).getValue();
  suite.assert(assignedId, 'A College ID should be generated for a new row');

  CollegeTools.Colleges.fillCollegeRowCore(3, {suppressAlert: true, skipTrackerSetup: true});
  const idAfterRefill = colleges.getRange(3, getCollegeColumn('College ID', colleges)).getValue();
  suite.assertEqual(idAfterRefill, assignedId, 'Refilling the row must not change its College ID');
});

suite.test('ensureCollegesIdColumn_ backfills College ID on an older Colleges sheet missing it', () => {
  resetUuidCounter();
  const {colleges} = setupWorkbook({});
  // Simulate an old workbook: drop the College ID header this test's setupWorkbook already added.
  const headers = colleges.getRange(2, 1, 1, colleges.getLastColumn()).getValues()[0]
    .filter((h) => h !== 'College ID');
  colleges.getRange(2, 1, 1, colleges.getLastColumn()).clearContent();
  colleges.getRange(2, 1, 1, headers.length).setValues([headers]);
  colleges.getRange(3, 1).setValue('Beta College');

  CollegeTools.Colleges.fillCollegeRowCore(3, {suppressAlert: true, skipTrackerSetup: true});

  const newHeaders = colleges.getRange(2, 1, 1, colleges.getLastColumn()).getValues()[0];
  suite.assert(newHeaders.indexOf('College ID') !== -1, 'College ID column should be auto-appended');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
```

- [ ] **Step 6: Register the new file in `test/run-all-tests.js`**

Add `'college-identity-tests.js'` to the `tests` array, e.g. right after `'workbook-repair-tests.js'`:

```js
const tests = [
  'regression-tests.js',
  'template-integrity-tests.js',
  'workbook-repair-tests.js',
  'college-identity-tests.js',
  'perf-batching-tests.js',
  ...
```

- [ ] **Step 7: Run it to verify it fails**

Run: `node test/college-identity-tests.js`
Expected: FAIL — `ensureCollegesIdColumn_`/`ensureCollegeIdForRow_` not yet wired, or College ID column not found.

- [ ] **Step 8: Confirm Steps 1-4 above make it pass**

Run: `node test/college-identity-tests.js`
Expected: PASS.

- [ ] **Step 9: Run the full suite**

Run: `npm run check`
Expected: PASS, zero lint warnings.

- [ ] **Step 10: Commit**

```bash
git add src/colleges.js test/college-identity-tests.js test/run-all-tests.js
git commit -m "feat: generate and preserve a stable College ID on every Colleges row"
```

---

### Task 4: Tracker sheets — ID-keyed capture, rebuild, and repair

This is the core fix: replacing name-only matching in `repairCollegeSync` with ID-first matching, while using the existing name-match as a one-time bridge for rows that don't have an ID yet.

**Files:**
- Modify: `src/trackers.js` (`getTrackerRowForCollegeRow_` line 23, `syncCollegeRowToSheet_` line 35, `captureTrackerSheet_` line 82, `rebuildTrackerFromSnapshots_` line 197, `repairCollegeSync` line 747, `syncCollegeToTrackers` line 711)
- Test: extend `test/college-identity-tests.js` and `test/workbook-repair-tests.js`

**Interfaces:**
- Consumes: `CollegeTools.Schema.header(sheetKey, 'COLLEGE_ID')`, `CollegeTools.Schema.isSystemColumn` (Task 1). `info.id` from `fillCollegeRowCore` (Task 3).
- Produces: `repairCollegeSync()` return shape unchanged: `{ok, count, warnings}`, but a tracker row keyed by a stable ID now survives a Colleges-row rename. `syncCollegeToTrackers(info)` now also stamps `info.id` into each tracker's `College ID` column at the synced position.

- [ ] **Step 1: Add `ensureTrackerIdColumn_`, next to `getTrackerRowForCollegeRow_` (`src/trackers.js:16-25`)**

```js
  /**
   * Auto-appends the College ID column to an older tracker sheet that predates
   * stable college identity, mirroring Colleges.ensureCollegesIdColumn_.
   * @param {Sheet} sh - Tracker sheet
   * @param {string} sheetKey - Schema sheet key for this tracker
   * @returns {number} 1-based College ID column index
   * @private
   */
  function ensureTrackerIdColumn_(sh, sheetKey) {
    var label = CollegeTools.Schema.header(sheetKey, 'COLLEGE_ID');
    var idCol = CollegeTools.Utils.colIndex(sh, label);
    if (idCol) return idCol;

    var lastCol = Math.max(1, sh.getLastColumn());
    idCol = lastCol + 1;
    sh.getRange(1, idCol).setValue(label);
    return idCol;
  }
```

- [ ] **Step 2: Rewrite `captureTrackerSheet_` to snapshot by ID with a name-keyed bridge (`src/trackers.js:73-113`)**

```js
  /**
   * Reads a tracker sheet once and captures an ID-keyed snapshot map (the
   * steady-state join key), a name-keyed snapshot map (used only to bridge
   * rows that predate stable college identity), and the raw formula-aware
   * data block (reused as the rebuild base, avoiding a second read of the
   * same sheet). Duplicate names are flagged because name-only matching is
   * ambiguous; duplicate IDs should never occur but are flagged defensively.
   * @param {Sheet} sh - Tracker sheet
   * @param {string} sheetKey - Schema sheet key for this tracker
   * @returns {{byId: Object, byName: Object, block: Array<Array>, lastCol: number, idCol: number}} Capture
   * @private
   */
  function captureTrackerSheet_(sh, sheetKey) {
    var capture = {byId: {}, byName: {}, block: [], lastCol: 0, idCol: 0};
    if (!sh) return capture;
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    var idCol = ensureTrackerIdColumn_(sh, sheetKey);
    capture.idCol = idCol;
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    capture.lastCol = lastCol;
    if (!nameCol || lastRow < 2 || lastCol < 1) return capture;

    var range = sh.getRange(2, 1, lastRow - 1, lastCol);
    var values = range.getValues();
    var formulas = range.getFormulas();
    capture.block = mergeValuesAndFormulas_(values, formulas);

    for (var i = 0; i < values.length; i++) {
      var collegeName = (values[i][nameCol - 1] || '').toString().trim();
      var collegeId = (values[i][idCol - 1] || '').toString().trim();
      if (!collegeName && !collegeId) continue;

      var snapshot = {values: values[i], formulas: formulas[i], duplicate: false};

      if (collegeId) {
        if (capture.byId[collegeId]) {
          capture.byId[collegeId].duplicate = true;
          capture.byId._duplicates = capture.byId._duplicates || [];
          capture.byId._duplicates.push(collegeId);
        } else {
          capture.byId[collegeId] = snapshot;
        }
        continue;
      }

      // No ID yet -- this row predates stable college identity. Keep it
      // available for the name-keyed bridge in rebuildTrackerFromSnapshots_.
      if (!collegeName) continue;
      if (capture.byName[collegeName]) {
        capture.byName[collegeName].duplicate = true;
        capture.byName._duplicates = capture.byName._duplicates || [];
        capture.byName._duplicates.push(collegeName);
        continue;
      }
      capture.byName[collegeName] = snapshot;
    }

    return capture;
  }
```

- [ ] **Step 3: Update `rebuildTrackerFromSnapshots_` to resolve by ID first, bridge by name second (`src/trackers.js:182-239`)**

```js
  /**
   * Rebuilds a tracker sheet's data block in a single bulk write, reusing the
   * data block already read by captureTrackerSheet_ (no second read). Each
   * canonical row is resolved as:
   *   - unique ID snapshot for the college    -> restore its captured row (data follows the college even across a rename)
   *   - no ID snapshot, unique name snapshot  -> one-time bridge: restore the name-matched row and adopt the ID going forward
   *   - no snapshot at all (new college)      -> clear entered values, keep formulas
   *   - duplicate snapshot (ambiguous)        -> leave the physical row in place
   * then the linked columns (College Name, College ID, plus any extras) are
   * stamped on top.
   * @param {Sheet|null} sh - Tracker sheet
   * @param {{byId: Object, byName: Object, block: Array<Array>, lastCol: number, idCol: number}} capture - captureTrackerSheet_ result
   * @param {Array<Object>} assignments - {trackerRow, name, id, coa} per college, in order
   * @param {function(Object):Object=} extraOverridesFn - Optional per-assignment
   *   header/value map for linked columns beyond College Name/College ID
   * @private
   */
  function rebuildTrackerFromSnapshots_(sh, capture, assignments, extraOverridesFn) {
    if (!sh || !assignments.length) return;
    var lastCol = capture.lastCol || sh.getLastColumn();
    if (lastCol < 1) return;
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    if (!nameCol) return;
    var idCol = capture.idCol || CollegeTools.Utils.colIndex(sh, 'College ID');

    var firstRow = 2;
    var lastWriteRow = firstRow;
    for (var k = 0; k < assignments.length; k++) {
      if (assignments[k].trackerRow > lastWriteRow) lastWriteRow = assignments[k].trackerRow;
    }
    var numRows = lastWriteRow - firstRow + 1;

    var block = capture.block.slice(0, numRows).map(function(row) {
      return row.slice();
    });
    while (block.length < numRows) block.push(blankRow_(lastCol));

    for (var a = 0; a < assignments.length; a++) {
      var assignment = assignments[a];
      var offset = assignment.trackerRow - firstRow;
      var snapshot = capture.byId[assignment.id];
      if (!snapshot || snapshot.duplicate) {
        var bridged = capture.byName[assignment.name];
        if (bridged && !bridged.duplicate) snapshot = bridged;
      }

      if (snapshot && !snapshot.duplicate) {
        block[offset] = mergeSnapshotRow_(snapshot, lastCol);
      } else if (!snapshot) {
        block[offset] = clearValuesKeepFormulas_(block[offset]);
      }
      block[offset][nameCol - 1] = assignment.name;
      if (idCol) block[offset][idCol - 1] = assignment.id;

      var overrides = extraOverridesFn ? extraOverridesFn(assignment) : null;
      for (var header in overrides) {
        if (!overrides.hasOwnProperty(header)) continue;
        var c = CollegeTools.Utils.colIndex(sh, header);
        if (c) block[offset][c - 1] = overrides[header] || '';
      }
    }

    sh.getRange(firstRow, 1, numRows, lastCol).setValues(block);
  }
```

- [ ] **Step 4: Update `collectDuplicateSnapshotWarnings_` call sites and `repairCollegeSync` (`src/trackers.js:747-843`)**

Replace the capture calls (`src/trackers.js:779-792`):

```js
    var trackerCaptures = {
      financialAid: captureTrackerSheet_(faSheet, 'FINANCIAL_AID'),
      campusVisit: captureTrackerSheet_(cvSheet, 'CAMPUS_VISIT'),
      applicationTimeline: captureTrackerSheet_(atSheet, 'APPLICATION_TIMELINE'),
      statusTracker: captureTrackerSheet_(stSheet, 'STATUS_TRACKER'),
    };
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.financialAid.byName,
      CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.campusVisit.byName,
      CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.applicationTimeline.byName,
      CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.statusTracker.byName,
      CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
```

(`collectDuplicateSnapshotWarnings_` itself, at `src/trackers.js:312-330`, is unchanged — it already just reads `snapshots._duplicates`.)

Replace the Colleges bulk-read section (`src/trackers.js:794-815`) to also read/backfill `College ID`:

```js
    // Read all header and data in two bulk reads instead of per-row calls
    var lastCol = collegesSheet.getLastColumn();
    var hdrs = collegesSheet.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });
    var coaIdx = hdrs.indexOf('Total Cost of Attendance');
    var idIdx = hdrs.indexOf(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID'));
    if (idIdx === -1) {
      // Older Colleges sheet: append the column once, same as fillCollegeRowCore's
      // ensureCollegesIdColumn_, so repair alone can bring an old workbook current.
      idIdx = lastCol;
      collegesSheet.getRange(2, lastCol + 1).setValue(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID'));
      lastCol += 1;
    }
    var data = collegesSheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

    // Build the ordered canonical assignment list once; each tracker maps a
    // Colleges row to the same tracker row, so this drives every sheet's rebuild.
    // Backfill any missing College ID in the same pass so a workbook with rows
    // added by typing (not via Fill Row) still gets stable IDs.
    var idWrites = [];
    var assignments = [];
    for (var i = 0; i < data.length; i++) {
      var collegeName = (data[i][0] || '').toString().trim();
      if (!collegeName) continue;
      var collegeId = (data[i][idIdx] || '').toString().trim();
      if (!collegeId) {
        collegeId = Utilities.getUuid();
        idWrites.push({row: i + 3, id: collegeId});
      }
      assignments.push({
        trackerRow: getTrackerRowForCollegeRow_(i + 3),
        name: collegeName,
        id: collegeId,
        coa: coaIdx >= 0 ? data[i][coaIdx] : '',
      });
      processed++;
    }
    idWrites.forEach(function(w) {
      collegesSheet.getRange(w.row, idIdx + 1).setValue(w.id);
    });
```

The rebuild calls (`src/trackers.js:819-825`) stay the same shape — `assignments` now simply carries `id` alongside `name`/`coa`, which `rebuildTrackerFromSnapshots_` already consumes.

- [ ] **Step 5: Stamp College ID during single-row sync too (`src/trackers.js:35-51`, `src/trackers.js:711-737`)**

`syncCollegeRowToSheet_` gains an ID parameter:

```js
  function syncCollegeRowToSheet_(sh, sourceRow, collegeName, collegeId, updatesObj) {
    if (!sh || !sourceRow) return;

    var trackerRow = getTrackerRowForCollegeRow_(sourceRow);
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    if (!nameCol) return;

    sh.getRange(trackerRow, nameCol).setValue(collegeName || '');

    var idCol = CollegeTools.Utils.colIndex(sh, 'College ID');
    if (idCol && collegeId) {
      sh.getRange(trackerRow, idCol).setValue(collegeId);
    }

    if (!updatesObj) return;
    for (var key in updatesObj) {
      if (!updatesObj.hasOwnProperty(key)) continue;
      var c = CollegeTools.Utils.colIndex(sh, key);
      if (!c) continue;
      sh.getRange(trackerRow, c).setValue(updatesObj[key] || '');
    }
  }
```

`syncCollegeToTrackers` passes `info.id` through and appends the tracker ID column via `ensureTrackerIdColumn_` before writing (so a single-row Fill on an old workbook also backfills the column, not just full repair):

```js
  function syncCollegeToTrackers(info) {
    var ss = SpreadsheetApp.getActive();
    var sourceRow = info.sourceRow;
    if (!sourceRow) return;

    var fa = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (fa) {
      ensureTrackerIdColumn_(fa, 'FINANCIAL_AID');
      syncCollegeRowToSheet_(fa, sourceRow, info.name, info.id, {
        'Total Cost of Attendance': info.coa,
      });
    }

    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      ensureTrackerIdColumn_(cv, 'CAMPUS_VISIT');
      syncCollegeRowToSheet_(cv, sourceRow, info.name, info.id, {});
    }

    var at = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (at) {
      ensureTrackerIdColumn_(at, 'APPLICATION_TIMELINE');
      syncCollegeRowToSheet_(at, sourceRow, info.name, info.id, {});
    }

    var st = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    if (st) {
      ensureTrackerIdColumn_(st, 'STATUS_TRACKER');
      syncCollegeRowToSheet_(st, sourceRow, info.name, info.id, {});
    }
  }
```

This keeps `syncCollegeToTrackers`'s row-resolution strategy exactly as it is today (position-based, `sourceRow - 1`) — only `repairCollegeSync` gets the smarter ID-based *matching*. That is the intentional scope boundary: the backlog line says "replace positional tracker sync with keyed repair/**sync**," and this satisfies it by making every write path (single-row sync and full repair) ID-aware, while only repair needs to search/re-match rows, since single-row sync always targets a specific known row.

- [ ] **Step 6: Extend `test/college-identity-tests.js` with the rename-survival regression test**

```js
suite.test('repairCollegeSync preserves tracker data across a Colleges rename (ID-keyed, not name-keyed)', () => {
  resetUuidCounter();
  const {colleges} = setupWorkbook({});
  const coaCol = getCollegeColumn('Total Cost of Attendance', colleges);
  colleges.getRange(3, 1).setValue('Old Name University');
  colleges.getRange(3, coaCol).setValue(50000);

  CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  const cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  cv.getRange(2, 2).setValue('2026-10-01'); // some user-entered visit data in a non-name column

  // Rename the college -- this is the failure mode the old name-keyed sync had.
  colleges.getRange(3, 1).setValue('New Name University');
  CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assertEqual(cv.getRange(2, 1).getValue(), 'New Name University',
    'Tracker display name should follow the rename');
  suite.assertEqual(cv.getRange(2, 2).getValue(), '2026-10-01',
    'Tracker data entered before the rename must survive it, keyed by College ID');
});

suite.test('duplicate Colleges names still get distinct College IDs', () => {
  resetUuidCounter();
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, 1).setValue('Twin State University');
  colleges.getRange(4, 1).setValue('Twin State University');

  CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  const idCol = getCollegeColumn('College ID', colleges);
  const id3 = colleges.getRange(3, idCol).getValue();
  const id4 = colleges.getRange(4, idCol).getValue();
  suite.assert(id3 && id4 && id3 !== id4, 'Two Colleges rows with the same name must get distinct IDs');
});
```

- [ ] **Step 7: Run to verify these fail before Steps 1-5, then pass after**

Run: `node test/college-identity-tests.js`
Expected before the trackers.js edits: FAIL (rename test fails because the old name-keyed capture treats the renamed row as new and clears the Campus Visit date). After the edits: PASS.

- [ ] **Step 8: Extend `test/workbook-repair-tests.js` for idempotency**

Add:

```js
suite.test('repairCollegeSync run twice in a row does not change already-assigned College IDs', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, 1).setValue('Stable College');

  CollegeTools.Setup.repairEntireWorkbook();
  const idCol = getCollegeColumn('College ID', colleges);
  const firstId = colleges.getRange(3, idCol).getValue();

  CollegeTools.Setup.repairEntireWorkbook();
  const secondId = colleges.getRange(3, idCol).getValue();

  suite.assertEqual(secondId, firstId, 'Repeated repair must not regenerate an existing College ID');
});
```

- [ ] **Step 9: Run the full suite**

Run: `npm run check`
Expected: PASS, zero lint warnings.

- [ ] **Step 10: Commit**

```bash
git add src/trackers.js test/college-identity-tests.js test/workbook-repair-tests.js
git commit -m "feat: key tracker repair/sync off stable College ID instead of name"
```

---

### Task 5: Manual live-sheet smoke test

Per `CLAUDE.md` Testing Limits, the mocked harness cannot prove real spreadsheet/UI behavior. Before this ships:

- [ ] **Step 1:** On a copied test spreadsheet, run **Setup > Repair Entire Workbook** (or whichever menu path calls `repairCollegeSync`) on a sheet that predates this change. Confirm: `College ID` columns appear on Colleges and all four trackers, existing tracker rows keep their data, and no `duplicate_tracker_name`/new warnings appear unexpectedly.
- [ ] **Step 2:** Rename a college in Colleges, run repair again, confirm the renamed row's Financial Aid/Campus Visit/Application Timeline/Status data follows the rename instead of resetting.
- [ ] **Step 3:** Add two Colleges rows with an identical name, run repair, confirm both get distinct IDs and existing tracker rows for that name are flagged via the duplicate warning rather than silently merged.
- [ ] **Step 4:** Run **Fill Row** on a single college and confirm the College ID column appears/stamps correctly on a workbook that had no repair run yet (tests the `fillCollegeRowCore`/`syncCollegeToTrackers` path independently of `repairCollegeSync`).

Record the outcome in the PR description; do not merge without this pass per `CLAUDE.md`.

---

### Task 6: Update project docs

**Files:**
- Modify: `project-docs/appscript-refactoring-plan.md` (Phase 6 section, `~228-249`, and the Current Pain Points item 5, `~37`)
- Modify: `project-docs/backlog.md` (item 7 under Prioritized Backlog, `~91-94`)

- [ ] **Step 1:** In `appscript-refactoring-plan.md`, replace the Phase 6 section's "prep only, no live columns" framing with a short note that the full cutover shipped directly (superseding the staged prep-only plan), referencing this plan's filename. Remove or update Current Pain Points item 5 ("Tracker sync is still positional...") since it's resolved.

- [ ] **Step 2:** In `backlog.md`, move item 7 ("Introduce stable college identity...") from **Prioritized Backlog** to **Complete In Both Branches** (or **Release Pending**, matching whatever branch this lands on first, per the doc's own Branch Audit convention) once merged, with a one-line description of the actual mechanism (ID-keyed repair/sync, auto-backfill on old workbooks).

- [ ] **Step 3: Commit**

```bash
git add project-docs/appscript-refactoring-plan.md project-docs/backlog.md
git commit -m "docs: mark stable college identity backlog item complete"
```

---

## Self-Review Notes

- **Spec coverage:** Schema metadata (Task 1), automatic bridge migration for old workbooks (Task 3 Step 2/Task 4 Step 4 — the `idIdx === -1` and blank-ID-backfill branches), replacing positional/name matching in repair (Task 4 Steps 2-4), regression tests for the exact failure mode described to the user — renames and duplicate names (Task 4 Step 6) — and doc updates (Task 6) are all covered.
- **No live destructive migration:** every new code path only *adds* a column or *fills a blank* ID cell; nothing clears or reorders existing tracker values except through the same snapshot-restore mechanism `repairCollegeSync` already uses today.
- **Type/name consistency check:** `captureTrackerSheet_(sh, sheetKey)` signature change is threaded through both its only two call sites in Task 4 Step 4; `syncCollegeRowToSheet_`'s new `collegeId` parameter is threaded through all four call sites in Task 4 Step 5; `rebuildTrackerFromSnapshots_`'s `capture.byId`/`capture.byName` shape matches what Step 2 produces.
