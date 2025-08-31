/******************************
 * College Tools (v5.5)
 * - Namespace architecture for better encapsulation
 * - Keeps all existing v5.x features
 * - API key: "ScorecardAPIKey"!A1
 * - Data sheet: "Colleges" (headers row 2)
 ******************************/

/* ======================= NAMESPACE ======================= */
/**
 * CollegeTools namespace - encapsulates all functionality
 */
var CollegeTools = (function() {
  'use strict';
  
  // Private variables
  var VERSION = 'v5.5';
  
  /* ======================= INTERNAL FUNCTIONS ======================= */
  
  /**
   * Displays the current version of College Tools in an alert dialog.
   */
  function showVersion(){ 
    SpreadsheetApp.getUi().alert('College Tools: '+VERSION); 
  }

/**
 * Test function that writes "TEST" to cell I3 in the Colleges sheet.
 * Used for debugging and verifying write permissions.
 */
function testWrite() {
  var sh = SpreadsheetApp.getActive().getSheetByName("Colleges");
  if (!sh) { SpreadsheetApp.getUi().alert('Sheet "Colleges" not found.'); return; }
  sh.getRange(3, 9).setValue("TEST"); // I3 = Acceptance Rate in your layout
  SpreadsheetApp.getUi().alert('Wrote "TEST" to Colleges!I3');
}

/* ======================= UTILS ======================= */
function highlight_(ranges) {
  var bg = '#FFF3CD';
  ranges.forEach(function(r){ r.setBackground(bg); });
  Utilities.sleep(350);
  ranges.forEach(function(r){ r.setBackground(null); });
}
function getPath(obj, pathArr) {
  var cur = obj;
  for (var i=0;i<pathArr.length;i++){ if (cur==null) return ""; cur = cur[pathArr[i]]; }
  return (cur==null ? "" : cur);
}
function getField(obj, nestedPathArr, flatKey) {
  var v = getPath(obj, nestedPathArr);
  if (v!=="" && v!=null) return v;
  if (obj && typeof obj==="object" && flatKey in obj) return obj[flatKey];
  return "";
}
/**
 * Escapes special regex characters in a string for use in regex patterns.
 * @param {string} s - String to escape
 * @returns {string} Escaped string safe for regex
 * @private
 */
function escapeRegex_(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
/**
 * Ensures a sheet exists in the spreadsheet, creating it if necessary.
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {string} name - Name of the sheet to ensure exists
 * @returns {Sheet} The existing or newly created sheet
 * @private
 */
function ensureSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  return sh ? sh : ss.insertSheet(name);
}
function setHeaders_(sh, headers) {
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#f1f3f4');
  sh.setFrozenRows(1);
  for (var c=1;c<=headers.length;c++) sh.autoResizeColumn(c);
}
function colIndex_(sh, header) {
  var last = Math.max(1, sh.getLastColumn());
  var hdrs = sh.getRange(1,1,1,last).getValues()[0];
  for (var i=0;i<hdrs.length;i++) if ((hdrs[i]||'').toString().trim() === header) return i+1;
  return null;
}
function columnToLetter_(column) {
  var temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
function addr(row, col){ return columnToLetter_(col)+row; }
function validateList_(sh, header, options) {
  var col = colIndex_(sh, header);
  if (!col) return;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(options, true).setAllowInvalid(false).build();
  sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setDataValidation(rule);
}
function validateDate_(sh, header) {
  var col = colIndex_(sh, header);
  if (!col) return;
  var rule = SpreadsheetApp.newDataValidation().requireDate().build();
  sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setDataValidation(rule);
}
function formatNumber_(sh, header, pattern) {
  var col = colIndex_(sh, header); if (!col) return;
  sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1)).setNumberFormat(pattern);
}

/**
 * Returns a mapping of US regions to their constituent states.
 * @returns {Object} Object with region names as keys and state arrays as values
 * @private
 */
function regionMap_(){
  return {
    NORTHEAST: ['CT','ME','MA','NH','NJ','NY','PA','RI','VT'],
    MIDWEST:   ['IL','IN','IA','KS','MI','MN','MO','NE','ND','OH','SD','WI'],
    SOUTH:     ['AL','AR','DE','DC','FL','GA','KY','LA','MD','MS','NC','OK','SC','TN','TX','VA','WV'],
    WEST:      ['AK','AZ','CA','CO','HI','ID','MT','NM','NV','OR','UT','WA','WY']
  };
}
/**
 * Determines the US region for a given state abbreviation.
 * @param {string} st - Two-letter state abbreviation
 * @returns {string} Region name (Northeast, Midwest, South, West) or empty string
 * @private
 */
function getRegionForState_(st){
  if (!st) return "";
  st = (st+"").trim().toUpperCase();
  var m = regionMap_();
  if (m.NORTHEAST.indexOf(st) !== -1) return 'Northeast';
  if (m.MIDWEST.indexOf(st)   !== -1) return 'Midwest';
  if (m.SOUTH.indexOf(st)     !== -1) return 'South';
  if (m.WEST.indexOf(st)      !== -1) return 'West';
  return ""; // unknown / territory
}


/**
 * Search College Names via the College Scorecard API.
 * Prompts for a search query (e.g., "unh" or "new hampshire") with optional state filter.
 * Writes up to 25 official matches into a sheet named "Lookup" (created/cleared).
 * Results include: Official Name, City, State, Type, IPEDS ID, Website.
 * Use the "Official Name" from results for accurate data fetching in the Colleges sheet.
 */
function searchCollegeNames() {
  var ss = SpreadsheetApp.getActive();
  var ui = SpreadsheetApp.getUi();

  // --- API key
  var keySheet = ss.getSheetByName("ScorecardAPIKey");
  if (!keySheet) { ui.alert('Missing sheet "ScorecardAPIKey" with API key in A1.'); return; }
  var apiKey = (keySheet.getRange("A1").getValue()||"").toString().trim();
  if (!apiKey) { ui.alert('Add your api.data.gov key to ScorecardAPIKey!A1.'); return; }

  // --- Prompt: allow optional state filter as ", NH" etc.
  var resp = ui.prompt(
    "Search College Names",
    "Enter a keyword (e.g., unh, new hampshire, georgia tech)\nOptionally add a state after a comma (e.g., unh, NH)",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var raw = (resp.getResponseText()||"").trim();
  if (!raw) { ui.alert("No query entered."); return; }

  var q = raw, state = "";
  if (raw.indexOf(",") !== -1) {
    var parts = raw.split(",");
    q = (parts[0]||"").trim();
    state = (parts[1]||"").trim().toUpperCase();
    if (state.length === 1) state = ""; // ignore junk
  }

  // --- Helpers
  function buildUrl(params){
    var base = 'https://api.data.gov/ed/collegescorecard/v1/schools';
    var arr = [];
    for (var k in params) if (params.hasOwnProperty(k)) {
      arr.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
    }
    return base + '?' + arr.join('&');
  }
  function fetchJson(url, tries){
    tries = tries || 1;
    for (var i=0;i<tries;i++){
      var res;
      try { res = UrlFetchApp.fetch(url, {muteHttpExceptions:true}); }
      catch(e){ Utilities.sleep(300 * (i+1)); continue; }
      var code = res.getResponseCode();
      if (code === 200) {
        try { return { ok:true, data: JSON.parse(res.getContentText()) }; }
        catch(e2){ return { ok:false, code:200, err:"parse" }; }
      }
      // Retry on transient 5xx
      if (code >= 500 && code < 600) { Utilities.sleep(300 * (i+1)); continue; }
      return { ok:false, code:code, body:res.getContentText() };
    }
    return { ok:false, code:500, err:"retries_exhausted" };
  }
  function escapeRegex_(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function typeFromOwnership(code){
    if (code===1) return 'Public';
    if (code===2) return 'Private (nonprofit)';
    if (code===3) return 'Private (for-profit)';
    return '';
  }
  function rowsFromResults(results){
    var rows = [['Official Name','City','State','Type','IPEDS ID','Website']];
    results.forEach(function(r){
      var name = (r['school.name'] || (r.school && r.school.name) || '');
      var city = (r['school.city'] || (r.school && r.school.city) || '');
      var st   = (r['school.state'] || (r.school && r.school.state) || '');
      var own  = (typeof r['school.ownership'] !== 'undefined') ? r['school.ownership']
                : (r.school ? r.school.ownership : '');
      var type = typeFromOwnership(own);
      var url  = (r['school.school_url'] || (r.school && r.school.school_url) || '');
      var id   = (typeof r['id'] !== 'undefined') ? r['id'] : '';
      rows.push([name, city, st, type, id, url]);
    });
    return rows;
  }

  // --- Shared request pieces
  var fields = [
    'id','school.name','school.city','school.state','school.ownership','school.school_url'
  ].join(',');
  var baseParams = {
    api_key: apiKey,
    per_page: 25,
    fields: fields,
    'school.operating': 1
  };
  if (state && /^[A-Z]{2}$/.test(state)) baseParams['school.state'] = state;

  // --- Strategy:
  // 1) school.search (fuzzy)   2) exact school.name   3) regex school.name
  var attempts = [
    (function(){
      var p = JSON.parse(JSON.stringify(baseParams));
      p['school.search'] = q; // fuzzy search
      return { label:'search', url: buildUrl(p) };
    })(),
    (function(){
      var p = JSON.parse(JSON.stringify(baseParams));
      p['school.name'] = q; // exact
      return { label:'exact', url: buildUrl(p) };
    })(),
    (function(){
      var p = JSON.parse(JSON.stringify(baseParams));
      p['school.name'] = '~.*' + escapeRegex_(q) + '.*'; // regex contains
      return { label:'regex', url: buildUrl(p) };
    })()
  ];

  var results = [];
  var notes = [];
  for (var a=0;a<attempts.length;a++){
    var r = fetchJson(attempts[a].url, 3);
    if (r.ok && r.data && r.data.results && r.data.results.length){
      results = r.data.results;
      notes.push(attempts[a].label+':200('+r.data.results.length+')');
      break;
    } else {
      notes.push(attempts[a].label+':' + (r.code||'err'));
      // If server 5xx, continue to next attempt; if 4xx, also try next pattern
    }
  }

  if (!results.length) {
    ui.alert('No matches found or the API errored.\nTried: ' + notes.join(' | '));
    return;
  }

  // --- Write to Lookup
  var rows = rowsFromResults(results);
  var lookup = ss.getSheetByName('Lookup');
  if (!lookup) lookup = ss.insertSheet('Lookup');
  lookup.clear();
  lookup.getRange(1,1,rows.length,rows[0].length).setValues(rows);
  lookup.getRange(1,1,1,rows[0].length).setFontWeight('bold').setBackground('#e8f0fe');
  for (var c=1;c<=rows[0].length; c++) lookup.autoResizeColumn(c);

  ui.alert('Found ' + (rows.length-1) + ' match(es) ['+notes.join(' | ')+'].\nSee the "Lookup" sheet and copy the Official Name into Colleges → College Name.');
}


/**
 * Core function that fills a row with college data from the Scorecard API.
 * Used by both single-row and batch fill operations.
 * @param {number} row - Row number to fill (1-based)
 * @param {Object} opts - Options object
 * @param {boolean} opts.suppressAlert - If true, suppresses UI alerts
 * @returns {Object} Result object with {ok: boolean, msg: string}
 * @private
 */
function fillCollegeRowCore_(row, opts) {
  opts = opts || {};
  var suppressAlert = !!opts.suppressAlert;

  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("Colleges");
  if (!sh) { if(!suppressAlert) SpreadsheetApp.getUi().alert('Sheet "Colleges" not found.'); return {ok:false, msg:'no sheet'}; }
  if (row < 3) { if(!suppressAlert) SpreadsheetApp.getUi().alert("Click a data row (row 3 or below)."); return {ok:false, msg:'row<3'}; }

  // Headers (row 2)
  var hdrs = sh.getRange(2,1,1,sh.getLastColumn()).getValues()[0].map(function(x){ return (x||"").toString().trim(); });
  function col(h){ var i = hdrs.indexOf(h); if(i===-1) throw new Error('Missing header: '+h); return i+1; }
  var idxRegion0 = hdrs.indexOf("Region");

  var COL = {
    NAME: col("College Name"),
    CITY: col("City"),
    STATE: col("State"),
    TYPE: col("Type (Public/Private)"),
    ACC:  col("Acceptance Rate"),
    RET:  col("First-Year Retention"),
    GRAD: col("Grad Rate"),
    EARN: col("Median Earnings (10yr)"),
    COA:  col("Total Cost of Attendance"),
    NET:  col("Estimated Net Price"),
    LINK: col("Link"),
    SAT25: col("SAT 25%"),
    SAT75: col("SAT 75%"),
    ACT25: col("ACT 25%"),
    ACT75: col("ACT 75%"),
    NOTES: col("Notes")
  };

  var name = (sh.getRange(row, COL.NAME).getValue()||"").toString().trim();
  if (!name) return {ok:false, msg:'empty name'};

  // API key
  var keySheet = ss.getSheetByName("ScorecardAPIKey");
  if (!keySheet) { if(!suppressAlert) SpreadsheetApp.getUi().alert('Create "ScorecardAPIKey" and put your api.data.gov key in A1.'); return {ok:false, msg:'no key sheet'}; }
  var apiKey = (keySheet.getRange("A1").getValue()||"").toString().trim();
  if (!apiKey) { if(!suppressAlert) SpreadsheetApp.getUi().alert('Add your api.data.gov key to ScorecardAPIKey!A1.'); return {ok:false, msg:'no key'}; }

  // Fields
  var fields = [
    'school.name','school.city','school.state','school.ownership','school.school_url',
    'latest.admissions.admission_rate.overall',
    'latest.student.retention_rate.four_year.full_time',
    'latest.completion.rate_suppressed.overall',
    'latest.earnings.10_yrs_after_entry.median',
    'latest.cost.attendance.academic_year',
    'latest.cost.avg_net_price.overall',
    'latest.admissions.sat_scores.25th_percentile.math',
    'latest.admissions.sat_scores.25th_percentile.critical_reading',
    'latest.admissions.sat_scores.75th_percentile.math',
    'latest.admissions.sat_scores.75th_percentile.critical_reading',
    'latest.admissions.sat_scores.average.overall',
    'latest.admissions.act_scores.25th_percentile.cumulative',
    'latest.admissions.act_scores.75th_percentile.cumulative',
    'latest.aid.pell_grant_rate',
    'latest.aid.median_debt.completers.overall'
  ].join(',');

  function fetchOnce(q) {
    var base = 'https://api.data.gov/ed/collegescorecard/v1/schools';
    var parts = [];
    for (var k in q) if (q.hasOwnProperty(k)) parts.push(encodeURIComponent(k)+'='+encodeURIComponent(q[k]));
    var url = base + '?' + parts.join('&');
    var res = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
    return { code: res.getResponseCode(), body: res.getContentText() };
  }

  // Exact → regex
  var q1 = { api_key: apiKey, per_page: 5, fields: fields, 'school.operating': 1, 'school.name': name };
  var r1 = fetchOnce(q1);

  var results = [];
  var noteBits = ['HTTP '+r1.code];
  if (r1.code === 200) {
    try { results = (JSON.parse(r1.body).results)||[]; } catch(e) { results=[]; noteBits.push('parse err'); }
  }
  if (!results.length) {
    var q2 = { api_key: apiKey, per_page: 5, fields: fields, 'school.operating': 1, 'school.name': '~.*'+escapeRegex_(name)+'.*' };
    var r2 = fetchOnce(q2);
    noteBits.push('regex '+r2.code);
    if (r2.code === 200) {
      try { results = (JSON.parse(r2.body).results)||[]; } catch(e2) { results=[]; noteBits.push('parse err'); }
    }
  }
  if (!results.length) {
    sh.getRange(row, COL.NOTES).setValue(VERSION+' | no match for "'+name+'" ('+noteBits.join(' | ')+')');
    if(!suppressAlert) SpreadsheetApp.getUi().alert('No match for "'+name+'". See Notes.');
    return {ok:false, msg:'no match'};
  }

  var r = results[0];

  // Reads
  var usedName = getField(r, ['school','name'], 'school.name');
  var city     = getField(r, ['school','city'], 'school.city');
  var state    = getField(r, ['school','state'], 'school.state');
  var link     = getField(r, ['school','school_url'], 'school.school_url');

  var ownCode  = getField(r, ['school','ownership'], 'school.ownership');
  var typeText = (ownCode===1) ? 'Public' : (ownCode===2) ? 'Private (nonprofit)' : (ownCode===3) ? 'Private (for-profit)' : '';

  var acc        = getField(r, ['latest','admissions','admission_rate','overall'], 'latest.admissions.admission_rate.overall');
  var retention  = getField(r, ['latest','student','retention_rate','four_year','full_time'], 'latest.student.retention_rate.four_year.full_time');
  var gradRate   = getField(r, ['latest','completion','rate_suppressed','overall'], 'latest.completion.rate_suppressed.overall');
  var earnings10 = getField(r, ['latest','earnings','10_yrs_after_entry','median'], 'latest.earnings.10_yrs_after_entry.median');
  var coa        = getField(r, ['latest','cost','attendance','academic_year'], 'latest.cost.attendance.academic_year');
  var netPrice   = getField(r, ['latest','cost','avg_net_price','overall'], 'latest.cost.avg_net_price.overall');

  function n(x){ return (x===null||x===undefined||x==="") ? null : Number(x); }
  var sat25m = n(getField(r, ['latest','admissions','sat_scores','25th_percentile','math'], 'latest.admissions.sat_scores.25th_percentile.math'));
  var sat25r = n(getField(r, ['latest','admissions','sat_scores','25th_percentile','critical_reading'], 'latest.admissions.sat_scores.25th_percentile.critical_reading'));
  var sat75m = n(getField(r, ['latest','admissions','sat_scores','75th_percentile','math'], 'latest.admissions.sat_scores.75th_percentile.math'));
  var sat75r = n(getField(r, ['latest','admissions','sat_scores','75th_percentile','critical_reading'], 'latest.admissions.sat_scores.75th_percentile.critical_reading'));
  var satAvg = n(getField(r, ['latest','admissions','sat_scores','average','overall'], 'latest.admissions.sat_scores.average.overall'));

  var sat25 = (sat25m!=null && sat25r!=null) ? (sat25m + sat25r) : (satAvg!=null ? satAvg : "");
  var sat75 = (sat75m!=null && sat75r!=null) ? (sat75m + sat75r) : (satAvg!=null ? satAvg : "");

  var act25 = getField(r, ['latest','admissions','act_scores','25th_percentile','cumulative'], 'latest.admissions.act_scores.25th_percentile.cumulative');
  var act75 = getField(r, ['latest','admissions','act_scores','75th_percentile','cumulative'], 'latest.admissions.act_scores.75th_percentile.cumulative');

  var regionVal = (idxRegion0 !== -1) ? getRegionForState_(state) : "";

  // Write
  var writes = [
    [COL.CITY, city],
    [COL.STATE, state],
    [COL.TYPE, typeText],
    [COL.ACC, acc],
    [COL.RET, retention],
    [COL.GRAD, gradRate],
    [COL.EARN, earnings10],
    [COL.COA, coa],
    [COL.NET, netPrice],
    [COL.LINK, link],
    [COL.SAT25, sat25],
    [COL.SAT75, sat75],
    [COL.ACT25, act25],
    [COL.ACT75, act75]
  ];
  if (idxRegion0 !== -1) writes.push([idxRegion0 + 1, regionVal]);

  writes.forEach(function(w){ sh.getRange(row, w[0]).setValue(w[1]); });
  sh.getRange(row, COL.NOTES).setValue(VERSION+' | '+(usedName||name));

  if (!suppressAlert) {
    // Highlight when run one-off
    var toFlash = writes.map(function(w){ return sh.getRange(row, w[0]); });
    toFlash.push(sh.getRange(row, COL.NOTES));
    highlight_(toFlash);
  }

  // Seed trackers (quietly in batch mode too)
  setupAllTrackers();
  syncCollegeToTrackers_( { name: (usedName||name), coa: coa } );

  return {ok:true, msg:'ok'};
}

/* ================== COLLEGES: FILL CURRENT ROW (with Region auto-fill) ================== */
/**
 * Fills the currently selected row in the Colleges sheet with data from the College Scorecard API.
 * Automatically populates college information including city, state, type, acceptance rate, costs, etc.
 * Also seeds tracker sheets with the college name and triggers region auto-fill.
 */
function fillCollegeRow() {
  var sh = SpreadsheetApp.getActive().getSheetByName("Colleges");
  if (!sh) { SpreadsheetApp.getUi().alert('Sheet "Colleges" not found.'); return; }
  var row = sh.getActiveCell().getRow();
  var res = fillCollegeRowCore_(row, {suppressAlert:false});
  if (res.ok) SpreadsheetApp.getUi().alert('Updated row '+row+'.');
}



/* ================== TRACKERS: CREATE/ENSURE ================== */
/**
 * Creates or updates all tracker sheets (Financial Aid, Campus Visit, Application Timeline, Scholarships).
 * Sets up headers, formulas, and data validation for each tracker.
 * Safe to run multiple times - will not overwrite existing data.
 */
function setupAllTrackers() {
  var ss = SpreadsheetApp.getActive();
  createOrUpdate_FinAid(ss);
  createOrUpdate_CampusVisit(ss);
  createOrUpdate_AppTimeline(ss);
  createOrUpdate_Scholarships(ss);
}

/**
 * Creates or updates the Financial Aid Tracker sheet with headers and formulas.
 * @param {Spreadsheet} ss - The spreadsheet object
 * @private
 */
function createOrUpdate_FinAid(ss) {
  var name = 'Financial Aid Tracker';
  var sh = ensureSheet_(ss, name);
  var headers = [
    'College Name','FAFSA Deadline','CSS Profile Required (Y/N)','CSS Deadline','Priority Deadline',
    'EFC (Expected Family Contribution)',
    'Total Cost of Attendance','Tuition & Fees','Room & Board','Books & Supplies','Personal Expenses','Travel Costs',
    'Federal Grants','State Grants','Institutional Grants','Merit Scholarships','Need-Based Aid','Work-Study Offered',
    'Subsidized Loans','Unsubsidized Loans','Parent PLUS Loans',
    'Net Price After Aid','Out-of-Pocket Cost','4-Year Projected Cost',
    'Outside Scholarships Applied','Appeal Status','Notes'
  ];
  setHeaders_(sh, headers);

  ['FAFSA Deadline','CSS Deadline','Priority Deadline'].forEach(function(h){ validateDate_(sh, h); });
  validateList_(sh, 'CSS Profile Required (Y/N)', ['Y','N']);
  validateList_(sh, 'Work-Study Offered', ['Y','N']);
  validateList_(sh, 'Appeal Status', ['Not Started','In Progress','Submitted','Approved','Denied']);

  // Formulas row 2 (user can fill down)
  var map = function(h){ return colIndex_(sh,h); };
  var r2 = 2;
  var f_Net = '=IFERROR(' + addr(r2,map('Total Cost of Attendance')) + '-SUM(' + addr(r2,map('Federal Grants')) + ':' + addr(r2,map('Need-Based Aid')) + '), "")';
  var f_OOP = '=IFERROR(' + addr(r2,map('Net Price After Aid')) + '-' + addr(r2,map('Outside Scholarships Applied')) + ', "")';
  var f_4yr = '=IFERROR(' + addr(r2,map('Out-of-Pocket Cost')) + '*(1+0.03+0.03^2+0.03^3), "")';
  sh.getRange(r2, map('Net Price After Aid')).setFormula(f_Net);
  sh.getRange(r2, map('Out-of-Pocket Cost')).setFormula(f_OOP);
  sh.getRange(r2, map('4-Year Projected Cost')).setFormula(f_4yr);
}

/**
 * Creates or updates the Campus Visit Tracker sheet with headers and validation.
 * @param {Spreadsheet} ss - The spreadsheet object
 * @private
 */
function createOrUpdate_CampusVisit(ss) {
  var name = 'Campus Visit Tracker';
  var sh = ensureSheet_(ss, name);
  var headers = [
    'College Name','Visit Date','Visit Type (In-Person/Virtual/College Fair)','Registration Confirmation #',
    'Questions Prepared','Departments to Visit','People to Meet',
    'Tour Guide Name','Tour Quality (1-10)','Info Session Presenter','Info Session Quality (1-10)','Admissions Officer Met',
    'Classes Attended','Professor Names/Subjects','Current Students Met','Student Names/Majors',
    'Dining Halls Visited','Dorms Toured','Athletic Facilities Seen','Library Visited','Student Center Visited',
    'Campus Beauty (1-10)','Facilities Quality (1-10)','Student Happiness (1-10)','Academic Vibe (1-10)','Social Atmosphere (1-10)','Overall Gut Feeling (1-10)',
    'Pros','Cons','Surprises','Concerns','Best Feature','Worst Feature',
    'Thank You Email Sent','Connected on Social Media','Added to Mailing List','Additional Info Requested','Next Steps',
    'Visit Score'
  ];
  setHeaders_(sh, headers);

  validateDate_(sh, 'Visit Date');
  validateList_(sh, 'Visit Type (In-Person/Virtual/College Fair)', ['In-Person','Virtual','College Fair','Regional Event']);
  validateList_(sh, 'Tour Quality (1-10)', ['1','2','3','4','5','6','7','8','9','10']);
  validateList_(sh, 'Info Session Quality (1-10)', ['1','2','3','4','5','6','7','8','9','10']);
  ['Thank You Email Sent','Connected on Social Media','Added to Mailing List','Additional Info Requested'].forEach(function(h){
    validateList_(sh, h, ['Y','N']);
  });
}

/**
 * Creates or updates the Application Timeline sheet with headers and formulas.
 * @param {Spreadsheet} ss - The spreadsheet object
 * @private
 */
function createOrUpdate_AppTimeline(ss) {
  var name = 'Application Timeline';
  var sh = ensureSheet_(ss, name);
  var headers = [
    'College Name','Application Type (ED/ED2/EA/REA/RD)',
    'Application Opens','Application Deadline','Test Score Deadline','Transcript Deadline','Counselor Rec Deadline','Teacher Rec Deadline',
    'FAFSA Opens','FAFSA Priority Deadline','CSS Profile Deadline','Merit Scholarship Deadline','Honors Program Deadline','Portfolio/Audition Due',
    'Mid-Year Report Due','Decision Release Date',
    'Student Visit Day','Housing Application Opens','Housing Deposit Due','Enrollment Deposit Deadline','Orientation Registration Opens',
    'Days Until Deadline (App)','Priority Level','Completion Status (%)',
    '60-Day Warning','30-Day Warning','14-Day Warning','7-Day Warning'
  ];
  setHeaders_(sh, headers);

  headers.forEach(function(h){ if (/(Deadline|Opens|Due|Date)$/i.test(h)) validateDate_(sh,h); });
  validateList_(sh, 'Application Type (ED/ED2/EA/REA/RD)', ['ED','ED2','EA','REA','RD']);
  validateList_(sh, 'Priority Level', ['High','Medium','Low']);

  var ciAD = colIndex_(sh, 'Application Deadline');
  var ciDays = colIndex_(sh, 'Days Until Deadline (App)');
  if (ciAD && ciDays) {
    sh.getRange(2, ciDays).setFormula('=IF(' + addr(2,ciAD) + '-TODAY()>0, ' + addr(2,ciAD) + '-TODAY(), "PAST DUE")');
  }
  var setWarn = function(hdr, days){
    var c = colIndex_(sh, hdr);
    if (!c) return;
    sh.getRange(2, c).setFormula('=IF(ISNUMBER('+addr(2,ciAD)+'), '+addr(2,ciAD)+'-TODAY()<='+days+', "")');
  };
  setWarn('60-Day Warning', 60);
  setWarn('30-Day Warning', 30);
  setWarn('14-Day Warning', 14);
  setWarn('7-Day Warning', 7);
}

/**
 * Creates or updates the Scholarship Tracker sheet with headers and validation.
 * @param {Spreadsheet} ss - The spreadsheet object
 * @private
 */
function createOrUpdate_Scholarships(ss) {
  var name = 'Scholarship Tracker';
  var sh = ensureSheet_(ss, name);
  var headers = [
    'Scholarship Name','Provider/Organization','Type (Merit/Need/Field/Local/National)','Amount','Award Type (One-time/Renewable)',
    'GPA Requirement','Test Score Requirement','Financial Need Required','Special Criteria','Geographic Restrictions',
    'Deadline','Application Portal/Link','Essays Required (#)','Essay Topics','Word Count','Letters of Rec (#)','Recommender Types',
    'Transcript Required','FAFSA Required','Portfolio/Work Samples','Interview Required',
    'Application Started Date','Application Submitted Date','Confirmation Received','Interview Scheduled','Interview Completed',
    'Decision Date','Award Status (Pending/Awarded/Declined)','Amount Awarded','Thank You Note Sent',
    'Renewable for # Years','GPA to Maintain','Credit Hours Required','Other Renewal Requirements','Notes/Strategy'
  ];
  setHeaders_(sh, headers);

  validateList_(sh, 'Type (Merit/Need/Field/Local/National)', ['Merit','Need','Field-Specific','Local','National']);
  validateList_(sh, 'Award Type (One-time/Renewable)', ['One-time','Renewable']);
  validateList_(sh, 'Financial Need Required', ['Y','N']);
  validateList_(sh, 'Transcript Required', ['Y','N']);
  validateList_(sh, 'FAFSA Required', ['Y','N']);
  validateList_(sh, 'Portfolio/Work Samples', ['Y','N']);
  validateList_(sh, 'Interview Required', ['Y','N']);
  validateList_(sh, 'Award Status (Pending/Awarded/Declined)', ['Pending','Awarded','Declined']);
  validateList_(sh, 'Thank You Note Sent', ['Y','N']);

  ['Deadline','Application Started Date','Application Submitted Date','Interview Scheduled','Interview Completed','Decision Date']
    .forEach(function(h){ validateDate_(sh,h); });
}

/* ================== SYNC CURRENT COLLEGE → TRACKERS ================== */
/**
 * Synchronizes college information to all tracker sheets.
 * @param {Object} info - College information object
 * @param {string} info.name - College name
 * @param {number} info.coa - Cost of attendance
 * @private
 */
function syncCollegeToTrackers_(info){
  // info: { name, coa }
  var ss = SpreadsheetApp.getActive();

  var fa = ss.getSheetByName('Financial Aid Tracker');
  if (fa) ensureCollegeRowAndSet_(fa, 'College Name', info.name, { 'Total Cost of Attendance': info.coa });

  var cv = ss.getSheetByName('Campus Visit Tracker');
  if (cv) ensureCollegeRowAndSet_(cv, 'College Name', info.name, { });

  var at = ss.getSheetByName('Application Timeline');
  if (at) ensureCollegeRowAndSet_(at, 'College Name', info.name, { });
}

/**
 * Ensures a college exists in a tracker sheet and updates its data.
 * @param {Sheet} sh - The tracker sheet
 * @param {string} collegeHeader - Header name for the college column
 * @param {string} collegeName - Name of the college
 * @param {Object} updatesObj - Object with column headers as keys and values to set
 * @private
 */
function ensureCollegeRowAndSet_(sh, collegeHeader, collegeName, updatesObj){
  var nameCol = colIndex_(sh, collegeHeader);
  if (!nameCol) return;
  var last = Math.max(2, sh.getLastRow());
  var foundRow = null;
  var vals = sh.getRange(2, nameCol, last-1, 1).getValues();
  for (var i=0;i<vals.length;i++){
    if ((vals[i][0]||'').toString().trim().toLowerCase() === collegeName.toString().trim().toLowerCase()){
      foundRow = i+2; break;
    }
  }
  if (!foundRow) { foundRow = last+1; sh.getRange(foundRow, nameCol).setValue(collegeName); }
  if (updatesObj && Object.keys(updatesObj).length){
    for (var key in updatesObj){
      if (!updatesObj.hasOwnProperty(key)) continue;
      var c = colIndex_(sh, key); if (!c) continue;
      sh.getRange(foundRow, c).setValue(updatesObj[key]);
    }
  }
}

/* ================== FORMATTING & DROPDOWNS (idempotent) ================== */
/**
 * Applies formatting and dropdown validations to all sheets.
 * Sets number formats for percentages, currency, and scores.
 * Creates dropdown lists for ratings, yes/no fields, and status fields.
 * Idempotent - safe to run multiple times without side effects.
 */
function enhanceFormatsDropdowns(){
  var ss = SpreadsheetApp.getActive();

  // Colleges
  var col = ss.getSheetByName('Colleges');
  if (col){
    ['Acceptance Rate','First-Year Retention','Grad Rate'].forEach(function(h){ formatNumber_(col, h, '0.0%'); });
    ['Median Earnings (10yr)','Total Cost of Attendance','Estimated Net Price','Avg Merit Aid','Avg Need-Based Aid']
      .forEach(function(h){ formatNumber_(col, h, '$#,##0'); });
    ['SAT 25%','SAT 75%','ACT 25%','ACT 75%'].forEach(function(h){ formatNumber_(col, h, '0'); });
    ['Distance (mi)','Travel Time (hrs)'].forEach(function(h){ formatNumber_(col, h, '0.0'); });
    ['Weighted Score','Value Score'].forEach(function(h){ formatNumber_(col, h, '0.00'); });

    ['Program Fit (1-5)','Academic Reputation (1-5)','Research Opportunities (1-5)','Safety (1-5)',
     'Campus Culture Fit (1-5)','Weather Fit (1-5)','Clubs/Activities (1-5)','Personal Priority (1-5)']
     .forEach(function(h){ validateList_(col, h, ['1','2','3','4','5']); });
  }

  // Financial Aid Tracker
  var fa = ss.getSheetByName('Financial Aid Tracker');
  if (fa){
    ['FAFSA Deadline','CSS Deadline','Priority Deadline'].forEach(function(h){ validateDate_(fa, h); });
    ['Total Cost of Attendance','Tuition & Fees','Room & Board','Books & Supplies','Personal Expenses','Travel Costs',
     'Federal Grants','State Grants','Institutional Grants','Merit Scholarships','Need-Based Aid',
     'Subsidized Loans','Unsubsidized Loans','Parent PLUS Loans',
     'Net Price After Aid','Out-of-Pocket Cost','4-Year Projected Cost','Outside Scholarships Applied']
     .forEach(function(h){ formatNumber_(fa, h, '$#,##0'); });
  }

  // Campus Visit Tracker
  var cv = ss.getSheetByName('Campus Visit Tracker');
  if (cv){
    validateDate_(cv, 'Visit Date');
    ['Tour Quality (1-10)','Info Session Quality (1-10)','Campus Beauty (1-10)','Facilities Quality (1-10)',
     'Student Happiness (1-10)','Academic Vibe (1-10)','Social Atmosphere (1-10)','Overall Gut Feeling (1-10)','Visit Score']
     .forEach(function(h){ formatNumber_(cv, h, '0'); });
    validateList_(cv, 'Visit Type (In-Person/Virtual/College Fair)', ['In-Person','Virtual','College Fair','Regional Event']);
    ['Thank You Email Sent','Connected on Social Media','Added to Mailing List','Additional Info Requested']
      .forEach(function(h){ validateList_(cv, h, ['Y','N']); });
  }

  // Application Timeline
  var at = ss.getSheetByName('Application Timeline');
  if (at){
    // Date columns (any header ending with Deadline/Opens/Due/Date)
    var atHdrs = at.getRange(1,1,1,at.getLastColumn()).getValues()[0];
    for (var i=0;i<atHdrs.length;i++){
      var h = (atHdrs[i]||'').toString().trim();
      if (/(Deadline|Opens|Due|Date)$/i.test(h)) formatNumber_(at, h, 'yyyy-mm-dd');
    }
    formatNumber_(at, 'Days Until Deadline (App)', '0');
    validateList_(at, 'Application Type (ED/ED2/EA/REA/RD)', ['ED','ED2','EA','REA','RD']);
    validateList_(at, 'Priority Level', ['High','Medium','Low']);
  }

  // Scholarship Tracker
  var sc = ss.getSheetByName('Scholarship Tracker');
  if (sc){
    ['Amount','Amount Awarded'].forEach(function(h){ formatNumber_(sc, h, '$#,##0'); });
    ['Deadline','Application Started Date','Application Submitted Date','Interview Scheduled','Interview Completed','Decision Date']
      .forEach(function(h){ formatNumber_(sc, h, 'yyyy-mm-dd'); });
  }

  SpreadsheetApp.getUi().alert('Formats & dropdowns applied.');
}


/* ================== SCORING (Weights + formulas) ================== */
/**
 * Sets up the weighted scoring system for colleges and campus visits.
 * Creates a Weights sheet with default weight values for different criteria.
 * Applies formulas to calculate Weighted Score in Colleges sheet and Visit Score in Campus Visit Tracker.
 * Formulas use VLOOKUP to reference weights dynamically from the Weights sheet.
 */
function ensureScoring(){
  var ss = SpreadsheetApp.getActive();
  // Ensure Weights sheet with defaults
  var ws = ensureSheet_(ss, 'Weights');
  ws.clear();
  ws.getRange(1,1,1,2).setValues([['Setting','Weight']]).setFontWeight('bold');
  var rows = [
    ['Program Fit (1-5)', 2],
    ['Academic Reputation (1-5)', 1.5],
    ['Research Opportunities (1-5)', 1],
    ['Safety (1-5)', 1],
    ['Campus Culture Fit (1-5)', 1.5],
    ['Weather Fit (1-5)', 0.5],
    ['Clubs/Activities (1-5)', 1],
    ['Personal Priority (1-5)', 2],

    // Campus Visit rating weights (1–10 scale)
    ['Tour Quality (1-10)', 1],
    ['Info Session Quality (1-10)', 1],
    ['Campus Beauty (1-10)', 1],
    ['Facilities Quality (1-10)', 1],
    ['Student Happiness (1-10)', 1],
    ['Academic Vibe (1-10)', 1],
    ['Social Atmosphere (1-10)', 1],
    ['Overall Gut Feeling (1-10)', 1]
  ];
  ws.getRange(2,1,rows.length,2).setValues(rows);

  // Colleges → Weighted Score
  var col = ss.getSheetByName('Colleges');
  if (col){
    var getC = function(h){ return colIndex_(col,h); };
    var rStart = 3, rEnd = Math.max(3, col.getLastRow());
    var pieces = [
      ['Program Fit (1-5)'],
      ['Academic Reputation (1-5)'],
      ['Research Opportunities (1-5)'],
      ['Safety (1-5)'],
      ['Campus Culture Fit (1-5)'],
      ['Weather Fit (1-5)'],
      ['Clubs/Activities (1-5)'],
      ['Personal Priority (1-5)']
    ];
    // Build formula using SUMPRODUCT with weights looked up via INDEX/MATCH in Weights
    function scoreFormula(row){
      var num = [], den = [];
      pieces.forEach(function(p){
        var h = p[0];
        var c = getC(h);
        if (c){
          var cell = addr(row, c);
          var w = 'IFERROR(VLOOKUP("'+h+'",Weights!A:B,2,false),0)';
          num.push(cell + '*' + w);
          den.push(w);
        }
      });
      return '=IFERROR((' + num.join('+') + ')/(' + den.join('+') + '), "")';
    }
    var cScore = getC('Weighted Score');
    if (cScore){
      for (var r=rStart; r<=rEnd; r++){
        var name = (col.getRange(r, getC('College Name')).getValue()||'').toString().trim();
        if (!name) continue;
        col.getRange(r, cScore).setFormula(scoreFormula(r));
      }
      formatNumber_(col, 'Weighted Score', '0.00');
    }
  }

  // Campus Visit → Visit Score (weighted average of 1–10 ratings)
  var cv = ss.getSheetByName('Campus Visit Tracker');
  if (cv){
    var ratings = ['Tour Quality (1-10)','Info Session Quality (1-10)','Campus Beauty (1-10)','Facilities Quality (1-10)',
                   'Student Happiness (1-10)','Academic Vibe (1-10)','Social Atmosphere (1-10)','Overall Gut Feeling (1-10)'];
    var cVisitScore = colIndex_(cv,'Visit Score');
    if (cVisitScore){
      var rStart2 = 2, rEnd2 = Math.max(2, cv.getLastRow());
      for (var r2=rStart2; r2<=rEnd2; r2++){
        var num2 = [], den2 = [];
        ratings.forEach(function(h){
          var c = colIndex_(cv, h); if (!c) return;
          var cell = addr(r2, c);
          var w = 'IFERROR(VLOOKUP("'+h+'",Weights!A:B,2,false),0)';
          num2.push('IFERROR('+cell+',0)*'+w);
          den2.push(w);
        });
        var formula = '=IF(COUNTA(A'+r2+')=0,"",IFERROR((' + num2.join('+') + ')/(' + den2.join('+') + '), ""))';
        cv.getRange(r2, cVisitScore).setFormula(formula);
      }
      formatNumber_(cv, 'Visit Score', '0.00');
    }
  }

  SpreadsheetApp.getUi().alert('Scoring formulas ensured. Edit weights anytime on the "Weights" sheet.');
}

/**
 * Automatically fills the Region column for all rows in the Colleges sheet based on state.
 * Maps US states to four regions: Northeast, Midwest, South, West.
 * Only updates rows that have a college name and where the region differs from the calculated value.
 */
function fillRegionsAllRows(){
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Colleges');
  if (!sh) { SpreadsheetApp.getUi().alert('Sheet "Colleges" not found.'); return; }

  var lastRow = sh.getLastRow();
  if (lastRow < 3) { SpreadsheetApp.getUi().alert('No data rows to process.'); return; }

  // Read header row 2
  var hdrs = sh.getRange(2,1,1,sh.getLastColumn()).getValues()[0].map(function(x){ return (x||"").toString().trim(); });
  function mustCol(h){ var i = hdrs.indexOf(h); if(i===-1) throw new Error('Missing header: '+h); return i+1; }
  var colName = mustCol('College Name');
  var colState = mustCol('State');
  var idxRegion = hdrs.indexOf('Region');
  if (idxRegion === -1) { SpreadsheetApp.getUi().alert('No "Region" column found on Colleges sheet.'); return; }
  var colRegion = idxRegion + 1;

  var range = sh.getRange(3, 1, lastRow-2, sh.getLastColumn());
  var values = range.getValues();

  var updates = [];
  for (var r=0; r<values.length; r++){
    var rowVals = values[r];
    var name = (rowVals[colName-1]||"").toString().trim();
    if (!name) continue; // skip empty rows
    var st = (rowVals[colState-1]||"").toString().trim();
    var currentRegion = (rowVals[colRegion-1]||"").toString().trim();
    var newRegion = getRegionForState_(st);
    if (newRegion && newRegion !== currentRegion){
      updates.push({ r: r+3, c: colRegion, v: newRegion }); // store absolute position
    }
  }

  updates.forEach(function(u){ sh.getRange(u.r, u.c).setValue(u.v); });
  SpreadsheetApp.getUi().alert('Regions updated for '+updates.length+' row(s).');
}

/**
 * Batch fills multiple selected rows in the Colleges sheet with data from the College Scorecard API.
 * Processes all selected rows that contain a college name, skipping empty rows.
 * Displays a summary of successful, skipped, and failed operations.
 */
function fillSelectedRows() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("Colleges");
  if (!sh) { SpreadsheetApp.getUi().alert('Sheet "Colleges" not found.'); return; }

  // Use selected rows from the active range/list; require header row 2 present
  var ranges = [];
  var rl = sh.getActiveRangeList && sh.getActiveRangeList();
  if (rl) ranges = rl.getRanges();
  else {
    var r = sh.getActiveRange();
    if (!r) { SpreadsheetApp.getUi().alert('Select one or more rows in "Colleges" first.'); return; }
    ranges = [r];
  }

  // Gather unique row numbers (only rows >=3)
  var rows = {};
  ranges.forEach(function(rg){
    for (var r = rg.getRow(); r < rg.getRow() + rg.getNumRows(); r++) {
      if (r >= 3) rows[r] = true;
    }
  });
  var list = Object.keys(rows).map(function(x){ return parseInt(x,10); }).sort(function(a,b){ return a-b; });
  if (!list.length) { SpreadsheetApp.getUi().alert('Select data rows (row 3 or below).'); return; }

  // Process each row
  var ok=0, skipped=0, failed=0;
  for (var i=0;i<list.length;i++){
    var row = list[i];
    var name = (sh.getRange(row, 1).getValue()||"").toString().trim(); // A = College Name
    if (!name) { skipped++; continue; }
    try {
      var res = fillCollegeRowCore_(row, {suppressAlert:true});
      if (res && res.ok) ok++; else failed++;
    } catch(e){
      failed++;
    }
    Utilities.sleep(200); // polite spacing for API quotas
  }

  SpreadsheetApp.getUi().alert('Batch fill complete.\nOK: '+ok+' | Skipped (no name): '+skipped+' | Failed: '+failed);
}



/* ================== FORMATTING CALLED IN MENU ================== */
// (already defined in enhanceFormatsDropdowns)

/* ====== NOTE: The rest is your existing trackers & filler above ====== */
  
  // ======================= PUBLIC API =======================
  return {
    VERSION: VERSION,
    fillCollegeRow: fillCollegeRow,
    fillSelectedRows: fillSelectedRows,
    testWrite: testWrite,
    showVersion: showVersion,
    setupAllTrackers: setupAllTrackers,
    enhanceFormatsDropdowns: enhanceFormatsDropdowns,
    ensureScoring: ensureScoring,
    searchCollegeNames: searchCollegeNames,
    fillRegionsAllRows: fillRegionsAllRows
  };
})();

/* ======================= MENU ======================= */
/**
 * Creates the College Tools menu in Google Sheets when the spreadsheet is opened.
 * Sets up all menu items for college data management and tracking.
 * Must be global for Google Sheets to find it.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("College Tools")
    .addItem("Fill current row", "fillCollegeRow")
    .addItem("Fill selected rows", "fillSelectedRows")
    .addItem("Test write (I3)", "testWrite")
    .addSeparator()
    .addItem("Add/Update Trackers", "setupAllTrackers")
    .addItem("Enhance: Formats & Dropdowns", "enhanceFormatsDropdowns")
    .addItem("Ensure Scoring Formulas", "ensureScoring")
    .addSeparator()
    .addItem("Search College Names", "searchCollegeNames")
    .addItem("Fill Regions (all rows)", "fillRegionsAllRows")
    .addItem("Show version", "showVersion")
    .addToUi();
}

/* ======================= ADAPTER FUNCTIONS ======================= */
/**
 * Global adapter functions that forward to namespace.
 * These allow the menu to call functions by name without changing menu configuration.
 */
function fillCollegeRow() { return CollegeTools.fillCollegeRow(); }
function fillSelectedRows() { return CollegeTools.fillSelectedRows(); }
function testWrite() { return CollegeTools.testWrite(); }
function showVersion() { return CollegeTools.showVersion(); }
function setupAllTrackers() { return CollegeTools.setupAllTrackers(); }
function enhanceFormatsDropdowns() { return CollegeTools.enhanceFormatsDropdowns(); }
function ensureScoring() { return CollegeTools.ensureScoring(); }
function searchCollegeNames() { return CollegeTools.searchCollegeNames(); }
function fillRegionsAllRows() { return CollegeTools.fillRegionsAllRows(); }
