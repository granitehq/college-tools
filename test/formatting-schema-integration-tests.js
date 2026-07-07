/**
 * Formatting/schema integration guardrail tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'formatting.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();

suite.test('formatting uses schema row conventions for known sheets when headerRow is omitted', () => {
  const {colleges} = setupWorkbook();
  const programFitCol = getCollegeColumn('Program Fit (1-5)', colleges);

  CollegeTools.Formatting.validateList(colleges, 'Program Fit (1-5)', ['1', '2', '3', '4', '5']);

  suite.assert(colleges.getRange(3, programFitCol).getDataValidation(),
    'Colleges row-2 headers should be resolved from schema without a caller-supplied header row');
});

suite.test('enhanceFormatsDropdowns clears stray validation left on plain data columns', () => {
  const {colleges} = setupWorkbook();
  const accCol = getCollegeColumn('Acceptance Rate', colleges);
  const typeCol = getCollegeColumn('Type (Public/Private)', colleges);

  // Simulate a leaked dropdown rule (e.g. from a botched column insert)
  // ending up bound to a plain numeric column instead of its intended one.
  const strayRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Public', 'Private (nonprofit)', 'Private (for-profit)', 'Other'], true)
    .build();
  colleges.getRange(3, accCol).setDataValidation(strayRule);

  CollegeTools.Formatting.enhanceFormatsDropdowns({suppressAlert: true});

  suite.assertEqual(colleges.getRange(3, accCol).getDataValidation(), null,
    'Acceptance Rate should never carry a dropdown rule — stray validation must be cleared on repair');
  suite.assert(colleges.getRange(3, typeCol).getDataValidation(),
    'Type should still get its own dropdown validation after the clear-and-reapply pass');
});

suite.test('enhanceFormatsDropdowns makes every row consistent for tracker date columns', () => {
  setupWorkbook();
  const at = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  const atHdrs = at.getRange(1, 1, 1, at.getLastColumn()).getValues()[0];
  const honorsCol = atHdrs.indexOf('Other Deadline 1 Date') + 1;

  // Simulate row 3 missing the date validation that every other row has —
  // e.g. from a column that was only ever set up by hand, inconsistently.
  at.getRange(2, honorsCol).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  at.getRange(3, honorsCol).setDataValidation(null);

  CollegeTools.Formatting.enhanceFormatsDropdowns({suppressAlert: true});

  suite.assert(at.getRange(3, honorsCol).getDataValidation(),
    'Every row should get the same Other Deadline 1 Date validation after repair, ' +
    'not just the rows that happened to have it already');
});

suite.test('enhanceFormatsDropdowns attaches cost-context notes to Colleges and Financial Aid headers', () => {
  const {colleges} = setupWorkbook();
  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const netPriceCol = getCollegeColumn('Estimated Net Price', colleges);
  const totalCostCol = getCollegeColumn('Total Cost of Attendance', colleges);
  const faHdrs = fa.getRange(1, 1, 1, fa.getLastColumn()).getValues()[0];
  const efcCol = faHdrs.indexOf('EFC (Expected Family Contribution)') + 1;
  const netAfterAidCol = faHdrs.indexOf('Net Price After Aid') + 1;

  CollegeTools.Formatting.enhanceFormatsDropdowns({suppressAlert: true});

  suite.assert(colleges.getRange(2, netPriceCol).getNote().indexOf('national benchmark') !== -1,
    'Estimated Net Price header should clarify it is a school-wide average, not household-specific');
  suite.assert(colleges.getRange(2, totalCostCol).getNote().indexOf('College Scorecard') !== -1,
    'Total Cost of Attendance header should cite its federal data source');
  suite.assert(fa.getRange(1, efcCol).getNote().indexOf('Personal Profile') !== -1,
    'EFC header should clarify it comes from the household Personal Profile');
  suite.assert(fa.getRange(1, netAfterAidCol).getNote().indexOf('household-specific') !== -1,
    'Net Price After Aid header should distinguish itself from the Colleges sheet\'s national-average figure');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
