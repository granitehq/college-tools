# College Tools Test Suite

Automated checks for schema drift, menu wiring, sheet validation coverage, and row/tracker synchronization behavior.

## Recommended Commands

From the repo root:

```bash
npm test
npm run check
```

Targeted suites:

```bash
npm run test:regression
npm run test:template
npm run test:schema
npm run test:menu
npm run test:validation
npm run test:syntax
```

## What The Suites Cover

### Runtime behavior with mocked Apps Script
- `regression-tests.js`
  - row replacement semantics in `Colleges`
  - tracker synchronization by canonical row
  - repair/resync behavior for downloaded sheets

- `template-integrity-tests.js`
  - replacing a sample college in the same row
  - filling the same row twice with different schools
  - batch fill keeping tracker sync enabled

- `validation-coverage-tests.js`
  - college-name validation uses `Colleges!A3:A1000`
  - key dropdown-backed fields keep validations
  - `Type (Public/Private)` includes API-mapped values

### Static contract checks
- `config-schema-tests.js`
  - sheet-name snapshot stability
  - `Config.HEADERS` schema drift detection
  - formula-dependent fields still exist

- `menu-wiring-tests.js`
  - every menu target has a global adapter
  - every adapter delegates into a `CollegeTools.*` module

- `syntax-tests.js`
  - file existence
  - module structure
  - version tag format
  - basic source hygiene

## Quality Gate

`npm run check` runs the maintained gate:

1. `npm run lint:check`
2. `npm test`

This is now the intended pre-push / CI / release gate.

## Limits Of Local Testing

The mock harness catches a lot, but it does not prove:

- real Google Sheets validation UX
- live Apps Script execution quirks
- real conditional formatting behavior
- real Scorecard API responses
- actual menu prompts and alerts in Sheets

For any spreadsheet-facing change, manual validation in a real Google Sheet is still required.
