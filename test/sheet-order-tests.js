/**
 * Canonical workbook tab-order tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
]);
const {CollegeTools, mockSpreadsheet, resetSheets} = harness;
const suite = new TestSuite();

suite.test('canonical ordering prioritizes workflow tabs and preserves custom and hidden sheets', () => {
  resetSheets();
  const names = CollegeTools.Config.SHEET_NAMES;
  const scrambled = [
    names.TASK_SETTINGS,
    names.LOOKUP,
    names.TRAVEL_PLANNER,
    names.THIS_WEEK,
    names.WEIGHTS,
    names.COLLEGES,
    names.APPLICATION_TIMELINE,
    names.TASKS,
    names.INSTRUCTIONS,
    names.STATUS_TRACKER,
    names.DASHBOARD,
    names.FINANCIAL_AID,
    names.SCHOLARSHIP_TRACKER,
    names.CAMPUS_VISIT,
    names.RECRUITING_TRACKER,
    names.PERSONAL_PROFILE,
    names.API_KEY,
  ];
  scrambled.forEach((name) => mockSpreadsheet.insertSheet(name));
  const templates = mockSpreadsheet.insertSheet(names.TASK_TEMPLATES);
  templates.hideSheet();
  const custom = mockSpreadsheet.insertSheet('Family Notes');
  mockSpreadsheet.setActiveSheet(custom);

  const result = CollegeTools.Utils.applyCanonicalSheetOrder(mockSpreadsheet);
  const visibleNames = mockSpreadsheet.getSheets()
    .filter((sheet) => !sheet.isSheetHidden())
    .map((sheet) => sheet.getName());
  const expectedKnown = CollegeTools.Config.SHEET_ORDER
    .filter((name) => name !== names.TASK_TEMPLATES);

  suite.assert(result.ok, 'Canonical ordering should return a successful result');
  suite.assertEqual(visibleNames.slice(0, expectedKnown.length).join(','), expectedKnown.join(','),
    'Known visible sheets should follow the workflow-first canonical order');
  suite.assert(visibleNames.includes('Family Notes'), 'Custom sheets should be preserved');
  suite.assertEqual(mockSpreadsheet.getActiveSheet().getName(), 'Family Notes',
    'Reordering should restore the previously active sheet');
  suite.assert(templates.isSheetHidden(), 'Internal Task Templates should remain hidden');

  const second = CollegeTools.Utils.applyCanonicalSheetOrder(mockSpreadsheet);
  suite.assertEqual(second.moved, 0, 'Reapplying an established order should be idempotent');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
