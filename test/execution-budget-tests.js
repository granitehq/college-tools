/**
 * Shared execution budget tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'execution-budget.js',
]);
const {CollegeTools} = harness;
const suite = new TestSuite();

suite.test('execution budget allows work before the limit and expires after it', () => {
  let now = 1000;
  const budget = CollegeTools.ExecutionBudget.start(500, () => now);

  suite.assertEqual(budget.canContinue(), true, 'Fresh budget should allow work');
  suite.assertEqual(budget.elapsedMs(), 0, 'Fresh budget should report zero elapsed time');

  now = 1499;
  suite.assertEqual(budget.canContinue(), true, 'Budget should allow work just before the limit');
  suite.assertEqual(budget.elapsedMs(), 499, 'Elapsed time should use the supplied clock');

  now = 1500;
  suite.assertEqual(budget.canContinue(), false, 'Budget should stop at the limit');
});

suite.test('execution budget uses configured API limit by default', () => {
  let now = 2000;
  const budget = CollegeTools.ExecutionBudget.start(null, () => now);

  now = 2000 + CollegeTools.Config.API_CONFIG.EXECUTION_TIME_LIMIT - 1;
  suite.assertEqual(budget.canContinue(), true, 'Default budget should use configured limit');

  now = 2000 + CollegeTools.Config.API_CONFIG.EXECUTION_TIME_LIMIT;
  suite.assertEqual(budget.canContinue(), false, 'Default budget should stop at configured limit');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
