# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: API Response Format

**The College Scorecard API returns FLATTENED keys, not nested objects:**
- Use: `r['school.city']` NOT `r.school.city`
- Use: `r['latest.admissions.admission_rate.overall']` NOT `r.latest.admissions.admission_rate.overall`
- This flattened structure applies to ALL API response data

## Project Overview

This is a Google Apps Script project for college selection and tracking in Google Sheets. It integrates with the College Scorecard API to fetch college data and provides comprehensive tracking tools for the college application process.

## Development Commands

### clasp Workflow

- **Pull latest from Apps Script:** `clasp pull`
- **Push changes to Apps Script:** `clasp push`
- **Create version:** `clasp version "v5.x - description"`
- **View versions:** `clasp versions`
- **Check login status:** `clasp login --status`

### Git Workflow

- **Commit changes:** Standard git workflow after `clasp pull`
- **Rollback:** `git checkout <commit>` then `clasp push`

## Architecture

The project uses Google Apps Script with a bound script (ID: `1DBmIFwaYyj9eqRyUG36hrctksrCyrO_kCH7GkazqdygilKLKhsfQBOFM`) attached to a Google Sheets document.

### Key Components

1. **Main Script** (`src/scorecard_import.gs.js`):
   - Menu system (`onOpen()`)
   - College Scorecard API integration (`fillCollegeRowCore_()`)
   - Tracker sheet management (Financial Aid, Campus Visit, Application Timeline, Scholarships)
   - Formatting and dropdown validation
   - Weighted scoring system

2. **API Integration**:
   - Uses College Scorecard API (api.data.gov)
   - API key stored in sheet "ScorecardAPIKey" cell A1
   - Implements fallback search strategies (exact → regex)
   - **Security**: Real API keys are excluded from version control via .gitignore

3. **Data Sheets**:
   - **Colleges**: Main data sheet with headers in row 2
   - **Weights**: Scoring weights configuration
   - **Lookup**: Search results
   - **Trackers**: Financial Aid, Campus Visit, Application Timeline, Scholarship

### Column Mapping

Critical columns in Colleges sheet (row 2 headers):
- College Name, City, State, Region, Type (Public/Private)
- Acceptance Rate, First-Year Retention, Grad Rate
- SAT/ACT scores (25%/75% percentiles)
- Financial data: Total Cost of Attendance, Estimated Net Price, Median Earnings
- Subjective scores (1-5): Program Fit, Academic Reputation, etc.
- Calculated: Weighted Score, Value Score

## Current Version

v5.3 - Includes batch fill, region mapping, enhanced formatting/dropdowns, and weighted scoring

## Development Notes

- Code follows `.clasp.json` configuration with `rootDir: "src"`
- Uses V8 runtime (`appsscript.json`)
- Headers are in row 2, data starts in row 3
- Region mapping: Northeast, Midwest, South, West (based on US states)
- API calls include retry logic for resilience

## Refactoring Plans

Per `Refactor.md`, planned improvements include:
- Modular file structure (menu.js, config.js, utils.js, etc.)
- Namespace architecture to avoid global sprawl
- PropertiesService for API key storage
- CacheService for API response caching
- Batch I/O optimization
- TypeScript migration with clasp

## API Key Setup

**For End Users** (when you get a copy of this spreadsheet):
🔗 Get template: https://docs.google.com/spreadsheets/d/1_DI-6_f1jTyqL3QKcWsuyRmgHFjnc6rhkp7Oqz6QqpU/copy

1. Run "🚀 Quick Start (API Key Check)" from College Tools menu
2. If needed, get your free College Scorecard API key at: https://api.data.gov/signup/
3. Create a sheet named "ScorecardAPIKey" 
4. Paste your API key in cell A1
5. You're ready to use College Tools!

**For Developers**:
- Never commit real API keys to version control
- Use placeholder values like "your_api_key_here" in development
- Real keys are automatically excluded via .gitignore

## Common Tasks

- **Fill college data**: Select row in Colleges sheet → College Tools → Fill current/selected rows
- **Search colleges**: College Tools → Search College Names (results in Lookup sheet)
- **Update regions**: College Tools → Fill Regions (auto-maps states to regions)
- **Setup trackers**: College Tools → Add/Update Trackers
- **Apply formatting**: College Tools → Enhance: Formats & Dropdowns