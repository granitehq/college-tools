/**
 * Dashboard creation and management
 * @version 2.6.0
 * @author College Tools
 * @description Creates and manages the Dashboard sheet with key metrics and visualizations
 */

/**
 * CollegeTools.Dashboard - Dashboard management module
 * Creates summary metrics, charts, and deadline tracking
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Dashboard = (function() {
  'use strict';

  /**
   * Builds a schema-backed A1 range for dashboard formula generation.
   * @param {string} sheetKey - Stable sheet key
   * @param {string} columnKey - Stable column key
   * @param {Sheet|null} sheet - Sheet to inspect
   * @param {number} endRow - Last row for the range
   * @returns {string|null} Range string or null if the sheet/header is missing
   * @private
   */
  function rangeA1_(sheetKey, columnKey, sheet, endRow) {
    if (!sheet) return null;
    return CollegeTools.Schema.rangeA1(sheetKey, columnKey, sheet, endRow);
  }

  /**
   * Wraps a potentially-missing range for formula generation.
   * @param {string|null} range - A1 range string or null
   * @returns {string} Range string or a benign empty range formula target
   * @private
   */
  function safeRange_(range) {
    return range || 'Z1:Z1';
  }


  /**
   * Returns a normalized midnight timestamp for date comparisons.
   * @param {Date} value - Date-like value
   * @returns {number|null} Timestamp or null when not a valid date
   * @private
   */
  function dateTime_(value) {
    if (!value) return null;
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /**
   * Finds a row-1 column index by header.
   * @param {Array<string>} headers - Header row values
   * @param {string} label - Header label
   * @returns {number} Zero-based column index or -1
   * @private
   */
  function headerIndex_(headers, label) {
    return headers.map(function(h) {
      return (h || '').toString().trim();
    }).indexOf(label);
  }

  /**
   * Returns whether a tracker header represents an actionable dated item.
   * @param {string} header - Header label
   * @returns {boolean} True for date/deadline/open/due columns
   * @private
   */
  function isDateItemHeader_(header) {
    return /(Deadline|Due|Date|Opens)$/i.test((header || '').toString().trim());
  }

  /**
   * Reads a sheet into header and data arrays.
   * @param {Sheet|null} sheet - Sheet to read
   * @returns {Object|null} Header/data payload
   * @private
   */
  function readRow1Sheet_(sheet) {
    if (!sheet || sheet.getLastColumn() < 1) return null;
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(function(h) {
        return (h || '').toString().trim();
      });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {headers: headers, rows: []};
    return {
      headers: headers,
      rows: sheet.getRange(2, 1, lastRow - 1, lastCol).getValues(),
    };
  }

  /**
   * Infers completion for a dated tracker item from nearby/source-specific status fields.
   * @param {string} sheetName - Tracker sheet name
   * @param {string} header - Date item header
   * @param {Array<string>} headers - Header labels
   * @param {Array<*>} row - Row values
   * @returns {string} Yes/No display value
   * @private
   */
  function doneForDateItem_(sheetName, header, headers, row) {
    /**
     * Checks whether a status cell has an affirmative completion value.
     * @param {string} label - Header label
     * @returns {boolean} True when the cell looks complete
     */
    function hasYes(label) {
      var idx = headerIndex_(headers, label);
      return idx !== -1 && /^(y|yes|submitted|complete|completed|awarded)$/i.test((row[idx] || '').toString().trim());
    }
    /**
     * Checks whether a row has any value for a header.
     * @param {string} label - Header label
     * @returns {boolean} True when present and non-empty
     */
    function hasValue(label) {
      var idx = headerIndex_(headers, label);
      return idx !== -1 && row[idx] !== '' && row[idx] !== null && row[idx] !== undefined;
    }

    if (sheetName === CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID) {
      if (header === 'FAFSA Deadline') return hasYes('FAFSA Submitted (Y/N)') ? 'Yes' : 'No';
      if (header === 'CSS Deadline') return hasYes('CSS Profile Submitted (Y/N)') ? 'Yes' : 'No';
      if (header === 'Priority Deadline') return hasYes('Aid Requirements Complete') ? 'Yes' : 'No';
    }

    if (sheetName === CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE) {
      var completionIdx = headerIndex_(headers, 'Completion Status (%)');
      var completion = completionIdx !== -1 ? Number(row[completionIdx]) : 0;
      return completion >= 100 ? 'Yes' : 'No';
    }

    if (sheetName === CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER) {
      if (header === 'Submitted Date') return hasValue('Submitted Date') ? 'Yes' : 'No';
      if (header === 'Portfolio Submitted (Date)') return hasValue('Portfolio Submitted (Date)') ? 'Yes' : 'No';
      return hasYes('Documents Complete') ? 'Yes' : 'No';
    }

    if (sheetName === CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER) {
      var awardIdx = headerIndex_(headers, 'Award Status (Pending/Awarded/Declined)');
      var award = awardIdx !== -1 ? (row[awardIdx] || '').toString().trim() : '';
      if (/^(Awarded|Declined)$/i.test(award)) return 'Yes';
      if (header === 'Application Submitted Date') return hasValue('Application Submitted Date') ? 'Yes' : 'No';
      return 'No';
    }

    return 'No';
  }

  /**
   * Builds the next-60-days deadline table across tracker sheets.
   * @param {Spreadsheet} ss - Workbook
   * @param {Date=} todayOverride - Optional test/control date
   * @returns {Array<Array<*>>} Due-next rows
   * @private
   */
  function buildDueNextRows_(ss, todayOverride) {
    var today = dateTime_(todayOverride || new Date());
    var cutoff = today + (60 * 24 * 60 * 60 * 1000);
    var cn = CollegeTools.Config.SHEET_NAMES;
    var sources = [
      {sheetName: cn.FINANCIAL_AID, sourceLabel: 'Financial Aid Tracker', nameHeader: 'College Name'},
      {sheetName: cn.APPLICATION_TIMELINE, sourceLabel: 'Application Timeline', nameHeader: 'College Name'},
      {sheetName: cn.STATUS_TRACKER, sourceLabel: 'Application Status Tracker', nameHeader: 'College Name'},
      {sheetName: cn.CAMPUS_VISIT, sourceLabel: 'Campus Visit Tracker', nameHeader: 'College Name'},
      {sheetName: cn.SCHOLARSHIP_TRACKER, sourceLabel: 'Scholarship Tracker', nameHeader: 'Scholarship Name'},
    ];
    var out = [];

    sources.forEach(function(source) {
      var sheet = ss.getSheetByName(source.sheetName);
      var data = readRow1Sheet_(sheet);
      if (!data) return;
      var nameIdx = headerIndex_(data.headers, source.nameHeader);
      if (nameIdx === -1) return;

      data.headers.forEach(function(header, dateIdx) {
        if (!isDateItemHeader_(header)) return;
        data.rows.forEach(function(row) {
          var name = row[nameIdx];
          var dateValue = row[dateIdx];
          var due = dateTime_(dateValue);
          if (!name || due === null || due < today || due > cutoff) return;
          out.push([
            name,
            source.sourceLabel + ': ' + header,
            dateValue,
            Math.round((due - today) / (24 * 60 * 60 * 1000)),
            doneForDateItem_(source.sheetName, header, data.headers, row),
          ]);
        });
      });
    });

    out.sort(function(a, b) {
      return dateTime_(a[2]) - dateTime_(b[2]) || String(a[0]).localeCompare(String(b[0]));
    });
    return out;
  }

  /**
   * Builds a map keyed by college name from a row-1 sheet.
   * @param {Sheet|null} sheet - Source sheet
   * @returns {Object} Map of college name to row payload
   * @private
   */
  function mapRowsByCollege_(sheet) {
    var data = readRow1Sheet_(sheet);
    var out = {};
    if (!data) return out;
    var nameIdx = headerIndex_(data.headers, 'College Name');
    if (nameIdx === -1) return out;
    data.rows.forEach(function(row) {
      var name = (row[nameIdx] || '').toString().trim();
      if (name) out[name] = {headers: data.headers, row: row};
    });
    return out;
  }

  /**
   * Builds a map of Colleges sheet weighted scores keyed by college name.
   * @param {Sheet|null} collegesSheet - Colleges sheet
   * @returns {Object} Weighted scores by college name
   * @private
   */
  function weightedScoresByCollege_(collegesSheet) {
    var out = {};
    if (!collegesSheet || collegesSheet.getLastRow() < 3) return out;
    var nameCol = CollegeTools.Schema.columnIndex('COLLEGES', 'COLLEGE_NAME', collegesSheet);
    var scoreCol = CollegeTools.Schema.columnIndex('COLLEGES', 'WEIGHTED_SCORE', collegesSheet);
    if (!nameCol || !scoreCol) return out;
    var rows = collegesSheet.getRange(3, 1, collegesSheet.getLastRow() - 2, collegesSheet.getLastColumn()).getValues();
    rows.forEach(function(row) {
      var name = (row[nameCol - 1] || '').toString().trim();
      if (name) out[name] = row[scoreCol - 1];
    });
    return out;
  }

  /**
   * Builds the accepted-offer comparison table.
   * @param {Spreadsheet} ss - Workbook
   * @returns {Array<Array<*>>} Offer rows
   * @private
   */
  function buildOfferComparisonRows_(ss) {
    var cn = CollegeTools.Config.SHEET_NAMES;
    var status = readRow1Sheet_(ss.getSheetByName(cn.STATUS_TRACKER));
    if (!status) return [];
    var nameIdx = headerIndex_(status.headers, 'College Name');
    var decisionIdx = headerIndex_(status.headers, 'Decision/Result');
    if (nameIdx === -1 || decisionIdx === -1) return [];

    var financialByName = mapRowsByCollege_(ss.getSheetByName(cn.FINANCIAL_AID));
    var scoresByName = weightedScoresByCollege_(ss.getSheetByName(cn.COLLEGES));
    var out = [];

    status.rows.forEach(function(statusRow) {
      var decision = (statusRow[decisionIdx] || '').toString().toLowerCase();
      if (decision.indexOf('accept') === -1 && decision.indexOf('admit') === -1) return;
      var name = (statusRow[nameIdx] || '').toString().trim();
      if (!name) return;
      var fin = financialByName[name];
      var headers = fin ? fin.headers : [];
      var row = fin ? fin.row : [];
      /**
       * Reads the financial row value for a header.
       * @param {string} label - Header label
       * @returns {*} Cell value or blank
       */
      function value(label) {
        var idx = headerIndex_(headers, label);
        return idx === -1 ? '' : row[idx];
      }
      var annualNet = value('Out-of-Pocket Cost');
      var fourYear = value('4-Year Projected Cost');
      var loanBurden = (Number(value('Subsidized Loans')) || 0) +
        (Number(value('Unsubsidized Loans')) || 0) +
        (Number(value('Parent PLUS Loans')) || 0);
      loanBurden = loanBurden ? loanBurden * 4 : '';
      out.push([name, annualNet, fourYear, loanBurden, scoresByName[name] || '']);
    });

    out.sort(function(a, b) {
      var ac = Number(a[2]) || Number.MAX_SAFE_INTEGER;
      var bc = Number(b[2]) || Number.MAX_SAFE_INTEGER;
      return ac - bc || String(a[0]).localeCompare(String(b[0]));
    });
    return out;
  }


  /**
   * Classifies a free-text decision result into a rollup bucket.
   * @param {*} value - Decision/result cell value
   * @returns {string|null} Decision bucket or null
   * @private
   */
  function decisionBucket_(value) {
    var text = (value || '').toString().toLowerCase();
    if (!text) return null;
    if (text.indexOf('accept') !== -1 || text.indexOf('admit') !== -1) return 'Accepted';
    if (text.indexOf('wait') !== -1) return 'Waitlisted';
    if (text.indexOf('deny') !== -1 || text.indexOf('denied') !== -1 || text.indexOf('reject') !== -1) return 'Denied';
    if (text.indexOf('pending') !== -1 || text.indexOf('submitted') !== -1 || text.indexOf('applied') !== -1) {
      return 'Pending';
    }
    return null;
  }

  /**
   * Builds accepted/pending/waitlisted/denied dashboard counts.
   * @param {Spreadsheet} ss - Workbook
   * @returns {Array<Array<*>>} Decision count rows
   * @private
   */
  function buildDecisionOutcomeRows_(ss) {
    var data = readRow1Sheet_(ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER));
    var counts = {Accepted: 0, Pending: 0, Waitlisted: 0, Denied: 0};
    if (data) {
      var decisionIdx = headerIndex_(data.headers, 'Decision/Result');
      if (decisionIdx !== -1) {
        data.rows.forEach(function(row) {
          var bucket = decisionBucket_(row[decisionIdx]);
          if (bucket) counts[bucket]++;
        });
      }
    }
    return [
      ['Accepted', counts.Accepted],
      ['Pending', counts.Pending],
      ['Waitlisted', counts.Waitlisted],
      ['Denied', counts.Denied],
    ];
  }

  /**
   * Finds the next enrollment deposit deadline.
   * @param {Spreadsheet} ss - Workbook
   * @param {Date=} todayOverride - Optional test/control date
   * @returns {Array<*>|null} College, date, days-left row or null
   * @private
   */
  function nextDepositDeadline_(ss, todayOverride) {
    var today = dateTime_(todayOverride || new Date());
    var data = readRow1Sheet_(ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE));
    if (!data) return null;
    var nameIdx = headerIndex_(data.headers, 'College Name');
    var depositIdx = headerIndex_(data.headers, 'Enrollment Deposit Deadline');
    if (nameIdx === -1 || depositIdx === -1) return null;

    var best = null;
    data.rows.forEach(function(row) {
      var name = row[nameIdx];
      var dateValue = row[depositIdx];
      var due = dateTime_(dateValue);
      if (!name || due === null || due < today) return;
      if (!best || due < best.due) {
        best = {name: name, dateValue: dateValue, due: due};
      }
    });
    if (!best) return null;
    return [best.name, best.dateValue, Math.round((best.due - today) / (24 * 60 * 60 * 1000))];
  }

  /**
   * Builds Reach/Match/Likely count rows from Colleges.
   * @param {Sheet|null} collegesSheet - Colleges sheet
   * @returns {Array<Array<*>>} Fit count rows
   * @private
   */
  function buildFitBalanceRows_(collegesSheet) {
    var counts = {Reach: 0, Match: 0, Likely: 0};
    if (!collegesSheet || collegesSheet.getLastRow() < 3) {
      return [['Reach', 0], ['Match', 0], ['Likely', 0]];
    }
    var fitCol = CollegeTools.Schema.columnIndex('COLLEGES', 'ADMISSION_FIT', collegesSheet);
    if (!fitCol) return [['Reach', 0], ['Match', 0], ['Likely', 0]];
    var values = collegesSheet.getRange(3, fitCol, collegesSheet.getLastRow() - 2, 1).getValues();
    values.forEach(function(row) {
      var fit = (row[0] || '').toString();
      if (fit.indexOf('Reach') !== -1) counts.Reach++;
      else if (fit.indexOf('Match') !== -1) counts.Match++;
      else if (fit.indexOf('Likely') !== -1) counts.Likely++;
    });
    return [['Reach', counts.Reach], ['Match', counts.Match], ['Likely', counts.Likely]];
  }

  /**
   * Builds a short balance guardrail message.
   * @param {Array<Array<*>>} rows - Reach/Match/Likely count rows
   * @returns {string} Guardrail message
   * @private
   */
  function fitBalanceMessage_(rows) {
    var counts = {Reach: 0, Match: 0, Likely: 0};
    rows.forEach(function(row) {
      counts[row[0]] = Number(row[1]) || 0;
    });
    var total = counts.Reach + counts.Match + counts.Likely;
    if (!total) return 'Add colleges and run Admission Fit to see list balance.';
    if (!counts.Match) return 'Add more Match schools to balance the list.';
    if (!counts.Likely) return 'Add at least one Likely school for a safer list.';
    if (counts.Reach > counts.Match + counts.Likely) return 'Reach-heavy list: add more Match or Likely schools.';
    return 'Balanced list looks reasonable.';
  }

  /**
   * Writes a compact dashboard table.
   * @param {Sheet} sh - Dashboard sheet
   * @param {number} startRow - Table header row
   * @param {Array<string>} headers - Table headers
   * @param {Array<Array<*>>} rows - Table rows
   * @param {string} emptyMessage - Message when no rows are available
   * @returns {number} First row after the table plus one spacer row
   * @private
   */
  function writeDashboardTable_(sh, startRow, headers, rows, emptyMessage) {
    sh.getRange(startRow, 1, 1, headers.length).setValues([headers]);
    sh.getRange(startRow, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f3f4');
    if (!rows.length) {
      sh.getRange(startRow + 1, 1).setValue(emptyMessage).setFontStyle('italic').setFontColor('#666666');
      return startRow + 3;
    }
    sh.getRange(startRow + 1, 1, rows.length, headers.length).setValues(rows);
    return startRow + rows.length + 2;
  }

  /**
   * Creates or updates the Dashboard sheet with key metrics and visualizations.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @param {Object=} opts - Optional execution settings
   * @private
   */
  function createOrUpdateDashboard(ss, opts) {
    opts = opts || {};
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.DASHBOARD);

    var cn = CollegeTools.Config.SHEET_NAMES;
    var collegesSheet = ss.getSheetByName(cn.COLLEGES);
    var statusSheet = ss.getSheetByName(cn.STATUS_TRACKER);
    var financialAidSheet = ss.getSheetByName(cn.FINANCIAL_AID);
    var scholarshipSheet = ss.getSheetByName(cn.SCHOLARSHIP_TRACKER);

    var rAcceptance = rangeA1_('COLLEGES', 'ACCEPTANCE_RATE', collegesSheet, 1000);
    var rTotalCost = rangeA1_('COLLEGES', 'TOTAL_COST', collegesSheet, 1000);
    var rNetPrice = rangeA1_('COLLEGES', 'NET_PRICE', collegesSheet, 1000);
    var rWeighted = rangeA1_('COLLEGES', 'WEIGHTED_SCORE', collegesSheet, 1000);
    var rCollegeName = rangeA1_('COLLEGES', 'COLLEGE_NAME', collegesSheet, 1000);

    var rDocuments = rangeA1_('STATUS_TRACKER', 'DOCUMENTS_COMPLETE', statusSheet, 1000);
    var rAidReq = rangeA1_('FINANCIAL_AID', 'AID_REQUIREMENTS_COMPLETE', financialAidSheet, 1000);
    var rAwardStatus = rangeA1_('SCHOLARSHIP_TRACKER', 'AWARD_STATUS', scholarshipSheet, 1000);
    var rAmtAwarded = rangeA1_('SCHOLARSHIP_TRACKER', 'AMOUNT_AWARDED', scholarshipSheet, 1000);
    var rSkAmount = rangeA1_('SCHOLARSHIP_TRACKER', 'AMOUNT', scholarshipSheet, 1000);
    var rStName = rangeA1_('STATUS_TRACKER', 'COLLEGE_NAME', statusSheet, 1000);
    var rFaName = rangeA1_('FINANCIAL_AID', 'COLLEGE_NAME', financialAidSheet, 1000);

    // Clear existing content to rebuild fresh
    sh.clear();

    // Set up basic formatting and structure
    sh.getRange('A1').setValue('📊 College Application Dashboard').setFontSize(18).setFontWeight('bold');
    sh.getRange('A1:F1').merge().setHorizontalAlignment('center');

    // Section 1: Key Statistics
    var row = 3;
    sh.getRange(row, 1).setValue('📈 Key Statistics').setFontWeight('bold').setFontSize(14);
    row += 2;

    // College count
    sh.getRange(row, 1).setValue('Total Colleges:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTA(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rCollegeName) + '), 0)');
    row++;

    // Average acceptance rate
    sh.getRange(row, 1).setValue('Average Acceptance Rate:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rAcceptance) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.0%');
    row++;

    // Average total cost
    sh.getRange(row, 1).setValue('Average Total Cost:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rTotalCost) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    // Average net price
    sh.getRange(row, 1).setValue('Average Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    // Average weighted score
    sh.getRange(row, 1).setValue('Average Weighted Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rWeighted) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row += 2;

    // Section 2: Cost Analysis
    sh.getRange(row, 1).setValue('💰 Cost Analysis').setFontWeight('bold').setFontSize(14);
    row += 2;

    sh.getRange(row, 1).setValue('Lowest Cost College:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MIN(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '),' +
      CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Lowest Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(MIN(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    sh.getRange(row, 1).setValue('Highest Cost College:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MAX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '),' +
      CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Highest Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row += 2;

    // Section 3: Top Performers
    sh.getRange(row, 1).setValue('🏆 Top Performers').setFontWeight('bold').setFontSize(14);
    row += 2;

    sh.getRange(row, 1).setValue('Highest Weighted Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MAX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rWeighted) + '),' +
      CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rWeighted) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Top Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + CollegeTools.Formulas.sheetRef(cn.COLLEGES) + '!' + safeRange_(rWeighted) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row += 2;

    // Section 4: Progress Tracking
    sh.getRange(row, 1).setValue('📋 Progress Tracking').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Application Progress
    sh.getRange(row, 1).setValue('Application Documents:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Formulas.sheetRef(cn.STATUS_TRACKER) + '!' + safeRange_(rDocuments) +
      ',"*✅*")&"/"&COUNTA(' + CollegeTools.Formulas.sheetRef(cn.STATUS_TRACKER) + '!' + safeRange_(rStName) + ')&" Complete", "No data")');
    row++;

    // Financial Aid Progress
    sh.getRange(row, 1).setValue('Financial Aid Requirements:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Formulas.sheetRef(cn.FINANCIAL_AID) + '!' + safeRange_(rAidReq) +
      ',"*✅*")&"/"&COUNTA(' + CollegeTools.Formulas.sheetRef(cn.FINANCIAL_AID) + '!' + safeRange_(rFaName) + ')&" Complete", "No data")');
    row++;

    // Overall Progress Percentage
    sh.getRange(row, 1).setValue('Overall Completion:');
    sh.getRange(row, 2).setFormula('=IFERROR(ROUND((COUNTIF(' + CollegeTools.Formulas.sheetRef(cn.STATUS_TRACKER) + '!' + safeRange_(rDocuments) +
      ',"*✅*")+COUNTIF(' + CollegeTools.Formulas.sheetRef(cn.FINANCIAL_AID) + '!' + safeRange_(rAidReq) +
      ',"*✅*"))/(COUNTA(' + CollegeTools.Formulas.sheetRef(cn.STATUS_TRACKER) + '!' + safeRange_(rStName) +
      ')+COUNTA(' + CollegeTools.Formulas.sheetRef(cn.FINANCIAL_AID) + '!' + safeRange_(rFaName) + '))*100,0)&"%", "No data")');
    row += 3;

    // Section 5: Scholarship Summary
    sh.getRange(row, 1).setValue('🎓 Scholarship Summary').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Check if scholarship tracker exists and has been set up with headers
    var scholarshipHeaderCount = CollegeTools.Config.HEADERS.SCHOLARSHIP_TRACKER.length;
    if (scholarshipSheet && scholarshipSheet.getLastRow() > 1 &&
        scholarshipSheet.getLastColumn() >= scholarshipHeaderCount) {
      sh.getRange(row, 1).setValue('Total Applied:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTA(' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!A2:A1000), 0)');
      row++;

      sh.getRange(row, 1).setValue('Pending Applications:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) + ',"Pending"), 0)');
      row++;

      sh.getRange(row, 1).setValue('Awards Received:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) + ',"Awarded"), 0)');
      row++;

      sh.getRange(row, 1).setValue('Total Amount Awarded:');
      sh.getRange(row, 2).setFormula('=IFERROR(SUMIF(' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) +
        ',"Awarded",' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAmtAwarded) + '), 0)');
      sh.getRange(row, 2).setNumberFormat('$#,##0');
      row++;

      sh.getRange(row, 1).setValue('Potential Amount (Pending):');
      sh.getRange(row, 2).setFormula('=IFERROR(SUMIF(' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) +
        ',"Pending",' + CollegeTools.Formulas.sheetRef(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rSkAmount) + '), 0)');
      sh.getRange(row, 2).setNumberFormat('$#,##0');
      row++;
    } else if (scholarshipSheet) {
      sh.getRange(row, 1).setValue('(Scholarship Tracker is empty - run "Add/Update Trackers" to set it up)');
      sh.getRange(row, 1).setFontStyle('italic').setFontColor('#666666');
      row++;
    } else {
      sh.getRange(row, 1).setValue('(Scholarship Tracker not found - run "Add/Update Trackers" first)');
      sh.getRange(row, 1).setFontStyle('italic').setFontColor('#666666');
      row++;
    }

    // Section 6: real next-deadline table.
    row += 2;
    sh.getRange(row, 1).setValue('What\'s Due Next').setFontWeight('bold').setFontSize(14);
    var dueRows = buildDueNextRows_(ss, opts && opts.today).slice(0, 15);
    var dueTableStart = row + 2;
    row = writeDashboardTable_(sh, dueTableStart,
      ['College/Source', 'Item', 'Date', 'Days Left', 'Done?'],
      dueRows,
      'No dated tracker items due in the next 60 days.');
    if (dueRows.length) sh.getRange(dueTableStart + 1, 3, dueRows.length, 1).setNumberFormat('m/d/yyyy');

    // Section 7: decision-time accepted-offer comparison.
    row += 2;
    sh.getRange(row, 1).setValue('Accepted Offer Comparison').setFontWeight('bold').setFontSize(14);
    var offerRows = buildOfferComparisonRows_(ss);
    var offerTableStart = row + 2;
    row = writeDashboardTable_(sh, offerTableStart,
      ['College', 'Annual Net Cost', '4-Year Total', 'Loan Burden at Graduation', 'Weighted Score'],
      offerRows,
      'No accepted offers recorded yet.');
    if (offerRows.length) {
      sh.getRange(offerTableStart + 1, 2, offerRows.length, 3).setNumberFormat('$#,##0');
      sh.getRange(offerTableStart + 1, 5, offerRows.length, 1).setNumberFormat('0.00');
    }

    // Section 8: decision outcomes and deposit deadline.
    row += 2;
    sh.getRange(row, 1).setValue('Decision Outcomes').setFontWeight('bold').setFontSize(14);
    row = writeDashboardTable_(sh, row + 1,
      ['Decision', 'Count'],
      buildDecisionOutcomeRows_(ss),
      'No decisions recorded yet.');
    var deposit = nextDepositDeadline_(ss, opts && opts.today);
    sh.getRange(row, 1, 1, 3).setValues([['Next Deposit Deadline', deposit ? deposit[0] : '', deposit ? deposit[2] : '']]);
    if (deposit) sh.getRange(row, 4).setValue(deposit[1]).setNumberFormat('m/d/yyyy');
    row += 1;

    // Section 9: Reach/Match/Likely balance guardrail.
    row += 2;
    sh.getRange(row, 1).setValue('Application List Balance').setFontWeight('bold').setFontSize(14);
    var fitRows = buildFitBalanceRows_(collegesSheet);
    row = writeDashboardTable_(sh, row + 1,
      ['Admission Fit', 'Count'],
      fitRows,
      'No Admission Fit data yet.');
    sh.getRange(row, 1).setValue(fitBalanceMessage_(fitRows)).setFontStyle('italic');

    // Auto-resize columns
    for (var c = 1; c <= 5; c++) {
      sh.autoResizeColumn(c);
    }

    // Set column widths for better display
    sh.setColumnWidth(1, 220);
    sh.setColumnWidth(2, 220);
    sh.setColumnWidth(3, 140);
    sh.setColumnWidth(4, 160);
    sh.setColumnWidth(5, 120);
  }

  /**
   * Creates or updates the Dashboard sheet with all metrics and data.
   * @param {Object=} opts - Optional execution settings
   */
  function setupDashboard(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();
    createOrUpdateDashboard(ss, opts);
    if (!opts.suppressAlert) SpreadsheetApp.getUi().alert('Dashboard created!');
  }

  /**
   * Refreshes all dashboard data. All Dashboard values are live formulas, so
   * this rebuilds the sheet to pick up any schema/header changes since setup.
   * @param {Object=} opts - Optional execution settings
   */
  function refreshDashboard(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();
    createOrUpdateDashboard(ss, opts);
    if (!opts.suppressAlert) SpreadsheetApp.getUi().alert('Dashboard data refreshed!');
  }

  // Public API
  return {
    setupDashboard: setupDashboard,
    refreshDashboard: refreshDashboard,
  };
})();
