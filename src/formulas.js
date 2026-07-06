/**
 * Pure formula builders
 * @version 2.6.3
 * @author College Tools
 * @description Testable formula builders shared by workbook modules
 */

/**
 * CollegeTools.Formulas - Formula builder module
 * Builds spreadsheet formulas without touching Apps Script services.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Formulas = (function() {
  'use strict';

  /**
   * Quotes a sheet name for use in A1 formula references.
   * @param {string} name - Sheet name
   * @returns {string} Quoted sheet reference without trailing bang
   */
  function sheetRef(name) {
    return '\'' + String(name).replace(/'/g, '\'\'') + '\'';
  }

  /**
   * Builds the Net Price After Aid formula.
   * @param {string} totalCostCell - Total cost cell reference
   * @param {string} grantsStartCell - First aid component cell reference
   * @param {string} grantsEndCell - Last aid component cell reference
   * @returns {string} Spreadsheet formula
   */
  function netPriceAfterAid(totalCostCell, grantsStartCell, grantsEndCell) {
    return '=IFERROR(' + totalCostCell + '-SUM(' + grantsStartCell + ':' + grantsEndCell + '), "")';
  }

  /**
   * Builds the Out-of-Pocket Cost formula.
   * @param {string} netPriceCell - Net price after aid cell reference
   * @param {string} outsideScholarshipsCell - Outside scholarships cell reference
   * @returns {string} Spreadsheet formula
   */
  function outOfPocketCost(netPriceCell, outsideScholarshipsCell) {
    return '=IFERROR(' + netPriceCell + '-' + outsideScholarshipsCell + ', "")';
  }

  /**
   * Builds the four-year projected cost formula.
   * @param {string} outOfPocketCell - Out-of-pocket cost cell reference
   * @returns {string} Spreadsheet formula
   */
  function fourYearProjectedCost(outOfPocketCell) {
    return '=IFERROR(' + outOfPocketCell + '*(1+1.03+1.03^2+1.03^3), "")';
  }

  /**
   * Builds the Reach/Match/Likely band expression for one test type.
   * Base band comes from the student score's position in the school's
   * 25th–75th percentile range (below 25th = Reach, inside = Match,
   * at/above 75th = Likely). GPA adjusts by at most one notch
   * (>= 3.9 up, < 3.2 down). Schools with sub-15% acceptance are always
   * Reach — no score makes a single-digit-admit school predictable.
   * @param {string} scoreRange - Named range of the student score (SAT_Score/ACT_Score)
   * @param {string} p25Cell - School 25th percentile cell reference
   * @param {string} p75Cell - School 75th percentile cell reference
   * @param {string} acceptanceCell - Acceptance rate cell reference
   * @returns {string} Formula fragment producing "Reach"/"Match"/"Likely"
   * @private
   */
  function fitBand(scoreRange, p25Cell, p75Cell, acceptanceCell) {
    var base = 'IF(' + scoreRange + '>=' + p75Cell + ',2,IF(' +
      scoreRange + '>=' + p25Cell + ',1,0))';
    var gpaAdjust = 'IF(N(GPA)>=3.9,1,IF(AND(N(GPA)>0,N(GPA)<3.2),-1,0))';
    return 'IF(AND(N(' + acceptanceCell + ')>0,N(' + acceptanceCell + ')<0.15),"Reach",' +
      'CHOOSE(MIN(2,MAX(0,' + base + '+' + gpaAdjust + '))+1,"Reach","Match","Likely"))';
  }

  /**
   * Builds the Admission Fit formula: a single honest Reach/Match/Likely
   * category from the student's SAT (or ACT when no SAT) against the
   * school's test-score bands, with a one-notch GPA adjustment.
   * Depends on the SAT_Score, ACT_Score, and GPA named ranges.
   * @param {Object} refs - Cell references
   * @param {string} refs.sat25 - SAT 25th percentile cell
   * @param {string} refs.sat75 - SAT 75th percentile cell
   * @param {string} refs.act25 - ACT 25th percentile cell
   * @param {string} refs.act75 - ACT 75th percentile cell
   * @param {string} refs.acceptance - Acceptance rate cell
   * @returns {string} Spreadsheet formula
   */
  function admissionFit(refs) {
    return '=IF(AND(N(SAT_Score)=0,N(ACT_Score)=0),"Enter SAT/ACT",' +
      'IF(AND(N(SAT_Score)>0,N(' + refs.sat25 + ')>0,N(' + refs.sat75 + ')>0),' +
      fitBand('SAT_Score', refs.sat25, refs.sat75, refs.acceptance) + ',' +
      'IF(AND(N(ACT_Score)>0,N(' + refs.act25 + ')>0,N(' + refs.act75 + ')>0),' +
      fitBand('ACT_Score', refs.act25, refs.act75, refs.acceptance) + ',' +
      '"Test Optional")))';
  }

  return {
    sheetRef: sheetRef,
    netPriceAfterAid: netPriceAfterAid,
    outOfPocketCost: outOfPocketCost,
    fourYearProjectedCost: fourYearProjectedCost,
    admissionFit: admissionFit,
  };
})();
