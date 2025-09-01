# Complete Google Apps Script & Sheets Development Guide

## Table of Contents
1. [Performance Optimization](#1-performance-optimization)
2. [Architecture & Organization](#2-architecture--organization)
3. [Design Patterns](#3-design-patterns)
4. [Error Handling & Logging](#4-error-handling--logging)
5. [Testing Framework](#5-testing-framework)
6. [Security Best Practices](#6-security-best-practices)
7. [Development Workflow](#7-development-workflow)
8. [Code Quality Standards](#8-code-quality-standards)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Performance Optimization

### Critical Performance Rule #1: Batch Operations
**70x Performance Improvement** - Google's documentation shows batch operations run in 1 second vs 70 seconds for individual operations.

```javascript
// ❌ NEVER DO THIS - Individual operations (70 seconds for 100x100 grid)
for (let row = 0; row < 100; row++) {
  for (let col = 0; col < 100; col++) {
    sheet.getRange(row + 1, col + 1).setValue(data[row][col]);
  }
}

// ✅ ALWAYS DO THIS - Batch operations (1 second for same operation)
const values = colleges.map(c => [
  c.name, c.state, c.admissionRate, c.gpa, c.sat
]);
sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
```

### Data Access Pattern - Read Once, Write Once

```javascript
class SpreadsheetDataManager {
  constructor() {
    this.ss = SpreadsheetApp.getActiveSpreadsheet();
    this.cache = CacheService.getScriptCache();
    this.data = {}; // In-memory cache
  }
  
  loadSheetData(sheetName) {
    // Check cache first
    const cacheKey = `sheet_${sheetName}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.data[sheetName] = JSON.parse(cached);
      return this.data[sheetName];
    }
    
    // Single read operation
    const sheet = this.ss.getSheetByName(sheetName);
    const values = sheet.getDataRange().getValues();
    
    // Cache for 10 minutes
    this.cache.put(cacheKey, JSON.stringify(values), 600);
    this.data[sheetName] = values;
    return values;
  }
  
  saveSheetData(sheetName, data) {
    const sheet = this.ss.getSheetByName(sheetName);
    
    // Clear and write in one operation
    sheet.clear();
    if (data.length > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }
    
    // Invalidate cache
    this.cache.remove(`sheet_${sheetName}`);
  }
}
```

### V8 Runtime Configuration

```javascript
// appsscript.json - Enable V8 for modern JavaScript
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"  // Critical for performance and modern JS
}
```

### Google-Specific Caching Strategy

```javascript
class CacheManager {
  constructor() {
    this.scriptCache = CacheService.getScriptCache();
    this.userCache = CacheService.getUserCache();
    this.docCache = CacheService.getDocumentCache();
  }
  
  // Use appropriate cache scope
  cacheCommonData() {
    // Script cache - shared across all users (6 hours max)
    this.scriptCache.put('collegeList', JSON.stringify(colleges), 21600);
    
    // User cache - specific to user (6 hours max)
    this.userCache.put('userPreferences', JSON.stringify(prefs), 21600);
    
    // Document cache - specific to document (10 minutes max)
    this.docCache.put('calculations', JSON.stringify(results), 600);
  }
  
  // Batch cache operations
  cacheMultiple(data) {
    const cacheEntries = {};
    Object.keys(data).forEach(key => {
      cacheEntries[key] = JSON.stringify(data[key]);
    });
    
    // Put all at once (more efficient)
    this.scriptCache.putAll(cacheEntries, 600);
  }
}
```

### Performance Monitoring

```javascript
class PerformanceProfiler {
  constructor() {
    this.timings = [];
    this.startTime = new Date().getTime();
  }
  
  mark(label) {
    const now = new Date().getTime();
    const duration = now - this.startTime;
    this.timings.push({ label, duration, timestamp: now });
    
    // Log to Stackdriver (better than Logger.log in V8)
    console.time(label);
    console.log(`${label}: ${duration}ms`);
    
    // Alert on slow operations
    if (duration > 3000) {
      console.warn(`SLOW OPERATION: ${label} took ${duration}ms`);
    }
    
    this.startTime = now;
    return duration;
  }
  
  generateReport() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName('Performance Log') || this.createLogSheet();
    
    const rows = this.timings.map(t => [
      new Date(t.timestamp),
      t.label,
      t.duration,
      Session.getActiveUser().getEmail()
    ]);
    
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4)
      .setValues(rows);
  }
}
```

### Advanced Sheets Service with Batch Update

```javascript
function batchUpdateOptimized() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  
  // Batch multiple operations in single request
  const requests = [
    {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 100,
          startColumnIndex: 0,
          endColumnIndex: 10
        },
        fields: 'userEnteredFormat.backgroundColor',
        rows: generateRowData()
      }
    },
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 10
        }
      }
    }
  ];
  
  Sheets.Spreadsheets.batchUpdate({ requests }, spreadsheetId);
}
```

---

## 2. Architecture & Organization

### Project Structure (using Clasp)

```
project/
├── src/
│   ├── server/           // Backend code
│   │   ├── Config.js      // All configuration
│   │   ├── DataManager.js // Data access layer
│   │   ├── Services/      // Business logic
│   │   │   ├── CollegeService.js
│   │   │   ├── FinancialService.js
│   │   │   └── ValidationService.js
│   │   ├── Utils/         // Utilities
│   │   │   ├── Logger.js
│   │   │   └── ErrorHandler.js
│   │   └── Models/        // Data models
│   │       ├── College.js
│   │       └── Student.js
│   ├── client/           // Frontend code
│   │   ├── html/
│   │   ├── css/
│   │   └── js/
│   └── tests/            // Test files
│       ├── unit/
│       └── integration/
├── .claspignore          // Files to ignore
├── .clasp.json           // Clasp configuration
├── appsscript.json       // Apps Script manifest
├── package.json          // Node dependencies
└── README.md
```

### Configuration Management

```javascript
/**
 * Centralized configuration object
 */
const CONFIG = {
  SHEETS: {
    MASTER: 'Master',
    FINANCIAL: 'Financial Aid',
    VISITS: 'Campus Visits',
    TIMELINE: 'Application Timeline',
    SCHOLARSHIPS: 'Scholarships',
    COMMON_DATA: 'Common Data Set'
  },
  
  COLUMNS: {
    MASTER: {
      NAME: 1,
      STATE: 2,
      ADMISSION_RATE: 3,
      GPA_AVG: 4,
      SAT_AVG: 5,
      NET_PRICE: 6
    }
  },
  
  FORMULAS: {
    ADMISSION_CHANCE: (gpa, sat) => 
      `=IF(AND(${gpa}>3.5,${sat}>1400),"Strong","Reach")`,
    VALUE_SCORE: (quality, price) => 
      `=${quality}/${price}*10000`
  },
  
  CACHE: {
    TTL: 600, // 10 minutes
    NAMESPACE: 'college_app'
  },
  
  PERFORMANCE: {
    BATCH_SIZE: 100,
    MAX_RETRIES: 3,
    TIMEOUT_MS: 10000
  }
};
```

---

## 3. Design Patterns

### Singleton Pattern for Service Classes

```javascript
/**
 * Singleton pattern for managing spreadsheet connections
 */
class SpreadsheetManager {
  constructor() {
    if (SpreadsheetManager.instance) {
      return SpreadsheetManager.instance;
    }
    
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.sheets = new Map();
    this.cache = CacheService.getScriptCache();
    
    SpreadsheetManager.instance = this;
  }
  
  getSheet(name) {
    if (!this.sheets.has(name)) {
      this.sheets.set(name, this.spreadsheet.getSheetByName(name));
    }
    return this.sheets.get(name);
  }
  
  static getInstance() {
    if (!SpreadsheetManager.instance) {
      SpreadsheetManager.instance = new SpreadsheetManager();
    }
    return SpreadsheetManager.instance;
  }
}
```

### Repository Pattern for Data Access

```javascript
/**
 * Repository pattern for clean data access
 */
class CollegeRepository {
  constructor() {
    this.sheetManager = SpreadsheetManager.getInstance();
    this.sheetName = CONFIG.SHEETS.MASTER;
  }
  
  /**
   * Find all colleges matching criteria
   * @param {Object} criteria - Search criteria
   * @returns {College[]} Array of College objects
   */
  findAll(criteria = {}) {
    const sheet = this.sheetManager.getSheet(this.sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    return data
      .map(row => this._rowToCollege(row, headers))
      .filter(college => this._matchesCriteria(college, criteria));
  }
  
  /**
   * Save college data with validation
   * @param {College} college - College object to save
   */
  save(college) {
    const validation = this._validate(college);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // Use batch operation for efficiency
    const sheet = this.sheetManager.getSheet(this.sheetName);
    const row = this._collegeToRow(college);
    sheet.appendRow(row);
    
    // Clear cache after update
    this.sheetManager.cache.remove(`sheet_${this.sheetName}`);
  }
  
  _rowToCollege(row, headers) {
    const college = new College();
    headers.forEach((header, index) => {
      college[header] = row[index];
    });
    return college;
  }
  
  _validate(college) {
    const errors = [];
    
    if (!college.name) errors.push('Name is required');
    if (college.gpa < 0 || college.gpa > 4) errors.push('Invalid GPA');
    if (college.sat < 400 || college.sat > 1600) errors.push('Invalid SAT');
    
    return { 
      isValid: errors.length === 0, 
      errors 
    };
  }
}
```

### Factory Pattern for Calculations

```javascript
/**
 * Factory pattern for creating different types of calculators
 */
class CalculatorFactory {
  static create(type) {
    switch(type) {
      case 'admission':
        return new AdmissionCalculator();
      case 'financial':
        return new FinancialCalculator();
      case 'value':
        return new ValueCalculator();
      default:
        throw new Error(`Unknown calculator type: ${type}`);
    }
  }
}

class AdmissionCalculator {
  calculate(studentProfile, collegeProfile) {
    const gpaScore = (studentProfile.gpa / collegeProfile.avgGpa) * 40;
    const satScore = (studentProfile.sat / collegeProfile.avgSat) * 40;
    const bonus = studentProfile.sat > collegeProfile.sat75th ? 20 : 0;
    
    const totalScore = gpaScore + satScore + bonus;
    
    return {
      score: Math.min(100, totalScore),
      percentage: Math.min(95, collegeProfile.admissionRate * (totalScore / 50)),
      category: this._getCategory(totalScore)
    };
  }
  
  _getCategory(score) {
    if (score > 100) return 'Safety';
    if (score > 85) return 'Match';
    if (score > 70) return 'Target';
    return 'Reach';
  }
}
```

### Dependency Injection Container

```javascript
/**
 * Dependency injection for better testability
 */
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }
  
  register(name, factory, options = {}) {
    this.services.set(name, {
      factory,
      singleton: options.singleton || false
    });
  }
  
  get(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    
    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }
    
    return service.factory(this);
  }
}

// Setup DI container
const container = new DIContainer();

container.register('spreadsheetManager', 
  () => new SpreadsheetManager(), 
  { singleton: true }
);

container.register('collegeService', 
  (container) => new CollegeService(
    container.get('spreadsheetManager'),
    container.get('cacheManager')
  )
);
```

---

## 4. Error Handling & Logging

### Comprehensive Error System

```javascript
/**
 * Error handling with multiple severity levels
 */
class ErrorHandler {
  static handle(error, context = {}) {
    // Log to Stackdriver
    console.error({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      user: Session.getActiveUser().getEmail()
    });
    
    // Store in error log sheet
    this.logToSheet(error, context);
    
    // Notify user appropriately
    this.notifyUser(error);
    
    // Send alert for critical errors
    if (error.severity === 'CRITICAL') {
      this.sendAlert(error);
    }
  }
  
  static logToSheet(error, context) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName('Error Log') || this.createErrorLogSheet();
      
      sheet.appendRow([
        new Date(),
        error.name,
        error.message,
        error.stack,
        JSON.stringify(context),
        Session.getActiveUser().getEmail()
      ]);
    } catch (logError) {
      console.error('Failed to log error to sheet:', logError);
    }
  }
  
  static notifyUser(error) {
    const ui = SpreadsheetApp.getUi();
    
    if (error instanceof ValidationError) {
      ui.alert('Validation Error', error.message, ui.ButtonSet.OK);
    } else if (error instanceof AuthorizationError) {
      ui.alert('Permission Denied', 
        'You do not have permission to perform this action.', 
        ui.ButtonSet.OK);
    } else {
      ui.alert('Error', 
        'An unexpected error occurred. Please try again or contact support.', 
        ui.ButtonSet.OK);
    }
  }
  
  static createErrorLogSheet() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .insertSheet('Error Log');
    
    sheet.appendRow([
      'Timestamp', 'Error Type', 'Message', 
      'Stack Trace', 'Context', 'User'
    ]);
    
    return sheet;
  }
}

// Custom error types
class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed: ' + errors.join(', '));
    this.name = 'ValidationError';
    this.errors = errors;
    this.severity = 'WARNING';
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.severity = 'WARNING';
  }
}

class DataIntegrityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataIntegrityError';
    this.severity = 'CRITICAL';
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
/**
 * Robust execution with retry logic
 */
class RobustExecutor {
  static async executeWithRetry(func, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return func();
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed: ${error.message}`);
        
        // Exponential backoff
        if (i < maxRetries - 1) {
          Utilities.sleep(delayMs * Math.pow(2, i));
        }
      }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
  }
}

// Usage
function updateCollegeData() {
  return RobustExecutor.executeWithRetry(() => {
    const service = container.get('collegeService');
    return service.updateAll();
  });
}
```

---

## 5. Testing Framework

### QUnit Setup for Google Apps Script

```javascript
/**
 * Testing setup with QUnitGS2
 * Library ID: 1tXPhZmIyYiA_EMpTRJw0QpVGT5Pdb02PpOHCi9A9FFidblOc9CY_VLgG
 */

// TestRunner.js
function runAllTests() {
  testDataManager();
  testCalculations();
  testValidation();
  testIntegration();
  testPerformance();
}

function doGet(e) {
  QUnitGS2.init();
  
  // Configure QUnit
  QUnit.config({
    title: 'College Spreadsheet Test Suite',
    requireExpects: false,
    autostart: false
  });
  
  // Load tests
  QUnit.load(runAllTests);
  QUnit.start();
  
  return QUnitGS2.getHtml();
}

function getResultsFromServer() {
  return QUnitGS2.getResultsFromServer();
}
```

### Unit Test Examples

```javascript
/**
 * Data Manager Tests
 */
function testDataManager() {
  QUnit.module('DataManager Tests');
  
  QUnit.test('Should batch read data correctly', function(assert) {
    const manager = new SpreadsheetDataManager();
    const data = manager.loadSheetData('Master');
    
    assert.ok(Array.isArray(data), 'Returns array');
    assert.ok(data.length > 0, 'Has data');
    assert.ok(data[0].length > 0, 'Has columns');
  });
  
  QUnit.test('Should cache data properly', function(assert) {
    const manager = new SpreadsheetDataManager();
    const data1 = manager.loadSheetData('Master');
    const data2 = manager.loadSheetData('Master');
    
    assert.strictEqual(data1, data2, 'Returns cached instance');
  });
  
  QUnit.test('Should invalidate cache after save', function(assert) {
    const manager = new SpreadsheetDataManager();
    const data = [[1, 2, 3]];
    
    manager.loadSheetData('Test');
    manager.saveSheetData('Test', data);
    
    const cache = CacheService.getScriptCache();
    assert.notOk(cache.get('sheet_Test'), 'Cache cleared');
  });
}

/**
 * Calculation Tests
 */
function testCalculations() {
  QUnit.module('Calculation Tests');
  
  QUnit.test('Admission chances calculation', function(assert) {
    const calc = new AdmissionCalculator();
    const result = calc.calculate(
      { gpa: 3.8, sat: 1450 },
      { avgGpa: 3.5, avgSat: 1400, admissionRate: 30, sat75th: 1420 }
    );
    
    assert.ok(result.percentage > 30, 'Above average chance');
    assert.equal(result.category, 'Match', 'Correct category');
    assert.ok(result.score > 85, 'High score');
  });
  
  QUnit.test('Financial aid calculation', function(assert) {
    const calc = new FinancialCalculator();
    const result = calc.calculate({
      totalCost: 70000,
      efc: 20000,
      meritAid: 15000
    });
    
    assert.equal(result.netPrice, 35000, 'Correct net price');
    assert.equal(result.fourYearCost, 140000, 'Correct 4-year cost');
  });
}

/**
 * Performance Tests
 */
function testPerformance() {
  QUnit.module('Performance Tests');
  
  QUnit.test('Batch operations should be fast', function(assert) {
    const start = new Date().getTime();
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName('Test');
    const data = Array(100).fill().map(() => Array(10).fill('test'));
    
    sheet.getRange(1, 1, 100, 10).setValues(data);
    
    const duration = new Date().getTime() - start;
    assert.ok(duration < 2000, `Operation took ${duration}ms`);
  });
}
```

### Mock Data for Testing

```javascript
/**
 * Mock data generator for tests
 */
class MockDataGenerator {
  static generateColleges(count = 10) {
    return Array(count).fill().map((_, i) => ({
      name: `Test College ${i}`,
      state: ['CA', 'NY', 'TX', 'FL'][i % 4],
      admissionRate: Math.random() * 50 + 10,
      gpa: Math.random() * 1 + 3,
      sat: Math.random() * 400 + 1200,
      netPrice: Math.random() * 30000 + 20000
    }));
  }
  
  static generateStudentProfile() {
    return {
      gpa: 3.75,
      sat: 1450,
      state: 'CA',
      income: 100000
    };
  }
}
```

---

## 6. Security Best Practices

### Input Validation and Sanitization

```javascript
/**
 * Security utilities
 */
class Security {
  /**
   * Validate user permissions
   */
  static checkPermission(requiredRole) {
    const userEmail = Session.getActiveUser().getEmail();
    const permissions = this.getUserPermissions(userEmail);
    
    if (!permissions.includes(requiredRole)) {
      throw new AuthorizationError(
        `User ${userEmail} lacks required role: ${requiredRole}`
      );
    }
  }
  
  /**
   * Sanitize input data
   */
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }
  
  /**
   * Rate limiting
   */
  static checkRateLimit(action, limit = 100) {
    const cache = CacheService.getUserCache();
    const key = `rate_limit_${action}_${Session.getActiveUser().getEmail()}`;
    const count = parseInt(cache.get(key) || '0');
    
    if (count >= limit) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    cache.put(key, String(count + 1), 3600); // Reset after 1 hour
  }
  
  /**
   * Get user permissions from sheet or service
   */
  static getUserPermissions(email) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName('Permissions');
    
    if (!sheet) return ['viewer'];
    
    const data = sheet.getDataRange().getValues();
    const userRow = data.find(row => row[0] === email);
    
    return userRow ? userRow[1].split(',') : ['viewer'];
  }
}
```

### Lock Service for Concurrent Access

```javascript
/**
 * Thread-safe operations using Lock Service
 */
class DataProtector {
  static performAtomicOperation(func, timeoutMs = 10000) {
    const lock = LockService.getScriptLock();
    
    try {
      lock.waitLock(timeoutMs);
      return func();
    } catch (e) {
      throw new Error(`Could not obtain lock: ${e.message}`);
    } finally {
      lock.releaseLock();
    }
  }
  
  static updateWithLock(sheetName, data) {
    return this.performAtomicOperation(() => {
      const sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(sheetName);
      
      // Critical section - only one execution at a time
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, data.length, data[0].length)
        .setValues(data);
    });
  }
}
```

---

## 7. Development Workflow

### Clasp Setup and Configuration

```bash
# Installation
npm install -g @google/clasp

# Authentication
clasp login

# Create new project
mkdir college-spreadsheet
cd college-spreadsheet
clasp create --title "College Selection System" --type sheets

# Development workflow
clasp pull    # Download latest from Google
git add .     # Version control
git commit -m "feat: Add admission calculator"
clasp push    # Upload to Google
clasp open    # Open in browser

# Deployment
clasp version "v1.0.0 - Initial release"
clasp deploy -V 1 -d "Production"
```

### .claspignore Configuration

```
# .claspignore - Files to exclude from upload
node_modules/**
.git/**
*.test.js
*.spec.js
README.md
.env
.eslintrc.json
package*.json
docs/**
coverage/**
```

### ESLint Configuration

```json
{
  "env": {
    "es6": true,
    "googleappsscript/googleappsscript": true
  },
  "extends": ["eslint:recommended"],
  "plugins": ["googleappsscript"],
  "parserOptions": {
    "ecmaVersion": 2020
  },
  "globals": {
    "SpreadsheetApp": "readonly",
    "CacheService": "readonly",
    "Logger": "readonly",
    "Session": "readonly",
    "Utilities": "readonly",
    "LockService": "readonly",
    "UrlFetchApp": "readonly",
    "HtmlService": "readonly",
    "ScriptApp": "readonly",
    "DriveApp": "readonly",
    "Sheets": "readonly"
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^e$" }],
    "no-undef": "error",
    "semi": ["error", "always"],
    "quotes": ["error", "single"],
    "indent": ["error", 2],
    "max-len": ["warn", { "code": 100 }],
    "complexity": ["warn", 10],
    "max-depth": ["warn", 3],
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Git Workflow

```bash
# .gitignore
.clasp.json
.clasprc.json
node_modules/
.env
*.log
coverage/

# Branch strategy
git checkout -b feature/admission-calculator
# ... make changes ...
git add .
git commit -m "feat: Add admission probability calculator"
git push origin feature/admission-calculator
# Create pull request for review
```

---

## 8. Code Quality Standards

### JSDoc Documentation

```javascript
/**
 * @fileoverview College data management service
 * @author Your Name
 * @version 1.0.0
 */

/**
 * Service for managing college data operations
 * @class
 * @implements {IDataService}
 */
class CollegeDataService {
  /**
   * Creates an instance of CollegeDataService
   * @constructor
   * @param {SpreadsheetManager} spreadsheetManager - Spreadsheet manager instance
   * @param {CacheManager} cacheManager - Cache manager instance
   * @throws {Error} Throws error if managers are not provided
   */
  constructor(spreadsheetManager, cacheManager) {
    if (!spreadsheetManager || !cacheManager) {
      throw new Error('Managers are required');
    }
    
    /** @private {SpreadsheetManager} */
    this.spreadsheetManager = spreadsheetManager;
    
    /** @private {CacheManager} */
    this.cacheManager = cacheManager;
  }
  
  /**
   * Retrieves colleges based on filter criteria
   * @param {Object} filters - Filter criteria
   * @param {number} [filters.minGpa] - Minimum GPA
   * @param {number} [filters.maxCost] - Maximum cost
   * @param {string} [filters.state] - State location
   * @returns {Promise<College[]>} Promise resolving to array of colleges
   * @example
   * const colleges = await service.getColleges({ minGpa: 3.5, state: 'CA' });
   */
  async getColleges(filters = {}) {
    try {
      Security.checkRateLimit('getColleges');
      
      const cacheKey = `colleges_${JSON.stringify(filters)}`;
      const cached = this.cacheManager.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      const colleges = await this.spreadsheetManager
        .getFilteredData('Master', filters);
      
      this.cacheManager.set(cacheKey, JSON.stringify(colleges), 300);
      
      return colleges;
    } catch (error) {
      ErrorHandler.handle(error, { filters });
      throw error;
    }
  }
}
```

### Code Review Checklist

```markdown
## Code Review Checklist

### ✅ Performance
- [ ] Uses batch operations (getValues/setValues)
- [ ] Implements caching where appropriate
- [ ] Avoids unnecessary API calls
- [ ] Uses LockService for concurrent operations
- [ ] No getValue/setValue in loops
- [ ] Batch size limits respected (< 1000 rows)

### ✅ Quality
- [ ] All functions have JSDoc comments
- [ ] Error handling is comprehensive
- [ ] No console.log in production code
- [ ] Code passes ESLint rules
- [ ] Functions are < 50 lines
- [ ] Cyclomatic complexity < 10

### ✅ Security
- [ ] Input validation is implemented
- [ ] Permissions are checked
- [ ] No sensitive data in code
- [ ] Rate limiting is considered
- [ ] SQL injection prevention (if using JDBC)
- [ ] XSS prevention in HTML service

### ✅ Testing
- [ ] Unit tests exist and pass
- [ ] Edge cases are tested
- [ ] Integration tests for critical paths
- [ ] Performance benchmarks meet requirements
- [ ] Test coverage > 80%

### ✅ Documentation
- [ ] README is updated
- [ ] API documentation is complete
- [ ] Complex logic is explained
- [ ] Change log is updated
- [ ] Deployment instructions included
```

---

## 9. Implementation Checklist

### Week 1: Foundation Setup
- [ ] Set up clasp and local development environment
- [ ] Configure ESLint and code formatting
- [ ] Create project structure with proper folders
- [ ] Implement base configuration object
- [ ] Set up error handling framework
- [ ] Create performance monitoring utilities
- [ ] Initialize version control (Git)

### Week 2: Core Architecture
- [ ] Implement SpreadsheetManager singleton
- [ ] Create repository pattern for data access
- [ ] Set up dependency injection container
- [ ] Implement caching strategy
- [ ] Create base service classes
- [ ] Add input validation utilities
- [ ] Implement batch operation helpers

### Week 3: Business Logic
- [ ] Build calculation factories
- [ ] Implement college data service
- [ ] Create financial aid calculator
- [ ] Add admission probability calculator
- [ ] Implement value score algorithm
- [ ] Create data import/export functions
- [ ] Add scholarship tracking logic

### Week 4: Testing & Security
- [ ] Set up QUnit testing framework
- [ ] Write unit tests for core functions
- [ ] Add integration tests
- [ ] Implement security checks
- [ ] Add rate limiting
- [ ] Create permission system
- [ ] Performance benchmark tests

### Week 5: Polish & Deploy
- [ ] Complete JSDoc documentation
- [ ] Optimize slow operations
- [ ] Add user interface improvements
- [ ] Create deployment scripts
- [ ] Write user documentation
- [ ] Set up monitoring/alerts
- [ ] Deploy to production

### Ongoing Maintenance
- [ ] Monitor performance logs weekly
- [ ] Review error logs daily
- [ ] Update dependencies monthly
- [ ] Backup data weekly
- [ ] Security audit quarterly
- [ ] Performance optimization as needed
- [ ] User feedback integration

## Quick Reference

### Most Important Performance Rules
1. **Always use batch operations** - 70x faster
2. **Cache everything possible** - Reduce API calls
3. **Read once, write once** - Minimize sheet access
4. **Use V8 runtime** - Modern JavaScript performance
5. **Profile slow operations** - Monitor and optimize

### Common Pitfalls to Avoid
- ❌ getValue/setValue in loops
- ❌ Not using cache service
- ❌ Synchronous operations without locks
- ❌ Missing error handling
- ❌ No input validation
- ❌ Forgetting to batch operations
- ❌ Not clearing cache after updates

### Essential Commands
```bash
clasp pull          # Download from Google
clasp push          # Upload to Google
clasp open          # Open in browser
clasp logs          # View logs
clasp run function  # Run function remotely
clasp deploy        # Create deployment
```

### Performance Targets
- Sheet read: < 500ms for 1000 rows
- Sheet write: < 1000ms for 1000 rows
- Calculation: < 100ms per college
- Cache hit rate: > 80%
- Error rate: < 0.1%
- User response time: < 2 seconds

---

*This guide combines Google Apps Script best practices with specific optimizations for Google Sheets development. Following these patterns will result in maintainable, performant, and reliable applications.*