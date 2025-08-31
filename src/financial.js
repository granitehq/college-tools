/**
 * Financial Intelligence Suite
 * @version 1.2.0
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
   * Applies Merit Aid Likelihood formulas to the Colleges sheet (optimized for speed).
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyMeritAidFormulas(sheet) {
    var meritCol = findColumnInRow2(sheet, 'Merit Aid Likelihood');
    var sat25Col = findColumnInRow2(sheet, 'SAT 25%');
    var sat75Col = findColumnInRow2(sheet, 'SAT 75%');
    if (!meritCol || !sat25Col || !sat75Col) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());
    var collegeNames = sheet.getRange(startRow, 1, endRow - startRow + 1, 1).getValues();
    var formulas = [];

    for (var i = 0; i < collegeNames.length; i++) {
      var row = startRow + i;
      var collegeName = collegeNames[i][0];
      if (!collegeName || collegeName === '') {
        formulas.push(['']);
        continue;
      }

      var sat25Cell = CollegeTools.Utils.addr(row, sat25Col);
      var sat75Cell = CollegeTools.Utils.addr(row, sat75Col);
      var sat60Cell = '(' + sat25Cell + '+(' + sat75Cell + '-' + sat25Cell + ')*0.6)';

      var formula = '=IF(OR(SAT_Score="",SAT_Score=0),"Enter SAT",' +
        'IF(' + sat75Cell + '="",' + '"No data",' +
        'IF(SAT_Score>' + sat75Cell + '+50,"🟢 Very High - Top 10%",' +
        'IF(SAT_Score>' + sat75Cell + ',"🟢 High - Top 25%",' +
        'IF(SAT_Score>' + sat60Cell + ',"🟡 Moderate - Consider",' +
        '"🔴 Low - Unlikely")))))';

      formulas.push([formula]);
    }

    if (formulas.length > 0) {
      sheet.getRange(startRow, meritCol, formulas.length, 1).setFormulas(formulas);
    }
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
   * Helper function to find column in row 2 (same as admissions.js)
   * @param {Sheet} sh - The sheet to search
   * @param {string} header - The header text to find
   * @returns {number|null} 1-based column index or null if not found
   * @private
   */
  function findColumnInRow2(sh, header) {
    var last = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(2, 1, 1, last).getValues()[0];
    for (var i = 0; i < hdrs.length; i++) {
      if ((hdrs[i] || '').toString().trim() === header) return i + 1;
    }
    return null;
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
      '• Merit Aid Likelihood calculator (Colleges sheet)\n' +
      '• Financial Safety analysis (Financial Aid tracker)\n' +
      '• Academic analysis (Admission Chances + Academic Index)\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO,
    );

    if (result !== ui.Button.YES) return;

    try {
      var ss = SpreadsheetApp.getActive();

      // Step 1: Create Personal Profile sheet (core structure only)
      createPersonalProfileSheet(ss);

      // Step 2: Set up academic analysis (formulas only)
      var collegesSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
      if (collegesSheet) {
        CollegeTools.Admissions.setupAdmissionChances();
        applyMeritAidFormulas(collegesSheet);
      }

      // Step 3: Set up financial analysis (formulas only)
      var financialSheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
      if (financialSheet) {
        applyFinancialSafetyFormulas(financialSheet);
      }

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
   * Applies Aid Requirements Complete formulas to the Financial Aid sheet.
   * @param {Sheet} sheet - The Financial Aid sheet
   * * @private
   */
  function applyAidRequirementsFormulas(sheet) {
    var completeCol = findColumnInRow2(sheet, 'Aid Requirements Complete');
    if (!completeCol) return;

    var _fafsaReqCol = findColumnInRow2(sheet, 'CSS Profile Required (Y/N)'); // Using existing CSS as proxy
    var fafsaSubCol = findColumnInRow2(sheet, 'FAFSA Submitted (Y/N)');
    var cssReqCol = findColumnInRow2(sheet, 'CSS Profile Required (Y/N)');
    var cssSubCol = findColumnInRow2(sheet, 'CSS Profile Submitted (Y/N)');
    var idocReqCol = findColumnInRow2(sheet, 'IDOC Required (Y/N)');
    var idocSubCol = findColumnInRow2(sheet, 'IDOC Submitted (Y/N)');
    var verReqCol = findColumnInRow2(sheet, 'Verification Required (Y/N)');

    if (!fafsaSubCol || !cssSubCol) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());

    for (var row = startRow; row <= endRow; row++) {
      var collegeName = sheet.getRange(row, 1).getValue();
      if (!collegeName || collegeName === '') continue;

      var fafsaSubCell = CollegeTools.Utils.addr(row, fafsaSubCol);
      var cssReqCell = cssReqCol ? CollegeTools.Utils.addr(row, cssReqCol) : '';
      var cssSubCell = CollegeTools.Utils.addr(row, cssSubCol);
      var idocReqCell = idocReqCol ? CollegeTools.Utils.addr(row, idocReqCol) : '';
      var idocSubCell = idocSubCol ? CollegeTools.Utils.addr(row, idocSubCol) : '';
      var verReqCell = verReqCol ? CollegeTools.Utils.addr(row, verReqCol) : '';

      // Aid Requirements Complete formula
      var formula = '=IF(AND(' +
        fafsaSubCell + '="Y",' +
        'OR(' + cssReqCell + '="N",' + cssSubCell + '="Y")' +
        (idocReqCol ? ',OR(' + idocReqCell + '="N",' + idocSubCell + '="Y")' : '') +
        (verReqCol ? ',OR(' + verReqCell + '="N",' + verReqCell + '="Y")' : '') +
        '),"✅ Complete","⚠️ Pending")';

      sheet.getRange(row, completeCol).setFormula(formula);
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

      var rules = sheet.getConditionalFormatRules();

      // Green for Comfortable
      var comfortableRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🟢 Comfortable')
        .setBackground('#d4edda')
        .setFontColor('#155724')
        .setRanges([range])
        .build();
      rules.push(comfortableRule);

      // Yellow for Manageable
      var manageableRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🟡 Manageable')
        .setBackground('#fff3cd')
        .setFontColor('#856404')
        .setRanges([range])
        .build();
      rules.push(manageableRule);

      // Orange for Stretch
      var stretchRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🟠 Stretch')
        .setBackground('#ffeaa7')
        .setFontColor('#b95000')
        .setRanges([range])
        .build();
      rules.push(stretchRule);

      // Red for Reconsider
      var reconsiderRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🔴 Reconsider')
        .setBackground('#f8d7da')
        .setFontColor('#721c24')
        .setRanges([range])
        .build();
      rules.push(reconsiderRule);

      sheet.setConditionalFormatRules(rules);
    }
  }

  /**
   * Enhancement function: adds conditional formatting to Colleges sheet.
   * @param {Sheet} sheet - The Colleges sheet
   */
  function enhanceCollegesFormatting(sheet) {
    if (!sheet) return;

    // Apply conditional formatting for Merit Aid Likelihood
    var meritCol = findColumnInRow2(sheet, 'Merit Aid Likelihood');
    if (meritCol) {
      var startRow = 3;
      var endRow = Math.max(3, sheet.getLastRow());
      var range = sheet.getRange(startRow, meritCol, endRow - startRow + 1, 1);

      var rules = sheet.getConditionalFormatRules();

      // High merit aid likelihood - green
      var highRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🟢')
        .setBackground('#d4edda')
        .setFontColor('#155724')
        .setRanges([range])
        .build();
      rules.push(highRule);

      // Moderate merit aid likelihood - yellow
      var moderateRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🟡')
        .setBackground('#fff3cd')
        .setFontColor('#856404')
        .setRanges([range])
        .build();
      rules.push(moderateRule);

      // Low merit aid likelihood - red
      var lowRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('🔴')
        .setBackground('#f8d7da')
        .setFontColor('#721c24')
        .setRanges([range])
        .build();
      rules.push(lowRule);

      sheet.setConditionalFormatRules(rules);
    }
  }

  // Public API
  return {
    setupFinancialIntelligence: setupFinancialIntelligence,
    applyAidRequirementsFormulas: applyAidRequirementsFormulas,
    enhancePersonalProfileFormatting: enhancePersonalProfileFormatting,
    enhanceFinancialAidFormatting: enhanceFinancialAidFormatting,
    enhanceCollegesFormatting: enhanceCollegesFormatting,
  };
})();
