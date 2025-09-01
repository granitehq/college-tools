#!/usr/bin/env node

/**
 * Simple build script for College Tools website
 * Only updates git hash in footer - preserves all existing content
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR = path.join(__dirname, '..', 'docs');

// Get git commit hash
function getGitHash() {
    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
        console.warn('Could not get git hash:', error.message);
        return 'dev';
    }
}

// Update git hash in HTML files
function updateGitHashInFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const gitHash = getGitHash();
    
    // Update the version in footer
    const updatedContent = content.replace(
        /(<p>&copy; \d{4} Granite HQ, LLC\. • v)[^<]+(<\/p>)/,
        `$1${gitHash}$2`
    );
    
    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        return true;
    }
    return false;
}

function buildWebsite() {
    console.log('🔄 Updating git hashes in website files...');
    
    const htmlFiles = [
        'index.html',
        'getting-started.html', 
        'features.html',
        'privacy.html',
        'terms.html'
    ];
    
    let updatedCount = 0;
    
    htmlFiles.forEach(file => {
        const filePath = path.join(DOCS_DIR, file);
        if (updateGitHashInFile(filePath)) {
            console.log(`✅ Updated ${file}`);
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        console.log(`🚀 Build complete! Updated ${updatedCount} files with git hash.`);
    } else {
        console.log('✨ No updates needed - all files current.');
    }
}

// Run the build
buildWebsite();