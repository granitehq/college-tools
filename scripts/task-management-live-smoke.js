/**
 * Temporary copied-workbook smoke runner for adaptive task management.
 *
 * Copy this file beside the Apps Script sources in a disposable bound
 * spreadsheet project. It is intentionally outside src/ so production pushes
 * do not include it.
 */

/* global CollegeTools, SpreadsheetApp */

/**
 * Runs one live Google Sheets scenario in a disposable bound spreadsheet.
 * @param {string} mode - "long-horizon" or "athlete-90-day"
 * @returns {Object} Structured smoke-test evidence
 */
function runTaskManagementLiveSmoke(mode) {
  var ss = SpreadsheetApp.getActive();
  var names = CollegeTools.Config.SHEET_NAMES;
  var headers = CollegeTools.Config.HEADERS;
  var isAthlete = mode === 'athlete-90-day';
  var today = new Date();
  today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var deadline = new Date(today.getTime() + (isAthlete ? 90 : 500) * 24 * 60 * 60 * 1000);

  /**
   * Rebuilds one base sheet for the disposable scenario.
   * @param {string} name - Sheet name
   * @param {Array<string>} sheetHeaders - Headers
   * @param {number} headerRow - Header row
   * @returns {Sheet} Sheet
   */
  function resetSheet(name, sheetHeaders, headerRow) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    sheet.getRange(headerRow, 1, 1, sheetHeaders.length).setValues([sheetHeaders]);
    return sheet;
  }

  /**
   * Resolves a header column.
   * @param {Sheet} sheet - Sheet
   * @param {string} label - Header
   * @param {number} headerRow - Header row
   * @returns {number} 1-based column
   */
  function column(sheet, label, headerRow) {
    var values = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    return values.indexOf(label) + 1;
  }

  /**
   * Sets a Task Settings value.
   * @param {string} label - Setting
   * @param {*} value - Value
   */
  function setSetting(label, value) {
    var settings = ss.getSheetByName(names.TASK_SETTINGS);
    var values = settings.getRange(2, 1, settings.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] === label) {
        settings.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
    throw new Error('Missing task setting: ' + label);
  }

  var colleges = resetSheet(names.COLLEGES, headers.COLLEGES, 2);
  resetSheet(names.FINANCIAL_AID, headers.FINANCIAL_AID, 1);
  resetSheet(names.CAMPUS_VISIT, headers.CAMPUS_VISIT, 1);
  var timeline = resetSheet(names.APPLICATION_TIMELINE, headers.APPLICATION_TIMELINE, 1);
  resetSheet(names.STATUS_TRACKER, headers.STATUS_TRACKER, 1);
  resetSheet(names.SCHOLARSHIP_TRACKER, headers.SCHOLARSHIP_TRACKER, 1);

  var collegeName = isAthlete ? 'Live Athlete University' : 'Live Long Horizon University';
  colleges.getRange(3, column(colleges, 'College Name', 2)).setValue(collegeName);
  timeline.getRange(2, column(timeline, 'College Name', 1)).setValue(collegeName);
  timeline.getRange(2, column(timeline, 'Application Type (ED/ED2/EA/REA/RD)', 1))
    .setValue('EA');
  timeline.getRange(2, column(timeline, 'Application Deadline', 1)).setValue(deadline);
  timeline.getRange(2, column(timeline, 'Supplemental Essays Required (#)', 1))
    .setValue(isAthlete ? 2 : 1);
  timeline.getRange(2, column(timeline, 'Supplemental Prompts / Topics', 1))
    .setValue(isAthlete ?
      'Why this college?||Describe your community' : 'Why this college?');

  var setup = CollegeTools.TaskManagement.setupTaskManagement();
  setSetting('Planning Start Date', today);
  setSetting('Working First Application Deadline', deadline);
  setSetting('Expected Graduation Year', deadline.getFullYear() + 1);
  setSetting('Athletic Recruiting Enabled', isAthlete ? 'Yes' : 'No');
  setSetting('Parent Effort Multiplier', 2);
  var generated = CollegeTools.TaskManagement.generateTaskPlan();

  if (isAthlete) {
    var recruiting = ss.getSheetByName(names.RECRUITING_TRACKER);
    var collegeId = colleges.getRange(3, column(colleges, 'College ID', 2)).getValue();
    recruiting.getRange(2, column(recruiting, 'College ID', 1)).setValue(collegeId);
    recruiting.getRange(2, column(recruiting, 'College Name', 1)).setValue(collegeName);
    recruiting.getRange(2, column(recruiting, 'Coach/Contact Name', 1)).setValue('Live Coach');
    recruiting.getRange(2, column(recruiting, 'Next Follow-Up', 1))
      .setValue(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
    generated = CollegeTools.TaskManagement.generateTaskPlan();
  }

  var tasksSheet = ss.getSheetByName(names.TASKS);
  var taskIdColumn = column(tasksSheet, 'Task ID', 1);
  var taskColumn = column(tasksSheet, 'Task', 1);
  var workstreamColumn = column(tasksSheet, 'Workstream', 1);
  var moduleColumn = column(tasksSheet, 'Module', 1);
  var ownerColumn = column(tasksSheet, 'Owner', 1);
  var dueDateColumn = column(tasksSheet, 'Due Date', 1);
  var effortOverrideColumn = column(tasksSheet, 'Effort Override (min)', 1);
  var statusColumn = column(tasksSheet, 'Status', 1);
  var notesColumn = column(tasksSheet, 'Notes', 1);
  var ownerLockedColumn = column(tasksSheet, 'Owner Locked', 1);
  var manuallySelectedColumn = column(tasksSheet, 'Manually Selected', 1);
  var customTaskRow = tasksSheet.getLastRow() + 1;
  tasksSheet.getRange(customTaskRow, workstreamColumn).setValue('Family Logistics');
  tasksSheet.getRange(customTaskRow, moduleColumn).setValue('Family Custom');
  tasksSheet.getRange(customTaskRow, ownerColumn).setValue('Grandparent');
  tasksSheet.getRange(customTaskRow, dueDateColumn).setValue(today);
  tasksSheet.getRange(customTaskRow, effortOverrideColumn).setValue(90);
  tasksSheet.getRange(customTaskRow, notesColumn).setValue('Live custom task note');
  tasksSheet.getRange(customTaskRow, manuallySelectedColumn).setValue('Yes');
  CollegeTools.TaskManagement.handleEdit({
    range: ss.getSheetByName(names.FINANCIAL_AID).getRange(2, 1),
  });
  customTaskRow = 0;
  for (var customRow = 2; customRow <= tasksSheet.getLastRow(); customRow++) {
    if (tasksSheet.getRange(customRow, notesColumn).getValue() === 'Live custom task note') {
      customTaskRow = customRow;
      break;
    }
  }
  var partialCustomTaskId = customTaskRow ?
    tasksSheet.getRange(customTaskRow, taskIdColumn).getValue() : '';
  if (!customTaskRow) throw new Error('Partially entered custom task was not preserved');
  tasksSheet.getRange(customTaskRow, taskColumn).setValue('Live family-defined task');
  CollegeTools.TaskManagement.refreshTaskViews();
  var customTaskId = tasksSheet.getRange(customTaskRow, taskIdColumn).getValue();
  var preservedTaskId = tasksSheet.getRange(2, taskIdColumn).getValue();
  var customColumn = tasksSheet.getLastColumn() + 1;
  tasksSheet.getRange(1, customColumn).setValue('Live Custom Formula');
  tasksSheet.getRange(2, statusColumn).setValue('Complete');
  tasksSheet.getRange(2, notesColumn).setValue('Live preservation evidence');
  tasksSheet.getRange(2, ownerLockedColumn).setValue('Yes');
  tasksSheet.getRange(2, customColumn).setFormula('="preserved"');
  tasksSheet.getRange(2, 1, tasksSheet.getLastRow() - 1, tasksSheet.getLastColumn())
    .sort({column: column(tasksSheet, 'Due Date', 1), ascending: false});
  var regenerated = CollegeTools.TaskManagement.generateTaskPlan();

  var tasks = CollegeTools.TaskManagement.readTasks();
  var taskIds = {};
  var duplicateIds = [];
  var preserved = null;
  var customTask = null;
  tasks.forEach(function(task) {
    if (taskIds[task.taskId]) duplicateIds.push(task.taskId);
    taskIds[task.taskId] = true;
    if (task.taskId === preservedTaskId) preserved = task;
    if (task.taskId === customTaskId) customTask = task;
  });
  var preservedRow = 0;
  for (var row = 2; row <= tasksSheet.getLastRow(); row++) {
    if (tasksSheet.getRange(row, taskIdColumn).getValue() === preservedTaskId) {
      preservedRow = row;
      break;
    }
  }
  var submission = tasks.filter(function(task) {
    return task.templateId === 'SUB-03';
  })[0];
  var recruitingTasks = tasks.filter(function(task) {
    return task.module === 'Athletic Recruiting' && !task.archivedReason;
  });
  var supplementalDrafts = tasks.filter(function(task) {
    return task.templateId === 'ESS-08' && !task.archivedReason;
  });
  var plannedWeeks = {};
  var currentWeekKey = CollegeTools.TaskPlanner.dateKey(
    CollegeTools.TaskPlanner.startOfWeek(today));
  var currentWeekCount = 0;
  tasks.forEach(function(task) {
    var weekKey = CollegeTools.TaskPlanner.dateKey(task.plannedWeek);
    if (weekKey) plannedWeeks[weekKey] = true;
    if (weekKey === currentWeekKey) currentWeekCount++;
  });
  var thisWeek = ss.getSheetByName(names.THIS_WEEK);
  var thisWeekIds = thisWeek.getRange(
    2, 1, Math.min(10, Math.max(1, thisWeek.getLastRow() - 1)), 1).getValues()
    .map(function(rowValue) {
      return rowValue[0];
    });
  var checks = {
    setupValidated100Templates: setup.templateCount === 100,
    generatedTasks: generated.ok && regenerated.ok && tasks.length > 0,
    uniqueTaskIds: duplicateIds.length === 0,
    collegesHeaderOnRow2: colleges.getRange(2, 1).getValue() === 'College Name',
    collegesDataOnRow3: colleges.getRange(3, 1).getValue() === collegeName,
    stableCollegeIdOnRow3: !!colleges.getRange(3, column(colleges, 'College ID', 2)).getValue(),
    thisWeekGenerated: !!ss.getSheetByName(names.THIS_WEEK),
    customTaskStableAndVisible: /^MANUAL::/.test(customTaskId) && !!customTask &&
      customTaskId === partialCustomTaskId &&
      customTask.module === 'Family Custom' &&
      customTask.notes === 'Live custom task note' &&
      thisWeekIds.indexOf(customTaskId) !== -1,
    tasksFilteredAndBounded: !!tasksSheet.getFilter() &&
      tasksSheet.getMaxRows() >= tasks.length + 1 &&
      tasksSheet.getMaxRows() <= Math.max(200, tasks.length + 51),
    completedTaskPreserved: !!preserved && preserved.status === 'Complete' &&
      preserved.notes === 'Live preservation evidence',
    customFormulaPreserved: preservedRow > 0 &&
      tasksSheet.getRange(preservedRow, column(tasksSheet, 'Live Custom Formula', 1))
        .getFormula() === '="preserved"',
    submissionUsesDeadline: !!submission &&
      submission.dueDate.getTime() === deadline.getTime(),
    scheduleContractExposed: !!submission && !!submission.applicabilityRule &&
      !!submission.scheduleRule && !!submission.scheduleAnchor &&
      !!submission.anchorDate && !!submission.offsetWindow &&
      !!submission.calculatedDate && !!submission.effectiveDate,
    supplementalPromptsScoped: supplementalDrafts.length === (isAthlete ? 2 : 1),
    adaptiveHorizonUsable: isAthlete ?
      Object.keys(plannedWeeks).length >= 8 && currentWeekCount < tasks.length / 2 :
      submission.dueDate > new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) &&
        thisWeekIds.indexOf(submission.taskId) === -1,
    recruitingConditional: isAthlete ?
      recruitingTasks.length > 0 && !!ss.getSheetByName(names.RECRUITING_TRACKER) :
      recruitingTasks.length === 0 && !ss.getSheetByName(names.RECRUITING_TRACKER),
  };
  var failed = Object.keys(checks).filter(function(key) {
    return !checks[key];
  });
  return {
    ok: failed.length === 0,
    mode: mode,
    taskCount: tasks.length,
    failedChecks: failed,
    checks: checks,
  };
}
