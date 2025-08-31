/**
 * Functionality Tests for College Tools
 * @description Tests actual feature functionality with mocked Google Sheets environment
 */

const fs = require('fs');
const path = require('path');

// Enhanced Google Apps Script mocks for functionality testing
global.SpreadsheetApp = {
  getActive: () => mockSpreadsheet,
  getUi: () => mockUi,
  newConditionalFormatRule: () => mockConditionalFormatRule,
  newDataValidation: () => mockDataValidation,
};

global.Utilities = { sleep: (ms) => {} };
global.console = { log: () => {}, error: () => {}, warn: () => {} }; // Suppress console in tests

// Enhanced mocks with tracking
const mockData = {
  namedRanges: {},
  sheets: {},
  alertCalls: [],
  formulasCalls: [],
};

const mockUi = {
  alert: (title, message, buttons) => {
    mockData.alertCalls.push({ title, message, buttons });
    return mockUi.Button.YES; // Auto-accept for tests
  },
  Alert: (title, message, buttons) => mockUi.alert(title, message, buttons),
  Button: { YES: 'YES', NO: 'NO', OK: 'OK' },
  ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
  createMenu: (name) => ({
    addItem: (text, fn) => mockUi.createMenu(name),
    addSeparator: () => mockUi.createMenu(name),
    addSubMenu: (submenu) => mockUi.createMenu(name),
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
  setValue: function(value) { 
    this._value = value; 
    return this; 
  },
  getValue: function() { 
    return this._value || ''; 
  },
  setValues: function(values) { 
    this._values = values; 
    return this; 
  },
  getValues: function() { 
    return this._values || [['']]; 
  },
  setFormula: function(formula) { 
    this._formula = formula; 
    mockData.formulasCalls.push({ formula, range: `${this._row},${this._col}` });
    return this; 
  },
  getFormula: function() { 
    return this._formula || ''; 
  },
  setFormulas: function(formulas) { 
    this._formulas = formulas; 
    return this; 
  },
  getFormulas: function() { 
    return this._formulas || [['']]; 
  },
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
  _row: 1,
  _col: 1,
};

const mockSheet = {
  getName: () => 'TestSheet',
  getRange: function(row, col, numRows, numCols) {
    const range = Object.create(mockRange);
    range._row = row;
    range._col = col;
    range._numRows = numRows || 1;
    range._numCols = numCols || numCols || 1;
    
    // Mock some data for testing
    if (row === 2 && col <= 30) {
      // Header row - simulate college headers
      const headers = [
        'College Name', 'City', 'State', 'Region', 'Type (Public/Private)',
        'Acceptance Rate', 'First-Year Retention', 'Grad Rate', 'Median Earnings (10yr)',
        'Total Cost of Attendance', 'Estimated Net Price', 'Link',
        'SAT 25%', 'SAT 75%', 'ACT 25%', 'ACT 75%',
        'Program Fit (1-5)', 'Academic Reputation (1-5)', 'Research Opportunities (1-5)',
        'Safety (1-5)', 'Campus Culture Fit (1-5)', 'Weather Fit (1-5)',
        'Clubs/Activities (1-5)', 'Personal Priority (1-5)',
        'Weighted Score', 'Value Score', 'Admission Chances', 'Academic Index Match', 'Merit Aid Likelihood', 'Notes'
      ];
      range._value = headers[col - 1] || '';
      range._values = [headers.slice(0, numCols || 1)];
    }
    
    return range;
  },
  getLastColumn: () => 30,
  getLastRow: () => 100,
  getMaxRows: () => 1000,
  clear: function() { return this; },
  setColumnWidth: function() { return this; },
  setFrozenRows: function() { return this; },
  autoResizeColumn: function() { return this; },
  insertColumnBefore: function() { return this; },
  deleteRows: function() { return this; },
  protect: () => ({
    setDescription: () => {},
    setUnprotectedRanges: () => {},
  }),
  clearConditionalFormatRules: () => {},
  getConditionalFormatRules: () => [],
  setConditionalFormatRules: () => {},
};

const mockSpreadsheet = {
  getSheetByName: function(name) {
    if (!mockData.sheets[name]) {
      mockData.sheets[name] = Object.create(mockSheet);
      mockData.sheets[name]._name = name;
    }
    return mockData.sheets[name];
  },
  insertSheet: function(name) {
    return this.getSheetByName(name);
  },
  setNamedRange: function(name, range) {
    mockData.namedRanges[name] = range;
  },
  getActiveSheet: () => mockSheet,
};

// Load College Tools modules with proper namespace handling
global.CollegeTools = {};

function loadModule(filename) {
  const filePath = path.join(__dirname, '../src', filename);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Execute the module code
  try {
    eval(content);
  } catch (error) {
    console.warn(`Warning loading ${filename}: ${error.message}`);
  }
}

class FunctionalityTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  test(name, testFn) {
    try {
      // Reset mock data for each test
      mockData.alertCalls = [];
      mockData.formulasCalls = [];
      mockData.sheets = {};
      mockData.namedRanges = {};
      
      console.log(`🧪 ${name}`);
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
    if (!str || !str.toString().includes(substring)) {
      throw new Error(message || `Expected "${str}" to contain "${substring}"`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Functionality Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.errors.forEach(({ name, error }) => {
        console.log(`  • ${name}: ${error}`);
      });
    }
    
    return this.failed === 0;
  }
}

// Load modules
console.log('🧪 Loading College Tools modules for functionality testing...');
loadModule('config.js');
loadModule('utils.js');
loadModule('formatting.js');
loadModule('scoring.js');
loadModule('admissions.js');
loadModule('financial.js');
loadModule('setup.js');
loadModule('trackers.js');

const tester = new FunctionalityTester();

console.log('\n🧪 Running Functionality Tests\n');

// Test core module existence and structure
tester.test('CollegeTools namespace properly initialized', () => {
  tester.assert(typeof CollegeTools !== 'undefined', 'CollegeTools should be defined');
  tester.assert(typeof CollegeTools.Config !== 'undefined', 'Config module should exist');
  tester.assert(typeof CollegeTools.Utils !== 'undefined', 'Utils module should exist');
  tester.assert(typeof CollegeTools.Financial !== 'undefined', 'Financial module should exist');
});

// Test configuration updates
tester.test('Configuration includes new features', () => {
  const config = CollegeTools.Config;
  tester.assert(config.SHEET_NAMES.PERSONAL_PROFILE === 'Personal Profile', 'Personal Profile sheet name configured');
  
  const collegeHeaders = config.HEADERS.COLLEGES;
  tester.assert(collegeHeaders.includes('Merit Aid Likelihood'), 'Merit Aid Likelihood in headers');
  tester.assert(collegeHeaders.includes('Academic Index Match'), 'Academic Index Match in headers');
  
  const finAidHeaders = config.HEADERS.FINANCIAL_AID;
  tester.assert(finAidHeaders.includes('Financial Safety'), 'Financial Safety in headers');
  tester.assert(finAidHeaders.includes('4-Year Burden'), '4-Year Burden in headers');
});

// Test utility functions
tester.test('Utils.addr function works correctly', () => {
  const addr = CollegeTools.Utils.addr;
  tester.assertEqual(addr(1, 1), 'A1', 'A1 notation');
  tester.assertEqual(addr(2, 26), 'Z2', 'Z2 notation');  
  tester.assertEqual(addr(3, 27), 'AA3', 'AA3 notation');
  tester.assertEqual(addr(10, 703), 'AAA10', 'Triple letter notation');
});

// Test Financial Intelligence setup
tester.test('Financial Intelligence setup creates Personal Profile sheet', () => {
  CollegeTools.Financial.setupFinancialIntelligence();
  
  tester.assert(mockData.alertCalls.length >= 2, 'Should show setup confirmation dialogs');
  tester.assert(mockData.sheets['Personal Profile'], 'Should create Personal Profile sheet');
  tester.assert(Object.keys(mockData.namedRanges).length > 0, 'Should create named ranges');
  
  // Check that required named ranges are created
  const expectedRanges = ['SAT_Score', 'Family_Income', 'GPA'];
  expectedRanges.forEach(rangeName => {
    tester.assert(mockData.namedRanges[rangeName], `Should create ${rangeName} named range`);
  });
});

// Test formula generation
tester.test('Financial Intelligence generates correct formulas', () => {
  // Reset and setup
  CollegeTools.Financial.setupFinancialIntelligence();
  
  tester.assert(mockData.formulasCalls.length > 0, 'Should generate formulas');
  
  // Check that formulas use named ranges instead of cell references
  const formulasWithSAT = mockData.formulasCalls.filter(call => 
    call.formula.includes('SAT_Score'));
  tester.assert(formulasWithSAT.length > 0, 'Should generate formulas using SAT_Score named range');
  
  // Check that old references are not used
  const formulasWithOldSAT = mockData.formulasCalls.filter(call => 
    call.formula.includes('Your_SAT'));
  tester.assertEqual(formulasWithOldSAT.length, 0, 'Should not use old Your_SAT references');
});

// Test Complete Setup integration
tester.test('Complete Setup includes Financial Intelligence', () => {
  CollegeTools.Setup.completeSetup();
  
  tester.assert(mockData.alertCalls.length >= 3, 'Should show multiple setup confirmations');
  tester.assert(mockData.sheets['Personal Profile'], 'Complete setup should create Personal Profile');
  
  // Check that both old and new features are set up
  const alertMessages = mockData.alertCalls.map(call => call.message).join(' ');
  tester.assertContains(alertMessages, 'Financial Intelligence', 'Should mention Financial Intelligence in setup');
});

// Test formula structure for admission chances
tester.test('Admission formulas updated for Personal Profile', () => {
  // Create a mock colleges sheet
  const collegesSheet = mockSpreadsheet.getSheetByName('Colleges');
  
  // This should be called by Financial Intelligence setup
  CollegeTools.Financial.setupFinancialIntelligence();
  
  // Check formulas were generated
  const admissionFormulas = mockData.formulasCalls.filter(call => 
    call.formula.includes('Strong') || call.formula.includes('Match') || call.formula.includes('Reach'));
  tester.assert(admissionFormulas.length > 0, 'Should generate admission chance formulas');
  
  // Check they use Personal Profile references
  const modernFormulas = admissionFormulas.filter(call => call.formula.includes('SAT_Score'));
  tester.assert(modernFormulas.length > 0, 'Admission formulas should use SAT_Score from Personal Profile');
});

// Test version consistency
tester.test('Version consistency across modules', () => {
  const version = CollegeTools.Config.VERSION;
  tester.assert(version, 'Version should be defined');
  tester.assert(version.match(/^\d+\.\d+\.\d+$/), 'Version should follow semantic versioning');
  
  // Check version is appropriate for new features
  const [major, minor] = version.split('.').map(Number);
  tester.assert(major >= 7 && (major > 7 || minor >= 1), 'Version should be at least 7.1.0');
});

// Test performance optimization
tester.test('Sheet trimming functionality', () => {
  CollegeTools.Utils.trimAllSheets();
  
  // This is hard to test without real sheets, but we can verify the function exists and runs
  tester.assert(true, 'Sheet trimming should execute without errors');
});

// Test backwards compatibility
tester.test('Existing features still work', () => {
  // Test that scoring module still exists
  tester.assert(typeof CollegeTools.Scoring !== 'undefined', 'Scoring module should still exist');
  tester.assert(typeof CollegeTools.Scoring.ensureScoring === 'function', 'ensureScoring should still exist');
  
  // Test that trackers still exist
  tester.assert(typeof CollegeTools.Trackers !== 'undefined', 'Trackers module should still exist');
});

const success = tester.summary();

if (success) {
  console.log('\n🎉 All functionality tests passed! New features are working correctly.');
  console.log('\n📋 Test Summary:');
  console.log('✅ Personal Profile sheet creation');
  console.log('✅ Named ranges for configuration');
  console.log('✅ Formula generation with new references');
  console.log('✅ Financial Intelligence setup integration');
  console.log('✅ Version consistency');
  console.log('✅ Backwards compatibility');
} else {
  console.log('\n⚠️  Some functionality tests failed. Review the issues above.');
}

process.exit(success ? 0 : 1);