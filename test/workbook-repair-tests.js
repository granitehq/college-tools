/**
 * Workbook repair workflow tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'formatting.js',
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
  suite.assert(fa.getRange(2, CollegeTools.Utils.colIndex(fa, 'College Name')).getDataValidation(),
    'Workbook repair should reapply validations');
  suite.assert(CollegeTools.Dashboard.refreshed, 'Workbook repair should refresh dashboard data when present');
  suite.assert(mockUi.alerts.length > 0, 'Workbook repair should notify the user');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
