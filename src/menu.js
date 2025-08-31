/**
 * Menu system and global adapters
 * @version 5.6.2
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
function fillCollegeRow() {
  return CollegeTools.Colleges.fillCollegeRow();
}

function fillSelectedRows() {
  return CollegeTools.Colleges.fillSelectedRows();
}

function showVersion() {
  return CollegeTools.Colleges.showVersion();
}

function setupAllTrackers() {
  return CollegeTools.Trackers.setupAllTrackers();
}

function enhanceFormatsDropdowns() {
  return CollegeTools.Formatting.enhanceFormatsDropdowns();
}

function ensureScoring() {
  return CollegeTools.Scoring.ensureScoring();
}

function searchCollegeNames() {
  return CollegeTools.Lookup.searchCollegeNames();
}

function fillRegionsAllRows() {
  return CollegeTools.Colleges.fillRegionsAllRows();
}

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

function clearApiCache() {
  return CollegeTools.Scorecard.clearCache();
}
