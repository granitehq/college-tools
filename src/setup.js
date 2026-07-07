/**
 * One-time setup and optimization
 * @version 2.6.5
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
   * Builds a standard service result.
   * @param {boolean} ok - Whether the operation succeeded
   * @param {string} code - Stable machine-readable result code
   * @param {string} message - Human-readable summary
   * @param {Array=} warnings - Warning messages
   * @param {Object=} details - Additional result details
   * @returns {Object} Standard service result
   * @private
   */
  function result_(ok, code, message, warnings, details) {
    return {
      ok: ok,
      code: code,
      message: message,
      warnings: warnings || [],
      details: details || {},
    };
  }

  /**
   * Normalizes existing simple service return values into a result object.
   * @param {*} value - Service return value
   * @param {Object} step - Step descriptor
   * @returns {Object} Standard service result
   * @private
   */
  function normalizeStepResult_(value, step) {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ok')) {
      return result_(
        value.ok !== false,
        value.code || (value.ok === false ? step.id + '_failed' : step.id + '_complete'),
        value.message || value.reason || step.label + ' complete',
        value.warnings || [],
        value,
      );
    }
    return result_(true, step.id + '_complete', step.label + ' complete', [], {value: value});
  }

  /**
   * Runs setup/repair steps and aggregates required failures and optional warnings.
   * @param {Array<Object>} steps - Step descriptors to run
   * @returns {Object} Aggregate service result
   * @private
   */
  function runSetupSteps_(steps) {
    var details = [];
    var warnings = [];
    var ok = true;

    steps.forEach(function(step) {
      var stepResult;
      try {
        stepResult = normalizeStepResult_(step.run(), step);
      } catch (error) {
        stepResult = result_(false, step.id + '_error', error.toString(), [], {error: error.toString()});
      }

      stepResult.id = step.id;
      stepResult.label = step.label;
      stepResult.required = step.required !== false;
      details.push(stepResult);

      if (!stepResult.ok) {
        if (step.required === false) {
          warnings.push(step.label + ': ' + stepResult.message);
        } else {
          ok = false;
        }
      }
      if (stepResult.warnings && stepResult.warnings.length) {
        warnings = warnings.concat(stepResult.warnings);
      }
    });

    return result_(
      ok,
      ok ? 'steps_complete' : 'steps_failed',
      ok ? 'Steps complete' : 'One or more required steps failed',
      warnings,
      {steps: details},
    );
  }

  /**
   * Builds the declarative setup and repair step registry.
   * @returns {Array<Object>} Step descriptors
   */
  function getSetupStepDescriptors() {
    return [
      {
        id: 'instructions',
        label: 'Instructions sheet',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          CollegeTools.Instructions.createInstructionsSheet();
        },
      },
      {
        id: 'trackers',
        label: 'Tracker setup',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          return CollegeTools.Trackers.setupAllTrackers({suppressAlert: true});
        },
      },
      {
        id: 'dashboard',
        label: 'Dashboard setup',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          return CollegeTools.Dashboard.setupDashboard({suppressAlert: true});
        },
      },
      {
        id: 'formatting',
        label: 'Formatting and dropdowns',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          return CollegeTools.Formatting.enhanceFormatsDropdowns({suppressAlert: true});
        },
      },
      {
        id: 'scoring',
        label: 'Scoring formulas',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          return CollegeTools.Scoring.ensureScoring({suppressAlert: true});
        },
      },
      {
        id: 'financial-profile',
        label: 'Financial profile setup',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          CollegeTools.Financial.runFinancialSetup_();
        },
      },
      {
        id: 'travel-planner',
        label: 'Travel Planner refresh',
        required: false,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
            return CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
          }
          return result_(true, 'travel_planner_skipped', 'Travel Planner module not available');
        },
      },
      {
        id: 'trim-sheets',
        label: 'Row trimming',
        required: true,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          return CollegeTools.Utils.trimAllSheets({suppressAlert: true});
        },
      },
      {
        id: 'registration',
        label: 'Copy registration',
        required: false,
        includeInCompleteSetup: true,
        includeInRepair: false,
        run: function() {
          if (CollegeTools.Registration && CollegeTools.Registration.registerIfNeeded) {
            return CollegeTools.Registration.registerIfNeeded();
          }
          return result_(true, 'registration_skipped', 'Registration module not available');
        },
      },
      {
        id: 'tracker-sync',
        label: 'Tracker sync',
        required: true,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          return CollegeTools.Trackers.repairCollegeSync({suppressAlert: true});
        },
      },
      {
        id: 'validation-formatting',
        label: 'Validation and formatting repair',
        required: true,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          return CollegeTools.Formatting.repairValidationsAndFormatting({suppressAlert: true});
        },
      },
      {
        id: 'regions',
        label: 'Region refresh',
        required: true,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          return CollegeTools.Colleges.fillRegionsAllRows({suppressAlert: true});
        },
      },
      {
        id: 'travel-planner',
        label: 'Travel Planner refresh',
        required: false,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
            return CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
          }
          return result_(true, 'travel_planner_skipped', 'Travel Planner module not available');
        },
      },
      {
        id: 'scoring',
        label: 'Scoring formulas',
        required: true,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          return CollegeTools.Scoring.ensureScoring({suppressAlert: true});
        },
      },
      {
        id: 'timeline-formatting',
        label: 'Application timeline formatting',
        required: false,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          var timelineSheet = SpreadsheetApp.getActive().getSheetByName(
            CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
          if (timelineSheet) {
            CollegeTools.Trackers.enhanceApplicationTimelineFormatting(timelineSheet);
          }
        },
      },
      {
        id: 'dashboard-refresh',
        label: 'Dashboard refresh',
        required: false,
        includeInCompleteSetup: false,
        includeInRepair: true,
        run: function() {
          if (SpreadsheetApp.getActive().getSheetByName(CollegeTools.Config.SHEET_NAMES.DASHBOARD)) {
            return CollegeTools.Dashboard.refreshDashboard({suppressAlert: true});
          }
          return result_(true, 'dashboard_refresh_skipped', 'Dashboard sheet not present');
        },
      },
    ];
  }

  /**
   * Selects registry steps by flow flag.
   * @param {string} flag - includeInCompleteSetup or includeInRepair
   * @returns {Array<Object>} Matching descriptors
   * @private
   */
  function stepsFor_(flag) {
    return getSetupStepDescriptors().filter(function(step) {
      return !!step[flag];
    });
  }

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
      var setupResult = runSetupSteps_(stepsFor_('includeInCompleteSetup'));

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

      if (setupResult.warnings.length) {
        setupMessage += '\n\nRegistration warning: ' + setupResult.warnings.join('\n');
      }

      ui.alert(
        setupResult.ok ? 'Setup Complete! ✅' : 'Setup Error',
        setupMessage,
        ui.ButtonSet.OK,
      );
      return setupResult;
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
      '• Refreshing Travel Planner estimates\n' +
      '• Refreshing dashboard data when present\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO,
    );

    if (result !== ui.Button.YES) return;

    try {
      var repairResult = runSetupSteps_(stepsFor_('includeInRepair'));
      var detailById = {};
      repairResult.details.steps.forEach(function(step) {
        detailById[step.id] = step.details || {};
      });

      ui.alert(
        'Workbook Repair Complete',
        'Tracker rows updated: ' + (detailById['tracker-sync'].count || 0) + '\n' +
        'Formatted sheets repaired: ' + ((detailById['validation-formatting'].sectionsApplied || []).length) + '\n' +
        'Regions refreshed: ' + (detailById.regions.count || 0) + '\n' +
        'Travel rows refreshed: ' + (detailById['travel-planner'].count || 0) + '\n\n' +
        'This is safe to run again if needed.',
        ui.ButtonSet.OK,
      );

      return {
        ok: repairResult.ok,
        trackerRows: detailById['tracker-sync'].count || 0,
        formattedSheets: (detailById['validation-formatting'].sectionsApplied || []).length,
        regionRows: detailById.regions.count || 0,
        travelRows: detailById['travel-planner'].count || 0,
        warnings: repairResult.warnings,
        details: repairResult.details,
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
    getSetupStepDescriptors: getSetupStepDescriptors,
    runSetupSteps_: runSetupSteps_,
  };
})();
