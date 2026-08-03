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
    'DEC-03': true, 'DEC-04': true, 'DEC-05': true,
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
   * Returns the fall application year inferred from cycle, grad year, or deadline.
   * @param {Object} config - Configuration
   * @returns {number|null} Fall application year
   */
  function applicationFallYear_(config) {
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
    return fallYear || null;
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
    var fallYear = applicationFallYear_(config);
    if (!fallYear) return null;
    if (round === 'ED2' || round === 'RD') return new Date(fallYear + 1, 0, 15);
    if (round === 'ROLLING') return new Date(fallYear + 1, 1, 1);
    return new Date(fallYear, 10, 1);
  }

  /**
   * Returns the National Candidates Reply Date (May 1) default for the
   * decision-year spring following the fall application year, used when no
   * college-specific decision, deposit, or housing date is tracked.
   * @param {Object} config - Configuration
   * @returns {Date|null} May 1 default
   */
  function nationalReplyDateDefault_(config) {
    var fallYear = applicationFallYear_(config);
    return fallYear ? new Date(fallYear + 1, 4, 1) : null;
  }

  /**
   * Returns the fixed AP/IB free-score-sending deadline (June 20) for the
   * decision-year spring following the fall application year.
   * @param {Object} config - Configuration
   * @returns {Date|null} June 20 default
   */
  function apScoreSendingDefault_(config) {
    var fallYear = applicationFallYear_(config);
    return fallYear ? new Date(fallYear + 1, 5, 20) : null;
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
   * Resolves the parent effort multiplier, distinguishing an unset value
   * from an explicit 0 (which JavaScript's `|| 1` would otherwise discard).
   * @param {*} raw - Raw sheet value
   * @returns {number} Multiplier, clamped to a minimum of 0
   */
  function parentEffortMultiplier_(raw) {
    if (raw === '' || raw === undefined || raw === null) return 1;
    var multiplier = Number(raw);
    return isNaN(multiplier) ? 1 : Math.max(0, multiplier);
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
      parentEffortMultiplier: parentEffortMultiplier_(config.parentEffortMultiplier),
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
   * Returns whether a college's admission decision is recorded as an offer.
   * @param {Object} college - College
   * @returns {boolean} Whether the college is an admitted college
   */
  function collegeAdmitted_(college) {
    return (college.decisionResult || '').toString().trim().toLowerCase() === 'accepted';
  }

  /**
   * Per-templateId applicability filters for the 'college' scope. Most
   * college-scoped templates apply to every college; a few Decision/
   * Enrollment and strategy templates only make sense once a specific
   * application round or admission outcome is on record.
   */
  var COLLEGE_SCOPE_FILTERS = {
    'STR-09': function(college) {
      var round = (college.applicationType || '').toString().trim().toUpperCase();
      return round === 'ED' || round === 'ED2' || round === 'REA';
    },
    'DEC-02': collegeAdmitted_,
    'DEC-03': collegeAdmitted_,
    'DEC-05': collegeAdmitted_,
    'DEC-06': collegeAdmitted_,
    'DEC-07': collegeAdmitted_,
    'DEC-04': function(college) {
      return (college.decisionResult || '').toString().trim().toLowerCase() === 'waitlisted';
    },
  };

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
        filter = COLLEGE_SCOPE_FILTERS[template.templateId] || null;
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
    var dates = [];
    (context.colleges || []).forEach(function(college) {
      var roundDefault = college.applicationDeadline ? null :
        applicationRoundDeadline_(college, config);
      dates.push(
        college.applicationDeadline,
        roundDefault,
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
    return earliest(dates) || config.workingDeadline;
  }

  /**
   * Returns the templateId prefix used to key COLLEGE_DEADLINE_RESOLVERS
   * (e.g. 'AID-06' -> 'AID-').
   * @param {string} id - Template ID
   * @returns {string} Prefix including the trailing dash
   */
  function templateIdPrefix_(id) {
    var dash = id.indexOf('-');
    return dash === -1 ? id : id.slice(0, dash + 1);
  }

  /**
   * Per-templateId/prefix deadline resolvers for the 'college' scope
   * fallback branch of deadlineFor_. Each resolver receives
   * (college, config) and returns {date, source} or null when it has no
   * opinion, in which case deadlineFor_ falls back to collegeFallback().
   * Exact templateId entries take precedence over prefix entries.
   */
  var COLLEGE_DEADLINE_RESOLVERS = {
    'AID-': function(college) {
      if (!toDate(college.aidDeadline)) return null;
      return {date: toDate(college.aidDeadline), source: 'College aid-priority deadline'};
    },
    'SCH-': function(college) {
      var date = earliest([college.meritDeadline, college.honorsDeadline]);
      return date ? {date: date, source: 'Merit or honors deadline'} : null;
    },
    'TST-06': function(college) {
      if (!toDate(college.testScoreDeadline)) return null;
      return {date: toDate(college.testScoreDeadline), source: 'Test-score deadline'};
    },
    'REC-07': function(college) {
      var date = earliest([
        college.transcriptDeadline, college.teacherRecDeadline, college.counselorRecDeadline,
      ]);
      return date ? {date: date, source: 'Earliest school-document deadline'} : null;
    },
    'TST-07': function(college, config) {
      return {date: apScoreSendingDefault_(config), source: 'AP/IB score-sending deadline (June 20)'};
    },
    'DEC-': function(college, config, id) {
      if (id === 'DEC-05' || id === 'DEC-06') {
        if (toDate(college.enrollmentDepositDeadline)) {
          return {date: toDate(college.enrollmentDepositDeadline), source: 'Enrollment deposit deadline'};
        }
      } else if (id === 'DEC-07') {
        if (toDate(college.housingDepositDue)) {
          return {date: toDate(college.housingDepositDue), source: 'Housing deposit due date'};
        }
        if (toDate(college.enrollmentDepositDeadline)) {
          return {date: toDate(college.enrollmentDepositDeadline), source: 'Enrollment deposit deadline'};
        }
      } else if (toDate(college.decisionDate)) {
        return {date: toDate(college.decisionDate), source: 'Decision release date'};
      }
      return {date: nationalReplyDateDefault_(config), source: 'National Candidates Reply Date default (May 1)'};
    },
  };

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
    var date = null;
    var source = 'Working first-application target';
    var roundDefault = college ? applicationRoundDeadline_(college, config) : null;
    var collegeFallback = function() {
      if (college && toDate(college.applicationDeadline)) {
        return {date: toDate(college.applicationDeadline), source: 'College application deadline'};
      }
      if (roundDefault) {
        return {
          date: roundDefault,
          source: 'Application-round default; confirm manually',
        };
      }
      return {date: config.workingDeadline, source: source};
    };

    if (template.scope === 'scholarship') {
      if (toDate(data.deadline)) {
        date = toDate(data.deadline);
        source = 'Scholarship deadline';
      } else if (config.workingDeadline) {
        date = config.workingDeadline;
        source = 'Working first-application target';
      } else {
        date = firstDeadline;
        source = 'Earliest relevant college deadline';
      }
    } else if (template.scope === 'contact') {
      if (toDate(data.nextFollowUp)) {
        date = toDate(data.nextFollowUp);
        source = 'Recruiting next action';
      } else {
        var contactFallback = collegeFallback();
        date = contactFallback.date;
        source = contactFallback.source;
      }
    } else if (template.scope === 'visit') {
      if (toDate(data.visitDate)) {
        date = toDate(data.visitDate);
        source = 'Visit date';
      } else {
        var visitFallback = collegeFallback();
        date = visitFallback.date;
        source = visitFallback.source;
      }
    } else if (template.scope === 'interview') {
      if (toDate(data.interviewDate)) {
        date = toDate(data.interviewDate);
        source = 'Interview date';
      } else {
        var interviewFallback = collegeFallback();
        date = interviewFallback.date;
        source = interviewFallback.source;
      }
    } else if (template.scope === 'portfolio') {
      if (college && toDate(college.portfolioDeadline)) {
        date = toDate(college.portfolioDeadline);
        source = 'Portfolio deadline';
      } else {
        var portfolioFallback = collegeFallback();
        date = portfolioFallback.date;
        source = portfolioFallback.source;
      }
    } else if (template.scope === 'prompt') {
      if (toDate(data.applicationDeadline)) {
        date = toDate(data.applicationDeadline);
        source = 'College application deadline';
      } else {
        var promptFallback = collegeFallback();
        date = promptFallback.date;
        source = promptFallback.source;
      }
    } else if (college) {
      var resolver = COLLEGE_DEADLINE_RESOLVERS[id] ||
        COLLEGE_DEADLINE_RESOLVERS[templateIdPrefix_(id)];
      var resolved = resolver ? resolver(college, config, id) : null;
      if (resolved) {
        date = resolved.date;
        source = resolved.source;
      }
      if (!date) {
        var fallback = collegeFallback();
        date = fallback.date;
        source = fallback.source;
      }
    } else if (id.indexOf('AID-') === 0) {
      var aidDates = [];
      (context.colleges || []).forEach(function(item) {
        aidDates.push(item.aidDeadline);
      });
      date = earliest(aidDates);
      if (date) source = 'Earliest aid-priority deadline';
      if (!date) {
        date = firstDeadline || config.workingDeadline;
        source = firstDeadline ? 'Earliest relevant deadline' : source;
      }
    } else if (id.indexOf('SCH-') === 0) {
      var scholarshipDates = [];
      (context.colleges || []).forEach(function(item) {
        scholarshipDates.push(item.meritDeadline, item.honorsDeadline);
      });
      (context.scholarships || []).forEach(function(item) {
        scholarshipDates.push(item.deadline);
      });
      date = earliest(scholarshipDates);
      if (date) source = 'Earliest merit, honors, or scholarship deadline';
      if (!date) {
        date = firstDeadline || config.workingDeadline;
        source = firstDeadline ? 'Earliest relevant deadline' : source;
      }
    } else {
      date = firstDeadline || config.workingDeadline;
      source = firstDeadline ? 'Earliest relevant deadline' : source;
    }
    return {date: date, source: source};
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
    var professionalSupport = config.counselorAvailable ||
      config.modules['Professional Support'];
    if (support === 'Counselor/Professional' && !professionalSupport) support = '';
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
   * Adds a schedule flag without repeating an existing message.
   * @param {Object} task - Task
   * @param {string} message - Flag text
   */
  function appendScheduleFlag_(task, message) {
    var current = (task.scheduleFlag || '').toString();
    if (current.indexOf(message) !== -1) return;
    task.scheduleFlag = current ? current + '; ' + message : message;
  }

  /**
   * Maps an ideal long-lead schedule into the remaining application window.
   * Calculated Date remains the ideal date; Due/Effective Date become the
   * actionable late-start date. Fixed/event dates are never moved.
   * @param {Array<Object>} tasks - Generated tasks
   * @param {Date} today - Planning date
   * @param {Date|null} firstDeadline - Earliest real/default deadline
   */
  function adaptLateStartSchedule_(tasks, today, firstDeadline) {
    if (!firstDeadline || firstDeadline <= today) return;
    var excludedTemplates = {'AID-02': true, 'AID-06': true, 'AID-07': true};
    var eligible = tasks.filter(function(task) {
      return task.scopeType !== 'recurring' && task.scheduleOffsetDays < 0 &&
        !excludedTemplates[task.templateId] && task.calculatedDate &&
        task.calculatedDate <= firstDeadline;
    });
    var idealStart = earliest(eligible.map(function(task) {
      return task.calculatedDate;
    }));
    if (!idealStart || idealStart >= today) return;
    var idealSpan = Math.max(1, firstDeadline.getTime() - idealStart.getTime());
    var availableSpan = firstDeadline.getTime() - today.getTime();
    eligible.forEach(function(task) {
      var progress = (task.calculatedDate.getTime() - idealStart.getTime()) / idealSpan;
      progress = Math.max(0, Math.min(1, progress));
      var mapped = toDate(new Date(today.getTime() + Math.round(progress * availableSpan)));
      var latestBeforeAnchor = task.anchorDate ? addDays(task.anchorDate, -1) : null;
      if (latestBeforeAnchor && mapped > latestBeforeAnchor) mapped = latestBeforeAnchor;
      if (mapped < today) {
        mapped = today;
        task.priority = 'Critical';
        appendScheduleFlag_(task, 'Not feasible: required lead time is unavailable');
      } else {
        if (task.calculatedDate < today &&
            (task.priority === 'Normal' || task.priority === 'Low')) {
          task.priority = 'High';
        }
        appendScheduleFlag_(task,
          'Adaptive late-start date; ideal was ' + dateKey(task.calculatedDate));
      }
      task.dueDate = mapped;
      task.effectiveDate = mapped;
      task.plannedWeek = startOfWeek(mapped);
    });
  }

  /**
   * Ensures non-fixed work does not precede its planned prerequisites. A
   * dependency that cannot fit before a fixed/anchor date is flagged instead
   * of moving the external deadline.
   * @param {Array<Object>} tasks - Tasks with resolved dependencies
   */
  function alignDependencyDates_(tasks) {
    var byId = {};
    tasks.forEach(function(task) {
      byId[task.taskId] = task;
    });
    for (var pass = 0; pass < tasks.length; pass++) {
      var changed = false;
      tasks.forEach(function(task) {
        var latestDependencyDate = null;
        (task.dependencies || []).forEach(function(dependencyId) {
          var dependency = byId[dependencyId];
          var dependencyDate = dependency && toDate(dependency.dueDate);
          if (dependencyDate &&
              (!latestDependencyDate || dependencyDate > latestDependencyDate)) {
            latestDependencyDate = dependencyDate;
          }
        });
        var dueDate = toDate(task.dueDate);
        if (!latestDependencyDate || !dueDate || latestDependencyDate <= dueDate) return;
        var cannotMove = task.scheduleOffsetDays === 0 ||
          (task.anchorDate && latestDependencyDate >= task.anchorDate);
        if (cannotMove) {
          task.priority = 'Critical';
          appendScheduleFlag_(task, 'Dependency conflict: prerequisite is planned after fixed date');
          return;
        }
        task.dueDate = new Date(latestDependencyDate.getTime());
        task.effectiveDate = new Date(latestDependencyDate.getTime());
        task.plannedWeek = startOfWeek(latestDependencyDate);
        appendScheduleFlag_(task, 'Adjusted after prerequisite');
        changed = true;
      });
      if (!changed) break;
    }
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
        var offsetWindow = template.offsetWindow;
        if (base.source === 'Recruiting next action') {
          if (template.templateId === 'ATH-08') {
            calculatedDate = addDays(base.date, -7);
            offsetWindow = '7 days before recruiting next action';
          } else if (template.templateId === 'ATH-09') {
            calculatedDate = addDays(base.date, -1);
            offsetWindow = '1 day before recruiting next action';
          } else if (template.templateId === 'ATH-10') {
            calculatedDate = base.date;
            offsetWindow = 'On recruiting next-action date';
          }
        }
        var scheduleOffsetDays = base.date && calculatedDate ?
          Math.round((calculatedDate.getTime() - base.date.getTime()) / DAY_MS) :
          template.offsetDays;
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
          applicabilityRule: template.applicability,
          scheduleRule: template.scheduleRule,
          scheduleAnchor: base.source,
          anchorDate: base.date,
          offsetWindow: offsetWindow,
          scheduleOffsetDays: scheduleOffsetDays,
          owner: owner.owner,
          ownerRole: owner.ownerRole,
          ownerLocked: false,
          supportRole: owner.supportRole,
          calculatedDate: calculatedDate,
          dueDate: calculatedDate,
          effectiveDate: calculatedDate,
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

    adaptLateStartSchedule_(tasks, today, firstDeadline);

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
    alignDependencyDates_(tasks);
    tasks.forEach(function(task) {
      delete task.scheduleOffsetDays;
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
    var applicableTemplateCount = templates.filter(function(template) {
      return templateEnabled_(template, config, today, firstDeadline);
    }).length;
    return {
      ok: true,
      code: 'plan_generated',
      tasks: tasks,
      templateCount: validation.count,
      applicableTemplateCount: applicableTemplateCount,
      excludedTemplateCount: validation.count - applicableTemplateCount,
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
   * Removes sheet-location metadata before preview comparisons.
   * @param {Object} task - Task model
   * @returns {Object} Comparable copy
   */
  function comparableTask_(task) {
    var comparable = copyTask_(task);
    delete comparable._sourceRow;
    return comparable;
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
      'notes', 'evidenceSource', 'completionDate', 'manuallySelected',
      'resourceLinks', 'priorityOverride', 'effortOverrideMinutes', 'scheduledBlock',
    ];
    alwaysPreserve.forEach(function(field) {
      if (existing[field] !== '' && existing[field] !== null && existing[field] !== undefined) {
        merged[field] = existing[field];
      }
    });
    var systemArchivedSkip = existing.status === 'Skipped' && !!existing.archivedReason &&
      asBoolean(existing.generated, false);
    if (!systemArchivedSkip && existing.status) merged.status = existing.status;
    if (asBoolean(existing.ownerLocked, false)) {
      merged.owner = existing.owner;
      merged.ownerRole = existing.ownerRole;
      merged.ownerLocked = true;
    }
    if (asBoolean(existing.dateLocked, false)) {
      merged.dueDate = existing.dueDate;
      merged.effectiveDate = existing.dueDate;
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
      ['task', 'owner', 'ownerRole', 'supportRole', 'dueDate', 'effectiveDate',
        'plannedWeek',
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
    tasks.forEach(function(task) {
      if (!generatedIds[task.taskId] || !existingById[task.taskId]) return;
      var changed = JSON.stringify(comparableTask_(task)) !==
        JSON.stringify(comparableTask_(existingById[task.taskId]));
      preview[changed ? 'update' : 'unchanged']++;
    });
    tasks.sort(compareTasks_);
    return {tasks: tasks, preview: preview};
  }

  /**
   * Per-templateId completion-evidence resolvers, each receiving
   * (task, context, college, data) and returning {reliable, source, date=}
   * or null when it has no opinion. Grouped per ID so multi-step fallback
   * chains (e.g. SUB-04's strong-then-weak signal, ATH-07's two data
   * sources) stay together instead of being split across a flat if-chain.
   */
  var COMPLETION_EVIDENCE_RESOLVERS = {
    'AID-06': function(task, context) {
      if (context.fafsaSubmittedDate || context.fafsaSubmitted) {
        return {reliable: true, source: 'Financial Aid Tracker: FAFSA Submitted', date: context.fafsaSubmittedDate};
      }
      return null;
    },
    'AID-10': function(task, context) {
      if (context.cssProfileSubmitted) {
        return {
          reliable: true, source: 'Financial Aid Tracker: CSS Profile Submitted',
          date: context.cssProfileSubmittedDate,
        };
      }
      return null;
    },
    'SCH-06': function(task, context, college, data) {
      if (data && data.submittedDate) {
        return {reliable: true, source: 'Scholarship Tracker: Application Submitted Date', date: data.submittedDate};
      }
      return null;
    },
    'SCH-07': function(task, context, college, data) {
      if (data && data.awardStatus) {
        return {reliable: true, source: 'Scholarship Tracker: Award Status', date: data.decisionDate};
      }
      return null;
    },
    'TST-06': function(task, context, college) {
      if (college && asBoolean(college.testScoresSent, false)) {
        return {reliable: true, source: 'Application Status Tracker: Test Scores Sent'};
      }
      return null;
    },
    'REC-07': function(task, context, college) {
      if (college && asBoolean(college.transcriptSent, false) &&
          asBoolean(college.recommendationsComplete, false)) {
        return {reliable: true, source: 'Application Status Tracker: transcript and recommendations complete'};
      }
      return null;
    },
    'ESS-10': function(task, context, college) {
      if (college && asBoolean(college.essaysComplete, false)) {
        return {reliable: true, source: 'Application Status Tracker: Essays Complete'};
      }
      return null;
    },
    'VIS-04': function(task, context, college, data) {
      if (data && data.visitDate) {
        return {reliable: true, source: 'Campus Visit Tracker: Visit Date', date: data.visitDate};
      }
      return null;
    },
    'PRT-03': function(task, context, college) {
      if (college && college.portfolioSubmittedDate) {
        return {
          reliable: true, source: 'Application Status Tracker: Portfolio Submitted',
          date: college.portfolioSubmittedDate,
        };
      }
      return null;
    },
    'SUB-03': function(task, context, college) {
      if (college && (college.submittedDate || /submitted/i.test(college.applicationStatus || ''))) {
        return {reliable: true, source: 'Application Status Tracker: application submitted', date: college.submittedDate};
      }
      return null;
    },
    'SUB-04': function(task, context, college) {
      if (college && college.portal &&
          (college.submittedDate || /submitted/i.test(college.applicationStatus || ''))) {
        return {reliable: true, source: 'Application Status Tracker: portal and submitted status'};
      }
      if (college && college.portal) {
        return {reliable: false, source: 'Portal is present, but receipt still needs confirmation'};
      }
      return null;
    },
    'SUB-05': function(task, context, college) {
      if (college && asBoolean(college.documentsComplete, false)) {
        return {reliable: true, source: 'Application Status Tracker: Documents Complete'};
      }
      return null;
    },
    'ATH-07': function(task, context, college, data) {
      if (data && data.questionnaireDate) {
        return {reliable: true, source: 'Recruiting Tracker: Questionnaire Submitted', date: data.questionnaireDate};
      }
      if (task.collegeId) {
        var questionnaireContact = null;
        (context.contacts || []).forEach(function(contact) {
          if (!questionnaireContact &&
              String(contact.collegeId || '') === String(task.collegeId) &&
              contact.questionnaireDate) {
            questionnaireContact = contact;
          }
        });
        if (questionnaireContact) {
          return {
            reliable: true,
            source: 'Recruiting Tracker: Questionnaire Submitted',
            date: questionnaireContact.questionnaireDate,
          };
        }
      }
      return null;
    },
    'ATH-08': function(task, context, college, data) {
      if (data && data.initialOutreachDate) {
        return {reliable: true, source: 'Recruiting Tracker: Initial Outreach Date', date: data.initialOutreachDate};
      }
      return null;
    },
    'ATH-09': function(task, context, college, data) {
      if (data && data.response) {
        return {reliable: true, source: 'Recruiting Tracker: Response/Interest', date: data.lastContact};
      }
      return null;
    },
  };

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
    var resolver = COMPLETION_EVIDENCE_RESOLVERS[id];
    return resolver ? resolver(task, context, college, data) : null;
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
      if (copy.evidenceSource && copy.status !== 'Complete') {
        suggestions.push({
          taskId: copy.taskId,
          source: 'Manual status override retained; tracker still shows: ' + evidence.source,
        });
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
      var plannedWeek = toDate(task.plannedWeek);
      return (!due && !plannedWeek) ||
        (due && due <= horizonEnd) ||
        (plannedWeek && plannedWeek <= horizonEnd);
    }).sort(compareTasks_);
    var currentWeek = startOfWeek(today);
    var weeklyCategories = [
      {
        key: 'overdue',
        test: function(task) {
          var due = toDate(task.dueDate);
          return !!due && due < today;
        },
      },
      {
        key: 'current-week',
        test: function(task) {
          var plannedWeek = toDate(task.plannedWeek);
          return !!plannedWeek &&
            dateKey(startOfWeek(plannedWeek)) === dateKey(currentWeek);
        },
      },
      {
        key: 'due-within-21-days',
        test: function(task) {
          var due = toDate(task.dueDate);
          return !!due && due >= today && due <= dueSoonEnd;
        },
      },
      {
        key: 'blocked-or-waiting',
        test: function(task) {
          return task.status === 'Blocked' || task.status === 'Waiting' || !!task.blockedBy;
        },
      },
      {
        key: 'decision-needed',
        test: function(task) {
          return asBoolean(task.decisionNeeded, false);
        },
      },
      {
        key: 'manually-selected',
        test: function(task) {
          return asBoolean(task.manuallySelected, false);
        },
      },
    ];
    var weeklyCandidates = incomplete.filter(function(task) {
      return weeklyCategories.some(function(category) {
        return category.test(task);
      });
    }).sort(compareTasks_);
    var selectedTaskIds = {};
    var thisWeek = [];
    weeklyCategories.forEach(function(category) {
      // Skip tasks a prior category already claimed so one task satisfying
      // two required categories (e.g. Blocked + decision-needed) doesn't
      // leave a distinct second-category task unguaranteed and pushed past
      // the cap below.
      var representative = weeklyCandidates.filter(function(task) {
        return category.test(task) && !selectedTaskIds[task.taskId];
      })[0];
      if (representative && thisWeek.length < 10) {
        selectedTaskIds[representative.taskId] = true;
        thisWeek.push(representative);
      }
    });
    weeklyCandidates.forEach(function(task) {
      if (!selectedTaskIds[task.taskId] && thisWeek.length < 10) {
        selectedTaskIds[task.taskId] = true;
        thisWeek.push(task);
      }
    });
    thisWeek.sort(compareTasks_);
    var thisWeekCategoryCounts = {};
    weeklyCategories.forEach(function(category) {
      thisWeekCategoryCounts[category.key] = {
        eligible: weeklyCandidates.filter(category.test).length,
        shown: thisWeek.filter(category.test).length,
      };
    });
    var effortByOwner = {};
    var effortByRole = {};
    var effortByRoleAndWeek = {};
    var effortByWeek = {};
    var effortByCollege = {};
    var effortByStage = {};
    var effortByModule = {};
    var totalEffortMinutes = 0;
    incomplete.forEach(function(task) {
      var effort = Number(task.adjustedEffortMinutes) || 0;
      var owner = task.owner || task.ownerRole || 'Unassigned';
      var week = dateKey(toDate(task.plannedWeek)) || 'Unscheduled';
      var college = task.college || 'Shared project';
      var role = task.ownerRole || 'Shared';
      var stage = task.stage || 'Uncategorized';
      var module = task.module || 'Uncategorized';
      totalEffortMinutes += effort;
      effortByOwner[owner] = (effortByOwner[owner] || 0) + effort;
      effortByRole[role] = (effortByRole[role] || 0) + effort;
      effortByWeek[week] = (effortByWeek[week] || 0) + effort;
      effortByCollege[college] = (effortByCollege[college] || 0) + effort;
      effortByStage[stage] = (effortByStage[stage] || 0) + effort;
      effortByModule[module] = (effortByModule[module] || 0) + effort;
      effortByRoleAndWeek[role] = effortByRoleAndWeek[role] || {};
      effortByRoleAndWeek[role][week] = (effortByRoleAndWeek[role][week] || 0) + effort;
    });
    var rolling90EffortMinutes = rolling90.reduce(function(total, task) {
      return total + (Number(task.adjustedEffortMinutes) || 0);
    }, 0);
    var scheduledWeeks = Object.keys(effortByWeek).filter(function(week) {
      return week !== 'Unscheduled';
    });
    var nextWeekKey = dateKey(addDays(currentWeek, 7));
    var peakWeek = '';
    scheduledWeeks.forEach(function(week) {
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
      thisWeekCandidateCount: weeklyCandidates.length,
      thisWeekOmittedCount: Math.max(0, weeklyCandidates.length - thisWeek.length),
      thisWeekCategoryCounts: thisWeekCategoryCounts,
      rolling90: rolling90,
      effortByOwner: effortByOwner,
      effortByRole: effortByRole,
      effortByRoleAndWeek: effortByRoleAndWeek,
      effortByWeek: effortByWeek,
      effortByCollege: effortByCollege,
      effortByStage: effortByStage,
      effortByModule: effortByModule,
      totalEffortMinutes: totalEffortMinutes,
      rolling90EffortMinutes: rolling90EffortMinutes,
      averageScheduledWeekMinutes: scheduledWeeks.length ?
        Math.round(scheduledWeeks.reduce(function(total, week) {
          return total + effortByWeek[week];
        }, 0) / scheduledWeeks.length) : 0,
      nextWeekEffortMinutes: effortByWeek[nextWeekKey] || 0,
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
