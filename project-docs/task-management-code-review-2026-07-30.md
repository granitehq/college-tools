# Task Management Code Review

**Date:** 2026-07-30

**Branch:** `feat/task-management-requirements`

**Spec reviewed against:** `project-docs/plans/2026-07-30-task-management-requirements.md`

**Method:** Four parallel independent reviews, each covering a cohesive slice
of the spec and implementation plan (SW-01/SW-02 catalog & schema, SW-03/SW-04
scheduler & family config, SW-05/SW-06/SW-07 generation & sheet & views,
SW-08–SW-12 recruiting/completion/effort/setup/integration), synthesized into
one ordered list below.

## Resolution Status

**Status as of 2026-08-07:** All 17 findings are resolved in the current
`feat/task-management-requirements` worktree. The detailed findings below are
retained as the historical review record; their source line references describe
the pre-fix implementation.

| # | Status | Resolution |
|---:|---|---|
| 1 | Resolved | Any nonblank Tasks row receives stable manual identity before filtering, and tracker-edit preservation is covered by a regression test. |
| 2 | Resolved | Scholarship tasks fall back to the earliest real deadline with accurate provenance. |
| 3 | Resolved | `This Week` reserves distinct category representatives and reports eligible, shown, and omitted counts. |
| 4 | Resolved | Effort projections and capacity warnings operate on incomplete tasks only. |
| 5 | Resolved | Fixed-date dependency conflicts have focused regression coverage. |
| 6 | Resolved | The weekly report reads canonical application-status and decision-result breakdowns. |
| 7 | Resolved | `Tasks` is documented as the canonical Master Plan; `This Week` renders read-only Owner and College task lists, and Instructions explains canonical filters. |
| 8 | Resolved | When no stronger date exists, generation computes a November 1 suggested first-application window and labels it `Suggested first-application window; confirm manually`. |
| 9 | Resolved | All four horizon buckets now select explicit workstream emphasis, flag matching tasks, raise near-term emphasized work to at least High priority, and show the phase in the weekly report without truncating the roadmap. |
| 10 | Resolved | Repair Entire Workbook reports the task-management repair result. |
| 11 | Resolved | The in-sheet Menu Guide documents the focused Task Management Repair command. |
| 12 | Resolved | `Priority Override` and `Evidence Source` have explanatory header notes. |
| 13 | Resolved | Catalog metadata distinguishes `Fixed date`, `Dependency`, `Suggested window`, `Milestone offset`, and `Recurrence`. |
| 14 | Resolved | FAFSA date behavior is selected by catalog `dateResolver` metadata and dispatched through planner resolver functions; dependencies remain in the generic dependency graph. |
| 15 | Resolved | Task Settings definitions and role/module defaults live in `CollegeTools.Config.TASK_MANAGEMENT_SETTINGS`; sheet integration renders that central contract. |
| 16 | Resolved | Schema row-convention tests cover `Task Templates`, `This Week`, and `Recruiting Tracker`. |
| 17 | Resolved | Preview template counts are tested against a literally empty, headers-only Tasks table and Preview leaves it unchanged. |

**Verification on 2026-08-07:** `npm run check` passed, including 45 focused
task-management scenarios, and `git diff --check` passed. This is local
automated evidence; no live Google Sheet, Apps Script push, or deployment was
performed as part of this resolution pass.

## Findings

### Blocker

1. **Editing any tracker sheet can silently delete an in-progress custom
   Tasks row.** `src/task-management.js:1141-1153` routes every edit on
   Financial Aid/Campus Visit/Application Status/Scholarship/Recruiting
   Tracker to `syncTaskCompletion()`, which calls `readTasks()`
   (`:530-560`, filters on `!!task.taskId || !!task.task`) then
   `writeTasks_()` (`:581-634`), which clears the whole Tasks data block and
   rewrites only what `readTasks()` returned. A user who fills in
   Owner/Notes/Effort/Planned Week on a blank row but hasn't yet typed the
   `Task` description has neither field set — the row is silently dropped
   and never rewritten. Reproduced directly during review. Contradicts spec
   §5's custom-task promise and Acceptance Criterion #10 ("no setup,
   refresh, repair, sort... loses user data"). Not covered by any test — the
   one custom-task test always sets `Task` as part of the initial write.

### Major

2. **Scholarship-scope tasks (`SCH-06`/`SCH-07`) can get a null date and a
   mislabeled `dateSource`.** `src/task-planner.js:338-340` — the
   `scholarship` scope only falls back to `config.workingDeadline`, unlike
   the college-scoped `AID-`/`SCH-` branches a few lines down which also
   fall back to `firstDeadline`. Reproduced: with `workingDeadline` unset
   but a real college deadline present, and a scholarship record with no own
   deadline, `calculatedDate`/`dueDate`/`plannedWeek` come back `null` while
   `dateSource` still misleadingly reads "Working first-application target."
   Violates §4's "require planned week and effort" input requirement.

3. **`This Week` hard-caps to 10 items and can silently drop required
   categories.** `src/task-planner.js:1194-1204` builds all six required
   categories (overdue/current/21-day/blocked/decision-needed/selected) into
   one list, sorts undated tasks last, then does
   `weeklyCandidates.slice(0, 10)`. A `Blocked` or decision-needed task with
   no due date can be pushed out of the top 10 by 10+ dated items and simply
   never appear, with no on-sheet indication anything was cut. Spec §7 reads
   as "must show" coverage per category, not a best-effort top-10 sample.
   Existing test only checks the cap with uniform same-due-date tasks, not
   this starvation case.

4. **Effort projections and capacity warnings include already-completed
   work.** `src/task-planner.js:1180-1182` defines `active` as "not
   archived/Skipped," which does **not** exclude `Complete` tasks.
   Downstream `effortByWeek`/`nextWeekEffortMinutes`/`capacityWarnings`
   (`:1213-1260`) therefore overstate remaining workload and can trigger a
   capacity warning for a week that's already fully done — undermines the
   "calculate required effort before choosing thresholds" goal in §1.

5. **Dependency-conflict detection is correct but has zero test coverage.**
   `alignDependencyDates_` (`src/task-planner.js:610-644`) correctly refuses
   to move a fixed date and flags `'Dependency conflict: prerequisite is
   planned after fixed date'` — verified working by direct reproduction —
   but grep confirms `test/task-management-tests.js` never exercises this
   scenario, despite SW-04 explicitly calling for a dependency-conflict
   test.

### Minor

6. Weekly report's "application status" is reduced to a single `SUB-03`
   completion count (`src/task-planner.js:1307-1312`), not the richer
   per-college Submitted/Admitted/Waitlisted/Denied breakdown that
   `Application Status Tracker` actually owns (spec §3, §7).

7. `Master Plan`, `Owner`, and `College` named views from §7 aren't
   implemented as distinct views — only aggregate effort totals by
   owner/college appear on `This Week`. No per-owner or per-college task
   list, and Instructions never explains how to get one (e.g., via the Tasks
   sheet filter). *Possibly intentional* given §2 caps new sheets at four —
   flagging as a question, not a confirmed defect.

8. Deadline-precedence tier 4 ("labeled suggested window," §4) is never
   reached as an independent fallback — `generatePlan()` hard-fails with
   `missing_deadline` unless a working deadline or college deadline exists
   (`task-planner.js:662-669`). May be intentional since a working deadline
   is itself a required input.

9. The §4 planning-horizons table (differentiated task emphasis by
   time-remaining bucket) is only encoded via one rule (`PRO-08` excluded
   once ≤183 days remain). Acceptance criterion #2 (long-horizon family gets
   no premature submission work) passes, but incidentally via date math
   rather than explicit horizon-stage differentiation of task emphasis.

10. "Repair Entire Workbook" alert text (`src/menu.js:228-238`) never
    mentions task-management results even though the repair step does run
    (`setup.js:295-306`) — reads as if task management wasn't repaired.

11. In-sheet Menu Guide (`src/instructions.js` ~line 234) documents
    Setup/Preview/Generate/Refresh/Sync but never mentions the "Repair Task
    Management" menu item, which exists and works.

12. No header cell notes on `Priority Override` / `Evidence Source` columns
    (`task-management.js:427-448` adds notes for other columns but skips
    these two); the concepts are explained narratively in the Instructions
    tab, so this is secondary.

### Nits

13. `scheduleRule` metadata is only ever `'Milestone offset'` or `'Weekly
    recurrence'` — narrower than the Fixed-date/Dependency/Window taxonomy
    implied by §5's task-contract field list, even though the underlying
    date logic does differentiate correctly. Cosmetic.

14. FAFSA sequencing (`AID-02`/`AID-06`/`AID-07`) is implemented via three
    hardcoded `templateId` branches (`task-planner.js:689-730`) running
    alongside a separate generic `DEPENDENCIES` graph entry for `AID-06` in
    `task-catalog.js:235` — two overlapping mechanisms doing related work.
    Functionally correct, worth consolidating.

15. Role/module defaults live in `task-management.js`'s `SETTINGS` array
    rather than `config.js`/`schema.js` as SW-01's bullet phrasing implies.
    Reasonable architecture, just doesn't match the plan's literal wording.

16. `test/schema-metadata-tests.js`'s row1/row2 assertion loop only
    explicitly covers `TASKS`/`TASK_SETTINGS`; `TASK_TEMPLATES`/`THIS
    WEEK`/`RECRUITING_TRACKER` are correct on inspection but not asserted by
    that test.

17. `previewTaskPlan()`'s template-count output is untested when called
    before any Tasks exist (only tested post-generation).

## What's solid (verified, not just claimed)

- Catalog is exactly 100 unique templates matching every spec ID/count.
- Catalog validation is genuinely wired in, not aspirational.
- `Task Templates` sheet is fully catalog-sourced on every render.
- Stable ID schemes (`templateId::scopeId`, `MANUAL::` UUIDs,
  Recruiting/Scholarship row IDs) are deterministic and don't drift on
  regeneration.
- Owner-fallback vs. disabled-module are correctly separate mechanisms.
- Regeneration preview/diff is a real non-mutating path with all five §4
  safety properties (except finding #1) holding and well-tested.
- Calculated Date is truly immutable through late-start compression with
  total effort preserved.
- Fixed dates are never moved.
- Tracker-derived completion's reversal-preservation ("manual status
  retained, disagreement reported") is correctly implemented and directly
  tested.
- Recruiting Tracker gating/preservation is correct.
- Effort multiplier + task override stacking and no-double-counting-Shared
  work are both correct and tested.
- Threshold ordering constraint holds by construction.
- Core service code has zero direct UI calls (menu.js-only, per the
  existing pattern).
- Full SW-12 integration (`.clasp.json`, test runners, version tooling) is
  wired correctly.
- The verification doc's automated-pass claims were independently re-run
  and are accurate — but finding #1 is a real gap in what "custom tasks
  survive... repair" (criterion #6/#10) actually covers, since that failure
  mode wasn't in the test matrix.
