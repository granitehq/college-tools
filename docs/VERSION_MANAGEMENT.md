# Version Management

College Tools uses semantic versioning (semver) with automated version management across all source files.

## Version Format

We follow semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes or significant architectural changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, small improvements

Current version: **5.6.0**

## Automated Version Updates

The version management system automatically updates:

1. **package.json** - Main version source
2. **All source files** - `@version` tags in file headers  
3. **config.js** - `VERSION` constant used throughout the app
4. **Runtime displays** - "Show version" menu uses dynamic version

## Commands

### Quick Commands
```bash
npm run version:show     # Display current version
npm run version:patch    # 5.6.0 → 5.6.1 (bug fixes)
npm run version:minor    # 5.6.0 → 5.7.0 (new features)  
npm run version:major    # 5.6.0 → 6.0.0 (breaking changes)
npm run release          # Patch + lint + deploy
```

### Manual Version Setting
```bash
npm run version:update 5.7.0    # Set specific version
```

### Apps Script Versioning
```bash
npm run clasp:version "Feature: Add batch processing"
```

## Workflow Examples

### Bug Fix Release
```bash
npm run version:patch    # Updates to 5.6.1
git add -A && git commit -m "chore: bump version to 5.6.1"
npm run push            # Deploy to Apps Script
```

### Feature Release
```bash
npm run version:minor    # Updates to 5.7.0  
git add -A && git commit -m "chore: bump version to 5.7.0"
git tag v5.7.0
npm run push            # Deploy to Apps Script
npm run clasp:version "v5.7.0 - Enhanced API caching"
```

### Quick Release (Patch + Deploy)
```bash
npm run release         # Does: patch → lint → push
```

## Version Consistency

The system ensures version consistency across:

✅ **File Headers**: All source files have `@version 5.6.0` tags  
✅ **Runtime Version**: `CollegeTools.Config.VERSION` used everywhere  
✅ **User-Agent**: API calls include version in User-Agent header  
✅ **Menu Display**: "Show version" displays current version  
✅ **Notes Field**: College data rows include version in notes  

## File Structure

```
scripts/
└── update-version.js    # Version update automation

src/
├── config.js           # VERSION constant (source of truth)
├── colleges.js         # showVersion() function
├── scorecard.js        # User-Agent with version
└── *.js               # All files have @version headers
```

## Manual Updates

If you need to manually update versions:

1. **Update package.json** version field
2. **Run update script**: `npm run version:update <version>`  
3. **Verify consistency**: Check that all files updated

The script will update all files automatically and show a summary.

## Integration with Git

Recommended Git workflow with versions:

```bash
# Make changes...
npm run version:minor           # Update version  
git add -A
git commit -m "feat: new search functionality"
git tag v$(node -p "require('./package.json').version")
git push origin main --tags
npm run push                   # Deploy to Apps Script
```

## Troubleshooting

**Q: Version script fails with "file not found"**  
A: Ensure you're in the project root directory

**Q: Version not showing in Google Sheets**  
A: Clear Apps Script cache and refresh the sheet

**Q: Versions out of sync between files**  
A: Run `npm run version:update <current-version>` to resync all files