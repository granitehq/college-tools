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

const success = suite.summary();
process.exit(success ? 0 : 1);
