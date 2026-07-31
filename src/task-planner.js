/**
 * Adaptive task scheduling, generation, reconciliation, evidence, and views
 * @version 2.7.0
 * @author College Tools
 * @description Pure planning engine for college application task management
 */

/**
 * CollegeTools.TaskPlanner - Pure adaptive planning engine.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.TaskPlanner = (function() {
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;
  var COMPLETE_STATUSES = {Complete: true, Skipped: true};
  var DECISION_TASKS = {
    'STR-03': true, 'STR-06': true, 'STR-07': true, 'STR-08': true,
    'COL-08': true, 'COL-09': true, 'COL-10': true, 'AID-11': true,
    'SCH-05': true, 'TST-02': true, 'TST-05': true,
  };

  /**
   * Returns a date-only local Date or null.
   * @param {*} value - Date-compatible input
   * @returns {Date|null} Normalized date
   */
  function toDate(value) {
    if (!value) return null;
    var date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Adds whole days to a date.
   * @param {Date} date - Base date
   * @param {number} days - Day offset
   * @returns {Date} Shifted date
   */
  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  /**
   * Returns an ISO-like local date key.
   * @param {Date|null} date - Date
   * @returns {string} YYYY-MM-DD or blank
   */
  function dateKey(date) {
    if (!date) return '';
    var month = String(date.getMonth() + 1);
    var day = String(date.getDate());
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return date.getFullYear() + '-' + month + '-' + day;
  }

  /**
   * Returns the Monday containing a date.
   * @param {Date} date - Date
   * @returns {Date} Monday date
   */
  function startOfWeek(date) {
    var day = date.getDay();
    var offset = day === 0 ? -6 : 1 - day;
    return addDays(date, offset);
  }

  /**
   * Returns the earliest valid date.
   * @param {Array<*>} values - Candidate dates
   * @returns {Date|null} Earliest date
   */
  function earliest(values) {
    var best = null;
    (values || []).forEach(function(value) {
      var date = toDate(value);
      if (date && (!best || date.getTime() < best.getTime())) best = date;
    });
    return best;
  }

  /**
   * Returns a labeled default deadline when only an application round is known.
   * @param {Object} college - College
   * @param {Object} config - Configuration
   * @returns {Date|null} Round default
   */
  function applicationRoundDeadline_(college, config) {
    var round = (college.applicationType || '').toString().trim().toUpperCase();
    if (!round) return null;
    var fallYear = null;
    var cycleMatch = /^(\d{4})/.exec((config.applicationCycle || '').toString());
    if (cycleMatch) fallYear = Number(cycleMatch[1]);
    if (!fallYear && Number(config.graduationYear) > 2000) {
      fallYear = Number(config.graduationYear) - 1;
    }
    if (!fallYear && config.workingDeadline) {
      fallYear = config.workingDeadline.getMonth() < 6 ?
        config.workingDeadline.getFullYear() - 1 : config.workingDeadline.getFullYear();
    }
    if (!fallYear) return null;
    if (round === 'ED2' || round === 'RD') return new Date(fallYear + 1, 0, 15);
    if (round === 'ROLLING') return new Date(fallYear + 1, 1, 1);
    return new Date(fallYear, 10, 1);
  }

  /**
   * Coerces user-facing yes/no values.
   * @param {*} value - Input
   * @param {boolean} fallback - Default
   * @returns {boolean} Boolean
   */
  function asBoolean(value, fallback) {
    if (value === true || value === false) return value;
    var text = (value || '').toString().trim().toLowerCase();
    if (['yes', 'y', 'true', '1', 'enabled'].indexOf(text) !== -1) return true;
    if (['no', 'n', 'false', '0', 'disabled'].indexOf(text) !== -1) return false;
    return fallback;
  }

  /**
   * Applies stable defaults without inventing student or deadline values.
   * @param {Object=} config - Raw configuration
   * @returns {Object} Normalized configuration
   */
  function normalizeConfig(config) {
    config = config || {};
    var modules = config.modules || {};
    var roleNames = config.roleNames || {};
    var thresholds = config.roleThresholds || {};
    return {
      planningStartDate: toDate(config.planningStartDate),
      workingDeadline: toDate(config.workingDeadline),
      fafsaAvailabilityDate: toDate(config.fafsaAvailabilityDate),
      graduationYear: config.graduationYear || '',
      currentGrade: config.currentGrade || '',
      applicationCycle: config.applicationCycle || '',
      counselorAvailable: asBoolean(config.counselorAvailable, false),
      parentEffortMultiplier: Math.max(0.1, Number(config.parentEffortMultiplier) || 1),
      roleNames: {
        'Student': roleNames.Student || 'Student',
        'Parent/Guardian': roleNames['Parent/Guardian'] || 'Parent/Guardian',
        'Counselor/Professional': roleNames['Counselor/Professional'] || 'Counselor/Professional',
        'Shared': roleNames.Shared || 'Shared',
        'External dependency': roleNames['External dependency'] || 'External dependency',
      },
      modules: {
        'Testing': asBoolean(modules.Testing, false),
        'Athletic Recruiting': asBoolean(modules['Athletic Recruiting'], false),
        'CSS Profile': asBoolean(modules['CSS Profile'], false),
        'Visits': asBoolean(modules.Visits, false),
        'Interviews': asBoolean(modules.Interviews, false),
        'Portfolio/Audition': asBoolean(modules['Portfolio/Audition'], false),
        'Professional Support': asBoolean(modules['Professional Support'], false),
      },
      effortOverrides: config.effortOverrides || {},
      roleThresholds: {
        'Student': thresholds.Student === '' || thresholds.Student === undefined ?
          '' : Math.max(0, Number(thresholds.Student) || 0),
        'Parent/Guardian': thresholds['Parent/Guardian'] === '' ||
          thresholds['Parent/Guardian'] === undefined ?
          '' : Math.max(0, Number(thresholds['Parent/Guardian']) || 0),
        'Shared': thresholds.Shared === '' || thresholds.Shared === undefined ?
          '' : Math.max(0, Number(thresholds.Shared) || 0),
      },
      weeklyThresholdOverrides: config.weeklyThresholdOverrides || {},
      customOwners: config.customOwners || [],
    };
  }

  /**
   * Returns whether a template applies to the configured modules and horizon.
   * @param {Object} template - Catalog template
   * @param {Object} config - Normalized configuration
   * @param {Date} today - Planning date
   * @param {Date} firstDeadline - First relevant deadline
   * @returns {boolean} Applicability
   */
  function templateEnabled_(template, config, today, firstDeadline) {
    if (template.module !== 'Core' && !config.modules[template.module]) return false;
    if (template.templateId === 'PRO-08' && firstDeadline &&
        firstDeadline.getTime() - today.getTime() <= 183 * DAY_MS) return false;
    return true;
  }

  /**
   * Normalizes scope data and supplies a stable ID.
   * @param {Object} item - Scope item
   * @param {string} fallbackPrefix - ID prefix
   * @param {number} index - Array index
   * @returns {Object} Scope
   */
  function normalizeScope_(item, fallbackPrefix, index) {
    item = item || {};
    var id = item.id || item.collegeId || item.contactId || item.scholarshipId ||
      item.promptId || fallbackPrefix + '-' + (index + 1);
    return {
      id: String(id),
      collegeId: item.collegeId || item.id || '',
      collegeName: item.collegeName || item.name || '',
      label: item.label || item.prompt || item.scholarshipName || item.collegeName ||
        item.name || String(id),
      data: item,
    };
  }

  /**
   * Returns relevant scope instances for a template.
   * @param {Object} template - Template
   * @param {Object} context - Planning context
   * @returns {Array<Object>} Scopes
   */
  function scopesFor_(template, context) {
    var source = [];
    var filter = null;
    var fallbackPrefix = template.scope.toUpperCase();
    switch (template.scope) {
      case 'college':
        source = context.colleges || [];
        break;
      case 'scholarship':
        source = context.scholarships || [];
        break;
      case 'contact':
        source = context.contacts || [];
        break;
      case 'visit':
        source = context.visits || [];
        break;
      case 'interview':
        source = context.interviews || [];
        break;
      case 'portfolio':
        source = context.colleges || [];
        filter = function(item) {
          return asBoolean(item.portfolioRequired, false) || !!item.portfolioDeadline;
        };
        break;
      case 'prompt':
        source = context.prompts || [];
        if (!source.length) {
          source = (context.colleges || []).filter(function(college) {
            return college.supplementsRequired !== false;
          }).map(function(college) {
            return {
              id: (college.id || college.collegeId) + '-supplement',
              collegeId: college.id || college.collegeId,
              collegeName: college.name || college.collegeName,
              label: (college.name || college.collegeName) + ' supplemental response',
              applicationDeadline: college.applicationDeadline,
            };
          });
        }
        break;
      case 'global':
        return [{id: 'GLOBAL', collegeId: '', collegeName: '', label: '', data: {}}];
      default:
        return [];
    }
    if (filter) source = source.filter(filter);
    return source.map(function(item, index) {
      return normalizeScope_(item, fallbackPrefix, index);
    });
  }

  /**
   * Finds a college in context by stable ID.
   * @param {Object} context - Planning context
   * @param {string} collegeId - College ID
   * @returns {Object|null} College
   */
  function findCollege_(context, collegeId) {
    var colleges = context.colleges || [];
    for (var i = 0; i < colleges.length; i++) {
      if (String(colleges[i].id || colleges[i].collegeId) === String(collegeId)) return colleges[i];
    }
    return null;
  }

  /**
   * Collects every deadline capable of driving shared prerequisite work.
   * @param {Object} config - Configuration
   * @param {Object} context - Planning context
   * @returns {Date|null} Earliest deadline
   */
  function earliestRelevantDeadline_(config, context) {
    var dates = [config.workingDeadline];
    (context.colleges || []).forEach(function(college) {
      dates.push(
        college.applicationDeadline,
        applicationRoundDeadline_(college, config),
        college.meritDeadline,
        college.honorsDeadline,
        college.aidDeadline,
        college.transcriptDeadline,
        college.teacherRecDeadline,
        college.counselorRecDeadline,
        college.testScoreDeadline,
        college.portfolioDeadline,
      );
    });
    (context.scholarships || []).forEach(function(item) {
      dates.push(item.deadline);
    });
    (context.contacts || []).forEach(function(item) {
      dates.push(item.nextFollowUp);
    });
    return earliest(dates);
  }

  /**
   * Resolves the base deadline and provenance for a task.
   * @param {Object} template - Template
   * @param {Object} scope - Scope
   * @param {Object} config - Config
   * @param {Object} context - Context
   * @param {Date} firstDeadline - Earliest relevant deadline
   * @returns {Object} Base date and source
   */
  function deadlineFor_(template, scope, config, context, firstDeadline) {
    var data = scope.data || {};
    var college = scope.collegeId ? findCollege_(context, scope.collegeId) : null;
    var id = template.templateId;
    var candidates = [];
    var source = 'Working first-application target';

    if (template.scope === 'scholarship') {
      candidates = [data.deadline, config.workingDeadline];
      source = data.deadline ? 'Scholarship deadline' : source;
    } else if (template.scope === 'contact') {
      candidates = [data.nextFollowUp, college && college.applicationDeadline, config.workingDeadline];
      source = data.nextFollowUp ? 'Recruiting next action' : 'College application deadline';
    } else if (template.scope === 'visit') {
      candidates = [data.visitDate, college && college.applicationDeadline, config.workingDeadline];
      source = data.visitDate ? 'Visit date' : 'College application deadline';
    } else if (template.scope === 'interview') {
      candidates = [data.interviewDate, college && college.applicationDeadline, config.workingDeadline];
      source = data.interviewDate ? 'Interview date' : 'College application deadline';
    } else if (template.scope === 'portfolio') {
      candidates = [college && college.portfolioDeadline, college && college.applicationDeadline,
        config.workingDeadline];
      source = college && college.portfolioDeadline ? 'Portfolio deadline' : 'College application deadline';
    } else if (template.scope === 'prompt') {
      candidates = [data.applicationDeadline, college && college.applicationDeadline, config.workingDeadline];
      source = data.applicationDeadline || (college && college.applicationDeadline) ?
        'College application deadline' : source;
    } else if (college) {
      var roundDefault = applicationRoundDeadline_(college, config);
      if (id.indexOf('AID-') === 0) {
        candidates = [
          college.aidDeadline, college.applicationDeadline, roundDefault, config.workingDeadline,
        ];
        source = college.aidDeadline ? 'College aid-priority deadline' : 'College application deadline';
      } else if (id.indexOf('SCH-') === 0) {
        candidates = [
          college.meritDeadline, college.honorsDeadline, college.applicationDeadline,
          roundDefault, config.workingDeadline,
        ];
        source = college.meritDeadline || college.honorsDeadline ?
          'Merit or honors deadline' : 'College application deadline';
      } else if (id === 'TST-06') {
        candidates = [
          college.testScoreDeadline, college.applicationDeadline, roundDefault,
          config.workingDeadline,
        ];
        source = college.testScoreDeadline ? 'Test-score deadline' : 'College application deadline';
      } else if (id === 'REC-07') {
        candidates = [college.transcriptDeadline, college.teacherRecDeadline,
          college.counselorRecDeadline, college.applicationDeadline, roundDefault,
          config.workingDeadline];
        source = 'Earliest school-document deadline';
      } else {
        candidates = [college.applicationDeadline, roundDefault, config.workingDeadline];
        source = college.applicationDeadline ? 'College application deadline' :
          (roundDefault ? 'Application-round default; confirm manually' : source);
      }
    } else if (id.indexOf('AID-') === 0) {
      (context.colleges || []).forEach(function(item) {
        candidates.push(item.aidDeadline);
      });
      candidates.push(config.workingDeadline);
      source = earliest(candidates.slice(0, candidates.length - 1)) ?
        'Earliest aid-priority deadline' : source;
    } else if (id.indexOf('SCH-') === 0) {
      (context.colleges || []).forEach(function(item) {
        candidates.push(item.meritDeadline, item.honorsDeadline);
      });
      (context.scholarships || []).forEach(function(item) {
        candidates.push(item.deadline);
      });
      candidates.push(config.workingDeadline);
      source = earliest(candidates.slice(0, candidates.length - 1)) ?
        'Earliest merit, honors, or scholarship deadline' : source;
    } else {
      candidates = [firstDeadline, config.workingDeadline];
      source = firstDeadline ? 'Earliest relevant deadline' : source;
    }
    return {date: earliest(candidates), source: source};
  }

  /**
   * Resolves accountable ownership with professional fallback and custom names.
   * @param {Object} template - Template
   * @param {Object} config - Configuration
   * @returns {Object} Owner role, owner, support
   */
  function ownerFor_(template, config) {
    var ownerRole = template.ownerRole;
    if (ownerRole === 'Counselor/Professional' && !config.counselorAvailable) {
      ownerRole = 'Shared';
    }
    var support = template.supportRole;
    if (support === 'Counselor/Professional' && !config.counselorAvailable) support = '';
    return {
      ownerRole: ownerRole,
      owner: config.roleNames[ownerRole] || ownerRole,
      supportRole: support,
    };
  }

  /**
   * Builds a deterministic task ID.
   * @param {string} templateId - Template ID
   * @param {Object} scope - Scope
   * @returns {string} Task ID
   */
  function taskId_(templateId, scope) {
    return templateId + '::' + scope.id;
  }

  /**
   * Calculates task effort after configured role and task adjustments.
   * @param {Object} template - Template
   * @param {Object} owner - Resolved owner
   * @param {Object} config - Configuration
   * @param {string} taskId - Instance ID
   * @returns {Object} Effort values
   */
  function effortFor_(template, owner, config, taskId) {
    var override = config.effortOverrides[taskId];
    if (override === undefined) override = config.effortOverrides[template.templateId];
    override = Number(override);
    if (!(override > 0)) override = '';
    var multiplier = owner.ownerRole === 'Parent/Guardian' ? config.parentEffortMultiplier : 1;
    var adjusted = override || Math.round(template.effortMinutes * multiplier);
    return {
      normalEffortMinutes: template.effortMinutes,
      adjustedEffortMinutes: adjusted,
      effortOverrideMinutes: override,
    };
  }

  /**
   * Calculates priority and schedule warning.
   * @param {Date} dueDate - Due date
   * @param {Date} today - Current date
   * @param {string} templateId - Template ID
   * @returns {Object} Priority and schedule flag
   */
  function urgencyFor_(dueDate, today, templateId) {
    if (!dueDate) return {priority: 'Normal', scheduleFlag: 'Needs date'};
    var days = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);
    if (days < 0) {
      return {
        priority: 'Critical',
        scheduleFlag: templateId.indexOf('SUB-03') === 0 ? 'Missed deadline' : 'Late start',
      };
    }
    if (days <= 14) return {priority: 'Critical', scheduleFlag: 'Urgent'};
    if (days <= 30) return {priority: 'High', scheduleFlag: 'Compressed'};
    if (days <= 90) return {priority: 'Normal', scheduleFlag: 'In rolling 90 days'};
    return {priority: 'Low', scheduleFlag: 'Future'};
  }

  /**
   * Generates weekly control instances only within the rolling 90-day window.
   * @param {Object} template - PM template
   * @param {Object} config - Configuration
   * @param {Date} today - Today
   * @param {Date} firstDeadline - Earliest deadline
   * @returns {Array<Object>} Weekly scopes
   */
  function recurringScopes_(template, config, today, firstDeadline) {
    var start = config.planningStartDate && config.planningStartDate > today ?
      config.planningStartDate : today;
    var end = addDays(today, 90);
    if (firstDeadline && firstDeadline < end) end = firstDeadline;
    var week = startOfWeek(start);
    var scopes = [];
    while (week <= end) {
      scopes.push({
        id: dateKey(week),
        collegeId: '',
        collegeName: '',
        label: 'Week of ' + dateKey(week),
        data: {weekDate: new Date(week.getTime())},
      });
      week = addDays(week, 7);
    }
    return scopes;
  }

  /**
   * Generates the complete applicable task roadmap.
   * @param {Object} rawConfig - Family configuration
   * @param {Object=} context - Colleges, deadlines, opportunities, and contacts
   * @param {Date=} todayValue - Override current date for tests
   * @returns {Object} Generation result
   */
  function generatePlan(rawConfig, context, todayValue) {
    var config = normalizeConfig(rawConfig);
    context = context || {};
    var today = toDate(todayValue) || toDate(new Date());
    var firstDeadline = earliestRelevantDeadline_(config, context);
    var validation = CollegeTools.TaskCatalog.validate();
    if (!validation.ok) {
      return {ok: false, code: 'invalid_catalog', errors: validation.errors, tasks: []};
    }
    if (!config.workingDeadline && !firstDeadline) {
      return {
        ok: false,
        code: 'missing_deadline',
        errors: ['Set a working first-application deadline or college deadline before generating tasks.'],
        tasks: [],
      };
    }

    var templates = CollegeTools.TaskCatalog.getTemplates();
    var templateById = {};
    templates.forEach(function(template) {
      templateById[template.templateId] = template;
    });
    var tasks = [];

    templates.forEach(function(template) {
      if (!templateEnabled_(template, config, today, firstDeadline)) return;
      var scopes = template.scope === 'recurring' ?
        recurringScopes_(template, config, today, firstDeadline) :
        scopesFor_(template, context);
      scopes.forEach(function(scope) {
        var base = template.scope === 'recurring' ?
          {date: scope.data.weekDate, source: 'Weekly recurrence'} :
          deadlineFor_(template, scope, config, context, firstDeadline);
        var calculatedDate = base.date ? addDays(base.date, template.offsetDays) : null;
        if (template.scope === 'recurring') calculatedDate = scope.data.weekDate;
        if (config.fafsaAvailabilityDate && template.templateId === 'AID-02') {
          calculatedDate = addDays(config.fafsaAvailabilityDate, -14);
          base.source = 'FAFSA availability date';
        }
        if (config.fafsaAvailabilityDate && template.templateId === 'AID-06') {
          var earlySubmissionTarget = base.date ? addDays(base.date, -20) :
            config.fafsaAvailabilityDate;
          calculatedDate = earlySubmissionTarget < config.fafsaAvailabilityDate ?
            config.fafsaAvailabilityDate : earlySubmissionTarget;
          base.source = 'FAFSA availability and earliest aid-priority deadline';
        }
        if (config.fafsaAvailabilityDate && template.templateId === 'AID-07') {
          var reviewTarget = addDays(config.fafsaAvailabilityDate, 7);
          var aidReviewTarget = base.date ? addDays(base.date, -14) : reviewTarget;
          calculatedDate = aidReviewTarget < reviewTarget ? reviewTarget : aidReviewTarget;
          base.source = 'FAFSA submission window and earliest aid-priority deadline';
        }
        var id = taskId_(template.templateId, scope);
        var owner = ownerFor_(template, config);
        var effort = effortFor_(template, owner, config, id);
        var urgency = urgencyFor_(calculatedDate, today, template.templateId);
        if (template.templateId === 'AID-06' && config.fafsaAvailabilityDate &&
            base.date && config.fafsaAvailabilityDate > base.date) {
          urgency.priority = 'Critical';
          urgency.scheduleFlag = 'Not feasible: availability follows aid deadline';
        }
        var title = template.task;
        if (scope.label && scope.id !== 'GLOBAL') title += ' — ' + scope.label;
        tasks.push({
          taskId: id,
          templateId: template.templateId,
          workstream: template.workstream,
          stage: template.stage,
          module: template.module,
          scopeType: template.scope,
          scopeId: scope.id,
          college: scope.collegeName,
          collegeId: scope.collegeId,
          task: title,
          owner: owner.owner,
          ownerRole: owner.ownerRole,
          ownerLocked: false,
          supportRole: owner.supportRole,
          calculatedDate: calculatedDate,
          dueDate: calculatedDate,
          dateSource: base.source,
          dateLocked: false,
          plannedWeek: calculatedDate ? startOfWeek(calculatedDate < today ? today : calculatedDate) : null,
          scheduledBlock: '',
          scheduleFlag: urgency.scheduleFlag,
          priority: urgency.priority,
          priorityOverride: '',
          status: 'Not Started',
          dependencies: [],
          blockedBy: '',
          normalEffortMinutes: effort.normalEffortMinutes,
          adjustedEffortMinutes: effort.adjustedEffortMinutes,
          effortOverrideMinutes: effort.effortOverrideMinutes,
          deliverable: template.deliverable,
          resourceLinks: template.resourceLinks,
          decisionNeeded: !!DECISION_TASKS[template.templateId],
          evidenceSource: '',
          completionDate: null,
          notes: '',
          manuallySelected: false,
          generated: true,
          archivedReason: '',
        });
      });
    });

    var taskById = {};
    var tasksByTemplate = {};
    tasks.forEach(function(task) {
      taskById[task.taskId] = task;
      tasksByTemplate[task.templateId] = tasksByTemplate[task.templateId] || [];
      tasksByTemplate[task.templateId].push(task);
    });
    tasks.forEach(function(task) {
      var template = templateById[task.templateId];
      var dependencyTaskIds = [];
      template.dependencies.forEach(function(dependencyId) {
        var dependency = templateById[dependencyId];
        var candidates = tasksByTemplate[dependencyId] || [];
        if (dependency && dependency.scope === 'global') {
          candidates = candidates.filter(function(candidate) {
            return candidate.scopeId === 'GLOBAL';
          });
        } else if (dependency && dependency.scope === task.scopeType) {
          candidates = candidates.filter(function(candidate) {
            return candidate.scopeId === task.scopeId;
          });
        } else if (task.collegeId) {
          candidates = candidates.filter(function(candidate) {
            return candidate.collegeId === task.collegeId;
          });
        }
        candidates.forEach(function(candidate) {
          if (dependencyTaskIds.indexOf(candidate.taskId) === -1) {
            dependencyTaskIds.push(candidate.taskId);
          }
        });
      });
      task.dependencies = dependencyTaskIds.filter(function(dependencyTaskId) {
        return !!taskById[dependencyTaskId];
      });
      if (!task.dependencies.length) task.status = 'Ready';
    });
    var dependentCounts = {};
    tasks.forEach(function(task) {
      task.dependencies.forEach(function(dependencyTaskId) {
        dependentCounts[dependencyTaskId] = (dependentCounts[dependencyTaskId] || 0) + 1;
      });
    });
    tasks.forEach(function(task) {
      var dueDate = toDate(task.dueDate);
      if (dependentCounts[task.taskId] && dueDate && dueDate <= addDays(today, 90) &&
          (task.priority === 'Normal' || task.priority === 'Low')) {
        task.priority = 'High';
        task.scheduleFlag += '; prerequisite path';
      }
    });

    tasks.sort(compareTasks_);
    return {
      ok: true,
      code: 'plan_generated',
      tasks: tasks,
      templateCount: validation.count,
      applicableTemplateCount: templates.filter(function(template) {
        return templateEnabled_(template, config, today, firstDeadline);
      }).length,
      firstDeadline: firstDeadline,
      today: today,
      config: config,
    };
  }

  /**
   * Stable task sort by due date, template, and task ID.
   * @param {Object} left - Task
   * @param {Object} right - Task
   * @returns {number} Ordering
   */
  function compareTasks_(left, right) {
    var leftTime = toDate(left.dueDate) ? toDate(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    var rightTime = toDate(right.dueDate) ? toDate(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) return leftTime - rightTime;
    if (left.templateId !== right.templateId) return left.templateId < right.templateId ? -1 : 1;
    return left.taskId < right.taskId ? -1 : (left.taskId > right.taskId ? 1 : 0);
  }

  /**
   * Returns a shallow task copy.
   * @param {Object} task - Task
   * @returns {Object} Copy
   */
  function copyTask_(task) {
    var copy = {};
    Object.keys(task).forEach(function(key) {
      copy[key] = task[key];
    });
    if (task.dependencies) copy.dependencies = task.dependencies.slice();
    return copy;
  }

  /**
   * Merges a regenerated task with preserved user-owned fields.
   * @param {Object} generated - New generated task
   * @param {Object} existing - Existing task
   * @returns {Object} Merged task
   */
  function mergeTask_(generated, existing) {
    var merged = copyTask_(generated);
    var alwaysPreserve = [
      'status', 'notes', 'evidenceSource', 'completionDate', 'manuallySelected',
      'resourceLinks', 'priorityOverride', 'effortOverrideMinutes', 'scheduledBlock',
    ];
    alwaysPreserve.forEach(function(field) {
      if (existing[field] !== '' && existing[field] !== null && existing[field] !== undefined) {
        merged[field] = existing[field];
      }
    });
    if (asBoolean(existing.ownerLocked, false)) {
      merged.owner = existing.owner;
      merged.ownerRole = existing.ownerRole;
      merged.ownerLocked = true;
    }
    if (asBoolean(existing.dateLocked, false)) {
      merged.dueDate = existing.dueDate;
      merged.plannedWeek = existing.plannedWeek;
      merged.dateLocked = true;
    }
    if (Number(existing.effortOverrideMinutes) > 0) {
      merged.effortOverrideMinutes = Number(existing.effortOverrideMinutes);
      merged.adjustedEffortMinutes = Number(existing.effortOverrideMinutes);
    }
    if (existing.priorityOverride) merged.priority = existing.priorityOverride;

    if (existing.status === 'Complete') {
      // Completed work is an audit record: keep its effective execution fields.
      ['task', 'owner', 'ownerRole', 'supportRole', 'dueDate', 'plannedWeek',
        'adjustedEffortMinutes', 'deliverable'].forEach(function(field) {
        if (existing[field] !== '' && existing[field] !== null && existing[field] !== undefined) {
          merged[field] = existing[field];
        }
      });
    }
    merged.archivedReason = '';
    return merged;
  }

  /**
   * Recalculates dependency readiness without overriding active/manual statuses.
   * @param {Array<Object>} tasks - Reconciled tasks
   */
  function updateDependencyState_(tasks) {
    var byId = {};
    tasks.forEach(function(task) {
      byId[task.taskId] = task;
    });
    tasks.forEach(function(task) {
      if (COMPLETE_STATUSES[task.status] || task.status === 'In Progress' ||
          task.status === 'Waiting' || task.status === 'Blocked') return;
      var incomplete = (task.dependencies || []).filter(function(dependencyId) {
        var dependency = byId[dependencyId];
        return dependency && !COMPLETE_STATUSES[dependency.status];
      });
      task.blockedBy = incomplete.join(', ');
      task.status = incomplete.length ? 'Not Started' : 'Ready';
    });
  }

  /**
   * Reconciles regenerated tasks with an existing canonical task table.
   * @param {Array<Object>} generatedTasks - Fresh generated tasks
   * @param {Array<Object>} existingTasks - Current task rows
   * @returns {Object} Reconciled tasks and preview
   */
  function reconcile(generatedTasks, existingTasks) {
    generatedTasks = generatedTasks || [];
    existingTasks = existingTasks || [];
    var existingById = {};
    existingTasks.forEach(function(task) {
      if (task.taskId) existingById[task.taskId] = task;
    });
    var generatedIds = {};
    var tasks = [];
    var preview = {
      add: 0, update: 0, unchanged: 0, archive: 0,
      reassign: 0, reschedule: 0, dependencyChanges: 0, effortChanges: 0,
      preserveComplete: 0,
    };

    generatedTasks.forEach(function(generated) {
      generatedIds[generated.taskId] = true;
      var existing = existingById[generated.taskId];
      if (!existing) {
        preview.add++;
        tasks.push(copyTask_(generated));
        return;
      }
      var merged = mergeTask_(generated, existing);
      if (existing.status === 'Complete') preview.preserveComplete++;
      if (!asBoolean(existing.ownerLocked, false) && existing.owner !== generated.owner) preview.reassign++;
      if (!asBoolean(existing.dateLocked, false) &&
          dateKey(toDate(existing.dueDate)) !== dateKey(toDate(generated.dueDate))) preview.reschedule++;
      if ((existing.dependencies || []).join(',') !== generated.dependencies.join(',')) {
        preview.dependencyChanges++;
      }
      if (Number(existing.adjustedEffortMinutes) !== Number(merged.adjustedEffortMinutes)) {
        preview.effortChanges++;
      }
      var changed = JSON.stringify(merged) !== JSON.stringify(existing);
      preview[changed ? 'update' : 'unchanged']++;
      tasks.push(merged);
    });

    existingTasks.forEach(function(existing) {
      if (generatedIds[existing.taskId]) return;
      if (!existing.templateId || !asBoolean(existing.generated, false)) {
        tasks.push(copyTask_(existing));
        return;
      }
      var archived = copyTask_(existing);
      if (archived.status !== 'Complete') archived.status = 'Skipped';
      archived.archivedReason = archived.archivedReason ||
        'No longer applicable after task-plan reconfiguration';
      preview.archive++;
      tasks.push(archived);
    });
    updateDependencyState_(tasks);
    tasks.sort(compareTasks_);
    return {tasks: tasks, preview: preview};
  }

  /**
   * Finds reliable or suggestive completion evidence for one task.
   * @param {Object} task - Task
   * @param {Object} context - Context with tracker-derived fields
   * @returns {Object|null} Evidence
   */
  function completionEvidence_(task, context) {
    var college = task.collegeId ? findCollege_(context, task.collegeId) : null;
    var id = task.templateId;
    var data = null;
    if (task.scopeType === 'scholarship') {
      (context.scholarships || []).forEach(function(item) {
        if (String(item.id || item.scholarshipId) === String(task.scopeId)) data = item;
      });
    } else if (task.scopeType === 'contact') {
      (context.contacts || []).forEach(function(item) {
        if (String(item.id || item.contactId) === String(task.scopeId)) data = item;
      });
    } else if (task.scopeType === 'visit') {
      (context.visits || []).forEach(function(item) {
        if (String(item.id || item.visitId) === String(task.scopeId)) data = item;
      });
    }

    if (id === 'AID-06' && (context.fafsaSubmittedDate || context.fafsaSubmitted)) {
      return {reliable: true, source: 'Financial Aid Tracker: FAFSA Submitted', date: context.fafsaSubmittedDate};
    }
    if (id === 'AID-10' && context.cssProfileSubmitted) {
      return {reliable: true, source: 'Financial Aid Tracker: CSS Profile Submitted', date: context.cssProfileSubmittedDate};
    }
    if (id === 'SCH-06' && data && data.submittedDate) {
      return {reliable: true, source: 'Scholarship Tracker: Application Submitted Date', date: data.submittedDate};
    }
    if (id === 'SCH-07' && data && data.awardStatus) {
      return {reliable: true, source: 'Scholarship Tracker: Award Status', date: data.decisionDate};
    }
    if (id === 'TST-06' && college && asBoolean(college.testScoresSent, false)) {
      return {reliable: true, source: 'Application Status Tracker: Test Scores Sent'};
    }
    if (id === 'REC-07' && college &&
        asBoolean(college.transcriptSent, false) && asBoolean(college.recommendationsComplete, false)) {
      return {reliable: true, source: 'Application Status Tracker: transcript and recommendations complete'};
    }
    if (id === 'ESS-10' && college && asBoolean(college.essaysComplete, false)) {
      return {reliable: true, source: 'Application Status Tracker: Essays Complete'};
    }
    if (id === 'VIS-04' && data && data.visitDate) {
      return {reliable: true, source: 'Campus Visit Tracker: Visit Date', date: data.visitDate};
    }
    if (id === 'PRT-03' && college && college.portfolioSubmittedDate) {
      return {reliable: true, source: 'Application Status Tracker: Portfolio Submitted', date: college.portfolioSubmittedDate};
    }
    if (id === 'SUB-03' && college && (college.submittedDate ||
        /submitted/i.test(college.applicationStatus || ''))) {
      return {reliable: true, source: 'Application Status Tracker: application submitted', date: college.submittedDate};
    }
    if (id === 'SUB-04' && college && college.portal &&
        (college.submittedDate || /submitted/i.test(college.applicationStatus || ''))) {
      return {reliable: true, source: 'Application Status Tracker: portal and submitted status'};
    }
    if (id === 'SUB-05' && college && asBoolean(college.documentsComplete, false)) {
      return {reliable: true, source: 'Application Status Tracker: Documents Complete'};
    }
    if (id === 'ATH-07' && data && data.questionnaireDate) {
      return {reliable: true, source: 'Recruiting Tracker: Questionnaire Submitted', date: data.questionnaireDate};
    }
    if (id === 'ATH-08' && data && data.initialOutreachDate) {
      return {reliable: true, source: 'Recruiting Tracker: Initial Outreach Date', date: data.initialOutreachDate};
    }
    if (id === 'ATH-09' && data && data.response) {
      return {reliable: true, source: 'Recruiting Tracker: Response/Interest', date: data.lastContact};
    }
    if (id === 'SUB-04' && college && college.portal) {
      return {reliable: false, source: 'Portal is present, but receipt still needs confirmation'};
    }
    return null;
  }

  /**
   * Applies reliable completion evidence and returns ambiguous suggestions.
   * @param {Array<Object>} tasks - Tasks
   * @param {Object} context - Tracker context
   * @param {Date=} todayValue - Current date
   * @returns {Object} Updated tasks and suggestions
   */
  function applyEvidence(tasks, context, todayValue) {
    var today = toDate(todayValue) || toDate(new Date());
    var completed = 0;
    var suggestions = [];
    var updated = (tasks || []).map(function(task) {
      var copy = copyTask_(task);
      if (COMPLETE_STATUSES[copy.status]) return copy;
      var evidence = completionEvidence_(copy, context || {});
      if (!evidence) return copy;
      if (!evidence.reliable) {
        suggestions.push({taskId: copy.taskId, source: evidence.source});
        return copy;
      }
      copy.status = 'Complete';
      copy.evidenceSource = evidence.source;
      copy.completionDate = toDate(evidence.date) || today;
      completed++;
      return copy;
    });
    return {tasks: updated, completed: completed, suggestions: suggestions};
  }

  /**
   * Produces weekly, rolling, and effort views without duplicating task state.
   * @param {Array<Object>} tasks - Canonical tasks
   * @param {Date=} todayValue - Current date
   * @param {Object=} rawConfig - Optional capacity configuration
   * @returns {Object} View model
   */
  function buildViews(tasks, todayValue, rawConfig) {
    var today = toDate(todayValue) || toDate(new Date());
    var config = normalizeConfig(rawConfig);
    var weekEnd = addDays(today, 7);
    var horizonEnd = addDays(today, 90);
    var dueSoonEnd = addDays(today, 21);
    var active = (tasks || []).filter(function(task) {
      return !task.archivedReason && task.status !== 'Skipped';
    });
    var incomplete = active.filter(function(task) {
      return task.status !== 'Complete';
    });
    var rolling90 = incomplete.filter(function(task) {
      var due = toDate(task.dueDate);
      return !due || due <= horizonEnd;
    }).sort(compareTasks_);
    var weeklyCandidates = incomplete.filter(function(task) {
      var due = toDate(task.dueDate);
      return task.status === 'Blocked' || task.status === 'Waiting' ||
        (!!task.blockedBy && due && due <= dueSoonEnd) ||
        asBoolean(task.decisionNeeded, false) || asBoolean(task.manuallySelected, false) ||
        (due && due <= weekEnd) ||
        (['Critical', 'High'].indexOf(task.priority) !== -1 && due && due <= dueSoonEnd);
    }).sort(compareTasks_);
    var thisWeek = weeklyCandidates.slice(0, 10);
    var effortByOwner = {};
    var effortByRoleAndWeek = {};
    var effortByWeek = {};
    var effortByCollege = {};
    active.forEach(function(task) {
      var effort = Number(task.adjustedEffortMinutes) || 0;
      var owner = task.owner || task.ownerRole || 'Unassigned';
      var week = dateKey(toDate(task.plannedWeek)) || 'Unscheduled';
      var college = task.college || 'Shared project';
      var role = task.ownerRole || 'Shared';
      effortByOwner[owner] = (effortByOwner[owner] || 0) + effort;
      effortByWeek[week] = (effortByWeek[week] || 0) + effort;
      effortByCollege[college] = (effortByCollege[college] || 0) + effort;
      effortByRoleAndWeek[role] = effortByRoleAndWeek[role] || {};
      effortByRoleAndWeek[role][week] = (effortByRoleAndWeek[role][week] || 0) + effort;
    });
    var peakWeek = '';
    Object.keys(effortByWeek).forEach(function(week) {
      if (!peakWeek || effortByWeek[week] > effortByWeek[peakWeek]) peakWeek = week;
    });
    var capacityWarnings = [];
    Object.keys(effortByRoleAndWeek).forEach(function(role) {
      var baseHours = config.roleThresholds[role];
      Object.keys(effortByRoleAndWeek[role]).forEach(function(week) {
        var overrides = config.weeklyThresholdOverrides[role] || {};
        var capacityHours = Object.prototype.hasOwnProperty.call(overrides, week) ?
          Number(overrides[week]) : baseHours;
        if (capacityHours === '' || capacityHours === undefined) return;
        var plannedMinutes = effortByRoleAndWeek[role][week];
        if (plannedMinutes > capacityHours * 60) {
          capacityWarnings.push({
            role: role,
            week: week,
            plannedMinutes: plannedMinutes,
            capacityHours: capacityHours,
          });
        }
      });
    });
    return {
      thisWeek: thisWeek,
      rolling90: rolling90,
      effortByOwner: effortByOwner,
      effortByRoleAndWeek: effortByRoleAndWeek,
      effortByWeek: effortByWeek,
      effortByCollege: effortByCollege,
      peakWeek: peakWeek,
      peakWeekMinutes: peakWeek ? effortByWeek[peakWeek] : 0,
      capacityWarnings: capacityWarnings,
      counts: {
        active: active.length,
        complete: active.filter(function(task) {
          return task.status === 'Complete';
        }).length,
        completedThisWeek: active.filter(function(task) {
          var completionDate = toDate(task.completionDate);
          return task.status === 'Complete' && completionDate &&
            completionDate >= startOfWeek(today) && completionDate <= addDays(today, 6);
        }).length,
        overdue: incomplete.filter(function(task) {
          var due = toDate(task.dueDate);
          return due && due < today;
        }).length,
        blocked: incomplete.filter(function(task) {
          var due = toDate(task.dueDate);
          return task.status === 'Blocked' || task.status === 'Waiting' ||
            (!!task.blockedBy && due && due <= dueSoonEnd);
        }).length,
        decisions: incomplete.filter(function(task) {
          return asBoolean(task.decisionNeeded, false);
        }).length,
        dueWithin21Days: incomplete.filter(function(task) {
          var due = toDate(task.dueDate);
          return due && due >= today && due <= dueSoonEnd;
        }).length,
        applicationsTracked: active.filter(function(task) {
          return task.templateId === 'SUB-03';
        }).length,
        applicationsSubmitted: active.filter(function(task) {
          return task.templateId === 'SUB-03' && task.status === 'Complete';
        }).length,
        recruitingActions: rolling90.filter(function(task) {
          return task.module === 'Athletic Recruiting';
        }).length,
      },
    };
  }

  return {
    normalizeConfig: normalizeConfig,
    generatePlan: generatePlan,
    reconcile: reconcile,
    applyEvidence: applyEvidence,
    buildViews: buildViews,
    toDate: toDate,
    dateKey: dateKey,
    startOfWeek: startOfWeek,
  };
})();
