/**
 * Tests for scripts/push-updates.js release safety helpers.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {TestSuite} = require('./support');
const {
  filterRegistry,
  loadLocalSource,
  parseArgs,
  pushRegistryTargets,
} = require('../scripts/push-updates');

const suite = new TestSuite();
const asyncTests = [];

function assertThrows(fn, expectedMessage) {
  try {
    fn();
  } catch (err) {
    suite.assert(String(err.message || err).includes(expectedMessage),
      `Expected error to include ${expectedMessage}, got ${err.message || err}`);
    return;
  }
  throw new Error(`Expected error containing ${expectedMessage}`);
}

function asyncTest(name, fn) {
  asyncTests.push({name, fn});
}

function makeTempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-updates-test-'));
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir);
  fs.writeFileSync(path.join(dir, 'appsscript.json'), JSON.stringify({rootManifest: true}));
  fs.writeFileSync(path.join(srcDir, 'appsscript.json'), JSON.stringify({srcManifest: true}));
  fs.writeFileSync(path.join(srcDir, 'menu.js'), 'function onOpen() {}');
  return {dir, srcDir};
}

suite.test('loadLocalSource uses the root manifest instead of the src placeholder manifest', () => {
  const {dir, srcDir} = makeTempProject();

  const files = loadLocalSource(srcDir, path.join(dir, 'appsscript.json'));
  const manifest = files.find((file) => file.name === 'appsscript');

  suite.assert(manifest, 'Manifest should be included in the Apps Script payload');
  suite.assert(manifest.source.includes('rootManifest'), 'Root manifest should be pushed');
  suite.assert(!manifest.source.includes('srcManifest'), 'src/appsscript.json should not override the root manifest');
});



suite.test('tracked Apps Script manifests stay aligned and allow registry posts', () => {
  const rootManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'appsscript.json'), 'utf8'));
  const srcManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'appsscript.json'), 'utf8'));

  suite.assertEqual(JSON.stringify(srcManifest), JSON.stringify(rootManifest),
    'Root and src appsscript manifests should stay aligned');
  suite.assert(rootManifest.urlFetchAllowlist.includes('https://script.google.com/'),
    'Manifest URL fetch allowlist should include the Apps Script registry Web App host');
});

suite.test('parseArgs fails closed for missing values, unknown flags, and invalid limits', () => {
  assertThrows(() => parseArgs(['--script-id']), 'Missing value for --script-id');
  assertThrows(() => parseArgs(['--dryrun']), 'Unknown argument --dryrun');
  assertThrows(() => parseArgs(['--limit', 'abc']), 'Invalid --limit value abc');
  assertThrows(() => parseArgs(['--limit', '0']), 'Invalid --limit value 0');
});

suite.test('filterRegistry fails when a requested script ID matches no registry rows', () => {
  const registry = [{scriptId: 'known-script'}];

  assertThrows(() => filterRegistry(registry, {scriptId: 'missing-script', limit: 0}),
    'No registry rows matched --script-id missing-script');
});

asyncTest('pushRegistryTargets reports target failures and does not call updateContent in dry run', async () => {
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-backups-test-'));
  const calls = {updates: 0};
  const scriptClient = {
    projects: {
      async getContent({scriptId}) {
        if (scriptId === 'bad-script') throw new Error('access denied');
        return {data: {files: [{name: 'Code', source: 'old'}]}};
      },
      async updateContent() {
        calls.updates++;
      },
    },
  };

  const result = await pushRegistryTargets(scriptClient, [
    {scriptId: 'good-script', ownerEmail: 'good@example.com'},
    {scriptId: 'bad-script', ownerEmail: 'bad@example.com'},
  ], [{name: 'Code', type: 'SERVER_JS', source: 'new'}], {
    dryRun: true,
    backupDir,
    delayMs: 0,
  });

  suite.assertEqual(result.successCount, 1, 'One target should validate successfully');
  suite.assertEqual(result.failureCount, 1, 'One target failure should be counted');
  suite.assertEqual(calls.updates, 0, 'Dry run must not update remote script content');
});

(async () => {
  for (const test of asyncTests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
      suite.passed++;
    } catch (error) {
      console.log(`FAIL ${test.name}: ${error.message}`);
      suite.failed++;
      suite.errors.push({name: test.name, error: error.message});
    }
  }
  const success = suite.summary();
  process.exit(success ? 0 : 1);
})();
