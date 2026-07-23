/**
 * Utility functions for College Tools
 * @version 2.7.0
 * @author College Tools
 * @description Helper functions for sheets, formatting, and data manipulation
 */

/**
 * CollegeTools.Utils - Utility module
 * Contains helper functions for sheets, formatting, and data manipulation
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Utils = (function() {
  'use strict';

  /**
   * Briefly highlights the given ranges with a yellow background for visual feedback.
   * @param {Range[]} ranges - Array of Google Sheets Range objects to highlight
   */
  function highlight(ranges) {
    var bg = '#FFF3CD';
    ranges.forEach(function(r) {
      r.setBackground(bg);
    });
    Utilities.sleep(350);
    ranges.forEach(function(r) {
      r.setBackground(null);
    });
  }

  /**
   * Navigates through a nested object using a path array.
   * @param {Object} obj - The object to navigate
   * @param {string[]} pathArr - Array of property names forming the path
   * @returns {*} The value at the path, or empty string if not found
   */
  function getPath(obj, pathArr) {
    var cur = obj;
    for (var i=0; i<pathArr.length; i++) {
      if (cur==null) return '';
      cur = cur[pathArr[i]];
    }
    return (cur==null ? '' : cur);
  }

  /**
   * Gets a field value from an object, trying nested path first, then flat key as fallback.
   * @param {Object} obj - The object to search
   * @param {string[]} nestedPathArr - Array of property names for nested access
   * @param {string} flatKey - Flat property key to try if nested path fails
   * @returns {*} The field value or empty string if not found
   */
  function getField(obj, nestedPathArr, flatKey) {
    var v = getPath(obj, nestedPathArr);
    if (v!=='' && v!=null) return v;
    if (obj && typeof obj==='object' && flatKey in obj) return obj[flatKey];
    return '';
  }

  /**
   * Escapes special regex characters in a string for use in regex patterns.
   * @param {string} s - String to escape
   * @returns {string} Escaped string safe for regex
   */
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Ensures a sheet exists in the spreadsheet, creating it if necessary.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @param {string} name - Name of the sheet to ensure exists
   * @returns {Sheet} The existing or newly created sheet
   */
  function ensureSheet(ss, name) {
    var sh = ss.getSheetByName(name);
    return sh ? sh : ss.insertSheet(name);
  }

  /**
   * Sets headers in the first row of a sheet with formatting.
   * @param {Sheet} sh - The sheet to set headers on
   * @param {string[]} headers - Array of header names
   */
  function setHeaders(sh, headers) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f3f4');
    sh.setFrozenRows(1);
    for (var c=1; c<=headers.length; c++) sh.autoResizeColumn(c);
  }

  /**
   * Finds the column index for a given header in the first row.
   * @param {Sheet} sh - The sheet to search
   * @param {string} header - The header text to find
   * @returns {number|null} 1-based column index or null if not found
   */
  function colIndex(sh, header) {
    var last = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(1, 1, 1, last).getValues()[0];
    for (var i=0; i<hdrs.length; i++) {
      if ((hdrs[i]||'').toString().trim() === header) return i+1;
    }
    return null;
  }

  /**
   * Finds the column index for a given header in row 2.
   * Used for the Colleges sheet, which keeps headers on row 2.
   * @param {Sheet} sh - The sheet to search
   * @param {string} header - The header text to find
   * @returns {number|null} 1-based column index or null if not found
   */
  function colIndex2(sh, header) {
    var last = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(2, 1, 1, last).getValues()[0];
    for (var i=0; i<hdrs.length; i++) {
      if ((hdrs[i]||'').toString().trim() === header) return i+1;
    }
    return null;
  }

  /**
   * Converts a column number to its letter representation (1=A, 27=AA, etc).
   * @param {number} column - 1-based column number
   * @returns {string} Column letter(s)
   */
  function columnToLetter(column) {
    var temp; var letter = '';
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }

  /**
   * Creates an A1 notation cell address from row and column numbers.
   * @param {number} row - Row number
   * @param {number} col - Column number (1-based)
   * @returns {string} A1 notation address (e.g., "B3")
   */
  function addr(row, col) {
    return columnToLetter(col) + row;
  }

  /**
   * Trims sheets to a maximum number of rows for better performance.
   * Removes excess rows beyond the specified limit to reduce formula calculations.
   * @param {string} sheetName - Name of the sheet to trim
   * @param {number} maxRows - Maximum number of rows to keep (default: 200)
   */
  function trimSheetRows(sheetName, maxRows) {
    maxRows = maxRows || 200;
    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    var currentRows = sheet.getMaxRows();
    if (currentRows <= maxRows) return; // Already trimmed

    var rowsToDelete = currentRows - maxRows;
    sheet.deleteRows(maxRows + 1, rowsToDelete);
  }

  /**
   * Trims all College Tools sheets to improve performance.
   * Reduces rows to 200 maximum for main sheets, 100 for tracker sheets.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress the completion alert
   * @returns {Object} Optimization summary
   */
  function trimAllSheets(opts) {
    opts = opts || {};
    // Main sheets - keep more rows for colleges
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.COLLEGES, 200);

    // Tracker sheets - fewer rows needed
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER, 150); // Scholarships might need more
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER, 100);

    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert('Sheet Performance Optimization',
        'Trimmed all sheets to optimal row counts:\n' +
        '• Colleges: 200 rows\n' +
        '• Trackers: 100-150 rows\n\n' +
        'This should significantly improve performance!',
        SpreadsheetApp.getUi().ButtonSet.OK);
    }
    return {ok: true, message: 'Trimmed all sheets to optimal row counts'};
  }

  /**
   * Sanitizes college name input to prevent injection and abuse.
   * @param {string} collegeName - Raw college name from user input
   * @returns {string} Sanitized college name
   */
  function sanitizeCollegeName(collegeName) {
    if (!collegeName) return '';

    var sanitized = collegeName.toString().trim();

    // Length limit to prevent abuse
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200);
    }

    // Remove potentially dangerous characters but keep common punctuation
    // Allow: letters, numbers, spaces, hyphens, apostrophes, periods, commas, parentheses, ampersands
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-'.(),&]/g, '');

    // Collapse multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized.trim();
  }

  // Public API
  return {
    highlight: highlight,
    getPath: getPath,
    getField: getField,
    escapeRegex: escapeRegex,
    ensureSheet: ensureSheet,
    setHeaders: setHeaders,
    colIndex: colIndex,
    columnToLetter: columnToLetter,
    addr: addr,
    colIndex2: colIndex2,
    trimAllSheets: trimAllSheets,
    sanitizeCollegeName: sanitizeCollegeName,
  };
})();
