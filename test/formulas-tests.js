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

suite.test('admissionFit builds a single Reach/Match/Likely formula from SAT, ACT, and GPA', () => {
  const formula = CollegeTools.Formulas.admissionFit({
    sat25: 'M3', sat75: 'N3', act25: 'O3', act75: 'P3', acceptance: 'F3',
  });

  suite.assert(formula.startsWith('='), 'Formula should be a valid spreadsheet formula');
  suite.assert(formula.includes('SAT_Score'), 'Formula should reference the SAT_Score named range');
  suite.assert(formula.includes('ACT_Score'), 'Formula should fall back to the ACT_Score named range');
  suite.assert(formula.includes('GPA'), 'Formula should apply the GPA adjustment');
  suite.assert(formula.includes('"Reach"') && formula.includes('"Match"') && formula.includes('"Likely"'),
    'Formula should produce exactly the three Reach/Match/Likely categories');
  suite.assert(formula.includes('0.15'), 'Formula should cap sub-15% acceptance schools as Reach regardless of score');
  suite.assert(formula.includes('"Test Optional"'), 'Formula should report Test Optional when the school has no score bands');
  suite.assert(formula.includes('"Enter SAT/ACT"'), 'Formula should prompt for a score when neither is entered');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
