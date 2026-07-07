/**
 * Template/sample replacement integrity tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'execution-budget.js',
  'formatting.js',
  'trackers.js',
  'colleges.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;

const observedBudgets = [];
CollegeTools.Scorecard = {
  fetchCollegeData(name, options) {
    observedBudgets.push(options && options.executionBudget);
    const state = name === 'Second' ? 'NY' : 'CA';
    const locale = name === 'Second' ? 41 : 21;
    return {
      ok: true,
      data: {
        'school.name': `${name} University`,
        'school.city': `${name} City`,
        'school.state': state,
        'school.locale': locale,
        'school.school_url': `${name.toLowerCase()}.edu`,
        'school.ownership': 1,
        'latest.admissions.admission_rate.overall': 0.4,
        'latest.student.retention_rate.four_year.full_time': 0.85,
        'latest.completion.rate_suppressed.overall': 0.75,
        'latest.earnings.10_yrs_after_entry.median': 70000,
        'latest.cost.attendance.academic_year': 40000,
        'latest.cost.avg_net_price.overall': 25000,
        'latest.admissions.sat_scores.25th_percentile.math': 600,
        'latest.admissions.sat_scores.25th_percentile.critical_reading': 610,
        'latest.admissions.sat_scores.75th_percentile.math': 700,
        'latest.admissions.sat_scores.75th_percentile.critical_reading': 710,
        'latest.admissions.act_scores.25th_percentile.cumulative': 27,
        'latest.admissions.act_scores.75th_percentile.cumulative': 32,
      },
    };
  },
  typeFromOwnership(code) {
    return code === 1 ? 'Public' : '';
  },
};

const suite = new TestSuite();

suite.test('filling the same row twice replaces canonical tracker college names', () => {
  const {colleges} = setupWorkbook({includeCampusSetting: true});
  const regionCol = getCollegeColumn('Region', colleges);
  const campusSettingCol = getCollegeColumn('Campus Setting', colleges);

  colleges.getRange(3, 1).setValue('First');
  CollegeTools.Colleges.fillCollegeRow();

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  suite.assertEqual(fa.getRange(2, 1).getValue(), 'First University',
    'First fill should seed tracker row');
  suite.assertEqual(colleges.getRange(3, regionCol).getValue(), 'West',
    'First fill should compute region');
  suite.assertEqual(colleges.getRange(3, campusSettingCol).getValue(), 'Suburban',
    'First fill should compute Campus Setting');

  colleges.getRange(3, 1).setValue('Second');
  CollegeTools.Colleges.fillCollegeRow();

  suite.assertEqual(fa.getRange(2, 1).getValue(), 'Second University',
    'Second fill should replace tracker name in the same row');
  suite.assertEqual(colleges.getRange(3, regionCol).getValue(), 'Northeast',
    'Second fill should replace region instead of leaving stale data');
  suite.assertEqual(colleges.getRange(3, campusSettingCol).getValue(), 'Rural',
    'Second fill should replace Campus Setting instead of leaving stale data');
});

suite.test('batch fill keeps tracker sync enabled', () => {
  const {colleges} = setupWorkbook();
  colleges.getRange(3, 1).setValue('First');
  colleges.getRange(4, 1).setValue('Second');

  colleges.getActiveRangeList = function() {
    return {
      getRanges: function() {
        return [{
          getRow: function() { return 3; },
          getNumRows: function() { return 2; },
        }];
      },
    };
  };

  CollegeTools.Colleges.fillSelectedRows();

  const cv = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
  suite.assertEqual(cv.getRange(2, 1).getValue(), 'First University',
    'Batch fill should sync the first tracker row');
  suite.assertEqual(cv.getRange(3, 1).getValue(), 'Second University',
    'Batch fill should sync the second tracker row');
});

suite.test('batch fill passes one shared execution budget through row fetches', () => {
  observedBudgets.length = 0;
  const {colleges} = setupWorkbook();
  colleges.getRange(3, 1).setValue('First');
  colleges.getRange(4, 1).setValue('Second');

  colleges.getActiveRangeList = function() {
    return {
      getRanges: function() {
        return [{
          getRow: function() { return 3; },
          getNumRows: function() { return 2; },
        }];
      },
    };
  };

  CollegeTools.Colleges.fillSelectedRows();

  suite.assertEqual(observedBudgets.length, 2, 'Both row fetches should receive a budget');
  suite.assert(observedBudgets[0], 'First row fetch should receive an execution budget');
  suite.assertEqual(observedBudgets[0], observedBudgets[1], 'Batch rows should share one budget instance');
  suite.assertEqual(typeof observedBudgets[0].canContinue, 'function', 'Budget should expose canContinue');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
