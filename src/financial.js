/**
 * Financial Intelligence Suite
 * @version 2.6.5
 * @author College Tools
 * @description Personal Profile sheet and financial analysis features
 */

/**
 * CollegeTools.Financial - Financial Intelligence module
 * Manages Personal Profile sheet and calculates financial metrics
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Financial = (function() {
  'use strict';

  /**
   * Creates Personal Profile sheet with essential structure only (optimized for speed).
   * @param {Spreadsheet} ss - The spreadsheet object
   * @private
   */
  function createPersonalProfileSheet(ss) {
    var sheet = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
    sheet.clear();

    // Essential structure only - no formatting for speed
    sheet.getRange(1, 1).setValue('🎓 Personal Profile & Settings');
    sheet.getRange(3, 1).setValue('📊 Academic Profile');
    sheet.getRange(4, 1).setValue('SAT Score:');
    sheet.getRange(5, 1).setValue('ACT Score:');
    sheet.getRange(6, 1).setValue('GPA:');
    sheet.getRange(8, 1).setValue('💰 Financial Profile');
    sheet.getRange(9, 1).setValue('Family Income:');
    sheet.getRange(10, 1).setValue('Expected Family Contribution:');
    sheet.getRange(12, 1).setValue('🎯 Preferences');
    sheet.getRange(13, 1).setValue('State Residency:');

    // Create named ranges - essential for formulas
    ss.setNamedRange('SAT_Score', sheet.getRange(4, 2));
    ss.setNamedRange('ACT_Score', sheet.getRange(5, 2));
    ss.setNamedRange('GPA', sheet.getRange(6, 2));
    ss.setNamedRange('Family_Income', sheet.getRange(9, 2));
    ss.setNamedRange('EFC', sheet.getRange(10, 2));
    ss.setNamedRange('State_Residency', sheet.getRange(13, 2));
  }

  /**
   * Applies Financial Safety formulas to the Financial Aid tracker (optimized for speed).
   * @param {Sheet} sheet - The Financial Aid sheet
   * @private
   */
  function applyFinancialSafetyFormulas(sheet) {
    var safetyCol = CollegeTools.Utils.colIndex(sheet, 'Financial Safety');
    var burdenCol = CollegeTools.Utils.colIndex(sheet, '4-Year Burden');
    var netPriceCol = CollegeTools.Utils.colIndex(sheet, 'Net Price After Aid');
    if (!safetyCol || !burdenCol || !netPriceCol) return;

    var startRow = 2;
    var endRow = Math.max(2, sheet.getLastRow());
    var collegeNames = sheet.getRange(startRow, 1, endRow - startRow + 1, 1).getValues();
    var safetyFormulas = [];
    var burdenFormulas = [];

    for (var i = 0; i < collegeNames.length; i++) {
      var row = startRow + i;
      var collegeName = collegeNames[i][0];
      if (!collegeName || collegeName === '') {
        safetyFormulas.push(['']);
        burdenFormulas.push(['']);
        continue;
      }

      var netPriceCell = CollegeTools.Utils.addr(row, netPriceCol);
      var safetyFormula = '=IF(OR(Family_Income="",Family_Income=0),"Enter Income",' +
        'IF(' + netPriceCell + '="",' + '"No data",' +
        'IF(' + netPriceCell + '/Family_Income<0.15,"🟢 Comfortable",' +
        'IF(' + netPriceCell + '/Family_Income<0.25,"🟡 Manageable",' +
        'IF(' + netPriceCell + '/Family_Income<0.35,"🟠 Stretch",' +
        '"🔴 Reconsider")))))';

      var burdenFormula = '=IF(OR(Family_Income="",Family_Income=0,ISNUMBER(' + netPriceCell + ')=FALSE),"",(' + netPriceCell + '*4)/Family_Income)';

      safetyFormulas.push([safetyFormula]);
      burdenFormulas.push([burdenFormula]);
    }

    if (safetyFormulas.length > 0) {
      sheet.getRange(startRow, safetyCol, safetyFormulas.length, 1).setFormulas(safetyFormulas);
      sheet.getRange(startRow, burdenCol, burdenFormulas.length, 1).setFormulas(burdenFormulas);
    }
  }

  /**
   * Core setup logic shared by setupFinancialIntelligence and completeSetup.
   * No UI prompts — callers are responsible for confirmation and error handling.
   * @private
   */
  function runFinancialSetup_() {
    var ss = SpreadsheetApp.getActive();

    createPersonalProfileSheet(ss);

    var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (collegesSheet) {
      CollegeTools.Admissions.setupAdmissionFit();
    }

    var financialSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
    if (financialSheet) {
      applyFinancialSafetyFormulas(financialSheet);
    }
  }

  /**
   * Sets up the Financial Intelligence suite with optimized performance.
   * Creates Personal Profile sheet and applies essential formulas only.
   */
  function setupFinancialIntelligence() {
    var ui = SpreadsheetApp.getUi();
    var result = ui.alert(
      'Setup Financial Intelligence',
      'This will set up:\n\n' +
      '• Personal Profile sheet with your academic/financial info\n' +
      '• Admission Fit (Reach/Match/Likely) on the Colleges sheet\n' +
      '• Financial Safety analysis (Financial Aid tracker)\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO,
    );

    if (result !== ui.Button.YES) return;

    try {
      runFinancialSetup_();
      ui.alert(
        'Financial Intelligence Setup Complete! ✅',
        'Essential formulas have been applied.\n\n' +
        'Next steps:\n' +
        '1. Fill out your Personal Profile sheet\n' +
        '2. Add college data using "Fill current row"\n' +
        '3. Run "Add/Update Trackers" for full formatting',
        ui.ButtonSet.OK,
      );
    } catch (error) {
      ui.alert('Setup Error', 'An error occurred during setup: ' + error.toString(), ui.ButtonSet.OK);
    }
  }

  /**
   * Enhancement function: adds formatting to Personal Profile sheet.
   * @param {Spreadsheet} ss - The spreadsheet object
   */
  function enhancePersonalProfileFormatting(ss) {
    var sheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
    if (!sheet) return;

    // Title formatting
    sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    sheet.getRange(1, 1, 1, 3).merge();

    // Section headers formatting
    sheet.getRange(3, 1).setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
    sheet.getRange(8, 1).setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
    sheet.getRange(12, 1).setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');

    // Input cell formatting and notes
    sheet.getRange(4, 2).setBackground('#fff3cd').setBorder(true, true, true, true, false, false);
    sheet.getRange(4, 2).setNote('Enter your highest SAT score (e.g., 1450)');
    sheet.getRange(4, 3).setValue('Out of 1600');

    sheet.getRange(5, 2).setBackground('#fff3cd').setBorder(true, true, true, true, false, false);
    sheet.getRange(5, 2).setNote('Enter your highest ACT score (e.g., 32)');
    sheet.getRange(5, 3).setValue('Out of 36 (optional if you have SAT)');

    sheet.getRange(6, 2).setBackground('#fff3cd').setBorder(true, true, true, true, false, false);
    sheet.getRange(6, 2).setNote('Enter your cumulative GPA (e.g., 3.85)');
    sheet.getRange(6, 3).setValue('Unweighted 4.0 scale');

    sheet.getRange(9, 2).setBackground('#fff3cd').setBorder(true, true, true, true, false, false);
    sheet.getRange(9, 2).setNote('Enter annual family income (e.g., 75000)');
    sheet.getRange(9, 2).setNumberFormat('$#,##0');
    sheet.getRange(9, 3).setValue('Used for financial safety calculations');

    sheet.getRange(10, 2).setBackground('#d1ecf1').setBorder(true, true, true, true, false, false);
    sheet.getRange(10, 2).setNote('From FAFSA calculator (optional)');
    sheet.getRange(10, 2).setNumberFormat('$#,##0');
    sheet.getRange(10, 3).setValue('Optional - helps with aid estimates');

    sheet.getRange(13, 2).setBackground('#d1ecf1').setBorder(true, true, true, true, false, false);
    sheet.getRange(13, 2).setNote('Two-letter state code (e.g., CA, NY, TX)');
    sheet.getRange(13, 3).setValue('For in-state tuition calculations');

    // Column widths
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 300);

    // Sheet protection with unprotected input cells
    var protection = sheet.protect();
    protection.setDescription('Personal Profile Sheet - Structure Protected');
    var unprotected = [
      sheet.getRange(4, 2), // SAT
      sheet.getRange(5, 2), // ACT
      sheet.getRange(6, 2), // GPA
      sheet.getRange(9, 2), // Family Income
      sheet.getRange(10, 2), // EFC
      sheet.getRange(13, 2), // State
    ];
    protection.setUnprotectedRanges(unprotected);
  }

  /**
   * Enhancement function: adds formatting to Financial Aid tracker.
   * @param {Sheet} sheet - The Financial Aid sheet
   */
  function enhanceFinancialAidFormatting(sheet) {
    if (!sheet) return;

    // Apply number formatting to 4-Year Burden column
    CollegeTools.Formatting.formatNumber(sheet, '4-Year Burden', '0.0%');

    // Add conditional formatting for Financial Safety column
    var safetyCol = CollegeTools.Utils.colIndex(sheet, 'Financial Safety');
    if (safetyCol) {
      var startRow = 2;
      var endRow = Math.max(2, sheet.getLastRow());
      var range = sheet.getRange(startRow, safetyCol, endRow - startRow + 1, 1);

      var rules = CollegeTools.Formatting.removeTextRules(sheet.getConditionalFormatRules(),
        ['🟢 Comfortable', '🟡 Manageable', '🟠 Stretch', '🔴 Reconsider']);

      CollegeTools.Formatting.pushTextRule(rules, range, '🟢 Comfortable', '#d4edda', '#155724');
      CollegeTools.Formatting.pushTextRule(rules, range, '🟡 Manageable', '#fff3cd', '#856404');
      CollegeTools.Formatting.pushTextRule(rules, range, '🟠 Stretch', '#ffeaa7', '#b95000');
      CollegeTools.Formatting.pushTextRule(rules, range, '🔴 Reconsider', '#f8d7da', '#721c24');

      sheet.setConditionalFormatRules(rules);
    }
  }

  // Public API
  return {
    setupFinancialIntelligence: setupFinancialIntelligence,
    runFinancialSetup_: runFinancialSetup_,
    enhancePersonalProfileFormatting: enhancePersonalProfileFormatting,
    enhanceFinancialAidFormatting: enhanceFinancialAidFormatting,
  };
})();
