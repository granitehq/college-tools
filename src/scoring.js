/**
 * Weighted scoring system
 * @version 2.0.2
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
    var numRows = endRow - startRow + 1;
    // Read values and formulas in two bulk calls
    var rawScores = sheet.getRange(startRow, scoreCol, numRows, 1).getValues();
    var rawFormulas = sheet.getRange(startRow, scoreCol, numRows, 1).getFormulas();

    // Find min/max from non-empty numeric values
    var validScores = [];
    for (var i = 0; i < rawScores.length; i++) {
      var score = rawScores[i][0];
      if (score !== '' && score !== null && !isNaN(Number(score))) {
        validScores.push(Number(score));
      }
    }
    if (validScores.length === 0) return;

    var minScore = Math.min.apply(null, validScores);
    var maxScore = Math.max.apply(null, validScores);

    // Build all normalized formulas in memory, write in one call
    var normalizedFormulas = [];
    for (var j = 0; j < numRows; j++) {
      var currentFormula = rawFormulas[j][0];
      if (!currentFormula) {
        normalizedFormulas.push(['']);
        continue;
      }
      var inner = currentFormula.substring(1); // strip leading '='
      if (minScore === maxScore) {
        normalizedFormulas.push(['=IFERROR(IF((' + inner + ')="","",50),"")']);
      } else {
        normalizedFormulas.push(['=IFERROR(IF((' + inner + ')="",' +
          '"",(((' + inner + ')-' + minScore + ')/(' +
          (maxScore - minScore) + '))*100),"")']);
      }
    }
    sheet.getRange(startRow, scoreCol, numRows, 1).setFormulas(normalizedFormulas);
    CollegeTools.Formatting.formatNumber(sheet, 'Value Score', '0.0', 2);
  }

  /**
   * Sets up the weighted scoring system for colleges and campus visits.
   * Creates a Weights sheet with default weight values for different criteria.
   * Applies formulas to calculate Weighted Score in Colleges sheet and Visit Score in Campus Visit Tracker.
   * Formulas use VLOOKUP to reference weights dynamically from the Weights sheet.
   * Value Score normalization bakes in the min/max at run time, so rerun this
   * (or Repair Entire Workbook) after adding colleges.
   * @param {Object=} opts - Optional execution flags
   * @param {boolean=} opts.suppressAlert - Whether to suppress the completion alert
   */
  function ensureScoring(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();

    // Ensure Weights sheet with defaults, preserving any user-customized
    // weight values across reruns.
    var ws = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.WEIGHTS);
    var existingWeights = {};
    var wsLastRow = ws.getLastRow();
    if (wsLastRow >= 2) {
      ws.getRange(2, 1, wsLastRow - 1, 2).getValues().forEach(function(rowVals) {
        var setting = (rowVals[0] || '').toString().trim();
        if (setting && rowVals[1] !== '' && rowVals[1] !== null && !isNaN(Number(rowVals[1]))) {
          existingWeights[setting] = Number(rowVals[1]);
        }
      });
    }
    var weightRows = CollegeTools.Config.DEFAULT_WEIGHTS.map(function(defaultRow) {
      var setting = defaultRow[0];
      var weight = existingWeights.hasOwnProperty(setting) ? existingWeights[setting] : defaultRow[1];
      return [setting, weight];
    });
    ws.clear();
    ws.getRange(1, 1, 1, 2).setValues([['Setting', 'Weight']]).setFontWeight('bold');
    ws.getRange(2, 1, weightRows.length, 2).setValues(weightRows);

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
      var cScore = CollegeTools.Utils.colIndex2(col, 'Weighted Score');
      var nameCol = CollegeTools.Utils.colIndex2(col, 'College Name');

      // Read all college names once — used by both the Weighted Score and
      // Value Score blocks below.
      var nameVals = nameCol ?
        col.getRange(rStart, nameCol, rEnd - rStart + 1, 1).getValues() : null;

      if (cScore && nameVals) {
        // Pre-compute the weight lookups once — they're the same for every row
        var pieceCols = [];
        pieces.forEach(function(header) {
          var c = CollegeTools.Utils.colIndex2(col, header);
          if (c) pieceCols.push({header: header, col: c});
        });

        var weightFormulas = [];
        for (var r = rStart; r <= rEnd; r++) {
          var name = (nameVals[r - rStart][0] || '').toString().trim();
          if (!name) {
            weightFormulas.push(['']);
            continue;
          }
          var num = []; var den = [];
          pieceCols.forEach(function(pc) {
            var cell = CollegeTools.Utils.addr(r, pc.col);
            var weightLookup = 'IFERROR(VLOOKUP("' + pc.header + '",' +
                              CollegeTools.Config.SHEET_NAMES.WEIGHTS + '!A:B,2,false),0)';
            num.push(cell + '*' + weightLookup);
            // Exclude unrated criteria from the denominator so a blank
            // rating is ignored rather than counted as a score of 0.
            den.push('IF(' + cell + '="",0,' + weightLookup + ')');
          });
          weightFormulas.push(['=IFERROR((' + num.join('+') + ')/(' + den.join('+') + '), "")']);
        }
        col.getRange(rStart, cScore, weightFormulas.length, 1).setFormulas(weightFormulas);
        CollegeTools.Formatting.formatNumber(col, 'Weighted Score', '0.00', 2);
      }

      // Add Value Score calculation
      var cValueScore = CollegeTools.Utils.colIndex2(col, 'Value Score');
      var cGradRate = CollegeTools.Utils.colIndex2(col, 'Grad Rate');
      var cRetention = CollegeTools.Utils.colIndex2(col, 'First-Year Retention');
      var cEarnings = CollegeTools.Utils.colIndex2(col, 'Median Earnings (10yr)');
      var cNetPrice = CollegeTools.Utils.colIndex2(col, 'Estimated Net Price');

      if (cValueScore && cGradRate && cRetention && cEarnings && cNetPrice && nameVals) {
        var valueFormulas = [];
        for (var rv = rStart; rv <= rEnd; rv++) {
          var namev = (nameVals[rv - rStart][0] || '').toString().trim();
          if (!namev) {
            valueFormulas.push(['']);
            continue;
          }
          var gradCell = CollegeTools.Utils.addr(rv, cGradRate);
          var retCell = CollegeTools.Utils.addr(rv, cRetention);
          var earnCell = CollegeTools.Utils.addr(rv, cEarnings);
          var netCell = CollegeTools.Utils.addr(rv, cNetPrice);
          valueFormulas.push(['=IFERROR(IF(AND(' + netCell + '>0,' + gradCell + '>0,' + retCell + '>0,' + earnCell + '>0),' +
            '(' + gradCell + '*' + retCell + '*' + earnCell + ')/' + netCell + ',""),"")']);
        }
        col.getRange(rStart, cValueScore, valueFormulas.length, 1).setFormulas(valueFormulas);
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
            // Exclude unrated criteria so blanks don't drag the score down
            den2.push('IF(' + cell + '="",0,' + weightLookup + ')');
          });

          var formula = '=IF(COUNTA(A' + r2 + ')=0,"",IFERROR((' +
                       num2.join('+') + ')/(' + den2.join('+') + '), ""))';
          cv.getRange(r2, cVisitScore).setFormula(formula);
        }
        CollegeTools.Formatting.formatNumber(cv, 'Visit Score', '0.00');
      }
    }

    if (!opts.suppressAlert) {
      SpreadsheetApp.getUi().alert('Scoring formulas ensured. Edit weights anytime on the "' +
                                  CollegeTools.Config.SHEET_NAMES.WEIGHTS + '" sheet.');
    }
  }

  // Public API
  return {
    ensureScoring: ensureScoring,
  };
})();
