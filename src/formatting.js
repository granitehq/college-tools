/**
 * Sheet formatting and validation
 * @version 2.6.1
 * @author College Tools
 * @description Number formats, dropdowns, and data validation for sheets
 */

/**
 * CollegeTools.Formatting - Formatting and validation module
 * Handles number formats, dropdowns, and data validation
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Formatting = (function() {
  'use strict';

  /**
   * Resolves the header row for a sheet, using schema metadata when available.
   * @param {Sheet} sh - Target sheet
   * @param {number=} headerRow - Explicit header row override
   * @returns {number} Header row number
   * @private
   */
  function resolveHeaderRow_(sh, headerRow) {
    if (headerRow) return headerRow;
    if (CollegeTools.Schema && CollegeTools.Schema.getSheetKeyByName) {
      var sheetKey = CollegeTools.Schema.getSheetKeyByName(sh.getName());
      if (sheetKey) return CollegeTools.Schema.getSheet(sheetKey).headerRow;
    }
    return 1;
  }

  /**
   * Finds a column by header on a configurable header row.
   * @param {Sheet} sh - Target sheet
   * @param {string} header - Header text
   * @param {number=} headerRow - Header row number, defaults to schema or row 1
   * @returns {number|null} 1-based column index or null if not found
   * @private
   */
  function findColumn_(sh, header, headerRow) {
    headerRow = resolveHeaderRow_(sh, headerRow);
    if (headerRow === 1) return CollegeTools.Utils.colIndex(sh, header);

    var last = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(headerRow, 1, 1, last).getValues()[0];
    for (var i = 0; i < hdrs.length; i++) {
      if ((hdrs[i] || '').toString().trim() === header) return i + 1;
    }
    return null;
  }

  /**
   * Applies dropdown data validation to a column.
   * @param {Sheet} sh - The sheet to apply validation to
   * @param {string} header - Column header to find
   * @param {string[]} options - Array of valid dropdown options
   * @param {number=} headerRow - Header row number, defaults to 1
   */
  function validateList(sh, header, options, headerRow) {
    var resolvedHeaderRow = resolveHeaderRow_(sh, headerRow);
    var col = findColumn_(sh, header, resolvedHeaderRow);
    if (!col) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(options, true)
      .setAllowInvalid(false)
      .build();
    sh.getRange(resolvedHeaderRow + 1, col, Math.max(1, sh.getMaxRows() - resolvedHeaderRow))
      .setDataValidation(rule);
  }

  /**
   * Applies dropdown validation using a source range from another sheet.
   * @param {Sheet} sh - The sheet to apply validation to
   * @param {string} header - Column header to find
   * @param {string} sourceSheetName - Source sheet name
   * @param {string} sourceRange - A1 notation range in the source sheet
   * @param {number=} headerRow - Header row number, defaults to 1
   */
  function validateListFromRange(sh, header, sourceSheetName, sourceRange, headerRow) {
    var resolvedHeaderRow = resolveHeaderRow_(sh, headerRow);
    var col = findColumn_(sh, header, resolvedHeaderRow);
    if (!col) return;

    var ss = SpreadsheetApp.getActive();
    var sourceSheet = ss.getSheetByName(sourceSheetName);
    if (!sourceSheet) return;

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(sourceSheet.getRange(sourceRange), true)
      .setAllowInvalid(false)
      .build();
    sh.getRange(resolvedHeaderRow + 1, col, Math.max(1, sh.getMaxRows() - resolvedHeaderRow))
      .setDataValidation(rule);
  }

  /**
   * Applies date validation to a column.
   * @param {Sheet} sh - The sheet to apply validation to
   * @param {string} header - Column header to find
   * @param {number=} headerRow - Header row number, defaults to 1
   */
  function validateDate(sh, header, headerRow) {
    var resolvedHeaderRow = resolveHeaderRow_(sh, headerRow);
    var col = findColumn_(sh, header, resolvedHeaderRow);
    if (!col) return;
    var rule = SpreadsheetApp.newDataValidation().requireDate().build();
    sh.getRange(resolvedHeaderRow + 1, col, Math.max(1, sh.getMaxRows() - resolvedHeaderRow))
      .setDataValidation(rule);
  }

  /**
   * Applies number formatting to a column.
   * @param {Sheet} sh - The sheet to apply formatting to
   * @param {string} header - Column header to find
   * @param {string} pattern - Number format pattern
   * @param {number=} headerRow - Header row number, defaults to 1
   */
  function formatNumber(sh, header, pattern, headerRow) {
    var resolvedHeaderRow = resolveHeaderRow_(sh, headerRow);
    var col = findColumn_(sh, header, resolvedHeaderRow);
    if (!col) return;
    sh.getRange(resolvedHeaderRow + 1, col, Math.max(1, sh.getMaxRows() - resolvedHeaderRow))
      .setNumberFormat(pattern);
  }


  var STANDARD_VALIDATIONS = {};
  STANDARD_VALIDATIONS[CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID] = {
    range: [['College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000']],
    date: ['FAFSA Deadline', 'CSS Deadline', 'Priority Deadline'],
    list: [
      ['CSS Profile Required (Y/N)', ['Y', 'N']],
      ['FAFSA Submitted (Y/N)', ['Y', 'N']],
      ['CSS Profile Submitted (Y/N)', ['Y', 'N']],
      ['IDOC Required (Y/N)', ['Y', 'N']],
      ['IDOC Submitted (Y/N)', ['Y', 'N']],
      ['Verification Required (Y/N)', ['Y', 'N']],
      ['Verification Submitted (Y/N)', ['Y', 'N']],
      ['Work-Study Offered', ['Y', 'N']],
      ['Appeal Status', ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Denied', 'Other']],
    ],
  };
  STANDARD_VALIDATIONS[CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT] = {
    range: [['College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000']],
    date: ['Visit Date'],
    list: [
      ['Visit Type (In-Person/Virtual/College Fair)', ['In-Person', 'Virtual', 'College Fair', 'Regional Event', 'Other']],
      ['Campus & Facilities (1-10)', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
      ['Academic Vibe (1-10)', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
      ['Social Atmosphere (1-10)', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
      ['Overall Gut Feeling (1-10)', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
      ['Follow-Up Needed', ['Y', 'N']],
    ],
  };
  STANDARD_VALIDATIONS[CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE] = {
    range: [['College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000']],
    date: ['Application Deadline', 'Decision Release Date'],
    list: [
      ['Application Type (ED/ED2/EA/REA/RD)', ['ED', 'ED2', 'EA', 'REA', 'RD', 'Other']],
      ['Priority Level', ['High', 'Medium', 'Low', 'Other']],
    ],
  };
  STANDARD_VALIDATIONS[CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER] = {
    range: [['College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000']],
    date: ['Submitted Date', 'Interview Date', 'Campus Visit Date', 'Portfolio Submitted (Date)'],
    list: [
      ['Transcript Sent', ['Y', 'N']],
      ['Test Scores Sent', ['Y', 'N']],
      ['Recommendations Complete', ['Y', 'N']],
      ['Essays Complete', ['Y', 'N']],
      ['Interview (Y/N)', ['Y', 'N']],
      ['Portfolio Required (Y/N)', ['Y', 'N']],
      ['Application Status', ['Not Started', 'In Progress', 'Submitted', 'Under Review', 'Decision Received', 'Other']],
      ['Decision Plan', ['ED', 'ED2', 'EA', 'REA', 'RD', 'Other']],
      ['Decision/Result', ['Pending', 'Accepted', 'Deferred', 'Waitlisted', 'Rejected', 'Other']],
    ],
  };
  STANDARD_VALIDATIONS[CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER] = {
    date: ['Deadline', 'Application Started Date', 'Application Submitted Date', 'Decision Date'],
    list: [
      ['Type (Merit/Need/Field/Local/National)', ['Merit', 'Need', 'Field-Specific', 'Local', 'National', 'Other']],
      ['Award Type (One-time/Renewable)', ['One-time', 'Renewable', 'Other']],
      ['Financial Need Required', ['Y', 'N']],
      ['Transcript Required', ['Y', 'N']],
      ['FAFSA Required', ['Y', 'N']],
      ['Portfolio/Work Samples', ['Y', 'N']],
      ['Interview Required', ['Y', 'N']],
      ['Award Status (Pending/Awarded/Declined)', ['Pending', 'Awarded', 'Declined', 'Waitlisted', 'Other']],
    ],
  };

  /**
   * Applies shared dropdown/date validation specs for tracker sheets.
   * @param {Sheet} sh - Target sheet
   */
  function applyStandardValidations(sh) {
    if (!sh) return;
    var spec = STANDARD_VALIDATIONS[sh.getName()];
    if (!spec) return;

    (spec.range || []).forEach(function(entry) {
      validateListFromRange(sh, entry[0], entry[1], entry[2]);
    });
    (spec.date || []).forEach(function(header) {
      validateDate(sh, header);
    });
    (spec.list || []).forEach(function(entry) {
      validateList(sh, entry[0], entry[1]);
    });
  }

  /**
   * Adds a text-contains conditional format rule to a rules array.
   * @param {ConditionalFormatRule[]} rules - Existing rules array
   * @param {Range} range - Target range
   * @param {string} text - Text fragment to match
   * @param {string} bg - Background color
   * @param {string} fg - Font color
   */
  function pushTextRule(rules, range, text, bg, fg) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains(text)
      .setBackground(bg)
      .setFontColor(fg)
      .setRanges([range])
      .build());
  }

  /**
   * Removes prior text-contains conditional format rules with matching markers.
   * @param {ConditionalFormatRule[]} rules - Existing rules array
   * @param {string[]} markers - Exact text markers used by owned rules
   * @returns {ConditionalFormatRule[]} Filtered rules
   */
  function removeTextRules(rules, markers) {
    return (rules || []).filter(function(rule) {
      var text = '';
      try {
        var boolCondition = rule.getBooleanCondition && rule.getBooleanCondition();
        var values = boolCondition && boolCondition.getCriteriaValues && boolCondition.getCriteriaValues();
        text = values && values.length ? String(values[0]) : '';
      } catch (e) {
        text = '';
      }
      return markers.indexOf(text) === -1;
    });
  }

  /**
   * Applies formatting and dropdown validations to all sheets.
   * Sets number formats for percentages, currency, and scores.
   * Creates dropdown lists for ratings, yes/no fields, and status fields.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress the completion alert
   * @returns {Object} Summary of repaired sections
   */
  function enhanceFormatsDropdowns(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();
    var sectionsApplied = [];

    var col = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (col) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.COLLEGES);
      ['Acceptance Rate', 'First-Year Retention', 'Grad Rate'].forEach(function(h) {
        formatNumber(col, h, '0.0%', 2);
      });
      ['Median Earnings (10yr)', 'Total Cost of Attendance', 'Estimated Net Price']
        .forEach(function(h) {
          formatNumber(col, h, '$#,##0', 2);
        });
      ['SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%'].forEach(function(h) {
        formatNumber(col, h, '0', 2);
      });
      formatNumber(col, 'Weighted Score', '0.00', 2);

      ['Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)', 'Safety (1-5)',
        'Campus Culture Fit (1-5)', 'Weather Fit (1-5)', 'Clubs/Activities (1-5)', 'Personal Priority (1-5)']
        .forEach(function(h) {
          validateList(col, h, ['1', '2', '3', '4', '5'], 2);
        });

      validateList(col, 'Type (Public/Private)',
        ['Public', 'Private (nonprofit)', 'Private (for-profit)', 'Other'], 2);
      validateList(col, 'Region', ['Northeast', 'Midwest', 'South', 'West'], 2);
      validateList(col, 'Campus Setting', ['City', 'Suburban', 'Town', 'Rural', 'Other'], 2);
    }

    var fa = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (fa) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
      applyStandardValidations(fa);
      ['Total Cost of Attendance', 'Tuition & Fees', 'Room & Board', 'Books & Supplies', 'Personal Expenses', 'Travel Costs',
        'Federal Grants', 'State Grants', 'Institutional Grants', 'Merit Scholarships', 'Need-Based Aid',
        'Subsidized Loans', 'Unsubsidized Loans', 'Parent PLUS Loans',
        'Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost', 'Outside Scholarships Applied']
        .forEach(function(h) {
          formatNumber(fa, h, '$#,##0');
        });
      formatNumber(fa, '4-Year Burden', '0.0%');
    }

    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
      applyStandardValidations(cv);
      ['Campus & Facilities (1-10)', 'Academic Vibe (1-10)', 'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)', 'Visit Score']
        .forEach(function(h) {
          formatNumber(cv, h, '0');
        });
    }

    var at = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (at) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
      applyStandardValidations(at);
      var atHdrs = at.getRange(1, 1, 1, at.getLastColumn()).getValues()[0];
      for (var i = 0; i < atHdrs.length; i++) {
        var h = (atHdrs[i] || '').toString().trim();
        if (/(Deadline|Opens|Due|Date)$/i.test(h)) validateDate(at, h);
      }
      formatNumber(at, 'Days Until Deadline (App)', '0');
      formatNumber(at, 'Completion Status (%)', '0');
    }

    var sc = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    if (sc) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
      ['Amount', 'Amount Awarded'].forEach(function(h) {
        formatNumber(sc, h, '$#,##0');
      });
      applyStandardValidations(sc);
    }

    var st = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    if (st) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
      applyStandardValidations(st);
      formatNumber(st, 'Scholarship Offer ($)', '$#,##0');
    }

    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert('Formats & dropdowns applied.');
    }
    return {ok: true, sectionsApplied: sectionsApplied};
  }

  /**
   * Repairs workbook formatting and dropdown validations in one pass.
   * Safe to run on existing downloaded spreadsheets.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress completion alert
   * @returns {Object} Repair summary
   */
  function repairValidationsAndFormatting(opts) {
    opts = opts || {};
    var result = enhanceFormatsDropdowns({suppressAlert: true});

    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert(
        'Validation Repair Complete',
        'Reapplied formatting and dropdown validations to ' + result.sectionsApplied.length +
        ' sheet(s).\n\nThis is safe to run on existing downloaded spreadsheets.',
        SpreadsheetApp.getUi().ButtonSet.OK,
      );
    }
    return result;
  }

  return {
    enhanceFormatsDropdowns: enhanceFormatsDropdowns,
    repairValidationsAndFormatting: repairValidationsAndFormatting,
    validateList: validateList,
    validateListFromRange: validateListFromRange,
    validateDate: validateDate,
    formatNumber: formatNumber,
    applyStandardValidations: applyStandardValidations,
    pushTextRule: pushTextRule,
    removeTextRules: removeTextRules,
  };
})();
