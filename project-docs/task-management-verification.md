# Task Management Verification

**Feature branch:** `feat/task-management-requirements`

**Requirements:** `project-docs/plans/2026-07-30-task-management-requirements.md`

## Verification Status

The implementation, automated acceptance scenarios, and the original two live
copied-sheet scenarios are complete. The clasp-bound template has since received
the v3.0.1 release candidate; public template promotion remains blocked on the
follow-up presentation fixes and copied-sheet verification below.

**Update (2026-08-07):** the first post-release copied-template review exposed
live-only presentation defects: `This Week` applied its Due Date format to
numeric report cells, task/report columns were cramped, and sheet creation order
did not reflect the user workflow. The local fix branch now applies a canonical
workflow-first tab order, keeps Lookup after Weights, renders `This Week` with
task-first columns and correctly scoped number formats, hides advanced `Tasks`
metadata by default, and adds concrete Task Settings examples. The full local
gate passes, but these presentation fixes still require a new clasp push and
fresh copied-sheet screenshots before public promotion.

**Update (2026-08-03):** review fixes now make Preview structurally read-only,
including for rows that do not yet have persisted IDs, and add an explicit
`Enrollment Choice` to Application Status Tracker. `DEC-06` and `DEC-07` now
apply only to a college marked `Enroll`; admitted-college comparison work still
applies to every accepted college. The expanded local harness passes, but these
changes still require the copied-sheet smoke rerun described below before merge
or deployment.

**Update (2026-07-30, later same day):** the catalog's 100-template cap was
removed and a 9-template Decision And Enrollment phase (`DEC-01`..`DEC-07`,
`STR-09`, `TST-07`) was added to close a post-acceptance coverage gap
identified via external research (award-letter comparison, National
Candidates Reply Date deposit, waitlist response, AP/IB score sending, ED
agreement signing). This addition is covered by new Node-harness scheduling
tests (decision/deposit/housing anchor resolution, National Candidates Reply
Date fallback, AP/IB June 20 fallback) but has not yet been re-run through a
live copied-sheet smoke test; do that before merging/deploying per the
project's testing-limits policy.

The Node harness proves catalog, scheduling, reconciliation, preservation,
schema, menu, and generated-sheet behavior. The disposable live tests add
Google Sheets rendering, Apps Script runtime, filter, date/time-zone, and
preservation evidence.

## Acceptance Matrix

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | Uncapped, unique, validated templates; conditional modules | `task-management-tests.js`: catalog and disabled-module scenarios | Automated pass |
| 2 | Long-horizon roadmap without premature submission work | `task-management-tests.js`: long-horizon scenario | Automated pass |
| 3 | Accelerated 90-day athlete plan through earliest deadline | Athlete scenario: authoritative precedence, adaptive multi-week distribution, fixed deadlines, FAFSA sequencing | Automated and live pass |
| 4 | Stable identity, owner, schedule, effort, deliverable, completion rule | Catalog validation plus explicit applicability/rule/anchor/offset/calculated/effective task assertions | Automated pass |
| 5 | Professional-role fallback | No-professional athlete scenario | Automated pass |
| 6 | Preview is workbook-read-only; safe regeneration preserves completed/manual work | Whole-workbook mutation instrumentation, deterministic preview identities, reconfiguration, custom-task ID/view/repair, rename, formula/custom-column, and idempotence scenarios | Expanded automated pass; prior live pass predates latest fix |
| 7 | Existing trackers remain canonical; enrollment applicability and evidence are attributable | Enrollment Choice matrix/migration, application, aid, scholarship, visit, and recruiting evidence plus manual-correction scenarios | Automated pass |
| 8 | Generated `This Week` with manual refresh fallback | Category-coverage/truncation, sheet integration, and menu-wiring scenarios | Automated and live pass |
| 9 | Unconstrained baseline effort before optional capacity warnings | Remaining-effort, multiplier, threshold, and week-override scenarios | Automated pass |
| 10 | Setup, refresh, repair, sort, module, and college changes preserve data | Partial custom-row sync, workbook repair, task preservation, rename, sort, and disable-module scenarios | Automated and live pass |
| 11 | Full Node gate, diff check, and two copied-sheet scenarios | `npm run check`; `git diff --check`; live runner below | Pass |

The task-context regression explicitly verifies the workbook footgun:
`Colleges` uses row 2 headers and row 3 data, while task/tracker/helper sheets
use row 1 headers and row 2 data.

## Automated Commands

The current local gate includes 41 task-management scenarios. Run all commands
below from the feature worktree before recording a new live result.

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

After recording the results, both disposable spreadsheets were moved to Google
Drive trash, retiring their container-bound Apps Script projects. The
production/template Apps Script project was never targeted.

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

- the full task catalog;
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
