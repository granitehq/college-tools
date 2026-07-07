/**
 * Workbook repair workflow tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'formatting.js',
  'travel.js',
  'trackers.js',
  'colleges.js',
  'setup.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn, mockUi} = harness;
const suite = new TestSuite();

CollegeTools.Dashboard = {
  refreshed: false,
  refreshDashboard: function() {
    this.refreshed = true;
  },
};

CollegeTools.Scoring = {
  ensured: false,
  lastOpts: null,
  ensureScoring: function(opts) {
    this.ensured = true;
    this.lastOpts = opts;
  },
};

suite.test('repairEntireWorkbook can run as a no-UI service with suppressed alerts', () => {
  const {colleges} = setupWorkbook({includeCampusSetting: true});
  var regionCol = getCollegeColumn('Region', colleges);

  colleges.getRange(3, 1).setValue('Alpha College');
  colleges.getRange(3, 3).setValue('CA');
  mockUi.alerts = [];

  var result = CollegeTools.Setup.repairEntireWorkbook({suppressAlert: true});

  suite.assert(result.ok, 'Suppressed workbook repair should succeed');
  suite.assertEqual(colleges.getRange(3, regionCol).getValue(), 'West',
    'Suppressed workbook repair should still run repair steps');
  suite.assertEqual(mockUi.alerts.length, 0,
    'Suppressed workbook repair should not show confirmation or completion alerts');
});

suite.test('repairEntireWorkbook returns structured failure without alerts when required sheets are missing', () => {
  harness.resetSheets();
  mockUi.alerts = [];

  var result = CollegeTools.Setup.repairEntireWorkbook({suppressAlert: true});

  suite.assert(result && result.ok === false, 'Missing required sheets should produce a failed result');
  suite.assert(result.details && result.details.steps.length > 0,
    'Failed repair should include attempted step details');
  suite.assertEqual(mockUi.alerts.length, 0,
    'Failed suppressed repair should not alert');
});

suite.test('repairEntireWorkbook combines sync, validations, regions, and dashboard refresh', () => {
  const {colleges} = setupWorkbook({includeCampusSetting: true});
  var coaCol = getCollegeColumn('Total Cost of Attendance', colleges);
  var regionCol = getCollegeColumn('Region', colleges);

  colleges.getRange(3, 1).setValue('Alpha College');
  colleges.getRange(3, 3).setValue('CA');
  colleges.getRange(3, coaCol).setValue(11111);

  var fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  fa.getRange(2, 1).setValue('Sample A');

  mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.DASHBOARD);
  CollegeTools.Dashboard.refreshed = false;

  var result = CollegeTools.Setup.repairEntireWorkbook();

  suite.assert(result.ok, 'Workbook repair should succeed');
  suite.assertEqual(fa.getRange(2, 1).getValue(), 'Alpha College',
    'Workbook repair should resync tracker names');
  suite.assertEqual(colleges.getRange(3, regionCol).getValue(), 'West',
    'Workbook repair should refill regions');
  var travel = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
  suite.assert(travel, 'Workbook repair should create or refresh Travel Planner');
  suite.assertEqual(travel.getRange(2, 1).getValue(), 'Alpha College',
    'Travel Planner should stay aligned with Colleges rows during repair');
  suite.assert(fa.getRange(2, CollegeTools.Utils.colIndex(fa, 'College Name')).getDataValidation(),
    'Workbook repair should reapply validations');
  suite.assert(CollegeTools.Dashboard.refreshed, 'Workbook repair should refresh dashboard data when present');
  suite.assert(CollegeTools.Scoring.ensured, 'Workbook repair should rebuild scoring formulas');
  suite.assert(CollegeTools.Scoring.lastOpts && CollegeTools.Scoring.lastOpts.suppressAlert,
    'Scoring rebuild during repair should suppress its own alert');
  suite.assert(mockUi.alerts.length > 0, 'Workbook repair should notify the user');
});

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

const success = suite.summary();
process.exit(success ? 0 : 1);
