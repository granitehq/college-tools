/**
 * Runs the maintained test suites in a fixed order.
 */

const path = require('path');
const {spawnSync} = require('child_process');

const tests = [
  'regression-tests.js',
  'template-integrity-tests.js',
  'workbook-repair-tests.js',
  'config-schema-tests.js',
  'schema-metadata-tests.js',
  'formulas-tests.js',
  'scoring-tests.js',
  'instructions-tests.js',
  'college-scorecard-fields-tests.js',
  'dashboard-decision-tests.js',
  'formatting-schema-integration-tests.js',
  'menu-wiring-tests.js',
  'validation-coverage-tests.js',
  'syntax-tests.js',
];

let hasFailure = false;

tests.forEach((testFile) => {
  console.log(`\n=== ${testFile} ===`);
  const result = spawnSync(process.execPath, [path.join(__dirname, testFile)], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    hasFailure = true;
  }
});

process.exit(hasFailure ? 1 : 0);
