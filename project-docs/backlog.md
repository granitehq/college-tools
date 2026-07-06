# College Tools Backlog

**Last consolidated:** 2026-07-06

This backlog consolidates open and completed work from the project docs in this
folder. Completion is marked only when the implementation was verified in both
`origin/development` and `origin/main`. Work that exists only on `development`
is listed as release pending.

## Branch Audit

- `origin/development`: includes the direct-push workflow, performance batching,
  and the follow-up review fixes through `1790fc0`.
- `origin/main`: currently stops at `02b6d96`, before the direct-push,
  performance batching, and follow-up review fixes.
- Result: product simplification, dashboard additions, bug-report fixes, and
  instruction updates below are complete in both branches. Direct-push and
  latest performance/review fixes are complete in development only.

## Complete In Both Branches

1. **Simplified the core Colleges model.** Admission Fit replaced the three
   SAT-prediction/merit columns, Value Score was removed, weights were reduced
   to college ratings, and the tracker headers were slimmed.
2. **Wired Personal Profile inputs into real behavior.** SAT/ACT/GPA influence
   Admission Fit, EFC flows into the Financial Aid Tracker, and State Residency
   drives Applicable Tuition.
3. **Added the high-value dashboard views.** Dashboard now includes What's Due
   Next, offer comparison, fit-balance guardrail, and decision-outcome rollup.
4. **Surfaced important Scorecard fields.** Test Optional, Applicable Tuition,
   Typical Debt at Graduation, and Pell Grant Rate are in the Colleges model
   with regression coverage.
5. **Fixed the Region/template repair issue.** Missing Region columns are
   appended safely instead of inserted beside typed columns.
6. **Fixed tracker syncing after no-match fills and setup.** Tracker rows now
   receive typed college names even when Scorecard cannot find a match, and
   tracker setup repairs sync automatically.
7. **Fixed stray validation/dropdown corruption.** Repair/setup normalizes
   sheet validation state so stray dropdown/date rules do not stay attached to
   the wrong cells.
8. **Updated user-facing instructions.** Scholarship discovery pointers were
   added and the bug-report link now points at the College Tools repository.
9. **Completed the initial architecture safety work.** Schema metadata,
   formula helpers, dashboard table builders, instruction section rendering,
   and broad regression coverage are present in both branches.

## Release Pending

These are implemented on `origin/development` but are not yet complete under
the two-branch rule because `origin/main` has not been updated.

1. **Merge/release development to main.** This is the highest-priority release
   task because main is behind development.
2. **Direct-push update workflow.** Registration, registry provisioning docs,
   and `scripts/push-updates.js` exist in development only.
3. **Performance batching pass.** Repair College Sync, validation repair,
   Fill Regions, and dashboard refresh were batched in development only.
4. **Follow-up review fixes.** Development includes registration disclosure,
   low-trust registry documentation, registry payload bounds, repair-sync
   cleanup, region changed-run writes, and consolidated performance feedback.
5. **Manual live-sheet smoke test before release.** Run Repair Validations &
   Dropdowns, Repair Entire Workbook, Refresh Dashboard Data, Fill Regions,
   Complete Setup, direct-push dry run, and a throwaway-copy push.

## Prioritized Backlog

1. **Release current development after smoke testing.** Merge `development`
   into `main`, then verify from `main` before deploying. This closes the
   direct-push and performance-review gap.
2. **Apply required live-template edits.** Delete stale removed columns in the
   production template, rerun setup/repair, and confirm the live spreadsheet
   matches the simplified header model.
3. **Add owner-aware deadlines.** Add Student/Parent/Both owner fields to
   Application Timeline and Financial Aid Tracker, then filter or split the
   Dashboard What's Due Next view by owner.
4. **Add a compact Recommenders tracker.** Track each recommender across all
   colleges without expanding into per-essay or general task tracking.
5. **Build the weekly deadline email digest.** Add a time-driven trigger only
   after the service/menu boundary is cleaner, so the trigger can run without
   UI prompts or nested alerts.
6. **Clarify cost data age and income context.** Show the Scorecard year/cohort
   where available, distinguish blended net price from household-specific cost,
   and decide whether to request income-bracket net price fields.
7. **Introduce stable college identity.** Add hidden/protected stable keys to
   Colleges and trackers, migrate existing rows, and replace positional tracker
   sync with keyed repair/sync.
8. **Finish service/menu separation.** Move prompts, alerts, locks, and final
   summaries to menu adapters; have service modules return structured results.
9. **Add diagnostics and scoped locks.** Provide structured diagnostics for
   setup/repair/fill failures and prevent overlapping mutating workflows.
10. **Create a declarative setup plan.** Put setup, repair, formatting,
    formulas, dashboard refresh, and performance actions on one step registry
    with tested ordering.
11. **Move API key storage toward user properties.** Keep the legacy sheet as a
    migration fallback, but add visible warnings and a one-click migration path.
12. **Continue renderer/formula cleanup opportunistically.** Finish dashboard
    render-model cleanup, move remaining inline formulas into `Formulas`, and
    migrate `scoring.js` off legacy column helpers when that file is touched.
13. **Harden low-trust registry operations if scale increases.** Current bounds
    are enough for internal telemetry; use per-copy server-issued tokens or
    stronger ownership checks if registry integrity becomes important.
14. **Prepare Marketplace/legal launch materials.** Host Privacy/Terms pages,
    update contact/jurisdiction URLs, prepare app assets/screenshots/listing
    copy, configure the Google Cloud project, and run multi-user testing.
15. **Defer lower-value feature ideas.** Travel-cost estimates, calendar export,
    scholarship import forms, Quick Compare, and an apps-directory site remain
    future ideas until the core tracker/release work is stable.

## Source Documents Consolidated

- `product-plan.md`
- `ARCHITECTURE_REVIEW.md`
- `CODE_REVIEW_2026-07.md`
- `CODE_REVIEW_2026-07_FOLLOWUP.md`
- `archive/bug-report.md`
- `PLAN.md`
- `MARKETPLACE_CHECKLIST.md`
- `LEGAL_CUSTOMIZATION_GUIDE.md`
- `DIRECT_PUSH_RELEASE_WORKFLOW.md`
- `DIRECT_PUSH_REGISTRY_PROVISIONING.md`
