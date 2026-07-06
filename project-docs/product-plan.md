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

**Status correction (2026-07-05 JTBD review):** this section still showed every item as `[ ]` planned, but `src/dashboard.js` and `src/colleges.js` already implement A1–A4 and A6–A8 in code, with test coverage. Checkboxes below are corrected to match the actual `development` branch rather than rewritten from scratch. Only A5 remains genuinely undone.

- [x] **A1. "What's due next" aggregated deadline table** on the Dashboard: every dated item across all trackers, sorted, next 60 days, with days-left and done state. The #1 job of the product.
  *Implemented in `5d5c3a1` — `buildDueNextRows_()`, `src/dashboard.js:163-205`, rendered at `src/dashboard.js:612-621`.*
- [x] **A2. Offer-comparison view** for decision season: accepted schools side-by-side — real net cost from award letters, 4-year total, debt at graduation, weighted score.
  *Implemented in `5d5c3a1` — `buildOfferComparisonRows_()`, `src/dashboard.js:252-296`, rendered at `src/dashboard.js:623-635`.*
- [x] **A3. Test-optional flag** per college from the Scorecard test-requirements field. (ACT/GPA wiring moved into F9.)
  *Already present pre-Phase-1 — `testOptionalFromRequirement_()` and the `Test Optional` column, `src/colleges.js:63,376`.*
- [x] **A4. In-state vs out-of-state cost awareness** using `State Residency` + the API's in/out-of-state tuition fields. Largest single accuracy win for parents.
  *Already present — `Applicable Tuition` formula keyed on the `State_Residency` named range, `src/colleges.js:431-435`, `src/financial.js:43`.*
- [ ] **A5. Weekly email deadline digest** via time-driven trigger (depends on UI/service decoupling — architecture finding #5). Still open — no `MailApp`/trigger code exists anywhere in `src/`.
- [x] **A6. Balanced-list guardrail**: Dashboard counts of Reach/Match/Likely with a nudge when lopsided.
  *Implemented in `92309cb` — `buildFitBalanceRows_()` / `fitBalanceMessage_()`, `src/dashboard.js:378-412`, rendered at `src/dashboard.js:649-657`.*
- [x] **A7. Surface already-fetched API fields**: `median_debt.completers.overall` ("Typical Debt at Graduation") and `pell_grant_rate` — fetched on every fill today, written nowhere.
  *Already present — `Typical Debt at Graduation` / `Pell Grant Rate` columns wired in `src/colleges.js:327-328,631-632`.*
- [x] **A8. Decision-outcome rollup** on the Dashboard: accepted/pending/waitlisted counts + deposit deadline once decisions arrive.
  *Implemented in `92309cb` — `buildDecisionOutcomeRows_()` / `nextDepositDeadline_()`, `src/dashboard.js:305-370`, rendered at `src/dashboard.js:637-647`.*

---

## Phase 3 — Jobs to Be Done (product strategy review, 2026-07-05)

**Method:** with Phase 1 (remove/simplify) done and Phase 2 (add) turning out to be nearly complete already, this pass asked: what job is the student+parent audience actually "hiring" this spreadsheet to do, and where does today's tool still leave that job half-finished? Ordered by value to the family, highest first. Items the tool already serves well — list-building (Colleges + Admission Fit + balance guardrail), deadline awareness (Timeline + Due Next), and cost comparison (Financial Aid Tracker + Offer Comparison) — are not repeated here.

- [ ] **J1. Split deadlines by owner (Student / Parent / Both) and surface that split on the Dashboard.**
  Today's "What's Due Next" table (A1) is the single best JTBD win in the product, but it hands a parent the *same* undifferentiated list a student sees — FAFSA deadlines mixed in with essay and transcript deadlines. Parents and students are two distinct users of one document, sitting down at different times with different questions ("is there anything financial I need to do this week?" vs. "what do I personally owe by Friday?"). Add one `Owner` column to Application Timeline and Financial Aid Tracker (Student/Parent/Both — matches the existing dropdown-validation pattern already used elsewhere in `trackers.js`), thread it through `buildDueNextRows_()`, and add an optional owner filter/second table on the Dashboard. Low complexity — one column plus a filter on data the tool already collects — for what is likely the single biggest remaining reduction in family friction.

- [ ] **J2. Track recommendation letters per recommender, across all schools, in one place.**
  Real failure mode this tool doesn't touch: a student has 2-3 teachers/counselor writing letters for 6-10 schools through different portals, and nobody can answer "did Mx. Rivera actually submit for all of them, or just the three she remembered?" Today's `Recommendations Complete (Y/N)` in Status Tracker is one checkbox per college — it can't represent "3 of 4 letters in for Northwestern." Add a compact `Recommenders` tab: one row per recommender, one column per college (checkbox/date), so the gap is visible at a glance instead of being reconstructed from memory or a chain of emails. Keep it deliberately small — this is the one new tab worth adding, not a general-purpose task tracker; resist the urge to expand it into per-essay tracking (see J5).

- [ ] **A5 (carried from Phase 2). Weekly email deadline digest.**
  Reordered here because it's the one Phase 2 item genuinely not done. It reaches the part of the audience who won't reliably reopen the sheet — exactly the job the in-sheet Due Next table can't do on its own. Ranked below J1/J2 because it requires the UI/service decoupling groundwork in ARCHITECTURE_REVIEW.md finding #6 before a trigger can call it safely, so cost is materially higher than J1/J2.

- [ ] **J3. Add a short "Where to find scholarships" pointer list to the Instructions sheet.**
  The Scholarship Tracker only tracks scholarships once found — it does nothing for the *discovery* job, and the College Scorecard API has no scholarship data to serve it with. Rather than building search/matching (out of reach without a new data source, and against this project's own "don't build what doesn't change a decision" principle), add 4-5 curated links (Fastweb, Scholarships.com, Going Merry, the student's state 529/scholarship portal, "ask your school counselor for the local list") to the Instructions sheet's existing Scholarship Tracker section. Cheap, honest, closes a real gap without scope creep.

- [ ] **F10 (fix, not feature). Instructions sheet "Bug Reports" link points at the wrong repository.**
  `src/instructions.js:369` sends users to `github.com/anthropics/claude-code/issues` — that's the Claude Code CLI's tracker, not this project's. A parent trying to report a real problem hits a dead end. One-line fix; bundle with whichever Instructions change ships next.

**Considered and deliberately not recommended:**
- *Per-essay/per-supplement tracking.* Real pain point, but modeling "essays complete" at the per-supplement level (most schools have 2-5) would re-inflate Status Tracker or Application Timeline the same way Phase 1 just cut down — the single `Essays Complete (Y/N)` column is the right altitude for a spreadsheet whose audience does this once.
- *In-sheet onboarding wizard/sidebar.* The existing Quick Start alert + Instructions sheet + Due Next table already cover "what do I do first" and "what's next" reasonably well; a custom sidebar UI would be a large `HtmlService` investment for a marginal improvement over what a checklist and a dashboard table already deliver.

---

## Companion docs

- [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) — structural refactorings (schema module, batch I/O, keyed tracker sync…). The Phase 1 removals shrink the surface those refactorings must cover; prefer doing remaining removals before the big refactors.
