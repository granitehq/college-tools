/**
 * Weighted scoring system
 * @version 5.6.2
 * @author College Tools
 * @description Weighted scoring calculations and formulas for colleges and campus visits
 */

/**
 * CollegeTools.Scoring - Scoring module
 * Handles weighted scoring calculations and formulas
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Scoring = (function() {
  'use strict';

  /**
   * Sets up the weighted scoring system for colleges and campus visits.
   * Creates a Weights sheet with default weight values for different criteria.
   * Applies formulas to calculate Weighted Score in Colleges sheet and Visit Score in Campus Visit Tracker.
   * Formulas use VLOOKUP to reference weights dynamically from the Weights sheet.
   */
  function ensureScoring() {
    var ss = SpreadsheetApp.getActive();

    // Ensure Weights sheet with defaults
    var ws = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.WEIGHTS);
    ws.clear();
    ws.getRange(1, 1, 1, 2).setValues([['Setting', 'Weight']]).setFontWeight('bold');
    ws.getRange(2, 1, CollegeTools.Config.DEFAULT_WEIGHTS.length, 2)
      .setValues(CollegeTools.Config.DEFAULT_WEIGHTS);

    // Colleges → Weighted Score
    var col = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (col) {
      var rStart = 3; var rEnd = Math.max(3, col.getLastRow());
      var pieces = [
        'Program Fit (1-5)',
        'Academic Reputation (1-5)',
        'Research Opportunities (1-5)',
        'Safety (1-5)',
        'Campus Culture Fit (1-5)',
        'Weather Fit (1-5)',
        'Clubs/Activities (1-5)',
        'Personal Priority (1-5)',
      ];

      // Build formula using SUMPRODUCT with weights looked up via VLOOKUP
      var cScore = CollegeTools.Utils.colIndex(col, 'Weighted Score');
      var nameCol = CollegeTools.Utils.colIndex(col, 'College Name');

      if (cScore && nameCol) {
        for (var r=rStart; r<=rEnd; r++) {
          var name = (col.getRange(r, nameCol).getValue()||'').toString().trim();
          if (!name) continue;

          var num = []; var den = [];
          pieces.forEach(function(header) {
            var c = CollegeTools.Utils.colIndex(col, header);
            if (c) {
              var cell = CollegeTools.Utils.addr(r, c);
              var weightLookup = 'IFERROR(VLOOKUP("' + header + '",' +
                                CollegeTools.Config.SHEET_NAMES.WEIGHTS + '!A:B,2,false),0)';
              num.push(cell + '*' + weightLookup);
              den.push(weightLookup);
            }
          });

          var formula = '=IFERROR((' + num.join('+') + ')/(' + den.join('+') + '), "")';
          col.getRange(r, cScore).setFormula(formula);
        }
        CollegeTools.Formatting.formatNumber(col, 'Weighted Score', '0.00');
      }
    }

    // Campus Visit → Visit Score (weighted average of 1–10 ratings)
    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      var ratings = [
        'Tour Quality (1-10)', 'Info Session Quality (1-10)', 'Campus Beauty (1-10)',
        'Facilities Quality (1-10)', 'Student Happiness (1-10)', 'Academic Vibe (1-10)',
        'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)',
      ];
      var cVisitScore = CollegeTools.Utils.colIndex(cv, 'Visit Score');

      if (cVisitScore) {
        var rStart2 = 2; var rEnd2 = Math.max(2, cv.getLastRow());
        for (var r2=rStart2; r2<=rEnd2; r2++) {
          var num2 = []; var den2 = [];
          ratings.forEach(function(header) {
            var c = CollegeTools.Utils.colIndex(cv, header);
            if (!c) return;
            var cell = CollegeTools.Utils.addr(r2, c);
            var weightLookup = 'IFERROR(VLOOKUP("' + header + '",' +
                              CollegeTools.Config.SHEET_NAMES.WEIGHTS + '!A:B,2,false),0)';
            num2.push('IFERROR(' + cell + ',0)*' + weightLookup);
            den2.push(weightLookup);
          });

          var formula = '=IF(COUNTA(A' + r2 + ')=0,"",IFERROR((' +
                       num2.join('+') + ')/(' + den2.join('+') + '), ""))';
          cv.getRange(r2, cVisitScore).setFormula(formula);
        }
        CollegeTools.Formatting.formatNumber(cv, 'Visit Score', '0.00');
      }
    }

    SpreadsheetApp.getUi().alert('Scoring formulas ensured. Edit weights anytime on the "' +
                                CollegeTools.Config.SHEET_NAMES.WEIGHTS + '" sheet.');
  }

  // Public API
  return {
    ensureScoring: ensureScoring,
  };
})();
