/**
 * Spreadsheet integration for adaptive college task management
 * @version 2.7.0
 * @author College Tools
 * @description Creates, updates, and safely reconciles task-management sheets
 */

/**
 * CollegeTools.TaskManagement - Spreadsheet-facing task management service.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.TaskManagement = (function() {
  'use strict';

  var SETTINGS = [
    ['Planning Start Date', '', 'Date the family starts using the plan'],
    ['Working First Application Deadline', '', 'Fallback until school-specific dates are entered'],
    ['FAFSA Availability Date', '', 'Use the official date for the application cycle'],
    ['Current Grade', '', 'For example: 11 or 12'],
    ['Expected Graduation Year', '', 'Four-digit high-school graduation year'],
    ['Application Cycle', '', 'Optional label such as 2026-27'],
    ['Student Owner Name', '', 'Optional name replacing the Student role label'],
    ['Parent/Guardian Owner Name', '', 'Optional name replacing the Parent/Guardian role label'],
    ['Counselor/Professional Owner Name', '', 'One combined standard role; use custom owners if needed'],
    ['Counselor/Professional Participating', 'No', 'Yes reassigns professional-owned work to this role'],
    ['Custom Owners (comma separated)', '', 'Optional additional people such as School Counselor, Consultant'],
    ['Parent Effort Multiplier', 1, 'Applied to parent-owned baseline effort; override individual tasks as needed'],
    ['Testing Enabled', 'No', 'Generate testing tasks only when applicable'],
    ['Athletic Recruiting Enabled', 'No', 'Generate recruiting tasks and create Recruiting Tracker'],
    ['CSS Profile Enabled', 'No', 'Generate CSS Profile tasks only when applicable'],
    ['Visits Enabled', 'No', 'Generate selected visit/event tasks'],
    ['Interviews Enabled', 'No', 'Generate interview tasks only when applicable'],
    ['Portfolio/Audition Enabled', 'No', 'Generate portfolio/audition tasks only when applicable'],
    ['Professional Support Enabled', 'No', 'Records available support separately from accountable ownership'],
    ['Student Weekly Threshold (hours)', '', 'Optional after reviewing the unconstrained baseline plan'],
    ['Parent Weekly Threshold (hours)', '', 'Optional after reviewing the unconstrained baseline plan'],
    ['Shared Weekly Threshold (hours)', '', 'Optional after reviewing the unconstrained baseline plan'],
    ['Student Week Overrides', '', 'Optional: YYYY-MM-DD=hours; YYYY-MM-DD=hours'],
    ['Parent Week Overrides', '', 'Optional: YYYY-MM-DD=hours; YYYY-MM-DD=hours'],
    ['Shared Week Overrides', '', 'Optional: YYYY-MM-DD=hours; YYYY-MM-DD=hours'],
  ];

  var TASK_FIELDS = [
    ['Task ID', 'taskId'], ['Template ID', 'templateId'], ['Workstream', 'workstream'],
    ['Stage', 'stage'], ['Module', 'module'], ['Scope Type', 'scopeType'],
    ['Scope ID', 'scopeId'], ['College', 'college'], ['College ID', 'collegeId'],
    ['Task', 'task'], ['Owner', 'owner'], ['Owner Role', 'ownerRole'],
    ['Owner Locked', 'ownerLocked'], ['Support Role', 'supportRole'],
    ['Calculated Date', 'calculatedDate'], ['Due Date', 'dueDate'],
    ['Date Source', 'dateSource'], ['Date Locked', 'dateLocked'],
    ['Planned Week', 'plannedWeek'], ['Scheduled Block', 'scheduledBlock'],
    ['Schedule Flag', 'scheduleFlag'],
    ['Priority', 'priority'], ['Priority Override', 'priorityOverride'],
    ['Status', 'status'], ['Dependencies', 'dependencies'], ['Blocked By', 'blockedBy'],
    ['Normal Effort (min)', 'normalEffortMinutes'],
    ['Adjusted Effort (min)', 'adjustedEffortMinutes'],
    ['Effort Override (min)', 'effortOverrideMinutes'], ['Deliverable', 'deliverable'],
    ['Resource Links', 'resourceLinks'], ['Decision Needed', 'decisionNeeded'],
    ['Evidence Source', 'evidenceSource'], ['Completion Date', 'completionDate'],
    ['Notes', 'notes'], ['Manually Selected', 'manuallySelected'],
    ['Generated', 'generated'], ['Archived Reason', 'archivedReason'],
  ];

  var DATE_FIELDS = {
    calculatedDate: true, dueDate: true, plannedWeek: true, completionDate: true,
  };
  var BOOLEAN_FIELDS = {
    ownerLocked: true, dateLocked: true, decisionNeeded: true,
    manuallySelected: true, generated: true,
  };
  var USER_FORMULA_HEADERS = {
    'Task': true, 'Owner': true, 'Owner Locked': true, 'Due Date': true,
    'Date Locked': true, 'Planned Week': true, 'Scheduled Block': true,
    'Priority Override': true, 'Status': true, 'Effort Override (min)': true,
    'Resource Links': true, 'Notes': true, 'Manually Selected': true,
  };

  /**
   * Normalizes yes/no values for sheet persistence.
   * @param {*} value - Input
   * @returns {boolean} Boolean
   */
  function isYes_(value) {
    if (value === true) return true;
    return ['yes', 'y', 'true', '1'].indexOf((value || '').toString().trim().toLowerCase()) !== -1;
  }

  /**
   * Converts a value to Yes/No for the sheet.
   * @param {*} value - Input
   * @returns {string} Yes or No
   */
  function yesNo_(value) {
    return isYes_(value) ? 'Yes' : 'No';
  }

  /**
   * Parses semicolon-separated week-specific capacity overrides.
   * @param {*} value - YYYY-MM-DD=hours entries
   * @returns {Object} Week-to-hours map
   */
  function parseWeekOverrides_(value) {
    var overrides = {};
    (value || '').toString().split(';').forEach(function(entry) {
      var parts = entry.split('=');
      var week = (parts[0] || '').trim();
      var hours = Number((parts[1] || '').trim());
      if (/^\d{4}-\d{2}-\d{2}$/.test(week) && hours >= 0) overrides[week] = hours;
    });
    return overrides;
  }

  /**
   * Combines a value/formula matrix without flattening formulas.
   * @param {Array<Array>} values - Values
   * @param {Array<Array>} formulas - Formulas
   * @returns {Array<Array>} Write-ready values
   */
  function mergeValuesAndFormulas_(values, formulas) {
    return values.map(function(row, rowIndex) {
      return row.map(function(value, columnIndex) {
        return formulas[rowIndex][columnIndex] || value;
      });
    });
  }

  /**
   * Reshapes a sheet by header label while preserving unknown custom columns.
   * @param {Sheet} sheet - Sheet
   * @param {Array<string>} canonicalHeaders - Required headers
   * @returns {Array<string>} Final headers
   */
  function ensureSheetShape_(sheet, canonicalHeaders) {
    var lastColumn = Math.max(1, sheet.getLastColumn());
    var oldHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) {
      return (value || '').toString().trim();
    });
    var unknownHeaders = oldHeaders.filter(function(header) {
      return header && canonicalHeaders.indexOf(header) === -1;
    });
    var finalHeaders = canonicalHeaders.concat(unknownHeaders);
    var lastRow = sheet.getLastRow();
    var oldBlock = [];
    if (lastRow >= 2) {
      var range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
      oldBlock = mergeValuesAndFormulas_(range.getValues(), range.getFormulas());
    }
    var oldIndex = {};
    oldHeaders.forEach(function(header, index) {
      if (header && !Object.prototype.hasOwnProperty.call(oldIndex, header)) oldIndex[header] = index;
    });
    var migrated = oldBlock.map(function(oldRow) {
      return finalHeaders.map(function(header) {
        return oldIndex[header] === undefined ? '' : oldRow[oldIndex[header]];
      });
    });
    CollegeTools.Utils.setHeaders(sheet, finalHeaders);
    if (migrated.length) {
      sheet.getRange(2, 1, migrated.length, finalHeaders.length).setValues(migrated);
    }
    var currentLastColumn = sheet.getLastColumn();
    if (currentLastColumn > finalHeaders.length) {
      sheet.deleteColumns(finalHeaders.length + 1, currentLastColumn - finalHeaders.length);
    }
    return finalHeaders;
  }

  /**
   * Reads a header-keyed table.
   * @param {Sheet|null} sheet - Source sheet
   * @param {number=} headerRow - Header row
   * @returns {Array<Object>} Rows
   */
  function readTable_(sheet, headerRow) {
    if (!sheet) return [];
    headerRow = headerRow || 1;
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    if (lastRow <= headerRow || lastColumn < 1) return [];
    var headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(function(value) {
      return (value || '').toString().trim();
    });
    var values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();
    return values.map(function(row, rowIndex) {
      var object = {_sourceRow: headerRow + 1 + rowIndex};
      var hasValue = false;
      headers.forEach(function(header, index) {
        if (!header) return;
        object[header] = row[index];
        if (row[index] !== '' && row[index] !== null) hasValue = true;
      });
      object._hasValue = hasValue;
      return object;
    }).filter(function(row) {
      return row._hasValue;
    });
  }

  /**
   * Creates and preserves the Task Settings sheet.
   * @param {Spreadsheet} spreadsheet - Workbook
   * @returns {Sheet} Settings sheet
   */
  function setupSettingsSheet_(spreadsheet) {
    var sheet = CollegeTools.Utils.ensureSheet(
      spreadsheet, CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS);
    ensureSheetShape_(sheet, CollegeTools.Config.HEADERS.TASK_SETTINGS);
    var existing = {};
    readTable_(sheet).forEach(function(row) {
      existing[(row.Setting || '').toString()] = row.Value;
    });
    var values = SETTINGS.map(function(setting) {
      var value = Object.prototype.hasOwnProperty.call(existing, setting[0]) ?
        existing[setting[0]] : setting[1];
      return [setting[0], value, setting[2]];
    });
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
    }
    sheet.getRange(2, 1, values.length, 3).setValues(values);
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 520);

    var yesNoRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Yes', 'No'], true).setAllowInvalid(false).build();
    var dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
    values.forEach(function(row, index) {
      var target = sheet.getRange(index + 2, 2);
      if (row[0].indexOf('Enabled') !== -1 || row[0] === 'Counselor/Professional Participating') {
        target.setDataValidation(yesNoRule);
      } else if (row[0].indexOf('Date') !== -1 || row[0].indexOf('Deadline') !== -1) {
        target.setDataValidation(dateRule);
      }
    });
    return sheet;
  }

  /**
   * Reads family task configuration from Task Settings.
   * @param {Spreadsheet=} spreadsheet - Workbook
   * @returns {Object} Planner configuration
   */
  function readConfig(spreadsheet) {
    spreadsheet = spreadsheet || SpreadsheetApp.getActive();
    var sheet = spreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS);
    var settings = {};
    readTable_(sheet).forEach(function(row) {
      settings[(row.Setting || '').toString()] = row.Value;
    });
    var customOwners = (settings['Custom Owners (comma separated)'] || '').toString()
      .split(',').map(function(value) {
        return value.trim();
      }).filter(function(value) {
        return !!value;
      });
    return {
      planningStartDate: settings['Planning Start Date'],
      workingDeadline: settings['Working First Application Deadline'],
      fafsaAvailabilityDate: settings['FAFSA Availability Date'],
      currentGrade: settings['Current Grade'],
      graduationYear: settings['Expected Graduation Year'],
      applicationCycle: settings['Application Cycle'],
      counselorAvailable: settings['Counselor/Professional Participating'],
      parentEffortMultiplier: settings['Parent Effort Multiplier'],
      roleNames: {
        'Student': settings['Student Owner Name'],
        'Parent/Guardian': settings['Parent/Guardian Owner Name'],
        'Counselor/Professional': settings['Counselor/Professional Owner Name'],
      },
      customOwners: customOwners,
      modules: {
        'Testing': settings['Testing Enabled'],
        'Athletic Recruiting': settings['Athletic Recruiting Enabled'],
        'CSS Profile': settings['CSS Profile Enabled'],
        'Visits': settings['Visits Enabled'],
        'Interviews': settings['Interviews Enabled'],
        'Portfolio/Audition': settings['Portfolio/Audition Enabled'],
        'Professional Support': settings['Professional Support Enabled'],
      },
      roleThresholds: {
        'Student': settings['Student Weekly Threshold (hours)'],
        'Parent/Guardian': settings['Parent Weekly Threshold (hours)'],
        'Shared': settings['Shared Weekly Threshold (hours)'],
      },
      weeklyThresholdOverrides: {
        'Student': parseWeekOverrides_(settings['Student Week Overrides']),
        'Parent/Guardian': parseWeekOverrides_(settings['Parent Week Overrides']),
        'Shared': parseWeekOverrides_(settings['Shared Week Overrides']),
      },
    };
  }

  /**
   * Writes the validated source catalog to the hidden template sheet.
   * @param {Spreadsheet} spreadsheet - Workbook
   * @returns {Object} Render result
   */
  function renderTemplateSheet_(spreadsheet) {
    var validation = CollegeTools.TaskCatalog.validate();
    if (!validation.ok) throw new Error(validation.errors.join('\n'));
    var sheet = CollegeTools.Utils.ensureSheet(
      spreadsheet, CollegeTools.Config.SHEET_NAMES.TASK_TEMPLATES);
    sheet.clear();
    CollegeTools.Utils.setHeaders(sheet, CollegeTools.Config.HEADERS.TASK_TEMPLATES);
    var rows = CollegeTools.TaskCatalog.getTemplates().map(function(template) {
      return [
        template.templateId, template.workstream, template.stage, template.module,
        template.scope, template.task, template.ownerRole, template.supportRole,
        template.applicability, template.offsetDays, template.dependencies.join(', '),
        template.effortMinutes, template.deliverable, template.resourceLinks,
      ];
    });
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    if (sheet.hideSheet) sheet.hideSheet();
    return {ok: true, count: rows.length};
  }

  /**
   * Applies task table validations.
   * @param {Sheet} sheet - Tasks sheet
   * @param {Object} config - Configuration
   */
  function applyTaskValidations_(sheet, config) {
    var maxRows = Math.max(2, sheet.getMaxRows());
    var rowCount = maxRows - 1;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var column = {};
    headers.forEach(function(header, index) {
      column[header] = index + 1;
    });
    var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(
      ['Not Started', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Complete', 'Skipped'], true)
      .setAllowInvalid(false).build();
    var priorityRule = SpreadsheetApp.newDataValidation().requireValueInList(
      ['Critical', 'High', 'Normal', 'Low'], true).setAllowInvalid(false).build();
    var yesNoRule = SpreadsheetApp.newDataValidation().requireValueInList(
      ['Yes', 'No'], true).setAllowInvalid(false).build();
    var dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
    var owners = [
      config.roleNames.Student, config.roleNames['Parent/Guardian'],
      config.roleNames['Counselor/Professional'], 'Shared', 'External dependency',
    ].concat(config.customOwners || []).filter(function(value, index, values) {
      return value && values.indexOf(value) === index;
    });
    var ownerRule = SpreadsheetApp.newDataValidation().requireValueInList(
      owners, true).setAllowInvalid(true).build();
    if (column.Status) sheet.getRange(2, column.Status, rowCount, 1).setDataValidation(statusRule);
    if (column['Priority Override']) {
      sheet.getRange(2, column['Priority Override'], rowCount, 1).setDataValidation(priorityRule);
    }
    if (column.Owner) sheet.getRange(2, column.Owner, rowCount, 1).setDataValidation(ownerRule);
    ['Owner Locked', 'Date Locked', 'Decision Needed', 'Manually Selected'].forEach(function(header) {
      if (column[header]) sheet.getRange(2, column[header], rowCount, 1).setDataValidation(yesNoRule);
    });
    ['Calculated Date', 'Due Date', 'Planned Week', 'Completion Date'].forEach(function(header) {
      if (column[header]) {
        sheet.getRange(2, column[header], rowCount, 1)
          .setDataValidation(dateRule).setNumberFormat('yyyy-mm-dd');
      }
    });
  }

  /**
   * Converts a Tasks row object to the planner model.
   * @param {Object} row - Header-keyed row
   * @returns {Object} Task
   */
  function rowToTask_(row) {
    var task = {_sourceRow: row._sourceRow};
    TASK_FIELDS.forEach(function(field) {
      var value = row[field[0]];
      if (field[1] === 'dependencies') {
        value = (value || '').toString().split(',').map(function(item) {
          return item.trim();
        }).filter(function(item) {
          return !!item;
        });
      } else if (BOOLEAN_FIELDS[field[1]]) {
        value = isYes_(value);
      } else if (DATE_FIELDS[field[1]]) {
        value = CollegeTools.TaskPlanner.toDate(value);
      }
      task[field[1]] = value === undefined ? '' : value;
    });
    if (!task.taskId && task.task) {
      task.taskId = 'MANUAL::' + Utilities.getUuid();
      task.generated = false;
    }
    return task;
  }

  /**
   * Reads canonical task rows.
   * @param {Spreadsheet=} spreadsheet - Workbook
   * @returns {Array<Object>} Tasks
   */
  function readTasks(spreadsheet) {
    spreadsheet = spreadsheet || SpreadsheetApp.getActive();
    var sheet = spreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
    if (!sheet) return [];
    return readTable_(sheet).map(rowToTask_).filter(function(task) {
      return !!task.taskId || !!task.task;
    });
  }

  /**
   * Converts a task model value for spreadsheet output.
   * @param {Object} task - Task
   * @param {string} field - Field
   * @returns {*} Sheet value
   */
  function taskValue_(task, field) {
    var value = task[field];
    if (field === 'dependencies') return (value || []).join(', ');
    if (BOOLEAN_FIELDS[field]) return yesNo_(value);
    return value === null || value === undefined ? '' : value;
  }

  /**
   * Writes tasks while retaining custom-column values by Task ID.
   * @param {Spreadsheet} spreadsheet - Workbook
   * @param {Array<Object>} tasks - Tasks
   * @returns {Object} Write result
   */
  function writeTasks_(spreadsheet, tasks) {
    var sheet = CollegeTools.Utils.ensureSheet(spreadsheet, CollegeTools.Config.SHEET_NAMES.TASKS);
    var headers = ensureSheetShape_(sheet, CollegeTools.Config.HEADERS.TASKS);
    var canonicalHeaders = CollegeTools.Config.HEADERS.TASKS;
    var extraHeaders = headers.slice(canonicalHeaders.length);
    var oldRows = readTable_(sheet);
    var extrasById = {};
    var extrasByRow = {};
    var formulasById = {};
    var formulasByRow = {};
    var formulaRows = [];
    if (sheet.getLastRow() > 1) {
      formulaRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getFormulas();
    }
    oldRows.forEach(function(row) {
      var extras = extraHeaders.map(function(header) {
        return row[header] === undefined ? '' : row[header];
      });
      var rowFormulas = formulaRows[row._sourceRow - 2] || [];
      if (row['Task ID']) {
        extrasById[String(row['Task ID'])] = extras;
        formulasById[String(row['Task ID'])] = rowFormulas;
      }
      extrasByRow[row._sourceRow] = extras;
      formulasByRow[row._sourceRow] = rowFormulas;
    });
    var values = tasks.map(function(task) {
      var row = TASK_FIELDS.map(function(field) {
        return taskValue_(task, field[1]);
      });
      var extras = extrasById[task.taskId] || extrasByRow[task._sourceRow] ||
        extraHeaders.map(function() {
          return '';
        });
      var fullRow = row.concat(extras);
      var formulas = formulasById[task.taskId] || formulasByRow[task._sourceRow] || [];
      headers.forEach(function(header, index) {
        if (formulas[index] && (USER_FORMULA_HEADERS[header] ||
            extraHeaders.indexOf(header) !== -1 || !isYes_(task.generated))) {
          fullRow[index] = formulas[index];
        }
      });
      return fullRow;
    });
    var oldLastRow = sheet.getLastRow();
    if (oldLastRow > 1) {
      sheet.getRange(2, 1, oldLastRow - 1, headers.length).clearContent();
    }
    if (values.length) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    applyTaskValidations_(sheet, CollegeTools.TaskPlanner.normalizeConfig(readConfig(spreadsheet)));
    sheet.setFrozenRows(1);
    return {ok: true, count: values.length};
  }

  /**
   * Ensures stable IDs for nonblank data rows.
   * @param {Sheet|null} sheet - Sheet
   * @param {string} idHeader - ID header
   * @param {string} primaryHeader - Row-presence header
   * @param {number} headerRow - Header row
   * @param {string} prefix - ID prefix
   * @returns {number} IDs assigned
   */
  function ensureRowIds_(sheet, idHeader, primaryHeader, headerRow, prefix) {
    if (!sheet) return 0;
    var idColumn = headerRow === 1 ?
      CollegeTools.Utils.colIndex(sheet, idHeader) :
      CollegeTools.Schema.columnIndex('COLLEGES', 'COLLEGE_ID', sheet);
    var primaryColumn = headerRow === 1 ?
      CollegeTools.Utils.colIndex(sheet, primaryHeader) :
      CollegeTools.Schema.columnIndex('COLLEGES', 'COLLEGE_NAME', sheet);
    if (!idColumn || !primaryColumn) return 0;
    var lastRow = sheet.getLastRow();
    if (lastRow <= headerRow) return 0;
    var rowCount = lastRow - headerRow;
    var primaryValues = sheet.getRange(headerRow + 1, primaryColumn, rowCount, 1).getValues();
    var idValues = sheet.getRange(headerRow + 1, idColumn, rowCount, 1).getValues();
    var assigned = 0;
    for (var i = 0; i < rowCount; i++) {
      if (primaryValues[i][0] && !idValues[i][0]) {
        idValues[i][0] = prefix + Utilities.getUuid();
        assigned++;
      }
    }
    if (assigned) sheet.getRange(headerRow + 1, idColumn, rowCount, 1).setValues(idValues);
    return assigned;
  }

  /**
   * Ensures the conditional recruiting tracker and stable contact IDs.
   * @param {Spreadsheet} spreadsheet - Workbook
   * @param {boolean} enabled - Whether recruiting is enabled
   * @returns {Object} Result
   */
  function setupRecruitingTracker_(spreadsheet, enabled) {
    var sheet = spreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);
    if (!enabled) {
      if (sheet && sheet.hideSheet) sheet.hideSheet();
      return {ok: true, enabled: false, preserved: !!sheet};
    }
    sheet = CollegeTools.Utils.ensureSheet(
      spreadsheet, CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);
    ensureSheetShape_(sheet, CollegeTools.Config.HEADERS.RECRUITING_TRACKER);
    ensureRowIds_(sheet, 'Recruiting Contact ID', 'College Name', 1, 'RC-');
    if (sheet.showSheet) sheet.showSheet();
    ['Questionnaire Submitted Date', 'Initial Outreach Date', 'Last Contact', 'Next Follow-Up']
      .forEach(function(header) {
        var column = CollegeTools.Utils.colIndex(sheet, header);
        if (column) {
          sheet.getRange(2, column, Math.max(1, sheet.getMaxRows() - 1), 1)
            .setDataValidation(
              SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build())
            .setNumberFormat('yyyy-mm-dd');
        }
      });
    return {ok: true, enabled: true};
  }

  /**
   * Builds an ID/name lookup for a tracker.
   * @param {Array<Object>} rows - Tracker rows
   * @returns {Object} Lookup
   */
  function collegeLookup_(rows) {
    var lookup = {};
    (rows || []).forEach(function(row) {
      var id = row['College ID'];
      var name = (row['College Name'] || '').toString().trim();
      if (id) lookup['id:' + id] = row;
      if (name) lookup['name:' + name.toLowerCase()] = row;
    });
    return lookup;
  }

  /**
   * Finds a tracker row by stable ID, with a one-time name bridge.
   * @param {Object} lookup - Lookup
   * @param {string} id - College ID
   * @param {string} name - College name
   * @returns {Object} Tracker row
   */
  function trackerRow_(lookup, id, name) {
    return lookup['id:' + id] || lookup['name:' + (name || '').toLowerCase()] || {};
  }

  /**
   * Reads all canonical tracker context required by the planner.
   * @param {Spreadsheet=} spreadsheet - Workbook
   * @returns {Object} Planner context
   */
  function buildContextFromWorkbook(spreadsheet) {
    spreadsheet = spreadsheet || SpreadsheetApp.getActive();
    var names = CollegeTools.Config.SHEET_NAMES;
    var collegesSheet = spreadsheet.getSheetByName(names.COLLEGES);
    if (collegesSheet) CollegeTools.Utils.ensureHiddenLastColumn(collegesSheet, 'College ID', 2);
    ensureRowIds_(collegesSheet, 'College ID', 'College Name', 2, 'COL-');
    var scholarshipSheet = spreadsheet.getSheetByName(names.SCHOLARSHIP_TRACKER);
    if (scholarshipSheet) {
      CollegeTools.Utils.ensureHiddenLastColumn(scholarshipSheet, 'Scholarship ID', 1);
    }
    ensureRowIds_(scholarshipSheet, 'Scholarship ID', 'Scholarship Name', 1, 'SCH-');
    var recruitingSheet = spreadsheet.getSheetByName(names.RECRUITING_TRACKER);
    ensureRowIds_(recruitingSheet, 'Recruiting Contact ID', 'College Name', 1, 'RC-');

    var timeline = collegeLookup_(readTable_(spreadsheet.getSheetByName(names.APPLICATION_TIMELINE)));
    var status = collegeLookup_(readTable_(spreadsheet.getSheetByName(names.STATUS_TRACKER)));
    var financial = collegeLookup_(readTable_(spreadsheet.getSheetByName(names.FINANCIAL_AID)));
    var visitRows = readTable_(spreadsheet.getSheetByName(names.CAMPUS_VISIT));
    var visits = collegeLookup_(visitRows);
    var colleges = readTable_(collegesSheet, 2).map(function(row) {
      var name = (row['College Name'] || '').toString().trim();
      var id = row['College ID'];
      if (!name || !id) return null;
      var timelineRow = trackerRow_(timeline, id, name);
      var statusRow = trackerRow_(status, id, name);
      var financialRow = trackerRow_(financial, id, name);
      var visitRow = trackerRow_(visits, id, name);
      return {
        id: id,
        collegeId: id,
        name: name,
        collegeName: name,
        applicationType: timelineRow['Application Type (ED/ED2/EA/REA/RD)'],
        applicationDeadline: timelineRow['Application Deadline'],
        meritDeadline: timelineRow['Merit Scholarship Deadline'],
        honorsDeadline: timelineRow['Other Deadline 1 Date'],
        portfolioDeadline: timelineRow['Other Deadline 2 Date'],
        testScoreDeadline: timelineRow['Test Score Deadline'],
        transcriptDeadline: timelineRow['Transcript Deadline'],
        teacherRecDeadline: timelineRow['Teacher Rec Deadline'],
        counselorRecDeadline: timelineRow['Counselor Rec Deadline'],
        aidDeadline: financialRow['Priority Deadline'] || financialRow['FAFSA Deadline'] ||
          financialRow['CSS Deadline'],
        testScoresSent: statusRow['Test Scores Sent'],
        transcriptSent: statusRow['Transcript Sent'],
        recommendationsComplete: statusRow['Recommendations Complete'],
        essaysComplete: statusRow['Essays Complete'],
        submittedDate: statusRow['Submitted Date'],
        applicationStatus: statusRow['Application Status'],
        portal: statusRow['App Portal'],
        documentsComplete: statusRow['Documents Complete'],
        portfolioRequired: statusRow['Portfolio Required (Y/N)'],
        portfolioSubmittedDate: statusRow['Portfolio Submitted (Date)'],
        interviewRequired: statusRow['Interview (Y/N)'],
        interviewDate: statusRow['Interview Date'],
        visitDate: visitRow['Visit Date'] || statusRow['Campus Visit Date'],
        supplementsRequired: true,
      };
    }).filter(function(college) {
      return !!college;
    });

    var scholarships = readTable_(scholarshipSheet).map(function(row) {
      return {
        id: row['Scholarship ID'],
        scholarshipId: row['Scholarship ID'],
        scholarshipName: row['Scholarship Name'],
        label: row['Scholarship Name'],
        deadline: row.Deadline,
        submittedDate: row['Application Submitted Date'],
        decisionDate: row['Decision Date'],
        awardStatus: row['Award Status (Pending/Awarded/Declined)'],
      };
    }).filter(function(item) {
      return !!item.scholarshipName;
    });

    var contacts = readTable_(recruitingSheet).map(function(row) {
      return {
        id: row['Recruiting Contact ID'],
        contactId: row['Recruiting Contact ID'],
        collegeId: row['College ID'],
        collegeName: row['College Name'],
        label: row['College Name'] + (row['Coach/Contact Name'] ? ' — ' + row['Coach/Contact Name'] : ''),
        questionnaireDate: row['Questionnaire Submitted Date'],
        initialOutreachDate: row['Initial Outreach Date'],
        response: row['Response/Interest'],
        lastContact: row['Last Contact'],
        nextFollowUp: row['Next Follow-Up'],
      };
    }).filter(function(item) {
      return !!item.collegeName;
    });

    var visitContext = visitRows.map(function(row) {
      var name = row['College Name'];
      var college = colleges.filter(function(item) {
        return item.name === name;
      })[0];
      return {
        id: college ? college.id : 'VISIT-' + name,
        visitId: college ? college.id : 'VISIT-' + name,
        collegeId: college ? college.id : '',
        collegeName: name,
        label: name + ' visit',
        visitDate: row['Visit Date'],
      };
    }).filter(function(item) {
      return !!item.collegeName && !!item.visitDate;
    });
    var interviews = colleges.filter(function(college) {
      return isYes_(college.interviewRequired) || !!college.interviewDate;
    }).map(function(college) {
      return {
        id: college.id,
        collegeId: college.id,
        collegeName: college.name,
        label: college.name + ' interview',
        interviewDate: college.interviewDate,
      };
    });
    var financialRows = readTable_(spreadsheet.getSheetByName(names.FINANCIAL_AID));
    var fafsaSubmitted = financialRows.some(function(row) {
      return isYes_(row['FAFSA Submitted (Y/N)']);
    });
    var cssSubmitted = financialRows.some(function(row) {
      return /submitted/i.test((row['CSS Profile Status'] || '').toString());
    });
    return {
      colleges: colleges,
      scholarships: scholarships,
      contacts: contacts,
      visits: visitContext,
      interviews: interviews,
      prompts: [],
      fafsaSubmitted: fafsaSubmitted,
      cssProfileSubmitted: cssSubmitted,
    };
  }

  /**
   * Renders the generated This Week and rolling/effort report.
   * @param {Spreadsheet} spreadsheet - Workbook
   * @param {Object} views - Planner views
   * @returns {Object} Result
   */
  function writeThisWeek_(spreadsheet, views) {
    var sheet = CollegeTools.Utils.ensureSheet(spreadsheet, CollegeTools.Config.SHEET_NAMES.THIS_WEEK);
    sheet.clear();
    var headers = CollegeTools.Config.HEADERS.THIS_WEEK;
    CollegeTools.Utils.setHeaders(sheet, headers);
    var rowForTask = function(task) {
      return [
        task.taskId, task.dueDate || '', task.priority, task.status, task.owner,
        task.college, task.task, task.adjustedEffortMinutes,
        yesNo_(task.decisionNeeded), task.scheduleFlag,
      ];
    };
    if (views.thisWeek.length) {
      sheet.getRange(2, 1, views.thisWeek.length, headers.length)
        .setValues(views.thisWeek.map(rowForTask));
    } else {
      sheet.getRange(2, 1).setValue('No current actions. Refresh after generating or updating tasks.');
    }
    var row = Math.max(13, views.thisWeek.length + 4);
    sheet.getRange(row, 1).setValue('Weekly Report').setFontWeight('bold').setBackground('#d9ead3');
    row++;
    var reportRows = [
      ['Active tasks', views.counts.active],
      ['Completed tasks', views.counts.complete],
      ['Completed this week', views.counts.completedThisWeek],
      ['Overdue tasks', views.counts.overdue],
      ['Blocked / waiting', views.counts.blocked],
      ['Decisions needed', views.counts.decisions],
      ['Deadlines within 21 days', views.counts.dueWithin21Days],
      ['Applications submitted / tracked',
        views.counts.applicationsSubmitted + ' / ' + views.counts.applicationsTracked],
      ['Recruiting actions in rolling 90 days', views.counts.recruitingActions],
      ['Peak planned week', views.peakWeek],
      ['Peak-week effort (hours)', Math.round((views.peakWeekMinutes / 60) * 10) / 10],
      ['Capacity warnings', views.capacityWarnings.length],
    ];
    sheet.getRange(row, 1, reportRows.length, 2).setValues(reportRows);
    row += reportRows.length + 2;
    sheet.getRange(row, 1).setValue('Effort By Owner').setFontWeight('bold').setBackground('#cfe2f3');
    row++;
    var ownerRows = Object.keys(views.effortByOwner).sort().map(function(owner) {
      return [owner, Math.round((views.effortByOwner[owner] / 60) * 10) / 10];
    });
    if (ownerRows.length) sheet.getRange(row, 1, ownerRows.length, 2).setValues(ownerRows);
    row += ownerRows.length + 2;
    if (views.capacityWarnings.length) {
      sheet.getRange(row, 1).setValue('Capacity Warnings')
        .setFontWeight('bold').setBackground('#f4cccc');
      row++;
      var warningRows = views.capacityWarnings.map(function(warning) {
        return [
          warning.week + ' — ' + warning.role,
          Math.round((warning.plannedMinutes / 60) * 10) / 10 +
            'h planned / ' + warning.capacityHours + 'h configured',
        ];
      });
      sheet.getRange(row, 1, warningRows.length, 2).setValues(warningRows);
      row += warningRows.length + 2;
    }
    sheet.getRange(row, 1).setValue('Rolling 90 Days').setFontWeight('bold').setBackground('#fce5cd');
    row++;
    sheet.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    row++;
    if (views.rolling90.length) {
      sheet.getRange(row, 1, views.rolling90.length, headers.length)
        .setValues(views.rolling90.map(rowForTask));
    }
    var dueColumn = headers.indexOf('Due Date') + 1;
    sheet.getRange(2, dueColumn, Math.max(1, sheet.getLastRow() - 1), 1).setNumberFormat('yyyy-mm-dd');
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1).setNote('Generated from Tasks; edit the canonical Tasks sheet instead.');
    return {ok: true, currentActions: views.thisWeek.length, rolling90: views.rolling90.length};
  }

  /**
   * Creates or repairs task-management sheets without generating family tasks.
   * @param {Object=} _opts - Reserved options
   * @returns {Object} Setup result
   */
  function setupTaskManagement(_opts) {
    var spreadsheet = SpreadsheetApp.getActive();
    setupSettingsSheet_(spreadsheet);
    var config = CollegeTools.TaskPlanner.normalizeConfig(readConfig(spreadsheet));
    var templateResult = renderTemplateSheet_(spreadsheet);
    var tasksSheet = CollegeTools.Utils.ensureSheet(
      spreadsheet, CollegeTools.Config.SHEET_NAMES.TASKS);
    ensureSheetShape_(tasksSheet, CollegeTools.Config.HEADERS.TASKS);
    applyTaskValidations_(tasksSheet, config);
    setupRecruitingTracker_(spreadsheet, config.modules['Athletic Recruiting']);
    var views = CollegeTools.TaskPlanner.buildViews(readTasks(spreadsheet), null, config);
    writeThisWeek_(spreadsheet, views);
    return {
      ok: true,
      code: 'task_management_setup',
      message: 'Task management sheets are ready',
      templateCount: templateResult.count,
    };
  }

  /**
   * Calculates a reconfiguration preview without changing Tasks.
   * @returns {Object} Preview result
   */
  function previewTaskPlan() {
    var spreadsheet = SpreadsheetApp.getActive();
    setupSettingsSheet_(spreadsheet);
    var config = readConfig(spreadsheet);
    var context = buildContextFromWorkbook(spreadsheet);
    var generated = CollegeTools.TaskPlanner.generatePlan(config, context);
    if (!generated.ok) return generated;
    var reconciled = CollegeTools.TaskPlanner.reconcile(generated.tasks, readTasks(spreadsheet));
    return {
      ok: true,
      code: 'task_plan_preview',
      message: 'Task plan preview complete',
      preview: reconciled.preview,
      generatedCount: generated.tasks.length,
      applicableTemplateCount: generated.applicableTemplateCount,
      firstDeadline: generated.firstDeadline,
    };
  }

  /**
   * Generates or safely regenerates the canonical task plan.
   * @returns {Object} Generation result
   */
  function generateTaskPlan() {
    var spreadsheet = SpreadsheetApp.getActive();
    setupTaskManagement({suppressAlert: true});
    var config = readConfig(spreadsheet);
    var normalized = CollegeTools.TaskPlanner.normalizeConfig(config);
    setupRecruitingTracker_(spreadsheet, normalized.modules['Athletic Recruiting']);
    var context = buildContextFromWorkbook(spreadsheet);
    var generated = CollegeTools.TaskPlanner.generatePlan(config, context);
    if (!generated.ok) return generated;
    var reconciled = CollegeTools.TaskPlanner.reconcile(generated.tasks, readTasks(spreadsheet));
    var evidenced = CollegeTools.TaskPlanner.applyEvidence(reconciled.tasks, context);
    writeTasks_(spreadsheet, evidenced.tasks);
    var views = CollegeTools.TaskPlanner.buildViews(evidenced.tasks, null, config);
    var viewResult = writeThisWeek_(spreadsheet, views);
    return {
      ok: true,
      code: 'task_plan_generated',
      message: 'Task plan generated and This Week refreshed',
      taskCount: evidenced.tasks.length,
      applicableTemplateCount: generated.applicableTemplateCount,
      preview: reconciled.preview,
      evidenceCompletions: evidenced.completed,
      evidenceSuggestions: evidenced.suggestions,
      currentActions: viewResult.currentActions,
    };
  }

  /**
   * Refreshes generated views from canonical Tasks.
   * @returns {Object} Refresh result
   */
  function refreshTaskViews() {
    var spreadsheet = SpreadsheetApp.getActive();
    var tasks = readTasks(spreadsheet);
    return writeThisWeek_(
      spreadsheet,
      CollegeTools.TaskPlanner.buildViews(tasks, null, readConfig(spreadsheet)),
    );
  }

  /**
   * Synchronizes only reliable completion evidence from canonical trackers.
   * @returns {Object} Synchronization result
   */
  function syncTaskCompletion() {
    var spreadsheet = SpreadsheetApp.getActive();
    var tasks = readTasks(spreadsheet);
    var context = buildContextFromWorkbook(spreadsheet);
    var result = CollegeTools.TaskPlanner.applyEvidence(tasks, context);
    writeTasks_(spreadsheet, result.tasks);
    writeThisWeek_(
      spreadsheet,
      CollegeTools.TaskPlanner.buildViews(result.tasks, null, readConfig(spreadsheet)),
    );
    return {
      ok: true,
      code: 'task_completion_synced',
      message: 'Reliable tracker evidence synchronized',
      completed: result.completed,
      suggestions: result.suggestions,
    };
  }

  /**
   * Repairs shapes and views while preserving task data.
   * @returns {Object} Repair result
   */
  function repairTaskManagement() {
    var result = setupTaskManagement({suppressAlert: true});
    var completion = syncTaskCompletion();
    return {
      ok: result.ok && completion.ok,
      code: 'task_management_repaired',
      message: 'Task-management sheets repaired and refreshed',
      templateCount: result.templateCount,
      evidenceCompletions: completion.completed,
    };
  }

  /**
   * Keeps This Week current after relevant edits, with menu refresh as fallback.
   * @param {Object} event - Apps Script edit event
   * @returns {Object|null} Refresh result
   */
  function handleEdit(event) {
    if (!event || !event.range || !event.range.getSheet) return null;
    var sheetName = event.range.getSheet().getName();
    var names = CollegeTools.Config.SHEET_NAMES;
    if (sheetName === names.TASKS) return refreshTaskViews();
    if ([
      names.FINANCIAL_AID, names.CAMPUS_VISIT, names.STATUS_TRACKER,
      names.SCHOLARSHIP_TRACKER, names.RECRUITING_TRACKER,
    ].indexOf(sheetName) !== -1) {
      return syncTaskCompletion();
    }
    return null;
  }

  return {
    setupTaskManagement: setupTaskManagement,
    previewTaskPlan: previewTaskPlan,
    generateTaskPlan: generateTaskPlan,
    refreshTaskViews: refreshTaskViews,
    syncTaskCompletion: syncTaskCompletion,
    repairTaskManagement: repairTaskManagement,
    handleEdit: handleEdit,
    readConfig: readConfig,
    readTasks: readTasks,
    buildContextFromWorkbook: buildContextFromWorkbook,
  };
})();
