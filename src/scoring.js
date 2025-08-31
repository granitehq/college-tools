/**
 * Weighted scoring system
 * @version 1.2.3
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
   * Normalizes value scores to a 0-100 scale for easy comparison.
   * @param {Sheet} sheet - The sheet containing the scores
   * @param {number} scoreCol - Column index of the Value Score
   * @param {number} startRow - Starting row
   * @param {number} endRow - Ending row
   * @private
   */
  function normalizeValueScores(sheet, scoreCol, startRow, endRow) {
    // Read all raw scores
    var numRows = endRow - startRow + 1;
    var rawScores = sheet.getRange(startRow, scoreCol, numRows, 1).getValues();

    // Find min and max for normalization (excluding empty values)
    var validScores = [];
    for (var i = 0; i < rawScores.length; i++) {
      var score = rawScores[i][0];
      if (score && !isNaN(score) && score !== '') {
        validScores.push(Number(score));
      }
    }

    if (validScores.length === 0) return;

    var minScore = Math.min.apply(null, validScores);
    var maxScore = Math.max.apply(null, validScores);

    // If all scores are the same, set them all to 50
    if (minScore === maxScore) {
      for (var r = startRow; r <= endRow; r++) {
        var currentValue = sheet.getRange(r, scoreCol).getValue();
        if (currentValue && currentValue !== '') {
          sheet.getRange(r, scoreCol).setValue(50);
        }
      }
      return;
    }

    // Normalize each score to 0-100 scale
    for (var r = startRow; r <= endRow; r++) {
      var currentFormula = sheet.getRange(r, scoreCol).getFormula();
      if (currentFormula && currentFormula !== '') {
        // Wrap existing formula in normalization calculation
        // Normalized = ((value - min) / (max - min)) * 100
        var normalizedFormula = '=IFERROR(IF(' + currentFormula.substring(1) + '="",' +
                               '"",((' + currentFormula.substring(1) + '-' + minScore + ')/(' +
                               (maxScore - minScore) + '))*100),"")';
        sheet.getRange(r, scoreCol).setFormula(normalizedFormula);
      }
    }

    // Format as number with 1 decimal place
    CollegeTools.Formatting.formatNumber(sheet, 'Value Score', '0.0');
  }

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

      // Add Value Score calculation
      var cValueScore = CollegeTools.Utils.colIndex(col, 'Value Score');
      var cGradRate = CollegeTools.Utils.colIndex(col, 'Grad Rate');
      var cRetention = CollegeTools.Utils.colIndex(col, 'First-Year Retention');
      var cEarnings = CollegeTools.Utils.colIndex(col, 'Median Earnings (10yr)');
      var cNetPrice = CollegeTools.Utils.colIndex(col, 'Estimated Net Price');

      if (cValueScore && cGradRate && cRetention && cEarnings && cNetPrice) {
        // First pass: Calculate raw value scores
        for (var r=rStart; r<=rEnd; r++) {
          var name = (col.getRange(r, nameCol).getValue()||'').toString().trim();
          if (!name) continue;

          // Formula: (GradRate × Retention × Median Earnings) ÷ NetPrice
          // Convert percentages to decimals, handle missing data
          var gradCell = CollegeTools.Utils.addr(r, cGradRate);
          var retCell = CollegeTools.Utils.addr(r, cRetention);
          var earnCell = CollegeTools.Utils.addr(r, cEarnings);
          var netCell = CollegeTools.Utils.addr(r, cNetPrice);

          var formula = '=IFERROR(IF(AND(' + netCell + '>0,' + gradCell + '>0,' + retCell + '>0,' + earnCell + '>0),' +
                       '(' + gradCell + '*' + retCell + '*' + earnCell + ')/' + netCell + ',""),"")';

          col.getRange(r, cValueScore).setFormula(formula);
        }

        // Second pass: Normalize the scores (0-100 scale)
        normalizeValueScores(col, cValueScore, rStart, rEnd);
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
