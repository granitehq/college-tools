/**
 * Tests for scripts/update-template-link.js — the release-promotion helper
 * that rewrites the published "Copy Template" link across the website.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {TestSuite} = require('./support');
const {updateFile} = require('../scripts/update-template-link');

const suite = new TestSuite();

function writeTempHtml(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-link-test-'));
  const filePath = path.join(dir, 'page.html');
  fs.writeFileSync(filePath, content);
  return filePath;
}

suite.test('replaces the Sheets ID in a Copy Template link', () => {
  const filePath = writeTempHtml(
    '<a href="https://docs.google.com/spreadsheets/d/OLDID123456789012345/copy">Copy Template</a>'
  );

  const result = updateFile(filePath, 'NEWID987654321098765');

  suite.assert(result.changed, 'Expected the file to be reported as changed');
  const updated = fs.readFileSync(filePath, 'utf8');
  suite.assert(updated.indexOf('NEWID987654321098765') !== -1, 'New ID should appear in the file');
  suite.assert(updated.indexOf('OLDID123456789012345') === -1, 'Old ID should be gone');
});

suite.test('reports found-but-unchanged when the ID already matches', () => {
  const filePath = writeTempHtml(
    '<a href="https://docs.google.com/spreadsheets/d/SAMEID12345678901234/copy">Copy Template</a>'
  );

  const result = updateFile(filePath, 'SAMEID12345678901234');

  suite.assert(result.found, 'Expected the link pattern to be found');
  suite.assert(!result.changed, 'Expected no change when the ID already matches');
});

suite.test('reports not-found when the file has no Copy Template link', () => {
  const filePath = writeTempHtml('<p>No links here.</p>');

  const result = updateFile(filePath, 'NEWID987654321098765');

  suite.assert(!result.found, 'Expected no link pattern to be found');
  suite.assert(!result.changed, 'Expected no change when nothing matched');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
