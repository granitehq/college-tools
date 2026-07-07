/**
 * Header-layout migration regression tests.
 *
 * Guards the Application Timeline and Scholarship Tracker column collapses:
 * existing user data in a removed/renamed column must survive a setup/repair
 * rerun instead of being silently stranded under the wrong new header or
 * dropped outright.
 */
const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js', 'utils.js', 'schema.js', 'formulas.js',
  'formatting.js', 'financial.js', 'admissions.js', 'trackers.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook} = harness;
const suite = new TestSuite();
const C = CollegeTools.Config;

function writeOldHeadersAndRow(sh, oldHeaders, rowValues) {
  sh.getRange(1, 1, 1, oldHeaders.length).setValues([oldHeaders]);
  sh.getRange(2, 1, 1, rowValues.length).setValues([rowValues]);
}

function colOf(sh, header, headerRow) {
  const headers = sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getValues()[0];
  return headers.indexOf(header) + 1;
}

suite.test('Application Timeline migration moves Honors/Portfolio dates into Other Deadline slots', () => {
  setupWorkbook({});
  const at = mockSpreadsheet.getSheetByName(C.SHEET_NAMES.APPLICATION_TIMELINE);

  const oldHeaders = [
    'College Name', 'Application Type (ED/ED2/EA/REA/RD)', 'Application Opens', 'Application Deadline',
    'Test Score Deadline', 'Transcript Deadline', 'Counselor Rec Deadline', 'Teacher Rec Deadline',
    'FAFSA Opens', 'Merit Scholarship Deadline',
    'Honors Program Deadline', 'Portfolio/Audition Due', 'Mid-Year Report Due', 'Decision Release Date',
    'Student Visit Day', 'Housing Application Opens', 'Housing Deposit Due', 'Enrollment Deposit Deadline',
    'Orientation Registration Opens', 'Days Until Deadline (App)', 'Priority Level', 'Completion Status (%)',
  ];
  const honorsDate = new Date('2026-11-01T00:00:00');
  const portfolioDate = new Date('2026-12-01T00:00:00');
  const rowValues = oldHeaders.map((h) => {
    if (h === 'College Name') return 'Alpha University';
    if (h === 'Application Deadline') return new Date('2027-01-05T00:00:00');
    if (h === 'Honors Program Deadline') return honorsDate;
    if (h === 'Portfolio/Audition Due') return portfolioDate;
    if (h === 'Priority Level') return 'High';
    return '';
  });
  writeOldHeadersAndRow(at, oldHeaders, rowValues);

  CollegeTools.Trackers.setupAllTrackers();

  suite.assertEqual(at.getRange(1, 1, 1, C.HEADERS.APPLICATION_TIMELINE.length).getValues()[0].join('|'),
    C.HEADERS.APPLICATION_TIMELINE.join('|'), 'header row should be rewritten to the collapsed layout');

  const nameCol = colOf(at, 'College Name', 1);
  const other1Col = colOf(at, 'Other Deadline 1 Date', 1);
  const other2Col = colOf(at, 'Other Deadline 2 Date', 1);
  const priorityCol = colOf(at, 'Priority Level', 1);
  const appDeadlineCol = colOf(at, 'Application Deadline', 1);

  suite.assertEqual(at.getRange(2, nameCol).getValue(), 'Alpha University',
    'College Name should survive the migration');
  suite.assertEqual(at.getRange(2, other1Col).getValue().getTime(), honorsDate.getTime(),
    'Honors Program Deadline value should move into the first Other Deadline slot');
  suite.assertEqual(at.getRange(2, other2Col).getValue().getTime(), portfolioDate.getTime(),
    'Portfolio/Audition Due value should move into the second Other Deadline slot');
  suite.assertEqual(at.getRange(2, priorityCol).getValue(), 'High',
    'Unrelated surviving columns should keep their values after repositioning');
  suite.assertEqual(at.getRange(2, appDeadlineCol).getValue().getTime(),
    new Date('2027-01-05T00:00:00').getTime(),
    'Application Deadline should be preserved and still drive Days Until Deadline');
});

suite.test('Scholarship Tracker migration folds Y requirement flags into Requirements Checklist', () => {
  setupWorkbook({});
  const sk = mockSpreadsheet.getSheetByName(C.SHEET_NAMES.SCHOLARSHIP_TRACKER);

  const oldHeaders = [
    'Scholarship Name', 'Provider/Organization', 'Type (Merit/Need/Field/Local/National)', 'Amount',
    'Award Type (One-time/Renewable)', 'GPA Requirement', 'Test Score Requirement', 'Financial Need Required',
    'Special Criteria', 'Geographic Restrictions', 'Deadline', 'Application Portal/Link', 'Essays Required (#)',
    'Essay Topics', 'Word Count', 'Letters of Rec (#)', 'Recommender Types', 'Transcript Required',
    'FAFSA Required', 'Portfolio/Work Samples', 'Interview Required', 'Application Started Date',
    'Application Submitted Date', 'Decision Date', 'Award Status (Pending/Awarded/Declined)',
    'Amount Awarded', 'Notes/Strategy',
  ];
  const rowValues = oldHeaders.map((h) => {
    if (h === 'Scholarship Name') return 'Local STEM Grant';
    if (h === 'Financial Need Required') return 'Y';
    if (h === 'Transcript Required') return 'Y';
    if (h === 'FAFSA Required') return 'N';
    if (h === 'Interview Required') return 'N';
    if (h === 'Amount') return 2000;
    return '';
  });
  writeOldHeadersAndRow(sk, oldHeaders, rowValues);

  CollegeTools.Trackers.setupAllTrackers();

  suite.assertEqual(sk.getRange(1, 1, 1, C.HEADERS.SCHOLARSHIP_TRACKER.length).getValues()[0].join('|'),
    C.HEADERS.SCHOLARSHIP_TRACKER.join('|'), 'header row should be rewritten to the collapsed layout');

  const nameCol = colOf(sk, 'Scholarship Name', 1);
  const amountCol = colOf(sk, 'Amount', 1);
  const checklistCol = colOf(sk, 'Requirements Checklist', 1);

  suite.assertEqual(sk.getRange(2, nameCol).getValue(), 'Local STEM Grant',
    'Scholarship Name should survive the migration');
  suite.assertEqual(sk.getRange(2, amountCol).getValue(), 2000,
    'Unrelated surviving columns should keep their values after repositioning');
  suite.assertEqual(sk.getRange(2, checklistCol).getValue(), 'Financial Need, Transcript',
    'Only the Y-flagged requirements should be folded into the checklist, in header order');
});

suite.test('Financial Aid Tracker migration derives status columns and folds Appeal Status into Notes', () => {
  setupWorkbook({});
  const fa = mockSpreadsheet.getSheetByName(C.SHEET_NAMES.FINANCIAL_AID);

  const oldHeaders = [
    'College Name', 'FAFSA Deadline', 'CSS Profile Required (Y/N)', 'CSS Deadline', 'Priority Deadline',
    'FAFSA Submitted (Y/N)', 'CSS Profile Submitted (Y/N)', 'IDOC Required (Y/N)', 'IDOC Submitted (Y/N)',
    'Verification Required (Y/N)',
    'EFC (Expected Family Contribution)',
    'Total Cost of Attendance', 'Tuition & Fees', 'Room & Board', 'Books & Supplies', 'Personal Expenses',
    'Travel Costs',
    'Federal Grants', 'State Grants', 'Institutional Grants', 'Merit Scholarships', 'Need-Based Aid',
    'Work-Study Offered',
    'Subsidized Loans', 'Unsubsidized Loans', 'Parent PLUS Loans',
    'Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost',
    'Outside Scholarships Applied', 'Appeal Status', 'Financial Safety', '4-Year Burden',
    'Aid Requirements Complete', 'Notes',
    'Verification Submitted (Y/N)',
  ];
  // Row A: CSS submitted, IDOC explicitly not required, Verification untouched
  // (blank Required + blank Submitted) -- should read as satisfied since
  // Verification alone stays lenient on blank.
  const rowA = oldHeaders.map((h) => {
    if (h === 'College Name') return 'Alpha University';
    if (h === 'CSS Profile Submitted (Y/N)') return 'Y';
    if (h === 'IDOC Required (Y/N)') return 'N';
    if (h === 'Appeal Status') return 'Filed 3/1';
    if (h === 'Notes') return 'Loves the campus';
    if (h === 'Total Cost of Attendance') return 50000;
    return '';
  });
  writeOldHeadersAndRow(fa, oldHeaders, rowA);
  // Row B: CSS never started (Required=Y, Submitted blank), IDOC never
  // started -- should NOT read as satisfied.
  fa.getRange(3, 1, 1, oldHeaders.length).setValues([oldHeaders.map((h) => {
    if (h === 'College Name') return 'Beta College';
    if (h === 'CSS Profile Required (Y/N)') return 'Y';
    if (h === 'IDOC Required (Y/N)') return 'Y';
    return '';
  })]);

  CollegeTools.Trackers.setupAllTrackers();

  suite.assertEqual(fa.getRange(1, 1, 1, C.HEADERS.FINANCIAL_AID.length).getValues()[0].join('|'),
    C.HEADERS.FINANCIAL_AID.join('|'), 'header row should be rewritten to the collapsed status-column layout');

  const nameCol = colOf(fa, 'College Name', 1);
  const cssCol = colOf(fa, 'CSS Profile Status', 1);
  const idocCol = colOf(fa, 'IDOC Status', 1);
  const verCol = colOf(fa, 'Verification Status', 1);
  const notesCol = colOf(fa, 'Notes', 1);
  const coaCol = colOf(fa, 'Total Cost of Attendance', 1);

  suite.assertEqual(fa.getRange(2, nameCol).getValue(), 'Alpha University',
    'College Name should survive the migration');
  suite.assertEqual(fa.getRange(2, coaCol).getValue(), 50000,
    'Unrelated surviving columns should keep their values after repositioning');
  suite.assertEqual(fa.getRange(2, cssCol).getValue(), 'Submitted',
    'A submitted CSS Profile should migrate to status Submitted');
  suite.assertEqual(fa.getRange(2, idocCol).getValue(), 'Not Required',
    'An explicitly not-required IDOC should migrate to status Not Required');
  suite.assertEqual(fa.getRange(2, verCol).getValue(), '',
    'A never-touched Verification pair should migrate to a blank status, not a false Submitted/Not Required');
  suite.assertEqual(fa.getRange(2, notesCol).getValue(), 'Loves the campus | Appeal Status: Filed 3/1',
    'Appeal Status text should be appended to existing Notes, not overwrite it');

  suite.assertEqual(fa.getRange(3, cssCol).getValue(), 'Not Started',
    'A CSS Profile marked required but not yet submitted should migrate to Not Started');
  suite.assertEqual(fa.getRange(3, idocCol).getValue(), 'Not Started',
    'An IDOC marked required but not yet submitted should migrate to Not Started');

  const completeCol = colOf(fa, 'Aid Requirements Complete', 1);
  const fafsaCol = colOf(fa, 'FAFSA Submitted (Y/N)', 1);
  fa.getRange(2, fafsaCol).setValue('Y');
  fa.getRange(3, fafsaCol).setValue('Y');
  const completeFormula = String(fa.getRange(2, completeCol).getFormula());
  suite.assert(completeFormula.indexOf('Not Required') !== -1 && completeFormula.indexOf('Submitted') !== -1,
    'Aid Requirements Complete formula should check the new status columns for Not Required/Submitted');
});

suite.test('Application Timeline migration is a no-op once headers already match', () => {
  setupWorkbook({});
  const at = mockSpreadsheet.getSheetByName(C.SHEET_NAMES.APPLICATION_TIMELINE);
  const nameCol = colOf(at, 'College Name', 1);
  at.getRange(2, nameCol).setValue('Beta College');

  CollegeTools.Trackers.setupAllTrackers();

  suite.assertEqual(at.getRange(2, nameCol).getValue(), 'Beta College',
    'Repeat setup on an already-current sheet should not disturb existing data');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
