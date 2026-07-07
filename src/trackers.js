/**
 * Tracker sheet management
 * @version 2.6.5
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
   * Reads a tracker sheet once and captures both a name-keyed snapshot map (so
   * repair can follow user data across row reordering) and the raw formula-aware
   * data block (reused as the rebuild base, avoiding a second read of the same
   * sheet). Duplicate names are flagged because name-only matching is ambiguous.
   * @param {Sheet} sh - Tracker sheet
   * @returns {{snapshots: Object, block: Array<Array>, lastCol: number}} Capture
   * @private
   */
  function captureTrackerSheet_(sh) {
    var capture = {snapshots: {}, block: [], lastCol: 0};
    if (!sh) return capture;
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    capture.lastCol = lastCol;
    if (!nameCol || lastRow < 2 || lastCol < 1) return capture;

    var range = sh.getRange(2, 1, lastRow - 1, lastCol);
    var values = range.getValues();
    var formulas = range.getFormulas();
    capture.block = mergeValuesAndFormulas_(values, formulas);

    for (var i = 0; i < values.length; i++) {
      var collegeName = (values[i][nameCol - 1] || '').toString().trim();
      if (!collegeName) continue;
      if (capture.snapshots[collegeName]) {
        capture.snapshots[collegeName].duplicate = true;
        capture.snapshots._duplicates = capture.snapshots._duplicates || [];
        capture.snapshots._duplicates.push(collegeName);
        continue;
      }
      capture.snapshots[collegeName] = {
        values: values[i],
        formulas: formulas[i],
        duplicate: false,
      };
    }

    return capture;
  }

  /**
   * Builds a blank row of the given width.
   * @param {number} width - Number of columns
   * @returns {Array} Row of empty strings
   * @private
   */
  function blankRow_(width) {
    var row = [];
    for (var i = 0; i < width; i++) row.push('');
    return row;
  }

  /**
   * Merges a parallel values/formulas grid into a single write-ready block,
   * preferring the formula string wherever a cell holds one. This lets a
   * values-only rewrite round-trip formulas without flattening them to their
   * last computed result.
   * @param {Array<Array>} values - getValues() grid
   * @param {Array<Array>} formulas - getFormulas() grid
   * @returns {Array<Array>} Merged block
   * @private
   */
  function mergeValuesAndFormulas_(values, formulas) {
    var out = [];
    for (var r = 0; r < values.length; r++) {
      var row = [];
      for (var c = 0; c < values[r].length; c++) {
        row.push(formulas[r][c] ? formulas[r][c] : values[r][c]);
      }
      out.push(row);
    }
    return out;
  }

  /**
   * Flattens a captured snapshot into a single write-ready row, preferring the
   * formula string where one was captured.
   * @param {Object} snapshot - Snapshot with values/formulas arrays
   * @param {number} width - Number of columns to emit
   * @returns {Array} Merged row
   * @private
   */
  function mergeSnapshotRow_(snapshot, width) {
    var row = [];
    for (var c = 0; c < width; c++) {
      var formula = snapshot.formulas[c];
      var value = snapshot.values[c];
      row.push(formula ? formula : (value === undefined ? '' : value));
    }
    return row;
  }

  /**
   * Returns a copy of a merged row with value cells cleared but formula cells
   * kept. Used for a canonical row assigned to a college with no captured
   * tracker data, so the new college can't inherit a removed college's entered
   * values while the row's structural formula columns still survive.
   * @param {Array} mergedRow - Row from a formula-aware merged block
   * @returns {Array} Cleaned row
   * @private
   */
  function clearValuesKeepFormulas_(mergedRow) {
    return mergedRow.map(function(cell) {
      return (typeof cell === 'string' && cell.charAt(0) === '=') ? cell : '';
    });
  }

  /**
   * Rebuilds a tracker sheet's data block in a single bulk write, reusing the
   * data block already read by captureTrackerSheet_ (no second read). Each
   * canonical row is resolved as:
   *   - unique snapshot for the college  -> restore its captured row (data follows the college)
   *   - no snapshot (new college)        -> clear entered values, keep formulas
   *   - duplicate snapshot (ambiguous)   -> leave the physical row in place
   * then the linked columns (College Name, plus any extras) are stamped on top.
   * @param {Sheet|null} sh - Tracker sheet
   * @param {{snapshots: Object, block: Array<Array>, lastCol: number}} capture - captureTrackerSheet_ result
   * @param {Array<Object>} assignments - {trackerRow, name, coa} per college, in order
   * @param {function(Object):Object=} extraOverridesFn - Optional per-assignment
   *   header/value map for linked columns beyond College Name
   * @private
   */
  function rebuildTrackerFromSnapshots_(sh, capture, assignments, extraOverridesFn) {
    if (!sh || !assignments.length) return;
    var lastCol = capture.lastCol || sh.getLastColumn();
    if (lastCol < 1) return;
    var nameCol = CollegeTools.Utils.colIndex(sh, 'College Name');
    if (!nameCol) return;

    var firstRow = 2;
    var lastWriteRow = firstRow;
    for (var k = 0; k < assignments.length; k++) {
      if (assignments[k].trackerRow > lastWriteRow) lastWriteRow = assignments[k].trackerRow;
    }
    var numRows = lastWriteRow - firstRow + 1;

    // Base the write on the block captured in the single read, copied so the
    // capture stays intact, then padded to the write height.
    var block = capture.block.slice(0, numRows).map(function(row) {
      return row.slice();
    });
    while (block.length < numRows) block.push(blankRow_(lastCol));

    var snapshots = capture.snapshots;
    for (var a = 0; a < assignments.length; a++) {
      var assignment = assignments[a];
      var offset = assignment.trackerRow - firstRow;
      var snapshot = snapshots[assignment.name];
      if (snapshot && !snapshot.duplicate) {
        block[offset] = mergeSnapshotRow_(snapshot, lastCol);
      } else if (!snapshot) {
        block[offset] = clearValuesKeepFormulas_(block[offset]);
      }
      block[offset][nameCol - 1] = assignment.name;

      var overrides = extraOverridesFn ? extraOverridesFn(assignment) : null;
      for (var header in overrides) {
        if (!overrides.hasOwnProperty(header)) continue;
        var c = CollegeTools.Utils.colIndex(sh, header);
        if (c) block[offset][c - 1] = overrides[header] || '';
      }
    }

    sh.getRange(firstRow, 1, numRows, lastCol).setValues(block);
  }

  /**
   * Rewrites a tracker sheet's header row and repositions existing data so a
   * header-layout change (rename, reorder, or removal) never strands data
   * under the wrong new header. Columns present under the same label in both
   * old and new headers are moved to their new position; columns removed
   * without a merge target are dropped (callers that need to preserve their
   * data first should capture it before calling this).
   * @param {Sheet} sh - Tracker sheet (already ensured to exist)
   * @param {Array<string>} newHeaders - Target header row, in order
   * @param {Object<string, Array<string>>=} mergeMap - Old header label ->
   *   ordered list of new header labels to receive its value per row (first
   *   empty new-column slot wins), for old columns that no longer exist
   * @private
   */
  function migrateTrackerHeaders_(sh, newHeaders, mergeMap) {
    mergeMap = mergeMap || {};
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      CollegeTools.Utils.setHeaders(sh, newHeaders);
      return;
    }

    var oldHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return (h || '').toString().trim();
    });
    var alreadyCurrent = oldHeaders.length === newHeaders.length &&
      oldHeaders.every(function(h, i) {
        return h === newHeaders[i];
      });
    if (alreadyCurrent) return;

    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var formulas = sh.getRange(2, 1, lastRow - 1, lastCol).getFormulas();
    var block = mergeValuesAndFormulas_(values, formulas);

    var newBlock = block.map(function() {
      return blankRow_(newHeaders.length);
    });
    var newIndex = {};
    newHeaders.forEach(function(h, i) {
      newIndex[h] = i;
    });

    oldHeaders.forEach(function(oldHeader, oldIdx) {
      if (!oldHeader) return;
      var targetIdx = newIndex.hasOwnProperty(oldHeader) ? newIndex[oldHeader] : null;
      var fallbacks = mergeMap[oldHeader];
      for (var r = 0; r < block.length; r++) {
        var cellValue = block[r][oldIdx];
        if (cellValue === '' || cellValue === null || cellValue === undefined) continue;
        if (targetIdx !== null) {
          newBlock[r][targetIdx] = cellValue;
          continue;
        }
        if (!fallbacks) continue;
        for (var f = 0; f < fallbacks.length; f++) {
          var fIdx = newIndex[fallbacks[f]];
          if (fIdx === undefined) continue;
          if (newBlock[r][fIdx] === '' || newBlock[r][fIdx] === null) {
            newBlock[r][fIdx] = cellValue;
            break;
          }
        }
      }
    });

    CollegeTools.Utils.setHeaders(sh, newHeaders);
    sh.getRange(2, 1, newBlock.length, newHeaders.length).setValues(newBlock);
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
   * Migrates the Financial Aid Tracker's old Required/Submitted column pairs
   * (CSS Profile, IDOC, Verification) into their single 3-state status
   * columns, and folds any existing Appeal Status text into Notes (appended,
   * not overwritten) before the header rewrite drops that column. Existing
   * data that has no old-shape columns to migrate falls through to the
   * generic header reshape untouched.
   * @param {Sheet} sh - Financial Aid Tracker sheet (already ensured to exist)
   * @param {Array<string>} newHeaders - Target header row, in order
   * @private
   */
  function migrateFinancialAidStatusColumns_(sh, newHeaders) {
    var statusGroups = [
      {status: 'CSS Profile Status', req: 'CSS Profile Required (Y/N)', sub: 'CSS Profile Submitted (Y/N)'},
      {status: 'IDOC Status', req: 'IDOC Required (Y/N)', sub: 'IDOC Submitted (Y/N)'},
      {status: 'Verification Status', req: 'Verification Required (Y/N)', sub: 'Verification Submitted (Y/N)'},
    ];
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      migrateTrackerHeaders_(sh, newHeaders, {});
      return;
    }

    var oldHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return (h || '').toString().trim();
    });
    var hasOldStatusCols = statusGroups.some(function(g) {
      return oldHeaders.indexOf(g.req) !== -1 || oldHeaders.indexOf(g.sub) !== -1;
    });
    var appealIdx = oldHeaders.indexOf('Appeal Status');
    if (!hasOldStatusCols && appealIdx === -1) {
      migrateTrackerHeaders_(sh, newHeaders, {});
      return;
    }

    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

    var statusValues = {};
    statusGroups.forEach(function(g) {
      var reqIdx = oldHeaders.indexOf(g.req);
      var subIdx = oldHeaders.indexOf(g.sub);
      statusValues[g.status] = values.map(function(row) {
        var reqVal = reqIdx === -1 ? '' : (row[reqIdx] || '').toString().trim();
        var subVal = subIdx === -1 ? '' : (row[subIdx] || '').toString().trim();
        if (/^(y|yes)$/i.test(subVal)) return 'Submitted';
        if (/^n$/i.test(reqVal)) return 'Not Required';
        if (!reqVal && !subVal) return '';
        return 'Not Started';
      });
    });

    var appealAppend = values.map(function(row) {
      var appeal = appealIdx === -1 ? '' : (row[appealIdx] || '').toString().trim();
      return appeal ? 'Appeal Status: ' + appeal : '';
    });

    migrateTrackerHeaders_(sh, newHeaders, {});

    statusGroups.forEach(function(g) {
      var col = CollegeTools.Utils.colIndex(sh, g.status);
      if (!col) return;
      var rows = statusValues[g.status].map(function(v) {
        return [v];
      });
      sh.getRange(2, col, rows.length, 1).setValues(rows);
    });

    var notesCol = CollegeTools.Utils.colIndex(sh, 'Notes');
    if (notesCol) {
      var notesNow = sh.getRange(2, notesCol, appealAppend.length, 1).getValues();
      var merged = notesNow.map(function(row, i) {
        var existing = (row[0] || '').toString().trim();
        var appeal = appealAppend[i];
        if (!appeal) return [existing];
        return [existing ? existing + ' | ' + appeal : appeal];
      });
      sh.getRange(2, notesCol, merged.length, 1).setValues(merged);
    }
  }

  /**
   * Creates or updates the Financial Aid Tracker sheet with headers and formulas.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateFinAid(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    var headers = CollegeTools.Config.HEADERS.FINANCIAL_AID;
    migrateFinancialAidStatusColumns_(sh, headers);

    CollegeTools.Formatting.applyStandardValidations(sh);

    // Formulas row 2 (user can fill down)
    var r2 = 2;
    var efcCol = CollegeTools.Utils.colIndex(sh, 'EFC (Expected Family Contribution)');
    if (efcCol) {
      // Prefill from the Personal Profile's EFC named range; the family can
      // override a specific college's row if its aid letter differs.
      sh.getRange(r2, efcCol).setFormula(CollegeTools.Formulas.efcPrefill());
    }

    var netCol = CollegeTools.Utils.colIndex(sh, 'Net Price After Aid');
    var oopCol = CollegeTools.Utils.colIndex(sh, 'Out-of-Pocket Cost');
    var fourYearCol = CollegeTools.Utils.colIndex(sh, '4-Year Projected Cost');
    var travelCostsCol = CollegeTools.Utils.colIndex(sh, 'Travel Costs');
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

    if (travelCostsCol) {
      sh.getRange(r2, travelCostsCol).setFormula(CollegeTools.Formulas.travelCostsLookup('A2', 'L'));
    }

    if (fourYearCol && oopCol) {
      // Four years of cost with 3% annual increases: year1 + year2 + year3 + year4
      var fourYearFormula = CollegeTools.Formulas.fourYearProjectedCost(
        CollegeTools.Utils.addr(r2, oopCol));
      sh.getRange(r2, fourYearCol).setFormula(fourYearFormula);
    }

    // Aid Requirements Complete formula. CSS/IDOC/Verification are each a
    // single 3-state status column now (Not Required/Not Started/Submitted).
    // CSS/IDOC require an explicit "Not Required" or "Submitted" answer, same
    // as before (a blank/Not Started cell stays pending). Verification keeps
    // its original leniency: most families are never selected for
    // verification, so a still-blank cell counts as satisfied there, same as
    // the old formula treated a blank Verification Required cell.
    var completeCol = CollegeTools.Utils.colIndex(sh, 'Aid Requirements Complete');
    var fafsaSubCol = CollegeTools.Utils.colIndex(sh, 'FAFSA Submitted (Y/N)');
    var cssStatusCol = CollegeTools.Utils.colIndex(sh, 'CSS Profile Status');
    var idocStatusCol = CollegeTools.Utils.colIndex(sh, 'IDOC Status');
    var verStatusCol = CollegeTools.Utils.colIndex(sh, 'Verification Status');

    if (completeCol && fafsaSubCol && cssStatusCol) {
      var completeFormula = CollegeTools.Formulas.aidRequirementsComplete({
        fafsaSubmitted: CollegeTools.Utils.addr(r2, fafsaSubCol),
        cssStatus: CollegeTools.Utils.addr(r2, cssStatusCol),
        idocStatus: idocStatusCol ? CollegeTools.Utils.addr(r2, idocStatusCol) : '',
        verificationStatus: verStatusCol ? CollegeTools.Utils.addr(r2, verStatusCol) : '',
      });

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

    CollegeTools.Formatting.applyStandardValidations(sh);
  }

  /**
   * Creates or updates the Application Timeline sheet with headers and formulas.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateAppTimeline(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    var headers = CollegeTools.Config.HEADERS.APPLICATION_TIMELINE;
    // Honors Program Deadline / Portfolio-Audition Due / Housing Application
    // Opens / Orientation Registration Opens were collapsed into two generic
    // date slots -- migrate any existing dates into the first open slot per
    // row instead of stranding them under a relabeled column.
    migrateTrackerHeaders_(sh, headers, {
      'Honors Program Deadline': ['Other Deadline 1 Date', 'Other Deadline 2 Date'],
      'Portfolio/Audition Due': ['Other Deadline 1 Date', 'Other Deadline 2 Date'],
      'Housing Application Opens': ['Other Deadline 1 Date', 'Other Deadline 2 Date'],
      'Orientation Registration Opens': ['Other Deadline 1 Date', 'Other Deadline 2 Date'],
    });

    CollegeTools.Formatting.applyStandardValidations(sh);

    // Batch optimize: Set all formulas at once instead of individual calls
    var appDeadlineCol = CollegeTools.Utils.colIndex(sh, 'Application Deadline');
    var daysCol = CollegeTools.Utils.colIndex(sh, 'Days Until Deadline (App)');

    if (appDeadlineCol && daysCol) {
      // Blank deadlines stay blank instead of showing "PAST DUE"
      var deadlineCell = CollegeTools.Utils.addr(2, appDeadlineCol);
      sh.getRange(2, daysCol).setFormula(CollegeTools.Formulas.daysUntilDeadline(deadlineCell));
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

    CollegeTools.Formatting.applyStandardValidations(sh);

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

      sh.getRange(r2, completeCol).setFormula(
        CollegeTools.Formulas.documentsComplete(transcriptCell, essayCell));
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
    migrateScholarshipRequirementColumns_(sh, headers);

    CollegeTools.Formatting.applyStandardValidations(sh);
  }

  /**
   * Migrates the 5 removed Scholarship Tracker requirement flag columns
   * (Financial Need Required, Transcript Required, FAFSA Required,
   * Portfolio/Work Samples, Interview Required) into the single
   * "Requirements Checklist" free-text column before the header rewrite,
   * so a "Y" in any of them survives as readable text instead of being
   * silently dropped.
   * @param {Sheet} sh - Scholarship Tracker sheet (already ensured to exist)
   * @param {Array<string>} newHeaders - Target header row, in order
   * @private
   */
  function migrateScholarshipRequirementColumns_(sh, newHeaders) {
    var requirementCols = [
      'Financial Need Required', 'Transcript Required', 'FAFSA Required',
      'Portfolio/Work Samples', 'Interview Required',
    ];
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      migrateTrackerHeaders_(sh, newHeaders, {});
      return;
    }

    var oldHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return (h || '').toString().trim();
    });
    var hasOldRequirementCols = requirementCols.some(function(h) {
      return oldHeaders.indexOf(h) !== -1;
    });
    if (!hasOldRequirementCols) {
      migrateTrackerHeaders_(sh, newHeaders, {});
      return;
    }

    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var checklist = values.map(function(row) {
      var picked = [];
      requirementCols.forEach(function(h) {
        var idx = oldHeaders.indexOf(h);
        if (idx === -1) return;
        var val = (row[idx] || '').toString().trim();
        if (/^(y|yes)$/i.test(val)) picked.push(h.replace(' Required', '').replace(' (Y/N)', ''));
      });
      return picked.join(', ');
    });

    migrateTrackerHeaders_(sh, newHeaders, {});

    var checklistCol = CollegeTools.Utils.colIndex(sh, 'Requirements Checklist');
    if (checklistCol) {
      var rows = checklist.map(function(v) {
        return [v];
      });
      sh.getRange(2, checklistCol, rows.length, 1).setValues(rows);
    }
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
    var warnings = [];
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
    // Read each tracker once, capturing both the name-keyed snapshots and the
    // raw data block reused as the rebuild base.
    var trackerCaptures = {
      financialAid: captureTrackerSheet_(faSheet),
      campusVisit: captureTrackerSheet_(cvSheet),
      applicationTimeline: captureTrackerSheet_(atSheet),
      statusTracker: captureTrackerSheet_(stSheet),
    };
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.financialAid.snapshots,
      CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.campusVisit.snapshots,
      CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.applicationTimeline.snapshots,
      CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
    collectDuplicateSnapshotWarnings_(warnings, trackerCaptures.statusTracker.snapshots,
      CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);

    // Read all header and data in two bulk reads instead of per-row calls
    var lastCol = collegesSheet.getLastColumn();
    var hdrs = collegesSheet.getRange(2, 1, 1, lastCol).getValues()[0]
      .map(function(x) {
        return (x || '').toString().trim();
      });
    var coaIdx = hdrs.indexOf('Total Cost of Attendance');
    var data = collegesSheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

    // Build the ordered canonical assignment list once; each tracker maps a
    // Colleges row to the same tracker row, so this drives every sheet's rebuild.
    var assignments = [];
    for (var i = 0; i < data.length; i++) {
      var collegeName = (data[i][0] || '').toString().trim();
      if (!collegeName) continue;
      assignments.push({
        trackerRow: getTrackerRowForCollegeRow_(i + 3),
        name: collegeName,
        coa: coaIdx >= 0 ? data[i][coaIdx] : '',
      });
      processed++;
    }

    // One bulk write per tracker (reusing the capture read) instead of
    // per-row/per-cell round-trips.
    rebuildTrackerFromSnapshots_(faSheet, trackerCaptures.financialAid, assignments,
      function(assignment) {
        return {'Total Cost of Attendance': assignment.coa};
      });
    rebuildTrackerFromSnapshots_(cvSheet, trackerCaptures.campusVisit, assignments);
    rebuildTrackerFromSnapshots_(atSheet, trackerCaptures.applicationTimeline, assignments);
    rebuildTrackerFromSnapshots_(stSheet, trackerCaptures.statusTracker, assignments);

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

    var travelResult = null;
    if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
      travelResult = CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
    }

    var syncResult = repairCollegeSync({suppressAlert: true});
    var message = 'Tracker setup complete!';
    if (syncResult && syncResult.ok) {
      message += '\n\nSynced tracker college rows: ' + syncResult.count;
    }
    if (travelResult && travelResult.ok) {
      message += '\nTravel rows refreshed: ' + travelResult.count;
    }

    SpreadsheetApp.getUi().alert(message);
  }


  // Public API
  return {
    setupAllTrackers: setupAllTrackers,
    syncCollegeToTrackers: syncCollegeToTrackers,
    repairCollegeSync: repairCollegeSync,
    enhanceApplicationTimelineFormatting: enhanceApplicationTimelineFormatting,
  };
})();
