/**
 * Menu wiring and adapter tests.
 */

const fs = require('fs');
const path = require('path');
const {TestSuite} = require('./support');

const menuPath = path.join(__dirname, '..', 'src', 'menu.js');
const menuSource = fs.readFileSync(menuPath, 'utf8');
const suite = new TestSuite();

function extractMenuTargets(source) {
  const targets = [];
  const regex = /\.addItem\([^,]+,\s*'([^']+)'\)/g;
  let match = regex.exec(source);
  while (match) {
    targets.push(match[1]);
    match = regex.exec(source);
  }
  return targets;
}

function extractGlobalFunctions(source) {
  const functions = [];
  const regex = /^function\s+([A-Za-z0-9_]+)\s*\(/gm;
  let match = regex.exec(source);
  while (match) {
    functions.push(match[1]);
    match = regex.exec(source);
  }
  return functions;
}

suite.test('all menu item targets have a corresponding global adapter', () => {
  const targets = extractMenuTargets(menuSource);
  const globals = extractGlobalFunctions(menuSource);

  targets.forEach((target) => {
    suite.assert(globals.includes(target), `Menu target ${target} should exist as a global function`);
  });
});

suite.test('all non-onOpen global adapters delegate into the CollegeTools namespace', () => {
  const globals = extractGlobalFunctions(menuSource).filter((name) => name !== 'onOpen');

  globals.forEach((fnName) => {
    const adapterRegex = new RegExp('function\\s+' + fnName + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?return\\s+CollegeTools\\.[A-Za-z0-9_]+\\.[A-Za-z0-9_]+\\(');
    suite.assert(adapterRegex.test(menuSource),
      `Global adapter ${fnName} should delegate into a CollegeTools module`);
  });
});

suite.test('repair menu item is present', () => {
  suite.assert(menuSource.includes("Repair College Sync Across Tabs"),
    'Repair College Sync menu item should be exposed');
  suite.assert(menuSource.includes("function repairCollegeSync()"),
    'Repair College Sync adapter should exist');
  suite.assert(menuSource.includes("Repair Entire Workbook"),
    'Repair Entire Workbook menu item should be exposed');
  suite.assert(menuSource.includes("Repair Validations & Dropdowns"),
    'Repair Validations & Dropdowns menu item should be exposed');
});


suite.test('travel planner refresh menu item is present', () => {
  suite.assert(menuSource.includes('Refresh Travel Planner'),
    'Travel Planner refresh menu item should be exposed');
  suite.assert(menuSource.includes('function refreshTravelPlanner()'),
    'Travel Planner refresh adapter should exist');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
