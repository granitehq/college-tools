/**
 * Admission Chances Calculator
 * @version 2.5.0
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
   * Adds a text-contains conditional format rule to a rules array.
   * @param {ConditionalFormatRule[]} rules - Existing rules array
   * @param {Range} range - Target range
   * @param {string} text - Text fragment to match
   * @param {string} bg - Background color
   * @param {string} fg - Font color
   * @private
   */
  function pushTextRule_(rules, range, text, bg, fg) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains(text)
      .setBackground(bg)
      .setFontColor(fg)
      .setRanges([range])
      .build());
  }

  /**
   * Removes prior rules for the exact target range that match a known admission formatter.
   * This keeps the formatting additive for unrelated columns while avoiding duplicate rules.
   * @param {ConditionalFormatRule[]} rules - Existing rules array
   * @param {string[]} markers - Text markers used by our admission rules
   * @returns {ConditionalFormatRule[]} Filtered rules
   * @private
   */
  function removeAdmissionTextRules_(rules, markers) {
    return (rules || []).filter(function(rule) {
      var text = '';
      try {
        var boolCondition = rule.getBooleanCondition && rule.getBooleanCondition();
        var values = boolCondition && boolCondition.getCriteriaValues && boolCondition.getCriteriaValues();
        text = values && values.length ? String(values[0]) : '';
      } catch (e) {
        text = '';
      }
      return markers.indexOf(text) === -1;
    });
  }

  /**
   * Removes prior numeric academic-index rules for this formatter.
   * Only removes rules that both use our numeric criteria types and target the
   * Academic Index Match column — unrelated numeric rules elsewhere on the
   * sheet are left intact.
   * @param {ConditionalFormatRule[]} rules - Existing rules array
   * @param {number} targetCol - 1-based column of Academic Index Match
   * @returns {ConditionalFormatRule[]} Filtered rules
   * @private
   */
  function removeAcademicIndexRules_(rules, targetCol) {
    return (rules || []).filter(function(rule) {
      try {
        var condition = rule.getBooleanCondition && rule.getBooleanCondition();
        if (!condition || !condition.getCriteriaType) return true;
        var type = String(condition.getCriteriaType());
        if (['NUMBER_GREATER_THAN', 'NUMBER_BETWEEN', 'NUMBER_LESS_THAN'].indexOf(type) === -1) {
          return true;
        }
        var ranges = rule.getRanges ? rule.getRanges() : [];
        for (var i = 0; i < ranges.length; i++) {
          if (ranges[i].getColumn() <= targetCol && ranges[i].getLastColumn() >= targetCol) {
            return false; // our rule — remove it
          }
        }
        return true;
      } catch (e) {
        return true;
      }
    });
  }

  /**
   * Sets up the Admission Chances calculator with formulas only (optimized for speed).
   * Integrates with Personal Profile sheet for centralized student configuration.
   * Applies formulas to calculate admission probability for each college.
   */
  function setupAdmissionChances() {
    var ss = SpreadsheetApp.getActive();
    var col = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!col) return;

    var admissionCol = CollegeTools.Utils.colIndex2(col, 'Admission Chances');
    if (!admissionCol) return;

    // Apply core formulas only - no formatting for speed
    applyAdmissionFormulas(col);
    applyAcademicIndexFormulas(col);
  }


  /**
   * Applies admission probability formulas to the Admission Chances column (optimized for speed).
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyAdmissionFormulas(sheet) {
    var admissionCol = CollegeTools.Utils.colIndex2(sheet, 'Admission Chances');
    var acceptanceCol = CollegeTools.Utils.colIndex2(sheet, 'Acceptance Rate');
    var sat25Col = CollegeTools.Utils.colIndex2(sheet, 'SAT 25%');
    var sat75Col = CollegeTools.Utils.colIndex2(sheet, 'SAT 75%');
    if (!admissionCol || !acceptanceCol || !sat25Col || !sat75Col) return;

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

      formulas.push([formula]);
    }

    if (formulas.length > 0) {
      sheet.getRange(startRow, admissionCol, formulas.length, 1).setFormulas(formulas);
    }
  }

  /**
   * Applies Academic Index formulas to calculate competitiveness scores (optimized for speed).
   * @param {Sheet} sheet - The Colleges sheet
   * @private
   */
  function applyAcademicIndexFormulas(sheet) {
    var academicIndexCol = CollegeTools.Utils.colIndex2(sheet, 'Academic Index Match');
    var sat25Col = CollegeTools.Utils.colIndex2(sheet, 'SAT 25%');
    var sat75Col = CollegeTools.Utils.colIndex2(sheet, 'SAT 75%');
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
    var academicIndexCol = CollegeTools.Utils.colIndex2(sheet, 'Academic Index Match');
    if (!academicIndexCol) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());
    var range = sheet.getRange(startRow, academicIndexCol, endRow - startRow + 1, 1);

    // Replace only the rules owned by this module, keep unrelated rules.
    var rules = removeAcademicIndexRules_(sheet.getConditionalFormatRules(), academicIndexCol);

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
    var admissionCol = CollegeTools.Utils.colIndex2(sheet, 'Admission Chances');
    if (!admissionCol) return;

    var startRow = 3;
    var endRow = Math.max(3, sheet.getLastRow());
    var range = sheet.getRange(startRow, admissionCol, endRow - startRow + 1, 1);

    var rules = removeAdmissionTextRules_(sheet.getConditionalFormatRules(),
      ['Strong', 'Match', 'Reach', 'High Reach']);

    // "High Reach" must precede "Reach": the first matching rule wins and
    // "High Reach" text also contains "Reach".
    pushTextRule_(rules, range, 'High Reach', '#f5c6cb', '#721c24');
    pushTextRule_(rules, range, 'Strong', '#d4edda', '#155724');
    pushTextRule_(rules, range, 'Match', '#fff3cd', '#856404');
    pushTextRule_(rules, range, 'Reach', '#f8d7da', '#721c24');

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
