# Task Management Verification

**Feature branch:** `feat/task-management-requirements`

**Requirements:** `project-docs/plans/2026-07-30-task-management-requirements.md`

## Verification Status

The implementation, automated acceptance scenarios, and both live copied-sheet
scenarios are complete. Production/template Apps Script was not touched.

The Node harness proves catalog, scheduling, reconciliation, preservation,
schema, menu, and generated-sheet behavior. The disposable live tests add
Google Sheets rendering, Apps Script runtime, filter, date/time-zone, and
preservation evidence.

## Acceptance Matrix

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | 100 unique validated templates; conditional modules | `task-management-tests.js`: catalog and disabled-module scenarios | Automated pass |
| 2 | Long-horizon roadmap without premature submission work | `task-management-tests.js`: long-horizon scenario | Automated pass |
| 3 | Accelerated 90-day athlete plan through earliest deadline | Athlete scenario: authoritative precedence, adaptive multi-week distribution, fixed deadlines, FAFSA sequencing | Automated and live pass |
| 4 | Stable identity, owner, schedule, effort, deliverable, completion rule | Catalog validation plus explicit applicability/rule/anchor/offset/calculated/effective task assertions | Automated pass |
| 5 | Professional-role fallback | No-professional athlete scenario | Automated pass |
| 6 | Preview and safe regeneration preserve completed/manual work | Reconfiguration, partial/custom-task ID/view/repair, rename, formula/custom-column, and idempotence scenarios | Automated and live pass |
| 7 | Existing trackers remain canonical; evidence is attributable | Application, aid, scholarship, visit, and recruiting evidence plus manual-correction scenarios | Automated pass |
| 8 | Generated `This Week` with manual refresh fallback | Category-coverage/truncation, sheet integration, and menu-wiring scenarios | Automated and live pass |
| 9 | Unconstrained baseline effort before optional capacity warnings | Remaining-effort, multiplier, threshold, and week-override scenarios | Automated pass |
| 10 | Setup, refresh, repair, sort, module, and college changes preserve data | Partial custom-row sync, workbook repair, task preservation, rename, sort, and disable-module scenarios | Automated and live pass |
| 11 | Full Node gate, diff check, and two copied-sheet scenarios | `npm run check`; `git diff --check`; live runner below | Pass |

The task-context regression explicitly verifies the workbook footgun:
`Colleges` uses row 2 headers and row 3 data, while task/tracker/helper sheets
use row 1 headers and row 2 data.

## Automated Commands

Last full local run on 2026-07-30: all commands passed, including all 25
task-management scenarios and the repository-wide test suite.

```bash
npm run test:tasks
npm run check
git diff --check
node --check scripts/task-management-live-smoke.js
```

## Live Copied-Workbook Results

Final run on 2026-07-30 used commit `70fc66a` in two owner-only disposable
Google Sheets bound to temporary Apps Script projects. Both returned structured
JSON with `ok: true` and `failedChecks: []`.

| Scenario | Tasks | Deadline evidence | Result |
|---|---:|---|---|
| Long horizon | 83 | Timeline, submission due date, and anchor all normalized to `2027-12-12` | Pass |
| Athlete 90-day | 95 | Timeline, submission due date, and anchor all normalized to `2026-10-28` | Pass |

The first live attempt exposed an out-of-bounds filter-criteria read when a
custom column made the new Tasks filter wider than the old filter. The
corrected code reads criteria only from existing filter columns, and the local
mock now reproduces Apps Script's bounds error.

Live deadline checks also exposed a one-day shift when the spreadsheet and
Apps Script project used different time zones. Task-management table reads and
writes now convert calendar dates explicitly across those time zones. The
final runs prove that the authoritative Timeline date, submission due date,
and schedule anchor retain the same calendar day even when their display
formats differ.

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
- partial custom-row preservation during tracker edits, stable ID assignment,
  weekly visibility, category effort, and repair preservation;
- conditional recruiting behavior.
