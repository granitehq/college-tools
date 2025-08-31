/**
 * Basic Functionality Tests for College Tools
 * @description Simple functionality tests to verify core features
 */

const fs = require('fs');
const path = require('path');

// Minimal Google Apps Script mocks
global.SpreadsheetApp = {
  getActive: () => ({ 
    getSheetByName: () => null,
    insertSheet: () => ({ getName: () => 'Mock' }),
    setNamedRange: () => {}
  }),
  getUi: () => ({ 
    alert: () => ({ YES: 'YES', NO: 'NO', OK: 'OK' }) 
  }),
};

global.Utilities = { sleep: () => {} };

// Initialize CollegeTools
global.CollegeTools = {};

function loadModule(filename) {
  const filePath = path.join(__dirname, '../src', filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File ${filename} does not exist`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace Google Apps Script specific parts that break in Node.js
  content = content
    .replace(/\/\*\*[\s\S]*?\*\//g, '') // Remove JSDoc comments
    .replace(/eslint-disable-line[^\n]*/g, '') // Remove eslint directives
    .replace(/^(\s*)function\s+(\w+)\s*\(/gm, '$1global.$2 = function(') // Make global functions global
    .replace(/var CollegeTools\s*=\s*CollegeTools\s*\|\|\s*\{\};/g, ''); // Remove namespace redeclaration
  
  try {
    eval(content);
    console.log(`✅ Loaded ${filename} successfully`);
  } catch (error) {
    console.warn(`⚠️  Warning loading ${filename}: ${error.message}`);
  }
}

class SimpleTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
  }
  
  test(name, testFn) {
    try {
      testFn();
      console.log(`✅ ${name} - PASSED`);
      this.passed++;
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      this.failed++;
    }
  }
  
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
  
  summary() {
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

console.log('🧪 Loading modules for basic functionality tests...\n');

// Load modules
loadModule('config.js');
loadModule('utils.js');
loadModule('financial.js');
loadModule('setup.js');

const tester = new SimpleTester();

console.log('\n🧪 Running Basic Functionality Tests\n');

// Test module existence
tester.test('CollegeTools namespace exists', () => {
  tester.assert(typeof CollegeTools === 'object', 'CollegeTools should be an object');
});

tester.test('Config module loaded', () => {
  tester.assert(typeof CollegeTools.Config === 'object', 'Config module should exist');
  tester.assert(CollegeTools.Config.VERSION, 'Version should be defined');
});

tester.test('Financial module loaded', () => {
  tester.assert(typeof CollegeTools.Financial === 'object', 'Financial module should exist');
  tester.assert(typeof CollegeTools.Financial.setupFinancialIntelligence === 'function', 'setupFinancialIntelligence should exist');
});

tester.test('Setup module loaded', () => {
  tester.assert(typeof CollegeTools.Setup === 'object', 'Setup module should exist');
  tester.assert(typeof CollegeTools.Setup.completeSetup === 'function', 'completeSetup should exist');
});

tester.test('Utils module loaded', () => {
  tester.assert(typeof CollegeTools.Utils === 'object', 'Utils module should exist');
  tester.assert(typeof CollegeTools.Utils.addr === 'function', 'addr function should exist');
});

tester.test('Configuration includes new features', () => {
  const config = CollegeTools.Config;
  tester.assert(config.SHEET_NAMES.PERSONAL_PROFILE === 'Personal Profile', 'Personal Profile sheet configured');
  tester.assert(config.HEADERS.COLLEGES.includes('Merit Aid Likelihood'), 'Merit Aid Likelihood in headers');
});

const success = tester.summary();

if (success) {
  console.log('\n🎉 All basic functionality tests passed!');
} else {
  console.log('\n⚠️  Some basic functionality tests failed.');
}

process.exit(success ? 0 : 1);