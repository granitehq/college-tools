/**
 * Weighted scoring system
 * @version 2.6.2
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
        'PROGRAM_FIT',
        'ACADEMIC_REPUTATION',
        'RESEARCH_OPPORTUNITIES',
        'SAFETY',
        'CAMPUS_CULTURE_FIT',
        'WEATHER_FIT',
        'CLUBS_ACTIVITIES',
        'PERSONAL_PRIORITY',
      ];

      // Build formula using SUMPRODUCT with weights looked up via VLOOKUP
      var cScore = CollegeTools.Schema.columnIndex('COLLEGES', 'WEIGHTED_SCORE', col);
      var nameCol = CollegeTools.Schema.columnIndex('COLLEGES', 'COLLEGE_NAME', col);

      // Read all college names once for the Weighted Score block below.
      var nameVals = nameCol ?
        col.getRange(rStart, nameCol, rEnd - rStart + 1, 1).getValues() : null;

      if (cScore && nameVals) {
        // Pre-compute the weight lookups once — they're the same for every row
        var pieceCols = [];
        pieces.forEach(function(columnKey) {
          var c = CollegeTools.Schema.columnIndex('COLLEGES', columnKey, col);
          if (c) pieceCols.push({header: CollegeTools.Schema.header('COLLEGES', columnKey), col: c});
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
                              CollegeTools.Formulas.sheetRef(CollegeTools.Config.SHEET_NAMES.WEIGHTS) +
                              '!A:B,2,false),0)';
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
    }

    // Campus Visit → Visit Score (plain average of the 1-10 ratings; visit
    // ratings don't carry the family-priority weighting that college
    // ratings do, so a straight average loses nothing and needs no Weights
    // sheet entries)
    var cv = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT);
    if (cv) {
      var ratings = [
        'Campus & Facilities (1-10)', 'Academic Vibe (1-10)',
        'Social Atmosphere (1-10)', 'Overall Gut Feeling (1-10)',
      ];
      var cVisitScore = CollegeTools.Utils.colIndex(cv, 'Visit Score');

      if (cVisitScore) {
        var ratingCols = ratings
          .map(function(header) {
            return CollegeTools.Utils.colIndex(cv, header);
          })
          .filter(Boolean);

        if (ratingCols.length) {
          var rStart2 = 2; var rEnd2 = Math.max(2, cv.getLastRow());
          var visitFormulas = [];
          for (var r2 = rStart2; r2 <= rEnd2; r2++) {
            var cells = ratingCols.map(function(c) {
              return CollegeTools.Utils.addr(r2, c);
            });
            visitFormulas.push(['=IF(COUNTA(A' + r2 + ')=0,"",IFERROR(AVERAGE(' + cells.join(',') + '), ""))']);
          }
          cv.getRange(rStart2, cVisitScore, visitFormulas.length, 1).setFormulas(visitFormulas);
          CollegeTools.Formatting.formatNumber(cv, 'Visit Score', '0.00');
        }
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
