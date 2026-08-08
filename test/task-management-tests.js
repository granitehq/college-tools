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

suite.test('catalog contains uncapped, unique, validated implementation templates', () => {
  const validation = CollegeTools.TaskCatalog.validate();
  const templates = CollegeTools.TaskCatalog.getTemplates();
  const ids = templates.map((template) => template.templateId);

  suite.assert(validation.ok, `Catalog should validate: ${validation.errors.join(', ')}`);
  suite.assert(templates.length > 100,
    'Catalog should grow past the old 100-template cap once late-stage coverage is added');
  suite.assertEqual(new Set(ids).size, templates.length, 'Every template ID should be unique');
  suite.assert(!validation.errors.some((error) => /Expected \d+ templates/.test(error)),
    'Validation should no longer enforce a fixed template count');
  templates.forEach((template) => {
    suite.assert(template.ownerRole, `${template.templateId} should have an accountable role`);
    suite.assert(template.deliverable, `${template.templateId} should define completion`);
    suite.assert(template.effortMinutes > 0, `${template.templateId} should estimate effort`);
    suite.assert(template.scheduleRule && template.scheduleAnchor && template.offsetWindow,
      `${template.templateId} should define its schedule contract`);
    suite.assertEqual(typeof template.offsetDays, 'number',
      `${template.templateId} should define a schedule`);
  });

  const scheduleRules = new Set(templates.map((template) => template.scheduleRule));
  ['Fixed date', 'Dependency', 'Suggested window', 'Milestone offset', 'Recurrence']
    .forEach((rule) => {
      suite.assert(scheduleRules.has(rule),
        `Catalog schedule metadata should distinguish the ${rule} rule`);
    });

  const byId = Object.fromEntries(templates.map((template) => [template.templateId, template]));
  suite.assertEqual(byId['AID-02'].dateResolver, 'fafsaAccess',
    'FAFSA access scheduling should be selected by catalog metadata');
  suite.assertEqual(byId['AID-06'].dateResolver, 'fafsaSubmission',
    'FAFSA submission scheduling should be selected by catalog metadata');
  suite.assertEqual(byId['AID-07'].dateResolver, 'fafsaReview',
    'FAFSA review scheduling should be selected by catalog metadata');
});

suite.test('catalog titles retain enough context when shown outside their workstream', () => {
  const templates = CollegeTools.TaskCatalog.getTemplates();
  const byId = Object.fromEntries(templates.map((template) => [template.templateId, template]));
  const expectedTitles = {
    'STR-03': 'Choose applicable planning modules in Task Settings',
    'SCH-05': 'Triage scholarship opportunities by value, probability, and effort',
    'TST-04': 'Create and execute SAT/ACT preparation and checkpoint plan',
    'APP-02': 'Complete Common App profile, contact, and family sections',
    'APP-03': 'Complete Common App education and current-course sections',
    'APP-04': 'Complete Common App testing section',
    'APP-05': 'Draft and order Common App activities entries',
    'APP-06': 'Complete Common App honors section',
    'APP-07': 'Draft Common App additional-information response if justified',
    'APP-08': 'Audit and lock reusable Common App data',
    'ESS-06': 'Obtain bounded outside review of the personal statement',
  };

  Object.entries(expectedTitles).forEach(([templateId, expectedTitle]) => {
    suite.assertEqual(byId[templateId].task, expectedTitle,
      `${templateId} should retain its work context when shown in This Week`);
  });
});

suite.test('catalog covers the post-acceptance decision and enrollment phase', () => {
  const templates = CollegeTools.TaskCatalog.getTemplates();
  const byId = {};
  templates.forEach((template) => {
    byId[template.templateId] = template;
  });

  suite.assertEqual(CollegeTools.TaskCatalog.WORKSTREAMS.DEC, 'Decision And Enrollment',
    'Catalog should define a Decision And Enrollment workstream');
  ['DEC-01', 'DEC-02', 'DEC-03', 'DEC-04', 'DEC-05', 'DEC-06', 'DEC-07'].forEach((id) => {
    suite.assert(byId[id], `Catalog should include ${id}`);
    suite.assertEqual(byId[id].workstream, 'Decision And Enrollment',
      `${id} should belong to the Decision And Enrollment workstream`);
    suite.assertEqual(byId[id].scope, 'college', `${id} should be scoped per college`);
  });
  suite.assert(byId['TST-07'], 'Catalog should include AP/IB score sending');
  suite.assert(byId['STR-09'], 'Catalog should include Early Decision agreement signing');
});

suite.test('CSS Profile submission allows the IDOC-recommended two-week buffer', () => {
  const templates = CollegeTools.TaskCatalog.getTemplates();
  const byId = {};
  templates.forEach((template) => {
    byId[template.templateId] = template;
  });

  suite.assertEqual(byId['AID-10'].offsetDays, -14,
    'CSS Profile submission should be due at least two weeks before the deadline for IDOC processing');
});

suite.test('Student Foundation offsets are staggered to respect their dependency chain', () => {
  const templates = CollegeTools.TaskCatalog.getTemplates();
  const byId = {};
  templates.forEach((template) => {
    byId[template.templateId] = template;
  });

  suite.assert(byId['PRO-02'].offsetDays > byId['PRO-01'].offsetDays,
    'PRO-02 (verify transcript) should be scheduled after PRO-01 (collect transcript) it depends on');
  suite.assert(byId['PRO-05'].offsetDays > byId['PRO-03'].offsetDays &&
    byId['PRO-05'].offsetDays > byId['PRO-04'].offsetDays,
  'PRO-05 (resume) should be scheduled after the PRO-03/PRO-04 inventories it depends on');
  suite.assert(byId['PRO-07'].offsetDays > byId['PRO-06'].offsetDays,
    'PRO-07 (narrative) should be scheduled after PRO-06 (story inventory) it depends on');
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
  const earlyStrategy = taskByTemplate(result.tasks, 'STR-01');
  const plannedWeeks = new Set(result.tasks.map((task) =>
    CollegeTools.TaskPlanner.dateKey(task.plannedWeek)));
  const currentWeekKey = CollegeTools.TaskPlanner.dateKey(
    CollegeTools.TaskPlanner.startOfWeek(today));
  const currentWeekCount = result.tasks.filter((task) =>
    CollegeTools.TaskPlanner.dateKey(task.plannedWeek) === currentWeekKey).length;

  suite.assert(result.ok, 'Accelerated athlete generation should succeed');
  ['TST-01', 'ATH-01', 'AID-08', 'VIS-01', 'VIS-05', 'PRT-01']
    .forEach((templateId) => {
      suite.assert(taskByTemplate(result.tasks, templateId),
        `${templateId} should be present when its module is enabled`);
    });
  suite.assertEqual(submit.dueDate.getTime(), actualDeadline.getTime(),
    'Actual college deadline should override the later working target');
  suite.assert(earlyStrategy.calculatedDate < today && earlyStrategy.dueDate >= today,
    'Late-start work should retain its ideal date and receive an actionable effective date');
  suite.assert(earlyStrategy.scheduleFlag.includes('Adaptive late-start date'),
    'Adaptive compression should remain visible instead of hiding the late start');
  suite.assert(plannedWeeks.size >= 8 && currentWeekCount < result.tasks.length / 2,
    'A 90-day plan should distribute work across the remaining window instead of one backlog week');
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
    suite.assert(
      task.applicabilityRule && task.scheduleRule && task.scheduleAnchor &&
        task.offsetWindow && task.calculatedDate && task.effectiveDate,
      `${task.taskId} should expose applicability, schedule rule, anchor, offset, and effective date`);
    suite.assert(task.adjustedEffortMinutes > 0, `${task.taskId} should have effort`);
  });
});

suite.test('decision-phase tasks anchor to tracked decision, deposit, and housing dates', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 11, 1);
  const decisionDate = date(2027, 3, 1);
  const enrollmentDepositDeadline = date(2027, 5, 1);
  const housingDepositDue = date(2027, 6, 1);
  const templatesById = {};
  CollegeTools.TaskCatalog.getTemplates().forEach((template) => {
    templatesById[template.templateId] = template;
  });
  function addDays(base, days) {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  }

  const result = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline),
    {colleges: [college('C1', 'Decision University', deadline, {
      decisionDate, enrollmentDepositDeadline, housingDepositDue,
      decisionResult: 'Accepted', enrollmentChoice: 'Enroll',
    })]},
    today,
  );

  const decisionTask = taskByTemplate(result.tasks, 'DEC-01', 'C1');
  const depositTask = taskByTemplate(result.tasks, 'DEC-06', 'C1');
  const housingTask = taskByTemplate(result.tasks, 'DEC-07', 'C1');

  suite.assertEqual(decisionTask.dateSource, 'Decision release date',
    'DEC-01 should anchor to the tracked decision release date');
  suite.assertEqual(decisionTask.effectiveDate.getTime(),
    addDays(decisionDate, templatesById['DEC-01'].offsetDays).getTime(),
    'DEC-01 should apply its offset to the tracked decision date');

  suite.assertEqual(depositTask.dateSource, 'Enrollment deposit deadline',
    'DEC-06 should anchor to the tracked enrollment deposit deadline');
  suite.assertEqual(depositTask.effectiveDate.getTime(),
    addDays(enrollmentDepositDeadline, templatesById['DEC-06'].offsetDays).getTime(),
    'DEC-06 should apply its offset to the tracked deposit deadline');

  suite.assertEqual(housingTask.dateSource, 'Housing deposit due date',
    'DEC-07 should anchor to the tracked housing deposit due date');
  suite.assertEqual(housingTask.effectiveDate.getTime(),
    addDays(housingDepositDue, templatesById['DEC-07'].offsetDays).getTime(),
    'DEC-07 should apply its offset to the tracked housing due date');
});

suite.test('decision-phase tasks fall back to a computed National Candidates Reply Date', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 11, 1);
  const result = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline),
    // Admitted, but no deposit/housing dates tracked yet -- exactly the
    // state that should fall back to the computed default instead of the
    // college being excluded (DEC-06 requires an explicit enrollment choice).
    {colleges: [college('C1', 'Admitted, No Deposit Data University', deadline, {
      decisionResult: 'Accepted', enrollmentChoice: 'Enroll',
    })]},
    today,
  );

  const decisionTask = taskByTemplate(result.tasks, 'DEC-01', 'C1');
  const depositTask = taskByTemplate(result.tasks, 'DEC-06', 'C1');

  suite.assert(decisionTask.dateSource.includes('National Candidates Reply Date'),
    'DEC-01 should fall back to a computed default instead of the application deadline');
  suite.assertEqual(decisionTask.anchorDate.getFullYear(), 2027,
    'The computed default should fall in the spring of the decision year');
  suite.assertEqual(decisionTask.anchorDate.getMonth(), 4,
    'The computed default should anchor on May 1');
  suite.assertEqual(decisionTask.anchorDate.getDate(), 1,
    'The computed default should anchor on May 1');
  suite.assert(depositTask.dateSource.includes('National Candidates Reply Date'),
    'DEC-06 should fall back to a computed default when no deposit deadline is tracked');
});

suite.test('Decision/Enrollment tasks only generate for colleges matching the outcome they apply to', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 11, 1);
  const context = {
    colleges: [
      college('ED1', 'Early Decision University', deadline, {applicationType: 'ED'}),
      college('RD1', 'Regular Decision University', deadline, {applicationType: 'RD'}),
      college('NODATA', 'No Decision Data University', deadline),
      college('ENROLL', 'Enrolling University', deadline, {
        decisionResult: 'Accepted', enrollmentChoice: 'Enroll',
      }),
      college('DECLINE', 'Declined Offer University', deadline, {
        decisionResult: 'Accepted', enrollmentChoice: 'Decline',
      }),
      college('UNDECIDED', 'Undecided Offer University', deadline, {
        decisionResult: 'Accepted', enrollmentChoice: 'Undecided',
      }),
      college('WAIT1', 'Waitlisted University', deadline, {decisionResult: 'Waitlisted'}),
      college('REJ1', 'Rejected University', deadline, {decisionResult: 'Rejected'}),
    ],
  };
  const result = CollegeTools.TaskPlanner.generatePlan(baseConfig(deadline), context, today);

  suite.assert(taskByTemplate(result.tasks, 'STR-09', 'ED1'),
    'STR-09 should generate for an Early Decision college');
  suite.assert(!taskByTemplate(result.tasks, 'STR-09', 'RD1'),
    'STR-09 should not generate for a Regular Decision college');

  suite.assert(taskByTemplate(result.tasks, 'DEC-01', 'NODATA'),
    'DEC-01 (record the decision) should generate for every college regardless of outcome');

  ['DEC-02', 'DEC-03', 'DEC-05'].forEach((templateId) => {
    suite.assert(!taskByTemplate(result.tasks, templateId, 'NODATA'),
      `${templateId} should not generate for a college with no decision data`);
    suite.assert(!taskByTemplate(result.tasks, templateId, 'REJ1'),
      `${templateId} should not generate for a rejected college`);
    ['ENROLL', 'DECLINE', 'UNDECIDED'].forEach((scopeId) => {
      suite.assert(taskByTemplate(result.tasks, templateId, scopeId),
        `${templateId} should generate for every admitted college (${scopeId})`);
    });
  });
  ['DEC-06', 'DEC-07'].forEach((templateId) => {
    suite.assert(taskByTemplate(result.tasks, templateId, 'ENROLL'),
      `${templateId} should generate for the explicitly enrolling college`);
    suite.assert(!taskByTemplate(result.tasks, templateId, 'DECLINE'),
      `${templateId} should not generate for a declined offer`);
    suite.assert(!taskByTemplate(result.tasks, templateId, 'UNDECIDED'),
      `${templateId} should not generate until enrollment is chosen`);
  });

  suite.assert(taskByTemplate(result.tasks, 'DEC-04', 'WAIT1'),
    'DEC-04 (waitlist response) should generate for a waitlisted college');
  suite.assert(!taskByTemplate(result.tasks, 'DEC-04', 'ENROLL'),
    'DEC-04 should not generate for an already-admitted (non-waitlisted) college');
});

suite.test('an explicit enrollment choice completes the admitted-college decision task', () => {
  const deadline = date(2026, 11, 1);
  const context = {colleges: [college('C1', 'Chosen University', deadline, {
    decisionResult: 'Accepted', enrollmentChoice: 'Enroll',
  })]};
  const generated = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline), context, date(2026, 7, 30));
  const applied = CollegeTools.TaskPlanner.applyEvidence(
    generated.tasks, context, date(2027, 4, 15));

  const comparison = taskByTemplate(applied.tasks, 'DEC-05', 'C1');
  suite.assertEqual(comparison.status, 'Complete',
    'DEC-05 should complete once the family records Enroll or Decline');
  suite.assert(comparison.evidenceSource.includes('Enrollment Choice'),
    'DEC-05 should retain attributable completion evidence');
});

suite.test('parent effort multiplier of 0 is honored instead of falling back to the default', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 11, 1);
  const config = baseConfig(deadline);
  config.parentEffortMultiplier = 0;
  const result = CollegeTools.TaskPlanner.generatePlan(
    config,
    {colleges: [college('C1', 'Zero Multiplier University', deadline)]},
    today,
  );

  const parentTask = taskByTemplate(result.tasks, 'AID-01');

  suite.assertEqual(parentTask.adjustedEffortMinutes, 0,
    'An explicit 0 multiplier should zero out parent-owned effort, not fall back to 1x');
});

suite.test('generatePlan uses a labeled suggested window as the final deadline fallback', () => {
  const today = date(2026, 7, 30);
  const config = baseConfig(null);
  config.fafsaAvailabilityDate = null;
  config.graduationYear = 2028;
  const result = CollegeTools.TaskPlanner.generatePlan(config, {colleges: []}, today);

  suite.assert(result.ok, 'A family profile should generate from a suggested window when dates are absent');
  suite.assertEqual(result.firstDeadline.getTime(), date(2027, 11, 1).getTime(),
    'The suggested first-application window should be November 1 before graduation');
  suite.assertEqual(result.deadlineSource, 'Suggested first-application window; confirm manually',
    'The final fallback should never masquerade as an authoritative or family-entered date');
  suite.assert(result.tasks.every((task) => task.dateSource || task.scopeType === 'recurring'),
    'Every non-recurring task should retain attributable date provenance');
});

suite.test('all four planning horizons expose distinct task emphasis without truncating the roadmap', () => {
  const cases = [
    {deadline: date(2028, 1, 1), key: 'more-than-one-year', phrase: 'Exploration', prefix: 'PRO-'},
    {deadline: date(2027, 5, 1), key: 'six-to-twelve-months', phrase: 'Research', prefix: 'COL-'},
    {deadline: date(2026, 12, 15), key: 'three-to-six-months', phrase: 'Final list', prefix: 'APP-'},
    {deadline: date(2026, 10, 15), key: 'ninety-days-or-less', phrase: 'Applications', prefix: 'APP-'},
  ];

  cases.forEach((entry) => {
    const result = CollegeTools.TaskPlanner.generatePlan(
      baseConfig(entry.deadline),
      {colleges: []},
      date(2026, 7, 30),
    );
    suite.assertEqual(result.planningHorizon.key, entry.key,
      `${entry.key} should be selected from days remaining`);
    suite.assert(result.planningHorizon.emphasis.includes(entry.phrase),
      `${entry.key} should expose its requirements-defined emphasis`);
    suite.assert(result.tasks.length > 0,
      `${entry.key} should retain a full applicable roadmap`);
    suite.assert(result.tasks.some((task) =>
      task.templateId.indexOf(entry.prefix) === 0 &&
      task.scheduleFlag.indexOf('Horizon emphasis:') !== -1),
    `${entry.key} should visibly emphasize its phase-appropriate task set`);
  });
});

suite.test('generatePlan reports invalid_catalog when catalog validation fails', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 11, 1);
  const originalValidate = CollegeTools.TaskCatalog.validate;
  CollegeTools.TaskCatalog.validate = function() {
    return {ok: false, count: 0, errors: ['Simulated catalog corruption for test coverage']};
  };
  try {
    const result = CollegeTools.TaskPlanner.generatePlan(baseConfig(deadline), {colleges: []}, today);

    suite.assertEqual(result.ok, false,
      'A broken catalog should fail generation, not throw or silently generate');
    suite.assertEqual(result.code, 'invalid_catalog',
      'The failure should report the invalid_catalog code');
    suite.assertEqual(result.errors[0], 'Simulated catalog corruption for test coverage',
      'The failure should surface the validator errors');
    suite.assertEqual(result.tasks.length, 0, 'No tasks should be generated on failure');
  } finally {
    CollegeTools.TaskCatalog.validate = originalValidate;
  }
});

suite.test('AP/IB score sending anchors to the fixed June 20 free-send deadline', () => {
  const today = date(2026, 7, 30);
  const deadline = date(2026, 11, 1);
  const config = baseConfig(deadline);
  config.modules.Testing = true;
  const result = CollegeTools.TaskPlanner.generatePlan(
    config,
    {colleges: [college('C1', 'Testing University', deadline)]},
    today,
  );

  const apScores = taskByTemplate(result.tasks, 'TST-07', 'C1');

  suite.assert(apScores, 'AP/IB score sending should be generated when Testing is enabled');
  suite.assert(apScores.dateSource.includes('June 20'),
    'AP/IB score sending should anchor to the fixed June 20 free-send deadline');
  suite.assertEqual(apScores.anchorDate.getMonth(), 5,
    'The computed AP/IB default should fall in June');
  suite.assertEqual(apScores.anchorDate.getDate(), 20,
    'The computed AP/IB default should fall on the 20th');
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

suite.test('professional ownership and optional support adapt independently', () => {
  const deadline = date(2026, 10, 28);
  const context = {colleges: [college('C1', 'Support University', deadline)]};
  const unsupported = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(deadline), context, date(2026, 7, 30));
  suite.assertEqual(taskByTemplate(unsupported.tasks, 'ESS-06').ownerRole, 'Shared',
    'Required professional-owned work should fall back when no professional owns it');
  suite.assertEqual(taskByTemplate(unsupported.tasks, 'ESS-03').supportRole, '',
    'Optional professional support should be absent when unavailable');

  const supportOnlyConfig = baseConfig(deadline);
  supportOnlyConfig.modules['Professional Support'] = true;
  const supportOnly = CollegeTools.TaskPlanner.generatePlan(
    supportOnlyConfig, context, date(2026, 7, 30));
  suite.assertEqual(taskByTemplate(supportOnly.tasks, 'ESS-06').ownerRole, 'Shared',
    'Support availability alone should not transfer accountable ownership');
  suite.assertEqual(
    taskByTemplate(supportOnly.tasks, 'ESS-03').supportRole,
    'Counselor/Professional',
    'Available professional support should remain visible on student-owned tasks');

  const ownerConfig = baseConfig(deadline);
  ownerConfig.counselorAvailable = true;
  ownerConfig.roleNames['Counselor/Professional'] = 'Private Counselor';
  const owned = CollegeTools.TaskPlanner.generatePlan(
    ownerConfig, context, date(2026, 7, 30));
  suite.assertEqual(taskByTemplate(owned.tasks, 'ESS-06').owner, 'Private Counselor',
    'A participating professional should own catalog work assigned to that role');
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

suite.test('authoritative college dates outrank working targets and unrelated action dates', () => {
  const workingTarget = date(2026, 10, 1);
  const actualDeadline = date(2026, 11, 1);
  const context = {
    colleges: [college('C1', 'Authoritative University', actualDeadline, {
      aidDeadline: date(2026, 11, 15),
      meritDeadline: date(2026, 11, 10),
    })],
    scholarships: [{
      id: 'SCH1', scholarshipId: 'SCH1', scholarshipName: 'Unrelated Award',
      deadline: date(2026, 8, 1),
    }],
    contacts: [{
      id: 'RC1', contactId: 'RC1', collegeId: 'C1',
      collegeName: 'Authoritative University', nextFollowUp: date(2026, 8, 2),
    }],
  };
  const result = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(workingTarget), context, date(2026, 7, 30));
  const submission = taskByTemplate(result.tasks, 'SUB-03', 'C1');

  suite.assertEqual(result.firstDeadline.getTime(), actualDeadline.getTime(),
    'Coach follow-ups, outside scholarships, and earlier family targets should not replace hard college dates');
  suite.assertEqual(submission.dueDate.getTime(), actualDeadline.getTime(),
    'A college-specific submission should keep its authoritative deadline');
  suite.assertEqual(submission.dateSource, 'College application deadline',
    'The schedule should record the authoritative source it actually used');
});

suite.test('scholarship tasks fall back to the earliest real deadline with accurate provenance', () => {
  const deadline = date(2026, 11, 1);
  const config = baseConfig(null);
  const context = {
    colleges: [college('C1', 'Deadline University', deadline, {
      aidDeadline: null,
      meritDeadline: null,
      transcriptDeadline: null,
      teacherRecDeadline: null,
      counselorRecDeadline: null,
      testScoreDeadline: null,
    })],
    scholarships: [{
      id: 'SCH1',
      scholarshipId: 'SCH1',
      scholarshipName: 'Deadline Pending Award',
      deadline: null,
    }],
  };
  const result = CollegeTools.TaskPlanner.generatePlan(config, context, date(2026, 7, 30));
  const submission = taskByTemplate(result.tasks, 'SCH-06', 'SCH1');
  const resultTask = taskByTemplate(result.tasks, 'SCH-07', 'SCH1');

  suite.assert(result.ok, 'A real college deadline should make the plan schedulable');
  [submission, resultTask].forEach((task) => {
    suite.assert(task.calculatedDate && task.dueDate && task.plannedWeek,
      `${task.taskId} should remain fully scheduled without a working target`);
    suite.assertEqual(task.dateSource, 'Earliest relevant college deadline',
      `${task.taskId} should name the deadline source it actually used`);
  });
  suite.assertEqual(submission.anchorDate.getTime(), deadline.getTime(),
    'Scholarship submission should anchor to the earliest relevant real deadline');
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
  const pendingAthletic = taskByTemplate(existing, 'ATH-02');
  pendingAthletic.notes = 'Resume drafting notes';
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
  const archivedPending = reconciled.tasks.find((task) => task.taskId === pendingAthletic.taskId);

  suite.assertEqual(preserved.status, 'Complete', 'Completed state should survive regeneration');
  suite.assertEqual(preserved.notes, 'Verified with official calculator', 'Notes should survive');
  suite.assertEqual(preserved.owner, 'Custom Parent', 'Locked owner should survive');
  suite.assertEqual(preserved.dueDate.getTime(), date(2026, 8, 15).getTime(),
    'Locked due date should survive');
  suite.assertEqual(archivedAthletic.status, 'Complete',
    'Completed disabled-module task should remain a completed audit record');
  suite.assert(archivedAthletic.archivedReason,
    'Removed generated work should be archived with a reason');
  suite.assertEqual(archivedPending.status, 'Skipped',
    'Incomplete removed module work should be system-archived as Skipped');
  suite.assert(reconciled.tasks.some((task) => task.taskId === 'MANUAL::1'),
    'Manual tasks should survive regeneration');
  suite.assertEqual(new Set(reconciled.tasks.map((task) => task.taskId)).size,
    reconciled.tasks.length, 'Reconfiguration should never duplicate task instances');

  const restoredGeneration = CollegeTools.TaskPlanner.generatePlan(config, context, today);
  const restored = CollegeTools.TaskPlanner.reconcile(
    restoredGeneration.tasks, reconciled.tasks).tasks;
  const restoredPending = restored.find((task) => task.taskId === pendingAthletic.taskId);
  suite.assert(!restoredPending.archivedReason && restoredPending.status !== 'Skipped',
    'Re-enabled system-archived work should become active again');
  suite.assertEqual(restoredPending.notes, 'Resume drafting notes',
    'Reactivation should retain task notes');
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

suite.test('a manually promoted Ready status survives an unrelated evidence sync despite an incomplete dependency', () => {
  // Simulates syncTaskCompletion firing on an edit to an unrelated tracker
  // sheet: applyEvidence recalculates dependency readiness for every task,
  // not just the one tied to the edited tracker. A task the family
  // deliberately promoted to Ready (e.g. to start early) despite an
  // incomplete prerequisite must not be silently reverted by that sweep.
  const taskB = {
    taskId: 'B', task: 'Prerequisite', owner: 'Student', ownerRole: 'Student',
    status: 'Not Started', dependencies: [], adjustedEffortMinutes: 30, priority: 'Normal',
  };
  const taskA = {
    taskId: 'A', task: 'Dependent, manually started early', owner: 'Student', ownerRole: 'Student',
    status: 'Ready', dependencies: ['B'], adjustedEffortMinutes: 30, priority: 'Normal',
  };

  const result = CollegeTools.TaskPlanner.applyEvidence([taskA, taskB], {}, date(2026, 7, 30));
  const afterA = result.tasks.find((task) => task.taskId === 'A');

  suite.assertEqual(afterA.status, 'Ready',
    'A manual Ready override should not be reverted by an unrelated evidence sync');
});

suite.test('fixed deadlines are retained and flagged when a prerequisite is planned later', () => {
  const deadline = date(2026, 10, 28);
  const originalGetTemplates = CollegeTools.TaskCatalog.getTemplates;
  try {
    CollegeTools.TaskCatalog.getTemplates = () => originalGetTemplates().map((template) => {
      if (template.templateId !== 'SUB-02') return template;
      return Object.assign({}, template, {
        offsetDays: 2,
        offsetWindow: '2 days after anchor',
      });
    });
    const result = CollegeTools.TaskPlanner.generatePlan(
      baseConfig(deadline),
      {colleges: [college('C1', 'Conflict University', deadline)]},
      date(2026, 7, 30),
    );
    const review = taskByTemplate(result.tasks, 'SUB-02', 'C1');
    const submission = taskByTemplate(result.tasks, 'SUB-03', 'C1');

    suite.assert(review.dueDate > submission.dueDate,
      'The test fixture should put the prerequisite after the fixed submission date');
    suite.assertEqual(submission.dueDate.getTime(), deadline.getTime(),
      'Dependency alignment must not move an authoritative fixed deadline');
    suite.assertEqual(submission.priority, 'Critical',
      'An impossible fixed-date dependency should become critical');
    suite.assert(submission.scheduleFlag.includes(
      'Dependency conflict: prerequisite is planned after fixed date'),
    'The plan should expose the dependency conflict for manual resolution');
  } finally {
    CollegeTools.TaskCatalog.getTemplates = originalGetTemplates;
  }
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

  const manuallyCorrected = applied.tasks.map((task) => Object.assign({}, task));
  const correctedSubmission = taskByTemplate(manuallyCorrected, 'SUB-03', 'C1');
  correctedSubmission.status = 'In Progress';
  const retained = CollegeTools.TaskPlanner.applyEvidence(
    manuallyCorrected, context, date(2026, 10, 22));
  suite.assertEqual(taskByTemplate(retained.tasks, 'SUB-03', 'C1').status, 'In Progress',
    'A manual correction to an evidence-derived status should survive later synchronization');
  suite.assert(retained.suggestions.some((item) =>
    item.taskId === 'SUB-03::C1' && item.source.includes('Manual status override')),
  'The workbook should report when canonical evidence still disagrees with a manual correction');
});

suite.test('financial, scholarship, visit, and recruiting trackers provide attributable completion evidence', () => {
  const deadline = date(2026, 10, 28);
  const config = baseConfig(deadline);
  config.modules['CSS Profile'] = true;
  config.modules['Athletic Recruiting'] = true;
  config.modules.Visits = true;
  const context = {
    colleges: [college('C1', 'Tracker University', deadline)],
    scholarships: [{
      id: 'SCH1', scholarshipId: 'SCH1', scholarshipName: 'Tracker Award',
      deadline: date(2026, 9, 1), submittedDate: date(2026, 8, 20),
      decisionDate: date(2026, 9, 20), awardStatus: 'Awarded',
    }],
    visits: [{
      id: 'V1', visitId: 'V1', collegeId: 'C1',
      collegeName: 'Tracker University', visitDate: date(2026, 8, 15),
    }],
    contacts: [{
      id: 'RC1', contactId: 'RC1', collegeId: 'C1',
      collegeName: 'Tracker University',
      questionnaireDate: date(2026, 8, 5),
      initialOutreachDate: date(2026, 8, 6),
      response: 'Interested',
      lastContact: date(2026, 8, 8),
      nextFollowUp: date(2026, 8, 15),
    }],
    fafsaSubmitted: true,
    cssProfileSubmitted: true,
  };
  const generated = CollegeTools.TaskPlanner.generatePlan(
    config, context, date(2026, 7, 30));
  const applied = CollegeTools.TaskPlanner.applyEvidence(
    generated.tasks, context, date(2026, 9, 21));
  [
    ['AID-06', 'GLOBAL'],
    ['AID-10', 'GLOBAL'],
    ['SCH-06', 'SCH1'],
    ['SCH-07', 'SCH1'],
    ['VIS-04', 'V1'],
    ['ATH-07', 'C1'],
    ['ATH-08', 'RC1'],
    ['ATH-09', 'RC1'],
  ].forEach(([templateId, scopeId]) => {
    const task = taskByTemplate(applied.tasks, templateId, scopeId);
    suite.assertEqual(task.status, 'Complete',
      `${templateId} should complete from its canonical tracker`);
    suite.assert(task.evidenceSource,
      `${templateId} should retain attributable completion evidence`);
  });
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

suite.test('views expose the canonical master plan plus owner and college task lists', () => {
  const today = date(2026, 8, 3);
  const tasks = [
    {
      taskId: 'A', task: 'Parent application task', owner: 'Parent',
      ownerRole: 'Parent/Guardian', college: 'Alpha University', status: 'Ready',
      plannedWeek: today, dueDate: today, adjustedEffortMinutes: 30, priority: 'High',
    },
    {
      taskId: 'B', task: 'Student shared task', owner: 'Avery',
      ownerRole: 'Student', college: '', status: 'Ready', plannedWeek: today,
      dueDate: today, adjustedEffortMinutes: 45, priority: 'Normal',
    },
    {
      taskId: 'C', task: 'Completed college task', owner: 'Avery',
      ownerRole: 'Student', college: 'Beta College', status: 'Complete',
      plannedWeek: today, dueDate: today, adjustedEffortMinutes: 60, priority: 'Normal',
    },
  ];

  const views = CollegeTools.TaskPlanner.buildViews(tasks, today, {
    workingDeadline: date(2026, 10, 15),
  });

  suite.assertEqual(views.masterPlan.length, 3,
    'Master Plan should represent every active canonical task');
  suite.assertEqual(views.ownerView.length, 2,
    'Owner view should list all incomplete work by configured owner');
  suite.assertEqual(views.ownerView[0].owner, 'Avery',
    'Owner view should have a stable owner-first ordering');
  suite.assertEqual(views.collegeView.length, 1,
    'College view should list incomplete college-linked work only');
  suite.assertEqual(views.collegeView[0].college, 'Alpha University',
    'College view should retain its canonical college link');
});

suite.test('This Week preserves every required category and reports truncation', () => {
  const today = date(2026, 8, 3);
  const tasks = [];
  for (let i = 0; i < 11; i++) {
    tasks.push({
      taskId: `DATED-${i}`, task: `Dated task ${i}`, owner: 'Parent',
      ownerRole: 'Parent/Guardian', status: 'Ready', dueDate: date(2026, 8, 4),
      plannedWeek: today, adjustedEffortMinutes: 30, priority: 'Critical',
    });
  }
  tasks.push({
    taskId: 'BLOCKED-UNDATED', task: 'Undated blocker', owner: 'Student',
    ownerRole: 'Student', status: 'Blocked', adjustedEffortMinutes: 30,
    priority: 'Normal',
  });
  tasks.push({
    taskId: 'DECISION-UNDATED', task: 'Undated decision', owner: 'Parent',
    ownerRole: 'Parent/Guardian', status: 'Ready', decisionNeeded: true,
    adjustedEffortMinutes: 30, priority: 'Normal',
  });
  tasks.push({
    taskId: 'SELECTED-UNDATED', task: 'Family-selected action', owner: 'Shared',
    ownerRole: 'Shared', status: 'Ready', manuallySelected: true,
    adjustedEffortMinutes: 30, priority: 'Normal',
  });

  const views = CollegeTools.TaskPlanner.buildViews(tasks, today);
  const shownIds = views.thisWeek.map((task) => task.taskId);

  suite.assertEqual(views.thisWeek.length, 10, 'This Week should retain its action cap');
  ['BLOCKED-UNDATED', 'DECISION-UNDATED', 'SELECTED-UNDATED'].forEach((taskId) => {
    suite.assert(shownIds.includes(taskId),
      `${taskId} should not be starved by higher-sorting dated tasks`);
  });
  suite.assertEqual(views.thisWeekCandidateCount, 14,
    'The view should expose the complete eligible action count');
  suite.assertEqual(views.thisWeekOmittedCount, 4,
    'The view should explicitly report actions omitted by the cap');
  ['blocked-or-waiting', 'decision-needed', 'manually-selected'].forEach((category) => {
    suite.assert(views.thisWeekCategoryCounts[category].shown > 0,
      `${category} should have visible category coverage`);
  });
});

suite.test('a task satisfying two required categories does not starve a distinct task in the second category', () => {
  const today = date(2026, 8, 3);
  const tasks = [];
  for (let i = 0; i < 9; i++) {
    tasks.push({
      taskId: `DATED-${i}`, task: `Dated task ${i}`, owner: 'Parent',
      ownerRole: 'Parent/Guardian', status: 'Ready', dueDate: date(2026, 8, 4),
      plannedWeek: today, adjustedEffortMinutes: 30, priority: 'Critical',
    });
  }
  // Sorts before DECISION-ONLY among undated tasks (tie-broken by taskId),
  // and satisfies both the 'blocked-or-waiting' and 'decision-needed'
  // categories at once.
  tasks.push({
    taskId: 'BLOCKED-DECISION', task: 'Blocked and awaiting a decision', owner: 'Student',
    ownerRole: 'Student', status: 'Blocked', decisionNeeded: true,
    adjustedEffortMinutes: 30, priority: 'Normal',
  });
  tasks.push({
    taskId: 'DECISION-ONLY', task: 'A distinct decision-needed task', owner: 'Parent',
    ownerRole: 'Parent/Guardian', status: 'Ready', decisionNeeded: true,
    adjustedEffortMinutes: 30, priority: 'Normal',
  });

  const views = CollegeTools.TaskPlanner.buildViews(tasks, today);
  const shownIds = views.thisWeek.map((task) => task.taskId);

  suite.assert(shownIds.includes('BLOCKED-DECISION'),
    'The dual-category task should still be guaranteed a slot');
  suite.assert(shownIds.includes('DECISION-ONLY'),
    'A distinct decision-needed task should not be starved because another task already claimed that category');
});

suite.test('completed tasks are excluded from remaining effort and capacity warnings', () => {
  const today = date(2026, 8, 3);
  const nextWeek = date(2026, 8, 10);
  const tasks = [
    {
      taskId: 'OPEN', task: 'Remaining work', owner: 'Parent',
      ownerRole: 'Parent/Guardian', status: 'Ready', plannedWeek: nextWeek,
      dueDate: nextWeek, adjustedEffortMinutes: 60, priority: 'Normal',
    },
    {
      taskId: 'DONE', task: 'Already completed work', owner: 'Parent',
      ownerRole: 'Parent/Guardian', status: 'Complete', plannedWeek: nextWeek,
      dueDate: nextWeek, adjustedEffortMinutes: 600, priority: 'Normal',
    },
  ];

  const views = CollegeTools.TaskPlanner.buildViews(tasks, today, {
    roleThresholds: {'Parent/Guardian': 2},
  });

  suite.assertEqual(views.totalEffortMinutes, 60,
    'Remaining baseline effort should exclude completed work');
  suite.assertEqual(views.effortByOwner.Parent, 60,
    'Owner projections should include only incomplete work');
  suite.assertEqual(views.nextWeekEffortMinutes, 60,
    'Next-week effort should exclude completed work');
  suite.assertEqual(views.capacityWarnings.length, 0,
    'Completed work should not trigger a capacity warning');
});

suite.test('previewTaskPlan makes no workbook mutations and includes rows without stored IDs', () => {
  const {colleges} = setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  const nameCol = columnOf(colleges, 'College Name', 2);
  const idCol = columnOf(colleges, 'College ID', 2);
  colleges.getRange(3, nameCol).setValue('Untouched University');
  suite.assertEqual(colleges.getRange(3, idCol).getValue(), '',
    'Precondition: new college has no ID yet');

  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
  tasks.getRange(2, columnOf(tasks, 'Task')).setValue('Draft custom task, not yet finished');
  const taskIdCol = columnOf(tasks, 'Task ID');
  suite.assertEqual(tasks.getRange(2, taskIdCol).getValue(), '',
    'Precondition: custom row has no Task ID yet');

  setSetting('Working First Application Deadline', date(2026, 10, 28));
  setSetting('Planning Start Date', date(2026, 7, 30));
  setSetting('Athletic Recruiting Enabled', 'Yes');

  const scholarships = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
  scholarships.getRange(2, columnOf(scholarships, 'Scholarship Name'))
    .setValue('Unstamped Scholarship');
  const scholarshipIdCol = columnOf(scholarships, 'Scholarship ID');

  const recruiting = mockSpreadsheet.insertSheet(
    CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);
  recruiting.getRange(1, 1, 1, CollegeTools.Config.HEADERS.RECRUITING_TRACKER.length)
    .setValues([CollegeTools.Config.HEADERS.RECRUITING_TRACKER]);
  recruiting.getRange(2, columnOf(recruiting, 'College Name')).setValue('Untouched University');
  recruiting.getRange(2, columnOf(recruiting, 'Coach/Contact Name')).setValue('Coach Readonly');
  const contactIdCol = columnOf(recruiting, 'Recruiting Contact ID');

  mockSpreadsheet.resetMutationCount();
  const firstContext = CollegeTools.TaskManagement.buildContextFromWorkbook(
    mockSpreadsheet, true);
  const secondContext = CollegeTools.TaskManagement.buildContextFromWorkbook(
    mockSpreadsheet, true);
  const firstManualId = CollegeTools.TaskManagement.readTasks(mockSpreadsheet, true)[0].taskId;
  const secondManualId = CollegeTools.TaskManagement.readTasks(mockSpreadsheet, true)[0].taskId;

  const preview = CollegeTools.TaskManagement.previewTaskPlan();
  const repeatedPreview = CollegeTools.TaskManagement.previewTaskPlan();

  suite.assert(preview.ok, 'Preview should still succeed');
  suite.assertEqual(JSON.stringify(preview), JSON.stringify(repeatedPreview),
    'Repeated previews should return the same result');
  suite.assertEqual(firstContext.colleges.length, 1,
    'A new college without a persisted ID should participate in Preview');
  suite.assert(firstContext.colleges[0].id.indexOf('PREVIEW:COLLEGE:ROW:3') === 0,
    'The new college should receive a deterministic in-memory preview ID');
  suite.assertEqual(firstContext.colleges[0].id, secondContext.colleges[0].id,
    'Preview-only college identity should be stable across reads');
  suite.assert(firstContext.scholarships[0].id.indexOf('PREVIEW:SCHOLARSHIP:ROW:2') === 0,
    'An unstamped scholarship should participate with an in-memory ID');
  suite.assert(firstContext.contacts[0].id.indexOf('PREVIEW:CONTACT:ROW:2') === 0,
    'An unstamped recruiting contact should participate with an in-memory ID');
  suite.assertEqual(firstManualId, secondManualId,
    'An unstamped manual task should keep deterministic identity across previews');
  suite.assertEqual(colleges.getRange(3, idCol).getValue(), '',
    'Preview should not assign a College ID to a new college row');
  suite.assertEqual(scholarships.getRange(2, scholarshipIdCol).getValue(), '',
    'Preview should not assign a Scholarship ID');
  suite.assertEqual(recruiting.getRange(2, contactIdCol).getValue(), '',
    'Preview should not assign a Recruiting Contact ID');
  suite.assertEqual(tasks.getRange(2, taskIdCol).getValue(), '',
    'Preview should not stamp a Task ID onto a partially entered custom row');
  suite.assertEqual(mockSpreadsheet.mutationCount, 0,
    'Preview and its read helpers should make zero mutations anywhere in the workbook');

  const generated = CollegeTools.TaskManagement.generateTaskPlan();
  suite.assert(generated.ok, 'Generate should still succeed after a preview');
  suite.assert(colleges.getRange(3, idCol).getValue() !== '',
    'Generate (unlike preview) should assign the College ID');
  suite.assert(tasks.getRange(2, taskIdCol).getValue() !== '',
    'Generate (unlike preview) should stamp the custom row Task ID');
  const generatedCatalogTasks = CollegeTools.TaskManagement.readTasks()
    .filter((task) => task.generated);
  suite.assertEqual(preview.generatedCount, generatedCatalogTasks.length,
    'Preview and Generate should produce the same number of catalog task instances');
});

suite.test('previewTaskPlan reports setup required without creating Task Settings', () => {
  setupWorkbook({});
  const settingsName = CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS;
  const settings = mockSpreadsheet.getSheetByName(settingsName);
  delete mockSpreadsheet.sheets[settingsName];
  mockSpreadsheet.sheetOrder = mockSpreadsheet.sheetOrder.filter((sheet) => sheet !== settings);
  mockSpreadsheet.resetMutationCount();

  const preview = CollegeTools.TaskManagement.previewTaskPlan();

  suite.assertEqual(preview.ok, false, 'Preview should fail cleanly before task setup');
  suite.assertEqual(preview.code, 'task_management_not_setup',
    'The result should direct the user to run Task Management Setup');
  suite.assertEqual(mockSpreadsheet.getSheetByName(settingsName), null,
    'Preview should not create the missing Task Settings sheet');
  suite.assertEqual(mockSpreadsheet.mutationCount, 0,
    'A setup-required Preview result should still make no workbook mutations');
});

suite.test('preview reports template counts before the empty Tasks table has any rows', () => {
  setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  setSetting('Working First Application Deadline', date(2026, 10, 28));
  setSetting('Planning Start Date', date(2026, 7, 30));
  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);

  suite.assertEqual(tasks.getLastRow(), 1, 'Precondition: Tasks should contain headers only');
  const preview = CollegeTools.TaskManagement.previewTaskPlan();

  suite.assert(preview.ok, 'Preview should succeed against a literally empty task table');
  suite.assert(preview.generatedCount > 0, 'Preview should report the generated instance count');
  suite.assertEqual(
    preview.applicableTemplateCount + preview.excludedTemplateCount,
    CollegeTools.TaskCatalog.validate().count,
    'Preview should report the complete included/excluded template count before generation');
  suite.assertEqual(tasks.getLastRow(), 1, 'Preview should leave the Tasks table empty');
});

suite.test('previewTaskPlan reports setup required without repairing malformed Task Settings', () => {
  setupWorkbook({});
  const settings = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS);
  settings.getRange(1, 1, 1, 3).setValues([['Wrong Setting Header', 'Value', 'Guidance']]);
  mockSpreadsheet.resetMutationCount();

  const preview = CollegeTools.TaskManagement.previewTaskPlan();

  suite.assertEqual(preview.ok, false, 'Preview should reject malformed settings cleanly');
  suite.assertEqual(preview.code, 'task_management_not_setup',
    'Malformed settings should direct the user to Setup');
  suite.assertEqual(settings.getRange(1, 1).getValue(), 'Wrong Setting Header',
    'Preview should not repair a malformed header');
  suite.assertEqual(mockSpreadsheet.mutationCount, 0,
    'Malformed-settings handling should make no workbook mutations');
});

suite.test('sheet setup and generation create conditional, hidden, canonical, and generated views', () => {
  const {colleges} = setupWorkbook({});
  const setup = CollegeTools.TaskManagement.setupTaskManagement();
  const templates = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.TASK_TEMPLATES);
  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);

  suite.assertEqual(setup.templateCount, CollegeTools.TaskCatalog.validate().count,
    'Setup should render every catalog template');
  suite.assert(templates.isSheetHidden(), 'Template sheet should be system-hidden');
  suite.assertEqual(templates.getColumnWidth(columnOf(templates, 'Task')), 360,
    'Hidden templates should remain readable when intentionally unhidden');
  suite.assertEqual(tasks.getLastRow(), 1, 'Blank template should not preload family tasks');
  suite.assertEqual(tasks.getMaxRows(), 200,
    'Tasks should use a bounded working surface instead of the default thousand rows');
  suite.assert(tasks.getFilter(), 'Tasks should provide a table filter');
  suite.assertEqual(tasks.getFilter().getRange().getNumRows(), tasks.getMaxRows(),
    'The task filter should cover the bounded task surface');
  tasks.getFilter().remove();
  tasks.getRange(1, 1, tasks.getMaxRows(), 5).createFilter();
  CollegeTools.TaskManagement.setupTaskManagement();
  suite.assertEqual(tasks.getFilter().getRange().getNumColumns(),
    CollegeTools.Config.HEADERS.TASKS.length,
  'Setup should safely expand a legacy narrow filter without reading out-of-range criteria');
  suite.assert(tasks.getRange(1, columnOf(tasks, 'Task ID')).getNote().includes('Stable identity'),
    'Task headers should explain preservation behavior');
  suite.assert(tasks.getRange(1, columnOf(tasks, 'Priority Override')).getNote().includes('overrides'),
    'Priority Override should explain how it affects calculated priority');
  suite.assert(tasks.getRange(1, columnOf(tasks, 'Evidence Source')).getNote().includes('tracker'),
    'Evidence Source should explain its tracker-derived provenance');
  const settings = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASK_SETTINGS);
  suite.assertEqual(
    settings.getLastRow(),
    CollegeTools.Config.TASK_MANAGEMENT_SETTINGS.length + 1,
    'Task Settings should render the centrally configured setting definitions');
  const settingsValues = settings.getRange(2, 1, settings.getLastRow() - 1, 3).getValues();
  const deadlineGuidance = settingsValues.find((row) =>
    row[0] === 'Working First Application Deadline')[2];
  suite.assert(deadlineGuidance.includes('Example:'),
    'Task Settings guidance should include concrete entry examples');
  suite.assert(settings.getRange(1, 2).getNote().includes('editable'),
    'The Value header should identify the user-editable settings column');
  [
    'Task ID', 'Template ID', 'Scope Type', 'Scope ID', 'College ID',
    'Applicability Rule', 'Schedule Rule', 'Schedule Anchor', 'Anchor Date',
    'Offset / Window', 'Owner Role', 'Calculated Date', 'Effective Date',
    'Date Source', 'Dependencies', 'Blocked By', 'Normal Effort (min)',
    'Manually Selected', 'Generated', 'Archived Reason',
  ].forEach((header) => {
    suite.assert(tasks.isColumnHiddenByUser(columnOf(tasks, header)),
      `${header} should be hidden as advanced task metadata`);
  });
  suite.assertEqual(tasks.getRowHeight(1), 36,
    'Tasks should use a compact readable header height');
  suite.assertEqual(tasks.getRowHeight(2), 42,
    'Tasks should use a bounded two-line working row height');
  [
    'Task', 'Owner', 'Owner Locked', 'Due Date', 'Date Locked',
    'Priority Override', 'Status', 'Effort Override (min)', 'Notes',
  ].forEach((header) => {
    suite.assert(!tasks.isColumnHiddenByUser(columnOf(tasks, header)),
      `${header} should remain visible as a day-to-day task control`);
  });
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
  const status = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.STATUS_TRACKER);
  status.getRange(2, columnOf(status, 'College Name')).setValue('Sheet University');
  status.getRange(2, columnOf(status, 'Application Status')).setValue('Decision Received');
  status.getRange(2, columnOf(status, 'Decision/Result')).setValue('Accepted');
  status.getRange(2, columnOf(status, 'Enrollment Choice')).setValue('Enroll');

  const generated = CollegeTools.TaskManagement.generateTaskPlan();
  const recruiting = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);
  const thisWeek = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.THIS_WEEK);
  const generatedTasks = CollegeTools.TaskManagement.readTasks();

  suite.assert(generated.ok && generated.taskCount > 0, 'Workbook plan generation should succeed');
  suite.assertEqual(
    generated.applicableTemplateCount + generated.excludedTemplateCount,
    CollegeTools.TaskCatalog.validate().count,
    'Generation should report included and excluded catalog counts');
  suite.assert(recruiting, 'Recruiting Tracker should be created when enabled');
  suite.assertEqual(recruiting.getIndex(),
    mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.CAMPUS_VISIT).getIndex() + 1,
  'Conditional Recruiting Tracker should be placed immediately after Campus Visit Tracker');
  suite.assert(generatedTasks.some((task) => task.templateId === 'ATH-01'),
    'Enabled recruiting tasks should be written to canonical Tasks');
  suite.assert(generatedTasks.some((task) => task.templateId === 'DEC-06'),
    'The tracker enrollment choice should reach the planner context');
  suite.assertEqual(thisWeek.getRange(1, 1).getValue(), 'Task',
    'This Week should lead with the user-facing action instead of an internal ID');
  suite.assert(thisWeek.isColumnHiddenByUser(columnOf(thisWeek, 'Task ID')),
    'This Week should retain its stable ID internally without showing it by default');
  const weeklyText = thisWeek.getRange(1, 1, thisWeek.getLastRow(), 2)
    .getValues().flat().join(' | ');
  suite.assert(weeklyText.includes('Decision Received: 1'),
    'Weekly report should summarize canonical application statuses');
  suite.assert(weeklyText.includes('Accepted: 1'),
    'Weekly report should summarize canonical decision results');
  suite.assert(weeklyText.includes('Master Plan'),
    'Generated views should point to the canonical Master Plan');
  suite.assert(weeklyText.includes('Owner View'),
    'Generated views should include a read-only task list by owner');
  suite.assert(weeklyText.includes('College View'),
    'Generated views should include a read-only task list by college');
  suite.assert(weeklyText.includes('Planning horizon'),
    'Generated views should show the active planning horizon');
  suite.assertEqual(thisWeek.getColumnWidth(1), 360,
    'This Week should give task descriptions and report labels enough horizontal space');
  suite.assertEqual(thisWeek.getColumnWidth(columnOf(thisWeek, 'Task')), 360,
    'This Week should provide a readable task-description column');
  suite.assertEqual(thisWeek.getRange(2, columnOf(thisWeek, 'Due Date')).getNumberFormats()[0][0],
    'yyyy-mm-dd', 'Task due dates should use the canonical calendar-date format');

  const unchangedPreview = CollegeTools.TaskManagement.previewTaskPlan();
  suite.assertEqual(unchangedPreview.preview.add, 0,
    'Preview after generation should not propose duplicate additions');
  suite.assertEqual(unchangedPreview.preview.archive, 0,
    'Preview after generation should not archive unchanged work');
  suite.assertEqual(unchangedPreview.preview.update, 0,
    'An unchanged workbook should produce an idempotent no-update preview');
});

suite.test('empty This Week report keeps numeric metrics numeric and explains empty sections', () => {
  setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  const thisWeek = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.THIS_WEEK);
  const values = thisWeek.getRange(1, 1, thisWeek.getLastRow(), 2).getValues();
  const rowFor = (label) => values.findIndex((row) => row[0] === label) + 1;
  const averageRow = rowFor('Average scheduled week (hours)');
  const warningRow = rowFor('Capacity warnings');
  const text = values.flat().join(' | ');

  suite.assert(averageRow > 0 && warningRow > 0, 'Weekly report metrics should be present');
  suite.assertEqual(thisWeek.getRange(averageRow, 2).getNumberFormats()[0][0], '0.0',
    'Effort metrics must not inherit the Due Date format');
  suite.assertEqual(thisWeek.getRange(warningRow, 2).getNumberFormats()[0][0], '0',
    'Count metrics should render as ordinary integers');
  suite.assert(text.includes('No task effort to summarize yet.'),
    'Empty effort breakdowns should explain why no rows are shown');
  suite.assert(text.includes('No open tasks due in the next 90 days.'),
    'An empty rolling view should provide an actionable empty state');
});

suite.test('rewriting the Tasks sheet never clears rows before their replacement values are written', () => {
  setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  setSetting('Working First Application Deadline', date(2026, 10, 28));
  setSetting('Planning Start Date', date(2026, 7, 30));

  // First generation populates the Tasks sheet with real rows to overwrite.
  const first = CollegeTools.TaskManagement.generateTaskPlan();
  suite.assert(first.ok && first.taskCount > 0,
    'First generation should populate the Tasks sheet so there is data to overwrite');

  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
  let clearCallsOnDataRange = 0;
  const originalGetRange = tasks.getRange.bind(tasks);
  tasks.getRange = function(row, col, numRows, numCols) {
    const range = originalGetRange(row, col, numRows, numCols);
    if (row === 2 && numRows > 1) {
      const originalClear = range.clearContent.bind(range);
      range.clearContent = function() {
        clearCallsOnDataRange++;
        return originalClear();
      };
    }
    return range;
  };

  // Second generation rewrites the same rows. It should overwrite them
  // directly rather than clearing the data block before writing new
  // values -- clearing first is the data-loss window: a mid-write
  // exception between clear and setValues would leave the sheet empty.
  const second = CollegeTools.TaskManagement.generateTaskPlan();

  tasks.getRange = originalGetRange;
  suite.assert(second.ok && second.taskCount > 0, 'Second generation should also succeed');
  suite.assertEqual(clearCallsOnDataRange, 0,
    'Rewriting existing task rows should overwrite them directly, never clear then write');
});

suite.test('custom tasks receive stable IDs and participate in weekly and effort views', () => {
  setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
  const plannedWeek = CollegeTools.TaskPlanner.startOfWeek(new Date());
  const customValues = {
    Workstream: 'Family Logistics',
    Stage: 'Our Stage',
    Module: 'Family Custom',
    Task: 'Arrange custom family transportation',
    Owner: 'Grandparent',
    'Owner Role': 'Custom',
    'Planned Week': plannedWeek,
    'Effort Override (min)': 90,
    Notes: 'Keep this family-specific note',
  };
  Object.keys(customValues).forEach((header) => {
    tasks.getRange(2, columnOf(tasks, header)).setValue(customValues[header]);
  });

  CollegeTools.TaskManagement.refreshTaskViews();
  const firstId = tasks.getRange(2, columnOf(tasks, 'Task ID')).getValue();
  const custom = CollegeTools.TaskManagement.readTasks()[0];
  const thisWeek = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.THIS_WEEK);
  const rendered = thisWeek.getRange(
    1, 1, thisWeek.getLastRow(), Math.max(2, thisWeek.getLastColumn())).getValues();

  suite.assert(/^MANUAL::/.test(firstId),
    'The first refresh should persist a stable ID for a newly entered custom task');
  suite.assertEqual(custom.taskId, firstId, 'Subsequent reads should reuse the persisted ID');
  suite.assertEqual(custom.status, 'Ready', 'A new custom task should receive a usable default status');
  suite.assertEqual(tasks.getRange(2, columnOf(tasks, 'Status')).getValue(), 'Ready',
    'First refresh should persist custom-task defaults in the canonical row');
  suite.assertEqual(tasks.getRange(2, columnOf(tasks, 'Generated')).getValue(), 'No',
    'Custom tasks should be visibly distinguished from system-generated work');
  suite.assertEqual(custom.module, 'Family Custom', 'Custom categories should remain free-form');
  suite.assertEqual(custom.adjustedEffortMinutes, 90,
    'A custom task effort override should feed workload calculations');
  suite.assert(rendered.some((row) => row.includes('Arrange custom family transportation')),
    'A custom task planned for the current week should appear in This Week');
  suite.assert(rendered.some((row) => row.includes('Effort By Module / Custom Category')),
    'The generated report should expose custom-category effort');
  suite.assert(rendered.some((row) => row[0] === 'Family Custom' && row[1] === 1.5),
    'Custom effort should contribute to the generated category dashboard');

  setSetting('Working First Application Deadline', date(2026, 11, 1));
  CollegeTools.TaskManagement.generateTaskPlan();
  CollegeTools.TaskManagement.setupTaskManagement();
  CollegeTools.TaskManagement.repairTaskManagement();
  const afterRepair = CollegeTools.TaskManagement.readTasks().find((task) => task.taskId === firstId);
  suite.assert(afterRepair, 'Custom tasks should survive generation, setup, and repair');
  suite.assertEqual(afterRepair.notes, 'Keep this family-specific note',
    'Custom task notes should survive generation, setup, and repair');
  suite.assertEqual(afterRepair.module, 'Family Custom',
    'Custom categories should survive generation, setup, and repair');
});

suite.test('tracker edits preserve a partially entered custom task row before its Task is typed', () => {
  setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  const tasks = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TASKS);
  const financialAid = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  tasks.getRange(2, columnOf(tasks, 'Owner')).setValue('Parent');
  tasks.getRange(2, columnOf(tasks, 'Notes')).setValue('Still composing this task');
  tasks.getRange(2, columnOf(tasks, 'Effort Override (min)')).setValue(75);

  CollegeTools.TaskManagement.handleEdit({range: financialAid.getRange(2, 1)});

  const partialId = tasks.getRange(2, columnOf(tasks, 'Task ID')).getValue();
  const partial = CollegeTools.TaskManagement.readTasks().find((task) =>
    task.taskId === partialId);
  suite.assert(/^MANUAL::/.test(partialId),
    'A nonblank in-progress row should receive stable identity before Task is entered');
  suite.assert(partial, 'Tracker synchronization should not delete the partial custom row');
  suite.assertEqual(partial.owner, 'Parent', 'Partial owner data should survive tracker sync');
  suite.assertEqual(partial.notes, 'Still composing this task',
    'Partial notes should survive tracker sync');
  suite.assertEqual(partial.effortOverrideMinutes, 75,
    'Partial effort should survive tracker sync');

  tasks.getRange(2, columnOf(tasks, 'Task')).setValue('Finish defining custom task');
  CollegeTools.TaskManagement.refreshTaskViews();
  const completedDefinition = CollegeTools.TaskManagement.readTasks().find((task) =>
    task.taskId === partialId);
  suite.assertEqual(completedDefinition.status, 'Ready',
    'Completing the task definition should apply normal custom-task defaults');
  suite.assertEqual(tasks.getRange(2, columnOf(tasks, 'Status')).getValue(), 'Ready',
    'Custom defaults should be persisted even when the stable ID was assigned earlier');
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

suite.test('supplemental prompt inventory creates stable per-prompt essay work', () => {
  const {colleges} = setupWorkbook({});
  colleges.getRange(3, columnOf(colleges, 'College Name', 2)).setValue('Prompt University');
  const timeline = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.APPLICATION_TIMELINE);
  timeline.getRange(2, columnOf(timeline, 'College Name')).setValue('Prompt University');
  timeline.getRange(2, columnOf(timeline, 'Application Deadline')).setValue(date(2026, 11, 1));
  timeline.getRange(2, columnOf(timeline, 'Supplemental Essays Required (#)')).setValue(2);
  timeline.getRange(2, columnOf(timeline, 'Supplemental Prompts / Topics'))
    .setValue('Why this college?||Describe your community');

  const context = CollegeTools.TaskManagement.buildContextFromWorkbook();
  const generated = CollegeTools.TaskPlanner.generatePlan(
    baseConfig(date(2026, 11, 1)), context, date(2026, 7, 30));
  const drafts = generated.tasks.filter((task) => task.templateId === 'ESS-08');

  suite.assertEqual(context.prompts.length, 2,
    'Two recorded prompts should become two planning scopes');
  suite.assertEqual(drafts.length, 2, 'Essay drafting should instantiate once per prompt');
  suite.assertEqual(new Set(drafts.map((task) => task.taskId)).size, 2,
    'Per-prompt task IDs should be stable and distinct from prompt wording');

  timeline.getRange(2, columnOf(timeline, 'Supplemental Essays Required (#)')).setValue(0);
  timeline.getRange(2, columnOf(timeline, 'Supplemental Prompts / Topics')).setValue('');
  suite.assertEqual(CollegeTools.TaskManagement.buildContextFromWorkbook().prompts.length, 0,
    'An explicit zero should suppress supplemental essay tasks for that college');
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

  const rowWidth = tasks.getLastColumn();
  const firstTwoValues = tasks.getRange(2, 1, 2, rowWidth).getValues();
  const firstTwoFormulas = tasks.getRange(2, 1, 2, rowWidth).getFormulas();
  const rowsWithFormulas = firstTwoValues.map((row, rowIndex) => row.map((value, columnIndex) =>
    firstTwoFormulas[rowIndex][columnIndex] || value));
  tasks.getRange(2, 1, 2, rowWidth).setValues(rowsWithFormulas.reverse());

  CollegeTools.TaskManagement.refreshTaskViews();
  CollegeTools.TaskManagement.setupTaskManagement();
  CollegeTools.TaskManagement.repairTaskManagement();
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
    '="Keep this"',
    'Custom-column formulas should follow stable Task ID through sort, setup, repair, and regeneration');
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

suite.test('recruiting tracker supports multiple stable coach contacts per college', () => {
  const {colleges} = setupWorkbook({});
  CollegeTools.TaskManagement.setupTaskManagement();
  setSetting('Working First Application Deadline', date(2026, 10, 28));
  setSetting('Athletic Recruiting Enabled', 'Yes');
  colleges.getRange(3, columnOf(colleges, 'College Name', 2)).setValue('Two Coach University');
  CollegeTools.TaskManagement.generateTaskPlan();
  const collegeId = colleges.getRange(3, columnOf(colleges, 'College ID', 2)).getValue();
  const recruiting = mockSpreadsheet.getSheetByName(
    CollegeTools.Config.SHEET_NAMES.RECRUITING_TRACKER);

  [2, 3].forEach((row, index) => {
    recruiting.getRange(row, columnOf(recruiting, 'College ID')).setValue(collegeId);
    recruiting.getRange(row, columnOf(recruiting, 'College Name')).setValue('Two Coach University');
    recruiting.getRange(row, columnOf(recruiting, 'Coach/Contact Name'))
      .setValue(index === 0 ? 'Head Coach' : 'Event Coach');
    recruiting.getRange(row, columnOf(recruiting, 'Next Follow-Up'))
      .setValue(date(2026, 8, 10 + index));
  });

  CollegeTools.TaskManagement.generateTaskPlan();
  const context = CollegeTools.TaskManagement.buildContextFromWorkbook();
  const ids = context.contacts.map((contact) => contact.contactId);
  const outreach = CollegeTools.TaskManagement.readTasks().filter((task) =>
    task.templateId === 'ATH-08' && !task.archivedReason);

  suite.assertEqual(context.contacts.length, 2,
    'Two coach rows for one college should remain distinct contacts');
  suite.assertEqual(new Set(ids).size, 2, 'Every coach contact should receive a stable unique ID');
  suite.assertEqual(outreach.length, 2, 'Contact-scoped outreach should generate once per coach');
  recruiting.getRange(3, columnOf(recruiting, 'Coach/Contact Name')).setValue('Renamed Event Coach');
  const renamedContext = CollegeTools.TaskManagement.buildContextFromWorkbook();
  suite.assertEqual(renamedContext.contacts[1].contactId, ids[1],
    'Editing a coach name should not replace the stable contact identity');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
