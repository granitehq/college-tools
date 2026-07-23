/**
 * Shared execution budget helper
 * @version 2.6.6
 * @author College Tools
 * @description Keeps long-running workflows under Apps Script execution limits
 */

/**
 * CollegeTools.ExecutionBudget - Shared execution budget module
 * Provides a small clock-backed budget object for batch operations and API calls.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.ExecutionBudget = (function() {
  'use strict';

  /**
   * Returns the current timestamp in milliseconds.
   * @returns {number} Milliseconds since epoch
   * @private
   */
  function defaultNow_() {
    return new Date().getTime();
  }

  /**
   * Starts a new execution budget.
   * @param {number=} limitMs - Maximum allowed elapsed time
   * @param {Function=} nowFn - Optional test clock
   * @returns {{canContinue: Function, elapsedMs: Function, limitMs: number}} Budget object
   */
  function start(limitMs, nowFn) {
    var limit = limitMs || CollegeTools.Config.API_CONFIG.EXECUTION_TIME_LIMIT;
    var clock = nowFn || defaultNow_;
    var startedAt = clock();

    return {
      limitMs: limit,
      elapsedMs: function() {
        return clock() - startedAt;
      },
      canContinue: function() {
        return (clock() - startedAt) < limit;
      },
    };
  }

  return {
    start: start,
  };
})();
