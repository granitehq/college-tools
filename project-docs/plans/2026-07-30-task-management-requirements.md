# Adaptive College Task Management: Requirements And Implementation Plan

**Status:** Implemented and verified on the feature branch; not merged or deployed to production

**Date:** 2026-07-30

## 1. Goal

Add adaptive task management to the existing `college-tools` workbook. It must
generate a useful plan for a family starting more than a year early and an
accelerated plan for a family, like the current one, with roughly 90 days
remaining.

For the current family:

> By the earliest applicable deadline, submit the strongest affordable
> applications possible while protecting merit-aid and track-recruiting
> opportunities.

The product must calculate required effort by role before the family chooses
scope or workload thresholds. It must not hide work to fit a predetermined
hour cap.

## 2. Settled Product Decisions

- Keep task management in the existing workbook. Separate spreadsheets would
  duplicate deadlines/status and require fragile synchronization.
- Add a user-editable `Task Settings` sheet, one canonical `Tasks` sheet, one
  hidden/system-managed `Task Templates` sheet, and one generated `This Week`
  sheet.
- Add `Recruiting Tracker` only when Athletic Recruiting is enabled.
- Maintain a complete catalog but instantiate only tasks relevant to the
  family's timeline, colleges, roles, and enabled modules.
- Support standard roles (`Student`, `Parent/Guardian`,
  `Counselor/Professional`, `Shared`, external dependency) and custom owners.
- Keep counselor/professional as one standard role; a parent with both a school
  counselor and private consultant may delegate to either or create distinct
  custom owners.
- Treat assistant/professional support separately from accountable ownership.
- Use `Not Started`, `Ready`, `In Progress`, `Waiting`, `Blocked`, `Complete`,
  and `Skipped`.
- Use `Critical`, `High`, `Normal`, and `Low` priorities.
- Use a configurable parent effort multiplier with task-level overrides.
- Derive completion from canonical trackers when reliable; otherwise require
  manual confirmation.
- Generate recurring-task instances only inside the rolling 90-day window.
- Require planned week and effort; keep scheduled time blocks optional.
- Leave workload thresholds unset until the baseline plan is calculated. Then
  allow optional role thresholds with individual-week overrides.
- Do not build printing, exports, calendar scheduling, email notifications, or
  a second live planning workbook in the first release.

## 3. Workbook Ownership

| Data | Canonical location |
|---|---|
| College list, facts, fit | `Colleges` |
| Application and document deadlines plus supplemental prompt inventory | `Application Timeline` |
| Aid requirements and offers | `Financial Aid Tracker` |
| Scholarships and honors opportunities | `Scholarship Tracker` |
| Visits | `Campus Visit Tracker` |
| Submission and decision status | `Application Status Tracker` |
| Planning dates, roles, modules, multipliers, and optional thresholds | `Task Settings` |
| Coach contacts and recruiting history | Conditional `Recruiting Tracker` |
| Task status, ownership, effort, dependencies | `Tasks` |
| System task definitions | Hidden `Task Templates` |
| Current actions | Generated `This Week` |

Each field has one owner. Tasks link to existing records through stable IDs and
must not duplicate independently editable tracker data.

## 4. Adaptive Planning Rules

### Inputs

- Current grade and expected graduation year
- Planning start date and application cycle
- Working first-application target
- Actual college, merit, honors, aid, school-document, and recruiting dates
- Participating roles and custom owners
- Enabled modules: Testing, Athletic Recruiting, CSS Profile, Visits,
  Interviews, Portfolio/Audition, and professional support
- College list and application rounds

The workbook calculates days remaining; users do not maintain that number.

### Scheduling

Use the most specific source available:

1. authoritative external deadline;
2. application-round or school-process default;
3. family working target; or
4. labeled suggested window.

Templates use fixed dates, milestone offsets, dependencies, suggested windows,
or recurrence. The scheduler must not blindly compress tasks. It flags work as
urgent, late, or no longer feasible when real lead time is unavailable.

For a late start, `Calculated Date` retains the ideal long-lead date while
`Effective Date` and `Due Date` distribute actionable work proportionally
across the remaining window. Total effort is unchanged. Fixed external dates
are never moved; a prerequisite that cannot fit before one is marked as a
dependency conflict.

The earliest relevant deadline drives shared prerequisite work, while each
college-specific task keeps its own deadline. For example, FAFSA preparation
can precede public availability, but submission follows availability and the
earliest applicable aid-priority deadline. Federal Student Aid currently plans
public release of the 2027–28 FAFSA by October 1, 2026:
[2027–28 FAFSA Beta Testing Plan](https://fsapartners.ed.gov/knowledge-center/library/electronic-announcements/2026-07-21/2027-28-fafsa-beta-testing-plan).

### Planning Horizons

| Time remaining | Emphasis |
|---|---|
| More than one year | Exploration, courses/testing, meaningful activities, early affordability, recruiting preparation |
| Six to twelve months | Research, visits, testing completion, résumé/activity inventory, recommendations preparation |
| Three to six months | Final list, Common App, essays, recommendations, financial documents, active recruiting |
| Ninety days or less | Applications, affordability verification, essays, recruiting, aid deadlines, audit and submission |

All families receive a full applicable roadmap, a rolling 90-day view, and
`This Week`.

### Regeneration Safety

Changing a date, role, module, or college produces a preview of additions,
reassignments, archives, date changes, dependencies, and effort changes.
Regeneration:

- changes incomplete system-generated tasks by default;
- preserves completed tasks, notes, evidence, locked dates, and manual owners;
- marks removed work `Skipped`/archived with a reason instead of deleting it;
- never creates duplicate instances; and
- refreshes roadmap, 90-day, weekly, owner, college, and effort views.

## 5. Task And Template Contract

Every task instance supports:

- stable Task ID, Template ID, module, workstream, planning stage, and college;
- accountable owner, standard role category, and optional support roles;
- applicability rule, schedule rule, anchor, offset/window, calculated date,
  effective date, date source, and date lock;
- dependencies, priority, status, planned week, optional scheduled block;
- normal effort, adjusted effort, and optional task override;
- deliverable, official resource links, decision-needed flag, notes;
- completion source and completion date.

Families may add custom tasks directly to blank `Tasks` rows using any
workstream, stage, module/category, owner, date or planned week, effort, and
notes. They leave Task ID and Template ID blank. The next edit/menu refresh
assigns a stable `MANUAL::` ID; the task then participates in `This Week`,
rolling, owner, college, effort, and capacity views and survives generation,
setup, repair, sorting, and reconfiguration.

Template owners include a fallback order. Missing optional professionals
reassign required work; they do not remove it. Disabled optional modules do not
generate tasks.

`Recruiting Tracker` uses one row per coach/contact with stable Recruiting
Contact ID and College ID, sport/event, coach/contact details, questionnaire,
outreach, response/interest, last contact, next follow-up, meeting/visit,
student next action, and notes.

## 6. Seed College Task Catalog

This catalog contains exactly 100 task templates. College-, essay-, coach-, or
scholarship-specific templates may create multiple instances. `S` = Student,
`P` = Parent/Guardian, `C` = Counselor/Professional, `X` = external party.
Effort is a baseline active-work estimate before role multipliers.

### Strategy And Configuration (8)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `STR-01` | Set grade, graduation year, cycle, start date, and working deadline | Shared | Initial setup | 30m | Planning horizon saved |
| `STR-02` | Configure family, professional, custom-owner, and external roles | P | Initial setup | 30m | Owners and fallbacks saved |
| `STR-03` | Enable applicable task modules | Shared | Initial setup | 20m | Module configuration approved |
| `STR-04` | Define academic interests and possible majors | S | Before college research | 60m | Written academic criteria |
| `STR-05` | Define geography, setting, size, culture, and other constraints | Shared | Before college research | 60m | Fit criteria approved |
| `STR-06` | Set annual contribution and borrowing limits | P | Before affordability review | 90m | Written financial limits |
| `STR-07` | Define Reach/Target/Likely and financial-safety rules | Shared/C | After STR-04–06 | 60m | Classification rules saved |
| `STR-08` | Choose ED/EA/REA/RD strategy and decision conditions | Shared/C | After preliminary cost/list review | 90m | Written application-round strategy |

### Student Foundation (8)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `PRO-01` | Collect current transcript and course schedule | S/P | Start | 30m | Current records stored |
| `PRO-02` | Verify transcript, GPA, courses, and errors | S/X | After PRO-01 | 60m | Accuracy confirmed or corrections requested |
| `PRO-03` | Build complete activities inventory | S | Before Common App | 120m | Activities and impact evidence listed |
| `PRO-04` | Build honors and awards inventory | S | Before Common App | 60m | Honors with dates/levels listed |
| `PRO-05` | Create résumé and brag sheet | S, C support | After PRO-03–04 | 120m | Shareable résumé/brag sheet complete |
| `PRO-06` | Build experiences and story inventory | S | Before essays | 90m | Usable experiences documented |
| `PRO-07` | Write academic-interest and major narrative | S | Before supplements/outreach | 60m | Concise narrative approved by student |
| `PRO-08` | Review meaningful course, activity, testing, and recruiting gaps | Shared/C | More than six months remaining | 90m | Only feasible high-value actions selected |

### College List And Fit (10)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `COL-01` | Build preliminary candidate list | C/Shared | After strategy | 180m | Candidate list with reasons |
| `COL-02` | Verify majors, business/marketing, and entrepreneurship options | S, assistant support | Per college | 30m | Academic-fit notes recorded |
| `COL-03` | Review admission profile using official/CDS data | C/Shared | Per college | 30m | Admission evidence recorded |
| `COL-04` | Record application rounds and authoritative deadlines | P/S | Per college | 20m | Timeline fields complete |
| `COL-05` | Record required supplements and special requirements | S | Per college | 20m | Requirements inventory complete |
| `COL-06` | Evaluate location, campus, size, culture, and student fit | S | Per college | 30m | Fit rating and notes |
| `COL-07` | Review retention, graduation, earnings, and debt outcomes | P/S | Per college | 30m | Outcome notes recorded |
| `COL-08` | Decide whether student would attend without athletics | S | Per recruiting college | 20m | Yes/no decision with reason |
| `COL-09` | Classify Reach/Target/Likely and financial safety | C/Shared | After COL-02–08 and AID-03 | 30m | Classifications recorded |
| `COL-10` | Approve final active list and archive rejected schools | Shared | Before intensive supplements | 120m | Final list and removal reasons approved |

### Affordability And Financial Aid (11)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `AID-01` | Create financial-aid document checklist and secure folder | P | Aid module start | 60m | Required documents inventoried |
| `AID-02` | Prepare StudentAid.gov student and contributor access | S/P | Before FAFSA availability | 45m | Required accounts/access confirmed |
| `AID-03` | Run official net-price calculator; save dated inputs, result, and caveats | P, assistant support | Per serious college | 60m | Reproducible result saved |
| `AID-04` | Build comparable four-year cost and debt view | P, assistant support | After NPC results | 120m | Four-year comparison complete |
| `AID-05` | Record FAFSA requirement and state/college priority dates | P | Per college | 20m | Aid deadlines sourced |
| `AID-06` | Complete and submit FAFSA | S/P | After public availability | 120m | Submission confirmation saved |
| `AID-07` | Review FAFSA summary, corrections, and college list | P/S | After AID-06 | 45m | Summary verified/corrected |
| `AID-08` | Record CSS Profile requirement and deadline | P | Per college | 15m | CSS applicability recorded |
| `AID-09` | Prepare CSS Profile financial information | P | CSS enabled | 120m | Required information assembled |
| `AID-10` | Submit CSS Profile and verify destinations | P | Applicable deadline | 90m | Submission confirmation saved |
| `AID-11` | Reassess affordability and resolve unsafe colleges | Shared | After AID-03–10 | 90m | Each college marked plausible/escalate/remove |

### Merit, Honors, And Scholarships (7)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `SCH-01` | Verify automatic merit criteria | P, assistant support | Per college | 20m | Eligibility and terms recorded |
| `SCH-02` | Identify competitive institutional awards and deadlines | P, assistant support | Per college | 30m | Opportunities in Scholarship Tracker |
| `SCH-03` | Identify honors-college requirements and deadlines | S, assistant support | Per applicable college | 30m | Honors requirements recorded |
| `SCH-04` | Identify high-value state, regional, employer, and local awards | Shared, assistant support | Scholarship module | 120m | Shortlist created |
| `SCH-05` | Triage opportunities by value, probability, and effort | Shared | After SCH-01–04 | 60m | Apply/defer/skip decisions |
| `SCH-06` | Complete required merit/honors/scholarship submission | S/P | Per selected opportunity | 180m default | Submission confirmed |
| `SCH-07` | Record result, amount, conditions, and next action | P/S | Per submitted opportunity | 15m | Tracker updated |

### Testing (6, Conditional)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `TST-01` | Gather existing scores or complete SAT/ACT diagnostic | S | Testing enabled | 180m | Comparable baseline available |
| `TST-02` | Choose SAT, ACT, both, or no further testing | Shared/C | After TST-01 | 60m | Written testing decision |
| `TST-03` | Register tests and request accommodations if needed | S/P | Before registration deadline | 45m | Registration confirmed |
| `TST-04` | Create and execute preparation/checkpoint plan | S, tutor support | Before test | 600m default | Planned checkpoints completed |
| `TST-05` | Decide test-submit/test-optional strategy | Shared/C | Per college, after scores | 20m | Decision recorded |
| `TST-06` | Send required official scores and verify receipt | S/P | Per college deadline | 20m | Portal/agency confirmation |

### Recommendations And School Records (7)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `REC-01` | Document high-school recommendation/transcript process | S/X | Start of application phase | 45m | Process and internal dates recorded |
| `REC-02` | Select appropriate teacher recommenders | S/C | Before requests | 45m | Recommenders chosen |
| `REC-03` | Request teacher recommendations | S | School/request deadline | 30m | Teachers confirm |
| `REC-04` | Provide résumé, brag sheet, and requested context | S | After REC-03 | 45m | Materials delivered |
| `REC-05` | Meet school counselor and request school report/counselor rec | S/X | School deadline | 60m | Request confirmed |
| `REC-06` | Request/authorize transcripts and required records | S/P/X | School deadline | 30m | Orders/authorizations confirmed |
| `REC-07` | Monitor recommendation and transcript receipt; follow up | S | Per earliest document deadline | 20m | Portals show received or follow-up active |

### Common Application And Base Data (8)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `APP-01` | Create or roll over Common App account | S | Application phase | 30m | Correct cycle/account active |
| `APP-02` | Complete profile, contact, and family sections | S/P | After APP-01 | 75m | Sections validated |
| `APP-03` | Complete education and current-course sections | S | After PRO-01 | 60m | Education data verified |
| `APP-04` | Complete testing section | S | After testing decision | 30m | Testing data consistent |
| `APP-05` | Draft and order activities entries | S, C support | After PRO-03 | 180m | Ten entries or final set complete |
| `APP-06` | Complete honors section | S | After PRO-04 | 60m | Final honors entered |
| `APP-07` | Draft additional-information response if justified | S/C | Conditional | 90m | Necessary context stated concisely |
| `APP-08` | Audit and lock reusable application data | S/P/C | Before first submission | 90m | Base application fact-checked |

### Essays (10)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `ESS-01` | Inventory all prompts, word limits, and reuse groups | S, assistant support | After active list | 120m | Prompt matrix complete |
| `ESS-02` | Brainstorm personal-statement topics | S, C support | After PRO-06 | 120m | Candidate topics documented |
| `ESS-03` | Select personal-statement topic and outline | S/C | After ESS-02 | 90m | Student-approved outline |
| `ESS-04` | Draft personal statement | S | After ESS-03 | 300m | Complete first draft |
| `ESS-05` | Revise personal statement for structure and specificity | S | After ESS-04 | 180m | Strong student-owned revision |
| `ESS-06` | Obtain bounded outside review | C/Professional | After ESS-05 | 60m | Actionable feedback returned |
| `ESS-07` | Finalize and proof personal statement | S | Before earliest use | 120m | Final word-count-compliant essay |
| `ESS-08` | Outline and draft one supplemental response | S | Per prompt | 120m | Complete draft |
| `ESS-09` | Revise and proof one supplemental response | S/C | After ESS-08 | 90m | Final student-owned response |
| `ESS-10` | Audit essay-to-school, prompt, facts, and word count | S/C | Before each submission | 30m | Correct final essays attached |

### Athletic Recruiting (10, Conditional)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `ATH-01` | Assemble verified marks and meet results | S | Recruiting enabled | 60m | Sources and personal bests recorded |
| `ATH-02` | Create athletic résumé/profile | S/C | After ATH-01 | 120m | Shareable profile complete |
| `ATH-03` | Collect useful video/media links | S | If available/valuable | 60m | Links tested and labeled |
| `ATH-04` | Assemble academic/recruiting information packet | S/P | After PRO-01 and ATH-02 | 60m | Transcript/scores/profile ready |
| `ATH-05` | Compare marks with roster and conference results | S, assistant support | Per recruiting college | 30m | Athletic-fit rating recorded |
| `ATH-06` | Identify correct coach/contact | S, assistant support | Per recruiting college | 20m | Recruiting contact row created |
| `ATH-07` | Complete recruiting questionnaire | S | Per college | 45m | Completion logged |
| `ATH-08` | Edit and send personalized initial outreach | S, assistant support | Per coach | 30m | Outreach date/message logged |
| `ATH-09` | Record response, interest, and next follow-up | S | Per response | 15m | Recruiting Tracker current |
| `ATH-10` | Complete scheduled follow-up, call, meeting, or visit action | S/P | Per recruiting next action | 60m default | Outcome and next action logged |

### Visits, Interviews, And Demonstrated Interest (6, Conditional)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `VIS-01` | Select only visits/events that can change a decision | Shared | Visits enabled | 45m | High-value shortlist |
| `VIS-02` | Register and plan visit or virtual event | P/S | Per selected event | 45m | Registration/logistics confirmed |
| `VIS-03` | Prepare school-specific questions and priorities | S | Before event | 30m | Question list ready |
| `VIS-04` | Attend and record ratings, notes, concerns, and follow-up | S/P | Event date | 240m + travel | Campus Visit Tracker updated |
| `VIS-05` | Determine interview format; prepare and practice responses/questions | S/C | Interview applicable | 120m | Practice completed |
| `VIS-06` | Complete interview and required follow-up | S | Interview date | 90m | Status and notes recorded |

### Portfolio And Audition (3, Conditional)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `PRT-01` | Record portfolio/audition specifications, format, and deadline | S, assistant support | Per applicable college | 30m | Authoritative requirements saved |
| `PRT-02` | Curate, develop, or rehearse required work | S, specialist support | After PRT-01 | 600m default | Submission-ready work |
| `PRT-03` | Submit portfolio/audition materials and verify receipt | S | Applicable deadline | 60m | Receipt/status confirmed |

### Submission And Portals (5)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `SUB-01` | Run college-specific requirement and readiness audit | S/P/C | Before each submission | 45m | No unresolved required item |
| `SUB-02` | Review generated application PDF for accuracy | S/P | Before each submission | 45m | PDF approved |
| `SUB-03` | Submit application and pay fee/use waiver | S/P | College deadline | 30m | Submission confirmation saved |
| `SUB-04` | Activate portal and verify application receipt | S | After SUB-03 | 30m | Portal active and received |
| `SUB-05` | Resolve missing items and track post-submit requirements | S/P/X | After portal review | 30m | Missing items cleared/owned |

### Project Control (1 Recurring Template)

| ID | Task | Owner | Applies / anchor | Effort | Complete when |
|---|---|---|---|---:|---|
| `PM-01` | Review completed/overdue work, decisions, 21-day deadlines, blockers, recruiting, and next week | Shared | Weekly inside rolling 90 days | 45m | Plan updated and next actions assigned |

## 7. Required Views And Behavior

- **Master Plan:** all applicable task instances across the selected horizon.
- **Rolling 90 Days:** due/planned work, overdue work, and later blockers.
- **This Week:** separate auto-updating tab with overdue, current, high-priority
  21-day, blocked, decision-needed, and deliberately selected tasks; manual
  refresh is always available.
- **Owner:** configured person/role work and external items being awaited.
- **College:** linked application, affordability, recruiting, visit, aid, and
  submission work.
- **Effort:** selected-horizon, 90-day, weekly average, peak week,
  planning-stage, module, role, and per-college totals.

The weekly report shows completed, overdue, decisions, deadlines within 21
days, blocked/waiting items, application status, enabled recruiting updates,
next-week effort, and the next 5–10 actions. It should take no more than 15
minutes to review.

Derived completion must show its evidence source. Ambiguous evidence suggests
completion for user confirmation. If a user reverses an evidence-derived
completion, later synchronization retains the manual status and reports the
remaining tracker disagreement.

## 8. Software Implementation Plan

### SW-01 — Configuration, Schema, And Stable IDs

- Add sheet names, headers, schema metadata, ownership groups, role/module
  configuration, Task ID, Template ID, Scholarship ID, and Recruiting Contact
  ID contracts.
- Keep task/helper headers on row 1 and data on row 2.
- Test config/schema contracts and stable-ID preservation.

### SW-02 — Catalog Module And Template Sheet

- Create a source-controlled task catalog containing the 100 templates above.
- Validate unique IDs, owners/fallbacks, applicability, anchors, dependencies,
  effort, and deliverables.
- Render the hidden `Task Templates` sheet from the catalog; user edits do not
  become the catalog source of truth.

### SW-03 — Family Configuration And Applicability

- Collect grade/cycle, dates, roles/custom owners, modules, and effort settings.
- Resolve module inclusion and fallback owners.
- Preview included/excluded template counts before generation.
- Test athlete/non-athlete and with/without-professional scenarios.

### SW-04 — Adaptive Scheduler

- Implement deadline precedence, fixed/relative/dependency/window/recurring
  rules, late-start feasibility, planned week, and effective due date.
- Generate both more-than-one-year and accelerated 90-day schedules.
- Test multiple college/aid/merit deadlines and locked-date preservation.

### SW-05 — Task Generation And Reconciliation

- Instantiate global, per-college, per-prompt, per-opportunity, and per-contact
  tasks with stable deterministic relationships.
- Preview add/reassign/archive/reschedule changes.
- Preserve completed/manual fields and make regeneration idempotent.
- Test college rename/removal, module changes, and catalog upgrades.

### SW-06 — Tasks Sheet

- Create/repair the canonical table, validations, formatting, filters, notes,
  bounded rows, and safe user/system column ownership.
- Add manual custom tasks without requiring Task ID or Template ID; persist a
  stable ID on first refresh and include free-form categories in every view.
- Test sorting, row movement, preservation, and repair.

### SW-07 — This Week And Other Views

- Generate `This Week`, rolling 90-day, owner, college, and effort views from
  canonical task data.
- Auto-refresh where safe; expose a manual refresh menu command.
- Avoid independently editable task copies and volatile whole-column formulas.

### SW-08 — Recruiting Tracker

- Create it only when Athletic Recruiting is enabled.
- Implement contact-level stable IDs, validations, notes, task links, response
  tracking, and preservation when the module is later disabled.
- Test multiple coaches per college and derived task completion.

### SW-09 — Tracker-Derived Completion

- Map reliable evidence from Application Timeline, Financial Aid, Scholarship,
  Campus Visit, Application Status, and Recruiting trackers.
- Record completion source, suggest ambiguous matches, and allow manual
  confirmation/override.
- Test that two editable sources of truth are never created.

### SW-10 — Effort, Priority, And Weekly Control

- Apply configurable role multipliers and task overrides.
- Calculate totals without double-counting Shared work.
- Suggest priority from deadlines/critical path; preserve user overrides.
- Add optional post-baseline role thresholds and week-specific overrides.

### SW-11 — Setup, Menu, Instructions, And Repair

- Add generation, reconfiguration preview, refresh, focused repair, and archive
  flows to the setup registry/menu.
- Update in-sheet instructions and explain modules, roles, evidence, locking,
  thresholds, and regeneration.
- Keep service code callable without UI and final alerts at menu boundaries.

### SW-12 — Integration And Release Verification

- Wire new source files into `.clasp.json`, syntax tests, all-test runner, and
  version tooling.
- Run focused catalog, scheduler, schema, menu, repair, preservation, view,
  recruiting, and derived-completion tests plus `npm run check`.
- In copied sheets, smoke test a non-athlete long-horizon family and the current
  athlete 90-day family before merging/deploying.

## 9. Acceptance Criteria

1. The catalog contains 100 unique, validated templates and generates only
   applicable modules.
2. A more-than-one-year family receives a long roadmap without premature
   submission work.
3. The current family receives a usable rolling plan through the earliest real
   deadline, including Athletic Recruiting.
4. Every generated task has a stable identity, accountable owner, schedule,
   effort, deliverable, and completion rule.
5. Required work falls back correctly when no professional participates.
6. Reconfiguration previews changes and preserves completed/manual work;
   custom tasks receive stable IDs and participate in weekly and effort views.
7. Existing trackers remain canonical; task completion links to evidence.
8. `This Week` refreshes from `Tasks` and has a manual fallback.
9. Effort totals report actual baseline work before optional thresholds.
10. No setup, refresh, repair, sort, module change, or college change loses
    user data.
11. Node tests pass, `git diff --check` passes, and both copied-sheet scenarios
    pass before release.

## 10. Non-Goals

- General household, estate, or work project management
- Automatic application, FAFSA, scholarship, or email submission
- Storage of passwords or sensitive source documents
- Admissions-only résumé padding or indiscriminate small-scholarship work
- Print/export, calendar scheduling, email notifications, or a second live
  planning workbook in the first release
