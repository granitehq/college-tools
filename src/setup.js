/**
 * One-time setup and optimization
 * @version 2.6.3
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

    // Disclose the copy registration phone-home, but only when an endpoint is
    // actually configured (blank in local/dev builds, so nothing is sent).
    var registrationConfig = CollegeTools.Config.REGISTRATION_CONFIG || {};
    var registrationNotice = registrationConfig.ENDPOINT_URL ?
      '• Registering this copy for updates — sends your email, spreadsheet ID,\n' +
      '  and spreadsheet URL to the College Tools update registry\n' : '';

    var result = ui.alert(
      'Complete College Tools Setup',
      'This will set up all features in one optimized operation:\n\n' +
      '• All tracker sheets with headers and validation\n' +
      '• Dashboard with key metrics\n' +
      '• Weighted Score formulas\n' +
      '• Admission Fit (Reach/Match/Likely) calculator\n' +
      '• Enhanced formatting and dropdowns\n' +
      '• Performance optimization (trim excess rows)\n' +
      registrationNotice + '\n' +
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

      // 5. Set up financial intelligence suite (no inner prompt — already confirmed above)
      CollegeTools.Financial.runFinancialSetup_();

      // 6. Performance optimization - trim excess rows
      CollegeTools.Utils.trimAllSheets();

      // 7. Register this copy from an authorized menu action when configured.
      var registrationResult = null;
      if (CollegeTools.Registration && CollegeTools.Registration.registerIfNeeded) {
        registrationResult = CollegeTools.Registration.registerIfNeeded();
      }

      var setupMessage = 'College Tools is fully configured:\n\n' +
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
        'Everything you need to know is in Instructions!';

      if (registrationResult && !registrationResult.ok) {
        setupMessage += '\n\nRegistration warning: ' + registrationResult.reason;
      }

      ui.alert(
        'Setup Complete! ✅',
        setupMessage,
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

      // Refresh dashboard data (suppress its own alert so this action reports once).
      var dashboardRefreshed = false;
      if (SpreadsheetApp.getActive().getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD)) {
        CollegeTools.Dashboard.refreshDashboard({suppressAlert: true});
        dashboardRefreshed = true;
      }

      ui.alert(
        'Performance Optimized',
        'Trimmed all sheets to optimal row counts.' +
        (dashboardRefreshed ? '\nDashboard data refreshed.' : ''),
        ui.ButtonSet.OK,
      );
    } catch (error) {
      ui.alert('Optimization Error', 'An error occurred: ' + error.toString(), ui.ButtonSet.OK);
    }
  }

  /**
   * Repairs the workbook by re-syncing colleges, reapplying validations/formatting,
   * refreshing derived regions, and refreshing the dashboard when present.
   * Safe to run on existing downloaded spreadsheets.
   * @return {Object|undefined} Repair summary
   */
  function repairEntireWorkbook() {
    var ui = SpreadsheetApp.getUi();
    var result = ui.alert(
      'Repair Entire Workbook',
      'This will repair the current spreadsheet by:\n\n' +
      '• Re-syncing tracker college lists from the Colleges tab\n' +
      '• Reapplying dropdowns and formatting\n' +
      '• Refilling Regions from State values\n' +
      '• Rebuilding scoring formulas (custom weights are kept)\n' +
      '• Refreshing dashboard data when present\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO,
    );

    if (result !== ui.Button.YES) return;

    try {
      var syncResult = CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});
      var formattingResult = CollegeTools.Formatting.repairValidationsAndFormatting({suppressAlert: true});
      var regionResult = CollegeTools.Colleges.fillRegionsAllRows({suppressAlert: true});

      // Rebuild scoring formulas so newly added colleges pick up
      // Weighted Score, not just pre-existing rows.
      CollegeTools.Scoring.ensureScoring({suppressAlert: true});

      var timelineSheet = SpreadsheetApp.getActive().getSheetByName(
        CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
      if (timelineSheet) {
        CollegeTools.Trackers.enhanceApplicationTimelineFormatting(timelineSheet);
      }

      if (SpreadsheetApp.getActive().getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD)) {
        CollegeTools.Dashboard.refreshDashboard();
      }

      ui.alert(
        'Workbook Repair Complete',
        'Tracker rows updated: ' + syncResult.count + '\n' +
        'Formatted sheets repaired: ' + formattingResult.sectionsApplied.length + '\n' +
        'Regions refreshed: ' + regionResult.count + '\n\n' +
        'This is safe to run again if needed.',
        ui.ButtonSet.OK,
      );

      return {
        ok: true,
        trackerRows: syncResult.count,
        formattedSheets: formattingResult.sectionsApplied.length,
        regionRows: regionResult.count,
      };
    } catch (error) {
      ui.alert('Repair Error', 'An error occurred during repair: ' + error.toString(), ui.ButtonSet.OK);
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
    repairEntireWorkbook: repairEntireWorkbook,
    quickStart: quickStart,
  };
})();
