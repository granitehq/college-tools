/**
 * Configuration and constants for College Tools
 * @version 2.6.0
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
  var VERSION = '2.6.0';

  // Sheet names
  var SHEET_NAMES = {
    INSTRUCTIONS: 'Instructions',
    COLLEGES: 'Colleges',
    API_KEY: 'ScorecardAPIKey',
    WEIGHTS: 'Weights',
    PERSONAL_PROFILE: 'Personal Profile',
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
      'In-State Tuition', 'Out-of-State Tuition', 'Applicable Tuition', 'Notes',
    ],

    FINANCIAL_AID: [
      'College Name', 'FAFSA Deadline', 'CSS Profile Required (Y/N)', 'CSS Deadline', 'Priority Deadline',
      'FAFSA Submitted (Y/N)', 'CSS Profile Submitted (Y/N)', 'IDOC Required (Y/N)', 'IDOC Submitted (Y/N)', 'Verification Required (Y/N)',
      'EFC (Expected Family Contribution)',
      'Total Cost of Attendance', 'Tuition & Fees', 'Room & Board', 'Books & Supplies', 'Personal Expenses', 'Travel Costs',
      'Federal Grants', 'State Grants', 'Institutional Grants', 'Merit Scholarships', 'Need-Based Aid', 'Work-Study Offered',
      'Subsidized Loans', 'Unsubsidized Loans', 'Parent PLUS Loans',
      'Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost',
      'Outside Scholarships Applied', 'Appeal Status', 'Financial Safety', '4-Year Burden', 'Aid Requirements Complete', 'Notes',
      // Appended (not inserted mid-list) so existing sheets that rerun setup
      // keep their data columns aligned with the rewritten header row.
      'Verification Submitted (Y/N)',
    ],

    CAMPUS_VISIT: [
      'College Name', 'Visit Date', 'Visit Type (In-Person/Virtual/College Fair)', 'People Met',
      'Campus & Facilities (1-10)', 'Academic Vibe (1-10)', 'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)',
      'Pros', 'Cons', 'Concerns', 'Follow-Up Needed', 'Next Steps',
      'Visit Score', 'Notes',
    ],

    // Owns the application deadline and FAFSA/CSS deadlines are owned by
    // Financial Aid Tracker -- each deadline has exactly one home so manual
    // entry can't contradict itself across sheets.
    APPLICATION_TIMELINE: [
      'College Name', 'Application Type (ED/ED2/EA/REA/RD)', 'Application Opens', 'Application Deadline',
      'Test Score Deadline', 'Transcript Deadline', 'Counselor Rec Deadline', 'Teacher Rec Deadline',
      'FAFSA Opens', 'Merit Scholarship Deadline',
      'Honors Program Deadline', 'Portfolio/Audition Due', 'Mid-Year Report Due', 'Decision Release Date',
      'Student Visit Day', 'Housing Application Opens', 'Housing Deposit Due', 'Enrollment Deposit Deadline',
      'Orientation Registration Opens', 'Days Until Deadline (App)', 'Priority Level', 'Completion Status (%)',
    ],

    STATUS_TRACKER: [
      'College Name', 'Application Status', 'Decision Plan', 'App Portal', 'Submitted Date',
      'Transcript Sent', 'Test Scores Sent', 'Recommendations Complete', 'Essays Complete', 'Interview (Y/N)',
      'Interview Date', 'Campus Visit Date', 'Scholarship Offer ($)', 'Decision/Result', 'Portfolio Required (Y/N)',
      'Portfolio Submitted (Date)', 'Documents Complete', 'Notes',
    ],

    // Post-award/renewal minutiae (renewal terms, credit hours, thank-you
    // notes, etc.) were removed -- this tracker's job ends at "did we win
    // money"; renewal terms live in the free-text Notes/Strategy column.
    SCHOLARSHIP_TRACKER: [
      'Scholarship Name', 'Provider/Organization', 'Type (Merit/Need/Field/Local/National)', 'Amount',
      'Award Type (One-time/Renewable)', 'GPA Requirement', 'Test Score Requirement', 'Financial Need Required',
      'Special Criteria', 'Geographic Restrictions', 'Deadline', 'Application Portal/Link', 'Essays Required (#)',
      'Essay Topics', 'Word Count', 'Letters of Rec (#)', 'Recommender Types', 'Transcript Required',
      'FAFSA Required', 'Portfolio/Work Samples', 'Interview Required', 'Application Started Date',
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
    SHEET_NAMES: SHEET_NAMES,
    API_CONFIG: API_CONFIG,
    API_FIELDS: API_FIELDS,
    REGION_MAP: REGION_MAP,
    HEADERS: HEADERS,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
  };
})();
