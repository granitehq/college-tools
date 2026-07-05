/**
 * Dashboard creation and management
 * @version 2.0.1
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
   * Returns "COL_LETTER:COL_LETTER" for use inside a sheet reference.
   * e.g. colRange_(Config.HEADERS.COLLEGES, 'Acceptance Rate', 3, 1000)
   *   → "F3:F1000"
   * @param {Array<string>} headers - The ordered header array for the sheet
   * @param {string} name - Header to look up
   * @param {number} startRow - First data row
   * @param {number} endRow - Last data row
   * @returns {string|null} Range string or null if header not found
   * @private
   */
  function colRange_(headers, name, startRow, endRow) {
    var idx = headers.indexOf(name);
    if (idx < 0) return null;
    var letter = CollegeTools.Utils.columnToLetter(idx + 1);
    return letter + startRow + ':' + letter + endRow;
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
   * Quotes a sheet name for use in A1 formula references.
   * Sheet names containing spaces (e.g. "Application Status Tracker") must be
   * single-quoted or the formula fails to parse — and IFERROR cannot catch
   * parse errors. Quoting is safe for all names, so quote unconditionally.
   * @param {string} name - Sheet name
   * @returns {string} Quoted sheet reference (without the trailing "!")
   * @private
   */
  function sheetRef_(name) {
    return '\'' + String(name).replace(/'/g, '\'\'') + '\'';
  }

  /**
   * Creates or updates the Dashboard sheet with key metrics and visualizations.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateDashboard(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.DASHBOARD);

    // Pre-compute column ranges from Config.HEADERS so formulas stay correct
    // even if header order changes.
    var cHdrs = CollegeTools.Config.HEADERS.COLLEGES;
    var stHdrs = CollegeTools.Config.HEADERS.STATUS_TRACKER;
    var faHdrs = CollegeTools.Config.HEADERS.FINANCIAL_AID;
    var skHdrs = CollegeTools.Config.HEADERS.SCHOLARSHIP_TRACKER;
    var cn = CollegeTools.Config.SHEET_NAMES;

    // Colleges data starts at row 3
    var rAcceptance = colRange_(cHdrs, 'Acceptance Rate', 3, 1000);
    var rTotalCost = colRange_(cHdrs, 'Total Cost of Attendance', 3, 1000);
    var rNetPrice = colRange_(cHdrs, 'Estimated Net Price', 3, 1000);
    var rWeighted = colRange_(cHdrs, 'Weighted Score', 3, 1000);
    var rValue = colRange_(cHdrs, 'Value Score', 3, 1000);
    var rCollegeName = colRange_(cHdrs, 'College Name', 3, 1000);

    // Status Tracker / Financial Aid / Scholarship data starts at row 2
    var rDocuments = colRange_(stHdrs, 'Documents Complete', 2, 1000);
    var rAidReq = colRange_(faHdrs, 'Aid Requirements Complete', 2, 1000);
    var rAwardStatus = colRange_(skHdrs, 'Award Status (Pending/Awarded/Declined)', 2, 1000);
    var rAmtAwarded = colRange_(skHdrs, 'Amount Awarded', 2, 1000);
    var rSkAmount = colRange_(skHdrs, 'Amount', 2, 1000);
    var rStName = colRange_(stHdrs, 'College Name', 2, 1000);
    var rFaName = colRange_(faHdrs, 'College Name', 2, 1000);

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
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTA(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rCollegeName) + '), 0)');
    row++;

    // Average acceptance rate
    sh.getRange(row, 1).setValue('Average Acceptance Rate:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rAcceptance) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.0%');
    row++;

    // Average total cost
    sh.getRange(row, 1).setValue('Average Total Cost:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rTotalCost) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    // Average net price
    sh.getRange(row, 1).setValue('Average Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    // Average weighted score
    sh.getRange(row, 1).setValue('Average Weighted Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rWeighted) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row += 2;

    // Section 2: Cost Analysis
    sh.getRange(row, 1).setValue('💰 Cost Analysis').setFontWeight('bold').setFontSize(14);
    row += 2;

    sh.getRange(row, 1).setValue('Lowest Cost College:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MIN(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '),' +
      sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Lowest Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(MIN(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    sh.getRange(row, 1).setValue('Highest Cost College:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MAX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '),' +
      sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Highest Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rNetPrice) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row += 2;

    // Section 3: Top Performers
    sh.getRange(row, 1).setValue('🏆 Top Performers').setFontWeight('bold').setFontSize(14);
    row += 2;

    sh.getRange(row, 1).setValue('Highest Weighted Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MAX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rWeighted) + '),' +
      sheetRef_(cn.COLLEGES) + '!' + safeRange_(rWeighted) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Top Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rWeighted) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row++;

    sh.getRange(row, 1).setValue('Best Value (High Score/Low Cost):');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rCollegeName) +
      ',MATCH(MAX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rValue) + '),' +
      sheetRef_(cn.COLLEGES) + '!' + safeRange_(rValue) + ',0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Value Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + sheetRef_(cn.COLLEGES) + '!' + safeRange_(rValue) + '), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row += 3;

    // Section 4: Progress Tracking
    sh.getRange(row, 1).setValue('📋 Progress Tracking').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Application Progress
    sh.getRange(row, 1).setValue('Application Documents:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + sheetRef_(cn.STATUS_TRACKER) + '!' + safeRange_(rDocuments) +
      ',"*✅*")&"/"&COUNTA(' + sheetRef_(cn.STATUS_TRACKER) + '!' + safeRange_(rStName) + ')&" Complete", "No data")');
    row++;

    // Financial Aid Progress
    sh.getRange(row, 1).setValue('Financial Aid Requirements:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + sheetRef_(cn.FINANCIAL_AID) + '!' + safeRange_(rAidReq) +
      ',"*✅*")&"/"&COUNTA(' + sheetRef_(cn.FINANCIAL_AID) + '!' + safeRange_(rFaName) + ')&" Complete", "No data")');
    row++;

    // Overall Progress Percentage
    sh.getRange(row, 1).setValue('Overall Completion:');
    sh.getRange(row, 2).setFormula('=IFERROR(ROUND((COUNTIF(' + sheetRef_(cn.STATUS_TRACKER) + '!' + safeRange_(rDocuments) +
      ',"*✅*")+COUNTIF(' + sheetRef_(cn.FINANCIAL_AID) + '!' + safeRange_(rAidReq) +
      ',"*✅*"))/(COUNTA(' + sheetRef_(cn.STATUS_TRACKER) + '!' + safeRange_(rStName) +
      ')+COUNTA(' + sheetRef_(cn.FINANCIAL_AID) + '!' + safeRange_(rFaName) + '))*100,0)&"%", "No data")');
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
    var scholarshipSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    if (scholarshipSheet && scholarshipSheet.getLastRow() > 1 && scholarshipSheet.getLastColumn() >= 28) {
      // Only show scholarship stats if the sheet has been properly set up with headers
      sh.getRange(row, 1).setValue('Total Applied:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTA(' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!A2:A1000), 0)');
      row++;

      sh.getRange(row, 1).setValue('Pending Applications:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + sheetRef_(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) + ',"Pending"), 0)');
      row++;

      sh.getRange(row, 1).setValue('Awards Received:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + sheetRef_(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) + ',"Awarded"), 0)');
      row++;

      sh.getRange(row, 1).setValue('Total Amount Awarded:');
      sh.getRange(row, 2).setFormula('=IFERROR(SUMIF(' + sheetRef_(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) +
        ',"Awarded",' + sheetRef_(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAmtAwarded) + '), 0)');
      sh.getRange(row, 2).setNumberFormat('$#,##0');
      row++;

      sh.getRange(row, 1).setValue('Potential Amount (Pending):');
      sh.getRange(row, 2).setFormula('=IFERROR(SUMIF(' + sheetRef_(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rAwardStatus) +
        ',"Pending",' + sheetRef_(cn.SCHOLARSHIP_TRACKER) + '!' + safeRange_(rSkAmount) + '), 0)');
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

    var nameCol = CollegeTools.Utils.colIndex2(collegesSheet, 'College Name');
    var scoreCol = CollegeTools.Utils.colIndex2(collegesSheet, 'Weighted Score');
    var priceCol = CollegeTools.Utils.colIndex2(collegesSheet, 'Estimated Net Price');

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
