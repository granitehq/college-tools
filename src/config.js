/**
 * Configuration and constants for College Tools
 * @version 2.6.5
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
  var VERSION = '2.6.5';

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
  };

  // API configuration
  var API_CONFIG = {
    BASE_URL: 'https://api.data.gov/ed/collegescorecard/v1/schools',
    PER_PAGE: 25,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 300, // Base delay in ms for exponential backoff
    RETRY_DELAY_MAX: 10000, // Maximum delay in ms
    CACHE_DURATION: 600, // Cache duration in seconds (10 minutes)
    BATCH_DELAY: 200, // Delay between batch requests in ms
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

  // US region mapping
  var REGION_MAP = {
    NORTHEAST: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
    MIDWEST: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    SOUTH: ['AL', 'AR', 'DE', 'DC', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV'],
    WEST: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NM', 'NV', 'OR', 'UT', 'WA', 'WY'],
  };

  // Column headers for various sheets
  var HEADERS = {
    COLLEGES: [
      'College Name', 'City', 'State', 'Region', 'Type (Public/Private)',
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
      'Test Score Deadline', 'Transcript Deadline', 'Counselor Rec Deadline', 'Teacher Rec Deadline',
      'FAFSA Opens', 'Merit Scholarship Deadline',
      'Other Deadline 1 Date', 'Other Deadline 2 Date', 'Mid-Year Report Due', 'Decision Release Date',
      'Student Visit Day', 'Housing Deposit Due', 'Enrollment Deposit Deadline',
      'Days Until Deadline (App)', 'Priority Level', 'Completion Status (%)', 'College ID',
    ],

    STATUS_TRACKER: [
      'College Name', 'Application Status', 'Decision Plan', 'App Portal', 'Submitted Date',
      'Transcript Sent', 'Test Scores Sent', 'Recommendations Complete', 'Essays Complete', 'Interview (Y/N)',
      'Interview Date', 'Campus Visit Date', 'Scholarship Offer ($)', 'Decision/Result', 'Portfolio Required (Y/N)',
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
      'Amount Awarded', 'Notes/Strategy',
    ],
  };

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
    API_CONFIG: API_CONFIG,
    API_FIELDS: API_FIELDS,
    REGION_MAP: REGION_MAP,
    HEADERS: HEADERS,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
  };
})();
