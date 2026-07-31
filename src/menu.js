/**
 * Menu system and global adapters
 * @version 2.7.0
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
      .addItem('Search College Names', 'searchCollegeNames')
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('✅ Task Management')
        .addItem('Setup Task Management', 'setupTaskManagement')
        .addItem('Preview Task Plan Changes', 'previewTaskPlan')
        .addItem('Generate / Regenerate Task Plan', 'generateTaskPlan')
        .addSeparator()
        .addItem('Refresh This Week', 'refreshTaskViews')
        .addItem('Sync Completion From Trackers', 'syncTaskCompletion')
        .addItem('Repair Task Management', 'repairTaskManagement')))
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

/**
 * Keeps dependent travel estimates current when profile travel inputs change.
 * Must remain global so Google Sheets can invoke the simple trigger.
 * @param {Object} e - Apps Script edit event
 */
function onEdit(e) {
  var travelResult = null;
  if (CollegeTools.Travel && CollegeTools.Travel.handleProfileEdit) {
    travelResult = CollegeTools.Travel.handleProfileEdit(e);
  }
  if (CollegeTools.TaskManagement && CollegeTools.TaskManagement.handleEdit) {
    return CollegeTools.TaskManagement.handleEdit(e) || travelResult;
  }
  return travelResult;
}

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
function setupTaskManagement() {
  var result = CollegeTools.TaskManagement.setupTaskManagement();
  SpreadsheetApp.getUi().alert(
    'Task Management Ready',
    'Configure the Task Settings tab, then preview or generate the task plan.\n\n' +
      'Validated templates: ' + (result.templateCount || 0),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
  return result;
}
function previewTaskPlan() {
  var result = CollegeTools.TaskManagement.previewTaskPlan();
  if (!result.ok) {
    SpreadsheetApp.getUi().alert(
      'Task Plan Needs Configuration',
      (result.errors || [result.message || 'Unable to build preview']).join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK,
    );
    return result;
  }
  var preview = result.preview || {};
  SpreadsheetApp.getUi().alert(
    'Task Plan Preview',
    'Generated instances: ' + result.generatedCount + '\n' +
      'Add: ' + (preview.add || 0) + '\n' +
      'Update: ' + (preview.update || 0) + '\n' +
      'Reassign: ' + (preview.reassign || 0) + '\n' +
      'Reschedule: ' + (preview.reschedule || 0) + '\n' +
      'Dependency changes: ' + (preview.dependencyChanges || 0) + '\n' +
      'Effort changes: ' + (preview.effortChanges || 0) + '\n' +
      'Archive: ' + (preview.archive || 0) + '\n' +
      'Completed tasks preserved: ' + (preview.preserveComplete || 0) + '\n\n' +
      'No task rows were changed.',
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
  return result;
}
function generateTaskPlan() {
  var result = CollegeTools.TaskManagement.generateTaskPlan();
  SpreadsheetApp.getUi().alert(
    result.ok ? 'Task Plan Generated' : 'Task Plan Needs Configuration',
    result.ok ?
      'Tasks in plan: ' + result.taskCount + '\n' +
        'Current actions: ' + result.currentActions + '\n' +
        'Tracker-confirmed completions: ' + result.evidenceCompletions :
      (result.errors || [result.message || 'Unable to generate task plan']).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
  return result;
}
function refreshTaskViews() {
  var result = CollegeTools.TaskManagement.refreshTaskViews();
  SpreadsheetApp.getUi().alert(
    'Task Views Refreshed',
    'Current actions: ' + (result.currentActions || 0) + '\n' +
      'Rolling 90-day tasks: ' + (result.rolling90 || 0),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
  return result;
}
function syncTaskCompletion() {
  var result = CollegeTools.TaskManagement.syncTaskCompletion();
  SpreadsheetApp.getUi().alert(
    'Task Completion Synchronized',
    'Confirmed completions: ' + result.completed + '\n' +
      'Items needing manual confirmation: ' + result.suggestions.length,
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
  return result;
}
function repairTaskManagement() {
  var result = CollegeTools.TaskManagement.repairTaskManagement();
  SpreadsheetApp.getUi().alert(
    'Task Management Repaired',
    'Templates verified: ' + result.templateCount + '\n' +
      'Tracker-confirmed completions: ' + result.evidenceCompletions,
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
  return result;
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
