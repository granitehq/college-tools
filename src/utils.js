/**
 * Utility functions for College Tools
 * @version 1.2.6
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
   * Determines the US region for a given state abbreviation.
   * @param {string} st - Two-letter state abbreviation
   * @returns {string} Region name (Northeast, Midwest, South, West) or empty string
   */
  function getRegionForState(st) {
    if (!st) return '';
    st = (st+'').trim().toUpperCase();
    var m = CollegeTools.Config.REGION_MAP;
    if (m.NORTHEAST.indexOf(st) !== -1) return 'Northeast';
    if (m.MIDWEST.indexOf(st) !== -1) return 'Midwest';
    if (m.SOUTH.indexOf(st) !== -1) return 'South';
    if (m.WEST.indexOf(st) !== -1) return 'West';
    return ''; // unknown / territory
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
   */
  function trimAllSheets() {
    // Main sheets - keep more rows for colleges
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.COLLEGES, 200);

    // Tracker sheets - fewer rows needed
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER, 150); // Scholarships might need more
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER, 100);

    SpreadsheetApp.getUi().alert('Sheet Performance Optimization',
      'Trimmed all sheets to optimal row counts:\n' +
      '• Colleges: 200 rows\n' +
      '• Trackers: 100-150 rows\n\n' +
      'This should significantly improve performance!',
      SpreadsheetApp.getUi().ButtonSet.OK);
  }

  /**
   * Ensures a college exists in a tracker sheet and updates its data.
   * @param {Sheet} sh - The tracker sheet
   * @param {string} collegeHeader - Header name for the college column
   * @param {string} collegeName - Name of the college
   * @param {Object} updatesObj - Object with column headers as keys and values to set
   */
  function ensureCollegeRowAndSet(sh, collegeHeader, collegeName, updatesObj) {
    var nameCol = colIndex(sh, collegeHeader);
    if (!nameCol) return;
    var last = Math.max(2, sh.getLastRow());
    var foundRow = null;
    var vals = sh.getRange(2, nameCol, last-1, 1).getValues();
    for (var i=0; i<vals.length; i++) {
      if ((vals[i][0]||'').toString().trim().toLowerCase() === collegeName.toString().trim().toLowerCase()) {
        foundRow = i+2;
        break;
      }
    }
    if (!foundRow) {
      foundRow = last+1;
      sh.getRange(foundRow, nameCol).setValue(collegeName);
    }
    if (updatesObj && Object.keys(updatesObj).length) {
      for (var key in updatesObj) {
        if (!updatesObj.hasOwnProperty(key)) continue;
        var c = colIndex(sh, key);
        if (!c) continue;
        sh.getRange(foundRow, c).setValue(updatesObj[key]);
      }
    }
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

  /**
   * Validates and sanitizes SAT score input.
   * @param {*} score - Raw SAT score input
   * @returns {number|null} Valid SAT score or null if invalid
   */
  function validateSATScore(score) {
    if (score === null || score === undefined || score === '') return null;

    var num = Number(score);
    if (isNaN(num)) return null;

    // SAT scores range from 400-1600 (after 2016 redesign)
    if (num < 400 || num > 1600) return null;

    return Math.round(num);
  }

  /**
   * Validates and sanitizes ACT score input.
   * @param {*} score - Raw ACT score input
   * @returns {number|null} Valid ACT score or null if invalid
   */
  function validateACTScore(score) {
    if (score === null || score === undefined || score === '') return null;

    var num = Number(score);
    if (isNaN(num)) return null;

    // ACT scores range from 1-36
    if (num < 1 || num > 36) return null;

    return Math.round(num);
  }

  /**
   * Validates and sanitizes GPA input.
   * @param {*} gpa - Raw GPA input
   * @returns {number|null} Valid GPA or null if invalid
   */
  function validateGPA(gpa) {
    if (gpa === null || gpa === undefined || gpa === '') return null;

    var num = Number(gpa);
    if (isNaN(num)) return null;

    // GPA typically ranges from 0.0-4.0 (some schools go to 5.0+ with weighted)
    if (num < 0.0 || num > 5.0) return null;

    return Math.round(num * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validates and sanitizes cost input (tuition, room & board, etc.).
   * @param {*} cost - Raw cost input
   * @returns {number|null} Valid cost or null if invalid
   */
  function validateCost(cost) {
    if (cost === null || cost === undefined || cost === '') return null;

    var num = Number(cost);
    if (isNaN(num)) return null;

    // Reasonable cost range: $0 - $250,000 per year (covers highest private colleges)
    if (num < 0 || num > 250000) return null;

    return Math.round(num);
  }

  /**
   * Validates and sanitizes family income input.
   * @param {*} income - Raw income input
   * @returns {number|null} Valid income or null if invalid
   */
  function validateFamilyIncome(income) {
    if (income === null || income === undefined || income === '') return null;

    var num = Number(income);
    if (isNaN(num)) return null;

    // Reasonable income range: $0 - $1,000,000 per year
    if (num < 0 || num > 1000000) return null;

    return Math.round(num);
  }

  /**
   * General string sanitization for user inputs.
   * @param {string} input - Raw string input
   * @param {number} maxLength - Maximum allowed length (default: 100)
   * @returns {string} Sanitized string
   */
  function sanitizeString(input, maxLength) {
    if (!input) return '';

    maxLength = maxLength || 100;
    var sanitized = input.toString().trim();

    // Length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove control characters and very dangerous chars
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F<>\"']/g, '');

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
    getRegionForState: getRegionForState,
    ensureCollegeRowAndSet: ensureCollegeRowAndSet,
    trimAllSheets: trimAllSheets,
    sanitizeCollegeName: sanitizeCollegeName,
    validateSATScore: validateSATScore,
    validateACTScore: validateACTScore,
    validateGPA: validateGPA,
    validateCost: validateCost,
    validateFamilyIncome: validateFamilyIncome,
    sanitizeString: sanitizeString,
  };
})();
