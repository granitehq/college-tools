/**
 * Configuration and constants for College Tools
 * @version 3.0.4
 * @author College Tools
 * @description Central configuration module with constants, settings, and shared data
 */

/**
 * CollegeTools.Config - Configuration module
 * Contains constants, settings, and shared configuration data
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Config = (function() {
  'use strict';

  // Version information
  var VERSION = '3.0.4';

  // Copy registration configuration. Leave ENDPOINT_URL blank in local/dev
  // builds; set it to the deployed registry Web App URL for release builds.
  var REGISTRATION_CONFIG = {
    ENDPOINT_URL: '',
  };

  // Sheet names
  var SHEET_NAMES = {
    INSTRUCTIONS: 'Instructions',
    COLLEGES: 'Colleges',
    API_KEY: 'ScorecardAPIKey',
    WEIGHTS: 'Weights',
    PERSONAL_PROFILE: 'Personal Profile',
    TRAVEL_PLANNER: 'Travel Planner',
    LOOKUP: 'Lookup',
    FINANCIAL_AID: 'Financial Aid Tracker',
    CAMPUS_VISIT: 'Campus Visit Tracker',
    APPLICATION_TIMELINE: 'Application Timeline',
    SCHOLARSHIP_TRACKER: 'Scholarship Tracker',
    STATUS_TRACKER: 'Application Status Tracker',
    DASHBOARD: 'Dashboard',
    TASK_SETTINGS: 'Task Settings',
    TASKS: 'Tasks',
    TASK_TEMPLATES: 'Task Templates',
    THIS_WEEK: 'This Week',
    RECRUITING_TRACKER: 'Recruiting Tracker',
  };

  // Workflow-first tab order applied after Complete Setup and Repair. Sheets
  // that are absent are skipped; unknown/custom sheets are preserved after the
  // canonical group. Internal hidden sheets remain hidden.
  var SHEET_ORDER = [
    SHEET_NAMES.INSTRUCTIONS,
    SHEET_NAMES.THIS_WEEK,
    SHEET_NAMES.COLLEGES,
    SHEET_NAMES.TASKS,
    SHEET_NAMES.DASHBOARD,
    SHEET_NAMES.APPLICATION_TIMELINE,
    SHEET_NAMES.STATUS_TRACKER,
    SHEET_NAMES.FINANCIAL_AID,
    SHEET_NAMES.SCHOLARSHIP_TRACKER,
    SHEET_NAMES.TRAVEL_PLANNER,
    SHEET_NAMES.CAMPUS_VISIT,
    SHEET_NAMES.RECRUITING_TRACKER,
    SHEET_NAMES.PERSONAL_PROFILE,
    SHEET_NAMES.TASK_SETTINGS,
    SHEET_NAMES.WEIGHTS,
    SHEET_NAMES.LOOKUP,
    SHEET_NAMES.API_KEY,
    SHEET_NAMES.TASK_TEMPLATES,
  ];

  // API configuration
  var API_CONFIG = {
    BASE_URL: 'https://api.data.gov/ed/collegescorecard/v1/schools',
    PER_PAGE: 25,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 300, // Base delay in ms for exponential backoff
    RETRY_DELAY_MAX: 10000, // Maximum delay in ms
    CACHE_DURATION: 600, // Cache duration in seconds (10 minutes)
    BATCH_DELAY: 200, // Delay between batch requests in ms
    BATCH_FETCH_SIZE: 4, // Conservative concurrency avoids data.gov throttling
    EXECUTION_TIME_LIMIT: 300000, // 5 minutes in ms (conservative under 6min limit)
  };

  // College Scorecard API field mappings
  var API_FIELDS = [
    'id', 'school.name', 'school.city', 'school.state', 'school.ownership', 'school.school_url', 'school.locale',
    'latest.admissions.admission_rate.overall',
    'latest.student.retention_rate.four_year.full_time',
    'latest.completion.rate_suppressed.overall',
    'latest.earnings.10_yrs_after_entry.median',
    'latest.cost.attendance.academic_year',
    'latest.cost.avg_net_price.overall',
    'latest.cost.tuition.out_of_state',
    'latest.cost.tuition.in_state',
    'latest.admissions.sat_scores.25th_percentile.math',
    'latest.admissions.sat_scores.25th_percentile.critical_reading',
    'latest.admissions.sat_scores.75th_percentile.math',
    'latest.admissions.sat_scores.75th_percentile.critical_reading',
    'latest.admissions.sat_scores.average.overall',
    'latest.admissions.act_scores.25th_percentile.cumulative',
    'latest.admissions.act_scores.75th_percentile.cumulative',
    'latest.admissions.test_requirements',
    'latest.aid.pell_grant_rate',
    'latest.aid.median_debt.completers.overall',
  ].join(',');

  // Column headers for various sheets
  var HEADERS = {
    COLLEGES: [
      'College Name', 'City', 'State', 'Type (Public/Private)',
      'Acceptance Rate', 'First-Year Retention', 'Grad Rate', 'Median Earnings (10yr)',
      'Total Cost of Attendance', 'Estimated Net Price', 'Link',
      'SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%',
      'Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)',
      'Safety (1-5)', 'Campus Culture Fit (1-5)', 'Weather Fit (1-5)',
      'Clubs/Activities (1-5)', 'Personal Priority (1-5)',
      'Weighted Score', 'Admission Fit', 'Campus Setting', 'Test Optional',
      'In-State Tuition', 'Out-of-State Tuition', 'Applicable Tuition',
      'Typical Debt at Graduation', 'Pell Grant Rate', 'Notes', 'College ID',
    ],


    TRAVEL_PLANNER: [
      'College Name', 'College City', 'College State', 'Home City', 'Home State',
      'Distance from Home (mi)', 'Likely Travel Mode', 'Estimated Drive Time',
      'Estimated Flight/Travel Time', 'Travel Cost per Trip', 'Trips Home Per Year',
      'Annual Travel Cost', 'Notes',
    ],

    // CSS Profile/IDOC/Verification each used to be two Y/N columns
    // (Required + Submitted); they're now one 3-state status column each
    // (Not Required/Not Started/Submitted) -- fewer blank-for-most-rows
    // columns, same information. FAFSA stays its own Y/N column since every
    // family deals with FAFSA, unlike the school-specific CSS/IDOC/
    // Verification requirements. Appeal Status was dropped (low-frequency;
    // folds into free-text Notes on migration). Outside Scholarships Applied
    // stays -- it's a live formula input to Out-of-Pocket Cost, not just a
    // tracking field.
    FINANCIAL_AID: [
      'College Name', 'FAFSA Deadline', 'CSS Deadline', 'Priority Deadline',
      'FAFSA Submitted (Y/N)', 'CSS Profile Status', 'IDOC Status', 'Verification Status',
      'EFC (Expected Family Contribution)',
      'Total Cost of Attendance', 'Tuition & Fees', 'Room & Board', 'Books & Supplies', 'Personal Expenses', 'Travel Costs',
      'Federal Grants', 'State Grants', 'Institutional Grants', 'Merit Scholarships', 'Need-Based Aid', 'Work-Study Offered',
      'Subsidized Loans', 'Unsubsidized Loans', 'Parent PLUS Loans',
      'Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost',
      'Outside Scholarships Applied', 'Financial Safety', '4-Year Burden', 'Aid Requirements Complete', 'Notes', 'College ID',
    ],

    CAMPUS_VISIT: [
      'College Name', 'Visit Date', 'Visit Type (In-Person/Virtual/College Fair)', 'People Met',
      'Campus & Facilities (1-10)', 'Academic Vibe (1-10)', 'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)',
      'Pros', 'Cons', 'Concerns', 'Follow-Up Needed', 'Next Steps',
      'Visit Score', 'Notes', 'College ID',
    ],

    // Owns the application deadline and FAFSA/CSS deadlines are owned by
    // Financial Aid Tracker -- each deadline has exactly one home so manual
    // entry can't contradict itself across sheets.
    //
    // Honors Program Deadline, Portfolio/Audition Due, Housing Application
    // Opens, and Orientation Registration Opens only apply to a minority of
    // colleges/students; they were collapsed into two generic "Other
    // Deadline" date columns (note what each one is via a cell note) so the
    // sheet doesn't carry 4 columns blank for most rows. Both stay real date
    // columns so they keep surfacing in Dashboard's What's Due Next.
    APPLICATION_TIMELINE: [
      'College Name', 'Application Type (ED/ED2/EA/REA/RD)', 'Application Opens', 'Application Deadline',
      'Supplemental Essays Required (#)', 'Supplemental Prompts / Topics',
      'Test Score Deadline', 'Transcript Deadline', 'Counselor Rec Deadline', 'Teacher Rec Deadline',
      'FAFSA Opens', 'Merit Scholarship Deadline',
      'Other Deadline 1 Date', 'Other Deadline 2 Date', 'Mid-Year Report Due', 'Decision Release Date',
      'Student Visit Day', 'Housing Deposit Due', 'Enrollment Deposit Deadline',
      'Days Until Deadline (App)', 'Priority Level', 'Completion Status (%)', 'College ID',
    ],

    STATUS_TRACKER: [
      'College Name', 'Application Status', 'Decision Plan', 'App Portal', 'Submitted Date',
      'Transcript Sent', 'Test Scores Sent', 'Recommendations Complete', 'Essays Complete', 'Interview (Y/N)',
      'Interview Date', 'Campus Visit Date', 'Scholarship Offer ($)', 'Decision/Result', 'Enrollment Choice',
      'Portfolio Required (Y/N)',
      'Portfolio Submitted (Date)', 'Documents Complete', 'Notes', 'College ID',
    ],

    // Post-award/renewal minutiae (renewal terms, credit hours, thank-you
    // notes, etc.) were removed -- this tracker's job ends at "did we win
    // money"; renewal terms live in the free-text Notes/Strategy column.
    //
    // Financial Need Required, Transcript Required, FAFSA Required,
    // Portfolio/Work Samples, and Interview Required were collapsed into one
    // "Requirements Checklist" free-text column (e.g. "FAFSA, Transcript,
    // Interview") -- these were 5 separate Y/N columns most scholarships only
    // used a couple of.
    SCHOLARSHIP_TRACKER: [
      'Scholarship Name', 'Provider/Organization', 'Type (Merit/Need/Field/Local/National)', 'Amount',
      'Award Type (One-time/Renewable)', 'GPA Requirement', 'Test Score Requirement',
      'Special Criteria', 'Geographic Restrictions', 'Deadline', 'Application Portal/Link', 'Essays Required (#)',
      'Essay Topics', 'Word Count', 'Letters of Rec (#)', 'Recommender Types', 'Requirements Checklist',
      'Application Started Date',
      'Application Submitted Date', 'Decision Date', 'Award Status (Pending/Awarded/Declined)',
      'Amount Awarded', 'Notes/Strategy', 'Scholarship ID',
    ],

    TASK_SETTINGS: ['Setting', 'Value', 'Guidance'],

    TASKS: [
      'Task ID', 'Template ID', 'Workstream', 'Stage', 'Module', 'Scope Type',
      'Scope ID', 'College', 'College ID', 'Task', 'Applicability Rule',
      'Schedule Rule', 'Schedule Anchor', 'Anchor Date', 'Offset / Window',
      'Owner', 'Owner Role',
      'Owner Locked', 'Support Role', 'Calculated Date', 'Due Date',
      'Effective Date', 'Date Source', 'Date Locked', 'Planned Week', 'Scheduled Block',
      'Schedule Flag', 'Priority', 'Priority Override', 'Status', 'Dependencies', 'Blocked By',
      'Normal Effort (min)', 'Adjusted Effort (min)', 'Effort Override (min)',
      'Deliverable', 'Resource Links', 'Decision Needed', 'Evidence Source',
      'Completion Date', 'Notes', 'Manually Selected', 'Generated',
      'Archived Reason',
    ],

    TASK_TEMPLATES: [
      'Template ID', 'Workstream', 'Stage', 'Module', 'Scope', 'Task',
      'Owner Role', 'Support Role', 'Applicability', 'Schedule Rule', 'Anchor',
      'Offset / Window',
      'Dependencies', 'Effort (min)', 'Deliverable', 'Resource Links',
    ],

    THIS_WEEK: [
      'Task', 'Due Date', 'Status', 'Priority', 'Owner', 'College',
      'Adjusted Effort (min)', 'Decision Needed', 'Schedule Flag', 'Task ID',
    ],

    RECRUITING_TRACKER: [
      'Recruiting Contact ID', 'College ID', 'College Name', 'Sport/Event',
      'Coach/Contact Name', 'Title', 'Email', 'Phone',
      'Recruiting Questionnaire Link', 'Questionnaire Submitted Date',
      'Initial Outreach Date', 'Response/Interest', 'Last Contact',
      'Next Follow-Up', 'Meeting/Visit', 'Student Next Action', 'Notes',
    ],
  };

  // Canonical Task Settings definitions. Spreadsheet integration renders this
  // data but does not own role/module defaults; keeping them here makes the
  // configuration contract reusable and testable outside the sheet service.
  var TASK_MANAGEMENT_SETTINGS = [
    ['Planning Start Date', '', 'Recommended. Example: 2026-08-15. First day the family will use this plan.'],
    ['Working First Application Deadline', '',
      'Recommended fallback. Example: 2026-11-01. College-specific Timeline dates take precedence.'],
    ['FAFSA Availability Date', '',
      'Optional until officially announced. Example: 2026-10-01 for the applicable aid cycle.'],
    ['Current Grade', '', 'Recommended. Example: 11 or 12. Helps explain the planning horizon.'],
    ['Expected Graduation Year', '', 'Recommended. Example: 2027. Enter the four-digit high-school graduation year.'],
    ['Application Cycle', '', 'Optional display label. Example: 2026-27.'],
    ['Student Owner Name', '', 'Optional. Example: Avery. Replaces the generic Student owner label.'],
    ['Parent/Guardian Owner Name', '',
      'Optional. Example: Jordan. Replaces the generic Parent/Guardian owner label.'],
    ['Counselor/Professional Owner Name', '',
      'Optional. Example: Ms. Rivera. Used when professional participation is Yes.'],
    ['Counselor/Professional Participating', 'No',
      'Choose Yes only when this person will actively own assigned work; otherwise tasks fall back safely.'],
    ['Custom Owners (comma separated)', '',
      'Optional. Example: School Counselor, Essay Coach, Grandparent.'],
    ['Parent Effort Multiplier', 1,
      'Example: 1 = baseline, 1.5 = 50% more time, 0.75 = 25% less. Task overrides still win.'],
    ['Testing Enabled', 'No', 'Choose Yes to add SAT/ACT planning, registration, preparation, and score tasks.'],
    ['Athletic Recruiting Enabled', 'No',
      'Choose Yes to add recruiting tasks and create the Recruiting Tracker.'],
    ['CSS Profile Enabled', 'No', 'Choose Yes only if at least one prospective college requires CSS Profile.'],
    ['Visits Enabled', 'No', 'Choose Yes to generate campus-visit and event planning tasks.'],
    ['Interviews Enabled', 'No', 'Choose Yes when interviews are expected or offered.'],
    ['Portfolio/Audition Enabled', 'No', 'Choose Yes for programs requiring a portfolio or audition.'],
    ['Professional Support Enabled', 'No',
      'Choose Yes to record available professional support without changing accountable ownership.'],
    ['Student Weekly Threshold (hours)', '',
      'Optional warning threshold after reviewing the baseline. Example: 6. Does not delete or compress tasks.'],
    ['Parent Weekly Threshold (hours)', '', 'Optional warning threshold. Example: 3 hours per week.'],
    ['Shared Weekly Threshold (hours)', '', 'Optional warning threshold. Example: 2 hours per week.'],
    ['Student Week Overrides', '', 'Optional. Example: 2026-09-07=2; 2026-12-21=0'],
    ['Parent Week Overrides', '', 'Optional. Example: 2026-09-07=1; 2026-12-21=0'],
    ['Shared Week Overrides', '', 'Optional. Example: 2026-09-07=1; 2026-12-21=0'],
  ];

  // Default scoring weights
  // Weights only for college ratings — Campus Visit ratings use a plain
  // average (see CollegeTools.Scoring), so they carry no weight entries.
  var DEFAULT_WEIGHTS = [
    ['Program Fit (1-5)', 2],
    ['Academic Reputation (1-5)', 1.5],
    ['Research Opportunities (1-5)', 1],
    ['Safety (1-5)', 1],
    ['Campus Culture Fit (1-5)', 1.5],
    ['Weather Fit (1-5)', 0.5],
    ['Clubs/Activities (1-5)', 1],
    ['Personal Priority (1-5)', 2],
  ];

  // Public API
  return {
    VERSION: VERSION,
    REGISTRATION_CONFIG: REGISTRATION_CONFIG,
    SHEET_NAMES: SHEET_NAMES,
    SHEET_ORDER: SHEET_ORDER,
    API_CONFIG: API_CONFIG,
    API_FIELDS: API_FIELDS,
    HEADERS: HEADERS,
    TASK_MANAGEMENT_SETTINGS: TASK_MANAGEMENT_SETTINGS,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
  };
})();
