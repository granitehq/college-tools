/**
 * Instructions sheet content tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'instructions.js',
]);
const {CollegeTools, mockSpreadsheet} = harness;
const suite = new TestSuite();

function renderedLines() {
  CollegeTools.Instructions.createInstructionsSheet();
  const sheet = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.INSTRUCTIONS);
  const lines = [];
  const lastRow = sheet.getLastRow();
  for (let r = 1; r <= lastRow; r++) {
    const value = sheet.getRange(r, 1).getValue();
    if (value) lines.push(value);
  }
  return lines;
}

suite.test('Instructions sheet points readers to scholarship discovery resources', () => {
  const lines = renderedLines();
  const hasPointer = lines.some((line) => /where to find scholarships/i.test(line));
  suite.assert(hasPointer, 'Expected a "Where to find scholarships" pointer line');

  const named = ['Fastweb', 'Scholarships.com', 'Going Merry'];
  named.forEach((site) => {
    const mentioned = lines.some((line) => line.indexOf(site) !== -1);
    suite.assert(mentioned, `Expected scholarship pointer list to mention ${site}`);
  });
});


suite.test('Instructions describe optional Travel Planner fields', () => {
  CollegeTools.Instructions.createInstructionsSheet();
  const instructions = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.INSTRUCTIONS);
  const values = instructions.getRange(1, 1, instructions.getLastRow(), 1).getValues()
    .map((row) => row[0]).join('\n');

  suite.assert(values.includes('Home City'), 'Instructions should mention Home City');
  suite.assert(values.includes('Travel Planner'), 'Instructions should mention Travel Planner');
  suite.assert(values.includes('offline approximations'),
    'Instructions should disclose that travel estimates are approximate');
});

suite.test('Complete Setup can skip rebuilding current Instructions', () => {
  CollegeTools.Instructions.createInstructionsSheet({suppressAlert: true});
  const instructions = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.INSTRUCTIONS);
  instructions.resetCallCounts();

  const result = CollegeTools.Instructions.createInstructionsSheet({
    suppressAlert: true,
    skipIfCurrent: true,
  });

  suite.assert(result.skipped, 'Current version marker should skip the rebuild');
  suite.assertEqual(instructions.callCounts.setValue, 0,
    'Skipped Instructions should not issue line-by-line writes');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
