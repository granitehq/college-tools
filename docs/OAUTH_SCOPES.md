# OAuth Scopes Documentation

## Required Scopes

College Tools requires exactly two OAuth scopes to function:

### 1. `https://www.googleapis.com/auth/spreadsheets.currentonly`
**Purpose**: Read and write access to the current spreadsheet only  
**Why needed**:
- Create and update tracker sheets (Financial Aid, Campus Visit, etc.)
- Write college data fetched from API
- Update formulas and formatting
- Create dashboard and charts

**Why not broader scope**: We don't need access to ALL user spreadsheets, only the one where College Tools is installed.

### 2. `https://www.googleapis.com/auth/script.external_request`
**Purpose**: Make HTTP requests to external services  
**Why needed**:
- Fetch college data from College Scorecard API (api.data.gov)
- This is the only external API we access

## Security Benefits

By explicitly declaring these scopes in `appsscript.json`:

1. **Minimal permissions**: Only requests what's actually needed
2. **User transparency**: Users see exactly what permissions are required
3. **No scope creep**: Prevents Google from auto-adding unnecessary permissions
4. **Better security posture**: Follows principle of least privilege

## What we DON'T need

- ❌ Access to other Google Sheets files
- ❌ Access to Google Drive
- ❌ Access to Gmail or Calendar
- ❌ Access to user's personal data

## User Experience

When users authorize College Tools, they'll see:
- ✅ "View and manage spreadsheets that this application has been installed in"
- ✅ "Connect to an external service"

Instead of scarier, broader permissions like "View and manage ALL your Google Sheets files".