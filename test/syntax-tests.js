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

// Test all source files
const sourceFiles = [
  'config.js',
  'utils.js', 
  'colleges.js',
  'admissions.js',
  'financial.js',
  'setup.js',
  'scoring.js',
  'formatting.js',
  'trackers.js',
  'menu.js'
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
          const [major, minor] = version.split('.').map(Number);
          tester.assert(major >= 7 && (major > 7 || minor >= 1), 
            `Version ${version} should be at least 7.1.0 for Financial Intelligence features`);
        }
      }
    });
  }
});

// Test specific new features
tester.test('Config includes Personal Profile sheet', () => {
  const configPath = path.join(srcDir, 'config.js');
  const content = fs.readFileSync(configPath, 'utf8');
  tester.assert(content.includes('PERSONAL_PROFILE'), 'Config should include Personal Profile sheet name');
  tester.assert(content.includes('Personal Profile'), 'Config should have Personal Profile sheet name');
});

tester.test('Config includes new financial columns', () => {
  const configPath = path.join(srcDir, 'config.js');
  const content = fs.readFileSync(configPath, 'utf8');
  tester.assert(content.includes('Merit Aid Likelihood'), 'Config should include Merit Aid Likelihood column');
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
  const content = fs.readFileSync(admissionsPath, 'utf8');
  tester.assert(content.includes('SAT_Score'), 'Should use SAT_Score named range from Personal Profile');
  tester.assert(!content.includes('Your_SAT'), 'Should not use old Your_SAT reference');
});

const success = tester.summary();
process.exit(success ? 0 : 1);