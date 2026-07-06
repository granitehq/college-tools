/**
 * Syntax and Structure Tests for College Tools
 * @description Validates JavaScript syntax and module structure
 */

const fs = require('fs');
const path = require('path');

class SyntaxTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  test(name, testFn) {
    try {
      console.log(`🔍 ${name}`);
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

  validateJavaScript(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks (skip namespace check for menu.js as it's standalone)
    if (!filePath.includes('menu.js')) {
      this.assert(content.includes('var CollegeTools'), 'Should define CollegeTools namespace');
    }
    this.assert(!content.includes('console.log'), 'Should not contain debug console.log statements');
    this.assert(!content.includes('debugger'), 'Should not contain debugger statements');
    
    // Check for proper function structure
    const functionMatches = content.match(/function\s+\w+\s*\(/g);
    if (functionMatches) {
      this.assert(functionMatches.length > 0, 'Should contain function definitions');
    }
    
    // Check for proper JSDoc
    const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g);
    this.assert(jsdocMatches && jsdocMatches.length > 0, 'Should contain JSDoc comments');
    
    // Check version consistency
    if (content.includes('@version')) {
      const versionMatch = content.match(/@version\s+(\d+\.\d+\.\d+)/);
      this.assert(versionMatch, 'Should have proper version format');
    }
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Syntax Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.errors.forEach(({ name, error }) => {
        console.log(`  • ${name}: ${error}`);
      });
    }
    
    return this.failed === 0;
  }
}

const tester = new SyntaxTester();
const srcDir = path.join(__dirname, '../src');
const projectRoot = path.join(__dirname, '..');

// Test all source files
const sourceFiles = [
  'config.js',
  'utils.js',
  'schema.js',
'colleges.js',
  'admissions.js',
  'dashboard.js',
  'financial.js',
  'formatting.js',
  'formulas.js',
  'instructions.js',
  'lookup.js',
  'menu.js',
  'scorecard.js',
  'scoring.js',
  'setup.js',
  'trackers.js',
];

console.log('🧪 Running Syntax and Structure Tests\n');

sourceFiles.forEach(filename => {
  const filePath = path.join(srcDir, filename);
  
  tester.test(`${filename} - File exists`, () => {
    tester.assert(fs.existsSync(filePath), `${filename} should exist`);
  });
  
  if (fs.existsSync(filePath)) {
    tester.test(`${filename} - Valid JavaScript syntax`, () => {
      tester.validateJavaScript(filePath);
    });
    
    tester.test(`${filename} - Proper module structure`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for module pattern
      tester.assert(content.includes('CollegeTools') || filename === 'menu.js', 'Should use CollegeTools namespace (except menu.js)');
      
      // Check for return statement in modules (except menu.js)
      if (filename !== 'menu.js' && filename !== 'config.js') {
        tester.assert(content.includes('return {'), 'Module should have public API return');
      }
      
      // Check version consistency
      if (content.includes('@version')) {
        const versionMatch = content.match(/@version\s+(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          const version = versionMatch[1];
          tester.assert(/^\d+\.\d+\.\d+$/.test(version),
            `Version ${version} should be semantic`);
        }
      }
    });
  }
});

// Test specific new features
tester.test('clasp push order includes every Apps Script source file', () => {
  const claspConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, '.clasp.json'), 'utf8'));
  const pushOrder = claspConfig.filePushOrder || [];

  sourceFiles.forEach((filename) => {
    tester.assert(pushOrder.includes('src/' + filename),
      'filePushOrder should include src/' + filename);
  });
});

tester.test('Dashboard uses schema for Colleges row-2 lookup helpers', () => {
  const dashboardPath = path.join(srcDir, 'dashboard.js');
  const content = fs.readFileSync(dashboardPath, 'utf8');

  tester.assert(!content.includes('CollegeTools.Utils.colIndex2'),
    'Dashboard should use Schema.columnIndex instead of Utils.colIndex2');
  tester.assert(!content.includes('CollegeTools.Config.HEADERS.COLLEGES'),
    'Dashboard should use Schema.rangeA1 instead of direct Colleges header arrays');
});

tester.test('Formula builders are used by dashboard and financial tracker setup', () => {
  const dashboardContent = fs.readFileSync(path.join(srcDir, 'dashboard.js'), 'utf8');
  const trackersContent = fs.readFileSync(path.join(srcDir, 'trackers.js'), 'utf8');

  tester.assert(dashboardContent.includes('CollegeTools.Formulas.sheetRef'),
    'Dashboard should use the shared sheet-name quoting helper');
  tester.assert(trackersContent.includes('CollegeTools.Formulas.netPriceAfterAid'),
    'Financial Aid tracker should use the shared net price formula builder');
  tester.assert(trackersContent.includes('CollegeTools.Formulas.fourYearProjectedCost'),
    'Financial Aid tracker should use the shared four-year cost formula builder');
});

tester.test('Config includes Personal Profile sheet', () => {
  const configPath = path.join(srcDir, 'config.js');
  const content = fs.readFileSync(configPath, 'utf8');
  tester.assert(content.includes('PERSONAL_PROFILE'), 'Config should include Personal Profile sheet name');
  tester.assert(content.includes('Personal Profile'), 'Config should have Personal Profile sheet name');
});

tester.test('Config includes new financial columns', () => {
  const configPath = path.join(srcDir, 'config.js');
  const content = fs.readFileSync(configPath, 'utf8');
  tester.assert(content.includes('Admission Fit'), 'Config should include Admission Fit column');
  tester.assert(content.includes('Financial Safety'), 'Config should include Financial Safety column');
  tester.assert(content.includes('4-Year Burden'), 'Config should include 4-Year Burden column');
});

tester.test('Financial module exists and has proper structure', () => {
  const financialPath = path.join(srcDir, 'financial.js');
  tester.assert(fs.existsSync(financialPath), 'financial.js should exist');
  
  const content = fs.readFileSync(financialPath, 'utf8');
  tester.assert(content.includes('CollegeTools.Financial'), 'Should define Financial module');
  tester.assert(content.includes('setupFinancialIntelligence'), 'Should include setupFinancialIntelligence function');
  tester.assert(content.includes('Personal Profile'), 'Should reference Personal Profile sheet');
});

tester.test('Menu updated for Financial Intelligence', () => {
  const menuPath = path.join(srcDir, 'menu.js');
  const content = fs.readFileSync(menuPath, 'utf8');
  tester.assert(content.includes('Setup Financial Intelligence'), 'Menu should include Financial Intelligence setup');
  tester.assert(content.includes('setupFinancialIntelligence'), 'Menu should call setupFinancialIntelligence function');
});

tester.test('Admissions module updated for Personal Profile', () => {
  const admissionsPath = path.join(srcDir, 'admissions.js');
  const formulasPath = path.join(srcDir, 'formulas.js');
  const admissionsContent = fs.readFileSync(admissionsPath, 'utf8');
  const formulasContent = fs.readFileSync(formulasPath, 'utf8');
  tester.assert(formulasContent.includes('SAT_Score'), 'Formula builder should use SAT_Score named range from Personal Profile');
  tester.assert(!admissionsContent.includes('Your_SAT'), 'Should not use old Your_SAT reference');
  tester.assert(admissionsContent.includes('admissionFit'), 'Admissions module should call the admissionFit formula builder');
});

const success = tester.summary();
process.exit(success ? 0 : 1);
