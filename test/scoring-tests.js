/**
 * Scoring module regression tests: schema-backed column lookup and batched
 * Visit Score formula writes.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'formatting.js',
  'formulas.js',
  'scoring.js',
]);
const {CollegeTools, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();

suite.test('ensureScoring resolves Colleges columns without Utils.colIndex2', () => {
  const {colleges} = setupWorkbook();
  const nameCol = getCollegeColumn('College Name', colleges);
  colleges.getRange(3, nameCol).setValue('Northwestern');
  const originalColIndex2 = CollegeTools.Utils.colIndex2;
  CollegeTools.Utils.colIndex2 = () => {
    throw new Error('colIndex2 should not be called by scoring.js anymore');
  };

  try {
    CollegeTools.Scoring.ensureScoring({suppressAlert: true});
  } finally {
    CollegeTools.Utils.colIndex2 = originalColIndex2;
  }

  const weightedScoreCol = getCollegeColumn('Weighted Score', colleges);
  const formula = colleges.getRange(3, weightedScoreCol).getFormula();
  suite.assert(formula && formula.indexOf('=IFERROR(') === 0,
    `Weighted Score formula should still be generated, got: ${formula}`);
});

suite.test('ensureScoring writes Visit Score formulas with a single batched setFormulas call', () => {
  setupWorkbook();
  const cv = harness.mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  cv.getRange(2, 1, 3, 1).setValues([['Northwestern'], ['Brown'], ['Duke']]);
  cv.resetCallCounts();

  CollegeTools.Scoring.ensureScoring({suppressAlert: true});

  suite.assertEqual(cv.callCounts.setFormula, 0,
    'Visit Score should not be written with per-row setFormula calls');
  suite.assertEqual(cv.callCounts.setFormulas, 1,
    'Visit Score should be written with exactly one batched setFormulas call');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
