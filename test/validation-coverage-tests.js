/**
 * Validation coverage tests for dropdown-backed fields.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness(['config.js', 'utils.js', 'formatting.js', 'formulas.js', 'trackers.js']);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();

CollegeTools.Financial = {
  enhancePersonalProfileFormatting: function() {},
  enhanceFinancialAidFormatting: function() {},
  enhanceCollegesFormatting: function() {},
};
CollegeTools.Admissions = {
  enhanceAdmissionFormatting: function() {},
};

suite.test('tracker college-name validation points at Colleges row 3 onward', () => {
  setupWorkbook();
  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);

  CollegeTools.Formatting.enhanceFormatsDropdowns();

  const validation = fa.getRange(2, 1).getDataValidation();
  suite.assert(validation, 'Validation should be applied to tracker college names');
  suite.assertEqual(validation.sourceRange, 'A3:A1000',
    'Tracker validation should exclude the Colleges header row');
  suite.assertEqual(validation.sourceSheet, CollegeTools.Config.SHEET_NAMES.COLLEGES,
    'Validation should point to the Colleges sheet');
});

suite.test('Colleges sheet keeps dropdowns for ratings, region, type, and campus setting', () => {
  const {colleges} = setupWorkbook();
  CollegeTools.Formatting.enhanceFormatsDropdowns();

  const programFitValidation = colleges.getRange(3, getCollegeColumn('Program Fit (1-5)', colleges)).getDataValidation();
  const regionValidation = colleges.getRange(3, getCollegeColumn('Region', colleges)).getDataValidation();
  const typeValidation = colleges.getRange(3, getCollegeColumn('Type (Public/Private)', colleges)).getDataValidation();
  const campusSettingValidation = colleges.getRange(3, getCollegeColumn('Campus Setting', colleges)).getDataValidation();

  suite.assert(programFitValidation && programFitValidation.ruleType === 'list',
    'Program Fit should have a dropdown');
  suite.assert(regionValidation && regionValidation.ruleType === 'list',
    'Region should have a dropdown');
  suite.assert(typeValidation && typeValidation.ruleType === 'list',
    'Type should have a dropdown');
  suite.assert(campusSettingValidation && campusSettingValidation.ruleType === 'list',
    'Campus Setting should have a dropdown');
});

suite.test('Type dropdown includes the API-mapped values and Other', () => {
  const {colleges} = setupWorkbook();
  CollegeTools.Formatting.enhanceFormatsDropdowns();

  const typeValidation = colleges.getRange(3, getCollegeColumn('Type (Public/Private)', colleges)).getDataValidation();
  const options = typeValidation.options || [];

  ['Public', 'Private (nonprofit)', 'Private (for-profit)', 'Other'].forEach((value) => {
    suite.assert(options.includes(value), `Type dropdown should include ${value}`);
  });
});

suite.test('Campus Setting dropdown includes API-mapped values and Other', () => {
  const {colleges} = setupWorkbook();
  CollegeTools.Formatting.enhanceFormatsDropdowns();

  const validation = colleges.getRange(3, getCollegeColumn('Campus Setting', colleges)).getDataValidation();
  const options = validation.options || [];

  ['City', 'Suburban', 'Town', 'Rural', 'Other'].forEach((value) => {
    suite.assert(options.includes(value), `Campus Setting dropdown should include ${value}`);
  });
});

suite.test('core tracker status columns keep dropdown validations', () => {
  setupWorkbook();
  CollegeTools.Trackers.setupAllTrackers();

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  const st = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);

  suite.assert(fa.getRange(2, CollegeTools.Utils.colIndex(fa, 'CSS Profile Required (Y/N)')).getDataValidation(),
    'Financial Aid CSS required column should have validation');
  suite.assert(cv.getRange(2, CollegeTools.Utils.colIndex(cv, 'Visit Type (In-Person/Virtual/College Fair)')).getDataValidation(),
    'Campus Visit type column should have validation');
  suite.assert(st.getRange(2, CollegeTools.Utils.colIndex(st, 'Application Status')).getDataValidation(),
    'Status tracker application status should have validation');
});

suite.test('select audited dropdowns include flexible Other options where intended', () => {
  setupWorkbook();
  CollegeTools.Trackers.setupAllTrackers();
  CollegeTools.Formatting.enhanceFormatsDropdowns({suppressAlert: true});

  var fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  var cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  var at = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  var st = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
  var sc = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);

  suite.assert(fa.getRange(2, CollegeTools.Utils.colIndex(fa, 'Appeal Status')).getDataValidation().options.includes('Other'),
    'Appeal Status should include Other');
  suite.assert(cv.getRange(2, CollegeTools.Utils.colIndex(cv, 'Visit Type (In-Person/Virtual/College Fair)')).getDataValidation().options.includes('Other'),
    'Visit Type should include Other');
  suite.assert(at.getRange(2, CollegeTools.Utils.colIndex(at, 'Application Type (ED/ED2/EA/REA/RD)')).getDataValidation().options.includes('Other'),
    'Application Type should include Other');
  suite.assert(st.getRange(2, CollegeTools.Utils.colIndex(st, 'Decision/Result')).getDataValidation().options.includes('Other'),
    'Decision/Result should include Other');
  suite.assert(sc.getRange(2, CollegeTools.Utils.colIndex(sc, 'Type (Merit/Need/Field/Local/National)')).getDataValidation().options.includes('Other'),
    'Scholarship type should include Other');
});

suite.test('repair validations helper runs without changing coverage targets', () => {
  setupWorkbook();
  var result = CollegeTools.Formatting.repairValidationsAndFormatting({suppressAlert: true});
  suite.assert(result.ok, 'Repair validations helper should succeed');
  suite.assert(result.sectionsApplied.length >= 5, 'Repair should touch multiple sheets');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
