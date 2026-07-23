/**
 * Sheet formatting and validation
 * @version 2.7.0
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

  // Validation clearing is now folded into applyColumnFormatsAndValidations_
  // (clearUntargeted): it writes a full-height rule grid in one call, so every
  // row lands in the same known state without a separate clear pass. This also
  // repairs stray/inconsistent rules left by botched column inserts or hand
  // edits — a dropdown on a numeric column, or a date picker on only some rows.

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
   * Attaches explanatory notes to header cells so cost/data-source context
   * travels with the column itself, without adding new columns.
   * @param {Sheet} sh - Target sheet
   * @param {number} headerRow - Header row number
   * @param {Array<{header: string, note: string}>} noteSpecs - Header/note pairs
   * @private
   */
  function setHeaderNotes_(sh, headerRow, noteSpecs) {
    noteSpecs.forEach(function(spec) {
      var colIdx = findColumn_(sh, spec.header, headerRow);
      if (colIdx) sh.getRange(headerRow, colIdx).setNote(spec.note);
    });
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

  /**
   * Builds a dropdown validation rule for a fixed option list.
   * @param {string[]} options - Allowed values
   * @returns {DataValidation} Built rule
   * @private
   */
  function listRule_(options) {
    return SpreadsheetApp.newDataValidation()
      .requireValueInList(options, true)
      .setAllowInvalid(false)
      .build();
  }

  /**
   * Builds a date validation rule.
   * @returns {DataValidation} Built rule
   * @private
   */
  function dateRule_() {
    return SpreadsheetApp.newDataValidation().requireDate().build();
  }

  /**
   * Builds a dropdown validation rule sourced from another sheet's range.
   * @param {string} sourceSheetName - Source sheet name
   * @param {string} sourceRange - A1 range in the source sheet
   * @returns {DataValidation|null} Built rule or null when the source is missing
   * @private
   */
  function rangeRule_(sourceSheetName, sourceRange) {
    var sourceSheet = SpreadsheetApp.getActive().getSheetByName(sourceSheetName);
    if (!sourceSheet) return null;
    return SpreadsheetApp.newDataValidation()
      .requireValueInRange(sourceSheet.getRange(sourceRange), true)
      .setAllowInvalid(false)
      .build();
  }

  /**
   * Resolves a header-name to 1-based column map from a single header-row read.
   * @param {Sheet} sh - Target sheet
   * @param {number} headerRow - Header row number
   * @param {number} lastCol - Last column
   * @returns {Object} Header text to column index
   * @private
   */
  function headerColumnMap_(sh, headerRow, lastCol) {
    var hdrs = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    var map = {};
    for (var i = 0; i < hdrs.length; i++) {
      var h = (hdrs[i] || '').toString().trim();
      if (h && !(h in map)) map[h] = i + 1;
    }
    return map;
  }

  /**
   * Applies per-column number formats and dropdown/date validations to a sheet
   * in at most one setNumberFormats and one setDataValidations call, instead of
   * one range write per column. Validation is applied across the full sheet
   * height so empty rows keep their dropdowns.
   * @param {Sheet} sh - Target sheet
   * @param {number=} headerRow - Header row override (schema default otherwise)
   * @param {Array<{header: string, pattern: string}>=} numberFormats - Format specs
   * @param {Array<{header: string, rule: DataValidation}>=} validations - Rule specs
   * @param {boolean=} clearUntargeted - When true, columns without a rule are
   *   cleared (replacing a prior clear-then-reapply). When false, existing
   *   validations on untargeted columns are preserved.
   * @private
   */
  function applyColumnFormatsAndValidations_(sh, headerRow, numberFormats, validations, clearUntargeted) {
    if (!sh) return;
    var resolvedHeaderRow = resolveHeaderRow_(sh, headerRow);
    var dataStart = resolvedHeaderRow + 1;
    var lastCol = Math.max(1, sh.getLastColumn());
    var rowCount = Math.max(1, sh.getMaxRows() - resolvedHeaderRow);
    var colByHeader = headerColumnMap_(sh, resolvedHeaderRow, lastCol);

    if (numberFormats && numberFormats.length) {
      var fmtRange = sh.getRange(dataStart, 1, rowCount, lastCol);
      var fmtGrid = fmtRange.getNumberFormats();
      var wroteFormats = false;
      numberFormats.forEach(function(spec) {
        var c = colByHeader[spec.header];
        if (!c) return;
        wroteFormats = true;
        for (var r = 0; r < rowCount; r++) fmtGrid[r][c - 1] = spec.pattern;
      });
      if (wroteFormats) fmtRange.setNumberFormats(fmtGrid);
    }

    if (validations) {
      var valRange = sh.getRange(dataStart, 1, rowCount, lastCol);
      var valGrid;
      if (clearUntargeted) {
        valGrid = [];
        for (var r2 = 0; r2 < rowCount; r2++) {
          var nullRow = [];
          for (var c2 = 0; c2 < lastCol; c2++) nullRow.push(null);
          valGrid.push(nullRow);
        }
      } else {
        valGrid = valRange.getDataValidations();
      }
      var appliedRule = false;
      validations.forEach(function(spec) {
        var c = colByHeader[spec.header];
        if (!c || !spec.rule) return;
        appliedRule = true;
        for (var r3 = 0; r3 < rowCount; r3++) valGrid[r3][c - 1] = spec.rule;
      });
      if (appliedRule || clearUntargeted) valRange.setDataValidations(valGrid);
    }
  }


  var STANDARD_VALIDATIONS = {};
  STANDARD_VALIDATIONS[CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID] = {
    range: [['College Name', CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000']],
    date: ['FAFSA Deadline', 'CSS Deadline', 'Priority Deadline'],
    list: [
      ['FAFSA Submitted (Y/N)', ['Y', 'N']],
      ['CSS Profile Status', ['Not Required', 'Not Started', 'Submitted']],
      ['IDOC Status', ['Not Required', 'Not Started', 'Submitted']],
      ['Verification Status', ['Not Required', 'Not Started', 'Submitted']],
      ['Work-Study Offered', ['Y', 'N']],
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
      ['Award Status (Pending/Awarded/Declined)', ['Pending', 'Awarded', 'Declined', 'Waitlisted', 'Other']],
    ],
  };

  /**
   * Builds the validation rule specs for a sheet from STANDARD_VALIDATIONS.
   * @param {Sheet} sh - Target sheet
   * @returns {Array<{header: string, rule: DataValidation}>} Rule specs
   * @private
   */
  function buildStandardValidationSpecs_(sh) {
    var spec = STANDARD_VALIDATIONS[sh.getName()];
    var specs = [];
    if (!spec) return specs;

    (spec.range || []).forEach(function(entry) {
      var rule = rangeRule_(entry[1], entry[2]);
      if (rule) specs.push({header: entry[0], rule: rule});
    });
    (spec.date || []).forEach(function(header) {
      specs.push({header: header, rule: dateRule_()});
    });
    (spec.list || []).forEach(function(entry) {
      specs.push({header: entry[0], rule: listRule_(entry[1])});
    });
    return specs;
  }

  /**
   * Applies shared dropdown/date validation specs for tracker sheets in a single
   * batched write, preserving validations on any columns outside the spec.
   * @param {Sheet} sh - Target sheet
   */
  function applyStandardValidations(sh) {
    if (!sh) return;
    var validations = buildStandardValidationSpecs_(sh);
    if (!validations.length) return;
    applyColumnFormatsAndValidations_(sh, null, null, validations, false);
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

    /**
     * Collects {header, pattern} specs for headers sharing one number format.
     * @param {string[]} headers - Column headers
     * @param {string} pattern - Number format pattern
     * @returns {Array<Object>} Format specs
     */
    function fmts(headers, pattern) {
      return headers.map(function(header) {
        return {header: header, pattern: pattern};
      });
    }
    /**
     * Collects {header, rule} specs for headers sharing one dropdown list.
     * @param {string[]} headers - Column headers
     * @param {string[]} options - Allowed dropdown values
     * @returns {Array<Object>} Validation specs
     */
    function listSpecs(headers, options) {
      return headers.map(function(header) {
        return {header: header, rule: listRule_(options)};
      });
    }

    var col = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (col) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.COLLEGES);
      var collegeFormats = fmts(['Acceptance Rate', 'First-Year Retention', 'Grad Rate'], '0.0%')
        .concat(fmts(['Median Earnings (10yr)', 'Total Cost of Attendance', 'Estimated Net Price'], '$#,##0'))
        .concat(fmts(['SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%'], '0'))
        .concat(fmts(['Weighted Score'], '0.00'));
      var collegeValidations = listSpecs(
        ['Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)', 'Safety (1-5)',
          'Campus Culture Fit (1-5)', 'Weather Fit (1-5)', 'Clubs/Activities (1-5)', 'Personal Priority (1-5)'],
        ['1', '2', '3', '4', '5'])
        .concat([
          {header: 'Type (Public/Private)',
            rule: listRule_(['Public', 'Private (nonprofit)', 'Private (for-profit)', 'Other'])},
          {header: 'Campus Setting', rule: listRule_(['City', 'Suburban', 'Town', 'Rural', 'Other'])},
        ]);
      applyColumnFormatsAndValidations_(col, 2, collegeFormats, collegeValidations, true);
      setHeaderNotes_(col, 2, [
        {header: 'Total Cost of Attendance',
          note: 'Source: U.S. Dept. of Education College Scorecard, most recently reported class year. ' +
            'This is the sticker price before aid — see the Financial Aid Tracker for your household\'s ' +
            'actual out-of-pocket estimate.'},
        {header: 'Estimated Net Price',
          note: 'Source: College Scorecard\'s average net price across all aid recipients at this school ' +
            '(most recently reported class year) — a national benchmark, not your family\'s specific cost. ' +
            'Use the school\'s own Net Price Calculator and the Financial Aid Tracker for a household-specific ' +
            'estimate.'},
        {header: 'Median Earnings (10yr)',
          note: 'Source: U.S. Dept. of Education College Scorecard, most recently reported cohort.'},
        {header: 'Typical Debt at Graduation',
          note: 'Source: U.S. Dept. of Education College Scorecard, most recently reported completers.'},
        {header: 'Pell Grant Rate',
          note: 'Source: U.S. Dept. of Education College Scorecard, most recently reported class year.'},
      ]);
    }


    var travel = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
    if (travel) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
      var travelFormats = fmts(['Distance from Home (mi)'], '0')
        .concat(fmts(['Estimated Drive Time', 'Estimated Flight/Travel Time'], '0.0'))
        .concat(fmts(['Travel Cost per Trip', 'Annual Travel Cost'], '$#,##0'))
        .concat(fmts(['Trips Home Per Year'], '0'));
      var travelValidations = [
        {header: 'Likely Travel Mode', rule: listRule_(['Drive', 'Drive or Fly', 'Fly'])},
      ];
      applyColumnFormatsAndValidations_(travel, 1, travelFormats, travelValidations, true);
      travel.getRange(2, 16).setNumberFormat('$0.00');
      travel.getRange(3, 16, 2, 1).setNumberFormat('0');
      travel.getRange(5, 16, 2, 1).setNumberFormat('$#,##0');
      travel.getRange(7, 16).setNumberFormat('0');
    }

    var fa = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (fa) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
      var faFormats = fmts(['Total Cost of Attendance', 'Tuition & Fees', 'Room & Board', 'Books & Supplies',
        'Personal Expenses', 'Travel Costs', 'Federal Grants', 'State Grants', 'Institutional Grants',
        'Merit Scholarships', 'Need-Based Aid', 'Subsidized Loans', 'Unsubsidized Loans', 'Parent PLUS Loans',
        'Net Price After Aid', 'Out-of-Pocket Cost', '4-Year Projected Cost', 'Outside Scholarships Applied'], '$#,##0')
        .concat(fmts(['4-Year Burden'], '0.0%'));
      applyColumnFormatsAndValidations_(fa, 1, faFormats, buildStandardValidationSpecs_(fa), true);
      setHeaderNotes_(fa, 1, [
        {header: 'EFC (Expected Family Contribution)',
          note: 'Pulled from your Personal Profile. This is household-specific (your own FAFSA/CSS estimate), ' +
            'unlike the Colleges sheet\'s Estimated Net Price, which is a school-wide average.'},
        {header: 'Net Price After Aid',
          note: 'Calculated from the actual cost and aid figures you enter below for this college — your real, ' +
            'household-specific estimate, not the school-wide average shown on the Colleges sheet.'},
      ]);
    }

    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
      var cvFormats = fmts(['Campus & Facilities (1-10)', 'Academic Vibe (1-10)', 'Social Atmosphere (1-10)',
        'Overall Gut Feeling (1-10)', 'Visit Score'], '0');
      applyColumnFormatsAndValidations_(cv, 1, cvFormats, buildStandardValidationSpecs_(cv), true);
    }

    var at = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (at) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
      // Date columns are matched dynamically by header name, then merged with
      // the sheet's standard validation specs.
      var atValidations = buildStandardValidationSpecs_(at);
      var atHdrs = at.getRange(1, 1, 1, at.getLastColumn()).getValues()[0];
      for (var i = 0; i < atHdrs.length; i++) {
        var atHeader = (atHdrs[i] || '').toString().trim();
        if (/(Deadline|Opens|Due|Date)$/i.test(atHeader)) {
          atValidations.push({header: atHeader, rule: dateRule_()});
        }
      }
      var atFormats = fmts(['Days Until Deadline (App)', 'Completion Status (%)'], '0');
      applyColumnFormatsAndValidations_(at, 1, atFormats, atValidations, true);
    }

    var sc = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    if (sc) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
      var scFormats = fmts(['Amount', 'Amount Awarded'], '$#,##0');
      applyColumnFormatsAndValidations_(sc, 1, scFormats, buildStandardValidationSpecs_(sc), true);
    }

    var st = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    if (st) {
      sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
      var stFormats = fmts(['Scholarship Offer ($)'], '$#,##0');
      applyColumnFormatsAndValidations_(st, 1, stFormats, buildStandardValidationSpecs_(st), true);
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
