/**
 * Menu system and global adapters
 * @version 2.6.5
 * @author College Tools
 * @description Google Sheets menu setup and global adapter functions
 */

/* ======================= MENU ======================= */
/**
 * Creates the College Tools menu in Google Sheets when the spreadsheet is opened.
 * Sets up all menu items for college data management and tracking.
 * Must be global for Google Sheets to find it.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('College Tools')
    .addItem('📖 Instructions & Help', 'createInstructionsSheet')
    .addItem('🚀 Quick Start (API Key Check)', 'quickStart')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🎓 For Students & Parents')
      .addItem('Fill current row', 'fillCollegeRow')
      .addItem('Fill selected rows', 'fillSelectedRows')
      .addSeparator()
      .addItem('Search College Names', 'searchCollegeNames'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🛠️ Advanced / Setup')
      .addItem('Add/Update Trackers', 'setupAllTrackers')
      .addItem('Setup Dashboard', 'setupDashboard')
      .addItem('Setup Financial Intelligence', 'setupFinancialIntelligence')
      .addItem('Ensure Scoring Formulas', 'ensureScoring')
      .addItem('Enhance: Formats & Dropdowns', 'enhanceFormatsDropdowns')
      .addSeparator()
      .addItem('Optimize Performance', 'optimizePerformance')
      .addItem('Refresh Dashboard Data', 'refreshDashboard')
      .addItem('Refresh Travel Planner', 'refreshTravelPlanner')
      .addItem('Repair Validations & Dropdowns', 'repairValidationsAndFormatting')
      .addItem('Repair College Sync Across Tabs', 'repairCollegeSync')
      .addItem('Repair Entire Workbook', 'repairEntireWorkbook')
      .addItem('Fill Regions (all rows)', 'fillRegionsAllRows')
      .addSeparator()
      .addItem('📋 Complete Setup (Re-run)', 'completeSetup')
      .addItem('Register for Updates', 'registerCopyForUpdates')
      .addItem('DEBUG: Fill row (verbose)', 'debugFillCollegeRow')
      .addItem('Clear API Cache', 'clearApiCache'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('ℹ️ About')
      .addItem('Show version', 'showVersion'))
    .addToUi();
}

/* ======================= ADAPTER FUNCTIONS ======================= */
/* eslint-disable jsdoc/require-jsdoc, no-implicit-globals */
function fillCollegeRow() {
  return CollegeTools.Colleges.fillCollegeRow();
}
function fillSelectedRows() {
  return CollegeTools.Colleges.fillSelectedRows();
}
function debugFillCollegeRow() {
  return CollegeTools.Colleges.debugFillCollegeRow();
}
function showVersion() {
  return CollegeTools.Colleges.showVersion();
}
function setupAllTrackers() {
  return CollegeTools.Trackers.setupAllTrackers();
}
function setupDashboard() {
  return CollegeTools.Dashboard.setupDashboard();
}
function refreshDashboard() {
  return CollegeTools.Dashboard.refreshDashboard();
}
function refreshTravelPlanner() {
  return CollegeTools.Travel.createOrUpdateTravelPlanner();
}
function enhanceFormatsDropdowns() {
  return CollegeTools.Formatting.enhanceFormatsDropdowns();
}
function repairValidationsAndFormatting() {
  return CollegeTools.Formatting.repairValidationsAndFormatting();
}
function ensureScoring() {
  return CollegeTools.Scoring.ensureScoring();
}
function setupFinancialIntelligence() {
  return CollegeTools.Financial.setupFinancialIntelligence();
}
function searchCollegeNames() {
  return CollegeTools.Lookup.searchCollegeNames();
}
function fillRegionsAllRows() {
  return CollegeTools.Colleges.fillRegionsAllRows();
}
function repairCollegeSync() {
  return CollegeTools.Trackers.repairCollegeSync();
}
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

  var repairResult = CollegeTools.Setup.repairEntireWorkbook({suppressAlert: true});
  var details = repairResult && repairResult.details || {};
  var steps = details.steps || [];
  var detailById = {};
  steps.forEach(function(step) {
    detailById[step.id] = step.details || {};
  });

  ui.alert(
    repairResult && repairResult.ok ? 'Workbook Repair Complete' : 'Workbook Repair Incomplete',
    'Tracker rows updated: ' + (detailById['tracker-sync'] && detailById['tracker-sync'].count || 0) + '\n' +
    'Formatted sheets repaired: ' +
      ((detailById['validation-formatting'] && detailById['validation-formatting'].sectionsApplied || []).length) +
      '\n' +
    'Regions refreshed: ' + (detailById.regions && detailById.regions.count || 0) + '\n' +
    'Travel rows refreshed: ' + (detailById['travel-planner'] && detailById['travel-planner'].count || 0) +
      '\n\n' +
    'This is safe to run again if needed.',
    ui.ButtonSet.OK,
  );
  return repairResult;
}
function clearApiCache() {
  return CollegeTools.Scorecard.clearCache();
}
function completeSetup() {
  return CollegeTools.Setup.completeSetup();
}
function optimizePerformance() {
  return CollegeTools.Setup.optimizePerformance();
}
function createInstructionsSheet() {
  return CollegeTools.Instructions.createInstructionsSheet();
}
function quickStart() {
  return CollegeTools.Setup.quickStart();
}
function registerCopyForUpdates() {
  return CollegeTools.Registration.registerCurrentCopy();
}
/* eslint-enable jsdoc/require-jsdoc, no-implicit-globals */
