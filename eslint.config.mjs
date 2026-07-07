/**
 * ESLint flat config (ESLint 9+).
 *
 * Replaces the legacy .eslintrc.js + eslint-config-google setup:
 * - Google-style formatting rules now come from @stylistic
 *   (core formatting rules were removed in ESLint 10).
 * - JSDoc enforcement (formerly require-jsdoc/valid-jsdoc, removed
 *   from ESLint core) now comes from eslint-plugin-jsdoc.
 */

import stylistic from '@stylistic/eslint-plugin';
import jsdoc from 'eslint-plugin-jsdoc';

// Google Apps Script services plus this project's globals.
const appsScriptGlobals = {
  SpreadsheetApp: 'readonly',
  Utilities: 'readonly',
  UrlFetchApp: 'readonly',
  CacheService: 'readonly',
  PropertiesService: 'readonly',
  ScriptApp: 'readonly',
  Session: 'readonly',
  DriveApp: 'readonly',
  Logger: 'readonly',

  // Our namespace
  CollegeTools: 'writable',

  // Menu adapter functions (global scope required by Apps Script)
  onOpen: 'writable',
  fillCollegeRow: 'writable',
  fillSelectedRows: 'writable',
  debugFillCollegeRow: 'writable',
  showVersion: 'writable',
  setupAllTrackers: 'writable',
  setupDashboard: 'writable',
  refreshDashboard: 'writable',
  enhanceFormatsDropdowns: 'writable',
  ensureScoring: 'writable',
  searchCollegeNames: 'writable',
  fillRegionsAllRows: 'writable',
  clearApiCache: 'writable',
};

export default [
  {
    ignores: ['node_modules/', 'website/', 'test/', 'scripts/'],
  },
  {
    files: ['src/**/*.js'],
    plugins: {
      '@stylistic': stylistic,
      'jsdoc': jsdoc,
    },
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'script',
      globals: appsScriptGlobals,
    },
    rules: {
      // --- Google style: possible errors / best practices ---
      'no-cond-assign': 'off',
      'no-irregular-whitespace': 'error',
      'no-unexpected-multiline': 'error',
      'curly': ['error', 'multi-line'],
      'guard-for-in': 'error',
      'no-caller': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-invalid-this': 'error',
      'no-multi-str': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-with': 'error',
      'prefer-promise-reject-errors': 'error',
      'new-cap': 'error',
      'no-array-constructor': 'error',
      'no-object-constructor': 'error',
      'one-var': ['error', {var: 'never', let: 'never', const: 'never'}],
      'constructor-super': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-this-before-super': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',

      // --- Google style: formatting (via @stylistic) ---
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/block-spacing': ['error', 'never'],
      '@stylistic/brace-style': 'error',
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/comma-spacing': 'error',
      '@stylistic/comma-style': 'error',
      '@stylistic/computed-property-spacing': 'error',
      '@stylistic/eol-last': 'error',
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/key-spacing': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/linebreak-style': 'error',
      '@stylistic/max-len': ['error', {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
      }],
      '@stylistic/no-mixed-spaces-and-tabs': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', {max: 2}],
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': 'error',
      '@stylistic/operator-linebreak': ['error', 'after'],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/quote-props': ['error', 'consistent'],
      '@stylistic/quotes': ['error', 'single', {allowTemplateLiterals: 'always'}],
      '@stylistic/semi': 'error',
      '@stylistic/semi-spacing': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-before-function-paren': ['error', {
        asyncArrow: 'always',
        anonymous: 'never',
        named: 'never',
      }],
      '@stylistic/spaced-comment': ['error', 'always'],
      '@stylistic/switch-colon-spacing': 'error',
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/generator-star-spacing': ['error', 'after'],
      '@stylistic/rest-spread-spacing': 'error',
      '@stylistic/yield-star-spacing': ['error', 'after'],

      // --- JSDoc (replaces removed require-jsdoc / valid-jsdoc) ---
      'jsdoc/require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: false,
          ClassDeclaration: false,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      }],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-returns-type': 'error',

      // --- Apps Script specific adjustments ---
      'no-var': 'off', // Apps Script code commonly uses var
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'off',
      'object-shorthand': 'off',
      'prefer-template': 'off',

      // --- Code quality ---
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-console': 'warn', // Prefer Logger.log in Apps Script
      'no-alert': 'off', // SpreadsheetApp.getUi().alert() is standard
      'camelcase': ['error', {properties: 'never'}], // API responses use snake_case
      'no-undef': 'error',
      'no-global-assign': 'error',
      'no-implicit-globals': 'error',
    },
  },
  {
    // Config file can hold longer lines
    files: ['src/config.js'],
    rules: {
      '@stylistic/max-len': ['error', {code: 140, ignoreUrls: true, ignoreStrings: true}],
    },
  },
  {
    // Menu functions are invoked by Google Sheets, not referenced in code
    files: ['src/menu.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
