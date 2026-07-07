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

  getValue() {
    return this.sheet.getCellValue(this.row, this.col);
  }

  setValue(value) {
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
    this.sheet.callCounts.setFormula++;
    this.sheet.setCellFormula(this.row, this.col, formula);
    return this;
  }

  setFormulas(formulas) {
    this.sheet.callCounts.setFormulas++;
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCellFormula(this.row + r, this.col + c, formulas[r][c]);
      }
    }
    return this;
  }

  clearContent() {
    this._forEachCell((row, col) => {
      this.sheet.setCellValue(row, col, '');
      this.sheet.setCellFormula(row, col, '');
    });
    return this;
  }

  setDataValidation(rule) {
    this._forEachCell((row, col) => {
      this.sheet.setCellValidation(row, col, rule);
    });
    return this;
  }

  getDataValidation() {
    return this.sheet.getCellValidation(this.row, this.col);
  }

  setDataValidations(grid) {
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
    this.sheet.callCounts.setNumberFormats++;
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCellFormat(this.row + r, this.col + c, grid[r][c]);
      }
    }
    return this;
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontSize() { return this; }
  setFontColor() { return this; }
  setFontStyle() { return this; }
  setBorder() { return this; }
  setNote(note) {
    this._forEachCell((row, col) => {
      this.sheet.setCellNote(row, col, note);
    });
    return this;
  }
  getNote() {
    return this.sheet.getCellNote(this.row, this.col);
  }
  setNumberFormat(pattern) {
    this._forEachCell((row, col) => {
      this.sheet.setCellFormat(row, col, pattern);
    });
    return this;
  }
  merge() { return this; }
  setWrap() { return this; }
  setVerticalAlignment() { return this; }
  setHorizontalAlignment() { return this; }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.values = {};
    this.formulas = {};
    this.validations = {};
    this.callCounts = {getFormula: 0, getFormulas: 0, setValue: 0, setValues: 0, setFormula: 0, setFormulas: 0, setDataValidations: 0, setNumberFormats: 0};
    this.activeRow = 3;
    this.maxRows = 1000;
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

  resetCallCounts() {
    this.callCounts = {getFormula: 0, getFormulas: 0, setValue: 0, setValues: 0, setFormula: 0, setFormulas: 0, setDataValidations: 0, setNumberFormats: 0};
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
    this.values = {};
    this.formulas = {};
    this.validations = {};
    this.callCounts = {getFormula: 0, getFormulas: 0, setValue: 0, setValues: 0, setFormula: 0, setFormulas: 0, setDataValidations: 0, setNumberFormats: 0};
    return this;
  }

  setColumnWidth() { return this; }
  setColumnWidths() { return this; }
  setFrozenRows() { return this; }
  autoResizeColumn() { return this; }
  insertColumnBefore(column) {
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
  deleteRows() { return this; }
  setConditionalFormatRules() { return this; }
  getConditionalFormatRules() { return []; }
  clearConditionalFormatRules() { return this; }
  protect() {
    return {
      setDescription: () => {},
      setUnprotectedRanges: () => {},
    };
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    this.activeSheetName = null;
    this.namedRanges = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets[name] = sheet;
    if (!this.activeSheetName) this.activeSheetName = name;
    return sheet;
  }

  getActiveSheet() {
    return this.sheets[this.activeSheetName];
  }

  setActiveSheet(sheet) {
    this.activeSheetName = sheet.getName();
  }

  moveActiveSheet() {}
  setNamedRange(name, range) {
    this.namedRanges[name] = {row: range.row, col: range.col};
  }
  toast() {}
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

  global.Utilities = {sleep: () => {}};
  global.CollegeTools = {};

  (moduleFiles || []).forEach(loadModule);

  function resetSheets() {
    mockSpreadsheet.sheets = {};
    mockSpreadsheet.activeSheetName = null;
    mockSpreadsheet.namedRanges = {};
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
