# Product Plan — College Tools Simplification & Roadmap

**Date:** 2026-07-05
**Intent:** A comprehensive college tracker for a student and their parents. The audience does this once — complexity that doesn't change a decision is a cost, not a feature.

Status legend: `[ ]` planned · `[x]` done · `[~]` deferred (see note)

---

## Phase 1 — Remove / Simplify (approved)

- [x] **R1. Collapse the three SAT-based prediction columns into one honest `Admission Fit` column.**
  Remove `Admission Chances` ("95% - Strong"), `Academic Index Match` (0–120), and `Merit Aid Likelihood`; replace with a single categorical **Reach / Match / Likely** built from test-score position in the school's 25th–75th band, with a selectivity cap (sub-15% acceptance is always Reach). No percent signs, no invented probability math.
  *Done in `35b074b`.*

- [x] **R2. Remove Value Score and its normalization machinery.**
  The `(grad × retention × earnings) / net price` metric with baked-in min/max constants is opaque, goes stale, and duplicates Weighted Score's job. Also removes the Best Value dashboard entries.
  *Done in `0a42e3f`.*

- [x] **R3. Slim Campus Visit Tracker from 39 columns to 15.**
  Keep: College Name, Visit Date, Visit Type, People Met, four consolidated ratings (Campus & Facilities, Academic Vibe, Social Atmosphere, Overall Gut Feeling), Pros, Cons, Concerns, Follow-Up Needed, Next Steps, Visit Score, Notes.
  *Done in `b9193eb`.*

- [x] **R4. One owner per deadline; kill the four warning columns.**
  Financial Aid Tracker owns FAFSA/CSS deadlines (drop them from Application Timeline); Application Timeline owns the application deadline (drop it from Status Tracker). Replace the 60/30/14/7-Day Warning boolean columns with color rules on the single `Days Until Deadline (App)` column.
  *Done in `b99c39a`.*

- [x] **R5. Remove the API quota-management subsystem.**
  Families fill 20–60 rows against a 1,000 req/hour API. Keep retry/backoff, caching, and the batch execution-time guard; delete daily-quota counters, persistence, and their plumbing.
  *Done in `9ee69cd`.*

- [x] **R6. Remove the Dashboard chart-staging area and the placeholder deadlines section.**
  The E–G manual chart-data region and the "(will populate later)" deadlines note both go. A real aggregated deadlines table returns as **A1**.
  *Done in `c6f29e8`.*

- [x] **R7. Weights apply to college ratings only (16 → 8 weight rows).**
  Visit Score becomes a plain average of the four visit ratings.
  *Done in `b9193eb` (bundled with R3).*

- [x] **R8. Slim Scholarship Tracker from 35 columns to 27.**
  Remove post-award/renewal minutiae: Confirmation Received, Interview Scheduled, Interview Completed, Thank You Note Sent, Renewable for # Years, GPA to Maintain, Credit Hours Required, Other Renewal Requirements. Renewal terms live in `Notes/Strategy`.
  *Done in `533b7b5`.*

- [x] **F9 (fix, not removal). Wire up the dead Personal Profile inputs.**
  - `ACT Score` → used by Admission Fit when no SAT (compared against the ACT 25/75 columns already fetched).
  - `GPA` → one-notch Fit adjuster (≥ 3.9 upgrades Reach→Match/Match→Likely; < 3.2 downgrades one notch). Documented heuristic, monotone, no fake precision.
  - `EFC` → prefills the Financial Aid Tracker's EFC column via formula.
  - `State Residency` → **[~] deferred to A4** (in-state vs out-of-state tuition needs new API fields; that's where residency becomes genuinely useful).
  *ACT/GPA done in `35b074b` (bundled with R1); EFC done in `b99c39a` (bundled with R4).*

### Template manual edits required (live spreadsheet, one time)

Code reads Colleges headers from row 2 of the sheet; the template must be edited by hand to match:

1. **Colleges sheet:** delete the `Value Score`, `Academic Index Match`, and `Merit Aid Likelihood` columns; rename `Admission Chances` → `Admission Fit`.
2. **Campus Visit / Application Timeline / Scholarship / Status trackers:** rerunning **Add/Update Trackers** rewrites header row 1, but columns beyond the new (shorter) header lists keep stale headers/data — delete the leftover columns manually after rerunning setup.
3. Rerun **Complete Setup** (or Repair Entire Workbook + Setup Dashboard) after the column edits.

**Status:** All Phase 1 code changes are merged to `development` (10 commits, `35b074b`..`533b7b5`). The manual template edits above still need to be applied to the live spreadsheet before deploying — code and template will disagree on column layout until then.

---

## Phase 2 — Add (agreed, sequencing TBD)

- [ ] **A1. "What's due next" aggregated deadline table** on the Dashboard: every dated item across all trackers, sorted, next 60 days, with days-left and done state. The #1 job of the product.
- [ ] **A2. Offer-comparison view** for decision season: accepted schools side-by-side — real net cost from award letters, 4-year total, debt at graduation, weighted score.
- [ ] **A3. Test-optional flag** per college from the Scorecard test-requirements field. (ACT/GPA wiring moved into F9.)
- [ ] **A4. In-state vs out-of-state cost awareness** using `State Residency` + the API's in/out-of-state tuition fields. Largest single accuracy win for parents.
- [ ] **A5. Weekly email deadline digest** via time-driven trigger (depends on UI/service decoupling — architecture finding #5).
- [ ] **A6. Balanced-list guardrail**: Dashboard counts of Reach/Match/Likely with a nudge when lopsided.
- [ ] **A7. Surface already-fetched API fields**: `median_debt.completers.overall` ("Typical Debt at Graduation") and `pell_grant_rate` — fetched on every fill today, written nowhere.
- [ ] **A8. Decision-outcome rollup** on the Dashboard: accepted/pending/waitlisted counts + deposit deadline once decisions arrive.

---

## Companion docs

- [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) — structural refactorings (schema module, batch I/O, keyed tracker sync…). The Phase 1 removals shrink the surface those refactorings must cover; prefer doing remaining removals before the big refactors.
