/**
 * Formula builder guardrail tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'formulas.js',
]);
const {CollegeTools} = harness;
const suite = new TestSuite();

suite.test('formulas quote sheet names with spaces and apostrophes', () => {
  suite.assertEqual(CollegeTools.Formulas.sheetRef('Application Status Tracker'),
    "'Application Status Tracker'", 'Sheet names with spaces should be quoted');
  suite.assertEqual(CollegeTools.Formulas.sheetRef("Parent's List"),
    "'Parent''s List'", 'Sheet names with apostrophes should be escaped');
});

suite.test('formulas build financial tracker formulas from supplied cell references', () => {
  suite.assertEqual(CollegeTools.Formulas.netPriceAfterAid('L2', 'N2', 'O2'),
    '=IFERROR(L2-SUM(N2:O2), "")', 'Net price formula should match current tracker behavior');
  suite.assertEqual(CollegeTools.Formulas.outOfPocketCost('AC2', 'X2'),
    '=IFERROR(AC2-X2, "")', 'Out-of-pocket formula should subtract outside scholarships');
  suite.assertEqual(CollegeTools.Formulas.fourYearProjectedCost('AD2'),
    '=IFERROR(AD2*(1+1.03+1.03^2+1.03^3), "")',
    'Four-year projected cost formula should preserve current inflation calculation');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
