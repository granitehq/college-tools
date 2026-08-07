/**
 * Utility functions for College Tools
 * @version 3.0.2
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
    var existing = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    var changed = existing.length !== headers.length || existing.some(function(header, index) {
      return header !== headers[index];
    });
    if (!changed) return false;

    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f3f4');
    sh.setFrozenRows(1);
    if (sh.autoResizeColumns) {
      sh.autoResizeColumns(1, headers.length);
    } else {
      for (var c=1; c<=headers.length; c++) sh.autoResizeColumn(c);
    }
    return true;
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
   * Ensures an internal system column exists as the final used column and is
   * hidden from normal spreadsheet users. Moving the entire column preserves
   * values, formulas, formatting, notes, and validations in existing copies.
   * @param {Sheet} sh - Target sheet
   * @param {string} header - System-column header
   * @param {number=} headerRow - Header row, defaults to row 1
   * @returns {number} Final 1-based column index
   */
  function ensureHiddenLastColumn(sh, header, headerRow) {
    headerRow = headerRow || 1;
    var lastCol = Math.max(1, sh.getLastColumn());
    var headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    var columns = [];
    for (var i = 0; i < headers.length; i++) {
      if ((headers[i] || '').toString().trim() === header) {
        columns.push(i + 1);
      }
    }

    var column = columns.length ? columns[columns.length - 1] : null;
    if (columns.length > 1) {
      var lastRow = Math.max(headerRow, sh.getLastRow());
      var rowCount = lastRow - headerRow;
      if (rowCount > 0) {
        var sourceValues = columns.map(function(sourceColumn) {
          return sh.getRange(headerRow + 1, sourceColumn, rowCount, 1).getValues();
        });
        var mergedValues = [];
        for (var r = 0; r < rowCount; r++) {
          var value = '';
          for (var source = sourceValues.length - 1; source >= 0; source--) {
            var candidate = sourceValues[source][r][0];
            if (candidate !== '' && candidate !== null && candidate !== undefined) {
              value = candidate;
              break;
            }
          }
          mergedValues.push([value]);
        }
        sh.getRange(headerRow + 1, column, rowCount, 1).setValues(mergedValues);
      }

      for (var duplicate = columns.length - 2; duplicate >= 0; duplicate--) {
        var duplicateColumn = columns[duplicate];
        sh.deleteColumn(duplicateColumn);
        if (duplicateColumn < column) column--;
      }
      lastCol = Math.max(1, sh.getLastColumn());
    }

    if (!column) {
      column = lastCol + 1;
      sh.getRange(headerRow, column).setValue(header);
    } else if (column < lastCol) {
      sh.moveColumns(sh.getRange(1, column, sh.getMaxRows(), 1), lastCol + 1);
      column = lastCol;
    }

    if (!sh.isColumnHiddenByUser || !sh.isColumnHiddenByUser(column)) {
      sh.hideColumns(column);
    }
    return column;
  }

  /**
   * Formats milliseconds as a short user-facing estimate.
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Rounded duration text
   */
  function formatDuration(durationMs) {
    var seconds = Math.max(1, Math.round(durationMs / 1000));
    if (seconds < 60) return seconds + ' second' + (seconds === 1 ? '' : 's');
    var minutes = Math.round(seconds / 60);
    return minutes + ' minute' + (minutes === 1 ? '' : 's');
  }

  /**
   * Returns a workbook-specific prior duration when available.
   * @param {string} workflowKey - Stable workflow timing key
   * @param {number} fallbackMs - Default estimate before the first run
   * @returns {number} Estimated duration in milliseconds
   */
  function estimatedDuration(workflowKey, fallbackMs) {
    try {
      if (typeof PropertiesService === 'undefined') return fallbackMs;
      var value = PropertiesService.getDocumentProperties()
        .getProperty('college_tools_timing_' + workflowKey);
      return value ? Number(value) || fallbackMs : fallbackMs;
    } catch (error) {
      return fallbackMs;
    }
  }

  /**
   * Records an exponential moving average for future estimates.
   * @param {string} workflowKey - Stable workflow timing key
   * @param {number} durationMs - Most recent duration in milliseconds
   */
  function recordDuration(workflowKey, durationMs) {
    try {
      if (typeof PropertiesService === 'undefined') return;
      var props = PropertiesService.getDocumentProperties();
      var propertyKey = 'college_tools_timing_' + workflowKey;
      var prior = Number(props.getProperty(propertyKey));
      var average = prior ? Math.round((prior * 0.7) + (durationMs * 0.3)) : Math.round(durationMs);
      props.setProperty(propertyKey, String(average));
    } catch (error) {
      // Timing history is optional and must never fail the workflow.
    }
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
   * @param {number} maxRows - Maximum number of rows to keep (default: 100)
   */
  function trimSheetRows(sheetName, maxRows) {
    maxRows = maxRows || 100;
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
   * Reduces every sheet to 100 rows maximum, comfortably above realistic
   * college-list sizes.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress the completion alert
   * @returns {Object} Optimization summary
   */
  function trimAllSheets(opts) {
    opts = opts || {};
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.COLLEGES, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER, 100);
    trimSheetRows(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER, 100);

    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert('Sheet Performance Optimization',
        'Trimmed all sheets to a maximum of 100 rows.\n\n' +
        'This should significantly improve performance!',
        SpreadsheetApp.getUi().ButtonSet.OK);
    }
    return {ok: true, message: 'Trimmed all sheets to optimal row counts'};
  }

  /**
   * Applies the workflow-first order for known tabs without deleting or
   * renaming custom sheets. Hidden sheets are skipped while visible tabs are
   * moved, which naturally leaves internal sheets after the visible workflow.
   * @param {Spreadsheet=} spreadsheet - Workbook, defaults to the active one
   * @returns {Object} Ordering summary
   */
  function applyCanonicalSheetOrder(spreadsheet) {
    var ss = spreadsheet || SpreadsheetApp.getActive();
    var activeSheet = ss.getActiveSheet ? ss.getActiveSheet() : null;
    var nextPosition = 1;
    var moved = 0;

    (CollegeTools.Config.SHEET_ORDER || []).forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet || (sheet.isSheetHidden && sheet.isSheetHidden())) return;
      if (!sheet.getIndex || sheet.getIndex() !== nextPosition) {
        ss.setActiveSheet(sheet);
        ss.moveActiveSheet(nextPosition);
        moved++;
      }
      nextPosition++;
    });

    if (activeSheet && ss.getSheetByName(activeSheet.getName())) {
      ss.setActiveSheet(activeSheet);
    }
    return {
      ok: true,
      code: 'canonical_sheet_order_applied',
      message: 'Workbook tabs arranged in workflow order',
      moved: moved,
    };
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
    ensureHiddenLastColumn: ensureHiddenLastColumn,
    formatDuration: formatDuration,
    estimatedDuration: estimatedDuration,
    recordDuration: recordDuration,
    columnToLetter: columnToLetter,
    addr: addr,
    colIndex2: colIndex2,
    trimAllSheets: trimAllSheets,
    applyCanonicalSheetOrder: applyCanonicalSheetOrder,
    sanitizeCollegeName: sanitizeCollegeName,
  };
})();
