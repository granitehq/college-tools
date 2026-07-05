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
   * Creates or updates the Dashboard sheet with key metrics and visualizations.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateDashboard(ss) {
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
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTA(' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!A2:A1000), 0)');
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
    } else if (scholarshipSheet) {
      sh.getRange(row, 1).setValue('(Scholarship Tracker is empty - run "Add/Update Trackers" to set it up)');
      sh.getRange(row, 1).setFontStyle('italic').setFontColor('#666666');
    } else {
      sh.getRange(row, 1).setValue('(Scholarship Tracker not found - run "Add/Update Trackers" first)');
      sh.getRange(row, 1).setFontStyle('italic').setFontColor('#666666');
    }

    // Auto-resize columns
    for (var c = 1; c <= 2; c++) {
      sh.autoResizeColumn(c);
    }

    // Set column widths for better display
    sh.setColumnWidth(1, 200);
    sh.setColumnWidth(2, 150);
  }

  /**
   * Creates or updates the Dashboard sheet with all metrics and data.
   */
  function setupDashboard() {
    var ss = SpreadsheetApp.getActive();
    createOrUpdateDashboard(ss);
    SpreadsheetApp.getUi().alert('Dashboard created!');
  }

  /**
   * Refreshes all dashboard data. All Dashboard values are live formulas, so
   * this rebuilds the sheet to pick up any schema/header changes since setup.
   */
  function refreshDashboard() {
    var ss = SpreadsheetApp.getActive();
    createOrUpdateDashboard(ss);
    SpreadsheetApp.getUi().alert('Dashboard data refreshed!');
  }

  // Public API
  return {
    setupDashboard: setupDashboard,
    refreshDashboard: refreshDashboard,
  };
})();
