/**
 * Utility functions for College Tools
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
    ranges.forEach(function(r){ r.setBackground(bg); });
    Utilities.sleep(350);
    ranges.forEach(function(r){ r.setBackground(null); });
  }

  /**
   * Navigates through a nested object using a path array.
   * @param {Object} obj - The object to navigate
   * @param {string[]} pathArr - Array of property names forming the path
   * @returns {*} The value at the path, or empty string if not found
   */
  function getPath(obj, pathArr) {
    var cur = obj;
    for (var i=0;i<pathArr.length;i++){ 
      if (cur==null) return ""; 
      cur = cur[pathArr[i]]; 
    }
    return (cur==null ? "" : cur);
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
    if (v!=="" && v!=null) return v;
    if (obj && typeof obj==="object" && flatKey in obj) return obj[flatKey];
    return "";
  }

  /**
   * Escapes special regex characters in a string for use in regex patterns.
   * @param {string} s - String to escape
   * @returns {string} Escaped string safe for regex
   */
  function escapeRegex(s) { 
    return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); 
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
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#f1f3f4');
    sh.setFrozenRows(1);
    for (var c=1;c<=headers.length;c++) sh.autoResizeColumn(c);
  }

  /**
   * Finds the column index for a given header in the first row.
   * @param {Sheet} sh - The sheet to search
   * @param {string} header - The header text to find
   * @returns {number|null} 1-based column index or null if not found
   */
  function colIndex(sh, header) {
    var last = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(1,1,1,last).getValues()[0];
    for (var i=0;i<hdrs.length;i++) {
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
    var temp, letter = '';
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
    if (!st) return "";
    st = (st+"").trim().toUpperCase();
    var m = CollegeTools.Config.REGION_MAP;
    if (m.NORTHEAST.indexOf(st) !== -1) return 'Northeast';
    if (m.MIDWEST.indexOf(st)   !== -1) return 'Midwest';
    if (m.SOUTH.indexOf(st)     !== -1) return 'South';
    if (m.WEST.indexOf(st)      !== -1) return 'West';
    return ""; // unknown / territory
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
    for (var i=0;i<vals.length;i++){
      if ((vals[i][0]||'').toString().trim().toLowerCase() === collegeName.toString().trim().toLowerCase()){
        foundRow = i+2; 
        break;
      }
    }
    if (!foundRow) { 
      foundRow = last+1; 
      sh.getRange(foundRow, nameCol).setValue(collegeName); 
    }
    if (updatesObj && Object.keys(updatesObj).length){
      for (var key in updatesObj){
        if (!updatesObj.hasOwnProperty(key)) continue;
        var c = colIndex(sh, key); 
        if (!c) continue;
        sh.getRange(foundRow, c).setValue(updatesObj[key]);
      }
    }
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
    ensureCollegeRowAndSet: ensureCollegeRowAndSet
  };
})();