/**
 * Stable College ID generation and preservation tests.
 */
const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js', 'utils.js', 'schema.js', 'formatting.js', 'formulas.js',
  'travel.js', 'financial.js', 'admissions.js', 'trackers.js', 'colleges.js',
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
  colleges.getRange(3, 1).setValue('Alpha College');

  CollegeTools.Colleges.fillCollegeRowCore(3, {suppressAlert: true, skipTrackerSetup: true});

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

suite.test('College ID is moved to the final column, hidden, and preserved', () => {
  const {colleges} = setupWorkbook({});
  const currentHeaders = colleges.getRange(2, 1, 1, colleges.getLastColumn()).getValues()[0];
  const withoutId = currentHeaders.filter((header) => header !== 'College ID');
  const oldHeaders = withoutId.slice(0, 2).concat(['College ID'], withoutId.slice(2));
  colleges.getRange(2, 1, 1, currentHeaders.length).clearContent();
  colleges.getRange(2, 1, 1, oldHeaders.length).setValues([oldHeaders]);
  colleges.getRange(3, 1).setValue('Existing College');
  colleges.getRange(3, 3).setValue('stable-existing-id');

  CollegeTools.Colleges.fillCollegeRowCore(3, {suppressAlert: true, skipTrackerSetup: true});

  const finalColumn = colleges.getLastColumn();
  suite.assertEqual(colleges.getRange(2, finalColumn).getValue(), 'College ID',
    'College ID header should be the final used column');
  suite.assertEqual(colleges.getRange(3, finalColumn).getValue(), 'stable-existing-id',
    'Moving College ID should preserve its existing value');
  suite.assert(colleges.isColumnHiddenByUser(finalColumn),
    'College ID should be hidden from normal users');
});

suite.test('duplicate Colleges ID columns are consolidated into one hidden final column', () => {
  const {colleges} = setupWorkbook({});
  const firstIdColumn = getCollegeColumn('College ID', colleges);
  colleges.getRange(3, 1).setValue('Duplicate ID College');
  colleges.getRange(3, firstIdColumn).setValue('older-id');
  const duplicateColumn = colleges.getLastColumn() + 1;
  colleges.getRange(2, duplicateColumn).setValue('College ID');
  colleges.getRange(3, duplicateColumn).setValue('authoritative-id');

  CollegeTools.Colleges.fillCollegeRowCore(3, {suppressAlert: true, skipTrackerSetup: true});

  const headers = colleges.getRange(2, 1, 1, colleges.getLastColumn()).getValues()[0];
  suite.assertEqual(headers.filter((header) => header === 'College ID').length, 1,
    'Only one College ID header should remain');
  suite.assertEqual(colleges.getRange(3, colleges.getLastColumn()).getValue(), 'authoritative-id',
    'The rightmost populated ID should win when duplicate columns are repaired');
  suite.assert(colleges.isColumnHiddenByUser(colleges.getLastColumn()),
    'The consolidated College ID should be hidden');
});

suite.test('tracker College ID columns are last and hidden after repair', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, 1).setValue('Existing College');
  const collegeIdColumn = getCollegeColumn('College ID', colleges);
  colleges.getRange(3, collegeIdColumn).setValue('tracker-stable-id');

  const campus = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  const currentHeaders = campus.getRange(1, 1, 1, campus.getLastColumn()).getValues()[0];
  const withoutId = currentHeaders.filter((header) => header !== 'College ID');
  const oldHeaders = withoutId.slice(0, 2).concat(['College ID'], withoutId.slice(2));
  campus.getRange(1, 1, 1, currentHeaders.length).clearContent();
  campus.getRange(1, 1, 1, oldHeaders.length).setValues([oldHeaders]);
  campus.getRange(2, 1).setValue('Existing College');
  campus.getRange(2, 3).setValue('tracker-stable-id');

  CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  const finalColumn = campus.getLastColumn();
  suite.assertEqual(campus.getRange(1, finalColumn).getValue(), 'College ID',
    'Tracker College ID header should be the final used column');
  suite.assertEqual(campus.getRange(2, finalColumn).getValue(), 'tracker-stable-id',
    'Tracker College ID should remain associated with its row');
  suite.assert(campus.isColumnHiddenByUser(finalColumn),
    'Tracker College ID should be hidden from normal users');
});

suite.test('Campus Visit setup removes stale legacy columns and duplicate College IDs', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, 1).setValue('Campus Visit College');
  const campus = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  const canonicalLength = CollegeTools.Config.HEADERS.CAMPUS_VISIT.length;
  campus.getRange(1, canonicalLength + 1, 1, 3).setValues([[
    'Tour Guide Name', 'Worst Feature', 'College ID',
  ]]);
  campus.getRange(2, canonicalLength + 1, 1, 3).setValues([[
    'Alex Guide', 'Parking', 'stable-campus-id',
  ]]);

  CollegeTools.Trackers.setupAllTrackers({suppressAlert: true});

  const headers = campus.getRange(1, 1, 1, campus.getLastColumn()).getValues()[0];
  suite.assertEqual(campus.getLastColumn(), canonicalLength,
    'Campus Visit should be reduced to the canonical compact schema');
  suite.assertEqual(new Set(headers).size, headers.length,
    'Every Campus Visit header should be distinct');
  suite.assertEqual(headers[headers.length - 1], 'College ID',
    'Campus Visit College ID should be last');
  suite.assert(campus.isColumnHiddenByUser(headers.length),
    'Campus Visit College ID should be hidden');
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
