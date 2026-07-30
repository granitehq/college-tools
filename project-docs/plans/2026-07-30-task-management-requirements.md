# College Task Management Requirements Specification

**Status:** Draft for review

**Date:** 2026-07-30

**Feature:** College application task management and weekly command center

**Product:** `college-tools`

## Purpose

Add a task-management layer to `college-tools` that turns the college
application process into a structured, owner-aware 90-day plan. The feature
must reduce the parent's coordination burden, make student ownership visible,
and present a short weekly action list instead of requiring the family to
reconstruct status across sheets, email, application portals, and
conversations.

This document defines product requirements. It does not yet prescribe a
task-by-task implementation plan or final sheet layout.

## Problem Statement

The college process contains approximately 60-100 meaningful tasks across
strategy, research, affordability, testing, recommendations, applications,
essays, athletic recruiting, visits, submission, and financial aid. The
existing workbook tracks colleges, deadlines, financial aid, visits, and
application status, but it is not a project-management system for the work
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
5. keep the college list and weekly workload within explicit capacity limits;
   and
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
5. **Capacity is a constraint, not a suggestion.** When work exceeds the
   configured limit, the system should expose the overload so the user can
   reduce scope, reassign work, or obtain help.
6. **Tasks must be applicable and actionable.** Do not pad the plan with filler
   or create tasks for testing, CSS Profile, interviews, visits, or recruiting
   when those activities do not apply.
7. **The college list is intentionally small.** The planning model assumes
   8-10 colleges, normally 3 likely/affordable, 3-4 target, and 2-3 reach
   schools.
8. **Support is separate from ownership.** An assistant can prepare research
   or drafts and a professional can advise, while the task still belongs to
   the student or parent.
9. **College and estate work remain separate.** This feature is a college
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
- final approval of the 8-10-college list;
- sensitive parent financial information and parent-controlled aid forms;
- application fees and other payments;
- factual and financial verification before submission;
- major deadline oversight; and
- decisions or external actions that require parental authority.

The parent's weekly college-work ceiling is 4-6 hours. With heavy use of
prepared research, drafting, comparisons, and task planning, the desired
operating target is 2.5-4 hours per week.

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
- Approximately 60-100 applicable tasks for a typical 8-10-college process.
- One-time, recurring, and college-specific tasks.
- Student, Parent, Counselor/Professional, and Shared ownership.
- Dependencies, deadlines, priorities, effort, status, deliverables, and
  authoritative resource links.
- Separate normal and parent-adjusted effort estimates.
- Assistant-preparation and professional-help indicators.
- Weekly workload totals and capacity warnings.
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

## Planning Model

### Ninety-Day Phases

The initial plan should organize tasks into four phases:

1. **Days 1-14: Establish structure**
   - set budget and debt limits;
   - configure roles and weekly capacity;
   - assemble student records and activity history;
   - decide whether targeted professional help is needed;
   - contact the school counselor; and
   - complete an SAT or ACT diagnostic if testing is still in scope.

2. **Days 15-30: Approve the strategy**
   - build and evaluate the initial college list;
   - assess academic, financial, and athletic fit;
   - create the recruiting profile and coach targets;
   - request recommendations;
   - start the main essay; and
   - approve the final 8-10 colleges.

3. **Days 31-60: Execute and monitor**
   - complete Common App sections;
   - refine activities and honors;
   - draft and revise essays;
   - complete recruiting questionnaires and follow-ups; and
   - resolve financial or strategic decisions while monitoring weekly status.

4. **Days 61-90: Verify and submit**
   - run application audits;
   - verify transcripts and recommendations;
   - complete parent-controlled financial-aid sections;
   - pay fees and submit;
   - confirm portal access and receipt; and
   - track follow-up requirements.

Phase boundaries should be configurable because actual dates depend on the
application cycle and school deadlines.

### College-List Guardrails

Each active college should record whether it passes these three tests:

1. plausibly affordable;
2. supports the student's academic interests; and
3. offers a realistic athletic opportunity or is worth attending without the
   sport.

The task system should warn when the active list exceeds 10 colleges. It should
not block a larger list, but it should show the extra task and workload impact.

## Task Catalog Requirements

The starter catalog should cover the following workstreams. Counts are planning
ranges, not quotas.

| Workstream | Typical task count | Representative deliverables |
|---|---:|---|
| Family strategy | 6-8 | Budget, debt limit, geography, school-size and academic priorities |
| Student profile | 6-8 | Transcript review, resume, activities, awards, interests |
| College research | 10-12 | Initial list, program review, outcomes, campus fit |
| Affordability | 10-12 | Net-price estimates, merit rules, financial safeties, four-year cost |
| Testing | 5-7 | Diagnostic, test decision, registration, preparation, score policy |
| Recommendations and school records | 6-8 | Counselor meeting, teacher requests, brag sheet, transcript process |
| Common App | 8-10 | Profile, education, activities, honors, additional information |
| Essays | 8-12 | Story inventory, topic, outline, drafts, revisions, supplements |
| Athletic recruiting | 10-15 | Verified marks, athletic profile, targets, emails, questionnaires |
| Visits and demonstrated interest | 4-6 | Virtual events, selected visits, interviews, admissions contacts |
| Submission and financial aid | 8-10 | Application audit, submission, portals, FAFSA, CSS, scholarships |

The total active task count should normally land between 60 and 100 after
non-applicable work is removed. This is a target range, not a hard cap; school-
specific supplements or requirements may create additional legitimate tasks.

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

### Effort And Capacity Rules

- Normal effort and parent-adjusted effort must be stored separately.
- The initial parent effort multiplier should be configurable and default to
  `2.0`.
- The multiplier applies only to parent work, not student, counselor, or
  assistant-prepared work.
- Weekly totals must avoid double-counting shared tasks.
- The system must show planned hours by owner and week.
- Weekly capacity must be based on the planned work week, not only the external
  due date.
- The parent target is 2.5-4 hours per week, with a hard warning above 6 hours.
- The student planning target is approximately 8-10 hours per week.
- The feature should not silently move work to later weeks to eliminate an
  overload warning.

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

### Capacity View

Show planned normal and adjusted hours by owner and week, with visible warnings
for:

- parent work above 4 hours;
- parent work above the 6-hour hard ceiling;
- student work above 10 hours;
- a college list above 10 active schools; and
- tasks with no owner or due date despite an approaching external deadline.

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

## Core Workflows

### Initial Setup

1. Set cycle start date and target application season.
2. Confirm Student, Parent, and optional Counselor/Professional roles.
3. Set parent and student weekly capacity.
4. Set the parent effort multiplier.
5. Enter the annual college budget and debt limit.
6. Confirm whether testing, athletic recruiting, visits, interviews, CSS
   Profile, and paid support are in scope.
7. Generate the applicable starter plan.
8. Review and remove non-applicable tasks before dates are finalized.

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
4. Reassign or obtain help for overloaded work.
5. Update blocked and waiting tasks.
6. Confirm that all external deadlines within 21 days have an owner and next
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

1. a user can generate an applicable 90-day plan for 8-10 colleges without
   receiving obvious filler tasks;
2. every active task has a stable ID, owner, status, effort, and completion
   definition;
3. conditional task groups can be omitted without breaking the plan;
4. college-specific tasks are linked to the canonical college record;
5. removing or renaming a college does not corrupt unrelated tasks or erase
   completed history;
6. dependencies and blocked work are visible;
7. the weekly view shows overdue, due-soon, blocked, and decision-needed work;
8. workload totals use adjusted effort for parent tasks and show capacity
   warnings;
9. the weekly report contains all required sections and can be reviewed in 15
   minutes or less;
10. existing tracker data is not duplicated into a second independently edited
    source of truth;
11. the system works with or without a counselor; and
12. student-owned application and recruiting work remains assigned to the
    student even when an assistant prepares research or a draft.

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
- parent-planned work normally remains at or below 4 hours per week;
- all deadlines within 21 days have a visible owner and next action;
- no active college lacks affordability, academic-fit, and
  attend-without-track review;
- student-owned work is not reassigned to the parent by default;
- overdue and blocked tasks are visible without checking multiple sheets; and
- adding a college exposes the incremental workload before the list is
  approved.

## Open Decisions For Review

1. Should the canonical data live in one new `Tasks` sheet, and should `This
   Week` be a separate generated sheet or a section of `Dashboard`?
2. Should `Counselor/Professional` be one owner value or two distinct roles?
3. Should users be allowed to add custom owner names while retaining the four
   standard owner categories?
4. Should task dates be generated backward from each college's application
   deadline, forward from the 90-day start date, or by a hybrid rule?
5. Which task statuses and priority labels should appear in dropdowns?
6. Should the parent effort multiplier default to `2.0`, or should setup require
   the user to choose it?
7. Should coach responses be stored as task notes, linked to a future
   recruiting tracker, or summarized from another canonical field?
8. How much of application readiness should be derived automatically from
   existing trackers versus confirmed manually?
9. Should recurring weekly review tasks be generated as individual records or
   represented as one recurring checklist?
10. Which 60-100 starter tasks belong in the first catalog? The full seed
    catalog needs its own content review before implementation.
11. Should version-one capacity planning include fixed weekly time blocks, or
    only workload totals and warnings?
12. Does the first release need printable or exportable weekly reports, even if
    scheduled email is deferred?

## Follow-On Work After Approval

After the requirements are corrected and approved:

1. reconcile `project-docs/plans/backlog.md` with the new product direction;
2. write and review the complete starter task catalog;
3. decide the canonical sheet and dashboard presentation;
4. produce an implementation plan with schema, ownership, migration, repair,
   and test details;
5. prototype the weekly report and capacity view; and
6. validate the design against a realistic 8-10-college application scenario
   before implementation.
