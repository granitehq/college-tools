/**
 * Menu system and global adapters
 * @version 1.2.6
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
      .addItem('Fill current row (fast)', 'fillCollegeRowFast')
      .addItem('Fill selected rows', 'fillSelectedRows')
      .addSeparator()
      .addItem('Search College Names', 'searchCollegeNames'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🔧 Setup & Customization')
      .addItem('Add/Update Trackers', 'setupAllTrackers')
      .addItem('Setup Dashboard', 'setupDashboard')
      .addItem('Setup Financial Intelligence', 'setupFinancialIntelligence')
      .addItem('Ensure Scoring Formulas', 'ensureScoring')
      .addItem('Enhance: Formats & Dropdowns', 'enhanceFormatsDropdowns'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('⚡ Performance & Maintenance')
      .addItem('Optimize Performance', 'optimizePerformance')
      .addItem('Refresh Dashboard Data', 'refreshDashboard')
      .addItem('Fill Regions (all rows)', 'fillRegionsAllRows'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🛠️ Developer & Debug')
      .addItem('📋 Complete Setup (Re-run)', 'completeSetup')
      .addItem('DEBUG: Fill row (verbose)', 'debugFillCollegeRow')
      .addItem('Show API Quota Status', 'showQuotaStatus')
      .addItem('Clear API Cache', 'clearApiCache')
      .addItem('Test College Name Validation', 'testCollegeNameValidation'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('ℹ️ About')
      .addItem('Show version', 'showVersion'))
    .addToUi();
}

/* ======================= ADAPTER FUNCTIONS ======================= */
/**
 * Global adapter functions that forward to namespace modules.
 * These allow the menu to call functions by name without changing menu configuration.
 */

/**
 * Fills the currently selected row with college data.
 * @return {*} Result from college fill operation
 */
function fillCollegeRow() {
  return CollegeTools.Colleges.fillCollegeRow();
}

/**
 * Fast version of fillCollegeRow with optimizations for performance.
 * @returns {*} Result from fast fill operation
 */
function fillCollegeRowFast() {
  return CollegeTools.Colleges.fillCollegeRowFast();
}

/**
 * Fills multiple selected rows with college data.
 * @return {*} Result from batch fill operation
 */
function fillSelectedRows() {
  return CollegeTools.Colleges.fillSelectedRows();
}

/**
 * Debug version of fill operation that shows detailed diagnostic information.
 * @return {*} Result from debug fill operation
 */
function debugFillCollegeRow() {
  return CollegeTools.Colleges.debugFillCollegeRow();
}

/**
 * Shows the current version of College Tools.
 * @return {*} Result from version display
 */
function showVersion() {
  return CollegeTools.Colleges.showVersion();
}

/**
 * Sets up all tracker sheets with headers and formulas.
 * @return {*} Result from tracker setup
 */
function setupAllTrackers() {
  return CollegeTools.Trackers.setupAllTrackers();
}

/**
 * Creates the Dashboard sheet with key metrics and visualizations.
 * @return {*} Result from dashboard setup
 */
function setupDashboard() {
  return CollegeTools.Dashboard.setupDashboard();
}

/**
 * Refreshes all dashboard data and chart information.
 * @return {*} Result from dashboard refresh
 */
function refreshDashboard() {
  return CollegeTools.Dashboard.refreshDashboard();
}

/**
 * Applies formatting and dropdown validations to all sheets.
 * @return {*} Result from formatting operation
 */
function enhanceFormatsDropdowns() {
  return CollegeTools.Formatting.enhanceFormatsDropdowns();
}

/**
 * Ensures scoring formulas are present in the Colleges sheet.
 * @return {*} Result from scoring setup
 */
function ensureScoring() {
  return CollegeTools.Scoring.ensureScoring();
}

/**
 * Sets up the Financial Intelligence suite.
 * @return {*} Result from financial intelligence setup
 */
function setupFinancialIntelligence() { // eslint-disable-line no-unused-vars, no-implicit-globals
  return CollegeTools.Financial.setupFinancialIntelligence();
}

/**
 * Opens college name search dialog.
 * @return {*} Result from search operation
 */
function searchCollegeNames() {
  return CollegeTools.Lookup.searchCollegeNames();
}

/**
 * Fills region column for all rows based on state.
 * @return {*} Result from region fill operation
 */
function fillRegionsAllRows() {
  return CollegeTools.Colleges.fillRegionsAllRows();
}

/**
 * Shows API quota status in an alert dialog.
 * @return {void} No return value
 */
function showQuotaStatus() {
  var status = CollegeTools.Scorecard.getQuotaStatus();
  var message = 'API Quota Status:\\n\\n' +
    'Daily Usage: ' + status.dailyUsage + '/' + status.dailyLimit + '\\n' +
    'Remaining: ' + status.remaining + '\\n' +
    'Last Reset: ' + status.lastReset + '\\n\\n' +
    'Current Session:\\n' +
    'Execution Time: ' + Math.round(status.executionTimeElapsed / 1000) + 's';

  SpreadsheetApp.getUi().alert(message);
}

/**
 * Tests college name validation functionality.
 * @return {*} Result from validation test
 */
function testCollegeNameValidation() {
  return CollegeTools.Formatting.testCollegeNameValidation();
}

/**
 * Clears the API response cache.
 * @return {*} Result from cache clearing
 */
function clearApiCache() {
  return CollegeTools.Scorecard.clearCache();
}

/**
 * Runs complete College Tools setup in one optimized operation.
 * @return {*} Result from complete setup
 */
function completeSetup() { // eslint-disable-line no-unused-vars, no-implicit-globals
  return CollegeTools.Setup.completeSetup();
}

/**
 * Optimizes performance by trimming excess rows and refreshing formulas.
 * @return {*} Result from performance optimization
 */
function optimizePerformance() { // eslint-disable-line no-unused-vars, no-implicit-globals
  return CollegeTools.Setup.optimizePerformance();
}

/**
 * Creates the comprehensive Instructions sheet.
 * @return {*} Result from instructions sheet creation
 */
function createInstructionsSheet() { // eslint-disable-line no-unused-vars, no-implicit-globals
  return CollegeTools.Instructions.createInstructionsSheet();
}

/**
 * Quick Start - checks API key setup and gives guidance.
 * @return {*} Result from quick start operation
 */
function quickStart() { // eslint-disable-line no-unused-vars, no-implicit-globals
  return CollegeTools.Setup.quickStart();
}
