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
const {CollegeTools, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();

suite.test('formatting uses schema row conventions for known sheets when headerRow is omitted', () => {
  const {colleges} = setupWorkbook();
  const programFitCol = getCollegeColumn('Program Fit (1-5)', colleges);

  CollegeTools.Formatting.validateList(colleges, 'Program Fit (1-5)', ['1', '2', '3', '4', '5']);

  suite.assert(colleges.getRange(3, programFitCol).getDataValidation(),
    'Colleges row-2 headers should be resolved from schema without a caller-supplied header row');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
