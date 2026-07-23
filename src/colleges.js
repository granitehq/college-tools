/**
 * College data operations
 * @version 2.7.0
 * @author College Tools
 * @description Core college data management and filling
 */

/**
 * CollegeTools.Colleges - College data management module
 * Handles filling college data and batch operations
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Colleges = (function() {
  'use strict';

  /**
   * Returns the 1-based column index for a required header in a pre-read header array.
   * Throws if the header is not found, making misconfigured column maps fail loudly.
   * @param {Array<string>} hdrs - Pre-read array of header strings
   * @param {string} h - Header text to find
   * @returns {number} 1-based column index
   * @throws {Error} If header not found
   * @private
   */
  function requireCol_(hdrs, h) {
    var i = hdrs.indexOf(h);
    if (i === -1) throw new Error('Missing header: ' + h);
    return i + 1;
  }


  /**
   * Returns a required Colleges column index from a schema column key.
   * @param {Array<string>} hdrs - Header row values
   * @param {string} columnKey - Schema column key
   * @returns {number} 1-based column index
   * @private
   */
  function requiredCollegeColumn_(hdrs, columnKey) {
    return requireCol_(hdrs, CollegeTools.Schema.header('COLLEGES', columnKey));
  }

  /**
   * Returns an optional Colleges column index from a schema column key.
   * @param {Array<string>} hdrs - Header row values
   * @param {string} columnKey - Schema column key
   * @returns {number} 1-based column index or -1 when absent
   * @private
   */
  function optionalCollegeColumn_(hdrs, columnKey) {
    var label = CollegeTools.Schema.header('COLLEGES', columnKey);
    var index = hdrs.indexOf(label);
    return index === -1 ? -1 : index + 1;
  }

  /**
   * Auto-appends the College ID column to Colleges sheets that predate stable
   * college identity. Existing IDs (if any) are left untouched.
   * @param {Sheet} sh - Colleges sheet
   * @returns {Array<string>} Refreshed row-2 headers
   * @private
   */
  function ensureCollegesIdColumn_(sh) {
    var lastCol = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });

    if (hdrs.indexOf(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID')) !== -1) return hdrs;

    var idCol = lastCol + 1;
    sh.getRange(2, idCol).setValue(CollegeTools.Schema.header('COLLEGES', 'COLLEGE_ID'));

    lastCol = Math.max(1, sh.getLastColumn());
    return sh.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });
  }

  /**
   * Returns a Colleges row's stable College ID, generating one if the cell is
   * currently blank. Never overwrites an existing ID. Callers are responsible
   * for persisting the returned id (fillCollegeRowCore folds it into its
   * batched row write) rather than this helper writing the cell directly, so
   * a single row refresh still performs one setValues() call instead of two
   * separate writes.
   * @param {Sheet} sh - Colleges sheet
   * @param {number} row - 1-based row number
   * @param {number} idCol - 1-based College ID column index
   * @returns {string} The row's College ID
   * @private
   */
  function ensureCollegeIdForRow_(sh, row, idCol) {
    if (!idCol || idCol === -1) return '';
    var existing = (sh.getRange(row, idCol).getValue() || '').toString().trim();
    if (existing) return existing;
    return Utilities.getUuid();
  }

  /**
   * Builds the canonical Colleges column map used by single-row and batch fill.
   * @param {Array<string>} hdrs - Row-2 Colleges headers
   * @returns {Object} Column map
   * @private
   */
  function buildCollegesColumnMap_(hdrs) {
    return {
      NAME: requiredCollegeColumn_(hdrs, 'COLLEGE_NAME'),
      CITY: requiredCollegeColumn_(hdrs, 'CITY'),
      STATE: requiredCollegeColumn_(hdrs, 'STATE'),
      TYPE: requiredCollegeColumn_(hdrs, 'TYPE'),
      ACC: requiredCollegeColumn_(hdrs, 'ACCEPTANCE_RATE'),
      RET: requiredCollegeColumn_(hdrs, 'RETENTION_RATE'),
      GRAD: requiredCollegeColumn_(hdrs, 'GRAD_RATE'),
      EARN: requiredCollegeColumn_(hdrs, 'EARNINGS_10YR'),
      COA: requiredCollegeColumn_(hdrs, 'TOTAL_COST'),
      NET: requiredCollegeColumn_(hdrs, 'NET_PRICE'),
      LINK: requiredCollegeColumn_(hdrs, 'LINK'),
      SAT25: requiredCollegeColumn_(hdrs, 'SAT_25'),
      SAT75: requiredCollegeColumn_(hdrs, 'SAT_75'),
      ACT25: requiredCollegeColumn_(hdrs, 'ACT_25'),
      ACT75: requiredCollegeColumn_(hdrs, 'ACT_75'),
      CAMPUS_SETTING: optionalCollegeColumn_(hdrs, 'CAMPUS_SETTING'),
      TEST_OPTIONAL: optionalCollegeColumn_(hdrs, 'TEST_OPTIONAL'),
      IN_STATE_TUITION: optionalCollegeColumn_(hdrs, 'IN_STATE_TUITION'),
      OUT_OF_STATE_TUITION: optionalCollegeColumn_(hdrs, 'OUT_OF_STATE_TUITION'),
      APPLICABLE_TUITION: optionalCollegeColumn_(hdrs, 'APPLICABLE_TUITION'),
      TYPICAL_DEBT: optionalCollegeColumn_(hdrs, 'TYPICAL_DEBT'),
      PELL_GRANT_RATE: optionalCollegeColumn_(hdrs, 'PELL_GRANT_RATE'),
      NOTES: requiredCollegeColumn_(hdrs, 'NOTES'),
      COLLEGE_ID: optionalCollegeColumn_(hdrs, 'COLLEGE_ID'),
      HEADERS: hdrs,
    };
  }

  var PRESERVED_HEADERS = {
    'College Name': true,
    'Program Fit (1-5)': true,
    'Academic Reputation (1-5)': true,
    'Research Opportunities (1-5)': true,
    'Safety (1-5)': true,
    'Campus Culture Fit (1-5)': true,
    'Weather Fit (1-5)': true,
    'Clubs/Activities (1-5)': true,
    'Personal Priority (1-5)': true,
    'Weighted Score': true,
    'Admission Fit': true,
    'College ID': true,
    // Preserved so the auto-stamp check in fillCollegeRowCore can decide:
    // user-entered notes survive a re-fill, auto-stamps get refreshed.
    'Notes': true,
  };

  /**
   * Returns whether a Notes cell holds no user content — either empty or a
   * prior auto-stamp written by fillCollegeRowCore (e.g. "1.2.3 | School Name"
   * or "1.2.3 | no match for ...").
   * @param {string} notes - Current Notes cell value
   * @returns {boolean} True if the cell may be overwritten
   * @private
   */
  function isAutoStampNotes_(notes) {
    var trimmed = (notes || '').toString().trim();
    return !trimmed || /^\d+\.\d+\.\d+\s*\|/.test(trimmed);
  }


  /**
   * Maps College Scorecard test requirement codes to a simple Test Optional value.
   * @param {*} code - Scorecard test requirement code or label
   * @returns {string} Yes/No/Unknown display value
   * @private
   */
  function testOptionalFromRequirement_(code) {
    if (code === null || code === undefined || code === '') return '';
    var value = String(code).toLowerCase().trim();
    if (value === '1' || value === 'required') return 'No';
    if (value === '2' || value.indexOf('recommend') !== -1) return 'No';
    if (value === '3' || value === '4' || value === '5' ||
        value.indexOf('optional') !== -1 || value.indexOf('not required') !== -1 ||
        value.indexOf('neither') !== -1 || value.indexOf('considered') !== -1) return 'Yes';
    return 'Unknown';
  }

  /**
   * Returns whether a Colleges header should be preserved when refreshing a row.
   * User-entered rating columns and formula columns should survive replacing a college.
   * @param {string} header - Header text from row 2
   * @returns {boolean} True if the column should not be cleared during refresh
   * @private
   */
  function shouldPreserveHeader(header) {
    return !!PRESERVED_HEADERS[(header || '').toString().trim()];
  }

  /**
   * Displays the current version of College Tools in an alert dialog.
   */
  function showVersion() {
    var versionInfo = 'College Tools Version Information\n\n';
    versionInfo += '📊 Version: ' + CollegeTools.Config.VERSION + '\n';
    versionInfo += '🔧 Runtime: Google Apps Script V8\n';
    versionInfo += '🌐 API: College Scorecard (api.data.gov)\n\n';

    versionInfo += '✨ Key Features:\n';
    versionInfo += '• College data auto-fill from official sources\n';
    versionInfo += '• Financial intelligence with merit aid predictions\n';
    versionInfo += '• Application tracking with 5 specialized sheets\n';
    versionInfo += '• Admission chances calculator\n';
    versionInfo += '• Comprehensive dashboard and analytics\n\n';

    versionInfo += '🔒 Security: Minimal OAuth scopes, input validation\n';
    versionInfo += '⚡ Performance: Batch operations, API caching\n\n';

    versionInfo += 'Need help? Check the Instructions sheet!';

    SpreadsheetApp.getUi().alert('College Tools Version', versionInfo, SpreadsheetApp.getUi().ButtonSet.OK);
  }

  /**
   * Maps College Scorecard locale codes to a coarse campus setting.
   * Locale families are grouped as City, Suburban, Town, and Rural.
   * @param {*} localeCode - Raw school.locale value
   * @returns {string} Campus setting or empty string when unavailable
   * @private
   */
  function campusSettingFromLocale_(localeCode) {
    if (localeCode === null || localeCode === undefined || localeCode === '') return '';

    var code = Number(localeCode);
    if (isNaN(code)) return '';

    if (code >= 11 && code <= 13) return 'City';
    if (code >= 21 && code <= 23) return 'Suburban';
    if (code >= 31 && code <= 33) return 'Town';
    if (code >= 41 && code <= 43) return 'Rural';
    if (code === 1) return 'City';
    if (code === 2) return 'Suburban';
    if (code === 3) return 'Town';
    if (code === 4) return 'Rural';
    return '';
  }

  /**
   * Debug version of fillCollegeRow that shows detailed information about what's happening.
   */
  function debugFillCollegeRow() {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);

    if (!sh) {
      SpreadsheetApp.getUi().alert('Error: Colleges sheet not found');
      return;
    }

    var row = sh.getActiveCell().getRow();
    var collegeName = (sh.getRange(row, 1).getValue() || '').toString().trim();

    // Basic debug info
    var debug = 'Debugging Fill Operation\n';
    debug += 'Row: ' + row + ', College: "' + collegeName + '"\n';

    // Check API key
    try {
      var apiKey = CollegeTools.Scorecard.getApiKey();
      debug += 'API Key: ' + (apiKey ? 'Present' : 'MISSING') + '\n';
    } catch (e) {
      debug += 'API Key Error: ' + e.toString() + '\n';
    }

    if (!collegeName) {
      SpreadsheetApp.getUi().alert('Cannot proceed', 'NO COLLEGE NAME in selected row', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    // Record data before operation
    var beforeData = sh.getRange(row, 1, 1, Math.min(20, sh.getLastColumn())).getValues()[0];

    try {
      // Run fill operation with tracker setup disabled for debugging
      var result = fillCollegeRowCore(row, {suppressAlert: true, skipTrackerSetup: true});

      // Check if any data was actually written to the sheet
      var afterData = sh.getRange(row, 1, 1, Math.min(10, sh.getLastColumn())).getValues()[0];

      var changedColumns = [];
      var hasNewData = false;

      for (var i = 1; i < Math.min(beforeData.length, afterData.length); i++) { // Skip column A (college name)
        var before = (beforeData[i] || '').toString();
        var after = (afterData[i] || '').toString();

        if (before !== after) {
          hasNewData = true;
          changedColumns.push('Col' + (i+1) + ': "' + before + '" → "' + after + '"');
        }
      }

      var resultMsg = debug + '\nResults:\n';
      resultMsg += 'Success: ' + (result ? result.ok : 'false') + '\n';
      resultMsg += 'Data Changes: ' + (hasNewData ? 'YES (' + changedColumns.length + ' columns)' : 'NO') + '\n';

      if (hasNewData && changedColumns.length > 0) {
        resultMsg += 'Sample: ' + changedColumns.slice(0, 2).join(', ');
        if (changedColumns.length > 2) {
          resultMsg += ' ...and ' + (changedColumns.length - 2) + ' more';
        }
      }

      SpreadsheetApp.getUi().alert('Debug Complete', resultMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {
      SpreadsheetApp.getUi().alert('Debug Error', 'Exception: ' + e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }

  /**
   * Core function that fills a row with college data from the Scorecard API.
   * Used by both single-row and batch fill operations.
   * @param {number} row - Row number to fill (1-based)
   * @param {Object} opts - Options object
   * @param {boolean} opts.suppressAlert - If true, suppresses UI alerts
   * @param {boolean} opts.skipHighlight - If true, skips cell highlighting for performance
   * @param {boolean} opts.skipTrackerSetup - If true, skips tracker setup for performance
   * @param {Object} opts.columnIndexes - Pre-computed column indexes for batch operations
   * @returns {Object} Result object with {ok: boolean, msg: string}
   * @private
   */
  function fillCollegeRowCore(row, opts) {
    opts = opts || {};
    var suppressAlert = !!opts.suppressAlert;
    var skipHighlight = !!opts.skipHighlight;
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) {
      if (!suppressAlert) {
        SpreadsheetApp.getUi().alert('Sheet "' +
        CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.');
      }
      return {ok: false, msg: 'no sheet'};
    }
    if (row < 3) {
      if (!suppressAlert) SpreadsheetApp.getUi().alert('Click a data row (row 3 or below).');
      return {ok: false, msg: 'row<3'};
    }

    var hdrs = opts.columnIndexes ? opts.columnIndexes.HEADERS : null;
    if (!hdrs) {
      hdrs = ensureCollegesIdColumn_(sh);
    }
    var COL = opts.columnIndexes || buildCollegesColumnMap_(hdrs);
    var lastCol = Math.min(hdrs.length, sh.getLastColumn());
    var rowRange = sh.getRange(row, 1, 1, lastCol);
    var rowValues = rowRange.getValues()[0];
    var rowFormulas = rowRange.getFormulas()[0];

    var name = (rowValues[COL.NAME - 1] || '').toString().trim();
    if (!name) return {ok: false, msg: 'empty name'};

    // Sanitize college name to prevent injection and abuse
    var sanitizedName = CollegeTools.Utils.sanitizeCollegeName(name);
    if (!sanitizedName) return {ok: false, msg: 'invalid name after sanitization'};

    // Replace stale sample/template data in memory while preserving user-owned ratings and formulas.
    var nextRowValues = rowValues.slice();
    for (var c = 0; c < lastCol; c++) {
      if (shouldPreserveHeader(hdrs[c])) {
        nextRowValues[c] = rowFormulas[c] || rowValues[c];
      } else {
        nextRowValues[c] = '';
      }
    }
    nextRowValues[COL.NAME - 1] = sanitizedName;
    var collegeId = ensureCollegeIdForRow_(sh, row, COL.COLLEGE_ID);
    if (COL.COLLEGE_ID !== -1) {
      // ensureCollegeIdForRow_ only computes the id; fold it into
      // nextRowValues so the batched rowRange.setValues() below is what
      // actually persists it, keeping this a single-write row refresh.
      nextRowValues[COL.COLLEGE_ID - 1] = collegeId;
    }

    // Fetch college data via API
    var apiResult = CollegeTools.Scorecard.fetchCollegeData(sanitizedName, {
      executionBudget: opts.executionBudget,
    });
    if (!apiResult.ok) {
      // Don't clobber user-entered notes with the error message.
      if (isAutoStampNotes_(rowValues[COL.NOTES - 1])) {
        nextRowValues[COL.NOTES - 1] = CollegeTools.Config.VERSION + ' | ' + apiResult.error;
      }
      rowRange.setValues([nextRowValues]);
      // Sync the typed name to trackers even without API data, so tracker rows
      // don't keep showing stale sample colleges when a lookup fails to match.
      if (!opts.skipTrackerSetup) {
        CollegeTools.Trackers.syncCollegeToTrackers({
          name: sanitizedName,
          id: collegeId,
          sourceRow: row,
        });
        if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
          CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
        }
      }
      if (!suppressAlert) SpreadsheetApp.getUi().alert('No match for "' + sanitizedName + '". See Notes.');
      return {ok: false, msg: 'no match'};
    }

    var r = apiResult.data;

    // Extract data using flattened keys (new API format)
    var usedName = r['school.name'] || '';
    var city = r['school.city'] || '';
    var state = r['school.state'] || '';
    var link = r['school.school_url'] || '';
    var ownCode = r['school.ownership'];
    var localeCode = r['school.locale'];
    var typeText = CollegeTools.Scorecard.typeFromOwnership(ownCode);
    var campusSetting = campusSettingFromLocale_(localeCode);

    var acc = r['latest.admissions.admission_rate.overall'] || '';
    var retention = r['latest.student.retention_rate.four_year.full_time'] || '';
    var gradRate = r['latest.completion.rate_suppressed.overall'] || '';
    var earnings10 = r['latest.earnings.10_yrs_after_entry.median'] || '';
    var coa = r['latest.cost.attendance.academic_year'] || '';
    var netPrice = r['latest.cost.avg_net_price.overall'] || '';
    var inStateTuition = r['latest.cost.tuition.in_state'] || '';
    var outOfStateTuition = r['latest.cost.tuition.out_of_state'] || '';
    var testOptional = testOptionalFromRequirement_(r['latest.admissions.test_requirements']);
    var typicalDebt = r['latest.aid.median_debt.completers.overall'] || '';
    var pellGrantRate = r['latest.aid.pell_grant_rate'] || '';

    /**
     * Converts value to number or null if empty.
     * @param {*} x - Value to convert
     * @return {number|null} Number or null
     * @private
     */
    function n(x) {
      return (x===null||x===undefined||x==='') ? null : Number(x);
    }
    // Extract SAT/ACT scores using flattened keys
    var sat25m = n(r['latest.admissions.sat_scores.25th_percentile.math'] || null);
    var sat25r = n(r['latest.admissions.sat_scores.25th_percentile.critical_reading'] || null);
    var sat75m = n(r['latest.admissions.sat_scores.75th_percentile.math'] || null);
    var sat75r = n(r['latest.admissions.sat_scores.75th_percentile.critical_reading'] || null);
    var satAvg = n(r['latest.admissions.sat_scores.average.overall'] || null);

    var sat25 = (sat25m!=null && sat25r!=null) ? (sat25m + sat25r) : (satAvg!=null ? satAvg : '');
    var sat75 = (sat75m!=null && sat75r!=null) ? (sat75m + sat75r) : (satAvg!=null ? satAvg : '');

    var act25 = r['latest.admissions.act_scores.25th_percentile.cumulative'] || '';
    var act75 = r['latest.admissions.act_scores.75th_percentile.cumulative'] || '';

    // Write data to sheet without overwriting unrelated cells or formulas
    var writes = [
      [COL.CITY, city],
      [COL.STATE, state],
      [COL.TYPE, typeText],
      [COL.ACC, acc],
      [COL.RET, retention],
      [COL.GRAD, gradRate],
      [COL.EARN, earnings10],
      [COL.COA, coa],
      [COL.NET, netPrice],
      [COL.LINK, link],
      [COL.SAT25, sat25],
      [COL.SAT75, sat75],
      [COL.ACT25, act25],
      [COL.ACT75, act75],
    ];
    if (COL.CAMPUS_SETTING !== -1) writes.push([COL.CAMPUS_SETTING, campusSetting]);
    if (COL.TEST_OPTIONAL !== -1) writes.push([COL.TEST_OPTIONAL, testOptional]);
    if (COL.IN_STATE_TUITION !== -1) writes.push([COL.IN_STATE_TUITION, inStateTuition]);
    if (COL.OUT_OF_STATE_TUITION !== -1) writes.push([COL.OUT_OF_STATE_TUITION, outOfStateTuition]);
    if (COL.TYPICAL_DEBT !== -1) writes.push([COL.TYPICAL_DEBT, typicalDebt]);
    if (COL.PELL_GRANT_RATE !== -1) writes.push([COL.PELL_GRANT_RATE, pellGrantRate]);
    if (COL.APPLICABLE_TUITION !== -1 && COL.IN_STATE_TUITION !== -1 && COL.OUT_OF_STATE_TUITION !== -1) {
      writes.push([COL.APPLICABLE_TUITION, '=IF(State_Residency=' +
        CollegeTools.Utils.addr(row, COL.STATE) + ',' +
        CollegeTools.Utils.addr(row, COL.IN_STATE_TUITION) + ',' +
        CollegeTools.Utils.addr(row, COL.OUT_OF_STATE_TUITION) + ')']);
    }
    writes.forEach(function(w) {
      nextRowValues[w[0] - 1] = w[1] || '';
    });
    // Only overwrite Notes when it is empty or still holds a prior auto-stamp
    // (auto-stamps look like "1.2.3 | School Name"). User-entered notes are preserved.
    if (isAutoStampNotes_(rowValues[COL.NOTES - 1])) {
      nextRowValues[COL.NOTES - 1] = CollegeTools.Config.VERSION + ' | ' + (usedName || name);
    }
    rowRange.setValues([nextRowValues]);

    if (!suppressAlert && !skipHighlight) {
      // Highlight when run one-off (skip highlighting for performance)
      var toFlash = writes.map(function(w) {
        return sh.getRange(row, w[0]);
      });
      toFlash.push(sh.getRange(row, COL.NOTES));
      CollegeTools.Utils.highlight(toFlash);
    }

    // Only sync college data to existing trackers (don't run full setup every time)
    if (!opts.skipTrackerSetup) {
      CollegeTools.Trackers.syncCollegeToTrackers({
        name: (usedName||name),
        coa: coa,
        id: collegeId,
        sourceRow: row,
      });
      if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
        CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
      }
    }

    return {ok: true, msg: 'ok'};
  }

  /**
   * Fills the currently selected row in the Colleges sheet with data from the College Scorecard API.
   * Automatically populates college information including city, state, type, acceptance rate, costs, etc.
   * Also seeds tracker sheets with the college name and triggers region auto-fill.
   */
  function fillCollegeRow() {
    var sh = SpreadsheetApp.getActive().getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) {
      SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.');
      return;
    }
    var row = sh.getActiveCell().getRow();
    var res = fillCollegeRowCore(row, {
      suppressAlert: false,
      skipHighlight: true,
    });
    if (res.ok) SpreadsheetApp.getUi().alert('Updated row ' + row + '.');
  }

  /**
   * Batch fills multiple selected rows in the Colleges sheet with data from the College Scorecard API.
   * Processes all selected rows that contain a college name, skipping empty rows.
   * Displays a summary of successful, skipped, and failed operations.
   */
  function fillSelectedRows() {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) {
      SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.');
      return;
    }

    // Use selected rows from the active range/list; require header row 2 present
    var ranges = [];
    var rl = sh.getActiveRangeList && sh.getActiveRangeList();
    if (rl) ranges = rl.getRanges();
    else {
      var r = sh.getActiveRange();
      if (!r) {
        SpreadsheetApp.getUi().alert('Select one or more rows in "' +
          CollegeTools.Config.SHEET_NAMES.COLLEGES + '" first.');
        return;
      }
      ranges = [r];
    }

    // Gather unique row numbers (only rows >=3)
    var rows = {};
    ranges.forEach(function(rg) {
      for (var r = rg.getRow(); r < rg.getRow() + rg.getNumRows(); r++) {
        if (r >= 3) rows[r] = true;
      }
    });
    var list = Object.keys(rows).map(function(x) {
      return parseInt(x, 10);
    })
      .sort(function(a, b) {
        return a-b;
      });

    if (!list.length) {
      SpreadsheetApp.getUi().alert('Select data rows (row 3 or below).');
      return;
    }

    // Note: Tracker setup is handled separately - not needed during fill operations

    // Performance optimization: Read headers once for entire batch operation.
    var hdrs = ensureCollegesIdColumn_(sh);
    var columnIndexes = buildCollegesColumnMap_(hdrs);

    // Process each row, stopping early if we approach the execution time limit
    var ok=0; var skipped=0; var failed=0; var timeLimitExceeded=false;
    var executionBudget = CollegeTools.ExecutionBudget.start(CollegeTools.Config.API_CONFIG.EXECUTION_TIME_LIMIT);

    for (var i=0; i<list.length; i++) {
      var row = list[i];
      var name = (sh.getRange(row, 1).getValue()||'').toString().trim(); // A = College Name
      if (!name) {
        skipped++; continue;
      }

      // Check execution time limit before processing each row
      if (!executionBudget.canContinue()) {
        timeLimitExceeded = true;
        SpreadsheetApp.getUi().alert('Stopping batch processing due to execution time limit. ' +
          'Processed ' + (i) + ' of ' + list.length + ' rows.');
        break;
      }

      try {
        var res = fillCollegeRowCore(row, {
          suppressAlert: true,
          columnIndexes: columnIndexes,
          executionBudget: executionBudget,
        });
        if (res && res.ok) {
          ok++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }

      // Use configured batch delay
      if (i < list.length - 1) { // Don't sleep after the last item
        Utilities.sleep(CollegeTools.Config.API_CONFIG.BATCH_DELAY);
      }
    }

    var timeLimitMessage = timeLimitExceeded ? '\n⚠️ Stopped due to execution time limit.' : '';

    SpreadsheetApp.getUi().alert('Batch fill complete.' + timeLimitMessage +
      '\nOK: ' + ok + ' | Skipped (no name): ' + skipped + ' | Failed: ' + failed);
  }

  // Public API
  return {
    showVersion: showVersion,
    debugFillCollegeRow: debugFillCollegeRow,
    fillCollegeRow: fillCollegeRow,
    fillCollegeRowCore: fillCollegeRowCore,
    fillSelectedRows: fillSelectedRows,
  };
})();
