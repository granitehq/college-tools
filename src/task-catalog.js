/**
 * Adaptive college task template catalog
 * @version 2.7.0
 * @author College Tools
 * @description Source-controlled task definitions for adaptive application planning
 */

/**
 * CollegeTools.TaskCatalog - Validated task template definitions.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.TaskCatalog = (function() {
  'use strict';

  var WORKSTREAMS = {
    STR: 'Strategy And Configuration',
    PRO: 'Student Foundation',
    COL: 'College List And Fit',
    AID: 'Affordability And Financial Aid',
    SCH: 'Merit, Honors, And Scholarships',
    TST: 'Testing',
    REC: 'Recommendations And School Records',
    APP: 'Common Application And Base Data',
    ESS: 'Essays',
    ATH: 'Athletic Recruiting',
    VIS: 'Visits, Interviews, And Demonstrated Interest',
    PRT: 'Portfolio And Audition',
    SUB: 'Submission And Portals',
    DEC: 'Decision And Enrollment',
    PM: 'Project Control',
  };

  // id, task, owner role, support, applicability/anchor, effort minutes, deliverable
  var ROWS = [
    ['STR-01', 'Set grade, graduation year, cycle, start date, and working deadline', 'Shared', '', 'Initial setup', 30, 'Planning horizon saved'],
    ['STR-02', 'Configure family, professional, custom-owner, and external roles', 'Parent/Guardian', '', 'Initial setup', 30, 'Owners and fallbacks saved'],
    ['STR-03', 'Enable applicable task modules', 'Shared', '', 'Initial setup', 20, 'Module configuration approved'],
    ['STR-04', 'Define academic interests and possible majors', 'Student', '', 'Before college research', 60, 'Written academic criteria'],
    ['STR-05', 'Define geography, setting, size, culture, and other constraints', 'Shared', '', 'Before college research', 60, 'Fit criteria approved'],
    ['STR-06', 'Set annual contribution and borrowing limits', 'Parent/Guardian', '', 'Before affordability review', 90, 'Written financial limits'],
    ['STR-07', 'Define Reach/Target/Likely and financial-safety rules', 'Shared', 'Counselor/Professional', 'After STR-04 through STR-06', 60, 'Classification rules saved'],
    ['STR-08', 'Choose ED/EA/REA/RD strategy and decision conditions', 'Shared', 'Counselor/Professional', 'After preliminary cost/list review', 90, 'Written application-round strategy'],
    ['STR-09', 'Sign Early Decision agreement with student, parent, and counselor signatures', 'Shared', 'Counselor/Professional', 'If applying ED, ED2, or REA', 30, 'Signed binding agreement on file'],
    ['PRO-01', 'Collect current transcript and course schedule', 'Student', 'Parent/Guardian', 'Start', 30, 'Current records stored'],
    ['PRO-02', 'Verify transcript, GPA, courses, and errors', 'Student', 'External dependency', 'After PRO-01', 60, 'Accuracy confirmed or corrections requested'],
    ['PRO-03', 'Build complete activities inventory', 'Student', '', 'Before Common App', 120, 'Activities and impact evidence listed'],
    ['PRO-04', 'Build honors and awards inventory', 'Student', '', 'Before Common App', 60, 'Honors with dates and levels listed'],
    ['PRO-05', 'Create resume and brag sheet', 'Student', 'Counselor/Professional', 'After PRO-03 and PRO-04', 120, 'Shareable resume and brag sheet complete'],
    ['PRO-06', 'Build experiences and story inventory', 'Student', '', 'Before essays', 90, 'Usable experiences documented'],
    ['PRO-07', 'Write academic-interest and major narrative', 'Student', '', 'Before supplements and outreach', 60, 'Concise narrative approved by student'],
    ['PRO-08', 'Review meaningful course, activity, testing, and recruiting gaps', 'Shared', 'Counselor/Professional', 'More than six months remaining', 90, 'Only feasible high-value actions selected'],
    ['COL-01', 'Build preliminary candidate list', 'Shared', 'Counselor/Professional', 'After strategy', 180, 'Candidate list with reasons'],
    ['COL-02', 'Verify majors, business/marketing, and entrepreneurship options', 'Student', 'Assistant', 'Per college', 30, 'Academic-fit notes recorded'],
    ['COL-03', 'Review admission profile using official and Common Data Set data', 'Shared', 'Counselor/Professional', 'Per college', 30, 'Admission evidence recorded'],
    ['COL-04', 'Record application rounds and authoritative deadlines', 'Shared', '', 'Per college', 20, 'Timeline fields complete'],
    ['COL-05', 'Record required supplements and special requirements', 'Student', '', 'Per college', 20, 'Requirements inventory complete'],
    ['COL-06', 'Evaluate location, campus, size, culture, and student fit', 'Student', '', 'Per college', 30, 'Fit rating and notes'],
    ['COL-07', 'Review retention, graduation, earnings, and debt outcomes', 'Shared', '', 'Per college', 30, 'Outcome notes recorded'],
    ['COL-08', 'Decide whether student would attend without athletics', 'Student', '', 'Per recruiting college', 20, 'Decision and reason recorded'],
    ['COL-09', 'Classify Reach/Target/Likely and financial safety', 'Shared', 'Counselor/Professional', 'After college and cost review', 30, 'Classifications recorded'],
    ['COL-10', 'Approve final active list and archive rejected schools', 'Shared', '', 'Before intensive supplements', 120, 'Final list and removal reasons approved'],
    ['AID-01', 'Create financial-aid document checklist and secure folder', 'Parent/Guardian', '', 'Aid module start', 60, 'Required documents inventoried'],
    ['AID-02', 'Prepare StudentAid.gov student and contributor access', 'Shared', '', 'Before FAFSA availability', 45, 'Required accounts and access confirmed'],
    ['AID-03', 'Run official net-price calculator and save dated inputs, result, and caveats', 'Parent/Guardian', 'Assistant', 'Per serious college', 60, 'Reproducible result saved'],
    ['AID-04', 'Build comparable four-year cost and debt view', 'Parent/Guardian', 'Assistant', 'After net-price estimates', 120, 'Four-year comparison complete'],
    ['AID-05', 'Record FAFSA requirement and state/college priority dates', 'Parent/Guardian', '', 'Per college', 20, 'Aid deadlines sourced'],
    ['AID-06', 'Complete and submit FAFSA', 'Shared', '', 'After public availability', 120, 'Submission confirmation saved'],
    ['AID-07', 'Review FAFSA summary, corrections, and college list', 'Shared', '', 'After FAFSA submission', 45, 'Summary verified or corrected'],
    ['AID-08', 'Record CSS Profile requirement and deadline', 'Parent/Guardian', '', 'Per college', 15, 'CSS applicability recorded'],
    ['AID-09', 'Prepare CSS Profile financial information', 'Parent/Guardian', '', 'CSS enabled', 120, 'Required information assembled'],
    ['AID-10', 'Submit CSS Profile and verify destinations', 'Parent/Guardian', '', 'Applicable deadline', 90, 'Submission confirmation saved'],
    ['AID-11', 'Reassess affordability and resolve unsafe colleges', 'Shared', '', 'After aid and cost review', 90, 'Each college marked plausible, escalate, or remove'],
    ['SCH-01', 'Verify automatic merit criteria', 'Parent/Guardian', 'Assistant', 'Per college', 20, 'Eligibility and terms recorded'],
    ['SCH-02', 'Identify competitive institutional awards and deadlines', 'Parent/Guardian', 'Assistant', 'Per college', 30, 'Opportunities recorded'],
    ['SCH-03', 'Identify honors-college requirements and deadlines', 'Student', 'Assistant', 'Per applicable college', 30, 'Honors requirements recorded'],
    ['SCH-04', 'Identify high-value state, regional, employer, and local awards', 'Shared', 'Assistant', 'Scholarship module', 120, 'Shortlist created'],
    ['SCH-05', 'Triage opportunities by value, probability, and effort', 'Shared', '', 'After scholarship research', 60, 'Apply, defer, or skip decisions'],
    ['SCH-06', 'Complete required merit, honors, or scholarship submission', 'Shared', '', 'Per selected opportunity', 180, 'Submission confirmed'],
    ['SCH-07', 'Record result, amount, conditions, and next action', 'Shared', '', 'Per submitted opportunity', 15, 'Scholarship tracker updated'],
    ['TST-01', 'Gather existing scores or complete SAT/ACT diagnostic', 'Student', '', 'Testing enabled', 180, 'Comparable baseline available'],
    ['TST-02', 'Choose SAT, ACT, both, or no further testing', 'Shared', 'Counselor/Professional', 'After diagnostic', 60, 'Written testing decision'],
    ['TST-03', 'Register tests and request accommodations if needed', 'Shared', '', 'Before registration deadline', 45, 'Registration confirmed'],
    ['TST-04', 'Create and execute preparation and checkpoint plan', 'Student', 'Tutor', 'Before test', 600, 'Planned checkpoints completed'],
    ['TST-05', 'Decide test-submit or test-optional strategy', 'Shared', 'Counselor/Professional', 'Per college after scores', 20, 'Decision recorded'],
    ['TST-06', 'Send required official scores and verify receipt', 'Shared', '', 'Per college deadline', 20, 'Portal or agency confirmation'],
    ['TST-07', 'Designate free AP/IB score recipients or send official scores to the enrolling college', 'Student', '', 'If AP/IB scores are required', 20, 'Scores sent before the free-send deadline'],
    ['REC-01', 'Document high-school recommendation and transcript process', 'Student', 'External dependency', 'Start of application phase', 45, 'Process and internal dates recorded'],
    ['REC-02', 'Select appropriate teacher recommenders', 'Student', 'Counselor/Professional', 'Before requests', 45, 'Recommenders chosen'],
    ['REC-03', 'Request teacher recommendations', 'Student', '', 'School request deadline', 30, 'Teachers confirm'],
    ['REC-04', 'Provide resume, brag sheet, and requested context', 'Student', '', 'After requests', 45, 'Materials delivered'],
    ['REC-05', 'Meet school counselor and request school report and recommendation', 'Student', 'External dependency', 'School deadline', 60, 'Request confirmed'],
    ['REC-06', 'Request or authorize transcripts and required records', 'Shared', 'External dependency', 'School deadline', 30, 'Orders or authorizations confirmed'],
    ['REC-07', 'Monitor recommendation and transcript receipt and follow up', 'Student', '', 'Per earliest document deadline', 20, 'Portal shows received or follow-up active'],
    ['APP-01', 'Create or roll over Common App account', 'Student', '', 'Application phase', 30, 'Correct cycle and account active'],
    ['APP-02', 'Complete profile, contact, and family sections', 'Student', 'Parent/Guardian', 'After account creation', 75, 'Sections validated'],
    ['APP-03', 'Complete education and current-course sections', 'Student', '', 'After transcript collection', 60, 'Education data verified'],
    ['APP-04', 'Complete testing section', 'Student', '', 'After testing decision', 30, 'Testing data consistent'],
    ['APP-05', 'Draft and order activities entries', 'Student', 'Counselor/Professional', 'After activities inventory', 180, 'Ten entries or final set complete'],
    ['APP-06', 'Complete honors section', 'Student', '', 'After honors inventory', 60, 'Final honors entered'],
    ['APP-07', 'Draft additional-information response if justified', 'Student', 'Counselor/Professional', 'Conditional', 90, 'Necessary context stated concisely'],
    ['APP-08', 'Audit and lock reusable application data', 'Shared', 'Counselor/Professional', 'Before first submission', 90, 'Base application fact-checked'],
    ['ESS-01', 'Inventory all prompts, word limits, and reuse groups', 'Student', 'Assistant', 'After active list', 120, 'Prompt matrix complete'],
    ['ESS-02', 'Brainstorm personal-statement topics', 'Student', 'Counselor/Professional', 'After story inventory', 120, 'Candidate topics documented'],
    ['ESS-03', 'Select personal-statement topic and outline', 'Student', 'Counselor/Professional', 'After brainstorming', 90, 'Student-approved outline'],
    ['ESS-04', 'Draft personal statement', 'Student', '', 'After outline', 300, 'Complete first draft'],
    ['ESS-05', 'Revise personal statement for structure and specificity', 'Student', '', 'After first draft', 180, 'Strong student-owned revision'],
    ['ESS-06', 'Obtain bounded outside review', 'Counselor/Professional', '', 'After student revision', 60, 'Actionable feedback returned'],
    ['ESS-07', 'Finalize and proof personal statement', 'Student', '', 'Before earliest use', 120, 'Final word-count-compliant essay'],
    ['ESS-08', 'Outline and draft one supplemental response', 'Student', '', 'Per prompt', 120, 'Complete draft'],
    ['ESS-09', 'Revise and proof one supplemental response', 'Student', 'Counselor/Professional', 'After supplemental draft', 90, 'Final student-owned response'],
    ['ESS-10', 'Audit essay-to-school, prompt, facts, and word count', 'Student', 'Counselor/Professional', 'Before each submission', 30, 'Correct final essays attached'],
    ['ATH-01', 'Assemble verified marks and meet results', 'Student', '', 'Recruiting enabled', 60, 'Sources and personal bests recorded'],
    ['ATH-02', 'Create athletic resume or profile', 'Student', 'Counselor/Professional', 'After verified results', 120, 'Shareable profile complete'],
    ['ATH-03', 'Collect useful video and media links', 'Student', '', 'If available and valuable', 60, 'Links tested and labeled'],
    ['ATH-04', 'Assemble academic and recruiting information packet', 'Shared', '', 'After transcript and athletic profile', 60, 'Transcript, scores, and profile ready'],
    ['ATH-05', 'Compare marks with roster and conference results', 'Student', 'Assistant', 'Per recruiting college', 30, 'Athletic-fit rating recorded'],
    ['ATH-06', 'Identify correct coach or contact', 'Student', 'Assistant', 'Per recruiting college', 20, 'Recruiting contact row created'],
    ['ATH-07', 'Complete recruiting questionnaire', 'Student', '', 'Per college', 45, 'Completion logged'],
    ['ATH-08', 'Edit and send personalized initial outreach', 'Student', 'Assistant', 'Per coach', 30, 'Outreach date and message logged'],
    ['ATH-09', 'Record response, interest, and next follow-up', 'Student', '', 'Per response', 15, 'Recruiting tracker current'],
    ['ATH-10', 'Complete scheduled follow-up, call, meeting, or visit action', 'Shared', '', 'Per recruiting next action', 60, 'Outcome and next action logged'],
    ['VIS-01', 'Select only visits and events that can change a decision', 'Shared', '', 'Visits enabled', 45, 'High-value shortlist'],
    ['VIS-02', 'Register and plan visit or virtual event', 'Shared', '', 'Per selected event', 45, 'Registration and logistics confirmed'],
    ['VIS-03', 'Prepare school-specific questions and priorities', 'Student', '', 'Before event', 30, 'Question list ready'],
    ['VIS-04', 'Attend and record ratings, notes, concerns, and follow-up', 'Shared', '', 'Event date', 240, 'Campus Visit Tracker updated'],
    ['VIS-05', 'Determine interview format and prepare and practice responses and questions', 'Student', 'Counselor/Professional', 'Interview applicable', 120, 'Practice completed'],
    ['VIS-06', 'Complete interview and required follow-up', 'Student', '', 'Interview date', 90, 'Status and notes recorded'],
    ['PRT-01', 'Record portfolio or audition specifications, format, and deadline', 'Student', 'Assistant', 'Per applicable college', 30, 'Authoritative requirements saved'],
    ['PRT-02', 'Curate, develop, or rehearse required work', 'Student', 'Specialist', 'After requirements', 600, 'Submission-ready work'],
    ['PRT-03', 'Submit portfolio or audition materials and verify receipt', 'Student', '', 'Applicable deadline', 60, 'Receipt and status confirmed'],
    ['SUB-01', 'Run college-specific requirement and readiness audit', 'Shared', 'Counselor/Professional', 'Before each submission', 45, 'No unresolved required item'],
    ['SUB-02', 'Review generated application PDF for accuracy', 'Shared', '', 'Before each submission', 45, 'PDF approved'],
    ['SUB-03', 'Submit application and pay fee or use waiver', 'Shared', '', 'College deadline', 30, 'Submission confirmation saved'],
    ['SUB-04', 'Activate portal and verify application receipt', 'Student', '', 'After submission', 30, 'Portal active and application received'],
    ['SUB-05', 'Resolve missing items and track post-submit requirements', 'Shared', 'External dependency', 'After portal review', 30, 'Missing items cleared or owned'],
    ['DEC-01', 'Record admission decision result', 'Shared', '', 'Per college, after decision released', 15, 'Decision/Result recorded'],
    ['DEC-02', 'Reconcile actual financial-aid award against the net-price estimate', 'Parent/Guardian', '', 'Per admitted college', 60, 'Award recorded and net-price variance noted'],
    ['DEC-03', 'Draft and submit a financial-aid appeal if the award is insufficient', 'Parent/Guardian', 'Counselor/Professional', 'Per admitted college, if warranted', 90, 'Appeal submitted or decision to accept recorded'],
    ['DEC-04', 'Decide waitlist response and submit a Letter of Continued Interest if pursuing', 'Student', 'Counselor/Professional', 'Per waitlisted college', 90, 'Waitlist response submitted or withdrawal recorded'],
    ['DEC-05', 'Compare admitted-college affordability and decide whether to enroll or decline', 'Shared', '', 'Per admitted college, before deposit', 60, 'Enroll or decline decision recorded for this college'],
    ['DEC-06', 'Submit enrollment deposit and confirm seat by the National Candidates Reply Date or an earlier binding deadline', 'Parent/Guardian', '', 'For the college chosen to enroll', 30, 'Deposit paid and confirmation saved'],
    ['DEC-07', 'Register for orientation and submit housing deposit or preferences', 'Student', 'Parent/Guardian', 'For the enrolling college', 45, 'Orientation registered and housing preferences submitted'],
    ['PM-01', 'Review completed and overdue work, decisions, 21-day deadlines, blockers, recruiting, and next week', 'Shared', '', 'Weekly inside rolling 90 days', 45, 'Plan updated and next actions assigned'],
  ];

  var OPTIONAL_MODULES = {
    'COL-08': 'Athletic Recruiting',
    'TST-01': 'Testing',
    'TST-02': 'Testing',
    'TST-03': 'Testing',
    'TST-04': 'Testing',
    'TST-05': 'Testing',
    'TST-06': 'Testing',
    'TST-07': 'Testing',
    'AID-08': 'CSS Profile',
    'AID-09': 'CSS Profile',
    'AID-10': 'CSS Profile',
    'ATH-01': 'Athletic Recruiting',
    'ATH-02': 'Athletic Recruiting',
    'ATH-03': 'Athletic Recruiting',
    'ATH-04': 'Athletic Recruiting',
    'ATH-05': 'Athletic Recruiting',
    'ATH-06': 'Athletic Recruiting',
    'ATH-07': 'Athletic Recruiting',
    'ATH-08': 'Athletic Recruiting',
    'ATH-09': 'Athletic Recruiting',
    'ATH-10': 'Athletic Recruiting',
    'VIS-01': 'Visits',
    'VIS-02': 'Visits',
    'VIS-03': 'Visits',
    'VIS-04': 'Visits',
    'VIS-05': 'Interviews',
    'VIS-06': 'Interviews',
    'PRT-01': 'Portfolio/Audition',
    'PRT-02': 'Portfolio/Audition',
    'PRT-03': 'Portfolio/Audition',
  };

  var SCOPES = {
    'STR-09': 'college',
    'COL-02': 'college', 'COL-03': 'college', 'COL-04': 'college',
    'COL-05': 'college', 'COL-06': 'college', 'COL-07': 'college',
    'COL-08': 'college', 'COL-09': 'college',
    'AID-03': 'college', 'AID-05': 'college', 'AID-08': 'college',
    'AID-11': 'college',
    'SCH-01': 'college', 'SCH-02': 'college', 'SCH-03': 'college',
    'SCH-06': 'scholarship', 'SCH-07': 'scholarship',
    'TST-05': 'college', 'TST-06': 'college', 'TST-07': 'college',
    'REC-07': 'college',
    'ESS-08': 'prompt', 'ESS-09': 'prompt', 'ESS-10': 'college',
    'ATH-05': 'college', 'ATH-06': 'college', 'ATH-07': 'college',
    'ATH-08': 'contact', 'ATH-09': 'contact', 'ATH-10': 'contact',
    'VIS-02': 'visit', 'VIS-03': 'visit', 'VIS-04': 'visit',
    'VIS-05': 'interview', 'VIS-06': 'interview',
    'PRT-01': 'portfolio', 'PRT-02': 'portfolio', 'PRT-03': 'portfolio',
    'SUB-01': 'college', 'SUB-02': 'college', 'SUB-03': 'college',
    'SUB-04': 'college', 'SUB-05': 'college',
    'DEC-01': 'college', 'DEC-02': 'college', 'DEC-03': 'college',
    'DEC-04': 'college', 'DEC-05': 'college', 'DEC-06': 'college',
    'DEC-07': 'college',
    'PM-01': 'recurring',
  };

  var STAGE_BY_PREFIX = {
    STR: 'Explore', PRO: 'Prepare', COL: 'Research', AID: 'Affordability',
    SCH: 'Scholarships', TST: 'Testing', REC: 'School Documents',
    APP: 'Application', ESS: 'Essays', ATH: 'Recruiting', VIS: 'Engagement',
    PRT: 'Portfolio', SUB: 'Submit', DEC: 'Decision', PM: 'Control',
  };

  var DEFAULT_OFFSETS = {
    STR: -300, PRO: -220, COL: -190, AID: -120, SCH: -100, TST: -170,
    REC: -100, APP: -80, ESS: -60, ATH: -150, VIS: -90, PRT: -60,
    SUB: -5, DEC: -14, PM: 0,
  };

  var OFFSET_OVERRIDES = {
    'STR-01': -420, 'STR-02': -415, 'STR-03': -410, 'STR-08': -110,
    'STR-09': -14,
    'PRO-02': -213, 'PRO-05': -200, 'PRO-07': -205, 'PRO-08': -210,
    'COL-01': -260, 'COL-10': -95,
    'AID-01': -180, 'AID-02': -150, 'AID-06': -20, 'AID-07': -14,
    'AID-09': -45, 'AID-10': -14, 'AID-11': -30,
    'SCH-05': -70, 'SCH-06': -7, 'SCH-07': 14,
    'TST-01': -240, 'TST-02': -225, 'TST-03': -210, 'TST-04': -200,
    'TST-05': -75, 'TST-06': -21, 'TST-07': 0,
    'REC-01': -140, 'REC-02': -135, 'REC-03': -125, 'REC-04': -115,
    'REC-05': -120, 'REC-06': -30, 'REC-07': -7,
    'APP-01': -110, 'APP-02': -100, 'APP-03': -95, 'APP-04': -80,
    'APP-05': -90, 'APP-06': -85, 'APP-07': -45, 'APP-08': -10,
    'ESS-01': -100, 'ESS-02': -95, 'ESS-03': -90, 'ESS-04': -82,
    'ESS-05': -70, 'ESS-06': -55, 'ESS-07': -35, 'ESS-08': -45,
    'ESS-09': -25, 'ESS-10': -7,
    'ATH-01': -220, 'ATH-02': -205, 'ATH-03': -195, 'ATH-04': -185,
    'ATH-05': -170, 'ATH-06': -160, 'ATH-07': -140, 'ATH-08': -130,
    'ATH-09': -115, 'ATH-10': -90,
    'VIS-01': -180, 'VIS-02': -45, 'VIS-03': -7, 'VIS-04': 0,
    'VIS-05': -14, 'VIS-06': 0,
    'PRT-01': -90, 'PRT-02': -75, 'PRT-03': -3,
    'SUB-01': -7, 'SUB-02': -3, 'SUB-03': 0, 'SUB-04': 2, 'SUB-05': 7,
    'DEC-01': 3, 'DEC-02': 10, 'DEC-03': 21, 'DEC-04': 14, 'DEC-05': -14,
    'DEC-06': -2, 'DEC-07': -3,
  };

  var DEPENDENCIES = {
    'STR-07': ['STR-04', 'STR-05', 'STR-06'],
    'STR-08': ['COL-09', 'AID-03'],
    'STR-09': ['STR-08'],
    'PRO-02': ['PRO-01'], 'PRO-05': ['PRO-03', 'PRO-04'],
    'PRO-07': ['PRO-06'], 'PRO-08': ['STR-04'],
    'COL-01': ['STR-04', 'STR-05', 'STR-06'],
    'COL-09': ['COL-02', 'COL-03', 'COL-06', 'COL-07', 'AID-03'],
    'COL-10': ['COL-09', 'STR-08'],
    'AID-04': ['AID-03'], 'AID-06': ['AID-01', 'AID-02'],
    'AID-07': ['AID-06'], 'AID-09': ['AID-08'], 'AID-10': ['AID-09'],
    'AID-11': ['AID-03', 'AID-05'],
    'SCH-05': ['SCH-01', 'SCH-02', 'SCH-03', 'SCH-04'],
    'SCH-06': ['SCH-05'], 'SCH-07': ['SCH-06'],
    'TST-02': ['TST-01'], 'TST-03': ['TST-02'], 'TST-04': ['TST-02'],
    'TST-05': ['TST-01'], 'TST-06': ['TST-05'],
    'REC-03': ['REC-02'], 'REC-04': ['REC-03', 'PRO-05'],
    'REC-05': ['PRO-05'], 'REC-06': ['REC-01'], 'REC-07': ['REC-03', 'REC-06'],
    'APP-02': ['APP-01'], 'APP-03': ['APP-01', 'PRO-01'],
    'APP-04': ['APP-01'], 'APP-05': ['PRO-03'], 'APP-06': ['PRO-04'],
    'APP-08': ['APP-02', 'APP-03', 'APP-04', 'APP-05', 'APP-06'],
    'ESS-01': ['COL-10'], 'ESS-02': ['PRO-06'], 'ESS-03': ['ESS-02'],
    'ESS-04': ['ESS-03'], 'ESS-05': ['ESS-04'], 'ESS-06': ['ESS-05'],
    'ESS-07': ['ESS-06'], 'ESS-09': ['ESS-08'], 'ESS-10': ['ESS-09'],
    'ATH-02': ['ATH-01'], 'ATH-04': ['PRO-01', 'ATH-02'],
    'ATH-05': ['ATH-01'], 'ATH-06': ['COL-01'], 'ATH-07': ['ATH-04'],
    'ATH-08': ['ATH-04', 'ATH-06'], 'ATH-09': ['ATH-08'], 'ATH-10': ['ATH-09'],
    'VIS-02': ['VIS-01'], 'VIS-03': ['VIS-02'], 'VIS-04': ['VIS-03'],
    'VIS-05': ['COL-05'], 'VIS-06': ['VIS-05'],
    'PRT-02': ['PRT-01'], 'PRT-03': ['PRT-02'],
    'SUB-01': ['APP-08', 'ESS-07', 'REC-07'], 'SUB-02': ['SUB-01'],
    'SUB-03': ['SUB-02'], 'SUB-04': ['SUB-03'], 'SUB-05': ['SUB-04'],
    'DEC-01': ['SUB-04'], 'DEC-02': ['DEC-01', 'AID-04'],
    'DEC-03': ['DEC-02'], 'DEC-04': ['DEC-01'], 'DEC-05': ['DEC-02'],
    'DEC-06': ['DEC-05'], 'DEC-07': ['DEC-06'],
  };

  var RESOURCE_LINKS = {
    'AID-02': 'https://studentaid.gov/articles/key-facts-accounts/',
    'AID-06': 'https://studentaid.gov/articles/fafsa-student-steps/',
    'AID-07': 'https://studentaid.gov/articles/fafsa-student-steps/',
    'AID-08': 'https://cssprofile.collegeboard.org/',
    'AID-09': 'https://cssprofile.collegeboard.org/',
    'AID-10': 'https://cssprofile.collegeboard.org/',
    'APP-01': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-02': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-03': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-04': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-05': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-06': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-07': 'https://www.commonapp.org/apply/first-year-students/',
    'APP-08': 'https://www.commonapp.org/apply/first-year-students/',
    'ATH-01': 'https://www.ncaa.org/eligibility-center/recruiting/',
    'ATH-02': 'https://www.ncaa.org/eligibility-center/recruiting/',
    'ATH-04': 'https://www.ncaa.org/eligibility-center/recruiting/',
    'ATH-07': 'https://www.ncaa.org/eligibility-center/recruiting/',
    'ATH-08': 'https://www.ncaa.org/eligibility-center/recruiting/',
  };

  /**
   * Describes the milestone source a template expects before runtime selects
   * the authoritative date for a particular family or college.
   * @param {string} templateId - Template ID
   * @param {string} scope - Template scope
   * @returns {string} Schedule anchor description
   */
  function scheduleAnchor_(templateId, scope) {
    if (scope === 'recurring') return 'Rolling 90-day week';
    if (scope === 'scholarship') return 'Scholarship deadline';
    if (scope === 'contact') return 'Recruiting next action';
    if (scope === 'visit') return 'Visit date';
    if (scope === 'interview') return 'Interview date';
    if (scope === 'portfolio') return 'Portfolio or application deadline';
    if (scope === 'prompt') return 'College application deadline';
    if (templateId.indexOf('AID-') === 0) return 'Aid availability or priority deadline';
    if (templateId.indexOf('SCH-') === 0) return 'Merit, honors, or scholarship deadline';
    if (templateId === 'TST-07') return 'AP/IB score-sending deadline (June 20)';
    if (templateId.indexOf('DEC-') === 0) return 'Decision, deposit, or housing date';
    if (scope === 'college') return 'College-specific authoritative deadline';
    return 'Earliest relevant college deadline';
  }

  /**
   * Converts the compact catalog rows to immutable-style template objects.
   * @returns {Array<Object>} Task templates
   */
  function getTemplates() {
    return ROWS.map(function(row) {
      var prefix = row[0].split('-')[0];
      var scope = SCOPES[row[0]] || 'global';
      var offsetDays = Object.prototype.hasOwnProperty.call(OFFSET_OVERRIDES, row[0]) ?
        OFFSET_OVERRIDES[row[0]] : DEFAULT_OFFSETS[prefix];
      return {
        templateId: row[0],
        task: row[1],
        ownerRole: row[2],
        supportRole: row[3],
        applicability: row[4],
        effortMinutes: row[5],
        deliverable: row[6],
        workstream: WORKSTREAMS[prefix],
        stage: STAGE_BY_PREFIX[prefix],
        module: OPTIONAL_MODULES[row[0]] || 'Core',
        scope: scope,
        scheduleRule: scope === 'recurring' ? 'Weekly recurrence' : 'Milestone offset',
        scheduleAnchor: scheduleAnchor_(row[0], scope),
        offsetDays: offsetDays,
        offsetWindow: scope === 'recurring' ? 'Weekly inside rolling 90 days' :
          (offsetDays === 0 ? 'On anchor date' :
            Math.abs(offsetDays) + ' days ' + (offsetDays < 0 ? 'before' : 'after') + ' anchor'),
        dependencies: (DEPENDENCIES[row[0]] || []).slice(),
        resourceLinks: RESOURCE_LINKS[row[0]] || '',
      };
    });
  }

  /**
   * Validates the catalog before it is rendered or used to generate a plan.
   * @returns {Object} Validation result
   */
  function validate() {
    var templates = getTemplates();
    var seen = {};
    var errors = [];
    templates.forEach(function(template) {
      if (seen[template.templateId]) errors.push('Duplicate template: ' + template.templateId);
      seen[template.templateId] = true;
      ['task', 'ownerRole', 'applicability', 'deliverable', 'workstream', 'stage',
        'scope', 'scheduleRule', 'scheduleAnchor', 'offsetWindow']
        .forEach(function(field) {
          if (!template[field]) errors.push(template.templateId + ' missing ' + field);
        });
      if (!(template.effortMinutes > 0)) {
        errors.push(template.templateId + ' has invalid effort');
      }
      if (typeof template.offsetDays !== 'number') {
        errors.push(template.templateId + ' has invalid schedule');
      }
    });
    templates.forEach(function(template) {
      template.dependencies.forEach(function(dependency) {
        if (!seen[dependency]) {
          errors.push(template.templateId + ' has unknown dependency ' + dependency);
        }
      });
    });
    return {ok: errors.length === 0, count: templates.length, errors: errors};
  }

  return {
    getTemplates: getTemplates,
    validate: validate,
    WORKSTREAMS: WORKSTREAMS,
  };
})();
