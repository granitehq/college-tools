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
  suite.assertEqual(CollegeTools.Formulas.efcPrefill(),
    '=IFERROR(IF(EFC="","",EFC), "")', 'EFC prefill should match current tracker behavior');
  suite.assertEqual(CollegeTools.Formulas.netPriceAfterAid('L2', 'N2', 'O2'),
    '=IFERROR(L2-SUM(N2:O2), "")', 'Net price formula should match current tracker behavior');
  suite.assertEqual(CollegeTools.Formulas.outOfPocketCost('AC2', 'X2'),
    '=IFERROR(AC2-X2, "")', 'Out-of-pocket formula should subtract outside scholarships');
  suite.assertEqual(CollegeTools.Formulas.travelCostsLookup('A2', 'L'),
    '=IFERROR(INDEX(\'Travel Planner\'!L:L,MATCH(A2,\'Travel Planner\'!A:A,0)), "")',
    'Travel cost formula should look up annual travel estimate by college name');
  suite.assertEqual(CollegeTools.Formulas.fourYearProjectedCost('AD2'),
    '=IFERROR(AD2*(1+1.03+1.03^2+1.03^3), "")',
    'Four-year projected cost formula should preserve current inflation calculation');
  suite.assertEqual(CollegeTools.Formulas.aidRequirementsComplete({
    fafsaSubmitted: 'F2',
    cssStatus: 'P2',
    idocStatus: 'Q2',
    verificationStatus: 'R2',
  }), '=IF(AND(F2="Y",OR(P2="Not Required",P2="Submitted"),OR(Q2="Not Required",Q2="Submitted"),OR(R2="Not Required",R2="Submitted",R2="")),"✅ Complete","⚠️ Pending")',
  'Aid requirements formula should preserve strict CSS/IDOC and lenient verification behavior');
});

suite.test('formulas build timeline and status tracker formulas from supplied cell references', () => {
  suite.assertEqual(CollegeTools.Formulas.daysUntilDeadline('E2'),
    '=IF(ISNUMBER(E2), IF(E2-TODAY()>0, E2-TODAY(), "PAST DUE"), "")',
    'Days-until-deadline formula should keep blank deadlines blank');
  suite.assertEqual(CollegeTools.Formulas.documentsComplete('C2', 'F2'),
    '=COUNTIF(C2:F2,"Y")&"/"&COUNTA(C2:F2)&IF(COUNTIF(C2:F2,"N")=0," ✅"," ⚠️")',
    'Documents complete formula should preserve current Y/N count behavior');
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
