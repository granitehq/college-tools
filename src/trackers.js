/**
 * Tracker sheet management
 * @version 2.5.0
 * @author College Tools
 * @description Creates and manages Financial Aid, Campus Visit, Application, and Scholarship trackers
 */

/**
 * CollegeTools.Trackers - Tracker management module
 * Creates and updates Financial Aid, Campus Visit, Application Timeline, and Scholarship tracker sheets
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Trackers = (function() {
  'use strict';

  /**
   * Returns the tracker row corresponding to a Colleges sheet row.
   * Colleges starts data on row 3, trackers on row 2.
   * @param {number} sourceRow - Row number in Colleges
   * @returns {number} Row number in tracker sheets
   * @private
   */
  function getTrackerRowForCollegeRow_(sourceRow) {
    return Math.max(2, sourceRow - 1);
  }

  /**
   * Synchronizes a single canonical Colleges row into a tracker sheet.
   * @param {Sheet} sh - Tracker sheet
   * @param {number} sourceRow - Row number from Colleges
   * @param {string} collegeName - Canonical college name for that row
   * @param {Object} updatesObj - Optional header/value updates to write
   * @private
   */
  function syncCollegeRowToSheet_(sh, sourceRow, collegeName, updatesObj) {
    if (!sh || !sourceRow) return;

    var trackerRow = getTrackerRowForCollegeRow_(sourceRow);
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    if (!nameCol) return;

    sh.getRange(trackerRow, nameCol).setValue(collegeName || '');

    if (!updatesObj) return;
    for (var key in updatesObj) {
      if (!updatesObj.hasOwnProperty(key)) continue;
      var c = CollegeTools.Utils.colIndex(sh, key);
      if (!c) continue;
      sh.getRange(trackerRow, c).setValue(updatesObj[key] || '');
    }
  }

  /**
   * Clears canonical tracker rows that no longer correspond to a college in Colleges.
   * Only clears linked columns, not the full row, to avoid destroying user formatting.
   * @param {Sheet} sh - Tracker sheet
   * @param {number} startRow - First tracker row to clear
   * @param {Array<string>} linkedHeaders - Headers to clear
   * @private
   */
  function clearTrackerRows_(sh, startRow, linkedHeaders) {
    if (!sh) return;
    var lastRow = sh.getLastRow();
    if (lastRow < startRow) return;

    linkedHeaders.forEach(function(header) {
      var c = CollegeTools.Utils.colIndex(sh, header);
      if (!c) return;
      sh.getRange(startRow, c, lastRow - startRow + 1, 1).clearContent();
    });
  }

  /**
   * Captures existing tracker rows by college name so repair can preserve user data across row reordering.
   * Duplicate names are intentionally ignored because name-only matching is ambiguous.
   * @param {Sheet} sh - Tracker sheet
   * @returns {Object} Snapshot map keyed by college name
   * @private
   */
  function snapshotRowsByCollegeName_(sh) {
    var snapshots = {};
    if (!sh) return snapshots;
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    if (!nameCol) return snapshots;

    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return snapshots;

    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var formulas = [];
    for (var r = 0; r < values.length; r++) {
      var rowFormulas = [];
      for (var c = 1; c <= lastCol; c++) {
        rowFormulas.push(sh.getRange(r + 2, c).getFormula());
      }
      formulas.push(rowFormulas);
    }

    for (var i = 0; i < values.length; i++) {
      var collegeName = (values[i][nameCol - 1] || '').toString().trim();
      if (!collegeName) continue;
      if (snapshots[collegeName]) {
        snapshots[collegeName].duplicate = true;
        snapshots._duplicates = snapshots._duplicates || [];
        snapshots._duplicates.push(collegeName);
        continue;
      }
      snapshots[collegeName] = {
        values: values[i],
        formulas: formulas[i],
        duplicate: false,
      };
    }

    return snapshots;
  }

  /**
   * Restores a captured tracker row into a target row when a unique college-name match exists.
   * @param {Sheet} sh - Tracker sheet
   * @param {Object} snapshots - Snapshot map keyed by college name
   * @param {string} collegeName - College display name
   * @param {number} targetRow - Target row to restore
   * @private
   */
  function restoreTrackerRow_(sh, snapshots, collegeName, targetRow) {
    if (!sh || !collegeName) return;
    var snapshot = snapshots[collegeName];
    if (!snapshot || snapshot.duplicate) return;

    sh.getRange(targetRow, 1, 1, snapshot.values.length).setValues([snapshot.values]);
    for (var c = 0; c < snapshot.formulas.length; c++) {
      if (snapshot.formulas[c]) sh.getRange(targetRow, c + 1).setFormula(snapshot.formulas[c]);
    }
  }

  /**
   * Adds duplicate-name snapshot warnings to a repair warning list.
   * @param {Array<Object>} warnings - Warning accumulator
   * @param {Object} snapshots - Snapshot map keyed by college name
   * @param {string} sheetName - Tracker sheet name
   * @private
   */
  function collectDuplicateSnapshotWarnings_(warnings, snapshots, sheetName) {
    var seen = {};
    (snapshots._duplicates || []).forEach(function(collegeName) {
      if (seen[collegeName]) return;
      seen[collegeName] = true;
      warnings.push({
        code: 'duplicate_tracker_name',
        sheetName: sheetName,
        collegeName: collegeName,
      });
    });
  }

  /**
   * Creates or updates the Financial Aid Tracker sheet with headers and formulas.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateFinAid(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    var headers = CollegeTools.Config.HEADERS.FINANCIAL_AID;
    CollegeTools.Utils.setHeaders(sh, headers);

    // College Name validation using dynamic range from Colleges sheet
    CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000');

    ['FAFSA Deadline', 'CSS Deadline', 'Priority Deadline'].forEach(function(h) {
      CollegeTools.Formatting.validateDate(sh, h);
    });
    CollegeTools.Formatting.validateList(sh, 'CSS Profile Required (Y/N)', ['Y', 'N']);
    ['FAFSA Submitted (Y/N)', 'CSS Profile Submitted (Y/N)', 'IDOC Required (Y/N)', 'IDOC Submitted (Y/N)',
      'Verification Required (Y/N)', 'Verification Submitted (Y/N)'].forEach(function(h) {
      CollegeTools.Formatting.validateList(sh, h, ['Y', 'N']);
    });
    CollegeTools.Formatting.validateList(sh, 'Work-Study Offered', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Appeal Status',
      ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Denied']);

    // Formulas row 2 (user can fill down)
    var r2 = 2;
    var efcCol = CollegeTools.Utils.colIndex(sh, 'EFC (Expected Family Contribution)');
    if (efcCol) {
      // Prefill from the Personal Profile's EFC named range; the family can
      // override a specific college's row if its aid letter differs.
      sh.getRange(r2, efcCol).setFormula('=IFERROR(IF(EFC="","",EFC), "")');
    }

    var netCol = CollegeTools.Utils.colIndex(sh, 'Net Price After Aid');
    var oopCol = CollegeTools.Utils.colIndex(sh, 'Out-of-Pocket Cost');
    var fourYearCol = CollegeTools.Utils.colIndex(sh, '4-Year Projected Cost');
    var coaCol = CollegeTools.Utils.colIndex(sh, 'Total Cost of Attendance');
    var fedGrantsCol = CollegeTools.Utils.colIndex(sh, 'Federal Grants');
    var needAidCol = CollegeTools.Utils.colIndex(sh, 'Need-Based Aid');
    var scholarshipsCol = CollegeTools.Utils.colIndex(sh, 'Outside Scholarships Applied');

    if (netCol && coaCol && fedGrantsCol && needAidCol) {
      var netFormula = CollegeTools.Formulas.netPriceAfterAid(
        CollegeTools.Utils.addr(r2, coaCol),
        CollegeTools.Utils.addr(r2, fedGrantsCol),
        CollegeTools.Utils.addr(r2, needAidCol));
      sh.getRange(r2, netCol).setFormula(netFormula);
    }

    if (oopCol && netCol && scholarshipsCol) {
      var oopFormula = CollegeTools.Formulas.outOfPocketCost(
        CollegeTools.Utils.addr(r2, netCol),
        CollegeTools.Utils.addr(r2, scholarshipsCol));
      sh.getRange(r2, oopCol).setFormula(oopFormula);
    }

    if (fourYearCol && oopCol) {
      // Four years of cost with 3% annual increases: year1 + year2 + year3 + year4
      var fourYearFormula = CollegeTools.Formulas.fourYearProjectedCost(
        CollegeTools.Utils.addr(r2, oopCol));
      sh.getRange(r2, fourYearCol).setFormula(fourYearFormula);
    }

    // Aid Requirements Complete formula
    var completeCol = CollegeTools.Utils.colIndex(sh, 'Aid Requirements Complete');
    var fafsaSubCol = CollegeTools.Utils.colIndex(sh, 'FAFSA Submitted (Y/N)');
    var cssReqCol = CollegeTools.Utils.colIndex(sh, 'CSS Profile Required (Y/N)');
    var cssSubCol = CollegeTools.Utils.colIndex(sh, 'CSS Profile Submitted (Y/N)');
    var idocReqCol = CollegeTools.Utils.colIndex(sh, 'IDOC Required (Y/N)');
    var idocSubCol = CollegeTools.Utils.colIndex(sh, 'IDOC Submitted (Y/N)');
    var verReqCol = CollegeTools.Utils.colIndex(sh, 'Verification Required (Y/N)');
    var verSubCol = CollegeTools.Utils.colIndex(sh, 'Verification Submitted (Y/N)');

    if (completeCol && fafsaSubCol && cssSubCol) {
      var fafsaSubCell = CollegeTools.Utils.addr(r2, fafsaSubCol);
      var cssReqCell = cssReqCol ? CollegeTools.Utils.addr(r2, cssReqCol) : '';
      var cssSubCell = CollegeTools.Utils.addr(r2, cssSubCol);
      var idocReqCell = idocReqCol ? CollegeTools.Utils.addr(r2, idocReqCol) : '';
      var idocSubCell = idocSubCol ? CollegeTools.Utils.addr(r2, idocSubCol) : '';
      var verReqCell = verReqCol ? CollegeTools.Utils.addr(r2, verReqCol) : '';
      var verSubCell = verSubCol ? CollegeTools.Utils.addr(r2, verSubCol) : '';

      // Verification counts as satisfied when not required (N or blank) or
      // when submitted — without the submitted check, verification-required
      // colleges could never reach Complete.
      var verClause = '';
      if (verReqCol) {
        verClause = ',OR(' + verReqCell + '="N",' + verReqCell + '=""' +
          (verSubCol ? ',' + verSubCell + '="Y"' : '') + ')';
      }

      var completeFormula = '=IF(AND(' +
        fafsaSubCell + '="Y",' +
        'OR(' + cssReqCell + '="N",' + cssSubCell + '="Y")' +
        (idocReqCol ? ',OR(' + idocReqCell + '="N",' + idocSubCell + '="Y")' : '') +
        verClause +
        '),"✅ Complete","⚠️ Pending")';

      sh.getRange(r2, completeCol).setFormula(completeFormula);
    }
  }

  /**
   * Creates or updates the Campus Visit Tracker sheet with headers and validation.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateCampusVisit(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    var headers = CollegeTools.Config.HEADERS.CAMPUS_VISIT;
    CollegeTools.Utils.setHeaders(sh, headers);

    // College Name validation using dynamic range from Colleges sheet
    CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000');

    CollegeTools.Formatting.validateDate(sh, 'Visit Date');
    CollegeTools.Formatting.validateList(sh, 'Visit Type (In-Person/Virtual/College Fair)',
      ['In-Person', 'Virtual', 'College Fair', 'Regional Event']);
    ['Campus & Facilities (1-10)', 'Academic Vibe (1-10)', 'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)']
      .forEach(function(h) {
        CollegeTools.Formatting.validateList(sh, h, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
      });
    CollegeTools.Formatting.validateList(sh, 'Follow-Up Needed', ['Y', 'N']);
  }

  /**
   * Creates or updates the Application Timeline sheet with headers and formulas.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateAppTimeline(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    var headers = CollegeTools.Config.HEADERS.APPLICATION_TIMELINE;
    CollegeTools.Utils.setHeaders(sh, headers);

    // Optimize: Skip dynamic validation during setup for speed - can be added later if needed
    // CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
    //   CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A2:A1000');

    // Optimize: Batch validate only the most critical date columns to reduce setup time
    var criticalDateCols = ['Application Deadline', 'Decision Release Date'];
    criticalDateCols.forEach(function(h) {
      CollegeTools.Formatting.validateDate(sh, h);
    });
    CollegeTools.Formatting.validateList(sh, 'Application Type (ED/ED2/EA/REA/RD)',
      ['ED', 'ED2', 'EA', 'REA', 'RD']);
    CollegeTools.Formatting.validateList(sh, 'Priority Level', ['High', 'Medium', 'Low']);

    // Batch optimize: Set all formulas at once instead of individual calls
    var appDeadlineCol = CollegeTools.Utils.colIndex(sh, 'Application Deadline');
    var daysCol = CollegeTools.Utils.colIndex(sh, 'Days Until Deadline (App)');

    if (appDeadlineCol && daysCol) {
      // Blank deadlines stay blank instead of showing "PAST DUE"
      var deadlineCell = CollegeTools.Utils.addr(2, appDeadlineCol);
      var daysFormula = '=IF(ISNUMBER(' + deadlineCell + '), IF(' + deadlineCell +
        '-TODAY()>0, ' + deadlineCell + '-TODAY(), "PAST DUE"), "")';
      sh.getRange(2, daysCol).setFormula(daysFormula);
    }
  }

  /**
   * Applies color-coded conditional formatting to Days Until Deadline (App),
   * replacing the four separate 60/30/14/7-Day Warning boolean columns with
   * one column that carries the same signal through color.
   * @param {Sheet} sheet - The Application Timeline sheet
   */
  function enhanceApplicationTimelineFormatting(sheet) {
    if (!sheet) return;
    var daysCol = CollegeTools.Utils.colIndex(sheet, 'Days Until Deadline (App)');
    if (!daysCol) return;

    var lastRow = Math.max(2, sheet.getLastRow());
    var range = sheet.getRange(2, daysCol, lastRow - 1, 1);

    var rules = (sheet.getConditionalFormatRules() || []).filter(function(rule) {
      var ranges = rule.getRanges ? rule.getRanges() : [];
      for (var i = 0; i < ranges.length; i++) {
        if (ranges[i].getColumn() <= daysCol && ranges[i].getLastColumn() >= daysCol &&
            ranges[i].getSheet().getSheetId() === sheet.getSheetId()) {
          return false; // our rule from a prior run -- remove it
        }
      }
      return true;
    });

    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('PAST DUE').setBackground('#f8d7da').setFontColor('#721c24')
      .setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThanOrEqualTo(7).setBackground('#f8d7da').setFontColor('#721c24')
      .setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(8, 14).setBackground('#ffeaa7').setFontColor('#b95000')
      .setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(15, 30).setBackground('#fff3cd').setFontColor('#856404')
      .setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(31, 60).setBackground('#d1ecf1').setFontColor('#0c5460')
      .setRanges([range]).build());

    sheet.setConditionalFormatRules(rules);
  }

  /**
   * Creates or updates the Application Status Tracker sheet with headers and validation.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateStatusTracker(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    var headers = CollegeTools.Config.HEADERS.STATUS_TRACKER;
    CollegeTools.Utils.setHeaders(sh, headers);

    // College Name validation using dynamic range from Colleges sheet
    CollegeTools.Formatting.validateListFromRange(sh, 'College Name',
      CollegeTools.Config.SHEET_NAMES.COLLEGES, 'A3:A1000');

    // Validation for Y/N columns
    ['Transcript Sent', 'Test Scores Sent', 'Recommendations Complete', 'Essays Complete',
      'Interview (Y/N)', 'Portfolio Required (Y/N)'].forEach(function(h) {
      CollegeTools.Formatting.validateList(sh, h, ['Y', 'N']);
    });

    // Date validation. Application Deadline lives on Application Timeline
    // only -- see the sheet-ownership note on APPLICATION_TIMELINE in config.js.
    ['Submitted Date', 'Interview Date', 'Campus Visit Date', 'Portfolio Submitted (Date)']
      .forEach(function(h) {
        CollegeTools.Formatting.validateDate(sh, h);
      });

    CollegeTools.Formatting.validateList(sh, 'Application Status',
      ['Not Started', 'In Progress', 'Submitted', 'Under Review', 'Decision Received']);
    CollegeTools.Formatting.validateList(sh, 'Decision Plan', ['ED', 'ED2', 'EA', 'REA', 'RD']);
    CollegeTools.Formatting.validateList(sh, 'Decision/Result',
      ['Pending', 'Accepted', 'Deferred', 'Waitlisted', 'Rejected']);

    // Documents Complete formula in row 2
    var completeCol = CollegeTools.Utils.colIndex(sh, 'Documents Complete');
    var transcriptCol = CollegeTools.Utils.colIndex(sh, 'Transcript Sent');
    var testScoreCol = CollegeTools.Utils.colIndex(sh, 'Test Scores Sent');
    var recCol = CollegeTools.Utils.colIndex(sh, 'Recommendations Complete');
    var essayCol = CollegeTools.Utils.colIndex(sh, 'Essays Complete');

    if (completeCol && transcriptCol && testScoreCol && recCol && essayCol) {
      var r2 = 2;
      var transcriptCell = CollegeTools.Utils.addr(r2, transcriptCol);
      var essayCell = CollegeTools.Utils.addr(r2, essayCol);
      var portfolioRange = transcriptCell + ':' + essayCell;

      var formula = '=COUNTIF(' + portfolioRange + ',"Y")&"/"&COUNTA(' + portfolioRange + ')&' +
                    'IF(COUNTIF(' + portfolioRange + ',"N")=0," ✅"," ⚠️")';

      sh.getRange(r2, completeCol).setFormula(formula);
    }
  }

  /**
   * Creates or updates the Scholarship Tracker sheet with headers and validation.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateScholarships(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    var headers = CollegeTools.Config.HEADERS.SCHOLARSHIP_TRACKER;
    CollegeTools.Utils.setHeaders(sh, headers);

    CollegeTools.Formatting.validateList(sh, 'Type (Merit/Need/Field/Local/National)',
      ['Merit', 'Need', 'Field-Specific', 'Local', 'National']);
    CollegeTools.Formatting.validateList(sh, 'Award Type (One-time/Renewable)',
      ['One-time', 'Renewable']);
    CollegeTools.Formatting.validateList(sh, 'Financial Need Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Transcript Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'FAFSA Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Portfolio/Work Samples', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Interview Required', ['Y', 'N']);
    CollegeTools.Formatting.validateList(sh, 'Award Status (Pending/Awarded/Declined)',
      ['Pending', 'Awarded', 'Declined']);
    CollegeTools.Formatting.validateList(sh, 'Thank You Note Sent', ['Y', 'N']);

    ['Deadline', 'Application Started Date', 'Application Submitted Date', 'Interview Scheduled', 'Interview Completed', 'Decision Date']
      .forEach(function(h) {
        CollegeTools.Formatting.validateDate(sh, h);
      });
  }

  /**
   * Synchronizes college information to all tracker sheets.
   * @param {Object} info - College information object
   * @param {string} info.name - College name
   * @param {number} info.coa - Cost of attendance
   * @private
   */
  function syncCollegeToTrackers(info) {
    var ss = SpreadsheetApp.getActive();
    var sourceRow = info.sourceRow;
    if (!sourceRow) return;

    var fa = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (fa) {
      syncCollegeRowToSheet_(fa, sourceRow, info.name, {
        'Total Cost of Attendance': info.coa,
      });
    }

    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      syncCollegeRowToSheet_(cv, sourceRow, info.name, {});
    }

    var at = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (at) {
      syncCollegeRowToSheet_(at, sourceRow, info.name, {});
    }

    var st = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    if (st) {
      syncCollegeRowToSheet_(st, sourceRow, info.name, {});
    }
  }

  /**
   * Re-syncs all tracker tabs from the canonical Colleges sheet ordering.
   * This repairs stale sample/template names in existing downloaded spreadsheets.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress user alerts
   * @return {Object} Summary object with processed row count
   */
  function repairCollegeSync(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();
    var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!collegesSheet) {
      if (!opts.suppressAlert) {
        SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.');
      }
      return {ok: false, count: 0, warnings: warnings};
    }

    var lastRow = collegesSheet.getLastRow();
    var processed = 0;
    var warnings = [];

    if (lastRow < 3) {
      if (!opts.suppressAlert) {
        SpreadsheetApp.getUi().alert(
          'Tracker Sync Repaired',
          'No data rows found in the Colleges sheet.',
          SpreadsheetApp.getUi().ButtonSet.OK,
        );
      }
      return {ok: true, count: 0, warnings: warnings};
    }

    var faSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    var cvSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    var atSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    var stSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
    var trackerSnapshots = {
      financialAid: snapshotRowsByCollegeName_(faSheet),
      campusVisit: snapshotRowsByCollegeName_(cvSheet),
      applicationTimeline: snapshotRowsByCollegeName_(atSheet),
      statusTracker: snapshotRowsByCollegeName_(stSheet),
    };
    collectDuplicateSnapshotWarnings_(warnings, trackerSnapshots.financialAid,
      CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    collectDuplicateSnapshotWarnings_(warnings, trackerSnapshots.campusVisit,
      CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    collectDuplicateSnapshotWarnings_(warnings, trackerSnapshots.applicationTimeline,
      CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    collectDuplicateSnapshotWarnings_(warnings, trackerSnapshots.statusTracker,
      CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);

    // Read all header and data in two bulk reads instead of per-row calls
    var lastCol = collegesSheet.getLastColumn();
    var hdrs = collegesSheet.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });
    var coaIdx = hdrs.indexOf('Total Cost of Attendance');
    var data = collegesSheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = i + 3;
      var collegeName = (data[i][0] || '').toString().trim();
      var coa = '';
      if (collegeName) {
        coa = coaIdx >= 0 ? data[i][coaIdx] : '';
        var trackerRow = getTrackerRowForCollegeRow_(row);
        restoreTrackerRow_(faSheet, trackerSnapshots.financialAid, collegeName, trackerRow);
        restoreTrackerRow_(cvSheet, trackerSnapshots.campusVisit, collegeName, trackerRow);
        restoreTrackerRow_(atSheet, trackerSnapshots.applicationTimeline, collegeName, trackerRow);
        restoreTrackerRow_(stSheet, trackerSnapshots.statusTracker, collegeName, trackerRow);
        syncCollegeToTrackers({name: collegeName, coa: coa, sourceRow: row});
        processed++;
      }
    }

    var firstClearRow = getTrackerRowForCollegeRow_(lastRow + 1);
    clearTrackerRows_(faSheet, firstClearRow, ['College Name', 'Total Cost of Attendance']);
    clearTrackerRows_(cvSheet, firstClearRow, ['College Name']);
    clearTrackerRows_(atSheet, firstClearRow, ['College Name']);
    clearTrackerRows_(stSheet, firstClearRow, ['College Name']);

    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert(
        'Tracker Sync Repaired',
        'Re-synced tracker college lists from the Colleges sheet.\n\n' +
        'Updated rows: ' + processed,
        SpreadsheetApp.getUi().ButtonSet.OK,
      );
    }

    return {ok: true, count: processed, warnings: warnings};
  }

  /**
   * Creates or updates all tracker sheets (Financial Aid, Campus Visit, Application Timeline, Scholarships).
   * Sets up headers, formulas, and data validation for each tracker.
   * Safe to run multiple times - will not overwrite existing data.
   */
  function setupAllTrackers() {
    var ss = SpreadsheetApp.getActive();

    ss.toast('Setting up tracker sheets...', 'Tracker Setup', 10);

    createOrUpdateFinAid(ss);
    createOrUpdateCampusVisit(ss);
    createOrUpdateAppTimeline(ss);
    createOrUpdateStatusTracker(ss);
    createOrUpdateScholarships(ss);

    ss.toast('Applying formatting enhancements...', 'Tracker Setup', 10);

    var personalSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
    if (personalSheet) {
      CollegeTools.Financial.enhancePersonalProfileFormatting(ss);
    }

    var financialSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (financialSheet) {
      CollegeTools.Financial.enhanceFinancialAidFormatting(financialSheet);
    }

    var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (collegesSheet) {
      CollegeTools.Admissions.enhanceAdmissionFormatting(collegesSheet);
    }

    var timelineSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    if (timelineSheet) {
      enhanceApplicationTimelineFormatting(timelineSheet);
    }

    SpreadsheetApp.getUi().alert('Tracker setup complete!');
  }


  // Public API
  return {
    setupAllTrackers: setupAllTrackers,
    syncCollegeToTrackers: syncCollegeToTrackers,
    repairCollegeSync: repairCollegeSync,
    enhanceApplicationTimelineFormatting: enhanceApplicationTimelineFormatting,
  };
})();
