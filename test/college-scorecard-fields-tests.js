/**
 * College Scorecard field mapping tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'formulas.js',
  'schema.js',
  'trackers.js',
  'colleges.js',
]);
const {CollegeTools, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();

suite.test('Colleges headers include test policy and residency-aware tuition fields', () => {
  const headers = CollegeTools.Config.HEADERS.COLLEGES;

  suite.assert(headers.includes('Test Optional'), 'Colleges should expose a Test Optional column');
  suite.assert(headers.includes('In-State Tuition'), 'Colleges should expose in-state tuition');
  suite.assert(headers.includes('Out-of-State Tuition'), 'Colleges should expose out-of-state tuition');
  suite.assert(headers.includes('Applicable Tuition'), 'Colleges should expose the tuition that applies to the family');
  suite.assert(headers.includes('Typical Debt at Graduation'), 'Colleges should expose typical debt at graduation');
  suite.assert(headers.includes('Pell Grant Rate'), 'Colleges should expose Pell Grant Rate');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.cost.tuition.in_state'),
    'Scorecard API fields should request in-state tuition');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.cost.tuition.out_of_state'),
    'Scorecard API fields should request out-of-state tuition');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.admissions.test_requirements'),
    'Scorecard API fields should request test policy data');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.aid.median_debt.completers.overall'),
    'Scorecard API fields should request typical debt');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.aid.pell_grant_rate'),
    'Scorecard API fields should request Pell Grant Rate');
});

suite.test('fillCollegeRow writes test policy and residency-aware tuition fields', () => {
  const {colleges} = setupWorkbook();
  colleges.getRange(3, getCollegeColumn('College Name', colleges)).setValue('State Flagship');

  CollegeTools.Scorecard = {
    fetchCollegeData() {
      return {
        ok: true,
        data: {
          'school.name': 'State Flagship',
          'school.city': 'Austin',
          'school.state': 'TX',
          'school.ownership': 1,
          'school.school_url': 'https://example.edu',
          'latest.cost.tuition.in_state': 11000,
          'latest.cost.tuition.out_of_state': 36000,
          'latest.admissions.test_requirements': 5,
          'latest.aid.median_debt.completers.overall': 18500,
          'latest.aid.pell_grant_rate': 0.28,
        },
      };
    },
    typeFromOwnership() {
      return 'Public';
    },
  };
  CollegeTools.Trackers.syncCollegeToTrackers = function() {};

  colleges.setActiveRow(3);
  CollegeTools.Colleges.fillCollegeRow();

  suite.assertEqual(colleges.getRange(3, getCollegeColumn('Test Optional', colleges)).getValue(), 'Yes',
    'Test policy code should map to a family-friendly Test Optional value');
  suite.assertEqual(colleges.getRange(3, getCollegeColumn('In-State Tuition', colleges)).getValue(), 11000,
    'In-state tuition should be written from the flattened Scorecard key');
  suite.assertEqual(colleges.getRange(3, getCollegeColumn('Out-of-State Tuition', colleges)).getValue(), 36000,
    'Out-of-state tuition should be written from the flattened Scorecard key');
  suite.assertEqual(colleges.getRange(3, getCollegeColumn('Applicable Tuition', colleges)).getFormula(),
    '=IF(State_Residency=C3,AC3,AD3)',
    'Applicable tuition should compare State_Residency with the school state');
  suite.assertEqual(colleges.getRange(3, getCollegeColumn('Typical Debt at Graduation', colleges)).getValue(), 18500,
    'Typical debt should be written from the flattened Scorecard key');
  suite.assertEqual(colleges.getRange(3, getCollegeColumn('Pell Grant Rate', colleges)).getValue(), 0.28,
    'Pell Grant Rate should be written from the flattened Scorecard key');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
