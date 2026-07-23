/**
 * Personal Profile field tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'financial.js',
]);
const {CollegeTools, mockSpreadsheet} = harness;
const suite = new TestSuite();

suite.test('Personal Profile exposes optional home fields and preserves State_Residency', () => {
  CollegeTools.Financial.runFinancialSetup_();
  const profile = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);

  suite.assertEqual(profile.getRange(13, 1).getValue(), 'Home State:',
    'Visible residency label should be Home State');
  suite.assertEqual(profile.getRange(14, 1).getValue(), 'Home City:',
    'Home City should be present');
  suite.assertEqual(profile.getRange(15, 1).getValue(), 'Trips Home Per Year:',
    'Trips Home Per Year should be present');
  suite.assertEqual(mockSpreadsheet.namedRanges.State_Residency.row, 13,
    'State_Residency should still point at the Home State row');
  suite.assertEqual(mockSpreadsheet.namedRanges.State_Residency.col, 2,
    'State_Residency should still point at the Home State value cell');
  suite.assertEqual(mockSpreadsheet.namedRanges.Home_State.row, 13,
    'Home_State should point at the Home State row');
  suite.assertEqual(mockSpreadsheet.namedRanges.Home_City.row, 14,
    'Home_City should point at the Home City row');
  suite.assertEqual(mockSpreadsheet.namedRanges.Trips_Home_Per_Year.row, 15,
    'Trips_Home_Per_Year should point at the trips row');
});

suite.test('rerunning financial setup preserves existing profile inputs in one batch', () => {
  const profile = mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
  profile.getRange(4, 2).setValue(1450);
  profile.getRange(9, 2).setValue(85000);
  profile.getRange(14, 2).setValue('Boston');
  profile.resetCallCounts();

  CollegeTools.Financial.runFinancialSetup_();

  suite.assertEqual(profile.getRange(4, 2).getValue(), 1450, 'SAT input should survive setup rerun');
  suite.assertEqual(profile.getRange(9, 2).getValue(), 85000, 'Income input should survive setup rerun');
  suite.assertEqual(profile.getRange(14, 2).getValue(), 'Boston', 'Home City should survive setup rerun');
  suite.assertEqual(profile.callCounts.setValues, 1, 'Profile structure should be written in one batch');
  suite.assertEqual(profile.callCounts.setValue, 0, 'Profile setup should avoid single-cell value writes');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
