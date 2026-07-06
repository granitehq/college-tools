#!/usr/bin/env node

/**
 * Updates the published spreadsheet's "Copy Template" link across the
 * website. Drive's "Make a copy" always mints a new file ID when the
 * template is promoted to a new published copy, so this is the one place
 * that ID needs to change per release.
 *
 * Usage: node scripts/update-template-link.js <new-sheet-id>
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const HTML_FILES = ['index.html', 'features.html', 'getting-started.html'];
const COPY_LINK_PATTERN = /(https:\/\/docs\.google\.com\/spreadsheets\/d\/)([a-zA-Z0-9_-]+)(\/copy)/g;

function updateFile(filePath, newId) {
  if (!fs.existsSync(filePath)) return {found: false, changed: false};

  const content = fs.readFileSync(filePath, 'utf8');
  let found = false;
  const updated = content.replace(COPY_LINK_PATTERN, (match, prefix, id, suffix) => {
    found = true;
    return prefix + newId + suffix;
  });

  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    return {found, changed: true};
  }
  return {found, changed: false};
}

function main() {
  const newId = process.argv[2];

  if (!newId || !/^[a-zA-Z0-9_-]{20,}$/.test(newId)) {
    console.error('Usage: node scripts/update-template-link.js <new-sheet-id>');
    console.error('The Sheets ID is the segment between /d/ and /edit (or /copy) in its URL.');
    process.exit(1);
  }

  console.log(`Updating published template link to ${newId}...`);

  let updatedCount = 0;
  HTML_FILES.forEach((file) => {
    const filePath = path.join(DOCS_DIR, file);
    const result = updateFile(filePath, newId);
    if (result.changed) {
      console.log(`✓ Updated ${file}`);
      updatedCount++;
    } else if (result.found) {
      console.log(`- ${file} already links to ${newId}`);
    } else {
      console.warn(`⚠ No Copy Template link found in ${file}`);
    }
  });

  console.log(`\nDone. Updated ${updatedCount} file(s).`);
  console.log('Review with git diff, then commit and push to deploy the website.');
}

module.exports = {updateFile, COPY_LINK_PATTERN};

if (require.main === module) {
  main();
}
