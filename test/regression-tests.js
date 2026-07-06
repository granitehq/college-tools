/**
 * Regression tests for row replacement and tracker sync behavior.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'formatting.js',
  'trackers.js',
  'colleges.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;

CollegeTools.Scorecard = {
  fetchCollegeData(name) {
    return {
      ok: true,
      data: {
        'school.name': `${name} University`,
        'school.city': 'New City',
        'school.state': 'CA',
        'school.locale': 21,
        'school.school_url': 'example.edu',
        'school.ownership': 1,
        'latest.admissions.admission_rate.overall': 0.45,
        'latest.student.retention_rate.four_year.full_time': 0.9,
        'latest.completion.rate_suppressed.overall': 0.8,
        'latest.earnings.10_yrs_after_entry.median': 82000,
        'latest.cost.attendance.academic_year': 50000,
        'latest.cost.avg_net_price.overall': 32000,
        'latest.admissions.sat_scores.25th_percentile.math': 650,
        'latest.admissions.sat_scores.25th_percentile.critical_reading': 640,
        'latest.admissions.sat_scores.75th_percentile.math': 730,
        'latest.admissions.sat_scores.75th_percentile.critical_reading': 720,
        'latest.admissions.act_scores.25th_percentile.cumulative': 29,
        'latest.admissions.act_scores.75th_percentile.cumulative': 33,
      },
    };
  },
  typeFromOwnership(code) {
    return code === 1 ? 'Public' : '';
  },
};

const suite = new TestSuite();

suite.test('fillCollegeRow clears stale non-preserved data and keeps user ratings/formulas', () => {
  const {colleges} = setupWorkbook({includeCampusSetting: true});

  const cityCol = getCollegeColumn('City', colleges);
  const ratingCol = getCollegeColumn('Program Fit (1-5)', colleges);
  const scoreCol = getCollegeColumn('Weighted Score', colleges);
  const notesCol = getCollegeColumn('Notes', colleges);
  const campusSettingCol = getCollegeColumn('Campus Setting', colleges);

  colleges.getRange(3, 1).setValue('Pacific');
  colleges.getRange(3, cityCol).setValue('Old City');
  colleges.getRange(3, ratingCol).setValue('5');
  colleges.getRange(3, scoreCol).setFormula('=SUM(1,2)');
  colleges.getRange(3, campusSettingCol).setValue('Suburban');
  colleges.getRange(3, notesCol).setValue('1.2.6 | Sample College');

  CollegeTools.Colleges.fillCollegeRow();

  suite.assertEqual(colleges.getRange(3, cityCol).getValue(), 'New City',
    'City should be replaced with fetched API data');
  suite.assertEqual(colleges.getRange(3, ratingCol).getValue(), '5',
    'User rating columns should be preserved');
  suite.assertEqual(colleges.getRange(3, campusSettingCol).getValue(), 'Suburban',
    'Campus Setting should be derived from school.locale when available');
  suite.assertEqual(colleges.getRange(3, scoreCol).getFormula(), '=SUM(1,2)',
    'Formula columns should be preserved');
  suite.assert(colleges.getRange(3, notesCol).getValue().includes('Pacific University'),
    'Notes should reflect the fetched college');
});


suite.test('fillCollegeRow writes the Colleges row with a batched row update', () => {
  const {colleges} = setupWorkbook({includeCampusSetting: true});
  const cityCol = getCollegeColumn('City', colleges);
  const ratingCol = getCollegeColumn('Program Fit (1-5)', colleges);

  colleges.getRange(3, 1).setValue('Pacific');
  colleges.getRange(3, ratingCol).setValue('4');
  colleges.resetCallCounts();

  CollegeTools.Colleges.fillCollegeRow();

  suite.assertEqual(colleges.getRange(3, cityCol).getValue(), 'New City',
    'Fill should still write fetched API data');
  suite.assertEqual(colleges.getRange(3, ratingCol).getValue(), '4',
    'Fill should preserve user-owned rating data');
  suite.assertEqual(colleges.callCounts.setValue, 0,
    'Fill should not write Colleges cells one at a time');
  suite.assert(colleges.callCounts.setValues > 0,
    'Fill should write the Colleges row with setValues');
});

suite.test('syncCollegeToTrackers aligns tracker rows by Colleges row number', () => {
  setupWorkbook();

  CollegeTools.Trackers.syncCollegeToTrackers({
    name: 'Updated College',
    coa: 12345,
    sourceRow: 4,
  });

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  const at = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  const st = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);

  suite.assertEqual(fa.getRange(3, 1).getValue(), 'Updated College',
    'Financial Aid tracker should map Colleges row 4 to tracker row 3');
  suite.assertEqual(fa.getRange(3, 12).getValue(), 12345,
    'Financial Aid tracker should receive cost of attendance');
  suite.assertEqual(cv.getRange(3, 1).getValue(), 'Updated College',
    'Campus Visit tracker should stay aligned');
  suite.assertEqual(at.getRange(3, 1).getValue(), 'Updated College',
    'Application Timeline should stay aligned');
  suite.assertEqual(st.getRange(3, 1).getValue(), 'Updated College',
    'Status Tracker should stay aligned');
});


suite.test('repairCollegeSync returns warnings array when Colleges sheet is missing', () => {
  harness.resetSheets();

  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assertEqual(result.ok, false, 'Repair should fail without the Colleges sheet');
  suite.assert(Array.isArray(result.warnings), 'Repair should return an iterable warnings array');
  suite.assertEqual(result.warnings.length, 0, 'Missing Colleges sheet should not create repair warnings');
});

suite.test('repairCollegeSync snapshots tracker formulas with one batched read per tracker', () => {
  const {colleges} = setupWorkbook();
  const coaCol = getCollegeColumn('Total Cost of Attendance', colleges);
  colleges.getRange(3, 1).setValue('Alpha College');
  colleges.getRange(3, coaCol).setValue(11111);

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const deadlineCol = CollegeTools.Utils.colIndex(fa, 'FAFSA Deadline');
  fa.getRange(2, 1).setValue('Alpha College');
  fa.getRange(2, deadlineCol).setFormula('=DATE(2026,1,15)');

  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assertEqual(result.ok, true, 'Repair should succeed');
  suite.assertEqual(fa.getRange(2, deadlineCol).getFormula(), '=DATE(2026,1,15)',
    'Repair should preserve existing tracker formulas');
  suite.assertEqual(fa.callCounts.getFormula, 1,
    'Repair should avoid per-cell formula reads; the only single-cell read should be this test assertion');
  suite.assert(fa.callCounts.getFormulas > 0,
    'Repair should use a batched formula read when snapshotting tracker rows');
});


suite.test('repairCollegeSync batches linked tracker updates after row restore', () => {
  const {colleges} = setupWorkbook();
  const coaCol = getCollegeColumn('Total Cost of Attendance', colleges);
  colleges.getRange(3, 1).setValue('Alpha College');
  colleges.getRange(3, coaCol).setValue(11111);
  colleges.getRange(4, 1).setValue('Beta College');
  colleges.getRange(4, coaCol).setValue(22222);

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  const at = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  const st = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
  [fa, cv, at, st].forEach((sheet) => sheet.resetCallCounts());

  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assertEqual(result.ok, true, 'Repair should succeed');
  suite.assertEqual(fa.getRange(2, 1).getValue(), 'Alpha College',
    'Financial Aid tracker should still receive the first college name');
  suite.assertEqual(fa.getRange(3, 12).getValue(), 22222,
    'Financial Aid tracker should still receive linked COA values');
  suite.assertEqual(fa.callCounts.setValue, 0,
    'Repair should not use single-cell setValue for Financial Aid linked updates');
  suite.assertEqual(cv.callCounts.setValue, 0,
    'Repair should not use single-cell setValue for Campus Visit linked updates');
  suite.assertEqual(at.callCounts.setValue, 0,
    'Repair should not use single-cell setValue for Application Timeline linked updates');
  suite.assertEqual(st.callCounts.setValue, 0,
    'Repair should not use single-cell setValue for Status Tracker linked updates');
});

suite.test('repairCollegeSync replaces stale tracker names and clears trailing rows', () => {
  const {colleges} = setupWorkbook();
  const coaCol = getCollegeColumn('Total Cost of Attendance', colleges);

  colleges.getRange(3, 1).setValue('Alpha College');
  colleges.getRange(3, coaCol).setValue(11111);
  colleges.getRange(4, 1).setValue('Beta College');
  colleges.getRange(4, coaCol).setValue(22222);

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  fa.getRange(2, 1).setValue('Sample A');
  fa.getRange(3, 1).setValue('Sample B');
  fa.getRange(4, 1).setValue('Sample C');
  cv.getRange(2, 1).setValue('Sample A');
  cv.getRange(3, 1).setValue('Sample B');
  cv.getRange(4, 1).setValue('Sample C');

  const result = CollegeTools.Trackers.repairCollegeSync();

  suite.assertEqual(result.ok, true, 'Repair should succeed');
  suite.assertEqual(result.count, 2, 'Repair should process two active colleges');
  suite.assertEqual(fa.getRange(2, 1).getValue(), 'Alpha College',
    'First tracker row should match Colleges row 3');
  suite.assertEqual(fa.getRange(3, 1).getValue(), 'Beta College',
    'Second tracker row should match Colleges row 4');
  suite.assertEqual(fa.getRange(4, 1).getValue(), '',
    'Trailing stale tracker rows should be cleared');
  suite.assertEqual(fa.getRange(2, 12).getValue(), 11111,
    'Repair should propagate linked cost fields');
  suite.assertEqual(cv.getRange(4, 1).getValue(), '',
    'Trailing stale names should be cleared on every tracker');
});

suite.test('repairCollegeSync preserves tracker user data when Colleges rows are reordered', () => {
  const {colleges} = setupWorkbook();
  const coaCol = getCollegeColumn('Total Cost of Attendance', colleges);

  colleges.getRange(3, 1).setValue('Alpha College');
  colleges.getRange(3, coaCol).setValue(11111);
  colleges.getRange(4, 1).setValue('Beta College');
  colleges.getRange(4, coaCol).setValue(22222);

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const deadlineCol = CollegeTools.Utils.colIndex(fa, 'FAFSA Deadline');
  fa.getRange(2, 1).setValue('Alpha College');
  fa.getRange(2, deadlineCol).setValue('Alpha deadline');
  fa.getRange(3, 1).setValue('Beta College');
  fa.getRange(3, deadlineCol).setValue('Beta deadline');

  colleges.getRange(3, 1).setValue('Beta College');
  colleges.getRange(3, coaCol).setValue(22222);
  colleges.getRange(4, 1).setValue('Alpha College');
  colleges.getRange(4, coaCol).setValue(11111);

  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assertEqual(result.ok, true, 'Repair should succeed');
  suite.assertEqual(fa.getRange(2, 1).getValue(), 'Beta College',
    'First tracker row should follow sorted Colleges order');
  suite.assertEqual(fa.getRange(2, deadlineCol).getValue(), 'Beta deadline',
    'Beta user-entered tracker fields should stay with Beta');
  suite.assertEqual(fa.getRange(3, 1).getValue(), 'Alpha College',
    'Second tracker row should follow sorted Colleges order');
  suite.assertEqual(fa.getRange(3, deadlineCol).getValue(), 'Alpha deadline',
    'Alpha user-entered tracker fields should stay with Alpha');
});

suite.test('repairCollegeSync reports duplicate tracker names instead of silently guessing ownership', () => {
  const {colleges} = setupWorkbook();
  colleges.getRange(3, 1).setValue('Alpha College');

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  fa.getRange(2, 1).setValue('Alpha College');
  fa.getRange(3, 1).setValue('Alpha College');

  const result = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});

  suite.assert(result.warnings.some((warning) => warning.code === 'duplicate_tracker_name' &&
    warning.sheetName === CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID &&
    warning.collegeName === 'Alpha College'),
  'Repair should report duplicate tracker names that require manual resolution');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
