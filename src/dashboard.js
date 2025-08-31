/**
 * Dashboard creation and management
 * @version 1.2.3
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
   * Creates or updates the Dashboard sheet with key metrics and visualizations.
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createOrUpdateDashboard(ss) {
    var sh = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.DASHBOARD);

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
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTA(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!A3:A1000), 0)');
    row++;

    // Average acceptance rate
    sh.getRange(row, 1).setValue('Average Acceptance Rate:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!F3:F1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.0%');
    row++;

    // Average total cost
    sh.getRange(row, 1).setValue('Average Total Cost:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!I3:I1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    // Average net price
    sh.getRange(row, 1).setValue('Average Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    // Average weighted score
    sh.getRange(row, 1).setValue('Average Weighted Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(AVERAGE(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!X3:X1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row += 2;

    // Section 2: Cost Analysis
    sh.getRange(row, 1).setValue('💰 Cost Analysis').setFontWeight('bold').setFontSize(14);
    row += 2;

    sh.getRange(row, 1).setValue('Lowest Cost College:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!A3:A1000,MATCH(MIN(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000),' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000,0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Lowest Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(MIN(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row++;

    sh.getRange(row, 1).setValue('Highest Cost College:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!A3:A1000,MATCH(MAX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000),' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000,0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Highest Net Price:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!J3:J1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('$#,##0');
    row += 2;

    // Section 3: Top Performers
    sh.getRange(row, 1).setValue('🏆 Top Performers').setFontWeight('bold').setFontSize(14);
    row += 2;

    sh.getRange(row, 1).setValue('Highest Weighted Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!A3:A1000,MATCH(MAX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!X3:X1000),' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!X3:X1000,0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Top Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!X3:X1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row++;

    sh.getRange(row, 1).setValue('Best Value (High Score/Low Cost):');
    sh.getRange(row, 2).setFormula('=IFERROR(INDEX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!A3:A1000,MATCH(MAX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!Y3:Y1000),' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!Y3:Y1000,0)), "No data")');
    row++;

    sh.getRange(row, 1).setValue('Value Score:');
    sh.getRange(row, 2).setFormula('=IFERROR(MAX(' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '!Y3:Y1000), "No data")');
    sh.getRange(row, 2).setNumberFormat('0.00');
    row += 3;

    // Section 4: Progress Tracking
    sh.getRange(row, 1).setValue('📋 Progress Tracking').setFontWeight('bold').setFontSize(14);
    row += 2;

    // Application Progress
    sh.getRange(row, 1).setValue('Application Documents:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER + '!R2:R1000,"*✅*")&"/"&COUNTA(' + CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER + '!A2:A1000)&" Complete", "No data")');
    row++;

    // Financial Aid Progress
    sh.getRange(row, 1).setValue('Financial Aid Requirements:');
    sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID + '!W2:W1000,"*✅*")&"/"&COUNTA(' + CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID + '!A2:A1000)&" Complete", "No data")');
    row++;

    // Overall Progress Percentage
    sh.getRange(row, 1).setValue('Overall Completion:');
    sh.getRange(row, 2).setFormula('=IFERROR(ROUND((COUNTIF(' + CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER + '!R2:R1000,"*✅*")+COUNTIF(' + CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID + '!W2:W1000,"*✅*"))/(COUNTA(' + CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER + '!A2:A1000)+COUNTA(' + CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID + '!A2:A1000))*100,0)&"%", "No data")');
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
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!AB2:AB1000,"Pending"), 0)');
      row++;

      sh.getRange(row, 1).setValue('Awards Received:');
      sh.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!AB2:AB1000,"Awarded"), 0)');
      row++;

      sh.getRange(row, 1).setValue('Total Amount Awarded:');
      sh.getRange(row, 2).setFormula('=IFERROR(SUMIF(' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!AB2:AB1000,"Awarded",' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!AC2:AC1000), 0)');
      sh.getRange(row, 2).setNumberFormat('$#,##0');
      row++;

      sh.getRange(row, 1).setValue('Potential Amount (Pending):');
      sh.getRange(row, 2).setFormula('=IFERROR(SUMIF(' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!AB2:AB1000,"Pending",' + CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER + '!D2:D1000), 0)');
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

    var nameCol = CollegeTools.Utils.colIndex(collegesSheet, 'College Name');
    var scoreCol = CollegeTools.Utils.colIndex(collegesSheet, 'Weighted Score');
    var priceCol = CollegeTools.Utils.colIndex(collegesSheet, 'Estimated Net Price');

    if (!nameCol || !scoreCol || !priceCol) return;

    // Get the data
    var names = collegesSheet.getRange(3, nameCol, lastRow - 2).getValues();
    var scores = collegesSheet.getRange(3, scoreCol, lastRow - 2).getValues();
    var prices = collegesSheet.getRange(3, priceCol, lastRow - 2).getValues();

    // Combine and filter out empty rows
    var chartData = [];
    for (var i = 0; i < names.length; i++) {
      if (names[i][0] && scores[i][0] && prices[i][0]) {
        chartData.push([names[i][0], scores[i][0], prices[i][0]]);
      }
    }

    // Sort by weighted score (descending)
    chartData.sort(function(a, b) {
      return b[1] - a[1];
    });

    // Take top 20
    chartData = chartData.slice(0, 20);

    // Write to dashboard
    var startCol = 5; // Column E
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
