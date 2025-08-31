module.exports = {
  "env": {
    "browser": false,
    "node": false,
    "es6": true
  },
  "extends": [
    "google"
  ],
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "script"
  },
  "globals": {
    // Google Apps Script globals
    "SpreadsheetApp": "readonly",
    "Utilities": "readonly",
    "UrlFetchApp": "readonly",
    "CacheService": "readonly",
    "PropertiesService": "readonly",
    "ScriptApp": "readonly",
    "Session": "readonly",
    "DriveApp": "readonly",
    "Logger": "readonly",
    
    // Our namespace
    "CollegeTools": "writable",
    
    // Menu adapter functions (global scope required)
    "onOpen": "writable",
    "fillCollegeRow": "writable",
    "fillCollegeRowFast": "writable",
    "fillSelectedRows": "writable",
    "debugFillCollegeRow": "writable", 
    "showVersion": "writable",
    "setupAllTrackers": "writable",
    "setupDashboard": "writable",
    "refreshDashboard": "writable",
    "enhanceFormatsDropdowns": "writable",
    "ensureScoring": "writable",
    "searchCollegeNames": "writable",
    "fillRegionsAllRows": "writable",
    "testCollegeNameValidation": "writable",
    "showQuotaStatus": "writable",
    "clearApiCache": "writable"
  },
  "rules": {
    // Adjust Google style rules for Apps Script context
    "max-len": ["error", {"code": 120, "ignoreUrls": true, "ignoreStrings": true}],
    "indent": ["error", 2],
    "require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": false,
        "ClassDeclaration": false,
        "ArrowFunctionExpression": false,
        "FunctionExpression": false
      }
    }],
    "valid-jsdoc": ["error", {
      "requireReturn": false,
      "requireReturnDescription": false,
      "requireParamDescription": true
    }],
    
    // Apps Script specific adjustments
    "no-var": "off",  // Apps Script uses ES5, var is common
    "prefer-const": "warn",  // Encourage const but don't enforce
    "prefer-arrow-callback": "off",  // Function expressions are fine in Apps Script
    "object-shorthand": "off",  // ES5 compatibility
    "prefer-template": "off",  // String concatenation is fine
    
    // Code quality rules
    "no-unused-vars": ["error", {"argsIgnorePattern": "^_", "varsIgnorePattern": "^_"}],
    "no-console": "warn",  // Prefer Logger.log in Apps Script
    "no-alert": "off",  // SpreadsheetApp.getUi().alert() is standard
    "camelcase": ["error", {"properties": "never"}],  // Allow snake_case in API responses
    
    // Prevent common Apps Script issues
    "no-undef": "error",
    "no-global-assign": "error",
    "no-implicit-globals": "error"
  },
  "overrides": [
    {
      // Config files can be more relaxed
      "files": ["src/config.js"],
      "rules": {
        "max-len": ["error", {"code": 140}]
      }
    },
    {
      // Menu file needs globals
      "files": ["src/menu.js"],
      "rules": {
        "no-unused-vars": "off"  // Global functions are used by Google Sheets
      }
    }
  ]
};