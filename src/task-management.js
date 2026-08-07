/**
 * Spreadsheet integration for adaptive college task management
 * @version 3.0.1
 * @author College Tools
 * @description Creates, updates, and safely reconciles task-management sheets
 */

/**
 * CollegeTools.TaskManagement - Spreadsheet-facing task management service.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.TaskManagement = (function() {
  'use strict';

  var SETTINGS = CollegeTools.Config.TASK_MANAGEMENT_SETTINGS;

  var TASK_FIELDS = [
    ['Task ID', 'taskId'], ['Template ID', 'templateId'], ['Workstream', 'workstream'],
    ['Stage', 'stage'], ['Module', 'module'], ['Scope Type', 'scopeType'],
    ['Scope ID', 'scopeId'], ['College', 'college'], ['College ID', 'collegeId'],
    ['Task', 'task'], ['Applicability Rule', 'applicabilityRule'],
    ['Schedule Rule', 'scheduleRule'], ['Schedule Anchor', 'scheduleAnchor'],
    ['Anchor Date', 'anchorDate'], ['Offset / Window', 'offsetWindow'],
    ['Owner', 'owner'], ['Owner Role', 'ownerRole'],
    ['Owner Locked', 'ownerLocked'], ['Support Role', 'supportRole'],
    ['Calculated Date', 'calculatedDate'], ['Due Date', 'dueDate'],
    ['Effective Date', 'effectiveDate'], ['Date Source', 'dateSource'],
    ['Date Locked', 'dateLocked'],
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
    calculatedDate: true, dueDate: true, effectiveDate: true, anchorDate: true,
    plannedWeek: true, completionDate: true,
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
  var TASK_MIN_ROWS = 200;
  var TASK_ROW_BUFFER = 50;

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
   * Converts a spreadsheet Date into the same visible calendar date in the
   * script time zone. A workbook and its Apps Script project may use different
   * time zones, so JavaScript date getters alone can shift the day.
   * @param {Sheet} sheet - Source sheet
   * @param {*} value - Cell value
   * @returns {*} Script-zone date or original value
   */
  function fromSpreadsheetDate_(sheet, value) {
    if (!(value instanceof Date) || typeof Session === 'undefined' ||
        !Utilities.formatDate || !Utilities.parseDate || !sheet.getParent) {
      return value;
    }
    var spreadsheet = sheet.getParent();
    if (!spreadsheet || !spreadsheet.getSpreadsheetTimeZone) return value;
    var sheetTimeZone = spreadsheet.getSpreadsheetTimeZone();
    var scriptTimeZone = Session.getScriptTimeZone();
    var dateKey = Utilities.formatDate(value, sheetTimeZone, 'yyyy-MM-dd');
    return Utilities.parseDate(dateKey, scriptTimeZone, 'yyyy-MM-dd');
  }

  /**
   * Converts a logical script-zone date to noon in the spreadsheet time zone
   * so the written cell displays the same calendar date.
   * @param {Sheet} sheet - Destination sheet
   * @param {*} value - Value to write
   * @returns {*} Spreadsheet-zone date or original value
   */
  function toSpreadsheetDate_(sheet, value) {
    if (!(value instanceof Date) || typeof Session === 'undefined' ||
        !Utilities.formatDate || !Utilities.parseDate || !sheet.getParent) {
      return value;
    }
    var spreadsheet = sheet.getParent();
    if (!spreadsheet || !spreadsheet.getSpreadsheetTimeZone) return value;
    var sheetTimeZone = spreadsheet.getSpreadsheetTimeZone();
    var scriptTimeZone = Session.getScriptTimeZone();
    var dateKey = Utilities.formatDate(value, scriptTimeZone, 'yyyy-MM-dd');
    return Utilities.parseDate(
      dateKey + ' 12:00', sheetTimeZone, 'yyyy-MM-dd HH:mm');
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
        object[header] = fromSpreadsheetDate_(sheet, row[index]);
        if (row[index] !== '' && row[index] !== null) hasValue = true;
      });
      object._hasValue = hasValue;
      return object;
    }).filter(function(row) {
      return row._hasValue;
    });
  }

  /**
   * Returns a deterministic identity for a populated row during Preview.
   * The value is never written and is deliberately based on source position,
   * not a possibly duplicated or editable display name.
   * @param {string} type - Scope type
   * @param {Object} row - Header-keyed row with _sourceRow
   * @returns {string} Preview-only ID
   */
  function previewRowId_(type, row) {
    return 'PREVIEW:' + type + ':ROW:' + row._sourceRow;
  }

  /**
   * Builds the setting map without creating, repairing, or formatting a sheet.
   * @param {Sheet|null} sheet - Existing Task Settings sheet
   * @returns {Object} Setting values overlaid on configured defaults
   */
  function readSettings_(sheet) {
    var settings = {};
    SETTINGS.forEach(function(setting) {
      settings[setting[0]] = setting[1];
    });
    readTable_(sheet).forEach(function(row) {
      settings[(row.Setting || '').toString()] = row.Value;
    });
    return settings;
  }

  /**
   * Checks required headers without repairing the sheet.
   * @param {Sheet|null} sheet - Existing sheet
   * @param {Array<string>} requiredHeaders - Required labels
   * @returns {boolean} Whether every header is present
   */
  function hasHeaders_(sheet, requiredHeaders) {
    if (!sheet || sheet.getLastColumn() < 1) return false;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(header) {
        return (header || '').toString().trim();
      });
    return requiredHeaders.every(function(header) {
      return headers.indexOf(header) !== -1;
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
    var existing = readSettings_(sheet);
    var values = SETTINGS.map(function(setting) {
      var value = existing[setting[0]];
      return [setting[0], toSpreadsheetDate_(sheet, value), setting[2]];
    });
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
    }
    sheet.getRange(2, 1, values.length, 3).setValues(values);
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 520);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 3)
      .setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold');
    sheet.getRange(2, 1, values.length, 3).setWrap(true).setVerticalAlignment('top');
    sheet.getRange(2, 2, values.length, 1).setBackground('#fff8e1');
    sheet.getRange(2, 1, 6, 1).setBackground('#d9eaf7').setFontWeight('bold');
    sheet.getRange(8, 1, 6, 1).setBackground('#d9ead3').setFontWeight('bold');
    sheet.getRange(14, 1, 7, 1).setBackground('#fce5cd').setFontWeight('bold');
    sheet.getRange(21, 1, 6, 1).setBackground('#e4d7f5').setFontWeight('bold');
    sheet.getRange(1, 2).setNote(
      'Yellow cells are editable. Start with planning dates and family names, enable only relevant modules, ' +
      'then use Preview Task Plan Changes before generating.');

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
    var settings = readSettings_(sheet);
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
    var headers = CollegeTools.Config.HEADERS.TASK_TEMPLATES;
    CollegeTools.Utils.setHeaders(sheet, headers);
    var rows = CollegeTools.TaskCatalog.getTemplates().map(function(template) {
      return [
        template.templateId, template.workstream, template.stage, template.module,
        template.scope, template.task, template.ownerRole, template.supportRole,
        template.applicability, template.scheduleRule, template.scheduleAnchor,
        template.offsetWindow, template.dependencies.join(', '), template.effortMinutes,
        template.deliverable, template.resourceLinks,
      ];
    });
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 120);
    [['Task', 360], ['Applicability', 280], ['Anchor', 200], ['Offset / Window', 180],
      ['Dependencies', 190], ['Deliverable', 280], ['Resource Links', 220]]
      .forEach(function(spec) {
        sheet.setColumnWidth(headers.indexOf(spec[0]) + 1, spec[1]);
      });
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#5f6368').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
    ['Task', 'Applicability', 'Anchor', 'Offset / Window', 'Dependencies',
      'Deliverable', 'Resource Links'].forEach(function(header) {
      var column = headers.indexOf(header) + 1;
      sheet.getRange(2, column, rows.length, 1).setWrap(true).setVerticalAlignment('top');
    });
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
    ['Anchor Date', 'Calculated Date', 'Due Date', 'Effective Date', 'Planned Week',
      'Completion Date'].forEach(function(header) {
      if (column[header]) {
        sheet.getRange(2, column[header], rowCount, 1)
          .setDataValidation(dateRule).setNumberFormat('yyyy-mm-dd');
      }
    });
  }

  /**
   * Grows the task table (never shrinks) so a subsequent direct write has
   * enough rows to target before any old rows are cleared. Splitting this
   * from the shrink half of sizeTaskSheet_ lets callers grow-then-write-
   * then-shrink instead of resize-then-write, so a write never targets a
   * range the sheet doesn't have yet.
   * @param {Sheet} sheet - Tasks sheet
   * @param {number} taskCount - Number of populated task rows
   */
  function growTaskSheetIfNeeded_(sheet, taskCount) {
    var desiredRows = Math.max(TASK_MIN_ROWS, Number(taskCount || 0) + 1 + TASK_ROW_BUFFER);
    var currentRows = sheet.getMaxRows();
    if (currentRows < desiredRows && sheet.insertRowsAfter) {
      sheet.insertRowsAfter(currentRows, desiredRows - currentRows);
    }
  }

  /**
   * Keeps the canonical task table large enough for generated/manual work
   * without leaving the default thousand-row validation/formatting surface.
   * @param {Sheet} sheet - Tasks sheet
   * @param {number} taskCount - Number of populated task rows
   */
  function sizeTaskSheet_(sheet, taskCount) {
    growTaskSheetIfNeeded_(sheet, taskCount);
    var desiredRows = Math.max(TASK_MIN_ROWS, Number(taskCount || 0) + 1 + TASK_ROW_BUFFER);
    var currentRows = sheet.getMaxRows();
    if (currentRows > desiredRows) {
      sheet.deleteRows(desiredRows + 1, currentRows - desiredRows);
    }
  }

  /**
   * Applies the durable table affordances needed for day-to-day task use.
   * Existing filters are retained so user filter criteria are not discarded.
   * @param {Sheet} sheet - Tasks sheet
   */
  function formatTasksSheet_(sheet) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var column = {};
    headers.forEach(function(header, index) {
      column[header] = index + 1;
    });
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold')
      .setWrap(true);
    sheet.setColumnWidths(1, headers.length, 120);

    [
      ['Workstream', 180], ['Stage', 150], ['Module', 170],
      ['Task', 360], ['Owner', 150], ['College', 180], ['Deliverable', 260],
      ['Applicability Rule', 220], ['Schedule Anchor', 220],
      ['Offset / Window', 160],
      ['Schedule Flag', 260], ['Priority Override', 130], ['Status', 110],
      ['Dependencies', 200], ['Blocked By', 200], ['Resource Links', 220],
      ['Evidence Source', 220], ['Notes', 280], ['Adjusted Effort (min)', 140],
      ['Effort Override (min)', 140],
    ].forEach(function(spec) {
      if (column[spec[0]]) sheet.setColumnWidth(column[spec[0]], spec[1]);
    });
    ['Anchor Date', 'Calculated Date', 'Due Date', 'Effective Date', 'Planned Week',
      'Completion Date'].forEach(function(header) {
      if (column[header]) sheet.setColumnWidth(column[header], 105);
    });
    ['Task', 'Applicability Rule', 'Schedule Anchor', 'Offset / Window',
      'Deliverable', 'Dependencies', 'Blocked By', 'Resource Links',
      'Evidence Source', 'Notes'].forEach(function(header) {
      if (column[header]) {
        sheet.getRange(2, column[header], Math.max(1, sheet.getMaxRows() - 1), 1)
          .setWrap(true).setVerticalAlignment('top');
      }
    });

    [
      'Task ID', 'Template ID', 'Scope Type', 'Scope ID', 'College ID',
      'Applicability Rule', 'Schedule Rule', 'Schedule Anchor', 'Anchor Date',
      'Offset / Window', 'Owner Role', 'Calculated Date', 'Effective Date',
      'Date Source', 'Normal Effort (min)', 'Manually Selected', 'Generated',
      'Archived Reason',
    ].forEach(function(header) {
      if (column[header] &&
          (!sheet.isColumnHiddenByUser || !sheet.isColumnHiddenByUser(column[header]))) {
        sheet.hideColumns(column[header]);
      }
    });

    if (column['Task ID']) {
      sheet.getRange(1, column['Task ID']).setNote(
        'Stable identity used to preserve this row through sorting and regeneration. ' +
        'For a custom task, leave this blank; refresh assigns it automatically.');
    }
    if (column.Task) {
      sheet.getRange(1, column.Task).setNote(
        'Generated tasks appear after Task Settings → Preview → Generate / Regenerate Task Plan. ' +
        'You may also add a custom task on any blank row; family-defined values are preserved.');
    }
    if (column['Owner Locked']) {
      sheet.getRange(1, column['Owner Locked']).setNote(
        'Set to Yes before regeneration to preserve the current owner.');
    }
    if (column['Date Locked']) {
      sheet.getRange(1, column['Date Locked']).setNote(
        'Set to Yes before regeneration to preserve Due Date and Planned Week.');
    }
    if (column['Effort Override (min)']) {
      sheet.getRange(1, column['Effort Override (min)']).setNote(
        'Optional task-specific effort; overrides the configured role multiplier.');
    }
    if (column['Priority Override']) {
      sheet.getRange(1, column['Priority Override']).setNote(
        'Optional family-selected priority; overrides the calculated deadline and dependency priority.');
    }
    if (column['Evidence Source']) {
      sheet.getRange(1, column['Evidence Source']).setNote(
        'Tracker-derived completion provenance. Correct the canonical tracker if this evidence is wrong.');
    }
    var desiredFilterRows = Math.max(2, sheet.getMaxRows());
    var filter = sheet.getFilter ? sheet.getFilter() : null;
    var filterRange = filter && filter.getRange ? filter.getRange() : null;
    var filterNeedsResize = filterRange &&
      (filterRange.getNumRows() !== desiredFilterRows ||
        filterRange.getNumColumns() !== headers.length);
    if (!filter || filterNeedsResize) {
      var criteria = {};
      if (filter && filter.getColumnFilterCriteria) {
        var existingFilterColumns = filterRange ? filterRange.getNumColumns() : 0;
        for (var filterColumn = 1;
          filterColumn <= Math.min(headers.length, existingFilterColumns);
          filterColumn++) {
          criteria[filterColumn] = filter.getColumnFilterCriteria(filterColumn);
        }
      }
      if (filter && filter.remove) filter.remove();
      filter = sheet.getRange(1, 1, desiredFilterRows, headers.length).createFilter();
      if (filter && filter.setColumnFilterCriteria) {
        Object.keys(criteria).forEach(function(filterColumnKey) {
          if (criteria[filterColumnKey]) {
            filter.setColumnFilterCriteria(Number(filterColumnKey), criteria[filterColumnKey]);
          }
        });
      }
    }
  }

  /**
   * Converts a Tasks row object to the planner model.
   * @param {Object} row - Header-keyed row
   * @param {boolean=} readOnly - Use deterministic in-memory identity for Preview
   * @returns {Object} Task
   */
  function rowToTask_(row, readOnly) {
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
    if (!task.taskId && row._hasValue) {
      task.taskId = readOnly ?
        'MANUAL::' + previewRowId_('TASK', row) : 'MANUAL::' + Utilities.getUuid();
      task.generated = false;
      task._newManualId = true;
    }
    if (!task.templateId && task.task) {
      task.generated = false;
      task.workstream = task.workstream || 'Custom';
      task.stage = task.stage || 'Family-defined';
      task.module = task.module || 'Custom';
      task.scopeType = task.scopeType || 'manual';
      task.scopeId = task.scopeId || task.taskId;
      task.applicabilityRule = task.applicabilityRule || 'Family-defined';
      task.scheduleRule = task.scheduleRule || 'Manual';
      task.scheduleAnchor = task.scheduleAnchor || 'Family-entered date or planned week';
      task.anchorDate = task.anchorDate || task.dueDate || task.plannedWeek;
      task.offsetWindow = task.offsetWindow || 'Family-defined';
      task.owner = task.owner || 'Unassigned';
      task.ownerRole = task.ownerRole || 'Custom';
      task.priority = task.priority || task.priorityOverride || 'Normal';
      task.status = task.status || 'Ready';
      if (!Number(task.adjustedEffortMinutes) && Number(task.effortOverrideMinutes) > 0) {
        task.adjustedEffortMinutes = Number(task.effortOverrideMinutes);
      }
      task.effectiveDate = task.effectiveDate || task.dueDate || task.plannedWeek;
      task._manualDefaults = true;
    }
    return task;
  }

  /**
   * Reads canonical task rows.
   * @param {Spreadsheet=} spreadsheet - Workbook
   * @param {boolean=} readOnly - Skip persisting manual-default backfills (for Preview)
   * @returns {Array<Object>} Tasks
   */
  function readTasks(spreadsheet, readOnly) {
    spreadsheet = spreadsheet || SpreadsheetApp.getActive();
    var sheet = spreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
    if (!sheet) return [];
    var tasks = readTable_(sheet).map(function(row) {
      return rowToTask_(row, readOnly);
    }).filter(function(task) {
      return !!task.taskId || !!task.task;
    });
    var manualDefaults = [
      'taskId', 'workstream', 'stage', 'module', 'scopeType', 'scopeId',
      'applicabilityRule', 'scheduleRule', 'scheduleAnchor', 'anchorDate',
      'offsetWindow', 'owner', 'ownerRole', 'effectiveDate', 'priority', 'status',
      'adjustedEffortMinutes', 'generated',
    ];
    var needsBackfill = !readOnly && tasks.some(function(task) {
      return (task._newManualId || task._manualDefaults) && task._sourceRow;
    });
    if (needsBackfill) {
      // Resolve the header-to-column map once (a single header read) and
      // batch each affected row into one read + one write, instead of a
      // per-field colIndex() (which itself re-reads the header row) plus a
      // per-cell getValue()/setValue() -- this is the hot path for every
      // edit to Tasks or any of the five wired tracker sheets.
      var lastColumn = Math.max(1, sheet.getLastColumn());
      var headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      var columnByHeader = {};
      headerValues.forEach(function(header, index) {
        var trimmed = (header || '').toString().trim();
        if (trimmed && columnByHeader[trimmed] === undefined) columnByHeader[trimmed] = index + 1;
      });
      var headerByField = {};
      TASK_FIELDS.forEach(function(field) {
        headerByField[field[1]] = field[0];
      });
      tasks.forEach(function(task) {
        if ((task._newManualId || task._manualDefaults) && task._sourceRow) {
          var rowValues = sheet.getRange(task._sourceRow, 1, 1, lastColumn).getValues()[0];
          var changed = false;
          manualDefaults.forEach(function(field) {
            var column = columnByHeader[headerByField[field]];
            if (column && rowValues[column - 1] === '') {
              rowValues[column - 1] = taskValue_(task, field, sheet);
              changed = true;
            }
          });
          if (changed) sheet.getRange(task._sourceRow, 1, 1, lastColumn).setValues([rowValues]);
        }
        delete task._newManualId;
        delete task._manualDefaults;
      });
    } else {
      tasks.forEach(function(task) {
        delete task._newManualId;
        delete task._manualDefaults;
      });
    }
    return tasks;
  }

  /**
   * Converts a task model value for spreadsheet output.
   * @param {Object} task - Task
   * @param {string} field - Field
   * @param {Sheet=} sheet - Optional destination for calendar-date conversion
   * @returns {*} Sheet value
   */
  function taskValue_(task, field, sheet) {
    var value = task[field];
    if (field === 'dependencies') return (value || []).join(', ');
    if (BOOLEAN_FIELDS[field]) return yesNo_(value);
    if (sheet && DATE_FIELDS[field]) return toSpreadsheetDate_(sheet, value);
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
        return taskValue_(task, field[1], sheet);
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
    var oldDataRows = oldLastRow > 1 ? oldLastRow - 1 : 0;
    // Grow (never shrink) before writing so the write always has enough
    // rows to target, then overwrite the shared row range directly instead
    // of clearing it first, then clear only the now-stale tail and shrink.
    // This way a mid-write exception (transient service error, quota) can
    // never leave the sheet with its Tasks content cleared and never
    // repopulated -- the old rows stay intact until their replacement is
    // written.
    growTaskSheetIfNeeded_(sheet, tasks.length);
    if (values.length) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    if (oldDataRows > values.length) {
      sheet.getRange(2 + values.length, 1, oldDataRows - values.length, headers.length).clearContent();
    }
    sizeTaskSheet_(sheet, tasks.length);
    applyTaskValidations_(sheet, CollegeTools.TaskPlanner.normalizeConfig(readConfig(spreadsheet)));
    formatTasksSheet_(sheet);
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
   * @param {boolean=} readOnly - Skip ID-assignment/column-merge writes (for Preview)
   * @returns {Object} Planner context
   */
  function buildContextFromWorkbook(spreadsheet, readOnly) {
    spreadsheet = spreadsheet || SpreadsheetApp.getActive();
    var names = CollegeTools.Config.SHEET_NAMES;
    var collegesSheet = spreadsheet.getSheetByName(names.COLLEGES);
    var scholarshipSheet = spreadsheet.getSheetByName(names.SCHOLARSHIP_TRACKER);
    var recruitingSheet = spreadsheet.getSheetByName(names.RECRUITING_TRACKER);
    if (!readOnly) {
      if (collegesSheet) CollegeTools.Utils.ensureHiddenLastColumn(collegesSheet, 'College ID', 2);
      ensureRowIds_(collegesSheet, 'College ID', 'College Name', 2, 'COL-');
      if (scholarshipSheet) {
        CollegeTools.Utils.ensureHiddenLastColumn(scholarshipSheet, 'Scholarship ID', 1);
      }
      ensureRowIds_(scholarshipSheet, 'Scholarship ID', 'Scholarship Name', 1, 'SCH-');
      ensureRowIds_(recruitingSheet, 'Recruiting Contact ID', 'College Name', 1, 'RC-');
    }

    var timeline = collegeLookup_(readTable_(spreadsheet.getSheetByName(names.APPLICATION_TIMELINE)));
    var status = collegeLookup_(readTable_(spreadsheet.getSheetByName(names.STATUS_TRACKER)));
    var financial = collegeLookup_(readTable_(spreadsheet.getSheetByName(names.FINANCIAL_AID)));
    var visitRows = readTable_(spreadsheet.getSheetByName(names.CAMPUS_VISIT));
    var visits = collegeLookup_(visitRows);
    var colleges = readTable_(collegesSheet, 2).map(function(row) {
      var name = (row['College Name'] || '').toString().trim();
      var id = row['College ID'] || (readOnly ? previewRowId_('COLLEGE', row) : '');
      if (!name || !id) return null;
      var timelineRow = trackerRow_(timeline, id, name);
      var statusRow = trackerRow_(status, id, name);
      var financialRow = trackerRow_(financial, id, name);
      var visitRow = trackerRow_(visits, id, name);
      var supplementalCountValue = timelineRow['Supplemental Essays Required (#)'];
      var supplementalTopics = timelineRow['Supplemental Prompts / Topics'];
      var supplementalCountKnown = supplementalCountValue !== '' &&
        supplementalCountValue !== null && supplementalCountValue !== undefined;
      var supplementalCount = supplementalCountKnown ?
        Math.max(0, Number(supplementalCountValue) || 0) : null;
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
        decisionDate: timelineRow['Decision Release Date'],
        decisionResult: statusRow['Decision/Result'],
        enrollmentChoice: statusRow['Enrollment Choice'],
        enrollmentDepositDeadline: timelineRow['Enrollment Deposit Deadline'],
        housingDepositDue: timelineRow['Housing Deposit Due'],
        portal: statusRow['App Portal'],
        documentsComplete: statusRow['Documents Complete'],
        portfolioRequired: statusRow['Portfolio Required (Y/N)'],
        portfolioSubmittedDate: statusRow['Portfolio Submitted (Date)'],
        interviewRequired: statusRow['Interview (Y/N)'],
        interviewDate: statusRow['Interview Date'],
        visitDate: visitRow['Visit Date'] || statusRow['Campus Visit Date'],
        supplementalCount: supplementalCount,
        supplementalPrompts: supplementalTopics,
        supplementsRequired: supplementalCountKnown ?
          supplementalCount > 0 || !!supplementalTopics : true,
      };
    }).filter(function(college) {
      return !!college;
    });

    var scholarships = readTable_(scholarshipSheet).map(function(row) {
      var id = row['Scholarship ID'] ||
        (readOnly ? previewRowId_('SCHOLARSHIP', row) : '');
      return {
        id: id,
        scholarshipId: id,
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
      var id = row['Recruiting Contact ID'] ||
        (readOnly ? previewRowId_('CONTACT', row) : '');
      return {
        id: id,
        contactId: id,
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
    var prompts = [];
    colleges.forEach(function(college) {
      if (!college.supplementsRequired) return;
      var topics = (college.supplementalPrompts || '').toString()
        .split(/\r?\n|\|\|/).map(function(topic) {
          return topic.trim();
        }).filter(function(topic) {
          return !!topic;
        });
      var promptCount = Math.max(Number(college.supplementalCount) || 0, topics.length);
      if (!promptCount) promptCount = 1;
      for (var promptIndex = 0; promptIndex < promptCount; promptIndex++) {
        var promptLabel = topics[promptIndex] ||
          'Supplemental response ' + (promptIndex + 1) + ' (prompt to confirm)';
        prompts.push({
          id: college.id + '-supplement-' + (promptIndex + 1),
          promptId: college.id + '-supplement-' + (promptIndex + 1),
          collegeId: college.id,
          collegeName: college.name,
          label: college.name + ' — ' + promptLabel,
          prompt: promptLabel,
          applicationDeadline: college.applicationDeadline,
        });
      }
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
      prompts: prompts,
      fafsaSubmitted: fafsaSubmitted,
      cssProfileSubmitted: cssSubmitted,
    };
  }

  /**
   * Summarizes the canonical Application Status Tracker for the weekly report.
   * @param {Spreadsheet} spreadsheet - Workbook
   * @returns {Object} Status and decision counts
   */
  function applicationStatusSummary_(spreadsheet) {
    var rows = readTable_(spreadsheet.getSheetByName(
      CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER));
    var summary = {
      tracked: 0,
      statuses: {},
      decisions: {},
    };
    rows.forEach(function(row) {
      if (!row['College Name'] && !row['College ID']) return;
      summary.tracked++;
      var status = (row['Application Status'] || 'Not Started').toString().trim();
      var decision = (row['Decision/Result'] || '').toString().trim();
      summary.statuses[status] = (summary.statuses[status] || 0) + 1;
      if (decision && decision !== 'Pending') {
        summary.decisions[decision] = (summary.decisions[decision] || 0) + 1;
      }
    });
    return summary;
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
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold')
      .setWrap(true).setVerticalAlignment('middle');
    [360, 110, 110, 90, 140, 180, 145, 120, 220, 260]
      .forEach(function(width, index) {
        sheet.setColumnWidth(index + 1, width);
      });
    var dueColumn = headers.indexOf('Due Date') + 1;
    var taskDateRanges = [];
    var rememberTaskRows = function(startRow, taskCount) {
      if (taskCount > 0) taskDateRanges.push({startRow: startRow, count: taskCount});
    };
    var styleSection = function(sectionRow, background) {
      sheet.getRange(sectionRow, 1, 1, headers.length)
        .setFontWeight('bold').setBackground(background);
    };
    var rowForTask = function(task) {
      return [
        task.task, toSpreadsheetDate_(sheet, task.dueDate) || '',
        task.status, task.priority, task.owner,
        task.college, task.adjustedEffortMinutes,
        yesNo_(task.decisionNeeded), task.scheduleFlag, task.taskId,
      ];
    };
    if (views.thisWeek.length) {
      sheet.getRange(2, 1, views.thisWeek.length, headers.length)
        .setValues(views.thisWeek.map(rowForTask));
      rememberTaskRows(2, views.thisWeek.length);
    } else {
      sheet.getRange(2, 1)
        .setValue('No current actions yet. Configure Task Settings, then generate the task plan.')
        .setFontStyle('italic').setFontColor('#666666');
    }
    var row = Math.max(13, views.thisWeek.length + 4);
    sheet.getRange(row, 1).setValue('Weekly Report');
    styleSection(row, '#d9ead3');
    row++;
    var categoryCoverage = Object.keys(views.thisWeekCategoryCounts || {}).map(function(category) {
      var counts = views.thisWeekCategoryCounts[category];
      return category + ' ' + counts.shown + '/' + counts.eligible;
    }).join('; ');
    var applicationSummary = applicationStatusSummary_(spreadsheet);
    var summarizeCounts = function(counts) {
      return Object.keys(counts).sort().map(function(label) {
        return label + ': ' + counts[label];
      }).join('; ') || 'None recorded';
    };
    var reportRows = [
      ['Master Plan', 'Canonical Tasks sheet — ' + views.masterPlan.length + ' active tasks'],
      ['Planning horizon', views.planningHorizon.label],
      ['Horizon emphasis', views.planningHorizon.emphasis],
      ['Current actions shown / eligible',
        views.thisWeek.length + ' / ' + views.thisWeekCandidateCount],
      ['Current actions omitted', views.thisWeekOmittedCount],
      ['Required category coverage', categoryCoverage],
      ['Active tasks', views.counts.active],
      ['Completed tasks', views.counts.complete],
      ['Completed this week', views.counts.completedThisWeek],
      ['Overdue tasks', views.counts.overdue],
      ['Blocked / waiting', views.counts.blocked],
      ['Decisions needed', views.counts.decisions],
      ['Deadlines within 21 days', views.counts.dueWithin21Days],
      ['Applications submitted / tracked',
        views.counts.applicationsSubmitted + ' / ' + views.counts.applicationsTracked],
      ['Application status breakdown', summarizeCounts(applicationSummary.statuses)],
      ['Decision results', summarizeCounts(applicationSummary.decisions)],
      ['Recruiting actions in rolling 90 days', views.counts.recruitingActions],
      ['Remaining baseline effort (hours)',
        Math.round((views.totalEffortMinutes / 60) * 10) / 10],
      ['Rolling 90-day open effort (hours)',
        Math.round((views.rolling90EffortMinutes / 60) * 10) / 10],
      ['Average scheduled week (hours)',
        Math.round((views.averageScheduledWeekMinutes / 60) * 10) / 10],
      ['Next-week effort (hours)',
        Math.round((views.nextWeekEffortMinutes / 60) * 10) / 10],
      ['Peak planned week', views.peakWeek],
      ['Peak-week effort (hours)', Math.round((views.peakWeekMinutes / 60) * 10) / 10],
      ['Capacity warnings', views.capacityWarnings.length],
    ];
    var reportStartRow = row;
    sheet.getRange(reportStartRow, 1, reportRows.length, 2).setValues(reportRows);
    sheet.getRange(reportStartRow, 1, reportRows.length, 1).setFontWeight('bold').setWrap(true);
    reportRows.forEach(function(report, index) {
      if (typeof report[1] !== 'number') return;
      var format = /\(hours\)$/.test(report[0]) ? '0.0' : '0';
      sheet.getRange(reportStartRow + index, 2).setNumberFormat(format);
    });
    row += reportRows.length + 2;
    var writeEffortBreakdown = function(title, values) {
      sheet.getRange(row, 1).setValue(title);
      styleSection(row, '#cfe2f3');
      row++;
      var rows = Object.keys(values).sort().map(function(label) {
        return [label, Math.round((values[label] / 60) * 10) / 10];
      });
      if (rows.length) {
        sheet.getRange(row, 1, rows.length, 2).setValues(rows);
        sheet.getRange(row, 2, rows.length, 1).setNumberFormat('0.0');
        row += rows.length;
      } else {
        sheet.getRange(row, 1).setValue('No task effort to summarize yet.')
          .setFontStyle('italic').setFontColor('#666666');
        row++;
      }
      row += 2;
    };
    writeEffortBreakdown('Effort By Owner', views.effortByOwner);
    writeEffortBreakdown('Effort By Role', views.effortByRole);
    writeEffortBreakdown('Effort By Planning Stage', views.effortByStage);
    writeEffortBreakdown('Effort By Module / Custom Category', views.effortByModule);
    writeEffortBreakdown('Effort By College', views.effortByCollege);
    if (views.capacityWarnings.length) {
      sheet.getRange(row, 1).setValue('Capacity Warnings');
      styleSection(row, '#f4cccc');
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
    sheet.getRange(row, 1).setValue('Rolling 90 Days');
    styleSection(row, '#fce5cd');
    row++;
    sheet.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    row++;
    if (views.rolling90.length) {
      sheet.getRange(row, 1, views.rolling90.length, headers.length)
        .setValues(views.rolling90.map(rowForTask));
      rememberTaskRows(row, views.rolling90.length);
      row += views.rolling90.length;
    } else {
      sheet.getRange(row, 1).setValue('No open tasks due in the next 90 days.')
        .setFontStyle('italic').setFontColor('#666666');
      row++;
    }
    row += 2;
    var writeTaskList = function(title, tasks) {
      sheet.getRange(row, 1).setValue(title);
      styleSection(row, '#d9d2e9');
      row++;
      sheet.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      row++;
      if (tasks.length) {
        sheet.getRange(row, 1, tasks.length, headers.length).setValues(tasks.map(rowForTask));
        rememberTaskRows(row, tasks.length);
        row += tasks.length;
      } else {
        sheet.getRange(row, 1).setValue('No matching open tasks.');
        row++;
      }
      row += 2;
    };
    writeTaskList('Owner View — open tasks sorted by owner', views.ownerView);
    writeTaskList('College View — open college-linked tasks', views.collegeView);
    taskDateRanges.forEach(function(taskRange) {
      sheet.getRange(taskRange.startRow, dueColumn, taskRange.count, 1)
        .setNumberFormat('yyyy-mm-dd');
    });
    var bodyRows = Math.max(1, sheet.getLastRow() - 1);
    sheet.getRange(2, 1, bodyRows, 1).setWrap(true).setVerticalAlignment('top');
    sheet.getRange(2, headers.indexOf('Task') + 1, bodyRows, 1)
      .setWrap(true).setVerticalAlignment('top');
    sheet.getRange(2, headers.indexOf('Schedule Flag') + 1, bodyRows, 1)
      .setWrap(true).setVerticalAlignment('top');
    var taskIdColumn = headers.indexOf('Task ID') + 1;
    if (!sheet.isColumnHiddenByUser || !sheet.isColumnHiddenByUser(taskIdColumn)) {
      sheet.hideColumns(taskIdColumn);
    }
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
    sizeTaskSheet_(tasksSheet, readTasks(spreadsheet).length);
    applyTaskValidations_(tasksSheet, config);
    formatTasksSheet_(tasksSheet);
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
   * Calculates a reconfiguration preview without changing the workbook.
   * @returns {Object} Preview result
   */
  function previewTaskPlan() {
    var spreadsheet = SpreadsheetApp.getActive();
    var settingsSheet = spreadsheet.getSheetByName(
      CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS);
    if (!hasHeaders_(settingsSheet, CollegeTools.Config.HEADERS.TASK_SETTINGS)) {
      return {
        ok: false,
        code: 'task_management_not_setup',
        errors: ['Run Task Management Setup before previewing the task plan.'],
      };
    }
    var config = readConfig(spreadsheet);
    var context = buildContextFromWorkbook(spreadsheet, true);
    var generated = CollegeTools.TaskPlanner.generatePlan(config, context);
    if (!generated.ok) return generated;
    var reconciled = CollegeTools.TaskPlanner.reconcile(generated.tasks, readTasks(spreadsheet, true));
    return {
      ok: true,
      code: 'task_plan_preview',
      message: 'Task plan preview complete',
      preview: reconciled.preview,
      generatedCount: generated.tasks.length,
      applicableTemplateCount: generated.applicableTemplateCount,
      excludedTemplateCount: generated.excludedTemplateCount,
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
      excludedTemplateCount: generated.excludedTemplateCount,
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
