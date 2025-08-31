#!/usr/bin/env node

/**
 * Version update script for College Tools
 * Updates version numbers across all files consistently
 */

const fs = require('fs');
const path = require('path');

// Get new version from command line arguments
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: npm run version:update <version>');
  console.error('Example: npm run version:update 5.7.0');
  process.exit(1);
}

// Validate semantic version format
const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(newVersion)) {
  console.error('Error: Version must be in semantic version format (x.y.z)');
  console.error('Example: 5.7.0');
  process.exit(1);
}

console.log(`Updating version to ${newVersion}...`);

// List of files to update
const filesToUpdate = [
  'package.json',
  'src/admissions.js',
  'src/colleges.js',
  'src/config.js',
  'src/dashboard.js',
  'src/financial.js',
  'src/formatting.js',
  'src/instructions.js',
  'src/lookup.js',
  'src/menu.js',
  'src/scorecard.js',
  'src/scoring.js',
  'src/setup.js',
  'src/trackers.js',
  'src/utils.js'
];

let updatedFiles = 0;
let errors = 0;

// Update package.json
try {
  const packagePath = 'package.json';
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(packageContent);
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log(`✓ Updated ${packagePath}`);
  updatedFiles++;
} catch (error) {
  console.error(`✗ Failed to update package.json: ${error.message}`);
  errors++;
}

// Update source files
const sourceFiles = filesToUpdate.filter(f => f.startsWith('src/'));

sourceFiles.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update @version tag in header comment
    const versionRegex = /(@version\s+)\d+\.\d+\.\d+/;
    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `$1${newVersion}`);
    } else {
      console.warn(`⚠ No @version tag found in ${filePath}`);
    }
    
    // Update VERSION constant in config.js
    if (filePath === 'src/config.js') {
      const versionConstRegex = /(var\s+VERSION\s*=\s*['"])[\d.]+(['"];)/;
      if (versionConstRegex.test(content)) {
        content = content.replace(versionConstRegex, `$1${newVersion}$2`);
      } else {
        console.warn(`⚠ No VERSION constant found in ${filePath}`);
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${filePath}`);
    updatedFiles++;
  } catch (error) {
    console.error(`✗ Failed to update ${filePath}: ${error.message}`);
    errors++;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Version update complete!`);
console.log(`✓ Updated: ${updatedFiles} files`);
if (errors > 0) {
  console.log(`✗ Errors: ${errors} files`);
}
console.log(`\nNew version: ${newVersion}`);

// Suggest next steps
console.log('\nNEXT STEPS:');
console.log('1. Review changes: git diff');
console.log('2. Test the update: npm run lint');
console.log('3. Commit changes: git add -A && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('4. Tag release: git tag v' + newVersion);
console.log('5. Push to Apps Script: npm run push');

process.exit(errors > 0 ? 1 : 0);