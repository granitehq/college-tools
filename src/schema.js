/**
 * Workbook schema metadata and column ownership boundaries.
 * @version 2.6.1
 * @author College Tools
 * @description Central sheet schema definitions for safe refactoring
 */

/**
 * CollegeTools.Schema - Workbook schema metadata module
 * Declares header rows, data start rows, stable column keys, and ownership groups.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Schema = (function() {
  'use strict';

  /**
   * Builds a column key to header-label map.
   * @param {Array<string>} headers - Sheet headers; included to make the source of labels explicit
   * @param {Array<Array<string>>} keys - Pairs of stable key and header label
   * @returns {Object} Column key map
   * @private
   */
  function keyMap(headers, keys) {
    var map = {};
    keys.forEach(function(entry) {
      map[entry[0]] = entry[1];
    });
    return map;
  }

  /**
   * Builds a lookup object from a list of keys.
   * @param {Array<string>} keys - Stable column keys
   * @returns {Object} Lookup set keyed by column key
   * @private
   */
  function setFromKeys(keys) {
    var out = {};
    keys.forEach(function(key) {
      out[key] = true;
    });
    return out;
  }

  var SHEETS = {
    COLLEGES: {
      sheetName: CollegeTools.Config.SHEET_NAMES.COLLEGES,
      headerRow: 2,
      dataStartRow: 3,
      headers: CollegeTools.Config.HEADERS.COLLEGES,
      columns: keyMap(CollegeTools.Config.HEADERS.COLLEGES, [
        ['COLLEGE_NAME', 'College Name'],
        ['CITY', 'City'],
        ['STATE', 'State'],
        ['REGION', 'Region'],
        ['TYPE', 'Type (Public/Private)'],
        ['ACCEPTANCE_RATE', 'Acceptance Rate'],
        ['RETENTION_RATE', 'First-Year Retention'],
        ['GRAD_RATE', 'Grad Rate'],
        ['EARNINGS_10YR', 'Median Earnings (10yr)'],
        ['TOTAL_COST', 'Total Cost of Attendance'],
        ['NET_PRICE', 'Estimated Net Price'],
        ['LINK', 'Link'],
        ['SAT_25', 'SAT 25%'],
        ['SAT_75', 'SAT 75%'],
        ['ACT_25', 'ACT 25%'],
        ['ACT_75', 'ACT 75%'],
        ['PROGRAM_FIT', 'Program Fit (1-5)'],
        ['ACADEMIC_REPUTATION', 'Academic Reputation (1-5)'],
        ['RESEARCH_OPPORTUNITIES', 'Research Opportunities (1-5)'],
        ['SAFETY', 'Safety (1-5)'],
        ['CAMPUS_CULTURE_FIT', 'Campus Culture Fit (1-5)'],
        ['WEATHER_FIT', 'Weather Fit (1-5)'],
        ['CLUBS_ACTIVITIES', 'Clubs/Activities (1-5)'],
        ['PERSONAL_PRIORITY', 'Personal Priority (1-5)'],
        ['WEIGHTED_SCORE', 'Weighted Score'],
        ['ADMISSION_FIT', 'Admission Fit'],
        ['CAMPUS_SETTING', 'Campus Setting'],
        ['TEST_OPTIONAL', 'Test Optional'],
        ['IN_STATE_TUITION', 'In-State Tuition'],
        ['OUT_OF_STATE_TUITION', 'Out-of-State Tuition'],
        ['APPLICABLE_TUITION', 'Applicable Tuition'],
        ['TYPICAL_DEBT', 'Typical Debt at Graduation'],
        ['PELL_GRANT_RATE', 'Pell Grant Rate'],
        ['NOTES', 'Notes'],
      ]),
      apiColumns: setFromKeys([
        'CITY', 'STATE', 'REGION', 'TYPE', 'ACCEPTANCE_RATE', 'RETENTION_RATE',
        'GRAD_RATE', 'EARNINGS_10YR', 'TOTAL_COST', 'NET_PRICE', 'LINK',
        'SAT_25', 'SAT_75', 'ACT_25', 'ACT_75', 'CAMPUS_SETTING',
        'TEST_OPTIONAL', 'IN_STATE_TUITION', 'OUT_OF_STATE_TUITION',
        'TYPICAL_DEBT', 'PELL_GRANT_RATE',
      ]),
      userColumns: setFromKeys([
        'COLLEGE_NAME', 'PROGRAM_FIT', 'ACADEMIC_REPUTATION', 'RESEARCH_OPPORTUNITIES',
        'SAFETY', 'CAMPUS_CULTURE_FIT', 'WEATHER_FIT', 'CLUBS_ACTIVITIES',
        'PERSONAL_PRIORITY', 'NOTES',
      ]),
      formulaColumns: setFromKeys([
        'WEIGHTED_SCORE', 'ADMISSION_FIT', 'APPLICABLE_TUITION',
      ]),
      linkedColumns: {},
    },
    FINANCIAL_AID: {
      sheetName: CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID,
      headerRow: 1,
      dataStartRow: 2,
      headers: CollegeTools.Config.HEADERS.FINANCIAL_AID,
      columns: keyMap(CollegeTools.Config.HEADERS.FINANCIAL_AID, [
        ['COLLEGE_NAME', 'College Name'],
        ['TOTAL_COST', 'Total Cost of Attendance'],
        ['SUBSIDIZED_LOANS', 'Subsidized Loans'],
        ['UNSUBSIDIZED_LOANS', 'Unsubsidized Loans'],
        ['PARENT_PLUS_LOANS', 'Parent PLUS Loans'],
        ['NET_PRICE_AFTER_AID', 'Net Price After Aid'],
        ['OUT_OF_POCKET_COST', 'Out-of-Pocket Cost'],
        ['FOUR_YEAR_PROJECTED_COST', '4-Year Projected Cost'],
        ['FINANCIAL_SAFETY', 'Financial Safety'],
        ['FOUR_YEAR_BURDEN', '4-Year Burden'],
        ['AID_REQUIREMENTS_COMPLETE', 'Aid Requirements Complete'],
      ]),
      apiColumns: {},
      userColumns: {},
      formulaColumns: setFromKeys([
        'NET_PRICE_AFTER_AID', 'OUT_OF_POCKET_COST', 'FOUR_YEAR_PROJECTED_COST',
        'FINANCIAL_SAFETY', 'FOUR_YEAR_BURDEN', 'AID_REQUIREMENTS_COMPLETE',
      ]),
      linkedColumns: setFromKeys(['COLLEGE_NAME', 'TOTAL_COST']),
    },
    CAMPUS_VISIT: {
      sheetName: CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT,
      headerRow: 1,
      dataStartRow: 2,
      headers: CollegeTools.Config.HEADERS.CAMPUS_VISIT,
      columns: keyMap(CollegeTools.Config.HEADERS.CAMPUS_VISIT, [
        ['COLLEGE_NAME', 'College Name'],
        ['VISIT_SCORE', 'Visit Score'],
      ]),
      apiColumns: {},
      userColumns: {},
      formulaColumns: setFromKeys(['VISIT_SCORE']),
      linkedColumns: setFromKeys(['COLLEGE_NAME']),
    },
    APPLICATION_TIMELINE: {
      sheetName: CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE,
      headerRow: 1,
      dataStartRow: 2,
      headers: CollegeTools.Config.HEADERS.APPLICATION_TIMELINE,
      columns: keyMap(CollegeTools.Config.HEADERS.APPLICATION_TIMELINE, [
        ['COLLEGE_NAME', 'College Name'],
        ['DAYS_UNTIL_DEADLINE', 'Days Until Deadline (App)'],
      ]),
      apiColumns: {},
      userColumns: {},
      formulaColumns: setFromKeys(['DAYS_UNTIL_DEADLINE']),
      linkedColumns: setFromKeys(['COLLEGE_NAME']),
    },
    STATUS_TRACKER: {
      sheetName: CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER,
      headerRow: 1,
      dataStartRow: 2,
      headers: CollegeTools.Config.HEADERS.STATUS_TRACKER,
      columns: keyMap(CollegeTools.Config.HEADERS.STATUS_TRACKER, [
        ['COLLEGE_NAME', 'College Name'],
        ['DECISION_RESULT', 'Decision/Result'],
        ['DOCUMENTS_COMPLETE', 'Documents Complete'],
      ]),
      apiColumns: {},
      userColumns: {},
      formulaColumns: setFromKeys(['DOCUMENTS_COMPLETE']),
      linkedColumns: setFromKeys(['COLLEGE_NAME']),
    },
    SCHOLARSHIP_TRACKER: {
      sheetName: CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER,
      headerRow: 1,
      dataStartRow: 2,
      headers: CollegeTools.Config.HEADERS.SCHOLARSHIP_TRACKER,
      columns: keyMap(CollegeTools.Config.HEADERS.SCHOLARSHIP_TRACKER, [
        ['SCHOLARSHIP_NAME', 'Scholarship Name'],
        ['AMOUNT', 'Amount'],
        ['AWARD_STATUS', 'Award Status (Pending/Awarded/Declined)'],
        ['AMOUNT_AWARDED', 'Amount Awarded'],
      ]),
      apiColumns: {},
      userColumns: {},
      formulaColumns: {},
      linkedColumns: {},
    },
  };

  /**
   * Gets schema metadata for a sheet.
   * @param {string} sheetKey - Stable sheet key
   * @returns {Object} Sheet schema metadata
   */
  function getSheet(sheetKey) {
    var sheet = SHEETS[sheetKey];
    if (!sheet) throw new Error('Unknown schema sheet: ' + sheetKey);
    return sheet;
  }

  /**
   * Resolves a configured sheet name to its stable sheet key.
   * @param {string} sheetName - Configured sheet name
   * @returns {string|null} Stable sheet key, or null when unknown
   */
  function getSheetKeyByName(sheetName) {
    for (var key in SHEETS) {
      if (SHEETS.hasOwnProperty(key) && SHEETS[key].sheetName === sheetName) return key;
    }
    return null;
  }

  /**
   * Resolves a stable column key to its current header label.
   * @param {string} sheetKey - Stable sheet key
   * @param {string} columnKey - Stable column key
   * @returns {string} Header label
   */
  function header(sheetKey, columnKey) {
    var sheet = getSheet(sheetKey);
    var label = sheet.columns[columnKey];
    if (!label) throw new Error('Unknown schema column: ' + sheetKey + '.' + columnKey);
    return label;
  }

  /**
   * Returns whether a column key is in a schema ownership group.
   * @param {string} groupName - Ownership group property name
   * @param {string} sheetKey - Stable sheet key
   * @param {string} columnKey - Stable column key
   * @returns {boolean} Whether the column belongs to the group
   * @private
   */
  function hasColumn(groupName, sheetKey, columnKey) {
    var sheet = getSheet(sheetKey);
    return !!(sheet[groupName] && sheet[groupName][columnKey]);
  }

  /**
   * Validates a header row against the schema definition for a sheet.
   * @param {string} sheetKey - Stable sheet key
   * @param {Array<string>} headerRowValues - Header row values to validate
   * @returns {Object} Validation result with ok and missingHeaders
   */
  function validateHeaderRow(sheetKey, headerRowValues) {
    var sheet = getSheet(sheetKey);
    var present = {};
    (headerRowValues || []).forEach(function(value) {
      present[(value || '').toString().trim()] = true;
    });

    var missingHeaders = [];
    sheet.headers.forEach(function(label) {
      if (!present[label]) missingHeaders.push(label);
    });

    return {
      ok: missingHeaders.length === 0,
      missingHeaders: missingHeaders,
    };
  }

  /**
   * Resolves a schema column key to the current workbook column index.
   * @param {string} sheetKey - Stable sheet key
   * @param {string} columnKey - Stable column key
   * @param {Sheet} sheet - Sheet to inspect
   * @returns {number|null} 1-based column index, or null when absent
   */
  function columnIndex(sheetKey, columnKey, sheet) {
    var schema = getSheet(sheetKey);
    var label = header(sheetKey, columnKey);
    var lastColumn = Math.max(1, sheet.getLastColumn());
    var headerValues = sheet.getRange(schema.headerRow, 1, 1, lastColumn).getValues()[0];

    for (var i = 0; i < headerValues.length; i++) {
      if ((headerValues[i] || '').toString().trim() === label) return i + 1;
    }
    return null;
  }

  /**
   * Builds a bounded A1 data range for a schema column.
   * @param {string} sheetKey - Stable sheet key
   * @param {string} columnKey - Stable column key
   * @param {Sheet} sheet - Sheet to inspect
   * @param {number} endRow - Last row for the range
   * @returns {string|null} A1 range without sheet name, or null when absent
   */
  function rangeA1(sheetKey, columnKey, sheet, endRow) {
    var schema = getSheet(sheetKey);
    var index = columnIndex(sheetKey, columnKey, sheet);
    if (!index) return null;
    var letter = CollegeTools.Utils.columnToLetter(index);
    return letter + schema.dataStartRow + ':' + letter + endRow;
  }

  /**
   * Validates the configured workbook shape against schema metadata.
   * @param {Spreadsheet} spreadsheet - Workbook to validate
   * @returns {Object} Validation result with ok and errors
   */
  function validateWorkbookShape(spreadsheet) {
    var errors = [];

    for (var sheetKey in SHEETS) {
      if (!SHEETS.hasOwnProperty(sheetKey)) continue;
      var schema = SHEETS[sheetKey];
      var sheet = spreadsheet.getSheetByName(schema.sheetName);
      if (!sheet) {
        errors.push({
          code: 'missing_sheet',
          sheetKey: sheetKey,
          sheetName: schema.sheetName,
        });
        continue;
      }

      var lastColumn = Math.max(1, sheet.getLastColumn());
      var headerRowValues = sheet.getRange(schema.headerRow, 1, 1, lastColumn).getValues()[0];
      var headerResult = validateHeaderRow(sheetKey, headerRowValues);
      headerResult.missingHeaders.forEach(function(header) {
        errors.push({
          code: 'missing_header',
          sheetKey: sheetKey,
          sheetName: schema.sheetName,
          headerRow: schema.headerRow,
          header: header,
        });
      });
    }

    return {
      ok: errors.length === 0,
      errors: errors,
    };
  }

  return {
    getSheet: getSheet,
    getSheetKeyByName: getSheetKeyByName,
    columnIndex: columnIndex,
    rangeA1: rangeA1,
    header: header,
    isApiColumn: function(sheetKey, columnKey) {
      return hasColumn('apiColumns', sheetKey, columnKey);
    },
    isUserColumn: function(sheetKey, columnKey) {
      return hasColumn('userColumns', sheetKey, columnKey);
    },
    isFormulaColumn: function(sheetKey, columnKey) {
      return hasColumn('formulaColumns', sheetKey, columnKey);
    },
    isLinkedColumn: function(sheetKey, columnKey) {
      return hasColumn('linkedColumns', sheetKey, columnKey);
    },
    validateHeaderRow: validateHeaderRow,
    validateWorkbookShape: validateWorkbookShape,
  };
})();
