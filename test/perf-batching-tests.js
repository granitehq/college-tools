/**
 * Performance-batching regression tests.
 *
 * Guards the bulk-write refactors that replaced per-row/per-cell round-trips:
 *   - repairCollegeSync bulk tracker rebuild (trackers.js)
 *   - fillRegionsAllRows batched column write (colleges.js)
 *   - enhanceFormatsDropdowns / applyStandardValidations batched formats+validations (formatting.js)
 *   - dashboard stat-row batched writes (dashboard.js)
 *
 * These assert both behavior preservation and the round-trip reduction
 * (setFormula/setValue call counts) that the optimizations depend on.
 */
const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js', 'utils.js', 'schema.js', 'formulas.js',
  'formatting.js', 'trackers.js', 'colleges.js', 'dashboard.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();
const C = CollegeTools.Config;

function sheet(name) { return mockSpreadsheet.getSheetByName(name); }
function col(sh, h) { return CollegeTools.Utils.colIndex(sh, h); }

/* ---- items 1-2: repairCollegeSync bulk rebuild ---- */

suite.test('repairCollegeSync repositions rows, preserves formulas, syncs names/COA in bulk', () => {
  const {colleges} = setupWorkbook({});
  const coaCol = getCollegeColumn('Total Cost of Attendance', colleges);
  colleges.getRange(3, 1).setValue('Beta');
  colleges.getRange(3, coaCol).setValue(20000);
  colleges.getRange(4, 1).setValue('Gamma');
  colleges.getRange(4, coaCol).setValue(30000);
  colleges.getRange(5, 1).setValue('Delta');
  colleges.getRange(5, coaCol).setValue(0);

  const fa = sheet(C.SHEET_NAMES.FINANCIAL_AID);
  const faName = col(fa, 'College Name');
  const faNet = col(fa, 'Net Price After Aid');
  const faNote = col(fa, 'Merit Scholarships');
  fa.getRange(2, faName).setValue('Gamma');
  fa.getRange(2, faNet).setFormula('=A2+1');
  fa.getRange(2, faNote).setValue('gamma-note');
  fa.getRange(3, faName).setValue('Beta');
  fa.getRange(3, faNote).setValue('beta-note');
  // Row 4 belonged to a removed college (Zeta): a stale entered value plus a
  // structural formula. Delta (new) reuses this row.
  fa.getRange(4, faName).setValue('Zeta');
  fa.getRange(4, faNote).setValue('zeta-note');
  fa.getRange(4, faNet).setFormula('=A4+2');

  fa.resetCallCounts();
  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assertEqual(result.count, 3, 'three colleges processed');
  suite.assertEqual(fa.getRange(2, faName).getValue(), 'Beta', 'Beta canonical @row2');
  suite.assertEqual(fa.getRange(3, faName).getValue(), 'Gamma', 'Gamma canonical @row3');
  suite.assertEqual(fa.getRange(4, faName).getValue(), 'Delta', 'Delta canonical @row4');
  suite.assertEqual(fa.getRange(2, faNote).getValue(), 'beta-note', 'Beta data repositioned');
  suite.assertEqual(fa.getRange(3, faNote).getValue(), 'gamma-note', 'Gamma data repositioned');
  suite.assertEqual(fa.getRange(3, faNet).getFormula(), '=A2+1', 'formula preserved on move');
  suite.assertEqual(fa.getRange(2, col(fa, 'Total Cost of Attendance')).getValue(), 20000, 'Beta COA synced');
  suite.assertEqual(fa.getRange(4, col(fa, 'Total Cost of Attendance')).getValue(), '', 'Delta COA 0 -> empty');
  // Item 3: new college on a reused row starts clean (stale value cleared)...
  suite.assertEqual(fa.getRange(4, faNote).getValue(), '', 'Delta does not inherit removed college value');
  // ...but the row's structural formula column survives.
  suite.assertEqual(fa.getRange(4, faNet).getFormula(), '=A4+2', 'formula on reused row preserved');
  suite.assertEqual(fa.callCounts.setFormula, 0, 'no per-cell setFormula');
  suite.assert(fa.callCounts.setValues <= 2, 'bulk block write (got ' + fa.callCounts.setValues + ')');
});

suite.test('repairCollegeSync skips restore for duplicate tracker names but sets canonical name', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, 1).setValue('Echo');
  const st = sheet(C.SHEET_NAMES.STATUS_TRACKER);
  const stName = col(st, 'College Name');
  const stStatus = col(st, 'Application Status');
  st.getRange(2, stName).setValue('Echo');
  st.getRange(2, stStatus).setValue('Submitted');
  st.getRange(3, stName).setValue('Echo');

  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});
  suite.assert(result.warnings.some(function(w) {
    return w.code === 'duplicate_tracker_name' && w.collegeName === 'Echo';
  }), 'duplicate warning emitted');
  suite.assertEqual(st.getRange(2, stName).getValue(), 'Echo', 'canonical name kept');
  suite.assertEqual(st.getRange(2, stStatus).getValue(), 'Submitted', 'ambiguous data not moved');
});

/* ---- item 4: fillRegionsAllRows batched write ---- */

suite.test('fillRegionsAllRows writes regions in one batched call and is idempotent', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, 1).setValue('Alpha');
  colleges.getRange(3, 3).setValue('CA');
  colleges.getRange(4, 1).setValue('Beta');
  colleges.getRange(4, 3).setValue('NY');
  colleges.getRange(5, 1).setValue('Gamma');
  colleges.getRange(5, 3).setValue('TX');

  colleges.resetCallCounts();
  const result = CollegeTools.Colleges.fillRegionsAllRows({suppressAlert: true});
  suite.assertEqual(result.count, 3, 'three regions changed');
  suite.assertEqual(colleges.callCounts.setValue, 0, 'no per-cell setValue');
  suite.assert(colleges.callCounts.setValues <= 1, 'single batched column write');

  const regionCol = getCollegeColumn('Region', colleges);
  suite.assertEqual(colleges.getRange(3, regionCol).getValue(), 'West', 'CA -> West');
  suite.assertEqual(colleges.getRange(4, regionCol).getValue(), 'Northeast', 'NY -> Northeast');
  suite.assertEqual(colleges.getRange(5, regionCol).getValue(), 'South', 'TX -> South');

  colleges.resetCallCounts();
  const again = CollegeTools.Colleges.fillRegionsAllRows({suppressAlert: true});
  suite.assertEqual(again.count, 0, 'no changes on rerun');
  suite.assertEqual(colleges.callCounts.setValues, 0, 'no write when unchanged');
});

/* ---- item 3: batched formats + validations ---- */

suite.test('enhanceFormatsDropdowns batches validations, applies dropdowns, clears stray rules', () => {
  setupWorkbook({includeCampusSetting: true});
  const fa = sheet(C.SHEET_NAMES.FINANCIAL_AID);
  const colleges = sheet(C.SHEET_NAMES.COLLEGES);
  const tuitionCol = col(fa, 'Tuition & Fees');
  fa.getRange(2, tuitionCol).setDataValidation({stray: true});
  fa.resetCallCounts();

  CollegeTools.Formatting.enhanceFormatsDropdowns({suppressAlert: true});

  suite.assert(fa.callCounts.setDataValidations <= 1, 'FA validations in <=1 batch');
  suite.assert(fa.callCounts.setNumberFormats <= 1, 'FA formats in <=1 batch');
  const fafsaCol = col(fa, 'FAFSA Submitted (Y/N)');
  suite.assert(fa.getRange(2, fafsaCol).getDataValidation(), 'Y/N dropdown applied');
  suite.assert(fa.getRange(500, fafsaCol).getDataValidation(), 'dropdown applied full height');
  suite.assert(!fa.getRange(2, tuitionCol).getDataValidation(), 'stray validation cleared');
  const ratingCol = getCollegeColumn('Program Fit (1-5)', colleges);
  suite.assert(colleges.getRange(3, ratingCol).getDataValidation(), 'Colleges rating dropdown applied');
});

suite.test('applyStandardValidations preserves validations on untargeted columns', () => {
  setupWorkbook({});
  const fa = sheet(C.SHEET_NAMES.FINANCIAL_AID);
  const efcCol = col(fa, 'EFC (Expected Family Contribution)');
  fa.getRange(2, efcCol).setDataValidation({manual: true});

  CollegeTools.Formatting.applyStandardValidations(fa);

  suite.assert(fa.getRange(2, col(fa, 'FAFSA Submitted (Y/N)')).getDataValidation(), 'standard rule applied');
  const preserved = fa.getRange(2, efcCol).getDataValidation();
  suite.assert(preserved && preserved.manual === true, 'untargeted manual rule preserved');
});

/* ---- item 5: dashboard stat-row batching ---- */

suite.test('dashboard stat sections keep exact rows and formulas without per-cell setFormula', () => {
  setupWorkbook({});
  const sk = mockSpreadsheet.getSheetByName(C.SHEET_NAMES.SCHOLARSHIP_TRACKER);
  C.HEADERS.SCHOLARSHIP_TRACKER.forEach(function(h, i) {
    sk.getRange(2, i + 1).setValue(i === 0 ? 'Some Scholarship' : '');
  });
  const dash = mockSpreadsheet.insertSheet(C.SHEET_NAMES.DASHBOARD);
  dash.resetCallCounts();

  CollegeTools.Dashboard.refreshDashboard({suppressAlert: true});

  const label = function(row) { return dash.getRange(row, 1).getValue(); };
  suite.assertEqual(label(5), 'Total Colleges:', 'stat @5');
  suite.assertEqual(label(11), '💰 Cost Analysis', 'Section2 header @11');
  suite.assertEqual(label(18), '🏆 Top Performers', 'Section3 header @18');
  suite.assertEqual(label(23), '📋 Progress Tracking', 'Section4 header @23');
  suite.assertEqual(label(30), '🎓 Scholarship Summary', 'Section5 header @30');
  suite.assertEqual(label(32), 'Total Applied:', 'stat @32');
  suite.assertEqual(label(36), 'Potential Amount (Pending):', 'stat @36');
  suite.assert(String(dash.getRange(5, 2).getFormula()).charAt(0) === '=', 'stat B-cell is a formula');
  suite.assertEqual(dash.callCounts.setFormula, 0, 'no per-cell setFormula on dashboard');
});

process.exit(suite.summary() ? 0 : 1);
