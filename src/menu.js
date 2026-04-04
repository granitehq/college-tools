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
      .addItem('Repair Validations & Dropdowns', 'repairValidationsAndFormatting')
      .addItem('Repair College Sync Across Tabs', 'repairCollegeSync')
      .addItem('Repair Entire Workbook', 'repairEntireWorkbook')
      .addItem('Fill Regions (all rows)', 'fillRegionsAllRows'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🛠️ Developer & Debug')
      .addItem('📋 Complete Setup (Re-run)', 'completeSetup')
      .addItem('DEBUG: Fill row (verbose)', 'debugFillCollegeRow')
      .addItem('Clear API Cache', 'clearApiCache'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('ℹ️ About')
      .addItem('Show version', 'showVersion'))
    .addToUi();
}

/* ======================= ADAPTER FUNCTIONS ======================= */
/* eslint-disable require-jsdoc, no-implicit-globals */
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
} // eslint-disable-line no-unused-vars, no-implicit-globals
function searchCollegeNames() {
  return CollegeTools.Lookup.searchCollegeNames();
}
function fillRegionsAllRows() {
  return CollegeTools.Colleges.fillRegionsAllRows();
}
function repairCollegeSync() {
  return CollegeTools.Trackers.repairCollegeSync();
} // eslint-disable-line no-unused-vars, no-implicit-globals
function repairEntireWorkbook() {
  return CollegeTools.Setup.repairEntireWorkbook();
} // eslint-disable-line no-unused-vars, no-implicit-globals
function clearApiCache() {
  return CollegeTools.Scorecard.clearCache();
}
function completeSetup() {
  return CollegeTools.Setup.completeSetup();
} // eslint-disable-line no-unused-vars, no-implicit-globals
function optimizePerformance() {
  return CollegeTools.Setup.optimizePerformance();
} // eslint-disable-line no-unused-vars, no-implicit-globals
function createInstructionsSheet() {
  return CollegeTools.Instructions.createInstructionsSheet();
} // eslint-disable-line no-unused-vars, no-implicit-globals
function quickStart() {
  return CollegeTools.Setup.quickStart();
} // eslint-disable-line no-unused-vars, no-implicit-globals
/* eslint-enable require-jsdoc, no-implicit-globals */
