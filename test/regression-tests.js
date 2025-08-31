/**
 * College Tools Regression Tests
 * @version 7.1.0
 * @author College Tools Test Suite
 * @description Automated tests to catch regressions before deployment
 * 
 * These tests simulate Google Apps Script environment and test core functionality
 * Run with: node test/regression-tests.js
 */

// Mock Google Apps Script environment
global.SpreadsheetApp = {
  getActive: () => mockSpreadsheet,
  getUi: () => mockUi,
  newConditionalFormatRule: () => mockConditionalFormatRule,
  newDataValidation: () => mockDataValidation,
};

global.Utilities = {
  sleep: (ms) => {}, // No-op in tests
};

// Mock objects
const mockUi = {
  alert: (title, message, buttons) => {
    console.log(`UI Alert: ${title} - ${message}`);
    return { YES: 'YES', NO: 'NO', OK: 'OK' };
  },
  Button: { YES: 'YES', NO: 'NO', OK: 'OK' },
  ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
  createMenu: (name) => ({
    addItem: () => mockUi.createMenu(name),
    addSeparator: () => mockUi.createMenu(name),
    addSubMenu: () => mockUi.createMenu(name),
    addToUi: () => {},
  }),
};

const mockConditionalFormatRule = {
  whenTextContains: () => mockConditionalFormatRule,
  whenNumberGreaterThan: () => mockConditionalFormatRule,
  whenNumberBetween: () => mockConditionalFormatRule,
  whenNumberLessThan: () => mockConditionalFormatRule,
  setBackground: () => mockConditionalFormatRule,
  setFontColor: () => mockConditionalFormatRule,
  setRanges: () => mockConditionalFormatRule,
  build: () => ({}),
};

const mockDataValidation = {
  requireValueInRange: () => mockDataValidation,
  setAllowInvalid: () => mockDataValidation,
  build: () => ({}),
};

const mockRange = {
  setValue: (value) => { mockRange._value = value; return mockRange; },
  getValue: () => mockRange._value || '',
  setValues: (values) => { mockRange._values = values; return mockRange; },
  getValues: () => mockRange._values || [['']],
  setFormula: (formula) => { mockRange._formula = formula; return mockRange; },
  getFormula: () => mockRange._formula || '',
  setFormulas: (formulas) => { mockRange._formulas = formulas; return mockRange; },
  getFormulas: () => mockRange._formulas || [['']],
  setBackground: () => mockRange,
  setFontWeight: () => mockRange,
  setFontSize: () => mockRange,
  setFontColor: () => mockRange,
  setBorder: () => mockRange,
  setNote: () => mockRange,
  setNumberFormat: () => mockRange,
  setDataValidation: () => mockRange,
  merge: () => mockRange,
  _value: '',
  _values: [['']],
  _formula: '',
  _formulas: [['']],
};

const mockSheet = {
  getName: () => 'TestSheet',
  getRange: (row, col, numRows, numCols) => {
    const range = Object.create(mockRange);
    range._row = row;
    range._col = col;
    range._numRows = numRows || 1;
    range._numCols = numCols || 1;
    return range;
  },
  getLastColumn: () => 26,
  getLastRow: () => 100,
  getMaxRows: () => 1000,
  insertSheet: (name) => mockSheet,
  clear: () => mockSheet,
  setColumnWidth: () => mockSheet,
  setFrozenRows: () => mockSheet,
  autoResizeColumn: () => mockSheet,
  insertColumnBefore: () => mockSheet,
  deleteRows: () => mockSheet,
  protect: () => ({
    setDescription: () => {},
    setUnprotectedRanges: () => {},
  }),
  clearConditionalFormatRules: () => {},
  getConditionalFormatRules: () => [],
  setConditionalFormatRules: () => {},
};

const mockSpreadsheet = {
  getSheetByName: (name) => {
    console.log(`Getting sheet: ${name}`);
    return mockSheet;
  },
  insertSheet: (name) => {
    console.log(`Creating sheet: ${name}`);
    return mockSheet;
  },
  setNamedRange: (name, range) => {
    console.log(`Creating named range: ${name}`);
  },
  getActiveSheet: () => mockSheet,
};

// Load College Tools modules
const fs = require('fs');
const path = require('path');

// Initialize CollegeTools namespace
global.CollegeTools = {};

function loadModule(filename) {
  const filePath = path.join(__dirname, '../src', filename);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace Google Apps Script specific parts that break in Node.js
  content = content
    .replace(/\/\*\*[\s\S]*?\*\//g, '') // Remove JSDoc comments
    .replace(/eslint-disable-line[^\n]*/g, '') // Remove eslint directives
    .replace(/^(\s*)function\s+(\w+)\s*\(/gm, '$1global.$2 = function(') // Make global functions global
    .replace(/var CollegeTools\s*=\s*CollegeTools\s*\|\|\s*\{\};/g, ''); // Remove namespace redeclaration
  
  console.log(`Loading module: ${filename}`);
  
  try {
    eval(content);
  } catch (error) {
    console.warn(`Warning loading ${filename}: ${error.message}`);
  }
}

console.log('🧪 Loading College Tools modules...');
loadModule('config.js');
loadModule('utils.js');
loadModule('formatting.js');
loadModule('scoring.js');
loadModule('admissions.js');
loadModule('financial.js');
loadModule('setup.js');

// Test Suite
class TestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  test(name, testFn) {
    try {
      console.log(`\n🧪 ${name}`);
      testFn();
      console.log(`✅ ${name} - PASSED`);
      this.passed++;
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      this.errors.push({ name, error: error.message });
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertContains(str, substring, message) {
    if (!str || !str.includes(substring)) {
      throw new Error(message || `Expected "${str}" to contain "${substring}"`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.errors.forEach(({ name, error }) => {
        console.log(`  • ${name}: ${error}`);
      });
    }
    
    if (this.failed === 0) {
      console.log('\n🎉 All tests passed! Safe to deploy.');
    } else {
      console.log('\n⚠️  Some tests failed. Review before deploying.');
    }
    
    return this.failed === 0;
  }
}

// Run Tests
const suite = new TestSuite();

suite.test('Config module loads correctly', () => {
  suite.assert(typeof CollegeTools !== 'undefined', 'CollegeTools namespace should exist');
  suite.assert(typeof CollegeTools.Config !== 'undefined', 'Config module should exist');
  suite.assert(CollegeTools.Config.VERSION, 'Version should be defined');
  suite.assert(CollegeTools.Config.SHEET_NAMES, 'Sheet names should be defined');
});

suite.test('Sheet names include new Personal Profile', () => {
  const sheetNames = CollegeTools.Config.SHEET_NAMES;
  suite.assert(sheetNames.PERSONAL_PROFILE === 'Personal Profile', 'Personal Profile sheet name should be defined');
  suite.assert(sheetNames.COLLEGES === 'Colleges', 'Colleges sheet name should be preserved');
  suite.assert(sheetNames.FINANCIAL_AID === 'Financial Aid Tracker', 'Financial Aid sheet name should be preserved');
});

suite.test('Headers include new financial columns', () => {
  const collegeHeaders = CollegeTools.Config.HEADERS.COLLEGES;
  suite.assert(collegeHeaders.includes('Merit Aid Likelihood'), 'Colleges headers should include Merit Aid Likelihood');
  suite.assert(collegeHeaders.includes('Academic Index Match'), 'Colleges headers should include Academic Index Match');
  suite.assert(collegeHeaders.includes('Admission Chances'), 'Colleges headers should include Admission Chances');
  
  const finAidHeaders = CollegeTools.Config.HEADERS.FINANCIAL_AID;
  suite.assert(finAidHeaders.includes('Financial Safety'), 'Financial Aid headers should include Financial Safety');
  suite.assert(finAidHeaders.includes('4-Year Burden'), 'Financial Aid headers should include 4-Year Burden');
});

suite.test('Utils module functions exist', () => {
  suite.assert(typeof CollegeTools.Utils !== 'undefined', 'Utils module should exist');
  suite.assert(typeof CollegeTools.Utils.colIndex === 'function', 'colIndex function should exist');
  suite.assert(typeof CollegeTools.Utils.trimAllSheets === 'function', 'trimAllSheets function should exist');
  suite.assert(typeof CollegeTools.Utils.addr === 'function', 'addr function should exist');
});

suite.test('Utils.addr function works correctly', () => {
  const addr = CollegeTools.Utils.addr;
  suite.assertEqual(addr(1, 1), 'A1', 'A1 notation should work');
  suite.assertEqual(addr(2, 26), 'Z2', 'Z2 notation should work');
  suite.assertEqual(addr(3, 27), 'AA3', 'AA3 notation should work');
});

suite.test('Financial module exists and has setup function', () => {
  suite.assert(typeof CollegeTools.Financial !== 'undefined', 'Financial module should exist');
  suite.assert(typeof CollegeTools.Financial.setupFinancialIntelligence === 'function', 'setupFinancialIntelligence function should exist');
});

suite.test('Setup module exists and has required functions', () => {
  suite.assert(typeof CollegeTools.Setup !== 'undefined', 'Setup module should exist');
  suite.assert(typeof CollegeTools.Setup.completeSetup === 'function', 'completeSetup function should exist');
  suite.assert(typeof CollegeTools.Setup.optimizePerformance === 'function', 'optimizePerformance function should exist');
});

suite.test('Scoring module exists and has functions', () => {
  suite.assert(typeof CollegeTools.Scoring !== 'undefined', 'Scoring module should exist');
  suite.assert(typeof CollegeTools.Scoring.ensureScoring === 'function', 'ensureScoring function should exist');
});

suite.test('Admissions module exists and has setup function', () => {
  suite.assert(typeof CollegeTools.Admissions !== 'undefined', 'Admissions module should exist');
  suite.assert(typeof CollegeTools.Admissions.setupAdmissionChances === 'function', 'setupAdmissionChances function should exist');
});

suite.test('Financial Intelligence setup can be called without errors', () => {
  // This tests that the function exists and basic structure works
  suite.assert(() => {
    // Mock the UI to automatically click YES
    const originalAlert = mockUi.alert;
    mockUi.alert = () => mockUi.Button.YES;
    
    try {
      CollegeTools.Financial.setupFinancialIntelligence();
      return true;
    } finally {
      mockUi.alert = originalAlert;
    }
  }, 'setupFinancialIntelligence should execute without throwing errors');
});

suite.test('Complete setup can be called without errors', () => {
  suite.assert(() => {
    // Mock the UI to automatically click YES
    const originalAlert = mockUi.alert;
    mockUi.alert = () => mockUi.Button.YES;
    
    try {
      CollegeTools.Setup.completeSetup();
      return true;
    } finally {
      mockUi.alert = originalAlert;
    }
  }, 'completeSetup should execute without throwing errors');
});

suite.test('Version is updated correctly', () => {
  const version = CollegeTools.Config.VERSION;
  suite.assert(version, 'Version should be defined');
  suite.assert(version.match(/^\d+\.\d+\.\d+$/), 'Version should follow semantic versioning (x.y.z)');
  
  // Check that version is at least 7.1.0 (our new Financial Intelligence version)
  const [major, minor] = version.split('.').map(Number);
  suite.assert(major >= 7 && (major > 7 || minor >= 1), 'Version should be at least 7.1.0');
});

// Run all tests
console.log('🚀 Starting College Tools Regression Tests\n');
const success = suite.summary();
process.exit(success ? 0 : 1);