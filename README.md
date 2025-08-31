# College Tools

A Google Apps Script project for college selection and tracking with College Scorecard API integration.

## Quick Start

1. **Setup development environment:**
   ```bash
   npm install
   clasp login
   ```

2. **Development workflow:**
   ```bash
   clasp pull          # Sync from Apps Script
   # Edit files...
   npm run lint:fix    # Auto-fix style issues
   npm run push        # Lint + push to Apps Script
   ```

3. **See HOWTO.md for detailed setup and workflow instructions**

## Features

- 🏫 **College Data Integration** - Fetch data from College Scorecard API
- 📊 **Tracker Sheets** - Financial aid, campus visits, applications, scholarships
- 🎯 **Weighted Scoring** - Customizable criteria weighting system
- 🔍 **College Search** - Smart search with multiple fallback strategies
- 📈 **Batch Operations** - Fill multiple rows with quota management
- ⚡ **Performance** - Caching and retry logic for reliability

## Code Quality

- **ESLint Integration** - Automated code style and syntax checking
- **Apps Script Optimized** - Configuration tailored for Google Apps Script
- **Pre-commit Hooks** - Optional git hooks for quality gates
- **Modular Architecture** - Clean separation of concerns

## Project Structure

```
src/
├── config.js       # Configuration and constants
├── utils.js        # Utility functions
├── scorecard.js    # API client with caching/retry logic
├── colleges.js     # Core college data operations
├── trackers.js     # Tracker sheet management
├── formatting.js   # Validation and formatting
├── scoring.js      # Weighted scoring system
├── lookup.js       # College search functionality
└── menu.js         # Menu setup and global adapters
```

## Development Commands

```bash
# Linting
npm run lint          # Check code style
npm run lint:fix      # Auto-fix issues
npm run lint:check    # Zero-tolerance check

# Version Management
npm run version:show  # Display current version
npm run version:patch # Increment patch (5.6.0 → 5.6.1)
npm run version:minor # Increment minor (5.6.0 → 5.7.0)
npm run version:major # Increment major (5.6.0 → 6.0.0)
npm run release       # Patch + lint + deploy

# Apps Script
npm run push          # Lint + clasp push
npm run pull          # clasp pull
npm run clasp:version # Create Apps Script version

# Setup
npm install           # Install dependencies
```

## License

MIT