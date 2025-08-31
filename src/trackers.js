/**
 * Tracker sheet management
 * @version 5.6.3
 * @author College Tools
 * @description Creates and manages Financial Aid, Campus Visit, Application, and Scholarship trackers
 */

/**
 * CollegeTools.Trackers - Tracker management module
 * Creates and updates Financial Aid, Campus Visit, Application Timeline, and Scholarship tracker sheets
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Trackers = (function() {
  'use strict';

  /**
   * Creates or updates the Financial Aid Tracker sheet with headers and formulas.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateFinAid(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    var headers = CollegeTools.Config.HEADERS.FINANCIAL_AID;
    CollegeTools.Utils.setHeaders(sh, headers);

    ['FAFSA Deadline', 'CSS Deadline', 'Priority Deadline'].forEach(function(h) {
      CollegeTools.Formatting.validateDate(sh, h);
    });
    CollegeTools.Formatting.validateList(sh, 'CSS Profile Required (Y/N)', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Work-Study Offered', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Appeal Status',
      ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Denied']);

    // Formulas row 2 (user can fill down)
    var r2 = 2;
    var netCol = CollegeTools.Utils.colIndex(sh, 'Net Price After Aid');
    var oopCol = CollegeTools.Utils.colIndex(sh, 'Out-of-Pocket Cost');
    var fourYearCol = CollegeTools.Utils.colIndex(sh, '4-Year Projected Cost');
    var coaCol = CollegeTools.Utils.colIndex(sh, 'Total Cost of Attendance');
    var fedGrantsCol = CollegeTools.Utils.colIndex(sh, 'Federal Grants');
    var needAidCol = CollegeTools.Utils.colIndex(sh, 'Need-Based Aid');
    var scholarshipsCol = CollegeTools.Utils.colIndex(sh, 'Outside Scholarships Applied');

    if (netCol && coaCol && fedGrantsCol && needAidCol) {
      var netFormula = '=IFERROR(' + CollegeTools.Utils.addr(r2, coaCol) +
                       '-SUM(' + CollegeTools.Utils.addr(r2, fedGrantsCol) +
                       ':' + CollegeTools.Utils.addr(r2, needAidCol) + '), "")';
      sh.getRange(r2, netCol).setFormula(netFormula);
    }

    if (oopCol && netCol && scholarshipsCol) {
      var oopFormula = '=IFERROR(' + CollegeTools.Utils.addr(r2, netCol) +
                       '-' + CollegeTools.Utils.addr(r2, scholarshipsCol) + ', "")';
      sh.getRange(r2, oopCol).setFormula(oopFormula);
    }

    if (fourYearCol && oopCol) {
      var fourYearFormula = '=IFERROR(' + CollegeTools.Utils.addr(r2, oopCol) +
                           '*(1+0.03+0.03^2+0.03^3), "")';
      sh.getRange(r2, fourYearCol).setFormula(fourYearFormula);
    }
  }

  /**
   * Creates or updates the Campus Visit Tracker sheet with headers and validation.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateCampusVisit(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    var headers = CollegeTools.Config.HEADERS.CAMPUS_VISIT;
    CollegeTools.Utils.setHeaders(sh, headers);

    CollegeTools.Formatting.validateDate(sh, 'Visit Date');
    CollegeTools.Formatting.validateList(sh, 'Visit Type (In-Person/Virtual/College Fair)',
      ['In-Person', 'Virtual', 'College Fair', 'Regional Event']);
    CollegeTools.Formatting.validateList(sh, 'Tour Quality (1-10)',
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    CollegeTools.Formatting.validateList(sh, 'Info Session Quality (1-10)',
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    ['Thank You Email Sent', 'Connected on Social Media', 'Added to Mailing List', 'Additional Info Requested']
      .forEach(function(h) {
        CollegeTools.Formatting.validateList(sh, h, ['Y', 'N']);
      });
  }

  /**
   * Creates or updates the Application Timeline sheet with headers and formulas.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateAppTimeline(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    var headers = [
      'College Name', 'Application Type (ED/ED2/EA/REA/RD)',
      'Application Opens', 'Application Deadline', 'Test Score Deadline', 'Transcript Deadline', 'Counselor Rec Deadline', 'Teacher Rec Deadline',
      'FAFSA Opens', 'FAFSA Priority Deadline', 'CSS Profile Deadline', 'Merit Scholarship Deadline', 'Honors Program Deadline', 'Portfolio/Audition Due',
      'Mid-Year Report Due', 'Decision Release Date',
      'Student Visit Day', 'Housing Application Opens', 'Housing Deposit Due', 'Enrollment Deposit Deadline', 'Orientation Registration Opens',
      'Days Until Deadline (App)', 'Priority Level', 'Completion Status (%)',
      '60-Day Warning', '30-Day Warning', '14-Day Warning', '7-Day Warning',
    ];
    CollegeTools.Utils.setHeaders(sh, headers);

    headers.forEach(function(h) {
      if (/(Deadline|Opens|Due|Date)$/i.test(h)) CollegeTools.Formatting.validateDate(sh, h);
    });
    CollegeTools.Formatting.validateList(sh, 'Application Type (ED/ED2/EA/REA/RD)',
      ['ED', 'ED2', 'EA', 'REA', 'RD']);
    CollegeTools.Formatting.validateList(sh, 'Priority Level', ['High', 'Medium', 'Low']);

    var appDeadlineCol = CollegeTools.Utils.colIndex(sh, 'Application Deadline');
    var daysCol = CollegeTools.Utils.colIndex(sh, 'Days Until Deadline (App)');

    if (appDeadlineCol && daysCol) {
      sh.getRange(2, daysCol).setFormula(
        '=IF(' + CollegeTools.Utils.addr(2, appDeadlineCol) +
        '-TODAY()>0, ' + CollegeTools.Utils.addr(2, appDeadlineCol) +
        '-TODAY(), "PAST DUE")',
      );

      // Warning formulas
      var setWarn = function(header, days) {
        var c = CollegeTools.Utils.colIndex(sh, header);
        if (!c) return;
        sh.getRange(2, c).setFormula(
          '=IF(ISNUMBER(' + CollegeTools.Utils.addr(2, appDeadlineCol) + '), ' +
          CollegeTools.Utils.addr(2, appDeadlineCol) + '-TODAY()<=' + days + ', "")',
        );
      };
      setWarn('60-Day Warning', 60);
      setWarn('30-Day Warning', 30);
      setWarn('14-Day Warning', 14);
      setWarn('7-Day Warning', 7);
    }
  }

  /**
   * Creates or updates the Scholarship Tracker sheet with headers and validation.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateScholarships(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    var headers = [
      'Scholarship Name', 'Provider/Organization', 'Type (Merit/Need/Field/Local/National)', 'Amount', 'Award Type (One-time/Renewable)',
      'GPA Requirement', 'Test Score Requirement', 'Financial Need Required', 'Special Criteria', 'Geographic Restrictions',
      'Deadline', 'Application Portal/Link', 'Essays Required (#)', 'Essay Topics', 'Word Count', 'Letters of Rec (#)', 'Recommender Types',
      'Transcript Required', 'FAFSA Required', 'Portfolio/Work Samples', 'Interview Required',
      'Application Started Date', 'Application Submitted Date', 'Confirmation Received', 'Interview Scheduled', 'Interview Completed',
      'Decision Date', 'Award Status (Pending/Awarded/Declined)', 'Amount Awarded', 'Thank You Note Sent',
      'Renewable for # Years', 'GPA to Maintain', 'Credit Hours Required', 'Other Renewal Requirements', 'Notes/Strategy',
    ];
    CollegeTools.Utils.setHeaders(sh, headers);

    CollegeTools.Formatting.validateList(sh, 'Type (Merit/Need/Field/Local/National)',
      ['Merit', 'Need', 'Field-Specific', 'Local', 'National']);
    CollegeTools.Formatting.validateList(sh, 'Award Type (One-time/Renewable)',
      ['One-time', 'Renewable']);
    CollegeTools.Formatting.validateList(sh, 'Financial Need Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Transcript Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'FAFSA Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Portfolio/Work Samples', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Interview Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Award Status (Pending/Awarded/Declined)',
      ['Pending', 'Awarded', 'Declined']);
    CollegeTools.Formatting.validateList(sh, 'Thank You Note Sent', ['Y', 'N']);

    ['Deadline', 'Application Started Date', 'Application Submitted Date', 'Interview Scheduled', 'Interview Completed', 'Decision Date']
      .forEach(function(h) {
        CollegeTools.Formatting.validateDate(sh, h);
      });
  }

  /**
   * Synchronizes college information to all tracker sheets.
   * @param {Object} info - College information object
   * @param {string} info.name - College name
   * @param {number} info.coa - Cost of attendance
   * @private
   */
  function syncCollegeToTrackers(info) {
    var ss = SpreadsheetApp.getActive();

    var fa = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (fa) {
      CollegeTools.Utils.ensureCollegeRowAndSet(fa, 'College Name', info.name, {
        'Total Cost of Attendance': info.coa,
      });
    }

    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      CollegeTools.Utils.ensureCollegeRowAndSet(cv, 'College Name', info.name, {});
    }

    var at = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (at) {
      CollegeTools.Utils.ensureCollegeRowAndSet(at, 'College Name', info.name, {});
    }
  }

  /**
   * Creates or updates all tracker sheets (Financial Aid, Campus Visit, Application Timeline, Scholarships).
   * Sets up headers, formulas, and data validation for each tracker.
   * Safe to run multiple times - will not overwrite existing data.
   */
  function setupAllTrackers() {
    var ss = SpreadsheetApp.getActive();
    createOrUpdateFinAid(ss);
    createOrUpdateCampusVisit(ss);
    createOrUpdateAppTimeline(ss);
    createOrUpdateScholarships(ss);
  }

  // Public API
  return {
    setupAllTrackers: setupAllTrackers,
    syncCollegeToTrackers: syncCollegeToTrackers,
  };
})();
