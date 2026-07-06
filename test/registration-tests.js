/**
 * Registration workflow regression tests.
 */

const fs = require('fs');
const path = require('path');
const {createHarness, TestSuite} = require('./support');

const suite = new TestSuite();

function readSource(filename) {
  return fs.readFileSync(path.join(__dirname, '..', 'src', filename), 'utf8');
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}()`);
  if (start === -1) return '';

  const openBrace = source.indexOf('{', start);
  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(openBrace + 1, i);
  }
  return '';
}

function createRegistrationHarness(responseBody, responseCode) {
  const harness = createHarness(['config.js', 'registration.js']);
  const documentStore = {};
  const scriptStore = {
    COLLEGE_TOOLS_REGISTRY_SECRET: 'shared-secret',
  };

  harness.CollegeTools.Config.REGISTRATION_CONFIG.ENDPOINT_URL = 'https://registry.example/register';

  global.PropertiesService = {
    getDocumentProperties() {
      return {
        getProperty(key) {
          return documentStore[key] || '';
        },
        setProperty(key, value) {
          documentStore[key] = value;
        },
      };
    },
    getScriptProperties() {
      return {
        getProperty(key) {
          return scriptStore[key] || '';
        },
      };
    },
  };

  global.SpreadsheetApp.getActiveSpreadsheet = () => ({
    getId: () => 'spreadsheet-id',
    getUrl: () => 'https://docs.google.com/spreadsheets/d/spreadsheet-id/edit',
  });
  global.ScriptApp = {
    getScriptId: () => 'script-id',
  };
  global.Session = {
    getEffectiveUser: () => ({
      getEmail: () => 'owner@example.com',
    }),
  };
  global.Logger = {
    log() {},
  };
  global.UrlFetchApp = {
    fetch() {
      return {
        getResponseCode: () => responseCode,
        getContentText: () => responseBody,
      };
    },
  };

  return {harness, documentStore};
}

suite.test('onOpen does not attempt copy registration from a simple trigger', () => {
  const onOpenBody = functionBody(readSource('menu.js'), 'onOpen');

  suite.assert(!onOpenBody.includes('registerIfNeeded'),
    'onOpen should not call registration because simple triggers cannot use UrlFetchApp');
});

suite.test('complete setup performs registration from an explicit authorized action', () => {
  const completeSetupBody = functionBody(readSource('setup.js'), 'completeSetup');

  suite.assert(completeSetupBody.includes('CollegeTools.Registration.registerIfNeeded()'),
    'Complete Setup should attempt registration from an explicit menu action');
});

suite.test('registration does not cache success when the registry body rejects the payload', () => {
  const {harness, documentStore} = createRegistrationHarness(
    JSON.stringify({status: 'rejected', code: 403}),
    200,
  );

  const result = harness.CollegeTools.Registration.registerIfNeeded();

  suite.assertEqual(result.ok, false, 'Rejected registry body should fail registration');
  suite.assertEqual(documentStore.lastRegisteredVersion, undefined,
    'Rejected registry body should not cache lastRegisteredVersion');
});

suite.test('registration caches success only for an ok registry body', () => {
  const {harness, documentStore} = createRegistrationHarness(
    JSON.stringify({status: 'ok', code: 200}),
    200,
  );

  const result = harness.CollegeTools.Registration.registerIfNeeded();

  suite.assertEqual(result.ok, true, 'OK registry body should succeed');
  suite.assertEqual(documentStore.lastRegisteredVersion, harness.CollegeTools.Config.VERSION,
    'OK registry body should cache lastRegisteredVersion');
});


suite.test('complete setup surfaces a registration warning when copy registration fails', () => {
  const harness = createHarness(['config.js', 'setup.js']);
  const {CollegeTools, mockUi} = harness;

  CollegeTools.Instructions = {createInstructionsSheet() {}};
  CollegeTools.Trackers = {setupAllTrackers() {}};
  CollegeTools.Dashboard = {setupDashboard() {}};
  CollegeTools.Formatting = {enhanceFormatsDropdowns() {}};
  CollegeTools.Scoring = {ensureScoring() {}};
  CollegeTools.Financial = {runFinancialSetup_() {}};
  CollegeTools.Utils = {trimAllSheets() {}};
  CollegeTools.Registration = {
    registerIfNeeded() {
      return {ok: false, skipped: false, reason: 'registry returned status rejected'};
    },
  };

  CollegeTools.Setup.completeSetup();

  const lastAlert = mockUi.alerts[mockUi.alerts.length - 1];
  suite.assert(lastAlert.message.includes('Registration warning'),
    'Complete Setup should include a visible registration warning when registration fails');
  suite.assert(lastAlert.message.includes('registry returned status rejected'),
    'Complete Setup should include the registration failure reason');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
