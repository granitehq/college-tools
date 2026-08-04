const fs = require('fs');
const path = require('path');

function columnToNumber(label) {
  let value = 0;
  for (let i = 0; i < label.length; i++) {
    value = value * 26 + (label.charCodeAt(i) - 64);
  }
  return value;
}

function parseA1(a1) {
  const match = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(a1);
  if (!match) {
    throw new Error(`Unsupported A1 notation: ${a1}`);
  }

  const startCol = columnToNumber(match[1]);
  const startRow = parseInt(match[2], 10);
  const endCol = match[3] ? columnToNumber(match[3]) : startCol;
  const endRow = match[4] ? parseInt(match[4], 10) : startRow;

  return {
    row: startRow,
    col: startCol,
    numRows: endRow - startRow + 1,
    numCols: endCol - startCol + 1,
    a1,
  };
}

class MockRange {
  constructor(sheet, row, col, numRows, numCols, a1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows || 1;
    this.numCols = numCols || 1;
    this.a1 = a1 || null;
  }

  _forEachCell(fn) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        fn(this.row + r, this.col + c);
      }
    }
  }

  _recordMutation() {
    this.sheet._recordMutation();
  }

  getValue() {
    return this.sheet.getCellValue(this.row, this.col);
  }

  getSheet() { return this.sheet; }
  getRow() { return this.row; }
  getLastRow() { return this.row + this.numRows - 1; }
  getColumn() { return this.col; }
  getLastColumn() { return this.col + this.numCols - 1; }
  getNumRows() { return this.numRows; }
  getNumColumns() { return this.numCols; }

  setValue(value) {
    this._recordMutation();
    this.sheet.callCounts.setValue++;
    this.sheet.setCellValue(this.row, this.col, value);
    this.sheet.setCellFormula(this.row, this.col, '');
    return this;
  }

  getValues() {
    const values = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowValues = [];
      for (let c = 0; c < this.numCols; c++) {
        rowValues.push(this.sheet.getCellValue(this.row + r, this.col + c));
      }
      values.push(rowValues);
    }
    return values;
  }

  setValues(values) {
    if (!Array.isArray(values) || values.length !== this.numRows ||
        values.some((row) => !Array.isArray(row) || row.length !== this.numCols)) {
      throw new Error(
        `setValues dimensions must match ${this.numRows}x${this.numCols}`);
    }
    this._recordMutation();
    this.sheet.callCounts.setValues++;
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        if (typeof values[r][c] === 'string' && values[r][c].charAt(0) === '=') {
          this.sheet.setCellValue(this.row + r, this.col + c, '');
          this.sheet.setCellFormula(this.row + r, this.col + c, values[r][c]);
        } else {
          this.sheet.setCellValue(this.row + r, this.col + c, values[r][c]);
          this.sheet.setCellFormula(this.row + r, this.col + c, '');
        }
      }
    }
    return this;
  }

  getFormula() {
    this.sheet.callCounts.getFormula++;
    return this.sheet.getCellFormula(this.row, this.col);
  }

  getFormulas() {
    this.sheet.callCounts.getFormulas++;
    const formulas = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowFormulas = [];
      for (let c = 0; c < this.numCols; c++) {
        rowFormulas.push(this.sheet.getCellFormula(this.row + r, this.col + c));
      }
      formulas.push(rowFormulas);
    }
    return formulas;
  }

  setFormula(formula) {
    this._recordMutation();
    this.sheet.callCounts.setFormula++;
    this.sheet.setCellFormula(this.row, this.col, formula);
    return this;
  }

  setFormulas(formulas) {
    if (!Array.isArray(formulas) || formulas.length !== this.numRows ||
        formulas.some((row) => !Array.isArray(row) || row.length !== this.numCols)) {
      throw new Error(
        `setFormulas dimensions must match ${this.numRows}x${this.numCols}`);
    }
    this._recordMutation();
    this.sheet.callCounts.setFormulas++;
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCellFormula(this.row + r, this.col + c, formulas[r][c]);
      }
    }
    return this;
  }

  clearContent() {
    this._recordMutation();
    this._forEachCell((row, col) => {
      this.sheet.setCellValue(row, col, '');
      this.sheet.setCellFormula(row, col, '');
    });
    return this;
  }

  setDataValidation(rule) {
    this._recordMutation();
    this._forEachCell((row, col) => {
      this.sheet.setCellValidation(row, col, rule);
    });
    return this;
  }

  getDataValidation() {
    return this.sheet.getCellValidation(this.row, this.col);
  }

  setDataValidations(grid) {
    this._recordMutation();
    this.sheet.callCounts.setDataValidations++;
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCellValidation(this.row + r, this.col + c, grid[r][c]);
      }
    }
    return this;
  }

  getDataValidations() {
    const grid = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowRules = [];
      for (let c = 0; c < this.numCols; c++) {
        rowRules.push(this.sheet.getCellValidation(this.row + r, this.col + c));
      }
      grid.push(rowRules);
    }
    return grid;
  }

  getNumberFormats() {
    const grid = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowFmts = [];
      for (let c = 0; c < this.numCols; c++) {
        rowFmts.push(this.sheet.getCellFormat(this.row + r, this.col + c));
      }
      grid.push(rowFmts);
    }
    return grid;
  }

  setNumberFormats(grid) {
    this._recordMutation();
    this.sheet.callCounts.setNumberFormats++;
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCellFormat(this.row + r, this.col + c, grid[r][c]);
      }
    }
    return this;
  }

  setFontWeight() { this._recordMutation(); return this; }
  setBackground() { this._recordMutation(); return this; }
  setFontSize() { this._recordMutation(); return this; }
  setFontColor() { this._recordMutation(); return this; }
  setFontStyle() { this._recordMutation(); return this; }
  setBorder() { this._recordMutation(); return this; }
  setNote(note) {
    this._recordMutation();
    this._forEachCell((row, col) => {
      this.sheet.setCellNote(row, col, note);
    });
    return this;
  }
  getNote() {
    return this.sheet.getCellNote(this.row, this.col);
  }
  setNumberFormat(pattern) {
    this._recordMutation();
    this._forEachCell((row, col) => {
      this.sheet.setCellFormat(row, col, pattern);
    });
    return this;
  }
  merge() { this._recordMutation(); return this; }
  setWrap() { this._recordMutation(); return this; }
  setVerticalAlignment() { this._recordMutation(); return this; }
  setHorizontalAlignment() { this._recordMutation(); return this; }
  createFilter() {
    this._recordMutation();
    const criteria = {};
    this.sheet.filter = {
      range: this,
      getRange: () => this,
      getColumnFilterCriteria: (column) => {
        if (column < 1 || column > this.numCols) {
          throw new Error('Those columns are out of bounds.');
        }
        return criteria[column] || null;
      },
      setColumnFilterCriteria(column, value) {
        criteria[column] = value;
        return this;
      },
      remove: () => {
        this.sheet.filter = null;
      },
    };
    return this.sheet.filter;
  }
}

class MockSheet {
  constructor(name, spreadsheet) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.values = {};
    this.formulas = {};
    this.validations = {};
    this.callCounts = {getFormula: 0, getFormulas: 0, setValue: 0, setValues: 0, setFormula: 0, setFormulas: 0, setDataValidations: 0, setNumberFormats: 0};
    this.hiddenColumns = new Set();
    this.hidden = false;
    this.filter = null;
    this.activeRow = 3;
    this.maxRows = 1000;
    this.mutationCount = 0;
  }

  _recordMutation() {
    this.mutationCount++;
    this.spreadsheet.mutationCount++;
  }

  _key(row, col) {
    return `${row},${col}`;
  }

  getCellValue(row, col) {
    const key = this._key(row, col);
    return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : '';
  }

  setCellValue(row, col, value) {
    this.values[this._key(row, col)] = value;
  }

  getCellFormula(row, col) {
    const key = this._key(row, col);
    return Object.prototype.hasOwnProperty.call(this.formulas, key) ? this.formulas[key] : '';
  }

  setCellFormula(row, col, formula) {
    this.formulas[this._key(row, col)] = formula;
  }

  setCellValidation(row, col, rule) {
    this.validations[this._key(row, col)] = rule;
  }

  getCellValidation(row, col) {
    return this.validations[this._key(row, col)] || null;
  }

  setCellFormat(row, col, pattern) {
    this.formats = this.formats || {};
    this.formats[this._key(row, col)] = pattern;
  }

  getCellFormat(row, col) {
    this.formats = this.formats || {};
    const key = this._key(row, col);
    return Object.prototype.hasOwnProperty.call(this.formats, key) ? this.formats[key] : '';
  }

  setCellNote(row, col, note) {
    this.notes = this.notes || {};
    this.notes[this._key(row, col)] = note;
  }

  getCellNote(row, col) {
    this.notes = this.notes || {};
    const key = this._key(row, col);
    return Object.prototype.hasOwnProperty.call(this.notes, key) ? this.notes[key] : '';
  }

  getRange(rowOrA1, col, numRows, numCols) {
    if (typeof rowOrA1 === 'string') {
      const parsed = parseA1(rowOrA1);
      return new MockRange(this, parsed.row, parsed.col, parsed.numRows, parsed.numCols, parsed.a1);
    }
    return new MockRange(this, rowOrA1, col, numRows || 1, numCols || 1);
  }

  getLastColumn() {
    const cols = Object.keys(this.values)
      .concat(Object.keys(this.formulas))
      .map((key) => parseInt(key.split(',')[1], 10));
    return cols.length ? Math.max.apply(null, cols) : 1;
  }

  getLastRow() {
    const rows = Object.keys(this.values)
      .concat(Object.keys(this.formulas))
      .map((key) => parseInt(key.split(',')[0], 10));
    return rows.length ? Math.max.apply(null, rows) : 1;
  }

  getMaxRows() {
    return this.maxRows;
  }

  getName() {
    return this.name;
  }

  getIndex() {
    return this.spreadsheet.getSheets().indexOf(this) + 1;
  }

  resetCallCounts() {
    this.callCounts = {getFormula: 0, getFormulas: 0, setValue: 0, setValues: 0, setFormula: 0, setFormulas: 0, setDataValidations: 0, setNumberFormats: 0};
  }

  resetMutationCount() {
    this.mutationCount = 0;
  }

  getActiveCell() {
    return {
      getRow: () => this.activeRow,
    };
  }

  setActiveRow(row) {
    this.activeRow = row;
  }

  clear() {
    this._recordMutation();
    this.values = {};
    this.formulas = {};
    this.validations = {};
    this.callCounts = {getFormula: 0, getFormulas: 0, setValue: 0, setValues: 0, setFormula: 0, setFormulas: 0, setDataValidations: 0, setNumberFormats: 0};
    return this;
  }

  setColumnWidth() { this._recordMutation(); return this; }
  setColumnWidths() { this._recordMutation(); return this; }
  setFrozenRows() { this._recordMutation(); return this; }
  getFilter() { return this.filter; }
  autoResizeColumn() { this._recordMutation(); return this; }
  autoResizeColumns() { this._recordMutation(); return this; }
  hideColumns(column, numColumns) {
    this._recordMutation();
    const count = numColumns || 1;
    for (let c = column; c < column + count; c++) this.hiddenColumns.add(c);
    return this;
  }
  isColumnHiddenByUser(column) {
    return this.hiddenColumns.has(column);
  }
  moveColumns(range, destinationIndex) {
    this._recordMutation();
    if (range.numCols !== 1) throw new Error('Mock moveColumns currently supports one column');
    const sourceColumn = range.col;
    const lastColumn = this.getLastColumn();
    const targetColumn = destinationIndex > sourceColumn ? destinationIndex - 1 : destinationIndex;
    const remap = (column) => {
      if (column === sourceColumn) return targetColumn;
      if (sourceColumn < targetColumn && column > sourceColumn && column <= targetColumn) return column - 1;
      if (sourceColumn > targetColumn && column >= targetColumn && column < sourceColumn) return column + 1;
      return column;
    };
    const moveMap = (source) => {
      const moved = {};
      Object.keys(source).forEach((key) => {
        const [row, column] = key.split(',').map((part) => parseInt(part, 10));
        moved[this._key(row, remap(column))] = source[key];
      });
      return moved;
    };
    this.values = moveMap(this.values);
    this.formulas = moveMap(this.formulas);
    this.validations = moveMap(this.validations);
    this.formats = moveMap(this.formats || {});
    this.notes = moveMap(this.notes || {});
    const hidden = new Set();
    this.hiddenColumns.forEach((column) => hidden.add(remap(column)));
    this.hiddenColumns = hidden;
    if (targetColumn > lastColumn) throw new Error('Invalid mock move destination');
    return this;
  }
  insertColumnBefore(column) {
    this._recordMutation();
    const shiftMap = (source) => {
      const shifted = {};
      Object.keys(source).forEach((key) => {
        const [row, col] = key.split(',').map((part) => parseInt(part, 10));
        const nextCol = col >= column ? col + 1 : col;
        shifted[this._key(row, nextCol)] = source[key];
      });
      return shifted;
    };
    this.values = shiftMap(this.values);
    this.formulas = shiftMap(this.formulas);
    this.validations = shiftMap(this.validations);
    return this;
  }
  deleteColumn(column) {
    return this.deleteColumns(column, 1);
  }
  deleteColumns(startColumn, howMany) {
    this._recordMutation();
    const endColumn = startColumn + howMany - 1;
    const shiftMap = (source) => {
      const shifted = {};
      Object.keys(source).forEach((key) => {
        const [row, col] = key.split(',').map((part) => parseInt(part, 10));
        if (col >= startColumn && col <= endColumn) return;
        const nextCol = col > endColumn ? col - howMany : col;
        shifted[this._key(row, nextCol)] = source[key];
      });
      return shifted;
    };
    this.values = shiftMap(this.values);
    this.formulas = shiftMap(this.formulas);
    this.validations = shiftMap(this.validations);
    this.formats = shiftMap(this.formats || {});
    this.notes = shiftMap(this.notes || {});
    const hidden = new Set();
    this.hiddenColumns.forEach((col) => {
      if (col < startColumn) hidden.add(col);
      else if (col > endColumn) hidden.add(col - howMany);
    });
    this.hiddenColumns = hidden;
    return this;
  }
  insertRowsAfter(afterPosition, howMany) {
    this._recordMutation();
    if (afterPosition !== this.maxRows) {
      throw new Error('Mock insertRowsAfter only supports appending rows');
    }
    this.maxRows += howMany;
    return this;
  }
  deleteRows(startRow, howMany) {
    this._recordMutation();
    const endRow = startRow + howMany - 1;
    const shiftMap = (source) => {
      const shifted = {};
      Object.keys(source).forEach((key) => {
        const [row, col] = key.split(',').map((part) => parseInt(part, 10));
        if (row >= startRow && row <= endRow) return;
        const nextRow = row > endRow ? row - howMany : row;
        shifted[this._key(nextRow, col)] = source[key];
      });
      return shifted;
    };
    this.values = shiftMap(this.values);
    this.formulas = shiftMap(this.formulas);
    this.validations = shiftMap(this.validations);
    this.formats = shiftMap(this.formats || {});
    this.notes = shiftMap(this.notes || {});
    this.maxRows -= howMany;
    return this;
  }
  setConditionalFormatRules() { this._recordMutation(); return this; }
  getConditionalFormatRules() { return []; }
  clearConditionalFormatRules() { this._recordMutation(); return this; }
  protect() {
    this._recordMutation();
    return {
      setDescription: () => {},
      setUnprotectedRanges: () => {},
      setWarningOnly: () => {},
    };
  }
  hideSheet() { this._recordMutation(); this.hidden = true; return this; }
  showSheet() { this._recordMutation(); this.hidden = false; return this; }
  isSheetHidden() { return this.hidden; }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    this.sheetOrder = [];
    this.activeSheetName = null;
    this.namedRanges = {};
    this.toasts = [];
    this.mutationCount = 0;
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name, sheetIndex) {
    this.mutationCount++;
    const sheet = new MockSheet(name, this);
    this.sheets[name] = sheet;
    if (typeof sheetIndex === 'number') {
      this.sheetOrder.splice(sheetIndex, 0, sheet);
    } else {
      this.sheetOrder.push(sheet);
    }
    if (!this.activeSheetName) this.activeSheetName = name;
    return sheet;
  }

  getSheets() {
    return this.sheetOrder.slice();
  }

  getActiveSheet() {
    return this.sheets[this.activeSheetName];
  }

  setActiveSheet(sheet) {
    this.mutationCount++;
    this.activeSheetName = sheet.getName();
  }

  moveActiveSheet() { this.mutationCount++; }
  setNamedRange(name, range) {
    this.mutationCount++;
    this.namedRanges[name] = {row: range.row, col: range.col};
  }
  toast(message, title, duration) {
    this.toasts.push({message, title, duration});
  }

  resetMutationCount() {
    this.mutationCount = 0;
    this.getSheets().forEach((sheet) => sheet.resetMutationCount());
  }
}

function createValidationBuilder() {
  return {
    requireValueInList(options) {
      this.ruleType = 'list';
      this.options = options;
      return this;
    },
    requireValueInRange(range) {
      this.ruleType = 'range';
      this.sourceRange = range.a1;
      this.sourceSheet = range.sheet.getName();
      return this;
    },
    requireDate() {
      this.ruleType = 'date';
      return this;
    },
    setAllowInvalid(value) {
      this.allowInvalid = value;
      return this;
    },
    build() {
      return {
        ruleType: this.ruleType,
        options: this.options || null,
        sourceRange: this.sourceRange || null,
        sourceSheet: this.sourceSheet || null,
        allowInvalid: this.allowInvalid,
      };
    },
  };
}

function createFormatRuleBuilder() {
  return {
    whenTextContains() { return this; },
    whenTextEqualTo() { return this; },
    whenNumberGreaterThan() { return this; },
    whenNumberBetween() { return this; },
    whenNumberLessThan() { return this; },
    whenNumberLessThanOrEqualTo() { return this; },
    setBackground() { return this; },
    setFontColor() { return this; },
    setRanges() { return this; },
    build() { return {}; },
  };
}

function loadModule(filename) {
  const filePath = path.join(__dirname, '..', 'src', filename);
  const content = fs.readFileSync(filePath, 'utf8')
    .replace(/var CollegeTools\s*=\s*CollegeTools\s*\|\|\s*\{\};/g, '');
  eval(content);
}

function createHarness(moduleFiles) {
  const mockSpreadsheet = new MockSpreadsheet();
  const mockUi = {
    alerts: [],
    Button: { YES: 'YES', NO: 'NO', OK: 'OK' },
    ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
    alert(title, message, buttons) {
      this.alerts.push({title, message, buttons});
      return this.Button.YES;
    },
    createMenu() {
      return {
        addItem() { return this; },
        addSeparator() { return this; },
        addSubMenu() { return this; },
        addToUi() { return this; },
      };
    },
  };

  global.SpreadsheetApp = {
    getActive: () => mockSpreadsheet,
    getUi: () => mockUi,
    newDataValidation: () => createValidationBuilder(),
    newConditionalFormatRule: () => createFormatRuleBuilder(),
  };

  let uuidCounter = 0;
  global.Utilities = {
    sleep: () => {},
    getUuid: () => {
      uuidCounter += 1;
      return `uuid-${uuidCounter}`;
    },
  };
  global.CollegeTools = {};

  (moduleFiles || []).forEach(loadModule);

  function resetSheets() {
    mockSpreadsheet.sheets = {};
    mockSpreadsheet.sheetOrder = [];
    mockSpreadsheet.activeSheetName = null;
    mockSpreadsheet.namedRanges = {};
    mockSpreadsheet.toasts = [];
    mockSpreadsheet.mutationCount = 0;
    mockUi.alerts = [];
  }

  function ensureSheetWithHeaders(name, headers, headerRow) {
    const sheet = mockSpreadsheet.insertSheet(name);
    sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  function setupWorkbook(options) {
    options = options || {};
    resetSheets();

    const collegeHeaders = CollegeTools.Config.HEADERS.COLLEGES.slice();
    if (options.includeCampusSetting) {
      collegeHeaders.push('Campus Setting');
    }

    const colleges = ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.COLLEGES, collegeHeaders, 2);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID,
      CollegeTools.Config.HEADERS.FINANCIAL_AID, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER,
      CollegeTools.Config.HEADERS.TRAVEL_PLANNER, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT,
      CollegeTools.Config.HEADERS.CAMPUS_VISIT, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE,
      CollegeTools.Config.HEADERS.APPLICATION_TIMELINE, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER,
      CollegeTools.Config.HEADERS.STATUS_TRACKER, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER,
      CollegeTools.Config.HEADERS.SCHOLARSHIP_TRACKER, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS,
      CollegeTools.Config.HEADERS.TASK_SETTINGS, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.TASKS,
      CollegeTools.Config.HEADERS.TASKS, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.TASK_TEMPLATES,
      CollegeTools.Config.HEADERS.TASK_TEMPLATES, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.THIS_WEEK,
      CollegeTools.Config.HEADERS.THIS_WEEK, 1);
    ensureSheetWithHeaders(CollegeTools.Config.SHEET_NAMES.LOOKUP, ['Official Name'], 1);

    mockSpreadsheet.setActiveSheet(colleges);
    colleges.setActiveRow(3);
    return {colleges};
  }

  function getCollegeColumn(header, collegesSheet) {
    const headers = collegesSheet.getRange(2, 1, 1, collegesSheet.getLastColumn()).getValues()[0];
    return headers.indexOf(header) + 1;
  }

  return {
    mockSpreadsheet,
    mockUi,
    CollegeTools: global.CollegeTools,
    resetSheets,
    ensureSheetWithHeaders,
    setupWorkbook,
    getCollegeColumn,
    loadModule,
    resetUuidCounter: () => {
      uuidCounter = 0;
    },
  };
}

class TestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  test(name, fn) {
    try {
      fn();
      console.log(`PASS ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`FAIL ${name}: ${error.message}`);
      this.failed++;
      this.errors.push({name, error: error.message});
    }
  }

  assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message} (expected ${expected}, got ${actual})`);
    }
  }

  summary() {
    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    if (this.failed) {
      this.errors.forEach((entry) => {
        console.log(`- ${entry.name}: ${entry.error}`);
      });
    }
    return this.failed === 0;
  }
}

module.exports = {
  createHarness,
  TestSuite,
};
