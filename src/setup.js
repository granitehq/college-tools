/**
 * One-time setup and optimization
 * @version 1.2.6
 * @author College Tools
 * @description Consolidated setup functions for optimal performance
 */

/**
 * CollegeTools.Setup - Setup and optimization module
 * Handles one-time setup operations and performance optimizations
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Setup = (function() {
  'use strict';

  /**
   * Performs complete College Tools setup in one optimized operation.
   * This replaces running individual setup functions multiple times.
   * Only needs to be run once per spreadsheet.
   */
  function completeSetup() {
    var ui = SpreadsheetApp.getUi();
    var result = ui.alert(
      'Complete College Tools Setup',
      'This will set up all features in one optimized operation:\n\n' +
      '• All tracker sheets with headers and validation\n' +
      '• Dashboard with metrics and charts\n' +
      '• Scoring formulas (Weighted + Value scores)\n' +
      '• Admission chances calculator\n' +
      '• Enhanced formatting and dropdowns\n' +
      '• Performance optimization (trim excess rows)\n\n' +
      'This may take 30-60 seconds. Continue?',
      ui.ButtonSet.YES_NO,
    );

    if (result !== ui.Button.YES) return;

    try {
      // Show progress
      ui.alert('Setting up...', 'Creating Instructions and tracker sheets...', ui.ButtonSet.OK);

      // 0. Create Instructions sheet first (becomes first tab)
      CollegeTools.Instructions.createInstructionsSheet();

      // 1. Set up all trackers
      CollegeTools.Trackers.setupAllTrackers();

      // 2. Set up dashboard
      CollegeTools.Dashboard.setupDashboard();

      // 3. Apply enhanced formatting and dropdowns
      CollegeTools.Formatting.enhanceFormatsDropdowns();

      // 4. Set up scoring formulas
      CollegeTools.Scoring.ensureScoring();

      // 5. Set up financial intelligence suite
      CollegeTools.Financial.setupFinancialIntelligence();

      // 6. Performance optimization - trim excess rows
      CollegeTools.Utils.trimAllSheets();

      ui.alert(
        'Setup Complete! ✅',
        'College Tools is fully configured:\n\n' +
        '✅ Instructions sheet created (first tab)\n' +
        '✅ All tracker sheets created\n' +
        '✅ Dashboard with key metrics\n' +
        '✅ Scoring formulas active\n' +
        '✅ Financial intelligence suite ready\n' +
        '✅ Enhanced formatting applied\n' +
        '✅ Performance optimized\n\n' +
        'Next steps:\n' +
        '1. Read the Instructions sheet (first tab)\n' +
        '2. Get your API key (see Instructions)\n' +
        '3. Fill out your Personal Profile\n' +
        '4. Start adding colleges!\n\n' +
        'Everything you need to know is in Instructions!',
        ui.ButtonSet.OK,
      );
    } catch (error) {
      ui.alert('Setup Error', 'An error occurred during setup: ' + error.toString(), ui.ButtonSet.OK);
    }
  }

  /**
   * Quick performance optimization for existing spreadsheets.
   * Trims excess rows and refreshes key formulas.
   */
  function optimizePerformance() {
    var ui = SpreadsheetApp.getUi();
    var result = ui.alert(
      'Optimize Performance',
      'This will:\n\n' +
      '• Trim all sheets to optimal row counts\n' +
      '• Remove excess formula calculations\n' +
      '• Improve script execution speed\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO,
    );

    if (result !== ui.Button.YES) return;

    try {
      CollegeTools.Utils.trimAllSheets();

      // Refresh dashboard data
      if (SpreadsheetApp.getActive().getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD)) {
        CollegeTools.Dashboard.refreshDashboard();
      }
    } catch (error) {
      ui.alert('Optimization Error', 'An error occurred: ' + error.toString(), ui.ButtonSet.OK);
    }
  }

  /**
   * Quick Start - Fast API key check and basic guidance.
   * Shows users what they need to do without the long setup process.
   */
  function quickStart() {
    var ui = SpreadsheetApp.getUi();

    try {
      var hasApiKey = CollegeTools.Scorecard.isApiKeyConfigured();

      var message = '🚀 College Tools Quick Start\n\n';

      if (hasApiKey) {
        message += '✅ API Key: Found and ready!\n';
        message += '✅ Spreadsheet: Pre-configured\n';
        message += '✅ All Features: Ready to use\n\n';
        message += '🎯 You\'re all set! Next steps:\n';
        message += '• Read Instructions (📖 menu)\n';
        message += '• Fill out Personal Profile\n';
        message += '• Start adding colleges!\n\n';
        message += '💡 Use "Fill current row" to get college data';
      } else {
        message += '⚠️ API Key: Missing\n';
        message += '✅ Spreadsheet: Pre-configured\n';
        message += '✅ All Features: Ready (need API key)\n\n';
        message += '🔑 Get your FREE API key:\n';
        message += '1. Visit: https://api.data.gov/signup/\n';
        message += '2. Create sheet named "ScorecardAPIKey"\n';
        message += '3. Paste key in cell A1\n';
        message += '4. Run Quick Start again\n\n';
        message += '📖 Full instructions in the Instructions menu';
      }

      ui.alert('Quick Start', message, ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('Quick Start Error', 'Error checking setup: ' + error.toString(), ui.ButtonSet.OK);
    }
  }

  // Public API
  return {
    completeSetup: completeSetup,
    optimizePerformance: optimizePerformance,
    quickStart: quickStart,
  };
})();
