/**
 * Admission Fit calculator
 * @version 2.6.0
 * @author College Tools
 * @description Categorizes each college as Reach/Match/Likely from student stats vs school profile
 */

/**
 * CollegeTools.Admissions - Admission fit module
 * Applies the Admission Fit formula (Reach/Match/Likely) and its formatting.
 * Replaces the former Admission Chances / Academic Index Match / Merit Aid
 * Likelihood trio — one honest category instead of three pseudo-precise scores.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Admissions = (function() {
  'use strict';

  var FIT_MARKERS = ['Likely', 'Match', 'Reach'];
  // Rules that older versions wrote and this module must clean up on rerun
  var LEGACY_MARKERS = ['Strong', 'High Reach'];

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
   * Removes prior rules created by this module (or legacy versions of it)
   * so reruns replace rules instead of accumulating duplicates.
   * @param {ConditionalFormatRule[]} rules - Existing rules array
   * @param {string[]} markers - Exact text markers used by our rules
   * @returns {ConditionalFormatRule[]} Filtered rules
   * @private
   */
  function removeFitTextRules_(rules, markers) {
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
   * Applies the Admission Fit formula to every college row.
   * Uses the student's SAT (or ACT when no SAT) from the Personal Profile
   * against the school's 25th/75th percentile columns, with a one-notch
   * GPA adjustment and a hard Reach cap for sub-15% acceptance schools.
   */
  function setupAdmissionFit() {
    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sheet) return;

    var fitCol = CollegeTools.Schema.columnIndex('COLLEGES', 'ADMISSION_FIT', sheet);
    var sat25Col = CollegeTools.Schema.columnIndex('COLLEGES', 'SAT_25', sheet);
    var sat75Col = CollegeTools.Schema.columnIndex('COLLEGES', 'SAT_75', sheet);
    var act25Col = CollegeTools.Schema.columnIndex('COLLEGES', 'ACT_25', sheet);
    var act75Col = CollegeTools.Schema.columnIndex('COLLEGES', 'ACT_75', sheet);
    var accCol = CollegeTools.Schema.columnIndex('COLLEGES', 'ACCEPTANCE_RATE', sheet);
    if (!fitCol || !sat25Col || !sat75Col || !act25Col || !act75Col || !accCol) return;

    var startRow = CollegeTools.Schema.getSheet('COLLEGES').dataStartRow;
    var endRow = Math.max(startRow, sheet.getLastRow());
    var collegeNames = sheet.getRange(startRow, 1, endRow - startRow + 1, 1).getValues();
    var formulas = [];

    for (var i = 0; i < collegeNames.length; i++) {
      var row = startRow + i;
      if (!collegeNames[i][0]) {
        formulas.push(['']);
        continue;
      }
      formulas.push([CollegeTools.Formulas.admissionFit({
        sat25: CollegeTools.Utils.addr(row, sat25Col),
        sat75: CollegeTools.Utils.addr(row, sat75Col),
        act25: CollegeTools.Utils.addr(row, act25Col),
        act75: CollegeTools.Utils.addr(row, act75Col),
        acceptance: CollegeTools.Utils.addr(row, accCol),
      })]);
    }

    if (formulas.length > 0) {
      sheet.getRange(startRow, fitCol, formulas.length, 1).setFormulas(formulas);
    }
  }

  /**
   * Applies conditional formatting to the Admission Fit column.
   * @param {Sheet} sheet - The Colleges sheet
   */
  function enhanceAdmissionFormatting(sheet) {
    var fitCol = CollegeTools.Schema.columnIndex('COLLEGES', 'ADMISSION_FIT', sheet);
    if (!fitCol) return;

    var startRow = CollegeTools.Schema.getSheet('COLLEGES').dataStartRow;
    var endRow = Math.max(startRow, sheet.getLastRow());
    var range = sheet.getRange(startRow, fitCol, endRow - startRow + 1, 1);

    var rules = removeFitTextRules_(sheet.getConditionalFormatRules(),
      FIT_MARKERS.concat(LEGACY_MARKERS));

    pushTextRule_(rules, range, 'Likely', '#d4edda', '#155724');
    pushTextRule_(rules, range, 'Match', '#fff3cd', '#856404');
    pushTextRule_(rules, range, 'Reach', '#f8d7da', '#721c24');

    sheet.setConditionalFormatRules(rules);
  }

  // Public API
  return {
    setupAdmissionFit: setupAdmissionFit,
    enhanceAdmissionFormatting: enhanceAdmissionFormatting,
  };
})();
