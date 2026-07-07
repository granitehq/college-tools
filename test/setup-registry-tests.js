/**
 * Setup and repair step registry tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'setup.js',
]);
const {CollegeTools} = harness;
const suite = new TestSuite();

suite.test('complete setup and repair use stable registry step order', () => {
  const completeIds = CollegeTools.Setup.getSetupStepDescriptors()
    .filter((step) => step.includeInCompleteSetup)
    .map((step) => step.id);
  const repairIds = CollegeTools.Setup.getSetupStepDescriptors()
    .filter((step) => step.includeInRepair)
    .map((step) => step.id);

  suite.assertEqual(completeIds.join(','),
    [
      'instructions',
      'trackers',
      'dashboard',
      'formatting',
      'scoring',
      'financial-profile',
      'travel-planner',
      'trim-sheets',
      'registration',
    ].join(','),
    'Complete Setup should use the expected registry order');

  suite.assertEqual(repairIds.join(','),
    [
      'tracker-sync',
      'validation-formatting',
      'regions',
      'travel-planner',
      'scoring',
      'timeline-formatting',
      'dashboard-refresh',
    ].join(','),
    'Repair Entire Workbook should use the expected registry order');
});

suite.test('optional setup step failure reports a warning while required failures make result fail', () => {
  const calls = [];
  const result = CollegeTools.Setup.runSetupSteps_([
    {
      id: 'optional-failure',
      label: 'Optional Failure',
      required: false,
      run: function() {
        calls.push('optional-failure');
        throw new Error('optional broke');
      },
    },
    {
      id: 'required-success',
      label: 'Required Success',
      required: true,
      run: function() {
        calls.push('required-success');
        return {ok: true, code: 'required_success', message: 'Required worked'};
      },
    },
    {
      id: 'required-failure',
      label: 'Required Failure',
      required: true,
      run: function() {
        calls.push('required-failure');
        return {ok: false, code: 'required_failed', message: 'Required failed'};
      },
    },
  ]);

  suite.assertEqual(calls.join(','), 'optional-failure,required-success,required-failure',
    'Step runner should continue through optional failures and later required steps');
  suite.assert(!result.ok, 'A required failed step should make the aggregate result fail');
  suite.assertEqual(result.warnings.length, 1, 'Optional failure should be reported as a warning');
  suite.assert(result.warnings[0].indexOf('Optional Failure') !== -1,
    'Optional warning should include the step label');
  suite.assertEqual(result.details.steps.length, 3, 'Step result details should include every attempted step');
  suite.assertEqual(result.details.steps[2].code, 'required_failed',
    'Required failure details should preserve the step result code');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
