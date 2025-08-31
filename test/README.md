# College Tools Test Suite

Automated regression tests to catch errors before deployment.

## Running Tests

```bash
# From the test directory
cd test
npm test

# Or directly with node
node regression-tests.js
```

## What's Tested

### Core Functionality
- ✅ Module loading and namespace integrity
- ✅ Configuration completeness (new sheets, headers)
- ✅ Function existence and basic structure
- ✅ Version validation
- ✅ Setup functions can execute without errors

### Regression Prevention
- ✅ New Personal Profile sheet configuration
- ✅ Financial Intelligence columns in headers
- ✅ All required functions still exist
- ✅ Basic utility functions work correctly
- ✅ Setup workflow doesn't crash

### NOT Tested (requires real Google Sheets)
- Actual formula execution
- Sheet creation in live environment  
- API calls to College Scorecard
- UI interactions beyond basic structure

## Interpreting Results

```
✅ All tests passed! Safe to deploy.
```
**→ Good to push to production**

```
⚠️ Some tests failed. Review before deploying.
```
**→ Check failed tests, likely breaking changes**

## Test Structure

The tests use mock Google Apps Script objects to simulate the Sheets environment locally. This catches:
- Missing functions
- Configuration errors
- Basic structural problems
- Module loading issues

For full integration testing, run manual tests in a real Google Sheet.