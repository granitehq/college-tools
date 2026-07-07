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
