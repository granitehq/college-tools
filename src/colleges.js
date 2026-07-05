/**
 * College data operations
 * @version 2.0.1
 * @author College Tools
 * @description Core college data management, filling, and region mapping
 */

/**
 * CollegeTools.Colleges - College data management module
 * Handles filling college data, region mapping, and batch operations
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
    'Value Score': true,
    'Admission Chances': true,
    'Academic Index Match': true,
    'Merit Aid Likelihood': true,
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
   * Clears stale college-specific values from a Colleges row while preserving user-owned
   * rating columns and formula columns.
   * Builds contiguous runs of clearable columns and issues one clearContent() per run,
   * instead of one API call per cell.
   * @param {Sheet} sh - Colleges sheet
   * @param {number} row - Absolute row number
   * @param {Array<string>} headers - Header row 2 values
   * @private
   */
  function clearStaleCollegeData_(sh, row, headers) {
    var lastCol = Math.min(headers.length, sh.getLastColumn());
    var runStart = null;
    for (var c = 1; c <= lastCol + 1; c++) {
      var clearable = c <= lastCol && !shouldPreserveHeader(headers[c - 1]);
      if (clearable && runStart === null) {
        runStart = c;
      } else if (!clearable && runStart !== null) {
        sh.getRange(row, runStart, 1, c - runStart).clearContent();
        runStart = null;
      }
    }
  }

  /**
   * Displays the current version of College Tools in an alert dialog.
   */
  function showVersion() {
    var versionInfo = 'College Tools Version Information\\n\\n';
    versionInfo += '📊 Version: ' + CollegeTools.Config.VERSION + '\\n';
    versionInfo += '🔧 Runtime: Google Apps Script V8\\n';
    versionInfo += '🌐 API: College Scorecard (api.data.gov)\\n\\n';

    versionInfo += '✨ Key Features:\\n';
    versionInfo += '• College data auto-fill from official sources\\n';
    versionInfo += '• Financial intelligence with merit aid predictions\\n';
    versionInfo += '• Application tracking with 5 specialized sheets\\n';
    versionInfo += '• Admission chances calculator\\n';
    versionInfo += '• Comprehensive dashboard and analytics\\n\\n';

    versionInfo += '🔒 Security: Minimal OAuth scopes, input validation\\n';
    versionInfo += '⚡ Performance: Batch operations, API caching\\n\\n';

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
    var columnIndexes = opts.columnIndexes || null;

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

    // Performance optimization: Use pre-computed column indexes for batch operations
    var COL; var idxRegion0;

    var hdrs;
    if (columnIndexes) {
      // Use pre-computed indexes from batch operation
      COL = {
        NAME: columnIndexes.NAME,
        CITY: columnIndexes.CITY,
        STATE: columnIndexes.STATE,
        TYPE: columnIndexes.TYPE,
        ACC: columnIndexes.ACC,
        RET: columnIndexes.RET,
        GRAD: columnIndexes.GRAD,
        EARN: columnIndexes.EARN,
        COA: columnIndexes.COA,
        NET: columnIndexes.NET,
        LINK: columnIndexes.LINK,
        SAT25: columnIndexes.SAT25,
        SAT75: columnIndexes.SAT75,
        ACT25: columnIndexes.ACT25,
        ACT75: columnIndexes.ACT75,
        CAMPUS_SETTING: columnIndexes.CAMPUS_SETTING,
        NOTES: columnIndexes.NOTES,
      };
      idxRegion0 = columnIndexes.REGION !== -1 ? columnIndexes.REGION - 1 : -1;
      hdrs = columnIndexes.HEADERS || [];
    } else {
      // Read headers for single-row operations (backward compatibility)
      hdrs = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0]
        .map(function(x) {
          return (x||'').toString().trim();
        });

      COL = {
        NAME: requireCol_(hdrs, 'College Name'),
        CITY: requireCol_(hdrs, 'City'),
        STATE: requireCol_(hdrs, 'State'),
        TYPE: requireCol_(hdrs, 'Type (Public/Private)'),
        ACC: requireCol_(hdrs, 'Acceptance Rate'),
        RET: requireCol_(hdrs, 'First-Year Retention'),
        GRAD: requireCol_(hdrs, 'Grad Rate'),
        EARN: requireCol_(hdrs, 'Median Earnings (10yr)'),
        COA: requireCol_(hdrs, 'Total Cost of Attendance'),
        NET: requireCol_(hdrs, 'Estimated Net Price'),
        LINK: requireCol_(hdrs, 'Link'),
        SAT25: requireCol_(hdrs, 'SAT 25%'),
        SAT75: requireCol_(hdrs, 'SAT 75%'),
        ACT25: requireCol_(hdrs, 'ACT 25%'),
        ACT75: requireCol_(hdrs, 'ACT 75%'),
        CAMPUS_SETTING: hdrs.indexOf('Campus Setting') !== -1 ? requireCol_(hdrs, 'Campus Setting') : -1,
        NOTES: requireCol_(hdrs, 'Notes'),
      };
      idxRegion0 = hdrs.indexOf('Region');
    }

    var name = (sh.getRange(row, COL.NAME).getValue()||'').toString().trim();
    if (!name) return {ok: false, msg: 'empty name'};

    // Sanitize college name to prevent injection and abuse
    var sanitizedName = CollegeTools.Utils.sanitizeCollegeName(name);
    if (!sanitizedName) return {ok: false, msg: 'invalid name after sanitization'};

    // Replace stale sample/template data but keep user-owned ratings and formulas.
    clearStaleCollegeData_(sh, row, hdrs);
    sh.getRange(row, COL.NAME).setValue(sanitizedName);

    // Fetch college data via API
    var apiResult = CollegeTools.Scorecard.fetchCollegeData(sanitizedName);
    if (!apiResult.ok) {
      // Don't clobber user-entered notes with the error message
      if (isAutoStampNotes_(sh.getRange(row, COL.NOTES).getValue())) {
        sh.getRange(row, COL.NOTES).setValue(CollegeTools.Config.VERSION + ' | ' + apiResult.error);
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

    var regionVal = (idxRegion0 !== -1) ? CollegeTools.Utils.getRegionForState(state) : '';
    // Ensure regionVal is always a string to prevent #VALUE! errors
    regionVal = (regionVal || '').toString();


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
    if (idxRegion0 !== -1) writes.push([idxRegion0 + 1, regionVal]);
    writes.forEach(function(w) {
      sh.getRange(row, w[0]).setValue(w[1] || '');
    });
    // Only overwrite Notes when it is empty or still holds a prior auto-stamp
    // (auto-stamps look like "1.2.3 | School Name"). User-entered notes are preserved.
    if (isAutoStampNotes_(sh.getRange(row, COL.NOTES).getValue())) {
      sh.getRange(row, COL.NOTES).setValue(CollegeTools.Config.VERSION + ' | ' + (usedName||name));
    }

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
        sourceRow: row,
      });
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
   * Automatically fills the Region column for all rows in the Colleges sheet based on state.
   * Maps US states to four regions: Northeast, Midwest, South, West.
   * Only updates rows that have a college name and where the region differs from the calculated value.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress user alerts
   * @returns {Object} Result summary with updated row count
   */
  function fillRegionsAllRows(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) {
      if (!opts.suppressAlert) {
        SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.');
      }
      return {ok: false, count: 0};
    }

    var lastRow = sh.getLastRow();
    if (lastRow < 3) {
      if (!opts.suppressAlert) SpreadsheetApp.getUi().alert('No data rows to process.');
      return {ok: true, count: 0};
    }

    // Read header row 2
    var hdrs = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(function(x) {
        return (x||'').toString().trim();
      });

    var colName = requireCol_(hdrs, 'College Name');
    var colState = requireCol_(hdrs, 'State');
    var idxRegion = hdrs.indexOf('Region');

    if (idxRegion === -1) {
      if (!opts.suppressAlert) {
        SpreadsheetApp.getUi().alert('No "Region" column found on ' +
          CollegeTools.Config.SHEET_NAMES.COLLEGES + ' sheet.');
      }
      return {ok: false, count: 0};
    }
    var colRegion = idxRegion + 1;

    var range = sh.getRange(3, 1, lastRow-2, sh.getLastColumn());
    var values = range.getValues();

    var updates = [];
    for (var r=0; r<values.length; r++) {
      var rowVals = values[r];
      var name = (rowVals[colName-1]||'').toString().trim();
      if (!name) continue; // skip empty rows
      var st = (rowVals[colState-1]||'').toString().trim();
      var currentRegion = (rowVals[colRegion-1]||'').toString().trim();
      var newRegion = CollegeTools.Utils.getRegionForState(st);
      if (newRegion && newRegion !== currentRegion) {
        updates.push({r: r+3, c: colRegion, v: newRegion}); // store absolute position
      }
    }

    updates.forEach(function(u) {
      sh.getRange(u.r, u.c).setValue(u.v);
    });
    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert('Regions updated for ' + updates.length + ' row(s).');
    }
    return {ok: true, count: updates.length};
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

    // Performance optimization: Read headers once for entire batch operation
    var hdrs = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(function(x) {
        return (x||'').toString().trim();
      });

    // Pre-compute all column indexes for batch operation
    var columnIndexes = {
      NAME: requireCol_(hdrs, 'College Name'),
      CITY: requireCol_(hdrs, 'City'),
      STATE: requireCol_(hdrs, 'State'),
      TYPE: requireCol_(hdrs, 'Type (Public/Private)'),
      ACC: requireCol_(hdrs, 'Acceptance Rate'),
      RET: requireCol_(hdrs, 'First-Year Retention'),
      GRAD: requireCol_(hdrs, 'Grad Rate'),
      EARN: requireCol_(hdrs, 'Median Earnings (10yr)'),
      COA: requireCol_(hdrs, 'Total Cost of Attendance'),
      NET: requireCol_(hdrs, 'Estimated Net Price'),
      LINK: requireCol_(hdrs, 'Link'),
      SAT25: requireCol_(hdrs, 'SAT 25%'),
      SAT75: requireCol_(hdrs, 'SAT 75%'),
      ACT25: requireCol_(hdrs, 'ACT 25%'),
      ACT75: requireCol_(hdrs, 'ACT 75%'),
      CAMPUS_SETTING: hdrs.indexOf('Campus Setting') !== -1 ? requireCol_(hdrs, 'Campus Setting') : -1,
      NOTES: requireCol_(hdrs, 'Notes'),
      REGION: hdrs.indexOf('Region') !== -1 ? hdrs.indexOf('Region') + 1 : -1,
      HEADERS: hdrs,
    };

    // Process each row with enhanced quota management
    var ok=0; var skipped=0; var failed=0; var quotaExceeded=false;
    var startTime = new Date().getTime();

    for (var i=0; i<list.length; i++) {
      var row = list[i];
      var name = (sh.getRange(row, 1).getValue()||'').toString().trim(); // A = College Name
      if (!name) {
        skipped++; continue;
      }

      // Check execution time limit before processing each row
      var elapsed = new Date().getTime() - startTime;
      if (elapsed > CollegeTools.Config.API_CONFIG.EXECUTION_TIME_LIMIT) {
        SpreadsheetApp.getUi().alert('Stopping batch processing due to execution time limit. ' +
          'Processed ' + (i) + ' of ' + list.length + ' rows.');
        break;
      }

      try {
        var res = fillCollegeRowCore(row, {
          suppressAlert: true,
          columnIndexes: columnIndexes,
        });
        if (res && res.ok) {
          ok++;
        } else {
          failed++;
          // Check if failure was due to quota limits
          if (res.msg && res.msg.includes('quota')) {
            quotaExceeded = true;
            break;
          }
        }
      } catch (e) {
        failed++;
        // Check if exception was due to quota limits
        if (e.toString().includes('quota')) {
          quotaExceeded = true;
          break;
        }
      }

      // Use configured batch delay
      if (i < list.length - 1) { // Don't sleep after the last item
        Utilities.sleep(CollegeTools.Config.API_CONFIG.BATCH_DELAY);
      }
    }

    var quotaMessage = quotaExceeded ? '\\n⚠️ Stopped due to quota/time limits.' : '';

    SpreadsheetApp.getUi().alert('Batch fill complete.' + quotaMessage +
      '\\nOK: ' + ok + ' | Skipped (no name): ' + skipped + ' | Failed: ' + failed);
  }

  // Public API
  return {
    showVersion: showVersion,
    debugFillCollegeRow: debugFillCollegeRow,
    fillCollegeRow: fillCollegeRow,
    fillSelectedRows: fillSelectedRows,
    fillRegionsAllRows: fillRegionsAllRows,
  };
})();
