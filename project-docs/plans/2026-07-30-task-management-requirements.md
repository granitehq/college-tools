# College Task Management Requirements Specification

**Status:** Draft for review, revision 2

**Date:** 2026-07-30

**Feature:** College application task management and weekly command center

**Product:** `college-tools`

## Purpose

Add a task-management layer to `college-tools` that turns the college
application process into a structured, owner-aware 90-day plan. For the current
rising-senior scenario, the project objective is:

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

The college process is expected to contain approximately 70-100 meaningful
tasks across strategy, research, affordability, testing, recommendations,
applications, essays, athletic recruiting, visits, submission, and financial
aid. The existing workbook tracks colleges, deadlines, financial aid, visits,
and application status, but it is not a project-management system for the work
required to reach those outcomes.

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
5. **Estimate before constraining.** The first complete plan must calculate the
   work required by role and week without suppressing, deferring, or removing
   valuable work to fit a predetermined hour limit. Capacity decisions come
   after the family reviews that baseline.
6. **Tasks must be applicable and actionable.** Do not pad the plan with filler
   or create tasks for testing, CSS Profile, interviews, visits, or recruiting
   when those activities do not apply.
7. **Each college must justify its workload.** The system should support the
   family's chosen list size, show the incremental work created by each school,
   and make it easy to remove schools that are unaffordable, poor fits, or not
   worth attending without track.
8. **Support is separate from ownership.** An assistant can prepare research
   or drafts and a professional can advise, while the task still belongs to
   the student or parent.
9. **Prioritize high-value senior-year work.** Applications, affordability,
   essays, recruiting, recommendations, and submission readiness take priority
   over adding new extracurriculars, starting an admissions-only passion
   project, or chasing many low-value scholarships.
10. **College and estate work remain separate.** This feature is a college
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
90-day plan is built. The plan should first calculate the work that is worth
doing, then show the parent total, weekly average, and peak weeks so the family
can make an informed scope or delegation decision.

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

## Scope

### In Scope

- A master 90-day college task plan.
- A value-selected task catalog expected to produce approximately 70-100
  applicable tasks for a typical application process.
- One-time, recurring, and college-specific tasks.
- Student, Parent, Counselor/Professional, and Shared ownership.
- Dependencies, deadlines, priorities, effort, status, deliverables, and
  authoritative resource links.
- Separate normal and parent-adjusted effort estimates.
- Assistant-preparation and professional-help indicators.
- Total, phase, and weekly effort summaries by role.
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

## Planning Model

### Ninety-Day Phases

The initial plan should organize tasks into four overlapping phases. Workstreams
such as recruiting, affordability, and essays may span multiple phases.

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

Phase boundaries should be configurable because actual dates depend on the
application cycle and school deadlines.

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

The total active task count is expected to land around 70-100 after
non-applicable work is removed and school-specific work is instantiated. This
is an expected result, not a minimum or maximum. The value and necessity of a
task determine whether it belongs in the plan.

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

Adding a college should clearly show which new tasks are created. Removing a
college should not silently delete completed history; related open tasks should
be archived or marked no longer applicable.

## Task Data Requirements

Every task must support:

| Field | Requirement |
|---|---|
| Task ID | Stable, unique identifier that does not change when task text or sorting changes |
| Workstream | One of the defined catalog workstreams |
| Phase | One of the four 90-day phases |
| Task | Specific action written with a verb and a clear completion point |
| College | Optional link for college-specific tasks |
| Owner | Student, Parent, Counselor/Professional, or Shared |
| Due date | Required when the task is deadline-driven; otherwise schedulable |
| Planned week | Week in which active work is expected, independent of the external deadline |
| Scheduled block | Optional fixed work block used to reduce context switching |
| Dependencies | Zero or more task IDs that must be completed first |
| Priority | At minimum Critical, High, Normal, or Low |
| Status | At minimum Not Started, Ready, In Progress, Waiting, Blocked, Complete, or Skipped |
| Normal effort | Baseline active-work estimate |
| Parent-adjusted effort | Adjusted estimate for parent-owned work |
| Deliverable | Evidence or output that defines completion |
| Resource links | Official or authoritative references where applicable |
| Assistant support | None, Research, Draft, Review, or Mostly Prepare |
| Professional help | None, Optional, Recommended, or Required |
| Decision needed | Whether parent or student judgment is blocking progress |
| Notes/outcome | Short context, response, or completion note |
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
- The parent effort adjustment must be configurable. A `2.0` multiplier is a
  planning hypothesis from the source conversation, not a cap or a reason to
  omit work.
- The adjustment applies only to parent work, not student, counselor, or
  assistant-prepared work.
- Assistant preparation should reduce the remaining active effort estimate
  only when the plan identifies a concrete prepared deliverable.
- Shared-task effort must either be allocated by role or clearly reported as a
  separate Shared total; it must not be silently counted in full for both
  Student and Parent.
- Weekly effort must be based on the planned work week, not only the external
  due date.
- The first complete plan must report:
  - total hours by Student, Parent, Counselor/Professional, and Shared;
  - average hours per week by role over the planning period;
  - effort by phase and workstream;
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

- A task is overdue when its due date has passed and its status is not
  `Complete` or `Skipped`.
- A task is blocked when an incomplete dependency prevents useful work or when
  the owner explicitly marks it blocked.
- A task is ready when its dependencies are complete and work may begin.
- `Waiting` means an external response or document is pending and should
  include the party or event being awaited.
- Completing a task records the completion date and may make dependent tasks
  ready.
- Skipping a task requires a short reason such as `Not required by school`,
  `Testing removed from plan`, or `College removed from list`.
- Changing an upstream deadline must make affected downstream dates or
  conflicts visible; it must not silently overwrite user-edited due dates.

## Required Views

### Master Plan

The complete, filterable 90-day task list. It must support sorting and
filtering by owner, workstream, phase, college, due date, status, priority,
assistant support, and professional-help level.

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
- Parent decisions and actions;
- Counselor/Professional work; and
- Shared work.

The parent view should favor brief decision and verification tasks over
student-production tasks.

### College View

For one college, show application, affordability, recruiting, visit,
submission, and financial-aid tasks together with the college's relevant
existing tracker status.

### Effort Summary

Show normal and adjusted effort by owner, phase, workstream, college, and week.
The view must expose:

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
5. coach responses or recruiting follow-ups;
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

1. Set cycle start date and target application season.
2. Confirm Student, Parent, and optional Counselor/Professional roles.
3. Set effort-estimation assumptions, including any parent adjustment.
4. Leave weekly thresholds unset until the complete baseline plan is reviewed.
5. Enter the annual college budget and debt limit.
6. Confirm whether testing, athletic recruiting, visits, interviews, CSS
   Profile, and paid support are in scope.
7. Generate the applicable starter plan.
8. Review and remove non-applicable tasks before dates are finalized.
9. Calculate total, average weekly, phase, and peak-week effort by role.
10. Only then decide whether any tasks should move earlier, be reassigned,
    receive assistant/professional support, or be removed as low value.

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

1. a user can generate an applicable 90-day plan for the selected colleges
   without receiving obvious filler tasks;
2. every active task has a stable ID, owner, status, effort, and completion
   definition;
3. conditional task groups can be omitted without breaking the plan;
4. college-specific tasks are linked to the canonical college record;
5. removing or renaming a college does not corrupt unrelated tasks or erase
   completed history;
6. dependencies and blocked work are visible;
7. the weekly view shows overdue, due-soon, blocked, and decision-needed work;
8. workload totals use adjusted effort for parent tasks and report total,
   average weekly, phase, and peak-week effort by role without imposing a
   default cap;
9. the weekly report contains all required sections and can be reviewed in 15
   minutes or less;
10. existing tracker data is not duplicated into a second independently edited
    source of truth;
11. the system works with or without a counselor; and
12. student-owned application and recruiting work remains assigned to the
    student even when an assistant prepares research or a draft;
13. high-value senior-year work is included while admissions-only profile
    building and indiscriminate small-scholarship work are excluded; and
14. the plan makes separate application, merit/honors, financial-aid, and
    recruiting deadlines visible for each applicable college.

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
- the family knows the calculated 90-day total, weekly average, and peak-week
  effort for Student, Parent, Counselor/Professional, and Shared work;
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

## Open Decisions For Review

1. Should the canonical data live in one new `Tasks` sheet, and should `This
   Week` be a separate generated sheet or a section of `Dashboard`?
2. Should `Counselor/Professional` be one owner value or two distinct roles?
3. Should users be allowed to add custom owner names while retaining the four
   standard owner categories?
4. Should task dates be generated backward from each college's application
   deadline, forward from the 90-day start date, or by a hybrid rule?
5. Which task statuses and priority labels should appear in dropdowns?
6. Should parent-adjusted effort use one configurable multiplier, per-task
   estimates, or both?
7. Should coach responses be stored as task notes, linked to a future
   recruiting tracker, or summarized from another canonical field?
8. How much of application readiness should be derived automatically from
   existing trackers versus confirmed manually?
9. Should recurring weekly review tasks be generated as individual records or
   represented as one recurring checklist?
10. Which value-selected starter tasks belong in the first catalog? The full
    seed catalog needs its own content review before implementation.
11. Should version-one effort planning include fixed weekly time blocks, or
    only planned weeks and effort totals?
12. Does the first release need printable or exportable weekly reports, even if
    scheduled email is deferred?
13. After the baseline plan is calculated, should optional weekly thresholds be
    stored globally, by role, or by individual week?
14. What is the target submission date for the first real plan, and which
    Early Decision, Early Action, and priority scholarship deadlines must drive
    backward planning?

## Follow-On Work After Approval

After the requirements are corrected and approved:

1. reconcile `project-docs/plans/backlog.md` with the new product direction;
2. write and review the complete value-selected starter task catalog;
3. instantiate it against a realistic college list and calculate total,
   average weekly, phase, and peak-week effort by role;
4. review the resulting work before choosing scope, delegation, or optional
   weekly thresholds;
5. decide the canonical sheet and dashboard presentation;
6. produce an implementation plan with schema, ownership, migration, repair,
   and test details;
7. prototype the weekly report and effort summary; and
8. validate the design against a realistic rising-senior application scenario
   before implementation.
