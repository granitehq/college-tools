/**
 * Schema/config snapshot tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness(['config.js']);
const {CollegeTools} = harness;
const suite = new TestSuite();

suite.test('sheet names snapshot stays stable', () => {
  const expected = {
    INSTRUCTIONS: 'Instructions',
    COLLEGES: 'Colleges',
    API_KEY: 'ScorecardAPIKey',
    WEIGHTS: 'Weights',
    PERSONAL_PROFILE: 'Personal Profile',
    LOOKUP: 'Lookup',
    FINANCIAL_AID: 'Financial Aid Tracker',
    CAMPUS_VISIT: 'Campus Visit Tracker',
    APPLICATION_TIMELINE: 'Application Timeline',
    SCHOLARSHIP_TRACKER: 'Scholarship Tracker',
    STATUS_TRACKER: 'Application Status Tracker',
    DASHBOARD: 'Dashboard',
  };

  Object.keys(expected).forEach((key) => {
    suite.assertEqual(CollegeTools.Config.SHEET_NAMES[key], expected[key],
      `Sheet name ${key} should stay stable`);
  });
});

suite.test('critical Colleges headers snapshot stays stable', () => {
  const expected = [
    'College Name', 'City', 'State', 'Region', 'Type (Public/Private)',
    'Acceptance Rate', 'First-Year Retention', 'Grad Rate', 'Median Earnings (10yr)',
    'Total Cost of Attendance', 'Estimated Net Price', 'Link',
    'SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%',
    'Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)',
    'Safety (1-5)', 'Campus Culture Fit (1-5)', 'Weather Fit (1-5)',
    'Clubs/Activities (1-5)', 'Personal Priority (1-5)',
    'Weighted Score', 'Admission Fit', 'Campus Setting', 'Test Optional',
    'In-State Tuition', 'Out-of-State Tuition', 'Applicable Tuition',
    'Typical Debt at Graduation', 'Pell Grant Rate', 'Notes',
  ];

  suite.assertEqual(JSON.stringify(CollegeTools.Config.HEADERS.COLLEGES), JSON.stringify(expected),
    'Colleges headers should not drift unexpectedly');
});

suite.test('formula-dependent fields remain present', () => {
  const collegeHeaders = CollegeTools.Config.HEADERS.COLLEGES;
  const finAidHeaders = CollegeTools.Config.HEADERS.FINANCIAL_AID;
  const statusHeaders = CollegeTools.Config.HEADERS.STATUS_TRACKER;

  ['Weighted Score', 'Admission Fit', 'Applicable Tuition']
    .forEach((header) => {
      suite.assert(collegeHeaders.includes(header), `${header} should remain in Colleges`);
    });

  ['Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost',
    'Financial Safety', '4-Year Burden', 'Aid Requirements Complete']
    .forEach((header) => {
      suite.assert(finAidHeaders.includes(header), `${header} should remain in Financial Aid`);
    });

  ['Documents Complete', 'Decision/Result', 'Application Status']
    .forEach((header) => {
      suite.assert(statusHeaders.includes(header), `${header} should remain in Status Tracker`);
    });
});

suite.test('default weights and API field config remain non-empty', () => {
  suite.assert(CollegeTools.Config.DEFAULT_WEIGHTS.length > 0,
    'Default weights should be populated');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('school.name'),
    'API field list should include school.name');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.cost.attendance.academic_year'),
    'API field list should include total cost');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.cost.tuition.in_state'),
    'API field list should include in-state tuition');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.admissions.test_requirements'),
    'API field list should include test policy');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.aid.median_debt.completers.overall'),
    'API field list should include typical debt');
  suite.assert(CollegeTools.Config.API_FIELDS.includes('latest.aid.pell_grant_rate'),
    'API field list should include Pell Grant Rate');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
