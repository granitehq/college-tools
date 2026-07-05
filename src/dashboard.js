/**
 * Dashboard creation and management
 * @version 2.5.0
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

    // Section 5: Upcoming Deadlines (next 60 days)
    sh.getRange(row, 1).setValue('⏰ Upcoming Deadlines (Next 60 Days)').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Headers for deadline table
    var deadlineHeaders = ['College', 'Deadline Type', 'Date', 'Days Left'];
    sh.getRange(row, 1, 1, deadlineHeaders.length).setValues([deadlineHeaders]);
    sh.getRange(row, 1, 1, deadlineHeaders.length).setFontWeight('bold').setBackground('#f1f3f4');
    row++;

    // Add a note about deadline data
    sh.getRange(row, 1).setValue('(Deadline data will populate from Application Timeline tracker)');
    sh.getRange(row, 1).setFontStyle('italic').setFontColor('#666666');
    row += 3;

    // Section 6: Scholarship Summary
    sh.getRange(row, 1).setValue('🎓 Scholarship Summary').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Check if scholarship tracker exists
    if (scholarshipSheet && scholarshipSheet.getLastRow() > 1 && scholarshipSheet.getLastColumn() >= 28) {
      // Only show scholarship stats if the sheet has been properly set up with headers
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
    for (var c = 1; c <= 6; c++) {
      sh.autoResizeColumn(c);
    }

    // Set column widths for better display
    sh.setColumnWidth(1, 200);
    sh.setColumnWidth(2, 150);
  }

  /**
   * Creates data range for Weighted Score vs Net Price chart.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function setupChartData(ss) {
    var dashSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD);
    if (!dashSheet) return;

    // Create a data section for the chart on the right side
    var startCol = 5; // Column E
    var row = 3;

    dashSheet.getRange(row, startCol).setValue('📊 Score vs Cost Data').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Headers for chart data
    var chartHeaders = ['College Name', 'Weighted Score', 'Net Price'];
    dashSheet.getRange(row, startCol, 1, chartHeaders.length).setValues([chartHeaders]);
    dashSheet.getRange(row, startCol, 1, chartHeaders.length).setFontWeight('bold').setBackground('#f1f3f4');
    row++;

    // Formula to pull data from Colleges sheet (top 20 by weighted score)
    // This will create a sortable range for the chart
    // var _dataRange = 'E' + row + ':G' + (row + 19); // 20 rows of data - reserved for future use

    // Note: Google Sheets charts work best with actual data rather than complex formulas
    // Users can copy/paste values here for chart creation, or we can use Apps Script to populate
    dashSheet.getRange(row, startCol).setValue('(Use "Refresh Chart Data" to populate this section)');
    dashSheet.getRange(row, startCol).setFontStyle('italic').setFontColor('#666666');
  }

  /**
   * Refreshes the chart data by copying values from the Colleges sheet.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function refreshChartData(ss) {
    var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    var dashSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD);

    if (!collegesSheet || !dashSheet) return;

    // Get data from Colleges sheet
    var lastRow = Math.min(collegesSheet.getLastRow(), 1000);
    if (lastRow < 3) return; // No data

    var nameCol = CollegeTools.Schema.columnIndex('COLLEGES', 'COLLEGE_NAME', collegesSheet);
    var scoreCol = CollegeTools.Schema.columnIndex('COLLEGES', 'WEIGHTED_SCORE', collegesSheet);
    var priceCol = CollegeTools.Schema.columnIndex('COLLEGES', 'NET_PRICE', collegesSheet);

    if (!nameCol || !scoreCol || !priceCol) return;

    // Read one wide range, then index in-memory to avoid multiple API reads.
    var startCol = Math.min(nameCol, scoreCol, priceCol);
    var endCol = Math.max(nameCol, scoreCol, priceCol);
    var rows = collegesSheet.getRange(3, startCol, lastRow - 2, endCol - startCol + 1).getValues();
    var nameOffset = nameCol - startCol;
    var scoreOffset = scoreCol - startCol;
    var priceOffset = priceCol - startCol;

    // Combine and filter out empty rows
    var chartData = [];
    for (var i = 0; i < rows.length; i++) {
      var name = rows[i][nameOffset];
      var score = rows[i][scoreOffset];
      var price = rows[i][priceOffset];
      if (name && score && price) {
        chartData.push([name, score, price]);
      }
    }

    // Sort by weighted score (descending)
    chartData.sort(function(a, b) {
      return b[1] - a[1];
    });

    // Take top 20
    chartData = chartData.slice(0, 20);

    // Write to dashboard
    startCol = 5; // Column E
    var startRow = 6;

    // Clear existing data
    dashSheet.getRange(startRow, startCol, 30, 3).clear();

    // Write new data
    if (chartData.length > 0) {
      dashSheet.getRange(startRow, startCol, chartData.length, 3).setValues(chartData);

      // Format the data
      dashSheet.getRange(startRow, startCol + 1, chartData.length, 1).setNumberFormat('0.00'); // Scores
      dashSheet.getRange(startRow, startCol + 2, chartData.length, 1).setNumberFormat('$#,##0'); // Prices
    }
  }

  /**
   * Creates or updates the Dashboard sheet with all metrics and data.
   */
  function setupDashboard() {
    var ss = SpreadsheetApp.getActive();
    createOrUpdateDashboard(ss);
    setupChartData(ss);
    refreshChartData(ss);
    SpreadsheetApp.getUi().alert('Dashboard created! You can now create charts using the data in columns E-G.');
  }

  /**
   * Refreshes all dashboard data and chart information.
   */
  function refreshDashboard() {
    var ss = SpreadsheetApp.getActive();
    refreshChartData(ss);
    SpreadsheetApp.getUi().alert('Dashboard data refreshed!');
  }

  // Public API
  return {
    setupDashboard: setupDashboard,
    refreshDashboard: refreshDashboard,
  };
})();
