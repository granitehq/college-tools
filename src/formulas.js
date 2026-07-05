/**
 * Pure formula builders
 * @version 2.5.0
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

  return {
    sheetRef: sheetRef,
    netPriceAfterAid: netPriceAfterAid,
    outOfPocketCost: outOfPocketCost,
    fourYearProjectedCost: fourYearProjectedCost,
  };
})();
