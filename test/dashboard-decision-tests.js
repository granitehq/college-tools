/**
 * Dashboard decision-view and deadline aggregation tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'formulas.js',
  'schema.js',
  'dashboard.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook} = harness;
const suite = new TestSuite();

function col(sheet, header, headerRow) {
  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(header) + 1;
}

suite.test('dashboard aggregates dated tracker items due in the next 60 days', () => {
  setupWorkbook();
  const timeline = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  const financial = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const scholarship = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);

  timeline.getRange(2, col(timeline, 'College Name', 1)).setValue('Alpha University');
  timeline.getRange(2, col(timeline, 'Application Deadline', 1)).setValue(new Date('2026-07-20T00:00:00'));
  timeline.getRange(2, col(timeline, 'Completion Status (%)', 1)).setValue(80);
  timeline.getRange(3, col(timeline, 'College Name', 1)).setValue('Beta College');
  timeline.getRange(3, col(timeline, 'Enrollment Deposit Deadline', 1)).setValue(new Date('2026-09-20T00:00:00'));

  financial.getRange(2, col(financial, 'College Name', 1)).setValue('Alpha University');
  financial.getRange(2, col(financial, 'FAFSA Deadline', 1)).setValue(new Date('2026-07-12T00:00:00'));
  financial.getRange(2, col(financial, 'FAFSA Submitted (Y/N)', 1)).setValue('Y');

  scholarship.getRange(2, col(scholarship, 'Scholarship Name', 1)).setValue('Local STEM Grant');
  scholarship.getRange(2, col(scholarship, 'Deadline', 1)).setValue(new Date('2026-07-10T00:00:00'));
  scholarship.getRange(2, col(scholarship, 'Award Status (Pending/Awarded/Declined)', 1)).setValue('Pending');

  CollegeTools.Dashboard.refreshDashboard({today: new Date('2026-07-05T00:00:00'), suppressAlert: true});
  const dashboard = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD);

  suite.assertEqual(dashboard.getRange(31, 1).getValue(), "What's Due Next",
    'Dashboard should include a due-next section');
  suite.assertEqual(dashboard.getRange(33, 1).getValue(), 'College/Source',
    'Due-next table should expose the source college or scholarship');
  suite.assertEqual(dashboard.getRange(34, 1).getValue(), 'Local STEM Grant',
    'Due-next table should sort the soonest dated item first');
  suite.assertEqual(dashboard.getRange(34, 2).getValue(), 'Scholarship Tracker: Deadline',
    'Due-next rows should name the source tracker and date field');
  suite.assertEqual(dashboard.getRange(35, 1).getValue(), 'Alpha University',
    'Financial deadline should be included in sorted due-next rows');
  suite.assertEqual(dashboard.getRange(35, 5).getValue(), 'Yes',
    'Done column should reflect submitted financial aid requirements');
  suite.assertEqual(dashboard.getRange(36, 4).getValue(), 15,
    'Days-left column should be computed from the dashboard refresh date');
  suite.assertEqual(dashboard.getRange(37, 1).getValue(), '',
    'Dates outside the next 60 days should be excluded');
});

suite.test('dashboard compares accepted offers side by side', () => {
  setupWorkbook();
  const colleges = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
  const status = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
  const financial = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);

  colleges.getRange(3, col(colleges, 'College Name', 2)).setValue('Alpha University');
  colleges.getRange(3, col(colleges, 'Weighted Score', 2)).setValue(4.7);
  colleges.getRange(4, col(colleges, 'College Name', 2)).setValue('Beta College');
  colleges.getRange(4, col(colleges, 'Weighted Score', 2)).setValue(4.1);

  status.getRange(2, col(status, 'College Name', 1)).setValue('Alpha University');
  status.getRange(2, col(status, 'Decision/Result', 1)).setValue('Accepted');
  status.getRange(3, col(status, 'College Name', 1)).setValue('Beta College');
  status.getRange(3, col(status, 'Decision/Result', 1)).setValue('Denied');

  financial.getRange(2, col(financial, 'College Name', 1)).setValue('Alpha University');
  financial.getRange(2, col(financial, 'Out-of-Pocket Cost', 1)).setValue(22000);
  financial.getRange(2, col(financial, '4-Year Projected Cost', 1)).setValue(94000);
  financial.getRange(2, col(financial, 'Subsidized Loans', 1)).setValue(3500);
  financial.getRange(2, col(financial, 'Unsubsidized Loans', 1)).setValue(2000);
  financial.getRange(2, col(financial, 'Parent PLUS Loans', 1)).setValue(4000);

  CollegeTools.Dashboard.refreshDashboard({today: new Date('2026-07-05T00:00:00'), suppressAlert: true});
  const dashboard = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD);

  suite.assertEqual(dashboard.getRange(52, 1).getValue(), 'Accepted Offer Comparison',
    'Dashboard should include an accepted-offer comparison section');
  suite.assertEqual(dashboard.getRange(54, 1).getValue(), 'College',
    'Offer comparison should include a table header');
  suite.assertEqual(dashboard.getRange(55, 1).getValue(), 'Alpha University',
    'Accepted schools should be listed in the offer comparison table');
  suite.assertEqual(dashboard.getRange(55, 2).getValue(), 22000,
    'Offer comparison should show real net annual cost from the award tracker');
  suite.assertEqual(dashboard.getRange(55, 3).getValue(), 94000,
    'Offer comparison should show four-year projected cost');
  suite.assertEqual(dashboard.getRange(55, 4).getValue(), 38000,
    'Offer comparison should project loan burden at graduation from annual offered loans');
  suite.assertEqual(dashboard.getRange(55, 5).getValue(), 4.7,
    'Offer comparison should include the college weighted score');
  suite.assertEqual(dashboard.getRange(56, 1).getValue(), '',
    'Non-accepted schools should not appear in the offer comparison');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
