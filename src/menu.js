/**
 * Menu system and global adapters
 * @version 5.6.3
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
    .addItem('Fill current row', 'fillCollegeRow')
    .addItem('Fill selected rows', 'fillSelectedRows')
    .addSeparator()
    .addItem('Add/Update Trackers', 'setupAllTrackers')
    .addItem('Enhance: Formats & Dropdowns', 'enhanceFormatsDropdowns')
    .addItem('Ensure Scoring Formulas', 'ensureScoring')
    .addSeparator()
    .addItem('Search College Names', 'searchCollegeNames')
    .addItem('Fill Regions (all rows)', 'fillRegionsAllRows')
    .addSeparator()
    .addItem('Show API Quota Status', 'showQuotaStatus')
    .addItem('Clear API Cache', 'clearApiCache')
    .addItem('Show version', 'showVersion')
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
 * Fills multiple selected rows with college data.
 * @return {*} Result from batch fill operation
 */
function fillSelectedRows() {
  return CollegeTools.Colleges.fillSelectedRows();
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
 * Clears the API response cache.
 * @return {*} Result from cache clearing
 */
function clearApiCache() {
  return CollegeTools.Scorecard.clearCache();
}
