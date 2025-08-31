/**
 * Admission Chances Calculator
 * @version 1.1.0
 * @author College Tools
 * @description Calculates admission probability based on student stats vs school profile
 */

/**
 * CollegeTools.Admissions - Admission chances module
 * Calculates admission probability and adds input cells for student stats
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Admissions = (function() {
  'use strict';

  /**
   * Sets up the Admission Chances calculator with formulas only (optimized for speed).
   * Integrates with Personal Profile sheet for centralized student configuration.
   * Applies formulas to calculate admission probability for each college.
   */
  function setupAdmissionChances() {
    var ss = SpreadsheetApp.getActive();
    var col = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!col) return;

    var admissionCol = findColumnInRow2(col, 'Admission Chances');
    if (!admissionCol) return;

    // Apply core formulas only - no formatting for speed
    applyAdmissionFormulas(col);
    applyAcademicIndexFormulas(col);
  }


  /**
   * Finds the column index for a given header in row 2 (where College Tools headers are).
   * @param {Sheet} sh - The sheet to search
   * @param {string} header - The header text to find
   * @returns {number|null} 1-based column index or null if not found
   * @private
   */
  function findColumnInRow2(sh, header) {
    var last = Math.max(1, sh.getLastColumn());
    var hdrs = sh.getRange(2, 1, 1, last).getValues()[0];
    for (var i=0; i<hdrs.length; i++) {
      if ((hdrs[i]||'').toString().trim() === header) return i+1;
    }
    return null;
  }


  /**
   * Applies admission probability formulas to the Admission Chances column (optimized for speed).
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyAdmissionFormulas(sheet) {
    var admissionCol = findColumnInRow2(sheet, 'Admission Chances');
    var acceptanceCol = findColumnInRow2(sheet, 'Acceptance Rate');
    var sat25Col = findColumnInRow2(sheet, 'SAT 25%');
    var sat75Col = findColumnInRow2(sheet, 'SAT 75%');
    if (!admissionCol || !acceptanceCol || !sat25Col || !sat75Col) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());

    for (var row = startRow; row <= endRow; row++) {
      var collegeName = sheet.getRange(row, 1).getValue();
      if (!collegeName || collegeName === '') continue;

      var acceptanceCell = CollegeTools.Utils.addr(row, acceptanceCol);
      var sat25Cell = CollegeTools.Utils.addr(row, sat25Col);
      var sat75Cell = CollegeTools.Utils.addr(row, sat75Col);
      var sat50Cell = '((' + sat25Cell + '+' + sat75Cell + ')/2)';

      var formula = '=IF(OR(SAT_Score="",SAT_Score=0),"Enter SAT",' +
        'IF(' + acceptanceCell + '="",' + '"No data",' +
        'IF(SAT_Score>=' + sat75Cell + ',' +
          'MIN(95,' + acceptanceCell + '*300)&"% - Strong",' +
        'IF(SAT_Score>=' + sat50Cell + ',' +
          'MIN(75,' + acceptanceCell + '*200)&"% - Match",' +
        'IF(SAT_Score>=' + sat25Cell + ',' +
          'MAX(10,' + acceptanceCell + '*80)&"% - Reach",' +
          'MAX(5,' + acceptanceCell + '*30)&"% - High Reach")))))';

      sheet.getRange(row, admissionCol).setFormula(formula);
    }
  }

  /**
   * Applies Academic Index formulas to calculate competitiveness scores (optimized for speed).
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyAcademicIndexFormulas(sheet) {
    var academicIndexCol = findColumnInRow2(sheet, 'Academic Index Match');
    var sat25Col = findColumnInRow2(sheet, 'SAT 25%');
    var sat75Col = findColumnInRow2(sheet, 'SAT 75%');
    if (!academicIndexCol || !sat25Col || !sat75Col) return;

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
      var sat50Cell = '((' + sat25Cell + '+' + sat75Cell + ')/2)';

      var formula = '=IF(OR(SAT_Score="",SAT_Score=0),"Enter SAT",' +
        'IF(OR(' + sat25Cell + '="",' + sat75Cell + '=""),"Test Optional",' +
        'IF(OR(' + sat25Cell + '=0,' + sat75Cell + '=0),"Test Optional",' +
        'ROUND(' +
          '((SAT_Score/' + sat50Cell + ')*80) + ' +
          'IF(SAT_Score>' + sat75Cell + ',20,' +
            'IF(SAT_Score>' + sat50Cell + ',10,0))' +
        ',0))))';

      formulas.push([formula]);
    }

    if (formulas.length > 0) {
      sheet.getRange(startRow, academicIndexCol, formulas.length, 1).setFormulas(formulas);
    }
  }

  /**
   * Applies conditional formatting to the Academic Index Match column.
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyAcademicIndexFormatting(sheet) {
    var academicIndexCol = findColumnInRow2(sheet, 'Academic Index Match');
    if (!academicIndexCol) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());
    var range = sheet.getRange(startRow, academicIndexCol, endRow - startRow + 1, 1);

    // Get existing rules to append to them
    var rules = sheet.getConditionalFormatRules();

    // Rule for >100 (Overqualified) - Dark Green
    var overqualifiedRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(100)
      .setBackground('#d4edda')
      .setFontColor('#155724')
      .setRanges([range])
      .build();
    rules.push(overqualifiedRule);

    // Rule for 85-100 (Strong Match) - Light Green
    var strongMatchRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(85, 100)
      .setBackground('#d1ecf1')
      .setFontColor('#0c5460')
      .setRanges([range])
      .build();
    rules.push(strongMatchRule);

    // Rule for 70-85 (Target) - Yellow
    var targetRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(70, 84)
      .setBackground('#fff3cd')
      .setFontColor('#856404')
      .setRanges([range])
      .build();
    rules.push(targetRule);

    // Rule for <70 (Reach) - Red
    var reachRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(70)
      .setBackground('#f8d7da')
      .setFontColor('#721c24')
      .setRanges([range])
      .build();
    rules.push(reachRule);

    sheet.setConditionalFormatRules(rules);
  }

  /**
   * Applies conditional formatting to the Admission Chances column.
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyAdmissionFormatting(sheet) {
    var admissionCol = findColumnInRow2(sheet, 'Admission Chances');
    if (!admissionCol) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());
    var range = sheet.getRange(startRow, admissionCol, endRow - startRow + 1, 1);

    // Clear existing rules
    sheet.clearConditionalFormatRules();
    var rules = sheet.getConditionalFormatRules();

    // Rule for Strong (contains "Strong") - Green
    var strongRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('Strong')
      .setBackground('#d4edda')
      .setFontColor('#155724')
      .setRanges([range])
      .build();
    rules.push(strongRule);

    // Rule for Match (contains "Match" but not "High Reach") - Yellow
    var matchRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('Match')
      .setBackground('#fff3cd')
      .setFontColor('#856404')
      .setRanges([range])
      .build();
    rules.push(matchRule);

    // Rule for Reach (contains "Reach") - Orange/Red
    var reachRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('Reach')
      .setBackground('#f8d7da')
      .setFontColor('#721c24')
      .setRanges([range])
      .build();
    rules.push(reachRule);

    // Rule for High Reach - Dark Red
    var highReachRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('High Reach')
      .setBackground('#f5c6cb')
      .setFontColor('#721c24')
      .setRanges([range])
      .build();
    rules.push(highReachRule);

    sheet.setConditionalFormatRules(rules);
  }


  /**
   * Enhancement function: adds conditional formatting to admission-related columns.
   * @param {Sheet} sheet - The Colleges sheet
   */
  function enhanceAdmissionFormatting(sheet) {
    applyAdmissionFormatting(sheet);
    applyAcademicIndexFormatting(sheet);
  }

  // Public API
  return {
    setupAdmissionChances: setupAdmissionChances,
    enhanceAdmissionFormatting: enhanceAdmissionFormatting,
  };
})();
