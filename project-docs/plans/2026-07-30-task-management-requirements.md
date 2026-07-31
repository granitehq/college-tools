# College Task Management Requirements Specification

**Status:** Draft for review, revision 4

**Date:** 2026-07-30

**Feature:** College application task management and weekly command center

**Product:** `college-tools`

## Purpose

Add a task-management layer to `college-tools` that turns the college
application process into a structured, owner-aware, deadline-anchored plan.
The same system must support a family beginning more than a year before
applications and a family, like the current one, entering an accelerated final
90 days.

For the current rising-senior scenario, the project objective is:

> By the target early-application date, submit the strongest possible
> applications to colleges the student would actually attend and the family
> can realistically afford, while maximizing athletic and merit opportunities.

The feature must reduce the parent's coordination burden, make student
ownership visible, and present a short weekly action list instead of requiring
the family to reconstruct status across sheets, email, application portals,
and conversations.

This document defines product requirements. It does not yet prescribe a
task-by-task implementation plan or final sheet layout.

## Problem Statement

The current rising-senior college process is expected to contain approximately
70-100 meaningful tasks across strategy, research, affordability, testing,
recommendations, applications, essays, athletic recruiting, visits,
submission, and financial aid. A family starting earlier may have a longer
roadmap with a different applicable task set. The existing workbook tracks
colleges, deadlines, financial aid, visits, and application status, but it is
not a project-management system for the work required to reach those outcomes.

Without a single task source of truth:

- the parent can become the default researcher, editor, coordinator, and
  application administrator;
- student-owned work is easy to confuse with parent-owned work;
- dependencies and blocked tasks are hard to see;
- the family spends time reconstructing status instead of making decisions;
- each additional college silently creates more research, supplement,
  financial-aid, and recruiting work; and
- an overloaded week is discovered only after deadlines are at risk.

## Desired Outcome

The feature should move the parent from primary executor to decision-maker and
reviewer. A successful result allows the parent to:

1. review one concise weekly status view in 15 minutes or less;
2. see only the decisions and short external actions that require the parent;
3. confirm that the student owns and completes authentic student work;
4. identify overdue, blocked, and due-soon work before deadlines are missed;
5. understand the total and weekly effort required from each role before
   deciding whether to reduce scope, reassign work, or obtain help; and
6. use an assistant or targeted professional help for research, drafting,
   comparisons, and preparation without confusing that support with task
   ownership.

## Product Principles

1. **One college task source of truth.** Do not require users to maintain the
   same task or completion status in multiple sheets.
2. **Student work remains student work.** The feature may support
   brainstorming, outlining, critique, and preparation, but must not encourage
   the parent, counselor, or an assistant to impersonate the student.
3. **The parent approves rather than produces.** Parent work should be
   concentrated on budget, final college-list decisions, sensitive financial
   information, factual review, fees, signatures, and verification.
4. **The weekly view is the primary operating view.** The full plan exists for
   completeness; users should normally work from a small current-action view.
5. **The schedule adapts to real milestones.** Current grade and graduation
   year determine which work may apply, while actual application, school,
   financial-aid, scholarship, and recruiting deadlines determine when it is
   due.
6. **Estimate before constraining.** The first complete plan must calculate the
   work required by role and week without suppressing, deferring, or removing
   valuable work to fit a predetermined hour limit. Capacity decisions come
   after the family reviews that baseline.
7. **Tasks must be applicable and actionable.** Do not pad the plan with filler
   or create tasks for testing, CSS Profile, interviews, visits, or recruiting
   when those activities do not apply.
8. **Each college must justify its workload.** The system should support the
   family's chosen list size, show the incremental work created by each school,
   and make it easy to remove schools that are unaffordable, poor fits, or not
   worth attending without track.
9. **Support is separate from ownership.** An assistant can prepare research
   or drafts and a professional can advise, while the task still belongs to
   the student or parent.
10. **Prioritize high-value work for the available horizon.** In the final
   application period, applications, affordability,
   essays, recruiting, recommendations, and submission readiness take priority
   over adding new extracurriculars, starting an admissions-only passion
   project, or chasing many low-value scholarships. Families starting earlier
   may receive meaningful course, testing, activity, exploration, financial,
   and recruiting preparation tasks.
11. **College and estate work remain separate.** This feature is a college
   application command center, not a general household, work, or estate task
   manager.

## Users And Roles

### Student

The student is the default owner of:

- Common App profile, education, activities, honors, and additional
  information;
- activity and award inventories;
- essay brainstorming, drafting, revision, and final wording;
- college-specific research and demonstrated-interest activities;
- teacher recommendation requests and supporting materials;
- athletic recruiting profile content, coach outreach, questionnaires, and
  follow-ups;
- application completion; and
- weekly progress reporting.

### Parent

The parent is the default owner of:

- the annual contribution and borrowing limits;
- financial-safety criteria and final affordability decisions;
- final approval of the college list;
- sensitive parent financial information and parent-controlled aid forms;
- application fees and other payments;
- factual and financial verification before submission;
- major deadline oversight; and
- decisions or external actions that require parental authority.

The requirements must not impose a parent-hour ceiling before the detailed
plan is built. The plan should first calculate the work that is worth doing,
then show the parent total, weekly average, and peak weeks for the selected
horizon so the family can make an informed scope or delegation decision.

### Counselor Or Paid Professional

This is an optional role. The system must work when the family uses:

- no paid counselor;
- a counselor for 5-10 targeted hours;
- a full-service application project manager; or
- specialized help for essays, athletic recruiting, testing, or financial
  aid.

Typical professional work includes college-list review, application schedule
review, essay critique, athletic-fit assessment, and specialized financial-aid
review.

`Counselor/Professional` is one standard owner category. If a family has both
a private counselor and another consultant, it may add each person as a custom
owner and delegate individual tasks between them. Reporting should retain the
shared standard category while still showing the assigned person's name.

### Assistant Support

Assistant support is a capability, not the accountable owner of student or
parent work. It may prepare:

- college, program, outcomes, affordability, scholarship, and recruiting
  research;
- comparisons and ranked recommendations;
- task breakdowns, dependencies, and weekly priorities;
- email or profile drafts for the student to edit and send;
- essay brainstorming prompts, outlines, and critique;
- checklists and document inventories; and
- concise decision briefs for the parent.

The product must identify tasks for which assistant preparation can remove
most of the research or drafting effort.

### Shared

Use `Shared` only when the deliverable genuinely requires active work from
more than one person. Shared ownership must not become a catch-all that hides
accountability.

### Role And Module Adaptation

The product should maintain a comprehensive system catalog but generate only
the task modules and role assignments that apply to the family. Users should
not be expected to delete irrelevant roles and tasks from a maximum plan.

Initial setup should identify:

- participating family roles, including Student and one or more
  Parent/Guardian roles;
- whether a private counselor, application consultant, essay coach, recruiting
  specialist, tutor, or other paid professional is participating;
- whether the student is pursuing athletic recruitment;
- whether standardized testing remains in scope;
- whether CSS Profile, portfolios/auditions, interviews, visits, or other
  conditional pathways apply; and
- whether a role is an active workbook user, an accountable owner, a support
  provider, or an external party being awaited.

The system should then apply two different rules:

1. **Module applicability:** Do not instantiate a module such as Athletic
   Recruiting when it does not apply.
2. **Owner resolution:** For work that still must happen, choose the default
   owner from the roles that actually exist. A task does not disappear merely
   because a consultant is absent.

Examples:

- without athletic recruiting, coach research, recruiting questionnaires,
  performance comparisons, and coach follow-ups are not generated;
- with athletic recruiting, those tasks are generated and assigned primarily
  to the student, with appropriate parent or specialist support;
- without a private counselor, required list, essay, or schedule work falls
  back to Student, Parent/Guardian, or Shared according to the template;
- with a private counselor, selected research, review, planning, and
  accountability tasks may be assigned to that professional, while authentic
  student work remains student-owned; and
- a school counselor may be an external dependency even when that person never
  edits the workbook.

Changing the family configuration later must:

- show a preview of tasks to add, reassign, archive, or leave unchanged;
- update only incomplete system-generated tasks by default;
- preserve completed tasks, notes, evidence, and manual ownership decisions;
- archive or mark a no-longer-applicable task `Skipped` with a reason rather
  than silently delete its history; and
- recalculate dates, dependencies, and effort summaries after confirmation.

## Scope

### In Scope

- An adaptive master college roadmap covering the family's applicable planning
  horizon.
- A rolling 90-day plan generated from the master roadmap.
- An accelerated final-90-day scenario for the current family.
- A value-selected task catalog expected to produce approximately 70-100
  applicable tasks for the current rising-senior application process; other
  horizons may produce different totals.
- One-time, recurring, and college-specific tasks.
- Configurable Student, Parent/Guardian, Counselor/Professional, Shared, and
  external-dependency roles.
- Optional task modules selected through family configuration.
- Dependencies, deadlines, priorities, effort, status, deliverables, and
  authoritative resource links.
- Separate normal and parent-adjusted effort estimates.
- Assistant-preparation and professional-help indicators.
- Total, planning-stage, and weekly effort summaries by role.
- Peak-week and deadline-collision visibility.
- Weekly, owner-specific, overdue, blocked, decision-needed, and due-soon
  views.
- A concise weekly report.
- Integration with existing college, application, financial-aid, scholarship,
  visit, and dashboard data without duplicating their domain data.
- Optional athletic recruiting tasks, including track and field.

### Out Of Scope

- Estate-administration or other non-college projects.
- Acting as the student, parent, counselor, coach, attorney, or accountant.
- Sending student communications or submitting applications automatically.
- Storing application-portal passwords or highly sensitive financial
  documents.
- Replacing Common App, FAFSA, CSS Profile, school portals, or official
  net-price calculators.
- A general-purpose kanban, chat, or document-management product.
- Automated email or calendar notifications in the first release.
- Printable or exported task-plan reports in the first release.
- A second live project-plan spreadsheet or bidirectional cross-spreadsheet
  synchronization in the first release.
- Legal, tax, or financial advice.

## Relationship To Existing Workbook Features

Task management is a coordination layer, not a replacement for existing
trackers.

- `Colleges` remains the source for the college list, college facts, ratings,
  and fit.
- `Application Timeline` remains the source for college application deadlines
  and milestone dates.
- `Financial Aid Tracker` remains the source for aid requirements, offers, and
  household financial comparison.
- `Scholarship Tracker` remains the source for scholarship opportunities and
  deadlines.
- `Campus Visit Tracker` remains the source for visit details.
- `Application Status Tracker` remains the source for submitted application
  and decision status.
- `Recruiting Tracker`, when the Athletic Recruiting module is enabled, is the
  source for coach contacts, outreach dates, responses, follow-ups,
  questionnaires, and recruiting notes.
- `Dashboard` may surface task summaries and the weekly report, but the task
  data must have one canonical home.

Where a task represents work against an existing tracker item, it should link
to that item or derive its status from it where reliable. The implementation
must not create two independently editable completion states for the same
work.

The current backlog intentionally limits the planned Recommenders tracker and
does not assume general task tracking. Approval of this specification would be
a product-direction change; the backlog must be reconciled before
implementation begins.

## Workbook Architecture Decision

### Recommendation: One Integrated Workbook

Task management should be part of the existing `college-tools` workbook, not a
separate live project-plan spreadsheet.

The task plan depends directly on college identity, application deadlines,
financial-aid requirements, scholarships, visits, application status, and
dashboard data. Keeping those records together preserves one source of truth
and avoids asking families to enter or reconcile the same deadline or status
twice.

The integrated design should add the smallest practical surface:

- `Tasks`: the canonical, user-editable task-instance table;
- `Task Templates`: a system-managed catalog, hidden or otherwise kept out of
  the normal user workflow; and
- `This Week`: a separate generated sheet that refreshes automatically from
  `Tasks` where practical and always has a manual refresh path.

When Athletic Recruiting is enabled, add a conditional `Recruiting Tracker`
sheet. Disabling the module later must preserve its historical data rather than
deleting the sheet.

The Recruiting Tracker should use one row per coach/contact and support:

- stable Recruiting Contact ID and linked College ID;
- college, sport, event, coach name/title, and contact information;
- recruiting questionnaire link and completion status;
- initial outreach date and communication method;
- response/interest status;
- last-contact and next-follow-up dates;
- visit, call, or meeting status;
- student-owned next action; and
- recruiting notes.

Recruiting task instances should link to the relevant Recruiting Contact ID.
Reliable tracker fields may satisfy tasks such as `Send initial outreach`,
`Complete questionnaire`, or `Record coach response`; the notes and
communication history remain in Recruiting Tracker rather than being copied
into Tasks.

The existing trackers remain canonical for their domain data. Task rows should
link to those records by stable identifiers and derive completion where the
tracker already provides reliable proof. The system must not copy application,
financial-aid, scholarship, visit, or status fields into separately editable
task columns.

The effort summary, rolling 90-day view, and other filtered views should reuse
`Tasks` data rather than create independently editable task copies.

### Integrated-Workbook Tradeoffs

The workbook is already large, and task management adds rows, formulas, setup
logic, and at least one visible sheet. Mitigations must include:

- keep only one canonical task table;
- generate views from the task table instead of duplicating data;
- use batch reads and writes rather than per-cell service calls;
- avoid volatile whole-column formulas where bounded ranges or generated
  values are sufficient;
- trim unused rows consistently with existing workbook behavior;
- archive prior application cycles rather than leaving every historical task
  active; and
- keep template/configuration data hidden from the normal family workflow.

These costs are lower than the operational risk of maintaining two connected
spreadsheets.

### Separate-Workbook Contingency

A separate project-plan workbook is not recommended for the first release.
Formula-based imports would be primarily one-way, require separate access
approval, and can become stale or fragile when sheet layouts change.
Bidirectional Apps Script synchronization would add permissions, spreadsheet
IDs, conflict resolution, copy/setup complexity, retries, and new failure
modes.

If a separate workbook is required later, synchronization must use these
boundaries:

- the main `college-tools` workbook remains authoritative for colleges,
  deadlines, financial aid, scholarships, visits, and application status;
- the project-plan workbook is authoritative only for task-specific fields
  such as owner, planned week, status, notes, and completion;
- records join through stable IDs, never row numbers or mutable names;
- synchronization is explicit and observable, with a manual refresh option,
  last-sync time, and surfaced errors;
- each field has exactly one owning workbook; and
- conflicts are reported rather than silently resolved.

A read-only export, printable report, or temporary shareable view is preferable
to maintaining a second live system.

## Current Scenario Assumptions

The first task catalog and validation scenario should reflect the family's
current situation:

- the student is a rising senior, so the feature should optimize the
  application process rather than propose long-horizon profile building;
- the student is considering highly selective schools, including Top 50
  options;
- business, marketing, and entrepreneurship programs and opportunities matter;
- track and field recruiting, particularly jumping events, may affect
  admission, college fit, and possibly affordability;
- affordability is a first-class selection criterion alongside admission and
  academic fit;
- merit scholarships, honors colleges, institutional awards, and financial-aid
  requirements may have deadlines separate from the application deadline; and
- October 31 is the working early-application target for the first real plan,
  but actual college deadlines, application rounds, testing strategy, and final
  college count remain configurable.

These assumptions guide the starter catalog without turning one student's
preferences into hard-coded requirements for every workbook user.

## Adaptive Scheduling Model

### Required Planning Inputs

Initial setup should request or derive:

- student's current grade and expected high-school graduation year;
- planning start date, defaulting to the current date;
- application cycle;
- participating family members and optional professional-support roles;
- enabled task modules and conditional pathways;
- a working first-application deadline when school-specific deadlines are not
  known yet;
- actual application round and deadline for each college when known;
- separate merit, honors, financial-aid, scholarship, school-document, and
  recruiting milestones where applicable;
- the high school's recommendation and transcript process dates when known;
  and
- whether testing, recruiting, visits, interviews, CSS Profile, portfolios,
  and other conditional work apply.

The system should calculate days remaining. Users should not have to maintain a
manually entered "number of days before applications" value.

Graduation year and grade are applicability inputs, not the primary scheduling
clock. Exact task dates should come from real milestones whenever possible.

### Deadline Precedence

When scheduling a task, use the most specific reliable anchor available:

1. actual school-, college-, scholarship-, aid-, or recruiting-specific date;
2. application-round or school-process default;
3. family working target date; and
4. a clearly labeled suggested window when no authoritative date exists.

The plan must support multiple concurrent deadlines. A single generic
"applications due" date is not sufficient because application, merit, honors,
FAFSA/CSS, recommendation, transcript, testing, and recruiting work may have
different anchors.

The earliest relevant deadline should drive shared upstream work, but not every
task in the project:

- the earliest application, merit, honors, or school-document deadline drives
  shared application components needed by that date;
- each college-specific submission and audit remains anchored to that
  college's own deadline;
- FAFSA preparation is anchored before public availability, while FAFSA
  completion is anchored to public availability and the earliest applicable
  state or college aid priority deadline; and
- recruiting tasks follow their own coach, questionnaire, visit, and
  application milestones.

For the current 2027–28 cycle, Federal Student Aid plans public FAFSA release
by October 1, 2026. Treat that as a verified working availability milestone,
not as a universal financial-aid submission deadline. Source:
[Federal Student Aid 2027–28 FAFSA Beta Testing Plan](https://fsapartners.ed.gov/knowledge-center/library/electronic-announcements/2026-07-21/2027-28-fafsa-beta-testing-plan).

### Scheduling Rule Types

Each task template should use one of these scheduling approaches:

- **Fixed external date:** the task is due on an authoritative milestone.
- **Relative to milestone:** the task is planned a configurable number of days
  before or after an anchor.
- **Dependency-driven:** the task becomes ready after prerequisite work and is
  scheduled within the remaining window.
- **Suggested window:** the task belongs in a grade, season, or planning stage
  but has no authoritative date.
- **Recurring cadence:** the task repeats on a weekly or other configured
  schedule while applicable.

The engine must not blindly scale every task to the available time. Tasks with
real lead times or external deadlines must be marked late, urgent, or no longer
feasible when the family starts too late.

### Planning Horizons

| Time remaining | Plan emphasis |
|---|---|
| More than one year | Exploration, course and testing decisions, meaningful activity development, early affordability, and recruiting preparation |
| Six to twelve months | College research, visits, testing completion, activity/resume inventory, recommendations preparation, affordability, and recruiting |
| Three to six months | Final list, Common App preparation, essays, recommendations, financial documents, and active coach outreach |
| Ninety days or less | Accelerated applications, affordability verification, essays, recruiting, aid deadlines, submission audit, and portal confirmation |

These are default planning modes, not rigid bands. Applicable tasks and real
deadlines determine the actual plan.

### Current Family: Accelerated Ninety-Day Scenario

The current family's generated plan should organize tasks into four overlapping
phases. Workstreams such as recruiting, affordability, and essays may span
multiple phases.

1. **Days 1-14: Establish the foundation**
   - set budget and debt limits;
   - configure roles, planning dates, and effort assumptions;
   - assemble student records and activity history;
   - create the Common App account and complete the base profile;
   - draft the activities list, honors list, resume, and brag sheet;
   - build the preliminary college list and application calendar;
   - gather parent financial documents;
   - contact the school counselor; and
   - complete an SAT or ACT diagnostic if testing is still in scope.

2. **Days 15-30: Finalize selection and strategy**
   - assess admission, academic, financial, and athletic fit;
   - run official net-price calculators for every serious candidate;
   - identify merit, honors-college, and priority scholarship requirements;
   - decide the Early Decision, Early Action, and Regular Decision strategy;
   - create the recruiting profile and coach targets;
   - request recommendations;
   - start the main essay; and
   - approve the final college list.

3. **Days 21-60: Produce applications in parallel**
   - complete Common App sections;
   - refine activities and honors;
   - draft and revise the personal statement and supplemental essays;
   - complete athletic profiles, coach outreach, questionnaires, and follow-ups;
   - attend only high-value visits, virtual sessions, or interviews;
   - prepare FAFSA and CSS Profile materials where applicable;
   - pursue high-value scholarship and honors-college opportunities; and
   - resolve financial or strategic decisions while monitoring weekly status.

4. **Days 45-90: Verify, submit, and confirm**
   - run an application-readiness audit for every school;
   - review each generated application PDF;
   - verify transcripts and recommendations;
   - verify test-score reporting requirements where applicable;
   - complete parent-controlled financial-aid sections;
   - pay fees and submit;
   - confirm portal access and receipt; and
   - track follow-up requirements, institutional scholarships, and continuing
     coach communication.

These four phases describe the current family's accelerated scenario, not the
universal product schedule. Their boundaries should be generated from the
available window and actual deadlines.

### College-List Guardrails

Each active college should record whether it passes these three tests:

1. plausibly affordable;
2. supports the student's academic interests; and
3. offers a realistic athletic opportunity or is worth attending without the
   sport.

No fixed college count is a product requirement. Earlier planning considered
both a focused 8-10-school list and a broader 10-15-school list. The task system
must support either decision, show the incremental tasks and effort created by
each college, and let the family decide the final count after reviewing fit,
affordability, deadlines, and workload.

An initial balance might include Reach, Target, and Likely schools, but the
counts must remain configurable. Every Likely school must also be financially
plausible and genuinely acceptable to the student.

### Project Deliverables

The detailed plan should lead to these outcomes where applicable:

- a final college list with Reach/Target/Likely assessment, academic and
  program fit, affordability, athletic fit, deadlines, and application
  requirements;
- a dated application calendar that includes application, merit, honors,
  financial-aid, scholarship, recruiting, and school-document deadlines;
- official net-price estimates and a comparable four-year cost view for every
  serious college;
- a complete Common App base profile, activities section, honors section, and
  additional information;
- a student resume/brag sheet and confirmed recommendation plan;
- a final personal statement and all required supplemental essays;
- an athletic resume/profile, verified marks and results, relevant media links,
  coach-contact history, and recruiting-questionnaire status;
- selected visit, virtual-event, and interview notes;
- organized FAFSA/CSS Profile source documents and school-specific aid
  requirements;
- a focused list of institutional, honors, state/regional, employer, and other
  high-value scholarship opportunities;
- verified application PDFs, submissions, receipts, and portal access; and
- current tracker and dashboard data suitable for later offer comparison and
  decision-making.

## Task Catalog Requirements

The starter catalog should cover the following workstreams. Counts are planning
ranges, not quotas, and should not be used to add low-value work merely to
reach a target.

| Workstream | Typical task count | Representative deliverables |
|---|---:|---|
| Family strategy | 6-8 | Budget, debt limit, geography, school-size and academic priorities |
| Student profile | 6-8 | Transcript review, resume, activities, awards, interests |
| College research | 10-12 | Initial list, business/marketing/entrepreneurship review, outcomes, campus fit |
| Affordability | 10-12 | Official net-price estimates, merit rules, honors colleges, financial safeties, four-year cost |
| Testing | 5-7 | Diagnostic, test decision, registration, preparation, score policy |
| Recommendations and school records | 6-8 | Counselor meeting, teacher requests, brag sheet, transcript process |
| Common App | 8-10 | Profile, education, activities, honors, additional information |
| Essays | 8-12 | Story inventory, personal statement, drafts, revisions, school-specific supplements |
| Athletic recruiting | 10-15 | Verified marks/results, athletic resume, media links, targets, emails, questionnaires |
| Visits and demonstrated interest | 4-6 | Virtual events, selected visits, interviews, admissions contacts |
| Submission and financial aid | 8-10 | PDF audit, submission, portals, FAFSA, CSS Profile, institutional scholarships |

For the current rising-senior scenario, the total active task count is expected
to land around 70-100 after non-applicable work is removed and school-specific
work is instantiated. A longer-horizon family may receive additional
preparation tasks distributed across a much longer roadmap. Task value and
applicability, not a target count, determine what belongs in either plan.

### Value Filter

The first catalog should prioritize work that materially improves admission
readiness, affordability, athletic opportunity, or deadline control:

- completing accurate, polished applications;
- choosing colleges the student would attend at a plausible price;
- official net-price estimates and school-specific aid requirements;
- personal statement and required supplemental essays;
- teacher and counselor recommendations;
- timely, personalized coach outreach and recruiting follow-up;
- institutional merit scholarships, honors colleges, large regional or state
  awards, employer benefits, and athletic opportunities; and
- submission verification and portal follow-up.

The catalog should omit or de-prioritize:

- starting new extracurriculars solely to influence admission;
- creating a new "passion project" for application optics;
- applying to dozens of small, low-probability scholarships without a clear
  value case;
- low-value visits or demonstrated-interest activities that do not affect the
  decision; and
- duplicate research that does not change a school, cost, recruiting, or
  application decision.

### Task Templates And Instances

The catalog must distinguish:

- **global tasks**, completed once for the application cycle;
- **college-specific tasks**, instantiated for each applicable college;
- **conditional tasks**, created only when testing, CSS Profile, interviews,
  visits, supplements, or recruiting apply; and
- **recurring tasks**, such as weekly progress review or coach follow-up.

Every template must also declare:

- applicable grade, season, or time horizon;
- applicable feature/module conditions;
- required or optional participating roles;
- default owner and fallback owner order;
- support roles that may prepare or review the work;
- scheduling rule type;
- milestone anchor type;
- default offset or suggested window;
- prerequisite template IDs;
- whether late-start compression is allowed;
- whether the task becomes unnecessary after a cutoff; and
- whether the task is recommended, conditional, or required.

Adding a college should clearly show which new tasks are created. Removing a
college should not silently delete completed history; related open tasks should
be archived or marked no longer applicable.

## Task Data Requirements

Every task must support:

| Field | Requirement |
|---|---|
| Task ID | Stable, unique identifier that does not change when task text or sorting changes |
| Template ID | Stable link to the system task definition, blank only for a fully custom task |
| Workstream | One of the defined catalog workstreams |
| Module | Core or optional pathway such as Athletic Recruiting, Testing, CSS Profile, Visits, or Portfolio |
| Planning stage | Lifecycle stage such as Exploration, Foundation, Selection, Production, Submission, or Follow-Up |
| Horizon applicability | Grade, season, or days-remaining conditions that make the task relevant |
| Task | Specific action written with a verb and a clear completion point |
| College | Optional link for college-specific tasks |
| Owner | Configured accountable person or role |
| Support roles | Optional configured people or roles that prepare, advise, review, or provide an external input |
| Schedule rule | Fixed external date, relative to milestone, dependency-driven, suggested window, recurring, or manual |
| Anchor | Referenced application, aid, school, scholarship, recruiting, or family milestone |
| Offset/window | Default lead time or suggested work window |
| Calculated due date | System-generated date before a user override |
| Due date | Effective deadline used by views and overdue logic |
| Due-date source | Actual external date, round default, family target, suggested window, or manual |
| Date locked | Whether user intent prevents automatic rescheduling |
| Planned week | Week in which active work is expected, independent of the external deadline |
| Scheduled block | Optional fixed work block used to reduce context switching |
| Dependencies | Zero or more task IDs that must be completed first |
| Compression rule | Whether and how the task may be accelerated in a shorter plan |
| Priority | At minimum Critical, High, Normal, or Low |
| Status | At minimum Not Started, Ready, In Progress, Waiting, Blocked, Complete, or Skipped |
| Normal effort | Baseline active-work estimate |
| Parent-adjusted effort | Adjusted estimate for parent-owned work |
| Effort override | Optional task-specific estimate that takes precedence over the configured role multiplier |
| Deliverable | Evidence or output that defines completion |
| Resource links | Official or authoritative references where applicable |
| Assistant support | None, Research, Draft, Review, or Mostly Prepare |
| Professional help | None, Optional, Recommended, or Required |
| Decision needed | Whether parent or student judgment is blocking progress |
| Notes/outcome | Short context, response, or completion note |
| Completion source | Manual confirmation or the canonical tracker field that supplied reliable evidence |
| Completed date | Recorded when a task is completed |

### Resource Source Rules

Task links should prioritize primary, authoritative sources:

- each college's admissions, financial-aid, scholarship, honors, and program
  pages;
- each college's official net-price calculator;
- Common App and the college's application portal;
- official FAFSA and CSS Profile guidance;
- school counselor and transcript-process instructions;
- official team rosters, recruiting questionnaires, meet results, and
  conference results; and
- the Common Data Set where it answers an admissions or affordability
  question.

College Board BigFuture and carefully selected third-party research may help
with discovery or comparison. Third-party chancing estimates must be labeled
as estimates and must not override official deadlines, costs, requirements, or
coach communication.

### Effort Estimation And Role Totals

- Normal effort and parent-adjusted effort must be stored separately.
- The parent effort multiplier must be configurable. A `2.0` multiplier is a
  planning hypothesis from the source conversation, not a cap or a reason to
  omit work.
- A user may override the adjusted estimate for an individual task when the
  multiplier is inaccurate.
- The adjustment applies only to parent work, not student, counselor, or
  assistant-prepared work.
- Assistant preparation should reduce the remaining active effort estimate
  only when the plan identifies a concrete prepared deliverable.
- Shared-task effort must either be allocated by role or clearly reported as a
  separate Shared total; it must not be silently counted in full for both
  Student and Parent.
- Weekly effort must be based on the planned work week, not only the external
  due date.
- The complete plan for the selected horizon must report:
  - total hours by Student, Parent, Counselor/Professional, and Shared;
  - average hours per week by role over the planning period;
  - effort by planning stage and workstream;
  - planned effort by role for every week;
  - the peak week for each role;
  - effort not yet assigned to a planned week;
  - the effect of assistant or professional preparation; and
  - the incremental effort associated with each active college.
- The system must not enforce a default weekly ceiling or silently reschedule,
  drop, or downgrade tasks to make the totals appear manageable.
- After the baseline is reviewed, users may optionally set their own planning
  thresholds and use them to identify weeks requiring scope reduction,
  reassignment, earlier work, or paid help.

## Status And Dependency Behavior

- The standard statuses are:
  - `Not Started`: applicable but not yet available or selected for work;
  - `Ready`: dependencies are complete and work can begin;
  - `In Progress`: active work has begun;
  - `Waiting`: an external response, document, or event is pending;
  - `Blocked`: progress cannot continue and intervention is required;
  - `Complete`: the defined deliverable or reliable tracker evidence is
    satisfied; and
  - `Skipped`: intentionally not completed, with a required reason.
- The standard priorities are:
  - `Critical`: an external deadline, critical-path dependency, or severe
    consequence requires immediate protection;
  - `High`: important near-term work with meaningful admission, affordability,
    or recruiting value;
  - `Normal`: planned work with adequate schedule margin; and
  - `Low`: useful work that may be deferred or removed before higher-value
    tasks.
- The system may suggest priority from external deadlines, critical-path
  dependencies, and consequences, while allowing a user to override it.
- A task is overdue when its due date has passed and its status is not
  `Complete` or `Skipped`.
- A task is blocked when an incomplete dependency prevents useful work or when
  the owner explicitly marks it blocked.
- A task is ready when its dependencies are complete and work may begin.
- `Waiting` means an external response or document is pending and should
  include the party or event being awaited.
- Completing a task records the completion date and may make dependent tasks
  ready.
- When a reliable canonical tracker field proves completion, the task may be
  marked complete automatically and must show the evidence source. When
  evidence is incomplete or ambiguous, the system should suggest completion
  and let the user confirm it manually.
- A user may manually confirm or correct a derived status. The task must retain
  whether completion was derived or user-confirmed.
- Skipping a task requires a short reason such as `Not required by school`,
  `Testing removed from plan`, or `College removed from list`.
- Changing an upstream deadline must make affected downstream dates or
  conflicts visible; it must not silently overwrite user-edited due dates.
- Replanning must present a before-and-after preview before changing active
  task dates, owners, applicability, or dependencies.
- Completed tasks, manually locked dates, manual ownership changes, notes, and
  evidence are preserved during regeneration.
- Regeneration must be idempotent: rerunning the same configuration must not
  create duplicate task instances.
- Recurring templates should generate individual task instances only within
  the rolling 90-day window. This preserves weekly completion history without
  filling a multi-year roadmap with every future occurrence.

## Required Views

### Master Plan

The complete, filterable roadmap for the family's selected horizon. It must
support sorting and filtering by owner, module, workstream, planning stage,
college, due date, status, priority, assistant support, and professional-help
level.

### Rolling Ninety Days

A generated view of applicable work planned or due within the next 90 days,
plus overdue tasks and later tasks that already block near-term work. For the
current family, this view is initially the primary project plan. For a family
starting earlier, it is the active slice of a longer roadmap.

### This Week

The primary operating view should normally contain only 5-10 current actions.
It must include:

- overdue tasks;
- tasks due this week;
- high-priority tasks due within 21 days;
- blocked tasks requiring action;
- decisions needed from the current user; and
- tasks deliberately selected for the week.

### Owner Views

At minimum:

- Student work;
- each configured Parent/Guardian's decisions and actions;
- each configured Counselor/Professional's work;
- Shared work; and
- external inputs being awaited.

The parent view should favor brief decision and verification tasks over
student-production tasks.

### College View

For one college, show application, affordability, recruiting, visit,
submission, and financial-aid tasks together with the college's relevant
existing tracker status.

### Effort Summary

Show normal and adjusted effort by owner, planning stage, module, workstream,
college, and week. The view must expose:

- total and average weekly hours by role;
- peak weeks and deadline clusters;
- unplanned or unassigned effort;
- tasks with no owner or planned week despite an approaching external
  deadline;
- the incremental effort associated with each college;
- how much effort remains after identified assistant or professional
  preparation; and
- optional user-defined threshold warnings, if the family chooses thresholds
  after reviewing the baseline plan.

The default view must report the work without judging it against a
preconfigured hour cap.

## Weekly Report Requirements

The system must produce one concise weekly college report containing:

1. tasks completed since the prior report;
2. tasks overdue;
3. decisions needed from the parent;
4. deadlines within 21 days;
5. coach responses or recruiting follow-ups when athletic recruiting is
   enabled;
6. current application status by college;
7. blocked or waiting tasks;
8. planned workload by owner for the next week; and
9. a short list of the next 5-10 actions.

The report must be understandable in 15 minutes or less. Its first release may
be an in-workbook view. Email delivery, scheduled generation, and calendar
integration are future enhancements unless separately approved.

The concise report review is separate from a 30-45 minute weekly Student/Parent
planning meeting used to confirm progress, remove blockers, and schedule the
next week's work.

## Core Workflows

### Initial Setup

1. Set the student's current grade, expected graduation year, planning start
   date, and application cycle.
2. Enter the working first-application target and any known school-specific
   deadlines.
3. Configure Student, Parent/Guardian, optional Counselor/Professional, and
   external-dependency roles.
4. Enable applicable modules such as athletic recruiting, testing, CSS Profile,
   visits, interviews, or portfolios.
5. Set effort-estimation assumptions, including any parent adjustment.
6. Leave weekly thresholds unset until the complete baseline plan is reviewed.
7. Enter the annual college budget and debt limit.
8. Generate a preview of the applicable master roadmap and rolling 90-day plan.
9. Review included and excluded modules, owners, fallback assignments, dates,
   and task counts before applying the plan.
10. Calculate total, average weekly, planning-stage, and peak-week effort by
    role.
11. Only then decide whether any tasks should move earlier, be reassigned,
    receive assistant/professional support, or be removed as low value.

### Reconfigure Timeline, Roles, Or Modules

1. Change a milestone, participating role, or enabled module.
2. Preview affected task additions, removals, reassignments, dates,
   dependencies, and effort totals.
3. Preserve completed tasks, locked dates, manual assignments, notes, and
   evidence.
4. Confirm the proposed changes.
5. Archive or skip no-longer-applicable tasks with a reason.
6. Rebuild the master, rolling 90-day, weekly, owner, and effort views.

### Add Or Remove A College

1. Add or remove the college through the existing canonical college-list flow.
2. Evaluate the three college-list guardrails.
3. Generate only applicable college-specific tasks.
4. Show the resulting workload change.
5. Preserve completed task history if the college is later removed.

### Weekly Planning

1. Review the generated weekly report.
2. Resolve parent decisions.
3. Confirm the student's selected work for the week.
4. Compare the coming week's work with the complete baseline and any thresholds
   the family chose after reviewing it.
5. Reassign, start earlier, reduce scope, or obtain help where appropriate.
6. Update blocked and waiting tasks.
7. Confirm that all external deadlines within 21 days have an owner and next
   action.

### Submission Readiness

Before an application is considered ready to submit, the task view should make
it possible to verify:

- student sections and essays are complete;
- factual information has been reviewed;
- required school documents and recommendations are received or on track;
- financial and affordability checks are complete;
- application fee or waiver is ready;
- the correct deadline is recorded; and
- post-submission portal and follow-up tasks exist.

The feature should report readiness; it must not submit the application.

## Representative Task Records

| ID | Task | Owner | Effort | Dependency | Deliverable |
|---|---|---|---:|---|---|
| `FIN-01` | Decide maximum annual parent contribution | Parent | 60 min adjusted | None | Written annual budget |
| `FIN-04` | Run official net-price calculator for a college | Parent | 45-75 min adjusted | Initial list | Saved dated estimate |
| `LIST-03` | Evaluate a college's business and entrepreneurship offerings | Student | 30 min | Initial list | Fit score and notes |
| `REC-02` | Assemble verified track and field marks | Student | 45 min | Meet records | Recruiting profile data |
| `REC-06` | Compare marks with roster and conference results | Student | 30 min | Recruiting list | Athletic-fit rating |
| `REC-09` | Edit and send personalized coach introduction | Student | 20 min | Profile and prepared draft | Sent email |
| `APP-07` | Complete Common App activities-section draft | Student | 90 min | Activity inventory | Completed draft |
| `ESS-03` | Select main essay topic from story inventory | Student | 60 min | Brainstorming | Chosen topic |
| `SUB-04` | Verify transcript and recommendations received | Student | 20 min | Submission | Portal confirmation |

These examples establish the required level of detail. The implementation
catalog must be reviewed separately before it is treated as authoritative for
a real application cycle.

## Functional Acceptance Criteria

The feature is acceptable when:

1. a family starting more than one year early can generate an applicable master
   roadmap and rolling 90-day plan without receiving premature submission
   tasks;
2. the current family can generate an accelerated plan through its October 31
   working target without receiving irrelevant long-horizon work;
3. every active task has a stable ID, owner, status, effort, and completion
   definition;
4. optional modules such as Athletic Recruiting are generated only when
   enabled;
5. required tasks receive valid fallback owners when an optional professional
   role is absent;
6. changing roles or modules previews the effect and preserves completed work,
   locked dates, notes, and manual assignments;
7. college-specific tasks are linked to the canonical college record;
8. removing or renaming a college does not corrupt unrelated tasks or erase
   completed history;
9. dependencies and blocked work are visible;
10. the rolling 90-day and weekly views show overdue, due-soon, blocked, and
    decision-needed work;
11. workload totals use adjusted effort for parent tasks and report total,
    average weekly, planning-stage, and peak-week effort by role without
    imposing a default cap;
12. the weekly report contains all required sections and can be reviewed in 15
   minutes or less;
13. existing tracker data is not duplicated into a second independently edited
    source of truth;
14. the system works with or without a counselor;
15. student-owned application and recruiting work remains assigned to the
    student even when an assistant prepares research or a draft;
16. high-value senior-year work is included while admissions-only profile
    building and indiscriminate small-scholarship work are excluded;
17. the plan makes separate application, merit/honors, financial-aid, and
    recruiting deadlines visible for each applicable college;
18. `This Week` is a separate generated tab that refreshes automatically where
    practical and can always be refreshed manually;
19. custom owners retain a standard role category for fallback logic and
    reporting;
20. coach outreach, responses, follow-ups, questionnaires, and notes have one
    canonical home in the conditional `Recruiting Tracker`;
21. recurring tasks preserve individual completion history without generating
    occurrences beyond the rolling 90-day window; and
22. no printable or exported task-plan report is required for the first
    release.

## Preservation And Safety Requirements

- Existing workbook data, formulas, notes, named ranges, and tracker details
  must be preserved during setup, repair, refresh, sorting, and college-list
  changes.
- A setup or repair flow must not replace user-edited tasks with newer template
  text solely because the catalog changed.
- Template updates must distinguish system-owned fields from user-owned status,
  notes, dates, and deliverables.
- Broad workbook repairs must remain rerunnable and idempotent.
- Task identifiers must not rely on row number or mutable task text.
- New sheets must follow the repository's tracker/helper convention: headers
  on row 1 and data beginning on row 2.
- Live-sheet verification in a copied Google Sheet is required before release;
  the Node harness alone cannot prove filtering, formulas, validations, UI,
  triggers, or preservation in the real workbook.

## Measures Of Success

Initial success measures:

- the parent can identify required decisions and actions in 15 minutes or less
  each week;
- the family knows the calculated selected-horizon total, rolling 90-day total,
  weekly average, and peak-week effort for all configured roles;
- the generated plan contains only applicable role and module work;
- all deadlines within 21 days have a visible owner and next action;
- no active college lacks affordability, academic-fit, and
  attend-without-track review;
- student-owned work is not reassigned to the parent by default;
- overdue and blocked tasks are visible without checking multiple sheets;
- adding a college exposes the incremental workload before the list is
  approved;
- every serious college has a dated official net-price estimate and its
  application, aid, merit, honors, and recruiting requirements identified; and
- the plan does not hide required work merely because a role's calculated
  effort is high.

## Decision Record

| # | Status | Decision |
|---:|---|---|
| 1 | Resolved | `This Week` is a separate generated tab that updates automatically where practical and includes a manual refresh path. |
| 2 | Resolved | Use one standard `Counselor/Professional` category. A parent can delegate to named custom owners when the family has both a counselor and another consultant. |
| 3 | Resolved | Allow custom owner names while retaining standard role categories for defaults and reporting. |
| 4 | Delegated design | Assign the correct scheduling rule to each task while building the catalog: authoritative fixed dates first, then milestone offsets, dependency scheduling, or suggested windows as appropriate. |
| 5 | Resolved | Use `Not Started`, `Ready`, `In Progress`, `Waiting`, `Blocked`, `Complete`, and `Skipped`; use `Critical`, `High`, `Normal`, and `Low` priorities. |
| 6 | Resolved | Configure a parent effort multiplier and allow task-specific overrides. |
| 7 | Resolved | Add a conditional `Recruiting Tracker`; store coach outreach, responses, follow-ups, questionnaires, and notes there. |
| 8 | Resolved | Derive completion from reliable canonical tracker data and let users confirm or correct it manually. |
| 9 | Delegated design | Generate individual recurring-task instances only within the rolling 90-day window so history is preserved without filling a multi-year roadmap. |
| 10 | Needs final choice | Review the starter-catalog example below before approving the first catalog's breadth. |
| 11 | Needs final choice | Review planned-week versus fixed-block examples below. |
| 12 | Resolved | Do not add printable or exported reports in the first release. |
| 13 | Needs final choice | Review threshold-storage examples below. Thresholds remain unset until the baseline plan is calculated. |
| 14 | Rule resolved; dates pending | The earliest relevant deadline drives shared prerequisite work. Each task still uses its own most-specific milestone. FAFSA public availability is currently planned for October 1, 2026; actual state, college, merit, and application deadlines must be loaded before final scheduling. |

## Concrete Examples For Remaining Choices

### Decision 10: Starter Catalog Breadth

This is an illustrative excerpt, not the final task catalog:

| Template | Module | Example task | Applicability |
|---|---|---|---|
| `PLAN-01` | Core | Confirm application cycle, planning start, and known deadlines | Every family |
| `STRAT-01` | Core | Set annual contribution and borrowing limits | Every family |
| `LIST-01` | Core | Define academic, affordability, geography, and fit criteria | Every family |
| `COL-01` | Core | Evaluate one college against the family criteria | Per active college |
| `FIN-01` | Core | Run and save the official net-price calculator result | Per serious college |
| `APP-01` | Application | Complete the Common App base profile | Common App users |
| `APP-02` | Application | Draft activities and honors sections | Application-stage families |
| `REC-01` | Recommendations | Request teacher recommendations and supply requested materials | When recommendations apply |
| `ESS-01` | Essays | Build story inventory and draft the personal statement | When an essay applies |
| `ESS-02` | Essays | Draft and revise one required supplemental essay | Per required supplement |
| `SUB-01` | Submission | Audit the generated application PDF and confirm receipt after submission | Per application |
| `AID-01` | Financial Aid | Prepare FAFSA contributors, accounts, and source documents | Families seeking aid |
| `CSS-01` | CSS Profile | Prepare and submit required CSS Profile information | Only CSS schools/families |
| `TEST-01` | Testing | Decide testing and score-submission strategy | Testing module enabled |
| `ATH-01` | Athletic Recruiting | Assemble verified marks, results, profile, and media | Athletic Recruiting enabled |
| `ATH-02` | Athletic Recruiting | Send and track personalized coach outreach | Per recruiting college |
| `VISIT-01` | Visits | Plan and document a high-value visit or virtual event | Visits module enabled |

Two plausible first-release choices:

1. **Core-first:** ship Core, Application, Recommendations, Essays, Financial
   Aid, and Submission; defer optional modules.
2. **Complete adaptive catalog:** ship the core catalog plus Athletic
   Recruiting, Testing, CSS Profile, and Visits, with setup filtering out
   irrelevant modules.

Recommendation: use the complete adaptive catalog because Athletic Recruiting
is required for the current family and filtering prevents irrelevant work from
appearing for other families.

### Decision 11: Planned Week Versus Fixed Work Block

**Planned-week example**

`Draft activities section` is planned for the week of August 3 with an
estimated effort of three hours. The family chooses the actual work time.

Advantages:

- less setup and maintenance;
- tolerates changing family schedules; and
- sufficient for weekly effort reporting.

Limitation: it does not reserve actual time, so a busy week may still become
overcommitted.

**Fixed-block example**

The same task is scheduled for Sunday from 9:00 a.m. to noon.

Advantages:

- converts intent into reserved time;
- exposes collisions between tasks; and
- may reduce context switching.

Limitations:

- requires more ongoing maintenance;
- becomes stale when personal calendars change; and
- is not a true calendar integration.

Recommendation: require `Planned Week` and effort in the first release. Keep
`Scheduled Block` optional for families that want more precision; do not build
a calendar scheduler yet.

### Decision 13: Optional Threshold Storage

Thresholds are planning warnings, not task caps.

| Choice | Example | Tradeoff |
|---|---|---|
| One global threshold | Warn when total family work exceeds 18 hours in a week | Simple, but can hide that one person carries most of the work |
| Threshold by role | Parent 8 hours, Student 12 hours, Professional 4 hours | Makes ownership pressure visible but assumes fairly stable weeks |
| Threshold by individual week | Parent normally 8 hours, but 3 hours during a travel week | Most realistic, but requires more setup |

Recommendation: after the baseline plan is calculated, allow optional
role-level thresholds with optional overrides for individual weeks. Do not use
a global family threshold by itself.

### Decision 14: Earliest-Deadline Example

Assume these illustrative milestones:

- October 1: FAFSA is expected to become publicly available;
- October 15: College A institutional-merit deadline that requires a completed
  application;
- November 1: College B Early Action deadline; and
- January 5: College C Regular Decision deadline.

The schedule should behave as follows:

- shared Common App, activities, recommendations, and personal-statement work
  needed by College A schedules backward from October 15;
- College A's supplement and submission audit use October 15;
- College B's supplement and submission audit use November 1;
- College C's college-specific work can remain later unless it blocks shared
  work;
- FAFSA contributor/account/document preparation schedules before October 1;
  and
- FAFSA completion schedules after public release but before the earliest
  applicable state or college priority-aid deadline.

Therefore, no single date drives the entire project. The earliest applicable
deadline drives each shared critical path, while task-specific work retains its
own anchor.

## Follow-On Work After Approval

After the requirements are corrected and approved:

1. reconcile `project-docs/plans/backlog.md` with the new product direction;
2. write and review the complete value-selected starter task catalog;
3. define horizon, module, role, fallback-owner, and scheduling metadata for
   every template;
4. instantiate it against a realistic college list and calculate total,
   average weekly, planning-stage, and peak-week effort by role;
5. review the resulting work before choosing scope, delegation, or optional
   weekly thresholds;
6. decide the canonical sheet and dashboard presentation;
7. produce an implementation plan with schema, ownership, migration, repair,
   and test details;
8. prototype the weekly report and effort summary; and
9. validate both a more-than-one-year family and the current accelerated
   rising-senior scenario before implementation.
