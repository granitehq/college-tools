/**
 * Schema metadata guardrail tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, ensureSheetWithHeaders, resetSheets} = harness;
const suite = new TestSuite();

suite.test('schema declares row conventions for Colleges and tracker sheets', () => {
  const colleges = CollegeTools.Schema.getSheet('COLLEGES');
  const financialAid = CollegeTools.Schema.getSheet('FINANCIAL_AID');
  const campusVisit = CollegeTools.Schema.getSheet('CAMPUS_VISIT');
  const applicationTimeline = CollegeTools.Schema.getSheet('APPLICATION_TIMELINE');
  const statusTracker = CollegeTools.Schema.getSheet('STATUS_TRACKER');
  const scholarshipTracker = CollegeTools.Schema.getSheet('SCHOLARSHIP_TRACKER');

  suite.assertEqual(colleges.headerRow, 2, 'Colleges headers should stay on row 2');
  suite.assertEqual(colleges.dataStartRow, 3, 'Colleges data should start on row 3');

  [financialAid, campusVisit, applicationTimeline, statusTracker, scholarshipTracker]
    .forEach((sheet) => {
      suite.assertEqual(sheet.headerRow, 1, `${sheet.sheetName} headers should stay on row 1`);
      suite.assertEqual(sheet.dataStartRow, 2, `${sheet.sheetName} data should start on row 2`);
    });
});


suite.test('schema declares Travel Planner row convention and key columns', () => {
  const travelPlanner = CollegeTools.Schema.getSheet('TRAVEL_PLANNER');
  suite.assertEqual(travelPlanner.sheetName, CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER,
    'Travel Planner schema should use configured sheet name');
  suite.assertEqual(travelPlanner.headerRow, 1, 'Travel Planner headers should be on row 1');
  suite.assertEqual(travelPlanner.dataStartRow, 2, 'Travel Planner data should start on row 2');
  suite.assertEqual(travelPlanner.columns.COLLEGE_NAME, 'College Name', 'College Name key should exist');
  suite.assertEqual(travelPlanner.columns.ANNUAL_TRAVEL_COST, 'Annual Travel Cost',
    'Annual Travel Cost key should exist');
});

suite.test('schema maps stable column keys to current Config headers', () => {
  suite.assertEqual(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_NAME'), 'College Name',
    'College name key should resolve to the current Colleges header');
  suite.assertEqual(CollegeTools.Schema.header('COLLEGES', 'NET_PRICE'), 'Estimated Net Price',
    'Net price key should resolve to the current Colleges header');
  suite.assertEqual(CollegeTools.Schema.header('COLLEGES', 'TYPICAL_DEBT'), 'Typical Debt at Graduation',
    'Typical debt key should resolve to the current Colleges header');
  suite.assertEqual(CollegeTools.Schema.header('COLLEGES', 'PELL_GRANT_RATE'), 'Pell Grant Rate',
    'Pell Grant key should resolve to the current Colleges header');
  suite.assertEqual(CollegeTools.Schema.header('FINANCIAL_AID', 'FOUR_YEAR_PROJECTED_COST'),
    '4-Year Projected Cost', 'Financial Aid projected cost key should resolve');
  suite.assertEqual(CollegeTools.Schema.header('STATUS_TRACKER', 'DOCUMENTS_COMPLETE'),
    'Documents Complete', 'Status tracker documents key should resolve');
});

suite.test('schema declares ownership boundaries for preservation-sensitive columns', () => {
  suite.assert(CollegeTools.Schema.isUserColumn('COLLEGES', 'PROGRAM_FIT'),
    'Program Fit should be user-owned');
  suite.assert(CollegeTools.Schema.isFormulaColumn('COLLEGES', 'WEIGHTED_SCORE'),
    'Weighted Score should be formula-owned');
  suite.assert(CollegeTools.Schema.isFormulaColumn('COLLEGES', 'ADMISSION_FIT'),
    'Admission Fit should be formula-owned');
  suite.assert(CollegeTools.Schema.isApiColumn('COLLEGES', 'CITY'),
    'City should be API-owned');
  suite.assert(CollegeTools.Schema.isApiColumn('COLLEGES', 'TYPICAL_DEBT'),
    'Typical Debt should be API-owned');
  suite.assert(CollegeTools.Schema.isApiColumn('COLLEGES', 'PELL_GRANT_RATE'),
    'Pell Grant Rate should be API-owned');
  suite.assert(CollegeTools.Schema.isLinkedColumn('FINANCIAL_AID', 'TOTAL_COST'),
    'Financial Aid total cost should be tracker-linked from Colleges');
});

suite.test('schema workbook shape validation reports missing required headers', () => {
  const result = CollegeTools.Schema.validateHeaderRow('COLLEGES', [
    'College Name',
    'City',
    'State',
  ]);

  suite.assertEqual(result.ok, false, 'Validation should fail when required headers are missing');
  suite.assert(result.missingHeaders.includes('Estimated Net Price'),
    'Validation should report missing required headers by label');
});

suite.test("schema validates complete workbook shape and reports precise shape errors", () => {
  setupWorkbook();

  const okResult = CollegeTools.Schema.validateWorkbookShape(mockSpreadsheet);

  suite.assertEqual(okResult.ok, true, "Complete workbook should validate");
  suite.assertEqual(okResult.errors.length, 0, "Complete workbook should not report shape errors");

  resetSheets();
  ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.COLLEGES, ["College Name", "City"], 2);

  const badResult = CollegeTools.Schema.validateWorkbookShape(mockSpreadsheet);

  suite.assertEqual(badResult.ok, false, "Malformed workbook should fail validation");
  suite.assert(badResult.errors.some((error) => error.code === "missing_header" &&
    error.sheetName === CollegeTools.Config.SHEET_NAMES.COLLEGES &&
    error.header === "Estimated Net Price"),
  "Malformed Colleges sheet should report missing header details");
  suite.assert(badResult.errors.some((error) => error.code === "missing_sheet" &&
    error.sheetName === CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID),
  "Malformed workbook should report missing configured sheets");
});

suite.test("schema resolves actual workbook columns and A1 ranges from sheet metadata", () => {
  setupWorkbook();
  const colleges = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);

  suite.assertEqual(CollegeTools.Schema.columnIndex("COLLEGES", "NET_PRICE", colleges),
    CollegeTools.Config.HEADERS.COLLEGES.indexOf("Estimated Net Price") + 1,
    "Schema should resolve Colleges columns using row-2 headers");
  suite.assertEqual(CollegeTools.Schema.rangeA1("COLLEGES", "NET_PRICE", colleges, 1000), "K3:K1000",
    "Schema should build data ranges from the sheet data start row");
  const projectedCostCol = CollegeTools.Utils.columnToLetter(
    CollegeTools.Config.HEADERS.FINANCIAL_AID.indexOf("4-Year Projected Cost") + 1);
  suite.assertEqual(CollegeTools.Schema.rangeA1("FINANCIAL_AID", "FOUR_YEAR_PROJECTED_COST",
    mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID), 1000),
  projectedCostCol + "2:" + projectedCostCol + "1000",
  "Schema should build row-1 tracker data ranges from schema metadata");
});

const success = suite.summary();
process.exit(success ? 0 : 1);
