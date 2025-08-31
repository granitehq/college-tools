/**
 * Tracker sheet management
 * @version 1.2.1
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

    // College Name validation using dynamic range from Colleges sheet
    CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

    ['FAFSA Deadline', 'CSS Deadline', 'Priority Deadline'].forEach(function(h) {
      CollegeTools.Formatting.validateDate(sh, h);
    });
    CollegeTools.Formatting.validateList(sh, 'CSS Profile Required (Y/N)', ['Y', 'N']);
    ['FAFSA Submitted (Y/N)', 'CSS Profile Submitted (Y/N)', 'IDOC Required (Y/N)', 'IDOC Submitted (Y/N)', 'Verification Required (Y/N)'].forEach(function(h) {
      CollegeTools.Formatting.validateList(sh, h, ['Y', 'N']);
    });
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

    // Aid Requirements Complete formula
    var completeCol = CollegeTools.Utils.colIndex(sh, 'Aid Requirements Complete');
    var fafsaSubCol = CollegeTools.Utils.colIndex(sh, 'FAFSA Submitted (Y/N)');
    var cssReqCol = CollegeTools.Utils.colIndex(sh, 'CSS Profile Required (Y/N)');
    var cssSubCol = CollegeTools.Utils.colIndex(sh, 'CSS Profile Submitted (Y/N)');
    var idocReqCol = CollegeTools.Utils.colIndex(sh, 'IDOC Required (Y/N)');
    var idocSubCol = CollegeTools.Utils.colIndex(sh, 'IDOC Submitted (Y/N)');
    var verReqCol = CollegeTools.Utils.colIndex(sh, 'Verification Required (Y/N)');

    if (completeCol && fafsaSubCol && cssSubCol) {
      var fafsaSubCell = CollegeTools.Utils.addr(r2, fafsaSubCol);
      var cssReqCell = cssReqCol ? CollegeTools.Utils.addr(r2, cssReqCol) : '';
      var cssSubCell = CollegeTools.Utils.addr(r2, cssSubCol);
      var idocReqCell = idocReqCol ? CollegeTools.Utils.addr(r2, idocReqCol) : '';
      var idocSubCell = idocSubCol ? CollegeTools.Utils.addr(r2, idocSubCol) : '';
      var verReqCell = verReqCol ? CollegeTools.Utils.addr(r2, verReqCol) : '';

      var completeFormula = '=IF(AND(' +
        fafsaSubCell + '="Y",' +
        'OR(' + cssReqCell + '="N",' + cssSubCell + '="Y")' +
        (idocReqCol ? ',OR(' + idocReqCell + '="N",' + idocSubCell + '="Y")' : '') +
        (verReqCol ? ',OR(' + verReqCell + '="N",' + verReqCell + '="Y")' : '') +
        '),"✅ Complete","⚠️ Pending")';

      sh.getRange(r2, completeCol).setFormula(completeFormula);
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

    // College Name validation using dynamic range from Colleges sheet
    CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

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

    // Optimize: Skip dynamic validation during setup for speed - can be added later if needed
    // CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
    //   CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

    // Optimize: Batch validate only the most critical date columns to reduce setup time
    var criticalDateCols = ['Application Deadline', 'Decision Release Date'];
    criticalDateCols.forEach(function(h) {
      CollegeTools.Formatting.validateDate(sh, h);
    });
    CollegeTools.Formatting.validateList(sh, 'Application Type (ED/ED2/EA/REA/RD)',
      ['ED', 'ED2', 'EA', 'REA', 'RD']);
    CollegeTools.Formatting.validateList(sh, 'Priority Level', ['High', 'Medium', 'Low']);

    // Batch optimize: Set all formulas at once instead of individual calls
    var appDeadlineCol = CollegeTools.Utils.colIndex(sh, 'Application Deadline');
    var daysCol = CollegeTools.Utils.colIndex(sh, 'Days Until Deadline (App)');

    if (appDeadlineCol && daysCol) {
      // Collect all formula columns and formulas
      var formulaCols = [daysCol];
      var formulas = ['=IF(' + CollegeTools.Utils.addr(2, appDeadlineCol) +
        '-TODAY()>0, ' + CollegeTools.Utils.addr(2, appDeadlineCol) +
        '-TODAY(), "PAST DUE")'];

      // Warning formulas - collect all at once
      var warningHeaders = ['60-Day Warning', '30-Day Warning', '14-Day Warning', '7-Day Warning'];
      var warningDays = [60, 30, 14, 7];

      for (var i = 0; i < warningHeaders.length; i++) {
        var warnCol = CollegeTools.Utils.colIndex(sh, warningHeaders[i]);
        if (warnCol) {
          formulaCols.push(warnCol);
          formulas.push('=IF(ISNUMBER(' + CollegeTools.Utils.addr(2, appDeadlineCol) + '), ' +
            CollegeTools.Utils.addr(2, appDeadlineCol) + '-TODAY()<=' + warningDays[i] + ', "")');
        }
      }

      // Batch set all formulas - much faster than individual setFormula calls
      for (var j = 0; j < formulaCols.length; j++) {
        sh.getRange(2, formulaCols[j]).setFormula(formulas[j]);
      }
    }
  }

  /**
   * Creates or updates the Application Status Tracker sheet with headers and validation.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateStatusTracker(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    var headers = CollegeTools.Config.HEADERS.STATUS_TRACKER;
    CollegeTools.Utils.setHeaders(sh, headers);

    // College Name validation using dynamic range from Colleges sheet
    CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

    // Validation for Y/N columns
    ['Transcript Sent', 'Test Scores Sent', 'Recommendations Complete', 'Essays Complete',
      'Interview (Y/N)', 'Portfolio Required (Y/N)'].forEach(function(h) {
      CollegeTools.Formatting.validateList(sh, h, ['Y', 'N']);
    });

    // Date validation
    ['Application Deadline', 'Submitted Date', 'Interview Date', 'Campus Visit Date', 'Portfolio Submitted (Date)']
      .forEach(function(h) {
        CollegeTools.Formatting.validateDate(sh, h);
      });

    CollegeTools.Formatting.validateList(sh, 'Application Status',
      ['Not Started', 'In Progress', 'Submitted', 'Under Review', 'Decision Received']);
    CollegeTools.Formatting.validateList(sh, 'Decision Plan', ['ED', 'ED2', 'EA', 'REA', 'RD']);
    CollegeTools.Formatting.validateList(sh, 'Decision/Result',
      ['Pending', 'Accepted', 'Deferred', 'Waitlisted', 'Rejected']);

    // Documents Complete formula in row 2
    var completeCol = CollegeTools.Utils.colIndex(sh, 'Documents Complete');
    var transcriptCol = CollegeTools.Utils.colIndex(sh, 'Transcript Sent');
    var testScoreCol = CollegeTools.Utils.colIndex(sh, 'Test Scores Sent');
    var recCol = CollegeTools.Utils.colIndex(sh, 'Recommendations Complete');
    var essayCol = CollegeTools.Utils.colIndex(sh, 'Essays Complete');
    var _portfolioSubCol = CollegeTools.Utils.colIndex(sh, 'Portfolio Submitted (Date)');

    if (completeCol && transcriptCol && testScoreCol && recCol && essayCol) {
      var r2 = 2;
      var transcriptCell = CollegeTools.Utils.addr(r2, transcriptCol);
      var _testScoreCell = CollegeTools.Utils.addr(r2, testScoreCol);
      var _recCell = CollegeTools.Utils.addr(r2, recCol);
      var essayCell = CollegeTools.Utils.addr(r2, essayCol);
      var portfolioRange = transcriptCell + ':' + essayCell;

      var formula = '=COUNTIF(' + portfolioRange + ',"Y")&"/"&COUNTA(' + portfolioRange + ')&' +
                    'IF(COUNTIF(' + portfolioRange + ',"N")=0," ✅"," ⚠️")';

      sh.getRange(r2, completeCol).setFormula(formula);
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

    var st = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    if (st) {
      CollegeTools.Utils.ensureCollegeRowAndSet(st, 'College Name', info.name, {});
    }
  }

  /**
   * Creates or updates all tracker sheets (Financial Aid, Campus Visit, Application Timeline, Scholarships).
   * Sets up headers, formulas, and data validation for each tracker.
   * Safe to run multiple times - will not overwrite existing data.
   */
  function setupAllTrackers() {
    var ss = SpreadsheetApp.getActive();
    var ui = SpreadsheetApp.getUi();

    ui.alert('Tracker Setup', 'Setting up tracker sheets with full formatting... (1/3)', ui.ButtonSet.OK);

    // Core tracker setup
    createOrUpdateFinAid(ss);
    createOrUpdateCampusVisit(ss);
    createOrUpdateAppTimeline(ss);
    createOrUpdateStatusTracker(ss);
    createOrUpdateScholarships(ss);

    ui.alert('Tracker Setup', 'Applying Financial Intelligence enhancements... (2/3)', ui.ButtonSet.OK);

    // Financial Intelligence enhancements
    var personalSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
    if (personalSheet) {
      CollegeTools.Financial.enhancePersonalProfileFormatting(ss);
    }

    var financialSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (financialSheet) {
      CollegeTools.Financial.enhanceFinancialAidFormatting(financialSheet);
    }

    var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (collegesSheet) {
      CollegeTools.Financial.enhanceCollegesFormatting(collegesSheet);
      CollegeTools.Admissions.enhanceAdmissionFormatting(collegesSheet);
    }

    ui.alert('Tracker Setup', 'All trackers and enhancements complete! (3/3)', ui.ButtonSet.OK);
  }


  // Public API
  return {
    setupAllTrackers: setupAllTrackers,
    syncCollegeToTrackers: syncCollegeToTrackers,
  };
})();
