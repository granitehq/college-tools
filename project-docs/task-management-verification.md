# Task Management Verification

**Feature branch:** `feat/task-management-requirements`

**Requirements:** `project-docs/plans/2026-07-30-task-management-requirements.md`

## Verification Status

The implementation and automated acceptance scenarios are complete. Live
Google Sheets execution in two disposable bound spreadsheets remains a release
gate because uploading the feature source to those temporary Apps Script
projects requires explicit authorization.

The Node harness proves catalog, scheduling, reconciliation, preservation,
schema, menu, and generated-sheet behavior. It does not prove Google Sheets UI
rendering or Apps Script runtime behavior.

## Acceptance Matrix

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | 100 unique validated templates; conditional modules | `task-management-tests.js`: catalog and disabled-module scenarios | Automated pass |
| 2 | Long-horizon roadmap without premature submission work | `task-management-tests.js`: long-horizon scenario | Automated pass |
| 3 | Accelerated 90-day athlete plan through earliest deadline | Athlete scenario: authoritative precedence, adaptive multi-week distribution, fixed deadlines, FAFSA sequencing | Automated pass; live pending |
| 4 | Stable identity, owner, schedule, effort, deliverable, completion rule | Catalog validation plus explicit applicability/rule/anchor/offset/calculated/effective task assertions | Automated pass |
| 5 | Professional-role fallback | No-professional athlete scenario | Automated pass |
| 6 | Preview and safe regeneration preserve completed/manual work | Reconfiguration, custom-task ID/view/repair, rename, formula/custom-column, and idempotence scenarios | Automated pass |
| 7 | Existing trackers remain canonical; evidence is attributable | Application, aid, scholarship, visit, and recruiting evidence plus manual-correction scenarios | Automated pass |
| 8 | Generated `This Week` with manual refresh fallback | Sheet integration and menu-wiring scenarios | Automated pass |
| 9 | Unconstrained baseline effort before optional capacity warnings | Effort, multiplier, threshold, and week-override scenarios | Automated pass |
| 10 | Setup, refresh, repair, sort, module, and college changes preserve data | Workbook repair plus task preservation, rename, sort, and disable-module scenarios | Automated pass |
| 11 | Full Node gate, diff check, and two copied-sheet scenarios | `npm run check`; `git diff --check`; live runner below | Local gates pass; live pending |

The task-context regression explicitly verifies the workbook footgun:
`Colleges` uses row 2 headers and row 3 data, while task/tracker/helper sheets
use row 1 headers and row 2 data.

## Automated Commands

Last full local run on 2026-07-30: all commands passed, including all 20
task-management scenarios and the repository-wide test suite.

```bash
npm run test:tasks
npm run check
git diff --check
node --check scripts/task-management-live-smoke.js
```

## Live Copied-Workbook Gate

Use two disposable Google Sheets bound to temporary Apps Script projects. Do
not push this feature branch to the production/template Apps Script project.

For each temporary project:

1. copy the feature `src/*.js` files and
   `scripts/task-management-live-smoke.js` into the temporary project;
2. add `executionApi.access = "MYSELF"` to the temporary manifest;
3. push and deploy the temporary project;
4. run `runTaskManagementLiveSmoke("long-horizon")` in the first project;
5. run `runTaskManagementLiveSmoke("athlete-90-day")` in the second project;
6. require `ok: true` and no `failedChecks` from both results; and
7. delete the disposable spreadsheets/projects after recording results.

The live runner verifies:

- the 100-template catalog;
- real sheet creation and writes;
- `Colleges` row 2/row 3 handling;
- stable College and Task IDs;
- long-horizon and athlete-specific generation;
- authoritative-deadline precedence and adaptive late-start distribution;
- supplemental prompt-scoped essay tasks;
- `This Week`;
- deadline placement;
- sort/regeneration preservation, including a custom formula; and
- custom task ID assignment, weekly visibility, category effort, and repair preservation;
- conditional recruiting behavior.
