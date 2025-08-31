/**
 * Sheet formatting and validation
 * @version 1.2.4
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
   * Applies dropdown data validation to a column.
   * @param {Sheet} sh - The sheet to apply validation to
   * @param {string} header - Column header to find
   * @param {string[]} options - Array of valid dropdown options
   * @private
   */
  function validateList(sh, header, options) {
    var col = CollegeTools.Utils.colIndex(sh, header);
    if (!col) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(options, true)
      .setAllowInvalid(false)
      .build();
    sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setDataValidation(rule);
  }

  /**
   * Applies dropdown data validation to a column using a range from another sheet.
   * @param {Sheet} sh - The sheet to apply validation to
   * @param {string} header - Column header to find
   * @param {string} sourceSheetName - Name of the source sheet containing valid values
   * @param {string} sourceRange - Range in A1 notation (e.g., "A2:A100") containing valid values
   * @private
   */
  function validateListFromRange(sh, header, sourceSheetName, sourceRange) {
    var col = CollegeTools.Utils.colIndex(sh, header);
    if (!col) return;

    var ss = SpreadsheetApp.getActive();
    var sourceSheet = ss.getSheetByName(sourceSheetName);
    if (!sourceSheet) return;

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(sourceSheet.getRange(sourceRange), true)
      .setAllowInvalid(false)
      .build();
    sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setDataValidation(rule);
  }

  /**
   * Applies date validation to a column.
   * @param {Sheet} sh - The sheet to apply validation to
   * @param {string} header - Column header to find
   * @private
   */
  function validateDate(sh, header) {
    var col = CollegeTools.Utils.colIndex(sh, header);
    if (!col) return;
    var rule = SpreadsheetApp.newDataValidation().requireDate().build();
    sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setDataValidation(rule);
  }

  /**
   * Applies number formatting to a column.
   * @param {Sheet} sh - The sheet to apply formatting to
   * @param {string} header - Column header to find
   * @param {string} pattern - Number format pattern (e.g., "0.0%", "$#,##0")
   * @private
   */
  function formatNumber(sh, header, pattern) {
    var col = CollegeTools.Utils.colIndex(sh, header);
    if (!col) return;
    sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setNumberFormat(pattern);
  }

  /**
   * Test function to diagnose college name validation issues.
   * Creates a simple test to verify the validateListFromRange function works.
   */
  function testCollegeNameValidation() {
    var ss = SpreadsheetApp.getActive();
    var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);

    if (!collegesSheet) {
      SpreadsheetApp.getUi().alert('Error: Colleges sheet not found');
      return;
    }

    // Check if there's data in the expected range
    var testRange = collegesSheet.getRange('A2:A10');
    var values = testRange.getValues();
    var collegeCount = 0;
    var colleges = [];

    for (var i = 0; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString().trim() !== '') {
        collegeCount++;
        colleges.push(values[i][0].toString());
      }
    }

    if (collegeCount === 0) {
      SpreadsheetApp.getUi().alert('No college names found in A2:A10 of Colleges sheet');
      return;
    }

    // Test applying validation to Campus Visit sheet
    var campusVisit = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (!campusVisit) {
      SpreadsheetApp.getUi().alert('Campus Visit sheet not found');
      return;
    }

    validateListFromRange(campusVisit, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

    var message = 'Found ' + collegeCount + ' colleges: ' + colleges.slice(0, 3).join(', ') +
      (colleges.length > 3 ? '...' : '') +
      '\n\nValidation applied to Campus Visit sheet. Try selecting a cell in the College Name column.';

    SpreadsheetApp.getUi().alert('College Name Validation Test', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }

  /**
   * Applies formatting and dropdown validations to all sheets.
   * Sets number formats for percentages, currency, and scores.
   * Creates dropdown lists for ratings, yes/no fields, and status fields.
   * Idempotent - safe to run multiple times without side effects.
   */
  function enhanceFormatsDropdowns() {
    var ss = SpreadsheetApp.getActive();

    // Colleges sheet formatting
    var col = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (col) {
      ['Acceptance Rate', 'First-Year Retention', 'Grad Rate'].forEach(function(h) {
        formatNumber(col, h, '0.0%');
      });
      ['Median Earnings (10yr)', 'Total Cost of Attendance', 'Estimated Net Price', 'Avg Merit Aid', 'Avg Need-Based Aid']
        .forEach(function(h) {
          formatNumber(col, h, '$#,##0');
        });
      ['SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%'].forEach(function(h) {
        formatNumber(col, h, '0');
      });
      ['Distance (mi)', 'Travel Time (hrs)'].forEach(function(h) {
        formatNumber(col, h, '0.0');
      });
      ['Weighted Score', 'Value Score'].forEach(function(h) {
        formatNumber(col, h, '0.00');
      });

      ['Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)', 'Safety (1-5)',
        'Campus Culture Fit (1-5)', 'Weather Fit (1-5)', 'Clubs/Activities (1-5)', 'Personal Priority (1-5)']
        .forEach(function(h) {
          validateList(col, h, ['1', '2', '3', '4', '5']);
        });

      // Region column validation for auto-mapping compatibility
      validateList(col, 'Region', ['Northeast', 'Midwest', 'South', 'West']);
    }

    // Financial Aid Tracker formatting
    var fa = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (fa) {
      // College Name validation using dynamic range from Colleges sheet
      validateListFromRange(fa, 'College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

      ['FAFSA Deadline', 'CSS Deadline', 'Priority Deadline'].forEach(function(h) {
        validateDate(fa, h);
      });
      ['Total Cost of Attendance', 'Tuition & Fees', 'Room & Board', 'Books & Supplies', 'Personal Expenses', 'Travel Costs',
        'Federal Grants', 'State Grants', 'Institutional Grants', 'Merit Scholarships', 'Need-Based Aid',
        'Subsidized Loans', 'Unsubsidized Loans', 'Parent PLUS Loans',
        'Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost', 'Outside Scholarships Applied']
        .forEach(function(h) {
          formatNumber(fa, h, '$#,##0');
        });
    }

    // Campus Visit Tracker formatting
    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      // College Name validation using dynamic range from Colleges sheet
      validateListFromRange(cv, 'College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

      validateDate(cv, 'Visit Date');
      ['Tour Quality (1-10)', 'Info Session Quality (1-10)', 'Campus Beauty (1-10)', 'Facilities Quality (1-10)',
        'Student Happiness (1-10)', 'Academic Vibe (1-10)', 'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)', 'Visit Score']
        .forEach(function(h) {
          formatNumber(cv, h, '0');
        });
      validateList(cv, 'Visit Type (In-Person/Virtual/College Fair)',
        ['In-Person', 'Virtual', 'College Fair', 'Regional Event']);
      ['Thank You Email Sent', 'Connected on Social Media', 'Added to Mailing List', 'Additional Info Requested']
        .forEach(function(h) {
          validateList(cv, h, ['Y', 'N']);
        });
    }

    // Application Timeline formatting
    var at = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (at) {
      // College Name validation using dynamic range from Colleges sheet
      validateListFromRange(at, 'College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

      // Date columns (any header ending with Deadline/Opens/Due/Date)
      var atHdrs = at.getRange(1, 1, 1, at.getLastColumn()).getValues()[0];
      for (var i=0; i<atHdrs.length; i++) {
        var h = (atHdrs[i]||'').toString().trim();
        if (/(Deadline|Opens|Due|Date)$/i.test(h)) formatNumber(at, h, 'yyyy-mm-dd');
      }
      formatNumber(at, 'Days Until Deadline (App)', '0');
      validateList(at, 'Application Type (ED/ED2/EA/REA/RD)', ['ED', 'ED2', 'EA', 'REA', 'RD']);
      validateList(at, 'Priority Level', ['High', 'Medium', 'Low']);
    }

    // Scholarship Tracker formatting
    var sc = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    if (sc) {
      ['Amount', 'Amount Awarded'].forEach(function(h) {
        formatNumber(sc, h, '$#,##0');
      });
      ['Deadline', 'Application Started Date', 'Application Submitted Date', 'Interview Scheduled', 'Interview Completed', 'Decision Date']
        .forEach(function(h) {
          formatNumber(sc, h, 'yyyy-mm-dd');
        });
    }

    // Status Tracker formatting
    var st = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    if (st) {
      // College Name validation using dynamic range from Colleges sheet
      validateListFromRange(st, 'College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');
    }

    SpreadsheetApp.getUi().alert('Formats & dropdowns applied.');
  }

  // Public API
  return {
    enhanceFormatsDropdowns: enhanceFormatsDropdowns,
    testCollegeNameValidation: testCollegeNameValidation,
    validateList: validateList,
    validateListFromRange: validateListFromRange,
    validateDate: validateDate,
    formatNumber: formatNumber,
  };
})();
