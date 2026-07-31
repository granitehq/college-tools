/**
 * Adaptive task-management catalog, planner, preservation, and sheet tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'task-catalog.js',
  'task-planner.js',
  'task-management.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook} = harness;
const suite = new TestSuite();

function date(year, month, day) {
  return new Date(year, month - 1, day);
}

function baseConfig(deadline) {
  return {
    planningStartDate: date(2026, 7, 30),
    workingDeadline: deadline,
    fafsaAvailabilityDate: date(2026, 10, 1),
    parentEffortMultiplier: 2,
    counselorAvailable: false,
    roleNames: {
      Student: 'Avery',
      'Parent/Guardian': 'Parent',
    },
    modules: {
      Testing: false,
      'Athletic Recruiting': false,
      'CSS Profile': false,
      Visits: false,
      Interviews: false,
      'Portfolio/Audition': false,
    },
  };
}

function college(id, name, deadline, extra) {
  return Object.assign({
    id,
    collegeId: id,
    name,
    collegeName: name,
    applicationDeadline: deadline,
    aidDeadline: date(2026, 10, 15),
    meritDeadline: date(2026, 10, 20),
    transcriptDeadline: deadline,
    teacherRecDeadline: deadline,
    counselorRecDeadline: deadline,
    testScoreDeadline: deadline,
    supplementsRequired: true,
  }, extra || {});
}

function taskByTemplate(tasks, templateId, scopeId) {
  return tasks.find((task) => task.templateId === templateId &&
    (scopeId === undefined || task.scopeId === scopeId));
}

function setSetting(label, value) {
  const sheet = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS);
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    if (sheet.getRange(row, 1).getValue() === label) {
      sheet.getRange(row, 2).setValue(value);
      return;
    }
  }
  throw new Error(`Setting not found: ${label}`);
}

function columnOf(sheet, header, headerRow) {
  const headers = sheet.getRange(headerRow || 1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(header) + 1;
}

suite.test('catalog is exactly 100 unique validated implementation templates', () => {
  const validation = CollegeTools.TaskCatalog.validate();
  const templates = CollegeTools.TaskCatalog.getTemplates();
  const ids = templates.map((template) => template.templateId);

  suite.assert(validation.ok, `Catalog should validate: ${validation.errors.join(', ')}`);
  suite.assertEqual(validation.count, 100, 'Catalog should contain exactly 100 templates');
  suite.assertEqual(new Set(ids).size, 100, 'Every template ID should be unique');
  templates.forEach((template) => {
    suite.assert(template.ownerRole, `${template.templateId} should have an accountable role`);
    suite.assert(template.deliverable, `${template.templateId} should define completion`);
    suite.assert(template.effortMinutes > 0, `${template.templateId} should estimate effort`);
    suite.assertEqual(typeof template.offsetDays, 'number',
      `${template.templateId} should define a schedule`);
  });
});

suite.test('long-horizon plan includes a full roadmap without premature submission work', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2028, 1, 15);
  const result = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline),
    {colleges: [college('C1', 'Long Horizon University', deadline, {
      aidDeadline: date(2028, 1, 5),
      meritDeadline: date(2027, 12, 15),
      transcriptDeadline: deadline,
      teacherRecDeadline: deadline,
      counselorRecDeadline: deadline,
      testScoreDeadline: deadline,
    })]},
    today,
  );
  const views = CollegeTools.TaskPlanner.buildViews(result.tasks, today);

  suite.assert(result.ok, 'Long-horizon generation should succeed');
  suite.assert(taskByTemplate(result.tasks, 'PRO-08'),
    'Long-horizon family should receive feasible profile-gap review');
  suite.assert(taskByTemplate(result.tasks, 'SUB-03', 'C1'),
    'Full roadmap should retain eventual submission work');
  suite.assert(!views.rolling90.some((task) => task.templateId === 'SUB-03'),
    'Submission work should not appear prematurely in the rolling 90-day view');
  suite.assert(result.tasks.filter((task) => task.templateId === 'PM-01').length <= 14,
    'Recurring weekly reviews should be generated only inside 90 days');
});

suite.test('accelerated athlete plan applies modules, actual deadlines, FAFSA availability, and effort', () => {
  const today = date(2026, 7, 30);
  const workingDeadline = date(2026, 11, 1);
  const actualDeadline = date(2026, 10, 28);
  const config = baseConfig(workingDeadline);
  config.modules.Testing = true;
  config.modules['Athletic Recruiting'] = true;
  config.modules['CSS Profile'] = true;
  config.modules.Visits = true;
  config.modules.Interviews = true;
  config.modules['Portfolio/Audition'] = true;
  const context = {
    colleges: [college('C1', 'Athlete University', actualDeadline, {
      portfolioRequired: true,
      portfolioDeadline: date(2026, 10, 25),
      interviewRequired: true,
      interviewDate: date(2026, 10, 10),
    })],
    contacts: [{
      id: 'RC1', contactId: 'RC1', collegeId: 'C1',
      collegeName: 'Athlete University', label: 'Athlete University — Coach',
      nextFollowUp: date(2026, 8, 10),
    }],
    visits: [{
      id: 'C1', collegeId: 'C1', collegeName: 'Athlete University',
      label: 'Athlete University visit', visitDate: date(2026, 9, 1),
    }],
    interviews: [{
      id: 'C1', collegeId: 'C1', collegeName: 'Athlete University',
      label: 'Athlete University interview', interviewDate: date(2026, 10, 10),
    }],
  };
  const result = CollegeTools.TaskPlanner.generatePlan(config, context, today);
  const submit = taskByTemplate(result.tasks, 'SUB-03', 'C1');
  const fafsaAccess = taskByTemplate(result.tasks, 'AID-02');
  const fafsaSubmit = taskByTemplate(result.tasks, 'AID-06');
  const npc = taskByTemplate(result.tasks, 'AID-03', 'C1');

  suite.assert(result.ok, 'Accelerated athlete generation should succeed');
  ['TST-01', 'ATH-01', 'AID-08', 'VIS-01', 'VIS-05', 'PRT-01']
    .forEach((templateId) => {
      suite.assert(taskByTemplate(result.tasks, templateId),
        `${templateId} should be present when its module is enabled`);
    });
  suite.assertEqual(submit.dueDate.getTime(), actualDeadline.getTime(),
    'Actual college deadline should override the later working target');
  suite.assert(fafsaAccess.dueDate < config.fafsaAvailabilityDate,
    'FAFSA access preparation should precede availability');
  suite.assert(fafsaSubmit.dueDate >= config.fafsaAvailabilityDate,
    'FAFSA submission should not be scheduled before public availability');
  suite.assertEqual(npc.adjustedEffortMinutes, 120,
    'Parent multiplier should adjust parent-owned work');
  suite.assertEqual(taskByTemplate(result.tasks, 'ESS-06').ownerRole, 'Shared',
    'Professional-owned required work should fall back when no professional participates');
  suite.assertEqual(new Set(result.tasks.map((task) => task.taskId)).size, result.tasks.length,
    'Generated task instance IDs should be unique');
  result.tasks.forEach((task) => {
    suite.assert(task.taskId && task.owner && task.dueDate && task.deliverable,
      `${task.taskId} should have identity, owner, schedule, and deliverable`);
    suite.assert(task.adjustedEffortMinutes > 0, `${task.taskId} should have effort`);
  });
});

suite.test('disabled modules are excluded instead of requiring users to delete maximum-plan tasks', () => {
  const deadline = date(2026, 10, 28);
  const result = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline),
    {colleges: [college('C1', 'Core University', deadline)]},
    date(2026, 7, 30),
  );
  const prefixes = result.tasks.map((task) => task.templateId.split('-')[0]);

  suite.assert(!prefixes.includes('ATH'), 'Athletic tasks should not be instantiated');
  suite.assert(!prefixes.includes('TST'), 'Testing tasks should not be instantiated');
  suite.assert(!prefixes.includes('PRT'), 'Portfolio tasks should not be instantiated');
  suite.assert(!result.tasks.some((task) => task.templateId === 'AID-08'),
    'CSS tasks should not be instantiated');
});

suite.test('application-round defaults are labeled and used only when authoritative dates are absent', () => {
  const config = baseConfig(null);
  config.graduationYear = 2027;
  const context = {
    colleges: [college('C1', 'Round University', null, {
      applicationType: 'EA',
      aidDeadline: null,
      meritDeadline: null,
      transcriptDeadline: null,
      teacherRecDeadline: null,
      counselorRecDeadline: null,
      testScoreDeadline: null,
    })],
  };
  const result = CollegeTools.TaskPlanner.generatePlan(config, context, date(2026, 7, 30));
  const submission = taskByTemplate(result.tasks, 'SUB-03', 'C1');

  suite.assert(result.ok, 'A round default should make the draft schedule usable');
  suite.assertEqual(submission.dueDate.getTime(), date(2026, 11, 1).getTime(),
    'EA should use the labeled fall application-round default');
  suite.assert(submission.dateSource.includes('confirm manually'),
    'Derived round dates should explicitly require manual confirmation');
});

suite.test('reconfiguration preserves completed/manual work, locks, notes, and stable identity', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 10, 28);
  const config = baseConfig(deadline);
  config.modules['Athletic Recruiting'] = true;
  const context = {colleges: [college('C1', 'Stable University', deadline)]};
  const first = CollegeTools.TaskPlanner.generatePlan(config, context, today);
  const existing = first.tasks.map((task) => Object.assign({}, task));
  const locked = taskByTemplate(existing, 'AID-03', 'C1');
  locked.status = 'Complete';
  locked.notes = 'Verified with official calculator';
  locked.completionDate = date(2026, 8, 1);
  locked.owner = 'Custom Parent';
  locked.ownerLocked = true;
  locked.dueDate = date(2026, 8, 15);
  locked.dateLocked = true;
  const athletic = taskByTemplate(existing, 'ATH-01');
  athletic.status = 'Complete';
  athletic.notes = 'Marks verified';
  existing.push({
    taskId: 'MANUAL::1', templateId: '', task: 'Call school office',
    owner: 'Parent', ownerRole: 'Parent/Guardian', status: 'Ready',
    generated: false, dueDate: date(2026, 8, 5), dependencies: [],
  });

  const changedConfig = baseConfig(date(2026, 11, 15));
  const second = CollegeTools.TaskPlanner.generatePlan(changedConfig, context, today);
  const reconciled = CollegeTools.TaskPlanner.reconcile(second.tasks, existing);
  const preserved = reconciled.tasks.find((task) => task.taskId === locked.taskId);
  const archivedAthletic = reconciled.tasks.find((task) => task.taskId === athletic.taskId);

  suite.assertEqual(preserved.status, 'Complete', 'Completed state should survive regeneration');
  suite.assertEqual(preserved.notes, 'Verified with official calculator', 'Notes should survive');
  suite.assertEqual(preserved.owner, 'Custom Parent', 'Locked owner should survive');
  suite.assertEqual(preserved.dueDate.getTime(), date(2026, 8, 15).getTime(),
    'Locked due date should survive');
  suite.assertEqual(archivedAthletic.status, 'Complete',
    'Completed disabled-module task should remain a completed audit record');
  suite.assert(archivedAthletic.archivedReason,
    'Removed generated work should be archived with a reason');
  suite.assert(reconciled.tasks.some((task) => task.taskId === 'MANUAL::1'),
    'Manual tasks should survive regeneration');
  suite.assertEqual(new Set(reconciled.tasks.map((task) => task.taskId)).size,
    reconciled.tasks.length, 'Reconfiguration should never duplicate task instances');
});

suite.test('college rename keeps college-scoped task identity and user data through stable College ID', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 10, 28);
  const config = baseConfig(deadline);
  const original = CollegeTools.TaskPlanner.generatePlan(
    config, {colleges: [college('C1', 'Original University', deadline)]}, today);
  const existing = original.tasks.map((task) => Object.assign({}, task));
  const research = taskByTemplate(existing, 'COL-02', 'C1');
  research.notes = 'Preserve research notes';
  const renamed = CollegeTools.TaskPlanner.generatePlan(
    config, {colleges: [college('C1', 'Renamed University', deadline)]}, today);
  const reconciled = CollegeTools.TaskPlanner.reconcile(renamed.tasks, existing).tasks;
  const updated = reconciled.find((task) => task.taskId === research.taskId);

  suite.assert(updated.task.includes('Renamed University'),
    'Generated label should follow the renamed college');
  suite.assertEqual(updated.notes, 'Preserve research notes',
    'User data should remain attached to the stable College ID');
  suite.assertEqual(updated.taskId, 'COL-02::C1',
    'Task identity should not depend on the editable college name');
});

suite.test('dependencies calculate readiness and unblock after prerequisite completion', () => {
  const deadline = date(2026, 10, 28);
  const generated = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline),
    {colleges: [college('C1', 'Dependency University', deadline)]},
    date(2026, 7, 30),
  );
  let reconciled = CollegeTools.TaskPlanner.reconcile(generated.tasks, []).tasks;
  const outline = taskByTemplate(reconciled, 'ESS-03');
  const finalList = taskByTemplate(reconciled, 'COL-10');
  suite.assertEqual(outline.status, 'Not Started', 'Dependent task should not be Ready');
  suite.assert(outline.blockedBy.includes('ESS-02::GLOBAL'),
    'Dependent task should name its incomplete prerequisite');
  suite.assert(finalList.dependencies.includes('COL-09::C1'),
    'Global milestones should depend on every applicable college-scoped prerequisite');

  const brainstorm = taskByTemplate(reconciled, 'ESS-02');
  brainstorm.status = 'Complete';
  reconciled = CollegeTools.TaskPlanner.reconcile(generated.tasks, reconciled).tasks;
  suite.assertEqual(taskByTemplate(reconciled, 'ESS-03').status, 'Ready',
    'Completing prerequisites should make the dependent task Ready');
});

suite.test('reliable tracker evidence completes tasks while ambiguous evidence only suggests', () => {
  const deadline = date(2026, 10, 28);
  const context = {colleges: [college('C1', 'Evidence University', deadline, {
    submittedDate: date(2026, 10, 20),
    applicationStatus: 'Submitted',
    portal: 'https://portal.example',
    documentsComplete: true,
    testScoresSent: true,
    transcriptSent: true,
    recommendationsComplete: true,
    essaysComplete: true,
  })]};
  const generated = CollegeTools.TaskPlanner.generatePlan(
    Object.assign(baseConfig(deadline), {modules: {Testing: true}}),
    context,
    date(2026, 7, 30),
  );
  const applied = CollegeTools.TaskPlanner.applyEvidence(generated.tasks, context, date(2026, 10, 21));

  ['SUB-03', 'SUB-04', 'SUB-05', 'REC-07', 'ESS-10', 'TST-06'].forEach((templateId) => {
    const task = taskByTemplate(applied.tasks, templateId, 'C1');
    suite.assertEqual(task.status, 'Complete', `${templateId} should use reliable evidence`);
    suite.assert(task.evidenceSource, `${templateId} should record its evidence source`);
  });

  const ambiguousContext = {colleges: [college('C1', 'Evidence University', deadline, {
    portal: 'https://portal.example',
  })]};
  const ambiguous = CollegeTools.TaskPlanner.applyEvidence(
    generated.tasks, ambiguousContext, date(2026, 10, 21));
  suite.assert(ambiguous.suggestions.some((item) =>
    item.taskId === 'SUB-04::C1'), 'Portal-only evidence should require confirmation');
  suite.assertEqual(taskByTemplate(ambiguous.tasks, 'SUB-04', 'C1').status, 'Not Started',
    'Ambiguous evidence should not auto-complete a task');
});

suite.test('views cap current actions, report rolling work, and apply week-specific capacity overrides', () => {
  const week = date(2026, 8, 3);
  const tasks = [];
  for (let i = 0; i < 12; i++) {
    tasks.push({
      taskId: `T${i}`, templateId: 'TEST', task: `Task ${i}`, owner: 'Parent',
      ownerRole: 'Parent/Guardian', status: 'Ready', dueDate: date(2026, 8, 4),
      plannedWeek: week, adjustedEffortMinutes: 45, priority: 'Critical',
      decisionNeeded: false, manuallySelected: false, archivedReason: '',
    });
  }
  const constrained = CollegeTools.TaskPlanner.buildViews(tasks, date(2026, 8, 3), {
    roleThresholds: {'Parent/Guardian': 4},
  });
  suite.assertEqual(constrained.thisWeek.length, 10,
    'This Week should show only the next 5-10 actions');
  suite.assertEqual(constrained.rolling90.length, 12,
    'Rolling 90-day view should retain all current-horizon work');
  suite.assertEqual(constrained.capacityWarnings.length, 1,
    'Baseline threshold should identify an overloaded role/week');

  const overridden = CollegeTools.TaskPlanner.buildViews(tasks, date(2026, 8, 3), {
    roleThresholds: {'Parent/Guardian': 4},
    weeklyThresholdOverrides: {'Parent/Guardian': {'2026-08-03': 10}},
  });
  suite.assertEqual(overridden.capacityWarnings.length, 0,
    'A week-specific override should replace the baseline threshold for that week');
  suite.assertEqual(overridden.effortByOwner.Parent, 540,
    'Shared effort should be counted once per task, not duplicated across roles');
});

suite.test('sheet setup and generation create conditional, hidden, canonical, and generated views', () => {
  const {colleges} = setupWorkbook({});
  const setup = CollegeTools.TaskManagement.setupTaskManagement();
  const templates = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.TASK_TEMPLATES);
  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);

  suite.assertEqual(setup.templateCount, 100, 'Setup should render all 100 templates');
  suite.assert(templates.isSheetHidden(), 'Template sheet should be system-hidden');
  suite.assertEqual(tasks.getLastRow(), 1, 'Blank template should not preload family tasks');
  suite.assert(!mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER),
  'Recruiting Tracker should not exist while recruiting is disabled');

  setSetting('Working First Application Deadline', date(2026, 10, 28));
  setSetting('Planning Start Date', date(2026, 7, 30));
  setSetting('Athletic Recruiting Enabled', 'Yes');
  setSetting('Parent Effort Multiplier', 2);
  colleges.getRange(3, columnOf(colleges, 'College Name', 2)).setValue('Sheet University');
  const timeline = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  timeline.getRange(2, columnOf(timeline, 'College Name')).setValue('Sheet University');
  timeline.getRange(2, columnOf(timeline, 'Application Deadline')).setValue(date(2026, 10, 28));

  const generated = CollegeTools.TaskManagement.generateTaskPlan();
  const recruiting = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);
  const thisWeek = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.THIS_WEEK);
  const generatedTasks = CollegeTools.TaskManagement.readTasks();

  suite.assert(generated.ok && generated.taskCount > 0, 'Workbook plan generation should succeed');
  suite.assert(recruiting, 'Recruiting Tracker should be created when enabled');
  suite.assert(generatedTasks.some((task) => task.templateId === 'ATH-01'),
    'Enabled recruiting tasks should be written to canonical Tasks');
  suite.assertEqual(thisWeek.getRange(1, 1).getValue(), 'Task ID',
    'This Week should be generated from Tasks with its own tab');
});

suite.test('task context honors Colleges row-2 headers and row-3 data start', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(1, 1).setValue('Workbook title, not a college');
  colleges.getRange(3, columnOf(colleges, 'College Name', 2)).setValue('Row Three University');

  const context = CollegeTools.TaskManagement.buildContextFromWorkbook();
  const idColumn = columnOf(colleges, 'College ID', 2);

  suite.assertEqual(context.colleges.length, 1,
    'Only Colleges data rows beginning at row 3 should enter task context');
  suite.assertEqual(context.colleges[0].name, 'Row Three University',
    'The row-3 college should be read through the Colleges schema');
  suite.assert(colleges.getRange(3, idColumn).getValue(),
    'Stable College ID backfill should target the row-3 data row');
  suite.assertEqual(colleges.getRange(2, idColumn).getValue(), 'College ID',
    'College ID backfill must preserve the row-2 header');
});

suite.test('sheet regeneration preserves task notes, completion, locks, and custom columns by Task ID', () => {
  const {colleges} = setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  setSetting('Working First Application Deadline', date(2026, 10, 28));
  colleges.getRange(3, columnOf(colleges, 'College Name', 2)).setValue('Preserve University');
  CollegeTools.TaskManagement.generateTaskPlan();

  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
  const idColumn = columnOf(tasks, 'Task ID');
  const statusColumn = columnOf(tasks, 'Status');
  const notesColumn = columnOf(tasks, 'Notes');
  const ownerLockedColumn = columnOf(tasks, 'Owner Locked');
  const customColumn = tasks.getLastColumn() + 1;
  tasks.getRange(1, customColumn).setValue('Private Check');
  const taskId = tasks.getRange(2, idColumn).getValue();
  tasks.getRange(2, statusColumn).setValue('Complete');
  tasks.getRange(2, notesColumn).setValue('Family verification note');
  tasks.getRange(2, ownerLockedColumn).setValue('Yes');
  tasks.getRange(2, customColumn).setFormula('="Keep this"');

  CollegeTools.TaskManagement.generateTaskPlan();
  const rows = CollegeTools.TaskManagement.readTasks();
  const idsAfterRegeneration = rows.map((task) => task.taskId);
  const preserved = rows.find((task) => task.taskId === taskId);
  let preservedRow = 0;
  for (let row = 2; row <= tasks.getLastRow(); row++) {
    if (tasks.getRange(row, idColumn).getValue() === taskId) preservedRow = row;
  }

  suite.assertEqual(preserved.status, 'Complete', 'Completion should survive sheet regeneration');
  suite.assertEqual(preserved.notes, 'Family verification note', 'Notes should survive regeneration');
  suite.assert(preserved.ownerLocked, 'Owner lock should survive regeneration');
  suite.assertEqual(tasks.getRange(preservedRow, columnOf(tasks, 'Private Check')).getFormula(),
    '="Keep this"', 'Custom-column formulas should follow stable Task ID through rewrites');
  suite.assertEqual(new Set(idsAfterRegeneration).size, idsAfterRegeneration.length,
    'Repeated sheet generation should remain idempotent without duplicate task instances');
});

suite.test('sheet tracker synchronization applies reliable completion and keeps recruiting data when disabled', () => {
  const {colleges} = setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  setSetting('Working First Application Deadline', date(2026, 10, 28));
  setSetting('Athletic Recruiting Enabled', 'Yes');
  colleges.getRange(3, columnOf(colleges, 'College Name', 2)).setValue('Sync University');
  CollegeTools.TaskManagement.generateTaskPlan();
  const status = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
  status.getRange(2, columnOf(status, 'College Name')).setValue('Sync University');
  status.getRange(2, columnOf(status, 'Application Status')).setValue('Submitted');
  status.getRange(2, columnOf(status, 'Submitted Date')).setValue(date(2026, 10, 20));

  const sync = CollegeTools.TaskManagement.syncTaskCompletion();
  const submitted = taskByTemplate(CollegeTools.TaskManagement.readTasks(), 'SUB-03');
  suite.assert(sync.completed > 0, 'Reliable status tracker evidence should complete tasks');
  suite.assertEqual(submitted.status, 'Complete', 'Submission task should be completed');
  suite.assert(submitted.evidenceSource, 'Completed task should name its evidence source');

  const recruiting = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);
  recruiting.getRange(2, columnOf(recruiting, 'College Name')).setValue('Sync University');
  recruiting.getRange(2, columnOf(recruiting, 'Notes')).setValue('Preserve coach notes');
  setSetting('Athletic Recruiting Enabled', 'No');
  CollegeTools.TaskManagement.generateTaskPlan();
  suite.assert(recruiting.isSheetHidden(), 'Disabled recruiting tracker should be hidden, not deleted');
  suite.assertEqual(recruiting.getRange(2, columnOf(recruiting, 'Notes')).getValue(),
    'Preserve coach notes', 'Disabling recruiting should preserve tracker notes');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
